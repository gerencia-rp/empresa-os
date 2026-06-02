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
    audience = "estudiantes de mentoría de real estate",
    presentation_type = "class",
    class_number,
    duration_min = 60,
    slides_count = 15,
    language = "es",
    outline_hint,
    require_live_data = true,
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

  // Prompt al estilo profesor experto que arma slides con data verificable
  const prompt = `Eres un creador de presentaciones de élite para mentorías de real estate. Hoy es ${today}.

TAREA: armar una presentación de ${slides_count} slides para una clase/taller.

INPUT:
- Título: "${title}"
- Tema: ${topic}
- Audiencia: ${audience}
- Tipo: ${presentation_type}${class_number ? ` (clase #${class_number})` : ''}
- Duración: ${duration_min} minutos
- Idioma: ${language}${mentorshipContext}
${outline_hint ? `\n- Outline sugerido por el coach: ${outline_hint}` : ''}

REGLAS CRÍTICAS:
1. **TODA estadística, tasa, precio, número o dato de mercado DEBE venir de web search en VIVO**.
   No inventes números. No uses "approximately" sin fuente. Cada número debe venir con su fuente y fecha.
2. Para data inmobiliaria USA fuentes oficiales/confiables: Redfin, Zillow, Realtor.com, FRED (St. Louis Fed),
   NAR (National Association of Realtors), HUD, IRS, Texas Comptroller, Travis CAD, local MLS reports.
3. Para tasas de interés actuales: Freddie Mac PMMS, Bankrate, Mortgage News Daily.
4. Tone profesional pero accesible. Audiencia hispana — usá español rioplatense/neutro.
5. Slides 0-15 segundos de lectura cada uno. Bullets de máximo 12 palabras.
6. Cada slide debe tener "speaker_notes" con el guion del coach (2-4 oraciones).
7. Si el tema involucra Wholesale, Fix&Flip o Rentas → adapta data a Texas (Austin/Houston/Dallas) por default.

ESTRUCTURA TÍPICA (adaptar al tema):
- Slide 1: Portada (title + presenter + class number)
- Slide 2: Agenda
- Slide 3-4: Contexto / Por qué importa AHORA (con stats live)
- Slide 5-8: Concepto principal desglosado
- Slide 9-11: Ejemplo real / Caso de estudio (con números verificables)
- Slide 12-13: Frameworks / Steps to action
- Slide 14: Pitfalls comunes + cómo evitarlos
- Slide 15: Resources + tarea de la semana

Devolvé SOLO JSON válido (sin markdown wrapper):
{
  "title": "${title}",
  "outline": ["Sección 1", "Sección 2", ...],
  "slides": [
    {
      "number": 1,
      "title": "...",
      "subtitle": "...",
      "layout": "title|content|two-column|stats|quote|closing",
      "bullets": ["punto 1 (max 12 palabras)", "punto 2"],
      "stats": [{"label": "Median home price Austin", "value": "$469,500", "source_url": "https://...", "source_name": "Redfin May 2026"}],
      "speaker_notes": "Guion del coach: qué decir, ejemplo concreto, transición al siguiente slide. 2-4 oraciones.",
      "sources": [{"title": "Redfin Austin Market Data", "url": "https://...", "accessed_at": "${today}"}]
    }
  ],
  "all_sources": [{"title": "...", "url": "..."}],
  "summary": "1 párrafo sobre la presentación"
}`;

  // Llamar a Anthropic con web_search habilitado
  const requestBody: any = {
    model: "claude-sonnet-4-5",
    max_tokens: 16000,
    tools: require_live_data ? [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }] : undefined,
    messages: [{ role: "user", content: prompt }]
  };

  const startMs = Date.now();
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
    return json({ ok: false, error: `Anthropic ${r.status}: ${txt.slice(0,400)}` }, 500);
  }

  const result: any = await r.json();
  const tokensIn = result.usage?.input_tokens || 0;
  const tokensOut = result.usage?.output_tokens || 0;
  const webSearchUses = result.usage?.server_tool_use?.web_search_requests || 0;

  // Extraer el último bloque de texto (el JSON final)
  const lastText = (result.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");

  // Parse JSON
  let parsed: any = null;
  try {
    const jsonMatch = lastText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : lastText);
  } catch (e) {
    return json({
      ok: false,
      error: "No pude parsear JSON de Claude. Raw output: " + lastText.slice(0, 500),
      raw: lastText
    }, 500);
  }

  // Guardar en DB
  let saved: any = null;
  if (mentorship_id) {
    const { data, error } = await supabase.from("edu_presentations").insert({
      mentorship_id,
      title,
      topic,
      audience,
      presentation_type,
      class_number,
      duration_min,
      language,
      outline: parsed.outline || [],
      slides: parsed.slides || [],
      sources: parsed.all_sources || [],
      status: "generated",
      cost_tokens_used: tokensIn + tokensOut,
      web_searches_used: webSearchUses,
      generated_by: user_id || null
    }).select().single();
    if (!error) saved = data;
  }

  return json({
    ok: true,
    presentation: parsed,
    saved_id: saved?.id,
    tokens: { input: tokensIn, output: tokensOut, total: tokensIn + tokensOut },
    web_searches: webSearchUses,
    duration_ms: durationMs
  });
});
