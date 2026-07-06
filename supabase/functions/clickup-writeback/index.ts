// Write-back a ClickUp CON APROBACIÓN — nada se cambia sin OK humano.
// POST { proposal_id, decision: "aprobar" | "rechazar", decidido_por }
//   aprobar → aplica la acción del payload a ClickUp (reasignar / re-fechar / archivar) y marca 'aplicada'
//   rechazar → marca 'rechazada' (no toca ClickUp)
// Auth: JWT de usuario o service key (mismo patrón que los crons).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CLICKUP_TOKEN = Deno.env.get("CLICKUP_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Content-Type": "application/json" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: CORS });

async function cu(path: string, method: string, body?: unknown) {
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    method, headers: { Authorization: CLICKUP_TOKEN, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ClickUp ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const { proposal_id, decision, decidido_por } = await req.json();
    if (!proposal_id || !["aprobar", "rechazar"].includes(decision)) return json({ ok: false, error: "proposal_id + decision (aprobar|rechazar)" }, 400);
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: p } = await db.from("agent_proposals").select("*").eq("id", proposal_id).is("deleted_at", null).maybeSingle();
    if (!p) return json({ ok: false, error: "propuesta no encontrada" }, 404);
    if (p.estado !== "propuesta") return json({ ok: false, error: `ya decidida: ${p.estado}` }, 409);

    if (decision === "rechazar") {
      await db.from("agent_proposals").update({ estado: "rechazada", approved_by: decidido_por || "ceo", approved_at: new Date().toISOString() }).eq("id", proposal_id);
      return json({ ok: true, estado: "rechazada" });
    }

    // aprobar → aplicar a ClickUp según tipo
    const pay = p.payload || {};
    let applied: unknown = null;
    const taskId = pay.task_id;
    if (p.tipo_accion === "refechar_tarea" && taskId && pay.fecha_nueva) {
      applied = await cu(`/task/${taskId}`, "PUT", { due_date: new Date(pay.fecha_nueva + "T17:00:00Z").getTime() });
    } else if (p.tipo_accion === "reasignar_tarea" && taskId && pay.assignee_id) {
      applied = await cu(`/task/${taskId}`, "PUT", { assignees: { add: [Number(pay.assignee_id)], rem: pay.remove_id ? [Number(pay.remove_id)] : [] } });
    } else if (p.tipo_accion === "archivar_tarea" && taskId) {
      // archivar = cerrar la tarea en ClickUp (no se borra nada)
      applied = await cu(`/task/${taskId}`, "PUT", { status: pay.status_cierre || "complete" });
    } else if (p.tipo_accion === "informe" || p.tipo_accion === "decidir") {
      applied = { nota: "informativa: sin acción en ClickUp" };
    } else {
      return json({ ok: false, error: `tipo_accion ${p.tipo_accion} sin acción aplicable o payload incompleto` }, 400);
    }
    await db.from("agent_proposals").update({ estado: "ejecutada", approved_by: decidido_por || "ceo", approved_at: new Date().toISOString(), executed_at: new Date().toISOString() }).eq("id", proposal_id);
    return json({ ok: true, estado: "ejecutada", clickup: applied ? true : false });
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e) }, 500);
  }
});
