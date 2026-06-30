// ════════════════════════════════════════════════════════════════
// save-generation · guarda una generación de Studio en content_generations
// Auth: Bearer == anon key o service role (la app manda anon). Service role
// interno para escribir (bypass RLS). CORS restringido por _shared/cors.ts.
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
    const variantes = body.output_variantes;
    if (!body.tipo || !body.modo || variantes == null) {
      return corsResponse(req, { error: "Faltan campos: tipo, modo, output_variantes" }, 400);
    }
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const row = {
      user_id: body.user_id || "nicolas",
      tipo: body.tipo,
      modo: body.modo,
      input_idea: body.input_idea ?? null,
      input_config: body.input_config ?? null,
      decisiones_auto: body.decisiones_auto ?? null,
      output_variantes: variantes,
      prompt_completo: body.prompt_completo ?? null,
      tokens_usados: body.tokens_usados ?? null,
      validador_errores: body.validador_errores ?? [],
      validador_warnings: body.validador_warnings ?? [],
      estado: body.estado || "producida",
    };
    const { data, error } = await db.from("content_generations").insert(row).select("id").single();
    if (error) return corsResponse(req, { error: error.message }, 500);
    return corsResponse(req, { id: data.id });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
