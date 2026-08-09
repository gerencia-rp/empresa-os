// ════════════════════════════════════════════════════════════════
// 📈 RENTAS · OPTIMIZACIÓN — ejecutor autónomo (que la operación mejore).
// Corre en cadencia (revisión diaria / precio semanal / mejora mensual),
// lee el espejo y ESCRIBE SOLO PROPUESTAS a agent_proposals (y el informe
// mensual a pm_informes). NUNCA aplica un cambio de precio ni mueve una tarea:
// cada ítem queda estado='propuesta' → un humano confirma.
//
// 🔒 SEGURIDAD IMPUESTA POR LA DB (no por código):
//   NO usa el service role para las queries. Abre una conexión Postgres COMO el
//   rol `agentes_ia_exec` (least-privilege): SELECT solo en el espejo
//   (v_ocupacion, pm_units, pm_properties, pm_payments, v_cartera_kpi,
//   clickup_tasks_mirror, pm_informes, agent_proposals/registry) + INSERT solo
//   en agent_proposals/pm_informes/agent_audit_log. CERO pm_credentials, CERO
//   document_id/rent_amount (PII), CERO update/delete. Si el código tuviera un
//   bug, la DB rechaza (permission denied).
//   Al arrancar corre un TEST DE AISLAMIENTO; si algo NO diera denied, ABORTA.
//
// Disciplina anti-falso-positivo (lección de servicios): precios SIEMPRE contra
//   la MEDIANA POR SUBMERCADO (ciudad), y se EXCLUYEN las casas de plataforma
//   (Airbnb/PadSplit, alta varianza). Nunca un ajuste sin fundamento.
//
// Kill switch: agent_registry.enabled (Optimización Rentas). off = no corre.
// Idempotente: dedup por CORTE (lunes de la semana / 1º de mes).
//
// Auth HTTP: bearer = SERVICE_KEY (cron) o admin JWT. (Distinto del rol DB.)
// Modos (?mode=): diaria | semanal | mensual | run(=diaria)
// Deploy: npx supabase functions deploy rentas-optimizacion
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
  if (mode === "run") mode = "diaria";

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();
    const [{ corte }] = await sql`select date_trunc('week', (now() at time zone 'America/Chicago'))::date::text as corte`; // lunes ISO
    const [{ mes }] = await sql`select date_trunc('month', (now() at time zone 'America/Chicago'))::date::text as mes`;

    // agent + KILL SWITCH
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Optimización Rentas' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe el agente 'Optimización Rentas'" }, 404);
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
    const isoPass = iso.pm_credentials.startsWith("PASS") && iso.pm_tenants_document_id.startsWith("PASS");
    if (!isoPass) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, accion: "abort" })}, ${sql.json({ isolation_test: iso, motivo: "el rol pudo leer credenciales/PII — ABORT" })}, 'ABORT')`;
      return json({ ok: false, aborted: true, isolation_test: iso }, 500);
    }

    // DEDUP: propuestas abiertas del agente por dedup_key
    const open = await sql`select payload->>'dedup_key' k from agent_proposals where agent_id=${agent.id} and estado='propuesta' and deleted_at is null`;
    const keys = new Set<string>(open.map((r: Record<string, unknown>) => r.k as string).filter(Boolean));

    let created = 0, skipped = 0;
    const detail: Record<string, unknown> = {};
    const preview: Record<string, unknown> = {};

    // ── helper: plan de ocupación (usado en diaria y mensual) ──
    async function planOcupacion() {
      const [tot] = await sql!`select ocupacion_pct, ocupadas, unidades_rentables from v_ocupacion`;
      const vac = await sql!`select pp.name casa, un.name unidad, un.unit_type, un.status, un.target_rent::numeric tr
        from pm_units un join pm_properties pp on pp.id=un.property_id
        where un.active and pp.active and un.external_id like 'unit-rec%' and un.unit_type is not null and un.status<>'ocupada'
        order by un.status, pp.name`;
      const porCasa: Record<string, { casa: string; unidades: string[]; potencial: number; estados: Set<string> }> = {};
      for (const v of vac) {
        const o = (porCasa[v.casa] ||= { casa: v.casa, unidades: [], potencial: 0, estados: new Set() });
        o.unidades.push(`${v.unidad} (${v.status}, ${money(Number(v.tr))})`);
        o.potencial += Number(v.tr || 0); o.estados.add(v.status);
      }
      const hip = (est: Set<string>) => est.has("mantenimiento") ? "turnover no cerrado" : est.has("disponible") ? "no es precio (a mercado) → listing/demanda" : "reservada (pipeline)";
      const paso = (est: Set<string>) => est.has("mantenimiento") ? "fijar fecha fin de turnover y listar" : est.has("disponible") ? "verificar publicación activa, fotos y días vacante" : "confirmar fecha de move-in; sin acción de precio";
      const plan = Object.values(porCasa).sort((a, b) => b.potencial - a.potencial).map((c) => ({ casa: c.casa, unidades: c.unidades, potencial_mes: c.potencial, hipotesis: hip(c.estados), siguiente_paso: paso(c.estados), prioridad: c.estados.has("reservada") && c.estados.size === 1 ? "BAJA" : c.potencial >= 3000 ? "ALTA" : "MEDIA" }));
      const recuperable = plan.filter((p) => p.prioridad !== "BAJA").reduce((a, x) => a + x.potencial_mes, 0);
      return { tot, vac_n: vac.length, plan, recuperable };
    }

    // ── helper: cuellos de botella ──
    async function cuellos() {
      const rows = await sql!`select coalesce(nullif(primary_assignee,''),'(sin dueño)') persona,
        count(*)::int abiertas, round(avg(extract(epoch from (now()-date_created))/86400))::int dias_prom,
        count(*) filter (where due_date is not null and due_date < now())::int vencidas
        from clickup_tasks_mirror where active and coalesce(status_type,'') not in ('done','closed') and date_done is null and date_closed is null
        group by 1 order by abiertas desc`;
      const hall: Array<Record<string, unknown>> = [];
      for (const r of rows) {
        const p = r.persona as string, ab = Number(r.abiertas), dp = Number(r.dias_prom), vc = Number(r.vencidas);
        if (p === "(sin dueño)" && ab >= 100) hall.push({ persona: p, abiertas: ab, dias_prom: dp, senal: "backlog sin asignar — falta de ruteo/proceso (cuello estructural)" });
        else if (p !== "(sin dueño)" && (ab >= 80 || dp >= 90)) hall.push({ persona: p, abiertas: ab, dias_prom: dp, vencidas: vc, senal: dp >= 120 ? "sobrecargado + tareas añejas (>4 meses prom)" : "carga alta" });
        else if (p !== "(sin dueño)" && vc >= 15) hall.push({ persona: p, abiertas: ab, vencidas: vc, senal: "foco de tareas vencidas" });
      }
      return hall;
    }

    if (mode === "diaria") {
      // (a) PLAN DE OCUPACIÓN (dedup por semana)
      const ok = "opt:ocup:" + corte;
      if (keys.has(ok)) { skipped++; detail.ocupacion = "dedup"; }
      else {
        const po = await planOcupacion();
        const payload = { requiere_aprobacion: true, accion: "plan_ocupacion", dedup_key: ok, ocupacion_actual_pct: Number(po.tot?.ocupacion_pct), meta_pct: 96, recuperacion_potencial_mes: po.recuperable };
        const evid = { tipo: "plan_ocupacion", corte, fuente: "v_ocupacion + pm_units + pm_informes(Reportes)", unidades_no_ocupadas: po.vac_n, plan_por_casa: po.plan, impacto: `llenar las vacantes reales recupera ${money(po.recuperable)}/mes potencial`, nota: "DRY-RUN: nada aplicado", origen: "ejecutor rentas-optimizacion" };
        await sql`insert into agent_proposals (agent_id, tipo_accion, estado, payload, evidencia) values (${agent.id}, 'plan_ocupacion', 'propuesta', ${sql.json(payload)}, ${sql.json(evid)})`;
        created++; detail.ocupacion = "creada"; preview.ocupacion = { pct: payload.ocupacion_actual_pct, recuperable: po.recuperable, casas: po.plan.length };
      }
      // (b) CUELLOS (dedup por semana)
      const ck = "opt:cuello:" + corte;
      if (keys.has(ck)) { skipped++; detail.cuellos = "dedup"; }
      else {
        const hall = await cuellos();
        const [kpi] = await sql`select vencido_neto, morosos_reales from v_cartera_kpi`;
        const payload = { requiere_aprobacion: true, accion: "rebalanceo_operativo", dedup_key: ck };
        const evid = { tipo: "cuello_botella", corte, fuente: "clickup_tasks_mirror", hallazgos: hall, contexto_cobranza: { vencido_neto: Number(kpi?.vencido_neto), morosos_reales: Number(kpi?.morosos_reales), fuente: "v_cartera_kpi (Financiero)" }, nota: "DRY-RUN: señalamiento, nada movido", origen: "ejecutor rentas-optimizacion" };
        await sql`insert into agent_proposals (agent_id, tipo_accion, estado, payload, evidencia) values (${agent.id}, 'cuello_botella', 'propuesta', ${sql.json(payload)}, ${sql.json(evid)})`;
        created++; detail.cuellos = "creada"; preview.cuellos = hall.length;
      }
    } else if (mode === "semanal") {
      // PRECIO DINÁMICO — mediana por SUBMERCADO + exclusión de plataforma
      const pk = "opt:precio:" + corte;
      if (keys.has(pk)) { skipped++; detail.precio = "dedup"; }
      else {
        const SUB = sql`(case when pp.name ~* 'Marlin' then 'Marlin' when pp.name ~* 'Round Rock' then 'Round Rock' else 'Austin' end)`;
        const rows = await sql`
          with anch as (
            select (case when pp.name ~* 'Marlin' then 'Marlin' when pp.name ~* 'Round Rock' then 'Round Rock' else 'Austin' end) sub, un.unit_type,
              percentile_cont(0.5) within group (order by un.target_rent::numeric) med, count(*)::int n
            from pm_units un join pm_properties pp on pp.id=un.property_id
            where un.active and pp.active and un.external_id like 'unit-rec%' and un.unit_type is not null and un.target_rent::numeric>0
            group by 1,2),
          plat as (select distinct property_id from pm_payments where active and platform ~* 'airbnb|padsplit')
          select pp.name casa, ${SUB} sub, un.name unidad, un.unit_type, un.status, un.target_rent::numeric tr,
            a.med, a.n, (un.property_id in (select property_id from plat)) es_plataforma
          from pm_units un join pm_properties pp on pp.id=un.property_id
          join anch a on a.sub=${SUB} and a.unit_type=un.unit_type
          where un.active and pp.active and un.external_id like 'unit-rec%' and un.unit_type is not null and un.target_rent::numeric>0`;
        const propuestas: Array<Record<string, unknown>> = [];
        const rechazados: Array<Record<string, unknown>> = [];
        for (const r of rows) {
          const tr = Number(r.tr), med = Number(r.med), n = Number(r.n), dev = med ? (tr - med) / med : 0;
          const devPct = Math.round(dev * 1000) / 10;
          const base = { casa: r.casa, unidad: r.unidad, submercado: r.sub, ask_actual: tr, mediana_submercado: med, desvio_pct: devPct };
          if (r.es_plataforma) {
            if (Math.abs(dev) > 0.15) rechazados.push({ ...base, por_que: "casa de plataforma (Airbnb/PadSplit) — renta multi-canal de alta varianza, EXCLUIDA (lección servicios)" });
            continue;
          }
          if (r.status !== "ocupada" && dev > 0.10) {
            if (n >= 3) propuestas.push({ ...base, tipo: "bajar_precio_vacante", confianza: "MEDIA", recomendacion: `vacante ${devPct}% sobre mediana de submercado → bajar hacia ${money(med)} para llenar` });
            else propuestas.push({ ...base, tipo: "bajar_precio_vacante", confianza: "BAJA (n<3)", recomendacion: `revisar ask al re-listar (muestra chica en el submercado)` });
          } else if (r.status === "ocupada" && dev < -0.15 && n >= 3) {
            propuestas.push({ ...base, tipo: "subir_al_vencimiento", confianza: "MEDIA", recomendacion: `${Math.abs(devPct)}% bajo mediana de submercado → ajustar al vencimiento hacia ${money(med)}, tope CPI +3–5%` });
          } else if (r.status === "ocupada" && dev < -0.15 && n < 3) {
            rechazados.push({ ...base, por_que: "muestra chica en el submercado (n<3) — no proponer sin más comps" });
          }
        }
        const payload = { requiere_aprobacion: true, accion: "revisar_precio", dedup_key: pk, propuestas_n: propuestas.length, rechazados_n: rechazados.length };
        const evid = { tipo: "precio_dinamico", corte, metodo: "mediana por SUBMERCADO (ciudad) + exclusión de plataformas (Airbnb/PadSplit). Nunca promedio blended.", propuestas, falsos_positivos_rechazados: rechazados, nota: "DRY-RUN: nada aplicado; los cambios de precio los confirma un humano", origen: "ejecutor rentas-optimizacion" };
        await sql`insert into agent_proposals (agent_id, tipo_accion, estado, payload, evidencia) values (${agent.id}, 'precio_dinamico', 'propuesta', ${sql.json(payload)}, ${sql.json(evid)})`;
        created++; detail.precio = "creada"; preview.precio = { propuestas: propuestas.length, rechazados: rechazados.length };
      }
    } else if (mode === "mensual") {
      // INFORME DE MEJORA (borrador a pm_informes, dedup por mes)
      const [ex] = await sql`select id from pm_informes where tipo='mejora_mensual_rentas' and corte=${mes} and archived_at is null limit 1`;
      if (ex) { detail.informe = "dedup · ya existe borrador para " + mes; skipped++; }
      else {
        const po = await planOcupacion();
        const hall = await cuellos();
        const [kpi] = await sql`select vencido_neto, morosos_reales from v_cartera_kpi`;
        const payload = { corte: mes, ocupacion: { pct: Number(po.tot?.ocupacion_pct), ocupadas: Number(po.tot?.ocupadas), rentables: Number(po.tot?.unidades_rentables), vacantes: po.vac_n, recuperable_mes: po.recuperable, plan_por_casa: po.plan }, cuellos: hall, cobranza: { vencido_neto: Number(kpi?.vencido_neto), morosos_reales: Number(kpi?.morosos_reales) }, regla: "propuestas fundamentadas · cero acción autónoma · precios por submercado", origen: "ejecutor rentas-optimizacion", nota: "borrador mensual de mejora (dry-run) — el PDF se imprime desde el Command Center" };
        await sql`insert into pm_informes (tipo, corte, titulo, estado, origen, payload, generado_por) values ('mejora_mensual_rentas', ${mes}, ${"Mejora Mensual Rentas " + mes}, 'borrador', 'ejecutor', ${sql.json(payload)}, 'rentas-optimizacion (agentes_ia_exec)')`;
        created++; detail.informe = "borrador creado para " + mes; preview.informe = { ocupacion: payload.ocupacion.pct, recuperable: po.recuperable, cuellos: hall.length };
      }
    } else {
      return json({ ok: false, error: "modo inválido: " + mode + " (usar diaria|semanal|mensual)" }, 400);
    }

    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ created, skipped, detail, preview, isolation_test: iso })}, 'ok')`;
    return json({ ok: true, mode, corte, created, skipped, detail, preview, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
