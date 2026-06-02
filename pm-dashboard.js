// ============================================================
// PM DASHBOARD — Sistema nervioso central del área Project Management
// Scorecard, WhatsApp config + loop, workload, dependencias, IA agente,
// reportes ejecutivos, risks & compliance.
// ============================================================

const pmState = {
  sys: null,
  tab: 'scorecard',
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
  const [s, r, c, m, d, rep, ri, co, dep, comp, exec, lb, okrs, ono, cp, hm] = await Promise.all([
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
    sb.from('pm_bottleneck_heatmap').select('*').then(r => r.data || []).catch(() => [])
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
}

function pmSetTab(t) { pmState.tab = t; pmRender(); }

function pmRender() {
  const root = document.getElementById('pm-root');
  if (!root) return;
  const tabs = [
    ['scorecard', '📊 Scorecard'],
    ['executive', '🏢 Cross-Empresa'],
    ['performance', '🏆 Performance'],
    ['okrs', '🎯 OKRs'],
    ['oneOnOnes', '💬 1-on-1s'],
    ['coaching', '🧠 Coaching IA'],
    ['heatmap', '🔥 Heatmap'],
    ['companies', '🏛️ Empresas'],
    ['whatsapp', '📱 WhatsApp'],
    ['workload', '👥 Workload'],
    ['deps', '🔗 Dependencias'],
    ['agent', '🤖 Reports IA'],
    ['reports', '📈 Reportes'],
    ['risks', '⚠️ Risks'],
    ['compliance', '📜 Compliance']
  ];
  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[84vh]">
      <div class="flex items-center gap-1.5 mb-3 pb-3 border-b border-slate-200 flex-wrap">
        ${tabs.map(([k,l]) => `
          <button onclick="pmSetTab('${k}')" class="px-2.5 py-1.5 rounded text-xs font-bold ${pmState.tab===k?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}">${l}</button>
        `).join('')}
      </div>
      <div class="flex-1 overflow-y-auto">
        ${pmState.tab === 'scorecard' ? pmRenderScorecard() :
          pmState.tab === 'executive' ? pmRenderExecutive() :
          pmState.tab === 'performance' ? pmRenderPerformance() :
          pmState.tab === 'okrs' ? pmRenderOKRs() :
          pmState.tab === 'oneOnOnes' ? pmRenderOneOnOnes() :
          pmState.tab === 'coaching' ? pmRenderCoaching() :
          pmState.tab === 'heatmap' ? pmRenderHeatmap() :
          pmState.tab === 'companies' ? pmRenderCompanies() :
          pmState.tab === 'whatsapp' ? pmRenderWhatsApp() :
          pmState.tab === 'workload' ? pmRenderWorkload() :
          pmState.tab === 'deps' ? pmRenderDeps() :
          pmState.tab === 'agent' ? pmRenderAgent() :
          pmState.tab === 'reports' ? pmRenderReports() :
          pmState.tab === 'risks' ? pmRenderRisks() :
          pmRenderCompliance()}
      </div>
    </div>
  `;
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
  const risks = pmState.risks || [];
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
  const items = pmState.compliance || [];
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
  const lb = pmState.leaderboard || [];
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
  const okrs = pmState.okrs || [];
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
  const hm = pmState.heatmap || [];
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
