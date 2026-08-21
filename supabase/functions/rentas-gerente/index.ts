// ════════════════════════════════════════════════════════════════
// 🧭 RENTAS · GERENTE — la cabeza de la escuadra (consolida, no re-hace).
// Corre 07:30 Austin (después de los 4 ejecutores, antes del brief 07:45).
// Lee la cola de las 4 líneas (Financiero/Ejecución/Reportes/Optimización) y
// produce UNA foto ejecutiva: estado + top 3 decisiones + cola priorizada,
// cada punto CITANDO el agente que lo originó. SOLO LEE: cero acción autónoma,
// cero propuestas de plata propias. La foto es un borrador en pm_informes.
//
// 🔒 SEGURIDAD IMPUESTA POR LA DB (no por código):
//   Conecta COMO `agentes_ia_exec` (least-privilege): SELECT en el espejo +
//   INSERT solo en pm_informes/agent_audit_log. CERO pm_credentials/PII, CERO
//   update/delete. Test de AISLAMIENTO al arrancar; si algo no diera denied, ABORTA.
//
// Fidelidad: NO inventa (solo consolida lo que los otros produjeron) y NO dropea
//   (incluye las 4 líneas). Prioriza lo crítico arriba.
//
// Kill switch: agent_registry.enabled (Gerente de Rentas). Dedup por corte (día).
// Auth HTTP: bearer = SERVICE_KEY (cron) o admin JWT.
// Modo (?mode=): foto | run(=foto)
// Deploy: npx supabase functions deploy rentas-gerente
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

// Severidad + orden de la cola por tipo de propuesta (crítico arriba).
const SEV: Record<string, { w: number; s: string; label: string }> = {
  recordatorio_cobro: { w: 1, s: "critico", label: "cobranza de mora" },
  plan_ocupacion: { w: 1, s: "critico", label: "plan de ocupación / turnover" },
  conciliacion: { w: 2, s: "medio", label: "descuadres de conciliación" },
  nudge: { w: 2, s: "medio", label: "tareas vencidas / sin dueño" },
  cuello_botella: { w: 3, s: "medio", label: "rebalanceo de cuellos" },
  precio_dinamico: { w: 5, s: "info", label: "precio dinámico" },
  informe: { w: 6, s: "info", label: "informe automático" },
};

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
  if (mode === "run") mode = "foto";
  if (mode !== "foto") return json({ ok: false, error: "modo inválido: " + mode }, 400);

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();
    const [{ corte }] = await sql`select (now() at time zone 'America/Chicago')::date::text as corte`; // foto diaria

    // agent + KILL SWITCH
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Gerente de Rentas' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe el agente 'Gerente de Rentas'" }, 404);
    if (agent.enabled === false) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte, accion: "skip" })}, ${sql.json({ reason: "kill switch OFF" })}, 'skipped')`;
      return json({ ok: true, skipped: "disabled", mode });
    }

    // AISLAMIENTO
    const iso: Record<string, string> = {};
    try { await sql`select 1 as x from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; }
    catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    try { await sql`select document_id from pm_tenants limit 1`; iso.pm_tenants_document_id = "LEAK"; }
    catch (e) { iso.pm_tenants_document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    if (!(iso.pm_credentials.startsWith("PASS") && iso.pm_tenants_document_id.startsWith("PASS"))) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, accion: "abort" })}, ${sql.json({ isolation_test: iso, motivo: "el rol pudo leer credenciales/PII — ABORT" })}, 'ABORT')`;
      return json({ ok: false, aborted: true, isolation_test: iso }, 500);
    }

    // ── CONSOLIDACIÓN de las 4 líneas (solo lectura) ──
    // (1) cola abierta agrupada por agente + tipo (con $ de cobros)
    const queue = await sql`
      select ar.nombre agente, ap.tipo_accion tipo, count(*)::int n,
             round(coalesce(sum((ap.evidencia->>'monto_vencido_neto')::numeric),0)) monto
      from agent_proposals ap join agent_registry ar on ar.id=ap.agent_id
      where ar.linea='Rentas' and ar.nombre<>'Gerente de Rentas' and ap.estado='propuesta' and ap.deleted_at is null
      group by 1,2`;
    // (2) cartera (Financiero)
    const [kpi] = await sql`select vencido_neto, morosos_reales, por_cobrar_neto from v_cartera_kpi`;
    // (3) ocupación (Reportes)
    const [rep] = await sql`select payload->'total'->>'pct' pct, corte::text corte from pm_informes where tipo='ocupacion_semanal_rentas' and archived_at is null order by corte desc limit 1`;
    // (4) plan + cuello (Optimización)
    const [plan] = await sql`select (payload->>'recuperacion_potencial_mes')::numeric recuperable from agent_proposals ap join agent_registry ar on ar.id=ap.agent_id where ar.nombre='Optimización Rentas' and ap.tipo_accion='plan_ocupacion' and ap.estado='propuesta' and ap.deleted_at is null limit 1`;
    const [cue] = await sql`select evidencia->'hallazgos'->0 top from agent_proposals ap join agent_registry ar on ar.id=ap.agent_id where ar.nombre='Optimización Rentas' and ap.tipo_accion='cuello_botella' and ap.estado='propuesta' and ap.deleted_at is null limit 1`;

    const ocupPct = rep?.pct != null ? Number(rep.pct) : null;
    const vencido = Number(kpi?.vencido_neto || 0);
    const recuperable = Number(plan?.recuperable || 0);
    const descuadres = queue.find((q: Record<string, unknown>) => q.tipo === "conciliacion");
    const cobros = queue.find((q: Record<string, unknown>) => q.tipo === "recordatorio_cobro");
    const nudges = queue.find((q: Record<string, unknown>) => q.tipo === "nudge");
    const topCuello = (cue?.top || null) as Record<string, unknown> | null;

    // ── ESTADO (semáforo), cada punto con su fuente ──
    const estado: Array<Record<string, unknown>> = [];
    if (ocupPct != null) estado.push({ sev: ocupPct < 90 ? "critico" : ocupPct < 95 ? "medio" : "ok", metrica: "Ocupación", valor: ocupPct + "%", nota: `corte ${rep?.corte}`, fuente: "Reportes Rentas" });
    estado.push({ sev: vencido > 10000 ? "critico" : vencido > 0 ? "medio" : "ok", metrica: "Mora (vencido neto)", valor: money(vencido), nota: `${kpi?.morosos_reales} inquilinos`, fuente: "Financiero Rentas" });
    if (descuadres) estado.push({ sev: "medio", metrica: "Descuadres de carga", valor: String(descuadres.n), nota: "conciliación en Airtable", fuente: "Financiero Rentas" });
    if (topCuello) estado.push({ sev: "medio", metrica: "Cuello operativo", valor: `${topCuello.persona}: ${topCuello.abiertas} abiertas`, nota: String(topCuello.senal || ""), fuente: "Optimización Rentas" });
    if (recuperable > 0) estado.push({ sev: "ok", metrica: "Oportunidad de ocupación", valor: money(recuperable) + "/mes", nota: "llenar vacantes reales", fuente: "Optimización Rentas" });

    // ── TOP 3 DECISIONES (accionable) ──
    const decisiones: Array<Record<string, unknown>> = [];
    if (cobros && vencido > 0) decisiones.push({ prioridad: "critico", decision: `Aprobar la tanda de cobranza: ${cobros.n} recordatorios por ${money(vencido)} vencido neto`, requiere: "tu OK para enviar (los borradores están listos)", fuente: "Financiero Rentas" });
    if (recuperable > 0) decisiones.push({ prioridad: "critico", decision: `Cerrar turnover y llenar vacantes → recuperar ${money(recuperable)}/mes (ocupación ${ocupPct}%→meta 96%)`, requiere: "fijar fecha/recursos de turnover", fuente: "Optimización Rentas" });
    if (topCuello) decisiones.push({ prioridad: "medio", decision: `Resolver el cuello operativo: ${topCuello.persona} (${topCuello.abiertas} abiertas${topCuello.dias_prom ? ", " + topCuello.dias_prom + "d prom" : ""})`, requiere: "redistribuir / asignar dueño al backlog", fuente: "Optimización Rentas · Ejecución Rentas" });
    if (decisiones.length < 3 && descuadres) decisiones.push({ prioridad: "medio", decision: `Revisar ${descuadres.n} descuadres de conciliación (incl. Marlin)`, requiere: "corrección en Airtable", fuente: "Financiero Rentas" });
    const top3 = decisiones.slice(0, 3);

    // ── COLA PRIORIZADA (qué aprobar primero) ──
    const cola = queue
      .map((q: Record<string, unknown>) => {
        const meta = SEV[q.tipo as string] || { w: 4, s: "medio", label: q.tipo as string };
        return { severidad: meta.s, orden_w: meta.w, agente: q.agente, tipo: q.tipo, item: meta.label, n: Number(q.n), monto: Number(q.monto) || null };
      })
      .sort((a, b) => a.orden_w - b.orden_w || (b.monto || 0) - (a.monto || 0))
      .map((r, i) => ({ orden: i + 1, ...r, orden_w: undefined }));

    const payload = {
      corte,
      titulo: "Foto Ejecutiva — Rentas",
      estado,
      top_3_decisiones: top3,
      cola_priorizada: cola,
      resumen: { ocupacion_pct: ocupPct, vencido_neto: vencido, por_cobrar_neto: Number(kpi?.por_cobrar_neto || 0), recuperable_ocupacion_mes: recuperable, propuestas_en_cola: cola.reduce((a, x) => a + x.n, 0) },
      fidelidad: "consolida las 4 líneas (Financiero/Ejecución/Reportes/Optimización); cada punto cita su agente; nada inventado, nada dropeado",
      regla: "el Gerente SOLO LEE — cero acción autónoma, cero propuestas de plata propias",
      origen: "ejecutor rentas-gerente (agentes_ia_exec)",
    };

    let created = 0, skipped = 0;
    const [ex] = await sql`select id from pm_informes where tipo='foto_ejecutiva_rentas' and corte=${corte} and archived_at is null limit 1`;
    if (ex) { skipped++; }
    else {
      await sql`insert into pm_informes (tipo, corte, titulo, estado, origen, payload, generado_por) values ('foto_ejecutiva_rentas', ${corte}, ${"Foto Ejecutiva Rentas " + corte}, 'borrador', 'ejecutor', ${sql.json(payload)}, 'rentas-gerente (agentes_ia_exec)')`;
      created++;
    }

    const preview = { estado_n: estado.length, top3: top3.map((d) => d.decision), cola_top: cola.slice(0, 3), resumen: payload.resumen };
    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ created, skipped, preview, isolation_test: iso })}, 'ok')`;
    return json({ ok: true, mode, corte, created, skipped, preview, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
