// ════════════════════════════════════════════════════════════════
// get-chat-history · devuelve los últimos N mensajes de una sesión de chat
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

function authOk(req: Request): boolean {
  // La anon key es pública (config.public.js). Seguridad real: RLS + service role + CORS.
  // Acá solo exigimos que venga un Bearer (anon o service).
  const b = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return !!b;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);
  if (!authOk(req)) return corsResponse(req, { error: "No autorizado" }, 401);

  try {
    const body = await req.json();
    if (!body.session_id) return corsResponse(req, { error: "Falta session_id" }, 400);
    const limit = Math.min(Number(body.limit) || 50, 200);
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await db.from("chat_conversations")
      .select("role, content, metadata, created_at")
      .eq("session_id", body.session_id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return corsResponse(req, { error: error.message }, 500);
    // devolver en orden cronológico ascendente
    return corsResponse(req, { messages: (data || []).reverse() });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
