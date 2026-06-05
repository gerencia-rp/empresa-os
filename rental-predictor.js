// ============================================================
// PREDICTOR DE CASHFLOW DE RENTAS — Rental Profitss
// Vanilla JS · Supabase · 4 modelos de negocio
// ============================================================

// ─── MODELOS DE NEGOCIO (defaults calibrados con data real Austin TX mayo 2026) ───
const RP_MODELS = {
  long_term: {
    nombre: 'Long-Term Rental',
    icon: '🏠',
    desc: 'Renta tradicional 12+ meses. Mkt: $2,400/3BR Austin',
    rentDefault: 2400,        // 3BR Austin promedio Zillow/RentCafe 2026
    utilities: 0,
    vacancyDefault: 8,        // Austin Q1 2026 vacancy alto 13.5%, conservar 8% para 2027 cuando estabilice
    mgmtDefault: 9,           // Texas 8-12%, midpoint
    platformDefault: 0,
    cleaningDefault: 0,
    nightlyDefault: null,
    occupancyDefault: null
  },
  by_room: {
    nombre: 'Renta por Habitación',
    icon: '🛏️',
    desc: 'PadSplit / Roommates. Mkt: $680-758/hab Austin',
    rentDefault: 720,         // PadSplit Austin $680-758
    utilities: 450,           // todo incluido (luz, agua, wifi, gas)
    vacancyDefault: 10,
    mgmtDefault: 10,
    platformDefault: 0,
    cleaningDefault: 120,     // common areas semanal
    nightlyDefault: null,
    occupancyDefault: null
  },
  mid_term: {
    nombre: 'Mid-Term (Furnished Finder)',
    icon: '🗓️',
    desc: 'Travel nurses 13 sem. Mkt: $1,200-2,500/mes Austin',
    rentDefault: 2200,        // Furnished Finder Austin avg, mid de rango
    utilities: 380,           // incluido en renta típicamente
    vacancyDefault: 18,       // gaps entre contracts 13-sem
    mgmtDefault: 12,
    platformDefault: 0,       // Furnished Finder no cobra fee al host
    cleaningDefault: 180,     // entre contratos
    nightlyDefault: null,
    occupancyDefault: null
  },
  short_term: {
    nombre: 'Short-Term (Airbnb)',
    icon: '✈️',
    desc: 'Airbnb / VRBO. Mkt Austin: ADR $263, ocupación 50%',
    rentDefault: 0,           // se calcula con nightly * occupancy * 30
    utilities: 550,           // electricidad alta por turnover
    vacancyDefault: 0,        // ya capturado en occupancy
    mgmtDefault: 30,          // STR mgmt 25-40%, midpoint
    platformDefault: 14,      // Airbnb host fee 14% típico
    cleaningDefault: 0,       // cleaning lo paga huésped (guest fee), no host
    nightlyDefault: 230,      // ADR Austin 2026 conservador (mkt $263-288)
    occupancyDefault: 50      // Austin 2026: 41-55% según fuente
  }
};

// ─── COUNTIES TEXAS con property tax % real 2026 ───
const RP_COUNTIES = {
  Travis:     { pct: 2.05, label: 'Travis (Austin, $2.07/$100)' },
  Williamson: { pct: 1.85, label: 'Williamson (Round Rock, $1.85/$100)' },
  Hays:       { pct: 1.90, label: 'Hays (San Marcos)' },
  Bastrop:    { pct: 1.75, label: 'Bastrop' },
  Caldwell:   { pct: 1.80, label: 'Caldwell' },
  Falls:      { pct: 1.60, label: 'Falls (Marlin)' },
  Other:      { pct: 2.00, label: 'Otro condado (default 2.0%)' }
};

// ─── ESTADO ───
const rpState = {
  sys: null,
  tab: 'estimador',
  predictions: [],
  properties: [],
  propertyId: null,
  simpleMode: true,
  currentId: null,
  aiAnalysis: null,
  aiLoading: false,
  aiError: null,
  // Inputs (espejo de current)
  name: '',
  property_address: '',
  model: 'long_term',
  bedrooms: 3,
  bathrooms: 2,
  arv: 320000,
  mortgage_monthly: 2100,
  monthly_rent: 2200,
  rent_per_room: 800,
  occupied_rooms: 3,
  nightly_rate: 230,
  occupancy_pct: 50,
  county: 'Travis',
  property_tax_pct: 2.05,
  insurance_monthly: 180,
  hoa_monthly: 0,
  vacancy_pct: 8,
  maintenance_pct: 5, // BRRRR recién remodelado, ahorra primeros años
  capex_pct: 5,
  property_mgmt_pct: 0,
  platform_pct: 0,
  utilities_monthly: 0,
  cleaning_monthly: 0,
  other_monthly: 0,
  cash_invested: 60000,
  notes: ''
};

// ─── HELPERS ───
const rpFmt = n => '$' + Math.round(n || 0).toLocaleString('en-US');
const rpFmt2 = n => '$' + (n || 0).toFixed(2);

function rpResetToModel(modelKey) {
  const m = RP_MODELS[modelKey];
  rpState.model = modelKey;
  rpState.utilities_monthly = m.utilities;
  rpState.vacancy_pct = m.vacancyDefault;
  rpState.property_mgmt_pct = m.mgmtDefault;
  rpState.platform_pct = m.platformDefault;
  rpState.cleaning_monthly = m.cleaningDefault;
  if (modelKey === 'by_room') {
    rpState.rent_per_room = m.rentDefault;
    rpState.occupied_rooms = rpState.bedrooms;
  } else if (modelKey === 'short_term') {
    rpState.nightly_rate = m.nightlyDefault;
    rpState.occupancy_pct = m.occupancyDefault;
  } else {
    rpState.monthly_rent = m.rentDefault;
  }
}

// Stress test: recalcula con escenarios pesimista/realista/optimista
function rpStressTest() {
  const base = rpCalc();
  const snap = { ...rpState };
  // Pesimista: vacancy +5pts, renta -10%, maintenance +3pts
  rpState.vacancy_pct = snap.vacancy_pct + 5;
  if (rpState.model === 'short_term') rpState.occupancy_pct = Math.max(20, snap.occupancy_pct - 15);
  else if (rpState.model === 'by_room') rpState.occupied_rooms = Math.max(1, snap.occupied_rooms - 1);
  else rpState.monthly_rent = snap.monthly_rent * 0.90;
  rpState.maintenance_pct = snap.maintenance_pct + 3;
  const pessim = rpCalc();
  // Restaurar
  Object.assign(rpState, snap);
  // Optimista: vacancy -3pts, renta +5%
  rpState.vacancy_pct = Math.max(0, snap.vacancy_pct - 3);
  if (rpState.model === 'short_term') rpState.occupancy_pct = Math.min(95, snap.occupancy_pct + 10);
  else rpState.monthly_rent = snap.monthly_rent * 1.05;
  const optim = rpCalc();
  Object.assign(rpState, snap);
  return { pessim, realist: base, optim };
}

// ─── CÁLCULO ───
function rpCalc() {
  // Renta bruta por modelo
  let grossRent = 0;
  if (rpState.model === 'by_room') {
    grossRent = (+rpState.rent_per_room || 0) * (+rpState.occupied_rooms || 0);
  } else if (rpState.model === 'short_term') {
    grossRent = (+rpState.nightly_rate || 0) * 30 * ((+rpState.occupancy_pct || 0) / 100);
  } else {
    grossRent = +rpState.monthly_rent || 0;
  }

  // Gastos
  const propertyTax = (+rpState.arv || 0) * ((+rpState.property_tax_pct || 0) / 100) / 12;
  const vacancy = grossRent * ((+rpState.vacancy_pct || 0) / 100);
  const maintenance = grossRent * ((+rpState.maintenance_pct || 0) / 100);
  const capex = grossRent * ((+rpState.capex_pct || 0) / 100);
  const mgmt = grossRent * ((+rpState.property_mgmt_pct || 0) / 100);
  const platform = grossRent * ((+rpState.platform_pct || 0) / 100);

  const fixedExpenses =
    (+rpState.mortgage_monthly || 0) +
    propertyTax +
    (+rpState.insurance_monthly || 0) +
    (+rpState.hoa_monthly || 0) +
    (+rpState.utilities_monthly || 0) +
    (+rpState.cleaning_monthly || 0) +
    (+rpState.other_monthly || 0);

  const variableExpenses = vacancy + maintenance + capex + mgmt + platform;
  const totalExpenses = fixedExpenses + variableExpenses;
  const netCashflow = grossRent - totalExpenses;

  // Returns
  const annualCashflow = netCashflow * 12;
  const cocReturn = rpState.cash_invested > 0 ? (annualCashflow / rpState.cash_invested) * 100 : null;
  // CORRECCIÓN NEGOCIO: cap rate estándar = NOI / Price con NOI SIN debt service
  // y SIN capex reserve. Incluir capex bajaba el cap rate ~5% artificial y hacía
  // que propiedades reales aparecieran como malas. Mantenemos capex en netCashflow.
  const annualNOI = (grossRent - vacancy - maintenance - mgmt - platform - propertyTax - (+rpState.insurance_monthly||0) - (+rpState.hoa_monthly||0) - (+rpState.utilities_monthly||0) - (+rpState.cleaning_monthly||0) - (+rpState.other_monthly||0)) * 12;
  const capRate = rpState.arv > 0 ? (annualNOI / rpState.arv) * 100 : null;

  return {
    grossRent, propertyTax, vacancy, maintenance, capex, mgmt, platform,
    fixedExpenses, variableExpenses, totalExpenses, netCashflow,
    annualCashflow, cocReturn, capRate, annualNOI
  };
}

// ─── DB ───
async function rpLoadPredictions() {
  const { data } = await sb.from('rental_predictions').select('*').order('updated_at', { ascending: false });
  rpState.predictions = data || [];
}

async function rpLoadProperties() {
  await loadProperties();
  rpState.properties = window.propertiesCache;
}

function rpLoadFromProperty(prop) {
  if (!prop) {
    rpState.propertyId = null;
    return;
  }
  rpState.propertyId = prop.id;
  rpState.property_address = prop.address || '';
  if (prop.bedrooms) rpState.bedrooms = prop.bedrooms;
  if (prop.bathrooms) rpState.bathrooms = prop.bathrooms;
  if (prop.arv) rpState.arv = +prop.arv;
  if (prop.mortgage_monthly) rpState.mortgage_monthly = +prop.mortgage_monthly;
  if (prop.county) {
    rpState.county = prop.county;
    rpState.property_tax_pct = (RP_COUNTIES[prop.county] || RP_COUNTIES.Other).pct;
  }
  // Sugerir cash invested basado en datos del deal
  if (prop.purchase_price && prop.cashout_estimated) {
    const downPayment = prop.purchase_price * 0.25;
    rpState.cash_invested = Math.max(0, downPayment + (+prop.remodel_cost_estimated || 0) - (+prop.cashout_estimated || 0));
  }
  if (prop.address && !rpState.name) {
    rpState.name = prop.address + ' — ' + (RP_MODELS[rpState.model]?.nombre || '');
  }
}

function rpRenderAIResult(a) {
  const vr = a.validated_rent || {};
  const cfr = a.expected_monthly_cashflow_range || {};
  return `
    <div class="space-y-3 mt-2">
      <div class="bg-white rounded-lg p-3 border border-purple-200">
        <div class="text-[10px] font-bold text-purple-900 uppercase mb-1">📈 Renta validada del mercado</div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="text-center"><div class="text-[9px] text-slate-500">Low</div><div class="font-bold">${rpFmt(vr.low)}</div></div>
          <div class="text-center bg-emerald-50 rounded p-1"><div class="text-[9px] text-emerald-700">Típico</div><div class="font-bold text-emerald-800">${rpFmt(vr.typical)}</div></div>
          <div class="text-center"><div class="text-[9px] text-slate-500">High</div><div class="font-bold">${rpFmt(vr.high)}</div></div>
        </div>
        ${a.vs_user_estimate ? `<div class="text-[10px] text-center mt-1 ${a.vs_user_estimate.includes('-')?'text-red-700':'text-emerald-700'}">vs tu estimado: ${a.vs_user_estimate}</div>` : ''}
        <div class="text-[10px] text-slate-500 text-center mt-1">Confianza: <strong>${vr.confidence || '?'}</strong></div>
      </div>

      ${cfr.typical !== undefined ? `
      <div class="bg-white rounded-lg p-3 border border-purple-200">
        <div class="text-[10px] font-bold text-purple-900 uppercase mb-1">💰 Cashflow esperado (corregido)</div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="text-center"><div class="text-[9px] text-slate-500">Low</div><div class="font-bold ${cfr.low<0?'text-red-700':'text-slate-700'}">${rpFmt(cfr.low)}</div></div>
          <div class="text-center bg-amber-50 rounded p-1"><div class="text-[9px] text-amber-700">Típico</div><div class="font-bold ${cfr.typical<0?'text-red-700':cfr.typical<300?'text-amber-700':'text-emerald-700'}">${rpFmt(cfr.typical)}/mes</div></div>
          <div class="text-center"><div class="text-[9px] text-slate-500">High</div><div class="font-bold text-emerald-700">${rpFmt(cfr.high)}</div></div>
        </div>
      </div>` : ''}

      ${a.market_comps?.length ? `
      <div class="bg-white rounded-lg p-3 border border-purple-200">
        <div class="text-[10px] font-bold text-purple-900 uppercase mb-1">🔗 Comps reales encontrados (${a.market_comps.length})</div>
        <div class="space-y-1 text-[10px]">
          ${a.market_comps.slice(0,5).map(c => `<div class="flex justify-between"><span class="text-slate-600">${c.source}: ${rpFmt(c.price)}</span>${c.url?`<a href="${c.url}" target="_blank" class="text-purple-700 hover:underline">ver→</a>`:''}</div>`).join('')}
        </div>
      </div>` : ''}

      <div class="grid grid-cols-2 gap-2">
        ${a.vacancy_or_occupancy_real ? `<div class="bg-white rounded-lg p-2 border border-purple-200"><div class="text-[10px] font-bold text-purple-900 uppercase">Vacancy/Ocupación real</div><div class="text-xs mt-0.5">${a.vacancy_or_occupancy_real}</div></div>` : ''}
        ${a.competition_level ? `<div class="bg-white rounded-lg p-2 border border-purple-200"><div class="text-[10px] font-bold text-purple-900 uppercase">Competencia</div><div class="text-xs mt-0.5">${a.competition_level}</div></div>` : ''}
      </div>

      ${a.legal_restrictions?.length ? `
      <div class="bg-amber-50 rounded-lg p-3 border border-amber-200">
        <div class="text-[10px] font-bold text-amber-900 uppercase mb-1">⚖️ Restricciones legales</div>
        <ul class="text-[10px] text-amber-950 ml-3 list-disc">${a.legal_restrictions.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>` : ''}

      ${a.best_model_for_this_property ? `
      <div class="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
        <div class="text-[10px] font-bold text-emerald-900 uppercase">🏆 Mejor modelo para esta propiedad</div>
        <div class="text-xs text-emerald-950 mt-1">${a.best_model_for_this_property}</div>
      </div>` : ''}

      ${a.key_risks?.length ? `
      <div class="bg-red-50 rounded-lg p-3 border border-red-200">
        <div class="text-[10px] font-bold text-red-900 uppercase mb-1">⚠️ Riesgos clave</div>
        <ul class="text-[10px] text-red-950 ml-3 list-disc">${a.key_risks.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>` : ''}

      ${a.recommendations?.length ? `
      <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div class="text-[10px] font-bold text-blue-900 uppercase mb-1">💡 Recomendaciones</div>
        <ul class="text-[10px] text-blue-950 ml-3 list-disc">${a.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>` : ''}

      ${a.summary ? `<div class="text-xs text-slate-700 italic bg-slate-50 rounded p-2">"${a.summary}"</div>` : ''}

      <div class="flex items-center justify-between text-[10px] text-slate-500">
        <span>${a._fromCache ? `📦 Desde cache (${new Date(a._cachedAt).toLocaleDateString()})` : '🌐 Recién analizado'}</span>
        <button onclick="rpRunAIAnalysis(true)" class="text-purple-700 hover:underline">↻ Forzar refresh</button>
      </div>
    </div>
  `;
}

async function rpRunAIAnalysis(force = false) {
  if (!rpState.property_address && !rpState.name) {
    return alert('Pon una dirección o nombre primero');
  }
  const r = rpCalc();
  window._aiRefreshCb = () => rpRenderTab();
  await aiAnalyze('cashflow-predictor', {
    address: rpState.property_address || rpState.name,
    city: 'Austin', state: 'TX',
    arv: rpState.arv,
    bedrooms: rpState.bedrooms,
    bathrooms: rpState.bathrooms,
    mortgage_monthly: rpState.mortgage_monthly,
    model: rpState.model,
    model_label: RP_MODELS[rpState.model]?.nombre,
    current_gross_rent: r.grossRent,
    current_net_cashflow: r.netCashflow
  }, force);
  // Espejar estado al estado local del predictor (compat con renderAIResult propio)
  const s = window.aiState['cashflow-predictor'] || {};
  rpState.aiAnalysis = s.analysis;
  rpState.aiLoading = s.loading;
  rpState.aiError = s.error;
}

async function rpQuickSaveProperty() {
  const payload = {
    address: rpState.property_address || rpState.name || 'Sin nombre',
    bedrooms: rpState.bedrooms,
    bathrooms: rpState.bathrooms,
    arv: rpState.arv,
    mortgage_monthly: rpState.mortgage_monthly,
    county: rpState.county
  };
  const newId = await upsertProperty(payload, rpState.propertyId);
  if (newId) {
    rpState.propertyId = newId;
    await rpLoadProperties();
    rpRender();
    alert('✓ Propiedad guardada');
  }
}

async function rpSavePrediction() {
  if (!rpState.name) return alert('Pon un nombre al escenario');
  const payload = {
    user_id: state.user.id,
    name: rpState.name,
    property_address: rpState.property_address || null,
    model: rpState.model,
    monthly_rent: rpState.monthly_rent,
    bedrooms: rpState.bedrooms,
    bathrooms: rpState.bathrooms,
    arv: rpState.arv,
    mortgage_monthly: rpState.mortgage_monthly,
    rent_per_room: rpState.rent_per_room,
    occupied_rooms: rpState.occupied_rooms,
    nightly_rate: rpState.nightly_rate,
    occupancy_pct: rpState.occupancy_pct,
    property_tax_pct: rpState.property_tax_pct,
    insurance_monthly: rpState.insurance_monthly,
    hoa_monthly: rpState.hoa_monthly,
    vacancy_pct: rpState.vacancy_pct,
    maintenance_pct: rpState.maintenance_pct,
    capex_pct: rpState.capex_pct,
    property_mgmt_pct: rpState.property_mgmt_pct,
    platform_pct: rpState.platform_pct,
    utilities_monthly: rpState.utilities_monthly,
    cleaning_monthly: rpState.cleaning_monthly,
    other_monthly: rpState.other_monthly,
    cash_invested: rpState.cash_invested,
    notes: rpState.notes,
    updated_at: new Date().toISOString()
  };
  let result;
  if (rpState.currentId) {
    result = await sb.from('rental_predictions').update(payload).eq('id', rpState.currentId);
  } else {
    result = await sb.from('rental_predictions').insert(payload).select().single();
    if (result.data) rpState.currentId = result.data.id;
  }
  if (result.error) return alert('Error: ' + result.error.message);
  await rpLoadPredictions();
  rpRender();
}

async function rpDeletePrediction(id) {
  if (!confirm('¿Borrar este escenario?')) return;
  await sb.from('rental_predictions').delete().eq('id', id);
  if (rpState.currentId === id) rpState.currentId = null;
  await rpLoadPredictions();
  rpRender();
}

function rpLoadPrediction(p) {
  Object.keys(p).forEach(k => { if (k in rpState) rpState[k] = p[k]; });
  rpState.currentId = p.id;
  rpState.tab = 'estimador';
  rpRender();
}

function rpNewPrediction() {
  rpState.currentId = null;
  rpState.name = '';
  rpState.property_address = '';
  rpResetToModel('long_term');
  rpState.tab = 'estimador';
  rpRender();
}

// ─── ENTRY POINT ───
async function openRentalPredictor(sys) {
  rpState.sys = sys;
  await Promise.all([rpLoadPredictions(), rpLoadProperties()]);
  openModal(`💵 ${sys.name}`, '<div id="rp-root"></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  rpRender();
}

function rpOnPropertyChange(propId) {
  if (!propId) { rpState.propertyId = null; rpRender(); return; }
  const p = rpState.properties.find(x => x.id === propId);
  rpLoadFromProperty(p);
  rpRender();
}

function rpRender() {
  const root = document.getElementById('rp-root');
  const tabs = [
    { id:'estimador', label:'💵 Predictor' },
    { id:'comparador', label:'⚖️ Comparar Modelos' },
    { id:'guardadas', label:`📁 Guardadas (${rpState.predictions.length})` }
  ];
  root.innerHTML = `
    <div class="flex gap-1 mb-4 border-b border-slate-200 -mx-6 px-6 overflow-x-auto">
      ${tabs.map(t => `<button onclick="rpSetTab('${t.id}')" class="px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${rpState.tab===t.id?'border-slate-900 text-slate-900':'border-transparent text-slate-500 hover:text-slate-900'}">${t.label}</button>`).join('')}
    </div>
    <div id="rp-body"></div>
  `;
  rpRenderTab();
}

function rpSetTab(t) { rpState.tab = t; rpRender(); }

function rpRenderTab() {
  const body = document.getElementById('rp-body');
  if (rpState.tab === 'estimador') rpRenderEstimador(body);
  else if (rpState.tab === 'comparador') rpRenderComparador(body);
  else if (rpState.tab === 'guardadas') rpRenderGuardadas(body);
}

// ─── TAB: ESTIMADOR (modo simple por default + avanzado bajo toggle) ───
function rpRenderEstimador(body) {
  const r = rpCalc();
  const m = RP_MODELS[rpState.model];
  const cashColor = r.netCashflow < 0 ? 'text-red-700' : r.netCashflow < 300 ? 'text-amber-700' : 'text-emerald-700';
  const cashBg = r.netCashflow < 0 ? 'bg-red-50 border-red-300' : r.netCashflow < 300 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300';

  const incomeBlock = rpState.model === 'by_room' ? `
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Renta por habitación</label>
        <input type="number" value="${rpState.rent_per_room}" onchange="rpState.rent_per_room=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
      </div>
      <div>
        <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Habs ocupadas (de ${rpState.bedrooms})</label>
        <input type="number" value="${rpState.occupied_rooms}" max="${rpState.bedrooms}" onchange="rpState.occupied_rooms=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
      </div>
    </div>` : rpState.model === 'short_term' ? `
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="block text-[10px] font-medium text-slate-500 mb-0.5">$/noche</label>
        <input type="number" value="${rpState.nightly_rate}" onchange="rpState.nightly_rate=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
      </div>
      <div>
        <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Ocupación %</label>
        <input type="number" min="0" max="100" value="${rpState.occupancy_pct}" onchange="rpState.occupancy_pct=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
      </div>
    </div>` : `
    <div>
      <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Renta mensual esperada</label>
      <input type="number" value="${rpState.monthly_rent}" onchange="rpState.monthly_rent=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-3 py-2 text-lg font-bold" />
    </div>`;

  body.innerHTML = `
    <div class="grid lg:grid-cols-12 gap-5">
      <div class="lg:col-span-7 space-y-3">

        ${propertySelectorHtml(rpState.propertyId, 'rpOnPropertyChange', 'rpQuickSaveProperty')}

        <!-- MODELO DE NEGOCIO -->
        <div class="bg-white rounded-xl p-3 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-2">Modelo de negocio</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            ${Object.entries(RP_MODELS).map(([k,v]) => `
              <button onclick="rpResetToModel('${k}'); rpRenderTab()" class="p-2 rounded text-left border ${rpState.model===k?'border-slate-900 bg-slate-900 text-white':'border-slate-200 hover:border-slate-400'}">
                <div class="text-base">${v.icon}</div>
                <div class="text-[11px] font-bold leading-tight">${v.nombre}</div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- VISTA SIMPLE (5 inputs clave) -->
        <div class="bg-white rounded-xl p-4 border-2 border-slate-300">
          <h3 class="text-sm font-bold mb-3">⚡ Análisis rápido</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5">ARV / Valor casa</label>
              <input type="number" value="${rpState.arv}" onchange="rpState.arv=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
            </div>
            <div>
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Hipoteca Ref30 $/mes</label>
              <input type="number" value="${rpState.mortgage_monthly}" onchange="rpState.mortgage_monthly=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
              <p class="text-[9px] text-slate-400">Tu promedio: ~$2,100</p>
            </div>
            <div>
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5"># Habitaciones</label>
              <input type="number" value="${rpState.bedrooms}" onchange="rpState.bedrooms=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-3 py-2 text-base" />
            </div>
            <div>
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5"># Baños</label>
              <input type="number" step="0.5" value="${rpState.bathrooms}" oninput="rpState.bathrooms=+this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-base" />
            </div>
            <div class="col-span-2">${incomeBlock}</div>
          </div>
          <p class="text-[10px] text-emerald-700 mt-2">✓ Todo lo demás (taxes, seguro, vacancy, mgmt, reservas) usa defaults reales Austin mayo 2026. Ajusta abajo si necesitas.</p>
        </div>

        <!-- CONFIGURACIÓN AVANZADA (colapsable) -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button onclick="rpState.simpleMode=!rpState.simpleMode; rpRenderTab()" class="w-full p-3 flex justify-between items-center text-sm text-slate-700 hover:bg-slate-50">
            <span class="font-semibold">⚙️ Configuración avanzada</span><span>${rpState.simpleMode?'▼':'▲'}</span>
          </button>
          ${!rpState.simpleMode ? `
            <div class="p-4 pt-0 space-y-3 border-t border-slate-100">
              <div>
                <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Condado (auto-ajusta property tax)</label>
                <select onchange="rpState.county=this.value; rpState.property_tax_pct=${JSON.stringify(Object.fromEntries(Object.entries(RP_COUNTIES).map(([k,v])=>[k,v.pct])))}[this.value]; rpRenderTab()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                  ${Object.entries(RP_COUNTIES).map(([k,v]) => `<option value="${k}" ${rpState.county===k?'selected':''}>${v.label} → ${v.pct}%</option>`).join('')}
                </select>
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-600 uppercase mb-1">Gastos fijos mensuales</h4>
                <div class="grid grid-cols-2 gap-2">
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">Property tax %/año</label><input type="number" step="0.1" value="${rpState.property_tax_pct}" onchange="rpState.property_tax_pct=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">Seguro $/mes</label><input type="number" value="${rpState.insurance_monthly}" onchange="rpState.insurance_monthly=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">HOA $/mes</label><input type="number" value="${rpState.hoa_monthly}" onchange="rpState.hoa_monthly=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">Utilities $/mes</label><input type="number" value="${rpState.utilities_monthly}" onchange="rpState.utilities_monthly=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">Cleaning $/mes</label><input type="number" value="${rpState.cleaning_monthly}" onchange="rpState.cleaning_monthly=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">Otros $/mes</label><input type="number" value="${rpState.other_monthly}" onchange="rpState.other_monthly=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                </div>
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-600 uppercase mb-1">Reservas % de renta</h4>
                <div class="grid grid-cols-3 gap-2">
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">Vacancy</label><input type="number" step="0.5" value="${rpState.vacancy_pct}" onchange="rpState.vacancy_pct=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">Maintenance</label><input type="number" step="0.5" value="${rpState.maintenance_pct}" onchange="rpState.maintenance_pct=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">CapEx</label><input type="number" step="0.5" value="${rpState.capex_pct}" onchange="rpState.capex_pct=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">Property mgmt</label><input type="number" step="0.5" value="${rpState.property_mgmt_pct}" onchange="rpState.property_mgmt_pct=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">Plataforma</label><input type="number" step="0.5" value="${rpState.platform_pct}" onchange="rpState.platform_pct=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                  <div><label class="block text-[10px] text-slate-500 mb-0.5">Cash invertido</label><input type="number" value="${rpState.cash_invested}" onchange="rpState.cash_invested=+this.value; rpRenderTab()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- GUARDAR ESCENARIO -->
        <div class="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <label class="block text-[10px] font-medium text-slate-500 mb-1">Nombre del escenario (para guardar)</label>
          <div class="flex gap-2">
            <input value="${rpState.name}" oninput="rpState.name=this.value" placeholder="Ej: Echo Lane Airbnb" class="flex-1 border border-slate-300 rounded px-3 py-2 text-sm" />
            <button onclick="rpSavePrediction()" class="bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold px-4 py-2 rounded">${rpState.currentId?'💾 Guardar':'💾 Guardar'}</button>
          </div>
        </div>
      </div>

      <!-- RESULTADO -->
      <div class="lg:col-span-5 space-y-3">
        <div class="rounded-xl p-5 border-2 ${cashBg}">
          <div class="text-xs font-bold uppercase ${cashColor.replace('text-','text-')}">${r.netCashflow < 0 ? '🔴 Pérdida mensual' : r.netCashflow < 300 ? '🟡 Margen ajustado' : '🟢 Cashflow positivo'}</div>
          <div class="text-4xl font-bold ${cashColor} mt-1">${rpFmt(r.netCashflow)}/mes</div>
          <div class="text-xs text-slate-600 mt-1">${rpFmt(r.annualCashflow)}/año · ${m.icon} ${m.nombre}</div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="bg-slate-900 text-white rounded-lg p-3">
            <div class="text-[10px] text-slate-400 uppercase font-bold">Cash-on-Cash</div>
            <div class="text-2xl font-bold ${r.cocReturn === null ? '' : r.cocReturn < 8 ? 'text-amber-400' : r.cocReturn < 15 ? 'text-green-400' : 'text-emerald-400'}">${r.cocReturn === null ? '—' : r.cocReturn.toFixed(1)+'%'}</div>
            <div class="text-[10px] text-slate-500">cash invertido: ${rpFmt(rpState.cash_invested)}</div>
          </div>
          <div class="bg-slate-900 text-white rounded-lg p-3">
            <div class="text-[10px] text-slate-400 uppercase font-bold">Cap Rate</div>
            <div class="text-2xl font-bold ${r.capRate === null ? '' : r.capRate < 5 ? 'text-amber-400' : 'text-emerald-400'}">${r.capRate === null ? '—' : r.capRate.toFixed(2)+'%'}</div>
            <div class="text-[10px] text-slate-500">NOI/ARV anual</div>
          </div>
        </div>

        <div class="bg-white rounded-lg p-4 border border-slate-200">
          <div class="text-xs font-bold text-slate-700 uppercase mb-2">Desglose mensual</div>
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-slate-100"><td class="py-1.5 font-bold text-emerald-700">Renta bruta</td><td class="py-1.5 text-right font-bold text-emerald-700">${rpFmt(r.grossRent)}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">− Hipoteca</td><td class="py-1.5 text-right text-red-700">${rpFmt(rpState.mortgage_monthly)}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">− Property tax</td><td class="py-1.5 text-right text-red-700">${rpFmt(r.propertyTax)}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">− Seguro</td><td class="py-1.5 text-right text-red-700">${rpFmt(rpState.insurance_monthly)}</td></tr>
              ${rpState.hoa_monthly>0?`<tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">− HOA</td><td class="py-1.5 text-right text-red-700">${rpFmt(rpState.hoa_monthly)}</td></tr>`:''}
              ${rpState.utilities_monthly>0?`<tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">− Utilities</td><td class="py-1.5 text-right text-red-700">${rpFmt(rpState.utilities_monthly)}</td></tr>`:''}
              ${rpState.cleaning_monthly>0?`<tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">− Cleaning</td><td class="py-1.5 text-right text-red-700">${rpFmt(rpState.cleaning_monthly)}</td></tr>`:''}
              ${rpState.other_monthly>0?`<tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">− Otros</td><td class="py-1.5 text-right text-red-700">${rpFmt(rpState.other_monthly)}</td></tr>`:''}
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500 italic">− Vacancy (${rpState.vacancy_pct}%)</td><td class="py-1.5 text-right text-red-600">${rpFmt(r.vacancy)}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500 italic">− Maintenance (${rpState.maintenance_pct}%)</td><td class="py-1.5 text-right text-red-600">${rpFmt(r.maintenance)}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500 italic">− CapEx (${rpState.capex_pct}%)</td><td class="py-1.5 text-right text-red-600">${rpFmt(r.capex)}</td></tr>
              ${rpState.property_mgmt_pct>0?`<tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500 italic">− Mgmt (${rpState.property_mgmt_pct}%)</td><td class="py-1.5 text-right text-red-600">${rpFmt(r.mgmt)}</td></tr>`:''}
              ${rpState.platform_pct>0?`<tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500 italic">− Plataforma (${rpState.platform_pct}%)</td><td class="py-1.5 text-right text-red-600">${rpFmt(r.platform)}</td></tr>`:''}
              <tr class="border-t-2 border-slate-300"><td class="py-1.5 font-bold">= CASHFLOW NETO</td><td class="py-1.5 text-right font-bold ${cashColor}">${rpFmt(r.netCashflow)}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-950">
          <strong>📊 Análisis básico:</strong><br>
          • Total gastos: ${rpFmt(r.totalExpenses)}/mes (${((r.totalExpenses/r.grossRent)*100||0).toFixed(0)}% de renta bruta)<br>
          • Ratio renta/hipoteca: ${(r.grossRent/(rpState.mortgage_monthly||1)).toFixed(2)}x ${r.grossRent/(rpState.mortgage_monthly||1) < 1.5 ? '⚠️ bajo' : '✓'}<br>
          • Anualizado: ${rpFmt(r.annualCashflow)} netos al año
        </div>

        <!-- AI ANALYSIS -->
        <div class="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 class="text-sm font-bold text-purple-900 uppercase">🤖 Validación con datos del mercado en vivo</h3>
              <p class="text-[10px] text-purple-700">Claude busca en internet: rent comps reales, ADR Airbnb, vacancy local, restricciones legales, competencia</p>
            </div>
            <button onclick="rpRunAIAnalysis(false)" ${rpState.aiLoading?'disabled':''} class="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white text-xs font-bold px-3 py-2 rounded whitespace-nowrap">${rpState.aiLoading?'🔄 Analizando...':'🚀 Analizar con IA'}</button>
          </div>
          ${rpState.aiError ? `<div class="text-xs text-red-700 bg-red-100 rounded p-2 mt-2">⚠️ ${rpState.aiError}</div>` : ''}
          ${rpState.aiLoading ? `
            <div class="text-center py-6 text-purple-700">
              <div class="text-3xl animate-pulse">🔍</div>
              <p class="text-xs mt-2">Buscando en Zillow, AirDNA, Furnished Finder, PadSplit, regulaciones locales... (30-60s)</p>
            </div>
          ` : rpState.aiAnalysis ? rpRenderAIResult(rpState.aiAnalysis) : ''}
        </div>

        <!-- STRESS TEST -->
        ${(() => {
          const st = rpStressTest();
          return `
          <div class="bg-white border border-slate-200 rounded-lg p-3">
            <div class="text-xs font-bold text-slate-700 uppercase mb-2">🎯 Stress Test (3 escenarios)</div>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div class="bg-red-50 rounded p-2 text-center">
                <div class="text-[10px] text-red-700 font-bold uppercase">😰 Pesimista</div>
                <div class="font-bold ${st.pessim.netCashflow < 0 ? 'text-red-700' : 'text-amber-700'}">${rpFmt(st.pessim.netCashflow)}</div>
                <div class="text-[9px] text-slate-500">vacancy +5, renta -10%</div>
              </div>
              <div class="bg-slate-100 rounded p-2 text-center border-2 border-slate-400">
                <div class="text-[10px] text-slate-700 font-bold uppercase">⚖️ Realista</div>
                <div class="font-bold text-slate-900">${rpFmt(st.realist.netCashflow)}</div>
                <div class="text-[9px] text-slate-500">tus inputs actuales</div>
              </div>
              <div class="bg-emerald-50 rounded p-2 text-center">
                <div class="text-[10px] text-emerald-700 font-bold uppercase">🚀 Optimista</div>
                <div class="font-bold text-emerald-700">${rpFmt(st.optim.netCashflow)}</div>
                <div class="text-[9px] text-slate-500">vacancy -3, renta +5%</div>
              </div>
            </div>
          </div>
        `; })()}

        <!-- MARKET NOTES Austin TX 2026 -->
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950">
          <strong>📰 Mercado Austin TX — mayo 2026:</strong>
          <ul class="mt-1 space-y-0.5 ml-4 list-disc">
            <li>Vacancy multifamily Q1 2026: <strong>13.5%</strong> (sobreoferta, esperan 6-7% para fin 2026)</li>
            <li>Rent dropping ~4-7% YoY. Concessions tipo "2 meses gratis" comunes</li>
            <li>3BR house promedio: <strong>$2,400-2,800/mes</strong> (Zillow/RentCafe)</li>
            <li>Airbnb ADR: <strong>$263-288</strong>/noche, ocupación <strong>41-55%</strong> (AirDNA/AirROI)</li>
            <li>Furnished Finder: <strong>$1,200-2,500/mes</strong> (travel nurses)</li>
            <li>PadSplit by-room: <strong>$680-758/mes</strong> por hab</li>
            <li>Cap rates suburbanos buenos: 6.5-7.5% (Round Rock, Cedar Park)</li>
            <li>Property tax investment (sin homestead): Travis <strong>2.05%</strong>, Williamson 1.85%</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

// ─── TAB: COMPARADOR ───
function rpRenderComparador(body) {
  // Calcular cashflow para cada modelo usando los mismos inputs base (ARV, hipoteca, bedrooms)
  const baseSnapshot = { ...rpState };
  const results = Object.entries(RP_MODELS).map(([k, m]) => {
    Object.assign(rpState, baseSnapshot);
    rpResetToModel(k);
    return { key: k, model: m, calc: rpCalc(), state: { ...rpState } };
  });
  // Restaurar estado
  Object.assign(rpState, baseSnapshot);

  const best = results.reduce((a, b) => a.calc.netCashflow > b.calc.netCashflow ? a : b);

  body.innerHTML = `
    <div class="space-y-4">
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p class="text-xs text-amber-900"><strong>Comparación con tus datos base:</strong> ARV ${rpFmt(rpState.arv)}, ${rpState.bedrooms}bd/${rpState.bathrooms}ba, hipoteca ${rpFmt(rpState.mortgage_monthly)}/mes. Cambia en el tab Predictor.</p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        ${results.map(r => {
          const isBest = r.key === best.key;
          const color = r.calc.netCashflow < 0 ? 'border-red-300' : r.calc.netCashflow < 300 ? 'border-amber-300' : 'border-emerald-300';
          return `
            <div class="bg-white rounded-xl border-2 ${color} ${isBest?'ring-2 ring-amber-400':''} p-4">
              ${isBest?'<div class="text-[10px] text-amber-700 font-bold mb-1">🏆 MEJOR OPCIÓN</div>':''}
              <div class="text-2xl mb-1">${r.model.icon}</div>
              <div class="text-sm font-bold">${r.model.nombre}</div>
              <p class="text-[10px] text-slate-500 mt-0.5 leading-tight">${r.model.desc}</p>
              <div class="mt-3 pt-3 border-t border-slate-100">
                <div class="text-[10px] text-slate-500 uppercase font-bold">Cashflow/mes</div>
                <div class="text-2xl font-bold ${r.calc.netCashflow < 0 ? 'text-red-700' : r.calc.netCashflow < 300 ? 'text-amber-700' : 'text-emerald-700'}">${rpFmt(r.calc.netCashflow)}</div>
                <div class="text-[10px] text-slate-500">${rpFmt(r.calc.annualCashflow)}/año</div>
              </div>
              <div class="mt-2 space-y-0.5 text-[10px] text-slate-600">
                <div class="flex justify-between"><span>Renta bruta:</span><strong>${rpFmt(r.calc.grossRent)}</strong></div>
                <div class="flex justify-between"><span>Total gastos:</span><strong>${rpFmt(r.calc.totalExpenses)}</strong></div>
                <div class="flex justify-between"><span>Cap rate:</span><strong>${r.calc.capRate===null?'—':r.calc.capRate.toFixed(1)+'%'}</strong></div>
                <div class="flex justify-between"><span>CoC return:</span><strong>${r.calc.cocReturn===null?'—':r.calc.cocReturn.toFixed(1)+'%'}</strong></div>
              </div>
              <button onclick="rpResetToModel('${r.key}'); rpSetTab('estimador')" class="mt-3 w-full text-xs bg-slate-100 hover:bg-slate-900 hover:text-white py-1.5 rounded">Usar este modelo →</button>
            </div>
          `;
        }).join('')}
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-950">
        <strong>💡 Cómo leer:</strong> los 4 modelos comparados con los MISMOS gastos base (ARV, hipoteca, beds). Los defaults de utilities, vacancy, mgmt, plataforma y cleaning cambian según modelo (realistas para cada tipo). <strong>${best.model.nombre}</strong> es el que más cashflow genera con esta casa: ${rpFmt(best.calc.netCashflow)}/mes.
      </div>
    </div>
  `;
}

// ─── TAB: GUARDADAS ───
function rpRenderGuardadas(body) {
  if (rpState.predictions.length === 0) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">No hay escenarios guardados.<br>Llena el predictor y click "Guardar escenario".</div>`;
    return;
  }
  body.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">Escenarios guardados</h3>
      <button onclick="rpNewPrediction()" class="text-xs bg-slate-900 text-white px-3 py-1.5 rounded">+ Nuevo escenario</button>
    </div>
    <div class="overflow-x-auto border border-slate-200 rounded-lg">
      <table class="w-full text-sm">
        <thead class="bg-slate-50"><tr><th class="text-left py-2 px-2">Escenario</th><th class="text-left py-2 px-2">Dirección</th><th class="text-left py-2 px-2">Modelo</th><th class="text-right py-2 px-2">Renta bruta</th><th class="text-right py-2 px-2">Cashflow</th><th class="text-right py-2 px-2">CoC</th><th></th></tr></thead>
        <tbody>
          ${rpState.predictions.map(p => {
            // Recalcular para mostrar
            const snap = { ...rpState };
            Object.keys(p).forEach(k => { if (k in rpState) rpState[k] = p[k]; });
            const calc = rpCalc();
            Object.assign(rpState, snap);
            const m = RP_MODELS[p.model];
            const color = calc.netCashflow < 0 ? 'text-red-700' : calc.netCashflow < 300 ? 'text-amber-700' : 'text-emerald-700';
            return `<tr class="border-t border-slate-200 hover:bg-slate-50">
              <td class="py-2 px-2 font-semibold">${p.name}</td>
              <td class="py-2 px-2 text-xs text-slate-500">${p.property_address||'—'}</td>
              <td class="py-2 px-2 text-xs">${m?.icon} ${m?.nombre}</td>
              <td class="py-2 px-2 text-right">${rpFmt(calc.grossRent)}</td>
              <td class="py-2 px-2 text-right font-bold ${color}">${rpFmt(calc.netCashflow)}/mes</td>
              <td class="py-2 px-2 text-right">${calc.cocReturn===null?'—':calc.cocReturn.toFixed(1)+'%'}</td>
              <td class="py-2 px-2 text-right whitespace-nowrap">
                <button onclick='rpLoadPrediction(${JSON.stringify(p).replace(/'/g,"&#39;")})' class="text-xs text-slate-600 hover:text-slate-900 mr-1">📝 Editar</button>
                <button onclick="rpDeletePrediction('${p.id}')" class="text-xs text-red-600 hover:text-red-800">🗑</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}
