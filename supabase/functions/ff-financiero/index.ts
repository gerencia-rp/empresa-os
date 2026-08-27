// ════════════════════════════════════════════════════════════════
// 💵 FIX & FLIP · FINANCIERO — ejecutor autónomo (la plata más pesada del holding).
// Empresa madre: underwriting, HML, cap table de inversionistas.
// Cadencia: interés HML (mensual) · underwriting (semanal) · cap table (mensual).
// Lee el espejo ff_* y ESCRIBE SOLO PROPUESTAS a agent_proposals. NUNCA ejecuta
// un pago/ajuste: cada ítem queda estado='propuesta' → Nicolás/Alejandra aprueba.
//
// 🔒 SEGURIDAD IMPUESTA POR LA DB: conecta COMO agentes_ia_exec (least-privilege):
//   SELECT en ff_deals/hml_loans/hml_payments/draws/overhead/uw_config +
//   ff_investors POR ALLOWLIST DE COLUMNAS (sin SSN/Green Card/document_id) +
//   INSERT solo en agent_proposals/agent_audit_log. CERO pm_credentials/PII de
//   inquilinos, CERO update/delete. Test de AISLAMIENTO al arrancar; si algo no
//   diera "permission denied", ABORTA sin escribir.
//
// Disciplina anti-falso-positivo: underwriting solo sobre deals con ARV>0 y no
//   vendidos; NO fusiona nombres parecidos (Yeison Vargas != Yeisson Garcia);
//   appraisal=0 se LISTA (no se asume ARV); plata real, no contrato.
//
// Kill switch: agent_registry.enabled (Financiero Fix & Flip). Dedup por corte.
// Modos (?mode=): interes | underwriting | captable | run(=underwriting)
// Deploy: npx supabase functions deploy ff-financiero
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
const money = (n: number) => "$" + Math.round(+n || 0).toLocaleString("en-US");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const bearer = (req.headers.get("authorization") || "").replace(/^bearer /i, "").trim();
  if (bearer !== SERVICE_KEY) {
    const auth = await requireAuth(req, { requireAdmin: true });
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);
  }
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  let mode = String(url.searchParams.get("mode") || (body as { mode?: string }).mode || "run");
  if (mode === "run") mode = "underwriting";

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();
    const [{ corte }] = await sql`select date_trunc('week', (now() at time zone 'America/Chicago'))::date::text as corte`;
    const [{ mes }] = await sql`select to_char((now() at time zone 'America/Chicago'),'YYYY-MM') as mes`;

    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Financiero Fix & Flip' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Financiero Fix & Flip'" }, 404);
    if (agent.enabled === false) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, accion: "skip" })}, ${sql.json({ reason: "kill switch OFF" })}, 'skipped')`;
      return json({ ok: true, skipped: "disabled", mode });
    }

    // ── Test de AISLAMIENTO (PII de inquilinos + credenciales bloqueadas por DB) ──
    const iso: Record<string, string> = {};
    try { await sql`select 1 as x from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; }
    catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    try { await sql`select document_id from pm_tenants limit 1`; iso.pm_tenants_document_id = "LEAK"; }
    catch (e) { iso.pm_tenants_document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    if (!(iso.pm_credentials.startsWith("PASS") && iso.pm_tenants_document_id.startsWith("PASS"))) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, accion: "abort" })}, ${sql.json({ isolation_test: iso })}, 'ABORT')`;
      return json({ ok: false, aborted: true, isolation_test: iso }, 500);
    }

    let created = 0, refreshed = 0, skipped = 0;
    const detail: Record<string, unknown> = {};
    const recordProposal = async (tipo: string, payload: Record<string, unknown>, evidence: Record<string, unknown>) => {
      const [result] = await sql!`select outcome from record_agent_proposal(${agent.id},${tipo},${sql!.json(payload)},${sql!.json(evidence)})`;
      if (result?.outcome === "created") created++; else refreshed++;
    };

    if (mode === "interes") {
      // FF1 · reconciliación de interés HML (esperado vs pagado). Anti-inventar: si el
      // schedule del espejo es incompleto, lo declara; no fuerza un total falso.
      const k = "fff:interes:" + mes;
        const [rec] = await sql`
          with loans as (
            select address_norm, monto_hml::numeric monto, tasa_pct::numeric tasa,
                   greatest((least(coalesce(fecha_refi,fecha_vencimiento,current_date),current_date) - fecha_inicio),0)::numeric dias
            from ff_hml_loans
            where active is not false and coalesce(monto_hml,0)>0 and fecha_inicio is not null and coalesce(tasa_pct,0)>0),
          esp as (select address_norm, monto*(tasa/100.0)/12.0 * dias/30.4375 as esperado from loans),
          pag as (select address_norm, sum(coalesce(pago_hml,0)) pagado from ff_hml_payments where active is not false group by 1)
          select round(coalesce(sum(e.esperado),0)) esperado, round((select sum(coalesce(pago_hml,0)) from ff_hml_payments where active is not false)) pagado_total,
                 count(*) loans, round(coalesce(sum(e.esperado - coalesce(p.pagado,0)),0)) gap
          from esp e left join pag p using(address_norm)`;
        const div = await sql`
          with loans as (
            select address, address_norm, monto_hml::numeric monto, tasa_pct::numeric tasa,
                   greatest((least(coalesce(fecha_refi,fecha_vencimiento,current_date),current_date) - fecha_inicio),0)::numeric dias
            from ff_hml_loans
            where active is not false and coalesce(monto_hml,0)>0 and fecha_inicio is not null and coalesce(tasa_pct,0)>0),
          esp as (select address, address_norm, round(monto*(tasa/100.0)/12.0 * dias/30.4375) esperado from loans),
          pag as (select address_norm, sum(coalesce(pago_hml,0)) pagado from ff_hml_payments where active is not false group by 1)
          select e.address, e.esperado, round(coalesce(p.pagado,0)) pagado, round(e.esperado-coalesce(p.pagado,0)) gap
          from esp e left join pag p using(address_norm)
          where abs(e.esperado-coalesce(p.pagado,0)) >= 5000 order by abs(e.esperado-coalesce(p.pagado,0)) desc limit 12`;
        const g = rec;
        const payload = { requiere_aprobacion: true, accion: "conciliar_interes_hml", dedup_key: k, gap_estimado: Number(g.gap), severidad: "alto" };
        const evid = { tipo: "interes_hml", regla: "FF1 gap ~$46k", mes, interes_pagado_total: Number(g.pagado_total), interes_esperado_estimado: Number(g.esperado), gap_estimado: Number(g.gap), prestamos: Number(g.loans), divergentes: div.map((r: Record<string, unknown>) => ({ casa: r.address, esperado: Number(r.esperado), pagado: Number(r.pagado), gap: Number(r.gap) })), nota: "Estimación con el schedule del espejo (fecha_inicio→salida). Reconciliar contra el corte manual conocido (~$46k). No se asume un total exacto si faltan cuotas.", fuente: "ff_hml_loans + ff_hml_payments", origen: "ejecutor ff-financiero" };
        await recordProposal("conciliacion", payload, evid);
        await sql`select reconcile_agent_proposal_set(${agent.id},'conciliacion','fff:interes:',${[k]}::text[])`;
        detail.interes = `pagado ${money(Number(g.pagado_total))}, ${div.length} divergentes`;
    } else if (mode === "underwriting") {
      // FF7 all-in >75% ARV + FF3 appraisals en 0 + FF2 gemelos Marlin + FF4 direcciones
      const k = "fff:uw:" + corte;
        // Normaliza: ff_uw_config tiene all_in_max_pct=0.75 (fracción) y allin_max_pct=75 (%). Si >1, /100.
        const [{ tope }] = await sql`select (case when v>1 then v/100.0 else v end) tope from (select coalesce((select value::numeric from ff_uw_config where key='all_in_max_pct'), (select value::numeric from ff_uw_config where key='arv_factor'), 0.75) v) q`;
        const viol = await sql`
          select address, stage, purchase_price::numeric pp, remodel_real::numeric rr, arv::numeric arv,
                 round(((coalesce(purchase_price,0)+coalesce(remodel_real,0))/nullif(arv,0)*100)::numeric,1) pct
          from ff_deals
          where active is not false and coalesce(arv,0)>0 and stage<>'vendida'
            and (coalesce(purchase_price,0)+coalesce(remodel_real,0)) > arv*${tope}
          order by pct desc`;
        const appr0 = await sql`select address from ff_deals where active is not false and coalesce(appraisal,0)=0 and stage<>'vendida' order by address`;
        const gemelos = await sql`
          select a.address a1, b.address b1, a.remodel_complete::numeric rc, a.net_total::numeric nt
          from ff_draws a join ff_draws b on a.remodel_complete=b.remodel_complete and a.net_total=b.net_total and a.address<b.address
          where a.remodel_complete is not null and a.net_total is not null`;
        const dirty = await sql`
          select address from ff_deals where active is not false and (address <> btrim(address) or address ~ '  ')
          union all select 'inv: '||name from ff_investors where active is not false and name <> btrim(name)`;
        const payload = { requiere_aprobacion: true, accion: "revisar_underwriting", dedup_key: k, tope_pct: Number(tope), severidad: viol.length > 0 ? "alto" : "medio" };
        const evid = { tipo: "underwriting", regla: "FF7/FF3/FF2/FF4", corte, tope_all_in_pct: Number(tope) * 100,
          violaciones_75pct: viol.map((r: Record<string, unknown>) => ({ casa: r.address, all_in: Number(r.pp) + Number(r.rr), arv: Number(r.arv), pct_arv: Number(r.pct) })),
          appraisals_en_cero: appr0.map((r: Record<string, unknown>) => r.address),
          gemelos_de_carga: gemelos.map((r: Record<string, unknown>) => ({ casa_a: r.a1, casa_b: r.b1, remodel: Number(r.rc), net_total: Number(r.nt) })),
          direcciones_sin_normalizar: dirty.map((r: Record<string, unknown>) => r.address),
          nota: "all-in = compra + remodel real; appraisal=0 se LISTA (no se asume ARV); gemelos byte-idénticos entre 2 casas = revisar carga.", fuente: "ff_deals + ff_draws + ff_investors + ff_uw_config", origen: "ejecutor ff-financiero" };
        await recordProposal("conciliacion", payload, evid);
        await sql`select reconcile_agent_proposal_set(${agent.id},'conciliacion','fff:uw:',${[k]}::text[])`;
        detail.underwriting = { violaciones: viol.length, appraisal_0: appr0.length, gemelos: gemelos.length, direcciones: dirty.length };
    } else if (mode === "captable") {
      // FF5 mora + FF6 higiene de CRM (dupes por teléfono, capital_pagado null, has_partner inconsistente)
      const k = "fff:captable:" + mes;
        const mora = await sql`
          select address, deficit_total::numeric def, rentabilidad_prometida::numeric prom, capital_inversionista::numeric cap
          from ff_deals where active is not false and coalesce(deficit_total,0)>0 and utilidad_entregada is null and coalesce(rentabilidad_prometida,0)>0
          order by deficit_total::numeric desc limit 10`;
        const telcol = await sql`
          with t as (select regexp_replace(phone,'\\D','','g') p, string_agg(name,' | ') nombres, count(*) c
                     from ff_investors where active is not false and phone is not null and length(regexp_replace(phone,'\\D','','g'))>=7 group by 1 having count(*)>1)
          select p, nombres, c from t`;
        const [{ sinpago }] = await sql`select count(*)::int sinpago from ff_investors where active is not false and capital_pagado is null`;
        const inconsist = await sql`select name from ff_investors where active is not false and ((has_partner='SI' and coalesce(partner_name,'N/A')='N/A') or (has_partner='NO' and coalesce(partner_name,'N/A')<>'N/A'))`;
        const prueba = await sql`select name from ff_investors where active is not false and name ~* '(prueba|test|demo)'`;
        const payload = { requiere_aprobacion: true, accion: "revisar_cap_table", dedup_key: k, severidad: mora.length > 0 ? "alto" : "medio" };
        const evid = { tipo: "cap_table", regla: "FF5/FF6", mes,
          mora_inversionista: mora.map((r: Record<string, unknown>) => ({ casa: r.address, deficit: Number(r.def), prometido: Number(r.prom), capital: Number(r.cap), estado: "nada entregado" })),
          telefonos_colisionados: telcol.map((r: Record<string, unknown>) => ({ telefono_ultimos4: String(r.p).slice(-4), registros: r.nombres, n: Number(r.c) })),
          capital_pagado_null: Number(sinpago),
          has_partner_inconsistente: inconsist.map((r: Record<string, unknown>) => r.name),
          registros_de_prueba: prueba.map((r: Record<string, unknown>) => r.name),
          guard_falso_positivo: "nombres parecidos NO se fusionan (Yeison Vargas != Yeisson Garcia)",
          nota: "PII: se reporta que dos registros comparten teléfono (últimos 4), nunca el número completo. capital_pagado null = cap table sin tracking de pagos.", fuente: "ff_investors + ff_deals", origen: "ejecutor ff-financiero" };
        await recordProposal("conciliacion", payload, evid);
        await sql`select reconcile_agent_proposal_set(${agent.id},'conciliacion','fff:captable:',${[k]}::text[])`;
        detail.captable = { mora: mora.length, tel_colision: telcol.length, sin_pago: Number(sinpago), inconsistentes: inconsist.length, prueba: prueba.length };
    } else {
      return json({ ok: false, error: "modo inválido: " + mode }, 400);
    }

    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte, mes, rol_db: "agentes_ia_exec" })}, ${sql.json({ created, refreshed, skipped, detail, isolation_test: iso })}, 'ok')`;
    return json({ ok: true, mode, corte, created, refreshed, skipped, detail, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
