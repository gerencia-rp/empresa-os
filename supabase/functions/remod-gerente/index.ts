// ════════════════════════════════════════════════════════════════
// 👔 REMODELACIÓN · GERENTE — foto ejecutiva (consolida, no re-hace).
// Consolida avance de obra + plata (de la cola de la escuadra) + calidad en una
// foto: estado + top-3 decisiones + cola priorizada, cada punto CITANDO su agente.
// SOLO LEE. Escribe borrador a pm_informes (dedup por día). Conecta COMO
// agentes_ia_exec. Modo: foto | run. Deploy: npx supabase functions deploy remod-gerente
// ════════════════════════════════════════════════════════════════
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { requireAuth } from "../_shared/auth.ts";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
function execSql() {
  const raw = Deno.env.get("SUPABASE_DB_URL"), pwd = Deno.env.get("AGENTES_IA_EXEC_PWD");
  if (!raw || !pwd) throw new Error("faltan SUPABASE_DB_URL / AGENTES_IA_EXEC_PWD");
  const ref = (Deno.env.get("SUPABASE_URL") || "").replace(/^https?:\/\//, "").split(".")[0];
  const u = new URL(raw); const user = u.hostname.includes("pooler") ? `agentes_ia_exec.${ref}` : "agentes_ia_exec";
  return postgres(`postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pwd)}@${u.hostname}:${u.port || 5432}${u.pathname || "/postgres"}`, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 15, ssl: "require" });
}
const money = (n: number) => "$" + Math.round(+n || 0).toLocaleString("en-US");
const SEV: Record<string, { w: number; s: string }> = { conciliacion: { w: 1, s: "critico" }, nomina: { w: 2, s: "medio" }, nudge: { w: 2, s: "medio" }, informe: { w: 4, s: "info" } };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const bearer = (req.headers.get("authorization") || "").replace(/^bearer /i, "").trim();
  if (bearer !== SERVICE_KEY) { const auth = await requireAuth(req, { requireAdmin: true }); if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401); }
  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();
    const [{ corte }] = await sql`select (now() at time zone 'America/Chicago')::date::text as corte`;
    const [agent] = await sql`select id, coalesce(enabled,true) enabled from agent_registry where nombre='Gerente de Remodelacion' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Gerente de Remodelacion'" }, 404);
    if (agent.enabled === false) { await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ accion: "skip" })},${sql.json({ reason: "kill switch OFF" })},'skipped')`; return json({ ok: true, skipped: "disabled" }); }
    const iso: Record<string, string> = {};
    try { await sql`select 1 from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; } catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS" : "ERR"; }
    try { await sql`select document_id from pm_tenants limit 1`; iso.document_id = "LEAK"; } catch (e) { iso.document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS" : "ERR"; }
    if (iso.pm_credentials !== "PASS" || iso.document_id !== "PASS") { await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ accion: "abort" })},${sql.json({ iso })},'ABORT')`; return json({ ok: false, aborted: true, iso }, 500); }
    // cola de la escuadra Remodelación (todos menos el Gerente)
    const queue = await sql`select ar.nombre agente, ap.tipo_accion tipo, count(*)::int n,
        round(coalesce(sum((ap.payload->>'monto_en_riesgo')::numeric),0)) monto
      from agent_proposals ap join agent_registry ar on ar.id=ap.agent_id
      where ar.linea='Remodelación' and ar.nombre<>'Gerente de Remodelacion' and ap.estado='propuesta' and ap.deleted_at is null
      group by 1,2`;
    // avance de obra (KPI)
    const [kpi] = await sql`select count(*) filter (where proceso='En construcción')::int en_curso,
        round(avg(avance_real) filter (where proceso='En construcción'))::int avance_prom,
        count(*) filter (where proceso='Finalizado' and utilidad_remodelacion::numeric<-50)::int en_perdida
      from remodel_at_properties where active is not false`;
    const montoRiesgo = queue.reduce((a: number, q: Record<string, unknown>) => a + Number(q.monto || 0), 0);
    const estado = [
      { sev: "medio", metrica: "Obras en curso", valor: `${kpi?.en_curso} (avance prom ${kpi?.avance_prom}%)`, fuente: "remodel_at_properties" },
      { sev: montoRiesgo > 0 ? "critico" : "ok", metrica: "Plata en riesgo (cola Financiero)", valor: money(montoRiesgo), fuente: "Financiero Remodelacion" },
      { sev: Number(kpi?.en_perdida) > 0 ? "medio" : "ok", metrica: "Obras finalizadas en pérdida", valor: String(kpi?.en_perdida), fuente: "Financiero Remodelacion" },
    ];
    const cola = queue.map((q: Record<string, unknown>) => { const m = SEV[q.tipo as string] || { w: 3, s: "medio" }; return { severidad: m.s, w: m.w, agente: q.agente, tipo: q.tipo, n: Number(q.n), monto: Number(q.monto) || null }; })
      .sort((a, b) => a.w - b.w || (b.monto || 0) - (a.monto || 0)).map((r, i) => ({ orden: i + 1, severidad: r.severidad, agente: r.agente, tipo: r.tipo, n: r.n, monto: r.monto }));
    const top3 = [] as Array<Record<string, unknown>>;
    if (montoRiesgo > 0) top3.push({ prioridad: "critico", decision: `Revisar ${money(montoRiesgo)} en plata de material en riesgo (doble-pagos)`, fuente: "Financiero Remodelacion" });
    if (Number(kpi?.en_perdida) > 0) top3.push({ prioridad: "medio", decision: `Analizar ${kpi?.en_perdida} obras finalizadas en pérdida`, fuente: "Financiero Remodelacion" });
    if (Number(kpi?.en_curso) > 0) top3.push({ prioridad: "medio", decision: `Seguir ${kpi?.en_curso} obras en curso (avance ${kpi?.avance_prom}%)`, fuente: "Reportes/Optimización Remodelación" });
    const payload = { corte, titulo: "Foto Ejecutiva — Remodelación", estado, top_3_decisiones: top3.slice(0, 3), cola_priorizada: cola, resumen: { obras_en_curso: Number(kpi?.en_curso), avance_prom: Number(kpi?.avance_prom), plata_en_riesgo: montoRiesgo, obras_en_perdida: Number(kpi?.en_perdida), propuestas_en_cola: cola.reduce((a, x) => a + x.n, 0) }, fidelidad: "consolida la cola de la escuadra + KPIs de obra; cada punto cita su agente; nada inventado", regla: "el Gerente SOLO LEE — cero acción autónoma", origen: "ejecutor remod-gerente (agentes_ia_exec)" };
    let created = 0, skipped = 0;
    const [ex] = await sql`select id from pm_informes where tipo='foto_ejecutiva_remodelacion' and corte=${corte} and archived_at is null limit 1`;
    if (ex) skipped++;
    else { await sql`insert into pm_informes (tipo,corte,titulo,estado,origen,payload,generado_por) values ('foto_ejecutiva_remodelacion',${corte},${"Foto Ejecutiva Remodelación " + corte},'borrador','ejecutor',${sql.json(payload)},'remod-gerente (agentes_ia_exec)')`; created++; }
    await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ corte, rol_db: "agentes_ia_exec" })},${sql.json({ created, skipped, resumen: payload.resumen, top3: payload.top_3_decisiones, iso })},'ok')`;
    return json({ ok: true, corte, created, skipped, resumen: payload.resumen, top3: payload.top_3_decisiones, cola_top: cola.slice(0, 3), iso });
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
  finally { if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } } }
});
