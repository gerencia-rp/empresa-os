// ════════════════════════════════════════════════════════════════
// 🎬 GENERATE PRESENTATION V2 — SLIDE-BY-SLIDE SÍNCRONO
// Reemplaza el patrón roto con waitUntil() del plan free.
// Cada call termina en 15-30s → nunca timeout.
//
// MODES:
//   - 'outline'  → devuelve estructura (títulos + tipos de cada slide)
//   - 'slide'    → devuelve UN solo slide en detalle
//
// UNIVERSAL: acepta cualquier preset (informe/educativo/pitch/mkt/libre)
//            + tema libre + audiencia + #slides
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuth } from "../_shared/auth.ts";
import { callAnthropic, extractText } from "../_shared/anthropic.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

// ──────────────────────────────────────────────────────────
// PLANTILLAS POR TIPO — orientan el tono y la estructura
// ──────────────────────────────────────────────────────────
const PRESETS: Record<string, { tone: string; structure: string; layouts: string[] }> = {
  informe: {
    tone: "Ejecutivo, claro, basado en datos. Sin adornos. Cada slide va al grano.",
    structure: "Portada → Resumen ejecutivo (3-5 KPIs) → Contexto del período → Análisis por área → Hallazgos clave → Riesgos → Recomendaciones priorizadas → Próximos pasos.",
    layouts: ["cover", "metrics-dashboard", "chart-spotlight", "framework", "checklist", "comparison", "closing"]
  },
  educativo: {
    tone: "Claro, pedagógico, accesible. Como un buen profesor: define, ejemplifica, ejercita.",
    structure: "Portada → Qué vas a aprender (4 objetivos numerados) → Por qué importa → Concepto base → Casos/ejemplos → Aplicación práctica → Errores comunes → Aprendiste a... → Actividad para reforzar.",
    layouts: ["cover", "learning-objectives", "highlight", "goldbox", "comparison", "case-study", "checklist", "reflection-recap", "transfer-activity"]
  },
  pitch: {
    tone: "Persuasivo, narrativo, foco en el cliente. Storytelling → datos → CTA claro.",
    structure: "Portada → Problema del cliente → Costo de no resolverlo → Tu solución → Cómo funciona (3 pasos) → Pruebas/casos de éxito → Diferencial vs competencia → Inversión → Próximo paso (CTA).",
    layouts: ["cover", "hero-image", "highlight", "split-image", "framework", "case-study", "comparison", "metrics-dashboard", "closing"]
  },
  marketing: {
    tone: "Punchy, emocional, visual. Hooks fuertes. Cada slide vendible por sí solo.",
    structure: "Portada con hook → Antes/después → Problema → Solución → 3 beneficios visuales → Testimonios → Oferta → CTA.",
    layouts: ["cover", "hero-image", "image-grid", "split-image", "quote", "comparison", "highlight", "closing"]
  },
  libre: {
    tone: "Adaptar al tema según el usuario lo describa. Profesional y limpio.",
    structure: "Portada → Agenda → Desarrollo en bloques numerados → Cierre con conclusión accionable.",
    layouts: ["cover", "agenda", "content", "framework", "comparison", "case-study", "highlight", "checklist", "quote", "closing"]
  }
};

// ──────────────────────────────────────────────────────────
// SLIDE SCHEMA — qué campos puede tener un slide del JSON
// ──────────────────────────────────────────────────────────
const SLIDE_FIELDS_DOC = `
Campos disponibles según layout (solo incluí los que correspondan):
- title (string, OBLIGATORIO)
- subtitle (string, opcional)
- block_label (string, "BLOQUE N · NOMBRE", OBLIGATORIO excepto en portada)
- bullets (array de strings, max 5, max 12 palabras c/u)
- speaker_notes (string, 2-4 oraciones — guion para el presentador) OBLIGATORIO
- transition_in (string, 1 oración conectando con el slide anterior) OBLIGATORIO desde slide 2
- transition_out (string, 1 oración abriendo el siguiente) OBLIGATORIO excepto último
- image_query (string en INGLÉS, 2-5 palabras para Unsplash) opcional pero recomendado
- highlight_text (string para layouts highlight)
- goldbox_runs (array de {text, bold}) para definiciones
- quote_text, quote_author para layout quote
- stats (array de {label, value, source_name}) para metric cards
- metric_cards (array de {label, value, trend}) para metrics-dashboard
- agenda_steps (array de {step, label}) para agenda
- comparison ({left:{title, items}, right:{title, items}}) para comparison
- case_study ({name, location, numbers, key_takeaway}) para case-study
- framework_items (array de {label, value}) para framework
- checklist_items (array de {title, detail}) para checklist
- learning_objectives (array de {number, title, body}) — solo en slides de objetivos
- reflection_items (array de {title, body}) — solo en slide "Aprendiste a..."
- transfer_activity ({challenge, deliverable, deliverable_items, rule}) — slide de actividad
- image_grid (array de {image_query, caption}) para layout image-grid
- insights (array de {title, body}) para chart-spotlight
`;

// ──────────────────────────────────────────────────────────
// PROMPT PARA OUTLINE (rápido, sin web_search, < 20s)
// ──────────────────────────────────────────────────────────
function buildOutlinePrompt(p: any): string {
  const preset = PRESETS[p.preset_type] || PRESETS.libre;
  return `Sos un creador de presentaciones de élite. Tu tarea: armar el OUTLINE de una presentación.

INPUT:
- Tipo: ${p.preset_type} (${preset.tone})
- Tema/título: ${p.title}
- Sobre qué: ${p.topic}
- Audiencia: ${p.audience}
- Número de slides: ${p.slides_count}
- Idioma: ${p.language || "es"}
- Tono especial: ${p.tone_extra || "no hay"}

ESTRUCTURA RECOMENDADA: ${preset.structure}
LAYOUTS DISPONIBLES: ${preset.layouts.join(", ")}

REGLAS:
1. La presentación es UNA HISTORIA con principio, desarrollo y cierre. NO una lista de slides sueltos.
2. Cada slide construye sobre el anterior — definí el HILO CONDUCTOR.
3. Slide 1 = portada. Slide 2 = agenda visual. Último slide = cierre + CTA o reflexión.
4. Distribuí los bloques temáticos de forma balanceada (2-4 slides por bloque).
5. NO repitas conceptos entre slides.

DEVOLVÉ SOLO JSON VÁLIDO (sin markdown, sin comentarios):
{
  "title": "${p.title}",
  "subtitle": "Hook de 6-12 palabras que enganche",
  "narrative_arc": "El hilo conductor en 2 oraciones — qué viaje vive la audiencia",
  "blocks": [
    {"name": "BLOQUE 1 · NOMBRE", "purpose": "Qué entiende la audiencia al final de este bloque"},
    {"name": "BLOQUE 2 · NOMBRE", "purpose": "..."}
  ],
  "slides_outline": [
    {"number": 1, "title": "Título corto del slide", "block_label": "BLOQUE 1 · CONTEXTO", "layout": "cover", "purpose": "Una oración: qué hace este slide en el arco narrativo"},
    {"number": 2, "title": "Agenda visual", "block_label": "BLOQUE 1 · CONTEXTO", "layout": "agenda", "purpose": "..."}
    ${p.slides_count > 2 ? `// ... ${p.slides_count} slides en total` : ""}
  ]
}

IMPORTANTE: el array slides_outline debe tener EXACTAMENTE ${p.slides_count} elementos.`;
}

// ──────────────────────────────────────────────────────────
// PROMPT PARA UN SLIDE (rápido, < 25s)
// ──────────────────────────────────────────────────────────
function buildSlidePrompt(p: any, slideInfo: any, outline: any, prevSlide: any, nextOutline: any): string {
  const preset = PRESETS[p.preset_type] || PRESETS.libre;
  return `Sos un creador de presentaciones de élite. Generá UN solo slide en detalle.

CONTEXTO DE LA PRESENTACIÓN:
- Tipo: ${p.preset_type} — ${preset.tone}
- Título global: ${outline.title}
- Hilo conductor: ${outline.narrative_arc}
- Audiencia: ${p.audience}
- Idioma: ${p.language || "es"}

OUTLINE COMPLETO (para que sepas dónde encaja este slide):
${outline.slides_outline.map((s: any) => `  ${s.number}. [${s.layout}] ${s.title} — ${s.purpose}`).join("\n")}

SLIDE QUE TENÉS QUE GENERAR AHORA:
- Número: ${slideInfo.number} de ${outline.slides_outline.length}
- Título base: ${slideInfo.title}
- Bloque: ${slideInfo.block_label}
- Layout: ${slideInfo.layout}
- Propósito: ${slideInfo.purpose}
${prevSlide ? `\nSLIDE ANTERIOR (úsalo para hacer transition_in):\n- Número ${prevSlide.number}: ${prevSlide.title}\n- Propósito: ${prevSlide.purpose}` : ""}
${nextOutline ? `\nSLIDE SIGUIENTE (úsalo para hacer transition_out):\n- Número ${nextOutline.number}: ${nextOutline.title}\n- Propósito: ${nextOutline.purpose}` : ""}

REGLAS:
1. Title corto (max 8 palabras).
2. transition_in: si no es slide 1, OBLIGATORIO — 1 oración que conecte EXPLÍCITAMENTE con el slide anterior.
3. transition_out: si no es el último, OBLIGATORIO — 1 oración que abra el siguiente.
4. speaker_notes: 2-4 oraciones, guion natural para presentar — incluí 1 ejemplo concreto.
5. Bullets max 12 palabras, max 5 por slide.
6. Si layout permite image_query, incluila (en INGLÉS, 2-5 palabras).
7. Para layouts especiales (case-study, comparison, framework, etc.), llená los campos del schema correspondiente.

${SLIDE_FIELDS_DOC}

DEVOLVÉ SOLO JSON VÁLIDO (sin markdown, sin comentarios). El JSON debe ser el OBJETO del slide directamente, NO un array, NO un wrapper.

Ejemplo de formato esperado:
{
  "number": ${slideInfo.number},
  "title": "...",
  "block_label": "${slideInfo.block_label}",
  "layout": "${slideInfo.layout}",
  "bullets": ["..."],
  "transition_in": "...",
  "transition_out": "...",
  "speaker_notes": "...",
  "image_query": "..."
  // ... otros campos según layout
}`;
}

// ──────────────────────────────────────────────────────────
// MAIN HANDLER
// ──────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!ANTHROPIC_KEY) return json({ ok: false, error: "Falta ANTHROPIC_API_KEY" }, 500);

  const auth = await requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  body.user_id = auth.user_id;

  const mode = body.mode || "outline";

  try {
    if (mode === "outline") {
      // Validar inputs mínimos
      if (!body.title || !body.topic) return json({ ok: false, error: "title y topic son requeridos" }, 400);
      const prompt = buildOutlinePrompt({
        preset_type: body.preset_type || "libre",
        title: body.title,
        topic: body.topic,
        audience: body.audience || "profesionales del rubro",
        slides_count: Math.max(5, Math.min(40, body.slides_count || 12)),
        language: body.language || "es",
        tone_extra: body.tone_extra || ""
      });

      const callResult = await callAnthropic({
        model: "claude-sonnet-4-5",
        max_tokens: 4000,                 // outline es chico
        messages: [{ role: "user", content: prompt }],
        user_id: body.user_id,
        feature: "presentation-v2-outline",
        timeoutMs: 90000,                 // 90s max — síncrono, dentro del límite de 150s
        maxRetries: 1
      });

      if (!callResult.ok) return json({ ok: false, error: callResult.error || "Anthropic falló" }, 502);

      const raw = extractText(callResult.data);
      let outline: any;
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        outline = JSON.parse(m ? m[0] : raw);
      } catch {
        return json({ ok: false, error: "Parse JSON outline falló", raw: raw.slice(0, 600) }, 500);
      }
      return json({ ok: true, outline, tokens: (callResult.tokens_in||0) + (callResult.tokens_out||0) });
    }

    if (mode === "slide") {
      const { slide_info, outline, prev_slide, next_outline } = body;
      if (!slide_info || !outline) return json({ ok: false, error: "slide_info y outline requeridos" }, 400);

      const prompt = buildSlidePrompt({
        preset_type: body.preset_type || "libre",
        audience: body.audience || "profesionales del rubro",
        language: body.language || "es"
      }, slide_info, outline, prev_slide, next_outline);

      const callResult = await callAnthropic({
        model: "claude-sonnet-4-5",
        max_tokens: 3000,                 // 1 slide es chico
        messages: [{ role: "user", content: prompt }],
        user_id: body.user_id,
        feature: "presentation-v2-slide",
        timeoutMs: 90000,
        maxRetries: 1
      });

      if (!callResult.ok) return json({ ok: false, error: callResult.error || "Anthropic falló" }, 502);

      const raw = extractText(callResult.data);
      let slide: any;
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        slide = JSON.parse(m ? m[0] : raw);
      } catch {
        return json({ ok: false, error: "Parse JSON slide falló", raw: raw.slice(0, 600) }, 500);
      }
      return json({ ok: true, slide, tokens: (callResult.tokens_in||0) + (callResult.tokens_out||0) });
    }

    return json({ ok: false, error: "mode debe ser 'outline' o 'slide'" }, 400);
  } catch (e: any) {
    return json({ ok: false, error: "Excepción: " + (e?.message || String(e)) }, 500);
  }
});
