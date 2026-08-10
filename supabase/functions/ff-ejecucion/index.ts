// ════════════════════════════════════════════════════════════════
// ✅ FIX & FLIP · EJECUCIÓN — ejecutor (pulso operativo del pipeline de deals).
// SOLO LEE clickup_tasks_mirror (space Flipping Rentals 90113866319) + ff_deals.
// ESCRIBE SOLO PROPUESTAS (nudge) a agent_proposals; NO envía (WhatsApp pendiente).
// Conecta COMO agentes_ia_exec (least-privilege, sin PII). Isolation o ABORTA.
//
// Anti-falso-positivo (no-neg E2): las ~531 tareas SIN DUEÑO del space son ruido
//   (listas/plantillas) → NO dispara 531 nudges; las cuenta como higiene agregada.
//   El nudge accionable = tareas VENCIDAS (due<now, no closed/done).
// Kill switch: agent_registry.enabled. Dedup por corte. Modo: pulso | run(=pulso)
// Deploy: npx supabase functions deploy ff-ejecucion
// ════════════════════════════════════════════════════════════════
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { requireAuth } from "../_shared/auth.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FF_SPACE = "90113866319";
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
    const [{ corte }] = await sql`select (now() at time zone 'America/Chicago')::date::text as corte`;
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Ejecucion Fix & Flip' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Ejecucion Fix & Flip'" }, 404);
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

    const open = await sql`select payload->>'dedup_key' k from agent_proposals where agent_id=${agent.id} and estado='propuesta' and deleted_at is null`;
    const keys = new Set<string>(open.map((r: Record<string, unknown>) => r.k as string).filter(Boolean));
    const k = "ffej:pulso:" + corte;
    if (keys.has(k)) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ created: 0, skipped: 1, detail: "dedup", isolation_test: iso })}, 'ok')`;
      return json({ ok: true, created: 0, skipped: 1, dedup: true, isolation_test: iso });
    }
    // E1 vencidas reales (due<now, no closed/done)
    const vencidas = await sql`select name, due_date::date dd, primary_assignee, list_name
      from clickup_tasks_mirror where active is not false and space_id=${FF_SPACE}
        and due_date < now() and status_type not in ('closed','done')
      order by due_date limit 40`;
    // E2 higiene agregada (sin dueño = ruido, no nudge por tarea)
    const [{ sin_dueno }] = await sql`select count(*)::int sin_dueno from clickup_tasks_mirror
      where active is not false and space_id=${FF_SPACE} and (assignees is null or assignees::text in ('[]','null','')) and status_type not in ('closed','done')`;
    const payload = { requiere_aprobacion: true, accion: "nudge_tareas_vencidas_ff", dedup_key: k, canal: "borrador (WhatsApp pendiente de token)", severidad: vencidas.length > 0 ? "alto" : "info" };
    const evid = { tipo: "pulso_operativo", regla: "E1/E2", corte, vencidas_total: vencidas.length,
      vencidas: vencidas.map((r: Record<string, unknown>) => ({ tarea: r.name, vence: r.dd, responsable: r.primary_assignee || "sin dueño", lista: r.list_name })),
      higiene_sin_dueno: Number(sin_dueno), nota: "El nudge accionable = tareas VENCIDAS. Las " + Number(sin_dueno) + " sin dueño son higiene agregada (listas/plantillas), NO se disparan como nudges individuales (anti-falso-positivo). Envío = aprueba humano; piso humano: contratistas/firmas.",
      fuente: "clickup_tasks_mirror (space Flipping Rentals)", origen: "ejecutor ff-ejecucion" };
    await sql`insert into agent_proposals (agent_id, tipo_accion, estado, payload, evidencia) values (${agent.id}, 'nudge', 'propuesta', ${sql.json(payload)}, ${sql.json(evid)})`;
    await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ created: 1, skipped: 0, detail: { vencidas: vencidas.length, sin_dueno_higiene: Number(sin_dueno) }, isolation_test: iso })}, 'ok')`;
    return json({ ok: true, created: 1, corte, detail: { vencidas: vencidas.length, sin_dueno_higiene: Number(sin_dueno) }, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
