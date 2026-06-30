// ════════════════════════════════════════════════════════════════
// compute-insights · detecta patrones sobre las métricas (≥3 mediciones).
// Calcula: top enemigo/avatar por performance, guiado vs libre, mejor tipo,
// mejor día de semana. Guarda en insights y devuelve la lista.
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
  const c = g?.input_config || {}, d = g?.decisiones_auto || {};
  return { avatar: c.avatar || d.avatar_id || null, enemigo: c.enemigo || d.enemigo_id || null, tactica: (c.tactica != null ? c.tactica : d.tactica_id) ?? null };
}
// deno-lint-ignore no-explicit-any
function latest(arr: any[]) { return (!arr || !arr.length) ? null : arr.slice().sort((a, b) => new Date(b.fecha_medicion).getTime() - new Date(a.fecha_medicion).getTime())[0]; }
const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
const DOW = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);
  if (!authOk(req)) return corsResponse(req, { error: "No autorizado" }, 401);

  try {
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { count } = await db.from("content_metrics").select("id", { count: "exact", head: true });
    if ((count ?? 0) < 3) return corsResponse(req, { need_more: true, count: count ?? 0 });

    const { data, error } = await db.from("content_published")
      .select("id, plataforma, fecha_publicacion, content_generations(id, tipo, modo, input_config, decisiones_auto), content_metrics(*)");
    if (error) return corsResponse(req, { error: error.message }, 500);

    const rows = (data || []).map((p: Record<string, unknown>) => {
      const g = p.content_generations as Record<string, unknown>;
      const m = latest(p.content_metrics as Record<string, number>[]);
      const views = m ? Number(m.views || 0) : 0;
      const eng = (m && views) ? Math.round((((m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0)) / views) * 1000) / 10 : 0;
      return { gid: g?.id, tipo: g?.tipo, modo: g?.modo, fecha: p.fecha_publicacion, hasM: !!m, views, eng, ...cfgOf(g) };
    }).filter((r) => r.hasM);

    const overallAvgViews = avg(rows.map((r) => r.views));
    const insights: Record<string, unknown>[] = [];

    function bestBy(field: string, metric: "views" | "eng", label: string, nameOf: (k: string) => string) {
      const map: Record<string, { v: number[]; ids: string[] }> = {};
      rows.forEach((r) => { const k = (r as Record<string, unknown>)[field]; if (k == null || k === "auto") return; (map[String(k)] = map[String(k)] || { v: [], ids: [] }); map[String(k)].v.push((r as Record<string, number>)[metric]); map[String(k)].ids.push(r.gid as string); });
      const arr = Object.keys(map).map((k) => ({ k, avg: avg(map[k].v), n: map[k].v.length, ids: map[k].ids })).filter((x) => x.n >= 1).sort((a, b) => b.avg - a.avg);
      if (!arr.length) return null;
      const top = arr[0];
      const base = metric === "views" ? overallAvgViews : avg(rows.map((r) => r.eng));
      const lift = base ? Math.round(((top.avg - base) / base) * 100) : 0;
      return { tipo: label, headline: `"${nameOf(top.k)}" lidera en ${metric === "views" ? "views" : "engagement"}`, detail: metric === "views" ? `${label}: ${top.avg.toLocaleString("es")} avg views (${lift >= 0 ? "+" : ""}${lift}% vs promedio) en ${top.n} pieza(s).` : `${label}: ${top.avg}% engagement promedio en ${top.n} pieza(s).`, evidence_ids: top.ids.slice(0, 5), priority: Math.abs(lift) > 30 ? "alta" : "media" };
    }

    const insEnemigo = bestBy("enemigo", "views", "Enemigo", (k) => k);
    if (insEnemigo) insights.push(insEnemigo);
    const insAvatar = bestBy("avatar", "eng", "Avatar", (k) => k);
    if (insAvatar) insights.push(insAvatar);

    // Modo guiado vs libre
    const gv = rows.filter((r) => r.modo === "guiado"), lv = rows.filter((r) => r.modo === "libre");
    if (gv.length && lv.length) {
      const ag = avg(gv.map((r) => r.views)), al = avg(lv.map((r) => r.views));
      const mejor = ag >= al ? "guiado" : "libre";
      insights.push({ tipo: "Modo", headline: `Modo ${mejor} rinde mejor`, detail: `Guiado: ${ag.toLocaleString("es")} avg views (${gv.length}) · Libre: ${al.toLocaleString("es")} avg views (${lv.length}).`, evidence_ids: (mejor === "guiado" ? gv : lv).map((r) => r.gid).slice(0, 5), priority: "media" });
    }

    // Tipo que mejor performa
    const byTipo: Record<string, number[]> = {};
    rows.forEach((r) => { (byTipo[r.tipo as string] = byTipo[r.tipo as string] || []).push(r.views); });
    const tipoArr = Object.keys(byTipo).map((k) => ({ k, avg: avg(byTipo[k]), n: byTipo[k].length })).sort((a, b) => b.avg - a.avg);
    if (tipoArr.length) insights.push({ tipo: "Formato", headline: `El formato "${tipoArr[0].k}" es tu mejor apuesta`, detail: `${tipoArr[0].k}: ${tipoArr[0].avg.toLocaleString("es")} avg views (${tipoArr[0].n} pieza/s).`, evidence_ids: [], priority: "media" });

    // Mejor día de semana
    const withFecha = rows.filter((r) => r.fecha);
    if (withFecha.length >= 3) {
      const byDow: Record<number, number[]> = {};
      withFecha.forEach((r) => { const d = new Date(r.fecha as string).getDay(); (byDow[d] = byDow[d] || []).push(r.views); });
      const dowArr = Object.keys(byDow).map((k) => ({ d: Number(k), avg: avg(byDow[Number(k)]), n: byDow[Number(k)].length })).sort((a, b) => b.avg - a.avg);
      if (dowArr.length) insights.push({ tipo: "Timing", headline: `${DOW[dowArr[0].d]} es tu mejor día`, detail: `${DOW[dowArr[0].d]}: ${dowArr[0].avg.toLocaleString("es")} avg views (${dowArr[0].n} publicación/es).`, evidence_ids: [], priority: "baja" });
    }

    const { data: ins, error: e2 } = await db.from("insights").insert({ insights, period_days: 30 }).select("id, computed_at").single();
    if (e2) return corsResponse(req, { error: e2.message }, 500);
    return corsResponse(req, { id: ins.id, computed_at: ins.computed_at, count: rows.length, insights });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
