// ════════════════════════════════════════════════════════════════
// 📊 RENTAS · REPORTES — ejecutor autónomo (que todo sea VISIBLE).
// Corre en cadencia (ocupación semanal miércoles / bitácora lun-mar),
// lee el espejo y ESCRIBE SOLO BORRADORES a pm_informes (informes internos
// del Command Center). NO propone plata ni mensajes: su barra es veracidad
// total — cero cifras inventadas, cero PII. El PDF se imprime desde el OS.
//
// 🔒 SEGURIDAD IMPUESTA POR LA DB (no por código):
//   NO usa el service role para las queries. Abre una conexión Postgres COMO el
//   rol `agentes_ia_exec` (least-privilege): SELECT solo en el espejo
//   (v_ocupacion, pm_units, pm_properties, pm_payments, pm_expenses,
//   agent_proposals, agent_registry) + INSERT solo en pm_informes/agent_audit_log.
//   CERO pm_credentials, CERO document_id (PII), CERO update/delete. Si el código
//   tuviera un bug, la DB rechaza (permission denied).
//   Al arrancar corre un TEST DE AISLAMIENTO (pm_credentials + document_id →
//   permission denied); si algo NO diera denied, ABORTA sin escribir.
//
// Kill switch: agent_registry.enabled (Reportes Rentas). off = no corre.
// Idempotente: dedup por CORTE (lunes de la semana ISO) — el re-run lun→mar
//   encuentra el borrador y no lo duplica.
//
// Auth HTTP: bearer = SERVICE_KEY (cron) o admin JWT. (Distinto del rol DB.)
// Modos (?mode=): ocupacion | bitacora | run(=ocupacion)
// Deploy: npx supabase functions deploy rentas-reportes
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
  if (mode === "run") mode = "ocupacion";
  const dry = String(url.searchParams.get("dry") || (body as { dry?: unknown }).dry || "") === "1";

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();

    // corte = LUNES de la semana en curso (America/Chicago) — un borrador por semana
    const [{ corte }] = await sql`select date_trunc('week', (now() at time zone 'America/Chicago'))::date::text as corte`;

    // ── agent_id + KILL SWITCH ──
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled, estado from agent_registry where nombre='Reportes Rentas' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe el agente 'Reportes Rentas'" }, 404);
    if (agent.enabled === false) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte, accion: "skip" })}, ${sql.json({ reason: "kill switch OFF (agent_registry.enabled=false)" })}, 'skipped')`;
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
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte, accion: "abort" })}, ${sql.json({ isolation_test: iso, motivo: "el rol pudo leer credenciales/PII — ABORT, no se escribió nada" })}, 'ABORT')`;
      return json({ ok: false, aborted: true, isolation_test: iso }, 500);
    }

    let created = 0, skipped = 0;
    const detail: Record<string, unknown> = {};
    let preview: Record<string, unknown> = {};

    if (mode === "ocupacion") {
      const tipo = "ocupacion_semanal_rentas";
      const corteDate = corte; // ya es 'YYYY-MM-DD' (lunes)
      // Total canónico (regla del dueño: unidades rentables = habitaciones agrupadas)
      const [tot] = await sql`select unidades_rentables, ocupadas, mantenimiento, disponibles, reservadas, ocupacion_pct from v_ocupacion`;
      // Por casa — MISMO filtro que v_ocupacion (unit-rec% + unit_type) para que sumen consistente
      const porCasa = await sql`
        select pp.name casa,
          count(*) filter (where u.status='ocupada')::int ocupadas,
          count(*) filter (where u.status='mantenimiento')::int mantenimiento,
          count(*) filter (where u.status='disponible')::int disponibles,
          count(*)::int total,
          round(100.0*count(*) filter (where u.status='ocupada')/nullif(count(*),0),1) pct
        from pm_units u join pm_properties pp on pp.id=u.property_id
        where u.active and u.is_active and u.archived_at is null
          and pp.active and u.external_id like 'unit-rec%' and u.unit_type is not null
        group by 1 order by pct asc nulls last, 1`;
      const payload = {
        corte: corteDate,
        total: { pct: Number(tot?.ocupacion_pct), ocupadas: Number(tot?.ocupadas), unidades_rentables: Number(tot?.unidades_rentables), mantenimiento: Number(tot?.mantenimiento), disponibles: Number(tot?.disponibles), reservadas: Number(tot?.reservadas), fuente: "v_ocupacion" },
        por_casa: porCasa.map((c: Record<string, unknown>) => ({ casa: c.casa, ocupadas: Number(c.ocupadas), total: Number(c.total), mantenimiento: Number(c.mantenimiento), disponibles: Number(c.disponibles), pct: c.pct === null ? null : Number(c.pct), fuente: "pm_units" })),
        nota_definicion: "Total = unidades rentables (habitaciones de una casa agrupadas = 1), regla del dueño, vía v_ocupacion. Por-casa = mismo universo (unit-rec% con unit_type). Ambas cifras REALES, cero inventado.",
        regla: "cero cifras inventadas · cada número cita su fuente · cero PII",
        origen: "ejecutor rentas-reportes (agentes_ia_exec)",
      };
      preview = { total: payload.total, casas_mas_bajas: payload.por_casa.slice(0, 4) };
      if (dry) { detail.informe = "DRY (no escribe): borrador de ocupación para " + corteDate; }
      else {
        const [ex] = await sql`select id from pm_informes where tipo=${tipo} and corte=${corteDate} and archived_at is null limit 1`;
        if (ex) { detail.informe = "dedup · ya existe borrador para " + corteDate; skipped++; }
        else {
          await sql`insert into pm_informes (tipo, corte, titulo, estado, origen, payload, generado_por) values (${tipo}, ${corteDate}, ${"Ocupación Semanal Rentas " + corteDate}, 'borrador', 'ejecutor', ${sql.json(payload)}, 'rentas-reportes (agentes_ia_exec)')`;
          created++; detail.informe = "borrador creado para " + corteDate;
        }
      }
    } else if (mode === "bitacora") {
      const tipo = "bitacora_semanal_rentas";
      const corteDate = corte;
      // Consolidado por casa de los últimos 7 días — plata REAL (paid_at/expense_date), no el contrato
      const cob = await sql`select pp.name casa, round(sum(p.amount)) cobrado, count(*)::int pagos
        from pm_payments p join pm_properties pp on pp.id=p.property_id
        where p.active and p.type='ingreso' and p.status='pagado' and p.paid_at >= current_date - interval '7 days'
        group by 1`;
      const gas = await sql`select pp.name casa, round(sum(e.amount)) gastado, count(*)::int items
        from pm_expenses e join pm_properties pp on pp.id=e.property_id
        where e.active and e.scope='casa' and e.expense_date >= current_date - interval '7 days'
        group by 1`;
      // Hallazgos abiertos del squad de Rentas por casa (Financiero/Ejecución/Reportes)
      const hall = await sql`select coalesce(nullif(ap.evidencia->>'casa',''),'(sin casa)') casa, count(*)::int n
        from agent_proposals ap join agent_registry ar on ar.id=ap.agent_id
        where ap.estado='propuesta' and ap.deleted_at is null and ar.linea='Rentas'
        group by 1`;
      const casas = await sql`select count(*)::int n from pm_properties where active`;
      // Merge por casa
      const map: Record<string, { casa: string; cobrado: number; pagos: number; gastado: number; items: number; hallazgos: number }> = {};
      const get = (c: string) => (map[c] ||= { casa: c, cobrado: 0, pagos: 0, gastado: 0, items: 0, hallazgos: 0 });
      for (const r of cob) { const o = get(r.casa); o.cobrado = Number(r.cobrado); o.pagos = Number(r.pagos); }
      for (const r of gas) { const o = get(r.casa); o.gastado = Number(r.gastado); o.items = Number(r.items); }
      for (const r of hall) { if (r.casa === "(sin casa)") continue; const o = get(r.casa); o.hallazgos = Number(r.n); }
      const filas = Object.values(map).sort((a, b) => (b.cobrado - a.cobrado) || (b.hallazgos - a.hallazgos));
      const sinCasa = hall.find((r: Record<string, unknown>) => r.casa === "(sin casa)");
      const totCasas = Number(casas[0]?.n || 0);
      const totales = { cobrado: filas.reduce((a, x) => a + x.cobrado, 0), gastado: filas.reduce((a, x) => a + x.gastado, 0), hallazgos: filas.reduce((a, x) => a + x.hallazgos, 0) + Number(sinCasa?.n || 0) };
      const payload = {
        corte: corteDate,
        ventana: "últimos 7 días",
        por_casa: filas.map((f) => ({ ...f, fuente: "pm_payments (cobrado, paid_at) · pm_expenses (gastado, expense_date) · agent_proposals (hallazgos del squad)" })),
        totales,
        casas_con_movimiento: filas.length,
        casas_sin_movimiento: Math.max(0, totCasas - filas.length),
        hallazgos_sin_casa: Number(sinCasa?.n || 0),
        nota: "Las casas sin movimiento esta semana se DECLARAN (no computable → no se inventa cifra). Plata real cobrada (paid_at), depósitos NO son renta.",
        regla: "cero cifras inventadas · cada número cita su fuente · cero PII",
        origen: "ejecutor rentas-reportes (agentes_ia_exec)",
      };
      preview = { totales, casas_con_movimiento: filas.length, casas_sin_movimiento: payload.casas_sin_movimiento, top: filas.slice(0, 3) };
      if (dry) { detail.informe = "DRY (no escribe): bitácora para " + corteDate; }
      else {
        const [ex] = await sql`select id from pm_informes where tipo=${tipo} and corte=${corteDate} and archived_at is null limit 1`;
        if (ex) { detail.informe = "dedup · ya existe borrador para " + corteDate; skipped++; }
        else {
          await sql`insert into pm_informes (tipo, corte, titulo, estado, origen, payload, generado_por) values (${tipo}, ${corteDate}, ${"Bitácora Semanal Rentas " + corteDate}, 'borrador', 'ejecutor', ${sql.json(payload)}, 'rentas-reportes (agentes_ia_exec)')`;
          created++; detail.informe = "borrador creado para " + corteDate;
        }
      }
    } else {
      return json({ ok: false, error: "modo inválido: " + mode + " (usar ocupacion|bitacora)" }, 400);
    }

    // ── BITÁCORA de la corrida ──
    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte, dry, rol_db: "agentes_ia_exec" })}, ${sql.json({ created, skipped, detail, preview, isolation_test: iso })}, 'ok')`;

    return json({ ok: true, mode, corte, dry, created, skipped, detail, preview, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
