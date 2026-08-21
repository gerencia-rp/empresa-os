// ════════════════════════════════════════════════════════════════
// 📱 FIX & FLIP · REPORTES — ejecutor (pipeline de deals + underwriting → pm_informes).
// SOLO LEE ff_deals/ff_hml_*. ESCRIBE borrador a pm_informes (dedup por corte).
// Conecta COMO agentes_ia_exec (least-privilege). Isolation o ABORTA.
// Cada cifra cita su fuente; deal sin dato = "no computable"; CERO PII.
// Kill switch: agent_registry.enabled. Modo: pipeline | run(=pipeline)
// Deploy: npx supabase functions deploy ff-reportes
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
    const [{ corte }] = await sql`select date_trunc('week', (now() at time zone 'America/Chicago'))::date::text as corte`;
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Reportes Fix & Flip' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Reportes Fix & Flip'" }, 404);
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
    // R4 dedup por corte
    const [ex] = await sql`select id from pm_informes where tipo='pipeline_ff' and corte=${corte} and archived_at is null limit 1`;
    if (ex) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ created: 0, skipped: 1, detail: "dedup pm_informes", isolation_test: iso })}, 'ok')`;
      return json({ ok: true, created: 0, skipped: 1, dedup: true, isolation_test: iso });
    }
    // R1 pipeline por stage + R2 no computable
    const pipe = await sql`select stage, count(*)::int n, round(coalesce(sum(arv),0)) arv_total, count(*) filter (where coalesce(arv,0)=0)::int sin_arv, count(*) filter (where coalesce(appraisal,0)=0)::int sin_appraisal from ff_deals where active is not false group by stage order by n desc`;
    const [{ total }] = await sql`select count(*)::int total from ff_deals where active is not false`;
    const [{ hml_pagado }] = await sql`select round(coalesce(sum(pago_hml),0)) hml_pagado from ff_hml_payments where active is not false`;
    const payload = { tipo: "pipeline_ff", corte,
      pipeline_por_etapa: pipe.map((r: Record<string, unknown>) => ({ etapa: r.stage, deals: Number(r.n), arv_total: Number(r.arv_total), sin_arv_no_computable: Number(r.sin_arv), appraisal_en_cero: Number(r.sin_appraisal) })),
      total_deals_activos: Number(total), interes_hml_pagado: Number(hml_pagado),
      nota: "Cifras de ff_deals/ff_hml_payments; deal sin ARV = no computable (no se rellena); appraisal=0 se declara. Cero PII de inversionistas.",
      fuentes: ["ff_deals", "ff_hml_payments"], origen: "ejecutor ff-reportes" };
    await sql`insert into pm_informes (tipo,corte,titulo,estado,origen,payload,generado_por) values ('pipeline_ff',${corte},${"Pipeline Fix & Flip " + corte},'borrador','ejecutor',${sql.json(payload)},'ff-reportes (agentes_ia_exec)')`;
    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ created: 1, skipped: 0, detail: { etapas: pipe.length, total: Number(total) }, isolation_test: iso })}, 'ok')`;
    return json({ ok: true, created: 1, corte, detail: { etapas: pipe.length, total: Number(total) }, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
