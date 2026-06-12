// ════════════════════════════════════════════════════════════
// 🩺 Diagnóstico clínico del estudiante (extraído de education.js)
// Wizard + análisis + plan de acción detallado.
// ════════════════════════════════════════════════════════════

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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAccessToken()}` },
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

  // 3) Archivar plan anterior si existe + verificar
  const archRes = await sb.from('edu_student_plans')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('status', 'active');
  if (archRes.error) console.warn('[archive prev plan]', archRes.error);

  // 4) Crear nuevo plan
  const planPayload = {
    student_id: studentId,
    mentorship_id: student.mentorship_id,
    diagnostico: answers,
    perfil: { ...perfilResult, userProfile },
    bloques_ids: bloques.map(b => b.id),
    modo: 'completo',
    status: 'active'
  };
  let { data: plan, error: planErr } = await sb.from('edu_student_plans').insert(planPayload).select().single();

  // Si choca por duplicate key (plan anterior no se archivó), borrar el activo viejo y reintentar
  if (planErr && /duplicate key|unique constraint/i.test(planErr.message || '')) {
    console.warn('[plan duplicate, forcing delete of old active]');
    // Borrar tasks del plan viejo primero (FK)
    const { data: oldPlans } = await sb.from('edu_student_plans').select('id').eq('student_id', studentId).eq('status', 'active');
    if (oldPlans?.length) {
      for (const op of oldPlans) {
        await sb.from('edu_student_plan_tasks').delete().eq('plan_id', op.id);
      }
      await sb.from('edu_student_plans').delete().eq('student_id', studentId).eq('status', 'active');
    }
    // Reintentar insert
    const retry = await sb.from('edu_student_plans').insert(planPayload).select().single();
    plan = retry.data; planErr = retry.error;
  }

  if (planErr) return alert('Error creando plan: ' + planErr.message);
  if (!plan) return alert('No se pudo crear el plan (sin error pero sin row)');

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

  // 3) Estancado en etapa — comparar contra target_weeks REAL de la etapa, no días absolutos.
  // Antes: 60d en E0 (target 2 sem) = 4x → alerta. 60d en E3 (target 12 sem) = normal.
  if (s.stage_started_at) {
    const stageStart = new Date(s.stage_started_at);
    const daysInStage = Math.floor((now - stageStart) / ms_per_day);
    const stageObj = typeof eduStageObj === 'function' ? eduStageObj(s.current_stage) : null;
    const targetDays = stageObj && stageObj.target_weeks ? stageObj.target_weeks * 7 : 60;
    if (daysInStage > targetDays * 2) {
      alertas.push({
        severity: 'critical', tipo: 'estancado_etapa',
        mensaje: `${daysInStage} días en etapa "${s.current_stage}" (target ${targetDays}d × 2)`,
        accion: 'Sesión 1-on-1 urgente. Revisar si necesita cambiar de estrategia.'
      });
    } else if (daysInStage > targetDays * 1.5) {
      alertas.push({
        severity: 'high', tipo: 'estancado_etapa',
        mensaje: `${daysInStage} días en etapa "${s.current_stage}" (target ${targetDays}d × 1.5)`,
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

      <!-- ⚠️ Estudiantes en riesgo por inactividad -->
      ${(() => {
        const enRiesgo = (typeof eduStudentsEnRiesgo === 'function' ? eduStudentsEnRiesgo() : []).slice(0, 8);
        if (enRiesgo.length === 0) return '';
        return `
        <div class="bg-white border-2 border-amber-300 rounded-xl overflow-hidden">
          <div class="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 flex items-center justify-between">
            <div class="text-xs font-bold uppercase">⚠️ ${enRiesgo.length} estudiante(s) en riesgo por inactividad</div>
            <button onclick="eduState.tab='students'; eduState.searchQuery='sin_contacto_30d'; eduRender()" class="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded">Ver todos →</button>
          </div>
          <ul class="divide-y divide-slate-100">
            ${enRiesgo.map(s => `
              <li class="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3" onclick="eduOpenStudent('${s.id}')">
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-sm">${(s.full_name||'—').replace(/</g,'&lt;')}</div>
                  <div class="text-[11px] text-slate-500">${(s.grupo || s.current_stage || '—').replace(/</g,'&lt;')}</div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-[11px] font-bold ${s._daysWithoutContact > 30 ? 'text-red-700' : 'text-amber-700'}">${s._riskReason}</div>
                  ${s.phone ? `<a href="https://wa.me/${s.phone.replace(/[^0-9]/g,'')}" target="_blank" onclick="event.stopPropagation()" class="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-0.5 rounded font-bold inline-block mt-0.5">💬 WhatsApp</a>` : ''}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
        `;
      })()}

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

