// ════════════════════════════════════════════════════════════════
// generate-embedding · embeb texto (Voyage voyage-3-lite → OpenAI fallback).
// Modos:
//   { text }                       → { embedding, dim, provider }
//   { generation_id, text }        → embeb + upsert en generation_embeddings
//   { backfill: true }             → embeb todas las generaciones sin embedding
// Si no hay VOYAGE_API_KEY ni OPENAI_API_KEY → { skipped: true } (inerte).
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
function provider(): string | null { return VOYAGE ? "voyage" : (OPENAI ? "openai" : null); }

async function embed(text: string): Promise<{ vec: number[]; dim: number; provider: string }> {
  const p = provider();
  if (p === "voyage") {
    const r = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + VOYAGE },
      body: JSON.stringify({ model: "voyage-3-lite", input: text }),
    });
    if (!r.ok) throw new Error("Voyage " + r.status + ": " + (await r.text()).slice(0, 200));
    const d = await r.json();
    const vec = d.data[0].embedding;
    return { vec, dim: vec.length, provider: "voyage" };
  }
  // OpenAI fallback (1536 dim — requiere tabla VECTOR(1536))
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": "Bearer " + OPENAI },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!r.ok) throw new Error("OpenAI " + r.status + ": " + (await r.text()).slice(0, 200));
  const d = await r.json();
  const vec = d.data[0].embedding;
  return { vec, dim: vec.length, provider: "openai" };
}

// deno-lint-ignore no-explicit-any
function summaryOf(g: any): string {
  const ov = g?.output_variantes;
  const v0 = Array.isArray(ov) ? ov[0] : (ov && ov.variantes ? ov.variantes[0] : null);
  const parts = [g?.tipo, g?.input_idea,
    v0 && v0.thumbnail_text, v0 && v0.hook, v0 && v0.chisme, v0 && v0.valor_oculto, v0 && v0.cta].filter(Boolean);
  return parts.join(" · ").slice(0, 1500);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);
  if (!authOk(req)) return corsResponse(req, { error: "No autorizado" }, 401);
  if (!provider()) return corsResponse(req, { skipped: true, reason: "Sin VOYAGE_API_KEY ni OPENAI_API_KEY en Secrets" });

  try {
    const body = await req.json().catch(() => ({}));
    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    if (body.backfill) {
      const { data: gens } = await db.from("content_generations")
        .select("id, tipo, input_idea, output_variantes")
        .not("id", "in", `(SELECT generation_id FROM generation_embeddings)`);
      let done = 0; const errs: string[] = [];
      for (const g of (gens || [])) {
        try {
          const sum = summaryOf(g);
          const { vec } = await embed(sum);
          const { error } = await db.from("generation_embeddings").upsert({ generation_id: g.id, embedding: vec, content_summary: sum });
          if (error) errs.push(g.id + ": " + error.message); else done++;
        } catch (e) { errs.push(g.id + ": " + String((e as Error).message)); }
      }
      return corsResponse(req, { backfilled: done, errors: errs });
    }

    let text = body.text;
    if (body.generation_id && !text) {
      const { data: g } = await db.from("content_generations").select("id, tipo, input_idea, output_variantes").eq("id", body.generation_id).single();
      text = summaryOf(g);
    }
    if (!text) return corsResponse(req, { error: "Falta text o generation_id" }, 400);
    const { vec, dim, provider: prov } = await embed(text);
    if (body.generation_id) {
      await db.from("generation_embeddings").upsert({ generation_id: body.generation_id, embedding: vec, content_summary: text.slice(0, 1500) });
    }
    return corsResponse(req, { embedding: vec, dim, provider: prov });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
