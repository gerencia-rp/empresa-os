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
  editingActivity: null
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
  const [{ data: resources }, { data: activities }, { data: projects }] = await Promise.all([
    sb.from('resources').select('*').eq('active', true).order('type').order('name'),
    sb.from('weekly_activities').select('*').gte('date', start).lte('date', end).order('date'),
    sb.from('remodel_projects').select('id,name,address,status').in('status', ['planning','active'])
  ]);
  wpState.resources = resources || [];
  wpState.activities = activities || [];
  wpState.projects = projects || [];
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

  // Casas que tienen actividades esta semana O proyectos activos
  const projectIds = new Set([
    ...wpState.activities.map(a => a.project_id).filter(Boolean),
    ...wpState.projects.map(p => p.id)
  ]);
  const homes = Array.from(projectIds).map(pid => {
    const p = wpState.projects.find(x => x.id === pid);
    return { id: pid, name: p?.name || 'Sin nombre', address: p?.address || '' };
  });
  // Agregar casas con actividades pero sin project linkeado (por property_name)
  const extraNames = new Set();
  wpState.activities.forEach(a => {
    if (!a.project_id && a.property_name && !homes.some(h => h.name === a.property_name)) {
      extraNames.add(a.property_name);
    }
  });
  extraNames.forEach(name => homes.push({ id: 'name:' + name, name, address: '' }));

  // Detectar conflictos: misma resource en 2+ celdas el mismo día
  const conflicts = wpDetectConflicts();

  // KPIs de avance esta semana
  const totalThisWeek = wpState.activities.length;
  const doneThisWeek = wpState.activities.filter(a => a.status === 'done').length;
  const progressPct = totalThisWeek ? Math.round(doneThisWeek/totalThisWeek*100) : 0;
  const overdueCount = wpState.activities.filter(a =>
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
              ${homes.map(home => `
                <tr>
                  <td class="py-2 px-2 border-b border-r border-slate-200 sticky left-0 bg-white z-10 align-top">
                    <div class="font-bold text-xs">${home.name}</div>
                    ${home.address ? `<div class="text-[10px] text-slate-500 truncate">${home.address}</div>` : ''}
                  </td>
                  ${days.map(d => wpRenderCell(home, d, conflicts)).join('')}
                </tr>
              `).join('')}
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

  return `
    <td class="py-1 px-1 border-b border-r border-slate-200 align-top"
        ondragover="event.preventDefault(); this.classList.add('bg-blue-50')"
        ondragleave="this.classList.remove('bg-blue-50')"
        ondrop="this.classList.remove('bg-blue-50'); wpDropOnCell('${home.id}','${home.name.replace(/'/g, "\\'")}','${dateStr}', event)">
      <div class="space-y-1 min-h-[50px]">
        ${cellActs.map(a => {
          const acts = (a.resource_ids || []).map(rid => wpState.resources.find(r => r.id === rid)).filter(Boolean);
          const hasConflict = (a.resource_ids || []).some(rid =>
            conflicts.some(c => c.resourceId === rid && c.date === dateStr)
          );
          const statusColor = a.status === 'done' ? 'bg-emerald-50 border-emerald-300' :
                              a.status === 'in_progress' ? 'bg-blue-50 border-blue-300' :
                              a.status === 'cancelled' ? 'bg-slate-50 border-slate-200 opacity-60' :
                              hasConflict ? 'bg-red-50 border-red-300' :
                              'bg-white border-slate-200';
          const isLate = a.status !== 'done' && a.status !== 'cancelled' && new Date(a.date) < new Date(wpDateOnly(new Date()));
          return `
            <div class="${statusColor} border-2 rounded p-1.5 text-[11px] hover:border-slate-500">
              <div class="flex items-start gap-1">
                <input type="checkbox" ${a.status==='done'?'checked':''} onclick="event.stopPropagation(); wpQuickToggleDone('${a.id}', event)" class="mt-0.5 cursor-pointer" title="Marcar como done" />
                <div class="flex-1 min-w-0 cursor-pointer" onclick="wpEditActivity('${a.id}')">
                  <div class="font-bold text-slate-900 leading-tight ${a.status==='done'?'line-through opacity-60':''}">${a.activity_name}</div>
                  <div class="flex items-center gap-1 flex-wrap">
                    ${a.stage ? `<div class="text-[10px] text-slate-500">${a.stage}</div>` : ''}
                    ${(a.notes||'').startsWith('[Estimador]') ? '<span class="text-[9px] bg-violet-100 text-violet-700 px-1 rounded font-bold">📐 EST</span>' : ''}
                    ${isLate ? '<span class="text-[9px] bg-red-600 text-white px-1 rounded font-bold">⏰ ATRASADA</span>' : ''}
                  </div>
                  ${acts.length ? `<div class="flex flex-wrap gap-0.5 mt-1">${acts.map(r => `<span class="text-[10px] bg-white border border-slate-300 px-1 rounded" title="${r.name}">${r.emoji}${r.type==='crew'?' '+r.name.replace('Crew ',''):''}</span>`).join('')}</div>` : ''}
                  ${hasConflict ? '<div class="text-[9px] text-red-600 font-bold mt-0.5">⚠️ Conflicto</div>' : ''}
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
  const rid = wpState.draggedResource;
  if (!rid) return;
  // Si la celda ya tiene 1 actividad, agregar resource a ESA. Si no, crear nueva actividad placeholder
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
    // Crear actividad nueva con un recurso
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
