// 🔬 TAB Seguimiento + tracking granular (extraído de remodel-pro.js)
// Tracking en vivo: % avance + real vs presupuesto + activity log.
// ─── TAB: SEGUIMIENTO (tracking en vivo: % avance + real vs presupuesto por etapa) ───
function rmRenderSeguimiento(body) {
  const e = rmCalcProject();
  if (e.activities.length === 0) {
    body.innerHTML = rmSegSelector() + `<div class="text-center py-12 text-slate-500">
      Elegí una propiedad arriba, o cargá/creá un proyecto para hacerle seguimiento.
    </div>`;
    return;
  }

  const view = rmState.seguimientoView || 'fase';
  const isFase = view === 'fase';

  body.innerHTML = rmSegSelector() + `
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

// Bloque 2.3 — un seguimiento por propiedad + import Excel de avance
function rmSegSelector() {
  const projs = (rmState.projects || []).filter(p => !p.archived_at);
  return `<div class="mb-2 flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-200 rounded p-2">
    <span class="text-[10px] font-bold uppercase text-slate-500">Seguimiento de:</span>
    <select onchange="rmSelectProjectForTracking(this.value)" class="border border-slate-300 rounded px-2 py-1 text-sm font-semibold min-w-[220px]">
      <option value="">— Elegí una propiedad —</option>
      ${projs.map(p => `<option value="${p.id}" ${rmState.currentProject && rmState.currentProject.id === p.id ? 'selected' : ''}>${(p.name || '').replace(/</g, '&lt;')}${p.sqft ? ' · ' + p.sqft + 'sqft' : ''}</option>`).join('')}
    </select>
    <input type="file" id="rm-seg-xls" accept=".xlsx,.xls,.csv" style="display:none" onchange="rmSegImportExcel(this.files[0])">
    <button onclick="document.getElementById('rm-seg-xls').click()" class="text-xs bg-violet-50 hover:bg-violet-100 border border-violet-300 text-violet-700 px-2.5 py-1 rounded font-bold" title="Importar avance real: columnas activity_code, real_cost, real_days">📥 Importar Excel (avance)</button>
  </div>`;
}
async function rmSelectProjectForTracking(id) {
  if (!id) return;
  const p = (rmState.projects || []).find(x => x.id === id);
  if (p) { await rmLoadProject(p); rmState.tab = 'seguimiento'; rmRenderTab(); }
}
window.rmSelectProjectForTracking = rmSelectProjectForTracking;
async function rmSegImportExcel(file) {
  if (!file || !rmState.currentProject) return alert('Elegí primero una propiedad.');
  if (typeof XLSX === 'undefined') return alert('Librería de Excel no cargada.');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const norm = o => { const g = k => o[k] ?? o[k.toUpperCase()] ?? o[k[0].toUpperCase() + k.slice(1)]; return { activity_code: String(g('activity_code') || g('code') || g('codigo') || '').trim(), real_cost: +g('real_cost') || +g('costo') || 0, real_days: +g('real_days') || +g('dias') || 0, real_hours: +g('real_hours') || +g('horas') || 0 }; };
  const ups = rows.map(norm).filter(r => r.activity_code).map(r => ({ project_id: rmState.currentProject.id, activity_code: r.activity_code, real_cost: r.real_cost, real_days: r.real_days, real_hours: r.real_hours, recorded_by: state.user.id }));
  if (!ups.length) return alert('No encontré filas con activity_code. Columnas esperadas: activity_code, real_cost, real_days.');
  const { error } = await sb.from('remodel_actuals').upsert(ups, { onConflict: 'project_id,activity_code' });
  if (error) return alert('Error importando: ' + error.message);
  if (typeof rmLoadActuals === 'function') await rmLoadActuals(rmState.currentProject.id);
  rmRenderTab();
  if (window.toast) toast(`Avance importado: ${ups.length} actividades.`, 'success'); else alert('Avance importado: ' + ups.length);
}
window.rmSegImportExcel = rmSegImportExcel;
