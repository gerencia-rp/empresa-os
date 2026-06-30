// ════════════════════════════════════════════════════════════════
// get-dashboard · KPIs + tops + cruces (enemigo/avatar/táctica × performance)
// Join: content_published → content_generations + content_metrics (última medición).
// Devuelve ids crudos en los cruces; el cliente resuelve nombres con el JSON de marca.
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function authOk(req: Request): boolean {
  return !!(req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

// deno-lint-ignore no-explicit-any
function cfgOf(g: any) {
  const c = g?.input_config || {};
  const d = g?.decisiones_auto || {};
  return {
    avatar: c.avatar || d.avatar_id || null,
    enemigo: c.enemigo || d.enemigo_id || null,
    tactica: (c.tactica != null ? c.tactica : d.tactica_id) ?? null,
  };
}
// deno-lint-ignore no-explicit-any
function latestMetric(arr: any[]) {
  if (!arr || !arr.length) return null;
  return arr.slice().sort((a, b) => new Date(b.fecha_medicion).getTime() - new Date(a.fecha_medicion).getTime())[0];
}
// deno-lint-ignore no-explicit-any
function hookOf(g: any) {
  const ov = g?.output_variantes;
  const v0 = Array.isArray(ov) ? ov[0] : (ov && ov.variantes ? ov.variantes[0] : null);
  return (v0 && (v0.hook || v0.thumbnail_text)) || g?.input_idea || "(sin título)";
}
function engRate(m: Record<string, number>, views: number) {
  if (!views) return 0;
  const e = (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0);
  return Math.round((e / views) * 1000) / 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);
  if (!authOk(req)) return corsResponse(req, { error: "No autorizado" }, 401);

  try {
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await db.from("content_published")
      .select("id, plataforma, url_post, fecha_publicacion, content_generations(id, tipo, modo, input_config, decisiones_auto, output_variantes, input_idea), content_metrics(*)");
    if (error) return corsResponse(req, { error: error.message }, 500);

    const rows = (data || []).map((p: Record<string, unknown>) => {
      const g = p.content_generations as Record<string, unknown>;
      const m = latestMetric(p.content_metrics as Record<string, number>[]);
      const views = m ? Number(m.views || 0) : 0;
      const c = cfgOf(g);
      return {
        generation_id: g?.id, published_id: p.id, plataforma: p.plataforma, url: p.url_post,
        tipo: g?.tipo, hook: hookOf(g), fecha: p.fecha_publicacion,
        hasMetric: !!m, views,
        engagement_rate: m ? engRate(m, views) : 0,
        saves: m ? Number(m.saves || 0) : 0,
        save_rate: (m && views) ? Math.round((Number(m.saves || 0) / views) * 1000) / 10 : 0,
        followers_ganados: m ? Number(m.followers_ganados || 0) : 0,
        ...c,
      };
    });
    const withM = rows.filter((r) => r.hasMetric);

    const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
    const top = (key: string, n = 10) => withM.slice().sort((a, b) => (b as Record<string, number>)[key] - (a as Record<string, number>)[key]).slice(0, n)
      .map((r) => ({ generation_id: r.generation_id, hook: r.hook, views: r.views, engagement_rate: r.engagement_rate, save_rate: r.save_rate, fecha: r.fecha, plataforma: r.plataforma }));

    function crossBy(field: string) {
      const map: Record<string, { count: number; views: number[]; eng: number[] }> = {};
      withM.forEach((r) => {
        const k = (r as Record<string, unknown>)[field];
        if (k == null || k === "auto") return;
        const key = String(k);
        (map[key] = map[key] || { count: 0, views: [], eng: [] });
        map[key].count++; map[key].views.push(r.views); map[key].eng.push(r.engagement_rate);
      });
      return Object.keys(map).map((k) => ({
        key: k, count: map[k].count, avg_views: avg(map[k].views),
        avg_engagement: Math.round((map[k].eng.reduce((a, b) => a + b, 0) / map[k].eng.length) * 10) / 10,
      })).sort((a, b) => b.avg_views - a.avg_views);
    }

    const topV = top("views");
    const kpis = {
      total_publicados: rows.length,
      con_metricas: withM.length,
      avg_views: avg(withM.map((r) => r.views)),
      top_reel: topV[0] || null,
      total_followers_ganados: withM.reduce((a, r) => a + (r.followers_ganados || 0), 0),
    };

    return corsResponse(req, {
      kpis,
      top_views: topV,
      top_engagement: top("engagement_rate"),
      top_save_rate: top("save_rate"),
      cross_enemigos: crossBy("enemigo"),
      cross_avatares: crossBy("avatar"),
      cross_tacticas: crossBy("tactica"),
    });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
