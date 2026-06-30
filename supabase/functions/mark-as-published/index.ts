// ════════════════════════════════════════════════════════════════
// mark-as-published · crea fila en content_published + estado='publicada'
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function authOk(req: Request): boolean {
  return !!(req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);
  if (!authOk(req)) return corsResponse(req, { error: "No autorizado" }, 401);

  try {
    const body = await req.json();
    if (!body.generation_id || !body.plataforma) {
      return corsResponse(req, { error: "Faltan campos: generation_id, plataforma" }, 400);
    }
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await db.from("content_published").insert({
      generation_id: body.generation_id,
      plataforma: body.plataforma,
      url_post: body.url_post ?? null,
      caption_final: body.caption_final ?? null,
      notas: body.notas ?? null,
    }).select("id").single();
    if (error) return corsResponse(req, { error: error.message }, 500);
    await db.from("content_generations").update({ estado: "publicada" }).eq("id", body.generation_id);
    return corsResponse(req, { published_id: data.id });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
