// ════════════════════════════════════════════════════════════════
// 🏭 IA-BUILDER — fábrica de herramientas del departamento /ia.
// Entrevista al empleado (Claude, tool-use forzado) y clasifica en 2 carriles:
//   LIBRE  → genera un HTML AUTOCONTENIDO y lo publica al instante (ia_artifacts)
//   CON OK → NUNCA ejecuta: guarda el prompt/spec en ia_specs (pendiente de admin)
// Seguridad: requireAuth (JWT) + rate limit + validador server-side del HTML
// (defensa en profundidad además del system prompt) + el front lo renderiza
// en <iframe sandbox> sin allow-same-origin.
// Secret: ANTHROPIC_API_KEY (ya en Supabase Secrets — la usan fm-ai-coach etc.)
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";
import { callAnthropic, checkRateLimit } from "../_shared/anthropic.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "claude-opus-4-8";
const MAX_TURNS = 40; // tope duro de transcript (contexto)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

// ─── Validador del carril libre (defensa en profundidad, NO solo el prompt) ───
// Si el HTML intenta red/almacenamiento/escape del sandbox → se degrada a spec.
const HTML_BLACKLIST =
  /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|supabase|SUPABASE_|functions\/v1|api\.anthropic|localStorage|sessionStorage|indexedDB|document\.cookie|import\s*\(|import\s+[^;]*from\s|<script[^>]*\ssrc\s*=|<link[^>]*\shref\s*=\s*["']?https?:|@import\s|window\s*\.\s*(top|parent|opener)|postMessage\s*\(|<iframe|<embed|<object|serviceWorker/i;

function validarHtmlLibre(html: string): { ok: boolean; motivo?: string } {
  if (!html || html.length < 40) return { ok: false, motivo: "HTML vacío o trivial" };
  if (html.length > 300_000) return { ok: false, motivo: "HTML demasiado grande" };
  const m = html.match(HTML_BLACKLIST);
  if (m) return { ok: false, motivo: `patrón prohibido en el HTML: "${m[0].slice(0, 60)}"` };
  return { ok: true };
}

// ─── Tools (respuesta estructurada forzada) ───
const TOOLS = [
  {
    name: "preguntar",
    description: "Hacé UNA pregunta más al empleado para completar el contexto de la entrevista.",
    input_schema: {
      type: "object",
      properties: { texto: { type: "string", description: "La pregunta, en español, corta y concreta. Puede incluir 2-3 opciones sugeridas." } },
      required: ["texto"],
    },
  },
  {
    name: "publicar_libre",
    description: "CARRIL LIBRE: la herramienta es 100% autocontenida (sin datos reales de la empresa, sin red, sin secretos, sin acciones). Generá el HTML completo y publicalo.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        area: { type: "string", description: "Fix & Flip | Rentas | Remodelación | Educación | Operación | Contable | Administración | Otro" },
        tipo: { type: "string", enum: ["prompt", "dashboard", "agente", "automatizacion"], description: "prompt=generador de texto/documento; dashboard=calculadora/visualización; agente=asistente guiado; automatizacion=checklist/flujo" },
        html: { type: "string", description: "Documento HTML COMPLETO y autocontenido (<!doctype html>…), CSS y JS inline." },
        prompt_generador: { type: "string", description: "El prompt completo con el que se podría regenerar/mejorar esta herramienta." },
        resumen: { type: "string", description: "1-2 frases: qué hace y cómo se usa." },
      },
      required: ["titulo", "area", "tipo", "html", "prompt_generador", "resumen"],
    },
  },
  {
    name: "derivar_ok",
    description: "CARRIL CON OK: el pedido toca datos reales de la empresa, plata, secretos, APIs internas o mensajes a terceros. NO construyas nada: entregá el spec/prompt completo para que lo construya un humano tras aprobación.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        area: { type: "string" },
        prompt_completo: { type: "string", description: "Spec/prompt EXHAUSTIVO para construir la herramienta después: objetivo, usuarios, datos/tablas que tocaría, inputs, outputs, frecuencia, riesgos, criterios de aceptación." },
        motivo: { type: "string", description: "Por qué va al carril con OK (qué dato real/acción/secreto toca)." },
        mensaje: { type: "string", description: "Mensaje corto para el empleado explicando que quedó pendiente de aprobación y qué pasa después." },
      },
      required: ["titulo", "area", "prompt_completo", "motivo", "mensaje"],
    },
  },
];

const SYSTEM = `Sos el BUILDER del departamento IA de Rental Profits (holding de real estate: Fix & Flip, Rentas, Remodelación, Educación). Un empleado te describe una tarea; tu trabajo es ENTREVISTARLO y luego resolver por UNO de los dos carriles. Respondés SIEMPRE en español, claro y sin tecnicismos.

## ENTREVISTA (primero)
Cubrí estas bases con preguntas CORTAS, de a UNA por turno (usá la tool "preguntar"):
1. ¿Cuál es la tarea exactamente? (paso a paso si hace falta)
2. ¿Cada cuánto la hace y cuánto tiempo le lleva?
3. ¿Qué datos/inputs usa? (¿de dónde salen? ¿planilla, Airtable, de memoria?)
4. ¿Qué resultado espera? (documento, número, mensaje, checklist…)
5. Un ejemplo real concreto.
Repreguntá lo que falte, pero NO alargues: si con 2-3 respuestas ya está claro, avanzá. Máximo ~8 preguntas en total. No repitas preguntas ya respondidas.

## CLASIFICACIÓN (después)
- CARRIL LIBRE (tool "publicar_libre"): SOLO si la herramienta es 100% autocontenida — calculadora, generador de documento/texto/prompt, checklist, plantilla, conversor, simulador con datos que INGRESA EL USUARIO a mano. Cero datos reales de la empresa, cero red, cero secretos, cero acciones.
- CARRIL CON OK (tool "derivar_ok"): si toca CUALQUIERA de: datos reales de la empresa (Airtable, Supabase, QuickBooks, pagos, inquilinos, obras, alumnos), plata o decisiones financieras automatizadas, mensajes/emails/WhatsApp a terceros, APIs internas o externas, credenciales o secretos, o modificar sistemas existentes. ANTE LA DUDA → carril con OK. NUNCA generes HTML para estos casos.

## REGLAS DEL HTML (carril libre)
- Documento COMPLETO autocontenido: <!doctype html> + CSS y JS inline. PROHIBIDO: fetch/XHR/WebSocket, <script src>, CSS externo, imports, localStorage/sessionStorage/cookies/indexedDB, iframes, window.parent/top, postMessage. Nada de red ni almacenamiento: si necesita persistir, que el usuario copie/exporte el resultado.
- Diseño: tema CLARO, legible, profesional (fondo blanco/gris muy claro, tipografía system-ui, acentos azul/teal), responsive, labels en español. Compacto (<60KB si se puede).
- Funcional de verdad: validá inputs, mostrá resultados claros, incluí un ejemplo precargado si ayuda.
- "prompt_generador": escribí el prompt exhaustivo que regeneraría esta herramienta.

## HONESTIDAD
No inventes datos de la empresa ni números "de ejemplo" que parezcan reales. Si el empleado pide algo imposible en carril libre, explicáselo vía "derivar_ok" con un buen spec.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = await requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  const rl = await checkRateLimit(auth.user_id, 10, 15);
  if (!rl.ok) return json({ ok: false, error: "Límite de uso alcanzado (15 mensajes cada 10 min). Probá en un rato." }, 429);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const message = String(body.message || "").trim().slice(0, 6000);
  if (!message) return json({ ok: false, error: "message requerido" }, 400);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── Sesión: cargar (verificando dueño) o crear ──
  let session: any = null;
  if (body.session_id) {
    const { data } = await db.from("ia_sessions").select("*").eq("id", body.session_id).eq("activo", true).maybeSingle();
    if (data && data.user_id === auth.user_id && data.estado === "activa") session = data;
  }
  if (!session) {
    const { data, error } = await db.from("ia_sessions")
      .insert({ user_id: auth.user_id, solicitante: auth.email || null, area: body.area || null })
      .select("*").single();
    if (error) return json({ ok: false, error: "No pude crear la sesión: " + error.message }, 500);
    session = data;
  }

  const transcript: Array<{ role: string; content: string }> = Array.isArray(session.transcript) ? session.transcript : [];
  transcript.push({ role: "user", content: message });
  if (transcript.length > MAX_TURNS) return json({ ok: false, error: "La sesión se hizo muy larga. Empezá una nueva describiendo la tarea de una." }, 400);

  // ── Claude con tool-use forzado ──
  const result = await callAnthropic({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: transcript.map(t => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.content })),
    tools: TOOLS as any,
    user_id: auth.user_id,
    feature: "ia-builder",
    timeoutMs: 120000,
  });
  if (!result.ok) return json({ ok: false, error: result.error || "Error llamando a la IA" }, 502);

  // forzamos elección con tool_choice-like: buscamos el tool_use (si vino solo texto, lo tratamos como pregunta)
  const blocks = result.data?.content || [];
  const tu = blocks.find((b: any) => b.type === "tool_use");
  const plain = blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();

  const save = async (patch: any, reply: string) => {
    transcript.push({ role: "assistant", content: reply });
    await db.from("ia_sessions").update({ transcript, ...patch }).eq("id", session.id);
  };

  // ── PREGUNTAR (o texto suelto) ──
  if (!tu || tu.name === "preguntar") {
    const texto = (tu?.input?.texto || plain || "¿Me contás un poco más de la tarea?").trim();
    await save({}, texto);
    return json({ ok: true, action: "ask", texto, session_id: session.id });
  }

  // ── CARRIL LIBRE → validar + publicar ──
  if (tu.name === "publicar_libre") {
    const inp = tu.input || {};
    const val = validarHtmlLibre(String(inp.html || ""));
    if (!val.ok) {
      // Defensa en profundidad: degradar a spec pendiente, JAMÁS publicar
      const { data: spec } = await db.from("ia_specs").insert({
        user_id: auth.user_id, session_id: session.id, titulo: inp.titulo || "Herramienta degradada por validador",
        area: inp.area || session.area, prompt_completo: inp.prompt_generador || JSON.stringify(inp).slice(0, 8000),
        motivo: "Degradado por validador de seguridad: " + val.motivo,
        solicitante: auth.email || null, nota: "auto-degradado (el HTML no pasó el validador del carril libre)",
      }).select("id").single();
      const texto = "Por seguridad, esta herramienta necesita revisión de un admin antes de publicarse (" + val.motivo + "). Quedó guardada como pendiente de aprobación.";
      await save({ estado: "spec" }, texto);
      return json({ ok: true, action: "spec", texto, titulo: inp.titulo, motivo: val.motivo, spec_id: spec?.id || null, session_id: session.id });
    }
    const { data: art, error } = await db.from("ia_artifacts").insert({
      titulo: inp.titulo, area: inp.area || session.area, tipo: inp.tipo || null,
      descripcion: inp.resumen || null, carril: "libre", html: inp.html,
      prompt_generador: inp.prompt_generador || null, solicitante: auth.email || null, session_id: session.id,
    }).select("id,titulo,area,tipo,descripcion").single();
    if (error) return json({ ok: false, error: "No pude publicar: " + error.message }, 500);
    const texto = "✅ ¡Listo! Publiqué \"" + inp.titulo + "\" en la Galería. " + (inp.resumen || "");
    await save({ estado: "publicada", area: inp.area || session.area }, texto);
    return json({ ok: true, action: "published", texto, artifact: { ...art, html: inp.html }, session_id: session.id });
  }

  // ── CARRIL CON OK → guardar spec, avisar, NO ejecutar nada ──
  if (tu.name === "derivar_ok") {
    const inp = tu.input || {};
    const { data: spec, error } = await db.from("ia_specs").insert({
      user_id: auth.user_id, session_id: session.id, titulo: inp.titulo || "Pedido sin título",
      area: inp.area || session.area, prompt_completo: inp.prompt_completo || "",
      motivo: inp.motivo || null, solicitante: auth.email || null,
    }).select("id").single();
    if (error) return json({ ok: false, error: "No pude guardar el spec: " + error.message }, 500);
    const texto = (inp.mensaje || "Este pedido toca datos reales, así que necesita el OK de un admin. Ya quedó registrado con el spec completo — te avisan cuando esté construido.") +
      "\n\n🔒 Motivo: " + (inp.motivo || "toca datos/acciones reales");
    await save({ estado: "spec", area: inp.area || session.area }, texto);
    return json({ ok: true, action: "spec", texto, titulo: inp.titulo, motivo: inp.motivo, spec_id: spec?.id || null, session_id: session.id });
  }

  return json({ ok: false, error: "Acción desconocida de la IA" }, 500);
});
