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
    tone: "Ejecutivo, claro, basado en datos. Cada slide debe tener cifras concretas (KPIs, %, $, plazos, deltas vs período anterior).",
    structure: "Portada → Resumen ejecutivo (3-5 KPIs grandes) → Hallazgos con datos → Análisis por área (con gráficos) → Comparación período actual vs anterior → Riesgos cuantificados → Recomendaciones con impacto $ esperado → Próximos pasos.",
    layouts: ["cover", "metrics-dashboard", "bar-chart", "data-table", "framework", "comparison", "checklist", "case-study", "closing"]
  },
  educativo: {
    tone: "Claro, pedagógico, accesible. Define con ejemplos numéricos. Casos reales con $$$.",
    structure: "Portada → Qué vas a aprender → Por qué importa (con estadísticas) → Concepto base (definición + ejemplo numérico) → Caso real con números → Aplicación práctica (paso a paso) → Errores comunes (cuantificados) → Aprendiste a... → Actividad para reforzar.",
    layouts: ["cover", "learning-objectives", "highlight", "goldbox", "comparison", "case-study", "framework", "metrics-dashboard", "bar-chart", "data-table", "checklist", "reflection-recap", "transfer-activity"]
  },
  pitch: {
    tone: "Persuasivo, narrativo, foco en el cliente. Storytelling → datos duros → CTA claro.",
    structure: "Portada → Problema cuantificado del cliente → Costo de no resolverlo ($) → Tu solución → Cómo funciona en 3-4 pasos numerados → Pruebas (casos con $$ y %) → Diferencial vs competencia (tabla comparativa) → Inversión con ROI esperado → Próximo paso (CTA).",
    layouts: ["cover", "highlight", "framework", "case-study", "comparison", "metrics-dashboard", "bar-chart", "data-table", "closing"]
  },
  marketing: {
    tone: "Punchy, visual, hooks fuertes. Datos cuantificados de impacto.",
    structure: "Hook con dato impactante → Problema con cifras → Antes vs Después (con métricas) → 3 beneficios cuantificados → Testimonios con resultados $ → Oferta clara → CTA.",
    layouts: ["cover", "highlight", "comparison", "framework", "metrics-dashboard", "quote", "closing"]
  },
  libre: {
    tone: "Adaptar al tema. Profesional, limpio, SIEMPRE con cifras concretas en cada slide.",
    structure: "Portada → Agenda → Desarrollo en bloques numerados (cada uno con stats) → Cierre con conclusión accionable.",
    layouts: ["cover", "agenda", "content", "framework", "comparison", "case-study", "highlight", "checklist", "metrics-dashboard", "bar-chart", "data-table", "closing"]
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
- bar_chart_data (array de {label, value}) — para layout "bar-chart" — value DEBE ser numérico (sin $ ni %)
- table_headers (array de strings) + table_rows (array de arrays de strings) — para layout "data-table"

🆕 NUEVOS LAYOUTS DISPONIBLES (preferirlos para máximo impacto visual):
- "bar-chart": gráfico de barras horizontales NATIVO — usar para comparar 3-6 cifras (ej: ROI por estrategia, precio por mercado, conversión por canal). Requiere bar_chart_data array.
- "data-table": tabla profesional NATIVA — usar para datos estructurados con varias columnas (ej: comparativa de productos, KPIs por trimestre). Requiere table_headers + table_rows.
- "metrics-dashboard": 4-8 big-number cards — usar para "los números clave del mes/proyecto". Requiere metric_cards.
- "framework": 4-8 mini-cards con label + value corto — usar para fases, etapas, componentes. Value DEBE ser ≤15 chars.
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

REGLAS GENERALES:
1. Title corto (max 8 palabras).
2. transition_in: si no es slide 1, OBLIGATORIO — 1 oración que conecte EXPLÍCITAMENTE con el slide anterior.
3. transition_out: si no es el último, OBLIGATORIO — 1 oración que abra el siguiente.
4. speaker_notes: 2-4 oraciones, guion natural para presentar — incluí 1 ejemplo concreto Y 1 cifra/dato.
5. Bullets max 12 palabras, max 5 por slide.

🎯 REGLA #1 ABSOLUTA (lo más importante):
ESTE SLIDE DEBE TENER CIFRAS CONCRETAS, NÚMEROS, DATOS CUANTITATIVOS.
Toda presentación profesional se gana con números. Cada slide DEBE incluir al menos 1-3 datos cuantitativos REALES (porcentajes, $, plazos, ratios, cantidades). Sin números, el slide no convence.

Por ejemplo:
✅ BIEN: "70% del ARV es el techo de compra" / "60-90 días de obra promedio" / "ROI mínimo 20%" / "$285K precio final venta"
❌ MAL: "compras inteligentes" / "obra rápida" / "buen retorno" / "precio alto"

INSTRUCCIONES POR CAMPO (CRÍTICO — leer con atención):

• stats: SIEMPRE incluir un array de 2-4 objetos {label, value, source_name} con cifras del slide. Esto se renderea como big-number cards. Ej:
  "stats": [
    {"label": "Días en mercado", "value": "47", "source_name": "Redfin"},
    {"label": "ROI promedio", "value": "22%", "source_name": "Caso interno"}
  ]

• framework_items: si usás framework, value DEBE ser corto (max 15 chars) — un número, %, sigla o palabra clave. NO descripciones largas. La descripción va en speaker_notes.
  ✅ BIEN: {"label": "Fase 1: Análisis", "value": "30 días"}
  ❌ MAL: {"label": "Fase 1: Análisis", "value": "Identificar propiedades infravaloradas usando criterios financieros claros: precio 70% del ARV..."}

• metric_cards: si layout es metrics-dashboard, llenar con {label, value, trend} donde value es la cifra grande y trend opcional como "+12%" o "vs Q1".

• comparison: para layout comparison, items DEBEN tener números si aplica (ej: "$185K compra" vs "$285K venta").

• case_study: SIEMPRE incluir números reales — compra, remodelación, arv, cash_flow_monthly, roi_anual, duracion_meses.

• checklist_items: title corto, detail puede explicar pero idealmente con un número o métrica.

• goldbox_runs: definición concisa (max 25 palabras totales) — NO un párrafo. Si el concepto es complejo, ponelo en goldbox_runs corto + complementá en speaker_notes.

• image_query: NO incluir (CSP de la app bloquea imágenes externas por ahora). Dejá ese campo en blanco.

📐 LÍMITES DE LARGO (para evitar overflow visual):
- title: max 8 palabras
- subtitle: max 12 palabras
- bullets: max 12 palabras c/u, max 5 bullets
- framework_items.label: max 30 chars
- framework_items.value: max 15 chars (¡CRÍTICO! — si es texto largo va a desbordar el card)
- goldbox_runs: max 25 palabras totales sumando todos los runs
- highlight_text: max 20 palabras
- comparison.items: max 8 palabras c/u, max 4 items por lado
- checklist_items: title max 8 palabras, detail max 12 palabras

${SLIDE_FIELDS_DOC}

DEVOLVÉ SOLO JSON VÁLIDO (sin markdown, sin comentarios). El JSON debe ser el OBJETO del slide directamente, NO un array, NO un wrapper.

Ejemplo PERFECTO para layout "framework" con números:
{
  "number": ${slideInfo.number},
  "title": "Las 5 fases del fix & flip",
  "block_label": "${slideInfo.block_label}",
  "layout": "${slideInfo.layout}",
  "framework_items": [
    {"label": "1. Análisis", "value": "30 días"},
    {"label": "2. Compra", "value": "≤70% ARV"},
    {"label": "3. Renovación", "value": "60-90 días"},
    {"label": "4. Listing", "value": "5-10 días"},
    {"label": "5. Venta", "value": "20%+ ROI"}
  ],
  "stats": [
    {"label": "Ciclo total promedio", "value": "5 meses"},
    {"label": "ROI objetivo", "value": "20-30%"}
  ],
  "transition_in": "...",
  "transition_out": "...",
  "speaker_notes": "..."
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
