// ═══ N8 · CARRIL DATOS-LECTURA de la fábrica IA (Scope B obs #24) ═══
// Proxy READ-ONLY para artefactos carril='datos': un artefacto aprobado por un admin puede leer
// SOLO vistas whitelisted (ia_data_whitelist) y SIEMPRE con el JWT del usuario que lo abre →
// su RLS aplica (un viewer de Rentas no ve fix-flip aunque el artefacto lo pida).
// Capas: (1) requireAuth JWT · (2) artefacto activo + carril datos + aprobado_por (gate admin en DB)
// · (3) recurso ∈ whitelist activa · (4) solo .select() con límite · (5) todo queda en ia_audit_log.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";
import { corsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "POST only" }, 405);

  const auth = await requireAuth(req);
  if (!auth.ok) return corsResponse(req, { error: auth.error }, auth.status || 401);

  let body: { artifact_id?: string; recurso?: string; limit?: number };
  try { body = await req.json(); } catch { return corsResponse(req, { error: "JSON inválido" }, 400); }
  const { artifact_id, recurso } = body;
  if (!artifact_id || !recurso) return corsResponse(req, { error: "artifact_id y recurso requeridos" }, 400);
  if (!/^[a-z0-9_]+$/.test(recurso)) return corsResponse(req, { error: "recurso inválido" }, 400);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  // (2) gate: artefacto activo, carril datos, aprobado por un admin
  const { data: art } = await svc.from("ia_artifacts")
    .select("id, titulo, carril, activo, aprobado_por").eq("id", artifact_id).maybeSingle();
  if (!art || !art.activo) return corsResponse(req, { error: "artefacto inexistente o inactivo" }, 404);
  if (art.carril !== "datos") return corsResponse(req, { error: "el artefacto no es del carril datos-lectura" }, 403);
  if (!art.aprobado_por) return corsResponse(req, { error: "artefacto sin OK de admin — pendiente de aprobación" }, 403);

  // (3) whitelist
  const { data: wl } = await svc.from("ia_data_whitelist")
    .select("recurso").eq("recurso", recurso).eq("active", true).maybeSingle();
  if (!wl) return corsResponse(req, { error: "recurso fuera de la whitelist de datos-lectura" }, 403);

  // (4) lectura con el JWT DEL USUARIO → su RLS decide qué filas ve
  const token = (req.headers.get("Authorization") || "").slice(7).trim();
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const lim = Math.min(Math.max(+(body.limit || 200), 1), 500);
  const { data, error } = await asUser.from(recurso).select("*").limit(lim);
  if (error) return corsResponse(req, { error: error.message }, 400);

  // (5) auditoría inmutable
  await svc.from("ia_audit_log").insert({
    artifact_id, accion: "datos_leidos", actor: auth.user_id,
    detalle: { recurso, filas: (data || []).length, email: auth.email },
  });

  return corsResponse(req, { recurso, filas: (data || []).length, data: data || [] });
});
