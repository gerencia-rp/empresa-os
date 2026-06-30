// ════════════════════════════════════════════════════════════════
// save-metrics · inserta una medición en content_metrics
// Permite múltiples mediciones del mismo published_id (serie temporal).
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function authOk(req: Request): boolean {
  return !!(req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

const NUM_FIELDS = [
  "views", "likes", "comments", "shares", "saves",
  "watch_time_avg_seconds", "watch_time_total_minutes",
  "hook_hold_3s_percent", "midpoint_hold_percent", "completion_rate_percent",
  "followers_ganados", "profile_visits", "link_clicks", "dms_recibidos",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);
  if (!authOk(req)) return corsResponse(req, { error: "No autorizado" }, 401);

  try {
    const body = await req.json();
    if (!body.published_id) return corsResponse(req, { error: "Falta published_id" }, 400);
    const row: Record<string, unknown> = { published_id: body.published_id, pantallazo_url: body.pantallazo_url ?? null, raw_data: body.raw_data ?? null };
    for (const f of NUM_FIELDS) {
      const v = body[f];
      row[f] = (v === "" || v === undefined || v === null) ? null : Number(v);
    }
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await db.from("content_metrics").insert(row).select("id").single();
    if (error) return corsResponse(req, { error: error.message }, 500);
    return corsResponse(req, { id: data.id });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
