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

      <!-- SELECTOR DE EMPRESA -->
      <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 flex-wrap">
        <span class="text-[10px] font-bold uppercase text-slate-500 mr-1">Empresa:</span>
        <button onclick="pmSetCompany('holding')" class="px-3 py-1.5 rounded-lg text-xs font-bold ${isHolding ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">🏛️ Holding (todas)</button>
        ${cos.map(c => `
          <button onclick="pmSetCompany('${c.id}')" class="px-3 py-1.5 rounded-lg text-xs font-bold ${cur===c.id ? `bg-${c.color||'slate'}-600 text-white shadow` : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">${c.icon} ${c.name}</button>
        `).join('')}
        <div class="ml-auto flex items-center gap-2 text-[10px] text-slate-500">
          ${curCo ? `<span>Space ClickUp: <code class="bg-slate-100 px-1.5 py-0.5 rounded">${curCo.clickup_space_id || '⚠️ falta'}</code></span>` : ''}
          <button onclick="pmTriggerSync()" title="Sincronizar ClickUp ahora" class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold">🔄 Sync</button>
        </div>
      </div>

      <!-- TABS -->
      <div class="flex items-center gap-1 mb-3 pb-2 border-b border-slate-200 flex-wrap">
        ${tabs.map(([k,l]) => `
          <button onclick="pmSetTab('${k}')" class="px-2.5 py-1.5 rounded text-xs font-bold ${pmState.tab===k?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}">${l}</button>
        `).join('')}
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
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
            <button onclick="pmRunDailyPushNow()" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded">⚡ Correr push ahora</button>
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
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
      <button onclick="pmRunWeeklyReviewNow()" class="w-full bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold py-3 rounded">🧠 Generar Weekly Review ahora</button>
      <div class="text-[11px] text-slate-500 text-center">Costo aproximado: ~$0.03 por ejecución.</div>
    </div>
  `;
}

async function pmRunWeeklyReviewNow() {
  if (!confirm('Generar el Weekly Review ahora?\n\nClaude va a analizar los últimos 7 días cross-empresa y guardar el reporte.')) return;
  try {
    const res = await fetch(PM_REVIEW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
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
  return `
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">Risk register. Score = probabilidad × impacto. Score ≥ 12 = atender.</div>
        <button onclick="pmAddRisk()" class="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded font-bold">+ Agregar risk</button>
      </div>
      ${risks.length === 0 ? `<div class="text-center py-12 text-slate-400">Sin riesgos registrados.</div>` : `
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
  return `
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">Permisos, licencias, seguros con fecha de vencimiento.</div>
        <button onclick="pmAddCompliance()" class="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded font-bold">+ Agregar item</button>
      </div>
      ${items.length === 0 ? `<div class="text-center py-12 text-slate-400">Sin items.</div>` : items.map(c => {
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
        <button onclick="pmRunComputePerformance()" class="bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold px-3 py-2 rounded">🧮 Recalcular ahora</button>
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
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
  return `
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">OKRs trimestrales por empresa o persona. Objetivos + Key Results medibles.</div>
        <button onclick="pmAddOKR()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded">+ OKR</button>
      </div>
      ${okrs.length === 0 ? `<div class="text-center py-12 text-slate-400">Sin OKRs. Empezá creando uno para el trimestre.</div>` : okrs.map(o => `
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
  return `
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <div class="text-xs text-slate-600">Coaching 1-on-1 con cada líder. Claude prepara la agenda con la data real.</div>
        <button onclick="pmAddOneOnOne()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded">+ Programar 1-on-1</button>
      </div>
      ${list.length === 0 ? `<div class="text-center py-12 text-slate-400">Sin 1-on-1s programados.</div>` : list.map(o => `
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
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
        <button onclick="pmRunCoaching()" class="bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold px-3 py-2 rounded">🧠 Generar ahora</button>
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
      body: JSON.stringify({})
    });
    const r = await res.json();
    alert(r.ok ? `✅ ${r.prompts_generated} prompts generados.` : 'Error: ' + r.error);
    await pmLoadAll(); pmRender();
  } catch (e) { alert('Error: ' + e.message); }
}

// ─── HEATMAP ───
function pmRenderHeatmap() {
  const hm = pmFilterByCompany(pmState.heatmap || []);
  if (hm.length === 0) {
    return `<div class="text-center py-12 text-slate-500"><div class="text-5xl mb-3">🔥</div><div class="font-bold">Sin data todavía</div><div class="text-xs mt-2">Sincronizá ClickUp para llenar el heatmap.</div></div>`;
  }
  // Agrupar por status × age_bucket
  const statuses = Array.from(new Set(hm.map(h => h.status))).sort();
  const buckets = ['0-1d','2-3d','4-7d','8-14d','15d+'];
  const matrix = {};
  hm.forEach(h => {
    if (!matrix[h.status]) matrix[h.status] = {};
    matrix[h.status][h.age_bucket] = h.task_count;
  });
  // Max para escalar color
  const max = Math.max(...hm.map(h => h.task_count));

  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Heatmap: cuántas tasks abiertas están bloqueadas en cada status por X días. Más rojo = más viejo. Identificá dónde se atascan.</div>
      <div class="border border-slate-200 rounded-xl overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr><th class="text-left p-2">Status</th>${buckets.map(b => `<th class="text-center p-2">${b}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${statuses.map(s => `
              <tr class="border-t border-slate-100">
                <td class="p-2 font-semibold">${s}</td>
                ${buckets.map(b => {
                  const v = matrix[s]?.[b] || 0;
                  const intensity = max > 0 ? Math.round(v/max*100) : 0;
                  const bg = intensity === 0 ? 'bg-slate-50' : intensity < 30 ? 'bg-yellow-100' : intensity < 60 ? 'bg-orange-200' : 'bg-red-300';
                  return `<td class="${bg} text-center font-bold p-2">${v || ''}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="text-[11px] text-slate-500 italic">💡 Las celdas rojas indican tasks que llevan mucho tiempo en ese status. Hace un review específico de esas — son el cuello de botella real.</div>
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

  // Totales cross-empresa
  const totalOpen = tasks.filter(t => t.status_type !== 'closed').length;
  const totalOverdue = tasks.filter(t => t.status_type !== 'closed' && t.due_date && new Date(t.due_date) < new Date()).length;
  const totalClosed7d = tasks.filter(t => t.status_type === 'closed' && t.date_closed && (now - new Date(t.date_closed).getTime()) < 7*86400000).length;
  const totalPeople = new Set(tasks.filter(t => t.status_type !== 'closed').map(t => t.primary_assignee).filter(Boolean)).size;

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
        <div class="grid grid-cols-4 gap-3">
          <div><div class="text-[10px] text-slate-400 uppercase">Open</div><div class="text-3xl font-bold">${totalOpen}</div></div>
          <div><div class="text-[10px] text-slate-400 uppercase">Vencidas</div><div class="text-3xl font-bold ${totalOverdue>10?'text-red-300':'text-amber-300'}">${totalOverdue}</div></div>
          <div><div class="text-[10px] text-slate-400 uppercase">Cerradas 7d</div><div class="text-3xl font-bold text-emerald-300">${totalClosed7d}</div></div>
          <div><div class="text-[10px] text-slate-400 uppercase">Personas activas</div><div class="text-3xl font-bold">${totalPeople}</div></div>
        </div>
      </div>

      <!-- Cards por empresa -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        ${exec.map(e => {
          const tone = e.tasks_overdue > 10 ? 'border-red-300 bg-red-50' : e.tasks_overdue > 3 ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50';
          return `
            <button onclick="pmSetCompany('${e.company_id}')" class="text-left bg-white border-2 ${tone} rounded-xl p-3 hover:shadow-lg transition-shadow">
              <div class="text-base font-bold">${e.icon} ${e.company_name}</div>
              <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div><div class="text-[10px] text-slate-500 uppercase">Open</div><div class="text-2xl font-bold">${e.tasks_open || 0}</div></div>
                <div><div class="text-[10px] text-slate-500 uppercase">Vencidas</div><div class="text-2xl font-bold ${(e.tasks_overdue||0)>5?'text-red-700':'text-slate-700'}">${e.tasks_overdue || 0}</div></div>
                <div><div class="text-[10px] text-slate-500 uppercase">Cerradas 7d</div><div class="text-2xl font-bold text-emerald-700">${e.tasks_closed_7d || 0}</div></div>
                <div><div class="text-[10px] text-slate-500 uppercase">Personas</div><div class="text-2xl font-bold">${e.active_people || 0}</div></div>
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
  const open = tasks.filter(t => t.status_type !== 'closed');
  const overdue = open.filter(t => t.due_date && new Date(t.due_date) < now);
  const dueToday = open.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d.toDateString() === now.toDateString();
  });
  const dueWeek = open.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    const diff = (d - now) / 86400000;
    return diff > 0 && diff <= 7;
  });
  const closed7d = tasks.filter(t => t.status_type === 'closed' && t.date_closed && (now - new Date(t.date_closed)) < 7*86400000);

  // Por status
  const byStatus = {};
  open.forEach(t => { const s = t.status || '?'; byStatus[s] = (byStatus[s]||0)+1; });

  // Top assignees (por carga abierta)
  const byPerson = {};
  open.forEach(t => {
    const p = t.primary_assignee || 'Sin asignar';
    if (!byPerson[p]) byPerson[p] = { total: 0, overdue: 0 };
    byPerson[p].total++;
    if (t.due_date && new Date(t.due_date) < now) byPerson[p].overdue++;
  });
  const topPeople = Object.entries(byPerson).sort((a,b) => b[1].total - a[1].total).slice(0, 10);

  const myAlerts = (pmState.clickupAlerts || []).filter(a => !a.related_folder_id || a.related_folder_id === co.slug);
  const myRisks = pmFilterByArea(pmState.risks);

  return `
    <div class="space-y-4">
      <!-- KPIs principales -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-slate-900 text-white rounded-xl p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Tasks abiertas</div>
          <div class="text-3xl font-bold">${open.length}</div>
          <div class="text-[10px] text-slate-400">${tasks.length} totales</div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-[10px] text-red-700 uppercase font-bold">Vencidas</div>
          <div class="text-3xl font-bold text-red-900">${overdue.length}</div>
          <div class="text-[10px] text-red-700">${open.length>0?Math.round(overdue.length/open.length*100):0}% del abierto</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Vencen hoy</div>
          <div class="text-3xl font-bold text-amber-900">${dueToday.length}</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div class="text-[10px] text-blue-700 uppercase font-bold">Próx 7 días</div>
          <div class="text-3xl font-bold text-blue-900">${dueWeek.length}</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">Cerradas 7d</div>
          <div class="text-3xl font-bold text-emerald-900">${closed7d.length}</div>
        </div>
      </div>

      <!-- Por status + Por persona, lado a lado -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">📊 Por status (abiertas)</div>
          ${Object.keys(byStatus).length === 0 ? '<div class="p-4 text-center text-xs text-slate-400">Sin tasks abiertas.</div>' : `
            <table class="w-full text-xs">
              <tbody>
                ${Object.entries(byStatus).sort((a,b) => b[1]-a[1]).map(([s,n]) => {
                  const pct = open.length > 0 ? Math.round(n/open.length*100) : 0;
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
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">👥 Carga por persona (top 10)</div>
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

      <!-- Vencidas críticas (top 10) -->
      ${overdue.length > 0 ? `
        <div class="bg-white border border-red-200 rounded-xl overflow-hidden">
          <div class="bg-red-50 border-b border-red-200 px-3 py-2 text-xs font-bold uppercase text-red-900">🚨 Top vencidas (${overdue.length})</div>
          <div class="max-h-64 overflow-y-auto">
            <table class="w-full text-xs">
              <tbody>
                ${overdue.sort((a,b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 15).map(t => {
                  const daysLate = Math.floor((now - new Date(t.due_date))/86400000);
                  return `<tr class="border-t border-slate-100 hover:bg-slate-50">
                    <td class="p-2 font-semibold truncate max-w-md">${t.name || '(sin título)'}</td>
                    <td class="p-2 text-[11px] text-slate-500">${t.primary_assignee || '—'}</td>
                    <td class="p-2 text-[11px]">${t.status || '—'}</td>
                    <td class="p-2 text-right text-red-700 font-bold">${daysLate}d</td>
                    ${t.url ? `<td class="p-2"><a href="${t.url}" target="_blank" class="text-blue-600 text-[10px] hover:underline">abrir</a></td>` : '<td></td>'}
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Alertas + Risks de la empresa -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${myAlerts.length > 0 ? `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-amber-50 border-b border-amber-200 px-3 py-2 text-xs font-bold uppercase text-amber-900">⚠️ Alertas (${myAlerts.length})</div>
            <div class="max-h-48 overflow-y-auto divide-y divide-slate-100">
              ${myAlerts.slice(0, 10).map(a => `
                <div class="p-2 text-xs"><strong>${a.alert_type}</strong><div class="text-[10px] text-slate-500">${a.message || ''}</div></div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${myRisks.length > 0 ? `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-red-50 border-b border-red-200 px-3 py-2 text-xs font-bold uppercase text-red-900">⚠️ Riesgos (${myRisks.length})</div>
            <div class="max-h-48 overflow-y-auto divide-y divide-slate-100">
              ${myRisks.slice(0, 10).map(r => `
                <div class="p-2 text-xs"><strong>${r.title}</strong> <span class="text-[10px] ${r.score>=12?'text-red-700':'text-slate-500'}">score ${r.score}</span></div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ─── TAREAS ClickUp filtrable ───
function pmRenderClickUpTasks() {
  const co = pmCurrentCompanyObj();
  if (!co) return '';
  const tasks = pmFilterByCompany(pmState.clickupTasks);
  const filter = pmState._taskFilter || 'open';
  const search = (pmState._taskSearch || '').toLowerCase();

  let list = tasks;
  if (filter === 'open') list = list.filter(t => t.status_type !== 'closed');
  if (filter === 'overdue') list = list.filter(t => t.status_type !== 'closed' && t.due_date && new Date(t.due_date) < new Date());
  if (filter === 'unassigned') list = list.filter(t => t.status_type !== 'closed' && !t.primary_assignee);
  if (filter === 'closed7d') list = list.filter(t => t.status_type === 'closed' && t.date_closed && (Date.now() - new Date(t.date_closed)) < 7*86400000);
  if (search) list = list.filter(t => ((t.name||'') + ' ' + (t.primary_assignee||'') + ' ' + (t.status||'')).toLowerCase().includes(search));

  list = list.sort((a,b) => {
    // overdue primero, después por due_date ascendente
    const aOver = a.due_date && new Date(a.due_date) < new Date() ? 1 : 0;
    const bOver = b.due_date && new Date(b.due_date) < new Date() ? 1 : 0;
    if (aOver !== bOver) return bOver - aOver;
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
    return (a.due_date ? -1 : 1);
  });

  return `
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex gap-1">
          ${[['open','Abiertas'],['overdue','Vencidas'],['unassigned','Sin asignar'],['closed7d','Cerradas 7d'],['all','Todas']].map(([k,l]) => `
            <button onclick="pmState._taskFilter='${k}'; pmRender()" class="px-2.5 py-1 rounded text-xs font-bold ${filter===k?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200'}">${l}</button>
          `).join('')}
        </div>
        <input type="text" placeholder="Buscar título/asignado/status..." value="${(pmState._taskSearch||'').replace(/"/g,'&quot;')}" onchange="pmState._taskSearch=this.value; pmRender()" class="border border-slate-300 rounded px-2 py-1 text-xs w-64" />
        <div class="text-[10px] text-slate-500">${list.length} de ${tasks.length}</div>
      </div>
      ${list.length === 0 ? '<div class="text-center py-12 text-slate-400">Sin tasks con esos filtros.</div>' : `
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr><th class="text-left p-2">Task</th><th class="text-left p-2">Status</th><th class="text-left p-2">Asignado</th><th class="text-left p-2">Due</th><th class="text-right p-2">Días</th><th></th></tr>
            </thead>
            <tbody>
              ${list.slice(0, 200).map(t => {
                const dueDate = t.due_date ? new Date(t.due_date) : null;
                const daysLate = dueDate ? Math.floor((Date.now() - dueDate)/86400000) : null;
                const isOver = daysLate != null && daysLate > 0 && t.status_type !== 'closed';
                return `<tr class="border-t border-slate-100 ${isOver?'bg-red-50':''} hover:bg-slate-50">
                  <td class="p-2 font-semibold truncate max-w-md">${t.name || '(sin título)'}</td>
                  <td class="p-2"><span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">${t.status || '—'}</span></td>
                  <td class="p-2 text-[11px] text-slate-600">${t.primary_assignee || '—'}</td>
                  <td class="p-2 text-[11px]">${dueDate ? dueDate.toLocaleDateString('es-MX') : '—'}</td>
                  <td class="p-2 text-right text-[11px] ${isOver?'text-red-700 font-bold':'text-slate-500'}">${daysLate != null ? (daysLate > 0 ? '+'+daysLate : daysLate) : '—'}</td>
                  <td class="p-2">${t.url ? `<a href="${t.url}" target="_blank" class="text-blue-600 text-[10px] hover:underline">abrir</a>` : ''}</td>
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
  const open = tasks.filter(t => t.status_type !== 'closed');

  // Workload por persona (de ClickUp, real data)
  const byPerson = {};
  open.forEach(t => {
    const p = t.primary_assignee || 'Sin asignar';
    if (!byPerson[p]) byPerson[p] = { total: 0, overdue: 0, byStatus: {} };
    byPerson[p].total++;
    if (t.due_date && new Date(t.due_date) < new Date()) byPerson[p].overdue++;
    byPerson[p].byStatus[t.status||'?'] = (byPerson[p].byStatus[t.status||'?']||0) + 1;
  });
  const list = Object.entries(byPerson).sort((a,b) => b[1].total - a[1].total);

  // Performance leaderboard filtrado
  const lb = (pmState.leaderboard || []).filter(p => pmState.currentCompany === 'holding' || p.company_name === co?.name);

  // Coaching prompts pendientes
  const coaching = (pmState.coachingPrompts || []).filter(p => !p.delivered).slice(0, 5);

  return `
    <div class="space-y-4">
      <!-- Workload real desde ClickUp -->
      <div>
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">📊 Carga de trabajo (ClickUp en vivo)</div>
        ${list.length === 0 ? '<div class="text-center py-8 text-slate-400">Sin gente asignada.</div>' : `
          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <table class="w-full text-xs">
              <thead class="bg-slate-50">
                <tr><th class="text-left p-2">Persona</th><th class="text-right p-2">Tasks abiertas</th><th class="text-right p-2">Vencidas</th><th class="text-left p-2">Status mix</th></tr>
              </thead>
              <tbody>
                ${list.map(([p, s]) => {
                  const overPct = s.total > 0 ? Math.round(s.overdue/s.total*100) : 0;
                  const isOverloaded = s.total >= 15;
                  return `<tr class="border-t border-slate-100 ${isOverloaded?'bg-amber-50':''}">
                    <td class="p-2 font-semibold">${p} ${isOverloaded?'🔥':''}</td>
                    <td class="p-2 text-right font-bold ${s.total>=15?'text-amber-700':''}">${s.total}</td>
                    <td class="p-2 text-right ${s.overdue>0?'text-red-700 font-bold':'text-slate-400'}">${s.overdue} (${overPct}%)</td>
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

// ─── DECISIONES — qué requiere acción YA ───
function pmRenderDecisiones() {
  const co = pmCurrentCompanyObj();
  const tasks = pmFilterByCompany(pmState.clickupTasks).filter(t => t.status_type !== 'closed');
  const now = new Date();

  // Vencidas
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < now)
    .sort((a,b) => new Date(a.due_date) - new Date(b.due_date));

  // Sin asignar
  const unassigned = tasks.filter(t => !t.primary_assignee);

  // Sin due date (alta prioridad sin fecha)
  const noDue = tasks.filter(t => !t.due_date && (t.priority === 'urgent' || t.priority === 'high'));

  // Risks score >= 12
  const riskHigh = pmFilterByArea(pmState.risks).filter(r => r.score >= 12);

  // Compliance vence en 30d
  const compSoon = (pmState.compliance || [])
    .filter(c => pmState.currentCompany === 'holding' || c.area === co?.slug)
    .filter(c => c.expiry_date && (new Date(c.expiry_date) - now) <= 30*86400000)
    .sort((a,b) => new Date(a.expiry_date) - new Date(b.expiry_date));

  // Deps bloqueando
  const deps = (pmState.deps || []).filter(d => pmState.currentCompany === 'holding' || d.target_area === co?.slug || d.source_area === co?.slug);

  const sections = [
    { title: '🔴 Tasks vencidas', items: overdue, render: t => `<div class="text-xs"><strong>${t.name}</strong> · ${t.primary_assignee || 'sin asignar'} · <span class="text-red-700 font-bold">${Math.floor((now-new Date(t.due_date))/86400000)}d vencida</span> ${t.url?`<a href="${t.url}" target="_blank" class="text-blue-600 text-[10px] ml-1">abrir</a>`:''}</div>` },
    { title: '⚪ Tasks sin asignar', items: unassigned, render: t => `<div class="text-xs"><strong>${t.name}</strong> · status ${t.status} ${t.url?`<a href="${t.url}" target="_blank" class="text-blue-600 text-[10px] ml-1">abrir</a>`:''}</div>` },
    { title: '🟡 Alta prio sin fecha', items: noDue, render: t => `<div class="text-xs"><strong>${t.name}</strong> · ${t.primary_assignee||'sin asignar'} · prio ${t.priority} ${t.url?`<a href="${t.url}" target="_blank" class="text-blue-600 text-[10px] ml-1">abrir</a>`:''}</div>` },
    { title: '🚨 Riesgos score ≥ 12', items: riskHigh, render: r => `<div class="text-xs"><strong>${r.title}</strong> · score ${r.score} · owner ${r.owner||'?'}</div>` },
    { title: '📜 Compliance vence < 30d', items: compSoon, render: c => `<div class="text-xs"><strong>${c.title}</strong> · vence ${c.expiry_date} (${Math.floor((new Date(c.expiry_date)-now)/86400000)}d)</div>` },
    { title: '🔗 Dependencias bloqueando', items: deps, render: d => `<div class="text-xs"><strong>${d.source_label}</strong> → bloquea → <strong>${d.target_label}</strong> · severidad ${d.severity}</div>` }
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
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700 flex justify-between">
            <span>${s.title}</span><span class="bg-slate-900 text-white px-2 rounded">${s.items.length}</span>
          </div>
          <div class="max-h-64 overflow-y-auto divide-y divide-slate-100">
            ${s.items.slice(0, 30).map(x => `<div class="p-2 hover:bg-slate-50">${s.render(x)}</div>`).join('')}
            ${s.items.length > 30 ? `<div class="p-2 text-[10px] text-slate-400 text-center">...y ${s.items.length-30} más</div>` : ''}
          </div>
        </div>
      `).join('')}
      ${totalAccion === 0 ? `<div class="text-center py-12 text-emerald-700"><div class="text-5xl">✅</div><div class="font-bold mt-2">Sin decisiones pendientes</div><div class="text-xs text-slate-500 mt-1">Todo bajo control en ${co?co.name:'el holding'}.</div></div>` : ''}
    </div>
  `;
}
