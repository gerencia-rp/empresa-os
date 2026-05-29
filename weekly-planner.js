// ============================================================
// WEEKLY PLANNER — organiza recursos por casa × día
// Drag & drop fichitas (crews, specialists, tools) a celdas
// ============================================================

const wpState = {
  sys: null,
  weekStart: null, // Monday of current week
  resources: [],
  activities: [],
  projects: [],
  filterType: 'all', // all|tool|crew|specialist|vehicle
  draggedResource: null,
  showResourceForm: false,
  editingActivity: null,
  // S6-U2: catálogo para CPM
  catalog: [], // remodel_catalog_items con depends_on
  // S6-U3: drag de actividad entre celdas
  draggedActivityId: null,
  // S6-U4: vista Crew × Hora
  crewHourViewDate: null // null o YYYY-MM-DD
};

function wpFmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday:'short', day:'numeric', month:'short' });
}
function wpDateOnly(d) { return new Date(d).toISOString().split('T')[0]; }
function wpAddDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function wpMondayOf(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0,0,0,0);
  return x;
}

// ─── DB ───
async function wpLoadAll() {
  if (!wpState.weekStart) wpState.weekStart = wpMondayOf(new Date());
  const start = wpDateOnly(wpState.weekStart);
  const end = wpDateOnly(wpAddDays(wpState.weekStart, 6)); // domingo (7 días lun-dom)
  const [{ data: resources }, { data: activities }, { data: projects }, catRes] = await Promise.all([
    sb.from('resources').select('*').eq('active', true).order('type').order('name'),
    sb.from('weekly_activities').select('*').gte('date', start).lte('date', end).order('date'),
    sb.from('remodel_projects').select('id,name,address,status,sqft,budget_total,activities,start_date,end_date_estimated,completed_at').order('created_at', { ascending: false }),
    sb.from('remodel_catalog_items').select('code,description,depends_on').then(r => r.data || []).catch(() => [])
  ]);
  wpState.resources = resources || [];
  wpState.activities = activities || [];
  wpState.projects = projects || [];
  wpState.catalog = catRes || [];
}

// ─── S6-U2: CPM helpers ───
// Para una activity del weekly_planner, devuelve los activity_codes que deben estar done antes
function wpGetActivityDeps(act) {
  if (!act?.activity_code) return [];
  const catItem = wpState.catalog.find(c => c.code === act.activity_code);
  return (catItem?.depends_on) || [];
}

// Devuelve { satisfied: bool, blockers: [{code, date, status}], minDate: 'YYYY-MM-DD' }
// blockers = dependencias que NO están done en este proyecto/casa
function wpCheckDeps(act, allHomeActs) {
  const deps = wpGetActivityDeps(act);
  if (!deps.length) return { satisfied: true, blockers: [], minDate: null };
  const blockers = [];
  let latestDoneEf = null;
  deps.forEach(depCode => {
    // Buscar actividad de esta casa con ese code
    const matches = allHomeActs.filter(a => a.activity_code === depCode);
    if (matches.length === 0) {
      blockers.push({ code: depCode, date: null, status: 'no_existe' });
    } else {
      const allDone = matches.every(m => m.status === 'done' || m.status === 'cancelled');
      if (!allDone) {
        const last = matches.sort((a,b) => (b.date || '').localeCompare(a.date || ''))[0];
        blockers.push({ code: depCode, date: last.date, status: last.status });
      }
      const lastDate = matches.map(m => m.date).sort().slice(-1)[0];
      if (lastDate && (!latestDoneEf || lastDate > latestDoneEf)) latestDoneEf = lastDate;
    }
  });
  // minDate = día después de la última dep completada
  const minDate = latestDoneEf ? wpDateOnly(wpAddDays(new Date(latestDoneEf + 'T00:00:00'), 1)) : null;
  return { satisfied: blockers.length === 0, blockers, minDate };
}

// ─── ENTRY ───
async function openWeeklyPlanner(sys) {
  wpState.sys = sys;
  await wpLoadAll();
  openModal(`📅 ${sys.name}`, '<div id="wp-root"></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  wpRender();
}

function wpRender() {
  const root = document.getElementById('wp-root');
  if (!root) return;
  const days = Array.from({length: 7}, (_, i) => wpAddDays(wpState.weekStart, i));
  const weekLabel = `${wpFmtDate(days[0])} → ${wpFmtDate(days[6])}`;

  // Filtrar proyectos completados/cancelados — no se muestran en grid
  const hiddenProjectIds = new Set(wpState.projects.filter(p => p.status === 'completed' || p.status === 'cancelled').map(p => p.id));
  const activeProjects = wpState.projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  const completedCount = wpState.projects.filter(p => p.status === 'completed').length;
  const visibleActs = wpState.activities.filter(a => !hiddenProjectIds.has(a.project_id));

  // Casas con actividades esta semana O proyectos activos (excluye terminadas)
  const projectIds = new Set([
    ...visibleActs.map(a => a.project_id).filter(Boolean),
    ...activeProjects.map(p => p.id)
  ]);
  const homes = Array.from(projectIds).map(pid => {
    const p = wpState.projects.find(x => x.id === pid);
    return { id: pid, name: p?.name || 'Sin nombre', address: p?.address || '' };
  });
  // Agregar casas con actividades pero sin project linkeado (por property_name)
  const extraNames = new Set();
  visibleActs.forEach(a => {
    if (!a.project_id && a.property_name && !homes.some(h => h.name === a.property_name)) {
      extraNames.add(a.property_name);
    }
  });
  extraNames.forEach(name => homes.push({ id: 'name:' + name, name, address: '' }));

  // Detectar conflictos: misma resource en 2+ celdas el mismo día
  const conflicts = wpDetectConflicts();

  // KPIs de avance esta semana (solo casas visibles, excluye terminadas)
  const totalThisWeek = visibleActs.length;
  const doneThisWeek = visibleActs.filter(a => a.status === 'done').length;
  const progressPct = totalThisWeek ? Math.round(doneThisWeek/totalThisWeek*100) : 0;
  const overdueCount = visibleActs.filter(a =>
    a.status !== 'done' && a.status !== 'cancelled' && new Date(a.date) < new Date(wpDateOnly(new Date()))
  ).length;

  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[80vh]">
      <!-- HEADER -->
      <div class="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
        <div class="flex items-center gap-2">
          <button onclick="wpNavWeek(-1)" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-sm">←</button>
          <div class="font-bold text-sm">${weekLabel}</div>
          <button onclick="wpNavWeek(1)" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-sm">→</button>
          <button onclick="wpNavWeek(0)" class="px-3 py-1.5 bg-slate-900 text-white rounded text-xs ml-2">Hoy</button>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs bg-slate-900 text-white px-2 py-1 rounded font-bold" title="Progreso de la semana">📊 ${doneThisWeek}/${totalThisWeek} (${progressPct}%)</span>
          ${overdueCount ? `<span class="text-xs bg-red-600 text-white px-2 py-1 rounded font-bold">⏰ ${overdueCount} atrasadas</span>` : ''}
          ${conflicts.length ? `<span class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">⚠️ ${conflicts.length} conflictos</span>` : '<span class="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">✓ Sin conflictos</span>'}
          ${completedCount ? `<button onclick="wpOpenCompletedHouses()" class="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded font-bold" title="Ver casas terminadas y su análisis">📁 ${completedCount} terminadas</button>` : ''}
          <button onclick="wpOpenCrewByHour('${wpDateOnly(new Date())}')" class="text-xs bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 px-3 py-1.5 rounded font-bold" title="Ver qué hace cada crew hora por hora hoy">👷 Hoy Crew × Hora</button>
          <button onclick="wpToggleResourceForm()" class="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded">+ Recurso</button>
        </div>
      </div>

      <!-- BODY: Sidebar resources + Grid calendario -->
      <div class="flex gap-3 flex-1 min-h-0 overflow-hidden">
        <!-- SIDEBAR agrupado por tipo (acordeón) -->
        <div class="w-60 flex-shrink-0 border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div class="p-2 bg-slate-50 border-b border-slate-200">
            <div class="text-[10px] font-bold uppercase text-slate-600">Recursos · arrastra a un día</div>
          </div>
          <div class="flex-1 overflow-y-auto">
            ${wpRenderResourceGroup('crew', '👷 Equipos / Crews', 'border-blue-200 hover:border-blue-500')}
            ${wpRenderResourceGroup('specialist', '👨‍🔧 Especialistas / Subs', 'border-purple-200 hover:border-purple-500')}
            ${wpRenderResourceGroup('tool', '🔧 Herramientas / Equipos', 'border-amber-200 hover:border-amber-500')}
            ${wpRenderResourceGroup('vehicle', '🚚 Vehículos', 'border-slate-200 hover:border-slate-500')}
            ${wpRenderResourceGroup('other', '📦 Otros', 'border-slate-200 hover:border-slate-500')}
          </div>
          ${wpState.showResourceForm ? wpRenderResourceForm() : ''}
        </div>

        <!-- GRID -->
        <div class="flex-1 overflow-auto border border-slate-200 rounded-lg">
          <table class="w-full text-xs border-collapse">
            <thead class="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th class="text-left py-2 px-2 border-b border-r border-slate-200 sticky left-0 bg-slate-50 z-20 min-w-[120px]">Casa</th>
                ${days.map(d => {
                  const isToday = wpDateOnly(d) === wpDateOnly(new Date());
                  const isSunday = d.getDay() === 0;
                  const ds = wpDateOnly(d);
                  return `<th class="py-2 px-2 border-b border-r border-slate-200 min-w-[140px] ${isToday?'bg-amber-100':isSunday?'bg-slate-100':''} cursor-pointer hover:bg-slate-200" onclick="wpOpenDayView('${ds}')" title="Click para ver el día completo">${wpFmtDate(d)} <span class="text-[10px] text-slate-400">▤</span></th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${homes.length === 0 ? `<tr><td colspan="7" class="text-center text-slate-400 py-8">No hay obras activas esta semana.<br>Agrega actividades en una casa o crea proyectos activos.</td></tr>` : ''}
              ${homes.map(home => {
                const homeActs = wpState.activities.filter(a => a.project_id === home.id || (!a.project_id && home.id.startsWith('name:') && a.property_name === home.id.slice(5)));
                const homeDone = homeActs.filter(a => a.status === 'done').length;
                const homePct = homeActs.length ? Math.round(homeDone/homeActs.length*100) : 0;
                return `
                <tr>
                  <td class="py-2 px-2 border-b border-r border-slate-200 sticky left-0 bg-white z-10 align-top group">
                    <div class="cursor-pointer hover:bg-slate-50 -m-1 p-1 rounded" onclick="wpOpenHouseView('${home.id}','${home.name.replace(/'/g, "\\'")}')">
                      <div class="font-bold text-xs">${home.name} <span class="text-[9px] text-slate-400">▤</span></div>
                      ${home.address ? `<div class="text-[10px] text-slate-500 truncate">${home.address}</div>` : ''}
                      ${homeActs.length ? `<div class="mt-1"><div class="bg-slate-100 rounded-full h-1.5 overflow-hidden"><div class="bg-emerald-500 h-full" style="width:${homePct}%"></div></div><div class="text-[9px] text-slate-500 mt-0.5">${homeDone}/${homeActs.length} (${homePct}%)</div></div>` : ''}
                    </div>
                    <div class="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-100 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button onclick="event.stopPropagation(); wpCompleteHouse('${home.id}','${home.name.replace(/'/g, "\\'")}')" class="flex-1 text-[9px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold" title="Marcar casa como terminada y enviar tiempos al Estimador Pro">✅ Terminar</button>
                      <button onclick="event.stopPropagation(); wpDeleteHouse('${home.id}','${home.name.replace(/'/g, "\\'")}')" class="text-[9px] bg-red-50 hover:bg-red-100 text-red-700 px-1.5 py-0.5 rounded" title="Eliminar casa y todas sus actividades (no recuperable)">🗑️</button>
                    </div>
                  </td>
                  ${days.map(d => wpRenderCell(home, d, conflicts)).join('')}
                </tr>
              `;}).join('')}
              <!-- Fila para agregar nueva casa rápido -->
              <tr>
                <td class="py-2 px-2 border-b border-r border-slate-200 sticky left-0 bg-slate-50 z-10">
                  <input id="wp-new-house" placeholder="+ Casa (Enter)" onkeydown="if(event.key==='Enter')wpAddQuickHouse(this.value)" class="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                </td>
                ${days.map(d => `<td class="border-b border-r border-slate-200 bg-slate-50"></td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function wpRenderCell(home, date, conflicts) {
  const dateStr = wpDateOnly(date);
  const cellActs = wpState.activities.filter(a => {
    const matchProj = a.project_id === home.id;
    const matchName = !a.project_id && home.id.startsWith('name:') && a.property_name === home.id.slice(5);
    return (matchProj || matchName) && a.date === dateStr;
  });
  const cellDone = cellActs.filter(a => a.status === 'done').length;
  const cellProgress = cellActs.length ? Math.round(cellDone/cellActs.length*100) : 0;

  return `
    <td class="py-1 px-1 border-b border-r border-slate-200 align-top relative group"
        ondragover="event.preventDefault(); this.classList.add('bg-blue-50')"
        ondragleave="this.classList.remove('bg-blue-50')"
        ondrop="this.classList.remove('bg-blue-50'); wpDropOnCell('${home.id}','${home.name.replace(/'/g, "\\'")}','${dateStr}', event)">
      ${cellActs.length > 0 ? `<button onclick="wpOpenCellView('${home.id}','${home.name.replace(/'/g, "\\'")}','${dateStr}')" class="absolute top-0.5 right-0.5 text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 z-10" title="Ver detalle de este día">🔍 ${cellDone}/${cellActs.length}</button>` : ''}
      <div class="space-y-1 min-h-[50px]">
        ${cellActs.map(a => {
          const acts = (a.resource_ids || []).map(rid => wpState.resources.find(r => r.id === rid)).filter(Boolean);
          const hasConflict = (a.resource_ids || []).some(rid =>
            conflicts.some(c => c.resourceId === rid && c.date === dateStr)
          );
          // S6-U2: validar dependencias contra TODAS las actividades de esta casa (no solo de la semana)
          const allHomeActs = wpState.activities.filter(x => x.project_id === home.id || (!x.project_id && home.id.startsWith('name:') && x.property_name === home.id.slice(5)));
          const depCheck = a.status === 'done' ? { satisfied: true, blockers: [], minDate: null } : wpCheckDeps(a, allHomeActs);
          const hasDepIssue = !depCheck.satisfied;
          const statusColor = a.status === 'done' ? 'bg-emerald-50 border-emerald-300' :
                              a.status === 'in_progress' ? 'bg-blue-50 border-blue-300' :
                              a.status === 'cancelled' ? 'bg-slate-50 border-slate-200 opacity-60' :
                              hasConflict ? 'bg-red-50 border-red-300' :
                              hasDepIssue ? 'bg-amber-50 border-amber-300' :
                              'bg-white border-slate-200';
          const isLate = a.status !== 'done' && a.status !== 'cancelled' && new Date(a.date) < new Date(wpDateOnly(new Date()));
          return `
            <div class="${statusColor} border-2 rounded p-1.5 text-[11px] hover:border-slate-500"
                 draggable="true"
                 ondragstart="wpActivityDragStart('${a.id}', event)"
                 ondragend="wpState.draggedActivityId=null">
              <div class="flex items-start gap-1">
                <input type="checkbox" ${a.status==='done'?'checked':''} onclick="event.stopPropagation(); wpQuickToggleDone('${a.id}', event)" class="mt-0.5 cursor-pointer" title="Marcar como done" />
                <div class="flex-1 min-w-0 cursor-pointer" onclick="wpEditActivity('${a.id}')">
                  <div class="font-bold text-slate-900 leading-tight ${a.status==='done'?'line-through opacity-60':''}">${a.activity_name}</div>
                  <div class="flex items-center gap-1 flex-wrap">
                    ${a.stage ? `<div class="text-[10px] text-slate-500">${a.stage}</div>` : ''}
                    ${(a.notes||'').startsWith('[Estimador]') ? '<span class="text-[9px] bg-violet-100 text-violet-700 px-1 rounded font-bold">📐 EST</span>' : ''}
                    ${isLate ? '<span class="text-[9px] bg-red-600 text-white px-1 rounded font-bold">⏰ ATRASADA</span>' : ''}
                    ${hasDepIssue ? `<span class="text-[9px] bg-amber-600 text-white px-1 rounded font-bold" title="Dependencias no listas: ${depCheck.blockers.map(b => b.code).join(', ')}">🔗 ${depCheck.blockers.length} dep</span>` : ''}
                  </div>
                  ${acts.length ? `<div class="flex flex-wrap gap-0.5 mt-1">${acts.map(r => `<span class="text-[10px] bg-white border border-slate-300 px-1 rounded" title="${r.name}">${r.emoji}${r.type==='crew'?' '+r.name.replace('Crew ',''):''}</span>`).join('')}</div>` : ''}
                  ${hasConflict ? '<div class="text-[9px] text-red-600 font-bold mt-0.5">⚠️ Conflicto recurso</div>' : ''}
                  ${hasDepIssue && depCheck.minDate ? `<div class="text-[9px] text-amber-700 font-semibold mt-0.5">📅 Sugerido: ${depCheck.minDate}</div>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
        <button onclick="wpNewActivity('${home.id}','${home.name.replace(/'/g, "\\'")}','${dateStr}')"
                class="w-full text-[10px] text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded py-1">+ actividad</button>
      </div>
    </td>
  `;
}

// S6-U3: handlers de drag de actividades entre celdas
function wpActivityDragStart(activityId, ev) {
  wpState.draggedActivityId = activityId;
  wpState.draggedResource = null;
  if (ev && ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
}

function wpRenderResourceGroup(type, label, borderClass) {
  const items = wpState.resources.filter(r => r.type === type);
  if (items.length === 0) return '';
  const isOpen = wpState.openGroups?.[type] !== false; // default abierto
  return `
    <details ${isOpen?'open':''} ontoggle="if(!window.wpState.openGroups)window.wpState.openGroups={}; wpState.openGroups['${type}']=this.open">
      <summary class="cursor-pointer px-2 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold uppercase text-slate-700 hover:bg-slate-200 flex justify-between items-center">
        <span>${label}</span><span class="text-[10px] bg-slate-900 text-white px-1.5 rounded">${items.length}</span>
      </summary>
      <div class="p-1.5 space-y-1">
        ${items.map(r => `
          <div draggable="true"
               ondragstart="wpDragStart('${r.id}')"
               ondragend="wpState.draggedResource=null"
               class="bg-white border-2 ${borderClass} rounded p-1.5 cursor-grab active:cursor-grabbing">
            <div class="flex items-center gap-1.5">
              <span class="text-base">${r.emoji}</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-bold truncate">${r.name}</div>
                <div class="text-[9px] text-slate-500">${r.category || ''} ${r.cost_per_day ? '· $'+r.cost_per_day+'/d' : ''}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </details>
  `;
}

function wpRenderResourceForm() {
  return `
    <div class="p-2 border-t border-slate-200 bg-slate-50">
      <div class="text-[10px] font-bold uppercase text-slate-600 mb-1">Nuevo recurso</div>
      <input id="wp-res-name" placeholder="Nombre" class="w-full border border-slate-300 rounded px-2 py-1 text-xs mb-1" />
      <div class="grid grid-cols-2 gap-1 mb-1">
        <select id="wp-res-type" class="border border-slate-300 rounded px-1 py-1 text-xs">
          <option value="crew">👷 Crew</option>
          <option value="specialist">👨‍🔧 Specialist</option>
          <option value="tool">🔧 Tool</option>
          <option value="vehicle">🚚 Vehicle</option>
        </select>
        <input id="wp-res-emoji" placeholder="🔧" maxlength="3" value="🔧" class="border border-slate-300 rounded px-2 py-1 text-xs text-center" />
      </div>
      <input id="wp-res-cost" type="number" placeholder="$/día" class="w-full border border-slate-300 rounded px-2 py-1 text-xs mb-1" />
      <button onclick="wpCreateResource()" class="w-full bg-slate-900 text-white text-xs py-1.5 rounded">+ Crear</button>
    </div>
  `;
}

// ─── Conflicts ───
function wpDetectConflicts() {
  const map = {}; // `${resourceId}__${date}` -> [activities]
  wpState.activities.forEach(a => {
    (a.resource_ids || []).forEach(rid => {
      const key = `${rid}__${a.date}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
  });
  const conflicts = [];
  Object.entries(map).forEach(([key, acts]) => {
    if (acts.length > 1) {
      const [rid, date] = key.split('__');
      const res = wpState.resources.find(r => r.id === rid);
      if (res && acts.length > (res.capacity || 1)) {
        conflicts.push({ resourceId: rid, resourceName: res.name, date, activities: acts });
      }
    }
  });
  return conflicts;
}

// ─── DnD / Cell actions ───
function wpDragStart(rid) { wpState.draggedResource = rid; }

async function wpDropOnCell(homeId, homeName, dateStr, event) {
  event.preventDefault();

  // S6-U3: si lo que se arrastró es una actividad → mover
  if (wpState.draggedActivityId) {
    const actId = wpState.draggedActivityId;
    wpState.draggedActivityId = null;
    const a = wpState.activities.find(x => x.id === actId);
    if (!a) return;
    // Si misma fecha y misma casa → no hacer nada
    if (a.date === dateStr) {
      const sameHome = a.project_id === homeId || (!a.project_id && homeId.startsWith('name:') && a.property_name === homeId.slice(5));
      if (sameHome) return;
    }
    // S6-U2: si la actividad tiene deps no satisfechas en la nueva casa, avisar (no bloquear)
    const newProjectId = homeId.startsWith('name:') ? null : homeId;
    const newPropertyName = homeId.startsWith('name:') ? homeId.slice(5) : homeName;
    const newHomeActs = wpState.activities.filter(x => x.id !== actId && (x.project_id === newProjectId || (!x.project_id && newPropertyName && x.property_name === newPropertyName)));
    const movedAct = { ...a, date: dateStr };
    const depCheck = wpCheckDeps(movedAct, newHomeActs);
    if (!depCheck.satisfied) {
      const msg = `⚠️ Esta actividad depende de: ${depCheck.blockers.map(b => b.code + ' (' + (b.status || 'no existe') + ')').join(', ')}\n\nSugerencia: mover después del ${depCheck.minDate || '?'}\n\n¿Mover igual?`;
      if (!confirm(msg)) return;
    }
    const { error } = await sb.from('weekly_activities').update({
      date: dateStr,
      project_id: newProjectId,
      property_name: newProjectId ? a.property_name : newPropertyName,
      updated_at: new Date().toISOString()
    }).eq('id', actId);
    if (error) return alert('Error moviendo: ' + error.message);
    await wpLoadAll();
    wpRender();
    return;
  }

  // Flujo original: drop de un resource
  const rid = wpState.draggedResource;
  if (!rid) return;
  const cellActs = wpState.activities.filter(a => {
    const matchProj = a.project_id === homeId;
    const matchName = !a.project_id && homeId.startsWith('name:') && a.property_name === homeId.slice(5);
    return (matchProj || matchName) && a.date === dateStr;
  });
  if (cellActs.length === 1) {
    const a = cellActs[0];
    const ids = new Set(a.resource_ids || []);
    if (ids.has(rid)) return alert('Ese recurso ya está asignado a esta actividad');
    ids.add(rid);
    await sb.from('weekly_activities').update({ resource_ids: Array.from(ids), updated_at: new Date().toISOString() }).eq('id', a.id);
  } else {
    const res = wpState.resources.find(r => r.id === rid);
    const payload = {
      project_id: homeId.startsWith('name:') ? null : homeId,
      property_name: homeId.startsWith('name:') ? homeId.slice(5) : homeName,
      date: dateStr,
      activity_name: res ? `Trabajo con ${res.name}` : 'Nueva actividad',
      resource_ids: [rid],
      created_by: state.user.id
    };
    await sb.from('weekly_activities').insert(payload);
  }
  await wpLoadAll();
  wpRender();
}

async function wpNewActivity(homeId, homeName, dateStr) {
  const name = prompt('Nombre de la actividad (ej. "Poner concreto patio"):');
  if (!name) return;
  const stage = prompt('Etapa (opcional: demolicion, cimientos, drywall, etc.):') || null;
  await sb.from('weekly_activities').insert({
    project_id: homeId.startsWith('name:') ? null : homeId,
    property_name: homeId.startsWith('name:') ? homeId.slice(5) : homeName,
    date: dateStr,
    activity_name: name,
    stage,
    created_by: state.user.id
  });
  await wpLoadAll();
  wpRender();
}

function wpEditActivity(id) {
  const a = wpState.activities.find(x => x.id === id);
  if (!a) return;
  const assignedRes = (a.resource_ids || []).map(rid => wpState.resources.find(r => r.id === rid)).filter(Boolean);
  const availableRes = wpState.resources.filter(r => !(a.resource_ids||[]).includes(r.id));

  const html = `
    <div class="space-y-3">
      <div>
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Actividad</label>
        <input id="wpe-name" value="${(a.activity_name||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-semibold" />
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Status</label>
          <select id="wpe-status" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            ${['planned','in_progress','done','cancelled'].map(s => `<option value="${s}" ${a.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Prioridad</label>
          <select id="wpe-priority" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            ${['low','normal','high','urgent'].map(p => `<option value="${p}" ${a.priority===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Etapa</label>
          <input id="wpe-stage" value="${a.stage||''}" placeholder="demolicion, drywall..." class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Fecha</label>
          <input id="wpe-date" type="date" value="${a.date}" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Hora inicio</label>
          <input id="wpe-start" type="number" min="0" max="23" value="${a.start_hour||7}" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Hora fin</label>
          <input id="wpe-end" type="number" min="0" max="23" value="${a.end_hour||17}" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Recursos asignados (${assignedRes.length})</label>
        <div class="flex flex-wrap gap-1 mb-2 min-h-[36px] border border-slate-200 rounded p-2 bg-slate-50">
          ${assignedRes.length === 0 ? '<span class="text-xs text-slate-400">Sin recursos. Agrega abajo →</span>' :
            assignedRes.map(r => `<span class="bg-white border-2 border-emerald-400 rounded px-2 py-1 text-xs flex items-center gap-1">
              ${r.emoji} ${r.name}
              <button onclick="wpeRemoveRes('${r.id}')" class="text-red-600 hover:text-red-800 ml-1 font-bold">✕</button>
            </span>`).join('')}
        </div>
        <details>
          <summary class="cursor-pointer text-xs text-slate-600 hover:text-slate-900">+ Agregar recurso</summary>
          <div class="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1 max-h-48 overflow-y-auto border border-slate-200 rounded p-2">
            ${availableRes.map(r => `<button onclick="wpeAddRes('${r.id}')" class="text-left text-xs bg-white hover:bg-slate-100 border border-slate-200 rounded p-1.5">${r.emoji} ${r.name}</button>`).join('') || '<span class="text-xs text-slate-400">No hay recursos disponibles para agregar</span>'}
          </div>
        </details>
      </div>

      <div>
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Notas</label>
        <textarea id="wpe-notes" rows="2" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">${a.notes||''}</textarea>
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="wpeDelete('${id}')" class="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 rounded">🗑️ Eliminar</button>
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="wpeSave('${id}')" class="flex-1 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2 rounded">💾 Guardar</button>
      </div>
    </div>
  `;
  window._wpEditingId = id;
  openModal(`✏️ Editar actividad`, html);
}

async function wpeAddRes(rid) {
  const id = window._wpEditingId;
  const a = wpState.activities.find(x => x.id === id);
  if (!a) return;
  const newIds = [...(a.resource_ids||[]), rid];
  await sb.from('weekly_activities').update({ resource_ids: newIds, updated_at: new Date().toISOString() }).eq('id', id);
  await wpLoadAll();
  closeModal();
  setTimeout(() => wpEditActivity(id), 50);
}
async function wpeRemoveRes(rid) {
  const id = window._wpEditingId;
  const a = wpState.activities.find(x => x.id === id);
  if (!a) return;
  const newIds = (a.resource_ids||[]).filter(x => x !== rid);
  await sb.from('weekly_activities').update({ resource_ids: newIds, updated_at: new Date().toISOString() }).eq('id', id);
  await wpLoadAll();
  closeModal();
  setTimeout(() => wpEditActivity(id), 50);
}
async function wpeSave(id) {
  const payload = {
    activity_name: document.getElementById('wpe-name').value,
    status: document.getElementById('wpe-status').value,
    priority: document.getElementById('wpe-priority').value,
    stage: document.getElementById('wpe-stage').value || null,
    date: document.getElementById('wpe-date').value,
    start_hour: +document.getElementById('wpe-start').value || 7,
    end_hour: +document.getElementById('wpe-end').value || 17,
    notes: document.getElementById('wpe-notes').value || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('weekly_activities').update(payload).eq('id', id);
  if (error) return alert(error.message);
  await wpLoadAll();
  closeModal();
  wpRender();
}
async function wpeDelete(id) {
  if (!confirm('¿Eliminar esta actividad permanentemente?')) return;
  await sb.from('weekly_activities').delete().eq('id', id);
  await wpLoadAll();
  closeModal();
  wpRender();
}
// Quick toggle done desde el grid (sin abrir modal)
async function wpQuickToggleDone(id, ev) {
  ev.stopPropagation();
  const a = wpState.activities.find(x => x.id === id);
  if (!a) return;
  const newStatus = a.status === 'done' ? 'planned' : 'done';
  await sb.from('weekly_activities').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
  await wpLoadAll();
  wpRender();
}

function wpNavWeek(delta) {
  if (delta === 0) wpState.weekStart = wpMondayOf(new Date());
  else wpState.weekStart = wpAddDays(wpState.weekStart, delta * 7);
  wpLoadAll().then(wpRender);
}

function wpToggleResourceForm() {
  wpState.showResourceForm = !wpState.showResourceForm;
  wpRender();
}

async function wpAddQuickHouse(name) {
  name = (name || '').trim();
  if (!name) return;
  // Crea actividad placeholder en el primer día (lunes) para que la casa aparezca en el grid
  const dateStr = wpDateOnly(wpState.weekStart);
  await sb.from('weekly_activities').insert({
    property_name: name,
    date: dateStr,
    activity_name: 'Planificación',
    stage: 'preparacion',
    status: 'planned',
    created_by: state.user.id
  });
  await wpLoadAll();
  wpRender();
}

// ─── VISTA DÍA COMPLETO ───
function wpOpenDayView(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dayActs = wpState.activities.filter(a => a.date === dateStr);
  // Agrupar por casa
  const byHome = {};
  dayActs.forEach(a => {
    const key = a.project_id || ('name:' + (a.property_name || 'Sin asignar'));
    if (!byHome[key]) {
      const p = wpState.projects.find(x => x.id === a.project_id);
      byHome[key] = { name: p?.name || a.property_name || 'Sin asignar', address: p?.address || '', acts: [] };
    }
    byHome[key].acts.push(a);
  });
  // Recursos ocupados ese día
  const usedRes = {};
  dayActs.forEach(a => (a.resource_ids || []).forEach(rid => { if (!usedRes[rid]) usedRes[rid] = 0; usedRes[rid]++; }));
  const freeRes = wpState.resources.filter(r => !usedRes[r.id] || usedRes[r.id] < (r.capacity || 1));
  const busyRes = wpState.resources.filter(r => usedRes[r.id]);

  const html = `
    <div class="space-y-3">
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <div class="text-sm text-slate-400 uppercase font-bold">Día completo</div>
        <div class="text-2xl font-bold">${wpFmtDate(d)}</div>
        <div class="text-xs text-slate-400 mt-1">${Object.keys(byHome).length} casa(s) activa(s) · ${dayActs.length} actividad(es) · ${busyRes.length} recurso(s) ocupado(s)</div>
      </div>

      <!-- Casas con sus actividades -->
      <div class="grid md:grid-cols-2 gap-3">
        ${Object.entries(byHome).map(([key, home]) => `
          <div class="bg-white border border-slate-200 rounded-xl p-3">
            <div class="font-bold text-sm mb-2 pb-2 border-b border-slate-100">
              🏠 ${home.name}
              ${home.address ? `<div class="text-[10px] text-slate-500 font-normal">${home.address}</div>` : ''}
            </div>
            <div class="space-y-2">
              ${home.acts.map(a => {
                const acts = (a.resource_ids || []).map(rid => wpState.resources.find(r => r.id === rid)).filter(Boolean);
                const statusBg = a.status === 'done' ? 'bg-emerald-50' : a.status === 'in_progress' ? 'bg-blue-50' : a.status === 'cancelled' ? 'bg-slate-50' : 'bg-amber-50';
                return `
                  <div class="${statusBg} border border-slate-200 rounded p-2 text-xs cursor-pointer hover:border-slate-400" onclick="closeModal(); setTimeout(()=>wpEditActivity('${a.id}'), 100)">
                    <div class="font-bold">${a.activity_name}</div>
                    <div class="text-[10px] text-slate-500">${a.stage || '—'} · ${a.start_hour||7}:00-${a.end_hour||17}:00 · ${a.status}</div>
                    ${acts.length ? `<div class="flex flex-wrap gap-1 mt-1">${acts.map(r => `<span class="text-[10px] bg-white border border-slate-300 px-1.5 py-0.5 rounded" title="${r.name}">${r.emoji} ${r.name}</span>`).join('')}</div>` : '<div class="text-[10px] text-slate-400 italic">Sin recursos asignados</div>'}
                    ${a.notes ? `<div class="text-[10px] text-slate-600 mt-1 italic">📝 ${a.notes}</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('') || '<div class="col-span-2 text-center text-slate-400 py-8">No hay actividades planeadas para este día</div>'}
      </div>

      <!-- Recursos del día -->
      <div class="grid md:grid-cols-2 gap-3">
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-xs font-bold text-red-900 uppercase mb-2">🔴 Ocupados (${busyRes.length})</div>
          <div class="flex flex-wrap gap-1">
            ${busyRes.map(r => `<span class="bg-white border-2 border-red-300 rounded px-2 py-1 text-xs" title="${r.name}">${r.emoji} ${r.name}${usedRes[r.id] > 1 ? ` <span class="text-red-700 font-bold">(${usedRes[r.id]}x ⚠️)</span>`:''}</span>`).join('') || '<span class="text-xs text-slate-500">Ninguno ocupado</span>'}
          </div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-xs font-bold text-emerald-900 uppercase mb-2">🟢 Disponibles (${freeRes.length})</div>
          <div class="flex flex-wrap gap-1">
            ${freeRes.map(r => `<span class="bg-white border-2 border-emerald-300 rounded px-2 py-1 text-xs" title="${r.name}">${r.emoji} ${r.name}</span>`).join('') || '<span class="text-xs text-slate-500">Todos ocupados</span>'}
          </div>
        </div>
      </div>

      <button onclick="closeModal(); setTimeout(()=>openWeeklyPlanner(wpState.sys), 100)" class="w-full bg-slate-900 text-white text-sm font-bold py-2.5 rounded-lg">← Volver al calendario semanal</button>
    </div>
  `;
  openModal(`📅 Día completo: ${wpFmtDate(d)}`, html);
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-5xl');
}

// ─── S6-U4 · VISTA CREW × HORA del día ───
// Identifica overbookings de personas (1 worker en 2+ obras a la misma hora)
async function wpOpenCrewByHour(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  // Cargar las activities del día (puede no ser de la semana cargada en wpState)
  const { data: dayActs } = await sb.from('weekly_activities').select('*').eq('date', dateStr).order('start_hour');
  const acts = dayActs || [];

  // Solo crews/specialists (los workers que ocupan capacity humana)
  const workers = wpState.resources.filter(r => r.type === 'crew' || r.type === 'specialist');
  // Para cada worker, qué activities involucran a ese worker
  const workerSlots = {};
  workers.forEach(w => workerSlots[w.id] = []);
  acts.forEach(a => {
    (a.resource_ids || []).forEach(rid => {
      if (workerSlots[rid]) workerSlots[rid].push(a);
    });
  });

  // Horas 5am-22pm (rango más usado para construcción)
  const hours = [];
  for (let h = 5; h <= 22; h++) hours.push(h);

  // Detectar overbookings: misma hora con 2+ activities en distintas casas
  function getOverbookings(slots) {
    const byHour = {};
    slots.forEach(a => {
      for (let h = (a.start_hour || 7); h < (a.end_hour || 17); h++) {
        if (!byHour[h]) byHour[h] = [];
        byHour[h].push(a);
      }
    });
    const overbook = [];
    Object.entries(byHour).forEach(([h, as]) => {
      // Si hay 2+ activities en distintas casas a la misma hora → conflicto
      const uniqueHomes = new Set(as.map(a => a.project_id || a.property_name));
      if (uniqueHomes.size > 1) overbook.push({ hour: +h, activities: as });
    });
    return overbook;
  }

  // Color por proyecto (mismo home → mismo color)
  function homeColor(a) {
    const key = a.project_id || a.property_name || 'no_home';
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h*31 + key.charCodeAt(i)) >>> 0;
    const palette = ['bg-sky-200','bg-emerald-200','bg-rose-200','bg-violet-200','bg-amber-200','bg-cyan-200','bg-fuchsia-200','bg-lime-200'];
    return palette[h % palette.length];
  }

  const html = `
    <div class="space-y-3">
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <div class="text-xs text-slate-400 uppercase font-bold">Cobertura humana · ${wpFmtDate(d)}</div>
        <div class="text-2xl font-bold">👷 Crew × Hora</div>
        <div class="text-xs text-slate-400 mt-1">${workers.length} workers · ${acts.length} actividades · solo crews y specialists</div>
      </div>

      <div class="border border-slate-200 rounded-xl overflow-x-auto">
        <table class="w-full text-[10px] border-collapse">
          <thead class="bg-slate-50 sticky top-0">
            <tr>
              <th class="text-left p-1.5 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 min-w-[140px]">Worker</th>
              ${hours.map(h => `<th class="text-center p-1.5 border-r border-slate-200 min-w-[40px] font-mono">${h}</th>`).join('')}
              <th class="text-center p-1.5 min-w-[60px]">Total</th>
            </tr>
          </thead>
          <tbody>
            ${workers.map(w => {
              const slots = workerSlots[w.id] || [];
              const overbook = getOverbookings(slots);
              const overHours = new Set(overbook.map(o => o.hour));
              const totalHours = slots.reduce((s,a) => s + ((a.end_hour || 17) - (a.start_hour || 7)), 0);
              return `
                <tr class="border-t border-slate-100">
                  <td class="p-1.5 border-r border-slate-200 sticky left-0 bg-white z-10">
                    <div class="font-bold">${w.emoji} ${w.name}</div>
                    <div class="text-[9px] text-slate-500">${w.category || w.type}${w.cost_per_day ? ' · $' + w.cost_per_day + '/d' : ''}</div>
                  </td>
                  ${hours.map(h => {
                    const activeHere = slots.filter(a => h >= (a.start_hour || 7) && h < (a.end_hour || 17));
                    if (activeHere.length === 0) return `<td class="border-r border-slate-100 p-0.5"></td>`;
                    const isOver = overHours.has(h);
                    const a0 = activeHere[0];
                    const color = homeColor(a0);
                    const title = activeHere.map(a => `${a.activity_name} (${wpState.projects.find(p => p.id === a.project_id)?.name || a.property_name || '?'})`).join('\n');
                    return `<td class="border-r border-slate-100 p-0 align-middle">
                      <div class="${color} ${isOver?'ring-2 ring-red-500':''} h-7 flex items-center justify-center text-[9px] font-bold cursor-pointer" title="${title.replace(/"/g,'&quot;')}">
                        ${activeHere.length > 1 ? `<span class="text-red-700">⚠️${activeHere.length}</span>` : '●'}
                      </div>
                    </td>`;
                  }).join('')}
                  <td class="p-1.5 text-center font-bold ${overbook.length?'text-red-700':'text-slate-700'}">${totalHours}h${overbook.length?' ⚠️':''}</td>
                </tr>
              `;
            }).join('')}
            ${workers.length === 0 ? `<tr><td colspan="${hours.length + 2}" class="text-center text-slate-400 py-8">No hay workers en el catálogo. Agregá crews o specialists desde el tab Crew del Estimador Pro.</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-700">
        <strong>💡 Cómo leer:</strong> Cada fila es un worker. Cada celda es 1 hora. Color = casa donde trabaja. <strong class="text-red-700">⚠️ borde rojo</strong> = overbooking (mismo worker en 2+ casas a la misma hora). Hover para detalle. La idea es ver el día completo en una sola pantalla y detectar conflictos antes de que pasen.
      </div>

      <div class="flex gap-2">
        <button onclick="wpOpenCrewByHour('${wpDateOnly(wpAddDays(new Date(dateStr + 'T00:00:00'), -1))}')" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">← ${wpFmtDate(wpAddDays(new Date(dateStr + 'T00:00:00'), -1))}</button>
        <button onclick="closeModal(); setTimeout(()=>openWeeklyPlanner(wpState.sys), 100)" class="flex-1 bg-slate-900 text-white text-sm font-bold py-2 rounded">← Volver al calendario</button>
        <button onclick="wpOpenCrewByHour('${wpDateOnly(wpAddDays(new Date(dateStr + 'T00:00:00'), 1))}')" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">${wpFmtDate(wpAddDays(new Date(dateStr + 'T00:00:00'), 1))} →</button>
      </div>
    </div>
  `;
  openModal(`👷 Crew × Hora · ${wpFmtDate(d)}`, html);
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
}

// ─── VISTA CELDA: Casa × Día (todas las actividades de esa casa ese día) ───
function wpOpenCellView(homeId, homeName, dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const acts = wpState.activities.filter(a => {
    const matchProj = a.project_id === homeId;
    const matchName = !a.project_id && homeId.startsWith('name:') && a.property_name === homeId.slice(5);
    return (matchProj || matchName) && a.date === dateStr;
  });
  const done = acts.filter(a => a.status === 'done').length;
  const pct = acts.length ? Math.round(done/acts.length*100) : 0;
  const usedRes = new Set();
  acts.forEach(a => (a.resource_ids||[]).forEach(rid => usedRes.add(rid)));
  const resList = Array.from(usedRes).map(rid => wpState.resources.find(r => r.id === rid)).filter(Boolean);

  const html = `
    <div class="space-y-3">
      <!-- Header con resumen -->
      <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4">
        <div class="text-xs text-slate-400 uppercase font-bold">${wpFmtDate(d)}</div>
        <div class="text-lg font-bold">🏠 ${homeName}</div>
        <div class="mt-3 grid grid-cols-3 gap-2">
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">Avance</div>
            <div class="text-xl font-bold ${pct>=80?'text-emerald-400':pct>=50?'text-amber-400':'text-slate-300'}">${pct}%</div>
            <div class="text-[10px] text-slate-400">${done}/${acts.length}</div>
          </div>
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">Actividades</div>
            <div class="text-xl font-bold">${acts.length}</div>
          </div>
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">Recursos</div>
            <div class="text-xl font-bold">${resList.length}</div>
          </div>
        </div>
      </div>

      <!-- Actividades del día -->
      <div class="space-y-2">
        ${acts.length === 0 ? '<div class="text-center text-slate-400 py-6">No hay actividades en este día</div>' : acts.map(a => {
          const isDone = a.status === 'done';
          const isLate = !isDone && a.status !== 'cancelled' && new Date(a.date) < new Date(wpDateOnly(new Date()));
          const aRes = (a.resource_ids||[]).map(rid => wpState.resources.find(r => r.id === rid)).filter(Boolean);
          const fromEst = (a.notes||'').startsWith('[Estimador]');
          const bgCls = isDone ? 'bg-emerald-50 border-emerald-300' : isLate ? 'bg-red-50 border-red-300' : a.status === 'in_progress' ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200';
          return `
            <div class="${bgCls} border-2 rounded-xl p-3">
              <div class="flex items-start gap-2">
                <input type="checkbox" ${isDone?'checked':''} onclick="event.stopPropagation(); wpToggleFromCell('${a.id}','${homeId}','${homeName.replace(/'/g,"\\'")}','${dateStr}', event)" class="mt-1 w-5 h-5 cursor-pointer" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <div class="font-bold text-sm ${isDone?'line-through opacity-60':''}">${a.activity_name}</div>
                    ${fromEst ? '<span class="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold">📐 EST</span>' : ''}
                    ${isLate ? '<span class="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">⏰ ATRASADA</span>' : ''}
                  </div>
                  <div class="text-[11px] text-slate-500 mt-0.5">
                    ${a.stage ? `Etapa: <strong>${a.stage}</strong> · ` : ''}${a.start_hour||7}:00 - ${a.end_hour||17}:00 · Status: <strong>${a.status}</strong>
                  </div>
                  ${aRes.length ? `<div class="flex flex-wrap gap-1 mt-2">${aRes.map(r => `<span class="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs">${r.emoji} ${r.name}</span>`).join('')}</div>` : '<div class="text-[10px] text-slate-400 italic mt-1">Sin recursos asignados — arrastra desde el sidebar</div>'}
                  ${a.notes ? `<div class="text-[10px] text-slate-600 mt-2 italic">📝 ${a.notes}</div>` : ''}
                </div>
                <button onclick="closeModal(); setTimeout(()=>wpEditActivity('${a.id}'), 100)" class="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded">✏️ Editar</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <button onclick="closeModal(); setTimeout(()=>openWeeklyPlanner(wpState.sys), 100)" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">← Volver al calendario</button>
    </div>
  `;
  openModal(`🏠 ${homeName} — ${wpFmtDate(d)}`, html);
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-4xl');
}

async function wpToggleFromCell(activityId, homeId, homeName, dateStr, ev) {
  ev.stopPropagation();
  const a = wpState.activities.find(x => x.id === activityId);
  if (!a) return;
  const newStatus = a.status === 'done' ? 'planned' : 'done';
  await sb.from('weekly_activities').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', activityId);
  await wpLoadAll();
  // Reabrir la misma vista para ver el cambio
  wpOpenCellView(homeId, homeName, dateStr);
}

// ─── VISTA CASA: todo el cronograma de UNA casa con avance vs plan ───
async function wpOpenHouseView(homeId, homeName) {
  // Cargar TODAS las actividades de esa casa (no solo de la semana)
  let allActs = [];
  if (homeId.startsWith('name:')) {
    const { data } = await sb.from('weekly_activities').select('*').eq('property_name', homeId.slice(5)).order('date');
    allActs = data || [];
  } else {
    const { data } = await sb.from('weekly_activities').select('*').eq('project_id', homeId).order('date');
    allActs = data || [];
  }

  // Cargar proyecto del Estimador Pro si está vinculado
  let project = null, estimatedActs = [];
  if (!homeId.startsWith('name:')) {
    const { data } = await sb.from('remodel_projects').select('*').eq('id', homeId).single();
    project = data;
    estimatedActs = data?.activities || [];
  }

  const done = allActs.filter(a => a.status === 'done').length;
  const planned = allActs.length;
  const pct = planned ? Math.round(done/planned*100) : 0;
  const today = new Date(wpDateOnly(new Date()));
  const overdue = allActs.filter(a => a.status !== 'done' && a.status !== 'cancelled' && new Date(a.date) < today).length;
  const upcoming = allActs.filter(a => a.status !== 'done' && a.status !== 'cancelled' && new Date(a.date) >= today).length;
  const inProgress = allActs.filter(a => a.status === 'in_progress').length;
  const fromEstCount = allActs.filter(a => (a.notes||'').startsWith('[Estimador]')).length;

  // Días planeados vs días actuales transcurridos
  const dates = allActs.map(a => new Date(a.date)).filter(d => !isNaN(d));
  const minDate = dates.length ? new Date(Math.min(...dates)) : null;
  const maxDate = dates.length ? new Date(Math.max(...dates)) : null;
  const totalDaysPlanned = (minDate && maxDate) ? Math.round((maxDate - minDate)/86400000) + 1 : 0;
  const daysElapsed = minDate ? Math.max(0, Math.round((today - minDate)/86400000)) : 0;
  const daysRemaining = maxDate ? Math.max(0, Math.round((maxDate - today)/86400000)) : 0;
  const onTrack = totalDaysPlanned > 0 ? (daysElapsed / totalDaysPlanned * 100) <= (pct + 10) : true; // 10pt de tolerancia

  // Agrupar por fecha
  const byDate = {};
  allActs.forEach(a => { (byDate[a.date] = byDate[a.date] || []).push(a); });
  const sortedDates = Object.keys(byDate).sort();

  const html = `
    <div class="space-y-3">
      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div class="bg-emerald-50 border border-emerald-200 rounded p-3">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">Avance</div>
          <div class="text-2xl font-bold text-emerald-700">${pct}%</div>
          <div class="text-[10px] text-slate-500">${done} de ${planned} tareas</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Días transcurridos</div>
          <div class="text-2xl font-bold text-amber-700">${daysElapsed}/${totalDaysPlanned}</div>
          <div class="text-[10px] text-slate-500">${daysRemaining} días restantes</div>
        </div>
        <div class="bg-${overdue>0?'red':'slate'}-50 border border-${overdue>0?'red':'slate'}-200 rounded p-3">
          <div class="text-[10px] text-${overdue>0?'red':'slate'}-700 uppercase font-bold">Atrasadas</div>
          <div class="text-2xl font-bold text-${overdue>0?'red':'slate'}-700">${overdue}</div>
          <div class="text-[10px] text-slate-500">${inProgress} en progreso</div>
        </div>
        <div class="bg-${onTrack?'emerald':'red'}-50 border border-${onTrack?'emerald':'red'}-200 rounded p-3">
          <div class="text-[10px] text-${onTrack?'emerald':'red'}-700 uppercase font-bold">Status del plan</div>
          <div class="text-lg font-bold text-${onTrack?'emerald':'red'}-700">${onTrack ? '✓ En tiempo' : '⚠️ Atrasado'}</div>
          <div class="text-[10px] text-slate-500">${pct}% avance vs ${totalDaysPlanned?Math.round(daysElapsed/totalDaysPlanned*100):0}% tiempo</div>
        </div>
      </div>

      ${project ? `
      <!-- Conexión con Estimador -->
      <div class="bg-violet-50 border border-violet-200 rounded-xl p-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-violet-900 uppercase">📐 Sincronizado con Estimador Pro</div>
            <div class="text-xs text-violet-800 mt-1">
              Plan original: <strong>${estimatedActs.length} actividades</strong> · ${fromEstCount} sincronizadas al planner ·
              Presupuesto: <strong>$${Math.round(project.budget_total||0).toLocaleString()}</strong> ·
              Inicio: ${project.start_date} · Fin estimado: ${project.end_date_estimated||'—'}
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Timeline día por día -->
      <div class="border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">📅 Cronograma día a día</div>
        <div class="max-h-96 overflow-y-auto">
          ${sortedDates.length === 0 ? '<div class="p-6 text-center text-slate-400">Sin actividades planeadas</div>' : sortedDates.map(date => {
            const acts = byDate[date];
            const d = new Date(date + 'T00:00:00');
            const isPast = d < today;
            const isToday = wpDateOnly(d) === wpDateOnly(today);
            const doneInDay = acts.filter(a => a.status === 'done').length;
            return `
              <div class="border-t border-slate-100 p-3 ${isToday?'bg-amber-50':isPast?'bg-slate-50/50':''}">
                <div class="flex items-center justify-between mb-2">
                  <div class="text-xs font-bold ${isToday?'text-amber-900':isPast?'text-slate-500':'text-slate-900'}">${wpFmtDate(d)} ${isToday?'(HOY)':''}</div>
                  <div class="text-xs text-slate-500">${doneInDay}/${acts.length}</div>
                </div>
                <div class="space-y-1">
                  ${acts.map(a => {
                    const isDone = a.status === 'done';
                    const isLate = !isDone && a.status !== 'cancelled' && new Date(a.date) < today;
                    const aRes = (a.resource_ids||[]).map(rid => wpState.resources.find(r => r.id === rid)).filter(Boolean);
                    return `
                      <div class="flex items-start gap-2 text-xs ${isDone?'opacity-60':''}">
                        <input type="checkbox" ${isDone?'checked':''} onclick="wpHouseToggleDone('${a.id}','${homeId}','${homeName.replace(/'/g,"\\'")}', event)" class="mt-0.5 cursor-pointer" />
                        <div class="flex-1">
                          <div class="${isDone?'line-through':''} font-semibold">${a.activity_name}${isLate?' <span class="text-red-600 font-bold">⏰</span>':''}</div>
                          ${aRes.length ? `<div class="flex gap-1 flex-wrap mt-0.5">${aRes.map(r => `<span class="text-[10px] bg-slate-100 px-1 rounded">${r.emoji}</span>`).join('')}</div>` : ''}
                        </div>
                        <button onclick="closeModal(); setTimeout(()=>wpEditActivity('${a.id}'), 100)" class="text-[10px] text-slate-500 hover:text-slate-900">✏️</button>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <button onclick="closeModal(); setTimeout(()=>openWeeklyPlanner(wpState.sys), 100)" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">← Volver al calendario</button>
    </div>
  `;
  openModal(`🏠 ${homeName} — Vista completa`, html);
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-5xl');
}

async function wpHouseToggleDone(activityId, homeId, homeName, ev) {
  ev.stopPropagation();
  const a = wpState.activities.find(x => x.id === activityId);
  // Si no está en cache (puede ser otra semana), cargar
  const { data: full } = a ? { data: a } : await sb.from('weekly_activities').select('*').eq('id', activityId).single();
  if (!full) return;
  const newStatus = full.status === 'done' ? 'planned' : 'done';
  await sb.from('weekly_activities').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', activityId);
  await wpLoadAll();
  wpOpenHouseView(homeId, homeName); // refresh
}

async function wpCreateResource() {
  const name = document.getElementById('wp-res-name').value.trim();
  if (!name) return alert('Pon un nombre');
  const type = document.getElementById('wp-res-type').value;
  const emoji = document.getElementById('wp-res-emoji').value || '🔧';
  const cost = +document.getElementById('wp-res-cost').value || 0;
  await sb.from('resources').insert({ name, type, emoji, cost_per_day: cost });
  wpState.showResourceForm = false;
  await wpLoadAll();
  wpRender();
}

// ════════════════════════════════════════════════════════════
// 🗑️ ELIMINAR CASA — destructivo, borra todas las actividades
// ════════════════════════════════════════════════════════════
async function wpDeleteHouse(homeId, homeName) {
  const isNameOnly = homeId.startsWith('name:');
  const msg = `¿Eliminar "${homeName}" del planner?\n\n⚠️ Esto borra TODAS las actividades de esta casa (no se puede deshacer).\n\nSi querés conservar el historial usá "✅ Terminar" — eso mueve la casa al archivo y alimenta el Estimador Pro con los tiempos reales.`;
  if (!confirm(msg)) return;

  if (isNameOnly) {
    await sb.from('weekly_activities').delete().eq('property_name', homeId.slice(5)).is('project_id', null);
  } else {
    await sb.from('weekly_activities').delete().eq('project_id', homeId);
    const alsoProject = confirm('¿También eliminar el proyecto del Estimador Pro?\n\nOK = borrar proyecto + estimación completa.\nCancelar = solo borrar las actividades del planner (el proyecto queda intacto en Estimador Pro).');
    if (alsoProject) {
      await sb.from('remodel_actuals').delete().eq('project_id', homeId);
      await sb.from('remodel_projects').delete().eq('id', homeId);
    }
  }
  await wpLoadAll();
  wpRender();
}

// ════════════════════════════════════════════════════════════
// ✅ TERMINAR CASA — archiva + genera actuals para Estimador Pro
// ════════════════════════════════════════════════════════════
async function wpCompleteHouse(homeId, homeName) {
  const isNameOnly = homeId.startsWith('name:');

  // Cargar TODAS las actividades de la casa (no solo de esta semana)
  let allActs = [];
  if (isNameOnly) {
    const { data } = await sb.from('weekly_activities').select('*').eq('property_name', homeId.slice(5)).is('project_id', null).order('date');
    allActs = data || [];
  } else {
    const { data } = await sb.from('weekly_activities').select('*').eq('project_id', homeId).order('date');
    allActs = data || [];
  }

  if (!allActs.length) return alert('Esta casa no tiene actividades. Eliminala con 🗑️ si querés sacarla del planner.');

  const total = allActs.length;
  const done = allActs.filter(a => a.status === 'done').length;
  const pending = allActs.filter(a => a.status !== 'done' && a.status !== 'cancelled').length;

  const msg = `Marcar "${homeName}" como TERMINADA?\n\n✅ ${done} actividades hechas\n⏳ ${pending} pendientes (se cerrarán automáticamente)\n\nEsto:\n• Mueve la casa a "Casas terminadas" (no aparecerá más en el calendario)\n• Conserva TODO el histórico\n• Envía los tiempos reales al Estimador Pro para calibrar las próximas estimaciones`;
  if (!confirm(msg)) return;

  // Cerrar pendientes
  const pendingIds = allActs.filter(a => a.status !== 'done' && a.status !== 'cancelled').map(a => a.id);
  if (pendingIds.length) {
    await sb.from('weekly_activities').update({ status: 'done', updated_at: new Date().toISOString() }).in('id', pendingIds);
    allActs = allActs.map(a => pendingIds.includes(a.id) ? { ...a, status: 'done' } : a);
  }

  // Obtener / crear remodel_project
  let projectId = isNameOnly ? null : homeId;
  let project = null;
  if (projectId) {
    const { data } = await sb.from('remodel_projects').select('*').eq('id', projectId).single();
    project = data;
  } else {
    const dates = allActs.map(a => a.date).filter(Boolean).sort();
    const { data: created, error } = await sb.from('remodel_projects').insert({
      name: homeName,
      address: '',
      status: 'completed',
      start_date: dates[0] || wpDateOnly(new Date()),
      end_date_estimated: dates[dates.length - 1] || wpDateOnly(new Date()),
      completed_at: new Date().toISOString(),
      remodel_type: 'heavy',
      created_by: state.user.id
    }).select().single();
    if (error) { alert('Error creando proyecto: ' + error.message); return; }
    project = created;
    projectId = created.id;
    await sb.from('weekly_activities').update({ project_id: projectId }).eq('property_name', homeId.slice(5)).is('project_id', null);
  }

  if (project && project.status !== 'completed') {
    await sb.from('remodel_projects').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', projectId);
    project.status = 'completed';
  }

  // Generar remodel_actuals — feed al Estimador Pro
  const created = await wpGenerateActuals(project, allActs);

  await wpLoadAll();
  closeModal();
  wpRender();
  alert(`✅ "${homeName}" terminada.\n\n• ${pending} actividades cerradas\n• ${created} etapas enviadas al Estimador Pro\n\nLos tiempos reales ya están calibrando las próximas estimaciones (ver "📁 Terminadas" para ver el análisis).`);
}

// Agrega filas a remodel_actuals agrupando por etapa para alimentar benchmarks
async function wpGenerateActuals(project, allActs) {
  if (!project?.id) return 0;

  // Limpia actuals previos del proyecto (re-cálculo limpio cada vez)
  await sb.from('remodel_actuals').delete().eq('project_id', project.id);

  // Agrupar por etapa
  const byStage = {};
  allActs.forEach(a => {
    if (a.status !== 'done') return;
    const stage = (a.stage || 'sin_etapa').toLowerCase().trim();
    if (!byStage[stage]) byStage[stage] = { dates: new Set(), hours: 0, count: 0, resources: new Set() };
    byStage[stage].dates.add(a.date);
    byStage[stage].hours += ((+a.end_hour || 17) - (+a.start_hour || 7));
    byStage[stage].count++;
    (a.resource_ids || []).forEach(rid => byStage[stage].resources.add(rid));
  });

  // Estimados desde project.activities[]
  const estByStage = {};
  (project.activities || []).forEach(act => {
    const k = (act.stage_key || act.phase || act.stage || 'sin_etapa').toLowerCase().trim();
    if (!estByStage[k]) estByStage[k] = { cost: 0, days: 0 };
    estByStage[k].cost += +act.vu_total || 0;
    estByStage[k].days += +act.days || 0;
  });

  // Costos reales aproximados desde recursos × días trabajados
  const rows = Object.entries(byStage).map(([stage, d]) => {
    let realCost = 0;
    d.resources.forEach(rid => {
      const r = wpState.resources.find(x => x.id === rid);
      if (r?.cost_per_day) realCost += r.cost_per_day * d.dates.size;
    });
    return {
      project_id: project.id,
      activity_code: stage + '_consolidated',
      stage_key: stage,
      estimated_cost: estByStage[stage]?.cost || null,
      estimated_days: estByStage[stage]?.days || null,
      real_cost: realCost > 0 ? realCost : null,
      real_days: d.dates.size,
      real_hours: d.hours,
      sqft: project.sqft || null,
      notes: `Auto-generado al cerrar casa: ${d.count} actividades, ${d.dates.size} días, ${d.hours}h.`,
      recorded_by: state.user.id
    };
  });

  if (rows.length) {
    const { error } = await sb.from('remodel_actuals').insert(rows);
    if (error) console.warn('remodel_actuals insert:', error.message);
  }
  return rows.length;
}

// ════════════════════════════════════════════════════════════
// 📁 CASAS TERMINADAS — listado + análisis + restaurar
// ════════════════════════════════════════════════════════════
async function wpOpenCompletedHouses() {
  const completed = wpState.projects.filter(p => p.status === 'completed');
  const ids = completed.map(p => p.id);

  let actsByProject = {};
  if (ids.length) {
    const { data } = await sb.from('weekly_activities').select('project_id,status').in('project_id', ids);
    (data || []).forEach(a => {
      if (!actsByProject[a.project_id]) actsByProject[a.project_id] = { total: 0, done: 0 };
      actsByProject[a.project_id].total++;
      if (a.status === 'done') actsByProject[a.project_id].done++;
    });
  }

  const html = `
    <div class="space-y-3">
      <div class="text-xs text-slate-600 bg-emerald-50 border border-emerald-200 rounded p-2">
        🏆 <strong>${completed.length} casas terminadas.</strong> Todo el histórico está guardado y los tiempos reales alimentan los benchmarks del Estimador Pro para mejorar las próximas estimaciones.
      </div>
      ${completed.length === 0 ? '<div class="text-center text-slate-400 py-8">No hay casas terminadas todavía. Marcá una casa como ✅ Terminada desde el planner.</div>' : completed.map(p => {
        const a = actsByProject[p.id] || { total: 0, done: 0 };
        const completedDate = p.completed_at ? new Date(p.completed_at).toLocaleDateString() : '—';
        return `
          <div class="border border-slate-200 rounded-lg p-3 hover:border-slate-400 bg-white">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="font-bold text-sm">🏆 ${p.name}</div>
                ${p.address ? `<div class="text-xs text-slate-500">${p.address}</div>` : ''}
                <div class="text-[11px] text-slate-600 mt-1">
                  ${a.total} actividades · Inicio ${p.start_date || '—'} · Cerrada ${completedDate}
                  ${p.budget_total ? ` · Budget $${Math.round(p.budget_total).toLocaleString()}` : ''}
                  ${p.sqft ? ` · ${p.sqft} sqft` : ''}
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <button onclick="wpHouseAnalysis('${p.id}','${(p.name||'').replace(/'/g, "\\'")}')" class="text-[10px] bg-violet-50 hover:bg-violet-100 text-violet-700 px-2 py-1 rounded font-bold whitespace-nowrap">📊 Análisis</button>
                <button onclick="wpRestoreHouse('${p.id}','${(p.name||'').replace(/'/g, "\\'")}')" class="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded whitespace-nowrap">↩️ Restaurar</button>
                <button onclick="wpDeleteCompletedHouse('${p.id}','${(p.name||'').replace(/'/g, "\\'")}')" class="text-[10px] bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded whitespace-nowrap">🗑️ Borrar</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}

      <button onclick="closeModal(); setTimeout(()=>openWeeklyPlanner(wpState.sys), 100)" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">← Volver al calendario</button>
    </div>
  `;
  openModal(`📁 Casas terminadas (${completed.length})`, html);
  document.querySelector('#modal > div').classList.remove('max-w-7xl','max-w-5xl');
  document.querySelector('#modal > div').classList.add('max-w-3xl');
}

async function wpRestoreHouse(projectId, name) {
  if (!confirm(`Restaurar "${name}" al planner activo?\n\nVolverá a aparecer en el calendario. Los benchmarks generados se eliminarán (se regenerarán cuando vuelvas a terminarla).`)) return;
  await sb.from('remodel_projects').update({ status: 'active', completed_at: null }).eq('id', projectId);
  await sb.from('remodel_actuals').delete().eq('project_id', projectId);
  await wpLoadAll();
  closeModal();
  wpRender();
}

async function wpDeleteCompletedHouse(projectId, name) {
  if (!confirm(`¿BORRAR PERMANENTEMENTE "${name}"?\n\nEsto elimina:\n• El proyecto\n• Todas las actividades\n• Todos los benchmarks generados\n\nNo se puede deshacer. Esta casa ya no aportará al Estimador Pro.`)) return;
  await sb.from('remodel_actuals').delete().eq('project_id', projectId);
  await sb.from('weekly_activities').delete().eq('project_id', projectId);
  await sb.from('remodel_projects').delete().eq('id', projectId);
  await wpLoadAll();
  closeModal();
  setTimeout(() => wpOpenCompletedHouses(), 100);
}

async function wpHouseAnalysis(projectId, name) {
  const [{ data: project }, { data: actuals }, { data: acts }] = await Promise.all([
    sb.from('remodel_projects').select('*').eq('id', projectId).single(),
    sb.from('remodel_actuals').select('*').eq('project_id', projectId).order('real_cost', { ascending: false }),
    sb.from('weekly_activities').select('*').eq('project_id', projectId).order('date')
  ]);

  const A = actuals || [];
  const totalRealCost = A.reduce((s,a) => s + (+a.real_cost||0), 0);
  const totalEstCost = A.reduce((s,a) => s + (+a.estimated_cost||0), 0);
  const totalRealDays = A.reduce((s,a) => s + (+a.real_days||0), 0);
  const totalRealHours = A.reduce((s,a) => s + (+a.real_hours||0), 0);
  const variance = totalEstCost > 0 ? Math.round((totalRealCost - totalEstCost) / totalEstCost * 100) : null;
  const psfReal = project?.sqft ? (totalRealCost / project.sqft).toFixed(2) : null;

  const html = `
    <div class="space-y-3">
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <div class="text-xs text-slate-400 uppercase font-bold">Análisis post-mortem</div>
        <div class="text-xl font-bold">🏆 ${name}</div>
        <div class="text-xs text-slate-300 mt-1">${project?.address || ''} ${project?.sqft ? '· '+project.sqft+' sqft' : ''} · Cerrada ${project?.completed_at ? new Date(project.completed_at).toLocaleDateString() : '—'}</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">Costo real</div>
            <div class="text-base font-bold">$${Math.round(totalRealCost).toLocaleString()}</div>
            ${variance !== null ? `<div class="text-[10px] ${variance>0?'text-red-300':'text-emerald-300'}">${variance>0?'+':''}${variance}% vs estimado</div>` : '<div class="text-[10px] text-slate-400">sin estimado</div>'}
          </div>
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">Días trabajados</div>
            <div class="text-base font-bold">${totalRealDays}</div>
            ${psfReal ? `<div class="text-[10px] text-slate-400">$${psfReal}/ft²</div>` : ''}
          </div>
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">Horas totales</div>
            <div class="text-base font-bold">${totalRealHours}h</div>
          </div>
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">Actividades</div>
            <div class="text-base font-bold">${(acts||[]).length}</div>
          </div>
        </div>
      </div>

      <div class="border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">📊 Desglose por etapa — alimenta los benchmarks del Estimador Pro</div>
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left p-2">Etapa</th>
              <th class="text-right p-2">Días</th>
              <th class="text-right p-2">Hrs</th>
              <th class="text-right p-2">$ real</th>
              <th class="text-right p-2">$ estimado</th>
              <th class="text-right p-2">Δ</th>
            </tr>
          </thead>
          <tbody>
            ${A.length === 0 ? '<tr><td colspan="6" class="p-4 text-center text-slate-400">Sin datos de actuals. Las actividades necesitan etapa asignada para alimentar benchmarks.</td></tr>' : A.map(a => {
              const v = a.variance_cost_pct;
              return `<tr class="border-t border-slate-100">
                <td class="p-2 font-semibold">${a.stage_key}</td>
                <td class="p-2 text-right">${a.real_days||0}</td>
                <td class="p-2 text-right">${a.real_hours||0}h</td>
                <td class="p-2 text-right">$${Math.round(a.real_cost||0).toLocaleString()}</td>
                <td class="p-2 text-right text-slate-500">${a.estimated_cost ? '$'+Math.round(a.estimated_cost).toLocaleString() : '—'}</td>
                <td class="p-2 text-right font-bold ${v>0?'text-red-600':v<0?'text-emerald-600':'text-slate-400'}">${(v!==null && v!==undefined) ? (v>0?'+':'') + Math.round(v) + '%' : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="text-[11px] text-slate-500 bg-slate-50 rounded p-2">
        ℹ️ Estos datos están en la tabla <code>remodel_actuals</code> y se promedian con los de otras casas en la vista <code>remodel_dynamic_benchmarks</code> que usa el Estimador Pro para sus cálculos.
      </div>

      <button onclick="closeModal(); setTimeout(()=>wpOpenCompletedHouses(), 100)" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">← Volver a Terminadas</button>
    </div>
  `;
  openModal(`📊 ${name}`, html);
  document.querySelector('#modal > div').classList.remove('max-w-3xl','max-w-7xl');
  document.querySelector('#modal > div').classList.add('max-w-5xl');
}
