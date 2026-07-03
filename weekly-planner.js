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
  crewHourViewDate: null, // null o YYYY-MM-DD
  // V2 — portado de ops-planner Juan Austin
  backlog: [],                  // activities con date=null
  taskTemplates: [],            // wp_task_templates (catálogo)
  dayTemplates: [],             // wp_day_templates
  recurring: [],                // wp_recurring
  sidePanelTab: 'resources',    // resources | backlog | templates | daytemplates | recurring
  draggedTemplateId: null,
  draggedBacklogId: null,
  draggedDayTemplateId: null,
  showChecklistFor: null,       // activityId si está abierto modal checklist
  printDate: null,              // si está set, se muestra vista print en lugar de grilla
  houseFilter: 'all',           // 'all' | projectId | 'name:Nombre' — filtra qué casa(s) ver en el calendario
  liderFilter: 'all',           // A) filtro por crew/líder
  stageFilter: 'all',           // A) filtro por etapa
  onlyLate: false,              // A) solo atrasadas
  hideEmpty: true,              // A) colapsar casas sin tareas esta semana
  openGroups: { crew:false, specialist:false, tool:false, vehicle:false, other:false }, // sidebar colapsado por default
  sidebarHidden: typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 1023px)').matches : false // oculto por default en mobile
};

function wpFmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday:'short', day:'numeric', month:'short' });
}
// CORRECTNESS: usar fecha LOCAL, no UTC. En Austin (UTC-5/6),
// new Date('2026-06-04').toISOString() devolvía '2026-06-03' a medianoche
// local — desfasaba 1 día todo el calendario (drag&drop, "Hoy", reprogramar).
function wpDateOnly(d) {
  const x = (d instanceof Date) ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
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
  const [
    resRes, actRes, projRes, catRes,
    // V2 — backlog, plantillas, recurrentes, all activities globales
    blRes, ttRes, dtRes, rcRes, allActsRes, movRes, prRes, wpPayRes
  ] = await Promise.all([
    sb.from('resources').select('*').eq('active', true).order('type').order('name'),
    sb.from('weekly_activities').select('*').gte('date', start).lte('date', end).order('date'),
    sb.from('remodel_projects').select('id,name,address,status,sqft,budget_total,activities,start_date,end_date_estimated,completed_at').is('archived_at', null).order('created_at', { ascending: false }),
    sb.from('remodel_catalog_items').select('code,description,depends_on').then(r => r.data || []).catch(() => []),
    sb.from('weekly_activities').select('*').is('date', null).order('priority', { ascending: false }).then(r => r).catch(() => ({ data: [] })),
    sb.from('wp_task_templates').select('*').eq('active', true).order('category').order('name').then(r => r).catch(() => ({ data: [] })),
    sb.from('wp_day_templates').select('*').order('updated_at', { ascending: false }).then(r => r).catch(() => ({ data: [] })),
    sb.from('wp_recurring').select('*').eq('active', true).then(r => r).catch(() => ({ data: [] })),
    sb.from('weekly_activities').select('*').then(r => r).catch(() => ({ data: [] })),
    sb.from('weekly_activity_moves').select('*').order('moved_at', { ascending: false }).limit(2000).then(r => r).catch(() => ({ data: [] })),
    sb.from('remodel_project_resources').select('*').is('archived_at', null).then(r => r).catch(() => ({ data: [] })),
    sb.from('remodel_worker_pay_summary').select('*').then(r => r).catch(() => ({ data: [] }))
  ]);
  wpState.moves = (movRes && movRes.data) || [];
  wpState.projectResources = (prRes && prRes.data) || [];
  wpState.workerPay = (wpPayRes && wpPayRes.data) || [];
  wpState.resources = resRes.data || [];
  wpState.activities = allActsRes.data || actRes.data || [];  // usamos TODAS para soportar overdue global
  wpState.projects = projRes.data || [];
  wpState.catalog = Array.isArray(catRes) ? catRes : (catRes.data || []);
  wpState.backlog = blRes.data || [];
  wpState.taskTemplates = ttRes.data || [];
  wpState.dayTemplates = dtRes.data || [];
  wpState.recurring = rcRes.data || [];
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
// ─── C) Reskin premium (glass, claro/oscuro, densidad, estados consistentes) — SOLO visual, no toca lógica/data.
//    Capa CSS scopeada a #wp-root; los estados (done/atrasada/aplazada/crítica) se remapean a tokens del OS.
function wpInjectTheme() {
  if (document.getElementById('wp-theme-css')) return;
  const st = document.createElement('style'); st.id = 'wp-theme-css';
  st.textContent = `
  /* ===== Planner Semanal — diseño premium OS ===== */
  #modal:has(#wp-root) > div{max-width:96vw !important;width:1500px;border-radius:20px;border:1px solid rgba(15,23,42,.08);box-shadow:0 40px 90px -40px rgba(2,6,23,.5)}
  #wp-root{font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;--wa1:#12b5a0;--wa2:#2f6ef0;--wpos:#0ea371;--wneg:#e0455f;--wamb:#c07d16;--wink:#0f1c2e;--wmut:#64748b;--wsurf:#f6f8fc;--wglass:#fff;--wbord:rgba(15,23,42,.09)}
  #wp-root .rounded,#wp-root .rounded-lg{border-radius:10px}
  /* Toolbar: pills uniformes, densidad */
  #wp-root [onclick^="wpNav"],#wp-root button[onclick]{transition:.15s}
  #wp-root .flex.items-center.justify-between.mb-3{gap:10px}
  #wp-root .border-2{border-width:1px}
  /* Celda calendario: glass + hover + hoy */
  #wp-root td{transition:background .15s}
  #wp-root td:hover{background:rgba(47,110,240,.04)}
  #wp-root table{border-collapse:separate;border-spacing:0}
  #wp-root thead th{position:sticky;top:0;z-index:2;backdrop-filter:blur(8px)}
  /* Chips de estado — color CONSISTENTE (barra izquierda) */
  #wp-root .border-2.rounded{border-radius:9px;box-shadow:0 1px 2px rgba(2,6,23,.04)}
  #wp-root .bg-emerald-50{background:rgba(14,163,113,.10) !important;border-color:rgba(14,163,113,.4) !important}
  #wp-root .bg-blue-50.border-blue-300{background:rgba(47,110,240,.10) !important;border-color:rgba(47,110,240,.4) !important}
  #wp-root .bg-rose-50{background:rgba(224,69,95,.10) !important;border-left-color:var(--wneg) !important}
  #wp-root .bg-amber-50{background:rgba(192,125,22,.12) !important}
  #wp-root .bg-red-50{background:rgba(224,69,95,.09) !important}
  #wp-root .bg-red-600{background:var(--wneg) !important}#wp-root .bg-amber-600{background:var(--wamb) !important}#wp-root .bg-emerald-600{background:var(--wpos) !important}
  /* ===== TARJETA DE ACTIVIDAD PREMIUM (mismo lenguaje que la vista Desviación) ===== */
  #wp-root td{padding:5px !important;vertical-align:top}
  #wp-root .space-y-1{display:flex;flex-direction:column;gap:6px}
  #wp-root .wp-acard{position:relative;background:var(--wglass);border:1px solid var(--wbord);border-left:3px solid var(--wmut);border-radius:10px;padding:8px 10px;transition:.16s;box-shadow:0 1px 2px rgba(2,6,23,.05)}
  #wp-root .wp-acard:hover{border-color:var(--wa2);transform:translateY(-1px);box-shadow:0 6px 16px -8px rgba(2,6,23,.3)}
  #wp-root .wp-acard[data-st="done"]{border-left-color:var(--wpos)}
  #wp-root .wp-acard[data-st="late"],#wp-root .wp-acard[data-st="critical"],#wp-root .wp-acard[data-st="conflict"]{border-left-color:var(--wneg)}
  #wp-root .wp-acard[data-st="postponed"],#wp-root .wp-acard[data-st="dep"]{border-left-color:var(--wamb)}
  #wp-root .wp-acard[data-st="progress"]{border-left-color:var(--wa2)}
  #wp-root .wp-acard[data-st="cancelled"]{opacity:.5}
  #wp-root .wp-ac-top{display:flex;align-items:flex-start;gap:8px}
  #wp-root .wp-ac-chk{margin-top:2px;cursor:pointer;flex-shrink:0;accent-color:var(--wpos)}
  #wp-root .wp-ac-body{flex:1;min-width:0;cursor:pointer}
  #wp-root .wp-ac-name{font-size:11.5px;font-weight:650;line-height:1.32;color:var(--wink);word-break:break-word}
  #wp-root .wp-ac-name.wp-done{text-decoration:line-through;opacity:.5}
  #wp-root .wp-ac-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px}
  #wp-root .wp-ac-stage{font-size:9px;color:var(--wmut);text-transform:uppercase;letter-spacing:.5px;font-weight:700}
  #wp-root .wp-ac-day{font-size:8.5px;color:var(--wmut);background:rgba(100,116,139,.14);padding:1px 6px;border-radius:20px;font-weight:600;white-space:nowrap}
  #wp-root .wp-ac-st{font-size:8.5px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap}
  #wp-root .wp-acard[data-st="done"] .wp-ac-st{background:rgba(14,163,113,.13);color:var(--wpos)}
  #wp-root .wp-acard[data-st="late"] .wp-ac-st,#wp-root .wp-acard[data-st="critical"] .wp-ac-st,#wp-root .wp-acard[data-st="conflict"] .wp-ac-st{background:rgba(224,69,95,.13);color:var(--wneg)}
  #wp-root .wp-acard[data-st="postponed"] .wp-ac-st,#wp-root .wp-acard[data-st="dep"] .wp-ac-st{background:rgba(192,125,22,.15);color:var(--wamb)}
  #wp-root .wp-acard[data-st="progress"] .wp-ac-st{background:rgba(47,110,240,.13);color:var(--wa2)}
  #wp-root .wp-ac-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}#wp-root .wp-ac-tags:empty{display:none}
  #wp-root .wp-chip{font-size:8.5px;font-weight:700;padding:2px 7px;border-radius:20px;background:rgba(100,116,139,.13);color:var(--wmut);border:none;cursor:pointer;line-height:1.4}
  #wp-root .wp-chip.est{background:rgba(138,123,255,.15);color:#7b5bef}
  #wp-root .wp-chip.ok{background:rgba(14,163,113,.13);color:var(--wpos)}
  #wp-root .wp-res{font-size:8.5px;padding:2px 7px;border-radius:20px;background:rgba(47,110,240,.11);color:var(--wa2);font-weight:600;white-space:nowrap}
  #wp-root .wp-ac-warn{font-size:9px;color:var(--wneg);font-weight:700;margin-top:5px}
  #wp-root .wp-ac-sug{font-size:9px;color:var(--wamb);font-weight:600;margin-top:4px}
  /* barra de filtros + meta de casa */
  #wp-root .wp-filters{padding:2px 0}
  #wp-root .wp-crew{font-weight:600}
  #wp-root .wp-filters select,#wp-root .wp-fbtn{transition:.15s}
  /* ===== MODO OSCURO ===== */
  html[data-osreskin="dark"] #wp-root .wp-chip.est{background:rgba(138,123,255,.2);color:#b9aeff}
  html[data-osreskin="dark"] #wp-root .wp-crew{background:rgba(255,255,255,.08) !important;color:#c5cede !important}
  html[data-osreskin="dark"] #wp-root .wp-filters .bg-white{background:rgba(255,255,255,.06) !important}
  html[data-osreskin="dark"] #modal:has(#wp-root) > div{background:linear-gradient(180deg,#0b0f18,#070a11) !important;border-color:rgba(255,255,255,.08) !important;color:#e7ecf5}
  html[data-osreskin="dark"] #wp-root{--wink:#e7ecf5;--wmut:#8792a5;--wsurf:rgba(255,255,255,.05);--wglass:rgba(255,255,255,.04);--wbord:rgba(255,255,255,.09);color:#e7ecf5}
  html[data-osreskin="dark"] #wp-root .text-slate-900,html[data-osreskin="dark"] #wp-root .font-bold{color:#e7ecf5 !important}
  html[data-osreskin="dark"] #wp-root .text-slate-700,html[data-osreskin="dark"] #wp-root .text-slate-600{color:#c5cede !important}
  html[data-osreskin="dark"] #wp-root .text-slate-500,html[data-osreskin="dark"] #wp-root .text-slate-400{color:#8792a5 !important}
  html[data-osreskin="dark"] #wp-root .bg-white{background:rgba(255,255,255,.045) !important;color:#e7ecf5}
  html[data-osreskin="dark"] #wp-root .bg-slate-50,html[data-osreskin="dark"] #wp-root .bg-slate-100{background:rgba(255,255,255,.06) !important;color:#c5cede}
  html[data-osreskin="dark"] #wp-root .border-slate-200,html[data-osreskin="dark"] #wp-root .border-slate-300,html[data-osreskin="dark"] #wp-root .border-b,html[data-osreskin="dark"] #wp-root .border-r{border-color:rgba(255,255,255,.09) !important}
  html[data-osreskin="dark"] #wp-root td:hover{background:rgba(79,141,255,.07)}
  html[data-osreskin="dark"] #wp-root .bg-slate-900{background:linear-gradient(135deg,#1b2436,#141b29) !important;color:#e7ecf5}
  html[data-osreskin="dark"] #wp-root .bg-emerald-50{background:rgba(72,214,156,.13) !important;border-color:rgba(72,214,156,.34) !important}
  html[data-osreskin="dark"] #wp-root .bg-emerald-50 .text-slate-900,html[data-osreskin="dark"] #wp-root .bg-emerald-50 *{color:#c9f3e2}
  html[data-osreskin="dark"] #wp-root .bg-blue-50{background:rgba(79,141,255,.14) !important;border-color:rgba(79,141,255,.36) !important}
  html[data-osreskin="dark"] #wp-root .bg-rose-50{background:rgba(240,104,122,.14) !important}
  html[data-osreskin="dark"] #wp-root .bg-amber-50{background:rgba(231,182,94,.14) !important}
  html[data-osreskin="dark"] #wp-root .bg-red-50{background:rgba(240,104,122,.12) !important}
  html[data-osreskin="dark"] #wp-root .bg-violet-50,html[data-osreskin="dark"] #wp-root .bg-violet-100{background:rgba(138,123,255,.16) !important}html[data-osreskin="dark"] #wp-root .text-violet-700{color:#b9aeff !important}
  html[data-osreskin="dark"] #wp-root .bg-blue-50.border-blue-300,html[data-osreskin="dark"] #wp-root .text-blue-800,html[data-osreskin="dark"] #wp-root .text-blue-700{color:#8fb4ff !important}
  html[data-osreskin="dark"] #wp-root .bg-emerald-50.text-emerald-700,html[data-osreskin="dark"] #wp-root .text-emerald-700{color:#5fe0b8 !important}
  html[data-osreskin="dark"] #wp-root input,html[data-osreskin="dark"] #wp-root select{background:rgba(255,255,255,.06) !important;color:#e7ecf5 !important;border-color:rgba(255,255,255,.12) !important}
  html[data-osreskin="dark"] #wp-root select option{background:#141b29;color:#e7ecf5}
  /* ===== Vista Desviación (Plan vs Real) — premium claro/oscuro ===== */
  #wp-dev{--dink:#0f1c2e;--dmut:#64748b;--dbord:rgba(15,23,42,.09);--dglass:#fff;--dpos:#0ea371;--dneg:#e0455f;--damb:#c07d16;--dblue:#2f6ef0;color:var(--dink);font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  #wp-dev .dv-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
  #wp-dev .dv-card{background:var(--dglass);border:1px solid var(--dbord);border-radius:14px;padding:16px}
  #wp-dev .dv-lab{font-size:9.5px;letter-spacing:1.3px;text-transform:uppercase;color:var(--dmut);font-weight:700}
  #wp-dev .dv-big{font-size:26px;font-weight:750;margin-top:6px;letter-spacing:-.5px}
  #wp-dev .dv-meta{font-size:11px;color:var(--dmut);margin-top:5px}
  #wp-dev .dv-pos{color:var(--dpos)}#wp-dev .dv-neg{color:var(--dneg)}#wp-dev .dv-amb{color:var(--damb)}
  #wp-dev .dv-sec{background:var(--dglass);border:1px solid var(--dbord);border-radius:14px;padding:16px;margin-bottom:14px}
  #wp-dev .dv-sec h3{font-size:13px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:7px}
  #wp-dev table{width:100%;border-collapse:collapse;font-size:12.5px}
  #wp-dev th{text-align:left;color:var(--dmut);font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;padding:7px 8px;border-bottom:1px solid var(--dbord);font-weight:700}
  #wp-dev td{padding:9px 8px;border-bottom:1px solid var(--dbord)}
  #wp-dev .dv-track{position:relative;height:22px;background:rgba(100,116,139,.12);border-radius:6px;overflow:hidden}
  #wp-dev .dv-bar{position:absolute;height:9px;border-radius:5px;top:2px}
  #wp-dev .dv-bar.plan{background:rgba(47,110,240,.5);top:2px}#wp-dev .dv-bar.real{background:linear-gradient(90deg,var(--damb),var(--dneg));top:12px}
  #wp-dev .dv-chip{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px}
  #wp-dev .dv-chip.ok{background:rgba(14,163,113,.12);color:var(--dpos)}#wp-dev .dv-chip.bad{background:rgba(224,69,95,.12);color:var(--dneg)}#wp-dev .dv-chip.warn{background:rgba(192,125,22,.14);color:var(--damb)}
  #wp-dev .dv-brain{background:linear-gradient(180deg,rgba(138,123,255,.08),rgba(79,141,255,.04));border:1px solid rgba(138,123,255,.25)}
  #wp-dev .dv-ins{display:flex;gap:9px;padding:9px 0;border-bottom:1px solid var(--dbord);font-size:12.5px;line-height:1.5}#wp-dev .dv-ins:last-child{border:none}
  #wp-dev .dv-back{background:none;border:1px solid var(--dbord);color:var(--dmut);border-radius:9px;padding:7px 13px;font-size:12px;font-weight:600;cursor:pointer}#wp-dev .dv-back:hover{color:var(--dink)}
  @media (max-width:820px){#wp-dev .dv-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
  html[data-osreskin="dark"] #wp-dev{--dink:#e7ecf5;--dmut:#8792a5;--dbord:rgba(255,255,255,.09);--dglass:rgba(255,255,255,.04)}
  html[data-osreskin="dark"] #modal:has(#wp-dev) > div{background:linear-gradient(180deg,#0b0f18,#070a11) !important;color:#e7ecf5}
  html[data-osreskin="dark"] #wp-dev .dv-track{background:rgba(255,255,255,.06)}`;
  document.head.appendChild(st);
}
window.wpInjectTheme = wpInjectTheme;

async function openWeeklyPlanner(sys) {
  wpState.sys = sys;
  wpInjectTheme();
  await wpLoadAll();
  // Generar tareas recurrentes vencidas (silencioso)
  try { await wpGenerateRecurringDue(); await wpLoadAll(); } catch(e) { console.warn('recurring', e); }
  // Interceptar closeModal del sistema (X, ESC, backdrop) UNA sola vez por sesión:
  // si seguimos dentro del planner y estamos en un sub-modal, volver al planner
  // en lugar de cerrar todo. Solo cerrar de verdad si estamos en el root del planner.
  if (!window._wpOriginalCloseModal) {
    window._wpOriginalCloseModal = window.closeModal;
    window.closeModal = function wpInterceptedCloseModal() {
      // Si no hay planner activo, comportamiento normal
      if (!wpState.sys) return window._wpOriginalCloseModal();
      // ¿Estamos en el root del planner? (wp-root existe en el DOM)
      const isRoot = !!document.getElementById('wp-root');
      if (isRoot) {
        // El usuario quiere salir del planner del todo
        wpState.sys = null;
        return window._wpOriginalCloseModal();
      }
      // Estamos en un sub-modal → volver al planner sin cerrar
      wpBackToPlanner();
    };
  }
  openModal(`📅 ${sys.name}`, '<div id="wp-root"></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  wpRender();
}

// Vuelve al planner desde cualquier sub-vista SIN cerrar el modal global ni
// recargar la DB. Reemplaza el contenido del modal por el grid del planner
// e invoca wpRender() en sincrónico. Si el sys no está cargado (raro), cae al
// flujo full de openWeeklyPlanner.
function wpBackToPlanner(opts) {
  opts = opts || {};
  if (!wpState.sys) return closeModal();
  if (opts.reload) {
    // recargar DB en background y re-render
    openModal(`📅 ${wpState.sys.name}`, '<div id="wp-root"></div>');
    const inner = document.querySelector('#modal > div');
    if (inner) {
      ['max-w-sm','max-w-md','max-w-lg','max-w-xl','max-w-2xl','max-w-3xl','max-w-4xl','max-w-5xl','max-w-6xl'].forEach(c => inner.classList.remove(c));
      inner.classList.add('max-w-7xl');
    }
    document.getElementById('wp-root').innerHTML = '<div class="text-center text-slate-400 py-8 text-sm">Cargando…</div>';
    wpLoadAll().then(wpRender);
    return;
  }
  openModal(`📅 ${wpState.sys.name}`, '<div id="wp-root"></div>');
  const inner = document.querySelector('#modal > div');
  if (inner) {
    ['max-w-sm','max-w-md','max-w-lg','max-w-xl','max-w-2xl','max-w-3xl','max-w-4xl','max-w-5xl','max-w-6xl'].forEach(c => inner.classList.remove(c));
    inner.classList.add('max-w-7xl');
  }
  wpRender();
}
window.wpBackToPlanner = wpBackToPlanner;

function wpRender() {
  wpInjectTheme();
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

  // Filtro por casa (si está activo, sólo muestra esa)
  const allHomes = homes.slice();
  let filteredHomes = wpState.houseFilter === 'all' ? homes : homes.filter(h => h.id === wpState.houseFilter);
  // A) Colapsar casas sin tareas visibles esta semana (con filtros aplicados)
  const wpWeekSet = new Set(days.map(wpDateOnly));
  const wpHomeWeekActs = h => wpState.activities.filter(a => (a.project_id === h.id || (!a.project_id && h.id.startsWith('name:') && a.property_name === h.id.slice(5))) && wpWeekSet.has(a.date) && wpActPassesFilters(a));
  const wpAnyFilter = wpState.onlyLate || wpState.stageFilter !== 'all' || wpState.liderFilter !== 'all';
  if (wpState.hideEmpty || wpAnyFilter) filteredHomes = filteredHomes.filter(h => wpHomeWeekActs(h).length > 0);

  // Detectar conflictos: misma resource en 2+ celdas el mismo día
  const conflicts = wpDetectConflicts();
  // A) opciones de filtros (líder/etapa)
  const wpAllStages = [...new Set(wpState.activities.map(a => a.stage).filter(Boolean))].sort();
  const wpAllCrews = [...new Set((wpState.resources || []).filter(r => r.type === 'crew').map(r => r.name))].sort();

  // KPIs de avance esta semana (solo casas visibles, excluye terminadas)
  const totalThisWeek = visibleActs.length;
  const doneThisWeek = visibleActs.filter(a => a.status === 'done').length;
  const progressPct = totalThisWeek ? Math.round(doneThisWeek/totalThisWeek*100) : 0;
  // S7 — Overdue (atrasadas globales, no solo de la semana visible)
  const todayIso = wpDateOnly(new Date());
  const overdueAll = wpState.activities.filter(a =>
    a.status !== 'done' && a.status !== 'cancelled' && a.date && a.date < todayIso
  );
  const overdueCount = overdueAll.length;
  // ⚠️ Críticas atrasadas (subset de overdue)
  const criticasAtrasadas = overdueAll.filter(a => a.priority === 'critical' || a.priority === 'urgent');
  const tomorrowIso = wpDateOnly(wpAddDays(new Date(), 1));
  const criticasBanner = criticasAtrasadas.length ? `
    <div class="bg-gradient-to-r from-rose-600 to-rose-800 text-white border border-rose-700 rounded-lg px-3 py-2 mb-2 shadow-md">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <div class="text-2xl">⚠️</div>
          <div>
            <div class="text-sm font-bold uppercase tracking-wide">${criticasAtrasadas.length} actividad${criticasAtrasadas.length>1?'es':''} de ruta crítica atrasada${criticasAtrasadas.length>1?'s':''}</div>
            <div class="text-[11px] opacity-90">Cada día perdido empuja la fecha de entrega final · ${[...new Set(criticasAtrasadas.map(a => a.property_name||a.project_id))].length} casa(s) afectada(s)</div>
          </div>
        </div>
        <button onclick="wpToggleCriticasDetails()" class="text-[11px] bg-white text-rose-700 hover:bg-rose-50 font-bold px-3 py-1 rounded">${wpState.showCriticasDetails?'▴ Ocultar':'▾ Ver cuáles'}</button>
      </div>
      ${wpState.showCriticasDetails ? `
        <div class="mt-2 space-y-1 max-h-40 overflow-y-auto bg-rose-900/30 rounded p-2">
          ${criticasAtrasadas.map(t => {
            const daysLate = Math.round((new Date(todayIso+'T00:00:00') - new Date(t.date+'T00:00:00'))/86400000);
            return `<div class="flex items-center justify-between bg-white/95 border border-rose-300 rounded px-2 py-1 text-[11px] text-slate-900 cursor-pointer hover:bg-white" onclick="wpEditActivity('${t.id}')">
              <div class="flex-1 min-w-0">
                <div class="font-bold truncate text-rose-900">⚠️ ${(t.activity_name||'').replace(/</g,'&lt;')}</div>
                <div class="text-[10px] text-slate-600">🏠 ${(t.property_name||'').replace(/</g,'&lt;')}${t.stage?` · ${t.stage}`:''}</div>
              </div>
              <span class="bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 rounded ml-2">⏰ ${daysLate}d</span>
            </div>`;
          }).join('')}
        </div>
      ` : ''}
    </div>
  ` : '';
  const overdueBanner = overdueCount ? `
    <div class="bg-red-50 border border-red-300 rounded-lg px-3 py-2 mb-2 flex items-start gap-2">
      <div class="text-xl">⚠️</div>
      <div class="flex-1">
        <div class="flex items-center justify-between flex-wrap gap-1">
          <div class="text-xs font-bold text-red-800">${overdueCount} actividad(es) atrasada(s) sin completar</div>
          <div class="flex gap-1">
            <button onclick="wpReprogramAllOverdue('${todayIso}')" class="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-bold">Reprog. todas → Hoy</button>
            <button onclick="wpReprogramAllOverdue('${tomorrowIso}')" class="text-[10px] bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded font-bold">→ Mañana</button>
            <button onclick="wpToggleOverdueDetails()" class="text-[10px] bg-white border border-red-300 text-red-700 px-2 py-0.5 rounded">${wpState.showOverdueDetails?'▴ Ocultar':'▾ Ver'}</button>
          </div>
        </div>
        ${wpState.showOverdueDetails ? `
          <div class="mt-2 space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
            ${overdueAll.map(t => `
              <div class="flex items-center justify-between bg-white border border-red-200 rounded px-2 py-1 text-[11px]">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-slate-900 truncate">${(t.activity_name||'').replace(/</g,'&lt;')} <span class="text-slate-500">— ${(t.property_name||'').replace(/</g,'&lt;')}</span></div>
                  <div class="text-[9px] text-slate-500">${t.date}${t.stage?' · '+t.stage:''}${t.activity_code?' · '+t.activity_code:''}</div>
                </div>
                <div class="flex gap-0.5 ml-2">
                  <input type="date" value="${todayIso}" onchange="wpReprogramTask('${t.id}', this.value)" class="border border-slate-300 rounded px-1 py-0.5 text-[10px]" title="Reprogramar">
                  <button onclick="wpMarkActivityDone('${t.id}', true).then(() => wpLoadAll().then(wpRender))" class="bg-emerald-600 hover:bg-emerald-700 text-white px-1.5 py-0.5 rounded text-[10px] font-bold" title="Marcar como hecha">✓</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[80vh]">
      ${criticasBanner}
      ${overdueBanner}
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
          <button onclick="wpOpenCrewPay()" class="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded font-bold" title="Cuanto gana cada persona por propiedad — de Airtable">💵 Pago crew</button>
          <button onclick="wpOpenImportExcel()" class="text-xs bg-violet-50 hover:bg-violet-100 border border-violet-300 text-violet-700 px-3 py-1.5 rounded font-bold" title="Subir Excel de cronograma (Estimador Pro) → llena este calendario">📥 Importar Excel</button>
          <button onclick="wpToggleSidebar()" class="lg:hidden text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-1.5 rounded font-bold" title="Mostrar/ocultar panel lateral">${wpState.sidebarHidden?'📂':'📁'}</button>
          <button onclick="wpOpenMonthView()" class="text-xs bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-700 px-3 py-1.5 rounded font-bold" title="Vista mensual del calendario">📅 Mes</button>
          <button onclick="wpOpenIcsExport()" class="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3 py-1.5 rounded font-bold" title="Exportar tareas a Google Calendar / iCloud (.ics)">📥 Calendario</button>
          <button onclick="wpOpenWorkerMobile()" class="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded font-bold" title="Vista del día optimizada para celular del líder/obrero">📱 Vista obrero</button>
          <button onclick="wpOpenAnalytics()" class="text-xs bg-violet-50 hover:bg-violet-100 border border-violet-300 text-violet-700 px-3 py-1.5 rounded font-bold" title="Análisis y reportes del planner — cumplimiento, atrasos, velocidad, etapas">📊 Reporte</button>
          <button onclick="wpOpenDeviation()" class="text-xs bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 px-3 py-1.5 rounded font-bold" title="Plan inicial vs Real — desviacion por tarea/etapa/casa + Cerebro de planeacion">📉 Desviación</button>
          <select onchange="wpSetHouseFilter(this.value)" class="text-xs bg-white border border-slate-300 rounded px-2 py-1.5 font-bold max-w-[200px]" title="Filtrar calendario por casa">
            <option value="all" ${wpState.houseFilter==='all'?'selected':''}>🏘️ Todas las casas (${allHomes.length})</option>
            ${allHomes.map(h => `<option value="${h.id.replace(/"/g,'&quot;')}" ${wpState.houseFilter===h.id?'selected':''}>🏠 ${(h.name||'').replace(/</g,'&lt;')}</option>`).join('')}
          </select>
          <button onclick="wpOpenPrintPicker()" class="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3 py-1.5 rounded font-bold" title="Vista entregable imprimible del día">🖨️ Imprimir día</button>
          <button onclick="wpToggleResourceForm()" class="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded">+ Recurso</button>
        </div>
      </div>

      <!-- A) BARRA DE FILTROS -->
      <div class="wp-filters flex items-center gap-2 flex-wrap mb-2">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Filtros</span>
        <select onchange="wpSetLiderFilter(this.value)" class="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold" title="Filtrar por crew/líder">
          <option value="all">👷 Todos los crews</option>
          ${wpAllCrews.map(c => `<option value="${(c || '').replace(/"/g, '&quot;')}" ${wpState.liderFilter === c ? 'selected' : ''}>${(c || '').replace(/</g, '&lt;')}</option>`).join('')}
        </select>
        <select onchange="wpSetStageFilter(this.value)" class="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold" title="Filtrar por etapa">
          <option value="all">🧱 Todas las etapas</option>
          ${wpAllStages.map(s => `<option value="${(s || '').replace(/"/g, '&quot;')}" ${wpState.stageFilter === s ? 'selected' : ''}>${(s || '').replace(/</g, '&lt;')}</option>`).join('')}
        </select>
        <button onclick="wpToggleOnlyLate()" class="wp-fbtn text-xs px-2.5 py-1 rounded-lg font-semibold border ${wpState.onlyLate ? 'wp-fon bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}">⏰ Solo atrasadas</button>
        <button onclick="wpToggleHideEmpty()" class="wp-fbtn text-xs px-2.5 py-1 rounded-lg font-semibold border bg-white text-slate-600 border-slate-300 hover:bg-slate-50" title="Mostrar u ocultar casas sin tareas esta semana">${wpState.hideEmpty ? '📦 Ocultar vacías: ON' : '👁 Ocultar vacías: OFF'}</button>
        ${(wpAnyFilter) ? `<button onclick="wpState.liderFilter='all';wpState.stageFilter='all';wpState.onlyLate=false;wpRender()" class="text-xs px-2 py-1 text-slate-400 hover:text-slate-700 underline">limpiar</button>` : ''}
        <span class="text-[10px] text-slate-400 ml-auto">${filteredHomes.length} casa(s) visible(s)</span>
      </div>
      <!-- BODY: Sidebar tabbed + Grid calendario -->
      <div class="flex gap-3 flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
        <!-- SIDEBAR con tabs (Recursos | Backlog | Catálogo | Plantillas | Recurrentes) -->
        <div class="${wpState.sidebarHidden?'hidden lg:flex':'flex'} w-full lg:w-72 flex-shrink-0 border border-slate-200 rounded-lg overflow-hidden lg:flex-col max-h-[40vh] lg:max-h-none">
          <!-- Tabs -->
          <div class="flex border-b border-slate-200 bg-slate-50 text-[10px] font-bold">
            <button onclick="wpSetSideTab('resources')" class="flex-1 px-1 py-2 ${wpState.sidePanelTab==='resources'?'bg-white border-b-2 border-slate-900':'text-slate-500 hover:bg-slate-100'}">👷 Recursos</button>
            <button onclick="wpSetSideTab('backlog')" class="flex-1 px-1 py-2 ${wpState.sidePanelTab==='backlog'?'bg-white border-b-2 border-slate-900':'text-slate-500 hover:bg-slate-100'}">📥 Backlog <span class="bg-slate-900 text-white px-1 rounded">${(wpState.backlog||[]).length}</span></button>
            <button onclick="wpSetSideTab('templates')" class="flex-1 px-1 py-2 ${wpState.sidePanelTab==='templates'?'bg-white border-b-2 border-slate-900':'text-slate-500 hover:bg-slate-100'}">📚 Tareas</button>
            <button onclick="wpSetSideTab('daytemplates')" class="flex-1 px-1 py-2 ${wpState.sidePanelTab==='daytemplates'?'bg-white border-b-2 border-blue-600':'text-slate-500 hover:bg-slate-100'}">🗂️ Días <span class="bg-blue-600 text-white px-1 rounded">${(wpState.dayTemplates||[]).length}</span></button>
            <button onclick="wpSetSideTab('recurring')" class="flex-1 px-1 py-2 ${wpState.sidePanelTab==='recurring'?'bg-white border-b-2 border-violet-600':'text-slate-500 hover:bg-slate-100'}">🔁 Recur <span class="bg-violet-600 text-white px-1 rounded">${(wpState.recurring||[]).length}</span></button>
          </div>
          <div class="flex-1 overflow-y-auto">
            ${wpState.sidePanelTab === 'resources' ? wpRenderTeamPanel(allHomes) : ''}
            ${wpState.sidePanelTab === 'backlog' ? wpRenderBacklogPanel() : ''}
            ${wpState.sidePanelTab === 'templates' ? wpRenderTaskTemplatesPanel() : ''}
            ${wpState.sidePanelTab === 'daytemplates' ? wpRenderDayTemplatesPanel() : ''}
            ${wpState.sidePanelTab === 'recurring' ? wpRenderRecurringPanel() : ''}
          </div>
          ${wpState.sidePanelTab === 'resources' && wpState.showResourceForm ? wpRenderResourceForm() : ''}
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
                  return `<th class="py-2 px-2 border-b border-r border-slate-200 min-w-[110px] lg:min-w-[140px] ${isToday?'bg-amber-100':isSunday?'bg-slate-100':''} cursor-pointer hover:bg-slate-200" onclick="wpOpenDayView('${ds}')" title="Click para ver el día completo">${wpFmtDate(d)} <span class="text-[10px] text-slate-400">▤</span></th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredHomes.length === 0 ? `<tr><td colspan="7" class="text-center text-slate-400 py-8">${wpState.houseFilter==='all'?'No hay obras activas esta semana.<br>Agrega actividades en una casa o crea proyectos activos.':'La casa filtrada no tiene actividades visibles esta semana.'}</td></tr>` : ''}
              ${filteredHomes.map(home => {
                const homeActs = wpState.activities.filter(a => a.project_id === home.id || (!a.project_id && home.id.startsWith('name:') && a.property_name === home.id.slice(5)));
                const homeDone = homeActs.filter(a => a.status === 'done').length;
                const homePct = homeActs.length ? Math.round(homeDone/homeActs.length*100) : 0;
                // A) líder(es) + días plan (baseline) vs real
                const hB = homeActs.map(a => a.baseline_date).filter(Boolean).sort();
                const hD = homeActs.map(a => a.date).filter(Boolean).sort();
                const hPlanDays = hB.length ? wpDaysDiff(hB[0], hB[hB.length-1]) + 1 : 0;
                const hRealDays = hD.length ? wpDaysDiff(hD[0], hD[hD.length-1]) + 1 : 0;
                const hSlip = hRealDays - hPlanDays;
                const hCrews = [...new Set(homeActs.flatMap(wpActCrews))];
                return `
                <tr>
                  <td class="py-2 px-2 border-b border-r border-slate-200 sticky left-0 bg-white z-10 align-top group">
                    <div class="cursor-pointer hover:bg-slate-50 -m-1 p-1 rounded" onclick="wpOpenHouseView('${home.id}','${home.name.replace(/'/g, "\\'")}')">
                      <div class="font-bold text-xs">${home.name} <span class="text-[9px] text-slate-400">▤</span></div>
                      ${home.address ? `<div class="text-[10px] text-slate-500 truncate">${home.address}</div>` : ''}
                      ${homeActs.length ? `<div class="mt-1"><div class="bg-slate-100 rounded-full h-1.5 overflow-hidden"><div class="bg-emerald-500 h-full" style="width:${homePct}%"></div></div><div class="text-[9px] text-slate-500 mt-0.5">${homeDone}/${homeActs.length} (${homePct}%)</div></div>` : ''}
                      ${homeActs.length ? `<div class="wp-hmeta text-[9px] mt-1 flex flex-wrap items-center gap-1">${hCrews.slice(0, 2).map(c => `<span class="wp-crew bg-slate-100 text-slate-600 px-1 rounded">👷 ${(c || '').replace('Crew ', '').replace(/</g, '&lt;')}</span>`).join('')}${Number.isFinite(hPlanDays) && Number.isFinite(hRealDays) ? `<span class="wp-days text-slate-500" title="Días plan (baseline) → real">📅 ${hPlanDays}→${hRealDays}d${hSlip > 0 ? ` <b class="text-rose-600">+${hSlip}</b>` : hSlip < 0 ? ` <b class="text-emerald-600">${hSlip}</b>` : ''}</span>` : ''}</div>` : ''}
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

// A) crews (líder) de una actividad
function wpActCrews(a) { return (a.resource_ids || []).map(rid => (wpState.resources || []).find(r => r.id === rid)).filter(r => r && r.type === 'crew').map(r => r.name); }
// A) ¿la actividad pasa los filtros de líder/etapa/atrasadas?
function wpActPassesFilters(a) {
  if (wpState.stageFilter && wpState.stageFilter !== 'all' && (a.stage || '') !== wpState.stageFilter) return false;
  if (wpState.liderFilter && wpState.liderFilter !== 'all' && !wpActCrews(a).includes(wpState.liderFilter)) return false;
  if (wpState.onlyLate) { const late = a.status !== 'done' && a.status !== 'cancelled' && a.date < wpDateOnly(new Date()); if (!late) return false; }
  return true;
}
function wpSetLiderFilter(v) { wpState.liderFilter = v || 'all'; wpRender(); }
function wpSetStageFilter(v) { wpState.stageFilter = v || 'all'; wpRender(); }
function wpToggleOnlyLate() { wpState.onlyLate = !wpState.onlyLate; wpRender(); }
function wpToggleHideEmpty() { wpState.hideEmpty = !wpState.hideEmpty; wpRender(); }
window.wpSetLiderFilter = wpSetLiderFilter; window.wpSetStageFilter = wpSetStageFilter; window.wpToggleOnlyLate = wpToggleOnlyLate; window.wpToggleHideEmpty = wpToggleHideEmpty;

function wpRenderCell(home, date, conflicts) {
  const dateStr = wpDateOnly(date);
  const cellActs = wpState.activities.filter(a => {
    const matchProj = a.project_id === home.id;
    const matchName = !a.project_id && home.id.startsWith('name:') && a.property_name === home.id.slice(5);
    return (matchProj || matchName) && a.date === dateStr && wpActPassesFilters(a);
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
          const isCritical = a.priority === 'critical' || a.priority === 'urgent';
          const isPostponed = (a.notes || '').includes('[APLAZADA');
          const isLate = a.status !== 'done' && a.status !== 'cancelled' && new Date(a.date) < new Date(wpDateOnly(new Date()));
          // A) estado primario → borde/punto sutil (mismo lenguaje que la vista Desviación)
          const st = a.status === 'done' ? 'done' : a.status === 'cancelled' ? 'cancelled' : isLate ? 'late' : (isCritical ? 'critical' : (isPostponed ? 'postponed' : (hasConflict ? 'conflict' : (hasDepIssue ? 'dep' : (a.status === 'in_progress' ? 'progress' : 'normal')))));
          const stLabel = { done: '✓ terminada', late: '⏰ atrasada', critical: '⚠ crítica', postponed: '⏸ aplazada', conflict: '⚠ conflicto', dep: `🔗 ${depCheck.blockers.length} dep`, progress: '● en curso', normal: '' }[st];
          // extraer "(día X/Y)" del nombre para mostrarlo como chip limpio
          const dayM = (a.activity_name || '').match(/\(d[ií]a\s*\d+\s*\/\s*\d+\)/i);
          const cleanName = dayM ? a.activity_name.replace(dayM[0], '').trim() : a.activity_name;
          const dayChip = dayM ? dayM[0].replace(/[()]/g, '').trim() : '';
          return `
            <div class="wp-acard" data-st="${st}"
                 draggable="true"
                 ondragstart="wpActivityDragStart('${a.id}', event)"
                 ondragend="wpState.draggedActivityId=null">
              <div class="wp-ac-top">
                <input type="checkbox" ${a.status==='done'?'checked':''} onclick="event.stopPropagation(); wpQuickToggleDone('${a.id}', event)" class="wp-ac-chk" title="Marcar como done" />
                <div class="wp-ac-body" onclick="wpEditActivity('${a.id}')">
                  <div class="wp-ac-name ${a.status==='done'?'wp-done':''}">${cleanName}</div>
                  <div class="wp-ac-meta">
                    ${a.stage ? `<span class="wp-ac-stage">${a.stage}</span>` : ''}
                    ${dayChip ? `<span class="wp-ac-day">${dayChip}</span>` : ''}
                    ${stLabel ? `<span class="wp-ac-st" title="${st==='critical'?'Ruta crítica':st==='postponed'?'Tarea aplazada':st==='dep'?'Dependencias no listas: '+depCheck.blockers.map(b=>b.code).join(', '):''}">${stLabel}</span>` : ''}
                  </div>
                  <div class="wp-ac-tags">
                    ${(a.notes||'').startsWith('[Estimador]') ? '<span class="wp-chip est" title="Viene del Estimador">📐 EST</span>' : ''}
                    ${(a.checklist||[]).length > 0 ? `<button onclick="event.stopPropagation(); wpOpenChecklist('${a.id}')" class="wp-chip ok" title="Checklist + materiales">✅ ${(a.checklist||[]).filter(c=>c.done).length}/${(a.checklist||[]).length}</button>` : `<button onclick="event.stopPropagation(); wpOpenChecklist('${a.id}')" class="wp-chip" title="Agregar checklist + materiales">+ ✅</button>`}
                    ${(a.materials||[]).length > 0 ? `<span class="wp-chip" title="${(a.materials||[]).map(m=>m.nombre+' x'+m.cantidad).join(', ').replace(/"/g,'&quot;')}">📦 ${(a.materials||[]).length}</span>` : ''}
                    ${acts.map(r => `<span class="wp-res" title="${r.name}">${r.emoji}${r.type==='crew'?' '+r.name.replace('Crew ',''):''}</span>`).join('')}
                  </div>
                  ${hasConflict ? '<div class="wp-ac-warn">⚠️ Conflicto de recurso</div>' : ''}
                  ${hasDepIssue && depCheck.minDate ? `<div class="wp-ac-sug">📅 Sugerido: ${depCheck.minDate}</div>` : ''}
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

function wpSetHouseFilter(value) {
  wpState.houseFilter = value || 'all';
  wpRender();
}

function wpToggleSidebar() {
  wpState.sidebarHidden = !wpState.sidebarHidden;
  wpRender();
}

// ─── BLOQUE 1.1: Equipo FIJO por obra (crew/especialistas/herramientas/vehículos por casa, no por día) ───
function wpTeamOf(houseId) {
  const ids = (wpState.projectResources || []).filter(pr => pr.house_id === houseId).map(pr => pr.resource_id);
  return (wpState.resources || []).filter(r => ids.includes(r.id));
}
function wpRenderTeamPanel(homes) {
  const esc = s => String(s == null ? '' : s).replace(/[<>"]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `
    <div class="p-2 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">👷 Equipo de la obra</div>
    <div class="p-2 space-y-2">
      ${homes.length ? homes.map(h => {
        const team = wpTeamOf(h.id);
        return `<div class="wp-team border border-slate-200 rounded-lg p-2">
          <div class="flex items-center justify-between gap-1">
            <div class="font-bold text-[11px] truncate">${esc(h.name)}</div>
            <button onclick="wpOpenEditTeam('${h.id.replace(/'/g, "\\'")}','${h.name.replace(/'/g, "\\'")}')" class="text-[9px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-0.5 font-bold whitespace-nowrap">✏️ Editar equipo</button>
          </div>
          ${team.length ? `<div class="flex flex-wrap gap-1 mt-1.5">${team.map(r => `<span class="wp-res">${r.emoji || '•'} ${esc((r.name || '').replace('Crew ', ''))}</span>`).join('')}</div>` : '<div class="text-[10px] text-slate-400 italic mt-1">Sin equipo asignado.</div>'}
        </div>`;
      }).join('') : '<div class="text-[10px] text-slate-400 p-2">No hay casas visibles. Ajustá los filtros o agregá una casa.</div>'}
    </div>`;
}
function wpOpenEditTeam(houseId, houseName) {
  const esc = s => String(s == null ? '' : s).replace(/[<>"]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const assigned = new Set(wpTeamOf(houseId).map(r => r.id));
  const groups = [['crew', '👷 Equipos / Crews'], ['specialist', '👨‍🔧 Especialistas'], ['tool', '🔧 Herramientas'], ['vehicle', '🚚 Vehículos'], ['other', '📦 Otros']];
  const html = `<div id="wp-team-edit" class="space-y-3">
    <div class="text-xs text-slate-500">Marcá los recursos asignados a <b>${esc(houseName)}</b> (equipo fijo de la obra, no por día). Reversible.</div>
    ${groups.map(([type, label]) => {
      const rs = (wpState.resources || []).filter(r => (r.type || 'other') === type && r.active !== false);
      if (!rs.length) return '';
      return `<div><div class="text-[10px] font-bold uppercase text-slate-500 mb-1">${label}</div>
        <div class="flex flex-wrap gap-1.5">${rs.map(r => `<button onclick="wpToggleTeamResource('${houseId.replace(/'/g, "\\'")}','${r.id}', this)" data-on="${assigned.has(r.id) ? '1' : '0'}" class="wp-teamtog text-xs px-2.5 py-1 rounded-lg border ${assigned.has(r.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}">${r.emoji || '•'} ${esc(r.name)}</button>`).join('')}</div></div>`;
    }).join('')}
    ${!(wpState.resources || []).length ? '<div class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">No hay recursos cargados todavía. Cerrá y usá "+ Recurso" para crearlos.</div>' : ''}
    <div class="pt-2"><button onclick="wpBackToPlanner({reload:true})" class="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg">✓ Listo</button></div>
  </div>`;
  openModal(`👷 Editar equipo — ${houseName}`, html);
}
window.wpOpenEditTeam = wpOpenEditTeam;
async function wpToggleTeamResource(houseId, resourceId, btn) {
  const on = btn.getAttribute('data-on') === '1';
  try {
    if (on) {
      await sb.from('remodel_project_resources').update({ archived_at: new Date().toISOString() }).eq('house_id', houseId).eq('resource_id', resourceId).is('archived_at', null);
      wpState.projectResources = (wpState.projectResources || []).filter(pr => !(pr.house_id === houseId && pr.resource_id === resourceId));
      btn.setAttribute('data-on', '0'); btn.className = btn.className.replace('bg-blue-600 text-white border-blue-600', 'bg-white text-slate-600 border-slate-300');
    } else {
      const row = { house_id: houseId, resource_id: resourceId, created_by: (window.state && state.user && state.user.id) || null };
      const { data, error } = await sb.from('remodel_project_resources').insert(row).select().single();
      if (error) throw error;
      wpState.projectResources = (wpState.projectResources || []).concat([data || row]);
      btn.setAttribute('data-on', '1'); btn.className = btn.className.replace('bg-white text-slate-600 border-slate-300', 'bg-blue-600 text-white border-blue-600');
    }
  } catch (e) { if (window.toast) toast('No pude guardar: ' + e.message, 'error'); }
}
window.wpToggleTeamResource = wpToggleTeamResource;

function wpRenderResourceGroup(type, label, borderClass) {
  const items = wpState.resources.filter(r => r.type === type);
  if (items.length === 0) return '';
  const isOpen = wpState.openGroups?.[type] === true; // default cerrado
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
  // CORRECCIÓN: dos actividades 7-12h y 13-17h con misma crew NO son conflicto
  // (no se pisan). El check anterior solo agrupaba por día sin mirar horas
  // y reportaba falsos positivos.
  const byResourceDay = {};
  wpState.activities.forEach(a => {
    (a.resource_ids || []).forEach(rid => {
      const key = `${rid}__${a.date}`;
      if (!byResourceDay[key]) byResourceDay[key] = [];
      byResourceDay[key].push(a);
    });
  });
  const overlaps = (a, b) => {
    const aStart = +a.start_hour || 0, aEnd = +a.end_hour || 24;
    const bStart = +b.start_hour || 0, bEnd = +b.end_hour || 24;
    return aStart < bEnd && bStart < aEnd;
  };
  const conflicts = [];
  Object.entries(byResourceDay).forEach(([key, acts]) => {
    if (acts.length < 2) return;
    const [rid, date] = key.split('__');
    const res = wpState.resources.find(r => r.id === rid);
    if (!res) return;
    const cap = res.capacity || 1;
    // Cuenta el máximo de actividades simultáneas en cualquier hora
    let maxOverlap = 1;
    for (let i = 0; i < acts.length; i++) {
      let count = 1;
      for (let j = 0; j < acts.length; j++) {
        if (i !== j && overlaps(acts[i], acts[j])) count++;
      }
      maxOverlap = Math.max(maxOverlap, count);
    }
    if (maxOverlap > cap) {
      conflicts.push({ resourceId: rid, resourceName: res.name, date, activities: acts });
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

// BLOQUE 1.2 — Nueva actividad con opción MULTI-DÍA (un día / rango / varios) en UN paso.
function wpNewActivity(homeId, homeName, dateStr) {
  const esc = s => String(s == null ? '' : s).replace(/[<>"]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const stages = [...new Set((wpState.activities || []).map(a => a.stage).filter(Boolean))].sort();
  const team = wpTeamOf(homeId).filter(r => r.type === 'crew' || r.type === 'specialist');
  const crews = team.length ? team : (wpState.resources || []).filter(r => r.type === 'crew' || r.type === 'specialist');
  const weekDays = Array.from({ length: 7 }, (_, i) => wpDateOnly(wpAddDays(wpState.weekStart || new Date(), i)));
  const dl = d => new Date(d + 'T00:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  const html = `<div id="wp-na" class="space-y-3" data-house="${esc(homeId)}" data-hname="${esc(homeName)}" data-date="${dateStr}">
    <input id="wp-na-name" placeholder="Nombre de la actividad (ej. Drywall planta alta)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
    <div class="grid grid-cols-2 gap-2">
      <input id="wp-na-stage" list="wp-na-stages" placeholder="Etapa" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      <datalist id="wp-na-stages">${stages.map(s => `<option value="${esc(s)}"></option>`).join('')}</datalist>
      <select id="wp-na-crew" class="border border-slate-300 rounded-lg px-3 py-2 text-sm"><option value="">Crew (opcional)</option>${crews.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>
    </div>
    <div class="text-[11px] font-bold uppercase text-slate-500">Cuándo</div>
    <div class="flex gap-3 flex-wrap text-xs">
      <label class="flex items-center gap-1"><input type="radio" name="wp-na-mode" value="dia" checked onchange="wpNAMode('dia')" /> Un día</label>
      <label class="flex items-center gap-1"><input type="radio" name="wp-na-mode" value="rango" onchange="wpNAMode('rango')" /> Rango de días</label>
      <label class="flex items-center gap-1"><input type="radio" name="wp-na-mode" value="varios" onchange="wpNAMode('varios')" /> Varios días</label>
    </div>
    <div id="wp-na-dia" class="text-xs text-slate-600">📅 ${dl(dateStr)}</div>
    <div id="wp-na-rango" class="grid-cols-2 gap-2 text-xs" style="display:none"><label class="block">Desde<input id="wp-na-from" type="date" value="${dateStr}" class="w-full border border-slate-300 rounded px-2 py-1" /></label><label class="block">Hasta<input id="wp-na-to" type="date" value="${dateStr}" class="w-full border border-slate-300 rounded px-2 py-1" /></label></div>
    <div id="wp-na-varios" class="flex-wrap gap-1.5 text-xs" style="display:none">${weekDays.map(d => `<label class="flex items-center gap-1 border border-slate-300 rounded px-2 py-1"><input type="checkbox" class="wp-na-day" value="${d}" ${d === dateStr ? 'checked' : ''} /> ${dl(d)}</label>`).join('')}</div>
    <div class="text-[10px] text-slate-400">Multi-día = una sola actividad enlazada (una entrada por día, con "día X/Y").</div>
    <button onclick="wpCreateActivity()" class="w-full bg-slate-900 text-white text-sm font-bold py-2.5 rounded-lg">✓ Crear actividad</button>
  </div>`;
  openModal(`➕ Nueva actividad — ${homeName}`, html);
}
window.wpNewActivity = wpNewActivity;
function wpNAMode(m) {
  const map = { dia: 'block', rango: 'grid', varios: 'flex' };
  ['dia', 'rango', 'varios'].forEach(x => { const el = document.getElementById('wp-na-' + x); if (el) el.style.display = x === m ? map[x] : 'none'; });
}
window.wpNAMode = wpNAMode;
async function wpCreateActivity() {
  const root = document.getElementById('wp-na'); if (!root) return;
  const houseId = root.getAttribute('data-house'), houseName = root.getAttribute('data-hname'), dateStr = root.getAttribute('data-date');
  const name = (document.getElementById('wp-na-name').value || '').trim(); if (!name) return alert('Ponele nombre a la actividad.');
  const stage = (document.getElementById('wp-na-stage').value || '').trim() || null;
  const crew = document.getElementById('wp-na-crew').value || '';
  const mode = (document.querySelector('input[name="wp-na-mode"]:checked') || {}).value || 'dia';
  let dates = [];
  if (mode === 'dia') dates = [dateStr];
  else if (mode === 'rango') {
    const f = document.getElementById('wp-na-from').value, t = document.getElementById('wp-na-to').value;
    if (!f || !t) return alert('Elegí el rango.');
    let a = new Date(f + 'T00:00:00'), b = new Date(t + 'T00:00:00'); if (b < a) { const tmp = a; a = b; b = tmp; }
    for (let x = new Date(a); x <= b; x.setDate(x.getDate() + 1)) dates.push(wpDateOnly(new Date(x)));
  } else dates = [...document.querySelectorAll('.wp-na-day:checked')].map(c => c.value);
  if (!dates.length) return alert('Elegí al menos un día.');
  dates.sort();
  const gid = dates.length > 1 && crypto.randomUUID ? crypto.randomUUID() : null;
  const rows = dates.map((d, i) => ({
    project_id: houseId.startsWith('name:') ? null : houseId,
    property_name: houseId.startsWith('name:') ? houseId.slice(5) : houseName,
    date: d, activity_name: dates.length > 1 ? `${name} (día ${i + 1}/${dates.length})` : name,
    stage, group_id: gid, resource_ids: crew ? [crew] : [], created_by: (window.state && state.user && state.user.id) || null
  }));
  const { error } = await sb.from('weekly_activities').insert(rows);
  if (error) return alert('Error: ' + error.message);
  wpBackToPlanner({ reload: true });
}
window.wpCreateActivity = wpCreateActivity;

function wpEditActivity(id) {
  const a = wpState.activities.find(x => x.id === id);
  if (!a) return;
  const assignedRes = (a.resource_ids || []).map(rid => wpState.resources.find(r => r.id === rid)).filter(Boolean);
  const availableRes = wpState.resources.filter(r => !(a.resource_ids||[]).includes(r.id));
  const proj = wpState.projects.find(p => p.id === a.project_id);
  const crews = assignedRes.filter(r => r.type === 'crew' || r.type === 'specialist');
  const tools = assignedRes.filter(r => r.type === 'tool' || r.type === 'vehicle' || r.type === 'other');
  const checklist = a.checklist || [];
  const materials = a.materials || [];
  const checklistDone = checklist.filter(c => c.done).length;
  const isDone = a.status === 'done';

  const html = `
    <div class="space-y-3">
      <!-- HEADER de desglose: contexto rápido para el operador -->
      <div class="bg-gradient-to-br ${isDone?'from-emerald-700 to-emerald-900':'from-slate-800 to-slate-900'} text-white rounded-xl p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="text-[10px] uppercase tracking-wider opacity-70 font-bold">🏠 ${(proj?.name || a.property_name || 'Sin casa').replace(/</g,'&lt;')}${a.activity_code?` · ${a.activity_code}`:''}</div>
            <div class="text-lg font-bold leading-tight ${isDone?'line-through opacity-75':''}">${(a.activity_name||'').replace(/</g,'&lt;')}</div>
            <div class="text-xs opacity-80 mt-1">${a.stage||'—'} · ${a.date} · ${a.start_hour||7}:00–${a.end_hour||17}:00${a.duration_days>1?` · ${a.duration_days}d`:''}</div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isDone?'bg-emerald-300/30':a.status==='in_progress'?'bg-blue-300/30':a.status==='cancelled'?'bg-slate-400/30':'bg-amber-300/30'}">${a.status||'planned'}</span>
            ${a.priority && a.priority!=='normal' ? `<span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-400/30">${a.priority}</span>` : ''}
          </div>
        </div>
        <!-- Tabs Desglose vs Editar -->
        <div class="flex gap-1 mt-3">
          <button onclick="document.getElementById('wpe-tab-detail').classList.remove('hidden'); document.getElementById('wpe-tab-edit').classList.add('hidden'); this.classList.add('bg-white/20'); document.getElementById('wpe-btn-edit').classList.remove('bg-white/20')" id="wpe-btn-detail" class="bg-white/20 hover:bg-white/30 text-xs font-bold px-3 py-1 rounded">📋 Desglose</button>
          <button onclick="document.getElementById('wpe-tab-edit').classList.remove('hidden'); document.getElementById('wpe-tab-detail').classList.add('hidden'); this.classList.add('bg-white/20'); document.getElementById('wpe-btn-detail').classList.remove('bg-white/20')" id="wpe-btn-edit" class="hover:bg-white/20 text-xs font-bold px-3 py-1 rounded">✏️ Editar</button>
        </div>
      </div>

      <!-- TAB: DESGLOSE -->
      <div id="wpe-tab-detail" class="space-y-3">
        <!-- Equipo asignado -->
        <div class="border border-slate-200 rounded-xl p-3">
          <div class="text-[10px] font-bold uppercase text-slate-600 mb-2">👷 Equipo asignado (${crews.length})</div>
          ${crews.length === 0
            ? '<div class="text-xs text-slate-400 italic">Sin equipo asignado · arrastrá un crew o specialist desde el panel lateral.</div>'
            : `<div class="flex flex-wrap gap-2">${crews.map(r => `
                <div class="bg-blue-50 border border-blue-300 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                  <span class="text-xl">${r.emoji}</span>
                  <div>
                    <div class="text-xs font-bold">${r.name}</div>
                    <div class="text-[10px] text-slate-500">${r.category||r.type}${r.cost_per_day?` · $${r.cost_per_day}/d`:''}</div>
                  </div>
                </div>`).join('')}</div>`
          }
        </div>

        <!-- Herramientas / activos -->
        <div class="border border-slate-200 rounded-xl p-3">
          <div class="text-[10px] font-bold uppercase text-slate-600 mb-2">🔧 Herramientas y activos (${tools.length})</div>
          ${tools.length === 0
            ? '<div class="text-xs text-slate-400 italic">Sin herramientas asignadas.</div>'
            : `<div class="flex flex-wrap gap-2">${tools.map(r => `<span class="bg-amber-50 border border-amber-300 rounded px-2 py-1 text-xs font-medium" title="${r.category||''}">${r.emoji} ${r.name}</span>`).join('')}</div>`
          }
        </div>

        <!-- Materiales necesarios -->
        <div class="border border-slate-200 rounded-xl p-3">
          <div class="flex items-center justify-between mb-2">
            <div class="text-[10px] font-bold uppercase text-slate-600">📦 Materiales (${materials.length})</div>
            <button onclick="wpOpenChecklist('${id}')" class="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-bold">+ Editar</button>
          </div>
          ${materials.length === 0
            ? '<div class="text-xs text-slate-400 italic">Sin materiales registrados.</div>'
            : `<table class="w-full text-xs"><tbody>${materials.map(m => `
                <tr class="border-b border-slate-100">
                  <td class="py-1">${(m.nombre||'').replace(/</g,'&lt;')}</td>
                  <td class="py-1 text-right text-slate-600">${m.cantidad||''} ${m.unidad||''}</td>
                </tr>`).join('')}</tbody></table>`
          }
        </div>

        <!-- Checklist -->
        <div class="border border-slate-200 rounded-xl p-3">
          <div class="flex items-center justify-between mb-2">
            <div class="text-[10px] font-bold uppercase text-slate-600">✅ Checklist (${checklistDone}/${checklist.length})</div>
            <button onclick="wpOpenChecklist('${id}')" class="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-bold">+ Editar</button>
          </div>
          ${checklist.length === 0
            ? '<div class="text-xs text-slate-400 italic">Sin checklist.</div>'
            : `<ul class="space-y-0.5 text-xs">${checklist.map(c => `<li class="${c.done?'line-through text-slate-400':'text-slate-700'}">${c.done?'☑':'☐'} ${(c.item||'').replace(/</g,'&lt;')}</li>`).join('')}</ul>`
          }
        </div>

        <!-- Importantes (notas) -->
        ${a.notes ? `
        <div class="border-l-4 border-amber-500 bg-amber-50 p-3 rounded-r-xl">
          <div class="text-[10px] font-bold uppercase text-amber-800 mb-1">📌 Importante / Notas</div>
          <div class="text-xs text-slate-800 whitespace-pre-wrap">${a.notes.replace(/</g,'&lt;')}</div>
        </div>` : ''}

        <!-- Acciones rápidas -->
        <div class="flex gap-2 pt-2 border-t border-slate-200 flex-wrap">
          ${!isDone ? `<button onclick="wpMarkActivityDone('${id}', true).then(()=>wpBackToPlanner({reload:true})).catch(e=>alert(e.message))" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">✓ Marcar como hecha</button>` : `<button onclick="wpMarkActivityDone('${id}', false).then(()=>wpBackToPlanner({reload:true})).catch(e=>alert(e.message))" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm font-bold py-2 rounded">↺ Desmarcar</button>`}
          <button onclick="wpOpenPostpone('${id}')" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded" title="Aplazar con motivo">🟡 Aplazar con motivo</button>
        </div>
        ${a.notes && a.notes.includes('[APLAZADA') ? `
        <div class="border-l-4 border-amber-500 bg-amber-50 p-2 rounded-r text-[11px]">
          <div class="font-bold text-amber-900">🟡 Esta tarea fue aplazada</div>
          <div class="text-amber-800 mt-0.5">${(a.notes.match(/\[APLAZADA[^\]]*\]/g)||[]).slice(-1)[0]||''}</div>
        </div>` : ''}
      </div>

      <!-- TAB: EDITAR (form completo) -->
      <div id="wpe-tab-edit" class="hidden space-y-3">
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
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="wpeSave('${id}')" class="flex-1 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2 rounded">💾 Guardar</button>
      </div>
      </div><!-- /wpe-tab-edit -->
    </div>
  `;
  window._wpEditingId = id;
  openModal(`📋 Actividad`, html);
}

async function wpeAddRes(rid) {
  const id = window._wpEditingId;
  const a = wpState.activities.find(x => x.id === id);
  if (!a) return;
  const newIds = [...(a.resource_ids||[]), rid];
  await sb.from('weekly_activities').update({ resource_ids: newIds, updated_at: new Date().toISOString() }).eq('id', id);
  await wpLoadAll();
  wpEditActivity(id);
}
async function wpeRemoveRes(rid) {
  const id = window._wpEditingId;
  const a = wpState.activities.find(x => x.id === id);
  if (!a) return;
  const newIds = (a.resource_ids||[]).filter(x => x !== rid);
  await sb.from('weekly_activities').update({ resource_ids: newIds, updated_at: new Date().toISOString() }).eq('id', id);
  await wpLoadAll();
  wpEditActivity(id);
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
  wpBackToPlanner();
}
async function wpeDelete(id) {
  if (!confirm('¿Eliminar esta actividad permanentemente?')) return;
  await sb.from('weekly_activities').delete().eq('id', id);
  await wpLoadAll();
  wpBackToPlanner();
}
// Quick toggle done desde el grid (sin abrir modal). Optimistic update:
// cambia el state local YA, re-renderiza, y dispara el update a DB en paralelo.
async function wpQuickToggleDone(id, ev) {
  if (ev) ev.stopPropagation();
  const a = wpState.activities.find(x => x.id === id);
  if (!a) return;
  const newStatus = a.status === 'done' ? 'planned' : 'done';
  // Optimistic UI: actualizar state local YA
  a.status = newStatus;
  a.completed_at = newStatus === 'done' ? new Date().toISOString() : null;
  wpRender();
  // Persistir async (sin bloquear UI)
  try {
    await wpMarkActivityDone(id, newStatus === 'done');
  } catch (e) {
    // Rollback
    a.status = newStatus === 'done' ? 'planned' : 'done';
    a.completed_at = newStatus === 'done' ? null : new Date().toISOString();
    wpRender();
    alert('No se pudo guardar el cambio: ' + (e?.message || e));
  }
}

// Núcleo: marca done/planned + captura tiempo real (días) si la columna existe.
// Usa safeUpdate para que las columnas opcionales (started_at, actual_days)
// no rompan si todavía no se migraron.
async function wpMarkActivityDone(id, isDone) {
  const a = wpState.activities.find(x => x.id === id);
  const now = new Date().toISOString();
  let payload;
  if (isDone) {
    payload = { status: 'done', completed_at: now, updated_at: now };
    if (a) {
      const startStr = a.started_at ? a.started_at.slice(0,10) : a.date;
      if (startStr) {
        payload.actual_days = Math.max(1, Math.round((new Date(now.slice(0,10)) - new Date(startStr)) / 86400000) + 1);
        payload.started_at = a.started_at || new Date(a.date+'T00:00:00').toISOString();
      }
    }
  } else {
    payload = { status: 'planned', completed_at: null, updated_at: now };
  }
  const { error } = await window.safeUpdate(
    p => sb.from('weekly_activities').update(p).eq('id', id),
    payload
  );
  if (error) throw new Error(error.message || 'Error guardando');
}

// ─── APLAZAR con motivo obligatorio ───
function wpOpenPostpone(id) {
  const a = wpState.activities.find(x => x.id === id);
  if (!a) return;
  const tomorrowIso = wpDateOnly(wpAddDays(new Date(a.date+'T00:00:00'), 1));
  openModal('🟡 Aplazar tarea — motivo obligatorio', `
    <div class="space-y-3">
      <div class="bg-amber-50 border border-amber-300 rounded p-2 text-xs text-amber-900">
        <strong>Tarea:</strong> ${(a.activity_name||'').replace(/</g,'&lt;')}<br>
        <strong>Fecha actual:</strong> ${a.date}
      </div>
      <div>
        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Nueva fecha *</label>
        <input id="wp-postpone-date" type="date" value="${tomorrowIso}" min="${a.date}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
      </div>
      <div>
        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">¿Por qué se aplaza? *<span class="text-red-600 ml-1">(obligatorio, mín 10 caracteres)</span></label>
        <textarea id="wp-postpone-reason" rows="3" minlength="10" required class="w-full border border-amber-400 rounded px-3 py-2 text-sm" placeholder="Ej: Falta de material, lluvia, falta de mano de obra, cambio de prioridad..."></textarea>
        <div class="text-[10px] text-slate-500 mt-1">El motivo queda registrado en las notas con fecha. La tarea se marca en amarillo en el calendario.</div>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="wpConfirmPostpone('${id}')" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2 rounded">🟡 Confirmar aplazamiento</button>
      </div>
    </div>
  `);
}

async function wpConfirmPostpone(id) {
  const a = wpState.activities.find(x => x.id === id);
  if (!a) return;
  const newDate = document.getElementById('wp-postpone-date').value;
  const reason = (document.getElementById('wp-postpone-reason').value || '').trim();
  if (!newDate) { alert('Seleccioná una fecha'); return; }
  if (reason.length < 10) { alert('El motivo debe tener al menos 10 caracteres. Explicá brevemente por qué se aplaza.'); return; }

  const today = wpDateOnly(new Date());
  const tag = `[APLAZADA ${today} de ${a.date} → ${newDate}: ${reason}]`;
  const prevNotes = (a.notes || '').trim();
  const newNotes = prevNotes ? prevNotes + '\n' + tag : tag;

  const { error } = await window.safeUpdate(
    p => sb.from('weekly_activities').update(p).eq('id', id),
    { date: newDate, status: 'planned', priority: 'high', notes: newNotes, updated_at: new Date().toISOString() }
  );
  if (error) return alert('Error: ' + error.message);
  await wpLoadAll();
  wpBackToPlanner();
}

// Reprograma una actividad a nuevo día
async function wpReprogramTask(id, newDate) {
  if (!newDate) return;
  await sb.from('weekly_activities').update({
    date: newDate, status: 'planned', updated_at: new Date().toISOString()
  }).eq('id', id);
  await wpLoadAll();
  wpRender();
}

// Reprograma TODAS las atrasadas
async function wpReprogramAllOverdue(newDate) {
  const todayIso = wpDateOnly(new Date());
  const ids = wpState.activities
    .filter(a => a.status !== 'done' && a.status !== 'cancelled' && a.date && a.date < todayIso)
    .map(a => a.id);
  if (!ids.length) return;
  if (!confirm(`Mover ${ids.length} actividad(es) atrasada(s) al ${newDate}?`)) return;
  await sb.from('weekly_activities').update({
    date: newDate, status: 'planned', updated_at: new Date().toISOString()
  }).in('id', ids);
  await wpLoadAll();
  wpRender();
}

function wpToggleCriticasDetails() {
  wpState.showCriticasDetails = !wpState.showCriticasDetails;
  wpRender();
}
function wpToggleOverdueDetails() {
  wpState.showOverdueDetails = !wpState.showOverdueDetails;
  wpRender();
}

// Reprograma una lista específica de IDs (usado al cerrar el día)
async function wpReprogramListToDate(ids, newDate) {
  if (!Array.isArray(ids) || ids.length === 0 || !newDate) return;
  if (!confirm(`Mover ${ids.length} tarea(s) pendiente(s) al ${newDate}?\n\nLas tareas NO se borran — sólo se mueven de fecha y quedan como "planned".`)) return;
  const { error } = await sb.from('weekly_activities').update({
    date: newDate, status: 'planned', updated_at: new Date().toISOString()
  }).in('id', ids);
  if (error) return alert('Error reprogramando: ' + error.message);
  await wpLoadAll();
  wpBackToPlanner();
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
function wpOpenDayView(dateStr, homeFilter) {
  const d = new Date(dateStr + 'T00:00:00');
  homeFilter = homeFilter || wpState.houseFilter || 'all';
  let dayActs = wpState.activities.filter(a => a.date === dateStr);
  dayActs = wpFilterActsByHouse(dayActs, homeFilter);
  // Lista de casas activas para el filter del modal
  const hidden = new Set(wpState.projects.filter(p => p.status === 'completed' || p.status === 'cancelled').map(p => p.id));
  const activeProj = wpState.projects.filter(p => !hidden.has(p.id));
  const extra = new Set();
  wpState.activities.forEach(a => { if (!a.project_id && a.property_name) extra.add(a.property_name); });
  const houseOpts = [
    `<option value="all" ${homeFilter==='all'?'selected':''}>🏘️ Todas las casas</option>`,
    ...activeProj.map(p => `<option value="${p.id}" ${homeFilter===p.id?'selected':''}>🏠 ${(p.name||'').replace(/</g,'&lt;')}</option>`),
    ...Array.from(extra).map(n => `<option value="name:${n.replace(/"/g,'&quot;')}" ${homeFilter==='name:'+n?'selected':''}>🏠 ${n.replace(/</g,'&lt;')}</option>`)
  ].join('');
  // Pendientes del día (para reagendar al final del día)
  const pendientes = dayActs.filter(a => a.status !== 'done' && a.status !== 'cancelled');
  const tomorrowIso = wpDateOnly(wpAddDays(d, 1));
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
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div class="text-sm text-slate-400 uppercase font-bold">Día completo</div>
            <div class="text-2xl font-bold">${wpFmtDate(d)}</div>
            <div class="text-xs text-slate-400 mt-1">${Object.keys(byHome).length} casa(s) · ${dayActs.length} actividad(es) · ${busyRes.length} recurso(s) ocupado(s)</div>
          </div>
          <div class="flex gap-2 items-center">
            <select onchange="wpOpenDayView('${dateStr}', this.value)" class="bg-white text-slate-900 text-xs rounded px-2 py-1.5 font-bold">${houseOpts}</select>
            <button onclick="wpShareWhatsApp('${dateStr}', '${homeFilter}')" class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded" title="Enviar día por WhatsApp">💬 WhatsApp</button>
            <button onclick="wpOpenPrintView('${dateStr}','${homeFilter}')" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded">🖨️ Imprimir</button>
          </div>
        </div>
        ${pendientes.length > 0 ? `
          <div class="mt-3 bg-amber-500/20 border border-amber-400/40 rounded-lg p-2 flex items-center justify-between gap-2 flex-wrap">
            <div class="text-xs">⚠️ <strong>${pendientes.length}</strong> tarea(s) sin completar al cerrar el día.</div>
            <div class="flex gap-1">
              <button onclick="wpReprogramListToDate(${JSON.stringify(pendientes.map(p=>p.id)).replace(/"/g,'&quot;')}, '${tomorrowIso}')" class="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2 py-1 rounded">→ Mañana</button>
              <input type="date" id="wp-day-reprog-date" value="${tomorrowIso}" class="bg-white text-slate-900 rounded px-1.5 py-1 text-[10px]"/>
              <button onclick="wpReprogramListToDate(${JSON.stringify(pendientes.map(p=>p.id)).replace(/"/g,'&quot;')}, document.getElementById('wp-day-reprog-date').value)" class="bg-white text-slate-900 text-[10px] font-bold px-2 py-1 rounded">Mover</button>
            </div>
          </div>
        ` : ''}
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
                  <div class="${statusBg} border border-slate-200 rounded p-2 text-xs cursor-pointer hover:border-slate-400" onclick="wpEditActivity('${a.id}')">
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

      <button onclick="wpBackToPlanner({reload:true})" class="w-full bg-slate-900 text-white text-sm font-bold py-2.5 rounded-lg">← Volver al calendario semanal</button>
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
        <button onclick="wpBackToPlanner({reload:true})" class="flex-1 bg-slate-900 text-white text-sm font-bold py-2 rounded">← Volver al calendario</button>
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
                  ${aRes.length ? `<div class="flex flex-wrap gap-1 mt-2">${aRes.map(r => `<span class="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs">${r.emoji} ${r.name}</span>`).join('')}</div>` : '<div class="text-[10px] text-slate-400 italic mt-1">Sin recursos asignados</div>'}
                  ${a.notes ? `<div class="text-[10px] text-slate-600 mt-2 italic">📝 ${a.notes}</div>` : ''}
                </div>
                <button onclick="wpEditActivity('${a.id}')" class="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded">✏️ Editar</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <button onclick="wpBackToPlanner({reload:true})" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">← Volver al calendario</button>
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
                        <button onclick="wpEditActivity('${a.id}')" class="text-[10px] text-slate-500 hover:text-slate-900">✏️</button>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <button onclick="wpBackToPlanner({reload:true})" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">← Volver al calendario</button>
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

  // Cargar TODAS las actividades de la casa (no solo de esta semana).
  // BUG FIX: para UUID también incluir las que matchean por property_name
  // (huérfanas del project_id por drag desde backlog / plantillas).
  let allActs = [];
  if (isNameOnly) {
    const nameOnly = homeId.slice(5);
    const { data } = await sb.from('weekly_activities').select('*').eq('property_name', nameOnly).is('project_id', null).order('date');
    allActs = data || [];
  } else {
    const [byProj, byName] = await Promise.all([
      sb.from('weekly_activities').select('*').eq('project_id', homeId).order('date'),
      homeName ? sb.from('weekly_activities').select('*').is('project_id', null).eq('property_name', homeName).order('date') : Promise.resolve({ data: [] })
    ]);
    const seen = new Set();
    allActs = [...(byProj.data||[]), ...(byName.data||[])].filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
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
  wpBackToPlanner();
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

      <button onclick="wpBackToPlanner({reload:true})" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">← Volver al calendario</button>
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
  wpBackToPlanner();
}

async function wpDeleteCompletedHouse(projectId, name) {
  if (!confirm(`¿BORRAR PERMANENTEMENTE "${name}"?\n\nEsto elimina:\n• El proyecto\n• Todas las actividades\n• Todos los benchmarks generados\n\nNo se puede deshacer. Esta casa ya no aportará al Estimador Pro.`)) return;
  await sb.from('remodel_actuals').delete().eq('project_id', projectId);
  await sb.from('weekly_activities').delete().eq('project_id', projectId);
  await sb.from('remodel_projects').delete().eq('id', projectId);
  await wpLoadAll();
  wpOpenCompletedHouses();
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

      <button onclick="wpOpenCompletedHouses()" class="w-full bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">← Volver a Terminadas</button>
    </div>
  `;
  openModal(`📊 ${name}`, html);
  document.querySelector('#modal > div').classList.remove('max-w-3xl','max-w-7xl');
  document.querySelector('#modal > div').classList.add('max-w-5xl');
}

// ════════════════════════════════════════════════════════════
// IMPORTAR CRONOGRAMA EXCEL (del Estimador Pro / remodel-forecast)
// Lee la hoja "CRONOGRAMA" con estructura: Item | Actividad | Día inicio | Duración | Día Fin
// Crea/actualiza filas en weekly_activities asociadas a un project_id elegido.
// ════════════════════════════════════════════════════════════
function wpOpenImportExcel() {
  const projOpts = wpState.projects.filter(p => p.status !== 'cancelled').map(p =>
    `<option value="${p.id}">${(p.name || p.address || '?').replace(/</g,'&lt;')}</option>`
  ).join('');
  const html = `
    <div class="space-y-4">
      <div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-800">
        📥 Sube el Excel del cronograma (generado por el Estimador Pro). Leemos la hoja
        <code class="bg-white px-1 rounded">CRONOGRAMA</code> y creamos cada actividad como
        una entrada en este calendario, asignada al proyecto que elijas.
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Proyecto destino *</label>
        <select id="wp-imp-proj" onchange="wpImpOnProjChange(this.value)" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
          <option value="">— Selecciona —</option>
          ${projOpts}
          <option value="__new__" class="font-bold text-emerald-700">➕ Crear casa nueva...</option>
        </select>
      </div>

      <!-- Form inline para crear casa nueva (oculto por default) -->
      <div id="wp-imp-newcasa" class="hidden bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3 space-y-2">
        <div class="text-xs font-bold uppercase text-emerald-800">➕ Nueva casa / proyecto</div>
        <div>
          <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Nombre / alias *</label>
          <input id="wp-newcasa-name" type="text" placeholder="Ej. Wellington · Neans · 1133 Denfield" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Dirección</label>
          <input id="wp-newcasa-addr" type="text" placeholder="Ej. 1133 Denfield Dr, Austin TX 78721" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-0.5">SqFt</label>
            <input id="wp-newcasa-sqft" type="number" min="0" placeholder="1800" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Inicio de obra</label>
            <input id="wp-newcasa-start" type="date" value="${wpDateOnly(new Date())}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Presupuesto total (USD opcional)</label>
          <input id="wp-newcasa-budget" type="number" min="0" placeholder="125000" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
        </div>
        <div class="flex gap-2">
          <button onclick="wpImpCreateNewCasa()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded">💾 Crear y seleccionar</button>
          <button onclick="wpImpCancelNewCasa()" class="bg-slate-100 hover:bg-slate-200 text-xs py-2 px-3 rounded">Cancelar</button>
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Archivo Excel (.xlsx) *</label>
        <input id="wp-imp-file" type="file" accept=".xlsx,.xls"
               class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded p-2 text-[11px] text-slate-700">
        <strong>Opciones:</strong>
        <label class="flex items-center gap-2 mt-1"><input type="checkbox" id="wp-imp-clear" /> Borrar actividades existentes del proyecto antes de importar</label>
        <label class="flex items-center gap-2 mt-1"><input type="checkbox" id="wp-imp-expand" checked /> Si la actividad dura N días, crear N filas (una por día)</label>
      </div>

      <div id="wp-imp-preview" class="hidden bg-white border border-slate-200 rounded p-3 max-h-64 overflow-y-auto"></div>

      <div class="flex gap-2">
        <button onclick="wpDoImportExcel()" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2.5 rounded-lg">📥 Importar</button>
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">Cancelar</button>
      </div>
    </div>
  `;
  openModal('📥 Importar cronograma desde Excel', html);
}

// Parser robusto: lee la hoja CRONOGRAMA con XLSX, devuelve { rows, projectStart }
function wpParseCronogramaSheet(workbook) {
  const sheetName = workbook.SheetNames.find(n => /CRONOGRAMA/i.test(n));
  if (!sheetName) throw new Error('No se encontró la hoja "CRONOGRAMA" en el Excel.');
  const ws = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
  // Estructura esperada:
  //  fila 1: título
  //  fila 2: headers (Item, Actividad, Día inicio, Duración, Día Fin, Semana 1, ...)
  //  fila 3: fechas individuales (DD/MM)
  //  fila 4+: etapas (sin código en B vacío) o sub-actividades (código en A, desc en B)
  let projectStart = null;
  // Intento detectar fecha base en fila 3 col F (6)
  const headerDateRow = rows[2] || [];
  // Estado: la etapa actual
  let currentStage = null;
  const items = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] || [];
    const codeOrTitle = (r[0] || '').toString().trim();
    const activity = (r[1] || '').toString().trim();
    const startCell = r[2];
    const durCell = r[3];
    const finCell = r[4];

    // Etapa header: tiene formato "N. ETAPA" en col A
    if (/^\d+\.\s*[A-Za-zÁÉÍÓÚñÑáéíóú]/.test(codeOrTitle) && !activity) {
      currentStage = codeOrTitle.replace(/^\d+\.\s*/, '').trim();
      continue;
    }
    // Sub-actividad: tiene desc en col B
    if (activity) {
      const startD = wpParseExcelDate(startCell);
      const finD = wpParseExcelDate(finCell);
      const duration = Number(durCell) || (startD && finD ? Math.max(1, Math.round((finD - startD) / 86400000) + 1) : 1);
      if (startD && !projectStart) projectStart = startD;
      items.push({
        code: codeOrTitle || null,
        activity_name: activity,
        stage: currentStage,
        date: startD ? wpDateOnly(startD) : null,
        duration_days: duration,
        end_date: finD ? wpDateOnly(finD) : null
      });
    }
  }
  return { items, projectStart };
}

// Convierte celda de fecha de Excel (puede venir como Date, string DD/MM/YYYY, o serial number)
function wpParseExcelDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    // Excel serial date (días desde 1900-01-01)
    return new Date(Math.round((v - 25569) * 86400 * 1000));
  }
  const s = String(v).trim();
  // ISO YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2]-1, +m[3]);
  // DD/MM/YYYY o DD-MM-YYYY
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const y = +m[3]; const yyyy = y < 100 ? 2000+y : y;
    return new Date(yyyy, +m[2]-1, +m[1]);
  }
  return null;
}

// PASO 1: parsea el Excel y muestra preview. NO publica todavía.
async function wpDoImportExcel() {
  const projId = document.getElementById('wp-imp-proj').value;
  const fileInp = document.getElementById('wp-imp-file');
  const clear = document.getElementById('wp-imp-clear').checked;
  const expand = document.getElementById('wp-imp-expand').checked;
  if (!projId) { alert('Selecciona un proyecto destino.'); return; }
  if (!fileInp.files || !fileInp.files[0]) { alert('Sube un archivo .xlsx'); return; }

  const file = fileInp.files[0];
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array', cellDates: true });
  let parsed;
  try { parsed = wpParseCronogramaSheet(workbook); }
  catch (e) { alert('Error: ' + e.message); return; }
  if (!parsed.items.length) { alert('No se encontraron actividades en la hoja CRONOGRAMA.'); return; }

  const proj = wpState.projects.find(p => p.id === projId);
  const propertyName = proj ? (proj.name || proj.address || 'Proyecto') : '';

  // Guardar en estado para el preview
  wpState.importPreview = {
    projId, propertyName, clear, expand, fileName: file.name,
    items: parsed.items.map((it, i) => ({
      ...it, id: 'p' + i,
      include: !!it.date,           // si no tiene fecha, default off
      _dateOriginal: it.date,
      _durationOriginal: it.duration_days
    })),
    projectStart: parsed.projectStart
  };
  wpRenderImportPreview();
}

// PASO 2: render del preview editable
function wpRenderImportPreview() {
  const p = wpState.importPreview;
  if (!p) return;
  const total = p.items.length;
  const included = p.items.filter(x => x.include).length;
  const conFecha = p.items.filter(x => x.date).length;

  // Agrupar por etapa para vista organizada
  const byStage = {};
  p.items.forEach(it => {
    const key = it.stage || '(sin etapa)';
    if (!byStage[key]) byStage[key] = [];
    byStage[key].push(it);
  });

  const html = `
    <div class="space-y-3">
      <div class="bg-amber-50 border-2 border-amber-300 rounded p-3 text-xs">
        <div class="font-bold text-amber-900 mb-1">👀 Vista previa antes de publicar</div>
        <div class="text-amber-800">Detecté <strong>${total}</strong> actividad(es) en <code>${p.fileName.replace(/</g,'&lt;')}</code>. Revisá, ajustá fechas si necesitás y desmarcá las que NO querés publicar. Al final hacé click en <strong>Aprobar y publicar</strong>.</div>
        <div class="mt-2 flex items-center gap-3 text-amber-900">
          <span><strong>Proyecto destino:</strong> ${(p.propertyName||'').replace(/</g,'&lt;')}</span>
          <span class="bg-amber-200 px-2 py-0.5 rounded font-bold">${included} de ${total} marcadas</span>
          ${conFecha < total ? `<span class="bg-red-200 text-red-800 px-2 py-0.5 rounded font-bold">⚠️ ${total - conFecha} sin fecha</span>` : ''}
          ${p.clear ? `<span class="bg-red-200 text-red-800 px-2 py-0.5 rounded font-bold">🗑️ Borrará actividades existentes</span>` : ''}
          ${p.expand ? `<span class="bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-bold">📅 Expandir N días → N filas</span>` : ''}
        </div>
      </div>

      <div class="flex gap-2 text-xs flex-wrap items-center">
        <button onclick="wpImportPreviewToggleAll(true)" class="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded">✓ Marcar todas</button>
        <button onclick="wpImportPreviewToggleAll(false)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded">Desmarcar todas</button>
        <button onclick="wpImportPreviewToggleEtapa('Externo')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded" title="Toggle solo las de etapa Externo">Toggle Externo</button>
        <button onclick="wpImportPreviewToggleEtapa('Interno')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded">Toggle Interno</button>
        <div class="h-5 border-l border-slate-300"></div>
        <button onclick="wpImportPreviewMarkAllCritical()" class="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded font-bold" title="Sugerir críticas: marca como Ruta Crítica las actividades estructurales (Cimentación, Estructura, Eléctrico, Plomería)">🎯 Sugerir ruta crítica</button>
        <button onclick="wpImportPreviewClearCritical()" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded">Quitar críticas</button>
        <span class="text-[10px] text-rose-700 font-bold">${p.items.filter(it=>it.is_critical).length} marcadas críticas</span>
      </div>

      <div class="bg-rose-50 border border-rose-200 rounded p-2 text-[11px] text-rose-900">
        <strong>🎯 Ruta crítica:</strong> Marcá las actividades que NO pueden retrasarse sin afectar la fecha de entrega. Si una crítica se atrasa 1 día, se alertará automáticamente. Si se adelanta, se resaltará en verde como ganancia. Las críticas tienen borde rojo grueso en el calendario.
      </div>

      <div class="border border-slate-200 rounded-lg max-h-[55vh] overflow-y-auto">
        ${Object.entries(byStage).map(([stage, items]) => `
          <div class="border-b border-slate-200">
            <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700 sticky top-0">${stage.replace(/</g,'&lt;')} <span class="bg-slate-900 text-white px-1.5 py-0.5 rounded ml-1">${items.length}</span></div>
            <table class="w-full text-xs">
              <thead><tr class="text-[10px] uppercase text-slate-500 bg-slate-50">
                <th class="p-1 w-8" title="Incluir en publicación">✓</th>
                <th class="p-1 w-8" title="Ruta crítica">⚠️</th>
                <th class="text-left p-1 w-16">Código</th>
                <th class="text-left p-1">Actividad</th>
                <th class="text-left p-1 w-32">Fecha inicio</th>
                <th class="text-right p-1 w-20">Días</th>
              </tr></thead>
              <tbody>
                ${items.map(it => `
                  <tr class="border-t border-slate-100 ${!it.date?'bg-red-50':it.is_critical?'bg-rose-50 border-l-4 border-l-rose-500':it.include?'hover:bg-emerald-50':'bg-slate-100 opacity-60'}">
                    <td class="p-1 text-center">
                      <input type="checkbox" ${it.include?'checked':''} ${!it.date?'disabled':''} onchange="wpImportPreviewToggle('${it.id}')" class="cursor-pointer"/>
                    </td>
                    <td class="p-1 text-center">
                      <input type="checkbox" ${it.is_critical?'checked':''} onchange="wpImportPreviewToggleCritical('${it.id}')" class="cursor-pointer accent-rose-600" title="Marcar como ruta crítica"/>
                    </td>
                    <td class="p-1 font-mono text-slate-600">${(it.code||'—').replace(/</g,'&lt;')}</td>
                    <td class="p-1">${it.is_critical?'<span class="text-rose-700 font-bold">⚠️ </span>':''}${(it.activity_name||'?').replace(/</g,'&lt;')}</td>
                    <td class="p-1">
                      <input type="date" value="${it.date||''}" onchange="wpImportPreviewSetDate('${it.id}', this.value)" class="border border-slate-300 rounded px-1 py-0.5 text-[11px]"/>
                    </td>
                    <td class="p-1 text-right">
                      <input type="number" min="1" max="365" value="${it.duration_days||1}" onchange="wpImportPreviewSetDuration('${it.id}', +this.value)" class="w-14 border border-slate-300 rounded px-1 py-0.5 text-[11px] text-right"/>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      </div>

      <div class="flex gap-2">
        <button onclick="wpApproveImport()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-lg" ${included===0?'disabled':''}>✓ Aprobar y publicar (${included} actividades)</button>
        <button onclick="wpCancelImport()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">Cancelar</button>
      </div>
    </div>
  `;
  // Reemplazar el contenido del modal manteniendo el modal abierto
  const body = document.getElementById('modal-body');
  if (body) body.innerHTML = html;
  const title = document.getElementById('modal-title');
  if (title) title.innerHTML = '👀 Revisá las actividades antes de publicar';
}

function wpImportPreviewToggle(id) {
  const p = wpState.importPreview;
  if (!p) return;
  const it = p.items.find(x => x.id === id);
  if (it) it.include = !it.include;
  wpRenderImportPreview();
}
function wpImportPreviewToggleAll(val) {
  const p = wpState.importPreview;
  if (!p) return;
  p.items.forEach(it => { if (it.date) it.include = val; });
  wpRenderImportPreview();
}
function wpImportPreviewToggleEtapa(stage) {
  const p = wpState.importPreview;
  if (!p) return;
  const all = p.items.filter(x => x.stage === stage && x.date);
  const allOn = all.every(x => x.include);
  all.forEach(x => x.include = !allOn);
  wpRenderImportPreview();
}
function wpImportPreviewSetDate(id, newDate) {
  const p = wpState.importPreview;
  if (!p) return;
  const it = p.items.find(x => x.id === id);
  if (it) {
    it.date = newDate || null;
    if (newDate && !it.include) it.include = true;
  }
  wpRenderImportPreview();
}
function wpImportPreviewSetDuration(id, d) {
  const p = wpState.importPreview;
  if (!p) return;
  const it = p.items.find(x => x.id === id);
  if (it) it.duration_days = Math.max(1, +d || 1);
  wpRenderImportPreview();
}
function wpImportPreviewToggleCritical(id) {
  const p = wpState.importPreview;
  if (!p) return;
  const it = p.items.find(x => x.id === id);
  if (it) it.is_critical = !it.is_critical;
  wpRenderImportPreview();
}
// Heurística: marca como críticas las etapas/códigos típicamente estructurales.
// Ruta crítica clásica de remodelación: cimentación → estructura → instalaciones
// rough → drywall → acabados. Los acabados rara vez son críticos.
function wpImportPreviewMarkAllCritical() {
  const p = wpState.importPreview;
  if (!p) return;
  const criticalKeywords = ['cimentaci','estructur','techo','demolicion','eléctric','electrico','plomeria','plomería','rough','permiso','inspecci','foundation','framing'];
  p.items.forEach(it => {
    const txt = ((it.stage||'') + ' ' + (it.activity_name||'')).toLowerCase();
    if (criticalKeywords.some(k => txt.includes(k))) it.is_critical = true;
  });
  wpRenderImportPreview();
}
function wpImportPreviewClearCritical() {
  const p = wpState.importPreview;
  if (!p) return;
  p.items.forEach(it => it.is_critical = false);
  wpRenderImportPreview();
}
function wpCancelImport() {
  wpState.importPreview = null;
  wpBackToPlanner();
}

// PASO 3: ya aprobado, hace el INSERT real
async function wpApproveImport() {
  const p = wpState.importPreview;
  if (!p) return;
  const aprobadas = p.items.filter(x => x.include && x.date);
  if (!aprobadas.length) { alert('Ninguna actividad marcada con fecha válida.'); return; }
  if (!confirm(`¿Publicar ${aprobadas.length} actividad(es) al proyecto "${p.propertyName}"?\n\nEsto las creará en el calendario semanal.${p.clear?'\n\n⚠️ Las actividades existentes del proyecto se BORRARÁN primero.':''}`)) return;

  const importBatch = 'imp_' + Date.now();

  // Borrar previas si lo pidió
  if (p.clear) {
    await sb.from('weekly_activities').delete().eq('project_id', p.projId);
  }

  // Construir filas
  const rows = [];
  for (const it of aprobadas) {
    if (p.expand && it.duration_days > 1) {
      for (let d = 0; d < it.duration_days; d++) {
        const day = wpAddDays(new Date(it.date + 'T00:00:00'), d);
        rows.push({
          project_id: p.projId,
          property_name: p.propertyName,
          date: wpDateOnly(day),
          activity_name: it.activity_name + (it.duration_days > 1 ? ` (día ${d+1}/${it.duration_days})` : ''),
          activity_code: it.code,
          stage: it.stage,
          duration_days: it.duration_days,
          priority: it.is_critical ? 'critical' : 'normal',
          status: 'planned',
          import_batch: importBatch,
          created_by: state.user.id
        });
      }
    } else {
      rows.push({
        project_id: p.projId,
        property_name: p.propertyName,
        date: it.date,
        activity_name: it.activity_name,
        activity_code: it.code,
        stage: it.stage,
        duration_days: it.duration_days,
        status: 'planned',
        import_batch: importBatch,
        created_by: state.user.id
      });
    }
  }

  // Insertar en chunks
  const chunks = [];
  for (let i = 0; i < rows.length; i += 100) chunks.push(rows.slice(i, i+100));
  for (const c of chunks) {
    const { error } = await window.safeInsert(() => sb.from('weekly_activities'), c, { select: false });
    if (error) { alert('Error guardando: ' + error.message); return; }
  }

  wpState.importPreview = null;
  await wpLoadAll();
  wpBackToPlanner();
  alert(`✅ Importadas ${rows.length} actividad(es) (${aprobadas.length} bloque(s) aprobado(s)).`);
}

// ════════════════════════════════════════════════════════════
// V2 — Portado de ops-planner (Juan Austin) adaptado a obra:
// Backlog · Catálogo de tareas · Plantillas de día · Recurrentes
// Checklist + materiales · Vista print
// ════════════════════════════════════════════════════════════

function wpSetSideTab(t) { wpState.sidePanelTab = t; wpRender(); }

// ─── Panel: BACKLOG (activities con date=null) ───
function wpRenderBacklogPanel() {
  const bl = wpState.backlog || [];
  return `
    <div class="p-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
      📥 Backlog · ${bl.length} sin fecha · arrastra a un día
    </div>
    ${bl.length === 0 ? `<div class="p-3 text-[11px] text-slate-400 italic text-center">Sin actividades en backlog. Las que no tengan fecha aparecen acá.</div>` : `
      <div class="p-2 space-y-1.5">
        ${bl.map(b => `
          <div draggable="true" ondragstart="wpBacklogDragStart('${b.id}')"
               class="bg-white border border-amber-200 hover:border-amber-500 rounded p-2 cursor-move shadow-sm">
            <div class="font-bold text-[11px] text-slate-900 truncate">${(b.activity_name||'?').replace(/</g,'&lt;')}</div>
            <div class="text-[9px] text-slate-500 truncate">${(b.property_name||b.stage||'—').replace(/</g,'&lt;')}</div>
            ${b.priority && b.priority !== 'normal' ? `<span class="text-[8px] font-bold px-1 rounded ${b.priority==='urgent'?'bg-red-100 text-red-700':b.priority==='high'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}">${b.priority.toUpperCase()}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// ─── Panel: CATÁLOGO TAREAS (wp_task_templates) ───
function wpRenderTaskTemplatesPanel() {
  const tt = wpState.taskTemplates || [];
  // Agrupar por categoría
  const byCat = {};
  tt.forEach(t => { const k = t.category || '(otros)'; if (!byCat[k]) byCat[k] = []; byCat[k].push(t); });
  return `
    <div class="p-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
      📚 Catálogo · ${tt.length} tareas · arrastra a un día
    </div>
    ${tt.length === 0 ? `<div class="p-3 text-[11px] text-slate-400 italic text-center">Sin plantillas. Corré weekly-planner-advanced-schema.sql para semilla.</div>` : `
      <div class="p-2 space-y-2">
        ${Object.entries(byCat).map(([cat, items]) => `
          <div>
            <div class="text-[9px] font-bold uppercase text-slate-500 mb-1">${cat}</div>
            <div class="space-y-1">
              ${items.map(t => `
                <div draggable="true" ondragstart="wpTaskTemplateDragStart('${t.id}')"
                     class="bg-white border border-emerald-200 hover:border-emerald-500 rounded p-1.5 cursor-move text-[11px]">
                  <span class="font-bold">${t.emoji||'🔨'} ${(t.name||'?').replace(/</g,'&lt;')}</span>
                  <span class="text-[9px] text-slate-500 ml-1">${t.default_duration_days}d</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// ─── Panel: PLANTILLAS DE DÍA (wp_day_templates) ───
function wpRenderDayTemplatesPanel() {
  const dt = wpState.dayTemplates || [];
  return `
    <div class="p-2 bg-slate-50 border-b border-slate-200">
      <div class="text-[10px] font-bold uppercase text-slate-600">🗂️ Plantillas de día · ${dt.length}</div>
      <button onclick="wpSaveCurrentDayAsTemplate()" class="text-[10px] mt-1 w-full bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-1 rounded">💾 Guardar día actual como plantilla</button>
    </div>
    ${dt.length === 0 ? `<div class="p-3 text-[11px] text-slate-400 italic text-center">Sin plantillas. Guardá un día con tareas como plantilla reusable.</div>` : `
      <div class="p-2 space-y-1.5">
        ${dt.map(d => `
          <div class="bg-white border border-blue-200 hover:border-blue-500 rounded p-2 group">
            <div class="font-bold text-[11px] text-slate-900 truncate">${(d.name||'?').replace(/</g,'&lt;')}</div>
            <div class="text-[9px] text-slate-500">${(d.tasks||[]).length} tareas</div>
            <div class="flex gap-1 mt-1">
              <button onclick="wpApplyDayTemplate('${d.id}')" class="flex-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-0.5 rounded">📋 Aplicar</button>
              <button onclick="wpDeleteDayTemplate('${d.id}')" class="text-[10px] bg-red-50 hover:bg-red-100 text-red-700 px-1.5 rounded" title="Eliminar">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// ─── Panel: RECURRENTES (wp_recurring) ───
function wpRenderRecurringPanel() {
  const rc = wpState.recurring || [];
  return `
    <div class="p-2 bg-slate-50 border-b border-slate-200">
      <div class="text-[10px] font-bold uppercase text-slate-600">🔁 Recurrentes · ${rc.length}</div>
      <button onclick="wpOpenNewRecurring()" class="text-[10px] mt-1 w-full bg-violet-100 hover:bg-violet-200 text-violet-800 font-bold py-1 rounded">+ Nueva recurrente</button>
    </div>
    ${rc.length === 0 ? `<div class="p-3 text-[11px] text-slate-400 italic text-center">Sin recurrentes. Ej: "Limpieza diaria cada 1d", "Inspección semanal".</div>` : `
      <div class="p-2 space-y-1.5">
        ${rc.map(r => {
          const tt = (wpState.taskTemplates||[]).find(t => t.id === r.base_task_id);
          const proj = (wpState.projects||[]).find(p => p.id === r.project_id);
          return `
            <div class="bg-white border border-violet-200 rounded p-2">
              <div class="font-bold text-[11px] text-slate-900 truncate">${r.custom_name || (tt && tt.name) || 'Recurrente'}</div>
              <div class="text-[9px] text-slate-500">${proj ? proj.name : r.property_name || '—'} · cada ${r.interval_days}d · próx: ${r.next_due}</div>
              <button onclick="wpDeleteRecurring('${r.id}')" class="text-[10px] mt-1 text-red-600 hover:underline">eliminar</button>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

// ─── DRAG handlers ───
function wpBacklogDragStart(id) {
  wpState.draggedBacklogId = id;
  wpState.draggedResource = null;
  wpState.draggedTemplateId = null;
}
function wpTaskTemplateDragStart(id) {
  wpState.draggedTemplateId = id;
  wpState.draggedBacklogId = null;
  wpState.draggedResource = null;
}

// Extiende wpDropOnCell para aceptar backlog y plantillas
// (la función original solo manejaba recursos — la wrappeamos)
if (typeof wpDropOnCell === 'function' && !wpDropOnCell._wrapped) {
  const _wpDropOnCellOrig = wpDropOnCell;
  window.wpDropOnCell = async function(homeId, homeName, dateStr, ev) {
    ev.preventDefault();
    // Backlog item → asignar fecha y casa
    if (wpState.draggedBacklogId) {
      const id = wpState.draggedBacklogId;
      wpState.draggedBacklogId = null;
      const updates = { date: dateStr, status: 'planned', updated_at: new Date().toISOString() };
      if (!homeId.startsWith('name:')) updates.project_id = homeId;
      if (homeName) updates.property_name = homeName;
      await sb.from('weekly_activities').update(updates).eq('id', id);
      await wpLoadAll(); wpRender();
      return;
    }
    // Task template → crear nueva actividad
    if (wpState.draggedTemplateId) {
      const id = wpState.draggedTemplateId;
      wpState.draggedTemplateId = null;
      const tt = (wpState.taskTemplates||[]).find(t => t.id === id);
      if (!tt) return;
      const newActivity = {
        date: dateStr,
        activity_name: tt.name,
        stage: tt.category,
        duration_days: tt.default_duration_days || 1,
        checklist: (tt.default_checklist||[]).map(c => ({ item: c, done: false })),
        materials: tt.default_materials || [],
        template_task_id: id,
        status: 'planned',
        created_by: state.user.id
      };
      if (!homeId.startsWith('name:')) newActivity.project_id = homeId;
      if (homeName) newActivity.property_name = homeName;
      await sb.from('weekly_activities').insert(newActivity);
      await wpLoadAll(); wpRender();
      return;
    }
    // Fallback: handler original (recursos)
    return _wpDropOnCellOrig.call(this, homeId, homeName, dateStr, ev);
  };
  window.wpDropOnCell._wrapped = true;
}

// ─── Plantillas de día ───
function wpSaveCurrentDayAsTemplate() {
  const targetDate = wpDateOnly(wpState.weekStart);
  const acts = (wpState.activities||[]).filter(a => a.date === targetDate);
  if (!acts.length) {
    if (window.toast) toast(`Sin actividades en ${targetDate}. Agregá actividades primero.`, 'warning');
    else alert(`Sin actividades en ${targetDate}. Agregá actividades primero.`);
    return;
  }
  openModal('💾 Guardar día como plantilla', `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Se guardarán las <strong>${acts.length}</strong> actividad(es) del ${targetDate} como plantilla reusable.</div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Nombre de la plantilla *</label>
        <input id="wp-dt-name" type="text" value="${(window.esc?esc('Día tipo · '+targetDate):'Día tipo · '+targetDate)}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Descripción (opcional)</label>
        <textarea id="wp-dt-desc" rows="2" placeholder="Cuándo usar esta plantilla..." class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
      </div>
      <div class="flex gap-2">
        <button onclick="wpConfirmSaveDayTemplate('${targetDate}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-lg">💾 Guardar plantilla</button>
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">Cancelar</button>
      </div>
    </div>
  `);
}

async function wpConfirmSaveDayTemplate(targetDate) {
  const name = (document.getElementById('wp-dt-name').value || '').trim();
  const description = (document.getElementById('wp-dt-desc').value || '').trim();
  if (!name) { (window.toast?toast:alert)('Falta nombre de la plantilla', 'warning'); return; }
  const acts = (wpState.activities||[]).filter(a => a.date === targetDate);
  const tasks = acts.map(a => ({
    activity_name: a.activity_name, stage: a.stage,
    duration_days: a.duration_days || 1,
    checklist: a.checklist || [], materials: a.materials || [],
    priority: a.priority || 'normal', notes: a.notes || ''
  }));
  const { error } = await sb.from('wp_day_templates').insert({
    name, description: description || null, tasks, created_by: state.user.id
  });
  if (error) {
    (window.toast?toast:alert)('Error: '+error.message, 'error');
    return;
  }
  await wpLoadAll();
  wpBackToPlanner();
  if (window.toast) toast(`✓ Plantilla "${name}" guardada con ${tasks.length} actividad(es)`, 'success');
}

function wpApplyDayTemplate(templateId) {
  const t = (wpState.dayTemplates||[]).find(x => x.id === templateId);
  if (!t) return;
  const projs = wpState.projects.filter(p => p.status !== 'cancelled');
  if (!projs.length) {
    (window.toast?toast:alert)('Sin proyectos. Creá uno primero.', 'warning');
    return;
  }
  openModal(`📋 Aplicar "${(window.esc?esc(t.name):t.name)}"`, `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Se crearán <strong>${(t.tasks||[]).length}</strong> actividad(es) en la casa y fecha que elijas.</div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Casa destino *</label>
        <select id="wp-at-proj" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
          <option value="">— Seleccioná —</option>
          ${projs.map(p => `<option value="${p.id}">${(window.esc?esc(p.name||p.address||'?'):p.name||p.address||'?')}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Fecha *</label>
        <input id="wp-at-date" type="date" value="${wpDateOnly(wpState.weekStart)}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
      </div>
      <div class="flex gap-2">
        <button onclick="wpConfirmApplyDayTemplate('${templateId}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-lg">📋 Aplicar plantilla</button>
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">Cancelar</button>
      </div>
    </div>
  `);
}

async function wpConfirmApplyDayTemplate(templateId) {
  const t = (wpState.dayTemplates||[]).find(x => x.id === templateId);
  if (!t) return;
  const projId = document.getElementById('wp-at-proj').value;
  const dateStr = document.getElementById('wp-at-date').value;
  if (!projId || !dateStr) {
    (window.toast?toast:alert)('Completá casa y fecha', 'warning');
    return;
  }
  const sel = wpState.projects.find(p => p.id === projId);
  if (!sel) return;
  const rows = (t.tasks||[]).map(task => ({
    project_id: sel.id,
    property_name: sel.name || sel.address,
    date: dateStr,
    activity_name: task.activity_name, stage: task.stage,
    duration_days: task.duration_days || 1,
    checklist: task.checklist || [], materials: task.materials || [],
    priority: task.priority || 'normal',
    notes: task.notes || null,
    day_template_id: templateId,
    status: 'planned',
    created_by: state.user.id
  }));
  if (!rows.length) { (window.toast?toast:alert)('Plantilla vacía.', 'warning'); return; }
  const { error } = await sb.from('weekly_activities').insert(rows);
  if (error) { (window.toast?toast:alert)('Error: '+error.message, 'error'); return; }
  await wpLoadAll();
  wpBackToPlanner();
  if (window.toast) toast(`✓ ${rows.length} actividad(es) creadas en ${sel.name||sel.address} para ${dateStr}`, 'success');
}

async function wpDeleteDayTemplate(id) {
  if (window.confirmDialog) {
    const ok = await confirmDialog({
      title: 'Eliminar plantilla',
      message: '¿Eliminar esta plantilla? Las actividades ya creadas no se borran.',
      okText: 'Eliminar', okClass: 'bg-red-600 hover:bg-red-700'
    });
    if (!ok) return;
  } else {
    if (!confirm('Eliminar esta plantilla? Las actividades ya creadas no se borran.')) return;
  }
  await sb.from('wp_day_templates').delete().eq('id', id);
  await wpLoadAll(); wpRender();
}

// ─── Recurrentes ───
function wpOpenNewRecurring() {
  const tt = wpState.taskTemplates || [];
  const projs = wpState.projects.filter(p => p.status !== 'cancelled');
  if (!tt.length) return alert('Sin plantillas de tarea. Corré weekly-planner-advanced-schema.sql.');
  if (!projs.length) return alert('Sin proyectos activos.');

  const html = `
    <div class="space-y-3">
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tarea base *</label>
        <select id="wp-rec-tt" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
          <option value="">— Elegí una plantilla —</option>
          ${tt.map(t => `<option value="${t.id}">${t.emoji||'🔨'} ${t.name} (${t.default_duration_days}d)</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Proyecto / casa *</label>
        <select id="wp-rec-proj" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
          <option value="">— Elegí proyecto —</option>
          ${projs.map(p => `<option value="${p.id}">${(p.name||p.address||'?').replace(/</g,'&lt;')}</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Cada N días *</label>
          <input id="wp-rec-int" type="number" min="1" max="365" value="7" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Próxima fecha *</label>
          <input id="wp-rec-next" type="date" value="${wpDateOnly(new Date())}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Nombre personalizado (opcional)</label>
        <input id="wp-rec-name" type="text" placeholder="Ej. Limpieza diaria Wellington" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
      </div>
      <div class="flex gap-2">
        <button onclick="wpSaveRecurring()" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm py-2.5 rounded">💾 Crear recurrente</button>
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded">Cancelar</button>
      </div>
    </div>
  `;
  openModal('🔁 Nueva tarea recurrente', html);
}

async function wpSaveRecurring() {
  const ttId = document.getElementById('wp-rec-tt').value;
  const projId = document.getElementById('wp-rec-proj').value;
  const interval = +document.getElementById('wp-rec-int').value || 7;
  const next = document.getElementById('wp-rec-next').value;
  const customName = document.getElementById('wp-rec-name').value.trim();
  if (!ttId || !projId || !next) return alert('Completá los campos requeridos.');
  const proj = wpState.projects.find(p => p.id === projId);
  const tt = wpState.taskTemplates.find(t => t.id === ttId);
  const { error } = await sb.from('wp_recurring').insert({
    base_task_id: ttId,
    project_id: projId,
    property_name: proj?.name || proj?.address || null,
    custom_name: customName || null,
    stage: tt?.category || null,
    duration_days: tt?.default_duration_days || 1,
    interval_days: interval,
    next_due: next
  });
  if (error) return alert('Error: '+error.message);
  await wpLoadAll();
  wpBackToPlanner();
}

async function wpDeleteRecurring(id) {
  if (!confirm('Eliminar esta recurrente?')) return;
  await sb.from('wp_recurring').update({ active: false }).eq('id', id);
  await wpLoadAll(); wpRender();
}

// Genera actividades de recurrentes vencidas (llamar después de wpLoadAll en cada apertura)
async function wpGenerateRecurringDue() {
  const today = wpDateOnly(new Date());
  const due = (wpState.recurring||[]).filter(r => r.next_due <= today);
  if (!due.length) return 0;

  // LOCK con UPDATE condicional: solo procesa cada recurring SI nadie más lo
  // movió ya. Antes 2 pestañas abiertas duplicaban actividades del día.
  // Marcamos last_generated y next_due en un solo UPDATE que solo afecta
  // si last_generated < today (la 2da pestaña no encuentra nada que mover).
  const actuallyDue = [];
  for (const r of due) {
    const next = new Date(today + 'T00:00:00');
    next.setDate(next.getDate() + r.interval_days);
    const { data } = await sb.from('wp_recurring')
      .update({ last_generated: today, next_due: wpDateOnly(next) })
      .eq('id', r.id)
      .or(`last_generated.is.null,last_generated.lt.${today}`)
      .select('id')
      .maybeSingle();
    if (data) actuallyDue.push(r);
  }
  if (!actuallyDue.length) return 0;

  const rows = [];
  for (const r of actuallyDue) {
    const tt = (wpState.taskTemplates||[]).find(t => t.id === r.base_task_id);
    rows.push({
      project_id: r.project_id,
      property_name: r.property_name,
      date: today,
      activity_name: r.custom_name || (tt && tt.name) || 'Recurrente',
      stage: r.stage,
      duration_days: r.duration_days || 1,
      checklist: (tt?.default_checklist || []).map(c => ({ item: c, done: false })),
      materials: tt?.default_materials || [],
      recurring_id: r.id,
      status: 'planned',
      created_by: state.user.id
    });
  }
  if (rows.length) await sb.from('weekly_activities').insert(rows);
  return rows.length;
}

// ─── Checklist modal por actividad ───
function wpOpenChecklist(activityId) {
  const a = (wpState.activities||[]).find(x => x.id === activityId);
  if (!a) return;
  wpState.showChecklistFor = activityId;
  openModal(`✅ ${a.activity_name}`, `<div id="wp-checklist-body">${wpRenderChecklistBody(a)}</div>`);
}

// Re-renderiza SOLO el body del modal de checklist sin reabrir todo.
// Preserva el foco del input activo (escape XSS via esc()).
function wpRefreshChecklistModalBody(activityId) {
  const a = (wpState.activities||[]).find(x => x.id === activityId);
  if (!a) return;
  const body = document.getElementById('wp-checklist-body');
  if (!body) return;
  // Preservar foco
  const activeEl = document.activeElement;
  const activeAttr = activeEl && activeEl.getAttribute ? activeEl.getAttribute('data-wp-id') : null;
  const cursorPos = activeEl && activeEl.selectionStart;
  body.innerHTML = wpRenderChecklistBody(a);
  if (activeAttr) {
    const next = body.querySelector(`[data-wp-id="${activeAttr}"]`);
    if (next) {
      next.focus();
      if (cursorPos != null && next.setSelectionRange) {
        try { next.setSelectionRange(cursorPos, cursorPos); } catch {}
      }
    }
  }
}

function wpRenderChecklistBody(a) {
  const activityId = a.id;
  const checklist = a.checklist || [];
  const materials = a.materials || [];
  const e = (s) => (window.esc ? window.esc(s) : String(s||'').replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[c])));
  return `
    <div class="space-y-4">
      <div>
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">✅ Checklist de pasos</div>
        <ul class="space-y-1 mb-2">
          ${checklist.map((item, idx) => `
            <li class="flex items-center gap-2 bg-white border border-slate-200 rounded px-2 py-1.5">
              <input type="checkbox" ${item.done?'checked':''} onchange="wpToggleChecklistItem('${activityId}', ${idx})" class="cursor-pointer"/>
              <input type="text" data-wp-id="cl-${idx}" value="${e(item.item)}" onchange="wpEditChecklistItem('${activityId}', ${idx}, this.value)" class="flex-1 border-none text-sm ${item.done?'line-through text-slate-400':''} bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1"/>
              <button onclick="wpRemoveChecklistItem('${activityId}', ${idx})" class="text-red-500 hover:text-red-700 text-xs">✕</button>
            </li>
          `).join('')}
        </ul>
        <div class="flex gap-1">
          <input type="text" data-wp-id="new-cl" id="wp-new-checklist" placeholder="Nuevo paso..." onkeydown="if(event.key==='Enter'){wpAddChecklistItem('${activityId}', this.value, this);}" class="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"/>
          <button onclick="wpAddChecklistItem('${activityId}', document.getElementById('wp-new-checklist').value, document.getElementById('wp-new-checklist'))" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm">+</button>
        </div>
      </div>

      <div>
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">📦 Materiales</div>
        <ul class="space-y-1 mb-2">
          ${materials.map((m, idx) => `
            <li class="flex items-center gap-2 bg-white border border-slate-200 rounded px-2 py-1.5 text-xs">
              <input type="text" data-wp-id="mat-name-${idx}" value="${e(m.nombre)}" onchange="wpEditMaterial('${activityId}', ${idx}, 'nombre', this.value)" class="flex-1 border-none bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1" placeholder="Nombre"/>
              <input type="number" data-wp-id="mat-qty-${idx}" value="${m.cantidad||1}" onchange="wpEditMaterial('${activityId}', ${idx}, 'cantidad', this.value)" class="w-20 border border-slate-200 rounded px-1 text-right"/>
              <input type="text" data-wp-id="mat-unit-${idx}" value="${e(m.unidad)}" onchange="wpEditMaterial('${activityId}', ${idx}, 'unidad', this.value)" class="w-20 border border-slate-200 rounded px-1" placeholder="ud"/>
              <button onclick="wpRemoveMaterial('${activityId}', ${idx})" class="text-red-500 hover:text-red-700">✕</button>
            </li>
          `).join('')}
        </ul>
        <button onclick="wpAddMaterial('${activityId}')" class="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded">+ Material</button>
      </div>

      <div>
        <label class="block text-xs font-bold uppercase text-slate-700 mb-1">📝 Notas</label>
        <textarea data-wp-id="notes" rows="2" onchange="wpUpdateNotes('${activityId}', this.value)" class="w-full border border-slate-300 rounded px-2 py-1 text-xs">${e(a.notes)}</textarea>
      </div>

      <div class="flex gap-2">
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded">Cerrar</button>
      </div>
    </div>
  `;
}

async function wpToggleChecklistItem(activityId, idx) {
  const a = (wpState.activities||[]).find(x => x.id === activityId);
  if (!a) return;
  const cl = [...(a.checklist||[])];
  cl[idx] = { ...cl[idx], done: !cl[idx].done };
  await sb.from('weekly_activities').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', activityId);
  await wpLoadAll();
  // UX: re-render del body en lugar de reabrir modal — preserva foco del input
  wpRefreshChecklistModalBody(activityId);
}
async function wpEditChecklistItem(activityId, idx, value) {
  const a = (wpState.activities||[]).find(x => x.id === activityId);
  if (!a) return;
  const cl = [...(a.checklist||[])];
  cl[idx] = { ...cl[idx], item: value };
  await sb.from('weekly_activities').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', activityId);
  await wpLoadAll();
}
async function wpRemoveChecklistItem(activityId, idx) {
  const a = (wpState.activities||[]).find(x => x.id === activityId);
  if (!a) return;
  const cl = [...(a.checklist||[])];
  cl.splice(idx, 1);
  await sb.from('weekly_activities').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', activityId);
  await wpLoadAll();
  // UX: re-render del body en lugar de reabrir modal — preserva foco del input
  wpRefreshChecklistModalBody(activityId);
}
async function wpAddChecklistItem(activityId, value, input) {
  const v = (value||'').trim(); if (!v) return;
  const a = (wpState.activities||[]).find(x => x.id === activityId);
  if (!a) return;
  const cl = [...(a.checklist||[]), { item: v, done: false }];
  await sb.from('weekly_activities').update({ checklist: cl, updated_at: new Date().toISOString() }).eq('id', activityId);
  await wpLoadAll();
  if (input) input.value = '';
  wpOpenChecklist(activityId);
}
async function wpAddMaterial(activityId) {
  const a = (wpState.activities||[]).find(x => x.id === activityId);
  if (!a) return;
  const mat = [...(a.materials||[]), { nombre: '', cantidad: 1, unidad: 'ud' }];
  await sb.from('weekly_activities').update({ materials: mat, updated_at: new Date().toISOString() }).eq('id', activityId);
  await wpLoadAll();
  // UX: re-render del body en lugar de reabrir modal — preserva foco del input
  wpRefreshChecklistModalBody(activityId);
}
async function wpEditMaterial(activityId, idx, field, value) {
  const a = (wpState.activities||[]).find(x => x.id === activityId);
  if (!a) return;
  const mat = [...(a.materials||[])];
  mat[idx] = { ...mat[idx], [field]: field === 'cantidad' ? +value : value };
  await sb.from('weekly_activities').update({ materials: mat, updated_at: new Date().toISOString() }).eq('id', activityId);
  await wpLoadAll();
}
async function wpRemoveMaterial(activityId, idx) {
  const a = (wpState.activities||[]).find(x => x.id === activityId);
  if (!a) return;
  const mat = [...(a.materials||[])];
  mat.splice(idx, 1);
  await sb.from('weekly_activities').update({ materials: mat, updated_at: new Date().toISOString() }).eq('id', activityId);
  await wpLoadAll();
  // UX: re-render del body en lugar de reabrir modal — preserva foco del input
  wpRefreshChecklistModalBody(activityId);
}
async function wpUpdateNotes(activityId, value) {
  await sb.from('weekly_activities').update({ notes: value, updated_at: new Date().toISOString() }).eq('id', activityId);
  await wpLoadAll();
}

// Modal con date picker en lugar de prompt() para elegir el día a imprimir.
function wpOpenPrintPicker() {
  const today = wpDateOnly(new Date());
  // Lista de casas activas para el selector
  const hiddenProjectIds = new Set(wpState.projects.filter(p => p.status === 'completed' || p.status === 'cancelled').map(p => p.id));
  const activeProjects = wpState.projects.filter(p => !hiddenProjectIds.has(p.id));
  const extraNames = new Set();
  wpState.activities.forEach(a => {
    if (!a.project_id && a.property_name) extraNames.add(a.property_name);
  });
  const houseOpts = [
    `<option value="all">🏘️ Todas las casas</option>`,
    ...activeProjects.map(p => `<option value="${p.id}">🏠 ${(p.name||'').replace(/</g,'&lt;')}</option>`),
    ...Array.from(extraNames).map(n => `<option value="name:${n.replace(/"/g,'&quot;')}">🏠 ${n.replace(/</g,'&lt;')}</option>`)
  ].join('');

  openModal('🖨️ Imprimir entregable', `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Generá un PDF para imprimir o enviar al equipo. Elegí el alcance.</div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">¿Qué imprimir?</label>
        <div class="grid grid-cols-2 gap-2">
          <label class="border border-slate-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center gap-2">
            <input type="radio" name="wp-print-scope" value="day" checked onchange="document.getElementById('wp-print-range').classList.add('hidden'); document.getElementById('wp-print-day').classList.remove('hidden')"/>
            <div><div class="font-bold text-sm">📅 Un día</div><div class="text-[10px] text-slate-500">Entregable diario para el crew</div></div>
          </label>
          <label class="border border-slate-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center gap-2">
            <input type="radio" name="wp-print-scope" value="range" onchange="document.getElementById('wp-print-day').classList.add('hidden'); document.getElementById('wp-print-range').classList.remove('hidden')"/>
            <div><div class="font-bold text-sm">📆 Rango / Semana</div><div class="text-[10px] text-slate-500">Plan completo de la casa</div></div>
          </label>
        </div>
      </div>

      <div id="wp-print-day">
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Fecha</label>
        <input id="wp-print-date" type="date" value="${today}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
      </div>

      <div id="wp-print-range" class="hidden grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Desde</label>
          <input id="wp-print-from" type="date" value="${wpDateOnly(wpState.weekStart||new Date())}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Hasta</label>
          <input id="wp-print-to" type="date" value="${wpDateOnly(wpAddDays(wpState.weekStart||new Date(),6))}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Casa</label>
        <select id="wp-print-house" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">${houseOpts}</select>
        <div class="text-[10px] text-slate-500 mt-1">Por default usa el filtro actual del calendario.</div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Formato</label>
        <div class="grid grid-cols-2 gap-2">
          <label class="border border-slate-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-start gap-2">
            <input type="radio" name="wp-print-format" value="worker" checked class="mt-0.5"/>
            <div><div class="font-bold text-sm">👷 Para obreros</div><div class="text-[10px] text-slate-500">Tipografía grande, checkboxes enormes, sin tecnicismos</div></div>
          </label>
          <label class="border border-slate-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-start gap-2">
            <input type="radio" name="wp-print-format" value="tech" class="mt-0.5"/>
            <div><div class="font-bold text-sm">📋 Ejecutivo</div><div class="text-[10px] text-slate-500">Compacto, con detalle técnico</div></div>
          </label>
        </div>
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="wpDoPrint()" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-lg">🖨️ Generar PDF</button>
        <button onclick="wpDoWAFromPicker()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-lg">💬 Enviar WhatsApp</button>
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">Cancelar</button>
      </div>
    </div>
  `);
  // Pre-seleccionar casa por filtro actual
  setTimeout(() => {
    const sel = document.getElementById('wp-print-house');
    if (sel) sel.value = wpState.houseFilter || 'all';
  }, 50);
}

// Atajo: desde el print picker, ir directo a WhatsApp del día seleccionado
function wpDoWAFromPicker() {
  const scope = document.querySelector('input[name="wp-print-scope"]:checked')?.value || 'day';
  const house = document.getElementById('wp-print-house').value;
  const d = scope === 'day'
    ? document.getElementById('wp-print-date').value
    : document.getElementById('wp-print-from').value;
  if (!d) return;
  wpBackToPlanner();
  wpShareWhatsApp(d, house);
}

function wpDoPrint() {
  const scope = document.querySelector('input[name="wp-print-scope"]:checked')?.value || 'day';
  const house = document.getElementById('wp-print-house').value;
  const format = document.querySelector('input[name="wp-print-format"]:checked')?.value || 'worker';
  // En lugar de imprimir directo: abre editor pre-print para revisar herramientas + materiales
  let from, to;
  if (scope === 'day') {
    from = to = document.getElementById('wp-print-date').value;
    if (!from) return;
  } else {
    from = document.getElementById('wp-print-from').value;
    to = document.getElementById('wp-print-to').value;
    if (!from || !to) return;
  }
  wpOpenPrePrintEditor({ scope, from, to, house, format });
}

// ─── Editor pre-print: revisar/editar herramientas + materiales antes de imprimir ───
const wpPrePrint = { ctx: null };

function wpOpenPrePrintEditor(ctx) {
  wpPrePrint.ctx = ctx;
  let acts = (wpState.activities||[]).filter(a => a.date >= ctx.from && a.date <= ctx.to);
  acts = wpFilterActsByHouse(acts, ctx.house || 'all');
  if (!acts.length) { alert('Sin actividades en ese rango.'); return; }
  // Agrupar por día
  const byDay = {};
  acts.forEach(a => {
    if (!byDay[a.date]) byDay[a.date] = [];
    byDay[a.date].push(a);
  });
  const days = Object.keys(byDay).sort();
  wpPrePrint.acts = acts;
  wpRenderPrePrintEditor(days, byDay);
}

function wpRenderPrePrintEditor(days, byDay) {
  const ctx = wpPrePrint.ctx;
  const html = `
    <div class="space-y-3">
      <div class="bg-amber-50 border border-amber-300 rounded p-3 text-xs text-amber-900">
        <strong>📝 Revisá y editá antes de imprimir.</strong> Agregá o quitá herramientas y materiales en cada tarea.
        Los cambios se guardan automáticamente — cuando termines, clic en <strong>🖨️ Generar impresión</strong>.
      </div>

      <div class="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
        ${days.map(d => {
          const dLbl = new Date(d+'T00:00:00').toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });
          return `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-900 text-white px-3 py-2 text-sm font-bold capitalize">📅 ${dLbl}</div>
            <div class="divide-y divide-slate-100">
              ${byDay[d].map(a => `
                <div class="p-3" data-act-id="${a.id}">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <div class="font-bold text-sm">${(a.activity_name||'').replace(/</g,'&lt;')}</div>
                      <div class="text-[10px] text-slate-500">${a.property_name||''} ${a.stage?'· '+a.stage:''}</div>
                    </div>
                    <button onclick="wpEditActivity('${a.id}')" class="text-[10px] text-slate-500 hover:text-slate-900">✏️ Editar tarea completa</button>
                  </div>

                  <!-- Materiales -->
                  <div class="bg-amber-50 border border-amber-200 rounded p-2 mb-1.5">
                    <div class="flex items-center justify-between mb-1">
                      <div class="text-[10px] font-bold uppercase text-amber-800">📦 Materiales (${(a.materials||[]).length})</div>
                      <button onclick="wpPrePrintAddMaterial('${a.id}')" class="text-[10px] bg-white border border-amber-300 hover:bg-amber-100 px-1.5 py-0.5 rounded font-bold">+ Agregar</button>
                    </div>
                    ${(a.materials||[]).length === 0 ? '<div class="text-[10px] text-slate-400 italic">Sin materiales</div>' :
                      (a.materials||[]).map((m, idx) => `
                        <div class="flex items-center gap-1 mb-1">
                          <input type="text" value="${(m.nombre||'').replace(/"/g,'&quot;')}" placeholder="Nombre" onchange="wpPrePrintEditMaterial('${a.id}', ${idx}, 'nombre', this.value)" class="flex-1 border border-amber-300 rounded px-1.5 py-0.5 text-xs"/>
                          <input type="number" min="0" step="0.5" value="${m.cantidad||1}" onchange="wpPrePrintEditMaterial('${a.id}', ${idx}, 'cantidad', this.value)" class="w-16 border border-amber-300 rounded px-1.5 py-0.5 text-xs text-right"/>
                          <input type="text" value="${(m.unidad||'ud').replace(/"/g,'&quot;')}" placeholder="ud" onchange="wpPrePrintEditMaterial('${a.id}', ${idx}, 'unidad', this.value)" class="w-14 border border-amber-300 rounded px-1.5 py-0.5 text-xs"/>
                          <button onclick="wpPrePrintRemoveMaterial('${a.id}', ${idx})" class="text-red-600 hover:bg-red-100 px-1.5 rounded">✕</button>
                        </div>
                      `).join('')
                    }
                  </div>

                  <!-- Herramientas (recursos tipo tool/vehicle/other) -->
                  <div class="bg-blue-50 border border-blue-200 rounded p-2">
                    <div class="flex items-center justify-between mb-1">
                      <div class="text-[10px] font-bold uppercase text-blue-800">🔧 Herramientas / Equipos</div>
                      <select onchange="if(this.value){wpPrePrintAddTool('${a.id}', this.value); this.value='';}" class="text-[10px] border border-blue-300 rounded px-1 py-0.5">
                        <option value="">+ Agregar herramienta...</option>
                        ${wpState.resources.filter(r => ['tool','vehicle','other'].includes(r.type) && !(a.resource_ids||[]).includes(r.id)).map(r => `<option value="${r.id}">${r.emoji} ${r.name}</option>`).join('')}
                      </select>
                    </div>
                    <div class="flex flex-wrap gap-1">
                      ${((a.resource_ids||[]).map(rid => wpState.resources.find(r => r.id === rid)).filter(r => r && ['tool','vehicle','other'].includes(r.type)).map(r => `
                        <span class="bg-white border border-blue-300 rounded px-1.5 py-0.5 text-xs flex items-center gap-1">${r.emoji} ${r.name}<button onclick="wpPrePrintRemoveTool('${a.id}', '${r.id}')" class="text-red-600 hover:bg-red-100 ml-0.5 px-1 rounded">✕</button></span>
                      `).join('')) || '<span class="text-[10px] text-slate-400 italic">Sin herramientas</span>'}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          `;
        }).join('')}
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="wpFinishPrePrint()" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded">🖨️ Generar impresión</button>
      </div>
    </div>
  `;
  openModal('📝 Revisar herramientas y materiales antes de imprimir', html);
}

function wpFinishPrePrint() {
  const ctx = wpPrePrint.ctx;
  if (!ctx) return;
  wpBackToPlanner();
  if (ctx.scope === 'day') {
    if (ctx.format === 'worker') wpOpenPrintViewWorker(ctx.from, ctx.house);
    else wpOpenPrintView(ctx.from, ctx.house);
  } else {
    if (ctx.format === 'worker') wpOpenPrintRangeWorker(ctx.from, ctx.to, ctx.house);
    else wpOpenPrintRange(ctx.from, ctx.to, ctx.house);
  }
}

// Construye el catálogo de materiales más usados a partir de todas las tareas
function wpGetMaterialCatalog() {
  const counts = {};
  (wpState.activities||[]).forEach(a => {
    (a.materials||[]).forEach(m => {
      if (!m.nombre) return;
      const key = m.nombre.trim().toLowerCase();
      if (!counts[key]) counts[key] = { nombre: m.nombre.trim(), unidad: m.unidad || 'ud', count: 0, sumCantidad: 0 };
      counts[key].count++;
      counts[key].sumCantidad += (+m.cantidad || 0);
    });
  });
  return Object.values(counts)
    .sort((a,b) => b.count - a.count)
    .slice(0, 30)
    .map(c => ({ ...c, cantidadProm: Math.round(c.sumCantidad / c.count * 10) / 10 || 1 }));
}

async function wpPrePrintAddMaterial(actId) {
  const a = (wpState.activities||[]).find(x => x.id === actId);
  if (!a) return;
  // Si hay catálogo, mostrar selector. Sino, agregar vacío.
  const catalog = wpGetMaterialCatalog();
  if (catalog.length === 0) {
    const mats = [...(a.materials||[]), { nombre: '', cantidad: 1, unidad: 'ud' }];
    a.materials = mats;
    const { error } = await window.safeUpdate(p => sb.from('weekly_activities').update(p).eq('id', actId), { materials: mats, updated_at: new Date().toISOString() });
    if (error) return alert('Error: ' + error.message);
    wpOpenPrePrintEditor(wpPrePrint.ctx);
    return;
  }
  openModal('📦 Agregar material', `
    <div class="space-y-3 max-h-[60vh] overflow-y-auto">
      <div class="text-xs text-slate-600">Elegí del catálogo (materiales más usados) o creá uno nuevo.</div>
      <div class="grid grid-cols-2 gap-1.5">
        ${catalog.map(c => `
          <button onclick="wpPrePrintConfirmMaterial('${actId}', ${JSON.stringify({nombre:c.nombre,cantidad:c.cantidadProm,unidad:c.unidad}).replace(/"/g,'&quot;')})" class="text-left border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded p-2">
            <div class="text-sm font-semibold">${c.nombre.replace(/</g,'&lt;')}</div>
            <div class="text-[10px] text-slate-500">≈${c.cantidadProm} ${c.unidad} · usado ${c.count}×</div>
          </button>
        `).join('')}
      </div>
      <div class="pt-2 border-t border-slate-200">
        <button onclick="wpPrePrintAddMaterialBlank('${actId}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">+ Crear material nuevo</button>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="wpOpenPrePrintEditor(wpPrePrint.ctx)" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
      </div>
    </div>
  `);
}

async function wpPrePrintConfirmMaterial(actId, m) {
  const a = (wpState.activities||[]).find(x => x.id === actId);
  if (!a) return;
  const mats = [...(a.materials||[]), m];
  a.materials = mats;
  await window.safeUpdate(p => sb.from('weekly_activities').update(p).eq('id', actId), { materials: mats, updated_at: new Date().toISOString() });
  wpOpenPrePrintEditor(wpPrePrint.ctx);
}

async function wpPrePrintAddMaterialBlank(actId) {
  const a = (wpState.activities||[]).find(x => x.id === actId);
  if (!a) return;
  const mats = [...(a.materials||[]), { nombre: '', cantidad: 1, unidad: 'ud' }];
  a.materials = mats;
  await window.safeUpdate(p => sb.from('weekly_activities').update(p).eq('id', actId), { materials: mats, updated_at: new Date().toISOString() });
  wpOpenPrePrintEditor(wpPrePrint.ctx);
}

async function wpPrePrintEditMaterial(actId, idx, field, value) {
  const a = (wpState.activities||[]).find(x => x.id === actId);
  if (!a) return;
  const mats = [...(a.materials||[])];
  mats[idx] = { ...mats[idx], [field]: field === 'cantidad' ? +value : value };
  a.materials = mats;
  await window.safeUpdate(p => sb.from('weekly_activities').update(p).eq('id', actId), { materials: mats, updated_at: new Date().toISOString() });
}

async function wpPrePrintRemoveMaterial(actId, idx) {
  const a = (wpState.activities||[]).find(x => x.id === actId);
  if (!a) return;
  const mats = [...(a.materials||[])];
  mats.splice(idx, 1);
  a.materials = mats;
  await window.safeUpdate(p => sb.from('weekly_activities').update(p).eq('id', actId), { materials: mats, updated_at: new Date().toISOString() });
  wpOpenPrePrintEditor(wpPrePrint.ctx);
}

async function wpPrePrintAddTool(actId, resourceId) {
  const a = (wpState.activities||[]).find(x => x.id === actId);
  if (!a) return;
  const ids = [...(a.resource_ids||[]), resourceId];
  a.resource_ids = ids;
  await window.safeUpdate(p => sb.from('weekly_activities').update(p).eq('id', actId), { resource_ids: ids, updated_at: new Date().toISOString() });
  wpOpenPrePrintEditor(wpPrePrint.ctx);
}

async function wpPrePrintRemoveTool(actId, resourceId) {
  const a = (wpState.activities||[]).find(x => x.id === actId);
  if (!a) return;
  const ids = (a.resource_ids||[]).filter(x => x !== resourceId);
  a.resource_ids = ids;
  await window.safeUpdate(p => sb.from('weekly_activities').update(p).eq('id', actId), { resource_ids: ids, updated_at: new Date().toISOString() });
  wpOpenPrePrintEditor(wpPrePrint.ctx);
}

// ─── Print SUPER simple para obreros — día único ───
// Tipografía grande, iconos enormes, checkbox interactivo en pantalla,
// 1 actividad por card grande, sin jerga técnica.
function wpOpenPrintViewWorker(dateStr, homeFilter) {
  let acts = (wpState.activities||[]).filter(a => a.date === dateStr);
  acts = wpFilterActsByHouse(acts, homeFilter || 'all');
  if (!acts.length) return alert(`Sin actividades en ${dateStr}.`);
  const byHome = {};
  acts.forEach(a => {
    const key = a.project_id || ('name:'+a.property_name);
    if (!byHome[key]) byHome[key] = { name: a.property_name || '?', acts: [] };
    byHome[key].acts.push(a);
  });
  const d = new Date(dateStr + 'T00:00:00');
  const dateLbl = d.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });

  const html = `
    <!DOCTYPE html><html><head><title>Tareas del día · ${dateStr}</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; }
      @media print { .no-print{display:none!important;} body{margin:1cm;} .card{page-break-inside:avoid;} }
    </style>
    </head><body class="p-6 bg-white">
      <div class="no-print mb-4 flex gap-2 sticky top-0 bg-white z-10 py-2">
        <button onclick="window.print()" class="bg-blue-600 text-white font-bold text-lg px-6 py-3 rounded-lg">🖨️ Imprimir</button>
        <button onclick="window.close()" class="bg-slate-100 text-lg px-6 py-3 rounded-lg">✕ Cerrar</button>
      </div>

      <!-- Header gigante -->
      <div class="border-b-4 border-slate-900 pb-4 mb-6 text-center">
        <div class="text-2xl font-bold text-slate-500 uppercase">Tareas para</div>
        <div class="text-5xl font-black capitalize mt-1">${dateLbl}</div>
        <div class="text-xl text-slate-700 mt-2">${acts.length} tareas · ${Object.keys(byHome).length} casa(s)</div>
      </div>

      ${Object.entries(byHome).map(([key, h]) => `
        <div class="mb-8">
          <div class="bg-slate-900 text-white text-3xl font-bold px-5 py-3 rounded-t-2xl">🏠 ${h.name.replace(/</g,'&lt;')}</div>
          <div class="space-y-3 mt-3">
            ${h.acts.map((a, idx) => {
              const isDone = a.status === 'done';
              const isCritical = a.priority === 'critical' || a.priority === 'urgent';
              const isPostponed = (a.notes||'').includes('[APLAZADA');
              const cardBg = isDone ? 'bg-emerald-50 border-emerald-400' :
                             isCritical ? 'bg-rose-50 border-rose-500' :
                             isPostponed ? 'bg-amber-50 border-amber-400' :
                             'bg-white border-slate-300';
              return `
              <div class="card border-4 ${cardBg} rounded-2xl p-5 shadow-sm">
                <div class="flex items-start gap-4">
                  <!-- Checkbox enorme -->
                  <label class="flex-shrink-0 cursor-pointer no-print" style="margin-top:2px">
                    <input type="checkbox" ${isDone?'checked':''}
                      onchange="window.opener && window.opener.wpQuickToggleDone && window.opener.wpQuickToggleDone('${a.id}'); this.parentElement.parentElement.parentElement.classList.toggle('bg-emerald-50'); this.parentElement.parentElement.parentElement.classList.toggle('border-emerald-400');"
                      class="w-10 h-10 accent-emerald-600"/>
                  </label>
                  <!-- Cuadrito impreso (no-screen) -->
                  <div class="hidden print:block flex-shrink-0 w-12 h-12 border-4 border-slate-900 rounded ${isDone?'bg-slate-900':''}" style="margin-top:2px">
                    ${isDone?'<div class="text-white text-4xl text-center leading-none">✓</div>':''}
                  </div>
                  <div class="flex-1 min-w-0">
                    <!-- Número de tarea -->
                    <div class="flex items-center gap-3 flex-wrap mb-1">
                      <div class="bg-slate-900 text-white text-xl font-bold px-3 py-1 rounded-full">${idx+1}</div>
                      ${isCritical && !isDone ? '<div class="bg-rose-700 text-white text-lg font-bold px-3 py-1 rounded">⚠️ IMPORTANTE</div>' : ''}
                      ${isPostponed ? '<div class="bg-amber-500 text-white text-lg font-bold px-3 py-1 rounded">🟡 APLAZADA</div>' : ''}
                    </div>
                    <!-- Título XL -->
                    <div class="text-3xl font-bold ${isDone?'line-through text-slate-500':'text-slate-900'} leading-tight">${(a.activity_name||'').replace(/</g,'&lt;')}</div>
                    ${a.stage ? `<div class="text-xl text-slate-600 mt-1">📂 ${a.stage.replace(/</g,'&lt;')}</div>` : ''}
                    ${a.start_hour || a.end_hour ? `<div class="text-xl text-slate-700 mt-1">⏰ ${a.start_hour||7}:00 a ${a.end_hour||17}:00</div>` : ''}

                    ${(a.materials||[]).length > 0 ? `
                      <div class="mt-3 bg-amber-100 border-2 border-amber-400 rounded-xl p-3">
                        <div class="text-lg font-bold text-amber-900">📦 MATERIALES QUE NECESITAS</div>
                        <ul class="mt-1 text-xl space-y-0.5">
                          ${a.materials.map(m => `<li>• <strong>${(m.nombre||'').replace(/</g,'&lt;')}</strong>: ${m.cantidad||1} ${(m.unidad||'unidades').replace(/</g,'&lt;')}</li>`).join('')}
                        </ul>
                      </div>` : ''}

                    ${(a.checklist||[]).length > 0 ? `
                      <div class="mt-3">
                        <div class="text-lg font-bold text-slate-700">✅ PASOS A SEGUIR</div>
                        <ul class="text-xl space-y-1.5 mt-1">
                          ${a.checklist.map(it => `
                            <li class="flex items-start gap-2 ${it.done?'line-through text-slate-400':''}">
                              <span class="inline-block w-6 h-6 border-2 border-slate-700 rounded text-center leading-5">${it.done?'✓':''}</span>
                              <span>${(it.item||'').replace(/</g,'&lt;')}</span>
                            </li>`).join('')}
                        </ul>
                      </div>` : ''}

                    ${a.notes ? `
                      <div class="mt-3 bg-yellow-100 border-l-8 border-yellow-500 p-3 rounded-r-xl">
                        <div class="text-lg font-bold text-yellow-900">📝 INSTRUCCIONES IMPORTANTES</div>
                        <div class="text-xl text-slate-900 mt-1 whitespace-pre-wrap">${a.notes.replace(/</g,'&lt;')}</div>
                      </div>` : ''}
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      `).join('')}

      <!-- Pie de página para firma -->
      <div class="mt-12 pt-6 border-t-2 border-slate-300 hidden print:block">
        <div class="grid grid-cols-2 gap-12">
          <div>
            <div class="border-b-2 border-slate-900 h-16"></div>
            <div class="text-base mt-1">Firma del responsable</div>
          </div>
          <div>
            <div class="border-b-2 border-slate-900 h-16"></div>
            <div class="text-base mt-1">Fecha de finalización</div>
          </div>
        </div>
      </div>
    </body></html>
  `;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ─── Print SUPER simple para obreros — rango/semana ───
function wpOpenPrintRangeWorker(fromStr, toStr, homeFilter) {
  let acts = (wpState.activities||[]).filter(a => a.date >= fromStr && a.date <= toStr);
  acts = wpFilterActsByHouse(acts, homeFilter || 'all');
  if (!acts.length) return alert(`Sin actividades entre ${fromStr} y ${toStr}.`);

  // Agrupar por DÍA primero (vista del crew por día)
  const byDay = {};
  acts.forEach(a => {
    if (!byDay[a.date]) byDay[a.date] = [];
    byDay[a.date].push(a);
  });
  const days = Object.keys(byDay).sort();

  const html = `
    <!DOCTYPE html><html><head><title>Plan de la semana · ${fromStr} → ${toStr}</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; }
      @media print { .no-print{display:none!important;} body{margin:1cm;} .day-page{page-break-after:always;} .day-page:last-child{page-break-after:auto;} }
    </style>
    </head><body class="p-6 bg-white">
      <div class="no-print mb-4 flex gap-2 sticky top-0 bg-white z-10 py-2">
        <button onclick="window.print()" class="bg-blue-600 text-white font-bold text-lg px-6 py-3 rounded-lg">🖨️ Imprimir</button>
        <button onclick="window.close()" class="bg-slate-100 text-lg px-6 py-3 rounded-lg">✕ Cerrar</button>
      </div>

      <div class="border-b-4 border-slate-900 pb-4 mb-6 text-center">
        <div class="text-xl font-bold text-slate-500 uppercase">Plan de obra</div>
        <div class="text-4xl font-black mt-1">${fromStr} → ${toStr}</div>
        <div class="text-lg text-slate-700 mt-2">${acts.length} tareas en ${days.length} días</div>
      </div>

      ${days.map((dayIso, dayIdx) => {
        const d = new Date(dayIso + 'T00:00:00');
        const dayLbl = d.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });
        const dayActs = byDay[dayIso];
        const byHome = {};
        dayActs.forEach(a => {
          const key = a.property_name || a.project_id || '?';
          if (!byHome[key]) byHome[key] = [];
          byHome[key].push(a);
        });
        return `
        <div class="day-page mb-8">
          <div class="bg-slate-900 text-white px-5 py-3 rounded-xl">
            <div class="text-sm uppercase tracking-wider opacity-70">Día ${dayIdx+1} de ${days.length}</div>
            <div class="text-4xl font-black capitalize">${dayLbl}</div>
            <div class="text-base opacity-90 mt-1">${dayActs.length} tareas para hoy</div>
          </div>
          ${Object.entries(byHome).map(([home, hActs]) => `
            <div class="mt-3">
              <div class="text-2xl font-bold border-b-2 border-slate-300 pb-1 mb-2">🏠 ${(home||'').replace(/</g,'&lt;')}</div>
              <div class="space-y-2">
                ${hActs.map((a, i) => {
                  const isDone = a.status === 'done';
                  const isCritical = a.priority === 'critical' || a.priority === 'urgent';
                  const isPostponed = (a.notes||'').includes('[APLAZADA');
                  return `
                  <div class="flex items-start gap-3 p-3 rounded-xl border-2 ${isDone?'bg-emerald-50 border-emerald-400':isCritical?'bg-rose-50 border-rose-500':isPostponed?'bg-amber-50 border-amber-400':'bg-white border-slate-300'}">
                    <div class="flex-shrink-0 w-10 h-10 border-4 border-slate-900 rounded ${isDone?'bg-slate-900 text-white':''} text-2xl text-center leading-8">${isDone?'✓':''}</div>
                    <div class="flex-1">
                      <div class="text-xl font-bold ${isDone?'line-through text-slate-500':''}">${(a.activity_name||'').replace(/</g,'&lt;')}</div>
                      ${isCritical && !isDone ? '<span class="bg-rose-700 text-white text-sm font-bold px-2 py-0.5 rounded">⚠️ IMPORTANTE</span>' : ''}
                      ${isPostponed ? '<span class="bg-amber-500 text-white text-sm font-bold px-2 py-0.5 rounded">🟡 APLAZADA</span>' : ''}
                      ${a.stage ? `<div class="text-base text-slate-600">📂 ${a.stage.replace(/</g,'&lt;')}</div>` : ''}
                      ${(a.materials||[]).length > 0 ? `<div class="text-sm text-slate-700 mt-1">📦 ${a.materials.map(m=>`${m.nombre} (${m.cantidad} ${m.unidad||'ud'})`).join(', ').replace(/</g,'&lt;')}</div>` : ''}
                      ${a.notes ? `<div class="text-sm mt-1 bg-yellow-100 border-l-4 border-yellow-500 p-2 rounded-r whitespace-pre-wrap">${a.notes.replace(/</g,'&lt;')}</div>` : ''}
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>`;
      }).join('')}

      <div class="mt-8 pt-3 border-t border-slate-300 text-sm text-slate-500 text-center">Empresa OS · Plan de obra · ${new Date().toLocaleString('es')}</div>
    </body></html>
  `;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// helper: filtra actividades por casa (homeId puede ser projectId, 'name:Foo' o 'all')
function wpFilterActsByHouse(acts, homeId) {
  if (!homeId || homeId === 'all') return acts;
  if (homeId.startsWith('name:')) {
    const nm = homeId.slice(5);
    return acts.filter(a => a.property_name === nm);
  }
  return acts.filter(a => a.project_id === homeId);
}

// ─── Vista print del día / entregable para el crew ───
function wpOpenPrintView(dateStr, homeFilter) {
  let acts = (wpState.activities||[]).filter(a => a.date === dateStr);
  acts = wpFilterActsByHouse(acts, homeFilter || 'all');
  if (!acts.length) return alert(`Sin actividades en ${dateStr}${homeFilter && homeFilter!=='all' ? ' para esa casa' : ''}.`);
  const byHome = {};
  acts.forEach(a => {
    const key = a.project_id || ('name:'+a.property_name);
    if (!byHome[key]) byHome[key] = { name: a.property_name || '?', acts: [] };
    byHome[key].acts.push(a);
  });
  const d = new Date(dateStr + 'T00:00:00');
  const dateLbl = d.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const html = `
    <!DOCTYPE html><html><head><title>Día de obra · ${dateStr}</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>@media print { .no-print{display:none!important;} body{font-size:11pt;margin:1cm;} }</style>
    </head><body class="p-6 bg-white">
      <div class="no-print mb-4 flex gap-2">
        <button onclick="window.print()" class="bg-blue-600 text-white font-bold px-4 py-2 rounded">🖨️ Imprimir</button>
        <button onclick="window.close()" class="bg-slate-100 px-4 py-2 rounded">Cerrar</button>
      </div>
      <div class="border-b-2 border-slate-900 pb-3 mb-4">
        <h1 class="text-2xl font-bold capitalize">${dateLbl}</h1>
        <div class="text-sm text-slate-600">${Object.keys(byHome).length} casa(s) · ${acts.length} actividad(es)</div>
      </div>
      ${Object.entries(byHome).map(([key, h]) => `
        <div class="mb-6 break-inside-avoid">
          <h2 class="text-lg font-bold border-b border-slate-300 mb-2">🏠 ${h.name.replace(/</g,'&lt;')}</h2>
          ${h.acts.map(a => `
            <div class="mb-3 pl-4 border-l-2 ${a.status==='done'?'border-emerald-500':'border-blue-400'}">
              <div class="flex items-center gap-2">
                <div class="text-base font-bold ${a.status==='done'?'line-through text-slate-500':''}">${(a.activity_name||'').replace(/</g,'&lt;')}</div>
                ${a.stage ? `<span class="text-xs bg-slate-100 px-2 py-0.5 rounded">${a.stage.replace(/</g,'&lt;')}</span>` : ''}
                ${a.duration_days > 1 ? `<span class="text-xs text-slate-500">(${a.duration_days} días)</span>` : ''}
              </div>
              ${(a.checklist||[]).length > 0 ? `
                <ul class="mt-1 text-sm">
                  ${a.checklist.map(it => `<li class="${it.done?'line-through text-slate-400':''}">${it.done?'☑':'☐'} ${(it.item||'').replace(/</g,'&lt;')}</li>`).join('')}
                </ul>
              ` : ''}
              ${(a.materials||[]).length > 0 ? `
                <div class="mt-1 text-xs">
                  <strong>Materiales:</strong> ${a.materials.map(m => `${m.nombre} (${m.cantidad} ${m.unidad||''})`).join(', ').replace(/</g,'&lt;')}
                </div>
              ` : ''}
              ${a.notes ? `<div class="mt-1 text-xs italic text-slate-600">📝 ${a.notes.replace(/</g,'&lt;')}</div>` : ''}
              ${a.assignee ? `<div class="mt-1 text-xs">👤 ${a.assignee.replace(/</g,'&lt;')}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
      <div class="mt-8 pt-3 border-t border-slate-300 text-xs text-slate-500">Empresa OS · ${new Date().toLocaleString('es')}</div>
    </body></html>
  `;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ─── Vista print por rango (semana / personalizado) ───
function wpOpenPrintRange(fromStr, toStr, homeFilter) {
  let acts = (wpState.activities||[]).filter(a => a.date >= fromStr && a.date <= toStr);
  acts = wpFilterActsByHouse(acts, homeFilter || 'all');
  if (!acts.length) return alert(`Sin actividades entre ${fromStr} y ${toStr}.`);

  // Agrupar por casa, luego por día
  const byHome = {};
  acts.forEach(a => {
    const key = a.project_id || ('name:'+a.property_name);
    if (!byHome[key]) {
      const p = wpState.projects.find(x => x.id === a.project_id);
      byHome[key] = { name: p?.name || a.property_name || '?', address: p?.address || '', days: {} };
    }
    if (!byHome[key].days[a.date]) byHome[key].days[a.date] = [];
    byHome[key].days[a.date].push(a);
  });

  const totalDone = acts.filter(a => a.status === 'done').length;
  const totalPct = acts.length ? Math.round(totalDone/acts.length*100) : 0;

  const html = `
    <!DOCTYPE html><html><head><title>Plan de obra · ${fromStr} → ${toStr}</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>@media print { .no-print{display:none!important;} body{font-size:10pt;margin:1cm;} .break-page{page-break-after:always;} }</style>
    </head><body class="p-6 bg-white">
      <div class="no-print mb-4 flex gap-2">
        <button onclick="window.print()" class="bg-blue-600 text-white font-bold px-4 py-2 rounded">🖨️ Imprimir</button>
        <button onclick="window.close()" class="bg-slate-100 px-4 py-2 rounded">Cerrar</button>
      </div>
      <div class="border-b-2 border-slate-900 pb-3 mb-4">
        <h1 class="text-2xl font-bold">📅 Plan de obra · ${fromStr} → ${toStr}</h1>
        <div class="text-sm text-slate-600">${Object.keys(byHome).length} casa(s) · ${acts.length} actividad(es) · ${totalDone} ejecutadas (${totalPct}%)</div>
      </div>
      ${Object.entries(byHome).map(([key, h], idx) => {
        const days = Object.keys(h.days).sort();
        const homeActs = days.flatMap(d => h.days[d]);
        const homeDone = homeActs.filter(a => a.status === 'done').length;
        const homePct = homeActs.length ? Math.round(homeDone/homeActs.length*100) : 0;
        return `
          <div class="${idx>0?'break-page':''} mb-6">
            <div class="bg-slate-900 text-white px-3 py-2 rounded-t-lg">
              <h2 class="text-xl font-bold">🏠 ${h.name.replace(/</g,'&lt;')}</h2>
              ${h.address ? `<div class="text-xs opacity-80">${h.address.replace(/</g,'&lt;')}</div>` : ''}
              <div class="text-xs opacity-90 mt-1">${homeActs.length} actividades · ${homeDone} ejecutadas (${homePct}%)</div>
            </div>
            <div class="border border-slate-300 border-t-0 rounded-b-lg p-3 space-y-3">
              ${days.map(d => {
                const dLbl = new Date(d+'T00:00:00').toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });
                const dActs = h.days[d];
                return `
                  <div class="border-l-4 border-blue-400 pl-3">
                    <div class="text-sm font-bold capitalize text-slate-700 mb-1">${dLbl}</div>
                    ${dActs.map(a => `
                      <div class="mb-2 ${a.status==='done'?'opacity-60':''}">
                        <div class="flex items-center gap-2">
                          <span class="text-base">${a.status==='done'?'☑':'☐'}</span>
                          <div class="font-semibold ${a.status==='done'?'line-through':''}">${(a.activity_name||'').replace(/</g,'&lt;')}</div>
                          ${a.stage ? `<span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">${a.stage.replace(/</g,'&lt;')}</span>` : ''}
                          ${a.activity_code ? `<span class="text-[10px] text-slate-500 font-mono">${a.activity_code}</span>` : ''}
                        </div>
                        ${(a.checklist||[]).length > 0 ? `<ul class="text-xs ml-6 mt-0.5">${a.checklist.map(it => `<li class="${it.done?'line-through text-slate-400':''}">${it.done?'☑':'☐'} ${(it.item||'').replace(/</g,'&lt;')}</li>`).join('')}</ul>` : ''}
                        ${(a.materials||[]).length > 0 ? `<div class="text-[10px] ml-6 text-slate-600">📦 ${a.materials.map(m => `${m.nombre} (${m.cantidad} ${m.unidad||''})`).join(', ').replace(/</g,'&lt;')}</div>` : ''}
                        ${a.notes ? `<div class="text-[10px] ml-6 italic text-slate-600">📝 ${a.notes.replace(/</g,'&lt;')}</div>` : ''}
                      </div>
                    `).join('')}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
      <div class="mt-8 pt-3 border-t border-slate-300 text-xs text-slate-500">Empresa OS · Plan de obra · ${new Date().toLocaleString('es')}</div>
    </body></html>
  `;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ─── Crear casa nueva desde el modal de import ───
function wpImpOnProjChange(value) {
  const form = document.getElementById('wp-imp-newcasa');
  if (!form) return;
  if (value === '__new__') {
    form.classList.remove('hidden');
    setTimeout(() => document.getElementById('wp-newcasa-name')?.focus(), 50);
  } else {
    form.classList.add('hidden');
  }
}

function wpImpCancelNewCasa() {
  const sel = document.getElementById('wp-imp-proj');
  if (sel) sel.value = '';
  const form = document.getElementById('wp-imp-newcasa');
  if (form) form.classList.add('hidden');
}

async function wpImpCreateNewCasa() {
  const name = document.getElementById('wp-newcasa-name').value.trim();
  const address = document.getElementById('wp-newcasa-addr').value.trim();
  const sqft = +document.getElementById('wp-newcasa-sqft').value || null;
  const startDate = document.getElementById('wp-newcasa-start').value || null;
  const budget = +document.getElementById('wp-newcasa-budget').value || null;
  if (!name && !address) { alert('Ingresá al menos nombre o dirección.'); return; }

  const payload = {
    name: name || address,
    address: address || null,
    sqft,
    start_date: startDate,
    budget_total: budget,
    status: 'active',
    created_by: state.user.id
  };
  const { data, error } = await window.safeInsert(() => sb.from('remodel_projects'), payload, { single: true });
  if (error) { alert('Error creando casa: ' + error.message); return; }

  // Recargar lista de proyectos
  const { data: projs } = await sb.from('remodel_projects')
    .select('id,name,address,status,sqft,budget_total,activities,start_date,end_date_estimated,completed_at')
    .order('created_at', { ascending: false });
  wpState.projects = projs || [];

  // Refrescar el dropdown agregando la nueva opción al final (antes del +Crear) y seleccionarla
  const sel = document.getElementById('wp-imp-proj');
  if (sel) {
    // Quitar la opción ➕ Crear
    const newOpt = sel.querySelector('option[value="__new__"]');
    if (newOpt) newOpt.remove();
    // Agregar la casa nueva
    const opt = document.createElement('option');
    opt.value = data.id;
    opt.textContent = data.name || data.address || '?';
    sel.appendChild(opt);
    // Re-agregar la opción de crear
    const optNew = document.createElement('option');
    optNew.value = '__new__';
    optNew.textContent = '➕ Crear casa nueva...';
    optNew.className = 'font-bold text-emerald-700';
    sel.appendChild(optNew);
    sel.value = data.id;
  }

  // Ocultar form
  const form = document.getElementById('wp-imp-newcasa');
  if (form) form.classList.add('hidden');

  // Toast confirmación
  alert(`✓ Casa "${data.name || data.address}" creada y seleccionada.\n\nAhora subí el Excel y clic Importar.`);
}

// ════════════════════════════════════════════════════════════
// 📊 ANALYTICS / REPORTES DEL PLANNER
// Métricas para tomar decisiones operativas:
// cumplimiento, atrasos, reagendamientos, velocidad, etapas lentas
// ════════════════════════════════════════════════════════════

// Estado del filtro del reporte
const wpAnState = { from: null, to: null, house: 'all', rangeLabel: 'Esta semana' };

function wpOpenAnalytics() {
  // Default: la semana visible
  if (!wpAnState.from) {
    wpAnState.from = wpDateOnly(wpState.weekStart || new Date());
    wpAnState.to = wpDateOnly(wpAddDays(wpState.weekStart || new Date(), 6));
    wpAnState.house = wpState.houseFilter || 'all';
  }
  wpRenderAnalytics();
}

function wpAnSetRange(preset) {
  const today = new Date();
  const todayIso = wpDateOnly(today);
  if (preset === 'today') {
    wpAnState.from = todayIso; wpAnState.to = todayIso; wpAnState.rangeLabel = 'Hoy';
  } else if (preset === 'week') {
    wpAnState.from = wpDateOnly(wpMondayOf(today));
    wpAnState.to = wpDateOnly(wpAddDays(wpMondayOf(today), 6));
    wpAnState.rangeLabel = 'Esta semana';
  } else if (preset === 'last7') {
    wpAnState.from = wpDateOnly(wpAddDays(today, -6));
    wpAnState.to = todayIso;
    wpAnState.rangeLabel = 'Últimos 7 días';
  } else if (preset === 'last30') {
    wpAnState.from = wpDateOnly(wpAddDays(today, -29));
    wpAnState.to = todayIso;
    wpAnState.rangeLabel = 'Últimos 30 días';
  } else if (preset === 'mtd') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    wpAnState.from = wpDateOnly(first); wpAnState.to = todayIso;
    wpAnState.rangeLabel = 'Mes en curso';
  }
  wpRenderAnalytics();
}

function wpAnSetCustomRange() {
  const f = document.getElementById('wp-an-from')?.value;
  const t = document.getElementById('wp-an-to')?.value;
  if (!f || !t) return;
  wpAnState.from = f; wpAnState.to = t; wpAnState.rangeLabel = `${f} → ${t}`;
  wpRenderAnalytics();
}

function wpAnSetHouse(value) {
  wpAnState.house = value || 'all';
  wpRenderAnalytics();
}

// Calcula todas las métricas del rango
function wpCalcAnalytics(fromIso, toIso, houseFilter) {
  const all = wpState.activities || [];
  const todayIso = wpDateOnly(new Date());

  // Filtrar por rango (date) + casa
  let inRange = all.filter(a => a.date && a.date >= fromIso && a.date <= toIso);
  inRange = wpFilterActsByHouse(inRange, houseFilter);

  const total = inRange.length;
  const done = inRange.filter(a => a.status === 'done').length;
  const inProgress = inRange.filter(a => a.status === 'in_progress').length;
  const planned = inRange.filter(a => a.status === 'planned' || !a.status).length;
  const cancelled = inRange.filter(a => a.status === 'cancelled').length;

  // Atrasadas activas dentro del rango: date<hoy && no done && no cancelled
  const overdue = inRange.filter(a => a.status !== 'done' && a.status !== 'cancelled' && a.date < todayIso);

  // Heurística reagendadas: updated_at - created_at > 1 día Y date > created_at (date)
  const movidas = inRange.filter(a => {
    if (!a.created_at || !a.updated_at) return false;
    const c = new Date(a.created_at).getTime();
    const u = new Date(a.updated_at).getTime();
    return (u - c) > 24*3600*1000;
  });

  // Velocidad: tareas done / días del rango
  const daysSpan = Math.max(1, Math.round((new Date(toIso+'T00:00:00') - new Date(fromIso+'T00:00:00'))/86400000)+1);
  const velocityDay = Math.round((done / daysSpan) * 10) / 10;

  // Tiempo promedio para completar (días entre created_at y completed_at)
  const completedWithTime = inRange.filter(a => a.status === 'done' && a.created_at && a.completed_at);
  const avgCompletionDays = completedWithTime.length === 0 ? null
    : Math.round(completedWithTime.reduce((s,a) => s + (new Date(a.completed_at) - new Date(a.created_at))/86400000, 0) / completedWithTime.length * 10) / 10;

  // Cumplimiento por casa
  const byHouse = {};
  inRange.forEach(a => {
    const key = a.project_id || ('name:' + (a.property_name||'Sin asignar'));
    const p = wpState.projects.find(x => x.id === a.project_id);
    const name = p?.name || a.property_name || 'Sin asignar';
    if (!byHouse[key]) byHouse[key] = { name, total: 0, done: 0, overdue: 0, planned: 0 };
    byHouse[key].total++;
    if (a.status === 'done') byHouse[key].done++;
    if (a.status !== 'done' && a.status !== 'cancelled' && a.date < todayIso) byHouse[key].overdue++;
    if (a.status === 'planned' || !a.status) byHouse[key].planned++;
  });
  const houseList = Object.values(byHouse).map(h => ({
    ...h,
    pct: h.total ? Math.round(h.done/h.total*100) : 0
  })).sort((a,b) => b.total - a.total);

  // Cumplimiento por etapa
  const byStage = {};
  inRange.forEach(a => {
    const k = a.stage || 'sin etapa';
    if (!byStage[k]) byStage[k] = { name: k, total: 0, done: 0, overdue: 0 };
    byStage[k].total++;
    if (a.status === 'done') byStage[k].done++;
    if (a.status !== 'done' && a.status !== 'cancelled' && a.date < todayIso) byStage[k].overdue++;
  });
  const stageList = Object.values(byStage).map(s => ({
    ...s, pct: s.total ? Math.round(s.done/s.total*100) : 0
  })).sort((a,b) => a.pct - b.pct);

  // Cumplimiento por día de la semana (heatmap)
  const dows = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const byDow = dows.map((d, i) => ({ dow: d, idx: i, total: 0, done: 0 }));
  inRange.forEach(a => {
    if (!a.date) return;
    const dt = new Date(a.date + 'T00:00:00');
    const idx = dt.getDay();
    byDow[idx].total++;
    if (a.status === 'done') byDow[idx].done++;
  });
  byDow.forEach(d => { d.pct = d.total ? Math.round(d.done/d.total*100) : 0; });
  // Reorder: lun-dom para humanos
  const dowSorted = [byDow[1],byDow[2],byDow[3],byDow[4],byDow[5],byDow[6],byDow[0]];

  // Top atrasadas críticas (top 10 por días)
  const overdueTop = overdue.map(a => ({
    ...a,
    daysLate: Math.round((new Date(todayIso+'T00:00:00') - new Date(a.date+'T00:00:00'))/86400000),
    houseName: (wpState.projects.find(p => p.id === a.project_id)?.name) || a.property_name || '?'
  })).sort((a,b) => b.daysLate - a.daysLate).slice(0, 10);

  // Tareas movidas — top 10 más recientes
  const movidasTop = movidas.map(a => ({
    ...a,
    diffDays: Math.round((new Date(a.updated_at) - new Date(a.created_at))/86400000),
    houseName: (wpState.projects.find(p => p.id === a.project_id)?.name) || a.property_name || '?'
  })).sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 10);

  // ─── CRÍTICAS y APLAZADAS ───
  const criticas = inRange.filter(a => a.priority === 'critical' || a.priority === 'urgent');
  const criticasDone = criticas.filter(a => a.status === 'done').length;
  const criticasAtrasadas = criticas.filter(a => a.status !== 'done' && a.status !== 'cancelled' && a.date < todayIso);
  const aplazadas = inRange.filter(a => (a.notes||'').includes('[APLAZADA'));
  // Extraer motivos de aplazamiento más frecuentes
  const motivosMap = {};
  aplazadas.forEach(a => {
    const matches = (a.notes||'').match(/\[APLAZADA[^\]]*:\s*([^\]]+)\]/g) || [];
    matches.forEach(m => {
      const motivo = (m.match(/:\s*([^\]]+)\]/) || [])[1] || '';
      const key = motivo.trim().slice(0, 60).toLowerCase();
      if (!key) return;
      // Categorizar por palabras clave
      let cat = motivo.trim().slice(0, 50);
      const lc = key.toLowerCase();
      if (/material|cemento|drywall|pintura|insumo/.test(lc)) cat = '📦 Falta de material';
      else if (/lluvia|clima|tiempo/.test(lc)) cat = '🌧️ Clima';
      else if (/mano|obrero|equipo|crew|cuadrill|personal/.test(lc)) cat = '👷 Falta de personal';
      else if (/prioridad|cambio|orden/.test(lc)) cat = '🔄 Cambio de prioridad';
      else if (/dinero|pago|presup/.test(lc)) cat = '💰 Falta de presupuesto';
      else if (/permiso|inspecci|aprob/.test(lc)) cat = '📋 Permisos / aprobación';
      else if (/cliente|propietari/.test(lc)) cat = '🤝 Espera del cliente';
      motivosMap[cat] = (motivosMap[cat] || 0) + 1;
    });
  });
  const motivosTop = Object.entries(motivosMap).sort((a,b) => b[1]-a[1]).slice(0, 6);

  return {
    total, done, inProgress, planned, cancelled,
    overdueCount: overdue.length, overdueTop,
    movidasCount: movidas.length, movidasTop,
    pctCumplimiento: total ? Math.round((done/total)*100) : 0,
    daysSpan, velocityDay, avgCompletionDays,
    houseList, stageList, dowSorted,
    criticasCount: criticas.length, criticasDone,
    criticasAtrasadasCount: criticasAtrasadas.length,
    criticasAtrasadasTop: criticasAtrasadas.map(a => ({...a, houseName: (wpState.projects.find(p => p.id === a.project_id)?.name) || a.property_name || '?', daysLate: Math.round((new Date(todayIso+'T00:00:00') - new Date(a.date+'T00:00:00'))/86400000)})).sort((a,b) => b.daysLate - a.daysLate).slice(0,10),
    aplazadasCount: aplazadas.length, motivosTop
  };
}

function wpRenderAnalytics() {
  const metrics = wpCalcAnalytics(wpAnState.from, wpAnState.to, wpAnState.house);
  // Opciones de casa
  const hidden = new Set(wpState.projects.filter(p => p.status === 'completed' || p.status === 'cancelled').map(p => p.id));
  const activeProj = wpState.projects.filter(p => !hidden.has(p.id));
  const extra = new Set();
  wpState.activities.forEach(a => { if (!a.project_id && a.property_name) extra.add(a.property_name); });
  const houseOpts = [
    `<option value="all" ${wpAnState.house==='all'?'selected':''}>🏘️ Todas las casas</option>`,
    ...activeProj.map(p => `<option value="${p.id}" ${wpAnState.house===p.id?'selected':''}>🏠 ${(p.name||'').replace(/</g,'&lt;')}</option>`),
    ...Array.from(extra).map(n => `<option value="name:${n.replace(/"/g,'&quot;')}" ${wpAnState.house==='name:'+n?'selected':''}>🏠 ${n.replace(/</g,'&lt;')}</option>`)
  ].join('');

  // Color del KPI principal según cumplimiento
  const m = metrics;
  const colorCumpl = m.pctCumplimiento >= 80 ? 'from-emerald-600 to-emerald-800'
                   : m.pctCumplimiento >= 60 ? 'from-amber-500 to-orange-600'
                   : 'from-red-600 to-red-800';

  // Insights automáticos en lenguaje natural
  const insights = [];
  if (m.total === 0) insights.push({ icon: 'ℹ️', text: 'No hay actividades planeadas en este rango. Probá un período más amplio o cambiá la casa.' });
  else {
    if (m.pctCumplimiento >= 80) insights.push({ icon: '✅', text: `Excelente cumplimiento: ${m.pctCumplimiento}% de las tareas se completaron.`, color:'emerald' });
    else if (m.pctCumplimiento >= 60) insights.push({ icon: '🟡', text: `Cumplimiento medio (${m.pctCumplimiento}%). Hay margen para optimizar.`, color:'amber' });
    else insights.push({ icon: '🔴', text: `Cumplimiento bajo (${m.pctCumplimiento}%). Revisá causas de los atrasos.`, color:'red' });

    if (m.overdueCount > 0) insights.push({ icon:'⏰', text:`${m.overdueCount} tarea${m.overdueCount>1?'s':''} atrasada${m.overdueCount>1?'s':''} sin completar. Considerá reagendar o reasignar recursos.`, color:'red' });
    if (m.movidasCount > 0) insights.push({ icon:'🔄', text:`${m.movidasCount} tarea${m.movidasCount>1?'s fueron':' fue'} reagendada${m.movidasCount>1?'s':''} durante el período. Patrón a investigar si es alto.`, color:'amber' });
    if (m.velocityDay > 0) insights.push({ icon:'⚡', text:`Velocidad promedio: ${m.velocityDay} tarea${m.velocityDay!==1?'s':''} ejecutada${m.velocityDay!==1?'s':''} por día.` });
    if (m.avgCompletionDays != null) insights.push({ icon:'⏳', text:`Tiempo promedio entre crear y completar una tarea: ${m.avgCompletionDays} día${m.avgCompletionDays!==1?'s':''}.` });

    // Casa con peor cumplimiento
    const peorCasa = m.houseList.slice().sort((a,b)=>a.pct-b.pct)[0];
    if (peorCasa && m.houseList.length > 1 && peorCasa.pct < 60) {
      insights.push({ icon:'🏠', text:`Casa que más atrás va: "${peorCasa.name}" (${peorCasa.pct}% completadas, ${peorCasa.overdue} atrasadas).`, color:'red' });
    }
    // Etapa más lenta
    const peorStage = m.stageList[0];
    if (peorStage && peorStage.total >= 3 && peorStage.pct < 50) {
      insights.push({ icon:'🔧', text:`Etapa más lenta: "${peorStage.name}" con ${peorStage.pct}% de cumplimiento. Cuello de botella probable.`, color:'amber' });
    }
    // Mejor día de la semana
    const mejorDow = m.dowSorted.slice().filter(d=>d.total>0).sort((a,b)=>b.pct-a.pct)[0];
    if (mejorDow && mejorDow.total >= 3) {
      insights.push({ icon:'📅', text:`Día más productivo: ${mejorDow.dow} con ${mejorDow.pct}% de cumplimiento.` });
    }
  }

  // Heatmap dow
  const heatColor = pct => pct >= 80 ? 'bg-emerald-500 text-white' : pct >= 60 ? 'bg-emerald-300' : pct >= 40 ? 'bg-amber-300' : pct > 0 ? 'bg-red-300' : 'bg-slate-100 text-slate-400';

  const html = `
    <div id="wp-an-root" class="space-y-3">
      <!-- Toolbar de filtros -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="flex flex-wrap items-end gap-2">
          <div class="flex gap-1">
            <button onclick="wpAnSetRange('today')" class="text-xs px-2.5 py-1.5 rounded font-bold ${wpAnState.rangeLabel==='Hoy'?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200'}">Hoy</button>
            <button onclick="wpAnSetRange('week')" class="text-xs px-2.5 py-1.5 rounded font-bold ${wpAnState.rangeLabel==='Esta semana'?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200'}">Semana</button>
            <button onclick="wpAnSetRange('last7')" class="text-xs px-2.5 py-1.5 rounded font-bold ${wpAnState.rangeLabel==='Últimos 7 días'?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200'}">7d</button>
            <button onclick="wpAnSetRange('last30')" class="text-xs px-2.5 py-1.5 rounded font-bold ${wpAnState.rangeLabel==='Últimos 30 días'?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200'}">30d</button>
            <button onclick="wpAnSetRange('mtd')" class="text-xs px-2.5 py-1.5 rounded font-bold ${wpAnState.rangeLabel==='Mes en curso'?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200'}">MTD</button>
          </div>
          <div class="h-6 border-l border-slate-300"></div>
          <div class="flex items-end gap-1">
            <div>
              <label class="block text-[9px] font-bold uppercase text-slate-500">Desde</label>
              <input id="wp-an-from" type="date" value="${wpAnState.from}" class="border border-slate-300 rounded px-2 py-1 text-xs"/>
            </div>
            <div>
              <label class="block text-[9px] font-bold uppercase text-slate-500">Hasta</label>
              <input id="wp-an-to" type="date" value="${wpAnState.to}" class="border border-slate-300 rounded px-2 py-1 text-xs"/>
            </div>
            <button onclick="wpAnSetCustomRange()" class="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1.5 rounded">Aplicar</button>
          </div>
          <div class="h-6 border-l border-slate-300"></div>
          <div>
            <label class="block text-[9px] font-bold uppercase text-slate-500">Casa</label>
            <select onchange="wpAnSetHouse(this.value)" class="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-bold">${houseOpts}</select>
          </div>
          <div class="flex-1"></div>
          <button onclick="wpAnalyticsAI()" class="text-xs bg-violet-600 hover:bg-violet-700 text-white border border-violet-700 px-3 py-1.5 rounded font-bold" title="Claude analiza las métricas y sugiere acciones priorizadas">🤖 Análisis IA</button>
          <button onclick="wpPrintAnalytics()" class="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded font-bold">🖨️ Imprimir reporte</button>
        </div>
      </div>

      <!-- HERO: KPI cumplimiento -->
      <div class="bg-gradient-to-br ${colorCumpl} text-white rounded-2xl p-5 shadow-lg">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div class="text-[10px] uppercase tracking-widest opacity-80 font-bold">${wpAnState.rangeLabel} · ${wpAnState.house==='all'?'todas las casas':(activeProj.find(p=>p.id===wpAnState.house)?.name || (wpAnState.house.startsWith('name:')?wpAnState.house.slice(5):'') || '—')}</div>
            <div class="text-3xl font-bold mt-1">${m.pctCumplimiento}% cumplimiento</div>
            <div class="text-sm mt-1 opacity-90">${m.done} de ${m.total} tarea${m.total!==1?'s':''} completadas en ${m.daysSpan} día${m.daysSpan!==1?'s':''}</div>
          </div>
          <div class="grid grid-cols-2 gap-2 min-w-[260px]">
            <div class="bg-white/15 backdrop-blur rounded-lg p-2.5 border border-white/20">
              <div class="text-[10px] uppercase opacity-80 font-bold">⚡ Velocidad</div>
              <div class="text-xl font-bold">${m.velocityDay}<span class="text-xs opacity-80"> /día</span></div>
            </div>
            <div class="bg-white/15 backdrop-blur rounded-lg p-2.5 border border-white/20">
              <div class="text-[10px] uppercase opacity-80 font-bold">⏳ Lead time</div>
              <div class="text-xl font-bold">${m.avgCompletionDays!=null?m.avgCompletionDays+' d':'—'}</div>
            </div>
            <div class="bg-white/15 backdrop-blur rounded-lg p-2.5 border border-white/20">
              <div class="text-[10px] uppercase opacity-80 font-bold">⏰ Atrasadas</div>
              <div class="text-xl font-bold">${m.overdueCount}</div>
            </div>
            <div class="bg-white/15 backdrop-blur rounded-lg p-2.5 border border-white/20">
              <div class="text-[10px] uppercase opacity-80 font-bold">🔄 Movidas</div>
              <div class="text-xl font-bold">${m.movidasCount}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribución de estados -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">Estado de las tareas</div>
        <div class="flex h-8 rounded-lg overflow-hidden border border-slate-200">
          ${m.done > 0 ? `<div class="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold" style="width:${m.done/m.total*100}%" title="${m.done} hechas">${m.done}</div>` : ''}
          ${m.inProgress > 0 ? `<div class="bg-blue-500 flex items-center justify-center text-white text-xs font-bold" style="width:${m.inProgress/m.total*100}%" title="${m.inProgress} en curso">${m.inProgress}</div>` : ''}
          ${m.planned > 0 ? `<div class="bg-amber-400 flex items-center justify-center text-white text-xs font-bold" style="width:${m.planned/m.total*100}%" title="${m.planned} planeadas">${m.planned}</div>` : ''}
          ${m.cancelled > 0 ? `<div class="bg-slate-400 flex items-center justify-center text-white text-xs font-bold" style="width:${m.cancelled/m.total*100}%" title="${m.cancelled} canceladas">${m.cancelled}</div>` : ''}
          ${m.total === 0 ? '<div class="bg-slate-100 w-full flex items-center justify-center text-slate-400 text-xs">Sin actividades</div>' : ''}
        </div>
        <div class="flex flex-wrap gap-3 mt-2 text-[11px]">
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-emerald-500 rounded-sm"></span> ✅ Hechas: <strong>${m.done}</strong></span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-blue-500 rounded-sm"></span> 🔵 En curso: <strong>${m.inProgress}</strong></span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-amber-400 rounded-sm"></span> 🟠 Planeadas: <strong>${m.planned}</strong></span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-slate-400 rounded-sm"></span> ⚫ Canceladas: <strong>${m.cancelled}</strong></span>
        </div>
      </div>

      <!-- Insights automáticos -->
      <div class="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <div class="text-xs font-bold uppercase text-violet-900 mb-2">💡 Insights para tomar decisiones</div>
        <div class="space-y-1.5">
          ${insights.map(i => `
            <div class="flex items-start gap-2 text-sm ${i.color==='red'?'text-red-800':i.color==='amber'?'text-amber-800':i.color==='emerald'?'text-emerald-800':'text-slate-700'}">
              <span class="text-base leading-none">${i.icon}</span>
              <span>${i.text}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-3">
        <!-- Heatmap día de la semana -->
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">📅 Cumplimiento por día de la semana</div>
          <div class="grid grid-cols-7 gap-1">
            ${m.dowSorted.map(d => `
              <div class="rounded ${heatColor(d.pct)} p-2 text-center">
                <div class="text-[10px] font-bold">${d.dow}</div>
                <div class="text-lg font-bold leading-tight">${d.total?d.pct+'%':'—'}</div>
                <div class="text-[9px] opacity-80">${d.done}/${d.total}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Top etapas más lentas -->
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">🔧 Etapas — más lentas arriba</div>
          ${m.stageList.length === 0 ? '<div class="text-xs text-slate-400 italic py-4 text-center">Sin etapas registradas</div>' : `
            <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              ${m.stageList.slice(0, 8).map(s => `
                <div>
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="font-semibold truncate">${(s.name||'').replace(/</g,'&lt;')}</span>
                    <span class="text-slate-600 whitespace-nowrap">${s.done}/${s.total} (${s.pct}%) ${s.overdue?`<span class="text-red-700 font-bold">· ⏰${s.overdue}</span>`:''}</span>
                  </div>
                  <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="${s.pct>=80?'bg-emerald-500':s.pct>=60?'bg-amber-500':'bg-red-500'} h-full" style="width:${s.pct}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- Cumplimiento por casa -->
      ${m.houseList.length > 1 ? `
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-slate-600">🏠 Cumplimiento por casa</div>
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr class="border-b border-slate-200">
              <th class="text-left px-3 py-1.5">Casa</th>
              <th class="text-right px-3 py-1.5">Total</th>
              <th class="text-right px-3 py-1.5">Hechas</th>
              <th class="text-right px-3 py-1.5">Atrasadas</th>
              <th class="text-left px-3 py-1.5">Cumplimiento</th>
            </tr>
          </thead>
          <tbody>
            ${m.houseList.map(h => `
              <tr class="border-b border-slate-100">
                <td class="px-3 py-1.5 font-medium">${(h.name||'').replace(/</g,'&lt;')}</td>
                <td class="px-3 py-1.5 text-right">${h.total}</td>
                <td class="px-3 py-1.5 text-right text-emerald-700 font-bold">${h.done}</td>
                <td class="px-3 py-1.5 text-right ${h.overdue>0?'text-red-700 font-bold':'text-slate-400'}">${h.overdue}</td>
                <td class="px-3 py-1.5">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div class="${h.pct>=80?'bg-emerald-500':h.pct>=60?'bg-amber-500':'bg-red-500'} h-full" style="width:${h.pct}%"></div>
                    </div>
                    <span class="text-[11px] font-bold w-10 text-right">${h.pct}%</span>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : ''}

      <!-- ⚠️ RUTA CRÍTICA + 🟡 APLAZADAS -->
      ${m.criticasCount > 0 || m.aplazadasCount > 0 ? `
      <div class="grid md:grid-cols-2 gap-3">
        <!-- Ruta crítica -->
        <div class="bg-white border-2 ${m.criticasAtrasadasCount > 0 ? 'border-rose-400' : 'border-rose-200'} rounded-xl overflow-hidden">
          <div class="${m.criticasAtrasadasCount > 0 ? 'bg-rose-100' : 'bg-rose-50'} px-3 py-2 text-xs font-bold uppercase text-rose-800 flex justify-between items-center">
            <span>⚠️ Ruta crítica (${m.criticasCount})</span>
            <span class="text-[10px] font-normal">${m.criticasDone}/${m.criticasCount} hechas · ${m.criticasAtrasadasCount} atrasadas</span>
          </div>
          ${m.criticasAtrasadasCount === 0 && m.criticasCount > 0 ? `<div class="p-3 text-xs text-emerald-700 bg-emerald-50 border-b border-emerald-100"><strong>✅ Sin atrasos críticos.</strong> La ruta crítica está bajo control.</div>` : ''}
          ${m.criticasAtrasadasCount > 0 ? `
            <div class="p-3 text-xs bg-rose-50 border-b border-rose-100">
              <strong class="text-rose-900">🚨 ${m.criticasAtrasadasCount} crítica${m.criticasAtrasadasCount>1?'s':''} atrasada${m.criticasAtrasadasCount>1?'s':''}</strong> — Cada día perdido en ruta crítica empuja la fecha de entrega final.
            </div>
            <div class="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              ${m.criticasAtrasadasTop.map(a => `
                <div class="px-3 py-2 hover:bg-slate-50 cursor-pointer" onclick="wpEditActivity('${a.id}')">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-semibold truncate text-rose-900">⚠️ ${(a.activity_name||'').replace(/</g,'&lt;')}</div>
                      <div class="text-[10px] text-slate-500 truncate">🏠 ${(a.houseName||'').replace(/</g,'&lt;')}${a.stage?` · ${a.stage}`:''}</div>
                    </div>
                    <div class="text-[11px] bg-rose-700 text-white font-bold px-2 py-0.5 rounded whitespace-nowrap">⏰ ${a.daysLate}d</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : m.criticasCount === 0 ? '<div class="p-4 text-xs text-slate-400 italic text-center">Sin actividades marcadas como ruta crítica en este rango</div>' : ''}
        </div>

        <!-- Aplazadas — motivos más frecuentes -->
        <div class="bg-white border-2 border-amber-200 rounded-xl overflow-hidden">
          <div class="bg-amber-50 px-3 py-2 text-xs font-bold uppercase text-amber-800 flex justify-between items-center">
            <span>🟡 Aplazadas en período (${m.aplazadasCount})</span>
            <span class="text-[10px] font-normal">motivos analizados</span>
          </div>
          ${m.aplazadasCount === 0 ? '<div class="p-4 text-xs text-slate-400 italic text-center">Sin aplazamientos registrados 🎉</div>' : `
            <div class="p-3 space-y-2">
              ${m.motivosTop.length > 0 ? `
                <div class="text-[11px] font-bold text-slate-700 mb-1">Motivos más frecuentes:</div>
                ${m.motivosTop.map(([cat, count]) => `
                  <div class="flex items-center justify-between bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                    <span class="text-xs font-medium text-slate-800">${cat}</span>
                    <span class="text-xs font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">${count}×</span>
                  </div>
                `).join('')}
              ` : '<div class="text-xs text-slate-500 italic">Aplazadas sin motivo categorizable. Revisar formato de notas.</div>'}
              ${m.motivosTop[0] && m.motivosTop[0][1] >= 3 ? `<div class="text-[11px] text-amber-900 bg-amber-100 border-l-4 border-amber-500 p-2 mt-2 rounded-r"><strong>💡 Acción:</strong> "${m.motivosTop[0][0]}" se repite ${m.motivosTop[0][1]} veces — atacarlo de raíz reduce aplazamientos futuros.</div>` : ''}
            </div>
          `}
        </div>
      </div>
      ` : ''}

      <div class="grid md:grid-cols-2 gap-3">
        <!-- Top atrasadas críticas -->
        <div class="bg-white border border-red-200 rounded-xl overflow-hidden">
          <div class="bg-red-50 px-3 py-2 text-xs font-bold uppercase text-red-800">⏰ Atrasadas críticas (${m.overdueCount})</div>
          ${m.overdueTop.length === 0 ? '<div class="p-4 text-xs text-slate-400 italic text-center">Sin tareas atrasadas en este rango 🎉</div>' : `
            <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              ${m.overdueTop.map(a => `
                <div class="px-3 py-2 hover:bg-slate-50 cursor-pointer" onclick="wpEditActivity('${a.id}')">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-semibold truncate">${(a.activity_name||'').replace(/</g,'&lt;')}</div>
                      <div class="text-[10px] text-slate-500 truncate">🏠 ${(a.houseName||'').replace(/</g,'&lt;')}${a.stage?` · ${a.stage}`:''}</div>
                    </div>
                    <div class="text-[11px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded whitespace-nowrap">⏰ ${a.daysLate}d</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Movidas / reagendadas -->
        <div class="bg-white border border-amber-200 rounded-xl overflow-hidden">
          <div class="bg-amber-50 px-3 py-2 text-xs font-bold uppercase text-amber-800">🔄 Reagendadas recientes (${m.movidasCount})</div>
          ${m.movidasTop.length === 0 ? '<div class="p-4 text-xs text-slate-400 italic text-center">Sin reagendamientos en este rango</div>' : `
            <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              ${m.movidasTop.map(a => `
                <div class="px-3 py-2 hover:bg-slate-50 cursor-pointer" onclick="wpEditActivity('${a.id}')">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-semibold truncate">${(a.activity_name||'').replace(/</g,'&lt;')}</div>
                      <div class="text-[10px] text-slate-500 truncate">🏠 ${(a.houseName||'').replace(/</g,'&lt;')} · ahora ${a.date}</div>
                    </div>
                    <div class="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded whitespace-nowrap">+${a.diffDays}d</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <div class="flex gap-2">
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm font-bold py-2 rounded">← Volver al calendario</button>
      </div>
    </div>
  `;
  openModal(`📊 Reporte del planner · ${wpAnState.rangeLabel}`, html);
  const inner = document.querySelector('#modal > div');
  if (inner) {
    ['max-w-3xl','max-w-5xl'].forEach(c => inner.classList.remove(c));
    inner.classList.add('max-w-7xl');
  }
}

// ─── 🤖 Análisis IA del reporte ───
// Llama a remodel-ai (edge function genérica con callAnthropic) y le pasa
// las métricas calculadas en JSON. Claude devuelve análisis priorizado.
async function wpAnalyticsAI() {
  const m = wpCalcAnalytics(wpAnState.from, wpAnState.to, wpAnState.house);
  const houseLabel = wpAnState.house === 'all' ? 'todas las casas'
    : (wpState.projects.find(p => p.id === wpAnState.house)?.name) || (wpAnState.house.startsWith('name:') ? wpAnState.house.slice(5) : wpAnState.house);

  const btn = document.querySelector('[onclick="wpAnalyticsAI()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Analizando...'; }

  // Construir prompt compacto con los datos clave
  const summary = {
    rango: wpAnState.rangeLabel,
    desde: wpAnState.from,
    hasta: wpAnState.to,
    casa: houseLabel,
    total_tareas: m.total,
    hechas: m.done,
    en_curso: m.inProgress,
    planeadas: m.planned,
    canceladas: m.cancelled,
    pct_cumplimiento: m.pctCumplimiento,
    velocidad_tareas_dia: m.velocityDay,
    lead_time_dias: m.avgCompletionDays,
    atrasadas: m.overdueCount,
    reagendadas: m.movidasCount,
    criticas_total: m.criticasCount,
    criticas_hechas: m.criticasDone,
    criticas_atrasadas: m.criticasAtrasadasCount,
    aplazadas_total: m.aplazadasCount,
    motivos_aplazamiento: m.motivosTop || [],
    cumplimiento_por_casa: m.houseList.map(h => ({ casa: h.name, total: h.total, hechas: h.done, atrasadas: h.overdue, pct: h.pct })),
    etapas_lentas: m.stageList.slice(0,5).map(s => ({ etapa: s.name, pct: s.pct, total: s.total, atrasadas: s.overdue })),
    dia_semana_mejor: m.dowSorted.slice().filter(d=>d.total>0).sort((a,b)=>b.pct-a.pct)[0],
    dia_semana_peor: m.dowSorted.slice().filter(d=>d.total>0).sort((a,b)=>a.pct-b.pct)[0]
  };

  const prompt = `Sos un consultor de operaciones de remodelación residencial (fix & flip) en Austin TX.
Analizá estos datos del weekly planner y devolvé un JSON con esta forma exacta (sin markdown, sin texto extra):
{
  "resumen": "1-2 frases describiendo cómo va el período",
  "estado_general": "verde|amarillo|rojo",
  "fortalezas": ["..."],
  "alertas": ["..."],
  "acciones_priorizadas": [{"titulo": "...", "detalle": "...", "impacto": "alto|medio|bajo"}],
  "tendencia": "mejorando|estable|empeorando",
  "foco_proxima_semana": "1-2 frases con la decisión clave"
}
Sé directo y accionable, sin clichés. Si el cumplimiento es <60% o hay críticas atrasadas, pasá estado a rojo.
Si hay un motivo de aplazamiento que se repite 3+ veces, conviértelo en acción priorizada.

DATOS:
${JSON.stringify(summary, null, 2)}`;

  try {
    const token = await window.getAccessToken();
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/remodel-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        project_context: { feature: 'wp-analytics', rango: wpAnState.rangeLabel }
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Error ' + res.status + ': ' + txt.slice(0, 200));
    }
    const json = await res.json();
    // remodel-ai retorna shape de Anthropic API: { content: [{type:'text', text:'...'}], ... }
    let raw = '';
    if (Array.isArray(json.content)) {
      raw = json.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
    } else {
      raw = json.text || json.response || (typeof json.content === 'string' ? json.content : JSON.stringify(json));
    }
    // Intentar parsear JSON dentro de la respuesta
    let analysis = null;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match ? match[0] : raw);
    } catch (e) {
      analysis = { resumen: raw, estado_general: 'amarillo', fortalezas: [], alertas: [], acciones_priorizadas: [], tendencia: 'estable', foco_proxima_semana: '' };
    }
    wpShowAIAnalysis(analysis);
  } catch (e) {
    alert('Error IA: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '🤖 Análisis IA'; }
  }
}

function wpShowAIAnalysis(a) {
  const colorMap = { verde: 'from-emerald-600 to-emerald-800', amarillo: 'from-amber-500 to-orange-700', rojo: 'from-red-600 to-red-800' };
  const trendIcon = { mejorando: '📈', estable: '➡️', empeorando: '📉' };
  const impactoColor = { alto: 'bg-red-100 text-red-800 border-red-300', medio: 'bg-amber-100 text-amber-800 border-amber-300', bajo: 'bg-slate-100 text-slate-700 border-slate-300' };
  const color = colorMap[a.estado_general] || 'from-slate-700 to-slate-900';
  openModal('🤖 Análisis IA del período', `
    <div class="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div class="bg-gradient-to-br ${color} text-white rounded-2xl p-4 shadow-lg">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="text-[10px] uppercase tracking-widest opacity-80 font-bold">Estado general · ${(a.estado_general||'').toUpperCase()}</div>
          <div class="text-sm opacity-90">${trendIcon[a.tendencia]||''} Tendencia: ${a.tendencia||'—'}</div>
        </div>
        <div class="text-base mt-2 leading-relaxed">${(a.resumen||'').replace(/</g,'&lt;')}</div>
      </div>

      ${(a.fortalezas||[]).length > 0 ? `
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-emerald-900 mb-2">✅ Fortalezas</div>
        <ul class="space-y-1 text-sm text-emerald-900">
          ${a.fortalezas.map(f => `<li>• ${f.replace(/</g,'&lt;')}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${(a.alertas||[]).length > 0 ? `
      <div class="bg-red-50 border border-red-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-red-900 mb-2">🚨 Alertas</div>
        <ul class="space-y-1 text-sm text-red-900">
          ${a.alertas.map(x => `<li>• ${x.replace(/</g,'&lt;')}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${(a.acciones_priorizadas||[]).length > 0 ? `
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">🎯 Acciones priorizadas</div>
        <div class="space-y-2">
          ${a.acciones_priorizadas.map((acc, i) => `
            <div class="border border-slate-200 rounded-lg p-2.5 flex items-start gap-2">
              <div class="bg-slate-900 text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">${i+1}</div>
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <div class="font-bold text-sm">${(acc.titulo||'').replace(/</g,'&lt;')}</div>
                  ${acc.impacto ? `<span class="text-[10px] uppercase font-bold border px-1.5 py-0.5 rounded ${impactoColor[acc.impacto]||'bg-slate-100'}">${acc.impacto}</span>` : ''}
                </div>
                <div class="text-xs text-slate-600 mt-0.5">${(acc.detalle||'').replace(/</g,'&lt;')}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      ${a.foco_proxima_semana ? `
      <div class="bg-violet-50 border-l-4 border-violet-600 rounded-r-xl p-3">
        <div class="text-xs font-bold uppercase text-violet-900 mb-1">🎯 Foco próxima semana</div>
        <div class="text-sm text-violet-900">${a.foco_proxima_semana.replace(/</g,'&lt;')}</div>
      </div>` : ''}

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cerrar</button>
        <button onclick="wpAnalyticsAI()" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 rounded">🔄 Re-analizar</button>
      </div>
    </div>
  `);
}

// ─── 💬 Compartir día por WhatsApp ───
// Genera mensaje formateado con todas las tareas del día y abre wa.me
function wpShareWhatsApp(dateStr, homeFilter) {
  let acts = (wpState.activities||[]).filter(a => a.date === dateStr);
  acts = wpFilterActsByHouse(acts, homeFilter || 'all');
  if (!acts.length) { alert(`Sin actividades en ${dateStr}.`); return; }

  const d = new Date(dateStr + 'T00:00:00');
  const dateLbl = d.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });

  // Agrupar por casa
  const byHome = {};
  acts.forEach(a => {
    const key = a.property_name || (wpState.projects.find(p => p.id === a.project_id)?.name) || 'Sin asignar';
    if (!byHome[key]) byHome[key] = [];
    byHome[key].push(a);
  });

  // Mensaje WhatsApp con emojis y formato compacto
  let msg = `📅 *PLAN DE OBRA · ${dateLbl.toUpperCase()}*\n\n`;
  Object.entries(byHome).forEach(([home, hActs]) => {
    msg += `🏠 *${home}*\n`;
    hActs.forEach((a, i) => {
      const isDone = a.status === 'done';
      const isCritical = a.priority === 'critical' || a.priority === 'urgent';
      const isPostponed = (a.notes||'').includes('[APLAZADA');
      const checkbox = isDone ? '✅' : '☐';
      const tags = [];
      if (isCritical && !isDone) tags.push('⚠️ IMPORTANTE');
      if (isPostponed) tags.push('🟡 APLAZADA');
      msg += `${checkbox} ${a.activity_name}${tags.length?' '+tags.join(' '):''}`;
      if (a.start_hour || a.end_hour) msg += ` (${a.start_hour||7}h-${a.end_hour||17}h)`;
      msg += '\n';
      if ((a.materials||[]).length) {
        msg += `   📦 ${a.materials.map(m => `${m.nombre} ${m.cantidad}${m.unidad||''}`).join(', ')}\n`;
      }
      if (a.notes && !a.notes.includes('[APLAZADA')) {
        msg += `   📝 ${a.notes.split('\n')[0].slice(0,120)}\n`;
      }
    });
    msg += '\n';
  });
  msg += `_Generado por Empresa OS · ${new Date().toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'})}_`;

  // Modal de preview con editor + botón enviar
  openModal('💬 Enviar plan del día por WhatsApp', `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Revisá el mensaje. Podés editarlo antes de enviarlo. Al hacer clic en enviar, WhatsApp Web/App se abrirá con el mensaje listo.</div>
      <textarea id="wp-wa-msg" rows="14" class="w-full border border-emerald-300 rounded p-3 text-xs font-mono">${msg.replace(/</g,'&lt;')}</textarea>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">📞 Número (opcional · con código país, sin +)</label>
        <input id="wp-wa-phone" type="text" placeholder="521555..." class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
        <div class="text-[10px] text-slate-500 mt-0.5">Si dejás vacío, WhatsApp pedirá elegir contacto.</div>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="wpDoWhatsAppShare()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">💬 Abrir WhatsApp</button>
      </div>
    </div>
  `);
}

function wpDoWhatsAppShare() {
  const msg = document.getElementById('wp-wa-msg').value;
  const phone = (document.getElementById('wp-wa-phone').value || '').replace(/[^0-9]/g, '');
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  wpBackToPlanner();
}

function wpPrintAnalytics() {
  const root = document.getElementById('wp-an-root');
  if (!root) return;
  const w = window.open('', '_blank', 'width=900,height=1200');
  w.document.write(`<!DOCTYPE html><html><head><title>Reporte planner · ${wpAnState.rangeLabel}</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>@media print { button { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style>
    </head><body class="p-6 bg-white">
      <div class="mb-4 border-b-2 border-slate-900 pb-2">
        <div class="text-xl font-bold">📊 Reporte semanal del planner</div>
        <div class="text-xs text-slate-600">${wpAnState.rangeLabel} · ${new Date().toLocaleString('es')}</div>
      </div>
      ${root.innerHTML}
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ════════════════════════════════════════════════════════════
// 📱 VISTA OBRERO MOBILE — pantalla full screen del día
// Optimizada para celular: tipografía grande, checkboxes 44px (target táctil),
// cards verticales con materiales + notas visibles. El líder de obra la
// usa en su celular durante la jornada para marcar tareas en vivo.
// ════════════════════════════════════════════════════════════
const wpWorkerState = {
  date: null,
  house: 'all',
  open: false,
  openTaskId: null
};

function wpOpenWorkerMobile(dateStr, homeFilter) {
  wpWorkerState.date = dateStr || wpDateOnly(new Date());
  wpWorkerState.house = homeFilter || wpState.houseFilter || 'all';
  wpWorkerState.open = true;
  wpRenderWorkerMobile();
}

function wpRenderWorkerMobile() {
  const dateStr = wpWorkerState.date;
  const house = wpWorkerState.house;
  let acts = (wpState.activities||[]).filter(a => a.date === dateStr);
  acts = wpFilterActsByHouse(acts, house);

  const d = new Date(dateStr+'T00:00:00');
  const dateLbl = d.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });

  // Opciones de casa para selector
  const hidden = new Set(wpState.projects.filter(p => p.status === 'completed' || p.status === 'cancelled').map(p => p.id));
  const activeProj = wpState.projects.filter(p => !hidden.has(p.id));
  const extra = new Set();
  wpState.activities.forEach(a => { if (!a.project_id && a.property_name) extra.add(a.property_name); });
  const houseOpts = [
    `<option value="all" ${house==='all'?'selected':''}>🏘️ Todas las casas</option>`,
    ...activeProj.map(p => `<option value="${p.id}" ${house===p.id?'selected':''}>🏠 ${(p.name||'').replace(/</g,'&lt;')}</option>`),
    ...Array.from(extra).map(n => `<option value="name:${n.replace(/"/g,'&quot;')}" ${house==='name:'+n?'selected':''}>🏠 ${n.replace(/</g,'&lt;')}</option>`)
  ].join('');

  // Agrupar por casa
  const byHome = {};
  acts.forEach(a => {
    const key = a.property_name || 'Sin asignar';
    if (!byHome[key]) byHome[key] = [];
    byHome[key].push(a);
  });

  const totalDone = acts.filter(a => a.status === 'done').length;
  const pct = acts.length ? Math.round(totalDone/acts.length*100) : 0;
  const prevIso = wpDateOnly(wpAddDays(d, -1));
  const nextIso = wpDateOnly(wpAddDays(d, 1));

  // Overlay full screen sin usar el modal estándar
  let overlay = document.getElementById('wp-worker-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'wp-worker-overlay';
    overlay.className = 'fixed inset-0 bg-slate-100 z-[60] overflow-y-auto';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="min-h-full flex flex-col">
      <!-- Header sticky -->
      <div class="sticky top-0 z-10 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3 shadow-md">
        <div class="flex items-center justify-between gap-2 mb-2">
          <button onclick="wpCloseWorkerMobile()" class="bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm font-bold">✕ Salir</button>
          <div class="text-center flex-1">
            <div class="text-[10px] uppercase opacity-75 font-bold tracking-wider">Vista obrero</div>
            <div class="text-base font-bold capitalize leading-tight">${dateLbl}</div>
          </div>
          <button onclick="wpWorkerShare()" class="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-bold">📤</button>
        </div>
        <!-- Filtro casa y navegación día -->
        <div class="flex items-center gap-1.5">
          <button onclick="wpOpenWorkerMobile('${prevIso}', '${house}')" class="bg-white/15 hover:bg-white/25 rounded px-2 py-2 text-base font-bold">←</button>
          <select onchange="wpOpenWorkerMobile('${dateStr}', this.value)" class="flex-1 bg-white text-slate-900 rounded px-2 py-2 text-sm font-bold">${houseOpts}</select>
          <button onclick="wpOpenWorkerMobile('${nextIso}', '${house}')" class="bg-white/15 hover:bg-white/25 rounded px-2 py-2 text-base font-bold">→</button>
        </div>
        <!-- Progreso -->
        <div class="mt-2 bg-white/15 backdrop-blur rounded-lg p-2 flex items-center gap-3">
          <div class="flex-1">
            <div class="text-[10px] uppercase opacity-75 font-bold">Avance del día</div>
            <div class="h-2 bg-white/20 rounded-full overflow-hidden mt-0.5">
              <div class="h-full bg-emerald-400 transition-all" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xl font-black leading-none">${pct}%</div>
            <div class="text-[10px] opacity-75">${totalDone}/${acts.length}</div>
          </div>
        </div>
      </div>

      <!-- Lista de tareas -->
      <div class="flex-1 p-3 space-y-3 max-w-2xl mx-auto w-full">
        ${acts.length === 0 ? `
          <div class="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
            <div class="text-5xl mb-2">📭</div>
            <div class="text-base font-semibold">Sin tareas hoy</div>
            <div class="text-xs mt-1">Probá otro día o casa</div>
          </div>
        ` : Object.entries(byHome).map(([home, hActs]) => `
          <div>
            <div class="text-xs uppercase tracking-wider font-bold text-slate-500 px-1 mb-1.5">🏠 ${home.replace(/</g,'&lt;')}</div>
            <div class="space-y-2">
              ${hActs.map(a => {
                const isDone = a.status === 'done';
                const isCritical = a.priority === 'critical' || a.priority === 'urgent';
                const isPostponed = (a.notes||'').includes('[APLAZADA');
                const cardBg = isDone ? 'bg-emerald-50 border-emerald-400'
                  : isCritical ? 'bg-rose-50 border-rose-500'
                  : isPostponed ? 'bg-amber-50 border-amber-400'
                  : 'bg-white border-slate-200';
                return `
                  <div class="border-2 ${cardBg} rounded-2xl p-3 shadow-sm">
                    <div class="flex items-start gap-3">
                      <!-- Checkbox enorme táctil -->
                      <button onclick="wpQuickToggleDone('${a.id}')" class="flex-shrink-0 w-12 h-12 rounded-xl border-4 ${isDone?'bg-emerald-600 border-emerald-700':'bg-white border-slate-400'} flex items-center justify-center" aria-label="Marcar hecha">
                        ${isDone ? '<span class="text-white text-2xl font-black">✓</span>' : '<span class="text-2xl">⬜</span>'}
                      </button>
                      <div class="flex-1 min-w-0">
                        <div class="flex flex-wrap gap-1 mb-1">
                          ${isCritical && !isDone ? '<span class="bg-rose-700 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">⚠️ Importante</span>' : ''}
                          ${isPostponed ? '<span class="bg-amber-500 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">🟡 Aplazada</span>' : ''}
                        </div>
                        <div class="text-base font-bold leading-snug ${isDone?'line-through text-slate-500':'text-slate-900'}">${(a.activity_name||'').replace(/</g,'&lt;')}</div>
                        ${a.stage ? `<div class="text-xs text-slate-500 mt-0.5">📂 ${a.stage.replace(/</g,'&lt;')}</div>` : ''}
                        ${a.start_hour || a.end_hour ? `<div class="text-xs text-slate-500 mt-0.5">⏰ ${a.start_hour||7}h - ${a.end_hour||17}h</div>` : ''}

                        ${(a.materials||[]).length > 0 ? `
                          <div class="mt-2 bg-amber-100 rounded-lg p-2">
                            <div class="text-[10px] font-bold uppercase text-amber-900">📦 Materiales</div>
                            <ul class="text-sm text-amber-900 mt-0.5">
                              ${a.materials.map(m => `<li>• <strong>${(m.nombre||'').replace(/</g,'&lt;')}</strong> ${m.cantidad||1} ${(m.unidad||'').replace(/</g,'&lt;')}</li>`).join('')}
                            </ul>
                          </div>` : ''}

                        ${a.notes && !a.notes.includes('[APLAZADA') ? `
                          <div class="mt-2 bg-yellow-100 border-l-4 border-yellow-500 rounded-r-lg p-2">
                            <div class="text-[10px] font-bold uppercase text-yellow-900">📝 Notas</div>
                            <div class="text-sm text-slate-900 whitespace-pre-wrap mt-0.5">${a.notes.split('\n').filter(l=>!l.includes('[APLAZADA')).join('\n').replace(/</g,'&lt;')}</div>
                          </div>` : ''}

                        ${(a.checklist||[]).length > 0 ? `
                          <div class="mt-2">
                            <div class="text-[10px] font-bold uppercase text-slate-600">✅ Pasos (${(a.checklist||[]).filter(c=>c.done).length}/${a.checklist.length})</div>
                            <ul class="text-sm mt-0.5 space-y-1">
                              ${a.checklist.map((it, idx) => `
                                <li class="flex items-start gap-2 ${it.done?'line-through text-slate-400':'text-slate-800'}">
                                  <button onclick="wpToggleChecklistMobile('${a.id}', ${idx})" class="flex-shrink-0 w-6 h-6 rounded border-2 ${it.done?'bg-slate-700 border-slate-700':'bg-white border-slate-400'} flex items-center justify-center text-white text-sm font-bold">${it.done?'✓':''}</button>
                                  <span>${(it.item||'').replace(/</g,'&lt;')}</span>
                                </li>`).join('')}
                            </ul>
                          </div>` : ''}
                      </div>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Footer sticky con acciones -->
      <div class="sticky bottom-0 bg-white border-t-2 border-slate-200 p-3 grid grid-cols-2 gap-2 shadow-lg">
        <button onclick="wpWorkerShare()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-xl">📤 Compartir</button>
        <button onclick="wpCloseWorkerMobile()" class="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-3 rounded-xl">✕ Cerrar</button>
      </div>
    </div>
  `;
}

function wpCloseWorkerMobile() {
  wpWorkerState.open = false;
  const overlay = document.getElementById('wp-worker-overlay');
  if (overlay) overlay.remove();
}

async function wpToggleChecklistMobile(actId, idx) {
  const a = (wpState.activities||[]).find(x => x.id === actId);
  if (!a) return;
  const cl = [...(a.checklist||[])];
  cl[idx] = { ...cl[idx], done: !cl[idx].done };
  a.checklist = cl;  // optimistic
  wpRenderWorkerMobile();
  await window.safeUpdate(p => sb.from('weekly_activities').update(p).eq('id', actId), { checklist: cl, updated_at: new Date().toISOString() });
}

// Refrescar la vista cuando se toggle un check desde wpQuickToggleDone
const _wpOriginalRender = wpRender;
wpRender = function() {
  _wpOriginalRender();
  if (wpWorkerState.open) wpRenderWorkerMobile();
};

// ─── Share link de la vista del día ───
// Genera URL con params para que el líder de obra abra directo en su celular
// ej: https://empresa-os.vercel.app/?wp_day=2026-06-08&wp_house=name:Wellington
function wpWorkerShare() {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  params.set('wp_day', wpWorkerState.date);
  if (wpWorkerState.house && wpWorkerState.house !== 'all') params.set('wp_house', wpWorkerState.house);
  params.set('wp_mode', 'worker');
  const url = `${base}?${params.toString()}`;

  // Construir mensaje WhatsApp con el link al final
  let acts = (wpState.activities||[]).filter(a => a.date === wpWorkerState.date);
  acts = wpFilterActsByHouse(acts, wpWorkerState.house);
  const d = new Date(wpWorkerState.date+'T00:00:00');
  const dateLbl = d.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });

  const byHome = {};
  acts.forEach(a => {
    const key = a.property_name || 'Sin asignar';
    if (!byHome[key]) byHome[key] = [];
    byHome[key].push(a);
  });

  let msg = `📅 *PLAN DEL DÍA · ${dateLbl.toUpperCase()}*\n\n`;
  Object.entries(byHome).forEach(([home, hActs]) => {
    msg += `🏠 *${home}*\n`;
    hActs.forEach(a => {
      const isDone = a.status === 'done';
      const tag = a.priority==='critical' || a.priority==='urgent' ? ' ⚠️' : (a.notes||'').includes('[APLAZADA') ? ' 🟡' : '';
      msg += `${isDone?'✅':'☐'} ${a.activity_name}${tag}\n`;
    });
    msg += '\n';
  });
  msg += `📱 *Ver en celular y marcar tareas:*\n${url}\n\n_Tap el link y vas a la vista táctil del día._`;

  openModal('📤 Compartir vista del día', `
    <div class="space-y-3">
      <div class="bg-emerald-50 border border-emerald-300 rounded p-3 text-xs">
        <strong>Link al día (vista obrero):</strong>
        <div class="mt-1 bg-white border border-slate-200 rounded p-2 text-[11px] font-mono break-all">${url}</div>
        <button onclick="navigator.clipboard.writeText('${url}'); this.textContent='✓ Copiado'" class="mt-2 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded">📋 Copiar link</button>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Mensaje WhatsApp (editable)</label>
        <textarea id="wp-worker-share-msg" rows="10" class="w-full border border-emerald-300 rounded p-2 text-xs font-mono">${msg.replace(/</g,'&lt;')}</textarea>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">📞 Número (opcional, con código país sin +)</label>
        <input id="wp-worker-share-phone" type="text" placeholder="521555..." class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="(()=>{ const m=document.getElementById('wp-worker-share-msg').value; const p=(document.getElementById('wp-worker-share-phone').value||'').replace(/[^0-9]/g,''); const u=p?\`https://wa.me/\${p}?text=\${encodeURIComponent(m)}\`:\`https://wa.me/?text=\${encodeURIComponent(m)}\`; window.open(u,'_blank'); closeModal(); })()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">💬 Enviar WhatsApp</button>
      </div>
    </div>
  `);
}

// Auto-abrir la vista obrero si la URL trae ?wp_mode=worker
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('wp_mode') === 'worker' && sp.get('wp_day')) {
      // Esperar a que la app cargue y haya un sys (de remodelación) activo
      const tryOpen = () => {
        if (typeof wpLoadAll === 'function' && window.SUPABASE_URL) {
          wpLoadAll().then(() => {
            wpOpenWorkerMobile(sp.get('wp_day'), sp.get('wp_house') || 'all');
          });
        } else {
          setTimeout(tryOpen, 500);
        }
      };
      setTimeout(tryOpen, 1500);
    }
  });
}

// ════════════════════════════════════════════════════════════
// 📅 VISTA MENSUAL — calendario mes completo
// Cada día es una celda con número de tareas, color por estado.
// Click en un día abre la vista detallada de ese día.
// ════════════════════════════════════════════════════════════
const wpMonthState = { monthStart: null };

function wpOpenMonthView() {
  if (!wpMonthState.monthStart) {
    const t = new Date();
    wpMonthState.monthStart = new Date(t.getFullYear(), t.getMonth(), 1);
  }
  wpRenderMonthView();
}

function wpNavMonth(delta) {
  const m = wpMonthState.monthStart;
  if (delta === 0) {
    const t = new Date();
    wpMonthState.monthStart = new Date(t.getFullYear(), t.getMonth(), 1);
  } else {
    wpMonthState.monthStart = new Date(m.getFullYear(), m.getMonth() + delta, 1);
  }
  wpRenderMonthView();
}

function wpRenderMonthView() {
  const ms = wpMonthState.monthStart;
  const year = ms.getFullYear();
  const month = ms.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay(); // 0=Dom
  // Empezar la grilla en lunes
  const lead = startWeekday === 0 ? 6 : startWeekday - 1;
  const monthLabel = ms.toLocaleDateString('es', { month:'long', year:'numeric' });

  // Filtrar actividades del mes (respetando filtro de casa)
  const houseFilter = wpState.houseFilter || 'all';
  const fromIso = wpDateOnly(firstDay);
  const toIso = wpDateOnly(lastDay);
  let acts = (wpState.activities||[]).filter(a => a.date && a.date >= fromIso && a.date <= toIso);
  acts = wpFilterActsByHouse(acts, houseFilter);

  // Agrupar por día
  const byDay = {};
  acts.forEach(a => {
    if (!byDay[a.date]) byDay[a.date] = { total:0, done:0, criticas:0, atrasadas:0, aplazadas:0, byHouse:{} };
    byDay[a.date].total++;
    if (a.status === 'done') byDay[a.date].done++;
    if (a.priority === 'critical' || a.priority === 'urgent') byDay[a.date].criticas++;
    if ((a.notes||'').includes('[APLAZADA')) byDay[a.date].aplazadas++;
    const home = a.property_name || 'Sin asignar';
    byDay[a.date].byHouse[home] = (byDay[a.date].byHouse[home] || 0) + 1;
  });

  const todayIso = wpDateOnly(new Date());
  acts.forEach(a => {
    if (a.status !== 'done' && a.status !== 'cancelled' && a.date < todayIso) {
      if (byDay[a.date]) byDay[a.date].atrasadas++;
    }
  });

  // KPIs del mes
  const totalMes = acts.length;
  const doneMes = acts.filter(a => a.status === 'done').length;
  const pctMes = totalMes ? Math.round(doneMes/totalMes*100) : 0;

  // Construir grilla 6 filas × 7 columnas
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const iso = wpDateOnly(date);
    cells.push({ date, iso, day: d, info: byDay[iso] || null, isToday: iso === todayIso });
  }
  while (cells.length < 42) cells.push(null);

  // Opciones de casa
  const hidden = new Set(wpState.projects.filter(p => p.status === 'completed' || p.status === 'cancelled').map(p => p.id));
  const activeProj = wpState.projects.filter(p => !hidden.has(p.id));
  const extra = new Set();
  wpState.activities.forEach(a => { if (!a.project_id && a.property_name) extra.add(a.property_name); });
  const houseOpts = [
    `<option value="all" ${houseFilter==='all'?'selected':''}>🏘️ Todas</option>`,
    ...activeProj.map(p => `<option value="${p.id}" ${houseFilter===p.id?'selected':''}>🏠 ${(p.name||'').replace(/</g,'&lt;')}</option>`),
    ...Array.from(extra).map(n => `<option value="name:${n.replace(/"/g,'&quot;')}" ${houseFilter==='name:'+n?'selected':''}>🏠 ${n.replace(/</g,'&lt;')}</option>`)
  ].join('');

  const html = `
    <div class="space-y-3">
      <!-- Header -->
      <div class="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <button onclick="wpNavMonth(-1)" class="bg-white/10 hover:bg-white/20 rounded px-3 py-1.5 text-sm font-bold">←</button>
          <div class="text-base font-bold capitalize px-2">${monthLabel}</div>
          <button onclick="wpNavMonth(1)" class="bg-white/10 hover:bg-white/20 rounded px-3 py-1.5 text-sm font-bold">→</button>
          <button onclick="wpNavMonth(0)" class="bg-emerald-500 hover:bg-emerald-600 rounded px-3 py-1.5 text-xs font-bold ml-2">Hoy</button>
        </div>
        <div class="flex items-center gap-2">
          <select onchange="wpSetHouseFilter(this.value); wpRenderMonthView();" class="bg-white text-slate-900 rounded px-2 py-1 text-xs font-bold">${houseOpts}</select>
          <span class="text-xs bg-white/15 px-2 py-1 rounded font-bold">${doneMes}/${totalMes} (${pctMes}%)</span>
        </div>
      </div>

      <!-- Grilla calendario -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="grid grid-cols-7 bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
          ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => `<div class="p-2 text-center border-r border-slate-200 last:border-r-0">${d}</div>`).join('')}
        </div>
        <div class="grid grid-cols-7">
          ${cells.map((c, i) => {
            if (!c) return `<div class="border-t border-r border-slate-100 last:border-r-0 bg-slate-50 min-h-[80px]"></div>`;
            const info = c.info;
            let bg = 'bg-white hover:bg-slate-50';
            if (c.isToday) bg = 'bg-amber-50 hover:bg-amber-100';
            if (info?.atrasadas > 0) bg = 'bg-red-50 hover:bg-red-100';
            else if (info?.criticas > 0 && info.done < info.criticas) bg = 'bg-rose-50 hover:bg-rose-100';
            const isWeekend = (i % 7) >= 5;
            return `
              <button onclick="wpOpenDayView('${c.iso}', '${houseFilter}')" class="border-t border-r border-slate-100 last:border-r-0 ${bg} ${isWeekend?'opacity-70':''} text-left p-1.5 min-h-[80px] flex flex-col">
                <div class="flex items-center justify-between">
                  <div class="text-xs font-bold ${c.isToday?'bg-amber-600 text-white px-1.5 rounded':'text-slate-700'}">${c.day}</div>
                  ${info?.criticas>0 ? `<span class="text-[9px] bg-rose-700 text-white font-bold px-1 rounded">⚠️${info.criticas}</span>` : ''}
                </div>
                ${info ? `
                  <div class="mt-1 flex-1">
                    <div class="text-[11px] font-bold ${info.done===info.total?'text-emerald-700':info.atrasadas>0?'text-red-700':'text-slate-700'}">${info.done}/${info.total}</div>
                    ${info.atrasadas > 0 ? `<div class="text-[9px] text-red-700">⏰ ${info.atrasadas} atras.</div>` : ''}
                    ${info.aplazadas > 0 ? `<div class="text-[9px] text-amber-700">🟡 ${info.aplazadas}</div>` : ''}
                    ${Object.keys(info.byHouse).length === 1 ? `<div class="text-[9px] text-slate-500 truncate">${Object.keys(info.byHouse)[0]}</div>` : Object.keys(info.byHouse).length > 1 ? `<div class="text-[9px] text-slate-500">${Object.keys(info.byHouse).length} casas</div>` : ''}
                  </div>
                ` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Leyenda -->
      <div class="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] text-slate-600 flex flex-wrap gap-3">
        <span class="flex items-center gap-1"><span class="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></span> Hoy</span>
        <span class="flex items-center gap-1"><span class="w-3 h-3 bg-rose-50 border border-rose-300 rounded"></span> Críticas pendientes</span>
        <span class="flex items-center gap-1"><span class="w-3 h-3 bg-red-50 border border-red-300 rounded"></span> Atrasadas</span>
        <span class="flex items-center gap-1">⚠️ Críticas del día · 🟡 Aplazadas · ⏰ Atrasadas</span>
      </div>

      <div class="flex gap-2">
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm font-bold py-2 rounded">← Volver a semana</button>
      </div>
    </div>
  `;
  openModal(`📅 Vista mensual · ${monthLabel}`, html);
  const inner = document.querySelector('#modal > div');
  if (inner) { ['max-w-3xl','max-w-5xl'].forEach(c => inner.classList.remove(c)); inner.classList.add('max-w-6xl'); }
}

// ════════════════════════════════════════════════════════════
// 📥 EXPORT ICS — calendario nativo (Google Calendar / iCloud)
// Genera archivo .ics descargable con todas las tareas del rango.
// El líder lo importa y se sincroniza con su calendario nativo.
// ════════════════════════════════════════════════════════════
function wpOpenIcsExport() {
  const today = wpDateOnly(new Date());
  const monthEnd = wpDateOnly(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

  const hidden = new Set(wpState.projects.filter(p => p.status === 'completed' || p.status === 'cancelled').map(p => p.id));
  const activeProj = wpState.projects.filter(p => !hidden.has(p.id));
  const extra = new Set();
  wpState.activities.forEach(a => { if (!a.project_id && a.property_name) extra.add(a.property_name); });
  const houseOpts = [
    `<option value="all">🏘️ Todas las casas</option>`,
    ...activeProj.map(p => `<option value="${p.id}">🏠 ${(p.name||'').replace(/</g,'&lt;')}</option>`),
    ...Array.from(extra).map(n => `<option value="name:${n.replace(/"/g,'&quot;')}">🏠 ${n.replace(/</g,'&lt;')}</option>`)
  ].join('');

  openModal('📥 Exportar a calendario (.ics)', `
    <div class="space-y-3">
      <div class="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
        Descargá un archivo <code>.ics</code> con las tareas. Al abrirlo, tu calendario nativo
        (Google Calendar, Apple Calendar, Outlook) las importa con <strong>recordatorios nativos</strong>.
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Desde</label>
          <input id="ics-from" type="date" value="${today}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Hasta</label>
          <input id="ics-to" type="date" value="${monthEnd}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Casa</label>
        <select id="ics-house" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">${houseOpts}</select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Recordatorio (minutos antes)</label>
        <select id="ics-reminder" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
          <option value="">Sin recordatorio</option>
          <option value="15">15 minutos antes</option>
          <option value="30" selected>30 minutos antes</option>
          <option value="60">1 hora antes</option>
          <option value="1440">1 día antes</option>
        </select>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="wpBackToPlanner()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="wpDoIcsExport()" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded">📥 Descargar .ics</button>
      </div>
    </div>
  `);
}

function wpDoIcsExport() {
  const from = document.getElementById('ics-from').value;
  const to = document.getElementById('ics-to').value;
  const house = document.getElementById('ics-house').value;
  const reminderMin = +document.getElementById('ics-reminder').value || 0;
  if (!from || !to) return;

  let acts = (wpState.activities||[]).filter(a => a.date && a.date >= from && a.date <= to);
  acts = wpFilterActsByHouse(acts, house);
  if (!acts.length) { alert('Sin tareas en ese rango.'); return; }

  // Filtrar canceladas
  acts = acts.filter(a => a.status !== 'cancelled');

  // Construir ICS
  const pad = n => String(n).padStart(2,'0');
  const fmtDT = (dateStr, hour, min) => {
    const d = new Date(dateStr+'T00:00:00');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(hour||7)}${pad(min||0)}00`;
  };
  const nowUtc = (() => {
    const d = new Date();
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  })();
  const esc = s => String(s||'').replace(/[\\;,]/g, m => '\\'+m).replace(/\n/g, '\\n');

  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Empresa OS//Weekly Planner//ES\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n';
  acts.forEach(a => {
    const startHour = a.start_hour || 7;
    const endHour = a.end_hour || 17;
    const title = a.activity_name || 'Tarea';
    const home = a.property_name || '—';
    const stage = a.stage ? ` · ${a.stage}` : '';
    const critical = (a.priority === 'critical' || a.priority === 'urgent') ? ' ⚠️' : '';
    const done = a.status === 'done' ? ' ✅' : '';
    const summary = `${critical}${done} ${title} (${home})${stage}`.trim();

    const materials = (a.materials||[]).map(m => `• ${m.nombre||''} ${m.cantidad||1} ${m.unidad||''}`).join('\n');
    const checklist = (a.checklist||[]).map(c => `${c.done?'☑':'☐'} ${c.item||''}`).join('\n');
    let desc = `Casa: ${home}\n${stage?`Etapa: ${a.stage}\n`:''}Estado: ${a.status||'planned'}`;
    if (materials) desc += `\n\nMateriales:\n${materials}`;
    if (checklist) desc += `\n\nChecklist:\n${checklist}`;
    if (a.notes) desc += `\n\nNotas:\n${a.notes}`;

    const uid = `wpa-${a.id}@empresa-os`;
    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${uid}\r\n`;
    ics += `DTSTAMP:${nowUtc}\r\n`;
    ics += `DTSTART:${fmtDT(a.date, startHour)}\r\n`;
    ics += `DTEND:${fmtDT(a.date, endHour)}\r\n`;
    ics += `SUMMARY:${esc(summary)}\r\n`;
    ics += `DESCRIPTION:${esc(desc)}\r\n`;
    ics += `LOCATION:${esc(home)}\r\n`;
    if (a.status === 'done') ics += 'STATUS:CONFIRMED\r\n';
    if (reminderMin > 0) {
      ics += 'BEGIN:VALARM\r\n';
      ics += 'ACTION:DISPLAY\r\n';
      ics += `DESCRIPTION:${esc(summary)}\r\n`;
      ics += `TRIGGER:-PT${reminderMin}M\r\n`;
      ics += 'END:VALARM\r\n';
    }
    ics += 'END:VEVENT\r\n';
  });
  ics += 'END:VCALENDAR\r\n';

  // Descargar
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `empresa-os-planner-${from}-${to}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  wpBackToPlanner();
}

// ════════════════════════════════════════════════════════════
// 📉 PLAN INICIAL vs REAL (baseline) — desviación por tarea/etapa/casa/global + Cerebro de planeación.
//    Lee baseline_date (día planeado original) vs date (real) de weekly_activities. NO escribe data.
// ════════════════════════════════════════════════════════════
const wpDevState = { house: 'all' };
function wpDaysDiff(a, b) { if (!a || !b) return 0; return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
function wpHouseNameOf(a) { return a.property_name || ((wpState.projects || []).find(p => p.id === a.project_id) || {}).name || '—'; }

function wpCalcDeviation(houseFilter) {
  let acts = (wpState.activities || []).filter(a => a.baseline_date && a.date && a.status !== 'cancelled');
  if (houseFilter && houseFilter !== 'all') acts = wpFilterActsByHouse(acts, houseFilter);
  const withSlip = acts.map(a => ({ ...a, slip: wpDaysDiff(a.baseline_date, a.date) }));
  const late = withSlip.filter(a => a.slip > 0), moved = withSlip.filter(a => a.slip !== 0);
  const totalSlip = late.reduce((s, a) => s + a.slip, 0);
  const avgSlip = withSlip.length ? withSlip.reduce((s, a) => s + a.slip, 0) / withSlip.length : 0;
  const onTimePct = withSlip.length ? Math.round((withSlip.length - late.length) / withSlip.length * 100) : 100;
  const nowMonth = wpDateOnly(new Date()).slice(0, 7);
  const diasMesMas = (wpState.moves || []).filter(m => (m.moved_at || '').slice(0, 7) === nowMonth).reduce((s, m) => s + Math.max(0, +m.slip_days || 0), 0);
  const grp = keyFn => { const g = {}; withSlip.forEach(a => { const k = keyFn(a) || '—'; (g[k] = g[k] || { key: k, n: 0, slipSum: 0, late: 0 }); g[k].n++; g[k].slipSum += a.slip; if (a.slip > 0) g[k].late++; }); return Object.values(g).map(x => ({ ...x, avg: x.n ? x.slipSum / x.n : 0, pct: x.n ? Math.round(x.late / x.n * 100) : 0 })).sort((a, b) => b.avg - a.avg); };
  const byStage = grp(a => a.stage), byType = grp(a => (a.activity_name || '').replace(/\s*\(día.*/, '').trim() || a.activity_code);
  const byCrew = (() => { const g = {}; withSlip.forEach(a => (a.resource_ids || []).forEach(rid => { const r = (wpState.resources || []).find(x => x.id === rid); if (r && r.type === 'crew') { (g[r.name] = g[r.name] || { key: r.name, n: 0, slipSum: 0, late: 0 }); g[r.name].n++; g[r.name].slipSum += a.slip; if (a.slip > 0) g[r.name].late++; } })); return Object.values(g).map(x => ({ ...x, avg: x.n ? x.slipSum / x.n : 0, pct: x.n ? Math.round(x.late / x.n * 100) : 0 })).sort((a, b) => b.avg - a.avg); })();
  const H = {}; withSlip.forEach(a => { const h = wpHouseNameOf(a); const x = (H[h] = H[h] || { house: h, n: 0, slipSum: 0, late: 0, planMin: a.baseline_date, planMax: a.baseline_date, realMin: a.date, realMax: a.date }); x.n++; x.slipSum += a.slip; if (a.slip > 0) x.late++; if (a.baseline_date < x.planMin) x.planMin = a.baseline_date; if (a.baseline_date > x.planMax) x.planMax = a.baseline_date; if (a.date < x.realMin) x.realMin = a.date; if (a.date > x.realMax) x.realMax = a.date; });
  const byHouse = Object.values(H).map(x => ({ ...x, avg: x.n ? x.slipSum / x.n : 0, pct: x.n ? Math.round(x.late / x.n * 100) : 0 })).sort((a, b) => b.avg - a.avg);
  return { withSlip, moved, late, totalSlip, avgSlip, onTimePct, diasMesMas, tareasMovidas: moved.length, byStage, byType, byCrew, byHouse };
}

// C) APRENDIZAJE — agregados de desviación por etapa/tipo/crew, listos para que el Estimador calibre días/etapa.
//    (No se aplican todavía; el dato queda disponible acá y en la vista SQL remodel_stage_deviation.)
function wpDeviationAggregates() {
  const c = wpCalcDeviation('all');
  return { byStage: c.byStage.map(s => ({ stage: s.key, avgSlipDays: +s.avg.toFixed(2), pctLate: s.pct, n: s.n })), byTaskType: c.byType.slice(0, 40).map(t => ({ task: t.key, avgSlipDays: +t.avg.toFixed(2), n: t.n })), byCrew: c.byCrew.map(cr => ({ crew: cr.key, avgSlipDays: +cr.avg.toFixed(2), n: cr.n })), generatedAt: wpDateOnly(new Date()) };
}
window.wpDeviationAggregates = wpDeviationAggregates;

function wpOpenDeviation() { wpDevState.house = wpState.houseFilter || 'all'; wpRenderDeviation(); }
window.wpOpenDeviation = wpOpenDeviation;
function wpDevSetHouse(v) { wpDevState.house = v; wpRenderDeviation(); }
window.wpDevSetHouse = wpDevSetHouse;

function wpRenderDeviation() {
  wpInjectTheme();
  const c = wpCalcDeviation(wpDevState.house);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '—';
  const slipChip = v => v > 0 ? `<span class="dv-chip bad">+${v}d</span>` : v < 0 ? `<span class="dv-chip ok">${v}d</span>` : `<span class="dv-chip ok">a tiempo</span>`;
  // opciones de casa
  const activeProj = (wpState.projects || []).filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  const extra = new Set(); (wpState.activities || []).forEach(a => { if (!a.project_id && a.property_name) extra.add(a.property_name); });
  const houseOpts = [`<option value="all">🏘️ Todas las casas</option>`, ...activeProj.map(p => `<option value="${esc(p.id)}" ${wpDevState.house === p.id ? 'selected' : ''}>🏠 ${esc(p.name)}</option>`), ...[...extra].map(n => `<option value="name:${esc(n)}" ${wpDevState.house === 'name:' + n ? 'selected' : ''}>🏠 ${esc(n)}</option>`)].join('');
  // timeline global
  const allD = c.byHouse.flatMap(h => [h.planMin, h.planMax, h.realMin, h.realMax]).filter(Boolean).sort();
  const gMin = allD[0], gMax = allD[allD.length - 1];
  const span = Math.max(1, wpDaysDiff(gMin, gMax));
  const pos = d => Math.max(0, Math.min(100, wpDaysDiff(gMin, d) / span * 100));
  // Cerebro de planeación
  const insights = [];
  if (c.byStage[0] && c.byStage[0].avg > 0.3) insights.push(`La etapa que más se atrasa es <b>${esc(c.byStage[0].key)}</b> — promedio +${c.byStage[0].avg.toFixed(1)} días (${c.byStage[0].pct}% de sus tareas se movieron).`);
  if (c.byCrew[0] && c.byCrew[0].avg > 0.3) insights.push(`El crew con más atraso es <b>${esc(c.byCrew[0].key)}</b> — +${c.byCrew[0].avg.toFixed(1)} días promedio.`);
  if (c.byType[0] && c.byType[0].avg > 0.5) insights.push(`Tipo de tarea más problemático: <b>${esc(c.byType[0].key)}</b> (+${c.byType[0].avg.toFixed(1)}d).`);
  if (c.byHouse[0] && c.byHouse[0].pct > 0) insights.push(`Casa con mayor % de desviación: <b>${esc(c.byHouse[0].house)}</b> — ${c.byHouse[0].pct}% de tareas movidas.`);
  if (!insights.length) insights.push('Todavía no hay desviación: las tareas están en su día planeado (baseline). A medida que se muevan, acá vas a ver qué etapas/crews/casas se atrasan más.');
  insights.push('Estos agregados quedan disponibles para que el Estimador calibre sus días/etapa (aprendizaje).');

  const tbl = (rows, label) => `<table><thead><tr><th>${label}</th><th>Tareas</th><th>Atraso prom.</th><th>% movidas</th></tr></thead><tbody>${rows.length ? rows.slice(0, 12).map(r => `<tr><td><b>${esc(r.key || r.house)}</b></td><td>${r.n}</td><td class="${r.avg > 0 ? 'dv-neg' : 'dv-pos'}">${r.avg > 0 ? '+' : ''}${r.avg.toFixed(1)}d</td><td>${r.pct}%</td></tr>`).join('') : '<tr><td colspan="4" style="color:var(--dmut);padding:14px">Sin datos</td></tr>'}</tbody></table>`;

  const html = `<div id="wp-dev">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <div style="font-size:12px;color:var(--dmut)">Plan inicial (baseline) vs Real — leído de <b>Airtable/Planner en vivo</b>.</div>
      <div style="display:flex;gap:8px;align-items:center">
        <select onchange="wpDevSetHouse(this.value)" style="font-size:12px;padding:7px 10px;border-radius:9px;border:1px solid var(--dbord);background:var(--dglass);color:var(--dink)">${houseOpts}</select>
        <button class="dv-back" onclick="wpBackToPlanner()">← Volver al Planner</button>
      </div>
    </div>
    <div class="dv-kpis">
      <div class="dv-card"><div class="dv-lab">Días de más (este mes)</div><div class="dv-big ${c.diasMesMas > 0 ? 'dv-neg' : 'dv-pos'}">${c.diasMesMas}</div><div class="dv-meta">suma de atrasos por reprogramación</div></div>
      <div class="dv-card"><div class="dv-lab">Tareas movidas</div><div class="dv-big">${c.tareasMovidas}</div><div class="dv-meta">de ${c.withSlip.length} con baseline</div></div>
      <div class="dv-card"><div class="dv-lab">Atraso promedio</div><div class="dv-big ${c.avgSlip > 0 ? 'dv-neg' : 'dv-pos'}">${c.avgSlip > 0 ? '+' : ''}${c.avgSlip.toFixed(1)}d</div><div class="dv-meta">plan → real por tarea</div></div>
      <div class="dv-card"><div class="dv-lab">A tiempo</div><div class="dv-big ${c.onTimePct >= 80 ? 'dv-pos' : c.onTimePct >= 60 ? 'dv-amb' : 'dv-neg'}">${c.onTimePct}%</div><div class="dv-meta">tareas en su día planeado</div></div>
    </div>
    <div class="dv-sec"><h3>📊 Plan inicial vs Real — por casa</h3>
      <div style="display:flex;gap:14px;font-size:10px;color:var(--dmut);margin-bottom:10px"><span><span style="display:inline-block;width:10px;height:8px;background:rgba(47,110,240,.5);border-radius:3px"></span> Plan</span><span><span style="display:inline-block;width:10px;height:8px;background:linear-gradient(90deg,#c07d16,#e0455f);border-radius:3px"></span> Real</span></div>
      ${c.byHouse.length ? c.byHouse.map(h => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><b>${esc(h.house)}</b><span>${slipChip(Math.round(h.avg))} · ${h.pct}% movidas · plan ${fmt(h.planMin)}–${fmt(h.planMax)} → real ${fmt(h.realMin)}–${fmt(h.realMax)}</span></div><div class="dv-track"><div class="dv-bar plan" style="left:${pos(h.planMin)}%;width:${Math.max(2, pos(h.planMax) - pos(h.planMin))}%"></div><div class="dv-bar real" style="left:${pos(h.realMin)}%;width:${Math.max(2, pos(h.realMax) - pos(h.realMin))}%"></div></div></div>`).join('') : '<div style="color:var(--dmut);padding:10px">Sin casas con baseline.</div>'}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="dv-sec"><h3>🧱 Desviación por etapa</h3>${tbl(c.byStage, 'Etapa')}</div>
      <div class="dv-sec"><h3>🏠 Desviación por casa</h3>${tbl(c.byHouse.map(h => ({ ...h, key: h.house })), 'Casa')}</div>
    </div>
    <div class="dv-sec dv-brain"><h3>🧠 Cerebro de planeación</h3>${insights.map(i => `<div class="dv-ins"><span style="color:var(--dblue)">●</span><div>${i}</div></div>`).join('')}</div>
  </div>`;
  openModal('📉 Plan inicial vs Real — Desviación', html);
  const inner = document.querySelector('#modal > div'); if (inner) { ['max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl'].forEach(x => inner.classList.remove(x)); inner.classList.add('max-w-6xl'); }
}
window.wpRenderDeviation = wpRenderDeviation;

// ─── BLOQUE 1.3: Pago por persona por propiedad (Crew × Hora — de Airtable Horas trabajadas/Cuadrillas) ───
function wpOpenCrewPay(casaNorm) {
  wpInjectTheme();
  const esc = s => String(s == null ? '' : s).replace(/[<>"]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => '$' + Math.round(+n || 0).toLocaleString('en-US');
  const pay = wpState.workerPay || [];
  const casas = [...new Set(pay.map(p => p.casa_norm))].map(cn => ({ cn, name: (pay.find(p => p.casa_norm === cn) || {}).casa || cn })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  if (!pay.length) { openModal('💵 Pago crew', '<div id="wp-dev"><div class="dv-sec" style="text-align:center;color:var(--dmut);padding:30px">Sin datos de pago todavía. Corré el sync de trabajadores (Airtable → Supabase).</div></div>'); return; }
  if (!casaNorm) {
    const hf = wpState.houseFilter;
    if (hf && hf !== 'all') {
      const proj = (wpState.projects || []).find(p => p.id === hf);
      const nm = proj ? proj.name : (hf.startsWith('name:') ? hf.slice(5) : '');
      const n = String(nm).toLowerCase().replace(/[^a-z0-9]/g, '');
      const hit = casas.find(c => c.cn && (n.includes(c.cn) || c.cn.includes(n.slice(0, 6))));
      casaNorm = hit && hit.cn;
    }
    casaNorm = casaNorm || (casas[0] && casas[0].cn);
  }
  const rows = pay.filter(p => p.casa_norm === casaNorm).sort((a, b) => (+b.pago || 0) - (+a.pago || 0));
  const totalPago = rows.reduce((s, r) => s + (+r.pago || 0), 0);
  const totalHoras = rows.reduce((s, r) => s + (+r.horas || 0), 0);
  const avgH = totalHoras ? totalPago / totalHoras : 0;
  const casaName = (casas.find(c => c.cn === casaNorm) || {}).name || '—';
  const html = `<div id="wp-dev">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <div style="font-size:12px;color:var(--dmut)">Cuánto gana cada persona en la obra (horas y total). Fuente: <b>Airtable — Horas trabajadas / Cuadrillas</b>.</div>
      <select onchange="wpOpenCrewPay(this.value)" style="font-size:12px;padding:7px 10px;border-radius:9px;border:1px solid var(--dbord);background:var(--dglass);color:var(--dink)">${casas.map(c => `<option value="${esc(c.cn)}" ${c.cn === casaNorm ? 'selected' : ''}>🏠 ${esc(c.name)}</option>`).join('')}</select>
    </div>
    <div class="dv-kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="dv-card"><div class="dv-lab">Pago total (obra)</div><div class="dv-big">${money(totalPago)}</div><div class="dv-meta">${rows.length} persona(s)</div></div>
      <div class="dv-card"><div class="dv-lab">Horas totales</div><div class="dv-big">${Math.round(totalHoras).toLocaleString('en-US')}</div><div class="dv-meta">acumuladas</div></div>
      <div class="dv-card"><div class="dv-lab">$/hora promedio</div><div class="dv-big">$${avgH.toFixed(1)}</div><div class="dv-meta">ponderado</div></div>
    </div>
    <div class="dv-sec"><h3>👷 Pago por persona — ${esc(casaName)}</h3>
      <table><thead><tr><th>Persona</th><th>Semanas</th><th>Horas</th><th>$/hora</th><th>Pago total</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${esc(r.worker)}</b></td><td>${r.semanas || '—'}</td><td>${(+r.horas || 0).toFixed(1)}</td><td>$${(+r.x_hora || 0).toFixed(1)}</td><td><b>${money(r.pago)}</b></td></tr>`).join('')}
      </tbody></table>
    </div>
    <div style="margin-top:12px"><button class="dv-back" onclick="wpBackToPlanner()">← Volver al Planner</button></div>
  </div>`;
  openModal(`💵 Pago crew — ${casaName}`, html);
  const inner = document.querySelector('#modal > div'); if (inner) { ['max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl'].forEach(x => inner.classList.remove(x)); inner.classList.add('max-w-4xl'); }
}
window.wpOpenCrewPay = wpOpenCrewPay;
