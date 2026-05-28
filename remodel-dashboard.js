// ============================================================
// REMODEL DASHBOARD — KPIs + alertas + snapshots históricos
// Conectado a Airtable via edge function `sync-remodel-airtable`
// ============================================================

const rdState = {
  sys: null,
  properties: [],
  alerts: [],
  syncLog: null,
  tab: 'portfolio',          // portfolio | obras | lideres | alertas | tendencias
  selectedAirtableId: null,  // para drill-down de obra
  obraHistory: [],
  loading: false
};

const RD_FN_URL = `${window.SUPABASE_URL}/functions/v1/sync-remodel-airtable`;

async function openRemodelDashboard(sys) {
  rdState.sys = sys;
  openModal(`📊 ${sys.name}`, '<div id="rd-root">Cargando...</div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  await rdLoadAll();
  rdRender();
}

async function rdLoadAll() {
  const [p, a, l] = await Promise.all([
    sb.from('remodel_at_properties').select('*').order('proceso').order('avance_pct', { ascending: true }),
    sb.from('remodel_alerts').select('*').is('resolved_at', null).order('severity').order('detected_at', { ascending: false }),
    sb.from('remodel_sync_log').select('*').order('synced_at', { ascending: false }).limit(1)
  ]);
  rdState.properties = p.data || [];
  rdState.alerts = a.data || [];
  rdState.syncLog = (l.data && l.data[0]) || null;
}

async function rdSync() {
  rdState.loading = true;
  rdRender();
  try {
    const res = await fetch(RD_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ user_id: state.user.id })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'Sync falló');
    await rdLoadAll();
    rdState.loading = false;
    rdRender();
    return r;
  } catch (e) {
    rdState.loading = false;
    rdRender();
    alert('Error en sync: ' + e.message + '\n\nVerificá que la edge function esté desplegada y que AIRTABLE_TOKEN esté configurado en Supabase secrets.');
  }
}

function rdRender() {
  const root = document.getElementById('rd-root');
  if (!root) return;

  const active = rdState.properties.filter(p => p.proceso !== 'Finalizado' && p.proceso);
  const finalizada = rdState.properties.filter(p => p.proceso === 'Finalizado');
  const sinAsignar = rdState.properties.filter(p => !p.proceso);

  const lastSync = rdState.syncLog ? new Date(rdState.syncLog.synced_at) : null;
  const lastSyncAgo = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 60000) : null;

  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[84vh]">

      <!-- HEADER -->
      <div class="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          ${['portfolio','obras','lideres','alertas','tendencias'].map(t => `
            <button onclick="rdSetTab('${t}')" class="px-3 py-1.5 rounded text-xs font-bold ${rdState.tab===t?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
              ${t==='portfolio'?'📊 Portfolio':t==='obras'?'🏗️ Obras':t==='lideres'?'👷 Líderes':t==='alertas'?'🚨 Alertas':'📈 Tendencias'}
              ${t==='alertas' && rdState.alerts.length ? `<span class="ml-1 bg-red-600 text-white px-1.5 rounded">${rdState.alerts.length}</span>` : ''}
            </button>
          `).join('')}
        </div>
        <div class="flex items-center gap-2">
          ${lastSync ? `<span class="text-[10px] text-slate-500">Última sync: ${lastSyncAgo < 1 ? 'ahora' : lastSyncAgo < 60 ? lastSyncAgo+'min' : Math.floor(lastSyncAgo/60)+'h'} · ${rdState.syncLog.records_synced || 0} obras</span>` : '<span class="text-[10px] text-amber-700">Sin sync todavía. Click 🔄</span>'}
          <button onclick="rdSync()" ${rdState.loading?'disabled':''} class="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold">
            ${rdState.loading ? '⏳ Sincronizando...' : '🔄 Sync Airtable'}
          </button>
        </div>
      </div>

      <!-- BODY tab content -->
      <div class="flex-1 overflow-y-auto">
        ${rdState.tab === 'portfolio' ? rdRenderPortfolio(active, finalizada) :
          rdState.tab === 'obras' ? rdRenderObras(active, finalizada, sinAsignar) :
          rdState.tab === 'lideres' ? rdRenderLideres() :
          rdState.tab === 'alertas' ? rdRenderAlertas() :
          rdRenderTendencias()}
      </div>
    </div>
  `;
}

function rdSetTab(t) { rdState.tab = t; rdRender(); }

// ─── PORTFOLIO TAB ───
function rdRenderPortfolio(active, finalizada) {
  if (rdState.properties.length === 0) {
    return `
      <div class="text-center py-16">
        <div class="text-5xl mb-4">📊</div>
        <h3 class="text-lg font-bold text-slate-700">Sin datos todavía</h3>
        <p class="text-sm text-slate-500 mt-2">Click <strong>🔄 Sync Airtable</strong> arriba para traer la información de tus obras.</p>
      </div>
    `;
  }

  // KPIs portfolio
  const totalGastado = active.reduce((s,p) => s + (p.gasto_materiales||0) + (p.gasto_trabajadores||0), 0);
  const totalPresup = active.reduce((s,p) => s + (p.presupuesto_interno||0), 0);
  const totalPipeline = active.reduce((s,p) => s + ((p.valor_cliente||0) - (p.presupuesto_interno||0)), 0);
  const avgAvance = active.length ? Math.round(active.reduce((s,p) => s + (p.avance_pct||0), 0) / active.length) : 0;
  const totalGananciaCerrada = finalizada.reduce((s,p) => s + (p.ganancia||0), 0);
  const matSum = active.reduce((s,p) => s + (p.gasto_materiales||0), 0);
  const labSum = active.reduce((s,p) => s + (p.gasto_trabajadores||0), 0);
  const matPct = (matSum+labSum) > 0 ? Math.round(matSum/(matSum+labSum)*100) : 0;

  // Critical alerts
  const criticalAlerts = rdState.alerts.filter(a => a.severity === 'critical');

  return `
    <div class="space-y-4">
      <!-- KPIs principales -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-slate-900 text-white rounded-xl p-4">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Obras activas</div>
          <div class="text-3xl font-bold">${active.length}</div>
          <div class="text-[10px] text-slate-400 mt-1">${finalizada.length} finalizadas históricas</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div class="text-[10px] text-blue-700 uppercase font-bold">Capital en obra</div>
          <div class="text-3xl font-bold text-blue-900">$${Math.round(totalGastado/1000)}K</div>
          <div class="text-[10px] text-blue-700 mt-1">vs $${Math.round(totalPresup/1000)}K presupuestado (${totalPresup?Math.round(totalGastado/totalPresup*100):0}%)</div>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div class="text-[10px] text-emerald-700 uppercase font-bold">Pipeline ganancia</div>
          <div class="text-3xl font-bold text-emerald-900">$${Math.round(totalPipeline/1000)}K</div>
          <div class="text-[10px] text-emerald-700 mt-1">cuando se cierren las activas</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div class="text-[10px] text-amber-700 uppercase font-bold">Avance promedio</div>
          <div class="text-3xl font-bold text-amber-900">${avgAvance}%</div>
          <div class="text-[10px] text-amber-700 mt-1">${matPct}% mat / ${100-matPct}% trabaj</div>
        </div>
      </div>

      <!-- Alertas críticas inline -->
      ${criticalAlerts.length ? `
        <div class="bg-red-50 border border-red-300 rounded-xl p-3">
          <div class="text-xs font-bold text-red-900 uppercase mb-2">🚨 ${criticalAlerts.length} alerta(s) críticas — requieren acción</div>
          <div class="space-y-1">
            ${criticalAlerts.slice(0,3).map(a => `
              <div class="bg-white border border-red-200 rounded p-2 text-xs">
                <div class="font-bold">${a.title}</div>
                <div class="text-[11px] text-slate-600">${a.detail}</div>
              </div>
            `).join('')}
            ${criticalAlerts.length > 3 ? `<button onclick="rdSetTab('alertas')" class="text-[11px] text-red-700 hover:underline font-bold">+ ver las ${criticalAlerts.length - 3} restantes →</button>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Obras activas con SPI/CPI -->
      <div>
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">🏗️ Obras activas (${active.length})</div>
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 sticky top-0">
              <tr>
                <th class="text-left p-2">Obra</th>
                <th class="text-left p-2">Líder</th>
                <th class="text-right p-2">Avance</th>
                <th class="text-right p-2">Gastado</th>
                <th class="text-right p-2">Presup</th>
                <th class="text-right p-2">SPI</th>
                <th class="text-right p-2">CPI</th>
                <th class="text-center p-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${active.length === 0 ? '<tr><td colspan="8" class="p-4 text-center text-slate-400">Sin obras activas</td></tr>' : active.map(p => rdRenderObraRow(p)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function rdRenderObraRow(p) {
  // Pulls latest snapshot for SPI/CPI
  const cost = (p.gasto_materiales||0) + (p.gasto_trabajadores||0);
  const presup = p.presupuesto_interno || 0;
  const avance = p.avance_pct || 0;

  // Calc client-side rápido (los precisos están en snapshots)
  let spi = null, cpi = null;
  if (p.fecha_inicio && p.fecha_estimada_fin) {
    const totalDays = Math.round((new Date(p.fecha_estimada_fin) - new Date(p.fecha_inicio))/86400000);
    const elapsedDays = Math.round((Date.now() - new Date(p.fecha_inicio))/86400000);
    if (totalDays > 0 && elapsedDays >= 0) {
      const timePct = Math.min(100, elapsedDays/totalDays*100);
      if (timePct > 0) spi = avance/timePct;
    }
  }
  if (presup > 0 && cost > 0 && avance > 0) {
    cpi = (presup * avance/100) / cost;
  }

  const spiColor = spi == null ? 'text-slate-400' : spi >= 1 ? 'text-emerald-600 font-bold' : spi >= 0.85 ? 'text-amber-600' : 'text-red-600 font-bold';
  const cpiColor = cpi == null ? 'text-slate-400' : cpi >= 1 ? 'text-emerald-600 font-bold' : cpi >= 0.9 ? 'text-amber-600' : 'text-red-600 font-bold';
  const presupUsedPct = presup > 0 ? Math.round(cost/presup*100) : 0;
  const usageColor = presupUsedPct > 100 ? 'bg-red-500' : presupUsedPct > 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="rdOpenObra('${p.airtable_id}')">
      <td class="p-2 font-semibold text-slate-900 max-w-[200px] truncate" title="${p.address}">${p.address || '—'}</td>
      <td class="p-2 text-slate-600">${p.lider || '—'}</td>
      <td class="p-2 text-right">
        <div class="flex items-center gap-1 justify-end">
          <div class="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden"><div class="bg-blue-500 h-full" style="width:${avance}%"></div></div>
          <span class="font-bold">${avance}%</span>
        </div>
      </td>
      <td class="p-2 text-right">
        <div>$${Math.round(cost).toLocaleString()}</div>
        <div class="w-14 bg-slate-100 rounded-full h-1 overflow-hidden ml-auto"><div class="${usageColor} h-full" style="width:${Math.min(presupUsedPct,100)}%"></div></div>
      </td>
      <td class="p-2 text-right text-slate-500">$${Math.round(presup).toLocaleString()}</td>
      <td class="p-2 text-right ${spiColor}">${spi != null ? spi.toFixed(2) : '—'}</td>
      <td class="p-2 text-right ${cpiColor}">${cpi != null ? cpi.toFixed(2) : '—'}</td>
      <td class="p-2 text-center text-[11px]">${p.desviacion_label || '—'}</td>
    </tr>
  `;
}

// ─── OBRAS TAB (lista completa con filtros) ───
function rdRenderObras(active, finalizada, sinAsignar) {
  const all = [...active, ...sinAsignar, ...finalizada];
  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Total: ${all.length} obras (${active.length} activas, ${finalizada.length} finalizadas, ${sinAsignar.length} sin proceso)</div>
      <div class="border border-slate-200 rounded-xl overflow-hidden">
        <table class="w-full text-xs">
          <thead class="bg-slate-50 sticky top-0">
            <tr>
              <th class="text-left p-2">Obra</th>
              <th class="text-left p-2">Estado</th>
              <th class="text-left p-2">Líder</th>
              <th class="text-right p-2">Avance</th>
              <th class="text-right p-2">Gastado</th>
              <th class="text-right p-2">Presup</th>
              <th class="text-right p-2">Cliente</th>
              <th class="text-right p-2">Ganancia</th>
              <th class="text-center p-2">Desviación</th>
            </tr>
          </thead>
          <tbody>
            ${all.map(p => {
              const cost = (p.gasto_materiales||0) + (p.gasto_trabajadores||0);
              const procColor = p.proceso === 'Finalizado' ? 'text-emerald-700' : p.proceso === 'En construcción' ? 'text-blue-700' : 'text-slate-500';
              return `
                <tr class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="rdOpenObra('${p.airtable_id}')">
                  <td class="p-2 max-w-[180px] truncate" title="${p.address}">${p.address || '—'}</td>
                  <td class="p-2 ${procColor} font-semibold">${p.proceso || '—'}</td>
                  <td class="p-2 text-slate-600">${p.lider || '—'}</td>
                  <td class="p-2 text-right font-bold">${p.avance_pct != null ? p.avance_pct+'%' : '—'}</td>
                  <td class="p-2 text-right">$${Math.round(cost).toLocaleString()}</td>
                  <td class="p-2 text-right text-slate-500">$${Math.round(p.presupuesto_interno||0).toLocaleString()}</td>
                  <td class="p-2 text-right">$${Math.round(p.valor_cliente||0).toLocaleString()}</td>
                  <td class="p-2 text-right ${(p.ganancia||0) >= 0 ? 'text-emerald-700' : 'text-red-700'} font-semibold">$${Math.round(p.ganancia||0).toLocaleString()}</td>
                  <td class="p-2 text-center text-[11px]">${p.desviacion_label || '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── LÍDERES TAB ───
function rdRenderLideres() {
  const byLider = {};
  rdState.properties.forEach(p => {
    if (!p.lider) return;
    if (!byLider[p.lider]) byLider[p.lider] = { total: 0, finalizadas: 0, activas: 0, ganancia: 0, gastado: 0, presup: 0, dias: [], desviaciones: [] };
    const L = byLider[p.lider];
    L.total++;
    if (p.proceso === 'Finalizado') L.finalizadas++;
    else if (p.proceso === 'En construcción') L.activas++;
    L.ganancia += p.ganancia || 0;
    L.gastado += (p.gasto_materiales||0) + (p.gasto_trabajadores||0);
    L.presup += p.presupuesto_interno || 0;
    if (p.desviacion_label && p.desviacion_label.includes('Ahorro')) L.desviaciones.push('ahorro');
    else if (p.desviacion_label && p.desviacion_label.includes('Sobre')) L.desviaciones.push('sobre');
    else if (p.desviacion_label) L.desviaciones.push('neutral');
  });

  const lideres = Object.entries(byLider).sort((a,b) => b[1].ganancia - a[1].ganancia);

  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Performance de líderes/crews. Ranking por ganancia total generada.</div>
      <div class="grid md:grid-cols-2 gap-3">
        ${lideres.map(([name, L], idx) => {
          const ahorros = L.desviaciones.filter(d => d === 'ahorro').length;
          const sobres = L.desviaciones.filter(d => d === 'sobre').length;
          const desviacionPct = L.presup > 0 ? Math.round(((L.gastado - L.presup) / L.presup) * 100) : 0;
          const isTop = idx === 0;
          return `
            <div class="border ${isTop?'border-emerald-400 bg-emerald-50':'border-slate-200'} rounded-xl p-3">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <div class="text-base font-bold">${isTop?'👑 ':''}${name}</div>
                  <div class="text-[11px] text-slate-500">${L.total} obras (${L.finalizadas} finalizadas, ${L.activas} activas)</div>
                </div>
                <div class="text-right">
                  <div class="text-lg font-bold ${L.ganancia >= 0 ? 'text-emerald-700' : 'text-red-700'}">$${Math.round(L.ganancia/1000)}K</div>
                  <div class="text-[10px] text-slate-500">ganancia total</div>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-slate-100">
                <div>
                  <div class="text-xs font-bold text-emerald-700">${ahorros}</div>
                  <div class="text-[9px] text-slate-500">ahorros</div>
                </div>
                <div>
                  <div class="text-xs font-bold ${desviacionPct > 0 ? 'text-red-600' : 'text-slate-600'}">${desviacionPct > 0 ? '+' : ''}${desviacionPct}%</div>
                  <div class="text-[9px] text-slate-500">desviación avg</div>
                </div>
                <div>
                  <div class="text-xs font-bold ${sobres > 0 ? 'text-red-600' : 'text-slate-400'}">${sobres}</div>
                  <div class="text-[9px] text-slate-500">sobre presup</div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── ALERTAS TAB ───
function rdRenderAlertas() {
  if (rdState.alerts.length === 0) {
    return '<div class="text-center py-16 text-emerald-600"><div class="text-5xl mb-3">✅</div><div class="font-bold">Sin alertas activas</div><div class="text-xs text-slate-500 mt-2">Todas las obras están dentro de parámetros.</div></div>';
  }
  const byType = {};
  rdState.alerts.forEach(a => { (byType[a.severity] = byType[a.severity] || []).push(a); });

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
                <div class="bg-white border border-slate-200 rounded p-2.5 hover:border-slate-400 cursor-pointer" onclick="rdOpenObra('${a.airtable_id}')">
                  <div class="font-bold text-sm">${a.title}</div>
                  <div class="text-[11px] text-slate-600 mt-0.5">${a.detail || ''}</div>
                  <div class="flex items-center gap-2 mt-1.5">
                    <span class="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded">${a.alert_type}</span>
                    <span class="text-[9px] text-slate-400">${new Date(a.detected_at).toLocaleString('es-MX')}</span>
                    <button onclick="event.stopPropagation(); rdResolveAlert('${a.id}')" class="ml-auto text-[10px] text-slate-500 hover:text-emerald-600">✓ Marcar resuelta</button>
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

async function rdResolveAlert(id) {
  await sb.from('remodel_alerts').update({ resolved_at: new Date().toISOString(), resolved_by: state.user.id }).eq('id', id);
  await rdLoadAll();
  rdRender();
}

// ─── TENDENCIAS TAB ───
async function rdRenderTendencias() {
  // Pull snapshots de últimas 8 semanas (resumido por semana)
  // Por ahora simple: muestra últimos 14 días agregados
  setTimeout(async () => {
    const cutoff = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
    const { data } = await sb.from('remodel_snapshots')
      .select('snapshot_date,gasto_total,avance_pct')
      .gte('snapshot_date', cutoff)
      .order('snapshot_date');
    const byDate = {};
    (data || []).forEach(s => {
      if (!byDate[s.snapshot_date]) byDate[s.snapshot_date] = { gasto: 0, avgAvance: 0, count: 0 };
      byDate[s.snapshot_date].gasto += s.gasto_total || 0;
      byDate[s.snapshot_date].avgAvance += s.avance_pct || 0;
      byDate[s.snapshot_date].count++;
    });
    const dates = Object.keys(byDate).sort();
    const container = document.getElementById('rd-trend-data');
    if (!container) return;
    container.innerHTML = dates.length === 0
      ? '<div class="text-center py-8 text-slate-400">Sin snapshots históricos todavía. Hacé sync cada día para acumular tendencias.</div>'
      : `
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr><th class="text-left p-2">Fecha</th><th class="text-right p-2">Gasto total</th><th class="text-right p-2">Avance avg</th><th class="text-right p-2">Obras</th></tr>
            </thead>
            <tbody>
              ${dates.map(d => {
                const x = byDate[d];
                const avg = Math.round(x.avgAvance / x.count);
                return `<tr class="border-t border-slate-100">
                  <td class="p-2">${d}</td>
                  <td class="p-2 text-right">$${Math.round(x.gasto).toLocaleString()}</td>
                  <td class="p-2 text-right">${avg}%</td>
                  <td class="p-2 text-right">${x.count}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
  }, 50);

  return `
    <div class="space-y-3">
      <div class="text-xs text-slate-600">Series de los últimos 30 días. Hace falta sync diario para que acumule data.</div>
      <div id="rd-trend-data" class="border border-slate-200 rounded-xl p-3">Cargando...</div>
      <div class="bg-violet-50 border border-violet-200 rounded-xl p-3">
        <div class="text-xs font-bold text-violet-900 uppercase mb-2">🧠 Análisis IA semanal (próximamente)</div>
        <div class="text-xs text-violet-800">Cada lunes se generará un resumen narrativo del portfolio con recomendaciones. Falta la edge function de IA semanal — se activa con tus reportes históricos como contexto.</div>
      </div>
    </div>
  `;
}

// ─── DRILL-DOWN POR OBRA ───
async function rdOpenObra(airtable_id) {
  const p = rdState.properties.find(x => x.airtable_id === airtable_id);
  if (!p) return;

  const { data: history } = await sb.from('remodel_snapshots')
    .select('*')
    .eq('airtable_id', airtable_id)
    .order('snapshot_date', { ascending: true });

  const cost = (p.gasto_materiales||0) + (p.gasto_trabajadores||0);
  const presup = p.presupuesto_interno || 0;
  const remaining = presup - cost;
  const matPct = (p.gasto_materiales||0)+(p.gasto_trabajadores||0) > 0 ? Math.round((p.gasto_materiales||0) / ((p.gasto_materiales||0)+(p.gasto_trabajadores||0)) * 100) : 0;

  const latestSnap = (history || [])[history.length-1];
  const obraAlerts = rdState.alerts.filter(a => a.airtable_id === airtable_id);

  const html = `
    <div class="space-y-3">
      <!-- Header -->
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <div class="text-[10px] uppercase text-slate-400 font-bold">${p.proceso || 'Sin estado'}</div>
        <div class="text-lg font-bold">${p.address}</div>
        <div class="text-xs text-slate-300 mt-1">Líder: ${p.lider || '—'} · Ciudad: ${p.city || '—'}</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">Avance</div>
            <div class="text-xl font-bold">${p.avance_pct || 0}%</div>
          </div>
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">Gastado</div>
            <div class="text-base font-bold">$${Math.round(cost).toLocaleString()}</div>
            <div class="text-[9px] text-slate-400">$${Math.round(remaining).toLocaleString()} restante</div>
          </div>
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">SPI / CPI</div>
            <div class="text-base font-bold">${latestSnap?.spi?.toFixed(2) || '—'} / ${latestSnap?.cpi?.toFixed(2) || '—'}</div>
          </div>
          <div class="bg-slate-700/50 rounded p-2">
            <div class="text-[10px] text-slate-400 uppercase">Ganancia esperada</div>
            <div class="text-base font-bold ${(p.ganancia||0)>=0?'text-emerald-300':'text-red-300'}">$${Math.round(p.ganancia||0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <!-- Costos breakdown -->
      <div class="grid md:grid-cols-2 gap-3">
        <div class="border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">💰 Costos reales</div>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between"><span>🧱 Materiales</span><span class="font-bold">$${Math.round(p.gasto_materiales||0).toLocaleString()} <span class="text-slate-400">(${matPct}%)</span></span></div>
            <div class="flex justify-between"><span>👷 Trabajadores</span><span class="font-bold">$${Math.round(p.gasto_trabajadores||0).toLocaleString()} <span class="text-slate-400">(${100-matPct}%)</span></span></div>
            <div class="flex justify-between border-t pt-1"><span>Total real</span><span class="font-bold">$${Math.round(cost).toLocaleString()}</span></div>
            <div class="flex justify-between"><span>Presupuesto</span><span class="text-slate-500">$${Math.round(presup).toLocaleString()}</span></div>
            <div class="flex justify-between"><span>Valor cliente</span><span class="text-slate-500">$${Math.round(p.valor_cliente||0).toLocaleString()}</span></div>
          </div>
        </div>
        <div class="border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">📅 Cronograma</div>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between"><span>Inicio</span><span>${p.fecha_inicio || '—'}</span></div>
            <div class="flex justify-between"><span>Fin estimado</span><span>${p.fecha_estimada_fin || '—'}</span></div>
            <div class="flex justify-between"><span>Fin real</span><span>${p.fecha_real_fin || '—'}</span></div>
            ${p.dias_transcurridos ? `<div class="text-[10px] text-slate-500 italic mt-2">${p.dias_transcurridos}</div>` : ''}
            ${latestSnap?.burn_rate ? `<div class="text-[11px] mt-2 pt-1 border-t"><strong>Burn rate:</strong> $${Math.round(latestSnap.burn_rate)}/día · <strong>Proyectado:</strong> $${Math.round(latestSnap.proyeccion_costo_final||0).toLocaleString()}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Histórico -->
      ${(history && history.length) ? `
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase">📈 Histórico de snapshots (${history.length})</div>
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr><th class="text-left p-2">Fecha</th><th class="text-right p-2">Avance</th><th class="text-right p-2">Gastado</th><th class="text-right p-2">SPI</th><th class="text-right p-2">CPI</th><th class="text-left p-2">Flags</th></tr>
            </thead>
            <tbody>
              ${history.slice(-20).map(s => `
                <tr class="border-t border-slate-100">
                  <td class="p-2">${s.snapshot_date}</td>
                  <td class="p-2 text-right">${s.avance_pct || 0}%</td>
                  <td class="p-2 text-right">$${Math.round(s.gasto_total||0).toLocaleString()}</td>
                  <td class="p-2 text-right">${s.spi != null ? s.spi.toFixed(2) : '—'}</td>
                  <td class="p-2 text-right">${s.cpi != null ? s.cpi.toFixed(2) : '—'}</td>
                  <td class="p-2 text-[10px]">${(s.flags||[]).map(f=>`<span class="bg-red-100 text-red-700 px-1 rounded mr-0.5">${f}</span>`).join('')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="text-center text-slate-400 text-xs py-4">Sin snapshots históricos. Sincronizá cada día para acumular tendencia.</div>'}

      <!-- Alertas de esta obra -->
      ${obraAlerts.length ? `
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-red-900 mb-2">🚨 Alertas activas</div>
          ${obraAlerts.map(a => `<div class="text-xs"><strong>${a.title}</strong> — ${a.detail}</div>`).join('')}
        </div>
      ` : ''}

      <div class="flex gap-2">
        ${p.fotos_url ? `<a href="${p.fotos_url}" target="_blank" class="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs py-2 rounded text-center font-bold">📷 Ver fotos en Drive</a>` : ''}
        <button onclick="closeModal(); setTimeout(()=>openRemodelDashboard(rdState.sys), 100)" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">← Volver al dashboard</button>
      </div>
    </div>
  `;
  openModal(`🏗️ ${p.address}`, html);
  document.querySelector('#modal > div').classList.remove('max-w-7xl');
  document.querySelector('#modal > div').classList.add('max-w-5xl');
}
