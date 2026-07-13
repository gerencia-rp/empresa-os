// ============================================================
// REMODEL PRO — Estimador profesional de remodelación
// Catálogo de Denfield + calibración 5 casas reales
// ============================================================

// ─── CATÁLOGO MAESTRO DE ACTIVIDADES (estructura Denfield) ───
const RM_PHASES = {
  '1': { name: 'Demolición', icon: '⛏️', color: '#dc2626' },
  '2': { name: 'Cimentación', icon: '🏗️', color: '#ea580c' },
  '3': { name: 'Externo',     icon: '🏠', color: '#d97706' },
  '4': { name: 'Estructura', icon: '🪵', color: '#65a30d' },
  '5': { name: 'Interno',    icon: '🛏️', color: '#0891b2' },
  '6': { name: 'Limpieza',   icon: '🧹', color: '#7c3aed' }
};

// Unidades disponibles para items custom (en español)
const RM_UNIDADES = [
  { val: 'ft²',       label: 'ft² (Pie cuadrado)',        en: 'sqft' },
  { val: 'ft lineal', label: 'ft lineal (Pie lineal)',    en: 'lf' },
  { val: 'unidad',    label: 'unidad',                    en: 'unit' },
  { val: 'proyecto',  label: 'proyecto (Lump sum)',        en: 'project' },
  { val: 'carga',     label: 'carga (Truck/Dumpster)',     en: 'load' },
  { val: 'casa',      label: 'casa (Casa completa)',       en: 'house' },
  { val: 'techo',     label: 'techo (Techo completo)',     en: 'roof' },
  { val: 'juego',     label: 'juego (Set/Kit)',            en: 'set' },
  { val: 'm²',        label: 'm² (Metro cuadrado)',        en: 'sqm' },
  { val: 'm lineal',  label: 'm lineal (Metro lineal)',    en: 'lm' },
  { val: 'galón',     label: 'galón',                      en: 'gal' },
  { val: 'hora',      label: 'hora',                       en: 'hour' },
  { val: 'día',       label: 'día',                        en: 'day' }
];

// Actividades reales del template Denfield. Cada una con su default vu_total ($/unit típico).
// Catálogo en ESPAÑOL — descripciones y unidades alineadas con los Excel de ejemplo
// (Neans, Wellington) usados por Empresa OS.
const RM_CATALOG = [
  // ─── 1. DEMOLICIÓN ───
  { code:'1.1.1', phase:'1', subcat:'Demoliciones', desc:'Demolición de pisos - hasta la estructura', unit:'ft²', vu:0.50, mat_pct:0.10, days_per_qty:0.005 },
  { code:'1.1.3', phase:'1', subcat:'Demoliciones', desc:'Desmonte de cocina (gabinetes, mesones, electrodomésticos)', unit:'unidad', vu:600, mat_pct:0.10, days_per_qty:1 },
  { code:'1.1.4', phase:'1', subcat:'Demoliciones', desc:'Desmonte de baño (demolición completa)', unit:'unidad', vu:500, mat_pct:0.10, days_per_qty:1 },
  { code:'1.1.6', phase:'1', subcat:'Demoliciones', desc:'Retiro de drywall', unit:'ft²', vu:0.40, mat_pct:0.10, days_per_qty:0.0015 },
  { code:'1.1.7', phase:'1', subcat:'Demoliciones', desc:'Demolición superior de concreto (entrada/patio)', unit:'ft²', vu:1.50, mat_pct:0.15, days_per_qty:0.005 },
  { code:'1.1.8', phase:'1', subcat:'Demoliciones', desc:'Retiro de muro - estructural', unit:'ft²', vu:25, mat_pct:0.15, days_per_qty:0.05 },
  { code:'1.1.9', phase:'1', subcat:'Disposición', desc:'Alquiler de contenedor (por carga)', unit:'carga', vu:450, mat_pct:1.0, days_per_qty:0 },
  { code:'1.1.12', phase:'1', subcat:'Disposición', desc:'Tarifas de disposición/vertedero por carga', unit:'carga', vu:150, mat_pct:1.0, days_per_qty:0 },
  { code:'1.1.11', phase:'1', subcat:'Preliminares', desc:'Protección de sitio, plástico, señalización', unit:'proyecto', vu:300, mat_pct:0.50, days_per_qty:1 },
  { code:'1.1.10', phase:'1', subcat:'Disposición', desc:'Acarreo de escombros', unit:'proyecto', vu:600, mat_pct:0.20, days_per_qty:3 },

  // ─── 2. CIMENTACIÓN ───
  { code:'2.1.4', phase:'2', subcat:'Reparación', desc:'Reparación de grietas en cimentación (asentamiento básico)', unit:'proyecto', vu:10000, mat_pct:0.10, days_per_qty:5 },
  { code:'2.2.6', phase:'2', subcat:'Concreto', desc:'Reparación de losa de concreto (por unidad)', unit:'unidad', vu:71.43, mat_pct:0.60, days_per_qty:0.5 },
  { code:'2.2.1', phase:'2', subcat:'Concreto', desc:'Excavación y nivelación del terreno', unit:'proyecto', vu:1800, mat_pct:0.20, days_per_qty:2 },
  { code:'2.1.1', phase:'2', subcat:'Reparación', desc:'Evaluación e inspección de cimentación', unit:'proyecto', vu:500, mat_pct:0.0, days_per_qty:2 },
  { code:'2.2.9', phase:'2', subcat:'Concreto', desc:'Sistema de impermeabilización (cimentación)', unit:'proyecto', vu:2200, mat_pct:0.55, days_per_qty:4 },

  // ─── 3. EXTERNO ───
  { code:'3.1.1', phase:'3', subcat:'Cubierta', desc:'Reemplazo de techo (tejas arquitectónicas)', unit:'techo', vu:14000, mat_pct:0.50, days_per_qty:4 },
  { code:'3.1.2', phase:'3', subcat:'Cubierta', desc:'Membrana y tapajuntas de techo', unit:'techo', vu:2200, mat_pct:0.60, days_per_qty:1 },
  { code:'3.1.3', phase:'3', subcat:'Cubierta', desc:'Canaletas y bajantes', unit:'ft lineal', vu:12, mat_pct:0.55, days_per_qty:0.02 },
  { code:'3.4.1', phase:'3', subcat:'Fachada', desc:'Reemplazo de revestimiento (fibrocemento Hardieboard)', unit:'ft²', vu:8.50, mat_pct:0.55, days_per_qty:0.01 },
  { code:'3.4.3', phase:'3', subcat:'Fachada', desc:'Pintura exterior (casa completa, preparación total)', unit:'casa', vu:5500, mat_pct:0.30, days_per_qty:5 },
  { code:'3.5.1', phase:'3', subcat:'Puertas', desc:'Puerta principal de entrada (premium)', unit:'unidad', vu:1800, mat_pct:0.70, days_per_qty:1 },
  { code:'3.5.2', phase:'3', subcat:'Puertas', desc:'Puertas exteriores secundarias (atrás/lateral)', unit:'unidad', vu:900, mat_pct:0.70, days_per_qty:1 },
  { code:'3.6.1', phase:'3', subcat:'Urbanismo', desc:'Instalación de patio de concreto', unit:'ft²', vu:18, mat_pct:0.50, days_per_qty:0.04 },
  { code:'3.13.1', phase:'3', subcat:'Urbanismo', desc:'Reparación/repavimentación de entrada vehicular', unit:'proyecto', vu:5500, mat_pct:0.50, days_per_qty:3 },
  { code:'3.14.1', phase:'3', subcat:'Urbanismo', desc:'Cerca de madera (perímetro)', unit:'ft lineal', vu:35, mat_pct:0.50, days_per_qty:0.04 },
  { code:'3.15.1', phase:'3', subcat:'Urbanismo', desc:'Paisajismo y césped (renovación total)', unit:'proyecto', vu:3500, mat_pct:0.35, days_per_qty:2 },
  { code:'3.7.1', phase:'3', subcat:'Fachada', desc:'Reemplazo de ventanas (eficiencia energética, todas)', unit:'casa', vu:9000, mat_pct:0.70, days_per_qty:3 },
  { code:'3.16.1', phase:'3', subcat:'Fachada', desc:'Reemplazo de columnas de madera', unit:'unidad', vu:300, mat_pct:0.55, days_per_qty:0.5 },

  // ─── 4. ESTRUCTURA ───
  { code:'4.1.2', phase:'4', subcat:'Estructura', desc:'Enmarcado de madera (carpintería estructural, casa completa)', unit:'ft²', vu:6, mat_pct:0.55, days_per_qty:0.005 },
  { code:'4.1.3', phase:'4', subcat:'Estructura', desc:'Viga de acero / modificación de muro estructural', unit:'unidad', vu:3500, mat_pct:0.55, days_per_qty:2 },
  { code:'4.1.4', phase:'4', subcat:'Estructura', desc:'Enmarcado de techo / reparación de cerchas', unit:'ft²', vu:8, mat_pct:0.55, days_per_qty:0.005 },
  { code:'4.1.5', phase:'4', subcat:'Estructura', desc:'Instalación de subpiso (nuevo)', unit:'ft²', vu:4.5, mat_pct:0.60, days_per_qty:0.003 },
  { code:'4.2.1', phase:'4', subcat:'Permisos', desc:'Permisos de construcción (remodelación casa completa)', unit:'proyecto', vu:1500, mat_pct:0.0, days_per_qty:0 },
  { code:'4.2.2', phase:'4', subcat:'Permisos', desc:'Honorarios de arquitecto / ingeniero estructural', unit:'proyecto', vu:2500, mat_pct:0.0, days_per_qty:0 },
  { code:'4.2.3', phase:'4', subcat:'Permisos', desc:'Gestión de contratista general (overhead)', unit:'proyecto', vu:0, mat_pct:0.0, days_per_qty:0 },

  // ─── 5. INTERNO ───
  { code:'5.1.1', phase:'5', subcat:'Muros', desc:'Instalación/reemplazo de drywall', unit:'ft²', vu:3.50, mat_pct:0.45, days_per_qty:0.005 },
  { code:'5.1.2', phase:'5', subcat:'Muros', desc:'Pintura interior (casa completa)', unit:'ft²', vu:1.40, mat_pct:0.25, days_per_qty:0.012 },
  { code:'5.1.3', phase:'5', subcat:'Muros', desc:'Aislamiento - paneles de muro', unit:'ft²', vu:1.80, mat_pct:0.55, days_per_qty:0.004 },
  { code:'5.2.1', phase:'5', subcat:'Techo', desc:'Instalación de molduras de techo', unit:'ft lineal', vu:8, mat_pct:0.50, days_per_qty:0.02 },
  { code:'5.2.3', phase:'5', subcat:'Techo', desc:'Aislamiento - soplado en ático', unit:'ft²', vu:1.50, mat_pct:0.55, days_per_qty:0.002 },
  { code:'5.3.1', phase:'5', subcat:'Baños', desc:'Enchape de baño (piso + muros)', unit:'ft²', vu:18, mat_pct:0.50, days_per_qty:0.04, multiplicable:true },
  { code:'5.3.2', phase:'5', subcat:'Baños', desc:'Instalación de ducha a medida', unit:'unidad', vu:2800, mat_pct:0.55, days_per_qty:2, multiplicable:true },
  { code:'5.3.3', phase:'5', subcat:'Baños', desc:'Cerramiento de ducha en vidrio', unit:'unidad', vu:1200, mat_pct:0.70, days_per_qty:1, multiplicable:true },
  { code:'5.3.4', phase:'5', subcat:'Baños', desc:'Accesorios de baño (botiquín, espejo, toalleros)', unit:'juego', vu:400, mat_pct:0.85, days_per_qty:0.5, multiplicable:true },
  { code:'5.3.5', phase:'5', subcat:'Baños', desc:'Mueble de lavamanos + mesón', unit:'unidad', vu:1100, mat_pct:0.75, days_per_qty:1, multiplicable:true },
  { code:'5.3.6', phase:'5', subcat:'Baños', desc:'Reemplazo de inodoro', unit:'unidad', vu:380, mat_pct:0.70, days_per_qty:0.5, multiplicable:true },
  { code:'5.4.1', phase:'5', subcat:'Cocina', desc:'Gabinetes de cocina (semi a medida)', unit:'ft lineal', vu:280, mat_pct:0.70, days_per_qty:0.15 },
  { code:'5.4.2', phase:'5', subcat:'Cocina', desc:'Mesones de cocina (cuarzo)', unit:'ft²', vu:75, mat_pct:0.75, days_per_qty:0.05 },
  { code:'5.4.3', phase:'5', subcat:'Cocina', desc:'Salpicadero de azulejo', unit:'ft²', vu:22, mat_pct:0.50, days_per_qty:0.05 },
  { code:'5.4.4', phase:'5', subcat:'Cocina', desc:'Lavaplatos + grifería', unit:'unidad', vu:550, mat_pct:0.80, days_per_qty:0.5 },
  { code:'5.4.5', phase:'5', subcat:'Cocina', desc:'Construcción de isla de cocina', unit:'unidad', vu:2200, mat_pct:0.55, days_per_qty:2 },
  { code:'5.4.6', phase:'5', subcat:'Cocina', desc:'Electrodomésticos (estufa/nevera/lavavajillas/microondas)', unit:'juego', vu:4500, mat_pct:0.95, days_per_qty:0.5 },
  { code:'5.6.1', phase:'5', subcat:'Pisos', desc:'Instalación de pisos (LVP)', unit:'ft²', vu:5.50, mat_pct:0.60, days_per_qty:0.008 },
  { code:'5.6.2', phase:'5', subcat:'Pisos', desc:'Instalación de alfombra (dormitorios)', unit:'ft²', vu:3.50, mat_pct:0.55, days_per_qty:0.005 },
  { code:'5.6.3', phase:'5', subcat:'Pisos', desc:'Instalación de zócalos', unit:'ft lineal', vu:5, mat_pct:0.50, days_per_qty:0.015 },
  { code:'5.8.1', phase:'5', subcat:'Carpintería', desc:'Reemplazo de puertas interiores', unit:'unidad', vu:380, mat_pct:0.65, days_per_qty:0.5 },
  { code:'5.8.2', phase:'5', subcat:'Carpintería', desc:'Estantería de closet', unit:'unidad', vu:300, mat_pct:0.60, days_per_qty:0.5 },
  // Redes (plomería, eléctrica, HVAC) — categorizadas en interno
  { code:'5.1.4', phase:'5', subcat:'Redes Eléctricas', desc:'Tomacorrientes e interruptores (interior)', unit:'casa', vu:900, mat_pct:0.40, days_per_qty:1 },
  { code:'5.1.5', phase:'5', subcat:'Redes Eléctricas', desc:'Actualización de panel eléctrico', unit:'unidad', vu:3500, mat_pct:0.50, days_per_qty:2 },
  { code:'5.1.6', phase:'5', subcat:'Redes Eléctricas', desc:'Recableado de toda la casa', unit:'casa', vu:9000, mat_pct:0.35, days_per_qty:5 },
  { code:'5.1.7', phase:'5', subcat:'Redes Eléctricas', desc:'Luminarias + ventiladores de techo', unit:'casa', vu:1200, mat_pct:0.55, days_per_qty:1 },
  { code:'5.1.9', phase:'5', subcat:'Redes Eléctricas', desc:'Detectores de humo y CO (cableados)', unit:'casa', vu:350, mat_pct:0.55, days_per_qty:1 },
  { code:'5.2.1p', phase:'5', subcat:'Plomería', desc:'Recambio de tubería de toda la casa (PEX)', unit:'casa', vu:11000, mat_pct:0.40, days_per_qty:6 },
  { code:'5.2.2p', phase:'5', subcat:'Plomería', desc:'Reemplazo de tubería principal de aguas residuales', unit:'casa', vu:6500, mat_pct:0.40, days_per_qty:5 },
  { code:'5.2.3p', phase:'5', subcat:'Plomería', desc:'Reemplazo de calentador de agua', unit:'unidad', vu:2200, mat_pct:0.70, days_per_qty:1 },
  { code:'5.2.4p', phase:'5', subcat:'Plomería', desc:'Aparatos sanitarios (lavamanos, grifería, etc.)', unit:'casa', vu:1200, mat_pct:0.55, days_per_qty:2 },
  { code:'5.5.1h', phase:'5', subcat:'HVAC', desc:'Reemplazo de sistema HVAC (AC + caldera + ductos)', unit:'casa', vu:13000, mat_pct:0.70, days_per_qty:4 },
  { code:'5.5.2h', phase:'5', subcat:'HVAC', desc:'Reparación HVAC / solo 1 unidad', unit:'unidad', vu:6500, mat_pct:0.70, days_per_qty:2 },

  // ─── 6. LIMPIEZA ───
  { code:'6.1.1', phase:'6', subcat:'Acabados finales', desc:'Pintura de retoque y reparaciones', unit:'proyecto', vu:800, mat_pct:0.30, days_per_qty:1 },
  { code:'6.2.1', phase:'6', subcat:'Cierre', desc:'Completar lista de pendientes (punch list)', unit:'proyecto', vu:600, mat_pct:0.10, days_per_qty:2 },
  { code:'6.2.2', phase:'6', subcat:'Cierre', desc:'Tarifas de inspección final municipal', unit:'unidad', vu:250, mat_pct:0.0, days_per_qty:1 },
  { code:'6.2.3', phase:'6', subcat:'Cierre', desc:'Limpieza profunda previa a entrega', unit:'casa', vu:600, mat_pct:0.10, days_per_qty:2 },
  { code:'6.3.1', phase:'6', subcat:'Limpieza final', desc:'Limpieza final de construcción', unit:'ft²', vu:0.45, mat_pct:0.10, days_per_qty:0.001 },
  { code:'6.3.2', phase:'6', subcat:'Limpieza final', desc:'Limpieza profunda (interior + exterior)', unit:'casa', vu:800, mat_pct:0.10, days_per_qty:1 }
];

// Diccionario de traducción de unidades viejas (inglés) → nuevas (español)
// Aplica al cargar catalog del DB que pueda tener unidades en inglés
const RM_UNIT_TRANSLATIONS = {
  'sqft': 'ft²',
  'unit': 'unidad',
  'project': 'proyecto',
  'load': 'carga',
  'house': 'casa',
  'roof': 'techo',
  'set': 'juego',
  'lin_ft': 'ft lineal',
  'lf': 'ft lineal',
  'door': 'unidad',
  'beam': 'unidad',
  'panel': 'unidad',
  'closet': 'unidad',
  'inspection': 'unidad'
};
function rmNormalizeUnit(u) {
  if (!u) return u;
  return RM_UNIT_TRANSLATIONS[u.toLowerCase()] || u;
}

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
  customActivities: {},  // items custom agregados por etapa: { code: { phase, subcat, desc, unit, qty, vu, days, mat_pct } }
  // Pricing (estándar industria)
  contingencyPct: 15,
  overheadPct: 10,
  permitsCost: 1500,
  designFeesCost: 0,
  markupPct: 25,
  crewSize: 3,
  workDays: 6,
  jornadaH: 8,            // jornada (h/día) global del editor → horas por etapa = días × jornada
  costoHora: null,        // costo/hora global del proyecto (opcional; persiste en mo_costo_hora)
  crewByPhase: {},        // Nivel 2: cuadrilla por etapa { phase: [{nombre, tarifa, horas}] } · horas null = días×jornada
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
// Override en español para catálogo del DB que pueda estar en inglés.
// Mapeo por código → { desc, subcat, unit } en español.
// Se aplica automáticamente en rmGetCatalog() y rmGetCatalogTranslated().
const RM_ES_OVERRIDES = {
  '1.1.1':  { desc:'Demolición de pisos - hasta la estructura', unit:'ft²', subcat:'Demoliciones' },
  '1.1.3':  { desc:'Desmonte de cocina (gabinetes, mesones, electrodomésticos)', unit:'unidad', subcat:'Demoliciones' },
  '1.1.4':  { desc:'Desmonte de baño (demolición completa)', unit:'unidad', subcat:'Demoliciones' },
  '1.1.6':  { desc:'Retiro de drywall', unit:'ft²', subcat:'Demoliciones' },
  '1.1.7':  { desc:'Demolición superior de concreto (entrada/patio)', unit:'ft²', subcat:'Demoliciones' },
  '1.1.8':  { desc:'Retiro de muro - estructural', unit:'ft²', subcat:'Demoliciones' },
  '1.1.9':  { desc:'Alquiler de contenedor (por carga)', unit:'carga', subcat:'Disposición' },
  '1.1.10': { desc:'Acarreo de escombros', unit:'proyecto', subcat:'Disposición' },
  '1.1.11': { desc:'Protección de sitio, plástico, señalización', unit:'proyecto', subcat:'Preliminares' },
  '1.1.12': { desc:'Tarifas de disposición/vertedero por carga', unit:'carga', subcat:'Disposición' },
  '1.1.13': { desc:'Retiro de basura existente', unit:'ft²', subcat:'Disposición' },
  '2.1.1':  { desc:'Evaluación e inspección de cimentación', unit:'proyecto', subcat:'Reparación' },
  '2.1.4':  { desc:'Reparación de grietas en cimentación (asentamiento básico)', unit:'proyecto', subcat:'Reparación' },
  '2.2.1':  { desc:'Excavación y nivelación del terreno', unit:'proyecto', subcat:'Concreto' },
  '2.2.6':  { desc:'Reparación de losa de concreto', unit:'unidad', subcat:'Concreto' },
  '2.2.9':  { desc:'Sistema de impermeabilización (cimentación)', unit:'proyecto', subcat:'Concreto' },
  '3.1.1':  { desc:'Reemplazo de techo (tejas arquitectónicas)', unit:'techo', subcat:'Cubierta' },
  '3.1.2':  { desc:'Membrana y tapajuntas de techo', unit:'techo', subcat:'Cubierta' },
  '3.1.3':  { desc:'Canaletas y bajantes', unit:'ft lineal', subcat:'Cubierta' },
  '3.2.1':  { desc:'Reemplazo de cerramiento', unit:'techo', subcat:'Cerramiento' },
  '3.3.1':  { desc:'Reemplazo de revestimiento (fibrocemento Hardieboard)', unit:'ft²', subcat:'Fachada' },
  '3.3.2':  { desc:'Acento de piedra (manufacturada)', unit:'ft²', subcat:'Fachada' },
  '3.3.3':  { desc:'Pintura exterior (casa completa, preparación total)', unit:'casa', subcat:'Fachada' },
  '3.4.1':  { desc:'Reemplazo de revestimiento (fibrocemento Hardieboard)', unit:'ft²', subcat:'Fachada' },
  '3.4.2':  { desc:'Acento de piedra (manufacturada)', unit:'ft²', subcat:'Fachada' },
  '3.4.3':  { desc:'Pintura exterior (casa completa, preparación total)', unit:'casa', subcat:'Fachada' },
  '3.5.1':  { desc:'Puerta principal de entrada (premium)', unit:'unidad', subcat:'Puertas' },
  '3.5.2':  { desc:'Puertas exteriores secundarias (atrás/lateral)', unit:'unidad', subcat:'Puertas' },
  '3.6.1':  { desc:'Instalación de patio de concreto', unit:'ft²', subcat:'Urbanismo' },
  '3.6.2':  { desc:'Construcción de deck de madera', unit:'ft²', subcat:'Urbanismo' },
  '3.6.3':  { desc:'Reparación/repavimentación de entrada vehicular', unit:'ft²', subcat:'Urbanismo' },
  '3.6.4':  { desc:'Paisajismo y césped (renovación total)', unit:'proyecto', subcat:'Urbanismo' },
  '3.7.1':  { desc:'Reemplazo de ventanas (eficiencia energética, todas)', unit:'casa', subcat:'Fachada' },
  '3.13':   { desc:'Reparación/repavimentación de entrada vehicular', unit:'proyecto', subcat:'Urbanismo' },
  '3.13.1': { desc:'Reparación/repavimentación de entrada vehicular', unit:'proyecto', subcat:'Urbanismo' },
  '3.14':   { desc:'Cerca de madera (perímetro)', unit:'ft lineal', subcat:'Urbanismo' },
  '3.14.1': { desc:'Cerca de madera (perímetro)', unit:'ft lineal', subcat:'Urbanismo' },
  '3.15':   { desc:'Paisajismo y césped (renovación total)', unit:'proyecto', subcat:'Urbanismo' },
  '3.15.1': { desc:'Paisajismo y césped (renovación total)', unit:'proyecto', subcat:'Urbanismo' },
  '3.16':   { desc:'Reemplazo de columnas de madera', unit:'unidad', subcat:'Fachada' },
  '3.16.1': { desc:'Reemplazo de columnas de madera', unit:'unidad', subcat:'Fachada' },
  '4.1.2':  { desc:'Enmarcado de madera (carpintería estructural, casa completa)', unit:'ft²', subcat:'Estructura' },
  '4.1.3':  { desc:'Viga de acero / modificación de muro estructural', unit:'unidad', subcat:'Estructura' },
  '4.1.4':  { desc:'Enmarcado de techo / reparación de cerchas', unit:'ft²', subcat:'Estructura' },
  '4.1.5':  { desc:'Instalación de subpiso (nuevo)', unit:'ft²', subcat:'Estructura' },
  '4.2.1':  { desc:'Permisos de construcción (remodelación casa completa)', unit:'proyecto', subcat:'Permisos' },
  '4.2.2':  { desc:'Honorarios de arquitecto / ingeniero estructural', unit:'proyecto', subcat:'Permisos' },
  '4.2.3':  { desc:'Gestión de contratista general (overhead)', unit:'proyecto', subcat:'Permisos' },
  '5.1.1':  { desc:'Instalación/reemplazo de drywall', unit:'ft²', subcat:'Muros' },
  '5.1.2':  { desc:'Pintura interior (casa completa)', unit:'ft²', subcat:'Muros' },
  '5.1.3':  { desc:'Aislamiento - paneles de muro', unit:'ft²', subcat:'Muros' },
  '5.1.4':  { desc:'Tomacorrientes e interruptores (interior)', unit:'casa', subcat:'Redes Eléctricas' },
  '5.1.5':  { desc:'Actualización de panel eléctrico', unit:'unidad', subcat:'Redes Eléctricas' },
  '5.1.6':  { desc:'Recableado de toda la casa', unit:'casa', subcat:'Redes Eléctricas' },
  '5.1.7':  { desc:'Luminarias + ventiladores de techo', unit:'casa', subcat:'Redes Eléctricas' },
  '5.1.9':  { desc:'Detectores de humo y CO (cableados)', unit:'casa', subcat:'Redes Eléctricas' },
  '5.2.1':  { desc:'Instalación de molduras de techo', unit:'ft lineal', subcat:'Techo' },
  '5.2.1p': { desc:'Recambio de tubería de toda la casa (PEX)', unit:'casa', subcat:'Plomería' },
  '5.2.2p': { desc:'Reemplazo de tubería principal de aguas residuales', unit:'casa', subcat:'Plomería' },
  '5.2.3':  { desc:'Aislamiento - soplado en ático', unit:'ft²', subcat:'Techo' },
  '5.2.3p': { desc:'Reemplazo de calentador de agua', unit:'unidad', subcat:'Plomería' },
  '5.2.4':  { desc:'Instalación/reemplazo de drywall (techo)', unit:'ft²', subcat:'Techo' },
  '5.2.4p': { desc:'Aparatos sanitarios (lavamanos, grifería, etc.)', unit:'casa', subcat:'Plomería' },
  '5.3.1':  { desc:'Enchape de baño (piso + muros)', unit:'ft²', subcat:'Baños' },
  '5.3.2':  { desc:'Instalación de ducha a medida', unit:'unidad', subcat:'Baños' },
  '5.3.3':  { desc:'Cerramiento de ducha en vidrio', unit:'unidad', subcat:'Baños' },
  '5.3.4':  { desc:'Accesorios de baño (botiquín, espejo, toalleros)', unit:'juego', subcat:'Baños' },
  '5.3.5':  { desc:'Mueble de lavamanos + mesón', unit:'unidad', subcat:'Baños' },
  '5.3.6':  { desc:'Reemplazo de inodoro', unit:'unidad', subcat:'Baños' },
  '5.4.1':  { desc:'Gabinetes de cocina (semi a medida)', unit:'ft lineal', subcat:'Cocina' },
  '5.4.2':  { desc:'Mesones de cocina (cuarzo)', unit:'ft²', subcat:'Cocina' },
  '5.4.3':  { desc:'Salpicadero de azulejo', unit:'ft²', subcat:'Cocina' },
  '5.4.4':  { desc:'Lavaplatos + grifería', unit:'unidad', subcat:'Cocina' },
  '5.4.5':  { desc:'Construcción de isla de cocina', unit:'unidad', subcat:'Cocina' },
  '5.4.6':  { desc:'Electrodomésticos (estufa/nevera/lavavajillas/microondas)', unit:'juego', subcat:'Cocina' },
  '5.4.7':  { desc:'Lavaplatos + grifería', unit:'juego', subcat:'Cocina' },
  '5.4.8':  { desc:'Construcción de isla de cocina', unit:'ft lineal', subcat:'Cocina' },
  '5.5.1':  { desc:'Reemplazo de puertas interiores', unit:'unidad', subcat:'Carpintería' },
  '5.5.1h': { desc:'Reemplazo de sistema HVAC (AC + caldera + ductos)', unit:'casa', subcat:'HVAC' },
  '5.5.2':  { desc:'Sistemas de closet', unit:'unidad', subcat:'Carpintería' },
  '5.5.2h': { desc:'Reparación HVAC / solo 1 unidad', unit:'unidad', subcat:'HVAC' },
  '5.6.1':  { desc:'Recableado de toda la casa', unit:'proyecto', subcat:'Eléctrico' },
  '5.6.3':  { desc:'Instalación de circuitos nuevos', unit:'unidad', subcat:'Eléctrico' },
  '5.6.4':  { desc:'Tomacorrientes e interruptores (interior)', unit:'unidad', subcat:'Eléctrico' },
  '5.6.6':  { desc:'Instalación de luminarias', unit:'unidad', subcat:'Eléctrico' },
  '5.6.7':  { desc:'Iluminación empotrada (set de 6)', unit:'unidad', subcat:'Eléctrico' },
  '5.6.9':  { desc:'Detectores de humo y CO (cableados)', unit:'unidad', subcat:'Eléctrico' },
  '5.7.1':  { desc:'Sistema HVAC nuevo (AC + caldera alta eficiencia)', unit:'proyecto', subcat:'HVAC' },
  '5.7.2':  { desc:'Instalación/reemplazo de ductos', unit:'ft lineal', subcat:'HVAC' },
  '5.8.1':  { desc:'Recambio de tubería de toda la casa (PEX)', unit:'unidad', subcat:'Carpintería' },
  '5.8.2':  { desc:'Reemplazo de tubería principal de aguas residuales', unit:'unidad', subcat:'Carpintería' },
  '5.8.3':  { desc:'Calentador de agua tipo tanque', unit:'unidad', subcat:'Hidrosanitario' },
  '5.9.1':  { desc:'Piso de madera (hardwood)', unit:'ft²', subcat:'Pisos' },
  '5.9.2':  { desc:'Instalación de zócalos', unit:'ft lineal', subcat:'Pisos' },
  '5.9.3':  { desc:'Nivelación de piso con concreto', unit:'ft²', subcat:'Pisos' },
  '5.6.1':  { desc:'Instalación de pisos (LVP)', unit:'ft²', subcat:'Pisos' },
  '5.6.2':  { desc:'Instalación de alfombra (dormitorios)', unit:'ft²', subcat:'Pisos' },
  '5.6.3':  { desc:'Instalación de zócalos', unit:'ft lineal', subcat:'Pisos' },
  '5.8.1':  { desc:'Reemplazo de puertas interiores', unit:'unidad', subcat:'Carpintería' },
  '5.8.2':  { desc:'Estantería de closet', unit:'unidad', subcat:'Carpintería' },
  '5.10.1': { desc:'Mobiliario (dormitorios, cocina, baños, sala)', unit:'juego', subcat:'Mobiliario' },
  '6.1.1':  { desc:'Pintura de retoque y reparaciones', unit:'proyecto', subcat:'Acabados finales' },
  '6.2.1':  { desc:'Completar lista de pendientes (punch list)', unit:'proyecto', subcat:'Cierre' },
  '6.2.2':  { desc:'Tarifas de inspección final municipal', unit:'unidad', subcat:'Cierre' },
  '6.2.3':  { desc:'Limpieza profunda previa a entrega', unit:'casa', subcat:'Cierre' },
  '6.3.1':  { desc:'Limpieza final de construcción', unit:'ft²', subcat:'Limpieza final' },
  '6.3.2':  { desc:'Limpieza profunda (interior + exterior)', unit:'casa', subcat:'Limpieza final' }
};

function rmGetCatalog() {
  // Base catalog + custom items para que los selectedActivities tengan definición
  // Si el item está en RM_ES_OVERRIDES, se sobrescribe desc/unit/subcat con la versión en español
  const rawBase = rmActiveCatalog || RM_CATALOG;
  const base = rawBase.map(c => {
    const o = RM_ES_OVERRIDES[c.code];
    return o
      ? { ...c, desc: o.desc, unit: o.unit, subcat: o.subcat }
      : { ...c, unit: rmNormalizeUnit(c.unit) };
  });
  const customs = Object.values((typeof rmState !== 'undefined' && rmState.customActivities) || {});
  return customs.length ? [...base, ...customs] : base;
}

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

// Escape HTML para usar en value="..." (evita que & " < rompan el atributo)
const rmEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function rmFmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('es-MX', {day:'numeric', month:'short'}); }
function rmAddWorkDays(start, n) { let d = new Date(start); let added = 0; while (added < n) { d.setDate(d.getDate() + 1); const dw = d.getDay(); if (dw !== 0 && dw !== 6) added++; } while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return d; }
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

  // ── Nivel 2: cuadrilla detallada por etapa MANDA sobre el labor por coeficiente ──
  // MO_etapa = Σ_persona (tarifa × horas) · horas por defecto = días_etapa × jornada (editable por persona).
  const jornadaH = +rmState.jornadaH || 0;
  for (const p of Object.keys(byPhase)) {
    const crew = (rmState.crewByPhase?.[p] || []).filter(c => (+c.tarifa || 0) > 0);
    if (!crew.length) continue;
    const horasDefault = (byPhase[p].days || 0) * jornadaH;
    const moCrew = crew.reduce((s, c) => {
      const horas = (c.horas != null && c.horas !== '') ? +c.horas : horasDefault;
      return s + (+c.tarifa || 0) * (horas || 0);
    }, 0);
    byPhase[p].laborCoef = byPhase[p].labor;   // MO referencia (coeficiente) para comparar
    byPhase[p].labor = moCrew;                  // el detallado reemplaza el MO de la etapa
    byPhase[p].crewActivo = true;
    byPhase[p].total = byPhase[p].material + byPhase[p].labor + byPhase[p].equipment;
  }

  // Totales derivados de byPhase para que el override de cuadrilla impacte la cascada de pricing
  const totals = Object.values(byPhase).reduce((a, x) => ({
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
    sb.from('remodel_projects').select('*').is('archived_at', null).order('updated_at', { ascending: false }),
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
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${await window.getAccessToken()}` },
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
  if (typeof rmPersistCrew === 'function') rmPersistCrew(); // re-guarda cuadrilla bajo la key del id ya asignado
  // Persistir MO en DB aparte (si las columnas mo_* no existen aún, queda en localStorage sin romper)
  await moSaveProjectMo(rmState.currentProject?.id);
  await rmLoadAll();
  rmRender();
  await rmAutoGenPlanner(rmState.currentProject?.id, rmState.editName || rmState.currentProject?.name);
  alert('✓ Estimación guardada. Cronograma (Planner) y seguimiento generados.');
}

async function rmLoadProject(p) {
  rmState.currentProject = p;
  rmState.obraPro = null;
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
  // ── MO: fuente de verdad = DB; fallback localStorage + migración pasiva ──
  const dbCrew = (p.mo_crew_by_phase && typeof p.mo_crew_by_phase === 'object') ? p.mo_crew_by_phase : null;
  const hasDbMo = (p.mo_crew_size != null) || (p.mo_costo_hora != null) || (dbCrew && Object.keys(dbCrew).length);
  if (hasDbMo) {
    rmState.crewSize = p.mo_crew_size != null ? p.mo_crew_size : rmState.crewSize;
    rmState.costoHora = p.mo_costo_hora != null ? p.mo_costo_hora : null;
    rmState.jornadaH = p.mo_jornada_h != null ? p.mo_jornada_h : 8;
    rmState.crewByPhase = dbCrew || {};
    if (typeof rmPersistCrew === 'function') rmPersistCrew(); // refresca backup local
    moSync.status = 'synced'; moSync.at = Date.now();
  } else {
    // Proyecto viejo: levantar de localStorage y, si hay datos, migrarlos a la nube (pasivo).
    if (typeof rmRestoreCrew === 'function') rmRestoreCrew();
    if (Object.keys(rmState.crewByPhase || {}).length) {
      moSaveProjectMo(p.id).then(ok => { if (ok && window.toast) window.toast('✓ Cuadrilla migrada a la nube', 'success'); });
    } else {
      moSync.status = 'idle';
    }
  }
  // Proyecto activo COMPARTIDO (obs #19): persiste para que todos los pasos/tabs
  // (y la próxima apertura del Estimador) abran con esta misma casa.
  try {
    window.RM_ACTIVE = { projectId: p.id, address: p.address || p.name || '' };
    localStorage.setItem('rm_active_project', JSON.stringify(window.RM_ACTIVE));
  } catch (e) { /* storage bloqueado: no rompe */ }
  rmState.tab = 'editor';
  rmRender();
}

function rmNewProject() {
  try { window.RM_ACTIVE = null; localStorage.removeItem('rm_active_project'); } catch (e) {}
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
  if (typeof fcLoadConfig === 'function') { fcState.sys = sys; await fcLoadConfig().catch(() => {}); }
  openModal(`🏗️ ${sys.name}`, '<div id="rm-root"></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  rmRender();
  rmRestoreActiveProject(); // async: si había proyecto activo guardado, lo re-carga sin cambiar de tab
}

// Restaura el proyecto activo guardado (localStorage `rm_active_project`) al abrir el Estimador.
// Mantiene la tab actual (rmLoadProject fuerza 'editor' → la devolvemos).
async function rmRestoreActiveProject() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('rm_active_project') || 'null'); } catch (e) { return; }
  if (!saved || !saved.projectId || rmState.currentProject) return;
  const p = (rmState.projects || []).find(function (x) { return x.id === saved.projectId; });
  if (!p) return;
  const keepTab = rmState.tab;
  try {
    await rmLoadProject(p);
    rmState.tab = keepTab;
    rmRender();
  } catch (e) { /* si falla la carga, el Estimador queda como estaba */ }
}

// ─── FLUJO EN 3 FASES (obs #19 CEO): 1️⃣ Proyecto → 2️⃣ Estimar → 3️⃣ SOW/Obra ───
// Los 17 tabs viejos NO se borran: se reagrupan como sub-tabs dentro de 3 pasos.
// El grupo activo se DERIVA de rmState.tab (mapa tab→grupo) → cualquier rmSetTab /
// deep-link viejo desde otros módulos sigue funcionando sin cambios.
const RM_GROUPS = [
  { id: 'proyecto', num: '1', name: 'Proyecto',   tabs: ['projects', 'seguimiento', 'versions'] },
  { id: 'estimar',  num: '2', name: 'Estimar',    tabs: ['editor', 'forecast', 'compare', 'rates', 'catalog', 'learning', 'calibration', 'agent'] },
  { id: 'obra',     num: '3', name: 'SOW / Obra', tabs: ['sow', 'obrapro', 'gantt', 'purchases', 'field', 'crew'] }
];
// Tabs "ocultas" (sin botón propio, alcanzables por código) también mapeadas.
const RM_TAB_GROUP = (function () {
  const m = { quick: 'estimar', suppliers_sub: 'obra' };
  RM_GROUPS.forEach(function (g) { g.tabs.forEach(function (t) { m[t] = g.id; }); });
  return m;
})();
const RM_LAST_TAB_BY_GROUP = {}; // última sub-tab visitada por grupo (volver donde estabas)

function rmNavEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rmTabLabels() {
  const samplesCount = (Object.values(rmDynamicBenchmarks || {}).reduce(function (s, d) { return s + (d.samples || 0); }, 0)) + 5;
  return {
    projects: '📁 Proyectos (' + rmState.projects.length + ')',
    compare: '🎯 3 Estimaciones',
    rates: '📊 Tasas $/ft²',
    editor: rmState.currentProject ? ('✏️ ' + rmNavEsc(rmState.currentProject.name)) : '➕ Editor detallado',
    forecast: '🔮 Pronóstico',
    seguimiento: '🔄 Seguimiento',
    gantt: '📅 Cronograma',
    sow: '📋 SOW (Lender)',
    obrapro: '🏗 Obra Pro',
    versions: rmState.currentProject ? ('📜 Historial (' + rmState.versions.length + 'v · ' + rmState.changeOrders.length + 'CO)') : '📜 Historial',
    crew: '👷 Crew (' + rmState.crew.length + ')',
    purchases: '🛒 Lista compra',
    field: '📱 Vista campo',
    agent: '🤖 IA Agente',
    catalog: '🛠 Catálogo (' + rmGetCatalog().length + ')',
    learning: '📈 Precisión (' + samplesCount + ')',
    calibration: '🎯 Calibración'
  };
}

function rmActiveGroupId() { return RM_TAB_GROUP[rmState.tab] || 'proyecto'; }

// Barra de navegación: pasos 1→2→3 + chip de proyecto activo + sub-tabs del grupo.
// Estilos con tokens del tema (var(--ink)/var(--mut)/var(--glass)) → legible claro/oscuro.
function rmNavHtml() {
  const labels = rmTabLabels();
  const activeGroup = rmActiveGroupId();
  const grp = RM_GROUPS.find(function (g) { return g.id === activeGroup; }) || RM_GROUPS[0];
  let steps = '';
  RM_GROUPS.forEach(function (g, i) {
    const on = g.id === activeGroup;
    if (i) steps += '<span style="color:var(--mut,#94a3b8);font-size:13px;flex:none">→</span>';
    steps += '<button onclick="rmSetGroup(\'' + g.id + '\')" style="flex:none;display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;'
      + (on
        ? 'border:1px solid var(--a1,#2563eb);background:var(--a1,#2563eb);color:#fff'
        : 'border:1px solid var(--glassb,#e2e8f0);background:var(--glass,rgba(148,163,184,.08));color:var(--ink,#0f172a)')
      + '"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:11px;font-weight:800;'
      + (on ? 'background:rgba(255,255,255,.25);color:#fff' : 'background:var(--glassb,#e2e8f0);color:var(--mut,#64748b)')
      + '">' + g.num + '</span>' + g.name + '</button>';
  });
  // Chip del proyecto activo (compartido entre todos los pasos)
  let chip = '';
  if (rmState.currentProject) {
    chip = '<span style="flex:none;margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:11px;font-weight:600;border:1px solid var(--glassb,#e2e8f0);background:var(--glass,rgba(148,163,184,.08));color:var(--mut,#475569)" title="Proyecto activo: todos los pasos abren con esta casa">📌 '
      + rmNavEsc(rmState.currentProject.address || rmState.currentProject.name || '')
      + ' <a onclick="rmSetTab(\'projects\')" style="cursor:pointer;text-decoration:underline;color:var(--a1,#2563eb)">cambiar</a></span>';
  }
  let subs = '';
  grp.tabs.forEach(function (t) {
    const on = rmState.tab === t;
    subs += '<button onclick="rmSetTab(\'' + t + '\')" style="flex:none;padding:8px 12px;font-size:12.5px;font-weight:600;white-space:nowrap;cursor:pointer;background:none;border:none;border-bottom:2px solid '
      + (on ? 'var(--a1,#2563eb);color:var(--ink,#0f172a)' : 'transparent;color:var(--mut,#64748b)')
      + '">' + (labels[t] || t) + '</button>';
  });
  return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">' + steps + chip + '</div>'
    + '<div style="display:flex;gap:2px;margin:0 -24px 16px;padding:0 24px;overflow-x:auto;border-bottom:1px solid var(--glassb,#e2e8f0)">' + subs + '</div>';
}

function rmRender() {
  const root = document.getElementById('rm-root');
  if (!root) return;
  // Recordar la última sub-tab del grupo (aunque el tab se haya seteado directo, sin rmSetTab)
  const g = RM_TAB_GROUP[rmState.tab];
  if (g) {
    const def = RM_GROUPS.find(function (x) { return x.id === g; });
    if (def && def.tabs.indexOf(rmState.tab) >= 0) RM_LAST_TAB_BY_GROUP[g] = rmState.tab;
  }
  root.innerHTML = rmNavHtml() + '<div id="rm-body"></div>';
  rmRenderTab();
}

function rmSetTab(t) { rmState.tab = t; rmRender(); }

function rmSetGroup(gid) {
  const grp = RM_GROUPS.find(function (x) { return x.id === gid; });
  if (!grp) return;
  const last = RM_LAST_TAB_BY_GROUP[gid];
  rmSetTab(last && grp.tabs.indexOf(last) >= 0 ? last : grp.tabs[0]);
}

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

// ════════════════════════════════════════════════════════════════
// SINCRONIZACIÓN DEL MO (compartida Editor + Pronóstico)
// Fuente de verdad = Supabase · localStorage = backup/offline.
// ════════════════════════════════════════════════════════════════
const moSync = { status: 'idle', at: 0, err: '', pending: null }; // idle|saving|synced|offline|error
function moSyncAgo() {
  if (!moSync.at) return '';
  const s = Math.round((Date.now() - moSync.at) / 1000);
  if (s < 60) return `hace ${s} seg`;
  const m = Math.round(s / 60);
  return `hace ${m} min`;
}
function moSyncBadgeHtml() {
  const map = {
    idle:    ['', ''],
    saving:  ['💾 Guardando…', 'bg-amber-100 text-amber-800'],
    synced:  [`☁️ Sincronizado · ${moSyncAgo()}`, 'bg-emerald-100 text-emerald-700'],
    offline: ['⚠️ Modo offline', 'bg-orange-100 text-orange-800'],
    error:   ['❌ Error de sync — reintentar', 'bg-red-100 text-red-700'],
  };
  const [txt, cls] = map[moSync.status] || map.idle;
  if (!txt) return '<span id="mo-sync-badge"></span>';
  const clickable = (moSync.status === 'error' || moSync.status === 'offline');
  return `<span id="mo-sync-badge" class="text-[10px] px-2 py-0.5 rounded ${cls}" ${clickable ? 'onclick="moRetrySync()" style="cursor:pointer" title="Click para reintentar"' : moSync.status==='offline'?'title="Datos en local, se sincronizan al volver la red"':''}>${txt}</span>`;
}
function moSetSync(status, err) {
  moSync.status = status; moSync.at = Date.now(); moSync.err = err || '';
  const el = document.getElementById('mo-sync-badge');
  if (el) el.outerHTML = moSyncBadgeHtml();
}
// Persiste los 4 campos de MO del proyecto en Supabase (update separado del save principal,
// así si las columnas mo_* aún no existen NO rompe el guardado del proyecto).
async function moSaveProjectMo(projectId) {
  if (!projectId) return false;
  const mo = {
    mo_crew_size: (rmState.crewSize != null ? +rmState.crewSize : null),
    mo_costo_hora: (rmState.costoHora != null && rmState.costoHora !== '' ? +rmState.costoHora : null),
    mo_jornada_h: (rmState.jornadaH != null ? +rmState.jornadaH : 8),
    mo_crew_by_phase: rmState.crewByPhase || {}
  };
  moSync.pending = { projectId, mo };
  moSetSync('saving');
  try {
    const { error } = await sb.from('remodel_projects').update(mo).eq('id', projectId);
    if (error) throw error;
    moSync.pending = null;
    moSetSync('synced');
    return true;
  } catch (e) {
    // Falla (sin red, o columnas mo_* aún no migradas) → queda en localStorage, no rompe UI
    moSetSync(navigator.onLine ? 'error' : 'offline', e.message);
    return false;
  } finally {
    if (typeof rmPersistCrew === 'function') rmPersistCrew(); // backup local siempre
  }
}
// Reintento manual (click en el badge) o automático al volver la red
async function moRetrySync() {
  if (moSync.pending) return moSaveProjectMo(moSync.pending.projectId);
  if (rmState.currentProject?.id) return moSaveProjectMo(rmState.currentProject.id);
}
// Autosave con debounce de 2s ante cualquier cambio de MO
let _moAutosaveTimer = null;
function moScheduleAutosave() {
  if (typeof rmPersistCrew === 'function') rmPersistCrew(); // local inmediato
  if (!rmState.currentProject?.id) return;                  // sin proyecto guardado: solo local
  clearTimeout(_moAutosaveTimer);
  _moAutosaveTimer = setTimeout(() => moSaveProjectMo(rmState.currentProject.id), 2000);
}
// Re-sync automático cuando vuelve la conexión
if (typeof window !== 'undefined' && !window._moOnlineHooked) {
  window._moOnlineHooked = true;
  window.addEventListener('online', () => { if (moSync.pending) moRetrySync(); });
}

function rmRenderTab() {
  const body = document.getElementById('rm-body');
  if (rmState.tab === 'projects') return rmRenderProjects(body);
  if (rmState.tab === 'quick') return rmRenderQuick(body);
  if (rmState.tab === 'compare') return rmRenderCompare(body);
  if (rmState.tab === 'rates') return rmRenderRates(body);
  if (rmState.tab === 'editor') return rmRenderEditor(body);
  if (rmState.tab === 'forecast') return (typeof fcRenderTab === 'function') ? fcRenderTab(body) : (body.innerHTML = '<p class="text-slate-500 py-8 text-center">Módulo de pronóstico no cargado.</p>');
  if (rmState.tab === 'seguimiento') return rmRenderSeguimiento(body);
  if (rmState.tab === 'gantt') return rmRenderGantt(body);
  if (rmState.tab === 'sow') return rmRenderSow(body);
  if (rmState.tab === 'obrapro') return rmRenderObraPro(body);
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
            <input type="number" value="${sqft}" onchange="rmQuickState.sqft=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
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
              <input type="number" value="${sqft}" onchange="rmQuickState.sqft=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-3 py-2 text-lg font-bold" />
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
  // SOFT-DELETE (causa raíz de la pérdida): archiva en vez de borrar en duro → reversible.
  if (!confirm('¿Archivar este proyecto? (reversible — no se borra la data)')) return;
  const { error } = await sb.from('remodel_projects').update({ archived_at: new Date().toISOString() }).eq('id', id);
  if (error) { if (window.toast) toast('No pude archivar: ' + error.message, 'error'); return; }
  await rmLoadAll();
  rmRender();
}

// Helper: cargar un proyecto guardado por id (desde el picker del editor)
function rmPickSavedProject(id) {
  if (!id) return;
  const p = rmState.projects.find(x => x.id === id);
  if (!p) return alert('Proyecto no encontrado');
  rmLoadProject(p);
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
      resizeDelay: 200,
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
      resizeDelay: 200,
      scales: { x: { stacked: true, ticks: { font: { size: 8 } } }, y: { stacked: true, ticks: { font: { size: 8 }, callback: (v) => '$' + (v/1000) + 'k' } } },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10, padding: 6 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${rmFmt(c.raw)}` } }
      }
    }
  });
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

// ============================================================
// EXPORT EXCEL DENFIELD — 12 hojas con ExcelJS (estilo + fórmulas)
// Usa los datos REALES del Editor Detallado (qty + vu por actividad).
// ============================================================
async function rmExportEditorExcelDenfield() {
  if (typeof ExcelJS === 'undefined') return alert('Librería Excel aún cargando, reintentá en 1 seg.');
  const e = rmCalcProject();
  if (!e.activities.length) return alert('Agrega actividades antes de exportar.');

  const proj = {
    name: rmState.editName || 'Proyecto',
    address: rmState.editAddress || '',
    sqft: +rmState.editSqft || 0,
    start_date: rmState.editStartDate || new Date().toISOString().split('T')[0],
    activities: e.activities,
    totalDays: e.totalDays || 0,
    pricing: e.pricing || {}
  };

  // Estilos
  const COLOR = {
    headerBg:'FF1F2937', headerText:'FFFFFFFF', sectionBg:'FF374151',
    subBg:'FFE5E7EB', editable:'FFD1FAE5', calc:'FFF3F4F6',
    totalRow:'FFFEF3C7', border:'FF9CA3AF'
  };
  const thinBorder = { top:{style:'thin',color:{argb:COLOR.border}}, left:{style:'thin',color:{argb:COLOR.border}}, bottom:{style:'thin',color:{argb:COLOR.border}}, right:{style:'thin',color:{argb:COLOR.border}} };
  const fill = (argb) => ({ type:'pattern', pattern:'solid', fgColor:{argb} });
  const styleHeader = { font:{bold:true,color:{argb:COLOR.headerText},size:11}, fill:fill(COLOR.headerBg), alignment:{horizontal:'center',vertical:'middle'}, border:thinBorder };
  const styleSection = { font:{bold:true,color:{argb:COLOR.headerText},size:10}, fill:fill(COLOR.sectionBg), alignment:{horizontal:'left',vertical:'middle'} };
  const styleSub = { font:{bold:true,size:10}, fill:fill(COLOR.subBg), alignment:{horizontal:'left'}, border:thinBorder };
  const styleEditable = { fill:fill(COLOR.editable), border:thinBorder, alignment:{horizontal:'right'} };
  const styleCalc = { fill:fill(COLOR.calc), border:thinBorder, alignment:{horizontal:'right'} };
  const styleTotal = { font:{bold:true,size:11}, fill:fill(COLOR.totalRow), border:thinBorder, alignment:{horizontal:'right'} };
  const FMT_CURRENCY = '"$"#,##0;[Red]"-$"#,##0';
  const FMT_PCT = '0.0%;[Red]-0.0%';
  const FMT_DATE = 'yyyy-mm-dd';
  const FMT_INT = '#,##0';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Empresa OS — Editor Detallado';
  wb.created = new Date();

  // Totales por fase
  const phaseTotals = { '1':{mat:0,labor:0,eq:0,total:0,days:0}, '2':{mat:0,labor:0,eq:0,total:0,days:0}, '3':{mat:0,labor:0,eq:0,total:0,days:0}, '4':{mat:0,labor:0,eq:0,total:0,days:0}, '5':{mat:0,labor:0,eq:0,total:0,days:0}, '6':{mat:0,labor:0,eq:0,total:0,days:0} };
  proj.activities.forEach(a => {
    const p = a.phase;
    if (!phaseTotals[p]) return;
    phaseTotals[p].mat += +a.material||0;
    phaseTotals[p].labor += +a.labor||0;
    phaseTotals[p].eq += +a.equipment||0;
    phaseTotals[p].total += +a.total||0;
    phaseTotals[p].days = Math.max(phaseTotals[p].days, (+a.start_offset||0) + (+a.days||0));
  });
  const grandTotal = Object.values(phaseTotals).reduce((s,p) => ({ mat:s.mat+p.mat, labor:s.labor+p.labor, eq:s.eq+p.eq, total:s.total+p.total }), {mat:0,labor:0,eq:0,total:0});
  const totalDays = proj.totalDays;

  // ════════ HOJA 1: INFORMACION GENERAL ════════
  const ws1 = wb.addWorksheet('INFORMACION GENERAL', { views:[{state:'frozen',ySplit:13}] });
  ws1.columns = [{width:5},{width:25},{width:12},{width:8},{width:12},{width:14},{width:13},{width:13},{width:13},{width:12},{width:12},{width:12},{width:13},{width:11},{width:22}];
  ws1.mergeCells('A1:O1');
  ws1.getCell('A1').value = `CRONOGRAMA Y PRESUPUESTO — ${proj.name}`;
  ws1.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font,size:14} };
  ws1.getRow(1).height = 24;
  ws1.mergeCells('A2:O2');
  ws1.getCell('A2').value = 'Celdas VERDES = editables. Grises = calculadas. Hojas detalladas por fase abajo.';
  ws1.getCell('A2').style = { font:{italic:true,color:{argb:'FF6B7280'},size:9} };

  ws1.mergeCells('A4:O4');
  ws1.getCell('A4').value = 'INFORMACIÓN GENERAL';
  ws1.getCell('A4').style = styleSection;
  const infoRows = [
    ['Nombre', proj.name],
    ['Dirección', proj.address],
    ['Tipo', 'Fix & Flip'],
    ['Precio Cliente', proj.pricing.clientPrice || 0, FMT_CURRENCY],
    ['Superficie ft²', proj.sqft, FMT_INT],
    ['Fecha Inicio Obra', new Date(proj.start_date), FMT_DATE]
  ];
  infoRows.forEach((row, i) => {
    const r0 = 5 + i;
    ws1.getCell(`A${r0}`).value = row[0];
    ws1.getCell(`A${r0}`).style = { font:{bold:true}, alignment:{horizontal:'left'} };
    ws1.getCell(`C${r0}`).value = row[1];
    ws1.getCell(`C${r0}`).style = { ...styleEditable, numFmt:row[2]||undefined };
  });

  ws1.mergeCells('A12:O12');
  ws1.getCell('A12').value = 'TABLA DE ETAPAS';
  ws1.getCell('A12').style = styleSection;
  ['#','Etapa','Inicio','Días','Fin','Presup. Total','P. Material','P. M.Obra','P. Equipo','Real Mat.','Real M.O.','Real Eq.','Real Total','% Margen','Estado'].forEach((h,i) => {
    const c = ws1.getCell(13,i+1); c.value=h; c.style=styleHeader;
  });
  ws1.getRow(13).height = 28;

  let cursor = new Date(proj.start_date);
  const PHASE_NAMES = { '1':'Demolición','2':'Cimentación','3':'Externo','4':'Estructura','5':'Interno','6':'Limpieza' };
  ['1','2','3','4','5','6'].forEach((p, i) => {
    const pt = phaseTotals[p];
    const row = 14 + i;
    const dias = Math.round(pt.days || 0);
    const inicioEtapa = new Date(cursor);
    ws1.getCell(`A${row}`).value = i+1;
    ws1.getCell(`A${row}`).style = { ...styleCalc, alignment:{horizontal:'center'} };
    ws1.getCell(`B${row}`).value = PHASE_NAMES[p];
    ws1.getCell(`B${row}`).style = { font:{bold:true}, border:thinBorder, alignment:{horizontal:'left'} };
    ws1.getCell(`C${row}`).value = dias > 0 ? inicioEtapa : '';
    ws1.getCell(`C${row}`).style = { ...styleEditable, numFmt:FMT_DATE };
    ws1.getCell(`D${row}`).value = dias;
    ws1.getCell(`D${row}`).style = { ...styleEditable, numFmt:FMT_INT, alignment:{horizontal:'center'} };
    ws1.getCell(`E${row}`).value = { formula:`IF(OR(C${row}="",D${row}=0),"",C${row}+D${row}-1)` };
    ws1.getCell(`E${row}`).style = { ...styleCalc, numFmt:FMT_DATE };
    ws1.getCell(`F${row}`).value = Math.round(pt.total);
    ws1.getCell(`F${row}`).style = { ...styleEditable, numFmt:FMT_CURRENCY };
    ws1.getCell(`G${row}`).value = Math.round(pt.mat);
    ws1.getCell(`G${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY };
    ws1.getCell(`H${row}`).value = Math.round(pt.labor);
    ws1.getCell(`H${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY };
    ws1.getCell(`I${row}`).value = Math.round(pt.eq);
    ws1.getCell(`I${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY };
    ['J','K','L'].forEach(col => {
      ws1.getCell(`${col}${row}`).value = null;
      ws1.getCell(`${col}${row}`).style = { ...styleEditable, numFmt:FMT_CURRENCY };
    });
    ws1.getCell(`M${row}`).value = { formula:`SUM(J${row}:L${row})` };
    ws1.getCell(`M${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY, font:{bold:true} };
    ws1.getCell(`N${row}`).value = { formula:`IFERROR((F${row}-M${row})/F${row},0)` };
    ws1.getCell(`N${row}`).style = { ...styleCalc, numFmt:FMT_PCT };
    ws1.getCell(`O${row}`).value = { formula:`IF(M${row}=0,"○ Sin gasto",IF(N${row}>=0.1,"◐ Dentro",IF(N${row}>=0,"⚠ Apretado","● Sobre presup.")))` };
    ws1.getCell(`O${row}`).style = { ...styleCalc, alignment:{horizontal:'left'} };
    if (dias > 0) cursor.setDate(cursor.getDate() + dias);
  });
  const totalRow = 14 + 6;
  ws1.getCell(`B${totalRow}`).value = 'TOTALES';
  ws1.getCell(`B${totalRow}`).style = { ...styleTotal, alignment:{horizontal:'left'} };
  ws1.getCell(`D${totalRow}`).value = { formula:`SUM(D14:D${totalRow-1})` };
  ws1.getCell(`D${totalRow}`).style = { ...styleTotal, numFmt:FMT_INT, alignment:{horizontal:'center'} };
  ['F','G','H','I','J','K','L','M'].forEach(col => {
    ws1.getCell(`${col}${totalRow}`).value = { formula:`SUM(${col}14:${col}${totalRow-1})` };
    ws1.getCell(`${col}${totalRow}`).style = { ...styleTotal, numFmt:FMT_CURRENCY };
  });
  ws1.getCell(`N${totalRow}`).value = { formula:`IFERROR((F${totalRow}-M${totalRow})/F${totalRow},0)` };
  ws1.getCell(`N${totalRow}`).style = { ...styleTotal, numFmt:FMT_PCT };

  // ════════ HOJA 2: PRESUPUESTO GENERAL ════════
  const ws2 = wb.addWorksheet('PRESUPUESTO GENERAL', { views:[{state:'frozen',ySplit:4}] });
  ws2.columns = [{width:24},{width:14},{width:14},{width:14},{width:14},{width:14}];
  ws2.mergeCells('A1:F1');
  ws2.getCell('A1').value = `PRESUPUESTO — ${proj.name}`;
  ws2.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font,size:14} };
  ws2.getRow(1).height = 24;
  ['Etapa','Material','Mano obra','Equipo','TOTAL','% del total'].forEach((h,i) => {
    const c = ws2.getCell(4,i+1); c.value=h; c.style=styleHeader;
  });
  ws2.getRow(4).height = 24;
  ['1','2','3','4','5','6'].forEach((p, i) => {
    const pt = phaseTotals[p];
    const row = 5+i;
    ws2.getCell(`A${row}`).value = `${p}. ${PHASE_NAMES[p]}`;
    ws2.getCell(`A${row}`).style = { font:{bold:true}, border:thinBorder, alignment:{horizontal:'left'} };
    ws2.getCell(`B${row}`).value = Math.round(pt.mat);
    ws2.getCell(`B${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY };
    ws2.getCell(`C${row}`).value = Math.round(pt.labor);
    ws2.getCell(`C${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY };
    ws2.getCell(`D${row}`).value = Math.round(pt.eq);
    ws2.getCell(`D${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY };
    ws2.getCell(`E${row}`).value = { formula:`B${row}+C${row}+D${row}` };
    ws2.getCell(`E${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY, font:{bold:true} };
    ws2.getCell(`F${row}`).value = { formula:`IFERROR(E${row}/E12,0)` };
    ws2.getCell(`F${row}`).style = { ...styleCalc, numFmt:FMT_PCT };
  });
  ws2.getCell('A12').value = 'TOTAL';
  ws2.getCell('A12').style = { ...styleTotal, alignment:{horizontal:'left'} };
  ['B','C','D','E'].forEach(col => {
    ws2.getCell(`${col}12`).value = { formula:`SUM(${col}5:${col}10)` };
    ws2.getCell(`${col}12`).style = { ...styleTotal, numFmt:FMT_CURRENCY };
  });

  // ════════ HOJA 3: CRONOGRAMA ════════
  const ws3 = wb.addWorksheet('CRONOGRAMA', { views:[{state:'frozen',ySplit:4}] });
  ws3.columns = [{width:22},{width:14},{width:14},{width:10},{width:18}];
  ws3.mergeCells('A1:E1');
  ws3.getCell('A1').value = `CRONOGRAMA — ${proj.name}`;
  ws3.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font,size:14} };
  ws3.getRow(1).height = 24;
  ['Etapa','Inicio','Fin','Días','# Actividades'].forEach((h,i) => {
    const c = ws3.getCell(4,i+1); c.value=h; c.style=styleHeader;
  });
  let cur2 = new Date(proj.start_date);
  ['1','2','3','4','5','6'].forEach((p, i) => {
    const pt = phaseTotals[p];
    const row = 5+i;
    const dias = Math.round(pt.days || 0);
    const fin = new Date(cur2); if (dias > 0) fin.setDate(fin.getDate() + dias - 1);
    const inPhase = proj.activities.filter(a => a.phase === p);
    ws3.getCell(`A${row}`).value = `${p}. ${PHASE_NAMES[p]}`;
    ws3.getCell(`A${row}`).style = { font:{bold:true}, border:thinBorder };
    ws3.getCell(`B${row}`).value = dias > 0 ? new Date(cur2) : '';
    ws3.getCell(`B${row}`).style = { ...styleCalc, numFmt:FMT_DATE };
    ws3.getCell(`C${row}`).value = dias > 0 ? fin : '';
    ws3.getCell(`C${row}`).style = { ...styleCalc, numFmt:FMT_DATE };
    ws3.getCell(`D${row}`).value = dias;
    ws3.getCell(`D${row}`).style = { ...styleCalc, alignment:{horizontal:'center'} };
    ws3.getCell(`E${row}`).value = inPhase.length;
    ws3.getCell(`E${row}`).style = { ...styleCalc, alignment:{horizontal:'center'} };
    if (dias > 0) cur2.setDate(cur2.getDate() + dias);
  });
  ws3.getCell('A12').value = 'TOTAL DÍAS';
  ws3.getCell('A12').style = { ...styleTotal };
  ws3.getCell('D12').value = { formula:'SUM(D5:D10)' };
  ws3.getCell('D12').style = { ...styleTotal, alignment:{horizontal:'center'} };

  // ════════ HOJA 4: GANTT ════════
  const ws4 = wb.addWorksheet('GANTT', { views:[{state:'frozen',xSplit:4,ySplit:4}] });
  const totalWeeks = Math.ceil(totalDays / 7) || 1;
  ws4.columns = [{width:22},{width:11},{width:11},{width:7}, ...Array.from({length:totalWeeks}, () => ({width:6}))];
  ws4.mergeCells('A1:D1');
  ws4.getCell('A1').value = `GANTT — ${proj.name}`;
  ws4.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font,size:14} };
  ws4.getRow(1).height = 24;
  ['Etapa','Inicio','Fin','Días', ...Array.from({length:totalWeeks}, (_,i) => `S${i+1}`)].forEach((h,i) => {
    const c = ws4.getCell(4,i+1); c.value=h; c.style=styleHeader;
  });
  let cur3 = new Date(proj.start_date);
  ['1','2','3','4','5','6'].forEach((p, i) => {
    const pt = phaseTotals[p];
    const row = 5+i;
    const dias = Math.round(pt.days || 0);
    const fin = new Date(cur3); if (dias>0) fin.setDate(fin.getDate() + dias - 1);
    ws4.getCell(`A${row}`).value = `${p}. ${PHASE_NAMES[p]}`;
    ws4.getCell(`A${row}`).style = { font:{bold:true}, border:thinBorder };
    ws4.getCell(`B${row}`).value = dias>0 ? new Date(cur3) : '';
    ws4.getCell(`B${row}`).style = { ...styleCalc, numFmt:FMT_DATE };
    ws4.getCell(`C${row}`).value = dias>0 ? fin : '';
    ws4.getCell(`C${row}`).style = { ...styleCalc, numFmt:FMT_DATE };
    ws4.getCell(`D${row}`).value = dias;
    ws4.getCell(`D${row}`).style = { ...styleCalc, alignment:{horizontal:'center'} };
    // Barras
    if (dias > 0) {
      const startDay = Math.floor((cur3 - new Date(proj.start_date)) / 86400000);
      const weekStart = Math.floor(startDay / 7);
      const weekEnd = Math.floor((startDay + dias - 1) / 7);
      for (let w = weekStart; w <= weekEnd; w++) {
        const cell = ws4.getCell(row, 5 + w);
        cell.value = '█';
        cell.style = { fill:fill('FF60A5FA'), font:{color:{argb:'FFFFFFFF'},bold:true}, alignment:{horizontal:'center'} };
      }
      cur3.setDate(cur3.getDate() + dias);
    }
  });

  // ════════ HOJAS 5-10: DETALLE POR FASE (1-6) ════════
  const ETAPA_NAMES = { '1':'1. DEMOLICION','2':'2. CIMENTACION','3':'3. EXTERNO','4':'4. ESTRUCTURA','5':'5. INTERNO','6':'6. LIMPIEZA' };
  ['1','2','3','4','5','6'].forEach(p => {
    const sheetName = ETAPA_NAMES[p];
    const acts = proj.activities.filter(a => a.phase === p);
    const ws = wb.addWorksheet(sheetName, { views:[{state:'frozen',ySplit:3}] });
    ws.columns = [{width:4},{width:22},{width:10},{width:50},{width:11},{width:10},{width:13},{width:13},{width:13},{width:10},{width:14},{width:14},{width:14},{width:14},{width:11}];
    ws.mergeCells('A1:O1');
    ws.getCell('A1').value = sheetName;
    ws.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font,size:14} };
    ws.getRow(1).height = 24;
    const pt = phaseTotals[p];
    ws.mergeCells('A2:O2');
    ws.getCell('A2').value = `Presupuesto fase: $${Math.round(pt.total).toLocaleString()} · Material $${Math.round(pt.mat).toLocaleString()} · MO $${Math.round(pt.labor).toLocaleString()} · Equipo $${Math.round(pt.eq).toLocaleString()} · ${acts.length} actividades`;
    ws.getCell('A2').style = { font:{italic:true,color:{argb:'FF6B7280'},size:9} };
    ws.getRow(2).height = 18;
    ['#','Subcategoría','Código','Descripción','Unidad','Cantidad','VU Total ($)','VU Mat ($)','VU MO ($)','% Mat','Total Mat','Total MO','Total ($)','Real ($)','% Margen'].forEach((h,i) => {
      const c = ws.getCell(3,i+1); c.value=h; c.style=styleHeader;
    });
    ws.getRow(3).height = 28;

    // Agrupar por subcat
    let row = 4;
    let lastSub = null;
    let n = 0;
    const sorted = [...acts].sort((a,b) => (a.code||'').localeCompare(b.code||''));
    sorted.forEach(a => {
      if (a.subcat !== lastSub) {
        ws.mergeCells(`A${row}:O${row}`);
        ws.getCell(`A${row}`).value = `▸ ${a.subcat || '(sin subcategoría)'}`;
        ws.getCell(`A${row}`).style = styleSub;
        row++;
        lastSub = a.subcat;
      }
      n++;
      const qty = +a.qty || 0;
      const vuMat = qty > 0 ? (+a.material||0)/qty : 0;
      const vuMo = qty > 0 ? (+a.labor||0)/qty : 0;
      ws.getCell(`A${row}`).value = n; ws.getCell(`A${row}`).style = { ...styleCalc, alignment:{horizontal:'center'} };
      ws.getCell(`B${row}`).value = a.subcat || ''; ws.getCell(`B${row}`).style = { border:thinBorder, font:{size:9,color:{argb:'FF6B7280'}} };
      ws.getCell(`C${row}`).value = a.code; ws.getCell(`C${row}`).style = { ...styleCalc, font:{bold:true}, alignment:{horizontal:'center'} };
      ws.getCell(`D${row}`).value = a.desc || ''; ws.getCell(`D${row}`).style = { border:thinBorder, alignment:{horizontal:'left',wrapText:true} };
      ws.getCell(`E${row}`).value = a.unit || ''; ws.getCell(`E${row}`).style = { ...styleCalc, alignment:{horizontal:'center'} };
      ws.getCell(`F${row}`).value = qty; ws.getCell(`F${row}`).style = { ...styleEditable, numFmt:FMT_INT };
      ws.getCell(`G${row}`).value = +a.vu || 0; ws.getCell(`G${row}`).style = { ...styleEditable, numFmt:FMT_CURRENCY };
      ws.getCell(`H${row}`).value = Math.round(vuMat*100)/100; ws.getCell(`H${row}`).style = { ...styleEditable, numFmt:FMT_CURRENCY };
      ws.getCell(`I${row}`).value = Math.round(vuMo*100)/100; ws.getCell(`I${row}`).style = { ...styleEditable, numFmt:FMT_CURRENCY };
      ws.getCell(`J${row}`).value = { formula:`IFERROR(H${row}/G${row},0)` }; ws.getCell(`J${row}`).style = { ...styleCalc, numFmt:FMT_PCT };
      ws.getCell(`K${row}`).value = { formula:`IFERROR(F${row}*H${row},0)` }; ws.getCell(`K${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY };
      ws.getCell(`L${row}`).value = { formula:`IFERROR(F${row}*I${row},0)` }; ws.getCell(`L${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY };
      ws.getCell(`M${row}`).value = { formula:`K${row}+L${row}` }; ws.getCell(`M${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY, font:{bold:true} };
      ws.getCell(`N${row}`).value = null; ws.getCell(`N${row}`).style = { ...styleEditable, numFmt:FMT_CURRENCY };
      ws.getCell(`O${row}`).value = { formula:`IFERROR((M${row}-N${row})/M${row},0)` }; ws.getCell(`O${row}`).style = { ...styleCalc, numFmt:FMT_PCT };
      row++;
    });
    // Fila TOTAL si hubo actividades
    if (n > 0) {
      ws.getCell(`D${row}`).value = 'TOTAL FASE';
      ws.getCell(`D${row}`).style = { ...styleTotal, alignment:{horizontal:'right'} };
      ['K','L','M','N'].forEach(col => {
        ws.getCell(`${col}${row}`).value = { formula:`SUM(${col}4:${col}${row-1})` };
        ws.getCell(`${col}${row}`).style = { ...styleTotal, numFmt:FMT_CURRENCY };
      });
      ws.getCell(`O${row}`).value = { formula:`IFERROR((M${row}-N${row})/M${row},0)` };
      ws.getCell(`O${row}`).style = { ...styleTotal, numFmt:FMT_PCT };
    } else {
      ws.mergeCells(`A4:O4`);
      ws.getCell('A4').value = '(Sin actividades en esta fase. Agregalas en el Editor detallado de la app.)';
      ws.getCell('A4').style = { font:{italic:true,color:{argb:'FF6B7280'},size:10}, alignment:{horizontal:'center'} };
    }
  });

  // ════════ HOJA 11: MATERIALES ════════
  const wsMat = wb.addWorksheet('MATERIALES', { views:[{state:'frozen',ySplit:2}] });
  wsMat.columns = [{width:8},{width:50},{width:14},{width:18},{width:10},{width:14},{width:14},{width:14},{width:14}];
  wsMat.mergeCells('A1:I1');
  wsMat.getCell('A1').value = `MATERIALES — ${proj.name}`;
  wsMat.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font,size:14} };
  wsMat.getRow(1).height = 24;
  ['ITEM','Descripción','Fase','Sub etapa','Cantidad','Unidad / SQFT c/u','Precio unit (USD)','Subtotal (USD)','Vendor'].forEach((h,i) => {
    const c = wsMat.getCell(2,i+1); c.value=h; c.style=styleHeader;
  });
  wsMat.getRow(2).height = 28;
  for (let i = 0; i < 200; i++) {
    const row = 3+i;
    ['A','B','C','D','E','F','G','I'].forEach(col => {
      wsMat.getCell(`${col}${row}`).style = { ...styleEditable, alignment:{horizontal: col==='B'?'left':col==='G'?'right':'center'} };
    });
    wsMat.getCell(`G${row}`).style = { ...styleEditable, numFmt:FMT_CURRENCY };
    wsMat.getCell(`H${row}`).value = { formula:`IFERROR(E${row}*G${row},0)` };
    wsMat.getCell(`H${row}`).style = { ...styleCalc, numFmt:FMT_CURRENCY, font:{bold:true} };
  }
  wsMat.getCell('G203').value = 'TOTAL';
  wsMat.getCell('G203').style = { ...styleTotal, alignment:{horizontal:'right'} };
  wsMat.getCell('H203').value = { formula:'SUM(H3:H202)' };
  wsMat.getCell('H203').style = { ...styleTotal, numFmt:FMT_CURRENCY };

  // ════════ HOJA 12: ACTIVIDADES DIARIAS ════════
  const wsAct = wb.addWorksheet('ACTIVIDADES DIARIAS', { views:[{state:'frozen',ySplit:2}] });
  wsAct.columns = [{width:4},{width:18},{width:16},{width:12},{width:50},{width:14},{width:14},{width:14},{width:50}];
  wsAct.mergeCells('A1:I1');
  wsAct.getCell('A1').value = `BITÁCORA DIARIA — ${proj.name}`;
  wsAct.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font,size:14} };
  wsAct.getRow(1).height = 24;
  ['','ITEM','SUBITEM','FECHA','MATERIALES','COSTO DE MATERIAL','HORAS TRABAJADAS','OTROS COSTOS','OBSERVACIONES'].forEach((h,i) => {
    const c = wsAct.getCell(2,i+1); c.value=h; c.style=styleHeader;
  });
  wsAct.getRow(2).height = 28;
  for (let i = 0; i < 300; i++) {
    const row = 3+i;
    ['B','C','D','E','F','G','H','I'].forEach(col => {
      wsAct.getCell(`${col}${row}`).style = { ...styleEditable, alignment:{horizontal:(col==='E'||col==='I')?'left':(col==='F'||col==='G'||col==='H')?'right':'center'} };
    });
    wsAct.getCell(`D${row}`).style = { ...styleEditable, numFmt:FMT_DATE };
    wsAct.getCell(`F${row}`).style = { ...styleEditable, numFmt:FMT_CURRENCY };
    wsAct.getCell(`G${row}`).style = { ...styleEditable, numFmt:FMT_INT };
    wsAct.getCell(`H${row}`).style = { ...styleEditable, numFmt:FMT_CURRENCY };
  }
  wsAct.getCell('E304').value = 'TOTALES';
  wsAct.getCell('E304').style = { ...styleTotal, alignment:{horizontal:'right'} };
  ['F','G','H'].forEach(col => {
    wsAct.getCell(`${col}304`).value = { formula:`SUM(${col}3:${col}303)` };
    wsAct.getCell(`${col}304`).style = { ...styleTotal, numFmt: col==='G'?FMT_INT:FMT_CURRENCY };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  const safe = (proj.name||'proyecto').replace(/[^a-z0-9]/gi,'_');
  const today = new Date().toISOString().split('T')[0].replace(/-/g,'');
  a.href = URL.createObjectURL(blob);
  a.download = `${today}_Seguimiento_${safe}.xlsx`;
  a.click();
}

// ============================================================
// ITEMS CUSTOM POR ETAPA — agregar items que no están en el catálogo
// ============================================================

// Render de items custom de una etapa específica (dentro del editor)
function rmRenderCustomItemsForPhase(phaseId) {
  const items = Object.entries(rmState.customActivities || {}).filter(([_, it]) => it.phase === phaseId);
  if (!items.length) return '';
  return `
    <div class="mt-2 pt-2 border-t border-emerald-200">
      <div class="text-[10px] font-bold uppercase text-emerald-700 mb-1.5">✨ Items personalizados (${items.length})</div>
      ${items.map(([code, it]) => {
        const total = (+it.qty || 0) * (+it.vu || 0);
        return `
          <div class="grid grid-cols-[20px_1fr_80px_90px_90px_30px_20px] gap-2 items-center text-xs py-1 bg-emerald-50 rounded mb-1">
            <div class="text-center text-emerald-700">✓</div>
            <div>
              <div class="font-mono text-[10px] text-emerald-600">${code}</div>
              <div class="font-semibold">${it.desc}</div>
              <div class="text-[10px] text-emerald-700">${it.subcat || '—'} · ${it.unit}</div>
            </div>
            <input type="number" step="0.01" value="${it.qty || ''}" onchange="rmCustomSet('${code}','qty',this.value)" placeholder="Cant." class="border border-emerald-300 rounded px-2 py-1 text-xs bg-white" />
            <input type="number" step="0.01" value="${it.vu || ''}" onchange="rmCustomSet('${code}','vu',this.value)" placeholder="$/u" class="border border-emerald-300 rounded px-2 py-1 text-xs bg-white" />
            <div class="text-right font-bold ${total?'text-emerald-900':'text-slate-300'}">${rmFmt(total)}</div>
            <input type="number" value="${it.days || ''}" onchange="rmCustomSet('${code}','days',this.value)" placeholder="d" class="border border-emerald-300 rounded px-1 py-1 text-[10px] text-center bg-white" />
            <button onclick="rmCustomDelete('${code}')" title="Eliminar" class="text-red-500 hover:text-red-700 text-sm">×</button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Mostrar modal para agregar item custom a una etapa
function rmShowAddCustom(phaseId) {
  const phase = RM_PHASES[phaseId];
  const existing = document.getElementById('rm-custom-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'rm-custom-modal';
  modal.className = 'fixed inset-0 z-[120] bg-slate-900/80 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
      <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <div class="text-[10px] font-bold uppercase opacity-90">Agregar item personalizado</div>
          <div class="text-base font-bold">${phase?.icon} ${phaseId}. ${phase?.name}</div>
        </div>
        <button onclick="document.getElementById('rm-custom-modal').remove()" class="text-2xl leading-none">×</button>
      </div>
      <div class="p-4 space-y-3 text-sm">
        <div>
          <label class="block text-[11px] font-bold text-slate-700 mb-0.5">Descripción del item *</label>
          <input id="rm-cust-desc" type="text" placeholder="Ej: Instalación de mesón de cuarzo premium" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-700 mb-0.5">Subcategoría</label>
          <input id="rm-cust-subcat" type="text" placeholder="Ej: Cocina · Baños · Estructura · Fachada..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-0.5">Unidad de medida *</label>
            <select id="rm-cust-unit" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              ${RM_UNIDADES.map(u => `<option value="${u.val}">${u.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-0.5">Cantidad *</label>
            <input id="rm-cust-qty" type="number" step="0.01" placeholder="0" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-0.5">Valor por unidad ($) *</label>
            <input id="rm-cust-vu" type="number" step="0.01" placeholder="0.00" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-0.5">% Material (resto = MO)</label>
            <input id="rm-cust-mat" type="number" step="1" min="0" max="100" value="50" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-700 mb-0.5">Días (duración)</label>
          <input id="rm-cust-days" type="number" step="0.5" placeholder="0" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
        <div class="pt-2 flex gap-2 border-t border-slate-200">
          <button onclick="rmCustomAdd('${phaseId}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded">💾 Agregar al estimado</button>
          <button onclick="document.getElementById('rm-custom-modal').remove()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('rm-cust-desc')?.focus(), 50);
}

// Agregar item custom al estado
function rmCustomAdd(phaseId) {
  const desc = document.getElementById('rm-cust-desc')?.value?.trim();
  if (!desc) return alert('Descripción es obligatoria');
  const subcat = document.getElementById('rm-cust-subcat')?.value?.trim() || 'Custom';
  const unit = document.getElementById('rm-cust-unit')?.value || 'unidad';
  const qty = parseFloat(document.getElementById('rm-cust-qty')?.value) || 0;
  const vu = parseFloat(document.getElementById('rm-cust-vu')?.value) || 0;
  const matPct = (parseFloat(document.getElementById('rm-cust-mat')?.value) || 50) / 100;
  const days = parseFloat(document.getElementById('rm-cust-days')?.value) || 0;
  if (!qty || !vu) return alert('Cantidad y Valor por unidad son obligatorios');

  // Generar código único: C.{phase}.{n}
  const existing = Object.keys(rmState.customActivities || {}).filter(k => k.startsWith(`C.${phaseId}.`));
  const nextN = existing.length + 1;
  const code = `C.${phaseId}.${nextN}`;

  rmState.customActivities = rmState.customActivities || {};
  rmState.customActivities[code] = {
    code, phase: phaseId, subcat, desc, unit, qty, vu, days, mat_pct: matPct,
    is_custom: true,
    created_at: new Date().toISOString()
  };
  // También al estado de selectedActivities para que entre en cálculos
  rmState.selectedActivities[code] = { qty, vu, days };

  document.getElementById('rm-custom-modal')?.remove();
  if (typeof rmRenderTab === 'function') rmRenderTab();
  else if (typeof rmRender === 'function') rmRender();
}

function rmCustomSet(code, field, value) {
  const it = rmState.customActivities?.[code];
  if (!it) return;
  const v = field === 'qty' || field === 'vu' || field === 'days' ? (parseFloat(value) || 0) : value;
  it[field] = v;
  // Sync selectedActivities también
  if (rmState.selectedActivities[code]) {
    rmState.selectedActivities[code] = { qty: it.qty, vu: it.vu, days: it.days };
  }
  if (typeof rmRenderTabDebounced === 'function') rmRenderTabDebounced();
  else if (typeof rmRender === 'function') rmRender();
}

function rmCustomDelete(code) {
  if (!confirm('¿Eliminar este item personalizado?')) return;
  delete rmState.customActivities?.[code];
  delete rmState.selectedActivities[code];
  if (typeof rmRenderTab === 'function') rmRenderTab();
  else if (typeof rmRender === 'function') rmRender();
}

// Helper para que el catálogo (rmGetCatalog) incluya custom activities en cálculos
function rmGetAllActivitiesIncludingCustom() {
  const base = (typeof rmGetCatalog === 'function') ? rmGetCatalog() : [];
  const customs = Object.values(rmState.customActivities || {});
  return [...base, ...customs];
}

// Bloque 2.2 — al guardar la estimación, auto-genera el cronograma en el Planner (baseline) la 1ª vez.
// RM-C1: factores de días por etapa desde el REAL del Planner (v_remodel_calib_etapas). Guard: solo aplicables (n≥umbral).
async function rmLoadStageFactors() {
  if (rmState._stageFactors) return rmState._stageFactors;
  try {
    const { data } = await sb.from('v_remodel_calib_etapas').select('etapa, factor_dias, aplicable, n_tareas');
    const map = {}; (data || []).forEach(r => { if (r.aplicable && +r.factor_dias > 0) map[r.etapa] = +r.factor_dias; });
    rmState._stageFactors = map;
  } catch (e) { rmState._stageFactors = {}; }
  return rmState._stageFactors;
}
function rmCalibFactor(map, stageName) {
  const k = String(stageName || '').toLowerCase().trim().replace(/[.\s]+$/, '').replace(/_/g, ' ');
  return map[k] || map[k.replace(/s$/, '')] || 1;
}
window.rmLoadStageFactors = rmLoadStageFactors; window.rmCalibFactor = rmCalibFactor;
async function rmAutoGenPlanner(projectId, projectName) {
  if (!projectId || !rmState.selectedActivities || !Object.keys(rmState.selectedActivities).length) return;
  const { count } = await sb.from('weekly_activities').select('id', { count: 'exact', head: true }).eq('project_id', projectId);
  if (count && count > 0) return; // ya tiene cronograma → no pisar ediciones del Planner
  const e = rmCalcProject();
  const stageFactors = await rmLoadStageFactors(); // loop de aprendizaje: días reales recalibran el plan
  const startDate = new Date(rmState.editStartDate);
  const inserts = [];
  Object.entries(rmState.selectedActivities).forEach(([code, cfg]) => {
    const cat = rmGetCatalog().find(c => c.code === code); if (!cat) return;
    const phaseSch = e.phaseSchedule[cat.phase];
    let activityStart = phaseSch ? new Date(phaseSch.start) : startDate;
    if (cfg.start_offset) activityStart = rmAddDays(activityStart, cfg.start_offset);
    const phaseNameCal = (RM_PHASES[cat.phase] || { name: cat.cat }).name;
    const fCal = rmCalibFactor(stageFactors, phaseNameCal);
    const days = Math.max(1, Math.round((cfg.days || Math.max(1, Math.ceil((cat.days_per_qty || 0) * (cfg.qty || 1)))) * fCal));
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = rmAddWorkDays(activityStart, i);
      const phaseInfo = RM_PHASES[cat.phase] || { name: cat.cat, color: '#64748b' };
      inserts.push({ project_id: projectId, property_name: projectName, date: date.toISOString().split('T')[0], activity_name: cat.desc + (days > 1 ? ` (día ${i + 1}/${days})` : ''), stage: phaseInfo.name.toLowerCase().replace(/\s/g, '_'), activity_code: code, notes: `[Estimador] ${code}`, start_hour: 7, end_hour: 17, status: 'planned', priority: i === 0 ? 'normal' : 'low', is_critical: !!(e.cpm && e.cpm.criticalPath && e.cpm.criticalPath.includes(code)), created_by: state.user.id });
    }
  });
  if (!inserts.length) return;
  for (let i = 0; i < inserts.length; i += 50) { const { error } = await sb.from('weekly_activities').insert(inserts.slice(i, i + 50)); if (error) { console.warn('autogen', error); break; } }
  if (window.toast) toast(`Cronograma generado en el Planner (${inserts.length} actividades-día, con baseline).`, 'success');
}
window.rmAutoGenPlanner = rmAutoGenPlanner;

// ════════════════════════════════════════════════════════════
// 🏗 BLOQUE 4 — Obra Pro: hitos, inspecciones/hold points, punch list, calendario laboral
// ════════════════════════════════════════════════════════════
async function rmLoadObraPro(projectId) {
  if (!projectId) { rmState.obraPro = { milestones: [], inspections: [], punch: [] }; return; }
  const [m, i, pu] = await Promise.all([
    sb.from('remodel_milestones').select('*').eq('project_id', projectId).is('archived_at', null).order('plan_date', { nullsFirst: false }).then(r => r.data || []).catch(() => []),
    sb.from('remodel_inspections').select('*').eq('project_id', projectId).is('archived_at', null).order('plan_date', { nullsFirst: false }).then(r => r.data || []).catch(() => []),
    sb.from('remodel_punch_list').select('*').eq('project_id', projectId).is('archived_at', null).order('created_at').then(r => r.data || []).catch(() => [])
  ]);
  rmState.obraPro = { milestones: m, inspections: i, punch: pu };
}
function rmRenderObraPro(body) {
  if (!rmState.currentProject) { body.innerHTML = '<div class="text-center py-12 text-slate-500">Cargá un proyecto desde <b>📁 Proyectos</b> para su capa de obra (hitos, inspecciones, punch list).</div>'; return; }
  if (!rmState.obraPro) { rmLoadObraPro(rmState.currentProject.id).then(() => rmRenderTab()); body.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">Cargando obra…</div>'; return; }
  const esc = s => String(s == null ? '' : s).replace(/[<>"]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const { milestones, inspections, punch } = rmState.obraPro;
  const dlt = (dp, dr) => dp && dr ? Math.round((new Date(dr) - new Date(dp)) / 86400000) : null;
  const holdOpen = inspections.filter(i => i.hold_point && i.status !== 'aprobada').length;
  body.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h2 class="text-lg font-bold">🏗 Obra Pro — ${esc(rmState.editName || rmState.currentProject.name)}</h2>
        ${holdOpen ? `<span class="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-2 py-1 font-bold">⛔ ${holdOpen} hold point(s) sin aprobar — bloquean avance</span>` : '<span class="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-1 font-bold">✓ Sin hold points abiertos</span>'}
      </div>

      <div class="border border-slate-200 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2"><b class="text-sm">🎯 Hitos (plan vs real)</b><button onclick="rmAddMilestone()" class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-1 font-bold">+ Hito</button></div>
        ${milestones.length ? `<table class="w-full text-xs"><thead><tr><th class="text-left p-1 text-slate-500">Hito</th><th class="text-left p-1 text-slate-500">Plan</th><th class="text-left p-1 text-slate-500">Real</th><th class="text-right p-1 text-slate-500">Desvío</th><th class="text-right p-1 text-slate-500">Draw</th><th class="p-1"></th></tr></thead><tbody>
          ${milestones.map(m => { const d = dlt(m.plan_date, m.real_date); return `<tr class="border-t border-slate-100"><td class="p-1 font-semibold">${esc(m.nombre || m.tipo)}</td><td class="p-1">${m.plan_date || '—'}</td><td class="p-1">${m.real_date || '<span class="text-slate-400">pendiente</span>'}</td><td class="p-1 text-right ${d > 0 ? 'text-red-600' : d < 0 ? 'text-emerald-600' : ''}">${d != null ? (d > 0 ? '+' : '') + d + 'd' : '—'}</td><td class="p-1 text-right">${m.draw_amount ? '$' + Math.round(m.draw_amount).toLocaleString() : '—'}</td><td class="p-1 text-right"><button onclick="rmMilestoneReal('${m.id}')" class="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 rounded font-bold" title="Marcar fecha real (hoy)">✓ real</button> <button onclick="rmArchiveObra('remodel_milestones','${m.id}')" class="text-[10px] text-red-500">🗑</button></td></tr>`; }).join('')}
        </tbody></table>` : '<div class="text-xs text-slate-400">Sin hitos. Agregá permisos, inspecciones, pre-entrega, entrega.</div>'}
        <div class="text-[10px] text-slate-400 mt-1">Draw schedule: cada hito puede tener su monto de draw (ligado a hitos).</div>
      </div>

      <div class="border border-slate-200 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2"><b class="text-sm">🔎 Inspecciones / Hold points</b><button onclick="rmAddInspection()" class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-1 font-bold">+ Inspección</button></div>
        ${inspections.length ? `<table class="w-full text-xs"><thead><tr><th class="text-left p-1 text-slate-500">Etapa</th><th class="text-left p-1 text-slate-500">Tipo</th><th class="text-left p-1 text-slate-500">Hold</th><th class="text-left p-1 text-slate-500">Estado</th><th class="p-1"></th></tr></thead><tbody>
          ${inspections.map(i => `<tr class="border-t border-slate-100"><td class="p-1">${esc(i.stage || '—')}</td><td class="p-1 font-semibold">${esc(i.tipo || '—')}</td><td class="p-1">${i.hold_point ? '⛔ sí' : 'no'}</td><td class="p-1"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${i.status === 'aprobada' ? 'bg-emerald-100 text-emerald-700' : i.status === 'rechazada' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">${i.status || 'pendiente'}</span></td><td class="p-1 text-right"><button onclick="rmInspStatus('${i.id}','aprobada')" class="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 rounded font-bold">✓</button> <button onclick="rmInspStatus('${i.id}','rechazada')" class="text-[10px] bg-red-50 text-red-700 px-1.5 rounded font-bold">✗</button> <button onclick="rmArchiveObra('remodel_inspections','${i.id}')" class="text-[10px] text-red-500">🗑</button></td></tr>`).join('')}
        </tbody></table>` : '<div class="text-xs text-slate-400">Sin inspecciones. Un hold point pendiente bloquea el avance de su etapa.</div>'}
      </div>

      <div class="border border-slate-200 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2"><b class="text-sm">📋 Punch list ${punch.filter(x => x.status === 'abierto').length ? `<span class="text-red-600">(${punch.filter(x => x.status === 'abierto').length} abiertos)</span>` : ''}</b><button onclick="rmAddPunch()" class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-1 font-bold">+ Ítem</button></div>
        ${punch.length ? punch.map(p => `<div class="flex items-center justify-between text-xs py-1 border-t border-slate-100"><div><span class="font-semibold ${p.status === 'resuelto' ? 'line-through text-slate-400' : ''}">${esc(p.item)}</span> <span class="text-slate-400">· ${esc(p.stage || 's/etapa')}${p.severity === 'alta' ? ' · 🔴 alta' : ''}</span></div><div><button onclick="rmPunchToggle('${p.id}','${p.status === 'abierto' ? 'resuelto' : 'abierto'}')" class="text-[10px] ${p.status === 'abierto' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'} px-1.5 rounded font-bold">${p.status === 'abierto' ? '✓ resolver' : 'reabrir'}</button> <button onclick="rmArchiveObra('remodel_punch_list','${p.id}')" class="text-[10px] text-red-500">🗑</button></div></div>`).join('') : '<div class="text-xs text-slate-400">Sin ítems de punch list.</div>'}
      </div>

      <div class="border border-slate-200 rounded-lg p-3">
        <div class="flex items-center justify-between mb-1"><b class="text-sm">📆 Calendario laboral</b><button onclick="rmAddHoliday()" class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-1 font-bold">+ Día no laborable</button></div>
        <div class="text-[11px] text-slate-500">Los fines de semana + feriados cargados se excluyen de los días-plan del cronograma (días laborables reales).</div>
      </div>
    </div>`;
}
async function rmAddMilestone() {
  const nombre = prompt('Hito (ej. Permiso de construcción, Inspección final, Entrega):'); if (!nombre) return;
  const plan = prompt('Fecha planeada (YYYY-MM-DD, opcional):') || null;
  const draw = prompt('Monto de draw asociado (opcional):'); 
  await sb.from('remodel_milestones').insert({ project_id: rmState.currentProject.id, tipo: 'hito', nombre, plan_date: plan, draw_amount: draw ? +draw : null, created_by: state.user.id });
  await rmLoadObraPro(rmState.currentProject.id); rmRenderTab();
}
async function rmMilestoneReal(id) { await sb.from('remodel_milestones').update({ real_date: new Date().toISOString().slice(0, 10), status: 'cumplido' }).eq('id', id); await rmLoadObraPro(rmState.currentProject.id); rmRenderTab(); }
async function rmAddInspection() {
  const tipo = prompt('Tipo de inspección (ej. Foundation, Rough-in, Final):'); if (!tipo) return;
  const stage = prompt('Etapa (opcional):') || null;
  const hold = confirm('¿Es hold point? (bloquea el avance hasta aprobar) — Aceptar = sí');
  await sb.from('remodel_inspections').insert({ project_id: rmState.currentProject.id, tipo, stage, hold_point: hold, status: 'pendiente', created_by: state.user.id });
  await rmLoadObraPro(rmState.currentProject.id); rmRenderTab();
}
async function rmInspStatus(id, status) { await sb.from('remodel_inspections').update({ status, real_date: new Date().toISOString().slice(0, 10) }).eq('id', id); await rmLoadObraPro(rmState.currentProject.id); rmRenderTab(); }
async function rmAddPunch() {
  const item = prompt('Ítem de punch list (ej. Retocar pintura baño):'); if (!item) return;
  const stage = prompt('Etapa (opcional):') || null;
  const sev = confirm('¿Severidad alta? Aceptar = alta') ? 'alta' : 'normal';
  await sb.from('remodel_punch_list').insert({ project_id: rmState.currentProject.id, item, stage, severity: sev, status: 'abierto', created_by: state.user.id });
  await rmLoadObraPro(rmState.currentProject.id); rmRenderTab();
}
async function rmPunchToggle(id, status) { await sb.from('remodel_punch_list').update({ status }).eq('id', id); await rmLoadObraPro(rmState.currentProject.id); rmRenderTab(); }
async function rmAddHoliday() {
  const fecha = prompt('Día no laborable (YYYY-MM-DD):'); if (!fecha) return;
  const motivo = prompt('Motivo (feriado/lluvia/otro):') || 'feriado';
  const { error } = await sb.from('remodel_calendar').upsert({ fecha, tipo: motivo, motivo }, { onConflict: 'fecha' });
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('Día no laborable agregado', 'success'); else alert('Agregado');
}
async function rmArchiveObra(table, id) { if (!confirm('¿Archivar? (reversible)')) return; await sb.from(table).update({ archived_at: new Date().toISOString() }).eq('id', id); await rmLoadObraPro(rmState.currentProject.id); rmRenderTab(); }
window.rmAddMilestone = rmAddMilestone; window.rmMilestoneReal = rmMilestoneReal; window.rmAddInspection = rmAddInspection; window.rmInspStatus = rmInspStatus; window.rmAddPunch = rmAddPunch; window.rmPunchToggle = rmPunchToggle; window.rmAddHoliday = rmAddHoliday; window.rmArchiveObra = rmArchiveObra;
