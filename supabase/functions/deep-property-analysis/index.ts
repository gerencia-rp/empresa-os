import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  let analysisId: string | undefined;
  try {
    const body = await req.json();
    analysisId = body.analysisId;
    if (!analysisId) throw new Error("analysisId required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Cargar análisis + propiedad asociada + appraisals + cases históricas
    const { data: analysis, error: aErr } = await supabase
      .from("property_analyses").select("*").eq("id", analysisId).single();
    if (aErr || !analysis) throw new Error("Analysis not found");

    await supabase.from("property_analyses").update({ status: "analyzing" }).eq("id", analysisId);

    const inputs = analysis.inputs || {};

    // Pull data de sistemas relacionados (memoria compartida)
    let relatedProperty: any = null;
    if (analysis.property_id) {
      const { data: p } = await supabase.from("properties").select("*").eq("id", analysis.property_id).single();
      relatedProperty = p;
    }

    // Pull histórico de remodelaciones similares (calibrar costo)
    const { data: histCases } = await supabase
      .from("renovation_cases")
      .select("address,sqft,internal_cost,deviation_pct,city,lider,year_built")
      .gte("sqft", (inputs.sqft || 1500) - 500)
      .lte("sqft", (inputs.sqft || 1500) + 500)
      .limit(8);

    // Pull appraisals zonales (calibrar ARV)
    const zip = inputs.zip || relatedProperty?.zip;
    let zonalAppraisals: any[] = [];
    if (zip) {
      const { data } = await supabase
        .from("appraisals")
        .select("property_address,gla_sqft,appraised_value,price_per_sqft,condition_rating,year_built")
        .eq("zip", zip)
        .eq("status", "done")
        .limit(8);
      zonalAppraisals = data || [];
    }

    // Construir prompt master
    const today = new Date().toISOString().split('T')[0];
    const prompt = buildAnalysisPrompt({
      analysis, inputs, relatedProperty, histCases: histCases || [], zonalAppraisals, today
    });

    // Llamar a Claude con web_search
    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 16000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 15 }],
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!claudeResp.ok) throw new Error("Claude API: " + await claudeResp.text());

    const claudeData = await claudeResp.json();
    const allText = (claudeData.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    // Extraer JSON final
    let result;
    const jsonMatch = allText.match(/```json\s*([\s\S]*?)```/) || allText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response. Sample: " + allText.slice(0, 500));
    try {
      result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (e) {
      throw new Error("JSON parse error: " + (e instanceof Error ? e.message : String(e)));
    }

    // Persistir
    await supabase.from("property_analyses").update({
      status: "done",
      processed_at: new Date().toISOString(),
      result,
      score: result.recommendation?.confidence_score ?? null,
      decision: result.recommendation?.decision ?? null
    }).eq("id", analysisId);

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (analysisId) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from("property_analyses").update({ status: "error", error_message: msg }).eq("id", analysisId);
      } catch {}
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});

function buildAnalysisPrompt({ analysis, inputs, relatedProperty, histCases, zonalAppraisals, today }: any) {
  const histSummary = histCases.length
    ? histCases.map((c: any) => `- ${c.address}: ${c.sqft}sqft, costó $${Math.round(c.internal_cost).toLocaleString()}, desv ${(c.deviation_pct*100||0).toFixed(1)}%, lider ${c.lider}`).join("\n")
    : "(sin casos históricos similares)";

  const appraisalsSummary = zonalAppraisals.length
    ? zonalAppraisals.map((a: any) => `- ${a.property_address}: ${a.gla_sqft}sqft, $${Math.round(a.appraised_value).toLocaleString()} = $${Math.round(a.price_per_sqft)}/sqft, ${a.condition_rating}, año ${a.year_built}`).join("\n")
    : "(sin appraisals en el zip)";

  const photosNote = (inputs.photo_paths || []).length
    ? `Hay ${inputs.photo_paths.length} fotos subidas en Supabase storage en bucket 'property-photos'. Considera condición visual reportada en notas.`
    : "(sin fotos subidas)";

  return `Eres un experto inversor inmobiliario residencial (Fix & Flip + BRRRR + rental) en mercado Austin TX y alrededores. Hoy es ${today}.

Tu tarea: hacer el ANÁLISIS MÁS COMPLETO Y PROFUNDO POSIBLE de esta propiedad para decidir si comprarla. Usa web_search exhaustivamente para validar TODO con datos reales del mercado actual.

═══════════════════════════════════════════
DATOS DE LA PROPIEDAD
═══════════════════════════════════════════
Dirección: ${analysis.address}
${inputs.listing_url ? `Listing: ${inputs.listing_url}` : ''}
${inputs.zip ? `Zip: ${inputs.zip}` : ''}
${inputs.sqft ? `Sqft: ${inputs.sqft}` : ''}
${inputs.beds ? `Beds/Baths: ${inputs.beds}/${inputs.baths}` : ''}
${inputs.year ? `Año construcción: ${inputs.year}` : ''}
${inputs.lot ? `Lot size: ${inputs.lot} sqft` : ''}

NÚMEROS PROPUESTOS:
- Precio compra: $${inputs.purchase_price?.toLocaleString() || '?'}
- Remodelación estimada: $${inputs.remodel_estimate?.toLocaleString() || '?'}
- ARV estimado: $${inputs.arv_estimate?.toLocaleString() || '?'}

ESTRATEGIA ELEGIDA: ${inputs.strategy || 'BRRRR / Fix and Flip'}

NOTAS DEL INVERSIONISTA:
${inputs.notes || '(sin notas)'}

${inputs.comps_urls?.length ? `COMPARABLES PROVEÍDOS:\n${inputs.comps_urls.map((u: string) => '- ' + u).join('\n')}` : ''}

${photosNote}

═══════════════════════════════════════════
DATA HISTÓRICA INTERNA (para calibrar)
═══════════════════════════════════════════
CASAS REMODELADAS SIMILARES (sqft cercano):
${histSummary}

APPRAISALS EN EL MISMO ZIP:
${appraisalsSummary}

${relatedProperty ? `PROPIEDAD YA EN SISTEMA:
- ARV previo: $${relatedProperty.arv || '?'}
- Cash-out estimado previo: $${relatedProperty.cashout_estimated || '?'}
- Costo remodel previo: $${relatedProperty.remodel_cost_estimated || '?'}
- Hipoteca mensual: $${relatedProperty.mortgage_monthly || '?'}` : ''}

═══════════════════════════════════════════
TU TRABAJO
═══════════════════════════════════════════
Investiga RIGUROSAMENTE estos puntos usando web_search (mínimo 10 búsquedas). Para cada uno, cita las fuentes encontradas:

1. **UBICACIÓN**: vecindario, school ratings (GreatSchools), crime rate (NeighborhoodScout/CrimeMapping), walkability (Walk Score), commute al centro, gentrification trend
2. **MERCADO**: ARV real (busca comps recientes en Redfin/Zillow del mismo zip, mismo bed/bath, sold últimos 6 meses), tendencia de precios YoY, días en mercado, demand/supply
3. **RENTA**: rent estimates para esa zona por modelo (long-term Zillow Rent, Airbnb AirDNA, mid-term Furnished Finder, by-room PadSplit)
4. **REMODELACIÓN**: dado año/sqft/condición visible, scope realista, costos por categoría en Austin 2026 mayo, hidden costs típicos en casas de ese año
5. **FINANCIAL**: BRRRR check (precio + remodel < 75% ARV?), cashflow proyectado por modelo, cap rate vs market, COC return
6. **RIESGOS**: 5+ riesgos específicos (zone change, flood plain, foundation, market correction, oversupply, etc.)
7. **DECISIÓN**: compra recomendada o no, score 1-10, máximo precio razonable, razonamiento

═══════════════════════════════════════════
FORMATO DE RESPUESTA
═══════════════════════════════════════════
Devuelve SOLO un objeto JSON (sin markdown fences extra) con esta estructura exacta:

{
  "executive_summary": "1 párrafo (3-5 oraciones) con la conclusión más importante",
  "location_analysis": {
    "neighborhood": "nombre + descripción",
    "schools_rating": "GreatSchools rating + nombres",
    "crime_level": "low/medium/high + descripción específica",
    "walkability_score": número 0-100,
    "commute_downtown_minutes": número,
    "gentrification_trend": "improving/stable/declining + razón",
    "sources": ["url1", "url2"]
  },
  "market_analysis": {
    "arv_validated": número (tu ARV real basado en comps),
    "arv_vs_estimate_pct": número (% diferencia con la estimación del usuario),
    "comps_found": [
      {"address": "...", "sold_price": 0, "sold_date": "YYYY-MM-DD", "sqft": 0, "ppsf": 0, "url": "..."}
    ],
    "ppsf_market": número,
    "market_trend_yoy": "+X% / -X%",
    "days_on_market_avg": número,
    "demand_level": "high/medium/low",
    "rent_estimates": {
      "long_term": número,
      "by_room_per_room": número,
      "mid_term": número,
      "short_term_nightly": número,
      "short_term_occupancy_pct": número
    },
    "sources": ["url1", "url2"]
  },
  "remodel_analysis": {
    "scope_recommended": "lipstick/light/heavy/full/gut",
    "estimated_cost_range": {"low": 0, "typical": 0, "high": 0},
    "vs_user_estimate": "below/at/above + diferencia $",
    "hidden_costs_to_watch": ["cost1", "cost2"],
    "timeline_days": número,
    "key_categories": [
      {"name": "Cocina completa", "estimated_cost": 0, "priority": "must/should/nice"}
    ]
  },
  "financial_analysis": {
    "brrrr_check": {
      "total_in": 0,
      "arv_75_pct": 0,
      "passes_brrrr_rule": true/false,
      "explanation": "..."
    },
    "cashflow_by_model": {
      "long_term": {"gross_rent": 0, "expenses": 0, "net_cashflow": 0},
      "by_room": {"gross_rent": 0, "expenses": 0, "net_cashflow": 0},
      "mid_term": {"gross_rent": 0, "expenses": 0, "net_cashflow": 0},
      "short_term": {"gross_rent": 0, "expenses": 0, "net_cashflow": 0}
    },
    "best_model": "long_term|by_room|mid_term|short_term",
    "cap_rate_pct": número,
    "coc_return_pct": número,
    "breakeven_months": número
  },
  "risks": [
    {"risk": "nombre", "severity": "low/medium/high", "mitigation": "..."}
  ],
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "recommendation": {
    "decision": "buy" | "pass" | "negotiate",
    "confidence_score": número 1-10,
    "max_offer_price": número,
    "reasoning": "2-4 oraciones explicando la decisión",
    "deal_breakers": ["..."]
  },
  "next_steps": ["paso 1", "paso 2", "paso 3"]
}

IMPORTANTE:
- Sé conservador en los números (filosofía de la empresa: "si funciona con los peores números, es buen deal")
- TODA estimación monetaria debe tener fuente en web_search
- Si información crítica falta, pídela en next_steps en lugar de inventar
- Score 8+ solo si TODOS los números son sólidos. Score < 5 = pass claro.`;
}
