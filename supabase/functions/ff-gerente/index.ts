// ════════════════════════════════════════════════════════════════
// 👔 FIX & FLIP · GERENTE — ejecutor (foto ejecutiva: consolida la escuadra).
// SOLO LEE agent_proposals (escuadra F&F) + ff_deals/ff_hml_*. ESCRIBE borrador a
// pm_informes (tipo=foto_ejecutiva_ff, dedup por corte). Conecta COMO agentes_ia_exec.
// No inventa: consolida SOLO la cola; cada punto cita su agente de origen. Cero acción.
// Isolation o ABORTA. Kill switch: agent_registry.enabled. Modo: foto | run(=foto)
// Deploy: npx supabase functions deploy ff-gerente
// ════════════════════════════════════════════════════════════════
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { requireAuth } from "../_shared/auth.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function execSql() {
  const raw = Deno.env.get("SUPABASE_DB_URL");
  const pwd = Deno.env.get("AGENTES_IA_EXEC_PWD");
  if (!raw || !pwd) throw new Error("faltan SUPABASE_DB_URL / AGENTES_IA_EXEC_PWD");
  const ref = (Deno.env.get("SUPABASE_URL") || "").replace(/^https?:\/\//, "").split(".")[0];
  const u = new URL(raw);
  const pooler = u.hostname.includes("pooler");
  const user = pooler ? `agentes_ia_exec.${ref}` : "agentes_ia_exec";
  const conn = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pwd)}@${u.hostname}:${u.port || 5432}${u.pathname || "/postgres"}`;
  return postgres(conn, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 15, ssl: "require" });
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
    const [{ corte }] = await sql`select (now() at time zone 'America/Chicago')::date::text as corte`;
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Gerente de Fix & Flip' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Gerente de Fix & Flip'" }, 404);
    if (agent.enabled === false) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ accion: "skip" })}, ${sql.json({ reason: "kill switch OFF" })}, 'skipped')`;
      return json({ ok: true, skipped: "disabled" });
    }
    const iso: Record<string, string> = {};
    try { await sql`select 1 from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; }
    catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    try { await sql`select document_id from pm_tenants limit 1`; iso.pm_tenants_document_id = "LEAK"; }
    catch (e) { iso.pm_tenants_document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    if (!(iso.pm_credentials.startsWith("PASS") && iso.pm_tenants_document_id.startsWith("PASS"))) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ accion: "abort" })}, ${sql.json({ isolation_test: iso })}, 'ABORT')`;
      return json({ ok: false, aborted: true, isolation_test: iso }, 500);
    }
    // dedup por corte
    const [ex] = await sql`select id from pm_informes where tipo='foto_ejecutiva_ff' and corte=${corte} and archived_at is null limit 1`;
    if (ex) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ created: 0, skipped: 1, detail: "dedup pm_informes", isolation_test: iso })}, 'ok')`;
      return json({ ok: true, created: 0, skipped: 1, dedup: true, isolation_test: iso });
    }
    // G1/G2 consolidar SOLO la cola abierta de la escuadra F&F, citando el agente de origen
    const cola = await sql`select r.nombre as agente, p.tipo_accion, p.payload->>'accion' accion, p.payload->>'severidad' sev, p.evidencia->>'tipo' evtipo, p.created_at
      from agent_proposals p join agent_registry r on r.id=p.agent_id
      where r.equipo='Escuadra Fix & Flip' and p.estado='propuesta' and p.deleted_at is null
      order by case coalesce(p.payload->>'severidad','') when 'alto' then 1 when 'medio' then 2 else 3 end, p.created_at desc`;
    // KPIs de portafolio (fuente ff_deals) — hechos, no inventados
    const [kpi] = await sql`select count(*)::int deals, round(coalesce(sum(arv),0)) arv_total, count(*) filter (where coalesce(deficit_total,0)>0)::int con_deficit, round(coalesce(sum(deficit_total),0)) deficit_total from ff_deals where active is not false and stage<>'vendida'`;
    const top3 = cola.filter((r: Record<string, unknown>) => r.sev === "alto").slice(0, 3);
    const payload = { tipo: "foto_ejecutiva_ff", corte,
      kpis_portafolio: { deals_activos: Number(kpi.deals), arv_total: Number(kpi.arv_total), deals_con_deficit: Number(kpi.con_deficit), deficit_total: Number(kpi.deficit_total) },
      top3_decisiones: top3.map((r: Record<string, unknown>) => ({ decision: r.accion, severidad: r.sev, origen: r.agente })),
      cola_priorizada: cola.map((r: Record<string, unknown>) => ({ agente: r.agente, accion: r.accion, tipo: r.evtipo, severidad: r.sev || "info" })),
      nota: "Consolidación de la cola agent_proposals de la escuadra F&F + KPIs de ff_deals. Cada punto cita su agente de origen; no se inventa nada; no se propone plata propia.",
      fuentes: ["agent_proposals(Escuadra Fix & Flip)", "ff_deals"], origen: "ejecutor ff-gerente" };
    await sql`insert into pm_informes (tipo,corte,titulo,estado,origen,payload,generado_por) values ('foto_ejecutiva_ff',${corte},${"Foto Ejecutiva Fix & Flip " + corte},'borrador','ejecutor',${sql.json(payload)},'ff-gerente (agentes_ia_exec)')`;
    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ created: 1, skipped: 0, detail: { cola: cola.length, top3: top3.length }, isolation_test: iso })}, 'ok')`;
    return json({ ok: true, created: 1, corte, detail: { cola: cola.length, top3: top3.length }, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
