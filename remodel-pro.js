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
  tracking: {}, // phase -> {pct, real, status} (vista Seguimiento)
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
  audioChunks: [],
  // QW3 — Buscador de catálogo
  catalogFilter: '',
  // QW4 — Tags
  editTags: [],
  projectTagFilter: '',
  // S1-G1 — Seguimiento granular
  seguimientoView: 'fase', // 'fase' | 'actividad'
  actualsByCode: {}, // code -> {real_cost, real_days, real_hours, real_materials_cost, real_labor_cost, notes, id?}
  // S1-G2 — Versionado + Change Orders
  versions: [], // remodel_budget_versions del proyecto cargado
  changeOrders: [], // remodel_change_orders del proyecto cargado
  // S2-G5 — Suppliers + precios
  suppliers: [],
  priceSummary: {}, // indexado por activity_code
  // S2-G4 — UI catálogo
  catalogEditView: 'list', // 'list' | 'new'
  catalogNew: { code:'', phase:'5', subcat:'', description:'', unit:'unit', vu_default:0, mat_pct:0.5, days_per_qty:1, active:true },
  // S3-G3 — CPM toggle (off por default para no romper cronogramas existentes)
  cpmMode: false,
  // S4-G6 — Crew
  crew: [],
  crewCapacity: [],
  crewAssignments: [], // del proyecto cargado
  // S4-G10 — Vista campo (mobile)
  fieldQuickActivity: null, // code de la actividad expandida en mobile view
  // S5-G8 — Vendor invoices
  invoices: [],
  // S5-G9 — IA chat agente
  aiChatLog: [], // [{role: 'user'|'assistant'|'tool', content, tools?}]
  aiChatInput: '',
  aiChatBusy: false
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

// ─── S2-G4: Catálogo dinámico (DB con fallback al hardcoded RM_CATALOG) ───
// rmActiveCatalog se setea desde DB en rmLoadCatalog(). Si null → usar RM_CATALOG hardcodeado.
let rmActiveCatalog = null;
function rmGetCatalog() { return rmActiveCatalog || RM_CATALOG; }

async function rmLoadCatalog() {
  try {
    const { data, error } = await sb
      .from('remodel_catalog_items')
      .select('*')
      .eq('active', true)
      .order('code');
    if (error) { console.warn('rmLoadCatalog falló, uso hardcoded:', error.message); return; }
    if (!data || data.length === 0) { console.info('Catálogo DB vacío, uso hardcoded'); return; }
    // Normalizar al shape esperado por el resto del código (desc/vu en vez de description/vu_default)
    rmActiveCatalog = data.map(r => ({
      code: r.code,
      phase: r.phase,
      subcat: r.subcat,
      desc: r.description,
      unit: r.unit,
      vu: +r.vu_default || 0,
      mat_pct: +r.mat_pct || 0.5,
      days_per_qty: +r.days_per_qty || 0,
      multiplicable: !!r.multiplicable,
      depends_on: r.depends_on || [],
      is_seed: !!r.is_seed,
      _dbId: r.code // marcador para distinguir DB vs hardcoded
    }));
  } catch (e) { console.error('rmLoadCatalog error:', e); }
}

// ─── S1-G1: Mapeo activity_code → stage_key (para alimentar remodel_dynamic_benchmarks) ───
// Excepciones de mapeo (codes que no siguen el prefijo de fase de forma trivial)
const RM_CODE_TO_STAGE = {
  // Fase 2 — Cimentación → estructura (no hay stage_key 'cimentacion')
  '2.1.4':'estructura','2.2.6':'estructura','2.2.1':'estructura','2.1.1':'estructura','2.2.9':'estructura',
  // Fase 3 — Exterior (sub-mapeo)
  '3.1.1':'techo','3.1.2':'techo','3.1.3':'exteriores',
  '3.4.3':'pintura_ext',
  '3.4.1':'exteriores','3.5.1':'exteriores','3.5.2':'exteriores','3.6.1':'exteriores',
  '3.13.1':'exteriores','3.14.1':'exteriores','3.15.1':'exteriores','3.7.1':'exteriores','3.16.1':'exteriores',
  // Fase 4 — Estructura + soft costs (excluidos del modelo)
  '4.1.2':'estructura','4.1.3':'estructura','4.1.4':'estructura','4.1.5':'estructura',
  '4.2.1':null,'4.2.2':null,'4.2.3':null,
  // Fase 5 — Interior (sub-mapeo grande)
  '5.1.1':'drywall','5.1.2':'pintura_int','5.1.3':'aislamiento',
  '5.2.1':'trim','5.2.3':'aislamiento',
  '5.3.1':'banos','5.3.2':'banos','5.3.3':'banos','5.3.4':'banos','5.3.5':'banos','5.3.6':'banos',
  '5.4.1':'cocina','5.4.2':'cocina','5.4.3':'cocina','5.4.4':'cocina','5.4.5':'cocina','5.4.6':'cocina',
  '5.6.1':'pisos','5.6.2':'pisos','5.6.3':'trim',
  '5.8.1':'trim','5.8.2':'trim',
  '5.1.4':'electricidad','5.1.5':'electricidad','5.1.6':'electricidad','5.1.7':'electricidad','5.1.9':'electricidad',
  '5.2.1p':'plomeria','5.2.2p':'plomeria','5.2.3p':'plomeria','5.2.4p':'plomeria',
  '5.5.1h':'hvac','5.5.2h':'hvac'
};

function rmActivityToStageKey(code) {
  if (!code) return null;
  if (code in RM_CODE_TO_STAGE) return RM_CODE_TO_STAGE[code];
  // Fallback por prefijo de fase
  const first = String(code).charAt(0);
  if (first === '1') return 'demolicion';
  if (first === '2') return 'estructura';
  if (first === '3') return 'exteriores';
  if (first === '4') return 'estructura';
  if (first === '5') return 'trim'; // default seguro para interior
  if (first === '6') return 'limpieza_final';
  return null;
}

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

// ─── AUTO-FILL TEMPLATES: para cada tipo, qué actividades incluir + cantidades por sqft ───
// El equipo elige el tipo, ingresa sqft, y el editor se llena con cantidades realistas.
// `qty` = fijo · `f(s)` = función del sqft (devuelve cantidad)
const RM_AUTOFILL_TEMPLATES = {
  lipstick: {
    label: '✨ Lipstick',
    desc: 'Pintura + fixtures + clean. Refresh barato para vender rápido.',
    activities: {
      '5.1.2': { f: s => s * 3 },       // interior paint ~3× sqft (paredes + techos)
      '5.1.7': { qty: 1 },              // light fixtures + ceiling fans
      '5.2.4p': { qty: 1 },             // plumbing fixtures finales
      '6.1.1': { qty: 1 },              // touch-up
      '6.2.3': { qty: 1 },              // move-in deep clean
      '6.3.2': { qty: 1 },              // deep cleaning
      '4.2.1': { qty: 1 },              // permits
    }
  },
  light: {
    label: '🖌️ Cosmético Ligero',
    desc: 'Pintura + pisos + repairs + fixtures básicos. Sin tocar cocina ni baños.',
    activities: {
      '1.1.6': { f: s => s * 0.3 },     // drywall removal parcial
      '1.1.9': { f: s => Math.max(1, Math.ceil(s/800)) }, // dumpster (1 cada 800 sqft)
      '5.1.1': { f: s => s * 0.3 },     // drywall install parcial
      '5.1.2': { f: s => s * 3 },       // interior paint
      '5.6.1': { f: s => s },           // LVP toda la casa
      '5.6.3': { f: s => s * 0.4 },     // baseboards
      '5.1.7': { qty: 1 },              // light fixtures
      '5.2.4p': { qty: 1 },             // plumbing fixtures
      '6.1.1': { qty: 1 },              // touch-up
      '6.3.1': { f: s => s },           // construction cleanup
      '4.2.1': { qty: 1 },              // permits
    }
  },
  heavy: {
    label: '🔧 Cosmético Pesado',
    desc: 'Cocina O baños + acabados generales. Asume 2 baños.',
    activities: {
      // Demo
      '1.1.1': { f: s => s * 0.6 },     // floor demo parcial
      '1.1.3': { qty: 1 },              // kitchen tearout
      '1.1.4': { qty: 2 },              // bathroom tearout (2 baños)
      '1.1.6': { f: s => s * 0.6 },     // drywall removal
      '1.1.9': { f: s => Math.max(1, Math.ceil(s/600)) }, // dumpsters
      // Interior
      '5.1.1': { f: s => s * 0.6 },     // drywall install
      '5.1.2': { f: s => s * 3 },       // interior paint
      '5.1.3': { f: s => s * 0.6 },     // wall insulation
      '5.6.1': { f: s => s * 0.75 },    // LVP (no en baños)
      '5.6.3': { f: s => s * 0.4 },     // baseboards
      '5.8.1': { f: s => Math.max(3, Math.ceil(s/300)) }, // interior doors
      // Cocina
      '5.4.1': { qty: 20 },             // cabinets 20 lin_ft típico
      '5.4.2': { qty: 35 },             // quartz countertops 35 sqft
      '5.4.3': { qty: 30 },             // backsplash
      '5.4.4': { qty: 1 },              // sink + faucet
      '5.4.6': { qty: 1 },              // appliances set
      // Baños (2)
      '5.3.1': { qty: 200 },            // bathroom tile ~100 sqft × 2
      '5.3.5': { qty: 2 },              // vanity × 2
      '5.3.6': { qty: 2 },              // toilet × 2
      '5.3.4': { qty: 2 },              // accessories × 2
      // Eléctrica + plomería final
      '5.1.4': { qty: 1 },              // outlets
      '5.1.7': { qty: 1 },              // light fixtures
      '5.1.9': { qty: 1 },              // smoke detectors
      '5.2.4p': { qty: 1 },             // plumbing fixtures
      // Permits + cierre
      '4.2.1': { qty: 1 },
      '4.2.2': { qty: 1 },              // architect/engineer
      '6.1.1': { qty: 1 },
      '6.2.1': { qty: 1 },
      '6.2.2': { qty: 1 },              // city inspection
      '6.3.1': { f: s => s },           // cleanup
    }
  },
  full: {
    label: '🔨 Renovación Total',
    desc: 'Cocina + baños + sistemas + acabados. Sin demo a studs.',
    activities: {
      // Demo completa
      '1.1.1': { f: s => s },
      '1.1.3': { qty: 1 },
      '1.1.4': { qty: 2 },
      '1.1.6': { f: s => s },
      '1.1.9': { f: s => Math.max(2, Math.ceil(s/500)) },
      '1.1.10': { qty: 1 },
      // Sistemas completos
      '5.1.5': { qty: 1 },              // panel upgrade
      '5.1.6': { qty: 1 },              // rewire
      '5.2.1p': { qty: 1 },             // repipe
      '5.2.3p': { qty: 1 },             // water heater
      '5.5.1h': { qty: 1 },             // HVAC
      // Interior
      '5.1.1': { f: s => s },           // drywall install
      '5.1.2': { f: s => s * 3 },       // paint
      '5.1.3': { f: s => s },           // wall insulation
      '5.2.3': { f: s => s },           // attic insulation
      '5.6.1': { f: s => s * 0.75 },    // LVP
      '5.6.3': { f: s => s * 0.4 },     // baseboards
      '5.8.1': { f: s => Math.max(4, Math.ceil(s/250)) }, // interior doors
      // Cocina full
      '5.4.1': { qty: 25 },
      '5.4.2': { qty: 40 },
      '5.4.3': { qty: 35 },
      '5.4.4': { qty: 1 },
      '5.4.6': { qty: 1 },
      // Baños full (2)
      '5.3.1': { qty: 200 },
      '5.3.2': { qty: 2 },              // custom showers
      '5.3.5': { qty: 2 },
      '5.3.6': { qty: 2 },
      '5.3.4': { qty: 2 },
      // Eléctrica final
      '5.1.4': { qty: 1 },
      '5.1.7': { qty: 1 },
      '5.1.9': { qty: 1 },
      // Exterior básico
      '3.4.3': { qty: 1 },              // exterior paint
      // Soft + cierre
      '4.2.1': { qty: 1 },
      '4.2.2': { qty: 1 },
      '6.1.1': { qty: 1 },
      '6.2.1': { qty: 1 },
      '6.2.2': { qty: 1 },
      '6.3.1': { f: s => s },
      '6.3.2': { qty: 1 },
    }
  },
  gut: {
    label: '⛏️ Gut Renovation',
    desc: 'Demolición a studs + framing + replanteo total + exterior.',
    activities: {
      // Demo total
      '1.1.1': { f: s => s },
      '1.1.3': { qty: 1 },
      '1.1.4': { qty: 2 },
      '1.1.6': { f: s => s * 1.2 },     // todas las paredes
      '1.1.8': { f: s => s * 0.1 },     // wall removal (paredes load-bearing)
      '1.1.9': { f: s => Math.max(3, Math.ceil(s/400)) },
      '1.1.10': { qty: 1 },
      // Framing nuevo
      '4.1.2': { f: s => s },           // wood framing
      '4.1.3': { qty: 1 },              // steel beam
      '4.1.5': { f: s => s * 0.5 },     // sub-floor
      // Cimentación check
      '2.1.1': { qty: 1 },              // foundation eval
      // Sistemas nuevos
      '5.1.5': { qty: 1 },
      '5.1.6': { qty: 1 },
      '5.2.1p': { qty: 1 },
      '5.2.2p': { qty: 1 },             // sewer line
      '5.2.3p': { qty: 1 },
      '5.5.1h': { qty: 1 },
      // Interior
      '5.1.1': { f: s => s * 1.2 },
      '5.1.2': { f: s => s * 3 },
      '5.1.3': { f: s => s * 1.2 },
      '5.2.3': { f: s => s },
      '5.6.1': { f: s => s * 0.75 },
      '5.6.3': { f: s => s * 0.4 },
      '5.8.1': { f: s => Math.max(5, Math.ceil(s/250)) },
      // Cocina premium
      '5.4.1': { qty: 30 },
      '5.4.2': { qty: 45 },
      '5.4.3': { qty: 40 },
      '5.4.4': { qty: 1 },
      '5.4.5': { qty: 1 },              // kitchen island
      '5.4.6': { qty: 1 },
      // Baños premium
      '5.3.1': { qty: 250 },
      '5.3.2': { qty: 2 },
      '5.3.3': { qty: 2 },              // glass enclosure
      '5.3.5': { qty: 2 },
      '5.3.6': { qty: 2 },
      '5.3.4': { qty: 2 },
      // Eléctrica
      '5.1.4': { qty: 1 },
      '5.1.7': { qty: 1 },
      '5.1.9': { qty: 1 },
      '5.2.4p': { qty: 1 },
      // Exterior renovado
      '3.1.1': { qty: 1 },              // roof replacement
      '3.4.3': { qty: 1 },              // exterior paint
      '3.7.1': { qty: 1 },              // windows
      '3.5.1': { qty: 1 },              // front door
      // Soft + cierre
      '4.2.1': { qty: 1 },
      '4.2.2': { qty: 1 },
      '6.1.1': { qty: 1 },
      '6.2.1': { qty: 1 },
      '6.2.2': { qty: 1 },
      '6.3.1': { f: s => s },
      '6.3.2': { qty: 1 },
    }
  }
};

// Aplica un template auto-llenando rmState.selectedActivities con cantidades calculadas
function rmAutoFillEditor(typeKey) {
  const template = RM_AUTOFILL_TEMPLATES[typeKey];
  if (!template) return alert('Template no encontrado');

  const sqft = +rmState.editSqft || 1500;
  if (sqft < 200) {
    if (!confirm(`Tu sqft está en ${sqft}. Las cantidades van a ser muy chicas. ¿Continuamos igual?`)) return;
  }

  const cat = rmGetCatalog();
  const existingCount = Object.keys(rmState.selectedActivities).length;
  if (existingCount > 0) {
    if (!confirm(`¿Reemplazar las ${existingCount} actividades actuales con el template "${template.label}"?\n\nSqft: ${sqft}\nTipo: ${template.label}\n\nTip: después podés ajustar cualquier cantidad o quitar lo que no aplique.`)) return;
  }

  const newSelected = {};
  let skipped = [];
  Object.entries(template.activities).forEach(([code, rule]) => {
    const catItem = cat.find(c => c.code === code);
    if (!catItem) { skipped.push(code); return; }

    let qty;
    if (rule.qty != null) qty = rule.qty;
    else if (typeof rule.f === 'function') {
      try { qty = rule.f(sqft); } catch { qty = 1; }
    } else qty = 1;

    qty = Math.max(0.1, Math.round(qty * 10) / 10);
    const days = Math.max(1, Math.ceil(qty * (catItem.days_per_qty || 0)));

    newSelected[code] = {
      qty,
      vu: catItem.vu,
      days,
      start_offset: 0
    };
  });

  rmState.selectedActivities = newSelected;
  rmState.remodelType = typeKey;
  rmRenderTab();

  const e = rmCalcProject();
  setTimeout(() => {
    alert(`✅ Auto-llenado completo\n\n• ${Object.keys(newSelected).length} actividades agregadas (template ${template.label})\n• Sqft usado: ${sqft}\n• Costo directo estimado: $${Math.round(e.totals.total).toLocaleString()}\n• Precio cliente sugerido: $${Math.round(e.pricing.clientPrice).toLocaleString()}\n• Duración estimada: ${e.totalDays} días\n${skipped.length?'\n⚠️ '+skipped.length+' codes del template no están en el catálogo: '+skipped.slice(0,5).join(', ')+'\n':''}\nAhora revisá la lista, ajustá cantidades y quitá lo que no aplique a esta casa.`);
  }, 100);
}

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

// ─── S3-G3 · CPM (Critical Path Method) ───
// Computa ES/EF/LS/LF/slack/critical para cada actividad seleccionada.
// activities: [{code, days, ...}]
// Returns: { byCode: {code: {es, ef, ls, lf, slack, critical, duration, deps[]}}, totalDays, criticalPath: [codes], error? }
function rmComputeCPM(activities) {
  if (!activities || activities.length === 0) {
    return { byCode: {}, totalDays: 0, criticalPath: [], error: null };
  }
  const cat = rmGetCatalog();
  const selectedCodes = new Set(activities.map(a => a.code));

  // Build nodes
  const byCode = {};
  activities.forEach(a => {
    const catItem = cat.find(c => c.code === a.code);
    const allDeps = (catItem?.depends_on) || [];
    // Solo deps que están en las actividades seleccionadas del proyecto
    const deps = allDeps.filter(d => selectedCodes.has(d));
    byCode[a.code] = {
      code: a.code,
      duration: +a.days || 0,
      deps,
      successors: []
    };
  });
  // Build successors
  Object.values(byCode).forEach(n => {
    n.deps.forEach(d => { if (byCode[d]) byCode[d].successors.push(n.code); });
  });

  // Topological sort (Kahn)
  const inDegree = {};
  Object.keys(byCode).forEach(c => { inDegree[c] = byCode[c].deps.length; });
  const queue = Object.keys(byCode).filter(c => inDegree[c] === 0);
  const topo = [];
  while (queue.length) {
    const c = queue.shift();
    topo.push(c);
    byCode[c].successors.forEach(s => {
      inDegree[s]--;
      if (inDegree[s] === 0) queue.push(s);
    });
  }
  if (topo.length !== Object.keys(byCode).length) {
    return { byCode: {}, totalDays: 0, criticalPath: [], error: 'Ciclo detectado en dependencias' };
  }

  // Forward pass: ES, EF
  topo.forEach(c => {
    const n = byCode[c];
    n.es = n.deps.length === 0 ? 0 : Math.max(0, ...n.deps.map(d => byCode[d].ef));
    n.ef = n.es + n.duration;
  });
  const totalDays = Math.max(0, ...Object.values(byCode).map(n => n.ef));

  // Backward pass: LF, LS, slack
  [...topo].reverse().forEach(c => {
    const n = byCode[c];
    n.lf = n.successors.length === 0 ? totalDays : Math.min(...n.successors.map(s => byCode[s].ls));
    n.ls = n.lf - n.duration;
    n.slack = n.ls - n.es;
    n.critical = Math.abs(n.slack) < 0.001 && n.duration > 0;
  });

  const criticalPath = topo.filter(c => byCode[c].critical);
  return { byCode, totalDays, criticalPath, error: null };
}

// ─── CÁLCULO ───
function rmCalcProject() {
  const activities = Object.entries(rmState.selectedActivities).map(([code, cfg]) => {
    const cat = rmGetCatalog().find(c => c.code === code);
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

  // S3-G3: CPM (siempre se computa; se usa en Gantt si cpmMode=true)
  const cpm = rmComputeCPM(activities);

  return {
    activities, byPhase, totals, phaseSchedule, totalDays,
    cpm,
    sqft: rmState.editSqft, ppsf: rmState.editSqft ? totals.total / rmState.editSqft : 0,
    pricing: { directCost, contingency, overhead, softCosts, internalCost, markup, clientPrice, profit, profitMarginPct }
  };
}

// ─── DB ───
async function rmLoadAll() {
  const [{ data: projects }, { data: houses }, dyn] = await Promise.all([
    sb.from('remodel_projects').select('*').order('updated_at', { ascending: false }),
    sb.from('remodel_calibration_houses').select('*').order('name'),
    sb.from('remodel_dynamic_benchmarks').select('*').then(r => r.data || []).catch(() => []),
    rmLoadCatalog(),           // S2-G4
    rmLoadSuppliers(),         // S2-G5
    rmLoadCrew()               // S4-G6
  ]);
  rmState.projects = projects || [];
  rmState.calibrationHouses = houses || [];
  rmDynamicBenchmarks = {};
  (dyn || []).forEach(d => { rmDynamicBenchmarks[d.stage_key] = d; });
}

// S4-G6: Cargar crew + capacity
async function rmLoadCrew() {
  try {
    const [c, cap] = await Promise.all([
      sb.from('remodel_crew').select('*').eq('active', true).order('name'),
      sb.from('remodel_crew_capacity').select('*').then(r => r.data || []).catch(() => [])
    ]);
    rmState.crew = c.data || [];
    rmState.crewCapacity = cap || [];
  } catch (e) {
    console.warn('rmLoadCrew falló:', e);
    rmState.crew = []; rmState.crewCapacity = [];
  }
}

async function rmLoadCrewAssignments(projectId) {
  if (!projectId) { rmState.crewAssignments = []; return; }
  const { data } = await sb
    .from('remodel_crew_assignments')
    .select('*, remodel_crew(name, hourly_rate)')
    .eq('project_id', projectId);
  rmState.crewAssignments = data || [];
}

// S5-G8: Load invoices del proyecto
async function rmLoadInvoices(projectId) {
  if (!projectId) { rmState.invoices = []; return; }
  const { data } = await sb
    .from('remodel_vendor_invoices')
    .select('*, remodel_suppliers(name)')
    .eq('project_id', projectId)
    .order('invoice_date', { ascending: false });
  rmState.invoices = data || [];
}

async function rmUploadInvoice(file) {
  if (!rmState.currentProject?.id) return alert('Cargá un proyecto primero.');
  if (!file) return;
  const userId = state.user?.id || 'anon';
  const path = `${userId}/${rmState.currentProject.id}/invoices/${Date.now()}_${file.name}`;
  const { error: upErr } = await sb.storage.from('remodel-assets').upload(path, file);
  if (upErr) return alert('Error subiendo: ' + upErr.message);

  const supplierName = prompt('Supplier (nombre, debe existir en tu lista):', '');
  const supplier = rmState.suppliers.find(s => (s.name||'').toLowerCase() === (supplierName||'').toLowerCase());
  const invoiceNumber = prompt('# Factura:', '') || null;
  const totalStr = prompt('Total $ (incluye tax):', '0');
  const total_amount = parseFloat(totalStr) || 0;
  const taxStr = prompt('Tax $ (opcional):', '0');
  const tax_amount = parseFloat(taxStr) || 0;
  const activityCode = prompt('Activity code asociado (opcional):', '') || null;

  const { error } = await sb.from('remodel_vendor_invoices').insert({
    project_id: rmState.currentProject.id,
    supplier_id: supplier?.id || null,
    activity_code: activityCode,
    invoice_number: invoiceNumber,
    invoice_date: new Date().toISOString().split('T')[0],
    pdf_path: path,
    total_amount, tax_amount,
    status: 'pending',
    uploaded_by: state.user?.id || null
  });
  if (error) return alert('Error guardando metadata: ' + error.message);
  await rmLoadInvoices(rmState.currentProject.id);
  alert('✓ Factura subida ($' + total_amount + ')');
  rmRenderTab();
}

async function rmReconcileInvoice(invoiceId) {
  const inv = rmState.invoices.find(i => i.id === invoiceId);
  if (!inv) return;
  if (!inv.activity_code) {
    const code = prompt('Asociar a qué activity_code? (ej: 5.4.2)', '');
    if (!code) return;
    await sb.from('remodel_vendor_invoices').update({ activity_code: code }).eq('id', invoiceId);
    inv.activity_code = code;
  }
  // Sumar el invoice al real_cost de la actividad
  const existing = rmState.actualsByCode[inv.activity_code] || {};
  const newReal = (+existing.real_cost || 0) + (+inv.total_amount);
  if (!confirm(`Reconciliar factura de $${inv.total_amount} contra ${inv.activity_code}\n\nReal cost actual: $${existing.real_cost||0}\nNuevo real cost: $${newReal}\n\n¿Confirmar?`)) return;
  rmState.actualsByCode[inv.activity_code] = { ...existing, real_cost: newReal };
  await rmSaveActuals();
  await sb.from('remodel_vendor_invoices').update({ status: 'reconciled' }).eq('id', invoiceId);
  await rmLoadInvoices(rmState.currentProject.id);
  rmRenderTab();
}

async function rmViewInvoicePDF(path) {
  const { data } = await sb.storage.from('remodel-assets').createSignedUrl(path, 600);
  if (data?.signedUrl) window.open(data.signedUrl, '_blank');
}

// ============================================================
// S5-G9 · IA AGENTE (Claude function calling)
// ============================================================

// Construye contexto compacto del proyecto para el agente
function rmBuildAgentContext() {
  const e = rmCalcProject();
  const cat = rmGetCatalog().map(c => ({ code: c.code, phase: c.phase, desc: c.desc, unit: c.unit, vu_default: c.vu, mat_pct: c.mat_pct }));
  const suppliers = rmState.suppliers.map(s => ({ name: s.name, type: s.type, preferred: s.preferred }));
  const benchmarks = RM_STAGE_BENCHMARKS.map(s => ({ key: s.key, name: s.name, avg_psf: s.avg }));
  return {
    project: {
      name: rmState.editName, address: rmState.editAddress, sqft: rmState.editSqft,
      start_date: rmState.editStartDate, total_activities: e.activities.length,
      total_days: e.totalDays, total_direct_cost: Math.round(e.totals.total),
      client_price: Math.round(e.pricing.clientPrice),
      profit_margin_pct: +e.pricing.profitMarginPct.toFixed(1)
    },
    selected_activities: e.activities.map(a => ({ code: a.code, desc: a.desc, qty: a.qty, vu: a.vu, total: Math.round(a.total) })),
    catalog_count: cat.length,
    catalog_sample: cat.slice(0, 20),  // mando solo sample pa no saturar
    suppliers,
    benchmarks_psf: benchmarks,
    portfolio_avg_psf: RM_PORTFOLIO_TOTAL_PSF,
    market_austin: { min: RM_MARKET_AUSTIN_MIN, max: RM_MARKET_AUSTIN_MAX }
  };
}

// Ejecuta una tool call de Claude en el frontend, devuelve resultado serializable
async function rmAgentExecuteTool(toolName, input) {
  try {
    if (toolName === 'add_activity_to_project') {
      const cat = rmGetCatalog().find(c => c.code === input.code);
      if (!cat) return { ok: false, error: `Code ${input.code} no existe en catálogo` };
      rmState.selectedActivities[input.code] = {
        qty: +input.qty || 1,
        vu: +input.vu_override || cat.vu,
        days: Math.max(1, Math.ceil((+input.qty || 1) * (cat.days_per_qty || 0))),
        start_offset: 0
      };
      return { ok: true, message: `Agregado ${input.code} (${cat.desc}), qty ${input.qty} ${cat.unit}, total $${Math.round((+input.qty || 1) * (+input.vu_override || cat.vu))}` };
    }
    if (toolName === 'update_activity_qty') {
      const sel = rmState.selectedActivities[input.code];
      if (!sel) return { ok: false, error: `Code ${input.code} no está en el proyecto. Usá add_activity_to_project.` };
      sel.qty = +input.qty;
      const cat = rmGetCatalog().find(c => c.code === input.code);
      sel.days = Math.max(1, Math.ceil((+input.qty || 0) * (cat?.days_per_qty || 0)));
      return { ok: true, message: `Actualizado ${input.code} a qty ${input.qty}` };
    }
    if (toolName === 'remove_activity') {
      delete rmState.selectedActivities[input.code];
      return { ok: true, message: `Removido ${input.code}` };
    }
    if (toolName === 'suggest_supplier_for_code') {
      const ps = rmState.priceSummary[input.code];
      const cat = rmGetCatalog().find(c => c.code === input.code);
      if (!ps) return { ok: true, code: input.code, has_supplier_price: false, default_price: cat?.vu, note: 'Sin precios de supplier registrados para este code; usar default' };
      return { ok: true, code: input.code, preferred_supplier: ps.preferred_supplier, preferred_price: +ps.preferred_price, min_price: +ps.min_price, max_price: +ps.max_price, num_suppliers: ps.num_suppliers };
    }
    if (toolName === 'generate_sow_description') {
      // No tiene efecto en estado; devuelve dato útil para que Claude lo cite
      const e = rmCalcProject();
      const phases = Object.entries(RM_PHASES).filter(([p]) => e.byPhase[p]).map(([p, info]) => `${info.name} (${(e.byPhase[p].activities||[]).length} actividades, ${rmFmt(e.byPhase[p].total)})`);
      return { ok: true, tone: input.tone, phases_summary: phases, total_days: e.totalDays, sqft: e.sqft, client_price: Math.round(e.pricing.clientPrice) };
    }
    return { ok: false, error: 'Tool desconocida: ' + toolName };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function rmAgentSend(userText) {
  if (rmState.aiChatBusy) return;
  if (!userText && !rmState.aiChatInput) return;
  const text = userText || rmState.aiChatInput;
  rmState.aiChatInput = '';
  rmState.aiChatBusy = true;
  rmState.aiChatLog.push({ role: 'user', content: [{ type: 'text', text }] });
  rmRenderTab();

  try {
    let projectContext = rmBuildAgentContext();
    let messages = rmState.aiChatLog.map(m => ({ role: m.role, content: m.content }));
    let safetyCounter = 0;

    while (safetyCounter < 6) {
      safetyCounter++;
      const resp = await fetch(`${window.SUPABASE_URL}/functions/v1/remodel-ai`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ messages, project_context: projectContext })
      });
      if (!resp.ok) {
        const err = await resp.text();
        rmState.aiChatLog.push({ role: 'assistant', content: [{ type: 'text', text: '❌ Error: ' + err + '\n\n¿Deployaste la Edge Function `remodel-ai` y seteaste ANTHROPIC_API_KEY en Supabase secrets?' }] });
        break;
      }
      const data = await resp.json();
      // Push assistant message
      rmState.aiChatLog.push({ role: 'assistant', content: data.content });
      messages.push({ role: 'assistant', content: data.content });

      if (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter(c => c.type === 'tool_use');
        const toolResults = [];
        for (const tu of toolUses) {
          const result = await rmAgentExecuteTool(tu.name, tu.input);
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
        }
        rmState.aiChatLog.push({ role: 'user', content: toolResults });
        messages.push({ role: 'user', content: toolResults });
        // Re-build context (puede haber cambiado por la tool)
        projectContext = rmBuildAgentContext();
        // Continuamos el loop para que Claude responda con el resultado
        rmRenderTab();
        continue;
      }
      break; // end_turn o stop_sequence
    }
  } catch (e) {
    rmState.aiChatLog.push({ role: 'assistant', content: [{ type: 'text', text: '❌ Error de red: ' + String(e) }] });
  } finally {
    rmState.aiChatBusy = false;
    rmRenderTab();
    // Scroll al fondo
    setTimeout(() => {
      const el = document.getElementById('rm-agent-log');
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  }
}

function rmAgentClear() {
  if (!confirm('¿Limpiar conversación?')) return;
  rmState.aiChatLog = [];
  rmRenderTab();
}

function rmRenderAgent(body) {
  const e = rmState.currentProject ? rmCalcProject() : { activities: [] };
  body.innerHTML = `
    <div class="flex justify-between items-end mb-3">
      <div>
        <h2 class="text-lg font-bold">🤖 IA Agente — Claude para Remodel Pro</h2>
        <p class="text-xs text-slate-500">${rmState.currentProject ? `Proyecto: ${rmState.editName} · ${e.activities.length} activ · $${Math.round(e.pricing?.clientPrice||0)}` : 'Sin proyecto cargado'}</p>
      </div>
      <button onclick="rmAgentClear()" class="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded">🗑 Limpiar chat</button>
    </div>

    <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 text-[11px] text-purple-950 mb-3">
      <strong>💡 Qué puede hacer:</strong>
      <ul class="mt-1 ml-4 list-disc">
        <li>Agregar/modificar/quitar actividades del proyecto cargado ("agregame quartz countertops en 45 sqft")</li>
        <li>Sugerir suppliers y precios reales ("dónde compro tile más barato?")</li>
        <li>Generar descripción narrativa del SOW (lender / cliente / técnica)</li>
        <li>Validar el presupuesto vs benchmarks históricos</li>
        <li>Tiene acceso al catálogo, suppliers, las 5 casas calibradoras y el proyecto cargado</li>
      </ul>
    </div>

    <div id="rm-agent-log" class="bg-white border border-slate-200 rounded-xl p-3 mb-3 overflow-y-auto" style="height:380px;">
      ${rmState.aiChatLog.length === 0 ? `
        <div class="text-center text-slate-400 text-xs py-12">
          Pegale una pregunta o tarea. Ejemplos:<br>
          • "Sugerime suppliers para los cabinets"<br>
          • "Agregá tile bañera, 60 sqft"<br>
          • "Estoy en 14% margen, qué cambio?"<br>
          • "Generá descripción para el SOW lender"
        </div>
      ` : rmState.aiChatLog.map(m => {
        if (m.role === 'user' && m.content[0]?.type === 'tool_result') {
          // No render tool_results (los muestra Claude en su respuesta)
          return '';
        }
        const isUser = m.role === 'user';
        const align = isUser ? 'items-end' : 'items-start';
        const bg = isUser ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900';
        return `
          <div class="flex flex-col ${align} mb-2">
            <div class="${bg} rounded-2xl px-3 py-2 max-w-[85%] text-xs">
              ${m.content.map(c => {
                if (c.type === 'text') return `<div class="whitespace-pre-wrap">${(c.text||'').replace(/</g,'&lt;')}</div>`;
                if (c.type === 'tool_use') return `<div class="mt-1 text-[10px] bg-purple-100 text-purple-900 rounded px-1.5 py-0.5 inline-block font-mono">⚙️ ${c.name}(${JSON.stringify(c.input).slice(0,80)})</div>`;
                return '';
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
      ${rmState.aiChatBusy ? `<div class="text-center text-xs text-slate-500 italic">⏳ Claude pensando...</div>` : ''}
    </div>

    <form onsubmit="event.preventDefault(); rmAgentSend(document.getElementById('rm-agent-input').value); document.getElementById('rm-agent-input').value='';">
      <div class="flex gap-2">
        <input id="rm-agent-input" type="text" placeholder="Pregunta o pedido..." ${rmState.aiChatBusy?'disabled':''} class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" ${rmState.aiChatBusy?'disabled':''} class="bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm font-bold px-4 py-2 rounded-lg">Enviar</button>
      </div>
    </form>

    <div class="mt-3 text-[10px] text-slate-400 text-center">
      Para que esto funcione, deployá la Edge Function:<br>
      <code class="bg-slate-100 px-1 rounded">supabase functions deploy remodel-ai --no-verify-jwt --use-api</code><br>
      y seteá secret: <code class="bg-slate-100 px-1 rounded">supabase secrets set ANTHROPIC_API_KEY=sk-ant-...</code>
    </div>
  `;
}

// S2-G5: Cargar suppliers + resumen de precios
async function rmLoadSuppliers() {
  try {
    const [s, ps] = await Promise.all([
      sb.from('remodel_suppliers').select('*').eq('active', true).order('preferred', { ascending: false }).order('name'),
      sb.from('remodel_price_summary').select('*').then(r => r.data || []).catch(() => [])
    ]);
    rmState.suppliers = s.data || [];
    // priceSummary indexado por activity_code
    rmState.priceSummary = {};
    (ps || []).forEach(p => { rmState.priceSummary[p.activity_code] = p; });
  } catch (e) {
    console.warn('rmLoadSuppliers falló:', e);
    rmState.suppliers = [];
    rmState.priceSummary = {};
  }
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
    tags: rmState.editTags || [],
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

async function rmLoadProject(p) {
  rmState.currentProject = p;
  await Promise.all([
    rmLoadActuals(p.id),
    rmLoadVersionsAndCOs(p.id),
    rmLoadCrewAssignments(p.id),
    rmLoadInvoices(p.id)
  ]);
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
  rmState.tracking = p.progress || {};
  rmState.editTags = Array.isArray(p.tags) ? p.tags : [];
  rmState.tab = 'editor';
  rmRender();
}

function rmNewProject() {
  rmState.currentProject = null;
  rmState.actualsByCode = {};
  rmState.versions = [];
  rmState.changeOrders = [];
  rmState.crewAssignments = [];
  rmState.invoices = [];
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
  rmState.tracking = {};
  rmState.editTags = [];
  rmState.tab = 'editor';
  rmRender();
}

// QW4 — Tags helpers
function rmAddTag(value) {
  const t = (value || '').trim().toLowerCase();
  if (!t) return;
  if (!Array.isArray(rmState.editTags)) rmState.editTags = [];
  if (!rmState.editTags.includes(t)) rmState.editTags.push(t);
  rmRenderTab();
}
function rmRemoveTag(t) {
  if (!Array.isArray(rmState.editTags)) return;
  rmState.editTags = rmState.editTags.filter(x => x !== t);
  rmRenderTab();
}
function rmTagInputKey(ev, el) {
  if (ev.key === 'Enter' || ev.key === ',') {
    ev.preventDefault();
    rmAddTag(el.value);
    el.value = '';
  }
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
    { id: 'seguimiento', label: '🔄 Seguimiento' },
    { id: 'gantt', label: '📅 Cronograma' },
    { id: 'sow', label: '📋 SOW (Lender)' },
    { id: 'versions', label: rmState.currentProject ? `📜 Historial (${rmState.versions.length}v · ${rmState.changeOrders.length}CO)` : '📜 Historial' },
    { id: 'crew', label: `👷 Crew (${rmState.crew.length})` },
    { id: 'purchases', label: '🛒 Lista compra' },
    { id: 'field', label: '📱 Vista campo' },
    { id: 'agent', label: '🤖 IA Agente' },
    { id: 'catalog', label: `🛠 Catálogo (${rmGetCatalog().length})` },
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
  if (rmState.tab === 'seguimiento') return rmRenderSeguimiento(body);
  if (rmState.tab === 'gantt') return rmRenderGantt(body);
  if (rmState.tab === 'sow') return rmRenderSow(body);
  if (rmState.tab === 'versions') return rmRenderVersions(body);
  if (rmState.tab === 'crew') return rmRenderCrew(body);
  if (rmState.tab === 'purchases') return rmRenderPurchases(body);
  if (rmState.tab === 'field') return rmRenderField(body);
  if (rmState.tab === 'agent') return rmRenderAgent(body);
  if (rmState.tab === 'catalog') return rmRenderCatalog(body);
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
    const cat = rmGetCatalog().find(c => c.code === code);
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
  // QW4 — filtro por tag + QW5 — mini-dashboard portfolio
  const tagFilter = (rmState.projectTagFilter || '').trim().toLowerCase();
  const projects = tagFilter
    ? rmState.projects.filter(p => Array.isArray(p.tags) && p.tags.some(t => (t||'').toLowerCase().includes(tagFilter)))
    : rmState.projects;

  // Tags únicos del portfolio
  const allTags = Array.from(new Set(
    rmState.projects.flatMap(p => Array.isArray(p.tags) ? p.tags : [])
  )).sort();

  // QW5 — KPIs portfolio
  const totalBudget = projects.reduce((s,p) => s + (+p.budget_total||0), 0);
  const totalReal = projects.reduce((s,p) => s + (+p.real_total||0), 0);
  const withReal = projects.filter(p => +p.real_total > 0 && +p.budget_total > 0);
  // Varianza ponderada = (Σreal - Σbudget) / Σbudget × 100  (proyectos más grandes pesan más)
  const sumReal = withReal.reduce((s,p) => s + (+p.real_total), 0);
  const sumBudget = withReal.reduce((s,p) => s + (+p.budget_total), 0);
  const weightedVarPct = sumBudget > 0 ? ((sumReal - sumBudget) / sumBudget) * 100 : null;
  const desviaciones = withReal
    .map(p => ({ name: p.name, pct: (+p.real_total - +p.budget_total) / (+p.budget_total) * 100, delta: +p.real_total - +p.budget_total }))
    .sort((a,b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0,3);

  body.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-lg font-bold">Proyectos de remodelación</h2>
      <div class="flex gap-2">
        ${rmState.projects.length ? '<button onclick="rmExportAllExcel()" class="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold px-4 py-2 rounded">📥 Excel masivo</button>' : ''}
        <button onclick="rmNewProject()" class="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded">+ Nuevo proyecto</button>
      </div>
    </div>

    ${rmState.projects.length ? `
      <!-- QW5 — Mini-dashboard portfolio -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div class="bg-slate-900 text-white rounded-xl p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Presupuesto total</div>
          <div class="text-xl font-bold">${rmFmt(totalBudget)}</div>
          <div class="text-[10px] text-slate-500">${projects.length} proyecto${projects.length===1?'':'s'}</div>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Gasto real total</div>
          <div class="text-xl font-bold ${totalReal>totalBudget?'text-red-700':'text-emerald-700'}">${rmFmt(totalReal)}</div>
          <div class="text-[10px] text-slate-500">${withReal.length} con tracking</div>
        </div>
        <div class="bg-${weightedVarPct===null?'slate':weightedVarPct>5?'red':weightedVarPct<-5?'emerald':'amber'}-50 border border-${weightedVarPct===null?'slate':weightedVarPct>5?'red':weightedVarPct<-5?'emerald':'amber'}-200 rounded-xl p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Variación ponderada</div>
          <div class="text-xl font-bold">${weightedVarPct===null?'—':(weightedVarPct>0?'+':'')+weightedVarPct.toFixed(1)+'%'}</div>
          <div class="text-[10px] text-slate-500">vs presupuesto</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Top desviaciones</div>
          <div class="text-[11px] space-y-0.5 mt-0.5">
            ${desviaciones.length ? desviaciones.map(d => `
              <div class="flex justify-between gap-2">
                <span class="truncate">${d.name}</span>
                <span class="font-bold ${d.pct>0?'text-red-700':'text-emerald-700'}">${d.pct>0?'+':''}${d.pct.toFixed(0)}%</span>
              </div>
            `).join('') : '<div class="text-slate-400">Sin reales</div>'}
          </div>
        </div>
      </div>

      ${allTags.length ? `
        <!-- QW4 — Filtro tags -->
        <div class="flex flex-wrap items-center gap-1 mb-3 text-xs">
          <span class="text-slate-500 font-semibold">Filtrar:</span>
          <button onclick="rmState.projectTagFilter=''; rmRenderTab()" class="px-2 py-0.5 rounded-full border ${tagFilter?'border-slate-300 text-slate-600':'border-slate-900 bg-slate-900 text-white font-bold'}">Todos</button>
          ${allTags.map(t => `
            <button onclick="rmState.projectTagFilter='${t.replace(/'/g,"&#39;")}'; rmRenderTab()"
              class="px-2 py-0.5 rounded-full border ${tagFilter===t?'border-slate-900 bg-slate-900 text-white font-bold':'border-slate-300 text-slate-700 hover:bg-slate-100'}">
              ${t}
            </button>
          `).join('')}
        </div>
      ` : ''}
    ` : ''}

    <div class="overflow-x-auto border border-slate-200 rounded-lg">
      <table class="w-full text-sm">
        <thead class="bg-slate-50"><tr><th class="text-left py-2 px-2">Proyecto</th><th class="text-right py-2 px-2">Sqft</th><th class="text-right py-2 px-2">Presupuesto</th><th class="text-right py-2 px-2">$/sqft</th><th class="text-right py-2 px-2">Real</th><th class="text-center py-2 px-2">Status</th><th class="text-right py-2 px-2">Inicio</th><th></th></tr></thead>
        <tbody>
          ${projects.map(p => `
            <tr class="border-t border-slate-200 hover:bg-slate-50">
              <td class="py-2 px-2 font-semibold">
                <div>${p.name}</div>
                ${Array.isArray(p.tags) && p.tags.length ? `<div class="mt-1 flex flex-wrap gap-1">${p.tags.map(t => `<span class="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">${t}</span>`).join('')}</div>` : ''}
              </td>
              <td class="py-2 px-2 text-right">${p.sqft || '—'}</td>
              <td class="py-2 px-2 text-right font-bold">${rmFmt(p.budget_total)}</td>
              <td class="py-2 px-2 text-right">${p.sqft ? '$' + (p.budget_total/p.sqft).toFixed(0) : '—'}</td>
              <td class="py-2 px-2 text-right">${p.real_total > 0 ? rmFmt(p.real_total) : '—'}</td>
              <td class="py-2 px-2 text-center"><span class="text-[10px] px-2 py-0.5 rounded bg-slate-100">${p.status}</span></td>
              <td class="py-2 px-2 text-right text-xs text-slate-500">${rmFmtDate(p.start_date)}</td>
              <td class="py-2 px-2 text-right whitespace-nowrap">
                <button onclick='rmLoadProject(${JSON.stringify(p).replace(/'/g,"&#39;")})' class="text-xs text-slate-600 hover:text-slate-900 mr-1" title="Editar">📝</button>
                <button onclick="rmExportProjectExcel('${p.id}')" class="text-xs text-emerald-600 hover:text-emerald-800 mr-1" title="Descargar Excel">📥</button>
                <button onclick="rmDeleteProject('${p.id}')" class="text-xs text-red-600 hover:text-red-800" title="Borrar">🗑</button>
              </td>
            </tr>
          `).join('') || `<tr><td colspan="8" class="text-center text-slate-400 py-8">${tagFilter?'Sin proyectos con tag "'+tagFilter+'".':'Sin proyectos. Click "+ Nuevo proyecto".'}</td></tr>`}
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
          <!-- QW4 — Tags chips -->
          <div class="mt-3">
            <label class="block text-[10px] text-slate-500 mb-1">🏷️ Tags <span class="text-slate-400 font-normal">(presioná Enter o coma para agregar)</span></label>
            <div class="flex flex-wrap gap-1 items-center border border-slate-300 rounded px-2 py-1.5 min-h-[36px]">
              ${(rmState.editTags || []).map(t => `
                <span class="inline-flex items-center gap-1 bg-slate-900 text-white text-[11px] px-2 py-0.5 rounded-full">
                  ${t}
                  <button onclick="rmRemoveTag('${t.replace(/'/g,"&#39;")}')" class="text-slate-300 hover:text-white">×</button>
                </span>
              `).join('')}
              <input type="text" placeholder="${(rmState.editTags || []).length ? '' : 'ej: lender:stx, partner:mike, hot, sob'}"
                onkeydown="rmTagInputKey(event, this)"
                onblur="if(this.value){rmAddTag(this.value); this.value='';}"
                class="flex-1 min-w-[120px] text-xs border-0 outline-none bg-transparent" />
            </div>
          </div>
        </div>

        <!-- Activos del proyecto: Matterport + scope + audio + planos -->
        ${rmRenderAssets()}

        <!-- 🪄 AUTO-LLENADO INTELIGENTE -->
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 rounded-xl p-3">
          <div class="flex justify-between items-start gap-2 flex-wrap mb-2">
            <div>
              <div class="text-sm font-bold text-violet-900">🪄 Auto-llenar el catálogo</div>
              <div class="text-[11px] text-violet-700 mt-0.5">Elegí el tipo de remodelación + ya tenés <strong>${rmState.editSqft || '?'} ft²</strong> → llena todo el catálogo con cantidades realistas. Después ajustás lo que no aplique.</div>
            </div>
            ${Object.keys(rmState.selectedActivities).length > 0 ? `<span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold">✓ ${Object.keys(rmState.selectedActivities).length} ya cargadas</span>` : ''}
          </div>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-1.5">
            ${Object.entries(RM_AUTOFILL_TEMPLATES).map(([k, t]) => {
              const isCurrent = rmState.remodelType === k;
              return `
                <button onclick="rmAutoFillEditor('${k}')"
                  class="text-left p-2 rounded-lg border-2 ${isCurrent?'border-violet-600 bg-violet-600 text-white':'border-violet-200 bg-white hover:border-violet-400 text-slate-900'} transition-colors"
                  title="${t.desc}">
                  <div class="text-xs font-bold">${t.label}</div>
                  <div class="text-[9px] opacity-80 leading-tight mt-0.5">${t.desc.slice(0, 60)}${t.desc.length > 60 ? '…' : ''}</div>
                  <div class="text-[9px] opacity-70 mt-1">${Object.keys(t.activities).length} activ.</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- QW3 — Buscador en catálogo -->
        <div class="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-2">
          <span class="text-lg">🔎</span>
          <input
            type="text"
            value="${(rmState.catalogFilter || '').replace(/"/g,'&quot;')}"
            oninput="rmState.catalogFilter=this.value; rmRenderTabDebounced()"
            placeholder="Buscar actividad (código, descripción, subcategoría, unidad)..."
            class="flex-1 border-0 outline-none text-sm"
          />
          ${rmState.catalogFilter ? `<button onclick="rmState.catalogFilter=''; rmRenderTab()" class="text-xs text-slate-500 hover:text-slate-900 px-2 py-1">✕ limpiar</button>` : ''}
        </div>

        <!-- Catálogo por fase -->
        ${Object.entries(RM_PHASES).map(([p, info]) => {
          const filter = (rmState.catalogFilter || '').toLowerCase().trim();
          const allActs = rmGetCatalog().filter(c => c.phase === p);
          const acts = filter
            ? allActs.filter(a =>
                (a.code || '').toLowerCase().includes(filter) ||
                (a.desc || '').toLowerCase().includes(filter) ||
                (a.subcat || '').toLowerCase().includes(filter) ||
                (a.unit || '').toLowerCase().includes(filter)
              )
            : allActs;
          // Si hay filtro y la fase no tiene matches → no renderizar
          if (filter && acts.length === 0) return '';
          const phaseSel = acts.filter(a => rmState.selectedActivities[a.code]);
          const phaseBudget = e.byPhase[p]?.total || 0;
          const forceOpen = filter && acts.length > 0;
          return `
            <details ${(phaseSel.length || forceOpen)?'open':''} class="bg-white rounded-xl border border-slate-200">
              <summary class="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                <div class="flex items-center gap-2">
                  <span class="text-lg">${info.icon}</span>
                  <span class="font-bold text-sm">${p}. ${info.name}</span>
                  ${filter ? `<span class="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded">${acts.length} match</span>` : ''}
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
        <!-- PRICING TOTAL (color dinámico según margen — QW1) -->
        ${(() => {
          const pm = e.pricing.profitMarginPct || 0;
          const lowMargin = pm < 18;
          const okMargin = pm >= 18 && pm < 25;
          // Para que Tailwind CDN los detecte, escribo las clases completas explícitas:
          const card = lowMargin
            ? 'from-red-50 to-rose-100 border-red-400'
            : okMargin
              ? 'from-amber-50 to-yellow-100 border-amber-400'
              : 'from-emerald-50 to-green-50 border-emerald-400';
          const txt = lowMargin ? 'red' : okMargin ? 'amber' : 'emerald';
          return `
            <div class="bg-gradient-to-br ${card} border-2 rounded-xl p-4">
              <h3 class="text-xs font-bold text-${txt}-900 uppercase mb-1">💵 Precio al cliente</h3>
              <div class="text-3xl font-bold text-${txt}-700">${rmFmt(e.pricing.clientPrice)}</div>
              <div class="text-xs text-${txt}-800 mt-1">Ganancia: <strong>${rmFmt(e.pricing.profit)}</strong> (${pm.toFixed(1)}% margen)</div>
              ${lowMargin ? `
                <div class="mt-3 pt-3 border-t border-red-300 text-[11px] text-red-900 font-semibold flex items-start gap-1.5">
                  <span class="text-base leading-none">⚠️</span>
                  <span>Margen <strong>${pm.toFixed(1)}%</strong> está bajo industria (18-25%). Subí <strong>Markup %</strong> a ≥25% en Ajustes de pricing.</span>
                </div>
              ` : okMargin ? `
                <div class="mt-2 text-[10px] text-amber-800">Margen en el bajo del rango sano (18-25%). High-end típico: 30-50%.</div>
              ` : ''}
            </div>
          `;
        })()}

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
              <div>
                <label class="block text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Permits $</span>
                  <button onclick="rmAutoPermitsAustin()" class="text-[9px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded font-bold" title="Auto Austin TX: $1,500 base + $0.50/ft² sobre 1,500">📐 Auto Austin</button>
                </label>
                <input type="number" value="${rmState.permitsCost}" oninput="rmState.permitsCost=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
              </div>
              <div><label class="block text-[10px] text-slate-500">Design fees $</label><input type="number" value="${rmState.designFeesCost}" oninput="rmState.designFeesCost=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /></div>
              <div class="col-span-2"><label class="block text-[10px] text-slate-500">Markup al cliente %</label><input type="number" step="1" value="${rmState.markupPct}" oninput="rmState.markupPct=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /><p class="text-[9px] text-slate-400">Industria: 20-30% típico, 50% high-end</p></div>
              <div><label class="block text-[10px] text-slate-500">Crew (personas)</label><input type="number" value="${rmState.crewSize}" oninput="rmState.crewSize=Math.max(1,+this.value); rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /></div>
              <div><label class="block text-[10px] text-slate-500">Días/semana</label><select onchange="rmState.workDays=+this.value; rmRenderTabPreservingFocus()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs"><option value="5" ${rmState.workDays===5?'selected':''}>5 (L-V)</option><option value="6" ${rmState.workDays===6?'selected':''}>6 (L-S)</option><option value="7" ${rmState.workDays===7?'selected':''}>7</option></select></div>
            </div>
          </div>
        </details>

        <!-- DESGLOSE DIRECTO Material / Mano de obra / Equipo -->
        <div class="bg-white rounded-lg p-3 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-2">Costo directo: Material / MO / Equipo</h3>
          ${(() => {
            const t = e.totals.total || 1;
            const rows = [
              { l:'Materiales', v:e.totals.material, c:'bg-blue-500', tc:'text-blue-700' },
              { l:'Mano de obra', v:e.totals.labor, c:'bg-purple-500', tc:'text-purple-700' },
              { l:'Equipo', v:e.totals.equipment, c:'bg-slate-500', tc:'text-slate-700' }
            ];
            return rows.map(r => `
              <div class="mb-1.5">
                <div class="flex justify-between text-xs"><span class="text-slate-500">${r.l}</span><span class="${r.tc} font-bold">${rmFmt(r.v)} <span class="text-slate-400 font-normal">(${(r.v/t*100).toFixed(0)}%)</span></span></div>
                <div class="bg-slate-100 rounded-full h-1.5 mt-0.5"><div class="${r.c} h-1.5 rounded-full" style="width:${r.v/t*100}%"></div></div>
              </div>
            `).join('');
          })()}
        </div>

        <!-- GRÁFICOS -->
        <div class="bg-white rounded-lg p-3 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-2">📊 Distribución visual</h3>
          <div class="text-[10px] text-slate-500 mb-1">Costo por grupo macro</div>
          <canvas id="rm-chart-pie" height="170"></canvas>
          <div class="text-[10px] text-slate-500 mt-3 mb-1">Material / MO / Equipo por grupo</div>
          <canvas id="rm-chart-bar" height="190"></canvas>
        </div>

        <!-- EXPORT EXCEL -->
        <button onclick="rmExportEditorExcel()" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
          📥 Descargar Excel (Config · Presupuesto · Cronograma)
        </button>

        <!-- S5-G11: PROPUESTA CLIENTE PDF -->
        <button onclick="rmGenerateProposalPDF()" class="w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
          📄 Generar propuesta cliente PDF
        </button>

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
    rmRenderCharts(e);
  }, 60);
}

// ─── TAB: SEGUIMIENTO (tracking en vivo: % avance + real vs presupuesto por etapa) ───
function rmRenderSeguimiento(body) {
  const e = rmCalcProject();
  if (e.activities.length === 0) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">
      Cargá un proyecto desde <strong>📁 Proyectos</strong> o creá uno en el <strong>Editor</strong> para hacerle seguimiento.
    </div>`;
    return;
  }

  const view = rmState.seguimientoView || 'fase';
  const isFase = view === 'fase';

  body.innerHTML = `
    <div class="flex items-end justify-between mb-3 flex-wrap gap-2">
      <div>
        <h2 class="text-lg font-bold">🔄 Seguimiento — ${rmState.editName || 'Proyecto'}</h2>
        <p class="text-xs text-slate-500">Registrá el avance real. ${isFase ? 'Vista por fase = rápido, agregado.' : 'Vista por actividad = granular, alimenta el modelo de aprendizaje.'}</p>
      </div>
      <!-- S1-G1 — Sub-tabs Por fase / Por actividad -->
      <div class="inline-flex border border-slate-300 rounded-lg overflow-hidden text-xs">
        <button onclick="rmState.seguimientoView='fase'; rmRenderTab()"
          class="px-3 py-1.5 font-semibold ${isFase?'bg-slate-900 text-white':'bg-white text-slate-600 hover:bg-slate-50'}">📊 Por fase</button>
        <button onclick="rmState.seguimientoView='actividad'; rmRenderTab()"
          class="px-3 py-1.5 font-semibold ${!isFase?'bg-slate-900 text-white':'bg-white text-slate-600 hover:bg-slate-50'}">🎯 Por actividad</button>
      </div>
    </div>

    ${isFase ? rmRenderSeguimientoFase(e) : rmRenderSeguimientoActividad(e)}
  `;
}

// Vista por fase (la original)
function rmRenderSeguimientoFase(e) {
  const phases = ['1','2','3','4','5','6'].filter(p => (e.byPhase[p]?.total || 0) > 0);
  const STATUSES = ['pendiente','en_progreso','hecho'];

  let totalBudget = 0, totalReal = 0, weightedPct = 0;
  phases.forEach(p => {
    const budget = e.byPhase[p].total;
    const tr = rmState.tracking[p] || {};
    const real = +tr.real || 0;
    const pct = +tr.pct || 0;
    totalBudget += budget;
    totalReal += real;
    weightedPct += budget * pct;
  });
  const overallPct = totalBudget > 0 ? Math.round(weightedPct / totalBudget) : 0;
  const variance = totalBudget > 0 ? Math.round((totalReal - totalBudget) / totalBudget * 100) : 0;
  const realInfo = totalReal > 0;

  return `
    <!-- KPIs -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div class="bg-slate-900 text-white rounded-xl p-3">
        <div class="text-[10px] text-slate-400 uppercase font-bold">Avance global</div>
        <div class="text-2xl font-bold">${overallPct}%</div>
        <div class="bg-slate-700 rounded-full h-1.5 mt-1"><div class="bg-emerald-400 h-1.5 rounded-full" style="width:${overallPct}%"></div></div>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div class="text-[10px] text-blue-700 uppercase font-bold">Presupuesto</div>
        <div class="text-xl font-bold text-blue-900">${rmFmt(totalBudget)}</div>
      </div>
      <div class="bg-${realInfo?(totalReal>totalBudget?'red':'emerald'):'slate'}-50 border border-${realInfo?(totalReal>totalBudget?'red':'emerald'):'slate'}-200 rounded-xl p-3">
        <div class="text-[10px] uppercase font-bold text-${realInfo?(totalReal>totalBudget?'red':'emerald'):'slate'}-700">Gasto real</div>
        <div class="text-xl font-bold text-${realInfo?(totalReal>totalBudget?'red':'emerald'):'slate'}-900">${realInfo?rmFmt(totalReal):'—'}</div>
        ${realInfo?`<div class="text-[10px] ${variance>0?'text-red-700':'text-emerald-700'}">${variance>0?'+':''}${variance}% vs presup</div>`:''}
      </div>
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div class="text-[10px] text-amber-700 uppercase font-bold">Faltante por gastar</div>
        <div class="text-xl font-bold text-amber-900">${rmFmt(Math.max(0, totalBudget - totalReal))}</div>
      </div>
    </div>

    <div class="border border-slate-200 rounded-xl overflow-hidden mb-4">
      <table class="w-full text-xs">
        <thead class="bg-slate-50">
          <tr>
            <th class="text-left p-2">Grupo</th>
            <th class="text-right p-2">Presupuesto</th>
            <th class="text-center p-2">% Avance</th>
            <th class="text-right p-2">Gasto real</th>
            <th class="text-center p-2">Variación</th>
            <th class="text-center p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          ${phases.map(p => {
            const info = RM_PHASES[p];
            const budget = e.byPhase[p].total;
            const tr = rmState.tracking[p] || {};
            const pct = +tr.pct || 0;
            const real = +tr.real || 0;
            const status = tr.status || 'pendiente';
            const v = budget > 0 && real > 0 ? Math.round((real - budget)/budget*100) : null;
            return `
              <tr class="border-t border-slate-100">
                <td class="p-2 font-semibold">${info.icon} ${info.name}</td>
                <td class="p-2 text-right">${rmFmt(budget)}</td>
                <td class="p-2 text-center">
                  <input type="number" min="0" max="100" value="${pct||''}" placeholder="0"
                    onchange="rmSetTracking('${p}','pct',this.value)"
                    class="w-16 border border-slate-300 rounded px-1 py-1 text-center text-xs" />%
                </td>
                <td class="p-2 text-right">
                  <input type="number" value="${real||''}" placeholder="0"
                    onchange="rmSetTracking('${p}','real',this.value)"
                    class="w-24 border border-slate-300 rounded px-2 py-1 text-right text-xs" />
                </td>
                <td class="p-2 text-center ${v===null?'text-slate-400':v>10?'text-red-700 font-bold':v>0?'text-amber-700':'text-emerald-700'}">${v===null?'—':(v>0?'+':'')+v+'%'}</td>
                <td class="p-2 text-center">
                  <select onchange="rmSetTracking('${p}','status',this.value)" class="border border-slate-300 rounded px-1 py-1 text-xs">
                    ${STATUSES.map(s => `<option value="${s}" ${status===s?'selected':''}>${s==='pendiente'?'⚪ Pendiente':s==='en_progreso'?'🔵 En progreso':'✅ Hecho'}</option>`).join('')}
                  </select>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <button onclick="rmSaveTracking()" class="w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-lg">💾 Guardar seguimiento</button>
    ${!rmState.currentProject ? '<p class="text-[10px] text-amber-600 text-center mt-2">⚠️ Guardá el proyecto primero (Editor) para persistir el seguimiento.</p>' : ''}
  `;
}

// S1-G1 — Vista granular por actividad (alimenta remodel_actuals)
function rmRenderSeguimientoActividad(e) {
  const actsByPhase = {};
  e.activities.forEach(a => {
    if (!actsByPhase[a.phase]) actsByPhase[a.phase] = [];
    actsByPhase[a.phase].push(a);
  });

  // Totales granulares
  let totalEst = 0, totalReal = 0, withRealCount = 0, totalActs = 0;
  e.activities.forEach(a => {
    const r = rmState.actualsByCode[a.code] || {};
    totalEst += +a.total || 0;
    if (r.real_cost != null && r.real_cost !== '') {
      totalReal += +r.real_cost;
      withRealCount++;
    }
    totalActs++;
  });
  const coverage = totalActs > 0 ? Math.round(withRealCount / totalActs * 100) : 0;
  const variance = totalEst > 0 && totalReal > 0 ? Math.round((totalReal - totalEst) / totalEst * 100) : null;

  const statusProj = rmState.currentProject?.status || 'planning';
  const completedAt = rmState.currentProject?.completed_at;

  return `
    <!-- KPIs granulares -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div class="bg-slate-900 text-white rounded-xl p-3">
        <div class="text-[10px] text-slate-400 uppercase font-bold">Cobertura tracking</div>
        <div class="text-2xl font-bold">${coverage}%</div>
        <div class="text-[10px] text-slate-400">${withRealCount}/${totalActs} actividades con real</div>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div class="text-[10px] text-blue-700 uppercase font-bold">Total estimado</div>
        <div class="text-xl font-bold text-blue-900">${rmFmt(totalEst)}</div>
      </div>
      <div class="bg-${variance===null?'slate':variance>0?'red':'emerald'}-50 border border-${variance===null?'slate':variance>0?'red':'emerald'}-200 rounded-xl p-3">
        <div class="text-[10px] uppercase font-bold text-${variance===null?'slate':variance>0?'red':'emerald'}-700">Total real (parcial)</div>
        <div class="text-xl font-bold text-${variance===null?'slate':variance>0?'red':'emerald'}-900">${totalReal>0?rmFmt(totalReal):'—'}</div>
        ${variance!==null?`<div class="text-[10px]">${variance>0?'+':''}${variance}% vs est.</div>`:''}
      </div>
      <div class="bg-${statusProj==='completed'?'emerald':'amber'}-50 border border-${statusProj==='completed'?'emerald':'amber'}-200 rounded-xl p-3">
        <div class="text-[10px] uppercase font-bold text-${statusProj==='completed'?'emerald':'amber'}-700">Status modelo</div>
        <div class="text-sm font-bold text-${statusProj==='completed'?'emerald':'amber'}-900">${statusProj==='completed'?'✅ Alimentando':'⏳ Pending'}</div>
        <div class="text-[10px] text-slate-500">${completedAt?'Completado '+rmFmtDate(completedAt):'No alimenta benchmarks hasta marcar completado'}</div>
      </div>
    </div>

    <!-- Tabla granular -->
    <div class="border border-slate-200 rounded-xl overflow-x-auto mb-4">
      <table class="w-full text-[11px]">
        <thead class="bg-slate-50 sticky top-0">
          <tr>
            <th class="text-left p-2">Actividad</th>
            <th class="text-right p-2 w-20">Est. $</th>
            <th class="text-right p-2 w-24">Real $</th>
            <th class="text-right p-2 w-16">Est. d</th>
            <th class="text-right p-2 w-16">Real d</th>
            <th class="text-right p-2 w-20">Real hrs</th>
            <th class="text-center p-2 w-16">Var %</th>
            <th class="text-left p-2 w-48">Notas</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(actsByPhase).map(([p, acts]) => {
            const info = RM_PHASES[p];
            return `
              <tr class="bg-slate-100"><td colspan="8" class="px-2 py-1 font-bold text-[10px] uppercase text-slate-600">${info.icon} ${p}. ${info.name}</td></tr>
              ${acts.map(a => {
                const r = rmState.actualsByCode[a.code] || {};
                const stageKey = rmActivityToStageKey(a.code) || '—';
                const est = +a.total || 0;
                const real = r.real_cost != null && r.real_cost !== '' ? +r.real_cost : null;
                const v = (est > 0 && real != null) ? Math.round((real - est) / est * 100) : null;
                return `
                  <tr class="border-t border-slate-100">
                    <td class="p-1.5">
                      <div class="font-mono text-[9px] text-slate-400">${a.code} · ${stageKey}</div>
                      <div class="text-[11px] font-semibold truncate" title="${a.desc.replace(/"/g,'&quot;')}">${a.desc}</div>
                    </td>
                    <td class="p-1 text-right text-slate-500">${rmFmt(est)}</td>
                    <td class="p-1 text-right">
                      <input type="number" step="1" value="${r.real_cost ?? ''}" placeholder="—"
                        onchange="rmSetActual('${a.code}','real_cost',this.value)"
                        class="w-full border border-slate-300 rounded px-1 py-0.5 text-right text-[11px]" />
                    </td>
                    <td class="p-1 text-right text-slate-500">${a.days || 0}</td>
                    <td class="p-1 text-right">
                      <input type="number" step="0.5" value="${r.real_days ?? ''}" placeholder="—"
                        onchange="rmSetActual('${a.code}','real_days',this.value)"
                        class="w-full border border-slate-300 rounded px-1 py-0.5 text-right text-[11px]" />
                    </td>
                    <td class="p-1 text-right">
                      <input type="number" step="0.5" value="${r.real_hours ?? ''}" placeholder="—"
                        onchange="rmSetActual('${a.code}','real_hours',this.value)"
                        class="w-full border border-slate-300 rounded px-1 py-0.5 text-right text-[11px]" />
                    </td>
                    <td class="p-1 text-center ${v===null?'text-slate-300':v>10?'text-red-700 font-bold':v>0?'text-amber-700':'text-emerald-700'}">${v===null?'—':(v>0?'+':'')+v+'%'}</td>
                    <td class="p-1">
                      <input type="text" value="${(r.notes||'').replace(/"/g,'&quot;')}" placeholder="—"
                        onchange="rmSetActual('${a.code}','notes',this.value)"
                        class="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px]" />
                    </td>
                  </tr>
                `;
              }).join('')}
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
      <button onclick="rmSaveActuals()" class="bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-lg">💾 Guardar actuales</button>
      <button onclick="rmMarkProjectCompleted()" ${statusProj==='completed'?'disabled':''}
        class="bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 rounded-lg">
        ${statusProj==='completed'?'✅ Ya completado':'🎯 Marcar como completado'}
      </button>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-950">
      <strong>💡 Cómo funciona el modelo de aprendizaje:</strong>
      <ul class="mt-1 ml-4 list-disc space-y-0.5">
        <li>Llenás <strong>Real $ / Real d / Real hrs</strong> a medida que ejecutás cada actividad.</li>
        <li><strong>Guardar actuales</strong> hace upsert en <code class="bg-blue-100 px-1 rounded">remodel_actuals</code> (1 fila por activity_code).</li>
        <li>Al <strong>marcar el proyecto como completado</strong>, sus actuales alimentan la view <code class="bg-blue-100 px-1 rounded">remodel_dynamic_benchmarks</code> y mejoran las estimaciones futuras.</li>
        <li>El <strong>stage_key</strong> mostrado debajo del código es el bucket de aprendizaje (uno de los 16).</li>
      </ul>
    </div>
    ${!rmState.currentProject ? '<p class="text-[10px] text-amber-600 text-center mt-2">⚠️ Guardá el proyecto primero (Editor) para persistir actuales.</p>' : ''}
  `;
}

function rmSetTracking(phase, field, value) {
  if (!rmState.tracking[phase]) rmState.tracking[phase] = {};
  rmState.tracking[phase][field] = field === 'status' ? value : (+value || 0);
  rmRenderTabDebounced();
}

async function rmSaveTracking() {
  if (!rmState.currentProject?.id) return alert('Guardá el proyecto primero en el Editor.');
  const e = rmCalcProject();
  const phases = ['1','2','3','4','5','6'].filter(p => (e.byPhase[p]?.total || 0) > 0);
  const totalReal = phases.reduce((s,p) => s + (+(rmState.tracking[p]?.real)||0), 0);
  const allDone = phases.every(p => (rmState.tracking[p]?.status) === 'hecho');
  const anyProgress = phases.some(p => (rmState.tracking[p]?.status) === 'en_progreso' || (+(rmState.tracking[p]?.pct)||0) > 0);
  const status = allDone ? 'completed' : anyProgress ? 'active' : 'planning';
  const { error } = await sb.from('remodel_projects').update({
    progress: rmState.tracking,
    real_total: totalReal,
    status,
    updated_at: new Date().toISOString()
  }).eq('id', rmState.currentProject.id);
  if (error) return alert('Error: ' + error.message + '\n\n(¿Corriste el ALTER TABLE para agregar la columna progress?)');
  await rmLoadAll();
  alert('✓ Seguimiento guardado');
  rmRenderTab();
}

// ─── S1-G1: Tracking granular por actividad (alimenta remodel_actuals) ───

async function rmLoadActuals(projectId) {
  if (!projectId) { rmState.actualsByCode = {}; return; }
  const { data, error } = await sb
    .from('remodel_actuals')
    .select('*')
    .eq('project_id', projectId);
  if (error) {
    console.error('Error loading actuals:', error);
    rmState.actualsByCode = {};
    return;
  }
  const map = {};
  (data || []).forEach(r => { map[r.activity_code] = r; });
  rmState.actualsByCode = map;
}

function rmSetActual(code, field, value) {
  if (!rmState.actualsByCode[code]) rmState.actualsByCode[code] = {};
  rmState.actualsByCode[code][field] = field === 'notes' ? value : (value === '' ? null : +value || 0);
  rmRenderTabDebounced();
}

async function rmSaveActuals() {
  if (!rmState.currentProject?.id) {
    return alert('Guardá el proyecto primero en el Editor (para tener un project_id).');
  }
  const e = rmCalcProject();
  const sqft = +rmState.editSqft || null;
  const rows = e.activities.map(a => {
    const r = rmState.actualsByCode[a.code] || {};
    const hasReal =
      (r.real_cost != null && r.real_cost !== '') ||
      (r.real_days != null && r.real_days !== '') ||
      (r.real_hours != null && r.real_hours !== '');
    if (!hasReal && !r.notes) return null;
    return {
      project_id: rmState.currentProject.id,
      activity_code: a.code,
      stage_key: rmActivityToStageKey(a.code),
      estimated_cost: a.total || 0,
      estimated_days: a.days || 0,
      real_cost: r.real_cost ?? null,
      real_days: r.real_days ?? null,
      real_hours: r.real_hours ?? null,
      real_materials_cost: r.real_materials_cost ?? null,
      real_labor_cost: r.real_labor_cost ?? null,
      sqft,
      notes: r.notes || null,
      recorded_by: state.user?.id || null
    };
  }).filter(Boolean);

  if (!rows.length) {
    return alert('No hay valores reales para guardar. Completá al menos un costo/día/hora real.');
  }

  const { error } = await sb
    .from('remodel_actuals')
    .upsert(rows, { onConflict: 'project_id,activity_code' });

  if (error) {
    return alert('Error guardando actuals: ' + error.message +
      '\n\n(¿Corriste supabase/s1-g1-actuals.sql para crear el UNIQUE constraint?)');
  }
  alert(`✓ ${rows.length} actuales guardados`);
  await rmLoadActuals(rmState.currentProject.id);
  rmRenderTab();
}

async function rmMarkProjectCompleted() {
  if (!rmState.currentProject?.id) return alert('Guardá el proyecto primero.');
  if (!confirm('¿Marcar este proyecto como COMPLETADO?\n\nEsto:\n• Setea status="completed" + completed_at=now()\n• Los actuales pasan a alimentar el modelo de aprendizaje (remodel_dynamic_benchmarks)\n• Es reversible cambiando status a "active" en el Editor')) return;

  const { error } = await sb.from('remodel_projects').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', rmState.currentProject.id);
  if (error) return alert('Error: ' + error.message);
  await rmLoadAll();
  alert('✓ Proyecto marcado como completado. Sus actuales ya alimentan el modelo dinámico.');
  rmRenderTab();
}

// ─── S1-G2: Versionado + Change Orders ───

async function rmLoadVersionsAndCOs(projectId) {
  if (!projectId) { rmState.versions = []; rmState.changeOrders = []; return; }
  const [v, co] = await Promise.all([
    sb.from('remodel_budget_versions').select('*').eq('project_id', projectId).order('version', { ascending: false }),
    sb.from('remodel_change_orders').select('*').eq('project_id', projectId).order('number', { ascending: false })
  ]);
  rmState.versions = v.data || [];
  rmState.changeOrders = co.data || [];
}

async function rmApproveBudgetVersion() {
  if (!rmState.currentProject?.id) return alert('Guardá el proyecto primero en el Editor.');
  const e = rmCalcProject();
  if (e.activities.length === 0) return alert('No hay actividades para versionar.');

  const label = prompt('Etiqueta para esta versión (ej: "Aprobado inicial", "Post change order 1"):', `v${rmState.versions.length + 1} — ${new Date().toLocaleDateString('es-MX')}`);
  if (label === null) return; // cancel
  const approvedBy = prompt('¿Quién aprueba? (nombre o email del cliente/lender/partner):', '');
  if (approvedBy === null) return;

  // Calcular siguiente version number
  const { data: nv, error: nvErr } = await sb.rpc('next_budget_version', { p_project_id: rmState.currentProject.id });
  if (nvErr) return alert('Error obteniendo siguiente versión: ' + nvErr.message);

  const payload = {
    project_id: rmState.currentProject.id,
    version: nv,
    label: label || `v${nv}`,
    activities: e.activities,
    budget_total: e.pricing.clientPrice,
    budget_material: e.totals.material,
    budget_labor: e.totals.labor,
    budget_equipment: e.totals.equipment,
    pricing: {
      contingencyPct: rmState.contingencyPct,
      overheadPct: rmState.overheadPct,
      markupPct: rmState.markupPct,
      permitsCost: rmState.permitsCost,
      designFeesCost: rmState.designFeesCost,
      directCost: e.pricing.directCost,
      internalCost: e.pricing.internalCost,
      profit: e.pricing.profit,
      profitMarginPct: e.pricing.profitMarginPct,
      totalDays: e.totalDays
    },
    sqft: rmState.editSqft,
    approved_by: approvedBy || null,
    approved_at: approvedBy ? new Date().toISOString() : null,
    created_by: state.user?.id || null
  };

  const { error } = await sb.from('remodel_budget_versions').insert(payload);
  if (error) return alert('Error guardando versión: ' + error.message);
  await rmLoadVersionsAndCOs(rmState.currentProject.id);
  alert(`✓ Versión ${nv} creada${approvedBy?' y aprobada por '+approvedBy:''}`);
  rmRenderTab();
}

// Compara la versión última aprobada vs el estado actual del Editor.
// Devuelve { added: [{code, total}], removed: [{code, total}], modified: [{code, before, after, delta}], deltaCost, deltaDays }
function rmDiffAgainstVersion(versionRow) {
  const e = rmCalcProject();
  const prevActs = (versionRow.activities || []).reduce((m, a) => { m[a.code] = a; return m; }, {});
  const curActs = e.activities.reduce((m, a) => { m[a.code] = a; return m; }, {});

  const added = [];
  const removed = [];
  const modified = [];
  Object.keys(curActs).forEach(code => {
    if (!prevActs[code]) {
      added.push({ code, desc: curActs[code].desc, total: +curActs[code].total || 0 });
    } else {
      const before = +prevActs[code].total || 0;
      const after = +curActs[code].total || 0;
      if (Math.abs(after - before) > 0.5) {
        modified.push({ code, desc: curActs[code].desc, before, after, delta: after - before });
      }
    }
  });
  Object.keys(prevActs).forEach(code => {
    if (!curActs[code]) {
      removed.push({ code, desc: prevActs[code].desc, total: +prevActs[code].total || 0 });
    }
  });

  const deltaCost = e.pricing.clientPrice - (+versionRow.budget_total || 0);
  const prevDays = (versionRow.pricing && +versionRow.pricing.totalDays) || 0;
  const deltaDays = e.totalDays - prevDays;
  return { added, removed, modified, deltaCost, deltaDays };
}

async function rmCreateChangeOrder() {
  if (!rmState.currentProject?.id) return alert('Guardá el proyecto primero.');
  const lastApproved = rmState.versions.find(v => v.approved_at);
  if (!lastApproved) return alert('No hay versión aprobada todavía. Primero "📋 Aprobar versión actual".');

  const diff = rmDiffAgainstVersion(lastApproved);
  if (!diff.added.length && !diff.removed.length && !diff.modified.length) {
    return alert('No hay cambios vs la última versión aprobada (v' + lastApproved.version + '). Modificá actividades en el Editor primero.');
  }

  const title = prompt('Título del change order (ej: "Agregar quartz en isla cocina"):', '');
  if (title === null) return;
  const reason = prompt('Razón (cliente_solicitado / hallazgo_obra / codigo_local / otro):', 'cliente_solicitado');
  if (reason === null) return;
  const description = prompt('Descripción detallada (opcional):', '');

  // Snapshot de la versión NUEVA primero
  await rmApproveBudgetVersion();
  await rmLoadVersionsAndCOs(rmState.currentProject.id);
  const newVersion = rmState.versions[0]; // la más reciente

  const { data: nco, error: nErr } = await sb.rpc('next_change_order_number', { p_project_id: rmState.currentProject.id });
  if (nErr) return alert('Error obteniendo CO#: ' + nErr.message);

  const payload = {
    project_id: rmState.currentProject.id,
    from_version: lastApproved.version,
    to_version: newVersion.version,
    number: nco,
    title: title || `CO #${nco}`,
    description: description || null,
    reason: reason || 'otro',
    delta_cost: diff.deltaCost,
    delta_days: diff.deltaDays,
    activities_added: diff.added,
    activities_removed: diff.removed,
    activities_modified: diff.modified,
    status: 'pending',
    created_by: state.user?.id || null
  };

  const { error } = await sb.from('remodel_change_orders').insert(payload);
  if (error) return alert('Error creando CO: ' + error.message);
  await rmLoadVersionsAndCOs(rmState.currentProject.id);
  alert(`✓ Change Order #${nco} creado (delta ${diff.deltaCost >= 0 ? '+' : ''}${rmFmt(diff.deltaCost)} · ${diff.deltaDays >= 0 ? '+' : ''}${diff.deltaDays}d). Pasá a tab Historial para aprobarlo.`);
  rmState.tab = 'versions';
  rmRender();
}

async function rmApproveChangeOrder(coId) {
  const approvedBy = prompt('Cliente que aprueba (nombre o email):', '');
  if (approvedBy === null || approvedBy.trim() === '') return;
  const { error } = await sb.from('remodel_change_orders').update({
    status: 'approved',
    client_approved: true,
    client_approved_by: approvedBy,
    client_approved_at: new Date().toISOString()
  }).eq('id', coId);
  if (error) return alert('Error: ' + error.message);
  await rmLoadVersionsAndCOs(rmState.currentProject.id);
  alert('✓ Change Order aprobado por ' + approvedBy);
  rmRenderTab();
}

async function rmRejectChangeOrder(coId) {
  if (!confirm('¿Rechazar este Change Order? El cambio queda registrado pero marcado como rechazado.')) return;
  const { error } = await sb.from('remodel_change_orders').update({ status: 'rejected' }).eq('id', coId);
  if (error) return alert('Error: ' + error.message);
  await rmLoadVersionsAndCOs(rmState.currentProject.id);
  rmRenderTab();
}

function rmRenderVersions(body) {
  if (!rmState.currentProject) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">
      Cargá un proyecto desde <strong>📁 Proyectos</strong> para ver su historial de versiones y change orders.
    </div>`;
    return;
  }

  const lastApproved = rmState.versions.find(v => v.approved_at);
  const cosByStatus = { pending: [], approved: [], rejected: [], executed: [] };
  rmState.changeOrders.forEach(co => {
    (cosByStatus[co.status] || (cosByStatus.pending)).push(co);
  });

  body.innerHTML = `
    <div class="flex justify-between items-end mb-3 flex-wrap gap-2">
      <div>
        <h2 class="text-lg font-bold">📜 Historial — ${rmState.currentProject.name}</h2>
        <p class="text-xs text-slate-500">Versiones aprobadas del presupuesto y change orders ejecutados.</p>
      </div>
      <div class="flex gap-2">
        <button onclick="rmApproveBudgetVersion()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded">📋 Aprobar versión actual</button>
        ${lastApproved ? `<button onclick="rmCreateChangeOrder()" class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded">🔄 Crear Change Order</button>` : ''}
      </div>
    </div>

    <!-- Versiones -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
      <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">Versiones aprobadas (${rmState.versions.length})</div>
      ${rmState.versions.length === 0 ? `
        <div class="p-6 text-center text-xs text-slate-400">Sin versiones aún. Click "📋 Aprobar versión actual" para snapshot del Editor.</div>
      ` : `
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr><th class="text-left p-2">v#</th><th class="text-left p-2">Etiqueta</th><th class="text-right p-2">Budget</th><th class="text-right p-2">$/ft²</th><th class="text-left p-2">Aprobado por</th><th class="text-right p-2">Aprobado</th><th class="text-left p-2"># Activ.</th></tr>
          </thead>
          <tbody>
            ${rmState.versions.map(v => `
              <tr class="border-t border-slate-100 hover:bg-slate-50">
                <td class="p-2 font-bold">v${v.version}</td>
                <td class="p-2">${v.label || '—'}</td>
                <td class="p-2 text-right font-bold">${rmFmt(v.budget_total)}</td>
                <td class="p-2 text-right text-slate-500">${v.sqft ? '$' + (v.budget_total/v.sqft).toFixed(0) : '—'}</td>
                <td class="p-2 text-slate-700">${v.approved_by || '<span class="text-amber-600">⏳ borrador</span>'}</td>
                <td class="p-2 text-right text-slate-500">${v.approved_at ? rmFmtDate(v.approved_at) : '—'}</td>
                <td class="p-2 text-slate-500">${(v.activities || []).length}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Change Orders -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">Change Orders (${rmState.changeOrders.length})</div>
      ${rmState.changeOrders.length === 0 ? `
        <div class="p-6 text-center text-xs text-slate-400">Sin change orders. Modificá actividades en el Editor y click "🔄 Crear Change Order".</div>
      ` : `
        <div class="divide-y divide-slate-100">
          ${rmState.changeOrders.map(co => {
            const tone = co.status === 'approved' ? 'emerald' : co.status === 'rejected' ? 'red' : co.status === 'executed' ? 'blue' : 'amber';
            const icon = co.status === 'approved' ? '✅' : co.status === 'rejected' ? '❌' : co.status === 'executed' ? '⚙️' : '⏳';
            return `
              <div class="p-3">
                <div class="flex justify-between items-start gap-3 flex-wrap">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-bold">CO #${co.number}</span>
                      <span class="text-[10px] bg-${tone}-100 text-${tone}-800 px-2 py-0.5 rounded">${icon} ${co.status}</span>
                      <span class="text-[10px] text-slate-500">v${co.from_version} → v${co.to_version}</span>
                      <span class="text-[10px] text-slate-500">${co.reason || ''}</span>
                    </div>
                    <div class="text-sm font-semibold mt-1">${co.title || '(sin título)'}</div>
                    ${co.description ? `<div class="text-xs text-slate-600 mt-0.5">${co.description}</div>` : ''}
                  </div>
                  <div class="text-right whitespace-nowrap">
                    <div class="text-sm font-bold ${co.delta_cost > 0 ? 'text-red-700' : 'text-emerald-700'}">${co.delta_cost > 0 ? '+' : ''}${rmFmt(co.delta_cost)}</div>
                    <div class="text-[10px] text-slate-500">${co.delta_days > 0 ? '+' : ''}${co.delta_days}d</div>
                  </div>
                </div>
                <div class="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div class="bg-emerald-50 rounded p-1.5"><strong>+ ${(co.activities_added||[]).length}</strong> nuevas</div>
                  <div class="bg-red-50 rounded p-1.5"><strong>− ${(co.activities_removed||[]).length}</strong> removidas</div>
                  <div class="bg-amber-50 rounded p-1.5"><strong>~ ${(co.activities_modified||[]).length}</strong> modificadas</div>
                </div>
                ${co.status === 'pending' ? `
                  <div class="mt-2 flex gap-2">
                    <button onclick="rmApproveChangeOrder('${co.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded">✅ Aprobar</button>
                    <button onclick="rmRejectChangeOrder('${co.id}')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1 rounded">❌ Rechazar</button>
                  </div>
                ` : co.client_approved_by ? `
                  <div class="mt-2 text-[10px] text-slate-500">Aprobado por ${co.client_approved_by} el ${rmFmtDate(co.client_approved_at)}</div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <div class="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-950">
      <strong>💡 Flujo recomendado:</strong>
      <ol class="mt-1 ml-4 list-decimal space-y-0.5">
        <li>Editor → ajustás presupuesto → click "<strong>📋 Aprobar versión actual</strong>" → snapshot v1 con firma del cliente</li>
        <li>Cliente pide cambio → modificás actividades en el Editor → click "<strong>🔄 Crear Change Order</strong>" → snapshot v2 + diff vs v1</li>
        <li>Cliente revisa el delta y aprueba o rechaza el CO desde acá</li>
        <li>El SOW Lender usa siempre la última versión aprobada (vista <code class="bg-blue-100 px-1 rounded">remodel_latest_approved_version</code>)</li>
      </ol>
    </div>
  `;
}

// ─── CHARTS (Chart.js): Pie costo por grupo + Bar stacked Material/MO/Equipo ───
let _rmPieChart = null, _rmBarChart = null;
function rmRenderCharts(e) {
  if (typeof Chart === 'undefined') return;
  const pieEl = document.getElementById('rm-chart-pie');
  const barEl = document.getElementById('rm-chart-bar');
  if (_rmPieChart) { _rmPieChart.destroy(); _rmPieChart = null; }
  if (_rmBarChart) { _rmBarChart.destroy(); _rmBarChart = null; }
  if (!pieEl || !barEl) return;

  // Grupos con costo > 0 (Cimentación queda excluida si está en $0, igual que el doc)
  const groups = Object.entries(RM_PHASES).map(([p, info]) => ({
    id: p, name: info.name, color: info.color,
    total: e.byPhase[p]?.total || 0,
    material: e.byPhase[p]?.material || 0,
    labor: e.byPhase[p]?.labor || 0,
    equipment: e.byPhase[p]?.equipment || 0
  })).filter(g => g.total > 0);

  if (groups.length === 0) return;

  _rmPieChart = new Chart(pieEl, {
    type: 'doughnut',
    data: {
      labels: groups.map(g => g.name),
      datasets: [{ data: groups.map(g => Math.round(g.total)), backgroundColor: groups.map(g => g.color), borderWidth: 1 }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10, padding: 6 } },
        tooltip: { callbacks: { label: (c) => `${c.label}: ${rmFmt(c.raw)} (${(c.raw/e.totals.total*100).toFixed(0)}%)` } }
      }
    }
  });

  _rmBarChart = new Chart(barEl, {
    type: 'bar',
    data: {
      labels: groups.map(g => g.name),
      datasets: [
        { label: 'Material', data: groups.map(g => Math.round(g.material)), backgroundColor: '#3b82f6' },
        { label: 'Mano de obra', data: groups.map(g => Math.round(g.labor)), backgroundColor: '#a855f7' },
        { label: 'Equipo', data: groups.map(g => Math.round(g.equipment)), backgroundColor: '#64748b' }
      ]
    },
    options: {
      responsive: true,
      scales: { x: { stacked: true, ticks: { font: { size: 8 } } }, y: { stacked: true, ticks: { font: { size: 8 }, callback: (v) => '$' + (v/1000) + 'k' } } },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10, padding: 6 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${rmFmt(c.raw)}` } }
      }
    }
  });
}

// ─── EXPORT EXCEL multi-sheet (SheetJS): Config · Presupuesto · Cronograma ───
function rmBuildWorkbookForProject(proj) {
  // proj: { name, address, sqft, start_date, end_date_estimated, activities[], budget_*, pricing? }
  const acts = proj.activities || [];
  const sqft = +proj.sqft || 0;
  const tot = acts.reduce((a, x) => ({
    total: a.total + (+x.total||0), material: a.material + (+x.material||0),
    labor: a.labor + (+x.labor||0), equipment: a.equipment + (+x.equipment||0)
  }), { total:0, material:0, labor:0, equipment:0 });

  // Sheet 1: Config
  const configRows = [
    ['CONFIGURACIÓN DEL PROYECTO'],
    [],
    ['Nombre', proj.name || ''],
    ['Dirección', proj.address || ''],
    ['Sqft', sqft || ''],
    ['Fecha inicio', proj.start_date || ''],
    ['Fecha fin estimada', proj.end_date_estimated || ''],
    [],
    ['Presupuesto total (costo directo)', Math.round(tot.total)],
    ['$ / sqft', sqft ? +(tot.total/sqft).toFixed(2) : ''],
    ['Materiales', Math.round(tot.material)],
    ['Mano de obra', Math.round(tot.labor)],
    ['Equipo', Math.round(tot.equipment)],
  ];
  if (proj.budget_total) configRows.push([], ['Precio cliente (guardado)', Math.round(proj.budget_total)]);

  // Sheet 2: Presupuesto (por actividad agrupado por fase)
  const budgetRows = [['Código','Grupo','Subcategoría','Descripción','Unidad','Cant.','$/u','Material','Mano obra','Equipo','TOTAL','Días']];
  const phases = ['1','2','3','4','5','6'];
  phases.forEach(p => {
    const inPhase = acts.filter(a => a.phase === p);
    if (!inPhase.length) return;
    const ph = RM_PHASES[p];
    budgetRows.push([`${p}. ${ph?.name || ''}`.toUpperCase(), '', '', '', '', '', '', '', '', '', '', '']);
    inPhase.forEach(a => budgetRows.push([
      a.code, ph?.name || '', a.subcat || '', a.desc || '', a.unit || '',
      +a.qty || 0, +a.vu || 0, Math.round(+a.material||0), Math.round(+a.labor||0),
      Math.round(+a.equipment||0), Math.round(+a.total||0), +a.days || 0
    ]));
    const pt = inPhase.reduce((a,x) => ({ m:a.m+(+x.material||0), l:a.l+(+x.labor||0), e:a.e+(+x.equipment||0), t:a.t+(+x.total||0) }), {m:0,l:0,e:0,t:0});
    budgetRows.push(['', '', '', `Subtotal ${ph?.name||''}`, '', '', '', Math.round(pt.m), Math.round(pt.l), Math.round(pt.e), Math.round(pt.t), '']);
  });
  budgetRows.push([]);
  budgetRows.push(['', '', '', 'TOTAL COSTO DIRECTO', '', '', '', Math.round(tot.material), Math.round(tot.labor), Math.round(tot.equipment), Math.round(tot.total), '']);

  // Sheet 3: Cronograma (Gantt por fase secuencial)
  const ganttRows = [['Fase','Inicio (offset días)','Días','Actividades']];
  let cursor = 0;
  phases.forEach(p => {
    const inPhase = acts.filter(a => a.phase === p);
    if (!inPhase.length) return;
    const ph = RM_PHASES[p];
    const days = Math.max(0, ...inPhase.map(a => (+a.start_offset||0) + (+a.days||0)));
    ganttRows.push([`${p}. ${ph?.name||''}`, cursor, days, inPhase.length]);
    cursor += days;
  });
  ganttRows.push([]);
  ganttRows.push(['TOTAL DÍAS', '', cursor, '']);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(configRows), 'Config');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budgetRows), 'Presupuesto');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ganttRows), 'Cronograma');
  return wb;
}

function rmExportEditorExcel() {
  if (typeof XLSX === 'undefined') return alert('Librería Excel aún cargando, reintentá en 1 seg.');
  const e = rmCalcProject();
  if (!e.activities.length) return alert('Agrega actividades antes de exportar.');
  const proj = {
    name: rmState.editName || 'Proyecto', address: rmState.editAddress, sqft: rmState.editSqft,
    start_date: rmState.editStartDate,
    end_date_estimated: e.totalDays ? rmAddDays(new Date(rmState.editStartDate), e.totalDays).toISOString().split('T')[0] : '',
    activities: e.activities, budget_total: e.pricing.clientPrice
  };
  const wb = rmBuildWorkbookForProject(proj);
  XLSX.writeFile(wb, `Presupuesto_${(proj.name||'proyecto').replace(/[^a-z0-9]/gi,'_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function rmExportProjectExcel(projectId) {
  if (typeof XLSX === 'undefined') return alert('Librería Excel aún cargando.');
  const p = rmState.projects.find(x => x.id === projectId);
  if (!p) return alert('Proyecto no encontrado');
  const wb = rmBuildWorkbookForProject(p);
  XLSX.writeFile(wb, `Presupuesto_${(p.name||'proyecto').replace(/[^a-z0-9]/gi,'_')}.xlsx`);
}

function rmExportAllExcel() {
  if (typeof XLSX === 'undefined') return alert('Librería Excel aún cargando.');
  if (!rmState.projects.length) return alert('Sin proyectos para exportar.');
  const wb = XLSX.utils.book_new();
  // Hoja resumen del portfolio
  const resumen = [['RESUMEN PORTFOLIO REMODELACIÓN'], [],
    ['Proyecto','Sqft','Presupuesto','$/sqft','Material','Mano obra','Equipo','Real','Status','Inicio']];
  rmState.projects.forEach(p => {
    resumen.push([
      p.name||'', +p.sqft||0, Math.round(+p.budget_total||0),
      p.sqft ? +((+p.budget_total||0)/p.sqft).toFixed(0) : '',
      Math.round(+p.budget_material||0), Math.round(+p.budget_labor||0), Math.round(+p.budget_equipment||0),
      Math.round(+p.real_total||0), p.status||'', p.start_date||''
    ]);
  });
  const totBudget = rmState.projects.reduce((s,p) => s + (+p.budget_total||0), 0);
  resumen.push([], ['TOTAL', '', Math.round(totBudget)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');
  // Una hoja de presupuesto por proyecto (máx 20 para no saturar)
  rmState.projects.slice(0, 20).forEach((p, i) => {
    const acts = p.activities || [];
    const rows = [['Código','Grupo','Descripción','Cant.','$/u','Material','MO','Equipo','TOTAL','Días']];
    acts.forEach(a => rows.push([a.code, RM_PHASES[a.phase]?.name||'', a.desc||'', +a.qty||0, +a.vu||0, Math.round(+a.material||0), Math.round(+a.labor||0), Math.round(+a.equipment||0), Math.round(+a.total||0), +a.days||0]));
    const safeName = (p.name||('Proj'+i)).replace(/[^a-z0-9 ]/gi,'').slice(0,28) || ('Proj'+i);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), safeName);
  });
  XLSX.writeFile(wb, `Portfolio_Remodelacion_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    const cat = rmGetCatalog().find(c => c.code === code);
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
        activity_code: code, // S6-U2: link a catalog para validar dependencias CPM
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
    const cat = rmGetCatalog().find(c => c.code === code);
    rmState.selectedActivities[code] = { qty: 1, vu: cat.vu, days: Math.max(1, Math.ceil(cat.days_per_qty)), start_offset: 0 };
  }
  rmRenderTab();
}
function rmSetQty(code, v) { if(!rmState.selectedActivities[code])return; rmState.selectedActivities[code].qty = +v; rmRenderTab(); }
function rmSetVu(code, v) { if(!rmState.selectedActivities[code])return; rmState.selectedActivities[code].vu = +v; rmRenderTab(); }
function rmSetDays(code, v) { if(!rmState.selectedActivities[code])return; rmState.selectedActivities[code].days = +v; rmRenderTab(); }

// QW2 — Auto-calcula permitsCost para Austin TX según sqft
// Fórmula: $1,500 base + $0.50 por ft² sobre 1,500
function rmAutoPermitsAustin() {
  const sqft = +rmState.editSqft || 0;
  const over = Math.max(0, sqft - 1500);
  const auto = 1500 + over * 0.50;
  rmState.permitsCost = Math.round(auto);
  rmRenderTab();
}

// QW6 — Validación URL Matterport (no bloqueante)
function rmIsValidMatterport(url) {
  if (!url) return true; // vacío es válido (opcional)
  return /(?:my\.matterport\.com\/show\/\?m=|matterport\.com\/discover\/space\/)[A-Za-z0-9]+/.test(url);
}

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

  // S3-G3: Modo CPM vs Modo Simple
  const cpmOn = !!rmState.cpmMode;
  const cpmDays = e.cpm?.totalDays || 0;
  const baseDays = cpmOn ? cpmDays : e.totalDays;
  const realisticTotal = baseDays + Math.ceil(inspectionDays);
  const totalSpan = realisticTotal || 1;
  const cpmErr = e.cpm?.error;

  body.innerHTML = `
    <div class="flex items-end justify-between mb-3 flex-wrap gap-2">
      <h2 class="text-lg font-bold">📅 Cronograma ${cpmOn?'CPM real':'lineal'} — ${rmState.editName || 'Proyecto'}</h2>
      <!-- S3-G3 Toggle CPM -->
      <div class="inline-flex border border-slate-300 rounded-lg overflow-hidden text-xs">
        <button onclick="rmState.cpmMode=false; rmRenderTab()" class="px-3 py-1.5 font-semibold ${!cpmOn?'bg-slate-900 text-white':'bg-white text-slate-600 hover:bg-slate-50'}">📊 Lineal por fase</button>
        <button onclick="rmState.cpmMode=true; rmRenderTab()" class="px-3 py-1.5 font-semibold ${cpmOn?'bg-slate-900 text-white':'bg-white text-slate-600 hover:bg-slate-50'}">🔀 CPM avanzado</button>
      </div>
    </div>
    ${cpmOn && cpmErr ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900 mb-3">⚠️ ${cpmErr}. Revisá las dependencias en el tab Catálogo (probablemente hay un ciclo).</div>` : ''}
    ${cpmOn && !cpmErr ? `
      <div class="bg-purple-50 border border-purple-200 rounded p-2 text-xs text-purple-950 mb-3">
        <strong>Modo CPM activo.</strong> El sistema calcula el cronograma respetando dependencias (depends_on). Actividades en ruta crítica (rojo) no tienen slack — atrasos acá atrasan todo el proyecto. Editá dependencias en el tab Catálogo.
      </div>
    ` : ''}
    <div class="grid grid-cols-4 gap-3 mb-4">
      <div class="bg-slate-50 rounded p-2"><div class="text-[10px] text-slate-500 uppercase font-bold">Sin inspecciones</div><div class="text-lg font-bold">${baseDays} días</div>${cpmOn?`<div class="text-[9px] text-slate-500">CPM (vs ${e.totalDays}d lineal)</div>`:''}</div>
      <div class="bg-amber-50 rounded p-2"><div class="text-[10px] text-amber-700 uppercase font-bold">+ Inspecciones</div><div class="text-lg font-bold text-amber-700">+${Math.ceil(inspectionDays)} días</div></div>
      <div class="bg-blue-50 rounded p-2"><div class="text-[10px] text-blue-700 uppercase font-bold">+ Lead times max</div><div class="text-lg font-bold text-blue-700">+${Math.max(0, ...leadTimeAlerts.map(l=>l.lead_days))} días</div><div class="text-[9px] text-slate-500">en paralelo a obra</div></div>
      <div class="bg-emerald-50 rounded p-2"><div class="text-[10px] text-emerald-700 uppercase font-bold">Realista total</div><div class="text-lg font-bold text-emerald-700">${realisticTotal} días</div><div class="text-[9px]">${rmFmtDate(rmAddDays(new Date(rmState.editStartDate), realisticTotal))}</div></div>
    </div>

    ${cpmOn && !cpmErr ? rmRenderGanttCPM(e) : ''}

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

// S3-G3: Render Gantt CPM (actividades individuales, critical path en rojo, slack visualizado)
function rmRenderGanttCPM(e) {
  if (!e.cpm || e.cpm.error) return '';
  const startDate = new Date(rmState.editStartDate);
  const totalDays = e.cpm.totalDays || 1;
  const cpStats = {
    critical: e.cpm.criticalPath.length,
    total: Object.keys(e.cpm.byCode).length,
    maxSlack: Math.max(0, ...Object.values(e.cpm.byCode).map(n => n.slack))
  };

  // Agrupo por fase para el render, pero el posicionamiento es por ES/EF
  const byPhase = {};
  e.activities.forEach(a => {
    if (!byPhase[a.phase]) byPhase[a.phase] = [];
    byPhase[a.phase].push(a);
  });

  return `
    <!-- KPIs CPM -->
    <div class="grid grid-cols-4 gap-2 mb-3 text-xs">
      <div class="bg-red-50 border border-red-200 rounded p-2">
        <div class="text-[10px] uppercase font-bold text-red-700">Critical path</div>
        <div class="text-lg font-bold text-red-900">${cpStats.critical} de ${cpStats.total}</div>
        <div class="text-[9px] text-red-600">${e.cpm.criticalPath.slice(0,6).join(' → ')}${e.cpm.criticalPath.length > 6 ? '…' : ''}</div>
      </div>
      <div class="bg-emerald-50 border border-emerald-200 rounded p-2">
        <div class="text-[10px] uppercase font-bold text-emerald-700">Con slack</div>
        <div class="text-lg font-bold text-emerald-900">${cpStats.total - cpStats.critical}</div>
        <div class="text-[9px] text-emerald-600">Max slack: ${cpStats.maxSlack}d</div>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded p-2">
        <div class="text-[10px] uppercase font-bold text-blue-700">Duración CPM</div>
        <div class="text-lg font-bold text-blue-900">${totalDays} días</div>
        <div class="text-[9px] text-slate-500">Sin inspecciones</div>
      </div>
      <div class="bg-amber-50 border border-amber-200 rounded p-2">
        <div class="text-[10px] uppercase font-bold text-amber-700">Ahorro vs lineal</div>
        <div class="text-lg font-bold text-amber-900">${e.totalDays - totalDays}d</div>
        <div class="text-[9px] text-amber-700">${e.totalDays > 0 ? Math.round((e.totalDays - totalDays) / e.totalDays * 100) : 0}% más rápido</div>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <div class="flex items-center gap-3 mb-3 text-[10px]">
        <h3 class="text-xs font-bold uppercase text-slate-700">Gantt CPM por actividad</h3>
        <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 bg-red-500 rounded"></span>Crítica</span>
        <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 bg-blue-500 rounded"></span>Con slack</span>
        <span class="flex items-center gap-1"><span class="inline-block w-3 h-2 bg-slate-300 rounded"></span>Slack disponible</span>
      </div>

      <div class="space-y-3">
        ${Object.entries(RM_PHASES).map(([p, info]) => {
          const acts = byPhase[p];
          if (!acts || !acts.length) return '';
          return `
            <div>
              <div class="text-[10px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">${info.icon} ${p}. ${info.name}</div>
              <div class="space-y-0.5">
                ${acts.map(a => {
                  const n = e.cpm.byCode[a.code];
                  if (!n) return '';
                  const leftPct = (n.es / totalDays) * 100;
                  const widthPct = (n.duration / totalDays) * 100;
                  const slackPct = (n.slack / totalDays) * 100;
                  const barColor = n.critical ? 'bg-red-500' : 'bg-blue-500';
                  return `
                    <div class="grid grid-cols-[180px_1fr] gap-2 items-center text-[10px]">
                      <div class="truncate" title="${a.desc.replace(/"/g,'&quot;')}">
                        <span class="font-mono text-slate-400">${a.code}</span> ${a.desc.length > 25 ? a.desc.slice(0,25)+'…' : a.desc}
                      </div>
                      <div class="relative h-5 bg-slate-100 rounded">
                        <div class="absolute h-full ${barColor} rounded text-white text-[9px] font-bold flex items-center justify-center px-1"
                          style="left:${leftPct}%; width:${widthPct}%;"
                          title="${a.desc}: ES=${n.es}d, EF=${n.ef}d, duración=${n.duration}d, slack=${n.slack}d, deps=[${n.deps.join(', ')||'ninguna'}]">
                          ${n.duration}d
                        </div>
                        ${n.slack > 0 ? `<div class="absolute h-full bg-slate-300 opacity-50 rounded-r"
                          style="left:${leftPct + widthPct}%; width:${slackPct}%;"></div>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Critical path detallado -->
    <div class="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
      <h3 class="text-xs font-bold uppercase text-red-900 mb-2">🔴 Critical path (${e.cpm.criticalPath.length} actividades)</h3>
      <div class="text-[11px] text-red-950">Cualquier atraso en estas actividades atrasa todo el proyecto:</div>
      <ol class="mt-1 text-[11px] list-decimal ml-5 space-y-0.5">
        ${e.cpm.criticalPath.map(c => {
          const n = e.cpm.byCode[c];
          const a = e.activities.find(x => x.code === c);
          return `<li><span class="font-mono text-[10px]">${c}</span> ${a?.desc || ''} <span class="text-slate-600">(${n.duration}d, día ${n.es}→${n.ef})</span></li>`;
        }).join('')}
      </ol>
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
        <input value="${rmState.matterportUrl}" oninput="rmState.matterportUrl=this.value" onblur="rmRenderTabPreservingFocus()" placeholder="https://my.matterport.com/show/?m=XXXXX" class="w-full border ${rmState.matterportUrl && !rmIsValidMatterport(rmState.matterportUrl) ? 'border-amber-400' : 'border-slate-300'} rounded px-3 py-2 text-sm" />
        ${rmState.matterportUrl && !rmIsValidMatterport(rmState.matterportUrl) ? `
          <p class="text-[10px] text-amber-700 mt-0.5 flex items-start gap-1"><span>⚠️</span><span>URL no parece de Matterport (esperado <code class="bg-amber-50 px-1 rounded">my.matterport.com/show/?m=…</code> o <code class="bg-amber-50 px-1 rounded">matterport.com/discover/space/…</code>). Se guarda igual.</span></p>
        ` : `
          <p class="text-[10px] text-slate-400 mt-0.5">Pega el link y click fuera del campo para preview.</p>
        `}
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
    const cat = rmGetCatalog().find(c => c.code === code);
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

// ============================================================
// S2-G4 · TAB CATÁLOGO (CRUD) + S2-G5 · Suppliers
// ============================================================

async function rmCatalogSave(code, payload) {
  // upsert por code
  const row = { ...payload, code };
  const { error } = await sb.from('remodel_catalog_items').upsert(row, { onConflict: 'code' });
  if (error) return alert('Error: ' + error.message);
  await rmLoadCatalog();
  rmRenderTab();
}

async function rmCatalogUpdateField(code, field, value) {
  const upd = {};
  upd[field] = (field === 'description' || field === 'subcat' || field === 'unit' || field === 'phase') ? value : (value === '' ? null : +value);
  const { error } = await sb.from('remodel_catalog_items').update(upd).eq('code', code);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCatalog();
  rmRenderTabDebounced();
}

// S3-G3: Update depends_on (text[]) parsing comma-separated input
async function rmCatalogUpdateDeps(code, value) {
  // "5.4.1, 5.6.1" → ['5.4.1','5.6.1']
  const allCodes = new Set(rmGetCatalog().map(c => c.code));
  const newDeps = (value || '').split(',').map(s => s.trim()).filter(Boolean);
  const invalid = newDeps.filter(d => !allCodes.has(d));
  if (invalid.length) {
    return alert('Códigos inválidos: ' + invalid.join(', ') + '\n\nUsá codes que existan en el catálogo.');
  }
  if (newDeps.includes(code)) {
    return alert('Una actividad no puede depender de sí misma.');
  }
  const { error } = await sb.from('remodel_catalog_items').update({ depends_on: newDeps }).eq('code', code);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCatalog();
  rmRenderTab();
}

async function rmCatalogToggleActive(code, currentActive) {
  const { error } = await sb.from('remodel_catalog_items').update({ active: !currentActive }).eq('code', code);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCatalog();
  rmRenderTab();
}

async function rmCatalogDelete(code) {
  if (!confirm(`¿Borrar ${code} del catálogo?\n\nSi es seed lo mejor es DESACTIVAR (no borrar) para no romper proyectos viejos.`)) return;
  const { error } = await sb.from('remodel_catalog_items').delete().eq('code', code);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCatalog();
  rmRenderTab();
}

async function rmCatalogAddNew() {
  const n = rmState.catalogNew;
  if (!n.code || !n.description) return alert('Code y Descripción son obligatorios.');
  if (rmGetCatalog().some(c => c.code === n.code)) return alert('El code ya existe.');
  const { error } = await sb.from('remodel_catalog_items').insert({
    code: n.code, phase: n.phase, subcat: n.subcat || null, description: n.description,
    unit: n.unit, vu_default: +n.vu_default || 0, mat_pct: +n.mat_pct || 0.5,
    days_per_qty: +n.days_per_qty || 0, active: n.active, is_seed: false,
    created_by: state.user?.id || null
  });
  if (error) return alert('Error: ' + error.message);
  rmState.catalogNew = { code:'', phase:'5', subcat:'', description:'', unit:'unit', vu_default:0, mat_pct:0.5, days_per_qty:1, active:true };
  rmState.catalogEditView = 'list';
  await rmLoadCatalog();
  rmRenderTab();
}

function rmCatalogExportJson() {
  const data = rmGetCatalog();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `catalogo_remodel_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// S2-G5 helpers
async function rmSupplierAdd() {
  const name = prompt('Nombre del supplier:');
  if (!name) return;
  const type = prompt('Tipo (general/materiales/labor/equipo/servicio/distribuidor):', 'materiales') || 'general';
  const city = prompt('Ciudad (opcional):', 'Austin TX') || null;
  const { error } = await sb.from('remodel_suppliers').insert({ name, type, city, active: true, created_by: state.user?.id || null });
  if (error) return alert('Error: ' + error.message);
  await rmLoadSuppliers();
  rmRenderTab();
}

async function rmSupplierTogglePreferred(id, current) {
  const { error } = await sb.from('remodel_suppliers').update({ preferred: !current }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await rmLoadSuppliers();
  rmRenderTab();
}

async function rmSupplierAddPrice(supplierId, supplierName) {
  const code = prompt('Activity code (ej. 5.4.2 para countertops):');
  if (!code) return;
  if (!rmGetCatalog().some(c => c.code === code)) return alert(`El code "${code}" no existe en el catálogo.`);
  const priceStr = prompt(`Precio unitario para ${code} en ${supplierName}:`);
  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) return alert('Precio inválido.');
  const source = prompt('Fuente (cotizacion/factura/estimado/website):', 'cotizacion') || 'cotizacion';
  const { error } = await sb.from('remodel_supplier_prices').insert({
    supplier_id: supplierId, activity_code: code, unit_price: price,
    source, created_by: state.user?.id || null
  });
  if (error) return alert('Error: ' + error.message);
  await rmLoadSuppliers();
  alert(`✓ Precio ${rmFmt(price)} guardado para ${code} en ${supplierName}`);
  rmRenderTab();
}

function rmRenderCatalog(body) {
  const cat = rmGetCatalog();
  const isFromDb = rmActiveCatalog !== null;
  const view = rmState.catalogEditView || 'list';
  const n = rmState.catalogNew;

  const byPhase = {};
  cat.forEach(c => { if (!byPhase[c.phase]) byPhase[c.phase] = []; byPhase[c.phase].push(c); });

  body.innerHTML = `
    <div class="flex justify-between items-end mb-3 flex-wrap gap-2">
      <div>
        <h2 class="text-lg font-bold">🛠 Catálogo de actividades</h2>
        <p class="text-xs text-slate-500">${cat.length} items ${isFromDb ? '· cargados desde DB (editables)' : '· fallback hardcodeado (correr s2-g4-catalog.sql para activar edición)'}</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        ${isFromDb ? `<button onclick="rmState.catalogEditView='${view==='new'?'list':'new'}'; rmRenderTab()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded">${view==='new'?'✕ Cancelar':'+ Agregar actividad'}</button>` : ''}
        <button onclick="rmCatalogExportJson()" class="bg-slate-100 hover:bg-slate-200 text-xs font-bold px-3 py-2 rounded">⬇️ Export JSON</button>
        <button onclick="rmState.tab='suppliers_sub'; rmRenderTab()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded">🏪 Suppliers (${rmState.suppliers.length})</button>
      </div>
    </div>

    ${view === 'new' && isFromDb ? `
      <div class="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 mb-3">
        <h3 class="text-sm font-bold text-emerald-900 mb-2">Nueva actividad</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div><label class="block text-[10px] text-slate-600 mb-0.5">Code *</label><input value="${n.code}" oninput="rmState.catalogNew.code=this.value" placeholder="ej. 5.4.7" class="w-full border border-slate-300 rounded px-2 py-1 font-mono" /></div>
          <div><label class="block text-[10px] text-slate-600 mb-0.5">Fase *</label><select onchange="rmState.catalogNew.phase=this.value" class="w-full border border-slate-300 rounded px-2 py-1">${Object.entries(RM_PHASES).map(([p,info]) => `<option value="${p}" ${n.phase===p?'selected':''}>${p}. ${info.name}</option>`).join('')}</select></div>
          <div><label class="block text-[10px] text-slate-600 mb-0.5">Subcategoría</label><input value="${n.subcat}" oninput="rmState.catalogNew.subcat=this.value" placeholder="ej. Cocina" class="w-full border border-slate-300 rounded px-2 py-1" /></div>
          <div><label class="block text-[10px] text-slate-600 mb-0.5">Unidad</label><input value="${n.unit}" oninput="rmState.catalogNew.unit=this.value" placeholder="ej. sqft" class="w-full border border-slate-300 rounded px-2 py-1" /></div>
          <div class="col-span-2 md:col-span-4"><label class="block text-[10px] text-slate-600 mb-0.5">Descripción *</label><input value="${n.description}" oninput="rmState.catalogNew.description=this.value" placeholder="Descripción de la actividad" class="w-full border border-slate-300 rounded px-2 py-1" /></div>
          <div><label class="block text-[10px] text-slate-600 mb-0.5">Precio default $</label><input type="number" step="0.01" value="${n.vu_default}" oninput="rmState.catalogNew.vu_default=this.value" class="w-full border border-slate-300 rounded px-2 py-1" /></div>
          <div><label class="block text-[10px] text-slate-600 mb-0.5">% Material (0-1)</label><input type="number" step="0.05" min="0" max="1" value="${n.mat_pct}" oninput="rmState.catalogNew.mat_pct=this.value" class="w-full border border-slate-300 rounded px-2 py-1" /></div>
          <div><label class="block text-[10px] text-slate-600 mb-0.5">Días por unidad</label><input type="number" step="0.001" value="${n.days_per_qty}" oninput="rmState.catalogNew.days_per_qty=this.value" class="w-full border border-slate-300 rounded px-2 py-1" /></div>
          <div class="flex items-end"><button onclick="rmCatalogAddNew()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded">💾 Crear</button></div>
        </div>
      </div>
    ` : ''}

    <div class="space-y-3">
      ${Object.entries(RM_PHASES).map(([p, info]) => {
        const items = (byPhase[p] || []).sort((a,b) => (a.code || '').localeCompare(b.code || ''));
        if (!items.length) return '';
        return `
          <details open class="bg-white rounded-xl border border-slate-200">
            <summary class="cursor-pointer px-3 py-2 flex items-center justify-between hover:bg-slate-50 sticky top-0 bg-white">
              <div class="flex items-center gap-2">
                <span class="text-lg">${info.icon}</span>
                <span class="font-bold text-sm">${p}. ${info.name}</span>
                <span class="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">${items.length} items</span>
              </div>
            </summary>
            <div class="border-t border-slate-100 overflow-x-auto">
              <table class="w-full text-[11px]">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="text-left p-1.5 w-20">Code</th>
                    <th class="text-left p-1.5 w-24">Subcat</th>
                    <th class="text-left p-1.5">Descripción</th>
                    <th class="text-left p-1.5 w-16">Unidad</th>
                    <th class="text-right p-1.5 w-20">VU default</th>
                    <th class="text-right p-1.5 w-14">Mat%</th>
                    <th class="text-right p-1.5 w-16">d/qty</th>
                    <th class="text-right p-1.5 w-20">Mejor precio</th>
                    <th class="text-left p-1.5 w-32" title="Depends on (CPM)">🔗 Depends on</th>
                    <th class="text-center p-1.5 w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(it => {
                    const ps = rmState.priceSummary[it.code];
                    const minP = ps ? ps.min_price : null;
                    const desviado = minP != null && it.vu > 0 && Math.abs(minP - it.vu) / it.vu > 0.15;
                    const editable = isFromDb;
                    return `
                      <tr class="border-t border-slate-100 ${!it.is_seed && editable?'bg-emerald-50/40':''}">
                        <td class="p-1 font-mono text-slate-700">${it.code}${!it.is_seed?'<span class="ml-1 text-[8px] bg-emerald-200 text-emerald-900 px-1 rounded">CUSTOM</span>':''}</td>
                        <td class="p-1">${editable?`<input value="${(it.subcat||'').replace(/"/g,'&quot;')}" onchange="rmCatalogUpdateField('${it.code}','subcat',this.value)" class="w-full border border-slate-200 rounded px-1 py-0.5 text-[11px]" />`:(it.subcat||'')}</td>
                        <td class="p-1">${editable?`<input value="${(it.desc||'').replace(/"/g,'&quot;')}" onchange="rmCatalogUpdateField('${it.code}','description',this.value)" class="w-full border border-slate-200 rounded px-1 py-0.5 text-[11px]" />`:(it.desc||'')}</td>
                        <td class="p-1">${editable?`<input value="${(it.unit||'').replace(/"/g,'&quot;')}" onchange="rmCatalogUpdateField('${it.code}','unit',this.value)" class="w-full border border-slate-200 rounded px-1 py-0.5 text-[11px]" />`:(it.unit||'')}</td>
                        <td class="p-1 text-right">${editable?`<input type="number" step="0.01" value="${it.vu}" onchange="rmCatalogUpdateField('${it.code}','vu_default',this.value)" class="w-full border border-slate-200 rounded px-1 py-0.5 text-right text-[11px]" />`:rmFmt2(it.vu)}</td>
                        <td class="p-1 text-right">${editable?`<input type="number" step="0.05" min="0" max="1" value="${it.mat_pct}" onchange="rmCatalogUpdateField('${it.code}','mat_pct',this.value)" class="w-full border border-slate-200 rounded px-1 py-0.5 text-right text-[11px]" />`:(it.mat_pct*100).toFixed(0)+'%'}</td>
                        <td class="p-1 text-right">${editable?`<input type="number" step="0.001" value="${it.days_per_qty}" onchange="rmCatalogUpdateField('${it.code}','days_per_qty',this.value)" class="w-full border border-slate-200 rounded px-1 py-0.5 text-right text-[11px]" />`:it.days_per_qty}</td>
                        <td class="p-1 text-right ${desviado?'bg-amber-100 font-bold':''}">${ps ? `<span title="${ps.num_suppliers} suppliers · pref: ${ps.preferred_supplier||'—'}">$${(+ps.min_price).toFixed(0)}</span>` : '<span class="text-slate-300">—</span>'}</td>
                        <td class="p-1">${editable?`<input value="${(it.depends_on||[]).join(', ').replace(/"/g,'&quot;')}" onchange="rmCatalogUpdateDeps('${it.code}',this.value)" placeholder="ej. 5.6.1, 5.4.1" title="Codes separados por coma. Editá para cambiar la dependencia." class="w-full border border-slate-200 rounded px-1 py-0.5 text-[10px] font-mono" />`:(it.depends_on||[]).join(', ')||'—'}</td>
                        <td class="p-1 text-center">
                          ${editable ? `
                            <button onclick="rmCatalogToggleActive('${it.code}', ${it.active!==false})" title="${it.active!==false?'Desactivar':'Activar'}" class="text-[10px] px-1 ${it.active!==false?'text-emerald-600':'text-slate-400'}">${it.active!==false?'✓':'○'}</button>
                            ${!it.is_seed?`<button onclick="rmCatalogDelete('${it.code}')" title="Borrar" class="text-[10px] text-red-600 px-1">🗑</button>`:''}
                          ` : ''}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </details>
        `;
      }).join('')}
    </div>

    <!-- Suppliers panel -->
    <div class="mt-4 bg-white rounded-xl border border-slate-200 p-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-sm font-bold">🏪 Suppliers (${rmState.suppliers.length})</h3>
        <button onclick="rmSupplierAdd()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded">+ Agregar supplier</button>
      </div>
      ${rmState.suppliers.length === 0 ? `
        <div class="text-center text-xs text-slate-400 py-6">Sin suppliers. Click "+ Agregar supplier" o corré <code class="bg-slate-100 px-1 rounded">s2-g5-suppliers.sql</code> para los seeds (Home Depot, Lowes, etc).</div>
      ` : `
        <table class="w-full text-xs">
          <thead class="bg-slate-50"><tr><th class="text-left p-2">Nombre</th><th class="text-left p-2">Tipo</th><th class="text-left p-2">Ciudad</th><th class="text-center p-2">Preferido</th><th class="text-center p-2">Acciones</th></tr></thead>
          <tbody>
            ${rmState.suppliers.map(s => `
              <tr class="border-t border-slate-100 ${s.preferred?'bg-amber-50':''}">
                <td class="p-2 font-semibold">${s.name}</td>
                <td class="p-2"><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded">${s.type}</span></td>
                <td class="p-2 text-slate-500">${s.city || '—'}</td>
                <td class="p-2 text-center">
                  <button onclick="rmSupplierTogglePreferred('${s.id}', ${s.preferred})" class="${s.preferred?'text-amber-600':'text-slate-400'}">${s.preferred?'⭐':'☆'}</button>
                </td>
                <td class="p-2 text-center">
                  <button onclick="rmSupplierAddPrice('${s.id}', '${(s.name||'').replace(/'/g,'&#39;')}')" class="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-900 px-2 py-1 rounded">+ Precio</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <div class="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-950">
      <strong>💡 Cómo funciona:</strong>
      <ul class="mt-1 ml-4 list-disc space-y-0.5">
        <li>El catálogo en DB <strong>reemplaza</strong> el hardcoded apenas cargás el archivo SQL. Si DB está vacía, el sistema usa el array hardcoded como fallback.</li>
        <li>Items <strong>seed</strong> (los 70 originales) tienen badge <code>SEED</code>. Items que agregues tienen badge <code>CUSTOM</code>.</li>
        <li>Para preservar histórico, lo mejor es <strong>desactivar</strong> (○) en vez de borrar 🗑 — proyectos viejos siguen viendo el item.</li>
        <li>La columna <strong>Mejor precio</strong> muestra el menor precio registrado entre todos los suppliers. Si desvía >15% del VU default → fondo ámbar.</li>
        <li>Para registrar un precio real: agregá supplier → click "+ Precio" → te pide code + monto + fuente.</li>
      </ul>
    </div>
  `;
}

// ============================================================
// S4-G6 · TAB CREW (workers + asignaciones)
// ============================================================

async function rmCrewAdd() {
  const name = prompt('Nombre del worker:');
  if (!name) return;
  const role = prompt('Rol (general/electrician/plumber/carpenter/painter/hvac/supervisor):', 'general') || 'general';
  const hourlyStr = prompt('Tarifa por hora $:', '17.50');
  const hourly_rate = parseFloat(hourlyStr) || 17.50;
  const skillsStr = prompt('Skills (separados por coma, opcional):', '');
  const skills = (skillsStr || '').split(',').map(s => s.trim()).filter(Boolean);
  const phone = prompt('Teléfono (opcional):', '') || null;
  const { error } = await sb.from('remodel_crew').insert({
    name, role, hourly_rate, skills, phone, active: true, created_by: state.user?.id || null
  });
  if (error) return alert('Error: ' + error.message);
  await rmLoadCrew();
  rmRenderTab();
}

async function rmCrewUpdate(id, field, value) {
  const upd = {};
  upd[field] = (field === 'hourly_rate' || field === 'capacity_hours_per_day') ? (+value || 0) : value;
  const { error } = await sb.from('remodel_crew').update(upd).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCrew();
  rmRenderTabDebounced();
}

async function rmCrewToggleActive(id, currentActive) {
  const { error } = await sb.from('remodel_crew').update({ active: !currentActive }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCrew();
  rmRenderTab();
}

async function rmCrewAssign(activityCode) {
  if (!rmState.currentProject?.id) return alert('Cargá un proyecto primero.');
  if (rmState.crew.length === 0) return alert('No hay workers. Agregá uno con "+ Worker" primero.');
  const opts = rmState.crew.map((c, i) => `${i+1}. ${c.name} ($${c.hourly_rate}/h, ${c.role})`).join('\n');
  const choice = prompt(`Asignar worker a ${activityCode}\n\n${opts}\n\nNúmero del worker:`);
  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= rmState.crew.length) return;
  const worker = rmState.crew[idx];
  const hoursStr = prompt(`¿Cuántas horas planeadas para ${worker.name} en ${activityCode}?`, '8');
  const hours_planned = parseFloat(hoursStr) || 0;
  const date_planned = prompt('Fecha planeada (YYYY-MM-DD) opcional:', '') || null;
  const { error } = await sb.from('remodel_crew_assignments').insert({
    project_id: rmState.currentProject.id,
    crew_id: worker.id,
    activity_code: activityCode,
    hours_planned, date_planned,
    created_by: state.user?.id || null
  });
  if (error) return alert('Error: ' + error.message);
  await rmLoadCrewAssignments(rmState.currentProject.id);
  rmRenderTab();
}

async function rmCrewAssignSetActual(assignmentId, field, value) {
  const upd = {};
  upd[field] = field === 'date_actual' ? (value || null) : (+value || null);
  const { error } = await sb.from('remodel_crew_assignments').update(upd).eq('id', assignmentId);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCrewAssignments(rmState.currentProject.id);
  rmRenderTabDebounced();
}

async function rmCrewAssignDelete(assignmentId) {
  if (!confirm('¿Borrar esta asignación?')) return;
  const { error } = await sb.from('remodel_crew_assignments').delete().eq('id', assignmentId);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCrewAssignments(rmState.currentProject.id);
  rmRenderTab();
}

function rmRenderCrew(body) {
  const e = rmState.currentProject ? rmCalcProject() : { activities: [] };
  const assignsByCode = {};
  rmState.crewAssignments.forEach(a => {
    if (!assignsByCode[a.activity_code]) assignsByCode[a.activity_code] = [];
    assignsByCode[a.activity_code].push(a);
  });

  body.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <div>
        <h2 class="text-lg font-bold">👷 Crew & Asignaciones</h2>
        <p class="text-xs text-slate-500">${rmState.crew.length} workers · ${rmState.crewAssignments.length} asignaciones${rmState.currentProject?' en '+rmState.currentProject.name:''}</p>
      </div>
      <button onclick="rmCrewAdd()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded">+ Worker</button>
    </div>

    <!-- Tabla Workers -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
      <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">Workers activos</div>
      ${rmState.crew.length === 0 ? `
        <div class="p-6 text-center text-xs text-slate-400">Sin workers. Click "+ Worker" para agregar tu primer miembro del crew.</div>
      ` : `
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr><th class="text-left p-2">Nombre</th><th class="text-left p-2">Rol</th><th class="text-right p-2">$/h</th><th class="text-right p-2">Cap. h/d</th><th class="text-right p-2">Asignado</th><th class="text-right p-2">Cost MO comprometido</th><th class="text-center p-2">Acciones</th></tr>
          </thead>
          <tbody>
            ${rmState.crew.map(c => {
              const cap = rmState.crewCapacity.find(x => x.crew_id === c.id) || {};
              return `
                <tr class="border-t border-slate-100">
                  <td class="p-2 font-semibold">${c.name}</td>
                  <td class="p-2"><span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded">${c.role||'—'}</span></td>
                  <td class="p-2 text-right"><input type="number" step="0.5" value="${c.hourly_rate}" onchange="rmCrewUpdate('${c.id}','hourly_rate',this.value)" class="w-20 border border-slate-200 rounded px-1 py-0.5 text-right text-xs" /></td>
                  <td class="p-2 text-right"><input type="number" step="0.5" value="${c.capacity_hours_per_day||8}" onchange="rmCrewUpdate('${c.id}','capacity_hours_per_day',this.value)" class="w-16 border border-slate-200 rounded px-1 py-0.5 text-right text-xs" /></td>
                  <td class="p-2 text-right">${(+cap.total_hours_planned || 0).toFixed(0)}h <span class="text-slate-400 text-[10px]">en ${cap.active_projects || 0} obras</span></td>
                  <td class="p-2 text-right font-bold">${rmFmt((+cap.total_hours_planned||0) * (+c.hourly_rate||0))}</td>
                  <td class="p-2 text-center">
                    <button onclick="rmCrewToggleActive('${c.id}', ${c.active!==false})" class="text-[10px] ${c.active!==false?'text-emerald-600':'text-slate-400'} px-1" title="${c.active!==false?'Desactivar':'Activar'}">${c.active!==false?'✓':'○'}</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>

    ${rmState.currentProject ? `
      <!-- Asignaciones del proyecto cargado -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">Asignaciones — ${rmState.currentProject.name}</div>
        ${e.activities.length === 0 ? `
          <div class="p-6 text-center text-xs text-slate-400">El proyecto no tiene actividades.</div>
        ` : `
          <div class="divide-y divide-slate-100">
            ${e.activities.map(a => {
              const assigns = assignsByCode[a.code] || [];
              const totalHours = assigns.reduce((s,x)=> s + (+x.hours_planned||0), 0);
              const totalCost = assigns.reduce((s,x)=> s + (+x.hours_planned||0) * (+x.remodel_crew?.hourly_rate||0), 0);
              return `
                <div class="p-2">
                  <div class="flex justify-between items-center gap-2 flex-wrap">
                    <div class="flex-1 min-w-0">
                      <div class="font-mono text-[10px] text-slate-400">${a.code}</div>
                      <div class="text-xs font-semibold truncate">${a.desc}</div>
                      <div class="text-[10px] text-slate-500">Est. ${a.days||0}d · MO estimada ${rmFmt(a.labor)}</div>
                    </div>
                    <div class="text-right text-xs">
                      <div class="font-bold">${totalHours}h asignadas</div>
                      <div class="text-[10px] ${totalCost > a.labor ? 'text-red-600':'text-slate-500'}">MO comprometido ${rmFmt(totalCost)}</div>
                    </div>
                    <button onclick="rmCrewAssign('${a.code}')" class="bg-blue-100 hover:bg-blue-200 text-blue-900 text-[10px] font-bold px-2 py-1 rounded">+ Asignar</button>
                  </div>
                  ${assigns.length ? `
                    <div class="mt-1 ml-4 space-y-0.5">
                      ${assigns.map(x => `
                        <div class="flex items-center gap-2 text-[11px]">
                          <span class="font-semibold">${x.remodel_crew?.name || '—'}</span>
                          <input type="number" step="0.5" value="${x.hours_planned||''}" placeholder="h plan" onchange="rmCrewAssignSetActual('${x.id}','hours_planned',this.value)" class="w-14 border border-slate-200 rounded px-1 py-0.5 text-right" title="Horas planeadas" />
                          <input type="number" step="0.5" value="${x.hours_actual||''}" placeholder="h real" onchange="rmCrewAssignSetActual('${x.id}','hours_actual',this.value)" class="w-14 border border-slate-200 rounded px-1 py-0.5 text-right" title="Horas reales" />
                          <input type="date" value="${x.date_planned||''}" onchange="rmCrewAssignSetActual('${x.id}','date_planned',this.value)" class="border border-slate-200 rounded px-1 py-0.5 text-[10px]" />
                          <span class="text-slate-500 ml-auto">$${((+x.hours_planned||0)*(+x.remodel_crew?.hourly_rate||0)).toFixed(0)}</span>
                          <button onclick="rmCrewAssignDelete('${x.id}')" class="text-red-500 text-[10px]">✕</button>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    ` : `
      <div class="text-center py-8 text-xs text-slate-500">Cargá un proyecto desde 📁 Proyectos para asignar workers a actividades.</div>
    `}
  `;
}

// ============================================================
// S4-G7 · TAB LISTA DE COMPRA (purchase order agregado)
// ============================================================
function rmRenderPurchases(body) {
  if (!rmState.currentProject) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">Cargá un proyecto desde 📁 Proyectos para generar la lista de compra de materiales.</div>`;
    return;
  }
  const e = rmCalcProject();
  if (e.activities.length === 0) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">El proyecto no tiene actividades.</div>`;
    return;
  }

  const startDate = new Date(rmState.editStartDate);
  // Por actividad: monto material + fecha de uso + supplier preferido + lead_time + fecha de orden
  const rows = e.activities.map(a => {
    const matCost = a.material || 0;
    if (matCost <= 0) return null;
    // Fecha de uso = cuando arranca la fase de la actividad
    const phs = e.phaseSchedule[a.phase];
    const dateUse = phs?.start || startDate;
    // Lead time
    const lead = RM_LEAD_TIMES[a.code] || 0;
    const dateOrder = rmAddDays(dateUse, -lead);
    // Supplier preferido del summary
    const ps = rmState.priceSummary[a.code];
    const supplier = ps?.preferred_supplier || ps?.preferred_supplier || '—';
    const preferredPrice = ps?.preferred_price || null;
    return {
      code: a.code,
      desc: a.desc,
      unit: a.unit,
      qty: a.qty,
      mat_cost: matCost,
      preferred_supplier: supplier,
      preferred_price: preferredPrice,
      date_use: dateUse,
      date_order: dateOrder,
      lead_days: lead
    };
  }).filter(Boolean);

  // Agrupar por supplier
  const bySupplier = {};
  rows.forEach(r => {
    const key = r.preferred_supplier || '— Sin supplier asignado —';
    if (!bySupplier[key]) bySupplier[key] = { rows: [], total: 0 };
    bySupplier[key].rows.push(r);
    bySupplier[key].total += r.mat_cost;
  });

  const totalAll = rows.reduce((s,r)=> s + r.mat_cost, 0);

  body.innerHTML = `
    <div class="flex justify-between items-end mb-3 flex-wrap gap-2">
      <div>
        <h2 class="text-lg font-bold">🛒 Lista de compra — ${rmState.currentProject.name}</h2>
        <p class="text-xs text-slate-500">${rows.length} items · ${Object.keys(bySupplier).length} suppliers · total materiales ${rmFmt(totalAll)}</p>
      </div>
      <button onclick="rmExportPurchasesCSV()" class="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded">⬇️ Export CSV</button>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded p-2 text-[11px] text-blue-950 mb-3">
      <strong>💡 Cómo leer:</strong> "Ordenar antes del" = fecha uso − lead time (orden anticipada para que llegue a tiempo). Si "ordenar antes" ya pasó, ordená HOY. Los items sin supplier asignado los podés cargar desde 🛠 Catálogo → Suppliers.
    </div>

    <!-- S5-G8: Facturas reales subidas (vendor invoices) -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
      <div class="bg-amber-100 px-3 py-2 flex justify-between items-center text-xs font-bold">
        <span>🧾 Facturas recibidas (${rmState.invoices.length})</span>
        <div class="flex gap-2 items-center">
          <input type="file" accept=".pdf,image/*" id="rm-invoice-upload" class="hidden" onchange="rmUploadInvoice(this.files[0])" />
          <label for="rm-invoice-upload" class="bg-slate-900 hover:bg-slate-700 text-white text-[10px] font-bold px-2 py-1 rounded cursor-pointer">+ Subir factura</label>
        </div>
      </div>
      ${rmState.invoices.length === 0 ? `
        <div class="p-4 text-center text-xs text-slate-400">Sin facturas. Subí PDFs de proveedores para reconciliar contra el real_cost de cada actividad.</div>
      ` : `
        <table class="w-full text-[11px]">
          <thead class="bg-slate-50">
            <tr><th class="text-left p-1.5">Fecha</th><th class="text-left p-1.5">Supplier</th><th class="text-left p-1.5">#</th><th class="text-left p-1.5">Activity</th><th class="text-right p-1.5">Total</th><th class="text-center p-1.5">Status</th><th class="text-center p-1.5">Acciones</th></tr>
          </thead>
          <tbody>
            ${rmState.invoices.map(inv => `
              <tr class="border-t border-slate-100">
                <td class="p-1.5 text-slate-500">${rmFmtDate(inv.invoice_date)}</td>
                <td class="p-1.5 font-semibold">${inv.remodel_suppliers?.name || '—'}</td>
                <td class="p-1.5 font-mono text-[10px]">${inv.invoice_number || '—'}</td>
                <td class="p-1.5 font-mono text-[10px]">${inv.activity_code || '<span class="text-amber-600">↪ sin link</span>'}</td>
                <td class="p-1.5 text-right font-bold">${rmFmt(inv.total_amount)}</td>
                <td class="p-1.5 text-center"><span class="text-[10px] bg-${inv.status==='reconciled'?'emerald':inv.status==='disputed'?'red':'amber'}-100 text-${inv.status==='reconciled'?'emerald':inv.status==='disputed'?'red':'amber'}-800 px-1.5 py-0.5 rounded">${inv.status}</span></td>
                <td class="p-1.5 text-center">
                  ${inv.pdf_path ? `<button onclick="rmViewInvoicePDF('${inv.pdf_path}')" class="text-[10px] text-blue-600 hover:text-blue-800 px-1">👁️</button>` : ''}
                  ${inv.status === 'pending' ? `<button onclick="rmReconcileInvoice('${inv.id}')" class="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Reconciliar</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    ${Object.entries(bySupplier).map(([sup, data]) => `
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
        <div class="bg-slate-100 px-3 py-2 flex justify-between text-xs font-bold">
          <span>🏪 ${sup}</span>
          <span class="text-slate-700">${data.rows.length} items · ${rmFmt(data.total)}</span>
        </div>
        <table class="w-full text-[11px]">
          <thead class="bg-slate-50">
            <tr><th class="text-left p-1.5">Code</th><th class="text-left p-1.5">Item</th><th class="text-right p-1.5">Cant.</th><th class="text-right p-1.5">Material $</th><th class="text-center p-1.5">Lead</th><th class="text-center p-1.5">Ordenar antes</th><th class="text-center p-1.5">Usar el</th></tr>
          </thead>
          <tbody>
            ${data.rows.sort((a,b) => a.date_order - b.date_order).map(r => {
              const today = new Date();
              const overdue = r.date_order <= today;
              const urgent = !overdue && (r.date_order - today) / 86400000 <= 3;
              return `
                <tr class="border-t border-slate-100 ${overdue?'bg-red-50':urgent?'bg-amber-50':''}">
                  <td class="p-1 font-mono text-slate-500">${r.code}</td>
                  <td class="p-1">${r.desc}</td>
                  <td class="p-1 text-right">${r.qty} ${r.unit}</td>
                  <td class="p-1 text-right font-bold">${rmFmt(r.mat_cost)}</td>
                  <td class="p-1 text-center ${r.lead_days?'text-blue-700 font-bold':'text-slate-400'}">${r.lead_days?r.lead_days+'d':'—'}</td>
                  <td class="p-1 text-center ${overdue?'text-red-700 font-bold':urgent?'text-amber-700 font-bold':''}">${rmFmtDate(r.date_order)}${overdue?' ⚠️':urgent?' 🔔':''}</td>
                  <td class="p-1 text-center text-slate-500">${rmFmtDate(r.date_use)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  `;
}

function rmExportPurchasesCSV() {
  if (!rmState.currentProject) return;
  const e = rmCalcProject();
  const startDate = new Date(rmState.editStartDate);
  const lines = [`LISTA DE COMPRA — ${rmState.currentProject.name}`, ''];
  lines.push('Supplier,Code,Item,Unidad,Cantidad,Material $,Lead días,Ordenar antes,Usar el');
  e.activities.forEach(a => {
    if (!a.material || a.material <= 0) return;
    const phs = e.phaseSchedule[a.phase];
    const dateUse = phs?.start || startDate;
    const lead = RM_LEAD_TIMES[a.code] || 0;
    const dateOrder = rmAddDays(dateUse, -lead);
    const ps = rmState.priceSummary[a.code];
    const sup = ps?.preferred_supplier || '—';
    lines.push([
      `"${sup}"`, a.code, `"${(a.desc||'').replace(/"/g,'""')}"`,
      a.unit, a.qty, a.material.toFixed(2),
      lead, dateOrder.toISOString().split('T')[0], dateUse.toISOString().split('T')[0]
    ].join(','));
  });
  const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `compra_${rmState.currentProject.name.replace(/[^a-z0-9]/gi,'_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// S4-G10 · VISTA CAMPO (mobile-first para foreman)
// ============================================================
function rmRenderField(body) {
  if (!rmState.currentProject) {
    body.innerHTML = `
      <div class="max-w-md mx-auto py-8 px-4 text-center">
        <div class="text-5xl mb-3">📱</div>
        <h2 class="text-xl font-bold mb-2">Vista campo</h2>
        <p class="text-sm text-slate-500 mb-4">Cargá un proyecto desde 📁 Proyectos para ver la vista mobile-friendly diseñada para foreman en sitio.</p>
      </div>
    `;
    return;
  }
  const e = rmCalcProject();
  if (e.activities.length === 0) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">El proyecto no tiene actividades.</div>`;
    return;
  }

  // KPI overall
  const totalEst = e.totals.total;
  let totalReal = 0, withReal = 0;
  e.activities.forEach(a => {
    const r = rmState.actualsByCode[a.code] || {};
    if (r.real_cost != null && r.real_cost !== '') { totalReal += +r.real_cost; withReal++; }
  });
  const coverage = e.activities.length > 0 ? Math.round(withReal / e.activities.length * 100) : 0;

  body.innerHTML = `
    <div class="max-w-md mx-auto">
      <!-- Header -->
      <div class="bg-slate-900 text-white rounded-2xl p-4 mb-3">
        <div class="text-xs text-slate-400 uppercase">${rmState.currentProject.address || ''}</div>
        <h2 class="text-lg font-bold mt-1">${rmState.currentProject.name}</h2>
        <div class="grid grid-cols-3 gap-2 mt-3">
          <div><div class="text-[9px] text-slate-400">Estimado</div><div class="text-sm font-bold">${rmFmt(totalEst)}</div></div>
          <div><div class="text-[9px] text-slate-400">Real</div><div class="text-sm font-bold ${totalReal>totalEst?'text-red-300':'text-emerald-300'}">${totalReal>0?rmFmt(totalReal):'—'}</div></div>
          <div><div class="text-[9px] text-slate-400">Cobertura</div><div class="text-sm font-bold">${coverage}%</div></div>
        </div>
      </div>

      <p class="text-[11px] text-slate-500 text-center mb-2">Tocá una actividad para registrar avance, costo real o foto. Cambios se guardan al hacer click en 💾.</p>

      <!-- Cards por actividad -->
      <div class="space-y-2">
        ${e.activities.map(a => {
          const r = rmState.actualsByCode[a.code] || {};
          const isOpen = rmState.fieldQuickActivity === a.code;
          const hasReal = (r.real_cost != null && r.real_cost !== '');
          const variance = hasReal && a.total > 0 ? Math.round((+r.real_cost - a.total) / a.total * 100) : null;
          const phaseInfo = RM_PHASES[a.phase] || { icon: '·', name: '' };
          return `
            <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button onclick="rmState.fieldQuickActivity='${isOpen?'':a.code}'; rmRenderTab()"
                class="w-full px-3 py-3 flex items-center gap-2 text-left active:bg-slate-50">
                <span class="text-xl">${phaseInfo.icon}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-mono text-[9px] text-slate-400">${a.code} · ${phaseInfo.name}</div>
                  <div class="text-sm font-semibold truncate">${a.desc}</div>
                  <div class="text-[10px] text-slate-500">Est ${rmFmt(a.total)} · ${a.days||0}d</div>
                </div>
                <div class="text-right">
                  ${hasReal ? `
                    <div class="text-sm font-bold ${variance>10?'text-red-700':variance>0?'text-amber-700':'text-emerald-700'}">${rmFmt(+r.real_cost)}</div>
                    <div class="text-[9px] ${variance>0?'text-red-600':'text-emerald-600'}">${variance>0?'+':''}${variance}%</div>
                  ` : `<div class="text-[10px] text-slate-400">Sin real</div>`}
                </div>
                <span class="text-slate-300 text-lg">${isOpen?'−':'+'}</span>
              </button>
              ${isOpen ? `
                <div class="border-t border-slate-100 p-3 space-y-2 bg-slate-50">
                  <div class="grid grid-cols-2 gap-2">
                    <label class="text-[10px] text-slate-600 block">Costo real $
                      <input type="number" inputmode="decimal" value="${r.real_cost ?? ''}" placeholder="0"
                        onchange="rmSetActual('${a.code}','real_cost',this.value)"
                        class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-base font-semibold" />
                    </label>
                    <label class="text-[10px] text-slate-600 block">Días reales
                      <input type="number" inputmode="decimal" value="${r.real_days ?? ''}" placeholder="0"
                        onchange="rmSetActual('${a.code}','real_days',this.value)"
                        class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-base font-semibold" />
                    </label>
                    <label class="text-[10px] text-slate-600 block col-span-2">Notas
                      <input type="text" value="${(r.notes||'').replace(/"/g,'&quot;')}" placeholder="ej: subió por cambio cliente"
                        onchange="rmSetActual('${a.code}','notes',this.value)"
                        class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <input type="file" accept="image/*" capture="environment" id="rm-field-photo-${a.code.replace(/[.p]/g,'_')}" class="hidden" onchange="rmFieldUploadPhoto('${a.code}', this.files[0])" />
                    <label for="rm-field-photo-${a.code.replace(/[.p]/g,'_')}" class="bg-blue-600 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer">📷 Foto</label>
                    ${(rmState.photos || []).filter(p => p.activity_code === a.code).length > 0 ? `
                      <button onclick="rmShowPhotoGallery('${a.code}')" class="bg-slate-700 text-white text-xs font-bold py-2.5 rounded-lg">🖼️ ${(rmState.photos || []).filter(p => p.activity_code === a.code).length} fotos</button>
                    ` : `<button onclick="rmShowPhotoGallery('${a.code}')" disabled class="bg-slate-200 text-slate-400 text-xs font-bold py-2.5 rounded-lg cursor-not-allowed">🖼️ 0</button>`}
                    <button onclick="rmSaveActuals()" class="bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-lg">💾 Guardar</button>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div class="mt-4 text-center text-[10px] text-slate-400">
        Pensado para 📱. En desktop usá la vista 🔄 Seguimiento → Por actividad.
      </div>
    </div>
  `;
}

// ============================================================
// S5-G11 · PDF PROPUESTA CLIENTE (browser print-to-PDF, sin librerías)
// ============================================================
function rmGenerateProposalPDF() {
  const e = rmCalcProject();
  if (e.activities.length === 0) return alert('Agregá actividades antes de generar la propuesta.');
  const isFinal = rmState.currentProject?.status === 'completed' || rmState.currentProject?.status === 'active';
  const watermark = isFinal ? 'FINAL' : 'DRAFT';
  const today = new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' });
  const proj = rmState.currentProject || { name: rmState.editName || 'Nuevo proyecto', address: rmState.editAddress };

  const phaseRows = Object.entries(RM_PHASES).map(([p, info]) => {
    const acts = (e.byPhase[p]?.activities) || [];
    if (!acts.length) return '';
    return `
      <tr class="phase-header"><td colspan="5" style="background:#0F172A;color:white;font-weight:bold;padding:8px 12px;">${info.icon} ${p}. ${info.name}</td></tr>
      ${acts.map(a => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:10px;color:#64748b;">${a.code}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${a.desc}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${a.qty} ${a.unit}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">$${(+a.vu).toFixed(2)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;">${rmFmt(a.total)}</td>
        </tr>
      `).join('')}
      <tr><td colspan="4" style="padding:6px 12px;text-align:right;background:#F8FAFC;font-weight:bold;">Subtotal ${info.name}</td><td style="padding:6px 12px;text-align:right;background:#F8FAFC;font-weight:bold;">${rmFmt(e.byPhase[p].total)}</td></tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Propuesta — ${proj.name}</title>
<style>
  @page { size: letter; margin: 0.6in; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; color:#0F172A; margin:0; line-height:1.45; }
  .watermark { position:fixed; top:40%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:140px; font-weight:900; color:rgba(15,23,42,0.04); z-index:-1; pointer-events:none; letter-spacing:8px; }
  header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:16px; border-bottom:3px solid #0F172A; margin-bottom:24px; }
  .brand { font-size:26px; font-weight:900; letter-spacing:-0.5px; }
  .brand-sub { color:#64748b; font-size:11px; margin-top:2px; }
  .meta { text-align:right; font-size:11px; color:#64748b; }
  h1 { font-size:22px; margin:0 0 4px; }
  h2 { font-size:14px; text-transform:uppercase; letter-spacing:1px; color:#475569; margin:24px 0 8px; padding-bottom:4px; border-bottom:1px solid #e5e7eb; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:12px; margin-bottom:16px; }
  .info-grid div strong { display:block; color:#64748b; font-size:9px; text-transform:uppercase; margin-bottom:2px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  .pricing-box { background:#F1F5F9; border-radius:8px; padding:16px; margin-top:16px; }
  .pricing-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e2e8f0; font-size:12px; }
  .pricing-row:last-child { border-bottom:none; font-size:18px; font-weight:900; padding-top:12px; margin-top:4px; border-top:2px solid #0F172A; }
  .terms { font-size:10px; color:#475569; margin-top:24px; }
  .signature { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:48px; font-size:11px; }
  .signature div { border-top:1px solid #0F172A; padding-top:6px; }
  .print-button { position:fixed; top:12px; right:12px; background:#0F172A; color:white; padding:10px 16px; border:none; border-radius:8px; font-weight:bold; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.15); }
  @media print { .print-button { display:none; } }
</style>
</head>
<body>
<div class="watermark">${watermark}</div>
<button class="print-button" onclick="window.print()">📄 Guardar como PDF</button>

<header>
  <div>
    <div class="brand">Rental Profitss</div>
    <div class="brand-sub">Remodelaciones · Austin TX · gerencia@rentalprofitss.com</div>
  </div>
  <div class="meta">
    <div><strong>Propuesta</strong> ${watermark}</div>
    <div>Fecha: ${today}</div>
    <div>Estimación válida 30 días</div>
  </div>
</header>

<h1>${proj.name}</h1>
<div style="font-size:12px;color:#64748b;margin-bottom:24px;">${proj.address || ''}</div>

<div class="info-grid">
  <div><strong>Superficie</strong>${e.sqft || '—'} ft²</div>
  <div><strong>Inicio estimado</strong>${rmFmtDate(rmState.editStartDate)}</div>
  <div><strong>Duración estimada</strong>${e.totalDays} días${e.cpm && rmState.cpmMode ? ' (CPM)' : ''}</div>
  <div><strong>Total actividades</strong>${e.activities.length}</div>
</div>

<h2>Detalle del trabajo</h2>
<table>
  <thead>
    <tr style="background:#F8FAFC;">
      <th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:#475569;">Code</th>
      <th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:#475569;">Actividad</th>
      <th style="padding:8px 12px;text-align:right;font-size:10px;text-transform:uppercase;color:#475569;">Cant.</th>
      <th style="padding:8px 12px;text-align:right;font-size:10px;text-transform:uppercase;color:#475569;">$/u</th>
      <th style="padding:8px 12px;text-align:right;font-size:10px;text-transform:uppercase;color:#475569;">Total</th>
    </tr>
  </thead>
  <tbody>${phaseRows}</tbody>
</table>

<h2>Pricing</h2>
<div class="pricing-box">
  <div class="pricing-row"><span>Costo directo (materiales + mano de obra + equipo)</span><span>${rmFmt(e.pricing.directCost)}</span></div>
  <div class="pricing-row"><span>+ Contingencia (${rmState.contingencyPct}%)</span><span>${rmFmt(e.pricing.contingency)}</span></div>
  <div class="pricing-row"><span>+ Overhead (${rmState.overheadPct}%)</span><span>${rmFmt(e.pricing.overhead)}</span></div>
  <div class="pricing-row"><span>+ Soft costs (permits, design)</span><span>${rmFmt(e.pricing.softCosts)}</span></div>
  <div class="pricing-row"><span>= Costo interno</span><span>${rmFmt(e.pricing.internalCost)}</span></div>
  <div class="pricing-row"><span>Inversión total</span><span>${rmFmt(e.pricing.clientPrice)}</span></div>
</div>

<div style="font-size:11px;color:#475569;margin-top:8px;">${e.sqft ? '<strong>$' + (e.pricing.clientPrice/e.sqft).toFixed(0) + '/ft²</strong> sobre ' + e.sqft + ' ft² de área a remodelar.' : ''}</div>

<h2>Términos</h2>
<div class="terms">
  • Esta propuesta es válida por 30 días desde la fecha de emisión.<br>
  • Pagos en draws según avance: 30% inicio, 40% mitad obra (drywall + pisos), 30% entrega final.<br>
  • Materiales sujetos a disponibilidad. Aumentos &gt;5% se conversan antes de avanzar.<br>
  • Cambios al scope (change orders) se cotizan aparte y requieren firma para ejecutarse.<br>
  • Garantía: 1 año en mano de obra, manufacturer warranty en materiales.<br>
  • Permits incluidos. Inspecciones de ciudad coordinadas por Rental Profitss.
</div>

<div class="signature">
  <div><strong>Cliente</strong><br>Firma y fecha</div>
  <div><strong>Rental Profitss</strong><br>Nico — Gerencia</div>
</div>

<script>setTimeout(() => window.print(), 600);</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) return alert('Tu navegador bloqueó la nueva pestaña. Permitílo y reintentá.');
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// S5-G12 · Foto georreferenciada por actividad con metadata before/after
async function rmFieldUploadPhoto(code, file) {
  if (!file) return;
  if (!rmState.currentProject?.id) return alert('Guardá el proyecto primero para asociar fotos.');
  const beforeAfter = (prompt('¿Es foto ANTES o DESPUÉS? (antes/despues/proceso)', 'proceso') || 'proceso').toLowerCase();
  const note = prompt('Nota corta (opcional, ej: "vanity derecho antes del demo"):', '') || '';

  const userId = state.user?.id || 'anon';
  const path = `${userId}/${rmState.currentProject.id}/${code}_${beforeAfter}_${Date.now()}_${file.name}`;
  const { error: upErr } = await sb.storage.from('remodel-assets').upload(path, file);
  if (upErr) return alert('Error subiendo foto: ' + upErr.message);

  // Append metadata enriquecida + persistir en remodel_projects.photos jsonb
  if (!Array.isArray(rmState.photos)) rmState.photos = [];
  const meta = {
    path, name: file.name, type: 'image',
    activity_code: code,
    taken_at: new Date().toISOString(),
    before_after: beforeAfter, // 'antes' | 'despues' | 'proceso'
    note,
    uploaded_by: userId
  };
  rmState.photos.push(meta);
  // Persist a DB
  const { error: dbErr } = await sb.from('remodel_projects').update({
    photos: rmState.photos
  }).eq('id', rmState.currentProject.id);
  if (dbErr) alert('Subida OK pero error al persistir metadata: ' + dbErr.message);
  rmRenderTab();
}

// S5-G12: Devuelve URL firmada para mostrar foto (cache 1h)
async function rmGetSignedPhotoUrl(path) {
  const { data } = await sb.storage.from('remodel-assets').createSignedUrl(path, 3600);
  return data?.signedUrl || '';
}

// S5-G12: Galería por actividad — pre-carga URLs firmadas y abre overlay
async function rmShowPhotoGallery(activityCode) {
  const photos = (rmState.photos || []).filter(p => p.activity_code === activityCode);
  if (!photos.length) return alert('Sin fotos para ' + activityCode);
  const urls = await Promise.all(photos.map(p => rmGetSignedPhotoUrl(p.path)));
  const html = `
    <div id="rm-photo-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10000;overflow-y:auto;padding:16px;" onclick="if(event.target===this)this.remove()">
      <div style="max-width:900px;margin:0 auto;color:white;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="font-size:18px;font-weight:bold;">📷 ${activityCode} · ${photos.length} fotos</h2>
          <button onclick="document.getElementById('rm-photo-overlay').remove()" style="background:white;color:black;padding:6px 12px;border-radius:6px;font-weight:bold;">✕ Cerrar</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
          ${photos.map((p, i) => `
            <div style="background:#1F2937;border-radius:8px;overflow:hidden;">
              <img src="${urls[i]}" style="width:100%;height:200px;object-fit:cover;" />
              <div style="padding:8px;font-size:11px;">
                <div style="font-weight:bold;text-transform:uppercase;color:${p.before_after==='antes'?'#FBBF24':p.before_after==='despues'?'#34D399':'#94A3B8'};">${p.before_after || 'proceso'}</div>
                <div style="color:#94A3B8;">${rmFmtDate(p.taken_at)}</div>
                ${p.note ? `<div style="color:#E5E7EB;margin-top:4px;">${p.note}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);
}
