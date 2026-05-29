// ============================================================
// CLICKUP DASHBOARD — análisis de operación + automatizaciones + agente IA
// Sync con space "Empresa Remodelación" via edge function `sync-clickup`
// ============================================================

const cuState = {
  sys: null,
  snapshot: null,        // último snapshot
  tasks: [],             // espejo
  alerts: [],
  syncLog: null,
  proposals: [],
  automations: [],
  tab: 'portfolio',      // portfolio | personas | casas | recurrentes | alertas | automatizaciones | agente
  loading: false
};

const CU_FN_URL = `${window.SUPABASE_URL}/functions/v1/sync-clickup`;
const CU_EXEC_URL = `${window.SUPABASE_URL}/functions/v1/clickup-execute`;
const CU_AGENT_URL = `${window.SUPABASE_URL}/functions/v1/clickup-ai-agent`;

async function openClickupDashboard(sys) {
  cuState.sys = sys;
  openModal(`📋 ${sys.name}`, '<div id="cu-root">Cargando...</div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  await cuLoadAll();
  cuRender();
}

async function cuLoadAll() {
  const [s, t, a, l, p, au] = await Promise.all([
    sb.from('clickup_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(1),
    sb.from('clickup_tasks_mirror').select('id,name,status,status_type,priority,primary_assignee,due_date,date_updated,folder_id,folder_name,list_name,fase,url').limit(2000),
    sb.from('clickup_alerts').select('*').is('resolved_at', null).order('severity').order('detected_at', { ascending: false }),
    sb.from('clickup_sync_log').select('*').order('synced_at', { ascending: false }).limit(1),
    sb.from('clickup_ai_proposals').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    sb.from('clickup_automations').select('*').eq('active', true).order('created_at', { ascending: false })
  ]);
  cuState.snapshot = (s.data && s.data[0]) || null;
  cuState.tasks = t.data || [];
  cuState.alerts = a.data || [];
  cuState.syncLog = (l.data && l.data[0]) || null;
  cuState.proposals = p.data || [];
  cuState.automations = au.data || [];
}

async function cuSync() {
  cuState.loading = true;
  cuRender();
  try {
    const res = await fetch(CU_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ user_id: state.user.id })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'Sync falló');
    await cuLoadAll();
    cuState.loading = false;
    cuRender();
  } catch (e) {
    cuState.loading = false;
    cuRender();
    alert('Error en sync: ' + e.message + '\n\nVerificá CLICKUP_TOKEN en Supabase secrets y que la edge function esté desplegada.');
  }
}

function cuRender() {
  const root = document.getElementById('cu-root');
  if (!root) return;
  const snap = cuState.snapshot;
  const lastSync = cuState.syncLog ? new Date(cuState.syncLog.synced_at) : null;
  const lastSyncAgo = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 60000) : null;

  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[84vh]">
      <!-- HEADER -->
      <div class="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 flex-wrap gap-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          ${[
            ['portfolio','📊 Portfolio'],
            ['personas','👥 Personas'],
            ['casas','🏠 Casas'],
            ['recurrentes','🔁 Recurrentes'],
            ['alertas','🚨 Alertas'],
            ['automatizaciones','⚙️ Automatizaciones'],
            ['agente','🧠 Agente IA']
          ].map(([k,l]) => `
            <button onclick="cuSetTab('${k}')" class="px-2.5 py-1.5 rounded text-xs font-bold ${cuState.tab===k?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
              ${l}
              ${k==='alertas' && cuState.alerts.length ? `<span class="ml-1 bg-red-600 text-white px-1.5 rounded">${cuState.alerts.length}</span>` : ''}
              ${k==='agente' && cuState.proposals.length ? `<span class="ml-1 bg-violet-600 text-white px-1.5 rounded">${cuState.proposals.length}</span>` : ''}
            </button>
          `).join('')}
        </div>
        <div class="flex items-center gap-2">
          ${lastSync ? `<span class="text-[10px] text-slate-500">Sync: ${lastSyncAgo < 1 ? 'ahora' : lastSyncAgo < 60 ? lastSyncAgo+'min' : Math.floor(lastSyncAgo/60)+'h'} · ${cuState.syncLog.tasks_synced || 0} tareas</span>` : '<span class="text-[10px] text-amber-700">Sin sync. Click 🔄</span>'}
          <button onclick="cuSync()" ${cuState.loading?'disabled':''} class="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold">
            ${cuState.loading ? '⏳ Sincronizando...' : '🔄 Sync'}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        ${!snap ? cuRenderEmpty() :
          cuState.tab === 'portfolio' ? cuRenderPortfolio() :
          cuState.tab === 'personas' ? cuRenderPersonas() :
          cuState.tab === 'casas' ? cuRenderCasas() :
          cuState.tab === 'recurrentes' ? cuRenderRecurrentes() :
          cuState.tab === 'alertas' ? cuRenderAlertas() :
          cuState.tab === 'automatizaciones' ? cuRenderAutomatizaciones() :
          cuRenderAgente()}
      </div>
    </div>
  `;
}

function cuSetTab(t) { cuState.tab = t; cuRender(); }

function cuRenderEmpty() {
  return `
    <div class="text-center py-16">
      <div class="text-5xl mb-4">📋</div>
      <h3 class="text-lg font-bold text-slate-700">Sin datos todavía</h3>
      <p class="text-sm text-slate-500 mt-2 max-w-md mx-auto">Click <strong>🔄 Sync</strong> arriba para traer las tareas del space "Empresa Remodelación" desde ClickUp.</p>
      <p class="text-[11px] text-slate-400 mt-3 max-w-md mx-auto">Si es tu primera vez: configurá <code>CLICKUP_TOKEN</code> en Supabase Secrets (lo conseguís en ClickUp → Settings → Apps → Generate).</p>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
// 🧠 ANÁLISIS PROFUNDO — insights operativos derivados del snapshot
// ════════════════════════════════════════════════════════════

// Keywords que sugieren que la tarea es automatizable (drive, airtable, registro, etc.)
const CU_AUTO_KEYWORDS = [
  { kw: ['drive','google'], tipo: 'Google Drive API', ahorro_min: 15 },
  { kw: ['airtable'], tipo: 'Airtable API', ahorro_min: 20 },
  { kw: ['bitacora','bitácora','reporte','informe','resumen'], tipo: 'IA + data agregada', ahorro_min: 60 },
  { kw: ['actualiz','actualización','subir','subida','registro','registrar'], tipo: 'Script/API', ahorro_min: 10 },
  { kw: ['pago','payment','factura'], tipo: 'Stripe/Bank API', ahorro_min: 25 },
  { kw: ['crear carpeta','crear proyecto','crear grupo'], tipo: 'Template automation', ahorro_min: 10 },
  { kw: ['video','foto','imagen','ia'], tipo: 'IA generativa', ahorro_min: 45 },
  { kw: ['recordatorio','reminder','notificación','aviso'], tipo: 'Cron + notify', ahorro_min: 5 },
  { kw: ['validar','verificar','revisar','chequear'], tipo: 'Validación automática', ahorro_min: 15 }
];

function cuDetectAutomationCandidates(tasks) {
  // Agrupa por nombre normalizado, cuenta repeticiones
  const byName = {};
  tasks.forEach(t => {
    const norm = (t.name || '').trim().toLowerCase();
    if (!norm) return;
    if (!byName[norm]) byName[norm] = { name: t.name, count: 0, closed: 0, list: t.list_name, fase: t.fase };
    byName[norm].count++;
    if (t.status_type === 'closed' || t.status === 'completado') byName[norm].closed++;
  });

  // Para cada tarea repetida o recurrente, evaluar si es automatizable
  const candidates = [];
  Object.values(byName).forEach((g) => {
    const lowerName = g.name.toLowerCase();
    let match = null;
    for (const k of CU_AUTO_KEYWORDS) {
      if (k.kw.some(w => lowerName.includes(w))) { match = k; break; }
    }
    // Considera candidata si: aparece 3+ veces O está en lista recurrente y match keyword
    const inRecurrent = (g.list || '').toLowerCase().includes('recurrent');
    if (!match) return;
    if (g.count < 3 && !inRecurrent) return;

    const ahorroAnual = match.ahorro_min * g.count * (inRecurrent ? 4 : 1); // recurrentes asumimos mensual×12
    candidates.push({
      name: g.name,
      count: g.count,
      closed: g.closed,
      tipo_automatizacion: match.tipo,
      ahorro_por_ejecucion_min: match.ahorro_min,
      ejecuciones_estimadas_anuales: inRecurrent ? 52 : g.count * 4,
      ahorro_horas_anuales: Math.round((inRecurrent ? 52 : g.count * 4) * match.ahorro_min / 60),
      recurrente: inRecurrent
    });
  });

  return candidates.sort((a,b) => b.ahorro_horas_anuales - a.ahorro_horas_anuales);
}

function cuDetectBottlenecks(snap, tasks) {
  const findings = [];

  // 1. Bus factor crítico
  if (snap.bus_factor_pct >= 60) {
    findings.push({
      sev: 'critical',
      titulo: `Bus factor ${snap.bus_factor_pct}%`,
      detalle: `${snap.top_overloaded_person} concentra el ${snap.bus_factor_pct}% de las tareas (${snap.top_overloaded_count} abiertas). Si esa persona se enferma o se va, la operación se detiene.`,
      accion: `Reasignar al menos ${Math.round(snap.top_overloaded_count * 0.4)} tareas a otras personas. Identificar qué subset puede hacer otro miembro del equipo.`
    });
  }

  // 2. Cuello de botella por status (cuál acumula más abierto)
  const byStatus = snap.by_status || {};
  const closedStatuses = ['completado','closed','done'];
  const openStatusEntries = Object.entries(byStatus)
    .filter(([s,_]) => !closedStatuses.includes(s.toLowerCase()))
    .sort((a,b) => b[1]-a[1]);
  if (openStatusEntries.length && openStatusEntries[0][1] >= 5) {
    findings.push({
      sev: 'warning',
      titulo: `Cuello de botella en status "${openStatusEntries[0][0]}"`,
      detalle: `${openStatusEntries[0][1]} tareas se acumulan en este status. Es donde más se está atascando el flujo.`,
      accion: `Hacer un review específico de este status. Quizás necesita criterio de "definition of done" más claro o una persona dedicada.`
    });
  }

  // 3. Casas inactivas
  const byCasa = snap.by_casa || {};
  const inactivas = Object.entries(byCasa).filter(([id,v]) => {
    if (!v.last_activity_iso || v.open === 0) return false;
    const days = (Date.now() - +new Date(v.last_activity_iso)) / 86400000;
    return days >= 14;
  });
  if (inactivas.length) {
    findings.push({
      sev: 'warning',
      titulo: `${inactivas.length} casa(s) inactivas 14+ días con tareas abiertas`,
      detalle: inactivas.slice(0,3).map(([id,v]) => `${v.name} (${v.open} abiertas)`).join(' · '),
      accion: 'Revisar si el proyecto está bloqueado, si el líder respondió, o si hay tareas que se deben cerrar por estar obsoletas.'
    });
  }

  // 4. Tareas sin asignar críticas
  if (snap.total_no_assignee > 0) {
    findings.push({
      sev: snap.total_no_assignee >= 5 ? 'warning' : 'info',
      titulo: `${snap.total_no_assignee} tareas sin responsable`,
      detalle: 'Tareas abiertas sin asignar pueden quedarse olvidadas indefinidamente.',
      accion: 'Asignar dueño a cada una o cerrarlas si ya no son relevantes.'
    });
  }

  // 5. Recurrentes con baja completitud
  const recur = snap.recurrentes_status || {};
  const failingRecur = Object.entries(recur).filter(([n,v]) => v.total >= 3 && v.completion_rate < 70);
  if (failingRecur.length) {
    findings.push({
      sev: 'warning',
      titulo: `${failingRecur.length} recurrente(s) con baja completitud`,
      detalle: failingRecur.slice(0,3).map(([n,v]) => `${n} (${v.completion_rate}%)`).join(' · '),
      accion: 'Estas son las primeras candidatas a automatizar — si no se están cumpliendo manualmente, automatizarlas evita que se sigan saltando.'
    });
  }

  return findings;
}

function cuComputeBalancing(snap) {
  // Calcula cómo se vería la distribución si redistribuyéramos hacia el balance
  const ass = snap.by_assignee || {};
  const entries = Object.entries(ass).filter(([n]) => n !== '(sin asignar)');
  if (!entries.length) return null;
  const total = entries.reduce((s, [_, v]) => s + (v.open || 0), 0);
  const avg = Math.round(total / entries.length);
  const overloaded = entries.filter(([_, v]) => v.open > avg * 1.5);
  const underloaded = entries.filter(([_, v]) => v.open < avg * 0.5);
  return { total, avg, overloaded, underloaded, n: entries.length };
}

// ─── PORTFOLIO ───
function cuRenderPortfolio() {
  const s = cuState.snapshot;
  const criticalAlerts = cuState.alerts.filter(a => a.severity === 'critical');

  return `
    <div class="space-y-4">
      <!-- KPI cards principales -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div class="bg-slate-900 text-white rounded-xl p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Abiertas</div>
          <div class="text-2xl font-bold">${s.total_open || 0}</div>
          <div class="text-[9px] text-slate-400">${s.total_tasks || 0} total</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">Cerradas 7d</div>
          <div class="text-2xl font-bold text-emerald-900">${s.total_closed_last_7d || 0}</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-[10px] text-red-700 uppercase font-bold">Vencidas</div>
          <div class="text-2xl font-bold text-red-900">${s.total_overdue || 0}</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Sin asignar</div>
          <div class="text-2xl font-bold text-amber-900">${s.total_no_assignee || 0}</div>
        </div>
        <div class="bg-violet-50 border border-violet-300 rounded-xl p-3" title="% de tareas abiertas que dependen de 1 sola persona">
          <div class="text-[10px] text-violet-700 uppercase font-bold">Bus factor</div>
          <div class="text-2xl font-bold ${s.bus_factor_pct >= 60 ? 'text-red-700' : s.bus_factor_pct >= 40 ? 'text-amber-700' : 'text-emerald-700'}">${s.bus_factor_pct || 0}%</div>
          <div class="text-[9px] text-slate-500">→ ${s.top_overloaded_person || '—'}</div>
        </div>
      </div>

      ${criticalAlerts.length ? `
        <div class="bg-red-50 border border-red-300 rounded-xl p-3">
          <div class="text-xs font-bold text-red-900 uppercase mb-2">🚨 ${criticalAlerts.length} alertas críticas</div>
          ${criticalAlerts.slice(0,4).map(a => `
            <div class="bg-white border border-red-200 rounded p-2 mb-1 text-xs">
              <div class="font-bold">${a.title}</div>
              <div class="text-[11px] text-slate-600">${a.detail || ''}</div>
            </div>
          `).join('')}
          ${criticalAlerts.length > 4 ? `<button onclick="cuSetTab('alertas')" class="text-[11px] text-red-700 hover:underline font-bold">+ ver las ${criticalAlerts.length - 4} restantes →</button>` : ''}
        </div>
      ` : ''}

      <!-- Panel de Insights Operativos -->
      ${cuRenderInsightsOperativos()}

      <!-- Top sobrecargados -->
      <div class="grid md:grid-cols-2 gap-3">
        <div class="border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">👥 Top carga abierta</div>
          ${cuRenderAssigneeList(5)}
        </div>
        <div class="border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">🏠 Casas activas (avance)</div>
          ${cuRenderCasasList(5)}
        </div>
      </div>
    </div>
  `;
}

// ─── Panel narrativo de Insights Operativos ───
function cuRenderInsightsOperativos() {
  const snap = cuState.snapshot;
  if (!snap) return '';
  const findings = cuDetectBottlenecks(snap, cuState.tasks);
  const autoCandidates = cuDetectAutomationCandidates(cuState.tasks);
  const balance = cuComputeBalancing(snap);
  const totalAhorroH = autoCandidates.reduce((s, c) => s + c.ahorro_horas_anuales, 0);

  return `
    <div class="border-2 border-violet-300 bg-violet-50/30 rounded-xl p-4 space-y-3">
      <div class="text-sm font-bold uppercase text-violet-900">🧠 Insights operativos — análisis profundo</div>

      <!-- Findings (cuellos de botella) -->
      ${findings.length ? `
        <div class="space-y-2">
          ${findings.map(f => {
            const cls = f.sev === 'critical' ? 'bg-red-50 border-red-300' : f.sev === 'warning' ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-300';
            return `
              <div class="${cls} border rounded p-2.5">
                <div class="text-xs font-bold">${f.sev === 'critical' ? '🚨' : f.sev === 'warning' ? '⚠️' : 'ℹ️'} ${f.titulo}</div>
                <div class="text-[11px] text-slate-700 mt-1">${f.detalle}</div>
                <div class="text-[11px] text-slate-900 mt-1.5 font-semibold">→ Acción: ${f.accion}</div>
              </div>
            `;
          }).join('')}
        </div>
      ` : '<div class="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">✅ Sin cuellos de botella críticos detectados.</div>'}

      <!-- Re-balanceo recomendado -->
      ${balance && balance.overloaded.length && balance.underloaded.length ? `
        <div class="bg-white border border-violet-200 rounded p-3">
          <div class="text-xs font-bold mb-2">⚖️ Recomendación de re-balanceo</div>
          <div class="text-[11px] text-slate-600 mb-2">Promedio de carga: <strong>${balance.avg} tareas/persona</strong> (${balance.n} personas activas, ${balance.total} tareas totales).</div>
          <div class="grid md:grid-cols-2 gap-2">
            <div>
              <div class="text-[10px] font-bold uppercase text-red-700">Sobrecargados</div>
              ${balance.overloaded.map(([n,v]) => `<div class="text-xs">⤵️ <strong>${n}</strong> · ${v.open} tareas (×${(v.open/balance.avg).toFixed(1)} promedio)</div>`).join('')}
            </div>
            <div>
              <div class="text-[10px] font-bold uppercase text-emerald-700">Subutilizados</div>
              ${balance.underloaded.map(([n,v]) => `<div class="text-xs">⤴️ <strong>${n}</strong> · ${v.open} tareas (×${(v.open/balance.avg).toFixed(1)} promedio)</div>`).join('')}
            </div>
          </div>
          <div class="text-[11px] text-slate-900 mt-2 italic">→ Mover ~${Math.max(...balance.overloaded.map(([_,v]) => v.open - balance.avg))} tareas de los sobrecargados hacia los subutilizados acercaría todos al promedio.</div>
        </div>
      ` : ''}

      <!-- Candidatas a automatización -->
      ${autoCandidates.length ? `
        <div class="bg-white border border-emerald-300 rounded p-3">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold">🤖 Candidatas a automatización (${autoCandidates.length})</div>
            <div class="text-xs text-emerald-700 font-bold">Ahorro potencial: ~${totalAhorroH}h/año</div>
          </div>
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left p-1.5">Tarea</th>
                <th class="text-center p-1.5">Veces</th>
                <th class="text-left p-1.5">Cómo automatizar</th>
                <th class="text-right p-1.5">Min/exec</th>
                <th class="text-right p-1.5">Ahorro/año</th>
              </tr>
            </thead>
            <tbody>
              ${autoCandidates.slice(0, 12).map(c => `
                <tr class="border-t border-slate-100 hover:bg-emerald-50/50">
                  <td class="p-1.5 font-semibold">${c.name} ${c.recurrente?'<span class="text-[9px] bg-violet-100 text-violet-700 px-1 rounded">RECUR</span>':''}</td>
                  <td class="p-1.5 text-center">${c.count}</td>
                  <td class="p-1.5 text-slate-600">${c.tipo_automatizacion}</td>
                  <td class="p-1.5 text-right">${c.ahorro_por_ejecucion_min}m</td>
                  <td class="p-1.5 text-right font-bold text-emerald-700">${c.ahorro_horas_anuales}h</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="text-[10px] text-slate-500 mt-2 italic">Top 3 ROI: ${autoCandidates.slice(0,3).map(c => `<strong>${c.name}</strong> (${c.ahorro_horas_anuales}h/año)`).join(' · ')}</div>
        </div>
      ` : ''}

      <!-- Resumen narrativo -->
      ${cuRenderNarrativeSummary(snap, autoCandidates, balance, findings)}
    </div>
  `;
}

function cuRenderNarrativeSummary(snap, autos, balance, findings) {
  const totalAhorroH = autos.reduce((s, c) => s + c.ahorro_horas_anuales, 0);
  const bullets = [];

  if (snap.bus_factor_pct >= 60) {
    bullets.push(`<strong>Riesgo operacional alto</strong>: ${snap.bus_factor_pct}% de la operación depende de una persona (${snap.top_overloaded_person}). Reasignar o cross-trainear urgente.`);
  } else if (snap.bus_factor_pct >= 40) {
    bullets.push(`Carga concentrada: ${snap.bus_factor_pct}% en ${snap.top_overloaded_person}. Monitorear que no se vuelva crítico.`);
  }

  if (totalAhorroH >= 100) {
    bullets.push(`<strong>Oportunidad de automatización fuerte</strong>: ~${totalAhorroH}h/año recuperables (~${Math.round(totalAhorroH/40)} semanas de trabajo). Top: ${autos.slice(0,3).map(c => c.name).join(', ')}.`);
  } else if (totalAhorroH > 0) {
    bullets.push(`Automatizaciones detectadas: ~${totalAhorroH}h/año (no crítico pero útil).`);
  }

  if (snap.total_overdue > 0) {
    bullets.push(`<strong>${snap.total_overdue} tareas vencidas</strong> arrastrando. Las vencidas más viejas son las que peor impacto operativo tienen.`);
  }

  if (snap.recurrentes_status) {
    const failing = Object.entries(snap.recurrentes_status).filter(([_,v]) => v.total >= 3 && v.completion_rate < 70).length;
    if (failing > 0) {
      bullets.push(`${failing} tareas recurrentes con completitud <70%. Esto indica proceso roto — la persona se salta esa rutina sistemáticamente.`);
    }
  }

  // Recomendación priorizada
  let recomendacion = '';
  if (findings.some(f => f.sev === 'critical' && f.titulo.includes('Bus'))) {
    recomendacion = `<strong>Prioridad #1:</strong> Romper la dependencia única de ${snap.top_overloaded_person}. Identificar 5 tipos de tareas que otro miembro pueda absorber y transferir gradualmente.`;
  } else if (autos.length >= 3) {
    recomendacion = `<strong>Prioridad #1:</strong> Empezar por automatizar la tarea con mejor ROI: <strong>${autos[0].name}</strong> (${autos[0].tipo_automatizacion}, ${autos[0].ahorro_horas_anuales}h/año). 1 sprint de implementación.`;
  } else if (snap.total_overdue >= 10) {
    recomendacion = `<strong>Prioridad #1:</strong> Cleanup de vencidas. ${snap.total_overdue} tareas vencidas distraen mentalmente del equipo. Ofrecer 1 hora dedicada a cerrar o descartar.`;
  } else {
    recomendacion = `<strong>Prioridad #1:</strong> Sostener la operación. KPIs en rango aceptable. Continuar con sync semanal.`;
  }

  return `
    <div class="bg-slate-900 text-white rounded-xl p-3">
      <div class="text-xs font-bold uppercase text-slate-300 mb-2">📝 Resumen narrativo</div>
      ${bullets.length ? `<ul class="text-xs space-y-1 list-disc list-inside">${bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : '<div class="text-xs text-slate-300">Sin findings críticos. Operación estable.</div>'}
      <div class="text-xs mt-3 pt-2 border-t border-slate-700">${recomendacion}</div>
    </div>
  `;
}

function cuRenderAssigneeList(limit = 999) {
  const ass = cuState.snapshot.by_assignee || {};
  const entries = Object.entries(ass)
    .sort((a,b) => (b[1]).open - (a[1]).open)
    .slice(0, limit);
  if (!entries.length) return '<div class="text-xs text-slate-400">Sin data</div>';
  return `<div class="space-y-1.5">
    ${entries.map(([name, v]) => {
      const v_ = v;
      const overloadCls = v_.open >= 25 ? 'text-red-700 font-bold' : v_.open >= 15 ? 'text-amber-700' : 'text-slate-700';
      return `<div class="flex items-center gap-2 text-xs">
        <div class="flex-1 min-w-0">
          <div class="${overloadCls} truncate">${name}</div>
          <div class="bg-slate-100 rounded-full h-1.5 overflow-hidden"><div class="bg-slate-700 h-full" style="width:${Math.min(v_.open/40*100, 100)}%"></div></div>
        </div>
        <div class="text-right text-[10px] whitespace-nowrap">
          <span class="${overloadCls}">${v_.open}</span> abiertas
          ${v_.overdue ? ` · <span class="text-red-700">${v_.overdue}⏰</span>` : ''}
          · <span class="text-emerald-700">${v_.closed_week||0}✓7d</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function cuRenderCasasList(limit = 999) {
  const c = cuState.snapshot.by_casa || {};
  const entries = Object.entries(c)
    .filter(([_,v]) => v.open > 0)
    .sort((a,b) => (b[1]).open - (a[1]).open)
    .slice(0, limit);
  if (!entries.length) return '<div class="text-xs text-slate-400">Sin casas activas</div>';
  return `<div class="space-y-1.5">
    ${entries.map(([id, v]) => {
      const daysInactive = v.last_activity_iso ? Math.floor((Date.now() - +new Date(v.last_activity_iso))/86400000) : null;
      const inactiveCls = daysInactive >= 14 ? 'text-red-700' : daysInactive >= 5 ? 'text-amber-700' : 'text-slate-500';
      return `<div class="text-xs">
        <div class="flex items-center justify-between">
          <span class="font-semibold truncate">${v.name}</span>
          <span class="text-slate-500">${v.pct}%</span>
        </div>
        <div class="flex items-center gap-1 mt-0.5">
          <div class="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden"><div class="bg-emerald-500 h-full" style="width:${v.pct}%"></div></div>
          <span class="text-[9px] text-slate-500 whitespace-nowrap">${v.open}/${v.open+v.closed}</span>
        </div>
        ${daysInactive !== null ? `<div class="text-[9px] ${inactiveCls}">última actividad: ${daysInactive}d</div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

// ─── PERSONAS ───
function cuRenderPersonas() {
  const ass = cuState.snapshot.by_assignee || {};
  const entries = Object.entries(ass).sort((a,b) => (b[1]).open - (a[1]).open);
  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Ranking de carga. Filas en rojo indican sobrecarga (>25 tareas abiertas).</div>
      <div class="border border-slate-200 rounded-xl overflow-hidden">
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left p-2">Persona</th>
              <th class="text-right p-2">Abiertas</th>
              <th class="text-right p-2">Vencidas</th>
              <th class="text-right p-2">Cerradas 7d</th>
              <th class="text-right p-2">Edad mediana</th>
              <th class="text-center p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(([name, v]) => {
              const v_ = v;
              const isOver = v_.open >= 25;
              return `<tr class="border-t border-slate-100 ${isOver?'bg-red-50':''}">
                <td class="p-2 font-semibold">${name}</td>
                <td class="p-2 text-right ${isOver?'text-red-700 font-bold':''}">${v_.open}</td>
                <td class="p-2 text-right ${v_.overdue?'text-red-700 font-bold':''}">${v_.overdue || 0}</td>
                <td class="p-2 text-right text-emerald-700">${v_.closed_week || 0}</td>
                <td class="p-2 text-right">${v_.p50_age_days != null ? v_.p50_age_days+'d' : '—'}</td>
                <td class="p-2 text-center text-[10px]">${isOver?'🚨 Sobrecargado':v_.open<5?'🟢 OK':'🟡 Normal'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── CASAS ───
function cuRenderCasas() {
  const c = cuState.snapshot.by_casa || {};
  const entries = Object.entries(c).sort((a,b) => (b[1]).pct - (a[1]).pct);
  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Avance por casa. Ordenadas por % completitud descendente.</div>
      <div class="border border-slate-200 rounded-xl overflow-hidden">
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left p-2">Casa</th>
              <th class="text-right p-2">Avance</th>
              <th class="text-right p-2">Abiertas</th>
              <th class="text-right p-2">Cerradas</th>
              <th class="text-right p-2">Última actividad</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(([id, v]) => {
              const daysInactive = v.last_activity_iso ? Math.floor((Date.now() - +new Date(v.last_activity_iso))/86400000) : null;
              const inactCls = daysInactive >= 14 ? 'text-red-700 font-bold' : daysInactive >= 5 ? 'text-amber-700' : 'text-slate-500';
              return `<tr class="border-t border-slate-100">
                <td class="p-2 font-semibold max-w-[280px] truncate">${v.name}</td>
                <td class="p-2 text-right">
                  <div class="flex items-center gap-1 justify-end">
                    <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden"><div class="bg-emerald-500 h-full" style="width:${v.pct}%"></div></div>
                    <span class="font-bold">${v.pct}%</span>
                  </div>
                </td>
                <td class="p-2 text-right">${v.open}</td>
                <td class="p-2 text-right text-emerald-700">${v.closed}</td>
                <td class="p-2 text-right ${inactCls}">${daysInactive != null ? daysInactive+'d' : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── RECURRENTES ───
function cuRenderRecurrentes() {
  const r = cuState.snapshot.recurrentes_status || {};
  const entries = Object.entries(r).sort((a,b) => (a[1]).completion_rate - (b[1]).completion_rate);
  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-600 bg-violet-50 border border-violet-200 rounded p-2">
        🔁 Tareas recurrentes (de la lista "Tareas recurrentes"). <strong>Las que tienen baja completitud son candidatas a automatización.</strong>
      </div>
      <div class="border border-slate-200 rounded-xl overflow-hidden">
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left p-2">Tarea</th>
              <th class="text-right p-2">Total</th>
              <th class="text-right p-2">Completadas</th>
              <th class="text-right p-2">% Cumplimiento</th>
              <th class="text-center p-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${entries.length === 0 ? '<tr><td colspan="5" class="p-4 text-center text-slate-400">Sin tareas recurrentes detectadas</td></tr>' : entries.map(([name, v]) => {
              const rate = v.completion_rate;
              const rateCls = rate >= 90 ? 'text-emerald-700' : rate >= 70 ? 'text-amber-700' : 'text-red-700 font-bold';
              const safeName = name.replace(/'/g, "\\'");
              return `<tr class="border-t border-slate-100">
                <td class="p-2 font-semibold">${name}</td>
                <td class="p-2 text-right">${v.total}</td>
                <td class="p-2 text-right">${v.completed}</td>
                <td class="p-2 text-right ${rateCls}">${rate}%</td>
                <td class="p-2 text-center"><button class="text-[10px] text-violet-700 hover:bg-violet-50 px-2 py-0.5 rounded" onclick="cuSuggestAutomation('${safeName}')">🤖 Automatizar</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function cuSuggestAutomation(name) {
  // Pre-llena el form de automatización con el nombre
  cuState.tab = 'automatizaciones';
  cuRender();
  setTimeout(() => {
    const input = document.getElementById('cu-auto-name');
    if (input) input.value = `Auto: ${name}`;
  }, 100);
}

// ─── ALERTAS ───
function cuRenderAlertas() {
  if (!cuState.alerts.length) {
    return '<div class="text-center py-16 text-emerald-600"><div class="text-5xl mb-3">✅</div><div class="font-bold">Sin alertas activas</div></div>';
  }
  const byType = {};
  cuState.alerts.forEach(a => { (byType[a.severity] = byType[a.severity] || []).push(a); });
  return `
    <div class="space-y-3">
      ${['critical','warning','info'].map(sev => {
        const items = byType[sev] || [];
        if (!items.length) return '';
        const bg = sev === 'critical' ? 'bg-red-50 border-red-300' : sev === 'warning' ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-300';
        const label = sev === 'critical' ? '🚨 Críticas' : sev === 'warning' ? '⚠️ Advertencias' : 'ℹ️ Info';
        return `
          <div class="${bg} border rounded-xl p-3">
            <div class="text-xs font-bold uppercase mb-2">${label} (${items.length})</div>
            <div class="space-y-1.5">
              ${items.map(a => `
                <div class="bg-white border border-slate-200 rounded p-2.5">
                  <div class="font-bold text-sm">${a.title}</div>
                  <div class="text-[11px] text-slate-600 mt-0.5">${a.detail || ''}</div>
                  <div class="flex items-center gap-2 mt-1.5">
                    <span class="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded">${a.alert_type}</span>
                    <span class="text-[9px] text-slate-400">${new Date(a.detected_at).toLocaleString('es-MX')}</span>
                    <button onclick="cuResolveAlert('${a.id}')" class="ml-auto text-[10px] text-slate-500 hover:text-emerald-600">✓ Resuelta</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function cuResolveAlert(id) {
  await sb.from('clickup_alerts').update({ resolved_at: new Date().toISOString(), resolved_by: state.user.id }).eq('id', id);
  await cuLoadAll();
  cuRender();
}

// ─── S7-B · AUTOMATIZACIONES (REALES, no más placeholder) ───
function cuRenderAutomatizaciones() {
  const autos = cuState.automations || [];
  return `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-900">
        ⚙️ <strong>Automatizaciones</strong>: triggers programados que ejecutan acciones contra ClickUp.
        Los seeds vienen pre-creados pero <strong>desactivados</strong> — actívalos uno por uno cuando confirmes que el flujo te conviene.
        Cada ejecución queda registrada en <code>clickup_action_log</code>.
      </div>

      <div class="border border-slate-200 rounded-xl overflow-hidden">
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left p-2">Nombre</th>
              <th class="text-left p-2">Trigger</th>
              <th class="text-left p-2">Acción</th>
              <th class="text-right p-2">Runs</th>
              <th class="text-center p-2">Estado</th>
              <th class="text-center p-2"></th>
            </tr>
          </thead>
          <tbody>
            ${autos.length === 0 ? `<tr><td colspan="6" class="p-6 text-center text-slate-400">Sin automatizaciones. Aplicá <code>s7-b-clickup-automations.sql</code> para cargar 4 templates pre-configuradas.</td></tr>` : autos.map(a => `
              <tr class="border-t border-slate-100">
                <td class="p-2 font-semibold">${a.name}<div class="text-[10px] text-slate-500">${a.description || ''}</div></td>
                <td class="p-2 text-[10px] font-mono">${a.trigger_type}<div class="text-slate-500">${(a.trigger_config?.cron) || '—'}</div></td>
                <td class="p-2 text-[10px]"><span class="bg-slate-100 px-1.5 py-0.5 rounded">${a.action_type}</span></td>
                <td class="p-2 text-right">${a.run_count || 0}</td>
                <td class="p-2 text-center"><span class="text-[10px] ${a.active?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-600'} px-2 py-0.5 rounded">${a.active?'🟢 Activa':'⏸ Pausada'}</span></td>
                <td class="p-2 text-center">
                  <button onclick="cuToggleAutomation('${a.id}', ${a.active})" class="text-[10px] bg-${a.active?'amber':'emerald'}-100 hover:bg-${a.active?'amber':'emerald'}-200 text-${a.active?'amber':'emerald'}-700 px-2 py-1 rounded font-bold">${a.active?'Pausar':'Activar'}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="border border-slate-200 rounded-xl p-3 bg-slate-50">
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">+ Nueva automatización</div>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <input id="cu-auto-name" placeholder="Nombre (ej. 'Auto-close vencidas')" class="border border-slate-300 rounded px-3 py-2 text-sm" />
          <input id="cu-auto-desc" placeholder="Descripción corta" class="border border-slate-300 rounded px-3 py-2 text-sm" />
          <select id="cu-auto-trigger" class="border border-slate-300 rounded px-3 py-2 text-sm">
            <option value="on_schedule">⏰ Programado (cron)</option>
            <option value="task_status_change">📍 Cambio de status</option>
            <option value="task_created">➕ Task creada</option>
            <option value="recurring_due">🔁 Recurrente vence</option>
          </select>
          <select id="cu-auto-action" class="border border-slate-300 rounded px-3 py-2 text-sm">
            <option value="close_task">✓ Cerrar task</option>
            <option value="comment">💬 Comentar</option>
            <option value="assign">👤 Re-asignar</option>
            <option value="create_subtask">➕ Crear subtask</option>
            <option value="add_tag">🏷 Agregar tag</option>
            <option value="run_ai_template">🤖 Run AI template</option>
          </select>
          <input id="cu-auto-cron" placeholder="Cron (ej. 0 9 * * MON)" value="0 9 * * MON" class="border border-slate-300 rounded px-3 py-2 text-sm font-mono col-span-2" />
        </div>
        <button onclick="cuCreateAutomation()" class="w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2 rounded">💾 Crear automatización (pausada)</button>
      </div>
    </div>
  `;
}

async function cuToggleAutomation(id, currentActive) {
  await sb.from('clickup_automations').update({ active: !currentActive }).eq('id', id);
  await cuLoadAll();
  cuRender();
}

async function cuCreateAutomation() {
  const name = document.getElementById('cu-auto-name').value.trim();
  if (!name) return alert('Nombre requerido');
  const description = document.getElementById('cu-auto-desc').value;
  const trigger_type = document.getElementById('cu-auto-trigger').value;
  const action_type = document.getElementById('cu-auto-action').value;
  const cron = document.getElementById('cu-auto-cron').value || '0 9 * * MON';
  const { error } = await sb.from('clickup_automations').insert({
    name, description,
    trigger_type, trigger_config: { cron },
    action_type, action_config: {},
    active: false
  });
  if (error) return alert('Error: ' + error.message);
  await cuLoadAll();
  cuRender();
}

// ─── S7-B · AGENTE IA REAL (llama Edge Function clickup-ai-agent) ───
async function cuRunAgentNow() {
  if (!confirm('Correr Claude ahora sobre tu snapshot actual?\n\nGenera hasta 5 propuestas accionables.\nCosto aproximado: ~$0.02 (Sonnet).')) return;
  const btn = document.getElementById('cu-agent-run');
  if (btn) { btn.disabled = true; btn.innerText = '⏳ Pensando...'; }
  try {
    const res = await fetch(CU_AGENT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ max_proposals: 5 })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'Falló');
    alert(`✅ ${r.proposals_generated} propuestas generadas.`);
    await cuLoadAll();
    cuRender();
  } catch (e) {
    alert('Error: ' + e.message + '\n\nVerificá ANTHROPIC_API_KEY y que clickup-ai-agent esté deployada.');
    if (btn) { btn.disabled = false; btn.innerText = '🧠 Correr agente ahora'; }
  }
}

function cuRenderAgente() {
  const props = cuState.proposals || [];
  return `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-300 rounded-xl p-3">
        <div class="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <div class="text-sm font-bold text-violet-900">🧠 Agente IA — propuestas accionables</div>
            <div class="text-xs text-violet-800 mt-1">Claude analiza tu snapshot + tasks y propone acciones concretas (close, reassign, automate). Vos aprobás → se ejecuta contra ClickUp API.</div>
          </div>
          <button id="cu-agent-run" onclick="cuRunAgentNow()" class="text-xs bg-violet-700 hover:bg-violet-800 text-white px-4 py-2 rounded font-bold">🧠 Correr agente ahora</button>
        </div>
      </div>

      <div>
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">Propuestas pendientes (${props.length})</div>
        ${props.length === 0 ? '<div class="text-center text-slate-400 text-xs py-8">Sin propuestas. Click "🧠 Correr agente ahora" para generar.</div>' : props.map(p => `
          <div class="border border-slate-200 rounded-xl p-3 mb-2">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap mb-1">
                  <span class="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold uppercase">${p.proposal_type}</span>
                  <span class="text-[10px] text-slate-400">${new Date(p.created_at).toLocaleString('es-MX')}</span>
                </div>
                <div class="font-bold text-sm">${p.title}</div>
                <div class="text-[11px] text-slate-600 mt-1">${p.rationale || ''}</div>
                ${p.action_payload ? `<details class="mt-1"><summary class="text-[10px] text-slate-500 cursor-pointer">payload (click para ver)</summary><pre class="text-[10px] bg-slate-50 p-1.5 rounded mt-1 overflow-x-auto">${JSON.stringify(p.action_payload, null, 2)}</pre></details>` : ''}
              </div>
              <div class="flex flex-col gap-1">
                ${(p.proposal_type==='close' || p.proposal_type==='reassign' || p.proposal_type==='notify') && p.action_payload?.target_task_id ? `
                  <button onclick="cuExecuteProposal('${p.id}')" class="text-[10px] bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded font-bold">⚡ Ejecutar</button>
                ` : ''}
                <button onclick="cuApproveProposal('${p.id}')" class="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded font-bold">✓ Aprobar</button>
                <button onclick="cuRejectProposal('${p.id}')" class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded">✕ Rechazar</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function cuApproveProposal(id) {
  await sb.from('clickup_ai_proposals').update({
    status: 'approved', approved_by: state.user.id, approved_at: new Date().toISOString()
  }).eq('id', id);
  await cuLoadAll();
  cuRender();
}
async function cuRejectProposal(id) {
  await sb.from('clickup_ai_proposals').update({ status: 'rejected' }).eq('id', id);
  await cuLoadAll();
  cuRender();
}

// S7-B: Ejecuta propuesta directamente contra ClickUp via Edge Function
async function cuExecuteProposal(id) {
  const p = cuState.proposals.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Ejecutar contra ClickUp?\n\n${p.title}\n\n${p.rationale || ''}\n\nAcción: ${p.proposal_type}\nTarget: ${p.action_payload?.target_task_id || 'N/A'}`)) return;
  const action_type = p.proposal_type === 'close' ? 'close_task' :
                      p.proposal_type === 'reassign' ? 'assign' :
                      p.proposal_type === 'notify' ? 'comment' : 'comment';
  try {
    const res = await fetch(CU_EXEC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        action_type,
        target_task_id: p.action_payload?.target_task_id,
        payload: p.action_payload,
        proposal_id: p.id,
        executed_by: state.user.id
      })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || JSON.stringify(r.result || {}));
    alert('✅ Ejecutada contra ClickUp.');
    await cuLoadAll();
    cuRender();
  } catch (e) {
    alert('Error: ' + e.message + '\n\nVerificá CLICKUP_TOKEN y que clickup-execute esté deployada.');
  }
}
