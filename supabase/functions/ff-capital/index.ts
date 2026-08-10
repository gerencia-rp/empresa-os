// ════════════════════════════════════════════════════════════════
// 🏦 FIX & FLIP · CAPITAL & INVERSIONISTAS — ejecutor (cap table, el más delicado en PII).
// SOLO LEE ff_investors (allowlist de columnas) + inv_holdings + inv_distributions
// (sin k1_url/comprobante_url) + ff_deals. ESCRIBE SOLO PROPUESTAS a agent_proposals.
// Conecta COMO agentes_ia_exec (least-privilege por DB).
//
// 🔒 VERIFICACIÓN EXPLÍCITA DE PII AL ARRANCAR (o ABORTA sin escribir):
//   · pm_credentials → permission denied
//   · pm_tenants.document_id → permission denied  (único document_id de la DB)
//   · ff_investors.ssn / .green_card → NO EXISTEN en el espejo (bloqueado en origen)
//   Reporta últimos 4 del teléfono en dedup de CRM, jamás el número/email completo.
//
// Kill switch: agent_registry.enabled. Dedup por mes. Modo: captable | run(=captable)
// Deploy: npx supabase functions deploy ff-capital
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
    const [{ mes }] = await sql`select to_char((now() at time zone 'America/Chicago'),'YYYY-MM') as mes`;
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Capital & Inversionistas (Fix & Flip)' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Capital & Inversionistas (Fix & Flip)'" }, 404);
    if (agent.enabled === false) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ accion: "skip" })}, ${sql.json({ reason: "kill switch OFF" })}, 'skipped')`;
      return json({ ok: true, skipped: "disabled" });
    }
    // ── VERIFICACIÓN EXPLÍCITA DE PII ──
    const iso: Record<string, string> = {};
    try { await sql`select 1 from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; }
    catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    try { await sql`select document_id from pm_tenants limit 1`; iso.pm_tenants_document_id = "LEAK"; }
    catch (e) { iso.pm_tenants_document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    // SSN / Green Card de inversionistas: no deben existir ni ser legibles
    try { await sql`select ssn from ff_investors limit 1`; iso.ff_investors_ssn = "LEAK"; }
    catch (e) { const m = String((e as Error).message || e); iso.ff_investors_ssn = /permission denied/i.test(m) ? "PASS·permission denied" : /does not exist|no existe/i.test(m) ? "PASS·columna ausente" : "ERR:" + m; }
    try { await sql`select green_card from ff_investors limit 1`; iso.ff_investors_green_card = "LEAK"; }
    catch (e) { const m = String((e as Error).message || e); iso.ff_investors_green_card = /permission denied/i.test(m) ? "PASS·permission denied" : /does not exist|no existe/i.test(m) ? "PASS·columna ausente" : "ERR:" + m; }
    const pass = Object.values(iso).every((v) => v.startsWith("PASS"));
    if (!pass) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ accion: "abort" })}, ${sql.json({ isolation_test: iso })}, 'ABORT')`;
      return json({ ok: false, aborted: true, isolation_test: iso }, 500);
    }

    const open = await sql`select payload->>'dedup_key' k from agent_proposals where agent_id=${agent.id} and estado='propuesta' and deleted_at is null`;
    const keys = new Set<string>(open.map((r: Record<string, unknown>) => r.k as string).filter(Boolean));
    const k = "ffcap:" + mes;
    if (keys.has(k)) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mes, rol_db: "agentes_ia_exec" })}, ${sql.json({ created: 0, skipped: 1, detail: "dedup", isolation_test: iso })}, 'ok')`;
      return json({ ok: true, created: 0, skipped: 1, dedup: true, isolation_test: iso });
    }
    // C2 cap table
    const [{ holdings, holdings_cap }] = await sql`select count(*)::int holdings, count(*) filter (where coalesce(inversion_aportada,0)>0)::int holdings_cap from inv_holdings where active is not false`;
    const [{ inversores }] = await sql`select count(*)::int inversores from ff_investors where active is not false`;
    // C3 sin tracking de pagos
    const [{ sin_pago }] = await sql`select count(*)::int sin_pago from ff_investors where active is not false and capital_pagado is null`;
    const [{ dist_n }] = await sql`select count(*)::int dist_n from inv_distributions where active is not false`;
    // C4 higiene CRM
    const telcol = await sql`with t as (select regexp_replace(phone,'\\D','','g') p, string_agg(name,' | ') nombres, count(*) c
        from ff_investors where active is not false and phone is not null and length(regexp_replace(phone,'\\D','','g'))>=7 group by 1 having count(*)>1) select p, nombres, c from t`;
    const inconsist = await sql`select name from ff_investors where active is not false and ((has_partner='SI' and coalesce(partner_name,'N/A')='N/A') or (has_partner='NO' and coalesce(partner_name,'N/A')<>'N/A'))`;
    const prueba = await sql`select name from ff_investors where active is not false and name ~* '(prueba|test|demo)'`;
    // C6 retorno (mora / entregado)
    const mora = await sql`select address, deficit_total::numeric def, rentabilidad_prometida::numeric prom from ff_deals where active is not false and coalesce(deficit_total,0)>0 and utilidad_entregada is null and coalesce(rentabilidad_prometida,0)>0 order by deficit_total::numeric desc limit 10`;

    const payload = { requiere_aprobacion: true, accion: "revisar_cap_table", dedup_key: k, severidad: mora.length > 0 ? "alto" : "medio" };
    const evid = { tipo: "cap_table", regla: "C2/C3/C4/C6", mes,
      cap_table: { holdings: Number(holdings), holdings_con_capital: Number(holdings_cap), inversionistas: Number(inversores) },
      sin_tracking_pagos: { capital_pagado_null: Number(sin_pago), distribuciones_registradas: Number(dist_n) },
      telefonos_colisionados: telcol.map((r: Record<string, unknown>) => ({ telefono_ultimos4: String(r.p).slice(-4), registros: r.nombres, n: Number(r.c) })),
      has_partner_inconsistente: inconsist.map((r: Record<string, unknown>) => r.name),
      registros_de_prueba: prueba.map((r: Record<string, unknown>) => r.name),
      retorno_pendiente: mora.map((r: Record<string, unknown>) => ({ casa: r.address, deficit: Number(r.def), prometido: Number(r.prom), estado: "nada entregado" })),
      guard_falso_positivo: "nombres parecidos NO se fusionan (Yeison Vargas != Yeisson Garcia)",
      pii: "SSN/Green Card/document_id fuera del alcance (bloqueado por DB). Teléfono solo últimos 4; email nunca en el reporte.",
      fuente: "ff_investors (allowlist) + inv_holdings + inv_distributions + ff_deals", origen: "ejecutor ff-capital" };
    await sql`insert into agent_proposals (agent_id, tipo_accion, estado, payload, evidencia) values (${agent.id}, 'conciliacion', 'propuesta', ${sql.json(payload)}, ${sql.json(evid)})`;
    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mes, rol_db: "agentes_ia_exec" })}, ${sql.json({ created: 1, skipped: 0, detail: { holdings: Number(holdings), sin_pago: Number(sin_pago), tel_colision: telcol.length, prueba: prueba.length, mora: mora.length }, isolation_test: iso })}, 'ok')`;
    return json({ ok: true, created: 1, mes, detail: { holdings: Number(holdings), sin_pago: Number(sin_pago), tel_colision: telcol.length, mora: mora.length }, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
