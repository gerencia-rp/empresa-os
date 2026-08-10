// ════════════════════════════════════════════════════════════════
// 📱 REMODELACIÓN · REPORTES — bitácora + avance de obra en PDF.
// Lee remodel_at_properties (avance_real) + weekly_activities. Escribe borrador a
// pm_informes (dedup por corte). Cada cifra cita su fuente; cero PII; no inventa
// (obra sin datos → "no computable"). Conecta COMO agentes_ia_exec.
// Modo: avance | run(=avance). Deploy: npx supabase functions deploy remod-reportes
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
    const [agent] = await sql`select id, coalesce(enabled,true) enabled from agent_registry where nombre='Reportes Remodelacion' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe 'Reportes Remodelacion'" }, 404);
    if (agent.enabled === false) { await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ accion: "skip" })},${sql.json({ reason: "kill switch OFF" })},'skipped')`; return json({ ok: true, skipped: "disabled" }); }
    const iso: Record<string, string> = {};
    try { await sql`select 1 from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; } catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS" : "ERR"; }
    try { await sql`select document_id from pm_tenants limit 1`; iso.document_id = "LEAK"; } catch (e) { iso.document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS" : "ERR"; }
    if (iso.pm_credentials !== "PASS" || iso.document_id !== "PASS") { await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ accion: "abort" })},${sql.json({ iso })},'ABORT')`; return json({ ok: false, aborted: true, iso }, 500); }
    // avance por obra (activas, no archivadas)
    const obras = await sql`select address casa, proceso, avance_real::int avance,
        case when avance_real is null then 'no computable' else null end nota
      from remodel_at_properties where active is not false order by proceso, avance_real desc nulls last`;
    // bitácora: hechas esta semana
    const [bit] = await sql`select count(*) filter (where status='done' and date >= (current_date - interval '7 days'))::int hechas,
        count(*) filter (where status<>'done' and date < current_date)::int pendientes from weekly_activities`;
    const enCurso = obras.filter((o: Record<string, unknown>) => o.proceso === "En construcción");
    const payload = {
      corte,
      avance_por_obra: obras.map((o: Record<string, unknown>) => ({ casa: o.casa, proceso: o.proceso, avance_pct: o.avance, nota: o.nota, fuente: "remodel_at_properties.avance_real" })),
      resumen: { obras_en_curso: enCurso.length, avance_promedio_en_curso: enCurso.length ? Math.round(enCurso.reduce((a: number, o: Record<string, unknown>) => a + Number(o.avance || 0), 0) / enCurso.length) : null, tareas_hechas_semana: Number(bit?.hechas), tareas_pendientes: Number(bit?.pendientes), fuente: "weekly_activities" },
      regla: "cifras reales con fuente; obra sin dato → no computable; cero PII",
      origen: "ejecutor remod-reportes (agentes_ia_exec)",
    };
    let created = 0, skipped = 0;
    const [ex] = await sql`select id from pm_informes where tipo='avance_obra_remodelacion' and corte=${corte} and archived_at is null limit 1`;
    if (ex) skipped++;
    else { await sql`insert into pm_informes (tipo,corte,titulo,estado,origen,payload,generado_por) values ('avance_obra_remodelacion',${corte},${"Avance de Obra Remodelación " + corte},'borrador','ejecutor',${sql.json(payload)},'remod-reportes (agentes_ia_exec)')`; created++; }
    await sql`insert into agent_audit_log (agent_id,input,output,resultado) values (${agent.id},${sql.json({ corte, rol_db: "agentes_ia_exec" })},${sql.json({ created, skipped, resumen: payload.resumen, iso })},'ok')`;
    return json({ ok: true, corte, created, skipped, resumen: payload.resumen, iso });
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
  finally { if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } } }
});
