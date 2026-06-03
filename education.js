// =============================================================================
// EDUCATION.js · Área Educación (FlipMentoría)
// 5 sistemas: Mi Ruta · Biblioteca · Preguntas · Panel Mentor · Curriculum
// Reescrito desde cero para Sprint E1 — usa schema edu_* y RLS por rol
// =============================================================================
(function () {
  // CRÍTICO: `sb` y `state` viven como const globales en app.js (NO en window).
  // Los <script> clásicos comparten el realm global, así que education.js los puede
  // leer por nombre. window.supabase es la LIBRERÍA del CDN, no el cliente.
  const supabase = (typeof sb !== 'undefined') ? sb : (window.sb || window.supabaseClient);
  if (!supabase || typeof supabase.from !== 'function') {
    console.error('[Educación] Cliente Supabase no disponible. typeof sb=', typeof sb);
  }

  // -------------------------------------------------------------------------
  // Auth helpers — leer rol del DOM (donde app.js lo escribe) y user de Supabase
  // -------------------------------------------------------------------------
  let _cachedUser = null;
  async function getCurrentUser() {
    if (_cachedUser) return _cachedUser;
    try {
      const { data } = await supabase.auth.getUser();
      _cachedUser = data?.user || {};
    } catch (e) { _cachedUser = {}; }
    return _cachedUser;
  }
  // Función síncrona para compatibilidad con renders
  const user = () => _cachedUser || {};

  const role = () => {
    // 1. `state` es global desde app.js (let state = {...})
    try {
      if (typeof state !== 'undefined' && state?.role) {
        return String(state.role).toLowerCase();
      }
    } catch (e) { /* state no accesible */ }
    // 2. Fallback: leer del span #user-role que app.js rellena
    const el = document.getElementById('user-role');
    if (el && el.textContent && el.textContent.trim()) {
      return el.textContent.trim().toLowerCase();
    }
    return 'student';
  };
  const isMentor = () => ['admin', 'mentor'].includes(role());
  const openModal = window.openModal || ((title, html) => {
    const m = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    m.classList.remove('hidden');
  });
  const closeModal = window.closeModal || (() => document.getElementById('modal').classList.add('hidden'));
  const toast = window.toast || ((m) => console.log('toast:', m));
  const fmtDate = window.fmtDate || ((d) => new Date(d).toLocaleDateString('es'));

  // -------------------------------------------------------------------------
  // Cache global de curriculum (se carga una vez por sesión)
  // -------------------------------------------------------------------------
  let CURRICULUM = null;
  async function loadCurriculum(force = false) {
    if (CURRICULUM && !force) return CURRICULUM;
    const [{ data: stages }, { data: blocks }, { data: tasks }, { data: deps }] =
      await Promise.all([
        supabase.from('edu_curriculum_stages').select('*').order('order_idx'),
        supabase.from('edu_curriculum_blocks').select('*').order('order_idx'),
        supabase.from('edu_curriculum_tasks').select('*').order('order_idx'),
        supabase.from('edu_curriculum_deps').select('*'),
      ]);
    CURRICULUM = { stages: stages || [], blocks: blocks || [], tasks: tasks || [], deps: deps || [] };
    return CURRICULUM;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function ensureMyStudent() {
    const u = await getCurrentUser();
    if (!u?.id) {
      console.error('[Educación] No hay usuario autenticado');
      return null;
    }
    const { data, error: e1 } = await supabase.from('edu_students')
      .select('*').eq('user_id', u.id).maybeSingle();
    if (e1) { console.error('[Educación] Error leyendo edu_students:', e1); throw e1; }
    if (data) return data;
    const { data: created, error: e2 } = await supabase.from('edu_students').insert({
      user_id: u.id,
      full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Estudiante'
    }).select('*').single();
    if (e2) { console.error('[Educación] Error creando edu_students:', e2); throw e2; }
    return created;
  }

  async function ensureMyEnrollment() {
    const me = await ensureMyStudent();
    if (!me) return null;
    const { data, error: e1 } = await supabase.from('edu_enrollments')
      .select('*, edu_cohorts(*)').eq('student_id', me.id).maybeSingle();
    if (e1) { console.error('[Educación] Error leyendo edu_enrollments:', e1); throw e1; }
    if (data) return data;
    const { data: cohort } = await supabase.from('edu_cohorts').select('*').eq('status', 'active').limit(1).maybeSingle();
    const { data: enr, error: e2 } = await supabase.from('edu_enrollments').insert({
      student_id: me.id, cohort_id: cohort?.id || null, current_stage: 'E0', status: 'active'
    }).select('*').single();
    if (e2) { console.error('[Educación] Error creando enrollment:', e2); throw e2; }
    return enr;
  }

  // Wrap para mostrar errores en la UI en vez de fallar silenciosamente
  function withErrorBoundary(fn) {
    return async function (...args) {
      try { return await fn.apply(this, args); }
      catch (err) {
        console.error('[Educación] Error en vista:', err);
        const root = document.getElementById('content');
        if (root) {
          root.innerHTML = `
            <div class="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 mt-8">
              <h2 class="text-lg font-bold text-red-900 mb-2">⚠️ Error al abrir la vista</h2>
              <pre class="text-xs text-red-700 bg-white p-3 rounded border border-red-100 overflow-x-auto whitespace-pre-wrap">${String(err?.message || err)}</pre>
              <p class="text-xs text-slate-600 mt-3">Abre la consola del navegador (F12) y comparte el detalle. Posibles causas:</p>
              <ul class="text-xs text-slate-600 mt-1 list-disc ml-5">
                <li>El SQL <code>sE1-education-area.sql</code> no se aplicó completo (faltan tablas <code>edu_*</code>)</li>
                <li>La función <code>is_mentor_or_admin()</code> no existe (corre <code>sE1-fix-function-profiles.sql</code>)</li>
                <li>Tu profile no tiene <code>role='admin'</code> en la tabla <code>profiles</code></li>
              </ul>
            </div>
          `;
        }
      }
    };
  }

  // =========================================================================
  // VISTA 1 · MI RUTA 90 DÍAS (Portal Estudiante)
  // =========================================================================
  window.openEducationStudent = async function (sys) {
    try { await getCurrentUser(); } catch(e){}
    const root = document.getElementById('content');
    root.innerHTML = `<div class="text-center text-slate-500 py-12">Cargando tu ruta…</div>`;

    const [curr, enr] = await Promise.all([loadCurriculum(), ensureMyEnrollment()]);
    if (!enr) { root.innerHTML = `<div class="text-center text-red-600 py-12">No pude crear tu enrollment.</div>`; return; }
    const me = await ensureMyStudent();

    const { data: progress } = await supabase
      .from('edu_student_progress').select('*').eq('enrollment_id', enr.id);
    const progressByTask = Object.fromEntries((progress || []).map(p => [p.task_id, p]));

    const total = curr.tasks.length;
    const done = (progress || []).filter(p => ['submitted', 'approved'].includes(p.status)).length;
    const inprog = (progress || []).filter(p => p.status === 'in_progress').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const stagesHtml = curr.stages.map(stage => {
      const blocks = curr.blocks.filter(b => b.stage_id === stage.id);
      const stageTasks = curr.tasks.filter(t => blocks.some(b => b.id === t.block_id));
      const stageDone = stageTasks.filter(t => ['submitted', 'approved'].includes(progressByTask[t.id]?.status)).length;
      const stagePct = stageTasks.length ? Math.round((stageDone / stageTasks.length) * 100) : 0;

      const blocksHtml = blocks.map(block => {
        const blockTasks = curr.tasks.filter(t => t.block_id === block.id);
        const tasksHtml = blockTasks.map(t => {
          const p = progressByTask[t.id] || {};
          const status = p.status || 'pending';
          const icon = { pending: '⚪', in_progress: '🟡', submitted: '🔵', approved: '🟢', blocked: '🔴', skipped: '⚫' }[status];
          const hint = t.estimated_hours_max ? ` · ⏱️ ${t.estimated_hours_min}-${t.estimated_hours_max}h` : '';
          const critical = t.is_critical ? ' <span class="text-amber-600 text-xs">★ crítica</span>' : '';
          return `
            <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200"
                 onclick="openTaskDetail(${t.id})">
              <span class="text-lg">${icon}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-900 truncate">
                  <span class="text-slate-400 font-mono text-xs">${t.code}</span> ${escapeHtml(t.title)}${critical}
                </div>
                <div class="text-xs text-slate-500 mt-0.5">${escapeHtml(t.deliverable || t.description || '').slice(0, 100)}${hint}</div>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="bg-white rounded-lg border border-slate-200 mb-2">
            <div class="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span class="text-xs font-mono text-slate-400">${block.code}</span>
                <span class="text-sm font-semibold text-slate-700 ml-1">${escapeHtml(block.title)}</span>
              </div>
              <span class="text-xs text-slate-500">${blockTasks.length} tareas</span>
            </div>
            <div class="p-2 space-y-0.5">${tasksHtml}</div>
          </div>
        `;
      }).join('');

      return `
        <details class="bg-slate-50 rounded-xl p-4 mb-4" ${stage.code === enr.current_stage ? 'open' : ''}>
          <summary class="cursor-pointer">
            <div class="inline-flex items-center gap-3 w-[calc(100%-2rem)]">
              <div class="text-3xl">${stage.emoji || '📘'}</div>
              <div class="flex-1">
                <div class="text-xs font-mono text-slate-400">${stage.code}</div>
                <div class="text-lg font-bold text-slate-900">${escapeHtml(stage.title)}</div>
                <div class="text-xs text-slate-500">${escapeHtml(stage.description || '')}</div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-slate-900">${stagePct}%</div>
                <div class="text-xs text-slate-500">${stageDone}/${stageTasks.length}</div>
              </div>
            </div>
          </summary>
          <div class="mt-3">${blocksHtml}</div>
        </details>
      `;
    }).join('');

    root.innerHTML = `
      <div class="max-w-5xl mx-auto">
        <div class="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div class="text-sm font-semibold text-amber-700 uppercase tracking-wide">FlipMentoría · Tu ruta de 90 días</div>
              <h1 class="text-3xl font-bold text-slate-900 mt-1">Hola, ${escapeHtml(me?.full_name || 'inversionista')}</h1>
              <p class="text-sm text-slate-600 mt-1">Etapa actual: <strong>${enr.current_stage}</strong> · ${done} de ${total} tareas completadas</p>
            </div>
            <div class="text-center">
              <div class="relative w-24 h-24">
                <svg class="transform -rotate-90 w-24 h-24">
                  <circle cx="48" cy="48" r="40" stroke="#fed7aa" stroke-width="8" fill="none"/>
                  <circle cx="48" cy="48" r="40" stroke="#d97706" stroke-width="8" fill="none"
                          stroke-dasharray="${2 * Math.PI * 40}" stroke-dashoffset="${2 * Math.PI * 40 * (1 - pct / 100)}"
                          stroke-linecap="round"/>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-2xl font-bold text-amber-900">${pct}%</span>
                </div>
              </div>
              <div class="text-xs text-slate-600 mt-1">Avance total</div>
            </div>
          </div>
          <div class="flex gap-3 mt-4 text-xs">
            <span class="bg-white px-3 py-1 rounded-full border border-slate-200">🟢 ${done} hechas</span>
            <span class="bg-white px-3 py-1 rounded-full border border-slate-200">🟡 ${inprog} en proceso</span>
            <span class="bg-white px-3 py-1 rounded-full border border-slate-200">⚪ ${total - done - inprog} pendientes</span>
          </div>
        </div>
        ${stagesHtml}
      </div>
    `;
  };

  // Detalle de tarea (modal)
  window.openTaskDetail = async function (taskId) {
    await loadCurriculum();
    const t = CURRICULUM.tasks.find(x => x.id === taskId);
    const block = CURRICULUM.blocks.find(b => b.id === t.block_id);
    const stage = CURRICULUM.stages.find(s => s.id === block.stage_id);
    const enr = await ensureMyEnrollment();
    const { data: p } = await supabase.from('edu_student_progress')
      .select('*').eq('enrollment_id', enr.id).eq('task_id', t.id).maybeSingle();
    const status = p?.status || 'pending';

    const deps = CURRICULUM.deps.filter(d => d.task_id === t.id);
    const depTasks = deps.map(d => CURRICULUM.tasks.find(x => x.id === d.depends_on_id)).filter(Boolean);

    const { data: resources } = await supabase.from('edu_resources').select('*').eq('task_code', t.code);

    const modalHtml = `
      <div class="space-y-4">
        <div>
          <div class="text-xs font-mono text-slate-400">${stage.code} · ${block.code} · ${t.code}</div>
          <h2 class="text-xl font-bold text-slate-900 mt-1">${escapeHtml(t.title)}</h2>
          ${t.is_critical ? '<span class="inline-block mt-1 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">★ Tarea crítica</span>' : ''}
        </div>

        ${t.estimated_hours_max ? `<div class="text-sm text-slate-600">⏱️ Tiempo estimado: <strong>${t.estimated_hours_min}–${t.estimated_hours_max} horas</strong></div>` : ''}

        ${t.description ? `<div class="bg-blue-50 rounded-lg p-3 text-sm text-slate-700"><div class="text-xs font-semibold text-blue-700 uppercase mb-1">Actividad</div>${escapeHtml(t.description)}</div>` : ''}
        ${t.deliverable ? `<div class="bg-green-50 rounded-lg p-3 text-sm text-slate-700"><div class="text-xs font-semibold text-green-700 uppercase mb-1">Entregable</div>${escapeHtml(t.deliverable)}</div>` : ''}

        ${depTasks.length ? `
          <div class="bg-slate-50 rounded-lg p-3 text-sm">
            <div class="text-xs font-semibold text-slate-700 uppercase mb-2">⚠️ Depende de:</div>
            <ul class="space-y-1">${depTasks.map(d => `<li class="text-xs">• <span class="font-mono">${d.code}</span> — ${escapeHtml(d.title)}</li>`).join('')}</ul>
          </div>
        ` : ''}

        ${resources?.length ? `
          <div class="bg-amber-50 rounded-lg p-3 text-sm">
            <div class="text-xs font-semibold text-amber-800 uppercase mb-2">🛠️ Recursos sugeridos</div>
            ${resources.map(r => `
              <a href="${r.url || '#'}" target="_blank" class="block py-1 text-xs text-amber-900 hover:underline">
                ${r.is_recommended ? '⭐' : '•'} <strong>${escapeHtml(r.name)}</strong>
                ${r.price_tier ? ` · <span class="text-slate-500">${r.price_tier}</span>` : ''}
                ${r.description ? ` — ${escapeHtml(r.description)}` : ''}
              </a>
            `).join('')}
          </div>
        ` : ''}

        <div class="border-t border-slate-200 pt-4 space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
            <select id="task-status" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="pending"     ${status === 'pending' ? 'selected' : ''}>⚪ Pendiente</option>
              <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>🟡 En proceso</option>
              <option value="submitted"   ${status === 'submitted' ? 'selected' : ''}>🔵 Enviada para revisión</option>
              ${isMentor() ? `<option value="approved" ${status === 'approved' ? 'selected' : ''}>🟢 Aprobada (mentor)</option>` : ''}
              <option value="blocked"     ${status === 'blocked' ? 'selected' : ''}>🔴 Bloqueada</option>
              <option value="skipped"     ${status === 'skipped' ? 'selected' : ''}>⚫ No aplica</option>
            </select>
          </div>
          ${t.evidence_required ? `
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Evidencia</label>
              ${t.evidence_hint ? `<div class="text-xs text-slate-500 mb-1">${escapeHtml(t.evidence_hint)}</div>` : ''}
              <input type="url" id="task-evidence" value="${escapeHtml(p?.evidence_url || '')}"
                     placeholder="https://... (Drive/Dropbox/foto)"
                     class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
            </div>
          ` : ''}
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Mis notas</label>
            <textarea id="task-notes" rows="3" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">${escapeHtml(p?.student_notes || '')}</textarea>
          </div>
          ${p?.mentor_notes ? `
            <div class="bg-purple-50 rounded-lg p-3">
              <div class="text-xs font-semibold text-purple-800 mb-1">💬 Comentario del mentor</div>
              <div class="text-sm text-slate-700">${escapeHtml(p.mentor_notes)}</div>
            </div>
          ` : ''}
          ${isMentor() ? `
            <div>
              <label class="block text-xs font-semibold text-purple-700 mb-1">Notas del mentor (solo tú las escribes)</label>
              <textarea id="task-mentor-notes" rows="2" class="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm bg-purple-50">${escapeHtml(p?.mentor_notes || '')}</textarea>
            </div>
          ` : ''}
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button onclick="closeModal()" class="px-4 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50">Cancelar</button>
          <button onclick="saveTaskProgress(${t.id})" class="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-700">Guardar</button>
        </div>
      </div>
    `;
    openModal('Detalle de tarea', modalHtml);
  };

  window.saveTaskProgress = async function (taskId) {
    const enr = await ensureMyEnrollment();
    const status = document.getElementById('task-status').value;
    const evidence_url = document.getElementById('task-evidence')?.value || null;
    const student_notes = document.getElementById('task-notes')?.value || null;
    const mentor_notes_el = document.getElementById('task-mentor-notes');
    const mentor_notes = mentor_notes_el?.value;

    const payload = {
      enrollment_id: enr.id,
      task_id: taskId,
      status,
      student_notes,
      evidence_url,
    };
    if (status === 'in_progress') payload.started_at = new Date().toISOString();
    if (status === 'submitted') payload.submitted_at = new Date().toISOString();
    if (isMentor() && mentor_notes !== undefined) {
      payload.mentor_notes = mentor_notes;
      if (status === 'approved') {
        payload.reviewed_at = new Date().toISOString();
        payload.reviewer_id = (await getCurrentUser()).id;
      }
    }

    const { error } = await supabase.from('edu_student_progress').upsert(payload, { onConflict: 'enrollment_id,task_id' });
    if (error) { alert('Error: ' + error.message); return; }
    toast('Guardado ✓');
    closeModal();
    if (!isMentor()) {
      window.openEducationStudent({ type: 'education-student' });
    } else {
      window.openEducationMentor?.();
    }
  };

  // =========================================================================
  // VISTA 2 · BIBLIOTECA
  // =========================================================================
  window.openEducationLibrary = async function () {
    try { await getCurrentUser(); } catch(e){}
    const root = document.getElementById('content');
    root.innerHTML = `<div class="text-center text-slate-500 py-12">Cargando biblioteca…</div>`;
    await loadCurriculum();
    const { data: resources } = await supabase.from('edu_resources').select('*').order('stage_code').order('name');

    const renderResources = (filtered) => filtered.map(r => `
      <div class="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="text-xs font-mono text-slate-400">${r.stage_code || '—'}${r.task_code ? ` · ${r.task_code}` : ''}</span>
          ${r.is_recommended ? '<span class="text-xs">⭐</span>' : ''}
        </div>
        <a href="${r.url || '#'}" target="_blank" class="block font-semibold text-slate-900 hover:text-amber-700">${escapeHtml(r.name)}</a>
        <div class="text-xs text-slate-600 mt-1">${escapeHtml(r.description || '')}</div>
        <div class="flex flex-wrap gap-1 mt-2 text-[10px]">
          <span class="bg-slate-100 px-2 py-0.5 rounded">${r.kind}</span>
          ${r.price_tier ? `<span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">${r.price_tier}</span>` : ''}
          ${r.geo_scope ? `<span class="bg-green-50 text-green-700 px-2 py-0.5 rounded">${r.geo_scope}</span>` : ''}
          ${r.state ? `<span class="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">${r.state}</span>` : ''}
        </div>
      </div>
    `).join('');

    root.innerHTML = `
      <div class="max-w-6xl mx-auto">
        <div class="mb-6">
          <h1 class="text-3xl font-bold">📚 Biblioteca</h1>
          <p class="text-sm text-slate-500 mt-1">Contactos verificados · Herramientas · Plantillas · Por etapa.</p>
        </div>
        <div class="flex gap-3 mb-4 flex-wrap">
          <input id="lib-search" placeholder="🔍 Buscar..." class="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
          <select id="lib-stage" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todas las etapas</option>
            ${CURRICULUM.stages.map(s => `<option value="${s.code}">${s.emoji} ${s.code} — ${escapeHtml(s.title)}</option>`).join('')}
          </select>
          <select id="lib-kind" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todo tipo</option>
            <option value="tool">🛠️ Herramientas</option>
            <option value="contact">📞 Contactos</option>
            <option value="template">📋 Plantillas</option>
            <option value="script">📜 Scripts</option>
            <option value="kpi">📊 KPIs</option>
          </select>
          <select id="lib-state" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos los estados</option>
            <option>FL</option><option>TX</option><option>CA</option><option>NY</option><option>NJ</option><option>AZ</option><option>GA</option>
          </select>
        </div>
        <div id="lib-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${renderResources(resources || [])}
        </div>
        <div class="text-xs text-slate-400 text-center mt-6">${resources?.length || 0} recursos disponibles</div>
      </div>
    `;

    const apply = () => {
      const q = document.getElementById('lib-search').value.toLowerCase();
      const st = document.getElementById('lib-stage').value;
      const k = document.getElementById('lib-kind').value;
      const sStat = document.getElementById('lib-state').value;
      const filtered = (resources || []).filter(r =>
        (!q || (r.name + ' ' + (r.description || '')).toLowerCase().includes(q)) &&
        (!st || r.stage_code === st) &&
        (!k || r.kind === k) &&
        (!sStat || r.state === sStat)
      );
      document.getElementById('lib-grid').innerHTML = renderResources(filtered);
    };
    ['lib-search', 'lib-stage', 'lib-kind', 'lib-state'].forEach(id =>
      document.getElementById(id).addEventListener('input', apply));
  };

  // =========================================================================
  // VISTA 3 · PREGUNTAS AL MENTOR (Q&A)
  // =========================================================================
  window.openEducationQA = async function () {
    try { await getCurrentUser(); } catch(e){}
    const root = document.getElementById('content');
    root.innerHTML = `<div class="text-center text-slate-500 py-12">Cargando Q&A…</div>`;
    const enr = await ensureMyEnrollment();

    const { data: myQs } = await supabase.from('edu_questions').select('*')
      .eq('enrollment_id', enr.id).order('asked_at', { ascending: false });
    const { data: pubQs } = await supabase.from('edu_questions').select('*')
      .eq('is_published', true).neq('enrollment_id', enr.id).order('answered_at', { ascending: false }).limit(20);

    root.innerHTML = `
      <div class="max-w-3xl mx-auto">
        <h1 class="text-3xl font-bold mb-4">❓ Preguntas al mentor</h1>

        <div class="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div class="text-sm font-semibold mb-2">Hacer una pregunta nueva</div>
          <textarea id="new-q" rows="3" placeholder="Ej: ¿Cómo escojo el state para mi LLC si vivo en CA pero quiero invertir en TX?"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2"></textarea>
          <input id="new-q-context" placeholder="(Opcional) Código de tarea: E0.1.1, E1.3.4..." class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2"/>
          <button onclick="submitQuestion()" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">Enviar pregunta</button>
        </div>

        <div class="mb-6">
          <h2 class="text-lg font-semibold mb-2">Mis preguntas</h2>
          <div class="space-y-3">
            ${(myQs || []).map(q => `
              <div class="bg-white border border-slate-200 rounded-lg p-3">
                <div class="text-xs text-slate-400">${fmtDate(q.asked_at)} ${q.task_code ? `· ${q.task_code}` : ''}</div>
                <div class="font-medium text-sm mt-1">${escapeHtml(q.question)}</div>
                ${q.answer ? `<div class="mt-2 bg-amber-50 rounded p-2 text-sm"><strong>Mentor:</strong> ${escapeHtml(q.answer)}</div>` : '<div class="text-xs text-slate-400 mt-2">⏳ En espera de respuesta</div>'}
              </div>
            `).join('') || '<div class="text-sm text-slate-400">Aún no has hecho preguntas.</div>'}
          </div>
        </div>

        <div>
          <h2 class="text-lg font-semibold mb-2">📚 Preguntas frecuentes (de otros estudiantes)</h2>
          <div class="space-y-3">
            ${(pubQs || []).map(q => `
              <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div class="text-xs text-slate-400">${q.task_code || ''}</div>
                <div class="font-medium text-sm">${escapeHtml(q.question)}</div>
                ${q.answer ? `<div class="mt-2 text-sm text-slate-700">${escapeHtml(q.answer)}</div>` : ''}
              </div>
            `).join('') || '<div class="text-sm text-slate-400">Sin preguntas publicadas todavía.</div>'}
          </div>
        </div>
      </div>
    `;
  };

  window.submitQuestion = async function () {
    const enr = await ensureMyEnrollment();
    const question = document.getElementById('new-q').value.trim();
    const task_code = document.getElementById('new-q-context').value.trim() || null;
    if (!question) return alert('Escribe tu pregunta');
    const { error } = await supabase.from('edu_questions').insert({
      enrollment_id: enr.id, question, task_code
    });
    if (error) return alert('Error: ' + error.message);
    toast('Pregunta enviada ✓');
    window.openEducationQA();
  };

  // =========================================================================
  // VISTA 4 · PANEL MENTOR
  // =========================================================================
  window.openEducationMentor = async function () {
    try { await getCurrentUser(); } catch(e){}
    const root = document.getElementById('content');
    if (!isMentor()) { root.innerHTML = `<div class="text-center text-red-600 py-12">Acceso restringido (mentor/admin). Rol detectado: <strong>${role()}</strong></div>`; return; }
    root.innerHTML = `<div class="text-center text-slate-500 py-12">Cargando panel mentor…</div>`;

    const [{ data: scorecard }, { data: alerts }, { data: pendingReviews }, { data: pendingQs }] = await Promise.all([
      supabase.from('edu_scorecard').select('*').order('pct_complete', { ascending: false }),
      supabase.from('edu_alerts').select('*'),
      supabase.from('edu_student_progress').select('*, edu_curriculum_tasks(code,title), edu_enrollments(*, edu_students(full_name))').eq('status', 'submitted').limit(50),
      supabase.from('edu_questions').select('*, edu_enrollments(*, edu_students(full_name))').is('answered_at', null).order('asked_at', { ascending: false }).limit(20),
    ]);

    const stuck = (alerts || []).filter(a => a.kind === 'stuck');
    const review = (alerts || []).filter(a => a.kind === 'awaiting_review');

    root.innerHTML = `
      <div class="max-w-7xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-3xl font-bold">👥 Panel Mentor</h1>
            <p class="text-sm text-slate-500 mt-1">${scorecard?.length || 0} estudiantes · ${stuck.length} atascados · ${review.length} pendientes</p>
          </div>
          <div class="flex gap-2">
            <button onclick="addStudentModal()" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">+ Estudiante</button>
            <button onclick="addCohortModal()" class="bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-slate-50">+ Cohorte</button>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs text-slate-500">Estudiantes activos</div>
            <div class="text-3xl font-bold">${scorecard?.length || 0}</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs text-slate-500">Avance promedio</div>
            <div class="text-3xl font-bold">${scorecard?.length ? Math.round(scorecard.reduce((a, s) => a + (s.pct_complete || 0), 0) / scorecard.length) : 0}%</div>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div class="text-xs text-amber-700">Atascados (>7 días)</div>
            <div class="text-3xl font-bold text-amber-900">${stuck.length}</div>
          </div>
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div class="text-xs text-blue-700">Por revisar</div>
            <div class="text-3xl font-bold text-blue-900">${pendingReviews?.length || 0}</div>
          </div>
        </div>

        <div class="flex border-b border-slate-200 mb-4">
          <button data-tab="students" class="mentor-tab px-4 py-2 text-sm font-medium border-b-2 border-slate-900">📋 Estudiantes</button>
          <button data-tab="reviews" class="mentor-tab px-4 py-2 text-sm font-medium border-b-2 border-transparent">📥 Por revisar (${pendingReviews?.length || 0})</button>
          <button data-tab="alerts" class="mentor-tab px-4 py-2 text-sm font-medium border-b-2 border-transparent">🚨 Alertas (${alerts?.length || 0})</button>
          <button data-tab="qa" class="mentor-tab px-4 py-2 text-sm font-medium border-b-2 border-transparent">❓ Preguntas (${pendingQs?.length || 0})</button>
        </div>

        <div id="mentor-tab-content"></div>
      </div>
    `;

    const tabs = {
      students: () => `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th class="text-left p-3">Estudiante</th><th class="text-left p-3">Cohorte</th><th class="text-left p-3">Etapa</th><th class="text-left p-3">Avance</th><th class="text-left p-3">Última actividad</th><th class="p-3"></th></tr>
            </thead>
            <tbody>
              ${(scorecard || []).map(s => `
                <tr class="border-t border-slate-100 hover:bg-slate-50">
                  <td class="p-3 font-medium">${escapeHtml(s.full_name)}</td>
                  <td class="p-3 text-xs">${s.cohort_code || '—'}</td>
                  <td class="p-3 text-xs"><span class="font-mono">${s.current_stage}</span></td>
                  <td class="p-3">
                    <div class="flex items-center gap-2">
                      <div class="w-32 bg-slate-200 rounded-full h-2"><div class="bg-amber-500 h-2 rounded-full" style="width:${s.pct_complete || 0}%"></div></div>
                      <span class="text-xs font-semibold">${s.pct_complete || 0}%</span>
                    </div>
                  </td>
                  <td class="p-3 text-xs text-slate-500">${s.days_since_last_activity ? Math.round(s.days_since_last_activity) + ' días atrás' : 'sin actividad'}</td>
                  <td class="p-3 text-right"><button onclick="openStudentDetail(${s.student_id})" class="text-xs text-blue-600 hover:underline">Ver →</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `,
      reviews: () => `
        <div class="space-y-2">
          ${(pendingReviews || []).map(p => `
            <div class="bg-white border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <span class="text-2xl">🔵</span>
              <div class="flex-1">
                <div class="font-semibold text-sm">${escapeHtml(p.edu_enrollments?.edu_students?.full_name || '?')}</div>
                <div class="text-xs text-slate-500">${p.edu_curriculum_tasks?.code} — ${escapeHtml(p.edu_curriculum_tasks?.title || '')}</div>
                ${p.evidence_url ? `<a href="${p.evidence_url}" target="_blank" class="text-xs text-blue-600 hover:underline">Ver evidencia →</a>` : '<span class="text-xs text-amber-700">⚠️ Sin evidencia</span>'}
                ${p.student_notes ? `<div class="text-xs italic text-slate-600 mt-1">"${escapeHtml(p.student_notes.slice(0, 200))}"</div>` : ''}
              </div>
              <div class="flex flex-col gap-1">
                <button onclick="approveProgress(${p.id})" class="bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700">Aprobar</button>
                <button onclick="openTaskDetail(${p.task_id})" class="text-xs text-slate-600 hover:underline">Editar</button>
              </div>
            </div>
          `).join('') || '<div class="text-center text-slate-400 py-6">No hay tareas pendientes de revisión.</div>'}
        </div>
      `,
      alerts: () => `
        <div class="space-y-2">
          ${(alerts || []).map(a => `
            <div class="bg-${a.kind === 'stuck' ? 'amber' : 'blue'}-50 border border-${a.kind === 'stuck' ? 'amber' : 'blue'}-200 rounded-lg p-3 flex items-center gap-3">
              <span class="text-2xl">${a.kind === 'stuck' ? '🚨' : '📥'}</span>
              <div class="flex-1">
                <div class="font-semibold text-sm">${escapeHtml(a.full_name)}</div>
                <div class="text-xs text-slate-600">${escapeHtml(a.message)}</div>
              </div>
              <button onclick="openStudentDetail(${a.student_id})" class="text-xs text-slate-700 hover:underline">Ver →</button>
            </div>
          `).join('') || '<div class="text-center text-slate-400 py-6">Sin alertas. ✨</div>'}
        </div>
      `,
      qa: () => `
        <div class="space-y-3">
          ${(pendingQs || []).map(q => `
            <div class="bg-white border border-slate-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-semibold">${escapeHtml(q.edu_enrollments?.edu_students?.full_name || '?')}</div>
                <div class="text-xs text-slate-400">${q.task_code || ''} · ${fmtDate(q.asked_at)}</div>
              </div>
              <div class="text-sm mb-3">${escapeHtml(q.question)}</div>
              <textarea id="ans-${q.id}" rows="3" placeholder="Tu respuesta..." class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2"></textarea>
              <label class="text-xs flex items-center gap-1 mb-2"><input type="checkbox" id="pub-${q.id}" checked/> Publicar para toda la cohorte</label>
              <button onclick="answerQuestion(${q.id})" class="bg-slate-900 text-white text-xs px-3 py-1 rounded hover:bg-slate-700">Responder</button>
            </div>
          `).join('') || '<div class="text-center text-slate-400 py-6">Sin preguntas pendientes.</div>'}
        </div>
      `,
    };

    function setTab(name) {
      document.querySelectorAll('.mentor-tab').forEach(b => {
        b.classList.toggle('border-slate-900', b.dataset.tab === name);
        b.classList.toggle('border-transparent', b.dataset.tab !== name);
      });
      document.getElementById('mentor-tab-content').innerHTML = tabs[name]();
    }
    document.querySelectorAll('.mentor-tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    setTab('students');
  };

  window.approveProgress = async function (progressId) {
    const { error } = await supabase.from('edu_student_progress')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewer_id: (await getCurrentUser()).id })
      .eq('id', progressId);
    if (error) return alert(error.message);
    toast('Aprobada ✓');
    window.openEducationMentor();
  };

  window.answerQuestion = async function (qid) {
    const answer = document.getElementById('ans-' + qid).value.trim();
    const is_published = document.getElementById('pub-' + qid).checked;
    if (!answer) return alert('Escribe la respuesta');
    const { error } = await supabase.from('edu_questions')
      .update({ answer, is_published, answered_at: new Date().toISOString(), answered_by: (await getCurrentUser()).id })
      .eq('id', qid);
    if (error) return alert(error.message);
    toast('Respondida ✓');
    window.openEducationMentor();
  };

  window.openStudentDetail = async function (studentId) {
    const { data: stu } = await supabase.from('edu_students').select('*').eq('id', studentId).single();
    const { data: enr } = await supabase.from('edu_enrollments').select('*, edu_cohorts(*)').eq('student_id', studentId).maybeSingle();
    const { data: prog } = await supabase.from('edu_student_progress')
      .select('*, edu_curriculum_tasks(code,title)').eq('enrollment_id', enr?.id || 0).order('submitted_at', { ascending: false });
    openModal(`Estudiante: ${stu?.full_name || ''}`, `
      <div class="space-y-3">
        <div class="text-sm">
          <strong>Ciudad inversión:</strong> ${escapeHtml(stu?.city_invest || '—')}, ${escapeHtml(stu?.state_invest || '')}<br>
          <strong>Capital:</strong> $${(stu?.capital_available || 0).toLocaleString()}<br>
          <strong>Big Why:</strong> ${escapeHtml(stu?.big_why || '—')}<br>
          <strong>Etapa actual:</strong> ${enr?.current_stage || '—'}<br>
          <strong>Cohorte:</strong> ${enr?.edu_cohorts?.code || '—'}
        </div>
        <div class="border-t pt-3">
          <div class="text-sm font-semibold mb-2">Últimas tareas:</div>
          <div class="max-h-96 overflow-y-auto space-y-1">
            ${(prog || []).slice(0, 30).map(p => `
              <div class="text-xs flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer" onclick="openTaskDetail(${p.task_id})">
                <span>${ ({pending:'⚪',in_progress:'🟡',submitted:'🔵',approved:'🟢',blocked:'🔴'})[p.status] || '⚪' }</span>
                <span class="font-mono">${p.edu_curriculum_tasks?.code}</span>
                <span class="flex-1 truncate">${escapeHtml(p.edu_curriculum_tasks?.title || '')}</span>
              </div>
            `).join('') || '<div class="text-slate-400">Sin actividad</div>'}
          </div>
        </div>
      </div>
    `);
  };

  window.addStudentModal = function () {
    openModal('Agregar estudiante', `
      <div class="space-y-3">
        <input id="ns-email" placeholder="Email del estudiante" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <input id="ns-name" placeholder="Nombre completo" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <input id="ns-state" placeholder="Estado donde invierte (FL, TX...)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <button onclick="createStudent()" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">Crear</button>
        <p class="text-xs text-slate-500">El estudiante se vincula a su cuenta cuando hace signup con el mismo email.</p>
      </div>
    `);
  };

  window.createStudent = async function () {
    const email = document.getElementById('ns-email').value.trim();
    const full_name = document.getElementById('ns-name').value.trim();
    const state = document.getElementById('ns-state').value.trim();
    if (!email || !full_name) return alert('Email y nombre requeridos');
    const { error } = await supabase.from('edu_students').insert({ full_name, state_invest: state, status: 'lead' });
    if (error) return alert(error.message);
    toast('Estudiante creado: ' + email);
    closeModal();
    window.openEducationMentor();
  };

  window.addCohortModal = function () {
    openModal('Nueva cohorte', `
      <div class="space-y-3">
        <input id="nc-code" placeholder="Código (2026-Q1)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <input id="nc-name" placeholder="Nombre" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <input id="nc-start" type="date" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <input id="nc-cap" type="number" placeholder="Capacidad (20)" value="20" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <button onclick="createCohort()" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">Crear</button>
      </div>
    `);
  };

  window.createCohort = async function () {
    const payload = {
      code: document.getElementById('nc-code').value.trim(),
      name: document.getElementById('nc-name').value.trim(),
      starts_on: document.getElementById('nc-start').value,
      capacity: parseInt(document.getElementById('nc-cap').value || '20'),
      status: 'active',
    };
    const { error } = await supabase.from('edu_cohorts').insert(payload);
    if (error) return alert(error.message);
    toast('Cohorte creada ✓');
    closeModal();
    window.openEducationMentor();
  };

  // =========================================================================
  // VISTA 5 · CURRICULUM (admin edita)
  // =========================================================================
  window.openEducationCurriculum = async function () {
    try { await getCurrentUser(); } catch(e){}
    const root = document.getElementById('content');
    if (!isMentor()) { root.innerHTML = `<div class="text-center text-red-600 py-12">Acceso restringido. Rol detectado: <strong>${role()}</strong></div>`; return; }
    await loadCurriculum(true);
    root.innerHTML = `
      <div class="max-w-5xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-3xl font-bold">✏️ Curriculum</h1>
          <div class="text-sm text-slate-500">${CURRICULUM.tasks.length} tareas · ${CURRICULUM.blocks.length} bloques · ${CURRICULUM.stages.length} etapas</div>
        </div>
        ${CURRICULUM.stages.map(s => {
          const blocks = CURRICULUM.blocks.filter(b => b.stage_id === s.id);
          return `
            <details class="bg-white border border-slate-200 rounded-xl p-4 mb-3" open>
              <summary class="cursor-pointer text-lg font-semibold">${s.emoji} <span class="font-mono text-sm text-slate-400">${s.code}</span> ${escapeHtml(s.title)}</summary>
              <div class="mt-3 space-y-2">
                ${blocks.map(b => {
                  const ts = CURRICULUM.tasks.filter(t => t.block_id === b.id);
                  return `
                    <div class="bg-slate-50 rounded-lg p-3">
                      <div class="text-sm font-semibold mb-2"><span class="font-mono text-slate-400 text-xs">${b.code}</span> ${escapeHtml(b.title)}</div>
                      <div class="text-xs space-y-1">
                        ${ts.map(t => `
                          <div class="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer" onclick="openTaskDetail(${t.id})">
                            <span class="font-mono text-slate-400">${t.code}</span>
                            <span class="flex-1">${escapeHtml(t.title)}</span>
                            ${t.is_critical ? '<span class="text-amber-600">★</span>' : ''}
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </details>
          `;
        }).join('')}
      </div>
    `;
  };

  // =========================================================================
  // VISTA 6 · GESTOR DE ESTUDIANTES (CRUD admin)
  // =========================================================================
  window.openEducationStudentsMgr = async function () {
    try { await getCurrentUser(); } catch(e){}
    const root = document.getElementById('content');
    if (!isMentor()) { root.innerHTML = `<div class="text-center text-red-600 py-12">Acceso restringido. Rol detectado: <strong>${role()}</strong></div>`; return; }
    root.innerHTML = `<div class="text-center text-slate-500 py-12">Cargando gestor…</div>`;

    const [{ data: students }, { data: cohorts }, { data: enrollments }] = await Promise.all([
      supabase.from('edu_students').select('*').order('joined_at', { ascending: false }),
      supabase.from('edu_cohorts').select('*').order('starts_on', { ascending: false }),
      supabase.from('edu_enrollments').select('*, edu_students(full_name), edu_cohorts(code,name)'),
    ]);

    const enrollmentsByStudent = {};
    (enrollments || []).forEach(e => {
      enrollmentsByStudent[e.student_id] = e;
    });

    root.innerHTML = `
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-3xl font-bold">🧑‍🎓 Gestor de Estudiantes</h1>
          <div class="flex gap-2">
            <button onclick="addStudentModal()" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">+ Estudiante</button>
            <button onclick="addCohortModal()" class="bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-slate-50">+ Cohorte</button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs text-slate-500">Estudiantes registrados</div>
            <div class="text-3xl font-bold">${students?.length || 0}</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs text-slate-500">Cohortes</div>
            <div class="text-3xl font-bold">${cohorts?.length || 0}</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs text-slate-500">Activos en cohorte</div>
            <div class="text-3xl font-bold">${(enrollments || []).filter(e => e.status === 'active').length}</div>
          </div>
        </div>

        <h2 class="text-lg font-semibold mb-2">Cohortes</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          ${(cohorts || []).map(c => {
            const cnt = (enrollments || []).filter(e => e.cohort_id === c.id).length;
            return `
              <div class="bg-white border border-slate-200 rounded-xl p-4">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-mono text-slate-400">${escapeHtml(c.code)}</span>
                  <span class="text-xs bg-${c.status === 'active' ? 'green' : 'slate'}-100 text-${c.status === 'active' ? 'green' : 'slate'}-700 px-2 py-0.5 rounded">${c.status}</span>
                </div>
                <div class="font-semibold">${escapeHtml(c.name)}</div>
                <div class="text-xs text-slate-500 mt-1">Inicio: ${c.starts_on || '—'} · ${cnt}/${c.capacity || 20} alumnos</div>
              </div>
            `;
          }).join('') || '<div class="text-sm text-slate-400 col-span-3">Aún no hay cohortes. Crea la primera.</div>'}
        </div>

        <h2 class="text-lg font-semibold mb-2">Estudiantes</h2>
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th class="text-left p-3">Nombre</th>
                <th class="text-left p-3">Estado inv.</th>
                <th class="text-left p-3">Capital</th>
                <th class="text-left p-3">Cohorte</th>
                <th class="text-left p-3">Status</th>
                <th class="text-left p-3">Unido</th>
                <th class="p-3"></th>
              </tr>
            </thead>
            <tbody>
              ${(students || []).map(s => {
                const enr = enrollmentsByStudent[s.id];
                return `
                  <tr class="border-t border-slate-100 hover:bg-slate-50">
                    <td class="p-3 font-medium">${escapeHtml(s.full_name)}</td>
                    <td class="p-3 text-xs">${escapeHtml(s.state_invest || '—')}</td>
                    <td class="p-3 text-xs">$${(s.capital_available || 0).toLocaleString()}</td>
                    <td class="p-3 text-xs">${enr?.edu_cohorts?.code || '<span class="text-amber-700">sin cohorte</span>'}</td>
                    <td class="p-3 text-xs"><span class="bg-${s.status === 'active' ? 'green' : 'slate'}-100 text-${s.status === 'active' ? 'green' : 'slate'}-700 px-2 py-0.5 rounded">${s.status}</span></td>
                    <td class="p-3 text-xs text-slate-500">${fmtDate(s.joined_at)}</td>
                    <td class="p-3 text-right">
                      <button onclick="openStudentDetail(${s.id})" class="text-xs text-blue-600 hover:underline">Ver</button>
                      <button onclick="editStudentModal(${s.id})" class="text-xs text-slate-600 hover:underline ml-2">Editar</button>
                    </td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="7" class="p-6 text-center text-slate-400">No hay estudiantes aún.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  window.editStudentModal = async function (studentId) {
    const { data: s } = await supabase.from('edu_students').select('*').eq('id', studentId).single();
    openModal('Editar estudiante', `
      <div class="space-y-3">
        <input id="es-name" placeholder="Nombre completo" value="${escapeHtml(s.full_name || '')}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <input id="es-phone" placeholder="Teléfono" value="${escapeHtml(s.phone || '')}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <input id="es-wa" placeholder="WhatsApp (+57...)" value="${escapeHtml(s.whatsapp || '')}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <div class="grid grid-cols-2 gap-2">
          <input id="es-city" placeholder="Ciudad inversión" value="${escapeHtml(s.city_invest || '')}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
          <input id="es-state" placeholder="Estado (FL...)" value="${escapeHtml(s.state_invest || '')}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        </div>
        <input id="es-capital" type="number" placeholder="Capital disponible USD" value="${s.capital_available || 0}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <textarea id="es-why" rows="2" placeholder="Big Why" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">${escapeHtml(s.big_why || '')}</textarea>
        <select id="es-status" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="lead" ${s.status === 'lead' ? 'selected' : ''}>Lead</option>
          <option value="active" ${s.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="paused" ${s.status === 'paused' ? 'selected' : ''}>Paused</option>
          <option value="graduated" ${s.status === 'graduated' ? 'selected' : ''}>Graduated</option>
          <option value="dropped" ${s.status === 'dropped' ? 'selected' : ''}>Dropped</option>
        </select>
        <button onclick="saveStudent(${studentId})" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">Guardar</button>
      </div>
    `);
  };

  window.saveStudent = async function (studentId) {
    const payload = {
      full_name: document.getElementById('es-name').value.trim(),
      phone: document.getElementById('es-phone').value.trim() || null,
      whatsapp: document.getElementById('es-wa').value.trim() || null,
      city_invest: document.getElementById('es-city').value.trim() || null,
      state_invest: document.getElementById('es-state').value.trim() || null,
      capital_available: parseFloat(document.getElementById('es-capital').value || '0'),
      big_why: document.getElementById('es-why').value.trim() || null,
      status: document.getElementById('es-status').value,
    };
    const { error } = await supabase.from('edu_students').update(payload).eq('id', studentId);
    if (error) return alert(error.message);
    toast('Guardado ✓');
    closeModal();
    window.openEducationStudentsMgr();
  };

  // =========================================================================
  // VISTA 7 · REPORTES & KPIs
  // =========================================================================
  window.openEducationReports = async function () {
    try { await getCurrentUser(); } catch(e){}
    const root = document.getElementById('content');
    if (!isMentor()) { root.innerHTML = `<div class="text-center text-red-600 py-12">Acceso restringido. Rol detectado: <strong>${role()}</strong></div>`; return; }
    root.innerHTML = `<div class="text-center text-slate-500 py-12">Calculando reportes…</div>`;
    await loadCurriculum();

    const [{ data: scorecard }, { data: progressAll }, { data: enrollments }] = await Promise.all([
      supabase.from('edu_scorecard').select('*').order('pct_complete', { ascending: false }),
      supabase.from('edu_student_progress').select('task_id, status, enrollment_id'),
      supabase.from('edu_enrollments').select('id, current_stage, status'),
    ]);

    // Embudo por etapa: % de estudiantes que han tocado tareas de cada etapa
    const totalStudents = (enrollments || []).filter(e => e.status === 'active').length || 1;
    const stageDistribution = {};
    CURRICULUM.stages.forEach(s => stageDistribution[s.code] = 0);
    (enrollments || []).forEach(e => {
      if (e.status === 'active' && e.current_stage) {
        stageDistribution[e.current_stage] = (stageDistribution[e.current_stage] || 0) + 1;
      }
    });

    // Top 3 tareas más completadas
    const taskCounts = {};
    (progressAll || []).forEach(p => {
      if (['approved', 'submitted'].includes(p.status)) {
        taskCounts[p.task_id] = (taskCounts[p.task_id] || 0) + 1;
      }
    });
    const topTasks = Object.entries(taskCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([tid, count]) => {
        const t = CURRICULUM.tasks.find(x => x.id === parseInt(tid));
        return { code: t?.code, title: t?.title, count };
      });

    // Tareas más bloqueadas
    const blocked = {};
    (progressAll || []).forEach(p => {
      if (p.status === 'blocked') blocked[p.task_id] = (blocked[p.task_id] || 0) + 1;
    });
    const topBlocked = Object.entries(blocked).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([tid, count]) => {
        const t = CURRICULUM.tasks.find(x => x.id === parseInt(tid));
        return { code: t?.code, title: t?.title, count };
      });

    const avg = (scorecard?.length ? Math.round(scorecard.reduce((a, s) => a + (s.pct_complete || 0), 0) / scorecard.length) : 0);

    root.innerHTML = `
      <div class="max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold mb-2">📊 Reportes & KPIs</h1>
        <p class="text-sm text-slate-500 mb-6">Métricas agregadas del programa · Actualizado: ${new Date().toLocaleString()}</p>

        <!-- KPIs -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs text-slate-500">Estudiantes activos</div>
            <div class="text-3xl font-bold">${totalStudents}</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs text-slate-500">Avance promedio</div>
            <div class="text-3xl font-bold">${avg}%</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs text-slate-500">Tareas total programa</div>
            <div class="text-3xl font-bold">${CURRICULUM.tasks.length}</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs text-slate-500">Aprobadas (todas)</div>
            <div class="text-3xl font-bold">${(progressAll || []).filter(p => p.status === 'approved').length}</div>
          </div>
        </div>

        <!-- Embudo por etapa -->
        <div class="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 class="font-semibold mb-3">🌊 Embudo: dónde están los estudiantes</h2>
          ${CURRICULUM.stages.map(s => {
            const cnt = stageDistribution[s.code] || 0;
            const pct = Math.round(100 * cnt / totalStudents);
            return `
              <div class="mb-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-mono text-xs text-slate-400">${s.code}</span>
                  <span>${s.emoji} ${escapeHtml(s.title)}</span>
                  <span class="text-xs font-semibold">${cnt} (${pct}%)</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-3 mt-1">
                  <div class="bg-amber-500 h-3 rounded-full" style="width:${pct}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Leaderboard -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <h2 class="font-semibold mb-3">🏆 Top estudiantes</h2>
            ${(scorecard || []).slice(0, 10).map((s, i) => `
              <div class="flex items-center gap-2 text-sm py-1 border-b border-slate-100 last:border-0">
                <span class="text-slate-400 font-mono w-6">${i + 1}.</span>
                <span class="flex-1 truncate">${escapeHtml(s.full_name)}</span>
                <span class="text-xs font-semibold">${s.pct_complete || 0}%</span>
              </div>
            `).join('') || '<div class="text-sm text-slate-400">Sin datos aún.</div>'}
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <h2 class="font-semibold mb-3">⚠️ Tareas más bloqueadas</h2>
            ${topBlocked.length ? topBlocked.map(t => `
              <div class="flex items-center gap-2 text-sm py-1 border-b border-slate-100 last:border-0">
                <span class="font-mono text-xs text-slate-400">${t.code}</span>
                <span class="flex-1 truncate">${escapeHtml(t.title || '')}</span>
                <span class="text-xs font-semibold text-red-600">${t.count}</span>
              </div>
            `).join('') : '<div class="text-sm text-slate-400">✨ Nadie atascado</div>'}
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h2 class="font-semibold mb-3">✅ Tareas más completadas</h2>
          ${topTasks.length ? topTasks.map(t => `
            <div class="flex items-center gap-2 text-sm py-1 border-b border-slate-100 last:border-0">
              <span class="font-mono text-xs text-slate-400">${t.code}</span>
              <span class="flex-1 truncate">${escapeHtml(t.title || '')}</span>
              <span class="text-xs font-semibold text-green-700">${t.count} alumnos</span>
            </div>
          `).join('') : '<div class="text-sm text-slate-400">Sin completions todavía.</div>'}
        </div>
      </div>
    `;
  };

  // =========================================================================
  // VISTA 8 · MATERIAL & PRESENTACIONES
  // =========================================================================
  window.openEducationMaterials = async function () {
    try { await getCurrentUser(); } catch(e){}
    const root = document.getElementById('content');
    root.innerHTML = `<div class="text-center text-slate-500 py-12">Cargando material…</div>`;
    await loadCurriculum();

    const { data: materials } = await supabase.from('edu_materials').select('*').order('uploaded_at', { ascending: false });

    const byStage = {};
    (materials || []).forEach(m => {
      const key = m.stage_code || 'transversal';
      (byStage[key] = byStage[key] || []).push(m);
    });

    root.innerHTML = `
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-3xl font-bold">🎤 Material & Presentaciones</h1>
            <p class="text-sm text-slate-500 mt-1">${materials?.length || 0} recursos · PDFs, decks, videos del programa</p>
          </div>
          ${isMentor() ? `<button onclick="addMaterialModal()" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">+ Subir material</button>` : ''}
        </div>

        ${CURRICULUM.stages.map(s => {
          const items = byStage[s.code] || [];
          if (!items.length) return '';
          return `
            <div class="mb-6">
              <h2 class="text-lg font-semibold mb-2">${s.emoji} <span class="font-mono text-sm text-slate-400">${s.code}</span> ${escapeHtml(s.title)}</h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                ${items.map(m => `
                  <div class="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition">
                    <div class="text-xs text-slate-400 mb-1">${m.kind.toUpperCase()}</div>
                    <div class="font-semibold text-slate-900">${escapeHtml(m.title)}</div>
                    <div class="text-xs text-slate-600 mt-1">${escapeHtml(m.description || '')}</div>
                    ${m.file_url ? `<a href="${m.file_url}" target="_blank" class="inline-block mt-3 text-xs text-blue-600 hover:underline">Abrir →</a>` : '<div class="text-xs text-slate-400 mt-3">Sin archivo subido</div>'}
                    ${isMentor() ? `<button onclick="deleteMaterial(${m.id})" class="text-xs text-red-500 hover:underline ml-2">Borrar</button>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}

        ${(byStage['transversal'] || []).length ? `
          <div class="mb-6">
            <h2 class="text-lg font-semibold mb-2">📂 Transversal</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              ${byStage['transversal'].map(m => `
                <div class="bg-white border border-slate-200 rounded-xl p-4">
                  <div class="text-xs text-slate-400 mb-1">${m.kind.toUpperCase()}</div>
                  <div class="font-semibold">${escapeHtml(m.title)}</div>
                  <div class="text-xs text-slate-600 mt-1">${escapeHtml(m.description || '')}</div>
                  ${m.file_url ? `<a href="${m.file_url}" target="_blank" class="inline-block mt-3 text-xs text-blue-600 hover:underline">Abrir →</a>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${!materials?.length ? '<div class="text-center text-slate-400 py-12">Aún no hay materiales subidos.</div>' : ''}
      </div>
    `;
  };

  window.addMaterialModal = function () {
    openModal('Subir material', `
      <div class="space-y-3">
        <input id="mat-title" placeholder="Título" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <select id="mat-kind" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="pdf">📄 PDF</option>
          <option value="deck">🎤 Presentación</option>
          <option value="video">🎥 Video</option>
          <option value="doc">📝 Documento</option>
          <option value="other">Otro</option>
        </select>
        <select id="mat-stage" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="">— Transversal —</option>
          ${CURRICULUM.stages.map(s => `<option value="${s.code}">${s.emoji} ${s.code} — ${escapeHtml(s.title)}</option>`).join('')}
        </select>
        <textarea id="mat-desc" rows="2" placeholder="Descripción" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"></textarea>
        <input id="mat-url" type="url" placeholder="URL del archivo (Drive, Dropbox, YouTube...)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"/>
        <button onclick="saveMaterial()" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">Guardar</button>
      </div>
    `);
  };

  window.saveMaterial = async function () {
    const payload = {
      title: document.getElementById('mat-title').value.trim(),
      kind: document.getElementById('mat-kind').value,
      stage_code: document.getElementById('mat-stage').value || null,
      description: document.getElementById('mat-desc').value.trim() || null,
      file_url: document.getElementById('mat-url').value.trim() || null,
      uploaded_by: (await getCurrentUser()).id,
    };
    if (!payload.title) return alert('Título requerido');
    const { error } = await supabase.from('edu_materials').insert(payload);
    if (error) return alert(error.message);
    toast('Material guardado ✓');
    closeModal();
    window.openEducationMaterials();
  };

  window.deleteMaterial = async function (id) {
    if (!confirm('¿Borrar este material?')) return;
    const { error } = await supabase.from('edu_materials').delete().eq('id', id);
    if (error) return alert(error.message);
    toast('Borrado ✓');
    window.openEducationMaterials();
  };

  // Preload del user en background apenas carga el script (mejora primer click)
  getCurrentUser().catch(() => {});

})();
