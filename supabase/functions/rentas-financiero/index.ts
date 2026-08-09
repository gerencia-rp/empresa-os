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
    const cobroKeys = new Set<string>(), descKeys = new Set<string>(), resKeys = new Set<string>();
    for (const p of open) {
      const e = (p.evidencia || {}) as Record<string, unknown>;
      if (p.tipo_accion === "recordatorio_cobro") cobroKeys.add(((e.casa as string) || "") + "|" + ((e.inquilino as string) || ""));
      if (p.tipo_accion === "conciliacion") descKeys.add((e.casa as string) || "");
      if (p.tipo_accion === "informe" && e.tipo === "resumen_cobranza_diario") resKeys.add((e.corte as string) || "");
    }

    let created = 0, skipped = 0;
    const detail: Record<string, unknown> = { cobros_new: 0, cobros_skip: 0, descuadres_new: 0, descuadres_skip: 0, resumen_new: 0, resumen_skip: 0 };

    if (mode === "cobros") {
      // (a) COBROS — morosos con vencido neto > 0
      const morosos = await sql`select tenant_id, inquilino, casa, vencido_neto, mes_mas_viejo, aging from v_cartera_inquilino where vencido_neto > 0 order by vencido_neto desc`;
      for (const m of morosos) {
        const key = (m.casa || "") + "|" + (m.inquilino || "");
        if (cobroKeys.has(key)) { skipped++; (detail.cobros_skip as number)++; continue; }
        const payload = { canal: "whatsapp/email", monto: m.vencido_neto, requiere_aprobacion: true, accion: "enviar_recordatorio", dedup_key: "cobro:" + key };
        const evid = { tipo: "recordatorio_cobro", inquilino: m.inquilino, casa: m.casa, monto_vencido_neto: m.vencido_neto, aging: m.aging, borrador: `Hola ${firstName(m.inquilino)}, te escribimos de Rental Profits por la renta pendiente de ${m.casa}. Saldo vencido: ${money(m.vencido_neto)}. ¿Coordinamos el pago o un plan? Gracias.`, nota: "DRY-RUN: NO enviar, aprueba Nicolás", fuente: "v_cartera_inquilino", origen: "ejecutor rentas-financiero" };
        await sql`insert into agent_proposals (agent_id, tipo_accion, estado, payload, evidencia) values (${agent.id}, 'recordatorio_cobro', 'propuesta', ${sql.json(payload)}, ${sql.json(evid)})`;
        created++; (detail.cobros_new as number)++; cobroKeys.add(key);
      }

      // (b) DESCUADRES — mismo inquilino + mismo mes con >1 fila (fractura/carga cruzada), excluye plataformas
      const frac = await sql`
        select t.full_name as inquilino, p.casa as casa, sum(p.cnt-1) as filas_extra, count(*) as meses
        from (select tenant_id, casa_nickname as casa, billing_ym, count(*) cnt from pm_payments where active and tenant_id is not null group by 1,2,3 having count(*) > 1) p
        join pm_tenants t on t.id=p.tenant_id
        where t.full_name !~* 'pad ?s?split'
        group by 1,2 order by 3 desc`;
      for (const d of frac) {
        if (descKeys.has(d.casa)) { skipped++; (detail.descuadres_skip as number)++; continue; }
        const payload = { requiere_aprobacion: true, accion: "consolidar_filas_airtable", dedup_key: "descuadre:" + d.casa };
        const evid = { tipo: "descuadre", casa: d.casa, inquilino: d.inquilino, filas_extra: Number(d.filas_extra), meses: Number(d.meses), hallazgo: `Renta de ${d.inquilino} fracturada en ${d.filas_extra} filas extra a lo largo de ${d.meses} mes(es) — carga cruzada/doble-conteo. renta_pactada inconsistente entre filas.`, accion_propuesta: "Consolidar las filas por mes y normalizar renta_pactada en Airtable.", fuente: "pm_payments", origen: "ejecutor rentas-financiero" };
        await sql`insert into agent_proposals (agent_id, tipo_accion, estado, payload, evidencia) values (${agent.id}, 'conciliacion', 'propuesta', ${sql.json(payload)}, ${sql.json(evid)})`;
        created++; (detail.descuadres_new as number)++; descKeys.add(d.casa);
      }

      // (c) RESUMEN DE COBRANZA DEL DÍA (dedup por corte)
      const corte = todayCT();
      if (!resKeys.has(corte)) {
        const [kpi] = await sql`select * from v_cartera_kpi`;
        const buckets = await sql`select case when mes_mas_viejo>='2026-07' then '0-30' when mes_mas_viejo='2026-06' then '31-60' when mes_mas_viejo<'2026-06' then '60+' else 's/d' end b, count(*) n, coalesce(sum(vencido_neto),0) v from v_cartera_inquilino where vencido_neto>0 group by 1`;
        const evid = { tipo: "resumen_cobranza_diario", corte, vencido_neto_total: kpi?.vencido_neto, pendiente_neto_total: kpi?.pendiente_neto_total, morosos_reales: kpi?.morosos_reales, aging: buckets, nota: "resumen automático del ejecutor (dry-run)", origen: "ejecutor rentas-financiero" };
        await sql`insert into agent_proposals (agent_id, tipo_accion, estado, payload, evidencia) values (${agent.id}, 'informe', 'propuesta', ${sql.json({ tipo: "resumen_cobranza_diario", corte })}, ${sql.json(evid)})`;
        created++; (detail.resumen_new as number)++;
      } else { skipped++; (detail.resumen_skip as number)++; }
    } else if (mode === "servicios") {
      detail.nota = "mode=servicios: conciliación de pagos de servicios Airtable↔QB — pendiente de reglas finas; sin escrituras esta versión";
    } else if (mode === "cierre") {
      detail.nota = "mode=cierre: informe financiero mensual — pendiente de plantilla; sin escrituras esta versión";
    }

    // ── BITÁCORA de la corrida ──
    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte: todayCT(), rol_db: "agentes_ia_exec" })}, ${sql.json({ created, skipped, detail, isolation_test: iso })}, 'ok')`;

    return json({ ok: true, mode, created, skipped, detail, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
