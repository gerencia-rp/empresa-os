// ════════════════════════════════════════════════════════════════
// ✅ REMODELACIÓN · EJECUCIÓN — nudges de obra (vencidas/sin dueño).
// Lee weekly_activities + remodel_at_properties. Propone nudge POR OBRA a
// agent_proposals (borrador, NO envía). Piso humano: la obra física la hacen
// Diego / Structure One. Conecta COMO agentes_ia_exec (aislamiento + kill switch).
// DISCIPLINA (E2): excluye obras Finalizado (planner sin cerrar = artefacto) y
//   Pre-construcción (no arrancó). Dedup por obra+corte.
// Modo: pulso | run(=pulso). Deploy: npx supabase functions deploy remod-ejecucion
// ════════════════════════════════════════════════════════════════
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { requireAuth } from "../_shared/auth.ts";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
function execSql() {
  const raw = Deno.env.get("SUPABASE_DB_URL"), pwd = Deno.env.get("AGENTES_IA_EXEC_PWD");
  if (!raw || !pwd) throw new Error("faltan SUPABASE_DB_URL / AGENTES_IA_EXEC_PWD");
  const ref = (Deno.env.get("SUPABASE_URL") || "").replace(/^https?:\/\//, "").split(".")[0];
  const u = new URL(raw); const user = u.hostname.includes("pooler") ? `agentes_ia_exec.${ref}` : "agentes_ia_exec";
  return postgres(`postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pwd)}@${u.hostname}:${u.port || 5432}${u.pathname || "/postgres"}`, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 15, ssl: "require" });
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const bearer = (req.headers.get("authorization") || "").replace(/^bearer /i, "").trim();
  if (bearer !== SERVICE_KEY) { const auth = await requireAuth(req, { requireAdmin: true }); if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401); }
  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();
    const [{ corte }] = await sql`select date_trunc('week', (now() at time zone 'America/Chicago'))::date::text as corte`;
    const [agent] = await sql`select id, coalesce(enabled,true) enabled from agent_registry where nombre='Ejecucion Remodelacion' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Ejecucion Remodelacion'" }, 404);
    if (agent.enabled === false) { await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ accion: "skip" })},${sql.json({ reason: "kill switch OFF" })},'skipped')`; return json({ ok: true, skipped: "disabled" }); }
    const iso: Record<string, string> = {};
    try { await sql`select 1 from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; } catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS" : "ERR"; }
    try { await sql`select document_id from pm_tenants limit 1`; iso.document_id = "LEAK"; } catch (e) { iso.document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS" : "ERR"; }
    if (iso.pm_credentials !== "PASS" || iso.document_id !== "PASS") { await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ accion: "abort" })},${sql.json({ iso })},'ABORT')`; return json({ ok: false, aborted: true, iso }, 500); }
    // Obras EN CONSTRUCCIÓN con vencidas (excluye Finalizado/Pre-construcción = artefacto/no-arrancó)
    const obras = await sql`
      select wa.property_name casa, count(*) filter (where wa.status<>'done' and wa.date < current_date)::int vencidas,
             count(*) filter (where wa.status<>'done' and (wa.assignee is null or btrim(wa.assignee)=''))::int sin_dueno
      from weekly_activities wa
      join remodel_at_properties ap on lower(btrim(ap.address)) like '%'||lower(btrim(wa.property_name))||'%' and ap.active is not false and ap.proceso='En construcción'
      group by 1 having count(*) filter (where wa.status<>'done' and wa.date < current_date) > 0
      order by 2 desc`;
    let created = 0, refreshed = 0, skipped = 0, retired = 0; const nudged: string[] = [], seenKeys: string[] = [];
    for (const o of obras) {
      const key = "remodej:nudge:" + o.casa + ":" + corte;
      seenKeys.push(key);
      const payload = { requiere_aprobacion: true, accion: "enviar_nudge", dedup_key: key, canal: "whatsapp/clickup" };
      const evid = { tipo: "nudge", casa: o.casa, vencidas: Number(o.vencidas), sin_dueno: Number(o.sin_dueno), hallazgo: `${o.casa}: ${o.vencidas} tareas vencidas, ${o.sin_dueno} sin dueño. Piso humano: la obra la hacen Diego/Structure One.`, nota: "DRY-RUN: no envía; excluye obras Finalizado (planner sin cerrar) y Pre-construcción", fuente: "weekly_activities + remodel_at_properties", origen: "ejecutor remod-ejecucion" };
      const [result] = await sql`select outcome from record_agent_proposal(${agent.id},'nudge',${sql.json(payload)},${sql.json(evid)})`;
      if (result?.outcome === "created") created++; else refreshed++;
      nudged.push(o.casa as string);
    }
    const [reconciled] = await sql`select reconcile_agent_proposal_set(${agent.id},'nudge','remodej:nudge:',${seenKeys}::text[]) retired`;
    retired = Number(reconciled?.retired || 0);
    await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ corte, rol_db: "agentes_ia_exec" })},${sql.json({ created, refreshed, retired, skipped, nudged, iso })},'ok')`;
    return json({ ok: true, corte, created, refreshed, retired, skipped, nudged, iso });
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
  finally { if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } } }
});
