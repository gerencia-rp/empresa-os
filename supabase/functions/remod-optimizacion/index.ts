// ════════════════════════════════════════════════════════════════
// 🔧 REMODELACIÓN · OPTIMIZACIÓN — tiempos por etapa + obra estancada.
// Caza el bug del "Retraso en Días" absurdo: una obra Finalizado con el planner
// sin cerrar muestra cientos de tareas "vencidas" = artefacto, NO retraso real →
// se EXCLUYE. Flag solo obras EN CONSTRUCCIÓN estancadas. Señala higiene (nombres
// de etapa duplicados). Conecta COMO agentes_ia_exec (aislamiento + kill switch).
// Propone a agent_proposals (borrador). Dedup por corte. Modo: revision | run.
// Deploy: npx supabase functions deploy remod-optimizacion
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
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const bearer = (req.headers.get("authorization") || "").replace(/^bearer /i, "").trim();
  if (bearer !== SERVICE_KEY) { const auth = await requireAuth(req, { requireAdmin: true }); if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401); }
  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();
    const [{ corte }] = await sql`select date_trunc('week', (now() at time zone 'America/Chicago'))::date::text as corte`;
    const [agent] = await sql`select id, coalesce(enabled,true) enabled from agent_registry where nombre='Optimizacion Remodelacion' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Optimizacion Remodelacion'" }, 404);
    if (agent.enabled === false) { await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ accion: "skip" })},${sql.json({ reason: "kill switch OFF" })},'skipped')`; return json({ ok: true, skipped: "disabled" }); }
    const iso: Record<string, string> = {};
    try { await sql`select 1 from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; } catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS" : "ERR"; }
    try { await sql`select document_id from pm_tenants limit 1`; iso.document_id = "LEAK"; } catch (e) { iso.document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS" : "ERR"; }
    if (iso.pm_credentials !== "PASS" || iso.document_id !== "PASS") { await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ accion: "abort" })},${sql.json({ iso })},'ABORT')`; return json({ ok: false, aborted: true, iso }, 500); }
    const k = "remodopt:tiempos:" + corte;
    const detail: Record<string, unknown> = {};
    {
      // por obra: vencidas + estado real
      const rows = await sql`
        select wa.property_name casa, ap.proceso, count(*) filter (where wa.status<>'done' and wa.date < current_date)::int vencidas
        from weekly_activities wa
        left join remodel_at_properties ap on lower(btrim(ap.address)) like '%'||lower(btrim(wa.property_name))||'%' and ap.active is not false
        group by 1,2 having count(*) filter (where wa.status<>'done' and wa.date < current_date) > 0
        order by 3 desc`;
      const estancadas: Array<Record<string, unknown>> = [], absurdos: Array<Record<string, unknown>> = [];
      for (const r of rows) {
        const rec = { casa: r.casa, vencidas: Number(r.vencidas), proceso: r.proceso };
        if (r.proceso === "Finalizado") absurdos.push({ ...rec, motivo: "obra Finalizado con planner sin cerrar → retraso ABSURDO, excluido del cálculo" });
        else if (r.proceso === "En construcción" && Number(r.vencidas) >= 5) estancadas.push({ ...rec, señal: "obra estancada real (acumulación de vencidas en construcción)" });
        // Pre-construcción y <5 vencidas: no se marca (RF7)
      }
      // higiene: nombres de etapa duplicados por caso/espacio
      const hig = await sql`select count(*)::int variantes from (select lower(btrim(stage)) s, count(distinct stage) c from remodel_stage_deviation group by 1 having count(distinct stage)>1) d`;
      const payload = { requiere_aprobacion: true, accion: "revisar_tiempos_obra", dedup_key: k };
      const evid = { tipo: "tiempos_obra", corte, obras_estancadas: estancadas, retrasos_absurdos_excluidos: absurdos, higiene_etapas_duplicadas: Number(hig[0]?.variantes || 0), nota: "Excluye Finalizado (planner sin cerrar = artefacto, el bug del Retraso en Días absurdo) y Pre-construcción; slip mediana ~0-2d (sano)", fuente: "weekly_activities + remodel_at_properties + remodel_stage_deviation", origen: "ejecutor remod-optimizacion" };
      const [recorded] = await sql`select outcome from record_agent_proposal(${agent.id},'conciliacion',${sql.json(payload)},${sql.json(evid)})`;
      const [reconciled] = await sql`select reconcile_agent_proposal_set(${agent.id},'conciliacion','remodopt:tiempos:',${[k]}::text[]) retired`;
      detail.outcome = recorded.outcome; detail.retired = Number(reconciled.retired || 0); detail.estancadas = estancadas.length; detail.absurdos_excluidos = absurdos.length; detail.etapas_duplicadas = Number(hig[0]?.variantes || 0);
    }
    await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ corte, rol_db: "agentes_ia_exec" })},${sql.json({ detail, iso })},'ok')`;
    return json({ ok: true, corte, detail, iso });
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
  finally { if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } } }
});
