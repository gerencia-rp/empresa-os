// ════════════════════════════════════════════════════════════════
// 💵 REMODELACIÓN · FINANCIERO — ejecutor autónomo (plata REAL de obra).
// Cadencia: material (semanal) · nómina (quincenal) · anomalías (semanal).
// Lee el espejo remodel_* y ESCRIBE SOLO PROPUESTAS a agent_proposals. NUNCA
// ejecuta un pago: cada ítem queda estado='propuesta' → Nicolás/Alejandra aprueba.
//
// 🔒 SEGURIDAD IMPUESTA POR LA DB: conecta COMO agentes_ia_exec (least-privilege):
//   SELECT en remodel_at_properties/material_payments/worker_hours/crew_rates/
//   projects/overhead + INSERT solo en agent_proposals/agent_audit_log. CERO
//   pm_credentials/PII, CERO update/delete. Test de AISLAMIENTO al arrancar; si
//   algo no diera "permission denied", ABORTA sin escribir.
//
// Disciplina anti-falso-positivo (lección de servicios): doble-pago solo >=$200,
//   sobre-costo SOLO en Finalizado o proporcional al avance (nunca obra en curso
//   contra costo total), depósitos/draws != utilidad, no inventa categoría/rate.
//
// Kill switch: agent_registry.enabled (Financiero Remodelacion). Dedup por corte.
// Modos (?mode=): material | nomina | anomalias | run(=material)
// Deploy: npx supabase functions deploy remod-financiero
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
  if (mode === "run") mode = "material";

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();
    const [{ corte }] = await sql`select date_trunc('week', (now() at time zone 'America/Chicago'))::date::text as corte`;
    // quincena: 1ª (día<=15) o 2ª del mes en curso
    const [{ quincena }] = await sql`select to_char((now() at time zone 'America/Chicago'),'YYYY-MM') || case when extract(day from (now() at time zone 'America/Chicago'))<=15 then '-Q1' else '-Q2' end as quincena`;

    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Financiero Remodelacion' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Financiero Remodelacion'" }, 404);
    if (agent.enabled === false) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, accion: "skip" })}, ${sql.json({ reason: "kill switch OFF" })}, 'skipped')`;
      return json({ ok: true, skipped: "disabled", mode });
    }

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

    if (mode === "material") {
      // RF3 doble-pago (>=200) + RF5 sin categoría
      const k1 = "remodf:matdup:" + corte, k2 = "remodf:sincat:" + corte;
        const dup = await sql`with d as (select property_id, categoria, fecha, precio::numeric precio, count(*) c
            from remodel_material_payments where active is not false and precio is not null
            group by 1,2,3,4 having count(*)>1)
          select count(*) filter (where precio>=200)::int grupos, round(coalesce(sum((c-1)*precio) filter (where precio>=200),0)) monto,
                 count(*) filter (where precio<200)::int ruido from d`;
        const g = dup[0];
        if (Number(g.grupos) > 0) {
          const payload = { requiere_aprobacion: true, accion: "revisar_doble_pago_material", dedup_key: k1, monto_en_riesgo: Number(g.monto), severidad: "alto" };
          const evid = { tipo: "descuadre_material", regla: "RF3 doble-pago", grupos_alto_precio: Number(g.grupos), monto_en_riesgo: Number(g.monto), grupos_ruido_ignorados: Number(g.ruido), hallazgo: `${g.grupos} grupos de material con misma casa+categoria+fecha+precio (>=$200), ${money(Number(g.monto))} en riesgo. ${g.ruido} grupos <$200 NO marcados (anti-ruido).`, fuente: "remodel_material_payments", origen: "ejecutor remod-financiero" };
          await recordProposal("conciliacion", payload, evid);
          detail.doble_pago = `${g.grupos} grupos / ${money(Number(g.monto))}`;
        } else { detail.doble_pago = "sin hallazgos"; }
        const [sc] = await sql`select count(*)::int n from remodel_material_payments where active is not false and (categoria is null or btrim(categoria)='')`;
        if (Number(sc.n) > 0) {
          const payload = { requiere_aprobacion: true, accion: "categorizar_gastos", dedup_key: k2, severidad: "medio" };
          const evid = { tipo: "higiene", regla: "RF5 sin categoría", pagos_sin_categoria: Number(sc.n), hallazgo: `${sc.n} pagos de material sin categoría — taggear en Airtable (no inventar).`, fuente: "remodel_material_payments", origen: "ejecutor remod-financiero" };
          await recordProposal("conciliacion", payload, evid);
          detail.sin_categoria = Number(sc.n);
        } else { detail.sin_categoria = "sin hallazgos"; }
    } else if (mode === "nomina") {
      const k = "remodf:nomina:" + quincena;
        // horas sin rate en la quincena (nómina mal calculada) — NO inventa rate
        const [wh] = await sql`select count(*)::int filas, count(distinct worker)::int workers, round(coalesce(sum(horas),0)) horas
          from remodel_worker_hours where rate_hora is null and fecha >= (case when extract(day from current_date)<=15 then date_trunc('month',current_date) else date_trunc('month',current_date)+interval '15 day' end)`;
        // total quincena (horas × rate) para armar la nómina
        const [tot] = await sql`select round(coalesce(sum(horas*rate_hora),0)) bruto, count(distinct worker)::int workers
          from remodel_worker_hours where rate_hora is not null and fecha >= (case when extract(day from current_date)<=15 then date_trunc('month',current_date) else date_trunc('month',current_date)+interval '15 day' end)`;
        const payload = { requiere_aprobacion: true, accion: "armar_nomina_quincena", dedup_key: k, bruto: Number(tot.bruto), severidad: Number(wh.filas) > 0 ? "alto" : "info" };
        const evid = { tipo: "nomina", regla: "RF4", quincena, bruto_calculado: Number(tot.bruto), workers: Number(tot.workers), filas_sin_rate: Number(wh.filas), workers_sin_rate: Number(wh.workers), horas_sin_rate: Number(wh.horas), hallazgo: Number(wh.filas) > 0 ? `${wh.filas} filas sin rate (${wh.workers} trabajadores) — deuda mal calculada; cargar la tarifa en Personal en Campo antes de pagar. No se inventa rate.` : "0 horas sin rate: nómina lista para revisión.", nota: "ejecutar el pago = aprueba humano", fuente: "remodel_worker_hours + remodel_crew_rates", origen: "ejecutor remod-financiero" };
        await recordProposal("nomina", payload, evid);
        detail.nomina = `bruto ${money(Number(tot.bruto))}, ${wh.filas} sin rate`;
    } else if (mode === "anomalias") {
      const k = "remodf:anomalias:" + corte;
        // RF1 clase Capps: monto cargado alto con gastos placeholder redondos (>=50000 exactos), Finalizado
        const capps = await sql`select address, monto_real::numeric mr, gasto_materiales::numeric gm, gasto_trabajadores::numeric gt
          from remodel_at_properties where active is not false and proceso='Finalizado'
            and gasto_materiales::numeric>=50000 and gasto_materiales::numeric=gasto_trabajadores::numeric
            and (gasto_materiales::numeric % 1000)=0`;
        // RF2 en curso con utilidad computada (inflada)
        const infl = await sql`select address from remodel_at_properties where active is not false and proceso<>'Finalizado' and utilidad_remodelacion is not null`;
        // utilidad signo opuesto (con Draws vs limpia)
        const conf = await sql`select address from remodel_at_properties where active is not false and proceso='Finalizado' and ganancia is not null and utilidad_remodelacion is not null and sign(ganancia::numeric)<>sign(utilidad_remodelacion::numeric)`;
        // obras finalizadas en pérdida (utilidad limpia < -50)
        const perd = await sql`select address, round(utilidad_remodelacion::numeric) u from remodel_at_properties where active is not false and proceso='Finalizado' and utilidad_remodelacion::numeric < -50 order by 2`;
        const evid = { tipo: "anomalias_carga", regla: "RF1/RF2/RF7", corte, carga_placeholder_capps_class: capps.map((r: Record<string, unknown>) => ({ casa: r.address, monto_real: Number(r.mr), gastos_placeholder: `${money(Number(r.gm))}/${money(Number(r.gt))}` })), utilidad_inflada_en_curso: infl.map((r: Record<string, unknown>) => r.address), utilidad_signo_opuesto: conf.map((r: Record<string, unknown>) => r.address), obras_en_perdida_real: perd.map((r: Record<string, unknown>) => ({ casa: r.address, utilidad: Number(r.u) })), nota: "plata real, no contrato; depósitos/draws != utilidad; obra en curso NO se marca por costo total (RF7)", fuente: "remodel_at_properties", origen: "ejecutor remod-financiero" };
        await recordProposal("conciliacion", { requiere_aprobacion: true, accion: "revisar_anomalias_carga", dedup_key: k }, evid);
        detail.anomalias = { placeholder: capps.length, en_curso_inflada: infl.length, signo_opuesto: conf.length, en_perdida: perd.length };
    } else {
      return json({ ok: false, error: "modo inválido: " + mode }, 400);
    }

    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte, quincena, rol_db: "agentes_ia_exec" })}, ${sql.json({ created, refreshed, skipped, detail, isolation_test: iso })}, 'ok')`;
    return json({ ok: true, mode, corte, created, refreshed, skipped, detail, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
