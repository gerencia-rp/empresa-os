// ============================================================
// CALCULADORA DE PRÉSTAMOS — HML & 30-year conventional
// Defaults calibrados mercado mayo 2026
// ============================================================

const loanState = {
  sys: null,
  propertyId: null,
  mode: 'hml',
  // Inputs de la propiedad
  purchasePrice: 200000,
  remodelCost: 40000,
  arv: 320000,
  // HML
  hmlLtcPct: 85,           // Loan to Cost típico mayo 2026
  hmlRatePct: 11,          // tasa interés (interest only)
  hmlPointsPct: 2,         // origination points
  hmlTermMonths: 12,
  hmlClosingFlat: 2500,    // appraisal, title, legal
  // Conv 30yr (DSCR/investor)
  convLtvPct: 75,          // LTV del ARV
  convRatePct: 7.5,        // tasa 30y investor 2026
  convTermMonths: 360,
  convClosingPct: 4,       // % del loan (ya lo viste en tus closing statements)
  // Impuestos + seguro — para calcular PITI real (lo que el dueño paga mensual)
  propertyTaxAnnualPct: 2.2,  // % del ARV. Austin/Travis: 2.0-2.5% típico
  insuranceAnnual: 1900,     // $/año. Single family Texas ~$1.5k-2.2k típico
};

const loanFmt = n => '$' + Math.round(n || 0).toLocaleString('en-US');

function loanCalc() {
  // HML
  const hmlBase = (+loanState.purchasePrice || 0) + (+loanState.remodelCost || 0);
  const hmlLoan = hmlBase * ((+loanState.hmlLtcPct || 0) / 100);
  const hmlCash = hmlBase - hmlLoan;
  const hmlMonthlyInt = hmlLoan * ((+loanState.hmlRatePct || 0) / 100) / 12; // interest only
  const hmlOrigination = hmlLoan * ((+loanState.hmlPointsPct || 0) / 100);
  const hmlTotalInt = hmlMonthlyInt * (+loanState.hmlTermMonths || 0);
  const hmlTotalCost = hmlOrigination + hmlTotalInt + (+loanState.hmlClosingFlat || 0);

  // Conv 30yr (P&I amortizado)
  const convLoan = (+loanState.arv || 0) * ((+loanState.convLtvPct || 0) / 100);
  const r = (+loanState.convRatePct || 0) / 100 / 12;
  const n = +loanState.convTermMonths || 360;
  const convMonthly = r > 0 ? convLoan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : convLoan / n;
  const convTotalPaid = convMonthly * n;
  const convTotalInt = convTotalPaid - convLoan;
  const convClosingCost = convLoan * ((+loanState.convClosingPct || 0) / 100);
  // Cash-out al refi: lo que sobra después de pagar el HML
  const convCashOut = convLoan - hmlLoan - convClosingCost;

  // PITI: lo que el dueño realmente paga mensual (P&I + Tax + Insurance)
  const propertyTaxAnnual = (+loanState.arv || 0) * ((+loanState.propertyTaxAnnualPct || 0) / 100);
  const monthlyTax = propertyTaxAnnual / 12;
  const monthlyInsurance = (+loanState.insuranceAnnual || 0) / 12;
  const convPITI = convMonthly + monthlyTax + monthlyInsurance;
  // Vs renta mensual estimada (regla DSCR: rent / PITI >= 1.2 es saludable)
  const dscrTarget = convPITI > 0 ? convPITI * 1.2 : 0;  // renta mínima recomendada

  return {
    hml: { loan: hmlLoan, cash: hmlCash, monthlyInt: hmlMonthlyInt, origination: hmlOrigination, totalInt: hmlTotalInt, totalCost: hmlTotalCost, base: hmlBase },
    conv: {
      loan: convLoan, monthly: convMonthly, totalPaid: convTotalPaid, totalInt: convTotalInt,
      closingCost: convClosingCost, cashOut: convCashOut,
      monthlyTax, monthlyInsurance, piti: convPITI,
      propertyTaxAnnual, dscrTarget
    }
  };
}

// ─── ENTRY POINT ───
async function openLoanCalculator(sys) {
  loanState.sys = sys;
  // Inicializar contenedor de datos por propiedad
  if (!sys.data) sys.data = {};
  if (!sys.data.byProperty) sys.data.byProperty = {};
  if (!sys.data.lastPropertyId) sys.data.lastPropertyId = null;
  await loadProperties();
  // Restaurar la última propiedad/cálculo donde el usuario estaba
  if (sys.data.lastPropertyId) {
    loanLoadFromSaved(sys.data.lastPropertyId);
  }
  openModal(`🏦 ${sys.name}`, '<div id="loan-root"></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-6xl');
  loanRender();
}

// Carga loanState desde sys.data.byProperty[propId] si existe
function loanLoadFromSaved(propId) {
  const sys = loanState.sys;
  if (!sys) return false;
  const saved = sys.data?.byProperty?.[propId];
  if (!saved) return false;
  // Cargar todos los campos guardados
  Object.assign(loanState, saved);
  loanState.propertyId = propId;
  return true;
}

// Persiste el estado actual del loan calc a sys.data.byProperty[propId]
function loanPersist() {
  const sys = loanState.sys;
  if (!sys || !loanState.propertyId) return; // solo guardamos si hay propiedad vinculada
  if (!sys.data.byProperty) sys.data.byProperty = {};
  const snapshot = {
    mode: loanState.mode,
    purchasePrice: loanState.purchasePrice,
    remodelCost: loanState.remodelCost,
    arv: loanState.arv,
    hmlLtcPct: loanState.hmlLtcPct,
    hmlRatePct: loanState.hmlRatePct,
    hmlPointsPct: loanState.hmlPointsPct,
    hmlTermMonths: loanState.hmlTermMonths,
    hmlClosingFlat: loanState.hmlClosingFlat,
    convLtvPct: loanState.convLtvPct,
    convRatePct: loanState.convRatePct,
    convTermMonths: loanState.convTermMonths,
    convClosingPct: loanState.convClosingPct,
    propertyTaxAnnualPct: loanState.propertyTaxAnnualPct,
    insuranceAnnual: loanState.insuranceAnnual,
    _updatedAt: new Date().toISOString()
  };
  sys.data.byProperty[loanState.propertyId] = snapshot;
  sys.data.lastPropertyId = loanState.propertyId;
  saveSystemData(sys);
  loanShowSavedBadge();
}

function loanShowSavedBadge() {
  const b = document.getElementById('loan-saved-badge');
  if (!b) return;
  b.textContent = '💾 Guardado ' + new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  b.classList.remove('opacity-0'); b.classList.add('opacity-100');
  clearTimeout(loanState._savedTimer);
  loanState._savedTimer = setTimeout(() => { b.classList.remove('opacity-100'); b.classList.add('opacity-0'); }, 2000);
}

function loanOnPropertyChange(propId) {
  if (!propId) { loanState.propertyId = null; loanRender(); return; }
  const p = window.propertiesCache.find(x => x.id === propId);
  if (!p) return;
  loanState.propertyId = p.id;
  // 1) Cargar lo que tengamos guardado para esta propiedad (preserva los inputs del usuario)
  const restored = loanLoadFromSaved(p.id);
  // 2) Si NO había nada guardado, traer defaults desde la tabla properties
  if (!restored) {
    if (p.purchase_price) loanState.purchasePrice = +p.purchase_price;
    if (p.remodel_cost_estimated) loanState.remodelCost = +p.remodel_cost_estimated;
    if (p.arv) loanState.arv = +p.arv;
    if (p.ltv_pct) loanState.convLtvPct = +p.ltv_pct;
  }
  // 3) Actualizar lastPropertyId aunque no haya datos guardados aún
  if (loanState.sys && loanState.sys.data) {
    loanState.sys.data.lastPropertyId = p.id;
    saveSystemData(loanState.sys);
  }
  loanRender();
}

async function loanRunAI(force = false) {
  window._aiRefreshCb = () => loanRender();
  await aiAnalyze('loan-calculator', {
    purchase_price: loanState.purchasePrice,
    remodel_cost: loanState.remodelCost,
    arv: loanState.arv,
    mode: loanState.mode,
    hml_ltc: loanState.hmlLtcPct,
    hml_rate: loanState.hmlRatePct,
    conv_ltv: loanState.convLtvPct,
    conv_rate: loanState.convRatePct
  }, force);
}

async function loanSaveProperty() {
  const r = loanCalc();
  const propAddr = window.propertiesCache.find(p => p.id === loanState.propertyId)?.address;
  const payload = {
    address: propAddr || `Deal ${loanFmt(loanState.purchasePrice)}`,
    purchase_price: loanState.purchasePrice,
    remodel_cost_estimated: loanState.remodelCost,
    arv: loanState.arv,
    ltv_pct: loanState.convLtvPct,
    mortgage_monthly: r.conv.piti,  // PITI completo (P&I + Tax + Insurance) — lo que realmente paga el dueño
    payoff_hml: r.hml.loan,
    cashout_estimated: r.conv.cashOut
  };
  const newId = await upsertProperty(payload, loanState.propertyId);
  if (newId) {
    loanState.propertyId = newId;
    await loadProperties();
    loanRender();
    alert('✓ Propiedad guardada con HML loan + Conv 30y monthly + cash-out');
  }
}

function loanRender() {
  const r = loanCalc();
  const root = document.getElementById('loan-root');
  const m = loanState.mode;

  root.innerHTML = `
    ${propertySelectorHtml(loanState.propertyId, 'loanOnPropertyChange', 'loanSaveProperty')}
    ${loanState.propertyId ? `
      <div class="flex items-center justify-between text-[10px] mb-3 -mt-1">
        <span class="text-emerald-700 font-bold">🔒 Auto-guardado por propiedad — tus números persisten al cerrar el modal</span>
        <span id="loan-saved-badge" class="text-emerald-600 font-bold opacity-0 transition-opacity"></span>
      </div>
    ` : `
      <div class="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900 mb-3">
        ⚠️ <strong>Estás en modo "one-off"</strong> — los cálculos NO se guardan. Vinculá una propiedad arriba para que se guarden automáticamente.
      </div>
    `}

    <!-- Toggle tipo de préstamo -->
    <div class="flex gap-2 mb-4">
      <button onclick="loanState.mode='hml'; loanRender(); loanPersist()" class="flex-1 p-3 rounded-lg border-2 ${m==='hml'?'border-orange-500 bg-orange-50':'border-slate-200 hover:border-slate-400'}">
        <div class="text-2xl mb-1">⚡</div>
        <div class="text-sm font-bold ${m==='hml'?'text-orange-900':''}">Hard Money Lender</div>
        <div class="text-[10px] text-slate-500">Corto plazo (6-12m) · Interest only · 10-13%</div>
      </button>
      <button onclick="loanState.mode='conv'; loanRender(); loanPersist()" class="flex-1 p-3 rounded-lg border-2 ${m==='conv'?'border-blue-500 bg-blue-50':'border-slate-200 hover:border-slate-400'}">
        <div class="text-2xl mb-1">🏛️</div>
        <div class="text-sm font-bold ${m==='conv'?'text-blue-900':''}">Convencional 30 años (Refi)</div>
        <div class="text-[10px] text-slate-500">Largo plazo · P&I amortizado · 7-8%</div>
      </button>
      <button onclick="loanState.mode='compare'; loanRender(); loanPersist()" class="flex-1 p-3 rounded-lg border-2 ${m==='compare'?'border-slate-900 bg-slate-100':'border-slate-200 hover:border-slate-400'}">
        <div class="text-2xl mb-1">⚖️</div>
        <div class="text-sm font-bold ${m==='compare'?'text-slate-900':''}">Comparar BRRRR completo</div>
        <div class="text-[10px] text-slate-500">HML → Refi → Cash-out</div>
      </button>
    </div>

    <div class="grid lg:grid-cols-12 gap-5">
      <!-- INPUTS -->
      <div class="lg:col-span-7 space-y-3">
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-3">📋 Datos del deal</h3>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Precio compra</label>
              <input type="number" value="${loanState.purchasePrice}" onchange="loanState.purchasePrice=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
            </div>
            <div>
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5">Costo remodelación</label>
              <input type="number" value="${loanState.remodelCost}" onchange="loanState.remodelCost=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
            </div>
            <div>
              <label class="block text-[10px] font-medium text-slate-500 mb-0.5">ARV (después remodel)</label>
              <input type="number" value="${loanState.arv}" onchange="loanState.arv=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-base font-bold" />
            </div>
          </div>
          <p class="text-[10px] text-slate-400 mt-2">Base HML = Precio + Remodel = ${loanFmt(loanState.purchasePrice + loanState.remodelCost)} · Loan-to-ARV implícito = ${(((loanState.purchasePrice + loanState.remodelCost) / (loanState.arv || 1)) * 100).toFixed(1)}%</p>
        </div>

        ${m === 'hml' || m === 'compare' ? `
          <div class="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <h3 class="text-xs font-bold text-orange-900 uppercase mb-3">⚡ Configuración Hard Money Lender</h3>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-slate-600 mb-0.5">LTC % (Loan to Cost)</label>
                <input type="number" step="1" value="${loanState.hmlLtcPct}" onchange="loanState.hmlLtcPct=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <p class="text-[9px] text-slate-400">Mkt: 80-90% (purchase + rehab)</p>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-slate-600 mb-0.5">Tasa anual %</label>
                <input type="number" step="0.25" value="${loanState.hmlRatePct}" onchange="loanState.hmlRatePct=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <p class="text-[9px] text-slate-400">Mkt 2026: 10-13% (interest only)</p>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-slate-600 mb-0.5">Origination % (points)</label>
                <input type="number" step="0.5" value="${loanState.hmlPointsPct}" onchange="loanState.hmlPointsPct=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <p class="text-[9px] text-slate-400">Mkt: 1-3 points</p>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-slate-600 mb-0.5">Plazo (meses)</label>
                <input type="number" value="${loanState.hmlTermMonths}" onchange="loanState.hmlTermMonths=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <p class="text-[9px] text-slate-400">Típico 6-12 meses</p>
              </div>
              <div class="col-span-2">
                <label class="block text-[10px] font-medium text-slate-600 mb-0.5">Closing costs adicionales (flat)</label>
                <input type="number" value="${loanState.hmlClosingFlat}" onchange="loanState.hmlClosingFlat=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <p class="text-[9px] text-slate-400">Appraisal + title + legal típico $2-3K</p>
              </div>
            </div>
          </div>
        ` : ''}

        ${m === 'conv' || m === 'compare' ? `
          <div class="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 class="text-xs font-bold text-blue-900 uppercase mb-3">🏛️ Configuración 30 años (Refi)</h3>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-slate-600 mb-0.5">LTV % del ARV</label>
                <input type="number" step="1" value="${loanState.convLtvPct}" onchange="loanState.convLtvPct=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <p class="text-[9px] text-slate-400">Mkt DSCR investor: 70-80%</p>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-slate-600 mb-0.5">Tasa anual %</label>
                <input type="number" step="0.125" value="${loanState.convRatePct}" onchange="loanState.convRatePct=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <p class="text-[9px] text-slate-400">Mkt 2026 investor: 7.25-8.0%</p>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-slate-600 mb-0.5">Plazo (meses)</label>
                <select onchange="loanState.convTermMonths=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                  <option value="360" ${loanState.convTermMonths===360?'selected':''}>360 (30 años)</option>
                  <option value="240" ${loanState.convTermMonths===240?'selected':''}>240 (20 años)</option>
                  <option value="180" ${loanState.convTermMonths===180?'selected':''}>180 (15 años)</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-slate-600 mb-0.5">Closing costs %</label>
                <input type="number" step="0.5" value="${loanState.convClosingPct}" onchange="loanState.convClosingPct=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                <p class="text-[9px] text-slate-400">Tu data real: ~8% (incluye escrow). Aprox ${loanFmt((loanState.arv * loanState.convLtvPct / 100) * loanState.convClosingPct / 100)}</p>
              </div>
            </div>

            <!-- Impuestos + Seguro para calcular PITI real -->
            <div class="mt-3 pt-3 border-t border-blue-200">
              <h4 class="text-[10px] font-bold text-blue-900 uppercase mb-2">🏠 Impuestos + Seguro (escrow mensual)</h4>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-medium text-slate-600 mb-0.5">Property tax % anual del ARV</label>
                  <input type="number" step="0.1" value="${loanState.propertyTaxAnnualPct}" onchange="loanState.propertyTaxAnnualPct=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                  <p class="text-[9px] text-slate-400">Austin/Travis típico: 2.0-2.5% · Aprox ${loanFmt(loanState.arv * loanState.propertyTaxAnnualPct / 100)} /año</p>
                </div>
                <div>
                  <label class="block text-[10px] font-medium text-slate-600 mb-0.5">Seguro anual ($)</label>
                  <input type="number" step="50" value="${loanState.insuranceAnnual}" onchange="loanState.insuranceAnnual=+this.value; loanRender(); loanPersist()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
                  <p class="text-[9px] text-slate-400">Texas SFH típico: $1,500-$2,200/año · ${loanFmt(loanState.insuranceAnnual/12)} /mes</p>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- RESULTADOS -->
      <div class="lg:col-span-5 space-y-3">
        ${m === 'hml' ? loanRenderHmlResult(r) : m === 'conv' ? loanRenderConvResult(r) : loanRenderCompareResult(r)}
        ${aiBoxHtml('loan-calculator', 'Traer tasas y lenders reales mayo 2026', 'Claude busca HML/conv activos en TX: LTC, rate, points, lenders top, requisitos DSCR', 'loanRunAI')}
      </div>
    </div>
  `;
  setTimeout(() => {
    const aiState = window.aiState['loan-calculator'];
    const el = document.getElementById('ai-result-loan-calculator');
    if (el && aiState?.analysis) el.innerHTML = aiResultGenericHtml(aiState.analysis);
  }, 50);
}

function loanRenderHmlResult(r) {
  return `
    <div class="bg-orange-500 text-white rounded-xl p-5">
      <div class="text-xs font-bold text-orange-100 uppercase">⚡ HML te presta</div>
      <div class="text-4xl font-bold">${loanFmt(r.hml.loan)}</div>
      <div class="text-xs text-orange-100 mt-1">${loanState.hmlLtcPct}% de ${loanFmt(r.hml.base)} (precio + remodel)</div>
    </div>
    <div class="bg-slate-900 text-white rounded-xl p-4">
      <div class="text-xs font-bold text-slate-400 uppercase mb-2">Pago mensual (interest only)</div>
      <div class="text-3xl font-bold">${loanFmt(r.hml.monthlyInt)}/mes</div>
      <div class="text-xs text-slate-400 mt-1">Por ${loanState.hmlTermMonths} meses</div>
    </div>
    <div class="bg-white rounded-lg p-4 border border-slate-200">
      <div class="text-xs font-bold text-slate-700 uppercase mb-2">Desglose total del HML</div>
      <table class="w-full text-xs">
        <tbody>
          <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-600">Cash que TÚ pones</td><td class="py-1.5 text-right font-bold text-red-700">${loanFmt(r.hml.cash)}</td></tr>
          <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-600">+ Origination (${loanState.hmlPointsPct} pts)</td><td class="py-1.5 text-right text-red-600">${loanFmt(r.hml.origination)}</td></tr>
          <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-600">+ Intereses (${loanState.hmlTermMonths}m)</td><td class="py-1.5 text-right text-red-600">${loanFmt(r.hml.totalInt)}</td></tr>
          <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-600">+ Closing costs flat</td><td class="py-1.5 text-right text-red-600">${loanFmt(loanState.hmlClosingFlat)}</td></tr>
          <tr class="border-t-2 border-slate-300"><td class="py-1.5 font-bold">= Costo total del HML</td><td class="py-1.5 text-right font-bold text-slate-900">${loanFmt(r.hml.totalCost)}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950">
      <strong>💡 Tips HML mayo 2026:</strong>
      <ul class="mt-1 ml-4 list-disc space-y-0.5">
        <li>LTC actual market: 80-90%. Si te ofrecen menos, negocia.</li>
        <li>Rate 10-13% es estándar. Más alto = lender riesgoso.</li>
        <li>Points: 1-3. Algunos lenders 0 points pero rate más alta.</li>
        <li>Plazo 6-12 meses. Extender después cuesta $1-2K fee.</li>
      </ul>
    </div>
  `;
}

function loanRenderConvResult(r) {
  return `
    <div class="bg-blue-600 text-white rounded-xl p-5">
      <div class="text-xs font-bold text-blue-100 uppercase">🏛️ Banco te presta</div>
      <div class="text-4xl font-bold">${loanFmt(r.conv.loan)}</div>
      <div class="text-xs text-blue-100 mt-1">${loanState.convLtvPct}% del ARV ${loanFmt(loanState.arv)}</div>
    </div>

    <!-- PITI = lo que el dueño realmente paga cada mes -->
    <div class="bg-slate-900 text-white rounded-xl p-4">
      <div class="text-xs font-bold text-slate-400 uppercase mb-1">💰 Pago mensual TOTAL (PITI)</div>
      <div class="text-4xl font-bold text-emerald-300">${loanFmt(r.conv.piti)}/mes</div>
      <div class="text-[10px] text-slate-400 mt-1">Esto es lo que vas a quedar pagando cada mes</div>
      <div class="mt-3 pt-3 border-t border-slate-700 space-y-1.5 text-xs">
        <div class="flex justify-between"><span class="text-slate-300">Principal + Interés (banco)</span><span class="font-bold">${loanFmt(r.conv.monthly)}</span></div>
        <div class="flex justify-between"><span class="text-slate-300">Property Tax (${loanState.propertyTaxAnnualPct}% del ARV)</span><span class="font-bold">${loanFmt(r.conv.monthlyTax)}</span></div>
        <div class="flex justify-between"><span class="text-slate-300">Insurance</span><span class="font-bold">${loanFmt(r.conv.monthlyInsurance)}</span></div>
        <div class="flex justify-between border-t border-slate-700 pt-1.5 mt-1.5">
          <span class="text-emerald-300 font-bold">= Total PITI</span>
          <span class="font-bold text-emerald-300">${loanFmt(r.conv.piti)}</span>
        </div>
      </div>
    </div>

    <!-- Análisis DSCR (¿es buen rental?) -->
    <div class="bg-amber-50 border border-amber-300 rounded-lg p-3">
      <div class="text-xs font-bold text-amber-900 uppercase mb-1">📊 Para que sea rentable necesitas</div>
      <div class="text-2xl font-bold text-amber-900">${loanFmt(r.conv.dscrTarget)} /mes de renta</div>
      <div class="text-[10px] text-amber-800 mt-1">DSCR 1.20 = renta cubre 120% del PITI (estándar lender investor TX)</div>
    </div>

    <!-- Desglose vida del préstamo -->
    <div class="bg-white rounded-lg p-4 border border-slate-200">
      <div class="text-xs font-bold text-slate-700 uppercase mb-2">Vida completa del préstamo</div>
      <table class="w-full text-xs">
        <tbody>
          <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-600">Principal (loan)</td><td class="py-1.5 text-right">${loanFmt(r.conv.loan)}</td></tr>
          <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-600">+ Intereses totales (${loanState.convTermMonths/12} años)</td><td class="py-1.5 text-right text-red-600">${loanFmt(r.conv.totalInt)}</td></tr>
          <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-600">Total pagado al banco</td><td class="py-1.5 text-right font-bold">${loanFmt(r.conv.totalPaid)}</td></tr>
          <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-600">Closing costs al refi (${loanState.convClosingPct}%)</td><td class="py-1.5 text-right text-red-600">${loanFmt(r.conv.closingCost)}</td></tr>
          <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-600">Property tax anual</td><td class="py-1.5 text-right text-amber-700">${loanFmt(r.conv.propertyTaxAnnual)}</td></tr>
          <tr class="border-b border-slate-100"><td class="py-1.5 text-slate-600">Insurance anual</td><td class="py-1.5 text-right text-amber-700">${loanFmt(loanState.insuranceAnnual)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-950">
      <strong>💡 Refi a 30 años — mayo 2026:</strong>
      <ul class="mt-1 ml-4 list-disc space-y-0.5">
        <li>DSCR loans investor: 7.25-8.0% (peor que owner-occupied)</li>
        <li>LTV 75% es estándar cash-out. 70% si DSCR < 1.2</li>
        <li>Property tax Travis: 2.0-2.5% del valor. Austin SFH típico 2.2%</li>
        <li>Insurance TX: $1,500-$2,200/año single family</li>
        <li>Pago va al Predictor de Cashflow automáticamente al guardar</li>
      </ul>
    </div>
  `;
}

function loanRenderCompareResult(r) {
  const totalCashIn = r.hml.cash + r.hml.origination + r.hml.totalInt + loanState.hmlClosingFlat;
  const netCashOutOrIn = r.conv.cashOut;
  const netInvestment = totalCashIn - netCashOutOrIn;
  return `
    <div class="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-5">
      <h3 class="text-sm font-bold text-purple-900 uppercase mb-3">🔄 BRRRR Cycle Completo</h3>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between border-b border-purple-200 pb-1"><span class="text-slate-600">1. HML te presta</span><strong>${loanFmt(r.hml.loan)}</strong></div>
        <div class="flex justify-between border-b border-purple-200 pb-1"><span class="text-slate-600">2. Cash que pones (down + rehab no cubierto)</span><strong class="text-red-700">${loanFmt(r.hml.cash)}</strong></div>
        <div class="flex justify-between border-b border-purple-200 pb-1"><span class="text-slate-600">3. Intereses + fees HML (${loanState.hmlTermMonths}m)</span><strong class="text-red-700">${loanFmt(r.hml.totalInt + r.hml.origination + loanState.hmlClosingFlat)}</strong></div>
        <div class="flex justify-between border-b border-purple-200 pb-1"><span class="text-slate-600">4. Refi 30y te presta</span><strong>${loanFmt(r.conv.loan)}</strong></div>
        <div class="flex justify-between border-b border-purple-200 pb-1"><span class="text-slate-600">5. Pagas el HML</span><strong>−${loanFmt(r.hml.loan)}</strong></div>
        <div class="flex justify-between border-b border-purple-200 pb-1"><span class="text-slate-600">6. Closing costs refi</span><strong class="text-red-700">−${loanFmt(r.conv.closingCost)}</strong></div>
        <div class="flex justify-between pt-2">
          <span class="font-bold">💰 Cash-out al refi</span>
          <strong class="text-xl ${netCashOutOrIn < 0 ? 'text-red-700' : 'text-emerald-700'}">${loanFmt(netCashOutOrIn)}</strong>
        </div>
      </div>
    </div>

    <div class="bg-slate-900 text-white rounded-xl p-4">
      <div class="text-xs font-bold text-slate-400 uppercase mb-2">Cash neto invertido en el deal</div>
      <div class="text-3xl font-bold ${netInvestment < 0 ? 'text-emerald-400' : netInvestment < 10000 ? 'text-amber-400' : 'text-red-400'}">${loanFmt(netInvestment)}</div>
      <div class="text-xs text-slate-400 mt-1">${netInvestment < 0 ? '✓ Sacas más cash del que metiste (BRRRR perfecto)' : netInvestment < 10000 ? '⚠️ Casi BRRRR perfecto' : '❌ Quedas con dinero atado'}</div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="bg-orange-100 rounded-lg p-3 text-center">
        <div class="text-[10px] text-orange-700 font-bold uppercase">HML pago/mes</div>
        <div class="text-lg font-bold">${loanFmt(r.hml.monthlyInt)}</div>
      </div>
      <div class="bg-blue-100 rounded-lg p-3 text-center">
        <div class="text-[10px] text-blue-700 font-bold uppercase">Refi pago/mes</div>
        <div class="text-lg font-bold">${loanFmt(r.conv.monthly)}</div>
      </div>
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950">
      <strong>💡 BRRRR checks:</strong>
      <ul class="mt-1 ml-4 list-disc space-y-0.5">
        <li>${netCashOutOrIn >= 0 ? '✓' : '❌'} Cash-out positivo (sacas dinero al refi)</li>
        <li>${r.conv.loan >= r.hml.loan + r.conv.closingCost ? '✓' : '❌'} Refi cubre HML + closing</li>
        <li>${(loanState.purchasePrice + loanState.remodelCost) / loanState.arv < 0.75 ? '✓' : '❌'} Total in < 75% ARV (regla 70-75%)</li>
        <li>Guarda esta propiedad — el pago refi va automático al Predictor de Cashflow</li>
      </ul>
    </div>
  `;
}
