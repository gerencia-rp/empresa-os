// ════════════════════════════════════════════════════════════
// 📅 TAB Gantt del Estimador Pro (extraído de remodel-pro.js)
// Incluye inspecciones Austin + lead times + dependencias CPM
// Depende de: rmState, rmCalcProject, INSPECTIONS_AUSTIN, LEAD_TIMES
// ════════════════════════════════════════════════════════════

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
      <h2 class="text-lg font-bold">${osIcon('calendar')} Cronograma ${cpmOn?'CPM real':'lineal'} — ${rmState.editName || 'Proyecto'}</h2>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- S3-G3 Toggle CPM -->
        <div class="inline-flex border border-slate-300 rounded-lg overflow-hidden text-xs">
          <button onclick="rmState.cpmMode=false; rmRenderTab()" class="px-3 py-1.5 font-semibold ${!cpmOn?'bg-slate-900 text-white':'bg-white text-slate-600 hover:bg-slate-50'}">${osIcon('chart')} Lineal por fase</button>
          <button onclick="rmState.cpmMode=true; rmRenderTab()" class="px-3 py-1.5 font-semibold ${cpmOn?'bg-slate-900 text-white':'bg-white text-slate-600 hover:bg-slate-50'}">${osIcon('network')} CPM avanzado</button>
        </div>
        ${rmState.currentProject ? `<button onclick="rmSyncToPlanner()" class="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold px-3 py-1.5 rounded-lg" title="Genera las actividades día a día en el Planner Semanal según estas etapas y días">${osIcon('calendar')} Enviar al Planner →</button>` : ''}
      </div>
    </div>
    ${cpmOn && cpmErr ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900 mb-3">${osIcon('alert')} ${cpmErr}. Revisá las dependencias en el tab Catálogo (probablemente hay un ciclo).</div>` : ''}
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
      <h3 class="text-xs font-bold uppercase text-amber-900 mb-2">${osIcon('search')} Inspecciones obligatorias (no las olvides)</h3>
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
      <p class="text-[10px] text-amber-700 mt-2">${osIcon('alert')} Si una inspección no pasa, todo el cronograma se mueve. Programa con 1 semana de buffer.</p>
    </div>

    <!-- LEAD TIMES MATERIALES -->
    ${leadTimeAlerts.length ? `
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <h3 class="text-xs font-bold uppercase text-blue-900 mb-2">${osIcon('clock')} Lead times de materiales — ORDENA TEMPRANO</h3>
      <table class="w-full text-xs">
        <thead><tr class="text-blue-800"><th class="text-left py-1">Material</th><th class="text-right py-1">Días de espera</th><th class="text-left py-1 pl-3">Ordenar antes del día</th></tr></thead>
        <tbody>
          ${leadTimeAlerts.map(l => `<tr class="border-t border-blue-200"><td class="py-1.5">${l.activity}</td><td class="py-1.5 text-right font-bold">${l.lead_days}d</td><td class="py-1.5 pl-3 text-emerald-700 font-bold">Día 1 del proyecto</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="text-[10px] text-blue-700 mt-2">${osIcon('lightbulb')} Ordenar materiales de lead time largo al inicio del proyecto = correr en paralelo con demo/estructura.</p>
    </div>` : ''}

    <!-- CRITICAL PATH NOTES -->
    <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
      <h3 class="text-xs font-bold uppercase text-purple-900 mb-2">${osIcon('ruler')} Notas de ingeniería (CPM)</h3>
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
      <h3 class="text-xs font-bold uppercase text-red-900 mb-2">${kitStatusDot('bad')} Critical path (${e.cpm.criticalPath.length} actividades)</h3>
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
    <h2 class="text-lg font-bold mb-2">${osIcon('target')} Casas calibradoras (5 proyectos reales)</h2>
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
