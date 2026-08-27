// Fix & Flip · Optimización. Lee únicamente transiciones observadas desde que
// existe ff_deal_stage_history. No infiere historia previa ni ejecuta cambios.
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { requireAuth } from "../_shared/auth.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function execSql() {
  const raw = Deno.env.get("SUPABASE_DB_URL");
  const pwd = Deno.env.get("AGENTES_IA_EXEC_PWD");
  if (!raw || !pwd) throw new Error("faltan SUPABASE_DB_URL / AGENTES_IA_EXEC_PWD");
  const ref = (Deno.env.get("SUPABASE_URL") || "").replace(/^https?:\/\//, "").split(".")[0];
  const u = new URL(raw);
  const user = u.hostname.includes("pooler") ? `agentes_ia_exec.${ref}` : "agentes_ia_exec";
  return postgres(`postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pwd)}@${u.hostname}:${u.port || 5432}${u.pathname || "/postgres"}`, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 15, ssl: "require" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const bearer = (req.headers.get("authorization") || "").replace(/^bearer /i, "").trim();
  if (bearer !== SERVICE_KEY) {
    const auth = await requireAuth(req, { requireAdmin: true });
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);
  }
  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();
    const [agent] = await sql`select id,estado,coalesce(enabled,true) enabled from agent_registry where nombre='Optimizacion Fix & Flip' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Optimizacion Fix & Flip'" }, 404);
    if (agent.enabled === false) return json({ ok: true, skipped: "disabled" });

    const isolation: Record<string, string> = {};
    try { await sql`select 1 from pm_credentials limit 1`; isolation.pm_credentials = "LEAK"; }
    catch (e) { isolation.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR"; }
    try { await sql`select document_id from pm_tenants limit 1`; isolation.pm_tenants_document_id = "LEAK"; }
    catch (e) { isolation.pm_tenants_document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR"; }
    if (!(isolation.pm_credentials.startsWith("PASS") && isolation.pm_tenants_document_id.startsWith("PASS"))) {
      await sql`insert into agent_audit_log(agent_id,input,output,resultado) values(${agent.id},${sql.json({ mode: "abort", tipo: "isolation_test" })},${sql.json({ isolation })},'ABORT')`;
      return json({ ok: false, aborted: true, isolation }, 500);
    }

    const [coverage] = await sql`select count(*)::int intervals,count(distinct deal_id)::int deals,count(distinct stage)::int stages from v_ff_stage_duration`;
    const ready = Number(coverage.intervals) >= 3 && Number(coverage.deals) >= 2 && Number(coverage.stages) >= 2;
    if (!ready) {
      // Modo útil desde el día uno: observa la salud del pipeline sin fingir
      // duraciones históricas. Cuando la cobertura alcance el mínimo, la misma
      // función pasa automáticamente al análisis estadístico de cuellos.
      const [snapshot] = await sql`select count(*)::int total,
        count(*) filter(where nullif(btrim(coalesce(stage,'')),'') is null)::int missing_stage,
        count(*) filter(where last_synced_at is null or last_synced_at < now()-interval '2 days')::int stale,
        max(last_synced_at) last_sync
        from ff_deals where active is not false`;
      const issues = Number(snapshot.missing_stage) + Number(snapshot.stale);
      const week = (await sql`select date_trunc('week',now() at time zone 'America/Chicago')::date::text week`)[0].week;
      const dedup = `ffopt-observability:${week}`;
      let proposalCreated = false;
      if (issues > 0) {
        const [existing] = await sql`select id from agent_proposals where agent_id=${agent.id} and deleted_at is null and payload->>'dedup_key'=${dedup} limit 1`;
        if (!existing) {
          await sql`insert into agent_proposals(agent_id,tipo_accion,estado,payload,evidencia) values(${agent.id},'higiene_pipeline','propuesta',${sql.json({ dedup_key: dedup, requiere_aprobacion: true, accion: "revisar_salud_pipeline_fix_flip" })},${sql.json({ titulo: "Salud del pipeline Fix & Flip", resumen: `${issues} registros requieren revisión de etapa o sincronización`, propiedades_activas: Number(snapshot.total), sin_etapa: Number(snapshot.missing_stage), desactualizadas: Number(snapshot.stale), ultima_sincronizacion: snapshot.last_sync, fuente: "ff_deals", regla: "observabilidad real; no calcula duraciones hasta tener transiciones completas" })})`;
          proposalCreated = true;
        }
      }
      const evidence = { operational: true, mode: "observability", ready_for_stage_statistics: false, intervals: Number(coverage.intervals), deals: Number(coverage.deals), stages: Number(coverage.stages), minimum: { intervals: 3, deals: 2, stages: 2 }, snapshot: { total: Number(snapshot.total), missing_stage: Number(snapshot.missing_stage), stale: Number(snapshot.stale), last_sync: snapshot.last_sync }, issues, proposal_created: proposalCreated, reason: "Supervisa salud y frescura del pipeline. Solo activa medianas con intervalos observados completos; baselines y fechas reconstruidas quedan excluidos.", source: "ff_deals + v_ff_stage_duration", isolation };
      await sql`insert into agent_audit_log(agent_id,input,output,resultado) values(${agent.id},${sql.json({ mode: "observability", tipo: "ejecucion_negocio" })},${sql.json(evidence)},'ok')`;
      return json({ ok: true, operational: true, ready_for_stage_statistics: false, evidence });
    }

    const medians = await sql`select stage,count(*)::int samples,round(percentile_cont(0.5) within group(order by duration_days)::numeric,2) median_days from v_ff_stage_duration group by stage order by median_days desc`;
    const stalls = await sql`with med as (select stage,percentile_cont(0.5) within group(order by duration_days) median_days from v_ff_stage_duration group by stage)
      select d.id,d.address,d.stage,round((extract(epoch from (now()-h.observed_at))/86400.0)::numeric,1) days_in_stage,round(m.median_days::numeric,1) median_days
      from ff_deals d join ff_deal_stage_history h on h.deal_id=d.id and h.exited_at is null and h.is_baseline=false join med m on m.stage=d.stage
      where d.active is not false and extract(epoch from (now()-h.observed_at))/86400.0 > greatest(14,m.median_days*1.5) order by days_in_stage desc limit 20`;
    const week = (await sql`select date_trunc('week',now() at time zone 'America/Chicago')::date::text week`)[0].week;
    const dedup = `ffopt:${week}`;
    const [existing] = await sql`select id from agent_proposals where agent_id=${agent.id} and deleted_at is null and payload->>'dedup_key'=${dedup} limit 1`;
    if (!existing) await sql`insert into agent_proposals(agent_id,tipo_accion,estado,payload,evidencia) values(${agent.id},'mejora_pipeline','propuesta',${sql.json({ dedup_key: dedup, requiere_aprobacion: true, accion: "revisar_cuellos_fix_flip" })},${sql.json({ titulo: "Cuellos reales del pipeline Fix & Flip", resumen: `${stalls.length} propiedades exceden el tiempo esperado de su etapa`, medianas: medians, propiedades: stalls, fuente: "ff_deal_stage_history", regla: "mediana observada; alerta > max(14 días, 1.5× mediana)" })})`;
    await sql`insert into agent_audit_log(agent_id,input,output,resultado) values(${agent.id},${sql.json({ mode: "revision", tipo: "ejecucion_negocio" })},${sql.json({ ready: true, intervals: Number(coverage.intervals), deals: Number(coverage.deals), stages: Number(coverage.stages), stalls: stalls.length, created: existing ? 0 : 1, source: "v_ff_stage_duration", isolation })},'ok')`;
    return json({ ok: true, ready: true, coverage, medians, stalls, proposal_created: !existing, isolation });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) try { await sql.end({ timeout: 5 }); } catch (_) { /* noop */ }
  }
});
