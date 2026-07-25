// ════════════════════════════════════════════════════════════
// 📊 Informe ejecutivo + KPIs (extraído de education.js)
// Depende de: eduState, eduKpisCache (definido aquí), sb,
// state, eduCurrentMentorship, eduRenderReportsStandalone (override)
// ════════════════════════════════════════════════════════════

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
        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold uppercase">${osIcon('clock')} Tiempo promedio en cada etapa</div>
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
        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold uppercase">${osIcon('user')} No-shows por coach (este mes)</div>
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
        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold uppercase">${osIcon('alert')} Top motivos no-asistencia</div>
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
        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold uppercase text-red-700">${osIcon('alert')} Inactivos >30d (top 10)</div>
        <div class="p-2 max-h-64 overflow-y-auto">
          ${(kpis.inactivos||[]).length === 0 ? `<div class="text-xs text-emerald-700 italic p-3 text-center">${osIcon('check-circle')} Todos tuvieron sesión en últimos 30 días.</div>` : `
            <table class="w-full text-xs">
              <thead><tr class="text-[10px] uppercase text-slate-500"><th class="text-left p-1">Estudiante</th><th class="text-left p-1">Etapa</th><th class="text-right p-1">Días</th><th></th></tr></thead>
              <tbody>
                ${kpis.inactivos.slice(0,10).map(i => `<tr class="border-t border-slate-100">
                  <td class="p-1 truncate max-w-[140px]"><button onclick="eduShowStudentDetail('${i.student_id}')" class="text-blue-600 hover:underline text-left">${(i.full_name||'?').replace(/</g,'&lt;')}</button></td>
                  <td class="p-1 truncate max-w-[100px] text-slate-600">${i.current_stage||'—'}</td>
                  <td class="p-1 text-right font-bold ${i.dias_inactivo>60?'text-red-700':'text-amber-700'}">${i.dias_inactivo}d</td>
                  <td class="p-1 text-right">${i.email ? `<a href="mailto:${i.email}" class="text-blue-600 text-[10px]">${osIcon('mail')}</a>` : ''}</td>
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
    return alert('El plan guardado no tiene las respuestas del diagnóstico (formato viejo).\n\nRegenerá el plan desde el botón "Regenerar" para tener el análisis profundo.');
  }

  // Recalcular usando los mismos motores de FM para garantizar consistencia
  let result;
  try {
    if (typeof fmCalcularPerfil === 'function') {
      result = fmCalcularPerfil(answers);
    } else {
      // Fallback: usar el perfil del plan tal cual
      result = plan.perfil || { answers, perfil: { num:1, nombre:'Plan', emoji:osIcon('target') } };
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
        <button onclick="eduGenerateReportProfundoIA()" class="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-1.5 rounded">${osIcon('bot')} Narrativa con IA</button>
        <button onclick="eduInformePrint()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded">${osIcon('printer')} Imprimir / PDF</button>
        <button onclick="eduExportKpisCsv()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">${osIcon('inbox')} CSV</button>
      </div>

      <div id="edu-informe-print">
        ${eduRenderSeccion1Inventario(k)}
        ${eduRenderSeccion2Sesiones(k)}
        ${eduRenderSeccion3Desercion(k)}
        ${eduRenderSeccion4Resultados(k)}
        ${eduRenderSeccion5Calidad(k)}
        <div id="edu-informe-seccion6">
          <div class="bg-white border border-slate-200 rounded-lg p-4 mt-3">
            <div class="font-bold text-sm mb-1">${osIcon('clipboard')} 6. Diagnósticos & Planes (análisis profundo)</div>
            <div class="text-xs text-slate-500">Cargando agregaciones de diagnósticos y planes…</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
// 📋 SECCIÓN 6: DIAGNÓSTICOS & PLANES — análisis agregado
// Se renderiza async después de que el informe se monta (no bloquea)
// ════════════════════════════════════════════════════════════
async function eduCargarSeccion6Diagnosticos(mentorshipId) {
  const cont = document.getElementById('edu-informe-seccion6');
  if (!cont || !mentorshipId) return;
  try {
    const [invitesRes, plansRes, tasksRes] = await Promise.all([
      sb.from('edu_diagnostic_invites').select('id,student_id,answers,created_at,completed_at,result_plan_id').eq('mentorship_id', mentorshipId),
      sb.from('edu_student_plans').select('id,student_id,perfil,status,created_at').eq('mentorship_id', mentorshipId),
      sb.from('edu_student_plan_tasks').select('id,student_id,plan_id,bloque_id,bloque_etapa,bloque_subetapa,bloque_orden,completed,completed_at').eq('mentorship_id', mentorshipId)
    ]);
    const invites = invitesRes.data || [];
    const plans = plansRes.data || [];
    const tasks = tasksRes.data || [];
    cont.innerHTML = eduRenderSeccion6(invites, plans, tasks);
  } catch (e) {
    console.warn('seccion6', e);
    cont.innerHTML = `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800">Error cargando sección 6: ${e.message}</div>`;
  }
}

function eduRenderSeccion6(invites, plans, tasks) {
  const escFn = window.esc || (s => String(s||''));
  // ── Agregaciones de diagnósticos ──
  const totalInv = invites.length;
  const completados = invites.filter(i => i.completed_at).length;
  const pctCompl = totalInv ? Math.round(completados/totalInv*100) : 0;
  // Tiempo promedio para completar
  const tiempos = invites.filter(i => i.completed_at).map(i => (new Date(i.completed_at) - new Date(i.created_at))/(86400000));
  const avgDias = tiempos.length ? (tiempos.reduce((a,b)=>a+b,0)/tiempos.length).toFixed(1) : null;

  // Distribución por respuesta clave (las más estratégicas para marketing/ventas)
  const claves = ['objetivo','capital','capital_real','credit','llc','tiempo','deals_cerrados','mayor_obstaculo','mercado'];
  const distribuciones = {};
  claves.forEach(k => {
    const counts = {};
    invites.forEach(i => {
      const v = i.answers?.[k];
      if (v == null || v === '') return;
      const arr = Array.isArray(v) ? v : [v];
      arr.forEach(val => { counts[val] = (counts[val] || 0) + 1; });
    });
    const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    distribuciones[k] = sorted;
  });

  // ── Planes ──
  const activos = plans.filter(p => p.status === 'active');
  const perfilesDist = {};
  activos.forEach(p => {
    const n = p.perfil?.perfil?.nombre || p.perfil?.titulo || '—';
    perfilesDist[n] = (perfilesDist[n] || 0) + 1;
  });

  // ── Progreso de tareas ──
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.completed).length;
  const pctTasks = totalTasks ? Math.round(doneTasks/totalTasks*100) : 0;
  // Por bloque (etapa): cuánto se está completando
  const porBloque = {};
  tasks.forEach(t => {
    const k = `${t.bloque_etapa||'—'} · ${t.bloque_subetapa||'—'}`;
    if (!porBloque[k]) porBloque[k] = { total: 0, done: 0, etapa: t.bloque_etapa||'—' };
    porBloque[k].total++;
    if (t.completed) porBloque[k].done++;
  });
  const bloquesArr = Object.entries(porBloque).map(([k,v]) => ({ nombre: k, etapa: v.etapa, total: v.total, done: v.done, pct: v.total ? Math.round(v.done/v.total*100) : 0 })).sort((a,b)=>b.pct-a.pct);
  const top5Avance = bloquesArr.slice(0,5);
  const bottom5Avance = [...bloquesArr].sort((a,b)=>a.pct-b.pct).slice(0,5);

  // Top estudiantes por progreso (necesita group by student_id)
  const studentProgress = {};
  tasks.forEach(t => {
    if (!t.student_id) return;
    if (!studentProgress[t.student_id]) studentProgress[t.student_id] = { total: 0, done: 0, last: null };
    studentProgress[t.student_id].total++;
    if (t.completed) {
      studentProgress[t.student_id].done++;
      const ts = t.completed_at ? new Date(t.completed_at) : null;
      if (ts && (!studentProgress[t.student_id].last || ts > studentProgress[t.student_id].last)) {
        studentProgress[t.student_id].last = ts;
      }
    }
  });
  const studs = Object.entries(studentProgress).map(([id,v]) => ({ id, total: v.total, done: v.done, pct: v.total?Math.round(v.done/v.total*100):0, last: v.last }));
  const top5Estudiantes = [...studs].sort((a,b)=>b.pct-a.pct).slice(0,5);
  const inactivos = [...studs].filter(s => s.last).sort((a,b)=>a.last - b.last).slice(0,5);

  // Resolver nombres (usar eduState.students si está)
  const getName = (id) => {
    const s = (window.eduState?.students||[]).find(x => x.id === id);
    return s?.full_name || id.slice(0,8);
  };

  // Helper para distribución bar
  const distLabels = {
    'menos_20k':'<$20K','20_50k':'$20-50K','50_100k':'$50-100K','100_250k':'$100-250K','mas_250k':'>$250K',
    'todo':'100% líq','mitad':'~50% líq','minimo':'mínimo líq','teorico':'teórico',
    'mas_780':'>780','720_780':'720-780','660_720':'660-720','600_660':'600-660','menos_600':'<600','sin_historial':'sin historial',
    'si_mismo':'LLC mismo estado','si_otro':'LLC otro estado','no':'Sin LLC',
    'mas_30':'30+h','15_30':'15-30h','menos_15':'<15h',
    '0':'0','1_2':'1-2','3_5':'3-5','5_mas':'5+',
    'capital':'Capital','conocimiento':'Conocimiento','red':'Red','tiempo':'Tiempo','miedo':'Miedo','mercado':'Mercado','equipo':'Equipo',
    'fix_flip':'Fix & Flip','fix_hold':'Fix & Hold','hibrido':'Híbrido','wholesale':'Wholesale','lender':'Lender'
  };
  const lbl = v => distLabels[v] || v;

  const renderDist = (key, title) => {
    const data = distribuciones[key] || [];
    if (!data.length) return '';
    const total = data.reduce((a,b)=>a+b[1],0);
    return `
      <div class="bg-slate-50 rounded p-2.5">
        <div class="text-[10px] font-bold uppercase text-slate-600 mb-1">${escFn(title)}</div>
        <div class="space-y-0.5">
          ${data.map(([v,c]) => {
            const pct = Math.round(c/total*100);
            return `<div class="flex items-center gap-2 text-[11px]">
              <div class="w-24 truncate" title="${escFn(v)}">${escFn(lbl(v))}</div>
              <div class="flex-1 h-3 bg-white rounded-full overflow-hidden">
                <div class="h-full bg-blue-500" style="width:${pct}%"></div>
              </div>
              <div class="w-12 text-right font-bold">${c} <span class="text-slate-400">(${pct}%)</span></div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  };

  return `
    <div class="bg-white border border-slate-200 rounded-lg p-4 mt-3 space-y-3">
      <div>
        <div class="font-bold text-sm">${osIcon('clipboard')} 6. Diagnósticos & Planes (análisis profundo)</div>
        <div class="text-xs text-slate-500 mt-0.5">Data agregada de los formularios completados + planes asignados + progreso real de tareas.</div>
      </div>

      <!-- KPIs principales -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div class="bg-blue-50 border border-blue-200 rounded p-2">
          <div class="text-[10px] font-bold uppercase text-blue-700">Diagnósticos enviados</div>
          <div class="text-lg font-bold text-blue-900">${totalInv}</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded p-2">
          <div class="text-[10px] font-bold uppercase text-emerald-700">Completados</div>
          <div class="text-lg font-bold text-emerald-900">${completados} <span class="text-xs">(${pctCompl}%)</span></div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded p-2">
          <div class="text-[10px] font-bold uppercase text-amber-700">Avg días para completar</div>
          <div class="text-lg font-bold text-amber-900">${avgDias ?? '—'}${avgDias?'d':''}</div>
        </div>
        <div class="bg-violet-50 border border-violet-200 rounded p-2">
          <div class="text-[10px] font-bold uppercase text-violet-700">Planes activos</div>
          <div class="text-lg font-bold text-violet-900">${activos.length}</div>
        </div>
      </div>

      <!-- Progreso global de tareas -->
      <div class="bg-gradient-to-r from-slate-50 to-slate-100 rounded p-3">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="font-bold uppercase text-slate-600">Progreso global de tareas</span>
          <span class="font-bold">${doneTasks}/${totalTasks} (${pctTasks}%)</span>
        </div>
        <div class="h-2 bg-white rounded-full overflow-hidden">
          <div class="h-full bg-emerald-500" style="width:${pctTasks}%"></div>
        </div>
      </div>

      <!-- Distribución de respuestas clave -->
      <div>
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">${osIcon('chart')} Distribución de respuestas clave (para marketing/ventas)</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          ${renderDist('objetivo', 'Objetivo principal')}
          ${renderDist('mayor_obstaculo', 'Mayor obstáculo')}
          ${renderDist('capital', 'Capital declarado')}
          ${renderDist('capital_real', 'Liquidez del capital')}
          ${renderDist('credit', 'Credit score')}
          ${renderDist('llc', 'Estado de LLC')}
          ${renderDist('tiempo', 'Tiempo disponible')}
          ${renderDist('deals_cerrados', 'Deals cerrados (experiencia)')}
        </div>
      </div>

      <!-- Distribución de perfiles asignados -->
      ${Object.keys(perfilesDist).length ? `
        <div>
          <div class="text-xs font-bold uppercase text-slate-700 mb-2">${osIcon('target')} Perfiles asignados (planes activos)</div>
          <div class="bg-slate-50 rounded p-2.5 space-y-0.5">
            ${Object.entries(perfilesDist).sort((a,b)=>b[1]-a[1]).map(([n,c]) => {
              const totalActivos = activos.length;
              const pct = totalActivos ? Math.round(c/totalActivos*100) : 0;
              return `<div class="flex items-center gap-2 text-[11px]">
                <div class="flex-1 truncate" title="${escFn(n)}">${escFn(n)}</div>
                <div class="w-24 h-3 bg-white rounded-full overflow-hidden">
                  <div class="h-full bg-violet-500" style="width:${pct}%"></div>
                </div>
                <div class="w-12 text-right font-bold">${c} <span class="text-slate-400">(${pct}%)</span></div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

      <!-- Top estudiantes por progreso -->
      ${top5Estudiantes.length ? `
        <div>
          <div class="text-xs font-bold uppercase text-slate-700 mb-2">${osIcon('trophy')} Top 5 estudiantes con más avance</div>
          <div class="bg-emerald-50 rounded p-2 space-y-0.5">
            ${top5Estudiantes.map(s => `
              <div class="flex items-center gap-2 text-[11px]">
                <div class="flex-1 truncate font-bold">${escFn(getName(s.id))}</div>
                <div class="w-24 h-3 bg-white rounded-full overflow-hidden"><div class="h-full bg-emerald-500" style="width:${s.pct}%"></div></div>
                <div class="w-20 text-right">${s.done}/${s.total} (${s.pct}%)</div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}

      <!-- Estudiantes más inactivos -->
      ${inactivos.length ? `
        <div>
          <div class="text-xs font-bold uppercase text-slate-700 mb-2">${osIcon('alert')} Estudiantes con actividad más antigua (riesgo)</div>
          <div class="bg-red-50 rounded p-2 space-y-0.5">
            ${inactivos.map(s => {
              const dias = s.last ? Math.floor((Date.now() - s.last)/86400000) : null;
              return `<div class="flex items-center gap-2 text-[11px]">
                <div class="flex-1 truncate font-bold">${escFn(getName(s.id))}</div>
                <div class="text-amber-700">${s.done}/${s.total} tareas</div>
                <div class="w-24 text-right text-red-700 font-bold">${dias!=null?dias+'d sin acción':'—'}</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

      <!-- Bloques: top + bottom avance -->
      ${top5Avance.length ? `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">${osIcon('check-circle')} Bloques más completados</div>
            <div class="bg-emerald-50 rounded p-2 space-y-0.5">
              ${top5Avance.map(b => `
                <div class="flex items-center gap-2 text-[11px]">
                  <div class="flex-1 truncate" title="${escFn(b.nombre)}">${escFn(b.nombre)}</div>
                  <div class="font-bold text-emerald-700">${b.pct}%</div>
                  <div class="w-16 text-right text-slate-500">${b.done}/${b.total}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <div>
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">${osIcon('loader')} Bloques con menos progreso</div>
            <div class="bg-amber-50 rounded p-2 space-y-0.5">
              ${bottom5Avance.map(b => `
                <div class="flex items-center gap-2 text-[11px]">
                  <div class="flex-1 truncate" title="${escFn(b.nombre)}">${escFn(b.nombre)}</div>
                  <div class="font-bold text-amber-700">${b.pct}%</div>
                  <div class="w-16 text-right text-slate-500">${b.done}/${b.total}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>` : ''}

      <!-- Insights resumen -->
      <div class="bg-slate-900 text-white rounded p-3 text-xs">
        <div class="font-bold text-amber-300 uppercase text-[10px] mb-1">${osIcon('lightbulb')} INSIGHTS PARA DECISIONES</div>
        <ul class="space-y-1">
          <li>• <strong>Tasa de completación de diagnóstico:</strong> ${pctCompl}%. ${pctCompl < 70 ? 'Hay que mejorar el follow-up de invites pendientes — quizás recordatorio automático a las 48h.' : 'Buen ratio. Mantener la cadencia de envío.'}</li>
          ${avgDias ? `<li>• <strong>Tiempo promedio para completar:</strong> ${avgDias} días. ${avgDias > 3 ? 'Es alto — explorar enviar el link justo después del primer call.' : 'Rápido — los estudiantes responden con interés inicial.'}</li>` : ''}
          ${pctTasks < 30 ? `<li>• <strong>Progreso global bajo (${pctTasks}%):</strong> revisar bloques con menos progreso — pueden ser muy largos o poco claros.</li>` : `<li>• <strong>Progreso global saludable (${pctTasks}%).</strong></li>`}
          ${inactivos.length ? `<li>• <strong>${inactivos.length} estudiantes inactivos detectados:</strong> activar campaña de re-engagement (WhatsApp + call programado).</li>` : ''}
          ${Object.keys(perfilesDist).length ? `<li>• <strong>Perfil más común:</strong> "${escFn(Object.entries(perfilesDist).sort((a,b)=>b[1]-a[1])[0][0])}". Diseñar material de marketing específico para este target.</li>` : ''}
        </ul>
      </div>
    </div>
  `;
}

window.eduCargarSeccion6Diagnosticos = eduCargarSeccion6Diagnosticos;

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
        <h3 class="font-bold text-sm">${osIcon('clipboard')} Sección 1 · Inventario de la cartera</h3>
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
            <div class="text-xs font-bold uppercase text-red-800 mb-2">${osIcon('alert')} Cuellos de botella (etapas lentas)</div>
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
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">${osIcon('phone')} Sección 2 · Operación de sesiones</h3></div>
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
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">${osIcon('door')} Sección 3 · Deserción y retención</h3></div>
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
          <div class="bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">${osIcon('trending-down')} Churns del mes (con motivo)</div>
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
            <div class="text-xs font-bold uppercase text-red-800 mb-2">${osIcon('alert')} Estudiantes en riesgo (top 10)</div>
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
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">${osIcon('target')} Sección 4 · Resultados de negocio</h3></div>
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
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">${osIcon('trophy')} Top deals cerrados</div>
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
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">${osIcon('chart')} NPS breakdown</div>
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
  const tierLabels = { sin_historial:'Sin historial', reconstruir:'Reconstruir', limitado:'Limitado', bueno:'Bueno', excelente:'Excelente' };

  return `
    <section class="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4">
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">${osIcon('book')} Sección 5 · Calidad pedagógica</h3></div>
      <div class="p-4 space-y-4">
        <!-- Bloques que tranquean vs que avanzan -->
        <div class="grid md:grid-cols-2 gap-3">
          <div class="border border-red-200 rounded p-3 bg-red-50">
            <div class="text-xs font-bold uppercase text-red-800 mb-2">Bloques que tranquean (menos completados)</div>
            ${bajos.length === 0 ? `<div class="text-xs text-slate-400 italic">—</div>` : `
              <ul class="text-xs space-y-2">
                ${bajos.map(b => `<li><div class="font-medium">${(b.bloque_subetapa||b.bloque_id||'?').replace(/</g,'&lt;')}</div><div class="text-[10px] text-slate-600">${(b.bloque_etapa||'').replace(/</g,'&lt;')} · ${b.completadas||0}/${b.tareas_totales||0} (<span class="font-bold text-red-700">${b.pct_completado||0}%</span>)</div></li>`).join('')}
              </ul>
            `}
          </div>
          <div class="border border-emerald-200 rounded p-3 bg-emerald-50">
            <div class="text-xs font-bold uppercase text-emerald-800 mb-2">${osIcon('rocket')} Bloques que avanzan (más completados)</div>
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
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">${osIcon('credit-card')} Diagnósticos crédito por perfil</div>
            ${Object.keys(tiers).length === 0 ? `<div class="text-xs text-slate-400 italic">Sin diagnósticos generados.</div>` : `
              <ul class="text-xs space-y-1">
                ${Object.entries(tiers).sort((a,b)=>b[1]-a[1]).map(([tier,n]) => `<li class="flex justify-between"><span>${tierLabels[tier]||tier}</span><span class="font-bold">${n}</span></li>`).join('')}
              </ul>
            `}
          </div>
          <div class="border border-slate-200 rounded p-3">
            <div class="text-xs font-bold uppercase text-slate-700 mb-2">${osIcon('user')} Coaches activos (este mes)</div>
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
