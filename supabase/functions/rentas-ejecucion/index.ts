// ════════════════════════════════════════════════════════════════
// ✅ RENTAS · EJECUCIÓN — ejecutor autónomo (pulso operativo).
// "Que cada tarea se cumpla": vigila el space Rentas de ClickUp, persigue lo
// vencido y lo sin dueño, y ESCRIBE SOLO BORRADORES DE NUDGE a agent_proposals.
// NUNCA envía un mensaje: cada nudge queda estado='propuesta' → Nicolás aprueba.
//
// 🔒 Misma seguridad que rentas-financiero: conecta COMO agentes_ia_exec
//   (least-privilege por DB) — SELECT solo del espejo (clickup_tasks_mirror,
//   pm_*, agent_*) + INSERT solo en agent_proposals/agent_audit_log. CERO
//   pm_credentials, CERO document_id (PII), CERO update/delete. Test de
//   aislamiento en cada corrida; si algo NO da permission denied → ABORT.
//
// Idempotencia REAL por tarea: el payload lleva un DISCRIMINADOR (tarea_id /
//   persona / corte) para no auto-deduplicarse; el trigger trg_dedup_proposals
//   (agent_id+tipo_accion+property_id+md5(payload)) evita duplicar entre corridas.
// Kill switch: agent_registry.enabled (Ejecución Rentas). off = no corre.
//
// Modo (?mode=): pulso (default). Cron: 07:00 · 12:30 · 17:30 (Austin).
// Deploy: npx supabase functions deploy rentas-ejecucion
// ════════════════════════════════════════════════════════════════
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { requireAuth } from "../_shared/auth.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SPACE_RENTAS = "90113866436";
const CARGA_MAX = 50; // umbral de "cuello de botella" por persona
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function execSql() {
  const raw = Deno.env.get("SUPABASE_DB_URL"), pwd = Deno.env.get("AGENTES_IA_EXEC_PWD");
  if (!raw || !pwd) throw new Error("faltan SUPABASE_DB_URL / AGENTES_IA_EXEC_PWD");
  const ref = (Deno.env.get("SUPABASE_URL") || "").replace(/^https?:\/\//, "").split(".")[0];
  const u = new URL(raw);
  const user = u.hostname.includes("pooler") ? `agentes_ia_exec.${ref}` : "agentes_ia_exec";
  const conn = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pwd)}@${u.hostname}:${u.port || 5432}${u.pathname || "/postgres"}`;
  return postgres(conn, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 15, ssl: "require" });
}
function todayCT() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const bearer = (req.headers.get("authorization") || "").replace(/^bearer /i, "").trim();
  if (bearer !== SERVICE_KEY) {
    const auth = await requireAuth(req, { requireAdmin: true });
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);
  }
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const mode = String(url.searchParams.get("mode") || (body as { mode?: string }).mode || "pulso");
  const corte = todayCT();

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();

    // agent_id + KILL SWITCH
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Ejecución Rentas' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe el agente 'Ejecución Rentas'" }, 404);
    if (agent.enabled === false) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, accion: "skip" })}, ${sql.json({ reason: "kill switch OFF (enabled=false)" })}, 'skipped')`;
      return json({ ok: true, skipped: "disabled", mode });
    }

    // TEST DE AISLAMIENTO
    const iso: Record<string, string> = {};
    try { await sql`select 1 from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; }
    catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    try { await sql`select document_id from pm_tenants limit 1`; iso.pm_tenants_document_id = "LEAK"; }
    catch (e) { iso.pm_tenants_document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
    if (!(iso.pm_credentials.startsWith("PASS") && iso.pm_tenants_document_id.startsWith("PASS"))) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode })}, ${sql.json({ isolation_test: iso, motivo: "leak → ABORT" })}, 'ABORT')`;
      return json({ ok: false, aborted: true, isolation_test: iso }, 500);
    }

    let created = 0, skipped = 0;
    const detail: Record<string, unknown> = { vencidas: 0, cobros_sin_dueno: 0, cuello: 0, recurrentes: 0, informe: "—" };
    // helper: inserta y cuenta según el trigger de dedup (RETURNING vacío = deduplicado)
    const put = async (tipo: string, payload: Record<string, unknown>, evid: Record<string, unknown>) => {
      const r = await sql!`insert into agent_proposals (agent_id, tipo_accion, estado, payload, evidencia) values (${agent.id}, ${tipo}, 'propuesta', ${sql!.json(payload)}, ${sql!.json(evid)}) returning id`;
      if (r.length) { created++; return true; } skipped++; return false;
    };

    if (mode === "pulso") {
      // (1) VENCIDAS reales — status 'en ejecución' con fecha pasada (excluye backlog parqueado → cero FP)
      const venc = await sql`select id, name, primary_assignee, due_date from clickup_tasks_mirror where space_id=${SPACE_RENTAS} and active and status='en ejecución' and due_date < now()`;
      for (const t of venc) {
        const ok = await put("nudge",
          { requiere_aprobacion: true, accion: "seguimiento_vencida", tarea_id: t.id },
          { tipo: "vencida", tarea: t.name, responsable: t.primary_assignee || "(sin dueño)", vencio: t.due_date, borrador: `La tarea "${t.name}" está vencida (desde ${new Date(t.due_date).toLocaleDateString("es-MX")}). ¿La cerramos o re-fechamos?`, nota: "DRY-RUN: NO enviar, aprueba Nicolás", fuente: "clickup_tasks_mirror", origen: "ejecutor rentas-ejecucion" });
        if (ok) (detail.vencidas as number)++;
      }
      // (2) COBROS sin dueño (alto valor — cruza con la mora del Financiero)
      const cobros = await sql`select id, name from clickup_tasks_mirror where space_id=${SPACE_RENTAS} and active and name ilike '%cobro de renta%' and (assignees='[]'::jsonb or assignees is null)`;
      for (const t of cobros) {
        const ok = await put("nudge",
          { requiere_aprobacion: true, accion: "asignar_responsable", tarea_id: t.id },
          { tipo: "sin_dueno", tarea: t.name, borrador: `La tarea de cobro "${t.name}" no tiene responsable. ¿Quién la toma?`, nota: "DRY-RUN: NO enviar, aprueba Nicolás", fuente: "clickup_tasks_mirror", origen: "ejecutor rentas-ejecucion" });
        if (ok) (detail.cobros_sin_dueno as number)++;
      }
      // (3) CUELLO DE BOTELLA por persona (>CARGA_MAX tareas abiertas)
      const cuellos = await sql`select primary_assignee persona, count(*)::int abiertas, count(*) filter (where due_date < now())::int vencidas from clickup_tasks_mirror where space_id=${SPACE_RENTAS} and active and primary_assignee is not null and coalesce(status_type,'') not in ('done','closed') group by 1 having count(*) > ${CARGA_MAX}`;
      for (const c of cuellos) {
        const ok = await put("nudge",
          { requiere_aprobacion: true, accion: "rebalancear_carga", persona: c.persona },
          { tipo: "cuello_de_botella", persona: c.persona, abiertas: c.abiertas, vencidas: c.vencidas, borrador: `${c.persona} concentra ${c.abiertas} tareas abiertas (${c.vencidas} vencidas) en Rentas — conviene redistribuir o repriorizar.`, nota: "DRY-RUN: NO enviar, aprueba Nicolás", fuente: "clickup_tasks_mirror", origen: "ejecutor rentas-ejecucion" });
        if (ok) (detail.cuello as number)++;
      }
      // (4) RECURRENTES SIN FECHA — un nudge agregado (discriminador estable → un abierto por vez)
      const [rec] = await sql`select count(*)::int n from clickup_tasks_mirror where space_id=${SPACE_RENTAS} and active and (status='sprint backlog recurrente' or is_recurring) and due_date is null`;
      if (rec && rec.n > 0) {
        const ok = await put("nudge",
          { requiere_aprobacion: true, accion: "poner_fecha_recurrentes" },
          { tipo: "recurrentes_sin_fecha", cantidad: rec.n, borrador: `Hay ${rec.n} tareas recurrentes sin fecha en Rentas. Ponerles due_date para que entren al pulso.`, nota: "DRY-RUN: NO enviar, aprueba Nicolás", fuente: "clickup_tasks_mirror", origen: "ejecutor rentas-ejecucion" });
        if (ok) detail.recurrentes = rec.n;
      }
      // (5) INFORME DE ESTADO (1 por día; etapas/desync se declaran como no computables, sin inventar → cero FP)
      const [tot] = await sql`select
        count(*) filter (where coalesce(status_type,'') not in ('done','closed'))::int abiertas,
        count(*) filter (where coalesce(status_type,'') not in ('done','closed') and (assignees='[]'::jsonb or assignees is null))::int sin_dueno,
        count(*) filter (where status='en ejecución' and due_date < now())::int vencidas,
        count(*) filter (where (status='sprint backlog recurrente' or is_recurring) and due_date is null)::int recurrentes_sin_fecha
        from clickup_tasks_mirror where space_id=${SPACE_RENTAS} and active`;
      const okInf = await put("informe",
        { tipo: "informe_ejecucion", corte },
        { tipo: "informe_ejecucion", corte, abiertas: tot?.abiertas, sin_dueno: tot?.sin_dueno, vencidas: tot?.vencidas, recurrentes_sin_fecha: tot?.recurrentes_sin_fecha, cuellos: (detail.cuello as number), etapas_estancadas: "no computable (campo fase vacío en el espejo)", clickup_vs_airtable: "no computado (sin mapeo limpio tarea→casa; se evita falso positivo)", nota: "pulso automático (dry-run)", origen: "ejecutor rentas-ejecucion" });
      detail.informe = okInf ? "creado" : "dedup (ya existe hoy)";
    }

    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ created, skipped, detail, isolation_test: iso })}, 'ok')`;
    return json({ ok: true, mode, created, skipped, detail, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
