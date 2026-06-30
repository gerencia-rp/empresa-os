// delete-generation · borra una generación (cascade → published + metrics + embedding).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const authOk = (req: Request) => !!(req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);
  if (!authOk(req)) return corsResponse(req, { error: "No autorizado" }, 401);
  try {
    const body = await req.json();
    if (!body.id) return corsResponse(req, { error: "Falta id" }, 400);
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error } = await db.from("content_generations").delete().eq("id", body.id);
    if (error) return corsResponse(req, { error: error.message }, 500);
    return corsResponse(req, { ok: true });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
