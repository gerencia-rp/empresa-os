// Genera estructura de presentación con Claude + web_search nativo (data live verificable).
// Devuelve JSON con slides estructurados listos para que el frontend arme el PPTX.
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
  if (!ANTHROPIC_KEY) return json({ ok: false, error: "Falta ANTHROPIC_API_KEY en Supabase secrets" }, 500);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }

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

` : ''}ESTRUCTURA OBLIGATORIA DE LA PRESENTACIÓN (estilo deck profesional con arco pedagógico completo):

1. PORTADA — title + subtitle/quote + 3 KPIs grandes destacados (layout: "cover")
2. AGENDA — 4-6 pasos del proceso visualmente (layout: "agenda")
3-4. CONTEXTO / DEFINICIÓN — qué es + por qué importa, con comparativa side-by-side si aplica (layout: "comparison")
5. BENEFICIOS PRINCIPALES — 4-6 beneficios concretos (layout: "benefits")
6. **STACK DE CAPITAL / COSTOS REALES** — desglose claro del dinero necesario, lo que recuperás vs lo que perdés (layout: "metrics-dashboard" con 6-8 cards)
7-8. **CASOS REALES (2 mínimo)** — con dirección, números antes/después, estrategia, ROI, key_takeaway. Si require_live_data, BUSCALOS en web (zillow, redfin, news). Si no, inventá realistas pero plausibles para el mercado actual. (layout: "case-study")
9. BUY BOX / FRAMEWORK — parámetros no negociables con valores numéricos (layout: "framework")
10. **CONCEPTO TÉCNICO IMPORTANTE EXPLICADO** — comparación de lo viejo vs lo nuevo (ej: loan tradicional vs DSCR, w-2 vs LLC, etc.) ANTES de mostrar números técnicos (layout: "comparison")
11. DETALLE TÉCNICO — fórmulas, ratios, números específicos (layout: "framework")
12. ESTRATEGIAS / OPCIONES — comparativa de 3-4 opciones con métricas (layout: "strategy-grid")
13. METRICS DASHBOARD DE MERCADO — 6-8 KPIs actualizados con fuentes (layout: "metrics-dashboard")
14. **ERRORES COMUNES / PITFALLS** — 5-6 errores que matan el proyecto + cómo evitarlos (layout: "checklist")
15. QUOTE memorable de mindset (layout: "quote")
16. **RECURSOS DESCARGABLES + PRE-WORK** — calculadoras, templates, lecturas, tarea para próxima clase (layout: "checklist")
17. CIERRE / CTA — quote final + 3 stats grandes + call to action específico medible (layout: "closing")

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
      "layout": "cover | agenda | comparison | benefits | case-study | framework | checklist | strategy-grid | metrics-dashboard | quote | closing | content",
      "bullets": ["bullet 1 max 12 palabras", "bullet 2"],

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
- "speaker_notes" SIEMPRE — son el guion para el coach.`;

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
        max_tokens: research_mode ? 32000 : 16000,
        tools: require_live_data
          ? [{ type: "web_search_20250305", name: "web_search", max_uses: research_mode ? 25 : 8 }]
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

  // EdgeRuntime.waitUntil() permite que la function devuelva la respuesta
  // mientras `work()` sigue corriendo hasta 400s en background
  // @ts-ignore  EdgeRuntime es global en Supabase
  EdgeRuntime.waitUntil(work());

  return json({
    ok: true,
    async: true,
    job_id: job.id,
    message: 'Trabajo iniciado en background. Hacé polling de edu_pres_jobs por id.'
  });
});
