// ============================================================
// CLEANING PLANNER — Copia funcional del Ops Planner (Juan Austin)
// adaptada para el Equipo de Limpieza.
// Maneja: turnovers Airbnb, limpieza por habitación (coliving/PadSplit),
//         limpieza mensual long-term, limpieza post-remodelación.
// Mismo modelo: backlog (date=null), "armar día" agrupando por zona y casa.
// Tablas: clean_tasks, clean_day_tasks, clean_recurring, clean_day_templates
// ============================================================

const clState = {
  sys: null,
  date: null,
  tasks: [],            // catálogo de plantillas
  dayTasks: [],         // tareas del día (date = clState.date)
  backlog: [],          // tareas sin fecha (date IS NULL)
  recurring: [],        // recurrentes activas
  properties: [],
  projects: [],         // remodel_projects activos
  draggedBacklogId: null,
  draggedScheduledId: null,
  draggedTemplateId: null,
  leftTab: 'backlog',   // backlog | templates | recurrentes
  view: 'day',          // day | week | casas | print
  weekTasks: [],        // tareas de la semana actual (cuando view='week')
  allUpcoming: [],      // tareas con fecha >= hoy (cuando view='casas')
  casasSearch: '',      // filtro de búsqueda en vista casas
  casasExpanded: {},    // { 'p:uuid':true, 'j:uuid':false } — qué cards están abiertas
  dayTemplates: [],     // plantillas de día completo (clean_day_templates)
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

function clMondayOf(dStr) {
  const x = new Date(dStr + 'T00:00:00');
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function clAddDays(dStr, n) {
  const x = new Date(dStr + 'T00:00:00');
  x.setDate(x.getDate() + n);
  return clDateOnly(x);
}

const CL_ZONAS = ['Norte','Sur'];
const CL_START_HOUR = 5, CL_END_HOUR = 22;
const CL_TRAVEL_BETWEEN_HOUSES = 20; // min default al armar día

function clZonaColor(z) {
  return z==='Norte' ? 'bg-orange-100 text-orange-700 border-orange-300' :
         z==='Sur'   ? 'bg-green-100 text-green-700 border-green-300' :
         'bg-slate-100 text-slate-600 border-slate-200';
}

// Color determinista por casa (hash → palette)
const CL_PROP_PALETTE = [
  'bg-sky-50 border-sky-300',
  'bg-emerald-50 border-emerald-300',
  'bg-rose-50 border-rose-300',
  'bg-violet-50 border-violet-300',
  'bg-amber-50 border-amber-300',
  'bg-cyan-50 border-cyan-300',
  'bg-fuchsia-50 border-fuchsia-300',
  'bg-lime-50 border-lime-300'
];
function clPropColor(propId) {
  if (!propId) return 'bg-slate-50 border-slate-300';
  let h = 0;
  for (let i = 0; i < propId.length; i++) h = (h*31 + propId.charCodeAt(i)) >>> 0;
  return CL_PROP_PALETTE[h % CL_PROP_PALETTE.length];
}

// ─── Utilidades ───
// CORRECTNESS: fecha LOCAL, no UTC. En Austin (UTC-5/6) ISO desfasaba 1 día.
function clDateOnly(d) {
  const x = (d instanceof Date) ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function clFmtDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'short' }); }
function clPad(n) { return n < 10 ? '0'+n : ''+n; }
function clTimeToMin(t) { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60 + (m||0); }
function clMinToTime(m) { return `${clPad(Math.floor(m/60))}:${clPad(m%60)}`; }
function clFmt12(t) {
  if (!t) return '--';
  const [h,m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h === 0 ? 12 : (h > 12 ? h-12 : h);
  return `${hh}:${clPad(m||0)} ${ap}`;
}
function clAddMin(time, min) { return clMinToTime(clTimeToMin(time) + min); }
function clDaysAgo(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function clPropName(t) {
  if (t.property_id) {
    const p = clState.properties.find(x => x.id === t.property_id);
    return p ? (p.nickname || p.address || 'Casa sin nombre') : 'Casa eliminada';
  }
  if (t.project_id) {
    const p = clState.projects.find(x => x.id === t.project_id);
    return p ? (p.name || p.address) : 'Obra eliminada';
  }
  return t.location || null;
}

// ─── Data loading ───
// Helper: query tolerante a errores (devuelve {data:[], error}) — evita que
// una tabla faltante haga explotar todo el load.
async function _clSafeQuery(promise) {
  try {
    const r = await promise;
    return { data: r.data || [], error: r.error || null };
  } catch (e) {
    return { data: [], error: e };
  }
}

// Copia el SQL al portapapeles para que el usuario lo pegue en Supabase
async function clCopySchemaSQL() {
  // Fetch del archivo SQL desde el servidor (Vercel sirve los archivos estáticos)
  try {
    const res = await fetch('/supabase/cleaning-planner-schema.sql');
    if (!res.ok) throw new Error('No pude cargar el SQL (HTTP ' + res.status + ')');
    const sql = await res.text();
    await navigator.clipboard.writeText(sql);
    alert('✅ SQL copiado al portapapeles (' + sql.length + ' caracteres).\n\nAhora andá a Supabase → SQL Editor, pegá (Cmd/Ctrl+V) y dale Run.\n\nDespués volvé y tap "🔄 Reintentar".');
  } catch (e) {
    // Fallback: abrir el SQL en una nueva ventana
    alert('No pude copiar automáticamente: ' + e.message + '\n\nVoy a abrir el SQL en otra ventana — copialo desde ahí.');
    window.open('/supabase/cleaning-planner-schema.sql', '_blank');
  }
}
window.clCopySchemaSQL = clCopySchemaSQL;

async function clLoadAll() {
  if (!clState.date) clState.date = clDateOnly(new Date());

  const weekStart = clDateOnly(clMondayOf(clState.date));
  const weekEnd = clAddDays(weekStart, 6);

  // TODAS las queries son tolerantes a errores ahora — si una falla,
  // devuelve array vacío y guardamos el error para mostrarlo.
  const [tRes, dRes, wRes, bRes, rRes, pRes, projRes, dtRes, durRes, rtRes] = await Promise.all([
    _clSafeQuery(sb.from('clean_tasks').select('*').eq('active', true).order('category').order('name')),
    _clSafeQuery(sb.from('clean_day_tasks').select('*').eq('date', clState.date).order('start_time')),
    _clSafeQuery(sb.from('clean_day_tasks').select('*').gte('date', weekStart).lte('date', weekEnd).order('date').order('start_time')),
    _clSafeQuery(sb.from('clean_day_tasks').select('*').is('date', null).order('priority', { ascending: false }).order('created_at')),
    _clSafeQuery(sb.from('clean_recurring').select('*').eq('active', true)),
    _clSafeQuery(sb.from('properties').select('id,address,nickname,property_type').order('address')),
    _clSafeQuery(sb.from('remodel_projects').select('id,name,address,status').in('status', ['planning','active'])),
    _clSafeQuery(sb.from('clean_day_templates').select('*').order('created_at', { ascending: false })),
    _clSafeQuery(sb.from('ops_property_durations').select('*')),
    _clSafeQuery(sb.from('ops_day_routes').select('*').eq('is_recommended', true).order('code'))
  ]);
  clState.tasks = tRes.data;
  clState.dayTasks = dRes.data;
  clState.weekTasks = wRes.data;
  clState.backlog = bRes.data;
  clState.recurring = rRes.data;
  clState.properties = pRes.data;
  clState.projects = projRes.data;
  clState.dayTemplates = dtRes.data;
  clState.propertyDurations = durRes.data;
  clState.dayRoutes = rtRes.data;

  // CRÍTICO: si las tablas clean_* fallan con "does not exist", mostrar
  // banner persistente con el SQL a correr — no silenciar el error.
  const criticalErrors = [tRes, dRes, wRes, bRes, rRes].map(r => r.error).filter(Boolean);
  const missingTables = criticalErrors.find(e => /does not exist|relation .* does not exist/i.test(e?.message || ''));
  clState.tablesError = missingTables ? missingTables.message : null;
  if (missingTables) {
    console.error('[cleaning-planner] Tablas clean_* faltantes:', missingTables.message);
  }

  if (clState.view === 'casas') {
    const upRes = await _clSafeQuery(
      sb.from('clean_day_tasks').select('*').gte('date', clDateOnly(new Date())).order('date').order('start_time')
    );
    clState.allUpcoming = upRes.data;
  }

  // Auto-rollback + generación recurrentes (silenciosas, no bloquean)
  try { await clAutoRollback(); } catch (e) { console.warn('clAutoRollback', e); }
  try { await clGenerateRecurring(); } catch (e) { console.warn('clGenerateRecurring', e); }
}

// Carga las tareas vencidas (pasadas no hechas). NO las devuelve al backlog —
// se quedan en su día y aparecen como "atrasadas / reprogramables" en el header.
async function clAutoRollback() {
  const today = clDateOnly(new Date());
  const { data: overdue } = await sb.from('clean_day_tasks')
    .select('*')
    .lt('date', today)
    .in('status', ['planned','in_progress'])
    .order('date');
  clState.overdue = overdue || [];
}

// Reprograma una tarea atrasada a otra fecha (default: hoy).
async function clReprogramTask(id, newDate) {
  const target = newDate || clDateOnly(new Date());
  await sb.from('clean_day_tasks').update({
    date: target,
    status: 'planned',
    updated_at: new Date().toISOString()
  }).eq('id', id);
  await clLoadAll();
  clRender();
}

// Reprograma TODAS las atrasadas al día indicado (default hoy).
async function clReprogramAllOverdue(newDate) {
  const target = newDate || clDateOnly(new Date());
  const ids = (clState.overdue || []).map(t => t.id);
  if (!ids.length) return;
  if (!confirm(`Mover ${ids.length} tarea(s) atrasada(s) al ${target}?`)) return;
  await sb.from('clean_day_tasks').update({
    date: target, status: 'planned', updated_at: new Date().toISOString()
  }).in('id', ids);
  await clLoadAll();
  clRender();
}

// Genera tareas pendientes a partir de recurrentes que ya vencieron
async function clGenerateRecurring() {
  const today = clDateOnly(new Date());
  const due = clState.recurring.filter(r => r.next_due <= today);
  if (!due.length) return;
  const rows = [];
  for (const r of due) {
    const base = clState.tasks.find(x => x.id === r.base_task_id);
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
      created_by: state.user?.id || null
    });
  }
  if (rows.length) {
    await sb.from('clean_day_tasks').insert(rows);
    // Actualizar next_due
    for (const r of due) {
      const next = new Date(today + 'T00:00:00');
      next.setDate(next.getDate() + r.interval_days);
      await sb.from('clean_recurring').update({
        last_generated: today,
        next_due: clDateOnly(next)
      }).eq('id', r.id);
    }
    // Recargar backlog
    const { data: b } = await sb.from('clean_day_tasks').select('*').is('date', null).order('created_at');
    clState.backlog = b || [];
  }
}

// ─── Entry ───
async function openCleaningPlanner(sys) {
  clState.sys = sys;
  if (!clState.date) clState.date = clDateOnly(new Date());
  await clLoadAll();
  clOpenSubmodal(`🧰 ${sys.name}`, '<div id="op-root"></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  clRender();
}

// REFOCUS — vuelve al planner SIN cerrar el modal (ver opRefocusPlanner).
async function clRefocusPlanner() {
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const modal = document.getElementById('modal');
  if (!titleEl || !bodyEl || modal?.classList.contains('hidden')) {
    return openCleaningPlanner(clState.sys);
  }
  titleEl.textContent = `🧰 ${clState.sys.name}`;
  bodyEl.innerHTML = '<div id="op-root"></div>';
  // Restaurar el botón X al comportamiento normal
  _clRestoreCloseButton();
  try { await clLoadAll(); } catch (e) { console.warn('clLoadAll on refocus', e); }
  clRender();
}
window.clRefocusPlanner = clRefocusPlanner;

// SUBMODAL wrapper — override del X para que vuelva al planner
function clOpenSubmodal(title, html) {
  openModal(title, html);
  const headerBtn = document.querySelector('#modal > div > div:first-child button');
  if (headerBtn) {
    headerBtn.setAttribute('onclick', 'clRefocusPlanner()');
    headerBtn.setAttribute('title', 'Volver al calendario');
  }
  window._clInSubmodal = true;
}
function _clRestoreCloseButton() {
  const headerBtn = document.querySelector('#modal > div > div:first-child button');
  if (headerBtn) {
    headerBtn.setAttribute('onclick', 'closeModal()');
    headerBtn.setAttribute('title', '');
  }
  window._clInSubmodal = false;
}
window.clOpenSubmodal = clOpenSubmodal;

// ─── Render principal ───
function clRender() {
  const root = document.getElementById('op-root');
  if (!root) return;

  // KPIs día
  const filteredDay = clState.dayTasks.filter(t => clState.zonaFilter === 'all' || t.zona === clState.zonaFilter);
  const total = filteredDay.length;
  const done = filteredDay.filter(t => t.status === 'done').length;
  const plannedMin = filteredDay.reduce((s,t) => s + (t.duration_min||0), 0);
  const travelMin = filteredDay.reduce((s,t) => s + (t.travel_min||0), 0);
  const totalMin = plannedMin + travelMin;
  const sorted = [...filteredDay].sort((a,b) => clTimeToMin(a.start_time) - clTimeToMin(b.start_time));
  let gapMin = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = clTimeToMin(sorted[i-1].start_time) + (sorted[i-1].duration_min||0);
    const thisStart = clTimeToMin(sorted[i].start_time);
    if (thisStart > prevEnd) gapMin += thisStart - prevEnd;
  }

  const today = clDateOnly(new Date());
  const isToday = clState.date === today;

  // Backlog count
  const backlogTotal = clState.backlog.length;
  const backlogByZona = {};
  clState.backlog.forEach(t => { const z = t.zona || '∅'; backlogByZona[z] = (backlogByZona[z]||0) + 1; });

  // ── Tareas atrasadas (días pasados sin completar) ──
  const overdue = (clState.overdue || []);
  const todayStr = clDateOnly(new Date());
  const tomorrow = clAddDays(todayStr, 1);
  const overdueBanner = overdue.length ? `
    <div class="bg-red-50 border border-red-300 rounded-lg px-3 py-2 mb-2 flex items-start gap-2">
      <div class="text-xl">⚠️</div>
      <div class="flex-1">
        <div class="flex items-center justify-between flex-wrap gap-1">
          <div class="text-xs font-bold text-red-800">${overdue.length} tarea(s) atrasada(s) sin completar</div>
          <div class="flex gap-1">
            <button onclick="clReprogramAllOverdue('${todayStr}')" class="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-bold">Reprogramar todas → Hoy</button>
            <button onclick="clReprogramAllOverdue('${tomorrow}')" class="text-[10px] bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded font-bold">→ Mañana</button>
            <button onclick="clToggleOverdueDetails()" class="text-[10px] bg-white border border-red-300 text-red-700 px-2 py-0.5 rounded">${clState.showOverdueDetails?'▴ Ocultar':'▾ Ver'}</button>
          </div>
        </div>
        ${clState.showOverdueDetails ? `
          <div class="mt-2 space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
            ${overdue.map(t => `
              <div class="flex items-center justify-between bg-white border border-red-200 rounded px-2 py-1 text-[11px]">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-slate-900 truncate">${(t.title||'').replace(/</g,'&lt;')}</div>
                  <div class="text-[9px] text-slate-500">${t.date} · ${t.start_time||''} · ${t.duration_min||0}m${t.zona?' · '+t.zona:''}${clPropName(t)?' · '+clPropName(t):''}</div>
                </div>
                <div class="flex gap-0.5 ml-2">
                  <input type="date" value="${todayStr}" onchange="clReprogramTask('${t.id}', this.value)" class="border border-slate-300 rounded px-1 py-0.5 text-[10px]" title="Reprogramar a fecha">
                  <button onclick="clMarkDone('${t.id}', true).then(() => clLoadAll().then(clRender))" class="bg-emerald-600 hover:bg-emerald-700 text-white px-1.5 py-0.5 rounded text-[10px] font-bold" title="Marcar como hecha">✓</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  // BANNER CRÍTICO: si las tablas clean_* no existen, mostrar SQL a correr
  const tablesErrorBanner = clState.tablesError ? `
    <div class="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-3 shadow-md">
      <div class="flex items-start gap-3">
        <div class="text-3xl">⚠️</div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-red-900 text-base">El Cronograma Limpieza NO está activado</div>
          <div class="text-sm text-red-800 mt-1">El SQL de las tablas falta en Supabase. Por eso no se guardan las tareas que arrastrás. Te lo arreglo en 30 segundos:</div>
          <ol class="text-sm text-red-900 mt-2 space-y-1 list-decimal list-inside">
            <li>Hacé tap en <strong>"📋 Copiar SQL"</strong> abajo</li>
            <li>Abrí <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" class="text-blue-700 underline font-bold">Supabase SQL Editor</a></li>
            <li>Pegá (Cmd/Ctrl+V) y dale <strong>Run</strong></li>
            <li>Volvé acá y tap en <strong>"🔄 Reintentar"</strong></li>
          </ol>
          <div class="flex gap-2 mt-3">
            <button onclick="clCopySchemaSQL()" class="text-sm bg-slate-900 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded">📋 Copiar SQL al portapapeles</button>
            <button onclick="clLoadAll().then(clRender)" class="text-sm bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded">🔄 Reintentar</button>
          </div>
          <details class="mt-2">
            <summary class="text-[10px] text-red-700 cursor-pointer">Error técnico</summary>
            <code class="block mt-1 bg-slate-900 text-emerald-300 text-[10px] px-2 py-1 rounded">${(clState.tablesError||'').replace(/[<>]/g,'')}</code>
          </details>
        </div>
      </div>
    </div>` : '';

  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[84vh]">

      ${tablesErrorBanner}
      ${overdueBanner}

      <!-- HEADER -->
      <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <div class="flex bg-slate-100 rounded p-0.5">
            <button onclick="clSetView('day')" class="px-2 py-1 rounded text-xs font-bold ${clState.view==='day'?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-200'}">📅 Día</button>
            <button onclick="clSetView('week')" class="px-2 py-1 rounded text-xs font-bold ${clState.view==='week'?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-200'}">📊 Semana</button>
            <button onclick="clSetView('casas')" class="px-2 py-1 rounded text-xs font-bold ${clState.view==='casas'?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-200'}" title="Tareas agrupadas por casa, como checklist">🏠 Por casa</button>
          </div>
          <button onclick="clNav(-1)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm">←</button>
          <input type="date" value="${clState.date}" onchange="clGoToDate(this.value)" class="border border-slate-300 rounded px-2 py-1 text-sm font-bold" />
          <button onclick="clNav(1)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm">→</button>
          ${!isToday ? '<button onclick="clNav(0)" class="px-2 py-1 bg-slate-900 text-white rounded text-xs">Hoy</button>' : ''}
          <div class="text-xs font-bold text-slate-700 ml-1 capitalize">${clState.view==='week' ? `Semana ${clDateOnly(clMondayOf(clState.date))} → ${clAddDays(clDateOnly(clMondayOf(clState.date)),6)}` : clFmtDate(clState.date)}</div>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs bg-slate-900 text-white px-2 py-1 rounded font-bold" title="Avance del día">✅ ${done}/${total}</span>
          <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded" title="Tareas + viaje = total del día">⏱ ${Math.floor(totalMin/60)}h ${totalMin%60}m total</span>
          <span class="text-[10px] text-slate-500" title="Solo trabajo (sin viaje)">(${Math.floor(plannedMin/60)}h${plannedMin%60?' '+(plannedMin%60)+'m':''} trabajo)</span>
          ${travelMin ? `<span class="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded" title="Tiempo de viaje sumado">🚗 ${travelMin}m</span>` : ''}
          ${gapMin > 30 ? `<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold" title="Tiempo muerto">⚠️ ${gapMin}m muertos</span>` : ''}
          <div class="flex gap-0.5 items-center bg-slate-50 rounded px-1 py-0.5 border border-slate-200">
            <span class="text-[9px] text-slate-500 uppercase font-bold mr-1">Zona</span>
            <button onclick="clSetZonaFilter('all')" class="text-[10px] px-1.5 py-0.5 rounded ${clState.zonaFilter==='all'?'bg-slate-900 text-white':'bg-white hover:bg-slate-100'}">Todas</button>
            ${CL_ZONAS.map(z => `<button onclick="clSetZonaFilter('${z}')" class="text-[10px] px-1.5 py-0.5 rounded ${clState.zonaFilter===z?'bg-slate-900 text-white':clZonaColor(z)}">${z}</button>`).join('')}
          </div>
          <button onclick="clOpenArmarDia()" class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded font-bold" title="Toma todo el backlog de una zona y lo agenda en este día agrupado por casa">🎯 Armar día</button>
          <button onclick="clCopyForWhatsApp(clState.view==='week'?'week':'day')" class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-bold" title="Copia el cronograma como texto para mandar al equipo por WhatsApp">📱 Enviar al equipo</button>
        </div>
      </div>

      <!-- BODY -->
      <div class="flex gap-3 flex-1 min-h-0 overflow-hidden">

        <!-- IZQUIERDA: Backlog + Plantillas -->
        <div class="w-72 flex-shrink-0 border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <!-- Tabs -->
          <div class="flex border-b border-slate-200 bg-slate-50">
            <button onclick="clSetLeftTab('backlog')" class="flex-1 px-1.5 py-2 text-[10px] font-bold ${clState.leftTab==='backlog'?'bg-white border-b-2 border-slate-900':'text-slate-500 hover:bg-slate-100'}">
              📥 Backlog <span class="bg-slate-900 text-white text-[9px] px-1 rounded">${backlogTotal}</span>
            </button>
            <button onclick="clSetLeftTab('templates')" class="flex-1 px-1.5 py-2 text-[10px] font-bold ${clState.leftTab==='templates'?'bg-white border-b-2 border-slate-900':'text-slate-500 hover:bg-slate-100'}">
              📚 Tareas
            </button>
            <button onclick="clSetLeftTab('daytemplates')" class="flex-1 px-1.5 py-2 text-[10px] font-bold ${clState.leftTab==='daytemplates'?'bg-white border-b-2 border-blue-600':'text-slate-500 hover:bg-slate-100'}">
              🗂️ Días <span class="bg-blue-600 text-white text-[9px] px-1 rounded">${(clState.dayTemplates||[]).length}</span>
            </button>
            <button onclick="clSetLeftTab('recurrentes')" class="flex-1 px-1.5 py-2 text-[10px] font-bold ${clState.leftTab==='recurrentes'?'bg-white border-b-2 border-violet-600':'text-slate-500 hover:bg-slate-100'}">
              🔁 Recur. <span class="bg-violet-600 text-white text-[9px] px-1 rounded">${(clState.recurring||[]).length}</span>
            </button>
          </div>

          ${clState.leftTab === 'backlog' ? clRenderBacklogPanel(backlogByZona) :
            clState.leftTab === 'templates' ? clRenderTemplatesPanel() :
            clState.leftTab === 'daytemplates' ? clRenderDayTemplatesPanel() :
            clRenderRecurrentesPanel()}
        </div>

        <!-- DERECHA: Día / Semana / Casas / Entregable -->
        <div class="flex-1 overflow-hidden border border-slate-200 rounded-lg flex flex-col">
          ${clState.view === 'print' ? clRenderPrintable(filteredDay) : clState.view === 'casas' ? clRenderCasas() : clState.view === 'week' ? clRenderWeek() : `
            <div class="sticky top-0 bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between z-10 flex-wrap gap-2">
              <div class="text-xs font-bold uppercase text-slate-700">📅 Itinerario ${clState.zonaFilter !== 'all' ? `· <span class="${clZonaColor(clState.zonaFilter)} px-1.5 rounded">${clState.zonaFilter}</span>` : ''}</div>
              <div class="flex gap-1 flex-wrap">
                <button onclick="clOpenAddLoose()" class="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">+ Tarea libre</button>
                ${filteredDay.length ? `<button onclick="clSaveDayAsTemplate()" class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold" title="Guardar este día como plantilla reusable">💾 Guardar día como plantilla</button>` : ''}
                ${clState.dayTemplates.length ? `<button onclick="clOpenApplyTemplate()" class="text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 px-2 py-1 rounded font-bold" title="Copiar una plantilla de día a esta fecha">📋 Aplicar plantilla</button>` : ''}
                ${filteredDay.length ? `<button onclick="clSetView('print')" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold" title="Vista para screenshot/envío al equipo">🖼️ Entregable</button>` : ''}
                <button onclick="clClearDay()" class="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded" title="Devolver todas al backlog">↩ Vaciar día</button>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto">
              ${clRenderTimeline(filteredDay)}
            </div>
            ${clRenderMaterialsSummary(filteredDay)}
          `}
        </div>

      </div>
    </div>
  `;
}

// ─── Panel Backlog ───
function clRenderBacklogPanel(backlogByZona) {
  const search = (clState.backlogSearch || '').toLowerCase().trim();
  const catF = clState.backlogCategoryFilter || 'all';
  const prioF = clState.backlogPriorityFilter || 'all';
  const sortBy = clState.backlogSort || 'oldest';

  // S6-U5: filtros aplicados
  let filtered = clState.backlog.filter(t => {
    if (clState.backlogZonaFilter !== 'all' && t.zona !== clState.backlogZonaFilter) return false;
    if (catF !== 'all') {
      const tpl = clState.tasks.find(x => x.id === t.task_id);
      if ((tpl?.category || '') !== catF) return false;
    }
    if (prioF !== 'all' && (t.priority || 'normal') !== prioF) return false;
    if (search) {
      const hay = ((t.title || '') + ' ' + (clPropName(t) || '') + ' ' + (t.notes || '')).toLowerCase();
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
  const categories = Array.from(new Set(clState.tasks.map(t => t.category).filter(Boolean))).sort();

  // Agrupar por casa (property_id || project_id || '__sin__')
  const byProp = {};
  filtered.forEach(t => {
    const key = t.property_id ? 'p:'+t.property_id : t.project_id ? 'j:'+t.project_id : '__sin__';
    if (!byProp[key]) byProp[key] = { name: clPropName(t) || 'Sin casa asignada', tasks: [], oldestDays: 0 };
    byProp[key].tasks.push(t);
    byProp[key].oldestDays = Math.max(byProp[key].oldestDays, clDaysAgo(t.created_at));
  });
  // Ordenar casas: la que tiene tarea más vieja primero
  const propOrder = Object.entries(byProp).sort((a,b) => b[1].oldestDays - a[1].oldestDays);

  return `
    <div class="p-2 bg-slate-50 border-b border-slate-200">
      <button onclick="clOpenAddPendiente()" class="w-full text-xs bg-slate-900 hover:bg-slate-700 text-white py-2 rounded font-bold">+ Pendiente</button>

      <!-- S6-U5: Search + filtros -->
      <div class="mt-2 space-y-1">
        <input type="text" placeholder="🔎 Buscar título, casa, notas..." value="${(search || '').replace(/"/g,'&quot;')}"
          onchange="clState.backlogSearch=this.value; clRender()"
          class="w-full border border-slate-300 rounded px-2 py-1 text-[11px]" />
        <div class="grid grid-cols-2 gap-1">
          <select onchange="clState.backlogCategoryFilter=this.value; clRender()" class="border border-slate-300 rounded px-1 py-0.5 text-[10px]">
            <option value="all" ${catF==='all'?'selected':''}>Toda categoría</option>
            ${categories.map(c => `<option value="${c}" ${catF===c?'selected':''}>${c}</option>`).join('')}
          </select>
          <select onchange="clState.backlogPriorityFilter=this.value; clRender()" class="border border-slate-300 rounded px-1 py-0.5 text-[10px]">
            <option value="all" ${prioF==='all'?'selected':''}>Toda prioridad</option>
            <option value="urgent" ${prioF==='urgent'?'selected':''}>🔴 Urgent</option>
            <option value="high" ${prioF==='high'?'selected':''}>🟠 High</option>
            <option value="normal" ${prioF==='normal'?'selected':''}>Normal</option>
            <option value="low" ${prioF==='low'?'selected':''}>Low</option>
          </select>
        </div>
        <select onchange="clState.backlogSort=this.value; clRender()" class="w-full border border-slate-300 rounded px-1 py-0.5 text-[10px]">
          <option value="oldest" ${sortBy==='oldest'?'selected':''}>Orden: más viejo primero</option>
          <option value="newest" ${sortBy==='newest'?'selected':''}>Orden: más nuevo primero</option>
          <option value="priority" ${sortBy==='priority'?'selected':''}>Orden: por prioridad</option>
          <option value="duration" ${sortBy==='duration'?'selected':''}>Orden: por duración</option>
        </select>
      </div>

      <div class="flex gap-0.5 mt-2 flex-wrap">
        <button onclick="clSetBacklogZona('all')" class="text-[10px] px-1.5 py-0.5 rounded ${clState.backlogZonaFilter==='all'?'bg-slate-900 text-white':'bg-white border border-slate-300'}">Todas (${clState.backlog.length})</button>
        ${CL_ZONAS.map(z => {
          const c = backlogByZona[z] || 0;
          if (!c) return '';
          return `<button onclick="clSetBacklogZona('${z}')" class="text-[10px] px-1.5 py-0.5 rounded ${clState.backlogZonaFilter===z?'bg-slate-900 text-white':clZonaColor(z)}">${z} ${c}</button>`;
        }).join('')}
      </div>
      ${(search || catF !== 'all' || prioF !== 'all' || clState.backlogZonaFilter !== 'all') ? `
        <div class="mt-1 text-[9px] text-slate-600">
          Mostrando ${filtered.length} de ${clState.backlog.length}
          <button onclick="clState.backlogSearch=''; clState.backlogCategoryFilter='all'; clState.backlogPriorityFilter='all'; clState.backlogZonaFilter='all'; clRender()" class="ml-1 text-blue-600 hover:underline">✕ limpiar</button>
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
              const age = clDaysAgo(t.created_at);
              const ageColor = age > 30 ? 'text-red-600 font-bold' : age > 14 ? 'text-amber-600' : 'text-slate-500';
              const prio = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : '';
              return `
                <div draggable="true"
                     ondragstart="clBacklogDragStart('${t.id}')"
                     ondragend="clState.draggedBacklogId=null"
                     class="bg-white border ${t.zona ? clZonaColor(t.zona).replace('bg-','border-').replace(' text-','-').split(' ')[0].replace('-100','-300') : 'border-slate-200'} rounded p-1.5 cursor-grab active:cursor-grabbing hover:shadow-sm">
                  <div class="flex items-start gap-1">
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-bold leading-tight">${prio}${t.title}</div>
                      <div class="text-[10px] ${ageColor} mt-0.5">⏱ ${t.duration_min}m · ${age}d en backlog${t.zona ? ` · <span class="${clZonaColor(t.zona)} px-1 rounded">${t.zona}</span>` : ''}</div>
                    </div>
                    <button onclick="event.stopPropagation(); clEditBacklog('${t.id}')" class="text-[10px] text-slate-400 hover:text-slate-900" title="Editar">✏️</button>
                    <button onclick="event.stopPropagation(); clDeleteBacklog('${t.id}')" class="text-[10px] text-slate-400 hover:text-red-600" title="Borrar">✕</button>
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
// ─── Panel Recurrentes (lista + crear inline) ───
function clRenderRecurrentesPanel() {
  const tmplOpts = clState.tasks.map(t => `<option value="${t.id}" data-emoji="${t.emoji}" data-name="${(t.name||'').replace(/"/g,'&quot;')}">${t.emoji||'🧰'} ${t.name} (cada ${t.default_duration_min}m)</option>`).join('');
  const propsOpts = clState.properties.map(p => `<option value="prop:${p.id}">🏠 ${p.nickname || p.address}</option>`).join('');
  const projsOpts = clState.projects.map(p => `<option value="proj:${p.id}">🏗️ ${p.name || p.address}</option>`).join('');
  const today = clDateOnly(new Date());

  return `
    <div class="p-2 bg-violet-50 border-b border-violet-200">
      <div class="text-[10px] text-violet-900 mb-2">🔁 Las recurrentes generan pendientes automáticos al backlog cuando vencen. Ej: filtros AC cada 90d.</div>
      <div class="space-y-1.5 mb-2">
        <select id="op-r-task" class="w-full border border-slate-300 rounded px-2 py-1 text-xs">${tmplOpts}</select>
        <select id="op-r-target" class="w-full border border-slate-300 rounded px-2 py-1 text-xs">
          <option value="">— sin casa específica —</option>
          <optgroup label="🏠 Rentas">${propsOpts}</optgroup>
          <optgroup label="🏗️ Obras">${projsOpts}</optgroup>
        </select>
        <div class="grid grid-cols-2 gap-1">
          <input id="op-r-interval" type="number" value="14" min="1" placeholder="Cada N días" class="border border-slate-300 rounded px-2 py-1 text-xs" />
          <input id="op-r-next" type="date" value="${today}" class="border border-slate-300 rounded px-2 py-1 text-xs" />
        </div>
        <select id="op-r-zona" class="w-full border border-slate-300 rounded px-2 py-1 text-xs">
          <option value="">— sin zona —</option>${CL_ZONAS.map(z => `<option>${z}</option>`).join('')}
        </select>
        <button onclick="clCreateRecurringFromPanel()" class="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs py-1.5 rounded font-bold">+ Crear recurrente</button>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto p-1.5 space-y-1">
      ${(clState.recurring||[]).length === 0 ? '<div class="text-center text-slate-400 text-xs py-6">Sin recurrentes activas.</div>' :
        clState.recurring.map(r => {
          const base = clState.tasks.find(x => x.id === r.base_task_id);
          const prop = r.property_id ? clState.properties.find(x => x.id === r.property_id) : null;
          const proj = r.project_id ? clState.projects.find(x => x.id === r.project_id) : null;
          const where = prop ? (prop.nickname || prop.address) : proj ? (proj.name || proj.address) : 'todas las casas';
          const daysToDue = r.next_due ? Math.round((new Date(r.next_due) - new Date(today)) / 86400000) : null;
          const dueClass = daysToDue == null ? '' : daysToDue < 0 ? 'text-red-600 font-bold' : daysToDue <= 3 ? 'text-amber-600' : 'text-slate-500';
          return `
            <div class="bg-white border border-slate-200 rounded p-2">
              <div class="flex items-start gap-1">
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold leading-tight">${base?.emoji||'🔁'} ${r.custom_title || base?.name || '—'}</div>
                  <div class="text-[10px] text-slate-500 mt-0.5">🏠 ${where} · cada ${r.interval_days}d</div>
                  <div class="text-[10px] ${dueClass}">⏰ próxima: ${r.next_due || '—'}${daysToDue != null ? ` (${daysToDue >= 0 ? 'en '+daysToDue+'d' : Math.abs(daysToDue)+'d vencida'})` : ''}${r.zona ? ` · ${r.zona}`:''}</div>
                </div>
                <button onclick="clDeleteRecurring('${r.id}')" class="text-[10px] text-slate-400 hover:text-red-600">✕</button>
              </div>
            </div>
          `;
        }).join('')}
    </div>
  `;
}

async function clCreateRecurringFromPanel() {
  const base_task_id = document.getElementById('op-r-task').value;
  if (!base_task_id) return alert('Elegí una plantilla');
  const target = document.getElementById('op-r-target').value || '';
  const payload = {
    base_task_id,
    property_id: target.startsWith('prop:') ? target.slice(5) : null,
    project_id: target.startsWith('proj:') ? target.slice(5) : null,
    interval_days: +document.getElementById('op-r-interval').value || 14,
    next_due: document.getElementById('op-r-next').value || clDateOnly(new Date()),
    zona: document.getElementById('op-r-zona').value || null,
    business: 'rentas'
  };
  const { error } = await sb.from('clean_recurring').insert(payload);
  if (error) return alert('Error: ' + error.message);
  await clLoadAll();
  clRender();
}

function clRenderTemplatesPanel() {
  const filtered = clState.tasks.filter(t => clState.libBusinessFilter === 'all' || t.business === clState.libBusinessFilter);
  const byCat = {};
  filtered.forEach(t => { (byCat[t.category||'otros'] = byCat[t.category||'otros'] || []).push(t); });

  return `
    <div class="p-2 bg-slate-50 border-b border-slate-200">
      <div class="text-[10px] text-slate-600 mb-1">Arrastrá una plantilla al horario para crear una tarea agendada directa (sin pasar por backlog)</div>
      <div class="flex gap-1 flex-wrap">
        ${['all','rentas','remodelacion','both'].map(b => `<button onclick="clSetLibFilter('${b}')" class="text-[10px] px-2 py-0.5 rounded ${clState.libBusinessFilter===b?'bg-slate-900 text-white':'bg-white border border-slate-300'}">${b==='all'?'Todas':b==='both'?'Ambas':b}</button>`).join('')}
      </div>
    </div>
    <div class="flex-1 overflow-y-auto p-1.5 space-y-1">
      ${Object.entries(byCat).map(([cat, items]) => `
        <details open class="border border-slate-100 rounded">
          <summary class="cursor-pointer px-2 py-1 bg-slate-50 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-100 flex justify-between items-center">
            <span>${cat} <span class="text-slate-400">(${items.length})</span></span>
            <button onclick="event.preventDefault(); event.stopPropagation(); clOpenNewTemplate('${cat}')" class="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold" title="Crear plantilla en esta categoría">+</button>
          </summary>
          <div class="p-1 space-y-1">
            ${items.map(t => `
              <div draggable="true"
                   ondragstart="clTemplateDragStart('${t.id}')"
                   ondragend="clState.draggedTemplateId=null"
                   class="bg-white border-2 ${t.business==='rentas'?'border-blue-200 hover:border-blue-500':t.business==='remodelacion'?'border-amber-200 hover:border-amber-500':'border-slate-200 hover:border-slate-500'} rounded p-1.5 cursor-grab active:cursor-grabbing group/tpl relative">
                <div class="flex items-start gap-1.5">
                  <span class="text-base leading-none">${t.emoji||'🧰'}</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold leading-tight">${t.name}</div>
                    <div class="text-[9px] text-slate-500 mt-0.5">⏱ ${t.default_duration_min}m</div>
                  </div>
                  <div class="flex flex-col gap-0.5 opacity-0 group-hover/tpl:opacity-100">
                    <button onclick="event.stopPropagation(); clOpenEditTemplate('${t.id}')" class="text-[10px] text-slate-400 hover:text-slate-900" title="Editar plantilla">✏️</button>
                    <button onclick="event.stopPropagation(); clDeleteTemplateConfirm('${t.id}','${(t.name||'').replace(/'/g,'\\\'')}')" class="text-[10px] text-slate-400 hover:text-red-600" title="Eliminar plantilla">✕</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </details>
      `).join('')}
    </div>
    <!-- Botón crear nueva plantilla — siempre visible al fondo -->
    <div class="border-t border-slate-200 bg-slate-50 p-2">
      <button onclick="clOpenNewTemplate()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1">
        <span>+ Nueva plantilla de tarea</span>
      </button>
      <div class="text-[9px] text-slate-500 text-center mt-1">Quedan disponibles para reusar todos los días</div>
    </div>
  `;
}

// ─── Timeline ───
// Altura visual: 1 minuto = CL_PX_PER_MIN px → 30min slot = 36px, 1h = 72px, 2h = 144px
const CL_PX_PER_MIN = 1.2;

function clRenderTimeline(filteredDay) {
  // Slots de 30 min para drop targets + labels
  const slots = [];
  for (let h = CL_START_HOUR; h < CL_END_HOUR; h++) {
    slots.push({ time: `${clPad(h)}:00`, isHour: true, idx: slots.length });
    slots.push({ time: `${clPad(h)}:30`, isHour: false, idx: slots.length });
  }
  const dayStartMin = CL_START_HOUR * 60;
  const totalMin = (CL_END_HOUR - CL_START_HOUR) * 60;
  const totalPx = totalMin * CL_PX_PER_MIN;
  const SLOT_PX = 30 * CL_PX_PER_MIN; // 36px

  // Sorted para detectar cambios de casa + gaps + travel
  const sorted = [...filteredDay].sort((a,b) => clTimeToMin(a.start_time) - clTimeToMin(b.start_time));

  // Gaps (huecos) y cambios de casa
  const gaps = [];
  let lastProp = null;
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const propKey = t.property_id || t.project_id || null;
    if (i > 0) {
      const prev = sorted[i-1];
      const prevEnd = clTimeToMin(prev.start_time) + (prev.duration_min||0) + (prev.travel_min||0);
      const thisStart = clTimeToMin(t.start_time);
      if (thisStart > prevEnd) {
        gaps.push({ startMin: prevEnd, durMin: thisStart - prevEnd });
      }
    }
    lastProp = propKey;
  }

  // Computar carriles (lanes) para tasks que se solapan visualmente
  const placed = sorted.map(t => {
    const startMin = clTimeToMin(t.start_time);
    const endMin = startMin + (t.duration_min || 0);
    return { task: t, startMin, endMin, lane: 0 };
  });
  // Asignar lanes (greedy)
  placed.forEach((p, i) => {
    const overlapping = placed.slice(0, i).filter(q => q.endMin > p.startMin && q.startMin < p.endMin);
    const usedLanes = new Set(overlapping.map(q => q.lane));
    let lane = 0;
    while (usedLanes.has(lane)) lane++;
    p.lane = lane;
  });
  const maxLane = placed.reduce((m, p) => Math.max(m, p.lane), 0);

  return `
    <div class="relative" style="height: ${totalPx}px;">
      <!-- Grid de slots (background + drop targets) -->
      ${slots.map((slot) => {
        const top = (clTimeToMin(slot.time) - dayStartMin) * CL_PX_PER_MIN;
        return `
          <div class="absolute left-0 right-0 flex ${slot.isHour?'border-t border-slate-300':'border-t border-slate-100 border-dashed'} hover:bg-blue-50/40"
               style="top: ${top}px; height: ${SLOT_PX}px;"
               ondragover="event.preventDefault(); this.classList.add('bg-blue-100')"
               ondragleave="this.classList.remove('bg-blue-100')"
               ondrop="this.classList.remove('bg-blue-100'); clDropOnSlot('${slot.time}', event)">
            <div class="w-16 flex-shrink-0 text-right pr-2 pt-0.5 text-[11px] font-bold ${slot.isHour?'text-slate-900':'text-slate-300'}">
              ${slot.isHour ? clFmt12(slot.time) : ''}
            </div>
            <div class="flex-1 border-l border-slate-100"></div>
          </div>
        `;
      }).join('')}

      <!-- Indicadores de gaps -->
      ${gaps.filter(g => g.durMin >= 15).map(g => {
        const top = (g.startMin - dayStartMin) * CL_PX_PER_MIN;
        const height = g.durMin * CL_PX_PER_MIN;
        return `
          <div class="absolute pointer-events-none flex items-center justify-center bg-red-50/60 border-l-4 border-red-300"
               style="top: ${top}px; height: ${height}px; left: 64px; right: 8px;">
            <span class="text-[10px] text-red-600 font-bold italic">⏳ ${g.durMin}m hueco</span>
          </div>
        `;
      }).join('')}

      <!-- Tasks (absolutely positioned con altura proporcional) -->
      ${placed.map(p => {
        const t = p.task;
        const top = (p.startMin - dayStartMin) * CL_PX_PER_MIN;
        const height = Math.max(24, (t.duration_min || 30) * CL_PX_PER_MIN);
        const travelHeight = (t.travel_min || 0) * CL_PX_PER_MIN;
        const laneWidth = 100 / (maxLane + 1);
        const laneLeft = p.lane * laneWidth;
        return `
          ${travelHeight > 0 ? `
            <div class="absolute bg-amber-100 border border-amber-300 border-dashed rounded text-[9px] text-amber-800 px-1 italic overflow-hidden"
                 style="top: ${top + height}px; height: ${travelHeight}px; left: calc(64px + ${laneLeft}% + 4px); width: calc(${laneWidth}% - 8px);">
              🚗 ${t.travel_min}m viaje
            </div>
          ` : ''}
          <div class="absolute"
               style="top: ${top}px; height: ${height}px; left: calc(64px + ${laneLeft}% + 4px); width: calc(${laneWidth}% - 8px);">
            ${clRenderScheduledTask(t, height)}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─── Vista Semana ───
// ──────────────────────────────────────────────────────────────
// JORNADA OBJETIVO 8h · badge verde/amarillo/rojo (feedback PDF Juan)
// ──────────────────────────────────────────────────────────────
function clDayHealthBadge(totalMin) {
  if (totalMin === 0) return '';
  const h = totalMin / 60;
  if (h > 8.5)   return '<span class="bg-red-600 text-white text-[8px] font-bold px-1 rounded" title="Sobrecarga · >8.5h">⚠️ OVER</span>';
  if (h >= 7)    return '<span class="bg-emerald-600 text-white text-[8px] font-bold px-1 rounded" title="Jornada óptima 7-8.5h">✓ ÓPTIMO</span>';
  if (h >= 4)    return '<span class="bg-amber-500 text-white text-[8px] font-bold px-1 rounded" title="Tiene margen · 4-7h">~ MARGEN</span>';
  return '<span class="bg-slate-400 text-white text-[8px] font-bold px-1 rounded" title="Día corto · <4h">· CORTO</span>';
}

// Detecta si un día tiene propiedad pesada (Cervin) mezclada con otra → warning
function clDayHasHeavyConflict(acts) {
  const heavies = (clState.propertyDurations || []).filter(d => d.is_heavy).map(d => d.property_short);
  if (!heavies.length) return false;
  const hasHeavy = acts.some(t => heavies.some(h => (t.title||'').includes(h) || (t.property_name||'').includes(h)));
  if (!hasHeavy) return false;
  // Si hay pesada Y MÁS DE 1 tarea de podada → conflicto
  const podadas = acts.filter(t => /podar|podada/i.test(t.title||'') || /podar|podada/i.test(t.category||''));
  return hasHeavy && podadas.length > 1;
}

function clRenderWeek() {
  const weekStart = clDateOnly(clMondayOf(clState.date));
  const days = Array.from({length:7}, (_, i) => clAddDays(weekStart, i));
  const today = clDateOnly(new Date());
  const routes = clState.dayRoutes || [];

  return `
    <div class="sticky top-0 bg-slate-50 border-b border-slate-200 px-3 py-2 z-10 flex items-center justify-between flex-wrap gap-2">
      <div class="text-xs font-bold uppercase text-slate-700">📊 Vista semanal · arrastrá del backlog a un día</div>
      ${routes.length ? `
        <div class="flex items-center gap-1">
          <span class="text-[10px] text-slate-500 font-bold">📍 Rutas sugeridas (PDF Juan):</span>
          <select onchange="if(this.value) clInsertRouteToDay(this.value); this.value=''" class="text-[10px] border border-slate-300 rounded px-1 py-0.5 bg-white">
            <option value="">— elegir ruta + día —</option>
            ${routes.map(r => `<option value="${r.code}">${r.name} (${Math.floor(r.total_work_min/60)}h${r.total_work_min%60?r.total_work_min%60+'m':''})</option>`).join('')}
          </select>
        </div>
      ` : ''}
    </div>
    <div class="grid grid-cols-7 flex-1 overflow-auto divide-x divide-slate-200">
      ${days.map(dStr => {
        const d = new Date(dStr + 'T00:00:00');
        const dayName = d.toLocaleDateString('es-MX',{weekday:'short'});
        const dayNum = d.getDate();
        const isToday = dStr === today;
        const isSelected = dStr === clState.date;
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const acts = clState.weekTasks.filter(t => t.date === dStr && (clState.zonaFilter === 'all' || t.zona === clState.zonaFilter))
          .sort((a,b) => clTimeToMin(a.start_time) - clTimeToMin(b.start_time));
        const totalMin = acts.reduce((s,t) => s+(t.duration_min||0)+(t.travel_min||0), 0);
        const done = acts.filter(t => t.status === 'done').length;
        const zonaCount = { Norte:0, Sur:0 };
        acts.forEach(t => { if (t.zona) zonaCount[t.zona] = (zonaCount[t.zona]||0)+1; });
        const dominantZona = zonaCount.Norte > zonaCount.Sur ? 'Norte' : zonaCount.Sur > zonaCount.Norte ? 'Sur' : null;

        return `
          <div class="flex flex-col min-w-0 ${isToday?'bg-amber-50/40':isWeekend?'bg-slate-50/40':'bg-white'} ${isSelected?'ring-2 ring-slate-900 ring-inset':''}"
               ondragover="event.preventDefault(); this.classList.add('bg-blue-50')"
               ondragleave="this.classList.remove('bg-blue-50')"
               ondrop="this.classList.remove('bg-blue-50'); clDropOnWeekDay('${dStr}', event)">
            <button onclick="clGoToDate('${dStr}'); clSetView('day')" class="border-b border-slate-200 px-2 py-1.5 text-left hover:bg-slate-100 sticky top-0 bg-inherit z-[1]">
              <div class="flex items-center justify-between gap-1">
                <div>
                  <div class="text-[10px] uppercase font-bold text-slate-500">${dayName}</div>
                  <div class="text-lg font-bold ${isToday?'text-amber-700':''}">${dayNum}</div>
                </div>
                <div class="text-right">
                  ${dominantZona ? `<span class="text-[9px] ${clZonaColor(dominantZona)} px-1 rounded font-bold">${dominantZona}</span>` : ''}
                  ${acts.length ? `<div class="text-[9px] text-slate-500 mt-0.5">${done}/${acts.length} · ${Math.floor(totalMin/60)}h${totalMin%60?totalMin%60+'m':''}</div>` : ''}
                </div>
              </div>
              <div class="flex items-center gap-1 mt-0.5 flex-wrap">
                ${acts.length ? clDayHealthBadge(totalMin) : ''}
                ${zonaCount.Norte && zonaCount.Sur ? `<span class="text-[8px] bg-amber-100 text-amber-800 px-1 rounded font-bold">⚠️ mezcla zonas</span>` : ''}
                ${clDayHasHeavyConflict(acts) ? `<span class="text-[8px] bg-red-100 text-red-800 px-1 rounded font-bold" title="Hay una propiedad PESADA (ej. Cervin) con otras tareas. PDF recomienda aislarla.">⚠️ pesada mezclada</span>` : ''}
              </div>
            </button>
            <div class="flex-1 overflow-y-auto p-1 space-y-1 min-h-[200px]">
              ${acts.length === 0 ? `<div class="text-[10px] text-slate-300 text-center py-4 italic">vacío</div>` : acts.map(t => clRenderWeekTaskCard(t)).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function clRenderWeekTaskCard(t) {
  const locText = clPropName(t) || '';
  const propCls = clPropColor(t.property_id || t.project_id);
  const isDone = t.status === 'done';
  const isSkipped = t.status === 'skipped';
  const today = clDateOnly(new Date());
  const isOverdue = !isDone && !isSkipped && t.date && t.date < today;
  const cl = t.checklist || [];
  const clDone = cl.filter(x => x.done).length;

  // Estado visual: completada / atrasada / normal
  const cardCls = isDone
    ? 'bg-emerald-50 border-emerald-400 opacity-80'
    : isSkipped
      ? 'bg-slate-100 border-slate-300 opacity-60'
      : isOverdue
        ? 'bg-red-50 border-red-400 border-2 ring-1 ring-red-300'
        : propCls;

  return `
    <div draggable="true"
         ondragstart="clSchedDragStart('${t.id}')"
         ondragend="clState.draggedScheduledId=null"
         class="${cardCls} border rounded p-1 cursor-grab text-[10px] hover:shadow-sm relative">
      ${isOverdue ? `<div class="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded-sm shadow z-10">⚠️ ATRASADA</div>` : ''}
      <div onclick="event.stopPropagation(); clEditScheduled('${t.id}')" class="cursor-pointer">
        <div class="flex items-center gap-1">
          <span class="font-bold text-slate-900">${clFmt12(t.start_time).replace(' ','')}</span>
          ${t.zona ? `<span class="${clZonaColor(t.zona)} px-1 rounded text-[8px] font-bold">${t.zona[0]}</span>` : ''}
          ${isDone ? '<span class="text-emerald-700">✓</span>' : ''}
          ${isSkipped ? '<span class="text-slate-500">⊘</span>' : ''}
        </div>
        <div class="font-semibold truncate ${isDone||isSkipped?'line-through':''} ${isOverdue?'text-red-900':''}">${t.title}</div>
        ${locText ? `<div class="text-slate-600 truncate">🏠 ${locText}</div>` : ''}
        ${cl.length ? `<div class="text-slate-500 text-[9px]">📋 ${clDone}/${cl.length}</div>` : ''}
      </div>
      <!-- Acciones rápidas in-card -->
      <div class="flex gap-1 mt-1 pt-1 border-t border-slate-200/60">
        ${!isDone ? `<button onclick="event.stopPropagation(); clQuickComplete('${t.id}')" title="Marcar completada" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold py-0.5 rounded">✓ Hecha</button>` : `<button onclick="event.stopPropagation(); clQuickUndo('${t.id}')" title="Volver a planificar" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-bold py-0.5 rounded">↩ Deshacer</button>`}
        ${isOverdue ? `<button onclick="event.stopPropagation(); clQuickReprogramToday('${t.id}')" title="Mover a hoy" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold py-0.5 rounded">→ Hoy</button>` : ''}
        ${isOverdue ? `<button onclick="event.stopPropagation(); clQuickSkip('${t.id}')" title="Marcar como no realizada (skip)" class="flex-1 bg-slate-400 hover:bg-slate-500 text-white text-[9px] font-bold py-0.5 rounded">⊘ Skip</button>` : ''}
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────
// Acciones rápidas in-card (1 click, sin modal)
// ──────────────────────────────────────────────────────────────
async function clQuickComplete(id) {
  // Buscar la tarea para conocer la estimación
  const t = (clState.weekTasks || []).find(x => x.id === id) || (clState.dayTasks || []).find(x => x.id === id);
  const estim = t?.duration_min || 0;
  // Preguntar tiempo REAL (feedback PDF Juan: "Registrar tiempos reales para mejorar proyecciones futuras")
  let actualMin = null;
  if (estim > 0) {
    const ans = prompt(`✓ Marcar "${t.title}" como completada.\n\n¿Cuántos minutos REALES tomó? (estimado: ${estim} min)\n\nDejá vacío si no querés registrar.`, String(estim));
    if (ans !== null && ans.trim() !== '' && !isNaN(parseInt(ans))) {
      actualMin = parseInt(ans);
    }
  }
  const update = {
    status: 'done',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (actualMin !== null) {
    update.actual_duration_min = actualMin;
    update.estimated_duration_min = estim;
  }
  await sb.from('clean_day_tasks').update(update).eq('id', id);
  await clLoadAll();
  clRender();
}

// Inserta una ruta sugerida (PDF Juan) en el día que elijas
async function clInsertRouteToDay(routeCode) {
  const route = (clState.dayRoutes || []).find(r => r.code === routeCode);
  if (!route) return alert('Ruta no encontrada');
  const dateStr = prompt(`📍 Insertar "${route.name}"\nTotal: ${Math.floor(route.total_work_min/60)}h${route.total_work_min%60?route.total_work_min%60+'m':''}\n\n¿Qué día? (YYYY-MM-DD)`, clState.date);
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
  const stops = route.stops || [];
  if (!confirm(`Vas a insertar ${stops.length} tarea(s) el ${dateStr}.\n\n${stops.map((s,i) => `${i+1}. ${s.start_time} · ${s.property_short} (${s.duration_min}m)`).join('\n')}\n\n¿Confirmás?`)) return;
  const inserts = stops.map(s => ({
    date: dateStr,
    start_time: s.start_time,
    duration_min: s.duration_min,
    title: `Podar · ${s.property_short}`,
    property_name: s.property_short,
    zona: route.zona,
    category: 'podada',
    status: 'planned',
    estimated_duration_min: s.duration_min,
    created_by: state.user?.id || null
  }));
  const { error } = await sb.from('clean_day_tasks').insert(inserts);
  if (error) return alert('Error: ' + error.message);
  await clLoadAll();
  clRender();
  alert(`✓ Ruta "${route.name}" insertada en ${dateStr}`);
}

async function clQuickUndo(id) {
  await sb.from('clean_day_tasks').update({
    status: 'planned',
    completed_at: null,
    updated_at: new Date().toISOString()
  }).eq('id', id);
  await clLoadAll();
  clRender();
}

async function clQuickSkip(id) {
  if (!confirm('¿Marcar esta tarea como NO REALIZADA (skip)? Queda en el histórico pero no se reasigna.')) return;
  await sb.from('clean_day_tasks').update({
    status: 'skipped',
    updated_at: new Date().toISOString()
  }).eq('id', id);
  await clLoadAll();
  clRender();
}

async function clQuickReprogramToday(id) {
  const today = clDateOnly(new Date());
  await sb.from('clean_day_tasks').update({
    date: today,
    status: 'planned',
    updated_at: new Date().toISOString()
  }).eq('id', id);
  await clLoadAll();
  clRender();
}

async function clDropOnWeekDay(dateStr, ev) {
  ev.preventDefault();
  let opError = null;
  if (clState.draggedScheduledId) {
    const id = clState.draggedScheduledId; clState.draggedScheduledId = null;
    const { error } = await sb.from('clean_day_tasks').update({ date: dateStr, updated_at: new Date().toISOString() }).eq('id', id);
    opError = error;
  } else if (clState.draggedBacklogId) {
    const id = clState.draggedBacklogId; clState.draggedBacklogId = null;
    const existing = clState.weekTasks.filter(x => x.date === dateStr).sort((a,b) => clTimeToMin(a.start_time) - clTimeToMin(b.start_time));
    let startTime = '08:00';
    if (existing.length) {
      const last = existing[existing.length-1];
      startTime = clAddMin(last.start_time, last.duration_min);
    }
    const { error } = await sb.from('clean_day_tasks').update({ date: dateStr, start_time: startTime, updated_at: new Date().toISOString() }).eq('id', id);
    opError = error;
  } else if (clState.draggedTemplateId) {
    const tmpl = clState.tasks.find(x => x.id === clState.draggedTemplateId);
    clState.draggedTemplateId = null;
    if (!tmpl) return;
    const existing = clState.weekTasks.filter(x => x.date === dateStr).sort((a,b) => clTimeToMin(a.start_time) - clTimeToMin(b.start_time));
    let startTime = '08:00';
    if (existing.length) {
      const last = existing[existing.length-1];
      startTime = clAddMin(last.start_time, last.duration_min);
    }
    const { error } = await sb.from('clean_day_tasks').insert({
      date: dateStr, start_time: startTime,
      duration_min: tmpl.default_duration_min || 30,
      title: tmpl.name, task_id: tmpl.id, business: tmpl.business,
      materials: tmpl.default_materials || [],
      checklist: (tmpl.default_checklist || []).map(item => ({ item, done: false })),
      created_by: state.user?.id || null
    });
    opError = error;
  } else return;
  if (opError) {
    const msg = opError.message || String(opError);
    if (/does not exist|relation/i.test(msg)) {
      clState.tablesError = msg;
      clRender();
      alert('❌ No se guardó la tarea\n\nLas tablas del Cronograma Limpieza NO existen en Supabase todavía.\n\nAndá a Supabase → SQL Editor y pegá el contenido de:\nsupabase/cleaning-planner-schema.sql\n\nDespués recargá la página.');
    } else {
      alert('❌ Error al guardar la tarea:\n\n' + msg);
    }
    return;
  }
  await clLoadAll();
  clRender();
}

function clRenderScheduledTask(t, blockHeight) {
  const endTime = clAddMin(t.start_time, t.duration_min);
  const locText = clPropName(t);
  const propCls = clPropColor(t.property_id || t.project_id);
  const mats = t.materials || [];
  const isDone = t.status === 'done';
  const isInProg = t.status === 'in_progress';
  const isSkipped = t.status === 'skipped';
  const statusBg = isDone ? 'bg-emerald-50 border-emerald-300' :
                   isInProg ? 'bg-blue-50 border-blue-300' :
                   isSkipped ? 'bg-slate-50 border-slate-200 opacity-50' :
                   propCls;
  const prio = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : '';
  // Si el bloque es chico, mostrar menos info
  const isCompact = blockHeight && blockHeight < 50;
  const isMedium = blockHeight && blockHeight < 90;
  const heightStyle = blockHeight ? `style="height: 100%;"` : '';

  return `
    <div draggable="true"
         ondragstart="clSchedDragStart('${t.id}')"
         ondragend="clState.draggedScheduledId=null"
         onclick="clEditScheduled('${t.id}')"
         class="${statusBg} border-2 rounded-lg p-1.5 group/task hover:shadow-md cursor-pointer overflow-hidden flex flex-col"
         ${heightStyle}>
      <div class="flex items-start gap-1.5 flex-1 min-h-0">
        <input type="checkbox" ${isDone?'checked':''} onclick="event.stopPropagation(); clToggleDone('${t.id}')" class="mt-0.5 cursor-pointer flex-shrink-0" />
        <div class="flex-1 min-w-0 overflow-hidden">
          <div class="flex items-center gap-1 flex-wrap">
            <span class="text-xs font-bold ${isDone?'line-through opacity-60':''} truncate">${prio}${t.title}</span>
            ${isCompact ? '' : `<span class="text-[10px] text-slate-600 whitespace-nowrap">${clFmt12(t.start_time)}→${clFmt12(endTime)} · ${t.duration_min}m</span>`}
            ${t.zona ? `<span class="text-[9px] ${clZonaColor(t.zona)} border px-1 rounded font-bold">${t.zona[0]}</span>` : ''}
            ${t.recurring_id ? '<span class="text-[9px] bg-violet-100 text-violet-700 px-1 rounded font-bold" title="Recurrente">🔁</span>' : ''}
          </div>
          ${isCompact ? '' : (locText ? `<div class="text-[10px] text-slate-700 mt-0.5 font-semibold truncate">🏠 ${locText}</div>` : '')}
          ${isMedium ? '' : (mats.length ? `<div class="flex flex-wrap gap-0.5 mt-1">${mats.slice(0,3).map(m => `<span class="text-[9px] bg-white border border-slate-300 px-1 rounded">${m}</span>`).join('')}${mats.length > 3 ? `<span class="text-[9px] text-slate-400">+${mats.length-3}</span>`:''}</div>` : '')}
          ${(t.checklist || []).length ? (() => {
            const cl = t.checklist;
            const cd = cl.filter(x => x.done).length;
            const pct = Math.round(cd/cl.length*100);
            return `<div class="mt-1 cursor-pointer" onclick="event.stopPropagation(); clOpenChecklist('${t.id}')" title="Checklist">
              <div class="flex items-center gap-1">
                <span class="text-[10px] font-bold ${cd===cl.length?'text-emerald-700':'text-slate-600'}">📋 ${cd}/${cl.length}</span>
                <div class="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden"><div class="${cd===cl.length?'bg-emerald-500':'bg-blue-500'} h-full" style="width:${pct}%"></div></div>
              </div>
            </div>`;
          })() : ''}
          ${isMedium ? '' : (t.notes ? `<div class="text-[10px] text-slate-500 italic mt-0.5 truncate">📝 ${t.notes}</div>` : '')}
        </div>
        <div class="flex flex-col gap-0.5 opacity-0 group-hover/task:opacity-100 flex-shrink-0">
          ${t.recurring_id ? `<button onclick="event.stopPropagation(); clMakeTaskOneTime('${t.id}')" class="text-[10px] text-violet-500 hover:text-violet-700" title="Quitar recurrencia (sola vez)">🔂</button>` : `<button onclick="event.stopPropagation(); clOpenConvertToRecurring('${t.id}')" class="text-[10px] text-slate-400 hover:text-violet-600" title="Convertir en recurrente">🔁</button>`}
          <button onclick="event.stopPropagation(); clSendToBacklog('${t.id}')" class="text-[10px] text-slate-400 hover:text-slate-900" title="Backlog">↩</button>
          <button onclick="event.stopPropagation(); clDeleteScheduled('${t.id}')" class="text-[10px] text-slate-400 hover:text-red-600" title="Eliminar">✕</button>
        </div>
      </div>
    </div>
  `;
}

function clRenderMaterialsSummary(filteredDay) {
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

// ─── Vista CASAS — checklist agrupado por propiedad/obra ───
function clRenderCasas() {
  const today = clDateOnly(new Date());
  const search = (clState.casasSearch || '').toLowerCase().trim();

  // Unir backlog + upcoming + recurrentes y agrupar por casa
  const all = [
    ...clState.backlog.map(t => ({...t, _bucket: 'backlog'})),
    ...clState.allUpcoming.map(t => ({...t, _bucket: t.date === today ? 'hoy' : 'futuro'}))
  ];
  const recurringByKey = {};
  (clState.recurring || []).forEach(r => {
    const k = r.property_id ? 'p:'+r.property_id : r.project_id ? 'j:'+r.project_id : '__sin__';
    (recurringByKey[k] = recurringByKey[k] || []).push(r);
  });
  const byKey = {};
  all.forEach(t => {
    const k = t.property_id ? 'p:'+t.property_id : t.project_id ? 'j:'+t.project_id : '__sin__';
    (byKey[k] = byKey[k] || []).push(t);
  });

  // Construir lista de casas (todas, aunque no tengan tareas)
  const casas = [];
  clState.properties.forEach(p => casas.push({
    key: 'p:'+p.id, kind: '🏠', name: p.nickname || p.address || 'Casa sin nombre',
    addr: p.address || '', tipo: p.property_type || ''
  }));
  clState.projects.forEach(p => casas.push({
    key: 'j:'+p.id, kind: '🏗️', name: p.name || p.address || 'Obra',
    addr: p.address || '', tipo: 'Obra activa'
  }));
  casas.push({ key: '__sin__', kind: '❓', name: 'Sin casa asignada', addr: '—', tipo: '' });

  // Filtrar por search
  const filtered = search
    ? casas.filter(c => (c.name + ' ' + c.addr).toLowerCase().includes(search))
    : casas;

  // Render
  return `
    <div class="sticky top-0 bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between z-10 gap-2">
      <div class="text-xs font-bold uppercase text-slate-700 flex-shrink-0">🏠 Tareas por casa</div>
      <input type="text" placeholder="Buscar casa..." value="${(clState.casasSearch||'').replace(/"/g,'&quot;')}"
             oninput="clSetCasasSearch(this.value)"
             class="flex-1 max-w-xs border border-slate-300 rounded px-2 py-1 text-xs" />
      <div class="text-[10px] text-slate-500">${filtered.length} casas</div>
      <button onclick="clOpenAddCasa()" class="text-xs bg-slate-900 hover:bg-slate-700 text-white font-bold px-3 py-1 rounded">+ Nueva casa</button>
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-2">
      ${filtered.map(c => {
        const tasks = byKey[c.key] || [];
        const recs = recurringByKey[c.key] || [];
        const open = tasks.filter(t => t.status !== 'done');
        const done = tasks.filter(t => t.status === 'done').length;
        const noTasks = !tasks.length && !recs.length;
        const expanded = clState.casasExpanded[c.key] !== false; // default abierto
        const colorCls = c.key === '__sin__' ? 'bg-slate-50 border-slate-300'
                        : c.key.startsWith('p:') ? clPropColor(c.key.slice(2))
                        : clPropColor(c.key.slice(2));
        return `
          <div class="border ${colorCls} rounded-lg overflow-hidden">
            <div class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/50"
                 onclick="clToggleCasaExpand('${c.key}')">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span class="text-lg">${c.kind}</span>
                <div class="min-w-0">
                  <div class="text-sm font-bold truncate">${c.name}</div>
                  ${c.addr && c.addr !== c.name ? `<div class="text-[10px] text-slate-500 truncate">${c.addr}</div>` : ''}
                </div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                ${open.length ? `<span class="bg-amber-200 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded">${open.length} abiertas</span>` : ''}
                ${done ? `<span class="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-1.5 py-0.5 rounded">${done} hechas</span>` : ''}
                ${recs.length ? `<span class="bg-violet-200 text-violet-900 text-[10px] font-bold px-1.5 py-0.5 rounded">🔁${recs.length}</span>` : ''}
                ${noTasks ? `<span class="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded">⚠️ sin tareas</span>` : ''}
                <button onclick="event.stopPropagation(); clOpenAddLoose('${c.key === '__sin__' ? '' : c.key}')"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded">+ Tarea</button>
                ${c.key.startsWith('p:') ? `<button onclick="event.stopPropagation(); clOpenAddCasa('${c.key.slice(2)}')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-2 py-1 rounded" title="Editar casa">✏️</button>` : ''}
                <span class="text-slate-400 text-xs">${expanded ? '▼' : '▶'}</span>
              </div>
            </div>
            ${expanded ? `
              <div class="bg-white/70 border-t border-slate-200 p-2 space-y-1">
                ${tasks.length === 0 && recs.length === 0 ? `
                  <div class="text-[11px] text-slate-500 italic py-2 text-center">Sin tareas. ¿Agregar la primera?</div>
                ` : ''}
                ${tasks.sort((a,b) => {
                  if (a.status === 'done' && b.status !== 'done') return 1;
                  if (b.status === 'done' && a.status !== 'done') return -1;
                  const ad = a.date || '9999-99-99', bd = b.date || '9999-99-99';
                  if (ad !== bd) return ad.localeCompare(bd);
                  return (a.start_time || '').localeCompare(b.start_time || '');
                }).map(t => {
                  const isDone = t.status === 'done';
                  const dateLbl = t._bucket === 'backlog' ? '📥 backlog'
                                : t._bucket === 'hoy' ? '📅 hoy' + (t.start_time ? ' ' + clFmt12(t.start_time) : '')
                                : '📆 ' + (t.date || '') + (t.start_time ? ' ' + clFmt12(t.start_time) : '');
                  return `
                    <div class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 ${isDone ? 'opacity-60' : ''}">
                      <input type="checkbox" ${isDone ? 'checked' : ''} onchange="clToggleDoneFromCasas('${t.id}', this.checked)"
                             class="w-4 h-4 cursor-pointer" />
                      <div class="flex-1 min-w-0 cursor-pointer" onclick="clEditFromCasas('${t.id}', '${t._bucket}')">
                        <div class="text-xs font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'} truncate">${t.title || '(sin título)'}</div>
                        <div class="text-[10px] text-slate-500">${dateLbl} · ${t.duration_min || 0}m${t.zona ? ' · '+t.zona : ''}</div>
                      </div>
                      <button onclick="event.stopPropagation(); clEditFromCasas('${t.id}', '${t._bucket}')" class="text-[10px] text-slate-400 hover:text-slate-900" title="Editar">✏️</button>
                    </div>
                  `;
                }).join('')}
                ${recs.map(r => {
                  const base = clState.tasks.find(x => x.id === r.base_task_id);
                  return `
                    <div class="flex items-center gap-2 px-2 py-1.5 rounded bg-violet-50 border border-violet-200">
                      <span class="text-violet-600 text-sm">🔁</span>
                      <div class="flex-1 min-w-0">
                        <div class="text-xs font-semibold text-violet-900 truncate">${r.custom_title || base?.name || '(recurrente)'}</div>
                        <div class="text-[10px] text-violet-600">Cada ${r.interval_days}d · próx ${r.next_due || '?'}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
      ${filtered.length === 0 ? `<div class="text-center text-sm text-slate-500 py-10">Ninguna casa coincide con "${(clState.casasSearch||'').replace(/</g,'&lt;')}"</div>` : ''}
    </div>
  `;
}
function clSetCasasSearch(v) {
  clState.casasSearch = v;
  // DEBOUNCE: re-render solo después de 250ms sin teclear — evita lag en 30+ casas.
  if (clState._casasSearchTimer) clearTimeout(clState._casasSearchTimer);
  clState._casasSearchTimer = setTimeout(() => {
    clRender();
    // Re-focus al input
    const inp = document.querySelector('input[oninput^="clSetCasasSearch"]');
    if (inp) { inp.focus(); inp.setSelectionRange(v.length, v.length); }
  }, 250);
}
function clToggleCasaExpand(key) {
  clState.casasExpanded[key] = !(clState.casasExpanded[key] !== false);
  clRender();
}
function clToggleOverdueDetails() {
  clState.showOverdueDetails = !clState.showOverdueDetails;
  clRender();
}
async function clToggleDoneFromCasas(id, isDone) {
  await clMarkDone(id, isDone);
  await clLoadAll();
  clRender();
}

// Núcleo: marca done/planned, captura tiempo real, ajusta default del template.
async function clMarkDone(id, isDone) {
  // Busca en cualquier bucket cargado (día, semana, backlog, upcoming, overdue)
  const buckets = [clState.dayTasks, clState.weekTasks, clState.backlog, clState.allUpcoming, clState.overdue];
  let t = null;
  for (const b of buckets) { if (!b) continue; t = b.find(x => x.id === id); if (t) break; }
  const now = new Date().toISOString();
  if (isDone) {
    // Calcular actual_duration_min si tenemos started_at y hoy es la fecha planeada
    let started = t && t.started_at;
    if (!started) started = t && t.date && t.start_time ? new Date(t.date + 'T' + t.start_time).toISOString() : null;
    let actual = t && t.actual_duration_min;
    if (started && !actual) {
      const ms = new Date(now) - new Date(started);
      const mins = Math.max(1, Math.round(ms / 60000));
      actual = mins;
    }
    // Pedir feedback rápido si no hay actual o si difiere >30%
    let fb = null;
    if (t && t.task_id) {
      const planned = t.duration_min || 0;
      if (!actual) {
        // sin started: pedir tiempo manualmente
        const ans = prompt(`¿Cuánto te tomó realmente "${t.title}"? (minutos, planeado: ${planned})`, planned);
        if (ans && !isNaN(+ans)) actual = Math.max(1, Math.round(+ans));
      }
      if (actual && planned) {
        const ratio = actual / planned;
        if (ratio < 0.7) fb = 'short';
        else if (ratio > 1.3) fb = 'long';
        else fb = 'ok';
      }
    }
    await sb.from('clean_day_tasks').update({
      status: 'done',
      completed_at: now,
      started_at: t && t.started_at ? t.started_at : (t && t.date && t.start_time ? new Date(t.date+'T'+t.start_time).toISOString() : now),
      actual_duration_min: actual || null,
      duration_feedback: fb,
      updated_at: now
    }).eq('id', id);
    // Ajustar default del template (promedio rodante via RPC)
    if (t && t.task_id && actual) {
      await sb.rpc('fn_ops_register_actual', { p_task_id: t.task_id, p_actual: actual }).catch(() => {});
    }
  } else {
    await sb.from('clean_day_tasks').update({
      status: 'planned',
      completed_at: null,
      updated_at: now
    }).eq('id', id);
  }
}
// ─── Crear/editar casa desde Ops Planner ───
function clOpenAddCasa(propId) {
  const isEdit = !!propId;
  const p = isEdit ? clState.properties.find(x => x.id === propId) : {};
  const v = k => (p && p[k] != null ? String(p[k]).replace(/"/g,'&quot;') : '');
  const sel = (k, val) => (p && p[k] === val ? 'selected' : '');
  const html = `
    <div class="space-y-3">
      <div class="text-xs text-slate-500">${isEdit ? 'Editar propiedad existente.' : 'Crea una propiedad para asignarle tareas. La verás de inmediato en la vista "Por casa".'}</div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Dirección *</label>
        <input id="op-casa-address" value="${v('address')}" placeholder="Ej. 5320 Wellington Dr, Austin TX" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Apodo (corto, opcional)</label>
          <input id="op-casa-nickname" value="${v('nickname')}" placeholder="Ej. Wellington" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tipo</label>
          <select id="op-casa-type" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            <option value="rental" ${sel('property_type','rental')}>🏠 Renta</option>
            <option value="flip" ${sel('property_type','flip')}>🔄 Fix & Flip</option>
            <option value="own" ${sel('property_type','own')}>🏡 Propia</option>
            <option value="airbnb" ${sel('property_type','airbnb')}>🛏️ Airbnb / Mid-term</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">City</label>
          <input id="op-casa-city" value="${v('city') || 'Austin'}" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">State</label>
          <input id="op-casa-state" value="${v('state') || 'TX'}" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">ZIP</label>
          <input id="op-casa-zip" value="${v('zip')}" placeholder="78745" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Notas</label>
        <textarea id="op-casa-notes" rows="2" placeholder="Detalles, observaciones..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm">${v('notes')}</textarea>
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="clRefocusPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${isEdit ? `<button onclick="clDeleteCasa('${propId}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold py-2 px-4 rounded" title="Eliminar casa (no se eliminan tareas)">🗑️</button>` : ''}
        <button onclick="clSaveCasa('${propId || ''}')" class="flex-1 ${isEdit?'bg-blue-600 hover:bg-blue-700':'bg-emerald-600 hover:bg-emerald-700'} text-white text-sm font-bold py-2 rounded">${isEdit ? '💾 Guardar cambios' : '+ Crear casa'}</button>
      </div>
    </div>
  `;
  clOpenSubmodal(isEdit ? '✏️ Editar casa' : '+ Nueva casa', html);
}

async function clSaveCasa(propId) {
  const address = document.getElementById('op-casa-address').value.trim();
  if (!address) return alert('La dirección es obligatoria');
  const payload = {
    address,
    nickname: document.getElementById('op-casa-nickname').value.trim() || null,
    property_type: document.getElementById('op-casa-type').value,
    city: document.getElementById('op-casa-city').value.trim() || 'Austin',
    state: document.getElementById('op-casa-state').value.trim() || 'TX',
    zip: document.getElementById('op-casa-zip').value.trim() || null,
    notes: document.getElementById('op-casa-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };

  let error;
  if (propId) {
    ({ error } = await sb.from('properties').update(payload).eq('id', propId));
  } else {
    payload.user_id = state.user.id;
    payload.status = 'evaluating';
    ({ error } = await sb.from('properties').insert(payload));
  }
  if (error) {
    if (error.message.includes('nickname') || error.message.includes('property_type')) {
      return alert('Falta correr la migración SQL. Pegá en Supabase SQL Editor:\n\nalter table public.properties add column if not exists nickname text;\nalter table public.properties add column if not exists property_type text;');
    }
    return alert('Error al guardar: ' + error.message);
  }
  clState.view = 'casas';
  await clRefocusPlanner();
}

async function clDeleteCasa(propId) {
  if (!confirm('¿Eliminar esta casa?\n\nLas tareas asignadas a ella NO se eliminan — quedan como "Sin casa".')) return;
  const { error } = await sb.from('properties').delete().eq('id', propId);
  if (error) return alert('Error: ' + error.message);
  clState.view = 'casas';
  await clRefocusPlanner();
}

function clEditFromCasas(id, bucket) {
  // Buscar la tarea en backlog o upcoming
  const t = (bucket === 'backlog'
    ? clState.backlog.find(x => x.id === id)
    : clState.allUpcoming.find(x => x.id === id) || clState.dayTasks.find(x => x.id === id));
  if (!t) return;
  _opOpenEditModal(t, bucket === 'backlog');
}

// ═══════════════════════════════════════════════════════════════════
// UX HELPERS — toast, share-to-WhatsApp, debounce search
// ═══════════════════════════════════════════════════════════════════

// Toast no bloqueante (no usa alert) — feedback para guardados, errores, etc.
function clToast(msg, type = 'info') {
  const existing = document.getElementById('cl-toast');
  if (existing) existing.remove();
  const colors = {
    info:    'bg-slate-900 text-white',
    success: 'bg-emerald-600 text-white',
    error:   'bg-red-600 text-white',
    warn:    'bg-amber-500 text-slate-900'
  };
  const el = document.createElement('div');
  el.id = 'cl-toast';
  el.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] ${colors[type] || colors.info} px-4 py-2 rounded-full text-sm font-bold shadow-2xl transition-opacity`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; }, 2200);
  setTimeout(() => { el.remove(); }, 2700);
}
window.clToast = clToast;

// Loading overlay durante operaciones largas (drag drop guardar, armar día, etc)
function clShowLoading(msg = 'Guardando…') {
  let el = document.getElementById('cl-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cl-loading';
    el.className = 'fixed inset-0 z-[9998] bg-slate-900/30 flex items-center justify-center pointer-events-auto';
    el.innerHTML = `
      <div class="bg-white rounded-xl px-5 py-4 shadow-2xl flex items-center gap-3">
        <div class="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
        <div class="text-sm font-bold text-slate-900" id="cl-loading-msg">${msg}</div>
      </div>`;
    document.body.appendChild(el);
  } else {
    document.getElementById('cl-loading-msg').textContent = msg;
    el.style.display = 'flex';
  }
}
function clHideLoading() {
  const el = document.getElementById('cl-loading');
  if (el) el.remove();
}
window.clShowLoading = clShowLoading;
window.clHideLoading = clHideLoading;

// ═══════════════════════════════════════════════════════════════════
// 📱 COPIAR CRONOGRAMA PARA WHATSAPP
// Genera texto formateado del día actual (o semana) para mandar al equipo.
// ═══════════════════════════════════════════════════════════════════
function clCopyForWhatsApp(scope = 'day') {
  const tasks = scope === 'week' ? clState.weekTasks : clState.dayTasks;
  if (!tasks?.length) {
    return clToast(`Sin tareas para ${scope === 'week' ? 'esta semana' : 'este día'}`, 'warn');
  }

  const dateLabel = (d) => new Date(d + 'T00:00:00').toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' }).toUpperCase();
  const fmtTime = (t) => (t || '').substring(0, 5);
  const fmtDur = (m) => {
    if (m >= 60) return `${Math.floor(m/60)}h${m%60 ? (m%60+'m') : ''}`;
    return `${m}m`;
  };
  const propName = (t) => {
    if (t.property_id) {
      const p = clState.properties.find(x => x.id === t.property_id);
      return p?.nickname || p?.address || '';
    }
    if (t.project_id) {
      const p = clState.projects.find(x => x.id === t.project_id);
      return p?.name || p?.address || '';
    }
    return '';
  };

  // Agrupar por fecha
  const byDate = {};
  tasks.forEach(t => {
    const k = t.date || 'sin-fecha';
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(t);
  });

  const lines = [];
  lines.push(`🧽 *CRONOGRAMA LIMPIEZA*`);
  lines.push(`${scope === 'week' ? '📅 Semana' : '📆 Día'} · ${tasks.length} tareas\n`);

  Object.keys(byDate).sort().forEach(d => {
    if (d !== 'sin-fecha') lines.push(`*${dateLabel(d)}*`);
    const dayTasks = [...byDate[d]].sort((a,b) => (a.start_time||'').localeCompare(b.start_time||''));

    // Agrupar por zona dentro del día
    const byZona = {};
    dayTasks.forEach(t => {
      const z = t.zona || 'Sin zona';
      if (!byZona[z]) byZona[z] = [];
      byZona[z].push(t);
    });

    Object.keys(byZona).forEach(z => {
      lines.push(`\n📍 *Zona ${z}*`);
      byZona[z].forEach((t, i) => {
        const time = t.start_time ? `🕐 ${fmtTime(t.start_time)}` : '⏱';
        const dur = fmtDur(t.duration_min || 30);
        const prop = propName(t);
        const propLine = prop ? `\n  🏠 ${prop}` : '';
        const status = t.status === 'done' ? '✅ ' : (t.status === 'in_progress' ? '🔄 ' : '');
        lines.push(`\n${i+1}. ${status}${time} · ${t.title} (${dur})${propLine}`);
        if (t.materials?.length) {
          lines.push(`  🧰 ${t.materials.slice(0, 5).join(', ')}${t.materials.length > 5 ? '…' : ''}`);
        }
        if (t.notes) {
          lines.push(`  📝 ${t.notes.split('\n')[0].slice(0, 100)}${t.notes.length > 100 ? '…' : ''}`);
        }
      });
    });
    lines.push('');
  });

  const text = lines.join('\n').trim();

  // Copiar al portapapeles + ofrecer abrir WhatsApp Web con el texto
  navigator.clipboard?.writeText(text).then(() => {
    clToast('📋 Cronograma copiado al portapapeles', 'success');
    // Después de 1s, ofrecer abrir WhatsApp
    setTimeout(() => {
      if (confirm('✅ Texto copiado al portapapeles.\n\n¿Abrir WhatsApp Web para pegar al equipo?')) {
        window.open('https://web.whatsapp.com/', '_blank');
      }
    }, 800);
  }).catch(() => {
    // Fallback: mostrar el texto en un textarea para copiar manual
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[9999] bg-slate-900/70 flex items-center justify-center p-4';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
      <div class="bg-white rounded-xl p-4 max-w-2xl w-full" onclick="event.stopPropagation()">
        <div class="font-bold mb-2">📱 Copiá este cronograma para WhatsApp</div>
        <textarea class="w-full h-80 border border-slate-300 rounded p-2 font-mono text-xs">${text.replace(/</g,'&lt;')}</textarea>
        <button onclick="this.parentElement.parentElement.remove()" class="mt-2 bg-slate-900 text-white px-3 py-1.5 rounded text-sm font-bold">Cerrar</button>
      </div>`;
    document.body.appendChild(overlay);
  });
}
window.clCopyForWhatsApp = clCopyForWhatsApp;

// Debounce wrapper genérico
function clDebounce(fn, ms = 250) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ─── Navegación / filtros ───
function clNav(delta) {
  const step = clState.view === 'week' ? 7 : 1;
  if (delta === 0) clState.date = clDateOnly(new Date());
  else { const d = new Date(clState.date + 'T00:00:00'); d.setDate(d.getDate() + delta*step); clState.date = clDateOnly(d); }
  clLoadAll().then(clRender);
}
function clSetView(v) {
  clState.view = v;
  clLoadAll().then(clRender);
}
function clNavDay(delta) { clNav(delta); } // alias retrocompat
function clGoToDate(v) { if (!v) return; clState.date = v; clLoadAll().then(clRender); }
function clSetZonaFilter(z) { clState.zonaFilter = z; clRender(); }
function clSetBacklogZona(z) { clState.backlogZonaFilter = z; clRender(); }
function clSetLibFilter(b) { clState.libBusinessFilter = b; clRender(); }
function clSetLeftTab(t) { clState.leftTab = t; clRender(); }

// ─── Drag & drop ───
function clBacklogDragStart(id) { clState.draggedBacklogId = id; clState.draggedTemplateId = null; clState.draggedScheduledId = null; }
function clTemplateDragStart(id) { clState.draggedTemplateId = id; clState.draggedBacklogId = null; clState.draggedScheduledId = null; }
function clSchedDragStart(id) { clState.draggedScheduledId = id; clState.draggedBacklogId = null; clState.draggedTemplateId = null; }

async function clDropOnSlot(slotTime, ev) {
  ev.preventDefault();
  // Guard contra doble-trigger del drop
  if (clState._dropping) return;
  clState._dropping = true;
  let droppedId = null;
  let droppedTask = null;

  if (clState.draggedScheduledId) {
    const id = clState.draggedScheduledId; clState.draggedScheduledId = null;
    droppedId = id;
    droppedTask = clState.dayTasks.find(x => x.id === id);
  } else if (clState.draggedBacklogId) {
    const id = clState.draggedBacklogId; clState.draggedBacklogId = null;
    droppedId = id;
    droppedTask = clState.backlog.find(x => x.id === id);
  } else if (clState.draggedTemplateId) {
    const tmpl = clState.tasks.find(x => x.id === clState.draggedTemplateId);
    clState.draggedTemplateId = null;
    if (!tmpl) { clState._dropping = false; return; }
    droppedTask = { duration_min: tmpl.default_duration_min || 30, travel_min: 0, title: tmpl.name };
  } else { clState._dropping = false; return; }

  // Detectar conflicto si el drop pone la tarea sobre otra
  const dur = droppedTask?.duration_min || 30;
  const travel = droppedTask?.travel_min || 0;
  const newStartMin = clTimeToMin(slotTime);
  const newEndMin = newStartMin + dur + travel;
  const conflicts = clState.dayTasks
    .filter(t => t.id !== droppedId && t.date === clState.date && t.start_time)
    .filter(t => {
      const tStart = clTimeToMin(t.start_time);
      const tEnd = tStart + (t.duration_min||0) + (t.travel_min||0);
      return tStart < newEndMin && tEnd > newStartMin;
    });

  let resolution = 'overlap'; // default si no hay conflicto
  if (conflicts.length > 0) {
    conflicts.sort((a,b) => clTimeToMin(a.start_time) - clTimeToMin(b.start_time));
    const overlapMin = newEndMin - clTimeToMin(conflicts[0].start_time);
    resolution = await clAskConflictResolution(
      { start_time: slotTime, duration_min: dur, travel_min: travel },
      droppedTask || { title: 'Nueva tarea', duration_min: dur },
      conflicts,
      overlapMin
    );
    if (resolution === 'cancel') { clState._dropping = false; return; }
    if (resolution === 'shift') {
      await clShiftTasksAfter(clState.date, newStartMin, overlapMin, droppedId ? [droppedId] : []);
    }
  }

  // Aplicar el drop ahora que el conflicto está resuelto
  let opError = null;
  if (droppedId) {
    // Reschedule existing task (scheduled or backlog)
    const { error } = await sb.from('clean_day_tasks').update({
      date: clState.date,
      start_time: slotTime,
      updated_at: new Date().toISOString()
    }).eq('id', droppedId);
    opError = error;
  } else {
    // Nueva tarea desde plantilla
    const tmpl = clState.tasks.find(x => x.name === droppedTask.title);
    if (tmpl) {
      const { error } = await sb.from('clean_day_tasks').insert({
        date: clState.date, start_time: slotTime,
        duration_min: tmpl.default_duration_min || 30,
        title: tmpl.name, task_id: tmpl.id, business: tmpl.business,
        materials: tmpl.default_materials || [],
        checklist: (tmpl.default_checklist || []).map(item => ({ item, done: false })),
        created_by: state.user?.id || null
      });
      opError = error;
    }
  }
  // FIX CRÍTICO: si falla la persistencia, avisar al usuario en lugar de
  // re-render silencioso que da falsa sensación de éxito.
  if (opError) {
    clState._dropping = false;
    const msg = opError.message || String(opError);
    if (/does not exist|relation/i.test(msg)) {
      clState.tablesError = msg;
      clRender();
      alert('❌ No se guardó la tarea\n\nLas tablas del Cronograma Limpieza NO existen en Supabase todavía.\n\nAndá a Supabase → SQL Editor y pegá el contenido de:\nsupabase/cleaning-planner-schema.sql\n\nDespués recargá la página.');
    } else {
      alert('❌ Error al guardar la tarea:\n\n' + msg);
    }
    return;
  }
  await clLoadAll();
  clRender();
  clState._dropping = false;
  clToast('✓ Tarea agendada', 'success');
}

// ─── + Pendiente (al backlog) ───
function clOpenAddPendiente() {
  const noProps = clState.properties.length === 0 && clState.projects.length === 0;
  const propsOpts = clState.properties.map(p => `<option value="prop:${p.id}">🏠 ${p.nickname || p.address}</option>`).join('');
  const projsOpts = clState.projects.map(p => `<option value="proj:${p.id}">🏗️ ${p.name || p.address}</option>`).join('');
  const tmplOpts = clState.tasks.map(t => `<option value="${t.id}" data-dur="${t.default_duration_min}" data-mats='${JSON.stringify(t.default_materials||[])}' data-emoji="${t.emoji}">${t.emoji} ${t.name}</option>`).join('');
  const html = `
    <div class="space-y-3">
      <div class="text-xs text-slate-500">Crea una tarea que se acumula en el backlog. Luego la arrastrás al horario cuando armes el día, o usás 🎯 Armar día.</div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Plantilla (opcional, autocompleta)</label>
        <select id="op-p-template" onchange="clPendienteFromTemplate(this)" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
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
            ${CL_ZONAS.map(z => `<option value="${z}">${z}</option>`).join('')}
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
        ${noProps ? `
          <div class="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-900">
            ⚠️ No hay casas cargadas. Andá al área Rentas → Propiedades para crear, o corré el seed SQL si todavía no lo hiciste.
            <button onclick="clLoadAll().then(clRefocusPlanner)" class="ml-2 text-amber-700 underline font-bold">🔄 Reintentar carga</button>
          </div>` : `
          <select id="op-p-target" onchange="clPendientePickTarget(this)" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            <option value="">— ninguna —</option>
            ${propsOpts ? `<optgroup label="🏠 Rentas (${clState.properties.length})">${propsOpts}</optgroup>` : ''}
            ${projsOpts ? `<optgroup label="🏗️ Obras (${clState.projects.length})">${projsOpts}</optgroup>` : ''}
          </select>
          <div class="text-[10px] text-slate-500 mt-1">${clState.properties.length} rentas + ${clState.projects.length} obras disponibles</div>`}
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Materiales (coma)</label>
        <input id="op-p-materials" placeholder="taladro, brochas..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Notas</label>
        <textarea id="op-p-notes" rows="2" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"></textarea>
      </div>
      <div class="sticky bottom-0 -mx-6 px-6 -mb-6 pb-3 pt-3 bg-white border-t-2 border-slate-200 flex gap-2">
        <button onclick="clRefocusPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-3 rounded font-bold">← Volver al calendario</button>
        <button onclick="clCreatePendiente()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded">💾 Guardar al backlog</button>
      </div>
    </div>
  `;
  clOpenSubmodal('+ Pendiente al backlog', html);
}

function clPendienteFromTemplate(sel) {
  const opt = sel.selectedOptions[0];
  if (!opt || !opt.value) return;
  document.getElementById('op-p-title').value = opt.text.replace(/^[^\s]+\s/, ''); // sin emoji
  document.getElementById('op-p-dur').value = opt.dataset.dur || 30;
  try {
    const mats = JSON.parse(opt.dataset.mats || '[]');
    document.getElementById('op-p-materials').value = mats.join(', ');
  } catch {}
}
function clPendientePickTarget(sel) {
  // si el target tiene zona conocida, no la cambiamos (no la tenemos en properties por ahora)
}

async function clCreatePendiente() {
  const title = document.getElementById('op-p-title').value.trim();
  if (!title) return alert('Pon un título');
  const target = document.getElementById('op-p-target').value || '';
  const property_id = target.startsWith('prop:') ? target.slice(5) : null;
  const project_id = target.startsWith('proj:') ? target.slice(5) : null;
  const tmplId = document.getElementById('op-p-template').value || null;
  const tmpl = tmplId ? clState.tasks.find(x => x.id === tmplId) : null;
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
    created_by: state.user?.id || null
  };
  const { error } = await sb.from('clean_day_tasks').insert(payload);
  if (error) return alert(error.message);
  closeModal();
  await clRefocusPlanner();
}

// ─── 🎯 Armar día por zona ───
function clOpenArmarDia() {
  const counts = {};
  clState.backlog.forEach(t => { const z = t.zona || '∅'; counts[z] = (counts[z]||0)+1; });
  const zonaOpts = CL_ZONAS.map(z => `<option value="${z}">${z} (${counts[z]||0} pendientes)</option>`).join('');
  const html = `
    <div class="space-y-3">
      <div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-900">
        🎯 <strong>Armar día por zona</strong> toma TODOS los pendientes del backlog de la zona seleccionada y los agenda en este día.
        <ul class="mt-2 list-disc list-inside text-[11px] space-y-0.5">
          <li>Agrupa por casa (todas las tareas de una casa van juntas, sin viajes en medio)</li>
          <li>Ordena casas por antigüedad de pendiente (la más vieja primero)</li>
          <li>Inserta ${CL_TRAVEL_BETWEEN_HOUSES} min de viaje entre casas distintas</li>
          <li>Las tareas no completadas vuelven solas al backlog al día siguiente</li>
        </ul>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Zona</label>
          <select id="op-ar-zona" class="w-full border border-slate-300 rounded px-2 py-2 text-sm font-bold">
            ${zonaOpts}
            <option value="∅">Sin zona asignada (${counts['∅']||0})</option>
            <option value="all">Todas las pendientes (${clState.backlog.length})</option>
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
          <input id="op-ar-travel" type="number" value="${CL_TRAVEL_BETWEEN_HOUSES}" min="0" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" title="Minutos entre casas de la misma zona" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Viaje cruzar zona</label>
          <input id="op-ar-travel-cross" type="number" value="${CL_TRAVEL_BETWEEN_HOUSES * 2}" min="0" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" title="S6-U6: minutos extra al cambiar de zona (Norte → Sur)" />
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
      <div class="sticky bottom-0 -mx-6 px-6 -mb-6 pb-3 pt-3 bg-white border-t-2 border-slate-200 flex gap-2">
        <button onclick="clRefocusPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-3 rounded font-bold">← Volver al calendario</button>
        <button onclick="clEjecutarArmarDia()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded">🎯 Armar el día</button>
      </div>
    </div>
  `;
  clOpenSubmodal(`🎯 Armar día — ${clFmtDate(clState.date)}`, html);
}

async function clEjecutarArmarDia() {
  const zona = document.getElementById('op-ar-zona').value;
  const startTime = document.getElementById('op-ar-start').value || '08:00';
  const travelSame = +document.getElementById('op-ar-travel').value || 0;
  const travelCross = +(document.getElementById('op-ar-travel-cross')?.value || travelSame * 2) || travelSame;
  const lunchTime = document.getElementById('op-ar-lunch').value || '12:00';
  const lunchDur = +document.getElementById('op-ar-lunch-dur').value || 0;

  // Filtrar backlog
  let cand = clState.backlog;
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
  let cursor = clTimeToMin(startTime);
  const lunchAt = clTimeToMin(lunchTime);
  let lunchPlaced = lunchDur === 0;
  const updates = [];
  let lastZona = null;
  let crossZoneCount = 0;
  let sameZoneCount = 0;

  propOrder.forEach(([propKey, info], idx) => {
    // BUG FIX: capturar isCross ANTES de actualizar lastZona, sino siempre evalúa false
    // y todas las tareas de cruce de zona guardaban travel_min = travelSame.
    const isCross = idx > 0 && info.zona && lastZona && info.zona !== lastZona;
    if (idx > 0) {
      const travelHere = isCross ? travelCross : travelSame;
      cursor += travelHere;
      if (isCross) crossZoneCount++; else sameZoneCount++;
    }

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
        date: clState.date,
        start_time: clMinToTime(cursor),
        travel_min: isFirstOfDay ? 0 : (isFirstOfHouse ? (isCross ? travelCross : travelSame) : 0)
      });
      cursor += dur;
    });

    lastZona = info.zona;  // Mover al final para que se use en la próxima iteración
  });

  // Ejecutar actualizaciones
  for (const u of updates) {
    await sb.from('clean_day_tasks').update({
      date: u.date,
      start_time: u.start_time,
      travel_min: u.travel_min,
      updated_at: new Date().toISOString()
    }).eq('id', u.id);
  }

  // Insertar almuerzo si corresponde
  if (lunchDur > 0) {
    await sb.from('clean_day_tasks').insert({
      date: clState.date, start_time: lunchTime, duration_min: lunchDur,
      title: 'Tiempo Almuerzo', business: 'both', zona: null,
      created_by: state.user?.id || null
    });
  }

  closeModal();
  await clLoadAll();
  clRender();
  const zonas = Array.from(new Set(propOrder.map(([_,info]) => info.zona).filter(Boolean)));
  alert(`✅ Día armado: ${updates.length} tareas, ${propOrder.length} casas across ${zonas.length} zona(s) (${zonas.join(', ') || 'sin zona'}), hasta ${clFmt12(clMinToTime(cursor))}.\n\n🚗 Viajes: ${sameZoneCount} intra-zona, ${crossZoneCount} inter-zona.\n\nPodés re-arrastrar lo que quieras manualmente.`);
}

// ─── Editar pendiente del backlog ───
function clEditBacklog(id) {
  const t = clState.backlog.find(x => x.id === id);
  if (!t) return;
  _opOpenEditModal(t, true);
}
function clEditScheduled(id) {
  const t = clState.dayTasks.find(x => x.id === id);
  if (!t) return;
  _opOpenEditModal(t, false);
}
function _opOpenEditModal(t, isBacklog) {
  const propsOpts = clState.properties.map(p => `<option value="prop:${p.id}" ${t.property_id===p.id?'selected':''}>🏠 ${p.nickname || p.address}</option>`).join('');
  const projsOpts = clState.projects.map(p => `<option value="proj:${p.id}" ${t.project_id===p.id?'selected':''}>🏗️ ${p.name || p.address}</option>`).join('');
  const targetVal = t.property_id ? 'prop:'+t.property_id : t.project_id ? 'proj:'+t.project_id : '';
  const html = `
    <div class="space-y-3">
      ${isBacklog ? '<div class="text-xs bg-amber-50 border border-amber-200 rounded p-2">📥 Esta tarea está en el <strong>backlog</strong> (sin fecha). Arrastrala a un slot del horario para agendarla.</div>' : ''}
      <input id="op-e-title" value="${(t.title||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />
      ${!isBacklog ? `
        <div class="grid grid-cols-4 gap-2">
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Inicio</label>
            <input id="op-e-start" type="time" value="${(t.start_time||'').substring(0,5)}" oninput="clSyncTimesEdit()" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Duración (min)</label>
            <input id="op-e-dur" type="number" value="${t.duration_min}" min="5" step="5" oninput="clSyncTimesEdit()" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-emerald-600 mb-1">Cierre · auto</label>
            <input id="op-e-end" type="time" value="${clAddMin((t.start_time||'08:00').substring(0,5), t.duration_min||30)}" readonly class="w-full border border-emerald-300 bg-emerald-50 rounded px-2 py-2 text-sm font-bold text-emerald-700 cursor-not-allowed" title="Se calcula desde inicio + duración" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Viaje (min)</label>
            <input id="op-e-travel" type="number" value="${t.travel_min||0}" min="0" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" title="Se suma al total del día" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Status</label>
            <select id="op-e-status" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
              ${['planned','in_progress','done','skipped'].map(s => `<option value="${s}" ${t.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Prioridad</label>
            <select id="op-e-priority" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
              ${['low','normal','high','urgent'].map(p => `<option value="${p}" ${t.priority===p?'selected':''}>${p}</option>`).join('')}
            </select>
          </div>
        </div>
      ` : `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Duración (min)</label>
            <input id="op-e-dur" type="number" value="${t.duration_min}" min="5" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Prioridad</label>
            <select id="op-e-priority" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
              ${['low','normal','high','urgent'].map(p => `<option value="${p}" ${t.priority===p?'selected':''}>${p}</option>`).join('')}
            </select>
          </div>
        </div>
      `}
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
            ${CL_ZONAS.map(z => `<option value="${z}" ${t.zona===z?'selected':''}>${z}</option>`).join('')}
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

      <!-- 🔁 Sección recurrencia (collapsible) -->
      <details ${t.recurring_id ? 'open' : ''} class="bg-violet-50 border border-violet-200 rounded-lg">
        <summary class="px-3 py-2 cursor-pointer text-xs font-bold text-violet-900 flex items-center justify-between">
          <span>🔁 ${t.recurring_id ? 'Esta tarea ES recurrente' : 'Convertir en recurrente'}</span>
          <span class="text-[10px] font-normal text-violet-700">${t.recurring_id ? '(click para editar)' : '(click para configurar)'}</span>
        </summary>
        <div class="p-3 border-t border-violet-200 space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="op-e-recurring-toggle" ${t.recurring_id ? 'checked' : ''} onchange="clToggleRecurringFields(this.checked)" class="w-4 h-4" />
            <span class="text-xs font-bold text-violet-900">Es tarea recurrente</span>
          </label>
          <div id="op-e-recurring-fields" class="${t.recurring_id ? '' : 'hidden'} grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] font-bold uppercase text-violet-700 mb-1">Repetir cada (días)</label>
              <input id="op-e-recurring-interval" type="number" value="${(() => { const r = (clState.recurring||[]).find(x => x.id === t.recurring_id); return r?.interval_days || 7; })()}" min="1" max="365" class="w-full border border-violet-300 rounded px-2 py-2 text-sm" />
              <div class="text-[9px] text-violet-600 mt-0.5">1=diaria · 7=sem · 14=quinc · 30=mens</div>
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase text-violet-700 mb-1">Próxima fecha</label>
              <input id="op-e-recurring-next" type="date" value="${(() => { const r = (clState.recurring||[]).find(x => x.id === t.recurring_id); return r?.next_due || clDateOnly(new Date()); })()}" class="w-full border border-violet-300 rounded px-2 py-2 text-sm" />
            </div>
          </div>
          ${t.recurring_id ? `<div class="text-[10px] text-violet-700 italic">Si destildás "Es tarea recurrente" y guardás, se DESACTIVA la recurrencia (esta instancia queda).</div>` : ''}
        </div>
      </details>

      <div class="sticky bottom-0 -mx-6 px-6 -mb-6 pb-3 pt-3 bg-white border-t-2 border-slate-200 flex gap-2 flex-wrap">
        ${!isBacklog ? `<button onclick="clSendToBacklog('${t.id}', true)" class="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-sm py-3 rounded font-bold" title="Quitar fecha y mandar al backlog">↩ Backlog</button>` : ''}
        <button onclick="clDeleteScheduled('${t.id}', true)" class="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-3 rounded font-bold" title="Eliminar la tarea">🗑️ Borrar</button>
        <button onclick="clRefocusPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-3 rounded font-bold">← Volver</button>
        <button onclick="clSaveEdit('${t.id}', ${isBacklog})" class="flex-[2_1_0] bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded">💾 Guardar cambios</button>
      </div>
    </div>
  `;
  clOpenSubmodal(isBacklog ? `✏️ Editar pendiente` : `✏️ Editar tarea agendada`, html);
}

async function clSaveEdit(id, isBacklog) {
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

  // ─── Detección de conflictos de horario ───
  // Si cambiaron start_time o duration_min y hay overlap con tareas posteriores,
  // preguntar al usuario: correr todas / sobreponer / cancelar
  if (!isBacklog && payload.start_time) {
    const currentTask = clState.dayTasks.find(x => x.id === id);
    if (currentTask) {
      const newStartMin = clTimeToMin(payload.start_time);
      const newEndMin = newStartMin + payload.duration_min + (payload.travel_min || 0);
      // Buscar overlap con cualquier otra tarea del día
      const conflicts = clState.dayTasks
        .filter(t => t.id !== id && t.date === currentTask.date && t.start_time)
        .filter(t => {
          const tStart = clTimeToMin(t.start_time);
          const tEnd = tStart + (t.duration_min||0) + (t.travel_min||0);
          return tStart < newEndMin && tEnd > newStartMin; // overlap real
        });
      if (conflicts.length > 0) {
        // Ordenar conflictos por start_time
        conflicts.sort((a,b) => clTimeToMin(a.start_time) - clTimeToMin(b.start_time));
        const firstConflict = conflicts[0];
        const overlapMin = newEndMin - clTimeToMin(firstConflict.start_time);
        const choice = await clAskConflictResolution(payload, currentTask, conflicts, overlapMin);
        if (choice === 'cancel') return;
        if (choice === 'shift') {
          // Aplicar shift cascada ANTES de guardar la tarea actual
          await clShiftTasksAfter(currentTask.date, clTimeToMin(payload.start_time), overlapMin, [id]);
        }
        // Si 'overlap' → seguir normal (las dejamos pisadas)
      }
    }
  }

  const { error } = await sb.from('clean_day_tasks').update(payload).eq('id', id);
  if (error) return alert(error.message);

  // Manejar la sección de recurrencia
  const recToggle = document.getElementById('op-e-recurring-toggle');
  const currentTask = clState.dayTasks.find(x => x.id === id) || clState.backlog.find(x => x.id === id);
  const wasRecurring = !!currentTask?.recurring_id;
  const wantsRecurring = recToggle?.checked || false;
  if (wantsRecurring && !wasRecurring) {
    // Crear nueva recurrencia
    const interval = +document.getElementById('op-e-recurring-interval').value || 7;
    const nextDue = document.getElementById('op-e-recurring-next').value || clDateOnly(new Date());
    const { data: rec, error: rErr } = await sb.from('clean_recurring').insert({
      base_task_id: currentTask.task_id || null,
      custom_title: payload.title,
      custom_duration_min: payload.duration_min,
      custom_materials: payload.materials,
      property_id: payload.property_id,
      project_id: payload.project_id,
      zona: payload.zona,
      business: payload.business,
      priority: payload.priority,
      interval_days: interval,
      next_due: nextDue,
      active: true,
      created_by: state.user?.id || null
    }).select().single();
    if (!rErr && rec) {
      await sb.from('clean_day_tasks').update({ recurring_id: rec.id }).eq('id', id);
    } else if (rErr) {
      alert('Aviso: tarea guardada pero la recurrencia falló: ' + rErr.message);
    }
  } else if (wantsRecurring && wasRecurring) {
    // Actualizar la recurrencia existente
    const interval = +document.getElementById('op-e-recurring-interval').value || 7;
    const nextDue = document.getElementById('op-e-recurring-next').value || clDateOnly(new Date());
    await sb.from('clean_recurring').update({
      custom_title: payload.title,
      custom_duration_min: payload.duration_min,
      custom_materials: payload.materials,
      property_id: payload.property_id,
      project_id: payload.project_id,
      zona: payload.zona,
      business: payload.business,
      priority: payload.priority,
      interval_days: interval,
      next_due: nextDue,
      updated_at: new Date().toISOString()
    }).eq('id', currentTask.recurring_id);
  } else if (!wantsRecurring && wasRecurring) {
    // Desactivar la recurrencia
    await sb.from('clean_recurring').update({ active: false }).eq('id', currentTask.recurring_id);
    await sb.from('clean_day_tasks').update({ recurring_id: null }).eq('id', id);
  }

  closeModal();
  await clRefocusPlanner();
}

function clToggleRecurringFields(checked) {
  const fields = document.getElementById('op-e-recurring-fields');
  if (fields) fields.classList.toggle('hidden', !checked);
}

async function clSendToBacklog(id, fromModal) {
  await sb.from('clean_day_tasks').update({ date: null, start_time: null, updated_at: new Date().toISOString() }).eq('id', id);
  if (fromModal) { clRefocusPlanner(); }
  else { await clLoadAll(); clRender(); }
}

async function clDeleteBacklog(id) {
  if (!confirm('¿Borrar esta pendiente?')) return;
  await sb.from('clean_day_tasks').delete().eq('id', id);
  await clLoadAll();
  clRender();
}

async function clDeleteScheduled(id, fromModal) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  await sb.from('clean_day_tasks').delete().eq('id', id);
  if (fromModal) { clRefocusPlanner(); }
  else { await clLoadAll(); clRender(); }
}

async function clToggleDone(id) {
  const t = clState.dayTasks.find(x => x.id === id);
  if (!t) return;
  await clMarkDone(id, t.status !== 'done');
  await clLoadAll();
  clRender();
}

async function clClearDay() {
  if (!confirm(`¿Vaciar el ${clState.date}?\n\nLas tareas agendadas vuelven al backlog (no se pierden).`)) return;
  const ids = clState.dayTasks.map(t => t.id);
  if (ids.length) await sb.from('clean_day_tasks').update({ date: null, start_time: null, updated_at: new Date().toISOString() }).in('id', ids);
  await clLoadAll();
  clRender();
}

// ─── Tarea libre (atajo: crea + agenda en un paso) ───
function clOpenAddLoose(presetTarget) {
  // presetTarget viene de la vista casas como 'p:uuid' o 'j:uuid'. Convertir al formato del select 'prop:'/'proj:'
  const preset = presetTarget ? (presetTarget.startsWith('p:') ? 'prop:'+presetTarget.slice(2) : presetTarget.startsWith('j:') ? 'proj:'+presetTarget.slice(2) : '') : '';
  const propsOpts = clState.properties.map(p => `<option value="prop:${p.id}" ${preset === 'prop:'+p.id ? 'selected' : ''}>🏠 ${p.nickname || p.address}</option>`).join('');
  const projsOpts = clState.projects.map(p => `<option value="proj:${p.id}" ${preset === 'proj:'+p.id ? 'selected' : ''}>🏗️ ${p.name || p.address}</option>`).join('');
  const tmplOpts = clState.tasks.map(t => `<option value="${t.id}" data-emoji="${t.emoji}" data-dur="${t.default_duration_min}" data-mats='${JSON.stringify(t.default_materials||[])}' data-checklist='${JSON.stringify(t.default_checklist||[])}'>${t.emoji} ${t.name} (${t.default_duration_min}m)</option>`).join('');
  const today = clDateOnly(new Date());

  const html = `
    <div class="space-y-3">
      <!-- Tipo: ocasional vs recurrente -->
      <div class="bg-slate-50 border border-slate-200 rounded p-2">
        <div class="text-[10px] font-bold uppercase text-slate-700 mb-1">¿Tipo de tarea?</div>
        <div class="flex gap-2">
          <label class="flex-1 cursor-pointer">
            <input type="radio" name="op-l-tipo" value="ocasional" checked onchange="clToggleTipoLoose('ocasional')" class="hidden peer" />
            <div class="peer-checked:bg-emerald-100 peer-checked:border-emerald-500 peer-checked:font-bold border border-slate-300 rounded px-2 py-1.5 text-xs text-center">📅 Ocasional (1 vez)</div>
          </label>
          <label class="flex-1 cursor-pointer">
            <input type="radio" name="op-l-tipo" value="recurrente" onchange="clToggleTipoLoose('recurrente')" class="hidden peer" />
            <div class="peer-checked:bg-violet-100 peer-checked:border-violet-500 peer-checked:font-bold border border-slate-300 rounded px-2 py-1.5 text-xs text-center">🔁 Recurrente (se repite)</div>
          </label>
        </div>
      </div>

      <!-- Plantilla (autocompleta) -->
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Plantilla (autocompleta título, duración, materiales, checklist)</label>
        <select id="op-l-template" onchange="clLooseFromTemplate(this)" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
          <option value="">— ninguna (manual) —</option>
          ${tmplOpts}
        </select>
      </div>

      <input id="op-l-title" placeholder="Título *" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />

      <!-- Tiempos: Inicio + Duración manuales · Cierre se calcula solo -->
      <div id="op-l-times-ocasional" class="grid grid-cols-4 gap-2">
        <div><label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Hora inicio</label>
          <input id="op-l-start" type="time" value="08:00" oninput="clSyncTimesLoose('start')" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" /></div>
        <div><label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Duración (min)</label>
          <input id="op-l-dur" type="number" value="30" min="5" step="5" oninput="clSyncTimesLoose('dur')" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" /></div>
        <div><label class="block text-[10px] font-bold uppercase text-emerald-600 mb-1">Hora cierre · auto</label>
          <input id="op-l-end" type="time" value="08:30" readonly class="w-full border border-emerald-300 bg-emerald-50 rounded px-2 py-2 text-sm font-bold text-emerald-700 cursor-not-allowed" title="Se calcula desde inicio + duración" /></div>
        <div><label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Viaje (min)</label>
          <input id="op-l-travel" type="number" value="0" min="0" step="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" title="Tiempo de desplazamiento — se suma al total del día" /></div>
      </div>

      <!-- Campos solo para recurrente -->
      <div id="op-l-times-recurrente" class="hidden grid grid-cols-2 gap-2">
        <div><label class="block text-[10px] font-bold uppercase text-violet-700 mb-1">Repetir cada (días)</label>
          <input id="op-l-interval" type="number" value="14" min="1" class="w-full border border-violet-300 rounded px-2 py-2 text-sm" /></div>
        <div><label class="block text-[10px] font-bold uppercase text-violet-700 mb-1">Próxima fecha</label>
          <input id="op-l-next-due" type="date" value="${today}" class="w-full border border-violet-300 rounded px-2 py-2 text-sm" /></div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div><label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Zona</label>
          <select id="op-l-zona" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            <option value="">—</option>${CL_ZONAS.map(z => `<option>${z}</option>`).join('')}
          </select>
        </div>
        <div><label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Casa</label>
          <select id="op-l-target" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">
            <option value="">— sin casa —</option>
            <optgroup label="🏠 Rentas">${propsOpts}</optgroup>
            <optgroup label="🏗️ Obras">${projsOpts}</optgroup>
          </select>
        </div>
      </div>

      <input id="op-l-materials" placeholder="Materiales (coma separados)" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />

      <!-- Checklist -->
      <div class="bg-amber-50 border border-amber-200 rounded p-2">
        <label class="block text-[10px] font-bold uppercase text-amber-900 mb-1">📋 Checklist de entregables (qué tiene que hacer / verificar)</label>
        <textarea id="op-l-checklist" rows="3" placeholder="Un item por línea. Ej:&#10;Pisos trapeados&#10;Baños desinfectados&#10;Foto del resultado" class="w-full border border-amber-300 rounded px-2 py-1.5 text-xs"></textarea>
      </div>

      <textarea id="op-l-notes" rows="2" placeholder="Notas adicionales" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"></textarea>

      <div class="sticky bottom-0 -mx-6 px-6 -mb-6 pb-3 pt-3 bg-white border-t-2 border-slate-200 flex gap-2">
        <button onclick="clRefocusPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-3 rounded font-bold">← Volver al calendario</button>
        <button onclick="clCreateLoose()" id="op-l-submit" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded">+ Agendar</button>
      </div>
    </div>
  `;
  clOpenSubmodal('+ Nueva tarea', html);
}

// Pre-llena el form desde una plantilla seleccionada
function clLooseFromTemplate(sel) {
  const opt = sel.selectedOptions[0];
  if (!opt || !opt.value) return;
  // Título: del texto sin emoji
  const tmpl = clState.tasks.find(t => t.id === opt.value);
  if (!tmpl) return;
  document.getElementById('op-l-title').value = tmpl.name || '';
  document.getElementById('op-l-dur').value = tmpl.default_duration_min || 30;
  clSyncTimesLoose('dur');
  try {
    const mats = tmpl.default_materials || [];
    document.getElementById('op-l-materials').value = mats.join(', ');
    const cl = tmpl.default_checklist || [];
    document.getElementById('op-l-checklist').value = cl.join('\n');
  } catch {}
}

// Sincroniza start/end/dur — end siempre se calcula desde start + dur (read-only)
function clSyncTimesLoose(changed) {
  const startEl = document.getElementById('op-l-start');
  const endEl = document.getElementById('op-l-end');
  const durEl = document.getElementById('op-l-dur');
  if (!startEl || !endEl || !durEl) return;
  const startMin = clTimeToMin(startEl.value);
  const dur = +durEl.value || 0;
  endEl.value = clMinToTime(startMin + dur);
}

// Mismo sync para el modal de edit
function clSyncTimesEdit() {
  const startEl = document.getElementById('op-e-start');
  const endEl = document.getElementById('op-e-end');
  const durEl = document.getElementById('op-e-dur');
  if (!startEl || !endEl || !durEl) return;
  const startMin = clTimeToMin(startEl.value);
  const dur = +durEl.value || 0;
  endEl.value = clMinToTime(startMin + dur);
}

// Toggle entre ocasional/recurrente: oculta/muestra campos
function clToggleTipoLoose(tipo) {
  const ocas = document.getElementById('op-l-times-ocasional');
  const rec = document.getElementById('op-l-times-recurrente');
  const submit = document.getElementById('op-l-submit');
  if (tipo === 'recurrente') {
    ocas.classList.add('hidden');
    rec.classList.remove('hidden');
    submit.textContent = '🔁 Crear recurrente';
    submit.classList.remove('bg-emerald-600','hover:bg-emerald-700');
    submit.classList.add('bg-violet-600','hover:bg-violet-700');
  } else {
    ocas.classList.remove('hidden');
    rec.classList.add('hidden');
    submit.textContent = '+ Agendar';
    submit.classList.remove('bg-violet-600','hover:bg-violet-700');
    submit.classList.add('bg-emerald-600','hover:bg-emerald-700');
  }
}

async function clCreateLoose() {
  const title = document.getElementById('op-l-title').value.trim();
  if (!title) return alert('Pon un título');
  const tipo = document.querySelector('input[name="op-l-tipo"]:checked')?.value || 'ocasional';
  const target = document.getElementById('op-l-target').value || '';
  const tmplId = document.getElementById('op-l-template').value || null;
  const property_id = target.startsWith('prop:') ? target.slice(5) : null;
  const project_id = target.startsWith('proj:') ? target.slice(5) : null;
  const zona = document.getElementById('op-l-zona').value || null;
  const materials = (document.getElementById('op-l-materials').value || '').split(',').map(s => s.trim()).filter(Boolean);
  const checklistItems = (document.getElementById('op-l-checklist').value || '').split('\n').map(s => s.trim()).filter(Boolean);
  const checklist = checklistItems.map(item => ({ item, done: false }));
  const notes = document.getElementById('op-l-notes').value || null;

  if (tipo === 'recurrente') {
    // Insertar a clean_recurring — el sistema genera pendientes automáticos
    const interval_days = +document.getElementById('op-l-interval').value || 14;
    const next_due = document.getElementById('op-l-next-due').value || clDateOnly(new Date());
    const dur = +document.getElementById('op-l-dur').value || 30;
    const payload = {
      base_task_id: tmplId,
      property_id, project_id, zona,
      custom_title: title,
      custom_duration_min: dur,
      custom_materials: materials,
      interval_days, next_due,
      business: project_id ? 'remodelacion' : 'rentas',
      active: true
    };
    const { error } = await sb.from('clean_recurring').insert(payload);
    if (error) return alert('Error: ' + error.message);
  } else {
    // Ocasional: inserta a clean_day_tasks en el día activo
    const dur = +document.getElementById('op-l-dur').value || 30;
    const payload = {
      date: clState.date,
      start_time: document.getElementById('op-l-start').value || '08:00',
      duration_min: dur,
      travel_min: +document.getElementById('op-l-travel').value || 0,
      title, task_id: tmplId, zona, property_id, project_id, materials, checklist, notes,
      business: project_id ? 'remodelacion' : 'rentas',
      created_by: state.user?.id || null
    };
    const { error } = await sb.from('clean_day_tasks').insert(payload);
    if (error) return alert('Error: ' + error.message);
  }
  closeModal();
  await clRefocusPlanner();
}

// ─── CHECKLIST DE ENTREGABLES ───
function clOpenChecklist(taskId) {
  const t = clState.dayTasks.find(x => x.id === taskId) || clState.weekTasks.find(x => x.id === taskId);
  if (!t) return;
  const cl = t.checklist || [];
  const done = cl.filter(x => x.done).length;
  const pct = cl.length ? Math.round(done/cl.length*100) : 0;
  const locText = clPropName(t) || '';

  const html = `
    <div class="space-y-3">
      <div class="bg-slate-900 text-white rounded p-3">
        <div class="text-[10px] uppercase text-slate-400 font-bold">Entregables</div>
        <div class="text-base font-bold">${t.title}</div>
        <div class="text-xs text-slate-300 mt-0.5">🏠 ${locText} · ${clFmt12(t.start_time)} · ${t.duration_min}m</div>
        <div class="flex items-center gap-2 mt-2">
          <div class="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden"><div class="${pct===100?'bg-emerald-400':'bg-blue-400'} h-full" style="width:${pct}%"></div></div>
          <span class="text-xs font-bold">${done}/${cl.length} (${pct}%)</span>
        </div>
      </div>

      <div class="space-y-1">
        ${cl.length === 0 ? '<div class="text-xs text-slate-400 text-center py-4">Sin checklist. Agregá items abajo.</div>' : cl.map((item, idx) => `
          <div class="flex items-center gap-2 p-2 ${item.done?'bg-emerald-50 border-emerald-200':'bg-white border-slate-200'} border rounded">
            <input type="checkbox" ${item.done?'checked':''} onclick="clToggleChecklistItem('${taskId}', ${idx})" class="w-5 h-5 cursor-pointer" />
            <input value="${(item.item||'').replace(/"/g,'&quot;')}" onblur="clEditChecklistItem('${taskId}', ${idx}, this.value)" class="flex-1 bg-transparent text-sm ${item.done?'line-through opacity-60':''} focus:bg-white focus:border focus:border-slate-300 rounded px-1" />
            ${item.done && item.done_at ? `<span class="text-[10px] text-emerald-700">✓ ${new Date(item.done_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}
            <button onclick="clRemoveChecklistItem('${taskId}', ${idx})" class="text-[11px] text-slate-400 hover:text-red-600">✕</button>
          </div>
        `).join('')}
      </div>

      <div class="flex gap-1">
        <input id="op-cl-new" placeholder="+ Nuevo entregable (Enter)" onkeydown="if(event.key==='Enter')clAddChecklistItem('${taskId}', this.value, this)" class="flex-1 border border-slate-300 rounded px-3 py-2 text-sm" />
        <button onclick="clAddChecklistItem('${taskId}', document.getElementById('op-cl-new').value, document.getElementById('op-cl-new'))" class="bg-slate-900 hover:bg-slate-700 text-white text-sm px-3 py-2 rounded">+</button>
      </div>

      ${pct === 100 && t.status !== 'done' ? `<button onclick="clMarkDoneFromChecklist('${taskId}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">✅ Marcar tarea como TERMINADA</button>` : ''}

      <button onclick="clRefocusPlanner()" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">← Volver</button>
    </div>
  `;
  clOpenSubmodal(`📋 Entregables`, html);
}

async function clToggleChecklistItem(taskId, idx) {
  const { data: t } = await sb.from('clean_day_tasks').select('checklist,status').eq('id', taskId).single();
  if (!t) return;
  const cl = t.checklist || [];
  if (!cl[idx]) return;
  cl[idx].done = !cl[idx].done;
  cl[idx].done_at = cl[idx].done ? new Date().toISOString() : null;
  await sb.from('clean_day_tasks').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', taskId);
  await clLoadAll();
  clOpenChecklist(taskId);
}
async function clEditChecklistItem(taskId, idx, newText) {
  const { data: t } = await sb.from('clean_day_tasks').select('checklist').eq('id', taskId).single();
  if (!t) return;
  const cl = t.checklist || [];
  if (!cl[idx]) return;
  if ((cl[idx].item||'') === newText) return;
  cl[idx].item = newText;
  await sb.from('clean_day_tasks').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', taskId);
  await clLoadAll();
}
async function clAddChecklistItem(taskId, text, input) {
  text = (text||'').trim();
  if (!text) return;
  const { data: t } = await sb.from('clean_day_tasks').select('checklist').eq('id', taskId).single();
  const cl = (t?.checklist || []).concat([{ item: text, done: false }]);
  await sb.from('clean_day_tasks').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', taskId);
  if (input) input.value = '';
  await clLoadAll();
  clOpenChecklist(taskId);
}
async function clRemoveChecklistItem(taskId, idx) {
  const { data: t } = await sb.from('clean_day_tasks').select('checklist').eq('id', taskId).single();
  if (!t) return;
  const cl = (t.checklist || []).filter((_, i) => i !== idx);
  await sb.from('clean_day_tasks').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', taskId);
  await clLoadAll();
  clOpenChecklist(taskId);
}
async function clMarkDoneFromChecklist(taskId) {
  await sb.from('clean_day_tasks').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', taskId);
  closeModal();
  await clLoadAll();
  clRender();
}

// ─── Recurrentes ───
function clOpenManageRecurring() {
  const propsOpts = clState.properties.map(p => `<option value="prop:${p.id}">🏠 ${p.nickname || p.address}</option>`).join('');
  const projsOpts = clState.projects.map(p => `<option value="proj:${p.id}">🏗️ ${p.name || p.address}</option>`).join('');
  const tmplOpts = clState.tasks.map(t => `<option value="${t.id}">${t.emoji} ${t.name} (${t.default_duration_min}m)</option>`).join('');
  const list = clState.recurring.map(r => {
    const base = clState.tasks.find(x => x.id === r.base_task_id);
    const prop = r.property_id ? clState.properties.find(x => x.id === r.property_id) : null;
    const proj = r.project_id ? clState.projects.find(x => x.id === r.project_id) : null;
    const where = prop ? (prop.nickname || prop.address) : proj ? (proj.name || proj.address) : 'todas las casas';
    return `
      <div class="border border-slate-200 rounded p-2 text-xs flex items-center justify-between">
        <div>
          <div class="font-bold">${base?.emoji||'🔁'} ${r.custom_title || base?.name}</div>
          <div class="text-[10px] text-slate-500">🏠 ${where} · cada ${r.interval_days} días · próxima: ${r.next_due}${r.zona?` · zona ${r.zona}`:''}</div>
        </div>
        <button onclick="clDeleteRecurring('${r.id}')" class="text-[10px] text-red-600 hover:text-red-800">✕</button>
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
            <input id="op-r-next" type="date" value="${clDateOnly(new Date())}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Zona</label>
            <select id="op-r-zona" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
              <option value="">—</option>${CL_ZONAS.map(z => `<option>${z}</option>`).join('')}
            </select>
          </div>
        </div>
        <button onclick="clCreateRecurring()" class="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm py-1.5 rounded font-bold">+ Crear recurrente</button>
      </div>

      <div class="space-y-1">
        <div class="text-[10px] font-bold uppercase text-slate-600">Activas (${clState.recurring.length})</div>
        ${list || '<div class="text-xs text-slate-400 text-center py-4">Sin recurrentes configuradas.</div>'}
      </div>

      <button onclick="clRefocusPlanner()" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">← Volver</button>
    </div>
  `;
  clOpenSubmodal('⚙️ Tareas recurrentes', html);
}

async function clCreateRecurring() {
  const base_task_id = document.getElementById('op-r-task').value;
  const target = document.getElementById('op-r-target').value || '';
  const payload = {
    base_task_id,
    property_id: target.startsWith('prop:') ? target.slice(5) : null,
    project_id: target.startsWith('proj:') ? target.slice(5) : null,
    interval_days: +document.getElementById('op-r-interval').value || 90,
    next_due: document.getElementById('op-r-next').value || clDateOnly(new Date()),
    zona: document.getElementById('op-r-zona').value || null,
    business: 'rentas'
  };
  const { error } = await sb.from('clean_recurring').insert(payload);
  if (error) return alert(error.message);
  closeModal();
  await clRefocusPlanner(); clOpenManageRecurring();
}

async function clDeleteRecurring(id) {
  if (!confirm('¿Eliminar esta recurrente?')) return;
  await sb.from('clean_recurring').update({ active: false }).eq('id', id);
  closeModal();
  await clRefocusPlanner(); clOpenManageRecurring();
}

// ============================================================
// PLANTILLAS DE DÍA COMPLETO (snapshot replicable)
// ============================================================

// Guardar el día actual como plantilla
async function clSaveDayAsTemplate() {
  const tasks = clState.dayTasks.filter(t => clState.zonaFilter === 'all' || t.zona === clState.zonaFilter);
  if (!tasks.length) return alert('El día está vacío. Cargá tareas antes de guardar como plantilla.');
  const name = prompt('Nombre de la plantilla:\n(ej. "Lunes Sur estándar", "Día limpieza pre-entrega")');
  if (!name) return;
  const description = prompt('Descripción (opcional, qué incluye y cuándo usar):', '') || null;

  // Detectar zona dominante
  const zonaCount = {};
  tasks.forEach(t => { if (t.zona) zonaCount[t.zona] = (zonaCount[t.zona]||0)+1; });
  const zonaDom = Object.entries(zonaCount).sort((a,b) => b[1]-a[1])[0]?.[0] || null;

  // Snapshot: descartar IDs/fechas, mantener estructura replicable
  const snapshot = tasks.map(t => ({
    title: t.title,
    start_time: t.start_time,
    duration_min: t.duration_min,
    travel_min: t.travel_min || 0,
    materials: t.materials || [],
    checklist: (t.checklist || []).map(c => ({ item: c.item, done: false })),
    notes: t.notes || null,
    zona: t.zona,
    business: t.business || 'rentas',
    priority: t.priority || 'normal',
    property_id: t.property_id,
    project_id: t.project_id,
    task_id: t.task_id   // referencia al catálogo si vino de plantilla
  }));
  const totalMin = snapshot.reduce((s,t) => s + (t.duration_min||0) + (t.travel_min||0), 0);

  const { error } = await sb.from('clean_day_templates').insert({
    name, description, tasks: snapshot, zona: zonaDom,
    task_count: snapshot.length, total_min: totalMin,
    created_by: state.user?.id || null
  });
  if (error) return alert('Error: ' + error.message + '\n\nSi la tabla no existe, corré el SQL: supabase/ops-day-templates.sql');
  await clLoadAll();
  clRender();
  alert(`✅ Plantilla "${name}" guardada con ${snapshot.length} tareas (${Math.floor(totalMin/60)}h ${totalMin%60}m total).`);
}

// Modal para elegir plantilla a aplicar
function clOpenApplyTemplate() {
  const tpls = clState.dayTemplates || [];
  if (!tpls.length) return alert('No tenés plantillas guardadas. Armá un día y guardalo primero.');
  const tplOpts = tpls.map(t => `
    <div class="border border-slate-200 rounded-lg p-3 hover:bg-blue-50 cursor-pointer" onclick="clApplyTemplate('${t.id}')">
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm">${t.name}</div>
          ${t.description ? `<div class="text-[10px] text-slate-500 mt-0.5">${t.description}</div>` : ''}
          <div class="text-[10px] text-slate-600 mt-1">
            <span class="bg-slate-100 px-1.5 py-0.5 rounded">${t.task_count} tareas</span>
            <span class="bg-slate-100 px-1.5 py-0.5 rounded ml-1">${Math.floor(t.total_min/60)}h ${t.total_min%60}m</span>
            ${t.zona ? `<span class="${clZonaColor(t.zona)} border px-1.5 py-0.5 rounded ml-1">${t.zona}</span>` : ''}
          </div>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <button onclick="event.stopPropagation(); clEditTemplate('${t.id}')" class="text-xs text-slate-400 hover:text-slate-900" title="Editar plantilla">✏️</button>
          <button onclick="event.stopPropagation(); clDeleteTemplate('${t.id}')" class="text-xs text-slate-400 hover:text-red-600" title="Eliminar plantilla">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
  const html = `
    <div class="space-y-3">
      <div class="text-xs text-slate-500">Aplicar al día <strong>${clState.date}</strong>. Las tareas existentes en este día se mantienen — las de la plantilla se SUMAN.</div>
      <div class="space-y-2 max-h-[60vh] overflow-y-auto">
        ${tplOpts}
      </div>
      <button onclick="clRefocusPlanner()" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
    </div>
  `;
  clOpenSubmodal('📋 Aplicar plantilla de día', html);
}

// Aplicar plantilla — inserta todas las tareas al día actual
async function clApplyTemplate(templateId) {
  const tpl = clState.dayTemplates.find(t => t.id === templateId);
  if (!tpl) return alert('Plantilla no encontrada');
  if (!confirm(`¿Aplicar "${tpl.name}" (${tpl.task_count} tareas) al ${clState.date}?\n\nSe AGREGAN a las tareas existentes (no reemplazan).`)) return;

  const rows = (tpl.tasks || []).map(t => ({
    date: clState.date,
    start_time: t.start_time,
    duration_min: t.duration_min || 30,
    travel_min: t.travel_min || 0,
    title: t.title,
    materials: t.materials || [],
    checklist: t.checklist || [],
    notes: t.notes,
    zona: t.zona,
    business: t.business || 'rentas',
    priority: t.priority || 'normal',
    property_id: t.property_id || null,
    project_id: t.project_id || null,
    task_id: t.task_id || null,
    status: 'planned',
    created_by: state.user?.id || null
  }));
  if (!rows.length) return alert('La plantilla no tiene tareas.');
  const { error } = await sb.from('clean_day_tasks').insert(rows);
  if (error) return alert('Error: ' + error.message);
  await clRefocusPlanner();
  alert(`✅ ${rows.length} tareas agregadas al ${clState.date}.`);
}

// Editar plantilla (nombre, descripción)
async function clEditTemplate(templateId) {
  const tpl = clState.dayTemplates.find(t => t.id === templateId);
  if (!tpl) return;
  const newName = prompt('Nuevo nombre:', tpl.name);
  if (!newName) return;
  const newDesc = prompt('Nueva descripción:', tpl.description || '') || null;
  const { error } = await sb.from('clean_day_templates').update({
    name: newName, description: newDesc, updated_at: new Date().toISOString()
  }).eq('id', templateId);
  if (error) return alert('Error: ' + error.message);
  await clLoadAll(); clRender();
  closeModal(); setTimeout(() => clOpenApplyTemplate(), 100);
}

// Eliminar plantilla
async function clDeleteTemplate(templateId) {
  const tpl = clState.dayTemplates.find(t => t.id === templateId);
  if (!tpl) return;
  if (!confirm(`¿Eliminar plantilla "${tpl.name}"? (No afecta tareas del calendario, solo borra la plantilla.)`)) return;
  await sb.from('clean_day_templates').delete().eq('id', templateId);
  await clLoadAll(); clRender();
  closeModal(); setTimeout(() => clOpenApplyTemplate(), 100);
}

// ============================================================
// VISTA ENTREGABLE — para screenshot al equipo
// ============================================================
function clRenderPrintable(filteredDay) {
  if (!filteredDay.length) {
    return `<div class="p-8 text-center text-slate-400"><div class="text-5xl mb-3">📭</div><div>Sin tareas para este día.</div></div>`;
  }
  const sorted = [...filteredDay].sort((a,b) => clTimeToMin(a.start_time) - clTimeToMin(b.start_time));
  const totalMin = sorted.reduce((s,t) => s + (t.duration_min||0) + (t.travel_min||0), 0);
  const workMin = sorted.reduce((s,t) => s + (t.duration_min||0), 0);
  const travelMin = sorted.reduce((s,t) => s + (t.travel_min||0), 0);
  const done = sorted.filter(t => t.status === 'done').length;
  const dateLabel = new Date(clState.date + 'T00:00:00').toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const firstStart = sorted[0].start_time;
  const lastEnd = clAddMin(sorted[sorted.length-1].start_time, sorted[sorted.length-1].duration_min || 0);

  // Agrupar por casa para mostrar consolidado
  const byHouse = {};
  sorted.forEach(t => {
    const key = t.property_id ? 'p:'+t.property_id : t.project_id ? 'j:'+t.project_id : '__sin__';
    if (!byHouse[key]) byHouse[key] = { name: clPropName(t) || 'Sin casa', tasks: [] };
    byHouse[key].tasks.push(t);
  });

  return `
    <div class="flex-1 overflow-y-auto bg-white" id="op-print-scroll">
    <div class="bg-white p-4 sm:p-6 print:p-0" id="op-printable">
      <div class="sticky top-0 bg-amber-100 border-b border-amber-300 px-3 py-2 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4 flex justify-between items-center print:hidden z-20">
        <div class="text-xs text-amber-900"><strong>🖼️ Vista entregable</strong> — scrolleá ↓ para ver todo · 🖨️ para PDF completo</div>
        <div class="flex gap-1 flex-wrap">
          <button onclick="clCopyForWhatsApp('day')" class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded font-bold" title="Copia el cronograma del día como texto para pegar en WhatsApp">📱 WhatsApp · Día</button>
          <button onclick="clCopyForWhatsApp('week')" class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded font-bold" title="Copia toda la semana">📱 WhatsApp · Semana</button>
          <button onclick="window.print()" class="text-xs bg-slate-900 text-white px-3 py-1 rounded font-bold">🖨️ Imprimir PDF</button>
          <button onclick="clSetView('day')" class="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded font-bold">← Volver</button>
        </div>
      </div>

      <!-- Header -->
      <div class="border-b-4 border-slate-900 pb-3 mb-4">
        <div class="text-3xl font-bold capitalize">${dateLabel}</div>
        <div class="text-sm text-slate-600 mt-1">Operaciones · Equipo Limpieza ${clState.zonaFilter !== 'all' ? `· Zona ${clState.zonaFilter}` : ''}</div>
        <div class="flex gap-4 mt-3 text-sm flex-wrap">
          <div class="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold">${sorted.length} tareas</div>
          <div class="bg-blue-100 text-blue-900 px-3 py-1.5 rounded-lg font-bold">⏱ ${clFmt12(firstStart)} → ${clFmt12(lastEnd)}</div>
          <div class="bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-lg font-bold">${Math.floor(workMin/60)}h ${workMin%60}m trabajo</div>
          ${travelMin ? `<div class="bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg font-bold">🚗 ${travelMin}m viaje</div>` : ''}
          <div class="bg-slate-100 px-3 py-1.5 rounded-lg font-bold">Total ${Math.floor(totalMin/60)}h ${totalMin%60}m</div>
        </div>
      </div>

      <!-- Lista cronológica -->
      <div class="space-y-2">
        ${sorted.map((t, i) => {
          const endTime = clAddMin(t.start_time, t.duration_min);
          const propCls = clPropColor(t.property_id || t.project_id);
          const loc = clPropName(t);
          const cl = t.checklist || [];
          const mats = t.materials || [];
          return `
            <div class="${propCls} border-2 rounded-lg p-3 break-inside-avoid">
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 text-right">
                  <div class="text-2xl font-bold text-slate-900">${clFmt12(t.start_time).replace(' ','')}</div>
                  <div class="text-xs text-slate-500">→ ${clFmt12(endTime).replace(' ','')}</div>
                  <div class="text-[10px] text-slate-500 mt-1 font-bold">${t.duration_min}m${t.travel_min?'+🚗'+t.travel_min:''}</div>
                </div>
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">${i+1}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-base font-bold text-slate-900">${t.title || '(sin título)'}</div>
                  ${loc ? `<div class="text-sm text-slate-700 font-semibold mt-0.5">🏠 ${loc}</div>` : ''}
                  ${t.zona ? `<span class="inline-block text-[10px] ${clZonaColor(t.zona)} border px-1.5 py-0.5 rounded font-bold mt-1">${t.zona}</span>` : ''}
                  ${mats.length ? `<div class="text-xs text-slate-600 mt-1.5"><strong>🧳 Llevar:</strong> ${mats.join(', ')}</div>` : ''}
                  ${cl.length ? `<div class="text-xs text-slate-700 mt-1.5"><strong>📋 Checklist:</strong><ul class="ml-4 list-disc">${cl.map(c => `<li class="${c.done?'line-through opacity-50':''}">${c.item}</li>`).join('')}</ul></div>` : ''}
                  ${t.notes ? `<div class="text-xs text-slate-600 italic mt-1.5">📝 ${t.notes}</div>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Resumen materiales total -->
      ${(() => {
        const allMats = {};
        sorted.forEach(t => { if (t.status !== 'skipped') (t.materials||[]).forEach(m => { allMats[m]=(allMats[m]||0)+1; }); });
        const list = Object.entries(allMats);
        if (!list.length) return '';
        return `
          <div class="mt-5 pt-3 border-t-2 border-slate-300">
            <div class="text-xs font-bold uppercase text-amber-900 mb-2">🧳 Lista total del día — checklist truck</div>
            <div class="flex flex-wrap gap-1.5">
              ${list.map(([m,c]) => `<span class="bg-amber-50 border border-amber-300 text-amber-900 text-xs px-2 py-1 rounded">${m}${c>1?` <strong>×${c}</strong>`:''}</span>`).join('')}
            </div>
          </div>
        `;
      })()}
    </div>
    </div>
    <style>
      @media print {
        /* Ocultar TODO menos el printable */
        body * { visibility: hidden !important; }
        #op-printable, #op-printable * { visibility: visible !important; }
        /* Quitar overflow/altura de TODOS los padres para que el contenido fluya completo */
        html, body { height: auto !important; overflow: visible !important; background: white !important; }
        #modal, #modal *, #op-print-scroll, #op-root { overflow: visible !important; height: auto !important; max-height: none !important; position: static !important; background: white !important; }
        #op-printable {
          position: absolute !important;
          left: 0 !important; top: 0 !important;
          width: 100% !important; height: auto !important;
          overflow: visible !important;
          padding: 12px !important;
        }
        #op-printable .print\\:hidden { display: none !important; }
        /* Evitar que las tarjetas se partan a la mitad entre páginas */
        #op-printable [class*="break-inside-avoid"] { break-inside: avoid; page-break-inside: avoid; }
        /* Forzar fondo en bloques con clases bg-* */
        #op-printable * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    </style>
  `;
}

// ============================================================
// CONVERTIR TAREA EN RECURRENTE
// ============================================================
function clOpenConvertToRecurring(taskId) {
  const t = clState.dayTasks.find(x => x.id === taskId) || clState.backlog.find(x => x.id === taskId);
  if (!t) return alert('Tarea no encontrada');
  const today = clDateOnly(new Date());
  const html = `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-200 rounded p-2 text-xs text-violet-900">
        🔁 Vas a convertir <strong>"${t.title}"</strong> en una tarea recurrente. Se generará automáticamente cada X días.
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Repetir cada (días) *</label>
          <input id="op-conv-interval" type="number" value="7" min="1" max="365" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
          <div class="text-[9px] text-slate-500 mt-0.5">Ej: 1=diaria · 7=semanal · 14=quincenal · 30=mensual</div>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Próxima fecha *</label>
          <input id="op-conv-next" type="date" value="${today}" class="w-full border border-slate-300 rounded px-2 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Qué hacer con la tarea actual</label>
        <div class="flex gap-2">
          <label class="flex-1 cursor-pointer">
            <input type="radio" name="op-conv-mode" value="keep" checked class="hidden peer" />
            <div class="peer-checked:bg-emerald-100 peer-checked:border-emerald-500 peer-checked:font-bold border border-slate-300 rounded px-2 py-2 text-xs text-center">Mantener (sigue agendada hoy)</div>
          </label>
          <label class="flex-1 cursor-pointer">
            <input type="radio" name="op-conv-mode" value="replace" class="hidden peer" />
            <div class="peer-checked:bg-violet-100 peer-checked:border-violet-500 peer-checked:font-bold border border-slate-300 rounded px-2 py-2 text-xs text-center">Reemplazar (eliminar instancia)</div>
          </label>
        </div>
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="clConvertToRecurring('${taskId}')" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 rounded">🔁 Convertir</button>
      </div>
    </div>
  `;
  clOpenSubmodal('🔁 Convertir a recurrente', html);
}

async function clConvertToRecurring(taskId) {
  const t = clState.dayTasks.find(x => x.id === taskId) || clState.backlog.find(x => x.id === taskId);
  if (!t) return;
  const interval = +document.getElementById('op-conv-interval').value || 7;
  const nextDue = document.getElementById('op-conv-next').value;
  const mode = document.querySelector('input[name="op-conv-mode"]:checked')?.value || 'keep';
  if (!interval || interval < 1) return alert('Interval debe ser al menos 1 día');
  if (!nextDue) return alert('Próxima fecha es obligatoria');

  const payload = {
    base_task_id: t.task_id || null,
    custom_title: t.title,
    custom_duration_min: t.duration_min,
    custom_materials: t.materials || [],
    property_id: t.property_id || null,
    project_id: t.project_id || null,
    zona: t.zona || null,
    business: t.business || 'rentas',
    priority: t.priority || 'normal',
    interval_days: interval,
    next_due: nextDue,
    active: true,
    created_by: state.user?.id || null
  };
  const { data: recurring, error } = await sb.from('clean_recurring').insert(payload).select().single();
  if (error) return alert('Error: ' + error.message);

  if (mode === 'replace') {
    await sb.from('clean_day_tasks').delete().eq('id', taskId);
  } else if (recurring?.id) {
    // Marcar la instancia actual como vinculada al recurrente
    await sb.from('clean_day_tasks').update({ recurring_id: recurring.id }).eq('id', taskId);
  }
  closeModal();
  await clLoadAll();
  clRender();
  alert(`✅ Convertida en recurrente.\nSe generará cada ${interval} día${interval>1?'s':''} a partir del ${nextDue}.`);
}

// Convertir tarea recurrente en ocasional (al revés)
async function clMakeTaskOneTime(taskId) {
  const t = clState.dayTasks.find(x => x.id === taskId);
  if (!t || !t.recurring_id) return;
  if (!confirm(`¿Desvincular "${t.title}" del recurrente?\n\nLa instancia de hoy se mantiene, pero NO se generarán más a futuro.`)) return;
  await sb.from('clean_recurring').update({ active: false }).eq('id', t.recurring_id);
  await sb.from('clean_day_tasks').update({ recurring_id: null }).eq('id', taskId);
  await clLoadAll(); clRender();
  alert('✅ Recurrencia desactivada. La tarea de hoy queda como única.');
}

// ============================================================
// PANEL: PLANTILLAS DE DÍA (sidebar tab)
// ============================================================
function clRenderDayTemplatesPanel() {
  const tpls = clState.dayTemplates || [];
  return `
    <div class="flex-1 overflow-y-auto p-2">
      <div class="bg-blue-50 border border-blue-200 rounded p-2 text-[10px] text-blue-900 mb-2">
        🗂️ Plantillas de día completo. Aplicalas con un click al día actual o editá su contenido.
      </div>
      ${tpls.length === 0 ? `
        <div class="text-center py-10 text-slate-400 text-xs">
          <div class="text-3xl mb-2">📭</div>
          <div>Sin plantillas guardadas.</div>
          <div class="mt-2 text-[10px]">Armá un día y dale "💾 Guardar día como plantilla" arriba.</div>
        </div>
      ` : `
        <div class="space-y-2">
          ${tpls.map(t => `
            <div class="bg-white border border-slate-200 rounded-lg p-2 hover:shadow-sm">
              <div class="flex justify-between items-start gap-1">
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold truncate">${t.name}</div>
                  ${t.description ? `<div class="text-[10px] text-slate-500 mt-0.5 truncate" title="${t.description.replace(/"/g,'&quot;')}">${t.description}</div>` : ''}
                  <div class="text-[10px] text-slate-600 mt-1 flex gap-1 flex-wrap">
                    <span class="bg-slate-100 px-1 rounded">${t.task_count} t</span>
                    <span class="bg-slate-100 px-1 rounded">${Math.floor(t.total_min/60)}h${t.total_min%60?(t.total_min%60)+'m':''}</span>
                    ${t.zona ? `<span class="${clZonaColor(t.zona)} border px-1 rounded">${t.zona[0]}</span>` : ''}
                  </div>
                </div>
              </div>
              <div class="flex gap-1 mt-2">
                <button onclick="clApplyTemplate('${t.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 rounded" title="Copiar al día actual">📋 Aplicar</button>
                <button onclick="clOpenEditDayTemplate('${t.id}')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-2 py-1 rounded" title="Editar contenido">✏️</button>
                <button onclick="clDeleteTemplate('${t.id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold px-2 py-1 rounded" title="Eliminar">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// ============================================================
// EDITOR DE CONTENIDO DE PLANTILLA DE DÍA
// ============================================================
function clOpenEditDayTemplate(templateId) {
  const tpl = clState.dayTemplates.find(t => t.id === templateId);
  if (!tpl) return alert('Plantilla no encontrada');
  // Guardamos referencia editable en window para que los inputs onchange muten
  window._opEditingTpl = JSON.parse(JSON.stringify(tpl));
  clRenderEditDayTemplate();
}

function clRenderEditDayTemplate() {
  const tpl = window._opEditingTpl;
  if (!tpl) return;
  const tasks = tpl.tasks || [];
  const totalMin = tasks.reduce((s,t) => s + (+t.duration_min||0) + (+t.travel_min||0), 0);

  const propsOpts = clState.properties.map(p => `<option value="prop:${p.id}">🏠 ${p.nickname || p.address}</option>`).join('');
  const projsOpts = clState.projects.map(p => `<option value="proj:${p.id}">🏗️ ${p.name || p.address}</option>`).join('');

  const html = `
    <div class="space-y-3">
      <!-- Cabecera de plantilla -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold uppercase text-blue-900 mb-1">Nombre *</label>
            <input value="${(tpl.name||'').replace(/"/g,'&quot;')}" oninput="window._opEditingTpl.name=this.value" class="w-full border border-blue-300 rounded px-2 py-1.5 text-sm font-bold" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-blue-900 mb-1">Zona dominante</label>
            <select onchange="window._opEditingTpl.zona=this.value||null" class="w-full border border-blue-300 rounded px-2 py-1.5 text-sm">
              <option value="">— sin zona —</option>
              ${CL_ZONAS.map(z => `<option value="${z}" ${tpl.zona===z?'selected':''}>${z}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-blue-900 mb-1">Descripción</label>
          <textarea oninput="window._opEditingTpl.description=this.value" rows="2" class="w-full border border-blue-300 rounded px-2 py-1.5 text-xs">${tpl.description||''}</textarea>
        </div>
        <div class="text-[11px] text-blue-700">
          ${tasks.length} tarea${tasks.length===1?'':'s'} · ${Math.floor(totalMin/60)}h ${totalMin%60}m total
        </div>
      </div>

      <!-- Lista editable de tareas -->
      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-700">Tareas de la plantilla</span>
          <button onclick="clAddTaskToTemplate()" class="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded font-bold">+ Agregar tarea</button>
        </div>
        ${tasks.length === 0 ? '<div class="p-6 text-center text-xs text-slate-400">Sin tareas. Agregá una.</div>' : `
          <div class="max-h-[50vh] overflow-y-auto divide-y divide-slate-100">
            ${tasks.map((task, idx) => {
              const targetVal = task.property_id ? 'prop:'+task.property_id : task.project_id ? 'proj:'+task.project_id : '';
              return `
                <div class="p-2 bg-white hover:bg-slate-50">
                  <div class="flex gap-1 items-center mb-1">
                    <span class="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0">#${idx+1}</span>
                    <input value="${(task.title||'').replace(/"/g,'&quot;')}" oninput="clTplTaskField(${idx},'title',this.value)" placeholder="Título *" class="flex-1 border border-slate-300 rounded px-2 py-1 text-xs font-bold" />
                    <button onclick="clRemoveTaskFromTemplate(${idx})" class="text-red-500 hover:text-red-700 text-xs px-1" title="Eliminar">🗑️</button>
                  </div>
                  <div class="grid grid-cols-4 gap-1 mb-1">
                    <div>
                      <label class="block text-[9px] text-slate-500">Inicio</label>
                      <input type="time" value="${(task.start_time||'').substring(0,5)}" oninput="clTplTaskField(${idx},'start_time',this.value)" class="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px]" />
                    </div>
                    <div>
                      <label class="block text-[9px] text-slate-500">Dur (m)</label>
                      <input type="number" value="${task.duration_min||30}" min="5" step="5" oninput="clTplTaskField(${idx},'duration_min',+this.value)" class="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px]" />
                    </div>
                    <div>
                      <label class="block text-[9px] text-emerald-600">Cierre auto</label>
                      <input type="time" value="${clAddMin((task.start_time||'08:00').substring(0,5), task.duration_min||30)}" readonly class="w-full border border-emerald-300 bg-emerald-50 rounded px-1 py-0.5 text-[11px] text-emerald-700 cursor-not-allowed" />
                    </div>
                    <div>
                      <label class="block text-[9px] text-slate-500">Viaje (m)</label>
                      <input type="number" value="${task.travel_min||0}" min="0" step="5" oninput="clTplTaskField(${idx},'travel_min',+this.value)" class="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px]" />
                    </div>
                  </div>
                  <div class="grid grid-cols-3 gap-1 mb-1">
                    <select onchange="clTplTaskField(${idx},'zona',this.value||null)" class="border border-slate-300 rounded px-1 py-0.5 text-[11px]">
                      <option value="">— zona —</option>
                      ${CL_ZONAS.map(z => `<option value="${z}" ${task.zona===z?'selected':''}>${z}</option>`).join('')}
                    </select>
                    <select onchange="clTplTaskField(${idx},'priority',this.value)" class="border border-slate-300 rounded px-1 py-0.5 text-[11px]">
                      ${['low','normal','high','urgent'].map(p => `<option value="${p}" ${task.priority===p?'selected':''}>${p}</option>`).join('')}
                    </select>
                    <select onchange="clTplTaskTarget(${idx}, this.value)" class="border border-slate-300 rounded px-1 py-0.5 text-[11px]">
                      <option value="" ${!targetVal?'selected':''}>— casa —</option>
                      <optgroup label="🏠 Rentas">${propsOpts.replace(new RegExp(`value="${targetVal}"`,'g'), `value="${targetVal}" selected`)}</optgroup>
                      <optgroup label="🏗️ Obras">${projsOpts.replace(new RegExp(`value="${targetVal}"`,'g'), `value="${targetVal}" selected`)}</optgroup>
                    </select>
                  </div>
                  <input value="${((task.materials||[]).join(', ')).replace(/"/g,'&quot;')}" oninput="clTplTaskMaterials(${idx}, this.value)" placeholder="Materiales (coma)" class="w-full border border-slate-300 rounded px-2 py-0.5 text-[11px] mb-1" />
                  <textarea oninput="clTplTaskField(${idx},'notes',this.value||null)" rows="1" placeholder="Notas (opcional)" class="w-full border border-slate-300 rounded px-2 py-0.5 text-[11px]">${task.notes||''}</textarea>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="window._opEditingTpl=null; clRefocusPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="clSaveDayTemplateEdits()" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded">💾 Guardar cambios</button>
      </div>
    </div>
  `;
  clOpenSubmodal('✏️ Editar plantilla de día', html);
}

// Mutadores del state editable
function clTplTaskField(idx, field, value) {
  if (!window._opEditingTpl?.tasks?.[idx]) return;
  window._opEditingTpl.tasks[idx][field] = value;
  // Si cambió duración o start_time, re-renderizar para mostrar el cierre auto
  if (field === 'duration_min' || field === 'start_time') {
    clRenderEditDayTemplate();
  }
}
function clTplTaskMaterials(idx, value) {
  if (!window._opEditingTpl?.tasks?.[idx]) return;
  window._opEditingTpl.tasks[idx].materials = (value || '').split(',').map(s => s.trim()).filter(Boolean);
}
function clTplTaskTarget(idx, value) {
  if (!window._opEditingTpl?.tasks?.[idx]) return;
  window._opEditingTpl.tasks[idx].property_id = value.startsWith('prop:') ? value.slice(5) : null;
  window._opEditingTpl.tasks[idx].project_id = value.startsWith('proj:') ? value.slice(5) : null;
}
function clAddTaskToTemplate() {
  if (!window._opEditingTpl) return;
  const existing = window._opEditingTpl.tasks || [];
  // Heredar hora del final de la última tarea
  let startTime = '08:00';
  if (existing.length) {
    const last = existing[existing.length-1];
    startTime = clAddMin(last.start_time || '08:00', (last.duration_min||30) + (last.travel_min||0));
  }
  window._opEditingTpl.tasks = [...existing, {
    title: 'Nueva tarea', start_time: startTime, duration_min: 30, travel_min: 0,
    materials: [], checklist: [], notes: null,
    zona: null, business: 'rentas', priority: 'normal',
    property_id: null, project_id: null
  }];
  clRenderEditDayTemplate();
}
function clRemoveTaskFromTemplate(idx) {
  if (!window._opEditingTpl) return;
  if (!confirm('¿Quitar esta tarea de la plantilla?')) return;
  window._opEditingTpl.tasks = window._opEditingTpl.tasks.filter((_, i) => i !== idx);
  clRenderEditDayTemplate();
}

async function clSaveDayTemplateEdits() {
  const tpl = window._opEditingTpl;
  if (!tpl) return;
  if (!tpl.name?.trim()) return alert('El nombre es obligatorio');
  const tasks = tpl.tasks || [];
  const totalMin = tasks.reduce((s,t) => s + (+t.duration_min||0) + (+t.travel_min||0), 0);
  // Auto-detectar zona si no fue puesta a mano
  let zonaDom = tpl.zona;
  if (!zonaDom) {
    const cnt = {};
    tasks.forEach(t => { if (t.zona) cnt[t.zona] = (cnt[t.zona]||0)+1; });
    zonaDom = Object.entries(cnt).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
  }
  const { error } = await sb.from('clean_day_templates').update({
    name: tpl.name.trim(),
    description: tpl.description || null,
    tasks,
    zona: zonaDom,
    task_count: tasks.length,
    total_min: totalMin,
    updated_at: new Date().toISOString()
  }).eq('id', tpl.id);
  if (error) return alert('Error: ' + error.message);
  window._opEditingTpl = null;
  await clRefocusPlanner();
  clSetLeftTab('daytemplates');
}

// ============================================================
// RESOLUCIÓN DE CONFLICTOS DE HORARIO
// Cuando edits una tarea y se solapa con la siguiente:
//   - shift  → empuja todas las siguientes en cascada
//   - overlap → permite que queden pisadas (visual lanes)
//   - cancel → no guarda
// ============================================================

// Modal de pregunta — devuelve 'shift' | 'overlap' | 'cancel'
function clAskConflictResolution(payload, currentTask, conflicts, overlapMin) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.id = 'op-conflict-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px;';

    const newEnd = clMinToTime(clTimeToMin(payload.start_time) + payload.duration_min);
    const conflictList = conflicts.slice(0, 5).map(c => `<li class="text-xs"><strong>${c.title}</strong> · ${clFmt12(c.start_time)} (${c.duration_min}m)</li>`).join('');
    const moreCount = conflicts.length > 5 ? conflicts.length - 5 : 0;

    overlay.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div class="bg-amber-100 border-b border-amber-300 px-4 py-3">
          <div class="font-bold text-amber-900">⚠️ Conflicto de horario</div>
          <div class="text-xs text-amber-800 mt-0.5">"${currentTask.title}" (${clFmt12(payload.start_time)} → ${clFmt12(newEnd)}) se pisa con ${conflicts.length} tarea${conflicts.length>1?'s':''} (${overlapMin} min de solapamiento).</div>
        </div>
        <div class="p-4">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">Tarea${conflicts.length>1?'s':''} afectada${conflicts.length>1?'s':''}:</div>
          <ul class="space-y-1 mb-4 ml-3 list-disc">${conflictList}${moreCount?`<li class="text-[10px] text-slate-500">...y ${moreCount} más</li>`:''}</ul>

          <div class="space-y-2">
            <button data-act="shift" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-3 rounded text-left">
              ↪️ Correr todas las siguientes (+${overlapMin}m)
              <div class="text-[10px] font-normal opacity-90 mt-0.5">Mantiene el orden, evita pisados. RECOMENDADO.</div>
            </button>
            <button data-act="overlap" class="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2.5 px-3 rounded text-left">
              🔀 Permitir solapamiento
              <div class="text-[10px] font-normal opacity-90 mt-0.5">Quedan pisadas. Útil si vas a hacer ambas en paralelo (2 personas).</div>
            </button>
            <button data-act="cancel" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold py-2.5 px-3 rounded">
              ✕ Cancelar (no guardar)
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-act]').forEach(b => {
      b.onclick = () => { overlay.remove(); resolve(b.dataset.act); };
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve('cancel'); } });
  });
}

// Shift en cascada: todas las tareas del día que arrancan >= startMin se corren X minutos
async function clShiftTasksAfter(dateStr, fromStartMin, shiftMin, excludeIds = []) {
  const tasks = clState.dayTasks
    .filter(t => t.date === dateStr && t.start_time && !excludeIds.includes(t.id))
    .filter(t => clTimeToMin(t.start_time) >= fromStartMin);
  if (tasks.length === 0) return;

  // Aplicar shift en cascada — cada tarea se mueve por al menos shiftMin
  // pero respetando que cada una arranque DESPUÉS de cuando termina la anterior
  const sorted = [...tasks].sort((a,b) => clTimeToMin(a.start_time) - clTimeToMin(b.start_time));
  // Buscar la "ancla": la tarea editada — su fin marca el nuevo inicio mínimo
  const updates = [];
  let minStartMin = fromStartMin + shiftMin;
  // Capear a 22:00 (CL_END_HOUR)
  const dayEndMin = CL_END_HOUR * 60;

  for (const t of sorted) {
    const origStart = clTimeToMin(t.start_time);
    const newStart = Math.max(origStart + shiftMin, minStartMin);
    if (newStart >= dayEndMin) {
      // Se sale del día — la mandamos a backlog
      updates.push({ id: t.id, date: null, start_time: null, _toBacklog: true });
    } else {
      updates.push({ id: t.id, date: dateStr, start_time: clMinToTime(newStart), _toBacklog: false });
      minStartMin = newStart + (t.duration_min || 0) + (t.travel_min || 0);
    }
  }

  // Aplicar en serie (Supabase no soporta batch update con valores distintos)
  for (const u of updates) {
    await sb.from('clean_day_tasks').update({
      start_time: u.start_time,
      date: u.date,
      updated_at: new Date().toISOString()
    }).eq('id', u.id);
  }

  const movedToBacklog = updates.filter(u => u._toBacklog).length;
  if (movedToBacklog > 0) {
    setTimeout(() => alert(`⚠️ ${movedToBacklog} tarea${movedToBacklog>1?'s':''} no cupo${movedToBacklog>1?'n':''} en el día y fue${movedToBacklog>1?'ron':''} enviada${movedToBacklog>1?'s':''} al backlog.`), 200);
  }
}

// ============================================================
// PLANTILLAS DE TAREAS — CRUD desde el panel Tareas
// ============================================================

function clOpenNewTemplate(prefilledCategory) {
  clOpenTemplateModal(null, prefilledCategory);
}

function clOpenEditTemplate(id) {
  const tmpl = clState.tasks.find(t => t.id === id);
  if (!tmpl) return alert('Plantilla no encontrada');
  clOpenTemplateModal(tmpl);
}

function clOpenTemplateModal(tmpl, prefilledCategory) {
  const isEdit = !!tmpl;
  const t = tmpl || {};
  // Categorías existentes para sugerir
  const existingCats = Array.from(new Set(clState.tasks.map(x => x.category).filter(Boolean))).sort();
  const catOptions = existingCats.map(c => `<option value="${c}" ${(t.category===c||prefilledCategory===c)?'selected':''}>${c}</option>`).join('');
  const mats = Array.isArray(t.default_materials) ? t.default_materials.join(', ') : '';
  const checklist = Array.isArray(t.default_checklist) ? t.default_checklist.join('\n') : '';

  const html = `
    <div class="space-y-3">
      <div class="text-xs text-slate-500">${isEdit ? 'Editar plantilla existente.' : 'Las plantillas quedan disponibles para arrastrar al horario en cualquier día.'}</div>

      <div class="grid grid-cols-4 gap-2">
        <div class="col-span-3">
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Nombre *</label>
          <input id="op-tpl-name" value="${(t.name||'').replace(/"/g,'&quot;')}" placeholder="Ej. Cambio de filtros A/C" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Emoji</label>
          <input id="op-tpl-emoji" value="${t.emoji||'🧰'}" maxlength="2" class="w-full border border-slate-300 rounded px-3 py-2 text-lg text-center" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Categoría *</label>
          <input id="op-tpl-category" list="op-tpl-cat-list" value="${(t.category||prefilledCategory||'').replace(/"/g,'&quot;')}" placeholder="Ej. mantenimiento" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          <datalist id="op-tpl-cat-list">${catOptions}</datalist>
          <div class="text-[9px] text-slate-500 mt-0.5">Existentes: ${existingCats.join(', ') || '—'}</div>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Empresa</label>
          <select id="op-tpl-business" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
            <option value="both" ${t.business==='both'?'selected':''}>Ambas</option>
            <option value="rentas" ${t.business==='rentas'?'selected':''}>Rentas</option>
            <option value="remodelacion" ${t.business==='remodelacion'?'selected':''}>Remodelación</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Duración default (min)</label>
          <input id="op-tpl-duration" type="number" value="${t.default_duration_min||30}" min="5" step="5" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Materiales default (separados por coma)</label>
        <input id="op-tpl-materials" value="${mats.replace(/"/g,'&quot;')}" placeholder="taladro, brochas, lija 80" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        <div class="text-[9px] text-slate-500 mt-0.5">Se cargan automático al arrastrar la plantilla al horario</div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">📋 Checklist default (1 item por línea)</label>
        <textarea id="op-tpl-checklist" rows="3" placeholder="Pisos trapeados&#10;Baños desinfectados&#10;Foto del resultado" class="w-full border border-slate-300 rounded px-3 py-2 text-xs">${checklist}</textarea>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Notas</label>
        <textarea id="op-tpl-notes" rows="2" placeholder="Detalles, herramientas especiales, riesgos..." class="w-full border border-slate-300 rounded px-3 py-2 text-xs">${t.notes||''}</textarea>
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="clRefocusPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${isEdit ? `<button onclick="clDeleteTemplateConfirm('${t.id}','${(t.name||'').replace(/'/g,"\\'")}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold py-2 px-4 rounded">🗑️</button>` : ''}
        <button onclick="clSaveTemplate('${t.id||''}')" class="flex-1 ${isEdit?'bg-blue-600 hover:bg-blue-700':'bg-emerald-600 hover:bg-emerald-700'} text-white text-sm font-bold py-2 rounded">${isEdit?'💾 Guardar cambios':'+ Crear plantilla'}</button>
      </div>
    </div>
  `;
  clOpenSubmodal(isEdit ? '✏️ Editar plantilla' : '+ Nueva plantilla de tarea', html);
}

async function clSaveTemplate(id) {
  const name = document.getElementById('op-tpl-name').value.trim();
  if (!name) return alert('El nombre es obligatorio');
  const category = document.getElementById('op-tpl-category').value.trim() || 'otros';
  const business = document.getElementById('op-tpl-business').value;
  const emoji = document.getElementById('op-tpl-emoji').value.trim() || '🧰';
  const default_duration_min = +document.getElementById('op-tpl-duration').value || 30;
  const default_materials = (document.getElementById('op-tpl-materials').value || '').split(',').map(s => s.trim()).filter(Boolean);
  const checklistItems = (document.getElementById('op-tpl-checklist').value || '').split('\n').map(s => s.trim()).filter(Boolean);
  const notes = document.getElementById('op-tpl-notes').value.trim() || null;

  const payload = {
    name, category, business, emoji,
    default_duration_min,
    default_materials,
    default_checklist: checklistItems,
    notes,
    active: true
  };

  let error;
  if (id) {
    ({ error } = await sb.from('clean_tasks').update(payload).eq('id', id));
  } else {
    ({ error } = await sb.from('clean_tasks').insert(payload));
  }
  if (error) {
    // Si default_checklist no existe como columna, reintenta sin ese campo
    if (error.message?.includes('default_checklist')) {
      delete payload.default_checklist;
      if (id) ({ error } = await sb.from('clean_tasks').update(payload).eq('id', id));
      else ({ error } = await sb.from('clean_tasks').insert(payload));
    }
  }
  if (error) return alert('Error: ' + error.message);
  await clRefocusPlanner();
  clSetLeftTab('templates');
}

async function clDeleteTemplateConfirm(id, name) {
  if (!confirm(`¿Eliminar plantilla "${name}"?\n\nLas tareas que YA fueron creadas usando esta plantilla NO se eliminan, solo no aparece más en el panel.`)) return;
  // Soft delete: marcar active=false
  const { error } = await sb.from('clean_tasks').update({ active: false }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await clRefocusPlanner();
  clSetLeftTab('templates');
}
