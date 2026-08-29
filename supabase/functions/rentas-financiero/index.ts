// ════════════════════════════════════════════════════════════════
// 💵 RENTAS · FINANCIERO — ejecutor autónomo (aging + conciliación).
// Corre en cadencia (cobros diario / servicios 3x·mes / cierre mensual),
// lee el espejo y ESCRIBE SOLO PROPUESTAS a agent_proposals. NUNCA ejecuta
// un cobro, pago o mensaje: cada ítem queda estado='propuesta' → Nicolás aprueba.
//
// 🔒 SEGURIDAD IMPUESTA POR LA DB (no por código):
//   La función NO usa el service role para las queries. Abre una conexión
//   Postgres COMO el rol `agentes_ia_exec` (least-privilege): SELECT solo en el
//   espejo (v_cartera_*, pm_payments, pm_properties, clickup_tasks_mirror,
//   ct_findings, agent_registry, agent_proposals) + SELECT(id,full_name) en
//   pm_tenants + INSERT solo en agent_proposals/agent_audit_log. CERO
//   pm_credentials, CERO document_id (PII), CERO update/delete. Si el código
//   tuviera un bug, la DB rechaza (permission denied).
//   Al arrancar corre un TEST DE AISLAMIENTO (pm_credentials + document_id →
//   permission denied); si algo NO diera denied, ABORTA sin escribir.
//
// Kill switch: agent_registry.enabled (Financiero Rentas). off = no corre.
// Idempotente: no duplica propuestas abiertas (cobro=casa+inquilino,
//   descuadre=casa, resumen=corte del día).
//
// Auth HTTP: bearer = SERVICE_KEY (cron) o admin JWT. (Distinto del rol DB.)
// Modos (?mode=): cobros | servicios | cierre | run(=cobros)
// Deploy: npx supabase functions deploy rentas-financiero
// ════════════════════════════════════════════════════════════════
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { requireAuth } from "../_shared/auth.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// Conexión COMO agentes_ia_exec (least-privilege; NO service role).
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

function money(n: number) { return "$" + Math.round(+n || 0).toLocaleString("en-US"); }
function todayCT() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); } // YYYY-MM-DD
function firstName(s: string) { return String(s || "").trim().split(/\s+/)[0] || "vecino/a"; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // Auth del invocador (cron o admin) — separado del rol de DB
  const bearer = (req.headers.get("authorization") || "").replace(/^bearer /i, "").trim();
  if (bearer !== SERVICE_KEY) {
    const auth = await requireAuth(req, { requireAdmin: true });
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);
  }
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  let mode = String(url.searchParams.get("mode") || (body as { mode?: string }).mode || "run");
  if (mode === "run") mode = "cobros";
  // corteYm = MES ANTERIOR (el que se cierra); prevYm = el previo a ese
  const _t = todayCT().split("-").map(Number);
  const cY = _t[1] === 1 ? _t[0] - 1 : _t[0], cM = _t[1] === 1 ? 12 : _t[1] - 1;
  const corteYm = `${cY}-${String(cM).padStart(2, "0")}`, corteDate = `${corteYm}-01`;
  const pY = cM === 1 ? cY - 1 : cY, pM = cM === 1 ? 12 : cM - 1;
  const prevYm = `${pY}-${String(pM).padStart(2, "0")}`;

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();

    // ── agent_id + KILL SWITCH ──
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled, estado from agent_registry where nombre='Financiero Rentas' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe el agente 'Financiero Rentas'" }, 404);
    if (agent.enabled === false) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, accion: "skip" })}, ${sql.json({ reason: "kill switch OFF (agent_registry.enabled=false)" })}, 'skipped')`;
      return json({ ok: true, skipped: "disabled", mode });
    }

    // ── TEST DE AISLAMIENTO (bajo el rol restringido) ──
    const iso: Record<string, string> = {};
    try { await sql`select 1 as x from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; }
    catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    try { await sql`select document_id from pm_tenants limit 1`; iso.pm_tenants_document_id = "LEAK"; }
    catch (e) { iso.pm_tenants_document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    const isoPass = iso.pm_credentials.startsWith("PASS") && iso.pm_tenants_document_id.startsWith("PASS");
    if (!isoPass) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, accion: "abort" })}, ${sql.json({ isolation_test: iso, motivo: "el rol pudo leer credenciales/PII — ABORT, no se escribió nada" })}, 'ABORT')`;
      return json({ ok: false, aborted: true, isolation_test: iso }, 500);
    }

    // ── DEDUP: cargar propuestas abiertas del Financiero ──
    const open = await sql`select tipo_accion, evidencia from agent_proposals where agent_id=${agent.id} and estado='propuesta' and deleted_at is null`;
    const cobroKeys = new Set<string>(), descKeys = new Set<string>();
    for (const p of open) {
      const e = (p.evidencia || {}) as Record<string, unknown>;
      if (p.tipo_accion === "recordatorio_cobro") cobroKeys.add(((e.casa as string) || "") + "|" + ((e.inquilino as string) || ""));
      if (p.tipo_accion === "conciliacion") descKeys.add((e.casa as string) || "");
    }

    let created = 0, refreshed = 0, skipped = 0;
    const detail: Record<string, unknown> = { cobros_new: 0, cobros_skip: 0, descuadres_new: 0, descuadres_skip: 0, sobrepagos_new: 0, sobrepagos_skip: 0, resumen_new: 0, resumen_skip: 0 };
    const recordProposal = async (tipo: string, payload: Record<string, unknown>, evidence: Record<string, unknown>) => {
      const [result] = await sql!`select outcome from record_agent_proposal(${agent.id},${tipo},${sql!.json(payload)},${sql!.json(evidence)})`;
      if (result?.outcome === "created") created++; else refreshed++;
      return result?.outcome;
    };

    if (mode === "cobros") {
      const cobroSeen: string[] = [], descuadreSeen: string[] = [], sobrepagoSeen: string[] = [];
      // (a) COBROS — morosos con vencido neto > 0
      const morosos = await sql`select tenant_id, inquilino, casa, vencido_neto, mes_mas_viejo, aging from v_cartera_inquilino where vencido_neto > 0 order by vencido_neto desc`;
      for (const m of morosos) {
        const key = (m.casa || "") + "|" + (m.inquilino || "");
        const payload = { canal: "whatsapp/email", monto: m.vencido_neto, requiere_aprobacion: true, accion: "enviar_recordatorio", dedup_key: "cobro:" + key };
        const evid = { tipo: "recordatorio_cobro", inquilino: m.inquilino, casa: m.casa, monto_vencido_neto: m.vencido_neto, aging: m.aging, borrador: `Hola ${firstName(m.inquilino)}, te escribimos de Rental Profits por la renta pendiente de ${m.casa}. Saldo vencido: ${money(m.vencido_neto)}. ¿Coordinamos el pago o un plan? Gracias.`, nota: "DRY-RUN: NO enviar, aprueba Nicolás", fuente: "v_cartera_inquilino", origen: "ejecutor rentas-financiero" };
        const outcome = await recordProposal("recordatorio_cobro", payload, evid);
        if (outcome === "created") (detail.cobros_new as number)++; else (detail.cobros_skip as number)++;
        cobroKeys.add(key);
        cobroSeen.push("cobro:" + key);
      }

      // (b) DESCUADRES — mismo inquilino + mismo mes con >1 fila (fractura/carga cruzada), excluye plataformas
      const frac = await sql`
        select t.full_name as inquilino, p.casa as casa, sum(p.cnt-1) as filas_extra, count(*) as meses
        from (select tenant_id, casa_nickname as casa, billing_ym, count(*) cnt from pm_payments where active and tenant_id is not null group by 1,2,3 having count(*) > 1) p
        join pm_tenants t on t.id=p.tenant_id
        where t.full_name !~* 'pad ?s?split'
        group by 1,2 order by 3 desc`;
      for (const d of frac) {
        const payload = { requiere_aprobacion: true, accion: "consolidar_filas_airtable", dedup_key: "descuadre:" + d.casa };
        const evid = { tipo: "descuadre", casa: d.casa, inquilino: d.inquilino, filas_extra: Number(d.filas_extra), meses: Number(d.meses), hallazgo: `Renta de ${d.inquilino} fracturada en ${d.filas_extra} filas extra a lo largo de ${d.meses} mes(es) — carga cruzada/doble-conteo. renta_pactada inconsistente entre filas.`, accion_propuesta: "Consolidar las filas por mes y normalizar renta_pactada en Airtable.", fuente: "pm_payments", origen: "ejecutor rentas-financiero" };
        const outcome = await recordProposal("conciliacion", payload, evid);
        if (outcome === "created") (detail.descuadres_new as number)++; else (detail.descuadres_skip as number)++;
        descKeys.add(d.casa);
        descuadreSeen.push("descuadre:" + d.casa);
      }

      // (c) SALDOS A FAVOR — se revisan, nunca se convierten en cobros automáticos.
      const sobrepagos = await sql`select tenant_id, inquilino, casa, a_favor from v_cartera_inquilino where a_favor > 0 order by a_favor desc`;
      for (const s of sobrepagos) {
        const key = "sobrepago:" + s.tenant_id;
        const payload = { requiere_aprobacion: true, accion: "verificar_sobrepago", dedup_key: key };
        const evid = { tipo: "sobrepago", inquilino: s.inquilino, casa: s.casa, saldo_a_favor: s.a_favor, hallazgo: "El espejo de cartera muestra saldo a favor; verificar aplicación contable antes de compensar o devolver.", fuente: "v_cartera_inquilino", origen: "ejecutor rentas-financiero" };
        const outcome = await recordProposal("conciliacion", payload, evid);
        if (outcome === "created") (detail.sobrepagos_new as number)++; else (detail.sobrepagos_skip as number)++;
        sobrepagoSeen.push(key);
      }

      const [cobroRetired] = await sql`select reconcile_agent_proposal_set(${agent.id},'recordatorio_cobro','cobro:',${cobroSeen}::text[]) retired`;
      const [descuadreRetired] = await sql`select reconcile_agent_proposal_set(${agent.id},'conciliacion','descuadre:',${descuadreSeen}::text[]) retired`;
      const [sobrepagoRetired] = await sql`select reconcile_agent_proposal_set(${agent.id},'conciliacion','sobrepago:',${sobrepagoSeen}::text[]) retired`;
      detail.retirados = Number(cobroRetired.retired || 0) + Number(descuadreRetired.retired || 0) + Number(sobrepagoRetired.retired || 0);

      // (d) RESUMEN DE COBRANZA DEL DÍA (dedup por corte)
      const corte = todayCT();
        const [kpi] = await sql`select * from v_cartera_kpi`;
        const buckets = await sql`select case when mes_mas_viejo>='2026-07' then '0-30' when mes_mas_viejo='2026-06' then '31-60' when mes_mas_viejo<'2026-06' then '60+' else 's/d' end b, count(*) n, coalesce(sum(vencido_neto),0) v from v_cartera_inquilino where vencido_neto>0 group by 1`;
        const evid = { tipo: "resumen_cobranza_diario", corte, vencido_neto_total: kpi?.vencido_neto, pendiente_neto_total: kpi?.pendiente_neto_total, morosos_reales: kpi?.morosos_reales, aging: buckets, nota: "resumen automático del ejecutor (dry-run)", origen: "ejecutor rentas-financiero" };
        await sql`select record_agent_report(${agent.id},'resumen_cobranza_diario',${corte}::date,${'Cobranza diaria · ' + corte},${sql.json(evid)})`;
        detail.resumen_new = 1;
    } else if (mode === "servicios") {
      // Dedup: claves de descuadres de servicio abiertos (casa|servicio|mes|subtipo)
      const svcKeys = new Set<string>();
      for (const p of open) { const e = (p.evidencia || {}) as Record<string, unknown>; if (p.tipo_accion === "conciliacion" && e.tipo === "descuadre_servicio") svcKeys.add([e.casa, e.servicio, e.mes, e.subtipo].join("|")); }
      const found: Array<Record<string, unknown>> = [];
      // "Servicios públicos" es un bundle multi-fila y de alta varianza → se excluye de
      // doble-pago y monto-fuera-de-rango (daba falsos positivos); sí entra en sin-respaldo/vencido.
      const BUNDLE = "Servicios públicos";
      // R3 · pagado dos veces (mismo casa+servicio+mes, >1 fila) — excluye el bundle
      for (const r of await sql`select pp.name casa, e.subcategory servicio, e.billing_ym mes, round(sum(e.amount)) monto, count(*)::int veces
        from pm_expenses e join pm_properties pp on pp.id=e.property_id
        where e.active and e.scope='casa' and e.subcategory is not null and e.subcategory <> ${BUNDLE} and e.billing_ym >= ${corteYm}
        group by 1,2,3 having count(*) > 1`) found.push({ casa: r.casa, servicio: r.servicio, mes: r.mes, subtipo: "pagado_dos_veces", monto: r.monto, detalle: `Pagado ${r.veces} veces el mismo mes (${money(Number(r.monto))} total).` });
      // R2 · monto fuera de rango (>15% vs promedio histórico del servicio/casa) — excluye el bundle
      for (const r of await sql`with hist as (select property_id, subcategory, avg(amount) a, count(*) n from pm_expenses where active and scope='casa' and subcategory is not null and subcategory <> ${BUNDLE} group by 1,2 having count(*)>=3),
        rec as (select property_id, subcategory, billing_ym, sum(amount) amt from pm_expenses where active and scope='casa' and subcategory is not null and subcategory <> ${BUNDLE} and billing_ym >= ${corteYm} group by 1,2,3)
        select pp.name casa, rec.subcategory servicio, rec.billing_ym mes, round(rec.amt) monto, round(hist.a) esperado
        from rec join hist on hist.property_id=rec.property_id and hist.subcategory=rec.subcategory join pm_properties pp on pp.id=rec.property_id
        where abs(rec.amt - hist.a) > 0.15*hist.a`) found.push({ casa: r.casa, servicio: r.servicio, mes: r.mes, subtipo: "monto_fuera_de_rango", monto: r.monto, esperado: r.esperado, detalle: `Pagado ${money(Number(r.monto))} vs promedio ${money(Number(r.esperado))} (>15%).` });
      // R1 · registrado sin respaldo (solo en servicios que SÍ suelen tener respaldo → anomalía real; QB/banco no está en el espejo)
      for (const r of await sql`with tcr as (select subcategory from pm_expenses where active and scope='casa' and subcategory is not null group by 1 having avg(case when invoice_url is not null then 1 else 0 end) > 0.8)
        select pp.name casa, e.subcategory servicio, e.billing_ym mes, round(e.amount) monto
        from pm_expenses e join pm_properties pp on pp.id=e.property_id
        where e.active and e.scope='casa' and e.subcategory in (select subcategory from tcr) and e.invoice_url is null and e.billing_ym >= ${corteYm}`) found.push({ casa: r.casa, servicio: r.servicio, mes: r.mes, subtipo: "sin_respaldo", monto: r.monto, detalle: `Registrado en Airtable sin respaldo de pago (${money(Number(r.monto))}); el servicio suele llevar comprobante.` });
      // R4 · vencido sin pagar — con 1 MES DE LAG: chequea prevYm (mes ya asentado,
      // no el recién cerrado que aún se está cargando) contra recurrencia previa.
      for (const r of await sql`with recur as (select property_id, subcategory from pm_expenses where active and scope='casa' and subcategory is not null and billing_ym >= to_char((current_date - interval '5 month'),'YYYY-MM') and billing_ym < to_char((current_date - interval '2 month'),'YYYY-MM') group by 1,2 having count(distinct billing_ym) >= 2)
        select pp.name casa, recur.subcategory servicio from recur join pm_properties pp on pp.id=recur.property_id
        where not exists (select 1 from pm_expenses e where e.active and e.scope='casa' and e.property_id=recur.property_id and e.subcategory=recur.subcategory and e.billing_ym = ${prevYm})`) found.push({ casa: r.casa, servicio: r.servicio, mes: prevYm, subtipo: "vencido_sin_pagar", detalle: `Servicio recurrente sin pago registrado en ${prevYm}.` });
      // Insertar propuestas (dedup por casa|servicio|mes|subtipo; excluir PadSplit no aplica a gastos)
      detail.detectados = found.length; detail.por_tipo = {};
      for (const f of found) {
        const key = [f.casa, f.servicio, f.mes, f.subtipo].join("|");
        (detail.por_tipo as Record<string, number>)[f.subtipo as string] = ((detail.por_tipo as Record<string, number>)[f.subtipo as string] || 0) + 1;
        const evid = { tipo: "descuadre_servicio", casa: f.casa, servicio: f.servicio, mes: f.mes, subtipo: f.subtipo, monto: f.monto ?? null, esperado: f.esperado ?? null, hallazgo: f.detalle, accion_propuesta: "Revisar en Airtable/QB y corregir el registro del servicio.", fuente: "pm_expenses", origen: "ejecutor rentas-financiero" };
        await recordProposal("conciliacion", { requiere_aprobacion: true, dedup_key: "svc:" + key }, evid);
        svcKeys.add(key);
      }
    } else if (mode === "cierre") {
      // Cierra el MES ANTERIOR (corteYm). Dedup: un borrador por tipo+corte.
      const [ex] = await sql`select id from pm_informes where tipo='financiero_mensual_rentas' and corte=${corteDate} and archived_at is null limit 1`;
      if (ex) { detail.informe = "dedup · ya existe borrador para " + corteYm; skipped++; }
      else {
        // 1) cobrado real vs pactado + ocupación por casa
        const cob = await sql`select pp.name casa, round(coalesce(sum(p.amount),0)) cobrado, round(coalesce(sum(p.renta_pactada),0)) pactado
          from pm_payments p join pm_properties pp on pp.id=p.property_id
          where p.active and p.type='ingreso' and p.status='pagado' and p.billing_ym=${corteYm} group by 1 order by 2 desc`;
        const occ = await sql`select pp.name casa, count(*) filter (where u.status='ocupada')::int ocup, count(*)::int total
          from pm_units u join pm_properties pp on pp.id=u.property_id where u.active group by 1`;
        const occMap: Record<string, { ocup: number; total: number }> = {}; for (const o of occ) occMap[o.casa] = { ocup: o.ocup, total: o.total };
        const s1 = cob.map((c: Record<string, unknown>) => { const o = occMap[c.casa as string] || { ocup: 0, total: 0 }; return { casa: c.casa, cobrado: Number(c.cobrado), pactado: Number(c.pactado), ocupacion_pct: o.total ? Math.round(o.ocup / o.total * 100) : null }; });
        // 2) aging del mes
        const s2 = await sql`select case when mes_mas_viejo>='2026-07' then '0-30' when mes_mas_viejo='2026-06' then '31-60' when mes_mas_viejo<'2026-06' then '60+' else 's/d' end bucket, count(*)::int inquilinos, round(coalesce(sum(vencido_neto),0)) vencido_neto from v_cartera_inquilino where vencido_neto>0 group by 1 order by 1`;
        // 3) gastos por categoría
        const s3 = await sql`select coalesce(subcategory,'(otros)') categoria, round(sum(amount)) monto, count(*)::int n from pm_expenses where active and scope='casa' and billing_ym=${corteYm} group by 1 order by 2 desc`;
        // 4) NOI por casa (corte vs mes anterior)
        const s4 = await sql`with inc as (select property_id, sum(amount) v from pm_payments where active and type='ingreso' and status='pagado' and billing_ym=${corteYm} group by 1),
          exp as (select property_id, sum(amount) v from pm_expenses where active and scope='casa' and billing_ym=${corteYm} group by 1),
          inc0 as (select property_id, sum(amount) v from pm_payments where active and type='ingreso' and status='pagado' and billing_ym=${prevYm} group by 1),
          exp0 as (select property_id, sum(amount) v from pm_expenses where active and scope='casa' and billing_ym=${prevYm} group by 1)
          select pp.name casa, round(coalesce(inc.v,0)-coalesce(exp.v,0)) noi, round(coalesce(inc0.v,0)-coalesce(exp0.v,0)) noi_prev
          from pm_properties pp left join inc on inc.property_id=pp.id left join exp on exp.property_id=pp.id left join inc0 on inc0.property_id=pp.id left join exp0 on exp0.property_id=pp.id
          where inc.v is not null or exp.v is not null order by 2 desc`;
        const tot = { cobrado: s1.reduce((a, x) => a + x.cobrado, 0), pactado: s1.reduce((a, x) => a + x.pactado, 0), gastos: s3.reduce((a: number, x: Record<string, unknown>) => a + Number(x.monto), 0), noi: s4.reduce((a: number, x: Record<string, unknown>) => a + Number(x.noi), 0), vencido_neto: s2.reduce((a: number, x: Record<string, unknown>) => a + Number(x.vencido_neto), 0) };
        const payload = { corte: corteYm, regla: "plata REAL cobrada, no el contrato; depósitos NO son renta", secciones: { cobrado_vs_pactado_ocupacion: s1, aging: s2, gastos_por_categoria: s3, noi_por_casa: s4 }, totales: tot, origen: "ejecutor rentas-financiero", nota: "borrador automático (dry-run) — el PDF se imprime desde el Command Center" };
        await sql`insert into pm_informes (tipo, corte, titulo, estado, origen, payload, generado_por) values ('financiero_mensual_rentas', ${corteDate}, ${"Cierre Financiero Rentas " + corteYm}, 'borrador', 'ejecutor', ${sql.json(payload)}, 'rentas-financiero (agentes_ia_exec)')`;
        created++; detail.informe = "borrador creado para " + corteYm; detail.totales = tot;
      }
    }

    // ── BITÁCORA de la corrida ──
    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte: todayCT(), rol_db: "agentes_ia_exec" })}, ${sql.json({ created, refreshed, skipped, detail, isolation_test: iso })}, 'ok')`;

    return json({ ok: true, mode, created, refreshed, skipped, detail, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
