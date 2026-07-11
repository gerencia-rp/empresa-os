// ════════════════════════════════════════════════════════════════
// 🏭 IA-BUILDER v3.1 "modo económico" — Fábrica de Artefactos (Guía Maestra v2).
// La entrevista corre ENTERA en Haiku (el modelo más barato): wizard de UNA
// pregunta por vez que llena la FICHA DEL ARTEFACTO (10 campos). Al completar,
// el SERVIDOR genera el PROMPT PODEROSO (plantilla maestra fija, costo cero)
// y lo guarda en ia_specs con la ficha:
//   carril libre → estado 'aprobado' (listo p/ construir en Claude Code)
//   carril ok    → estado 'pendiente' (aprobación humana; NUNCA se ejecuta)
// SIN auto-build por API (se quitó el build Opus + verificador de v3: el
// artefacto se construye en Claude Code pegando el prompt). La Galería sigue:
// los artefactos construidos se publican con RLS has_area('ia')/admin.
// Seguridad: requireAuth (JWT) + rate limit vía ai_calls.
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";
import { callAnthropic, checkRateLimit } from "../_shared/anthropic.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "claude-haiku-4-5-20251001"; // TODO el interrogatorio en el modelo más barato
const MAX_TURNS = 60;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

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

// ─── Tools: solo 2 — preguntar y finalizar ───
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
    name: "finalizar",
    description: "La ficha está COMPLETA (los 10 campos): cerrá la entrevista. El sistema genera el prompt de construcción a partir de tu ficha — NO construyas nada vos.",
    input_schema: {
      type: "object",
      properties: {
        ficha: { type: "object", properties: FICHA_PROPS, description: "Ficha completa con los 10 campos." },
        titulo: { type: "string", description: "Título del artefacto (= nombre de la ficha, pulido)." },
        area: { type: "string", description: "Fix & Flip | Rentas | Remodelación | Educación | Operación | Contable | Administración | Otro" },
        tipo: { type: "string", enum: ["prompt", "dashboard", "agente", "automatizacion"] },
        carril: { type: "string", enum: ["libre", "ok"], description: "libre=100% autocontenido (datos a mano del usuario); ok=toca datos reales/plata/terceros/APIs/secretos → necesita aprobación" },
        pasos: { type: "array", items: { type: "string" }, description: "El flujo del artefacto en 4-7 pasos cortos (para el diagrama)." },
        resumen: { type: "string", description: "2-3 frases en español simple: qué hace y qué recibe el empleado." },
      },
      required: ["ficha", "titulo", "area", "tipo", "carril", "pasos", "resumen"],
    },
  },
];

const SYSTEM = `Sos el ENTREVISTADOR de la Fábrica de Artefactos de Rental Profits (holding de real estate: Fix & Flip, Rentas, Remodelación, Educación). Guiás a empleados NO técnicos para convertir una tarea en la FICHA DEL ARTEFACTO. Español simple SIEMPRE, cero jerga, tono cercano. NO construís nada: tu único trabajo es completar la ficha con calidad.

## ENTREVISTA (tool "preguntar")
Llenás la FICHA (10 campos): 1 nombre · 2 trabajo en una frase ("Dado X, decide/entrega Y") · 3 quién/cuándo lo usa · 4 inputs y de dónde salen · 5 reglas/lógica · 6 resultado LÓGICO (una decisión o valor accionable, no solo datos) · 7 entregable · 8 dos-tres ejemplos de oro (entrada→salida) · 9 casos borde · 10 qué NO debe hacer.
- UNA pregunta por turno. Corta. Con opciones sugeridas si ayuda.
- En CADA llamada a "preguntar" mandá la ficha con TODO lo ya aprendido (aunque lo hayan dicho de pasada). No repreguntes lo que ya sabés.
- Sé PROFUNDO donde importa: las reglas y los ejemplos de oro son el corazón — verificá que los ejemplos cierren matemáticamente con las reglas; si un ejemplo no cierra, repreguntá.
- Si el empleado divaga, extraé lo útil y seguí. Completá vos los campos obvios. Ideal 5-8 preguntas, nunca más de 10.
- UN SOLO TRABAJO por artefacto: si piden dos cosas, proponé la más valiosa ahora y la otra para otro artefacto.

## CIERRE (tool "finalizar")
Cuando los 10 campos estén completos, llamá "finalizar" con la ficha + clasificación:
- carril LIBRE: 100% autocontenido — calculadora, generador de documento/texto, checklist, plantilla, simulador donde el empleado INGRESA los datos a mano. Cero datos reales de la empresa, cero red, cero secretos, cero acciones.
- carril CON OK: toca datos reales (Airtable, Supabase, QuickBooks, pagos, inquilinos, obras, alumnos), plata o decisiones financieras automáticas, mensajes a terceros (WhatsApp/email), APIs, credenciales, o modificar sistemas. ANTE LA DUDA → CON OK.
Recordá: PROHIBIDO hardcode (en la ficha, todo dato variable queda descrito como input del usuario) y el resultado debe ser una DECISIÓN o valor accionable.

## HONESTIDAD
No inventes datos de la empresa. No prometas cosas que el artefacto no va a hacer.`;

// ─── PROMPT PODEROSO — plantilla maestra (Guía v2), rellenada server-side ───
function promptPoderoso(f: any, meta: { titulo: string; area: string; tipo: string; carril: string; resumen: string }): string {
  const g = (k: string) => String((f && f[k]) || "—").trim();
  const lineas = [
    "# CONSTRUIR ARTEFACTO: " + meta.titulo,
    "(Prompt generado por la Fábrica de Artefactos de Empresa OS — Guía Maestra v2 · área: " + meta.area + " · tipo: " + meta.tipo + ")",
    "",
    "## Resumen",
    meta.resumen,
    "",
    "## 1. El trabajo (un solo trabajo)",
    g("trabajo"),
    "",
    "## 2. Quién lo usa y cuándo",
    g("quien_cuando"),
    "",
    "## 3. Inputs (SIEMPRE los carga el usuario a mano — PROHIBIDO hardcodearlos)",
    g("inputs"),
    "",
    "## 4. Reglas / lógica",
    g("reglas"),
    "",
    "## 5. Resultado lógico (decisión/valor accionable)",
    g("resultado"),
    "",
    "## 6. Entregable",
    g("entregable"),
    "",
    "## 7. Ejemplos de oro (el artefacto DEBE reproducirlos exacto)",
    g("ejemplos_oro"),
    "",
    "## 8. Casos borde",
    g("casos_borde"),
    "",
    "## 9. Qué NO debe hacer",
    g("no_debe"),
    "",
    "## Requisitos técnicos (OBLIGATORIOS)",
    "- Documento HTML COMPLETO y autocontenido (<!doctype html>…), CSS y JS inline, sin librerías externas.",
    "- PROHIBIDO: fetch/XHR/WebSocket, <script src>, CSS externo, localStorage/sessionStorage/cookies/indexedDB, iframes, window.parent/top, postMessage. Sin red y sin almacenamiento (se renderiza en un iframe sandbox).",
    "- PROHIBIDO HARDCODE: ningún dato del negocio quemado en el código — todo valor variable es un input. Solo constantes matemáticas/físicas.",
    "- Tema CLARO legible (fondo blanco/gris muy claro, system-ui, acentos azul/teal), responsive, labels en español.",
    "- Validar inputs con mensajes de error claros.",
    '- Botón "Cargar ejemplo" que precarga el primer ejemplo de oro. Botón copiar si el entregable es un texto/número.',
    "- ANTES de dar por terminado: correr el/los ejemplos de oro Y los casos borde contra la lógica — todos deben dar la salida esperada.",
    "",
    "## Entrega",
    "- Escribir también un INSTRUCTIVO paso a paso en español simple para no técnicos (incluí el ejemplo de oro resuelto).",
    "- Publicar en Empresa OS: insertar en la tabla `ia_artifacts` de Supabase (proyecto nezbaljfhhyznhltpjnk) con: titulo, area, tipo, carril='libre', html, instructivo, prompt_generador=este prompt, descripcion=resumen, ficha_json. (Escritura habilitada para gestores del área 'ia' / admin.)",
  ];
  if (meta.carril === "ok") {
    lineas.push("", "## ⚠️ CARRIL CON OK — NO CONSTRUIR SIN APROBACIÓN",
      "Este artefacto toca datos reales / plata / mensajes a terceros. NO se construye ni ejecuta sin el OK explícito del admin. Diseñar con un humano aprobando en el circuito, sin acciones automáticas a producción.");
  }
  return lineas.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = await requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  const rl = await checkRateLimit(auth.user_id, 10, 30);
  if (!rl.ok) return json({ ok: false, error: "Límite de uso alcanzado (30 mensajes cada 10 min). Probá en un rato." }, 429);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const message = String(body.message || "").trim().slice(0, 6000);
  if (!message) return json({ ok: false, error: "message requerido" }, 400);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── Sesión (continuable incluso tras generar el prompt, para ajustes) ──
  let session: any = null;
  if (body.session_id) {
    const { data } = await db.from("ia_sessions").select("*").eq("id", body.session_id).eq("activo", true).maybeSingle();
    if (data && data.user_id === auth.user_id && ["activa", "propuesta", "spec"].includes(data.estado)) session = data;
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

  const result = await callAnthropic({
    model: MODEL,
    max_tokens: 6000,
    system: SYSTEM,
    messages: transcript.map(t => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.content })),
    tools: TOOLS as any,
    user_id: auth.user_id,
    feature: "ia-builder",
    timeoutMs: 60000,
    maxRetries: 1,
  });
  if (!result.ok) return json({ ok: false, error: result.error || "Error llamando a la IA" }, 502);

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
    const ficha = tu?.input?.ficha || session.ficha_json || {};
    await save({ ficha_json: ficha, estado: "activa" }, texto);
    return json({ ok: true, action: "ask", texto, ficha, progreso: fichaProgreso(ficha), session_id: session.id });
  }

  // ── FINALIZAR → prompt poderoso server-side + spec en ia_specs ──
  if (tu.name === "finalizar") {
    const inp = tu.input || {};
    const ficha = inp.ficha || session.ficha_json || {};
    const meta = {
      titulo: String(inp.titulo || ficha.nombre || "Artefacto sin título"),
      area: String(inp.area || session.area || "Otro"),
      tipo: String(inp.tipo || "dashboard"),
      carril: inp.carril === "ok" ? "ok" : "libre",
      resumen: String(inp.resumen || ""),
    };
    const prompt = promptPoderoso(ficha, meta);
    const estadoSpec = meta.carril === "ok" ? "pendiente" : "aprobado";
    // upsert por sesión: si el empleado ajusta y re-finaliza, se pisa el mismo spec
    const { data: prev } = await db.from("ia_specs").select("id").eq("session_id", session.id).eq("activo", true).maybeSingle();
    const specRow = {
      user_id: auth.user_id, session_id: session.id, titulo: meta.titulo, area: meta.area,
      tipo: meta.tipo, carril: meta.carril, ficha_json: ficha, prompt_completo: prompt,
      estado: estadoSpec, solicitante: auth.email || null,
      motivo: meta.carril === "ok" ? "Clasificado carril CON OK por el entrevistador (toca datos reales/acciones)" : null,
    };
    let spec: any = null, err: any = null;
    if (prev) { const r = await db.from("ia_specs").update(specRow).eq("id", prev.id).select("id").single(); spec = r.data; err = r.error; }
    else { const r = await db.from("ia_specs").insert(specRow).select("id").single(); spec = r.data; err = r.error; }
    if (err) return json({ ok: false, error: "No pude guardar el spec: " + err.message }, 500);
    const texto = meta.carril === "ok"
      ? "📋 Ficha completa. Este artefacto toca datos reales, así que quedó registrado como PENDIENTE del OK de un admin — con el brief completo listo para construir cuando lo aprueben. Te avisan cuando esté."
      : "📋 ¡Ficha completa! Te generé el PROMPT PODEROSO acá abajo: copialo y pegalo en Claude Code para construir tu artefacto. También quedó guardado para el equipo. Si querés ajustar algo, decímelo y lo regenero.";
    await save({ estado: "spec", ficha_json: ficha, area: meta.area }, texto);
    return json({
      ok: true, action: "prompt", texto, prompt, ficha, progreso: fichaProgreso(ficha),
      titulo: meta.titulo, carril: meta.carril, tipo: meta.tipo, pasos: inp.pasos || [],
      resumen: meta.resumen, spec_id: spec?.id || null, estado_spec: estadoSpec, session_id: session.id,
    });
  }

  return json({ ok: false, error: "Acción desconocida de la IA" }, 500);
});
