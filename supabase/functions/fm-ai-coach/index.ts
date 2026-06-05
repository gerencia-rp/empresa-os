// FlipMentoría AI Coach
// - mode 'search': pregunta libre con respuesta citando documentos
// - mode 'diagnose': entrevista guiada → plan personalizado
// Usa prompt caching de Anthropic para mantener costo bajo
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!ANTHROPIC_KEY) return json({ ok: false, error: "Falta ANTHROPIC_API_KEY" }, 500);

  // Auth: previene DoS económico Anthropic
  const auth = await requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }

  const { mode = 'search', messages = [], student_id = null } = body;
  if (!Array.isArray(messages) || !messages.length) return json({ ok: false, error: "messages requerido" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Modo búsqueda: usar full-text search SQL para traer SOLO docs relevantes (max 3)
  // Modo diagnose: ya no se usa IA (wizard JS lo reemplaza)
  let docs: any[] = [];
  if (mode === 'search') {
    // Extraer query del último mensaje user
    const lastUser = [...messages].reverse().find((m: any) => m.role === 'user');
    const query = (lastUser?.content || '').slice(0, 300);

    // Sanitizar query para PostgREST .or() — coma, paréntesis y comilla rompen el parser
    // y permiten exfiltración de filas. Solo alfanumérico + espacios + acentos básicos.
    const safe = query.replace(/[^a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ\s]/g, ' ').trim().slice(0, 200);

    let searchData: any[] | null = null;
    if (safe) {
      const r = await supabase.from("fm_documents")
        .select("etapa,categoria,codigo,titulo,subtitulo,contenido_md,posicion")
        .or(`titulo.ilike.%${safe}%,subtitulo.ilike.%${safe}%,contenido_md.ilike.%${safe}%`)
        .order("posicion")
        .limit(3);
      searchData = r.data;
    }
    docs = searchData || [];

    // Si no encontró nada con ilike, traer índice + 1 doc por etapa más probable
    if (!docs.length) {
      const { data: fallback } = await supabase.from("fm_documents")
        .select("etapa,categoria,codigo,titulo,subtitulo,contenido_md,posicion")
        .in('categoria', ['indice', 'lista_tareas', 'mindset'])
        .order("posicion")
        .limit(3);
      docs = fallback || [];
    }
  } else {
    // diagnose mode (legacy — no se usa) — traer solo diagnostico + perfiles
    const { data: diagDocs } = await supabase.from("fm_documents")
      .select("etapa,categoria,codigo,titulo,subtitulo,contenido_md,posicion")
      .in('categoria', ['diagnostico', 'perfiles'])
      .order("posicion");
    docs = diagDocs || [];
  }

  // Construir context COMPACTO con solo los docs relevantes
  let contextStr = "";
  for (const d of docs) {
    contextStr += `\n\n═══════════════════════════════════════════════════════════\n`;
    contextStr += `[DOCUMENTO · etapa=${d.etapa} · categoria=${d.categoria}${d.codigo ? ` · codigo=${d.codigo}` : ''}]\n`;
    contextStr += `TÍTULO: ${d.titulo}\n`;
    if (d.subtitulo) contextStr += `SUBTÍTULO: ${d.subtitulo}\n`;
    // Truncar a 40KB por doc max (suficiente para responder con citas)
    const truncated = (d.contenido_md || '').length > 40000 ? (d.contenido_md || '').slice(0, 40000) + '\n\n...[truncado por tamaño]' : (d.contenido_md || '');
    contextStr += `\n${truncated}\n`;
  }
  const contextChars = contextStr.length;

  // System prompt según modo
  let systemPrompt = "";
  if (mode === 'diagnose') {
    systemPrompt = `Eres el coach IA de FlipMentoría, especializado en metodología E0-E5 para Fix & Flip en USA.

Tu trabajo en este modo (DIAGNÓSTICO) es:
1. Conducir una entrevista CONVERSACIONAL con el estudiante (NO disparar las 8 preguntas de una vez)
2. Hacer preguntas UNA POR VEZ, esperando respuesta antes de la siguiente
3. Adaptar el siguiente paso según la respuesta anterior
4. Identificar exactamente en qué etapa del método (E0/E1/E2/E3/E4/E5) está el estudiante
5. Cuando tengas suficiente info (típicamente 6-10 turnos), generar el PLAN PERSONALIZADO

Sigue ESTRICTAMENTE el cuestionario del documento "🎯 Cuestionario de Diagnóstico Inicial":
- Bloque 1: Resultado deseado (1-3 preguntas)
- Bloque 2: Capital y financiamiento (2-3 preguntas)
- Bloque 3: Fundación legal E0 (1-2 preguntas)
- Bloque 4: Capacidad de evaluación E1 (si aplica)
- Bloque 5: Red operativa E2 (si aplica)
- Bloques 6-8: solo si el estudiante ya tiene deal activo / cerró deals

Y usa los 8 perfiles del documento "🗺️ Estados del Estudiante" para identificar el perfil del estudiante.

OUTPUT FINAL (cuando termines la entrevista):
Genera un PLAN PERSONALIZADO con este formato exacto:

═══════════════════════════════════════════════════════════
PLAN PERSONALIZADO — [Nombre o "Estudiante"]
═══════════════════════════════════════════════════════════

DIAGNÓSTICO:
- Etapa actual: [E0 / E1 / E2 / E3 / E4 / E5]
- Perfil identificado: [De los 8 perfiles]
- Resultado objetivo: [Lo que respondió]
- Mercado: [Estado/Ciudad]
- Capital disponible: [Rango]
- Cronograma esperado: [6-9 meses / 9-12 / 12-18 / 18+]

FORTALEZAS:
✓ [Lista de lo que ya tiene]

GAPS PRIORITARIOS (4 semanas):
1. Tarea [E.X.Y] — [Título de la tarea] — [Por qué es prioritaria]
2. Tarea [E.X.Y] — [...]
3. Tarea [E.X.Y] — [...]

QUICK WIN SUGERIDO (semana 1):
[Acción concreta + cuál de las 4 opciones de E0.2.3]

CONTACTOS A ACTIVAR (de Documento A — Base de Contactos):
- [Nombre empresa específico] — [Para qué]
- [...]

PLATAFORMAS A SETUPEAR (de Documento B — Stack):
- [Nombre plataforma] — [Para qué]
- [...]

CALCULADORAS A DESCARGAR (de Anexo B):
- B.X — [Nombre calculadora]
- [...]

LECTURA RECOMENDADA:
- [Sección específica de Anexo A, B o C]

PRIMER HITO MEDIBLE (30 días):
- [Hito cuantitativo específico]

═══════════════════════════════════════════════════════════

REGLAS CRÍTICAS:
- NUNCA inventes tareas, contactos o calculadoras. Solo usa las que están en la metodología.
- Cita códigos exactos (E0.1.1, B.3, C.2 etc.)
- Tono directo, profesional, accionable. Sin adulación.
- Si el estudiante responde algo ambiguo, repreguntá para clarificar.
- Si el estudiante quiere saltar al plan sin responder, hazle 3 preguntas mínimas (objetivo, mercado, capital) y genera plan parcial advirtiendo que es preliminar.`;
  } else {
    // mode === 'search'
    systemPrompt = `Eres el coach IA de FlipMentoría, asistente especializado en metodología E0-E5 para Fix & Flip en USA.

Tu trabajo en este modo (BÚSQUEDA / Q&A) es:
1. Responder preguntas específicas del coach o estudiante basándote ÚNICAMENTE en la metodología proporcionada
2. Citar SIEMPRE el documento + código de tarea/sección cuando aplique
3. Si la pregunta no se puede responder con la metodología, decirlo explícitamente (no inventar)
4. Estructurar respuestas con: respuesta directa primero → detalle → citas

FORMATO DE RESPUESTA:

[Respuesta directa en 1-2 oraciones]

[Detalle estructurado con bullets, números o párrafos cortos]

📚 **Fuentes en la metodología:**
- Tarea [E.X.Y]: [Título]
- Anexo [X]: [Sección]
- Documento [A/B/C]: [Sub-sección]

REGLAS CRÍTICAS:
- NUNCA inventes información que no esté en la metodología.
- Cita códigos exactos (E0.1.1, B.3, C.2, etc.)
- Si el coach pregunta algo fuera de scope (ej: "¿qué piensas del mercado de cripto?"), recordá amablemente que sos un coach de Fix & Flip y reconducí.
- Tono directo, sin adulación. Profesional pero accesible.
- Si la pregunta es ambigua, hacé 1 contrapregunta para clarificar.
- Respuestas concisas pero completas. Bullets > párrafos largos.`;
  }

  // Anthropic API call con prompt caching
  const startMs = Date.now();
  const requestBody = {
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: systemPrompt
      },
      {
        type: "text",
        text: "\n\n═══════════════════════════════════════════════════════════\n📚 METODOLOGÍA COMPLETA DE FLIPMENTORÍA (cached):\n═══════════════════════════════════════════════════════════\n" + contextStr,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: messages
  };

  const callResult = await callAnthropic({
    model: requestBody.model,
    max_tokens: requestBody.max_tokens,
    system: requestBody.system,
    messages: requestBody.messages,
    user_id: auth.user_id,
    feature: `fm-coach-${mode}`,
    timeoutMs: 60000,
    maxRetries: 2
  });
  const durationMs = callResult.duration_ms || (Date.now() - startMs);

  if (!callResult.ok) {
    return json({ ok: false, error: callResult.error }, callResult.status || 500);
  }

  const tokensIn = callResult.tokens_in || 0;
  const tokensOut = callResult.tokens_out || 0;
  const cacheCreate = callResult.cache_creation || 0;
  const cacheRead = callResult.cache_read || 0;
  const responseText = extractText(callResult.data);

  return json({
    ok: true,
    mode,
    response: responseText,
    tokens: { input: tokensIn, output: tokensOut, cache_create: cacheCreate, cache_read: cacheRead },
    duration_ms: durationMs,
    context_chars: contextChars,
    docs_count: docs.length
  });
});
