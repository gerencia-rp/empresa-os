// ============================================================
// PRONOSTICADOR DE REMODELACIÓN (Visita Previa)
// Motor de cálculo: presupuesto + cronograma por etapa.
// Combina: diagnóstico de afectación × coeficientes $/sqft × sqft,
// y patrón de tiempo × afectación normalizado × duración real.
// Complementa el Estimador Pro (remodel-pro.js).
// ============================================================

// Las 6 etapas macro (alineadas con RM_PHASES: 1..6)
const FC_STAGES = ['Demolición','Cimentación','Exterior','Estructura','Interior','Limpieza'];
const FC_STAGE_GROUP = { 'Demolición':'1','Cimentación':'2','Exterior':'3','Estructura':'4','Interior':'5','Limpieza':'6' };

// Coeficientes semilla (5 obras reales, ponderado, excluye ceros). EDITABLES.
// mo = mano de obra $/sqft · mat = material $/sqft · tiempo = % del tiempo total
const FC_SEED_COEF = {
  'Demolición':  { mo: 1.09,  mat: 0.23,  tiempo: 8  },
  'Cimentación': { mo: 0.00,  mat: 0.00,  tiempo: 4  },
  'Exterior':    { mo: 5.69,  mat: 4.19,  tiempo: 22 },
  'Estructura':  { mo: 3.21,  mat: 1.03,  tiempo: 18 },
  'Interior':    { mo: 16.72, mat: 11.29, tiempo: 40 },
  'Limpieza':    { mo: 1.27,  mat: 0.60,  tiempo: 8  }
};

// Estado del pronosticador (se hidrata desde Supabase; cae a semilla)
const fcState = {
  sys: null,
  coef: JSON.parse(JSON.stringify(FC_SEED_COEF)), // coeficientes activos
  coefFuente: 'semilla',          // 'semilla' | 'historico'
  otrosCostosPct: 0,              // % otros costos sobre subtotal (de Airtable)
  diasPorSqft: 0,                 // días/sqft promedio histórico (de Airtable)
  nThreshold: 3,                  // mín casas completas para usar históricos
  nCasasCompletas: 0,             // # casas con fecha real + sqft en Airtable
  totalPsfReal: 0,                // $/sqft real histórico (benchmark)
  moRatioReal: 0,                 // % MO real histórico
  diasPorSqftReal: 0,             // días/sqft real histórico
  otrosPctReal: 0,                // % otros costos real histórico
  costoHoraPromedio: 0,           // costo/hora promedio (de Horas trabajadas semana)
  totalHorasReal: 0,              // total horas registradas
  nTrabajadores: 0,               // # trabajadores con horas
  // Diagnóstico cargado (Visita Previa)
  diagnostico: null,
  resultado: null,
  crewSize: 1,
  costoHora: 0,                   // costo/hora promedio (de Airtable)
  forecasts: []                   // pronósticos guardados
};

// ─── VALIDACIÓN (condiciones de parada, sección 6 del prompt) ───
function fcValidarDiagnostico(diag) {
  const errores = [];
  if (!diag || typeof diag !== 'object') return ['El diagnóstico está vacío o no es un objeto válido.'];
  if (!diag.afectacion || typeof diag.afectacion !== 'object') {
    errores.push('Falta el objeto "afectacion".');
  } else {
    // Las 6 etapas deben existir
    FC_STAGES.forEach(s => {
      if (!(s in diag.afectacion)) {
        errores.push(`Falta la etapa "${s}" en afectacion (deben estar las 6).`);
      } else {
        const v = diag.afectacion[s];
        if (typeof v !== 'number' || isNaN(v) || v < 0 || v > 100) {
          errores.push(`"${s}": valor "${v}" fuera de rango 0–100.`);
        }
      }
    });
    // Avisar si trae etapas extra no reconocidas
    Object.keys(diag.afectacion).forEach(k => {
      if (!FC_STAGES.includes(k)) errores.push(`Etapa no reconocida: "${k}" (se ignorará).`);
    });
  }
  if (!diag.sqft || typeof diag.sqft !== 'number' || diag.sqft <= 0) {
    errores.push('Falta un "sqft" válido (> 0).');
  }
  return errores;
}

// ─── MOTOR PRINCIPAL ───
// diag: { propiedad, sqft, afectacion:{etapa:%} }
// opts: { coef, otrosCostosPct, duracionDias }
function fcCalcular(diag, opts = {}) {
  const coef = opts.coef || fcState.coef;
  const sqft = diag.sqft;
  const afect = diag.afectacion;

  // Suma de pesos ajustados para normalizar el cronograma
  const sumaPesos = FC_STAGES.reduce((s, e) => s + (coef[e].tiempo * (afect[e] / 100)), 0);

  let subtotal = 0, totalMO = 0, totalMat = 0;
  const etapas = FC_STAGES.map(e => {
    const factor = (afect[e] || 0) / 100;
    // Presupuesto por etapa (MO y material separados)
    const mo  = coef[e].mo  * sqft * factor;
    const mat = coef[e].mat * sqft * factor;
    const sub = mo + mat;
    subtotal += sub; totalMO += mo; totalMat += mat;
    // Peso de tiempo ajustado por afectación y normalizado a 100%
    const pesoAjustado = coef[e].tiempo * factor;
    const pesoNorm = sumaPesos > 0 ? (pesoAjustado / sumaPesos) : 0;
    return {
      etapa: e, group: FC_STAGE_GROUP[e], afect: afect[e] || 0,
      mo, mat, subtotal: sub,
      pesoAjustado, pesoNormPct: pesoNorm * 100, dias: 0
    };
  });

  // Cronograma: días por etapa = duración total × peso normalizado
  const duracionDias = +opts.duracionDias || 0;
  etapas.forEach(et => { et.dias = duracionDias * (et.pesoNormPct / 100); });

  // Otros costos (% del subtotal, promedio histórico)
  const otrosPct = opts.otrosCostosPct != null ? opts.otrosCostosPct : fcState.otrosCostosPct;
  const otrosCostos = subtotal * (otrosPct / 100);
  const presupuestoTotal = subtotal + otrosCostos;

  return {
    propiedad: diag.propiedad || '—',
    sqft, etapas,
    subtotal, totalMO, totalMat,
    otrosPct, otrosCostos, presupuestoTotal,
    duracionDias, duracionSemanas: duracionDias / 7,
    ppsf: sqft ? presupuestoTotal / sqft : 0,
    ppsfDirecto: sqft ? subtotal / sqft : 0
  };
}

// ─── DURACIÓN ESTIMADA para casa nueva (sin fecha real) ───
// dias_por_sqft histórico × sqft de la casa nueva
function fcDuracionEstimada(sqft, diasPorSqft) {
  const dps = diasPorSqft != null ? diasPorSqft : fcState.diasPorSqft;
  return Math.round((dps || 0) * sqft);
}

// ─── CUADRILLA: trade-off 1 persona vs grupo ───
// La carga de trabajo (horas-hombre) es fija para el alcance.
// Más personas → menos días calendario (paralelización), mismo costo de horas-hombre,
// pero menos días = menos holding cost (intereses, servicios, renta de equipo).
function fcCuadrilla(duracionBaseDias, crewSize, costoHora, opts = {}) {
  const horasPorDia = opts.horasPorDia || 8;
  const eficienciaParalelo = opts.eficienciaParalelo || 0.85; // rendimiento decreciente al sumar gente
  const holdingPorDia = opts.holdingPorDia || 0; // costo de tenencia por día (opcional)

  // Horas-hombre totales = duración de 1 persona × horas/día
  const horasHombre = duracionBaseDias * horasPorDia;

  function escenario(n) {
    // Días calendario con n personas (paralelización con eficiencia decreciente)
    const factor = n <= 1 ? 1 : (1 / (1 + (n - 1) * eficienciaParalelo));
    const dias = Math.ceil(duracionBaseDias * factor);
    const costoMO = horasHombre * (costoHora || 0); // mismas horas-hombre
    const holding = dias * holdingPorDia;
    return { personas: n, dias, costoMO, holding, costoTotal: costoMO + holding };
  }

  return {
    unaPersona: escenario(1),
    grupo: escenario(Math.max(1, crewSize)),
    horasHombre
  };
}

// ─── CARGA DE CONFIG desde Supabase (coeficientes + params) ───
async function fcLoadConfig() {
  try {
    const [{ data: coefRows }, { data: paramRows }, { data: fcs }] = await Promise.all([
      sb.from('remodel_forecast_coef').select('*').order('orden'),
      sb.from('remodel_forecast_params').select('*'),
      sb.from('remodel_forecasts').select('id,propiedad,sqft,presupuesto_total,duracion_total_dias,created_at').order('created_at', { ascending: false }).limit(50)
    ]);
    // Coeficientes
    if (coefRows && coefRows.length) {
      const c = {};
      let algunHistorico = false;
      coefRows.forEach(r => {
        c[r.grupo] = { mo: +r.mo_sqft, mat: +r.mat_sqft, tiempo: +r.tiempo_pct };
        if (r.fuente === 'historico') algunHistorico = true;
      });
      // Solo usar si están las 6 etapas; sino, semilla
      if (FC_STAGES.every(s => c[s])) {
        fcState.coef = c;
        fcState.coefFuente = algunHistorico ? 'historico' : 'semilla';
      }
    }
    // Parámetros (activos + benchmarks reales)
    (paramRows || []).forEach(p => {
      const v = +p.value || 0;
      if (p.key === 'otros_costos_pct') fcState.otrosCostosPct = v;
      if (p.key === 'dias_por_sqft') fcState.diasPorSqft = v;
      if (p.key === 'n_threshold') fcState.nThreshold = v || 3;
      if (p.key === 'n_casas_completas') fcState.nCasasCompletas = v;
      if (p.key === 'total_psf_real') fcState.totalPsfReal = v;
      if (p.key === 'mo_ratio_real') fcState.moRatioReal = v;
      if (p.key === 'dias_por_sqft_real') fcState.diasPorSqftReal = v;
      if (p.key === 'otros_costos_pct_real') fcState.otrosPctReal = v;
      if (p.key === 'costo_hora_promedio') fcState.costoHoraPromedio = v;
      if (p.key === 'total_horas_trabajadas') fcState.totalHorasReal = v;
      if (p.key === 'n_trabajadores') fcState.nTrabajadores = v;
    });
    // Si el formulario no tiene costoHora override y hay valor de Airtable, usarlo
    if (fcState.form && (!fcState.form.costoHora || fcState.form.costoHora === 0) && fcState.costoHoraPromedio > 0) {
      fcState.form.costoHora = fcState.costoHoraPromedio;
    }
    fcState.forecasts = fcs || [];
  } catch (e) {
    console.warn('fcLoadConfig fallback a semilla:', e.message);
    fcState.coef = JSON.parse(JSON.stringify(FC_SEED_COEF));
  }
}

// ─── ESTADO DEL FORMULARIO (Visita Previa) ───
fcState.form = {
  propiedad: '',
  sqft: 1500,
  afectacion: { 'Demolición':100, 'Cimentación':0, 'Exterior':100, 'Estructura':100, 'Interior':100, 'Limpieza':100 },
  duracionDias: 0,
  otrosCostosPctOverride: null,  // si el usuario edita el % manualmente
  crewSize: 1,
  costoHora: 0
};

const FC_STAGE_ICON = { 'Demolición':'⛏️','Cimentación':'🏗️','Exterior':'🏠','Estructura':'🪵','Interior':'🛏️','Limpieza':'🧹' };

// ─── RENDER PRINCIPAL DE LA TAB ───
function fcRenderTab(body) {
  const f = fcState.form;
  const errores = fcValidarDiagnostico({ sqft: f.sqft, afectacion: f.afectacion });
  const otrosPct = f.otrosCostosPctOverride != null ? f.otrosCostosPctOverride : fcState.otrosCostosPct;
  const r = errores.length ? null : fcCalcular(
    { propiedad: f.propiedad, sqft: f.sqft, afectacion: f.afectacion },
    { coef: fcState.coef, otrosCostosPct: otrosPct, duracionDias: f.duracionDias }
  );
  const crew = r ? fcCuadrilla(f.duracionDias || r.duracionDias || 0, f.crewSize, f.costoHora) : null;
  const duracionSugerida = fcDuracionEstimada(f.sqft);

  body.innerHTML = `
    <div class="grid lg:grid-cols-12 gap-4">
      <!-- IZQUIERDA: Visita Previa -->
      <div class="lg:col-span-5 space-y-3">
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-bold uppercase text-slate-700">📋 Visita Previa</h3>
            <span class="text-[10px] px-2 py-0.5 rounded ${fcState.coefFuente==='historico'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}">coef: ${fcState.coefFuente} (${fcState.nCasasCompletas||0}/${fcState.nThreshold} casas)</span>
          </div>
          <div class="grid grid-cols-3 gap-2 mb-3">
            <div class="col-span-2"><label class="block text-[10px] text-slate-500 mb-0.5">Propiedad</label><input value="${f.propiedad}" onchange="fcSet('propiedad', this.value)" placeholder="Ej: 1133 Denfield" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Sqft *</label><input type="number" value="${f.sqft}" onchange="fcSet('sqft', +this.value)" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-semibold" /></div>
          </div>

          <div class="text-[10px] font-bold uppercase text-slate-500 mb-1">Afectación por etapa (%)</div>
          <div class="space-y-1.5">
            ${FC_STAGES.map(s => `
              <div class="flex items-center gap-2">
                <span class="text-sm w-6 text-center">${FC_STAGE_ICON[s]}</span>
                <span class="text-xs flex-1">${s}</span>
                <div class="flex gap-0.5">
                  ${[0,50,100].map(v => `<button onclick="fcSetAfect('${s}',${v})" class="text-[10px] px-1.5 py-0.5 rounded ${f.afectacion[s]===v?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200'}">${v}</button>`).join('')}
                </div>
                <input type="number" min="0" max="100" value="${f.afectacion[s]}" onchange="fcSetAfect('${s}', +this.value)" class="w-16 border border-slate-300 rounded px-2 py-1 text-xs text-right" />
              </div>
            `).join('')}
          </div>

          <details class="mt-3">
            <summary class="text-[10px] text-slate-500 cursor-pointer hover:text-slate-700">📥 Cargar diagnóstico JSON (Taskade Visita Previa)</summary>
            <textarea id="fc-json" rows="4" placeholder='{"propiedad":"...","sqft":1500,"afectacion":{"Demolición":100,...}}' class="w-full border border-slate-300 rounded px-2 py-1.5 text-[11px] font-mono mt-1"></textarea>
            <button onclick="fcLoadJSON()" class="mt-1 w-full bg-slate-100 hover:bg-slate-200 text-xs py-1.5 rounded">Cargar JSON</button>
          </details>
        </div>

        <!-- Cronograma / duración -->
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold uppercase text-slate-700 mb-2">⏱️ Duración total</h3>
          <div class="flex items-center gap-2">
            <input type="number" value="${f.duracionDias}" onchange="fcSet('duracionDias', +this.value)" placeholder="días" class="w-24 border border-slate-300 rounded px-2 py-1.5 text-sm" />
            <span class="text-xs text-slate-500">días totales</span>
          </div>
          ${fcState.diasPorSqft > 0 ? `<button onclick="fcSet('duracionDias', ${duracionSugerida})" class="mt-2 text-[11px] text-blue-600 hover:underline">↳ Usar estimado histórico: ${duracionSugerida} días (${fcState.diasPorSqft.toFixed(4)} días/sqft × ${f.sqft})</button>` : '<p class="text-[10px] text-slate-400 mt-1">Sin días/sqft histórico aún. Ingresá la duración manual o se calcula con ≥'+fcState.nThreshold+' casas completas.</p>'}
        </div>

        <!-- Cuadrilla -->
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold uppercase text-slate-700 mb-2">👷 Cuadrilla</h3>
          <div class="grid grid-cols-2 gap-2">
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Tamaño grupo</label><input type="number" min="1" value="${f.crewSize}" onchange="fcSet('crewSize', Math.max(1,+this.value))" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Costo/hora $ ${fcState.costoHoraPromedio>0?`<span class="text-emerald-600">(auto $${fcState.costoHoraPromedio})</span>`:''}</label><input type="number" value="${f.costoHora}" onchange="fcSet('costoHora', +this.value)" placeholder="${fcState.costoHoraPromedio>0?fcState.costoHoraPromedio:'auto Airtable'}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
          </div>
        </div>
      </div>

      <!-- DERECHA: Resultado -->
      <div class="lg:col-span-7 space-y-3">
        ${errores.length ? `
          <div class="bg-red-50 border border-red-300 rounded-xl p-4">
            <div class="text-sm font-bold text-red-900 mb-1">⚠️ Corregí el diagnóstico antes de calcular</div>
            <ul class="text-xs text-red-800 list-disc list-inside">${errores.map(e=>`<li>${e}</li>`).join('')}</ul>
          </div>
        ` : fcRenderResultado(r, crew, otrosPct)}
      </div>
    </div>
  `;
}

function fcRenderResultado(r, crew, otrosPct) {
  return `
    <!-- KPIs -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div class="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-400 rounded-xl p-3">
        <div class="text-[10px] text-emerald-800 uppercase font-bold">Presupuesto total</div>
        <div class="text-2xl font-bold text-emerald-700">$${Math.round(r.presupuestoTotal).toLocaleString()}</div>
        <div class="text-[10px] text-emerald-800">$${r.ppsf.toFixed(0)}/sqft</div>
      </div>
      <div class="bg-slate-900 text-white rounded-xl p-3">
        <div class="text-[10px] text-slate-400 uppercase font-bold">Subtotal obra</div>
        <div class="text-xl font-bold">$${Math.round(r.subtotal).toLocaleString()}</div>
        <div class="text-[10px] text-slate-400">$${r.ppsfDirecto.toFixed(0)}/sqft directo</div>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div class="text-[10px] text-blue-700 uppercase font-bold">MO / Material</div>
        <div class="text-base font-bold text-blue-900">$${Math.round(r.totalMO/1000)}k / $${Math.round(r.totalMat/1000)}k</div>
        <div class="text-[10px] text-blue-700">${r.subtotal>0?Math.round(r.totalMO/r.subtotal*100):0}% / ${r.subtotal>0?Math.round(r.totalMat/r.subtotal*100):0}%</div>
      </div>
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div class="text-[10px] text-amber-700 uppercase font-bold">Duración</div>
        <div class="text-xl font-bold text-amber-900">${Math.round(r.duracionDias)} d</div>
        <div class="text-[10px] text-amber-700">${r.duracionSemanas.toFixed(1)} semanas</div>
      </div>
    </div>

    <!-- Tabla por etapa -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-xs">
        <thead class="bg-slate-50">
          <tr>
            <th class="text-left p-2">Etapa</th>
            <th class="text-right p-2">% Afect</th>
            <th class="text-right p-2">MO $</th>
            <th class="text-right p-2">Material $</th>
            <th class="text-right p-2">Subtotal $</th>
            <th class="text-right p-2">% tiempo</th>
            <th class="text-right p-2">Días</th>
          </tr>
        </thead>
        <tbody>
          ${r.etapas.map(e => `
            <tr class="border-t border-slate-100 ${e.subtotal===0?'opacity-40':''}">
              <td class="p-2 font-semibold">${FC_STAGE_ICON[e.etapa]} ${e.etapa}</td>
              <td class="p-2 text-right">${e.afect}%</td>
              <td class="p-2 text-right">$${Math.round(e.mo).toLocaleString()}</td>
              <td class="p-2 text-right">$${Math.round(e.mat).toLocaleString()}</td>
              <td class="p-2 text-right font-bold">$${Math.round(e.subtotal).toLocaleString()}</td>
              <td class="p-2 text-right text-slate-500">${e.pesoNormPct.toFixed(1)}%</td>
              <td class="p-2 text-right">${e.dias.toFixed(1)}</td>
            </tr>
          `).join('')}
          <tr class="border-t-2 border-slate-300 bg-slate-50 font-bold">
            <td class="p-2">Subtotal obra</td>
            <td class="p-2"></td>
            <td class="p-2 text-right">$${Math.round(r.totalMO).toLocaleString()}</td>
            <td class="p-2 text-right">$${Math.round(r.totalMat).toLocaleString()}</td>
            <td class="p-2 text-right">$${Math.round(r.subtotal).toLocaleString()}</td>
            <td class="p-2 text-right">100%</td>
            <td class="p-2 text-right">${Math.round(r.duracionDias)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${fcState.totalPsfReal > 0 ? `
    <!-- Benchmark vs histórico real -->
    <div class="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs">
      <div class="flex items-center justify-between">
        <span class="font-bold text-violet-900">📊 vs histórico real (${fcState.nCasasCompletas} casas completas)</span>
        <span class="text-[10px] ${fcState.nCasasCompletas>=fcState.nThreshold?'text-emerald-700':'text-amber-700'}">${fcState.nCasasCompletas>=fcState.nThreshold?'✅ refinando params':'aún con semilla (faltan '+(fcState.nThreshold-fcState.nCasasCompletas)+')'}</span>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-2">
        <div>Tu estimado: <strong>$${r.ppsfDirecto.toFixed(0)}/sqft</strong></div>
        <div>Real histórico: <strong>$${fcState.totalPsfReal.toFixed(0)}/sqft</strong></div>
        <div class="${r.ppsfDirecto > fcState.totalPsfReal*1.1 ? 'text-red-600' : r.ppsfDirecto < fcState.totalPsfReal*0.9 ? 'text-amber-600' : 'text-emerald-600'}">Δ ${fcState.totalPsfReal>0?((r.ppsfDirecto/fcState.totalPsfReal-1)*100).toFixed(0):0}%</div>
      </div>
      ${fcState.moRatioReal>0?`<div class="text-[10px] text-slate-500 mt-1">Ratio MO real: ${fcState.moRatioReal}% · días/sqft real: ${fcState.diasPorSqftReal.toFixed(4)} · otros real: ${fcState.otrosPctReal}%</div>`:''}
      ${fcState.costoHoraPromedio>0?`<div class="text-[10px] text-slate-500">Costo/hora real: $${fcState.costoHoraPromedio} · ${Math.round(fcState.totalHorasReal).toLocaleString()}h registradas · ${fcState.nTrabajadores} trabajadores</div>`:''}
    </div>
    ` : ''}

    <!-- Otros costos -->
    <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <span class="text-slate-600">Otros costos:</span>
        <input type="number" step="0.5" value="${otrosPct}" onchange="fcSet('otrosCostosPctOverride', +this.value)" class="w-16 border border-slate-300 rounded px-2 py-1 text-right" />
        <span class="text-slate-500">% del subtotal</span>
        ${fcState.otrosCostosPct>0?`<span class="text-[10px] text-slate-400">(auto Airtable: ${fcState.otrosCostosPct}%)</span>`:''}
      </div>
      <span class="font-bold">+ $${Math.round(r.otrosCostos).toLocaleString()}</span>
    </div>

    <!-- Cuadrilla trade-off -->
    <div class="bg-white border border-slate-200 rounded-xl p-3">
      <h3 class="text-xs font-bold uppercase text-slate-700 mb-2">👷 Trade-off cuadrilla (tiempo vs costo)</h3>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="bg-slate-50 rounded p-2">
          <div class="text-[10px] text-slate-500 uppercase">1 persona</div>
          <div class="text-lg font-bold">${crew.unaPersona.dias} días</div>
          ${crew.unaPersona.costoMO>0?`<div class="text-[10px] text-slate-500">MO $${Math.round(crew.unaPersona.costoMO).toLocaleString()}</div>`:''}
        </div>
        <div class="bg-emerald-50 rounded p-2">
          <div class="text-[10px] text-emerald-700 uppercase">Grupo de ${crew.grupo.personas}</div>
          <div class="text-lg font-bold text-emerald-700">${crew.grupo.dias} días</div>
          ${crew.grupo.costoMO>0?`<div class="text-[10px] text-emerald-600">MO $${Math.round(crew.grupo.costoMO).toLocaleString()} · ${Math.round(crew.unaPersona.dias-crew.grupo.dias)}d más rápido</div>`:`<div class="text-[10px] text-emerald-600">${Math.round(crew.unaPersona.dias-crew.grupo.dias)}d más rápido</div>`}
        </div>
      </div>
      <p class="text-[10px] text-slate-400 mt-2">Horas-hombre fijas (${Math.round(crew.horasHombre)}h). Más gente = menos días calendario; el costo MO de la obra no cambia, pero menos días = menos holding cost.</p>
    </div>

    <!-- Acciones -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
      <button onclick="fcSaveForecast()" class="bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-lg">💾 Guardar</button>
      <button onclick="fcExportXLSX()" class="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold py-2.5 rounded-lg" title="Excel multi-hoja: Config · Presupuesto · Cronograma">📥 Excel</button>
      <button onclick="fcExportCSV()" class="bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold py-2.5 rounded-lg" title="CSV plano estilo Denfield">📄 CSV</button>
      <button onclick="fcExportTaskadeCSV()" class="bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold py-2.5 rounded-lg" title="CSV de tareas para reimportar a Taskade">📋 Taskade</button>
    </div>
  `;
}

// ─── SETTERS ───
function fcSet(field, value) {
  fcState.form[field] = value;
  const body = document.getElementById('rm-body');
  if (body) fcRenderTab(body);
}
function fcSetAfect(stage, value) {
  value = Math.max(0, Math.min(100, +value || 0));
  fcState.form.afectacion[stage] = value;
  const body = document.getElementById('rm-body');
  if (body) fcRenderTab(body);
}

// ─── CARGAR JSON ───
function fcLoadJSON() {
  const txt = document.getElementById('fc-json')?.value;
  if (!txt) return;
  let diag;
  try { diag = JSON.parse(txt); } catch (e) { return alert('JSON inválido: ' + e.message); }
  const errores = fcValidarDiagnostico(diag);
  if (errores.length) return alert('El diagnóstico tiene problemas:\n\n' + errores.join('\n'));
  fcState.form.propiedad = diag.propiedad || fcState.form.propiedad;
  fcState.form.sqft = diag.sqft;
  FC_STAGES.forEach(s => { fcState.form.afectacion[s] = diag.afectacion[s]; });
  const body = document.getElementById('rm-body');
  if (body) fcRenderTab(body);
}

// ─── GUARDAR PRONÓSTICO ───
async function fcSaveForecast() {
  const f = fcState.form;
  const errores = fcValidarDiagnostico({ sqft: f.sqft, afectacion: f.afectacion });
  if (errores.length) return alert('Corregí el diagnóstico:\n' + errores.join('\n'));
  if (!f.propiedad) return alert('Ponle un nombre a la propiedad.');
  const otrosPct = f.otrosCostosPctOverride != null ? f.otrosCostosPctOverride : fcState.otrosCostosPct;
  const r = fcCalcular({ propiedad: f.propiedad, sqft: f.sqft, afectacion: f.afectacion },
    { coef: fcState.coef, otrosCostosPct: otrosPct, duracionDias: f.duracionDias });
  const { error } = await sb.from('remodel_forecasts').insert({
    propiedad: f.propiedad, sqft: f.sqft, afectacion: f.afectacion,
    duracion_total_dias: r.duracionDias, crew_size: f.crewSize,
    presupuesto_total: r.presupuestoTotal, otros_costos: r.otrosCostos,
    resultado: r.etapas, created_by: state.user.id
  });
  if (error) return alert('Error: ' + error.message + '\n\n(¿Corriste el SQL del Paso 2 con la tabla remodel_forecasts?)');
  await fcLoadConfig();
  alert('✓ Pronóstico guardado');
  const body = document.getElementById('rm-body');
  if (body) fcRenderTab(body);
}

// ─── EXPORT EXCEL multi-hoja (Config · Presupuesto · Cronograma) ───
function fcExportXLSX() {
  if (typeof XLSX === 'undefined') return alert('Librería Excel aún cargando, reintentá en 1 seg.');
  const f = fcState.form;
  const errores = fcValidarDiagnostico({ sqft: f.sqft, afectacion: f.afectacion });
  if (errores.length) return alert('Corregí el diagnóstico:\n' + errores.join('\n'));
  const otrosPct = f.otrosCostosPctOverride != null ? f.otrosCostosPctOverride : fcState.otrosCostosPct;
  const r = fcCalcular({ propiedad: f.propiedad, sqft: f.sqft, afectacion: f.afectacion },
    { coef: fcState.coef, otrosCostosPct: otrosPct, duracionDias: f.duracionDias });
  const crew = fcCuadrilla(r.duracionDias, f.crewSize, f.costoHora);
  const wb = XLSX.utils.book_new();

  // Hoja 1 — Config
  const cfg = [
    ['PRONÓSTICO DE REMODELACIÓN'],
    [],
    ['Propiedad', f.propiedad || '—'],
    ['Sqft', f.sqft],
    ['Coef fuente', `${fcState.coefFuente} (${fcState.nCasasCompletas}/${fcState.nThreshold} casas completas)`],
    [],
    ['Presupuesto total ($)', Math.round(r.presupuestoTotal)],
    ['$/sqft total', +r.ppsf.toFixed(2)],
    ['Subtotal obra ($)', Math.round(r.subtotal)],
    ['$/sqft directo', +r.ppsfDirecto.toFixed(2)],
    ['Materiales ($)', Math.round(r.totalMat)],
    ['Mano de obra ($)', Math.round(r.totalMO)],
    ['Otros costos (%)', otrosPct],
    ['Otros costos ($)', Math.round(r.otrosCostos)],
    [],
    ['Duración días', Math.round(r.duracionDias)],
    ['Duración semanas', +r.duracionSemanas.toFixed(1)],
    ['Cuadrilla (personas)', f.crewSize],
    ['Días con cuadrilla', crew.grupo.dias],
    ['Costo/hora promedio', f.costoHora || '—'],
    [],
    ['Afectación por etapa (%)'],
    ...FC_STAGES.map(s => [s, f.afectacion[s]]),
    [],
    ['Benchmark histórico real'],
    ['Total $/sqft real', fcState.totalPsfReal || '—'],
    ['Ratio MO real %', fcState.moRatioReal || '—'],
    ['Días/sqft real', fcState.diasPorSqftReal || '—'],
    ['% otros costos real', fcState.otrosPctReal || '—']
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cfg), 'Config');

  // Hoja 2 — Presupuesto detallado
  const presup = [['Etapa','% Afectación','MO $','Material $','Subtotal $','$/sqft etapa','% tiempo','Días']];
  r.etapas.forEach(e => {
    presup.push([
      e.etapa, e.afect, Math.round(e.mo), Math.round(e.mat), Math.round(e.subtotal),
      f.sqft ? +(e.subtotal / f.sqft).toFixed(2) : 0,
      +e.pesoNormPct.toFixed(1), +e.dias.toFixed(1)
    ]);
  });
  presup.push([]);
  presup.push(['SUBTOTAL OBRA', '', Math.round(r.totalMO), Math.round(r.totalMat), Math.round(r.subtotal),
               f.sqft ? +(r.subtotal / f.sqft).toFixed(2) : 0, 100, Math.round(r.duracionDias)]);
  presup.push([`Otros costos (${otrosPct}%)`, '', '', '', Math.round(r.otrosCostos), '', '', '']);
  presup.push(['TOTAL CLIENTE', '', '', '', Math.round(r.presupuestoTotal),
               f.sqft ? +(r.presupuestoTotal / f.sqft).toFixed(2) : 0, '', '']);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(presup), 'Presupuesto');

  // Hoja 3 — Cronograma (fases secuenciales con fechas)
  const gantt = [['Etapa','Offset (días)','Días','Fecha inicio','Fecha fin']];
  let cursor = 0;
  const base = new Date();
  r.etapas.forEach(e => {
    if (e.dias <= 0) return;
    const ini = new Date(base); ini.setDate(base.getDate() + Math.round(cursor));
    const fin = new Date(ini);  fin.setDate(ini.getDate() + Math.round(e.dias));
    gantt.push([e.etapa, Math.round(cursor), +e.dias.toFixed(1),
                ini.toISOString().split('T')[0], fin.toISOString().split('T')[0]]);
    cursor += e.dias;
  });
  gantt.push([]);
  gantt.push(['TOTAL DÍAS', '', Math.round(cursor)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gantt), 'Cronograma');

  const safe = (f.propiedad || 'proyecto').replace(/[^a-z0-9]/gi, '_');
  XLSX.writeFile(wb, `Pronostico_${safe}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ─── EXPORT CSV de TAREAS para Taskade (importable como outline) ───
// Formato: Task, Notes, Due, Days, Budget — Taskade detecta columna "Task" como título.
function fcExportTaskadeCSV() {
  const f = fcState.form;
  const errores = fcValidarDiagnostico({ sqft: f.sqft, afectacion: f.afectacion });
  if (errores.length) return alert('Corregí el diagnóstico:\n' + errores.join('\n'));
  const otrosPct = f.otrosCostosPctOverride != null ? f.otrosCostosPctOverride : fcState.otrosCostosPct;
  const r = fcCalcular({ propiedad: f.propiedad, sqft: f.sqft, afectacion: f.afectacion },
    { coef: fcState.coef, otrosCostosPct: otrosPct, duracionDias: f.duracionDias });

  // Encabezado Taskade-friendly (separador coma; valores que llevan coma van entre comillas)
  const csv = ['Task,Notes,Start,End,Days,Budget'];
  const base = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const q = s => `"${(s || '').replace(/"/g, '""')}"`;

  // Tarea raíz (proyecto)
  csv.push([
    q(`🏗️ ${f.propiedad || 'Proyecto'} (${f.sqft} sqft)`),
    q(`Presupuesto total $${Math.round(r.presupuestoTotal).toLocaleString()} · $${r.ppsf.toFixed(0)}/sqft · ${Math.round(r.duracionDias)} días`),
    fmt(base),
    fmt(new Date(base.getTime() + Math.round(r.duracionDias) * 86400000)),
    Math.round(r.duracionDias),
    Math.round(r.presupuestoTotal)
  ].join(','));

  // Una tarea por etapa con afectación > 0
  let cursor = 0;
  r.etapas.forEach(e => {
    if (e.afect <= 0 || e.dias <= 0) return;
    const ini = new Date(base); ini.setDate(base.getDate() + Math.round(cursor));
    const fin = new Date(ini);  fin.setDate(ini.getDate() + Math.round(e.dias));
    csv.push([
      q(`${FC_STAGE_ICON[e.etapa] || ''} ${e.etapa}`),
      q(`Afectación ${e.afect}% · MO $${Math.round(e.mo).toLocaleString()} · Material $${Math.round(e.mat).toLocaleString()} · Subtotal $${Math.round(e.subtotal).toLocaleString()} · ${e.pesoNormPct.toFixed(1)}% del tiempo`),
      fmt(ini), fmt(fin),
      +e.dias.toFixed(1),
      Math.round(e.subtotal)
    ].join(','));
    cursor += e.dias;
  });

  // Tareas administrativas
  csv.push([q('💰 Otros costos'), q(`${otrosPct}% del subtotal`), '', '', '', Math.round(r.otrosCostos)].join(','));
  csv.push([q('✅ Cierre y entrega'), q('Inspección final, punch list, entrega al cliente'), '', '', '', ''].join(','));

  const blob = new Blob(['﻿' + csv.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  const safe = (f.propiedad || 'proyecto').replace(/[^a-z0-9]/gi, '_');
  a.href = URL.createObjectURL(blob);
  a.download = `Taskade_${safe}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// ─── EXPORT CSV simple (estilo Denfield, una hoja plana) ───
function fcExportCSV() {
  const f = fcState.form;
  const otrosPct = f.otrosCostosPctOverride != null ? f.otrosCostosPctOverride : fcState.otrosCostosPct;
  const r = fcCalcular({ propiedad: f.propiedad, sqft: f.sqft, afectacion: f.afectacion },
    { coef: fcState.coef, otrosCostosPct: otrosPct, duracionDias: f.duracionDias });
  const lines = [
    `Pronóstico,${f.propiedad || 'Proyecto'}`,
    `Sqft,${f.sqft}`,
    `Presupuesto total,${Math.round(r.presupuestoTotal)}`,
    `$/sqft,${r.ppsf.toFixed(2)}`,
    `Duración días,${Math.round(r.duracionDias)}`,
    '',
    'Etapa,% Afectación,MO,Material,Subtotal,% tiempo,Días'
  ];
  r.etapas.forEach(e => lines.push(`${e.etapa},${e.afect},${Math.round(e.mo)},${Math.round(e.mat)},${Math.round(e.subtotal)},${e.pesoNormPct.toFixed(1)},${e.dias.toFixed(1)}`));
  lines.push(`Otros costos (${otrosPct}%),,,,${Math.round(r.otrosCostos)},,`);
  lines.push(`TOTAL,,,,${Math.round(r.presupuestoTotal)},,`);
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Pronostico_${(f.propiedad||'proyecto').replace(/[^a-z0-9]/gi,'_')}.csv`;
  a.click();
}

// ─── CASO DE PRUEBA (instrucción #3): JSON de ejemplo de la sección 4.C ───
function fcSelfTest() {
  const ejemplo = {
    propiedad: 'Casa de prueba',
    sqft: 1500,
    afectacion: { 'Demolición':100, 'Cimentación':0, 'Exterior':80, 'Estructura':100, 'Interior':100, 'Limpieza':100 }
  };
  const errores = fcValidarDiagnostico(ejemplo);
  if (errores.length) { console.error('fcSelfTest validación falló:', errores); return { ok:false, errores }; }
  const r = fcCalcular(ejemplo, { coef: FC_SEED_COEF, otrosCostosPct: 0, duracionDias: 80 });
  const sumaDias = r.etapas.reduce((s,e)=>s+e.dias,0);
  const checks = {
    subtotal: Math.round(r.subtotal),            // esperado 65016
    ppsfDirecto: +r.ppsfDirecto.toFixed(2),        // esperado 43.34
    sumaDias: Math.round(sumaDias),                // esperado 80
    interior_sub: Math.round(r.etapas.find(e=>e.etapa==='Interior').subtotal), // 42015
    cimentacion_sub: Math.round(r.etapas.find(e=>e.etapa==='Cimentación').subtotal) // 0
  };
  const ok = checks.subtotal === 65016 && checks.sumaDias === 80 && checks.cimentacion_sub === 0;
  console.log('fcSelfTest', ok ? '✅ PASS' : '❌ FAIL', checks);
  return { ok, checks, resultado: r };
}
