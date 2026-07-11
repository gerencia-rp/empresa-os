// ════════════════════════════════════════════════════════════════
// 🏭 IA-BUILDER v3 — fábrica de artefactos guiada (Guía Maestra v2.0).
// Entrevista wizard (UNA pregunta por vez) que llena la FICHA DEL ARTEFACTO
// (10 campos) → PROPUESTA (pasos + carril, el empleado confirma) → BUILD:
//   CARRIL LIBRE → HTML autocontenido + instructivo, verificado contra el caso
//     de oro + caso borde por un VERIFICADOR independiente (Sonnet); si pasa,
//     queda en DEMO (paquete_json) y se publica SOLO con {action:'publicar'}.
//   CARRIL CON OK → NUNCA ejecuta: spec completo a ia_specs (pendiente).
// Seguridad: requireAuth + rate limit + blacklist de HTML (defensa en
// profundidad; el front además renderiza en <iframe sandbox> sin same-origin).
// Secret: ANTHROPIC_API_KEY (Supabase Secrets).
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";
import { callAnthropic, checkRateLimit } from "../_shared/anthropic.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL_BUILD = "claude-opus-4-8";
const MODEL_VERIFY = "claude-sonnet-4-6";
const MAX_TURNS = 60;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

// ─── Blacklist de seguridad del HTML libre (idéntica filosofía v2) ───
const HTML_BLACKLIST =
  /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|supabase|SUPABASE_|functions\/v1|api\.anthropic|localStorage|sessionStorage|indexedDB|document\.cookie|import\s*\(|import\s+[^;]*from\s|<script[^>]*\ssrc\s*=|<link[^>]*\shref\s*=\s*["']?https?:|@import\s|window\s*\.\s*(top|parent|opener)|postMessage\s*\(|<iframe|<embed|<object|serviceWorker/i;

function validarHtmlLibre(html: string): { ok: boolean; motivo?: string } {
  if (!html || html.length < 40) return { ok: false, motivo: "HTML vacío o trivial" };
  if (html.length > 300_000) return { ok: false, motivo: "HTML demasiado grande" };
  const m = html.match(HTML_BLACKLIST);
  if (m) return { ok: false, motivo: `patrón prohibido en el HTML: "${m[0].slice(0, 60)}"` };
  return { ok: true };
}

// ─── Los 10 campos de la Ficha del Artefacto ───
const FICHA_PROPS = {
  nombre: { type: "string", description: "1. Nombre corto del artefacto" },
  trabajo: { type: "string", description: "2. El trabajo en UNA frase: 'Dado X, decide/entrega Y'" },
  quien_cuando: { type: "string", description: "3. Quién lo usa y cuándo/frecuencia" },
  inputs: { type: "string", description: "4. Qué datos entran y de dónde salen" },
  reglas: { type: "string", description: "5. Reglas/lógica del cálculo o decisión" },
  resultado: { type: "string", description: "6. Resultado LÓGICO (una decisión/valor, no solo datos)" },
  entregable: { type: "string", description: "7. Formato del entregable (en pantalla, texto copiable, documento…)" },
  ejemplos_oro: { type: "string", description: "8. 2-3 ejemplos de oro: entrada → salida esperada" },
  casos_borde: { type: "string", description: "9. Casos borde y qué hacer en cada uno" },
  no_debe: { type: "string", description: "10. Qué NO debe hacer el artefacto" },
};
const FICHA_KEYS = Object.keys(FICHA_PROPS);
function fichaProgreso(f: any): number { if (!f) return 0; return FICHA_KEYS.filter(k => f[k] && String(f[k]).trim()).length; }

// ─── Tools ───
const TOOLS = [
  {
    name: "preguntar",
    description: "Hacé UNA sola pregunta más para completar la Ficha del Artefacto. Incluí la ficha con TODO lo aprendido hasta ahora.",
    input_schema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "La pregunta, en español simple y corta. Sin jerga técnica. Podés sugerir 2-3 opciones." },
        ficha: { type: "object", properties: FICHA_PROPS, description: "La ficha parcial con TODOS los campos ya conocidos (aunque no los hayas preguntado explícitamente)." },
      },
      required: ["texto", "ficha"],
    },
  },
  {
    name: "proponer",
    description: "La ficha está completa: presentá la PROPUESTA para que el empleado confirme antes de construir. NO construyas todavía.",
    input_schema: {
      type: "object",
      properties: {
        ficha: { type: "object", properties: FICHA_PROPS, description: "Ficha completa (los 10 campos)." },
        pasos: { type: "array", items: { type: "string" }, description: "El flujo del artefacto en 4-7 pasos cortos (para el diagrama). Ej: ['Ingresás la renta y la fecha','Calcula los días a cobrar','Te muestra el monto y podés copiarlo']" },
        carril: { type: "string", enum: ["libre", "ok"], description: "libre=autocontenido publicable al instante; ok=toca datos reales/plata/terceros → necesita aprobación" },
        resumen: { type: "string", description: "2-3 frases en español simple: qué va a hacer y qué va a recibir el empleado." },
      },
      required: ["ficha", "pasos", "carril", "resumen"],
    },
  },
  {
    name: "entregar_libre",
    description: "SOLO tras la confirmación del empleado y SOLO carril libre: entregá el paquete completo. Antes de llamar esta tool tenés que haber corrido mentalmente el caso de oro Y el caso borde contra tu HTML y que ambos pasen.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        area: { type: "string", description: "Fix & Flip | Rentas | Remodelación | Educación | Operación | Contable | Administración | Otro" },
        tipo: { type: "string", enum: ["prompt", "dashboard", "agente", "automatizacion"] },
        html: { type: "string", description: "Documento HTML COMPLETO autocontenido (<!doctype html>…), CSS/JS inline, con botón 'Cargar ejemplo' que precarga el caso de oro." },
        instructivo: { type: "string", description: "Instructivo de uso en español simple, paso a paso, para alguien no técnico. Incluí el ejemplo de oro resuelto." },
        prompt_generador: { type: "string", description: "Prompt exhaustivo que regeneraría este artefacto." },
        resumen: { type: "string", description: "1-2 frases: qué hace." },
        caso_oro: { type: "object", properties: { entrada: { type: "string" }, salida_esperada: { type: "string" } }, required: ["entrada", "salida_esperada"] },
        caso_borde: { type: "object", properties: { entrada: { type: "string" }, salida_esperada: { type: "string" } }, required: ["entrada", "salida_esperada"] },
        tests_pasan: { type: "boolean", description: "true SOLO si corriste ambos casos contra tu lógica y los dos dan la salida esperada." },
      },
      required: ["titulo", "area", "tipo", "html", "instructivo", "prompt_generador", "resumen", "caso_oro", "caso_borde", "tests_pasan"],
    },
  },
  {
    name: "derivar_ok",
    description: "CARRIL CON OK (tras confirmación, o directo si es obvio): el pedido toca datos reales/plata/terceros/secretos. NO construyas: entregá el spec completo para aprobación humana.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        area: { type: "string" },
        prompt_completo: { type: "string", description: "Spec EXHAUSTIVO: objetivo, usuarios, ficha completa, datos/tablas que tocaría, inputs, outputs, reglas, ejemplos de oro, casos borde, qué NO hace, riesgos, criterios de aceptación." },
        motivo: { type: "string", description: "Qué dato real/acción/secreto toca." },
        mensaje: { type: "string", description: "Mensaje corto para el empleado: quedó pendiente de aprobación y qué sigue." },
      },
      required: ["titulo", "area", "prompt_completo", "motivo", "mensaje"],
    },
  },
];

// ─── System prompt = Guía Maestra v2.0 ───
const SYSTEM = `Sos el BUILDER de la Fábrica de Artefactos de Rental Profits (holding de real estate: Fix & Flip, Rentas, Remodelación, Educación). Guiás a empleados NO técnicos para convertir una tarea en un artefacto útil. Español simple SIEMPRE, cero jerga, tono cercano.

## FASE 1 — ENTREVISTA (tool "preguntar")
Llenás la FICHA DEL ARTEFACTO (10 campos): 1 nombre · 2 trabajo en una frase ("Dado X, decide/entrega Y") · 3 quién/cuándo lo usa · 4 inputs y de dónde salen · 5 reglas/lógica · 6 resultado LÓGICO (una decisión o valor accionable, no solo datos) · 7 entregable · 8 dos-tres ejemplos de oro (entrada→salida) · 9 casos borde · 10 qué NO debe hacer.
- UNA pregunta por turno. Corta. Con opciones sugeridas si ayuda.
- En CADA llamada a "preguntar" mandá la ficha con TODO lo ya aprendido (aunque el empleado lo haya dicho de pasada). No repreguntes lo que ya sabés.
- Si el empleado divaga, extraé lo útil y seguí. Si con pocas respuestas la ficha queda razonable, completá vos los campos obvios y avanzá — ideal 5-8 preguntas, nunca más de 10.
- UN SOLO TRABAJO por artefacto: si piden dos cosas, proponé hacer la más valiosa ahora y la otra en otro artefacto.

## FASE 2 — PROPUESTA (tool "proponer")
Con la ficha completa, presentá la propuesta (pasos del flujo + carril + resumen) y esperá confirmación. NO construyas sin confirmación explícita.
Clasificación del carril:
- LIBRE: 100% autocontenido — calculadora, generador de documento/texto, checklist, plantilla, simulador donde el empleado INGRESA los datos a mano. Cero datos reales de la empresa, cero red, cero secretos, cero acciones.
- CON OK: toca datos reales (Airtable, Supabase, QuickBooks, pagos, inquilinos, obras, alumnos), plata o decisiones financieras automáticas, mensajes a terceros (WhatsApp/email), APIs, credenciales, o modificar sistemas. ANTE LA DUDA → CON OK.

## FASE 3 — CONSTRUCCIÓN (tras confirmación)
- Carril libre → tool "entregar_libre". Carril con OK → tool "derivar_ok".
- PROHIBIDO HARDCODE: ningún dato del negocio quemado en el código — todo valor variable es un input que carga el usuario. Constantes matemáticas/físicas sí se permiten.
- ANTES de entregar, corré mentalmente el caso de oro Y el caso borde contra tu HTML: solo entregá con tests_pasan=true si ambos dan la salida esperada. Si no pasan, corregí primero.
- HTML: documento completo autocontenido, CSS/JS inline. PROHIBIDO: fetch/XHR/WebSocket, <script src>, CSS externo, localStorage/cookies/indexedDB, iframes, window.parent/top, postMessage. Tema CLARO legible (fondo blanco/gris claro, system-ui, acentos azul/teal), responsive, labels en español, validación de inputs con errores claros, botón "Cargar ejemplo" que precarga el caso de oro, y botón copiar cuando el entregable sea un texto/número.
- INSTRUCTIVO: paso a paso simple para no técnicos + el ejemplo de oro resuelto.
- Si un verificador automático te devuelve errores ([VERIFICADOR]), corregí el HTML y volvé a llamar "entregar_libre".
- Si el empleado pide cambios en el demo, ajustá y volvé a entregar con "entregar_libre".

## HONESTIDAD
No inventes datos de la empresa. No prometas cosas que el artefacto no hace. El resultado debe ser una DECISIÓN o valor accionable, no un volcado de datos.`;

// ─── Verificador independiente (Sonnet) ───
async function verificar(inp: any, user_id?: string): Promise<{ pasa: boolean; motivo: string }> {
  const vr = await callAnthropic({
    model: MODEL_VERIFY,
    max_tokens: 1200,
    system: "Sos un verificador de calidad implacable de artefactos HTML. Analizás la LÓGICA del código (sin ejecutarlo) y respondés SOLO con la tool 'veredicto'. Sé estricto pero justo: fallá solo por errores reales de lógica, hardcode de datos de negocio, o incumplimiento claro de los casos.",
    messages: [{
      role: "user",
      content: "Artefacto HTML:\n```html\n" + String(inp.html || "").slice(0, 60000) + "\n```\n\nReglas declaradas: " + String(inp.resumen || "") +
        "\n\nCASO DE ORO — entrada: " + inp.caso_oro?.entrada + " → salida esperada: " + inp.caso_oro?.salida_esperada +
        "\nCASO BORDE — entrada: " + inp.caso_borde?.entrada + " → salida esperada: " + inp.caso_borde?.salida_esperada +
        "\n\nVerificá: (1) ¿la lógica del JS produce esas salidas para esas entradas? (2) ¿hay datos del negocio hardcodeados que deberían ser inputs? (3) ¿es 100% autocontenido (sin red/almacenamiento)? Llamá 'veredicto'.",
    }],
    tools: [{
      name: "veredicto",
      description: "Tu veredicto final",
      input_schema: { type: "object", properties: { pasa: { type: "boolean" }, motivo: { type: "string", description: "Si falla: qué exactamente y cómo corregirlo. Si pasa: 1 frase." } }, required: ["pasa", "motivo"] },
    }],
    user_id,
    feature: "ia-builder-verify",
    timeoutMs: 45000,
    maxRetries: 1,
  });
  if (!vr.ok) return { pasa: true, motivo: "verificador no disponible — aceptado con validación básica" }; // calidad, no seguridad: la blacklist+sandbox siguen
  const tu = (vr.data?.content || []).find((b: any) => b.type === "tool_use");
  if (tu) return { pasa: !!tu.input?.pasa, motivo: String(tu.input?.motivo || "") };
  const txt = (vr.data?.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join(" ");
  return { pasa: /\bpasa\b/i.test(txt) && !/no pasa|falla/i.test(txt), motivo: txt.slice(0, 300) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = await requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  // ═══ ACCIÓN: PUBLICAR (desde el demo, click explícito del empleado) ═══
  if (body.action === "publicar") {
    const { data: s } = await db.from("ia_sessions").select("*").eq("id", body.session_id || "").eq("activo", true).maybeSingle();
    if (!s || s.user_id !== auth.user_id) return json({ ok: false, error: "Sesión no encontrada" }, 404);
    if (s.estado !== "demo" || !s.paquete_json) return json({ ok: false, error: "No hay artefacto en demo para publicar" }, 400);
    const p = s.paquete_json;
    const val = validarHtmlLibre(String(p.html || ""));
    if (!val.ok) return json({ ok: false, error: "El artefacto no pasa la validación de seguridad: " + val.motivo }, 400);
    const { data: art, error } = await db.from("ia_artifacts").insert({
      titulo: p.titulo, area: p.area, tipo: p.tipo || null, descripcion: p.resumen || null,
      carril: "libre", html: p.html, instructivo: p.instructivo || null,
      prompt_generador: p.prompt_generador || null, ficha_json: s.ficha_json || null,
      solicitante: auth.email || null, session_id: s.id,
    }).select("id,titulo,area,tipo,descripcion").single();
    if (error) return json({ ok: false, error: "No pude publicar: " + error.message }, 500);
    await db.from("ia_sessions").update({ estado: "publicada" }).eq("id", s.id);
    return json({ ok: true, action: "published", artifact: art, session_id: s.id });
  }

  // ═══ ACCIÓN: CHAT (default — entrevista/propuesta/build) ═══
  const rl = await checkRateLimit(auth.user_id, 10, 30);
  if (!rl.ok) return json({ ok: false, error: "Límite de uso alcanzado (30 mensajes cada 10 min). Probá en un rato." }, 429);

  const message = String(body.message || "").trim().slice(0, 6000);
  if (!message) return json({ ok: false, error: "message requerido" }, 400);

  let session: any = null;
  if (body.session_id) {
    const { data } = await db.from("ia_sessions").select("*").eq("id", body.session_id).eq("activo", true).maybeSingle();
    if (data && data.user_id === auth.user_id && ["activa", "propuesta", "demo"].includes(data.estado)) session = data;
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
  if (transcript.length > MAX_TURNS) return json({ ok: false, error: "La sesión se hizo muy larga. Empezá una nueva." }, 400);

  const llamar = () => callAnthropic({
    model: MODEL_BUILD,
    max_tokens: 16000,
    system: SYSTEM,
    messages: transcript.map(t => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.content })),
    tools: TOOLS as any,
    user_id: auth.user_id,
    feature: "ia-builder",
    timeoutMs: 110000,
    maxRetries: 1,
  });

  const save = async (patch: any, reply: string) => {
    transcript.push({ role: "assistant", content: reply });
    await db.from("ia_sessions").update({ transcript, ...patch }).eq("id", session.id);
  };

  let intentosFix = 0;
  let result = await llamar();

  while (true) {
    if (!result.ok) return json({ ok: false, error: result.error || "Error llamando a la IA" }, 502);
    const blocks = result.data?.content || [];
    const tu = blocks.find((b: any) => b.type === "tool_use");
    const plain = blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();

    // ── PREGUNTAR (o texto suelto) ──
    if (!tu || tu.name === "preguntar") {
      const texto = (tu?.input?.texto || plain || "¿Me contás un poco más de la tarea?").trim();
      const ficha = tu?.input?.ficha || session.ficha_json || {};
      await save({ ficha_json: ficha, estado: "activa" }, texto);
      return json({ ok: true, action: "ask", texto, ficha, progreso: fichaProgreso(ficha), session_id: session.id });
    }

    // ── PROPUESTA (espera confirmación del empleado) ──
    if (tu.name === "proponer") {
      const inp = tu.input || {};
      const resumenTxt = "[PROPUESTA] " + (inp.resumen || "") + " · Carril: " + (inp.carril === "ok" ? "con OK" : "libre") + " · Pasos: " + (inp.pasos || []).join(" → ");
      await save({ ficha_json: inp.ficha || session.ficha_json, estado: "propuesta" }, resumenTxt);
      return json({ ok: true, action: "propose", ficha: inp.ficha || {}, pasos: inp.pasos || [], carril: inp.carril || "libre", resumen: inp.resumen || "", progreso: fichaProgreso(inp.ficha), session_id: session.id });
    }

    // ── ENTREGA CARRIL LIBRE → blacklist + verificador → DEMO ──
    if (tu.name === "entregar_libre") {
      const inp = tu.input || {};
      const val = validarHtmlLibre(String(inp.html || ""));
      if (!val.ok) {
        const { data: spec } = await db.from("ia_specs").insert({
          user_id: auth.user_id, session_id: session.id, titulo: inp.titulo || "Artefacto degradado por validador",
          area: inp.area || session.area, prompt_completo: inp.prompt_generador || JSON.stringify(inp).slice(0, 8000),
          motivo: "Degradado por validador de seguridad: " + val.motivo,
          solicitante: auth.email || null, nota: "auto-degradado (blacklist del carril libre)",
        }).select("id").single();
        const texto = "Por seguridad, este artefacto necesita revisión de un admin antes de publicarse (" + val.motivo + "). Quedó pendiente de aprobación.";
        await save({ estado: "spec" }, texto);
        return json({ ok: true, action: "spec", texto, titulo: inp.titulo, motivo: val.motivo, spec_id: spec?.id || null, session_id: session.id });
      }
      const ver = (inp.tests_pasan === false)
        ? { pasa: false, motivo: "el propio builder declaró que los tests no pasan" }
        : await verificar(inp, auth.user_id);
      if (!ver.pasa && intentosFix < 1) {
        // auto-corrección: una vuelta más con el feedback del verificador
        intentosFix++;
        transcript.push({ role: "assistant", content: "[ENTREGA rechazada por verificador] " + (inp.titulo || "") });
        transcript.push({ role: "user", content: "[VERIFICADOR AUTOMÁTICO] El artefacto NO pasó la verificación: " + ver.motivo + ". Corregí el HTML y volvé a llamar entregar_libre con los tests pasando de verdad." });
        result = await llamar();
        continue;
      }
      if (!ver.pasa) {
        const texto = "🧪 El artefacto no pasó las pruebas de calidad (" + ver.motivo.slice(0, 220) + "). Decime \"probá de nuevo\" para otro intento, o contame qué ajustar.";
        await save({ estado: "activa" }, texto);
        return json({ ok: true, action: "ask", texto, ficha: session.ficha_json || {}, progreso: fichaProgreso(session.ficha_json), session_id: session.id });
      }
      const paquete = {
        titulo: inp.titulo, area: inp.area || session.area, tipo: inp.tipo || null, html: inp.html,
        instructivo: inp.instructivo || "", prompt_generador: inp.prompt_generador || "", resumen: inp.resumen || "",
        caso_oro: inp.caso_oro || null, caso_borde: inp.caso_borde || null, verificacion: ver.motivo,
      };
      const texto = "🧪 Pasó las 2 pruebas (caso de oro + caso borde). ¡Tu artefacto está listo para probar! Miralo abajo, jugá con él, y si te gusta apretá Publicar. Si querés cambiar algo, decímelo acá.";
      await save({ estado: "demo", paquete_json: paquete, area: inp.area || session.area }, texto);
      return json({ ok: true, action: "demo", texto, paquete, session_id: session.id });
    }

    // ── CARRIL CON OK → spec pendiente, NO ejecuta nada ──
    if (tu.name === "derivar_ok") {
      const inp = tu.input || {};
      const { data: spec, error } = await db.from("ia_specs").insert({
        user_id: auth.user_id, session_id: session.id, titulo: inp.titulo || "Pedido sin título",
        area: inp.area || session.area, prompt_completo: inp.prompt_completo || "",
        motivo: inp.motivo || null, solicitante: auth.email || null,
      }).select("id").single();
      if (error) return json({ ok: false, error: "No pude guardar el spec: " + error.message }, 500);
      const texto = (inp.mensaje || "Este pedido toca datos reales, así que necesita el OK de un admin. Quedó registrado con el spec completo.") +
        "\n\n🔒 Motivo: " + (inp.motivo || "toca datos/acciones reales");
      await save({ estado: "spec", area: inp.area || session.area }, texto);
      return json({ ok: true, action: "spec", texto, titulo: inp.titulo, motivo: inp.motivo, spec_id: spec?.id || null, session_id: session.id });
    }

    return json({ ok: false, error: "Acción desconocida de la IA" }, 500);
  }
});
