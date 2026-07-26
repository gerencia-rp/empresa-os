// ════════════════════════════════════════════════════════════════
// 📅 CRONOGRAMA UNIFICADO (v2) — un solo motor sobre pm_tasks.
// Fuente de verdad = Airtable (apptTKRYbx6gu701i): el sync genera turnover
// (check-out) y recepción (check-in) en pm_tasks. El cronograma CONSUME eso
// + gestiona su capa operativa propia (mantenimiento recurrente, recados).
// Nunca escribe en Airtable. "Juan" y "Limpieza" son FILTROS de equipo.
// Vistas: Hoy · Semana · Backlog. Filtros: Equipo · Zona · Tipo.
// ════════════════════════════════════════════════════════════════
const CG = {
  sys: null,
  date: new Date().toISOString().slice(0, 10),
  tasks: [], properties: [], units: [],
  view: 'hoy',
  fEquipo: 'all', fZona: 'all', fTipo: 'all',
  loading: false, loadError: null,
};
window.CG = CG;

// ─── TIPOS de tarea (color + etiqueta), derivados de task_type/título ───
// `emoji` queda SOLO para salidas de texto plano (WhatsApp / <option>); `icon` = Lucide para la UI.
const CG_TIPOS = {
  turnover:      { label: 'Turnover',         emoji: '🧹', icon: 'sparkles', chip: 'bg-blue-100 text-blue-800',       dot: 'bg-blue-500',    bar: '#3a5be0' },
  recepcion:     { label: 'Recepción',        emoji: '🛎️', icon: 'bell',     chip: 'bg-amber-100 text-amber-800',     dot: 'bg-amber-500',   bar: '#f59e0b' },
  post_remo:     { label: 'Post-Remodelación',emoji: '🔨', icon: 'hammer',   chip: 'bg-purple-100 text-purple-800',   dot: 'bg-purple-500',  bar: '#a855f7' },
  mantenimiento: { label: 'Mantenimiento',    emoji: '🔧', icon: 'wrench',   chip: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', bar: '#059669' },
  recado:        { label: 'Recado',           emoji: '🛒', icon: 'package',  chip: 'bg-slate-200 text-slate-700',     dot: 'bg-slate-500',   bar: '#6f7785' },
};
function cgTipoKey(t) {
  const tt = (t.task_type || '').toLowerCase();
  const ti = (t.title || '').toLowerCase();
  if (tt === 'cleaning' || /turnover|limpieza turnover/.test(ti)) return 'turnover';
  if (tt === 'recepcion' || /recepci/.test(ti)) return 'recepcion';
  if (tt === 'post_remo' || tt === 'post_remodelacion' || /remodel|post.?remo|obra|armar mueble|pintura|drywall|piso/.test(tt + ' ' + ti)) return 'post_remo';
  if (/recado|compra|home depot|material|basura|dumpster|proveedor/.test(ti)) return 'recado';
  if (['podada', 'plagas', 'inspeccion', 'mantenimiento', 'cesped', 'aseo'].includes(tt) || /podar|filtro|boiler|c[eé]sped|plaga|inspecc/.test(ti)) return 'mantenimiento';
  return 'mantenimiento';
}
function cgTipo(t) { return CG_TIPOS[cgTipoKey(t)] || CG_TIPOS.mantenimiento; }

// ─── ZONAS ───
const CG_ZONA_LABEL = { norte: 'Norte', sur: 'Sur', round_rock: 'Round Rock', marlin: 'Marlin' };
function cgZone(t) { return t.zone || (CG.properties.find(p => p.id === t.property_id)?.zone) || null; }
function cgZoneLabel(z) { return z ? (CG_ZONA_LABEL[z] || (z.charAt(0).toUpperCase() + z.slice(1))) : 'Sin zona'; }

// ─── EQUIPO (Limpieza / Juan / crew) ───
function cgEquipo(t) {
  if (t.assignee) return t.assignee;
  return cgTipoKey(t) === 'post_remo' ? 'Juan' : 'Limpieza';
}

// ─── Helpers ───
const cgToday = () => new Date().toISOString().slice(0, 10);
function cgPropName(id) { const p = CG.properties.find(x => x.id === id); return p ? (p.name || p.address || 'Casa') : ''; }
function cgUnitName(id) { const u = CG.units.find(x => x.id === id); return u ? (u.name || u.code || '') : ''; }
function cgIsOpen(t) { return t.status !== 'completado' && t.status !== 'cancelado'; }
function cgEsc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ════════════════════════════════════════════════════════════════
// ENTRADA + CARGA
// ════════════════════════════════════════════════════════════════
async function openCronograma(sys) {
  CG.sys = sys;
  CG.date = cgToday();
  CG.view = 'hoy';
  // Si viene de un módulo viejo (Juan/Limpieza), pre-filtra por ese equipo.
  CG.fEquipo = sys && sys._equipo ? sys._equipo : 'all';
  CG.fZona = 'all'; CG.fTipo = 'all';
  openModal(`${sys.name || 'Cronograma'}`, '<div id="cg-root" class="p-1">Cargando…</div>');
  const box = document.querySelector('#modal > div');
  if (box) { box.classList.remove('max-w-3xl'); box.classList.add('max-w-7xl'); }
  await cgLoadAll();
  cgRender();
}
window.openCronograma = openCronograma;

async function cgLoadAll() {
  CG.loading = true; CG.loadError = null;
  try {
    const [tasks, props, units] = await Promise.all([
      sb.from('pm_tasks').select('*').eq('active', true).order('scheduled_date', { ascending: true, nullsFirst: false }).limit(3000),
      sb.from('pm_properties').select('id,name,address,zone').eq('active', true).order('name'),
      sb.from('pm_units').select('id,name,code,property_id').eq('is_active', true),
    ]);
    if (tasks.error) throw tasks.error;
    CG.tasks = tasks.data || [];
    CG.properties = props.data || [];
    CG.units = units.data || [];
  } catch (e) {
    CG.loadError = e.message || String(e);
  } finally {
    CG.loading = false;
  }
}
window.cgLoadAll = cgLoadAll;

// Re-render sin cerrar el modal (para acciones que recargan)
async function cgReload() { await cgLoadAll(); cgRender(); }
window.cgReload = cgReload;

// ════════════════════════════════════════════════════════════════
// FILTRADO
// ════════════════════════════════════════════════════════════════
function cgFiltered(list) {
  return list.filter(t => {
    if (CG.fEquipo !== 'all' && cgEquipo(t).toLowerCase() !== CG.fEquipo) return false;
    if (CG.fZona !== 'all' && (cgZone(t) || 'sin') !== CG.fZona) return false;
    if (CG.fTipo !== 'all' && cgTipoKey(t) !== CG.fTipo) return false;
    return true;
  });
}
function cgOpenTasks() { return CG.tasks.filter(cgIsOpen); }

// ════════════════════════════════════════════════════════════════
// RENDER PRINCIPAL
// ════════════════════════════════════════════════════════════════
function cgRender() {
  const root = document.getElementById('cg-root');
  if (!root) return;
  if (CG.loading) { root.innerHTML = '<div class="p-8 text-center text-slate-500">' + kitLoading('Cargando cronograma…') + '</div>'; return; }
  if (CG.loadError) {
    root.innerHTML = `<div class="p-6"><div class="bg-red-50 border-2 border-red-200 rounded-xl p-5 text-center">
      <div class="mb-2 text-red-700">${osIcon('alert', { size: 36 })}</div><div class="font-bold text-red-900 mb-1">No pude cargar el cronograma</div>
      <div class="text-sm text-red-700 mb-3">${cgEsc(CG.loadError)}</div>
      <button onclick="cgReload()" class="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded">Reintentar</button></div></div>`;
    return;
  }

  const open = cgFiltered(cgOpenTasks());
  const today = cgToday();
  const overdue = open.filter(t => t.scheduled_date && t.scheduled_date < today);
  const todayN = open.filter(t => t.scheduled_date === today).length;
  const backlogN = open.filter(t => !t.scheduled_date).length;

  root.innerHTML = `
    <div class="flex flex-col" style="min-height:60vh;">
      ${cgHeader(overdue.length, todayN, backlogN)}
      <div class="flex-1 overflow-y-auto" style="max-height:74vh;">
        ${CG.view === 'hoy'     ? cgRenderHoy(open) : ''}
        ${CG.view === 'semana'  ? cgRenderSemana(open) : ''}
        ${CG.view === 'backlog' ? cgRenderBacklog(open) : ''}
      </div>
    </div>`;
}
window.cgRender = cgRender;

// ─── Header: KPIs + vistas + filtros + acciones ───
function cgHeader(overdueN, todayN, backlogN) {
  const tab = (v, label, badge) => `<button onclick="CG.view='${v}';cgRender()" class="px-3 py-1.5 text-sm font-bold rounded-lg transition ${CG.view === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">${label}${badge != null && badge !== '' ? ` <span class="text-[10px] ${CG.view === v ? 'bg-white/20' : 'bg-slate-100'} px-1.5 rounded">${badge}</span>` : ''}</button>`;

  // Opciones de filtro
  const equipos = ['all', ...[...new Set(cgOpenTasks().map(t => cgEquipo(t).toLowerCase()))].sort()];
  const zonas = ['all', ...[...new Set(cgOpenTasks().map(t => cgZone(t) || 'sin'))].sort()];
  const sel = (id, cur, opts, fn, labelFn) => `<select onchange="${fn}" class="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white">
    ${opts.map(o => `<option value="${o}" ${cur === o ? 'selected' : ''}>${labelFn(o)}</option>`).join('')}</select>`;

  return `
    <div class="space-y-2 mb-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          ${tab('hoy', osIcon('sun', { size: 13 }) + ' Hoy', overdueN ? `${todayN}·${overdueN}${osIcon('alert', { size: 10 })}` : todayN)}
          ${tab('semana', osIcon('calendar-days', { size: 13 }) + ' Semana', '')}
          ${tab('backlog', osIcon('inbox', { size: 13 }) + ' Backlog', backlogN)}
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <button onclick="cgArmarDia()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg" title="Ordena el día por zona con turnover + vencidas, almuerzo y desplazamientos automáticos">${osIcon('compass', { size: 13 })} Armar día</button>
          <button onclick="cgEnviar()" class="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg" title="Compartir el día por WhatsApp o imprimir">${osIcon('send', { size: 13 })} Enviar a Juan / equipo</button>
          <button onclick="cgReload()" class="bg-white border border-slate-300 hover:bg-slate-50 text-slate-500 text-xs px-2 py-1.5 rounded-lg" title="Recargar">${osIcon('refresh', { size: 13 })}</button>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-200 rounded-lg p-2">
        <span class="text-[11px] font-bold text-slate-500">Filtrar:</span>
        <span class="text-[11px] text-slate-500">${osIcon('users', { size: 12 })} Equipo</span>
        ${sel('eq', CG.fEquipo, equipos, "CG.fEquipo=this.value;cgRender()", o => o === 'all' ? 'Todos' : (o.charAt(0).toUpperCase() + o.slice(1)))}
        <span class="text-[11px] text-slate-500">${osIcon('map-pin', { size: 12 })} Zona</span>
        ${sel('zo', CG.fZona, zonas, "CG.fZona=this.value;cgRender()", o => o === 'all' ? 'Todas' : cgZoneLabel(o === 'sin' ? null : o))}
        <span class="text-[11px] text-slate-500">${osIcon('filter', { size: 12 })} Tipo</span>
        ${sel('ti', CG.fTipo, ['all', ...Object.keys(CG_TIPOS)], "CG.fTipo=this.value;cgRender()", o => o === 'all' ? 'Todos' : CG_TIPOS[o].label)}
        ${(CG.fEquipo !== 'all' || CG.fZona !== 'all' || CG.fTipo !== 'all') ? `<button onclick="CG.fEquipo='all';CG.fZona='all';CG.fTipo='all';cgRender()" class="text-[11px] text-amber-700 font-bold hover:underline">✕ Limpiar</button>` : ''}
        <span class="ml-auto flex items-center gap-2 text-[10px] text-slate-400">${Object.values(CG_TIPOS).map(v => `<span class="flex items-center gap-1"><span class="${v.dot} w-2 h-2 rounded-full"></span>${v.label}</span>`).join('')}</span>
      </div>
    </div>`;
}

// ─── Tarjeta de tarea (color por tipo + zona + acciones) ───
function cgTaskCard(t, opts = {}) {
  const tp = cgTipo(t);
  const z = cgZone(t);
  const eq = cgEquipo(t);
  const done = t.status === 'completado';
  const loc = [cgPropName(t.property_id), cgUnitName(t.unit_id)].filter(Boolean).join(' · ');
  const cleanTitle = (t.title || 'Tarea').replace(/^[^\p{L}\p{N}]+/u, '');
  const time = opts.showTime && t.start_at ? `<span class="text-[11px] font-bold text-slate-700 tabular-nums">${String(t.start_at).slice(11, 16) || ''}</span>` : '';
  return `
    <div class="bg-white border border-slate-200 border-l-4 rounded-lg p-2.5 flex items-start gap-2.5 ${done ? 'opacity-50' : ''}" style="border-left-color:${tp.bar}">
      <button onclick="cgToggleDone('${t.id}')" class="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[11px] flex-shrink-0 ${done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400'}" title="${done ? 'Marcar pendiente' : 'Marcar hecha'}">${done ? '✓' : ''}</button>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          ${time}
          <span class="text-sm font-bold text-slate-900 ${done ? 'line-through' : ''}">${osIcon(tp.icon, { size: 13 })} ${cgEsc(cleanTitle).slice(0, 60)}</span>
        </div>
        <div class="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
          ${loc ? `<span>${osIcon('house', { size: 11 })} ${cgEsc(loc).slice(0, 44)}</span>` : ''}
          <span class="${tp.chip} px-1.5 rounded font-bold text-[10px]">${tp.label}</span>
          ${z ? `<span class="bg-slate-100 text-slate-600 px-1.5 rounded text-[10px]">${osIcon('map-pin', { size: 10 })} ${cgZoneLabel(z)}</span>` : ''}
          <span class="bg-slate-100 text-slate-600 px-1.5 rounded text-[10px]">${osIcon('user', { size: 10 })} ${cgEsc(eq)}</span>
          ${t.travel_time ? `<span class="text-amber-600 text-[10px]">${osIcon('truck', { size: 10 })} +${t.travel_time}min</span>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <button onclick="cgReschedule('${t.id}')" class="text-slate-400 hover:text-slate-700 text-xs px-1.5 py-1 rounded hover:bg-slate-100" title="Reprogramar">${osIcon('calendar', { size: 13 })}</button>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// VISTA: HOY (vencidas arriba + hoy)
// ════════════════════════════════════════════════════════════════
function cgRenderHoy(open) {
  const today = cgToday();
  const overdue = open.filter(t => t.scheduled_date && t.scheduled_date < today)
    .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''));
  const hoy = open.filter(t => t.scheduled_date === today)
    .sort((a, b) => (a.start_at || '99').localeCompare(b.start_at || '99'));

  const fecha = new Date(today + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  return `
    <div class="space-y-4 p-1">
      ${overdue.length ? `
      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-bold text-red-700">${osIcon('alert', { size: 14 })} Atrasadas (${overdue.length})</span>
          <button onclick="cgRescheduleAllOverdue()" class="text-[11px] bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-lg">Reprogramar todas a hoy</button>
        </div>
        <div class="space-y-1.5">${overdue.map(t => cgTaskCard(t, { showTime: false })).join('')}</div>
      </div>` : ''}
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-bold text-slate-800">${osIcon('sun', { size: 14 })} Hoy · ${fecha} (${hoy.length})</span>
          ${hoy.length ? `<span class="text-[11px] text-slate-500">${cgSumDur(hoy)} de trabajo${cgSumTravel(hoy) ? ` · ${cgSumTravel(hoy)} de viajes` : ''}</span>` : ''}
        </div>
        ${hoy.length ? `<div class="space-y-1.5">${hoy.map(t => cgTaskCard(t, { showTime: true })).join('')}</div>`
          : `<div class="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400">
              <div class="mb-1">${osIcon('inbox', { size: 28 })}</div><div class="text-sm">No hay tareas para hoy.</div>
              <button onclick="cgArmarDia()" class="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg">${osIcon('compass', { size: 13 })} Armar el día</button>
            </div>`}
      </div>
    </div>`;
}
function cgMinsOf(list, f) { return list.reduce((s, t) => s + (Number(f(t)) || 0), 0); }
function cgFmtMin(m) { if (!m) return '0min'; const h = Math.floor(m / 60), mm = m % 60; return h ? `${h}h${mm ? ' ' + mm + 'm' : ''}` : `${mm}min`; }
function cgSumDur(list) { return cgFmtMin(cgMinsOf(list, t => t.task_duration || t.estimated_minutes || 45)); }
function cgSumTravel(list) { return cgFmtMin(cgMinsOf(list, t => t.travel_time)); }

// ════════════════════════════════════════════════════════════════
// VISTA: SEMANA
// ════════════════════════════════════════════════════════════════
function cgRenderSemana(open) {
  const base = new Date(cgToday() + 'T12:00:00');
  const dow = (base.getDay() + 6) % 7; // lunes=0
  const monday = new Date(base); monday.setDate(base.getDate() - dow);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d.toISOString().slice(0, 10); });
  const today = cgToday();
  const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return `<div class="p-1"><div class="grid grid-cols-1 md:grid-cols-7 gap-2">
    ${days.map((d, i) => {
      const dt = open.filter(t => t.scheduled_date === d).sort((a, b) => (a.start_at || '99').localeCompare(b.start_at || '99'));
      const isToday = d === today;
      return `<div class="bg-white border ${isToday ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-200'} rounded-lg p-2 min-h-[120px]">
        <div class="text-[11px] font-bold ${isToday ? 'text-emerald-700' : 'text-slate-500'} mb-1.5">${DOW[i]} ${d.slice(8, 10)}${isToday ? ' · HOY' : ''} ${dt.length ? `<span class="text-slate-400">(${dt.length})</span>` : ''}</div>
        <div class="space-y-1">
          ${dt.map(t => { const tp = cgTipo(t); return `<div class="text-[10px] px-1.5 py-1 rounded ${tp.chip} truncate ${t.status === 'completado' ? 'opacity-50 line-through' : ''}" title="${cgEsc(t.title)}">${osIcon(tp.icon, { size: 10 })} ${cgEsc((t.title || '').replace(/^[^\p{L}\p{N}]+/u, '')).slice(0, 22)}</div>`; }).join('') || '<div class="text-[10px] text-slate-300 italic">—</div>'}
        </div>
      </div>`;
    }).join('')}
  </div></div>`;
}

// ════════════════════════════════════════════════════════════════
// VISTA: BACKLOG (sin fecha) agrupado por tipo
// ════════════════════════════════════════════════════════════════
function cgRenderBacklog(open) {
  const backlog = open.filter(t => !t.scheduled_date);
  if (!backlog.length) return `<div class="p-8 text-center text-slate-400"><div class="mb-1">${osIcon('check-circle', { size: 28 })}</div><div class="text-sm">Backlog vacío. Todo está agendado.</div></div>`;
  const byTipo = {};
  backlog.forEach(t => { const k = cgTipoKey(t); (byTipo[k] = byTipo[k] || []).push(t); });
  return `<div class="p-1 space-y-3">
    <div class="text-[11px] text-slate-500">${backlog.length} tareas sin fecha. Reprogramalas (${osIcon('calendar', { size: 11 })}) o usá "Armar día" para agendarlas.</div>
    ${Object.entries(byTipo).sort((a, b) => b[1].length - a[1].length).map(([k, list]) => `
      <div>
        <div class="text-[11px] uppercase font-bold text-slate-600 mb-1.5">${osIcon(CG_TIPOS[k].icon, { size: 12 })} ${CG_TIPOS[k].label} (${list.length})</div>
        <div class="space-y-1.5">${list.map(t => cgTaskCard(t)).join('')}</div>
      </div>`).join('')}
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// ACCIONES (escriben en pm_tasks = capa propia del PM, NO Airtable)
// ════════════════════════════════════════════════════════════════
async function cgToggleDone(id) {
  const t = CG.tasks.find(x => x.id === id); if (!t) return;
  const done = t.status !== 'completado';
  const { error } = await sb.from('pm_tasks').update({ status: done ? 'completado' : 'pendiente', finish_at: done ? new Date().toISOString() : null }).eq('id', id);
  if (error) return toast('No se pudo actualizar: ' + error.message, 'error');
  t.status = done ? 'completado' : 'pendiente';
  // RECURRENTE: al completar una tarea con cadencia, genera la próxima ocurrencia.
  if (done && t.recurrence_days && Number(t.recurrence_days) > 0) {
    const base = t.scheduled_date || cgToday();
    const next = new Date(base + 'T00:00:00'); next.setDate(next.getDate() + Number(t.recurrence_days));
    const nd = next.toISOString().slice(0, 10);
    const nueva = {
      title: t.title, task_type: t.task_type, property_id: t.property_id, unit_id: t.unit_id,
      zone: t.zone, assignee: t.assignee, priority: t.priority, task_duration: t.task_duration,
      recurrence_days: t.recurrence_days, scheduled_date: nd, status: 'pendiente', auto_generated: true, active: true,
      notes: 'Recurrente (cada ' + t.recurrence_days + ' días).',
    };
    const { data, error: e2 } = await sb.from('pm_tasks').insert(nueva).select().single();
    if (!e2 && data) { CG.tasks.push(data); toast('✓ Hecha. Próxima programada para ' + nd + '.', 'success'); }
  }
  cgRender();
}
window.cgToggleDone = cgToggleDone;

async function cgReschedule(id) {
  const t = CG.tasks.find(x => x.id === id); if (!t) return;
  const d = await promptDialog('Nueva fecha (YYYY-MM-DD, vacío = mandar al backlog):', { defaultValue: t.scheduled_date || cgToday() });
  if (d === null) return;
  const nd = d.trim() || null;
  const { error } = await sb.from('pm_tasks').update({ scheduled_date: nd }).eq('id', id);
  if (error) return toast('No se pudo reprogramar: ' + error.message, 'error');
  t.scheduled_date = nd;
  toast(nd ? 'Reprogramada a ' + nd : 'Enviada al backlog', 'success');
  cgRender();
}
window.cgReschedule = cgReschedule;

async function cgRescheduleAllOverdue() {
  const today = cgToday();
  const overdue = cgFiltered(cgOpenTasks()).filter(t => t.scheduled_date && t.scheduled_date < today);
  if (!overdue.length) return;
  if (!confirm(`Reprogramar ${overdue.length} tarea(s) atrasada(s) a hoy?`)) return;
  const ids = overdue.map(t => t.id);
  const { error } = await sb.from('pm_tasks').update({ scheduled_date: today }).in('id', ids);
  if (error) return toast('Error: ' + error.message, 'error');
  overdue.forEach(t => t.scheduled_date = today);
  toast(`${ids.length} reprogramadas a hoy`, 'success');
  cgRender();
}
window.cgRescheduleAllOverdue = cgRescheduleAllOverdue;

// ════════════════════════════════════════════════════════════════
// 🧭 ARMAR DÍA — itinerario por zona + turnover del día + vencidas,
// con desplazamiento automático entre paradas y almuerzo fijo.
// ════════════════════════════════════════════════════════════════
async function cgArmarDia() {
  const today = cgToday();
  const open = cgFiltered(cgOpenTasks());
  // Candidatas: las de hoy + vencidas (se traen a hoy). Filtradas por equipo/zona activos.
  const cands = open.filter(t => t.scheduled_date === today || (t.scheduled_date && t.scheduled_date < today));
  if (!cands.length) return toast('No hay tareas de hoy ni atrasadas para armar el día (revisá los filtros).', 'info');

  // Config simple
  const startH = 8, lunchAtMin = 12 * 60, lunchDur = 45, travelSame = 15, travelCross = 35;
  // Ordenar por zona (agrupa) y dentro por prioridad/antigüedad
  const zoneRank = z => ({ norte: 0, round_rock: 1, sur: 2, marlin: 3 }[z] ?? 9);
  const sorted = [...cands].sort((a, b) => {
    const za = cgZone(a) || 'zzz', zb = cgZone(b) || 'zzz';
    if (zoneRank(za) !== zoneRank(zb)) return zoneRank(za) - zoneRank(zb);
    const pr = { urgente: 0, alta: 1, media: 2, baja: 3 };
    return (pr[a.priority] ?? 2) - (pr[b.priority] ?? 2);
  });

  let cursor = startH * 60; let lunchInserted = false; let prevZone = null, prevProp = null;
  const updates = [];
  for (const t of sorted) {
    const z = cgZone(t);
    // desplazamiento automático
    let travel = 0;
    if (prevProp !== null) travel = (z !== prevZone) ? travelCross : (t.property_id !== prevProp ? travelSame : 0);
    cursor += travel;
    // almuerzo fijo
    if (!lunchInserted && cursor >= lunchAtMin) { cursor += lunchDur; lunchInserted = true; }
    const start = new Date(today + 'T00:00:00');
    start.setMinutes(cursor);
    const startISO = start.toISOString();
    updates.push({ id: t.id, scheduled_date: today, start_at: startISO, travel_time: travel });
    cursor += (t.task_duration || t.estimated_minutes || 45);
    prevZone = z; prevProp = t.property_id;
  }
  // Escribir
  let ok = 0;
  for (const u of updates) {
    const { error } = await sb.from('pm_tasks').update({ scheduled_date: u.scheduled_date, start_at: u.start_at, travel_time: u.travel_time }).eq('id', u.id);
    if (!error) { ok++; const t = CG.tasks.find(x => x.id === u.id); if (t) { t.scheduled_date = u.scheduled_date; t.start_at = u.start_at; t.travel_time = u.travel_time; } }
  }
  const endH = Math.floor(cursor / 60), endM = cursor % 60;
  CG.view = 'hoy';
  toast(`Día armado: ${ok} tareas ordenadas por zona, almuerzo y viajes automáticos. Termina ~${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}.`, 'success', { duration: 6000 });
  cgRender();
}
window.cgArmarDia = cgArmarDia;

// ════════════════════════════════════════════════════════════════
// 📤 ENVIAR — arma el texto del día y abre WhatsApp / imprime.
// ════════════════════════════════════════════════════════════════
function cgDiaTexto() {
  const today = cgToday();
  const hoy = cgFiltered(cgOpenTasks()).filter(t => t.scheduled_date === today)
    .sort((a, b) => (a.start_at || '99').localeCompare(b.start_at || '99'));
  const fecha = new Date(today + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  let out = `Cronograma ${fecha}\n`;
  if (CG.fEquipo !== 'all') out += `Equipo: ${CG.fEquipo}\n`;
  out += `\n`;
  if (!hoy.length) { out += 'Sin tareas.'; return out; }
  let lastZone = null;
  hoy.forEach(t => {
    const z = cgZone(t);
    if (z !== lastZone) { out += `\n${cgZoneLabel(z)}\n`; lastZone = z; }
    const hh = t.start_at ? String(t.start_at).slice(11, 16) + ' ' : '';
    const tp = cgTipo(t);
    const loc = [cgPropName(t.property_id), cgUnitName(t.unit_id)].filter(Boolean).join(' · ');
    out += `• ${hh}${tp.emoji} ${(t.title || '').replace(/^[^\p{L}\p{N}]+/u, '')}${loc ? ' (' + loc + ')' : ''}\n`;
  });
  return out;
}
async function cgEnviar() {
  const how = await promptDialog('¿Enviar por WhatsApp o Imprimir? (escribí "whatsapp" o "imprimir")', { defaultValue: 'whatsapp' });
  if (!how) return;
  const texto = cgDiaTexto();
  if (/imprim|print|pdf/i.test(how)) {
    const w = window.open('', '_blank');
    if (!w) return toast('Permití las ventanas emergentes.', 'error');
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Cronograma del día</title><body style="font-family:-apple-system,sans-serif;padding:24px;white-space:pre-wrap;font-size:14px;line-height:1.6">${cgEsc(texto)}<script>onload=()=>{setTimeout(()=>print(),300)}<\/script></body>`);
    w.document.close();
  } else {
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
  }
  toast('Cronograma del día listo para enviar.', 'success');
}
window.cgEnviar = cgEnviar;
