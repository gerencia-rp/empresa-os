// Analiza la respuesta del estudiante a un mensaje WhatsApp.
// Devuelve sentimiento, intención, acción sugerida y actualizaciones de plan.
// Input: { message_id, response_text }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!ANTHROPIC_KEY) return json({ ok: false, error: "Falta ANTHROPIC_API_KEY" }, 500);

  const body = await req.json().catch(() => ({}));
  const { message_id, response_text } = body;
  if (!message_id || !response_text) return json({ ok: false, error: "message_id y response_text requeridos" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Cargar mensaje + estudiante + plan
  const { data: msg } = await sb.from("edu_whatsapp_messages")
    .select("*, student:edu_students(*)")
    .eq("id", message_id).single();
  if (!msg) return json({ ok: false, error: "Mensaje no encontrado" }, 404);

  const { data: plan } = await sb.from("edu_student_plans")
    .select("id, perfil, status")
    .eq("student_id", msg.student_id).eq("status", "active").maybeSingle();
  const { data: pendingTasks } = await sb.from("edu_student_plan_tasks")
    .select("id, paso_text, bloque_subetapa, completed")
    .eq("student_id", msg.student_id).eq("completed", false);

  const student: any = msg.student || {};

  const prompt = `Analizá la respuesta de un estudiante de mentoría real estate a este mensaje:

MENSAJE QUE SE LE ENVIÓ:
"${msg.message_text}"

RESPUESTA DEL ESTUDIANTE:
"${response_text}"

CONTEXTO DEL ESTUDIANTE:
- Nombre: ${student.full_name || '?'}
- Etapa actual: ${student.current_stage || '?'}
- Status: ${student.status || 'active'}

TAREAS PENDIENTES DEL PLAN (id · texto):
${(pendingTasks || []).map((t: any) => `- ${t.id} · ${t.paso_text}`).join('\n') || 'sin tareas'}

DEVOLVÉ JSON ESTRICTO con esta estructura:
{
  "sentimiento": "positivo" | "neutro" | "negativo" | "confundido" | "frustrado",
  "intencion": "string corta describiendo qué quiere el estudiante",
  "categoria": "completo_tarea" | "pidio_ayuda" | "reporta_avance" | "reporta_bloqueo" | "cambio_objetivo" | "queja" | "otro",
  "task_ids_completadas": [],  // ids de tareas pendientes que el estudiante dice haber hecho
  "task_ids_bloqueadas": [],   // ids donde reporta estar trabado
  "nuevo_status_sugerido": null o "active"|"at_risk"|"paused"|"dropped",
  "nueva_etapa_sugerida": null o "string con la nueva etapa si la respuesta indica avance/retroceso",
  "accion_recomendada": "string concreta — qué debe hacer el coach próximo",
  "urgencia": "alta" | "media" | "baja",
  "respuesta_sugerida": "string con un mensaje breve que el coach podría enviarle de vuelta"
}`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!r.ok) {
    const txt = await r.text();
    return json({ ok: false, error: `Anthropic ${r.status}: ${txt.slice(0, 400)}` }, 500);
  }
  const result: any = await r.json();
  const lastText = (result.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
  let parsed: any = null;
  try {
    const m = lastText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : lastText);
  } catch (e) {
    return json({ ok: false, error: "Parse JSON falló. Raw: " + lastText.slice(0, 400) }, 500);
  }

  // Aplicar updates al plan (best-effort)
  const planUpdates: any = { applied: [] };
  try {
    if (Array.isArray(parsed.task_ids_completadas) && parsed.task_ids_completadas.length) {
      await sb.from("edu_student_plan_tasks").update({
        completed: true,
        completed_at: new Date().toISOString()
      }).in("id", parsed.task_ids_completadas);
      planUpdates.applied.push(`${parsed.task_ids_completadas.length} tarea(s) marcadas como completadas`);
    }
    if (parsed.nuevo_status_sugerido && parsed.nuevo_status_sugerido !== student.status) {
      await sb.from("edu_students").update({
        status: parsed.nuevo_status_sugerido,
        updated_at: new Date().toISOString()
      }).eq("id", msg.student_id);
      planUpdates.applied.push(`status: ${student.status} → ${parsed.nuevo_status_sugerido}`);
    }
    if (parsed.nueva_etapa_sugerida && parsed.nueva_etapa_sugerida !== student.current_stage) {
      await sb.from("edu_students").update({
        current_stage: parsed.nueva_etapa_sugerida,
        updated_at: new Date().toISOString()
      }).eq("id", msg.student_id);
      planUpdates.applied.push(`etapa: ${student.current_stage} → ${parsed.nueva_etapa_sugerida}`);
    }
  } catch (e: any) {
    planUpdates.error = e.message;
  }

  // Marcar mensaje como respondido + guardar análisis
  await sb.from("edu_whatsapp_messages").update({
    status: "responded",
    response_text,
    response_at: new Date().toISOString(),
    response_analysis: parsed,
    plan_updated: planUpdates.applied.length > 0
  }).eq("id", message_id);

  // Sumar al contador de campaña
  await sb.rpc("increment_campaign_responded", { p_campaign_id: msg.campaign_id }).catch(() => {});

  return json({ ok: true, analysis: parsed, plan_updates: planUpdates });
});
