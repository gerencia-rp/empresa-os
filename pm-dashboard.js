// ============================================================
// PM DASHBOARD — Sistema nervioso central del área Project Management
// Scorecard, WhatsApp config + loop, workload, dependencias, IA agente,
// reportes ejecutivos, risks & compliance.
// ============================================================

const pmState = {
  sys: null,
  tab: 'pulse',
  currentCompany: 'holding',   // 'holding' | <uuid de empresa>
  scorecard: null,
  recipients: [],
  config: null,
  messages: [],
  dailies: [],
  reports: [],
  risks: [],
  compliance: [],
  deps: [],
  // S9
  companies: [],
  executiveCross: [],
  leaderboard: [],
  okrs: [],
  oneOnOnes: [],
  coachingPrompts: [],
  heatmap: [],
  // ClickUp data por empresa
  clickupTasks: [],
  clickupSnapshots: [],
  clickupAlerts: [],
  loading: false
};

const PM_PUSH_URL = `${window.SUPABASE_URL}/functions/v1/pm-daily-push`;
const PM_REVIEW_URL = `${window.SUPABASE_URL}/functions/v1/pm-weekly-review`;
const PM_PERF_URL = `${window.SUPABASE_URL}/functions/v1/pm-compute-performance`;
const PM_1ON1_URL = `${window.SUPABASE_URL}/functions/v1/pm-prepare-1on1`;
const PM_COACH_URL = `${window.SUPABASE_URL}/functions/v1/pm-coaching-prompts`;

async function openPMDashboard(sys) {
  pmState.sys = sys;
  openModal(`🎯 ${sys.name}`, '<div id="pm-root">Cargando...</div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  await pmLoadAll();
  pmRender();
}

async function pmLoadAll() {
  const [s, r, c, m, d, rep, ri, co, dep, comp, exec, lb, okrs, ono, cp, hm, cTasks, cSnap, cAlerts] = await Promise.all([
    sb.from('pm_scorecard').select('*').single(),
    sb.from('pm_whatsapp_recipients').select('*').order('full_name'),
    sb.from('pm_whatsapp_config').select('*').eq('id', 1).single(),
    sb.from('pm_whatsapp_messages').select('*').order('sent_at', { ascending: false }).limit(50),
    sb.from('pm_daily_assignments').select('*, pm_whatsapp_recipients(full_name)').gte('assigned_date', new Date(Date.now()-7*86400000).toISOString().split('T')[0]).order('assigned_date', { ascending: false }),
    sb.from('pm_executive_reports').select('*').order('period_start', { ascending: false }).limit(12),
    sb.from('pm_risks').select('*').neq('status', 'closed').order('score', { ascending: false }),
    sb.from('pm_compliance_items').select('*').eq('status', 'active').order('expiry_date'),
    sb.from('pm_dependencies_cross').select('*').eq('resolved', false).order('severity', { ascending: false }),
    // S9
    sb.from('pm_companies').select('*').order('position').then(r => r.data || []).catch(() => []),
    sb.from('pm_executive_cross_company').select('*').then(r => r.data || []).catch(() => []),
    sb.from('pm_performance_leaderboard').select('*').then(r => r.data || []).catch(() => []),
    sb.from('pm_okrs').select('*, pm_companies(name, slug, icon), pm_whatsapp_recipients(full_name)').neq('status', 'completed').neq('status', 'dropped').order('quarter', { ascending: false }).then(r => r.data || []).catch(() => []),
    sb.from('pm_one_on_ones').select('*, pm_whatsapp_recipients(full_name)').order('scheduled_date', { ascending: false }).limit(30).then(r => r.data || []).catch(() => []),
    sb.from('pm_coaching_prompts').select('*, pm_whatsapp_recipients(full_name)').gte('week_start', new Date(Date.now()-14*86400000).toISOString().split('T')[0]).order('priority').then(r => r.data || []).catch(() => []),
    sb.from('pm_bottleneck_heatmap').select('*').then(r => r.data || []).catch(() => []),
    // ClickUp por empresa
    sb.from('clickup_tasks_mirror').select('*').then(r => r.data || []).catch(() => []),
    sb.from('clickup_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(60).then(r => r.data || []).catch(() => []),
    sb.from('clickup_alerts').select('*').is('resolved_at', null).order('severity', { ascending: false }).limit(50).then(r => r.data || []).catch(() => [])
  ]);
  pmState.scorecard = s.data;
  pmState.recipients = r.data || [];
  pmState.config = c.data;
  pmState.messages = m.data || [];
  pmState.dailies = d.data || [];
  pmState.reports = rep.data || [];
  pmState.risks = ri.data || [];
  pmState.compliance = co.data || [];
  pmState.deps = dep.data || [];
  // S9
  pmState.companies = comp;
  pmState.executiveCross = exec;
  pmState.leaderboard = lb;
  pmState.okrs = okrs;
  pmState.oneOnOnes = ono;
  pmState.coachingPrompts = cp;
  pmState.heatmap = hm;
  // ClickUp
  pmState.clickupTasks = cTasks;
  pmState.clickupSnapshots = cSnap;
  pmState.clickupAlerts = cAlerts;
}

// ─── Helpers de filtrado por empresa actual ───
function pmCurrentCompanyObj() {
  if (pmState.currentCompany === 'holding') return null;
  return pmState.companies.find(c => c.id === pmState.currentCompany);
}
function pmFilterByCompany(items, fieldName = 'company_id') {
  if (pmState.currentCompany === 'holding') return items;
  return items.filter(x => x[fieldName] === pmState.currentCompany);
}
function pmFilterByArea(items) {
  // Para tablas que tienen .area en string (slug). Holding muestra todo.
  if (pmState.currentCompany === 'holding') return items;
  const co = pmCurrentCompanyObj();
  if (!co) return items;
  return items.filter(x => x.area === co.slug);
}
function pmSetCompany(id) { pmState.currentCompany = id; pmRender(); }

function pmSetTab(t) { pmState.tab = t; pmRender(); }

// ─── Definiciones operativas ───
// BACKLOG: tarea pendiente de asignar / esperando el momento de entrar al sprint.
//   NO cuenta como "activa/vencida/atrasada" en NINGUNA métrica operativa.
//   Se detecta por CUALQUIERA de estas señales:
//   1) Sin persona asignada (primary_assignee null)
//   2) Status contiene "backlog" / "por asignar" / "pendiente" / "sin asignar" / "ideas" / "icebox" / "todo" / "to do"
//   3) Lista (list_name) contiene esos mismos términos
//   4) Tag "backlog"
// ACTIVA: tarea abierta + asignada + NO en backlog (alguien debería estar trabajándola)
// CERRADA: status_type === 'closed' o status === 'completado'
const PM_BACKLOG_KEYWORDS = ['backlog', 'por asignar', 'pendiente', 'sin asignar', 'ideas', 'icebox', 'to do', 'todo'];
function pmContainsBacklogKeyword(s) {
  if (!s) return false;
  const t = String(s).toLowerCase().trim();
  return PM_BACKLOG_KEYWORDS.some(k => t === k || t.includes(k));
}
function pmIsClosed(t) { return t.status_type === 'closed' || t.status === 'completado'; }
function pmIsBacklog(t) {
  if (pmIsClosed(t)) return false;
  if (!t.primary_assignee) return true;
  if (pmContainsBacklogKeyword(t.status)) return true;
  if (pmContainsBacklogKeyword(t.list_name)) return true;
  if (Array.isArray(t.tags) && t.tags.some(tag => pmContainsBacklogKeyword(tag))) return true;
  return false;
}
function pmIsActive(t)  { return !pmIsClosed(t) && !pmIsBacklog(t); }
function pmIsOverdue(t) {
  // Solo cuenta vencida si es ACTIVA (asignada + no en backlog) y tiene due_date pasado
  return pmIsActive(t) && t.due_date && new Date(t.due_date) < new Date();
}
// Contexto completo de la tarea para drill-down
function pmTaskContext(t) {
  const parts = [];
  if (t.folder_name) parts.push(`📁 ${t.folder_name}`);
  if (t.list_name) parts.push(`📋 ${t.list_name}`);
  return parts.join(' › ') || '—';
}
function pmTaskContextShort(t) {
  const parts = [];
  if (t.folder_name) parts.push(t.folder_name);
  if (t.list_name) parts.push(t.list_name);
  return parts.join(' › ');
}
// Días con signo: positivo = vencida hace X días · negativo = quedan X días
function pmDaysLate(t) {
  if (!t.due_date) return null;
  const due = new Date(t.due_date);
  // Si está cerrada → días entre cierre y due (negativo = a tiempo, positivo = tarde)
  if (pmIsClosed(t) && t.date_closed) {
    return Math.floor((new Date(t.date_closed) - due) / 86400000);
  }
  // Abierta → días desde hoy vs due
  return Math.floor((Date.now() - due.getTime()) / 86400000);
}
function pmDaysLateLabel(days) {
  if (days == null) return '—';
  if (days > 0) return `+${days}d`;
  if (days < 0) return `${days}d`;
  return '0d';
}
function pmDaysLateClass(days) {
  if (days == null) return 'text-slate-400';
  if (days > 0) return 'text-red-700 font-bold';
  if (days < 0) return 'text-emerald-700';
  return 'text-amber-700 font-bold';
}

function pmRender() {
  const root = document.getElementById('pm-root');
  if (!root) return;
  const cos = (pmState.companies || []).filter(c => c.active && !c.is_holding);
  const cur = pmState.currentCompany;
  const isHolding = cur === 'holding';
  const curCo = pmCurrentCompanyObj();

  // Tabs adaptados según vista (Holding vs Empresa)
  const tabs = isHolding ? [
    ['pulse', '📊 Cross-Empresa'],
    ['performance', '🏆 Performance'],
    ['okrs', '🎯 OKRs'],
    ['oneOnOnes', '💬 1-on-1s'],
    ['coaching', '🧠 Coaching IA'],
    ['risks', '⚠️ Riesgos'],
    ['compliance', '📜 Compliance'],
    ['deps', '🔗 Dependencias'],
    ['reports', '📈 Reportes IA'],
    ['whatsapp', '📱 WhatsApp'],
    ['companies', '🏛️ Empresas']
  ] : [
    ['pulse', '📊 Pulse'],
    ['tasks', '📋 Tareas ClickUp'],
    ['team', '👥 Equipo'],
    ['heatmap', '🔥 Bottlenecks'],
    ['okrs', '🎯 OKRs'],
    ['decisiones', '✅ Decisiones'],
    ['risks', '⚠️ Riesgos'],
    ['compliance', '📜 Compliance'],
    ['oneOnOnes', '💬 1-on-1s']
  ];

  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[84vh]">

      <!-- SELECTOR DE EMPRESA — scroll horizontal en mobile -->
      <div class="mb-2 pb-2 border-b border-slate-200">
        <div class="flex items-center gap-2 overflow-x-auto sm:flex-wrap pb-1">
          <span class="text-[10px] font-bold uppercase text-slate-500 mr-1 whitespace-nowrap">Empresa:</span>
          <button onclick="pmSetCompany('holding')" class="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${isHolding ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">🏛️ Holding</button>
          ${cos.map(c => `
            <button onclick="pmSetCompany('${c.id}')" class="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${cur===c.id ? `bg-${c.color||'slate'}-600 text-white shadow` : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">${c.icon} ${c.name}</button>
          `).join('')}
          <div class="ml-auto flex items-center gap-2 text-[10px] text-slate-500 flex-shrink-0">
            ${curCo ? `<span class="hidden sm:inline">Space: <code class="bg-slate-100 px-1.5 py-0.5 rounded">${curCo.clickup_space_id || '⚠️'}</code></span>` : ''}
            <button onclick="withLoading(this, pmTriggerSync)" title="Sincronizar ClickUp ahora" class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold whitespace-nowrap">🔄 Sync</button>
          </div>
        </div>
      </div>

      <!-- TABS — scroll horizontal en mobile -->
      <div class="mb-3 pb-2 border-b border-slate-200">
        <div class="flex items-center gap-1 overflow-x-auto sm:flex-wrap pb-1" role="tablist">
          ${tabs.map(([k,l]) => `
            <button onclick="pmSetTab('${k}')" role="tab" aria-selected="${pmState.tab===k}" class="flex-shrink-0 px-2.5 py-1.5 rounded text-xs font-bold whitespace-nowrap ${pmState.tab===k?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}">${l}</button>
          `).join('')}
        </div>
      </div>

      <!-- BODY -->
      <div class="flex-1 overflow-y-auto">
        ${pmState.tab === 'pulse' ? (isHolding ? pmRenderHoldingPulse() : pmRenderEmpresaPulse()) :
          pmState.tab === 'tasks' ? pmRenderClickUpTasks() :
          pmState.tab === 'team' ? pmRenderTeam() :
          pmState.tab === 'decisiones' ? pmRenderDecisiones() :
          pmState.tab === 'performance' ? pmRenderPerformance() :
          pmState.tab === 'okrs' ? pmRenderOKRs() :
          pmState.tab === 'oneOnOnes' ? pmRenderOneOnOnes() :
          pmState.tab === 'coaching' ? pmRenderCoaching() :
          pmState.tab === 'heatmap' ? pmRenderHeatmap() :
          pmState.tab === 'companies' ? pmRenderCompanies() :
          pmState.tab === 'whatsapp' ? pmRenderWhatsApp() :
          pmState.tab === 'deps' ? pmRenderDeps() :
          pmState.tab === 'reports' ? pmRenderReports() :
          pmState.tab === 'risks' ? pmRenderRisks() :
          pmRenderCompliance()}
      </div>
    </div>
  `;
}

// ─── Trigger sync ClickUp manual ───
async function pmTriggerSync() {
  if (!confirm('Sincronizar ClickUp ahora (las 3 empresas)? Puede tardar 30-60 seg.')) return;
  try {
    const url = `${window.SUPABASE_URL}/functions/v1/sync-clickup`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAccessToken()}` },
      body: JSON.stringify({ user_id: state.user.id })
    });
    const r = await res.json();
    if (r.ok) {
      alert(`✅ Sync completado.\n${r.tasks_synced} tasks, ${r.companies_synced} empresas, ${r.alerts} alertas.\n${(r.per_company||[]).map(c => '• '+c.company+': '+c.tasks+' tasks').join('\n')}`);
    } else {
      alert('Error: ' + r.error);
    }
    await pmLoadAll(); pmRender();
  } catch (e) { alert('Error: ' + e.message); }
}

// ─── SCORECARD ───
function pmRenderScorecard() {
  const s = pmState.scorecard || {};
  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-500">Última actualización: ${s.last_calculated_at ? new Date(s.last_calculated_at).toLocaleString('es-MX') : '—'}</div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-slate-900 text-white rounded-xl p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Obras activas</div>
          <div class="text-3xl font-bold">${s.obras_activas || 0}</div>
          <div class="text-[10px] text-slate-400">${s.alertas_obras_critical || 0} alertas críticas</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div class="text-[10px] text-blue-700 uppercase font-bold">Capital en obra</div>
          <div class="text-3xl font-bold text-blue-900">$${Math.round((s.capital_en_obra||0)/1000)}K</div>
        </div>
        <div class="bg-${(s.clickup_overdue||0)>10?'red':'emerald'}-50 border border-${(s.clickup_overdue||0)>10?'red':'emerald'}-200 rounded-xl p-3">
          <div class="text-[10px] uppercase font-bold">ClickUp open / overdue</div>
          <div class="text-3xl font-bold">${s.clickup_open||0}</div>
          <div class="text-[10px] ${(s.clickup_overdue||0)>10?'text-red-700 font-bold':'text-emerald-700'}">${s.clickup_overdue||0} vencidas</div>
        </div>
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-3">
          <div class="text-[10px] text-violet-700 uppercase font-bold">Bus factor</div>
          <div class="text-3xl font-bold text-violet-900">${s.bus_factor_pct||0}%</div>
          <div class="text-[10px] text-violet-700">${(s.bus_factor_pct||0)>=60?'🚨 riesgo alto':(s.bus_factor_pct||0)>=40?'⚠️ atento':'✓ ok'}</div>
        </div>

        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Acciones pendientes</div>
          <div class="text-3xl font-bold text-amber-900">${s.acciones_pendientes||0}</div>
          <div class="text-[10px] text-red-700 font-bold">${s.acciones_vencidas||0} vencidas</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">Daily hoy</div>
          <div class="text-3xl font-bold text-emerald-900">${s.dailies_hoy_cerrados||0}/${s.dailies_hoy||0}</div>
          <div class="text-[10px] text-emerald-700">${s.dailies_hoy?Math.round((s.dailies_hoy_cerrados||0)/s.dailies_hoy*100):0}% cerrado</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-[10px] text-red-700 uppercase font-bold">Risks high (score ≥12)</div>
          <div class="text-3xl font-bold text-red-900">${s.risks_high||0}</div>
        </div>
        <div class="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <div class="text-[10px] text-orange-700 uppercase font-bold">Compliance vence 30d</div>
          <div class="text-3xl font-bold text-orange-900">${s.compliance_expiring_soon||0}</div>
          <div class="text-[10px] text-orange-700">${s.cross_deps_open||0} deps cross-área</div>
        </div>
      </div>

      <div class="bg-slate-900 text-white rounded-xl p-3 text-xs">
        💡 <strong>Cómo leer:</strong> Esta pantalla cruza las 5 áreas en tiempo real. Si bus factor &gt; 60% o vencidas &gt; 10 → conviene revisar antes de seguir. Click cualquier número va al sistema fuente (próximamente).
      </div>
    </div>
  `;
}

// ─── WHATSAPP ───
function pmRenderWhatsApp() {
  const cfg = pmState.config || {};
  const recipients = pmState.recipients || [];
  const msgs = pmState.messages || [];
  return `
    <div class="space-y-3">
      <!-- 🚀 Envío automático con Cloud API + compositor rápido -->
      <div class="bg-gradient-to-br from-blue-500 to-indigo-700 text-white rounded-xl p-4 shadow-lg">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div class="flex-1 min-w-0">
            <div class="text-[10px] font-bold uppercase opacity-80 tracking-wider">⚡ Envío 100% automático</div>
            <div class="text-base font-bold mt-0.5">Compositor rápido + Cloud API (Meta)</div>
            <div class="text-xs opacity-90 mt-1">Mismas credenciales que Educación. Una sola app de Meta para los dos sistemas.</div>
          </div>
          <button onclick="pmOpenQuickComposer()" class="bg-white text-indigo-700 font-bold text-sm px-3 py-2 rounded shadow hover:bg-indigo-50 whitespace-nowrap">✍️ Componer mensaje →</button>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center bg-white/15 backdrop-blur rounded-lg p-2">
          <div>
            <div class="text-[9px] uppercase opacity-80 font-bold">Destinatarios</div>
            <div class="text-base font-bold">${recipients.filter(r => r.active).length}</div>
          </div>
          <div>
            <div class="text-[9px] uppercase opacity-80 font-bold">Mensajes hoy</div>
            <div class="text-base font-bold">${msgs.filter(m => m.sent_at && m.sent_at.slice(0,10) === new Date().toISOString().slice(0,10)).length}</div>
          </div>
          <div>
            <div class="text-[9px] uppercase opacity-80 font-bold">Cloud API</div>
            <div class="text-base font-bold">${recipients.filter(r => r.active && (r.phone_number||'').replace(/\D/g,'').length >= 10).length} ok</div>
          </div>
        </div>
      </div>

      <!-- Config global -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">⚙️ Config del bot</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div>
            <label class="block text-[10px] text-slate-500">Activo</label>
            <select onchange="pmConfigUpdate('active', this.value === 'true')" class="w-full border border-slate-300 rounded px-2 py-1">
              <option value="false" ${!cfg.active?'selected':''}>⏸ Pausado</option>
              <option value="true" ${cfg.active?'selected':''}>🟢 Activo</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] text-slate-500">Push (hora)</label>
            <input type="number" min="0" max="23" value="${cfg.daily_push_hour || 7}" onchange="pmConfigUpdate('daily_push_hour', +this.value)" class="w-full border border-slate-300 rounded px-2 py-1" />
          </div>
          <div>
            <label class="block text-[10px] text-slate-500">Close (hora)</label>
            <input type="number" min="0" max="23" value="${cfg.daily_close_hour || 18}" onchange="pmConfigUpdate('daily_close_hour', +this.value)" class="w-full border border-slate-300 rounded px-2 py-1" />
          </div>
          <div>
            <label class="block text-[10px] text-slate-500">Reporte (hora)</label>
            <input type="number" min="0" max="23" value="${cfg.group_report_hour || 20}" onchange="pmConfigUpdate('group_report_hour', +this.value)" class="w-full border border-slate-300 rounded px-2 py-1" />
          </div>
          <div class="col-span-2 md:col-span-3">
            <label class="block text-[10px] text-slate-500">Group chat ID (reporte 8pm)</label>
            <input value="${cfg.group_chat_id || ''}" placeholder="ej. 5215512345678" onchange="pmConfigUpdate('group_chat_id', this.value)" class="w-full border border-slate-300 rounded px-2 py-1" />
          </div>
          <div class="flex items-end">
            <button onclick="withLoading(this, pmRunDailyPushNow)" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded">⚡ Correr push ahora</button>
          </div>
        </div>
      </div>

      <!-- Recipients -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 flex justify-between items-center">
          <span class="text-xs font-bold uppercase text-slate-700">👥 Destinatarios (${recipients.length})</span>
          <button onclick="pmAddRecipient()" class="text-[10px] bg-slate-900 hover:bg-slate-700 text-white px-2 py-1 rounded font-bold">+ Agregar</button>
        </div>
        ${recipients.length === 0 ? `<div class="p-6 text-center text-xs text-slate-400">Sin destinatarios. Agregá los crews/leaders que reciben el daily.</div>` : `
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr><th class="text-left p-2">Nombre</th><th class="text-left p-2">Teléfono</th><th class="text-left p-2">ClickUp user</th><th class="text-center p-2">Push</th><th class="text-center p-2">Close</th><th class="text-center p-2">Activo</th></tr>
            </thead>
            <tbody>
              ${recipients.map(r => `
                <tr class="border-t border-slate-100">
                  <td class="p-2 font-semibold">${r.full_name}</td>
                  <td class="p-2 font-mono text-[10px]">${r.phone_number}</td>
                  <td class="p-2 text-slate-600">${r.clickup_username || '—'}</td>
                  <td class="p-2 text-center">${r.receives_daily_push ? '✅' : '—'}</td>
                  <td class="p-2 text-center">${r.receives_daily_close ? '✅' : '—'}</td>
                  <td class="p-2 text-center">
                    <button onclick="pmRecipientToggle('${r.id}', ${r.active})" class="text-[10px] ${r.active?'text-emerald-600':'text-slate-400'}">${r.active?'✓':'○'}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- Últimos mensajes -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">💬 Últimos 50 mensajes</div>
        ${msgs.length === 0 ? `<div class="p-6 text-center text-xs text-slate-400">Sin mensajes todavía.</div>` : `
          <div class="max-h-96 overflow-y-auto divide-y divide-slate-100">
            ${msgs.map(m => `
              <div class="p-2 ${m.direction==='out'?'bg-blue-50':''}">
                <div class="flex justify-between text-[10px] text-slate-500">
                  <span>${m.direction==='out'?'📤':'📥'} ${m.phone_number}</span>
                  <span>${new Date(m.sent_at).toLocaleString('es-MX')}</span>
                </div>
                <div class="text-xs mt-1 whitespace-pre-wrap">${(m.body || '').slice(0, 200)}${(m.body||'').length > 200 ? '…' : ''}</div>
                ${m.status !== 'sent' ? `<div class="text-[9px] text-slate-400 mt-1">${m.status}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

async function pmConfigUpdate(field, value) {
  await sb.from('pm_whatsapp_config').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', 1);
  await pmLoadAll(); pmRender();
}

async function pmAddRecipient() {
  const full_name = prompt('Nombre completo:'); if (!full_name) return;
  const phone_number = prompt('Teléfono (formato +15125551234):'); if (!phone_number) return;
  const clickup_username = prompt('Username en ClickUp (para matchear tasks):', full_name);
  const role = prompt('Rol (pm/crew_leader/specialist/office):', 'crew_leader') || 'crew_leader';
  const { error } = await sb.from('pm_whatsapp_recipients').insert({
    full_name, phone_number, clickup_username, role, active: true, receives_daily_push: true, receives_daily_close: true
  });
  if (error) return alert('Error: ' + error.message);
  await pmLoadAll(); pmRender();
}

async function pmRecipientToggle(id, current) {
  await sb.from('pm_whatsapp_recipients').update({ active: !current }).eq('id', id);
  await pmLoadAll(); pmRender();
}

async function pmRunDailyPushNow() {
  if (!confirm('Correr el push de hoy ahora?\n\nVa a mandar WhatsApp a todos los recipients activos con su lista de tareas.')) return;
  try {
    const res = await fetch(PM_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAccessToken()}` },
      body: JSON.stringify({ trigger: 'manual' })
    });
    const r = await res.json();
    alert(r.ok ? `✅ Push enviado a ${r.pushed} destinatarios.` : 'Error: ' + r.error);
    await pmLoadAll(); pmRender();
  } catch (e) { alert('Error: ' + e.message); }
}

// ─── WORKLOAD ───
function pmRenderWorkload() {
  const dailies = pmState.dailies || [];
  const byPerson = {};
  dailies.forEach(d => {
    const r = d.pm_whatsapp_recipients;
    const name = r?.full_name || 'Sin asignar';
    if (!byPerson[name]) byPerson[name] = { total: 0, done: 0, carried: 0, dailies: 0 };
    byPerson[name].total += d.tasks_total;
    byPerson[name].done += d.tasks_done;
    byPerson[name].carried += d.tasks_carried_over;
    byPerson[name].dailies++;
  });

  const list = Object.entries(byPerson).sort((a,b) => (b[1].total) - (a[1].total));

  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Workload + performance individual de los últimos 7 días (datos del WhatsApp Daily Loop).</div>
      ${list.length === 0 ? `<div class="text-center py-12 text-slate-400">Sin dailies aún. Activá el bot y empezarán a llegar datos.</div>` : `
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left p-2">Persona</th>
                <th class="text-right p-2">Días</th>
                <th class="text-right p-2">Total tareas</th>
                <th class="text-right p-2">Done</th>
                <th class="text-right p-2">Carry-over</th>
                <th class="text-right p-2">Cumplim.</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(([name, s]) => {
                const pct = s.total > 0 ? Math.round(s.done/s.total*100) : 0;
                const tone = pct >= 80 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700 font-bold';
                return `<tr class="border-t border-slate-100">
                  <td class="p-2 font-semibold">${name}</td>
                  <td class="p-2 text-right">${s.dailies}</td>
                  <td class="p-2 text-right">${s.total}</td>
                  <td class="p-2 text-right text-emerald-700">${s.done}</td>
                  <td class="p-2 text-right ${s.carried>5?'text-amber-700 font-bold':''}">${s.carried}</td>
                  <td class="p-2 text-right ${tone}">${pct}%</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ─── DEPS ───
function pmRenderDeps() {
  const deps = pmState.deps || [];
  return `
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">Dependencias cross-área. Si X bloquea Y, registralo acá. El sistema avisa cuando se resuelve.</div>
        <button onclick="pmAddDep()" class="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded font-bold">+ Agregar dependencia</button>
      </div>
      ${deps.length === 0 ? `<div class="text-center py-12 text-slate-400">Sin dependencias registradas. Click "+ Agregar" para empezar.</div>` : deps.map(d => `
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="text-xs"><strong>${d.source_label || d.source_id}</strong> [${d.source_area}] → bloquea → <strong>${d.target_label || d.target_id}</strong> [${d.target_area}]</div>
              <div class="text-[11px] text-slate-600 mt-1">${d.reason || ''}</div>
            </div>
            <div class="flex gap-1">
              <span class="text-[10px] bg-${d.severity==='critical'?'red':d.severity==='high'?'amber':'slate'}-100 text-${d.severity==='critical'?'red':d.severity==='high'?'amber':'slate'}-800 px-2 py-0.5 rounded">${d.severity}</span>
              <button onclick="pmResolveDep('${d.id}')" class="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-bold">✓ Resolver</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function pmAddDep() {
  const source_label = prompt('Qué bloquea? (ej. "Inspección Childress")'); if (!source_label) return;
  const source_area = prompt('Área source (remodelacion/rentas/fix_flip/pm/clickup):', 'remodelacion') || 'remodelacion';
  const target_label = prompt('A quién/qué bloquea? (ej. "Cerrar lender STX")'); if (!target_label) return;
  const target_area = prompt('Área target:', 'pm') || 'pm';
  const reason = prompt('Por qué? (opcional):', '') || null;
  const severity = prompt('Severidad (low/normal/high/critical):', 'normal') || 'normal';
  await sb.from('pm_dependencies_cross').insert({
    source_type: 'custom', source_id: source_label, source_label, source_area,
    target_type: 'custom', target_id: target_label, target_label, target_area,
    reason, severity, created_by: state.user.id
  });
  await pmLoadAll(); pmRender();
}
async function pmResolveDep(id) {
  await sb.from('pm_dependencies_cross').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
  await pmLoadAll(); pmRender();
}

// ─── AGENT ───
function pmRenderAgent() {
  return `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-900">
        🤖 <strong>IA Agente PM</strong>: corre Claude sobre tu scorecard + ClickUp + Remodel data para generar el Weekly Business Review (lunes 7am automático).
      </div>
      <button onclick="withLoading(this, pmRunWeeklyReviewNow)" class="w-full bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold py-3 rounded">🧠 Generar Weekly Review ahora</button>
      <div class="text-[11px] text-slate-500 text-center">Costo aproximado: ~$0.03 por ejecución.</div>
    </div>
  `;
}

async function pmRunWeeklyReviewNow() {
  if (!confirm('Generar el Weekly Review ahora?\n\nClaude va a analizar los últimos 7 días cross-empresa y guardar el reporte.')) return;
  try {
    const res = await fetch(PM_REVIEW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAccessToken()}` },
      body: JSON.stringify({})
    });
    const r = await res.json();
    alert(r.ok ? `✅ Reporte generado: ${r.period}` : 'Error: ' + r.error);
    await pmLoadAll(); pmSetTab('reports');
  } catch (e) { alert('Error: ' + e.message); }
}

// ─── REPORTS ───
function pmRenderReports() {
  const reps = pmState.reports || [];
  return `
    <div class="space-y-3">
      ${reps.length === 0 ? `<div class="text-center py-12 text-slate-400">Sin reportes. Click "🧠 Generar Weekly Review ahora" en tab IA Agente.</div>` : reps.map(r => `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 flex justify-between">
            <span class="text-xs font-bold">📅 ${r.report_type} · ${r.period_start} → ${r.period_end}</span>
            <span class="text-[10px] text-slate-500">${r.cost_tokens_used || 0} tokens</span>
          </div>
          <div class="p-3">
            <div class="text-xs whitespace-pre-wrap">${r.summary_md || '—'}</div>
            ${(r.recommendations || []).length ? `
              <div class="mt-3">
                <div class="text-[10px] font-bold uppercase text-slate-600 mb-1">Recomendaciones</div>
                <ul class="text-xs space-y-0.5 list-disc list-inside">
                  ${(r.recommendations || []).slice(0,10).map(x => `<li>${typeof x === 'string' ? x : (x.action || x.titulo || JSON.stringify(x))}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── RISKS ───
function pmRenderRisks() {
  const risks = pmFilterByArea(pmState.risks || []);
  const aiKey = 'pm-risks-' + pmState.currentCompany;
  const ai = (window.aiState && window.aiState[aiKey]) || {};

  // KPIs Risks
  const critical = risks.filter(r => r.score >= 15);
  const high = risks.filter(r => r.score >= 10 && r.score < 15);
  const medium = risks.filter(r => r.score >= 5 && r.score < 10);
  const low = risks.filter(r => r.score < 5);
  const mitigating = risks.filter(r => r.status === 'mitigating');

  // Matrix prob × impact
  const matrix = {};
  for (let p = 1; p <= 5; p++) {
    matrix[p] = {};
    for (let i = 1; i <= 5; i++) matrix[p][i] = [];
  }
  risks.forEach(r => {
    if (r.probability && r.impact && r.status !== 'closed') {
      matrix[r.probability][r.impact].push(r);
    }
  });

  // Por categoría
  const byCategory = {};
  risks.forEach(r => { const c = r.category || 'sin categoría'; byCategory[c] = (byCategory[c]||0) + 1; });

  // Análisis
  const insights = [];
  if (critical.length > 0) insights.push(`🚨 <strong>${critical.length} riesgo${critical.length>1?'s':''} crítico${critical.length>1?'s':''}</strong> (score ≥15). Necesitan mitigation plan AHORA.`);
  if (high.length > 0) insights.push(`⚠️ <strong>${high.length}</strong> riesgos en zona high (score 10-14). Owner asignado y plan documentado.`);
  if (mitigating.length === 0 && (critical.length + high.length) > 0) insights.push(`📋 <strong>Cero riesgos en estado "mitigating"</strong> aunque hay críticos/altos. ¿Hay un plan activo para cada uno?`);
  const noOwner = risks.filter(r => !r.owner && r.score >= 10);
  if (noOwner.length > 0) insights.push(`👤 <strong>${noOwner.length}</strong> riesgos high/critical SIN owner. Asignar responsable.`);

  return `
    <div class="space-y-3">
      <!-- KPIs Riesgos -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-red-600 text-white rounded-xl p-3">
          <div class="text-[10px] text-red-100 uppercase font-bold">Críticos</div>
          <div class="text-3xl font-bold">${critical.length}</div>
          <div class="text-[10px] text-red-100">score ≥15</div>
        </div>
        <div class="bg-amber-50 border border-amber-300 rounded-xl p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">High</div>
          <div class="text-3xl font-bold text-amber-900">${high.length}</div>
          <div class="text-[10px] text-amber-700">score 10-14</div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <div class="text-[10px] text-yellow-700 uppercase font-bold">Medium</div>
          <div class="text-3xl font-bold text-yellow-900">${medium.length}</div>
          <div class="text-[10px] text-yellow-700">score 5-9</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">Low</div>
          <div class="text-3xl font-bold text-emerald-900">${low.length}</div>
          <div class="text-[10px] text-emerald-700">score &lt;5</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div class="text-[10px] text-blue-700 uppercase font-bold">Mitigating</div>
          <div class="text-3xl font-bold text-blue-900">${mitigating.length}</div>
          <div class="text-[10px] text-blue-700">en gestión activa</div>
        </div>
      </div>

      ${insights.length > 0 ? `
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-red-900 mb-2">🤖 Análisis del risk register</div>
          <ul class="space-y-1 text-xs text-slate-700">${insights.map(i => `<li>• ${i}</li>`).join('')}</ul>
        </div>
      ` : ''}

      <!-- Risk Matrix 5x5 -->
      ${risks.filter(r => r.status !== 'closed').length > 0 ? `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">📊 Risk Matrix (Probabilidad × Impacto)</div>
          <div class="p-3">
            <table class="w-full text-xs">
              <tbody>
                ${[5,4,3,2,1].map(p => `
                  <tr>
                    <td class="text-[9px] text-right pr-2 font-bold text-slate-500">P${p}</td>
                    ${[1,2,3,4,5].map(i => {
                      const cell = matrix[p][i];
                      const score = p * i;
                      const bg = score >= 15 ? 'bg-red-500' : score >= 10 ? 'bg-orange-300' : score >= 5 ? 'bg-yellow-200' : 'bg-emerald-100';
                      const tc = score >= 15 ? 'text-white' : score >= 10 ? 'text-orange-900' : 'text-slate-700';
                      const tooltip = cell.length ? cell.map(r => '• '+r.title).join('\n') : '';
                      return `<td class="${bg} ${tc} text-center font-bold p-3 border border-white/40" title="${tooltip}">${cell.length || ''}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
                <tr><td></td>${[1,2,3,4,5].map(i => `<td class="text-[9px] text-center text-slate-500 font-bold pt-1">I${i}</td>`).join('')}</tr>
              </tbody>
            </table>
            <div class="text-[10px] text-slate-500 mt-2 italic">P=Probabilidad · I=Impacto · score = P×I · Hover celdas con número para ver títulos</div>
          </div>
        </div>
      ` : ''}

      <!-- Por categoría -->
      ${Object.keys(byCategory).length > 0 ? `
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-700 mb-2">📁 Por categoría</div>
          <div class="flex flex-wrap gap-2">
            ${Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([c,n]) => `<span class="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded"><strong>${c}</strong>: ${n}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="flex justify-between items-center flex-wrap gap-2">
        <div class="text-xs text-slate-600">Risk register. Score = probabilidad × impacto. Score ≥ 12 = atender.</div>
        <div class="flex gap-2">
          <button onclick="pmGenerateRisksAnalysis()" class="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-2 rounded" title="Claude analiza la operación y detecta riesgos no registrados">🤖 Analizar riesgos con IA</button>
          <button onclick="pmAddRisk()" class="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded font-bold">+ Agregar risk</button>
        </div>
      </div>

      ${ai.loading ? `<div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900"><span class="animate-pulse">🧠 Claude analizando tu operación para detectar riesgos...</span></div>` : ''}
      ${ai.error ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900">⚠️ ${ai.error}</div>` : ''}
      ${ai.detected_risks && ai.detected_risks.length ? `
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 rounded-xl p-4">
          <div class="text-xs font-bold text-violet-900 uppercase mb-2">🤖 Riesgos detectados por Claude (no en tu register)</div>
          <div class="space-y-2">
            ${ai.detected_risks.map((r,i) => `
              <div class="bg-white border border-violet-200 rounded-lg p-3">
                <div class="flex justify-between gap-2">
                  <div class="flex-1">
                    <div class="font-bold text-sm">${r.title}</div>
                    ${r.evidence ? `<div class="text-[11px] text-slate-600 italic mt-1">📊 ${r.evidence}</div>` : ''}
                    ${r.mitigation ? `<div class="text-[11px] text-emerald-700 mt-1">💡 ${r.mitigation}</div>` : ''}
                  </div>
                  <div class="flex flex-col items-end gap-1 flex-shrink-0">
                    <span class="text-[10px] bg-${r.score>=15?'red':r.score>=10?'amber':'slate'}-100 text-${r.score>=15?'red':r.score>=10?'amber':'slate'}-800 px-2 py-0.5 rounded font-bold">score ${r.score}</span>
                    <button onclick="pmAdoptDetectedRisk(${i})" class="text-[10px] bg-violet-600 hover:bg-violet-700 text-white font-bold px-2 py-1 rounded">+ Agregar</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${ai.recommendations && ai.recommendations.length ? `
        <div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs">
          <strong>🎯 Recomendaciones generales (IA):</strong>
          <ul class="mt-1 ml-4 list-disc space-y-1">${ai.recommendations.map(r => `<li>${typeof r==='string'?r:JSON.stringify(r)}</li>`).join('')}</ul>
        </div>
      ` : ''}

      ${risks.length === 0 ? `<div class="text-center py-8 text-slate-400">Sin riesgos registrados aún. Click "🤖 Analizar riesgos con IA" para que Claude detecte riesgos basados en tu operación.</div>` : `
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50"><tr><th class="text-left p-2">Título</th><th class="text-center p-2">Área</th><th class="text-center p-2">Prob</th><th class="text-center p-2">Impacto</th><th class="text-center p-2">Score</th><th class="text-center p-2">Status</th></tr></thead>
            <tbody>
              ${risks.map(r => `<tr class="border-t border-slate-100 ${r.score>=12?'bg-red-50':''}">
                <td class="p-2"><div class="font-semibold">${r.title}</div><div class="text-[10px] text-slate-500">${r.description || ''}</div></td>
                <td class="p-2 text-center">${r.area || '—'}</td>
                <td class="p-2 text-center">${r.probability}</td>
                <td class="p-2 text-center">${r.impact}</td>
                <td class="p-2 text-center font-bold ${r.score>=15?'text-red-700':r.score>=10?'text-amber-700':'text-emerald-700'}">${r.score}</td>
                <td class="p-2 text-center">${r.status}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}
async function pmAddRisk() {
  const title = prompt('Riesgo:'); if (!title) return;
  const description = prompt('Descripción:', '') || null;
  const area = prompt('Área (remodelacion/rentas/fix_flip/pm):', 'pm');
  const probability = +prompt('Probabilidad (1-5):', '3') || 3;
  const impact = +prompt('Impacto (1-5):', '3') || 3;
  await sb.from('pm_risks').insert({ title, description, area, probability, impact });
  await pmLoadAll(); pmRender();
}

// ─── COMPLIANCE ───
function pmRenderCompliance() {
  const items = pmFilterByArea(pmState.compliance || []);
  const today = new Date(); today.setHours(0,0,0,0);
  const aiKey = 'pm-compliance-' + pmState.currentCompany;
  const ai = (window.aiState && window.aiState[aiKey]) || {};

  // KPIs Compliance
  const daysTo = (d) => d ? Math.round((new Date(d) - today) / 86400000) : null;
  const vencidos = items.filter(c => c.expiry_date && daysTo(c.expiry_date) < 0);
  const venceMes = items.filter(c => c.expiry_date && daysTo(c.expiry_date) >= 0 && daysTo(c.expiry_date) <= 30);
  const venceTrim = items.filter(c => c.expiry_date && daysTo(c.expiry_date) > 30 && daysTo(c.expiry_date) <= 90);
  const ok = items.filter(c => !c.expiry_date || daysTo(c.expiry_date) > 90);

  // Por tipo
  const byType = {};
  items.forEach(c => { const t = c.type || 'other'; byType[t] = (byType[t]||0) + 1; });

  // Análisis
  const insights = [];
  if (vencidos.length > 0) insights.push(`🚨 <strong>${vencidos.length} item${vencidos.length>1?'s':''} VENCIDO${vencidos.length>1?'S':''}</strong>. Renovar urgente — pueden generar multa o paralizar operación.`);
  if (venceMes.length > 0) insights.push(`⚠️ <strong>${venceMes.length}</strong> vence${venceMes.length>1?'n':''} en los próximos 30 días. Empezá trámite ya.`);
  if (items.length === 0) insights.push(`📭 Sin compliance items registrados. Click "🤖 Análisis IA" para que Claude sugiera lo que probablemente te falte.`);
  if (items.length > 0 && venceMes.length === 0 && vencidos.length === 0) insights.push(`✅ Sin items próximos a vencer. Compliance al día.`);

  return `
    <div class="space-y-3">
      <!-- KPIs Compliance -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-red-600 text-white rounded-xl p-3">
          <div class="text-[10px] text-red-100 uppercase font-bold">Vencidos</div>
          <div class="text-3xl font-bold">${vencidos.length}</div>
          <div class="text-[10px] text-red-100">renovar ya</div>
        </div>
        <div class="bg-amber-50 border border-amber-300 rounded-xl p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Vence ≤30d</div>
          <div class="text-3xl font-bold text-amber-900">${venceMes.length}</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div class="text-[10px] text-blue-700 uppercase font-bold">Vence ≤90d</div>
          <div class="text-3xl font-bold text-blue-900">${venceTrim.length}</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">OK</div>
          <div class="text-3xl font-bold text-emerald-900">${ok.length}</div>
          <div class="text-[10px] text-emerald-700">&gt;90d o sin vencimiento</div>
        </div>
        <div class="bg-slate-900 text-white rounded-xl p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Total</div>
          <div class="text-3xl font-bold">${items.length}</div>
          <div class="text-[10px] text-slate-400">items activos</div>
        </div>
      </div>

      ${insights.length > 0 ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-amber-900 mb-2">🤖 Análisis de compliance</div>
          <ul class="space-y-1 text-xs text-slate-700">${insights.map(i => `<li>• ${i}</li>`).join('')}</ul>
        </div>
      ` : ''}

      ${Object.keys(byType).length > 0 ? `
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-700 mb-2">📁 Por tipo</div>
          <div class="flex flex-wrap gap-2">
            ${Object.entries(byType).sort((a,b) => b[1]-a[1]).map(([t,n]) => `<span class="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded"><strong>${t}</strong>: ${n}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="flex justify-between items-center flex-wrap gap-2">
        <div class="text-xs text-slate-600">Permisos, licencias, seguros con fecha de vencimiento.</div>
        <div class="flex gap-2">
          <button onclick="pmGenerateComplianceAnalysis()" class="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-2 rounded" title="Claude sugiere compliance items que probablemente te falten">🤖 Análisis IA</button>
          <button onclick="pmAddCompliance()" class="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded font-bold">+ Agregar item</button>
        </div>
      </div>

      ${ai.loading ? `<div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900"><span class="animate-pulse">🧠 Claude analizando compliance...</span></div>` : ''}
      ${ai.error ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900">⚠️ ${ai.error}</div>` : ''}
      ${ai.missing_items && ai.missing_items.length ? `
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 rounded-xl p-4">
          <div class="text-xs font-bold text-violet-900 uppercase mb-2">🤖 Compliance que probablemente te falta</div>
          <div class="space-y-2">
            ${ai.missing_items.map(m => `
              <div class="bg-white border border-violet-200 rounded-lg p-3 text-xs">
                <div class="flex justify-between"><strong>${m.title}</strong><span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">${m.type}</span></div>
                ${m.why ? `<div class="text-[11px] text-slate-600 italic mt-1">${m.why}</div>` : ''}
                ${m.issuer ? `<div class="text-[10px] text-slate-500 mt-1">Emisor: ${m.issuer}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${ai.recommendations && ai.recommendations.length ? `
        <div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs">
          <strong>🎯 Recomendaciones (IA):</strong>
          <ul class="mt-1 ml-4 list-disc space-y-1">${ai.recommendations.map(r => `<li>${typeof r==='string'?r:JSON.stringify(r)}</li>`).join('')}</ul>
        </div>
      ` : ''}

      ${items.length === 0 ? `<div class="text-center py-8 text-slate-400">Sin items. Click "🤖 Análisis IA" para que Claude sugiera compliance items según tu negocio.</div>` : items.map(c => {
        const exp = c.expiry_date ? new Date(c.expiry_date) : null;
        const days = exp ? Math.round((exp - today) / 86400000) : null;
        const tone = days != null && days <= 0 ? 'border-red-400 bg-red-50' : days != null && days <= 30 ? 'border-amber-400 bg-amber-50' : 'border-slate-200';
        return `<div class="border-2 ${tone} rounded-xl p-3 text-xs">
          <div class="flex justify-between"><strong>${c.title}</strong><span class="text-[10px]">${c.type}</span></div>
          <div class="text-[10px] text-slate-500">${c.area || ''} · ${c.issuer || ''}</div>
          ${exp ? `<div class="text-[10px] mt-1 ${days<=0?'text-red-700 font-bold':days<=30?'text-amber-700 font-bold':'text-slate-600'}">Vence: ${c.expiry_date} (${days<=0?Math.abs(days)+'d vencido':days+'d restantes'})</div>` : ''}
        </div>`;
      }).join('')}
    </div>
  `;
}
async function pmAddCompliance() {
  const title = prompt('Título (ej. "Permits 1133 Denfield"):'); if (!title) return;
  const type = prompt('Tipo (permit/license/insurance/certification/contract/tax/other):', 'permit') || 'permit';
  const area = prompt('Área:', 'remodelacion');
  const issuer = prompt('Emisor (ej. City of Austin):', '') || null;
  const expiry_date = prompt('Fecha vencimiento (YYYY-MM-DD):', '') || null;
  await sb.from('pm_compliance_items').insert({ title, type, area, issuer, expiry_date, status: 'active' });
  await pmLoadAll(); pmRender();
}

// ============================================================
// S9 — TABS NUEVAS
// ============================================================

// ─── EMPRESAS (multi-company config) ───
function pmRenderCompanies() {
  const cos = pmState.companies || [];
  return `
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">Configurá las empresas/workspaces de ClickUp. Cada empresa tiene su space_id de ClickUp y se sincroniza por separado. Cargá los IDs y se autosincronizan.</div>
        <button onclick="pmAddCompany()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded">+ Empresa</button>
      </div>
      <div class="border border-slate-200 rounded-xl overflow-hidden">
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr><th class="text-left p-2">Nombre</th><th class="text-left p-2">Slug</th><th class="text-left p-2">ClickUp Space ID</th><th class="text-left p-2">Team ID</th><th class="text-center p-2">Holding</th><th class="text-center p-2">Activo</th></tr>
          </thead>
          <tbody>
            ${cos.map(c => `
              <tr class="border-t border-slate-100">
                <td class="p-2 font-semibold">${c.icon} ${c.name}</td>
                <td class="p-2 font-mono text-[10px]">${c.slug}</td>
                <td class="p-2">
                  <input value="${c.clickup_space_id || ''}" onchange="pmCompanyUpdate('${c.id}','clickup_space_id',this.value)" placeholder="123456789" class="w-32 border border-slate-300 rounded px-2 py-0.5 font-mono text-[10px]" />
                </td>
                <td class="p-2">
                  <input value="${c.clickup_team_id || ''}" onchange="pmCompanyUpdate('${c.id}','clickup_team_id',this.value)" placeholder="9011..." class="w-32 border border-slate-300 rounded px-2 py-0.5 font-mono text-[10px]" />
                </td>
                <td class="p-2 text-center">${c.is_holding ? '🏛️' : '—'}</td>
                <td class="p-2 text-center">
                  <button onclick="pmCompanyToggle('${c.id}', ${c.active})" class="${c.active?'text-emerald-600':'text-slate-400'}">${c.active?'✓':'○'}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-900">
        💡 <strong>Cómo encontrar el Space ID de ClickUp:</strong> abrí tu space → URL será <code>app.clickup.com/{team_id}/v/s/{space_id}</code>. Copiá el space_id (números) y pegalo arriba. Después corré "🔄 Sync ClickUp" en el dashboard ClickUp Análisis.
      </div>
    </div>
  `;
}

async function pmAddCompany() {
  const name = prompt('Nombre de la empresa:'); if (!name) return;
  const slug = (prompt('Slug (lowercase, sin espacios):', name.toLowerCase().replace(/\s+/g, '-')) || '').toLowerCase().replace(/\s+/g, '-');
  const icon = prompt('Icon emoji:', '🏢') || '🏢';
  const clickup_space_id = prompt('ClickUp Space ID (opcional, podés agregarlo después):', '') || null;
  await sb.from('pm_companies').insert({ name, slug, icon, clickup_space_id, active: true });
  await pmLoadAll(); pmRender();
}
async function pmCompanyUpdate(id, field, value) {
  await sb.from('pm_companies').update({ [field]: value || null, updated_at: new Date().toISOString() }).eq('id', id);
  await pmLoadAll(); pmRender();
}
async function pmCompanyToggle(id, current) {
  await sb.from('pm_companies').update({ active: !current }).eq('id', id);
  await pmLoadAll(); pmRender();
}

// ─── EXECUTIVE CROSS-COMPANY ───
function pmRenderExecutive() {
  const exec = pmState.executiveCross || [];
  if (exec.length === 0) {
    return `<div class="text-center py-12 text-slate-500"><div class="text-5xl mb-3">🏢</div><div class="font-bold">Sin empresas configuradas</div><div class="text-xs mt-2">Configurá tus empresas en tab "🏛️ Empresas" para ver el dashboard ejecutivo cross-company.</div></div>`;
  }
  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Dashboard ejecutivo: tus empresas una al lado de otra. Compará operación.</div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(exec.length, 4)} gap-3">
        ${exec.map(e => {
          const tone = e.tasks_overdue > 10 ? 'border-red-300' : e.tasks_overdue > 3 ? 'border-amber-300' : 'border-emerald-300';
          return `
            <div class="bg-white border-2 ${tone} rounded-xl p-3">
              <div class="text-lg font-bold">${e.icon} ${e.company_name}</div>
              <div class="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div><div class="text-[10px] text-slate-500 uppercase">Tasks open</div><div class="text-xl font-bold">${e.tasks_open || 0}</div></div>
                <div><div class="text-[10px] text-slate-500 uppercase">Vencidas</div><div class="text-xl font-bold text-${(e.tasks_overdue||0)>5?'red':'slate'}-700">${e.tasks_overdue || 0}</div></div>
                <div><div class="text-[10px] text-slate-500 uppercase">Cerradas 7d</div><div class="text-xl font-bold text-emerald-700">${e.tasks_closed_7d || 0}</div></div>
                <div><div class="text-[10px] text-slate-500 uppercase">Personas activas</div><div class="text-xl font-bold">${e.active_people || 0}</div></div>
                ${e.avg_score_this_week ? `<div class="col-span-2"><div class="text-[10px] text-slate-500 uppercase">Score promedio (semana)</div><div class="text-2xl font-bold ${e.avg_score_this_week>=80?'text-emerald-700':e.avg_score_this_week>=60?'text-amber-700':'text-red-700'}">${e.avg_score_this_week}</div></div>` : ''}
              </div>
              ${e.okrs_active > 0 ? `
                <div class="mt-2 pt-2 border-t border-slate-100">
                  <div class="text-[10px] text-slate-500 uppercase">OKRs activos</div>
                  <div class="text-xs"><strong>${e.okrs_active}</strong> · progreso prom ${e.okrs_avg_progress || 0}%</div>
                </div>
              ` : ''}
              ${e.risks_high > 0 ? `<div class="mt-1 text-[10px] text-red-700 font-bold">🚨 ${e.risks_high} risks high</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── PERFORMANCE LEADERBOARD ───
function pmRenderPerformance() {
  const co = pmCurrentCompanyObj();
  const lb = (pmState.leaderboard || []).filter(p => pmState.currentCompany === 'holding' || p.company_name === co?.name);
  return `
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">Performance score por persona. Composite = cumplimiento + on-time + calidad + velocidad + capacity adherence.</div>
        <button onclick="withLoading(this, pmRunComputePerformance)" class="bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold px-3 py-2 rounded">🧮 Recalcular ahora</button>
      </div>
      ${lb.length === 0 ? `<div class="text-center py-12 text-slate-400">Sin scores aún. Click "🧮 Recalcular ahora" para generar.</div>` : `
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left p-2">Persona</th>
                <th class="text-left p-2">Empresa</th>
                <th class="text-center p-2">Score</th>
                <th class="text-center p-2">Tier</th>
                <th class="text-center p-2">Tendencia</th>
                <th class="text-right p-2">Completion</th>
                <th class="text-right p-2">Quality</th>
                <th class="text-right p-2">Velocity</th>
                <th class="text-right p-2">Capacity</th>
              </tr>
            </thead>
            <tbody>
              ${lb.map(p => {
                const trendIcon = p.trend === 'up' ? '⬆️' : p.trend === 'down' ? '⬇️' : p.trend === 'flat' ? '➡️' : '🆕';
                const scoreColor = p.composite_score >= 80 ? 'text-emerald-700' : p.composite_score >= 60 ? 'text-amber-700' : 'text-red-700';
                return `
                  <tr class="border-t border-slate-100">
                    <td class="p-2 font-semibold">${p.full_name}</td>
                    <td class="p-2 text-slate-600">${p.company_name || '—'}</td>
                    <td class="p-2 text-center font-bold text-lg ${scoreColor}">${p.composite_score || '—'}</td>
                    <td class="p-2 text-center text-[10px]">${p.performance_tier}</td>
                    <td class="p-2 text-center">${trendIcon}</td>
                    <td class="p-2 text-right">${p.completion_score || '—'}</td>
                    <td class="p-2 text-right">${p.quality_score || '—'}</td>
                    <td class="p-2 text-right">${p.velocity_score || '—'}</td>
                    <td class="p-2 text-right">${p.capacity_score || '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

async function pmRunComputePerformance() {
  if (!confirm('Recalcular performance scores de la semana actual?')) return;
  try {
    const res = await fetch(PM_PERF_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAccessToken()}` },
      body: JSON.stringify({})
    });
    const r = await res.json();
    alert(r.ok ? `✅ ${r.computed} scores calculados.` : 'Error: ' + r.error);
    await pmLoadAll(); pmRender();
  } catch (e) { alert('Error: ' + e.message); }
}

// ─── OKRs ───
function pmRenderOKRs() {
  const okrs = pmFilterByCompany(pmState.okrs || []);
  const aiKey = 'pm-okrs-' + pmState.currentCompany;
  const ai = (window.aiState && window.aiState[aiKey]) || {};

  // KPIs OKRs
  const active = okrs.filter(o => o.status === 'active');
  const atRisk = okrs.filter(o => o.status === 'at_risk');
  const avgProgress = okrs.length ? Math.round(okrs.reduce((s,o) => s + (o.progress_pct||0), 0) / okrs.length) : 0;
  const onTrack = okrs.filter(o => (o.progress_pct||0) >= 70).length;
  const behind = okrs.filter(o => (o.progress_pct||0) < 30).length;

  // Análisis automático
  const insights = [];
  if (okrs.length === 0) insights.push(`📭 Sin OKRs definidos. Click "🤖 Sugerir con IA" para arrancar.`);
  else {
    if (atRisk.length > 0) insights.push(`🚨 <strong>${atRisk.length} OKR${atRisk.length>1?'s':''} at-risk</strong> — review urgente. Considerá re-scope o más recursos.`);
    if (avgProgress < 30 && okrs.length > 0) insights.push(`📉 Progreso promedio bajo (${avgProgress}%). Si estamos a mitad de quarter, revisar targets — son muy ambiciosos o falta foco.`);
    if (avgProgress >= 70) insights.push(`✅ Excelente progreso (${avgProgress}% prom). Validá que los targets no fueran muy bajos (debe ser stretch).`);
    if (behind > 0) insights.push(`⚠️ <strong>${behind} OKR${behind>1?'s':''}</strong> con <30% progreso. Identificá blockers en próximo 1-on-1.`);
  }

  return `
    <div class="space-y-3">
      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-slate-900 text-white rounded-xl p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">OKRs activos</div>
          <div class="text-3xl font-bold">${okrs.length}</div>
          <div class="text-[10px] text-slate-400">${active.length} active · ${atRisk.length} at_risk</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div class="text-[10px] text-blue-700 uppercase font-bold">Progreso prom</div>
          <div class="text-3xl font-bold ${avgProgress>=70?'text-emerald-700':avgProgress>=40?'text-blue-900':'text-red-700'}">${avgProgress}%</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">On track</div>
          <div class="text-3xl font-bold text-emerald-900">${onTrack}</div>
          <div class="text-[10px] text-emerald-700">≥70% progreso</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Behind</div>
          <div class="text-3xl font-bold text-amber-900">${behind}</div>
          <div class="text-[10px] text-amber-700">&lt;30% progreso</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-[10px] text-red-700 uppercase font-bold">At risk</div>
          <div class="text-3xl font-bold text-red-900">${atRisk.length}</div>
        </div>
      </div>

      ${insights.length > 0 ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-amber-900 mb-2">🤖 Análisis automático</div>
          <ul class="space-y-1 text-xs text-slate-700">${insights.map(i => `<li>• ${i}</li>`).join('')}</ul>
        </div>
      ` : ''}

      <div class="flex justify-between items-center flex-wrap gap-2">
        <div class="text-xs text-slate-600">OKRs trimestrales por empresa o persona. Objetivos + Key Results medibles.</div>
        <div class="flex gap-2">
          <button onclick="pmGenerateOKRSuggestions()" class="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-2 rounded" title="Claude analiza tu operación y propone OKRs ambiciosos">🤖 Sugerir OKRs con IA</button>
          <button onclick="pmAddOKR()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded">+ OKR manual</button>
        </div>
      </div>

      ${ai.loading ? `<div class="bg-violet-50 border border-violet-200 rounded-xl p-4 text-center text-xs text-violet-900"><div class="text-3xl animate-pulse">🧠</div><div class="mt-2 font-bold">Claude analizando tu operación...</div><div class="text-[10px] text-violet-700 mt-1">~30 segundos · revisando ClickUp, performance, alertas, capital en obra</div></div>` : ''}
      ${ai.error ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900">⚠️ ${ai.error}</div>` : ''}
      ${ai.suggestions && ai.suggestions.length ? `
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 rounded-xl p-4">
          <div class="text-xs font-bold text-violet-900 uppercase mb-2">🤖 OKRs sugeridos por Claude — ${ai.context || 'basado en tu operación actual'}</div>
          <div class="space-y-3">
            ${ai.suggestions.map((o, i) => `
              <div class="bg-white border border-violet-200 rounded-lg p-3">
                <div class="flex justify-between items-start mb-1">
                  <div class="text-sm font-bold text-violet-900">${i+1}. ${o.objective}</div>
                  <button onclick='pmAdoptOKRSuggestion(${i})' class="text-[10px] bg-violet-600 hover:bg-violet-700 text-white font-bold px-2 py-1 rounded flex-shrink-0">+ Adoptar</button>
                </div>
                ${o.rationale ? `<div class="text-[11px] text-slate-600 italic mb-2">${o.rationale}</div>` : ''}
                <div class="text-[10px] uppercase text-slate-500 mb-1">Key Results propuestos:</div>
                <ul class="space-y-0.5">
                  ${(o.key_results || []).map(kr => `<li class="text-xs">• ${kr.title} — target <strong>${kr.target} ${kr.unit||''}</strong></li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${okrs.length === 0 ? `<div class="text-center py-8 text-slate-400">Sin OKRs activos. Click "🤖 Sugerir OKRs con IA" para que Claude te proponga 3-5 basados en tu operación.</div>` : okrs.map(o => `
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="flex justify-between items-start gap-2 flex-wrap">
            <div class="flex-1 min-w-0">
              <div class="text-[10px] text-slate-500 uppercase">${o.quarter} · ${o.pm_companies?.icon || ''} ${o.pm_companies?.name || ''}${o.pm_whatsapp_recipients ? ' · ' + o.pm_whatsapp_recipients.full_name : ''}</div>
              <div class="font-bold text-sm mt-1">${o.objective}</div>
            </div>
            <span class="text-[10px] bg-${o.status==='at_risk'?'red':o.status==='active'?'emerald':'slate'}-100 text-${o.status==='at_risk'?'red':o.status==='active'?'emerald':'slate'}-700 px-2 py-1 rounded font-bold">${o.status}</span>
          </div>
          <div class="mt-2">
            <div class="text-[10px] uppercase text-slate-500 mb-1">Key Results · ${o.progress_pct||0}% progreso</div>
            ${(o.key_results || []).map(kr => {
              const pct = kr.target > 0 ? Math.min(100, Math.round((kr.current||0)/kr.target*100)) : 0;
              return `<div class="text-xs mb-1">
                <div class="flex justify-between"><span>${kr.title}</span><span class="font-bold">${kr.current||0}/${kr.target} ${kr.unit||''}</span></div>
                <div class="bg-slate-100 rounded-full h-1.5 mt-0.5"><div class="bg-${pct>=80?'emerald':pct>=50?'amber':'red'}-500 h-1.5 rounded-full" style="width:${pct}%"></div></div>
              </div>`;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function pmAddOKR() {
  const companies = pmState.companies || [];
  if (companies.length === 0) return alert('Configurá empresas primero (tab Empresas).');
  const objective = prompt('Objetivo del trimestre (ej. "Cerrar 6 obras con margen >25%"):'); if (!objective) return;
  const compOpts = companies.map((c, i) => `${i+1}. ${c.name}`).join('\n');
  const compIdx = +prompt(`Empresa:\n${compOpts}\n\nNúmero:`, '1') - 1;
  const company_id = companies[compIdx]?.id;
  const quarter = prompt('Quarter (YYYY-Q[1-4]):', new Date().getFullYear() + '-Q' + Math.ceil((new Date().getMonth()+1)/3));
  // 3 KRs
  const krs = [];
  for (let i = 1; i <= 3; i++) {
    const title = prompt(`KR ${i} (ej. "Margen promedio >= 25%") — vacío para terminar:`);
    if (!title) break;
    const target = +prompt(`Target numérico (ej. 25):`, '0');
    const unit = prompt(`Unidad (ej. %, obras, $):`, '');
    krs.push({ id: 'kr_' + Date.now() + '_' + i, title, target, current: 0, unit, source: 'manual' });
  }
  await sb.from('pm_okrs').insert({ company_id, quarter, objective, key_results: krs, status: 'active' });
  await pmLoadAll(); pmRender();
}

// ─── 1-on-1s ───
function pmRenderOneOnOnes() {
  const list = pmState.oneOnOnes || [];
  const now = Date.now();

  // KPIs
  const upcoming = list.filter(o => o.status === 'scheduled' && o.scheduled_date && new Date(o.scheduled_date).getTime() > now);
  const upcoming7d = upcoming.filter(o => (new Date(o.scheduled_date).getTime() - now) <= 7*86400000);
  const completed30d = list.filter(o => o.status === 'completed' && o.completed_at && (now - new Date(o.completed_at).getTime()) < 30*86400000);
  const overdueScheduled = list.filter(o => o.status === 'scheduled' && o.scheduled_date && new Date(o.scheduled_date).getTime() < now);
  const actionItems = list.flatMap(o => (o.action_items || []).map(ai => ({...ai, person: o.pm_whatsapp_recipients?.full_name || '?'})));
  const openActions = actionItems.filter(ai => !ai.completed_at);

  // Persons sin 1-on-1 reciente
  const recipients = pmState.recipients || [];
  const lastBy = {};
  list.forEach(o => {
    const rid = o.recipient_id;
    if (!rid) return;
    const d = o.completed_at || o.scheduled_date;
    if (d && (!lastBy[rid] || new Date(d) > new Date(lastBy[rid]))) lastBy[rid] = d;
  });
  const overdue1on1 = recipients.filter(r => r.active && (r.role === 'crew_leader' || r.role === 'pm')).filter(r => {
    const last = lastBy[r.id];
    if (!last) return true;
    return (now - new Date(last).getTime()) > 14*86400000;
  });

  // Análisis
  const insights = [];
  if (overdueScheduled.length > 0) insights.push(`📅 <strong>${overdueScheduled.length}</strong> 1-on-1${overdueScheduled.length>1?'s':''} pasaron sin marcarse como completados. Actualizá el estado.`);
  if (overdue1on1.length > 0) insights.push(`👤 <strong>${overdue1on1.length}</strong> líder${overdue1on1.length>1?'es':''} sin 1-on-1 en los últimos 14 días: ${overdue1on1.map(r => r.full_name).join(', ')}.`);
  if (openActions.length > 0) insights.push(`📋 <strong>${openActions.length}</strong> action items pendientes de 1-on-1s previos.`);
  if (upcoming7d.length > 0) insights.push(`📆 ${upcoming7d.length} 1-on-1${upcoming7d.length>1?'s':''} esta semana. Considerá usar "🧠 Preparar IA" para tener data lista.`);

  return `
    <div class="space-y-3">
      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div class="text-[10px] text-blue-700 uppercase font-bold">Próximos</div>
          <div class="text-3xl font-bold text-blue-900">${upcoming.length}</div>
          <div class="text-[10px] text-blue-700">${upcoming7d.length} esta semana</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">Completados 30d</div>
          <div class="text-3xl font-bold text-emerald-900">${completed30d.length}</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Atrasados</div>
          <div class="text-3xl font-bold text-amber-900">${overdueScheduled.length}</div>
          <div class="text-[10px] text-amber-700">scheduled pero pasados</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-[10px] text-red-700 uppercase font-bold">Sin 1-on-1 14d+</div>
          <div class="text-3xl font-bold text-red-900">${overdue1on1.length}</div>
          <div class="text-[10px] text-red-700">líderes desatendidos</div>
        </div>
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-3">
          <div class="text-[10px] text-violet-700 uppercase font-bold">Action items</div>
          <div class="text-3xl font-bold text-violet-900">${openActions.length}</div>
          <div class="text-[10px] text-violet-700">abiertos</div>
        </div>
      </div>

      ${insights.length > 0 ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-amber-900 mb-2">🤖 Análisis</div>
          <ul class="space-y-1 text-xs text-slate-700">${insights.map(i => `<li>• ${i}</li>`).join('')}</ul>
        </div>
      ` : ''}

      ${overdue1on1.length > 0 ? `
        <div class="bg-white border border-red-200 rounded-xl overflow-hidden">
          <div class="bg-red-50 border-b border-red-200 px-3 py-2 text-xs font-bold uppercase text-red-900">👤 Líderes sin 1-on-1 reciente (>14 días)</div>
          <div class="divide-y divide-slate-100">
            ${overdue1on1.map(r => {
              const last = lastBy[r.id];
              const daysAgo = last ? Math.round((now - new Date(last).getTime())/86400000) : null;
              return `<div class="p-2 flex justify-between text-xs">
                <span><strong>${r.full_name}</strong> · ${r.role}</span>
                <span class="text-slate-500">${daysAgo ? `último hace ${daysAgo}d` : 'nunca'}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      ` : ''}

      ${openActions.length > 0 ? `
        <div class="bg-white border border-violet-200 rounded-xl overflow-hidden">
          <div class="bg-violet-50 border-b border-violet-200 px-3 py-2 text-xs font-bold uppercase text-violet-900">📋 Action items pendientes de 1-on-1s</div>
          <div class="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            ${openActions.slice(0, 20).map(ai => `
              <div class="p-2 text-xs">
                <div class="font-semibold">${ai.title || ai.item || '(sin título)'}</div>
                <div class="text-[10px] text-slate-500">${ai.person} ${ai.due_date ? '· vence '+ai.due_date : ''} ${ai.owner ? '· @'+ai.owner : ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">Coaching 1-on-1 con cada líder. Claude prepara la agenda con data real.</div>
        <button onclick="pmAddOneOnOne()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded">+ Programar 1-on-1</button>
      </div>

      ${list.length === 0 ? `<div class="text-center py-12 text-slate-400">Sin 1-on-1s programados. Click "+ Programar" para empezar.</div>` : list.map(o => `
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="flex justify-between gap-2 flex-wrap">
            <div>
              <div class="text-xs"><strong>${o.pm_whatsapp_recipients?.full_name || '—'}</strong> · ${o.scheduled_date ? new Date(o.scheduled_date).toLocaleString('es-MX') : 'sin fecha'} · ${o.cadence}</div>
              <div class="text-[10px] text-slate-500">${o.status} · ${o.duration_min}min${o.ai_generated_at ? ' · 🤖 agenda IA preparada' : ''}</div>
            </div>
            <div class="flex gap-1">
              ${!o.ai_generated_at ? `<button onclick="pmPrepareOneOnOne('${o.id}')" class="bg-violet-100 hover:bg-violet-200 text-violet-700 text-[10px] font-bold px-2 py-1 rounded">🧠 Preparar IA</button>` : ''}
              ${o.status === 'scheduled' ? `<button onclick="pmCompleteOneOnOne('${o.id}')" class="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">✓ Completar</button>` : ''}
            </div>
          </div>
          ${o.ai_agenda_md ? `<details class="mt-2"><summary class="cursor-pointer text-[11px] text-slate-600 font-bold">📋 Agenda IA</summary><div class="mt-1 text-xs whitespace-pre-wrap bg-slate-50 rounded p-2">${o.ai_agenda_md}</div></details>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

async function pmAddOneOnOne() {
  const recipients = pmState.recipients || [];
  if (recipients.length === 0) return alert('Agregá recipients en tab WhatsApp primero.');
  const opts = recipients.map((r, i) => `${i+1}. ${r.full_name}`).join('\n');
  const idx = +prompt(`Con quién?\n${opts}\n\nNúmero:`, '1') - 1;
  const recipient_id = recipients[idx]?.id;
  const date = prompt('Fecha (YYYY-MM-DD HH:MM):', '');
  const cadence = prompt('Cadencia (weekly/biweekly/monthly/adhoc):', 'weekly') || 'weekly';
  await sb.from('pm_one_on_ones').insert({
    recipient_id,
    scheduled_date: date ? new Date(date).toISOString() : null,
    cadence,
    status: 'scheduled',
    created_by: state.user.id
  });
  await pmLoadAll(); pmRender();
}

async function pmPrepareOneOnOne(id) {
  if (!confirm('Generar la agenda con Claude?\n\nVa a leer 4 semanas de performance, alertas, dailies y deps de esa persona.')) return;
  try {
    const res = await fetch(PM_1ON1_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAccessToken()}` },
      body: JSON.stringify({ one_on_one_id: id })
    });
    const r = await res.json();
    alert(r.ok ? '✅ Agenda generada.' : 'Error: ' + r.error);
    await pmLoadAll(); pmRender();
  } catch (e) { alert('Error: ' + e.message); }
}

async function pmCompleteOneOnOne(id) {
  const notes = prompt('Notas de la reunión (markdown):', '') || null;
  await sb.from('pm_one_on_ones').update({
    notes_md: notes,
    status: 'completed',
    completed_at: new Date().toISOString()
  }).eq('id', id);
  await pmLoadAll(); pmRender();
}

// ─── COACHING IA ───
function pmRenderCoaching() {
  const prompts = pmState.coachingPrompts || [];
  return `
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">Playbook de coaching semanal. Claude analiza performance + alertas + dailies y sugiere qué hacer con cada persona.</div>
        <button onclick="withLoading(this, pmRunCoaching)" class="bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold px-3 py-2 rounded">🧠 Generar ahora</button>
      </div>
      ${prompts.length === 0 ? `<div class="text-center py-12 text-slate-400">Sin sugerencias todavía. Click "🧠 Generar ahora" o esperá al lunes 7:30am.</div>` : `
        <div class="space-y-2">
          ${prompts.map(p => {
            const prio = p.priority === 'urgent' ? '🚨' : p.priority === 'high' ? '⚠️' : p.priority === 'low' ? 'ℹ️' : '📌';
            const tone = p.priority === 'urgent' ? 'border-red-400 bg-red-50' : p.priority === 'high' ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white';
            const type = p.prompt_type === 'recognition' ? '🏆' : p.prompt_type === 'intervention' ? '🚨' : p.prompt_type === 'learning' ? '🎓' : p.prompt_type === 'reassignment' ? '🔄' : '💬';
            return `
              <div class="border-2 ${tone} rounded-xl p-3">
                <div class="flex items-start justify-between gap-2 flex-wrap">
                  <div class="flex-1 min-w-0">
                    <div class="text-[10px] uppercase font-bold flex items-center gap-1">${prio} ${p.priority} · ${type} ${p.prompt_type} · ${p.pm_whatsapp_recipients?.full_name || '?'}</div>
                    <div class="text-sm font-bold mt-1">${p.title}</div>
                    <div class="text-xs mt-1 whitespace-pre-wrap">${p.message}</div>
                    ${(p.evidence || []).length ? `<div class="text-[10px] text-slate-600 mt-1">📊 ${(p.evidence || []).join(' · ')}</div>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

async function pmRunCoaching() {
  if (!confirm('Generar coaching prompts ahora?\n\nClaude analiza el leaderboard + alertas + dailies y propone qué decirle a cada persona esta semana.')) return;
  try {
    const res = await fetch(PM_COACH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAccessToken()}` },
      body: JSON.stringify({})
    });
    const r = await res.json();
    alert(r.ok ? `✅ ${r.prompts_generated} prompts generados.` : 'Error: ' + r.error);
    await pmLoadAll(); pmRender();
  } catch (e) { alert('Error: ' + e.message); }
}

// ─── HEATMAP ───
function pmRenderHeatmap() {
  // Reconstruimos client-side desde clickupTasks para EXCLUIR backlog (no es bottleneck — es backlog)
  const tasks = pmFilterByCompany(pmState.clickupTasks).filter(pmIsActive);
  if (tasks.length === 0) {
    return `<div class="text-center py-12 text-slate-500"><div class="text-5xl mb-3">🔥</div><div class="font-bold">Sin tareas activas</div><div class="text-xs mt-2">Backlog excluido. Sincronizá ClickUp si recién configuraste el space.</div></div>`;
  }

  const buckets = ['0-1d','2-3d','4-7d','8-14d','15d+'];
  function bucketOf(t) {
    const days = (Date.now() - new Date(t.date_updated || t.date_created)) / 86400000;
    if (days <= 1) return '0-1d';
    if (days <= 3) return '2-3d';
    if (days <= 7) return '4-7d';
    if (days <= 14) return '8-14d';
    return '15d+';
  }
  const matrix = {}; // matrix[status][bucket] = { count, tasks: [] }
  tasks.forEach(t => {
    const s = t.status || '?';
    const b = bucketOf(t);
    if (!matrix[s]) matrix[s] = {};
    if (!matrix[s][b]) matrix[s][b] = { count: 0, tasks: [] };
    matrix[s][b].count++;
    matrix[s][b].tasks.push(t);
  });
  const statuses = Object.keys(matrix).sort();
  const max = Math.max(...Object.values(matrix).flatMap(row => Object.values(row).map(c => c.count)));

  // Analysis: encontrar el cell más caliente y la peor task
  let hottest = null;
  statuses.forEach(s => Object.entries(matrix[s] || {}).forEach(([b, c]) => {
    if (!hottest || c.count > hottest.count || (c.count === hottest.count && (b === '15d+' && hottest.bucket !== '15d+'))) {
      hottest = { status: s, bucket: b, count: c.count, tasks: c.tasks };
    }
  }));
  // Worst tasks (≥15d stale)
  const worstTasks = tasks
    .filter(t => (Date.now() - new Date(t.date_updated || t.date_created)) / 86400000 > 14)
    .sort((a,b) => new Date(a.date_updated||a.date_created) - new Date(b.date_updated||b.date_created))
    .slice(0, 15);

  // Análisis textual automático
  const analysisLines = [];
  if (hottest && hottest.count > 0) {
    if (hottest.bucket === '15d+') {
      analysisLines.push(`🚨 <strong>Cuello de botella crítico:</strong> ${hottest.count} tareas atascadas en status "<strong>${hottest.status}</strong>" por más de 15 días. Esto es donde el flujo se está rompiendo. Hacé review específico de estas con los asignados.`);
    } else if (hottest.bucket === '8-14d') {
      analysisLines.push(`⚠️ <strong>Atención:</strong> ${hottest.count} tareas llevan 8-14 días en "<strong>${hottest.status}</strong>". Si pasan a 15d+, son cuello de botella.`);
    } else {
      analysisLines.push(`✅ El status más cargado es "<strong>${hottest.status}</strong>" con ${hottest.count} tareas en ${hottest.bucket} — flujo saludable.`);
    }
  }
  const stale15 = tasks.filter(t => (Date.now() - new Date(t.date_updated || t.date_created)) / 86400000 > 14).length;
  if (stale15 >= 5) {
    analysisLines.push(`📊 <strong>${stale15} tareas activas llevan +15 días sin actualizarse</strong> (${Math.round(stale15/tasks.length*100)}% del total activo). Revisá si están bloqueadas o reasignar.`);
  }
  // Personas con tareas viejas
  const oldByPerson = {};
  worstTasks.forEach(t => { const p = t.primary_assignee; if (!p) return; oldByPerson[p] = (oldByPerson[p]||0)+1; });
  const topStuckPerson = Object.entries(oldByPerson).sort((a,b) => b[1]-a[1])[0];
  if (topStuckPerson && topStuckPerson[1] >= 3) {
    analysisLines.push(`👤 <strong>${topStuckPerson[0]}</strong> tiene ${topStuckPerson[1]} tareas atascadas +15d. Posible sobrecarga o bloqueo. Hablá 1-on-1.`);
  }

  return `
    <div class="space-y-3">
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
        <strong>🔥 Heatmap de bottlenecks (solo tareas activas, backlog excluido):</strong>
        <p class="mt-1 text-slate-600">Cuántas tareas asignadas llevan X días sin update en cada status. Rojo = atascadas hace mucho. El status con muchas celdas rojas es donde el flujo se rompe.</p>
      </div>

      <div class="border border-slate-200 rounded-xl overflow-x-auto bg-white">
        <table class="w-full text-xs">
          <thead class="bg-slate-100">
            <tr>
              <th class="text-left p-2 text-[10px] uppercase text-slate-600">Status</th>
              ${buckets.map(b => `<th class="text-center p-2 text-[10px] uppercase text-slate-600">${b}</th>`).join('')}
              <th class="text-center p-2 text-[10px] uppercase text-slate-600">Total</th>
            </tr>
          </thead>
          <tbody>
            ${statuses.map(s => {
              const rowTotal = buckets.reduce((sum, b) => sum + (matrix[s]?.[b]?.count || 0), 0);
              return `<tr class="border-t border-slate-100">
                <td class="p-2 font-bold">${s}</td>
                ${buckets.map(b => {
                  const cell = matrix[s]?.[b];
                  const v = cell?.count || 0;
                  const intensity = max > 0 ? Math.round(v/max*100) : 0;
                  const bg = intensity === 0 ? 'bg-slate-50' : intensity < 30 ? 'bg-yellow-100' : intensity < 60 ? 'bg-orange-200' : intensity < 80 ? 'bg-red-300' : 'bg-red-500 text-white';
                  return `<td class="${bg} text-center font-bold p-2" ${v > 0 && cell.tasks.length ? `title="${cell.tasks.slice(0,5).map(t => '· '+ (t.name||'').slice(0,60)).join('\n')}${cell.tasks.length>5?'\n...y '+(cell.tasks.length-5)+' más':''}"` : ''}>${v || ''}</td>`;
                }).join('')}
                <td class="p-2 text-center font-bold bg-slate-100">${rowTotal}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Análisis automático -->
      ${analysisLines.length > 0 ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-amber-900 mb-2">🤖 Análisis automático</div>
          <ul class="space-y-1.5 text-xs text-slate-700">
            ${analysisLines.map(l => `<li>${l}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Top tareas atascadas con drill-down -->
      ${worstTasks.length > 0 ? `
        <div class="border border-red-200 rounded-xl overflow-hidden">
          <div class="bg-red-50 border-b border-red-200 px-3 py-2 text-xs font-bold uppercase text-red-900">
            🚨 Top tareas atascadas (15+ días sin update) — ${worstTasks.length}
          </div>
          <div class="max-h-72 overflow-y-auto">
            <table class="w-full text-xs">
              <thead class="bg-red-50">
                <tr class="text-[10px] uppercase text-red-900">
                  <th class="text-left p-2">Tarea</th>
                  <th class="text-left p-2">Ubicación</th>
                  <th class="text-left p-2">Status</th>
                  <th class="text-left p-2">Asignado</th>
                  <th class="text-right p-2">Días sin update</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${worstTasks.map(t => {
                  const days = Math.floor((Date.now() - new Date(t.date_updated || t.date_created))/86400000);
                  return `<tr class="border-t border-slate-100 hover:bg-red-50">
                    <td class="p-2 font-semibold truncate max-w-xs">${t.name || '(sin título)'}</td>
                    <td class="p-2 text-[10px] text-slate-600">${pmTaskContext(t)}</td>
                    <td class="p-2"><span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">${t.status || '—'}</span></td>
                    <td class="p-2 text-[11px]">${t.primary_assignee || '—'}</td>
                    <td class="p-2 text-right text-red-700 font-bold">${days}d</td>
                    <td class="p-2">${t.url ? `<a href="${t.url}" target="_blank" class="text-blue-600 text-[10px] hover:underline">abrir↗</a>` : ''}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <div class="text-[11px] text-slate-500 italic">💡 Hovereá las celdas para ver los nombres de las tareas atascadas. Las celdas rojas son el cuello de botella real.</div>
    </div>
  `;
}

// ============================================================
// NUEVAS VISTAS — multi-empresa
// ============================================================

// ─── HOLDING — vista cross-empresa (resumen ejecutivo) ───
function pmRenderHoldingPulse() {
  const exec = pmState.executiveCross || [];
  const alerts = pmState.clickupAlerts || [];
  const tasks = pmState.clickupTasks || [];
  const now = Date.now();

  // Totales cross-empresa — usar helpers para EXCLUIR backlog
  const totalActive = tasks.filter(pmIsActive).length;
  const totalBacklog = tasks.filter(pmIsBacklog).length;
  const totalOverdue = tasks.filter(pmIsOverdue).length;
  const totalClosed7d = tasks.filter(t => pmIsClosed(t) && t.date_closed && (now - new Date(t.date_closed).getTime()) < 7*86400000).length;
  const totalPeople = new Set(tasks.filter(pmIsActive).map(t => t.primary_assignee).filter(Boolean)).size;

  if (exec.length === 0) {
    return `<div class="text-center py-12 text-slate-500">
      <div class="text-5xl mb-3">🏢</div>
      <div class="font-bold">Sin data de empresas todavía</div>
      <div class="text-xs mt-2 max-w-md mx-auto">Corré "🔄 Sync" arriba para que ClickUp tire data en las 3 empresas. Si recién configuraste los space IDs, esto puede tardar 30-60 seg.</div>
    </div>`;
  }

  return `
    <div class="space-y-4">
      <!-- KPIs totales del holding -->
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <div class="text-xs text-slate-400 uppercase font-bold mb-2">🏛️ Holding Total</div>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div><div class="text-[10px] text-slate-400 uppercase" title="Tareas asignadas + no en backlog">Activas</div><div class="text-3xl font-bold">${totalActive}</div></div>
          <div><div class="text-[10px] text-slate-400 uppercase">Vencidas</div><div class="text-3xl font-bold ${totalOverdue>10?'text-red-300':'text-amber-300'}">${totalOverdue}</div></div>
          <div><div class="text-[10px] text-slate-400 uppercase">Cerradas 7d</div><div class="text-3xl font-bold text-emerald-300">${totalClosed7d}</div></div>
          <div><div class="text-[10px] text-slate-400 uppercase">Personas activas</div><div class="text-3xl font-bold">${totalPeople}</div></div>
          <div><div class="text-[10px] text-slate-400 uppercase" title="Backlog NO se cuenta en activas/vencidas">📥 Backlog</div><div class="text-3xl font-bold text-violet-300">${totalBacklog}</div></div>
        </div>
      </div>

      <!-- Cards por empresa — métricas recomputadas client-side para EXCLUIR backlog -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        ${exec.map(e => {
          // Recomputar contadores excluyendo backlog (el VIEW de SQL no sabe de nuestra def de backlog)
          const myTasks = tasks.filter(t => t.company_id === e.company_id);
          const myActive = myTasks.filter(pmIsActive).length;
          const myBacklog = myTasks.filter(pmIsBacklog).length;
          const myOverdue = myTasks.filter(pmIsOverdue).length;
          const myClosed7d = myTasks.filter(t => pmIsClosed(t) && t.date_closed && (now - new Date(t.date_closed).getTime()) < 7*86400000).length;
          const myPeople = new Set(myTasks.filter(pmIsActive).map(t => t.primary_assignee).filter(Boolean)).size;
          const tone = myOverdue > 10 ? 'border-red-300 bg-red-50' : myOverdue > 3 ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50';
          return `
            <button onclick="pmSetCompany('${e.company_id}')" class="text-left bg-white border-2 ${tone} rounded-xl p-3 hover:shadow-lg transition-shadow">
              <div class="text-base font-bold">${e.icon} ${e.company_name}</div>
              <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div><div class="text-[10px] text-slate-500 uppercase" title="Asignadas + no en backlog">Activas</div><div class="text-2xl font-bold">${myActive}</div></div>
                <div><div class="text-[10px] text-slate-500 uppercase">Vencidas</div><div class="text-2xl font-bold ${myOverdue>5?'text-red-700':'text-slate-700'}">${myOverdue}</div></div>
                <div><div class="text-[10px] text-slate-500 uppercase">Cerradas 7d</div><div class="text-2xl font-bold text-emerald-700">${myClosed7d}</div></div>
                <div><div class="text-[10px] text-slate-500 uppercase">Personas</div><div class="text-2xl font-bold">${myPeople}</div></div>
                <div class="col-span-2"><div class="text-[10px] text-violet-600 uppercase font-bold">📥 Backlog (no cuenta como activa)</div><div class="text-xl font-bold text-violet-700">${myBacklog}</div></div>
              </div>
              ${e.avg_score_this_week ? `<div class="mt-2 pt-2 border-t border-slate-200"><div class="text-[10px] text-slate-500 uppercase">Score equipo (semana)</div><div class="text-xl font-bold ${e.avg_score_this_week>=80?'text-emerald-700':e.avg_score_this_week>=60?'text-amber-700':'text-red-700'}">${e.avg_score_this_week}/100</div></div>` : ''}
              ${e.okrs_active > 0 ? `<div class="mt-1 text-[11px]"><strong>${e.okrs_active}</strong> OKRs · ${e.okrs_avg_progress||0}% progreso</div>` : ''}
              ${e.risks_high > 0 ? `<div class="mt-1 text-[11px] text-red-700 font-bold">🚨 ${e.risks_high} risks high</div>` : ''}
              <div class="mt-2 text-[10px] text-slate-400">→ Click para drill-down</div>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Alertas activas top -->
      ${alerts.length > 0 ? `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-red-50 border-b border-red-200 px-3 py-2 text-xs font-bold uppercase text-red-900">🚨 Alertas activas (${alerts.length})</div>
          <div class="max-h-64 overflow-y-auto divide-y divide-slate-100">
            ${alerts.slice(0, 20).map(a => `
              <div class="p-2 text-xs flex justify-between items-start gap-2">
                <div class="flex-1 min-w-0">
                  <div class="font-semibold">${a.alert_type || 'Alerta'}</div>
                  <div class="text-[10px] text-slate-500">${a.message || ''}</div>
                </div>
                <span class="text-[10px] bg-${a.severity==='critical'?'red':'amber'}-100 text-${a.severity==='critical'?'red':'amber'}-800 px-2 py-0.5 rounded">${a.severity}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ─── PULSE por empresa — vista decisional ───
function pmRenderEmpresaPulse() {
  const co = pmCurrentCompanyObj();
  if (!co) return `<div class="text-center py-12 text-slate-500">Empresa no encontrada.</div>`;
  if (!co.clickup_space_id) {
    return `<div class="text-center py-12">
      <div class="text-5xl mb-3">⚠️</div>
      <div class="font-bold text-amber-700">Falta configurar el ClickUp Space ID</div>
      <div class="text-xs mt-2 text-slate-500">Andá al tab "🏛️ Empresas" y pegá el space_id de ${co.name}.</div>
    </div>`;
  }

  const tasks = pmFilterByCompany(pmState.clickupTasks);
  const now = new Date();
  // SEPARAR backlog (sin asignar) de activas (con asignado) — backlog NO cuenta en métricas operativas
  const backlog = tasks.filter(pmIsBacklog);
  const active = tasks.filter(pmIsActive);
  const closed = tasks.filter(pmIsClosed);
  const overdue = active.filter(pmIsOverdue);  // solo activas vencidas
  const dueToday = active.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date).toDateString() === now.toDateString();
  });
  const dueWeek = active.filter(t => {
    if (!t.due_date) return false;
    const diff = (new Date(t.due_date) - now) / 86400000;
    return diff > 0 && diff <= 7;
  });
  const closed7d = closed.filter(t => t.date_closed && (now - new Date(t.date_closed)) < 7*86400000);

  // Por status SOLO de activas (excluye backlog)
  const byStatus = {};
  active.forEach(t => { const s = t.status || '?'; byStatus[s] = (byStatus[s]||0)+1; });

  // Carga por persona — solo activas
  const byPerson = {};
  active.forEach(t => {
    const p = t.primary_assignee;
    if (!byPerson[p]) byPerson[p] = { total: 0, overdue: 0 };
    byPerson[p].total++;
    if (pmIsOverdue(t)) byPerson[p].overdue++;
  });
  const topPeople = Object.entries(byPerson).sort((a,b) => b[1].total - a[1].total).slice(0, 10);

  // Backlog por folder (qué casa/proyecto tiene más cosas sin asignar)
  const backlogByFolder = {};
  backlog.forEach(t => {
    const k = t.folder_name || '(sin folder)';
    backlogByFolder[k] = (backlogByFolder[k]||0) + 1;
  });

  const myAlerts = (pmState.clickupAlerts || []).filter(a => !a.related_folder_id || a.related_folder_id === co.slug);
  const myRisks = pmFilterByArea(pmState.risks);

  // Análisis de cycle time: días reales para cerrar (desde due_date)
  const closedWithDue = closed.filter(t => t.date_closed && t.due_date);
  const avgCycleLate = closedWithDue.length ? Math.round(closedWithDue.reduce((s,t) => s + pmDaysLate(t), 0) / closedWithDue.length) : null;

  return `
    <div class="space-y-4">
      <!-- KPIs principales (NO incluye backlog) -->
      <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div class="bg-slate-900 text-white rounded-xl p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Activas</div>
          <div class="text-3xl font-bold">${active.length}</div>
          <div class="text-[10px] text-slate-400">con persona asignada</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-[10px] text-red-700 uppercase font-bold">Vencidas</div>
          <div class="text-3xl font-bold text-red-900">${overdue.length}</div>
          <div class="text-[10px] text-red-700">${active.length>0?Math.round(overdue.length/active.length*100):0}% de activas</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Vencen hoy</div>
          <div class="text-3xl font-bold text-amber-900">${dueToday.length}</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div class="text-[10px] text-blue-700 uppercase font-bold">Próx 7d</div>
          <div class="text-3xl font-bold text-blue-900">${dueWeek.length}</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">Cerradas 7d</div>
          <div class="text-3xl font-bold text-emerald-900">${closed7d.length}</div>
        </div>
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-3" title="Tareas SIN persona asignada — pendientes de tomar dueño. NO se cuentan como vencidas.">
          <div class="text-[10px] text-violet-700 uppercase font-bold">📥 Backlog</div>
          <div class="text-3xl font-bold text-violet-900">${backlog.length}</div>
          <div class="text-[10px] text-violet-700">sin asignar</div>
        </div>
      </div>

      <!-- Cycle time histórico (cerradas) -->
      ${avgCycleLate !== null ? `
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          <strong>⏱ Velocidad histórica:</strong> Promedio de cierre vs due date en las últimas ${closedWithDue.length} tareas: <span class="${avgCycleLate>0?'text-red-700':'text-emerald-700'} font-bold">${avgCycleLate>0?'+':''}${avgCycleLate} días</span>
          ${avgCycleLate>0 ? `<span class="text-slate-600 ml-2">→ las tareas se cierran ${avgCycleLate} días después de su fecha objetivo. Mejorar planning de duedates o capacidad.</span>` : `<span class="text-emerald-700 ml-2">→ el equipo cierra a tiempo. 👏</span>`}
        </div>
      ` : ''}

      <!-- Por status (activas) + Por persona, lado a lado -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">📊 Por status (solo activas, NO backlog)</div>
          ${Object.keys(byStatus).length === 0 ? '<div class="p-4 text-center text-xs text-slate-400">Sin tareas activas.</div>' : `
            <table class="w-full text-xs">
              <tbody>
                ${Object.entries(byStatus).sort((a,b) => b[1]-a[1]).map(([s,n]) => {
                  const pct = active.length > 0 ? Math.round(n/active.length*100) : 0;
                  return `<tr class="border-t border-slate-100">
                    <td class="p-2 font-semibold">${s}</td>
                    <td class="p-2 text-right font-bold">${n}</td>
                    <td class="p-2"><div class="bg-slate-100 rounded-full h-2"><div class="bg-slate-700 h-2 rounded-full" style="width:${pct}%"></div></div></td>
                    <td class="p-2 text-right text-[10px] text-slate-500">${pct}%</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">👥 Carga por persona (top 10, solo activas)</div>
          ${topPeople.length === 0 ? '<div class="p-4 text-center text-xs text-slate-400">Sin asignados.</div>' : `
            <table class="w-full text-xs">
              <tbody>
                ${topPeople.map(([p, s]) => `
                  <tr class="border-t border-slate-100">
                    <td class="p-2 font-semibold truncate max-w-[140px]">${p}</td>
                    <td class="p-2 text-right">${s.total}</td>
                    <td class="p-2 text-right ${s.overdue>0?'text-red-700 font-bold':'text-slate-400'}">${s.overdue?s.overdue+' venc':''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>

      <!-- Backlog por folder (drill-down) -->
      ${backlog.length > 0 ? `
        <div class="bg-white border border-violet-200 rounded-xl overflow-hidden">
          <div class="bg-violet-50 border-b border-violet-200 px-3 py-2 text-xs font-bold uppercase text-violet-900 flex justify-between">
            <span>📥 Backlog por folder (${backlog.length} tareas sin dueño)</span>
            <span class="text-[10px] font-normal text-violet-700">Estas tareas están esperando que alguien las tome — asigná un responsable o dejalas en backlog si todavía no es el momento</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-1 p-2">
            ${Object.entries(backlogByFolder).sort((a,b) => b[1]-a[1]).slice(0, 12).map(([folder, n]) => `
              <div class="bg-violet-50 border border-violet-200 rounded p-2 text-xs">
                <div class="font-bold text-violet-900 truncate" title="${folder}">📁 ${folder}</div>
                <div class="text-violet-700">${n} sin asignar</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Top vencidas con folder + list -->
      ${overdue.length > 0 ? `
        <div class="bg-white border border-red-200 rounded-xl overflow-hidden">
          <div class="bg-red-50 border-b border-red-200 px-3 py-2 text-xs font-bold uppercase text-red-900 flex justify-between">
            <span>🚨 Top vencidas (${overdue.length})</span>
            <span class="text-[10px] font-normal text-red-700">tarea + folder + lista + responsable + días vencidas</span>
          </div>
          <div class="max-h-72 overflow-auto">
            <table class="w-full text-xs">
              <thead class="bg-red-50 sticky top-0">
                <tr class="text-[10px] uppercase text-red-900">
                  <th class="text-left p-2">Tarea</th>
                  <th class="text-left p-2">Ubicación (folder › lista)</th>
                  <th class="text-left p-2">Asignado</th>
                  <th class="text-left p-2">Status</th>
                  <th class="text-right p-2">Days late</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${overdue.sort((a,b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 20).map(t => {
                  const days = pmDaysLate(t);
                  return `<tr class="border-t border-slate-100 hover:bg-red-50">
                    <td class="p-2 font-semibold truncate max-w-xs">${t.name || '(sin título)'}</td>
                    <td class="p-2 text-[10px] text-slate-600">${pmTaskContext(t)}</td>
                    <td class="p-2 text-[11px] text-slate-700">${t.primary_assignee || '—'}</td>
                    <td class="p-2"><span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">${t.status || '—'}</span></td>
                    <td class="p-2 text-right ${pmDaysLateClass(days)}">${pmDaysLateLabel(days)}</td>
                    <td class="p-2">${t.url ? `<a href="${t.url}" target="_blank" class="text-blue-600 text-[10px] hover:underline">abrir↗</a>` : ''}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Alertas + Risks con contexto completo -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${myAlerts.length > 0 ? `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-amber-50 border-b border-amber-200 px-3 py-2 text-xs font-bold uppercase text-amber-900">⚠️ Alertas (${myAlerts.length}) — origen detallado</div>
            <div class="max-h-56 overflow-y-auto divide-y divide-slate-100">
              ${myAlerts.slice(0, 12).map(a => `
                <div class="p-2 text-xs">
                  <div class="flex justify-between items-start gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="font-bold text-slate-900">${a.alert_type}</div>
                      <div class="text-[11px] text-slate-700 mt-0.5">${a.message || ''}</div>
                      ${a.detail ? `<div class="text-[10px] text-slate-500 mt-1">${a.detail}</div>` : ''}
                    </div>
                    <span class="text-[10px] bg-${a.severity==='critical'?'red':'amber'}-100 text-${a.severity==='critical'?'red':'amber'}-800 px-2 py-0.5 rounded flex-shrink-0">${a.severity}</span>
                  </div>
                  ${a.related_folder_id ? `<div class="text-[10px] text-slate-400 mt-1">📁 folder_id: ${a.related_folder_id}${a.metric_value!=null?` · ${a.metric_value}`:''}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${myRisks.length > 0 ? `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-red-50 border-b border-red-200 px-3 py-2 text-xs font-bold uppercase text-red-900">⚠️ Riesgos (${myRisks.length})</div>
            <div class="max-h-56 overflow-y-auto divide-y divide-slate-100">
              ${myRisks.slice(0, 10).map(r => `
                <div class="p-2 text-xs">
                  <div class="flex justify-between"><strong>${r.title}</strong><span class="text-[10px] ${r.score>=12?'text-red-700 font-bold':'text-slate-500'}">score ${r.score}</span></div>
                  ${r.description ? `<div class="text-[10px] text-slate-600 mt-0.5">${r.description}</div>` : ''}
                  <div class="text-[10px] text-slate-400 mt-1">${r.category||''} · owner: ${r.owner||'?'} · ${r.status}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ─── TAREAS ClickUp filtrable con folder + list + días ───
function pmRenderClickUpTasks() {
  const co = pmCurrentCompanyObj();
  if (!co) return '';
  const tasks = pmFilterByCompany(pmState.clickupTasks);
  const filter = pmState._taskFilter || 'active';
  const search = (pmState._taskSearch || '').toLowerCase();

  let list = tasks;
  if (filter === 'active')   list = list.filter(pmIsActive);
  if (filter === 'overdue')  list = list.filter(pmIsOverdue);
  if (filter === 'backlog')  list = list.filter(pmIsBacklog);
  if (filter === 'closed7d') list = list.filter(t => pmIsClosed(t) && t.date_closed && (Date.now() - new Date(t.date_closed)) < 7*86400000);
  if (filter === 'closed')   list = list.filter(pmIsClosed);
  if (search) list = list.filter(t => ((t.name||'') + ' ' + (t.primary_assignee||'') + ' ' + (t.status||'') + ' ' + (t.folder_name||'') + ' ' + (t.list_name||'')).toLowerCase().includes(search));

  list = list.sort((a,b) => {
    const aOver = pmIsOverdue(a) ? 1 : 0;
    const bOver = pmIsOverdue(b) ? 1 : 0;
    if (aOver !== bOver) return bOver - aOver;
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
    return (a.due_date ? -1 : 1);
  });

  const filters = [
    ['active', `Activas (${tasks.filter(pmIsActive).length})`],
    ['overdue', `🚨 Vencidas (${tasks.filter(pmIsOverdue).length})`],
    ['backlog', `📥 Backlog (${tasks.filter(pmIsBacklog).length})`],
    ['closed7d', `✅ Cerradas 7d`],
    ['closed', `Cerradas (${tasks.filter(pmIsClosed).length})`],
    ['all', `Todas (${tasks.length})`]
  ];

  return `
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex gap-1 flex-wrap">
          ${filters.map(([k,l]) => `
            <button onclick="pmState._taskFilter='${k}'; pmRender()" class="px-2.5 py-1 rounded text-xs font-bold ${filter===k?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200'}">${l}</button>
          `).join('')}
        </div>
        <input type="text" placeholder="Buscar título/asignado/folder/lista..." value="${(pmState._taskSearch||'').replace(/"/g,'&quot;')}" onchange="pmState._taskSearch=this.value; pmRender()" class="border border-slate-300 rounded px-2 py-1 text-xs w-72" />
        <div class="text-[10px] text-slate-500">${list.length} de ${tasks.length}</div>
      </div>
      ${list.length === 0 ? '<div class="text-center py-12 text-slate-400">Sin tasks con esos filtros.</div>' : `
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 sticky top-0 z-[1]">
              <tr class="text-[10px] uppercase text-slate-600">
                <th class="text-left p-2">Tarea</th>
                <th class="text-left p-2">Ubicación (folder › lista)</th>
                <th class="text-left p-2">Status</th>
                <th class="text-left p-2">Asignado</th>
                <th class="text-left p-2">Due / Cierre</th>
                <th class="text-right p-2" title="Activas: días vencida (+/-). Cerradas: días vs fecha objetivo (+ = tarde, − = a tiempo)">Días real</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${list.slice(0, 200).map(t => {
                const isClosed = pmIsClosed(t);
                const days = pmDaysLate(t);
                const isOver = pmIsOverdue(t);
                const isBack = pmIsBacklog(t);
                const rowCls = isOver ? 'bg-red-50' : isBack ? 'bg-violet-50/40' : isClosed ? 'opacity-70' : '';
                const dateShown = isClosed && t.date_closed
                  ? `<span class="text-[10px] text-slate-500">cerró </span>${new Date(t.date_closed).toLocaleDateString('es-MX')}`
                  : t.due_date ? new Date(t.due_date).toLocaleDateString('es-MX') : '—';
                return `<tr class="border-t border-slate-100 ${rowCls} hover:bg-slate-50">
                  <td class="p-2 font-semibold truncate max-w-xs">${isBack?'📥 ':''}${t.name || '(sin título)'}</td>
                  <td class="p-2 text-[10px] text-slate-600">${pmTaskContext(t)}</td>
                  <td class="p-2"><span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">${t.status || '—'}</span></td>
                  <td class="p-2 text-[11px] text-slate-700">${t.primary_assignee || '<span class="text-violet-700 font-bold">— sin asignar</span>'}</td>
                  <td class="p-2 text-[11px]">${dateShown}</td>
                  <td class="p-2 text-right ${pmDaysLateClass(days)}">${pmDaysLateLabel(days)}</td>
                  <td class="p-2">${t.url ? `<a href="${t.url}" target="_blank" class="text-blue-600 text-[10px] hover:underline">abrir↗</a>` : ''}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
          ${list.length > 200 ? `<div class="bg-slate-50 px-3 py-2 text-[10px] text-slate-500 text-center">Mostrando 200 de ${list.length}. Usá filtros + búsqueda para ver menos.</div>` : ''}
        </div>
      `}
    </div>
  `;
}

// ─── EQUIPO — combinación de workload + performance + coaching ───
function pmRenderTeam() {
  const co = pmCurrentCompanyObj();
  const tasks = pmFilterByCompany(pmState.clickupTasks);
  const active = tasks.filter(pmIsActive);
  const closed = tasks.filter(pmIsClosed);

  // Workload por persona — solo activas, NO backlog. Tracking de cycle time histórico también.
  const byPerson = {};
  active.forEach(t => {
    const p = t.primary_assignee;
    if (!p) return;
    if (!byPerson[p]) byPerson[p] = { total: 0, overdue: 0, byStatus: {}, stale15: 0 };
    byPerson[p].total++;
    if (pmIsOverdue(t)) byPerson[p].overdue++;
    if ((Date.now() - new Date(t.date_updated||t.date_created))/86400000 > 14) byPerson[p].stale15++;
    byPerson[p].byStatus[t.status||'?'] = (byPerson[p].byStatus[t.status||'?']||0) + 1;
  });
  // Agregar cycle time histórico desde cerradas
  closed.forEach(t => {
    const p = t.primary_assignee;
    if (!p || !t.date_closed || !t.due_date) return;
    if (!byPerson[p]) byPerson[p] = { total: 0, overdue: 0, byStatus: {}, stale15: 0 };
    byPerson[p].closedCount = (byPerson[p].closedCount||0) + 1;
    byPerson[p].cycleSum = (byPerson[p].cycleSum||0) + pmDaysLate(t);
  });
  Object.values(byPerson).forEach(s => {
    s.avgCycle = s.closedCount ? Math.round(s.cycleSum / s.closedCount) : null;
  });
  const list = Object.entries(byPerson).sort((a,b) => b[1].total - a[1].total);

  // KPIs equipo
  const totalActive = active.length;
  const peopleCount = list.length;
  const avgWorkload = peopleCount ? Math.round(totalActive / peopleCount) : 0;
  const overloaded = list.filter(([_, s]) => s.total >= 15).length;
  const totalOverdueByTeam = list.reduce((sum, [_, s]) => sum + s.overdue, 0);
  const totalStaleByTeam = list.reduce((sum, [_, s]) => sum + s.stale15, 0);

  // Análisis automático
  const insights = [];
  if (overloaded > 0) insights.push(`🔥 <strong>${overloaded}</strong> persona${overloaded>1?'s':''} sobrecargada${overloaded>1?'s':''} (≥15 tareas). Considerá rebalancear.`);
  if (totalOverdueByTeam > totalActive * 0.2) insights.push(`🚨 ${Math.round(totalOverdueByTeam/totalActive*100)}% del backlog activo está vencido. El equipo no llega — revisar capacidad o priorización.`);
  const topPerformer = list[0];
  if (topPerformer && topPerformer[1].overdue === 0 && topPerformer[1].total >= 5) insights.push(`✅ <strong>${topPerformer[0]}</strong> tiene ${topPerformer[1].total} activas y 0 vencidas. Reconocer públicamente.`);
  const slowest = [...list].sort((a,b) => (b[1].avgCycle||-999) - (a[1].avgCycle||-999))[0];
  if (slowest && slowest[1].avgCycle > 5) insights.push(`⏱ <strong>${slowest[0]}</strong> cierra en promedio ${slowest[1].avgCycle}d después del due. Posible 1-on-1 sobre planning.`);

  // Performance leaderboard filtrado
  const lb = (pmState.leaderboard || []).filter(p => pmState.currentCompany === 'holding' || p.company_name === co?.name);

  // Coaching prompts pendientes
  const coaching = (pmState.coachingPrompts || []).filter(p => !p.delivered).slice(0, 5);

  return `
    <div class="space-y-4">
      <!-- KPIs Equipo -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-slate-900 text-white rounded-xl p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Activos</div>
          <div class="text-3xl font-bold">${peopleCount}</div>
          <div class="text-[10px] text-slate-400">personas con tareas</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div class="text-[10px] text-blue-700 uppercase font-bold">Tareas/persona</div>
          <div class="text-3xl font-bold text-blue-900">${avgWorkload}</div>
          <div class="text-[10px] text-blue-700">promedio</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Sobrecargados</div>
          <div class="text-3xl font-bold text-amber-900">${overloaded}</div>
          <div class="text-[10px] text-amber-700">≥15 tareas</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-[10px] text-red-700 uppercase font-bold">Vencidas equipo</div>
          <div class="text-3xl font-bold text-red-900">${totalOverdueByTeam}</div>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div class="text-[10px] text-slate-600 uppercase font-bold">Stale 15d+</div>
          <div class="text-3xl font-bold text-slate-700">${totalStaleByTeam}</div>
          <div class="text-[10px] text-slate-600">sin update</div>
        </div>
      </div>

      <!-- Análisis automático -->
      ${insights.length > 0 ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-amber-900 mb-2">🤖 Análisis del equipo</div>
          <ul class="space-y-1 text-xs text-slate-700">${insights.map(i => `<li>• ${i}</li>`).join('')}</ul>
        </div>
      ` : ''}

      <!-- Workload detallado -->
      <div>
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">📊 Carga real por persona (solo activas, excluye backlog)</div>
        ${list.length === 0 ? '<div class="text-center py-8 text-slate-400">Sin gente asignada todavía. Sincronizá ClickUp.</div>' : `
          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <table class="w-full text-xs">
              <thead class="bg-slate-50">
                <tr class="text-[10px] uppercase text-slate-600">
                  <th class="text-left p-2">Persona</th>
                  <th class="text-right p-2">Activas</th>
                  <th class="text-right p-2">Vencidas</th>
                  <th class="text-right p-2" title="Sin update +15d">Stale</th>
                  <th class="text-right p-2" title="Avg días vs due al cerrar (negativo = a tiempo)">Cycle Δ</th>
                  <th class="text-left p-2">Status mix</th>
                </tr>
              </thead>
              <tbody>
                ${list.map(([p, s]) => {
                  const overPct = s.total > 0 ? Math.round(s.overdue/s.total*100) : 0;
                  const isOverloaded = s.total >= 15;
                  return `<tr class="border-t border-slate-100 ${isOverloaded?'bg-amber-50':''} hover:bg-slate-50">
                    <td class="p-2 font-semibold">${p} ${isOverloaded?'🔥':''}</td>
                    <td class="p-2 text-right font-bold ${s.total>=15?'text-amber-700':''}">${s.total}</td>
                    <td class="p-2 text-right ${s.overdue>0?'text-red-700 font-bold':'text-slate-400'}">${s.overdue} ${s.overdue?`(${overPct}%)`:''}</td>
                    <td class="p-2 text-right ${s.stale15>0?'text-amber-700':'text-slate-400'}">${s.stale15||''}</td>
                    <td class="p-2 text-right ${s.avgCycle == null ? 'text-slate-400' : s.avgCycle <= 0 ? 'text-emerald-700 font-bold' : s.avgCycle <= 5 ? 'text-amber-700' : 'text-red-700 font-bold'}">${s.avgCycle == null ? '—' : (s.avgCycle > 0 ? '+' : '') + s.avgCycle + 'd'}</td>
                    <td class="p-2 text-[10px] text-slate-600">${Object.entries(s.byStatus).map(([k,v]) => `<span class="bg-slate-100 px-1 rounded mr-1">${k}:${v}</span>`).join('')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Performance leaderboard (si hay data) -->
      ${lb.length > 0 ? `
        <div>
          <div class="text-xs font-bold uppercase text-slate-700 mb-2">🏆 Performance semana actual</div>
          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <table class="w-full text-xs">
              <thead class="bg-slate-50"><tr><th class="text-left p-2">Persona</th><th class="text-center p-2">Score</th><th class="text-center p-2">Tier</th><th class="text-center p-2">Tend</th></tr></thead>
              <tbody>
                ${lb.slice(0, 15).map(p => `
                  <tr class="border-t border-slate-100">
                    <td class="p-2 font-semibold">${p.full_name}</td>
                    <td class="p-2 text-center font-bold ${p.composite_score>=80?'text-emerald-700':p.composite_score>=60?'text-amber-700':'text-red-700'}">${p.composite_score||'—'}</td>
                    <td class="p-2 text-center text-[10px]">${p.performance_tier}</td>
                    <td class="p-2 text-center">${p.trend==='up'?'⬆️':p.trend==='down'?'⬇️':p.trend==='flat'?'➡️':'🆕'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Coaching prompts -->
      ${coaching.length > 0 ? `
        <div>
          <div class="text-xs font-bold uppercase text-slate-700 mb-2">🧠 Coaching sugerido por IA (pendientes)</div>
          <div class="space-y-2">
            ${coaching.map(p => `
              <div class="border ${p.priority==='urgent'?'border-red-400 bg-red-50':p.priority==='high'?'border-amber-400 bg-amber-50':'border-slate-200 bg-white'} rounded-xl p-3">
                <div class="text-[10px] uppercase font-bold">${p.priority} · ${p.prompt_type} · ${p.pm_whatsapp_recipients?.full_name || '?'}</div>
                <div class="text-sm font-bold mt-1">${p.title}</div>
                <div class="text-xs mt-1 whitespace-pre-wrap">${p.message}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ─── DECISIONES — qué requiere acción YA (excluye backlog que no es urgente) ───
function pmRenderDecisiones() {
  const co = pmCurrentCompanyObj();
  const allTasks = pmFilterByCompany(pmState.clickupTasks);
  const tasks = allTasks.filter(t => !pmIsClosed(t));
  const now = new Date();

  // VENCIDAS — solo activas (asignadas + due pasado)
  const overdue = tasks.filter(pmIsOverdue).sort((a,b) => new Date(a.due_date) - new Date(b.due_date));

  // BACKLOG sin asignar (no urgente, pero hay que tomarlas eventualmente)
  const backlog = tasks.filter(pmIsBacklog);
  // Backlog crítico = sin asignar PERO con due date próximo (≤7 días)
  const backlogUrgent = backlog.filter(t => t.due_date && (new Date(t.due_date) - now) <= 7*86400000);

  // ACTIVAS con alta prio sin fecha
  const noDue = tasks.filter(t => pmIsActive(t) && !t.due_date && (t.priority === 'urgent' || t.priority === 'high'));

  // Risks score >= 12
  const riskHigh = pmFilterByArea(pmState.risks).filter(r => r.score >= 12);

  // Compliance vence en 30d
  const compSoon = (pmState.compliance || [])
    .filter(c => pmState.currentCompany === 'holding' || c.area === co?.slug)
    .filter(c => c.expiry_date && (new Date(c.expiry_date) - now) <= 30*86400000)
    .sort((a,b) => new Date(a.expiry_date) - new Date(b.expiry_date));

  // Deps bloqueando
  const deps = (pmState.deps || []).filter(d => pmState.currentCompany === 'holding' || d.target_area === co?.slug || d.source_area === co?.slug);

  const taskRow = (t, extraLabel) => {
    const days = pmDaysLate(t);
    return `<div class="text-xs flex items-start gap-2">
      <div class="flex-1 min-w-0">
        <div class="font-bold truncate">${t.name || '(sin título)'}</div>
        <div class="text-[10px] text-slate-600 mt-0.5">${pmTaskContext(t)}</div>
        <div class="text-[10px] text-slate-500 mt-0.5">
          <strong>${t.primary_assignee || '— sin asignar'}</strong>
          ${t.status ? ` · ${t.status}` : ''}
          ${t.priority && t.priority !== 'normal' ? ` · prio <span class="font-bold ${t.priority==='urgent'?'text-red-700':'text-amber-700'}">${t.priority}</span>` : ''}
          ${extraLabel || ''}
          ${days !== null ? ` · <span class="${pmDaysLateClass(days)}">${pmDaysLateLabel(days)}</span>` : ''}
        </div>
      </div>
      ${t.url ? `<a href="${t.url}" target="_blank" class="text-blue-600 text-[10px] hover:underline flex-shrink-0">abrir↗</a>` : ''}
    </div>`;
  };

  const sections = [
    { title: '🔴 Vencidas (activas)', desc: 'Tareas asignadas con due_date pasado. Excluye backlog.', items: overdue, render: t => taskRow(t) },
    { title: '🟣 Backlog urgente', desc: 'Sin persona asignada PERO con due date ≤ 7 días. Asignar YA.', items: backlogUrgent, render: t => taskRow(t) },
    { title: '🟡 Alta prio sin fecha', desc: 'Activas con prioridad urgent/high pero sin due_date — riesgo de quedar olvidadas.', items: noDue, render: t => taskRow(t) },
    { title: '🚨 Riesgos score ≥ 12', desc: 'Probabilidad × Impacto ≥ 12 → atención inmediata.', items: riskHigh, render: r => `<div class="text-xs"><strong>${r.title}</strong> · score ${r.score} · owner ${r.owner||'?'} · ${r.category||''}</div>` },
    { title: '📜 Compliance vence < 30d', desc: 'Permisos/licencias/seguros que vencen pronto. Renovar antes.', items: compSoon, render: c => `<div class="text-xs"><strong>${c.title}</strong> · vence ${c.expiry_date} (${Math.floor((new Date(c.expiry_date)-now)/86400000)}d) · ${c.area||''}</div>` },
    { title: '🔗 Dependencias bloqueando', desc: 'X bloquea Y cross-área. Si no se resuelve, Y no avanza.', items: deps, render: d => `<div class="text-xs"><strong>${d.source_label}</strong> [${d.source_area}] → bloquea → <strong>${d.target_label}</strong> [${d.target_area}] · severidad ${d.severity}</div>` }
  ];

  const totalAccion = sections.reduce((s, x) => s + x.items.length, 0);

  return `
    <div class="space-y-3">
      <div class="bg-slate-900 text-white rounded-xl p-3">
        <div class="text-xs uppercase font-bold text-slate-400">Acciones requeridas</div>
        <div class="text-3xl font-bold mt-1">${totalAccion} ítems esperando decisión</div>
        <div class="text-xs text-slate-400 mt-1">${co ? co.name : 'Holding (todas las empresas)'}</div>
      </div>
      ${sections.filter(s => s.items.length > 0).map(s => `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 border-b border-slate-200">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold uppercase text-slate-700">${s.title}</span>
              <span class="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">${s.items.length}</span>
            </div>
            ${s.desc ? `<div class="text-[10px] text-slate-500 mt-0.5">${s.desc}</div>` : ''}
          </div>
          <div class="max-h-80 overflow-y-auto divide-y divide-slate-100">
            ${s.items.slice(0, 30).map(x => `<div class="p-2 hover:bg-slate-50">${s.render(x)}</div>`).join('')}
            ${s.items.length > 30 ? `<div class="p-2 text-[10px] text-slate-400 text-center">...y ${s.items.length-30} más</div>` : ''}
          </div>
        </div>
      `).join('')}
      ${totalAccion === 0 ? `<div class="text-center py-12 text-emerald-700"><div class="text-5xl">✅</div><div class="font-bold mt-2">Sin decisiones pendientes</div><div class="text-xs text-slate-500 mt-1">Todo bajo control en ${co?co.name:'el holding'}.</div></div>` : ''}
    </div>
  `;
}

// ============================================================
// IA PARA OKRs / RIESGOS / COMPLIANCE — análisis y sugerencias profundas
// ============================================================

// Construye el contexto operativo de la empresa actual para mandar a la IA
function pmBuildOperationalContext() {
  const co = pmCurrentCompanyObj();
  const tasks = pmFilterByCompany(pmState.clickupTasks);
  const active = tasks.filter(pmIsActive);
  const closed = tasks.filter(pmIsClosed);
  const overdue = tasks.filter(pmIsOverdue);
  const backlog = tasks.filter(pmIsBacklog);
  const closedWithDue = closed.filter(t => t.date_closed && t.due_date);
  const avgCycleLate = closedWithDue.length ? closedWithDue.reduce((s,t) => s + pmDaysLate(t), 0) / closedWithDue.length : null;

  // Carga por persona
  const byPerson = {};
  active.forEach(t => {
    const p = t.primary_assignee;
    if (!p) return;
    if (!byPerson[p]) byPerson[p] = { total: 0, overdue: 0 };
    byPerson[p].total++;
    if (pmIsOverdue(t)) byPerson[p].overdue++;
  });
  const topPeople = Object.entries(byPerson).sort((a,b) => b[1].total - a[1].total).slice(0, 8)
    .map(([name, s]) => ({ name, active: s.total, overdue: s.overdue }));

  // Folders con más actividad
  const byFolder = {};
  active.forEach(t => { const f = t.folder_name; if (!f) return; byFolder[f] = (byFolder[f]||0) + 1; });
  const topFolders = Object.entries(byFolder).sort((a,b) => b[1]-a[1]).slice(0, 10);

  return {
    company: co?.name || 'Holding',
    companySlug: co?.slug || 'holding',
    summary: {
      total_tasks: tasks.length,
      active_tasks: active.length,
      backlog_tasks: backlog.length,
      overdue_tasks: overdue.length,
      overdue_pct: active.length ? Math.round(overdue.length/active.length*100) : 0,
      closed_total: closed.length,
      avg_cycle_days_vs_due: avgCycleLate !== null ? Math.round(avgCycleLate) : null,
      active_people: topPeople.length
    },
    workload: topPeople,
    top_folders: topFolders.map(([n,c]) => ({ folder: n, active_tasks: c })),
    risks_high: pmFilterByArea(pmState.risks).filter(r => r.score >= 12).map(r => ({ title: r.title, score: r.score, category: r.category, owner: r.owner })),
    compliance_expiring: (pmState.compliance||[]).filter(c => c.expiry_date).slice(0, 10).map(c => ({ title: c.title, expiry_date: c.expiry_date, type: c.type, area: c.area })),
    existing_okrs: pmFilterByCompany(pmState.okrs || []).map(o => ({ objective: o.objective, progress: o.progress_pct, status: o.status }))
  };
}

// Llama a Claude vía aiAnalyze (sistema genérico de aiAnalyze ya implementado en app.js)
async function pmAIAnalyze(analysisType) {
  const aiKey = `pm-${analysisType}-${pmState.currentCompany}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { loading: true };
  pmRender();
  try {
    const context = pmBuildOperationalContext();
    const { data, error } = await sb.functions.invoke('ai-deep-analyze', {
      body: {
        system: `pm-${analysisType}`,
        context: { analysis_type: analysisType, ...context },
        force: true
      }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    window.aiState[aiKey] = { loading: false, ...data };
  } catch (e) {
    window.aiState[aiKey] = { loading: false, error: e.message || String(e) };
  }
  pmRender();
}

window.pmGenerateOKRSuggestions = () => pmAIAnalyze('okrs');
window.pmGenerateRisksAnalysis = () => pmAIAnalyze('risks');
window.pmGenerateComplianceAnalysis = () => pmAIAnalyze('compliance');

// Adoptar una sugerencia OKR de Claude → crear el OKR real en la DB
async function pmAdoptOKRSuggestion(idx) {
  const aiKey = `pm-okrs-${pmState.currentCompany}`;
  const ai = window.aiState[aiKey];
  if (!ai?.suggestions?.[idx]) return alert('Sugerencia no encontrada');
  const o = ai.suggestions[idx];
  const co = pmCurrentCompanyObj();
  if (!co) return alert('Seleccioná una empresa primero (no holding)');
  const quarter = new Date().getFullYear() + '-Q' + Math.ceil((new Date().getMonth()+1)/3);
  const krs = (o.key_results||[]).map((kr,i) => ({
    id: 'kr_'+Date.now()+'_'+i,
    title: kr.title,
    target: +kr.target || 0,
    current: 0,
    unit: kr.unit || '',
    source: 'manual'
  }));
  const { error } = await sb.from('pm_okrs').insert({
    company_id: co.id, quarter, objective: o.objective,
    key_results: krs, status: 'active'
  });
  if (error) return alert('Error: ' + error.message);
  // Quitar la sugerencia adoptada
  ai.suggestions.splice(idx, 1);
  await pmLoadAll();
  pmRender();
  alert('✅ OKR adoptado y activo. Ya aparece en tu lista.');
}

async function pmAdoptDetectedRisk(idx) {
  const aiKey = `pm-risks-${pmState.currentCompany}`;
  const ai = window.aiState[aiKey];
  if (!ai?.detected_risks?.[idx]) return alert('Riesgo no encontrado');
  const r = ai.detected_risks[idx];
  const co = pmCurrentCompanyObj();
  const { error } = await sb.from('pm_risks').insert({
    title: r.title,
    description: r.evidence || null,
    area: co?.slug || 'pm',
    category: r.category || 'operativo',
    probability: r.probability || Math.min(5, Math.max(1, Math.ceil(r.score/5))),
    impact: r.impact || Math.min(5, Math.max(1, Math.ceil(r.score/5))),
    mitigation: r.mitigation || null,
    status: 'open'
  });
  if (error) return alert('Error: ' + error.message);
  ai.detected_risks.splice(idx, 1);
  await pmLoadAll();
  pmRender();
  alert('✅ Riesgo agregado a tu register.');
}

// ════════════════════════════════════════════════════════════
// 📱 PM · Compositor rápido + envío Cloud API
// Misma infra que Educación. La edge function whatsapp-send-cloud
// es compartida — un solo set de credenciales de Meta para ambos.
// ════════════════════════════════════════════════════════════
const pmComposerState = { selectedIds: new Set(), tono: 'amigable', context: '' };

function pmOpenQuickComposer() {
  const recipients = (pmState.recipients || []).filter(r => r.active);
  if (!recipients.length) return alert('Sin destinatarios activos. Agregá uno desde la sección "👥 Destinatarios".');

  pmComposerState.selectedIds = new Set(recipients.map(r => r.id));

  openModal('✍️ Componer mensaje · WhatsApp Cloud API', `
    <div class="space-y-3 max-h-[80vh] overflow-y-auto pr-1">
      <div class="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-900">
        Mensaje único enviado automáticamente vía Cloud API. Sin abrir pestañas. Si el setup todavía no está hecho, te muestro la guía.
      </div>

      <!-- Destinatarios -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">👥 Destinatarios (${recipients.length})</div>
        <div class="flex gap-1.5 mb-2">
          <button onclick="pmComposerCheckAll(true)" class="text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded font-bold">✓ Todos</button>
          <button onclick="pmComposerCheckAll(false)" class="text-[11px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold">✕ Ninguno</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-32 overflow-y-auto">
          ${recipients.map(r => `
            <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded">
              <input type="checkbox" ${pmComposerState.selectedIds.has(r.id)?'checked':''} onchange="pmComposerToggle('${r.id}')"/>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold truncate">${(r.full_name||'').replace(/</g,'&lt;')}</div>
                <div class="text-[10px] text-slate-500 font-mono">${(r.phone_number||'—').replace(/</g,'&lt;')}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Mensaje -->
      <div>
        <label class="block text-xs font-bold uppercase text-slate-700 mb-1">📝 Mensaje (puede usar {nombre} para personalizar)</label>
        <textarea id="pm-composer-msg" rows="6" placeholder="Ej: Hola {nombre}, recordatorio que mañana 9am tenemos sync semanal. Llegá con avance de tus 3 OKRs principales." class="w-full border border-slate-300 rounded px-3 py-2 text-sm">${(pmComposerState.context || '').replace(/</g,'&lt;')}</textarea>
        <div class="text-[10px] text-slate-500 mt-1">💡 {nombre} se reemplaza con el primer nombre de cada destinatario.</div>
      </div>

      <!-- Botones -->
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="pmComposerSendManual()" class="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded" title="Abre wa.me por cada destinatario (manual)">📲 Manual</button>
        <button onclick="pmComposerSendCloud()" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 rounded" title="Envía vía Cloud API sin abrir pestañas">🚀 Enviar automático</button>
      </div>
    </div>
  `);
}

function pmComposerToggle(id) {
  if (pmComposerState.selectedIds.has(id)) pmComposerState.selectedIds.delete(id);
  else pmComposerState.selectedIds.add(id);
}

function pmComposerCheckAll(checked) {
  const recipients = (pmState.recipients || []).filter(r => r.active);
  pmComposerState.selectedIds = checked ? new Set(recipients.map(r => r.id)) : new Set();
  pmOpenQuickComposer();
}

function pmFillTemplate(template, recipient) {
  const nombre = (recipient.full_name || 'estudiante').split(' ')[0];
  return template.replace(/\{nombre\}/g, nombre);
}

// Envío manual (wa.me, abre pestañas)
async function pmComposerSendManual() {
  const msg = document.getElementById('pm-composer-msg').value.trim();
  if (!msg) return alert('Falta el mensaje');
  if (pmComposerState.selectedIds.size === 0) return alert('Seleccioná al menos un destinatario');

  const recipients = (pmState.recipients || []).filter(r => pmComposerState.selectedIds.has(r.id));
  if (!confirm(`Abrir ${recipients.length} pestañas wa.me?`)) return;

  let opened = 0, failed = 0;
  for (const r of recipients) {
    const phone = (r.phone_number||'').replace(/\D/g,'');
    if (!phone || phone.length < 10) { failed++; continue; }
    const personalMsg = pmFillTemplate(msg, r);
    const url = `https://wa.me/${phone.length===10?'1'+phone:phone}?text=${encodeURIComponent(personalMsg)}`;
    if (window.open(url, '_blank')) opened++;
    else failed++;
    await new Promise(res => setTimeout(res, 300));
  }
  alert(`✓ Abiertos: ${opened}\n✗ Fallaron: ${failed}`);
  closeModal();
}

// Envío automático vía Cloud API
async function pmComposerSendCloud() {
  const msg = document.getElementById('pm-composer-msg').value.trim();
  if (!msg) return alert('Falta el mensaje');
  if (pmComposerState.selectedIds.size === 0) return alert('Seleccioná al menos un destinatario');

  const recipients = (pmState.recipients || []).filter(r => pmComposerState.selectedIds.has(r.id));
  if (!confirm(`🚀 Enviar ${recipients.length} mensajes vía Cloud API (sin abrir pestañas)?`)) return;

  // 1) Insertar mensajes en pm_whatsapp_messages
  const rows = recipients.map(r => ({
    recipient_id: r.id,
    phone: r.phone_number,
    message_text: pmFillTemplate(msg, r),
    status: 'pending',
    sent_at: null
  }));

  let inserted;
  if (typeof window.safeInsert === 'function') {
    const { data, error } = await window.safeInsert(() => sb.from('pm_whatsapp_messages'), rows, { select: '*' });
    if (error) return alert('Error guardando mensajes: ' + (error.message || error));
    inserted = data || [];
  } else {
    const { data, error } = await sb.from('pm_whatsapp_messages').insert(rows).select();
    if (error) return alert('Error: ' + error.message);
    inserted = data || [];
  }

  const messageIds = inserted.map(m => m.id);

  // 2) Llamar a la edge function genérica con source=pm
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[200] bg-slate-900/80 flex items-center justify-center p-4';
  overlay.innerHTML = '<div class="bg-white rounded-2xl p-6 text-center"><div class="text-4xl animate-pulse">🚀</div><div class="font-bold mt-2">Enviando vía Cloud API...</div></div>';
  document.body.appendChild(overlay);

  try {
    const token = await window.getAccessToken();
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/whatsapp-send-cloud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ source: 'pm', message_ids: messageIds })
    });
    overlay.remove();

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 404 || /not.found/i.test(txt)) {
        return pmShowCloudSetup();
      }
      throw new Error('HTTP ' + res.status + ': ' + txt.slice(0, 200));
    }
    const r = await res.json();
    if (r.needs_setup) return pmShowCloudSetup();

    await pmLoadAll();
    pmRender();
    closeModal();
    alert(`✅ Envío completado:\n\n✓ Enviados: ${r.sent || 0}\n✗ Fallaron: ${r.failed || 0}`);
  } catch (e) {
    overlay.remove();
    alert('Error: ' + e.message);
  }
}

function pmShowCloudSetup() {
  openModal('⚙️ Setup Cloud API requerido', `
    <div class="space-y-3">
      <div class="bg-amber-50 border border-amber-300 rounded p-3 text-xs text-amber-900">
        La edge function <code>whatsapp-send-cloud</code> o las credenciales Meta no están listas.
      </div>
      <div class="bg-white border border-slate-200 rounded p-3 text-xs">
        <div class="font-bold mb-2">Setup compartido con Educación:</div>
        <ol class="space-y-1 list-decimal list-inside text-slate-700">
          <li>Andá a tu app Meta Developers → WhatsApp → API Setup</li>
          <li>Copia el Phone Number ID y el Access Token</li>
          <li>En terminal del proyecto:
            <pre class="bg-slate-900 text-emerald-300 p-2 rounded text-[10px] mt-1 overflow-x-auto">supabase secrets set META_WHATSAPP_PHONE_ID="..."
supabase secrets set META_WHATSAPP_TOKEN="..."
supabase functions deploy whatsapp-send-cloud --no-verify-jwt</pre>
          </li>
          <li>Listo. Sirve para PM + Educación</li>
        </ol>
        <div class="mt-2 text-[10px] text-slate-500">📖 Guía completa en docs/whatsapp-cloud-api-setup.md</div>
      </div>
      <button onclick="closeModal()" class="w-full bg-slate-900 text-white text-sm font-bold py-2 rounded">Entendido</button>
    </div>
  `);
}

window.pmOpenQuickComposer = pmOpenQuickComposer;
window.pmComposerToggle = pmComposerToggle;
window.pmComposerCheckAll = pmComposerCheckAll;
window.pmComposerSendManual = pmComposerSendManual;
window.pmComposerSendCloud = pmComposerSendCloud;
window.pmShowCloudSetup = pmShowCloudSetup;
