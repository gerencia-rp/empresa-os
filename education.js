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
  try {
    const [mRes, sRes, rRes, aRes, cRes, repRes, tRes, presRes, motRes] = await Promise.all([
      sb.from('edu_mentorships').select('*').order('position'),
      sb.from('edu_students').select('*').order('updated_at', { ascending: false }),
      sb.from('edu_resources').select('*').order('updated_at', { ascending: false }),
      sb.from('edu_alerts').select('*').is('resolved_at', null).order('triggered_at', { ascending: false }),
      sb.from('edu_student_calls').select('*').order('scheduled_at', { ascending: false }).limit(500),
      sb.from('edu_reports').select('*').order('period_start', { ascending: false }).limit(50).then(r => r).catch(() => ({ data: [] })),
      sb.from('edu_student_tasks').select('*').order('created_at', { ascending: false }).limit(500).then(r => r).catch(() => ({ data: [] })),
      sb.from('edu_presentations').select('*').order('updated_at', { ascending: false }).limit(50).then(r => r).catch(() => ({ data: [] })),
      sb.from('edu_call_motivos').select('*').eq('active', true).order('orden').then(r => r).catch(() => ({ data: [] }))
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
function eduSetMentorship(id) { eduState.mentorshipId = id; eduState.selectedStudentId = null; eduRender(); }
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
                  <td class="p-2"><span class="text-blue-600 text-[10px] hover:underline">ver →</span></td>
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

  const avgScore = students.length ? Math.round(students.reduce((acc,s) => acc + (s.glscore||50), 0) / students.length) : 0;

  return `
    <div class="space-y-3">
      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-slate-900 text-white rounded-xl p-3"><div class="text-[10px] text-slate-400 uppercase font-bold">GLScore prom</div><div class="text-3xl font-bold">${avgScore}</div></div>
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
    </div>
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
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
// TAB: PRESENTACIONES IA — genera slides con web search live + descarga PPTX
// ============================================================
function eduRenderPresentations() {
  const m = eduCurrentMentorship();
  const presentations = (eduState.presentations || []).filter(p => p.mentorship_id === eduState.mentorshipId);
  const aiKey = `edu-pres-${eduState.mentorshipId}`;
  const ai = (window.aiState && window.aiState[aiKey]) || {};
  const draft = ai.presentation;

  return `
    <div class="space-y-3">
      <!-- Form de input -->
      <div class="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 rounded-xl p-4">
        <div class="text-xs font-bold uppercase text-violet-900 mb-3">🎬 Generar presentación con IA + web search live</div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Título de la presentación *</label>
            <input id="edu-pres-title" placeholder="Ej. Clase 1 — Buy Box, ARV y MAO en Texas 2026" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Tipo</label>
            <select id="edu-pres-type" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="class">📚 Clase magistral</option>
              <option value="workshop">🛠 Taller práctico</option>
              <option value="webinar">📡 Webinar abierto</option>
              <option value="keynote">🎤 Keynote / Pitch</option>
            </select>
          </div>
        </div>

        <div class="mt-2">
          <label class="block text-[10px] font-bold text-slate-600 mb-1">Tema / qué cubrir *</label>
          <textarea id="edu-pres-topic" rows="2" placeholder="Ej. Buy Box en Texas: cómo definirla, ARV con comps validados, MAO con holding costs. Foco Austin/Houston 2026, números reales y casos." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"></textarea>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1"># Clase</label>
            <input id="edu-pres-class-number" type="number" placeholder="1" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Duración (min)</label>
            <input id="edu-pres-duration" type="number" value="60" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1"># Slides aprox</label>
            <input id="edu-pres-slides" type="number" value="15" min="5" max="40" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Idioma</label>
            <select id="edu-pres-lang" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <!-- Dominio temático + foco geográfico — para que las fuentes se adapten -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Dominio temático *</label>
            <select id="edu-pres-domain" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="real-estate">🏠 Real Estate (Redfin, FRED, NAR, MLS)</option>
              <option value="marketing">📣 Marketing / Growth (HubSpot, Statista, Pew)</option>
              <option value="finance">💰 Finanzas / Inversión (SEC, FRED, Bloomberg)</option>
              <option value="tech">💻 Tech / Software (Gartner, IDC, CB Insights)</option>
              <option value="sales">🤝 Ventas / B2B (HubSpot Sales, Salesforce, Gong)</option>
              <option value="leadership">👥 Liderazgo / Management (HBR, McKinsey, Bain)</option>
              <option value="general">🌍 General / Otro tema</option>
            </select>
            <div class="text-[9px] text-slate-500 mt-0.5">Define qué fuentes prioriza la IA</div>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Foco geográfico (opcional)</label>
            <input id="edu-pres-geo" placeholder="Ej. Texas · USA · LATAM · Global · México" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            <div class="text-[9px] text-slate-500 mt-0.5">Default Real Estate: Texas. Vacío en otros dominios.</div>
          </div>
        </div>

        <div class="mt-2">
          <label class="block text-[10px] font-bold text-slate-600 mb-1">Outline sugerido (opcional)</label>
          <textarea id="edu-pres-outline" rows="2" placeholder="Si tenés ya una estructura en mente, pegala acá. Si no, Claude la arma." class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
        </div>

        <div class="mt-2">
          <label class="block text-[10px] font-bold text-slate-600 mb-1">🔍 Fuentes preferidas (opcional)</label>
          <textarea id="edu-pres-sources" rows="2" placeholder="Si querés que la IA priorice fuentes específicas, listalas. Ej: 'Statista, Gartner, McKinsey 2024 report'. La IA igual usa las del dominio por default." class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
        </div>

        <div class="mt-2">
          <label class="block text-[10px] font-bold text-slate-600 mb-1">Audiencia</label>
          <input id="edu-pres-audience" value="${m?.name ? 'Estudiantes de ' + m.name : 'Estudiantes de la mentoría'}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>

        <div class="flex flex-col gap-2 mt-3 pt-3 border-t border-violet-200">
          <div class="flex items-center gap-4 flex-wrap">
            <label class="flex items-center gap-2 text-xs">
              <input type="checkbox" id="edu-pres-live" checked />
              <span><strong>🌐 Web search live</strong> — datos verificables en vivo</span>
            </label>
            <label class="flex items-center gap-2 text-xs bg-amber-50 border border-amber-300 px-2 py-1 rounded">
              <input type="checkbox" id="edu-pres-research" />
              <span><strong>🔬 Investigación profunda</strong> — extended thinking + 25 búsquedas (3-5 min, +costo, insights no obvios)</span>
            </label>
          </div>
          <button onclick="withLoading(this, eduGeneratePresentation)" class="bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold px-5 py-2.5 rounded">🤖 Generar con IA</button>
        </div>
        <div class="text-[10px] text-violet-700 mt-2 italic" id="edu-pres-time-hint">⚡ Modo normal: ~30-90 seg, 8 web searches. Modo investigación: ~3-5 min, 25 searches + thinking. Activá investigación para casos donde necesitás profundidad real (clase nueva, tema técnico, lanzamiento).</div>
      </div>

      ${ai.loading ? `
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-4 text-center">
          <div class="text-3xl animate-pulse">🧠</div>
          <div class="mt-2 font-bold text-violet-900">${ai.status === 'starting' ? 'Iniciando job en background...' : ai.status === 'running' ? 'Claude analizando + buscando data live...' : 'Procesando...'}</div>
          <div class="text-[11px] text-violet-700 mt-1">
            ${ai.elapsed_sec != null ? `⏱ ${ai.elapsed_sec}s transcurridos` : ''}
            ${ai.job_id ? ` · job <code class="text-[9px]">${ai.job_id.slice(0,8)}</code>` : ''}
            ${(ai.missed_polls||0) > 0 ? ` <span class="text-amber-700">· ${ai.missed_polls} polls sin respuesta (RLS?)</span>` : ''}
          </div>
          ${ai.last_poll_error ? `<div class="text-[10px] text-amber-700 mt-1">Último error polling: ${(ai.last_poll_error||'').replace(/</g,'&lt;')}</div>` : ''}
          <div class="text-[10px] text-violet-600 mt-2 italic">Esto puede tardar 60-120 segundos.</div>
        </div>
      ` : ''}
      ${ai.error ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900 whitespace-pre-wrap">⚠️ ${ai.error}</div>` : ''}

      ${draft ? `
        <!-- Preview de la presentación generada -->
        <div class="bg-white border-2 border-emerald-300 rounded-xl overflow-hidden">
          <div class="bg-emerald-50 border-b border-emerald-200 px-3 py-2 flex justify-between items-center flex-wrap gap-2">
            <div class="text-xs font-bold uppercase text-emerald-900">✅ Generada · ${(draft.slides||[]).length} slides</div>
            <div class="flex gap-1">
              <button onclick="eduDownloadPPTX()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded">📥 Descargar PPTX</button>
              <button onclick="eduDownloadSpeakerNotes()" class="bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-bold px-3 py-1.5 rounded">📋 Speaker notes</button>
            </div>
          </div>
          <div class="p-4 max-h-[60vh] overflow-y-auto">
            <h2 class="text-lg font-bold mb-2">${draft.title}</h2>
            ${draft.outline?.length ? `<div class="text-xs text-slate-600 mb-3"><strong>Outline:</strong> ${draft.outline.join(' → ')}</div>` : ''}
            <div class="space-y-3">
              ${(draft.slides || []).map(s => `
                <div class="border border-slate-200 rounded-lg p-3 hover:shadow-sm">
                  <div class="flex justify-between items-start gap-2 mb-1">
                    <div>
                      <span class="text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold">Slide ${s.number}</span>
                      <span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded ml-1">${s.layout || 'content'}</span>
                    </div>
                  </div>
                  <div class="font-bold text-sm">${s.title || ''}</div>
                  ${s.subtitle ? `<div class="text-xs text-slate-600 mt-0.5">${s.subtitle}</div>` : ''}
                  ${(s.bullets || []).length ? `<ul class="text-xs text-slate-700 mt-2 ml-4 list-disc space-y-0.5">${s.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
                  ${(s.stats || []).length ? `
                    <div class="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1">
                      ${s.stats.map(st => `<div class="bg-blue-50 border border-blue-200 rounded p-1.5 text-[10px]"><strong>${st.label}</strong><div class="text-blue-700 font-bold">${st.value}</div>${st.source_name?`<div class="text-[9px] text-slate-500">📍 ${st.source_name}</div>`:''}</div>`).join('')}
                    </div>
                  ` : ''}
                  ${s.speaker_notes ? `<details class="mt-2"><summary class="cursor-pointer text-[10px] text-slate-600 font-bold">🎙 Speaker notes</summary><div class="text-[11px] text-slate-700 mt-1 bg-slate-50 rounded p-2 whitespace-pre-wrap">${s.speaker_notes}</div></details>` : ''}
                  ${(s.sources || []).length ? `<div class="text-[9px] text-slate-500 mt-2">Fuentes: ${s.sources.map(src => `<a href="${src.url}" target="_blank" class="text-blue-600 hover:underline">${src.title || src.url}</a>`).join(' · ')}</div>` : ''}
                </div>
              `).join('')}
            </div>
            ${(draft.all_sources || []).length ? `
              <div class="mt-4 pt-3 border-t border-slate-200">
                <div class="text-xs font-bold uppercase text-slate-700 mb-1">📚 Todas las fuentes citadas</div>
                <ul class="text-[10px] text-slate-600 space-y-0.5">
                  ${draft.all_sources.map(src => `<li>• <a href="${src.url}" target="_blank" class="text-blue-600 hover:underline">${src.title || src.url}</a></li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Historial de presentaciones -->
      ${presentations.length > 0 ? `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">📚 Historial — ${presentations.length} presentaciones</div>
          <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            ${presentations.map(p => `
              <div class="p-2 flex justify-between items-start gap-2 hover:bg-slate-50">
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold truncate">${p.title}</div>
                  <div class="text-[10px] text-slate-500">${p.presentation_type}${p.class_number ? ' · Clase #'+p.class_number : ''} · ${(p.slides||[]).length} slides · ${new Date(p.created_at).toLocaleDateString('es-MX')}</div>
                </div>
                <div class="flex gap-1 flex-shrink-0">
                  <button onclick="eduLoadPresentation('${p.id}')" class="text-blue-600 text-[10px] hover:underline">cargar</button>
                  <button onclick="eduDeletePresentation('${p.id}')" class="text-red-500 hover:text-red-700 text-[10px]">🗑</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

async function eduGeneratePresentation() {
  const title = (document.getElementById('edu-pres-title')?.value || '').trim();
  const topic = (document.getElementById('edu-pres-topic')?.value || '').trim();
  if (!title || !topic) return alert('Título y tema son obligatorios');
  if (!state || !state.user || !state.user.id) {
    return alert('No hay sesión activa. Refresh la página y volvé a iniciar sesión.');
  }
  const m = eduCurrentMentorship();
  if (!m && !eduState.mentorshipId) {
    return alert('Seleccioná una mentoría primero (los botones arriba del formulario).');
  }
  const aiKey = `edu-pres-${eduState.mentorshipId || 'no-mentorship'}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { loading: true, status: 'starting', started_at: Date.now() };
  eduRender();
  try {
    const payload = {
      mentorship_id: m?.id,
      title,
      topic,
      audience: document.getElementById('edu-pres-audience')?.value || undefined,
      presentation_type: document.getElementById('edu-pres-type')?.value || 'class',
      class_number: +document.getElementById('edu-pres-class-number')?.value || null,
      duration_min: +document.getElementById('edu-pres-duration')?.value || 60,
      slides_count: +document.getElementById('edu-pres-slides')?.value || 15,
      language: document.getElementById('edu-pres-lang')?.value || 'es',
      outline_hint: document.getElementById('edu-pres-outline')?.value || null,
      domain: document.getElementById('edu-pres-domain')?.value || 'real-estate',
      geographic_focus: document.getElementById('edu-pres-geo')?.value || null,
      preferred_sources: document.getElementById('edu-pres-sources')?.value || null,
      require_live_data: document.getElementById('edu-pres-live')?.checked ?? true,
      research_mode: document.getElementById('edu-pres-research')?.checked || false,
      user_id: state.user.id
    };
    console.log('[edu-pres] POST →', payload);
    let res, r;
    try {
      res = await fetch(`${window.SUPABASE_URL}/functions/v1/generate-presentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
        body: JSON.stringify(payload)
      });
    } catch (netErr) {
      throw new Error('Sin conexión a la edge function: ' + netErr.message);
    }
    const txt = await res.text();
    try { r = JSON.parse(txt); }
    catch { throw new Error(`HTTP ${res.status}: respuesta no-JSON: ${txt.slice(0,300)}`); }
    console.log('[edu-pres] response →', r);
    if (!r.ok) throw new Error(r.error || `HTTP ${res.status}: falló sin mensaje`);

    // Pattern async: job_id devuelto → polling cada 5s hasta done/error
    if (r.async && r.job_id) {
      window.aiState[aiKey] = { loading: true, job_id: r.job_id, status: 'running', started_at: Date.now(), missed_polls: 0 };
      eduRender();
      const pollStart = Date.now();
      const maxWait = 10 * 60 * 1000; // 10 min máximo
      const MAX_CONSECUTIVE_MISSES = 6; // Si después de 30s no encontramos el job, abortamos
      while (Date.now() - pollStart < maxWait) {
        await new Promise(rs => setTimeout(rs, 5000));
        const pollRes = await sb.from('edu_pres_jobs').select('*').eq('id', r.job_id).maybeSingle();
        const job = pollRes && pollRes.data;
        const pollErr = pollRes && pollRes.error;

        if (!job) {
          // No encontrado — puede ser RLS, latencia eventual, o realmente eliminado
          window.aiState[aiKey].missed_polls = (window.aiState[aiKey].missed_polls || 0) + 1;
          window.aiState[aiKey].last_poll_error = pollErr ? pollErr.message : 'job no encontrado';
          window.aiState[aiKey].elapsed_sec = Math.round((Date.now() - pollStart) / 1000);
          eduRender();
          if (window.aiState[aiKey].missed_polls >= MAX_CONSECUTIVE_MISSES) {
            window.aiState[aiKey] = {
              loading: false,
              error: `No pude leer el job ${r.job_id} después de ${MAX_CONSECUTIVE_MISSES * 5}s.\n\nPosibles causas:\n• RLS bloqueando (correr supabase/edu-pres-jobs-rls-fix.sql)\n• Sesión expirada (cerrá sesión y volvé a entrar)\n• Job realmente borrado.\n\nÚltimo error: ${window.aiState[aiKey].last_poll_error}`
            };
            break;
          }
          continue;
        }
        // Job encontrado — reset misses
        window.aiState[aiKey].missed_polls = 0;
        window.aiState[aiKey].status = job.status;
        window.aiState[aiKey].elapsed_sec = Math.round((Date.now() - pollStart) / 1000);
        eduRender();
        if (job.status === 'done') {
          window.aiState[aiKey] = {
            loading: false, presentation: job.result, saved_id: job.saved_pres_id,
            web_searches: job.web_searches, tokens: { total: job.tokens_used },
            duration_ms: job.duration_ms
          };
          await eduLoadAll();
          break;
        }
        if (job.status === 'error') {
          window.aiState[aiKey] = { loading: false, error: 'Edge function devolvió error: ' + (job.error_message || 'sin mensaje') };
          break;
        }
      }
      if (window.aiState[aiKey].loading) {
        window.aiState[aiKey] = { loading: false, error: 'Timeout polling (>10min). Job: ' + r.job_id };
      }
    } else {
      // Backward compat (respuesta sincrónica vieja)
      window.aiState[aiKey] = { loading: false, presentation: r.presentation, saved_id: r.saved_id, web_searches: r.web_searches, tokens: r.tokens };
      await eduLoadAll();
    }
  } catch (e) {
    window.aiState[aiKey] = { loading: false, error: e.message };
  }
  eduRender();
}

// ─── DOWNLOAD PPTX usando PptxGenJS ───
function eduDownloadPPTX() {
  if (typeof PptxGenJS === 'undefined') return alert('Librería PptxGenJS no cargada. Refresh la página.');
  const aiKey = `edu-pres-${eduState.mentorshipId}`;
  const p = (window.aiState[aiKey] || {}).presentation;
  if (!p) return alert('Sin presentación cargada');
  eduBuildPPTX(p, { download: true });
}

// ──────────────────────────────────────────────────────────────────
// HELPERS DE ENRIQUECIMIENTO VISUAL (Unsplash + QuickChart auto)
// ──────────────────────────────────────────────────────────────────
function eduUnsplashUrl(query, w = 1600, h = 900) {
  // Unsplash Source: fotos pro gratis sin auth · descarga al embeber
  const q = encodeURIComponent(String(query || 'business success').replace(/[^\w\s,áéíóúñü-]/gi, '').slice(0, 80));
  return `https://source.unsplash.com/${w}x${h}/?${q}`;
}
function eduQuickChartUrl(config, w = 900, h = 500) {
  // QuickChart.io: gráficos Chart.js renderizados server-side, sin auth
  const c = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?bkg=white&w=${w}&h=${h}&c=${c}`;
}
function eduSlideToImageQuery(slide, presTitle) {
  if (slide.image_query) return slide.image_query;
  const txt = `${slide.title || ''} ${slide.subtitle || ''} ${presTitle || ''}`.toLowerCase();
  if (/real estate|casa|inmobili|flip|wholesa|propiedad/.test(txt)) return 'modern suburban home neighborhood';
  if (/dinero|hard money|financ|loan|invest/.test(txt)) return 'finance investment money charts';
  if (/equipo|team|contratist|networking/.test(txt)) return 'business team meeting professional';
  if (/remodel|obra|construc/.test(txt)) return 'home renovation construction worker';
  if (/buy box|análisis|deal|underwrit/.test(txt)) return 'real estate analysis data charts';
  if (/vend|sale|listing|stagi/.test(txt)) return 'beautiful staged living room';
  if (/cierre|escritu|legal/.test(txt)) return 'business contract signing handshake';
  if (/escal|crec|sistem/.test(txt)) return 'business growth strategy success';
  return 'professional business meeting modern office';
}
function eduStatsToChartUrl(stats, brand = '2563EB') {
  if (!stats || !stats.length) return null;
  const numericStats = stats.filter(s => {
    const v = String(s.value || '').replace(/[$,%kKmMxX\s]/g, '');
    return !isNaN(parseFloat(v));
  });
  if (numericStats.length < 2) return null;
  return eduQuickChartUrl({
    type: 'bar',
    data: {
      labels: numericStats.map(s => String(s.label || '').slice(0, 18)),
      datasets: [{
        data: numericStats.map(s => parseFloat(String(s.value).replace(/[$,%kKmMxX\s]/g, ''))),
        backgroundColor: '#' + brand,
        borderRadius: 8
      }]
    },
    options: {
      plugins: { legend: { display: false }, title: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#e5e7eb' } }, x: { grid: { display: false } } }
    }
  });
}

// Builder de PPTX con layouts ricos estilo Flipping Rentals
function eduBuildPPTX(p, opts = {}) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = p.title;
  pres.company = 'Empresa OS';

  // Branding
  const BRAND = (p.brand || 'EMPRESA OS').toUpperCase();
  const YEAR = String(new Date().getFullYear());
  const NAV = '0F172A', NAV_LIGHT = '1E293B', ACCENT = '2563EB', GOLD = 'D97706';
  const GRAY_LIGHT = 'F1F5F9', GRAY_MED = '64748B', WHITE = 'FFFFFF';

  // Master con header + footer branding
  pres.defineSlideMaster({
    title: 'BRAND',
    background: { color: WHITE },
    objects: [
      // Header: marca + año en esquina superior izquierda
      { text: { text: BRAND, options: { x: 0.4, y: 0.18, w: 5, h: 0.25, color: GRAY_MED, fontSize: 9, bold: true, charSpacing: 2 } } },
      { text: { text: YEAR, options: { x: 12.4, y: 0.18, w: 0.6, h: 0.25, color: GRAY_MED, fontSize: 9, bold: true, align: 'right' } } },
      // Línea divisoria
      { rect: { x: 0.4, y: 0.45, w: 12.5, h: 0.02, fill: { color: GRAY_LIGHT } } },
      // Footer
      { rect: { x: 0, y: 7.1, w: 13.333, h: 0.4, fill: { color: NAV } } },
      { text: { text: `${BRAND} · ${(p.title || '').slice(0, 60)}`, options: { x: 0.4, y: 7.15, w: 10, h: 0.3, color: WHITE, fontSize: 9 } } }
    ],
    slideNumber: { x: 12.6, y: 7.15, color: WHITE, fontSize: 10 }
  });

  // Master sin chrome (para covers)
  pres.defineSlideMaster({ title: 'BARE', background: { color: NAV } });

  const slides = p.slides || [];
  slides.forEach((s, idx) => {
    const isCover = s.layout === 'cover' || (idx === 0 && !s.layout);
    const slide = pres.addSlide({ masterName: isCover ? 'BARE' : 'BRAND' });

    if (isCover) return renderCover(slide, s, p, { BRAND, YEAR, ACCENT, GOLD, WHITE, GRAY_MED });

    // Block label (BLOQUE N · TEMA) sobre el título — pedagogía estilo Borja Ramírez
    if (s.block_label) {
      slide.addText(String(s.block_label).toUpperCase(), {
        x: 0.4, y: 0.6, w: 12.5, h: 0.3,
        fontSize: 11, bold: true, color: GOLD, charSpacing: 3
      });
      slide.addShape('rect', { x: 0.4, y: 0.92, w: 0.9, h: 0.045, fill: { color: GOLD } });
    }

    // Título de slide (más abajo si hay block_label)
    const titleY = s.block_label ? 1.05 : 0.7;
    slide.addText(s.title || `Slide ${s.number}`, { x: 0.4, y: titleY, w: 12.5, h: 0.6, fontSize: 26, bold: true, color: NAV });
    if (s.subtitle) slide.addText(s.subtitle, { x: 0.4, y: titleY + 0.6, w: 12.5, h: 0.4, fontSize: 14, color: GRAY_MED, italic: true });

    const C = { NAV, NAV_LIGHT, ACCENT, GOLD, GRAY_LIGHT, GRAY_MED, WHITE, BRAND };

    // ─── ENRIQUECIMIENTO AUTO: si no hay image_url ni chart_url, genera ───
    if (!s.image_url && !s.chart_url && ['hero-image','split-image','chart-spotlight','image-grid'].includes(s.layout)) {
      s.image_url = eduUnsplashUrl(eduSlideToImageQuery(s, p.title));
    }
    if (s.layout === 'chart-spotlight' && !s.chart_url && (s.stats || s.metric_cards)?.length) {
      s.chart_url = eduStatsToChartUrl(s.stats || s.metric_cards, ACCENT);
    }

    switch (s.layout) {
      case 'agenda':              renderAgenda(slide, s, C); break;
      case 'comparison':          renderComparison(slide, s, C); break;
      case 'benefits':            renderBenefits(slide, s, C); break;
      case 'case-study':          renderCaseStudy(slide, s, C); break;
      case 'framework':           renderFramework(slide, s, C); break;
      case 'checklist':           renderChecklist(slide, s, C); break;
      case 'strategy-grid':       renderStrategyGrid(slide, s, C); break;
      case 'metrics-dashboard':   renderMetricsDashboard(slide, s, C); break;
      case 'quote':               renderQuote(slide, s, C); break;
      case 'closing':             renderClosing(slide, s, p, C); break;
      case 'learning-objectives': renderLearningObjectives(slide, s, C); break;
      case 'reflection-recap':    renderReflectionRecap(slide, s, C); break;
      case 'transfer-activity':   renderTransferActivity(slide, s, C); break;
      case 'goldbox':             renderGoldbox(slide, s, C); break;
      case 'highlight':           renderHighlight(slide, s, C); break;
      // ─── NUEVOS LAYOUTS VISUALES PREMIUM ───
      case 'hero-image':          renderHeroImage(slide, s, C); break;
      case 'split-image':         renderSplitImage(slide, s, C); break;
      case 'chart-spotlight':     renderChartSpotlight(slide, s, C); break;
      case 'image-grid':          renderImageGrid(slide, s, C); break;
      default:                    renderDefault(slide, s, C);
    }

    // Transition_out visible al pie del slide — hilo conductor visible
    if (s.transition_out && !isCover) {
      slide.addShape('rect', { x: 0, y: 6.92, w: 13.333, h: 0.18, fill: { color: GOLD }, line: { color: GOLD } });
      slide.addText('→ ' + String(s.transition_out).slice(0, 130), {
        x: 0.4, y: 6.7, w: 12.5, h: 0.22, fontSize: 9, italic: true, color: GRAY_MED, align: 'right'
      });
    }

    // Speaker notes con transitions explícitas (lo que el coach DIRÁ al pasar slides)
    const notesParts = [];
    if (s.transition_in)  notesParts.push('🔗 CONEXIÓN (decir al empezar):\n' + s.transition_in);
    if (s.speaker_notes)  notesParts.push((s.transition_in ? '\n📢 CONTENIDO:\n' : '') + s.speaker_notes);
    if (s.transition_out) notesParts.push('\n➡️ PUENTE al siguiente slide:\n' + s.transition_out);
    if ((s.sources||[]).length) notesParts.push('\n📚 Fuentes:\n' + s.sources.map(src => '• ' + (src.title||'') + ' — ' + (src.url||'')).join('\n'));
    if (notesParts.length) slide.addNotes(notesParts.join('\n'));
  });

  // Slide final con fuentes
  if ((p.all_sources || []).length) {
    const sld = pres.addSlide({ masterName: 'BRAND' });
    sld.addText('Fuentes citadas', { x: 0.4, y: 0.7, w: 12.5, h: 0.6, fontSize: 26, bold: true, color: NAV });
    const list = p.all_sources.slice(0, 30).map((src, i) => ({
      text: `${i+1}. ${src.title || src.url}\n`,
      options: { fontSize: 10, color: ACCENT, breakLine: true }
    }));
    sld.addText(list, { x: 0.4, y: 1.5, w: 12.5, h: 5.3 });
  }

  if (opts.download !== false) {
    const safeName = (p.title || 'presentacion').replace(/[^a-z0-9]/gi, '_').slice(0, 60);
    pres.writeFile({ fileName: `${new Date().toISOString().split('T')[0]}_${safeName}.pptx` });
  }
  return pres;
}

// ─── LAYOUT RENDERERS ───
function renderCover(slide, s, p, c) {
  // Background image hero opcional (auto-generada si no se especifica)
  const heroUrl = s.image_url || eduUnsplashUrl(eduSlideToImageQuery({title: s.title || p.title, subtitle: s.subtitle}, p.title));
  try {
    slide.addImage({ path: heroUrl, x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: 'cover', w: 13.333, h: 7.5 } });
    // Overlay oscuro para que el texto se lea
    slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: '0F172A', transparency: 35 }, line: { type: 'none' } });
  } catch(e) { /* si la imagen falla, fondo navy normal */ }

  // Marca arriba
  slide.addText(c.BRAND, { x: 0.5, y: 0.5, w: 12.3, h: 0.4, color: c.GOLD, fontSize: 13, bold: true, charSpacing: 4 });
  slide.addText(c.YEAR, { x: 12.3, y: 0.5, w: 0.6, h: 0.4, color: c.GRAY_MED, fontSize: 13, align: 'right' });
  // Título central
  slide.addText(s.title || p.title, { x: 0.5, y: 2.0, w: 12.3, h: 1.6, fontSize: 50, bold: true, color: c.WHITE, align: 'center' });
  if (s.subtitle) {
    slide.addShape('rect', { x: 1, y: 3.8, w: 11.3, h: 0.04, fill: { color: c.GOLD } });
    slide.addText(`"${s.subtitle}"`, { x: 0.5, y: 4.0, w: 12.3, h: 0.8, fontSize: 18, color: 'CBD5E1', align: 'center', italic: true });
  }
  // 3 KPIs grandes
  const kpis = s.metric_cards || s.stats || [];
  if (kpis.length) {
    const top3 = kpis.slice(0, 3);
    const totalW = 12;
    const cardW = totalW / top3.length;
    top3.forEach((k, i) => {
      const x = 0.7 + i * cardW;
      slide.addText(String(k.value || ''), { x, y: 5.2, w: cardW - 0.2, h: 0.7, fontSize: 36, bold: true, color: c.GOLD, align: 'center' });
      slide.addText(String(k.label || ''), { x, y: 5.95, w: cardW - 0.2, h: 0.4, fontSize: 12, color: 'CBD5E1', align: 'center' });
    });
  }
}

function renderAgenda(slide, s, c) {
  const steps = s.agenda_steps || (s.bullets || []).map(b => ({ step: b, label: '' }));
  if (!steps.length) return;
  const n = Math.min(steps.length, 6);
  const totalW = 12;
  const cardW = totalW / n;
  const y = 2.6;
  steps.slice(0, n).forEach((st, i) => {
    const x = 0.7 + i * cardW;
    // Círculo con número
    slide.addShape('ellipse', { x: x + cardW/2 - 0.4, y, w: 0.8, h: 0.8, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
    slide.addText(String(i+1), { x: x + cardW/2 - 0.4, y, w: 0.8, h: 0.8, fontSize: 24, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    // Step name
    slide.addText(String(st.step || st.title || ''), { x: x + 0.1, y: y + 1.0, w: cardW - 0.2, h: 0.5, fontSize: 16, bold: true, color: c.NAV, align: 'center' });
    // Label
    if (st.label) slide.addText(String(st.label), { x: x + 0.1, y: y + 1.5, w: cardW - 0.2, h: 0.7, fontSize: 10, color: c.NAV_LIGHT, align: 'center' });
    // Flecha conectora
    if (i < n - 1) {
      slide.addText('→', { x: x + cardW - 0.3, y: y + 0.2, w: 0.4, h: 0.5, fontSize: 20, color: c.NAV_LIGHT, align: 'center' });
    }
  });
}

function renderComparison(slide, s, c) {
  const cmp = s.comparison || { left: { title: 'A', items: [] }, right: { title: 'B', items: [] } };
  const y0 = 2.0;
  const w = 5.9, h = 4.7;
  // LEFT card
  slide.addShape('roundRect', { x: 0.5, y: y0, w, h, fill: { color: 'FEE2E2' }, line: { color: 'F87171', width: 2 }, rectRadius: 0.15 });
  slide.addText(cmp.left?.title || 'Opción A', { x: 0.7, y: y0 + 0.2, w: w - 0.4, h: 0.5, fontSize: 18, bold: true, color: 'B91C1C' });
  const leftItems = (cmp.left?.items || []).map(t => ({ text: '✗ ' + t, options: { fontSize: 13, color: '7F1D1D', breakLine: true } }));
  slide.addText(leftItems, { x: 0.8, y: y0 + 0.9, w: w - 0.5, h: h - 1.1 });
  // RIGHT card
  slide.addShape('roundRect', { x: 6.95, y: y0, w, h, fill: { color: 'DCFCE7' }, line: { color: '4ADE80', width: 2 }, rectRadius: 0.15 });
  slide.addText(cmp.right?.title || 'Opción B', { x: 7.15, y: y0 + 0.2, w: w - 0.4, h: 0.5, fontSize: 18, bold: true, color: '14532D' });
  const rightItems = (cmp.right?.items || []).map(t => ({ text: '✓ ' + t, options: { fontSize: 13, color: '14532D', breakLine: true } }));
  slide.addText(rightItems, { x: 7.25, y: y0 + 0.9, w: w - 0.5, h: h - 1.1 });
}

function renderBenefits(slide, s, c) {
  const items = (s.bullets || []).slice(0, 6);
  if (!items.length) return;
  const cols = items.length > 3 ? 2 : 1;
  const rows = Math.ceil(items.length / cols);
  const cardW = (12 / cols) - 0.3;
  const cardH = (4.5 / rows) - 0.2;
  items.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * (cardW + 0.3);
    const y = 2.0 + row * (cardH + 0.2);
    slide.addShape('roundRect', { x, y, w: cardW, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    // Número en círculo
    slide.addShape('ellipse', { x: x + 0.2, y: y + 0.2, w: 0.6, h: 0.6, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
    slide.addText(String(i+1), { x: x + 0.2, y: y + 0.2, w: 0.6, h: 0.6, fontSize: 18, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    slide.addText(b, { x: x + 1.0, y: y + 0.2, w: cardW - 1.2, h: cardH - 0.4, fontSize: 13, color: c.NAV, valign: 'middle' });
  });
}

function renderCaseStudy(slide, s, c) {
  const cs = s.case_study;
  if (!cs) return renderDefault(slide, s, c);
  // Banner del caso
  slide.addShape('roundRect', { x: 0.4, y: 1.8, w: 12.5, h: 0.7, fill: { color: c.NAV }, line: { color: c.NAV }, rectRadius: 0.1 });
  slide.addText(`📍 ${cs.name}${cs.location ? ' · ' + cs.location : ''}`, { x: 0.7, y: 1.85, w: 8, h: 0.6, fontSize: 18, bold: true, color: 'FFFFFF', valign: 'middle' });
  if (cs.estrategia) slide.addText(cs.estrategia, { x: 8.7, y: 1.85, w: 4, h: 0.6, fontSize: 13, color: c.GOLD, valign: 'middle', align: 'right', italic: true });

  // 4 KPI cards
  const kpis = [
    { label: 'Compra', value: cs.compra ? '$' + Math.round(cs.compra).toLocaleString() : '—', color: '64748B' },
    { label: 'Remodelación', value: cs.remodelacion ? '$' + Math.round(cs.remodelacion).toLocaleString() : '—', color: '64748B' },
    { label: 'ARV', value: cs.arv ? '$' + Math.round(cs.arv).toLocaleString() : '—', color: c.ACCENT },
    { label: 'ROI Anual', value: cs.roi_anual ? cs.roi_anual + '%' : '—', color: c.GOLD }
  ];
  kpis.forEach((k, i) => {
    const x = 0.4 + i * 3.15;
    slide.addShape('roundRect', { x, y: 2.8, w: 3.0, h: 1.6, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    slide.addText(k.label, { x: x + 0.15, y: 2.9, w: 2.7, h: 0.3, fontSize: 10, color: '64748B', bold: true });
    slide.addText(k.value, { x: x + 0.15, y: 3.25, w: 2.7, h: 0.9, fontSize: 28, bold: true, color: k.color, valign: 'middle' });
  });

  // Cash flow mensual destacado
  if (cs.cash_flow_monthly) {
    slide.addShape('roundRect', { x: 0.4, y: 4.6, w: 6.05, h: 1.5, fill: { color: 'ECFDF5' }, line: { color: '6EE7B7', width: 2 }, rectRadius: 0.1 });
    slide.addText('💰 Cash Flow Mensual', { x: 0.6, y: 4.7, w: 5.8, h: 0.3, fontSize: 11, color: '047857', bold: true });
    slide.addText('$' + Math.round(cs.cash_flow_monthly).toLocaleString() + ' /mes', { x: 0.6, y: 5.05, w: 5.8, h: 1.0, fontSize: 36, bold: true, color: '047857', valign: 'middle' });
  }
  // Duración
  if (cs.duracion_meses) {
    slide.addShape('roundRect', { x: 6.55, y: 4.6, w: 6.4, h: 1.5, fill: { color: 'EFF6FF' }, line: { color: '93C5FD', width: 2 }, rectRadius: 0.1 });
    slide.addText('⏱ Duración del proyecto', { x: 6.75, y: 4.7, w: 6.0, h: 0.3, fontSize: 11, color: '1E40AF', bold: true });
    slide.addText(cs.duracion_meses + ' meses', { x: 6.75, y: 5.05, w: 6.0, h: 1.0, fontSize: 36, bold: true, color: '1E40AF', valign: 'middle' });
  }

  // Key takeaway
  if (cs.key_takeaway) {
    slide.addText(`"${cs.key_takeaway}"`, { x: 0.4, y: 6.25, w: 12.5, h: 0.7, fontSize: 13, color: c.NAV, italic: true, align: 'center' });
  }
}

function renderFramework(slide, s, c) {
  const items = s.framework_items || (s.bullets || []).map(b => ({ label: b, value: '' }));
  if (!items.length) return;
  const cols = 2, rows = Math.ceil(items.length / cols);
  const cardW = 5.9, cardH = 0.7;
  items.forEach((it, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 0.5 + col * 6.3;
    const y = 2.0 + row * (cardH + 0.15);
    slide.addShape('rect', { x, y, w: 0.08, h: cardH, fill: { color: c.ACCENT } });
    slide.addShape('rect', { x: x + 0.08, y, w: cardW - 0.08, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'E2E8F0' } });
    slide.addText(it.label || '', { x: x + 0.3, y, w: cardW - 2.0, h: cardH, fontSize: 13, color: c.NAV, valign: 'middle', bold: true });
    if (it.value) slide.addText(String(it.value), { x: x + cardW - 1.8, y, w: 1.6, h: cardH, fontSize: 14, bold: true, color: c.ACCENT, align: 'right', valign: 'middle' });
  });
}

function renderChecklist(slide, s, c) {
  const items = s.checklist_items || (s.bullets || []).map(b => ({ title: b, detail: '' }));
  if (!items.length) return;
  items.slice(0, 6).forEach((it, i) => {
    const y = 1.95 + i * 0.78;
    // Checkbox
    slide.addShape('rect', { x: 0.5, y: y + 0.1, w: 0.5, h: 0.5, fill: { color: '10B981' }, line: { color: '10B981' } });
    slide.addText('✓', { x: 0.5, y: y + 0.1, w: 0.5, h: 0.5, fontSize: 22, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
    // Title
    slide.addText(it.title || '', { x: 1.2, y, w: 11.5, h: 0.35, fontSize: 15, bold: true, color: c.NAV });
    // Detail
    if (it.detail) slide.addText(it.detail, { x: 1.2, y: y + 0.35, w: 11.5, h: 0.35, fontSize: 11, color: '64748B' });
  });
}

function renderStrategyGrid(slide, s, c) {
  const opts = s.strategy_options || [];
  if (!opts.length) return;
  const cols = Math.min(opts.length, 4);
  const cardW = (12.5 / cols) - 0.2;
  opts.slice(0, cols).forEach((op, i) => {
    const x = 0.4 + i * (cardW + 0.2);
    const y = 1.9;
    const h = 4.5;
    slide.addShape('roundRect', { x, y, w: cardW, h, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.1 });
    // Header colorido
    slide.addShape('rect', { x, y, w: cardW, h: 0.7, fill: { color: c.NAV }, line: { color: c.NAV } });
    slide.addText(op.name || `Opción ${i+1}`, { x: x + 0.1, y: y + 0.1, w: cardW - 0.2, h: 0.5, fontSize: 15, bold: true, color: 'FFFFFF', align: 'center' });
    // Métricas
    const metrics = [
      { k: 'Cash Flow', v: op.cash_flow || '—' },
      { k: 'Escalabilidad', v: op.scalability || '—' },
      { k: 'Operación', v: op.operation || '—' }
    ];
    metrics.forEach((m, mi) => {
      const my = y + 0.85 + mi * 0.85;
      slide.addText(m.k, { x: x + 0.2, y: my, w: cardW - 0.4, h: 0.25, fontSize: 9, color: '64748B', bold: true });
      slide.addText(m.v, { x: x + 0.2, y: my + 0.25, w: cardW - 0.4, h: 0.4, fontSize: 18, bold: true, color: c.ACCENT });
    });
    if (op.ideal_for) {
      slide.addText(op.ideal_for, { x: x + 0.2, y: y + h - 0.8, w: cardW - 0.4, h: 0.6, fontSize: 9, color: c.NAV_LIGHT, italic: true, align: 'center' });
    }
  });
}

function renderMetricsDashboard(slide, s, c) {
  const cards = s.metric_cards || s.stats || [];
  if (!cards.length) return;
  const cols = Math.min(cards.length, 4);
  const cardW = (12.5 / cols) - 0.2;
  cards.slice(0, 8).forEach((m, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 0.4 + col * (cardW + 0.2);
    const y = 2.0 + row * 2.2;
    slide.addShape('roundRect', { x, y, w: cardW, h: 2.0, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    slide.addText(m.label || '', { x: x + 0.15, y: y + 0.15, w: cardW - 0.3, h: 0.3, fontSize: 11, color: c.NAV_LIGHT, bold: true });
    slide.addText(String(m.value || ''), { x: x + 0.15, y: y + 0.5, w: cardW - 0.3, h: 1.0, fontSize: 36, bold: true, color: c.ACCENT, valign: 'middle' });
    if (m.trend) slide.addText(m.trend, { x: x + 0.15, y: y + 1.55, w: cardW - 0.3, h: 0.35, fontSize: 11, color: '10B981', bold: true });
    if (m.source_name) slide.addText(`📍 ${m.source_name}`, { x: x + 0.15, y: y + 1.7, w: cardW - 0.3, h: 0.25, fontSize: 8, color: c.GRAY_MED, italic: true });
  });
}

function renderQuote(slide, s, c) {
  const txt = s.quote_text || s.title || '';
  // Comillas decorativas grandes
  slide.addText('"', { x: 0.5, y: 1.8, w: 1.5, h: 1.2, fontSize: 80, bold: true, color: c.ACCENT, valign: 'top' });
  slide.addText(txt, { x: 1.8, y: 2.4, w: 10.8, h: 2.6, fontSize: 28, bold: true, color: c.NAV, italic: true, valign: 'middle' });
  if (s.quote_author) {
    slide.addShape('rect', { x: 1.8, y: 5.2, w: 2, h: 0.04, fill: { color: c.ACCENT } });
    slide.addText('— ' + s.quote_author, { x: 1.8, y: 5.4, w: 10.8, h: 0.4, fontSize: 14, color: c.GRAY_MED, italic: true });
  }
  // Stats decorativas si las hay
  if ((s.stats || []).length) renderMetricsDashboard(slide, { ...s, metric_cards: s.stats.slice(0, 3) }, c);
}

function renderClosing(slide, s, p, c) {
  slide.background = { color: c.NAV };
  slide.addText(c.BRAND, { x: 0.5, y: 0.5, w: 12.3, h: 0.4, color: c.GOLD, fontSize: 13, bold: true, charSpacing: 4 });
  // Quote central
  const q = s.quote_text || s.title || 'Gracias';
  slide.addText('"' + q + '"', { x: 1, y: 2.0, w: 11.3, h: 1.8, fontSize: 32, bold: true, color: c.WHITE, italic: true, align: 'center', valign: 'middle' });
  if (s.quote_author) {
    slide.addText('— ' + s.quote_author, { x: 1, y: 4.0, w: 11.3, h: 0.5, fontSize: 14, color: 'CBD5E1', align: 'center', italic: true });
  }
  // 3 stats finales
  const stats = s.metric_cards || s.stats || [];
  if (stats.length) {
    const top3 = stats.slice(0, 3);
    const cardW = 12 / top3.length;
    top3.forEach((k, i) => {
      const x = 0.7 + i * cardW;
      slide.addText(String(k.value || ''), { x, y: 5.0, w: cardW - 0.2, h: 0.8, fontSize: 40, bold: true, color: c.GOLD, align: 'center' });
      slide.addText(String(k.label || ''), { x, y: 5.85, w: cardW - 0.2, h: 0.4, fontSize: 12, color: 'CBD5E1', align: 'center' });
    });
  }
}

function renderDefault(slide, s, c) {
  let y = 2.0;
  if ((s.bullets || []).length) {
    const txt = s.bullets.map(b => ({ text: b, options: { bullet: { code: '25CF' }, fontSize: 16, color: c.NAV, breakLine: true, paraSpaceAfter: 8 } }));
    slide.addText(txt, { x: 0.6, y, w: 12.2, h: 4.5 });
  }
  if ((s.stats || []).length) {
    renderMetricsDashboard(slide, { ...s, metric_cards: s.stats }, c);
  }
}

// ─── LAYOUTS PEDAGÓGICOS (Borja Ramírez / metacognición) ───
function renderLearningObjectives(slide, s, c) {
  // 4 cards navy con número gold grande + título + body
  const items = (s.learning_objectives || []).slice(0, 4);
  if (!items.length) return;
  const baseY = s.block_label ? 2.05 : 1.85;
  const cardW = (12.4 / 4) - 0.15;
  const cardH = 2.6;
  items.forEach((o, i) => {
    const x = 0.4 + i * (cardW + 0.15);
    slide.addShape('roundRect', { x, y: baseY, w: cardW, h: cardH, fill: { color: '16263F' }, line: { color: c.GOLD, width: 0.75 }, rectRadius: 0.1 });
    slide.addText(String(o.number || (i+1).toString().padStart(2, '0')), { x: x + 0.2, y: baseY + 0.2, w: cardW - 0.4, h: 0.6, fontSize: 26, bold: true, color: c.GOLD });
    slide.addText(String(o.title || ''), { x: x + 0.2, y: baseY + 0.95, w: cardW - 0.4, h: 0.5, fontSize: 14, bold: true, color: c.WHITE });
    slide.addText(String(o.body || ''), { x: x + 0.2, y: baseY + 1.45, w: cardW - 0.4, h: 1.05, fontSize: 11, color: 'CBD5E1', valign: 'top' });
  });
  // Goldbox al final si hay
  if (s.goldbox_runs || s.footer_rule) {
    const y = baseY + cardH + 0.3;
    slide.addShape('roundRect', { x: 0.4, y, w: 12.5, h: 0.85, rectRadius: 0.08, fill: { color: '1C2A40' }, line: { color: c.GOLD, width: 1 } });
    const runs = s.goldbox_runs || [{ text: 'Regla: ', bold: true }, { text: s.footer_rule }];
    slide.addText(runs.map(r => ({ text: r.text, options: { bold: !!r.bold, color: r.bold ? c.GOLD : 'EAFFF3', fontSize: 13 } })), { x: 0.7, y: y + 0.1, w: 12.0, h: 0.65, valign: 'middle' });
  }
}

function renderReflectionRecap(slide, s, c) {
  // 3 cards "Aprendiste a..." con check verde
  const items = (s.reflection_items || []).slice(0, 3);
  if (!items.length) return renderDefault(slide, s, c);
  const baseY = s.block_label ? 2.5 : 2.3;
  const cardW = (12.4 / 3) - 0.15;
  const cardH = 2.2;
  items.forEach((it, i) => {
    const x = 0.4 + i * (cardW + 0.15);
    const accent = i === items.length - 1 ? '10B981' : c.ACCENT;
    slide.addShape('roundRect', { x, y: baseY, w: cardW, h: cardH, fill: { color: c.WHITE }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    slide.addShape('rect', { x, y: baseY, w: cardW, h: 0.08, fill: { color: accent } });
    // Check verde grande
    slide.addShape('ellipse', { x: x + 0.25, y: baseY + 0.25, w: 0.55, h: 0.55, fill: { color: '10B981' }, line: { color: '10B981' } });
    slide.addText('✓', { x: x + 0.25, y: baseY + 0.25, w: 0.55, h: 0.55, fontSize: 22, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    slide.addText(String(it.title || 'Aprendiste a'), { x: x + 1.0, y: baseY + 0.3, w: cardW - 1.2, h: 0.4, fontSize: 13, bold: true, color: c.GOLD, charSpacing: 2 });
    slide.addText(String(it.body || ''), { x: x + 0.25, y: baseY + 0.95, w: cardW - 0.45, h: cardH - 1.1, fontSize: 14, color: c.NAV, valign: 'top', bold: true });
  });
}

function renderTransferActivity(slide, s, c) {
  // 2 cards (reto + entregable) + highlight verde al pie
  const ta = s.transfer_activity || {};
  const baseY = s.block_label ? 2.0 : 1.85;
  const cardW = 5.95, cardH = 2.6;
  // RETO
  slide.addShape('roundRect', { x: 0.4, y: baseY, w: cardW, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
  slide.addShape('rect', { x: 0.4, y: baseY, w: cardW, h: 0.07, fill: { color: c.ACCENT } });
  slide.addText('EL RETO', { x: 0.6, y: baseY + 0.2, w: cardW - 0.4, h: 0.3, fontSize: 11, bold: true, color: c.ACCENT, charSpacing: 3 });
  slide.addText(String(ta.challenge || ''), { x: 0.6, y: baseY + 0.55, w: cardW - 0.4, h: cardH - 0.7, fontSize: 14, color: c.NAV, valign: 'top' });
  // ENTREGABLE
  slide.addShape('roundRect', { x: 6.95, y: baseY, w: cardW, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
  slide.addShape('rect', { x: 6.95, y: baseY, w: cardW, h: 0.07, fill: { color: '10B981' } });
  slide.addText('ENTREGABLE', { x: 7.15, y: baseY + 0.2, w: cardW - 0.4, h: 0.3, fontSize: 11, bold: true, color: '047857', charSpacing: 3 });
  if (ta.deliverable) slide.addText(String(ta.deliverable), { x: 7.15, y: baseY + 0.55, w: cardW - 0.4, h: 0.5, fontSize: 13, bold: true, color: c.NAV });
  const items = (ta.deliverable_items || []).map(t => ({ text: t, options: { bullet: { code: '25CF' }, fontSize: 12, color: c.NAV, breakLine: true, paraSpaceAfter: 6 } }));
  slide.addText(items, { x: 7.25, y: baseY + 1.1, w: cardW - 0.5, h: cardH - 1.2 });
  // HIGHLIGHT verde abajo
  if (ta.rule) {
    const y = baseY + cardH + 0.25;
    slide.addShape('roundRect', { x: 0.4, y, w: 12.5, h: 0.95, rectRadius: 0.08, fill: { color: '143726' }, line: { color: '10B981', width: 1 } });
    slide.addShape('rect', { x: 0.4, y, w: 0.08, h: 0.95, fill: { color: '10B981' } });
    slide.addText(String(ta.rule), { x: 0.7, y: y + 0.12, w: 12.2, h: 0.75, fontSize: 13, color: 'EAFFF3', valign: 'middle' });
  }
}

function renderGoldbox(slide, s, c) {
  // Caja navy con borde dorado + texto rich (runs alternando bold/regular)
  const baseY = s.block_label ? 2.0 : 1.85;
  const boxH = 1.4;
  slide.addShape('roundRect', { x: 0.4, y: baseY, w: 12.5, h: boxH, rectRadius: 0.1, fill: { color: '1C2A40' }, line: { color: c.GOLD, width: 1.5 } });
  const runs = (s.goldbox_runs || (s.bullets || []).map(b => ({ text: b }))).map(r => ({
    text: r.text, options: { bold: !!r.bold, color: r.bold ? c.GOLD : 'EAFFF3', fontSize: 18 }
  }));
  slide.addText(runs, { x: 0.7, y: baseY + 0.15, w: 12.0, h: boxH - 0.3, valign: 'middle' });
  // Si hay bullets adicionales debajo
  if ((s.bullets || []).length && !s.goldbox_runs) return;
  if ((s.bullets || []).length) {
    const items = s.bullets.map(b => ({ text: b, options: { bullet: { code: '25CF' }, fontSize: 14, color: c.NAV, breakLine: true, paraSpaceAfter: 8, indent: 14 } }));
    slide.addText(items, { x: 0.6, y: baseY + boxH + 0.3, w: 12.2, h: 7 - baseY - boxH - 0.5 });
  }
}

function renderHighlight(slide, s, c) {
  // Caja navy oscura con borde verde + texto destacado grande
  const baseY = s.block_label ? 2.05 : 1.85;
  const text = s.highlight_text || s.title || '';
  const runs = s.highlight_runs || [{ text }];
  slide.addShape('roundRect', { x: 0.4, y: baseY, w: 12.5, h: 1.5, rectRadius: 0.1, fill: { color: '143726' }, line: { color: '10B981', width: 1.25 } });
  slide.addShape('rect', { x: 0.4, y: baseY, w: 0.1, h: 1.5, fill: { color: '10B981' } });
  const rich = runs.map(r => ({ text: r.text, options: { bold: !!r.bold, color: r.bold ? c.GOLD : 'EAFFF3', fontSize: 17 } }));
  slide.addText(rich, { x: 0.75, y: baseY + 0.15, w: 12.0, h: 1.2, valign: 'middle', lineSpacingMultiple: 1.15 });
  // Cards "Antes de X" abajo
  const cards = s.cards || [];
  if (cards.length) {
    const yc = baseY + 1.75;
    const cardW = (12.4 / cards.length) - 0.15;
    cards.slice(0, 4).forEach((card, i) => {
      const x = 0.4 + i * (cardW + 0.15);
      slide.addShape('roundRect', { x, y: yc, w: cardW, h: 2.5, fill: { color: c.WHITE }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
      slide.addShape('rect', { x, y: yc, w: cardW, h: 0.06, fill: { color: c.GOLD } });
      slide.addText(String(card.title || ''), { x: x + 0.15, y: yc + 0.2, w: cardW - 0.3, h: 0.4, fontSize: 13, bold: true, color: c.NAV });
      const itemsR = (card.items || []).map(t => ({ text: t, options: { fontSize: 12, color: c.NAV, breakLine: true, paraSpaceAfter: 6 } }));
      slide.addText(itemsR, { x: x + 0.15, y: yc + 0.65, w: cardW - 0.3, h: 1.75 });
    });
  }
}

// ─── LAYOUTS PREMIUM VISUALES ───
function renderHeroImage(slide, s, c) {
  // Full-bleed hero image + título overlay grande (magazine cover style)
  const url = s.image_url || eduUnsplashUrl(eduSlideToImageQuery(s));
  try {
    slide.addImage({ path: url, x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: 'cover', w: 13.333, h: 7.5 } });
    // Gradient overlay desde abajo (gradient se simula con 2 rects)
    slide.addShape('rect', { x: 0, y: 4.5, w: 13.333, h: 3.0, fill: { color: '0F172A', transparency: 25 }, line: { type: 'none' } });
    slide.addShape('rect', { x: 0, y: 5.5, w: 13.333, h: 2.0, fill: { color: '0F172A', transparency: 10 }, line: { type: 'none' } });
  } catch(e) {}

  // Block label arriba a la izquierda
  if (s.block_label) {
    slide.addShape('roundRect', { x: 0.5, y: 0.6, w: 3.5, h: 0.5, rectRadius: 0.05, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    slide.addText(String(s.block_label).toUpperCase(), { x: 0.5, y: 0.6, w: 3.5, h: 0.5, fontSize: 12, bold: true, color: c.NAV, align: 'center', valign: 'middle', charSpacing: 2 });
  }
  // Título abajo grande sobre el gradient
  slide.addText(s.title || '', { x: 0.6, y: 5.0, w: 12.2, h: 1.4, fontSize: 44, bold: true, color: c.WHITE, valign: 'bottom' });
  if (s.subtitle) {
    slide.addShape('rect', { x: 0.6, y: 6.5, w: 1.5, h: 0.05, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    slide.addText(s.subtitle, { x: 0.6, y: 6.6, w: 12.2, h: 0.6, fontSize: 16, color: 'E2E8F0', italic: true });
  }
}

function renderSplitImage(slide, s, c) {
  // 50/50: imagen izquierda + contenido derecha
  const url = s.image_url || eduUnsplashUrl(eduSlideToImageQuery(s));
  try {
    slide.addImage({ path: url, x: 0, y: 0.55, w: 6.5, h: 6.55, sizing: { type: 'cover', w: 6.5, h: 6.55 } });
  } catch(e) {
    slide.addShape('rect', { x: 0, y: 0.55, w: 6.5, h: 6.55, fill: { color: c.NAV }, line: { type: 'none' } });
  }
  // Banda dorada vertical entre imagen y texto
  slide.addShape('rect', { x: 6.5, y: 0.55, w: 0.08, h: 6.55, fill: { color: c.GOLD }, line: { color: c.GOLD } });

  // Contenido derecha
  const xT = 6.95, wT = 12.5 - xT;
  if (s.block_label) {
    slide.addText(String(s.block_label).toUpperCase(), { x: xT, y: 0.85, w: wT, h: 0.3, fontSize: 11, bold: true, color: c.GOLD, charSpacing: 3 });
  }
  slide.addText(s.title || '', { x: xT, y: s.block_label ? 1.25 : 1.0, w: wT, h: 1.0, fontSize: 28, bold: true, color: c.NAV });
  if (s.subtitle) {
    slide.addText(s.subtitle, { x: xT, y: s.block_label ? 2.3 : 2.05, w: wT, h: 0.5, fontSize: 14, color: c.GRAY_MED, italic: true });
  }
  const yC = s.block_label ? 2.95 : 2.7;
  // Bullets como cards mini
  const items = s.bullets || [];
  items.slice(0, 5).forEach((b, i) => {
    const y = yC + i * 0.75;
    slide.addShape('ellipse', { x: xT, y: y + 0.1, w: 0.4, h: 0.4, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
    slide.addText(String(i+1), { x: xT, y: y + 0.1, w: 0.4, h: 0.4, fontSize: 14, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    slide.addText(b, { x: xT + 0.55, y, w: wT - 0.55, h: 0.6, fontSize: 13, color: c.NAV, valign: 'middle' });
  });
}

function renderChartSpotlight(slide, s, c) {
  // Chart grande 65% del slide + 3 insights laterales
  const chartUrl = s.chart_url || eduStatsToChartUrl(s.stats || s.metric_cards || [], c.ACCENT);
  if (chartUrl) {
    try {
      slide.addImage({ path: chartUrl, x: 0.4, y: 1.4, w: 8.2, h: 5.3 });
    } catch(e) {}
  } else {
    // Fallback: bullets en card grande
    slide.addShape('roundRect', { x: 0.4, y: 1.4, w: 8.2, h: 5.3, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    slide.addText('Sin chart_url ni stats numéricos para graficar', { x: 0.6, y: 4.0, w: 7.8, h: 0.5, fontSize: 14, color: c.GRAY_MED, italic: true, align: 'center' });
  }

  // Panel derecho con 3 insights
  const insights = s.insights || (s.bullets || []).slice(0, 3).map(b => ({ title: '💡', body: b }));
  const xI = 8.85, wI = 4.05;
  insights.slice(0, 3).forEach((ins, i) => {
    const y = 1.4 + i * 1.8;
    slide.addShape('roundRect', { x: xI, y, w: wI, h: 1.6, fill: { color: c.WHITE }, line: { color: c.ACCENT, width: 1.5 }, rectRadius: 0.1 });
    slide.addShape('rect', { x: xI, y, w: 0.1, h: 1.6, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    slide.addText(String(ins.title || '💡'), { x: xI + 0.2, y: y + 0.15, w: wI - 0.4, h: 0.4, fontSize: 16, bold: true, color: c.ACCENT });
    slide.addText(String(ins.body || ''), { x: xI + 0.2, y: y + 0.55, w: wI - 0.4, h: 1.0, fontSize: 11, color: c.NAV, valign: 'top' });
  });
}

function renderImageGrid(slide, s, c) {
  // Grid de 2x2 o 1x3 con imágenes + captions
  const items = s.image_grid || (s.bullets || []).slice(0, 4).map(b => ({ caption: b, image_query: b }));
  const n = Math.min(items.length, 4);
  if (!n) return renderDefault(slide, s, c);
  const cols = n <= 2 ? n : 2;
  const rows = Math.ceil(n / cols);
  const baseY = s.block_label ? 1.9 : 1.7;
  const totalH = 5.0;
  const cardW = (12.5 / cols) - 0.15;
  const cardH = (totalH / rows) - 0.15;
  items.slice(0, n).forEach((item, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 0.4 + col * (cardW + 0.15);
    const y = baseY + row * (cardH + 0.15);
    const url = item.image_url || eduUnsplashUrl(item.image_query || item.caption || 'business');
    try {
      slide.addImage({ path: url, x, y, w: cardW, h: cardH * 0.72, sizing: { type: 'cover', w: cardW, h: cardH * 0.72 } });
    } catch(e) {
      slide.addShape('rect', { x, y, w: cardW, h: cardH * 0.72, fill: { color: c.NAV_LIGHT }, line: { type: 'none' } });
    }
    // Caption card abajo
    slide.addShape('rect', { x, y: y + cardH * 0.72, w: cardW, h: cardH * 0.28, fill: { color: c.NAV }, line: { color: c.NAV } });
    slide.addShape('rect', { x, y: y + cardH * 0.72, w: 0.06, h: cardH * 0.28, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    slide.addText(item.caption || '', { x: x + 0.15, y: y + cardH * 0.72, w: cardW - 0.25, h: cardH * 0.28, fontSize: 11, bold: true, color: c.WHITE, valign: 'middle' });
  });
}

function eduDownloadSpeakerNotes() {
  const aiKey = `edu-pres-${eduState.mentorshipId}`;
  const p = (window.aiState[aiKey] || {}).presentation;
  if (!p) return;
  const text = `${p.title}\n${'='.repeat(p.title.length)}\n\n${(p.slides||[]).map(s => `--- Slide ${s.number}: ${s.title} ---\n${s.subtitle ? s.subtitle + '\n' : ''}${(s.bullets||[]).map(b => '• ' + b).join('\n')}\n\n🎙 NOTAS:\n${s.speaker_notes || '(sin notas)'}\n`).join('\n')}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${p.title.replace(/[^a-z0-9]/gi,'_')}_speaker_notes.txt`;
  a.click();
}

function eduLoadPresentation(id) {
  const p = (eduState.presentations || []).find(x => x.id === id);
  if (!p) return alert('Presentación no encontrada');
  const aiKey = `edu-pres-${eduState.mentorshipId}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { presentation: { title: p.title, outline: p.outline, slides: p.slides, all_sources: p.sources } };
  eduRender();
}

async function eduDeletePresentation(id) {
  if (!confirm('¿Eliminar esta presentación del historial?')) return;
  await sb.from('edu_presentations').delete().eq('id', id);
  await eduLoadAll(); eduRender();
}

// ============================================================
// TAB: INFORMES IA (stub)
// ============================================================
function eduRenderReports() {
  const reports = (eduState.reports || []).filter(r => r.mentorship_id === eduState.mentorshipId);
  return `
    <div class="space-y-3">
      <div class="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
        💡 <strong>Informes IA</strong> — generá reportes semanales/quincenales/mensuales con análisis de cartera, progreso de estudiantes y notas de clases.
      </div>
      <div class="text-center py-8 text-slate-500">
        <div class="text-3xl mb-2">📈</div>
        <div class="text-sm font-bold">Sección en construcción</div>
        <div class="text-xs mt-1">La generación de informes con IA se conecta en el siguiente turno.</div>
      </div>
      ${reports.length ? `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase">Informes guardados (${reports.length})</div>
          <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            ${reports.map(r => `<div class="p-2 text-xs"><strong>${r.title || r.period_type}</strong> · ${r.period_start} → ${r.period_end}</div>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================
// SISTEMA INDEPENDIENTE: GENERADOR DE PRESENTACIONES
// Reusa eduState + eduRenderPresentations pero abre su propio modal
// con selector de mentoría arriba.
// ============================================================
async function openEduPresentationsSystem(sys) {
  eduState.sys = sys;
  // Por default arranca con la primera mentoría activa
  openModal(`🎬 ${sys.name}`, '<div id="edu-root">Cargando...</div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  await eduLoadAll();
  if (!eduState.mentorshipId && eduState.mentorships.length) {
    const firstActive = eduState.mentorships.find(m => m.active);
    if (firstActive) eduState.mentorshipId = firstActive.id;
  }
  eduState.tab = '__presentations_only__';  // marker para el render custom
  eduRenderPresentationsStandalone();
}

function eduRenderPresentationsStandalone() {
  const root = document.getElementById('edu-root');
  if (!root) return;
  const cur = eduCurrentMentorship();
  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[84vh]">
      <!-- Selector mentoría -->
      <div class="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 flex-wrap">
        <span class="text-[10px] font-bold uppercase text-slate-500 mr-1">Mentoría:</span>
        ${eduState.mentorships.filter(m => m.active).map(m => `
          <button onclick="eduState.mentorshipId='${m.id}'; eduRenderPresentationsStandalone()"
            class="px-3 py-1.5 rounded-lg text-xs font-bold ${eduState.mentorshipId===m.id?'bg-slate-900 text-white shadow':'bg-slate-100 hover:bg-slate-200'}">
            ${m.icon} ${m.name}
          </button>
        `).join('')}
        <div class="ml-auto text-[10px] text-slate-500">${cur ? cur.name : 'Sin mentoría seleccionada'}</div>
      </div>
      <!-- Reusa el render existente -->
      <div class="flex-1 overflow-y-auto">
        ${eduRenderPresentations()}
      </div>
    </div>
  `;
}

// Sobreescribir eduRender para volver acá cuando estamos en standalone
const _eduRenderOrig = eduRender;
window.eduRender = function() {
  if (eduState.tab === '__presentations_only__') return eduRenderPresentationsStandalone();
  if (eduState.tab === '__reports_only__') return eduRenderReportsStandalone();
  return _eduRenderOrig();
};

// ============================================================
// SISTEMA INDEPENDIENTE: INFORMES EJECUTIVOS
// ============================================================
async function openEduReportsSystem(sys) {
  eduState.sys = sys;
  openModal(`📈 ${sys.name}`, '<div id="edu-root">Cargando...</div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-6xl');
  await eduLoadAll();
  if (!eduState.mentorshipId && eduState.mentorships.length) {
    const firstActive = eduState.mentorships.find(m => m.active);
    if (firstActive) eduState.mentorshipId = firstActive.id;
  }
  eduState.tab = '__reports_only__';
  eduRenderReportsStandalone();
}

// Cache de KPIs cargados (se recarga al cambiar mentoría o mes)
let eduKpisCache = { key: null, data: null, loading: false };

async function eduLoadKPIs(mentorshipId, mesIso) {
  if (!mentorshipId) return null;
  const key = `${mentorshipId}|${mesIso}`;
  if (eduKpisCache.key === key && eduKpisCache.data) return eduKpisCache.data;
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
    eduKpisCache.loading = false;
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

  // Lanzar carga de KPIs (asincrónico)
  let kpis = null;
  if (cur && eduState.mentorshipId) {
    kpis = (eduKpisCache.key === `${eduState.mentorshipId}|${mes}`) ? eduKpisCache.data : null;
    if (!kpis && !eduKpisCache.loading) {
      eduLoadKPIs(eduState.mentorshipId, mes).then(() => eduRenderReportsStandalone());
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
        <div class="flex items-center justify-between bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <div class="min-w-0">
            <div class="font-bold text-sm text-slate-900 truncate">${(selStudent.full_name||'').replace(/</g,'&lt;')}</div>
            <div class="text-[11px] text-slate-600">
              ${selStudent.current_stage || 'Sin etapa'} ${selStudent.grupo ? '· '+selStudent.grupo : ''} ${selStudent.email ? '· '+selStudent.email : ''}
            </div>
            <div class="text-[10px] text-emerald-700 mt-1">✓ Respuestas pre-llenadas desde el CRM. Revisá y ajustá lo que necesites.</div>
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
    etapa = 'E5.1';
    cronograma = '1-2 meses post-mortem + SOPs antes del siguiente';
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

// ─── BIBLIOTECA DE BLOQUES TIPO MIGUEL GUZMÁN ───
// Cada bloque tiene: aplicaA, etapa, subetapa, observacion, tiempo, actividad,
//                    entregable, pasos[], recursos[{nombre, url, desc}], errores[]
const FM_BLOQUES = [
  // ━━━━━━━━━━ E0 — FUNDACIÓN ━━━━━━━━━━
  {
    id: 'llc_setup',
    aplicaA: (p, a) => a.llc === 'no',
    etapa: 'E0', subetapa: 'LLC y fundación legal',
    observacion: 'No se ofertan propiedades sin LLC. Es la diferencia entre proteger tu patrimonio personal y arriesgarlo en cada deal. Esto se hace ANTES de buscar deals — toma 1-4 semanas según el estado, así que se arranca paralelo al estudio de mercado.',
    tiempo: '8-12 horas + tiempo de procesamiento estatal (1-4 semanas)',
    actividad: (p, a) => `Formar LLC en el estado donde se va a invertir (${p.mercado || 'estado de inversión'}), obtener EIN del IRS, firmar Operating Agreement, abrir cuenta bancaria de negocio + tarjeta crédito, configurar software contable y identificar CPA + abogado de real estate.`,
    entregable: 'LLC aprobada + EIN + Operating Agreement firmado + cuenta bancaria activa + software contable conectado + CPA y abogado en lista de contactos.',
    pasos: [
      'Decidir el estado donde se invertirá (NO donde vive — el estado de la propiedad).',
      'Verificar disponibilidad del nombre de la LLC en el portal del Secretary of State.',
      'Contratar Registered Agent profesional ($99-$300/año) o ser propio si vive en el estado.',
      'Llenar Certificate of Formation + pagar filing fee ($50-$425 según estado).',
      'Solicitar EIN gratis al IRS (10 minutos online, inmediato).',
      'Descargar template de Operating Agreement (LLC University) y firmarlo.',
      'Abrir cuenta bancaria de negocio (Chase Business / Bluevine / Mercury) + tarjeta crédito.',
      'Conectar cuenta a software contable (Stessa gratis para 1-2 props, QuickBooks si escala).',
      'Entrevistar 2-3 CPAs y 2-3 abogados de real estate. Elegir 1 primario de cada uno.'
    ],
    recursos: [
      { nombre: 'Northwest Registered Agent', url: 'https://www.northwestregisteredagent.com', desc: 'LLC formation + RA ($39 + state fee)' },
      { nombre: 'IRS EIN Application', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online', desc: 'EIN gratis online' },
      { nombre: 'LLC University Template', url: 'https://www.llcuniversity.com/llc-operating-agreement', desc: 'Operating Agreement gratis' },
      { nombre: 'Stessa', url: 'https://www.stessa.com', desc: 'Contabilidad real estate gratis' },
      { nombre: 'BiggerPockets Find a Tax Pro', url: 'https://www.biggerpockets.com/professionals/tax-pros', desc: 'CPAs de real estate' }
    ],
    errores: [
      'Formar LLC en Delaware/Nevada por "protección extra" (genera foreign filing + costo doble).',
      'Usar cuenta personal "temporalmente" para el negocio — destruye protección legal.',
      'Operar sin Operating Agreement (vulnerable a pierce the corporate veil).',
      'Buscar CPA en abril (deadline taxes) — pagás 2-3x más y servicio mediocre.',
      'No verificar Registered Agent (no puede ser PO Box, debe ser dirección física).'
    ]
  },
  {
    id: 'big_why_mindset',
    aplicaA: (p, a) => a.deals_cerrados === '0' && (a.mayor_obstaculo === 'miedo' || !a.setup_legal?.includes('cpa')),
    etapa: 'E0', subetapa: 'Big Why + bloque diario + Quick Win',
    observacion: 'El 80% de los que abandonan no es por falta de información — es por falta de claridad de propósito y disciplina. El Big Why escrito, el bloque diario no negociable y un Quick Win en semana 1 son los predictores #1 de NO abandono.',
    tiempo: '4-6 horas (setup) + cadencia diaria sostenida',
    actividad: 'Documentar Big Why personal por escrito (1-2 páginas), bloquear 90 min diarios no negociables en el calendario, ejecutar un Quick Win medible en la primera semana del programa.',
    entregable: 'Big Why firmado + bloque diario activo en calendario + Quick Win documentado con evidencia (screenshot, foto, email).',
    pasos: [
      'Bloquear 2-3 horas sin interrupciones para escribir Big Why (template del Anexo C).',
      'Llenar template: situación actual, visión a 5 años, lo que pierdo si no lo logro, por qué ahora, compromisos no negociables.',
      'Firmar + imprimir + colocar en lugar visible (escritorio o espejo).',
      'Compartir con coach + 2 personas cercanas (accountability público).',
      'Bloquear 90 min diarios mismo horario en Google Calendar como "FLIPPING NEGOCIO - NO DISPONIBLE".',
      'Elegir 1 Quick Win de las 4 opciones (oferta en vivo / wholesaler en buyer list / evento REIA / term sheet HML).',
      'Ejecutar + documentar con evidencia.',
      'Compartir Quick Win con coach y comunidad para refuerzo social.'
    ],
    recursos: [
      { nombre: 'Anexo C — Mindset y Top 20 errores', url: '#', desc: 'Template Big Why + sistema accountability' },
      { nombre: 'Google Calendar', url: 'https://calendar.google.com', desc: 'Bloque diario recurrente' },
      { nombre: 'Toggl Track', url: 'https://toggl.com', desc: 'Medir tiempo real del bloque' },
      { nombre: 'National REIA Directory', url: 'https://nationalreia.org/find-a-reia/', desc: 'Encontrar evento local para Quick Win' }
    ],
    errores: [
      'Big Why genérico ("quiero ser libre financieramente") — sin pierde fuerza.',
      'No compartir con nadie — sin accountability.',
      'Bloque flexible ("a veces en la mañana, a veces en la noche") — nunca se convierte en hábito.',
      'Saltarse el Quick Win — semana 1 sin victoria mata la motivación.',
      'Esperar a "sentir ganas" para trabajar — nunca llegan.'
    ]
  },

  // ━━━━━━━━━━ E1 — EVALUAR ━━━━━━━━━━
  {
    id: 'buybox_operativo',
    aplicaA: (p, a) => a.objetivo !== 'lender' && (a.buybox === 'cero' || a.buybox === 'mental' || a.buybox === 'parcial'),
    etapa: 'E1', subetapa: 'Buy Box operativo',
    observacion: 'Crear 5 Buy Boxes porque un solo ZIP puede engañar. Comparar 5 zonas le permite ver dónde hay mejor ARV, velocidad de salida, inventario y margen. No es para comprar en todas; es para escoger con datos y no por intuición.',
    tiempo: 'Aproximadamente 6 a 8 horas totales.',
    actividad: (p, a) => `Definir exactamente qué compra, dónde compra, con qué estrategia y bajo qué condiciones mínimas. La estrategia principal será ${p.estrategiaLabel || 'Fix & Flip'}; ${a.objetivo === 'hibrido' ? 'Fix & Hold se revisa como segunda lectura' : 'una estrategia secundaria se revisa solo si los números lo justifican'}, pero no debe distraer el foco inicial.`,
    entregable: 'Buy Box Resumen de 1 página listo para enviar a wholesalers, realtors, lenders e inversionistas.',
    pasos: (p, a) => [
      `Definir estrategia principal: ${p.estrategiaLabel || 'Fix & Flip'} como base.`,
      `Elegir máximo 5 ZIP codes objetivo en ${p.mercado || '[tu mercado]'}. No abrir más zonas hasta dominar estas primeras.`,
      'Por cada ZIP definir: tipo de propiedad, ARV objetivo, precio máximo de compra, rehab aceptado, DOM máximo y perfil del comprador final.',
      'Crear lista de red flags: foundation severa, flood zone, liens, HOA alta, DOM excesivo, zona sin compradores o rehab fuera de control.',
      'Reducir a un Buy Box de 1 página con lenguaje claro y profesional.',
      'Practicar el pitch en voz alta hasta explicarlo en menos de 60 segundos.'
    ],
    recursos: [
      { nombre: 'Zillow', url: 'https://www.zillow.com', desc: 'Validar precios, activos y vendidos' },
      { nombre: 'Redfin', url: 'https://www.redfin.com', desc: 'Validar vendidos y DOM' },
      { nombre: 'Realtor.com', url: 'https://www.realtor.com', desc: 'Validación adicional del mercado' },
      { nombre: 'GreatSchools', url: 'https://www.greatschools.org', desc: 'Validar perfil familiar del comprador final' },
      { nombre: 'FEMA Flood Map', url: 'https://msc.fema.gov/portal/home', desc: 'Validar flood zones' },
      { nombre: 'Google Drive', url: 'https://drive.google.com', desc: 'Organizar Buy Box, tareas y evidencia' }
    ],
    errores: [
      'Hacer un Buy Box tan amplio que cualquier propiedad parece oportunidad.',
      'Mezclar Fix & Flip y Fix & Hold en el mismo criterio sin separar números.',
      'Elegir ZIPs porque "se ven buenos" y no porque tienen ventas reales.',
      'No incluir cómo cierra: HML, cash, días de cierre y capacidad real.',
      'Enviar a wholesalers un documento largo que nadie lee.'
    ]
  },
  {
    id: 'arv_comparables',
    aplicaA: (p, a) => a.objetivo !== 'lender' && (a.arv_skill !== 'experto'),
    etapa: 'E1', subetapa: 'Validación de mercado y comparables',
    observacion: 'El ARV no se toma del wholesaler ni de una plataforma sin validar. El ARV se prueba con vendidos reales, fotos, condición, ubicación y similitud. Un ARV inflado destruye el deal desde el día uno.',
    tiempo: 'Aproximadamente 8 a 10 horas totales.',
    actividad: 'Validar los 5 ZIP codes del Buy Box con comparables vendidos y comportamiento real del mercado.',
    entregable: 'Mapa de ARV por ZIP con ARV conservador, ARV agresivo, DOM promedio, riesgo principal y decisión final: usar, observar o descartar.',
    pasos: [
      'Tomar los 5 ZIP codes definidos en el Bloque 1.',
      'Buscar mínimo 3 flips vendidos recientemente por cada ZIP.',
      'Buscar propiedades activas y pendientes similares para entender competencia.',
      'Comparar sqft, habitaciones, baños, año, lote, condición y ubicación.',
      'Revisar DOM promedio y velocidad de venta.',
      'Definir ARV conservador por ZIP y eliminar zonas donde el ARV dependa de un solo comparable bonito.'
    ],
    recursos: [
      { nombre: 'Zillow Sold', url: 'https://www.zillow.com', desc: 'Filtro Sold y últimos 6 a 12 meses' },
      { nombre: 'Redfin Data Center', url: 'https://www.redfin.com/news/data-center', desc: 'Datos de DOM, sale-to-list ratio y mercado' },
      { nombre: 'Realtor.com Research', url: 'https://www.realtor.com/research/data', desc: 'Tendencias de mercado' },
      { nombre: 'NeighborhoodScout', url: 'https://www.neighborhoodscout.com', desc: 'Perfil de zona, crimen y demografía' },
      { nombre: 'U.S. Census QuickFacts', url: 'https://www.census.gov/quickfacts', desc: 'Datos poblacionales y económicos' },
      { nombre: 'PropStream', url: 'https://www.propstream.com', desc: 'Comps y datos de propiedades (si tiene acceso)' }
    ],
    errores: [
      'Usar listados activos como prueba de ARV. Los activos son expectativas, no ventas.',
      'Elegir el comparable más alto para justificar una oferta emocional.',
      'Ignorar DOM alto porque "la casa está barata".',
      'Comparar contra casas con remodelación superior, mejor lote o ubicación premium.',
      'No guardar screenshots ni evidencia.'
    ]
  },
  {
    id: 'analisis_mao',
    aplicaA: (p, a) => a.objetivo !== 'lender' && (a.ofertas_mes === 'cero' || a.ofertas_mes === 'analisis_no_oferta' || a.ofertas_mes === '1_9'),
    etapa: 'E1', subetapa: 'Sistema de análisis, MAO y descarte',
    observacion: 'Repetición. La habilidad no se forma con una propiedad perfecta; se forma analizando varias, descartando rápido y justificando con números. Si no analiza volumen, no desarrolla criterio.',
    tiempo: 'Aproximadamente 6 a 9 horas totales.',
    actividad: 'Crear una plantilla única de análisis y analizar mínimo 10 propiedades, aunque no todas sean buenas. La meta no es encontrar el deal perfecto; es entrenar criterio.',
    entregable: 'Tabla con 10 propiedades analizadas con ARV, rehab, holding costs, closing costs, MAO, decisión y evidencia.',
    pasos: [
      'Crear una plantilla en Google Sheets, Airtable o Taskade.',
      'Por cada propiedad registrar dirección, ZIP, fuente, asking price, ARV, rehab, holding costs, closing costs, fees, profit mínimo, MAO y decisión.',
      'Calcular MAO base: ARV × 75% − Rehab.',
      'Ajustar el MAO por holding costs, closing costs, lender fees, wholesale fee, contingencia y riesgo.',
      'Clasificar cada propiedad: ofertar, negociar o descartar.',
      'Guardar screenshots de comps, fotos relevantes y cálculo final.'
    ],
    recursos: [
      { nombre: 'Airtable', url: 'https://www.airtable.com', desc: 'Tracking de deals y contactos' },
      { nombre: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', desc: 'Plantilla de análisis' },
      { nombre: 'BiggerPockets Flip Calculator', url: 'https://www.biggerpockets.com/fix-and-flip-calculator', desc: 'Calculadora Fix & Flip' },
      { nombre: 'Flipper Force', url: 'https://www.flipperforce.com', desc: 'Deal analyzer y scope of work' },
      { nombre: 'Zillow', url: 'https://www.zillow.com', desc: 'Comps gratuitos' },
      { nombre: 'Redfin', url: 'https://www.redfin.com', desc: 'Validación cruzada' }
    ],
    errores: [
      'Cambiar la fórmula para que el deal "cuadre".',
      'No incluir holding costs, utilities, insurance, taxes e intereses.',
      'Usar rehab "a ojo" sin rango ni contingencia.',
      'No descartar rápido propiedades malas.',
      'Enamorarse de una propiedad porque se ve remodelable.'
    ]
  },

  // ━━━━━━━━━━ E2 — ESTRUCTURAR ━━━━━━━━━━
  {
    id: 'capital_stack',
    aplicaA: (p, a) => a.objetivo !== 'lender',
    etapa: 'E2', subetapa: 'Capital Stack real',
    observacion: 'Este es el punto más delicado. No puede decir que está listo si no sabe cuánto earnest money puede poner, cuánto gap puede cubrir y cuánto debe dejar de reserva. El capital teórico no se usa para ofertar.',
    tiempo: 'Aproximadamente 4 a 6 horas totales.',
    actividad: 'Documentar cuánto capital real tiene disponible y separar lo líquido, lo probable y lo teórico.',
    entregable: 'Capital Stack documentado con cash, crédito personal, crédito comercial, dinero familiar, capital privado, earnest money, reserva mínima y capacidad real de cierre.',
    pasos: [
      'Listar todas las fuentes de capital actuales.',
      'Clasificar cada fuente como líquida inmediata, probable o teórica.',
      'Definir cuánto puede usar para earnest money en 24 a 48 horas.',
      'Definir cuánto puede usar para gap sin comprometer su estabilidad.',
      'Definir reserva mínima que no se toca.',
      'Crear una tabla con monto, tiempo de acceso, costo, riesgo y uso permitido.'
    ],
    recursos: [
      { nombre: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', desc: 'Tabla Capital Stack' },
      { nombre: 'Bank of America Business', url: 'https://www.bankofamerica.com/smallbusiness', desc: 'Banca y tarjetas de negocio' },
      { nombre: 'Chase Business', url: 'https://www.chase.com/business', desc: 'Banca y tarjetas de negocio' },
      { nombre: 'Bluevine', url: 'https://www.bluevine.com', desc: 'Online business banking, sin fees' }
    ],
    errores: [
      'Usar todo el crédito para EMD y quedarse sin reserva.',
      'No separar dinero de cierre, rehab, holding y contingencia.',
      'No calcular el gap antes de hablar con HMLs.',
      'Asumir que el HML cubre el 100% — siempre hay equity del estudiante (10-20%).',
      'Contar como capital el HELOC sin haberlo aplicado todavía.'
    ]
  },
  {
    id: 'hml_documentos',
    aplicaA: (p, a) => a.objetivo !== 'lender' && (a.hml_status === 'ninguno' || a.hml_status === 'investigando' || a.hml_status === 'hablado'),
    etapa: 'E2', subetapa: 'HMLs con documentos',
    observacion: 'Las llamadas no cierran propiedades. Los documentos sí. El estudiante puede hablar con 10 HMLs, pero si no tiene términos comparados ni term sheets, todavía no tiene estructura de financiamiento.',
    tiempo: 'Aproximadamente 8 a 10 horas totales.',
    actividad: 'Construir base de 10 HMLs, comparar términos y solicitar term sheets oficiales a mínimo 6.',
    entregable: 'HML Database con 10 fichas + 5 term sheets oficiales + HML primario y backup identificados.',
    pasos: [
      'Armar lista de 10 HMLs: 5 nacionales y 5 locales.',
      'Llamar o escribir a cada uno usando un script profesional.',
      'Documentar tasa, puntos, LTV, LTC, plazo, draw schedule, experiencia requerida y tiempo de cierre.',
      'Preguntar si hacen hard inquiry o soft pull.',
      'Preguntar si aceptan primer flip y si financian rehab.',
      'Solicitar term sheet oficial en PDF a los 5 mejores.',
      'Elegir HML primario y HML backup.'
    ],
    recursos: [
      { nombre: 'Kiavi', url: 'https://www.kiavi.com', desc: 'Cotización HML rápida (32+ estados)' },
      { nombre: 'Lima One Capital', url: 'https://www.limaone.com', desc: 'HML nacional (40+ estados)' },
      { nombre: 'RCN Capital', url: 'https://www.rcncapital.com', desc: 'HML nacional' },
      { nombre: 'Easy Street Capital', url: 'https://www.easystreetcap.com', desc: 'HML y DSCR' },
      { nombre: 'Visio Lending', url: 'https://www.visiolending.com', desc: 'DSCR / rental loans' },
      { nombre: 'HardMoneyHome', url: 'https://hardmoneyhome.com', desc: 'Directorio de hard money por estado' },
      { nombre: 'Scotsman Guide', url: 'https://www.scotsmanguide.com/Profiles/Search', desc: 'Directorio de lenders' }
    ],
    errores: [
      'Aceptar términos verbales sin term sheet.',
      'Solo preguntar tasa e ignorar puntos, fees, draw schedule y prepayment penalty.',
      'No preguntar si aceptan first-time flipper.',
      'No tener HML backup.',
      'Aplicar con todos sin controlar hard inquiries (dañan score).'
    ]
  },
  {
    id: 'base_contactos',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.wholesalers !== '10_mas',
    etapa: 'E2', subetapa: 'Base mínima de contactos',
    observacion: 'Sin flujo no hay criterio. Si solo recibe 1 o 2 propiedades ocasionales, cualquier deal regular parece bueno. La red debe alimentar el análisis semanal.',
    tiempo: 'Aproximadamente 6 a 8 horas totales.',
    actividad: 'Construir la base mínima del mercado para no depender de 2 o 3 wholesalers.',
    entregable: 'Base de contactos con: 25 wholesalers, 10 realtors investor-friendly, 5 agentes distressed, 5 REIA/networking, 5 private lenders, 10 HMLs, 5 contratistas, 2 title companies.',
    pasos: [
      'Crear tabla maestra de contactos en Airtable, Google Sheets o Taskade.',
      'Buscar y registrar 25 wholesalers activos.',
      'Buscar 10 realtors investor-friendly y 5 agentes que trabajen distressed properties.',
      'Identificar 5 contactos de REIA o networking local.',
      'Listar 5 posibles private lenders del círculo cercano o red profesional.',
      'Agregar los 10 HMLs del bloque anterior.',
      'Agregar 5 contratistas y 2 title companies investor-friendly.',
      'Clasificar cada contacto: nuevo, contactado, respondió, activo o descartado.'
    ],
    recursos: [
      { nombre: 'BiggerPockets Marketplace', url: 'https://www.biggerpockets.com/marketplace', desc: 'Contactos REI y deals' },
      { nombre: 'Connected Investors', url: 'https://connectedinvestors.com', desc: 'Red nacional de inversionistas' },
      { nombre: 'InvestorLift', url: 'https://www.investorlift.com', desc: 'Deals de wholesalers' },
      { nombre: 'New Western', url: 'https://newwestern.com', desc: 'Wholesaler nacional' },
      { nombre: 'NetWorth Realty', url: 'https://networthrealty.com', desc: 'Wholesaler nacional' },
      { nombre: 'National REIA', url: 'https://nationalreia.org/find-a-reia/', desc: 'Encontrar REIA local' },
      { nombre: 'Meetup', url: 'https://www.meetup.com', desc: 'Eventos de real estate' },
      { nombre: 'Eventbrite', url: 'https://www.eventbrite.com', desc: 'Eventos locales' }
    ],
    errores: [
      'Guardar nombres sin contactar a nadie.',
      'Tener wholesalers fuera de los ZIPs del Buy Box.',
      'No registrar fecha de último contacto.',
      'No pedir referidos a cada contacto.',
      'No distinguir contactos activos de contactos muertos.'
    ]
  },
  {
    id: 'wholesalers_pitch',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.wholesalers !== '10_mas',
    etapa: 'E2/E1', subetapa: 'Wholesalers y pitch de comprador',
    observacion: 'El estudiante debe sonar como comprador serio, no como estudiante explorando. El wholesaler manda primero el deal al buyer que entiende rápido, responde rápido y puede cerrar.',
    tiempo: '5 a 7 horas totales.',
    actividad: 'Enviar el Buy Box a 25 wholesalers y construir un pipeline con calidad de respuesta, EMD típico y flujo real de deals.',
    entregable: 'Wholesaler Pipeline con 25 contactos enviados, mínimo 10 activos y clasificación A/B/C.',
    pasos: [
      'Enviar mensaje inicial con Buy Box de 1 página.',
      'Pedir que lo agreguen a buyer list.',
      'Preguntar ZIPs que cubren, deals por mes, EMD típico y tiempo de cierre.',
      'Preguntar si aceptan inspection period y qué title company usan.',
      'Clasificar A/B/C según calidad y respuesta.',
      'Hacer follow-up a los que no respondan en 48 horas.'
    ],
    recursos: [
      { nombre: 'InvestorLift', url: 'https://www.investorlift.com', desc: 'Deals y wholesalers' },
      { nombre: 'Facebook Groups', url: 'https://www.facebook.com', desc: 'Grupos locales de real estate investors' },
      { nombre: 'BiggerPockets', url: 'https://www.biggerpockets.com', desc: 'Networking y marketplace' },
      { nombre: 'HouseCashin Directory', url: 'https://www.housecashin.com', desc: 'Directorio de wholesalers' },
      { nombre: 'Google Drive', url: 'https://drive.google.com', desc: 'Guardar Buy Box PDF y evidencias' },
      { nombre: 'WhatsApp Business', url: 'https://business.whatsapp.com', desc: 'Seguimiento rápido' }
    ],
    errores: [
      'Escribir mensajes genéricos sin Buy Box.',
      'No decir cómo cierra ni cuánto tarda.',
      'No preguntar EMD antes de ofertar.',
      'No hacer seguimiento en 48 horas.',
      'Creer que por estar en una buyer list ya tiene flujo real.'
    ]
  },
  {
    id: 'contratistas_filtrados',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.objetivo !== 'wholesale' && a.gc_status !== 'primario_backup' && a.gc_status !== 'primario',
    etapa: 'E2', subetapa: 'Contratistas filtrados antes del deal',
    observacion: 'No necesitás llevar contratistas a casas que no son serias, pero sí necesitás tenerlos filtrados antes. Cuando aparece el deal no hay tiempo para empezar a buscar quién cotiza.',
    tiempo: 'Aproximadamente 6 a 8 horas totales.',
    actividad: 'Identificar 10 contratistas o GCs, entrevistarlos, validar licencia/seguro y elegir top 3 para cotizar rápido cuando aparezca un deal.',
    entregable: 'Contractor Database con 10 contratistas filtrados + top 3 clasificados A/B/C.',
    pasos: [
      'Buscar 10 contratistas o GCs en su mercado.',
      'Llamarlos y preguntar si trabajan Fix & Flip.',
      'Validar licencia, General Liability y Workers Comp si aplica.',
      'Pedir 2 proyectos recientes con fotos o dirección.',
      'Preguntar tiempos típicos para rehab de $50K, $75K y $100K.',
      'Preguntar si trabajan con contrato y draw schedule.',
      'Clasificar A/B/C y dejar top 3 listos para cotizar.'
    ],
    recursos: [
      { nombre: 'Better Business Bureau', url: 'https://www.bbb.org', desc: 'Revisar quejas y reputación' },
      { nombre: 'Angi', url: 'https://www.angi.com', desc: 'Buscar contratistas' },
      { nombre: 'Thumbtack', url: 'https://www.thumbtack.com', desc: 'Buscar contratistas locales' },
      { nombre: 'Google Business Profile', url: 'https://www.google.com/business/', desc: 'Reviews y reputación' },
      { nombre: 'HomeAdvisor', url: 'https://www.homeadvisor.com', desc: 'Contratistas con rating' }
    ],
    errores: [
      'Contratar al más barato sin verificar licencia ni seguro.',
      'No pedir proyectos recientes.',
      'No preguntar capacidad actual.',
      'No usar draw schedule.',
      'Confundir subcontratista bueno con GC capaz de manejar un flip completo.'
    ]
  },
  {
    id: 'ofertas_justificadas',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.ofertas_mes !== '10_mas',
    etapa: 'E1/E2', subetapa: 'Ofertas justificadas por números',
    observacion: 'Sí puede ofrecer bajo, pero no puede ofrecer bajo sin justificar. La oferta no se negocia desde "quiero pagar menos"; se negocia desde ARV, rehab, costos, riesgo y MAO.',
    tiempo: 'Aproximadamente 5 a 7 horas totales.',
    actividad: 'Preparar 3 paquetes de oferta con números completos y justificación para wholesaler.',
    entregable: '3 ofertas justificadas por MAO, con comps, ARV, rehab, costos, margen y explicación escrita.',
    pasos: [
      'Elegir 3 propiedades con potencial de las 10 analizadas.',
      'Preparar 3 comparables vendidos por propiedad.',
      'Definir ARV conservador, rehab realista, holding costs, closing costs y profit mínimo.',
      'Calcular MAO y oferta máxima.',
      'Redactar explicación breve para el wholesaler.',
      'Enviar oferta o dejarla lista para revisión del mentor.'
    ],
    recursos: [
      { nombre: 'Zillow', url: 'https://www.zillow.com', desc: 'Comps vendidos' },
      { nombre: 'Redfin', url: 'https://www.redfin.com', desc: 'Comps vendidos y DOM' },
      { nombre: 'BiggerPockets Calculator', url: 'https://www.biggerpockets.com/fix-and-flip-calculator', desc: 'Validación de números' },
      { nombre: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', desc: 'Paquete de oferta' },
      { nombre: 'DocuSign', url: 'https://www.docusign.com', desc: 'Firma de LOI o documentos' },
      { nombre: 'PandaDoc', url: 'https://www.pandadoc.com', desc: 'Alternativa para documentos' }
    ],
    errores: [
      'Ofertar alto por miedo a ofender al wholesaler.',
      'No explicar la oferta con números.',
      'No incluir holding y closing costs.',
      'Usar profit mínimo demasiado bajo.',
      'No guardar evidencia de los comps que respaldan la oferta.'
    ]
  },

  // ━━━━━━━━━━ E5 — ESCALAR ━━━━━━━━━━
  {
    id: 'post_mortem',
    aplicaA: (p, a) => a.deals_cerrados === '1',
    etapa: 'E5', subetapa: 'Post-mortem del primer flip',
    observacion: 'Sin análisis del primer flip, los errores se repiten. El post-mortem convierte experiencia en aprendizaje sistemático. NO empezar el segundo deal sin este documento completo.',
    tiempo: '6-10 horas totales',
    actividad: 'Hacer post-mortem detallado del primer flip: presupuesto real vs plan, cronograma real vs plan, ROI obtenido vs esperado, qué funcionó bien (top 5), qué falló (top 5), 3 procesos a sistematizar.',
    entregable: 'Documento de post-mortem completo + identificación de top 3 SOPs prioritarios para crear antes del próximo deal.',
    pasos: [
      'Reunir bitácoras semanales, budget tracker, fotos antes/después, todas las decisiones registradas.',
      'Análisis financiero: completar tabla presupuesto vs real con variación % por categoría.',
      'Análisis cronograma: comparar fechas planeadas vs reales por hito.',
      'Análisis ROI: ROI esperado vs obtenido + razón principal de variación.',
      'Listar TOP 5 cosas que funcionaron bien (replicar).',
      'Listar TOP 5 cosas que fallaron (corregir).',
      'Identificar 3 procesos críticos que deben sistematizarse en SOPs.',
      'Presentar al coach en sesión 1-a-1.'
    ],
    recursos: [
      { nombre: 'Plantilla Post-Mortem (Anexo C)', url: '#', desc: '10 secciones estructuradas' },
      { nombre: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', desc: 'Comparativo plan vs real' },
      { nombre: 'Notion', url: 'https://www.notion.so', desc: 'Documentación organizada' }
    ],
    errores: [
      'Saltarse el post-mortem por la urgencia del próximo deal.',
      'Post-mortem solo cualitativo sin números.',
      'No presentar al coach (perdés perspectiva externa).',
      'Identificar errores sin diseñar cómo evitarlos en próximo deal.',
      'Empezar segundo deal sin SOPs.'
    ]
  },
  {
    id: 'sops',
    aplicaA: (p, a) => a.deals_cerrados === '1' || a.deals_cerrados === '2_4',
    etapa: 'E5', subetapa: 'SOPs (Standard Operating Procedures)',
    observacion: 'Los SOPs son lo que permite delegar. Sin SOPs todo el conocimiento está en tu cabeza y el negocio no puede crecer. Cada SOP documenta cómo hacer una tarea sin que la haga el dueño.',
    tiempo: '4-6 horas por SOP (total 12-30 horas para top 3-5 SOPs)',
    actividad: 'Crear Standard Operating Procedures escritos para los procesos críticos identificados en el post-mortem.',
    entregable: '3-5 SOPs documentados en Taskade/Notion + validados con prueba real por terceros.',
    pasos: [
      'Tomar los 3-5 procesos priorizados en el post-mortem.',
      'Por cada proceso escribir el SOP con plantilla de 8 secciones (objetivo, responsable, cuándo, herramientas, pasos, criterios éxito, excepciones, checklist).',
      'Validar SOP con prueba real: que una persona DIFERENTE ejecute el proceso solo con el documento.',
      'Ajustar el SOP según fricciones encontradas en la prueba.',
      'Versionar (1.0, 1.1, etc.) y subir a Taskade en sección "SOPs del Negocio".'
    ],
    recursos: [
      { nombre: 'Notion', url: 'https://www.notion.so', desc: 'SOPs con estructura potente' },
      { nombre: 'Tango', url: 'https://www.tango.us', desc: 'Graba pasos en pantalla automáticamente' },
      { nombre: 'Loom', url: 'https://www.loom.com', desc: 'Videos tutoriales para SOPs visuales' },
      { nombre: 'Process Street', url: 'https://www.process.st', desc: 'SOPs en formato checklist' }
    ],
    errores: [
      'SOPs genéricos sin pasos específicos accionables.',
      'No validar con tercero (asume claridad que no existe).',
      'No versionar (el SOP se desactualiza sin trazabilidad).',
      'Documentar TODO al mismo tiempo (prioriza top 3-5 primero).',
      'No actualizar SOPs cuando aprendés algo nuevo.'
    ]
  },
  {
    id: 'project_manager',
    aplicaA: (p, a) => a.deals_cerrados === '2_4' || a.deals_cerrados === '5_mas' || (a.objetivo === 'escalar' && a.meta_deals !== '1'),
    etapa: 'E5', subetapa: 'Contratar Project Manager',
    observacion: 'La trampa del flipper es quedarse atrapado en E3 (ejecución) y nunca volver a E1 (evaluación). Sin PM hacés 2-3 flips al año. Con PM hacés 8-12. Es el cuello de botella más importante para escalar.',
    tiempo: '20-30 horas (proceso completo de contratación)',
    actividad: 'Contratar Project Manager que asuma ejecución diaria de obra mientras te enfocás en buscar deals y construir relaciones.',
    entregable: 'PM contratado con contrato firmado + 1 obra delegada totalmente + estudiante reduce 60%+ tiempo en obra.',
    pasos: [
      'Definir perfil del PM (job description con experiencia, hard skills, soft skills).',
      'Publicar vacante en LinkedIn Jobs + Indeed + ZipRecruiter + red de referidos.',
      'Screening + entrevista técnica con mínimo 5 candidatos.',
      'Prueba pagada de 2 semanas con el finalista usando los SOPs.',
      'Contratar formalmente con contrato escrito (KPIs, salario base, bonos por proyecto).',
      'Onboarding con los SOPs + acompañamiento primeras 4 semanas.'
    ],
    recursos: [
      { nombre: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs', desc: 'Calidad alta' },
      { nombre: 'Indeed', url: 'https://www.indeed.com', desc: 'Volumen de candidatos' },
      { nombre: 'ZipRecruiter', url: 'https://www.ziprecruiter.com', desc: 'Posting rápido' },
      { nombre: 'AngelList', url: 'https://wellfound.com', desc: 'Para startups y proyectos pequeños' }
    ],
    errores: [
      'Contratar sin prueba pagada (descubrís fit después de 3 meses).',
      'No tener SOPs antes de contratar (PM no tiene cómo operar).',
      'Micromanage al PM (anula el propósito de contratarlo).',
      'Compensación solo base sin bonos por proyecto.',
      'No definir KPIs medibles para el PM.'
    ]
  },

  // ━━━━━━━━━━ (Wholesaling removido del programa) ━━━━━━━━━━
  {
    id: '_deprecated_wholesale',
    aplicaA: () => false,  // No se aplica nunca — kept para evitar romper índices
    etapa: '',  subetapa: '',
    observacion: '', tiempo: '', actividad: '', entregable: '',
    pasos: [], recursos: [], errores: []
  },

  // ━━━━━━━━━━ LENDER PASIVO ━━━━━━━━━━
  {
    id: 'lender_due_diligence',
    aplicaA: (p, a) => a.objetivo === 'lender',
    etapa: 'E1+E5', subetapa: 'Due diligence + estructura legal del préstamo',
    observacion: 'Como lender pasivo no operás el negocio, pero TU plata está en juego. La calidad del operador y la estructura legal del préstamo determinan si recuperás capital + intereses o perdés todo.',
    tiempo: '10-15 horas (proceso completo de evaluación + estructura)',
    actividad: 'Construir framework para evaluar operadores + estructurar legalmente el préstamo con Note + Deed of Trust + 1st lien position.',
    entregable: 'Framework de evaluación de operadores + abogado + title company + 1 deal piloto cerrado con documentación legal correcta.',
    pasos: [
      'Aprender a evaluar deals (ARV, MAO, rehab estimate) — leer Anexo A caso de estudio.',
      'Identificar 3-5 operadores activos (vía REIA local, BiggerPockets, FlipMentoría).',
      'Validar track record de cada operador: cuántos deals cerrados, ROI promedio, referencias.',
      'Contratar abogado de real estate (preparar Note, Deed of Trust, Loan Agreement).',
      'Contratar title company para recording del 1st lien.',
      'Para primer préstamo: empezar con $50K-$100K (no todo el capital).',
      'Establecer cadencia: estados mensuales del operador + visita a propiedad opcional.',
      'Diversificar entre 3-5 operadores en próximos 12 meses.'
    ],
    recursos: [
      { nombre: 'BiggerPockets Lender Forum', url: 'https://www.biggerpockets.com/forums/65-private-lending', desc: 'Comunidad y casos' },
      { nombre: 'AAPL (American Association of Private Lenders)', url: 'https://aaplonline.com', desc: 'Industria y estándares' },
      { nombre: 'PrivateLenderLink', url: 'https://privatelenderlink.com', desc: 'Network + recursos' }
    ],
    errores: [
      'Prestar sin abogado y title company (sin protección legal real).',
      'Aceptar 2nd lien en lugar de 1st lien (mayor riesgo).',
      'No verificar insurance coverage de la propiedad.',
      'No diversificar (todo el capital con 1 operador).',
      'No establecer mecanismo de salida si el operador no paga (judicial foreclosure).'
    ]
  },

  // ━━━━━━━━━━ INTERNACIONAL ━━━━━━━━━━
  {
    id: 'internacional_setup',
    aplicaA: (p, a) => a.inmigracion === 'internacional' || (a.inmigracion === 'itin' && a.deals_cerrados === '0'),
    etapa: 'E0', subetapa: 'Setup específico internacional',
    observacion: 'Inversores internacionales tienen 3 capas extra de complejidad: estructura legal cross-border, tax treaties, financiamiento sin SSN. Estos NO son opcionales — son el setup base.',
    tiempo: '20-30 horas + tiempos de tramitación',
    actividad: 'Setup legal/fiscal completo para invertir desde fuera de USA: LLC USA + ITIN + CPA bilingüe + abogado tax internacional + HMLs que financian non-residents.',
    entregable: 'LLC USA + ITIN obtenido + CPA y abogado bilingües + lista de 3 HMLs que financian non-residents + entender treaties de doble tributación.',
    pasos: [
      'Solicitar ITIN al IRS (Form W-7) — toma 6-11 semanas si lo hacés desde fuera USA.',
      'Formar LLC USA (puede ser single-member, con foreign owner).',
      'Identificar CPA bilingüe especializado en investors internacionales.',
      'Verificar treaty de doble tributación entre tu país y USA.',
      'Investigar HMLs que financian non-residents (algunos lo hacen con 30-40% down).',
      'Considerar estructura holding offshore si el capital lo justifica (consultar abogado).',
      'Aprender glosario técnico en inglés (Anexo C.6).',
      'Decidir si vas a viajar a USA para closings o usar power of attorney.'
    ],
    recursos: [
      { nombre: 'IRS Form W-7 (ITIN)', url: 'https://www.irs.gov/forms-pubs/about-form-w-7', desc: 'Aplicación ITIN' },
      { nombre: 'Northwest Registered Agent', url: 'https://www.northwestregisteredagent.com', desc: 'LLC formation para foreign owners' },
      { nombre: 'America\'s Best Tax Lenders', url: 'https://www.americasbest.com', desc: 'CPAs internacional' },
      { nombre: 'Investopedia 1031 Exchange', url: 'https://www.investopedia.com/terms/s/section1031.asp', desc: 'Concepto USA fundamental' }
    ],
    errores: [
      'Asumir que las reglas de tu país aplican igual en USA.',
      'No obtener ITIN antes de necesitarlo (toma 6-11 semanas).',
      'CPA generalista que no entiende treaties internacionales.',
      'Cerrar deals sin entender tax implications (FIRPTA, withholding 15%).',
      'No considerar que la repatriación de capital tiene reglas específicas.'
    ]
  },

  // ━━━━━━━━━━ RECONSTRUIR CRÉDITO ━━━━━━━━━━
  {
    id: 'reconstruir_credito',
    aplicaA: (p, a) => a.credit === 'menos_600' || a.credit === '600_660' || a.credit === 'sin_historial',
    etapa: 'PRE-E0', subetapa: 'Reconstruir / construir crédito',
    observacion: 'Sin crédito sólido, los HMLs te rechazan o te cobran tasas 3-5 puntos arriba del mercado. El crédito se reconstruye en 6-12 meses con disciplina. Track paralelo al estudio del negocio.',
    tiempo: '2-4 horas setup + cadencia mensual durante 6-12 meses',
    actividad: 'Reconstruir credit score a 660+ FICO en paralelo al setup del negocio (E0). Aplicar herramientas específicas de credit building.',
    entregable: 'Credit score subiendo +50-100 puntos en 6 meses + acceso a HMLs estándar al mes 12.',
    pasos: [
      'Pedir reporte gratis en annualcreditreport.com (las 3 agencias).',
      'Disputar cualquier error en los reportes.',
      'Aplicar a 1 secured credit card (Discover It Secured o Capital One Platinum).',
      'Usar la tarjeta < 30% utilization + pagar 100% a tiempo cada mes.',
      'Pedirle a familiar con buen score que te agregue como authorized user.',
      'Si tenés deudas en colecciones, negociar pay-for-delete con coleccionistas.',
      'Considerar Self Credit Builder Loan ($25-50/mes builds credit history).',
      'Monitor mensual con Credit Karma o Experian Boost.'
    ],
    recursos: [
      { nombre: 'AnnualCreditReport.com', url: 'https://www.annualcreditreport.com', desc: 'Reporte gratis 3 agencias (única página legítima)' },
      { nombre: 'Discover It Secured', url: 'https://www.discover.com/credit-cards/secured', desc: 'Secured card que reporta a 3 agencias' },
      { nombre: 'Capital One Platinum Secured', url: 'https://www.capitalone.com/credit-cards/platinum-secured', desc: 'Alternativa secured card' },
      { nombre: 'Self Credit Builder Loan', url: 'https://www.self.inc', desc: 'Loan que construye historial' },
      { nombre: 'Credit Karma', url: 'https://www.creditkarma.com', desc: 'Monitor mensual gratis' },
      { nombre: 'Experian Boost', url: 'https://www.experian.com/consumer-products/score-boost.html', desc: 'Reportar pagos de utilities' }
    ],
    errores: [
      'Aplicar a 5+ tarjetas a la vez (hard inquiries dañan score).',
      'Cerrar tarjetas viejas (acorta credit history).',
      'Maxing out la tarjeta secured (>30% utilization).',
      'Pagar el balance "casi a tiempo" (1 pago tardío = -60 a -100 puntos).',
      'No disputar errores en los reportes (35% de los reportes tienen errores).'
    ]
  },

  // ━━━━━━━━━━ E3 — EJECUCIÓN DE OBRA ━━━━━━━━━━
  {
    id: 'deal_closing',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.objetivo !== 'wholesale' && a.objetivo !== 'escalar',
    etapa: 'E3', subetapa: 'Closing del primer deal',
    observacion: 'Closing es donde se concretan todos los meses de evaluación. El estudiante que llega acá sin documentación completa pierde el deal o paga 2-3x más en sorpresas. El día del closing NO se improvisa — todo se prepara con 2 semanas de anticipación.',
    tiempo: '8-12 horas (preparación) + 2-3 horas (día del closing)',
    actividad: 'Coordinar HML, title company, inspector y abogado para cerrar el deal en 14-21 días desde aceptación de oferta. Cumplir el contingency period sin perder leverage ni earnest money.',
    entregable: 'Title transferida a la LLC + HML fundeado + propiedad lista para iniciar obra.',
    pasos: [
      'Día 1-3 post aceptación: abrir escrow con title company + enviar earnest money.',
      'Día 3-7: inspección general profesional ($400-600). Hallazgos → renegociar o seguir.',
      'Día 7-10: HML completa underwriting. Subir: bank statements 2 meses, credit report, LLC docs, plan del deal.',
      'Día 10-14: HML completa appraisal. Si appraisal viene bajo, renegociar precio o salir.',
      'Día 14-18: title company hace title search. Verificar liens, easements, encumbrances.',
      'Día 18-20: revisar Closing Disclosure (HUD-1) — todos los números, fees, prorrateos.',
      'Día 21: Closing. Firmar 40-60 documentos. Wire del down payment. Recibir keys.',
      'Mismo día: cambiar locks, contratar insurance (Builder\'s Risk policy).'
    ],
    recursos: [
      { nombre: 'Kiavi Borrower Portal', url: 'https://www.kiavi.com', desc: 'Subir docs underwriting' },
      { nombre: 'First American Title', url: 'https://www.firstam.com', desc: 'Title company nacional' },
      { nombre: 'Old Republic Title', url: 'https://www.oldrepublictitle.com', desc: 'Title alternativa' },
      { nombre: 'InterNACHI', url: 'https://www.nachi.org/find-an-inspector', desc: 'Buscar inspector certificado' },
      { nombre: 'Steadily Insurance', url: 'https://www.steadily.com', desc: 'Builder\'s Risk + Vacant insurance' }
    ],
    errores: [
      'No abrir escrow inmediatamente (perder 3-5 días al inicio).',
      'Saltarse inspección general "porque la casa se ve bien".',
      'No leer Closing Disclosure → firmar con $500-2000 en fees inesperados.',
      'No tener Builder\'s Risk insurance el día del closing (riesgo total).',
      'Olvidar cambiar locks el mismo día (el seller puede tener copia).'
    ]
  },
  {
    id: 'obra_kickoff',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.objetivo !== 'wholesale' && a.objetivo !== 'escalar',
    etapa: 'E3', subetapa: 'Inicio de obra y draw schedule',
    observacion: 'La obra avanza al ritmo de la supervisión. Si el GC sabe que el estudiante visita poco, los tiempos se extienden y la calidad baja. Esta etapa NO se delega completa al GC — el estudiante es el Project Manager.',
    tiempo: '10-15 horas/semana durante 3-6 meses de obra',
    actividad: (p, a) => `Gerenciar activamente la obra como Project Manager: visitas 3x/semana, draw schedule respetado, budget tracker semanal, bitácoras documentadas, change orders firmados. Coordinar permisos e inspecciones con Building Department de ${p.mercado || 'tu ciudad'}.`,
    entregable: 'Obra completa con CO (Certificate of Occupancy) + presupuesto cumplido ±15% + cronograma cumplido ±20% + galería de fotos antes/durante/después.',
    pasos: [
      'Firmar contrato con GC + draw schedule de 6 hitos (10/15/20/20/25/10%).',
      'Aplicar permits en Building Department (Express si <$25K, Standard si más).',
      'Pagar Draw #1 (10%) al firmar — máximo 10% adelantado, nunca más.',
      'Visitar la obra Lun-Mie-Vie. Llevar checklist de fase + 10 fotos por visita.',
      'Reunión semanal con GC: agenda 15min avance + 15min budget + 15min issues + 15min próx semana.',
      'Actualizar Budget Tracker cada lunes con gastos reales por categoría.',
      'Coordinar inspecciones (rough plumbing, electrical, framing, drywall, final).',
      'Documentar TODO change order por escrito antes de aprobar costo extra.',
      'Bitácora semanal cada viernes con KPIs + fotos + decisiones + próx hitos.'
    ],
    recursos: [
      { nombre: 'Asana / ClickUp', url: 'https://asana.com', desc: 'PM software para tracking' },
      { nombre: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', desc: 'Budget Tracker semanal' },
      { nombre: 'Magicplan', url: 'https://www.magicplan.app', desc: 'Medir y documentar obra desde celular' },
      { nombre: 'Home Depot Pro', url: 'https://www.homedepot.com/c/PRO_Services', desc: 'Cuenta pro para materiales + descuentos' },
      { nombre: 'Permit portal de tu ciudad', url: '#', desc: 'Buscar "[tu ciudad] building permits" en Google' },
      { nombre: 'Loom', url: 'https://www.loom.com', desc: 'Videos rápidos para coach y GC' }
    ],
    errores: [
      'Pagar > 10% adelantado al GC (perdés leverage).',
      'No documentar change orders → GC factura $5K-$15K extras "sin haberlo acordado".',
      'Visitar la obra 1x/semana → cronograma se atrasa 2-3 semanas sin que te enteres.',
      'No cumplir cronograma de inspecciones → drywall encima del rough work = retrabajo.',
      'No mantener Builder\'s Risk insurance durante toda la obra.'
    ]
  },

  // ━━━━━━━━━━ E4 — SALIDA (Fix & Flip) ━━━━━━━━━━
  {
    id: 'salida_flip',
    aplicaA: (p, a) => (a.objetivo === 'flip' || a.objetivo === 'hibrido') && a.objetivo !== 'escalar',
    etapa: 'E4', subetapa: 'Listing + venta del primer flip',
    observacion: 'El listing es donde se materializa todo el trabajo. Listing equivocado = 60-90 días en mercado = $5K-$15K en holding extra. Listing bien hecho = venta en 14-30 días sobre asking.',
    tiempo: '20-30 horas (preparación) + 2-6 semanas de listing activo',
    actividad: (p, a) => `Preparar producto final (staging + fotografía) + listing en 4+ plataformas + open house primera semana + negociación de ofertas + closing del comprador final. Objetivo: vender en 14-30 días al precio target.`,
    entregable: 'Propiedad vendida + cheque al banco + HML cancelado + ganancia neta documentada.',
    pasos: [
      'Día 1-3: contratar stager profesional ($2K-$6K) + fotógrafo real estate ($500-$1K).',
      'Día 4-7: sesión de fotos profesionales con drone + video tour 60-90 seg.',
      'Día 8-10: entrevistar 3 agentes investor-friendly. Elegir 1 con DOM promedio <30 días.',
      'Día 10-12: definir precio con CMA + walking number (precio mínimo no negociable).',
      'Día 12-14: activar listing simultáneo en MLS + Zillow + Realtor.com + Facebook.',
      'Día 14-16: open house sábado y domingo (1-4pm). Promover en Facebook + Nextdoor.',
      'Recibir ofertas + negociar con disciplina (NUNCA bajar del walking number).',
      'Closing del comprador: title transfer + payoff HML + ganancia neta a LLC.',
      'Después del closing: archivar TODO en Taskade para post-mortem (E5).'
    ],
    recursos: [
      { nombre: 'RESA Find a Stager', url: 'https://www.realestatestagingassociation.com/Find-a-Stager', desc: 'Stagers certificados' },
      { nombre: 'HomeJab', url: 'https://www.homejab.com', desc: 'Fotografía real estate nacional' },
      { nombre: 'BiggerPockets Agent Finder', url: 'https://www.biggerpockets.com/agents', desc: 'Agentes investor-friendly' },
      { nombre: 'Zillow Listing', url: 'https://www.zillow.com/post-for-sale/', desc: 'Listing directo si tenés license' },
      { nombre: 'Facebook Marketplace', url: 'https://www.facebook.com/marketplace', desc: 'Listing local importante' },
      { nombre: 'Open Home Pro', url: 'https://www.openhomepro.com', desc: 'App para registrar visitantes' }
    ],
    errores: [
      'Listar sin staging (DOM se duplica, precio baja 3-5%).',
      'Fotos con celular en lugar de fotógrafo pro (CTR cae 60%).',
      'No definir walking number ANTES de listar → aceptás primera oferta sin saber si era buena.',
      'Agente generalista que no entiende flips → marketing pobre.',
      'No hacer open house primera semana (perdés momentum crítico).'
    ]
  },

  // ━━━━━━━━━━ E4 — SALIDA (Fix & Hold con DSCR refi) ━━━━━━━━━━
  {
    id: 'salida_hold',
    aplicaA: (p, a) => (a.objetivo === 'hold' || a.objetivo === 'hibrido') && a.objetivo !== 'escalar',
    etapa: 'E4', subetapa: 'Rentar + refinanciar con DSCR loan',
    observacion: 'En Fix & Hold, la "salida" es: rentar + refinanciar con DSCR loan para sacar el HML caro y dejar capital trabajando long-term. El DSCR loan se prepara DURANTE la obra para activarse al mes 1 de renta.',
    tiempo: '15-25 horas (proceso completo de leasing + refi)',
    actividad: (p, a) => `Listar propiedad como renta en plataformas según modelo (${a.estrategia_renta || 'tradicional'}), screening de inquilinos, lease firmado, primer mes de renta cobrado, aplicar a DSCR loan para refinanciar el HML.`,
    entregable: 'Propiedad rentada + cash flow mensual positivo + DSCR loan aprobado + HML pagado + capital recuperado para próximo deal.',
    pasos: [
      'Pre-DSCR: aplicar al DSCR lender 4-6 semanas ANTES de terminar obra (Visio, Kiavi, Lima One).',
      'Listar renta en plataformas según modelo (Zillow Rentals + Apartments.com o PadSplit si coliving).',
      'Screening profesional con TurboTenant o TransUnion SmartMove ($30-50).',
      'Firmar lease (template del estado) + cobrar primer mes + security deposit.',
      'Una vez rentada, DSCR completa underwriting: appraisal + rent verification.',
      'Closing del DSCR refi: paga el HML, deja equity en la propiedad, libera capital sobrante.',
      'Establecer cadencia mensual: cobro renta + paga mortgage + categorizar gasto en Stessa.',
      'Considerar property manager (8-10% renta) si vas a escalar a 3+ propiedades.'
    ],
    recursos: [
      { nombre: 'Visio Lending', url: 'https://www.visiolending.com', desc: 'DSCR loan especializado en investors' },
      { nombre: 'Zillow Rental Manager', url: 'https://www.zillow.com/rental-manager', desc: 'Listing renta gratis' },
      { nombre: 'Apartments.com', url: 'https://www.apartments.com', desc: 'Listing renta + screening' },
      { nombre: 'TurboTenant', url: 'https://www.turbotenant.com', desc: 'Screening + leases gratis' },
      { nombre: 'PadSplit', url: 'https://www.padsplit.com', desc: 'Plataforma coliving room-by-room' },
      { nombre: 'Buildium / AppFolio', url: 'https://www.buildium.com', desc: 'PM software cuando escales' }
    ],
    errores: [
      'Esperar a terminar obra para aplicar DSCR → 6-8 semanas extras de holding HML caro.',
      'Aceptar primer inquilino sin screening profesional (eviction cuesta $3K-$8K + 6 meses).',
      'No verificar regulación STR si vas por Airbnb (muchas ciudades USA restringen).',
      'DSCR loan a tasa mala porque no comparaste 3 lenders.',
      'No establecer cash reserves de 6 meses PITI antes de cerrar refi.'
    ]
  },

  // ━━━━━━━━━━ E5 — SISTEMA Y SEGUNDO DEAL ━━━━━━━━━━
  {
    id: 'segundo_deal',
    aplicaA: (p, a) => (a.objetivo === 'flip' || a.objetivo === 'hold' || a.objetivo === 'hibrido') && (a.meta_deals === '2_3' || a.meta_deals === '4_6' || a.meta_deals === '7_mas'),
    etapa: 'E5', subetapa: 'Segundo deal con todo el sistema activado',
    observacion: 'El segundo deal es donde se valida si tenés un negocio o un evento aleatorio. Usá TODO lo aprendido en el post-mortem. NO hagas un segundo deal sin documentar el primero — los errores se repiten.',
    tiempo: '4-7 meses (paralelo: post-mortem del primero + búsqueda del segundo)',
    actividad: 'Aplicar lecciones del post-mortem del primer deal + buscar segundo deal con criterios refinados + ejecutar con SOPs creados.',
    entregable: 'Segundo deal cerrado y completado con ROI ≥ primer deal + 2-3 SOPs validados + capital recuperado disponible para deal #3.',
    pasos: [
      'Completar post-mortem E5.1.1 del primer deal (NO empezar segundo sin esto).',
      'Identificar las 3-5 lecciones críticas a aplicar (errores que NO repetir).',
      'Refinar Buy Box con datos reales del primer deal (ZIPs que funcionaron, los que no).',
      'Crear 2-3 SOPs prioritarios (Evaluación de deal / Manejo de obra / Listing).',
      'Activar pipeline: 25 wholesalers + 5 contactos directos + lead gen propio.',
      'Aplicar criterios MAO más estrictos (margen mínimo 25% vs 20% del primer deal).',
      'Cerrar segundo deal con cronograma ajustado (-15% del primer deal).',
      'Documentar comparativo deal 1 vs deal 2: ROI, tiempo, sorpresas, equipo.'
    ],
    recursos: [
      { nombre: 'Notion / Taskade', url: 'https://www.notion.so', desc: 'Documentar SOPs validados' },
      { nombre: 'BiggerPockets Forum', url: 'https://www.biggerpockets.com/forums', desc: 'Aprender de otros flippers' },
      { nombre: 'Anexo C (Mindset)', url: '#', desc: 'Releer Top 20 errores antes de cada deal nuevo' }
    ],
    errores: [
      'Empezar segundo deal antes de cerrar post-mortem del primero.',
      'No documentar SOPs entre deal 1 y 2 (repetís errores).',
      'No subir el margen mínimo (deal 2 debería tener mejor ROI que deal 1).',
      'No diversificar wholesalers (depender de 1 wholesaler que envió el primer deal).',
      'Hacer deal 2 en mismo ZIP que deal 1 sin validar que el mercado siga igual.'
    ]
  },

  // ━━━━━━━━━━ E5 — META FINAL (5+ deals + equipo) ━━━━━━━━━━
  {
    id: 'sistema_escala',
    aplicaA: (p, a) => a.meta_deals === '4_6' || a.meta_deals === '7_mas' || a.objetivo === 'escalar',
    etapa: 'E5', subetapa: 'Sistema completo para 4+ deals/año',
    observacion: 'Llegar a 4+ deals al año NO es hacer 4 veces más esfuerzo — es construir un sistema donde múltiples deals corren simultáneos sin que vos seas el cuello de botella. Sin PM + SOPs + capital diversificado, te quemás al deal #3.',
    tiempo: '6-12 meses (paralelo a deals activos)',
    actividad: 'Construir infraestructura completa: 5 SOPs documentados + PM contratado + lead gen propio + capital diversificado (HML + Private + DSCR) + dashboard de portfolio.',
    entregable: 'Sistema operativo donde 3 deals corren simultáneos sin descarrilar + estudiante dedica <30% tiempo a obra + cashflow / capital reinvertible cada 60-90 días.',
    pasos: [
      'Crear 5 SOPs maestros: Deal Evaluation, HML Process, Obra Management, Listing & Marketing, Post-Closing.',
      'Validar cada SOP con prueba real (otra persona ejecuta el proceso solo con el doc).',
      'Contratar Project Manager con prueba pagada 2 semanas ($65K-$95K total package).',
      'Construir buyer list propia con lead gen (1 canal dominado: Direct Mail / DfD / FB Ads).',
      'Conseguir 3-5 private money lenders comprometidos ($50K-$250K cada uno).',
      'Implementar dashboard de portfolio (Airtable o Notion) con KPIs por deal.',
      'Reunión semanal de portfolio (1h): estado de 3 deals + bottlenecks + decisiones.',
      'Trimestral: revisar plan anual con coach, ajustar metas, evaluar expansión a segundo mercado.'
    ],
    recursos: [
      { nombre: 'Airtable', url: 'https://www.airtable.com', desc: 'Dashboard de portfolio multi-deal' },
      { nombre: 'Notion', url: 'https://www.notion.so', desc: 'SOPs versionados' },
      { nombre: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs', desc: 'Contratar PM' },
      { nombre: 'PropStream', url: 'https://www.propstream.com', desc: 'Lead gen propio' },
      { nombre: 'BiggerPockets PRO', url: 'https://www.biggerpockets.com/pro', desc: 'Tools para investors escalando' }
    ],
    errores: [
      'Escalar a 3 deals sin SOPs (te quemás + calidad cae).',
      'Contratar PM sin prueba pagada (descubrís fit después de 3 meses caros).',
      'Mantener todo el capital en HML (limita escala — diversificar a private + DSCR).',
      'Reunión de portfolio que se vuelve operativa en lugar de estratégica.',
      'Saltar la revisión trimestral con coach (perdés perspectiva externa).'
    ]
  },

  // ━━━━━━━━━━ REVISIÓN MENTOR (siempre) ━━━━━━━━━━
  {
    id: 'revision_mentor',
    aplicaA: (p, a) => true, // Aplica a todos
    etapa: 'Revisión', subetapa: 'Preparación para sesión con mentor',
    observacion: 'La reunión con mentor debe usarse para tomar decisiones, no para organizar información básica. El estudiante debe llegar con evidencia, números y preguntas puntuales.',
    tiempo: 'Aproximadamente 4 a 6 horas totales.',
    actividad: 'Consolidar todo el trabajo en un resumen ejecutivo para revisión con el mentor.',
    entregable: 'Resumen + carpetas/evidencias organizadas en Taskade, Drive o plataforma.',
    pasos: [
      'Consolidar Buy Box final.',
      'Adjuntar Capital Stack y gap máximo disponible.',
      'Adjuntar HML primario, backup y term sheets.',
      'Adjuntar top 10 wholesalers y top 3 contratistas.',
      'Adjuntar 3 paquetes de oferta.',
      'Escribir preguntas puntuales para el mentor.',
      'Subir evidencias a plataforma antes de la sesión.'
    ],
    recursos: [
      { nombre: 'Taskade / FlipTrack', url: 'https://www.taskade.com', desc: 'Subir tareas y evidencias' },
      { nombre: 'Google Drive', url: 'https://drive.google.com', desc: 'Carpeta del caso' },
      { nombre: 'Google Meet', url: 'https://meet.google.com', desc: 'Sesión con mentor' },
      { nombre: 'Google Calendar', url: 'https://calendar.google.com', desc: 'Agendar próximos hitos' }
    ],
    errores: [
      'Llegar a la sesión con dudas generales y sin documentos.',
      'No subir evidencia antes de pedir revisión.',
      'No priorizar una propiedad o caso concreto.',
      'Pedir validación de estrategia sin tener capital y HML claros.',
      'No convertir la reunión en próximos pasos medibles.'
    ]
  }
];

function fmGenerarBloques(p, a) {
  // Filtrar bloques que aplican al perfil
  const bloques = FM_BLOQUES.filter(b => b.aplicaA(p, a));
  // Ordenar por etapa
  const ordenEtapas = { 'PRE-E0': 0, 'E0': 1, 'E1': 2, 'E2': 3, 'E1+E2': 3.5, 'E1+E5': 4, 'E2/E1': 4, 'E1/E2': 4.5, 'E3': 5, 'E4': 6, 'E5': 7, 'Revisión': 99 };
  bloques.sort((a, b) => (ordenEtapas[a.etapa] || 50) - (ordenEtapas[b.etapa] || 50));
  return bloques;
}

function fmRenderDiagPlanLegacyHelpers() { /* placeholder */ }

function fmRenderDiagPlanLegacy() {
  const r = fmState.diagResult;
  const a = r.answers;

  // Contactos clave según perfil (referenciados al Documento A)
  const contactosPorPerfil = {
    1: ['Northwest Registered Agent (LLC)', 'Stessa o QuickBooks (contabilidad)', 'Kiavi (HML nacional)', 'Lima One Capital (HML)', '1 REIA local — buscar en nationalreia.org'],
    2: ['Discover It Secured (reconstruir crédito)', 'Easy Street Capital (HML flexible FICO 600+)', 'Anchor Loans (HML)', 'Partnership con socio con crédito'],
    3: ['Coach asignado (sesión emergencia)', 'Accountability partner del programa', 'Kiavi o Lima One (HML pre-aprobación)', '3-5 wholesalers locales activos'],
    4: ['CPA de real estate (S-Corp election si gana >$80K)', 'Visio Lending (DSCR refi)', 'Private money lenders (5-10 nuevos)', 'Project Manager (cuando llega a 3 deals simultáneos)'],
    5: ['Visio Lending (DSCR loans)', 'PadSplit (coliving si aplica)', 'Furnished Finder (corporate housing)', 'Zillow Rentals + Apartments.com'],
    6: ['PropStream (lead generation)', 'BatchSkipTracing (encontrar owners)', 'DealMachine (driving for dollars)', 'Carrot (website + SEO investor)'],
    7: ['CPA bilingüe internacional', 'Abogado de tax internacional', 'HMLs que financian non-residents', 'Anexo C.6 — glosario términos en inglés'],
    8: ['Operadores activos de FlipMentoría', 'Abogado de real estate (Note + Deed of Trust)', 'Title company para 1st lien recording', 'CPA para estructura del préstamo']
  };

  // Plataformas (referenciadas al Documento B — Stack)
  const plataformasPorPerfil = {
    1: ['Taskade (portal del programa)', 'Stessa (contabilidad real estate gratis)', 'Zillow + Redfin (research)', 'BiggerPockets (network + foros)', 'Calendly (agendar reuniones)'],
    2: ['Credit Karma (monitor de crédito)', 'Experian Boost', 'Taskade', 'Stessa', 'Bluevine o Mercury (online business bank)'],
    3: ['Calendly (forzar reuniones con wholesalers)', 'PropStream (más deal flow)', 'BatchLeads (cold outreach)', 'Loom (videos para coach)'],
    4: ['QuickBooks Online (S-Corp ready)', 'ClickUp o Notion (PM software)', 'Airtable (portfolio tracking)', 'DocuSign (contratos)'],
    5: ['AppFolio o Buildium (PM software)', 'TurboTenant (tenant screening)', 'Rent Manager', 'TransUnion SmartMove (screening)'],
    6: ['PropStream', 'BatchLeads', 'DealMachine', 'Carrot website', 'Mojo Dialer (cold calling)'],
    7: ['Anexo C.6 — glosario', 'Taskade en español + inglés', 'WhatsApp Business para coach', 'Zoom para sesiones remotas'],
    8: ['DocuSign (Notes + Deed of Trust)', 'Title company online portal', 'Excel para tracking de préstamos', 'Calendly para due diligence calls']
  };

  // Calculadoras (Anexo B)
  const calculadorasPorPerfil = {
    1: ['B.1 Deal Analyzer (1-página)', 'B.2 ARV Calculator', 'B.3 MAO Calculator', 'B.4 Rehab Estimator'],
    2: ['B.1 Deal Analyzer', 'B.5 Breakeven Calculator', 'B.10 Cash Flow Projection'],
    3: ['B.1 Deal Analyzer', 'B.3 MAO Calculator', 'B.8 Pipeline Tracker (forzar tracking)'],
    4: ['B.7 Budget Tracker', 'B.8 Pipeline Tracker', 'B.9 KPI Dashboard', 'B.10 Cash Flow Projection'],
    5: ['B.1 Deal Analyzer', 'B.2 ARV', 'Cash-on-Cash custom (no en anexo B — pedir a coach)'],
    6: ['B.3 MAO (para presentar a buyers)', 'B.1 Deal Analyzer simplificado'],
    7: ['Las 10 (B.1 a B.10) — full set, aprovechá todo'],
    8: ['B.5 Breakeven (entender el proyecto que financiás)', 'LTV calculator (custom)']
  };

  // Quick Win por perfil
  const quickWinPorPerfil = {
    1: 'E0.2.3 Opción A: Primera oferta en vivo a una propiedad de Zillow esta semana (con MAO calculado, aunque sea baja)',
    2: 'Track 1: Aplicar a 1 secured credit card HOY (Discover It Secured) + Track 2: Iniciar E0.1.1',
    3: 'Romper la parálisis: enviar 10 ofertas formales esta semana — el volumen elimina el miedo',
    4: 'Bloquear 6-10h este fin de semana para hacer el post-mortem del primer deal',
    5: 'Definir el modelo de renta (tradicional / coliving / Airbnb si aplica zoning) — esto define toda la estrategia',
    6: 'Buscar 3 wholesalers activos en Facebook Groups de tu ciudad + agregarse a sus buyer lists',
    7: 'Conseguir CPA bilingüe especializado en investors internacionales esta semana',
    8: 'Conectar con 1 operador activo (vía REIA local o referido) y pedir ver sus últimos 2 deals'
  };

  // Documentos para profundizar
  const docsPorPerfil = {
    1: ['📘 Índice Maestro', '🏛️ E0 Fundación (TODO)', '📚 Anexo A (caso de estudio)', '🧠 Anexo C (mindset + Top 20 errores)'],
    2: ['🏛️ E0 Fundación (foco 0.1)', '🧠 Anexo C (mindset crítico)', '🗺️ Estados del Estudiante (Perfil #2)'],
    3: ['🧠 Anexo C.7 (plan acción bloqueado)', '🔍 E1.4 (ofertas y negociación)', '🗺️ Estados (Perfil #3)'],
    4: ['🚀 E5 completo (escalar)', '🧠 Anexo C (FAQ E5)', '🗺️ Estados (Perfil #4)'],
    5: ['🔍 E1.1.1 (Buy Box renta)', '🏗️ E2.1 (HML + DSCR refi)', '🗺️ Estados (Perfil #5)'],
    6: ['🚀 E5.2.2 (sistema lead gen)', '🏗️ E2.3 (wholesalers)', '🗺️ Estados (Perfil #6)'],
    7: ['🧠 Anexo C.6 (glosario)', '🏛️ E0 (foco legal/fiscal)', '🗺️ Estados (Perfil #7)'],
    8: ['🏗️ E2.1.3 (private money)', '🧠 Anexo C (mindset del lender)', '🗺️ Estados (Perfil #8)']
  };

  const p = r.perfil;
  const tareasAhora = (r.gaps || []).slice(0, 5);

  return `
    <div class="h-full overflow-y-auto bg-slate-50">
      <div class="max-w-4xl mx-auto px-6 py-6">

        <!-- Header con perfil identificado -->
        <div class="bg-gradient-to-br from-${p.color}-50 to-${p.color}-100 rounded-2xl border-2 border-${p.color}-200 p-6 mb-6">
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="text-xs font-bold text-${p.color}-700 tracking-wider mb-1">PERFIL IDENTIFICADO · #${p.num}</div>
              <h2 class="text-2xl font-bold text-slate-900">${p.emoji} ${p.nombre}</h2>
            </div>
            <button onclick="fmDiagReset()" class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-slate-50">🔄 Repetir</button>
          </div>
          <div class="grid grid-cols-2 gap-3 mt-4">
            <div class="bg-white bg-opacity-60 rounded-lg p-3">
              <div class="text-xs text-slate-600 font-medium">ETAPA ACTUAL</div>
              <div class="text-lg font-bold text-slate-900">${r.etapa}</div>
            </div>
            <div class="bg-white bg-opacity-60 rounded-lg p-3">
              <div class="text-xs text-slate-600 font-medium">CRONOGRAMA</div>
              <div class="text-sm font-bold text-slate-900">${r.cronograma}</div>
            </div>
          </div>
        </div>

        <!-- Fortalezas -->
        ${r.fortalezas.length ? `
          <div class="bg-white rounded-xl border border-emerald-200 p-5 mb-4">
            <h3 class="font-bold text-emerald-900 mb-3">✅ Fortalezas que ya tenés</h3>
            <ul class="space-y-1.5 text-sm text-slate-700">
              ${r.fortalezas.map(f => `<li class="flex items-start gap-2"><span class="text-emerald-600 mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Gaps prioritarios -->
        ${tareasAhora.length ? `
          <div class="bg-white rounded-xl border border-amber-200 p-5 mb-4">
            <h3 class="font-bold text-amber-900 mb-3">⚡ Gaps prioritarios (próximas 4 semanas)</h3>
            <div class="space-y-2">
              ${tareasAhora.map((g, i) => `
                <div class="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <div class="w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">${i + 1}</div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-0.5">
                      <code class="text-xs bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">${g.codigo}</code>
                      <span class="text-xs font-bold ${g.prioridad === 'CRÍTICA' ? 'text-red-700' : 'text-amber-700'}">${g.prioridad}</span>
                    </div>
                    <div class="text-sm text-slate-800">${g.titulo}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Quick Win -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5 mb-4">
          <h3 class="font-bold text-blue-900 mb-2">🎯 Quick Win — Semana 1</h3>
          <p class="text-sm text-blue-900">${quickWinPorPerfil[p.num]}</p>
        </div>

        <!-- 4 columnas: Contactos / Plataformas / Calculadoras / Lectura -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <h3 class="font-bold text-slate-900 mb-3 text-sm">📇 Contactos a activar <span class="text-xs font-normal text-slate-500">(Documento A)</span></h3>
            <ul class="space-y-1.5 text-sm text-slate-700">
              ${(contactosPorPerfil[p.num] || []).map(c => `<li class="flex items-start gap-2"><span class="text-blue-600 mt-0.5">•</span><span>${c}</span></li>`).join('')}
            </ul>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <h3 class="font-bold text-slate-900 mb-3 text-sm">🛠️ Plataformas a setupear <span class="text-xs font-normal text-slate-500">(Documento B)</span></h3>
            <ul class="space-y-1.5 text-sm text-slate-700">
              ${(plataformasPorPerfil[p.num] || []).map(s => `<li class="flex items-start gap-2"><span class="text-indigo-600 mt-0.5">•</span><span>${s}</span></li>`).join('')}
            </ul>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <h3 class="font-bold text-slate-900 mb-3 text-sm">🧮 Calculadoras <span class="text-xs font-normal text-slate-500">(Anexo B)</span></h3>
            <ul class="space-y-1.5 text-sm text-slate-700">
              ${(calculadorasPorPerfil[p.num] || []).map(c => `<li class="flex items-start gap-2"><span class="text-cyan-600 mt-0.5">•</span><span>${c}</span></li>`).join('')}
            </ul>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <h3 class="font-bold text-slate-900 mb-3 text-sm">📚 Lectura recomendada</h3>
            <ul class="space-y-1.5 text-sm text-slate-700">
              ${(docsPorPerfil[p.num] || []).map(d => `<li class="flex items-start gap-2"><span class="text-fuchsia-600 mt-0.5">•</span><span>${d}</span></li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- Acciones finales -->
        <div class="bg-slate-900 text-white rounded-xl p-5">
          <h3 class="font-bold mb-2">📝 Resumen ejecutivo</h3>
          <p class="text-sm text-slate-200 mb-4">
            Sos perfil <strong>#${p.num} (${p.nombre})</strong>, ubicado en etapa <strong>${r.etapa}</strong>.
            Tu cronograma esperado es de <strong>${r.cronograma}</strong>.
            Empezá por el Quick Win esta semana y los ${tareasAhora.length} gaps prioritarios en el próximo mes.
          </p>
          <div class="flex gap-2 flex-wrap">
            <button onclick="fmDiagOpenLibrary()" class="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-100">📚 Abrir Biblioteca</button>
            <button onclick="fmDiagPrintPlan()" class="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700">🖨️ Imprimir Plan</button>
            <button onclick="fmDiagCopyPlan()" class="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700">📋 Copiar Plan</button>
          </div>
        </div>

      </div>
    </div>
  `;
}

// ─── NUEVA VISTA: Plan robusto tipo Miguel Guzmán ───
function fmRenderDiagPlan() {
  let r, a, p, userProfile, bloques, analisisProfundo, objetivoOperativo, reglaPlan, checklistFinal;
  try {
    r = fmState.diagResult;
    a = r.answers || {};
    p = r.perfil || { num: 1, nombre: 'Sin definir', emoji: '🏁', color: 'blue' };
    if (!Array.isArray(r.fortalezas)) r.fortalezas = [];
    if (!Array.isArray(r.gaps)) r.gaps = [];

    userProfile = {
      mercado: a.mercado_estado || 'tu mercado',
      estrategiaLabel: a.objetivo === 'flip' ? 'Fix & Flip' :
                       a.objetivo === 'hold' ? 'Fix & Hold' :
                       a.objetivo === 'hibrido' ? 'Mix Flip + Hold' :
                       a.objetivo === 'escalar' ? 'Escala de negocio' :
                       a.objetivo === 'lender' ? 'Private Money Lending' : 'Fix & Flip'
    };

    bloques = fmGenerarBloques(userProfile, a);
    analisisProfundo = fmGenerarAnalisisProfundo(p, r, a, userProfile);
    objetivoOperativo = fmGenerarObjetivoOperativo(userProfile, a);
    reglaPlan = fmGenerarReglaPlan(p, a);
    checklistFinal = fmGenerarChecklistFinal(bloques, a);

    // Filtrar bloques según modo de detalle elegido
    var bloquesVisibles = fmFiltrarBloquesPorModo(bloques, fmState.diagModo);
  } catch (err) {
    console.error('[fmRenderDiagPlan setup]', err);
    return `<div class="p-8 max-w-3xl mx-auto"><div class="bg-red-50 border border-red-200 rounded-xl p-6"><h3 class="font-bold text-red-900 mb-2">⚠️ Error generando plan</h3><pre class="text-xs text-red-700 bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">${escapeHtml(String(err?.message || err))}</pre><button onclick="fmDiagReset()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">🔄 Reiniciar diagnóstico</button></div></div>`;
  }

  return `
    <div class="h-full overflow-y-auto bg-slate-50" id="fm-plan-print">
      <!-- Header del plan -->
      <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white print:bg-white print:text-slate-900">
        <div class="max-w-5xl mx-auto px-8 py-8">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="text-xs font-bold text-amber-400 tracking-wider mb-2 print:text-amber-700">FLIPMENTORÍA · PLAN DE TRABAJO PERSONALIZADO</div>
              <h1 class="text-3xl font-bold mb-2">${p.emoji} Plan de Trabajo · ${p.nombre}</h1>
              <p class="text-sm text-slate-300 print:text-slate-600">Perfil #${p.num} · ${r.etapa} · ${r.cronograma}</p>
            </div>
            <div class="flex gap-2 print:hidden">
              ${fmState.diagStudentId ? (() => {
                const sel = (eduState.students||[]).find(s => s.id === fmState.diagStudentId);
                const name = sel ? (sel.full_name || 'estudiante') : 'estudiante';
                return `<button onclick="fmLinkPlanAStudiante('${fmState.diagStudentId}', '${sel?.mentorship_id||''}')" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-bold" title="Guardar y vincular directo a ${name.replace(/"/g,'&quot;')}">💾 Guardar plan para ${name.replace(/</g,'&lt;')}</button>`;
              })() : `<button onclick="fmAbrirVincularEstudiante()" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-sm font-bold">💾 Vincular a estudiante (CRM)</button>`}
              <button onclick="fmDiagPrintPlan()" class="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-100">🖨️ Imprimir</button>
              <button onclick="fmDiagCopyPlan()" class="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600">📋 Copiar</button>
              <button onclick="fmDiagReset()" class="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600">🔄 Repetir</button>
            </div>
          </div>
          <div class="mt-6 bg-blue-900 bg-opacity-50 print:bg-blue-50 rounded-lg p-4 border border-blue-700 print:border-blue-200">
            <div class="text-xs font-bold text-blue-300 print:text-blue-700 tracking-wider mb-1">OBJETIVO OPERATIVO</div>
            <p class="text-sm font-medium print:text-slate-900">${objetivoOperativo}</p>
          </div>
          <div class="mt-3 bg-amber-900 bg-opacity-50 print:bg-amber-50 rounded-lg p-3 border border-amber-700 print:border-amber-200">
            <span class="text-xs font-bold text-amber-300 print:text-amber-700 tracking-wider">REGLA DEL PLAN: </span>
            <span class="text-sm">${reglaPlan}</span>
          </div>
        </div>
      </div>

      <!-- Análisis profundo del cliente -->
      <div class="max-w-5xl mx-auto px-8 py-8">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>🔬</span> Análisis Profundo del Cliente
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="text-xs font-bold text-slate-500 tracking-wider mb-1">PERFIL</div>
              <div class="font-bold text-slate-900">#${p.num} ${p.nombre}</div>
            </div>
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="text-xs font-bold text-slate-500 tracking-wider mb-1">ETAPA ACTUAL</div>
              <div class="font-bold text-slate-900">${r.etapa}</div>
            </div>
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="text-xs font-bold text-slate-500 tracking-wider mb-1">CRONOGRAMA</div>
              <div class="font-bold text-slate-900 text-sm">${r.cronograma}</div>
            </div>
          </div>

          <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
            ${analisisProfundo.map(parrafo => `<p>${parrafo}</p>`).join('')}
          </div>

          <!-- Fortalezas + Riesgos lado a lado -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 class="text-sm font-bold text-emerald-900 mb-2">✅ Fortalezas identificadas</h4>
              <ul class="space-y-1 text-xs text-emerald-900">
                ${r.fortalezas.length ? r.fortalezas.map(f => `<li class="flex gap-1.5"><span>•</span><span>${f}</span></li>`).join('') : '<li class="italic text-emerald-700">Estás empezando — esa es tu primera fortaleza: claridad para construir desde cero.</li>'}
              </ul>
            </div>
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 class="text-sm font-bold text-red-900 mb-2">⚠️ Riesgos críticos a mitigar</h4>
              <ul class="space-y-1 text-xs text-red-900">
                ${fmGenerarRiesgos(a, p).map(r => `<li class="flex gap-1.5"><span>•</span><span>${r}</span></li>`).join('')}
              </ul>
            </div>
          </div>
        </div>

        <!-- Selector de modo de detalle -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 print:hidden">
          <h3 class="font-bold text-slate-900 mb-2">📐 ¿Cuánto detalle querés ver del plan?</h3>
          <p class="text-xs text-slate-600 mb-3">El plan completo tiene ${bloques.length} bloques (~${fmTotalHoras(bloques)} horas de trabajo total). Elegí el nivel de detalle según para qué lo necesitás.</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            ${[
              { id: 'panorama', label: '🗺️ Panorama', desc: 'Lista de bloques sin detalle', count: '0 bloques abiertos' },
              { id: 'foco', label: '🎯 Foco', desc: 'Solo el bloque actual', count: '1 bloque' },
              { id: 'medio', label: '📋 Trimestre', desc: 'Próximos 3-4 bloques', count: `${Math.min(4, bloques.length)} bloques` },
              { id: 'completo', label: '📚 Completo', desc: 'TODO hasta meta final', count: `${bloques.length} bloques` }
            ].map(m => {
              const active = fmState.diagModo === m.id;
              return `<button onclick="fmDiagSetModo('${m.id}')" class="text-left px-3 py-3 rounded-lg border-2 transition ${active ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}">
                <div class="text-sm font-bold ${active ? 'text-amber-900' : 'text-slate-900'} mb-0.5">${m.label}</div>
                <div class="text-xs text-slate-600">${m.desc}</div>
                <div class="text-xs ${active ? 'text-amber-700' : 'text-slate-400'} mt-1">${m.count}</div>
              </button>`;
            }).join('')}
          </div>
        </div>

        <!-- TOC de Bloques -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h2 class="text-xl font-bold text-slate-900">📋 Plan de Acción · ${bloques.length} Bloques</h2>
              <p class="text-sm text-slate-600 mt-1">Camino completo desde hoy hasta tu meta final. Cada bloque incluye qué hacer paso por paso, qué entregar, qué herramientas usar y errores comunes.</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${bloques.map((b, i) => {
              const visible = bloquesVisibles.includes(b);
              const expandido = fmState.diagExpandidos[b.id] === true;
              return `
              <a href="#bloque-${b.id}" onclick="fmDiagExpandirBloque('${b.id}'); event.preventDefault(); setTimeout(() => document.getElementById('bloque-${b.id}')?.scrollIntoView({behavior:'smooth'}), 50);" class="px-3 py-2 ${visible || expandido ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-transparent hover:bg-slate-100'} rounded-lg flex items-center gap-3 text-sm transition cursor-pointer">
                <div class="w-7 h-7 rounded-full ${visible || expandido ? 'bg-amber-500' : 'bg-slate-700'} text-white font-bold text-xs flex items-center justify-center flex-shrink-0">${i + 1}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-amber-700">${b.etapa}</div>
                  <div class="text-sm font-medium text-slate-900 truncate">${b.subetapa}</div>
                </div>
                <div class="text-xs text-slate-500 flex-shrink-0">${visible || expandido ? '▼' : '▶'}</div>
              </a>
            `;}).join('')}
          </div>
        </div>

        <!-- Bloques visibles según modo -->
        ${bloques.filter(b => bloquesVisibles.includes(b) || fmState.diagExpandidos[b.id]).map((b, i) => {
          const realIdx = bloques.indexOf(b);
          return fmRenderBloque(b, realIdx, userProfile, a);
        }).join('')}

        ${fmState.diagModo !== 'completo' && bloques.length > bloquesVisibles.length ? `
          <div class="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center mb-6 print:hidden">
            <p class="text-sm text-amber-900 mb-3">Hay <strong>${bloques.length - bloquesVisibles.length} bloques más</strong> en el plan completo hasta tu meta final.</p>
            <button onclick="fmDiagSetModo('completo')" class="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700">📚 Ver plan completo</button>
          </div>
        ` : ''}

        <!-- Checklist Final -->
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm p-6 mb-6 print:bg-white print:text-slate-900 print:border print:border-slate-300">
          <h2 class="text-xl font-bold mb-2 flex items-center gap-2"><span>✅</span> Checklist Final</h2>
          <p class="text-sm text-slate-300 print:text-slate-600 mb-4">Vas a estar listo para tu primer (o próximo) deal cuando todos estos ítems estén ✓:</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${checklistFinal.map(item => `
              <div class="flex items-start gap-2 text-sm">
                <span class="text-amber-400 print:text-amber-700 mt-0.5">☐</span>
                <span>${item}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Frase final -->
        <div class="bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl p-6 mb-6">
          <div class="text-xs font-bold text-amber-700 tracking-wider mb-2">FRASE FINAL QUE DEBÉS PODER SOSTENER</div>
          <p class="text-lg italic text-slate-900 font-medium leading-relaxed">${fmGenerarFraseFinal(userProfile, a)}</p>
        </div>

        <!-- Botones acción al final -->
        <div class="flex gap-3 print:hidden">
          <button onclick="fmDiagOpenLibrary()" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">📚 Abrir Biblioteca</button>
          <button onclick="fmDiagPrintPlan()" class="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800">🖨️ Imprimir Plan</button>
          <button onclick="fmDiagReset()" class="px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300">🔄 Nuevo diagnóstico</button>
        </div>

      </div>
    </div>

    <style>
      @media print {
        #fm-plan-print { background: white !important; }
        .print\\:hidden { display: none !important; }
        .print\\:bg-white { background: white !important; }
        .print\\:text-slate-900 { color: #0F172A !important; }
        .print\\:border { border: 1px solid #E2E8F0 !important; }
        .print\\:bg-blue-50 { background: #EFF6FF !important; }
        .print\\:bg-amber-50 { background: #FFFBEB !important; }
        .print\\:text-amber-700 { color: #B45309 !important; }
        .print\\:text-blue-700 { color: #1D4ED8 !important; }
      }
    </style>
  `;
}

function fmRenderBloque(b, idx, p, a) {
  const actividadStr = typeof b.actividad === 'function' ? b.actividad(p, a) : b.actividad;
  const pasos = typeof b.pasos === 'function' ? b.pasos(p, a) : (b.pasos || []);
  return `
    <div id="bloque-${b.id}" class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <!-- Header del bloque -->
      <div class="bg-slate-900 text-white px-6 py-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-amber-500 text-slate-900 font-bold text-lg flex items-center justify-center flex-shrink-0">${idx + 1}</div>
        <div class="flex-1">
          <div class="text-xs font-bold text-amber-300 tracking-wider">BLOQUE ${idx + 1} · ${b.etapa}</div>
          <div class="text-lg font-bold">${b.subetapa}</div>
        </div>
      </div>

      <!-- Observación del mentor -->
      <div class="px-6 pt-5">
        <div class="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
          <div class="text-xs font-bold text-blue-700 tracking-wider mb-1">OBSERVACIÓN DEL MENTOR</div>
          <p class="text-sm text-slate-800 leading-relaxed">${b.observacion}</p>
        </div>
      </div>

      <!-- Tabla del bloque -->
      <div class="p-6">
        <table class="w-full border border-slate-300 text-sm">
          <tbody>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 w-1/3 align-top font-bold text-sm">⏱️ Tiempo estimado</th>
              <td class="p-3 align-top">${b.tiempo}</td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">🎯 Actividad</th>
              <td class="p-3 align-top">${actividadStr}</td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">📦 Entregable</th>
              <td class="p-3 align-top font-medium">${b.entregable}</td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">🪜 Paso a paso</th>
              <td class="p-3 align-top">
                <ol class="space-y-1.5 list-decimal list-inside text-slate-800">
                  ${pasos.map(paso => `<li>${paso}</li>`).join('')}
                </ol>
              </td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">🧰 Recursos y herramientas</th>
              <td class="p-3 align-top">
                <ul class="space-y-1.5">
                  ${b.recursos.map(r => `
                    <li class="text-sm">
                      <a href="${r.url}" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-medium">${r.nombre}</a>
                      <span class="text-slate-600">— ${r.desc}</span>
                    </li>
                  `).join('')}
                </ul>
              </td>
            </tr>
            <tr>
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">⚠️ Errores reales que veo todo el tiempo</th>
              <td class="p-3 align-top">
                <ul class="space-y-1 text-slate-800">
                  ${b.errores.map(e => `<li class="flex gap-2"><span class="text-red-500">•</span><span>${e}</span></li>`).join('')}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function fmGenerarObjetivoOperativo(p, a) {
  if (a.objetivo === 'lender') {
    return `Soy private money lender. Presto capital con Note + Deed of Trust en 1st lien position, evalúo operadores con framework propio, diversifico entre 3-5 operadores, y obtengo 8-12% anual sobre capital prestado.`;
  }
  if (a.objetivo === 'wholesale') {
    return `Hago wholesaling en ${p.mercado}, encuentro deals off-market con lead gen propio (1 canal dominado), cierro 1-2 assignments/mes con fee promedio $10K-$20K, y construyo capital para hacer mi primer flip propio en 12 meses.`;
  }
  const estrategiaTxt = a.objetivo === 'hold' ? 'Fix & Hold' : a.objetivo === 'hibrido' ? 'Mix Flip + Hold' : 'Fix & Flip';
  const metaTxt = a.meta_deals === '1' ? '1 deal' : a.meta_deals === '2_3' ? '2-3 deals' : a.meta_deals === '4_6' ? '4-6 deals' : '7+ deals';
  return `Compro propiedades en ${p.mercado}, con estrategia ${estrategiaTxt}, ${metaTxt} en los próximos 12 meses, con capital de ${fmCapitalRange(a.capital)}, HML primario pre-aprobado y red operativa de 25+ wholesalers, 3 GCs y CPA/abogado activos.`;
}

function fmCapitalRange(c) {
  return ({ 'menos_20k': '< $20K', '20_50k': '$20K-$50K', '50_100k': '$50K-$100K', '100_250k': '$100K-$250K', 'mas_250k': '> $250K' })[c] || 'definido';
}

function fmGenerarReglaPlan(p, a) {
  if (a.objetivo === 'lender') return 'Due diligence sólida + estructura legal correcta + diversificación entre operadores.';
  if (a.objetivo === 'wholesale') return 'Lead gen propio + buyer list activa + contratos legales en paralelo.';
  if (p.num === 2) return 'Reconstruir crédito + LLC + ofertas en paralelo. Cada track tiene su propio ritmo, ninguno bloquea al otro.';
  if (p.num === 4 && (a.deals_cerrados === '5_mas')) return 'SOPs documentados + capital diversificado + equipo construido ANTES de escalar a múltiples deals simultáneos.';
  return 'Crédito en paralelo + deals en paralelo + contactos en paralelo. No esperás a tener todo perfecto; trabajás los 3 frentes a la vez.';
}

function fmGenerarAnalisisProfundo(p, r, a, userProfile) {
  const parrafos = [];

  // Párrafo 1: contexto general
  parrafos.push(`Sos un perfil <strong>#${p.num} ${p.nombre}</strong>, ubicado en etapa <strong>${r.etapa}</strong> de la metodología FlipMentoría. Tu cronograma esperado para llegar al primer hito mayor es de <strong>${r.cronograma}</strong>. Trabajás con <strong>${a.tiempo === 'mas_30' ? 'tiempo full-time' : a.tiempo === '15_30' ? 'medio tiempo (15-30h/sem)' : 'tiempo limitado (<15h/sem)'}</strong>, lo cual ${a.tiempo === 'menos_15' ? 'extiende el cronograma — vas a tener que ser brutal con prioridades' : 'te permite avanzar a buen ritmo si la disciplina se sostiene'}.`);

  // Párrafo 2: capital
  const capitalTxt = fmCapitalRange(a.capital);
  const liquidoTxt = a.capital_real === 'todo' ? '100% líquido' : a.capital_real === 'mitad' ? '~50% líquido' : a.capital_real === 'minimo' ? 'mínimo líquido' : 'mayoritariamente teórico';
  parrafos.push(`Tu capital reportado es <strong>${capitalTxt}</strong> y está <strong>${liquidoTxt}</strong>. ${a.capital_real === 'teorico' || a.capital_real === 'minimo' ? 'Esto es un riesgo crítico — el capital teórico no se usa para ofertar. Antes de hacer cualquier oferta formal, tenés que convertir ese capital en líquido real (acceso 24-48h). Sin esto, los HMLs no te van a aprobar y los wholesalers no te van a tomar en serio.' : 'Esto te da capacidad real de cerrar deals con HML cuando aparezca la oportunidad correcta.'} ${a.fuentes_capital === 'a_construir' ? 'Además, mencionaste que tenés que CONSTRUIR fuentes de capital adicional — esto va en paralelo al estudio de mercado (Bloques de E2).' : ''}`);

  // Párrafo 3: crédito
  if (a.credit === 'menos_600' || a.credit === '600_660' || a.credit === 'sin_historial') {
    parrafos.push(`Tu credit score (<strong>${({ 'menos_600': '< 600', '600_660': '600-660', 'sin_historial': 'sin historial USA' })[a.credit]}</strong>) es el segundo riesgo crítico. Los HMLs estándar (Kiavi, Lima One, RCN) requieren FICO 660+. ${a.credit === 'menos_600' || a.credit === 'sin_historial' ? 'En tu caso necesitás reconstruir crédito 6-12 meses ANTES de aplicar, o ir por opciones alternativas: HMLs flexibles con FICO 600+ (Easy Street Capital), partnership con socio que tenga crédito, o empezar como buyer secundario de wholesalers (no como operador propio).' : 'Tu score está en zona limítrofe — algunos HMLs te aceptan pero con tasas 2-3 puntos arriba. Vale la pena trabajar para subirlo a 720+ en paralelo.'} Este es un track paralelo: no bloquea avanzar con E0 ni con análisis de mercado.`);
  } else {
    parrafos.push(`Tu credit score (<strong>${({ 'mas_780': '> 780', '720_780': '720-780', '660_720': '660-720' })[a.credit]}</strong>) te da acceso a los HMLs estándar nacionales (Kiavi, Lima One, RCN, Easy Street). Esto significa que el cuello de botella NO va a ser financiamiento — va a ser encontrar el deal correcto al precio correcto.`);
  }

  // Párrafo 4: setup legal
  if (a.llc === 'no') {
    parrafos.push(`<strong>No tenés LLC formada</strong>. Esto es la tarea #1 del Bloque E0 — sin LLC no se ofertan propiedades porque arriesgás tu patrimonio personal completo (casa, ahorros, autos) en cada transacción. La LLC toma 1-4 semanas dependiendo del estado, así que se inicia hoy mismo en paralelo al estudio de mercado.`);
  } else if (a.llc === 'si_otro') {
    parrafos.push(`Tenés LLC formada pero <strong>en otro estado al de inversión</strong>. Esto genera "foreign LLC registration" — costo doble (filing fee del estado original + del estado de inversión), compliance doble. La solución más limpia: formar segunda LLC en el estado donde vas a invertir, o consultar con abogado de real estate para foreign registration formal.`);
  } else if (a.llc === 'si_mismo') {
    const setupItems = Array.isArray(a.setup_legal) ? a.setup_legal : [];
    const completo = setupItems.includes('ein') && setupItems.includes('operating') && setupItems.includes('banco') && setupItems.includes('contabilidad') && setupItems.includes('cpa');
    parrafos.push(`Tu setup legal está ${completo ? '<strong>completo</strong> (LLC + EIN + OA + banco + contabilidad + CPA). Esta es una fortaleza importante — la mayoría de los novatos se traban acá durante meses.' : `<strong>parcial</strong> — falta(n): ${['ein','operating','banco','contabilidad','cpa','abogado'].filter(x => !setupItems.includes(x)).map(x => ({ein:'EIN',operating:'Operating Agreement',banco:'Cuenta bancaria',contabilidad:'Contabilidad activa',cpa:'CPA',abogado:'Abogado'})[x]).join(', ')}. Completar lo que falta es prerequisito antes de cerrar deal.`}`);
  }

  // Párrafo 5: red operativa y momentum
  const ofertasTxt = a.ofertas_mes === '10_mas' ? '10+ ofertas/mes' : a.ofertas_mes === '1_9' ? '1-9 ofertas/mes' : a.ofertas_mes === 'analisis_no_oferta' ? 'analizando deals pero sin ofertar' : 'sin ofertar todavía';
  const wsTxt = a.wholesalers === '10_mas' ? '10+ wholesalers activos' : a.wholesalers === '3_9' ? '3-9 wholesalers' : a.wholesalers === '1_2' ? '1-2 wholesalers ocasionales' : 'ningún wholesaler activo';
  parrafos.push(`Sobre tu momentum actual: <strong>${ofertasTxt}</strong> y <strong>${wsTxt}</strong>. ${a.ofertas_mes === 'cero' || a.ofertas_mes === 'analisis_no_oferta' ? 'El cuello de botella crítico es pasar de análisis a oferta. Sin volumen de ofertas (target 10+/mes) no hay deals cerrados. Los Bloques E1 (Buy Box, ARV, MAO) y E2 (HML, wholesalers) están diseñados para resolver esto en paralelo.' : 'Estás generando volumen. Foco ahora: mejorar tasa de aceptación con mejor pain identification del vendedor y closing más rápido.'}`);

  // Párrafo 6: obstáculo principal
  const obstaculoTxt = ({
    'capital': 'capital insuficiente o no líquido',
    'conocimiento': 'falta de conocimiento técnico (ARV, MAO, contratos)',
    'red': 'red de contactos inexistente o débil',
    'tiempo': 'tiempo limitado por otras responsabilidades',
    'miedo': 'parálisis por análisis / miedo a ofertar',
    'mercado': 'dificultad encontrando deals que pasen el filtro',
    'equipo': 'necesidad de equipo para escalar'
  })[a.mayor_obstaculo];
  if (obstaculoTxt) {
    parrafos.push(`Tu mayor obstáculo percibido es <strong>${obstaculoTxt}</strong>. El plan que sigue prioriza específicamente este obstáculo en los primeros bloques. ${a.mayor_obstaculo === 'miedo' ? 'Para parálisis, la solución NO es más información — es forzar volumen de ofertas. 10 ofertas/semana durante 30 días rompe el bloqueo.' : a.mayor_obstaculo === 'red' ? 'Para red débil, el Bloque "Base mínima de contactos" + "Wholesalers y pitch" te llevan de 0 a 25 contactos activos en 30-45 días.' : a.mayor_obstaculo === 'capital' ? 'Para capital, el Bloque "Capital Stack real" + opciones alternativas (private money, partnership, HELOC, wholesaling como bridge) está diseñado para resolver esto sin esperar años.' : 'El plan tiene bloques específicos para atacar este obstáculo directamente.'}`);
  }

  return parrafos;
}

function fmGenerarRiesgos(a, p) {
  const riesgos = [];
  if (a.capital_real === 'teorico') riesgos.push('Capital declarado es teórico — no se puede ofertar con esto.');
  if (a.capital_real === 'minimo') riesgos.push('Mayoría del capital no líquido — convertir a líquido es prerequisito.');
  if (a.credit === 'menos_600') riesgos.push('Credit score <600 bloquea HMLs estándar — track de reconstrucción 6-12 meses.');
  if (a.credit === 'sin_historial') riesgos.push('Sin historial credit USA — necesita build credit desde cero o partnership.');
  if (a.llc === 'no' && a.deals_cerrados !== '0') riesgos.push('Operar sin LLC con deals activos es riesgo legal alto.');
  if (a.hml_status === 'ninguno' && a.objetivo !== 'wholesale' && a.objetivo !== 'lender') riesgos.push('Sin HML pre-aprobado, las ofertas se rechazan automáticamente (90%).');
  if (a.deals_cerrados === '0' && a.ofertas_mes === 'cero') riesgos.push('Sin ofertas formales en último mes — riesgo de parálisis por análisis.');
  if (a.wholesalers === 'cero' && a.objetivo !== 'lender') riesgos.push('Sin wholesalers activos = dependencia única en MLS (poco margen).');
  if (a.deals_cerrados === '5_mas' && a.gc_status !== 'primario_backup') riesgos.push('5+ deals sin GC primario+backup es riesgo operativo crítico.');
  if (a.tiempo === 'menos_15' && a.meta_deals !== '1') riesgos.push('Tiempo limitado + meta agresiva = cronograma irreal — ajustar meta o tiempo.');
  if (a.inmigracion === 'internacional' && a.deals_cerrados === '0') riesgos.push('Inversor internacional sin ITIN obtenido — agregar 6-11 semanas al cronograma.');
  if (riesgos.length === 0) riesgos.push('Sin riesgos críticos identificados — momentum positivo, mantener disciplina de hábitos.');
  return riesgos;
}

function fmGenerarChecklistFinal(bloques, a) {
  const items = [];

  // Items base por etapa de bloques activos
  const etapas = new Set(bloques.map(b => b.etapa));
  if (etapas.has('PRE-E0')) {
    items.push('Credit score subiendo (mínimo +50 puntos en 6 meses).');
    items.push('Secured credit card activa con pagos 100% on-time.');
  }
  if (etapas.has('E0')) {
    items.push('LLC aprobada por el Secretary of State.');
    items.push('EIN del IRS obtenido.');
    items.push('Operating Agreement firmado.');
    items.push('Cuenta bancaria de negocio + tarjeta crédito activas.');
    items.push('Software de contabilidad conectado al banco.');
    items.push('CPA + abogado de real estate identificados.');
    items.push('Big Why escrito + bloque diario 90 min en calendario.');
    items.push('Quick Win semana 1 completado + documentado.');
  }
  if (etapas.has('E1') || etapas.has('E1+E2') || etapas.has('E2/E1') || etapas.has('E1/E2')) {
    items.push('Buy Box de 1 página listo para enviar.');
    items.push('5 ZIP codes definidos y validados con investigación de mercado.');
    items.push('Lista de 20 SÍ y 20 NO (red flags) documentada.');
    items.push('50 ARVs calculados con ARV conservador por ZIP.');
    items.push('10+ propiedades analizadas con MAO en planilla.');
    items.push('Ofertas formales enviadas: 10+/mes con LOI + Proof of Funds.');
  }
  if (etapas.has('E2') || etapas.has('E2/E1') || etapas.has('E1/E2')) {
    items.push('Capital Stack documentado (líquido / probable / teórico).');
    items.push('Earnest money máximo definido.');
    items.push('Gap máximo definido.');
    items.push('Reserva mínima definida que no se toca.');
    items.push('10 HMLs entrevistados + 5 term sheets oficiales en PDF.');
    items.push('HML primario pre-aprobado + HML backup.');
    items.push('25 wholesalers en base + 10 activos enviando deals.');
    items.push('10 realtors investor-friendly + 5 distressed agents.');
    items.push('5 contactos REIA/networking activos.');
    items.push('5 posibles private lenders en pipeline.');
    items.push('10 contratistas filtrados + top 3 listos para cotizar.');
    items.push('2 title companies investor-friendly identificadas.');
    items.push('3 ofertas justificadas por MAO listas para presentar.');
  }
  if (etapas.has('E5')) {
    items.push('Post-mortem del primer deal completo + presentado al coach.');
    items.push('3-5 SOPs documentados y validados con prueba real.');
    items.push('Project Manager contratado + 1 obra delegada.');
    items.push('Red de private money en construcción (5+ contactos).');
    items.push('Sistema de lead gen propio activo (1 canal).');
    items.push('Plan anual documentado con metas trimestrales.');
  }
  if (a.objetivo === 'wholesale') {
    items.push('Buyer list de 50+ cash buyers activos.');
    items.push('1 canal de lead gen funcionando con métricas semanales.');
    items.push('5 templates de contratos legales adaptados a tu estado.');
  }
  if (a.objetivo === 'lender') {
    items.push('Framework de evaluación de operadores documentado.');
    items.push('Abogado + title company para 1st lien recording.');
    items.push('1 deal piloto con Note + Deed of Trust firmados.');
    items.push('Diversificación entre 3+ operadores planeada.');
  }
  items.push('1 caso listo para revisión profunda con mentor.');
  return items;
}

function fmGenerarFraseFinal(p, a) {
  if (a.objetivo === 'lender') {
    return `"Presto capital con Note + Deed of Trust en 1st lien position, evalúo operadores con framework propio, diversifico entre 3-5 operadores activos, y obtengo 8-12% anual sobre capital prestado en plazos de 6-12 meses."`;
  }
  if (a.objetivo === 'wholesale') {
    return `"Encuentro deals off-market en ${p.mercado} con lead gen propio dominado, mantengo buyer list de 50+ cash buyers activos, y cierro 1-2 assignments/mes con fee promedio $10K-$20K mientras construyo capital para mi primer flip propio."`;
  }
  const estrategia = a.objetivo === 'hold' ? 'Fix & Hold' : a.objetivo === 'hibrido' ? 'Mix Flip + Hold' : 'Fix & Flip';
  return `"Compro propiedades tipo [SFH/Duplex], en ZIP codes [tus 5 ZIPs], para estrategia ${estrategia}, con ARV entre [$X-$Y], rehab máximo de [$X], cierre estimado en [14-21 días], usando [HML primario] + [$X de capital líquido + gap disponible]."`;
}

function fmDiagOpenLibrary() {
  fmState.activeTab = 'biblioteca';
  fmState.activeEtapa = 'INDICE';
  const estadosDoc = fmState.docs.find(d => d.categoria === 'perfiles');
  if (estadosDoc) {
    fmState.activeDocId = estadosDoc.id;
  }
  fmRender();
}

function fmDiagSetModo(modo) {
  fmState.diagModo = modo;
  fmState.diagExpandidos = {}; // reset expansions individuales
  fmRender();
  setTimeout(() => document.querySelector('#fm-plan-print')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function fmDiagExpandirBloque(id) {
  fmState.diagExpandidos[id] = !fmState.diagExpandidos[id];
  fmRender();
}

function fmFiltrarBloquesPorModo(bloques, modo) {
  if (modo === 'completo') return bloques;
  if (modo === 'panorama') return [];
  if (modo === 'foco') return bloques.slice(0, 1);
  if (modo === 'medio') return bloques.slice(0, 4);
  return bloques.slice(0, 4);
}

function fmTotalHoras(bloques) {
  // Estimación grosera: extraer número aproximado del campo `tiempo` y sumar
  let total = 0;
  bloques.forEach(b => {
    const t = String(b.tiempo || '');
    const m = t.match(/(\d+)\s*[-a–]\s*(\d+)/);
    if (m) total += (parseInt(m[1]) + parseInt(m[2])) / 2;
    else {
      const single = t.match(/(\d+)/);
      if (single) total += parseInt(single[1]);
    }
  });
  return Math.round(total);
}

function fmDiagPrintPlan() {
  window.print();
}

function fmDiagCopyPlan() {
  const r = fmState.diagResult;
  if (!r) return;
  const text = `PLAN PERSONALIZADO — FlipMentoría
Perfil: #${r.perfil.num} ${r.perfil.nombre}
Etapa actual: ${r.etapa}
Cronograma: ${r.cronograma}

FORTALEZAS:
${r.fortalezas.map(f => '- ' + f).join('\n')}

GAPS PRIORITARIOS:
${r.gaps.map((g, i) => `${i+1}. [${g.codigo}] ${g.titulo} (${g.prioridad})`).join('\n')}
`;
  navigator.clipboard.writeText(text);
  alert('Plan copiado al clipboard');
}

function fmRenderChatMessage(m, i, mode) {
  if (m.role === 'user') {
    return `<div class="flex justify-end"><div class="bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-2xl">${escapeHtml(m.content)}</div></div>`;
  }
  const color = mode === 'diagnose' ? 'amber' : 'blue';
  const html = typeof marked !== 'undefined' ? marked.parse(m.content) : escapeHtml(m.content);
  const safe = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : html;
  return `
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-${color}-100 flex items-center justify-center flex-shrink-0 text-lg">🤖</div>
      <div class="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-3xl flex-1">
        <div class="prose prose-sm prose-slate max-w-none [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:rounded [&_pre]:p-3 [&_code]:bg-slate-200 [&_code]:px-1 [&_code]:rounded [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_strong]:text-slate-900 [&_blockquote]:border-l-4 [&_blockquote]:border-${color}-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-700">${safe}</div>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
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

// ─── DIAGNÓSTICO ───
async function fmDiagnoseStart() {
  fmState.diagnoseChat = [{ role: 'user', content: 'Hola, quiero hacer un diagnóstico para identificar mi etapa en la metodología y obtener mi plan personalizado.' }];
  fmState.diagnoseLoading = true;
  fmRender();
  await fmDiagnoseSubmit();
}

async function fmDiagnoseSend() {
  const input = document.getElementById('fm-diagnose-input');
  const query = input ? input.value.trim() : '';
  if (!query || fmState.diagnoseLoading) return;
  fmState.diagnoseChat.push({ role: 'user', content: query });
  fmState.diagnoseLoading = true;
  if (input) input.value = '';
  fmRender();
  await fmDiagnoseSubmit();
}

async function fmDiagnoseSubmit() {
  try {
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/fm-ai-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ mode: 'diagnose', messages: fmState.diagnoseChat.map(m => ({ role: m.role, content: m.content })) })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'falló');
    fmState.diagnoseChat.push({ role: 'assistant', content: r.response });
  } catch (e) {
    fmState.diagnoseChat.push({ role: 'assistant', content: `❌ Error: ${e.message}\n\n¿Está deployada la edge function \`fm-ai-coach\`?` });
  }
  fmState.diagnoseLoading = false;
  fmRender();
  setTimeout(() => {
    const containers = document.querySelectorAll('.scrollbar-thin');
    containers.forEach(c => c.scrollTop = c.scrollHeight);
  }, 50);
}

function fmDiagnoseReset() {
  if (!confirm('¿Reiniciar el diagnóstico? Se perderá la conversación actual.')) return;
  fmState.diagnoseChat = [];
  fmRender();
}

function fmRenderDoc(doc) {
  return `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 p-6">
      <div class="flex items-start gap-4">
        <div class="flex-1">
          <div class="text-xs font-bold text-blue-600 tracking-wider mb-1">${doc.etapa} · ${doc.categoria.toUpperCase()}</div>
          <h1 class="text-2xl font-bold text-slate-900 mb-2">${doc.titulo}</h1>
          ${doc.subtitulo ? `<p class="text-slate-600 italic">${doc.subtitulo}</p>` : ''}
          ${(doc.tags || []).length ? `
            <div class="mt-3 flex flex-wrap gap-1">
              ${doc.tags.map(t => `<span class="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">${t}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <button onclick="fmCopyDoc('${doc.id}')" class="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700">📋 Copiar md</button>
      </div>
    </div>
    <article id="fm-doc-content" class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 prose prose-slate max-w-none">
      <div class="text-slate-400">Cargando contenido...</div>
    </article>
  `;
}

async function fmRenderMarkdown(doc) {
  const container = document.getElementById('fm-doc-content');
  if (!container) return;
  // Cargar contenido_md de la DB
  const { data, error } = await sb.from('fm_documents').select('contenido_md').eq('id', doc.id).single();
  if (error) {
    container.innerHTML = `<p class="text-red-600">Error: ${error.message}</p>`;
    return;
  }
  if (typeof marked === 'undefined') {
    container.innerHTML = '<pre class="text-xs whitespace-pre-wrap">' + (data.contenido_md || '').replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;') + '</pre>';
    return;
  }
  marked.setOptions({ gfm: true, breaks: false });
  const html = marked.parse(data.contenido_md || '');
  const clean = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html, { ADD_ATTR: ['target','rel'] }) : html;
  container.innerHTML = `<style>
    #fm-doc-content h1{font-size:1.875rem;font-weight:700;margin:1.5rem 0 1rem;color:#0F172A;border-bottom:2px solid #E2E8F0;padding-bottom:0.5rem}
    #fm-doc-content h2{font-size:1.5rem;font-weight:700;margin:1.5rem 0 0.75rem;color:#1E293B}
    #fm-doc-content h3{font-size:1.25rem;font-weight:600;margin:1.25rem 0 0.5rem;color:#334155}
    #fm-doc-content h4{font-size:1rem;font-weight:600;margin:1rem 0 0.5rem;color:#475569}
    #fm-doc-content p{margin:0.75rem 0;line-height:1.65;color:#334155}
    #fm-doc-content ul,#fm-doc-content ol{margin:0.75rem 0 0.75rem 1.5rem}
    #fm-doc-content li{margin:0.35rem 0;line-height:1.55;color:#334155}
    #fm-doc-content code{background:#F1F5F9;padding:0.15rem 0.4rem;border-radius:0.25rem;font-size:0.875rem;color:#0F172A;font-family:ui-monospace,monospace}
    #fm-doc-content pre{background:#0F172A;color:#F1F5F9;padding:1rem;border-radius:0.5rem;overflow-x:auto;margin:1rem 0;font-size:0.875rem}
    #fm-doc-content pre code{background:transparent;padding:0;color:#F1F5F9}
    #fm-doc-content blockquote{border-left:4px solid #2563EB;padding:0.5rem 1rem;background:#EFF6FF;color:#1E40AF;font-style:italic;margin:1rem 0}
    #fm-doc-content table{border-collapse:collapse;margin:1rem 0;font-size:0.875rem;width:100%}
    #fm-doc-content th{background:#F1F5F9;border:1px solid #CBD5E1;padding:0.5rem 0.75rem;text-align:left;font-weight:600;color:#0F172A}
    #fm-doc-content td{border:1px solid #E2E8F0;padding:0.5rem 0.75rem;color:#334155}
    #fm-doc-content a{color:#2563EB;text-decoration:underline}
    #fm-doc-content strong{color:#0F172A;font-weight:600}
    #fm-doc-content hr{border:none;border-top:1px solid #E2E8F0;margin:1.5rem 0}
  </style>${clean}`;
  // Open external links in new tab
  container.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
}

async function fmCopyDoc(docId) {
  const { data } = await sb.from('fm_documents').select('titulo,contenido_md').eq('id', docId).single();
  if (!data) return;
  await navigator.clipboard.writeText(`# ${data.titulo}\n\n${data.contenido_md}`);
  alert('Copiado al clipboard');
}

let fmSearchTimer = null;
function fmSearch(query) {
  fmState.searchQuery = query;
  clearTimeout(fmSearchTimer);
  fmSearchTimer = setTimeout(async () => {
    if (!query.trim()) {
      // Reset a vista normal
      const { data } = await sb.from('fm_documents').select('id,etapa,categoria,codigo,titulo,subtitulo,posicion,tags').order('posicion');
      fmState.docs = data || [];
      fmRender();
      return;
    }
    const q = query.trim();
    const { data, error } = await sb.from('fm_documents')
      .select('id,etapa,categoria,codigo,titulo,subtitulo,posicion,tags')
      .or(`titulo.ilike.%${q}%,subtitulo.ilike.%${q}%,contenido_md.ilike.%${q}%`)
      .order('posicion');
    if (!error) {
      fmState.docs = data || [];
      if (data && data.length && !data.find(d => d.id === fmState.activeDocId)) {
        fmState.activeDocId = data[0].id;
        fmState.activeEtapa = data[0].etapa;
      }
      fmRender();
    }
  }, 400);
}

// ============================================================
// 🎯 PLAN DE ACCIÓN POR ESTUDIANTE
// Vincula Mentorías Manager con Metodología FlipMentoría
// ============================================================

// Inferir respuestas del wizard desde campos del estudiante
function eduInferirDiagnostico(student) {
  const grupo = (student.grupo || '').toLowerCase();
  const stage = (student.current_stage || '').toLowerCase();
  const capital = student.capital_actual;
  const ans = {};

  // OBJETIVO
  if (grupo.includes('flipping') || grupo.includes('flip')) ans.objetivo = 'flip';
  else if (grupo.includes('rental') || grupo.includes('hold') || grupo.includes('coliving') || grupo.includes('inversor')) ans.objetivo = 'hold';
  else if (grupo.includes('wholesale')) ans.objetivo = 'wholesale';
  else if (grupo.includes('empresa') || grupo.includes('gestor de prop')) ans.objetivo = 'hibrido';
  else if (grupo.includes('inversor')) ans.objetivo = 'lender';
  else ans.objetivo = 'flip';

  // MERCADO
  ans.mercado_estado = student.state || student.city || 'USA';

  // META DEALS
  if (stage.includes('gestion') || stage.includes('gestionando')) ans.meta_deals = '4_6';
  else if (stage.includes('empresa') || stage.includes('escalar')) ans.meta_deals = '7_mas';
  else ans.meta_deals = '2_3';

  // CAPITAL
  if (capital == null) ans.capital = '20_50k';
  else if (capital < 20000) ans.capital = 'menos_20k';
  else if (capital < 50000) ans.capital = '20_50k';
  else if (capital < 100000) ans.capital = '50_100k';
  else if (capital < 250000) ans.capital = '100_250k';
  else ans.capital = 'mas_250k';

  // CAPITAL REAL (asumir todo líquido por default)
  ans.capital_real = 'todo';

  // CREDIT — default desconocido
  ans.credit = '660_720';

  // FUENTES CAPITAL
  ans.fuentes_capital = 'solo_propio';

  // HML STATUS — heurística por etapa
  if (stage.includes('credito') || stage.includes('crédito')) ans.hml_status = 'hablado';
  else if (stage.includes('negocia') || stage.includes('gestion')) ans.hml_status = 'primario_backup';
  else ans.hml_status = 'investigando';

  // LLC — heurística por etapa empresa
  if (stage.includes('empresa') || stage.includes('gestion')) ans.llc = 'si_mismo';
  else ans.llc = 'no';

  // SETUP LEGAL
  ans.setup_legal = ans.llc === 'si_mismo' ? ['ein','banco','contabilidad'] : [];

  // DEALS CERRADOS — heurística por etapa
  if (stage.includes('gestionando') || stage.includes('gestion de prop')) ans.deals_cerrados = '1';
  else if (stage.includes('escalar') || stage.includes('empresa')) ans.deals_cerrados = '2_4';
  else ans.deals_cerrados = '0';

  // EXPERIENCIA PREVIA
  ans.experiencia_previa = 'cero';

  // INMIGRACIÓN — default residente USA
  ans.inmigracion = 'residente';

  // BUY BOX
  if (stage.includes('analisis') || stage.includes('análisis')) ans.buybox = 'parcial';
  else if (stage.includes('gestion') || stage.includes('negocia')) ans.buybox = 'completo';
  else ans.buybox = 'cero';

  // ARV SKILL
  if (stage.includes('analisis') || stage.includes('análisis') || stage.includes('negocia')) ans.arv_skill = 'basico';
  else if (stage.includes('gestion')) ans.arv_skill = 'experto';
  else ans.arv_skill = 'no';

  // OFERTAS MES
  if (stage.includes('negocia')) ans.ofertas_mes = '10_mas';
  else if (stage.includes('analisis') || stage.includes('análisis')) ans.ofertas_mes = '1_9';
  else ans.ofertas_mes = 'cero';

  // WHOLESALERS
  ans.wholesalers = stage.includes('analisis') ? '3_9' : 'cero';

  // GC STATUS
  ans.gc_status = stage.includes('gestion') ? 'primario' : 'cero';

  // DEAL ACTIVO
  if (stage.includes('gestionando') || stage.includes('gestion de prop')) ans.deal_activo = 'obra';
  else if (stage.includes('negocia')) ans.deal_activo = 'busqueda';
  else ans.deal_activo = 'no';

  // TIEMPO — default medio tiempo
  ans.tiempo = '15_30';

  // MAYOR OBSTÁCULO
  if (stage.includes('credito') || stage.includes('crédito')) ans.mayor_obstaculo = 'capital';
  else if (stage.includes('analisis') || stage.includes('análisis')) ans.mayor_obstaculo = 'mercado';
  else if (stage.includes('mentalidad')) ans.mayor_obstaculo = 'miedo';
  else ans.mayor_obstaculo = 'conocimiento';

  return ans;
}

// LEGACY: Crear plan auto-inferido (sin wizard). Reemplazado por eduCrearPlanEstudiante (wizard).
async function eduCrearPlanEstudianteAuto(studentId) {
  const student = eduState.students.find(s => s.id === studentId);
  if (!student) return alert('Estudiante no encontrado');

  if (!confirm(`Generar plan de acción para ${student.full_name}?\n\nVoy a inferir el perfil desde los datos del estudiante y crear un plan con tareas marcables.`)) return;

  // 1) Inferir respuestas del wizard
  const answers = eduInferirDiagnostico(student);

  // 2) Calcular perfil + bloques (reusa funciones del sistema metodología)
  if (typeof fmCalcularPerfil !== 'function' || typeof fmGenerarBloques !== 'function') {
    return alert('Error: sistema Metodología no cargado. Recargá la página.');
  }
  const perfilResult = fmCalcularPerfil(answers);
  const userProfile = {
    mercado: answers.mercado_estado,
    estrategiaLabel: answers.objetivo === 'flip' ? 'Fix & Flip' :
                     answers.objetivo === 'hold' ? 'Fix & Hold' :
                     answers.objetivo === 'wholesale' ? 'Wholesaling' :
                     answers.objetivo === 'hibrido' ? 'Mix Flip + Hold' : 'Fix & Flip'
  };
  const bloques = fmGenerarBloques(userProfile, answers);

  // 3) Archivar plan anterior si existe
  await sb.from('edu_student_plans')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('status', 'active');

  // 4) Crear nuevo plan
  const { data: plan, error: planErr } = await sb.from('edu_student_plans').insert({
    student_id: studentId,
    mentorship_id: student.mentorship_id,
    diagnostico: answers,
    perfil: { ...perfilResult, userProfile },
    bloques_ids: bloques.map(b => b.id),
    modo: 'completo',
    status: 'active'
  }).select().single();

  if (planErr) return alert('Error creando plan: ' + planErr.message);

  // 5) Insertar tasks (un row por paso de cada bloque)
  const tasks = [];
  bloques.forEach((b, bIdx) => {
    const pasos = typeof b.pasos === 'function' ? b.pasos(userProfile, answers) : (b.pasos || []);
    pasos.forEach((paso, pIdx) => {
      tasks.push({
        plan_id: plan.id,
        student_id: studentId,
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

  if (tasks.length) {
    const { error: tErr } = await sb.from('edu_student_plan_tasks').insert(tasks);
    if (tErr) console.error('[tasks insert]', tErr);
  }

  alert(`✅ Plan creado para ${student.full_name}\n\n${bloques.length} bloques · ${tasks.length} tareas accionables`);
  await eduLoadStudentPlan(studentId);
  eduRender();
}

// Cargar plan + tasks de un estudiante
async function eduLoadStudentPlan(studentId) {
  const { data: plan } = await sb.from('edu_student_plans')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) {
    eduState.studentPlan = null;
    eduState.studentPlanTasks = [];
    return;
  }
  const { data: tasks } = await sb.from('edu_student_plan_tasks')
    .select('*')
    .eq('plan_id', plan.id)
    .order('bloque_orden')
    .order('paso_index');
  eduState.studentPlan = plan;
  eduState.studentPlanTasks = tasks || [];
}

// Toggle check de una tarea
async function eduToggleTaskCompleted(taskId) {
  const t = (eduState.studentPlanTasks || []).find(x => x.id === taskId);
  if (!t) return;
  const newVal = !t.completed;
  t.completed = newVal;  // optimistic update
  t.completed_at = newVal ? new Date().toISOString() : null;
  eduRender();
  await sb.from('edu_student_plan_tasks').update({
    completed: newVal,
    completed_at: newVal ? new Date().toISOString() : null,
    completed_by: state.user?.id || null
  }).eq('id', taskId);
}

// Eliminar plan (archivar)
async function eduArchivarPlanEstudiante(studentId) {
  if (!confirm('¿Archivar plan actual? Vas a poder generar uno nuevo después.')) return;
  await sb.from('edu_student_plans')
    .update({ status: 'archived' })
    .eq('student_id', studentId)
    .eq('status', 'active');
  eduState.studentPlan = null;
  eduState.studentPlanTasks = [];
  eduRender();
}

// Render del tab "Plan Acción" en el detalle del estudiante
function eduRenderStudentPlan() {
  const student = eduState.students.find(s => s.id === eduState.selectedStudentId);
  if (!student) return `<div class="p-4 text-slate-500">Seleccioná un estudiante.</div>`;

  const plan = eduState.studentPlan;
  const tasks = eduState.studentPlanTasks || [];

  if (!plan) {
    return `
      <div class="p-6">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <div class="text-4xl mb-2">🎯</div>
          <h3 class="font-bold text-slate-900 mb-1">Sin plan de acción activo</h3>
          <p class="text-sm text-slate-600 mb-4">Generá un plan personalizado para <strong>${student.full_name}</strong>.<br>El sistema va a inferir el perfil desde su etapa actual, capital, grupo, etc.</p>
          <button onclick="eduCrearPlanEstudiante('${student.id}')" class="px-5 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700">🎯 Generar plan de acción</button>
        </div>
      </div>
    `;
  }

  // Agrupar tasks por bloque
  const blocks = {};
  tasks.forEach(t => {
    if (!blocks[t.bloque_id]) blocks[t.bloque_id] = { id: t.bloque_id, etapa: t.bloque_etapa, subetapa: t.bloque_subetapa, orden: t.bloque_orden, tasks: [] };
    blocks[t.bloque_id].tasks.push(t);
  });
  const blocksList = Object.values(blocks).sort((a,b) => a.orden - b.orden);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPct = totalTasks > 0 ? Math.round(100 * completedTasks / totalTasks) : 0;
  const perfil = plan.perfil?.perfil || {};
  const cronograma = plan.perfil?.cronograma || '—';

  return `
    <div class="p-4 space-y-4">
      <!-- Header del plan -->
      <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xs font-bold text-amber-300 tracking-wider mb-1">PLAN DE ACCIÓN · ${student.full_name}</div>
            <div class="text-lg font-bold">${perfil.emoji || '🎯'} ${perfil.nombre || 'Plan personalizado'}</div>
            <div class="text-xs text-slate-300 mt-1">${cronograma}</div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-amber-400">${progressPct}%</div>
            <div class="text-xs text-slate-400">${completedTasks}/${totalTasks} tareas</div>
          </div>
        </div>
        <div class="mt-3 bg-slate-700 rounded-full h-2 overflow-hidden">
          <div class="h-full bg-amber-500 transition-all" style="width: ${progressPct}%"></div>
        </div>
        <div class="mt-3 flex gap-2 text-xs flex-wrap">
          <button onclick="eduAbrirAnalisisProfundoFM('${student.id}')" class="px-3 py-1.5 bg-violet-500 hover:bg-violet-400 rounded text-white font-bold" title="Abre el análisis profundo completo en Metodología FlipMentoría (objetivo operativo, regla del plan, análisis profundo del cliente, fortalezas/gaps, bloques con tiempo/entregable/errores/recursos)">🎯 Ver análisis profundo (FlipMentoría)</button>
          <button onclick="eduDescargarPlan('pdf')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 rounded text-slate-900 font-bold">📄 Descargar PDF</button>
          <button onclick="eduDescargarPlan('md')" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white">📝 Markdown</button>
          ${student.phone ? `<a href="https://wa.me/${student.phone.replace(/\D/g,'')}?text=${encodeURIComponent('Hola ' + student.full_name + '! Te comparto tu plan de acción personalizado de FlipMentoría. Vamos paso a paso 💪')}" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-white">💬 WhatsApp</a>` : ''}
          ${student.email ? `<a href="mailto:${student.email}?subject=${encodeURIComponent('Tu plan de acción FlipMentoría')}&body=${encodeURIComponent('Hola ' + student.full_name + ',\n\nTe comparto el plan de acción personalizado. Avísame cuando podamos revisarlo juntos.\n\nCoach FlipMentoría')}" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white">✉️ Email</a>` : ''}
          <button onclick="eduArchivarPlanEstudiante('${student.id}')" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white">🗄 Archivar</button>
          <button onclick="eduCrearPlanEstudiante('${student.id}')" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white">🔄 Regenerar</button>
        </div>
        <div class="mt-2 text-[10px] text-amber-200 italic">💡 Si querés el análisis profundo del cliente con bloques completos, click "🎯 Ver análisis profundo".</div>
      </div>

      <!-- Bloques con checklist -->
      ${blocksList.map((b, idx) => {
        const blockCompleted = b.tasks.filter(t => t.completed).length;
        const blockProgress = b.tasks.length > 0 ? Math.round(100 * blockCompleted / b.tasks.length) : 0;
        const allDone = blockCompleted === b.tasks.length;
        return `
          <div class="bg-white rounded-xl border ${allDone ? 'border-emerald-300' : 'border-slate-200'} overflow-hidden">
            <div class="${allDone ? 'bg-emerald-50' : 'bg-slate-50'} px-4 py-3 flex items-center justify-between border-b ${allDone ? 'border-emerald-200' : 'border-slate-200'}">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full ${allDone ? 'bg-emerald-500' : 'bg-slate-900'} text-white font-bold text-xs flex items-center justify-center">${allDone ? '✓' : (idx+1)}</div>
                <div>
                  <div class="text-[10px] font-bold text-amber-700 tracking-wider">${b.etapa}</div>
                  <div class="text-sm font-bold text-slate-900">${b.subetapa}</div>
                </div>
              </div>
              <div class="text-xs text-slate-600 font-medium">${blockCompleted}/${b.tasks.length} · ${blockProgress}%</div>
            </div>
            <ul class="divide-y divide-slate-100">
              ${b.tasks.map(t => `
                <li class="px-4 py-2.5 hover:bg-slate-50 flex items-start gap-3 cursor-pointer" onclick="eduToggleTaskCompleted('${t.id}')">
                  <input type="checkbox" ${t.completed ? 'checked' : ''} class="mt-1 w-4 h-4 rounded cursor-pointer" onclick="event.stopPropagation(); eduToggleTaskCompleted('${t.id}')" />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-800'}">${t.paso_text}</div>
                    ${t.completed && t.completed_at ? `<div class="text-[10px] text-emerald-600 mt-0.5">✓ ${new Date(t.completed_at).toLocaleDateString('es')}</div>` : ''}
                  </div>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }).join('')}

      ${blocksList.length === 0 ? `<div class="text-center py-8 text-slate-500 text-sm">Plan vacío. Click "Regenerar" para crear bloques.</div>` : ''}
    </div>
  `;
}

// ============================================================
// 📊 DASHBOARD EJECUTIVO + SISTEMA DE ALERTAS INTELIGENTES
// Análisis avanzado para detectar cuellos de botella y estancamientos
// Optimización: cerrar deals lo antes posible siguiendo metodología
// ============================================================

// Calcular alertas avanzadas por estudiante
// Cada alerta tiene: severity (critical/high/medium/low), tipo, mensaje, accion_sugerida
function eduCalcularAlertasEstudiante(s) {
  const alertas = [];
  const now = new Date();
  const ms_per_day = 86400000;

  // 1) Mentoría por vencer ≤ 30 días
  if (s.expires_at) {
    const exp = new Date(s.expires_at);
    const daysToExp = Math.floor((exp - now) / ms_per_day);
    if (daysToExp < 0) {
      alertas.push({
        severity: 'critical', tipo: 'mentoria_vencida',
        mensaje: `Mentoría VENCIDA hace ${Math.abs(daysToExp)} días`,
        accion: 'Contactar para renovación urgente. NO asignar nuevo plan hasta renovar.'
      });
    } else if (daysToExp <= 14) {
      alertas.push({
        severity: 'critical', tipo: 'mentoria_por_vencer',
        mensaje: `Mentoría vence en ${daysToExp} días`,
        accion: 'Pasar a comercial AHORA. Preparar pitch de renovación.'
      });
    } else if (daysToExp <= 30) {
      alertas.push({
        severity: 'high', tipo: 'mentoria_por_vencer',
        mensaje: `Mentoría vence en ${daysToExp} días`,
        accion: 'Agendar llamada de renovación esta semana.'
      });
    }
  }

  // 2) Pago atrasado / vencido
  if (s.payment_status === 'expired' || s.payment_status === 'cancelled') {
    alertas.push({
      severity: 'critical', tipo: 'pago_vencido',
      mensaje: `Pago ${s.payment_status === 'expired' ? 'VENCIDO' : 'CANCELADO'}`,
      accion: 'Suspender acceso hasta regularizar. NO asignar nuevo plan de acción.'
    });
  } else if (s.payment_status === 'past_due') {
    alertas.push({
      severity: 'high', tipo: 'pago_atrasado',
      mensaje: 'Pago atrasado',
      accion: 'Contactar para gestionar pago antes de avanzar con el plan.'
    });
  }

  // 3) Estancado en etapa (sin avance > 60 días)
  if (s.stage_started_at) {
    const stageStart = new Date(s.stage_started_at);
    const daysInStage = Math.floor((now - stageStart) / ms_per_day);
    if (daysInStage > 90) {
      alertas.push({
        severity: 'critical', tipo: 'estancado_etapa',
        mensaje: `${daysInStage} días en etapa "${s.current_stage}"`,
        accion: 'Sesión 1-on-1 urgente. Revisar si necesita cambiar de estrategia.'
      });
    } else if (daysInStage > 60) {
      alertas.push({
        severity: 'high', tipo: 'estancado_etapa',
        mensaje: `${daysInStage} días en etapa "${s.current_stage}" (excede 60)`,
        accion: 'Asignar plan de acción específico para destrabar.'
      });
    }
  }

  // 4) Sin actividad reciente (último seguimiento > 30 días)
  if (s.ultima_fecha_seguimiento) {
    const lastFollow = new Date(s.ultima_fecha_seguimiento);
    const daysSince = Math.floor((now - lastFollow) / ms_per_day);
    if (daysSince > 45) {
      alertas.push({
        severity: 'high', tipo: 'sin_seguimiento',
        mensaje: `Sin contacto hace ${daysSince} días`,
        accion: 'Llamada urgente. Riesgo de abandono.'
      });
    } else if (daysSince > 30) {
      alertas.push({
        severity: 'medium', tipo: 'sin_seguimiento',
        mensaje: `Sin contacto hace ${daysSince} días`,
        accion: 'Programar seguimiento esta semana.'
      });
    }
  } else if (s.enrolled_at) {
    // Sin seguimiento desde inicio (>30 días enrolled)
    const enrolledDays = Math.floor((now - new Date(s.enrolled_at)) / ms_per_day);
    if (enrolledDays > 30) {
      alertas.push({
        severity: 'high', tipo: 'sin_seguimiento_inicial',
        mensaje: 'Nunca recibió seguimiento desde el ingreso',
        accion: 'Llamada de onboarding obligatoria HOY.'
      });
    }
  }

  // 5) Status at_risk o dropped
  if (s.status === 'at_risk') {
    alertas.push({
      severity: 'high', tipo: 'status_at_risk',
      mensaje: 'Marcado at_risk',
      accion: 'Plan de retención urgente. Sesión emocional + técnica.'
    });
  } else if (s.status === 'dropped') {
    alertas.push({
      severity: 'medium', tipo: 'status_dropped',
      mensaje: 'Marcado como abandonado',
      accion: 'Decisión: re-engagement o cerrar el caso.'
    });
  }

  return alertas;
}

// Stats agregadas del manager
function eduCalcularStats(students) {
  const now = new Date();
  const ms_per_day = 86400000;
  const stats = {
    total: students.length,
    activos: 0, expirados: 0, pausados: 0, graduados: 0,
    pago_atrasado: 0, pago_vencido: 0,
    vence_30d: 0, vence_14d: 0,
    estancados: 0, sin_actividad_30d: 0,
    avanzando_bien: 0,
    sin_plan: 0
  };
  students.forEach(s => {
    if (s.status === 'active') stats.activos++;
    else if (s.status === 'dropped') stats.expirados++;
    else if (s.status === 'paused') stats.pausados++;
    else if (s.status === 'graduated') stats.graduados++;

    if (s.payment_status === 'past_due') stats.pago_atrasado++;
    if (s.payment_status === 'expired' || s.payment_status === 'cancelled') stats.pago_vencido++;

    if (s.expires_at) {
      const d = Math.floor((new Date(s.expires_at) - now) / ms_per_day);
      if (d >= 0 && d <= 14) stats.vence_14d++;
      else if (d >= 0 && d <= 30) stats.vence_30d++;
    }

    if (s.stage_started_at) {
      const days = Math.floor((now - new Date(s.stage_started_at)) / ms_per_day);
      if (days > 60) stats.estancados++;
    }

    if (s.ultima_fecha_seguimiento) {
      const d = Math.floor((now - new Date(s.ultima_fecha_seguimiento)) / ms_per_day);
      if (d > 30) stats.sin_actividad_30d++;
    } else if (s.enrolled_at) {
      const d = Math.floor((now - new Date(s.enrolled_at)) / ms_per_day);
      if (d > 30) stats.sin_actividad_30d++;
    }

    // Avanzando bien: active + sin alertas críticas
    if (s.status === 'active' && (!s.payment_status || s.payment_status === 'active')) {
      const inStage = s.stage_started_at ? Math.floor((now - new Date(s.stage_started_at)) / ms_per_day) : 0;
      if (inStage < 45) stats.avanzando_bien++;
    }
  });
  return stats;
}

// Distribución de estudiantes por etapa actual
function eduDistribucionEtapas(students) {
  const dist = {};
  students.forEach(s => {
    const k = s.current_stage || 'Sin etapa';
    if (!dist[k]) dist[k] = { stage: k, total: 0, estancados: 0, dias_promedio: 0, _sum_dias: 0 };
    dist[k].total++;
    if (s.stage_started_at) {
      const days = Math.floor((Date.now() - new Date(s.stage_started_at)) / 86400000);
      dist[k]._sum_dias += days;
      if (days > 60) dist[k].estancados++;
    }
  });
  return Object.values(dist).map(d => ({
    ...d,
    dias_promedio: d.total > 0 ? Math.round(d._sum_dias / d.total) : 0
  })).sort((a, b) => b.total - a.total);
}

// Identificar cuellos de botella: etapas con > 30% estancados
function eduCuellosBotella(distribucion) {
  return distribucion
    .filter(d => d.total >= 3 && d.estancados / d.total > 0.3)
    .sort((a, b) => (b.estancados / b.total) - (a.estancados / a.total))
    .slice(0, 5);
}

// Render del dashboard
function eduRenderDashboard() {
  const students = eduMyStudents();
  if (students.length === 0) {
    return `<div class="p-8 text-center"><div class="text-6xl mb-2">📭</div><p class="text-slate-500">Sin estudiantes en esta mentoría. Sincronizá con Airtable o agregá manualmente.</p></div>`;
  }

  const stats = eduCalcularStats(students);
  const distribucion = eduDistribucionEtapas(students);
  const cuellos = eduCuellosBotella(distribucion);

  // Recolectar todas las alertas críticas y high
  const alertasAll = [];
  students.forEach(s => {
    const aS = eduCalcularAlertasEstudiante(s);
    aS.forEach(a => alertasAll.push({ ...a, student: s }));
  });
  const criticas = alertasAll.filter(a => a.severity === 'critical').sort((a,b) => a.student.full_name.localeCompare(b.student.full_name));
  const altas = alertasAll.filter(a => a.severity === 'high');
  const medias = alertasAll.filter(a => a.severity === 'medium');

  // Top 10 estudiantes que necesitan atención urgente
  const urgentes = {};
  alertasAll.forEach(a => {
    if (a.severity === 'critical' || a.severity === 'high') {
      const id = a.student.id;
      if (!urgentes[id]) urgentes[id] = { student: a.student, alertas: [], score: 0 };
      urgentes[id].alertas.push(a);
      urgentes[id].score += a.severity === 'critical' ? 10 : 3;
    }
  });
  const topUrgentes = Object.values(urgentes).sort((a,b) => b.score - a.score).slice(0, 10);

  return `
    <div class="space-y-4">

      <!-- KPIs ejecutivos -->
      <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
        <div class="bg-slate-900 text-white rounded-xl p-3"><div class="text-[10px] uppercase font-bold text-slate-400">Total</div><div class="text-2xl font-bold">${stats.total}</div></div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><div class="text-[10px] uppercase font-bold text-emerald-700">Activos</div><div class="text-2xl font-bold text-emerald-900">${stats.activos}</div></div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3"><div class="text-[10px] uppercase font-bold text-blue-700">Avanzando</div><div class="text-2xl font-bold text-blue-900">${stats.avanzando_bien}</div></div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3"><div class="text-[10px] uppercase font-bold text-amber-700">Estancados</div><div class="text-2xl font-bold text-amber-900">${stats.estancados}</div></div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3"><div class="text-[10px] uppercase font-bold text-red-700">Vence ≤30d</div><div class="text-2xl font-bold text-red-900">${stats.vence_30d + stats.vence_14d}</div></div>
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-3"><div class="text-[10px] uppercase font-bold text-rose-700">Pago vencido</div><div class="text-2xl font-bold text-rose-900">${stats.pago_vencido + stats.pago_atrasado}</div></div>
      </div>

      <!-- Alertas resumen -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-xl p-4">
          <div class="text-[10px] uppercase font-bold text-red-700 mb-1">🚨 Críticas</div>
          <div class="text-3xl font-bold text-red-900">${criticas.length}</div>
          <div class="text-xs text-red-700 mt-1">Acción HOY</div>
        </div>
        <div class="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div class="text-[10px] uppercase font-bold text-amber-700 mb-1">⚠️ Altas</div>
          <div class="text-3xl font-bold text-amber-900">${altas.length}</div>
          <div class="text-xs text-amber-700 mt-1">Esta semana</div>
        </div>
        <div class="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
          <div class="text-[10px] uppercase font-bold text-blue-700 mb-1">📌 Medias</div>
          <div class="text-3xl font-bold text-blue-900">${medias.length}</div>
          <div class="text-xs text-blue-700 mt-1">Este mes</div>
        </div>
      </div>

      <!-- Top urgentes -->
      ${topUrgentes.length > 0 ? `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
            <div class="text-xs font-bold uppercase">🎯 Top 10 que necesitan tu atención AHORA</div>
            <button onclick="eduSetTab('alerts')" class="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">Ver todas las alertas →</button>
          </div>
          <ul class="divide-y divide-slate-100">
            ${topUrgentes.map((u, i) => `
              <li class="px-4 py-2.5 hover:bg-slate-50 cursor-pointer" onclick="eduOpenStudent('${u.student.id}')">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-6 h-6 rounded-full bg-red-100 text-red-900 font-bold text-xs flex items-center justify-center flex-shrink-0">${i+1}</div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-sm">${u.student.full_name}</div>
                      <div class="text-[11px] text-slate-500">${u.student.grupo || u.student.current_stage || '—'}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 flex-wrap justify-end">
                    ${u.alertas.slice(0, 3).map(a => `<span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${a.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}">${a.mensaje}</span>`).join('')}
                    ${u.alertas.length > 3 ? `<span class="text-[10px] text-slate-500">+${u.alertas.length - 3}</span>` : ''}
                  </div>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Distribución por etapa + cuellos de botella -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-white border border-slate-200 rounded-xl p-4">
          <div class="text-xs font-bold uppercase text-slate-600 mb-3">📊 Distribución por etapa</div>
          <div class="space-y-2">
            ${distribucion.slice(0, 8).map(d => {
              const pct = stats.total > 0 ? (d.total / stats.total * 100) : 0;
              const stalled = d.estancados > 0;
              return `
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="text-slate-700 truncate">${d.stage}</span>
                    <span class="font-bold text-slate-900 flex-shrink-0 ml-2">${d.total} · ${d.dias_promedio}d avg ${stalled ? `· <span class="text-red-700">${d.estancados} 🐢</span>` : ''}</span>
                  </div>
                  <div class="bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="${stalled && d.estancados/d.total > 0.3 ? 'bg-red-500' : 'bg-blue-500'} h-full transition-all" style="width: ${pct}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4">
          <div class="text-xs font-bold uppercase text-slate-600 mb-3">🚧 Cuellos de botella</div>
          ${cuellos.length === 0 ? `
            <div class="text-center py-6 text-emerald-600 text-sm">✅ Sin cuellos de botella detectados</div>
          ` : `
            <ul class="space-y-2 text-xs">
              ${cuellos.map(c => `
                <li class="bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <div class="font-bold text-red-900">${c.stage}</div>
                  <div class="text-red-700 mt-0.5">${c.estancados} de ${c.total} estancados (${Math.round(c.estancados/c.total*100)}%) · avg ${c.dias_promedio}d</div>
                  <div class="text-slate-700 mt-1.5 text-[11px]">💡 ${eduSugerenciaCuello(c.stage)}</div>
                </li>
              `).join('')}
            </ul>
          `}
        </div>
      </div>

      <!-- Resumen análisis -->
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div class="text-xs font-bold uppercase text-blue-700 mb-2">🤖 Análisis automático</div>
        <ul class="space-y-1 text-sm text-slate-700">
          ${eduGenerarInsights(stats, distribucion, cuellos, criticas.length, altas.length).map(i => `<li class="flex gap-2"><span>•</span><span>${i}</span></li>`).join('')}
        </ul>
      </div>

    </div>
  `;
}

// Sugerencia accionable según etapa donde hay cuello
function eduSugerenciaCuello(etapa) {
  const e = (etapa || '').toLowerCase();
  if (e.includes('mentalidad') || e.includes('onboard')) return 'Sesión grupal de mindset + accountability partner asignado.';
  if (e.includes('credit') || e.includes('crédito')) return 'Webinar de reconstrucción de crédito + plan paralelo de wholesaling.';
  if (e.includes('analisis') || e.includes('análisis')) return 'Forzar volumen: 10 ofertas/semana durante 30 días + revisión semanal.';
  if (e.includes('negocia')) return 'Role-play de negociación grupal + scripts de discovery del seller.';
  if (e.includes('gestion') || e.includes('gestionando')) return 'PM asignado o sesiones extra de seguimiento de obra. Validar draw schedule.';
  if (e.includes('empresa')) return 'Sprint de estructura corporativa: LLC, CPA, bookkeeping + SOPs.';
  return 'Sesión 1-on-1 para identificar bloqueo específico y crear plan de 30 días.';
}

// Insights generados con reglas
function eduGenerarInsights(stats, distribucion, cuellos, criticasN, altasN) {
  const insights = [];
  if (criticasN > 0) insights.push(`<strong>${criticasN} alertas críticas</strong> que requieren acción HOY. Revisá la lista del top 10.`);
  if (stats.pago_vencido + stats.pago_atrasado > 0) insights.push(`<strong>${stats.pago_vencido + stats.pago_atrasado} estudiantes</strong> con problemas de pago. Pasar a comercial antes de continuar con planes.`);
  if (stats.vence_30d + stats.vence_14d > 0) insights.push(`<strong>${stats.vence_30d + stats.vence_14d} mentorías</strong> vencen en próximos 30 días — preparar pitch de renovación.`);
  if (stats.estancados > stats.total * 0.2) insights.push(`<strong>${Math.round(stats.estancados / stats.total * 100)}% de los estudiantes estancados >60d</strong>. Posible problema sistémico: revisar metodología de esa etapa.`);
  if (cuellos.length > 0) insights.push(`Cuello principal: <strong>${cuellos[0].stage}</strong> con ${cuellos[0].estancados} estancados. ${eduSugerenciaCuello(cuellos[0].stage)}`);
  if (stats.sin_actividad_30d > 0) insights.push(`<strong>${stats.sin_actividad_30d} estudiantes</strong> sin contacto >30 días. Riesgo alto de churn.`);
  const ratioAvanzando = stats.total > 0 ? stats.avanzando_bien / stats.total : 0;
  if (ratioAvanzando > 0.6) insights.push(`✅ <strong>${Math.round(ratioAvanzando*100)}% avanzando bien</strong> — métricas saludables.`);
  else if (ratioAvanzando < 0.3) insights.push(`⚠️ Solo <strong>${Math.round(ratioAvanzando*100)}% avanzando bien</strong>. Mayoría estancada/en riesgo — revisar capacidad del equipo de mentores.`);
  if (insights.length === 0) insights.push('Sin alertas significativas. Mantener cadencia de seguimientos semanales.');
  return insights;
}

// Reemplazar render alerts con versión mejorada
function eduRenderAlertsAvanzado() {
  const students = eduMyStudents();
  if (students.length === 0) return `<div class="p-8 text-center text-slate-500">Sin estudiantes.</div>`;
  const all = [];
  students.forEach(s => {
    const aS = eduCalcularAlertasEstudiante(s);
    aS.forEach(a => all.push({ ...a, student: s }));
  });
  const critical = all.filter(a => a.severity === 'critical');
  const high = all.filter(a => a.severity === 'high');
  const medium = all.filter(a => a.severity === 'medium');
  const totalCount = all.length;

  if (totalCount === 0) return `<div class="p-8 text-center"><div class="text-5xl mb-2">✅</div><p class="text-slate-500">Sin alertas activas. Todo bajo control.</p></div>`;

  const renderGroup = (alerts, title, color, icon) => {
    if (!alerts.length) return '';
    return `
      <div class="bg-white border border-${color}-200 rounded-xl overflow-hidden">
        <div class="bg-${color}-50 px-4 py-2 border-b border-${color}-200 flex items-center justify-between">
          <div class="text-sm font-bold text-${color}-900">${icon} ${title} (${alerts.length})</div>
        </div>
        <ul class="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          ${alerts.map(a => `
            <li class="px-4 py-3 hover:bg-slate-50">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-semibold text-sm">${a.student.full_name}</span>
                    <span class="text-[10px] text-slate-500">${a.student.grupo || ''}</span>
                  </div>
                  <div class="text-xs text-${color}-800 font-medium">${a.mensaje}</div>
                  <div class="text-[11px] text-slate-600 mt-1">💡 ${a.accion}</div>
                </div>
                <div class="flex flex-col gap-1 flex-shrink-0">
                  <button onclick="eduShowStudentDetail('${a.student.id}')" class="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700">👤 Ver detalle</button>
                  <button onclick="eduOpenStudent('${a.student.id}')" class="text-[10px] px-2 py-1 bg-amber-100 hover:bg-amber-200 rounded text-amber-800">🎯 Ver plan</button>
                </div>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  };

  return `
    <div class="space-y-3">
      <div class="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
        <div>
          <div class="text-xs uppercase text-slate-400 font-bold">Alertas Activas</div>
          <div class="text-3xl font-bold">${totalCount}</div>
        </div>
        <div class="flex gap-2 text-xs">
          <div class="bg-red-500/20 px-3 py-1.5 rounded"><span class="font-bold text-red-300">${critical.length}</span> críticas</div>
          <div class="bg-amber-500/20 px-3 py-1.5 rounded"><span class="font-bold text-amber-300">${high.length}</span> altas</div>
          <div class="bg-blue-500/20 px-3 py-1.5 rounded"><span class="font-bold text-blue-300">${medium.length}</span> medias</div>
        </div>
      </div>
      ${renderGroup(critical, 'Críticas — acción HOY', 'red', '🚨')}
      ${renderGroup(high, 'Altas — esta semana', 'amber', '⚠️')}
      ${renderGroup(medium, 'Medias — este mes', 'blue', '📌')}
    </div>
  `;
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
      <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
            <button onclick="eduGuardarEstudiante('${s.id}')" class="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded hover:bg-slate-700">💾 Guardar + Sync Airtable</button>
            <button onclick="eduState.tab='student_plan'; eduState.selectedStudentId='${s.id}'; eduCloseStudentDetail(); eduLoadStudentPlan('${s.id}').then(eduRender);" class="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded hover:bg-amber-700">🎯 Ir al plan</button>
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
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

// ─── CALENDARIO LIGADO A ESTUDIANTE + PLAN ───
// ════════════════════════════════════════════════════════════
// 📅 CALENDARIO DE SESIONES (postventa)
// Filtros: mes, status, estudiante, coach, motivo
// KPIs: asistencia, no-shows, reprogramadas
// Modal nueva sesión + modal de resultado (status + motivo + evidencia)
// Export ICS + mailto para invitación por correo
// ════════════════════════════════════════════════════════════

// Estado local del calendario
const eduCallsState = {
  monthAnchor: null,          // ISO string del primer día del mes visible
  statusFilter: 'all',
  motivoFilter: 'all',
  studentFilter: 'all',
  coachFilter: 'all',
  view: 'list',               // list | month
  showAttendModalFor: null    // call.id si está abierto el modal de marcar resultado
};

// Catálogo cargado en eduLoadAll (si no, default)
const EDU_CALL_MOTIVOS_DEFAULT = [
  { id:'bienvenida', label:'Bienvenida / Onboarding', emoji:'👋' },
  { id:'diagnostico', label:'Diagnóstico inicial', emoji:'🎯' },
  { id:'plan_review', label:'Revisión Plan de Acción', emoji:'📋' },
  { id:'coaching', label:'Coaching 1-on-1', emoji:'💬' },
  { id:'credito', label:'Diagnóstico / Coaching crédito', emoji:'💳' },
  { id:'buybox', label:'Buy Box / Análisis mercado', emoji:'🏘️' },
  { id:'deal_review', label:'Revisión de deal específico', emoji:'🔍' },
  { id:'cierre', label:'Cierre / Celebración deal', emoji:'🎉' },
  { id:'crisis', label:'Crisis / Bloqueo', emoji:'🚨' },
  { id:'renovacion', label:'Renovación / Renewal', emoji:'🔄' },
  { id:'exit', label:'Exit / Despedida', emoji:'👋' },
  { id:'grupal', label:'Sesión grupal', emoji:'👥' },
  { id:'otro', label:'Otro', emoji:'📌' }
];
function eduGetMotivos() {
  return (eduState.callMotivos && eduState.callMotivos.length) ? eduState.callMotivos : EDU_CALL_MOTIVOS_DEFAULT;
}

function eduCallsMonthAnchor() {
  if (!eduCallsState.monthAnchor) {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0);
    eduCallsState.monthAnchor = d.toISOString().slice(0,10);
  }
  return eduCallsState.monthAnchor;
}
function eduCallsNavMonth(delta) {
  const a = new Date(eduCallsMonthAnchor() + 'T00:00:00');
  a.setMonth(a.getMonth() + delta);
  a.setDate(1);
  eduCallsState.monthAnchor = a.toISOString().slice(0,10);
  eduRender();
}

function eduRenderCallsEnhanced() {
  const allCalls = eduState.calls || [];
  const students = eduMyStudents();
  const motivos = eduGetMotivos();

  // Filtrar por mes visible
  const anchor = new Date(eduCallsMonthAnchor() + 'T00:00:00');
  const monthStart = new Date(anchor); monthStart.setDate(1);
  const monthEnd = new Date(anchor); monthEnd.setMonth(monthEnd.getMonth() + 1); monthEnd.setDate(0);
  monthEnd.setHours(23,59,59,999);

  let calls = allCalls.filter(c => {
    const d = new Date(c.scheduled_at);
    return d >= monthStart && d <= monthEnd && (!c.mentorship_id || c.mentorship_id === eduState.mentorshipId);
  });
  if (eduCallsState.statusFilter !== 'all') calls = calls.filter(c => (c.status_attendance || 'pendiente') === eduCallsState.statusFilter);
  if (eduCallsState.motivoFilter !== 'all') calls = calls.filter(c => c.motivo === eduCallsState.motivoFilter);
  if (eduCallsState.studentFilter !== 'all') calls = calls.filter(c => c.student_id === eduCallsState.studentFilter);
  if (eduCallsState.coachFilter !== 'all') calls = calls.filter(c => (c.attended_by || '') === eduCallsState.coachFilter);

  // KPIs del mes
  const total = calls.length;
  const asist = calls.filter(c => c.status_attendance === 'asistio').length;
  const noShow = calls.filter(c => c.status_attendance === 'no_asistio').length;
  const reprog = calls.filter(c => c.status_attendance === 'reprogramo').length;
  const cancel = calls.filter(c => c.status_attendance === 'cancelo').length;
  const pend = calls.filter(c => !c.status_attendance || ['pendiente','confirmado'].includes(c.status_attendance)).length;
  const pctAsistencia = (asist + noShow) > 0 ? Math.round(100 * asist / (asist + noShow)) : null;

  // Coach options de los datos
  const coachSet = new Set(allCalls.map(c => c.attended_by).filter(Boolean));

  const monthLabel = anchor.toLocaleDateString('es', { month:'long', year:'numeric' });

  return `
    <div class="space-y-3">
      <!-- Header: nav mes + KPIs -->
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="text-xs font-bold uppercase text-slate-400">📅 Calendario de sesiones</div>
            <div class="flex items-center gap-2 mt-1">
              <button onclick="eduCallsNavMonth(-1)" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">←</button>
              <div class="text-xl font-bold capitalize">${monthLabel}</div>
              <button onclick="eduCallsNavMonth(1)" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">→</button>
              <button onclick="eduCallsNavMonth(0); eduCallsState.monthAnchor=null; eduRender();" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">Hoy</button>
            </div>
          </div>
          <button onclick="eduAgendarCallNueva()" class="bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold px-4 py-2 rounded">+ Nueva sesión</button>
        </div>
        <div class="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4">
          <div class="bg-white/10 rounded p-2"><div class="text-[10px] opacity-80">Total mes</div><div class="text-xl font-bold">${total}</div></div>
          <div class="bg-emerald-500/30 rounded p-2"><div class="text-[10px] opacity-90">Asistió</div><div class="text-xl font-bold">${asist}</div></div>
          <div class="bg-red-500/30 rounded p-2"><div class="text-[10px] opacity-90">No asistió</div><div class="text-xl font-bold">${noShow}</div></div>
          <div class="bg-amber-500/30 rounded p-2"><div class="text-[10px] opacity-90">Reprogramó</div><div class="text-xl font-bold">${reprog}</div></div>
          <div class="bg-slate-500/30 rounded p-2"><div class="text-[10px] opacity-90">Canceló</div><div class="text-xl font-bold">${cancel}</div></div>
          <div class="bg-blue-500/30 rounded p-2"><div class="text-[10px] opacity-90">% asistencia</div><div class="text-xl font-bold">${pctAsistencia != null ? pctAsistencia+'%' : '—'}</div></div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2 text-xs">
        <span class="font-bold text-slate-700 mr-1">Filtrar:</span>
        <select onchange="eduCallsState.statusFilter=this.value; eduRender();" class="border border-slate-300 rounded px-2 py-1">
          <option value="all" ${eduCallsState.statusFilter==='all'?'selected':''}>Todos los status</option>
          <option value="pendiente" ${eduCallsState.statusFilter==='pendiente'?'selected':''}>⏳ Pendiente</option>
          <option value="confirmado" ${eduCallsState.statusFilter==='confirmado'?'selected':''}>✅ Confirmado</option>
          <option value="asistio" ${eduCallsState.statusFilter==='asistio'?'selected':''}>✓ Asistió</option>
          <option value="no_asistio" ${eduCallsState.statusFilter==='no_asistio'?'selected':''}>✗ No asistió</option>
          <option value="reprogramo" ${eduCallsState.statusFilter==='reprogramo'?'selected':''}>🔄 Reprogramó</option>
          <option value="cancelo" ${eduCallsState.statusFilter==='cancelo'?'selected':''}>✕ Canceló</option>
        </select>
        <select onchange="eduCallsState.motivoFilter=this.value; eduRender();" class="border border-slate-300 rounded px-2 py-1">
          <option value="all" ${eduCallsState.motivoFilter==='all'?'selected':''}>Todos los motivos</option>
          ${motivos.map(m => `<option value="${m.id}" ${eduCallsState.motivoFilter===m.id?'selected':''}>${m.emoji||''} ${m.label}</option>`).join('')}
        </select>
        <select onchange="eduCallsState.studentFilter=this.value; eduRender();" class="border border-slate-300 rounded px-2 py-1">
          <option value="all" ${eduCallsState.studentFilter==='all'?'selected':''}>Todos los estudiantes</option>
          ${students.map(s => `<option value="${s.id}" ${eduCallsState.studentFilter===s.id?'selected':''}>${(s.full_name||'').replace(/</g,'&lt;')}</option>`).join('')}
        </select>
        ${coachSet.size > 0 ? `<select onchange="eduCallsState.coachFilter=this.value; eduRender();" class="border border-slate-300 rounded px-2 py-1">
          <option value="all" ${eduCallsState.coachFilter==='all'?'selected':''}>Todos los coaches</option>
          ${[...coachSet].map(c => `<option value="${c}" ${eduCallsState.coachFilter===c?'selected':''}>${c.replace(/</g,'&lt;')}</option>`).join('')}
        </select>` : ''}
      </div>

      <!-- Tabla de sesiones -->
      ${calls.length === 0 ? `<div class="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">Sin sesiones que coincidan con los filtros del mes.</div>` : `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-50">
                <tr class="text-[10px] uppercase text-slate-600">
                  <th class="text-left p-2">Fecha y hora</th>
                  <th class="text-left p-2">Estudiante</th>
                  <th class="text-left p-2">Motivo · Tema</th>
                  <th class="text-left p-2">Coach</th>
                  <th class="text-left p-2">Status</th>
                  <th class="text-left p-2">Evidencia</th>
                  <th class="text-right p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${calls.sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)).map(c => {
                  const st = students.find(s => s.id === c.student_id);
                  const mot = motivos.find(m => m.id === c.motivo);
                  const stat = c.status_attendance || 'pendiente';
                  const statBadge = {
                    pendiente: '<span class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">⏳ PEND</span>',
                    confirmado: '<span class="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold">✅ CONF</span>',
                    asistio: '<span class="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ ASIS</span>',
                    no_asistio: '<span class="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[9px] font-bold">✗ NO ASIS</span>',
                    reprogramo: '<span class="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-bold">🔄 REPROG</span>',
                    cancelo: '<span class="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">✕ CANC</span>'
                  }[stat] || stat;
                  const d = new Date(c.scheduled_at);
                  const isFuture = d >= new Date();
                  return `<tr class="border-t border-slate-100 hover:bg-slate-50">
                    <td class="p-2 whitespace-nowrap">
                      <div class="font-bold">${d.toLocaleDateString('es', {weekday:'short', day:'numeric', month:'short'})}</div>
                      <div class="text-[10px] text-slate-500">${d.toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'})} · ${c.duration_min||60}min</div>
                    </td>
                    <td class="p-2 max-w-[150px]"><button onclick="eduShowStudentDetail('${c.student_id}')" class="text-blue-600 hover:underline truncate text-left block">${(st?.full_name||'—').replace(/</g,'&lt;')}</button></td>
                    <td class="p-2 max-w-[220px]">
                      <div class="font-medium">${mot ? mot.emoji+' '+mot.label : (c.motivo || c.type || '—')}</div>
                      ${c.topic ? `<div class="text-[10px] text-slate-500 truncate" title="${(c.topic||'').replace(/"/g,'&quot;')}">${(c.topic||'').replace(/</g,'&lt;')}</div>` : ''}
                    </td>
                    <td class="p-2 max-w-[120px]"><div class="truncate">${(c.attended_by||'—').replace(/</g,'&lt;')}</div></td>
                    <td class="p-2">${statBadge}${c.status_reason ? `<div class="text-[9px] text-slate-500 truncate max-w-[100px]" title="${(c.status_reason||'').replace(/"/g,'&quot;')}">${(c.status_reason||'').replace(/</g,'&lt;')}</div>` : ''}</td>
                    <td class="p-2">${c.evidence_url ? `<a href="${c.evidence_url}" target="_blank" class="text-[10px] text-blue-600 hover:underline">📎 ver</a>` : '<span class="text-[10px] text-slate-300">—</span>'}</td>
                    <td class="p-2 text-right whitespace-nowrap">
                      ${isFuture ? `
                        <button onclick="eduCallSendInvite('${c.id}')" class="text-[10px] text-blue-700 hover:underline mr-1" title="Enviar invitación por correo">📧</button>
                        <button onclick="eduCallDownloadICS('${c.id}')" class="text-[10px] text-violet-700 hover:underline mr-1" title="Descargar invitación .ics">📅</button>
                      ` : ''}
                      <button onclick="eduCallOpenResult('${c.id}')" class="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold mr-1">Marcar</button>
                      <button onclick="eduCallEdit('${c.id}')" class="text-[10px] text-slate-600 hover:text-slate-900 mr-1" title="Editar">✏️</button>
                      <button onclick="eduCallDelete('${c.id}')" class="text-[10px] text-red-600 hover:text-red-800" title="Eliminar">🗑️</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>
  `;
}

// ─── Modal: agendar nueva sesión ───
async function eduAgendarCallNueva(presetStudentId) {
  const students = eduMyStudents();
  if (!students.length) return alert('Sin estudiantes en la mentoría. Sincronizá primero.');
  const motivos = eduGetMotivos();
  const now = new Date(); now.setMinutes(0,0,0); now.setHours(now.getHours() + 1);
  const defaultDate = now.toISOString().slice(0,16);
  const coachDefault = (state.user && state.user.email) || '';
  const studentOpts = students.map(s => `<option value="${s.id}" ${presetStudentId===s.id?'selected':''} data-email="${(s.email||'').replace(/"/g,'&quot;')}">${(s.full_name||'').replace(/</g,'&lt;')}${s.email?' · '+s.email:''}</option>`).join('');
  const motivoOpts = motivos.map(m => `<option value="${m.id}">${m.emoji||''} ${m.label}</option>`).join('');

  const html = `
    <div class="space-y-3">
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Estudiante *</label>
        <select id="ec-student" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" onchange="eduCallOnStudentChange()">
          <option value="">— Selecciona —</option>
          ${studentOpts}
        </select>
        <div id="ec-student-email-hint" class="text-[10px] text-slate-500 mt-1"></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Fecha y hora *</label>
          <input id="ec-datetime" type="datetime-local" value="${defaultDate}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Duración (min)</label>
          <input id="ec-duration" type="number" value="60" min="15" step="15" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Motivo *</label>
        <select id="ec-motivo" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
          <option value="">— Categoría —</option>
          ${motivoOpts}
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tema específico (texto libre)</label>
        <input id="ec-topic" type="text" placeholder="Ej. Revisión buybox Austin SE + 3 comps" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
      </div>

      <!-- ── ASISTENTES Y UBICACIÓN ── -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
        <div class="text-[10px] font-bold uppercase text-blue-800">📧 Asistentes que reciben invitación</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Coach que atiende (email) *</label>
            <input id="ec-coach" type="email" value="${coachDefault.replace(/"/g,'&quot;')}" placeholder="coach@empresa.com" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Status inicial</label>
            <select id="ec-status" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="pendiente">⏳ Pendiente</option>
              <option value="confirmado">✅ Confirmado</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-600 mb-1">Asistentes adicionales (emails separados por coma)</label>
          <textarea id="ec-attendees" rows="2" placeholder="otro_coach@empresa.com, partner@empresa.com, observador@empresa.com" class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
          <div class="text-[10px] text-slate-500 mt-0.5">El estudiante (su email) + el coach se agregan automáticamente. Aquí agregás extras.</div>
        </div>
      </div>

      <!-- ── LUGAR / VIDEO LLAMADA ── -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Lugar / plataforma</label>
          <input id="ec-location" type="text" placeholder="Zoom, Google Meet, Oficina..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">URL de la reunión</label>
          <input id="ec-meeting-url" type="url" placeholder="https://meet.google.com/..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Notas / Agenda (opcional)</label>
        <textarea id="ec-notes" rows="3" placeholder="Puntos a tratar..." class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
      </div>

      <div class="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded p-2">
        <input type="checkbox" id="ec-send-invites" checked />
        <label for="ec-send-invites" class="text-xs text-slate-700"><strong>📤 Enviar invitaciones por correo al guardar</strong> (abre tu cliente de email con .ics adjunto y todos los emails como destinatarios)</label>
      </div>

      <div class="flex gap-2">
        <button onclick="eduCallSave()" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold py-2.5 rounded-lg">💾 Agendar sesión</button>
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">Cancelar</button>
      </div>
    </div>
  `;
  openModal('📅 Nueva sesión', html);
  if (presetStudentId) setTimeout(eduCallOnStudentChange, 50);
}

function eduCallOnStudentChange() {
  const sel = document.getElementById('ec-student');
  const opt = sel.options[sel.selectedIndex];
  const email = opt ? opt.getAttribute('data-email') : '';
  const hint = document.getElementById('ec-student-email-hint');
  if (!hint) return;
  if (email) {
    hint.innerHTML = `✓ Email del estudiante: <strong>${email}</strong> — recibirá invitación automáticamente.`;
    hint.className = 'text-[10px] text-emerald-700 mt-1';
  } else {
    hint.innerHTML = `⚠️ Este estudiante <strong>no tiene email en el CRM</strong>. Editalo primero o agregalo manualmente en "asistentes adicionales" abajo.`;
    hint.className = 'text-[10px] text-amber-700 mt-1';
  }
}

async function eduCallSave() {
  const studentId = document.getElementById('ec-student').value;
  const datetime = document.getElementById('ec-datetime').value;
  const duration = +document.getElementById('ec-duration').value || 60;
  const motivo = document.getElementById('ec-motivo').value;
  const topic = document.getElementById('ec-topic').value.trim();
  const coach = document.getElementById('ec-coach').value.trim();
  const status = document.getElementById('ec-status').value;
  const notes = document.getElementById('ec-notes').value.trim();
  const attendeesRaw = document.getElementById('ec-attendees').value.trim();
  const location = document.getElementById('ec-location').value.trim();
  const meetingUrl = document.getElementById('ec-meeting-url').value.trim();
  const sendInvites = document.getElementById('ec-send-invites').checked;

  if (!studentId) return alert('Falta estudiante.');
  if (!datetime) return alert('Falta fecha y hora.');
  if (!motivo) return alert('Falta motivo.');

  // Parsear asistentes
  const extraEmails = attendeesRaw.split(/[,;\s\n]+/).map(s => s.trim()).filter(s => s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));

  const { data: inserted, error } = await sb.from('edu_student_calls').insert({
    mentorship_id: eduState.mentorshipId,
    student_id: studentId,
    scheduled_at: new Date(datetime).toISOString(),
    duration_min: duration,
    motivo,
    topic: topic || null,
    attended_by: coach || null,
    status_attendance: status,
    notes_md: notes || null,
    attendee_emails: extraEmails,
    location: location || null,
    meeting_url: meetingUrl || null,
    type: 'mentoring'
  }).select().single();

  if (error) return alert('Error: '+error.message);
  closeModal();
  await eduLoadAll();
  eduRender();

  if (sendInvites && inserted) {
    // Disparar envío de invitación multi-destinatario
    setTimeout(() => eduCallSendInvite(inserted.id, true), 200);
  }
}

// ─── Modal: marcar resultado (status + motivo + evidencia + resumen) ───
function eduCallOpenResult(callId) {
  const c = (eduState.calls || []).find(x => x.id === callId);
  if (!c) return;
  const motivos = eduGetMotivos();
  const motivoOpts = motivos.map(m => `<option value="${m.id}" ${c.motivo===m.id?'selected':''}>${m.emoji||''} ${m.label}</option>`).join('');

  const html = `
    <div class="space-y-3">
      <div class="bg-slate-50 border border-slate-200 rounded p-2 text-xs">
        <div class="font-bold">${new Date(c.scheduled_at).toLocaleString('es', {dateStyle:'full', timeStyle:'short'})}</div>
        <div class="text-slate-600">${c.topic || 'Sin tema'}</div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Status de asistencia *</label>
        <div class="grid grid-cols-2 gap-1">
          ${['asistio','no_asistio','reprogramo','cancelo','confirmado','pendiente'].map(s => {
            const labels = { asistio:'✓ Asistió', no_asistio:'✗ No asistió', reprogramo:'🔄 Reprogramó', cancelo:'✕ Canceló', confirmado:'✅ Confirmado', pendiente:'⏳ Pendiente' };
            const sel = (c.status_attendance || 'pendiente') === s;
            return `<button type="button" onclick="document.getElementById('ec-r-status').value='${s}'; document.querySelectorAll('.ec-r-stat-btn').forEach(b=>b.classList.remove('bg-amber-500','text-white')); this.classList.add('bg-amber-500','text-white');" class="ec-r-stat-btn px-3 py-1.5 rounded border border-slate-300 text-xs font-bold ${sel?'bg-amber-500 text-white':'bg-white hover:bg-slate-50'}">${labels[s]}</button>`;
          }).join('')}
        </div>
        <input type="hidden" id="ec-r-status" value="${c.status_attendance||'pendiente'}"/>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Motivo si no asistió / reprogramó / canceló</label>
        <input id="ec-r-reason" type="text" value="${(c.status_reason||'').replace(/"/g,'&quot;')}" placeholder="Ej. Conflicto laboral · Falta de preparación · Emergencia familiar" class="w-full border border-slate-300 rounded px-3 py-2 text-xs"/>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Atendió (coach)</label>
          <input id="ec-r-coach" type="text" value="${(c.attended_by||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Motivo (categoría)</label>
          <select id="ec-r-motivo" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
            <option value="">—</option>
            ${motivoOpts}
          </select>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Evidencia (URL — Drive, Zoom recording, Notion, etc.)</label>
        <input id="ec-r-evidence" type="url" value="${(c.evidence_url||'').replace(/"/g,'&quot;')}" placeholder="https://..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Resumen post-sesión (qué se cubrió / próximos pasos)</label>
        <textarea id="ec-r-summary" rows="4" class="w-full border border-slate-300 rounded px-3 py-2 text-xs">${escapeHtml(c.summary || c.notes_md || '')}</textarea>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded p-2 text-[11px] text-blue-800">
        💡 Si el status es "reprogramó", al guardar te ofrezco crear la nueva sesión vinculada.
      </div>
      <div class="flex gap-2">
        <button onclick="eduCallSaveResult('${callId}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-lg">💾 Guardar resultado</button>
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">Cancelar</button>
      </div>
    </div>
  `;
  openModal('📋 Marcar resultado de la sesión', html);
}

async function eduCallSaveResult(callId) {
  const c = (eduState.calls || []).find(x => x.id === callId);
  if (!c) return;
  const update = {
    status_attendance: document.getElementById('ec-r-status').value,
    status_reason: document.getElementById('ec-r-reason').value.trim() || null,
    attended_by: document.getElementById('ec-r-coach').value.trim() || null,
    motivo: document.getElementById('ec-r-motivo').value || c.motivo,
    evidence_url: document.getElementById('ec-r-evidence').value.trim() || null,
    summary: document.getElementById('ec-r-summary').value.trim() || null,
    attended: document.getElementById('ec-r-status').value === 'asistio',
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('edu_student_calls').update(update).eq('id', callId);
  if (error) return alert('Error: '+error.message);

  // Si reprogramó, ofrecer crear nueva sesión
  if (update.status_attendance === 'reprogramo' && confirm('¿Crear la nueva sesión reprogramada?')) {
    closeModal();
    setTimeout(() => eduAgendarCallNueva(c.student_id), 100);
  } else {
    closeModal();
  }
  await eduLoadAll();
  eduRender();
}

async function eduCallDelete(id) {
  if (!confirm('¿Eliminar esta sesión? No se puede deshacer.')) return;
  await sb.from('edu_student_calls').delete().eq('id', id);
  await eduLoadAll();
  eduRender();
}

async function eduCallEdit(id) {
  const c = (eduState.calls || []).find(x => x.id === id);
  if (!c) return;
  // Reusa el modal nuevo pero pre-llena valores
  await eduAgendarCallNueva(c.student_id);
  setTimeout(() => {
    document.getElementById('ec-datetime').value = new Date(c.scheduled_at).toISOString().slice(0,16);
    document.getElementById('ec-duration').value = c.duration_min || 60;
    if (c.motivo) document.getElementById('ec-motivo').value = c.motivo;
    if (c.topic) document.getElementById('ec-topic').value = c.topic;
    if (c.attended_by) document.getElementById('ec-coach').value = c.attended_by;
    if (c.status_attendance) document.getElementById('ec-status').value = c.status_attendance;
    if (c.notes_md) document.getElementById('ec-notes').value = c.notes_md;
    // Cambia el botón a "Actualizar"
    const btn = document.querySelector('#modal-body button[onclick="eduCallSave()"]');
    if (btn) { btn.textContent = '💾 Actualizar sesión'; btn.setAttribute('onclick', `eduCallUpdate('${id}')`); }
  }, 50);
}

async function eduCallUpdate(id) {
  const update = {
    student_id: document.getElementById('ec-student').value,
    scheduled_at: new Date(document.getElementById('ec-datetime').value).toISOString(),
    duration_min: +document.getElementById('ec-duration').value || 60,
    motivo: document.getElementById('ec-motivo').value,
    topic: document.getElementById('ec-topic').value.trim() || null,
    attended_by: document.getElementById('ec-coach').value.trim() || null,
    status_attendance: document.getElementById('ec-status').value,
    notes_md: document.getElementById('ec-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('edu_student_calls').update(update).eq('id', id);
  if (error) return alert('Error: '+error.message);
  closeModal();
  await eduLoadAll();
  eduRender();
}

// ─── Invitación por correo: ICS + mailto (multi-destinatario) ───

// Recolecta todos los emails de asistentes (estudiante + coach + extras), únicos.
function eduCallCollectAttendees(c, student) {
  const set = new Set();
  if (student && student.email) set.add(student.email.toLowerCase().trim());
  if (c.attended_by && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.attended_by)) set.add(c.attended_by.toLowerCase().trim());
  (c.attendee_emails || []).forEach(e => { if (e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) set.add(e.toLowerCase().trim()); });
  return [...set];
}

function eduCallBuildICS(c, student, motivo) {
  const start = new Date(c.scheduled_at);
  const end = new Date(start.getTime() + (c.duration_min || 60) * 60000);
  const fmt = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d+/, '');
  const uid = (c.id || ('uid-'+Date.now())) + '@empresa-os';
  const summary = (motivo ? motivo.label : c.motivo || 'Sesión') + (c.topic ? ' · ' + c.topic : '');
  const descParts = [];
  if (c.topic) descParts.push(c.topic);
  if (c.notes_md) descParts.push(c.notes_md);
  if (c.meeting_url) descParts.push('Link: ' + c.meeting_url);
  if (c.attended_by) descParts.push('Coach: ' + c.attended_by);
  const desc = descParts.join('\\n\\n').replace(/\n/g, '\\n').replace(/,/g, '\\,');
  const allAttendees = eduCallCollectAttendees(c, student);

  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//EmpresaOS//Edu//ES','METHOD:REQUEST','CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:'+uid,
    'DTSTAMP:'+fmt(new Date()),
    'DTSTART:'+fmt(start),
    'DTEND:'+fmt(end),
    'SUMMARY:'+summary,
    desc ? 'DESCRIPTION:'+desc : '',
    c.location ? 'LOCATION:'+ (c.meeting_url ? (c.location + ' ' + c.meeting_url) : c.location) : (c.meeting_url ? 'LOCATION:'+c.meeting_url : ''),
    c.meeting_url ? 'URL:'+c.meeting_url : '',
    c.attended_by ? 'ORGANIZER;CN='+c.attended_by+':mailto:'+c.attended_by : '',
    ...allAttendees.map(em => {
      const role = (em === (c.attended_by||'').toLowerCase()) ? 'CHAIR' : 'REQ-PARTICIPANT';
      const cn = (student && student.email && em === student.email.toLowerCase()) ? (student.full_name || '') : '';
      return `ATTENDEE;CN=${cn};ROLE=${role};RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${em}`;
    }),
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT','END:VCALENDAR'
  ].filter(Boolean);
  return lines.join('\r\n');
}

function eduCallDownloadICS(id) {
  const c = (eduState.calls || []).find(x => x.id === id);
  if (!c) return;
  const student = (eduState.students || []).find(s => s.id === c.student_id);
  const motivo = eduGetMotivos().find(m => m.id === c.motivo);
  const ics = eduCallBuildICS(c, student, motivo);
  const blob = new Blob([ics], { type:'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `sesion-${(student?.full_name||'estudiante').replace(/\s+/g,'_')}-${new Date(c.scheduled_at).toISOString().slice(0,10)}.ics`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function eduCallSendInvite(id, silent) {
  const c = (eduState.calls || []).find(x => x.id === id);
  if (!c) return;
  const student = (eduState.students || []).find(s => s.id === c.student_id);
  if (!student) return alert('Estudiante no encontrado');
  const attendees = eduCallCollectAttendees(c, student);
  if (!attendees.length) {
    if (!silent) alert('No hay emails de destinatarios. Agregalos en el modal de edición.');
    return;
  }
  const motivo = eduGetMotivos().find(m => m.id === c.motivo);
  const d = new Date(c.scheduled_at);
  const dateStr = d.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const timeStr = d.toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit' });
  const subject = `Sesión ${motivo?motivo.label:''} — ${dateStr}`;
  const body =
`Hola,

Te confirmo la sesión:

📅 ${dateStr}
🕐 ${timeStr} (${c.duration_min||60} minutos)
📋 ${motivo?motivo.label:''}${c.topic?' · '+c.topic:''}
👤 Estudiante: ${student.full_name||''}${c.attended_by?'\n🎯 Coach: '+c.attended_by:''}
${c.location ? '📍 Lugar: '+c.location : ''}${c.meeting_url ? '\n🔗 Link: '+c.meeting_url : ''}

${c.notes_md ? 'Agenda:\n'+c.notes_md+'\n\n' : ''}Adjunto la invitación .ics para que se agregue automáticamente a tu calendario (Google/Outlook/Apple).

Nos vemos.
${(state.user&&state.user.email)||''}`;

  // 1) Descargar ICS (con todos los attendees como ATTENDEE) para adjuntarlo manualmente
  eduCallDownloadICS(id);

  // 2) Abrir mailto con todos los destinatarios
  // mailto: TO acepta multi-emails separados por coma
  setTimeout(() => {
    const to = encodeURIComponent(attendees.join(','));
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, 300);

  // 3) Marcar email_sent_at + invite_meta
  sb.from('edu_student_calls').update({
    email_sent_at: new Date().toISOString(),
    invite_meta: { sent_to: attendees, count: attendees.length, at: new Date().toISOString() }
  }).eq('id', id).then(() => {});

  if (!silent) alert(`📧 Invitación preparada para ${attendees.length} persona(s):\n${attendees.join('\n')}\n\nSe abrió tu cliente de email con el asunto + cuerpo + lista de destinatarios. ADJUNTÁ EL .ics QUE SE DESCARGÓ y enviá.`);
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

function fmAbrirPlanGuardado(planId, studentId, mentorshipId) {
  // Cerrar Metodología (si está en modal) y abrir Mentorías Manager con ese estudiante
  // Como las funciones de eduState pueden no estar inicializadas, hacemos guardar en localStorage hint y recargamos
  localStorage.setItem('edu_open_plan', JSON.stringify({ studentId, mentorshipId, ts: Date.now() }));
  // Si fmState.sys está disponible, cerrar modal
  alert(`Abriendo plan en Mentorías Manager...\n\nEstudiante ID: ${studentId.slice(0,8)}...`);
  // Cierre y abre el manager
  if (typeof closeModal === 'function') closeModal();
  // Buscar sistema edu-manager y abrirlo
  if (typeof state !== 'undefined' && state?.areas) {
    const sys = (window._allSystems || []).find(s => s.type === 'edu-manager');
    if (sys && typeof openEduManager === 'function') {
      eduState.mentorshipId = mentorshipId;
      eduState.selectedStudentId = studentId;
      eduState.tab = 'student_plan';
      openEduManager(sys);
      setTimeout(() => eduLoadStudentPlan(studentId).then(eduRender), 500);
      return;
    }
  }
  window.location.reload();
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
  if (!confirm('¿Vincular este plan al estudiante seleccionado? Si ya tenía plan activo, se archivará.')) return;

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

  // Archivar plan previo activo
  await sb.from('edu_student_plans').update({ status: 'archived' })
    .eq('student_id', studentId).eq('status', 'active');

  // Crear plan
  const { data: plan, error } = await sb.from('edu_student_plans').insert({
    student_id: studentId,
    mentorship_id: mentorshipId,
    diagnostico: answers,
    perfil: { ...r, userProfile },
    bloques_ids: bloques.map(b => b.id),
    modo: 'completo',
    status: 'active'
  }).select().single();
  if (error) return alert('Error: '+error.message);

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
  if (tasks.length) await sb.from('edu_student_plan_tasks').insert(tasks);

  // Cerrar modal y notificar
  document.getElementById('fm-link-student-modal')?.remove();
  const student = (window._fmLinkStudents || []).find(s => s.id === studentId);
  alert(`✅ Plan vinculado a ${student?.full_name || 'estudiante'}\n\n${bloques.length} bloques · ${tasks.length} tareas\n\nLo podés ver en Mentorías Manager → ${student?.full_name} → Plan Acción`);

  // Refrescar cache de planes guardados
  fmSavedPlansCache = null;
}

// ════════════════════════════════════════════════════════════
// 💳 DIAGNÓSTICO DE CRÉDITO — wizard 16 preguntas → plan 90 días
// Tabla: edu_credit_diagnostics + edu_credit_plan_tasks
// ════════════════════════════════════════════════════════════

const FM_CREDIT_QUESTIONS = [
  // ── BLOQUE A · Score actual ───────────────────────────
  { id:'fico_band', bloque:'A · FICO',
    pregunta:'¿En qué rango está tu FICO score actual?',
    opciones:[
      { val:'sin_historial', label:'Sin historial crediticio en USA (ITIN o reciente)' },
      { val:'menos_580',     label:'< 580 — pobre, reconstruir' },
      { val:'580_619',       label:'580-619 — bajo, sub-prime' },
      { val:'620_659',       label:'620-659 — justo' },
      { val:'660_699',       label:'660-699 — bueno' },
      { val:'700_739',       label:'700-739 — muy bueno' },
      { val:'740_779',       label:'740-779 — excelente' },
      { val:'mas_780',       label:'≥ 780 — top tier' }
    ] },
  { id:'fico_exacto', bloque:'A · FICO',
    pregunta:'Si lo conocés exacto, escribilo (opcional)',
    tipo:'number', placeholder:'Ej. 712' },
  { id:'monitoring', bloque:'A · FICO',
    pregunta:'¿Estás monitoreando tu crédito hoy?',
    opciones:[
      { val:'experian',  label:'Sí, con Experian/MyFICO (pago)' },
      { val:'gratis',    label:'Sí, con Credit Karma / Capital One / Chase (gratis)' },
      { val:'nada',      label:'No tengo monitoreo activo' }
    ] },

  // ── BLOQUE B · Antigüedad e historial ─────────────────
  { id:'antiguedad', bloque:'B · Historial',
    pregunta:'¿Cuántos años tiene tu cuenta de crédito MÁS ANTIGUA en USA?',
    opciones:[
      { val:'menos_1',  label:'< 1 año (cuenta nueva)' },
      { val:'1_2',      label:'1-2 años' },
      { val:'3_5',      label:'3-5 años' },
      { val:'6_10',     label:'6-10 años' },
      { val:'mas_10',   label:'> 10 años (historial largo)' }
    ] },
  { id:'cuentas_activas', bloque:'B · Historial',
    pregunta:'¿Cuántas tarjetas de crédito activas tenés HOY?',
    opciones:[
      { val:'0',     label:'0 tarjetas — necesitás abrir' },
      { val:'1',     label:'1 tarjeta' },
      { val:'2_3',   label:'2-3 tarjetas' },
      { val:'4_6',   label:'4-6 tarjetas (mix saludable)' },
      { val:'mas_6', label:'7+ tarjetas (alto)' }
    ] },
  { id:'mix_credito', bloque:'B · Historial',
    pregunta:'Además de tarjetas, ¿qué otros tipos de crédito tenés?',
    multiSelect:true,
    opciones:[
      { val:'auto',       label:'🚗 Auto loan' },
      { val:'student',    label:'🎓 Student loan' },
      { val:'mortgage',   label:'🏠 Hipoteca (mortgage)' },
      { val:'personal',   label:'💵 Personal loan' },
      { val:'business',   label:'🏢 Business credit / línea' },
      { val:'ninguno',    label:'Ninguno — solo tarjetas' }
    ] },

  // ── BLOQUE C · Utilization ────────────────────────────
  { id:'utilization', bloque:'C · Uso',
    pregunta:'¿Qué % de tu límite total estás usando hoy (suma balances ÷ suma límites)?',
    opciones:[
      { val:'menos_10',  label:'< 10% — óptimo' },
      { val:'10_29',     label:'10-29% — bueno' },
      { val:'30_49',     label:'30-49% — sube tu score si bajás' },
      { val:'50_74',     label:'50-74% — alto, te penaliza' },
      { val:'mas_75',    label:'≥ 75% — crítico, pagá YA' },
      { val:'no_se',     label:'No sé' }
    ] },
  { id:'limite_total', bloque:'C · Uso',
    pregunta:'¿Cuál es el LÍMITE total combinado de todas tus tarjetas? (USD)',
    tipo:'number', placeholder:'Ej. 25000' },

  // ── BLOQUE D · Derogatorios / negativos ───────────────
  { id:'pagos_tarde', bloque:'D · Negativos',
    pregunta:'¿Tuviste pagos atrasados (30+ días) en los últimos 24 meses?',
    opciones:[
      { val:'cero',    label:'Cero — siempre pago a tiempo' },
      { val:'1',       label:'1 pago tarde' },
      { val:'2_3',     label:'2-3 pagos tarde' },
      { val:'mas_3',   label:'4+ pagos tarde' }
    ] },
  { id:'derogatorios', bloque:'D · Negativos',
    pregunta:'¿Tenés alguno de estos derogatorios actualmente en tu reporte?',
    multiSelect:true,
    opciones:[
      { val:'collection',  label:'🚨 Cuenta en colección (collection)' },
      { val:'charge_off',  label:'🚨 Charge-off' },
      { val:'judgment',    label:'⚖️ Judgment / lien' },
      { val:'bankruptcy',  label:'💥 Bankruptcy (Cap 7 o 13)' },
      { val:'foreclosure', label:'🏚️ Foreclosure / short sale' },
      { val:'ninguno',     label:'✅ Ninguno' }
    ] },
  { id:'consultas', bloque:'D · Negativos',
    pregunta:'¿Cuántas hard inquiries (consultas duras) tenés en los últimos 12 meses?',
    opciones:[
      { val:'0_2',    label:'0-2 — normal' },
      { val:'3_5',    label:'3-5 — medio' },
      { val:'mas_6',  label:'6+ — alto, evitá nuevas aplicaciones' }
    ] },

  // ── BLOQUE E · Ingresos y DTI ─────────────────────────
  { id:'ingreso_mensual', bloque:'E · Ingresos',
    pregunta:'¿Tu ingreso BRUTO mensual aproximado? (USD)',
    tipo:'number', placeholder:'Ej. 8500' },
  { id:'documentado', bloque:'E · Ingresos',
    pregunta:'¿Tu ingreso es DOCUMENTABLE para lenders (W-2 / 1099 / tax returns)?',
    opciones:[
      { val:'w2',         label:'✅ W-2 — empleado formal' },
      { val:'1099_2y',    label:'✅ 1099 con 2+ años tax returns' },
      { val:'1099_1y',    label:'⚠️ 1099 con menos de 2 años' },
      { val:'bank_only',  label:'⚠️ Solo bank statements (no tax returns)' },
      { val:'cash',       label:'❌ Mayormente efectivo / sin docs' }
    ] },
  { id:'dti', bloque:'E · Ingresos',
    pregunta:'¿Qué porcentaje de tu ingreso mensual se va en pagos de deuda (renta/hipoteca + tarjetas + autos)?',
    opciones:[
      { val:'menos_28',  label:'< 28% — saludable' },
      { val:'28_36',     label:'28-36% — aceptable' },
      { val:'37_43',     label:'37-43% — límite' },
      { val:'mas_43',    label:'> 43% — DQM (lender lo verá mal)' }
    ] },

  // ── BLOQUE F · Inmigración / setup ────────────────────
  { id:'inmigracion', bloque:'F · Setup',
    pregunta:'¿Cuál es tu status migratorio?',
    opciones:[
      { val:'ciudadano',  label:'🇺🇸 Ciudadano' },
      { val:'residente',  label:'🟢 Residente permanente (Green Card)' },
      { val:'work_visa',  label:'📄 Visa de trabajo (H1B/L1/E2)' },
      { val:'itin',       label:'🆔 ITIN (sin SSN)' },
      { val:'sin_status', label:'❓ Sin status definido' }
    ] },
  { id:'meta_uso', bloque:'F · Setup',
    pregunta:'¿Para qué necesitás el crédito en los próximos 6 meses?',
    opciones:[
      { val:'hml',         label:'💰 Hard Money Lender para flips' },
      { val:'mortgage',    label:'🏠 Mortgage convencional (Fix & Hold)' },
      { val:'dscr',        label:'📊 DSCR loan (rental)' },
      { val:'heloc',       label:'🏚️ HELOC sobre vivienda' },
      { val:'business',    label:'🏢 Business credit / líneas' },
      { val:'mejorar',     label:'📈 Solo mejorar score (sin meta inmediata)' }
    ] }
];

// ─── Estado del wizard de crédito (independiente del de FM) ───
fmState.credit = fmState.credit || {
  studentId: null,
  studentSearch: '',
  answers: {},
  step: 0,
  result: null,   // {perfil, plan, fico_meta, ...}
  saving: false
};

function fmCreditReset() {
  fmState.credit = { studentId:null, studentSearch:'', answers:{}, step:0, result:null, saving:false };
  fmRender();
}

function fmCreditSelectStudent(studentId) {
  if (!studentId) {
    fmState.credit.studentId = null;
    fmState.credit.answers = {};
    fmState.credit.step = 0;
    fmRender();
    return;
  }
  const s = (eduState.students || []).find(x => x.id === studentId);
  if (!s) return alert('Estudiante no encontrado. Sincronizá Mentorías Manager.');
  fmState.credit.studentId = studentId;
  // Pre-llenar lo que se pueda del estudiante
  const inferred = {};
  // capital del estudiante no es ingreso, pero podemos inferir documentación heurística
  if (s.fico_score) {
    const f = +s.fico_score;
    inferred.fico_exacto = String(f);
    if (f < 580) inferred.fico_band = 'menos_580';
    else if (f < 620) inferred.fico_band = '580_619';
    else if (f < 660) inferred.fico_band = '620_659';
    else if (f < 700) inferred.fico_band = '660_699';
    else if (f < 740) inferred.fico_band = '700_739';
    else if (f < 780) inferred.fico_band = '740_779';
    else inferred.fico_band = 'mas_780';
  }
  fmState.credit.answers = inferred;
  fmState.credit.step = 0;
  fmState.credit.result = null;
  fmRender();
}

function fmCreditSetStudentSearch(v) {
  fmState.credit.studentSearch = v || '';
  fmRender();
  setTimeout(() => { const inp = document.getElementById('fm-credit-student-search'); if (inp) { inp.focus(); inp.setSelectionRange(v.length, v.length); } }, 0);
}

function fmCreditAnswer(qid, val) {
  fmState.credit.answers[qid] = val;
  const active = FM_CREDIT_QUESTIONS;
  const idx = active.findIndex(q => q.id === qid);
  if (idx < active.length - 1) fmState.credit.step = idx + 1;
  else fmState.credit.result = fmCalcularPerfilCredito(fmState.credit.answers);
  fmRender();
}
function fmCreditToggle(qid, val) {
  const cur = Array.isArray(fmState.credit.answers[qid]) ? fmState.credit.answers[qid] : [];
  if (cur.includes(val)) fmState.credit.answers[qid] = cur.filter(v => v !== val);
  else fmState.credit.answers[qid] = [...cur, val];
  fmRender();
}
function fmCreditNext() {
  const active = FM_CREDIT_QUESTIONS;
  if (fmState.credit.step < active.length - 1) fmState.credit.step++;
  else fmState.credit.result = fmCalcularPerfilCredito(fmState.credit.answers);
  fmRender();
}
function fmCreditBack() { if (fmState.credit.step > 0) { fmState.credit.step--; fmRender(); } }
function fmCreditSetField(qid, val) { fmState.credit.answers[qid] = val; }

// ─── Categorización del perfil ───
function fmCalcularPerfilCredito(a) {
  // Tier por FICO
  const band = a.fico_band;
  let tier, ficoMid;
  if (band === 'sin_historial') { tier = 'sin_historial'; ficoMid = 0; }
  else if (band === 'menos_580') { tier = 'reconstruir'; ficoMid = 540; }
  else if (band === '580_619') { tier = 'reconstruir'; ficoMid = 600; }
  else if (band === '620_659') { tier = 'limitado'; ficoMid = 640; }
  else if (band === '660_699') { tier = 'limitado'; ficoMid = 680; }
  else if (band === '700_739') { tier = 'bueno'; ficoMid = 720; }
  else if (band === '740_779') { tier = 'excelente'; ficoMid = 760; }
  else if (band === 'mas_780') { tier = 'excelente'; ficoMid = 790; }
  else { tier = 'limitado'; ficoMid = 650; }
  const ficoExacto = +a.fico_exacto || ficoMid;

  // GAPS detectados
  const gaps = [];
  const strengths = [];

  if (['50_74','mas_75'].includes(a.utilization)) gaps.push({ area:'utilization', gravedad:'alta', label:'Utilization > 50%' });
  else if (a.utilization === '30_49') gaps.push({ area:'utilization', gravedad:'media', label:'Utilization 30-49%' });
  else if (a.utilization === 'menos_10') strengths.push('Utilization óptimo (<10%)');

  if (a.pagos_tarde === 'mas_3') gaps.push({ area:'pagos', gravedad:'alta', label:'4+ pagos tarde 24m' });
  else if (a.pagos_tarde === '2_3') gaps.push({ area:'pagos', gravedad:'alta', label:'2-3 pagos tarde 24m' });
  else if (a.pagos_tarde === '1') gaps.push({ area:'pagos', gravedad:'media', label:'1 pago tarde 24m' });
  else if (a.pagos_tarde === 'cero') strengths.push('0 pagos tarde — pago perfecto');

  const derog = Array.isArray(a.derogatorios) ? a.derogatorios : [];
  if (derog.includes('bankruptcy')) gaps.push({ area:'derogatorios', gravedad:'crítica', label:'Bankruptcy en reporte' });
  if (derog.includes('foreclosure')) gaps.push({ area:'derogatorios', gravedad:'crítica', label:'Foreclosure en reporte' });
  if (derog.includes('collection')) gaps.push({ area:'derogatorios', gravedad:'alta', label:'Cuenta en colección' });
  if (derog.includes('charge_off')) gaps.push({ area:'derogatorios', gravedad:'alta', label:'Charge-off' });
  if (derog.includes('judgment')) gaps.push({ area:'derogatorios', gravedad:'alta', label:'Judgment / lien' });
  if (derog.includes('ninguno')) strengths.push('Sin derogatorios');

  if (['menos_1','1_2'].includes(a.antiguedad)) gaps.push({ area:'historial', gravedad:'media', label:'Historial < 2 años' });
  else if (['6_10','mas_10'].includes(a.antiguedad)) strengths.push('Historial sólido (>6 años)');

  if (a.cuentas_activas === '0') gaps.push({ area:'historial', gravedad:'alta', label:'Cero tarjetas activas' });
  else if (a.cuentas_activas === '1') gaps.push({ area:'historial', gravedad:'media', label:'Solo 1 tarjeta' });
  else if (['2_3','4_6'].includes(a.cuentas_activas)) strengths.push('Mix saludable de tarjetas');

  const mix = Array.isArray(a.mix_credito) ? a.mix_credito : [];
  if (mix.includes('ninguno') || mix.length === 0) gaps.push({ area:'mix', gravedad:'media', label:'Sin mix (solo tarjetas)' });
  else if (mix.length >= 2 && !mix.includes('ninguno')) strengths.push('Mix de tipos de crédito');

  if (a.consultas === 'mas_6') gaps.push({ area:'consultas', gravedad:'media', label:'6+ hard inquiries' });

  if (['cash','bank_only'].includes(a.documentado)) gaps.push({ area:'ingresos', gravedad:'alta', label:'Ingreso no documentable' });
  else if (a.documentado === '1099_1y') gaps.push({ area:'ingresos', gravedad:'media', label:'1099 con <2 años' });
  else if (['w2','1099_2y'].includes(a.documentado)) strengths.push('Ingreso documentable');

  if (a.dti === 'mas_43') gaps.push({ area:'dti', gravedad:'alta', label:'DTI > 43%' });
  else if (a.dti === '37_43') gaps.push({ area:'dti', gravedad:'media', label:'DTI 37-43%' });
  else if (a.dti === 'menos_28') strengths.push('DTI < 28%');

  if (['itin','sin_status'].includes(a.inmigracion)) gaps.push({ area:'inmigracion', gravedad:'media', label:'ITIN / sin SSN — lenders limitados' });

  // Generar plan
  const acciones = fmGenerarPlanCredito(tier, a, gaps);
  const ficoMeta = fmEstimarFicoMeta(ficoExacto, tier, gaps);

  // Texto del tier
  const tierLabel = {
    sin_historial:{ emoji:'🆕', nombre:'Sin historial', color:'slate', resumen:'Construyendo crédito desde cero. Foco: abrir 1-2 secured cards + pagos a tiempo + 6 meses de tradeline.' },
    reconstruir:  { emoji:'🛠️', nombre:'Reconstruir', color:'red',     resumen:'Score bajo con negativos. Plan: limpiar derogatorios + utilization + pagos a tiempo. 6-12 meses al objetivo.' },
    limitado:     { emoji:'⚠️', nombre:'Limitado',    color:'amber',   resumen:'Aprobás algunos productos pero con tasas malas. Plan: bajar utilization + extender historial + mix. 3-6 meses al objetivo.' },
    bueno:        { emoji:'✅', nombre:'Bueno',       color:'blue',    resumen:'Calificás HML estándar y mortgages no-prime. Plan: empujar a >740 para mejores tasas.' },
    excelente:    { emoji:'⭐', nombre:'Excelente',   color:'emerald', resumen:'Top tier. Plan: mantener + abrir líneas de business + maximizar puntos.' }
  }[tier];

  return {
    answers:a, tier, tierLabel, ficoActual:ficoExacto, ficoMeta,
    gaps, strengths, acciones,
    objetivo_90d: fmGenerarObjetivo90d(tier, a, ficoExacto, ficoMeta)
  };
}

function fmGenerarPlanCredito(tier, a, gaps) {
  const acciones = [];
  // Acciones por gap (no inventamos, mapeamos)
  gaps.forEach(g => {
    if (g.area === 'utilization') {
      acciones.push({
        prioridad:'alta', area:'utilization',
        accion:'Bajar utilization a < 10% — pagar balances o pedir aumento de límite',
        meta:'Suma de balances ÷ suma de límites < 10%',
        plazo_dias:30
      });
    }
    if (g.area === 'pagos') {
      acciones.push({
        prioridad:'alta', area:'pagos',
        accion:'Auto-pay del mínimo en TODAS las tarjetas + reminder 5 días antes del due',
        meta:'0 pagos tarde en próximos 6 meses',
        plazo_dias:7
      });
    }
    if (g.area === 'derogatorios') {
      if (g.label.includes('colección')) {
        acciones.push({
          prioridad:'alta', area:'derogatorios',
          accion:'Pay-for-delete: negociar con collection agency pago a cambio de remover del reporte (por escrito ANTES de pagar)',
          meta:'Cuenta removida del reporte',
          plazo_dias:60
        });
      }
      if (g.label.includes('Charge-off')) {
        acciones.push({
          prioridad:'alta', area:'derogatorios',
          accion:'Goodwill letter al acreedor original pidiendo remover charge-off (especialmente si ya pagado)',
          meta:'Charge-off removido o actualizado a "paid"',
          plazo_dias:90
        });
      }
      if (g.label.includes('Bankruptcy') || g.label.includes('Foreclosure')) {
        acciones.push({
          prioridad:'alta', area:'derogatorios',
          accion:'Esperar timing (BK Cap 7 = 10 años, Foreclosure = 7 años) + construir tradeline fuerte mientras tanto. NO disputar, validar accuracy del reporte.',
          meta:'Construir 3+ tradelines positivas durante el período',
          plazo_dias:180
        });
      }
    }
    if (g.area === 'historial' && g.label.includes('Cero')) {
      acciones.push({
        prioridad:'alta', area:'historial',
        accion:'Abrir 2 secured credit cards (Discover Secured + Capital One Secured) — depósito de $200-500 c/u',
        meta:'2 tradelines positivas activas',
        plazo_dias:21
      });
    }
    if (g.area === 'historial' && g.label.includes('1 tarjeta')) {
      acciones.push({
        prioridad:'media', area:'historial',
        accion:'Abrir 2da tarjeta (no-fee) — pedir auto-aumento de límite cada 6 meses sin hard inquiry',
        meta:'2-3 tarjetas activas',
        plazo_dias:30
      });
    }
    if (g.area === 'historial' && g.label.includes('< 2 años')) {
      acciones.push({
        prioridad:'media', area:'historial',
        accion:'Convertirse en authorized user en cuenta vieja de familiar con buen historial (suma su antigüedad a tu reporte)',
        meta:'+5+ años de historial promedio',
        plazo_dias:14
      });
    }
    if (g.area === 'mix') {
      acciones.push({
        prioridad:'baja', area:'mix',
        accion:'Agregar credit-builder loan ($1000 en Self / Credit Strong) — paga $50/mes 18-24m, suma installment al reporte',
        meta:'Mix tarjetas + installment',
        plazo_dias:30
      });
    }
    if (g.area === 'consultas') {
      acciones.push({
        prioridad:'media', area:'consultas',
        accion:'Stop applying — no aplicar a nada nuevo por 6 meses. Las inquiries viejas pesan menos cada mes.',
        meta:'< 3 hard inquiries en últimos 12 meses',
        plazo_dias:180
      });
    }
    if (g.area === 'ingresos') {
      if (g.label.includes('no documentable')) {
        acciones.push({
          prioridad:'alta', area:'ingresos',
          accion:'Empezar a depositar TODO el ingreso en banco + abrir cuenta de business si aplica. Hacer 12-24 meses de bank statements limpios.',
          meta:'12+ meses de bank statements consistentes',
          plazo_dias:365
        });
      }
      if (g.label.includes('<2 años')) {
        acciones.push({
          prioridad:'media', area:'ingresos',
          accion:'Mantener mismo tipo de trabajo/negocio y archivar tax returns cada año a tiempo. CPA-certified income letter ayuda.',
          meta:'Llegar a 2 años de tax returns 1099',
          plazo_dias:365
        });
      }
    }
    if (g.area === 'dti') {
      acciones.push({
        prioridad:'alta', area:'dti',
        accion:'Reducir DTI: refinanciar deuda alta-tasa, consolidar, o pagar deudas pequeñas primero (snowball). Subir ingreso documentado.',
        meta:'DTI < 36%',
        plazo_dias:120
      });
    }
    if (g.area === 'inmigracion') {
      acciones.push({
        prioridad:'media', area:'inmigracion',
        accion:'Tarjetas ITIN-friendly: Capital One, American Express (con SSN/ITIN), Latino Credit Union. Para HML: buscar lenders ITIN-friendly (Kiavi, RCN, ROC360).',
        meta:'2+ productos aprobados con ITIN',
        plazo_dias:60
      });
    }
  });

  // Acción de monitoreo (siempre)
  if (a.monitoring === 'nada') {
    acciones.unshift({
      prioridad:'alta', area:'monitoring',
      accion:'Activar Credit Karma (gratis, VantageScore) + MyFICO (pago, FICO real para lenders). Anotar score base hoy.',
      meta:'Monitoreo activo + score baseline',
      plazo_dias:3
    });
  }

  // Pull annualcreditreport.com (siempre)
  acciones.push({
    prioridad:'alta', area:'docs',
    accion:'Bajar los 3 reportes oficiales en annualcreditreport.com (Equifax, Experian, TransUnion) — gratis 1×/semana',
    meta:'3 reportes en PDF + revisar errores',
    plazo_dias:3
  });

  // Si va por HML, alinear con scoring threshold
  if (a.meta_uso === 'hml') {
    acciones.push({
      prioridad:'media', area:'meta',
      accion:'HMLs típicos requieren FICO 660+. Si estás bajo, buscar HMLs flexibles (RCN, Kiavi, Constructive). Si 700+, pedir mejores tasas.',
      meta:'Calificar HML con tasa <12%',
      plazo_dias:90
    });
  }
  if (a.meta_uso === 'mortgage') {
    acciones.push({
      prioridad:'media', area:'meta',
      accion:'Mortgage convencional pide 620+ (FHA 580+). Empujá a 720+ para evitar PMI y obtener mejor APR.',
      meta:'FICO 720+ antes de aplicar',
      plazo_dias:120
    });
  }
  if (a.meta_uso === 'dscr') {
    acciones.push({
      prioridad:'media', area:'meta',
      accion:'DSCR loan ignora DTI personal pero pide FICO 660+ y reserves. Subir score y juntar 6 meses de reserves.',
      meta:'FICO 680+ + 6m reserves',
      plazo_dias:120
    });
  }
  if (a.meta_uso === 'heloc') {
    acciones.push({
      prioridad:'media', area:'meta',
      accion:'HELOC requiere equity 20%+ + FICO 680+ + DTI <43%. Verificar valor actual de vivienda (Redfin/Zillow) y equity.',
      meta:'Aprobación HELOC con tasa <prime+1%',
      plazo_dias:60
    });
  }

  return acciones;
}

function fmGenerarObjetivo90d(tier, a, ficoActual, ficoMeta) {
  if (tier === 'sin_historial') return `Construir base: 2 secured cards activas + 6 meses de pagos perfectos + 1 credit-builder loan. Score base medible en 6 meses.`;
  if (tier === 'reconstruir') return `Subir FICO de ${ficoActual} → ${ficoMeta}+ en 90 días. Foco: limpiar derogatorios + utilization < 10% + 0 pagos tarde.`;
  if (tier === 'limitado') return `Subir FICO de ${ficoActual} → ${ficoMeta}+ en 90 días. Foco: utilization < 30% + abrir 1 tarjeta más + mix.`;
  if (tier === 'bueno') return `Empujar FICO de ${ficoActual} → ${ficoMeta}+ (740) para mejores tasas. Foco: utilization < 10% + extender historial.`;
  return `Mantener score ${ficoActual}+ y diversificar con business credit. Foco: 0 hard inquiries innecesarias + utilization < 10%.`;
}

function fmEstimarFicoMeta(actual, tier, gaps) {
  // Estimación heurística: cuanto más gaps de alta gravedad, más puntos recuperables
  const altaCount = gaps.filter(g => g.gravedad === 'alta' || g.gravedad === 'crítica').length;
  const mediaCount = gaps.filter(g => g.gravedad === 'media').length;
  if (tier === 'sin_historial') return 660;
  const ganancia = Math.min(120, altaCount * 25 + mediaCount * 8);
  return Math.min(820, actual + ganancia);
}

// ─── Render Tab Crédito ───
function fmRenderCredito() {
  const c = fmState.credit || {};
  if (c.result) return fmRenderCreditoPlan();

  const students = fmGetStudentsForDiag();
  const filter = (c.studentSearch || '').toLowerCase().trim();
  const filtered = filter
    ? students.filter(s => ((s.full_name||'') + ' ' + (s.email||'') + ' ' + (s.current_stage||'')).toLowerCase().includes(filter))
    : students;
  const selStudent = c.studentId ? students.find(s => s.id === c.studentId) : null;

  const total = FM_CREDIT_QUESTIONS.length;
  const step = Math.min(c.step || 0, total - 1);
  const q = FM_CREDIT_QUESTIONS[step];
  const answered = Object.keys(c.answers || {}).filter(k => {
    const v = c.answers[k];
    return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progress = Math.round((answered / total) * 100);
  const bloques = [...new Set(FM_CREDIT_QUESTIONS.map(qq => qq.bloque))];

  return `
    <div class="h-full overflow-y-auto bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div class="max-w-3xl mx-auto px-6 py-8">
        <div class="bg-white rounded-xl border border-emerald-200 p-5 mb-4 shadow-sm">
          <h3 class="font-bold text-slate-900 mb-1">💳 Diagnóstico de Crédito</h3>
          <p class="text-sm text-slate-600">${total} preguntas en 6 bloques. Al final recibís perfil + plan de acción a 90 días con FICO estimado.</p>
        </div>

        <div class="bg-white border border-emerald-300 rounded-xl p-3 mb-4">
          <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div class="text-xs font-bold uppercase text-emerald-800">👤 Diagnóstico para estudiante</div>
            ${selStudent ? `<button onclick="fmCreditSelectStudent(null)" class="text-[10px] text-slate-500 hover:text-red-700">✕ Limpiar</button>` : ''}
          </div>
          ${selStudent ? `
            <div class="bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
              <div class="font-bold text-sm text-slate-900 truncate">${(selStudent.full_name||'').replace(/</g,'&lt;')}</div>
              <div class="text-[11px] text-slate-600">${selStudent.current_stage || 'Sin etapa'} ${selStudent.email ? '· '+selStudent.email : ''}</div>
            </div>
          ` : `
            <div class="text-[11px] text-slate-600 mb-2">Elegí un estudiante para vincular el resultado al CRM (opcional).</div>
            <input id="fm-credit-student-search" type="text" placeholder="🔍 Buscar..." value="${(c.studentSearch||'').replace(/"/g,'&quot;')}"
              oninput="fmCreditSetStudentSearch(this.value)" class="w-full border border-slate-300 rounded px-3 py-1.5 text-xs mb-2"/>
            <div class="max-h-40 overflow-y-auto scrollbar-thin border border-slate-200 rounded">
              ${filtered.length === 0 ? `
                <div class="px-3 py-3 text-center text-[11px] text-slate-500">${students.length === 0 ? 'No hay estudiantes cargados.' : 'Sin resultados'}</div>
              ` : filtered.slice(0, 30).map(s => `
                <button onclick="fmCreditSelectStudent('${s.id}')" class="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-slate-100 last:border-b-0">
                  <div class="font-medium text-xs text-slate-900 truncate">${(s.full_name||'?').replace(/</g,'&lt;')}</div>
                  <div class="text-[10px] text-slate-500 truncate">${s.current_stage || '—'}</div>
                </button>
              `).join('')}
            </div>
          `}
        </div>

        <div class="mb-4 bg-white rounded-xl border border-slate-200 p-3">
          <div class="flex items-center gap-1 overflow-x-auto text-xs">
            ${bloques.map(b => {
              const qs = FM_CREDIT_QUESTIONS.filter(qq => qq.bloque === b);
              const done = qs.filter(qq => {
                const v = c.answers[qq.id];
                return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
              }).length;
              const isActive = b === q.bloque;
              return `<span class="px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${isActive ? 'bg-emerald-500 text-white' : done === qs.length ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">${b} <span class="ml-1 opacity-70">${done}/${qs.length}</span></span>`;
            }).join('')}
          </div>
        </div>

        <div class="mb-4">
          <div class="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Pregunta ${step + 1} de ${total}</span>
            <span>${progress}% completado</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden"><div class="h-full bg-emerald-500 transition-all" style="width:${progress}%"></div></div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div class="text-xs font-bold text-emerald-600 tracking-wider mb-2">${q.bloque} · PREGUNTA ${step + 1}</div>
          <h4 class="text-xl font-bold text-slate-900 mb-5">${q.pregunta}</h4>
          ${fmRenderCreditQuestionInput(q)}
        </div>

        <div class="flex items-center justify-between mt-6">
          <button onclick="fmCreditBack()" ${step === 0 ? 'disabled' : ''} class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30">← Atrás</button>
          ${q.tipo === 'text' || q.tipo === 'number' || q.multiSelect ? `<button onclick="fmCreditNext()" class="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">Siguiente →</button>` : ''}
          <button onclick="fmCreditReset()" class="px-3 py-2 text-xs text-slate-400 hover:text-slate-600">🔄 Reiniciar</button>
        </div>
      </div>
    </div>
  `;
}

function fmRenderCreditQuestionInput(q) {
  const c = fmState.credit;
  if (q.tipo === 'text' || q.tipo === 'number') {
    const val = c.answers[q.id] || '';
    return `<input type="${q.tipo}" value="${String(val).replace(/"/g,'&quot;')}" placeholder="${q.placeholder || ''}"
      oninput="fmCreditSetField('${q.id}', this.value)"
      onkeydown="if(event.key==='Enter'){fmCreditNext();}"
      class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"/>`;
  }
  if (q.multiSelect) {
    const vals = Array.isArray(c.answers[q.id]) ? c.answers[q.id] : [];
    return `<div class="space-y-2">
      ${q.opciones.map(o => {
        const sel = vals.includes(o.val);
        return `<button onclick="fmCreditToggle('${q.id}','${o.val}')" class="w-full text-left px-4 py-3 rounded-lg border-2 transition ${sel?'border-emerald-500 bg-emerald-50 text-emerald-900':'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'}">
          <div class="flex items-center gap-3"><div class="w-5 h-5 rounded border-2 ${sel?'border-emerald-600 bg-emerald-600':'border-slate-300'} flex items-center justify-center flex-shrink-0">${sel?'<span class="text-white text-xs leading-none">✓</span>':''}</div><span class="text-sm">${o.label}</span></div>
        </button>`;
      }).join('')}
    </div>
    <p class="text-xs text-slate-500 mt-3">Podés seleccionar varios. Cuando termines, click "Siguiente →"</p>`;
  }
  return `<div class="space-y-2">
    ${q.opciones.map(o => {
      const sel = c.answers[q.id] === o.val;
      return `<button onclick="fmCreditAnswer('${q.id}','${o.val}')" class="w-full text-left px-4 py-3 rounded-lg border-2 transition ${sel?'border-emerald-500 bg-emerald-50 text-emerald-900':'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'}">
        <div class="flex items-center gap-3"><div class="w-5 h-5 rounded-full border-2 ${sel?'border-emerald-600 bg-emerald-600':'border-slate-300'} flex items-center justify-center flex-shrink-0">${sel?'<div class="w-2 h-2 rounded-full bg-white"></div>':''}</div><span class="text-sm">${o.label}</span></div>
      </button>`;
    }).join('')}
  </div>`;
}

function fmRenderCreditoPlan() {
  const c = fmState.credit;
  const r = c.result;
  const tl = r.tierLabel;
  const colorMap = { slate:'bg-slate-500', red:'bg-red-500', amber:'bg-amber-500', blue:'bg-blue-500', emerald:'bg-emerald-500' };
  const bgColor = colorMap[tl.color] || 'bg-slate-500';
  const altaAcciones = r.acciones.filter(a => a.prioridad === 'alta');
  const mediaAcciones = r.acciones.filter(a => a.prioridad === 'media');
  const bajaAcciones = r.acciones.filter(a => a.prioridad === 'baja');

  const selStudent = c.studentId ? (eduState.students||[]).find(s => s.id === c.studentId) : null;

  return `
    <div class="h-full overflow-y-auto bg-slate-50">
      <div class="${bgColor} text-white">
        <div class="max-w-5xl mx-auto px-8 py-8">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="text-xs font-bold opacity-90 tracking-wider mb-2">DIAGNÓSTICO DE CRÉDITO · PERFIL ${tl.nombre.toUpperCase()}</div>
              <h1 class="text-3xl font-bold mb-2">${tl.emoji} ${tl.nombre}</h1>
              <p class="text-sm opacity-90">${tl.resumen}</p>
            </div>
            <div class="flex flex-col gap-2">
              ${selStudent
                ? `<button onclick="fmCreditSavePlan()" class="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold">💾 Guardar plan para ${(selStudent.full_name||'estudiante').replace(/</g,'&lt;')}</button>`
                : `<button onclick="alert('Seleccioná un estudiante antes de guardar.\\n\\nO podés copiar el plan manualmente.')" class="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-bold cursor-help">💾 (Sin estudiante)</button>`
              }
              <button onclick="fmCreditReset()" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm">🔄 Repetir</button>
            </div>
          </div>
          <div class="mt-6 grid grid-cols-3 gap-3">
            <div class="bg-white/15 rounded-lg p-3"><div class="text-xs opacity-80">FICO actual</div><div class="text-2xl font-bold">${r.ficoActual || '—'}</div></div>
            <div class="bg-white/15 rounded-lg p-3"><div class="text-xs opacity-80">FICO meta (90-180d)</div><div class="text-2xl font-bold">${r.ficoMeta}</div></div>
            <div class="bg-white/15 rounded-lg p-3"><div class="text-xs opacity-80">Gap a recuperar</div><div class="text-2xl font-bold">${r.ficoMeta - (r.ficoActual||0)}pts</div></div>
          </div>
        </div>
      </div>

      <div class="max-w-5xl mx-auto px-8 py-6">
        <!-- Objetivo 90 días -->
        <div class="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 mb-6">
          <div class="text-xs font-bold uppercase text-emerald-700 tracking-wider mb-2">🎯 Objetivo 90 días</div>
          <p class="text-sm text-slate-900 font-medium">${r.objetivo_90d}</p>
        </div>

        <!-- Fortalezas + gaps -->
        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <h3 class="font-bold text-sm text-slate-900 mb-3">✅ Fortalezas (${r.strengths.length})</h3>
            ${r.strengths.length ? r.strengths.map(s => `<div class="text-xs text-emerald-700 mb-1.5">✓ ${s}</div>`).join('') : '<div class="text-xs text-slate-400 italic">Sin fortalezas identificadas todavía.</div>'}
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <h3 class="font-bold text-sm text-slate-900 mb-3">⚠️ Áreas a mejorar (${r.gaps.length})</h3>
            ${r.gaps.length ? r.gaps.map(g => {
              const colors = { 'crítica':'red', 'alta':'red', 'media':'amber', 'baja':'slate' };
              const col = colors[g.gravedad] || 'slate';
              return `<div class="flex items-center gap-2 mb-1.5"><span class="text-[9px] font-bold bg-${col}-100 text-${col}-700 px-1.5 py-0.5 rounded uppercase">${g.gravedad}</span><span class="text-xs text-slate-700">${g.label}</span></div>`;
            }).join('') : '<div class="text-xs text-emerald-700 italic">Sin gaps detectados. Perfil sólido.</div>'}
          </div>
        </div>

        <!-- Plan de acción -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div class="bg-slate-900 text-white px-5 py-3"><h3 class="font-bold">📋 Plan de acción (${r.acciones.length} acciones)</h3></div>
          ${altaAcciones.length ? `
            <div class="px-5 py-4 border-b border-slate-100">
              <div class="text-xs font-bold uppercase text-red-700 mb-2">🔴 Prioridad ALTA — empezar ya</div>
              ${altaAcciones.map(a => fmRenderAccionCredito(a)).join('')}
            </div>` : ''}
          ${mediaAcciones.length ? `
            <div class="px-5 py-4 border-b border-slate-100">
              <div class="text-xs font-bold uppercase text-amber-700 mb-2">🟡 Prioridad MEDIA — siguiente</div>
              ${mediaAcciones.map(a => fmRenderAccionCredito(a)).join('')}
            </div>` : ''}
          ${bajaAcciones.length ? `
            <div class="px-5 py-4">
              <div class="text-xs font-bold uppercase text-slate-500 mb-2">⚪ Prioridad BAJA — cuando termines lo anterior</div>
              ${bajaAcciones.map(a => fmRenderAccionCredito(a)).join('')}
            </div>` : ''}
        </div>

        <div class="text-[10px] text-slate-500 italic">Disclaimer: este diagnóstico es orientativo. Validá con un broker/lender calificado antes de aplicar a productos específicos. FICO real para lenders solo via MyFICO.</div>
      </div>
    </div>
  `;
}

function fmRenderAccionCredito(a) {
  return `<div class="bg-slate-50 rounded p-3 mb-2">
    <div class="font-medium text-sm text-slate-900">${a.accion}</div>
    <div class="text-[11px] text-slate-600 mt-1">🎯 Meta: ${a.meta} · ⏱ ${a.plazo_dias} días</div>
  </div>`;
}

// ─── Guardar el diagnóstico + plan en DB vinculado al estudiante ───
async function fmCreditSavePlan() {
  const c = fmState.credit;
  if (!c.studentId) return alert('Seleccioná un estudiante primero.');
  if (!c.result) return alert('Generá el diagnóstico primero (completá las preguntas).');
  if (c.saving) return;
  c.saving = true;
  fmRender();
  try {
    const student = (eduState.students||[]).find(s => s.id === c.studentId);
    const mid = student?.mentorship_id || eduState.mentorshipId;

    // Archivar previo activo del mismo estudiante
    await sb.from('edu_credit_diagnostics').update({ status:'archived' })
      .eq('student_id', c.studentId).eq('status', 'active');

    const { data: diag, error } = await sb.from('edu_credit_diagnostics').insert({
      student_id: c.studentId,
      mentorship_id: mid,
      answers: c.result.answers,
      perfil: { tier: c.result.tier, tierLabel: c.result.tierLabel, gaps: c.result.gaps, strengths: c.result.strengths },
      plan: { acciones: c.result.acciones, objetivo_90d: c.result.objetivo_90d, fico_meta: c.result.ficoMeta },
      fico_actual: c.result.ficoActual || null,
      fico_meta: c.result.ficoMeta,
      status: 'active',
      created_by: state.user.id
    }).select().single();
    if (error) throw error;

    // Insertar tareas
    const tasks = c.result.acciones.map(a => ({
      diagnostic_id: diag.id, student_id: c.studentId,
      prioridad: a.prioridad, area: a.area,
      accion: a.accion, meta: a.meta, plazo_dias: a.plazo_dias
    }));
    if (tasks.length) await sb.from('edu_credit_plan_tasks').insert(tasks);

    alert(`✅ Diagnóstico crédito guardado para ${student?.full_name || 'estudiante'}\n\nFICO actual: ${c.result.ficoActual || '—'} → meta ${c.result.ficoMeta}\n${tasks.length} acción(es) en el plan\n\nVer en Mentorías Manager.`);
    c.saving = false;
  } catch (e) {
    c.saving = false;
    alert('Error guardando: ' + (e.message || e));
  }
}

// ════════════════════════════════════════════════════════════
// 📊 DASHBOARD DE KPIs (consume las vistas SQL edu-kpis-views.sql)
// ════════════════════════════════════════════════════════════

function eduRenderKpisDashboard(kpis) {
  const r = kpis.resumen || {};
  const pr = kpis.prevResumen || {};
  const cp = kpis.conPlan || {};
  const ap = kpis.avancePlan || {};
  const pd = kpis.primerDeal || {};
  const ren = kpis.renChurn || {};

  const card = (label, value, deltaFn, suffix) => {
    const v = value == null ? '—' : (value + (suffix||''));
    const d = deltaFn ? eduKpiDelta(value, deltaFn) : null;
    return `<div class="bg-white/10 rounded p-2">
      <div class="text-[10px] opacity-80">${label}</div>
      <div class="text-xl font-bold">${v}</div>
      ${d ? `<div class="text-[10px] ${d.cls}">${d.txt} vs mes ant.</div>` : ''}
    </div>`;
  };

  return `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
      ${card('Sesiones del mes', r.sesiones_total, pr.sesiones_total)}
      ${card('% Asistencia', r.pct_asistencia, pr.pct_asistencia, '%')}
      ${card('Asistidas', r.asistidas, pr.asistidas)}
      ${card('No asistidas', r.no_asistidas, pr.no_asistidas)}
      ${card('Reprogramadas', r.reprogramadas, pr.reprogramadas)}
      ${card('Canceladas', r.canceladas, pr.canceladas)}
      ${card('Estudiantes con sesión', r.estudiantes_con_sesion, pr.estudiantes_con_sesion)}
      ${card('Sesiones por estudiante', r.sesiones_promedio_por_estudiante, pr.sesiones_promedio_por_estudiante)}
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
      <div class="bg-white/10 rounded p-2">
        <div class="text-[10px] opacity-80">% Estudiantes con plan</div>
        <div class="text-xl font-bold">${cp.pct_con_plan != null ? cp.pct_con_plan+'%' : '—'}</div>
        <div class="text-[10px] opacity-60">${cp.con_plan_activo||0}/${cp.estudiantes_total||0}</div>
      </div>
      <div class="bg-white/10 rounded p-2">
        <div class="text-[10px] opacity-80">% Avance plan</div>
        <div class="text-xl font-bold">${ap.pct_avance != null ? ap.pct_avance+'%' : '—'}</div>
        <div class="text-[10px] opacity-60">${ap.tareas_completadas||0}/${ap.tareas_total||0} tareas</div>
      </div>
      <div class="bg-white/10 rounded p-2">
        <div class="text-[10px] opacity-80">Inactivos >30d</div>
        <div class="text-xl font-bold ${(kpis.inactivos||[]).length>0?'text-amber-300':''}">${(kpis.inactivos||[]).length}</div>
        <div class="text-[10px] opacity-60">sin sesión asistida</div>
      </div>
      <div class="bg-white/10 rounded p-2">
        <div class="text-[10px] opacity-80">% Cerró primer deal</div>
        <div class="text-xl font-bold">${pd.pct_cerro_deal != null ? pd.pct_cerro_deal+'%' : '—'}</div>
        <div class="text-[10px] opacity-60">${pd.dias_promedio_a_deal ? '~'+pd.dias_promedio_a_deal+'d promedio' : '—'}</div>
      </div>
    </div>
  `;
}

function eduRenderKpiDetalles(kpis) {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- Tiempo por etapa -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold uppercase">⏱ Tiempo promedio en cada etapa</div>
        <div class="p-2">
          ${(kpis.tiempoEtapa||[]).length === 0 ? `<div class="text-xs text-slate-400 italic p-3 text-center">Sin historial todavía. A medida que cambies estudiantes de etapa, se irá llenando.</div>` : `
            <table class="w-full text-xs">
              <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Etapa</th><th class="text-right p-1">Promedio</th><th class="text-right p-1">Mediana</th><th class="text-right p-1">Máx</th><th class="text-right p-1">N</th></tr></thead>
              <tbody>
                ${kpis.tiempoEtapa.map(t => `<tr class="border-t border-slate-100">
                  <td class="p-1 font-medium">${t.stage}</td>
                  <td class="p-1 text-right">${t.promedio_dias||'—'}d</td>
                  <td class="p-1 text-right">${t.mediana_dias||'—'}d</td>
                  <td class="p-1 text-right">${t.max_dias||'—'}d</td>
                  <td class="p-1 text-right text-slate-500">${t.ingresos_a_etapa}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>

      <!-- No-shows por coach -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold uppercase">👤 No-shows por coach (este mes)</div>
        <div class="p-2">
          ${(kpis.noShows||[]).length === 0 ? `<div class="text-xs text-slate-400 italic p-3 text-center">Sin datos del mes.</div>` : `
            <table class="w-full text-xs">
              <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Coach</th><th class="text-right p-1">Asistencias</th><th class="text-right p-1">No-shows</th><th class="text-right p-1">% No-show</th></tr></thead>
              <tbody>
                ${kpis.noShows.map(n => `<tr class="border-t border-slate-100">
                  <td class="p-1 truncate max-w-[180px]">${(n.coach||'?').replace(/</g,'&lt;')}</td>
                  <td class="p-1 text-right text-emerald-700">${n.asistencias}</td>
                  <td class="p-1 text-right text-red-700">${n.no_shows}</td>
                  <td class="p-1 text-right font-bold ${n.pct_noshow>30?'text-red-700':n.pct_noshow>15?'text-amber-700':'text-emerald-700'}">${n.pct_noshow != null ? n.pct_noshow+'%' : '—'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>

      <!-- Top motivos no-asistencia -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold uppercase">🚨 Top motivos no-asistencia</div>
        <div class="p-2">
          ${(kpis.motivos||[]).length === 0 ? `<div class="text-xs text-slate-400 italic p-3 text-center">Sin no-asistencias registradas.</div>` : `
            <ul class="text-xs space-y-1">
              ${kpis.motivos.slice(0,8).map(m => `<li class="flex justify-between p-1 hover:bg-slate-50 rounded">
                <span class="truncate">${(m.motivo||'').replace(/</g,'&lt;')}</span>
                <span class="font-bold text-slate-700 ml-2">${m.conteo}</span>
              </li>`).join('')}
            </ul>
          `}
        </div>
      </div>

      <!-- Estudiantes inactivos >30d -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold uppercase text-red-700">⚠️ Inactivos >30d (top 10)</div>
        <div class="p-2 max-h-64 overflow-y-auto">
          ${(kpis.inactivos||[]).length === 0 ? `<div class="text-xs text-emerald-700 italic p-3 text-center">✅ Todos tuvieron sesión en últimos 30 días.</div>` : `
            <table class="w-full text-xs">
              <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Estudiante</th><th class="text-left p-1">Etapa</th><th class="text-right p-1">Días</th><th></th></tr></thead>
              <tbody>
                ${kpis.inactivos.slice(0,10).map(i => `<tr class="border-t border-slate-100">
                  <td class="p-1 truncate max-w-[140px]"><button onclick="eduShowStudentDetail('${i.student_id}')" class="text-blue-600 hover:underline text-left">${(i.full_name||'?').replace(/</g,'&lt;')}</button></td>
                  <td class="p-1 truncate max-w-[100px] text-slate-600">${i.current_stage||'—'}</td>
                  <td class="p-1 text-right font-bold ${i.dias_inactivo>60?'text-red-700':'text-amber-700'}">${i.dias_inactivo}d</td>
                  <td class="p-1 text-right">${i.email ? `<a href="mailto:${i.email}" class="text-blue-600 text-[10px]">📧</a>` : ''}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    </div>
  `;
}

function eduExportKpisCsv() {
  if (!eduKpisCache.data) return alert('Esperá a que carguen los KPIs.');
  const k = eduKpisCache.data;
  const r = k.resumen || {};
  const pr = k.prevResumen || {};
  const cp = k.conPlan || {};
  const ap = k.avancePlan || {};
  const pd = k.primerDeal || {};
  const lines = [
    'KPI,Valor mes actual,Valor mes anterior',
    `Sesiones del mes,${r.sesiones_total||0},${pr.sesiones_total||0}`,
    `% Asistencia,${r.pct_asistencia||0},${pr.pct_asistencia||0}`,
    `Asistidas,${r.asistidas||0},${pr.asistidas||0}`,
    `No asistidas,${r.no_asistidas||0},${pr.no_asistidas||0}`,
    `Reprogramadas,${r.reprogramadas||0},${pr.reprogramadas||0}`,
    `Canceladas,${r.canceladas||0},${pr.canceladas||0}`,
    `Estudiantes con sesión,${r.estudiantes_con_sesion||0},${pr.estudiantes_con_sesion||0}`,
    `Sesiones por estudiante,${r.sesiones_promedio_por_estudiante||0},${pr.sesiones_promedio_por_estudiante||0}`,
    `% Con plan activo,${cp.pct_con_plan||0},`,
    `% Avance plan promedio,${ap.pct_avance||0},`,
    `Inactivos >30d,${(k.inactivos||[]).length},`,
    `% Cerró primer deal,${pd.pct_cerro_deal||0},`,
    `Días promedio a primer deal,${pd.dias_promedio_a_deal||0},`,
    '',
    'Tiempo por etapa,Promedio días,Mediana,Máx,N',
    ...(k.tiempoEtapa||[]).map(t => `${t.stage},${t.promedio_dias||0},${t.mediana_dias||0},${t.max_dias||0},${t.ingresos_a_etapa}`),
    '',
    'No-shows por coach,Asistencias,No-shows,% No-show',
    ...(k.noShows||[]).map(n => `${(n.coach||'').replace(/,/g,';')},${n.asistencias||0},${n.no_shows||0},${n.pct_noshow||0}`),
    '',
    'Top motivos no-asistencia,Conteo',
    ...(k.motivos||[]).map(m => `${(m.motivo||'').replace(/,/g,';')},${m.conteo}`),
    '',
    'Estudiantes inactivos >30d,Etapa,Días,Email',
    ...(k.inactivos||[]).map(i => `${(i.full_name||'').replace(/,/g,';')},${(i.current_stage||'').replace(/,/g,';')},${i.dias_inactivo},${i.email||''}`)
  ];
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kpis-postventa-${eduState.mentorshipId}-${eduReportMesAnchor()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}

// ════════════════════════════════════════════════════════════
// Plan acción del CRM ↔ Análisis Profundo de Metodología FlipMentoría
// Cierra Mentorías Manager, abre FlipMentoría → tab Diagnóstico
// con el plan guardado reconstruido en fmState.diagResult.
// ════════════════════════════════════════════════════════════
async function eduAbrirAnalisisProfundoFM(studentId) {
  const plan = eduState.studentPlan;
  if (!plan) return alert('Este estudiante no tiene un plan activo todavía. Generá uno primero.');

  // Reconstruir fmState.diagResult desde el plan guardado
  const answers = plan.diagnostico || {};
  if (!answers || Object.keys(answers).length === 0) {
    return alert('El plan guardado no tiene las respuestas del diagnóstico (formato viejo).\n\nRegenerá el plan desde el botón "🔄 Regenerar" para tener el análisis profundo.');
  }

  // Recalcular usando los mismos motores de FM para garantizar consistencia
  let result;
  try {
    if (typeof fmCalcularPerfil === 'function') {
      result = fmCalcularPerfil(answers);
    } else {
      // Fallback: usar el perfil del plan tal cual
      result = plan.perfil || { answers, perfil: { num:1, nombre:'Plan', emoji:'🎯' } };
    }
    result.answers = answers;
  } catch (e) {
    console.error('Recalcular perfil:', e);
    result = plan.perfil || { answers };
    result.answers = answers;
  }

  // Setear estado de FM
  fmState.diagAnswers = answers;
  fmState.diagResult = result;
  fmState.diagStudentId = studentId;
  fmState.activeTab = 'diagnostico';
  fmState.diagStep = (FM_DIAG_QUESTIONS || []).length - 1;
  fmState.diagModo = 'completo';

  // Buscar el sistema 'edu-methodology' y abrirlo
  // Cerrar el modal del Manager
  if (typeof closeModal === 'function') closeModal();

  // Recolectar todos los sistemas conocidos
  const allSystems = (typeof state !== 'undefined' && Array.isArray(state.systems)) ? state.systems
    : (window._allSystems || []);
  let sys = allSystems.find(s => s.type === 'edu-methodology');

  // Si no está en cache, cargar desde DB
  if (!sys) {
    const { data } = await sb.from('systems').select('*').eq('type', 'edu-methodology').limit(1).maybeSingle();
    sys = data;
  }
  if (!sys) {
    alert('No se encontró el sistema "Metodología FlipMentoría" en esta cuenta.\nVerificá que esté habilitado en el área de Educación.');
    return;
  }

  if (typeof openEduMethodologySystem === 'function') {
    await openEduMethodologySystem(sys);
    // Asegurar que el tab quede en diagnostico tras el load
    fmState.activeTab = 'diagnostico';
    fmRender();
  } else {
    alert('Función openEduMethodologySystem no disponible. Refresh la página.');
  }
}

// ════════════════════════════════════════════════════════════
// 📊 INFORME EJECUTIVO PROFUNDO — 5 SECCIONES
// Consume edu_kpi_* v1 + v2 (edu-kpis-views-v2.sql)
// ════════════════════════════════════════════════════════════

function eduRenderInformeProfundo(k) {
  if (!k) return '';
  return `
    <div class="space-y-4 mt-3">
      <!-- Botones export -->
      <div class="flex gap-2 justify-end">
        <button onclick="eduGenerateReportProfundoIA()" class="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-1.5 rounded">🤖 Narrativa con IA</button>
        <button onclick="eduInformePrint()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded">🖨️ Imprimir / PDF</button>
        <button onclick="eduExportKpisCsv()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">📥 CSV</button>
      </div>

      <div id="edu-informe-print">
        ${eduRenderSeccion1Inventario(k)}
        ${eduRenderSeccion2Sesiones(k)}
        ${eduRenderSeccion3Desercion(k)}
        ${eduRenderSeccion4Resultados(k)}
        ${eduRenderSeccion5Calidad(k)}
      </div>
    </div>
  `;
}

// ─── SECCIÓN 1: INVENTARIO DE CARTERA ───
function eduRenderSeccion1Inventario(k) {
  const cs = k.carteraStatus || {};
  const grupos = k.carteraGrupo || [];
  const etapas = k.carteraEtapa || [];
  const antig = k.carteraAntig || [];
  const ap = k.avancePlan || {};

  const total = cs.total || 0;
  const activosTxt = total ? `${Math.round(100*(cs.activos||0)/total)}%` : '—';

  // Cuello de botella: etapas con tiempo > mediana
  const tiempos = k.tiempoEtapa || [];
  const promediosValidos = tiempos.filter(t => t.promedio_dias).map(t => +t.promedio_dias);
  const medianaEtapa = promediosValidos.length ? promediosValidos.sort((a,b)=>a-b)[Math.floor(promediosValidos.length/2)] : 0;
  const cuellosBotella = tiempos.filter(t => t.promedio_dias && +t.promedio_dias > medianaEtapa * 1.3);

  const antigLabels = {
    '01_menos_1_mes': '< 1 mes',
    '02_1_a_3_meses': '1-3 meses',
    '03_3_a_6_meses': '3-6 meses',
    '04_6_a_12_meses': '6-12 meses',
    '05_mas_12_meses': '> 12 meses'
  };

  return `
    <section class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="bg-slate-900 text-white px-4 py-3">
        <h3 class="font-bold text-sm">📋 Sección 1 · Inventario de la cartera</h3>
      </div>
      <div class="p-4 space-y-4">
        <!-- KPIs status -->
        <div class="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div class="bg-slate-100 rounded p-2"><div class="text-[10px] text-slate-600 uppercase font-bold">Total</div><div class="text-2xl font-bold">${cs.total||0}</div></div>
          <div class="bg-emerald-100 rounded p-2"><div class="text-[10px] text-emerald-800 uppercase font-bold">Activos</div><div class="text-2xl font-bold">${cs.activos||0}</div><div class="text-[10px] text-emerald-700">${activosTxt} del total</div></div>
          <div class="bg-amber-100 rounded p-2"><div class="text-[10px] text-amber-800 uppercase font-bold">En riesgo</div><div class="text-2xl font-bold">${cs.en_riesgo||0}</div></div>
          <div class="bg-slate-200 rounded p-2"><div class="text-[10px] text-slate-700 uppercase font-bold">Pausados</div><div class="text-2xl font-bold">${cs.pausados||0}</div></div>
          <div class="bg-blue-100 rounded p-2"><div class="text-[10px] text-blue-800 uppercase font-bold">Graduados</div><div class="text-2xl font-bold">${cs.graduados||0}</div></div>
          <div class="bg-red-100 rounded p-2"><div class="text-[10px] text-red-800 uppercase font-bold">Desertados</div><div class="text-2xl font-bold">${cs.desertados||0}</div></div>
        </div>

        <!-- Por grupo + por etapa lado a lado -->
        <div class="grid md:grid-cols-2 gap-3">
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">Por grupo</div>
            ${grupos.length === 0 ? `<div class="text-xs text-slate-400 italic">Sin grupos definidos en CRM.</div>` : `
              <table class="w-full text-xs">
                <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Grupo</th><th class="text-right p-1">Total</th><th class="text-right p-1">Activos</th></tr></thead>
                <tbody>
                  ${grupos.map(g => `<tr class="border-t border-slate-100"><td class="p-1 font-medium truncate max-w-[200px]">${(g.grupo||'').replace(/</g,'&lt;')}</td><td class="p-1 text-right">${g.estudiantes}</td><td class="p-1 text-right text-emerald-700 font-bold">${g.activos}</td></tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">Por etapa actual</div>
            ${etapas.length === 0 ? `<div class="text-xs text-slate-400 italic">Sin etapas asignadas.</div>` : `
              <table class="w-full text-xs">
                <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Etapa</th><th class="text-right p-1">N</th><th class="text-right p-1">GLscore avg</th></tr></thead>
                <tbody>
                  ${etapas.map(e => `<tr class="border-t border-slate-100"><td class="p-1 font-medium truncate max-w-[200px]">${(e.stage||'').replace(/</g,'&lt;')}</td><td class="p-1 text-right">${e.estudiantes}</td><td class="p-1 text-right text-slate-600">${e.glscore_promedio||'—'}</td></tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>

        <!-- Antigüedad + Avance plan + Cuello botella -->
        <div class="grid md:grid-cols-3 gap-3">
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">Por antigüedad</div>
            ${antig.length === 0 ? `<div class="text-xs text-slate-400 italic">—</div>` : `
              <ul class="text-xs space-y-1">
                ${antig.map(a => {
                  const pct = cs.total ? Math.round(100 * a.estudiantes / cs.total) : 0;
                  return `<li class="flex justify-between"><span>${antigLabels[a.bucket]||a.bucket}</span><span class="font-bold">${a.estudiantes} <span class="text-slate-400">(${pct}%)</span></span></li>`;
                }).join('')}
              </ul>
            `}
          </div>
          <div class="border border-slate-200 rounded p-3 bg-emerald-50">
            <div class="text-xs font-bold uppercase text-emerald-800 mb-2">Avance del programa</div>
            <div class="text-3xl font-bold text-emerald-700">${ap.pct_avance != null ? ap.pct_avance+'%' : '—'}</div>
            <div class="text-[10px] text-emerald-700 mt-1">${ap.tareas_completadas||0} / ${ap.tareas_total||0} tareas</div>
            <div class="text-[10px] text-slate-600 mt-1">${ap.estudiantes_con_plan||0} estudiante(s) con plan activo</div>
          </div>
          <div class="border border-red-200 rounded p-3 bg-red-50">
            <div class="text-xs font-bold uppercase text-red-800 mb-2">⚠️ Cuellos de botella (etapas lentas)</div>
            ${cuellosBotella.length === 0 ? `<div class="text-[11px] text-emerald-700 italic">✓ Sin cuellos de botella detectados.</div>` : `
              <ul class="text-xs space-y-1">
                ${cuellosBotella.slice(0,5).map(c => `<li><strong>${(c.stage||'').replace(/</g,'&lt;')}</strong><div class="text-[10px] text-red-700">${c.promedio_dias} días promedio (mediana global: ${medianaEtapa}d)</div></li>`).join('')}
              </ul>
            `}
          </div>
        </div>
      </div>
    </section>
  `;
}

// ─── SECCIÓN 2: OPERACIÓN DE SESIONES ───
function eduRenderSeccion2Sesiones(k) {
  const r = k.resumen || {};
  const pr = k.prevResumen || {};
  const motSes = k.sesPorMotivo || [];
  const dist = k.distSesiones || {};
  const noShows = k.noShows || [];
  const motivosNo = k.motivos || [];

  const delta = (now, prev) => eduKpiDelta(now, prev);
  const d1 = delta(r.sesiones_total, pr.sesiones_total);
  const d2 = delta(r.pct_asistencia, pr.pct_asistencia);

  return `
    <section class="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4">
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">📞 Sección 2 · Operación de sesiones</h3></div>
      <div class="p-4 space-y-4">
        <!-- KPIs mes vs anterior -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div class="bg-slate-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-slate-600">Total mes</div><div class="text-2xl font-bold">${r.sesiones_total||0}</div>${d1?`<div class="text-[10px] ${d1.cls}">${d1.txt} vs mes ant.</div>`:''}</div>
          <div class="bg-blue-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-blue-800">% Asistencia</div><div class="text-2xl font-bold">${r.pct_asistencia != null ? r.pct_asistencia+'%' : '—'}</div>${d2?`<div class="text-[10px] ${d2.cls}">${d2.txt} vs ant.</div>`:''}</div>
          <div class="bg-amber-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-amber-800">Reprogramó</div><div class="text-2xl font-bold">${r.reprogramadas||0}</div></div>
          <div class="bg-slate-200 rounded p-2"><div class="text-[10px] uppercase font-bold text-slate-700">Canceló</div><div class="text-2xl font-bold">${r.canceladas||0}</div></div>
          <div class="bg-emerald-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-emerald-800">Promedio/estudiante</div><div class="text-2xl font-bold">${r.sesiones_promedio_por_estudiante || 0}</div></div>
        </div>

        <!-- Distribución por motivo + Distribución por estudiante -->
        <div class="grid md:grid-cols-2 gap-3">
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">Distribución por motivo (mes)</div>
            ${motSes.length === 0 ? `<div class="text-xs text-slate-400 italic">Sin datos.</div>` : `
              <table class="w-full text-xs">
                <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Motivo</th><th class="text-right p-1">Total</th><th class="text-right p-1">Asistidas</th><th class="text-right p-1">No asist.</th></tr></thead>
                <tbody>
                  ${motSes.slice(0,10).map(m => `<tr class="border-t border-slate-100"><td class="p-1 truncate max-w-[160px]">${(m.motivo||'').replace(/</g,'&lt;')}</td><td class="p-1 text-right">${m.total}</td><td class="p-1 text-right text-emerald-700">${m.asistidas||0}</td><td class="p-1 text-right text-red-700">${m.no_asistidas||0}</td></tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">Carga por estudiante</div>
            <ul class="text-xs space-y-1">
              <li class="flex justify-between"><span>0 sesiones (inactivos)</span><span class="font-bold ${(dist.con_0||0)>3?'text-red-700':'text-slate-700'}">${dist.con_0||0}</span></li>
              <li class="flex justify-between"><span>1 sesión</span><span class="font-bold">${dist.con_1||0}</span></li>
              <li class="flex justify-between"><span>2 sesiones</span><span class="font-bold text-emerald-700">${dist.con_2||0}</span></li>
              <li class="flex justify-between"><span>3+ sesiones</span><span class="font-bold text-emerald-700">${dist.con_3_o_mas||0}</span></li>
              <li class="border-t border-slate-200 pt-1 mt-1 flex justify-between"><span class="text-slate-500">Promedio</span><span class="font-bold">${dist.promedio||0}</span></li>
            </ul>
          </div>
        </div>

        <!-- No-shows por coach + Top motivos no-asistencia -->
        <div class="grid md:grid-cols-2 gap-3">
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">No-shows por coach</div>
            ${noShows.length === 0 ? `<div class="text-xs text-slate-400 italic">Sin datos.</div>` : `
              <table class="w-full text-xs">
                <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Coach</th><th class="text-right p-1">Asist.</th><th class="text-right p-1">No-shows</th><th class="text-right p-1">%</th></tr></thead>
                <tbody>
                  ${noShows.map(n => `<tr class="border-t border-slate-100"><td class="p-1 truncate max-w-[140px]">${(n.coach||'').replace(/</g,'&lt;')}</td><td class="p-1 text-right text-emerald-700">${n.asistencias||0}</td><td class="p-1 text-right text-red-700">${n.no_shows||0}</td><td class="p-1 text-right font-bold ${n.pct_noshow>30?'text-red-700':n.pct_noshow>15?'text-amber-700':'text-emerald-700'}">${n.pct_noshow!=null?n.pct_noshow+'%':'—'}</td></tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">Top motivos de no-asistencia</div>
            ${motivosNo.length === 0 ? `<div class="text-xs text-emerald-700 italic">✓ Sin no-asistencias registradas.</div>` : `
              <ul class="text-xs space-y-1">
                ${motivosNo.slice(0,8).map(m => `<li class="flex justify-between p-1 hover:bg-slate-50 rounded"><span class="truncate max-w-[220px]">${(m.motivo||'').replace(/</g,'&lt;')}</span><span class="font-bold ml-2">${m.conteo}</span></li>`).join('')}
              </ul>
            `}
          </div>
        </div>
      </div>
    </section>
  `;
}

// ─── SECCIÓN 3: DESERCIÓN Y RETENCIÓN ───
function eduRenderSeccion3Desercion(k) {
  const ren = k.renChurn || {};
  const churns = k.churnsConMotivo || [];
  const cohort = k.retencionCohort || [];
  const inactivos = k.inactivos || [];

  return `
    <section class="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4">
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">🚪 Sección 3 · Deserción y retención</h3></div>
      <div class="p-4 space-y-4">
        <!-- KPIs mes -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div class="bg-red-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-red-800">Churns del mes</div><div class="text-2xl font-bold">${ren.churns||0}</div></div>
          <div class="bg-emerald-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-emerald-800">Renovaciones</div><div class="text-2xl font-bold">${ren.renovaciones||0}</div></div>
          <div class="bg-amber-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-amber-800">Inactivos >30d</div><div class="text-2xl font-bold">${inactivos.length}</div></div>
          <div class="bg-blue-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-blue-800">Activos al cierre</div><div class="text-2xl font-bold">${ren.activos||0}</div></div>
        </div>

        <!-- Churns con motivo -->
        <div class="border border-slate-200 rounded overflow-hidden">
          <div class="bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">📉 Churns del mes (con motivo)</div>
          ${churns.length === 0 ? `<div class="text-xs text-emerald-700 italic p-3">✓ Sin churns este mes.</div>` : `
            <div class="max-h-64 overflow-y-auto">
              <table class="w-full text-xs">
                <thead class="bg-slate-50 sticky top-0"><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Estudiante</th><th class="text-left p-1">Etapa al churn</th><th class="text-right p-1">Días en programa</th><th class="text-left p-1">Último motivo registrado</th></tr></thead>
                <tbody>
                  ${churns.map(c => `<tr class="border-t border-slate-100"><td class="p-1 truncate max-w-[150px]">${(c.full_name||'?').replace(/</g,'&lt;')}</td><td class="p-1 truncate max-w-[120px] text-slate-600">${(c.current_stage||'—').replace(/</g,'&lt;')}</td><td class="p-1 text-right font-bold">${c.dias_en_programa||'—'}d</td><td class="p-1 text-[10px] text-slate-600 italic truncate max-w-[260px]" title="${(c.ultimo_motivo_no_asistencia||'').replace(/"/g,'&quot;')}">${(c.ultimo_motivo_no_asistencia||'(sin motivo)').replace(/</g,'&lt;')}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Retención cohort + Inactivos -->
        <div class="grid md:grid-cols-2 gap-3">
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">Retención por cohort (últimos 6 meses)</div>
            ${cohort.length === 0 ? `<div class="text-xs text-slate-400 italic">—</div>` : `
              <table class="w-full text-xs">
                <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Cohort</th><th class="text-right p-1">N</th><th class="text-right p-1">30d</th><th class="text-right p-1">60d</th><th class="text-right p-1">90d</th><th class="text-right p-1">% 90d</th></tr></thead>
                <tbody>
                  ${cohort.map(c => {
                    const mesL = new Date(c.cohort_mes).toLocaleDateString('es', {month:'short', year:'2-digit'});
                    return `<tr class="border-t border-slate-100"><td class="p-1 font-medium">${mesL}</td><td class="p-1 text-right">${c.inscritos}</td><td class="p-1 text-right">${c.a_30d}</td><td class="p-1 text-right">${c.a_60d}</td><td class="p-1 text-right">${c.a_90d}</td><td class="p-1 text-right font-bold ${c.ret_90d_pct>=70?'text-emerald-700':c.ret_90d_pct>=50?'text-amber-700':'text-red-700'}">${c.ret_90d_pct!=null?c.ret_90d_pct+'%':'—'}</td></tr>`;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
          <div class="border border-red-200 rounded p-3 bg-red-50">
            <div class="text-xs font-bold uppercase text-red-800 mb-2">⚠️ Estudiantes en riesgo (top 10)</div>
            ${inactivos.length === 0 ? `<div class="text-xs text-emerald-700 italic">✓ Todos tuvieron sesión en últimos 30d.</div>` : `
              <ul class="text-xs space-y-1 max-h-48 overflow-y-auto">
                ${inactivos.slice(0,10).map(i => `<li class="flex items-center justify-between bg-white border border-red-200 rounded px-2 py-1"><span class="truncate flex-1 min-w-0"><button onclick="eduShowStudentDetail('${i.student_id}')" class="font-medium hover:underline text-left">${(i.full_name||'?').replace(/</g,'&lt;')}</button><span class="text-[10px] text-slate-500 block">${(i.current_stage||'—').replace(/</g,'&lt;')}</span></span><span class="font-bold ml-2 ${i.dias_inactivo>60?'text-red-700':'text-amber-700'}">${i.dias_inactivo}d</span></li>`).join('')}
              </ul>
            `}
          </div>
        </div>
      </div>
    </section>
  `;
}

// ─── SECCIÓN 4: RESULTADOS DE NEGOCIO ───
function eduRenderSeccion4Resultados(k) {
  const pd = k.primerDeal || {};
  const top = k.topDeals || [];
  const nps = k.nps || {};

  const valorTotal = top.reduce((s,t) => s + (+t.first_deal_value || 0), 0);

  return `
    <section class="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4">
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">🎯 Sección 4 · Resultados de negocio</h3></div>
      <div class="p-4 space-y-4">
        <!-- KPIs -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div class="bg-emerald-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-emerald-800">% Cerró 1er deal</div><div class="text-2xl font-bold">${pd.pct_cerro_deal != null ? pd.pct_cerro_deal+'%' : '—'}</div></div>
          <div class="bg-blue-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-blue-800">Días promedio a deal</div><div class="text-2xl font-bold">${pd.dias_promedio_a_deal||'—'}</div></div>
          <div class="bg-amber-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-amber-800">Total deals cerrados</div><div class="text-2xl font-bold">${pd.cerraron_primer_deal||0}</div></div>
          <div class="bg-violet-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-violet-800">Valor acumulado</div><div class="text-2xl font-bold">$${(valorTotal/1000).toFixed(0)}K</div></div>
          <div class="bg-slate-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-slate-700">NPS</div><div class="text-2xl font-bold ${nps.nps_net_score>=50?'text-emerald-700':nps.nps_net_score>=0?'text-amber-700':'text-red-700'}">${nps.nps_net_score!=null?nps.nps_net_score:'—'}</div><div class="text-[10px] text-slate-600">${nps.respuestas||0} resp.</div></div>
        </div>

        <!-- Top deals + NPS breakdown -->
        <div class="grid md:grid-cols-2 gap-3">
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">🏆 Top deals cerrados</div>
            ${top.length === 0 ? `<div class="text-xs text-slate-400 italic">Sin deals cerrados todavía. Llená first_deal_at en CRM.</div>` : `
              <table class="w-full text-xs">
                <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Estudiante</th><th class="text-left p-1">Tipo</th><th class="text-right p-1">Valor</th><th class="text-right p-1">Días</th></tr></thead>
                <tbody>
                  ${top.map(t => `<tr class="border-t border-slate-100"><td class="p-1 truncate max-w-[140px]"><button onclick="eduShowStudentDetail('${t.student_id}')" class="hover:underline text-left">${(t.full_name||'?').replace(/</g,'&lt;')}</button></td><td class="p-1 text-slate-600">${(t.first_deal_type||'—').replace(/</g,'&lt;')}</td><td class="p-1 text-right font-bold">${t.first_deal_value ? '$'+(+t.first_deal_value).toLocaleString() : '—'}</td><td class="p-1 text-right text-slate-600">${t.dias_a_deal||'—'}d</td></tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">📊 NPS breakdown</div>
            ${(nps.respuestas||0) === 0 ? `<div class="text-xs text-slate-400 italic">Sin respuestas NPS. Capturalo en encuesta post-sesión.</div>` : `
              <ul class="text-xs space-y-2">
                <li class="flex items-center gap-2"><span class="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">PROMOTORES</span><span class="font-bold">${nps.promotores||0}</span> <span class="text-slate-500">(9-10)</span></li>
                <li class="flex items-center gap-2"><span class="bg-amber-400 text-white px-2 py-0.5 rounded text-[10px] font-bold">PASIVOS</span><span class="font-bold">${nps.pasivos||0}</span> <span class="text-slate-500">(7-8)</span></li>
                <li class="flex items-center gap-2"><span class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">DETRACTORES</span><span class="font-bold">${nps.detractores||0}</span> <span class="text-slate-500">(0-6)</span></li>
                <li class="border-t border-slate-200 pt-2 mt-2 text-[11px]"><strong>NPS Net Score:</strong> ${nps.nps_net_score} (promedio ${nps.nps_promedio})</li>
              </ul>
            `}
          </div>
        </div>
      </div>
    </section>
  `;
}

// ─── SECCIÓN 5: CALIDAD PEDAGÓGICA ───
function eduRenderSeccion5Calidad(k) {
  const tareas = k.tareasBloque || [];
  const creditos = k.creditosDiag || [];
  const coaches = k.coachesAct || [];

  // Bloques con bajo completion vs alto
  const bajos = tareas.slice(0, 5);
  const altos = [...tareas].sort((a,b) => (+b.pct_completado||0) - (+a.pct_completado||0)).slice(0, 5);

  // Aggregar créditos por tier
  const tiers = {};
  creditos.forEach(c => { tiers[c.tier] = (tiers[c.tier]||0) + (+c.cantidad||0); });
  const tierLabels = { sin_historial:'🆕 Sin historial', reconstruir:'🛠️ Reconstruir', limitado:'⚠️ Limitado', bueno:'✅ Bueno', excelente:'⭐ Excelente' };

  return `
    <section class="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4">
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">📚 Sección 5 · Calidad pedagógica</h3></div>
      <div class="p-4 space-y-4">
        <!-- Bloques que tranquean vs que avanzan -->
        <div class="grid md:grid-cols-2 gap-3">
          <div class="border border-red-200 rounded p-3 bg-red-50">
            <div class="text-xs font-bold uppercase text-red-800 mb-2">🐌 Bloques que tranquean (menos completados)</div>
            ${bajos.length === 0 ? `<div class="text-xs text-slate-400 italic">—</div>` : `
              <ul class="text-xs space-y-2">
                ${bajos.map(b => `<li><div class="font-medium">${(b.bloque_subetapa||b.bloque_id||'?').replace(/</g,'&lt;')}</div><div class="text-[10px] text-slate-600">${(b.bloque_etapa||'').replace(/</g,'&lt;')} · ${b.completadas||0}/${b.tareas_totales||0} (<span class="font-bold text-red-700">${b.pct_completado||0}%</span>)</div></li>`).join('')}
              </ul>
            `}
          </div>
          <div class="border border-emerald-200 rounded p-3 bg-emerald-50">
            <div class="text-xs font-bold uppercase text-emerald-800 mb-2">🚀 Bloques que avanzan (más completados)</div>
            ${altos.length === 0 ? `<div class="text-xs text-slate-400 italic">—</div>` : `
              <ul class="text-xs space-y-2">
                ${altos.map(b => `<li><div class="font-medium">${(b.bloque_subetapa||b.bloque_id||'?').replace(/</g,'&lt;')}</div><div class="text-[10px] text-slate-600">${(b.bloque_etapa||'').replace(/</g,'&lt;')} · ${b.completadas||0}/${b.tareas_totales||0} (<span class="font-bold text-emerald-700">${b.pct_completado||0}%</span>)</div></li>`).join('')}
              </ul>
            `}
          </div>
        </div>

        <!-- Diagnósticos de crédito + Coaches activos -->
        <div class="grid md:grid-cols-2 gap-3">
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">💳 Diagnósticos crédito por perfil</div>
            ${Object.keys(tiers).length === 0 ? `<div class="text-xs text-slate-400 italic">Sin diagnósticos generados.</div>` : `
              <ul class="text-xs space-y-1">
                ${Object.entries(tiers).sort((a,b)=>b[1]-a[1]).map(([tier,n]) => `<li class="flex justify-between"><span>${tierLabels[tier]||tier}</span><span class="font-bold">${n}</span></li>`).join('')}
              </ul>
            `}
          </div>
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">👤 Coaches activos (este mes)</div>
            ${coaches.length === 0 ? `<div class="text-xs text-slate-400 italic">Sin datos.</div>` : `
              <table class="w-full text-xs">
                <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Coach</th><th class="text-right p-1">Agendadas</th><th class="text-right p-1">Atendidas</th></tr></thead>
                <tbody>
                  ${coaches.map(c => `<tr class="border-t border-slate-100"><td class="p-1 truncate max-w-[180px]">${(c.coach||'').replace(/</g,'&lt;')}</td><td class="p-1 text-right">${c.sesiones_agendadas||0}</td><td class="p-1 text-right text-emerald-700 font-bold">${c.sesiones_atendidas||0}</td></tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    </section>
  `;
}

// ─── Print / PDF ───
function eduInformePrint() {
  const el = document.getElementById('edu-informe-print');
  if (!el) return alert('No hay informe para imprimir.');
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html><html><head><title>Informe Ejecutivo</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>@media print {.no-print{display:none!important;} body{margin:1cm;}}</style>
    </head><body class="p-4 bg-white">${el.outerHTML}
    <script>setTimeout(()=>window.print(), 500);<\/script>
    </body></html>
  `);
  win.document.close();
}

// ─── IA narrativa: usa los KPIs cargados ───
async function eduGenerateReportProfundoIA() {
  const k = eduKpisCache.data;
  if (!k) return alert('Esperá a que carguen los KPIs.');
  const cur = eduCurrentMentorship();
  if (!cur) return alert('Sin mentoría seleccionada.');

  const aiKey = `edu-report-profundo-${eduState.mentorshipId}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { loading: true };
  eduRenderReportsStandalone();

  try {
    const snapshot = {
      mes: eduReportMesAnchor(),
      mentoria: cur.name,
      cartera_status: k.carteraStatus,
      por_grupo: (k.carteraGrupo||[]).slice(0, 10),
      por_etapa: (k.carteraEtapa||[]).slice(0, 10),
      por_antiguedad: k.carteraAntig,
      cuellos_botella_tiempo: (k.tiempoEtapa||[]).filter(t => t.promedio_dias > 30).slice(0, 5),
      sesiones_resumen: k.resumen,
      sesiones_motivo: (k.sesPorMotivo||[]).slice(0, 8),
      distribucion_sesiones: k.distSesiones,
      no_shows_coach: (k.noShows||[]).slice(0, 5),
      motivos_no_asistencia: (k.motivos||[]).slice(0, 8),
      churns: (k.churnsConMotivo||[]).slice(0, 10),
      retencion_cohort: (k.retencionCohort||[]).slice(0, 4),
      inactivos_30d_count: (k.inactivos||[]).length,
      top_deals: (k.topDeals||[]).slice(0, 5),
      nps: k.nps,
      bloques_que_tranquean: (k.tareasBloque||[]).slice(0, 5),
      avance_plan: k.avancePlan,
      coaches: (k.coachesAct||[]).slice(0, 5)
    };

    const { data, error } = await sb.functions.invoke('ai-deep-analyze', {
      body: { system: 'edu-report-profundo', context: snapshot, force: true }
    });
    if (error) throw new Error(error.message || JSON.stringify(error));
    if (!data || data.error) throw new Error((data && data.error) || 'IA devolvió vacío');

    window.aiState[aiKey] = { loading: false, narrativa: data };
  } catch (e) {
    window.aiState[aiKey] = { loading: false, error: e.message };
  }
  eduRenderReportsStandalone();
}
