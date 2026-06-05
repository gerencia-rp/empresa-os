// Genera estructura de presentación con Claude + web_search nativo (data live verificable).
// Devuelve JSON con slides estructurados listos para que el frontend arme el PPTX.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

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
  if (!ANTHROPIC_KEY) return json({ ok: false, error: "Falta ANTHROPIC_API_KEY en Supabase secrets" }, 500);

  // Auth: requiere user logueado (evita DoS económico de la cuenta Anthropic)
  const auth = await requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  // Forzar user_id desde el JWT (no aceptar el del body por seguridad)
  body.user_id = auth.user_id;

  const {
    mentorship_id,
    title,
    topic,
    audience = "estudiantes de mentoría",
    presentation_type = "class",
    class_number,
    duration_min = 60,
    slides_count = 15,
    language = "es",
    outline_hint,
    require_live_data = true,
    research_mode = false,            // 🔬 Modo investigación profunda (extended thinking + 25 searches)
    domain = "real-estate",
    preferred_sources,
    geographic_focus,
    user_id
  } = body;

  if (!title || !topic) return json({ ok: false, error: "title y topic son requeridos" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const today = new Date().toISOString().split("T")[0];

  // Contexto de la mentoría (si aplica)
  let mentorshipContext = "";
  if (mentorship_id) {
    const { data: m } = await supabase.from("edu_mentorships").select("name,description,stages").eq("id", mentorship_id).single();
    if (m) mentorshipContext = `\n\nCONTEXTO DE LA MENTORÍA: "${m.name}" — ${m.description}\nEtapas del programa: ${(m.stages||[]).map((s:any)=>s.name).join(', ')}`;
  }

  // Catálogo de fuentes confiables por dominio
  const sourcesByDomain: Record<string, string> = {
    'real-estate': 'Redfin, Zillow, Realtor.com, FRED (St. Louis Fed), NAR (National Association of Realtors), HUD, IRS, Texas Comptroller, Travis CAD, MLS reports, Freddie Mac PMMS, Bankrate, Mortgage News Daily',
    'marketing': 'HubSpot Research, Statista, eMarketer, Pew Research, Nielsen, Sensor Tower, similarweb, Google Trends, Meta Business Insights, Backlinko studies',
    'finance': 'FRED (St. Louis Fed), SEC EDGAR, Bloomberg, WSJ, Investopedia, Morningstar, S&P Global, Federal Reserve, IMF, World Bank',
    'tech': 'TechCrunch research, Gartner, IDC, CB Insights, Crunchbase, Statista, GitHub State of Octoverse, Stack Overflow Developer Survey, Pew Research Tech',
    'sales': 'HubSpot Sales Benchmark, Salesforce State of Sales, Gong.io research, McKinsey B2B reports, Forrester, Outreach.io insights',
    'leadership': 'Harvard Business Review, McKinsey Quarterly, Bain & Company, BCG insights, MIT Sloan Review, Deloitte Insights, Gallup workplace research',
    'general': 'Pew Research, Statista, Our World in Data, World Bank Open Data, Reuters, AP News, university research papers'
  };
  const trustedSources = sourcesByDomain[domain] || sourcesByDomain.general;
  const geoNote = geographic_focus
    ? `\n- Foco geográfico: ${geographic_focus}`
    : (domain === 'real-estate' ? '\n- Foco geográfico default: Texas (Austin/Houston/Dallas) salvo que el tema indique otra cosa' : '');

  // Prompt adaptive
  const prompt = `Eres un creador de presentaciones de élite para audiencias profesionales. Hoy es ${today}.

TAREA: armar una presentación de ${slides_count} slides para una clase/taller/webinar.

INPUT:
- Título: "${title}"
- Tema: ${topic}
- Dominio temático: ${domain}
- Audiencia: ${audience}
- Tipo: ${presentation_type}${class_number ? ` (clase #${class_number})` : ''}
- Duración: ${duration_min} minutos
- Idioma: ${language}${mentorshipContext}${geoNote}
${outline_hint ? `\n- Outline sugerido por el coach: ${outline_hint}` : ''}
${preferred_sources ? `\n- FUENTES QUE EL COACH PIDE PRIORIZAR: ${preferred_sources}` : ''}

${research_mode ? `🔬 MODO INVESTIGACIÓN PROFUNDA ACTIVADO
- ANTES de empezar a escribir slides, PIENSA EN EXTENSO (thinking habilitado):
  · Qué subtemas son los más relevantes para esta audiencia
  · Qué data específica necesitás buscar
  · Qué ángulos / contrastes / casos reales harían la clase memorable
- DESPUÉS investigá ITERATIVAMENTE (tenés 25 web searches disponibles):
  · Primero búsqueda amplia del tema → identifica subtemas y fuentes clave
  · Después búsquedas específicas por cada slide importante (data, casos, ejemplos)
  · Verifica al menos 2 fuentes para cada estadística importante
  · Busca casos reales, números actualizados al ${today.slice(0,4)}, comparativas, contradicciones
- La clase debe sentirse curada por un EXPERTO que pasó horas investigando, no Wikipedia copy-paste.
- Incluí "deep_insights" que un coach junior NO sabría.

` : ''}🧵 HILO CONDUCTOR (CRÍTICO — FEEDBACK DEL COACH):
La presentación NO es una colección de slides sueltos. Es UNA HISTORIA con principio, desarrollo y cierre. Aplicar estilo CPL (Content Profit Loop) — cada slide se conecta naturalmente con el siguiente.

REGLAS NO NEGOCIABLES:
1. **CADA slide (excepto la portada) DEBE tener un campo "transition_in"** (1 oración corta) que conecta con el slide anterior. Ej: "Ahora que vimos POR QUÉ los inversionistas se mueven rápido, hablemos de cómo medir esa velocidad en el mercado."
2. **CADA slide DEBE tener un campo "transition_out"** (1 oración) que abre la puerta al siguiente. Ej: "Pero saber la velocidad no basta — necesitas también saber DÓNDE concentrarla. Eso nos lleva a los ZIP codes."
3. **PROHIBIDO repetir información** entre slides. Si un concepto ya se introdujo, no se vuelve a definir — se profundiza o se aplica.
4. **Antes de introducir un concepto técnico nuevo (ej: ZIP codes, velocidad, ARV), ANTES debe haber 1 slide que explique POR QUÉ ese concepto importa**, ligado al concepto previo.
5. **Arco narrativo** explícito: cada bloque (cada 3-5 slides) debe sentirse como un capítulo. La transición entre bloques DEBE ser visible (con block_label) y verbalizada en speaker_notes.

EJEMPLO DE BUEN HILO:
- Slide 5 (concepto): "El inversionista busca mover rápido" → transition_out: "Esa velocidad no es igual en todos lados. Algunos mercados se mueven rápido, otros se congelan."
- Slide 6 (siguiente): transition_in: "Hablemos de cómo SE MIDE la velocidad de un mercado" → contenido: Days on Market, Sale-to-list ratio
- Slide 6 → transition_out: "Pero estos números agregados ocultan algo: dentro de una ciudad hay ZIPs A, B y C totalmente diferentes."
- Slide 7: transition_in: "Es ahí donde entra el análisis por ZIP code..."

speaker_notes DEBE empezar con la transition_in dicha en palabras propias del coach, y cerrar con la transition_out preparando lo que sigue. NUNCA empezar speaker_notes con "En este slide vamos a hablar de..." — siempre conectar desde lo anterior.

🎯 REGLA #1 ABSOLUTA — HILO CONDUCTOR (feedback explícito del coach Daniel Lara):
La presentación DEBE sentirse como UNA RUTA que arranca en 0 y llega a destino, NO una pila de slides aislados.

CADA slide tiene que estar EXPLÍCITAMENTE conectado al anterior y al siguiente. Si veo dos slides consecutivos donde no se entiende "por qué pasamos de X a Y", la presentación FALLÓ.

CÓMO LOGRAR EL HILO CONDUCTOR:

1) **Apertura de slide CONECTADA**: cada slide (a partir del #4) debe empezar con un mini-puente conceptual en su título o subtítulo que retome lo del slide anterior. Ej: si vengo de "cómo piensa el buyer final" y sigue "velocidad del mercado", el subtítulo debe decir "Porque el buyer rápido necesita un mercado que también lo sea".

2) **Speaker notes con TRANSICIÓN explícita**: cada speaker_notes DEBE terminar con UNA oración tipo "Y por eso ahora vamos a ver X" o "Esto nos lleva directo a la pregunta de…". Esta es la frase que el coach dice antes de pasar de slide.

3) **Bridge slides** entre bloques temáticos: cuando arranca un BLOQUE nuevo (Bloque 3, 4…), el PRIMER slide del bloque debe ser un "highlight" o "goldbox" que diga textualmente "Ya entendiste X. Ahora viene Y, que es lo que te permite Z". NO arranques un bloque nuevo con datos crudos sin contexto.

4) **Ruta visual al inicio**: slide #2 SIEMPRE debe ser una agenda visual numerada con flechas (layout: "agenda") que muestre las 5-7 estaciones del recorrido — para que el alumno sepa dónde está parado en cada momento.

5) **Callback en cierre**: en el slide de reflection-recap, los 3 "Aprendiste a…" deben SEGUIR el orden cronológico de los bloques, reforzando la ruta.

6) **NO REPETIR información**: si un dato ya apareció en un slide anterior, NO lo repitas. Cada slide aporta info nueva. Si necesitas referenciar algo previo, dilo en el speaker_notes ("como vimos en el bloque 2…"), no lo metas como contenido visual de nuevo.

7) **NO saltos abruptos de país, contexto o ejemplo**: si arrancaste hablando de Texas, no cambies a un ejemplo de otro país sin transición. Si arrancaste con un caso de fix & flip, no metas un caso de rentas sin puente.

EJEMPLO DEL ERROR QUE DANIEL DETECTÓ:
❌ Slide 5: "Cómo piensa el buyer final" → Slide 6: "Velocidad del mercado". No conectan. El alumno queda volando.
✅ Slide 5: "Cómo piensa el buyer final · Quiere cerrar rápido" → Slide 6: "Velocidad del mercado · Por eso el buyer paga premium en zonas rápidas".

ANTES DE ESCRIBIR CADA SLIDE, pregúntate: "¿el alumno entiende POR QUÉ paso de esta info a la siguiente?". Si no, agregá una oración puente.

METODOLOGÍA PEDAGÓGICA OBLIGATORIA — ESCALERA METACOGNITIVA:

Cada clase está diseñada para que un alumno NO EXPERTO salga PUDIENDO HACER algo específico.
Aplicamos la **Escalera de Metacognición** de Borja Ramírez en estos 4 momentos del deck:

1. ¿QUÉ voy a aprender? → slide #3 (learning-objectives)
2. ¿CÓMO lo voy a aprender? → bloques numerados secuenciales (Bloque 1, 2, 3...)
3. ¿PARA QUÉ me sirve? → slide cierre #N-2 (reflection-recap "Aprendiste a...")
4. ¿DÓNDE más aplico? → slide actividad #N (transfer-activity)

ORGANIZACIÓN EN BLOQUES NUMERADOS (estilo Borja Ramírez / FlipMentoría):
Cada slide tiene una etiqueta de bloque en mayúsculas pequeñas, ej:
- "BLOQUE 1 · CONTEXTO"
- "BLOQUE 2 · FUNDAMENTO"
- "BLOQUE 3 · CLASIFICACIÓN"
- "BLOQUE 4 · METODOLOGÍA"
- "BLOQUE 5 · ASPECTOS CRÍTICOS"
- "BLOQUE 6 · ERRORES COMUNES"
- "BLOQUE 7 · CASO PRÁCTICO"
- "BLOQUE 8 · HERRAMIENTAS"
- "BLOQUE 9 · CIERRE"

DIFICULTAD CRECIENTE: cada bloque construye sobre el anterior. NO empezar por números o tasas. Empezar por POR QUÉ IMPORTA + DEFINICIÓN, después clasificación, después método, después caso real, después errores, después herramientas, después transferencia.

ESTRUCTURA OBLIGATORIA (${slides_count} slides):

1. PORTADA (layout: "cover") — title + subtitle/quote + 3 KPIs gold
2. CONTEXTO — Por qué importa (layout: "highlight" con 3 cards "Antes de X" + footer) — el DOLOR del problema
3. **QUÉ VAS A APRENDER HOY** (layout: "learning-objectives") — 4 objetivos numerados "01...02...03...04" en cards navy con gold accent. CRUCIAL — esto es el "¿Qué voy a aprender?" de metacognición.
4. FUNDAMENTO — Definición del concepto central (layout: "goldbox" con la definición técnica)
5. INVISIBLE / NO OBVIO — Lo que el ojo no ve / el error de percepción típico (layout: "comparison" Lo visible vs Lo oculto)
6. CLASIFICACIÓN — Los 5 tipos/categorías del concepto (layout: "framework" o "strategy-grid" con 4-5 opciones)
7-8. DESGLOSE — 2 slides con sub-conceptos detallados, cada uno con benefits/cards
9. METODOLOGÍA — orden lógico paso a paso (layout: "agenda" con 5 steps)
10-11. ZONAS / DOMINIOS — slides con cards específicas por zona (layout: "checklist" o "framework")
12. ASPECTOS CRÍTICOS / RED FLAGS — 6-8 puntos rojos no negociables (layout: "checklist" o "metrics-dashboard")
13. TABLA DE DECISIÓN — qué hacer ante cada red flag (layout: "framework" con label+value)
14. ERRORES COMUNES — 4-6 errores que cuestan dinero (layout: "checklist")
15. CASO PRÁCTICO REAL — con números completos (layout: "case-study")
16. HERRAMIENTAS — cómo documentar/medir (layout: "checklist")
17. **APRENDISTE A...** (layout: "reflection-recap") — slide pedagógico de cierre, 3 cards "Aprendiste a..." con verbo en infinitivo. CRUCIAL — esto es "¿Para qué me sirve?" de metacognición.
18. CHECKLIST FINAL (layout: "checklist") — qué se llevan accionable
19. QUOTE memorable de cierre (layout: "quote")
20. **ACTIVIDAD PARA PRÓXIMA CLASE** (layout: "transfer-activity") — 1 reto + 1 entregable + 1 highlight con regla. CRUCIAL — esto es "¿Dónde más aplico?" de metacognición.

NOTA: si slides_count = 15-17, condensar bloques. Pero NUNCA omitir los 4 slides metacognitivos (#3, #17, #19/20, y #20).

ELEMENTOS VISUALES OBLIGATORIOS:
- "block_label": cada slide (excepto portada) DEBE tener un campo "block_label" string en MAYÚSCULAS tipo "BLOQUE 3 · CLASIFICACIÓN"
- "goldbox_text": para reglas / insights clave usar slide con layout "goldbox" + array "goldbox_runs" alternando bold/regular
- "highlight_text": para frases de impacto, layout "highlight" con texto principal grande color blanco
- "learning_objectives" en slide #3: array de 4 objetos {number, title, body}
- "reflection_items" en slide reflection-recap: array de 3 objetos {title: "Aprendiste a", body}
- "transfer_activity" en slide final: {challenge, deliverable, deliverable_items, rule}

REGLAS CRÍTICAS:
1. **TODA estadística, tasa, precio, número o dato DEBE venir de web search en VIVO**.
   No inventes números. No uses "approximately" sin fuente. Cada número debe venir con su fuente y fecha de acceso.
2. Para este dominio (${domain}), USA fuentes oficiales/confiables sugeridas:
   ${trustedSources}
   ${preferred_sources ? `Y especialmente: ${preferred_sources}` : ''}
3. Si el tema toca múltiples dominios (ej. real estate + finanzas), combiná fuentes apropiadas de cada uno.
4. Tone profesional pero accesible. Si el idioma es español, usá español neutro/rioplatense según audiencia.
5. Slides 0-15 segundos de lectura cada uno. Bullets de máximo 12 palabras.
6. Cada slide debe tener "speaker_notes" con el guion del coach (2-4 oraciones).
7. Adaptá el contenido y ejemplos al tema solicitado — NO defaultees a real estate si el topic no lo pide.${research_mode ? `
8. **MODO INVESTIGACIÓN**: cada speaker_notes debe incluir 1 dato concreto extra (case study, contradicción, insight no obvio) que solo se descubre investigando profundo.
9. **MODO INVESTIGACIÓN**: agregá 2-3 slides extra al final con "Bonus deep dives" — los temas que descubriste investigando que vale la pena cubrir.` : ''}

ESTRUCTURA TÍPICA (adaptar al tema):
- Slide 1: Portada (title + presenter + class number)
- Slide 2: Agenda
- Slide 3-4: Contexto / Por qué importa AHORA (con stats live)
- Slide 5-8: Concepto principal desglosado
- Slide 9-11: Ejemplo real / Caso de estudio (con números verificables)
- Slide 12-13: Frameworks / Steps to action
- Slide 14: Pitfalls comunes + cómo evitarlos
- Slide 15: Resources + tarea de la semana

Devolvé SOLO JSON válido (sin markdown wrapper, sin comentarios):
{
  "title": "${title}",
  "subtitle": "Hook o frase memorable de la clase",
  "brand": "${audience.includes('Flipping')?'FLIPPING RENTALS':audience.includes('Rental')?'RENTAL PROFITS':'EMPRESA OS'}",
  "outline": ["Sección 1", "Sección 2", "..."],
  "slides": [
    {
      "number": 1,
      "title": "...",
      "subtitle": "opcional",
      "block_label": "BLOQUE 1 · CONTEXTO",
      "layout": "cover | agenda | comparison | benefits | case-study | framework | checklist | strategy-grid | metrics-dashboard | quote | closing | learning-objectives | reflection-recap | transfer-activity | goldbox | highlight | hero-image | split-image | chart-spotlight | image-grid | content",
      "bullets": ["bullet 1 max 12 palabras", "bullet 2"],

      "transition_in": "Conexión EXPLÍCITA con el slide anterior, 1 oración. OBLIGATORIO en TODOS los slides excepto portada. Ej: 'Ahora que entendemos por qué los inversionistas se mueven rápido, veamos cómo se MIDE esa velocidad.'",
      "transition_out": "Frase que abre la puerta al siguiente slide, 1 oración. OBLIGATORIO. Ej: 'Pero conocer la velocidad agregada no basta — dentro de una ciudad hay ZIPs A, B y C totalmente diferentes. Eso lo desglosamos ahora.'",

      "image_query": "2-5 palabras en INGLÉS para buscar foto profesional en Unsplash (ej: 'modern texas suburban home aerial', 'business team meeting'). USA layouts hero-image y split-image para máximo impacto visual.",
      "image_grid": [
        {"image_query": "modern home exterior", "caption": "Antes"},
        {"image_query": "renovated kitchen luxury", "caption": "Después"},
        {"image_query": "happy family front porch", "caption": "Resultado"}
      ],
      "insights": [
        {"title": "💡 Insight #1", "body": "Frase corta de impacto sobre el chart"},
        {"title": "🎯 Insight #2", "body": "Lo importante a notar"},
        {"title": "⚡ Insight #3", "body": "El takeaway accionable"}
      ],

      "learning_objectives": [
        {"number": "01", "title": "¿Qué es una patología?", "body": "Definición + por qué muchas veces no se ve."},
        {"number": "02", "title": "Cómo inspeccionar", "body": "Orden lógico: exterior, interior, zona por zona."},
        {"number": "03", "title": "Red flags críticas", "body": "Las que nunca se pueden ignorar."},
        {"number": "04", "title": "Documentación accionable", "body": "Cómo documentar y volverlo presupuesto."}
      ],

      "reflection_items": [
        {"title": "Aprendiste a", "body": "Reconocer 5 tipos de patología y dónde se esconden."},
        {"title": "Aprendiste a", "body": "Inspeccionar en orden y detectar las red flags."},
        {"title": "Aprendiste a", "body": "Documentar y volverlo decisión."}
      ],

      "transfer_activity": {
        "challenge": "En tu próxima propiedad realiza una inspección completa siguiendo el flujo de la clase.",
        "deliverable": "Documenta mínimo 8 hallazgos siguiendo el flujo de la clase",
        "deliverable_items": ["Al menos 1 hallazgo por tipo.", "Cada uno con foto, zona, riesgo e impacto $.", "Decisión final: comprar / negociar / descartar."],
        "rule": "Trae tu reporte a la próxima sesión: revisaremos cómo tus hallazgos se convierten en scope of work y en tu oferta."
      },

      "goldbox_runs": [
        {"text": "Patología constructiva: ", "bold": true},
        {"text": "cualquier daño, deterioro o defecto que afecta el funcionamiento, la seguridad o el valor de una vivienda."}
      ],

      "highlight_text": "El inversionista no pierde dinero solo por remodelar mal. Pierde por no saber inspeccionar.",

      "stats": [{"label": "Median home price Austin", "value": "$469,500", "source_name": "Redfin May 2026"}],

      "agenda_steps": [{"step": "Compra", "label": "Adquisición estratégica"}],

      "comparison": {
        "left": {"title": "Opción A", "items": ["check item 1", "check item 2"]},
        "right": {"title": "Opción B", "items": ["check item 1", "check item 2"]}
      },

      "case_study": {
        "name": "Dove Springs",
        "location": "Austin, TX",
        "compra": 185000,
        "remodelacion": 42500,
        "arv": 285000,
        "cash_flow_monthly": 1200,
        "roi_anual": 18.5,
        "duracion_meses": 4,
        "estrategia": "Rent by Rooms",
        "key_takeaway": "Frase de cierre del caso"
      },

      "framework_items": [
        {"label": "ARV", "value": "$285K"},
        {"label": "Rentas comparables", "value": "$2,200"}
      ],

      "checklist_items": [
        {"title": "Durabilidad", "detail": "Materiales de larga duración"},
        {"title": "Funcionalidad", "detail": "Diseño práctico"}
      ],

      "strategy_options": [
        {"name": "Long-term", "cash_flow": "Media", "scalability": "Alta", "operation": "Baja", "ideal_for": "Inversores que buscan estabilidad"}
      ],

      "metric_cards": [
        {"label": "ROI Anual", "value": "15%", "trend": "+2pp"},
        {"label": "Cash Flow", "value": "$50K", "trend": "+12%"}
      ],

      "quote_text": "Frase memorable corta",
      "quote_author": "Atribución (opcional)",

      "speaker_notes": "Guion del coach: qué decir, ejemplo concreto, transición. 2-4 oraciones.",
      "sources": [{"title": "Redfin Austin Market Data", "url": "https://...", "accessed_at": "${today}"}]
    }
  ],
  "all_sources": [{"title": "...", "url": "..."}],
  "summary": "1 párrafo ejecutivo sobre la presentación"
}

NOTAS IMPORTANTES:
- En cada slide, INCLUÍ SOLO los campos que apliquen a su layout (no llenes todos).
- Para "case-study" siempre incluí "case_study" con números reales (busca casos REALES vía web search si require_live_data).
- Para "comparison" incluí "comparison" con left/right.
- Para "agenda" incluí "agenda_steps".
- "speaker_notes" SIEMPRE — son el guion para el coach.
- **"transition_in" y "transition_out" SIEMPRE en cada slide (excepto portada)**. Es lo más importante para que la presentación fluya. Sin transiciones explícitas, los slides quedan desconectados como sucedió en el módulo anterior.
- Antes de finalizar el JSON, REVISA: ¿hay información repetida entre slides? Si sí, elimina la repetición. Cada slide debe AGREGAR algo nuevo, no recordar lo ya dicho.

🎨 NUEVOS LAYOUTS VISUALES PREMIUM (USAR MÍNIMO 4 EN LA PRESENTACIÓN):
- **"hero-image"**: foto full-bleed estilo magazine + título overlay. USAR para slides de transición/sección/impacto emocional. REQUIERE "image_query".
- **"split-image"**: imagen 50% izquierda + 5 bullets numerados 50% derecha. USAR para slides que explican proceso o concepto con apoyo visual. REQUIERE "image_query" + "bullets".
- **"chart-spotlight"**: chart gigante 65% + 3 insights laterales. USAR cuando tengas stats numéricos comparativos (NO porcentajes mezclados con dólares). REQUIERE "stats" o "metric_cards" con números puros + "insights" array.
- **"image-grid"**: 2x2 o 1x3 fotos con captions. USAR para "antes/después", "tipos de zonas", "perfiles de inversor", "casos del portfolio". REQUIERE "image_grid" array con {image_query, caption}.

REGLA: para cada slide CONSIDERA siempre agregar "image_query" en inglés (2-5 palabras). El sistema auto-genera foto profesional de Unsplash. Slides sin imagen se sienten BÁSICOS — usa imagen siempre que el layout lo soporte. NO uses image_query para slides puramente de texto tipo quote/goldbox/highlight.`;

  // ────────────────────────────────────────────────────────────
  // BACKGROUND JOB PATTERN — evita timeout 150s de edge function
  // 1. Crear job inmediato → devolver job_id
  // 2. EdgeRuntime.waitUntil() corre el trabajo de Anthropic en background
  // 3. Frontend hace polling de edu_pres_jobs por id
  // ────────────────────────────────────────────────────────────
  const { data: job, error: jobErr } = await supabase.from("edu_pres_jobs").insert({
    user_id: user_id || null,
    mentorship_id,
    status: 'running',
    params: body
  }).select().single();
  if (jobErr) return json({ ok: false, error: 'No pude crear job: ' + jobErr.message }, 500);

  // Trabajo pesado en background (no bloquea la respuesta)
  const work = async () => {
    const startMs = Date.now();
    try {
      const requestBody: any = {
        model: "claude-sonnet-4-5",
        // OPTIMIZADO: reducido para terminar en 30-50s (antes timeout a los 150s)
        max_tokens: research_mode ? 32000 : 8000,
        tools: require_live_data
          ? [{ type: "web_search_20250305", name: "web_search", max_uses: research_mode ? 25 : 4 }]
          : undefined,
        messages: [{ role: "user", content: prompt }]
      };
      if (research_mode) requestBody.thinking = { type: "enabled", budget_tokens: 12000 };

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(requestBody)
      });
      const durationMs = Date.now() - startMs;

      if (!r.ok) {
        const txt = await r.text();
        await supabase.from("edu_pres_jobs").update({
          status: 'error', error_message: `Anthropic ${r.status}: ${txt.slice(0, 800)}`,
          finished_at: new Date().toISOString(), duration_ms: durationMs
        }).eq('id', job.id);
        return;
      }

      const result: any = await r.json();
      const tokensIn = result.usage?.input_tokens || 0;
      const tokensOut = result.usage?.output_tokens || 0;
      const webSearchUses = result.usage?.server_tool_use?.web_search_requests || 0;
      const lastText = (result.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");

      let parsed: any = null;
      try {
        const jsonMatch = lastText.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : lastText);
      } catch (e) {
        await supabase.from("edu_pres_jobs").update({
          status: 'error', error_message: "Parse JSON falló. Raw: " + lastText.slice(0, 800),
          finished_at: new Date().toISOString(), duration_ms: durationMs,
          tokens_used: tokensIn + tokensOut, web_searches: webSearchUses
        }).eq('id', job.id);
        return;
      }

      // Guardar en edu_presentations
      let savedPresId: string | null = null;
      if (mentorship_id) {
        const { data: saved } = await supabase.from("edu_presentations").insert({
          mentorship_id, title, topic, audience, presentation_type, class_number,
          duration_min, language,
          outline: parsed.outline || [],
          slides: parsed.slides || [],
          sources: parsed.all_sources || [],
          status: "generated",
          cost_tokens_used: tokensIn + tokensOut,
          web_searches_used: webSearchUses,
          generated_by: user_id || null
        }).select().single();
        savedPresId = saved?.id || null;
      }

      // Marcar job como done
      await supabase.from("edu_pres_jobs").update({
        status: 'done',
        result: parsed,
        saved_pres_id: savedPresId,
        tokens_used: tokensIn + tokensOut,
        web_searches: webSearchUses,
        duration_ms: durationMs,
        finished_at: new Date().toISOString()
      }).eq('id', job.id);
    } catch (e: any) {
      await supabase.from("edu_pres_jobs").update({
        status: 'error', error_message: 'Excepción: ' + (e?.message || String(e)),
        finished_at: new Date().toISOString(), duration_ms: Date.now() - startMs
      }).eq('id', job.id);
    }
  };

  // ASYNC PATTERN siempre: devolver job_id rápido y waitUntil corre Claude en background.
  // Frontend hace polling cada 5s a edu_pres_jobs por status='done'/'error'.
  // Optimizado: 4 web searches + 8000 tokens → Claude termina en 30-50s.
  // @ts-ignore  EdgeRuntime es global en Supabase
  EdgeRuntime.waitUntil(work());
  return json({
    ok: true,
    async: true,
    job_id: job.id,
    message: 'Trabajo iniciado en background. Hacé polling de edu_pres_jobs por id.'
  });
});
