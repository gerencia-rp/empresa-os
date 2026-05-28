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

// ─── AUTOMATIZACIONES (placeholder funcional) ───
function cuRenderAutomatizaciones() {
  return `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-violet-900">⚙️ Automatizaciones — próxima pasada</div>
        <div class="text-xs text-violet-800 mt-1">
          Próximos componentes a implementar:
          <ul class="list-disc list-inside mt-1 text-[11px] space-y-0.5">
            <li>Edge function que ejecuta acciones en ClickUp (cerrar tarea, crear subtask, comentar)</li>
            <li>Triggers configurables: cuando una recurrente vence, cuando se sube evidencia a Drive, semanal/diaria</li>
            <li>Acciones IA: generar Bitácora semanal automática desde las tasks cerradas, generar Reporte Estado Obras desde data de Airtable</li>
            <li>Webhook desde ClickUp para reaccionar a cambios en tiempo real</li>
          </ul>
        </div>
      </div>
      <div class="border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">Borrador de nueva automatización</div>
        <input id="cu-auto-name" placeholder="Nombre" class="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-2" />
        <textarea placeholder="Descripción de qué debería hacer (ej. 'Cada lunes 8am, crear el draft de Bitácora con las tasks cerradas la semana')" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" rows="3"></textarea>
        <button class="mt-2 w-full bg-slate-200 text-slate-500 text-sm py-2 rounded cursor-not-allowed" disabled>💾 Guardar borrador (próxima pasada)</button>
      </div>
      ${cuState.automations.length ? `<div class="text-xs text-slate-600">Activas (${cuState.automations.length})</div>` : ''}
    </div>
  `;
}

// ─── AGENTE IA (placeholder funcional) ───
function cuRenderAgente() {
  return `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-300 rounded-xl p-3">
        <div class="text-sm font-bold text-violet-900">🧠 Agente IA — inbox de propuestas</div>
        <div class="text-xs text-violet-800 mt-1">
          El agente IA analiza tu operación cada lunes y propone acciones concretas en ClickUp. Vos las aprobás o rechazás aquí.
          Ejemplos de propuestas: reasignar X tareas de Michell a Diego, cerrar 12 tasks que llevan 60d sin movimiento, crear 4 templates de Bitácora.
        </div>
        <div class="text-[11px] text-violet-700 mt-2">
          <strong>Próxima pasada:</strong> edge function que corre Claude API sobre el snapshot + tasks_mirror, genera propuestas con payload ejecutable.
        </div>
      </div>

      <div>
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">Pendientes de aprobación (${cuState.proposals.length})</div>
        ${cuState.proposals.length === 0 ? '<div class="text-center text-slate-400 text-xs py-8">Sin propuestas pendientes. El agente IA corre los lunes 8am o podés invocarlo manualmente (próxima pasada).</div>' : cuState.proposals.map(p => `
          <div class="border border-slate-200 rounded-xl p-3 mb-2">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <div class="font-bold text-sm">${p.title}</div>
                <div class="text-[11px] text-slate-600 mt-1">${p.rationale || ''}</div>
                <div class="text-[10px] text-slate-400 mt-1">${p.proposal_type} · ${new Date(p.created_at).toLocaleString('es-MX')}</div>
              </div>
              <div class="flex flex-col gap-1">
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
  alert('Propuesta aprobada. La ejecución contra ClickUp API se activa en la próxima pasada.');
  await cuLoadAll();
  cuRender();
}
async function cuRejectProposal(id) {
  await sb.from('clickup_ai_proposals').update({ status: 'rejected' }).eq('id', id);
  await cuLoadAll();
  cuRender();
}
