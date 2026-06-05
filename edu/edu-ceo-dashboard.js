// ════════════════════════════════════════════════════════════
// 📈 Dashboard CEO — vista ejecutiva de Educación
// Consume vistas SQL de supabase/edu-ceo-dashboard-schema.sql
// Diseñado para un CEO/Founder: 1 mirada = entender el área en 30s.
// ════════════════════════════════════════════════════════════

let eduCeoCache = { key: null, data: null, loading: false };

async function eduCeoLoad(mentorshipId) {
  if (!mentorshipId) return null;
  if (eduCeoCache.key === mentorshipId && eduCeoCache.data) return eduCeoCache.data;
  if (eduCeoCache.loading) return null;
  eduCeoCache.loading = true;
  const safe = (p, fallback) => p.then(r => r).catch(e => { console.warn('[ceo]', e?.message || e); return { data: fallback }; });
  try {
    const [snapshot, funnel, cuellos, conversion, motivos, revenue, health, tendencia, okrs, retencion] = await Promise.all([
      safe(sb.from('edu_ceo_snapshot').select('*').eq('mentorship_id', mentorshipId).maybeSingle(), null),
      safe(sb.from('edu_ceo_funnel').select('*').eq('mentorship_id', mentorshipId), []),
      safe(sb.from('edu_ceo_cuellos_botella').select('*').eq('mentorship_id', mentorshipId), []),
      safe(sb.from('edu_ceo_conversion_etapas').select('*').eq('mentorship_id', mentorshipId), []),
      safe(sb.from('edu_ceo_motivos_desercion').select('*').eq('mentorship_id', mentorshipId).limit(10), []),
      safe(sb.from('edu_ceo_revenue').select('*').eq('mentorship_id', mentorshipId).maybeSingle(), null),
      safe(sb.from('edu_ceo_health_score').select('*').eq('mentorship_id', mentorshipId).maybeSingle(), null),
      safe(sb.from('edu_ceo_tendencia_6m').select('*').eq('mentorship_id', mentorshipId).order('mes'), []),
      safe(sb.from('edu_okr_targets').select('*').or(`mentorship_id.eq.${mentorshipId},mentorship_id.is.null`).eq('active', true), []),
      safe(sb.from('edu_kpi_retencion_cohort').select('*').eq('mentorship_id', mentorshipId).order('cohort_mes', { ascending: false }).limit(6), [])
    ]);
    eduCeoCache = {
      key: mentorshipId, loading: false,
      data: {
        snapshot: snapshot?.data || null,
        funnel: funnel?.data || [],
        cuellos: cuellos?.data || [],
        conversion: conversion?.data || [],
        motivos: motivos?.data || [],
        revenue: revenue?.data || null,
        health: health?.data || null,
        tendencia: tendencia?.data || [],
        okrs: okrs?.data || [],
        retencion: retencion?.data || []
      }
    };
    return eduCeoCache.data;
  } catch (e) {
    console.error('eduCeoLoad', e);
    eduCeoCache.loading = false;
    return null;
  }
}

function eduCeoBust() { eduCeoCache = { key: null, data: null, loading: false }; }

// ─── Render principal ───
function eduRenderCeoDashboard(d) {
  if (!d) return `<div class="bg-violet-50 border border-violet-200 rounded p-4 text-center"><div class="text-2xl animate-pulse">🧠</div><div class="text-xs text-violet-800 mt-1">Cargando dashboard ejecutivo...</div></div>`;
  return `
    <section class="space-y-3 mt-3">
      ${eduCeoRenderHealthScore(d)}
      ${eduCeoRenderOkrTracking(d)}
      ${eduCeoRenderSnapshotCards(d)}
      ${eduCeoRenderFunnel(d)}
      ${eduCeoRenderCuellos(d)}
      ${eduCeoRenderMotivosDesercion(d)}
      ${eduCeoRenderRevenue(d)}
      ${eduCeoRenderTendencia(d)}
      ${eduCeoRenderRetencionCohort(d)}
    </section>
  `;
}

// ─── 1. Health Score (gigante, primer impacto) ───
function eduCeoRenderHealthScore(d) {
  const h = d.health || {};
  const score = h.health_score ?? null;
  const color = score == null ? 'slate' :
    score >= 80 ? 'emerald' :
    score >= 60 ? 'blue' :
    score >= 40 ? 'amber' : 'red';
  const label = score == null ? '—' :
    score >= 80 ? 'Excelente' :
    score >= 60 ? 'Saludable' :
    score >= 40 ? 'Atención requerida' : 'Crítico';
  const colorMap = {
    slate: ['bg-slate-100','text-slate-700','border-slate-300'],
    emerald: ['bg-emerald-50','text-emerald-800','border-emerald-300'],
    blue: ['bg-blue-50','text-blue-800','border-blue-300'],
    amber: ['bg-amber-50','text-amber-800','border-amber-300'],
    red: ['bg-red-50','text-red-800','border-red-300']
  };
  const [bg, fg, border] = colorMap[color];
  return `
    <div class="${bg} border-2 ${border} rounded-xl p-5 flex items-center gap-6">
      <div class="text-center">
        <div class="text-[10px] font-bold uppercase opacity-70 ${fg}">Health Score</div>
        <div class="text-6xl font-bold ${fg}">${score != null ? score : '—'}</div>
        <div class="text-xs font-bold ${fg}">${label}</div>
      </div>
      <div class="flex-1 grid grid-cols-5 gap-2 text-[10px]">
        ${[
          ['Asistencia', h.componente_asistencia],
          ['Avance plan', h.componente_plan],
          ['NPS', h.componente_nps],
          ['Activos', h.componente_activos],
          ['Retención', h.componente_churn]
        ].map(([lbl, val]) => `
          <div class="bg-white rounded p-2">
            <div class="text-slate-500 uppercase font-bold">${lbl}</div>
            <div class="text-lg font-bold ${fg}">${val != null ? Math.round(val) : '—'}</div>
            <div class="h-1 bg-slate-200 rounded mt-1 overflow-hidden">
              <div class="h-full ${val>=60?'bg-emerald-500':val>=40?'bg-amber-500':'bg-red-500'}" style="width:${val||0}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── 2. OKR tracking (objetivos vs realidad) ───
function eduCeoRenderOkrTracking(d) {
  const okrs = d.okrs || [];
  const s = d.snapshot || {};
  const h = d.health || {};
  if (!okrs.length) return '';
  const getValue = key => {
    const map = {
      pct_asistencia: s.pct_asistencia,
      pct_avance_plan: s.pct_avance_plan,
      pct_con_plan: s.con_plan_activo && s.activos ? Math.round(100 * s.con_plan_activo / s.activos) : null,
      sesiones_por_estudiante: s.estudiantes_con_sesion_mes ? (s.sesiones_mes / s.estudiantes_con_sesion_mes).toFixed(1) : null,
      pct_cerro_deal: s.pct_cerro_deal,
      churn_rate: s.churn_rate_30d,
      pct_inactivos: s.pct_inactivos,
      pct_no_show: s.asistencias_mes && (s.asistencias_mes + (s.sesiones_mes - s.asistencias_mes))
        ? Math.round(100 * (s.sesiones_mes - s.asistencias_mes) / s.sesiones_mes) : null
    };
    return map[key] != null ? +map[key] : null;
  };
  const okrsCalc = okrs.map(o => {
    const actual = getValue(o.metric_key);
    let pct = null, status = 'unknown';
    if (actual != null && o.target_value) {
      if (o.direction === 'higher_better') {
        pct = Math.round(100 * actual / o.target_value);
        status = actual >= o.target_value ? 'logrado' : actual >= o.target_value * 0.8 ? 'cerca' : 'lejos';
      } else {
        pct = Math.round(100 * o.target_value / Math.max(actual, 0.001));
        status = actual <= o.target_value ? 'logrado' : actual <= o.target_value * 1.2 ? 'cerca' : 'lejos';
      }
    }
    return { ...o, actual, pct: Math.min(pct || 0, 150), status };
  });
  const logrados = okrsCalc.filter(o => o.status === 'logrado').length;
  const cerca = okrsCalc.filter(o => o.status === 'cerca').length;
  const lejos = okrsCalc.filter(o => o.status === 'lejos').length;
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
        <h3 class="font-bold text-sm">🎯 OKRs — Objetivos del trimestre</h3>
        <div class="flex gap-2 text-xs">
          <span class="bg-emerald-500 px-2 py-0.5 rounded font-bold">${logrados} logrados</span>
          <span class="bg-amber-500 px-2 py-0.5 rounded font-bold">${cerca} cerca</span>
          <span class="bg-red-500 px-2 py-0.5 rounded font-bold">${lejos} lejos</span>
        </div>
      </div>
      <div class="p-3 space-y-2">
        ${okrsCalc.map(o => {
          const barColor = o.status==='logrado'?'bg-emerald-500':o.status==='cerca'?'bg-amber-500':o.status==='lejos'?'bg-red-500':'bg-slate-300';
          const fmtVal = v => v==null?'—':o.unit==='pct'?v+'%':o.unit==='usd'?'$'+(+v).toLocaleString():v;
          return `
            <div>
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold">${(window.esc||((s)=>s))(o.metric_label||o.metric_key)}</span>
                <span class="text-slate-600">${fmtVal(o.actual)} / <strong>${fmtVal(o.target_value)}</strong> ${o.direction==='lower_better'?'(menor mejor)':''}</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div class="${barColor} h-full transition-all" style="width:${Math.min(o.pct||0, 100)}%"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── 3. Snapshot cards (números clave) ───
function eduCeoRenderSnapshotCards(d) {
  const s = d.snapshot || {};
  const cards = [
    ['Activos',           s.activos, 'emerald'],
    ['En riesgo',         s.en_riesgo, 'amber'],
    ['Desertados (mes)',  s.desertados_30d, 'red'],
    ['Nuevos (mes)',      s.nuevos_30d, 'blue'],
    ['Graduados',         s.graduados, 'violet'],
    ['Cerraron deal',     s.con_deal, 'teal'],
    ['Renovaciones (mes)',s.renovaciones_30d, 'blue'],
    ['% asistencia mes',  s.pct_asistencia, 'slate', 'pct']
  ];
  return `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
      ${cards.map(([lbl, val, c, fmt]) => `
        <div class="bg-${c}-50 border border-${c}-200 rounded-lg p-3">
          <div class="text-[10px] uppercase font-bold text-${c}-700">${lbl}</div>
          <div class="text-2xl font-bold text-${c}-900">${val ?? '—'}${fmt==='pct'?'%':''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── 4. Funnel de etapas ───
function eduCeoRenderFunnel(d) {
  const funnel = d.funnel || [];
  if (!funnel.length) return '';
  const total = funnel.reduce((s, x) => s + (+x.estudiantes || 0), 0);
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">🔻 Funnel — Distribución por etapa</h3></div>
      <div class="p-3 space-y-2">
        ${funnel.map((f, i) => {
          const width = Math.max(20, +f.pct_del_total || 0);
          const color = ['bg-emerald-500','bg-blue-500','bg-violet-500','bg-amber-500','bg-orange-500','bg-red-500'][i % 6];
          return `
            <div class="flex items-center gap-3">
              <div class="w-24 text-xs font-bold text-slate-700">${(window.esc||((s)=>s))(f.etapa)}</div>
              <div class="flex-1 bg-slate-100 rounded h-7 overflow-hidden relative">
                <div class="${color} h-full flex items-center justify-start pl-2 text-white text-xs font-bold" style="width:${width}%">
                  ${f.estudiantes} (${f.pct_del_total}%)
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── 5. Cuellos de botella ───
function eduCeoRenderCuellos(d) {
  const c = d.cuellos || [];
  if (!c.length) return `<div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-800">✓ Sin cuellos de botella detectados — los tiempos por etapa están balanceados.</div>`;
  return `
    <div class="bg-white border border-red-200 rounded-xl overflow-hidden">
      <div class="bg-red-50 px-4 py-3 border-b border-red-200">
        <h3 class="font-bold text-sm text-red-900">⚠️ Cuellos de botella en el funnel</h3>
        <p class="text-[11px] text-red-700">Etapas donde los estudiantes se quedan más tiempo que la mediana.</p>
      </div>
      <table class="w-full text-xs">
        <thead><tr class="text-[10px] uppercase text-slate-500 bg-slate-50">
          <th class="text-left p-2">Etapa</th>
          <th class="text-right p-2">Días promedio</th>
          <th class="text-right p-2">Vs mediana</th>
          <th class="text-left p-2">Severidad</th>
        </tr></thead>
        <tbody>
          ${c.map(x => {
            const sevColor = { critico:'red', alto:'orange', medio:'amber', ok:'emerald' }[x.severidad] || 'slate';
            return `<tr class="border-t border-slate-100">
              <td class="p-2 font-medium">${(window.esc||((s)=>s))(x.stage)}</td>
              <td class="p-2 text-right font-bold">${x.promedio_dias}d</td>
              <td class="p-2 text-right">${x.factor_vs_mediana}x</td>
              <td class="p-2"><span class="bg-${sevColor}-100 text-${sevColor}-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">${x.severidad}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── 6. Motivos de deserción ───
function eduCeoRenderMotivosDesercion(d) {
  const m = d.motivos || [];
  if (!m.length) return '';
  const total = m.reduce((s, x) => s + (+x.cantidad || 0), 0);
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">🚪 Top motivos de deserción</h3></div>
      <div class="p-3 space-y-1">
        ${m.slice(0,8).map(x => {
          const pct = Math.round(100 * (+x.cantidad) / total);
          return `
            <div>
              <div class="flex justify-between text-xs mb-0.5">
                <span class="truncate flex-1">${(window.esc||((s)=>s))(x.motivo)}</span>
                <span class="font-bold ml-2">${x.cantidad} (${pct}%)</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div class="bg-red-500 h-full" style="width:${pct}%"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── 7. Revenue (si hay pricing cargado) ───
function eduCeoRenderRevenue(d) {
  const r = d.revenue || {};
  if (!r.revenue_total_contratado && !r.deal_revenue_estudiantes) return `<div class="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">💡 <strong>Revenue tracking inactivo.</strong> Cargá <code>contract_value</code> en <code>edu_students</code> para ver LTV, ROI y revenue del programa.</div>`;
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="bg-emerald-600 text-white px-4 py-3"><h3 class="font-bold text-sm">💰 Revenue del programa</h3></div>
      <div class="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div><div class="text-[10px] uppercase text-slate-500 font-bold">Contratado total</div><div class="text-xl font-bold text-emerald-700">$${(+r.revenue_total_contratado||0).toLocaleString()}</div></div>
        <div><div class="text-[10px] uppercase text-slate-500 font-bold">Revenue de activos</div><div class="text-xl font-bold text-emerald-700">$${(+r.revenue_activos||0).toLocaleString()}</div></div>
        <div><div class="text-[10px] uppercase text-slate-500 font-bold">LTV promedio</div><div class="text-xl font-bold">$${(+r.ltv_promedio||0).toLocaleString()}</div></div>
        <div><div class="text-[10px] uppercase text-slate-500 font-bold">ROI estudiante</div><div class="text-xl font-bold ${r.roi_estudiantes>=2?'text-emerald-700':'text-amber-700'}">${r.roi_estudiantes||'—'}x</div></div>
      </div>
    </div>
  `;
}

// ─── 8. Tendencia 6 meses ───
function eduCeoRenderTendencia(d) {
  const t = d.tendencia || [];
  if (!t.length) return '';
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">📈 Tendencia últimos 6 meses</h3></div>
      <div class="overflow-x-auto"><table class="w-full text-xs">
        <thead><tr class="bg-slate-50 text-[10px] uppercase text-slate-500">
          <th class="text-left p-2">Mes</th>
          <th class="text-right p-2">Sesiones</th>
          <th class="text-right p-2">Asistencia</th>
          <th class="text-right p-2">% Asistencia</th>
          <th class="text-right p-2">Estudiantes activos</th>
          <th class="text-right p-2">Sesiones/estudiante</th>
        </tr></thead>
        <tbody>
          ${t.map(m => `<tr class="border-t border-slate-100">
            <td class="p-2 capitalize">${new Date(m.mes).toLocaleDateString('es',{month:'long', year:'numeric'})}</td>
            <td class="p-2 text-right">${m.sesiones_total||0}</td>
            <td class="p-2 text-right text-emerald-700">${m.asistidas||0}</td>
            <td class="p-2 text-right font-bold">${m.pct_asistencia||'—'}${m.pct_asistencia!=null?'%':''}</td>
            <td class="p-2 text-right">${m.estudiantes_con_sesion||0}</td>
            <td class="p-2 text-right">${m.sesiones_promedio_por_estudiante||0}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
  `;
}

// ─── 9. Retención cohort ───
function eduCeoRenderRetencionCohort(d) {
  const r = d.retencion || [];
  if (!r.length) return '';
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="bg-slate-900 text-white px-4 py-3"><h3 class="font-bold text-sm">🔁 Retención por cohort</h3></div>
      <table class="w-full text-xs">
        <thead><tr class="bg-slate-50 text-[10px] uppercase text-slate-500">
          <th class="text-left p-2">Cohort (mes ingreso)</th>
          <th class="text-right p-2">Inscritos</th>
          <th class="text-right p-2">A 30d</th>
          <th class="text-right p-2">A 60d</th>
          <th class="text-right p-2">A 90d</th>
          <th class="text-right p-2">% retención 90d</th>
        </tr></thead>
        <tbody>
          ${r.map(c => `<tr class="border-t border-slate-100">
            <td class="p-2 capitalize">${new Date(c.cohort_mes).toLocaleDateString('es',{month:'short',year:'2-digit'})}</td>
            <td class="p-2 text-right">${c.inscritos||0}</td>
            <td class="p-2 text-right">${c.a_30d||0}</td>
            <td class="p-2 text-right">${c.a_60d||0}</td>
            <td class="p-2 text-right">${c.a_90d||0}</td>
            <td class="p-2 text-right font-bold ${c.ret_90d_pct>=70?'text-emerald-700':c.ret_90d_pct>=50?'text-amber-700':'text-red-700'}">${c.ret_90d_pct!=null?c.ret_90d_pct+'%':'—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── Punto de entrada async: dispara load + render ───
async function eduRenderCeoSectionAsync(mentorshipId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!mentorshipId) {
    container.innerHTML = '<div class="text-xs text-slate-500 italic">Seleccioná una mentoría para ver el dashboard CEO.</div>';
    return;
  }
  container.innerHTML = eduRenderCeoDashboard(null);
  const data = await eduCeoLoad(mentorshipId);
  if (container) container.innerHTML = eduRenderCeoDashboard(data);
}
