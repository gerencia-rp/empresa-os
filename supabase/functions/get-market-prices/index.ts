import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CACHE_DAYS = 30;

// Catálogo: keys → descripción en inglés para mejor web search
const JOB_DESCRIPTIONS: Record<string, { desc: string; unit: 'flat' | 'per_sqft' }> = {
  cocina_completa: { desc: "complete kitchen renovation (new cabinets, quartz countertops, backsplash, sink, appliances, plumbing fixtures)", unit: 'flat' },
  cocina_cosmetica: { desc: "cosmetic kitchen update (paint cabinets, new countertop, backsplash, fixtures, no cabinet replacement)", unit: 'flat' },
  bano_completo: { desc: "complete bathroom remodel (tile, vanity, toilet, plumbing, new shower)", unit: 'flat' },
  bano_cosmetico: { desc: "cosmetic bathroom update (new vanity, toilet, paint, fixtures)", unit: 'flat' },
  pintura_interior_total: { desc: "complete interior house painting (primer + 2 coats, whole house)", unit: 'per_sqft' },
  pintura_parcial: { desc: "partial interior painting (some rooms only)", unit: 'flat' },
  pisos_completos: { desc: "complete LVP/vinyl plank flooring installation with underlayment", unit: 'per_sqft' },
  pisos_parcial: { desc: "partial flooring replacement (specific areas only)", unit: 'flat' },
  drywall_completo: { desc: "complete drywall replacement with texture and mud, whole house", unit: 'per_sqft' },
  drywall_reparacion: { desc: "drywall repair (holes, cracks, point damage)", unit: 'flat' },
  insulation: { desc: "thermal insulation walls and attic", unit: 'flat' },
  interior_doors: { desc: "replacement of interior doors", unit: 'flat' },
  interior_trim: { desc: "interior trim, baseboards, moldings, door frames", unit: 'flat' },
  carpet: { desc: "carpet installation in bedrooms", unit: 'per_sqft' },
  appliances: { desc: "kitchen appliances package (stove, fridge, microwave, dishwasher)", unit: 'flat' },
  techo_completo: { desc: "complete roof replacement (shingles, underlayment, flashing)", unit: 'flat' },
  techo_reparacion: { desc: "roof repair (only damaged area + sealing)", unit: 'flat' },
  siding_completo: { desc: "complete siding replacement (fiber cement + exterior paint)", unit: 'flat' },
  siding_parcial: { desc: "partial siding repair (damaged panels only)", unit: 'flat' },
  ventanas_todas: { desc: "complete window replacement (8-12 windows)", unit: 'flat' },
  ventanas_pocas: { desc: "partial window replacement (2-3 critical windows)", unit: 'flat' },
  cerca_completa: { desc: "complete wood fence installation (posts, pickets, concrete)", unit: 'flat' },
  cerca_reparacion: { desc: "fence repair (damaged posts/pickets only)", unit: 'flat' },
  jardineria_full: { desc: "complete landscaping (sod, plants, mulch, grading)", unit: 'flat' },
  jardineria_basica: { desc: "basic landscaping (cleanup, sod, paint door)", unit: 'flat' },
  facsia_soffit: { desc: "fascia and soffit (roof edge + ventilation)", unit: 'flat' },
  garage_doors: { desc: "garage door + opener motor", unit: 'flat' },
  masonry: { desc: "masonry or stucco repair/application", unit: 'flat' },
  driveway: { desc: "driveway or flatwork (repair or new concrete)", unit: 'flat' },
  pressure_wash: { desc: "exterior pressure washing", unit: 'flat' },
  patio_decking: { desc: "patio or deck construction", unit: 'flat' },
  rain_gutters: { desc: "rain gutters and downspouts", unit: 'flat' },
  sprinklers: { desc: "automatic sprinkler/irrigation system", unit: 'flat' },
  pool_service: { desc: "swimming pool repair or cleaning", unit: 'flat' },
  plomeria_ajuste: { desc: "minor plumbing repair (leak, valve)", unit: 'flat' },
  plomeria_fixtures: { desc: "plumbing fixtures (sinks, faucets, toilets, showerheads)", unit: 'flat' },
  plomeria_parcial: { desc: "partial plumbing re-pipe (kitchen or bathrooms)", unit: 'flat' },
  plomeria_repipe: { desc: "complete plumbing re-pipe with drains", unit: 'flat' },
  calentador_agua: { desc: "water heater replacement", unit: 'flat' },
  electrico_ajuste: { desc: "minor electrical repair (single circuit)", unit: 'flat' },
  electrico_outlets: { desc: "outlets, switches, GFCI installation", unit: 'flat' },
  electrico_panel: { desc: "main electrical panel upgrade", unit: 'flat' },
  electrico_parcial: { desc: "partial electrical re-wiring (kitchen or rooms)", unit: 'flat' },
  electrico_completo: { desc: "complete electrical re-wiring + panel", unit: 'flat' },
  luminarias: { desc: "light fixtures (recessed, ceiling fans, fixtures)", unit: 'flat' },
  hvac_mantenimiento: { desc: "HVAC tune-up, filters, cleaning", unit: 'flat' },
  hvac_reparacion: { desc: "HVAC repair (AC or furnace)", unit: 'flat' },
  hvac_unidad: { desc: "new HVAC unit (just AC or just furnace)", unit: 'flat' },
  hvac_sistema_completo: { desc: "complete HVAC system (AC + furnace + ducts)", unit: 'flat' },
  foundation_repair: { desc: "foundation leveling and repair", unit: 'flat' },
  framing_repair: { desc: "framing repair in damaged areas", unit: 'flat' },
  demolicion_parcial: { desc: "partial demolition (1-2 walls)", unit: 'flat' },
  demolicion_total: { desc: "complete demolition down to studs", unit: 'flat' },
  ampliacion: { desc: "home addition / new construction square footage", unit: 'per_sqft' },
  adu: { desc: "accessory dwelling unit (ADU) 400-800 sqft", unit: 'flat' },
  final_cleaning: { desc: "professional final cleaning post-construction", unit: 'flat' }
};

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { city, state, jobKeys, force } = await req.json();
    if (!city || !state || !Array.isArray(jobKeys) || jobKeys.length === 0) {
      return new Response(JSON.stringify({ error: "city, state, jobKeys required" }), { status: 400, headers: cors });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check cache
    const cutoff = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    let cached: any[] = [];
    if (!force) {
      const { data } = await supabase
        .from('market_prices_cache')
        .select('*')
        .eq('city', city)
        .eq('state', state)
        .in('job_key', jobKeys)
        .gte('fetched_at', cutoff);
      cached = data || [];
    }

    const cachedKeys = new Set(cached.map(c => c.job_key));
    const needFetch = jobKeys.filter((k: string) => !cachedKeys.has(k) && JOB_DESCRIPTIONS[k]);

    if (needFetch.length === 0) {
      return new Response(JSON.stringify({ prices: cached, fromCache: true, fetched: 0 }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // Build prompt with descriptions
    const jobsList = needFetch.map((k: string) => `- ${k}: ${JOB_DESCRIPTIONS[k].desc} [unit: ${JOB_DESCRIPTIONS[k].unit}]`).join('\n');

    const today = new Date().toISOString().split('T')[0];
    const prompt = `You are a professional construction estimator with deep expertise in residential remodeling for ${city}, ${state}. Today is ${today}.

Search the web RIGHT NOW for current (May 2026) contractor pricing AND realistic duration estimates in ${city}, ${state}. Use these sources:
- HomeAdvisor, Angi, Houzz, Thumbtack
- Local contractor websites in ${city}
- Recent Reddit/forum threads (r/HomeImprovement, r/Construction, r/RealEstate)
- NAHB cost reports
- Remodeling Magazine's Cost vs Value Report 2026
- Local supplier pricing (Home Depot, Lowe's ${city})

Jobs to price and time:
${jobsList}

For EACH job return:
- min/typical/max PRICE (includes labor + materials + small contractor margin)
- min/typical/max DURATION in days (calendar days to complete with typical crew, sequential)
- typical CREW SIZE (how many workers a contractor normally assigns)
- notes (any market-specific factor: permits required, supply chain, seasonal pricing, ${city}-specific code requirements)

For "flat" unit: total job price. For "per_sqft" unit: per square foot.

Return ONLY valid JSON, no markdown:
{
  "prices": {
    "${needFetch[0]}": {
      "min": 0, "typical": 0, "max": 0,
      "duration_days_min": 0, "duration_days_typical": 0, "duration_days_max": 0,
      "crew_size_typical": 2,
      "sources": "HomeAdvisor Austin TX May 2026, local contractor X",
      "notes": "Austin requires inspection for X. Add 1-2 day wait."
    }
    ${needFetch.length > 1 ? ',\n    ...repeat for each job' : ''}
  }
}

Be ACCURATE for ${city}, ${state} ${today} market. Don't make up numbers — find real ones. If a job lacks data for ${city} specifically, use nearest major metro and note it.`;

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 8192,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      throw new Error("Claude API: " + errText);
    }

    const claudeData = await claudeResp.json();
    // Concatenar todos los text blocks finales
    const allText = (claudeData.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    // Extraer JSON
    const match = allText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response. Got: " + allText.slice(0, 500));
    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch (e) {
      throw new Error("JSON parse error: " + (e instanceof Error ? e.message : String(e)) + ". Text: " + match[0].slice(0, 500));
    }

    // Insertar en cache
    const today = new Date().toISOString().split('T')[0];
    const toUpsert = Object.entries(parsed.prices || {}).map(([k, v]: [string, any]) => ({
      city, state, job_key: k,
      price_min: v.min, price_typical: v.typical, price_max: v.max,
      duration_days_min: v.duration_days_min ?? null,
      duration_days_typical: v.duration_days_typical ?? null,
      duration_days_max: v.duration_days_max ?? null,
      crew_size_typical: v.crew_size_typical ?? null,
      notes: v.notes || null,
      unit: JOB_DESCRIPTIONS[k]?.unit || 'flat',
      source_summary: v.sources || null,
      data_freshness_note: `${city}, ${state} market as of ${today}`,
      fetched_at: new Date().toISOString()
    }));

    if (toUpsert.length) {
      await supabase.from('market_prices_cache').upsert(toUpsert, { onConflict: 'city,state,job_key' });
    }

    const all = [...cached, ...toUpsert];
    return new Response(JSON.stringify({ prices: all, fromCache: false, fetched: toUpsert.length }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
