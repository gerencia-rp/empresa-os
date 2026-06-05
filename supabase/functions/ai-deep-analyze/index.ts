import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Prompts especializados por sistema ───
const SYSTEM_PROMPTS: Record<string, (ctx: any, today: string) => string> = {

  // ============================================================
  // PREDICTOR DE CASHFLOW
  // ============================================================
  'cashflow-predictor': (ctx, today) => `Eres un experto inversor inmobiliario residencial en ${ctx.city || 'Austin'}, ${ctx.state || 'TX'}. Hoy es ${today}.

Esta propiedad será evaluada como RENTA con modelo "${ctx.model_label}":
- Dirección: ${ctx.address || 'sin dirección'}
- ARV: $${ctx.arv?.toLocaleString() || '?'}
- ${ctx.bedrooms} habitaciones / ${ctx.bathrooms} baños
- Hipoteca: $${ctx.mortgage_monthly?.toLocaleString() || '?'}/mes
- Renta estimada actual: $${ctx.current_gross_rent?.toLocaleString() || '?'}/mes

Investiga RIGUROSAMENTE en internet (mínimo 8 web_searches) para ESTA dirección específica:

1. **Renta real del mercado** para ese modelo:
   - Si "long_term": busca rent comps Zillow/RentCafe/Realtor para ${ctx.bedrooms}BR en ese zip
   - Si "by_room": busca PadSplit/Roomies precios por habitación en esa zona
   - Si "mid_term": busca Furnished Finder rates para travel nurses
   - Si "short_term": busca AirDNA/AirROI/Rabbu ADR y ocupación REAL del zip
2. **Vacancy/Occupancy** actual del submercado (no defaults)
3. **Restricciones legales**: STR permits requeridos en Austin? ADU rules?
4. **Competencia en la zona** (cuántos Airbnbs activos, oversaturación?)
5. **Demand level** (¿quién renta ahí: students, families, travel workers?)
6. **Seasonality** si aplica
7. **Recommended adjustments** a la renta estimada por características de la propiedad

Devuelve SOLO JSON (sin markdown):
{
  "validated_rent": { "low": 0, "typical": 0, "high": 0, "confidence": "high|medium|low" },
  "vs_user_estimate": "+X%/-X%",
  "market_comps": [ { "source": "Zillow", "price": 0, "url": "..." } ],
  "vacancy_or_occupancy_real": "número y descripción",
  "legal_restrictions": ["..."],
  "competition_level": "low|medium|high + descripción",
  "demand_profile": "...",
  "seasonality_note": "...",
  "key_risks": ["..."],
  "recommendations": ["..."],
  "best_model_for_this_property": "long_term|by_room|mid_term|short_term + razón",
  "expected_monthly_cashflow_range": { "low": 0, "typical": 0, "high": 0 },
  "summary": "1 párrafo con la conclusión"
}`,

  // ============================================================
  // CASHOUT REFI
  // ============================================================
  'cashout-refi': (ctx, today) => `Eres experto en refinanciación BRRRR Texas. Hoy es ${today}.

Esta propiedad:
- Dirección: ${ctx.name || ctx.address}
- ARV usuario: $${ctx.arv?.toLocaleString()}
- Payoff HML: $${ctx.payoff?.toLocaleString()}
- LTV asumido: ${ctx.ltv}%
- Closing costs asumidos: $${ctx.closing_costs?.toLocaleString()}

Investiga en internet (mínimo 6 web_searches):
1. **ARV real**: busca comps recientes Redfin/Zillow del zip ${ctx.zip || ''} para casa de ~${ctx.sqft || '?'}sqft. ¿Tu ARV es realista?
2. **LTV real** que lenders Texas dan en mayo 2026 para DSCR cash-out refi
3. **Tasas actuales** DSCR/conv 30-year Texas mayo 2026 (rango)
4. **Closing costs típicos** en Texas para refi de investor (sin escrow vs con escrow)
5. **Cash-out reserves** requeridos por lenders (6 months PITI típico)

Devuelve SOLO JSON:
{
  "arv_validated": { "low": 0, "typical": 0, "high": 0 },
  "arv_vs_user_pct": número,
  "ltv_market_real": "70-80%",
  "rate_market_now_pct": "7.X-8.X%",
  "closing_costs_real": "X% del loan típico",
  "reserves_required": "6 months PITI o equivalente",
  "comps_found": [ { "address": "", "sold_price": 0, "ppsf": 0, "url": "" } ],
  "lender_recommendations": ["Kiavi", "Lima One", "etc"],
  "cashout_realistic_range": { "low": 0, "typical": 0, "high": 0 },
  "risks": ["..."],
  "summary": "1 párrafo"
}`,

  // ============================================================
  // LOAN CALCULATOR
  // ============================================================
  'loan-calculator': (ctx, today) => `Eres experto en HML y financiamiento residencial Texas. Hoy es ${today}.

Deal:
- Precio compra: $${ctx.purchase_price?.toLocaleString()}
- Remodel: $${ctx.remodel_cost?.toLocaleString()}
- ARV: $${ctx.arv?.toLocaleString()}
- Modo análisis: ${ctx.mode}

Investiga en internet (mínimo 8 web_searches) para mayo 2026:
1. **HML actuales en Texas** (Kiavi, Lima One, Streamline, Lightning Funding, Easy Street): LTC%, rate, points, term típico
2. **DSCR / Conv 30-y investor** lenders activos en TX: LTV%, rate, plazos, requisitos DSCR mínimo
3. **Closing costs reales** para investor (no homeowner) en TX 2026
4. **Loan products específicos** para fix-and-flip vs BRRRR
5. **Lender ranking** por velocidad de cierre y aprobación

Devuelve SOLO JSON:
{
  "hml_market_now": { "ltc_range_pct": "80-90%", "rate_range_pct": "10.5-13%", "points_range": "1-3", "term_typical_months": "6-12", "best_lenders": ["Kiavi","Lima One"] },
  "conv30_market_now": { "ltv_range_pct": "70-80%", "rate_range_pct": "7.25-8.0%", "dscr_min": 1.0, "closing_costs_pct": "6-8%", "best_lenders": ["..."] },
  "specialty_products": ["fix-and-flip line of credit", "DSCR loans no income verification"],
  "fast_close_lenders": ["..."],
  "recommendations_for_deal": ["..."],
  "estimated_total_cost_realistic": 0,
  "summary": "1 párrafo con recomendación específica para este deal"
}`,

  // ============================================================
  // ARV CALC
  // ============================================================
  'arv-calc': (ctx, today) => `Eres appraiser experto residencial Austin TX. Hoy es ${today}.

Casa a estimar:
- Zip: ${ctx.zip}
- ${ctx.sqft} sqft, ${ctx.beds}BR/${ctx.baths}BA, año ${ctx.year_built}, lot ${ctx.lot_size}sqft
- Condition target: ${ctx.condition}
- ARV estimado por mi sistema (basado en appraisals propios): $${ctx.system_arv?.toLocaleString()}

Investiga en internet (mínimo 6 web_searches):
1. **Comps activos y sold** Redfin/Zillow/Realtor zip ${ctx.zip}, mismo BR/BA, ±15% sqft, sold últimos 6 meses
2. **$/sqft promedio del zip** y trend YoY
3. **Condition adjustments** típicos C2 vs C3 vs C4 en este zip
4. **Days on market** y demanda
5. **Premium/discount** por características especiales (pool, garage, lot grande)

Devuelve SOLO JSON:
{
  "arv_market_range": { "low": 0, "typical": 0, "high": 0 },
  "ppsf_market": número,
  "vs_system_estimate_pct": número,
  "comps_found": [ { "address": "", "sold_price": 0, "sqft": 0, "ppsf": 0, "condition": "", "url": "" } ],
  "market_trend_yoy_pct": número,
  "days_on_market_avg": número,
  "condition_adjustment_per_level": "C2→C3: +$X/sqft típico",
  "premium_features_in_zip": ["..."],
  "summary": "1 párrafo + recomendación de ARV final"
}`,

  // ============================================================
  // REMODEL PRO — análisis ingenieril completo
  // ============================================================
  'remodel-pro': (ctx, today) => `Eres ingeniero civil + GC con 20+ años en remodelación residencial Texas. Hoy es ${today}.

PROYECTO A ANALIZAR:
- Nombre: ${ctx.project_name}
- Dirección: ${ctx.address || '(sin dirección)'}
- Sqft: ${ctx.sqft}
- Crew planificado: ${ctx.crew_size} personas
- Total actividades: ${ctx.activities_count}
- Días estimados: ${ctx.total_days}

${ctx.matterport_url ? `🌐 TOUR 360° MATTERPORT: ${ctx.matterport_url}
(Si puedes visitar el link, valida medidas y características visualmente. Si no, considera que el sqft fue verificado con Matterport real.)` : ''}

${ctx.scope_text ? `📝 SCOPE DETALLADO DEL CLIENTE:
"""
${ctx.scope_text}
"""
USA este scope para validar que las actividades seleccionadas cubren TODO lo que el cliente quiere. Si falta algo, dilo en "missing_categories".` : ''}

${ctx.scope_audio_transcript ? `🎙️ TRANSCRIPCIÓN AUDIO SCOPE:
"${ctx.scope_audio_transcript}"` : ''}

${ctx.plans_count > 0 ? `📐 PLANOS ADJUNTOS: ${ctx.plans_count} archivos uploaded (planos arquitectónicos/estructurales). Asume que se hizo análisis técnico previo.` : ''}
${ctx.photos_count > 0 ? `📷 FOTOS DEL ESTADO ACTUAL: ${ctx.photos_count} fotos disponibles para evaluar condición visible.` : ''}

PRESUPUESTO ACTUAL:
- Costo directo: $${ctx.direct_cost?.toLocaleString()}
- Costo interno (con contingencia ${ctx.contingency_pct}% + overhead ${ctx.overhead_pct}%): $${ctx.internal_cost?.toLocaleString()}
- Precio al cliente (markup ${ctx.markup_pct}%): $${ctx.client_price?.toLocaleString()}

ACTIVIDADES SELECCIONADAS (top 30):
${(ctx.activities_summary || []).map((a: any) => `- ${a.code} ${a.desc} (qty:${a.qty}, $${Math.round(a.total).toLocaleString()})`).join('\n')}

═══════════════════════════════════════
TU TRABAJO (mínimo 8 web_searches):
═══════════════════════════════════════
1. **Validar pricing por categoría** vs mercado actual Texas mayo 2026 (cocina, baños, pisos, drywall, exterior). Cita fuentes (HomeAdvisor, Angi, Houzz, RSMeans, contractors locales).
2. **Lead times reales** para materiales especiales (custom cabinets, quartz, windows). ¿El cronograma considera esperas?
3. **Permits ciudad específica** (Austin/Round Rock/Marlin): costo real, tiempos de aprobación, qué requiere permit
4. **Hidden costs típicos** que suelen aparecer en remodelaciones (foundation, asbestos, lead paint, electrical to code, plumbing rotten)
5. **Supply chain issues actuales** que afectan pricing (lumber, drywall, fixtures)
6. **Labor market Texas** mayo 2026: rate real por trade, escasez, recomendaciones
7. **Contingencia recomendada** para casa de esa edad / tipo de scope
8. **Markup competitivo** Texas 2026 vs el ${ctx.markup_pct}% aplicado

Devuelve SOLO JSON (sin markdown):
{
  "summary": "1 párrafo con veredicto ingenieril del presupuesto/cronograma",
  "pricing_validation": {
    "direct_cost_realistic": true/false,
    "vs_market_pct": número,
    "categories_overpriced": ["..."],
    "categories_underpriced": ["..."],
    "missing_categories": ["líneas que faltan agregar al scope"]
  },
  "contingency_recommendation": {
    "current_pct": ${ctx.contingency_pct},
    "recommended_pct": número,
    "reason": "..."
  },
  "schedule_analysis": {
    "total_days_realistic": true/false,
    "lead_times_to_add_days": número,
    "inspections_to_add_days": número,
    "weather_buffer_days": número,
    "realistic_total_days": número
  },
  "missing_soft_costs": ["..."],
  "hidden_cost_risks": [{"risk": "...", "estimated_cost": 0, "likelihood": "low/medium/high"}],
  "permits_required": ["...", "..."],
  "permits_estimated_cost": número,
  "supply_chain_alerts": ["..."],
  "labor_market_note": "...",
  "markup_recommendation": {"competitive_range": "X-Y%", "your_markup": ${ctx.markup_pct}, "recommendation": "raise/lower/keep + reason"},
  "critical_path_warnings": ["..."],
  "engineering_recommendations": ["..."],
  "expected_real_internal_cost_range": {"low": 0, "typical": 0, "high": 0},
  "expected_profit_margin_pct": número,
  "go_no_go": "go|hold|renegotiate",
  "confidence_score": "1-10"
}

CRITERIOS:
- Sé CONSERVADOR (filosofía: si funciona con peores números, es buen deal)
- Cita fuentes en cada estimación
- Si falta info crítica, dilo en engineering_recommendations
- score 8+ solo si TODO es sólido`,

  // ============================================================
  // ESTIMADOR DE REMODELACIÓN (legacy fix-flip)
  // ============================================================
  'estimator': (ctx, today) => `Eres GC experto en remodelación residencial Texas. Hoy es ${today}.

Proyecto:
- ${ctx.sqft} sqft, tipo: ${ctx.type_label}
- Ciudad: ${ctx.city}, ${ctx.state}
- Trabajos seleccionados: ${ctx.jobs_count}
- Costo interno calculado: $${ctx.internal_cost?.toLocaleString()}
- Crew: ${ctx.crew_size}

Investiga en internet (mínimo 6 web_searches) para mayo 2026 ${ctx.city}:
1. **Costo por categoría** real actualizado: cocina completa, baño, pisos, drywall, exterior, roofing en ${ctx.city}
2. **Supply chain issues** activos que afectan precios (lumber, drywall, fixtures)
3. **Labor shortage** en TX y su impacto en pricing
4. **Permits/inspections** requeridos en ${ctx.city} y costo
5. **Hidden costs** comunes en casas del año ${ctx.year_built || 'desconocido'}: foundation, lead, asbestos, electrical updates
6. **Timeline real** vs el calculado

Devuelve SOLO JSON:
{
  "market_pricing_by_category": { "cocina_completa": { "min": 0, "typical": 0, "max": 0, "source": "" }, "bano_completo": { ... } },
  "vs_internal_pct": número,
  "supply_chain_notes": "...",
  "permit_costs": { "typical": 0, "what_requires_permit": ["..."] },
  "hidden_costs_for_year_built": ["..."],
  "labor_market_note": "...",
  "timeline_realistic_days": número,
  "recommendations": ["..."],
  "summary": "1 párrafo"
}`,

  'pm-okrs': (ctx, today) => `Eres COO/Chief of Staff experto en empresas de real estate (fix & flip + rentas + property mgmt). Hoy es ${today}.

CONTEXTO OPERATIVO DE LA EMPRESA "${ctx.company}":
${JSON.stringify(ctx, null, 2)}

Tu trabajo: proponer 4-6 OKRs (Objectives + Key Results) AMBICIOSOS pero alcanzables para el próximo trimestre, basados en la operación REAL actual.

REGLAS:
1. OBJECTIVE: aspiracional, en lenguaje natural, retador (no "mantener X" sino "transformar X")
2. KEY RESULTS: numéricos + medibles + ambiciosos (60-80% probabilidad de lograrlos = stretch goal correcto)
3. Mezclá categorías: operacional, financiero, de equipo, de calidad
4. Mira los puntos débiles (overdue_pct alto → OKR de cycle time · backlog grande → OKR de throughput · etc.)
5. Para Remodelación: márgenes, cycle time obra, % cierres a tiempo, GP en obra
6. Para Rentas: occupancy %, tenant retention, response time, NOI
7. Para Fix & Flip: deals/quarter, margen %, días-on-market, ROI

Devolvé SOLO un JSON válido:
{
  "context": "1 línea describiendo el momento de la empresa basado en el contexto",
  "suggestions": [
    {
      "objective": "Reducir el tiempo de cierre de obra de 90 a 70 días sin perder calidad",
      "rationale": "Por qué: el avg_cycle_days es 90 y costo de capital en obra es alto. Reducir 20% libera capital.",
      "key_results": [
        { "title": "Cycle time promedio obra", "target": 70, "unit": "días" },
        { "title": "% obras cerradas dentro de timeline", "target": 80, "unit": "%" },
        { "title": "Margen bruto por obra", "target": 25, "unit": "%" }
      ]
    }
  ],
  "summary": "1 párrafo del estado actual"
}`,

  'pm-risks': (ctx, today) => `Eres risk officer experto en empresas inmobiliarias en Texas. Hoy es ${today}.

CONTEXTO OPERATIVO DE LA EMPRESA "${ctx.company}":
${JSON.stringify(ctx, null, 2)}

Tu trabajo: detectar 4-8 RIESGOS REALES no registrados todavía, basándote en patrones de la operación.

LENTES A CONSIDERAR:
- Concentración: ¿1 persona con muchas tareas overdue? bus factor
- Compliance: vencimientos próximos sin owner
- Capital: backlog enorme + capital en obra alto → riesgo de cash crunch
- Operacional: cycle time degradándose, mucho atascado en 1 status
- Mercado: rate hikes, tax bills (Travis sube assess en enero), insurance hikes
- Legal: contratos por vencer, permits sin renovar, GC liability, tenant evictions
- Reputacional: tareas muy viejas con clientes/inquilinos esperando

PARA CADA RIESGO:
- probability 1-5 (1=raro, 5=casi seguro)
- impact 1-5 (1=mínimo, 5=catastrófico para el negocio)
- score = probability × impact
- evidence: dato concreto del contexto que lo respalda
- mitigation: 1 acción específica para reducirlo

Devolvé SOLO JSON válido:
{
  "detected_risks": [
    {
      "title": "Cash crunch en Q3 por capital en obra alto + cierre lento",
      "category": "financiero",
      "probability": 3, "impact": 5, "score": 15,
      "evidence": "X obras activas con avg_cycle +30d sobre target. Capital expuesto $XXX.",
      "mitigation": "Auditar 3 obras más viejas y forzar cierre antes de 60d. Renegociar lender para extender HML."
    }
  ],
  "recommendations": ["acción general 1", "acción general 2"],
  "summary": "1 párrafo del nivel de riesgo agregado"
}`,

  'edu-report': (ctx, today) => `Eres COO + Head of Education de una empresa de educación inmobiliaria con experiencia 10+ años escalando programas de mentoría. Hoy es ${today}.

Vas a escribir un INFORME EJECUTIVO PROFUNDO para la reunión semanal de management. Este informe debe ser de calidad consultora top-tier (McKinsey-level): datos crudos + insights no obvios + recomendaciones específicas con dueño y deadline.

CONTEXTO DEL PERÍODO:
- Mentoría: ${ctx.mentorship}
- Período: ${ctx.period_type} (${ctx.period_start} → ${ctx.period_end})

SNAPSHOT ESTUDIANTES:
- Total: ${ctx.snapshot?.total_students}
- Activos: ${ctx.snapshot?.active}
- At-risk: ${ctx.snapshot?.at_risk}
- Graduados: ${ctx.snapshot?.graduated}
- Pausados: ${ctx.snapshot?.paused}

MOVIMIENTOS DEL PERÍODO:
- Nuevos ingresos: ${ctx.movements?.new_enrolled || 0}
- Cambios de etapa: ${ctx.movements?.stage_changes || 0}

CARTERA (CRÍTICO PARA NEGOCIO):
- Pagos activos: ${ctx.cartera?.active}
- Atrasados (past_due): ${ctx.cartera?.past_due}
- Vencidos (expired): ${ctx.cartera?.expired}
- Vencen ≤30d: ${ctx.cartera?.expiring_soon}

DISTRIBUCIÓN POR ETAPA DEL PROGRAMA:
${JSON.stringify(ctx.by_stage || {}, null, 2)}

GLSCORE (0-100, indicador de progreso):
- Promedio: ${ctx.avg_glscore || '?'}/100
- 🏆 Excelente ≥80: ${ctx.glscore_bands?.excelente || 0}
- ✅ Bueno 60-79: ${ctx.glscore_bands?.bueno || 0}
- ⚠️  Atención 40-59: ${ctx.glscore_bands?.atencion || 0}
- 🔴 Crítico <40: ${ctx.glscore_bands?.critico || 0}

TOP PERFORMERS (5):
${JSON.stringify(ctx.top_students || [], null, 2)}

ESTUDIANTES EN RIESGO:
${JSON.stringify(ctx.at_risk_students || [], null, 2)}

NOTAS DE CLASES GRABADAS DEL COACH (esto es ORO si lo pasó):
${ctx.classes_notes || '(el coach no agregó notas de clases — pedí en recomendaciones que las pase la próxima)'}

EL INFORME DEBE SER PROFUNDO. Estructura obligatoria (cada sección con análisis real, no genérico):

### 1. RESUMEN EJECUTIVO (4-6 oraciones)
- Estado general del programa con UNA conclusión clara
- ¿Vamos bien o mal? Por qué
- 1 número clave que importa esta semana

### 2. HIGHLIGHTS DEL PERÍODO
- 3-5 cosas que movieron la aguja
- Mix de wins (graduación, milestone alcanzado, top performer) y risks (estudiante saliendo, etapa atascada)
- Cada uno con nombre y dato concreto

### 3. ANÁLISIS DE CARTERA Y CASH (sección crítica)
- Cuántos vencen en próximos 30 días → estimación de MRR en juego
- Patrón de churn detectado (si lo hay): ¿quién se está yendo y por qué?
- Renovaciones esperadas vs históricas (si hay data histórica)
- ALERTA si past_due > 5% del total
- 💰 RECOMENDACIÓN ESPECÍFICA para comercial: lista de quiénes contactar YA

### 4. ANÁLISIS PEDAGÓGICO PROFUNDO
- Distribución por etapa: ¿el funnel está sano o hay cuello de botella?
- Cuál es la etapa con MAYOR tiempo promedio (data lenta)
- Cuál es la etapa donde más estudiantes se atascan
- Top performers: qué tienen en común (analiza patrones)
- At-risk: qué tienen en común (común denominador)
- Brecha entre top y bottom: ¿el programa está creando 2 velocidades?

### 5. ANÁLISIS DE CLASES (si hay notas del coach)
- Temas que funcionaron (engagement alto, dudas constructivas)
- Temas confusos (dudas repetidas, baja participación)
- Temas que faltan según el patrón de preguntas
- Recomendación de contenido para próximas clases
Si NO hay notas: pedir al coach que las pase con un template específico

### 6. DEEP INSIGHTS (lo que un COO experto vería que no es obvio)
3 insights no obvios cruzando datos:
- Correlaciones (ej. "todos los at_risk están en la etapa X — el problema es ahí, no en ellos")
- Patrones temporales (ej. "el 80% del churn pasa en mes 3 — algo cambia ahí")
- Oportunidades ocultas (ej. "los graduados del Q anterior podrían ser ambassadors")

### 7. ACCIONES RECOMENDADAS (jerárquicas)
Lista de 5-8 acciones con:
- Acción específica (no "mejorar X" sino "hacer Y específico")
- Dueño: Coach / Comercial / Operaciones / Marketing
- Prioridad: high / medium / low
- Due in days: realista
- Métrica de éxito: cómo saber si funcionó

Tono: profesional, directo, sin corporate-speak. Hablás castellano neutro/rioplatense. NO inventes números — todo viene de la data que te di.

Devolvé SOLO JSON válido (sin markdown wrapper, sin comentarios):
{
  "title": "Informe ${ctx.period_type === 'weekly' ? 'Semanal' : ctx.period_type === 'biweekly' ? 'Quincenal' : 'Mensual'} · ${ctx.period_start} → ${ctx.period_end} · ${ctx.mentorship}",
  "summary_md": "## Resumen Ejecutivo\\n\\n[4-6 oraciones, una conclusión clara]\\n\\n## Highlights del Período\\n\\n[3-5 highlights con nombre y dato]\\n\\n## 💰 Análisis de Cartera y Cash\\n\\n[Profundidad, cifras, MRR en riesgo]\\n\\n## 📚 Análisis Pedagógico Profundo\\n\\n[Cuello de botella, patrones top vs bottom]\\n\\n## 🎙 Análisis de Clases\\n\\n[Si hay notas, análisis. Si no, qué pedir al coach]\\n\\n## 🔍 Deep Insights (no obvios)\\n\\n1. [insight 1]\\n2. [insight 2]\\n3. [insight 3]\\n\\n## 🎯 Acciones Recomendadas\\n\\n[Lista numerada con dueño y deadline]",
  "kpis": {
    "active_students": number,
    "at_risk": number,
    "avg_glscore": number,
    "expiring_30d": number,
    "mrr_at_risk_estimated": "monto en USD si tenés precio del programa, sino null",
    "completion_velocity": "ranking de velocidad de avance"
  },
  "insights": [
    "insight 1 con número específico",
    "insight 2 con correlación detectada",
    "insight 3 con patrón temporal o cross-cohort"
  ],
  "recommendations": [
    { "action": "Llamada inmediata con [nombre estudiante] que vence en X días", "owner": "Comercial", "priority": "high", "due_in_days": 3, "success_metric": "estudiante renovado o cerrado oficialmente" },
    { "action": "Sesión grupal sobre [tema] que el 60% de estudiantes pregunta", "owner": "Coach", "priority": "medium", "due_in_days": 14, "success_metric": "60% de los at_risk avanzan de etapa en 30d" }
  ],
  "highlights": [
    { "type": "win", "student_name": "[nombre]", "detail": "alcanzó [milestone] esta semana, primer estudiante en [N] meses" },
    { "type": "risk", "student_name": "[nombre]", "detail": "lleva 45d en etapa con target de 14d, ya consumió 60% del programa" },
    { "type": "milestone", "student_name": "general", "detail": "MRR de cohort llegó a $X, +Y% vs período anterior" }
  ]
}`,

  'edu-plan': (ctx, today) => `Eres mentor experto en real estate (${ctx.mentorship}). Hoy es ${today}.

CONTEXTO DEL ESTUDIANTE:
- Nombre: ${ctx.student?.name}
- Mentoría: ${ctx.mentorship}
- Etapa actual: ${ctx.current_stage} (target ${ctx.stage_target_weeks||'?'} semanas, lleva ${ctx.days_in_stage||0} días)
- Inscrito desde: ${ctx.student?.enrolled_at}
- Vence: ${ctx.student?.expires_at || 'sin fecha'}
- GLScore: ${ctx.student?.glscore || '?'}/100
- Metas del estudiante: ${ctx.student?.goals || 'no especificadas'}
- Notas históricas: ${ctx.student?.notes || 'sin notas'}

ETAPAS DEL PROGRAMA: ${JSON.stringify(ctx.stages)}

DIAGNÓSTICO DEL COACH (qué pasó en última sesión + objetivos):
${ctx.coach_diagnostic || '(el coach no agregó diagnóstico — usá la info del estudiante)'}

HORIZONTE DEL PLAN: ${ctx.horizon_weeks} semanas

Tu trabajo: armar un plan de trabajo CONCRETO para este estudiante. Debe ser:
1) Específico para su etapa actual y nivel (no genérico)
2) Realista al horizonte de ${ctx.horizon_weeks} semanas
3) Accionable: cada tarea con QUÉ exactamente hacer + cómo medir el éxito
4) Personalizado al diagnóstico del coach
5) Pensado para COPY-PASTE: el coach lo manda directo al estudiante por WhatsApp/email

Devolvé SOLO JSON válido:
{
  "message": "Hola [Nombre], este es tu plan para las próximas ${ctx.horizon_weeks} semanas. (tono motivador rioplatense, 2-3 oraciones)",
  "objective": "Meta principal de estas 2 semanas, 1 oración clara",
  "tasks": [
    {
      "title": "Tarea concreta 1",
      "description": "Cómo hacerla paso a paso (2-3 oraciones)",
      "due_date": "${ctx.horizon_weeks ? new Date(Date.now()+5*86400000).toISOString().split('T')[0] : null}"
    }
  ],
  "resources": [
    { "title": "Recurso recomendado (slide/doc/video)", "url": null }
  ],
  "success_criteria": ["Al final de la semana 1 debe...", "Al final de la semana 2 debe..."],
  "summary": "1 párrafo resumen del plan"
}`,

  'pm-compliance': (ctx, today) => `Eres compliance officer experto en operación inmobiliaria Texas (Austin/Travis). Hoy es ${today}.

CONTEXTO OPERATIVO DE LA EMPRESA "${ctx.company}":
${JSON.stringify(ctx, null, 2)}

Compliance items EXISTENTES (no los repitas): ${JSON.stringify(ctx.compliance_expiring || [])}

Tu trabajo: sugerir 5-10 items de compliance que la empresa PROBABLEMENTE NECESITE pero no ha registrado.

ÁREAS COMUNES TX RE:
- Permits de remodelación (City of Austin)
- Contractor's license (si aplica)
- LLC annual filings (Texas SOS)
- Sales tax / franchise tax (Comptroller)
- Insurance: general liability, workers comp, builders risk, landlord/property
- Lender compliance: insurance proof, tax payment proof
- Tenant lease compliance: TX Property Code, fair housing
- HOA: ARC approvals si aplica
- Environmental: lead paint disclosure (casas pre-1978), asbestos
- IRS: 1099s contractors, W-9s

Devolvé SOLO JSON válido:
{
  "missing_items": [
    {
      "title": "Texas Franchise Tax 2026",
      "type": "tax",
      "issuer": "Texas Comptroller",
      "why": "Toda LLC TX debe filear antes del 15 de mayo o multa $50/mes."
    }
  ],
  "recommendations": ["acción 1", "acción 2"],
  "summary": "1 párrafo del estado de compliance"
}`
};

function hashContext(ctx: any): string {
  // hash simple para cache
  return btoa(JSON.stringify(ctx)).slice(0, 32);
}

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Auth: previene DoS económico Anthropic + bypass de cache con force=true por anónimos
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status || 401, headers: { ...cors, "Content-Type": "application/json" }
    });
  }

  try {
    const { system, context, force } = await req.json();
    if (!system || !SYSTEM_PROMPTS[system]) {
      throw new Error("system requerido. Valid: " + Object.keys(SYSTEM_PROMPTS).join(", "));
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const contextHash = hashContext(context);

    // Rate limit: max 10 calls / 15 min por user_id (defensa contra force=true loops)
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentCalls } = await supabase
      .from("ai_analyses")
      .select("id", { count: "exact", head: true })
      .eq("created_by", auth.user_id || "")
      .gte("created_at", since);
    if ((recentCalls || 0) >= 10) {
      return new Response(JSON.stringify({ error: "Rate limit: máximo 10 análisis cada 15 minutos. Esperá un momento." }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // Cache check
    if (!force) {
      const { data: cached } = await supabase
        .from("ai_analyses")
        .select("*")
        .eq("system_key", system)
        .eq("context_hash", contextHash)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (cached) {
        return new Response(JSON.stringify({ ...cached.result, _fromCache: true, _cachedAt: cached.created_at }), {
          status: 200, headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const prompt = SYSTEM_PROMPTS[system](context, today);

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: system === 'edu-report' ? 16000 : 8000,
        // edu-report no necesita web search (es análisis interno), las demás sí
        tools: system === 'edu-report' ? undefined : [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!claudeResp.ok) throw new Error("Claude API: " + await claudeResp.text());
    const claudeData = await claudeResp.json();
    const allText = (claudeData.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    // Parse JSON
    const jsonMatch = allText.match(/```json\s*([\s\S]*?)```/) || allText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON. Got: " + allText.slice(0, 500));
    const result = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Cache
    await supabase.from("ai_analyses").insert({
      system_key: system,
      context_hash: contextHash,
      context,
      result,
      raw_text: allText.slice(0, 4000),
      tokens_used: claudeData.usage?.input_tokens || 0
    });

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
