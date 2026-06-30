// ════════════════════════════════════════════════════════════════
// list-generations · lista paginada de content_generations con filtros
// Filtros: estado, tipo. Paginación: limit (def 50), offset (def 0).
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

function authOk(req: Request): boolean {
  const b = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return !!b && (b === ANON_KEY || b === SERVICE_KEY);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);
  if (!authOk(req)) return corsResponse(req, { error: "No autorizado" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 50, 200);
    const offset = Number(body.offset) || 0;
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    let q = db.from("content_generations")
      .select("id, created_at, tipo, modo, input_idea, decisiones_auto, output_variantes, tokens_usados, estado", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (body.estado) q = q.eq("estado", body.estado);
    if (body.tipo) q = q.eq("tipo", body.tipo);
    const { data, error, count } = await q;
    if (error) return corsResponse(req, { error: error.message }, 500);
    return corsResponse(req, { generations: data || [], total: count ?? null });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
