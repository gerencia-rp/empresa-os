// ============================================================
// OPS PLANNER v2 — Backlog + Planificación por zona
// Juan Austin: tareas se acumulan sin fecha; un día se "arma" por zona
// (lunes Sur, martes Norte). Agrupado por casa para minimizar viajes.
// ============================================================

const opState = {
  sys: null,
  date: null,
  tasks: [],            // catálogo de plantillas
  dayTasks: [],         // tareas del día (date = opState.date)
  backlog: [],          // tareas sin fecha (date IS NULL)
  recurring: [],        // recurrentes activas
  properties: [],
  projects: [],         // remodel_projects activos
  draggedBacklogId: null,
  draggedScheduledId: null,
  draggedTemplateId: null,
  leftTab: 'backlog',   // backlog | templates
  view: 'day',          // day | week
  weekTasks: [],        // tareas de la semana actual (cuando view='week')
  libBusinessFilter: 'all',
  zonaFilter: 'all',
  backlogZonaFilter: 'all',
  showAddPendiente: false,
  // S6-U5: search + filtros backlog
  backlogSearch: '',
  backlogCategoryFilter: 'all',
  backlogPriorityFilter: 'all',
  backlogSort: 'oldest' // oldest | newest | priority | duration
};

function opMondayOf(dStr) {
  const x = new Date(dStr + 'T00:00:00');
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function opAddDays(dStr, n) {
  const x = new Date(dStr + 'T00:00:00');
  x.setDate(x.getDate() + n);
  return opDateOnly(x);
}

const OP_ZONAS = ['Norte','Sur'];
const OP_START_HOUR = 5, OP_END_HOUR = 22;
const OP_TRAVEL_BETWEEN_HOUSES = 20; // min default al armar día

function opZonaColor(z) {
  return z==='Norte' ? 'bg-orange-100 text-orange-700 border-orange-300' :
         z==='Sur'   ? 'bg-green-100 text-green-700 border-green-300' :
         'bg-slate-100 text-slate-600 border-slate-200';
}

// Color determinista por casa (hash → palette)
const OP_PROP_PALETTE = [
  'bg-sky-50 border-sky-300',
  'bg-emerald-50 border-emerald-300',
  'bg-rose-50 border-rose-300',
  'bg-violet-50 border-violet-300',
  'bg-amber-50 border-amber-300',
  'bg-cyan-50 border-cyan-300',
  'bg-fuchsia-50 border-fuchsia-300',
  'bg-lime-50 border-lime-300'
];
function opPropColor(propId) {
  if (!propId) return 'bg-slate-50 border-slate-300';
  let h = 0;
  for (let i = 0; i < propId.length; i++) h = (h*31 + propId.charCodeAt(i)) >>> 0;
  return OP_PROP_PALETTE[h % OP_PROP_PALETTE.length];
}

// ─── Utilidades ───
function opDateOnly(d) { return new Date(d).toISOString().split('T')[0]; }
function opFmtDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'short' }); }
function opPad(n) { return n < 10 ? '0'+n : ''+n; }
function opTimeToMin(t) { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60 + (m||0); }
function opMinToTime(m) { return `${opPad(Math.floor(m/60))}:${opPad(m%60)}`; }
function opFmt12(t) {
  if (!t) return '--';
  const [h,m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h === 0 ? 12 : (h > 12 ? h-12 : h);
  return `${hh}:${opPad(m||0)} ${ap}`;
}
function opAddMin(time, min) { return opMinToTime(opTimeToMin(time) + min); }
function opDaysAgo(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function opPropName(t) {
  if (t.property_id) {
    const p = opState.properties.find(x => x.id === t.property_id);
    return p ? (p.nickname || p.address || 'Casa sin nombre') : 'Casa eliminada';
  }
  if (t.project_id) {
    const p = opState.projects.find(x => x.id === t.project_id);
    return p ? (p.name || p.address) : 'Obra eliminada';
  }
  return t.location || null;
}

// ─── Data loading ───
async function opLoadAll() {
  if (!opState.date) opState.date = opDateOnly(new Date());

  // Si estamos en vista semana, cargar las 7 fechas; si día, solo opState.date
  const weekStart = opDateOnly(opMondayOf(opState.date));
  const weekEnd = opAddDays(weekStart, 6);

  const [tRes, dRes, wRes, bRes, rRes, pRes, projRes] = await Promise.all([
    sb.from('ops_tasks').select('*').eq('active', true).order('category').order('name'),
    sb.from('ops_day_tasks').select('*').eq('date', opState.date).order('start_time'),
    sb.from('ops_day_tasks').select('*').gte('date', weekStart).lte('date', weekEnd).order('date').order('start_time'),
    sb.from('ops_day_tasks').select('*').is('date', null).order('priority', { ascending: false }).order('created_at'),
    sb.from('ops_recurring').select('*').eq('active', true),
    sb.from('properties').select('id,address,nickname,property_type').order('address'),
    sb.from('remodel_projects').select('id,name,address,status').in('status', ['planning','active'])
  ]);
  opState.tasks = tRes.data || [];
  opState.dayTasks = dRes.data || [];
  opState.weekTasks = wRes.data || [];
  opState.backlog = bRes.data || [];
  opState.recurring = rRes.data || [];
  opState.properties = pRes.data || [];
  opState.projects = projRes.data || [];

  // Auto-rollback + generación recurrentes (silenciosas, no bloquean)
  await opAutoRollback();
  await opGenerateRecurring();
}

// Mueve tareas no-hechas de días pasados → backlog (date=null)
async function opAutoRollback() {
  const today = opDateOnly(new Date());
  if (opState.date < today) return; // solo si vemos hoy o futuro
  const { data: stale } = await sb.from('ops_day_tasks')
    .select('id')
    .lt('date', today)
    .in('status', ['planned','in_progress']);
  if (stale && stale.length) {
    const ids = stale.map(x => x.id);
    await sb.from('ops_day_tasks').update({ date: null, start_time: null, updated_at: new Date().toISOString() }).in('id', ids);
    // Recargar backlog
    const { data: b } = await sb.from('ops_day_tasks').select('*').is('date', null).order('created_at');
    opState.backlog = b || [];
  }
}

// Genera tareas pendientes a partir de recurrentes que ya vencieron
async function opGenerateRecurring() {
  const today = opDateOnly(new Date());
  const due = opState.recurring.filter(r => r.next_due <= today);
  if (!due.length) return;
  const rows = [];
  for (const r of due) {
    const base = opState.tasks.find(x => x.id === r.base_task_id);
    rows.push({
      title: r.custom_title || base?.name || 'Tarea recurrente',
      duration_min: r.custom_duration_min || base?.default_duration_min || 30,
      materials: r.custom_materials || base?.default_materials || [],
      checklist: (base?.default_checklist || []).map(item => ({ item, done: false })),
      task_id: r.base_task_id,
      property_id: r.property_id,
      project_id: r.project_id,
      zona: r.zona,
      business: r.business,
      priority: r.priority,
      recurring_id: r.id,
      created_by: state.user.id
    });
  }
  if (rows.length) {
    await sb.from('ops_day_tasks').insert(rows);
    // Actualizar next_due
    for (const r of due) {
      const next = new Date(today + 'T00:00:00');
      next.setDate(next.getDate() + r.interval_days);
      await sb.from('ops_recurring').update({
        last_generated: today,
        next_due: opDateOnly(next)
      }).eq('id', r.id);
    }
    // Recargar backlog
    const { data: b } = await sb.from('ops_day_tasks').select('*').is('date', null).order('created_at');
    opState.backlog = b || [];
  }
}

// ─── Entry ───
async function openOpsPlanner(sys) {
  opState.sys = sys;
  if (!opState.date) opState.date = opDateOnly(new Date());
  await opLoadAll();
  openModal(`🧰 ${sys.name}`, '<div id="op-root"></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  opRender();
}

// ─── Render principal ───
function opRender() {
  const root = document.getElementById('op-root');
  if (!root) return;

  // KPIs día
  const filteredDay = opState.dayTasks.filter(t => opState.zonaFilter === 'all' || t.zona === opState.zonaFilter);
  const total = filteredDay.length;
  const done = filteredDay.filter(t => t.status === 'done').length;
  const plannedMin = filteredDay.reduce((s,t) => s + (t.duration_min||0), 0);
  const travelMin = filteredDay.reduce((s,t) => s + (t.travel_min||0), 0);
  const sorted = [...filteredDay].sort((a,b) => opTimeToMin(a.start_time) - opTimeToMin(b.start_time));
  let gapMin = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = opTimeToMin(sorted[i-1].start_time) + (sorted[i-1].duration_min||0);
    const thisStart = opTimeToMin(sorted[i].start_time);
    if (thisStart > prevEnd) gapMin += thisStart - prevEnd;
  }

  const today = opDateOnly(new Date());
  const isToday = opState.date === today;

  // Backlog count
  const backlogTotal = opState.backlog.length;
  const backlogByZona = {};
  opState.backlog.forEach(t => { const z = t.zona || '∅'; backlogByZona[z] = (backlogByZona[z]||0) + 1; });

  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[84vh]">

      <!-- HEADER -->
      <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <div class="flex bg-slate-100 rounded p-0.5">
            <button onclick="opSetView('day')" class="px-2 py-1 rounded text-xs font-bold ${opState.view==='day'?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-200'}">📅 Día</button>
            <button onclick="opSetView('week')" class="px-2 py-1 rounded text-xs font-bold ${opState.view==='week'?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-200'}">📊 Semana</button>
          </div>
          <button onclick="opNav(-1)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm">←</button>
          <input type="date" value="${opState.date}" onchange="opGoToDate(this.value)" class="border border-slate-300 rounded px-2 py-1 text-sm font-bold" />
          <button onclick="opNav(1)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm">→</button>
          ${!isToday ? '<button onclick="opNav(0)" class="px-2 py-1 bg-slate-900 text-white rounded text-xs">Hoy</button>' : ''}
          <div class="text-xs font-bold text-slate-700 ml-1 capitalize">${opState.view==='week' ? `Semana ${opDateOnly(opMondayOf(opState.date))} → ${opAddDays(opDateOnly(opMondayOf(opState.date)),6)}` : opFmtDate(opState.date)}</div>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs bg-slate-900 text-white px-2 py-1 rounded font-bold" title="Avance del día">✅ ${done}/${total}</span>
          <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">⏱ ${Math.floor(plannedMin/60)}h ${plannedMin%60}m</span>
          ${travelMin ? `<span class="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">🚗 ${travelMin}m</span>` : ''}
          ${gapMin > 30 ? `<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold" title="Tiempo muerto">⚠️ ${gapMin}m muertos</span>` : ''}
          <div class="flex gap-0.5 items-center bg-slate-50 rounded px-1 py-0.5 border border-slate-200">
            <span class="text-[9px] text-slate-500 uppercase font-bold mr-1">Zona</span>
            <button onclick="opSetZonaFilter('all')" class="text-[10px] px-1.5 py-0.5 rounded ${opState.zonaFilter==='all'?'bg-slate-900 text-white':'bg-white hover:bg-slate-100'}">Todas</button>
            ${OP_ZONAS.map(z => `<button onclick="opSetZonaFilter('${z}')" class="text-[10px] px-1.5 py-0.5 rounded ${opState.zonaFilter===z?'bg-slate-900 text-white':opZonaColor(z)}">${z}</button>`).join('')}
          </div>
          <button onclick="opOpenArmarDia()" class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded font-bold" title="Toma todo el backlog de una zona y lo agenda en este día agrupado por casa">🎯 Armar día</button>
        </div>
      </div>

      <!-- BODY -->
      <div class="flex gap-3 flex-1 min-h-0 overflow-hidden">

        <!-- IZQUIERDA: Backlog + Plantillas -->
        <div class="w-72 flex-shrink-0 border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <!-- Tabs -->
          <div class="flex border-b border-slate-200 bg-slate-50">
            <button onclick="opSetLeftTab('backlog')" class="flex-1 px-2 py-2 text-xs font-bold ${opState.leftTab==='backlog'?'bg-white border-b-2 border-slate-900':'text-slate-500 hover:bg-slate-100'}">
              📥 Backlog <span class="bg-slate-900 text-white text-[10px] px-1.5 rounded">${backlogTotal}</span>
            </button>
            <button onclick="opSetLeftTab('templates')" class="flex-1 px-2 py-2 text-xs font-bold ${opState.leftTab==='templates'?'bg-white border-b-2 border-slate-900':'text-slate-500 hover:bg-slate-100'}">
              📚 Plantillas
            </button>
          </div>

          ${opState.leftTab === 'backlog' ? opRenderBacklogPanel(backlogByZona) : opRenderTemplatesPanel()}
        </div>

        <!-- DERECHA: Día o Semana -->
        <div class="flex-1 overflow-hidden border border-slate-200 rounded-lg flex flex-col">
          ${opState.view === 'week' ? opRenderWeek() : `
            <div class="sticky top-0 bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between z-10">
              <div class="text-xs font-bold uppercase text-slate-700">📅 Itinerario ${opState.zonaFilter !== 'all' ? `· <span class="${opZonaColor(opState.zonaFilter)} px-1.5 rounded">${opState.zonaFilter}</span>` : ''}</div>
              <div class="flex gap-1">
                <button onclick="opOpenAddLoose()" class="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">+ Tarea libre</button>
                <button onclick="opClearDay()" class="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded" title="Devolver todas al backlog">↩ Vaciar día</button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto">
              ${opRenderTimeline(filteredDay)}
            </div>
            ${opRenderMaterialsSummary(filteredDay)}
          `}
        </div>

      </div>
    </div>
  `;
}

// ─── Panel Backlog ───
function opRenderBacklogPanel(backlogByZona) {
  const search = (opState.backlogSearch || '').toLowerCase().trim();
  const catF = opState.backlogCategoryFilter || 'all';
  const prioF = opState.backlogPriorityFilter || 'all';
  const sortBy = opState.backlogSort || 'oldest';

  // S6-U5: filtros aplicados
  let filtered = opState.backlog.filter(t => {
    if (opState.backlogZonaFilter !== 'all' && t.zona !== opState.backlogZonaFilter) return false;
    if (catF !== 'all') {
      const tpl = opState.tasks.find(x => x.id === t.task_id);
      if ((tpl?.category || '') !== catF) return false;
    }
    if (prioF !== 'all' && (t.priority || 'normal') !== prioF) return false;
    if (search) {
      const hay = ((t.title || '') + ' ' + (opPropName(t) || '') + ' ' + (t.notes || '')).toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  // S6-U5: ordenar
  filtered.sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'priority') {
      const ord = { urgent: 0, high: 1, normal: 2, low: 3 };
      return (ord[a.priority] || 2) - (ord[b.priority] || 2);
    }
    if (sortBy === 'duration') return (b.duration_min || 0) - (a.duration_min || 0);
    return new Date(a.created_at) - new Date(b.created_at); // oldest first (default)
  });

  // Categorías únicas (desde templates) para el filtro
  const categories = Array.from(new Set(opState.tasks.map(t => t.category).filter(Boolean))).sort();

  // Agrupar por casa (property_id || project_id || '__sin__')
  const byProp = {};
  filtered.forEach(t => {
    const key = t.property_id ? 'p:'+t.property_id : t.project_id ? 'j:'+t.project_id : '__sin__';
    if (!byProp[key]) byProp[key] = { name: opPropName(t) || 'Sin casa asignada', tasks: [], oldestDays: 0 };
    byProp[key].tasks.push(t);
    byProp[key].oldestDays = Math.max(byProp[key].oldestDays, opDaysAgo(t.created_at));
  });
  // Ordenar casas: la que tiene tarea más vieja primero
  const propOrder = Object.entries(byProp).sort((a,b) => b[1].oldestDays - a[1].oldestDays);

  return `
    <div class="p-2 bg-slate-50 border-b border-slate-200">
      <button onclick="opOpenAddPendiente()" class="w-full text-xs bg-slate-900 hover:bg-slate-700 text-white py-2 rounded font-bold">+ Pendiente</button>
      <button onclick="opOpenManageRecurring()" class="w-full text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 py-1 mt-1 rounded" title="Configurar tareas recurrentes (cambio filtros AC cada 90d, podar cada 14d)">⚙️ Recurrentes (${opState.recurring.length})</button>

      <!-- S6-U5: Search + filtros -->
      <div class="mt-2 space-y-1">
        <input type="text" placeholder="🔎 Buscar título, casa, notas..." value="${(search || '').replace(/"/g,'&quot;')}"
          oninput="opState.backlogSearch=this.value; opRender()"
          class="w-full border border-slate-300 rounded px-2 py-1 text-[11px]" />
        <div class="grid grid-cols-2 gap-1">
          <select onchange="opState.backlogCategoryFilter=this.value; opRender()" class="border border-slate-300 rounded px-1 py-0.5 text-[10px]">
            <option value="all" ${catF==='all'?'selected':''}>Toda categoría</option>
            ${categories.map(c => `<option value="${c}" ${catF===c?'selected':''}>${c}</option>`).join('')}
          </select>
          <select onchange="opState.backlogPriorityFilter=this.value; opRender()" class="border border-slate-300 rounded px-1 py-0.5 text-[10px]">
            <option value="all" ${prioF==='all'?'selected':''}>Toda prioridad</option>
            <option value="urgent" ${prioF==='urgent'?'selected':''}>🔴 Urgent</option>
            <option value="high" ${prioF==='high'?'selected':''}>🟠 High</option>
            <option value="normal" ${prioF==='normal'?'selected':''}>Normal</option>
            <option value="low" ${prioF==='low'?'selected':''}>Low</option>
          </select>
        </div>
        <select onchange="opState.backlogSort=this.value; opRender()" class="w-full border border-slate-300 rounded px-1 py-0.5 text-[10px]">
          <option value="oldest" ${sortBy==='oldest'?'selected':''}>Orden: más viejo primero</option>
          <option value="newest" ${sortBy==='newest'?'selected':''}>Orden: más nuevo primero</option>
          <option value="priority" ${sortBy==='priority'?'selected':''}>Orden: por prioridad</option>
          <option value="duration" ${sortBy==='duration'?'selected':''}>Orden: por duración</option>
        </select>
      </div>

      <div class="flex gap-0.5 mt-2 flex-wrap">
        <button onclick="opSetBacklogZona('all')" class="text-[10px] px-1.5 py-0.5 rounded ${opState.backlogZonaFilter==='all'?'bg-slate-900 text-white':'bg-white border border-slate-300'}">Todas (${opState.backlog.length})</button>
        ${OP_ZONAS.map(z => {
          const c = backlogByZona[z] || 0;
          if (!c) return '';
          return `<button onclick="opSetBacklogZona('${z}')" class="text-[10px] px-1.5 py-0.5 rounded ${opState.backlogZonaFilter===z?'bg-slate-900 text-white':opZonaColor(z)}">${z} ${c}</button>`;
        }).join('')}
      </div>
      ${(search || catF !== 'all' || prioF !== 'all' || opState.backlogZonaFilter !== 'all') ? `
        <div class="mt-1 text-[9px] text-slate-600">
          Mostrando ${filtered.length} de ${opState.backlog.length}
          <button onclick="opState.backlogSearch=''; opState.backlogCategoryFilter='all'; opState.backlogPriorityFilter='all'; opState.backlogZonaFilter='all'; opRender()" class="ml-1 text-blue-600 hover:underline">✕ limpiar</button>
        </div>
      ` : ''}
    </div>
    <div class="flex-1 overflow-y-auto p-1.5 space-y-1.5">
      ${propOrder.length === 0 ? '<div class="text-center text-slate-400 text-xs py-6">Backlog vacío. ¡Todo al día!</div>' : propOrder.map(([key, prop]) => `
        <div class="border border-slate-200 rounded">
          <div class="bg-slate-50 px-2 py-1 text-[11px] font-bold flex items-center justify-between border-b border-slate-200">
            <span class="truncate" title="${prop.name}">🏠 ${prop.name}</span>
            <span class="text-[9px] text-slate-500 ml-1 flex-shrink-0">${prop.tasks.length} · ${prop.oldestDays}d</span>
          </div>
          <div class="p-1 space-y-1">
            ${prop.tasks.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(t => {
              const age = opDaysAgo(t.created_at);
              const ageColor = age > 30 ? 'text-red-600 font-bold' : age > 14 ? 'text-amber-600' : 'text-slate-500';
              const prio = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : '';
              return `
                <div draggable="true"
                     ondragstart="opBacklogDragStart('${t.id}')"
                     ondragend="opState.draggedBacklogId=null"
                     class="bg-white border ${t.zona ? opZonaColor(t.zona).replace('bg-','border-').replace(' text-','-').split(' ')[0].replace('-100','-300') : 'border-slate-200'} rounded p-1.5 cursor-grab active:cursor-grabbing hover:shadow-sm">
                  <div class="flex items-start gap-1">
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-bold leading-tight">${prio}${t.title}</div>
                      <div class="text-[10px] ${ageColor} mt-0.5">⏱ ${t.duration_min}m · ${age}d en backlog${t.zona ? ` · <span class="${opZonaColor(t.zona)} px-1 rounded">${t.zona}</span>` : ''}</div>
                    </div>
                    <button onclick="event.stopPropagation(); opEditBacklog('${t.id}')" class="text-[10px] text-slate-400 hover:text-slate-900" title="Editar">✏️</button>
                    <button onclick="event.stopPropagation(); opDeleteBacklog('${t.id}')" class="text-[10px] text-slate-400 hover:text-red-600" title="Borrar">✕</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Panel Plantillas ───
function opRenderTemplatesPanel() {
  const filtered = opState.tasks.filter(t => opState.libBusinessFilter === 'all' || t.business === opState.libBusinessFilter);
  const byCat = {};
  filtered.forEach(t => { (byCat[t.category||'otros'] = byCat[t.category||'otros'] || []).push(t); });

  return `
    <div class="p-2 bg-slate-50 border-b border-slate-200">
      <div class="text-[10px] text-slate-600 mb-1">Arrastrá una plantilla al horario para crear una tarea agendada directa (sin pasar por backlog)</div>
      <div class="flex gap-1 flex-wrap">
        ${['all','rentas','remodelacion','both'].map(b => `<button onclick="opSetLibFilter('${b}')" class="text-[10px] px-2 py-0.5 rounded ${opState.libBusinessFilter===b?'bg-slate-900 text-white':'bg-white border border-slate-300'}">${b==='all'?'Todas':b==='both'?'Ambas':b}</button>`).join('')}
      </div>
    </div>
    <div class="flex-1 overflow-y-auto p-1.5 space-y-1">
      ${Object.entries(byCat).map(([cat, items]) => `
        <details open class="border border-slate-100 rounded">
          <summary class="cursor-pointer px-2 py-1 bg-slate-50 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-100">${cat} <span class="text-slate-400">(${items.length})</span></summary>
          <div class="p-1 space-y-1">
            ${items.map(t => `
              <div draggable="true"
                   ondragstart="opTemplateDragStart('${t.id}')"
                   ondragend="opState.draggedTemplateId=null"
                   class="bg-white border-2 ${t.business==='rentas'?'border-blue-200 hover:border-blue-500':t.business==='remodelacion'?'border-amber-200 hover:border-amber-500':'border-slate-200 hover:border-slate-500'} rounded p-1.5 cursor-grab active:cursor-grabbing">
                <div class="flex items-start gap-1.5">
                  <span class="text-base leading-none">${t.emoji||'🧰'}</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold leading-tight">${t.name}</div>
                    <div class="text-[9px] text-slate-500 mt-0.5">⏱ ${t.default_duration_min}m</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </details>
      `).join('')}
    </div>
  `;
}

// ─── Timeline ───
function opRenderTimeline(filteredDay) {
  // Slots de 30 min
  const slots = [];
  for (let h = OP_START_HOUR; h < OP_END_HOUR; h++) {
    slots.push({ time: `${opPad(h)}:00`, isHour: true });
    slots.push({ time: `${opPad(h)}:30`, isHour: false });
  }

  // Agrupar tareas por slot
  const byStart = {};
  filteredDay.forEach(t => {
    const k = (t.start_time||'').substring(0,5);
    (byStart[k] = byStart[k] || []).push(t);
  });

  // Detectar cambios de casa para visual
  const sorted = [...filteredDay].sort((a,b) => opTimeToMin(a.start_time) - opTimeToMin(b.start_time));
  const propChanges = {};
  let lastProp = null;
  sorted.forEach(t => {
    const propKey = t.property_id || t.project_id || null;
    if (propKey !== lastProp) {
      propChanges[t.start_time?.substring(0,5)] = { from: lastProp, to: propKey, name: opPropName(t) };
      lastProp = propKey;
    }
  });

  // Gaps
  const gaps = {};
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = opTimeToMin(sorted[i-1].start_time) + (sorted[i-1].duration_min||0);
    const thisStart = opTimeToMin(sorted[i].start_time);
    if (thisStart > prevEnd) gaps[opMinToTime(prevEnd).substring(0,5)] = thisStart - prevEnd;
  }

  return `
    <div class="divide-y divide-slate-100">
      ${slots.map(slot => {
        const acts = byStart[slot.time] || [];
        const gapHere = gaps[slot.time];
        const propChange = propChanges[slot.time];
        return `
          <div class="flex group ${slot.isHour?'bg-slate-50/50':''}"
               ondragover="event.preventDefault(); this.classList.add('bg-blue-50')"
               ondragleave="this.classList.remove('bg-blue-50')"
               ondrop="this.classList.remove('bg-blue-50'); opDropOnSlot('${slot.time}', event)">
            <div class="w-16 flex-shrink-0 text-right pr-2 py-1.5 text-[11px] font-bold ${slot.isHour?'text-slate-900':'text-slate-400'} border-r border-slate-100">
              ${slot.isHour ? opFmt12(slot.time) : ''}
            </div>
            <div class="flex-1 py-0.5 px-2 min-h-[36px]">
              ${propChange && propChange.from && propChange.to && propChange.from !== propChange.to ? `<div class="text-[10px] text-amber-700 italic mb-1 flex items-center gap-1"><span>🚗</span><span>cambio a 🏠 ${propChange.name}</span></div>` : ''}
              ${gapHere ? `<div class="text-[10px] text-red-500 italic mb-1">⏳ ${gapHere}m de hueco</div>` : ''}
              ${acts.length === 0 ? `<div class="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100">arrastra del backlog →</div>` : acts.map(t => opRenderScheduledTask(t)).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─── Vista Semana ───
function opRenderWeek() {
  const weekStart = opDateOnly(opMondayOf(opState.date));
  const days = Array.from({length:7}, (_, i) => opAddDays(weekStart, i));
  const today = opDateOnly(new Date());

  return `
    <div class="sticky top-0 bg-slate-50 border-b border-slate-200 px-3 py-2 z-10">
      <div class="text-xs font-bold uppercase text-slate-700">📊 Vista semanal · arrastrá del backlog a un día</div>
    </div>
    <div class="grid grid-cols-7 flex-1 overflow-auto divide-x divide-slate-200">
      ${days.map(dStr => {
        const d = new Date(dStr + 'T00:00:00');
        const dayName = d.toLocaleDateString('es-MX',{weekday:'short'});
        const dayNum = d.getDate();
        const isToday = dStr === today;
        const isSelected = dStr === opState.date;
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const acts = opState.weekTasks.filter(t => t.date === dStr && (opState.zonaFilter === 'all' || t.zona === opState.zonaFilter))
          .sort((a,b) => opTimeToMin(a.start_time) - opTimeToMin(b.start_time));
        const totalMin = acts.reduce((s,t) => s+(t.duration_min||0)+(t.travel_min||0), 0);
        const done = acts.filter(t => t.status === 'done').length;
        const zonaCount = { Norte:0, Sur:0 };
        acts.forEach(t => { if (t.zona) zonaCount[t.zona] = (zonaCount[t.zona]||0)+1; });
        const dominantZona = zonaCount.Norte > zonaCount.Sur ? 'Norte' : zonaCount.Sur > zonaCount.Norte ? 'Sur' : null;

        return `
          <div class="flex flex-col min-w-0 ${isToday?'bg-amber-50/40':isWeekend?'bg-slate-50/40':'bg-white'} ${isSelected?'ring-2 ring-slate-900 ring-inset':''}"
               ondragover="event.preventDefault(); this.classList.add('bg-blue-50')"
               ondragleave="this.classList.remove('bg-blue-50')"
               ondrop="this.classList.remove('bg-blue-50'); opDropOnWeekDay('${dStr}', event)">
            <button onclick="opGoToDate('${dStr}'); opSetView('day')" class="border-b border-slate-200 px-2 py-1.5 text-left hover:bg-slate-100 sticky top-0 bg-inherit z-[1]">
              <div class="flex items-center justify-between gap-1">
                <div>
                  <div class="text-[10px] uppercase font-bold text-slate-500">${dayName}</div>
                  <div class="text-lg font-bold ${isToday?'text-amber-700':''}">${dayNum}</div>
                </div>
                <div class="text-right">
                  ${dominantZona ? `<span class="text-[9px] ${opZonaColor(dominantZona)} px-1 rounded font-bold">${dominantZona}</span>` : ''}
                  ${acts.length ? `<div class="text-[9px] text-slate-500 mt-0.5">${done}/${acts.length} · ${Math.floor(totalMin/60)}h${totalMin%60?totalMin%60+'m':''}</div>` : ''}
                </div>
              </div>
              ${zonaCount.Norte && zonaCount.Sur ? `<div class="text-[9px] text-amber-700 mt-0.5">⚠️ mezcla zonas</div>` : ''}
            </button>
            <div class="flex-1 overflow-y-auto p-1 space-y-1 min-h-[200px]">
              ${acts.length === 0 ? `<div class="text-[10px] text-slate-300 text-center py-4 italic">vacío</div>` : acts.map(t => opRenderWeekTaskCard(t)).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function opRenderWeekTaskCard(t) {
  const locText = opPropName(t) || '';
  const propCls = opPropColor(t.property_id || t.project_id);
  const isDone = t.status === 'done';
  const cl = t.checklist || [];
  const clDone = cl.filter(x => x.done).length;
  return `
    <div draggable="true"
         ondragstart="opSchedDragStart('${t.id}')"
         ondragend="opState.draggedScheduledId=null"
         onclick="opEditScheduled('${t.id}')"
         class="${isDone?'bg-emerald-50 border-emerald-300 opacity-70':propCls} border rounded p-1 cursor-grab text-[10px] hover:shadow-sm">
      <div class="flex items-center gap-1">
        <span class="font-bold text-slate-900">${opFmt12(t.start_time).replace(' ','')}</span>
        ${t.zona ? `<span class="${opZonaColor(t.zona)} px-1 rounded text-[8px] font-bold">${t.zona[0]}</span>` : ''}
        ${isDone ? '<span class="text-emerald-700">✓</span>' : ''}
      </div>
      <div class="font-semibold truncate ${isDone?'line-through':''}">${t.title}</div>
      ${locText ? `<div class="text-slate-600 truncate">🏠 ${locText}</div>` : ''}
      ${cl.length ? `<div class="text-slate-500 text-[9px]">📋 ${clDone}/${cl.length}</div>` : ''}
    </div>
  `;
}

async function opDropOnWeekDay(dateStr, ev) {
  ev.preventDefault();
  if (opState.draggedScheduledId) {
    const id = opState.draggedScheduledId; opState.draggedScheduledId = null;
    await sb.from('ops_day_tasks').update({ date: dateStr, updated_at: new Date().toISOString() }).eq('id', id);
  } else if (opState.draggedBacklogId) {
    const id = opState.draggedBacklogId; opState.draggedBacklogId = null;
    // Buscar hora libre: 8am si día vacío, sino end del último + 0
    const existing = opState.weekTasks.filter(x => x.date === dateStr).sort((a,b) => opTimeToMin(a.start_time) - opTimeToMin(b.start_time));
    let startTime = '08:00';
    if (existing.length) {
      const last = existing[existing.length-1];
      startTime = opAddMin(last.start_time, last.duration_min);
    }
    await sb.from('ops_day_tasks').update({ date: dateStr, start_time: startTime, updated_at: new Date().toISOString() }).eq('id', id);
  } else if (opState.draggedTemplateId) {
    const tmpl = opState.tasks.find(x => x.id === opState.draggedTemplateId);
    opState.draggedTemplateId = null;
    if (!tmpl) return;
    const existing = opState.weekTasks.filter(x => x.date === dateStr).sort((a,b) => opTimeToMin(a.start_time) - opTimeToMin(b.start_time));
    let startTime = '08:00';
    if (existing.length) {
      const last = existing[existing.length-1];
      startTime = opAddMin(last.start_time, last.duration_min);
    }
    await sb.from('ops_day_tasks').insert({
      date: dateStr, start_time: startTime,
      duration_min: tmpl.default_duration_min || 30,
      title: tmpl.name, task_id: tmpl.id, business: tmpl.business,
      materials: tmpl.default_materials || [],
      checklist: (tmpl.default_checklist || []).map(item => ({ item, done: false })),
      created_by: state.user.id
    });
  } else return;
  await opLoadAll();
  opRender();
}

function opRenderScheduledTask(t) {
  const endTime = opAddMin(t.start_time, t.duration_min);
  const locText = opPropName(t);
  const propCls = opPropColor(t.property_id || t.project_id);
  const mats = t.materials || [];
  const isDone = t.status === 'done';
  const isInProg = t.status === 'in_progress';
  const isSkipped = t.status === 'skipped';
  const statusBg = isDone ? 'bg-emerald-50 border-emerald-300' :
                   isInProg ? 'bg-blue-50 border-blue-300' :
                   isSkipped ? 'bg-slate-50 border-slate-200 opacity-50' :
                   propCls;
  const prio = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : '';

  return `
    <div draggable="true"
         ondragstart="opSchedDragStart('${t.id}')"
         ondragend="opState.draggedScheduledId=null"
         class="${statusBg} border-2 rounded-lg p-1.5 mb-1 group/task hover:shadow-sm cursor-grab active:cursor-grabbing">
      <div class="flex items-start gap-1.5">
        <input type="checkbox" ${isDone?'checked':''} onclick="event.stopPropagation(); opToggleDone('${t.id}')" class="mt-0.5 cursor-pointer" />
        <div class="flex-1 min-w-0" onclick="opEditScheduled('${t.id}')">
          <div class="flex items-center gap-1 flex-wrap">
            <span class="text-xs font-bold ${isDone?'line-through opacity-60':''}">${prio}${t.title}</span>
            <span class="text-[10px] text-slate-500">${opFmt12(t.start_time)}→${opFmt12(endTime)} · ${t.duration_min}m</span>
            ${t.zona ? `<span class="text-[9px] ${opZonaColor(t.zona)} border px-1 rounded font-bold">${t.zona}</span>` : ''}
            ${t.travel_min ? `<span class="text-[9px] bg-slate-200 text-slate-700 px-1 rounded">🚗 ${t.travel_min}m</span>` : ''}
            ${t.recurring_id ? '<span class="text-[9px] bg-violet-100 text-violet-700 px-1 rounded font-bold" title="Tarea recurrente auto-generada">🔁</span>' : ''}
          </div>
          ${locText ? `<div class="text-[10px] text-slate-700 mt-0.5 font-semibold">🏠 ${locText}</div>` : ''}
          ${mats.length ? `<div class="flex flex-wrap gap-0.5 mt-1">${mats.slice(0,5).map(m => `<span class="text-[9px] bg-white border border-slate-300 px-1 rounded">${m}</span>`).join('')}${mats.length > 5 ? `<span class="text-[9px] text-slate-400">+${mats.length-5}</span>`:''}</div>` : ''}
          ${(t.checklist || []).length ? (() => {
            const cl = t.checklist;
            const cd = cl.filter(x => x.done).length;
            const pct = Math.round(cd/cl.length*100);
            return `<div class="mt-1 cursor-pointer" onclick="event.stopPropagation(); opOpenChecklist('${t.id}')" title="Click para revisar entregables">
              <div class="flex items-center gap-1">
                <span class="text-[10px] font-bold ${cd===cl.length?'text-emerald-700':'text-slate-600'}">📋 ${cd}/${cl.length} entregables</span>
                <div class="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden"><div class="${cd===cl.length?'bg-emerald-500':'bg-blue-500'} h-full" style="width:${pct}%"></div></div>
              </div>
            </div>`;
          })() : ''}
          ${t.notes ? `<div class="text-[10px] text-slate-500 italic mt-0.5">📝 ${t.notes}</div>` : ''}
        </div>
        <div class="flex flex-col gap-0.5 opacity-0 group-hover/task:opacity-100">
          <button onclick="event.stopPropagation(); opSendToBacklog('${t.id}')" class="text-[10px] text-slate-400 hover:text-slate-900" title="Devolver al backlog">↩</button>
          <button onclick="event.stopPropagation(); opDeleteScheduled('${t.id}')" class="text-[10px] text-slate-400 hover:text-red-600" title="Eliminar">✕</button>
        </div>
      </div>
    </div>
  `;
}

function opRenderMaterialsSummary(filteredDay) {
  const allMats = {};
  filteredDay.forEach(t => {
    if (t.status === 'skipped') return;
    (t.materials || []).forEach(m => { allMats[m] = (allMats[m]||0) + 1; });
  });
  const entries = Object.entries(allMats).sort((a,b) => b[1]-a[1]);
  if (!entries.length) return '';

  return `
    <div class="border-t border-slate-200 p-2 bg-amber-50/30">
      <div class="text-[10px] font-bold uppercase text-amber-900 mb-1">🧳 Lista del día — llevar al truck</div>
      <div class="flex flex-wrap gap-1">
        ${entries.map(([m,c]) => `<span class="bg-white border border-amber-300 text-amber-900 text-[10px] px-1.5 py-0.5 rounded">${m}${c>1?` <strong>×${c}</strong>`:''}</span>`).join('')}
      </div>
    </div>
  `;
}

// ─── Navegación / filtros ───
function opNav(delta) {
  const step = opState.view === 'week' ? 7 : 1;
  if (delta === 0) opState.date = opDateOnly(new Date());
  else { const d = new Date(opState.date + 'T00:00:00'); d.setDate(d.getDate() + delta*step); opState.date = opDateOnly(d); }
  opLoadAll().then(opRender);
}
function opSetView(v) {
  opState.view = v;
  opLoadAll().then(opRender);
}
function opNavDay(delta) { opNav(delta); } // alias retrocompat
function opGoToDate(v) { if (!v) return; opState.date = v; opLoadAll().then(opRender); }
function opSetZonaFilter(z) { opState.zonaFilter = z; opRender(); }
function opSetBacklogZona(z) { opState.backlogZonaFilter = z; opRender(); }
function opSetLibFilter(b) { opState.libBusinessFilter = b; opRender(); }
function opSetLeftTab(t) { opState.leftTab = t; opRender(); }

// ─── Drag & drop ───
function opBacklogDragStart(id) { opState.draggedBacklogId = id; opState.draggedTemplateId = null; opState.draggedScheduledId = null; }
function opTemplateDragStart(id) { opState.draggedTemplateId = id; opState.draggedBacklogId = null; opState.draggedScheduledId = null; }
function opSchedDragStart(id) { opState.draggedScheduledId = id; opState.draggedBacklogId = null; opState.draggedTemplateId = null; }

async function opDropOnSlot(slotTime, ev) {
  ev.preventDefault();
  if (opState.draggedScheduledId) {
    const id = opState.draggedScheduledId; opState.draggedScheduledId = null;
    await sb.from('ops_day_tasks').update({ start_time: slotTime, updated_at: new Date().toISOString() }).eq('id', id);
  } else if (opState.draggedBacklogId) {
    const id = opState.draggedBacklogId; opState.draggedBacklogId = null;
    await sb.from('ops_day_tasks').update({ date: opState.date, start_time: slotTime, updated_at: new Date().toISOString() }).eq('id', id);
  } else if (opState.draggedTemplateId) {
    const tmpl = opState.tasks.find(x => x.id === opState.draggedTemplateId);
    opState.draggedTemplateId = null;
    if (!tmpl) return;
    await sb.from('ops_day_tasks').insert({
      date: opState.date, start_time: slotTime,
      duration_min: tmpl.default_duration_min || 30,
      title: tmpl.name, task_id: tmpl.id, business: tmpl.business,
      materials: tmpl.default_materials || [],
      checklist: (tmpl.default_checklist || []).map(item => ({ item, done: false })),
      created_by: state.user.id
    });
  } else return;
  await opLoadAll();
  opRender();
}

// ─── + Pendiente (al backlog) ───
function opOpenAddPendiente() {
  const propsOpts = opState.properties.map(p => `<option value="prop:${p.id}">🏠 ${p.nickname || p.address}</option>`).join('');
  const projsOpts = opState.projects.map(p => `<option value="proj:${p.id}">🏗️ ${p.name || p.address}</option>`).join('');
  const tmplOpts = opState.tasks.map(t => `<option value="${t.id}" data-dur="${t.default_duration_min}" data-mats='${JSON.stringify(t.default_materials||[])}' data-emoji="${t.emoji}">${t.emoji} ${t.name}</option>`).join('');
  const html = `
    <div class="space-y-3">
      <div class="text-xs text-slate-500">Crea una tarea que se acumula en el backlog. Luego la arrastrás al horario cuando armes el día, o usás 🎯 Armar día.</div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Plantilla (opcional, autocompleta)</label>
        <select id="op-p-template" onchange="opPendienteFromTemplate(this)" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
          <option value="">— ninguna —</option>
          ${tmplOpts}
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Título *</label>
        <input id="op-p-title" placeholder="Qué hay que hacer" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Duración (min)</label>
          <input id="op-p-dur" type="number" value="30" min="5" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Zona</label>
          <select id="op-p-zona" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            <option value="">—</option>
            ${OP_ZONAS.map(z => `<option value="${z}">${z}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Prioridad</label>
          <select id="op-p-priority" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            <option value="normal">Normal</option>
            <option value="low">Baja</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Casa (auto-llena zona si elegís una)</label>
        <select id="op-p-target" onchange="opPendientePickTarget(this)" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
          <option value="">— ninguna —</option>
          <optgroup label="🏠 Rentas">${propsOpts}</optgroup>
          <optgroup label="🏗️ Obras">${projsOpts}</optgroup>
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Materiales (coma)</label>
        <input id="op-p-materials" placeholder="taladro, brochas..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Notas</label>
        <textarea id="op-p-notes" rows="2" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"></textarea>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal(); setTimeout(()=>openOpsPlanner(opState.sys), 100)" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="opCreatePendiente()" class="flex-1 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2 rounded">+ Al backlog</button>
      </div>
    </div>
  `;
  openModal('+ Pendiente al backlog', html);
}

function opPendienteFromTemplate(sel) {
  const opt = sel.selectedOptions[0];
  if (!opt || !opt.value) return;
  document.getElementById('op-p-title').value = opt.text.replace(/^[^\s]+\s/, ''); // sin emoji
  document.getElementById('op-p-dur').value = opt.dataset.dur || 30;
  try {
    const mats = JSON.parse(opt.dataset.mats || '[]');
    document.getElementById('op-p-materials').value = mats.join(', ');
  } catch {}
}
function opPendientePickTarget(sel) {
  // si el target tiene zona conocida, no la cambiamos (no la tenemos en properties por ahora)
}

async function opCreatePendiente() {
  const title = document.getElementById('op-p-title').value.trim();
  if (!title) return alert('Pon un título');
  const target = document.getElementById('op-p-target').value || '';
  const property_id = target.startsWith('prop:') ? target.slice(5) : null;
  const project_id = target.startsWith('proj:') ? target.slice(5) : null;
  const tmplId = document.getElementById('op-p-template').value || null;
  const tmpl = tmplId ? opState.tasks.find(x => x.id === tmplId) : null;
  const payload = {
    title,
    task_id: tmplId,
    duration_min: +document.getElementById('op-p-dur').value || 30,
    zona: document.getElementById('op-p-zona').value || null,
    priority: document.getElementById('op-p-priority').value,
    property_id, project_id,
    business: project_id ? 'remodelacion' : 'rentas',
    materials: (document.getElementById('op-p-materials').value || '').split(',').map(s => s.trim()).filter(Boolean),
    checklist: (tmpl?.default_checklist || []).map(item => ({ item, done: false })),
    notes: document.getElementById('op-p-notes').value || null,
    created_by: state.user.id
  };
  const { error } = await sb.from('ops_day_tasks').insert(payload);
  if (error) return alert(error.message);
  closeModal();
  setTimeout(() => openOpsPlanner(opState.sys), 100);
}

// ─── 🎯 Armar día por zona ───
function opOpenArmarDia() {
  const counts = {};
  opState.backlog.forEach(t => { const z = t.zona || '∅'; counts[z] = (counts[z]||0)+1; });
  const zonaOpts = OP_ZONAS.map(z => `<option value="${z}">${z} (${counts[z]||0} pendientes)</option>`).join('');
  const html = `
    <div class="space-y-3">
      <div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-900">
        🎯 <strong>Armar día por zona</strong> toma TODOS los pendientes del backlog de la zona seleccionada y los agenda en este día.
        <ul class="mt-2 list-disc list-inside text-[11px] space-y-0.5">
          <li>Agrupa por casa (todas las tareas de una casa van juntas, sin viajes en medio)</li>
          <li>Ordena casas por antigüedad de pendiente (la más vieja primero)</li>
          <li>Inserta ${OP_TRAVEL_BETWEEN_HOUSES} min de viaje entre casas distintas</li>
          <li>Las tareas no completadas vuelven solas al backlog al día siguiente</li>
        </ul>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Zona</label>
          <select id="op-ar-zona" class="w-full border border-slate-300 rounded px-2 py-2 text-sm font-bold">
            ${zonaOpts}
            <option value="∅">Sin zona asignada (${counts['∅']||0})</option>
            <option value="all">Todas las pendientes (${opState.backlog.length})</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Hora de inicio</label>
          <input id="op-ar-start" type="time" value="08:00" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
      </div>
      <div class="grid grid-cols-4 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Viaje misma zona</label>
          <input id="op-ar-travel" type="number" value="${OP_TRAVEL_BETWEEN_HOUSES}" min="0" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" title="Minutos entre casas de la misma zona" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Viaje cruzar zona</label>
          <input id="op-ar-travel-cross" type="number" value="${OP_TRAVEL_BETWEEN_HOUSES * 2}" min="0" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" title="S6-U6: minutos extra al cambiar de zona (Norte → Sur)" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Hora almuerzo</label>
          <input id="op-ar-lunch" type="time" value="12:00" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Almuerzo (min)</label>
          <input id="op-ar-lunch-dur" type="number" value="60" min="0" step="15" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal(); setTimeout(()=>openOpsPlanner(opState.sys), 100)" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="opEjecutarArmarDia()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">🎯 Armar</button>
      </div>
    </div>
  `;
  openModal(`🎯 Armar día — ${opFmtDate(opState.date)}`, html);
}

async function opEjecutarArmarDia() {
  const zona = document.getElementById('op-ar-zona').value;
  const startTime = document.getElementById('op-ar-start').value || '08:00';
  const travelSame = +document.getElementById('op-ar-travel').value || 0;
  const travelCross = +(document.getElementById('op-ar-travel-cross')?.value || travelSame * 2) || travelSame;
  const lunchTime = document.getElementById('op-ar-lunch').value || '12:00';
  const lunchDur = +document.getElementById('op-ar-lunch-dur').value || 0;

  // Filtrar backlog
  let cand = opState.backlog;
  if (zona === '∅') cand = cand.filter(t => !t.zona);
  else if (zona !== 'all') cand = cand.filter(t => t.zona === zona);
  if (!cand.length) return alert('No hay pendientes para esa zona.');

  // S6-U6: Agrupar PRIMERO por zona (si all), DESPUÉS por casa dentro de zona
  // Sort: cada zona como bloque, ordenadas por más vieja → minimizar viajes inter-zona
  const byProp = {};
  cand.forEach(t => {
    const k = t.property_id ? 'p:'+t.property_id : t.project_id ? 'j:'+t.project_id : '__sin__';
    if (!byProp[k]) byProp[k] = { tasks: [], oldestCreated: t.created_at, zona: t.zona || null };
    byProp[k].tasks.push(t);
    if (t.created_at < byProp[k].oldestCreated) byProp[k].oldestCreated = t.created_at;
    // Una casa puede tener tareas con zona = null y otra con zona X → usar la más definida
    if (!byProp[k].zona && t.zona) byProp[k].zona = t.zona;
  });

  // S6-U6: Orden = (zona, oldest) — todas las casas de Norte juntas, después todas las de Sur
  // Dentro de cada zona, casas ordenadas por antigüedad
  const propOrder = Object.entries(byProp).sort((a, b) => {
    const zA = a[1].zona || 'zzz'; // sin zona al final
    const zB = b[1].zona || 'zzz';
    if (zA !== zB) return zA.localeCompare(zB);
    return new Date(a[1].oldestCreated) - new Date(b[1].oldestCreated);
  });

  // Asignar horarios
  let cursor = opTimeToMin(startTime);
  const lunchAt = opTimeToMin(lunchTime);
  let lunchPlaced = lunchDur === 0;
  const updates = [];
  let lastZona = null;
  let crossZoneCount = 0;
  let sameZoneCount = 0;

  propOrder.forEach(([propKey, info], idx) => {
    // Insertar viaje entre casas — diferenciar misma zona vs cruzar zona
    if (idx > 0) {
      const isCross = info.zona && lastZona && info.zona !== lastZona;
      const travelHere = isCross ? travelCross : travelSame;
      cursor += travelHere;
      if (isCross) crossZoneCount++; else sameZoneCount++;
    }
    lastZona = info.zona;

    info.tasks.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    info.tasks.forEach((t, i) => {
      const dur = t.duration_min || 30;
      if (!lunchPlaced && cursor >= lunchAt) {
        cursor = Math.max(cursor, lunchAt) + lunchDur;
        lunchPlaced = true;
      }
      const isFirstOfHouse = i === 0;
      const isFirstOfDay = idx === 0 && i === 0;
      updates.push({
        id: t.id,
        date: opState.date,
        start_time: opMinToTime(cursor),
        travel_min: isFirstOfDay ? 0 : (isFirstOfHouse ? (info.zona !== lastZona ? travelCross : travelSame) : 0)
      });
      cursor += dur;
    });
  });

  // Ejecutar actualizaciones
  for (const u of updates) {
    await sb.from('ops_day_tasks').update({
      date: u.date,
      start_time: u.start_time,
      travel_min: u.travel_min,
      updated_at: new Date().toISOString()
    }).eq('id', u.id);
  }

  // Insertar almuerzo si corresponde
  if (lunchDur > 0) {
    await sb.from('ops_day_tasks').insert({
      date: opState.date, start_time: lunchTime, duration_min: lunchDur,
      title: 'Tiempo Almuerzo', business: 'both', zona: null,
      created_by: state.user.id
    });
  }

  closeModal();
  await opLoadAll();
  opRender();
  const zonas = Array.from(new Set(propOrder.map(([_,info]) => info.zona).filter(Boolean)));
  alert(`✅ Día armado: ${updates.length} tareas, ${propOrder.length} casas across ${zonas.length} zona(s) (${zonas.join(', ') || 'sin zona'}), hasta ${opFmt12(opMinToTime(cursor))}.\n\n🚗 Viajes: ${sameZoneCount} intra-zona, ${crossZoneCount} inter-zona.\n\nPodés re-arrastrar lo que quieras manualmente.`);
}

// ─── Editar pendiente del backlog ───
function opEditBacklog(id) {
  const t = opState.backlog.find(x => x.id === id);
  if (!t) return;
  _opOpenEditModal(t, true);
}
function opEditScheduled(id) {
  const t = opState.dayTasks.find(x => x.id === id);
  if (!t) return;
  _opOpenEditModal(t, false);
}
function _opOpenEditModal(t, isBacklog) {
  const propsOpts = opState.properties.map(p => `<option value="prop:${p.id}" ${t.property_id===p.id?'selected':''}>🏠 ${p.nickname || p.address}</option>`).join('');
  const projsOpts = opState.projects.map(p => `<option value="proj:${p.id}" ${t.project_id===p.id?'selected':''}>🏗️ ${p.name || p.address}</option>`).join('');
  const targetVal = t.property_id ? 'prop:'+t.property_id : t.project_id ? 'proj:'+t.project_id : '';
  const html = `
    <div class="space-y-3">
      ${isBacklog ? '<div class="text-xs bg-amber-50 border border-amber-200 rounded p-2">📥 Esta tarea está en el <strong>backlog</strong> (sin fecha). Arrastrala a un slot del horario para agendarla.</div>' : ''}
      <input id="op-e-title" value="${(t.title||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />
      <div class="grid grid-cols-${isBacklog?'2':'4'} gap-2">
        ${!isBacklog ? `
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Inicio</label>
            <input id="op-e-start" type="time" value="${(t.start_time||'').substring(0,5)}" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
          </div>
        ` : ''}
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Dur (min)</label>
          <input id="op-e-dur" type="number" value="${t.duration_min}" min="5" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
        ${!isBacklog ? `
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Viaje (min)</label>
            <input id="op-e-travel" type="number" value="${t.travel_min||0}" min="0" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Status</label>
            <select id="op-e-status" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
              ${['planned','in_progress','done','skipped'].map(s => `<option value="${s}" ${t.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
        ` : ''}
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Prioridad</label>
          <select id="op-e-priority" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            ${['low','normal','high','urgent'].map(p => `<option value="${p}" ${t.priority===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Empresa</label>
          <select id="op-e-business" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            ${['both','rentas','remodelacion'].map(b => `<option value="${b}" ${t.business===b?'selected':''}>${b==='both'?'Ambas':b}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Zona</label>
          <select id="op-e-zona" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            <option value="">— sin zona —</option>
            ${OP_ZONAS.map(z => `<option value="${z}" ${t.zona===z?'selected':''}>${z}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Casa</label>
        <select id="op-e-target" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
          <option value="">— ninguna —</option>
          <optgroup label="🏠 Rentas">${propsOpts}</optgroup>
          <optgroup label="🏗️ Obras">${projsOpts}</optgroup>
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Materiales (coma)</label>
        <input id="op-e-materials" value="${(t.materials||[]).join(', ').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Notas</label>
        <textarea id="op-e-notes" rows="2" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">${t.notes||''}</textarea>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        ${!isBacklog ? `<button onclick="opSendToBacklog('${t.id}', true)" class="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-sm py-2 rounded" title="Quitar fecha y mandar al backlog">↩ Backlog</button>` : ''}
        <button onclick="opDeleteScheduled('${t.id}', true)" class="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded">🗑️</button>
        <button onclick="closeModal(); setTimeout(()=>openOpsPlanner(opState.sys), 100)" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="opSaveEdit('${t.id}', ${isBacklog})" class="flex-1 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2 rounded">💾 Guardar</button>
      </div>
    </div>
  `;
  openModal(isBacklog ? `✏️ Editar pendiente` : `✏️ Editar tarea agendada`, html);
}

async function opSaveEdit(id, isBacklog) {
  const target = document.getElementById('op-e-target').value || '';
  const property_id = target.startsWith('prop:') ? target.slice(5) : null;
  const project_id = target.startsWith('proj:') ? target.slice(5) : null;
  const payload = {
    title: document.getElementById('op-e-title').value,
    duration_min: +document.getElementById('op-e-dur').value || 30,
    business: document.getElementById('op-e-business').value,
    zona: document.getElementById('op-e-zona').value || null,
    priority: document.getElementById('op-e-priority').value,
    property_id, project_id,
    materials: (document.getElementById('op-e-materials').value || '').split(',').map(s => s.trim()).filter(Boolean),
    notes: document.getElementById('op-e-notes').value || null,
    updated_at: new Date().toISOString()
  };
  if (!isBacklog) {
    payload.start_time = document.getElementById('op-e-start').value;
    payload.travel_min = +document.getElementById('op-e-travel').value || 0;
    payload.status = document.getElementById('op-e-status').value;
  }
  const { error } = await sb.from('ops_day_tasks').update(payload).eq('id', id);
  if (error) return alert(error.message);
  closeModal();
  setTimeout(() => openOpsPlanner(opState.sys), 100);
}

async function opSendToBacklog(id, fromModal) {
  await sb.from('ops_day_tasks').update({ date: null, start_time: null, updated_at: new Date().toISOString() }).eq('id', id);
  if (fromModal) { closeModal(); setTimeout(() => openOpsPlanner(opState.sys), 100); }
  else { await opLoadAll(); opRender(); }
}

async function opDeleteBacklog(id) {
  if (!confirm('¿Borrar esta pendiente?')) return;
  await sb.from('ops_day_tasks').delete().eq('id', id);
  await opLoadAll();
  opRender();
}

async function opDeleteScheduled(id, fromModal) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  await sb.from('ops_day_tasks').delete().eq('id', id);
  if (fromModal) { closeModal(); setTimeout(() => openOpsPlanner(opState.sys), 100); }
  else { await opLoadAll(); opRender(); }
}

async function opToggleDone(id) {
  const t = opState.dayTasks.find(x => x.id === id);
  if (!t) return;
  const newStatus = t.status === 'done' ? 'planned' : 'done';
  await sb.from('ops_day_tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
  await opLoadAll();
  opRender();
}

async function opClearDay() {
  if (!confirm(`¿Vaciar el ${opState.date}?\n\nLas tareas agendadas vuelven al backlog (no se pierden).`)) return;
  const ids = opState.dayTasks.map(t => t.id);
  if (ids.length) await sb.from('ops_day_tasks').update({ date: null, start_time: null, updated_at: new Date().toISOString() }).in('id', ids);
  await opLoadAll();
  opRender();
}

// ─── Tarea libre (atajo: crea + agenda en un paso) ───
function opOpenAddLoose() {
  const propsOpts = opState.properties.map(p => `<option value="prop:${p.id}">🏠 ${p.nickname || p.address}</option>`).join('');
  const projsOpts = opState.projects.map(p => `<option value="proj:${p.id}">🏗️ ${p.name || p.address}</option>`).join('');
  const html = `
    <div class="space-y-3">
      <input id="op-l-title" placeholder="Título" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />
      <div class="grid grid-cols-4 gap-2">
        <div><label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Hora</label>
          <input id="op-l-start" type="time" value="08:00" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" /></div>
        <div><label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Dur</label>
          <input id="op-l-dur" type="number" value="30" min="5" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" /></div>
        <div><label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Viaje</label>
          <input id="op-l-travel" type="number" value="0" min="0" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" /></div>
        <div><label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Zona</label>
          <select id="op-l-zona" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            <option value="">—</option>${OP_ZONAS.map(z => `<option>${z}</option>`).join('')}</select></div>
      </div>
      <select id="op-l-target" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
        <option value="">— sin casa —</option>
        <optgroup label="🏠 Rentas">${propsOpts}</optgroup>
        <optgroup label="🏗️ Obras">${projsOpts}</optgroup>
      </select>
      <input id="op-l-materials" placeholder="Materiales (coma)" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
      <textarea id="op-l-notes" rows="2" placeholder="Notas" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"></textarea>
      <div class="flex gap-2">
        <button onclick="closeModal(); setTimeout(()=>openOpsPlanner(opState.sys), 100)" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="opCreateLoose()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">+ Agendar</button>
      </div>
    </div>
  `;
  openModal('+ Tarea libre en el día', html);
}

async function opCreateLoose() {
  const title = document.getElementById('op-l-title').value.trim();
  if (!title) return alert('Pon un título');
  const target = document.getElementById('op-l-target').value || '';
  const payload = {
    date: opState.date,
    start_time: document.getElementById('op-l-start').value || '08:00',
    duration_min: +document.getElementById('op-l-dur').value || 30,
    travel_min: +document.getElementById('op-l-travel').value || 0,
    title,
    zona: document.getElementById('op-l-zona').value || null,
    property_id: target.startsWith('prop:') ? target.slice(5) : null,
    project_id: target.startsWith('proj:') ? target.slice(5) : null,
    materials: (document.getElementById('op-l-materials').value || '').split(',').map(s => s.trim()).filter(Boolean),
    notes: document.getElementById('op-l-notes').value || null,
    created_by: state.user.id
  };
  const { error } = await sb.from('ops_day_tasks').insert(payload);
  if (error) return alert(error.message);
  closeModal();
  setTimeout(() => openOpsPlanner(opState.sys), 100);
}

// ─── CHECKLIST DE ENTREGABLES ───
function opOpenChecklist(taskId) {
  const t = opState.dayTasks.find(x => x.id === taskId) || opState.weekTasks.find(x => x.id === taskId);
  if (!t) return;
  const cl = t.checklist || [];
  const done = cl.filter(x => x.done).length;
  const pct = cl.length ? Math.round(done/cl.length*100) : 0;
  const locText = opPropName(t) || '';

  const html = `
    <div class="space-y-3">
      <div class="bg-slate-900 text-white rounded p-3">
        <div class="text-[10px] uppercase text-slate-400 font-bold">Entregables</div>
        <div class="text-base font-bold">${t.title}</div>
        <div class="text-xs text-slate-300 mt-0.5">🏠 ${locText} · ${opFmt12(t.start_time)} · ${t.duration_min}m</div>
        <div class="flex items-center gap-2 mt-2">
          <div class="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden"><div class="${pct===100?'bg-emerald-400':'bg-blue-400'} h-full" style="width:${pct}%"></div></div>
          <span class="text-xs font-bold">${done}/${cl.length} (${pct}%)</span>
        </div>
      </div>

      <div class="space-y-1">
        ${cl.length === 0 ? '<div class="text-xs text-slate-400 text-center py-4">Sin checklist. Agregá items abajo.</div>' : cl.map((item, idx) => `
          <div class="flex items-center gap-2 p-2 ${item.done?'bg-emerald-50 border-emerald-200':'bg-white border-slate-200'} border rounded">
            <input type="checkbox" ${item.done?'checked':''} onclick="opToggleChecklistItem('${taskId}', ${idx})" class="w-5 h-5 cursor-pointer" />
            <input value="${(item.item||'').replace(/"/g,'&quot;')}" onblur="opEditChecklistItem('${taskId}', ${idx}, this.value)" class="flex-1 bg-transparent text-sm ${item.done?'line-through opacity-60':''} focus:bg-white focus:border focus:border-slate-300 rounded px-1" />
            ${item.done && item.done_at ? `<span class="text-[10px] text-emerald-700">✓ ${new Date(item.done_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}
            <button onclick="opRemoveChecklistItem('${taskId}', ${idx})" class="text-[11px] text-slate-400 hover:text-red-600">✕</button>
          </div>
        `).join('')}
      </div>

      <div class="flex gap-1">
        <input id="op-cl-new" placeholder="+ Nuevo entregable (Enter)" onkeydown="if(event.key==='Enter')opAddChecklistItem('${taskId}', this.value, this)" class="flex-1 border border-slate-300 rounded px-3 py-2 text-sm" />
        <button onclick="opAddChecklistItem('${taskId}', document.getElementById('op-cl-new').value, document.getElementById('op-cl-new'))" class="bg-slate-900 hover:bg-slate-700 text-white text-sm px-3 py-2 rounded">+</button>
      </div>

      ${pct === 100 && t.status !== 'done' ? `<button onclick="opMarkDoneFromChecklist('${taskId}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">✅ Marcar tarea como TERMINADA</button>` : ''}

      <button onclick="closeModal(); setTimeout(()=>openOpsPlanner(opState.sys), 100)" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">← Volver</button>
    </div>
  `;
  openModal(`📋 Entregables`, html);
}

async function opToggleChecklistItem(taskId, idx) {
  const { data: t } = await sb.from('ops_day_tasks').select('checklist,status').eq('id', taskId).single();
  if (!t) return;
  const cl = t.checklist || [];
  if (!cl[idx]) return;
  cl[idx].done = !cl[idx].done;
  cl[idx].done_at = cl[idx].done ? new Date().toISOString() : null;
  await sb.from('ops_day_tasks').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', taskId);
  await opLoadAll();
  opOpenChecklist(taskId);
}
async function opEditChecklistItem(taskId, idx, newText) {
  const { data: t } = await sb.from('ops_day_tasks').select('checklist').eq('id', taskId).single();
  if (!t) return;
  const cl = t.checklist || [];
  if (!cl[idx]) return;
  if ((cl[idx].item||'') === newText) return;
  cl[idx].item = newText;
  await sb.from('ops_day_tasks').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', taskId);
  await opLoadAll();
}
async function opAddChecklistItem(taskId, text, input) {
  text = (text||'').trim();
  if (!text) return;
  const { data: t } = await sb.from('ops_day_tasks').select('checklist').eq('id', taskId).single();
  const cl = (t?.checklist || []).concat([{ item: text, done: false }]);
  await sb.from('ops_day_tasks').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', taskId);
  if (input) input.value = '';
  await opLoadAll();
  opOpenChecklist(taskId);
}
async function opRemoveChecklistItem(taskId, idx) {
  const { data: t } = await sb.from('ops_day_tasks').select('checklist').eq('id', taskId).single();
  if (!t) return;
  const cl = (t.checklist || []).filter((_, i) => i !== idx);
  await sb.from('ops_day_tasks').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', taskId);
  await opLoadAll();
  opOpenChecklist(taskId);
}
async function opMarkDoneFromChecklist(taskId) {
  await sb.from('ops_day_tasks').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', taskId);
  closeModal();
  await opLoadAll();
  opRender();
}

// ─── Recurrentes ───
function opOpenManageRecurring() {
  const propsOpts = opState.properties.map(p => `<option value="prop:${p.id}">🏠 ${p.nickname || p.address}</option>`).join('');
  const projsOpts = opState.projects.map(p => `<option value="proj:${p.id}">🏗️ ${p.name || p.address}</option>`).join('');
  const tmplOpts = opState.tasks.map(t => `<option value="${t.id}">${t.emoji} ${t.name} (${t.default_duration_min}m)</option>`).join('');
  const list = opState.recurring.map(r => {
    const base = opState.tasks.find(x => x.id === r.base_task_id);
    const prop = r.property_id ? opState.properties.find(x => x.id === r.property_id) : null;
    const proj = r.project_id ? opState.projects.find(x => x.id === r.project_id) : null;
    const where = prop ? (prop.nickname || prop.address) : proj ? (proj.name || proj.address) : 'todas las casas';
    return `
      <div class="border border-slate-200 rounded p-2 text-xs flex items-center justify-between">
        <div>
          <div class="font-bold">${base?.emoji||'🔁'} ${r.custom_title || base?.name}</div>
          <div class="text-[10px] text-slate-500">🏠 ${where} · cada ${r.interval_days} días · próxima: ${r.next_due}${r.zona?` · zona ${r.zona}`:''}</div>
        </div>
        <button onclick="opDeleteRecurring('${r.id}')" class="text-[10px] text-red-600 hover:text-red-800">✕</button>
      </div>
    `;
  }).join('');

  const html = `
    <div class="space-y-3">
      <div class="text-xs bg-violet-50 border border-violet-200 rounded p-2 text-violet-900">🔁 Las tareas recurrentes generan pendientes automáticamente al backlog cuando vence el intervalo. Ejemplo: cambio de filtros AC cada 90 días.</div>

      <div class="border border-slate-200 rounded p-2 space-y-2 bg-slate-50">
        <div class="text-[10px] font-bold uppercase">+ Nueva recurrente</div>
        <select id="op-r-task" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">${tmplOpts}</select>
        <select id="op-r-target" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
          <option value="">— sin casa específica —</option>
          <optgroup label="🏠 Rentas">${propsOpts}</optgroup>
          <optgroup label="🏗️ Obras">${projsOpts}</optgroup>
        </select>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Cada (días)</label>
            <input id="op-r-interval" type="number" value="90" min="1" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Próx vencimiento</label>
            <input id="op-r-next" type="date" value="${opDateOnly(new Date())}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Zona</label>
            <select id="op-r-zona" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
              <option value="">—</option>${OP_ZONAS.map(z => `<option>${z}</option>`).join('')}
            </select>
          </div>
        </div>
        <button onclick="opCreateRecurring()" class="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm py-1.5 rounded font-bold">+ Crear recurrente</button>
      </div>

      <div class="space-y-1">
        <div class="text-[10px] font-bold uppercase text-slate-600">Activas (${opState.recurring.length})</div>
        ${list || '<div class="text-xs text-slate-400 text-center py-4">Sin recurrentes configuradas.</div>'}
      </div>

      <button onclick="closeModal(); setTimeout(()=>openOpsPlanner(opState.sys), 100)" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">← Volver</button>
    </div>
  `;
  openModal('⚙️ Tareas recurrentes', html);
}

async function opCreateRecurring() {
  const base_task_id = document.getElementById('op-r-task').value;
  const target = document.getElementById('op-r-target').value || '';
  const payload = {
    base_task_id,
    property_id: target.startsWith('prop:') ? target.slice(5) : null,
    project_id: target.startsWith('proj:') ? target.slice(5) : null,
    interval_days: +document.getElementById('op-r-interval').value || 90,
    next_due: document.getElementById('op-r-next').value || opDateOnly(new Date()),
    zona: document.getElementById('op-r-zona').value || null,
    business: 'rentas'
  };
  const { error } = await sb.from('ops_recurring').insert(payload);
  if (error) return alert(error.message);
  closeModal();
  setTimeout(() => { openOpsPlanner(opState.sys).then(() => opOpenManageRecurring()); }, 100);
}

async function opDeleteRecurring(id) {
  if (!confirm('¿Eliminar esta recurrente?')) return;
  await sb.from('ops_recurring').update({ active: false }).eq('id', id);
  closeModal();
  setTimeout(() => { openOpsPlanner(opState.sys).then(() => opOpenManageRecurring()); }, 100);
}
