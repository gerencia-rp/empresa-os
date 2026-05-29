// ============================================================
// REMODEL DASHBOARD — KPIs + alertas + snapshots históricos
// Conectado a Airtable via edge function `sync-remodel-airtable`
// ============================================================

const rdState = {
  sys: null,
  properties: [],
  alerts: [],
  syncLog: null,
  tab: 'portfolio',          // portfolio | obras | lideres | alertas | tendencias | insights
  selectedAirtableId: null,  // para drill-down de obra
  obraHistory: [],
  loading: false,
  // S7-D: acciones requeridas persistentes + filtros tab Obras + insights IA
  requiredActions: [],
  obrasFilter: { lider: 'all', status: 'all', search: '' },
  weeklyInsights: []
};

const RD_FN_URL = `${window.SUPABASE_URL}/functions/v1/sync-remodel-airtable`;

// Benchmarks Austin TX (de la industria + tu informe interno)
const BENCHMARKS_AUSTIN = {
  margen_min: 20,        // % objetivo mínimo
  margen_max: 35,        // % rango sano
  margen_critico: 10,    // <10% = peligro
  labor_ratio_max: 60,   // % máximo de labor sobre total
  labor_ratio_gut: 53,   // benchmark gut renovation
  materiales_ratio_gut: 47,
  ejecucion_max: 100,    // % presupuesto no debe pasarse
  desviacion_critica: 10, // >10% sobre presupuesto = 🔴
  retraso_critico: 10,   // >10 días de retraso = 🔴
  retraso_advertencia: 5,
  discrepancia_min: 500, // diferencia valor_interno vs (mat+lab) que dispara alerta
};

// ─── KPIs avanzados por obra (replica el formato del informe ejecutivo) ───
function rdAdvancedKPIs(p) {
  const mat = +p.gasto_materiales || 0;
  const lab = +p.gasto_trabajadores || 0;
  const totalCost = mat + lab;
  const presup = +p.presupuesto_interno || 0;
  const valor_interno = +p.valor_interno || 0;
  const cliente = +p.valor_cliente || 0;
  const avance = +p.avance_pct || 0;
  const ganancia = +p.ganancia || (cliente - totalCost);

  // Eficiencia gasto: % real vs lo esperado al punto de avance
  // Esperado al X% avance = presup × (avance/100)
  // Eficiencia = real / esperado → <100% es bueno (gastaste menos de lo presupuestado para tu avance)
  let eficiencia_gasto = null;
  if (presup > 0 && avance > 0) {
    const esperado = presup * (avance / 100);
    if (esperado > 0) eficiencia_gasto = Math.round(totalCost / esperado * 100);
  }

  // Ratio labor / costo
  const labor_ratio = totalCost > 0 ? Math.round(lab / totalCost * 100) : null;
  const materiales_ratio = totalCost > 0 ? Math.round(mat / totalCost * 100) : null;
  const labor_delta_benchmark = labor_ratio != null ? labor_ratio - BENCHMARKS_AUSTIN.labor_ratio_gut : null;

  // Ejecución presupuestal
  const ejecucion_pct = presup > 0 ? Math.round(totalCost / presup * 100 * 10) / 10 : null;
  const faltante_por_gastar = presup - totalCost;

  // Sobre/bajo presupuesto
  const sobre_presupuesto_pct = presup > 0 ? Math.round((totalCost - presup) / presup * 100 * 10) / 10 : null;

  // Margen sobre venta
  const margen_venta = cliente > 0 ? Math.round((cliente - totalCost) / cliente * 100 * 10) / 10 : null;

  // Días de retraso
  let dias_retraso = null;
  const hoy = new Date();
  if (p.fecha_estimada_fin) {
    const finEst = new Date(p.fecha_estimada_fin);
    if (p.proceso === 'Finalizado' && p.fecha_real_fin) {
      const finReal = new Date(p.fecha_real_fin);
      dias_retraso = Math.round((finReal - finEst) / 86400000);
    } else if (avance < 100) {
      dias_retraso = Math.round((hoy - finEst) / 86400000);
    }
  }

  // Discrepancia valor_interno vs (mat+lab) — valor_interno típicamente lleva markup +5%, pero si la diferencia es muy distinta del esperado, hay error
  // Esperado: valor_interno ≈ totalCost × 1.05
  let discrepancia = null;
  if (valor_interno > 0 && totalCost > 0) {
    const esperado_interno = totalCost * 1.05;
    discrepancia = Math.round((valor_interno - esperado_interno) * 100) / 100;
  }

  // Status semáforo
  const flags = [];
  if (sobre_presupuesto_pct != null && sobre_presupuesto_pct > BENCHMARKS_AUSTIN.desviacion_critica) flags.push('sobre_presupuesto_critico');
  if (labor_ratio != null && labor_ratio > BENCHMARKS_AUSTIN.labor_ratio_max) flags.push('labor_alto');
  if (dias_retraso != null && dias_retraso > BENCHMARKS_AUSTIN.retraso_critico) flags.push('retraso_critico');
  if (margen_venta != null && margen_venta < BENCHMARKS_AUSTIN.margen_critico) flags.push('margen_critico');
  if (discrepancia != null && Math.abs(discrepancia) > BENCHMARKS_AUSTIN.discrepancia_min) flags.push('discrepancia_cifras');

  // Estado global
  let estado = 'sano';
  if (flags.some(f => f.includes('critico') || f === 'discrepancia_cifras')) estado = 'critico';
  else if (flags.length > 0) estado = 'advertencia';

  return {
    totalCost, eficiencia_gasto, labor_ratio, materiales_ratio, labor_delta_benchmark,
    ejecucion_pct, faltante_por_gastar, sobre_presupuesto_pct, margen_venta,
    dias_retraso, discrepancia, ganancia, flags, estado
  };
}

// ─── Acciones requeridas computadas por obra ───
function rdAccionesRequeridas(p, kpis) {
  const acciones = [];
  if (kpis.flags.includes('retraso_critico')) {
    acciones.push({ titulo: 'URGENTE: Coordinar cierre inmediato', responsable: p.lider || 'Líder', razon: `${kpis.dias_retraso} días de retraso` });
  }
  if (kpis.flags.includes('sobre_presupuesto_critico')) {
    acciones.push({ titulo: 'Revisar sobrecostos con líder', responsable: 'Administración', razon: `+${kpis.sobre_presupuesto_pct}% sobre presupuesto` });
  }
  if (kpis.flags.includes('labor_alto')) {
    acciones.push({ titulo: 'Auditar horas de cuadrilla', responsable: 'Daniel / ' + (p.lider || 'Líder'), razon: `Labor ${kpis.labor_ratio}% (benchmark ${BENCHMARKS_AUSTIN.labor_ratio_gut}%)` });
  }
  if (kpis.flags.includes('discrepancia_cifras')) {
    acciones.push({ titulo: `Reconciliar cifras (diferencia $${Math.abs(kpis.discrepancia).toLocaleString()})`, responsable: 'Michell', razon: 'Valor interno reportado no coincide con costo real' });
  }
  if (kpis.flags.includes('margen_critico')) {
    acciones.push({ titulo: 'Revisar viabilidad del proyecto', responsable: 'Nicolas', razon: `Margen ${kpis.margen_venta}% (objetivo ${BENCHMARKS_AUSTIN.margen_min}-${BENCHMARKS_AUSTIN.margen_max}%)` });
  }
  return acciones;
}

async function openRemodelDashboard(sys) {
  rdState.sys = sys;
  openModal(`📊 ${sys.name}`, '<div id="rd-root">Cargando...</div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  await rdLoadAll();
  rdRender();
}

async function rdLoadAll() {
  const [p, a, l, ra, wi, names] = await Promise.all([
    sb.from('remodel_at_properties').select('*').order('proceso').order('avance_pct', { ascending: true }),
    sb.from('remodel_alerts').select('*').is('resolved_at', null).order('severity').order('detected_at', { ascending: false }),
    sb.from('remodel_sync_log').select('*').order('synced_at', { ascending: false }).limit(1),
    sb.from('remodel_required_actions').select('*').neq('status', 'done').order('due_date', { ascending: true }).then(r => r.data || []).catch(() => []),
    sb.from('remodel_weekly_insights').select('*').order('week_start', { ascending: false }).limit(8).then(r => r.data || []).catch(() => []),
    sb.from('airtable_record_names').select('record_id, name').then(r => r.data || []).catch(() => [])
  ]);
  rdState.properties = p.data || [];
  rdState.alerts = a.data || [];
  rdState.syncLog = (l.data && l.data[0]) || null;
  rdState.requiredActions = ra;
  rdState.weeklyInsights = wi;
  // S7-Fix · cache id → nombre para resolver linked records que vinieron antes del fix
  rdState.airtableNames = {};
  (names || []).forEach(n => { rdState.airtableNames[n.record_id] = n.name; });
  // Aplicar resolución a las propiedades cargadas (no toca DB)
  rdState.properties.forEach(p => {
    p.lider = rdResolveAirtableName(p.lider);
  });
}

// S7-Fix · resuelve string que puede ser un Airtable recID a nombre legible
function rdResolveAirtableName(v) {
  if (!v) return v;
  // Si ya es texto legible, retornar tal cual
  if (typeof v !== 'string') return v;
  // ¿Parece un recID Airtable?
  if (/^rec[A-Za-z0-9]{14,}$/.test(v)) {
    return (rdState.airtableNames && rdState.airtableNames[v]) || v;
  }
  // String con coma (varios IDs)
  if (v.includes(',')) {
    return v.split(',').map(s => rdResolveAirtableName(s.trim())).join(', ');
  }
  return v;
}

// S7-D: Materializa las acciones requeridas (calculadas client-side) en la tabla persistente
async function rdMaterializeActions() {
  if (!confirm('Generar / actualizar las acciones requeridas en la tabla persistente?\n\nVa a recorrer todas las obras activas, calcular acciones según KPIs y guardarlas (skip duplicados).')) return;
  const active = rdState.properties.filter(p => p.proceso !== 'Finalizado' && p.proceso);
  let inserted = 0;
  for (const p of active) {
    const k = rdAdvancedKPIs(p);
    const acciones = rdAccionesRequeridas(p, k);
    for (const a of acciones) {
      // Categoría según el contenido
      let cat = 'otro';
      if (a.titulo.toLowerCase().includes('cierre') || a.titulo.toLowerCase().includes('retraso')) cat = 'retraso';
      else if (a.titulo.toLowerCase().includes('sobrecost')) cat = 'sobrepresupuesto';
      else if (a.titulo.toLowerCase().includes('horas') || a.titulo.toLowerCase().includes('cuadrilla')) cat = 'labor_alto';
      else if (a.titulo.toLowerCase().includes('reconciliar') || a.titulo.toLowerCase().includes('cifras')) cat = 'discrepancia';
      else if (a.titulo.toLowerCase().includes('margen') || a.titulo.toLowerCase().includes('viabilidad')) cat = 'margen';

      const { error } = await sb.from('remodel_required_actions').insert({
        airtable_id: p.airtable_id,
        title: a.titulo,
        detail: a.razon,
        category: cat,
        responsable: a.responsable,
        status: 'pending',
        source: 'auto',
        created_by: state.user.id
      });
      if (!error) inserted++;
    }
  }
  alert(`✅ ${inserted} acciones generadas. Ver tab "📋 Acciones".`);
  await rdLoadAll();
  rdRender();
}

async function rdActionToggleStatus(id, newStatus) {
  const upd = { status: newStatus };
  if (newStatus === 'done') {
    upd.completed_at = new Date().toISOString();
    upd.completed_by = state.user.id;
  }
  await sb.from('remodel_required_actions').update(upd).eq('id', id);
  await rdLoadAll();
  rdRender();
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
        <div class="flex items-center gap-1.5 flex-wrap">
          ${['portfolio','informe','obras','lideres','alertas','acciones','tendencias','insights'].map(t => `
            <button onclick="rdSetTab('${t}')" class="px-2.5 py-1.5 rounded text-xs font-bold ${rdState.tab===t?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
              ${t==='portfolio'?'📊 Portfolio':t==='informe'?'📑 Informe':t==='obras'?'🏗️ Obras':t==='lideres'?'👷 Líderes':t==='alertas'?'🚨 Alertas':t==='acciones'?'📋 Acciones':t==='tendencias'?'📈 Tendencias':'🧠 Insights IA'}
              ${t==='alertas' && rdState.alerts.length ? `<span class="ml-1 bg-red-600 text-white px-1.5 rounded">${rdState.alerts.length}</span>` : ''}
              ${t==='acciones' && rdState.requiredActions.length ? `<span class="ml-1 bg-amber-600 text-white px-1.5 rounded">${rdState.requiredActions.length}</span>` : ''}
              ${t==='insights' && rdState.weeklyInsights.length ? `<span class="ml-1 bg-violet-600 text-white px-1.5 rounded">${rdState.weeklyInsights.length}</span>` : ''}
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
          rdState.tab === 'informe' ? rdRenderInforme(active, finalizada) :
          rdState.tab === 'obras' ? rdRenderObras(active, finalizada, sinAsignar) :
          rdState.tab === 'lideres' ? rdRenderLideres() :
          rdState.tab === 'alertas' ? rdRenderAlertas() :
          rdState.tab === 'acciones' ? rdRenderAcciones() :
          rdState.tab === 'insights' ? rdRenderInsights() :
          rdRenderTendencias()}
      </div>
    </div>
  `;
}

function rdSetTab(t) { rdState.tab = t; rdRender(); }

// ─── PORTFOLIO TAB ───
// Análisis profundo del histórico (21 finalizadas) por líder
function rdHistoricalInsights(finalizada) {
  const byLider = {};
  finalizada.forEach(p => {
    if (!p.lider) return;
    if (!byLider[p.lider]) byLider[p.lider] = { obras: [], total_gastado: 0, total_cliente: 0, total_ganancia: 0, total_mat: 0, total_lab: 0, dias: [], sobrepresup: 0 };
    const L = byLider[p.lider];
    L.obras.push(p);
    L.total_gastado += (+p.gasto_materiales||0) + (+p.gasto_trabajadores||0);
    L.total_cliente += +p.valor_cliente || 0;
    L.total_ganancia += +p.ganancia || 0;
    L.total_mat += +p.gasto_materiales || 0;
    L.total_lab += +p.gasto_trabajadores || 0;
    const presup = +p.presupuesto_interno || 0;
    const real = (+p.gasto_materiales||0) + (+p.gasto_trabajadores||0);
    if (presup > 0 && real > presup) L.sobrepresup++;
    if (p.fecha_inicio && p.fecha_real_fin) {
      const d = Math.round((new Date(p.fecha_real_fin) - new Date(p.fecha_inicio)) / 86400000);
      if (d > 0 && d < 1000) L.dias.push(d);
    }
  });
  return Object.entries(byLider).map(([name, L]) => ({
    name,
    obras: L.obras.length,
    ganancia: L.total_ganancia,
    margen: L.total_cliente > 0 ? Math.round(L.total_ganancia / L.total_cliente * 100) : 0,
    ratio_lab: L.total_gastado > 0 ? Math.round(L.total_lab / L.total_gastado * 100) : 0,
    avg_dias: L.dias.length ? Math.round(L.dias.reduce((s,x)=>s+x,0) / L.dias.length) : null,
    max_dias: L.dias.length ? Math.max(...L.dias) : null,
    sobrepresup: L.sobrepresup,
    ganancia_por_obra: L.obras.length ? Math.round(L.total_ganancia / L.obras.length) : 0,
    obras_lista: L.obras
  })).sort((a,b) => b.ganancia - a.ganancia);
}

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
  const totalGastado = active.reduce((s,p) => s + (+p.gasto_materiales||0) + (+p.gasto_trabajadores||0), 0);
  const totalPresup = active.reduce((s,p) => s + (+p.presupuesto_interno||0), 0);
  const totalPipeline = active.reduce((s,p) => s + ((+p.valor_cliente||0) - (+p.presupuesto_interno||0)), 0);
  const avgAvance = active.length ? Math.round(active.reduce((s,p) => s + (+p.avance_pct||0), 0) / active.length) : 0;
  const totalGananciaCerrada = finalizada.reduce((s,p) => s + (+p.ganancia||0), 0);
  const totalClienteHist = finalizada.reduce((s,p) => s + (+p.valor_cliente||0), 0);
  const totalGastadoHist = finalizada.reduce((s,p) => s + (+p.gasto_materiales||0) + (+p.gasto_trabajadores||0), 0);
  const margenHist = totalClienteHist > 0 ? Math.round(totalGananciaCerrada / totalClienteHist * 100) : 0;
  const matHist = finalizada.reduce((s,p) => s + (+p.gasto_materiales||0), 0);
  const labHist = finalizada.reduce((s,p) => s + (+p.gasto_trabajadores||0), 0);
  const matPctHist = (matHist+labHist) > 0 ? Math.round(matHist/(matHist+labHist)*100) : 0;
  const matSum = active.reduce((s,p) => s + (+p.gasto_materiales||0), 0);
  const labSum = active.reduce((s,p) => s + (+p.gasto_trabajadores||0), 0);
  const matPct = (matSum+labSum) > 0 ? Math.round(matSum/(matSum+labSum)*100) : 0;

  const lideres = rdHistoricalInsights(finalizada);

  // Critical alerts
  const criticalAlerts = rdState.alerts.filter(a => a.severity === 'critical');

  return `
    <div class="space-y-4">
      <!-- KPIs principales -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-emerald-600 text-white rounded-xl p-4">
          <div class="text-[10px] text-emerald-200 uppercase font-bold">Ganancia histórica</div>
          <div class="text-3xl font-bold">$${Math.round(totalGananciaCerrada/1000)}K</div>
          <div class="text-[10px] text-emerald-200 mt-1">${finalizada.length} obras cerradas · margen ${margenHist}%</div>
        </div>
        <div class="bg-slate-900 text-white rounded-xl p-4">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Obras activas</div>
          <div class="text-3xl font-bold">${active.length}</div>
          <div class="text-[10px] text-slate-400 mt-1">${avgAvance}% avance promedio</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div class="text-[10px] text-blue-700 uppercase font-bold">Capital en obra ahora</div>
          <div class="text-3xl font-bold text-blue-900">$${Math.round(totalGastado/1000)}K</div>
          <div class="text-[10px] text-blue-700 mt-1">de $${Math.round(totalPresup/1000)}K presup (${totalPresup?Math.round(totalGastado/totalPresup*100):0}%) · ${matPct}/${100-matPct} mat/lab</div>
        </div>
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div class="text-[10px] text-violet-700 uppercase font-bold">Pipeline ganancia</div>
          <div class="text-3xl font-bold text-violet-900">$${Math.round(totalPipeline/1000)}K</div>
          <div class="text-[10px] text-violet-700 mt-1">cuando cierren las ${active.length} activas</div>
        </div>
      </div>

      <!-- Insights del histórico -->
      ${finalizada.length > 0 ? rdRenderHistoricalPanel(lideres, totalGastadoHist, totalClienteHist, matPctHist) : ''}

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

// ─── Panel de Insights del Histórico ───
function rdRenderHistoricalPanel(lideres, totalGastadoHist, totalClienteHist, matPctHist) {
  // Detectar líderes problemáticos y top
  const bottom = lideres.filter(l => l.obras >= 3 && l.margen < 10);
  const top = lideres.filter(l => l.obras >= 2 && l.margen >= 25);
  const promedioMargen = lideres.reduce((s,l) => s + l.margen * l.obras, 0) / lideres.reduce((s,l) => s + l.obras, 0);

  return `
    <div class="border-2 border-violet-300 bg-violet-50/30 rounded-xl p-4 space-y-3">
      <div class="text-sm font-bold uppercase text-violet-900">🧠 Insights del Histórico — ${lideres.reduce((s,l)=>s+l.obras,0)} obras finalizadas</div>

      <!-- Resumen del portfolio histórico -->
      <div class="grid md:grid-cols-3 gap-2 text-xs">
        <div class="bg-white rounded p-2">
          <div class="text-[10px] text-slate-500 uppercase">Inversión histórica</div>
          <div class="text-base font-bold">$${Math.round(totalGastadoHist/1000)}K</div>
          <div class="text-[10px] text-slate-500">${matPctHist}% materiales / ${100-matPctHist}% trabajadores</div>
        </div>
        <div class="bg-white rounded p-2">
          <div class="text-[10px] text-slate-500 uppercase">Revenue cliente histórico</div>
          <div class="text-base font-bold">$${Math.round(totalClienteHist/1000)}K</div>
          <div class="text-[10px] text-slate-500">Margen ponderado: ${Math.round(promedioMargen)}%</div>
        </div>
        <div class="bg-white rounded p-2">
          <div class="text-[10px] text-slate-500 uppercase">Ratio mat/lab</div>
          <div class="text-base font-bold ${matPctHist >= 40 && matPctHist <= 55 ? 'text-emerald-700' : 'text-amber-700'}">${matPctHist}% / ${100-matPctHist}%</div>
          <div class="text-[10px] text-slate-500">Benchmark gut: 47/53 ${matPctHist >= 40 && matPctHist <= 55 ? '✅' : '⚠️'}</div>
        </div>
      </div>

      <!-- Alertas de líderes problemáticos -->
      ${bottom.length > 0 ? `
        <div class="bg-red-50 border border-red-300 rounded p-2">
          <div class="text-xs font-bold text-red-900 mb-1">🚨 Líderes con margen bajo (< 10%, ≥3 obras)</div>
          ${bottom.map(l => `
            <div class="text-xs">
              <strong>${l.name}</strong> · ${l.obras} obras · <span class="text-red-700 font-bold">margen ${l.margen}%</span> ·
              ganancia total $${Math.round(l.ganancia/1000)}K · <span class="text-slate-500">$${Math.round(l.ganancia_por_obra/1000)}K/obra</span>
              ${l.sobrepresup > 0 ? ` · <span class="text-red-700">${l.sobrepresup} sobre-presup</span>` : ''}
            </div>
          `).join('')}
          <div class="text-[10px] text-red-700 mt-1 italic">Recomendación: revisar metodología de estimación y control de horas con este líder. Considerar asignar obras más simples o pair-up con líder top.</div>
        </div>
      ` : ''}

      ${top.length > 0 ? `
        <div class="bg-emerald-50 border border-emerald-300 rounded p-2">
          <div class="text-xs font-bold text-emerald-900 mb-1">👑 Líderes top (margen ≥25%)</div>
          ${top.map(l => `
            <div class="text-xs">
              <strong>${l.name}</strong> · ${l.obras} obras · <span class="text-emerald-700 font-bold">margen ${l.margen}%</span> ·
              ganancia $${Math.round(l.ganancia/1000)}K · <span class="text-slate-500">$${Math.round(l.ganancia_por_obra/1000)}K/obra promedio</span>
              ${l.avg_dias ? ` · ${l.avg_dias}d/obra` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Tabla completa por líder -->
      <details class="bg-white rounded border border-violet-200">
        <summary class="cursor-pointer p-2 text-xs font-bold hover:bg-violet-50">📊 Performance detallada por líder (click)</summary>
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left p-2">Líder</th>
              <th class="text-right p-2">Obras</th>
              <th class="text-right p-2">Ganancia</th>
              <th class="text-right p-2">Margen</th>
              <th class="text-right p-2">$/obra</th>
              <th class="text-right p-2">Días/obra</th>
              <th class="text-right p-2">Labor%</th>
              <th class="text-right p-2">Sobre-presup</th>
            </tr>
          </thead>
          <tbody>
            ${lideres.map(l => `
              <tr class="border-t border-slate-100 ${l.margen < 10 ? 'bg-red-50/50' : l.margen >= 25 ? 'bg-emerald-50/50' : ''}">
                <td class="p-2 font-semibold">${l.name}</td>
                <td class="p-2 text-right">${l.obras}</td>
                <td class="p-2 text-right ${l.ganancia >= 0 ? 'text-emerald-700' : 'text-red-700'} font-semibold">$${Math.round(l.ganancia/1000)}K</td>
                <td class="p-2 text-right font-bold ${l.margen >= 25 ? 'text-emerald-700' : l.margen < 10 ? 'text-red-700' : 'text-amber-700'}">${l.margen}%</td>
                <td class="p-2 text-right">$${Math.round(l.ganancia_por_obra/1000)}K</td>
                <td class="p-2 text-right ${l.max_dias > 200 ? 'text-red-700' : ''}">${l.avg_dias != null ? l.avg_dias + 'd' : '—'}${l.max_dias != null && l.max_dias !== l.avg_dias ? ` <span class="text-[9px] text-slate-400">(max ${l.max_dias}d)</span>` : ''}</td>
                <td class="p-2 text-right ${l.ratio_lab > 60 ? 'text-red-700' : ''}">${l.ratio_lab}%</td>
                <td class="p-2 text-right ${l.sobrepresup > 0 ? 'text-amber-700 font-bold' : ''}">${l.sobrepresup}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </details>
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

// ════════════════════════════════════════════════════════════
// 📑 INFORME EJECUTIVO — replica el formato del PDF interno
// ════════════════════════════════════════════════════════════
function rdRenderInforme(active, finalizada) {
  // Calcular KPIs avanzados de todas las obras activas
  const activeKpis = active.map(p => ({ p, k: rdAdvancedKPIs(p), acciones: rdAccionesRequeridas(p, rdAdvancedKPIs(p)) }));
  const criticas = activeKpis.filter(x => x.k.estado === 'critico');
  const advertencias = activeKpis.filter(x => x.k.estado === 'advertencia');
  const sanas = activeKpis.filter(x => x.k.estado === 'sano');

  // Portfolio totals
  const totalReal = active.reduce((s,p) => s + (+p.gasto_materiales||0) + (+p.gasto_trabajadores||0), 0);
  const totalMat = active.reduce((s,p) => s + (+p.gasto_materiales||0), 0);
  const totalLab = active.reduce((s,p) => s + (+p.gasto_trabajadores||0), 0);
  const totalPresup = active.reduce((s,p) => s + (+p.presupuesto_interno||0), 0);
  const totalCliente = active.reduce((s,p) => s + (+p.valor_cliente||0), 0);
  const gananciaPipeline = totalCliente - totalReal;
  const margenGlobal = totalCliente > 0 ? Math.round((totalCliente - totalReal) / totalCliente * 100 * 10) / 10 : 0;
  const ratioLaborGlobal = totalReal > 0 ? Math.round(totalLab / totalReal * 100) : 0;
  const ejecucionGlobal = totalPresup > 0 ? Math.round(totalReal / totalPresup * 100 * 10) / 10 : 0;
  const gananciaHistorica = finalizada.reduce((s,p) => s + (+p.ganancia||0), 0);

  // Métricas operativas
  const enPlazo = activeKpis.filter(x => (x.k.dias_retraso||0) <= 0).length;
  const vencidos = activeKpis.filter(x => (x.k.dias_retraso||0) > 0).length;
  const sobrecosto = activeKpis.filter(x => x.k.sobre_presupuesto_pct > 0).length;
  const enPerdida = activeKpis.filter(x => (x.k.margen_venta||100) < 0).length;

  const hoy = new Date();
  const fechaStr = hoy.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Resumen ejecutivo automático
  let estadoPortfolio = '✅ PORTAFOLIO RENTABLE';
  if (margenGlobal < BENCHMARKS_AUSTIN.margen_critico) estadoPortfolio = '🔴 PORTAFOLIO EN RIESGO';
  else if (criticas.length > 0) estadoPortfolio = '⚠️ PORTAFOLIO CON ALERTAS CRÍTICAS';
  let prioridad1 = 'Mantener disciplina de registro semanal';
  let accionSistemica = 'Mantener registro diario en Airtable';
  if (criticas.length > 0) {
    const peor = criticas[0];
    prioridad1 = `Atender ${peor.p.address} (${peor.k.flags.join(', ')})`;
  }
  if (ratioLaborGlobal > BENCHMARKS_AUSTIN.labor_ratio_max) {
    accionSistemica = `Reducir ratio labor portfolio (${ratioLaborGlobal}% vs ${BENCHMARKS_AUSTIN.labor_ratio_max}% benchmark)`;
  }

  return `
    <div id="rd-informe-print" class="space-y-3">
      <!-- Toolbar print -->
      <div class="flex justify-end gap-2 print:hidden">
        <button onclick="rdPrintInforme()" class="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded font-bold">🖨️ Imprimir / Guardar PDF</button>
      </div>

      <!-- Header -->
      <div class="border-2 border-slate-900 rounded-lg p-4 bg-white">
        <div class="text-lg font-bold tracking-wide">INFORME EJECUTIVO DE REMODELACIÓN</div>
        <div class="text-xs text-slate-600 capitalize">${fechaStr}</div>
        <div class="text-xs text-slate-500 mt-1">Agua Construction Group · Structure One · Flipping Rentals</div>
      </div>

      <!-- Semáforo ejecutivo -->
      <div class="border-t-2 border-slate-200 pt-3">
        <div class="text-xs font-bold uppercase tracking-wide mb-2">━━ SEMÁFORO EJECUTIVO ━━</div>
        <div class="flex gap-4 text-sm font-bold">
          <span class="text-red-700">🔴 CRÍTICAS: ${criticas.length}</span>
          <span class="text-amber-700">🟡 ADVERTENCIAS: ${advertencias.length}</span>
          <span class="text-emerald-700">✅ SANOS: ${sanas.length}</span>
        </div>
        ${criticas.length ? `<div class="mt-2 space-y-0.5 text-xs">${criticas.map(x => `<div>🔴 <strong>${x.p.address}</strong> — ${x.k.flags.map(f => rdFlagLabel(f, x.k)).join(' · ')}</div>`).join('')}</div>` : ''}
      </div>

      <!-- KPIs Globales -->
      <div class="border-t-2 border-slate-200 pt-3">
        <div class="text-xs font-bold uppercase tracking-wide mb-2">━━ KPIs GLOBALES ━━</div>
        <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div>Proyectos activos: <strong>${active.length}</strong> | Finalizados: <strong>${finalizada.length}</strong></div>
          <div>Ratio labor/costo: <strong>${ratioLaborGlobal}% ${ratioLaborGlobal <= BENCHMARKS_AUSTIN.labor_ratio_max ? '✅ OK' : '⚠️ ALTO'}</strong></div>
          <div>Costo total ejecutado: <strong>$${Math.round(totalReal).toLocaleString()}</strong> (Mat: $${Math.round(totalMat).toLocaleString()} · Lab: $${Math.round(totalLab).toLocaleString()})</div>
          <div>Presupuesto total: <strong>$${Math.round(totalPresup).toLocaleString()}</strong> → Ejecución: <strong>${ejecucionGlobal}%</strong></div>
          <div>Valor total cliente: <strong>$${Math.round(totalCliente).toLocaleString()}</strong></div>
          <div>Margen global real: <strong>${margenGlobal > 0 ? '+' : ''}${margenGlobal}%</strong> ($${Math.round(gananciaPipeline).toLocaleString()} ganancia)</div>
          <div>Ganancia histórica acum.: <strong>$${Math.round(gananciaHistorica).toLocaleString()}</strong> (${finalizada.length} proyectos cerrados)</div>
        </div>
      </div>

      <!-- Métricas operativas -->
      <div class="border-t-2 border-slate-200 pt-3">
        <div class="text-xs font-bold uppercase tracking-wide mb-2">━━ MÉTRICAS OPERATIVAS ━━</div>
        <div class="grid grid-cols-4 gap-2 text-xs">
          <div>En plazo: <strong class="text-emerald-700">${enPlazo}/${active.length}</strong></div>
          <div>Vencidos: <strong class="${vencidos>0?'text-red-700':''}">${vencidos} ${vencidos>0?'⚠️':''}</strong></div>
          <div>En sobrecosto: <strong class="${sobrecosto>0?'text-amber-700':''}">${sobrecosto}</strong></div>
          <div>En pérdida: <strong class="${enPerdida>0?'text-red-700':''}">${enPerdida}</strong></div>
        </div>
      </div>

      <!-- Benchmarks vs industria -->
      <div class="border-t-2 border-slate-200 pt-3">
        <div class="text-xs font-bold uppercase tracking-wide mb-2">━━ BENCHMARKS vs INDUSTRIA AUSTIN TX ━━</div>
        <div class="grid grid-cols-1 gap-1 text-xs">
          <div>${margenGlobal >= BENCHMARKS_AUSTIN.margen_min ? '✅' : '🔴'} Margen neto objetivo — Referencia: ${BENCHMARKS_AUSTIN.margen_min}–${BENCHMARKS_AUSTIN.margen_max}% — Actual: <strong>${margenGlobal > 0 ? '+' : ''}${margenGlobal}%</strong></div>
          <div>${ratioLaborGlobal <= BENCHMARKS_AUSTIN.labor_ratio_max ? '✅' : '🔴'} Labor/costo máximo — Referencia: ≤${BENCHMARKS_AUSTIN.labor_ratio_max}% — Actual: <strong>${ratioLaborGlobal}%</strong></div>
          <div>${ejecucionGlobal <= BENCHMARKS_AUSTIN.ejecucion_max ? '✅' : '🔴'} Ejecución presupuestal — Referencia: ≤${BENCHMARKS_AUSTIN.ejecucion_max}% — Actual: <strong>${ejecucionGlobal}%</strong></div>
          <div>${enPerdida === 0 ? '✅' : '🔴'} Proyectos en pérdida — Referencia: 0 — Actual: <strong>${enPerdida}</strong></div>
          <div>${vencidos === 0 ? '✅' : (vencidos <= 1 ? '⚠️' : '🔴')} Proyectos vencidos — Referencia: ≤1 — Actual: <strong>${vencidos}</strong></div>
        </div>
      </div>

      <!-- Análisis detallado por proyecto -->
      <div class="border-t-2 border-slate-200 pt-3">
        <div class="text-xs font-bold uppercase tracking-wide mb-2">━━ ANÁLISIS DETALLADO POR PROYECTO ━━</div>
        ${activeKpis.length === 0 ? '<div class="text-xs text-slate-400">Sin proyectos activos</div>' :
          activeKpis.map((x, i) => rdRenderProyectoBloque(x, i+1)).join('')}
      </div>

      <!-- Resumen ejecutivo -->
      <div class="border-t-2 border-slate-200 pt-3">
        <div class="text-xs font-bold uppercase tracking-wide mb-2">━━ RESUMEN EJECUTIVO ━━</div>
        <div class="text-xs space-y-1">
          <div>Estado: <strong>${estadoPortfolio}</strong></div>
          <div>Prioridad #1: <strong>${prioridad1}</strong></div>
          <div>Acción sistémica: <strong>${accionSistemica}</strong></div>
        </div>
      </div>
    </div>
  `;
}

function rdFlagLabel(flag, k) {
  const map = {
    sobre_presupuesto_critico: `+${k.sobre_presupuesto_pct}% sobre presupuesto`,
    labor_alto: `Labor ${k.labor_ratio}% (max ${BENCHMARKS_AUSTIN.labor_ratio_max}%)`,
    retraso_critico: `${k.dias_retraso}d retraso`,
    margen_critico: `Margen ${k.margen_venta}% (min ${BENCHMARKS_AUSTIN.margen_critico}%)`,
    discrepancia_cifras: `Discrepancia $${Math.abs(k.discrepancia).toLocaleString()}`
  };
  return map[flag] || flag;
}

function rdRenderProyectoBloque(x, num) {
  const p = x.p, k = x.k;
  const estadoLabel = k.estado === 'critico' ? '🔴 ' + (k.dias_retraso>0?'VENCIDO':'CRÍTICO') :
                      k.estado === 'advertencia' ? '🟡 ADVERTENCIA' : '✅ SANO';
  const finInicio = p.fecha_inicio && p.fecha_estimada_fin
    ? `Inicio: ${p.fecha_inicio} → Entrega: ${p.fecha_estimada_fin} ${k.dias_retraso > 0 ? `(${k.dias_retraso} días de RETRASO)` : k.dias_retraso != null && k.dias_retraso < 0 ? `(${-k.dias_retraso} días restantes)` : ''}`
    : '';

  return `
    <div class="border border-slate-300 rounded-lg p-3 mb-2 ${k.estado==='critico'?'bg-red-50':k.estado==='advertencia'?'bg-amber-50':'bg-emerald-50/30'}">
      <div class="font-bold text-sm">┌─ PROYECTO ${num}: ${p.address?.toUpperCase() || '—'} ${estadoLabel}</div>
      <div class="text-xs text-slate-700 ml-2">│ Líder: ${p.lider || '—'} · ${p.city || ''}</div>
      ${finInicio ? `<div class="text-xs text-slate-700 ml-2">│ ${finInicio}</div>` : ''}
      <div class="ml-2 mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        <div>│ AVANCE: <strong>${rdBar(p.avance_pct || 0)} ${p.avance_pct || 0}%</strong></div>
        <div>│ Eficiencia gasto: <strong>${k.eficiencia_gasto != null ? k.eficiencia_gasto + '% del esperado' : '—'}</strong> ${k.eficiencia_gasto != null && k.eficiencia_gasto <= 100 ? '✅' : k.eficiencia_gasto > 120 ? '🔴' : ''}</div>
        <div class="col-span-2 border-t border-slate-200 my-1"></div>
        <div>│ Gasto Materiales: <strong>$${Math.round(p.gasto_materiales||0).toLocaleString()}</strong> (${k.materiales_ratio||0}% del costo)</div>
        <div>│ Gasto Trabajadores: <strong>$${Math.round(p.gasto_trabajadores||0).toLocaleString()}</strong> (${k.labor_ratio||0}% del costo)</div>
        <div class="col-span-2 border-t border-slate-200 my-1"></div>
        <div>│ Valor Interno (costo): <strong>$${Math.round(k.totalCost).toLocaleString()}</strong></div>
        <div>│ Presupuesto Interno: <strong>$${Math.round(p.presupuesto_interno||0).toLocaleString()}</strong></div>
        <div>│ Ejecución presupuestal: <strong>${k.ejecucion_pct != null ? k.ejecucion_pct + '%' : '—'}</strong> ${k.ejecucion_pct != null && k.ejecucion_pct <= 100 ? '✅' : '🔴'}</div>
        <div>│ Faltante por gastar: <strong>$${Math.round(k.faltante_por_gastar).toLocaleString()}</strong> ${k.faltante_por_gastar > 0 ? '✅ disponible' : '🔴 excedido'}</div>
        <div class="col-span-2 border-t border-slate-200 my-1"></div>
        <div>│ Valor Cliente: <strong>$${Math.round(p.valor_cliente||0).toLocaleString()}</strong></div>
        <div>│ Ganancia Real: <strong class="${k.ganancia>=0?'text-emerald-700':'text-red-700'}">$${Math.round(k.ganancia).toLocaleString()}</strong> ${k.ganancia >= 0 ? '✅ GANANCIA' : '🔴 PÉRDIDA'}</div>
        <div>│ Margen sobre Venta: <strong>${k.margen_venta != null ? (k.margen_venta>0?'+':'') + k.margen_venta + '%' : '—'}</strong> ${k.margen_venta >= BENCHMARKS_AUSTIN.margen_min ? '✅ EXCELENTE' : k.margen_venta >= BENCHMARKS_AUSTIN.margen_critico ? '🟡 BAJO' : '🔴 CRÍTICO'}</div>
        ${k.discrepancia != null && Math.abs(k.discrepancia) > BENCHMARKS_AUSTIN.discrepancia_min ? `<div class="col-span-2">│ <strong class="text-amber-700">⚠️ Discrepancia valor interno vs costo real: $${k.discrepancia > 0 ? '+' : ''}${k.discrepancia.toLocaleString()}</strong></div>` : ''}
      </div>
      ${x.acciones.length ? `
        <div class="ml-2 mt-2 pt-2 border-t border-slate-200">
          <div class="text-xs font-bold">│ ALERTAS ACTIVAS (${x.acciones.length})</div>
          ${k.flags.map(f => `<div class="text-xs ml-2 text-red-700">│ 🔴 ${rdFlagLabel(f, k)}</div>`).join('')}
          <div class="text-xs font-bold mt-1">│ ACCIONES REQUERIDAS</div>
          ${x.acciones.map((a, i) => `<div class="text-xs ml-2">│ ${i+1}. <strong>${a.titulo}</strong> — ${a.responsable} <span class="text-slate-500">(${a.razon})</span></div>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function rdBar(pct) {
  const blocks = Math.round(pct / 5);
  return '[' + '█'.repeat(blocks) + '░'.repeat(20 - blocks) + ']';
}

function rdPrintInforme() {
  const content = document.getElementById('rd-informe-print').innerHTML;
  const w = window.open('', '_blank', 'width=900,height=1200');
  w.document.write(`<!DOCTYPE html><html><head><title>Informe Ejecutivo Remodelación</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>@media print { .print\\:hidden { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style>
    </head><body class="p-6">${content}</body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); }, 500);
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
  const kpis = rdAdvancedKPIs(p);
  const acciones = rdAccionesRequeridas(p, kpis);

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
            <div class="flex justify-between"><span>👷 Trabajadores</span><span class="font-bold ${kpis.labor_ratio > BENCHMARKS_AUSTIN.labor_ratio_max ? 'text-red-700' : ''}">$${Math.round(p.gasto_trabajadores||0).toLocaleString()} <span class="text-slate-400">(${100-matPct}%)</span></span></div>
            ${kpis.labor_ratio != null ? `<div class="text-[10px] text-slate-500 ml-4">→ Ratio labor: ${kpis.labor_ratio}% (benchmark gut ${BENCHMARKS_AUSTIN.labor_ratio_gut}%, max ${BENCHMARKS_AUSTIN.labor_ratio_max}%) ${kpis.labor_ratio > BENCHMARKS_AUSTIN.labor_ratio_max ? '🔴 ALTO' : '✅'}</div>` : ''}
            <div class="flex justify-between border-t pt-1"><span>Total real</span><span class="font-bold">$${Math.round(cost).toLocaleString()}</span></div>
            <div class="flex justify-between"><span>Presupuesto</span><span class="text-slate-500">$${Math.round(presup).toLocaleString()}</span></div>
            ${kpis.ejecucion_pct != null ? `<div class="text-[10px] text-slate-500 ml-4">→ Ejecución: ${kpis.ejecucion_pct}% ${kpis.ejecucion_pct > 100 ? '🔴' : '✅'} · Faltante: $${Math.round(kpis.faltante_por_gastar).toLocaleString()}</div>` : ''}
            ${kpis.sobre_presupuesto_pct != null && kpis.sobre_presupuesto_pct > 0 ? `<div class="text-[10px] text-red-700 ml-4">→ ⚠️ Sobre presupuesto: +${kpis.sobre_presupuesto_pct}% ($${Math.round(cost - presup).toLocaleString()})</div>` : ''}
            <div class="flex justify-between"><span>Valor cliente</span><span class="text-slate-500">$${Math.round(p.valor_cliente||0).toLocaleString()}</span></div>
            ${kpis.margen_venta != null ? `<div class="text-[10px] ml-4 ${kpis.margen_venta >= BENCHMARKS_AUSTIN.margen_min ? 'text-emerald-700' : kpis.margen_venta >= BENCHMARKS_AUSTIN.margen_critico ? 'text-amber-700' : 'text-red-700 font-bold'}">→ Margen: ${kpis.margen_venta > 0 ? '+' : ''}${kpis.margen_venta}% (objetivo ${BENCHMARKS_AUSTIN.margen_min}-${BENCHMARKS_AUSTIN.margen_max}%)</div>` : ''}
            ${kpis.discrepancia != null && Math.abs(kpis.discrepancia) > BENCHMARKS_AUSTIN.discrepancia_min ? `<div class="border-t pt-1 mt-1 text-[11px] text-amber-700 font-bold">⚠️ Discrepancia valor interno vs costo real: $${kpis.discrepancia > 0 ? '+' : ''}${kpis.discrepancia.toLocaleString()} — revisar con admin</div>` : ''}
            ${kpis.eficiencia_gasto != null ? `<div class="border-t pt-1 mt-1 text-[11px] ${kpis.eficiencia_gasto > 120 ? 'text-red-700' : kpis.eficiencia_gasto > 100 ? 'text-amber-700' : 'text-emerald-700'}">Eficiencia gasto: ${kpis.eficiencia_gasto}% del esperado (al ${p.avance_pct||0}% de avance) ${kpis.eficiencia_gasto <= 100 ? '✅' : '⚠️'}</div>` : ''}
          </div>
        </div>
        <div class="border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">📅 Cronograma</div>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between"><span>Inicio</span><span>${p.fecha_inicio || '—'}</span></div>
            <div class="flex justify-between"><span>Fin estimado</span><span>${p.fecha_estimada_fin || '—'}</span></div>
            <div class="flex justify-between"><span>Fin real</span><span>${p.fecha_real_fin || '—'}</span></div>
            ${p.dias_transcurridos ? `<div class="text-[10px] text-slate-500 italic mt-2">${p.dias_transcurridos}</div>` : ''}
            ${kpis.dias_retraso != null ? `<div class="text-[11px] mt-1 ${kpis.dias_retraso > BENCHMARKS_AUSTIN.retraso_critico ? 'text-red-700 font-bold' : kpis.dias_retraso > 0 ? 'text-amber-700' : 'text-emerald-700'}">${kpis.dias_retraso > 0 ? `🔴 RETRASO: ${kpis.dias_retraso} días fuera de fecha` : kpis.dias_retraso < 0 ? `✅ ${-kpis.dias_retraso} días restantes` : '✅ En fecha'}</div>` : ''}
            ${latestSnap?.burn_rate ? `<div class="text-[11px] mt-2 pt-1 border-t"><strong>Burn rate:</strong> $${Math.round(latestSnap.burn_rate)}/día · <strong>Proyectado:</strong> $${Math.round(latestSnap.proyeccion_costo_final||0).toLocaleString()}</div>` : ''}
          </div>
        </div>
      </div>

      ${acciones.length ? `
        <!-- Acciones requeridas -->
        <div class="border-2 border-amber-300 bg-amber-50 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-amber-900 mb-2">⚡ ACCIONES REQUERIDAS (${acciones.length})</div>
          <div class="space-y-1">
            ${acciones.map((a, i) => `
              <div class="bg-white border border-amber-200 rounded p-2 text-xs">
                <div><strong>${i+1}. ${a.titulo}</strong> — <span class="text-slate-600">${a.responsable}</span></div>
                <div class="text-[10px] text-slate-500">${a.razon}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

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

// ─── S7-D · TAB ACCIONES (persistentes en remodel_required_actions) ───
function rdRenderAcciones() {
  const acts = rdState.requiredActions || [];
  const byCat = {};
  acts.forEach(a => { (byCat[a.category || 'otro'] = byCat[a.category || 'otro'] || []).push(a); });
  const overdueCount = acts.filter(a => a.due_date && new Date(a.due_date) < new Date() && a.status === 'pending').length;

  return `
    <div class="space-y-3">
      <div class="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
        <div class="text-xs text-amber-900">
          📋 <strong>${acts.length} acciones</strong> pendientes${overdueCount?` · <span class="text-red-700 font-bold">${overdueCount} vencidas</span>`:''}.
          Las acciones se generan automáticamente desde los KPIs de cada obra (retraso, sobrecosto, labor alto, discrepancia, margen).
        </div>
        <button onclick="rdMaterializeActions()" class="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-3 py-2 rounded">⚡ Regenerar desde KPIs</button>
      </div>

      ${Object.entries(byCat).map(([cat, items]) => `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">${cat} (${items.length})</div>
          <div class="divide-y divide-slate-100">
            ${items.map(a => {
              const obra = rdState.properties.find(p => p.airtable_id === a.airtable_id);
              const overdue = a.due_date && new Date(a.due_date) < new Date() && a.status === 'pending';
              return `
                <div class="p-3 ${overdue?'bg-red-50':''}">
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div class="flex-1 min-w-0">
                      <div class="font-bold text-sm">${a.title}</div>
                      <div class="text-[11px] text-slate-600 mt-0.5">${a.detail || ''}</div>
                      <div class="text-[10px] text-slate-400 mt-0.5">
                        ${obra ? `🏠 ${obra.address}` : ''}
                        ${a.responsable ? ` · 👤 ${a.responsable}` : ''}
                        ${a.due_date ? ` · 📅 ${a.due_date}${overdue?' ⏰ vencida':''}` : ''}
                      </div>
                    </div>
                    <div class="flex gap-1">
                      ${a.status === 'pending' ? `<button onclick="rdActionToggleStatus('${a.id}','in_progress')" class="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded font-bold">▶ Empezar</button>` : ''}
                      ${a.status !== 'done' ? `<button onclick="rdActionToggleStatus('${a.id}','done')" class="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded font-bold">✓ Done</button>` : ''}
                      <button onclick="rdActionToggleStatus('${a.id}','dismissed')" class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded">✕</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('') || '<div class="text-center text-slate-400 py-12">Sin acciones registradas. Click "⚡ Regenerar desde KPIs" para crearlas automáticamente.</div>'}
    </div>
  `;
}

// ─── S7-D · TAB INSIGHTS IA (remodel_weekly_insights) ───
function rdRenderInsights() {
  const insights = rdState.weeklyInsights || [];
  if (insights.length === 0) {
    return `<div class="text-center py-16 text-slate-500">
      <div class="text-5xl mb-3">🧠</div>
      <div class="font-bold">Sin insights IA todavía</div>
      <div class="text-xs mt-2 max-w-md mx-auto">Los insights semanales se generan automáticamente cuando corre la Edge Function de análisis IA. Pegá el SQL de S7-A para activar pg_cron.</div>
    </div>`;
  }
  return `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-900">
        🧠 <strong>Insights IA semanales</strong>: cada lunes Claude analiza tu portfolio y genera un resumen + recomendaciones priorizadas.
      </div>
      ${insights.map(i => `
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold flex justify-between">
            <span>📅 Semana del ${i.week_start}</span>
            <span class="text-slate-500">${i.obras_analizadas || 0} obras · ${i.cost_tokens_used || 0} tokens</span>
          </div>
          <div class="p-3">
            ${i.summary_md ? `<div class="text-xs whitespace-pre-wrap prose prose-sm max-w-none">${i.summary_md}</div>` : '<div class="text-xs text-slate-400">Sin resumen.</div>'}
            ${(i.recomendaciones || []).length ? `
              <div class="mt-3">
                <div class="text-[10px] font-bold uppercase text-slate-600 mb-1">Recomendaciones</div>
                <ul class="text-xs space-y-0.5 list-disc list-inside">
                  ${(i.recomendaciones || []).slice(0,10).map(r => `<li>${typeof r === 'string' ? r : (r.titulo || JSON.stringify(r))}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
