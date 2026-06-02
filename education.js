// ============================================================
// EDUCACIÓN — Gestor de Mentorías (Flipping / Rental Profits / Wholesale)
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
  loading: false
};

const EDU_TABS = [
  { key: 'students',  label: '👥 Estudiantes' },
  { key: 'plan',      label: '🎯 Plan IA' },
  { key: 'progress',  label: '📊 Progreso & GLScore' },
  { key: 'resources', label: '📑 Recursos' },
  { key: 'calls',     label: '📅 Calendario' },
  { key: 'alerts',    label: '🔔 Alertas' },
  { key: 'config',    label: '⚙️ Config' }
];
// NOTA: Presentaciones e Informes son sistemas INDEPENDIENTES ahora
// (openEduPresentationsSystem y openEduReportsSystem abren modales propios)

async function openEduManager(sys) {
  eduState.sys = sys;
  // CRÍTICO: reset del tab a uno válido del Manager (no quedar en marker de otro sistema)
  if (!EDU_TABS.find(t => t.key === eduState.tab)) {
    eduState.tab = 'students';
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
    const [mRes, sRes, rRes, aRes, cRes, repRes, tRes, presRes] = await Promise.all([
      sb.from('edu_mentorships').select('*').order('position'),
      sb.from('edu_students').select('*').order('updated_at', { ascending: false }),
      sb.from('edu_resources').select('*').order('updated_at', { ascending: false }),
      sb.from('edu_alerts').select('*').is('resolved_at', null).order('triggered_at', { ascending: false }),
      sb.from('edu_student_calls').select('*').order('scheduled_at', { ascending: false }).limit(200),
      sb.from('edu_reports').select('*').order('period_start', { ascending: false }).limit(50).then(r => r).catch(() => ({ data: [] })),
      sb.from('edu_student_tasks').select('*').order('created_at', { ascending: false }).limit(500).then(r => r).catch(() => ({ data: [] })),
      sb.from('edu_presentations').select('*').order('updated_at', { ascending: false }).limit(50).then(r => r).catch(() => ({ data: [] }))
    ]);
    eduState.mentorships = mRes.data || [];
    eduState.students = sRes.data || [];
    eduState.resources = rRes.data || [];
    eduState.alerts = aRes.data || [];
    eduState.calls = cRes.data || [];
    eduState.reports = repRes.data || [];
    eduState.tasks = tRes.data || [];
    eduState.presentations = presRes.data || [];
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
        ${eduState.tab === 'students' ? eduRenderStudents() :
          eduState.tab === 'plan' ? eduRenderPlan() :
          eduState.tab === 'progress' ? eduRenderProgress() :
          eduState.tab === 'resources' ? eduRenderResources() :
          eduState.tab === 'calls' ? eduRenderCalls() :
          eduState.tab === 'alerts' ? eduRenderAlerts() :
          eduRenderConfig()}
      </div>
    </div>
  `;
}

// ─── TAB: ESTUDIANTES ───
function eduRenderStudents() {
  const students = eduMyStudents();
  const m = eduCurrentMentorship();
  const search = (eduState.searchQuery||'').toLowerCase();

  let filtered = students;
  if (search) filtered = filtered.filter(s => ((s.full_name||'') + ' ' + (s.email||'') + ' ' + (s.city||'')).toLowerCase().includes(search));
  if (eduState.stageFilter !== 'all') filtered = filtered.filter(s => s.current_stage === eduState.stageFilter);
  if (eduState.statusFilter !== 'all') filtered = filtered.filter(s => s.status === eduState.statusFilter);

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
        <input type="text" placeholder="Buscar nombre/email/ciudad..." value="${(eduState.searchQuery||'').replace(/"/g,'&quot;')}" onchange="eduState.searchQuery=this.value; eduRender()" class="border border-slate-300 rounded px-2 py-1 text-xs flex-1 min-w-[200px]" />
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

      <!-- Lista de estudiantes -->
      ${filtered.length === 0 ? `<div class="text-center py-12 text-slate-400 text-xs">Sin estudiantes con esos filtros.</div>` : `
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr class="text-[10px] uppercase text-slate-600">
                <th class="text-left p-2">Estudiante</th>
                <th class="text-left p-2">Etapa</th>
                <th class="text-center p-2">Días</th>
                <th class="text-left p-2">Status</th>
                <th class="text-center p-2">GLScore</th>
                <th class="text-left p-2">Vence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => {
                const daysInStage = eduDaysInStage(s);
                const stage = eduStageObj(s.current_stage);
                const overdue = eduIsStageOverdue(s);
                const daysExp = eduDaysToExpiry(s);
                const expCls = daysExp == null ? 'text-slate-400' : daysExp < 0 ? 'text-red-700 font-bold' : daysExp <= 30 ? 'text-amber-700 font-bold' : 'text-slate-700';
                const expLbl = daysExp == null ? '—' : daysExp < 0 ? `Vencida ${Math.abs(daysExp)}d` : `${daysExp}d`;
                const stCls = s.status === 'at_risk' ? 'bg-amber-100 text-amber-800' : s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : s.status === 'graduated' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700';
                return `<tr class="border-t border-slate-100 hover:bg-slate-50">
                  <td class="p-2"><div class="font-semibold">${s.full_name}</div><div class="text-[10px] text-slate-500">${s.email||''}${s.city?' · '+s.city:''}</div></td>
                  <td class="p-2"><span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">${stage?.name || s.current_stage || '—'}</span></td>
                  <td class="p-2 text-center ${overdue?'text-red-700 font-bold':'text-slate-600'}">${daysInStage != null ? daysInStage+'d' : '—'}${overdue?' 🐢':''}</td>
                  <td class="p-2"><span class="text-[10px] ${stCls} px-1.5 py-0.5 rounded font-bold">${s.status}</span></td>
                  <td class="p-2 text-center">
                    <div class="text-sm font-bold ${s.glscore>=70?'text-emerald-700':s.glscore>=40?'text-amber-700':'text-red-700'}">${s.glscore||50}</div>
                    <div class="bg-slate-100 rounded-full h-1 w-12 mx-auto"><div class="${s.glscore>=70?'bg-emerald-500':s.glscore>=40?'bg-amber-500':'bg-red-500'} h-1 rounded-full" style="width:${s.glscore||50}%"></div></div>
                  </td>
                  <td class="p-2 ${expCls}">${expLbl}</td>
                  <td class="p-2"><button onclick="eduOpenStudent('${s.id}')" class="text-blue-600 text-[10px] hover:underline">ver detalle</button></td>
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
function eduOpenStudent(id) {
  eduState.selectedStudentId = id;
  eduState.tab = 'plan';
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
            <input id="edu-pres-title" placeholder="Ej. Clase 1 — Qué es Wholesale y cómo funciona" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />
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
          <textarea id="edu-pres-topic" rows="2" placeholder="Ej. Wholesale en Texas: cómo encontrar deals off-market, contratos, asignación. Foco en Austin/Houston mercado 2026, números reales de margins, lista de cash buyers comunes." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"></textarea>
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

        <div class="flex items-center gap-3 mt-3 pt-3 border-t border-violet-200">
          <label class="flex items-center gap-2 text-xs">
            <input type="checkbox" id="edu-pres-live" checked />
            <span><strong>🌐 Web search live</strong> — datos verificables en vivo</span>
          </label>
          <button onclick="withLoading(this, eduGeneratePresentation)" class="ml-auto bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold px-5 py-2 rounded">🤖 Generar con IA</button>
        </div>
        <div class="text-[10px] text-violet-700 mt-2 italic">⚡ Tarda ~30-90 seg. Claude hace hasta 8 web searches en vivo según el dominio elegido. Cita cada dato con fuente y fecha.</div>
      </div>

      ${ai.loading ? `
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-4 text-center">
          <div class="text-3xl animate-pulse">🧠</div>
          <div class="mt-2 font-bold text-violet-900">Claude analizando + buscando data live...</div>
          <div class="text-[10px] text-violet-700 mt-1">Web searches en progreso. Esto puede tardar 60-90 segundos.</div>
        </div>
      ` : ''}
      ${ai.error ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900">⚠️ ${ai.error}</div>` : ''}

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
  const title = document.getElementById('edu-pres-title')?.value.trim();
  const topic = document.getElementById('edu-pres-topic')?.value.trim();
  if (!title || !topic) return alert('Título y tema son obligatorios');
  const m = eduCurrentMentorship();
  const aiKey = `edu-pres-${eduState.mentorshipId}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { loading: true };
  eduRender();
  try {
    const payload = {
      mentorship_id: m?.id,
      title,
      topic,
      audience: document.getElementById('edu-pres-audience').value || undefined,
      presentation_type: document.getElementById('edu-pres-type').value,
      class_number: +document.getElementById('edu-pres-class-number').value || null,
      duration_min: +document.getElementById('edu-pres-duration').value || 60,
      slides_count: +document.getElementById('edu-pres-slides').value || 15,
      language: document.getElementById('edu-pres-lang').value,
      outline_hint: document.getElementById('edu-pres-outline').value || null,
      domain: document.getElementById('edu-pres-domain')?.value || 'real-estate',
      geographic_focus: document.getElementById('edu-pres-geo')?.value || null,
      preferred_sources: document.getElementById('edu-pres-sources')?.value || null,
      require_live_data: document.getElementById('edu-pres-live').checked,
      user_id: state.user.id
    };
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/generate-presentation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
      body: JSON.stringify(payload)
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'falló');
    window.aiState[aiKey] = { loading: false, presentation: r.presentation, saved_id: r.saved_id, web_searches: r.web_searches, tokens: r.tokens };
    await eduLoadAll();
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

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
  pres.title = p.title;
  pres.company = 'Empresa OS';

  // Define master con branding
  pres.defineSlideMaster({
    title: 'MASTER',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 7.0, w: 13.333, h: 0.5, fill: { color: '0F172A' } } },
      { text: { text: 'Empresa OS · Educación', options: { x: 0.4, y: 7.05, w: 5, h: 0.4, color: 'FFFFFF', fontSize: 10 } } }
    ],
    slideNumber: { x: 12.5, y: 7.1, color: 'FFFFFF', fontSize: 10 }
  });

  (p.slides || []).forEach((s, idx) => {
    const slide = pres.addSlide({ masterName: 'MASTER' });

    // PORTADA (slide 1 con layout 'title')
    if (s.layout === 'title' || idx === 0) {
      slide.background = { color: '0F172A' };
      slide.addText(s.title || p.title, { x: 0.5, y: 2.5, w: 12.3, h: 1.5, fontSize: 44, bold: true, color: 'FFFFFF', align: 'center' });
      if (s.subtitle) slide.addText(s.subtitle, { x: 0.5, y: 4.2, w: 12.3, h: 0.6, fontSize: 22, color: '94A3B8', align: 'center' });
      slide.addText(`${new Date().toLocaleDateString('es-MX', {year:'numeric',month:'long',day:'numeric'})}`, { x: 0.5, y: 5.5, w: 12.3, h: 0.4, fontSize: 14, color: '64748B', align: 'center' });
      return;
    }

    // CONTENT slides
    slide.addText(s.title || `Slide ${s.number}`, { x: 0.5, y: 0.4, w: 12.3, h: 0.7, fontSize: 28, bold: true, color: '0F172A' });
    if (s.subtitle) slide.addText(s.subtitle, { x: 0.5, y: 1.05, w: 12.3, h: 0.4, fontSize: 16, color: '475569', italic: true });

    let yOffset = s.subtitle ? 1.7 : 1.4;

    // BULLETS
    if ((s.bullets || []).length) {
      const bulletText = s.bullets.map(b => ({ text: b, options: { bullet: true, fontSize: 18, color: '1E293B' } }));
      slide.addText(bulletText, { x: 0.7, y: yOffset, w: 12, h: 4.5 });
      yOffset += Math.max(s.bullets.length * 0.5, 2);
    }

    // STATS
    if ((s.stats || []).length) {
      const startY = yOffset;
      const cols = Math.min(s.stats.length, 3);
      const cardW = 12 / cols;
      s.stats.forEach((st, i) => {
        const x = 0.7 + (i % cols) * cardW;
        const y = startY + Math.floor(i / cols) * 1.3;
        slide.addShape('rect', { x, y, w: cardW - 0.15, h: 1.1, fill: { color: 'DBEAFE' }, line: { color: '93C5FD', width: 1 } });
        slide.addText(st.value, { x: x + 0.1, y: y + 0.1, w: cardW - 0.35, h: 0.5, fontSize: 24, bold: true, color: '1E3A8A' });
        slide.addText(st.label, { x: x + 0.1, y: y + 0.55, w: cardW - 0.35, h: 0.3, fontSize: 11, color: '1E40AF' });
        if (st.source_name) slide.addText(`📍 ${st.source_name}`, { x: x + 0.1, y: y + 0.85, w: cardW - 0.35, h: 0.2, fontSize: 8, color: '64748B', italic: true });
      });
    }

    // Speaker notes
    if (s.speaker_notes) {
      slide.addNotes(s.speaker_notes + (s.sources?.length ? '\n\nFuentes: ' + s.sources.map(src => src.title + ' (' + src.url + ')').join('; ') : ''));
    }

    // SOURCES strip al pie
    if ((s.sources || []).length) {
      const sources = s.sources.map(src => src.title || src.url).slice(0, 3).join(' · ');
      slide.addText(`Fuentes: ${sources}`, { x: 0.5, y: 6.5, w: 12.3, h: 0.4, fontSize: 9, color: '64748B', italic: true });
    }
  });

  // Slide de cierre con todas las fuentes
  if ((p.all_sources || []).length) {
    const slide = pres.addSlide({ masterName: 'MASTER' });
    slide.addText('📚 Fuentes citadas', { x: 0.5, y: 0.4, w: 12.3, h: 0.7, fontSize: 28, bold: true, color: '0F172A' });
    const srcText = p.all_sources.slice(0, 25).map((src, i) => ({
      text: `${i+1}. ${src.title || src.url}`,
      options: { fontSize: 11, color: '1E40AF', breakLine: true }
    }));
    slide.addText(srcText, { x: 0.7, y: 1.3, w: 12, h: 5.5 });
  }

  const safeName = (p.title || 'presentacion').replace(/[^a-z0-9]/gi, '_').slice(0, 50);
  pres.writeFile({ fileName: `${new Date().toISOString().split('T')[0]}_${safeName}.pptx` });
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

function eduRenderReportsStandalone() {
  const root = document.getElementById('edu-root');
  if (!root) return;
  const cur = eduCurrentMentorship();
  const reports = (eduState.reports || []).filter(r => r.mentorship_id === eduState.mentorshipId);
  const aiKey = `edu-report-${eduState.mentorshipId}-${eduState._reportPeriod || 'weekly'}`;
  const ai = (window.aiState && window.aiState[aiKey]) || {};

  const today = new Date();
  const period = eduState._reportPeriod || 'weekly';
  const periodDays = period === 'weekly' ? 7 : period === 'biweekly' ? 14 : 30;
  const periodStart = new Date(today); periodStart.setDate(periodStart.getDate() - periodDays);

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
        <!-- Form de generación -->
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 rounded-xl p-4">
          <div class="text-xs font-bold uppercase text-violet-900 mb-3">📈 Generar informe ejecutivo con IA</div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-600 mb-1">Período</label>
              <select onchange="eduState._reportPeriod=this.value; eduRenderReportsStandalone()" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                <option value="weekly" ${period==='weekly'?'selected':''}>📅 Semanal (últimos 7 días)</option>
                <option value="biweekly" ${period==='biweekly'?'selected':''}>📆 Quincenal (últimos 14 días)</option>
                <option value="monthly" ${period==='monthly'?'selected':''}>🗓 Mensual (últimos 30 días)</option>
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
            <textarea id="edu-rep-classes" rows="4" placeholder="Pega un resumen de las clases dadas en el período: temas cubiertos, dudas frecuentes, casos discutidos. Claude lo incluye en el análisis pedagógico." class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
          </div>

          <button onclick="withLoading(this, eduGenerateReport)" class="mt-3 w-full bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold py-2.5 rounded">🤖 Generar informe con IA</button>
          <div class="text-[10px] text-violet-700 mt-2 italic">⚡ Tarda ~20-40 seg. Claude analiza estudiantes + cartera + progreso + tus notas de clase.</div>
        </div>

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
