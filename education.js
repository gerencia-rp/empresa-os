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
      research_mode: document.getElementById('edu-pres-research')?.checked || false,
      user_id: state.user.id
    };
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/generate-presentation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
      body: JSON.stringify(payload)
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'falló');

    // Pattern async: job_id devuelto → polling cada 5s hasta done/error
    if (r.async && r.job_id) {
      window.aiState[aiKey] = { loading: true, job_id: r.job_id, status: 'running', started_at: Date.now() };
      eduRender();
      const pollStart = Date.now();
      const maxWait = 8 * 60 * 1000; // 8 min máximo
      while (Date.now() - pollStart < maxWait) {
        await new Promise(r => setTimeout(r, 5000));
        const { data: job } = await sb.from('edu_pres_jobs').select('*').eq('id', r.job_id).single();
        if (!job) { window.aiState[aiKey] = { loading: false, error: 'Job desapareció' }; break; }
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
          window.aiState[aiKey] = { loading: false, error: job.error_message };
          break;
        }
      }
      if (window.aiState[aiKey].loading) {
        window.aiState[aiKey] = { loading: false, error: 'Timeout polling (>8min). Verificá en DB job ' + r.job_id };
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
      default:                    renderDefault(slide, s, C);
    }

    // Speaker notes
    if (s.speaker_notes) {
      slide.addNotes(s.speaker_notes + ((s.sources||[]).length ? '\n\nFuentes:\n' + s.sources.map(src => '• ' + (src.title||'') + ' — ' + (src.url||'')).join('\n') : ''));
    }
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
  // Marca arriba
  slide.addText(c.BRAND, { x: 0.5, y: 0.5, w: 12.3, h: 0.4, color: c.GOLD, fontSize: 13, bold: true, charSpacing: 4 });
  slide.addText(c.YEAR, { x: 12.3, y: 0.5, w: 0.6, h: 0.4, color: c.GRAY_MED, fontSize: 13, align: 'right' });
  // Título central
  slide.addText(s.title || p.title, { x: 0.5, y: 2.0, w: 12.3, h: 1.6, fontSize: 46, bold: true, color: c.WHITE, align: 'center' });
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
  diagResult: null        // perfil identificado + plan
};

// ─── CONFIG WIZARD DE DIAGNÓSTICO ───
const FM_DIAG_QUESTIONS = [
  {
    id: 'objetivo',
    pregunta: '¿Cuál es tu resultado objetivo en los próximos 12 meses?',
    opciones: [
      { val: 'flip',         label: '🏠 Cerrar mi primer Fix & Flip (compra, remodelo, vendo)' },
      { val: 'hold',         label: '🏘️ Empezar portfolio de Fix & Hold (rentas long-term, cash flow)' },
      { val: 'wholesale',    label: '📋 Hacer wholesaling (asignar contratos sin remodelar)' },
      { val: 'hibrido',      label: '🔀 Mix flips + holds' },
      { val: 'escalar',      label: '🚀 Escalar un negocio que ya tengo (sistemas, equipo, múltiples deals)' },
      { val: 'lender',       label: '💰 Ser private money lender (prestar capital, no operar)' }
    ]
  },
  {
    id: 'capital',
    pregunta: '¿Cuánto capital propio disponible HOY para invertir?',
    opciones: [
      { val: 'menos_20k',    label: '< $20K' },
      { val: '20_50k',       label: '$20K – $50K' },
      { val: '50_100k',      label: '$50K – $100K' },
      { val: 'mas_100k',     label: '> $100K' }
    ]
  },
  {
    id: 'credit',
    pregunta: '¿Tu credit score (FICO) actual?',
    opciones: [
      { val: 'mas_720',      label: '> 720 (excelente)' },
      { val: '660_720',      label: '660 – 720 (bueno, califica HML estándar)' },
      { val: '600_660',      label: '600 – 660 (limitado, solo HMLs flexibles)' },
      { val: 'menos_600',    label: '< 600 (reconstruir antes de empezar)' },
      { val: 'sin_historial',label: 'No tengo historial crediticio en USA' }
    ]
  },
  {
    id: 'llc',
    pregunta: '¿Tenés LLC formada?',
    opciones: [
      { val: 'si_mismo',     label: '✅ Sí, en el estado donde planeo invertir' },
      { val: 'si_otro',      label: '⚠️ Sí, pero en otro estado distinto al de inversión' },
      { val: 'no',           label: '❌ No, todavía no la formé' },
      { val: 'otra_entidad', label: 'Tengo otra entidad (S-Corp, INC)' }
    ]
  },
  {
    id: 'deals_cerrados',
    pregunta: '¿Cuántos deals exitosos has cerrado en real estate?',
    opciones: [
      { val: '0',            label: 'Ninguno todavía' },
      { val: '1',            label: '1 deal' },
      { val: '2_4',          label: '2 – 4 deals' },
      { val: '5_mas',        label: '5+ deals' }
    ]
  },
  {
    id: 'tiempo',
    pregunta: '¿Cuántas horas/semana podés dedicarle al negocio?',
    opciones: [
      { val: 'mas_30',       label: '> 30 horas (full-time o casi)' },
      { val: '15_30',        label: '15 – 30 horas (medio tiempo serio)' },
      { val: 'menos_15',     label: '< 15 horas (paralelo a trabajo)' }
    ]
  },
  {
    id: 'inmigracion',
    pregunta: 'Sobre tu situación en USA:',
    opciones: [
      { val: 'residente',    label: 'Soy ciudadano o residente USA con SSN' },
      { val: 'itin',         label: 'Tengo ITIN pero no SSN' },
      { val: 'internacional',label: 'Soy internacional sin ITIN (visito USA)' }
    ]
  },
  {
    id: 'deal_activo',
    pregunta: '¿Tenés deal activo ahora mismo?',
    opciones: [
      { val: 'no',           label: 'No, todavía no cierro mi primer deal' },
      { val: 'pre_obra',     label: 'Sí, en preparación pre-obra (E2)' },
      { val: 'obra',         label: 'Sí, en obra (E3)' },
      { val: 'salida',       label: 'Sí, en salida / listing (E4)' }
    ],
    // Solo mostrar si dijo que cerró ≥ 1 deals O dijo que ya está en pipeline
    skipIf: (a) => a.deals_cerrados === '0' && (a.objetivo === 'wholesale' || a.objetivo === 'lender')
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
        </div>
      </div>

      <!-- Contenido del tab activo -->
      <div class="flex-1 overflow-hidden">
        ${fmState.activeTab === 'biblioteca' ? fmRenderBiblioteca() : ''}
        ${fmState.activeTab === 'buscador' ? fmRenderBuscadorIA() : ''}
        ${fmState.activeTab === 'diagnostico' ? fmRenderDiagnostico() : ''}
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
  // Si ya hay resultado, mostrar plan
  if (fmState.diagResult) return fmRenderDiagPlan();

  // Filtrar preguntas según respuestas previas (skipIf)
  const activeQuestions = FM_DIAG_QUESTIONS.filter(q => !q.skipIf || !q.skipIf(fmState.diagAnswers));
  const total = activeQuestions.length;
  const step = Math.min(fmState.diagStep, total - 1);
  const q = activeQuestions[step];

  if (!q) return `<div class="p-8">Calculando...</div>`;

  const answered = Object.keys(fmState.diagAnswers).length;
  const progress = Math.round((answered / total) * 100);

  return `
    <div class="h-full overflow-y-auto bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div class="max-w-2xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="bg-white rounded-xl border border-amber-200 p-5 mb-6 shadow-sm">
          <h3 class="font-bold text-slate-900 mb-1">🎯 Diagnóstico Inicial — Plan Personalizado</h3>
          <p class="text-sm text-slate-600">Respondé ${total} preguntas rápidas para identificar tu perfil y recibir un plan accionable con tareas, contactos y plataformas específicas.</p>
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
          <div class="text-xs font-bold text-amber-600 tracking-wider mb-2">PREGUNTA ${step + 1}</div>
          <h4 class="text-xl font-bold text-slate-900 mb-5">${q.pregunta}</h4>
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
        </div>

        <!-- Navegación -->
        <div class="flex items-center justify-between mt-6">
          <button onclick="fmDiagBack()" ${step === 0 ? 'disabled' : ''}
            class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed">
            ← Atrás
          </button>
          <button onclick="fmDiagReset()" class="px-3 py-2 text-xs text-slate-400 hover:text-slate-600">🔄 Reiniciar</button>
        </div>
      </div>
    </div>
  `;
}

function fmDiagAnswer(qid, val) {
  fmState.diagAnswers[qid] = val;
  // Avanzar a siguiente pregunta o calcular resultado
  const activeQuestions = FM_DIAG_QUESTIONS.filter(q => !q.skipIf || !q.skipIf(fmState.diagAnswers));
  const currentIdx = activeQuestions.findIndex(q => q.id === qid);
  if (currentIdx < activeQuestions.length - 1) {
    fmState.diagStep = currentIdx + 1;
  } else {
    // Última pregunta → calcular perfil
    fmState.diagResult = fmCalcularPerfil(fmState.diagAnswers);
  }
  fmRender();
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

// ─── LÓGICA DE CATEGORIZACIÓN ───
function fmCalcularPerfil(a) {
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
  // Perfil 6: Wholesaling (capital bajo o eligió wholesale)
  else if (a.objetivo === 'wholesale' || a.capital === 'menos_20k') {
    perfil = { num: 6, nombre: 'Wholesaling primero (capital bajo)', emoji: '📋', color: 'indigo' };
    etapa = 'E0+E1';
    cronograma = '3-6 meses al primer assignment';
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

  if (a.deals_cerrados === '0' && a.objetivo !== 'wholesale' && a.objetivo !== 'lender') {
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

function fmRenderDiagPlan() {
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

function fmDiagOpenLibrary() {
  fmState.activeTab = 'biblioteca';
  fmState.activeEtapa = 'INDICE';
  // Buscar doc "Estados del Estudiante" si existe
  const estadosDoc = fmState.docs.find(d => d.categoria === 'perfiles');
  if (estadosDoc) {
    fmState.activeDocId = estadosDoc.id;
  }
  fmRender();
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
