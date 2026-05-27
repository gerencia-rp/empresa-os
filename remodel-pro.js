// ============================================================
// REMODEL PRO — Estimador profesional de remodelación
// Catálogo de Denfield + calibración 5 casas reales
// ============================================================

// ─── CATÁLOGO MAESTRO DE ACTIVIDADES (estructura Denfield) ───
const RM_PHASES = {
  '1': { name: 'Demolición', icon: '⛏️', color: '#dc2626' },
  '2': { name: 'Cimentación', icon: '🏗️', color: '#ea580c' },
  '3': { name: 'Exterior', icon: '🏠', color: '#d97706' },
  '4': { name: 'Estructura', icon: '🪵', color: '#65a30d' },
  '5': { name: 'Interno', icon: '🛏️', color: '#0891b2' },
  '6': { name: 'Limpieza', icon: '🧹', color: '#7c3aed' }
};

// Actividades reales del template Denfield. Cada una con su default vu_total ($/unit típico).
const RM_CATALOG = [
  // ─── 1. DEMOLICIÓN ───
  { code:'1.1.1', phase:'1', subcat:'Demoliciones', desc:'Floor demolition - gut to studs', unit:'sqft', vu:0.50, mat_pct:0.10, days_per_qty:0.005 },
  { code:'1.1.3', phase:'1', subcat:'Demoliciones', desc:'Kitchen tearout (cabinets, countertops, appliances)', unit:'unit', vu:600, mat_pct:0.10, days_per_qty:1 },
  { code:'1.1.4', phase:'1', subcat:'Demoliciones', desc:'Bathroom tearout (full demolition)', unit:'unit', vu:500, mat_pct:0.10, days_per_qty:1 },
  { code:'1.1.6', phase:'1', subcat:'Demoliciones', desc:'Drywall removal', unit:'sqft', vu:0.40, mat_pct:0.10, days_per_qty:0.0015 },
  { code:'1.1.7', phase:'1', subcat:'Demoliciones', desc:'Top demolition concrete (entrance/backyard)', unit:'sqft', vu:1.50, mat_pct:0.15, days_per_qty:0.005 },
  { code:'1.1.8', phase:'1', subcat:'Demoliciones', desc:'Wall removal - load bearing', unit:'sqft', vu:25, mat_pct:0.15, days_per_qty:0.05 },
  { code:'1.1.9', phase:'1', subcat:'Disposición', desc:'Dumpster rental (per load)', unit:'load', vu:450, mat_pct:1.0, days_per_qty:0 },
  { code:'1.1.12', phase:'1', subcat:'Disposición', desc:'Disposal/dump fees per truckload', unit:'load', vu:150, mat_pct:1.0, days_per_qty:0 },
  { code:'1.1.11', phase:'1', subcat:'Preliminares', desc:'Site protection, plastic, signage', unit:'project', vu:300, mat_pct:0.50, days_per_qty:1 },
  { code:'1.1.10', phase:'1', subcat:'Disposición', desc:'Debris hauling', unit:'project', vu:600, mat_pct:0.20, days_per_qty:3 },

  // ─── 2. CIMENTACIÓN ───
  { code:'2.1.4', phase:'2', subcat:'Reparación', desc:'Foundation crack repair (basic settling)', unit:'project', vu:10000, mat_pct:0.10, days_per_qty:5 },
  { code:'2.2.6', phase:'2', subcat:'Concreto', desc:'Concrete slab repair (per unit)', unit:'unit', vu:71.43, mat_pct:0.60, days_per_qty:0.5 },
  { code:'2.2.1', phase:'2', subcat:'Concreto', desc:'Site excavation and grading', unit:'project', vu:1800, mat_pct:0.20, days_per_qty:2 },
  { code:'2.1.1', phase:'2', subcat:'Reparación', desc:'Foundation evaluation and inspection', unit:'project', vu:500, mat_pct:0.0, days_per_qty:2 },
  { code:'2.2.9', phase:'2', subcat:'Concreto', desc:'Waterproofing system (foundation)', unit:'project', vu:2200, mat_pct:0.55, days_per_qty:4 },

  // ─── 3. EXTERIOR ───
  { code:'3.1.1', phase:'3', subcat:'Cubierta', desc:'Roof replacement (architectural shingles)', unit:'roof', vu:14000, mat_pct:0.50, days_per_qty:4 },
  { code:'3.1.2', phase:'3', subcat:'Cubierta', desc:'Roof underlayment and flashing', unit:'roof', vu:2200, mat_pct:0.60, days_per_qty:1 },
  { code:'3.1.3', phase:'3', subcat:'Cubierta', desc:'Gutters and downspouts', unit:'lin_ft', vu:12, mat_pct:0.55, days_per_qty:0.02 },
  { code:'3.4.1', phase:'3', subcat:'Fachada', desc:'Siding replacement (Hardieboard fiber cement)', unit:'sqft', vu:8.50, mat_pct:0.55, days_per_qty:0.01 },
  { code:'3.4.3', phase:'3', subcat:'Fachada', desc:'Exterior paint (whole house, full prep)', unit:'house', vu:5500, mat_pct:0.30, days_per_qty:5 },
  { code:'3.5.1', phase:'3', subcat:'Puertas', desc:'Front entry door (premium)', unit:'door', vu:1800, mat_pct:0.70, days_per_qty:1 },
  { code:'3.5.2', phase:'3', subcat:'Puertas', desc:'Secondary exterior doors (back/side)', unit:'door', vu:900, mat_pct:0.70, days_per_qty:1 },
  { code:'3.6.1', phase:'3', subcat:'Urbanismo', desc:'Concrete patio installation', unit:'sqft', vu:18, mat_pct:0.50, days_per_qty:0.04 },
  { code:'3.13.1', phase:'3', subcat:'Urbanismo', desc:'Driveway repair/resurfacing', unit:'project', vu:5500, mat_pct:0.50, days_per_qty:3 },
  { code:'3.14.1', phase:'3', subcat:'Urbanismo', desc:'Wood fence (perimeter)', unit:'lin_ft', vu:35, mat_pct:0.50, days_per_qty:0.04 },
  { code:'3.15.1', phase:'3', subcat:'Urbanismo', desc:'Landscaping and sod (full refresh)', unit:'project', vu:3500, mat_pct:0.35, days_per_qty:2 },
  { code:'3.7.1', phase:'3', subcat:'Fachada', desc:'Window replacement (energy-efficient, all)', unit:'house', vu:9000, mat_pct:0.70, days_per_qty:3 },
  { code:'3.16.1', phase:'3', subcat:'Fachada', desc:'Wood replacement columns', unit:'unit', vu:300, mat_pct:0.55, days_per_qty:0.5 },

  // ─── 4. ESTRUCTURA ───
  { code:'4.1.2', phase:'4', subcat:'Estructura', desc:'Wood framing (structural carpentry, whole house)', unit:'sqft', vu:6, mat_pct:0.55, days_per_qty:0.005 },
  { code:'4.1.3', phase:'4', subcat:'Estructura', desc:'Steel beam / load-bearing modification', unit:'beam', vu:3500, mat_pct:0.55, days_per_qty:2 },
  { code:'4.1.4', phase:'4', subcat:'Estructura', desc:'Roof framing / truss repair', unit:'sqft', vu:8, mat_pct:0.55, days_per_qty:0.005 },
  { code:'4.1.5', phase:'4', subcat:'Estructura', desc:'Sub-floor installation (new)', unit:'sqft', vu:4.5, mat_pct:0.60, days_per_qty:0.003 },
  { code:'4.2.1', phase:'4', subcat:'Permisos', desc:'Building permits (whole house remodel)', unit:'project', vu:1500, mat_pct:0.0, days_per_qty:0 },
  { code:'4.2.2', phase:'4', subcat:'Permisos', desc:'Architect / structural engineer fees', unit:'project', vu:2500, mat_pct:0.0, days_per_qty:0 },
  { code:'4.2.3', phase:'4', subcat:'Permisos', desc:'General contractor management (overhead)', unit:'project', vu:0, mat_pct:0.0, days_per_qty:0 },

  // ─── 5. INTERNO ───
  { code:'5.1.1', phase:'5', subcat:'Muros', desc:'Drywall installation/replacement', unit:'sqft', vu:3.50, mat_pct:0.45, days_per_qty:0.005 },
  { code:'5.1.2', phase:'5', subcat:'Muros', desc:'Interior painting (whole house)', unit:'sqft', vu:1.40, mat_pct:0.25, days_per_qty:0.012 },
  { code:'5.1.3', phase:'5', subcat:'Muros', desc:'Insulation - wall batts', unit:'sqft', vu:1.80, mat_pct:0.55, days_per_qty:0.004 },
  { code:'5.2.1', phase:'5', subcat:'Techo', desc:'Crown molding installation', unit:'lin_ft', vu:8, mat_pct:0.50, days_per_qty:0.02 },
  { code:'5.2.3', phase:'5', subcat:'Techo', desc:'Insulation - blown-in attic', unit:'sqft', vu:1.50, mat_pct:0.55, days_per_qty:0.002 },
  { code:'5.3.1', phase:'5', subcat:'Baños', desc:'Bathroom tile (floor + walls)', unit:'sqft', vu:18, mat_pct:0.50, days_per_qty:0.04, multiplicable:true },
  { code:'5.3.2', phase:'5', subcat:'Baños', desc:'Custom shower install', unit:'unit', vu:2800, mat_pct:0.55, days_per_qty:2, multiplicable:true },
  { code:'5.3.3', phase:'5', subcat:'Baños', desc:'Glass enclosure shower', unit:'unit', vu:1200, mat_pct:0.70, days_per_qty:1, multiplicable:true },
  { code:'5.3.4', phase:'5', subcat:'Baños', desc:'Bathroom accessories (medicine cabinet, mirror, towel bars)', unit:'set', vu:400, mat_pct:0.85, days_per_qty:0.5, multiplicable:true },
  { code:'5.3.5', phase:'5', subcat:'Baños', desc:'Vanity + countertop', unit:'unit', vu:1100, mat_pct:0.75, days_per_qty:1, multiplicable:true },
  { code:'5.3.6', phase:'5', subcat:'Baños', desc:'Toilet replacement', unit:'unit', vu:380, mat_pct:0.70, days_per_qty:0.5, multiplicable:true },
  { code:'5.4.1', phase:'5', subcat:'Cocina', desc:'Kitchen cabinets (semi-custom)', unit:'lin_ft', vu:280, mat_pct:0.70, days_per_qty:0.15 },
  { code:'5.4.2', phase:'5', subcat:'Cocina', desc:'Kitchen countertops (quartz)', unit:'sqft', vu:75, mat_pct:0.75, days_per_qty:0.05 },
  { code:'5.4.3', phase:'5', subcat:'Cocina', desc:'Tile backsplash', unit:'sqft', vu:22, mat_pct:0.50, days_per_qty:0.05 },
  { code:'5.4.4', phase:'5', subcat:'Cocina', desc:'Kitchen sink + faucet', unit:'unit', vu:550, mat_pct:0.80, days_per_qty:0.5 },
  { code:'5.4.5', phase:'5', subcat:'Cocina', desc:'Kitchen island construction', unit:'unit', vu:2200, mat_pct:0.55, days_per_qty:2 },
  { code:'5.4.6', phase:'5', subcat:'Cocina', desc:'Appliances (stove/fridge/dishwasher/microwave)', unit:'set', vu:4500, mat_pct:0.95, days_per_qty:0.5 },
  { code:'5.6.1', phase:'5', subcat:'Pisos', desc:'Flooring installation (LVP)', unit:'sqft', vu:5.50, mat_pct:0.60, days_per_qty:0.008 },
  { code:'5.6.2', phase:'5', subcat:'Pisos', desc:'Carpet installation (bedrooms)', unit:'sqft', vu:3.50, mat_pct:0.55, days_per_qty:0.005 },
  { code:'5.6.3', phase:'5', subcat:'Pisos', desc:'Baseboards installation', unit:'lin_ft', vu:5, mat_pct:0.50, days_per_qty:0.015 },
  { code:'5.8.1', phase:'5', subcat:'Carpintería', desc:'Interior doors replacement', unit:'door', vu:380, mat_pct:0.65, days_per_qty:0.5 },
  { code:'5.8.2', phase:'5', subcat:'Carpintería', desc:'Closet shelving', unit:'closet', vu:300, mat_pct:0.60, days_per_qty:0.5 },
  // Redes (plumbing, electrical, HVAC) — categorizadas en interno
  { code:'5.1.4', phase:'5', subcat:'Redes Eléctricas', desc:'Outlets and switches (interior)', unit:'house', vu:900, mat_pct:0.40, days_per_qty:1 },
  { code:'5.1.5', phase:'5', subcat:'Redes Eléctricas', desc:'Electrical panel upgrade', unit:'panel', vu:3500, mat_pct:0.50, days_per_qty:2 },
  { code:'5.1.6', phase:'5', subcat:'Redes Eléctricas', desc:'Rewire whole house', unit:'house', vu:9000, mat_pct:0.35, days_per_qty:5 },
  { code:'5.1.7', phase:'5', subcat:'Redes Eléctricas', desc:'Light fixtures + ceiling fans', unit:'house', vu:1200, mat_pct:0.55, days_per_qty:1 },
  { code:'5.1.9', phase:'5', subcat:'Redes Eléctricas', desc:'Smoke and CO detectors (hardwired)', unit:'house', vu:350, mat_pct:0.55, days_per_qty:1 },
  { code:'5.2.1p', phase:'5', subcat:'Plomería', desc:'Whole-house repipe (PEX)', unit:'house', vu:11000, mat_pct:0.40, days_per_qty:6 },
  { code:'5.2.2p', phase:'5', subcat:'Plomería', desc:'Sewer line replacement (main)', unit:'house', vu:6500, mat_pct:0.40, days_per_qty:5 },
  { code:'5.2.3p', phase:'5', subcat:'Plomería', desc:'Water heater replacement', unit:'unit', vu:2200, mat_pct:0.70, days_per_qty:1 },
  { code:'5.2.4p', phase:'5', subcat:'Plomería', desc:'Plumbing fixtures (sinks, faucets, etc.)', unit:'house', vu:1200, mat_pct:0.55, days_per_qty:2 },
  { code:'5.5.1h', phase:'5', subcat:'HVAC', desc:'HVAC system replacement (AC + furnace + ducts)', unit:'house', vu:13000, mat_pct:0.70, days_per_qty:4 },
  { code:'5.5.2h', phase:'5', subcat:'HVAC', desc:'HVAC repair / 1 unit only', unit:'unit', vu:6500, mat_pct:0.70, days_per_qty:2 },

  // ─── 6. LIMPIEZA ───
  { code:'6.1.1', phase:'6', subcat:'Acabados finales', desc:'Touch-up painting and repairs', unit:'project', vu:800, mat_pct:0.30, days_per_qty:1 },
  { code:'6.2.1', phase:'6', subcat:'Cierre', desc:'Punch list completion', unit:'project', vu:600, mat_pct:0.10, days_per_qty:2 },
  { code:'6.2.2', phase:'6', subcat:'Cierre', desc:'City final inspection fees', unit:'inspection', vu:250, mat_pct:0.0, days_per_qty:1 },
  { code:'6.2.3', phase:'6', subcat:'Cierre', desc:'Move-in deep clean', unit:'house', vu:600, mat_pct:0.10, days_per_qty:2 },
  { code:'6.3.1', phase:'6', subcat:'Limpieza final', desc:'Final construction cleanup', unit:'sqft', vu:0.45, mat_pct:0.10, days_per_qty:0.001 },
  { code:'6.3.2', phase:'6', subcat:'Limpieza final', desc:'Deep cleaning (interior + exterior)', unit:'house', vu:800, mat_pct:0.10, days_per_qty:1 }
];

// ─── ESTADO ───
const rmState = {
  sys: null,
  tab: 'projects',
  projects: [],
  calibrationHouses: [],
  currentProject: null,
  // Editor state
  editName: '', editAddress: '', editSqft: 1500, editStartDate: new Date().toISOString().split('T')[0],
  selectedActivities: {},
  // Pricing (estándar industria)
  contingencyPct: 15,
  overheadPct: 10,
  permitsCost: 1500,
  designFeesCost: 0,
  markupPct: 25,
  crewSize: 3,
  workDays: 6,
  remodelType: 'heavy',
  showActuals: false, // toggle para editar reales
  actuals: {}, // code -> {real_cost, real_days, real_hours}
  // Activos del proyecto
  matterportUrl: '',
  scopeText: '',
  scopeAudioPath: '',
  scopeAudioTranscript: '',
  plans: [],   // [{path, name, type}]
  photos: [],  // [{path, name}]
  // Recording state
  isRecording: false,
  mediaRecorder: null,
  audioChunks: []
};

// ─── 16 ETAPAS BENCHMARK Structure One (5 casas reales calibradas) ───
// Total portafolio: $49.17/ft² vs mercado Austin $65-90/ft²
const RM_STAGE_BENCHMARKS = [
  { key:'demolicion',     name:'Demolición',              avg:1.29, std:1.16, min:0.49, max:3.28, days:6,  mat:6,   mano:94, eq:0, n:5, group:'1' },
  { key:'estructura',     name:'Estructura / Framing',    avg:2.92, std:1.99, min:0.20, max:5.29, days:20, mat:53,  mano:47, eq:0, n:5, group:'4' },
  { key:'techo',          name:'Techo / Roofing',         avg:2.77, std:1.40, min:1.78, max:4.37, days:8,  mat:42,  mano:58, eq:0, n:3, group:'3' },
  { key:'hvac',           name:'HVAC',                    avg:1.95, std:1.72, min:0.46, max:4.91, days:5,  mat:19,  mano:81, eq:0, n:5, group:'5' },
  { key:'electricidad',   name:'Electricidad',            avg:1.99, std:1.33, min:0.67, max:4.09, days:5,  mat:19,  mano:81, eq:0, n:5, group:'5' },
  { key:'plomeria',       name:'Plomería',                avg:2.52, std:1.02, min:0.88, max:3.37, days:5,  mat:34,  mano:66, eq:0, n:5, group:'5' },
  { key:'aislamiento',    name:'Aislamiento',             avg:0.86, std:0.44, min:0.61, max:1.64, days:2,  mat:19,  mano:81, eq:0, n:5, group:'5' },
  { key:'drywall',        name:'Drywall / Yeso',          avg:2.85, std:1.18, min:1.17, max:4.09, days:8,  mat:24,  mano:76, eq:0, n:5, group:'5' },
  { key:'pisos',          name:'Pisos',                   avg:4.18, std:1.47, min:2.62, max:6.14, days:9,  mat:39,  mano:61, eq:0, n:5, group:'5' },
  { key:'pintura_int',    name:'Pintura Interior',        avg:7.34, std:2.70, min:3.32, max:9.99, days:9,  mat:11,  mano:89, eq:0, n:5, group:'5' },
  { key:'pintura_ext',    name:'Pintura Exterior',        avg:2.26, std:0.94, min:1.42, max:3.54, days:6,  mat:31,  mano:69, eq:0, n:4, group:'3' },
  { key:'cocina',         name:'Cocina',                  avg:1.24, std:0.68, min:0.57, max:2.33, days:7,  mat:100, mano:0,  eq:0, n:5, group:'5' },
  { key:'banos',          name:'Baños',                   avg:1.36, std:0.41, min:0.85, max:1.94, days:7,  mat:100, mano:0,  eq:0, n:5, group:'5' },
  { key:'trim',           name:'Trim / Puertas',          avg:5.20, std:4.15, min:1.99, max:11.23,days:5,  mat:54,  mano:46, eq:0, n:5, group:'5' },
  { key:'exteriores',     name:'Exteriores / Landscaping',avg:8.28, std:4.16, min:2.79, max:12.48,days:15, mat:46,  mano:54, eq:0, n:5, group:'3' },
  { key:'limpieza_final', name:'Limpieza Final',          avg:2.18, std:1.40, min:1.04, max:4.07, days:8,  mat:33,  mano:67, eq:0, n:4, group:'6' }
];
const RM_PORTFOLIO_TOTAL_PSF = 49.17;
const RM_MARKET_AUSTIN_MIN = 65;
const RM_MARKET_AUSTIN_MAX = 90;

// Estado para Estimación Rápida
const rmQuickState = {
  sqft: 1500,
  stagesEnabled: Object.fromEntries(RM_STAGE_BENCHMARKS.map(s => [s.key, true])),
  mode: 'avg', // 'min' | 'avg' | 'max'
  remodelType: 'heavy'
};

// ─── TIPOS DE REMODELACIÓN (multiplican las tasas) ───
const RM_TYPES = {
  lipstick: { name: 'Lipstick',           icon: '✨', mult: 0.35, desc: 'Pintura + fixtures + deep clean' },
  light:    { name: 'Cosmético Ligero',   icon: '🖌️', mult: 0.65, desc: 'Pintura + pisos + reparaciones' },
  heavy:    { name: 'Cosmético Pesado',   icon: '🔧', mult: 1.00, desc: 'Cocina O baños + acabados (BASE)' },
  full:     { name: 'Renovación Total',   icon: '🔨', mult: 1.55, desc: 'Cocina + baños + sistemas + acabados' },
  gut:      { name: 'Gut Renovation',     icon: '⛏️', mult: 2.20, desc: 'Demolición a studs + replanteo + ampliación' }
};

// Cache de benchmarks dinámicos (cargados de DB)
let rmDynamicBenchmarks = null; // {stage_key: {avg_psf, std_psf, samples, ...}}

// Combinar benchmarks: seed + dinámicos (ponderado por # samples)
function rmGetEffectiveBenchmarks() {
  return RM_STAGE_BENCHMARKS.map(seed => {
    const dyn = rmDynamicBenchmarks?.[seed.key];
    if (!dyn || !dyn.samples) return seed;
    // Promedio ponderado: seed (5 muestras hist) + dyn (n muestras nuevas)
    const seedW = seed.n, dynW = dyn.samples;
    const totalW = seedW + dynW;
    return {
      ...seed,
      avg: (seed.avg * seedW + dyn.avg_psf * dynW) / totalW,
      std: dyn.std_psf || seed.std,
      min: Math.min(seed.min, dyn.min_psf || seed.min),
      max: Math.max(seed.max, dyn.max_psf || seed.max),
      days: (seed.days * seedW + (dyn.avg_days || seed.days) * dynW) / totalW,
      n: totalW,
      enriched: true
    };
  });
}

// ─── INSPECCIONES OBLIGATORIAS (Austin TX código) ───
const RM_INSPECTIONS = [
  { after_phase: '2', name: 'Foundation/Grading inspection', wait_days: 2 },
  { after_phase: '4', name: 'Rough-in inspection (plumbing/electrical/HVAC)', wait_days: 2 },
  { before_phase: '7', name: 'Insulation inspection', wait_days: 1 }, // antes de drywall
  { in_phase: '5', name: 'Drywall pre-paint inspection', wait_days: 1 },
  { after_phase: '6', name: 'Final inspection (CO)', wait_days: 3 }
];

// ─── LEAD TIMES (días de espera entre orden y recibo) ───
const RM_LEAD_TIMES = {
  '5.4.1': 35,  // Kitchen cabinets semi-custom
  '5.4.2': 14,  // Quartz countertops (template + fab)
  '3.7.1': 21,  // Windows energy-efficient
  '5.5.1h': 7,  // HVAC system
  '3.1.1': 7,   // Roof shingles
  '5.3.5': 14,  // Vanity custom
};

const rmFmt = n => '$' + Math.round(n || 0).toLocaleString('en-US');
const rmFmt2 = n => '$' + (n || 0).toFixed(2);

function rmFmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('es-MX', {day:'numeric', month:'short'}); }
function rmAddDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// ─── CÁLCULO ───
function rmCalcProject() {
  const activities = Object.entries(rmState.selectedActivities).map(([code, cfg]) => {
    const cat = RM_CATALOG.find(c => c.code === code);
    if (!cat) return null;
    const qty = +cfg.qty || 0;
    const vu = +cfg.vu || cat.vu;
    const total = qty * vu;
    const material = total * cat.mat_pct;
    const labor = total * (1 - cat.mat_pct) * 0.75; // 75% del no-mat es labor, 25% equipo
    const equipment = total * (1 - cat.mat_pct) * 0.25;
    const days = cfg.days || Math.max(1, Math.ceil(qty * (cat.days_per_qty || 0)));
    return { ...cat, qty, vu, total, material, labor, equipment, days, start_offset: cfg.start_offset || 0 };
  }).filter(Boolean);

  const byPhase = {};
  for (const a of activities) {
    if (!byPhase[a.phase]) byPhase[a.phase] = { activities: [], total: 0, material: 0, labor: 0, equipment: 0, days: 0 };
    byPhase[a.phase].activities.push(a);
    byPhase[a.phase].total += a.total;
    byPhase[a.phase].material += a.material;
    byPhase[a.phase].labor += a.labor;
    byPhase[a.phase].equipment += a.equipment;
    byPhase[a.phase].days = Math.max(byPhase[a.phase].days, a.start_offset + a.days);
  }

  const totals = activities.reduce((a, x) => ({
    total: a.total + x.total, material: a.material + x.material, labor: a.labor + x.labor, equipment: a.equipment + x.equipment
  }), { total: 0, material: 0, labor: 0, equipment: 0 });

  // Cronograma: fase secuencial
  const startDate = new Date(rmState.editStartDate);
  const phases = ['1','2','3','4','5','6'];
  let cursor = new Date(startDate);
  const phaseSchedule = {};
  for (const p of phases) {
    if (!byPhase[p]) continue;
    const start = new Date(cursor);
    const end = rmAddDays(start, byPhase[p].days);
    phaseSchedule[p] = { start, end, days: byPhase[p].days };
    cursor = end;
  }
  const totalDays = Math.max(0, ...Object.values(phaseSchedule).map(p => Math.ceil((p.end - startDate) / 86400000)));

  // ─── PRICING ingenieril ───
  const directCost = totals.total;
  const contingency = directCost * (rmState.contingencyPct / 100);
  const overhead = directCost * (rmState.overheadPct / 100);
  const softCosts = (+rmState.permitsCost || 0) + (+rmState.designFeesCost || 0);
  const internalCost = directCost + contingency + overhead + softCosts;
  const markup = internalCost * (rmState.markupPct / 100);
  const clientPrice = internalCost + markup;
  const profit = markup;
  const profitMarginPct = clientPrice > 0 ? (profit / clientPrice) * 100 : 0;

  return {
    activities, byPhase, totals, phaseSchedule, totalDays,
    sqft: rmState.editSqft, ppsf: rmState.editSqft ? totals.total / rmState.editSqft : 0,
    pricing: { directCost, contingency, overhead, softCosts, internalCost, markup, clientPrice, profit, profitMarginPct }
  };
}

// ─── DB ───
async function rmLoadAll() {
  const [{ data: projects }, { data: houses }, dyn] = await Promise.all([
    sb.from('remodel_projects').select('*').order('updated_at', { ascending: false }),
    sb.from('remodel_calibration_houses').select('*').order('name'),
    sb.from('remodel_dynamic_benchmarks').select('*').then(r => r.data || []).catch(() => [])
  ]);
  rmState.projects = projects || [];
  rmState.calibrationHouses = houses || [];
  rmDynamicBenchmarks = {};
  (dyn || []).forEach(d => { rmDynamicBenchmarks[d.stage_key] = d; });
}

async function rmSaveProject() {
  const e = rmCalcProject();
  const payload = {
    name: rmState.editName || 'Sin nombre',
    address: rmState.editAddress,
    sqft: rmState.editSqft,
    start_date: rmState.editStartDate,
    end_date_estimated: e.totalDays ? rmAddDays(new Date(rmState.editStartDate), e.totalDays).toISOString().split('T')[0] : null,
    budget_total: e.totals.total,
    budget_material: e.totals.material,
    budget_labor: e.totals.labor,
    budget_equipment: e.totals.equipment,
    activities: e.activities,
    matterport_url: rmState.matterportUrl,
    scope_text: rmState.scopeText,
    scope_audio_path: rmState.scopeAudioPath,
    scope_audio_transcript: rmState.scopeAudioTranscript,
    plans: rmState.plans,
    photos: rmState.photos,
    updated_at: new Date().toISOString()
  };
  let result;
  if (rmState.currentProject?.id) {
    result = await sb.from('remodel_projects').update(payload).eq('id', rmState.currentProject.id);
  } else {
    payload.user_id = state.user.id;
    result = await sb.from('remodel_projects').insert(payload).select().single();
    if (result.data) rmState.currentProject = result.data;
  }
  if (result.error) return alert('Error: ' + result.error.message);
  await rmLoadAll();
  rmRender();
  alert('✓ Proyecto guardado');
}

function rmLoadProject(p) {
  rmState.currentProject = p;
  rmState.editName = p.name;
  rmState.editAddress = p.address || '';
  rmState.editSqft = p.sqft || 1500;
  rmState.editStartDate = p.start_date || new Date().toISOString().split('T')[0];
  rmState.selectedActivities = {};
  (p.activities || []).forEach(a => {
    rmState.selectedActivities[a.code] = { qty: a.qty, vu: a.vu, days: a.days, start_offset: a.start_offset };
  });
  rmState.matterportUrl = p.matterport_url || '';
  rmState.scopeText = p.scope_text || '';
  rmState.scopeAudioPath = p.scope_audio_path || '';
  rmState.scopeAudioTranscript = p.scope_audio_transcript || '';
  rmState.plans = p.plans || [];
  rmState.photos = p.photos || [];
  rmState.tab = 'editor';
  rmRender();
}

function rmNewProject() {
  rmState.currentProject = null;
  rmState.editName = '';
  rmState.editAddress = '';
  rmState.editSqft = 1500;
  rmState.editStartDate = new Date().toISOString().split('T')[0];
  rmState.selectedActivities = {};
  rmState.matterportUrl = '';
  rmState.scopeText = '';
  rmState.scopeAudioPath = '';
  rmState.scopeAudioTranscript = '';
  rmState.plans = [];
  rmState.photos = [];
  rmState.tab = 'editor';
  rmRender();
}

// ─── ENTRY POINT ───
async function openRemodelPro(sys) {
  rmState.sys = sys;
  await rmLoadAll();
  openModal(`🏗️ ${sys.name}`, '<div id="rm-root"></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  rmRender();
}

function rmRender() {
  const root = document.getElementById('rm-root');
  const samplesCount = (Object.values(rmDynamicBenchmarks || {}).reduce((s,d) => s + (d.samples||0), 0)) + 5;
  const tabs = [
    { id: 'projects', label: `📁 Proyectos (${rmState.projects.length})` },
    { id: 'quick', label: '⚡ Estimación Rápida' },
    { id: 'compare', label: '🎯 3 Estimaciones' },
    { id: 'rates', label: '📊 Tasas $/ft²' },
    { id: 'editor', label: rmState.currentProject ? `✏️ ${rmState.currentProject.name}` : '➕ Editor detallado' },
    { id: 'gantt', label: '📅 Cronograma' },
    { id: 'sow', label: '📋 SOW (Lender)' },
    { id: 'learning', label: `📈 Precisión (${samplesCount})` },
    { id: 'calibration', label: `🎯 Calibración` }
  ];
  root.innerHTML = `
    <div class="flex gap-1 mb-4 border-b border-slate-200 -mx-6 px-6 overflow-x-auto">
      ${tabs.map(t => `<button onclick="rmSetTab('${t.id}')" class="px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${rmState.tab===t.id?'border-slate-900 text-slate-900':'border-transparent text-slate-500 hover:text-slate-900'}">${t.label}</button>`).join('')}
    </div>
    <div id="rm-body"></div>
  `;
  rmRenderTab();
}

function rmSetTab(t) { rmState.tab = t; rmRender(); }

// ─── PRESERVAR FOCO al re-render (fix UX crítico) ───
// Wrap todo render que se llama desde oninput
function rmRenderTabPreservingFocus() {
  const active = document.activeElement;
  const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
  if (!isInput) { rmRenderTab(); return; }
  // Identifica el input por su path: id (si tiene) o por atributo único
  const fid = active.id;
  const onattr = active.getAttribute('oninput') || active.getAttribute('onchange') || '';
  const selStart = active.selectionStart, selEnd = active.selectionEnd;
  rmRenderTab();
  let el = null;
  if (fid) el = document.getElementById(fid);
  if (!el && onattr) {
    // Busca el primer input con el mismo handler
    document.querySelectorAll('input,textarea,select').forEach(n => {
      if (!el && (n.getAttribute('oninput') === onattr || n.getAttribute('onchange') === onattr)) el = n;
    });
  }
  if (el) {
    el.focus();
    try { if (typeof selStart === 'number') el.setSelectionRange(selStart, selEnd); } catch {}
  }
}

// Debounce para inputs frecuentes (no re-renderizar en cada keystroke)
let _rmRenderTimer = null;
function rmRenderTabDebounced() {
  clearTimeout(_rmRenderTimer);
  _rmRenderTimer = setTimeout(() => rmRenderTabPreservingFocus(), 250);
}

function rmRenderTab() {
  const body = document.getElementById('rm-body');
  if (rmState.tab === 'projects') return rmRenderProjects(body);
  if (rmState.tab === 'quick') return rmRenderQuick(body);
  if (rmState.tab === 'compare') return rmRenderCompare(body);
  if (rmState.tab === 'rates') return rmRenderRates(body);
  if (rmState.tab === 'editor') return rmRenderEditor(body);
  if (rmState.tab === 'gantt') return rmRenderGantt(body);
  if (rmState.tab === 'sow') return rmRenderSow(body);
  if (rmState.tab === 'learning') return rmRenderLearning(body);
  if (rmState.tab === 'calibration') return rmRenderCalibration(body);
}

// ─── TAB: 3 ESTIMACIONES (Histórica / Mercado / Híbrida) ───
function rmRenderCompare(body) {
  const sqft = rmQuickState.sqft;
  const type = RM_TYPES[rmQuickState.remodelType];
  const benchmarks = rmGetEffectiveBenchmarks();
  const enabledKeys = Object.entries(rmQuickState.stagesEnabled).filter(([_,v])=>v).map(([k])=>k);
  const enabled = benchmarks.filter(s => enabledKeys.includes(s.key));

  // HISTÓRICO (tus 5 casas + actuals)
  const histPerSqft = enabled.reduce((s,e) => s + e.avg, 0);
  const histTotal = sqft * histPerSqft * type.mult;
  const histDays = enabled.reduce((s,e) => s + e.days, 0);

  // MERCADO Austin
  const mktLowPsf = RM_MARKET_AUSTIN_MIN, mktHighPsf = RM_MARKET_AUSTIN_MAX;
  const mktPsf = (mktLowPsf + mktHighPsf) / 2;
  const mktTotal = sqft * mktPsf * type.mult;

  // HÍBRIDO (punto medio)
  const hybPsf = (histPerSqft + mktPsf) / 2;
  const hybTotal = sqft * hybPsf * type.mult;

  const dynCount = Object.values(rmDynamicBenchmarks || {}).reduce((s,d)=>s+(d.samples||0),0);

  body.innerHTML = `
    <div class="space-y-4">
      <!-- Inputs -->
      <div class="bg-white rounded-xl p-4 border border-slate-200">
        <h3 class="text-xs font-bold uppercase text-slate-700 mb-3">🎯 Comparador de 3 fuentes de estimación</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] text-slate-500 mb-1">Sqft</label>
            <input type="number" value="${sqft}" oninput="rmQuickState.sqft=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
          </div>
          <div>
            <label class="block text-[10px] text-slate-500 mb-1">Tipo de remodelación</label>
            <select onchange="rmQuickState.remodelType=this.value; rmRenderTabPreservingFocus()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              ${Object.entries(RM_TYPES).map(([k,v]) => `<option value="${k}" ${rmQuickState.remodelType===k?'selected':''}>${v.icon} ${v.name} (×${v.mult}) — ${v.desc}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- 3 estimaciones lado a lado -->
      <div class="grid md:grid-cols-3 gap-4">
        <!-- HISTÓRICO -->
        <div class="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-400 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-bold text-emerald-900">🏠 Histórico AWA</h4>
            <span class="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded">${5 + dynCount} casas</span>
          </div>
          <div class="text-3xl font-bold text-emerald-700">${rmFmt(histTotal)}</div>
          <div class="text-xs text-emerald-800 mt-1">$${(histTotal/sqft).toFixed(2)}/ft² × ${type.mult} (${type.name})</div>
          <div class="mt-3 pt-3 border-t border-emerald-200 text-xs text-slate-600">
            <div>Base: $${histPerSqft.toFixed(2)}/ft²</div>
            <div>Days sumados: ${Math.round(histDays * type.mult)}d</div>
            <div class="mt-1 text-[10px] text-emerald-700">${dynCount > 0 ? `✓ Enriched con ${dynCount} datos reales nuevos` : 'Solo 5 casas seed'}</div>
          </div>
        </div>

        <!-- MERCADO -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-bold text-blue-900">📊 Mercado Austin</h4>
            <span class="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded">RSMeans/Houzz</span>
          </div>
          <div class="text-3xl font-bold text-blue-700">${rmFmt(mktTotal)}</div>
          <div class="text-xs text-blue-800 mt-1">$${(mktTotal/sqft).toFixed(2)}/ft² × ${type.mult}</div>
          <div class="mt-3 pt-3 border-t border-blue-200 text-xs text-slate-600">
            <div>Rango: $${mktLowPsf}-${mktHighPsf}/ft²</div>
            <div>Mediana: $${mktPsf}/ft²</div>
            <div class="mt-1 text-[10px] text-blue-700">Lo que cobra un GC típico Austin TX 2026</div>
          </div>
        </div>

        <!-- HÍBRIDO -->
        <div class="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-500 rounded-xl p-4 ring-2 ring-amber-300">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-bold text-amber-900">🎯 Híbrido (recomendado)</h4>
            <span class="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded">balance</span>
          </div>
          <div class="text-3xl font-bold text-amber-700">${rmFmt(hybTotal)}</div>
          <div class="text-xs text-amber-800 mt-1">$${(hybTotal/sqft).toFixed(2)}/ft² × ${type.mult}</div>
          <div class="mt-3 pt-3 border-t border-amber-200 text-xs text-slate-600">
            <div>Promedio Histórico + Mercado</div>
            <div>Captura experiencia + competitividad</div>
            <div class="mt-1 text-[10px] text-amber-700"><strong>Cobrar al cliente:</strong> ${rmFmt(hybTotal)}</div>
          </div>
        </div>
      </div>

      <!-- Análisis comparativo -->
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <h4 class="text-xs font-bold text-slate-400 uppercase mb-3">📐 Análisis comparativo</h4>
        <div class="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div class="text-[10px] text-slate-400">Margen vs Histórico</div>
            <div class="text-lg font-bold text-emerald-400">${rmFmt(hybTotal - histTotal)}</div>
            <div class="text-[10px] text-slate-500">(${((hybTotal/histTotal-1)*100).toFixed(0)}% sobre tu costo)</div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400">Margen vs Mercado</div>
            <div class="text-lg font-bold ${hybTotal < mktTotal ? 'text-blue-400':'text-red-400'}">${rmFmt(mktTotal - hybTotal)}</div>
            <div class="text-[10px] text-slate-500">(${hybTotal < mktTotal ? 'eres más barato' : 'eres más caro'})</div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400">Ganancia bruta esperada</div>
            <div class="text-lg font-bold text-amber-400">${rmFmt(hybTotal - histTotal)}</div>
            <div class="text-[10px] text-slate-500">si cobras híbrido y gastas histórico</div>
          </div>
        </div>
      </div>

      <!-- Tabla detallada por etapa -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <h4 class="text-xs font-bold uppercase text-slate-700 p-3 pb-0">Desglose por etapa (las 3 fuentes)</h4>
        <table class="w-full text-xs">
          <thead class="bg-slate-50"><tr><th class="text-left py-2 px-2">Etapa</th><th class="text-right py-2 px-2">Histórico</th><th class="text-right py-2 px-2">Mercado</th><th class="text-right py-2 px-2">Híbrido</th><th class="text-right py-2 px-2">Días</th><th class="text-right py-2 px-2">n</th></tr></thead>
          <tbody>
            ${enabled.map(s => {
              const h = sqft * s.avg * type.mult;
              const m = sqft * mktPsf * (s.avg / histPerSqft) * type.mult; // distribuir mercado proporcionalmente
              const hy = (h + m) / 2;
              return `<tr class="border-t border-slate-100">
                <td class="py-1.5 px-2">${s.name}${s.enriched ? ' <span class="text-[9px] text-emerald-600">●</span>' : ''}</td>
                <td class="py-1.5 px-2 text-right text-emerald-700">${rmFmt(h)}</td>
                <td class="py-1.5 px-2 text-right text-blue-700">${rmFmt(m)}</td>
                <td class="py-1.5 px-2 text-right text-amber-700 font-bold">${rmFmt(hy)}</td>
                <td class="py-1.5 px-2 text-right">${Math.round(s.days * type.mult)}d</td>
                <td class="py-1.5 px-2 text-right text-slate-500">${s.n}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="text-[10px] text-slate-500">● = etapa enriquecida con datos reales nuevos. A más proyectos completados, más precisa la estimación.</div>
    </div>
  `;
}

// ─── TAB: PRECISIÓN DEL MODELO (learning) ───
async function rmRenderLearning(body) {
  body.innerHTML = `<div class="text-center py-12">🔄 Cargando datos de aprendizaje...</div>`;
  const { data: actuals } = await sb.from('remodel_actuals').select('*');
  const list = actuals || [];

  // Calcular precisión por proyecto
  const byProject = {};
  list.forEach(a => {
    if (!byProject[a.project_id]) byProject[a.project_id] = { ests: 0, reals: 0, varPct: [] };
    byProject[a.project_id].ests += +a.estimated_cost || 0;
    byProject[a.project_id].reals += +a.real_cost || 0;
    if (a.variance_cost_pct != null) byProject[a.project_id].varPct.push(+a.variance_cost_pct);
  });

  const completedProjects = rmState.projects.filter(p => p.status === 'completed');
  const totalEst = Object.values(byProject).reduce((s,p)=>s+p.ests,0);
  const totalReal = Object.values(byProject).reduce((s,p)=>s+p.reals,0);
  const avgVariance = list.length ? list.reduce((s,a)=>s + (+a.variance_cost_pct||0), 0) / list.length : 0;

  // Variance por stage
  const byStage = {};
  list.forEach(a => {
    if (!a.stage_key) return;
    if (!byStage[a.stage_key]) byStage[a.stage_key] = [];
    if (a.variance_cost_pct != null) byStage[a.stage_key].push(+a.variance_cost_pct);
  });

  body.innerHTML = `
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-bold">📈 Precisión del modelo</h2>
        <p class="text-xs text-slate-500">El modelo aprende con cada proyecto completado. Reduce la desviación entre estimado y real.</p>
      </div>

      <div class="grid md:grid-cols-4 gap-3">
        <div class="bg-slate-50 rounded-lg p-3"><div class="text-[10px] text-slate-500 uppercase font-bold">Casas seed</div><div class="text-2xl font-bold">5</div></div>
        <div class="bg-emerald-50 rounded-lg p-3"><div class="text-[10px] text-emerald-700 uppercase font-bold">Proyectos completados</div><div class="text-2xl font-bold text-emerald-700">${completedProjects.length}</div></div>
        <div class="bg-blue-50 rounded-lg p-3"><div class="text-[10px] text-blue-700 uppercase font-bold">Activities con real</div><div class="text-2xl font-bold text-blue-700">${list.length}</div></div>
        <div class="bg-amber-50 rounded-lg p-3"><div class="text-[10px] text-amber-700 uppercase font-bold">Desv. promedio</div><div class="text-2xl font-bold ${Math.abs(avgVariance)>15?'text-red-700':Math.abs(avgVariance)>5?'text-amber-700':'text-emerald-700'}">${avgVariance>0?'+':''}${avgVariance.toFixed(1)}%</div></div>
      </div>

      ${list.length === 0 ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-950">
          <strong>🎓 Cómo alimentar el modelo:</strong><br>
          1. Crea un proyecto en el Editor<br>
          2. Conforme la obra avanza, abre el proyecto y registra <strong>"Real cost"</strong> en cada actividad<br>
          3. Al terminar, marca status "Completado"<br>
          4. El sistema actualiza automáticamente los benchmarks $/ft² por etapa<br>
          5. La próxima estimación es más precisa
        </div>
      ` : `
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <h3 class="text-xs font-bold uppercase text-slate-700 p-3 pb-0">Desviación por etapa</h3>
          <table class="w-full text-xs">
            <thead class="bg-slate-50"><tr><th class="text-left py-2 px-2">Etapa</th><th class="text-right py-2 px-2">Muestras</th><th class="text-right py-2 px-2">Desv. promedio</th><th class="text-right py-2 px-2">Status</th></tr></thead>
            <tbody>
              ${RM_STAGE_BENCHMARKS.map(s => {
                const arr = byStage[s.key] || [];
                const avg = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
                const status = avg === null ? 'sin datos' : Math.abs(avg) < 5 ? '✓ Excelente' : Math.abs(avg) < 15 ? '⚠️ Ajustar' : '🔴 Recalibrar';
                const cls = avg === null ? 'text-slate-400' : Math.abs(avg) < 5 ? 'text-emerald-700' : Math.abs(avg) < 15 ? 'text-amber-700' : 'text-red-700';
                return `<tr class="border-t border-slate-100">
                  <td class="py-1.5 px-2">${s.name}</td>
                  <td class="py-1.5 px-2 text-right">${arr.length}</td>
                  <td class="py-1.5 px-2 text-right font-bold ${cls}">${avg === null ? '—' : (avg>0?'+':'')+avg.toFixed(1)+'%'}</td>
                  <td class="py-1.5 px-2 text-right ${cls}">${status}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <h3 class="text-xs font-bold uppercase text-slate-700 p-3 pb-0">Proyectos con datos reales</h3>
          <table class="w-full text-xs">
            <thead class="bg-slate-50"><tr><th class="text-left py-2 px-2">Proyecto</th><th class="text-right py-2 px-2">Estimado</th><th class="text-right py-2 px-2">Real</th><th class="text-right py-2 px-2">Desv. $</th><th class="text-right py-2 px-2">Desv. %</th></tr></thead>
            <tbody>
              ${Object.entries(byProject).map(([pid, data]) => {
                const project = rmState.projects.find(p => p.id === pid);
                const diff = data.reals - data.ests;
                const pct = data.ests ? (diff / data.ests * 100) : 0;
                return `<tr class="border-t border-slate-100">
                  <td class="py-1.5 px-2 font-semibold">${project?.name || pid.slice(0,8)}</td>
                  <td class="py-1.5 px-2 text-right">${rmFmt(data.ests)}</td>
                  <td class="py-1.5 px-2 text-right">${rmFmt(data.reals)}</td>
                  <td class="py-1.5 px-2 text-right ${diff<0?'text-emerald-700':'text-red-700'}">${diff>0?'+':''}${rmFmt(diff)}</td>
                  <td class="py-1.5 px-2 text-right font-bold ${Math.abs(pct)<5?'text-emerald-700':Math.abs(pct)<15?'text-amber-700':'text-red-700'}">${pct>0?'+':''}${pct.toFixed(1)}%</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ─── TAB: ESTIMACIÓN RÁPIDA $/ft² (Structure One) ───
function rmRenderQuick(body) {
  const sqft = rmQuickState.sqft;
  const enabled = RM_STAGE_BENCHMARKS.filter(s => rmQuickState.stagesEnabled[s.key]);
  const rows = enabled.map(s => {
    const lowCost = sqft * s.min;
    const avgCost = sqft * s.avg;
    const highCost = sqft * s.max;
    const stdCost = sqft * s.std;
    return { ...s, lowCost, avgCost, highCost, stdCost };
  });
  const totalAvg = rows.reduce((a,b)=>a+b.avgCost, 0);
  const totalLow = rows.reduce((a,b)=>a+b.lowCost, 0);
  const totalHigh = rows.reduce((a,b)=>a+b.highCost, 0);
  const totalDays = rows.reduce((a,b)=>a+b.days, 0);
  const totalPsf = sqft ? totalAvg/sqft : 0;
  const mktLow = sqft * RM_MARKET_AUSTIN_MIN;
  const mktHigh = sqft * RM_MARKET_AUSTIN_MAX;

  body.innerHTML = `
    <div class="grid lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 space-y-3">
        <!-- INPUT -->
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold uppercase text-slate-700 mb-2">⚡ Estimación rápida basada en 5 casas reales</h3>
          <div class="grid grid-cols-3 gap-3 items-end">
            <div>
              <label class="block text-[10px] text-slate-500 mb-1">Sqft de la casa</label>
              <input type="number" value="${sqft}" oninput="rmQuickState.sqft=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-3 py-2 text-lg font-bold" />
            </div>
            <div class="col-span-2">
              <label class="block text-[10px] text-slate-500 mb-1">Modo de cálculo</label>
              <div class="flex gap-2">
                ${[{k:'min',l:'Optimista (mín hist.)'},{k:'avg',l:'Realista (promedio)'},{k:'max',l:'Pesimista (máx hist.)'}].map(m => `
                  <button onclick="rmQuickState.mode='${m.k}'; rmRenderTab()" class="flex-1 px-3 py-2 rounded text-xs font-bold ${rmQuickState.mode===m.k?'bg-slate-900 text-white':'bg-slate-100'}">${m.l}</button>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="mt-3 text-xs">
            <button onclick="Object.keys(rmQuickState.stagesEnabled).forEach(k=>rmQuickState.stagesEnabled[k]=true); rmRenderTab()" class="text-slate-600 hover:text-slate-900 underline">Todas</button>
            ·
            <button onclick="Object.keys(rmQuickState.stagesEnabled).forEach(k=>rmQuickState.stagesEnabled[k]=false); rmRenderTab()" class="text-slate-600 hover:text-slate-900 underline">Ninguna</button>
            ·
            <button onclick="['demolicion','drywall','pintura_int','pisos','cocina','banos','trim','limpieza_final'].forEach(k=>rmQuickState.stagesEnabled[k]=true); ['estructura','techo','hvac','electricidad','plomeria','aislamiento','pintura_ext','exteriores'].forEach(k=>rmQuickState.stagesEnabled[k]=false); rmRenderTab()" class="text-slate-600 hover:text-slate-900 underline">Solo interior</button>
            ·
            <button onclick="['techo','pintura_ext','exteriores'].forEach(k=>rmQuickState.stagesEnabled[k]=true); ['demolicion','drywall','pintura_int','pisos','cocina','banos','trim','limpieza_final','hvac','electricidad','plomeria','aislamiento','estructura'].forEach(k=>rmQuickState.stagesEnabled[k]=false); rmRenderTab()" class="text-slate-600 hover:text-slate-900 underline">Solo exterior</button>
          </div>
        </div>

        <!-- TABLA -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr><th class="text-left py-2 px-2">✓</th><th class="text-left py-2 px-2">Etapa</th><th class="text-right py-2 px-2">Mín</th><th class="text-right py-2 px-2">Prom</th><th class="text-right py-2 px-2">Máx</th><th class="text-right py-2 px-2">Días</th><th class="text-center py-2 px-2">Mat/MO</th></tr>
            </thead>
            <tbody>
              ${RM_STAGE_BENCHMARKS.map(s => {
                const on = rmQuickState.stagesEnabled[s.key];
                const r = rows.find(x => x.key === s.key);
                return `<tr class="border-t border-slate-100 ${on?'':'opacity-40'}">
                  <td class="py-1.5 px-2"><input type="checkbox" ${on?'checked':''} onchange="rmQuickState.stagesEnabled['${s.key}']=this.checked; rmRenderTabPreservingFocus()" /></td>
                  <td class="py-1.5 px-2 font-semibold">${s.name}</td>
                  <td class="py-1.5 px-2 text-right">${on?rmFmt(r.lowCost):rmFmt(sqft*s.min)}<div class="text-[9px] text-slate-400">$${s.min.toFixed(2)}/ft²</div></td>
                  <td class="py-1.5 px-2 text-right font-bold">${on?rmFmt(r.avgCost):rmFmt(sqft*s.avg)}<div class="text-[9px] text-slate-400">$${s.avg.toFixed(2)}/ft²</div></td>
                  <td class="py-1.5 px-2 text-right">${on?rmFmt(r.highCost):rmFmt(sqft*s.max)}<div class="text-[9px] text-slate-400">$${s.max.toFixed(2)}/ft²</div></td>
                  <td class="py-1.5 px-2 text-right">${s.days}d</td>
                  <td class="py-1.5 px-2 text-center text-[10px]">${s.mat}/${s.mano}</td>
                </tr>`;
              }).join('')}
              <tr class="border-t-2 border-slate-300 bg-amber-50 font-bold">
                <td></td><td class="py-2 px-2">TOTAL ${enabled.length}/16 etapas</td>
                <td class="py-2 px-2 text-right">${rmFmt(totalLow)}</td>
                <td class="py-2 px-2 text-right text-amber-700">${rmFmt(totalAvg)}</td>
                <td class="py-2 px-2 text-right">${rmFmt(totalHigh)}</td>
                <td class="py-2 px-2 text-right">${totalDays}d</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- RESUMEN -->
      <div class="space-y-3">
        <div class="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 rounded-xl p-4">
          <div class="text-xs font-bold text-amber-900 uppercase">Estimado para ${sqft.toLocaleString()} ft²</div>
          <div class="text-3xl font-bold text-amber-700 mt-1">${rmFmt(totalAvg)}</div>
          <div class="text-xs text-amber-800">$${totalPsf.toFixed(2)}/ft² · ${totalDays}d sumados</div>
          <div class="mt-2 pt-2 border-t border-amber-200 text-xs">
            <div class="flex justify-between"><span class="text-slate-600">Rango mín-máx:</span><span class="font-bold">${rmFmt(totalLow)} – ${rmFmt(totalHigh)}</span></div>
          </div>
        </div>

        <div class="bg-white rounded-lg p-3 border border-slate-200">
          <div class="text-xs font-bold text-slate-700 uppercase mb-2">📈 Vs Mercado Austin</div>
          <div class="text-xs space-y-1">
            <div class="flex justify-between"><span class="text-slate-500">Tu costo interno:</span><span class="font-bold">$${totalPsf.toFixed(0)}/ft²</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Mercado Austin:</span><span class="font-bold">$${RM_MARKET_AUSTIN_MIN}-${RM_MARKET_AUSTIN_MAX}/ft²</span></div>
            <div class="flex justify-between text-emerald-700"><span>Margen para markup:</span><span class="font-bold">$${(RM_MARKET_AUSTIN_MIN-totalPsf).toFixed(0)} – $${(RM_MARKET_AUSTIN_MAX-totalPsf).toFixed(0)}/ft²</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Precio sugerido bajo:</span><span class="text-blue-700 font-bold">${rmFmt(mktLow)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Precio sugerido alto:</span><span class="text-blue-700 font-bold">${rmFmt(mktHigh)}</span></div>
          </div>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-950">
          <strong>📊 Calibración:</strong> Datos promediados de <strong>5 casas reales</strong> (Ramble, Arcadia, Virginia, Idlewood, Picnic). Confianza estadística: 78%. Σ-1 a +1 cubre 68% de los casos.
        </div>

        <button onclick="rmQuickToProject()" class="w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-lg">→ Pasar al Editor detallado</button>
      </div>
    </div>
  `;
}

function rmQuickToProject() {
  // Carga las etapas habilitadas como actividades genéricas (1 por etapa) en el editor
  rmNewProject();
  rmState.editSqft = rmQuickState.sqft;
  // Para que el editor se inicie con las stages encendidas, agregamos 1 actividad placeholder por cada
  // (las del catálogo más representativas de cada stage)
  const placeholders = {
    demolicion: '1.1.1', estructura: '4.1.2', techo: '3.1.1', hvac: '5.5.1h',
    electricidad: '5.1.6', plomeria: '5.2.1p', aislamiento: '5.1.3', drywall: '5.1.1',
    pisos: '5.6.1', pintura_int: '5.1.2', pintura_ext: '3.4.3', cocina: '5.4.1',
    banos: '5.3.1', trim: '5.6.3', exteriores: '3.15.1', limpieza_final: '6.3.2'
  };
  Object.entries(rmQuickState.stagesEnabled).forEach(([stage, on]) => {
    if (!on) return;
    const code = placeholders[stage];
    const cat = RM_CATALOG.find(c => c.code === code);
    if (!cat) return;
    const bench = RM_STAGE_BENCHMARKS.find(s => s.key === stage);
    const targetCost = rmQuickState.sqft * bench.avg;
    const qty = cat.unit === 'sqft' ? rmQuickState.sqft : 1;
    rmState.selectedActivities[code] = { qty, vu: targetCost / qty, days: bench.days, start_offset: 0 };
  });
  rmState.tab = 'editor';
  rmRender();
}

// ─── TAB: TASAS $/ft² ───
function rmRenderRates(body) {
  body.innerHTML = `
    <div class="mb-3">
      <h2 class="text-lg font-bold">📊 Tasas Unitarias por Etapa — $/ft² (calibrado con 5 casas)</h2>
      <p class="text-xs text-slate-500">Total portafolio: <strong>$${RM_PORTFOLIO_TOTAL_PSF}/ft²</strong> · Mercado Austin: <strong>$${RM_MARKET_AUSTIN_MIN}-${RM_MARKET_AUSTIN_MAX}/ft²</strong> · Margen estructural: $${(RM_MARKET_AUSTIN_MIN-RM_PORTFOLIO_TOTAL_PSF).toFixed(0)}-$${(RM_MARKET_AUSTIN_MAX-RM_PORTFOLIO_TOTAL_PSF).toFixed(0)}/ft²</p>
    </div>
    <div class="overflow-x-auto border border-slate-200 rounded-lg">
      <table class="w-full text-xs">
        <thead class="bg-slate-50">
          <tr>
            <th class="text-left py-2 px-2">Etapa</th>
            <th class="text-right py-2 px-2">Prom $/ft²</th>
            <th class="text-right py-2 px-2">σ desv.</th>
            <th class="text-right py-2 px-2">Mín</th>
            <th class="text-right py-2 px-2">Máx</th>
            <th class="text-right py-2 px-2">Días</th>
            <th class="text-center py-2 px-2">Mat %</th>
            <th class="text-center py-2 px-2">Mano %</th>
            <th class="text-right py-2 px-2">n</th>
          </tr>
        </thead>
        <tbody>
          ${RM_STAGE_BENCHMARKS.map(s => {
            const cvPct = s.avg ? (s.std/s.avg*100) : 0;
            const variability = cvPct > 80 ? 'high' : cvPct > 40 ? 'med' : 'low';
            const varColor = variability === 'high' ? 'text-red-700' : variability === 'med' ? 'text-amber-700' : 'text-emerald-700';
            return `<tr class="border-t border-slate-100 hover:bg-slate-50">
              <td class="py-2 px-2 font-semibold">${s.name}</td>
              <td class="py-2 px-2 text-right font-bold text-slate-900">$${s.avg.toFixed(2)}</td>
              <td class="py-2 px-2 text-right ${varColor}">±$${s.std.toFixed(2)} <span class="text-[9px]">(${cvPct.toFixed(0)}%CV)</span></td>
              <td class="py-2 px-2 text-right text-slate-500">$${s.min.toFixed(2)}</td>
              <td class="py-2 px-2 text-right text-slate-500">$${s.max.toFixed(2)}</td>
              <td class="py-2 px-2 text-right">${s.days}d</td>
              <td class="py-2 px-2 text-center text-blue-700">${s.mat}%</td>
              <td class="py-2 px-2 text-center text-purple-700">${s.mano}%</td>
              <td class="py-2 px-2 text-right text-slate-500">${s.n}/5</td>
            </tr>`;
          }).join('')}
          <tr class="border-t-2 border-slate-300 bg-amber-50 font-bold">
            <td class="py-2 px-2">TOTAL PORTAFOLIO</td>
            <td class="py-2 px-2 text-right text-amber-700">$${RM_PORTFOLIO_TOTAL_PSF}</td>
            <td colspan="7"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid md:grid-cols-3 gap-3 mt-4">
      <div class="bg-emerald-50 border border-emerald-200 rounded p-3">
        <div class="text-xs font-bold text-emerald-900 uppercase">Etapas estables (low CV)</div>
        <div class="text-[10px] text-emerald-700 mt-1">${RM_STAGE_BENCHMARKS.filter(s=>s.std/s.avg<0.4).map(s=>s.name).join(', ') || '—'}</div>
        <div class="text-[10px] text-slate-500 mt-1">Predicción confiable.</div>
      </div>
      <div class="bg-amber-50 border border-amber-200 rounded p-3">
        <div class="text-xs font-bold text-amber-900 uppercase">Etapas medias (CV 40-80%)</div>
        <div class="text-[10px] text-amber-700 mt-1">${RM_STAGE_BENCHMARKS.filter(s=>{const cv=s.std/s.avg;return cv>=0.4&&cv<0.8;}).map(s=>s.name).join(', ') || '—'}</div>
        <div class="text-[10px] text-slate-500 mt-1">Verificar contra scope específico.</div>
      </div>
      <div class="bg-red-50 border border-red-200 rounded p-3">
        <div class="text-xs font-bold text-red-900 uppercase">Etapas volátiles (CV >80%)</div>
        <div class="text-[10px] text-red-700 mt-1">${RM_STAGE_BENCHMARKS.filter(s=>s.std/s.avg>=0.8).map(s=>s.name).join(', ') || '—'}</div>
        <div class="text-[10px] text-slate-500 mt-1">Cotizar caso por caso, alta incertidumbre.</div>
      </div>
    </div>
  `;
}

// ─── TAB: PROYECTOS ───
function rmRenderProjects(body) {
  body.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-lg font-bold">Proyectos de remodelación</h2>
      <button onclick="rmNewProject()" class="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded">+ Nuevo proyecto</button>
    </div>
    <div class="overflow-x-auto border border-slate-200 rounded-lg">
      <table class="w-full text-sm">
        <thead class="bg-slate-50"><tr><th class="text-left py-2 px-2">Proyecto</th><th class="text-right py-2 px-2">Sqft</th><th class="text-right py-2 px-2">Presupuesto</th><th class="text-right py-2 px-2">$/sqft</th><th class="text-right py-2 px-2">Real</th><th class="text-center py-2 px-2">Status</th><th class="text-right py-2 px-2">Inicio</th><th></th></tr></thead>
        <tbody>
          ${rmState.projects.map(p => `
            <tr class="border-t border-slate-200 hover:bg-slate-50">
              <td class="py-2 px-2 font-semibold">${p.name}</td>
              <td class="py-2 px-2 text-right">${p.sqft || '—'}</td>
              <td class="py-2 px-2 text-right font-bold">${rmFmt(p.budget_total)}</td>
              <td class="py-2 px-2 text-right">${p.sqft ? '$' + (p.budget_total/p.sqft).toFixed(0) : '—'}</td>
              <td class="py-2 px-2 text-right">${p.real_total > 0 ? rmFmt(p.real_total) : '—'}</td>
              <td class="py-2 px-2 text-center"><span class="text-[10px] px-2 py-0.5 rounded bg-slate-100">${p.status}</span></td>
              <td class="py-2 px-2 text-right text-xs text-slate-500">${rmFmtDate(p.start_date)}</td>
              <td class="py-2 px-2 text-right whitespace-nowrap">
                <button onclick='rmLoadProject(${JSON.stringify(p).replace(/'/g,"&#39;")})' class="text-xs text-slate-600 hover:text-slate-900 mr-1">📝</button>
                <button onclick="rmDeleteProject('${p.id}')" class="text-xs text-red-600 hover:text-red-800">🗑</button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="8" class="text-center text-slate-400 py-8">Sin proyectos. Click "+ Nuevo proyecto".</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

async function rmDeleteProject(id) {
  if (!confirm('¿Borrar este proyecto?')) return;
  await sb.from('remodel_projects').delete().eq('id', id);
  await rmLoadAll();
  rmRender();
}

// ─── TAB: EDITOR ───
function rmRenderEditor(body) {
  const e = rmCalcProject();
  body.innerHTML = `
    <div class="grid lg:grid-cols-12 gap-4">
      <div class="lg:col-span-8 space-y-3">
        <!-- Info -->
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-2">Información del proyecto</h3>
          <div class="grid grid-cols-3 gap-2">
            <div class="col-span-2"><label class="block text-[10px] text-slate-500 mb-0.5">Nombre *</label><input value="${rmState.editName}" oninput="rmState.editName=this.value" placeholder="Ej: 1308 Denfield" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-semibold" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Sqft</label><input type="number" value="${rmState.editSqft}" oninput="rmState.editSqft=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
            <div class="col-span-2"><label class="block text-[10px] text-slate-500 mb-0.5">Dirección</label><input value="${rmState.editAddress}" oninput="rmState.editAddress=this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Fecha inicio</label><input type="date" value="${rmState.editStartDate}" onchange="rmState.editStartDate=this.value; rmRenderTabPreservingFocus()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
          </div>
        </div>

        <!-- Activos del proyecto: Matterport + scope + audio + planos -->
        ${rmRenderAssets()}

        <!-- Catálogo por fase -->
        ${Object.entries(RM_PHASES).map(([p, info]) => {
          const acts = RM_CATALOG.filter(c => c.phase === p);
          const phaseSel = acts.filter(a => rmState.selectedActivities[a.code]);
          const phaseBudget = e.byPhase[p]?.total || 0;
          return `
            <details ${phaseSel.length?'open':''} class="bg-white rounded-xl border border-slate-200">
              <summary class="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                <div class="flex items-center gap-2">
                  <span class="text-lg">${info.icon}</span>
                  <span class="font-bold text-sm">${p}. ${info.name}</span>
                  ${phaseSel.length ? `<span class="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded">${phaseSel.length} activ.</span>` : ''}
                </div>
                <span class="text-sm font-bold ${phaseBudget?'text-slate-900':'text-slate-400'}">${rmFmt(phaseBudget)}</span>
              </summary>
              <div class="p-3 border-t border-slate-100 space-y-1">
                ${acts.map(a => {
                  const sel = rmState.selectedActivities[a.code];
                  const qty = sel ? sel.qty : '';
                  const vu = sel ? sel.vu : a.vu;
                  const total = sel ? (+sel.qty || 0) * (+sel.vu || a.vu) : 0;
                  return `
                    <div class="grid grid-cols-[20px_1fr_80px_90px_90px_30px] gap-2 items-center text-xs py-1 ${sel?'bg-emerald-50 rounded':''}">
                      <input type="checkbox" ${sel?'checked':''} onchange="rmToggleActivity('${a.code}')" class="w-4 h-4" />
                      <div>
                        <div class="font-mono text-[10px] text-slate-400">${a.code}</div>
                        <div class="font-semibold">${a.desc}</div>
                        <div class="text-[10px] text-slate-500">${a.subcat} · ${a.unit}</div>
                      </div>
                      <input type="number" step="0.01" value="${qty}" onchange="rmSetQty('${a.code}', this.value)" placeholder="Cant." class="border border-slate-300 rounded px-2 py-1 text-xs ${sel?'bg-white':'bg-slate-50'}" />
                      <input type="number" step="0.01" value="${vu}" onchange="rmSetVu('${a.code}', this.value)" placeholder="$/u" class="border border-slate-300 rounded px-2 py-1 text-xs ${sel?'bg-white':'bg-slate-50'}" />
                      <div class="text-right font-bold ${total?'text-slate-900':'text-slate-300'}">${rmFmt(total)}</div>
                      <input type="number" value="${sel?.days||''}" onchange="rmSetDays('${a.code}', this.value)" placeholder="d" title="Días" class="border border-slate-300 rounded px-1 py-1 text-[10px] text-center ${sel?'bg-white':'bg-slate-50'}" />
                    </div>
                  `;
                }).join('')}
              </div>
            </details>
          `;
        }).join('')}
      </div>

      <!-- RESUMEN -->
      <div class="lg:col-span-4 space-y-3">
        <!-- PRICING TOTAL -->
        <div class="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-400 rounded-xl p-4">
          <h3 class="text-xs font-bold text-emerald-900 uppercase mb-1">💵 Precio al cliente</h3>
          <div class="text-3xl font-bold text-emerald-700">${rmFmt(e.pricing.clientPrice)}</div>
          <div class="text-xs text-emerald-800 mt-1">Ganancia: <strong>${rmFmt(e.pricing.profit)}</strong> (${e.pricing.profitMarginPct.toFixed(1)}% margen)</div>
        </div>

        <!-- BREAKDOWN PRICING -->
        <div class="bg-slate-900 text-white rounded-xl p-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase mb-2">📊 Desglose pricing</h3>
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-slate-700"><td class="py-1 text-slate-400">Costo directo</td><td class="py-1 text-right">${rmFmt(e.pricing.directCost)}</td></tr>
              <tr class="border-b border-slate-700"><td class="py-1 text-slate-400">+ Contingencia (${rmState.contingencyPct}%)</td><td class="py-1 text-right text-amber-300">${rmFmt(e.pricing.contingency)}</td></tr>
              <tr class="border-b border-slate-700"><td class="py-1 text-slate-400">+ Overhead (${rmState.overheadPct}%)</td><td class="py-1 text-right text-amber-300">${rmFmt(e.pricing.overhead)}</td></tr>
              <tr class="border-b border-slate-700"><td class="py-1 text-slate-400">+ Soft costs (permits+design)</td><td class="py-1 text-right text-amber-300">${rmFmt(e.pricing.softCosts)}</td></tr>
              <tr class="border-b border-slate-700 font-bold"><td class="py-1.5 text-amber-400">= COSTO INTERNO</td><td class="py-1.5 text-right text-amber-400">${rmFmt(e.pricing.internalCost)}</td></tr>
              <tr class="border-b border-slate-700"><td class="py-1 text-slate-400">+ Markup (${rmState.markupPct}%)</td><td class="py-1 text-right text-emerald-300">${rmFmt(e.pricing.markup)}</td></tr>
              <tr class="font-bold"><td class="py-1.5 text-emerald-400">= PRECIO CLIENTE</td><td class="py-1.5 text-right text-emerald-400">${rmFmt(e.pricing.clientPrice)}</td></tr>
            </tbody>
          </table>
          <div class="mt-3 pt-2 border-t border-slate-700 text-xs text-slate-400">
            ${e.sqft ? '$' + (e.pricing.clientPrice/e.sqft).toFixed(0) + '/sqft al cliente · ' : ''}${e.totalDays} días est.
          </div>
        </div>

        <!-- CONTROLES PRICING -->
        <details class="bg-white rounded-xl border border-slate-200">
          <summary class="cursor-pointer p-3 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50">⚙️ Ajustes de pricing</summary>
          <div class="p-3 pt-0 space-y-2 border-t border-slate-100">
            <div class="grid grid-cols-2 gap-2">
              <div><label class="block text-[10px] text-slate-500">Contingencia %</label><input type="number" step="1" value="${rmState.contingencyPct}" oninput="rmState.contingencyPct=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /><p class="text-[9px] text-slate-400">Industria: 15-20% remodel</p></div>
              <div><label class="block text-[10px] text-slate-500">Overhead %</label><input type="number" step="1" value="${rmState.overheadPct}" oninput="rmState.overheadPct=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /><p class="text-[9px] text-slate-400">Industria: 10-15%</p></div>
              <div><label class="block text-[10px] text-slate-500">Permits $</label><input type="number" value="${rmState.permitsCost}" oninput="rmState.permitsCost=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /></div>
              <div><label class="block text-[10px] text-slate-500">Design fees $</label><input type="number" value="${rmState.designFeesCost}" oninput="rmState.designFeesCost=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /></div>
              <div class="col-span-2"><label class="block text-[10px] text-slate-500">Markup al cliente %</label><input type="number" step="1" value="${rmState.markupPct}" oninput="rmState.markupPct=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /><p class="text-[9px] text-slate-400">Industria: 20-30% típico, 50% high-end</p></div>
              <div><label class="block text-[10px] text-slate-500">Crew (personas)</label><input type="number" value="${rmState.crewSize}" oninput="rmState.crewSize=Math.max(1,+this.value); rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /></div>
              <div><label class="block text-[10px] text-slate-500">Días/semana</label><select onchange="rmState.workDays=+this.value; rmRenderTabPreservingFocus()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs"><option value="5" ${rmState.workDays===5?'selected':''}>5 (L-V)</option><option value="6" ${rmState.workDays===6?'selected':''}>6 (L-S)</option><option value="7" ${rmState.workDays===7?'selected':''}>7</option></select></div>
            </div>
          </div>
        </details>

        <!-- DESGLOSE DIRECTO -->
        <div class="bg-white rounded-lg p-3 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-2">Costo directo: 60/30/10</h3>
          <div class="text-xs space-y-1">
            <div class="flex justify-between"><span class="text-slate-500">Materiales</span><span class="text-blue-700">${rmFmt(e.totals.material)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Mano de obra</span><span class="text-purple-700">${rmFmt(e.totals.labor)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Equipo</span><span class="text-slate-700">${rmFmt(e.totals.equipment)}</span></div>
          </div>
        </div>

        <div class="bg-white rounded-lg p-3 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-2">Por fase</h3>
          ${Object.entries(RM_PHASES).map(([p, info]) => {
            const b = e.byPhase[p]?.total || 0;
            const pct = e.totals.total ? (b / e.totals.total * 100) : 0;
            return `
              <div class="mb-1.5">
                <div class="flex justify-between text-xs">
                  <span>${info.icon} ${info.name}</span>
                  <span class="font-bold">${rmFmt(b)} (${pct.toFixed(0)}%)</span>
                </div>
                <div class="bg-slate-100 rounded-full h-1.5 mt-0.5"><div class="h-1.5 rounded-full" style="width:${pct}%; background:${info.color};"></div></div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Comparación con calibración -->
        ${rmState.calibrationHouses.length ? `
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h3 class="text-xs font-bold text-amber-900 uppercase mb-2">🎯 Benchmark calibradoras</h3>
            <p class="text-[10px] text-amber-800">Costo total promedio en 5 casas reales:</p>
            ${(() => {
              const houses = rmState.calibrationHouses;
              const avgTotal = houses.reduce((s,h) => s + ((+h.total_materials||0) + (+h.total_labor||0)), 0) / houses.length;
              const avgPpsf = houses.reduce((s,h) => s + (((+h.total_materials||0) + (+h.total_labor||0)) / (h.sqft||1)), 0) / houses.length;
              return `
                <div class="text-xs mt-1"><strong>${rmFmt(avgTotal)}</strong> total ($${avgPpsf.toFixed(0)}/sqft promedio)</div>
                <div class="text-[10px] text-amber-700 mt-1">Tu estimación: ${rmFmt(e.totals.total)} (${e.sqft ? '$' + e.ppsf.toFixed(0) : '—'}/sqft) → ${((e.ppsf/avgPpsf-1)*100).toFixed(0)}% vs benchmark</div>
              `;
            })()}
          </div>
        ` : ''}

        ${aiBoxHtml('remodel-pro', 'Validar con mercado actual + ingeniería', 'Claude busca pricing real Texas, lead times, permits ciudad, hidden costs por edad, supply chain, labor market', 'rmRunAI')}

        <button onclick="rmSaveProject()" class="w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-lg">${rmState.currentProject?'💾 Guardar cambios':'💾 Crear proyecto'}</button>

        ${rmState.currentProject ? `
        <button onclick="rmSyncToPlanner()" class="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
          📅 Enviar al Planner Semanal →
        </button>
        <p class="text-[10px] text-slate-500 text-center">Crea actividades en cada día según el cronograma. Editable después.</p>
        ` : ''}
      </div>
    </div>
  `;
  setTimeout(() => {
    const ai = window.aiState?.['remodel-pro'];
    const el = document.getElementById('ai-result-remodel-pro');
    if (el && ai?.analysis) el.innerHTML = aiResultGenericHtml(ai.analysis);
  }, 50);
}

// ─── SYNC: Estimador → Planner Semanal ───
async function rmSyncToPlanner() {
  if (!rmState.currentProject) {
    return alert('Primero guarda el proyecto (botón "Guardar" abajo) y luego sincroniza.');
  }
  if (Object.keys(rmState.selectedActivities).length === 0) {
    return alert('No hay actividades seleccionadas. Marca actividades en el catálogo primero.');
  }
  if (!confirm(`Sincronizar ${Object.keys(rmState.selectedActivities).length} actividades al Planner Semanal?\n\nEsto BORRARÁ las actividades existentes en el Planner de este proyecto y las reemplazará con las nuevas fechas calculadas.`)) return;

  const e = rmCalcProject();
  const startDate = new Date(rmState.editStartDate);
  const projectId = rmState.currentProject.id;
  const projectName = rmState.editName || rmState.currentProject.name;

  // 1) Borrar weekly_activities previas auto-generadas de este proyecto
  await sb.from('weekly_activities').delete().eq('project_id', projectId);

  // 2) Para cada actividad seleccionada: calcular fecha basada en su fase + start_offset
  const inserts = [];
  Object.entries(rmState.selectedActivities).forEach(([code, cfg]) => {
    const cat = RM_CATALOG.find(c => c.code === code);
    if (!cat) return;
    // Fecha = inicio de la fase del estimador + offset propio
    const phaseSch = e.phaseSchedule[cat.phase];
    let activityStart = phaseSch ? new Date(phaseSch.start) : startDate;
    if (cfg.start_offset) activityStart = rmAddDays(activityStart, cfg.start_offset);
    const days = cfg.days || Math.max(1, Math.ceil((cat.days_per_qty || 0) * (cfg.qty || 1)));

    // Crear 1 entry por día de duración (para verlo en cada día del Planner)
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = rmAddDays(activityStart, i);
      const phaseInfo = RM_PHASES[cat.phase] || { name: cat.cat, color: '#64748b' };
      const dayLabel = days > 1 ? ` (día ${i+1}/${days})` : '';
      inserts.push({
        project_id: projectId,
        property_name: projectName,
        date: date.toISOString().split('T')[0],
        activity_name: cat.desc + dayLabel,
        stage: phaseInfo.name.toLowerCase().replace(/\s/g, '_'),
        notes: `[Estimador] ${code} · qty ${cfg.qty || 1} ${cat.unit} · $${Math.round((cfg.qty||0)*(cfg.vu||cat.vu))}`,
        start_hour: 7,
        end_hour: 17,
        status: 'planned',
        priority: i === 0 ? 'normal' : 'low',
        created_by: state.user.id
      });
    }
  });

  if (inserts.length === 0) return alert('No hay actividades para sincronizar.');

  // Insertar en chunks (Postgrest tiene límite)
  const chunkSize = 50;
  for (let i = 0; i < inserts.length; i += chunkSize) {
    const chunk = inserts.slice(i, i + chunkSize);
    const { error } = await sb.from('weekly_activities').insert(chunk);
    if (error) return alert('Error sync: ' + error.message);
  }

  // Rango de fechas resultante
  const dates = inserts.map(i => i.date).sort();
  const minDate = dates[0], maxDate = dates[dates.length-1];
  const fmt = d => new Date(d+'T00:00:00').toLocaleDateString('es-MX', {weekday:'short', day:'numeric', month:'short'});

  if (confirm(`✓ SINCRONIZACIÓN EXITOSA\n\n${inserts.length} actividades-día creadas en el Planner Semanal\n\n• Proyecto: ${projectName}\n• Desde: ${fmt(minDate)}\n• Hasta: ${fmt(maxDate)}\n• Duración: ${e.totalDays} días\n• Etapas: ${Object.keys(e.byPhase).length}\n\n¿Abrir el Planner Semanal ahora?`)) {
    // Cerrar este modal y abrir el planner
    closeModal();
    setTimeout(async () => {
      const plannerSys = state.systems[state.currentAreaId]?.find(s => s.type === 'weekly-planner')
        || (await sb.from('systems').select('*').eq('type','weekly-planner').single()).data;
      if (plannerSys) {
        // Asegurar que la semana inicial esté en el rango del proyecto
        if (typeof wpState !== 'undefined') {
          wpState.weekStart = wpMondayOf(new Date(minDate + 'T00:00:00'));
        }
        openWeeklyPlanner(plannerSys);
      }
    }, 300);
  }
}

async function rmRunAI(force = false) {
  const e = rmCalcProject();
  window._aiRefreshCb = () => rmRenderTab();
  await aiAnalyze('remodel-pro', {
    project_name: rmState.editName,
    address: rmState.editAddress,
    sqft: rmState.editSqft,
    activities_count: e.activities.length,
    activities_summary: e.activities.map(a => ({code:a.code, desc:a.desc.slice(0,50), qty:a.qty, total:a.total})).slice(0,30),
    direct_cost: e.pricing.directCost,
    internal_cost: e.pricing.internalCost,
    client_price: e.pricing.clientPrice,
    total_days: e.totalDays,
    crew_size: rmState.crewSize,
    contingency_pct: rmState.contingencyPct,
    overhead_pct: rmState.overheadPct,
    markup_pct: rmState.markupPct,
    // Activos del proyecto
    matterport_url: rmState.matterportUrl,
    scope_text: rmState.scopeText,
    scope_audio_transcript: rmState.scopeAudioTranscript,
    plans_count: rmState.plans.length,
    photos_count: rmState.photos.length
  }, force);
}

function rmToggleActivity(code) {
  if (rmState.selectedActivities[code]) delete rmState.selectedActivities[code];
  else {
    const cat = RM_CATALOG.find(c => c.code === code);
    rmState.selectedActivities[code] = { qty: 1, vu: cat.vu, days: Math.max(1, Math.ceil(cat.days_per_qty)), start_offset: 0 };
  }
  rmRenderTab();
}
function rmSetQty(code, v) { if(!rmState.selectedActivities[code])return; rmState.selectedActivities[code].qty = +v; rmRenderTab(); }
function rmSetVu(code, v) { if(!rmState.selectedActivities[code])return; rmState.selectedActivities[code].vu = +v; rmRenderTab(); }
function rmSetDays(code, v) { if(!rmState.selectedActivities[code])return; rmState.selectedActivities[code].days = +v; rmRenderTab(); }

// ─── TAB: GANTT (mejorado con inspecciones + lead times) ───
function rmRenderGantt(body) {
  const e = rmCalcProject();
  if (e.activities.length === 0) {
    body.innerHTML = `<p class="text-center text-slate-500 py-12">Agrega actividades en el Editor para ver el cronograma.</p>`;
    return;
  }

  // Detectar lead times necesarios
  const leadTimeAlerts = e.activities
    .filter(a => RM_LEAD_TIMES[a.code])
    .map(a => ({ activity: a.desc, code: a.code, lead_days: RM_LEAD_TIMES[a.code] }));

  // Calcular días adicionales por inspecciones (3-4 típicas)
  const inspectionDays = RM_INSPECTIONS.length * 1.5; // ~1-2 días cada una
  const realisticTotal = e.totalDays + Math.ceil(inspectionDays);

  const totalSpan = realisticTotal || 1;
  body.innerHTML = `
    <h2 class="text-lg font-bold mb-2">📅 Cronograma CPM — ${rmState.editName || 'Proyecto'}</h2>
    <div class="grid grid-cols-4 gap-3 mb-4">
      <div class="bg-slate-50 rounded p-2"><div class="text-[10px] text-slate-500 uppercase font-bold">Sin inspecciones</div><div class="text-lg font-bold">${e.totalDays} días</div></div>
      <div class="bg-amber-50 rounded p-2"><div class="text-[10px] text-amber-700 uppercase font-bold">+ Inspecciones</div><div class="text-lg font-bold text-amber-700">+${Math.ceil(inspectionDays)} días</div></div>
      <div class="bg-blue-50 rounded p-2"><div class="text-[10px] text-blue-700 uppercase font-bold">+ Lead times max</div><div class="text-lg font-bold text-blue-700">+${Math.max(0, ...leadTimeAlerts.map(l=>l.lead_days))} días</div><div class="text-[9px] text-slate-500">en paralelo a obra</div></div>
      <div class="bg-emerald-50 rounded p-2"><div class="text-[10px] text-emerald-700 uppercase font-bold">Realista total</div><div class="text-lg font-bold text-emerald-700">${realisticTotal} días</div><div class="text-[9px]">${rmFmtDate(rmAddDays(new Date(rmState.editStartDate), realisticTotal))}</div></div>
    </div>

    <!-- Gantt fases -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <h3 class="text-xs font-bold uppercase text-slate-700 mb-3">Gantt por fase</h3>
      <div class="space-y-3">
        ${Object.entries(RM_PHASES).map(([p, info]) => {
          if (!e.phaseSchedule[p]) return '';
          const phs = e.phaseSchedule[p];
          const left = Math.max(0, (phs.start - new Date(rmState.editStartDate)) / 86400000 / totalSpan * 100);
          const width = phs.days / totalSpan * 100;
          return `
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="font-semibold">${info.icon} ${info.name}</span>
                <span class="text-slate-500">${rmFmtDate(phs.start)} → ${rmFmtDate(phs.end)} (${phs.days}d)</span>
              </div>
              <div class="relative h-7 bg-slate-100 rounded">
                <div class="absolute h-full rounded text-white text-[10px] font-bold flex items-center justify-center" style="left:${left}%; width:${width}%; background:${info.color};">${phs.days}d</div>
              </div>
              <div class="text-[10px] text-slate-500 mt-1 ml-2">${(e.byPhase[p]?.activities || []).length} actividades</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- INSPECCIONES OBLIGATORIAS -->
    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <h3 class="text-xs font-bold uppercase text-amber-900 mb-2">🔍 Inspecciones obligatorias (no las olvides)</h3>
      <table class="w-full text-xs">
        <thead><tr class="text-amber-800"><th class="text-left py-1">Inspección</th><th class="text-left py-1">Cuándo</th><th class="text-right py-1">Espera</th></tr></thead>
        <tbody>
          ${RM_INSPECTIONS.map(i => {
            const when = i.after_phase ? `Después de fase ${i.after_phase} (${RM_PHASES[i.after_phase]?.name})`
                       : i.before_phase ? `Antes de fase ${i.before_phase}`
                       : i.in_phase ? `Durante fase ${i.in_phase}` : '?';
            return `<tr class="border-t border-amber-200"><td class="py-1.5 font-semibold">${i.name}</td><td class="py-1.5 text-slate-600">${when}</td><td class="py-1.5 text-right text-amber-700">+${i.wait_days}d</td></tr>`;
          }).join('')}
        </tbody>
      </table>
      <p class="text-[10px] text-amber-700 mt-2">⚠️ Si una inspección no pasa, todo el cronograma se mueve. Programa con 1 semana de buffer.</p>
    </div>

    <!-- LEAD TIMES MATERIALES -->
    ${leadTimeAlerts.length ? `
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <h3 class="text-xs font-bold uppercase text-blue-900 mb-2">⏱️ Lead times de materiales — ORDENA TEMPRANO</h3>
      <table class="w-full text-xs">
        <thead><tr class="text-blue-800"><th class="text-left py-1">Material</th><th class="text-right py-1">Días de espera</th><th class="text-left py-1 pl-3">Ordenar antes del día</th></tr></thead>
        <tbody>
          ${leadTimeAlerts.map(l => `<tr class="border-t border-blue-200"><td class="py-1.5">${l.activity}</td><td class="py-1.5 text-right font-bold">${l.lead_days}d</td><td class="py-1.5 pl-3 text-emerald-700 font-bold">Día 1 del proyecto</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="text-[10px] text-blue-700 mt-2">💡 Ordenar materiales de lead time largo al inicio del proyecto = correr en paralelo con demo/estructura.</p>
    </div>` : ''}

    <!-- CRITICAL PATH NOTES -->
    <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
      <h3 class="text-xs font-bold uppercase text-purple-900 mb-2">📐 Notas de ingeniería (CPM)</h3>
      <ul class="text-xs text-purple-950 space-y-1 list-disc ml-4">
        <li><strong>Ruta crítica:</strong> Demo → Cimentación → Estructura → Rough-in → Inspección → Drywall → Pisos → Cabinets → Countertops (wait 1 sem) → Tile → Trim → Paint → Fixtures → Inspección final</li>
        <li><strong>Exterior</strong> puede correr en paralelo con interior si crew ≥ 4 personas. Tu crew: ${rmState.crewSize}</li>
        <li><strong>Countertops</strong> necesitan template + fabricación (~7-10 días). Programar después de cabinets instalados.</li>
        <li><strong>Drywall</strong> mínimo 3 días de cura entre mud y paint.</li>
        <li><strong>Weather buffer:</strong> Texas primavera (lluvia) +3 días; verano (calor extremo) afecta roofing.</li>
        <li><strong>Cambios de scope (change orders):</strong> agregan típicamente 5-15% al tiempo total. Considera buffer.</li>
      </ul>
    </div>
  `;
}

// ─── TAB: CALIBRACIÓN ───
function rmRenderCalibration(body) {
  body.innerHTML = `
    <h2 class="text-lg font-bold mb-2">🎯 Casas calibradoras (5 proyectos reales)</h2>
    <p class="text-xs text-slate-500 mb-3">Data real de obras finalizadas. Calibra el modelo del estimador.</p>
    <div class="overflow-x-auto border border-slate-200 rounded-lg mb-4">
      <table class="w-full text-xs">
        <thead class="bg-slate-50"><tr><th class="text-left py-2 px-2">Casa</th><th class="text-right py-2 px-2">Sqft</th><th class="text-right py-2 px-2">Materiales</th><th class="text-right py-2 px-2">Mano de Obra</th><th class="text-right py-2 px-2">Horas</th><th class="text-right py-2 px-2">$/h</th><th class="text-right py-2 px-2">Días</th><th class="text-right py-2 px-2">$/sqft total</th></tr></thead>
        <tbody>
          ${rmState.calibrationHouses.map(h => {
            const totalCost = (+h.total_materials||0) + (+h.total_labor||0);
            const ppsf = h.sqft ? totalCost / h.sqft : 0;
            return `<tr class="border-t border-slate-200">
              <td class="py-2 px-2 font-bold">${h.name}</td>
              <td class="py-2 px-2 text-right">${h.sqft}</td>
              <td class="py-2 px-2 text-right text-blue-700">${rmFmt(h.total_materials)}</td>
              <td class="py-2 px-2 text-right text-purple-700">${rmFmt(h.total_labor)}</td>
              <td class="py-2 px-2 text-right">${h.total_hours}h</td>
              <td class="py-2 px-2 text-right">$${(+h.hourly_rate).toFixed(2)}</td>
              <td class="py-2 px-2 text-right">${h.calendar_days || '—'}</td>
              <td class="py-2 px-2 text-right font-bold text-amber-700">$${ppsf.toFixed(0)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="grid md:grid-cols-2 gap-4">
      ${rmState.calibrationHouses.map(h => `
        <div class="bg-white border border-slate-200 rounded-xl p-4">
          <h4 class="font-bold mb-2">${h.name} <span class="text-xs text-slate-500 font-normal">· ${h.sqft} sqft</span></h4>
          <div class="text-[10px] text-slate-500 uppercase font-bold mb-1">Mano de obra por fase</div>
          <table class="w-full text-xs">
            <tbody>
              ${Object.entries(h.phases_labor || {}).map(([k,v]) => `<tr><td class="py-0.5 text-slate-600 capitalize">${k}</td><td class="text-right">${v.hours?.toFixed(0)||0}h</td><td class="text-right text-purple-700">${rmFmt(v.labor_cost)}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="text-[10px] text-slate-500 uppercase font-bold mt-2 mb-1">Materiales por fase</div>
          <table class="w-full text-xs">
            <tbody>
              ${Object.entries(h.phases_materials || {}).map(([k,v]) => `<tr><td class="py-0.5 text-slate-600 capitalize">${k}</td><td class="text-right text-blue-700">${rmFmt(v.cost)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── ACTIVOS DEL PROYECTO: Matterport + scope + audio + planos ───
function rmRenderAssets() {
  // Matterport bloquea iframe (X-Frame-Options). Usar link clickable + thumbnail.
  let matterportPreview = '';
  if (rmState.matterportUrl) {
    const match = rmState.matterportUrl.match(/(?:my\.matterport\.com\/show\/\?m=|matterport\.com\/discover\/space\/)([A-Za-z0-9]+)/);
    const modelId = match ? match[1] : null;
    const cleanUrl = modelId ? `https://my.matterport.com/show/?m=${modelId}` : rmState.matterportUrl;
    matterportPreview = `
      <div class="mt-2 border-2 border-blue-300 rounded-lg p-3 bg-blue-50">
        <div class="flex items-center gap-3">
          <div class="text-4xl">🌐</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-bold text-blue-900">Tour 360° vinculado ✓</div>
            ${modelId ? `<div class="text-[10px] text-slate-500 font-mono">Model ID: ${modelId}</div>` : ''}
            <div class="text-[10px] text-blue-700 truncate">${cleanUrl}</div>
          </div>
          <a href="${cleanUrl}" target="_blank" rel="noopener" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded whitespace-nowrap">🚀 Abrir tour</a>
        </div>
        <p class="text-[10px] text-slate-500 mt-2">⚠️ Matterport bloquea embed inline. Abre en nueva pestaña para medir. Claude SÍ puede analizarlo cuando ejecutes 🤖 IA.</p>
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-xl p-4 border border-slate-200">
      <h3 class="text-xs font-bold text-slate-700 uppercase mb-3">📐 Activos del proyecto (mejoran precisión IA)</h3>

      <!-- Matterport -->
      <div class="mb-4">
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">🌐 Tour 360° Matterport (URL)</label>
        <input value="${rmState.matterportUrl}" oninput="rmState.matterportUrl=this.value" onblur="rmRenderTabPreservingFocus()" placeholder="https://my.matterport.com/show/?m=XXXXX" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        <p class="text-[10px] text-slate-400 mt-0.5">Pega el link y click fuera del campo para preview.</p>
        ${matterportPreview}
      </div>

      <!-- Scope text -->
      <div class="mb-4">
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">📝 Scope del proyecto (texto)</label>
        <textarea oninput="rmState.scopeText=this.value" rows="5" placeholder="Describe qué vas a hacer: 'Cocina completa nueva con cabinets blancos, quartz countertop, backsplash subway. Bañera principal tear out completo con tile floor + walls, vanity doble. Pintar toda la casa, cambiar pisos a LVP roble. Reparar foundation crack en sala...'" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">${rmState.scopeText}</textarea>
        <p class="text-[10px] text-slate-400 mt-0.5">Cuanto más específico, mejor la estimación de IA.</p>
      </div>

      <!-- Audio recorder + upload -->
      <div class="mb-4">
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">🎙️ Audio scope (graba o sube)</label>
        <div class="flex gap-2 items-center">
          <button onclick="rmToggleRecord()" class="${rmState.isRecording?'bg-red-600 animate-pulse':'bg-slate-900'} hover:opacity-80 text-white text-xs font-bold px-3 py-2 rounded">${rmState.isRecording?'⏹ Detener':'🎙️ Grabar'}</button>
          <input type="file" id="rm-audio-upload" accept="audio/*" class="hidden" onchange="rmUploadAudio(this.files[0])" />
          <label for="rm-audio-upload" class="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded cursor-pointer">📁 Subir audio</label>
          ${rmState.scopeAudioPath ? `<button onclick="rmPlayAudio()" class="text-xs bg-blue-600 text-white px-3 py-2 rounded">▶️ Reproducir</button><button onclick="rmTranscribeAudio()" class="text-xs bg-purple-600 text-white px-3 py-2 rounded">📝 Transcribir</button>` : ''}
          ${rmState.scopeAudioPath ? `<span class="text-[10px] text-emerald-700">✓ Audio guardado</span>` : ''}
        </div>
        ${rmState.scopeAudioTranscript ? `<div class="mt-2 bg-slate-50 rounded p-2 text-xs"><strong>Transcripción:</strong> ${rmState.scopeAudioTranscript}</div>` : ''}
      </div>

      <!-- Planos -->
      <div class="mb-4">
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">📐 Planos (PDF / imagen)</label>
        <input type="file" id="rm-plans-upload" accept=".pdf,image/*" multiple class="hidden" onchange="rmUploadFiles(this.files, 'plans')" />
        <label for="rm-plans-upload" class="inline-block text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded cursor-pointer">+ Subir planos</label>
        <div class="mt-2 grid grid-cols-3 gap-2">
          ${rmState.plans.map((p, i) => `
            <div class="bg-slate-50 rounded p-2 text-xs flex items-center justify-between">
              <span class="truncate">${p.type==='pdf'?'📄':'🖼️'} ${p.name}</span>
              <button onclick="rmRemoveAsset('plans', ${i})" class="text-red-600 hover:text-red-800 ml-1">✕</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Fotos -->
      <div>
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">📷 Fotos de la casa (antes)</label>
        <input type="file" id="rm-photos-upload" accept="image/*" multiple class="hidden" onchange="rmUploadFiles(this.files, 'photos')" />
        <label for="rm-photos-upload" class="inline-block text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded cursor-pointer">+ Subir fotos</label>
        <div class="mt-2 grid grid-cols-4 gap-2">
          ${rmState.photos.map((p, i) => `
            <div class="bg-slate-50 rounded p-1 text-xs flex items-center justify-between">
              <span class="truncate">🖼️ ${p.name}</span>
              <button onclick="rmRemoveAsset('photos', ${i})" class="text-red-600 hover:text-red-800 ml-1">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function rmUploadFiles(files, kind) {
  for (const file of files) {
    const userId = state.user?.id || 'anon';
    const path = `${userId}/${Date.now()}_${file.name}`;
    const { error } = await sb.storage.from('remodel-assets').upload(path, file);
    if (error) { alert('Error: ' + error.message); continue; }
    const type = file.type.includes('pdf') ? 'pdf' : 'image';
    rmState[kind].push({ path, name: file.name, type });
  }
  rmRenderTab();
}

async function rmRemoveAsset(kind, idx) {
  const item = rmState[kind][idx];
  if (item?.path) await sb.storage.from('remodel-assets').remove([item.path]);
  rmState[kind].splice(idx, 1);
  rmRenderTab();
}

async function rmToggleRecord() {
  if (rmState.isRecording) {
    rmState.mediaRecorder?.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rmState.audioChunks = [];
    rmState.mediaRecorder = new MediaRecorder(stream);
    rmState.mediaRecorder.ondataavailable = e => rmState.audioChunks.push(e.data);
    rmState.mediaRecorder.onstop = async () => {
      const blob = new Blob(rmState.audioChunks, { type: 'audio/webm' });
      const userId = state.user?.id || 'anon';
      const path = `${userId}/scope_${Date.now()}.webm`;
      const { error } = await sb.storage.from('remodel-assets').upload(path, blob);
      if (error) alert('Error: ' + error.message);
      else rmState.scopeAudioPath = path;
      rmState.isRecording = false;
      stream.getTracks().forEach(t => t.stop());
      rmRenderTab();
    };
    rmState.mediaRecorder.start();
    rmState.isRecording = true;
    rmRenderTab();
  } catch (e) {
    alert('No se pudo acceder al micrófono: ' + e.message);
  }
}

async function rmUploadAudio(file) {
  if (!file) return;
  const userId = state.user?.id || 'anon';
  const path = `${userId}/scope_${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from('remodel-assets').upload(path, file);
  if (error) return alert('Error: ' + error.message);
  rmState.scopeAudioPath = path;
  rmRenderTab();
}

async function rmPlayAudio() {
  const { data } = await sb.storage.from('remodel-assets').createSignedUrl(rmState.scopeAudioPath, 3600);
  if (data?.signedUrl) {
    const audio = new Audio(data.signedUrl);
    audio.play();
  }
}

// Transcripción con Web Speech API (browser local, gratis)
async function rmTranscribeAudio() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    return alert('Tu navegador no soporta transcripción nativa. Sube el audio y escribe el scope manualmente en el textarea.');
  }
  // Browser speech recognition requiere reproducir el audio en vivo — workaround:
  // por ahora, le pedimos al usuario que dicte de nuevo y transcribe en vivo
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recog = new SR();
  recog.lang = 'es-MX';
  recog.continuous = true;
  recog.interimResults = false;
  let finalText = '';
  recog.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      finalText += e.results[i][0].transcript + ' ';
    }
    rmState.scopeAudioTranscript = finalText.trim();
    rmRenderTab();
  };
  recog.onerror = e => alert('Error transcribiendo: ' + e.error);
  recog.start();
  alert('🎙️ Reproduciendo audio y transcribiendo en vivo. Dicta lo que dice el audio o reprodúcelo cerca del mic. Click el botón otra vez para detener.');
  setTimeout(() => recog.stop(), 60000); // máximo 1 min
}

// ============================================================
// SCOPE OF WORK — Generador formato lender (LRC / STX / 04 Rehab)
// ============================================================

// Mapeo: activity_code → categoría SOW estándar de lenders
const RM_SOW_CATEGORIES = [
  { section: 'Soft Costs', items: [
    { sow_name: 'Permits', codes: ['4.2.1'] },
    { sow_name: 'Architectural', codes: [] },
    { sow_name: 'Engineering', codes: ['4.2.2'] },
    { sow_name: 'Legal', codes: [] },
    { sow_name: 'General Contractor Fee', codes: ['4.2.3'] },
    { sow_name: 'Other - Soft Costs', codes: [] }
  ]},
  { section: 'Demo, Foundation', items: [
    { sow_name: 'Demolition', codes: ['1.1.1','1.1.3','1.1.4','1.1.6','1.1.7','1.1.8','1.1.9','1.1.10','1.1.11','1.1.12'] },
    { sow_name: 'Foundation + Driveway', codes: ['2.1.4','2.2.6','2.2.1','2.2.9','2.1.1'] },
    { sow_name: 'Other - Demo', codes: [] }
  ]},
  { section: 'HVAC, Plumbing, Electrical', items: [
    { sow_name: 'HVAC Rough', codes: ['5.5.1h'], pct: 0.6 },
    { sow_name: 'HVAC Trim Out', codes: ['5.5.1h'], pct: 0.4 },
    { sow_name: 'HVAC Service / Repair', codes: ['5.5.2h','hvac_mantenimiento','hvac_reparacion'] },
    { sow_name: 'Electrical Service', codes: ['5.1.5'] },
    { sow_name: 'Electrical Rough', codes: ['5.1.6'] },
    { sow_name: 'Electrical Final / Fixtures', codes: ['5.1.4','5.1.7','5.1.9'] },
    { sow_name: 'Plumbing Rough', codes: ['5.2.1p'], pct: 0.4 },
    { sow_name: 'Plumbing Top Out', codes: ['5.2.1p','5.2.2p'], pct: 0.3 },
    { sow_name: 'Plumbing Final / Fixtures', codes: ['5.2.3p','5.2.4p'] },
    { sow_name: 'Other - Systems', codes: [] }
  ]},
  { section: 'Interior', items: [
    { sow_name: 'Windows', codes: ['3.7.1'] },
    { sow_name: 'Interior Doors', codes: ['5.8.1'] },
    { sow_name: 'Interior Trim', codes: ['5.2.1','5.6.3'] },
    { sow_name: 'Insulation', codes: ['5.1.3','5.2.3'] },
    { sow_name: 'Drywall', codes: ['5.1.1'] },
    { sow_name: 'Interior Paint', codes: ['5.1.2'] },
    { sow_name: 'Tile Flooring', codes: [] },
    { sow_name: 'Carpet', codes: ['5.6.2'] },
    { sow_name: 'Vinyl / Wood Flooring (LVP)', codes: ['5.6.1'] },
    { sow_name: 'Kitchen Countertops', codes: ['5.4.2'] },
    { sow_name: 'Kitchen Cabinets', codes: ['5.4.1','5.4.5'] },
    { sow_name: 'Backsplash', codes: ['5.4.3'] },
    { sow_name: 'Appliances', codes: ['5.4.6','5.4.4'] },
    { sow_name: 'Bathroom Cabinets / Vanity', codes: ['5.3.5'] },
    { sow_name: 'Bathroom Floors / Showers Tile', codes: ['5.3.1','5.3.2'] },
    { sow_name: 'Tubs / Toilets', codes: ['5.3.6'] },
    { sow_name: 'Shower Glass', codes: ['5.3.3'] },
    { sow_name: 'Bathroom Accessories (mirrors, hardware)', codes: ['5.3.4'] },
    { sow_name: 'Closet Shelving', codes: ['5.8.2'] },
    { sow_name: 'Other - Interior', codes: [] }
  ]},
  { section: 'Exterior', items: [
    { sow_name: 'Masonry / Stucco', codes: [] },
    { sow_name: 'Roofing', codes: ['3.1.1','3.1.2'] },
    { sow_name: 'Framing', codes: ['4.1.2','4.1.3','4.1.4','4.1.5'] },
    { sow_name: 'Siding', codes: ['3.4.1','3.16.1'] },
    { sow_name: 'Exterior Paint', codes: ['3.4.3'] },
    { sow_name: 'Exterior Doors', codes: ['3.5.1','3.5.2'] },
    { sow_name: 'Garage Doors', codes: [] },
    { sow_name: 'Driveway / Flatwork', codes: ['3.13.1','3.6.1'] },
    { sow_name: 'Pressure Wash', codes: [] },
    { sow_name: 'Landscaping', codes: ['3.15.1'] },
    { sow_name: 'Decks / Patio', codes: [] },
    { sow_name: 'Rain Gutters', codes: ['3.1.3'] },
    { sow_name: 'Sprinkler System', codes: [] },
    { sow_name: 'Fencing', codes: ['3.14.1'] },
    { sow_name: 'Rough Clean', codes: [] },
    { sow_name: 'Final Clean', codes: ['6.2.3','6.3.1','6.3.2'] },
    { sow_name: 'Other - Exterior', codes: [] }
  ]}
];

const rmSowState = {
  numDraws: 3,
  contingencyPct: 10,
  lenderName: 'STX Capital',
  loanNumber: '',
  borrowerName: '',
  borrowerEmail: '',
  description: '',
  edits: {} // sow_name -> {amount, description, draw1, draw2, draw3}
};

function rmComputeSow() {
  // Mapea actividades del proyecto a categorías SOW
  const projActs = Object.entries(rmState.selectedActivities).map(([code, cfg]) => {
    const cat = RM_CATALOG.find(c => c.code === code);
    if (!cat) return null;
    const total = (+cfg.qty || 0) * (+cfg.vu || cat.vu);
    return { code, desc: cat.desc, total };
  }).filter(Boolean);

  const sections = RM_SOW_CATEGORIES.map(sec => ({
    section: sec.section,
    items: sec.items.map(item => {
      // Suma actividades mapeadas
      let mapped = projActs.filter(pa => item.codes.includes(pa.code));
      let auto = mapped.reduce((s, m) => s + m.total, 0);
      // Algunos items toman solo un % del activity
      if (item.pct) auto = auto * item.pct;
      const editKey = `${sec.section}::${item.sow_name}`;
      const edit = rmSowState.edits[editKey] || {};
      const amount = edit.amount !== undefined ? +edit.amount : auto;
      const description = edit.description !== undefined ? edit.description : mapped.map(m => m.desc).join('; ').slice(0, 200);
      return {
        sow_name: item.sow_name,
        auto, amount, description,
        editKey,
        draws: [edit.draw1 || 0, edit.draw2 || 0, edit.draw3 || 0, edit.draw4 || 0, edit.draw5 || 0]
      };
    })
  }));

  const directTotal = sections.reduce((s, sec) => s + sec.items.reduce((a, i) => a + (+i.amount || 0), 0), 0);
  const contingency = directTotal * (rmSowState.contingencyPct / 100);
  const grandTotal = directTotal + contingency;
  return { sections, directTotal, contingency, grandTotal };
}

function rmSetSowEdit(editKey, field, value) {
  if (!rmSowState.edits[editKey]) rmSowState.edits[editKey] = {};
  rmSowState.edits[editKey][field] = value;
  // Debounced render
  rmRenderTabDebounced();
}

function rmDistributeAutoDraws() {
  // Lógica: Demo + soft + roughs → Draw 1; Drywall+paint+pisos → Draw 2; Finishes+ext+clean → Draw 3
  const drawMap = {
    'Soft Costs': 1, 'Demo, Foundation': 1,
    'HVAC, Plumbing, Electrical': 1,
    'Interior': 2,
    'Exterior': 3
  };
  const sow = rmComputeSow();
  sow.sections.forEach(sec => {
    sec.items.forEach(it => {
      if (it.amount > 0) {
        const targetDraw = drawMap[sec.section] || 2;
        // Algunos items específicos van a draw 3 (finales)
        const lateItems = ['Appliances','Final Clean','Mirrors','Door and Cabinet Handles','Bathroom Accessories (mirrors, hardware)','Shower Glass','Landscaping','Sprinkler System'];
        const draw = lateItems.includes(it.sow_name) ? 3 : targetDraw;
        const editKey = it.editKey;
        if (!rmSowState.edits[editKey]) rmSowState.edits[editKey] = {};
        rmSowState.edits[editKey][`draw${draw}`] = it.amount;
      }
    });
  });
  rmRenderTab();
}

function rmExportSowCSV() {
  const sow = rmComputeSow();
  const lines = [];
  lines.push(`BUDGET FOR A FIX AND FLIP PROJECT — ${rmState.editName}`);
  lines.push('');
  lines.push('PROPERTY INFORMATION - 1ST PART');
  lines.push('Item,Amount,Description');
  lines.push(`Construction Budget,${sow.grandTotal.toFixed(2)},${rmState.editAddress}`);
  lines.push(`Estimated Completion Timeframe,${Math.round((rmCalcProject().totalDays)||0)} days,`);
  lines.push(`Final Square Footage,${rmState.editSqft},`);
  lines.push(`Will you be using a General Contractor,Yes,`);
  lines.push('');
  lines.push(`General Contractor Name,Email,Loan Number`);
  lines.push(`Rental Profitss,${rmSowState.borrowerEmail || 'gerencia@rentalprofitss.com'},${rmSowState.loanNumber}`);
  lines.push('');
  lines.push('BUDGET - 2ND PART');
  const drawCols = Array.from({length: rmSowState.numDraws}, (_, i) => `Draw #${i+1}`).join(',');
  lines.push(`Item,Description,Total Cost,${drawCols}`);
  sow.sections.forEach(sec => {
    lines.push('');
    lines.push(`${sec.section.toUpperCase()},,,`);
    sec.items.forEach(it => {
      if (it.amount === 0 && !it.description) return;
      const draws = it.draws.slice(0, rmSowState.numDraws).map(d => d || '').join(',');
      lines.push(`"${it.sow_name}","${(it.description||'').replace(/"/g,'""')}",${(+it.amount).toFixed(2)},${draws}`);
    });
  });
  lines.push('');
  lines.push(`Contingency (${rmSowState.contingencyPct}%),,${sow.contingency.toFixed(2)},`);
  lines.push(`GRAND TOTAL,,${sow.grandTotal.toFixed(2)},`);
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `SOW_${rmState.editName||'project'}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function rmRenderSow(body) {
  if (!rmState.currentProject && Object.keys(rmState.selectedActivities).length === 0) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">Crea o carga un proyecto en el Editor primero (con actividades). El SOW se genera automáticamente desde tu presupuesto.</div>`;
    return;
  }
  const sow = rmComputeSow();
  const e = rmCalcProject();
  const drawTotals = Array.from({length: rmSowState.numDraws}, () => 0);
  sow.sections.forEach(sec => sec.items.forEach(it => it.draws.forEach((d, i) => { if (i < rmSowState.numDraws) drawTotals[i] += +d || 0; })));

  body.innerHTML = `
    <div class="space-y-4">
      <!-- HEADER PROYECTO -->
      <div class="bg-white rounded-xl p-4 border border-slate-200">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-bold">📋 Scope of Work — ${rmState.editName || 'Sin nombre'}</h2>
            <p class="text-xs text-slate-500">Generado automáticamente desde el presupuesto. Edita lo que necesites antes de exportar.</p>
          </div>
          <div class="flex gap-2">
            <button onclick="rmDistributeAutoDraws()" class="bg-slate-100 hover:bg-slate-200 text-xs font-bold px-3 py-2 rounded">⚡ Auto-distribuir Draws</button>
            <button onclick="rmExportSowCSV()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded">⬇️ Exportar CSV (Lender)</button>
          </div>
        </div>
      </div>

      <!-- INFO LENDER -->
      <div class="bg-white rounded-xl p-4 border border-slate-200">
        <h3 class="text-xs font-bold uppercase text-slate-700 mb-2">Información del préstamo</h3>
        <div class="grid grid-cols-4 gap-2">
          <div><label class="block text-[10px] text-slate-500 mb-0.5">Lender</label><input value="${rmSowState.lenderName}" oninput="rmSowState.lenderName=this.value" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div><label class="block text-[10px] text-slate-500 mb-0.5">Loan #</label><input value="${rmSowState.loanNumber}" oninput="rmSowState.loanNumber=this.value" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div><label class="block text-[10px] text-slate-500 mb-0.5"># Draws</label><input type="number" min="1" max="5" value="${rmSowState.numDraws}" oninput="rmSowState.numDraws=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div><label class="block text-[10px] text-slate-500 mb-0.5">Contingency %</label><input type="number" value="${rmSowState.contingencyPct}" oninput="rmSowState.contingencyPct=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div class="col-span-2"><label class="block text-[10px] text-slate-500 mb-0.5">Borrower Name</label><input value="${rmSowState.borrowerName}" oninput="rmSowState.borrowerName=this.value" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div class="col-span-2"><label class="block text-[10px] text-slate-500 mb-0.5">Borrower Email</label><input value="${rmSowState.borrowerEmail}" oninput="rmSowState.borrowerEmail=this.value" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div class="col-span-4"><label class="block text-[10px] text-slate-500 mb-0.5">Description of Work (overview general)</label><textarea oninput="rmSowState.description=this.value" rows="2" placeholder="Full remodel: new kitchen, 2 bathrooms, paint, flooring, exterior refresh..." class="w-full border border-slate-300 rounded px-2 py-1 text-sm">${rmSowState.description}</textarea></div>
        </div>
      </div>

      <!-- SOW TABLE -->
      ${sow.sections.map(sec => `
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div class="bg-slate-100 px-3 py-2 font-bold text-sm">${sec.section}</div>
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left py-1.5 px-2 w-1/4">Item</th>
                <th class="text-left py-1.5 px-2">Description / Specification</th>
                <th class="text-right py-1.5 px-2 w-24">Total</th>
                ${Array.from({length: rmSowState.numDraws}, (_, i) => `<th class="text-right py-1.5 px-2 w-20">Draw #${i+1}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${sec.items.map(it => {
                const sum = it.draws.slice(0, rmSowState.numDraws).reduce((a,b)=>a+(+b||0),0);
                const mismatch = it.amount > 0 && Math.abs(sum - it.amount) > 1;
                return `<tr class="border-t border-slate-100 ${it.amount>0?'':'opacity-60'}">
                  <td class="py-1 px-2 font-semibold">${it.sow_name}</td>
                  <td class="py-1 px-2"><input value="${(it.description||'').replace(/"/g,'&quot;')}" oninput="rmSetSowEdit('${it.editKey}','description',this.value)" class="w-full border border-slate-200 rounded px-2 py-1 text-xs" placeholder="${it.auto>0?'auto: '+it.description:'-'}" /></td>
                  <td class="py-1 px-2 text-right"><input type="number" value="${it.amount||''}" oninput="rmSetSowEdit('${it.editKey}','amount',this.value)" class="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right font-bold" placeholder="${it.auto?'auto: '+Math.round(it.auto):'0'}" /></td>
                  ${it.draws.slice(0, rmSowState.numDraws).map((d, i) => `<td class="py-1 px-2 text-right"><input type="number" value="${d||''}" oninput="rmSetSowEdit('${it.editKey}','draw${i+1}',this.value)" class="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right ${mismatch?'border-red-400':''}" /></td>`).join('')}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}

      <!-- TOTALES -->
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <h3 class="text-xs font-bold uppercase text-slate-400 mb-3">Totales</h3>
        <table class="w-full text-sm">
          <tbody>
            <tr class="border-b border-slate-700"><td class="py-2">Subtotal directo</td><td class="py-2 text-right">${rmFmt(sow.directTotal)}</td></tr>
            <tr class="border-b border-slate-700"><td class="py-2">Contingency (${rmSowState.contingencyPct}%)</td><td class="py-2 text-right text-amber-300">${rmFmt(sow.contingency)}</td></tr>
            <tr class="font-bold text-amber-400"><td class="py-2 text-lg">GRAND TOTAL</td><td class="py-2 text-right text-lg">${rmFmt(sow.grandTotal)}</td></tr>
          </tbody>
        </table>
        <div class="mt-3 pt-3 border-t border-slate-700 grid grid-cols-${rmSowState.numDraws+1} gap-2 text-xs">
          ${drawTotals.map((d, i) => `<div class="bg-slate-800 rounded p-2"><div class="text-[10px] text-slate-400 uppercase">Draw #${i+1}</div><div class="font-bold">${rmFmt(d)}</div></div>`).join('')}
          <div class="bg-emerald-900/50 rounded p-2"><div class="text-[10px] text-emerald-300 uppercase">Distribuido</div><div class="font-bold ${Math.abs(drawTotals.reduce((a,b)=>a+b,0) - sow.directTotal) > 1 ? 'text-red-400':'text-emerald-400'}">${rmFmt(drawTotals.reduce((a,b)=>a+b,0))} / ${rmFmt(sow.directTotal)}</div></div>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-950">
        <strong>💡 Cómo funciona:</strong>
        <ul class="mt-1 ml-4 list-disc space-y-0.5">
          <li>Los <strong>montos auto-calculados</strong> vienen de las actividades de tu proyecto (mapeo de 60+ códigos del catálogo a categorías SOW del lender)</li>
          <li>Puedes <strong>editar cualquier valor</strong>: monto, descripción, distribución de draws</li>
          <li>Click <strong>"⚡ Auto-distribuir Draws"</strong> para llenar automáticamente Draw #1 (demo+rough), #2 (interior), #3 (finishes+exterior)</li>
          <li>Click <strong>"⬇️ Exportar CSV"</strong> genera archivo en formato LRC standard que puedes copiar/pegar al template del lender</li>
          <li>Soporta formatos: LRC Generic, STX Capital, 04 Rehab Budget</li>
        </ul>
      </div>
    </div>
  `;
}
