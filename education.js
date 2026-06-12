// ============================================================
// EDUCACIÓN — Gestor de Mentorías (Flipping Rentals / Rental Profits)
// ============================================================

const eduState = {
  sys: null,
  mentorshipId: 'flipping-rentals',  // mentoría activa
  tab: 'students',                    // students | plan | progress | resources | calls | config
  mentorships: [],
  students: [],
  resources: [],
  alerts: [],
  calls: [],
  selectedStudentId: null,
  searchQuery: '',
  stageFilter: 'all',
  statusFilter: 'all',
  loading: false,
  studentPlan: null,        // plan activo del estudiante seleccionado
  studentPlanTasks: []      // tareas marcables del plan
};

const EDU_TABS = [
  { key: 'dashboard',    label: '📊 Dashboard' },
  { key: 'students',     label: '👥 Estudiantes' },
  { key: 'student_plan', label: '🎯 Plan Acción' },
  { key: 'tasks',        label: '✅ Tareas' },
  { key: 'cohorts',      label: '👨‍👩‍👧‍👦 Cohortes' },
  { key: 'alerts',       label: '🚨 Alertas' },
  { key: 'progress',     label: '📈 Progreso' },
  { key: 'resources',    label: '📑 Recursos' },
  { key: 'calls',        label: '📅 Calendario' },
  { key: 'config',       label: '⚙️ Config' }
];
// NOTA: Presentaciones e Informes son sistemas INDEPENDIENTES ahora
// (openEduPresentationsSystem y openEduReportsSystem abren modales propios)

async function openEduManager(sys) {
  eduState.sys = sys;
  // CRÍTICO: reset del tab a uno válido del Manager (no quedar en marker de otro sistema)
  if (!EDU_TABS.find(t => t.key === eduState.tab)) {
    eduState.tab = 'dashboard';
  }
  openModal(`🎓 ${sys.name}`, '<div id="edu-root">Cargando...</div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  await eduLoadAll();
  eduRender();
}

async function eduLoadAll() {
  eduState.loading = true;
  // Cada query con catch + TIMEOUT por query (8s max). Si una query cuelga
  // (sesión expirada con refresh token vencido, RLS bloqueando, red caída),
  // Promise.all NUNCA resolvía y el modal de Informes quedaba en "Cargando...".
  const TIMEOUT_MS = 8000;
  const withTimeout = (p, label) => Promise.race([
    p.then(r => r).catch(e => { console.warn('[eduLoadAll]', label, e?.message || e); return { data: null }; }),
    new Promise(resolve => setTimeout(() => {
      console.warn(`[eduLoadAll] TIMEOUT (${TIMEOUT_MS/1000}s) en ${label} — probablemente sesión expirada`);
      resolve({ data: null });
    }, TIMEOUT_MS))
  ]);
  try {
    const [mRes, sRes, rRes, aRes, cRes, repRes, tRes, presRes, motRes] = await Promise.all([
      withTimeout(sb.from('edu_mentorships').select('*').order('position'), 'mentorships'),
      withTimeout(sb.from('edu_students').select('*').order('updated_at', { ascending: false }), 'students'),
      withTimeout(sb.from('edu_resources').select('*').order('updated_at', { ascending: false }), 'resources'),
      withTimeout(sb.from('edu_alerts').select('*').is('resolved_at', null).order('triggered_at', { ascending: false }), 'alerts'),
      withTimeout(sb.from('edu_student_calls').select('*').order('scheduled_at', { ascending: false }).limit(500), 'calls'),
      withTimeout(sb.from('edu_reports').select('*').order('period_start', { ascending: false }).limit(50), 'reports'),
      withTimeout(sb.from('edu_student_tasks').select('*').order('created_at', { ascending: false }).limit(500), 'tasks'),
      withTimeout(sb.from('edu_presentations').select('*').order('updated_at', { ascending: false }).limit(50), 'presentations'),
      withTimeout(sb.from('edu_call_motivos').select('*').eq('active', true).order('orden'), 'callMotivos')
    ]);
    eduState.mentorships = mRes.data || [];
    eduState.students = sRes.data || [];
    eduState.resources = rRes.data || [];
    eduState.alerts = aRes.data || [];
    eduState.calls = cRes.data || [];
    eduState.reports = repRes.data || [];
    eduState.tasks = tRes.data || [];
    eduState.presentations = presRes.data || [];
    eduState.callMotivos = motRes.data || [];
  } catch (e) {
    console.error('eduLoadAll', e);
  }
  eduState.loading = false;
}

function eduCurrentMentorship() {
  return eduState.mentorships.find(m => m.id === eduState.mentorshipId);
}
function eduMyStudents() {
  return eduState.students.filter(s => s.mentorship_id === eduState.mentorshipId);
}
function eduMyResources() {
  return eduState.resources.filter(r => r.mentorship_id === eduState.mentorshipId);
}
function eduMyAlerts() {
  const ids = new Set(eduMyStudents().map(s => s.id));
  return eduState.alerts.filter(a => ids.has(a.student_id));
}
function eduSetMentorship(id) {
  eduState.mentorshipId = id;
  // Preservar selectedStudentId SI el estudiante existe en la nueva mentoría
  if (eduState.selectedStudentId) {
    const s = eduState.students.find(x => x.id === eduState.selectedStudentId);
    if (!s || s.mentorship_id !== id) eduState.selectedStudentId = null;
  }
  eduRender();
}
function eduSetTab(t) { eduState.tab = t; eduRender(); }
function eduStageObj(stageKey) {
  const m = eduCurrentMentorship();
  return (m?.stages || []).find(s => s.key === stageKey);
}
function eduStageIdx(stageKey) {
  const m = eduCurrentMentorship();
  return (m?.stages || []).findIndex(s => s.key === stageKey);
}
function eduDaysToExpiry(s) {
  if (!s.expires_at) return null;
  return Math.floor((new Date(s.expires_at) - Date.now()) / 86400000);
}
function eduDaysInStage(s) {
  if (!s.stage_started_at) return null;
  return Math.floor((Date.now() - new Date(s.stage_started_at)) / 86400000);
}
function eduIsStageOverdue(s) {
  const stage = eduStageObj(s.current_stage);
  if (!stage || !stage.target_weeks) return false;
  const days = eduDaysInStage(s);
  return days != null && days > stage.target_weeks * 7;
}

// ─── RENDER PRINCIPAL ───
function eduRender() {
  const root = document.getElementById('edu-root');
  if (!root) return;
  if (eduState.loading) { root.innerHTML = '<div class="text-center py-12 text-slate-400">⏳ Cargando...</div>'; return; }
  if (eduState.mentorships.length === 0) {
    root.innerHTML = `
      <div class="text-center py-12">
        <div class="text-5xl mb-3">📭</div>
        <div class="font-bold text-slate-700">Sin mentorías configuradas</div>
        <div class="text-xs text-slate-500 mt-2">Falta correr el SQL <code>education-schema.sql</code> en Supabase.</div>
      </div>`;
    return;
  }

  const cur = eduCurrentMentorship();
  const myStudents = eduMyStudents();
  const myAlerts = eduMyAlerts();

  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[84vh]">
      <!-- Selector de mentoría -->
      <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 flex-wrap">
        <span class="text-[10px] font-bold uppercase text-slate-500 mr-1">Mentoría:</span>
        ${eduState.mentorships.map(m => `
          <button onclick="eduSetMentorship('${m.id}')" class="px-3 py-1.5 rounded-lg text-xs font-bold ${eduState.mentorshipId===m.id ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 hover:bg-slate-200'}">
            ${m.icon} ${m.name}
          </button>
        `).join('')}
        <div class="ml-auto flex items-center gap-2 text-[10px] text-slate-500">
          ${cur?.airtable_base_id ? `<span>🔗 Airtable: <code class="bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">${cur.airtable_base_id}</code></span>` : '<span class="text-amber-700">⚠️ Airtable no configurado</span>'}
          <button onclick="eduOpenCeoMobile()" class="bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded font-bold" title="Vista CEO en formato celular">📱 CEO</button>
          <button onclick="eduRunMentorAIAnalysis()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded font-bold" title="Análisis IA del rendimiento del mentor">🤖 IA</button>
          <button onclick="eduTriggerSync()" class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold">🔄 Sync</button>
          <button onclick="eduDebugDB()" class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold" title="Ver qué hay en la DB">🔍 Debug DB</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex items-center gap-1 mb-3 pb-2 border-b border-slate-200 overflow-x-auto">
        ${EDU_TABS.map(t => {
          let badge = '';
          if (t.key === 'students') badge = myStudents.length;
          if (t.key === 'alerts')   badge = myAlerts.length;
          if (t.key === 'resources') badge = eduMyResources().length;
          return `
            <button onclick="eduSetTab('${t.key}')" class="px-2.5 py-1.5 rounded text-xs font-bold whitespace-nowrap flex-shrink-0 ${eduState.tab===t.key?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200'}">
              ${t.label}${badge?` <span class="bg-${eduState.tab===t.key?'white text-slate-900':'slate-900 text-white'} text-[9px] px-1 rounded ml-1">${badge}</span>`:''}
            </button>
          `;
        }).join('')}
      </div>

      <!-- BODY -->
      <div class="flex-1 overflow-y-auto">
        ${eduState.tab === 'dashboard' ? eduRenderDashboard() :
          eduState.tab === 'students' ? eduRenderStudents() :
          eduState.tab === 'student_plan' ? eduRenderStudentPlan() :
          eduState.tab === 'tasks' ? eduRenderTasksOverview() :
          eduState.tab === 'cohorts' ? eduRenderCohorts() :
          eduState.tab === 'progress' ? eduRenderProgressFunnel() :
          eduState.tab === 'resources' ? eduRenderResourcesIntegrated() :
          eduState.tab === 'calls' ? eduRenderCallsEnhanced() :
          eduState.tab === 'alerts' ? eduRenderAlerts() :
          eduRenderConfig()}
      </div>
    </div>
  `;
}

// ─── TAB: ESTUDIANTES (con buscador inteligente lenguaje natural) ───
function eduRenderStudents() {
  const students = eduMyStudents();
  const m = eduCurrentMentorship();
  const search = (eduState.searchQuery||'');

  // Buscador inteligente: parser de lenguaje natural
  let filtered = eduAplicarBusquedaInteligente(students, search);
  // Filtros legacy (dropdown) si están seteados
  if (eduState.stageFilter && eduState.stageFilter !== 'all') filtered = filtered.filter(s => s.current_stage === eduState.stageFilter);
  if (eduState.statusFilter && eduState.statusFilter !== 'all') filtered = filtered.filter(s => s.status === eduState.statusFilter);

  // KPIs
  const total = students.length;
  const active = students.filter(s => s.status === 'active').length;
  const atRisk = students.filter(s => s.status === 'at_risk').length;
  const graduated = students.filter(s => s.status === 'graduated').length;
  const expiringSoon = students.filter(s => {
    const d = eduDaysToExpiry(s);
    return d != null && d >= 0 && d <= 30;
  }).length;
  const overdue = students.filter(s => eduIsStageOverdue(s)).length;

  // Análisis
  const insights = [];
  if (total === 0) insights.push(`📭 Sin estudiantes en ${m?.name}. Configurá Airtable + Sync, o agregá manual.`);
  else {
    if (expiringSoon > 0) insights.push(`⏰ <strong>${expiringSoon}</strong> estudiante${expiringSoon>1?'s':''} con mentoría que vence en ≤30 días. Pasar a comercial.`);
    if (atRisk > 0) insights.push(`⚠️ <strong>${atRisk}</strong> en estado at_risk. Revisar progreso individual.`);
    if (overdue > 0) insights.push(`🐢 <strong>${overdue}</strong> estudiante${overdue>1?'s':''} llevan más tiempo del target en su etapa actual. Posible 1-on-1.`);
  }

  return `
    <div class="space-y-3">
      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div class="bg-slate-900 text-white rounded-xl p-3"><div class="text-[10px] text-slate-400 uppercase font-bold">Total</div><div class="text-3xl font-bold">${total}</div></div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><div class="text-[10px] text-emerald-700 uppercase font-bold">Activos</div><div class="text-3xl font-bold text-emerald-900">${active}</div></div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3"><div class="text-[10px] text-amber-700 uppercase font-bold">At risk</div><div class="text-3xl font-bold text-amber-900">${atRisk}</div></div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3"><div class="text-[10px] text-blue-700 uppercase font-bold">Graduados</div><div class="text-3xl font-bold text-blue-900">${graduated}</div></div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3"><div class="text-[10px] text-red-700 uppercase font-bold">Vence ≤30d</div><div class="text-3xl font-bold text-red-900">${expiringSoon}</div></div>
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-3"><div class="text-[10px] text-violet-700 uppercase font-bold">Etapa lenta</div><div class="text-3xl font-bold text-violet-900">${overdue}</div></div>
      </div>

      ${insights.length ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-amber-900 mb-2">🤖 Análisis</div>
          <ul class="space-y-1 text-xs text-slate-700">${insights.map(i => `<li>• ${i}</li>`).join('')}</ul>
        </div>
      ` : ''}

      <!-- Filtros -->
      <div class="flex items-center gap-2 flex-wrap">
        <div class="flex-1 min-w-[260px] relative">
          <input type="text" placeholder="🔍 Ej: 'inactivos en etapa Crédito' / 'pago vencido privada' / 'estancados sin contacto'" value="${(eduState.searchQuery||'').replace(/"/g,'&quot;')}" oninput="eduState.searchQuery=this.value; eduRender()" class="border border-slate-300 rounded px-2 py-1.5 text-xs w-full" />
          ${eduState.searchQuery ? `<div class="absolute -bottom-4 left-0 text-[10px] text-slate-500">🤖 Detecté: ${eduDescribirFiltros(eduState.searchQuery)}</div>` : ''}
        </div>
        <select onchange="eduState.stageFilter=this.value; eduRender()" class="border border-slate-300 rounded px-2 py-1 text-xs">
          <option value="all" ${eduState.stageFilter==='all'?'selected':''}>Todas las etapas</option>
          ${(m?.stages || []).map(s => `<option value="${s.key}" ${eduState.stageFilter===s.key?'selected':''}>${s.name}</option>`).join('')}
        </select>
        <select onchange="eduState.statusFilter=this.value; eduRender()" class="border border-slate-300 rounded px-2 py-1 text-xs">
          <option value="all" ${eduState.statusFilter==='all'?'selected':''}>Todos los status</option>
          ${['active','at_risk','paused','graduated','dropped'].map(st => `<option value="${st}" ${eduState.statusFilter===st?'selected':''}>${st}</option>`).join('')}
        </select>
        <button onclick="eduExportStudentsCSV()" class="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-bold px-3 py-1 rounded" title="Descargar CSV con los filtros actuales">📥 CSV</button>
        <button onclick="eduAddStudent()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1 rounded">+ Estudiante manual</button>
        <div class="text-[10px] text-slate-500">${filtered.length} de ${students.length}</div>
      </div>

      <!-- Lista CRM simplificada: Nombre / Etapa / Fecha mod etapa / Fecha entrada / Activo / Pago -->
      ${filtered.length === 0 ? `<div class="text-center py-12 text-slate-400 text-xs">Sin estudiantes con esos filtros.</div>` : `
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr class="text-[10px] uppercase text-slate-600">
                <th class="text-left p-2">Nombre</th>
                <th class="text-left p-2">Etapa actual</th>
                <th class="text-left p-2">Última actualización</th>
                <th class="text-left p-2">Entrada mentoría</th>
                <th class="text-center p-2">Activo</th>
                <th class="text-left p-2">Pago</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => {
                const stage = eduStageObj(s.current_stage);
                const fmtDate = (d) => {
                  if (!d) return '—';
                  const date = new Date(d);
                  if (isNaN(date)) return '—';
                  return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
                };
                // "Última actualización" = ultima_fecha_seguimiento si existe, sino stage_started_at
                const ultimaFecha = s.ultima_fecha_seguimiento || s.stage_started_at;
                const activo = s.status === 'active' && s.payment_status !== 'expired' && s.payment_status !== 'cancelled';
                const pagoLbl = ({ active: '✓ Al día', past_due: '⚠️ Atrasado', expired: '🚫 Vencido', paused: '⏸ Pausado', cancelled: '❌ Cancelado' })[s.payment_status] || '—';
                const pagoCls = s.payment_status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                                s.payment_status === 'past_due' ? 'bg-amber-100 text-amber-800' :
                                s.payment_status === 'expired' || s.payment_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-slate-100 text-slate-700';
                return `<tr class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="eduShowStudentDetail('${s.id}')">
                  <td class="p-2">
                    <div class="font-semibold">${s.full_name||'—'}</div>
                    ${s.grupo ? `<div class="text-[10px] text-slate-500">${s.grupo}</div>` : ''}
                  </td>
                  <td class="p-2"><span class="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-medium">${stage?.name || s.current_stage || '—'}</span></td>
                  <td class="p-2 text-slate-700">${fmtDate(ultimaFecha)}</td>
                  <td class="p-2 text-slate-700">${fmtDate(s.enrolled_at)}</td>
                  <td class="p-2 text-center">${activo ? '<span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>' : '<span class="inline-block w-2.5 h-2.5 rounded-full bg-slate-300"></span>'}</td>
                  <td class="p-2"><span class="text-[10px] ${pagoCls} px-1.5 py-0.5 rounded font-bold">${pagoLbl}</span></td>
                  <td class="p-2">
                    <div class="flex gap-1 justify-end" onclick="event.stopPropagation()">
                      ${s.phone ? `<button onclick="eduOpenWhatsappQuick('${s.id}')" class="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded" title="WhatsApp rápido">💬</button>` : ''}
                      <span onclick="eduShowStudentDetail('${s.id}')" class="text-blue-600 text-[10px] hover:underline cursor-pointer">ver →</span>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ─── TAB: PLAN IA ───
function eduRenderPlan() {
  const m = eduCurrentMentorship();
  const aiKey = `edu-plan-${eduState.mentorshipId}-${eduState.selectedStudentId || 'none'}`;
  const ai = (window.aiState && window.aiState[aiKey]) || {};
  const student = eduState.students.find(s => s.id === eduState.selectedStudentId);

  if (!student) {
    return `<div class="text-center py-12 text-slate-500">
      <div class="text-5xl mb-3">🎯</div>
      <div class="font-bold">Generador de Plan IA</div>
      <div class="text-xs mt-2 max-w-md mx-auto">Seleccioná un estudiante en el tab Estudiantes (botón "ver detalle"), o eligí uno acá abajo:</div>
      <select onchange="eduState.selectedStudentId=this.value; eduRender()" class="mt-4 border border-slate-300 rounded px-3 py-2 text-sm">
        <option value="">— Seleccionar estudiante —</option>
        ${eduMyStudents().map(s => `<option value="${s.id}">${s.full_name} · ${eduStageObj(s.current_stage)?.name || s.current_stage || 'sin etapa'}</option>`).join('')}
      </select>
    </div>`;
  }

  const stage = eduStageObj(student.current_stage);
  const generatedPlan = ai.plan || null;

  return `
    <div class="space-y-3">
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3">
        <div class="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <div class="text-xs font-bold text-blue-900 uppercase">🎓 Estudiante seleccionado</div>
            <div class="text-lg font-bold mt-1">${student.full_name}</div>
            <div class="text-[11px] text-slate-600">
              Etapa: <strong>${stage?.name || student.current_stage || 'sin etapa'}</strong> · ${eduDaysInStage(student) || 0}d en etapa · GLScore <strong>${student.glscore||50}</strong>
            </div>
          </div>
          <button onclick="eduState.selectedStudentId=null; eduRender()" class="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded">Cambiar</button>
        </div>
      </div>

      <!-- Diagnóstico que el coach pasa para que IA genere el plan -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">📝 Diagnóstico de la sesión (input para IA)</div>
        <textarea id="edu-plan-diagnostic" rows="4" placeholder="Describe rápidamente qué hicieron en la última sesión, qué objetivos tiene el estudiante para las próximas 2 semanas, y dónde está atascado. Ej: 'Ya tiene buybox definido en Austin SE. Le falta análisis de 5 comps. Quiere cerrar primera oferta en 30d.'" class="w-full border border-slate-300 rounded px-3 py-2 text-xs">${student._lastDiagnostic||''}</textarea>
        <div class="flex justify-between items-center mt-2">
          <select id="edu-plan-horizon" class="border border-slate-300 rounded px-2 py-1 text-xs">
            <option value="1">Plan para 1 semana</option>
            <option value="2" selected>Plan para 2 semanas</option>
            <option value="4">Plan para 1 mes</option>
          </select>
          <button onclick="eduGeneratePlan()" class="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2 rounded">🤖 Generar plan con IA</button>
        </div>
      </div>

      ${ai.loading ? `<div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900 text-center"><span class="animate-pulse">🧠 Claude analizando el contexto y armando el plan...</span></div>` : ''}
      ${ai.error ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900">⚠️ ${ai.error}</div>` : ''}

      ${generatedPlan ? `
        <div class="bg-white border-2 border-violet-300 rounded-xl overflow-hidden">
          <div class="bg-violet-50 border-b border-violet-200 px-3 py-2 flex justify-between items-center">
            <div class="text-xs font-bold uppercase text-violet-900">🎯 Plan generado · listo para copiar y pegar al estudiante</div>
            <div class="flex gap-1">
              <button onclick="eduCopyPlan()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-2 py-1 rounded">📋 Copiar</button>
              <button onclick="eduSavePlan()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2 py-1 rounded">💾 Guardar como tareas</button>
            </div>
          </div>
          <div class="p-4" id="edu-plan-preview">
            <div class="prose prose-sm max-w-none">
              ${generatedPlan.message ? `<div class="bg-blue-50 border border-blue-200 rounded p-3 mb-3 text-xs whitespace-pre-wrap">${generatedPlan.message}</div>` : ''}
              <h3 class="text-sm font-bold text-slate-900 mt-3">🎯 Objetivo de las próximas ${ai.horizon || 2} semanas</h3>
              <p class="text-xs text-slate-700">${generatedPlan.objective || '—'}</p>
              <h3 class="text-sm font-bold text-slate-900 mt-3">📋 Tareas concretas</h3>
              <ol class="text-xs text-slate-700 space-y-1.5">
                ${(generatedPlan.tasks || []).map(t => `<li><strong>${t.title}</strong>${t.description ? '<br><span class="text-slate-500">'+t.description+'</span>' : ''}${t.due_date ? '<br><em class="text-blue-700">Due: '+t.due_date+'</em>' : ''}</li>`).join('')}
              </ol>
              ${(generatedPlan.resources || []).length ? `
                <h3 class="text-sm font-bold text-slate-900 mt-3">📚 Recursos recomendados</h3>
                <ul class="text-xs text-slate-700 space-y-1">
                  ${generatedPlan.resources.map(r => `<li>${r.title}${r.url ? ' · <a href="'+r.url+'" target="_blank" class="text-blue-600 underline">link</a>' : ''}</li>`).join('')}
                </ul>
              ` : ''}
              ${(generatedPlan.success_criteria || []).length ? `
                <h3 class="text-sm font-bold text-slate-900 mt-3">✅ Criterios de éxito</h3>
                <ul class="text-xs text-slate-700 space-y-1">${generatedPlan.success_criteria.map(s => `<li>• ${s}</li>`).join('')}</ul>
              ` : ''}
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

async function eduGeneratePlan() {
  const student = eduState.students.find(s => s.id === eduState.selectedStudentId);
  if (!student) return alert('Seleccioná un estudiante primero');
  const diagnostic = document.getElementById('edu-plan-diagnostic').value.trim();
  const horizon = +document.getElementById('edu-plan-horizon').value || 2;
  const m = eduCurrentMentorship();
  const stage = eduStageObj(student.current_stage);
  const aiKey = `edu-plan-${eduState.mentorshipId}-${student.id}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { loading: true, horizon };
  eduRender();
  try {
    const { data, error } = await sb.functions.invoke('ai-deep-analyze', {
      body: {
        system: 'edu-plan',
        context: {
          mentorship: m.name,
          mentorship_slug: m.id,
          stages: m.stages,
          current_stage: stage?.name || student.current_stage,
          stage_target_weeks: stage?.target_weeks,
          days_in_stage: eduDaysInStage(student),
          student: {
            name: student.full_name,
            enrolled_at: student.enrolled_at,
            expires_at: student.expires_at,
            glscore: student.glscore,
            goals: student.goals,
            notes: student.notes
          },
          coach_diagnostic: diagnostic,
          horizon_weeks: horizon
        },
        force: true
      }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    window.aiState[aiKey] = { loading: false, plan: data, horizon };
  } catch (e) {
    window.aiState[aiKey] = { loading: false, error: e.message || String(e) };
  }
  eduRender();
}

function eduCopyPlan() {
  const el = document.getElementById('edu-plan-preview');
  if (!el) return;
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    toast ? toast('Plan copiado al portapapeles', 'success') : alert('✓ Copiado');
  });
}

async function eduSavePlan() {
  const aiKey = `edu-plan-${eduState.mentorshipId}-${eduState.selectedStudentId}`;
  const plan = window.aiState[aiKey]?.plan;
  if (!plan?.tasks?.length) return alert('Sin tareas para guardar');
  const rows = plan.tasks.map(t => ({
    student_id: eduState.selectedStudentId,
    stage_key: eduState.students.find(s => s.id === eduState.selectedStudentId)?.current_stage,
    title: t.title,
    description: t.description || null,
    resources: plan.resources || [],
    generated_by: 'ai',
    due_date: t.due_date || null,
    status: 'pending'
  }));
  const { error } = await sb.from('edu_student_tasks').insert(rows);
  if (error) return alert('Error: ' + error.message);
  alert(`✓ ${rows.length} tareas guardadas en el plan del estudiante.`);
}

// ─── TAB: PROGRESO ───
function eduRenderProgress() {
  const students = eduMyStudents();
  // Distribución por etapa
  const m = eduCurrentMentorship();
  const byStage = {};
  (m?.stages || []).forEach(st => byStage[st.key] = 0);
  students.forEach(s => { if (s.current_stage) byStage[s.current_stage] = (byStage[s.current_stage]||0) + 1; });

  // Distribución GLScore
  const bands = { 'excelente':0, 'bueno':0, 'atención':0, 'crítico':0 };
  students.forEach(s => {
    const g = s.glscore || 50;
    if (g >= 80) bands.excelente++;
    else if (g >= 60) bands.bueno++;
    else if (g >= 40) bands['atención']++;
    else bands['crítico']++;
  });

  // CORRECCIÓN: si <30% de estudiantes tiene glscore real, no calcular promedio (era ruido puro).
  const withScore = students.filter(s => s.glscore != null && s.glscore > 0);
  const coverage = students.length ? withScore.length / students.length : 0;
  const avgScore = (coverage >= 0.3 && withScore.length)
    ? Math.round(withScore.reduce((acc,s) => acc + s.glscore, 0) / withScore.length)
    : null;
  const avgScoreDisplay = avgScore != null ? avgScore : '—';

  return `
    <div class="space-y-3">
      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-slate-900 text-white rounded-xl p-3"><div class="text-[10px] text-slate-400 uppercase font-bold">GLScore prom</div><div class="text-3xl font-bold">${avgScoreDisplay}</div>${avgScore==null?'<div class="text-[9px] text-slate-500 mt-0.5">cobertura <30%</div>':''}</div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><div class="text-[10px] text-emerald-700 uppercase font-bold">🏆 Excelente</div><div class="text-3xl font-bold text-emerald-900">${bands.excelente}</div><div class="text-[10px] text-emerald-700">≥80</div></div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3"><div class="text-[10px] text-blue-700 uppercase font-bold">✅ Bueno</div><div class="text-3xl font-bold text-blue-900">${bands.bueno}</div><div class="text-[10px] text-blue-700">60-79</div></div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3"><div class="text-[10px] text-amber-700 uppercase font-bold">⚠️ Atención</div><div class="text-3xl font-bold text-amber-900">${bands['atención']}</div><div class="text-[10px] text-amber-700">40-59</div></div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3"><div class="text-[10px] text-red-700 uppercase font-bold">🔴 Crítico</div><div class="text-3xl font-bold text-red-900">${bands['crítico']}</div><div class="text-[10px] text-red-700">&lt;40</div></div>
      </div>

      <!-- Distribución por etapa (funnel-style) -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">🎯 Distribución por etapa</div>
        <div class="p-3 space-y-1">
          ${(m?.stages || []).map(st => {
            const n = byStage[st.key] || 0;
            const pct = students.length ? Math.round(n/students.length*100) : 0;
            return `<div class="flex items-center gap-2 text-xs">
              <div class="w-40 truncate">${st.name}</div>
              <div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                <div class="bg-blue-500 h-4 rounded-full flex items-center px-2 text-white text-[10px] font-bold" style="width:${Math.max(pct,3)}%">${n>0?n:''}</div>
              </div>
              <div class="w-10 text-right text-[10px] text-slate-600">${pct}%</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Top performers + worst -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-white border border-emerald-200 rounded-xl overflow-hidden">
          <div class="bg-emerald-50 border-b border-emerald-200 px-3 py-2 text-xs font-bold uppercase text-emerald-900">🏆 Top 10 GLScore</div>
          <table class="w-full text-xs">
            <tbody>
              ${[...students].sort((a,b) => (b.glscore||0)-(a.glscore||0)).slice(0,10).map(s => `<tr class="border-t border-slate-100"><td class="p-2 font-semibold">${s.full_name}</td><td class="p-2 text-right font-bold text-emerald-700">${s.glscore||50}</td><td class="p-2 text-[10px] text-slate-500">${eduStageObj(s.current_stage)?.name||'—'}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="bg-white border border-red-200 rounded-xl overflow-hidden">
          <div class="bg-red-50 border-b border-red-200 px-3 py-2 text-xs font-bold uppercase text-red-900">🔴 Bottom 10 — necesitan atención</div>
          <table class="w-full text-xs">
            <tbody>
              ${[...students].sort((a,b) => (a.glscore||0)-(b.glscore||0)).slice(0,10).map(s => `<tr class="border-t border-slate-100"><td class="p-2 font-semibold">${s.full_name}</td><td class="p-2 text-right font-bold text-red-700">${s.glscore||50}</td><td class="p-2 text-[10px] text-slate-500">${eduStageObj(s.current_stage)?.name||'—'}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ─── TAB: RECURSOS ───
function eduRenderResources() {
  const resources = eduMyResources();
  const m = eduCurrentMentorship();
  const byStage = {};
  resources.forEach(r => { const k = r.stage_key || '__all__'; (byStage[k] = byStage[k] || []).push(r); });

  return `
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">Slides, docs, videos, templates. Organizados por etapa.</div>
        <button onclick="eduAddResource()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1 rounded">+ Recurso</button>
      </div>
      ${resources.length === 0 ? `<div class="text-center py-12 text-slate-400 text-xs">Sin recursos. Agregá slides, docs y links para que el plan IA los referencie automáticamente.</div>` : ''}

      ${(m?.stages || []).concat([{key:'__all__', name:'📌 General (todas las etapas)'}]).map(st => {
        const items = byStage[st.key] || [];
        if (items.length === 0 && st.key !== '__all__') return '';
        return `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">${st.name} ${items.length?`<span class="bg-slate-900 text-white text-[9px] px-1.5 rounded">${items.length}</span>`:''}</div>
            ${items.length === 0 ? '' : `
              <div class="divide-y divide-slate-100">
                ${items.map(r => `
                  <div class="p-2 flex justify-between items-center hover:bg-slate-50">
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-semibold">${r.type === 'slide'?'🎬':r.type==='video'?'📹':r.type==='doc'?'📄':r.type==='template'?'📋':r.type==='checklist'?'☑️':'🔗'} ${r.title}</div>
                      ${r.description ? `<div class="text-[10px] text-slate-500">${r.description}</div>` : ''}
                      ${r.tags?.length ? `<div class="flex gap-1 mt-1">${r.tags.map(t => `<span class="bg-slate-100 text-slate-700 text-[9px] px-1 rounded">${t}</span>`).join('')}</div>` : ''}
                    </div>
                    <div class="flex gap-1">
                      ${r.url ? `<a href="${r.url}" target="_blank" class="text-blue-600 text-[10px] hover:underline">abrir↗</a>` : ''}
                      <button onclick="eduDeleteResource('${r.id}')" class="text-red-500 hover:text-red-700 text-[10px]">🗑</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─── TAB: CALENDARIO / LLAMADAS ───
function eduRenderCalls() {
  const myStudents = eduMyStudents();
  const ids = new Set(myStudents.map(s => s.id));
  const calls = (eduState.calls || []).filter(c => ids.has(c.student_id));
  const upcoming = calls.filter(c => new Date(c.scheduled_at) > new Date()).slice(0, 20);
  const recent = calls.filter(c => new Date(c.scheduled_at) <= new Date()).slice(0, 20);

  const studentName = (id) => myStudents.find(s => s.id === id)?.full_name || '—';

  return `
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">Llamadas programadas y completadas. Próximamente: integración con Google Calendar.</div>
        <button onclick="eduAddCall()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1 rounded">+ Programar llamada</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-blue-50 border-b border-blue-200 px-3 py-2 text-xs font-bold uppercase text-blue-900">📅 Próximas (${upcoming.length})</div>
          ${upcoming.length === 0 ? '<div class="p-4 text-center text-xs text-slate-400">Sin llamadas programadas.</div>' : `
            <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              ${upcoming.map(c => `
                <div class="p-2 text-xs">
                  <div class="font-semibold">${studentName(c.student_id)}</div>
                  <div class="text-[10px] text-slate-500">${new Date(c.scheduled_at).toLocaleString('es-MX')} · ${c.duration_min}min · ${c.type}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">🕓 Recientes (${recent.length})</div>
          ${recent.length === 0 ? '<div class="p-4 text-center text-xs text-slate-400">Sin llamadas recientes.</div>' : `
            <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              ${recent.slice(0,15).map(c => `
                <div class="p-2 text-xs">
                  <div class="font-semibold">${studentName(c.student_id)} ${c.attended===false?'❌':c.attended===true?'✓':''}</div>
                  <div class="text-[10px] text-slate-500">${new Date(c.scheduled_at).toLocaleString('es-MX')} · ${c.type}</div>
                  ${c.notes_md ? `<div class="text-[10px] text-slate-600 mt-1 line-clamp-2">${c.notes_md}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

// ─── TAB: ALERTAS ───
function eduRenderAlerts() {
  // Usar versión avanzada (calculadas en runtime, no de DB)
  return eduRenderAlertsAvanzado();
}

function eduRenderAlertsLegacy() {
  const alerts = eduMyAlerts();
  const myStudents = eduMyStudents();
  const studentName = (id) => myStudents.find(s => s.id === id)?.full_name || '—';

  // Auto-generar alertas si no hay (computed from data)
  const computedAlerts = [];
  myStudents.forEach(s => {
    const daysExp = eduDaysToExpiry(s);
    if (daysExp != null && daysExp >= 0 && daysExp <= 30) {
      computedAlerts.push({ student_id: s.id, alert_type: 'expiring_soon', severity: daysExp <= 7 ? 'critical' : 'high', message: `Mentoría vence en ${daysExp} días`, detail: `Pasar a comercial para renovación.` });
    }
    if (daysExp != null && daysExp < 0) {
      computedAlerts.push({ student_id: s.id, alert_type: 'expired', severity: 'critical', message: `Mentoría VENCIDA hace ${Math.abs(daysExp)} días`, detail: `Decidir: renovar, graduar o terminar.` });
    }
    if (s.payment_status === 'past_due') {
      computedAlerts.push({ student_id: s.id, alert_type: 'payment_overdue', severity: 'high', message: 'Pago atrasado', detail: 'Coordinar con comercial.' });
    }
    if (eduIsStageOverdue(s)) {
      const stage = eduStageObj(s.current_stage);
      const days = eduDaysInStage(s);
      computedAlerts.push({ student_id: s.id, alert_type: 'stage_overdue', severity: 'normal', message: `${days}d en etapa "${stage?.name}" (target ${stage?.target_weeks*7}d)`, detail: '1-on-1 para desbloquear.' });
    }
    if (s.glscore != null && s.glscore < 40) {
      computedAlerts.push({ student_id: s.id, alert_type: 'low_glscore', severity: 'high', message: `GLScore crítico (${s.glscore})`, detail: 'Progreso lento. Intervenir.' });
    }
  });

  const all = [...alerts, ...computedAlerts];
  const grouped = { critical: [], high: [], normal: [], low: [] };
  all.forEach(a => { (grouped[a.severity] || grouped.normal).push(a); });

  return `
    <div class="space-y-3">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-red-600 text-white rounded-xl p-3"><div class="text-[10px] text-red-100 uppercase font-bold">Críticas</div><div class="text-3xl font-bold">${grouped.critical.length}</div></div>
        <div class="bg-amber-50 border border-amber-300 rounded-xl p-3"><div class="text-[10px] text-amber-700 uppercase font-bold">High</div><div class="text-3xl font-bold text-amber-900">${grouped.high.length}</div></div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3"><div class="text-[10px] text-blue-700 uppercase font-bold">Normal</div><div class="text-3xl font-bold text-blue-900">${grouped.normal.length}</div></div>
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3"><div class="text-[10px] text-slate-600 uppercase font-bold">Total</div><div class="text-3xl font-bold text-slate-700">${all.length}</div></div>
      </div>

      ${all.length === 0 ? `<div class="text-center py-12 text-emerald-700"><div class="text-5xl">✅</div><div class="font-bold mt-2">Sin alertas activas</div><div class="text-xs text-slate-500 mt-1">Todos los estudiantes están al día.</div></div>` :
        ['critical','high','normal','low'].map(sev => {
          const items = grouped[sev];
          if (items.length === 0) return '';
          const c = sev === 'critical' ? 'red' : sev === 'high' ? 'amber' : sev === 'normal' ? 'blue' : 'slate';
          return `
            <div class="bg-white border border-${c}-200 rounded-xl overflow-hidden">
              <div class="bg-${c}-50 border-b border-${c}-200 px-3 py-2 text-xs font-bold uppercase text-${c}-900">${sev} (${items.length})</div>
              <div class="divide-y divide-slate-100">
                ${items.map(a => `
                  <div class="p-2 text-xs flex justify-between items-start gap-2">
                    <div class="flex-1">
                      <div class="font-semibold">${studentName(a.student_id)}</div>
                      <div class="text-[11px]">${a.message}</div>
                      ${a.detail ? `<div class="text-[10px] text-slate-500 mt-0.5">${a.detail}</div>` : ''}
                    </div>
                    <button onclick="eduOpenStudent('${a.student_id}')" class="text-blue-600 text-[10px] hover:underline whitespace-nowrap">ver estudiante</button>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')
      }
    </div>
  `;
}

// ─── TAB: CONFIG ───
function eduRenderConfig() {
  const m = eduCurrentMentorship();
  if (!m) return '';
  return `
    <div class="space-y-3">
      <div class="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
        💡 <strong>Configurá esta mentoría</strong>: Airtable IDs para sync de estudiantes, etapas, weights del GLScore.
      </div>

      <!-- Airtable config -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">🔗 Airtable</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Base ID (ej. appXXX...)</label>
            <input id="edu-cfg-base" value="${m.airtable_base_id||''}" placeholder="appXXXXXXXX" class="w-full border border-slate-300 rounded px-2 py-1.5 font-mono text-[11px]" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Tabla de estudiantes (nombre)</label>
            <input id="edu-cfg-table" value="${m.airtable_students_table||''}" placeholder="Estudiantes" class="w-full border border-slate-300 rounded px-2 py-1.5 text-[11px]" />
          </div>
        </div>
        <div class="text-[10px] text-slate-500 mt-2">💡 El Airtable API key se guarda en Supabase Vault, no acá. Decime cuando estés listo y te indico cómo agregarlo.</div>
        <button onclick="eduSaveConfig()" class="mt-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded">💾 Guardar config</button>
      </div>

      <!-- Etapas -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">🎯 Etapas del programa</div>
        <div class="space-y-1">
          ${(m.stages || []).map((s, i) => `
            <div class="flex items-center gap-2 text-xs">
              <span class="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded">#${i+1}</span>
              <span class="flex-1 font-semibold">${s.name}</span>
              <span class="text-[10px] text-slate-500">target: ${s.target_weeks||0} sem</span>
              <code class="text-[9px] bg-slate-100 px-1 rounded text-slate-600">${s.key}</code>
            </div>
          `).join('')}
        </div>
        <div class="text-[10px] text-slate-500 mt-2 italic">Las etapas vienen con valores por defecto. Para editarlas se modifica el SQL.</div>
      </div>

      <!-- GLScore weights -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">📊 GLScore Weights (%)</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          ${Object.entries(m.glscore_weights || {}).map(([k,v]) => `
            <div>
              <label class="block text-[10px] font-bold text-slate-600 mb-1">${k.replace(/_/g,' ')}</label>
              <input type="number" min="0" max="100" value="${v}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs" disabled />
            </div>
          `).join('')}
        </div>
        <div class="text-[10px] text-slate-500 mt-2 italic">Configuración avanzada. Si querés cambiar los weights, decímelo.</div>
      </div>

      <!-- 🩺 Health check de schema -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-bold uppercase text-slate-700">🩺 Health check de base de datos</div>
          <button onclick="eduRunHealthCheck()" class="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-1.5 rounded">▶️ Ejecutar diagnóstico</button>
        </div>
        <div class="text-[10px] text-slate-500 mb-2">Valida que todas las tablas críticas existan en Supabase. Si falta alguna, te muestro el SQL exacto a correr.</div>
        <div id="edu-health-results" class="text-xs"></div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
// 🩺 Health check: valida tablas/columnas críticas de Educación
// ════════════════════════════════════════════════════════════
const EDU_CRITICAL_TABLES = [
  { table: 'edu_mentorships', critical: true, sql_file: 'sE1-education-area.sql' },
  { table: 'edu_students', critical: true, sql_file: 'sE1-education-area.sql' },
  { table: 'edu_resources', critical: true, sql_file: 'sE1-education-area.sql' },
  { table: 'edu_alerts', critical: true, sql_file: 'sE1-education-area.sql' },
  { table: 'edu_student_calls', critical: true, sql_file: 'sE1-education-area.sql' },
  { table: 'edu_reports', critical: false, sql_file: 'edu-reports-schema.sql' },
  { table: 'edu_student_tasks', critical: false, sql_file: 'sE1-education-area.sql' },
  { table: 'edu_presentations', critical: false, sql_file: 'sE2-load-content.sql' },
  { table: 'edu_call_motivos', critical: false, sql_file: 'edu-calls-enhanced-schema.sql' },
  { table: 'edu_student_plans', critical: false, sql_file: 'sE1-education-area.sql' },
  { table: 'edu_student_plan_tasks', critical: false, sql_file: 'sE1-education-area.sql' },
  { table: 'edu_kpi_tiempo_por_etapa', critical: false, sql_file: 'edu-kpis-views.sql', is_view: true },
  { table: 'edu_plan_por_estudiante', critical: false, sql_file: 'edu-plan-tracking-views.sql', is_view: true },
  { table: 'edu_whatsapp_campaigns', critical: false, sql_file: 'edu-whatsapp-campaigns-schema.sql' },
  { table: 'edu_certificates', critical: false, sql_file: 'edu-batch-fixes.sql' }
];

async function eduRunHealthCheck() {
  const container = document.getElementById('edu-health-results');
  if (!container) return;
  container.innerHTML = '<div class="text-slate-500">⏳ Chequeando ' + EDU_CRITICAL_TABLES.length + ' tablas/vistas...</div>';

  const results = [];
  for (const t of EDU_CRITICAL_TABLES) {
    try {
      // .select con head:true y limit 1 → mínimo overhead, devuelve error si tabla no existe
      const { error, count } = await sb.from(t.table).select('*', { head: true, count: 'exact' }).limit(1);
      if (error) {
        const missing = /does not exist|relation .* does not exist/i.test(error.message) ||
                       /Could not find the table/i.test(error.message) ||
                       error.code === '42P01';
        results.push({ ...t, ok: false, error: missing ? 'NO EXISTE' : error.message.slice(0, 60), count: null });
      } else {
        results.push({ ...t, ok: true, count });
      }
    } catch (e) {
      results.push({ ...t, ok: false, error: e.message.slice(0, 60), count: null });
    }
  }

  const okCount = results.filter(r => r.ok).length;
  const failCount = results.length - okCount;
  const criticalFails = results.filter(r => !r.ok && r.critical);

  const missingSqls = new Set(results.filter(r => !r.ok).map(r => r.sql_file).filter(Boolean));

  container.innerHTML = `
    <div class="grid grid-cols-3 gap-2 mb-2">
      <div class="bg-emerald-50 border border-emerald-200 rounded p-2 text-center">
        <div class="text-[9px] uppercase font-bold text-emerald-700">OK</div>
        <div class="text-lg font-bold text-emerald-900">${okCount}</div>
      </div>
      <div class="bg-red-50 border border-red-200 rounded p-2 text-center">
        <div class="text-[9px] uppercase font-bold text-red-700">Faltantes</div>
        <div class="text-lg font-bold text-red-900">${failCount}</div>
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded p-2 text-center">
        <div class="text-[9px] uppercase font-bold text-slate-600">Críticas</div>
        <div class="text-lg font-bold ${criticalFails.length>0?'text-red-700':'text-emerald-700'}">${criticalFails.length === 0 ? '✓' : criticalFails.length + ' falta'}</div>
      </div>
    </div>

    <div class="border border-slate-200 rounded overflow-hidden">
      <table class="w-full text-[11px]">
        <thead class="bg-slate-50">
          <tr class="border-b border-slate-200 text-[9px] uppercase font-bold text-slate-600">
            <th class="text-left p-1.5">Tabla / Vista</th>
            <th class="text-center p-1.5 w-12">Tipo</th>
            <th class="text-center p-1.5 w-16">Crítica</th>
            <th class="text-right p-1.5 w-16">Rows</th>
            <th class="text-left p-1.5 w-24">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => `
            <tr class="border-t border-slate-100 ${!r.ok && r.critical ? 'bg-red-50' : !r.ok ? 'bg-amber-50' : ''}">
              <td class="p-1.5 font-mono">${r.table}</td>
              <td class="p-1.5 text-center">${r.is_view ? '👁️' : '📋'}</td>
              <td class="p-1.5 text-center">${r.critical ? '🔴' : '○'}</td>
              <td class="p-1.5 text-right font-mono">${r.count ?? '—'}</td>
              <td class="p-1.5 ${r.ok?'text-emerald-700':'text-red-700'} font-bold">${r.ok ? '✓ OK' : '✗ ' + r.error}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${missingSqls.size > 0 ? `
      <div class="mt-3 bg-amber-50 border border-amber-300 rounded p-2">
        <div class="text-[10px] font-bold uppercase text-amber-900 mb-1">📋 SQLs a correr en Supabase</div>
        <div class="text-[10px] text-amber-800 mb-1.5">Encontré tablas faltantes. Corré estos archivos en orden desde el SQL Editor:</div>
        <ul class="space-y-0.5 text-[11px] font-mono">
          ${Array.from(missingSqls).map(s => `<li class="bg-white px-2 py-1 rounded border border-amber-200">📄 supabase/${s}</li>`).join('')}
        </ul>
      </div>
    ` : `
      <div class="mt-3 bg-emerald-50 border border-emerald-200 rounded p-2 text-[11px] text-emerald-900 text-center font-bold">
        ✅ Todas las tablas críticas existen. Sistema saludable.
      </div>
    `}
  `;
}

async function eduSaveConfig() {
  const m = eduCurrentMentorship();
  if (!m) return;
  const payload = {
    airtable_base_id: document.getElementById('edu-cfg-base').value.trim() || null,
    airtable_students_table: document.getElementById('edu-cfg-table').value.trim() || null
  };
  const { error } = await sb.from('edu_mentorships').update(payload).eq('id', m.id);
  if (error) return alert('Error: ' + error.message);
  alert('✓ Config guardada');
  await eduLoadAll();
  eduRender();
}

// ─── ACCIONES ───
async function eduOpenStudent(id) {
  eduState.selectedStudentId = id;
  eduState.tab = 'student_plan';
  eduRender();  // pinta loading
  await eduLoadStudentPlan(id);
  eduRender();
}

async function eduAddStudent() {
  const m = eduCurrentMentorship();
  const name = prompt(`Nombre completo del estudiante para ${m.name}:`);
  if (!name) return;
  const email = prompt('Email (opcional):', '');
  const stage = (m.stages?.[0]?.key) || null;
  const { error } = await sb.from('edu_students').insert({
    mentorship_id: m.id,
    full_name: name,
    email: email || null,
    enrolled_at: new Date().toISOString().split('T')[0],
    current_stage: stage,
    stage_started_at: new Date().toISOString().split('T')[0]
  });
  if (error) return alert('Error: ' + error.message);
  await eduLoadAll(); eduRender();
}

async function eduAddResource() {
  const m = eduCurrentMentorship();
  const title = prompt('Título del recurso:');
  if (!title) return;
  const type = prompt('Tipo (slide/doc/video/link/template/checklist):', 'slide') || 'slide';
  const url = prompt('URL (Drive/Notion/YouTube/etc.):', '') || null;
  const stageOpts = (m.stages || []).map(s => `${s.key} = ${s.name}`).join('\n');
  const stageKey = prompt(`Etapa (dejar vacío para "todas"):\n${stageOpts}`, '') || null;
  const { error } = await sb.from('edu_resources').insert({
    mentorship_id: m.id, title, type, url, stage_key: stageKey, created_by: state.user.id
  });
  if (error) return alert('Error: ' + error.message);
  await eduLoadAll(); eduRender();
}

async function eduDeleteResource(id) {
  if (!confirm('¿Eliminar recurso?')) return;
  await sb.from('edu_resources').delete().eq('id', id);
  await eduLoadAll(); eduRender();
}

async function eduAddCall() {
  const myStudents = eduMyStudents();
  if (!myStudents.length) return alert('Sin estudiantes en esta mentoría todavía');
  const opts = myStudents.map((s,i) => `${i+1}. ${s.full_name}`).join('\n');
  const idx = +prompt(`¿Con quién?\n${opts}\n\nNúmero:`, '1') - 1;
  const student = myStudents[idx];
  if (!student) return;
  const date = prompt('Fecha y hora (YYYY-MM-DD HH:MM):');
  if (!date) return;
  const duration = +prompt('Duración (minutos):', '60') || 60;
  const type = prompt('Tipo (mentoring/onboarding/followup/exit/group):', 'mentoring') || 'mentoring';
  const { error } = await sb.from('edu_student_calls').insert({
    student_id: student.id,
    scheduled_at: new Date(date).toISOString(),
    duration_min: duration,
    type
  });
  if (error) return alert('Error: ' + error.message);
  await eduLoadAll(); eduRender();
}

async function eduTriggerSync() {
  const m = eduCurrentMentorship();
  if (!m?.airtable_base_id) return alert('Configurá Airtable primero (tab Config)');
  if (!confirm(`Sincronizar estudiantes de ${m.name} desde Airtable?\n\nEsto trae/actualiza estudiantes del Base ${m.airtable_base_id}.`)) return;
  try {
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/sync-education-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await window.getAccessToken()}` },
      body: JSON.stringify({ mentorship_id: m.id })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'falló');

    // Diagnóstico detallado
    let msg = `✅ Sync ejecutado\n\n`;
    msg += `📥 De Airtable: ${r.fetched_from_airtable} records\n`;
    msg += `💾 Guardados en DB: ${r.synced}\n`;
    if (r.errors?.length) msg += `\n⚠️ Errores: ${r.errors.join('; ')}\n`;
    if (r.debug?.airtable_field_names?.length) {
      msg += `\n🔍 Columnas detectadas en Airtable (las primeras 12):\n${r.debug.airtable_field_names.slice(0,12).join(' · ')}\n`;
    }
    if (r.fetched_from_airtable === 0) {
      msg += `\n⚠️ Airtable devolvió 0 records. Verificá:\n• Que la tabla tenga registros\n• Que el table_id sea el correcto\n`;
    }
    if (r.debug?.sample_mapped_record) {
      const s = r.debug.sample_mapped_record;
      msg += `\n📋 Primer registro mapeado:\n• full_name: ${s.full_name}\n• email: ${s.email||'(vacío)'}\n• enrolled_at: ${s.enrolled_at||'(vacío)'}\n• current_stage: ${s.current_stage||'(vacío)'}\n`;
      if (s.full_name?.startsWith('Estudiante ')) {
        msg += `\n⚠️ No detectó el campo NOMBRE. Decime cómo se llama la columna en Airtable y la mapeo.`;
      }
    }
    alert(msg);
    console.log('[Edu Sync Debug]', r);
    await eduLoadAll(); eduRender();
  } catch (e) {
    alert('Error en sync: ' + e.message);
  }
}

// Botón "🔍 Debug DB" — muestra estado real de la DB
async function eduDebugDB() {
  const m = eduCurrentMentorship();
  if (!m) return;
  const { data, error, count } = await sb.from('edu_students')
    .select('id, full_name, email, current_stage, expires_at, status, airtable_record_id', { count: 'exact' })
    .eq('mentorship_id', m.id)
    .limit(5);
  if (error) return alert('Error consultando DB: ' + error.message);
  let msg = `📊 Estado en la DB Supabase\n\n`;
  msg += `Mentoría: ${m.name}\n`;
  msg += `Estudiantes guardados: ${count}\n\n`;
  if (count === 0) {
    msg += 'NO hay registros para esta mentoría.\n\nPosibles causas:\n• El sync nunca corrió correctamente\n• Falló el INSERT silenciosamente\n• El mentorship_id está mal seteado\n\nProbá:\n1. Click "🔄 Sync" otra vez\n2. Mirá si el alert de sync dice "synced > 0"';
  } else {
    msg += 'Primeros 5 estudiantes:\n';
    data.forEach((s, i) => {
      msg += `\n${i+1}. ${s.full_name}`;
      msg += `\n   email: ${s.email||'—'} | etapa: ${s.current_stage||'—'} | status: ${s.status}`;
      msg += `\n   airtable_id: ${s.airtable_record_id?.slice(0,15) || '—'}`;
    });
    msg += '\n\n✅ La DB tiene registros. Si el UI los muestra en 0, hard refresh.';
  }
  alert(msg);
}

// ============================================================

// ============================================================
// SISTEMA INDEPENDIENTE: INFORMES EJECUTIVOS
// ============================================================
async function openEduReportsSystem(sys) {
  eduState.sys = sys;
  openModal(`📈 ${sys.name}`, '<div id="edu-root"><div class="p-6 text-center"><div class="text-2xl animate-pulse">📊</div><div class="text-xs text-slate-500 mt-2">Cargando datos del informe...</div><div class="text-[10px] text-slate-400 mt-1">Si se queda colgado > 10s, refrescá la página (sesión puede haber expirado).</div></div></div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-6xl');
  try {
    await eduLoadAll();
    if (!eduState.mentorshipId && eduState.mentorships.length) {
      const firstActive = eduState.mentorships.find(m => m.active);
      if (firstActive) eduState.mentorshipId = firstActive.id;
    }
    eduState.tab = '__reports_only__';
    eduRenderReportsStandalone();
  } catch (err) {
    console.error('[openEduReportsSystem]', err);
    const root = document.getElementById('edu-root');
    if (root) {
      root.innerHTML = `
        <div class="p-6">
          <div class="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 class="font-bold text-red-900 mb-2">⚠️ No pude abrir el informe</h3>
            <pre class="text-xs text-red-700 bg-white p-3 rounded border whitespace-pre-wrap">${(window.esc||((s)=>s))(err?.message || String(err))}</pre>
            <div class="text-xs text-slate-600 mt-3">
              Posibles causas:
              <ul class="list-disc list-inside mt-1">
                <li>Sesión expirada — <strong>cerrá sesión y volvé a entrar.</strong></li>
                <li>Tablas SQL no existen — correr scripts en supabase/.</li>
                <li>Red caída.</li>
              </ul>
            </div>
            <button onclick="closeModal(); location.reload();" class="mt-3 w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 rounded">Refrescar página</button>
          </div>
        </div>
      `;
    }
  }
}

// Cache de KPIs cargados (se recarga al cambiar mentoría o mes)
let eduKpisCache = { key: null, data: null, loading: false };

async function eduLoadKPIs(mentorshipId, mesIso) {
  if (!mentorshipId) return null;
  const key = `${mentorshipId}|${mesIso}`;
  // BUG FIX CRÍTICO: si ya intentamos y falló, NO reintentar (causaba loop
  // infinito → 80K+ errors → bundle.f565...js:9635 spam → page crash).
  // Comparar por key sola (no por data), así un fallo también cachea.
  if (eduKpisCache.key === key) return eduKpisCache.data;
  if (eduKpisCache.loading) return null;
  eduKpisCache.loading = true;
  try {
    const mesPrev = (() => {
      const d = new Date(mesIso + 'T00:00:00'); d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0,10);
    })();
    const noErr = r => (r && r.data) || (Array.isArray(r) ? r : null);
    const arr = r => (r && r.data) || [];
    const [
      resumen, prevResumen, tiempoEtapa, conPlan, inactivos, avancePlan, primerDeal, noShows, motivos, renChurn,
      // V2 — informe profundo
      carteraStatus, carteraGrupo, carteraEtapa, carteraAntig,
      sesPorMotivo, distSesiones,
      churnsConMotivo, retencionCohort,
      topDeals, nps,
      tareasBloque, creditosDiag, coachesAct
    ] = await Promise.all([
      sb.from('edu_kpi_resumen_mensual').select('*').eq('mentorship_id', mentorshipId).eq('mes', mesIso).maybeSingle().catch(() => null),
      sb.from('edu_kpi_resumen_mensual').select('*').eq('mentorship_id', mentorshipId).eq('mes', mesPrev).maybeSingle().catch(() => null),
      sb.from('edu_kpi_tiempo_por_etapa').select('*').eq('mentorship_id', mentorshipId).catch(() => ({ data: [] })),
      sb.from('edu_kpi_estudiantes_con_plan').select('*').eq('mentorship_id', mentorshipId).maybeSingle().catch(() => null),
      sb.from('edu_kpi_inactivos_30d').select('*').eq('mentorship_id', mentorshipId).order('dias_inactivo', { ascending: false }).catch(() => ({ data: [] })),
      sb.from('edu_kpi_avance_plan').select('*').eq('mentorship_id', mentorshipId).maybeSingle().catch(() => null),
      sb.from('edu_kpi_primer_deal').select('*').eq('mentorship_id', mentorshipId).maybeSingle().catch(() => null),
      sb.from('edu_kpi_noshows_coach').select('*').eq('mentorship_id', mentorshipId).eq('mes', mesIso).catch(() => ({ data: [] })),
      sb.from('edu_kpi_motivos_no_asistencia').select('*').eq('mentorship_id', mentorshipId).eq('mes', mesIso).catch(() => ({ data: [] })),
      sb.from('edu_kpi_renovaciones_churn').select('*').eq('mentorship_id', mentorshipId).eq('mes', mesIso).maybeSingle().catch(() => null),
      // V2
      sb.from('edu_kpi_cartera_por_status').select('*').eq('mentorship_id', mentorshipId).maybeSingle().catch(() => null),
      sb.from('edu_kpi_cartera_por_grupo').select('*').eq('mentorship_id', mentorshipId).catch(() => ({ data: [] })),
      sb.from('edu_kpi_cartera_por_etapa').select('*').eq('mentorship_id', mentorshipId).catch(() => ({ data: [] })),
      sb.from('edu_kpi_cartera_por_antiguedad').select('*').eq('mentorship_id', mentorshipId).catch(() => ({ data: [] })),
      sb.from('edu_kpi_sesiones_por_motivo').select('*').eq('mentorship_id', mentorshipId).eq('mes', mesIso).catch(() => ({ data: [] })),
      sb.from('edu_kpi_distribucion_sesiones').select('*').eq('mentorship_id', mentorshipId).eq('mes', mesIso).maybeSingle().catch(() => null),
      sb.from('edu_kpi_churns_con_motivo').select('*').eq('mentorship_id', mentorshipId).eq('mes', mesIso).catch(() => ({ data: [] })),
      sb.from('edu_kpi_retencion_cohort').select('*').eq('mentorship_id', mentorshipId).order('cohort_mes', { ascending: false }).limit(6).catch(() => ({ data: [] })),
      sb.from('edu_kpi_top_deals').select('*').eq('mentorship_id', mentorshipId).limit(10).catch(() => ({ data: [] })),
      sb.from('edu_kpi_nps').select('*').eq('mentorship_id', mentorshipId).maybeSingle().catch(() => null),
      sb.from('edu_kpi_tareas_por_bloque').select('*').eq('mentorship_id', mentorshipId).catch(() => ({ data: [] })),
      sb.from('edu_kpi_creditos_diagnosticados').select('*').eq('mentorship_id', mentorshipId).catch(() => ({ data: [] })),
      sb.from('edu_kpi_coaches_actividad').select('*').eq('mentorship_id', mentorshipId).eq('mes', mesIso).catch(() => ({ data: [] }))
    ]);
    eduKpisCache = {
      key, loading: false,
      data: {
        resumen: noErr(resumen), prevResumen: noErr(prevResumen),
        tiempoEtapa: arr(tiempoEtapa), conPlan: noErr(conPlan),
        inactivos: arr(inactivos), avancePlan: noErr(avancePlan),
        primerDeal: noErr(primerDeal), noShows: arr(noShows),
        motivos: arr(motivos), renChurn: noErr(renChurn),
        // V2
        carteraStatus: noErr(carteraStatus),
        carteraGrupo: arr(carteraGrupo),
        carteraEtapa: arr(carteraEtapa),
        carteraAntig: arr(carteraAntig),
        sesPorMotivo: arr(sesPorMotivo),
        distSesiones: noErr(distSesiones),
        churnsConMotivo: arr(churnsConMotivo),
        retencionCohort: arr(retencionCohort),
        topDeals: arr(topDeals),
        nps: noErr(nps),
        tareasBloque: arr(tareasBloque),
        creditosDiag: arr(creditosDiag),
        coachesAct: arr(coachesAct)
      }
    };
    return eduKpisCache.data;
  } catch (e) {
    console.error('eduLoadKPIs', e);
    // BUG FIX: marcar key como "intentado" con data:null para que NO se
    // reintente cada render → loop infinito → 80K+ errors en consola.
    eduKpisCache = { key, loading: false, data: null };
    return null;
  }
}

function eduKpiDelta(now, prev) {
  if (now == null || prev == null) return null;
  const d = +now - +prev;
  if (d === 0) return { txt: '=', cls: 'text-slate-400' };
  if (d > 0) return { txt: '+'+d.toFixed(1).replace(/\.0$/,''), cls: 'text-emerald-700' };
  return { txt: d.toFixed(1).replace(/\.0$/,''), cls: 'text-red-700' };
}

function eduReportMesAnchor() {
  if (!eduState._reportMonth) {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0);
    eduState._reportMonth = d.toISOString().slice(0,10);
  }
  return eduState._reportMonth;
}
function eduReportNavMes(delta) {
  const a = new Date(eduReportMesAnchor() + 'T00:00:00');
  a.setMonth(a.getMonth() + delta); a.setDate(1);
  eduState._reportMonth = a.toISOString().slice(0,10);
  eduKpisCache = { key: null, data: null, loading: false };
  eduRenderReportsStandalone();
}

function eduRenderReportsStandalone() {
  const root = document.getElementById('edu-root');
  if (!root) return;
  try {
    return _eduRenderReportsStandaloneInner(root);
  } catch (err) {
    console.error('[eduRenderReportsStandalone]', err);
    root.innerHTML = `
      <div class="p-6">
        <div class="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 class="font-bold text-red-900 mb-2">⚠️ Error renderizando informe</h3>
          <pre class="text-xs text-red-700 bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap mt-2">${(window.esc||((s)=>s))(err?.message || String(err))}</pre>
          ${err?.stack ? `<details class="mt-2"><summary class="text-xs text-slate-600 cursor-pointer">Stack trace</summary><pre class="text-[10px] bg-white p-2 rounded mt-1 overflow-x-auto">${(window.esc||((s)=>s))(err.stack)}</pre></details>` : ''}
          <div class="text-xs text-slate-600 mt-3">
            Causas comunes:
            <ul class="list-disc list-inside mt-1 space-y-0.5">
              <li>SQL views no creadas: correr <code class="bg-white px-1 rounded">supabase/edu-kpis-views.sql</code> + <code class="bg-white px-1 rounded">edu-kpis-views-v2.sql</code></li>
              <li>Sin mentoría activa en DB.</li>
              <li>Sesión expirada — refrescá la página.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}

function _eduRenderReportsStandaloneInner(root) {
  const cur = eduCurrentMentorship();
  const reports = (eduState.reports || []).filter(r => r.mentorship_id === eduState.mentorshipId);
  const aiKey = `edu-report-${eduState.mentorshipId}-${eduState._reportPeriod || 'monthly'}`;
  const ai = (window.aiState && window.aiState[aiKey]) || {};

  const today = new Date();
  const period = eduState._reportPeriod || 'monthly';
  const periodDays = period === 'weekly' ? 7 : period === 'biweekly' ? 14 : 30;
  const periodStart = new Date(today); periodStart.setDate(periodStart.getDate() - periodDays);

  const mes = eduReportMesAnchor();
  const mesLabel = new Date(mes+'T00:00:00').toLocaleDateString('es', { month:'long', year:'numeric' });

  // Lanzar carga de KPIs (asincrónico).
  // BUG FIX: solo dispara load si la key NO está en cache (incluso si data=null
  // por fallo previo) — evita loop infinito de retries que crashea la página.
  let kpis = null;
  const wantedKey = `${eduState.mentorshipId}|${mes}`;
  if (cur && eduState.mentorshipId) {
    kpis = (eduKpisCache.key === wantedKey) ? eduKpisCache.data : null;
    if (eduKpisCache.key !== wantedKey && !eduKpisCache.loading) {
      eduLoadKPIs(eduState.mentorshipId, mes).then((result) => {
        // Re-render solo si efectivamente obtuvimos data Y la mentoría sigue siendo la actual
        if (result != null && `${eduState.mentorshipId}|${eduReportMesAnchor()}` === wantedKey) {
          eduRenderReportsStandalone();
        }
      });
    }
    // 🆕 Cargar dashboard CEO en paralelo (no bloquea el render principal)
    if (typeof eduRenderCeoSectionAsync === 'function') {
      setTimeout(() => eduRenderCeoSectionAsync(eduState.mentorshipId, 'edu-ceo-section'), 50);
    }
  }

  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[84vh]">
      <!-- Selector mentoría -->
      <div class="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 flex-wrap">
        <span class="text-[10px] font-bold uppercase text-slate-500 mr-1">Mentoría:</span>
        ${eduState.mentorships.filter(m => m.active).map(m => `
          <button onclick="eduState.mentorshipId='${m.id}'; eduRenderReportsStandalone()"
            class="px-3 py-1.5 rounded-lg text-xs font-bold ${eduState.mentorshipId===m.id?'bg-slate-900 text-white shadow':'bg-slate-100 hover:bg-slate-200'}">
            ${m.icon} ${m.name}
          </button>
        `).join('')}
        <div class="ml-auto text-[10px] text-slate-500">${cur ? cur.name : 'Sin mentoría'}</div>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3">

        <!-- KPIs dashboard (auto desde DB) -->
        <div class="bg-slate-900 text-white rounded-xl p-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div class="text-xs font-bold uppercase text-slate-400">📊 KPIs Postventa</div>
              <div class="flex items-center gap-2 mt-1">
                <button onclick="eduReportNavMes(-1)" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">←</button>
                <div class="text-xl font-bold capitalize">${mesLabel}</div>
                <button onclick="eduReportNavMes(1)" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">→</button>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="withLoading(this, eduGenerateReport)" class="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-1.5 rounded">🤖 Generar narrativa con IA</button>
              <button onclick="eduExportKpisCsv()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">📥 Export CSV</button>
            </div>
          </div>
          ${!cur ? `<div class="mt-3 text-amber-300 text-xs">Seleccioná una mentoría arriba.</div>` : ''}
          ${cur && !kpis ? `<div class="mt-3 text-slate-400 text-xs">⏳ Cargando KPIs del mes...</div>` : ''}
          ${cur && kpis ? eduRenderKpisDashboard(kpis) : ''}
        </div>

        <!-- 🆕 Dashboard CEO — vista ejecutiva (Health Score + OKRs + funnel + cuellos botella) -->
        <div id="edu-ceo-section"></div>

        ${cur && kpis ? eduRenderInformeProfundo(kpis) : ''}
        ${cur && kpis ? eduRenderKpiDetalles(kpis) : ''}

        ${(() => {
          const aiKey = `edu-report-profundo-${eduState.mentorshipId}`;
          const ai = (window.aiState && window.aiState[aiKey]) || {};
          if (ai.loading) return `<div class="bg-violet-50 border border-violet-200 rounded p-3 text-center text-violet-900 text-sm">🧠 IA generando narrativa ejecutiva...</div>`;
          if (ai.error) return `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900 whitespace-pre-wrap">⚠️ ${ai.error}</div>`;
          if (ai.narrativa) {
            const n = ai.narrativa;
            return `
              <div class="bg-white border-2 border-violet-300 rounded-xl overflow-hidden mt-4">
                <div class="bg-violet-50 px-4 py-3 border-b border-violet-200">
                  <h3 class="font-bold text-sm text-violet-900">📝 Narrativa ejecutiva (IA)</h3>
                </div>
                <div class="p-4 prose prose-sm max-w-none text-xs whitespace-pre-wrap">
                  ${(n.summary_md || JSON.stringify(n, null, 2)).replace(/##\s/g,'\n## ').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')}
                </div>
              </div>
            `;
          }
          return '';
        })()}

        <!-- Form de generación con IA (opcional, abajo) -->
        <details class="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 rounded-xl p-4">
          <summary class="cursor-pointer font-bold text-violet-900 text-xs uppercase">🤖 Generar narrativa ejecutiva con IA (opcional)</summary>
          <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-600 mb-1">Período</label>
              <select onchange="eduState._reportPeriod=this.value; eduRenderReportsStandalone()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                <option value="weekly" ${period==='weekly'?'selected':''}>📅 Semanal</option>
                <option value="biweekly" ${period==='biweekly'?'selected':''}>📆 Quincenal</option>
                <option value="monthly" ${period==='monthly'?'selected':''}>🗓 Mensual</option>
                <option value="quarterly" ${period==='quarterly'?'selected':''}>📊 Trimestral</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-600 mb-1">Desde</label>
              <input id="edu-rep-start" type="date" value="${periodStart.toISOString().split('T')[0]}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-600 mb-1">Hasta</label>
              <input id="edu-rep-end" type="date" value="${today.toISOString().split('T')[0]}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div class="mt-2">
            <label class="block text-[10px] font-bold text-slate-600 mb-1">📝 Notas de las clases grabadas (opcional)</label>
            <textarea id="edu-rep-classes" rows="3" placeholder="Pega un resumen de las clases del período: temas cubiertos, dudas frecuentes, casos discutidos." class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
          </div>
          <button onclick="withLoading(this, eduGenerateReport)" class="mt-3 w-full bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold py-2.5 rounded">🤖 Generar narrativa con IA</button>
          <div class="text-[10px] text-violet-700 mt-2 italic">Los KPIs ya están arriba (números reales del DB). La IA agrega narrativa, highlights y recomendaciones.</div>
        </details>

        ${ai.loading ? `<div class="bg-violet-50 border border-violet-200 rounded p-4 text-center"><div class="text-3xl animate-pulse">🧠</div><div class="mt-2 font-bold text-violet-900">Generando informe...</div></div>` : ''}
        ${ai.error ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900">⚠️ ${ai.error}</div>` : ''}

        ${ai.report ? `
          <div class="bg-white border-2 border-emerald-300 rounded-xl overflow-hidden">
            <div class="bg-emerald-50 border-b border-emerald-200 px-3 py-2 flex justify-between items-center">
              <div class="text-xs font-bold uppercase text-emerald-900">✅ Informe generado</div>
              <div class="flex gap-1">
                <button onclick="eduCopyReport()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded">📋 Copiar markdown</button>
                <button onclick="eduDownloadReport()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded">📥 .md</button>
              </div>
            </div>
            <div class="p-4 max-h-[55vh] overflow-y-auto">
              <h2 class="text-lg font-bold">${ai.report.title || 'Informe'}</h2>
              <!-- KPIs -->
              ${ai.report.kpis ? `
                <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                  ${Object.entries(ai.report.kpis).map(([k,v]) => `<div class="bg-blue-50 border border-blue-200 rounded p-2"><div class="text-[10px] text-blue-700 uppercase font-bold">${k.replace(/_/g,' ')}</div><div class="text-xl font-bold text-blue-900">${v}</div></div>`).join('')}
                </div>
              ` : ''}
              <!-- Summary md -->
              <div id="edu-rep-md" class="text-xs whitespace-pre-wrap mt-4 prose prose-sm max-w-none">${(ai.report.summary_md || '').replace(/##\s/g,'\n## ').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')}</div>
              <!-- Highlights -->
              ${(ai.report.highlights||[]).length ? `
                <div class="mt-4 pt-3 border-t border-slate-200">
                  <div class="text-xs font-bold uppercase mb-2">⭐ Highlights del período</div>
                  ${ai.report.highlights.map(h => `<div class="text-xs mb-1"><span class="bg-${h.type==='win'?'emerald':h.type==='risk'?'red':'amber'}-100 text-${h.type==='win'?'emerald':h.type==='risk'?'red':'amber'}-800 px-1.5 py-0.5 rounded font-bold text-[10px]">${h.type}</span> <strong>${h.student_name}</strong>: ${h.detail}</div>`).join('')}
                </div>
              ` : ''}
              <!-- Recommendations -->
              ${(ai.report.recommendations||[]).length ? `
                <div class="mt-4 pt-3 border-t border-slate-200">
                  <div class="text-xs font-bold uppercase mb-2">🎯 Acciones recomendadas</div>
                  <ul class="text-xs space-y-1.5">
                    ${ai.report.recommendations.map(r => `<li>• <strong>[${r.priority||'med'}]</strong> ${r.action} <span class="text-slate-500">(${r.owner||'?'}, en ${r.due_in_days||7}d)</span></li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Historial -->
        ${reports.length ? `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase">📚 Historial (${reports.length})</div>
            <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              ${reports.map(r => `
                <div class="p-2 flex justify-between items-center hover:bg-slate-50">
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold truncate">${r.title || r.period_type}</div>
                    <div class="text-[10px] text-slate-500">${r.period_type} · ${r.period_start} → ${r.period_end}</div>
                  </div>
                  <div class="flex gap-1 flex-shrink-0">
                    <button onclick="eduLoadReport('${r.id}')" class="text-blue-600 text-[10px] hover:underline">cargar</button>
                    <button onclick="eduDeleteReport('${r.id}')" class="text-red-500 text-[10px]">🗑</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

async function eduGenerateReport() {
  const cur = eduCurrentMentorship();
  if (!cur) return alert('Seleccioná una mentoría');
  const periodType = eduState._reportPeriod || 'weekly';
  const startDate = document.getElementById('edu-rep-start').value;
  const endDate = document.getElementById('edu-rep-end').value;
  const classesNotes = document.getElementById('edu-rep-classes').value;
  if (!startDate || !endDate) return alert('Seleccioná fechas');

  const aiKey = `edu-report-${eduState.mentorshipId}-${periodType}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { loading: true };
  eduRenderReportsStandalone();

  try {
    // Construir contexto operativo
    const myStudents = eduMyStudents();
    const start = new Date(startDate); const end = new Date(endDate);
    const newEnrolled = myStudents.filter(s => s.enrolled_at && new Date(s.enrolled_at) >= start && new Date(s.enrolled_at) <= end).length;
    const expiring = myStudents.filter(s => { const d = eduDaysToExpiry(s); return d != null && d >= 0 && d <= 30; }).length;
    const expired = myStudents.filter(s => { const d = eduDaysToExpiry(s); return d != null && d < 0; }).length;
    const byStage = {}; myStudents.forEach(s => { if (s.current_stage) byStage[s.current_stage] = (byStage[s.current_stage]||0)+1; });
    const avgScore = myStudents.length ? Math.round(myStudents.reduce((a,s) => a+(s.glscore||50),0)/myStudents.length) : 0;
    const bands = { excelente:0, bueno:0, atencion:0, critico:0 };
    myStudents.forEach(s => { const g=s.glscore||50; if(g>=80)bands.excelente++; else if(g>=60)bands.bueno++; else if(g>=40)bands.atencion++; else bands.critico++; });
    const topStudents = [...myStudents].sort((a,b)=>(b.glscore||0)-(a.glscore||0)).slice(0,5).map(s => ({name:s.full_name, stage:eduStageObj(s.current_stage)?.name, glscore:s.glscore}));
    const atRisk = myStudents.filter(s => s.status === 'at_risk' || (s.glscore && s.glscore < 40) || (eduDaysToExpiry(s) || 999) < 30).slice(0,8).map(s => ({name:s.full_name, glscore:s.glscore, days_to_expiry:eduDaysToExpiry(s), stage:eduStageObj(s.current_stage)?.name}));

    const { data, error } = await sb.functions.invoke('ai-deep-analyze', {
      body: {
        system: 'edu-report',
        context: {
          mentorship: cur.name,
          mentorship_slug: cur.id,
          period_type: periodType,
          period_start: startDate,
          period_end: endDate,
          snapshot: {
            total_students: myStudents.length,
            active: myStudents.filter(s=>s.status==='active').length,
            at_risk: myStudents.filter(s=>s.status==='at_risk').length,
            graduated: myStudents.filter(s=>s.status==='graduated').length,
            paused: myStudents.filter(s=>s.status==='paused').length
          },
          movements: { new_enrolled: newEnrolled, calls_done: 0, calls_total: 0, tasks_created: 0, tasks_done: 0, stage_changes: 0 },
          cartera: {
            active: myStudents.filter(s=>s.payment_status==='active').length,
            past_due: myStudents.filter(s=>s.payment_status==='past_due').length,
            expired,
            expiring_soon: expiring
          },
          by_stage: byStage,
          avg_glscore: avgScore,
          glscore_bands: bands,
          top_students: topStudents,
          at_risk_students: atRisk,
          classes_notes: classesNotes
        },
        force: true
      }
    });
    // Mejor manejo de errores
    if (error) {
      const detailed = error.message || JSON.stringify(error);
      let hint = '';
      if (detailed.includes('non-2xx')) {
        hint = '\n\nDiagnóstico:\n• Verificá que ANTHROPIC_API_KEY esté en Supabase secrets\n• Probá redeploy: npx supabase functions deploy ai-deep-analyze';
      }
      throw new Error(detailed + hint);
    }
    if (data?.error) throw new Error(data.error);
    if (!data?.summary_md) throw new Error('Claude devolvió respuesta vacía. Probá de nuevo.');

    // Guardar en DB
    const { data: saved } = await sb.from('edu_reports').insert({
      mentorship_id: cur.id,
      period_type: periodType,
      period_start: startDate,
      period_end: endDate,
      title: data.title,
      summary_md: data.summary_md,
      kpis: data.kpis || {},
      insights: data.insights || [],
      recommendations: data.recommendations || [],
      highlights: data.highlights || [],
      classes_notes: classesNotes || null,
      generated_by: state.user.id
    }).select().single().then(r => r).catch(() => ({}));

    window.aiState[aiKey] = { loading: false, report: data, saved_id: saved?.id };
    await eduLoadAll();
  } catch (e) {
    window.aiState[aiKey] = { loading: false, error: e.message };
  }
  eduRenderReportsStandalone();
}

function eduCopyReport() {
  const aiKey = `edu-report-${eduState.mentorshipId}-${eduState._reportPeriod || 'weekly'}`;
  const r = (window.aiState[aiKey] || {}).report;
  if (!r) return;
  const text = `# ${r.title}\n\n${r.summary_md}\n\n## Recomendaciones\n${(r.recommendations||[]).map(x => `- [${x.priority||'med'}] ${x.action} (${x.owner||'?'}, ${x.due_in_days||7}d)`).join('\n')}`;
  navigator.clipboard.writeText(text).then(() => alert('✓ Copiado al portapapeles'));
}

function eduDownloadReport() {
  const aiKey = `edu-report-${eduState.mentorshipId}-${eduState._reportPeriod || 'weekly'}`;
  const r = (window.aiState[aiKey] || {}).report;
  if (!r) return;
  const text = `# ${r.title}\n\n${r.summary_md}\n\n## Recomendaciones\n${(r.recommendations||[]).map(x => `- **[${x.priority||'med'}]** ${x.action} (${x.owner||'?'}, en ${x.due_in_days||7}d)`).join('\n')}`;
  const blob = new Blob([text], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${r.title.replace(/[^a-z0-9]/gi,'_')}.md`;
  a.click();
}

function eduLoadReport(id) {
  const r = (eduState.reports || []).find(x => x.id === id);
  if (!r) return;
  const aiKey = `edu-report-${r.mentorship_id}-${r.period_type}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { report: { title: r.title, summary_md: r.summary_md, kpis: r.kpis, recommendations: r.recommendations, highlights: r.highlights } };
  eduState.mentorshipId = r.mentorship_id;
  eduState._reportPeriod = r.period_type;
  eduRenderReportsStandalone();
}

async function eduDeleteReport(id) {
  if (!confirm('¿Eliminar este informe?')) return;
  await sb.from('edu_reports').delete().eq('id', id);
  await eduLoadAll(); eduRenderReportsStandalone();
}

// ============================================================
// FLIPMENTORÍA — Biblioteca Metodológica (Sistema 4 de Educación)
// 14 documentos: índice, E0-E5 tareas, anexos A/B/C, contactos, procesos, extras
// ============================================================

const fmState = {
  sys: null,
  docs: [],
  activeEtapa: 'INDICE',
  activeDocId: null,
  searchQuery: '',
  loading: false,
  activeTab: 'biblioteca',  // biblioteca | buscador | diagnostico
  searchChat: [],
  searchLoading: false,
  // Wizard de diagnóstico (sin IA — categorización por reglas)
  diagAnswers: {},        // q_id → answer value
  diagStep: 0,            // pregunta actual
  diagResult: null,       // perfil identificado + plan
  diagModo: 'medio',      // panorama | foco | corto | medio | completo
  diagExpandidos: {},     // { bloque_id: true } — bloques expandidos individualmente
  diagStudentId: null,    // estudiante vinculado al diagnóstico activo
  diagStudentSearch: ''   // filtro búsqueda del dropdown
};

// ── Estudiantes disponibles para el Diagnóstico ──
// Filtra por mentoría activa de FM (que viene del sistema padre eduState.mentorshipId
// si está disponible, o el primer mentorship cargado).
function fmGetStudentsForDiag() {
  const list = (eduState && eduState.students) || [];
  const mid = (eduState && eduState.mentorshipId) || null;
  return mid ? list.filter(s => s.mentorship_id === mid) : list;
}

// Cuando el coach elige un estudiante: prellena respuestas con eduInferirDiagnostico
// y deja el wizard listo para revisar/ajustar antes de generar el plan.
function fmSelectStudentForDiag(studentId) {
  if (!studentId) {
    fmState.diagStudentId = null;
    fmState.diagAnswers = {};
    fmState.diagStep = 0;
    fmRender();
    return;
  }
  const s = (eduState.students || []).find(x => x.id === studentId);
  if (!s) { alert('Estudiante no encontrado en el cache. Refrescá Mentorías Manager.'); return; }
  fmState.diagStudentId = studentId;
  try { fmState.diagAnswers = eduInferirDiagnostico(s) || {}; }
  catch (e) { fmState.diagAnswers = {}; console.warn('inferir falló', e); }
  fmState.diagStep = 0;
  fmState.diagResult = null;
  fmRender();
}

function fmSetDiagStudentSearch(v) {
  fmState.diagStudentSearch = v || '';
  fmRender();
  setTimeout(() => {
    const inp = document.getElementById('fm-diag-student-search');
    if (inp) { inp.focus(); inp.setSelectionRange(v.length, v.length); }
  }, 0);
}

// ─── CONFIG WIZARD DE DIAGNÓSTICO (18 preguntas en 6 bloques) ───
const FM_DIAG_QUESTIONS = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BLOQUE A — Resultado y objetivo
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'objetivo', bloque: 'A · Objetivo',
    pregunta: '¿Cuál es tu resultado objetivo en los próximos 12 meses?',
    opciones: [
      { val: 'flip',         label: '🏠 Cerrar mi primer Fix & Flip (compra, remodelo, vendo)' },
      { val: 'hold',         label: '🏘️ Empezar portfolio de Fix & Hold (rentas long-term, cash flow)' },
      { val: 'hibrido',      label: '🔀 Mix flips + holds' },
      { val: 'escalar',      label: '🚀 Escalar negocio existente (sistemas, equipo, múltiples deals)' },
      { val: 'lender',       label: '💰 Ser private money lender (prestar capital, no operar)' }
    ]
  },
  {
    id: 'mercado_estado', bloque: 'A · Objetivo',
    pregunta: '¿En qué estado/región vas a invertir?',
    tipo: 'text', placeholder: 'Ej: Texas (Austin/Houston), Florida (Miami), Georgia (Atlanta)...'
  },
  {
    id: 'estrategia_renta', bloque: 'A · Objetivo',
    pregunta: 'Si vas por Fix & Hold, ¿qué modelo de renta?',
    opciones: [
      { val: 'tradicional',  label: '🏠 Renta tradicional (12 meses, familia)' },
      { val: 'coliving',     label: '🛏️ Coliving / room-by-room (PadSplit, SpareRoom)' },
      { val: 'airbnb',       label: '🌴 Short-Term Rental (Airbnb/VRBO)' },
      { val: 'corporate',    label: '💼 Corporate housing / Furnished Finder' },
      { val: 'na',           label: 'No aplica — voy por Flip' }
    ],
    skipIf: (a) => a.objetivo === 'flip' || a.objetivo === 'lender'
  },
  {
    id: 'meta_deals', bloque: 'A · Objetivo',
    pregunta: '¿Cuántos deals querés cerrar en los próximos 12 meses?',
    opciones: [
      { val: '1',            label: '1 deal — primero quiero validar' },
      { val: '2_3',          label: '2-3 deals — empezar con cadencia' },
      { val: '4_6',          label: '4-6 deals — escalar rápido' },
      { val: '7_mas',        label: '7+ deals — full operación con equipo' }
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BLOQUE B — Capital y financiamiento
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'capital', bloque: 'B · Capital',
    pregunta: '¿Cuánto capital propio disponible HOY (líquido, sin tocar reserva personal)?',
    opciones: [
      { val: 'menos_20k',    label: '< $20K — limitado para flip directo' },
      { val: '20_50k',       label: '$20K – $50K — apenas para 1 deal con HML' },
      { val: '50_100k',      label: '$50K – $100K — cómodo con buffer' },
      { val: '100_250k',     label: '$100K – $250K — multi-deal posible' },
      { val: 'mas_250k',     label: '> $250K — capital robusto' }
    ]
  },
  {
    id: 'credit', bloque: 'B · Capital',
    pregunta: '¿Tu credit score (FICO) actual?',
    opciones: [
      { val: 'mas_780',      label: '> 780 (top tier)' },
      { val: '720_780',      label: '720 – 780 (excelente)' },
      { val: '660_720',      label: '660 – 720 (bueno, califica HML estándar)' },
      { val: '600_660',      label: '600 – 660 (limitado, HMLs flexibles)' },
      { val: 'menos_600',    label: '< 600 (reconstruir antes)' },
      { val: 'sin_historial',label: 'Sin historial crediticio en USA' }
    ]
  },
  {
    id: 'fuentes_capital', bloque: 'B · Capital',
    pregunta: '¿Qué fuentes de capital adicional tenés acceso? (multi-select mental — elegí la principal)',
    opciones: [
      { val: 'solo_propio',  label: 'Solo capital propio' },
      { val: 'heloc',        label: 'HELOC sobre vivienda principal disponible' },
      { val: 'private_fam',  label: 'Private money familiar/cercano disponible' },
      { val: 'socio_capital',label: 'Tengo socio de capital identificado' },
      { val: 'business_credit', label: 'Business credit / líneas de crédito activas' },
      { val: 'a_construir',  label: 'Tengo que construirlo durante el proceso' }
    ]
  },
  {
    id: 'hml_status', bloque: 'B · Capital',
    pregunta: '¿Tenés Hard Money Lender (HML) pre-aprobado?',
    opciones: [
      { val: 'primario_backup', label: '✅ Sí, primario + backup' },
      { val: 'solo_primario',   label: '✅ Sí, solo primario' },
      { val: 'hablado',         label: '🟡 He hablado con HMLs pero sin pre-aprobación formal' },
      { val: 'investigando',    label: '🟠 Estoy investigando opciones' },
      { val: 'ninguno',         label: '❌ Ningún contacto con HML todavía' }
    ]
  },
  {
    id: 'capital_real', bloque: 'B · Capital',
    pregunta: 'Sobre el capital que dijiste tener: ¿cuánto está LÍQUIDO HOY (acceso 24-48h)?',
    opciones: [
      { val: 'todo',         label: '100% líquido — disponible inmediato' },
      { val: 'mitad',        label: '~50% líquido, resto requiere 1-2 semanas' },
      { val: 'minimo',       label: 'Mínimo líquido, mayoría requiere vender activos / sacar HELOC' },
      { val: 'teorico',      label: 'Mayoritariamente teórico — todavía no lo tengo en mano' }
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BLOQUE C — Fundación legal y experiencia
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'llc', bloque: 'C · Fundación',
    pregunta: '¿Tenés LLC formada?',
    opciones: [
      { val: 'si_mismo',     label: '✅ Sí, en el estado donde planeo invertir' },
      { val: 'si_otro',      label: '⚠️ Sí, pero en otro estado distinto al de inversión' },
      { val: 'no',           label: '❌ No, todavía no la formé' },
      { val: 'otra_entidad', label: 'Tengo otra entidad (S-Corp, INC)' }
    ]
  },
  {
    id: 'setup_legal', bloque: 'C · Fundación',
    pregunta: '¿Cuáles de estos tenés activos hoy?',
    multiSelect: true,
    opciones: [
      { val: 'ein',          label: 'EIN del IRS' },
      { val: 'operating',    label: 'Operating Agreement firmado' },
      { val: 'banco',        label: 'Cuenta bancaria de negocio + tarjeta crédito' },
      { val: 'contabilidad', label: 'Software contabilidad activo (QuickBooks/Stessa)' },
      { val: 'cpa',          label: 'CPA de real estate identificado' },
      { val: 'abogado',      label: 'Abogado de real estate identificado' },
      { val: 'ninguno',      label: 'Ninguno todavía' }
    ]
  },
  {
    id: 'deals_cerrados', bloque: 'C · Fundación',
    pregunta: '¿Cuántos deals exitosos has cerrado en real estate?',
    opciones: [
      { val: '0',            label: 'Ninguno todavía' },
      { val: '1',            label: '1 deal' },
      { val: '2_4',          label: '2 – 4 deals' },
      { val: '5_mas',        label: '5+ deals' }
    ]
  },
  {
    id: 'experiencia_previa', bloque: 'C · Fundación',
    pregunta: '¿Tenés experiencia previa en algo relacionado?',
    opciones: [
      { val: 'cero',         label: 'Cero — completamente nuevo' },
      { val: 'construccion', label: 'Construcción / remodelación (contratista o similar)' },
      { val: 'real_estate_otro', label: 'Real estate en otro país' },
      { val: 'corporativo',  label: 'Background corporativo (finanzas, ventas, ops)' },
      { val: 'mixto',        label: 'Mix de varios' }
    ]
  },
  {
    id: 'inmigracion', bloque: 'C · Fundación',
    pregunta: 'Tu situación en USA:',
    opciones: [
      { val: 'residente',    label: '🇺🇸 Ciudadano o residente USA con SSN' },
      { val: 'itin',         label: '📋 Tengo ITIN (sin SSN)' },
      { val: 'internacional',label: '🌎 Internacional sin ITIN (visito USA)' }
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BLOQUE D — Mercado y conocimiento
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'buybox', bloque: 'D · Mercado',
    pregunta: '¿Tenés Buy Box (perfil de propiedad ideal) definido?',
    opciones: [
      { val: 'completo',     label: '✅ 5+ Buy Box por estrategia con criterios numéricos documentados' },
      { val: 'parcial',      label: '🟡 1-2 Buy Box parciales, faltan validar números' },
      { val: 'mental',       label: '🟠 Sé qué quiero pero no está documentado' },
      { val: 'cero',         label: '❌ No tengo Buy Box' }
    ]
  },
  {
    id: 'arv_skill', bloque: 'D · Mercado',
    pregunta: '¿Sabés calcular ARV y MAO de una propiedad?',
    opciones: [
      { val: 'experto',      label: '✅ Sí, lo hago con 5+ comps y ajustes documentados' },
      { val: 'basico',       label: '🟡 Conozco la fórmula básica (ARV × 75% - rehab)' },
      { val: 'concepto',     label: '🟠 Sé qué significan pero no lo he practicado' },
      { val: 'no',           label: '❌ No estoy familiarizado con estos términos' }
    ]
  },
  {
    id: 'ofertas_mes', bloque: 'D · Mercado',
    pregunta: '¿Cuántas ofertas formales has enviado en los últimos 30 días?',
    opciones: [
      { val: '10_mas',       label: '10+ ofertas' },
      { val: '1_9',          label: '1-9 ofertas' },
      { val: 'analisis_no_oferta', label: '0 ofertas pero analizo deals regularmente' },
      { val: 'cero',         label: 'Ni siquiera analizo deals todavía' }
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BLOQUE E — Red operativa actual
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'wholesalers', bloque: 'E · Red operativa',
    pregunta: '¿Cuántos wholesalers tenés en tu buyer list activa enviándote deals?',
    opciones: [
      { val: '10_mas',       label: '10+ wholesalers activos' },
      { val: '3_9',          label: '3-9 wholesalers' },
      { val: '1_2',          label: '1-2 wholesalers ocasionales' },
      { val: 'cero',         label: 'Ninguno' }
    ]
  },
  {
    id: 'gc_status', bloque: 'E · Red operativa',
    pregunta: '¿Tenés General Contractor (GC) primario identificado y validado?',
    opciones: [
      { val: 'primario_backup',label: '✅ Sí, primario + backup con licencia/seguros verificados' },
      { val: 'primario',     label: '✅ Sí, solo primario' },
      { val: 'hablado',      label: '🟡 He hablado con varios pero sin elegir' },
      { val: 'cero',         label: '❌ No tengo contactos de GC' }
    ]
  },
  {
    id: 'deal_activo', bloque: 'E · Red operativa',
    pregunta: '¿Tenés deal activo ahora mismo?',
    opciones: [
      { val: 'no',           label: 'No, todavía no cierro mi primer deal' },
      { val: 'busqueda',     label: 'En búsqueda — analizando deals' },
      { val: 'pre_obra',     label: 'Sí, en preparación pre-obra (E2)' },
      { val: 'obra',         label: 'Sí, en obra (E3)' },
      { val: 'salida',       label: 'Sí, en salida / listing (E4)' }
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BLOQUE F — Mindset y disponibilidad
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'tiempo', bloque: 'F · Disponibilidad',
    pregunta: '¿Cuántas horas/semana podés dedicarle al negocio?',
    opciones: [
      { val: 'mas_30',       label: '> 30 horas (full-time o casi)' },
      { val: '15_30',        label: '15 – 30 horas (medio tiempo serio)' },
      { val: 'menos_15',     label: '< 15 horas (paralelo a trabajo)' }
    ]
  },
  {
    id: 'mayor_obstaculo', bloque: 'F · Disponibilidad',
    pregunta: '¿Cuál es tu MAYOR obstáculo percibido hoy?',
    opciones: [
      { val: 'capital',      label: '💰 Capital — me siento sin recursos suficientes' },
      { val: 'conocimiento', label: '📚 Conocimiento — no sé por dónde empezar' },
      { val: 'red',          label: '🤝 Red — no tengo contactos' },
      { val: 'tiempo',       label: '⏰ Tiempo — estoy ocupado con otras cosas' },
      { val: 'miedo',        label: '😰 Miedo / parálisis — no me animo a ofertar' },
      { val: 'mercado',      label: '🏘️ Mercado — no encuentro deals buenos' },
      { val: 'equipo',       label: '👥 Equipo — necesito gente que ejecute conmigo' }
    ]
  }
];

const FM_ETAPAS = [
  { id: 'INDICE',  label: '📘 Índice',         color: 'slate' },
  { id: 'E0',      label: '🏛️ E0 · Fundación', color: 'amber' },
  { id: 'E1',      label: '🔍 E1 · Evaluar',    color: 'blue' },
  { id: 'E2',      label: '🏗️ E2 · Estructurar', color: 'indigo' },
  { id: 'E3',      label: '🔨 E3 · Ejecutar',   color: 'purple' },
  { id: 'E4',      label: '💰 E4 · Salida',     color: 'emerald' },
  { id: 'E5',      label: '🚀 E5 · Escalar',    color: 'rose' },
  { id: 'TODOS',   label: '📇 Stack Completo',  color: 'slate' },
  { id: 'ANEXO_A', label: '📚 Anexo A · Caso',  color: 'teal' },
  { id: 'ANEXO_B', label: '🧮 Anexo B · Calc',  color: 'cyan' },
  { id: 'ANEXO_C', label: '🧠 Anexo C · Mind',  color: 'fuchsia' }
];

async function openEduMethodologySystem(sys) {
  fmState.sys = sys;
  fmState.loading = true;
  fmRender();
  const { data, error } = await sb.from('fm_documents')
    .select('id,etapa,categoria,codigo,titulo,subtitulo,posicion,tags')
    .order('posicion');
  if (error) {
    document.getElementById('content').innerHTML = `<div class="p-8 text-red-600">Error cargando biblioteca: ${error.message}<br><br>¿Corriste el SQL <code>supabase/fm-methodology-schema.sql</code> y <code>supabase/fm-methodology-seed.sql</code>?</div>`;
    return;
  }
  fmState.docs = data || [];
  fmState.loading = false;
  // Default al primer documento de la etapa activa
  const firstDoc = fmState.docs.find(d => d.etapa === fmState.activeEtapa);
  if (firstDoc) fmState.activeDocId = firstDoc.id;
  fmRender();
}

function fmDocsForEtapa(etapaId) {
  if (etapaId === 'TODOS') return fmState.docs.filter(d => d.etapa === 'TODOS');
  return fmState.docs.filter(d => d.etapa === etapaId);
}

function fmSetEtapa(etapaId) {
  fmState.activeEtapa = etapaId;
  const docs = fmDocsForEtapa(etapaId);
  fmState.activeDocId = docs[0]?.id || null;
  fmRender();
}

async function fmSetDoc(docId) {
  fmState.activeDocId = docId;
  fmRender();
}

function fmRender() {
  try {
    return fmRenderInner();
  } catch (err) {
    console.error('[fmRender]', err);
    const root = document.getElementById('content');
    if (root) {
      root.innerHTML = `<div class="p-8 max-w-3xl mx-auto"><div class="bg-red-50 border border-red-200 rounded-xl p-6"><h3 class="font-bold text-red-900 mb-2">⚠️ Error de render</h3><pre class="text-xs text-red-700 bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">${String(err?.message || err).replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;')}</pre><div class="text-xs text-slate-600 mt-3">Stack: <pre class="bg-white p-2 rounded mt-1 text-xs overflow-x-auto">${String(err?.stack || '').replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;')}</pre></div><button onclick="fmDiagReset();" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">🔄 Reiniciar diagnóstico</button></div></div>`;
    }
  }
}

function fmRenderInner() {
  const root = document.getElementById('content');
  if (!root) return;
  if (fmState.loading) {
    root.innerHTML = '<div class="p-8 text-slate-500">Cargando biblioteca metodológica...</div>';
    return;
  }
  if (!fmState.docs.length) {
    root.innerHTML = `<div class="p-8 max-w-2xl"><div class="bg-amber-50 border border-amber-200 rounded-xl p-6"><h3 class="font-bold text-amber-900 mb-2">⚠️ Biblioteca vacía</h3><p class="text-sm text-amber-800">Corré primero <code class="bg-amber-100 px-2 py-1 rounded">supabase/fm-methodology-schema.sql</code> y luego <code class="bg-amber-100 px-2 py-1 rounded">supabase/fm-methodology-seed.sql</code> en Supabase SQL Editor.</p></div></div>`;
    return;
  }

  root.innerHTML = `
    <div class="h-full flex flex-col">
      <!-- Header con tabs -->
      <div class="bg-white border-b border-slate-200 px-6 pt-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="font-bold text-slate-900 text-lg">📘 ${fmState.sys.name}</h2>
            <p class="text-xs text-slate-500">71 tareas · 400+ contactos · 3 anexos · IA Coach</p>
          </div>
          <button onclick="window.history.back()" class="text-sm text-slate-500 hover:text-slate-700">← Volver</button>
        </div>
        <div class="flex gap-1 -mb-px">
          <button onclick="fmSetTab('biblioteca')" class="px-4 py-2 text-sm font-medium border-b-2 transition ${fmState.activeTab === 'biblioteca' ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}">📚 Biblioteca</button>
          <button onclick="fmSetTab('buscador')" class="px-4 py-2 text-sm font-medium border-b-2 transition ${fmState.activeTab === 'buscador' ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}">🔍 Buscador IA</button>
          <button onclick="fmSetTab('diagnostico')" class="px-4 py-2 text-sm font-medium border-b-2 transition ${fmState.activeTab === 'diagnostico' ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}">🎯 Diagnóstico</button>
          <button onclick="fmSetTab('credito')" class="px-4 py-2 text-sm font-medium border-b-2 transition ${fmState.activeTab === 'credito' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}">💳 Crédito</button>
        </div>
      </div>

      <!-- Contenido del tab activo -->
      <div class="flex-1 overflow-hidden">
        ${fmState.activeTab === 'biblioteca' ? fmRenderBiblioteca() : ''}
        ${fmState.activeTab === 'buscador' ? fmRenderBuscadorIA() : ''}
        ${fmState.activeTab === 'diagnostico' ? fmRenderDiagnostico() : ''}
        ${fmState.activeTab === 'credito' ? fmRenderCredito() : ''}
      </div>
    </div>
  `;

  if (fmState.activeTab === 'biblioteca') {
    const activeDoc = fmState.docs.find(d => d.id === fmState.activeDocId);
    if (activeDoc) fmRenderMarkdown(activeDoc);
  }
}

function fmSetTab(tab) {
  fmState.activeTab = tab;
  fmRender();
}

function fmRenderBiblioteca() {
  const activeDoc = fmState.docs.find(d => d.id === fmState.activeDocId);
  return `
    <div class="flex h-full">
      <aside class="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div class="p-4 border-b border-slate-200">
          <input id="fm-search" type="text" placeholder="🔎 Buscar en biblioteca..." value="${fmState.searchQuery}"
            class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            oninput="fmSearch(this.value)"/>
        </div>
        <nav class="flex-1 overflow-y-auto scrollbar-thin p-2">
          ${FM_ETAPAS.map(e => {
            const docs = fmDocsForEtapa(e.id);
            const isActive = e.id === fmState.activeEtapa;
            return `
              <div class="mb-1">
                <button onclick="fmSetEtapa('${e.id}')"
                  class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}">
                  ${e.label}
                  <span class="text-xs text-slate-400 ml-1">(${docs.length})</span>
                </button>
                ${isActive ? `
                  <div class="ml-3 mt-1 space-y-0.5">
                    ${docs.map(d => `
                      <button onclick="fmSetDoc('${d.id}')"
                        class="w-full text-left px-3 py-1.5 text-xs rounded transition ${d.id === fmState.activeDocId ? 'bg-blue-100 text-blue-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}">
                        ${d.titulo.replace(/^[🏛️🔍🏗️🔨💰🚀📚🧮🧠📘📇🛠️⚙️📋🎯🗺️]\s*/, '').slice(0, 50)}${d.titulo.length > 50 ? '…' : ''}
                      </button>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </nav>
      </aside>
      <main class="flex-1 overflow-y-auto bg-slate-50">
        <div class="max-w-5xl mx-auto px-8 py-6">
          ${activeDoc ? fmRenderDoc(activeDoc) : `<div class="text-center py-20 text-slate-500"><div class="text-6xl mb-4">📘</div><p>Seleccioná un documento del menú izquierdo</p></div>`}
        </div>
      </main>
    </div>
  `;
}

function fmRenderBuscadorIA() {
  return `
    <div class="h-full flex flex-col bg-slate-50">
      <div class="max-w-4xl mx-auto w-full flex-1 flex flex-col p-6 overflow-hidden">
        <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex-shrink-0">
          <h3 class="font-bold text-slate-900 mb-1">🤖 Buscador IA — Coach Asistente</h3>
          <p class="text-sm text-slate-600">Hacé cualquier pregunta sobre la metodología. La IA responde basándose ÚNICAMENTE en los 71 tareas, 400+ contactos, calculadoras y mindset de FlipMentoría — con citas a códigos específicos (E0.1.1, B.3, etc).</p>
          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            <button onclick="fmSearchQuickAsk('¿Cuáles son los 5 errores más comunes que matan un primer flip?')" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100">5 errores comunes que matan un flip</button>
            <button onclick="fmSearchQuickAsk('¿Cómo calculo el MAO de una propiedad?')" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100">Cómo calcular MAO</button>
            <button onclick="fmSearchQuickAsk('¿Qué HMLs recomiendas si tengo credit score 660?')" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100">HMLs con FICO 660</button>
            <button onclick="fmSearchQuickAsk('¿Cuántas ofertas debo enviar al mes?')" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100">Ofertas/mes target</button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 p-6 mb-4 space-y-4 scrollbar-thin">
          ${fmState.searchChat.length === 0 ? `<div class="text-center text-slate-400 py-12"><div class="text-5xl mb-2">💬</div><p>Empezá la conversación con una pregunta</p></div>` : ''}
          ${fmState.searchChat.map((m, i) => fmRenderChatMessage(m, i, 'search')).join('')}
          ${fmState.searchLoading ? `<div class="flex items-start gap-3"><div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">🤖</div><div class="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 italic">Pensando<span class="animate-pulse">...</span></div></div>` : ''}
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-3 flex gap-2 flex-shrink-0">
          <input id="fm-search-input" type="text" placeholder="Hacé una pregunta sobre la metodología..."
            class="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();fmSearchSend();}"
            ${fmState.searchLoading ? 'disabled' : ''} />
          <button onclick="fmSearchSend()" ${fmState.searchLoading ? 'disabled' : ''}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            ${fmState.searchLoading ? '⏳' : '→'}
          </button>
          ${fmState.searchChat.length > 0 ? `<button onclick="fmSearchReset()" class="px-3 py-2 text-slate-500 hover:text-slate-700 text-sm">🔄</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function fmRenderDiagnostico() {
  if (fmState.diagResult) return fmRenderDiagPlan();

  // Si está cargado, mostrar dropdown de "Planes ya guardados" en el header
  // (los datos vienen de eduState.studentPlans si están sincronizados)
  const savedPlansSection = fmRenderSavedPlansSection();

  // ── Selector de estudiante ──
  const students = fmGetStudentsForDiag();
  const filter = (fmState.diagStudentSearch || '').toLowerCase().trim();
  const filtered = filter
    ? students.filter(s => ((s.full_name||'') + ' ' + (s.email||'') + ' ' + (s.current_stage||'')).toLowerCase().includes(filter))
    : students;
  const selStudent = fmState.diagStudentId ? students.find(s => s.id === fmState.diagStudentId) : null;
  const studentSelector = `
    <div class="bg-white border border-amber-300 rounded-xl p-3 mb-4">
      <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div class="text-xs font-bold uppercase text-amber-800">👤 Diagnóstico para estudiante</div>
        ${selStudent ? `<button onclick="fmSelectStudentForDiag(null)" class="text-[10px] text-slate-500 hover:text-red-700">✕ Limpiar selección</button>` : ''}
      </div>
      ${selStudent ? `
        <div class="bg-amber-50 border border-amber-200 rounded px-3 py-2 space-y-2">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-sm text-slate-900 truncate">${(selStudent.full_name||'').replace(/</g,'&lt;')}</div>
              <div class="text-[11px] text-slate-600">
                ${selStudent.current_stage || 'Sin etapa'} ${selStudent.grupo ? '· '+selStudent.grupo : ''} ${selStudent.email ? '· '+selStudent.email : ''}
              </div>
              <div class="text-[10px] text-emerald-700 mt-1">✓ Respuestas pre-llenadas desde el CRM. Revisá y ajustá lo que necesites.</div>
            </div>
            <button onclick="eduShareDiagnosticForm('${selStudent.id}')" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded shadow whitespace-nowrap" title="Generar link único para que el estudiante complete el diagnóstico solo">📨 Enviarle a ${(selStudent.full_name||'').split(' ')[0].replace(/</g,'&lt;')}</button>
          </div>
        </div>
      ` : `
        <div class="text-[11px] text-slate-600 mb-2">Elegí un estudiante para auto-rellenar respuestas desde el CRM y vincular el plan generado al estudiante.</div>
        <input id="fm-diag-student-search" type="text" placeholder="🔍 Buscar por nombre, email o etapa..." value="${(fmState.diagStudentSearch||'').replace(/"/g,'&quot;')}"
          oninput="fmSetDiagStudentSearch(this.value)"
          class="w-full border border-slate-300 rounded px-3 py-1.5 text-xs mb-2"/>
        <div class="max-h-44 overflow-y-auto scrollbar-thin border border-slate-200 rounded">
          ${filtered.length === 0 ? `
            <div class="px-3 py-3 text-center text-[11px] text-slate-500">${students.length === 0 ? 'No hay estudiantes cargados. Abrí Mentorías Manager y haz Sync.' : 'Sin resultados para "'+filter+'"'}</div>
          ` : filtered.slice(0, 50).map(s => `
            <button onclick="fmSelectStudentForDiag('${s.id}')" class="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-slate-100 last:border-b-0">
              <div class="font-medium text-xs text-slate-900 truncate">${(s.full_name||'?').replace(/</g,'&lt;')}</div>
              <div class="text-[10px] text-slate-500 truncate">${(s.current_stage || '—')} ${s.grupo ? '· '+s.grupo : ''}</div>
            </button>
          `).join('')}
          ${filtered.length > 50 ? `<div class="px-3 py-1 text-[10px] text-slate-500 text-center italic">+${filtered.length - 50} más (refiná búsqueda)</div>` : ''}
        </div>
        <div class="text-[10px] text-slate-500 mt-2 italic">O continuá sin estudiante para diagnóstico anónimo.</div>
      `}
    </div>
  `;

  const activeQuestions = FM_DIAG_QUESTIONS.filter(q => !q.skipIf || !q.skipIf(fmState.diagAnswers));
  const total = activeQuestions.length;
  const step = Math.min(fmState.diagStep, total - 1);
  const q = activeQuestions[step];

  if (!q) return `<div class="p-8">Calculando...</div>`;

  const answered = Object.keys(fmState.diagAnswers).filter(k => fmState.diagAnswers[k] != null && fmState.diagAnswers[k] !== '').length;
  const progress = Math.round((answered / total) * 100);

  // Agrupar preguntas por bloque para mostrar contexto
  const bloques = [...new Set(activeQuestions.map(q => q.bloque))];
  const bloqueActual = q.bloque;

  return `
    <div class="h-full overflow-y-auto bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div class="max-w-3xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="bg-white rounded-xl border border-amber-200 p-5 mb-4 shadow-sm">
          <h3 class="font-bold text-slate-900 mb-1">🎯 Análisis Profundo del Cliente</h3>
          <p class="text-sm text-slate-600">${total} preguntas en 6 bloques para análisis completo: objetivo, capital, fundación, mercado, red operativa y mindset. Al final recibís un plan estructurado por bloques.</p>
        </div>

        ${studentSelector}
        ${savedPlansSection}

        <!-- Bloques navegación -->
        <div class="mb-4 bg-white rounded-xl border border-slate-200 p-3">
          <div class="flex items-center gap-1 overflow-x-auto text-xs">
            ${bloques.map(b => {
              const qsEnBloque = activeQuestions.filter(qq => qq.bloque === b);
              const respondidasEnBloque = qsEnBloque.filter(qq => {
                const v = fmState.diagAnswers[qq.id];
                return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
              }).length;
              const isActive = b === bloqueActual;
              const done = respondidasEnBloque === qsEnBloque.length;
              return `<span class="px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${isActive ? 'bg-amber-500 text-white' : done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">${b} <span class="ml-1 opacity-70">${respondidasEnBloque}/${qsEnBloque.length}</span></span>`;
            }).join('')}
          </div>
        </div>

        <!-- Progress -->
        <div class="mb-4">
          <div class="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Pregunta ${step + 1} de ${total}</span>
            <span>${progress}% completado</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div class="h-full bg-amber-500 transition-all" style="width: ${progress}%"></div>
          </div>
        </div>

        <!-- Pregunta -->
        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div class="text-xs font-bold text-amber-600 tracking-wider mb-2">${q.bloque || ''} · PREGUNTA ${step + 1}</div>
          <h4 class="text-xl font-bold text-slate-900 mb-5">${q.pregunta}</h4>
          ${fmRenderQuestionInput(q)}
        </div>

        <!-- Navegación -->
        <div class="flex items-center justify-between mt-6">
          <button onclick="fmDiagBack()" ${step === 0 ? 'disabled' : ''}
            class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed">
            ← Atrás
          </button>
          ${q.tipo === 'text' || q.multiSelect ? `
            <button onclick="fmDiagNext()" class="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Siguiente →</button>
          ` : ''}
          <button onclick="fmDiagReset()" class="px-3 py-2 text-xs text-slate-400 hover:text-slate-600">🔄 Reiniciar</button>
        </div>
      </div>
    </div>
  `;
}

function fmRenderQuestionInput(q) {
  if (q.tipo === 'text') {
    const val = fmState.diagAnswers[q.id] || '';
    return `
      <input type="text" value="${escapeHtml(val)}" placeholder="${q.placeholder || ''}"
        oninput="fmState.diagAnswers['${q.id}'] = this.value"
        onkeydown="if(event.key==='Enter'){fmDiagNext();}"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"/>
    `;
  }
  if (q.multiSelect) {
    const vals = Array.isArray(fmState.diagAnswers[q.id]) ? fmState.diagAnswers[q.id] : [];
    return `
      <div class="space-y-2">
        ${q.opciones.map(o => {
          const selected = vals.includes(o.val);
          return `
            <button onclick="fmDiagToggle('${q.id}', '${o.val}')"
              class="w-full text-left px-4 py-3 rounded-lg border-2 transition ${selected ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50'}">
              <div class="flex items-center gap-3">
                <div class="w-5 h-5 rounded border-2 ${selected ? 'border-amber-600 bg-amber-600' : 'border-slate-300'} flex items-center justify-center flex-shrink-0">
                  ${selected ? '<span class="text-white text-xs leading-none">✓</span>' : ''}
                </div>
                <span class="text-sm">${o.label}</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
      <p class="text-xs text-slate-500 mt-3">Podés seleccionar varios. Cuando termines, hacé click en "Siguiente →"</p>
    `;
  }
  // Default: single-select radio
  return `
    <div class="space-y-2">
      ${q.opciones.map(o => {
        const selected = fmState.diagAnswers[q.id] === o.val;
        return `
          <button onclick="fmDiagAnswer('${q.id}', '${o.val}')"
            class="w-full text-left px-4 py-3 rounded-lg border-2 transition ${selected ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50'}">
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 rounded-full border-2 ${selected ? 'border-amber-600 bg-amber-600' : 'border-slate-300'} flex items-center justify-center flex-shrink-0">
                ${selected ? '<div class="w-2 h-2 rounded-full bg-white"></div>' : ''}
              </div>
              <span class="text-sm">${o.label}</span>
            </div>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function fmDiagToggle(qid, val) {
  const cur = Array.isArray(fmState.diagAnswers[qid]) ? fmState.diagAnswers[qid] : [];
  if (cur.includes(val)) {
    fmState.diagAnswers[qid] = cur.filter(v => v !== val);
  } else {
    fmState.diagAnswers[qid] = [...cur, val];
  }
  fmRender();
}

function fmDiagNext() {
  const activeQuestions = FM_DIAG_QUESTIONS.filter(q => !q.skipIf || !q.skipIf(fmState.diagAnswers));
  if (fmState.diagStep < activeQuestions.length - 1) {
    fmState.diagStep++;
  } else {
    fmState.diagResult = fmCalcularPerfil(fmState.diagAnswers);
  }
  fmRender();
}

function fmDiagAnswer(qid, val) {
  try {
    fmState.diagAnswers[qid] = val;
    const activeQuestions = FM_DIAG_QUESTIONS.filter(q => !q.skipIf || !q.skipIf(fmState.diagAnswers));
    const currentIdx = activeQuestions.findIndex(q => q.id === qid);
    if (currentIdx < activeQuestions.length - 1) {
      fmState.diagStep = currentIdx + 1;
    } else {
      // Última pregunta → calcular perfil + generar plan
      fmState.diagResult = fmCalcularPerfil(fmState.diagAnswers);
    }
    fmRender();
  } catch (err) {
    console.error('[fmDiagAnswer]', err);
    alert('Error procesando la respuesta:\n\n' + (err?.message || err) + '\n\nMirá la consola del navegador (F12) para más detalles.');
  }
}

function fmDiagBack() {
  if (fmState.diagStep > 0) {
    fmState.diagStep--;
    fmRender();
  }
}

function fmDiagReset() {
  if (Object.keys(fmState.diagAnswers).length && !confirm('¿Reiniciar el diagnóstico?')) return;
  fmState.diagAnswers = {};
  fmState.diagStep = 0;
  fmState.diagResult = null;
  fmRender();
}

// ─── LÓGICA DE CATEGORIZACIÓN ROBUSTA ───
function fmCalcularPerfil(a) {
  return fmAnalizarPerfilCompleto(a);
}

function fmAnalizarPerfilCompleto(a) {
  // Ordenado de más específico a más general
  let perfil, etapa, cronograma;

  // Perfil 8: Lender pasivo
  if (a.objetivo === 'lender') {
    perfil = { num: 8, nombre: 'Lender Pasivo (Private Money)', emoji: '💰', color: 'emerald' };
    etapa = 'E5';
    cronograma = 'Inmediato — no opera el negocio';
  }
  // Perfil 4: Escalar (ya cerró deals)
  else if (a.deals_cerrados === '5_mas' || a.objetivo === 'escalar') {
    perfil = { num: 4, nombre: 'Cerró deals y quiere escalar', emoji: '🚀', color: 'rose' };
    etapa = 'E5';
    cronograma = 'Continuo — sistemas, equipo, expansión';
  }
  else if (a.deals_cerrados === '2_4') {
    perfil = { num: 4, nombre: 'Cerró 1+ deals y quiere escalar', emoji: '🚀', color: 'rose' };
    etapa = 'E5';
    cronograma = '3-6 meses para infraestructura de escala';
  }
  else if (a.deals_cerrados === '1') {
    perfil = { num: 4, nombre: 'Primer deal cerrado, post-mortem pendiente', emoji: '📊', color: 'purple' };
    // FIX: FM_ETAPAS solo tiene E0-E5. 'E5.1' nunca matcheaba en el render
    // y los bloques quedaban invisibles. Asignar a E5 con la subetapa
    // específica codificada en el cronograma.
    etapa = 'E5';
    cronograma = '1-2 meses post-mortem (Subetapa E5.1) + SOPs antes del siguiente';
  }
  // Perfil 7: Internacional
  else if (a.inmigracion === 'internacional' || (a.inmigracion === 'itin' && a.deals_cerrados === '0')) {
    perfil = { num: 7, nombre: 'Internacional / nuevo en USA', emoji: '🌎', color: 'cyan' };
    etapa = 'E0';
    cronograma = '9-12 meses al primer deal (curva legal/fiscal mayor)';
  }
  // Perfil 5: Fix & Hold
  else if (a.objetivo === 'hold') {
    perfil = { num: 5, nombre: 'Fix & Hold (rentas long-term)', emoji: '🏘️', color: 'teal' };
    etapa = 'E0';
    cronograma = '9-15 meses al primer deal rentado';
  }
  // Perfil 2: Capital pero sin crédito
  else if (a.credit === 'menos_600' || a.credit === '600_660' || a.credit === 'sin_historial') {
    perfil = { num: 2, nombre: 'Capital pero sin crédito sólido', emoji: '🏗️', color: 'amber' };
    etapa = 'E0';
    cronograma = '6-12 meses (track paralelo: reconstruir crédito + LLC)';
  }
  // Perfil 1: Cero absoluto (default)
  else if (a.llc === 'no' && a.deals_cerrados === '0') {
    perfil = { num: 1, nombre: 'Cero absoluto', emoji: '🏁', color: 'blue' };
    etapa = 'E0';
    cronograma = a.tiempo === 'mas_30' ? '6-9 meses' : a.tiempo === '15_30' ? '9-12 meses' : '12-18 meses';
  }
  // Perfil 3: Atascado en evaluación
  else if ((a.llc === 'si_mismo' || a.llc === 'si_otro') && a.deals_cerrados === '0') {
    perfil = { num: 3, nombre: 'Atascado en evaluación', emoji: '🔄', color: 'orange' };
    etapa = 'E1+E2';
    cronograma = '30 días breakthrough (forzar volumen de ofertas)';
  }
  else {
    perfil = { num: 1, nombre: 'Cero absoluto', emoji: '🏁', color: 'blue' };
    etapa = 'E0';
    cronograma = '6-12 meses';
  }

  // Identificar fortalezas y gaps
  const fortalezas = [];
  const gaps = [];

  if (a.llc === 'si_mismo') fortalezas.push('LLC formada en estado de inversión');
  else if (a.llc === 'no') gaps.push({ codigo: 'E0.1.1', titulo: 'Formar LLC en el estado donde se invertirá', prioridad: 'CRÍTICA' });
  else if (a.llc === 'si_otro') gaps.push({ codigo: 'E0.1.1', titulo: 'Considerar segunda LLC o foreign registration', prioridad: 'ALTA' });

  if (a.credit === 'menos_600') gaps.push({ codigo: 'PRE-E0', titulo: 'Reconstruir crédito 6-12 meses antes de aplicar a HML', prioridad: 'CRÍTICA' });
  if (a.credit === 'sin_historial') gaps.push({ codigo: 'PRE-E0', titulo: 'Build credit history (secured card + authorized user)', prioridad: 'CRÍTICA' });

  if (a.deals_cerrados === '0' && a.objetivo !== 'lender') {
    if (a.llc !== 'no') gaps.push({ codigo: 'E1.1.1', titulo: 'Construir 5 Buy Box', prioridad: 'ALTA' });
    gaps.push({ codigo: 'E2.1.5', titulo: 'HML primario pre-aprobado + backup', prioridad: 'ALTA' });
    gaps.push({ codigo: 'E1.4.1', titulo: 'Enviar mínimo 10 ofertas formales al mes', prioridad: 'ALTA' });
  }

  if (a.capital === 'menos_20k' && a.objetivo === 'flip') {
    gaps.push({ codigo: 'E2.1.3', titulo: 'Conseguir Private Money o partnership (capital propio insuficiente)', prioridad: 'CRÍTICA' });
  }

  if (a.deals_cerrados === '1') {
    gaps.push({ codigo: 'E5.1.1', titulo: 'Post-mortem detallado del primer deal', prioridad: 'CRÍTICA' });
    gaps.push({ codigo: 'E5.1.2', titulo: 'Crear top 3 SOPs antes del siguiente deal', prioridad: 'ALTA' });
  }

  if (a.deals_cerrados === '2_4' || a.deals_cerrados === '5_mas') {
    gaps.push({ codigo: 'E5.2.1', titulo: 'Red de private money en construcción', prioridad: 'ALTA' });
    if (a.deals_cerrados === '5_mas') gaps.push({ codigo: 'E5.3.1', titulo: 'Contratar Project Manager', prioridad: 'ALTA' });
  }

  if (a.deals_cerrados === '0') {
    fortalezas.push('Estás empezando con claridad — usá Anexo C como brújula');
  }
  if (a.tiempo === 'mas_30') fortalezas.push('Tiempo full-time — cronograma optimista');
  if (a.capital === 'mas_100k') fortalezas.push('Capital cómodo para absorber sorpresas');
  if (a.credit === 'mas_720') fortalezas.push('Credit score excelente — acceso a mejores tasas HML');

  return { perfil, etapa, cronograma, fortalezas, gaps, answers: a };
}

// ─── BUSCADOR IA ───
function fmSearchQuickAsk(q) {
  const input = document.getElementById('fm-search-input');
  if (input) input.value = q;
  fmSearchSend(q);
}

async function fmSearchSend(forcedQuery = null) {
  const input = document.getElementById('fm-search-input');
  const query = forcedQuery || (input ? input.value.trim() : '');
  if (!query || fmState.searchLoading) return;
  fmState.searchChat.push({ role: 'user', content: query });
  fmState.searchLoading = true;
  if (input) input.value = '';
  fmRender();
  try {
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/fm-ai-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await window.getAccessToken()}` },
      body: JSON.stringify({ mode: 'search', messages: fmState.searchChat.map(m => ({ role: m.role, content: m.content })) })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'falló');
    fmState.searchChat.push({ role: 'assistant', content: r.response });
  } catch (e) {
    fmState.searchChat.push({ role: 'assistant', content: `❌ Error: ${e.message}\n\n¿Está deployada la edge function \`fm-ai-coach\`?` });
  }
  fmState.searchLoading = false;
  fmRender();
  // Scroll al final
  setTimeout(() => {
    const containers = document.querySelectorAll('.scrollbar-thin');
    containers.forEach(c => c.scrollTop = c.scrollHeight);
  }, 50);
}

function fmSearchReset() {
  fmState.searchChat = [];
  fmRender();
}

// ============================================================
// 🔗 INTEGRACIÓN COMPLETA — Estudiante ↔ Plan ↔ Airtable ↔ Metodología
// ============================================================

// ─── MODAL DETALLE COMPLETO DEL ESTUDIANTE (editable) ───
function eduRenderStudentDetail(studentId) {
  const s = eduState.students.find(x => x.id === studentId);
  if (!s) return null;
  const m = eduCurrentMentorship();
  const stages = (m?.stages || []).map(x => x.name);
  return `
    <div class="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onclick="if(event.target===this) eduCloseStudentDetail()">
      <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="bg-gradient-to-br from-slate-900 to-slate-700 text-white p-5 sticky top-0">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-[10px] font-bold text-amber-300 tracking-wider mb-1">DETALLE DEL ESTUDIANTE</div>
              <h2 class="text-2xl font-bold">${s.full_name||'—'}</h2>
              <div class="text-sm text-slate-300 mt-1">${s.grupo||''} ${s.email?'· '+s.email:''}</div>
            </div>
            <button onclick="eduCloseStudentDetail()" class="text-white/70 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>
        <div class="p-5 space-y-4">

          <!-- Status compuesto: alertas -->
          ${(() => {
            const alertas = eduCalcularAlertasEstudiante(s);
            if (!alertas.length) return `<div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-900">✅ Sin alertas activas</div>`;
            return `<div class="space-y-1">${alertas.map(a => `
              <div class="bg-${a.severity==='critical'?'red':a.severity==='high'?'amber':'blue'}-50 border border-${a.severity==='critical'?'red':a.severity==='high'?'amber':'blue'}-200 rounded-lg p-2.5 text-xs">
                <div class="font-bold text-${a.severity==='critical'?'red':a.severity==='high'?'amber':'blue'}-900">${a.severity==='critical'?'🚨':a.severity==='high'?'⚠️':'📌'} ${a.mensaje}</div>
                <div class="text-${a.severity==='critical'?'red':a.severity==='high'?'amber':'blue'}-700 mt-0.5">💡 ${a.accion}</div>
              </div>
            `).join('')}</div>`;
          })()}

          <!-- Edición rápida: etapa + status + payment -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-bold uppercase text-slate-600">Etapa actual</label>
              <input id="edu-edit-stage" type="text" value="${(s.current_stage||'').replace(/"/g,'&quot;')}" list="edu-stages-${s.id}" class="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
              <datalist id="edu-stages-${s.id}">${stages.map(st => `<option value="${st}">`).join('')}</datalist>
            </div>
            <div>
              <label class="text-xs font-bold uppercase text-slate-600">Status</label>
              <select id="edu-edit-status" class="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
                ${['active','at_risk','paused','graduated','dropped'].map(st => `<option value="${st}" ${s.status===st?'selected':''}>${st}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="text-xs font-bold uppercase text-slate-600">Pago</label>
              <select id="edu-edit-payment" class="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
                ${['active','past_due','expired','paused','cancelled'].map(pp => `<option value="${pp}" ${s.payment_status===pp?'selected':''}>${pp}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="text-xs font-bold uppercase text-slate-600">Grupo</label>
              <input id="edu-edit-grupo" type="text" value="${(s.grupo||'').replace(/"/g,'&quot;')}" class="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label class="text-xs font-bold uppercase text-slate-600">Última actualización</label>
              <input id="edu-edit-ultima" type="date" value="${s.ultima_fecha_seguimiento||''}" class="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label class="text-xs font-bold uppercase text-slate-600">Capital</label>
              <input id="edu-edit-capital" type="number" value="${s.capital_actual||''}" class="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>

          <div>
            <label class="text-xs font-bold uppercase text-slate-600">Observaciones de seguimiento</label>
            <textarea id="edu-edit-obs" rows="3" class="mt-1 w-full border border-slate-300 rounded px-2 py-1.5 text-sm">${(s.observaciones_seguimiento||'').replace(/</g,'&lt;')}</textarea>
          </div>

          <div class="flex gap-2 pt-2">
            <button onclick="event.stopPropagation(); eduGuardarEstudiante('${s.id}')" class="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded hover:bg-slate-700">💾 Guardar + Sync Airtable</button>
            <button onclick="event.stopPropagation(); eduState.tab='student_plan'; eduState.selectedStudentId='${s.id}'; eduCloseStudentDetail(); eduLoadStudentPlan('${s.id}').then(eduRender);" class="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded hover:bg-amber-700">🎯 Ir al plan</button>
            <button onclick="event.stopPropagation(); try { eduShareDiagnosticForm('${s.id}'); } catch(e) { console.error('share err', e); alert('Error: ' + e.message); }" class="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700" title="Generar link único para que el estudiante complete el diagnóstico solo">📨 Compartir formulario</button>
            ${s.phone ? `<button onclick="event.stopPropagation(); eduOpenWhatsappQuick('${s.id}')" class="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded hover:bg-emerald-600">💬 WhatsApp rápido</button>` : `<button onclick="event.stopPropagation(); eduOpenWhatsappQuick('${s.id}')" class="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded hover:bg-amber-600" title="Sin teléfono — abrí para agregarlo">📞 WhatsApp</button>`}
            <button onclick="event.stopPropagation(); eduGenerateCertificate('${s.id}')" class="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded hover:bg-violet-700" title="Genera certificado PDF de finalización">🎓 Certificado</button>
            ${s.airtable_record_id ? `<a href="https://airtable.com/${m?.airtable_base_id||''}/${m?.airtable_students_table||''}/${s.airtable_record_id}" target="_blank" class="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold rounded hover:bg-blue-100">↗ Abrir en Airtable</a>` : ''}
          </div>

          <!-- Stats info -->
          <div class="border-t border-slate-200 pt-4 grid grid-cols-3 gap-3 text-xs">
            <div><div class="font-bold text-slate-500 uppercase text-[10px]">Entrada</div><div class="text-slate-900">${s.enrolled_at?new Date(s.enrolled_at).toLocaleDateString('es'):'—'}</div></div>
            <div><div class="font-bold text-slate-500 uppercase text-[10px]">Vence</div><div class="text-slate-900">${s.expires_at?new Date(s.expires_at).toLocaleDateString('es'):'—'}</div></div>
            <div><div class="font-bold text-slate-500 uppercase text-[10px]">Días en etapa</div><div class="text-slate-900">${eduDaysInStage(s)??'—'}d</div></div>
            <div><div class="font-bold text-slate-500 uppercase text-[10px]">Email</div><div class="text-slate-900 truncate">${s.email||'—'}</div></div>
            <div><div class="font-bold text-slate-500 uppercase text-[10px]">WhatsApp</div><div class="text-slate-900">${s.phone||'—'}</div></div>
            <div><div class="font-bold text-slate-500 uppercase text-[10px]">Ciudad</div><div class="text-slate-900">${s.city||'—'}</div></div>
          </div>

          ${s.notes ? `<div class="border-t border-slate-200 pt-3"><div class="text-xs font-bold uppercase text-slate-600 mb-1">📝 Notas generales</div><div class="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-2 rounded">${s.notes.replace(/</g,'&lt;')}</div></div>` : ''}
          ${s.evidencia_url ? `<div><a href="${s.evidencia_url}" target="_blank" class="text-xs text-blue-600 hover:underline">📎 Ver evidencia</a></div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function eduCloseStudentDetail() {
  const el = document.getElementById('edu-student-detail-modal');
  if (el) el.remove();
}

function eduShowStudentDetail(studentId) {
  eduCloseStudentDetail();
  const html = eduRenderStudentDetail(studentId);
  if (!html) return;
  const wrap = document.createElement('div');
  wrap.id = 'edu-student-detail-modal';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
}

async function eduGuardarEstudiante(studentId) {
  const s = eduState.students.find(x => x.id === studentId);
  if (!s) return;
  const stage = document.getElementById('edu-edit-stage').value.trim() || null;
  const status = document.getElementById('edu-edit-status').value;
  const pago = document.getElementById('edu-edit-payment').value;
  const grupo = document.getElementById('edu-edit-grupo').value.trim() || null;
  const ultima = document.getElementById('edu-edit-ultima').value || null;
  const capital = parseFloat(document.getElementById('edu-edit-capital').value) || null;
  const obs = document.getElementById('edu-edit-obs').value.trim() || null;

  const stageChanged = stage !== s.current_stage;
  const update = {
    current_stage: stage,
    status, payment_status: pago,
    grupo, ultima_fecha_seguimiento: ultima,
    capital_actual: capital, observaciones_seguimiento: obs,
    updated_at: new Date().toISOString()
  };
  if (stageChanged) update.stage_started_at = new Date().toISOString().split('T')[0];

  const { error } = await sb.from('edu_students').update(update).eq('id', studentId);
  if (error) return alert('Error guardando: ' + error.message);

  // Sync inverso a Airtable
  let atSync = '';
  if (s.airtable_record_id) {
    try {
      const res = await fetch(`${window.SUPABASE_URL}/functions/v1/update-airtable-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await window.getAccessToken()}` },
        body: JSON.stringify({
          mentorship_id: s.mentorship_id,
          airtable_record_id: s.airtable_record_id,
          fields: {
            'Etapa actual': stage,
            'Estado del Estudiante': status === 'active' ? '🟢 Activo' : status === 'paused' ? '⏸ Pausado' : status === 'graduated' ? '🎓 Graduado' : '🚫 Inactivo',
            'Estado de Pago': pago === 'active' ? 'Al día' : pago === 'past_due' ? 'Atrasado' : 'Vencido',
            'Última fecha de seguimiento': ultima,
            'Observaciones de Seguimiento': obs
          }
        })
      });
      const r = await res.json();
      atSync = r.ok ? '\n✅ Airtable actualizado' : '\n⚠️ Airtable: ' + (r.error||'falló');
    } catch (e) { atSync = '\n⚠️ Sync Airtable falló: ' + e.message; }
  }

  alert(`✅ Estudiante actualizado${atSync}`);
  eduCloseStudentDetail();
  await eduLoadAll();
  eduRender();
}

// ─── DESCARGA DEL PLAN (markdown) ───
function eduDescargarPlan(format) {
  const plan = eduState.studentPlan;
  if (!plan) return alert('Sin plan activo');
  const student = eduState.students.find(s => s.id === plan.student_id);
  if (!student) return;
  const tasks = eduState.studentPlanTasks || [];
  const blocks = {};
  tasks.forEach(t => {
    if (!blocks[t.bloque_id]) blocks[t.bloque_id] = { etapa: t.bloque_etapa, subetapa: t.bloque_subetapa, orden: t.bloque_orden, tasks: [] };
    blocks[t.bloque_id].tasks.push(t);
  });
  const list = Object.values(blocks).sort((a,b) => a.orden - b.orden);
  const total = tasks.length, done = tasks.filter(t => t.completed).length;
  const pct = total ? Math.round(100*done/total) : 0;
  const perfil = plan.perfil?.perfil || {};

  let md = `# 🎯 Plan de Acción — ${student.full_name}\n\n`;
  md += `**Perfil:** ${perfil.emoji||''} ${perfil.nombre||'—'}\n`;
  md += `**Cronograma:** ${plan.perfil?.cronograma||'—'}\n`;
  md += `**Avance actual:** ${done}/${total} tareas (${pct}%)\n`;
  md += `**Generado:** ${new Date(plan.created_at).toLocaleDateString('es')}\n\n---\n\n`;

  list.forEach((b, i) => {
    const bDone = b.tasks.filter(t => t.completed).length;
    md += `## Bloque ${i+1} · ${b.etapa} — ${b.subetapa}\n`;
    md += `_${bDone}/${b.tasks.length} tareas completadas_\n\n`;
    b.tasks.forEach(t => {
      md += `- ${t.completed?'[x]':'[ ]'} ${t.paso_text}\n`;
    });
    md += `\n`;
  });

  if (format === 'pdf') {
    // Imprimir como PDF — abrir ventana con HTML formateado
    const html = `<!DOCTYPE html><html><head><title>Plan ${student.full_name}</title><style>
      body{font-family:system-ui;max-width:780px;margin:2rem auto;padding:1rem;color:#0F172A;line-height:1.5}
      h1{font-size:1.8rem;color:#0F172A;border-bottom:2px solid #D97706;padding-bottom:0.5rem}
      h2{font-size:1.2rem;color:#1E293B;margin-top:1.5rem;background:#F1F5F9;padding:0.5rem 0.75rem;border-left:4px solid #D97706}
      em{color:#64748B;font-size:0.85rem}
      ul{list-style:none;padding-left:0.5rem}
      li{padding:0.25rem 0;border-bottom:1px solid #F1F5F9}
      hr{border:none;border-top:1px solid #E2E8F0;margin:1rem 0}
      strong{color:#0F172A}
    </style></head><body>${md.replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^_(.+)_$/gm,'<em>$1</em>').replace(/^- \[x\] (.+)$/gm,'<li>✅ <s>$1</s></li>').replace(/^- \[ \] (.+)$/gm,'<li>☐ $1</li>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^---$/gm,'<hr/>').replace(/\n/g,'<br>')}<script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close();
    return;
  }
  // Default: markdown
  const blob = new Blob([md], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `plan-${student.full_name.replace(/[^a-z0-9]/gi,'_')}-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── PROGRESO: FUNNEL POR ETAPA ───
function eduRenderProgressFunnel() {
  const students = eduMyStudents();
  if (!students.length) return `<div class="p-8 text-center text-slate-500">Sin estudiantes.</div>`;
  const dist = eduDistribucionEtapas(students);
  const maxCount = Math.max(...dist.map(d => d.total), 1);
  const totalActivos = students.filter(s => s.status === 'active').length;

  return `
    <div class="space-y-4">
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <div class="text-xs font-bold uppercase text-slate-400 mb-1">📈 Funnel de progreso</div>
        <div class="text-2xl font-bold">${students.length} estudiantes · ${totalActivos} activos</div>
        <div class="text-xs text-slate-300 mt-1">${dist.length} etapas distintas detectadas</div>
      </div>

      <!-- Funnel visual -->
      <div class="bg-white border border-slate-200 rounded-xl p-5">
        <div class="text-xs font-bold uppercase text-slate-600 mb-4">📊 Distribución por etapa (ordenado por cantidad)</div>
        <div class="space-y-2">
          ${dist.map((d, i) => {
            const w = Math.round((d.total / maxCount) * 100);
            const stalled = d.estancados > 0;
            const stalledPct = d.total > 0 ? Math.round(d.estancados/d.total*100) : 0;
            const colorBar = stalledPct > 30 ? 'from-red-500 to-red-600' : stalledPct > 15 ? 'from-amber-400 to-amber-500' : 'from-emerald-400 to-emerald-500';
            return `
              <div onclick="eduFiltrarEstudiantesEtapa(${JSON.stringify(d.stage)})" class="cursor-pointer hover:bg-slate-50 rounded-lg p-2 transition">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-semibold text-slate-900">${i+1}. ${d.stage}</span>
                  <div class="flex items-center gap-3 text-[11px]">
                    <span class="font-bold text-slate-900">${d.total} estudiantes</span>
                    <span class="text-slate-500">${d.dias_promedio}d avg</span>
                    ${stalled ? `<span class="text-red-700 font-bold">${d.estancados} 🐢 (${stalledPct}%)</span>` : ''}
                  </div>
                </div>
                <div class="bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div class="bg-gradient-to-r ${colorBar} h-full transition-all" style="width: ${w}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Velocidad: días promedio + estancados -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-white border border-slate-200 rounded-xl p-4">
          <div class="text-xs font-bold uppercase text-slate-600 mb-3">⚡ Etapas más rápidas (mejor)</div>
          <ul class="space-y-1 text-xs">
            ${dist.filter(d => d.dias_promedio > 0).sort((a,b) => a.dias_promedio - b.dias_promedio).slice(0,5).map(d => `
              <li class="flex justify-between p-2 bg-emerald-50 rounded"><span>${d.stage}</span><span class="font-bold text-emerald-700">${d.dias_promedio}d avg</span></li>
            `).join('')}
          </ul>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4">
          <div class="text-xs font-bold uppercase text-slate-600 mb-3">🐢 Etapas con más estancamiento (atención)</div>
          <ul class="space-y-1 text-xs">
            ${dist.filter(d => d.estancados > 0).sort((a,b) => b.estancados - a.estancados).slice(0,5).map(d => `
              <li class="flex justify-between p-2 bg-red-50 rounded"><span>${d.stage}</span><span class="font-bold text-red-700">${d.estancados} de ${d.total}</span></li>
            `).join('')}
            ${dist.filter(d => d.estancados > 0).length === 0 ? '<li class="text-emerald-600 p-2">✅ Sin estancamientos</li>' : ''}
          </ul>
        </div>
      </div>
    </div>
  `;
}

function eduFiltrarEstudiantesEtapa(stage) {
  eduState.tab = 'students';
  eduState.stageFilter = stage;
  eduRender();
}

// ─── RECURSOS: traer fm_documents de la metodología ───
let fmDocsCache = null;
async function eduLoadFmDocs() {
  if (fmDocsCache) return fmDocsCache;
  const { data } = await sb.from('fm_documents').select('id,etapa,categoria,titulo,subtitulo,tags').order('posicion');
  fmDocsCache = data || [];
  return fmDocsCache;
}

function eduRenderResourcesIntegrated() {
  if (!fmDocsCache) {
    eduLoadFmDocs().then(() => eduRender());
    return `<div class="p-8 text-center text-slate-500">Cargando recursos de Metodología FlipMentoría...</div>`;
  }
  const docs = fmDocsCache;
  const byEtapa = {};
  docs.forEach(d => {
    if (!byEtapa[d.etapa]) byEtapa[d.etapa] = [];
    byEtapa[d.etapa].push(d);
  });
  const labels = {
    'INDICE': '📘 Índice + Diagnóstico',
    'E0': '🏛️ E0 · Fundación',
    'E1': '🔍 E1 · Evaluar',
    'E2': '🏗️ E2 · Estructurar',
    'E3': '🔨 E3 · Ejecutar',
    'E4': '💰 E4 · Salida',
    'E5': '🚀 E5 · Escalar',
    'TODOS': '📇 Stack Completo',
    'ANEXO_A': '📚 Anexo A · Caso',
    'ANEXO_B': '🧮 Anexo B · Calculadoras',
    'ANEXO_C': '🧠 Anexo C · Mindset'
  };

  return `
    <div class="space-y-3">
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="text-xs font-bold uppercase text-blue-700 mb-1">📚 Recursos de Metodología FlipMentoría</div>
        <p class="text-xs text-blue-900">Estos son los documentos vivos de la metodología — todo lo que el estudiante necesita organizado por etapa. Click para ver en el sistema de Metodología.</p>
      </div>
      ${Object.keys(labels).filter(k => byEtapa[k]).map(k => `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-50 px-4 py-2 border-b border-slate-200 text-sm font-bold">${labels[k]||k} <span class="text-xs text-slate-500">(${byEtapa[k].length})</span></div>
          <ul class="divide-y divide-slate-100">
            ${byEtapa[k].map(d => `
              <li class="px-4 py-2 hover:bg-slate-50 cursor-pointer" onclick="alert('Abrí Metodología FlipMentoría > Biblioteca > buscá: ' + ${JSON.stringify(d.titulo.slice(0,80))})">
                <div class="text-sm font-medium text-slate-900">${d.titulo}</div>
                ${d.subtitulo?`<div class="text-[11px] text-slate-500 mt-0.5">${d.subtitulo}</div>`:''}
                ${(d.tags||[]).length?`<div class="flex flex-wrap gap-1 mt-1">${d.tags.slice(0,5).map(t=>`<span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">${t}</span>`).join('')}</div>`:''}
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  `;
}


// ─── METODOLOGÍA: Planes guardados (de estudiantes del CRM) ───
let fmSavedPlansCache = null;
async function fmLoadSavedPlans() {
  const { data } = await sb.from('edu_student_plans')
    .select('id,student_id,mentorship_id,perfil,status,created_at,bloques_ids')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  // Join con students
  const ids = (data || []).map(p => p.student_id);
  if (!ids.length) { fmSavedPlansCache = []; return; }
  const { data: students } = await sb.from('edu_students')
    .select('id,full_name,grupo,mentorship_id,current_stage')
    .in('id', ids);
  const sMap = {};
  (students || []).forEach(s => { sMap[s.id] = s; });
  fmSavedPlansCache = (data || []).map(p => ({ ...p, student: sMap[p.student_id] }));
}

function fmRenderSavedPlansSection() {
  if (fmSavedPlansCache === null) {
    fmLoadSavedPlans().then(() => fmRender());
    return '';
  }
  if (!fmSavedPlansCache.length) return '';
  return `
    <div class="bg-white border border-slate-200 rounded-xl mb-4 overflow-hidden">
      <div class="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold uppercase text-slate-700">
        📋 Planes ya guardados (vinculados al CRM) — ${fmSavedPlansCache.length}
      </div>
      <ul class="divide-y divide-slate-100 max-h-48 overflow-y-auto">
        ${fmSavedPlansCache.slice(0, 10).map(p => `
          <li class="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2" onclick="fmAbrirPlanGuardado('${p.id}', '${p.student_id}', '${p.mentorship_id}')">
            <div class="min-w-0 flex-1">
              <div class="font-semibold text-sm text-slate-900 truncate">${p.student?.full_name || 'Estudiante'}</div>
              <div class="text-[11px] text-slate-500">${p.perfil?.perfil?.emoji || ''} ${p.perfil?.perfil?.nombre || ''} · ${p.bloques_ids?.length || 0} bloques · ${new Date(p.created_at).toLocaleDateString('es')}</div>
            </div>
            <span class="text-xs text-blue-600">ver →</span>
          </li>
        `).join('')}
        ${fmSavedPlansCache.length > 10 ? `<li class="px-4 py-2 text-[11px] text-slate-500 italic text-center">+${fmSavedPlansCache.length - 10} planes más en Mentorías Manager</li>` : ''}
      </ul>
    </div>
  `;
}

async function fmAbrirPlanGuardado(planId, studentId, mentorshipId) {
  console.log('[fmAbrirPlanGuardado] plan:', planId, 'student:', studentId);

  // Cerrar el modal actual de Metodología si está abierto
  if (typeof closeModal === 'function') {
    try { closeModal(); } catch {}
  }

  // Setear el state del manager
  if (typeof eduState !== 'undefined') {
    if (mentorshipId) eduState.mentorshipId = mentorshipId;
    eduState.selectedStudentId = studentId;
    eduState.tab = 'student_plan';
  }

  // Buscar el sistema edu-manager en TODAS las áreas (no solo current)
  let eduSys = null;
  try {
    const areas = state?.areas || [];
    for (const area of areas) {
      const sys = (area.systems || []).find(s => s.type === 'edu-manager');
      if (sys) { eduSys = sys; break; }
    }
  } catch (e) { console.warn('search sys', e); }

  // Si encontramos el sistema, abrirlo
  if (eduSys && typeof openEduManager === 'function') {
    await openEduManager(eduSys);
    // Cargar el plan específico
    if (typeof eduLoadStudentPlan === 'function') {
      try {
        await eduLoadStudentPlan(studentId);
        if (typeof eduRender === 'function') eduRender();
      } catch (e) { console.warn('loadStudentPlan', e); }
    }
    return;
  }

  // Fallback: si no encuentra el sistema, buscar por nombre / área Educación
  try {
    const areas = state?.areas || [];
    const eduArea = areas.find(a => /educac/i.test(a.name || ''));
    if (eduArea) {
      const sys = (eduArea.systems || []).find(s => s.type === 'edu-manager') || eduArea.systems?.[0];
      if (sys && typeof openEduManager === 'function') {
        await openEduManager(sys);
        if (typeof eduLoadStudentPlan === 'function') {
          await eduLoadStudentPlan(studentId);
          if (typeof eduRender === 'function') eduRender();
        }
        return;
      }
    }
  } catch (e) { console.warn('fallback', e); }

  // Último recurso: alert con instrucciones (sin reload)
  alert('No encontré el sistema "Mentorías Manager" para abrir el plan.\n\nAndá a Educación → Mentorías Manager → buscá el estudiante → Plan Acción.');
}

// ============================================================
// 🎓 WIZARD DE CUALIFICACIÓN PARA PLAN DE ACCIÓN (embed en CRM)
// Reusa FM_DIAG_QUESTIONS y fmCalcularPerfil de Metodología
// State separado de fmState para no colisionar
// ============================================================

const eduWiz = {
  active: false,
  studentId: null,
  answers: {},
  step: 0
};

// Override de eduCrearPlanEstudiante — ahora abre wizard
async function eduCrearPlanEstudiante(studentId) {
  const s = eduState.students.find(x => x.id === studentId);
  if (!s) return alert('Estudiante no encontrado');
  // Pre-llenar respuestas inferibles
  eduWiz.answers = eduInferirDiagnostico(s);
  eduWiz.studentId = studentId;
  eduWiz.step = 0;
  eduWiz.active = true;
  eduMostrarWizard();
}

function eduMostrarWizard() {
  let modal = document.getElementById('edu-wizard-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'edu-wizard-modal';
    modal.className = 'fixed inset-0 z-[110] bg-slate-900/80 overflow-y-auto';
    document.body.appendChild(modal);
  }
  modal.innerHTML = eduRenderWizard();
}

function eduCerrarWizard() {
  eduWiz.active = false;
  const m = document.getElementById('edu-wizard-modal');
  if (m) m.remove();
}

function eduRenderWizard() {
  const s = eduState.students.find(x => x.id === eduWiz.studentId);
  const sName = s?.full_name || 'estudiante';

  // Filtrar preguntas activas (respetar skipIf)
  const activeQs = FM_DIAG_QUESTIONS.filter(q => !q.skipIf || !q.skipIf(eduWiz.answers));
  const total = activeQs.length;
  const step = Math.min(eduWiz.step, total - 1);
  const q = activeQs[step];

  if (!q) return `<div class="p-8 text-white">Calculando...</div>`;

  const answered = Object.keys(eduWiz.answers).filter(k => {
    const v = eduWiz.answers[k];
    return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progress = Math.round((answered / total) * 100);

  return `
    <div class="min-h-screen p-4">
      <div class="max-w-3xl mx-auto bg-white rounded-2xl my-4 shadow-2xl overflow-hidden">
        <div class="bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3 flex items-center justify-between text-white">
          <div>
            <div class="text-xs font-bold opacity-90">🎯 CUALIFICACIÓN PARA PLAN DE ACCIÓN</div>
            <div class="text-base font-bold">${sName}</div>
          </div>
          <button onclick="eduCerrarWizard()" class="text-white/80 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div class="p-5">
          <!-- Progress -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-slate-600 mb-1">
              <span>Pregunta ${step + 1} de ${total}</span>
              <span>${progress}% completado · ${answered} respondidas</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div class="h-full bg-amber-500 transition-all" style="width: ${progress}%"></div>
            </div>
          </div>

          <!-- Pregunta -->
          <div class="border border-slate-200 rounded-xl p-5 mt-3">
            <div class="text-xs font-bold text-amber-700 tracking-wider mb-2">${q.bloque||''} · PREGUNTA ${step + 1}</div>
            <h4 class="text-xl font-bold text-slate-900 mb-4">${q.pregunta}</h4>
            ${eduRenderWizardInput(q)}
          </div>

          <!-- Navegación -->
          <div class="flex items-center justify-between mt-5">
            <button onclick="eduWizBack()" ${step === 0 ? 'disabled' : ''} class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30">← Atrás</button>
            ${q.tipo === 'text' || q.multiSelect ? `
              <button onclick="eduWizNext()" class="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold">Siguiente →</button>
            ` : ''}
            <div class="text-xs text-slate-500">💡 Respuestas pre-llenadas según datos del CRM</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function eduRenderWizardInput(q) {
  if (q.tipo === 'text') {
    const val = eduWiz.answers[q.id] || '';
    return `<input type="text" value="${escapeHtml(val)}" placeholder="${q.placeholder||''}" oninput="eduWiz.answers['${q.id}']=this.value" onkeydown="if(event.key==='Enter')eduWizNext()" class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-amber-500" />`;
  }
  if (q.multiSelect) {
    const vals = Array.isArray(eduWiz.answers[q.id]) ? eduWiz.answers[q.id] : [];
    return `<div class="space-y-2">${q.opciones.map(o => {
      const sel = vals.includes(o.val);
      return `<button onclick="eduWizToggle('${q.id}','${o.val}')" class="w-full text-left px-4 py-3 rounded-lg border-2 transition ${sel?'border-amber-500 bg-amber-50':'border-slate-200 hover:border-amber-300'}">
        <div class="flex items-center gap-3">
          <div class="w-5 h-5 rounded border-2 ${sel?'border-amber-600 bg-amber-600':'border-slate-300'} flex items-center justify-center flex-shrink-0">${sel?'<span class="text-white text-xs">✓</span>':''}</div>
          <span class="text-sm">${o.label}</span>
        </div>
      </button>`;
    }).join('')}</div><p class="text-xs text-slate-500 mt-3">Podés seleccionar varios. Click "Siguiente →"</p>`;
  }
  // Single radio
  return `<div class="space-y-2">${q.opciones.map(o => {
    const sel = eduWiz.answers[q.id] === o.val;
    return `<button onclick="eduWizAnswer('${q.id}','${o.val}')" class="w-full text-left px-4 py-3 rounded-lg border-2 transition ${sel?'border-amber-500 bg-amber-50':'border-slate-200 hover:border-amber-300'}">
      <div class="flex items-center gap-3">
        <div class="w-5 h-5 rounded-full border-2 ${sel?'border-amber-600 bg-amber-600':'border-slate-300'} flex items-center justify-center flex-shrink-0">${sel?'<div class="w-2 h-2 rounded-full bg-white"></div>':''}</div>
        <span class="text-sm">${o.label}</span>
      </div>
    </button>`;
  }).join('')}</div>`;
}

function eduWizAnswer(qid, val) {
  eduWiz.answers[qid] = val;
  const active = FM_DIAG_QUESTIONS.filter(q => !q.skipIf || !q.skipIf(eduWiz.answers));
  const idx = active.findIndex(q => q.id === qid);
  if (idx < active.length - 1) eduWiz.step = idx + 1;
  else return eduWizFinish();
  eduMostrarWizard();
}

function eduWizToggle(qid, val) {
  const cur = Array.isArray(eduWiz.answers[qid]) ? eduWiz.answers[qid] : [];
  eduWiz.answers[qid] = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
  eduMostrarWizard();
}

function eduWizNext() {
  const active = FM_DIAG_QUESTIONS.filter(q => !q.skipIf || !q.skipIf(eduWiz.answers));
  if (eduWiz.step < active.length - 1) { eduWiz.step++; eduMostrarWizard(); }
  else eduWizFinish();
}

function eduWizBack() {
  if (eduWiz.step > 0) { eduWiz.step--; eduMostrarWizard(); }
}

async function eduWizFinish() {
  // Crear plan con respuestas del wizard
  const studentId = eduWiz.studentId;
  const student = eduState.students.find(s => s.id === studentId);
  if (!student) return alert('Estudiante perdido');
  const answers = eduWiz.answers;
  const perfilResult = fmCalcularPerfil(answers);
  const userProfile = {
    mercado: answers.mercado_estado || student.state || student.city || 'USA',
    estrategiaLabel: answers.objetivo === 'flip' ? 'Fix & Flip' :
                     answers.objetivo === 'hold' ? 'Fix & Hold' :
                     answers.objetivo === 'wholesale' ? 'Wholesaling' :
                     answers.objetivo === 'hibrido' ? 'Mix Flip + Hold' : 'Fix & Flip'
  };
  const bloques = fmGenerarBloques(userProfile, answers);

  // Archivar plan anterior
  await sb.from('edu_student_plans').update({ status: 'archived' }).eq('student_id', studentId).eq('status', 'active');

  // Crear nuevo
  const { data: plan, error } = await sb.from('edu_student_plans').insert({
    student_id: studentId,
    mentorship_id: student.mentorship_id,
    diagnostico: answers,
    perfil: { ...perfilResult, userProfile },
    bloques_ids: bloques.map(b => b.id),
    modo: 'completo',
    status: 'active'
  }).select().single();
  if (error) { alert('Error: '+error.message); return; }

  // Tasks
  const tasks = [];
  bloques.forEach((b, bIdx) => {
    const pasos = typeof b.pasos === 'function' ? b.pasos(userProfile, answers) : (b.pasos || []);
    pasos.forEach((paso, pIdx) => {
      tasks.push({
        plan_id: plan.id, student_id: studentId,
        bloque_id: b.id, bloque_etapa: b.etapa, bloque_subetapa: b.subetapa,
        bloque_orden: bIdx, paso_index: pIdx, paso_text: paso, completed: false
      });
    });
  });
  if (tasks.length) await sb.from('edu_student_plan_tasks').insert(tasks);

  eduCerrarWizard();
  alert(`✅ Plan creado para ${student.full_name}\n\n${bloques.length} bloques · ${tasks.length} tareas`);
  await eduLoadStudentPlan(studentId);
  eduRender();
}

// ============================================================
// 🔍 BUSCADOR INTELIGENTE (lenguaje natural)
// ============================================================
function eduParseSearchQuery(q) {
  const filters = { text: '', status: null, payment: null, stage: null, group: null, only: [] };
  if (!q || typeof q !== 'string') return filters;
  let text = q.toLowerCase();

  // STATUS
  if (/\b(inactiv|expirad|abandonad|dropped)\b/.test(text)) { filters.status = 'dropped'; text = text.replace(/\b(inactiv\w*|expirad\w*|abandonad\w*|dropped)\b/g, ''); }
  if (/\bactiv\w*\b/.test(text) && !/\binactiv\w*\b/.test(q.toLowerCase())) { filters.status = 'active'; text = text.replace(/\bactiv\w*\b/g, ''); }
  if (/\b(paus\w*|pause)\b/.test(text)) { filters.status = 'paused'; text = text.replace(/\b(paus\w*|pause)\b/g, ''); }
  if (/\b(graduad\w*)\b/.test(text)) { filters.status = 'graduated'; text = text.replace(/\b(graduad\w*)\b/g, ''); }
  if (/\b(en\s+riesgo|at\s*risk|riesgo)\b/.test(text)) { filters.status = 'at_risk'; text = text.replace(/\b(en\s+riesgo|at\s*risk|riesgo)\b/g, ''); }

  // PAYMENT
  if (/\b(pago\s+(vencid|atrasad|cancelad)|impagos?|sin\s+pagar)\b/.test(text)) {
    if (/\bvencid\w*\b/.test(text)) filters.payment = 'expired';
    else if (/\batrasad\w*\b/.test(text)) filters.payment = 'past_due';
    else filters.payment = 'expired';
    text = text.replace(/\b(pago\s+(vencid|atrasad|cancelad)\w*|impagos?|sin\s+pagar)\b/g, '');
  }
  if (/\b(al\s+d[ií]a|pago\s+ok)\b/.test(text)) { filters.payment = 'active'; text = text.replace(/\b(al\s+d[ií]a|pago\s+ok)\b/g, ''); }

  // ETAPA: "etapa X" / "en X"
  const stageMatch = text.match(/\b(etapa|en)\s+([a-záéíóúñ][\wáéíóúñ\s]{2,30}?)(?:\s+(?:con|y|de|que)|$|,)/);
  if (stageMatch) { filters.stage = stageMatch[2].trim(); text = text.replace(stageMatch[0], ''); }

  // GROUP / MENTORÍA: "mentoría X" o nombres tipo "privada", "inversores"
  const groupMatch = text.match(/\b(mentor[ií]a|grupo)\s+([a-záéíóúñ][\wáéíóúñ\s]{2,30}?)(?:\s+(?:con|y|de|que)|$|,)/);
  if (groupMatch) { filters.group = groupMatch[2].trim(); text = text.replace(groupMatch[0], ''); }
  if (/\b(privada)\b/.test(text)) { filters.group = filters.group || 'Privada'; text = text.replace(/\bprivada\b/g, ''); }
  if (/\b(inversor\w*)\b/.test(text) && !filters.group) { filters.group = 'Inversor'; text = text.replace(/\binversor\w*\b/g, ''); }

  // SIN CONTACTO / SIN SEGUIMIENTO
  if (/\b(sin\s+contacto|sin\s+seguimiento)\b/.test(text)) { filters.only.push('sin_contacto_30d'); text = text.replace(/\bsin\s+(contacto|seguimiento)\b/g, ''); }
  if (/\bestancad\w*\b/.test(text)) { filters.only.push('estancado'); text = text.replace(/\bestancad\w*\b/g, ''); }
  if (/\b(vence|por\s+vencer)\b/.test(text)) { filters.only.push('vence_30d'); text = text.replace(/\b(vence|por\s+vencer)\b/g, ''); }

  filters.text = text.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  return filters;
}

function eduAplicarBusquedaInteligente(students, query) {
  if (!query) return students;
  const f = eduParseSearchQuery(query);
  const now = Date.now();
  const dayMs = 86400000;
  return students.filter(s => {
    if (f.status && s.status !== f.status) return false;
    if (f.payment) {
      if (f.payment === 'expired' && !['expired','cancelled','past_due'].includes(s.payment_status)) return false;
      else if (f.payment !== 'expired' && s.payment_status !== f.payment) return false;
    }
    if (f.stage && !(s.current_stage||'').toLowerCase().includes(f.stage.toLowerCase())) return false;
    if (f.group && !(s.grupo||'').toLowerCase().includes(f.group.toLowerCase())) return false;
    if (f.only.includes('sin_contacto_30d')) {
      const last = s.ultima_fecha_seguimiento || s.enrolled_at;
      if (!last || Math.floor((now - new Date(last).getTime()) / dayMs) <= 30) return false;
    }
    if (f.only.includes('estancado')) {
      if (!s.stage_started_at) return false;
      if (Math.floor((now - new Date(s.stage_started_at).getTime()) / dayMs) < 60) return false;
    }
    if (f.only.includes('vence_30d')) {
      if (!s.expires_at) return false;
      const d = Math.floor((new Date(s.expires_at).getTime() - now) / dayMs);
      if (d < 0 || d > 30) return false;
    }
    if (f.text) {
      const blob = `${s.full_name||''} ${s.email||''} ${s.city||''} ${s.grupo||''} ${s.current_stage||''}`.toLowerCase();
      const words = f.text.split(/\s+/).filter(w => w.length > 1);
      for (const w of words) if (!blob.includes(w)) return false;
    }
    return true;
  });
}

// Mostrar los filtros detectados (debug visual)
function eduDescribirFiltros(query) {
  if (!query) return '';
  const f = eduParseSearchQuery(query);
  const parts = [];
  if (f.status) parts.push(`status=<b>${f.status}</b>`);
  if (f.payment) parts.push(`pago=<b>${f.payment}</b>`);
  if (f.stage) parts.push(`etapa contiene "<b>${f.stage}</b>"`);
  if (f.group) parts.push(`grupo contiene "<b>${f.group}</b>"`);
  f.only.forEach(o => parts.push(`<b>${o}</b>`));
  if (f.text) parts.push(`texto: "<b>${f.text}</b>"`);
  return parts.length ? parts.join(' · ') : 'sin filtros detectados';
}

// ─── Vincular plan generado en Metodología → estudiante del CRM ───
async function fmAbrirVincularEstudiante() {
  // Cargar todos los estudiantes (todas las mentorías)
  const { data: students } = await sb.from('edu_students')
    .select('id,full_name,grupo,mentorship_id,current_stage,email')
    .order('full_name');
  if (!students?.length) return alert('Sin estudiantes en el CRM. Sincronizá primero.');

  // Modal con buscador + lista
  const modal = document.createElement('div');
  modal.id = 'fm-link-student-modal';
  modal.className = 'fixed inset-0 z-[120] bg-slate-900/80 overflow-y-auto';
  modal.innerHTML = `
    <div class="min-h-screen p-4 flex items-start justify-center">
      <div class="max-w-2xl w-full bg-white rounded-2xl my-4 shadow-2xl overflow-hidden">
        <div class="bg-amber-500 px-5 py-3 flex items-center justify-between text-slate-900">
          <div class="font-bold text-sm">💾 Vincular plan a estudiante del CRM</div>
          <button onclick="document.getElementById('fm-link-student-modal').remove()" class="text-2xl leading-none">×</button>
        </div>
        <div class="p-4">
          <input id="fm-link-search" type="text" placeholder="🔍 Buscar por nombre, email o grupo..." oninput="fmLinkSearchFilter()" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-sm" />
          <div id="fm-link-results" class="mt-3 max-h-[60vh] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
            ${students.slice(0, 30).map(s => `
              <div onclick="fmLinkPlanAStudiante('${s.id}', '${s.mentorship_id}')" class="p-3 hover:bg-amber-50 cursor-pointer">
                <div class="font-semibold text-sm text-slate-900">${s.full_name}</div>
                <div class="text-[11px] text-slate-500">${s.grupo||''} ${s.current_stage?'· '+s.current_stage:''} ${s.email?'· '+s.email:''}</div>
              </div>
            `).join('')}
          </div>
          <div class="mt-2 text-[10px] text-slate-500">Mostrando primeros 30. Escribí para filtrar.</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // Guardar lista global para filtrar
  window._fmLinkStudents = students;
}

function fmLinkSearchFilter() {
  const q = (document.getElementById('fm-link-search').value || '').toLowerCase().trim();
  const all = window._fmLinkStudents || [];
  const filtered = q ? all.filter(s => `${s.full_name||''} ${s.email||''} ${s.grupo||''} ${s.current_stage||''}`.toLowerCase().includes(q)) : all;
  const container = document.getElementById('fm-link-results');
  if (!container) return;
  container.innerHTML = filtered.slice(0, 50).map(s => `
    <div onclick="fmLinkPlanAStudiante('${s.id}', '${s.mentorship_id}')" class="p-3 hover:bg-amber-50 cursor-pointer">
      <div class="font-semibold text-sm text-slate-900">${s.full_name}</div>
      <div class="text-[11px] text-slate-500">${s.grupo||''} ${s.current_stage?'· '+s.current_stage:''} ${s.email?'· '+s.email:''}</div>
    </div>
  `).join('') || '<div class="p-4 text-center text-slate-400 text-xs">Sin resultados</div>';
}

async function fmLinkPlanAStudiante(studentId, mentorshipId) {
  if (!fmState.diagResult) return alert('Sin resultado del diagnóstico');
  if (!studentId) return alert('Falta el ID del estudiante');
  if (!confirm('¿Vincular este plan al estudiante seleccionado? Si ya tenía plan activo, se archivará.')) return;

  // VALIDACIÓN FK: verificar que el estudiante exista en la DB
  const { data: existsStudent, error: chkErr } = await sb.from('edu_students')
    .select('id, full_name, mentorship_id')
    .eq('id', studentId)
    .maybeSingle();
  if (chkErr) return alert('Error validando estudiante: ' + chkErr.message);
  if (!existsStudent) return alert('El estudiante no existe en la DB. Sincronizá Mentorías Manager y reintentá.');

  const finalMentorshipId = mentorshipId || existsStudent.mentorship_id;

  const r = fmState.diagResult;
  const answers = r.answers || {};

  // Calcular bloques
  const userProfile = {
    mercado: answers.mercado_estado || 'tu mercado',
    estrategiaLabel: answers.objetivo === 'flip' ? 'Fix & Flip' :
                     answers.objetivo === 'hold' ? 'Fix & Hold' :
                     answers.objetivo === 'wholesale' ? 'Wholesaling' :
                     answers.objetivo === 'hibrido' ? 'Mix Flip + Hold' : 'Fix & Flip'
  };
  const bloques = fmGenerarBloques(userProfile, answers);

  // Capturar TODA la data enriquecida (igual que eduProcessPendingInvites)
  let objetivoOperativo = '', reglaPlan = '', analisisProfundo = [], checklistFinal = [], fraseFinal = '', riesgos = [];
  try { if (typeof fmGenerarObjetivoOperativo === 'function') objetivoOperativo = fmGenerarObjetivoOperativo(userProfile, answers); } catch {}
  try { if (typeof fmGenerarReglaPlan === 'function') reglaPlan = fmGenerarReglaPlan(r.perfil, answers); } catch {}
  try { if (typeof fmGenerarAnalisisProfundo === 'function') analisisProfundo = fmGenerarAnalisisProfundo(r.perfil, r, answers, userProfile); } catch {}
  try { if (typeof fmGenerarChecklistFinal === 'function') checklistFinal = fmGenerarChecklistFinal(bloques, answers); } catch {}
  try { if (typeof fmGenerarFraseFinal === 'function') fraseFinal = fmGenerarFraseFinal(userProfile, answers); } catch {}
  try { if (typeof fmGenerarRiesgos === 'function') riesgos = fmGenerarRiesgos(answers, r.perfil); } catch {}

  const bloquesData = bloques.map(b => ({
    id: b.id,
    etapa: b.etapa || '',
    subetapa: b.subetapa || '',
    titulo: b.titulo || '',
    actividad: typeof b.actividad === 'function' ? b.actividad(userProfile, answers) : (b.actividad || ''),
    descripcion: b.descripcion || '',
    tiempo: b.tiempo || '',
    pasos: typeof b.pasos === 'function' ? b.pasos(userProfile, answers) : (b.pasos || []),
    criterios_exito: b.criterios_exito || [],
    herramientas: b.herramientas || [],
    errores_comunes: b.errores_comunes || []
  }));

  const fullPlanData = {
    ...r,
    perfil: r.perfil || {},
    userProfile,
    objetivo_operativo: objetivoOperativo,
    regla_plan: reglaPlan,
    analisis_profundo: analisisProfundo,
    fortalezas: r.fortalezas || [],
    riesgos,
    bloques: bloquesData,
    checklist_final: checklistFinal,
    frase_final: fraseFinal,
    fromMentor: true,
    generated_at: new Date().toISOString()
  };

  // Archivar plan previo activo
  await sb.from('edu_student_plans').update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('student_id', studentId).eq('status', 'active');

  // Crear plan con retry si duplicate key
  const planPayload = {
    student_id: studentId,
    mentorship_id: finalMentorshipId,
    diagnostico: answers,
    perfil: fullPlanData,
    bloques_ids: bloques.map(b => b.id),
    modo: 'completo',
    status: 'active'
  };
  let { data: plan, error } = await sb.from('edu_student_plans').insert(planPayload).select().single();

  if (error && /duplicate key|unique constraint/i.test(error.message || '')) {
    const { data: oldPlans } = await sb.from('edu_student_plans').select('id').eq('student_id', studentId).eq('status', 'active');
    for (const op of (oldPlans || [])) await sb.from('edu_student_plan_tasks').delete().eq('plan_id', op.id);
    await sb.from('edu_student_plans').delete().eq('student_id', studentId).eq('status', 'active');
    const retry = await sb.from('edu_student_plans').insert(planPayload).select().single();
    plan = retry.data; error = retry.error;
  }
  if (error) return alert('Error creando plan: ' + error.message);

  // Insertar tasks
  const tasks = [];
  bloques.forEach((b, bIdx) => {
    const pasos = typeof b.pasos === 'function' ? b.pasos(userProfile, answers) : (b.pasos || []);
    pasos.forEach((paso, pIdx) => {
      tasks.push({
        plan_id: plan.id, student_id: studentId,
        bloque_id: b.id, bloque_etapa: b.etapa, bloque_subetapa: b.subetapa,
        bloque_orden: bIdx, paso_index: pIdx, paso_text: paso, completed: false
      });
    });
  });
  if (tasks.length) {
    const { error: tErr } = await sb.from('edu_student_plan_tasks').insert(tasks);
    if (tErr) console.warn('[fmLinkPlan tasks]', tErr);
  }

  // Cerrar modal y notificar
  document.getElementById('fm-link-student-modal')?.remove();
  const student = (window._fmLinkStudents || []).find(s => s.id === studentId);
  alert(`✅ Plan vinculado a ${student?.full_name || 'estudiante'}\n\n${bloques.length} bloques · ${tasks.length} tareas\n\nLo podés ver en Mentorías Manager → ${student?.full_name} → Plan Acción`);

  // Refrescar cache de planes guardados
  fmSavedPlansCache = null;
}

// ════════════════════════════════════════════════════════════
// Las siguientes secciones se movieron a archivos separados:
// • edu/edu-credit.js     — Diagnóstico de crédito (FM_CREDIT_QUESTIONS + fmCredit*)
// • edu/edu-reports.js    — Informe ejecutivo + KPIs + IA narrativa
// Cargados después de education.js en index.html y scripts/build.mjs
// para preservar el orden de inicialización.
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
// 📥 EXPORT CSV de estudiantes (respeta filtros actuales)
// ════════════════════════════════════════════════════════════
function eduExportStudentsCSV() {
  const students = eduMyStudents();
  let filtered = eduAplicarBusquedaInteligente(students, eduState.searchQuery||'');
  if (eduState.stageFilter && eduState.stageFilter !== 'all') filtered = filtered.filter(s => s.current_stage === eduState.stageFilter);
  if (eduState.statusFilter && eduState.statusFilter !== 'all') filtered = filtered.filter(s => s.status === eduState.statusFilter);
  if (!filtered.length) { alert('Sin estudiantes con esos filtros.'); return; }

  const m = eduCurrentMentorship();
  const stageName = key => (m?.stages || []).find(s => s.key === key)?.name || key || '';

  // Columnas estándar para outreach + análisis
  const cols = [
    { k: 'full_name', label: 'Nombre' },
    { k: 'email', label: 'Email' },
    { k: 'phone', label: 'Teléfono' },
    { k: 'city', label: 'Ciudad' },
    { k: 'grupo', label: 'Grupo' },
    { k: 'current_stage', label: 'Etapa', map: stageName },
    { k: 'status', label: 'Status' },
    { k: 'payment_status', label: 'Pago' },
    { k: 'enrolled_at', label: 'Inscripción' },
    { k: 'stage_started_at', label: 'Inicio etapa' },
    { k: 'expires_at', label: 'Vence' },
    { k: 'ultima_fecha_seguimiento', label: 'Último contacto' }
  ];

  const escape = v => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const header = cols.map(c => c.label).join(',');
  const rows = filtered.map(s => cols.map(c => escape(c.map ? c.map(s[c.k]) : s[c.k])).join(','));
  const csv = [header, ...rows].join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `estudiantes-${(m?.name||'mentoria').replace(/\s+/g,'_').toLowerCase()}-${fecha}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════════
// ⚠️ Estudiantes en riesgo — heurística rápida
// 7+ días sin actividad o stage_started_at > 60 días sin avance
// ════════════════════════════════════════════════════════════
function eduStudentsEnRiesgo() {
  const students = eduMyStudents().filter(s => s.status === 'active' || s.status === 'at_risk');
  const now = Date.now();
  const dayMs = 86400000;
  return students.filter(s => {
    const last = s.ultima_fecha_seguimiento;
    if (last) {
      const dias = Math.floor((now - new Date(last).getTime()) / dayMs);
      if (dias > 7) return true;
    }
    const stageStart = s.stage_started_at;
    if (stageStart) {
      const dias = Math.floor((now - new Date(stageStart).getTime()) / dayMs);
      if (dias > 60) return true;
    }
    if (s.payment_status === 'past_due' || s.payment_status === 'expired') return true;
    return false;
  }).map(s => {
    const last = s.ultima_fecha_seguimiento ? Math.floor((now - new Date(s.ultima_fecha_seguimiento).getTime()) / dayMs) : null;
    const reason = !last ? 'Sin contacto registrado' :
      last > 30 ? `${last}d sin contacto` :
      last > 7 ? `${last}d sin contacto` :
      s.payment_status === 'past_due' ? 'Pago atrasado' :
      s.payment_status === 'expired' ? 'Pago vencido' :
      'Estancado en etapa';
    return { ...s, _riskReason: reason, _daysWithoutContact: last };
  }).sort((a, b) => (b._daysWithoutContact || 0) - (a._daysWithoutContact || 0));
}

// ════════════════════════════════════════════════════════════
// ✅ TAREAS — vista global de tareas de todos los estudiantes
// Lee edu_student_plan_tasks de TODOS los planes activos del mentor.
// Permite marcar/desmarcar inline y filtrar por estudiante/etapa/estado.
// ════════════════════════════════════════════════════════════
const eduTasksState = { loaded: false, all: [], filterStudent: 'all', filterStatus: 'pending', sortBy: 'bloque' };

async function eduLoadAllTasks() {
  const students = eduMyStudents();
  if (!students.length) { eduTasksState.all = []; eduTasksState.loaded = true; return; }
  const studentIds = students.map(s => s.id);
  // Chunk si hay más de 50 estudiantes
  const chunks = [];
  for (let i = 0; i < studentIds.length; i += 50) chunks.push(studentIds.slice(i, i+50));
  const allTasks = [];
  for (const ids of chunks) {
    const { data } = await sb.from('edu_student_plan_tasks')
      .select('*')
      .in('student_id', ids)
      .order('completed', { ascending: true })
      .order('bloque_orden')
      .order('paso_index')
      .limit(1000);
    if (data) allTasks.push(...data);
  }
  eduTasksState.all = allTasks;
  eduTasksState.loaded = true;
}

function eduRenderTasksOverview() {
  if (!eduTasksState.loaded) {
    eduLoadAllTasks().then(() => eduRender());
    return '<div class="p-8 text-center text-slate-400">⏳ Cargando tareas...</div>';
  }
  const students = eduMyStudents();
  const studentById = Object.fromEntries(students.map(s => [s.id, s]));
  const myStudentIds = new Set(students.map(s => s.id));

  let tasks = eduTasksState.all.filter(t => myStudentIds.has(t.student_id));

  if (eduTasksState.filterStudent !== 'all') {
    tasks = tasks.filter(t => t.student_id === eduTasksState.filterStudent);
  }
  if (eduTasksState.filterStatus === 'pending') tasks = tasks.filter(t => !t.completed);
  else if (eduTasksState.filterStatus === 'done') tasks = tasks.filter(t => t.completed);

  // KPIs
  const total = eduTasksState.all.filter(t => myStudentIds.has(t.student_id)).length;
  const done = eduTasksState.all.filter(t => myStudentIds.has(t.student_id) && t.completed).length;
  const pct = total ? Math.round(done/total*100) : 0;

  // Agrupar por estudiante
  const byStudent = {};
  tasks.forEach(t => {
    if (!byStudent[t.student_id]) byStudent[t.student_id] = [];
    byStudent[t.student_id].push(t);
  });

  const studentOpts = `<option value="all">Todos los estudiantes</option>` + students.map(s => `<option value="${s.id}" ${eduTasksState.filterStudent===s.id?'selected':''}>${(s.full_name||'—').replace(/</g,'&lt;')}</option>`).join('');

  return `
    <div class="space-y-3">
      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-slate-900 text-white rounded-xl p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Total tareas</div>
          <div class="text-2xl font-bold">${total}</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">Completadas</div>
          <div class="text-2xl font-bold text-emerald-900">${done}</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Pendientes</div>
          <div class="text-2xl font-bold text-amber-900">${total - done}</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div class="text-[10px] text-blue-700 uppercase font-bold">% Avance global</div>
          <div class="text-2xl font-bold text-blue-900">${pct}%</div>
          <div class="h-1.5 bg-blue-200 rounded-full mt-1 overflow-hidden"><div class="h-full bg-blue-600" style="width:${pct}%"></div></div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex items-center gap-2 flex-wrap">
        <select onchange="eduTasksState.filterStudent=this.value; eduRender()" class="border border-slate-300 rounded px-2 py-1.5 text-xs font-bold">${studentOpts}</select>
        <div class="flex bg-slate-100 rounded p-0.5 text-xs font-bold">
          <button onclick="eduTasksState.filterStatus='all'; eduRender()" class="px-2 py-1 rounded ${eduTasksState.filterStatus==='all'?'bg-white shadow':''}">Todas</button>
          <button onclick="eduTasksState.filterStatus='pending'; eduRender()" class="px-2 py-1 rounded ${eduTasksState.filterStatus==='pending'?'bg-white shadow':''}">Pendientes</button>
          <button onclick="eduTasksState.filterStatus='done'; eduRender()" class="px-2 py-1 rounded ${eduTasksState.filterStatus==='done'?'bg-white shadow':''}">Hechas</button>
        </div>
        <button onclick="eduTasksState.loaded=false; eduRender()" class="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded font-bold">🔄 Refrescar</button>
        <div class="ml-auto text-[10px] text-slate-500">${tasks.length} tarea(s) visible(s)</div>
      </div>

      <!-- Lista de tareas agrupadas por estudiante -->
      ${Object.keys(byStudent).length === 0 ? `
        <div class="text-center py-12 text-slate-400 text-sm">
          ${eduTasksState.filterStatus==='pending' ? '🎉 Sin tareas pendientes con esos filtros.' : 'Sin tareas para mostrar.'}
        </div>
      ` : Object.entries(byStudent).map(([studentId, sTasks]) => {
        const s = studentById[studentId];
        if (!s) return '';
        const sDone = sTasks.filter(t => t.completed).length;
        const sPct = sTasks.length ? Math.round(sDone/sTasks.length*100) : 0;
        // Agrupar por bloque dentro del estudiante
        const byBloque = {};
        sTasks.forEach(t => {
          const key = `${t.bloque_orden}-${t.bloque_id}`;
          if (!byBloque[key]) byBloque[key] = { etapa: t.bloque_etapa, subetapa: t.bloque_subetapa, tasks: [] };
          byBloque[key].tasks.push(t);
        });
        return `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-50 px-3 py-2 flex items-center justify-between border-b border-slate-100">
              <div class="flex-1 min-w-0">
                <button onclick="eduOpenStudent('${s.id}')" class="font-bold text-sm hover:underline text-left">${(s.full_name||'—').replace(/</g,'&lt;')}</button>
                <div class="text-[10px] text-slate-500">${(s.grupo || s.current_stage || '—').replace(/</g,'&lt;')}</div>
              </div>
              <div class="text-xs text-slate-600 whitespace-nowrap">${sDone}/${sTasks.length} (${sPct}%)</div>
            </div>
            <div class="divide-y divide-slate-100">
              ${Object.values(byBloque).map(bg => `
                <div class="px-3 py-2">
                  <div class="text-[10px] font-bold uppercase text-slate-500 mb-1">${(bg.etapa||'').replace(/</g,'&lt;')}${bg.subetapa?` · ${bg.subetapa.replace(/</g,'&lt;')}`:''}</div>
                  <ul class="space-y-1">
                    ${bg.tasks.map(t => `
                      <li class="flex items-start gap-2 text-sm">
                        <input type="checkbox" ${t.completed?'checked':''} onchange="eduToggleTaskCompletedOverview('${t.id}')" class="mt-0.5 cursor-pointer w-4 h-4"/>
                        <span class="flex-1 ${t.completed?'line-through text-slate-400':'text-slate-800'}">${(t.paso_text||'').replace(/</g,'&lt;')}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function eduToggleTaskCompletedOverview(taskId) {
  const t = eduTasksState.all.find(x => x.id === taskId);
  if (!t) return;
  const newVal = !t.completed;
  t.completed = newVal;
  t.completed_at = newVal ? new Date().toISOString() : null;
  eduRender();
  try {
    await sb.from('edu_student_plan_tasks').update({
      completed: newVal,
      completed_at: newVal ? new Date().toISOString() : null,
      completed_by: state.user?.id || null
    }).eq('id', taskId);
  } catch (e) {
    // rollback
    t.completed = !newVal;
    eduRender();
    alert('Error guardando: ' + e.message);
  }
}

// ════════════════════════════════════════════════════════════
// 🎓 CERTIFICADO de finalización — HTML imprimible (PDF via window.print)
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
// 📨 Compartir formulario de diagnóstico con el estudiante
// Genera link único token-based. El estudiante completa solo y al
// terminar el mentor recibe el diagnóstico listo para generar plan.
// ════════════════════════════════════════════════════════════
async function eduShareDiagnosticForm(studentId) {
  console.log('[eduShareDiagnosticForm] studentId:', studentId);
  try {

  const s = (eduState.students || []).find(x => x.id === studentId);
  if (!s) {
    console.error('[eduShareDiagnosticForm] estudiante no encontrado:', studentId);
    return alert('Estudiante no encontrado');
  }

  // Si ya tiene una invite reciente (con o sin plan), reusarla:
  // si tiene plan → link al portal; si no → link al diagnóstico
  const { data: existing, error: exErr } = await sb.from('edu_diagnostic_invites')
    .select('*')
    .eq('student_id', studentId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exErr) {
    console.warn('[eduShareDiagnosticForm] error buscando invite existente:', exErr);
    // Sigue al flujo de crear nueva — si la tabla falta acá igual lo dice
  }

  if (existing) {
    console.log('[eduShareDiagnosticForm] reusando invite existente', existing.token);
    return eduShowShareModal(s, existing, !!existing.result_plan_id);
  }

  // Generar invite NUEVA — vacía (sin respuestas, sin plan)
  // El estudiante va a abrir el link y completar las 21 preguntas.
  // Cuando termine, el auto-procesamiento (cada 2 min en la app del mentor)
  // genera el plan automáticamente y el estudiante es redirigido al portal.
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const invitePayload = {
    token,
    student_id: studentId,
    mentorship_id: s.mentorship_id,
    created_by: state.user?.id || null
  };

  const { data: invite, error: invErr } = await sb.from('edu_diagnostic_invites').insert(invitePayload).select().single();
  if (invErr) {
    if (/relation .* does not exist|Could not find the table/i.test(invErr.message)) {
      return alert('❌ Falta correr el SQL para crear la tabla edu_diagnostic_invites.\n\nAndá a Supabase → SQL Editor → pegá supabase/edu-diagnostic-invites-schema.sql y corré.');
    }
    if (/row.level security/i.test(invErr.message) || invErr.code === '42501') {
      return alert('❌ RLS bloqueó el insert. Verificá que existe la policy "edu_diag_inv_insert_authed" en Supabase.');
    }
    return alert('Error creando link: ' + invErr.message);
  }

  const { data: verify } = await sb.from('edu_diagnostic_invites').select('id, token').eq('token', token).maybeSingle();
  if (!verify) {
    return alert('⚠️ La invitación se creó pero no la puedo leer con el token.\n\nVerificá la policy "edu_diag_inv_select_all" en edu_diagnostic_invites.');
  }

  console.log('[eduShareDiagnosticForm] invite OK:', invite.token);
  eduShowShareModal(s, invite, false);

  } catch (e) {
    console.error('[eduShareDiagnosticForm] error inesperado:', e);
    alert('Error inesperado: ' + (e.message || String(e)) + '\n\nAbrí la consola (F12 → Console) y mandame el error completo.');
  }
}

// Modal compartido (usado tanto para invites nuevas como existentes con plan)
function eduShowShareModal(s, invite, hasPlan) {
  const baseUrl = window.location.origin;
  // Si ya tiene plan, link al portal; si no, al diagnóstico
  const link = hasPlan
    ? `${baseUrl}/mi-plan?t=${invite.token}`
    : `${baseUrl}/diag?t=${invite.token}`;

  const nombre = (s.full_name || '').split(' ')[0];

  const waMsg = hasPlan
    ? `¡Hola ${nombre}! 👋\n\nAcá tenés tu plan de acción personalizado de FlipMentoría:\n\n${link}\n\nEn el portal podés marcar cada tarea a medida que la completás. Yo voy a ir viendo tu progreso en tiempo real.\n\nVamos. 💪`
    : `¡Hola ${nombre}! 👋\n\nSoy tu mentor de FlipMentoría. Antes de nuestra próxima sesión, completá este diagnóstico de 21 preguntas (5-7 minutos):\n\n${link}\n\nApenas termines, te llevo automático a tu portal personalizado con todas las tareas que tenés que hacer.\n\nCualquier duda, decime. 💪`;

  const phoneClean = typeof eduCleanPhone === 'function' ? eduCleanPhone(s.phone) : (s.phone||'').replace(/\D/g,'');
  const waUrl = phoneClean && phoneClean.length >= 10
    ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(waMsg)}`
    : null;

  openModal((hasPlan ? '🎯 Portal del estudiante · ' : '📨 Formulario compartible · ') + (s.full_name||''), `
    <div class="space-y-3">
      <div class="${hasPlan ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-blue-50 border-blue-200 text-blue-900'} border rounded p-3 text-xs">
        ${hasPlan
          ? `<strong>Este estudiante ya completó el diagnóstico</strong> y tiene su plan generado. Este es el link al portal donde marca sus tareas. Lo podés compartir las veces que quieras — es el mismo link siempre.`
          : `Generé un link único para que <strong>${(s.full_name||'').replace(/</g,'&lt;')}</strong> complete el diagnóstico por su cuenta. Cuando termine, queda redirigido a su portal de tareas. Tiene 30 días de vigencia.`}
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">🔗 ${hasPlan ? 'Link al portal de tareas' : 'Link del diagnóstico'}</label>
        <div class="flex gap-2">
          <input type="text" readonly value="${link}" class="flex-1 border border-slate-300 rounded px-2 py-2 text-xs font-mono bg-slate-50" onclick="this.select()"/>
          <button onclick="navigator.clipboard.writeText('${link}'); this.textContent='✓ Copiado'; setTimeout(()=>this.textContent='📋 Copiar', 1500)" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded">📋 Copiar</button>
        </div>
        <div class="text-[10px] text-slate-500 mt-1">⚠️ No compartas este link con otra persona — está asociado al estudiante.</div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">📱 Mensaje WhatsApp pre-armado</label>
        <textarea rows="8" class="w-full border border-emerald-300 rounded p-2 text-xs font-mono">${waMsg.replace(/</g,'&lt;')}</textarea>
      </div>

      ${hasPlan ? `<div class="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900">
        💡 Si querés <strong>regenerar el plan desde cero</strong> (nuevo diagnóstico), borrá la invite vieja desde Supabase o pedile al estudiante que vaya al diagnóstico de nuevo.
      </div>` : ''}

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cerrar</button>
        <a href="${link}" target="_blank" class="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded text-center">👁️ Ver portal</a>
        ${waUrl ? `<a href="${waUrl}" target="_blank" onclick="closeModal()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded text-center">💬 WhatsApp</a>` : `<button disabled class="flex-1 bg-slate-300 text-white text-sm font-bold py-2 rounded">📞 Sin tel</button>`}
      </div>
    </div>
  `);
}

// Procesar invitaciones completadas — generar plan automático
async function eduProcessPendingInvites() {
  try {
    const { data: pending } = await sb.from('edu_diagnostic_invites')
      .select('*')
      .not('completed_at', 'is', null)
      .is('result_plan_id', null)
      .limit(20);

    if (!pending || pending.length === 0) return 0;

    let processed = 0;
    for (const inv of pending) {
      if (!inv.student_id || !inv.answers) continue;
      try {
        // Generar plan con las respuestas del estudiante
        if (typeof fmCalcularPerfil !== 'function' || typeof fmGenerarBloques !== 'function') continue;

        const answers = inv.answers;
        const perfilResult = fmCalcularPerfil(answers);
        const userProfile = {
          mercado: answers.mercado_estado,
          estrategiaLabel: answers.objetivo === 'flip' ? 'Fix & Flip' :
                           answers.objetivo === 'hold' ? 'Fix & Hold' :
                           answers.objetivo === 'wholesale' ? 'Wholesaling' :
                           answers.objetivo === 'hibrido' ? 'Mix Flip + Hold' : 'Fix & Flip'
        };
        const bloques = fmGenerarBloques(userProfile, answers);

        // ── Capturar TODA la data enriquecida para el portal del estudiante ──
        let objetivoOperativo = '', reglaPlan = '', analisisProfundo = [], checklistFinal = [], fraseFinal = '', riesgos = [];
        try { if (typeof fmGenerarObjetivoOperativo === 'function') objetivoOperativo = fmGenerarObjetivoOperativo(userProfile, answers); } catch {}
        try { if (typeof fmGenerarReglaPlan === 'function') reglaPlan = fmGenerarReglaPlan(perfilResult, answers); } catch {}
        try { if (typeof fmGenerarAnalisisProfundo === 'function') analisisProfundo = fmGenerarAnalisisProfundo(perfilResult, perfilResult, answers, userProfile); } catch {}
        try { if (typeof fmGenerarChecklistFinal === 'function') checklistFinal = fmGenerarChecklistFinal(bloques, answers); } catch {}
        try { if (typeof fmGenerarFraseFinal === 'function') fraseFinal = fmGenerarFraseFinal(userProfile, answers); } catch {}
        try { if (typeof fmGenerarRiesgos === 'function') riesgos = fmGenerarRiesgos(answers, perfilResult); } catch {}

        // Serializar bloques con TODA la metadata
        const bloquesData = bloques.map(b => {
          const pasos = typeof b.pasos === 'function' ? b.pasos(userProfile, answers) : (b.pasos || []);
          return {
            id: b.id,
            etapa: b.etapa || '',
            subetapa: b.subetapa || '',
            titulo: b.titulo || '',
            actividad: typeof b.actividad === 'function' ? b.actividad(userProfile, answers) : (b.actividad || ''),
            descripcion: b.descripcion || '',
            tiempo: b.tiempo || '',
            pasos,
            criterios_exito: b.criterios_exito || [],
            herramientas: b.herramientas || [],
            errores_comunes: b.errores_comunes || []
          };
        });

        const fullPlanData = {
          perfil: perfilResult,
          userProfile,
          objetivo_operativo: objetivoOperativo,
          regla_plan: reglaPlan,
          analisis_profundo: analisisProfundo,
          fortalezas: perfilResult.fortalezas || [],
          riesgos,
          bloques: bloquesData,
          checklist_final: checklistFinal,
          frase_final: fraseFinal,
          fromInvite: true,
          generated_at: new Date().toISOString()
        };

        // Archivar plan anterior
        await sb.from('edu_student_plans')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('student_id', inv.student_id)
          .eq('status', 'active');

        // Crear nuevo plan
        const { data: plan, error: pErr } = await sb.from('edu_student_plans').insert({
          student_id: inv.student_id,
          mentorship_id: inv.mentorship_id,
          diagnostico: answers,
          perfil: fullPlanData,  // ← jsonb con TODO el plan enriquecido
          bloques_ids: bloques.map(b => b.id),
          modo: 'completo',
          status: 'active'
        }).select().single();

        if (pErr || !plan) { console.warn('[invite plan failed]', inv.id, pErr); continue; }

        // Tasks
        const tasks = [];
        bloques.forEach((b, bIdx) => {
          const pasos = typeof b.pasos === 'function' ? b.pasos(userProfile, answers) : (b.pasos || []);
          pasos.forEach((paso, pIdx) => {
            tasks.push({
              plan_id: plan.id,
              student_id: inv.student_id,
              bloque_id: b.id,
              bloque_etapa: b.etapa,
              bloque_subetapa: b.subetapa,
              bloque_orden: bIdx,
              paso_index: pIdx,
              paso_text: paso,
              completed: false
            });
          });
        });

        if (tasks.length) await sb.from('edu_student_plan_tasks').insert(tasks);

        // Marcar invite como procesado
        await sb.from('edu_diagnostic_invites').update({
          perfil: perfilResult,
          result_plan_id: plan.id
        }).eq('id', inv.id);

        processed++;
      } catch (e) {
        console.warn('[process invite error]', e);
      }
    }
    return processed;
  } catch (e) {
    console.warn('[eduProcessPendingInvites]', e);
    return 0;
  }
}

// Auto-procesar invites al cargar la app + cada 2 min
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => eduProcessPendingInvites().then(n => {
      if (n > 0 && typeof eduLoadAll === 'function') {
        console.log('[invites] procesados:', n);
        // Notificación al mentor
        eduNotifyMentorNewPlans(n);
        eduLoadAll().then(() => typeof eduRender === 'function' && eduRender());
      }
    }), 5000);
    setInterval(() => eduProcessPendingInvites().then(n => {
      if (n > 0) {
        eduNotifyMentorNewPlans(n);
        if (typeof eduLoadAll === 'function') eduLoadAll().then(() => typeof eduRender === 'function' && eduRender());
      }
    }), 120000);
  });
}

// Notificar al mentor — banner + browser notification si está activado
function eduNotifyMentorNewPlans(n) {
  // Browser native notification
  if (typeof notifySend === 'function' && window.notifyState?.enabled) {
    notifySend(`🎓 ${n} estudiante${n>1?'s completaron':' completó'} su diagnóstico`, {
      body: `Plan${n>1?'es':''} generado${n>1?'s':''} y listo${n>1?'s':''} para revisar.`,
      tag: 'edu-new-plans',
      data: { url: '/?focus=edu_alerts' }
    });
  }
  // Banner in-app
  let banner = document.getElementById('edu-new-plans-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'edu-new-plans-banner';
    banner.className = 'fixed top-4 right-4 z-[300] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-4 rounded-2xl shadow-2xl max-w-sm';
    document.body.appendChild(banner);
  }
  banner.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="text-2xl">🎓</div>
      <div class="flex-1">
        <div class="font-bold text-sm">${n} estudiante${n>1?'s':''} completaron su diagnóstico</div>
        <div class="text-xs opacity-90 mt-0.5">Plan${n>1?'es':''} listo${n>1?'s':''} para que veas el progreso</div>
      </div>
      <button onclick="document.getElementById('edu-new-plans-banner').remove()" class="text-white/80 hover:text-white text-xl leading-none">×</button>
    </div>
  `;
  // Auto-hide después de 30s
  setTimeout(() => banner?.remove(), 30000);
}

window.eduShareDiagnosticForm = eduShareDiagnosticForm;
window.eduProcessPendingInvites = eduProcessPendingInvites;

function eduGenerateCertificate(studentId) {
  const s = eduState.students.find(x => x.id === studentId);
  if (!s) return alert('Estudiante no encontrado');
  const m = (eduState.mentorships || []).find(x => x.id === s.mentorship_id);
  const fechaHoy = new Date().toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' });

  // Determinar progreso
  const tasks = (eduTasksState.all || []).filter(t => t.student_id === studentId);
  const tasksDone = tasks.filter(t => t.completed).length;
  const pctCompletion = tasks.length ? Math.round(tasksDone/tasks.length*100) : (s.status === 'graduated' ? 100 : 0);

  const tituloMentoria = m?.name || 'Mentoría';
  const nombreEstudiante = s.full_name || 'Estudiante';
  const stageActual = (m?.stages||[]).find(st => st.key === s.current_stage)?.name || s.current_stage || '';
  const fechaInicio = s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' }) : '—';
  const tipo = pctCompletion >= 100 || s.status === 'graduated' ? 'FINALIZACIÓN' : (pctCompletion >= 50 ? 'AVANCE' : 'PARTICIPACIÓN');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Certificado · ${nombreEstudiante.replace(/</g,'&lt;')}</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<style>
  @page { size: landscape; margin: 0; }
  @media print { body { margin: 0; } .no-print { display: none !important; } }
  body { font-family: 'Georgia', serif; background: #f8fafc; }
  .border-deco { border: 12px double #0f172a; }
  .border-deco-inner { border: 2px solid #94a3b8; }
  .seal { background: radial-gradient(circle at center, #fbbf24 0%, #f59e0b 60%, #d97706 100%); }
</style>
</head>
<body class="bg-slate-50 p-8">
  <div class="no-print mb-4 flex justify-center gap-2">
    <button onclick="window.print()" class="bg-emerald-600 text-white text-lg font-bold px-6 py-3 rounded-xl">🖨️ Imprimir / PDF</button>
    <button onclick="window.close()" class="bg-slate-100 text-lg px-6 py-3 rounded-xl">✕ Cerrar</button>
  </div>

  <div class="bg-white rounded-2xl shadow-2xl max-w-5xl mx-auto p-8 border-deco">
    <div class="border-deco-inner p-12 text-center">
      <div class="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-bold">Rental Profitss · Empresa OS</div>

      <div class="mt-6 text-5xl font-black text-slate-900 tracking-wide">CERTIFICADO</div>
      <div class="mt-1 text-xl text-slate-600 tracking-wider">de ${tipo}</div>

      <div class="mt-10 text-base text-slate-700">Se otorga el presente certificado a</div>

      <div class="mt-3 text-6xl font-bold text-slate-900 italic" style="font-family: 'Georgia', serif;">${nombreEstudiante.replace(/</g,'&lt;')}</div>

      <div class="mt-8 text-base text-slate-700 leading-relaxed max-w-3xl mx-auto">
        Por su ${pctCompletion >= 100 ? 'culminación exitosa' : pctCompletion >= 50 ? 'avance significativo' : 'participación'} en el programa
        <br><strong class="text-2xl text-slate-900">${tituloMentoria.replace(/</g,'&lt;')}</strong>
        ${stageActual ? `<br>${pctCompletion >= 100 ? 'completando la etapa' : 'cursando actualmente la etapa'} <strong>${stageActual.replace(/</g,'&lt;')}</strong>` : ''}
        ${tasks.length > 0 ? `<br>con un cumplimiento del <strong>${pctCompletion}%</strong> de las tareas asignadas (${tasksDone}/${tasks.length}).` : ''}
      </div>

      <div class="mt-10 grid grid-cols-3 gap-8 items-end">
        <div>
          <div class="border-b-2 border-slate-700 h-12"></div>
          <div class="text-[10px] uppercase tracking-wider text-slate-600 mt-1">Mentor / Directora</div>
        </div>
        <div class="flex justify-center">
          <div class="seal w-32 h-32 rounded-full flex items-center justify-center shadow-xl">
            <div class="bg-white rounded-full w-24 h-24 flex flex-col items-center justify-center">
              <div class="text-3xl">🎓</div>
              <div class="text-[8px] uppercase tracking-wider text-slate-700 font-bold">Verificado</div>
            </div>
          </div>
        </div>
        <div>
          <div class="border-b-2 border-slate-700 h-12"></div>
          <div class="text-[10px] uppercase tracking-wider text-slate-600 mt-1">Fecha de emisión</div>
        </div>
      </div>

      <div class="mt-8 grid grid-cols-3 gap-8 text-[10px] uppercase tracking-wider text-slate-500">
        <div>Inscripción: <strong>${fechaInicio}</strong></div>
        <div>—</div>
        <div>${fechaHoy}</div>
      </div>

      <div class="mt-6 text-[9px] text-slate-400">ID Certificado: ${s.id.slice(0,8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}</div>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1200,height=800');
  win.document.write(html);
  win.document.close();
}

// ════════════════════════════════════════════════════════════
// 📱 VISTA CEO MOBILE de Educación — full-screen, KPIs + en riesgo
// ════════════════════════════════════════════════════════════
function eduOpenCeoMobile() {
  const students = eduMyStudents();
  const m = eduCurrentMentorship();
  const total = students.length;
  const active = students.filter(s => s.status === 'active').length;
  const atRisk = students.filter(s => s.status === 'at_risk').length;
  const graduated = students.filter(s => s.status === 'graduated').length;
  const enRiesgo = (typeof eduStudentsEnRiesgo === 'function' ? eduStudentsEnRiesgo() : []).slice(0, 10);
  const expiringSoon = students.filter(s => {
    const d = eduDaysToExpiry(s);
    return d != null && d >= 0 && d <= 30;
  }).length;

  // Estado general
  let estado, color, icon, msg;
  if (enRiesgo.length > 5 || atRisk > total*0.2) {
    estado = 'ATENCIÓN REQUERIDA'; color = 'from-red-600 to-red-800'; icon = '🔴';
    msg = `${enRiesgo.length} estudiante${enRiesgo.length>1?'s':''} en riesgo · ${atRisk} at_risk`;
  } else if (enRiesgo.length > 0 || expiringSoon > 3) {
    estado = 'OPERACIÓN ESTABLE'; color = 'from-amber-500 to-amber-700'; icon = '🟡';
    msg = `${enRiesgo.length} en seguimiento · ${expiringSoon} vence pronto`;
  } else {
    estado = 'MENTORÍA SANA'; color = 'from-emerald-600 to-emerald-800'; icon = '✅';
    msg = 'Todos los estudiantes activos en buen ritmo';
  }

  let overlay = document.getElementById('edu-ceo-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'edu-ceo-overlay';
    overlay.className = 'fixed inset-0 bg-slate-100 z-[60] overflow-y-auto';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="min-h-full flex flex-col">
      <div class="bg-gradient-to-br ${color} text-white p-4 shadow-xl">
        <div class="flex items-center justify-between mb-3">
          <button onclick="eduCloseCeoMobile()" class="bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm font-bold">✕ Salir</button>
          <div class="text-center flex-1">
            <div class="text-[10px] uppercase opacity-75 font-bold tracking-wider">${m?.name || 'Mentoría'}</div>
            <div class="text-sm opacity-90">${new Date().toLocaleDateString('es', { day:'numeric', month:'long' })}</div>
          </div>
          <button onclick="eduRunMentorAIAnalysis()" class="bg-emerald-500 hover:bg-emerald-600 rounded-lg px-3 py-2 text-sm font-bold">🤖</button>
        </div>
        <div class="text-center">
          <div class="text-4xl">${icon}</div>
          <div class="text-xl font-bold mt-1">${estado}</div>
          <div class="text-sm opacity-90 mt-1">${msg}</div>
        </div>
        <div class="grid grid-cols-4 gap-2 mt-4">
          <div class="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div class="text-[10px] uppercase opacity-80 font-bold">Total</div>
            <div class="text-2xl font-bold">${total}</div>
          </div>
          <div class="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div class="text-[10px] uppercase opacity-80 font-bold">Activos</div>
            <div class="text-2xl font-bold">${active}</div>
          </div>
          <div class="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div class="text-[10px] uppercase opacity-80 font-bold">At risk</div>
            <div class="text-2xl font-bold">${atRisk}</div>
          </div>
          <div class="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div class="text-[10px] uppercase opacity-80 font-bold">Graduados</div>
            <div class="text-2xl font-bold">${graduated}</div>
          </div>
        </div>
      </div>

      <div class="p-3 max-w-2xl mx-auto w-full space-y-3">
        ${enRiesgo.length > 0 ? `
          <div class="bg-white border-2 border-amber-300 rounded-xl overflow-hidden">
            <div class="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-2 text-xs font-bold uppercase">⚠️ Top en riesgo · contactar hoy</div>
            <div class="divide-y divide-slate-100">
              ${enRiesgo.map(s => `
                <div class="px-3 py-2.5 flex items-center justify-between gap-2">
                  <button onclick="eduCloseCeoMobile(); setTimeout(()=>eduShowStudentDetail('${s.id}'), 200)" class="flex-1 text-left min-w-0">
                    <div class="font-semibold text-sm truncate">${(s.full_name||'—').replace(/</g,'&lt;')}</div>
                    <div class="text-[11px] text-amber-700 font-bold">${s._riskReason}</div>
                  </button>
                  ${s.phone ? `<a href="https://wa.me/${s.phone.replace(/[^0-9]/g,'')}" target="_blank" class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0">💬</a>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <div class="text-3xl">🎉</div>
            <div class="text-sm font-bold text-emerald-900 mt-1">Sin estudiantes en riesgo</div>
          </div>
        `}

        <div class="grid grid-cols-2 gap-2">
          <button onclick="eduCloseCeoMobile(); setTimeout(()=>{eduState.tab='students'; eduRender();}, 200)" class="bg-white border border-slate-200 rounded-xl p-3 text-left hover:shadow-md">
            <div class="text-2xl">👥</div>
            <div class="text-sm font-bold mt-1">Estudiantes</div>
            <div class="text-[10px] text-slate-500">${total} total</div>
          </button>
          <button onclick="eduCloseCeoMobile(); setTimeout(()=>{eduState.tab='tasks'; eduRender();}, 200)" class="bg-white border border-slate-200 rounded-xl p-3 text-left hover:shadow-md">
            <div class="text-2xl">✅</div>
            <div class="text-sm font-bold mt-1">Tareas</div>
            <div class="text-[10px] text-slate-500">Plan global</div>
          </button>
          <button onclick="eduCloseCeoMobile(); setTimeout(()=>{eduState.tab='calls'; eduRender();}, 200)" class="bg-white border border-slate-200 rounded-xl p-3 text-left hover:shadow-md">
            <div class="text-2xl">📅</div>
            <div class="text-sm font-bold mt-1">Calendario</div>
            <div class="text-[10px] text-slate-500">Sesiones</div>
          </button>
          <button onclick="eduCloseCeoMobile(); setTimeout(()=>{eduState.tab='alerts'; eduRender();}, 200)" class="bg-white border border-slate-200 rounded-xl p-3 text-left hover:shadow-md">
            <div class="text-2xl">🚨</div>
            <div class="text-sm font-bold mt-1">Alertas</div>
            <div class="text-[10px] text-slate-500">${(eduState.alerts||[]).length} activas</div>
          </button>
        </div>
      </div>

      <div class="sticky bottom-0 bg-white border-t-2 border-slate-200 p-3 grid grid-cols-2 gap-2 shadow-lg">
        <button onclick="eduRunMentorAIAnalysis()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-xl">🤖 Análisis IA</button>
        <button onclick="eduCloseCeoMobile()" class="bg-slate-900 text-white text-sm font-bold py-3 rounded-xl">✕ Cerrar</button>
      </div>
    </div>
  `;
}

function eduCloseCeoMobile() {
  const o = document.getElementById('edu-ceo-overlay');
  if (o) o.remove();
}

// ════════════════════════════════════════════════════════════
// 🤖 Análisis IA del rendimiento del mentor (vía remodel-ai endpoint)
// ════════════════════════════════════════════════════════════
async function eduRunMentorAIAnalysis() {
  const m = eduCurrentMentorship();
  const students = eduMyStudents();
  const enRiesgo = (typeof eduStudentsEnRiesgo === 'function' ? eduStudentsEnRiesgo() : []);
  const total = students.length;

  // Datos compactos para Claude
  const summary = {
    mentoria: m?.name || 'mentoría',
    total_estudiantes: total,
    activos: students.filter(s => s.status === 'active').length,
    at_risk: students.filter(s => s.status === 'at_risk').length,
    graduados: students.filter(s => s.status === 'graduated').length,
    dropped: students.filter(s => s.status === 'dropped').length,
    paused: students.filter(s => s.status === 'paused').length,
    en_riesgo_count: enRiesgo.length,
    en_riesgo_top5: enRiesgo.slice(0, 5).map(s => ({
      nombre: s.full_name, etapa: s.current_stage, dias_sin_contacto: s._daysWithoutContact, motivo: s._riskReason
    })),
    distribucion_etapas: (() => {
      const d = {};
      students.forEach(s => { d[s.current_stage || 'sin_etapa'] = (d[s.current_stage || 'sin_etapa'] || 0) + 1; });
      return d;
    })(),
    pagos: (() => {
      const p = {};
      students.forEach(s => { p[s.payment_status || 'unknown'] = (p[s.payment_status || 'unknown'] || 0) + 1; });
      return p;
    })(),
    vencen_30d: students.filter(s => { const d = eduDaysToExpiry(s); return d != null && d >= 0 && d <= 30; }).length
  };

  const prompt = `Sos consultor de mentorías financieras / Real Estate. Analizá esta mentoría y devolvé SOLO JSON sin markdown:
{
  "resumen": "1-2 frases del estado general",
  "estado_general": "verde|amarillo|rojo",
  "fortalezas": ["..."],
  "alertas": ["..."],
  "acciones_priorizadas": [{"titulo": "...", "detalle": "...", "impacto": "alto|medio|bajo"}],
  "metricas_clave": {"retencion_pct": N, "graduacion_pct": N, "salud_general": "alta|media|baja"},
  "foco_proxima_semana": "1-2 frases con la decisión clave del mentor"
}
Sé directo y accionable. Si en_riesgo_count > 20% del total → estado_general=rojo. Si hay 5+ vencen_30d → alerta sobre renovaciones.

DATOS:
${JSON.stringify(summary, null, 2)}`;

  // Abrir modal de loading
  openModal('🤖 Analizando con IA...', '<div class="p-8 text-center"><div class="text-4xl">⏳</div><div class="text-sm mt-2">Claude está analizando tu mentoría...</div></div>');

  try {
    const token = await window.getAccessToken();
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/remodel-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        project_context: { feature: 'edu-mentor-analysis', mentoria: m?.name }
      })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    let raw = '';
    if (Array.isArray(json.content)) raw = json.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
    else raw = json.text || JSON.stringify(json);
    const match = raw.match(/\{[\s\S]*\}/);
    const a = JSON.parse(match ? match[0] : raw);

    const colorMap = { verde: 'from-emerald-600 to-emerald-800', amarillo: 'from-amber-500 to-orange-700', rojo: 'from-red-600 to-red-800' };
    const color = colorMap[a.estado_general] || 'from-slate-700 to-slate-900';
    const impColor = i => i === 'alto' ? 'bg-red-100 text-red-800 border-red-300' : i === 'medio' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-300';

    openModal('🤖 Análisis IA · ' + (m?.name || 'Mentoría'), `
      <div class="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div class="bg-gradient-to-br ${color} text-white rounded-2xl p-4 shadow-lg">
          <div class="text-[10px] uppercase tracking-widest opacity-80 font-bold">Estado · ${(a.estado_general||'').toUpperCase()}</div>
          <div class="text-base mt-2 leading-relaxed">${(a.resumen||'').replace(/</g,'&lt;')}</div>
          ${a.metricas_clave ? `
          <div class="grid grid-cols-3 gap-2 mt-3">
            <div class="bg-white/15 backdrop-blur rounded p-2 text-center">
              <div class="text-[10px] opacity-80 font-bold">Retención</div>
              <div class="text-lg font-bold">${a.metricas_clave.retencion_pct||0}%</div>
            </div>
            <div class="bg-white/15 backdrop-blur rounded p-2 text-center">
              <div class="text-[10px] opacity-80 font-bold">Graduación</div>
              <div class="text-lg font-bold">${a.metricas_clave.graduacion_pct||0}%</div>
            </div>
            <div class="bg-white/15 backdrop-blur rounded p-2 text-center">
              <div class="text-[10px] opacity-80 font-bold">Salud</div>
              <div class="text-lg font-bold">${a.metricas_clave.salud_general||'—'}</div>
            </div>
          </div>` : ''}
        </div>

        ${(a.fortalezas||[]).length > 0 ? `
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-emerald-900 mb-2">✅ Fortalezas</div>
          <ul class="space-y-1 text-sm text-emerald-900">${a.fortalezas.map(f => `<li>• ${f.replace(/</g,'&lt;')}</li>`).join('')}</ul>
        </div>` : ''}

        ${(a.alertas||[]).length > 0 ? `
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-red-900 mb-2">🚨 Alertas</div>
          <ul class="space-y-1 text-sm text-red-900">${a.alertas.map(x => `<li>• ${x.replace(/</g,'&lt;')}</li>`).join('')}</ul>
        </div>` : ''}

        ${(a.acciones_priorizadas||[]).length > 0 ? `
        <div>
          <div class="text-xs font-bold uppercase text-slate-700 mb-1.5">🎯 Acciones priorizadas</div>
          <div class="space-y-2">
            ${a.acciones_priorizadas.map((acc, i) => `
              <div class="border border-slate-200 rounded-lg p-2.5 flex items-start gap-2">
                <div class="bg-slate-900 text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">${i+1}</div>
                <div class="flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <div class="font-bold text-sm">${(acc.titulo||'').replace(/</g,'&lt;')}</div>
                    ${acc.impacto ? `<span class="text-[10px] uppercase font-bold border px-1.5 py-0.5 rounded ${impColor(acc.impacto)}">${acc.impacto}</span>` : ''}
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
          <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cerrar</button>
          <button onclick="eduRunMentorAIAnalysis()" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 rounded">🔄 Re-analizar</button>
        </div>
      </div>
    `);
  } catch (e) {
    openModal('Error', `<div class="p-4"><div class="text-sm text-red-700">❌ ${e.message}</div><button onclick="closeModal()" class="mt-3 bg-slate-100 px-3 py-1.5 rounded text-sm">Cerrar</button></div>`);
  }
}

// ════════════════════════════════════════════════════════════
// 👨‍👩‍👧‍👦 COHORTES — comparativa por grupo
// Agrupa estudiantes por campo "grupo" y compara métricas
// ════════════════════════════════════════════════════════════
function eduRenderCohorts() {
  const students = eduMyStudents();
  if (!students.length) return '<div class="p-8 text-center text-slate-400 text-sm">Sin estudiantes para comparar.</div>';

  const now = Date.now();
  const dayMs = 86400000;

  // Agrupar por grupo (cohorte). Sin grupo → 'Sin asignar'
  const byCohort = {};
  students.forEach(s => {
    const g = s.grupo || 'Sin asignar';
    if (!byCohort[g]) byCohort[g] = [];
    byCohort[g].push(s);
  });

  const cohortStats = Object.entries(byCohort).map(([name, list]) => {
    const total = list.length;
    const active = list.filter(s => s.status === 'active').length;
    const graduated = list.filter(s => s.status === 'graduated').length;
    const atRisk = list.filter(s => s.status === 'at_risk').length;
    const dropped = list.filter(s => s.status === 'dropped').length;
    const enRiesgo = list.filter(s => {
      const last = s.ultima_fecha_seguimiento;
      if (!last) return false;
      return Math.floor((now - new Date(last).getTime()) / dayMs) > 14;
    }).length;
    const pagosOk = list.filter(s => s.payment_status === 'active').length;
    const pagosVencidos = list.filter(s => ['past_due','expired','cancelled'].includes(s.payment_status)).length;
    // Promedio días en mentoría
    const diasEnMentoria = list.map(s => {
      if (!s.enrolled_at) return null;
      return Math.floor((now - new Date(s.enrolled_at).getTime()) / dayMs);
    }).filter(x => x != null);
    const avgDias = diasEnMentoria.length ? Math.round(diasEnMentoria.reduce((a,b)=>a+b,0) / diasEnMentoria.length) : 0;
    // Etapa promedio (índice)
    const m = eduCurrentMentorship();
    const stageIdx = list.map(s => {
      const i = (m?.stages || []).findIndex(st => st.key === s.current_stage);
      return i >= 0 ? i : 0;
    });
    const avgStageIdx = stageIdx.length ? Math.round(stageIdx.reduce((a,b)=>a+b,0) / stageIdx.length * 10) / 10 : 0;

    return {
      name, total, active, graduated, atRisk, dropped, enRiesgo,
      pagosOk, pagosVencidos, avgDias, avgStageIdx,
      retencion: total ? Math.round(((total - dropped) / total) * 100) : 0,
      graduacion: total ? Math.round(graduated / total * 100) : 0,
      pagoSano: total ? Math.round(pagosOk / total * 100) : 0
    };
  }).sort((a,b) => b.total - a.total);

  const m = eduCurrentMentorship();

  return `
    <div class="space-y-3">
      <div class="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
        👨‍👩‍👧‍👦 <strong>Cohortes</strong>: comparativa entre grupos. Detectá qué cohortes retienen mejor, gradúan más rápido y tienen mejor salud financiera.
      </div>

      <!-- Cards de cohortes -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${cohortStats.map(c => `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition">
            <div class="bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
              <div class="font-bold text-sm truncate">${c.name.replace(/</g,'&lt;')}</div>
              <div class="text-xs bg-white/15 px-2 py-0.5 rounded">${c.total} estud.</div>
            </div>
            <div class="p-3 space-y-2">
              <!-- Composición -->
              <div class="flex h-6 rounded overflow-hidden border border-slate-200 text-[10px] font-bold">
                ${c.active > 0 ? `<div class="bg-emerald-500 text-white flex items-center justify-center" style="width:${c.active/c.total*100}%">${c.active}</div>` : ''}
                ${c.graduated > 0 ? `<div class="bg-blue-500 text-white flex items-center justify-center" style="width:${c.graduated/c.total*100}%">${c.graduated}</div>` : ''}
                ${c.atRisk > 0 ? `<div class="bg-amber-500 text-white flex items-center justify-center" style="width:${c.atRisk/c.total*100}%">${c.atRisk}</div>` : ''}
                ${c.dropped > 0 ? `<div class="bg-red-500 text-white flex items-center justify-center" style="width:${c.dropped/c.total*100}%">${c.dropped}</div>` : ''}
              </div>
              <div class="flex flex-wrap gap-2 text-[10px] text-slate-600">
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-emerald-500 rounded-sm"></span>Activos ${c.active}</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-blue-500 rounded-sm"></span>Grad ${c.graduated}</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-amber-500 rounded-sm"></span>At risk ${c.atRisk}</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-red-500 rounded-sm"></span>Drop ${c.dropped}</span>
              </div>

              <!-- KPIs -->
              <div class="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <div class="text-[9px] uppercase text-slate-500 font-bold">Retención</div>
                  <div class="text-base font-bold ${c.retencion >= 80 ? 'text-emerald-700' : c.retencion >= 60 ? 'text-amber-700' : 'text-red-700'}">${c.retencion}%</div>
                </div>
                <div>
                  <div class="text-[9px] uppercase text-slate-500 font-bold">Graduación</div>
                  <div class="text-base font-bold ${c.graduacion >= 30 ? 'text-emerald-700' : c.graduacion >= 10 ? 'text-amber-700' : 'text-slate-700'}">${c.graduacion}%</div>
                </div>
                <div>
                  <div class="text-[9px] uppercase text-slate-500 font-bold">Pagos OK</div>
                  <div class="text-base font-bold ${c.pagoSano >= 90 ? 'text-emerald-700' : c.pagoSano >= 70 ? 'text-amber-700' : 'text-red-700'}">${c.pagoSano}%</div>
                </div>
              </div>

              <div class="flex justify-between text-[10px] text-slate-500 pt-1">
                <span>Avg días en mentoría: <strong>${c.avgDias}d</strong></span>
                <span>Etapa promedio: <strong>#${Math.round(c.avgStageIdx)+1}</strong></span>
                ${c.enRiesgo > 0 ? `<span class="text-amber-700 font-bold">⚠️ ${c.enRiesgo} sin contacto >14d</span>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Tabla comparativa -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase">📊 Tabla comparativa</div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr class="border-b border-slate-200">
                <th class="text-left p-2">Cohorte</th>
                <th class="text-right p-2">Total</th>
                <th class="text-right p-2">Retención</th>
                <th class="text-right p-2">Graduación</th>
                <th class="text-right p-2">Pagos OK</th>
                <th class="text-right p-2">Avg días</th>
                <th class="text-right p-2">⚠️ Riesgo</th>
              </tr>
            </thead>
            <tbody>
              ${cohortStats.map(c => `
                <tr class="border-t border-slate-100 hover:bg-slate-50">
                  <td class="p-2 font-bold">${c.name.replace(/</g,'&lt;')}</td>
                  <td class="p-2 text-right">${c.total}</td>
                  <td class="p-2 text-right ${c.retencion>=80?'text-emerald-700':c.retencion>=60?'text-amber-700':'text-red-700'} font-bold">${c.retencion}%</td>
                  <td class="p-2 text-right ${c.graduacion>=30?'text-emerald-700':'text-slate-700'} font-bold">${c.graduacion}%</td>
                  <td class="p-2 text-right ${c.pagoSano>=90?'text-emerald-700':c.pagoSano>=70?'text-amber-700':'text-red-700'} font-bold">${c.pagoSano}%</td>
                  <td class="p-2 text-right">${c.avgDias}d</td>
                  <td class="p-2 text-right ${c.enRiesgo>0?'text-amber-700 font-bold':'text-slate-400'}">${c.enRiesgo}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${cohortStats.length >= 2 ? `
        <div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900">
          💡 <strong>Insight automático:</strong>
          ${(() => {
            const mejor = cohortStats.slice().sort((a,b) => b.retencion - a.retencion)[0];
            const peor = cohortStats.slice().sort((a,b) => a.retencion - b.retencion)[0];
            if (mejor.retencion === peor.retencion) return 'Todas las cohortes tienen retención similar.';
            return `<strong>${mejor.name}</strong> tiene la mejor retención (${mejor.retencion}%) vs <strong>${peor.name}</strong> (${peor.retencion}%). Diferencia: ${mejor.retencion - peor.retencion}pp. Analizá qué hace distinto el grupo top para replicarlo.`;
          })()}
        </div>
      ` : ''}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
// 🔔 Notificaciones de inactividad (browser native)
// Si la app está abierta y hay notifyState.enabled, chequea cada 30min
// si hay estudiantes con +14 días sin contacto y notifica
// ════════════════════════════════════════════════════════════
async function eduCheckInactivityAlerts() {
  if (!window.notifyState?.enabled) return;
  try {
    if (!eduState.students || eduState.students.length === 0) return;
    const enRiesgo = (typeof eduStudentsEnRiesgo === 'function' ? eduStudentsEnRiesgo() : []);
    const lastCheck = +(localStorage.getItem('edu_last_inactivity_check') || '0');
    const now = Date.now();
    if (now - lastCheck < 30 * 60 * 1000) return; // 30 min cooldown
    localStorage.setItem('edu_last_inactivity_check', String(now));

    const criticosNuevos = enRiesgo.filter(s => (s._daysWithoutContact || 0) > 14);
    if (criticosNuevos.length === 0) return;

    const lastNotified = +(localStorage.getItem('edu_inactivity_last_count') || '0');
    if (criticosNuevos.length <= lastNotified) return;

    localStorage.setItem('edu_inactivity_last_count', String(criticosNuevos.length));

    if (typeof notifySend === 'function') {
      notifySend(`⚠️ ${criticosNuevos.length} estudiante(s) sin contacto >14d`, {
        body: criticosNuevos.slice(0,3).map(s => `• ${s.full_name} (${s._daysWithoutContact}d)`).join('\n'),
        tag: 'edu-inactivity',
        persistent: true,
        data: { url: '/?open_edu_ceo=1' }
      });
    }
  } catch (e) {
    console.warn('eduCheckInactivityAlerts failed:', e);
  }
}

// Auto-check al cargar + cada 30 min mientras la app esté abierta
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => eduCheckInactivityAlerts(), 45000); // 45s después de load
    setInterval(() => eduCheckInactivityAlerts(), 30 * 60 * 1000);
  });
}

