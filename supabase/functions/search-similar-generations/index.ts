// ════════════════════════════════════════════════════════════════
// search-similar-generations · RAG retrieval.
// Recibe { query_text, top_k=5 } → embeb la query → match_generations (pgvector).
// Si no hay proveedor de embeddings → { results: [], skipped: true } (soft).
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VOYAGE = Deno.env.get("VOYAGE_API_KEY") || "";
const OPENAI = Deno.env.get("OPENAI_API_KEY") || "";

function authOk(req: Request): boolean {
  return !!(req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

async function embed(text: string): Promise<number[] | null> {
  if (VOYAGE) {
    const r = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST", headers: { "content-type": "application/json", "authorization": "Bearer " + VOYAGE },
      body: JSON.stringify({ model: "voyage-3-lite", input: text }),
    });
    if (!r.ok) throw new Error("Voyage " + r.status);
    return (await r.json()).data[0].embedding;
  }
  if (OPENAI) {
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST", headers: { "content-type": "application/json", "authorization": "Bearer " + OPENAI },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (!r.ok) throw new Error("OpenAI " + r.status);
    return (await r.json()).data[0].embedding;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);
  if (!authOk(req)) return corsResponse(req, { error: "No autorizado" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    if (!body.query_text) return corsResponse(req, { error: "Falta query_text" }, 400);
    const vec = await embed(body.query_text);
    if (!vec) return corsResponse(req, { results: [], skipped: true, reason: "Sin proveedor de embeddings" });
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await db.rpc("match_generations", { query_embedding: vec, match_count: Number(body.top_k) || 5 });
    if (error) return corsResponse(req, { error: error.message }, 500);
    return corsResponse(req, { results: data || [] });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
