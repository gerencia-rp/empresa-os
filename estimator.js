// ============================================================
// ESTIMADOR DE REMODELACIÓN — Rental Profitss
// Vanilla JS · Supabase backend · integrado a Empresa OS
// ============================================================

// ─── CALIBRADORES (5 casas reales) ───
const EST_CALIBRADORES = {
  VIRGINIA:  { code:'VIRGINIA',  sqft:1935, hours:1643,   internalTotal:41203.01 },
  PICNIC:    { code:'PICNIC',    sqft:1243, hours:2331.9, internalTotal:78202.36 },
  IDLEWOOD:  { code:'IDLEWOOD',  sqft:1135, hours:1959.4, internalTotal:72490.10 },
  ARCADIA:   { code:'ARCADIA',   sqft:1509, hours:2426.3, internalTotal:82066.26 },
  RAMBLE:    { code:'RAMBLE',    sqft:1519, hours:2557.1, internalTotal:105193.39 }
};

// Pool: tarifa y h/sqft derivados
const EST_POOL = (() => {
  const totals = Object.values(EST_CALIBRADORES).reduce((a, c) => ({
    sqft: a.sqft + c.sqft, hours: a.hours + c.hours, cost: a.cost + c.internalTotal
  }), { sqft: 0, hours: 0, cost: 0 });
  return {
    sqft: totals.sqft, hours: totals.hours, cost: totals.cost,
    hoursPerSqft: totals.hours / totals.sqft,
    hourlyRate: 18, // derivado de calibradores reales
    internalPerSqft: totals.cost / totals.sqft
  };
})();

// ─── MERCADO AUSTIN TX 2026 ───
const EST_MERCADO = {
  gcMarginTypical: 0.25,
  ppsf: {
    lipstick:{min:8,typical:12,max:18,label:'Lipstick',hpsf:0.30},
    light:   {min:15,typical:22,max:35,label:'Cosmético Ligero',hpsf:0.70},
    heavy:   {min:30,typical:45,max:65,label:'Cosmético Pesado',hpsf:1.15},
    full:    {min:60,typical:95,max:150,label:'Renovación Total',hpsf:1.60},
    gut:     {min:100,typical:175,max:250,label:'Gut Renovation',hpsf:2.20}
  },
  trabajos: {
    cocina_completa:{min:19000,typical:32000,max:50000}, cocina_cosmetica:{min:8000,typical:14000,max:20000},
    bano_completo:{min:13000,typical:24745,max:35000}, bano_cosmetico:{min:5000,typical:9000,max:13000},
    pintura_interior_total:{min:3000,typical:4500,max:6000}, pintura_parcial:{min:800,typical:1500,max:2500},
    pisos_completos:{min:4,typical:7,max:12,perSqft:true}, pisos_parcial:{min:600,typical:1500,max:3000},
    drywall_completo:{min:2,typical:3.5,max:5,perSqft:true}, drywall_reparacion:{min:300,typical:800,max:1500},
    techo_completo:{min:9000,typical:14000,max:22000}, techo_reparacion:{min:500,typical:1500,max:3500},
    siding_completo:{min:8000,typical:13000,max:22000}, siding_parcial:{min:1500,typical:3500,max:6500},
    ventanas_todas:{min:5000,typical:9000,max:16000}, ventanas_pocas:{min:800,typical:1800,max:3500},
    cerca_completa:{min:3500,typical:6000,max:10000}, cerca_reparacion:{min:400,typical:1000,max:2200},
    jardineria_full:{min:1500,typical:3500,max:7000}, jardineria_basica:{min:400,typical:900,max:1800},
    plomeria_ajuste:{min:200,typical:450,max:900}, plomeria_fixtures:{min:600,typical:1200,max:2400},
    plomeria_parcial:{min:2500,typical:4500,max:8000}, plomeria_repipe:{min:6000,typical:11000,max:18000},
    calentador_agua:{min:1200,typical:2200,max:3800},
    electrico_ajuste:{min:200,typical:450,max:900}, electrico_outlets:{min:400,typical:900,max:1800},
    electrico_panel:{min:2000,typical:3500,max:5500}, electrico_parcial:{min:2500,typical:4500,max:8000},
    electrico_completo:{min:5000,typical:9000,max:16000}, luminarias:{min:400,typical:1200,max:2800},
    hvac_mantenimiento:{min:200,typical:500,max:1000}, hvac_reparacion:{min:800,typical:1800,max:3500},
    hvac_unidad:{min:4000,typical:6500,max:10000}, hvac_sistema_completo:{min:8000,typical:13000,max:20000},
    demolicion_parcial:{min:1500,typical:3000,max:6000}, demolicion_total:{min:4000,typical:8000,max:14000},
    ampliacion:{min:40,typical:80,max:120,perSqft:true}, adu:{min:60000,typical:95000,max:150000},
    foundation_repair:{min:1500,typical:3500,max:8000}, framing_repair:{min:2000,typical:4500,max:9000},
    insulation:{min:1200,typical:2500,max:5000}, interior_doors:{min:1500,typical:3000,max:5500},
    interior_trim:{min:1000,typical:2500,max:5000}, carpet:{min:1,typical:2.5,max:5,perSqft:true},
    appliances:{min:2500,typical:4500,max:9000}, facsia_soffit:{min:800,typical:1800,max:3500},
    garage_doors:{min:800,typical:1500,max:3500}, masonry:{min:2000,typical:4500,max:10000},
    driveway:{min:2500,typical:5500,max:12000}, pressure_wash:{min:200,typical:500,max:1500},
    patio_decking:{min:2000,typical:5000,max:12000}, rain_gutters:{min:500,typical:1500,max:3500},
    sprinklers:{min:1500,typical:3500,max:7000}, pool_service:{min:5000,typical:15000,max:50000},
    final_cleaning:{min:300,typical:800,max:2000}
  }
};

const EST_TIPOS = {
  lipstick:{nombre:'Lipstick',icon:osIcon('sparkles'),desc:'Solo cosmético menor',hpsf:0.30},
  light:   {nombre:'Cosmético Ligero',icon:osIcon('palette'),desc:'Cosmético completo',hpsf:0.70},
  heavy:   {nombre:'Cosmético Pesado',icon:osIcon('wrench'),desc:'Cocina O baños',hpsf:1.15},
  full:    {nombre:'Renovación Total',icon:osIcon('hammer'),desc:'Cocina + baños + sist.',hpsf:1.60},
  gut:     {nombre:'Gut Renovation',icon:osIcon('construction'),desc:'Todo a los studs',hpsf:2.20}
};

// ─── CATÁLOGO TRABAJOS ───
const EST_TRABAJOS = {
  cocina_completa:{nombre:'Cocina completa',desc:'Gabinetes + cuarzo + backsplash + sink + appliances + plomería',icon:'‍',cat:'Cocina',mat:9800,matSqft:0,weight:22,matPct:0.72,lrc:['Kitchen Cabinets','Kitchen Countertops','Backsplash','Appliances','Plumbing Final/ Fixtures']},
  cocina_cosmetica:{nombre:'Cocina cosmética',desc:'Pintar gabinetes + encimera + backsplash + fixtures',icon:'‍',cat:'Cocina',mat:3000,matSqft:0,weight:7,matPct:0.55,lrc:['Kitchen Countertops','Backsplash','Hardware']},
  bano_completo:{nombre:'Baño completo (c/u)',desc:'Tile + vanity + toilet + plomería + ducha',icon:osIcon('wrench'),cat:'Baños',mat:2800,matSqft:0,weight:9,matPct:0.55,mult:true,lrc:['Bathroom Cabinets','Bathroom Vanity Tops','Bathroom Floors','Bathtubs/ Showers','Tile - Bathroom','Plumbing Final/ Fixtures']},
  bano_cosmetico:{nombre:'Baño cosmético (c/u)',desc:'Vanity + toilet + pintura + fixtures',icon:osIcon('wrench'),cat:'Baños',mat:1000,matSqft:0,weight:3,matPct:0.50,mult:true,lrc:['Bathroom Cabinets','Mirrors','Hardware']},
  pintura_interior_total:{nombre:'Pintura interior total',desc:'Toda la casa: primer + 2 capas',icon:osIcon('palette'),cat:'Acabados',mat:0,matSqft:1.10,weight:7,matPct:0.25,lrc:['Interior Paint']},
  pintura_parcial:{nombre:'Pintura parcial',desc:'Solo algunas áreas',icon:osIcon('palette'),cat:'Acabados',mat:0,matSqft:0.40,weight:2,matPct:0.25,lrc:['Interior Paint']},
  pisos_completos:{nombre:'Pisos completos (LVP)',desc:'Reemplazo total + underlayment',icon:'⬜',cat:'Acabados',mat:300,matSqft:3.20,weight:6,matPct:0.60,lrc:['Vinl Flooring']},
  pisos_parcial:{nombre:'Pisos parciales',desc:'Solo áreas específicas',icon:'⬜',cat:'Acabados',mat:200,matSqft:1.60,weight:2.5,matPct:0.60,lrc:['Vinl Flooring']},
  drywall_completo:{nombre:'Drywall completo',desc:'Reemplazo + textura + masa toda la casa',icon:'▦',cat:'Acabados',mat:0,matSqft:1.40,weight:5,matPct:0.45,lrc:['Drywall']},
  drywall_reparacion:{nombre:'Drywall reparación',desc:'Solo agujeros, grietas y daños puntuales',icon:'▦',cat:'Acabados',mat:200,matSqft:0,weight:1.2,matPct:0.45,lrc:['Drywall']},
  insulation:{nombre:'Insulation',desc:'Aislamiento térmico paredes y ático',icon:'▦',cat:'Acabados',mat:1800,matSqft:0,weight:1.5,matPct:0.55,lrc:['Insulation']},
  interior_doors:{nombre:'Interior doors',desc:'Reemplazo de puertas interiores',icon:osIcon('door'),cat:'Acabados',mat:2200,matSqft:0,weight:1.8,matPct:0.65,lrc:['Interior Doors']},
  interior_trim:{nombre:'Interior trim',desc:'Baseboard, molduras, marcos',icon:'▦',cat:'Acabados',mat:1500,matSqft:0,weight:1.5,matPct:0.50,lrc:['Interior Trim & Doors']},
  carpet:{nombre:'Carpet',desc:'Alfombra en dormitorios',icon:'⬜',cat:'Acabados',mat:0,matSqft:2.20,weight:2,matPct:0.55,lrc:['Carpet']},
  appliances:{nombre:'Appliances',desc:'Stove, fridge, microwave, dishwasher',icon:'‍',cat:'Acabados',mat:3500,matSqft:0,weight:0.8,matPct:0.95,lrc:['Appliances']},
  techo_completo:{nombre:'Techo completo',desc:'Shingles + underlayment + flashing',icon:'☁️',cat:'Exterior',mat:1800,matSqft:3.20,weight:5,matPct:0.50,lrc:['Roofing Material','Roofing Labor']},
  techo_reparacion:{nombre:'Techo reparación',desc:'Solo área dañada + sellado',icon:'☁️',cat:'Exterior',mat:500,matSqft:0,weight:1.2,matPct:0.50,lrc:['Roofing Material','Roofing Labor']},
  siding_completo:{nombre:'Siding completo',desc:'Fiber cement + pintura exterior',icon:osIcon('ruler'),cat:'Exterior',mat:800,matSqft:2.80,weight:6,matPct:0.55,lrc:['Siding','Exterior Paint']},
  siding_parcial:{nombre:'Siding reparación',desc:'Solo paneles dañados',icon:osIcon('ruler'),cat:'Exterior',mat:400,matSqft:0,weight:1.5,matPct:0.55,lrc:['Siding']},
  ventanas_todas:{nombre:'Ventanas todas',desc:'Reemplazo 8-12 ventanas',icon:osIcon('door'),cat:'Exterior',mat:3200,matSqft:0,weight:3.5,matPct:0.70,lrc:['Windows']},
  ventanas_pocas:{nombre:'Ventanas pocas (2-3)',desc:'Solo ventanas críticas',icon:osIcon('door'),cat:'Exterior',mat:900,matSqft:0,weight:1,matPct:0.70,lrc:['Windows']},
  cerca_completa:{nombre:'Cerca completa',desc:'Postes + pickets + concreto',icon:osIcon('construction'),cat:'Exterior',mat:2200,matSqft:0,weight:3.5,matPct:0.50,lrc:['Fencing']},
  cerca_reparacion:{nombre:'Cerca reparación',desc:'Solo postes/pickets dañados',icon:osIcon('construction'),cat:'Exterior',mat:300,matSqft:0,weight:0.8,matPct:0.50,lrc:['Fencing']},
  jardineria_full:{nombre:'Jardinería completa',desc:'Sod + plantas + mulch + gradas',icon:osIcon('ruler'),cat:'Exterior',mat:800,matSqft:0,weight:2,matPct:0.35,lrc:['Landscaping']},
  jardineria_basica:{nombre:'Jardinería básica',desc:'Limpieza + sod + pintura puerta',icon:osIcon('ruler'),cat:'Exterior',mat:300,matSqft:0,weight:0.8,matPct:0.35,lrc:['Landscaping']},
  facsia_soffit:{nombre:'Facsia / Soffit',desc:'Borde del techo + ventilación',icon:osIcon('ruler'),cat:'Exterior',mat:900,matSqft:0,weight:1.5,matPct:0.50,lrc:['Facsia/ Soffit']},
  garage_doors:{nombre:'Garage doors',desc:'Puerta de garaje + motor',icon:osIcon('door'),cat:'Exterior',mat:1100,matSqft:0,weight:1,matPct:0.70,lrc:['Garage Doors']},
  masonry:{nombre:'Masonry / Stucco',desc:'Reparación o aplicación de estuco',icon:'▦',cat:'Exterior',mat:2200,matSqft:0,weight:2,matPct:0.45,lrc:['Masonry/ Stucco']},
  driveway:{nombre:'Driveway / Flatwork',desc:'Reparación o nueva entrada de auto',icon:'⬜',cat:'Exterior',mat:2800,matSqft:0,weight:2.5,matPct:0.50,lrc:['Driveway/ Flatwork']},
  pressure_wash:{nombre:'Pressure wash',desc:'Limpieza a presión exterior',icon:osIcon('trash'),cat:'Exterior',mat:100,matSqft:0,weight:0.5,matPct:0.10,lrc:['Pressure Wash']},
  patio_decking:{nombre:'Patio / Decking',desc:'Construcción de deck o patio',icon:osIcon('ruler'),cat:'Exterior',mat:2800,matSqft:0,weight:2.5,matPct:0.55,lrc:['Patio / Outdoor decking']},
  rain_gutters:{nombre:'Rain gutters',desc:'Canaletas + downspouts',icon:'☁️',cat:'Exterior',mat:700,matSqft:0,weight:0.8,matPct:0.55,lrc:['Rain Gutters']},
  sprinklers:{nombre:'Sprinkler system',desc:'Sistema de riego automático',icon:osIcon('ruler'),cat:'Exterior',mat:1800,matSqft:0,weight:1.5,matPct:0.55,lrc:['Sprinkler System']},
  pool_service:{nombre:'Pool service',desc:'Reparación/limpieza piscina',icon:osIcon('ruler'),cat:'Exterior',mat:4000,matSqft:0,weight:2.5,matPct:0.55,lrc:['Pool']},
  plomeria_ajuste:{nombre:'Plomería - ajuste menor',desc:'Reparar fuga, válvula, ajuste',icon:osIcon('wrench'),cat:'Plomería',mat:150,matSqft:0,weight:0.6,matPct:0.40,lrc:['Plumbing Rough']},
  plomeria_fixtures:{nombre:'Plomería - fixtures',desc:'Sinks, faucets, toilets, regaderas',icon:osIcon('wrench'),cat:'Plomería',mat:550,matSqft:0,weight:1.5,matPct:0.55,lrc:['Plumbing Final/ Fixtures']},
  plomeria_parcial:{nombre:'Plomería - red parcial',desc:'Re-pipe cocina O baños',icon:osIcon('wrench'),cat:'Plomería',mat:1700,matSqft:0,weight:3,matPct:0.40,lrc:['Plumbing Rough','Plumbing Top Out']},
  plomeria_repipe:{nombre:'Plomería - red completa',desc:'Re-pipe completo + drenajes',icon:osIcon('wrench'),cat:'Plomería',mat:3800,matSqft:0,weight:6.5,matPct:0.40,lrc:['Plumbing Rough','Plumbing Top Out','Plumbing Final/ Fixtures']},
  calentador_agua:{nombre:'Calentador de agua',desc:'Reemplazo de water heater',icon:osIcon('wrench'),cat:'Plomería',mat:850,matSqft:0,weight:0.8,matPct:0.70,lrc:['Plumbing Final/ Fixtures']},
  electrico_ajuste:{nombre:'Eléctrico - ajuste',desc:'Reparar circuito',icon:osIcon('link'),cat:'Eléctrico',mat:150,matSqft:0,weight:0.6,matPct:0.35,lrc:['Electrical Rough']},
  electrico_outlets:{nombre:'Eléctrico - outlets',desc:'Outlets, switches, GFCI',icon:osIcon('link'),cat:'Eléctrico',mat:280,matSqft:0,weight:1.2,matPct:0.40,lrc:['Electrical - Final/Fixtures']},
  electrico_panel:{nombre:'Eléctrico - panel',desc:'Upgrade panel principal',icon:osIcon('link'),cat:'Eléctrico',mat:1300,matSqft:0,weight:2,matPct:0.50,lrc:['Electrical Service']},
  electrico_parcial:{nombre:'Eléctrico - parcial',desc:'Re-cablear cocina O cuartos',icon:osIcon('link'),cat:'Eléctrico',mat:1400,matSqft:0,weight:2.5,matPct:0.35,lrc:['Electrical Rough']},
  electrico_completo:{nombre:'Eléctrico - completo',desc:'Re-cableado total + panel',icon:osIcon('link'),cat:'Eléctrico',mat:3200,matSqft:0,weight:5.5,matPct:0.35,lrc:['Electrical Service','Electrical Rough','Electrical - Final/Fixtures']},
  luminarias:{nombre:'Luminarias',desc:'Recessed + ceiling fans + fixtures',icon:osIcon('link'),cat:'Eléctrico',mat:600,matSqft:0,weight:1.2,matPct:0.55,lrc:['Electrical - Final/Fixtures']},
  hvac_mantenimiento:{nombre:'HVAC - mantenimiento',desc:'Tune-up + filtros + limpieza',icon:osIcon('wrench'),cat:'HVAC',mat:120,matSqft:0,weight:0.4,matPct:0.50,lrc:['HVAC Rough']},
  hvac_reparacion:{nombre:'HVAC - reparación',desc:'Reparar AC o furnace',icon:osIcon('wrench'),cat:'HVAC',mat:450,matSqft:0,weight:1.2,matPct:0.60,lrc:['HVAC Rough']},
  hvac_unidad:{nombre:'HVAC - 1 unidad nueva',desc:'Solo AC O solo furnace',icon:osIcon('wrench'),cat:'HVAC',mat:2500,matSqft:0,weight:2,matPct:0.70,lrc:['HVAC Set Out']},
  hvac_sistema_completo:{nombre:'HVAC - sistema completo',desc:'AC + furnace + ductos',icon:osIcon('wrench'),cat:'HVAC',mat:5500,matSqft:0,weight:3.5,matPct:0.70,lrc:['HVAC Rough','HVAC Set Out']},
  foundation_repair:{nombre:'Foundation / nivelación',desc:'Leveling + reparación de cimentación',icon:osIcon('building'),cat:'Estructural',mat:1500,matSqft:0,weight:3,matPct:0.60,lrc:['Foundation']},
  framing_repair:{nombre:'Framing - reparación',desc:'Reparar/agregar framing en áreas dañadas',icon:osIcon('building'),cat:'Estructural',mat:2000,matSqft:0,weight:3.5,matPct:0.55,lrc:['Framing - Material','Framing - Labor']},
  demolicion_parcial:{nombre:'Demolición parcial',desc:'Tumbar 1-2 paredes',icon:osIcon('construction'),cat:'Estructural',mat:300,matSqft:0,weight:2,matPct:0.10,lrc:['Demolition']},
  demolicion_total:{nombre:'Demolición a studs',desc:'Gut completo',icon:osIcon('construction'),cat:'Estructural',mat:900,matSqft:0,weight:7,matPct:0.10,lrc:['Demolition']},
  ampliacion:{nombre:'Ampliación (sqft)',desc:'Construcción nueva — ingresar sqft',icon:'⛶',cat:'Estructural',mat:0,matSqft:0,weight:0,customSqft:true,matSqftNuevo:28,matPct:0.55,lrc:['Framing - Material','Framing - Labor']},
  adu:{nombre:'ADU / cuarto extra',desc:'Unidad accesoria 400-800sqft',icon:'↔️',cat:'Estructural',mat:22000,matSqft:0,weight:13,matPct:0.55,lrc:['Framing - Material','Framing - Labor']},
  final_cleaning:{nombre:'Final cleaning',desc:'Limpieza profesional al final',icon:osIcon('trash'),cat:'Limpieza',mat:100,matSqft:0,weight:0.8,matPct:0.10,lrc:['Final Cleaning']}
};

const EST_CATEGORIAS = ['Cocina','Baños','Acabados','Exterior','Plomería','Eléctrico','HVAC','Estructural','Limpieza'];

const EST_LRC = {
  softCost: ['Permits','Architectural','Contigencies','General Contractor Fee','Temp Utility'],
  hardCost1: ['Demolition','Site Work/ Prep','Foundation','Roofing Material','Roofing Labor','Framing - Material','Framing - Labor','Siding','Facsia/ Soffit','Exterior Doors','Garage Doors','HVAC Rough','HVAC Set Out','Electrical Service','Electrical Rough','Electrical - Final/Fixtures','Plumbing Rough','Plumbing Top Out','Plumbing Final/ Fixtures'],
  hardCost2: ['Windows','Interior Doors','Interior Trim & Doors','Insulation','Drywall','Interior Paint','Tile Flooring','Carpet','Vinl Flooring','Kitchen Countertops','Kitchen Cabinets','Backsplash','Appliances','Bathroom Cabinets','Bathroom Vanity Tops','Bathroom Floors','Bathtubs/ Showers','Mirrors','Tub Surround','Hardware','Bathroom - Shower glass','Tile - Bathroom','Other - Interior'],
  hardCost3: ['Masonry/ Stucco','Exterior Paint','Driveway/ Flatwork','Pressure Wash','Landscaping','Patio / Outdoor decking','Rain Gutters','Sprinkler System','Fencing','Pool','Final Cleaning','Other - Exterior']
};

const EST_OVERHEAD = 0.12;

// ─── ESTADO ───
const estState = {
  sys: null, cases: [], tab: 'estimador',
  propertyId: null,
  sqft: 1500, tipo: 'heavy', presupuesto: 0,
  trabajos: {}, marginPct: 35, hourlyRate: EST_POOL.hourlyRate, bufferPct: 5,
  showAvanzado: false,
  city: 'Austin', state: 'TX',
  crewSize: 3, startDate: new Date().toISOString().split('T')[0], workDays: 6, // 6 días/semana típico construcción
  marketPrices: {},
  loadingMarket: false, marketStatus: '',
  propertyInfo: { address:'', contractor:'Rental Profitss', email:'gerencia@rentalprofitss.com', phone:'' }
};

// ─── FASES CONSTRUCTIVAS (orden CPM profesional residencial) ───
const EST_PHASES = {
  preconstruction:{order:1,  name:'Pre-construcción',         color:'#6f7785', emoji:'📋', desc:'Permits, planning, dumpster, kickoff'},
  demo:           {order:2,  name:'Demolición',               color:'#dc2626', emoji:'⛏️', desc:'Tumbar, sacar escombros, preparar sitio'},
  structural:     {order:3,  name:'Estructural',              color:'#ea580c', emoji:'🏗️', desc:'Foundation, framing, modificaciones estructurales'},
  rough:          {order:4,  name:'Rough-in (instalaciones)', color:'#d97706', emoji:'🔌', desc:'Plumbing, electrical, HVAC dentro de paredes'},
  inspectionRough:{order:5,  name:'Inspección Rough',         color:'#a16207', emoji:'🔍', desc:'Inspector valida instalaciones antes de cerrar'},
  insulation:     {order:6,  name:'Aislamiento',              color:'#ca8a04', emoji:'▦', desc:'Insulation en paredes y ático'},
  drywall:        {order:7,  name:'Drywall',                  color:'#65a30d', emoji:'⬜', desc:'Instalar, tape, mud, sand, texturizar'},
  flooring:       {order:8,  name:'Pisos',                    color:'#16a34a', emoji:'🪵', desc:'LVP, tile, carpet — primero baños luego resto'},
  cabinets:       {order:9,  name:'Gabinetes cocina/baños',   color:'#0d9488', emoji:'🪟', desc:'Instalación de gabinetes'},
  countertops:    {order:10, name:'Encimeras',                color:'#3a5be0', emoji:'🪨', desc:'Template + fabricación + instalación (1 sem espera)'},
  tile:           {order:11, name:'Tile (showers/backsplash)',color:'#0284c7', emoji:'▦', desc:'Showers, bathroom floors, kitchen backsplash'},
  trim:           {order:12, name:'Trim, puertas y molduras', color:'#3a5be0', emoji:'🚪', desc:'Baseboards, door frames, crown molding'},
  paint:          {order:13, name:'Pintura final',            color:'#4f46e5', emoji:'🖌️', desc:'Primer + 2 capas, touch-ups'},
  fixtures:       {order:14, name:'Fixtures finales',         color:'#7c3aed', emoji:'💧', desc:'Plumbing fixtures, electrical fixtures, HVAC trim'},
  appliances:     {order:15, name:'Appliances',               color:'#9333ea', emoji:'🍳', desc:'Conectar stove, fridge, dishwasher, microwave'},
  exterior:       {order:16, name:'Exterior',                 color:'#c026d3', emoji:'🏠', desc:'Roof, siding, paint, fencing, landscaping (puede ir en paralelo)'},
  cleaning:       {order:17, name:'Limpieza final',           color:'#db2777', emoji:'🧹', desc:'Deep clean, punch list, ready for showing'}
};

// ─── MAPA: cada trabajo → fase + min días (overrides cálculo por horas) ───
const EST_PHASE_MAP = {
  cocina_completa:'cabinets', cocina_cosmetica:'paint',
  bano_completo:'tile', bano_cosmetico:'fixtures',
  pintura_interior_total:'paint', pintura_parcial:'paint',
  pisos_completos:'flooring', pisos_parcial:'flooring', carpet:'flooring',
  drywall_completo:'drywall', drywall_reparacion:'drywall',
  insulation:'insulation', interior_doors:'trim', interior_trim:'trim', appliances:'appliances',
  techo_completo:'exterior', techo_reparacion:'exterior',
  siding_completo:'exterior', siding_parcial:'exterior',
  ventanas_todas:'exterior', ventanas_pocas:'exterior',
  cerca_completa:'exterior', cerca_reparacion:'exterior',
  jardineria_full:'exterior', jardineria_basica:'exterior',
  facsia_soffit:'exterior', garage_doors:'exterior',
  masonry:'exterior', driveway:'exterior', pressure_wash:'exterior',
  patio_decking:'exterior', rain_gutters:'exterior', sprinklers:'exterior', pool_service:'exterior',
  plomeria_ajuste:'fixtures', plomeria_fixtures:'fixtures',
  plomeria_parcial:'rough', plomeria_repipe:'rough', calentador_agua:'fixtures',
  electrico_ajuste:'fixtures', electrico_outlets:'fixtures',
  electrico_panel:'rough', electrico_parcial:'rough', electrico_completo:'rough', luminarias:'fixtures',
  hvac_mantenimiento:'fixtures', hvac_reparacion:'fixtures',
  hvac_unidad:'rough', hvac_sistema_completo:'rough',
  foundation_repair:'structural', framing_repair:'structural',
  demolicion_parcial:'demo', demolicion_total:'demo',
  ampliacion:'structural', adu:'structural',
  final_cleaning:'cleaning'
};

// ─── HELPERS ───
const estFmt = n => '$' + Math.round(n || 0).toLocaleString('en-US');
const estFmtK = n => '$' + ((n||0)/1000).toFixed(1) + 'K';
function estGetEstado(dev) {
  if (dev === null || dev === undefined) return { label:'Sin datos', color:'slate' };
  if (dev < -5) return { label:'¡Excelente! Ahorro', color:'emerald' };
  if (dev <= 0.5) return { label:'En presupuesto', color:'green' };
  if (dev <= 10) return { label:'Sobre presupuesto', color:'amber' };
  return { label:'¡ALERTA! +10%', color:'red' };
}

// ─── CÁLCULO ───
function estGetMarketPrice(key) {
  // Si hay precio fresh del mercado para este job, usarlo; sino default
  const fresh = estState.marketPrices[key];
  if (fresh) return { min: +fresh.price_min, typical: +fresh.price_typical, max: +fresh.price_max, perSqft: fresh.unit === 'per_sqft', source: 'live' };
  const def = EST_MERCADO.trabajos[key];
  if (def) return { ...def, source: 'default' };
  return null;
}

function estCalc() {
  const tipoData = EST_TIPOS[estState.tipo];
  let totalMat = 0, totalWeight = 0, ampSqft = 0, mercadoTotal = 0;
  const desglose = [];

  Object.entries(estState.trabajos).forEach(([key, cfg]) => {
    const t = EST_TRABAJOS[key]; if (!t) return;
    const count = cfg.count || 1;
    const csqft = cfg.customSqft || 0;
    let mat = 0, weight = t.weight * count;
    if (t.customSqft && csqft > 0) {
      mat = csqft * t.matSqftNuevo; weight = csqft * 0.04; ampSqft += csqft;
    } else {
      mat = (t.mat + estState.sqft * t.matSqft) * count;
    }
    totalMat += mat; totalWeight += weight;
    const merc = estGetMarketPrice(key);
    let mercPrice = 0;
    if (merc) mercPrice = merc.perSqft ? (key === 'ampliacion' ? csqft : estState.sqft) * merc.typical * count : merc.typical * count;
    mercadoTotal += mercPrice;
    desglose.push({ key, nombre:t.nombre, icon:t.icon, cat:t.cat, mat, weight, count, csqft, matPct:t.matPct, lrc:t.lrc||[], hours:0, labor:0, total:0, matInd:0, laborInd:0, mercPrice, mercSource: merc?.source });
  });

  const sqftEf = estState.sqft + ampSqft;
  let totalHours = sqftEf * tipoData.hpsf;
  const baseline = { lipstick:5, light:15, heavy:35, full:60, gut:90 }[estState.tipo] || 35;
  const ratio = totalWeight > 0 ? totalWeight / baseline : 1;
  totalHours *= 1 + (ratio - 1) * 0.10;
  totalHours = Math.min(totalHours, sqftEf * 2.6);

  desglose.forEach(d => {
    if (totalWeight > 0) {
      d.hours = (d.weight / totalWeight) * totalHours;
      d.labor = d.hours * estState.hourlyRate;
      d.total = d.mat + d.labor;
      d.matInd = d.total * d.matPct;
      d.laborInd = d.total * (1 - d.matPct);
    }
  });

  const totalLabor = totalHours * estState.hourlyRate;
  const direct = totalMat + totalLabor;
  const overhead = direct * EST_OVERHEAD;
  const buffer = (direct + overhead) * (estState.bufferPct / 100);
  const costoInterno = direct + overhead + buffer;
  const margin = costoInterno * (estState.marginPct / 100);
  const precioRP = costoInterno + margin;

  const ppsfMerc = EST_MERCADO.ppsf[estState.tipo];
  const precioMercado = mercadoTotal > 0 ? mercadoTotal : estState.sqft * ppsfMerc.typical;
  const costoMercado = precioMercado / (1 + EST_MERCADO.gcMarginTypical);

  const precioCompet = precioMercado * 0.88;
  const precioMin = costoInterno * 1.25;
  const precioRec = Math.max(precioCompet, precioMin);
  const margenRec = ((precioRec - costoInterno) / costoInterno) * 100;

  let devVsPres = null, estado = null;
  if (estState.presupuesto > 0) {
    devVsPres = ((costoInterno - estState.presupuesto) / estState.presupuesto) * 100;
    estado = estGetEstado(devVsPres);
  }

  const margenReal = ((precioRP - costoInterno) / costoInterno) * 100;
  let alerta = 'green', alertaTxt = 'Margen saludable';
  if (margenReal < 20) { alerta = 'red'; alertaTxt = 'MARGEN PELIGROSO'; }
  else if (margenReal < 30) { alerta = 'amber'; alertaTxt = 'Margen ajustado'; }

  const days = totalHours / (3 * 9.5);

  // LRC mapping
  const lrcMap = {};
  desglose.forEach(d => {
    if (!d.lrc.length) return;
    const sMat = d.matInd / d.lrc.length, sLabor = d.laborInd / d.lrc.length;
    d.lrc.forEach(linea => {
      if (!lrcMap[linea]) lrcMap[linea] = { total:0, sources:[] };
      lrcMap[linea].total += sMat + sLabor;
      lrcMap[linea].sources.push(d.nombre);
    });
  });

  return { sqft:estState.sqft, sqftEf, tipoData, totalMat, totalLabor, totalHours, direct, overhead, buffer, costoInterno, margin, precioRP, precioMercado, costoMercado, precioRec, margenRec, margenReal, alerta, alertaTxt, devVsPres, estado, days, desglose, lrcMap, ppsfRP: estState.sqft > 0 ? precioRP/estState.sqft : 0, hasJobs: desglose.length > 0 };
}

// ─── DB ───
async function estLoadCases() {
  const { data, error } = await sb.from('renovation_cases').select('*').order('sqft');
  if (error) console.error(error);
  estState.cases = data || [];
}

async function estLoadMarketCache() {
  // Carga precios de cache para la ciudad actual (todos los que tenga)
  const { data } = await sb.from('market_prices_cache').select('*').eq('city', estState.city).eq('state', estState.state);
  estState.marketPrices = {};
  (data || []).forEach(p => { estState.marketPrices[p.job_key] = p; });
}

async function estFetchMarketPrices(force = false) {
  const jobKeys = Object.keys(estState.trabajos);
  if (jobKeys.length === 0) { alert('Selecciona al menos un trabajo primero'); return; }
  estState.loadingMarket = true;
  estState.marketStatus = `Buscando precios actuales para ${estState.city}, ${estState.state}... (puede tardar 30-60s)`;
  estRenderTab();
  try {
    const { data, error } = await sb.functions.invoke('get-market-prices', {
      body: { city: estState.city, state: estState.state, jobKeys, force }
    });
    if (error) throw error;
    estState.marketPrices = {};
    (data.prices || []).forEach(p => { estState.marketPrices[p.job_key] = p; });
    estState.marketStatus = data.fromCache
      ? `✓ ${data.prices.length} precios desde cache para ${estState.city}, ${estState.state}`
      : `✓ ${data.fetched} precios actualizados de internet · ${data.prices.length} total disponibles`;
  } catch (e) {
    estState.marketStatus = `Error: ${e.message}`;
  } finally {
    estState.loadingMarket = false;
    estRenderTab();
  }
}

function estFreshness(jobKey) {
  const p = estState.marketPrices[jobKey];
  if (!p?.fetched_at) return null;
  const days = Math.round((Date.now() - new Date(p.fetched_at).getTime()) / (24*60*60*1000));
  return days;
}

// ─── CRONOGRAMA / CPM ───
function estAddDays(date, days) {
  const d = new Date(date);
  if (estState.workDays === 7) { d.setDate(d.getDate() + days); return d; }
  // Saltar domingos (si workDays === 6) o sábados y domingos (5)
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (estState.workDays === 6 && dow === 0) continue;
    if (estState.workDays === 5 && (dow === 0 || dow === 6)) continue;
    added++;
  }
  return d;
}

function estFmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' });
}

function estGenerateSchedule() {
  const e = estCalc();
  if (!e.hasJobs) return null;

  // Agrupar trabajos por fase
  const tasksByPhase = {};
  e.desglose.forEach(d => {
    const phase = EST_PHASE_MAP[d.key] || 'cleaning';
    if (!tasksByPhase[phase]) tasksByPhase[phase] = [];
    tasksByPhase[phase].push(d);
  });

  // Pre-construction siempre 1 día
  if (!tasksByPhase.preconstruction) {
    tasksByPhase.preconstruction = [{ key:'_pre', nombre:'Permits, kickoff, dumpster', hours: 8, cat:'Pre' }];
  }

  // Cleaning siempre al final (si no está)
  if (!tasksByPhase.cleaning) {
    tasksByPhase.cleaning = [{ key:'_clean', nombre:'Limpieza final + punch list', hours: 16, cat:'Limpieza' }];
  }

  // Inspecciones / waits (no son trabajo, son días en calendar)
  // Rough inspection: 1 día después de rough-in (si hay)
  // Countertop wait: si hay countertops, +5 días después de cabinets para template/fabricación

  // Calcular días por fase — usa tiempo REAL del mercado si está, sino calcula
  const crew = Math.max(1, estState.crewSize);
  const hoursPerDay = crew * 8;
  const phaseRows = [];
  let liveDataUsed = 0, totalTasks = 0;
  Object.entries(tasksByPhase).forEach(([phaseKey, tasks]) => {
    const phaseInfo = EST_PHASES[phaseKey];
    if (!phaseInfo) return;

    // Suma de tiempos: si la tarea tiene live data, usa duration_days_typical * count
    // Si crew real del usuario < crew típico del mercado, escala (más demora)
    let liveDays = 0, calculatedHours = 0, hasLive = false;
    tasks.forEach(t => {
      totalTasks++;
      const live = estState.marketPrices[t.key];
      if (live && live.duration_days_typical) {
        const marketCrew = live.crew_size_typical || crew;
        // Si tu crew es menor, demora más; si es mayor, demora menos
        const scale = marketCrew / crew;
        liveDays += (+live.duration_days_typical) * (t.count || 1) * scale;
        liveDataUsed++;
        hasLive = true;
      } else {
        calculatedHours += t.hours || 8;
      }
    });

    let days = Math.ceil(liveDays + (calculatedHours / hoursPerDay));
    if (days < 1) days = 1;

    // Mínimos realistas (siempre se respetan)
    if (phaseKey === 'preconstruction') days = Math.max(days, 1);
    if (phaseKey === 'inspectionRough') days = Math.max(days, 1);
    if (phaseKey === 'countertops') days = Math.max(days, 7);
    if (phaseKey === 'drywall' && !hasLive) days = Math.max(days, 3);
    if (phaseKey === 'paint' && !hasLive) days = Math.max(days, 2);

    phaseRows.push({ phaseKey, phaseInfo, tasks, totalHours: tasks.reduce((s,t)=>s+(t.hours||0),0), days, hasLive });
  });

  const liveCoverage = totalTasks > 0 ? (liveDataUsed / totalTasks * 100) : 0;

  // Insertar inspectionRough si hay rough phase
  const hasRough = phaseRows.some(r => r.phaseKey === 'rough');
  if (hasRough && !phaseRows.some(r => r.phaseKey === 'inspectionRough')) {
    phaseRows.push({ phaseKey:'inspectionRough', phaseInfo: EST_PHASES.inspectionRough, tasks: [{ nombre:'Inspector valida rough-in', hours: 0 }], totalHours: 0, days: 1 });
  }

  // Sort por orden de fase
  phaseRows.sort((a,b) => a.phaseInfo.order - b.phaseInfo.order);

  // Asignar fechas
  const start = new Date(estState.startDate);
  let interiorCursor = new Date(start);
  let exteriorCursor = new Date(start);
  const canParallel = crew >= 4; // si hay crew suficiente, exterior corre en paralelo
  let interiorEnd = new Date(start), exteriorEnd = new Date(start);

  const timeline = phaseRows.map(r => {
    let startD, endD;
    if (r.phaseKey === 'exterior' && canParallel) {
      // Exterior corre desde día 1 con su propia mini-crew
      startD = new Date(exteriorCursor);
      endD = estAddDays(startD, r.days);
      exteriorCursor = endD;
      if (endD > exteriorEnd) exteriorEnd = endD;
    } else {
      startD = new Date(interiorCursor);
      endD = estAddDays(startD, r.days);
      interiorCursor = endD;
      if (endD > interiorEnd) interiorEnd = endD;
    }
    return { ...r, startD, endD };
  });

  const finalEnd = interiorEnd > exteriorEnd ? interiorEnd : exteriorEnd;
  const calendarDays = Math.ceil((finalEnd - start) / (1000*60*60*24));
  const workDaysTotal = phaseRows.reduce((s,r) => s + r.days, 0);
  // Si exterior corre en paralelo, restar sus días del total work (no recortar calendario)
  const parallelDaysSaved = canParallel && phaseRows.some(r => r.phaseKey === 'exterior')
    ? phaseRows.find(r => r.phaseKey === 'exterior')?.days || 0
    : 0;

  return {
    timeline, start, finalEnd, calendarDays,
    workDaysTotal, parallelDaysSaved,
    weeks: (calendarDays / 7).toFixed(1),
    crew, canParallel,
    hoursTotal: e.totalHours,
    liveCoverage, liveDataUsed, totalTasks
  };
}

async function estAddCase(c) {
  c.created_by = state.user.id;
  c.code = c.code || 'CUSTOM_' + Date.now();
  const { error } = await sb.from('renovation_cases').insert(c);
  if (error) return alert(error.message);
  await estLoadCases();
  estRender();
}

async function estDeleteCase(id) {
  if (!confirm('¿Borrar este caso?')) return;
  const { error } = await sb.from('renovation_cases').delete().eq('id', id);
  if (error) return alert(error.message);
  await estLoadCases();
  estRender();
}

// ─── ENTRY POINT ───
async function openEstimator(sys) {
  estState.sys = sys;
  await Promise.all([estLoadCases(), estLoadMarketCache(), loadProperties()]);
  // Auto-fetch market si hay trabajos seleccionados pero la cobertura es baja
  if (Object.keys(estState.trabajos).length > 0) {
    const covered = Object.keys(estState.trabajos).filter(k => estState.marketPrices[k]).length;
    if (covered / Object.keys(estState.trabajos).length < 0.5) {
      estState.marketStatus = `Tip: click "Actualizar precios mercado" para tiempos y precios reales de ${estState.city}.`;
    }
  }
  openModal(`${sys.name}`, '<div id="est-root"></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  estRender();
}

// ─── RENDER PRINCIPAL ───
function estRender() {
  const root = document.getElementById('est-root');
  const tabs = [
    { id:'estimador', label:'Estimador' },
    { id:'lrc',       label:'Vista LRC' },
    { id:'comparador',label:'Similares' },
    { id:'mercado',   label:'Mercado' },
    { id:'calibradores',label:'Calibradores' },
    { id:'cronograma',label:'Cronograma' },
    { id:'lideres',   label:'Líderes' },
    { id:'historico', label:'Histórico' }
  ];
  root.innerHTML = `
    ${propertySelectorHtml(estState.propertyId, 'estOnPropertyChange', 'estSaveProperty')}
    <div class="flex gap-1 mb-4 border-b border-slate-200 -mx-6 px-6 overflow-x-auto">
      ${tabs.map(t => `<button onclick="estSetTab('${t.id}')" class="px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${estState.tab===t.id?'border-slate-900 text-slate-900':'border-transparent text-slate-500 hover:text-slate-900'}">${t.label}</button>`).join('')}
    </div>
    <div id="est-tab-body"></div>
  `;
  estRenderTab();
}

function estOnPropertyChange(propId) {
  if (!propId) { estState.propertyId = null; estRender(); return; }
  const p = window.propertiesCache.find(x => x.id === propId);
  if (!p) return;
  estState.propertyId = p.id;
  if (p.sqft) estState.sqft = +p.sqft;
  if (p.city) estState.city = p.city;
  if (p.state) estState.state = p.state;
  estRender();
}

async function estRunAI(force = false) {
  const e = estCalc();
  window._aiRefreshCb = () => estRenderTab();
  await aiAnalyze('estimator', {
    sqft: estState.sqft,
    type_label: EST_TIPOS[estState.tipo]?.nombre,
    city: estState.city, state: estState.state,
    jobs_count: Object.keys(estState.trabajos).length,
    internal_cost: e.costoInterno,
    crew_size: estState.crewSize,
    year_built: null
  }, force);
}

async function estSaveProperty() {
  const e = estCalc();
  const propAddr = window.propertiesCache.find(p => p.id === estState.propertyId)?.address;
  const payload = {
    address: propAddr || `Casa de ${estState.sqft} sqft en ${estState.city}`,
    sqft: estState.sqft,
    city: estState.city,
    state: estState.state,
    remodel_cost_estimated: e.hasJobs ? e.costoInterno : null
  };
  const newId = await upsertProperty(payload, estState.propertyId);
  if (newId) {
    estState.propertyId = newId;
    await loadProperties();
    estRender();
    alert('✓ Propiedad guardada con costo de remodelación');
  }
}

function estSetTab(t) { estState.tab = t; estRender(); }

function estRenderTab() {
  const body = document.getElementById('est-tab-body');
  if (estState.tab === 'estimador') {
    estRenderEstimador(body);
    setTimeout(() => {
      const ai = window.aiState?.['estimator'];
      const el = document.getElementById('ai-result-estimator');
      if (el && ai?.analysis) el.innerHTML = aiResultGenericHtml(ai.analysis);
    }, 50);
    return;
  }
  else if (estState.tab === 'lrc') estRenderLRC(body);
  else if (estState.tab === 'comparador') estRenderComparador(body);
  else if (estState.tab === 'mercado') estRenderMercado(body);
  else if (estState.tab === 'calibradores') estRenderCalibradores(body);
  else if (estState.tab === 'cronograma') estRenderCronograma(body);
  else if (estState.tab === 'lideres') estRenderLideres(body);
  else if (estState.tab === 'historico') estRenderHistorico(body);
}

// ─── TAB: CRONOGRAMA (Gantt + secuencia constructiva) ───
function estRenderCronograma(body) {
  const sched = estGenerateSchedule();
  if (!sched) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">Selecciona trabajos en el tab Estimador para generar cronograma.</div>`;
    return;
  }

  // Calcular ancho de cada fase para gantt
  const totalSpan = (sched.finalEnd - sched.start) / (1000*60*60*24);
  const pctOf = (d) => Math.max(0, ((d - sched.start) / (1000*60*60*24)) / totalSpan * 100);

  const isFresh = sched.liveCoverage >= 80;
  body.innerHTML = `
    <div class="space-y-5">
      <!-- Banner de calidad de data -->
      <div class="${isFresh?'bg-emerald-50 border-emerald-300':'bg-amber-50 border-amber-300'} border-2 rounded-xl p-3 flex items-center justify-between">
        <div>
          <div class="text-xs font-bold ${isFresh?'text-emerald-900':'text-amber-900'} uppercase">${isFresh?'Cronograma con tiempos REALES del mercado':'Cronograma con tiempos calculados (no real-time)'}</div>
          <div class="text-xs ${isFresh?'text-emerald-700':'text-amber-700'} mt-0.5">${sched.liveDataUsed} de ${sched.totalTasks} tareas con duración de internet (${sched.liveCoverage.toFixed(0)}%). ${!isFresh?`Para precisión máxima, click "Actualizar precios mercado" en el tab Estimador.`:''}</div>
        </div>
        ${!isFresh?`<button onclick="estFetchMarketPrices(false)" ${estState.loadingMarket?'disabled':''} class="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-xs px-3 py-2 rounded font-bold whitespace-nowrap">${osIcon('globe')} Traer data real</button>`:''}
      </div>

      <!-- Inputs de equipo -->
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Crew (personas)</label>
            <input type="number" min="1" max="15" value="${estState.crewSize}" onchange="estState.crewSize=Math.max(1,+this.value); estRenderTab()" class="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-lg font-bold" />
            <p class="text-[10px] text-slate-500 mt-0.5">${estState.crewSize >= 4 ? '✓ Exterior corre en paralelo' : 'Suma 1+ para paralelizar exterior'}</p>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha inicio</label>
            <input type="date" value="${estState.startDate}" onchange="estState.startDate=this.value; estRenderTab()" class="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Días/semana</label>
            <select onchange="estState.workDays=+this.value; estRenderTab()" class="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm">
              <option value="5" ${estState.workDays===5?'selected':''}>5 (L-V)</option>
              <option value="6" ${estState.workDays===6?'selected':''}>6 (L-S) — típico construcción</option>
              <option value="7" ${estState.workDays===7?'selected':''}>7 (todos los días)</option>
            </select>
          </div>
          <div class="bg-amber-500 text-slate-900 rounded p-3 text-center">
            <div class="text-[10px] font-bold uppercase">Duración estimada</div>
            <div class="text-2xl font-bold">${sched.calendarDays} días</div>
            <div class="text-[10px]">~${sched.weeks} semanas · ${estFmtDate(sched.finalEnd)}</div>
          </div>
        </div>
      </div>

      <!-- Resumen KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Inicio</div>
          <div class="text-sm font-bold">${estFmtDate(sched.start)}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Fin estimado</div>
          <div class="text-sm font-bold text-emerald-700">${estFmtDate(sched.finalEnd)}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Días calendario</div>
          <div class="text-lg font-bold">${sched.calendarDays}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Horas hombre</div>
          <div class="text-lg font-bold">${Math.round(sched.hoursTotal)}h</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Fases</div>
          <div class="text-lg font-bold">${sched.timeline.length}</div>
        </div>
      </div>

      <!-- Gantt -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
        <h3 class="text-sm font-bold text-slate-700 uppercase mb-3">${osIcon('chart')} Gantt visual</h3>
        <div class="space-y-1.5 min-w-[600px]">
          ${sched.timeline.map(t => {
            const left = pctOf(t.startD);
            const width = Math.max(2, pctOf(t.endD) - left);
            const parallelBadge = (t.phaseKey === 'exterior' && sched.canParallel) ? ' <span class="text-[9px] bg-fuchsia-200 text-fuchsia-900 px-1 rounded">∥ paralelo</span>' : '';
            return `
              <div class="grid grid-cols-[200px_1fr_100px] gap-2 items-center text-xs">
                <div class="font-semibold truncate" title="${t.phaseInfo.desc}">${t.phaseInfo.emoji} ${t.phaseInfo.name}${parallelBadge}</div>
                <div class="relative h-6 bg-slate-100 rounded overflow-hidden">
                  <div class="absolute h-full rounded flex items-center justify-center text-white text-[10px] font-bold" style="left:${left}%; width:${width}%; background:${t.phaseInfo.color};">
                    ${t.days}d
                  </div>
                </div>
                <div class="text-[10px] text-slate-500 text-right">${estFmtDate(t.startD).split(',')[0]} → ${estFmtDate(t.endD).split(',')[0]}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Tabla detallada por fase -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <h3 class="text-sm font-bold text-slate-700 uppercase mb-3">${osIcon('clipboard')} Desglose por fase (secuencia constructiva profesional)</h3>
        <div class="space-y-3">
          ${sched.timeline.map((t, i) => `
            <div class="border-l-4 pl-3 py-2" style="border-color:${t.phaseInfo.color};">
              <div class="flex items-baseline justify-between mb-1">
                <div>
                  <span class="text-xs text-slate-400 font-mono">${(i+1).toString().padStart(2,'0')}</span>
                  <span class="text-sm font-bold ml-1">${t.phaseInfo.emoji} ${t.phaseInfo.name}</span>
                  ${t.hasLive?'<span class="ml-1 text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold">' + osIcon('globe') + ' LIVE</span>':''}
                  <span class="text-xs text-slate-500 ml-2">${t.phaseInfo.desc}</span>
                </div>
                <div class="text-xs">
                  <span class="text-slate-500">${estFmtDate(t.startD)} → ${estFmtDate(t.endD)}</span>
                  <span class="font-bold text-slate-900 ml-2">${t.days} día${t.days>1?'s':''}</span>
                </div>
              </div>
              ${t.tasks.length && t.tasks[0].nombre ? `
                <ul class="text-xs text-slate-600 space-y-0.5 mt-1 ml-6">
                  ${t.tasks.map(task => {
                    const live = estState.marketPrices[task.key];
                    const liveLabel = live && live.duration_days_typical ? `<span class="text-[9px] text-emerald-600 ml-1">(mkt: ${live.duration_days_typical}d, crew ${live.crew_size_typical||'?'})</span>` : '';
                    return `<li>• ${task.nombre}${task.count>1?` ×${task.count}`:''} <span class="text-slate-400">(${Math.round(task.hours||0)}h)</span>${liveLabel}${live?.notes?` <span class="text-[10px] text-amber-700">${osIcon('pencil-line')} ${live.notes}</span>`:''}</li>`;
                  }).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Notas profesionales -->
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 class="text-sm font-bold text-amber-900 uppercase mb-2">${osIcon('lightbulb')} Notas constructivas</h3>
        <ul class="text-xs text-amber-950 space-y-1">
          <li>• <strong>Orden CPM:</strong> demo → estructural → rough-in → inspección → drywall → flooring → cabinets → countertops → tile → trim → paint → fixtures → appliances → cleaning</li>
          <li>• <strong>Inspección rough es obligatoria</strong> antes de cerrar paredes con drywall (city of ${estState.city}).</li>
          <li>• <strong>Countertops:</strong> después de instalar cabinets, hay que esperar template + fabricación (~1 semana) antes de instalar.</li>
          <li>• <strong>Tile baños:</strong> antes de vanity/toilet. Tile cocina (backsplash) después de countertops.</li>
          <li>• <strong>Flooring:</strong> tile baños primero, LVP/carpet último para no rayar.</li>
          <li>• <strong>Crew ≥ 4:</strong> exterior corre en paralelo con interior — ahorras ~${sched.parallelDaysSaved} días. Tu crew actual: ${estState.crewSize}.</li>
          <li>• <strong>Días laborales:</strong> ${estState.workDays}/semana. Domingos siempre excluidos (excepto modo 7d).</li>
          <li>• <strong>Para tu próxima casa:</strong> con crew de ${estState.crewSize} en ${estState.city}, una remodelación tipo "${EST_TIPOS[estState.tipo].nombre}" de ${estState.sqft} sqft toma ~${sched.calendarDays} días calendario.</li>
        </ul>
      </div>
    </div>
  `;
}

// ─── TAB: LÍDERES (performance por persona) ───
function estRenderLideres(body) {
  const valid = estState.cases.filter(c => c.lider && !c.is_atypical);
  const byLider = {};
  valid.forEach(c => { (byLider[c.lider] = byLider[c.lider] || []).push(c); });

  const rows = Object.entries(byLider).map(([name, arr]) => {
    const finalizadas = arr.filter(c => c.status === 'Finalizado');
    const totalInterno = arr.reduce((s,c) => s + (+c.internal_cost||0), 0);
    const totalGanancia = arr.reduce((s,c) => s + ((+c.sold_for||0) - (+c.internal_cost||0)), 0);
    const avgDev = arr.reduce((s,c) => s + (+c.deviation_pct||0), 0) / arr.length;
    const rojos = arr.filter(c => +c.deviation_pct > 10).length;
    const verdes = arr.filter(c => +c.deviation_pct < -5).length;
    const enPresup = arr.filter(c => Math.abs(+c.deviation_pct||0) <= 0.5).length;
    const score = (verdes * 2 + enPresup) - (rojos * 3);
    return { name, count: arr.length, finalizadas: finalizadas.length, totalInterno, totalGanancia, avgDev, rojos, verdes, enPresup, score, casas: arr };
  }).sort((a,b) => b.score - a.score);

  const max = Math.max(...rows.map(r => Math.abs(r.totalGanancia)), 1);
  const bar = (val, color='bg-emerald-600') => `<div class="w-full bg-slate-100 rounded h-2"><div class="${color} h-2 rounded" style="width:${Math.min(100, Math.abs(val)/max*100).toFixed(0)}%"></div></div>`;

  body.innerHTML = `
    <div class="space-y-4">
      <h2 class="text-lg font-bold">${osIcon('hard-hat')} Performance por líder de obra</h2>
      <p class="text-xs text-slate-500">Score = (verdes × 2 + en presupuesto) − (rojos × 3). Mayor score = mejor track record.</p>

      <div class="overflow-x-auto border border-slate-200 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr class="text-xs">
              <th class="text-left px-3 py-2 font-semibold">Líder</th>
              <th class="text-center px-2 py-2">Casas</th>
              <th class="text-center px-2 py-2">Finalizadas</th>
              <th class="text-center px-2 py-2 text-emerald-700">${kitStatusDot('ok')} Verdes</th>
              <th class="text-center px-2 py-2 text-green-700">⚪ En presup</th>
              <th class="text-center px-2 py-2 text-red-700">${kitStatusDot('bad')} Rojos</th>
              <th class="text-right px-2 py-2">Desv. avg</th>
              <th class="text-right px-2 py-2">Ganancia total</th>
              <th class="text-center px-2 py-2">Score</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr class="border-t border-slate-200 ${i===0?'bg-amber-50':''}">
                <td class="px-3 py-2 font-bold">${i===0?osIcon('trophy'):''}${r.name}</td>
                <td class="px-2 py-2 text-center">${r.count}</td>
                <td class="px-2 py-2 text-center text-slate-600">${r.finalizadas}</td>
                <td class="px-2 py-2 text-center text-emerald-700 font-bold">${r.verdes}</td>
                <td class="px-2 py-2 text-center text-green-700 font-bold">${r.enPresup}</td>
                <td class="px-2 py-2 text-center text-red-700 font-bold">${r.rojos}</td>
                <td class="px-2 py-2 text-right ${r.avgDev>5?'text-red-700':r.avgDev<-5?'text-emerald-700':'text-slate-700'} font-bold">${r.avgDev>0?'+':''}${(r.avgDev*100).toFixed(1)}%</td>
                <td class="px-2 py-2 text-right font-bold ${r.totalGanancia<0?'text-red-700':'text-emerald-700'}">${estFmt(r.totalGanancia)}</td>
                <td class="px-2 py-2 text-center text-lg font-bold ${r.score<0?'text-red-700':r.score>3?'text-emerald-700':'text-slate-700'}">${r.score>0?'+':''}${r.score}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        ${rows.map(r => `
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="flex justify-between items-baseline mb-2">
              <h3 class="font-bold">${r.name}</h3>
              <span class="text-xs text-slate-500">${r.count} casa(s)</span>
            </div>
            <div class="space-y-1.5 text-xs">
              ${r.casas.map(c => `
                <div class="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                  <span class="truncate flex-1">${c.address.substring(0,40)}</span>
                  <span class="ml-2 ${(+c.deviation_pct||0)>10?'text-red-700':(+c.deviation_pct||0)<-5?'text-emerald-700':'text-slate-600'} font-bold">${(+c.deviation_pct||0)>0?'+':''}${((+c.deviation_pct||0)*100).toFixed(1)}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── TAB: ESTIMADOR ───
function estRenderEstimador(body) {
  const e = estCalc();
  body.innerHTML = `
    <div class="grid lg:grid-cols-12 gap-5">
      <div class="lg:col-span-7 space-y-3">
        <!-- 1. SQFT + CIUDAD -->
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <div class="flex items-center gap-2 mb-2"><div class="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">1</div><h3 class="text-sm font-bold">Casa y ubicación</h3></div>
          <div class="grid grid-cols-3 gap-2 mb-2">
            <div class="col-span-1">
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Sqft</label>
              <input type="number" value="${estState.sqft}" onchange="estState.sqft=+this.value; estRenderTab()" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-lg font-bold" />
            </div>
            <div class="col-span-1">
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Ciudad</label>
              <input type="text" value="${estState.city}" oninput="estState.city=this.value" onchange="estLoadMarketCache().then(estRenderTab)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div class="col-span-1">
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Estado</label>
              <input type="text" value="${estState.state}" maxlength="2" oninput="estState.state=this.value.toUpperCase()" onchange="estLoadMarketCache().then(estRenderTab)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase" />
            </div>
          </div>
          <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <button onclick="estFetchMarketPrices(false)" ${estState.loadingMarket?'disabled':''} class="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded font-semibold">${osIcon('refresh')} Actualizar precios mercado</button>
            <button onclick="estFetchMarketPrices(true)" ${estState.loadingMarket?'disabled':''} class="text-xs text-slate-500 hover:text-slate-900" title="Forzar refresh ignorando cache">↻ Forzar</button>
            <span class="text-xs ${estState.marketStatus.includes(osIcon('alert'))?'text-red-600':estState.marketStatus.includes('✓')?'text-emerald-700':'text-slate-500'}">${estState.marketStatus || (Object.keys(estState.marketPrices).length>0?`✓ ${Object.keys(estState.marketPrices).length} precios en cache para ${estState.city}`:'Usando precios default Austin 2026')}</span>
          </div>
        </div>

        <!-- 2. TIPO -->
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <div class="flex items-center gap-2 mb-2"><div class="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">2</div><h3 class="text-sm font-bold">Tipo de remodelación</h3></div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            ${Object.entries(EST_TIPOS).map(([k,v]) => `
              <button onclick="estState.tipo='${k}'; estRenderTab()" class="p-2 rounded-lg text-left border ${estState.tipo===k?'border-slate-900 bg-slate-900 text-white':'border-slate-200 hover:border-slate-400'}">
                <div class="text-base mb-0.5">${v.icon}</div>
                <div class="text-xs font-bold">${v.nombre}</div>
                <div class="text-[10px] opacity-70">${v.hpsf} h/sqft</div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 3. TRABAJOS -->
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2"><div class="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">3</div><h3 class="text-sm font-bold">Trabajos (${Object.keys(EST_TRABAJOS).length})</h3></div>
            ${Object.keys(estState.trabajos).length ? `<button onclick="estState.trabajos={}; estRenderTab()" class="text-xs text-red-600">${osIcon('trash')} Limpiar (${Object.keys(estState.trabajos).length})</button>` : ''}
          </div>
          ${EST_CATEGORIAS.map(cat => {
            const tCat = Object.entries(EST_TRABAJOS).filter(([_,t])=>t.cat===cat);
            if (!tCat.length) return '';
            return `
              <div class="mb-3">
                <div class="text-[10px] uppercase font-bold text-slate-500 mb-1">${cat} (${tCat.length})</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  ${tCat.map(([k,t]) => {
                    const sel = !!estState.trabajos[k];
                    const cfg = estState.trabajos[k] || {};
                    const merc = EST_MERCADO.trabajos[k];
                    return `
                      <div>
                        <button onclick="estToggleTrabajo('${k}')" class="w-full text-left p-2 rounded-lg border ${sel?'border-green-500 bg-green-50':'border-slate-200 hover:border-slate-400'}">
                          <div class="flex items-start gap-1.5">
                            <span class="text-base">${sel?'✓':t.icon}</span>
                            <div class="flex-1 min-w-0">
                              <div class="text-xs font-bold ${sel?'text-green-800':'text-slate-800'}">${t.nombre}</div>
                              <div class="text-[10px] text-slate-500 truncate">${t.desc}</div>
                              ${merc ? `<div class="text-[10px] text-slate-400 mt-0.5">Merc: ${merc.perSqft?`$${merc.min}-${merc.max}/sqft`:`$${(merc.min/1000).toFixed(0)}-${(merc.max/1000).toFixed(0)}K`}</div>` : ''}
                            </div>
                          </div>
                        </button>
                        ${sel && t.mult ? `<div class="mt-1 ml-7 flex items-center gap-1 text-xs"><span class="text-slate-500">Cant:</span><button onclick="estSetCount('${k}',${cfg.count-1})" class="w-5 h-5 bg-slate-200 rounded">−</button><span class="font-bold w-5 text-center">${cfg.count||1}</span><button onclick="estSetCount('${k}',${(cfg.count||1)+1})" class="w-5 h-5 bg-slate-200 rounded">+</button></div>` : ''}
                        ${sel && t.customSqft ? `<div class="mt-1 ml-7 flex items-center gap-1 text-xs"><span class="text-slate-500">Sqft:</span><input type="number" value="${cfg.customSqft||''}" oninput="estSetSqft('${k}',+this.value)" class="w-20 border border-slate-300 rounded px-2 py-0.5 text-xs" /></div>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 4. PRESUPUESTO -->
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <div class="flex items-center gap-2 mb-2"><div class="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">4</div><h3 class="text-sm font-bold">Presupuesto cliente <span class="text-xs text-slate-400 font-normal">(opcional)</span></h3></div>
          <input type="number" value="${estState.presupuesto||''}" onchange="estState.presupuesto=+this.value; estRenderTab()" placeholder="Ej: 80000" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        <!-- AVANZADO -->
        <div class="bg-white rounded-xl border border-slate-200">
          <button onclick="estState.showAvanzado=!estState.showAvanzado; estRenderTab()" class="w-full p-3 flex justify-between items-center text-sm text-slate-600">
            <span>${osIcon('settings')} Ajustes avanzados</span><span>${estState.showAvanzado?'▲':'▼'}</span>
          </button>
          ${estState.showAvanzado ? `
            <div class="p-3 pt-0 space-y-3 border-t border-slate-100">
              <div>
                <div class="flex justify-between text-xs mb-1"><span class="font-bold text-green-700">Margen</span><span class="font-bold">${estState.marginPct}%</span></div>
                <input type="range" min="0" max="80" step="5" value="${estState.marginPct}" onchange="estState.marginPct=+this.value; estRenderTab()" class="w-full accent-green-600" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div><label class="text-xs text-slate-500 block mb-0.5">Tarifa $/h</label><input type="number" step="0.01" value="${estState.hourlyRate}" onchange="estState.hourlyRate=+this.value; estRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
                <div><label class="text-xs text-slate-500 block mb-0.5">Buffer %</label><input type="number" value="${estState.bufferPct}" onchange="estState.bufferPct=+this.value; estRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- RESULTADO -->
      <div class="lg:col-span-5 space-y-3">
        ${!e.hasJobs ? `<div class="bg-slate-50 rounded-xl p-8 border border-slate-200 text-center"><div class="text-4xl mb-2">${osIcon('hammer')}</div><p class="text-sm text-slate-500">Selecciona trabajos</p></div>` : `
          ${e.estado ? `
            <div class="rounded-xl p-4 border-2 ${e.estado.color==='red'?'bg-red-50 border-red-300':e.estado.color==='amber'?'bg-amber-50 border-amber-300':e.estado.color==='green'?'bg-green-50 border-green-300':'bg-emerald-50 border-emerald-300'}">
              <div class="text-xs font-bold uppercase mb-1 ${e.estado.color==='red'?'text-red-700':e.estado.color==='amber'?'text-amber-700':e.estado.color==='green'?'text-green-700':'text-emerald-700'}">${e.estado.label}</div>
              <div class="text-2xl font-bold ${e.estado.color==='red'?'text-red-700':e.estado.color==='amber'?'text-amber-700':e.estado.color==='green'?'text-green-700':'text-emerald-700'}">${e.devVsPres>0?'+':''}${e.devVsPres.toFixed(2)}%</div>
              <div class="text-xs text-slate-600 mt-0.5">${estFmt(e.costoInterno)} vs ${estFmt(estState.presupuesto)}</div>
            </div>
          ` : ''}

          <div class="rounded-xl p-4 border-2 ${e.alerta==='red'?'bg-red-50 border-red-300':e.alerta==='amber'?'bg-amber-50 border-amber-300':'bg-emerald-50 border-emerald-300'}">
            <div class="text-xs font-bold uppercase mb-1 ${e.alerta==='red'?'text-red-700':e.alerta==='amber'?'text-amber-700':'text-emerald-700'}">${e.alertaTxt}</div>
            <div class="text-2xl font-bold ${e.alerta==='red'?'text-red-700':e.alerta==='amber'?'text-amber-700':'text-emerald-700'}">${e.margenReal.toFixed(1)}% margen</div>
          </div>

          <div class="bg-slate-900 text-white rounded-xl p-5">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">${osIcon('target')} Precio Recomendado</div>
            <div class="text-3xl font-bold text-amber-400">${estFmt(e.precioRec)}</div>
            <div class="text-xs text-slate-400 mt-1">$${(e.precioRec/estState.sqft).toFixed(0)}/sqft · margen ${e.margenRec.toFixed(1)}%</div>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div class="bg-emerald-50 rounded-lg p-2 border border-emerald-200"><div class="text-[10px] text-emerald-700 font-bold uppercase">Tu precio</div><div class="text-base font-bold text-emerald-700">${estFmt(e.precioRP)}</div><div class="text-[10px] text-slate-500">+${estState.marginPct}%</div></div>
            <div class="bg-blue-50 rounded-lg p-2 border border-blue-200"><div class="text-[10px] text-blue-700 font-bold uppercase">Mercado</div><div class="text-base font-bold text-blue-700">${estFmt(e.precioMercado)}</div><div class="text-[10px] text-slate-500">Austin típ.</div></div>
            <div class="bg-amber-50 rounded-lg p-2 border-2 border-amber-300"><div class="text-[10px] text-amber-700 font-bold uppercase">Híbrido</div><div class="text-base font-bold text-amber-700">${estFmt(e.precioRec)}</div></div>
          </div>

          <button onclick="estExportLRC()" class="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold">${osIcon('chart')} Exportar CSV LRC</button>

          <div class="bg-white rounded-lg p-3 border border-slate-200">
            <div class="text-xs text-slate-500 uppercase font-bold mb-2">Costo interno</div>
            <table class="w-full text-xs">
              <tbody>
                <tr class="border-b border-slate-100"><td class="py-1 text-slate-600">Materiales</td><td class="py-1 text-right">${estFmt(e.totalMat)}</td></tr>
                <tr class="border-b border-slate-100"><td class="py-1 text-slate-600">Labor (${Math.round(e.totalHours)}h)</td><td class="py-1 text-right">${estFmt(e.totalLabor)}</td></tr>
                <tr class="border-b border-slate-100"><td class="py-1 text-slate-500 pl-3">+ Overhead (12%)</td><td class="py-1 text-right text-slate-500">${estFmt(e.overhead)}</td></tr>
                <tr class="border-b border-slate-100"><td class="py-1 text-slate-500 pl-3">+ Buffer (${estState.bufferPct}%)</td><td class="py-1 text-right text-slate-500">${estFmt(e.buffer)}</td></tr>
                <tr><td class="py-1.5 font-bold">= COSTO INTERNO</td><td class="py-1.5 text-right font-bold">${estFmt(e.costoInterno)}</td></tr>
              </tbody>
            </table>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="bg-slate-50 rounded p-2"><div class="text-slate-500">Horas</div><div class="font-bold">${Math.round(e.totalHours)}h</div></div>
            <div class="bg-slate-50 rounded p-2"><div class="text-slate-500">Días obra</div><div class="font-bold">${Math.round(e.days)}</div></div>
            <div class="bg-slate-50 rounded p-2"><div class="text-slate-500">h/sqft</div><div class="font-bold">${(e.totalHours/e.sqftEf).toFixed(2)}</div></div>
          </div>

          ${(()=>{ const sch = estGenerateSchedule(); if (!sch) return ''; return `
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
            <div class="flex justify-between items-baseline mb-1">
              <div class="text-xs font-bold text-blue-900 uppercase">${osIcon('calendar')} Cronograma</div>
              <button onclick="estSetTab('cronograma')" class="text-[10px] text-blue-700 hover:underline">Ver detalle →</button>
            </div>
            <div class="text-2xl font-bold text-blue-900">${sch.calendarDays} días</div>
            <div class="text-xs text-blue-700">~${sch.weeks} semanas · crew ${sch.crew} · ${sch.timeline.length} fases</div>
            <div class="text-[10px] text-slate-500 mt-1">${estFmtDate(sch.start)} → ${estFmtDate(sch.finalEnd)}</div>
          </div>
          `; })()}

          ${aiBoxHtml('estimator', 'Validar costos con mercado real', 'Claude busca pricing por categoría, supply chain, permits, hidden costs, labor market en tu ciudad', 'estRunAI')}
        `}
      </div>
    </div>
  `;
}

function estToggleTrabajo(k) {
  if (estState.trabajos[k]) delete estState.trabajos[k];
  else estState.trabajos[k] = { count: 1, customSqft: 0 };
  estRenderTab();
}
function estSetCount(k, c) {
  if (c <= 0) delete estState.trabajos[k];
  else estState.trabajos[k] = { ...estState.trabajos[k], count: c };
  estRenderTab();
}
function estSetSqft(k, s) {
  estState.trabajos[k] = { ...estState.trabajos[k], customSqft: s };
  estRenderTab();
}

// ─── TAB: LRC ───
function estRenderLRC(body) {
  const e = estCalc();
  if (!e.hasJobs) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">Ingresa trabajos en el tab Estimador primero.</div>`;
    return;
  }
  const renderLines = (lineas) => lineas.map(l => {
    const item = e.lrcMap[l];
    return `<tr class="border-b border-slate-100 ${!item?'opacity-40':''}">
      <td class="py-1.5 px-2">${l}</td>
      <td class="py-1.5 px-2 text-right font-bold ${item?'text-slate-900':'text-slate-400'}">${item?estFmt(item.total):'—'}</td>
      <td class="py-1.5 px-3 text-[10px] text-slate-500">${item?item.sources.join(' + '):''}</td>
    </tr>`;
  }).join('');

  body.innerHTML = `
    <div class="space-y-4">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h3 class="font-bold text-blue-900 text-sm mb-2">PROPERTY INFORMATION</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><span class="text-slate-500">Construction Budget:</span> <span class="font-bold text-slate-900">${estFmt(e.costoInterno)}</span></div>
          <div><span class="text-slate-500">Timeframe:</span> <span class="font-bold">${Math.round(e.days)} días</span></div>
          <div><span class="text-slate-500">Sqft:</span> <span class="font-bold">${e.sqftEf}</span></div>
          <div><span class="text-slate-500">GC:</span> <span class="font-bold">Rental Profitss</span></div>
        </div>
      </div>

      <button onclick="estExportLRC()" class="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-bold">⬇️ Descargar CSV LRC</button>

      <div class="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 uppercase rounded">SOFT COST</div>
      <table class="w-full text-xs"><tbody>${EST_LRC.softCost.map(s => `<tr class="border-b border-slate-100 opacity-50"><td class="py-1.5 px-2">${s}</td><td class="py-1.5 px-2 text-right text-slate-400">$0</td><td class="py-1.5 px-3 text-[10px] text-slate-400">No incluido</td></tr>`).join('')}</tbody></table>

      <div class="bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 uppercase rounded">HARD COST · Estructura + Exterior + Sistemas</div>
      <table class="w-full text-xs"><tbody>${renderLines(EST_LRC.hardCost1)}</tbody></table>

      <div class="bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 uppercase rounded">HARD COST · Interior + Cocina + Baños</div>
      <table class="w-full text-xs"><tbody>${renderLines(EST_LRC.hardCost2)}</tbody></table>

      <div class="bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 uppercase rounded">HARD COST · Exterior Final + Limpieza</div>
      <table class="w-full text-xs"><tbody>${renderLines(EST_LRC.hardCost3)}</tbody></table>

      <div class="bg-slate-900 text-white px-4 py-3 rounded flex justify-between items-center">
        <span class="font-bold text-sm">GRAND TOTAL</span><span class="text-2xl font-bold">${estFmt(e.costoInterno)}</span>
      </div>

      <div class="bg-white rounded-lg p-4 border border-slate-200">
        <h4 class="font-bold text-sm mb-2">Distribución Material / Labor por trabajo</h4>
        <table class="w-full text-xs">
          <thead><tr class="text-slate-500 border-b border-slate-200"><th class="text-left py-1.5">Trabajo</th><th class="text-right py-1.5">Total</th><th class="text-right py-1.5">Material</th><th class="text-right py-1.5">Labor</th><th class="text-right py-1.5">% M/L</th></tr></thead>
          <tbody>${e.desglose.map(d => `
            <tr class="border-b border-slate-100">
              <td class="py-1.5">${d.nombre}${d.count>1?` ×${d.count}`:''}</td>
              <td class="py-1.5 text-right font-bold">${estFmt(d.total)}</td>
              <td class="py-1.5 text-right text-blue-600">${estFmt(d.matInd)}</td>
              <td class="py-1.5 text-right text-purple-600">${estFmt(d.laborInd)}</td>
              <td class="py-1.5 text-right text-slate-500">${Math.round(d.matPct*100)}/${Math.round((1-d.matPct)*100)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}

function estExportLRC() {
  const e = estCalc();
  if (!e.hasJobs) return alert('Sin trabajos para exportar');
  const lines = [];
  lines.push('BUDGET FOR A NEW CONSTRUCTION PROJECT', '');
  lines.push('PROPERTY INFORMATION - 1ST PART');
  lines.push('Item,Amount,Description');
  lines.push(`Construction Budget,${e.costoInterno.toFixed(2)},${estState.propertyInfo.address}`);
  lines.push(`Estimated Completion Timeframe,${Math.round(e.days)} days,`);
  lines.push(`Final Square Footage,${e.sqftEf},`);
  lines.push(`Will you be using a General Contractor,Yes,`);
  lines.push('', `General Contractor Name,Email,Phone`);
  lines.push(`${estState.propertyInfo.contractor},${estState.propertyInfo.email},${estState.propertyInfo.phone}`, '');
  lines.push('BUDGET - 2ND PART', 'Item,Description,Total Cost,Subdescription', '');
  lines.push('SOFT COST');
  EST_LRC.softCost.forEach(s => lines.push(`,${s},$0,`));
  lines.push('', 'HARD COST');
  [...EST_LRC.hardCost1, ...EST_LRC.hardCost2, ...EST_LRC.hardCost3].forEach(l => {
    const item = e.lrcMap[l];
    lines.push(item ? `,${l},$${Math.round(item.total).toLocaleString('en-US')},${item.sources.join(' + ')}` : `,${l},,`);
  });
  lines.push('', `GRAND TOTAL,,$${Math.round(e.costoInterno).toLocaleString('en-US')},`);
  const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `LRC_Budget_${estState.propertyInfo.address || 'Property'}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── TAB: COMPARADOR ───
function estRenderComparador(body) {
  if (!estState.sqft) { body.innerHTML = '<p class="text-slate-500">Ingresa sqft en el tab Estimador.</p>'; return; }
  const valid = estState.cases.filter(c => !c.is_atypical);
  const sim = valid.map(c => ({ ...c, diff: Math.abs(c.sqft - estState.sqft) })).sort((a,b) => a.diff - b.diff).slice(0,3);
  body.innerHTML = `
    <h3 class="font-bold mb-3">${osIcon('search')} Casas similares a ${estState.sqft} sqft</h3>
    <div class="grid md:grid-cols-3 gap-3">
      ${sim.map((c,i) => {
        const ppsf = c.internal_cost / c.sqft;
        const est = estGetEstado(c.deviation_pct);
        return `
          <div class="${i===0?'bg-amber-50 border-amber-300':'bg-white border-slate-200'} rounded-xl p-4 border">
            <div class="flex justify-between mb-2"><div class="text-xs text-slate-500">#${i+1}</div>${i===0?'<span class="text-xs text-amber-700 font-bold">MEJOR MATCH</span>':''}</div>
            <div class="font-bold text-sm mb-1">${c.address}</div>
            <div class="text-xs text-slate-500 mb-2">${c.sqft} sqft · ${c.contractor||'—'}</div>
            <div class="space-y-1 text-xs">
              <div class="flex justify-between"><span class="text-slate-500">Materiales:</span><span class="text-blue-700">${estFmt(c.materials)}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Labor:</span><span class="text-purple-700">${estFmt(c.labor)}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Horas:</span><span>${c.hours||0}h</span></div>
              <div class="flex justify-between font-bold pt-1 border-t border-slate-200"><span>Interno:</span><span>${estFmt(c.internal_cost)}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">$/sqft:</span><span class="text-emerald-700">$${ppsf.toFixed(0)}</span></div>
            </div>
            <div class="mt-2 text-[10px] font-bold p-1.5 rounded ${est.color==='red'?'bg-red-100 text-red-700':est.color==='amber'?'bg-amber-100 text-amber-700':est.color==='green'?'bg-green-100 text-green-700':'bg-emerald-100 text-emerald-700'}">${est.label} (${c.deviation_pct>0?'+':''}${(c.deviation_pct||0).toFixed(1)}%)</div>
            ${c.is_calibrator?'<div class="mt-1 text-xs text-purple-700 font-bold">' + osIcon('star') + ' CALIBRADOR</div>':''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─── TAB: MERCADO ───
function estRenderMercado(body) {
  const fresh = Object.keys(estState.marketPrices).length;
  const rows = Object.entries(EST_TRABAJOS).map(([k, t]) => {
    const live = estState.marketPrices[k];
    const def = EST_MERCADO.trabajos[k];
    if (!live && !def) return null;
    const min = live ? +live.price_min : def.min;
    const typ = live ? +live.price_typical : def.typical;
    const max = live ? +live.price_max : def.max;
    const isPerSqft = live ? live.unit === 'per_sqft' : def.perSqft;
    const days = live ? estFreshness(k) : null;
    return { k, nombre: t.nombre, cat: t.cat, min, typ, max, isPerSqft, source: live?'live':'default', sourceSummary: live?.source_summary, days };
  }).filter(Boolean);

  body.innerHTML = `
    <div class="flex items-start justify-between mb-3">
      <div>
        <h2 class="text-lg font-bold">${osIcon('scale')} Mercado ${estState.city}, ${estState.state}</h2>
        <p class="text-xs text-slate-500">Precios incluyen margen GC 25%. Costo equivalente = Precio ÷ 1.25</p>
        <p class="text-xs text-slate-500 mt-1">${fresh} precios actualizados de internet · resto usa benchmark default Austin 2026</p>
      </div>
      <div class="text-right">
        <button onclick="estFetchMarketPrices(false)" ${estState.loadingMarket?'disabled':''} class="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded font-semibold">${osIcon('refresh')} Actualizar trabajos seleccionados</button>
        <div class="text-[10px] text-slate-400 mt-1">Cache 30 días</div>
      </div>
    </div>
    ${estState.marketStatus ? `<div class="text-xs ${estState.marketStatus.includes(osIcon('alert'))?'bg-red-50 text-red-700':estState.marketStatus.includes('✓')?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'} p-2 rounded mb-3">${estState.marketStatus}</div>` : ''}
    <div class="overflow-x-auto border border-slate-200 rounded-lg">
      <table class="w-full text-xs">
        <thead class="bg-slate-50"><tr><th class="text-left py-2 px-2">Trabajo</th><th class="text-left py-2 px-2">Categoría</th><th class="text-right py-2 px-2">Min</th><th class="text-right py-2 px-2">Típico</th><th class="text-right py-2 px-2">Max</th><th class="text-right py-2 px-2">Costo equiv</th><th class="text-center py-2 px-2">Fuente</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr class="border-t border-slate-100 ${r.source==='live'?'bg-emerald-50/50':''}">
              <td class="py-1.5 px-2 font-medium">${r.nombre}</td>
              <td class="py-1.5 px-2 text-slate-500">${r.cat}</td>
              <td class="py-1.5 px-2 text-right text-slate-500">${r.isPerSqft?`$${r.min}/sqft`:estFmt(r.min)}</td>
              <td class="py-1.5 px-2 text-right font-bold text-amber-700">${r.isPerSqft?`$${r.typ}/sqft`:estFmt(r.typ)}</td>
              <td class="py-1.5 px-2 text-right text-slate-500">${r.isPerSqft?`$${r.max}/sqft`:estFmt(r.max)}</td>
              <td class="py-1.5 px-2 text-right text-blue-700">${r.isPerSqft?`$${(r.typ/1.25).toFixed(1)}/sqft`:estFmt(r.typ/1.25)}</td>
              <td class="py-1.5 px-2 text-center text-[10px]">
                ${r.source==='live'
                  ? `<span class="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold" title="${r.sourceSummary || ''}">live ${r.days!==null?`(${r.days}d)`:''}</span>`
                  : `<span class="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">default</span>`}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── TAB: CALIBRADORES ───
function estRenderCalibradores(body) {
  body.innerHTML = `
    <h2 class="text-lg font-bold mb-2">${osIcon('trophy')} Pool de 5 calibradores</h2>
    <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
      ${Object.values(EST_CALIBRADORES).map(c => `
        <div class="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <div class="text-xs text-amber-800 font-bold">${c.code}</div>
          <div class="text-xs text-slate-500">${c.sqft} sqft · ${c.hours}h</div>
          <div class="text-sm font-bold">${estFmtK(c.internalTotal)}</div>
          <div class="text-xs text-emerald-700">$${(c.internalTotal/c.sqft).toFixed(0)}/sqft</div>
        </div>
      `).join('')}
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
      <div><div class="text-xs text-slate-500">Pool $/sqft</div><div class="text-xl font-bold text-amber-700">$${EST_POOL.internalPerSqft.toFixed(0)}</div></div>
      <div><div class="text-xs text-slate-500">h/sqft promedio</div><div class="text-xl font-bold">${EST_POOL.hoursPerSqft.toFixed(2)}</div></div>
      <div><div class="text-xs text-slate-500">Tarifa</div><div class="text-xl font-bold text-purple-700">$${EST_POOL.hourlyRate.toFixed(2)}/h</div></div>
      <div><div class="text-xs text-slate-500">Total casas</div><div class="text-xl font-bold">${Object.keys(EST_CALIBRADORES).length}</div></div>
    </div>
  `;
}

// ─── TAB: HISTÓRICO ───
function estRenderHistorico(body) {
  body.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-lg font-bold">${osIcon('trending-up')} Histórico (${estState.cases.length} casas validadas)</h2>
      <button onclick="estShowAddCase()" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-semibold">+ Agregar</button>
    </div>
    <div class="overflow-x-auto border border-slate-200 rounded-lg">
      <table class="w-full text-xs">
        <thead class="bg-slate-50"><tr><th class="text-left py-2 px-2">Casa</th><th class="text-left py-2 px-2">Ciudad</th><th class="text-left py-2 px-2">Líder</th><th class="text-left py-2 px-2">Status</th><th class="text-right py-2 px-2">Sqft</th><th class="text-right py-2 px-2">Interno</th><th class="text-right py-2 px-2">$/sqft</th><th class="text-right py-2 px-2">Presup</th><th class="text-right py-2 px-2">Vendida</th><th class="text-right py-2 px-2">Desv %</th><th class="text-right py-2 px-2">Ganancia</th><th></th></tr></thead>
        <tbody>
          ${estState.cases.map(d => {
            const ppsf = d.sqft ? d.internal_cost / d.sqft : 0;
            const dev = +d.deviation_pct || 0;
            const devShown = dev * (Math.abs(dev) < 1 ? 100 : 1); // si viene como 0.05 lo paso a 5; si ya es 5 lo dejo
            const est = estGetEstado(devShown);
            const ganancia = (+d.sold_for||0) - (+d.internal_cost||0);
            return `<tr class="border-t border-slate-200 ${d.is_calibrator?'bg-purple-50':''} ${d.is_atypical?'opacity-60':''}">
              <td class="py-1.5 px-2 text-slate-800">${d.address}${d.is_calibrator?' <span class="text-purple-700 text-[10px] font-bold">CAL</span>':''}</td>
              <td class="py-1.5 px-2 text-slate-600">${d.city||'—'}</td>
              <td class="py-1.5 px-2 text-slate-600">${d.lider||'—'}</td>
              <td class="py-1.5 px-2"><span class="text-[10px] px-1.5 py-0.5 rounded ${d.status==='En construcción'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}">${d.status||'—'}</span></td>
              <td class="py-1.5 px-2 text-right">${d.sqft||'—'}</td>
              <td class="py-1.5 px-2 text-right font-bold">${estFmt(d.internal_cost)}</td>
              <td class="py-1.5 px-2 text-right text-emerald-700">${ppsf?'$'+ppsf.toFixed(0):'—'}</td>
              <td class="py-1.5 px-2 text-right text-slate-500">${d.budget?estFmtK(d.budget):'—'}</td>
              <td class="py-1.5 px-2 text-right">${d.sold_for?estFmtK(d.sold_for):'—'}</td>
              <td class="py-1.5 px-2 text-right font-bold ${est.color==='red'?'text-red-700':est.color==='amber'?'text-amber-700':est.color==='green'?'text-green-700':'text-emerald-700'}">${devShown>0?'+':''}${devShown.toFixed(1)}%</td>
              <td class="py-1.5 px-2 text-right font-bold ${ganancia<0?'text-red-700':'text-emerald-700'}">${estFmt(ganancia)}</td>
              <td class="py-1.5 px-2 text-right">${!d.is_seed ? `<button onclick="estDeleteCase('${d.id}')" class="text-red-600 hover:text-red-800">${osIcon('trash')}</button>` : ''}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function estShowAddCase() {
  const html = `
    <div class="space-y-3">
      <div><label class="text-xs font-medium text-slate-700">Dirección *</label><input id="ac-address" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-xs font-medium text-slate-700">Sqft *</label><input type="number" id="ac-sqft" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
        <div><label class="text-xs font-medium text-slate-700">Año</label><input type="number" id="ac-year" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
      </div>
      <div><label class="text-xs font-medium text-slate-700">Contractor</label><input id="ac-contractor" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-xs font-medium text-slate-700">Materiales $</label><input type="number" id="ac-mat" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
        <div><label class="text-xs font-medium text-slate-700">Horas</label><input type="number" id="ac-hours" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-xs font-medium text-slate-700">Presupuesto $</label><input type="number" id="ac-budget" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
        <div><label class="text-xs font-medium text-slate-700">Vendida $</label><input type="number" id="ac-sold" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
      </div>
      <div class="flex gap-2 pt-2">
        <button onclick="estCancelAdd()" class="flex-1 px-4 py-2 bg-slate-100 rounded">Cancelar</button>
        <button onclick="estSaveCase()" class="flex-1 px-4 py-2 bg-slate-900 text-white rounded font-semibold">Guardar</button>
      </div>
    </div>
  `;
  // Modal anidado simple — guardamos contenido actual
  const prev = document.getElementById('modal-body').innerHTML;
  const prevTitle = document.getElementById('modal-title').textContent;
  document.getElementById('modal-title').textContent = '+ Agregar caso';
  document.getElementById('modal-body').innerHTML = html;
  window._estPrev = { body: prev, title: prevTitle };
}
function estCancelAdd() {
  document.getElementById('modal-title').textContent = window._estPrev.title;
  document.getElementById('modal-body').innerHTML = window._estPrev.body;
  estRender();
}
async function estSaveCase() {
  const address = document.getElementById('ac-address').value.trim();
  const sqft = +document.getElementById('ac-sqft').value;
  if (!address || sqft <= 0) return alert('Dirección y sqft requeridos');
  const materials = +document.getElementById('ac-mat').value || 0;
  const hours = +document.getElementById('ac-hours').value || 0;
  const labor = hours * estState.hourlyRate;
  const internal_cost = (materials + labor) * 1.05;
  const budget = +document.getElementById('ac-budget').value || 0;
  const sold_for = +document.getElementById('ac-sold').value || 0;
  const deviation_pct = budget > 0 ? ((internal_cost - budget) / budget) * 100 : 0;
  await estAddCase({
    address, sqft, year_built: +document.getElementById('ac-year').value || null,
    contractor: document.getElementById('ac-contractor').value || null,
    materials, labor, hours, internal_cost, budget, sold_for, deviation_pct,
    is_seed: false, is_atypical: false, is_calibrator: false, validated: true
  });
  estCancelAdd();
}
