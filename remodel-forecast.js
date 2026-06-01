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
  forecasts: [],                  // pronósticos guardados
  diagnoses: []                   // diagnósticos Visita Previa reutilizables (picker)
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
    // Diagnósticos guardados (Visita Previa reutilizable) — picker en el form
    try {
      const { data: diags } = await sb.from('remodel_forecast_diagnoses').select('*').order('updated_at', { ascending: false });
      fcState.diagnoses = diags || [];
    } catch (e) {
      console.warn('diagnoses load skip:', e.message);
      fcState.diagnoses = [];
    }
  } catch (e) {
    console.warn('fcLoadConfig fallback a semilla:', e.message);
    fcState.coef = JSON.parse(JSON.stringify(FC_SEED_COEF));
  }
}

// ─── ESTADO DEL FORMULARIO (Visita Previa) ───
fcState.form = {
  propiedad: '',
  direccion: '',
  precioCompra: 0,                // para el análisis financiero del Excel
  fechaInicio: new Date().toISOString().split('T')[0],
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
          ${(fcState.diagnoses || []).length > 0 ? `
            <div class="mb-2 bg-blue-50 border border-blue-200 rounded p-2">
              <label class="block text-[10px] text-blue-700 font-bold uppercase mb-1">🔍 Cargar diagnóstico previo (${fcState.diagnoses.length} guardados)</label>
              <select onchange="fcLoadDiagnosis(this.value)" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
                <option value="">— Seleccionar para auto-llenar —</option>
                ${fcState.diagnoses.map(d => `<option value="${d.id}">${d.propiedad} · ${d.sqft||'?'}sqft · ${(d.source||'manual')} · ${new Date(d.updated_at).toLocaleDateString('es-MX')}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          <div class="grid grid-cols-3 gap-2 mb-2">
            <div class="col-span-2"><label class="block text-[10px] text-slate-500 mb-0.5">Propiedad *</label><input value="${f.propiedad}" onchange="fcSet('propiedad', this.value)" placeholder="Ej: 1308 Denfield" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Sqft *</label><input type="number" value="${f.sqft}" onchange="fcSet('sqft', +this.value)" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-semibold" /></div>
          </div>
          <div class="grid grid-cols-3 gap-2 mb-3">
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Dirección</label><input value="${f.direccion||''}" onchange="fcSet('direccion', this.value)" placeholder="123 Main St" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Precio compra $</label><input type="number" value="${f.precioCompra||0}" onchange="fcSet('precioCompra', +this.value)" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Fecha inicio obra</label><input type="date" value="${f.fechaInicio}" onchange="fcSet('fechaInicio', this.value)" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" /></div>
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

          <!-- Subir archivo Taskade -->
          <div class="mt-3 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-300 rounded-lg p-3">
            <label class="block text-xs font-bold text-violet-900 mb-1.5">📎 Subir Visita Previa de Taskade (.json)</label>
            <input type="file" accept=".json,application/json" onchange="fcUploadTaskadeFile(event.target.files[0])"
              class="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-violet-600 file:text-white file:font-bold file:cursor-pointer hover:file:bg-violet-700 cursor-pointer" />
            <div id="fc-taskade-status" class="text-[11px] mt-1.5 text-slate-500">El JSON se parsea, auto-llena la afectación y guarda el detalle (8 grupos + 5 patologías + scores) para el pronóstico.</div>
          </div>

          <!-- Preview del último Taskade cargado -->
          ${fcState.form._lastTaskade ? fcRenderTaskadePreview(fcState.form._lastTaskade) : ''}

          <details class="mt-3">
            <summary class="text-[10px] text-slate-500 cursor-pointer hover:text-slate-700">📥 O pegar JSON manual (formato simple)</summary>
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
    <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
      <button onclick="fcSaveForecast()" class="bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-lg" title="Guarda el pronóstico completo (con cálculo)">💾 Guardar pronóstico</button>
      <button onclick="fcSaveDiagnosis('manual')" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-lg" title="Guarda solo la Visita Previa (datos + afectación) para reutilizarla">📋 Guardar diagnóstico</button>
      <button onclick="fcExportXLSX()" class="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold py-2.5 rounded-lg" title="Excel multi-hoja: Info · Presupuesto · Cronograma · Gantt">📥 Excel</button>
      <button onclick="fcExportCSV()" class="bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold py-2.5 rounded-lg" title="CSV plano">📄 CSV</button>
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

// Renderiza el panel de preview del detalle Taskade (debajo del upload)
function fcRenderTaskadePreview(t) {
  if (!t || !t.detalle) return '';
  const d = t.detalle;
  const veredictoBg = t.dano_global_pct >= 70 ? 'bg-red-100 text-red-800' : t.dano_global_pct >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
  const grupos = d.grupos || {};
  const pats = d.patologias || {};
  return `
    <div class="mt-2 bg-white border border-violet-200 rounded p-2 text-xs">
      <div class="flex items-center justify-between mb-2">
        <div class="font-bold text-violet-900">📊 Detalle Taskade: ${d.propiedad?.nombre || ''}</div>
        <span class="${veredictoBg} px-2 py-0.5 rounded text-[10px] font-bold">${t.veredicto || '—'} · ${t.dano_global_pct?.toFixed(1)}%</span>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <!-- 8 Grupos Taskade -->
        <div>
          <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Grupos (daño % × peso)</div>
          ${Object.entries(grupos).map(([k, v]) => {
            const dp = v['daño_pct'];
            const dpStr = dp == null ? '—' : `${(+dp).toFixed(0)}%`;
            const color = dp == null ? 'text-slate-400' : dp >= 70 ? 'text-red-600' : dp >= 40 ? 'text-amber-600' : 'text-emerald-600';
            return `<div class="flex justify-between text-[11px] py-0.5">
              <span class="text-slate-700 capitalize">${k}</span>
              <span><strong class="${color}">${dpStr}</strong> <span class="text-slate-400">(w ${v.peso_pct||0})</span></span>
            </div>`;
          }).join('')}
        </div>

        <!-- 5 Patologías -->
        <div>
          <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Patologías</div>
          ${Object.entries(pats).map(([k, v]) => {
            const dp = +(v['daño_pct'] || 0);
            const color = dp >= 70 ? 'text-red-600' : dp >= 40 ? 'text-amber-600' : 'text-emerald-600';
            return `<div class="flex justify-between text-[11px] py-0.5">
              <span class="text-slate-700 capitalize">${k}</span>
              <span><strong class="${color}">${dp.toFixed(0)}%</strong> <span class="text-slate-400">(w ${v.peso_pct||0})</span></span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="mt-2 pt-2 border-t border-violet-100 text-[10px] text-slate-500 flex justify-between">
        <span>ID: <code>${t.taskade_id?.slice(0,8) || '—'}</code></span>
        ${t.archivo_url ? `<a href="${t.archivo_url}" target="_blank" class="text-violet-600 hover:underline">📎 Ver archivo</a>` : ''}
      </div>
    </div>
  `;
}

// ─── TASKADE: parser + upload ───

// Mapeo Taskade grupos → 6 macro grupos del Pronosticador
const FC_TASKADE_MAP = {
  'Estructura':  ['estructura'],
  'Cimentación': ['placa'],
  'Exterior':    ['techo', 'acceso_externo'],
  'Interior':    ['muros', 'piso', 'redes', 'carpinteria']
  // Demolición y Limpieza se calculan heurísticamente
};

// Parsea un JSON de Taskade Visita Previa al formato del Pronosticador
function fcParseTaskadeJSON(data) {
  if (!data || typeof data !== 'object') throw new Error('JSON inválido');
  if (!data.grupos || !data.resultado_global) throw new Error('No parece ser un export de Taskade Visita Previa (faltan claves "grupos"/"resultado_global")');

  // Afectación por macro grupo: promedio ponderado de los grupos Taskade asignados
  const afectacion = {};
  for (const [macro, sources] of Object.entries(FC_TASKADE_MAP)) {
    let sumDanoXPeso = 0, sumPeso = 0;
    sources.forEach(src => {
      const g = data.grupos[src];
      if (g && g['daño_pct'] != null && !isNaN(g['daño_pct'])) {
        const w = +g.peso_pct || 1;
        sumDanoXPeso += (+g['daño_pct']) * w;
        sumPeso += w;
      }
    });
    afectacion[macro] = sumPeso > 0 ? Math.round(sumDanoXPeso / sumPeso) : 0;
  }
  // Heurísticas para Demolición y Limpieza
  const danoGlobal = +data.resultado_global['daño_pct'] || 0;
  afectacion['Demolición'] = danoGlobal >= 50 ? Math.round(danoGlobal) : Math.round(danoGlobal * 0.5);
  afectacion['Limpieza'] = 100; // toda obra termina con limpieza

  // Detalle estructurado para guardar en remodel_forecast_diagnoses.detalle
  const detalle = {
    propiedad: data.propiedad || {},
    resultado_global: data.resultado_global || {},
    grupos: data.grupos || {},
    patologias: data.patologias || {},
    scores_raw: data.scores_raw || {},
    respuestas_raw: data.respuestas_raw || {},
    meta: data.meta || {}
  };

  return {
    propiedad: data.propiedad?.nombre || '',
    direccion: data.propiedad?.direccion || '',
    afectacion,
    detalle,
    taskade_id: data.meta?.id_evaluacion || null,
    veredicto: data.resultado_global?.veredicto || null,
    dano_global_pct: danoGlobal,
    fecha_evaluacion: data.propiedad?.fecha_evaluacion || null
  };
}

// Sube el archivo a Supabase Storage + parsea + auto-llena form + guarda detalle
async function fcUploadTaskadeFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.json')) {
    return alert('Por ahora solo soporto archivos .json de Taskade Visita Previa. Si tu Taskade exporta en otro formato, decímelo.');
  }
  const statusEl = document.getElementById('fc-taskade-status');
  if (statusEl) statusEl.innerHTML = '<span class="text-amber-600">⏳ Procesando...</span>';

  try {
    // 1. Leer archivo localmente y parsear
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('JSON inválido: ' + e.message); }
    const parsed = fcParseTaskadeJSON(data);

    // 2. Subir archivo crudo a Supabase Storage (silencioso si falla — no bloquea el parse)
    let archivoUrl = null;
    try {
      const safeName = (parsed.propiedad || 'visita').replace(/[^a-z0-9]/gi, '_');
      const path = `${state.user.id}/${safeName}_${Date.now()}.json`;
      const { data: up, error: upErr } = await sb.storage.from('taskade-visitas').upload(path, file, { upsert: false });
      if (!upErr) {
        const { data: pub } = sb.storage.from('taskade-visitas').getPublicUrl(path);
        archivoUrl = pub?.publicUrl || path;
      } else {
        console.warn('storage upload skip:', upErr.message);
      }
    } catch (e) { console.warn('storage skip:', e.message); }

    // 3. Auto-llenar form
    if (parsed.propiedad) fcState.form.propiedad = parsed.propiedad;
    if (parsed.direccion) fcState.form.direccion = parsed.direccion;
    FC_STAGES.forEach(s => { if (parsed.afectacion[s] != null) fcState.form.afectacion[s] = parsed.afectacion[s]; });
    fcState.form._lastTaskade = { ...parsed, archivo_url: archivoUrl, archivo_nombre: file.name };

    // 4. Persistir diagnóstico con el detalle Taskade
    const payload = {
      propiedad: parsed.propiedad,
      direccion: parsed.direccion || null,
      sqft: fcState.form.sqft, // sqft viene del form (Taskade no lo trae)
      afectacion: fcState.form.afectacion,
      precio_compra: fcState.form.precioCompra || 0,
      fecha_inicio: fcState.form.fechaInicio || null,
      duracion_dias: fcState.form.duracionDias || 0,
      source: 'taskade',
      detalle: parsed.detalle,
      archivo_url: archivoUrl,
      archivo_nombre: file.name,
      taskade_id: parsed.taskade_id,
      veredicto: parsed.veredicto,
      dano_global_pct: parsed.dano_global_pct,
      created_by: state.user.id,
      updated_at: new Date().toISOString()
    };
    // Si tiene taskade_id, upsert por ese; sino por (propiedad, sqft)
    let saveErr = null;
    if (parsed.taskade_id) {
      const { data: existing } = await sb.from('remodel_forecast_diagnoses').select('id').eq('taskade_id', parsed.taskade_id).maybeSingle();
      if (existing) {
        const { error } = await sb.from('remodel_forecast_diagnoses').update(payload).eq('id', existing.id);
        saveErr = error;
      } else {
        const { error } = await sb.from('remodel_forecast_diagnoses').insert(payload);
        saveErr = error;
      }
    } else {
      const { error } = await sb.from('remodel_forecast_diagnoses').upsert(payload, { onConflict: 'propiedad,sqft' });
      saveErr = error;
    }
    if (saveErr) throw new Error('Error guardando diagnóstico: ' + saveErr.message);

    // 5. Recargar lista de diagnoses
    const { data: diags } = await sb.from('remodel_forecast_diagnoses').select('*').order('updated_at', { ascending: false });
    fcState.diagnoses = diags || [];

    if (statusEl) statusEl.innerHTML = `<span class="text-emerald-700">✓ ${file.name} cargado y guardado. Daño global: ${parsed.dano_global_pct.toFixed(1)}% (${parsed.veredicto || '—'})</span>`;
    const body = document.getElementById('rm-body');
    if (body) fcRenderTab(body);
  } catch (e) {
    if (statusEl) statusEl.innerHTML = `<span class="text-red-600">❌ ${e.message}</span>`;
    console.error('fcUploadTaskadeFile:', e);
  }
}

// ─── DIAGNÓSTICOS PERSISTIDOS (picker) ───

// Carga un diagnóstico al form y guarda en historial
function fcLoadDiagnosis(id) {
  if (!id) return;
  const d = fcState.diagnoses.find(x => x.id === id);
  if (!d) return;
  fcState.form.propiedad = d.propiedad || fcState.form.propiedad;
  fcState.form.direccion = d.direccion || fcState.form.direccion;
  fcState.form.sqft = d.sqft || fcState.form.sqft;
  fcState.form.precioCompra = d.precio_compra || 0;
  fcState.form.fechaInicio = d.fecha_inicio || fcState.form.fechaInicio;
  fcState.form.duracionDias = d.duracion_dias || fcState.form.duracionDias;
  FC_STAGES.forEach(s => {
    if (d.afectacion && d.afectacion[s] != null) fcState.form.afectacion[s] = +d.afectacion[s];
  });
  // Si el diagnóstico viene de Taskade, también restaurar el preview
  if (d.source === 'taskade' && d.detalle) {
    fcState.form._lastTaskade = {
      propiedad: d.propiedad, direccion: d.direccion, afectacion: d.afectacion,
      detalle: d.detalle, taskade_id: d.taskade_id, veredicto: d.veredicto,
      dano_global_pct: d.dano_global_pct, archivo_url: d.archivo_url, archivo_nombre: d.archivo_nombre
    };
  } else {
    fcState.form._lastTaskade = null;
  }
  const body = document.getElementById('rm-body');
  if (body) fcRenderTab(body);
}

// Guarda (upsert) el diagnóstico actual al historial
async function fcSaveDiagnosis(source = 'manual', silent = false) {
  const f = fcState.form;
  if (!f.propiedad || !f.sqft) {
    if (!silent) alert('Falta propiedad y sqft para guardar el diagnóstico');
    return;
  }
  const errores = fcValidarDiagnostico({ sqft: f.sqft, afectacion: f.afectacion });
  if (errores.length) {
    if (!silent) alert('Corregí el diagnóstico:\n' + errores.join('\n'));
    return;
  }
  const payload = {
    propiedad: f.propiedad, direccion: f.direccion || null, sqft: f.sqft,
    afectacion: f.afectacion, precio_compra: f.precioCompra || 0,
    fecha_inicio: f.fechaInicio || null, duracion_dias: f.duracionDias || 0,
    source, created_by: state.user.id, updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('remodel_forecast_diagnoses')
    .upsert(payload, { onConflict: 'propiedad,sqft' });
  if (error) {
    if (!silent) alert('Error: ' + error.message + '\n\n(¿Corriste el SQL de forecast-diagnoses-schema?)');
    return;
  }
  // Recargar lista para reflejar en picker
  const { data: diags } = await sb.from('remodel_forecast_diagnoses').select('*').order('updated_at', { ascending: false });
  fcState.diagnoses = diags || [];
  if (!silent) {
    alert('✓ Diagnóstico guardado en el historial');
    const body = document.getElementById('rm-body');
    if (body) fcRenderTab(body);
  }
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
  // Auto-guardar al historial (silencioso) para que aparezca en el picker la próxima vez
  fcSaveDiagnosis('json', true).catch(() => {});
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
  // Auto-guardar también como diagnóstico reutilizable para el picker
  await fcSaveDiagnosis('pronostico', true).catch(() => {});
  await fcLoadConfig();
  alert('✓ Pronóstico guardado');
  const body = document.getElementById('rm-body');
  if (body) fcRenderTab(body);
}

// ─── EXPORT EXCEL "Seguimiento" (estructura del template Denfield) ───
// 4 hojas: INFORMACION GENERAL · PRESUPUESTO GENERAL · CRONOGRAMA · GANTT
// Usa ExcelJS para soporte de estilos (colores, bold, formato números) + fórmulas reales.
async function fcExportXLSX() {
  if (typeof ExcelJS === 'undefined') return alert('Librería Excel aún cargando, reintentá en 1 seg.');
  const f = fcState.form;
  const errores = fcValidarDiagnostico({ sqft: f.sqft, afectacion: f.afectacion });
  if (errores.length) return alert('Corregí el diagnóstico:\n' + errores.join('\n'));
  const otrosPct = f.otrosCostosPctOverride != null ? f.otrosCostosPctOverride : fcState.otrosCostosPct;
  const r = fcCalcular({ propiedad: f.propiedad, sqft: f.sqft, afectacion: f.afectacion },
    { coef: fcState.coef, otrosCostosPct: otrosPct, duracionDias: f.duracionDias });
  const crew = fcCuadrilla(r.duracionDias, f.crewSize, f.costoHora);

  // ─── Estilos reutilizables ───
  const COLOR = {
    headerBg: 'FF1F2937',      // slate-800
    headerText: 'FFFFFFFF',
    sectionBg: 'FF374151',     // slate-700
    sectionText: 'FFFFFFFF',
    subBg: 'FFE5E7EB',         // slate-200
    editable: 'FFD1FAE5',      // green-100 (verde editable)
    calc: 'FFF3F4F6',          // slate-100 (gris calculado)
    totalRow: 'FFFEF3C7',      // amber-100
    border: 'FF9CA3AF'
  };
  const thinBorder = { top:{style:'thin',color:{argb:COLOR.border}}, left:{style:'thin',color:{argb:COLOR.border}}, bottom:{style:'thin',color:{argb:COLOR.border}}, right:{style:'thin',color:{argb:COLOR.border}} };
  const fill = (argb) => ({ type:'pattern', pattern:'solid', fgColor:{argb} });
  const styleHeader = { font:{bold:true,color:{argb:COLOR.headerText},size:11}, fill:fill(COLOR.headerBg), alignment:{horizontal:'center',vertical:'middle'}, border:thinBorder };
  const styleSection = { font:{bold:true,color:{argb:COLOR.sectionText},size:10}, fill:fill(COLOR.sectionBg), alignment:{horizontal:'left',vertical:'middle'} };
  const styleSub = { font:{bold:true,size:10}, fill:fill(COLOR.subBg), alignment:{horizontal:'left'}, border:thinBorder };
  const styleEditable = { fill:fill(COLOR.editable), border:thinBorder, alignment:{horizontal:'right'} };
  const styleCalc = { fill:fill(COLOR.calc), border:thinBorder, alignment:{horizontal:'right'} };
  const styleTotal = { font:{bold:true,size:11}, fill:fill(COLOR.totalRow), border:thinBorder, alignment:{horizontal:'right'} };
  const FMT_CURRENCY = '"$"#,##0;[Red]"-$"#,##0';
  const FMT_PCT = '0.0%;[Red]-0.0%';
  const FMT_DATE = 'yyyy-mm-dd';
  const FMT_INT = '#,##0';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Empresa OS — Pronosticador';
  wb.created = new Date();

  // ════════════════════════════════════════════════════════════
  // HOJA 1: INFORMACION GENERAL
  // ════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet('INFORMACION GENERAL', { views: [{ state: 'frozen', ySplit: 13 }] });
  ws1.columns = [
    {width:5}, {width:25}, {width:12}, {width:8}, {width:12}, {width:14}, {width:13}, {width:13}, {width:13}, {width:12}, {width:12}, {width:12}, {width:13}, {width:11}, {width:22}
  ];

  // Título
  ws1.mergeCells('A1:O1');
  ws1.getCell('A1').value = `CRONOGRAMA Y PRESUPUESTO — ${f.propiedad || 'Proyecto'}`;
  ws1.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font, size:14} };
  ws1.getRow(1).height = 24;
  ws1.mergeCells('A2:O2');
  ws1.getCell('A2').value = 'Celdas VERDES = editables. Grises = calculadas automáticamente.';
  ws1.getCell('A2').style = { font:{italic:true,color:{argb:'FF6B7280'},size:9}, alignment:{horizontal:'left'} };

  // Sección Info
  ws1.mergeCells('A4:O4');
  ws1.getCell('A4').value = 'INFORMACIÓN GENERAL';
  ws1.getCell('A4').style = styleSection;
  const infoRows = [
    ['Nombre', f.propiedad],
    ['Dirección', f.direccion || ''],
    ['Tipo', 'Fix & Flip'],
    ['Precio Compra', f.precioCompra || 0, FMT_CURRENCY],
    ['Superficie ft²', f.sqft, FMT_INT],
    ['Fecha Inicio Obra', new Date(f.fechaInicio), FMT_DATE]
  ];
  infoRows.forEach((row, i) => {
    const r0 = 5 + i;
    ws1.getCell(`A${r0}`).value = row[0];
    ws1.getCell(`A${r0}`).style = { font:{bold:true}, alignment:{horizontal:'left'} };
    ws1.getCell(`C${r0}`).value = row[1];
    ws1.getCell(`C${r0}`).style = { ...styleEditable, numFmt: row[2] || undefined };
  });

  // Tabla de Etapas
  ws1.mergeCells('A12:O12');
  ws1.getCell('A12').value = 'TABLA DE ETAPAS — desglose presupuestal + reales';
  ws1.getCell('A12').style = styleSection;
  const tableHeaders = ['#','Etapa','Inicio','Días','Fin','Presup. Total','P. Material','P. M.Obra','P. Equipo','Real Mat.','Real M.O.','Real Eq.','Real Total','% Margen','Estado'];
  tableHeaders.forEach((h, i) => {
    const c = ws1.getCell(13, i+1);
    c.value = h; c.style = styleHeader;
  });
  ws1.getRow(13).height = 28;

  // Datos por etapa (calculados desde el Pronosticador)
  // Cronograma secuencial: inicio etapa1=fechaInicio; etapaN=fin etapaN-1 + 1
  let cursor = new Date(f.fechaInicio);
  r.etapas.forEach((et, i) => {
    const row = 14 + i;
    const dias = Math.max(0, Math.round(et.dias));
    const inicioEtapa = new Date(cursor);
    const finEtapa = new Date(cursor);
    if (dias > 0) finEtapa.setDate(finEtapa.getDate() + dias - 1);

    ws1.getCell(`A${row}`).value = i + 1;
    ws1.getCell(`A${row}`).style = { ...styleCalc, alignment:{horizontal:'center'} };
    ws1.getCell(`B${row}`).value = et.etapa;
    ws1.getCell(`B${row}`).style = { font:{bold:true}, border:thinBorder, alignment:{horizontal:'left'} };
    ws1.getCell(`C${row}`).value = dias > 0 ? inicioEtapa : '';
    ws1.getCell(`C${row}`).style = { ...styleEditable, numFmt: FMT_DATE };
    ws1.getCell(`D${row}`).value = dias;
    ws1.getCell(`D${row}`).style = { ...styleEditable, numFmt: FMT_INT, alignment:{horizontal:'center'} };
    ws1.getCell(`E${row}`).value = { formula: `IF(OR(C${row}="",D${row}=0),"",C${row}+D${row}-1)` };
    ws1.getCell(`E${row}`).style = { ...styleCalc, numFmt: FMT_DATE };
    // Presup Total = MO+Mat (sin Equipo por etapa, según el motor)
    ws1.getCell(`F${row}`).value = Math.round(et.subtotal);
    ws1.getCell(`F${row}`).style = { ...styleEditable, numFmt: FMT_CURRENCY };
    ws1.getCell(`G${row}`).value = Math.round(et.mat);
    ws1.getCell(`G${row}`).style = { ...styleCalc, numFmt: FMT_CURRENCY };
    ws1.getCell(`H${row}`).value = Math.round(et.mo);
    ws1.getCell(`H${row}`).style = { ...styleCalc, numFmt: FMT_CURRENCY };
    ws1.getCell(`I${row}`).value = 0;
    ws1.getCell(`I${row}`).style = { ...styleCalc, numFmt: FMT_CURRENCY };
    // Reales (editables)
    ['J','K','L'].forEach(col => {
      const c = ws1.getCell(`${col}${row}`);
      c.value = null;
      c.style = { ...styleEditable, numFmt: FMT_CURRENCY };
    });
    ws1.getCell(`M${row}`).value = { formula: `SUM(J${row}:L${row})` };
    ws1.getCell(`M${row}`).style = { ...styleCalc, numFmt: FMT_CURRENCY, font:{bold:true} };
    ws1.getCell(`N${row}`).value = { formula: `IFERROR((F${row}-M${row})/F${row},0)` };
    ws1.getCell(`N${row}`).style = { ...styleCalc, numFmt: FMT_PCT };
    ws1.getCell(`O${row}`).value = { formula: `IF(M${row}=0,"○ Sin gasto",IF(N${row}>=0.1,"◐ Dentro del margen",IF(N${row}>=0,"⚠ Apretado","● Sobre presupuesto")))` };
    ws1.getCell(`O${row}`).style = { ...styleCalc, alignment:{horizontal:'left'} };

    if (dias > 0) cursor.setDate(cursor.getDate() + dias);
  });

  // Fila TOTALES
  const totalRow = 14 + r.etapas.length;
  ws1.getCell(`B${totalRow}`).value = 'TOTALES';
  ws1.getCell(`B${totalRow}`).style = { ...styleTotal, alignment:{horizontal:'left'} };
  ws1.getCell(`D${totalRow}`).value = { formula: `SUM(D14:D${totalRow-1})` };
  ws1.getCell(`D${totalRow}`).style = { ...styleTotal, numFmt: FMT_INT, alignment:{horizontal:'center'} };
  ['F','G','H','I','J','K','L','M'].forEach(col => {
    const c = ws1.getCell(`${col}${totalRow}`);
    c.value = { formula: `SUM(${col}14:${col}${totalRow-1})` };
    c.style = { ...styleTotal, numFmt: FMT_CURRENCY };
  });
  ws1.getCell(`N${totalRow}`).value = { formula: `IFERROR((F${totalRow}-M${totalRow})/F${totalRow},0)` };
  ws1.getCell(`N${totalRow}`).style = { ...styleTotal, numFmt: FMT_PCT };

  // Leyenda
  ws1.getCell(`A${totalRow + 2}`).value = '🟢 Verde = EDITABLE  |  ⬜ Gris = calculado automáticamente';
  ws1.getCell(`A${totalRow + 2}`).style = { font:{italic:true,color:{argb:'FF6B7280'},size:9} };

  // ════════════════════════════════════════════════════════════
  // HOJA 2: PRESUPUESTO GENERAL
  // ════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet('PRESUPUESTO GENERAL', { views: [{ state: 'frozen', ySplit: 4 }] });
  ws2.columns = [{width:24},{width:14},{width:14},{width:14},{width:14},{width:14},{width:14},{width:14}];

  ws2.mergeCells('A1:H1');
  ws2.getCell('A1').value = `PRESUPUESTO — ${f.propiedad || 'Proyecto'}`;
  ws2.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font, size:14} };
  ws2.getRow(1).height = 24;
  ws2.mergeCells('A2:H2');
  ws2.getCell('A2').value = 'Valores leídos desde INFORMACION GENERAL. Edita allí y este resumen se recalcula.';
  ws2.getCell('A2').style = { font:{italic:true,color:{argb:'FF6B7280'},size:9} };

  // Resumen Ejecutivo
  ws2.mergeCells('A4:H4');
  ws2.getCell('A4').value = 'RESUMEN EJECUTIVO';
  ws2.getCell('A4').style = styleSection;
  const sumHeaders = ['Presup. Total','Real Acum.','Desviación $','Desviación %','Presup/ft²','Real/ft²','Días Tot.','Avance'];
  sumHeaders.forEach((h, i) => {
    const c = ws2.getCell(5, i+1);
    c.value = h; c.style = styleHeader;
  });
  const igSheet = "'INFORMACION GENERAL'";
  ws2.getCell('A6').value = { formula: `${igSheet}!F${totalRow}` };
  ws2.getCell('A6').style = { ...styleCalc, numFmt: FMT_CURRENCY, font:{bold:true} };
  ws2.getCell('B6').value = { formula: `${igSheet}!M${totalRow}` };
  ws2.getCell('B6').style = { ...styleCalc, numFmt: FMT_CURRENCY };
  ws2.getCell('C6').value = { formula: 'B6-A6' };
  ws2.getCell('C6').style = { ...styleCalc, numFmt: FMT_CURRENCY };
  ws2.getCell('D6').value = { formula: 'IFERROR((B6-A6)/A6,0)' };
  ws2.getCell('D6').style = { ...styleCalc, numFmt: FMT_PCT };
  ws2.getCell('E6').value = { formula: `IFERROR(A6/${igSheet}!C9,0)` };
  ws2.getCell('E6').style = { ...styleCalc, numFmt: FMT_CURRENCY };
  ws2.getCell('F6').value = { formula: `IFERROR(B6/${igSheet}!C9,0)` };
  ws2.getCell('F6').style = { ...styleCalc, numFmt: FMT_CURRENCY };
  ws2.getCell('G6').value = { formula: `${igSheet}!D${totalRow}` };
  ws2.getCell('G6').style = { ...styleCalc, numFmt: FMT_INT };
  ws2.getCell('H6').value = { formula: `${igSheet}!N${totalRow}` };
  ws2.getCell('H6').style = { ...styleCalc, numFmt: FMT_PCT };

  // Desglose por Categoría
  ws2.mergeCells('A8:H8');
  ws2.getCell('A8').value = 'DESGLOSE POR CATEGORÍA';
  ws2.getCell('A8').style = styleSection;
  const catHeaders = ['Categoría','Presupuesto','% del total','Real','Desv. $','Desv. %'];
  catHeaders.forEach((h, i) => {
    const c = ws2.getCell(9, i+1);
    c.value = h; c.style = styleHeader;
  });
  const cats = [
    { label:'Material',   colSrc:'G' },
    { label:'Mano Obra',  colSrc:'H' },
    { label:'Equipo',     colSrc:'I' }
  ];
  cats.forEach((cat, i) => {
    const row = 10 + i;
    ws2.getCell(`A${row}`).value = cat.label;
    ws2.getCell(`A${row}`).style = { font:{bold:true}, border:thinBorder };
    ws2.getCell(`B${row}`).value = { formula: `${igSheet}!${cat.colSrc}${totalRow}` };
    ws2.getCell(`B${row}`).style = { ...styleCalc, numFmt: FMT_CURRENCY };
    ws2.getCell(`C${row}`).value = { formula: `IFERROR(B${row}/${igSheet}!F${totalRow},0)` };
    ws2.getCell(`C${row}`).style = { ...styleCalc, numFmt: FMT_PCT };
    const realCol = cat.colSrc === 'G' ? 'J' : cat.colSrc === 'H' ? 'K' : 'L';
    ws2.getCell(`D${row}`).value = { formula: `${igSheet}!${realCol}${totalRow}` };
    ws2.getCell(`D${row}`).style = { ...styleCalc, numFmt: FMT_CURRENCY };
    ws2.getCell(`E${row}`).value = { formula: `D${row}-B${row}` };
    ws2.getCell(`E${row}`).style = { ...styleCalc, numFmt: FMT_CURRENCY };
    ws2.getCell(`F${row}`).value = { formula: `IFERROR((D${row}-B${row})/B${row},0)` };
    ws2.getCell(`F${row}`).style = { ...styleCalc, numFmt: FMT_PCT };
  });
  // Otros costos (% global)
  ws2.getCell('A13').value = 'Otros costos (%)';
  ws2.getCell('A13').style = { font:{bold:true}, border:thinBorder };
  ws2.getCell('B13').value = Math.round(r.otrosCostos);
  ws2.getCell('B13').style = { ...styleCalc, numFmt: FMT_CURRENCY };
  ws2.getCell('C13').value = otrosPct / 100;
  ws2.getCell('C13').style = { ...styleCalc, numFmt: FMT_PCT };
  // Total
  ws2.getCell('A14').value = 'TOTAL';
  ws2.getCell('A14').style = { ...styleTotal, alignment:{horizontal:'left'} };
  ['B','C','D','E','F'].forEach(col => {
    ws2.getCell(`${col}14`).value = { formula: `SUM(${col}10:${col}13)` };
    ws2.getCell(`${col}14`).style = { ...styleTotal, numFmt: col === 'C' || col === 'F' ? FMT_PCT : FMT_CURRENCY };
  });

  // Análisis Financiero (solo si hay precio compra)
  if (f.precioCompra > 0) {
    ws2.mergeCells('A16:H16');
    ws2.getCell('A16').value = 'ANÁLISIS FINANCIERO';
    ws2.getCell('A16').style = styleSection;
    const finRows = [
      ['Precio de Compra', { formula: `${igSheet}!C8` }, 'Inversión de adquisición'],
      ['Presup. Remodelación', { formula: `${igSheet}!F${totalRow}` }, 'Suma del costo de obra'],
      ['Otros costos', Math.round(r.otrosCostos), `${otrosPct}% del subtotal`],
      ['Total Invertido', { formula: `C17+C18+C19` }, 'Compra + Remodelación + Otros']
    ];
    finRows.forEach((row, i) => {
      const r0 = 17 + i;
      ws2.getCell(`A${r0}`).value = row[0];
      ws2.getCell(`A${r0}`).style = { font:{bold: r0===20}, border:thinBorder };
      ws2.getCell(`C${r0}`).value = row[1];
      ws2.getCell(`C${r0}`).style = { ...(r0===20 ? styleTotal : styleCalc), numFmt: FMT_CURRENCY };
      ws2.getCell(`D${r0}`).value = row[2];
      ws2.getCell(`D${r0}`).style = { font:{italic:true,color:{argb:'FF6B7280'},size:9}, alignment:{horizontal:'left'} };
    });
  }

  // ════════════════════════════════════════════════════════════
  // HOJA 3: CRONOGRAMA (resumen por etapa)
  // ════════════════════════════════════════════════════════════
  const ws3 = wb.addWorksheet('CRONOGRAMA', { views: [{ state: 'frozen', ySplit: 4 }] });
  ws3.columns = [{width:5},{width:18},{width:12},{width:8},{width:12},{width:14},{width:11}];

  ws3.mergeCells('A1:G1');
  ws3.getCell('A1').value = `CRONOGRAMA — ${f.propiedad || 'Proyecto'}`;
  ws3.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font, size:14} };
  ws3.getRow(1).height = 24;
  ws3.mergeCells('A2:G2');
  ws3.getCell('A2').value = 'Fechas y días pull de INFORMACION GENERAL.';
  ws3.getCell('A2').style = { font:{italic:true,color:{argb:'FF6B7280'},size:9} };

  ['#','Etapa','Inicio','Días','Fin','Presup. Total','% Avance'].forEach((h, i) => {
    const c = ws3.getCell(4, i+1);
    c.value = h; c.style = styleHeader;
  });
  ws3.getRow(4).height = 24;

  r.etapas.forEach((et, i) => {
    const row = 5 + i;
    const srcRow = 14 + i;
    ws3.getCell(`A${row}`).value = i + 1;
    ws3.getCell(`A${row}`).style = { ...styleCalc, alignment:{horizontal:'center'} };
    ws3.getCell(`B${row}`).value = { formula: `${igSheet}!B${srcRow}` };
    ws3.getCell(`B${row}`).style = { font:{bold:true}, border:thinBorder };
    ws3.getCell(`C${row}`).value = { formula: `${igSheet}!C${srcRow}` };
    ws3.getCell(`C${row}`).style = { ...styleCalc, numFmt: FMT_DATE };
    ws3.getCell(`D${row}`).value = { formula: `${igSheet}!D${srcRow}` };
    ws3.getCell(`D${row}`).style = { ...styleCalc, numFmt: FMT_INT, alignment:{horizontal:'center'} };
    ws3.getCell(`E${row}`).value = { formula: `${igSheet}!E${srcRow}` };
    ws3.getCell(`E${row}`).style = { ...styleCalc, numFmt: FMT_DATE };
    ws3.getCell(`F${row}`).value = { formula: `${igSheet}!F${srcRow}` };
    ws3.getCell(`F${row}`).style = { ...styleCalc, numFmt: FMT_CURRENCY };
    ws3.getCell(`G${row}`).value = { formula: `IFERROR(${igSheet}!M${srcRow}/${igSheet}!F${srcRow},0)` };
    ws3.getCell(`G${row}`).style = { ...styleCalc, numFmt: FMT_PCT };
  });
  // Totales
  const cronTotal = 5 + r.etapas.length;
  ws3.getCell(`B${cronTotal}`).value = 'TOTAL';
  ws3.getCell(`B${cronTotal}`).style = { ...styleTotal, alignment:{horizontal:'left'} };
  ws3.getCell(`D${cronTotal}`).value = { formula: `SUM(D5:D${cronTotal-1})` };
  ws3.getCell(`D${cronTotal}`).style = { ...styleTotal, numFmt: FMT_INT };
  ws3.getCell(`F${cronTotal}`).value = { formula: `SUM(F5:F${cronTotal-1})` };
  ws3.getCell(`F${cronTotal}`).style = { ...styleTotal, numFmt: FMT_CURRENCY };

  // ════════════════════════════════════════════════════════════
  // HOJA 4: GANTT (etapas × semanas)
  // ════════════════════════════════════════════════════════════
  const ws4 = wb.addWorksheet('GANTT', { views: [{ state: 'frozen', xSplit: 4, ySplit: 4 }] });
  const totalDias = Math.max(...r.etapas.map((_, i) => 14 + i)) ? Math.ceil(r.duracionDias) : 0;
  const totalSemanas = Math.max(12, Math.ceil(totalDias / 7));
  ws4.columns = [{width:18},{width:12},{width:12},{width:8}, ...Array(totalSemanas).fill({width:6})];

  ws4.mergeCells(1, 1, 1, 4 + totalSemanas);
  ws4.getCell('A1').value = `GANTT — ${f.propiedad || 'Proyecto'}`;
  ws4.getCell('A1').style = { ...styleHeader, font:{...styleHeader.font, size:14} };
  ws4.getRow(1).height = 24;

  ['Etapa','Inicio','Fin','Días'].forEach((h, i) => {
    const c = ws4.getCell(4, i+1);
    c.value = h; c.style = styleHeader;
  });
  // Headers de semanas con fecha
  const baseDate = new Date(f.fechaInicio);
  for (let s = 0; s < totalSemanas; s++) {
    const wkDate = new Date(baseDate); wkDate.setDate(baseDate.getDate() + s * 7);
    const c = ws4.getCell(4, 5 + s);
    c.value = `S${s+1}\n${wkDate.getDate()}/${wkDate.getMonth()+1}`;
    c.style = { ...styleHeader, alignment:{horizontal:'center',vertical:'middle',wrapText:true}, font:{...styleHeader.font, size:9} };
  }
  ws4.getRow(4).height = 32;

  r.etapas.forEach((et, i) => {
    const row = 5 + i;
    const srcRow = 14 + i;
    ws4.getCell(`A${row}`).value = { formula: `${igSheet}!B${srcRow}` };
    ws4.getCell(`A${row}`).style = { font:{bold:true}, border:thinBorder };
    ws4.getCell(`B${row}`).value = { formula: `${igSheet}!C${srcRow}` };
    ws4.getCell(`B${row}`).style = { ...styleCalc, numFmt: FMT_DATE };
    ws4.getCell(`C${row}`).value = { formula: `${igSheet}!E${srcRow}` };
    ws4.getCell(`C${row}`).style = { ...styleCalc, numFmt: FMT_DATE };
    ws4.getCell(`D${row}`).value = { formula: `${igSheet}!D${srcRow}` };
    ws4.getCell(`D${row}`).style = { ...styleCalc, numFmt: FMT_INT, alignment:{horizontal:'center'} };
    // Pintar barra por semana: pongo color si la etapa toca esa semana
    const dias = Math.max(0, Math.round(et.dias));
    if (dias > 0) {
      const ini = new Date(f.fechaInicio);
      // Calcular offset acumulado anterior
      let offset = 0;
      for (let k = 0; k < i; k++) offset += Math.round(r.etapas[k].dias || 0);
      const etInicio = new Date(ini); etInicio.setDate(ini.getDate() + offset);
      const etFin = new Date(etInicio); etFin.setDate(etInicio.getDate() + dias - 1);
      for (let s = 0; s < totalSemanas; s++) {
        const wkIni = new Date(baseDate); wkIni.setDate(baseDate.getDate() + s * 7);
        const wkFin = new Date(wkIni); wkFin.setDate(wkIni.getDate() + 6);
        if (etInicio <= wkFin && etFin >= wkIni) {
          ws4.getCell(row, 5 + s).style = { fill: fill('FF3B82F6'), border:thinBorder };
        } else {
          ws4.getCell(row, 5 + s).style = { fill: fill('FFF9FAFB'), border:thinBorder };
        }
      }
    }
  });

  // ─── Descargar ───
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  const safe = (f.propiedad || 'proyecto').replace(/[^a-z0-9]/gi, '_');
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  a.href = URL.createObjectURL(blob);
  a.download = `${today}_Seguimiento_${safe}.xlsx`;
  a.click();
}

// ─── EXPORT EXCEL legacy (SheetJS, sin estilos — mantenido por compatibilidad) ───
function fcExportXLSXSimple() {
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
