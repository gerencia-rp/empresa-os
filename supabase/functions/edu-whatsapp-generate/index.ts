// Genera mensajes WhatsApp personalizados por estudiante usando Claude.
// Input: { campaign_id, student_ids?, prompt_template, mentorship_id }
// Output: { ok, generated, errors }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";
import { callAnthropic, extractText } from "../_shared/anthropic.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

interface Student {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  current_stage?: string;
  grupo?: string;
  capital_actual?: number;
  fico_score?: number;
  status?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!ANTHROPIC_KEY) return json({ ok: false, error: "Falta ANTHROPIC_API_KEY" }, 500);

  // Auth — la campaña dispara N llamadas a Anthropic, hay que validar JWT
  const auth = await requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  const body = await req.json().catch(() => ({}));
  const { campaign_id, student_ids, prompt_template, mentorship_id } = body;
  if (!campaign_id || !prompt_template) return json({ ok: false, error: "campaign_id y prompt_template son requeridos" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Cargar estudiantes objetivo
  let q = sb.from("edu_students").select("*");
  if (student_ids?.length) q = q.in("id", student_ids);
  else if (mentorship_id) q = q.eq("mentorship_id", mentorship_id);
  const { data: students, error: sErr } = await q;
  if (sErr) return json({ ok: false, error: sErr.message }, 500);
  if (!students?.length) return json({ ok: false, error: "Sin estudiantes que matcheen" }, 400);

  // Marcar campaña en generación
  await sb.from("edu_whatsapp_campaigns").update({ status: "generating", total_recipients: students.length }).eq("id", campaign_id);

  // Procesar en background
  // @ts-ignore EdgeRuntime
  EdgeRuntime.waitUntil((async () => {
    let generated = 0; let errors = 0;
    for (const s of students as Student[]) {
      try {
        // Cargar contexto adicional: plan activo + última sesión
        const { data: plan } = await sb.from("edu_student_plans")
          .select("perfil, bloques_ids, status")
          .eq("student_id", s.id).eq("status", "active").maybeSingle();
        const { data: lastCall } = await sb.from("edu_student_calls")
          .select("scheduled_at, topic, summary, status_attendance")
          .eq("student_id", s.id).order("scheduled_at", { ascending: false }).limit(1).maybeSingle();
        const { data: pendingTasks } = await sb.from("edu_student_plan_tasks")
          .select("paso_text, bloque_subetapa")
          .eq("student_id", s.id).eq("completed", false).limit(5);

        const ctxBlock =
`PERFIL DEL ESTUDIANTE:
- Nombre: ${s.full_name || '?'}
- Grupo: ${s.grupo || '?'}
- Etapa actual: ${s.current_stage || '?'}
- Capital: ${s.capital_actual ? '$' + s.capital_actual : 'no reportado'}
- FICO: ${s.fico_score || 'no reportado'}
- Status: ${s.status || 'active'}

PLAN ACTIVO: ${plan?.perfil?.perfil?.nombre || 'sin plan generado'}
ÚLTIMA SESIÓN: ${lastCall ? `${new Date(lastCall.scheduled_at).toLocaleDateString('es')} — ${lastCall.topic || ''} (${lastCall.status_attendance})` : 'sin sesiones registradas'}
${lastCall?.summary ? 'Resumen: ' + lastCall.summary.slice(0, 200) : ''}
PRÓXIMAS TAREAS PENDIENTES:
${(pendingTasks || []).map((t: any, i: number) => `${i+1}. ${t.paso_text} (${t.bloque_subetapa})`).join('\n') || 'sin tareas pendientes'}`;

        const prompt = `${prompt_template}

${ctxBlock}

INSTRUCCIONES:
- Escribí un mensaje de WhatsApp SOLO (sin saludo de email).
- Máximo 4-5 líneas, tono cercano y profesional.
- Tutealo, usá su nombre real.
- Hacé referencia ESPECÍFICA a su etapa actual o tarea pendiente.
- Termináramente con UNA pregunta concreta para que responda (no genérica).
- NO uses jerga corporativa.
- NO uses emojis en exceso (máximo 1-2).
- Devolvé SOLO el mensaje, sin comillas ni preámbulo.`;

        const callResult = await callAnthropic({
          model: "claude-sonnet-4-5",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
          user_id: auth.user_id,
          feature: "whatsapp-generate",
          timeoutMs: 60000,
          maxRetries: 1
        });
        if (!callResult.ok) { errors++; continue; }
        const text = extractText(callResult.data).trim();
        if (!text) { errors++; continue; }

        await sb.from("edu_whatsapp_messages").insert({
          campaign_id,
          student_id: s.id,
          phone: s.phone || null,
          message_text: text,
          status: "pending"
        });
        generated++;
      } catch (e) {
        console.error("error student", s.id, e);
        errors++;
      }
    }
    await sb.from("edu_whatsapp_campaigns").update({
      status: "ready",
      total_recipients: generated,
      updated_at: new Date().toISOString()
    }).eq("id", campaign_id);
  })());

  return json({ ok: true, async: true, total: students.length, message: "Generación iniciada en background" });
});
