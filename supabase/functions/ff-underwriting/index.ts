// ════════════════════════════════════════════════════════════════
// 📐 FIX & FLIP · UNDERWRITING — ejecutor (MAO/ARV + regla all-in ≤75% ARV).
// SOLO LEE ff_deals/ff_uw_config. ESCRIBE SOLO PROPUESTAS a agent_proposals.
// Conecta COMO agentes_ia_exec (least-privilege, sin PII). Test de aislamiento
// al arrancar (pm_credentials/pm_tenants.document_id = permission denied) o ABORTA.
// Normaliza el tope: all_in_max_pct=0.75 (fracción) vs allin_max_pct=75 (%) → si >1, /100.
// Kill switch: agent_registry.enabled. Dedup por corte. Modo: uw | run(=uw)
// Deploy: npx supabase functions deploy ff-underwriting
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
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Underwriting (Fix & Flip)' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Underwriting (Fix & Flip)'" }, 404);
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

    const k = "ffuw:" + corte;
    // tope normalizado (U2)
    const [{ tope }] = await sql`select (case when v>1 then v/100.0 else v end) tope from (select coalesce((select value::numeric from ff_uw_config where key='all_in_max_pct'), (select value::numeric from ff_uw_config where key='arv_factor'), 0.75) v) q`;
    // U1 violaciones + MAO por deal + escenarios ±10% (U4)
    const deals = await sql`
      select address, stage, purchase_price::numeric pp, remodel_real::numeric rr, arv::numeric arv, appraisal::numeric appr,
             round((arv*${tope} - coalesce(remodel_real,0))::numeric) mao,
             round(((coalesce(purchase_price,0)+coalesce(remodel_real,0))/nullif(arv,0)*100)::numeric,1) pct_arv
      from ff_deals where active is not false and coalesce(arv,0)>0 and stage<>'vendida' order by pct_arv desc nulls last`;
    const viol = deals.filter((d: Record<string, unknown>) => Number(d.pct_arv) > Number(tope) * 100);
    const sobre_mao = deals.filter((d: Record<string, unknown>) => Number(d.pp) > Number(d.mao));
    const appr0 = await sql`select address from ff_deals where active is not false and coalesce(appraisal,0)=0 and stage<>'vendida' order by address`;
    const payload = { requiere_aprobacion: true, accion: "revisar_underwriting", dedup_key: k, tope_pct: Number(tope) * 100, severidad: viol.length > 0 ? "alto" : "medio" };
    const evid = { tipo: "underwriting", regla: "U1/U2/U3/U4", corte, tope_all_in_pct: Number(tope) * 100,
      violaciones_75pct: viol.map((d: Record<string, unknown>) => ({ casa: d.address, all_in: Number(d.pp) + Number(d.rr), arv: Number(d.arv), pct_arv: Number(d.pct_arv) })),
      compra_sobre_mao: sobre_mao.map((d: Record<string, unknown>) => ({ casa: d.address, compra: Number(d.pp), mao: Number(d.mao) })),
      appraisals_en_cero: appr0.map((r: Record<string, unknown>) => r.address),
      mao_por_deal: deals.slice(0, 30).map((d: Record<string, unknown>) => ({ casa: d.address, mao: Number(d.mao), mao_arv_menos10: Math.round((Number(d.arv) * 0.9 * Number(tope)) - Number(d.rr)), mao_arv_mas10: Math.round((Number(d.arv) * 1.1 * Number(tope)) - Number(d.rr)) })),
      nota: "MAO = ARV×" + (Number(tope) * 100) + "% − remodel real (simplificado); appraisal=0 se LISTA, no se asume ARV; escenarios ARV ±10%.", fuente: "ff_deals + ff_uw_config", origen: "ejecutor ff-underwriting" };
    const [recorded] = await sql`select outcome from record_agent_proposal(${agent.id}, 'conciliacion', ${sql.json(payload)}, ${sql.json(evid)})`;
    const [reconciled] = await sql`select reconcile_agent_proposal_set(${agent.id}, 'conciliacion', 'ffuw:', ${[k]}::text[]) retired`;
    const detail = { violaciones: viol.length, sobre_mao: sobre_mao.length, appraisal_0: appr0.length };
    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ outcome: recorded.outcome, retired: Number(reconciled.retired || 0), detail, isolation_test: iso })}, 'ok')`;
    return json({ ok: true, outcome: recorded.outcome, retired: Number(reconciled.retired || 0), corte, detail, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
