// ════════════════════════════════════════════════════════════
// ✏️ TAB Editor del Estimador Pro (extraído de remodel-pro.js)
// Depende de: rmState, rmGetCatalog, rmCalcProject, RM_UNIDADES, etc.
// ════════════════════════════════════════════════════════════

// ─── TAB: EDITOR ───
async function rmLoadFromForecast(forecastId) {
  if (!forecastId) return;
  const { data: f } = await sb.from('remodel_forecasts').select('*').eq('id', forecastId).single();
  if (!f) return alert('Pronóstico no encontrado');
  // Busca diagnóstico para traer dirección, fecha inicio, vínculo Taskade
  const { data: d } = await sb.from('remodel_forecast_diagnoses').select('*')
    .eq('propiedad', f.propiedad).eq('sqft', f.sqft).maybeSingle();
  rmState.currentProject = null;
  rmState.editName = f.propiedad;
  rmState.editAddress = d?.direccion || '';
  rmState.editSqft = f.sqft;
  rmState.editStartDate = d?.fecha_inicio || (f.created_at ? f.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
  rmState.selectedActivities = {};
  rmState.matterportUrl = ''; rmState.scopeText = ''; rmState.scopeAudioPath = '';
  rmState.scopeAudioTranscript = ''; rmState.plans = []; rmState.photos = [];
  rmState.tracking = {};
  if (d?.source === 'taskade' && d.detalle) {
    rmState._linkedTaskade = {
      propiedad: f.propiedad, veredicto: d.veredicto,
      dano_global_pct: d.dano_global_pct, afectacion: f.afectacion || {},
      archivo_nombre: d.archivo_nombre
    };
  } else {
    rmState._linkedTaskade = {
      propiedad: f.propiedad, veredicto: 'Pronóstico (sin Taskade)',
      dano_global_pct: 0, afectacion: f.afectacion || {},
      archivo_nombre: '—'
    };
  }
  rmState.tab = 'editor';
  rmRender();
}

function rmRenderEditor(body) {
  const e = rmCalcProject();
  const linked = rmState._linkedTaskade;
  const forecasts = (typeof fcState !== 'undefined' && fcState.forecasts) ? fcState.forecasts : [];
  const isEmpty = !rmState.currentProject && !linked && !rmState.editName;

  // GATE: si está vacío y no hay NI pronósticos NI proyectos, forzá el flujo Taskade→Pronóstico→Editor
  if (isEmpty && forecasts.length === 0 && (rmState.projects || []).length === 0) {
    body.innerHTML = `
      <div class="max-w-md mx-auto text-center py-16">
        <div class="text-5xl mb-3">🔮</div>
        <h3 class="text-lg font-bold text-slate-800">Primero hacé un pronóstico</h3>
        <p class="text-sm text-slate-500 mt-2">Para usar el Editor detallado necesitás subir un archivo Taskade y generar un pronóstico de la casa. El detalle parte de ahí.</p>
        <button onclick="rmSetTab('forecast')" class="mt-5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg">→ Ir al Pronosticador</button>
      </div>`;
    return;
  }

  // GATE: si está vacío pero hay pronósticos o proyectos guardados, mostrá los pickers prominentes
  const savedProjectsForGate = rmState.projects || [];
  if (isEmpty && (forecasts.length > 0 || savedProjectsForGate.length > 0)) {
    body.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-4">
        ${savedProjectsForGate.length > 0 ? `
          <div class="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-2xl p-6">
            <div class="text-center mb-4">
              <div class="text-4xl mb-2">📂</div>
              <h3 class="text-lg font-bold text-emerald-900">Tenés ${savedProjectsForGate.length} proyecto${savedProjectsForGate.length>1?'s':''} ya guardado${savedProjectsForGate.length>1?'s':''}</h3>
              <p class="text-xs text-emerald-800 mt-1">Continuá donde dejaste: actividades, qty, vu, todo el detalle.</p>
            </div>
            <select onchange="rmPickSavedProject(this.value)" class="w-full border-2 border-emerald-300 rounded-lg px-3 py-3 text-sm font-semibold bg-white">
              <option value="">— Seleccionar proyecto guardado —</option>
              ${savedProjectsForGate.map(p => `<option value="${p.id}">${p.name||'(sin nombre)'} · ${p.sqft||'?'}sqft · ${p.budget_total?'$'+Math.round(p.budget_total).toLocaleString():''} · ${new Date(p.updated_at).toLocaleDateString('es-MX')}</option>`).join('')}
            </select>
          </div>
        ` : ''}
        ${forecasts.length > 0 ? `
          <div class="bg-gradient-to-br from-blue-50 to-violet-50 border-2 border-blue-300 rounded-2xl p-6">
            <div class="text-center mb-4">
              <div class="text-4xl mb-2">🔮</div>
              <h3 class="text-lg font-bold text-blue-900">${savedProjectsForGate.length > 0 ? 'O empezá uno nuevo desde un pronóstico' : 'Cargá un pronóstico para empezar el detalle'}</h3>
              <p class="text-xs text-blue-800 mt-1">El Editor detallado parte de un pronóstico previo (Taskade + Pronosticador).</p>
            </div>
            <select onchange="rmLoadFromForecast(this.value)" class="w-full border-2 border-blue-300 rounded-lg px-3 py-3 text-sm font-semibold bg-white">
              <option value="">— Seleccionar pronóstico (${forecasts.length} guardados) —</option>
              ${forecasts.map(f => `<option value="${f.id}">${f.propiedad} · ${f.sqft||'?'}sqft · ${f.presupuesto_total?'$'+Math.round(f.presupuesto_total).toLocaleString():''} · ${new Date(f.created_at).toLocaleDateString('es-MX')}</option>`).join('')}
            </select>
            <div class="text-center text-[11px] text-blue-700 mt-3">
              ¿No está la casa? <button onclick="rmSetTab('forecast')" class="underline font-bold hover:text-blue-900">→ Hacer pronóstico nuevo</button>
            </div>
          </div>
        ` : ''}
      </div>`;
    return;
  }

  // Picker discreto cuando ya hay algo cargado (siempre disponible para cambiar de casa)
  const savedProjects = rmState.projects || [];
  const projectPicker = savedProjects.length > 0 ? `
    <div class="bg-emerald-50 border border-emerald-300 rounded-lg p-2 flex items-center gap-2">
      <label class="text-[10px] font-bold uppercase text-emerald-900 whitespace-nowrap">📂 Abrir proyecto guardado:</label>
      <select onchange="rmPickSavedProject(this.value)" class="flex-1 border border-emerald-300 rounded px-2 py-1 text-xs">
        <option value="">— ${savedProjects.length} proyectos guardados —</option>
        ${savedProjects.map(p => `<option value="${p.id}" ${rmState.currentProject?.id===p.id?'selected':''}>${p.name||'(sin nombre)'} · ${p.sqft||'?'}sqft · ${p.budget_total?'$'+Math.round(p.budget_total).toLocaleString():''} · ${new Date(p.updated_at).toLocaleDateString('es-MX')}</option>`).join('')}
      </select>
    </div>` : '';
  const forecastPicker = forecasts.length > 0 ? `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-2">
      <label class="text-[10px] font-bold uppercase text-blue-900 whitespace-nowrap">🔮 Cargar otro pronóstico:</label>
      <select onchange="if(this.value && confirm('Esto reemplaza el proyecto actual. ¿Continuar?'))rmLoadFromForecast(this.value); else this.value=''" class="flex-1 border border-blue-300 rounded px-2 py-1 text-xs">
        <option value="">— ${forecasts.length} pronósticos disponibles —</option>
        ${forecasts.map(f => `<option value="${f.id}">${f.propiedad} · ${f.sqft||'?'}sqft · ${new Date(f.created_at).toLocaleDateString('es-MX')}</option>`).join('')}
      </select>
    </div>` : '';

  const taskadeBanner = linked ? `
    <div class="bg-gradient-to-r from-violet-100 to-fuchsia-100 border-2 border-violet-400 rounded-xl p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📎</span>
          <div>
            <div class="text-xs font-bold text-violet-900">Vinculado a Taskade Visita Previa</div>
            <div class="text-[11px] text-violet-800">${linked.propiedad} · ${linked.veredicto || '—'} · daño global ${linked.dano_global_pct?.toFixed(1)}% · ${linked.archivo_nombre || ''}</div>
            <div class="text-[10px] text-violet-700 mt-0.5">Afectación: ${Object.entries(linked.afectacion||{}).map(([k,v])=>`${k} ${v}%`).join(' · ')}</div>
          </div>
        </div>
        <button onclick="rmSetTab('forecast')" class="text-xs bg-white hover:bg-violet-50 text-violet-700 px-3 py-1.5 rounded font-bold border border-violet-300">↩ Volver al Pronóstico</button>
      </div>
    </div>` : '';
  body.innerHTML = `
    <div class="grid lg:grid-cols-12 gap-4">
      <div class="lg:col-span-8 space-y-3">
        ${projectPicker}
        ${forecastPicker}
        ${taskadeBanner}
        <!-- Info -->
        <div class="bg-white rounded-xl p-4 border border-slate-200">
          <h3 class="text-xs font-bold text-slate-700 uppercase mb-2">Información del proyecto</h3>
          <div class="grid grid-cols-3 gap-2">
            <div class="col-span-2"><label class="block text-[10px] text-slate-500 mb-0.5">Nombre *</label><input value="${rmEsc(rmState.editName)}" oninput="rmState.editName=this.value" placeholder="Ej: 1308 Denfield" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-semibold" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Sqft</label><input type="number" value="${rmState.editSqft}" onchange="rmState.editSqft=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
            <div class="col-span-2"><label class="block text-[10px] text-slate-500 mb-0.5">Dirección</label><input value="${rmEsc(rmState.editAddress)}" oninput="rmState.editAddress=this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
            <div><label class="block text-[10px] text-slate-500 mb-0.5">Fecha inicio</label><input type="date" value="${rmEsc(rmState.editStartDate)}" onchange="rmState.editStartDate=this.value; rmRenderTabPreservingFocus()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" /></div>
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
            onchange="rmState.catalogFilter=this.value; rmRenderTabDebounced()"
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

                <!-- ITEMS CUSTOM de esta etapa -->
                ${rmRenderCustomItemsForPhase(p)}

                <!-- BOTÓN: + Agregar item custom -->
                <div class="pt-2 mt-2 border-t border-dashed border-slate-300">
                  <button onclick="rmShowAddCustom('${p}')" class="text-xs px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold">+ Agregar item nuevo a esta etapa</button>
                </div>
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
              <div><label class="block text-[10px] text-slate-500">Contingencia %</label><input type="number" step="1" value="${rmState.contingencyPct}" onchange="rmState.contingencyPct=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /><p class="text-[9px] text-slate-400">Industria: 15-20% remodel</p></div>
              <div><label class="block text-[10px] text-slate-500">Overhead %</label><input type="number" step="1" value="${rmState.overheadPct}" onchange="rmState.overheadPct=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /><p class="text-[9px] text-slate-400">Industria: 10-15%</p></div>
              <div>
                <label class="block text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Permits $</span>
                  <button onclick="rmAutoPermitsAustin()" class="text-[9px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded font-bold" title="Auto Austin TX: $1,500 base + $0.50/ft² sobre 1,500">📐 Auto Austin</button>
                </label>
                <input type="number" value="${rmState.permitsCost}" onchange="rmState.permitsCost=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
              </div>
              <div><label class="block text-[10px] text-slate-500">Design fees $</label><input type="number" value="${rmState.designFeesCost}" onchange="rmState.designFeesCost=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /></div>
              <div class="col-span-2"><label class="block text-[10px] text-slate-500">Markup al cliente %</label><input type="number" step="1" value="${rmState.markupPct}" onchange="rmState.markupPct=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /><p class="text-[9px] text-slate-400">Industria: 20-30% típico, 50% high-end</p></div>
              <div><label class="block text-[10px] text-slate-500">Crew (personas)</label><input type="number" value="${rmState.crewSize}" onchange="rmState.crewSize=Math.max(1,+this.value); rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" /></div>
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

        <!-- EXPORT EXCEL — 12 hojas formato Denfield -->
        <button onclick="rmExportEditorExcelDenfield()" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
          📥 Descargar Excel completo (12 hojas estilo Denfield)
        </button>
        <button onclick="rmExportEditorExcel()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-1.5 rounded-lg" title="Versión vieja, 3 hojas, sin estilos">
          📄 Excel simple (legacy 3 hojas)
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

        <button onclick="withLoading(this, rmSaveProject)" class="w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-lg">${rmState.currentProject?'💾 Guardar cambios':'💾 Crear proyecto'}</button>

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
