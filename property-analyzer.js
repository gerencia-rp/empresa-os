// ============================================================
// DEEP PROPERTY ANALYZER — análisis 360° con IA + web search
// ============================================================

const paState = {
  sys: null,
  tab: 'new',
  analyses: [],
  currentAnalysisId: null,
  // Inputs nuevos
  propertyId: null,
  address: '',
  listing_url: '',
  zip: '',
  sqft: 1500,
  beds: 3,
  baths: 2,
  year: 1980,
  lot: 7000,
  purchase_price: 200000,
  remodel_estimate: 40000,
  arv_estimate: 320000,
  strategy: 'BRRRR',
  notes: '',
  comps_urls: '',
  photoFiles: []
};

const paFmt = n => '$' + Math.round(n || 0).toLocaleString('en-US');

async function openPropertyAnalyzer(sys) {
  paState.sys = sys;
  await Promise.all([loadProperties(), paLoadAnalyses()]);
  openModal(`🔬 ${sys.name}`, '<div id="pa-root"></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  paRender();
}

async function paLoadAnalyses() {
  const { data } = await sb.from('property_analyses').select('*').order('created_at', { ascending: false }).limit(50);
  paState.analyses = data || [];
}

function paOnPropertyChange(propId) {
  if (!propId) { paState.propertyId = null; paRender(); return; }
  const p = window.propertiesCache.find(x => x.id === propId);
  if (!p) return;
  paState.propertyId = p.id;
  paState.address = p.address;
  if (p.zip) paState.zip = p.zip;
  if (p.sqft) paState.sqft = p.sqft;
  if (p.bedrooms) paState.beds = p.bedrooms;
  if (p.bathrooms) paState.baths = p.bathrooms;
  if (p.year_built) paState.year = p.year_built;
  if (p.lot_size_sqft) paState.lot = p.lot_size_sqft;
  if (p.purchase_price) paState.purchase_price = +p.purchase_price;
  if (p.remodel_cost_estimated) paState.remodel_estimate = +p.remodel_cost_estimated;
  if (p.arv) paState.arv_estimate = +p.arv;
  paRender();
}

async function paLaunchAnalysis() {
  if (!paState.address) return alert('Pon una dirección antes de analizar');
  // Subir fotos a storage si hay (skip por simplicidad — agregar después)
  const photoPaths = [];
  // (skip por simplicidad — agregar después)
  const payload = {
    user_id: state.user.id,
    property_id: paState.propertyId || null,
    address: paState.address,
    status: 'pending',
    inputs: {
      listing_url: paState.listing_url,
      zip: paState.zip,
      sqft: paState.sqft,
      beds: paState.beds,
      baths: paState.baths,
      year: paState.year,
      lot: paState.lot,
      purchase_price: paState.purchase_price,
      remodel_estimate: paState.remodel_estimate,
      arv_estimate: paState.arv_estimate,
      strategy: paState.strategy,
      notes: paState.notes,
      comps_urls: paState.comps_urls.split('\n').filter(s => s.trim()),
      photo_paths: photoPaths
    }
  };
  const { data, error } = await sb.from('property_analyses').insert(payload).select().single();
  if (error) return alert('Error: ' + error.message);
  paState.currentAnalysisId = data.id;
  paState.tab = 'result';
  paRender();
  // Invoke edge function
  sb.functions.invoke('deep-property-analysis', { body: { analysisId: data.id } })
    .then(() => paLoadAnalyses().then(() => paRender()))
    .catch(e => console.error(e));
  // Poll cada 5s
  paStartPolling(data.id);
}

let paPollTimer = null;
let paPollStartedAt = 0;
function paStartPolling(id) {
  paStopPolling();
  paPollStartedAt = Date.now();
  const MAX_POLL_MS = 10 * 60 * 1000; // 10 min
  paPollTimer = setInterval(async () => {
    // Timeout máximo para evitar polling infinito si el job nunca termina
    if (Date.now() - paPollStartedAt > MAX_POLL_MS) {
      paStopPolling();
      return;
    }
    // Stop si el modal/sistema ya no está visible
    if (!document.getElementById('pa-root')) {
      paStopPolling();
      return;
    }
    const { data } = await sb.from('property_analyses').select('*').eq('id', id).maybeSingle();
    if (!data) return;
    const idx = paState.analyses.findIndex(a => a.id === id);
    if (idx >= 0) paState.analyses[idx] = data;
    else paState.analyses.unshift(data);
    paRender();
    if (data.status === 'done' || data.status === 'error') {
      paStopPolling();
    }
  }, 5000);
}
function paStopPolling() {
  if (paPollTimer) {
    clearInterval(paPollTimer);
    paPollTimer = null;
  }
}
// Cleanup global: si se cierra el modal o se cambia de sistema, parar polling
window.addEventListener('beforeunload', paStopPolling);

function paSetTab(t) { paState.tab = t; paRender(); }

function paRender() {
  const root = document.getElementById('pa-root');
  const tabs = [
    { id: 'new', label: '➕ Nuevo análisis' },
    { id: 'result', label: '📊 Resultado' + (paState.currentAnalysisId ? ' (actual)' : '') },
    { id: 'history', label: `📚 Historial (${paState.analyses.length})` }
  ];
  root.innerHTML = `
    <div class="flex gap-1 mb-4 border-b border-slate-200 -mx-6 px-6 overflow-x-auto">
      ${tabs.map(t => `<button onclick="paSetTab('${t.id}')" class="px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${paState.tab===t.id?'border-slate-900 text-slate-900':'border-transparent text-slate-500 hover:text-slate-900'}">${t.label}</button>`).join('')}
    </div>
    <div id="pa-body"></div>
  `;
  if (paState.tab === 'new') paRenderNew();
  else if (paState.tab === 'result') paRenderResult();
  else paRenderHistory();
}

function paRenderNew() {
  const body = document.getElementById('pa-body');
  body.innerHTML = `
    ${propertySelectorHtml(paState.propertyId, 'paOnPropertyChange', 'paQuickSaveProperty')}

    <div class="grid lg:grid-cols-2 gap-4">
      <div class="space-y-3">
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-3">📍 Datos básicos</h3>
          <div class="grid grid-cols-2 gap-2">
            <div class="col-span-2">
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Dirección completa *</label>
              <input value="${paState.address}" oninput="paState.address=this.value" placeholder="123 Main St, Austin TX 78745" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-semibold" />
            </div>
            <div class="col-span-2">
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5">🔗 Link Zillow/Redfin/MLS</label>
              <input value="${paState.listing_url}" oninput="paState.listing_url=this.value" placeholder="https://zillow.com/..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Zip</label><input value="${paState.zip}" oninput="paState.zip=this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Sqft</label><input type="number" value="${paState.sqft}" oninput="paState.sqft=+this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Beds</label><input type="number" value="${paState.beds}" oninput="paState.beds=+this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Baths</label><input type="number" step="0.5" value="${paState.baths}" oninput="paState.baths=+this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Año</label><input type="number" value="${paState.year}" oninput="paState.year=+this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Lot sqft</label><input type="number" value="${paState.lot}" oninput="paState.lot=+this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-3">💰 Números propuestos</h3>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block text-[10px] text-slate-500 mb-0.5">Precio compra</label>
              <input type="number" value="${paState.purchase_price}" oninput="paState.purchase_price=+this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />
            </div>
            <div>
              <label class="block text-[10px] text-slate-500 mb-0.5">Remodel estimado</label>
              <input type="number" value="${paState.remodel_estimate}" oninput="paState.remodel_estimate=+this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />
            </div>
            <div>
              <label class="block text-[10px] text-slate-500 mb-0.5">ARV estimado</label>
              <input type="number" value="${paState.arv_estimate}" oninput="paState.arv_estimate=+this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-3">🎯 Estrategia</h3>
          <select value="${paState.strategy}" onchange="paState.strategy=this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
            <option ${paState.strategy==='BRRRR'?'selected':''}>BRRRR (Buy-Rehab-Rent-Refi-Repeat)</option>
            <option ${paState.strategy==='Fix and Flip'?'selected':''}>Fix and Flip (revender)</option>
            <option ${paState.strategy==='Long-term hold'?'selected':''}>Long-term hold (renta tradicional)</option>
            <option ${paState.strategy==='By-room rental'?'selected':''}>By-room rental (PadSplit)</option>
            <option ${paState.strategy==='Mid-term rental'?'selected':''}>Mid-term rental (Furnished Finder)</option>
            <option ${paState.strategy==='Short-term rental'?'selected':''}>Short-term rental (Airbnb)</option>
            <option ${paState.strategy==='ADU strategy'?'selected':''}>ADU strategy (agregar unidad)</option>
          </select>
        </div>
      </div>

      <div class="space-y-3">
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-3">📋 Comparables (1 URL por línea)</h3>
          <textarea oninput="paState.comps_urls=this.value" rows="5" placeholder="https://zillow.com/comp1
https://redfin.com/comp2
https://realtor.com/comp3" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono">${paState.comps_urls}</textarea>
          <p class="text-[10px] text-slate-400 mt-1">Si tienes comps específicos, péganlos. Si no, Claude buscará.</p>
        </div>

        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-3">📝 Notas / observaciones</h3>
          <textarea oninput="paState.notes=this.value" rows="6" placeholder="Condición visible (foundation, roof, plumbing), motivación del vendedor, plazo, dudas específicas que quieras que Claude resuelva..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm">${paState.notes}</textarea>
        </div>

        <div class="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4">
          <h3 class="text-sm font-bold text-purple-900 uppercase mb-2">🔬 ¿Qué va a hacer el análisis?</h3>
          <ul class="text-xs text-purple-900 space-y-1">
            <li>✓ Busca <strong>comps reales</strong> en Redfin/Zillow del último 6m</li>
            <li>✓ Valida tu ARV vs mercado real (Austin mayo 2026)</li>
            <li>✓ <strong>Crime + schools + walkability + commute</strong> de la zona</li>
            <li>✓ <strong>Estima renta</strong> por los 4 modelos (LT, by-room, MTR, STR)</li>
            <li>✓ Compara remodel cost con <strong>tu data histórica</strong> de casas similares</li>
            <li>✓ Cashflow proyectado + BRRRR check + cap rate + COC</li>
            <li>✓ <strong>Lista de riesgos</strong> específicos + decisión final con score 1-10</li>
            <li>✓ Sugiere <strong>máximo precio razonable</strong> para negociar</li>
          </ul>
          <button onclick="paLaunchAnalysis()" class="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg">🚀 Ejecutar análisis profundo (60-120s)</button>
        </div>
      </div>
    </div>
  `;
}

async function paQuickSaveProperty() {
  const payload = {
    address: paState.address,
    zip: paState.zip,
    sqft: paState.sqft,
    bedrooms: paState.beds,
    bathrooms: paState.baths,
    year_built: paState.year,
    lot_size_sqft: paState.lot,
    purchase_price: paState.purchase_price,
    arv: paState.arv_estimate,
    remodel_cost_estimated: paState.remodel_estimate
  };
  const newId = await upsertProperty(payload, paState.propertyId);
  if (newId) {
    paState.propertyId = newId;
    await loadProperties();
    paRender();
  }
}

function paRenderResult() {
  const body = document.getElementById('pa-body');
  const a = paState.currentAnalysisId ? paState.analyses.find(x => x.id === paState.currentAnalysisId) : paState.analyses[0];
  if (!a) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">No hay análisis. Ve a "Nuevo análisis" para empezar.</div>`;
    return;
  }
  if (a.status === 'pending' || a.status === 'analyzing') {
    body.innerHTML = `
      <div class="text-center py-16">
        <div class="text-6xl mb-4 animate-pulse">🔬</div>
        <h3 class="text-xl font-bold text-slate-900">Analizando ${a.address}...</h3>
        <p class="text-sm text-slate-500 mt-2">Claude está buscando comps reales, validando precios, analizando crimen y schools, estimando rentas...</p>
        <p class="text-xs text-slate-400 mt-1">Esto toma 60-120s. La página se actualiza sola.</p>
        <div class="inline-block mt-4 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">${a.status}</div>
      </div>
    `;
    return;
  }
  if (a.status === 'error') {
    body.innerHTML = `
      <div class="bg-red-50 border-2 border-red-300 rounded-xl p-6">
        <h3 class="text-lg font-bold text-red-900">❌ Error en análisis</h3>
        <p class="text-sm text-red-700 mt-2 font-mono">${a.error_message || 'Desconocido'}</p>
        <button onclick="paRetry('${a.id}')" class="mt-4 bg-red-600 text-white px-4 py-2 rounded font-bold">🔄 Reintentar</button>
      </div>
    `;
    return;
  }
  const r = a.result || {};
  const dec = r.recommendation?.decision;
  const decColor = dec === 'buy' ? 'green' : dec === 'pass' ? 'red' : 'amber';
  const score = r.recommendation?.confidence_score || 0;

  body.innerHTML = `
    <!-- HEADER: decisión grande -->
    <div class="bg-gradient-to-br from-${decColor}-50 to-${decColor}-100 border-2 border-${decColor}-400 rounded-2xl p-6 mb-4">
      <div class="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div class="text-xs font-bold uppercase text-${decColor}-900 mb-1">Decisión recomendada</div>
          <div class="text-5xl font-bold text-${decColor}-900">${(dec || '?').toUpperCase()}</div>
          <div class="text-sm text-${decColor}-800 mt-2">Score: <strong>${score}/10</strong> · Máx oferta razonable: <strong>${paFmt(r.recommendation?.max_offer_price)}</strong></div>
        </div>
        <div class="text-right">
          <div class="text-xs text-${decColor}-700">${a.address}</div>
          <div class="text-[10px] text-slate-500">${new Date(a.processed_at || a.created_at).toLocaleString()}</div>
        </div>
      </div>
      <p class="mt-3 text-sm text-slate-700 leading-relaxed">${r.executive_summary || ''}</p>
      <p class="mt-2 text-xs text-${decColor}-800 italic">${r.recommendation?.reasoning || ''}</p>
    </div>

    <div class="grid lg:grid-cols-2 gap-4">
      <!-- LOCATION -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase mb-3">📍 Ubicación</h3>
        ${r.location_analysis ? `
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">Vecindario</td><td class="py-1.5 text-right">${r.location_analysis.neighborhood || '—'}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">Schools</td><td class="py-1.5 text-right">${r.location_analysis.schools_rating || '—'}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">Crimen</td><td class="py-1.5 text-right">${r.location_analysis.crime_level || '—'}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">Walkability</td><td class="py-1.5 text-right">${r.location_analysis.walkability_score || '—'}/100</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-500">Commute downtown</td><td class="py-1.5 text-right">${r.location_analysis.commute_downtown_minutes || '—'} min</td></tr>
              <tr><td class="py-1.5 text-slate-500">Gentrification</td><td class="py-1.5 text-right">${r.location_analysis.gentrification_trend || '—'}</td></tr>
            </tbody>
          </table>
        ` : '<p class="text-xs text-slate-400">Sin data</p>'}
      </div>

      <!-- MARKET -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase mb-3">📊 Mercado y ARV</h3>
        ${r.market_analysis ? `
          <div class="mb-2">
            <div class="text-[10px] text-slate-500 uppercase font-bold">ARV validado por Claude</div>
            <div class="text-2xl font-bold ${r.market_analysis.arv_vs_estimate_pct < -5 ? 'text-red-700' : r.market_analysis.arv_vs_estimate_pct > 5 ? 'text-emerald-700' : 'text-slate-900'}">${paFmt(r.market_analysis.arv_validated)}</div>
            <div class="text-[10px] ${r.market_analysis.arv_vs_estimate_pct < 0 ? 'text-red-600' : 'text-emerald-600'}">vs tu estimado: ${r.market_analysis.arv_vs_estimate_pct > 0 ? '+' : ''}${(r.market_analysis.arv_vs_estimate_pct || 0).toFixed(1)}%</div>
          </div>
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">$/sqft mercado</td><td class="py-1 text-right">$${Math.round(r.market_analysis.ppsf_market || 0)}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">Trend YoY</td><td class="py-1 text-right">${r.market_analysis.market_trend_yoy || '—'}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">Días en mercado avg</td><td class="py-1 text-right">${r.market_analysis.days_on_market_avg || '—'}</td></tr>
              <tr><td class="py-1 text-slate-500">Demanda</td><td class="py-1 text-right">${r.market_analysis.demand_level || '—'}</td></tr>
            </tbody>
          </table>
          ${r.market_analysis.comps_found?.length ? `
            <div class="mt-3 text-[10px] font-bold text-slate-600 uppercase">Comps usados (${r.market_analysis.comps_found.length})</div>
            <div class="mt-1 space-y-1">
              ${r.market_analysis.comps_found.slice(0,5).map(c => `<div class="text-[10px] text-slate-600">• ${c.address} → ${paFmt(c.sold_price)} (${c.sqft}sqft · $${Math.round(c.ppsf||0)}/sqft)</div>`).join('')}
            </div>
          ` : ''}
        ` : '<p class="text-xs text-slate-400">Sin data</p>'}
      </div>

      <!-- RENTA -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 lg:col-span-2">
        <h3 class="text-sm font-bold text-slate-900 uppercase mb-3">💵 Renta estimada por modelo</h3>
        ${r.market_analysis?.rent_estimates && r.financial_analysis?.cashflow_by_model ? `
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
            ${[
              {key:'long_term', icon:'🏠', label:'Long-term'},
              {key:'by_room', icon:'🛏️', label:'Por habitación'},
              {key:'mid_term', icon:'🗓️', label:'Mid-term'},
              {key:'short_term', icon:'✈️', label:'Short-term'}
            ].map(m => {
              const cf = r.financial_analysis.cashflow_by_model[m.key] || {};
              const isBest = r.financial_analysis.best_model === m.key;
              return `
                <div class="rounded-lg p-3 border-2 ${isBest ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}">
                  ${isBest ? '<div class="text-[10px] text-amber-700 font-bold mb-1">🏆 MEJOR</div>' : ''}
                  <div class="text-base">${m.icon} <span class="text-xs font-bold">${m.label}</span></div>
                  <div class="text-[10px] text-slate-500 mt-1">Bruto: ${paFmt(cf.gross_rent)}/mes</div>
                  <div class="text-[10px] text-slate-500">Gastos: ${paFmt(cf.expenses)}/mes</div>
                  <div class="text-lg font-bold ${cf.net_cashflow < 0 ? 'text-red-700' : cf.net_cashflow < 300 ? 'text-amber-700' : 'text-emerald-700'}">${paFmt(cf.net_cashflow)}/mes</div>
                </div>
              `;
            }).join('')}
          </div>
        ` : '<p class="text-xs text-slate-400">Sin data</p>'}
      </div>

      <!-- REMODEL -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase mb-3">🔨 Remodelación</h3>
        ${r.remodel_analysis ? `
          <div class="mb-2">
            <div class="text-[10px] text-slate-500 uppercase">Scope recomendado</div>
            <div class="text-sm font-bold uppercase">${r.remodel_analysis.scope_recommended}</div>
          </div>
          <div class="mb-2">
            <div class="text-[10px] text-slate-500 uppercase">Costo estimado</div>
            <div class="text-lg font-bold">${paFmt(r.remodel_analysis.estimated_cost_range?.typical)}</div>
            <div class="text-[10px] text-slate-500">Rango: ${paFmt(r.remodel_analysis.estimated_cost_range?.low)} - ${paFmt(r.remodel_analysis.estimated_cost_range?.high)}</div>
            <div class="text-[10px] text-slate-600 mt-1">vs tu estimado: ${r.remodel_analysis.vs_user_estimate || '—'}</div>
          </div>
          <div class="mb-2">
            <div class="text-[10px] text-slate-500 uppercase">Timeline</div>
            <div class="text-sm">${r.remodel_analysis.timeline_days || '?'} días</div>
          </div>
          ${r.remodel_analysis.hidden_costs_to_watch?.length ? `
            <div class="mt-2 text-[10px] font-bold text-amber-700 uppercase">⚠️ Costos ocultos</div>
            <ul class="text-[10px] text-slate-600 ml-3 list-disc">
              ${r.remodel_analysis.hidden_costs_to_watch.map(c => `<li>${c}</li>`).join('')}
            </ul>
          ` : ''}
        ` : '<p class="text-xs text-slate-400">Sin data</p>'}
      </div>

      <!-- FINANCIAL -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase mb-3">📈 Financial</h3>
        ${r.financial_analysis ? `
          <div class="mb-2 p-2 rounded ${r.financial_analysis.brrrr_check?.passes_brrrr_rule ? 'bg-emerald-50' : 'bg-red-50'}">
            <div class="text-[10px] font-bold uppercase ${r.financial_analysis.brrrr_check?.passes_brrrr_rule ? 'text-emerald-700' : 'text-red-700'}">BRRRR check: ${r.financial_analysis.brrrr_check?.passes_brrrr_rule ? '✓ PASA' : '❌ NO PASA'}</div>
            <div class="text-[10px] text-slate-600 mt-0.5">${r.financial_analysis.brrrr_check?.explanation || ''}</div>
          </div>
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">Total in (precio + remodel)</td><td class="py-1 text-right font-bold">${paFmt(r.financial_analysis.brrrr_check?.total_in)}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">75% del ARV</td><td class="py-1 text-right">${paFmt(r.financial_analysis.brrrr_check?.arv_75_pct)}</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">Cap rate</td><td class="py-1 text-right">${(r.financial_analysis.cap_rate_pct||0).toFixed(2)}%</td></tr>
              <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">COC return</td><td class="py-1 text-right">${(r.financial_analysis.coc_return_pct||0).toFixed(1)}%</td></tr>
              <tr><td class="py-1 text-slate-500">Breakeven</td><td class="py-1 text-right">${r.financial_analysis.breakeven_months || '—'} meses</td></tr>
            </tbody>
          </table>
        ` : '<p class="text-xs text-slate-400">Sin data</p>'}
      </div>

      <!-- RIESGOS + STRENGTHS -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 lg:col-span-2">
        <div class="grid lg:grid-cols-2 gap-4">
          <div>
            <h3 class="text-sm font-bold text-red-700 uppercase mb-2">⚠️ Riesgos identificados</h3>
            <ul class="space-y-2 text-xs">
              ${(r.risks || []).map(rk => `
                <li class="border-l-4 ${rk.severity==='high'?'border-red-500 bg-red-50':rk.severity==='medium'?'border-amber-500 bg-amber-50':'border-slate-300 bg-slate-50'} pl-2 py-1">
                  <div class="font-bold">${rk.risk} <span class="text-[10px] uppercase">(${rk.severity})</span></div>
                  <div class="text-slate-600">${rk.mitigation}</div>
                </li>
              `).join('') || '<li class="text-slate-400">Sin riesgos identificados</li>'}
            </ul>
          </div>
          <div>
            <h3 class="text-sm font-bold text-emerald-700 uppercase mb-2">✅ Fortalezas</h3>
            <ul class="space-y-1 text-xs">
              ${(r.strengths || []).map(s => `<li class="border-l-4 border-emerald-400 bg-emerald-50 pl-2 py-1">${s}</li>`).join('') || '<li class="text-slate-400">—</li>'}
            </ul>
            ${r.recommendation?.deal_breakers?.length ? `
              <h3 class="text-sm font-bold text-red-900 uppercase mt-3 mb-2">🚫 Deal breakers</h3>
              <ul class="space-y-1 text-xs">
                ${r.recommendation.deal_breakers.map(d => `<li class="border-l-4 border-red-700 bg-red-50 pl-2 py-1 font-bold">${d}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- NEXT STEPS -->
      ${r.next_steps?.length ? `
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 lg:col-span-2">
        <h3 class="text-sm font-bold text-blue-900 uppercase mb-2">👉 Próximos pasos</h3>
        <ol class="space-y-1 text-xs text-blue-950 list-decimal ml-4">
          ${r.next_steps.map(s => `<li>${s}</li>`).join('')}
        </ol>
      </div>
      ` : ''}
    </div>
  `;
}

function paRenderHistory() {
  const body = document.getElementById('pa-body');
  body.innerHTML = `
    <div class="overflow-x-auto border border-slate-200 rounded-lg">
      <table class="w-full text-sm">
        <thead class="bg-slate-50"><tr><th class="text-left py-2 px-2">Dirección</th><th class="text-center py-2 px-2">Status</th><th class="text-center py-2 px-2">Decisión</th><th class="text-center py-2 px-2">Score</th><th class="text-right py-2 px-2">Máx oferta</th><th class="text-right py-2 px-2">Fecha</th><th></th></tr></thead>
        <tbody>
          ${paState.analyses.map(a => {
            const r = a.result || {};
            const dec = a.decision || r.recommendation?.decision || '—';
            const decColor = dec === 'buy' ? 'text-green-700 bg-green-50' : dec === 'pass' ? 'text-red-700 bg-red-50' : dec === 'negotiate' ? 'text-amber-700 bg-amber-50' : 'text-slate-500';
            return `<tr class="border-t border-slate-200 hover:bg-slate-50">
              <td class="py-2 px-2 font-semibold">${a.address}</td>
              <td class="py-2 px-2 text-center"><span class="text-[10px] px-2 py-0.5 rounded ${a.status==='done'?'bg-green-100 text-green-700':a.status==='error'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700 animate-pulse'}">${a.status}</span></td>
              <td class="py-2 px-2 text-center"><span class="text-xs font-bold px-2 py-0.5 rounded ${decColor}">${dec.toUpperCase()}</span></td>
              <td class="py-2 px-2 text-center font-bold">${a.score || '—'}/10</td>
              <td class="py-2 px-2 text-right">${paFmt(r.recommendation?.max_offer_price)}</td>
              <td class="py-2 px-2 text-right text-xs text-slate-500">${new Date(a.created_at).toLocaleDateString()}</td>
              <td class="py-2 px-2 text-right whitespace-nowrap">
                <button onclick="paViewAnalysis('${a.id}')" class="text-xs text-slate-600 hover:text-slate-900 mr-1">👁️ Ver</button>
                <button onclick="paDeleteAnalysis('${a.id}')" class="text-xs text-red-600 hover:text-red-800">🗑</button>
              </td>
            </tr>`;
          }).join('') || '<tr><td colspan="7" class="text-center text-slate-400 py-8">Sin análisis previos</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function paViewAnalysis(id) {
  paState.currentAnalysisId = id;
  paState.tab = 'result';
  paRender();
}

async function paDeleteAnalysis(id) {
  if (!confirm('¿Borrar este análisis?')) return;
  await sb.from('property_analyses').delete().eq('id', id);
  await paLoadAnalyses();
  paRender();
}

async function paRetry(id) {
  await sb.from('property_analyses').update({ status: 'pending', error_message: null }).eq('id', id);
  paStartPolling(id);
  await paLoadAnalyses();
  paRender();
  sb.functions.invoke('deep-property-analysis', { body: { analysisId: id } }).catch(e => console.error(e));
}
