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

// ─── Config financiera editable (persistida en localStorage) ───
// Tasa de impuestos + intereses sobre préstamos + depreciaciones anuales de
// activos de la empresa (camionetas, herramientas grandes, etc) para calcular
// EBIT / EBITDA y margen neto después de impuestos.
function rdGetFinCfg() {
  let cfg;
  try {
    const raw = localStorage.getItem('rd_fin_cfg');
    cfg = raw ? { ...rdFinCfgDefaults(), ...JSON.parse(raw) } : rdFinCfgDefaults();
  } catch {
    cfg = rdFinCfgDefaults();
  }
  // Si activos_auto, sobrescribir depreciacion_anual con el cálculo del catálogo
  if (cfg.activos_auto) {
    const depAuto = rdCalcDepreciacionFromActivos();
    if (depAuto > 0) cfg.depreciacion_anual = depAuto;
  }
  return cfg;
}
function rdFinCfgDefaults() {
  return {
    tasa_impuestos_pct: 21,            // 21% corp USA federal (typical)
    overhead_anual: 60000,             // gastos generales empresa (oficina, seguros, software)
    depreciacion_anual: 12000,         // depreciación equipos (camioneta 4Runner, etc) — auto si hay activos
    amortizacion_anual: 0,             // amortización intangibles
    interes_prestamos_anual: 8000,     // gasto financiero anual estimado
    obras_activas_promedio: 3,         // # promedio de obras activas para prorrateo
    crew_min_personas: 3,              // tamaño mínimo de cuadrilla esperado
    activos_auto: true                 // si true, calcula depreciacion_anual desde el catálogo de activos
  };
}

// ─── Catálogo de activos/herramientas (vehículos, equipos grandes) ───
// Cada activo tiene costo inicial y vida útil. La depreciación anual se calcula
// como sum(cost / vida_util). Si activos_auto está en true, se usa para EBITDA.
function rdGetActivos() {
  try {
    const raw = localStorage.getItem('rd_activos');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function rdSetActivos(list) {
  try { localStorage.setItem('rd_activos', JSON.stringify(list)); } catch {}
}
function rdCalcDepreciacionFromActivos() {
  const activos = rdGetActivos();
  let total = 0;
  activos.forEach(a => {
    const cost = +a.cost_initial || 0;
    const vida = +a.vida_util_anios || 1;
    if (vida > 0 && cost > 0) total += cost / vida;
  });
  return Math.round(total);
}
function rdSetFinCfg(patch) {
  const cur = rdGetFinCfg();
  const next = { ...cur, ...patch };
  try { localStorage.setItem('rd_fin_cfg', JSON.stringify(next)); } catch {}
  return next;
}

// ─── Cálculo financiero completo por obra ───
// Devuelve { revenue, costoDirecto, margenBruto, margenBrutoPct,
//   overheadProrr, depreciacionProrr, interesesProrr,
//   ebitda, ebit, utilidadAntesImp, impuestos, utilidadNeta,
//   margenNetoPct, margenNetoDespuesImpPct }
function rdFinanzas(p, cfg) {
  cfg = cfg || rdGetFinCfg();
  const mat = +p.gasto_materiales || 0;
  const lab = +p.gasto_trabajadores || 0;
  const costoDirecto = mat + lab;
  const revenue = +p.valor_cliente || 0;
  const margenBruto = revenue - costoDirecto;
  const margenBrutoPct = revenue > 0 ? margenBruto / revenue * 100 : 0;

  // Prorrateo: si la obra dura X días sobre 365 y hay N obras paralelas,
  // le corresponde una fracción del overhead/dep/interés anual.
  const dias = p.fecha_inicio && (p.fecha_real_fin || p.fecha_estimada_fin)
    ? Math.max(1, Math.round((new Date(p.fecha_real_fin || p.fecha_estimada_fin) - new Date(p.fecha_inicio)) / 86400000))
    : 90; // default 3 meses si no hay fechas
  const fracAnual = (dias / 365) / Math.max(1, cfg.obras_activas_promedio);
  const overheadProrr = cfg.overhead_anual * fracAnual;
  const depreciacionProrr = cfg.depreciacion_anual * fracAnual;
  const interesesProrr = cfg.interes_prestamos_anual * fracAnual;

  // EBITDA = Margen Bruto − Overhead operativo (excluye dep, amort, intereses, impuestos)
  const ebitda = margenBruto - overheadProrr;
  // EBIT = EBITDA − depreciación − amortización
  const ebit = ebitda - depreciacionProrr;
  // Utilidad antes de impuestos = EBIT − intereses
  const utilidadAntesImp = ebit - interesesProrr;
  // Impuestos sobre utilidad positiva
  const impuestos = utilidadAntesImp > 0 ? utilidadAntesImp * (cfg.tasa_impuestos_pct / 100) : 0;
  const utilidadNeta = utilidadAntesImp - impuestos;

  return {
    revenue, costoDirecto, dias,
    margenBruto, margenBrutoPct,
    overheadProrr, depreciacionProrr, interesesProrr,
    ebitda, ebitdaPct: revenue > 0 ? ebitda/revenue*100 : 0,
    ebit, ebitPct: revenue > 0 ? ebit/revenue*100 : 0,
    utilidadAntesImp, utilidadAntesImpPct: revenue > 0 ? utilidadAntesImp/revenue*100 : 0,
    impuestos,
    utilidadNeta, margenNetoDespuesImpPct: revenue > 0 ? utilidadNeta/revenue*100 : 0
  };
}

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
        'Authorization': `Bearer ${await getAccessToken()}`
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
        <div class="flex items-center gap-1.5 flex-nowrap overflow-x-auto -mx-1 px-1 w-full lg:w-auto lg:flex-wrap">
          ${['portfolio','informe','obras','lideres','personal','comparar','finanzas','alertas','acciones','tendencias','insights'].map(t => `
            <button onclick="rdSetTab('${t}')" class="px-2.5 py-1.5 rounded text-xs font-bold whitespace-nowrap flex-shrink-0 ${rdState.tab===t?'bg-slate-900 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
              ${t==='portfolio'?'📊 Portfolio':t==='informe'?'📑 Informe':t==='obras'?'🏗️ Obras':t==='lideres'?'👷 Líderes':t==='personal'?'🧑‍🔧 Personal':t==='comparar'?'🔍 Comparar':t==='finanzas'?'💼 Finanzas':t==='alertas'?'🚨 Alertas':t==='acciones'?'📋 Acciones':t==='tendencias'?'📈 Tendencias':'🧠 Insights IA'}
              ${t==='alertas' && rdState.alerts.length ? `<span class="ml-1 bg-red-600 text-white px-1.5 rounded">${rdState.alerts.length}</span>` : ''}
              ${t==='acciones' && rdState.requiredActions.length ? `<span class="ml-1 bg-amber-600 text-white px-1.5 rounded">${rdState.requiredActions.length}</span>` : ''}
              ${t==='insights' && rdState.weeklyInsights.length ? `<span class="ml-1 bg-violet-600 text-white px-1.5 rounded">${rdState.weeklyInsights.length}</span>` : ''}
            </button>
          `).join('')}
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          ${lastSync ? `<span class="text-[10px] text-slate-500 hidden md:inline">Última sync: ${lastSyncAgo < 1 ? 'ahora' : lastSyncAgo < 60 ? lastSyncAgo+'min' : Math.floor(lastSyncAgo/60)+'h'} · ${rdState.syncLog.records_synced || 0} obras</span>` : '<span class="text-[10px] text-amber-700 hidden md:inline">Sin sync todavía. Click 🔄</span>'}
          <button onclick="openDailyDigest()" class="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded font-bold" title="Genera digest del día con tareas, atrasos y alertas para enviar por WhatsApp">📤 Digest del día</button>
          <button onclick="notifyRequestPermission()" class="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 px-3 py-1.5 rounded font-bold" title="Activar notificaciones del navegador para alertas críticas">🔔 Alertas</button>
          <button onclick="rdOpenCeoMobile()" class="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded font-bold" title="Vista CEO en formato celular — KPIs, alertas, decisiones">📱 Vista CEO</button>
          <button onclick="rdSync()" ${rdState.loading?'disabled':''} class="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold">
            ${rdState.loading ? '⏳ Sync...' : '🔄 Sync Airtable'}
          </button>
        </div>
      </div>

      <!-- BODY tab content -->
      <div class="flex-1 overflow-y-auto">
        ${rdState.tab === 'portfolio' ? rdRenderPortfolio(active, finalizada) :
          rdState.tab === 'informe' ? rdRenderInforme(active, finalizada) :
          rdState.tab === 'obras' ? rdRenderObras(active, finalizada, sinAsignar) :
          rdState.tab === 'lideres' ? rdRenderLideres() :
          rdState.tab === 'personal' ? rdRenderPersonal(active) :
          rdState.tab === 'comparar' ? rdRenderComparar(active, finalizada) :
          rdState.tab === 'finanzas' ? rdRenderFinanzas(active, finalizada) :
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
  // Cargar todo lo necesario en paralelo
  setTimeout(async () => {
    const container = document.getElementById('rd-trend-data');
    if (!container) return;

    const finalizada = rdState.properties.filter(p => p.proceso === 'Finalizado');
    const active = rdState.properties.filter(p => p.proceso === 'En obra' || p.proceso === 'En venta');
    const finCfg = rdGetFinCfg();

    // 1) Obras finalizadas por mes (últimos 12 meses)
    const byMonth = {};
    finalizada.forEach(p => {
      const fechaFin = p.fecha_real_fin || p.fecha_estimada_fin;
      if (!fechaFin) return;
      const monthKey = fechaFin.slice(0, 7); // YYYY-MM
      if (!byMonth[monthKey]) byMonth[monthKey] = { count: 0, revenue: 0, costo: 0, ebitda: 0, neto: 0 };
      const f = rdFinanzas(p, finCfg);
      byMonth[monthKey].count++;
      byMonth[monthKey].revenue += f.revenue;
      byMonth[monthKey].costo += f.costoDirecto;
      byMonth[monthKey].ebitda += f.ebitda;
      byMonth[monthKey].neto += f.utilidadNeta;
    });

    // 2) Cumplimiento weekly_activities por mes (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoffIso = sixMonthsAgo.toISOString().slice(0,10);
    const { data: wpData } = await sb.from('weekly_activities')
      .select('date,status,priority,notes')
      .gte('date', cutoffIso);
    const wpByMonth = {};
    (wpData || []).forEach(a => {
      const key = a.date.slice(0, 7);
      if (!wpByMonth[key]) wpByMonth[key] = { total: 0, done: 0, criticas: 0, criticasDone: 0, aplazadas: 0 };
      wpByMonth[key].total++;
      if (a.status === 'done') wpByMonth[key].done++;
      if (a.priority === 'critical' || a.priority === 'urgent') {
        wpByMonth[key].criticas++;
        if (a.status === 'done') wpByMonth[key].criticasDone++;
      }
      if ((a.notes||'').includes('[APLAZADA')) wpByMonth[key].aplazadas++;
    });

    // 3) Snapshots de portfolio histórico (gasto + avance)
    const cutoffSnap = new Date(Date.now() - 90*86400000).toISOString().split('T')[0];
    const { data: snapData } = await sb.from('remodel_snapshots')
      .select('snapshot_date,gasto_total,avance_pct')
      .gte('snapshot_date', cutoffSnap)
      .order('snapshot_date');
    const snapByDate = {};
    (snapData || []).forEach(s => {
      if (!snapByDate[s.snapshot_date]) snapByDate[s.snapshot_date] = { gasto: 0, avgAvance: 0, count: 0 };
      snapByDate[s.snapshot_date].gasto += s.gasto_total || 0;
      snapByDate[s.snapshot_date].avgAvance += s.avance_pct || 0;
      snapByDate[s.snapshot_date].count++;
    });

    // Construir series ordenadas
    const sortedMonths = Object.keys(byMonth).sort();
    const last12Months = (() => {
      const arr = [];
      const t = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
        arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
      }
      return arr;
    })();
    const last6Months = last12Months.slice(-6);

    // KPIs de evolución
    const totalRevenue12m = last12Months.reduce((s,m) => s + (byMonth[m]?.revenue || 0), 0);
    const totalNeto12m = last12Months.reduce((s,m) => s + (byMonth[m]?.neto || 0), 0);
    const totalObras12m = last12Months.reduce((s,m) => s + (byMonth[m]?.count || 0), 0);
    const promedioObrasMes = totalObras12m / 12;

    // Comparar 6m vs 6m (período actual vs anterior)
    const prev6 = last12Months.slice(0,6);
    const recent6 = last12Months.slice(6);
    const prev6Revenue = prev6.reduce((s,m) => s + (byMonth[m]?.revenue || 0), 0);
    const recent6Revenue = recent6.reduce((s,m) => s + (byMonth[m]?.revenue || 0), 0);
    const revenueGrowth = prev6Revenue > 0 ? Math.round((recent6Revenue - prev6Revenue) / prev6Revenue * 100) : null;
    const prev6Neto = prev6.reduce((s,m) => s + (byMonth[m]?.neto || 0), 0);
    const recent6Neto = recent6.reduce((s,m) => s + (byMonth[m]?.neto || 0), 0);
    const netoGrowth = prev6Neto > 0 ? Math.round((recent6Neto - prev6Neto) / prev6Neto * 100) : null;

    const fmt = n => '$' + Math.round(n).toLocaleString();
    const fmtK = n => '$' + Math.round(n/1000) + 'k';
    const monthLabel = m => {
      const [y, mm] = m.split('-');
      const d = new Date(+y, +mm-1, 1);
      return d.toLocaleDateString('es', { month:'short', year:'2-digit' });
    };

    // Render
    container.innerHTML = `
      <!-- KPIs de evolución -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-[10px] uppercase text-slate-500 font-bold">Revenue 12m</div>
          <div class="text-lg font-bold">${fmtK(totalRevenue12m)}</div>
          ${revenueGrowth !== null ? `<div class="text-[10px] ${revenueGrowth>=0?'text-emerald-700':'text-red-700'} font-bold">${revenueGrowth>=0?'↗':'↘'} ${Math.abs(revenueGrowth)}% vs 6m anteriores</div>` : '<div class="text-[10px] text-slate-400">Sin comparativa</div>'}
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-[10px] uppercase text-slate-500 font-bold">Neto 12m</div>
          <div class="text-lg font-bold ${totalNeto12m>=0?'text-emerald-700':'text-red-700'}">${fmtK(totalNeto12m)}</div>
          ${netoGrowth !== null ? `<div class="text-[10px] ${netoGrowth>=0?'text-emerald-700':'text-red-700'} font-bold">${netoGrowth>=0?'↗':'↘'} ${Math.abs(netoGrowth)}% vs 6m anteriores</div>` : '<div class="text-[10px] text-slate-400">Sin comparativa</div>'}
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-[10px] uppercase text-slate-500 font-bold">Obras 12m</div>
          <div class="text-lg font-bold">${totalObras12m}</div>
          <div class="text-[10px] text-slate-500">prom ${promedioObrasMes.toFixed(1)}/mes</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-[10px] uppercase text-slate-500 font-bold">Margen neto avg</div>
          <div class="text-lg font-bold ${totalNeto12m/totalRevenue12m>=0.05?'text-emerald-700':'text-amber-700'}">${totalRevenue12m>0?(totalNeto12m/totalRevenue12m*100).toFixed(1):'0'}%</div>
          <div class="text-[10px] text-slate-500">objetivo 5-15%</div>
        </div>
      </div>

      <!-- Gráfico 1: Revenue y Neto mensual -->
      <div class="bg-white border border-slate-200 rounded-xl p-3 mb-3">
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">📈 Revenue y Neto mensual (12m)</div>
        <div style="position:relative; height: 240px;">
          <canvas id="trend-revenue"></canvas>
        </div>
      </div>

      <!-- Gráfico 2: Obras finalizadas + Cumplimiento planner -->
      <div class="grid md:grid-cols-2 gap-3 mb-3">
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">🏁 Obras finalizadas por mes</div>
          <div style="position:relative; height: 200px;">
            <canvas id="trend-obras"></canvas>
          </div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">✅ % Cumplimiento planner (6m)</div>
          <div style="position:relative; height: 200px;">
            <canvas id="trend-cumplimiento"></canvas>
          </div>
        </div>
      </div>

      <!-- Gráfico 3: Críticas vs Aplazadas (operación) -->
      <div class="bg-white border border-slate-200 rounded-xl p-3 mb-3">
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">⚠️ Salud operativa mensual (6m)</div>
        <div style="position:relative; height: 220px;">
          <canvas id="trend-ops"></canvas>
        </div>
      </div>

      <!-- Tabla detalle por mes -->
      <details class="bg-slate-50 border border-slate-200 rounded-xl">
        <summary class="cursor-pointer px-3 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-100">📋 Detalle mensual (click para expandir)</summary>
        <div class="p-3 overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-white">
              <tr class="border-b border-slate-200">
                <th class="text-left p-2">Mes</th>
                <th class="text-right p-2">Obras cerradas</th>
                <th class="text-right p-2">Revenue</th>
                <th class="text-right p-2">EBITDA</th>
                <th class="text-right p-2">Neto</th>
                <th class="text-right p-2">Margen %</th>
              </tr>
            </thead>
            <tbody>
              ${last12Months.map(m => {
                const x = byMonth[m];
                if (!x) return `<tr class="border-t border-slate-100 text-slate-400"><td class="p-2">${monthLabel(m)}</td><td class="p-2 text-right">—</td><td class="p-2 text-right">—</td><td class="p-2 text-right">—</td><td class="p-2 text-right">—</td><td class="p-2 text-right">—</td></tr>`;
                const margen = x.revenue > 0 ? (x.neto/x.revenue*100).toFixed(1) : 0;
                return `<tr class="border-t border-slate-100">
                  <td class="p-2 font-medium">${monthLabel(m)}</td>
                  <td class="p-2 text-right font-bold">${x.count}</td>
                  <td class="p-2 text-right">${fmt(x.revenue)}</td>
                  <td class="p-2 text-right">${fmt(x.ebitda)}</td>
                  <td class="p-2 text-right ${x.neto>=0?'text-emerald-700':'text-red-700'} font-semibold">${fmt(x.neto)}</td>
                  <td class="p-2 text-right ${+margen>=5?'text-emerald-700':+margen>=0?'text-amber-700':'text-red-700'} font-bold">${margen}%</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </details>
    `;

    // Renderizar charts después de inyectar el HTML
    if (typeof Chart === 'undefined') return;

    // Chart 1: Revenue y Neto
    const ctx1 = document.getElementById('trend-revenue');
    if (ctx1) new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: last12Months.map(monthLabel),
        datasets: [
          { label: 'Revenue', data: last12Months.map(m => byMonth[m]?.revenue || 0), backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 6 },
          { label: 'Neto post-imp', data: last12Months.map(m => byMonth[m]?.neto || 0), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6, type:'line', tension: 0.3, borderColor:'rgb(16,185,129)', backgroundColor:'rgba(16,185,129,0.15)', fill: true }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } },
        scales: {
          y: { ticks: { callback: v => '$' + (v/1000) + 'k', font: { size: 10 } } },
          x: { ticks: { font: { size: 10 } } }
        }
      }
    });

    // Chart 2: Obras finalizadas
    const ctx2 = document.getElementById('trend-obras');
    if (ctx2) new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: last12Months.map(monthLabel),
        datasets: [{ label: 'Obras', data: last12Months.map(m => byMonth[m]?.count || 0), backgroundColor: 'rgba(139,92,246,0.7)', borderRadius: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 } }, x: { ticks: { font: { size: 9 } } } }
      }
    });

    // Chart 3: % Cumplimiento planner
    const ctx3 = document.getElementById('trend-cumplimiento');
    if (ctx3) new Chart(ctx3, {
      type: 'line',
      data: {
        labels: last6Months.map(monthLabel),
        datasets: [{
          label: '% Cumplimiento',
          data: last6Months.map(m => {
            const x = wpByMonth[m];
            return x && x.total > 0 ? Math.round(x.done/x.total*100) : null;
          }),
          borderColor: 'rgb(16,185,129)',
          backgroundColor: 'rgba(16,185,129,0.15)',
          tension: 0.3, fill: true,
          pointRadius: 5, pointBackgroundColor: 'rgb(16,185,129)'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 100, ticks: { callback: v => v+'%', font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }
      }
    });

    // Chart 4: Salud operativa (críticas done vs total, aplazadas)
    const ctx4 = document.getElementById('trend-ops');
    if (ctx4) new Chart(ctx4, {
      type: 'bar',
      data: {
        labels: last6Months.map(monthLabel),
        datasets: [
          { label: 'Críticas totales', data: last6Months.map(m => wpByMonth[m]?.criticas || 0), backgroundColor: 'rgba(244,63,94,0.5)', borderRadius: 4 },
          { label: 'Críticas hechas', data: last6Months.map(m => wpByMonth[m]?.criticasDone || 0), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
          { label: 'Aplazadas', data: last6Months.map(m => wpByMonth[m]?.aplazadas || 0), backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } },
        scales: { y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 } }, x: { ticks: { font: { size: 10 } } } }
      }
    });

  }, 50);

  return `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900">
        📈 <strong>Tendencias del portfolio</strong> — evolución financiera y operativa de los últimos 12 meses.
        Cruza obras finalizadas (Airtable) con cumplimiento operativo (Weekly Planner). El % Cumplimiento y Salud operativa requieren tareas en el planner para mostrarse.
      </div>
      <div id="rd-trend-data" class="text-center py-8 text-slate-400">⏳ Calculando tendencias…</div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
// 📑 INFORME EJECUTIVO — replica el formato del PDF interno
// ════════════════════════════════════════════════════════════
function rdRenderInforme(active, finalizada) {
  const activeKpis = active.map(p => ({ p, k: rdAdvancedKPIs(p), acciones: rdAccionesRequeridas(p, rdAdvancedKPIs(p)) }));
  const criticas = activeKpis.filter(x => x.k.estado === 'critico');
  const advertencias = activeKpis.filter(x => x.k.estado === 'advertencia');
  const sanas = activeKpis.filter(x => x.k.estado === 'sano');

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

  const enPlazo = activeKpis.filter(x => (x.k.dias_retraso||0) <= 0).length;
  const vencidos = activeKpis.filter(x => (x.k.dias_retraso||0) > 0).length;
  const sobrecosto = activeKpis.filter(x => x.k.sobre_presupuesto_pct > 0).length;
  const enPerdida = activeKpis.filter(x => (x.k.margen_venta||100) < 0).length;

  const hoy = new Date();
  const fechaStr = hoy.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Estado portfolio
  let estadoPortfolio, estadoColor, estadoIcon, estadoMsg;
  if (margenGlobal < BENCHMARKS_AUSTIN.margen_critico) {
    estadoPortfolio = 'PORTAFOLIO EN RIESGO';
    estadoColor = 'from-red-600 to-red-800'; estadoIcon = '🔴';
    estadoMsg = 'Margen global por debajo del umbral crítico. Decisión hoy.';
  } else if (criticas.length > 0) {
    estadoPortfolio = 'ALERTAS CRÍTICAS ACTIVAS';
    estadoColor = 'from-amber-500 to-orange-700'; estadoIcon = '⚠️';
    estadoMsg = `${criticas.length} proyecto${criticas.length>1?'s':''} requiere${criticas.length>1?'n':''} tu intervención.`;
  } else if (advertencias.length > 0) {
    estadoPortfolio = 'OPERACIÓN ESTABLE CON SEÑALES';
    estadoColor = 'from-amber-400 to-amber-600'; estadoIcon = '🟡';
    estadoMsg = `${advertencias.length} señal${advertencias.length>1?'es':''} de advertencia. Vigilar de cerca.`;
  } else {
    estadoPortfolio = 'PORTAFOLIO SANO';
    estadoColor = 'from-emerald-500 to-emerald-700'; estadoIcon = '✅';
    estadoMsg = 'Todos los proyectos dentro de parámetros. Mantener ritmo.';
  }

  // Top 3 decisiones priorizadas
  const decisiones = [];
  criticas.slice(0, 2).forEach(x => {
    decisiones.push({
      tipo: 'CRÍTICO',
      titulo: x.p.address,
      detalle: x.k.flags.map(f => rdFlagLabel(f, x.k)).join(' · '),
      cta: 'Abrir obra',
      action: `rdOpenObra('${x.p.airtable_id}')`,
      color: 'red'
    });
  });
  if (decisiones.length < 3 && ratioLaborGlobal > BENCHMARKS_AUSTIN.labor_ratio_max) {
    decisiones.push({
      tipo: 'SISTÉMICO',
      titulo: 'Ratio labor del portfolio elevado',
      detalle: `${ratioLaborGlobal}% vs benchmark ${BENCHMARKS_AUSTIN.labor_ratio_max}% — revisar cuadrillas`,
      cta: 'Ver detalle líderes',
      action: `rdState.tab='lideres'; rdRender()`,
      color: 'amber'
    });
  }
  advertencias.slice(0, 3 - decisiones.length).forEach(x => {
    decisiones.push({
      tipo: 'ADVERTENCIA',
      titulo: x.p.address,
      detalle: x.k.flags.map(f => rdFlagLabel(f, x.k)).join(' · ') || 'Revisar variables',
      cta: 'Abrir obra',
      action: `rdOpenObra('${x.p.airtable_id}')`,
      color: 'amber'
    });
  });
  if (decisiones.length === 0) {
    decisiones.push({
      tipo: 'TODO OK',
      titulo: 'Sin alertas activas',
      detalle: 'Mantener disciplina de registro semanal en Airtable',
      cta: null, action: null, color: 'emerald'
    });
  }

  // Anillo SVG salud portfolio
  const total = active.length || 1;
  const pctSano = (sanas.length / total) * 100;
  const pctAdv = (advertencias.length / total) * 100;
  const pctCrit = (criticas.length / total) * 100;

  return `
    <div id="rd-informe-print" class="space-y-4">
      <!-- Toolbar -->
      <div class="flex justify-between items-center print:hidden">
        <div class="text-xs text-slate-500 capitalize">${fechaStr} · Agua Construction Group · Structure One · Flipping Rentals</div>
        <div class="flex gap-2">
          <button onclick="rdOpenPPTXEditor()" class="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg font-semibold shadow-sm">📊 Generar presentación</button>
          <button onclick="rdPrintInforme()" class="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-semibold shadow-sm">🖨️ Imprimir / PDF</button>
        </div>
      </div>

      <!-- HERO: Estado del portfolio + mensaje CEO -->
      <div class="bg-gradient-to-br ${estadoColor} text-white rounded-2xl p-6 shadow-lg">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="text-[10px] uppercase tracking-widest opacity-80 font-bold">Estado del portafolio · ${active.length} obra${active.length!==1?'s':''} activa${active.length!==1?'s':''}</div>
            <div class="text-2xl md:text-3xl font-bold mt-1">${estadoIcon} ${estadoPortfolio}</div>
            <div class="text-sm mt-2 opacity-95">${estadoMsg}</div>
          </div>
          <!-- Donut SVG -->
          <div class="hidden md:block">
            ${rdRingSVG(pctSano, pctAdv, pctCrit, total)}
          </div>
        </div>
        <!-- KPIs hero -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          ${rdHeroKpi('💰', 'Ganancia pipeline', '$'+Math.round(gananciaPipeline).toLocaleString(), `${margenGlobal>0?'+':''}${margenGlobal}% margen`)}
          ${rdHeroKpi('🏗️', 'Presupuesto ejecutado', `${ejecucionGlobal}%`, `$${Math.round(totalReal).toLocaleString()} / $${Math.round(totalPresup).toLocaleString()}`)}
          ${rdHeroKpi('👷', 'Labor/Costo', `${ratioLaborGlobal}%`, `Bench ${BENCHMARKS_AUSTIN.labor_ratio_gut}–${BENCHMARKS_AUSTIN.labor_ratio_max}%`)}
          ${rdHeroKpi('🏁', 'Histórico cerrado', '$'+Math.round(gananciaHistorica).toLocaleString(), `${finalizada.length} flips finalizados`)}
        </div>
      </div>

      <!-- DECISIONES PRIORITARIAS -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <div class="text-xl">🎯</div>
          <div class="font-bold text-slate-900">Hoy decide</div>
          <div class="text-xs text-slate-500">— top ${decisiones.length} prioridades del CEO</div>
        </div>
        <div class="space-y-2">
          ${decisiones.map((d,i) => `
            <div class="flex items-center gap-3 p-3 rounded-xl border-l-4 ${d.color==='red'?'border-red-500 bg-red-50':d.color==='amber'?'border-amber-500 bg-amber-50':'border-emerald-500 bg-emerald-50'}">
              <div class="text-2xl font-black ${d.color==='red'?'text-red-700':d.color==='amber'?'text-amber-700':'text-emerald-700'}">${i+1}</div>
              <div class="flex-1 min-w-0">
                <div class="text-[10px] uppercase tracking-wider font-bold ${d.color==='red'?'text-red-700':d.color==='amber'?'text-amber-700':'text-emerald-700'}">${d.tipo}</div>
                <div class="font-semibold text-sm text-slate-900 truncate">${d.titulo}</div>
                <div class="text-xs text-slate-600 truncate">${d.detalle}</div>
              </div>
              ${d.cta ? `<button onclick="${d.action}" class="print:hidden text-xs px-3 py-1.5 rounded-lg font-semibold ${d.color==='red'?'bg-red-600 hover:bg-red-700 text-white':d.color==='amber'?'bg-amber-600 hover:bg-amber-700 text-white':'bg-emerald-600 text-white'}">${d.cta} →</button>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- KPIs OPERATIVOS — píldoras -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${rdOpsPill('🟢', 'En plazo', `${enPlazo}/${active.length}`, 'emerald')}
        ${rdOpsPill('⏰', 'Vencidos', vencidos, vencidos>0?'red':'slate')}
        ${rdOpsPill('💸', 'En sobrecosto', sobrecosto, sobrecosto>0?'amber':'slate')}
        ${rdOpsPill('🔻', 'En pérdida', enPerdida, enPerdida>0?'red':'slate')}
      </div>

      <!-- BENCHMARKS — barras visuales con marcador -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center gap-2 mb-4">
          <div class="text-xl">📐</div>
          <div class="font-bold text-slate-900">Benchmarks Austin TX</div>
          <div class="text-xs text-slate-500">— vs industria fix & flip</div>
        </div>
        <div class="space-y-4">
          ${rdBenchBar('Margen neto', margenGlobal, BENCHMARKS_AUSTIN.margen_min, BENCHMARKS_AUSTIN.margen_max, 50, '%', 'high')}
          ${rdBenchBar('Labor / Costo total', ratioLaborGlobal, BENCHMARKS_AUSTIN.labor_ratio_gut, BENCHMARKS_AUSTIN.labor_ratio_max, 100, '%', 'low')}
          ${rdBenchBar('Ejecución presupuestal', ejecucionGlobal, 0, BENCHMARKS_AUSTIN.ejecucion_max, 130, '%', 'low')}
        </div>
      </div>

      <!-- PROYECTOS — cards visuales -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            <div class="text-xl">🏠</div>
            <div class="font-bold text-slate-900">Análisis por proyecto</div>
          </div>
          <div class="text-xs text-slate-500">${activeKpis.length} obras · click para detalle</div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          ${activeKpis.length === 0
            ? '<div class="col-span-2 text-sm text-slate-400 text-center py-8">Sin proyectos activos</div>'
            : activeKpis
                .sort((a,b) => ({critico:0,advertencia:1,sano:2}[a.k.estado] - ({critico:0,advertencia:1,sano:2}[b.k.estado])))
                .map((x, i) => rdRenderProyectoBloque(x, i+1)).join('')}
        </div>
      </div>
    </div>
  `;
}

// ─── helpers visuales del informe ───
function rdHeroKpi(icon, label, value, sub) {
  return `
    <div class="bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20">
      <div class="text-[10px] uppercase tracking-wider opacity-80 font-semibold">${icon} ${label}</div>
      <div class="text-xl md:text-2xl font-bold mt-1 leading-tight">${value}</div>
      <div class="text-[11px] opacity-85 mt-0.5">${sub}</div>
    </div>
  `;
}

function rdOpsPill(icon, label, value, color) {
  const colorMap = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700'
  };
  return `
    <div class="rounded-xl border ${colorMap[color]} p-3 flex items-center gap-3">
      <div class="text-2xl">${icon}</div>
      <div>
        <div class="text-[10px] uppercase tracking-wider font-bold opacity-80">${label}</div>
        <div class="text-2xl font-bold leading-none">${value}</div>
      </div>
    </div>
  `;
}

// Anillo SVG estado proyectos
function rdRingSVG(pctSano, pctAdv, pctCrit, total) {
  const R = 38, C = 2*Math.PI*R;
  const sSan = (pctSano/100)*C, sAdv = (pctAdv/100)*C, sCrit = (pctCrit/100)*C;
  return `
    <svg width="110" height="110" viewBox="0 0 100 100" class="transform -rotate-90">
      <circle cx="50" cy="50" r="${R}" stroke="rgba(255,255,255,0.18)" stroke-width="10" fill="none"/>
      <circle cx="50" cy="50" r="${R}" stroke="#10b981" stroke-width="10" fill="none"
        stroke-dasharray="${sSan} ${C-sSan}" stroke-dashoffset="0"/>
      <circle cx="50" cy="50" r="${R}" stroke="#f59e0b" stroke-width="10" fill="none"
        stroke-dasharray="${sAdv} ${C-sAdv}" stroke-dashoffset="${-sSan}"/>
      <circle cx="50" cy="50" r="${R}" stroke="#ef4444" stroke-width="10" fill="none"
        stroke-dasharray="${sCrit} ${C-sCrit}" stroke-dashoffset="${-(sSan+sAdv)}"/>
      <g class="transform rotate-90" style="transform-origin: 50px 50px;">
        <text x="50" y="48" text-anchor="middle" fill="white" font-size="20" font-weight="900">${total}</text>
        <text x="50" y="62" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="8" font-weight="600">OBRAS</text>
      </g>
    </svg>
  `;
}

// Barra de benchmark con marcador de objetivo
function rdBenchBar(label, actual, min, max, scale, unit, dir) {
  // dir = 'high' (más alto mejor, margen) | 'low' (más bajo mejor, labor, ejecución)
  const pctActual = Math.max(0, Math.min(100, (actual / scale) * 100));
  const pctMin = (min / scale) * 100;
  const pctMax = (max / scale) * 100;
  let ok;
  if (dir === 'high') ok = actual >= min;
  else ok = actual <= max;
  const colorBar = ok ? 'bg-emerald-500' : (Math.abs(actual - (dir==='high'?min:max)) < scale*0.05 ? 'bg-amber-500' : 'bg-red-500');
  const dot = ok ? '✅' : '🔴';
  return `
    <div>
      <div class="flex items-center justify-between text-xs mb-1">
        <div class="font-semibold text-slate-700">${dot} ${label}</div>
        <div class="text-slate-500">Actual <strong class="text-slate-900">${actual>0&&dir==='high'?'+':''}${actual}${unit}</strong> · Objetivo <strong>${dir==='high'?'≥'+min:'≤'+max}${unit}</strong></div>
      </div>
      <div class="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        <!-- zona objetivo -->
        <div class="absolute top-0 bottom-0 bg-emerald-100" style="left:${pctMin}%; width:${Math.max(0,pctMax-pctMin)}%;"></div>
        <!-- barra actual -->
        <div class="absolute top-0 bottom-0 ${colorBar}" style="left:0; width:${pctActual}%;"></div>
        <!-- marcador objetivo principal -->
        <div class="absolute top-0 bottom-0 w-0.5 bg-slate-900" style="left:${dir==='high'?pctMin:pctMax}%;"></div>
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
  const estadoLabel = k.estado === 'critico' ? (k.dias_retraso>0?'VENCIDO':'CRÍTICO') :
                      k.estado === 'advertencia' ? 'ADVERTENCIA' : 'SANO';
  const estadoBg = k.estado==='critico' ? 'bg-red-500' : k.estado==='advertencia' ? 'bg-amber-500' : 'bg-emerald-500';
  const cardBorder = k.estado==='critico' ? 'border-red-200' : k.estado==='advertencia' ? 'border-amber-200' : 'border-emerald-200';
  const avance = p.avance_pct || 0;
  const avanceColor = avance >= 75 ? 'bg-emerald-500' : avance >= 40 ? 'bg-blue-500' : avance > 0 ? 'bg-amber-500' : 'bg-slate-300';

  const diasInfo = k.dias_retraso != null
    ? (k.dias_retraso > 0
        ? `<span class="text-red-700 font-semibold">⏰ ${k.dias_retraso}d retraso</span>`
        : `<span class="text-emerald-700">${-k.dias_retraso}d restantes</span>`)
    : '<span class="text-slate-400">—</span>';

  const margenColor = k.margen_venta == null ? 'text-slate-400'
    : k.margen_venta >= BENCHMARKS_AUSTIN.margen_min ? 'text-emerald-700'
    : k.margen_venta >= BENCHMARKS_AUSTIN.margen_critico ? 'text-amber-700' : 'text-red-700';

  const accId = `rd-acc-${p.airtable_id}`;
  return `
    <div class="bg-white border ${cardBorder} rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
      <!-- header card -->
      <div class="flex items-center gap-3 p-3 border-b border-slate-100">
        <div class="${estadoBg} text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded">${estadoLabel}</div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm text-slate-900 truncate">${p.address || '—'}</div>
          <div class="text-[11px] text-slate-500 truncate">${p.lider || 'Sin líder'} · ${p.city || ''}</div>
        </div>
        <button onclick="rdOpenObra('${p.airtable_id}')" class="print:hidden text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-semibold">Abrir →</button>
      </div>

      <!-- avance + fechas -->
      <div class="px-3 pt-3">
        <div class="flex items-center justify-between text-[11px] text-slate-600 mb-1">
          <span class="font-semibold">Avance ${avance}%</span>
          <span>${diasInfo}</span>
        </div>
        <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="${avanceColor} h-full transition-all" style="width:${avance}%"></div>
        </div>
        ${p.fecha_inicio || p.fecha_estimada_fin ? `<div class="text-[10px] text-slate-400 mt-1">${p.fecha_inicio||'—'} → ${p.fecha_estimada_fin||'—'}</div>` : ''}
      </div>

      <!-- 4 mini KPIs -->
      <div class="grid grid-cols-4 gap-0 mt-3 border-t border-slate-100">
        <div class="p-2.5 border-r border-slate-100">
          <div class="text-[9px] uppercase text-slate-500 font-bold">Ganancia</div>
          <div class="text-sm font-bold ${k.ganancia>=0?'text-emerald-700':'text-red-700'}">$${Math.round(k.ganancia/1000)}k</div>
        </div>
        <div class="p-2.5 border-r border-slate-100">
          <div class="text-[9px] uppercase text-slate-500 font-bold">Margen</div>
          <div class="text-sm font-bold ${margenColor}">${k.margen_venta!=null?(k.margen_venta>0?'+':'')+k.margen_venta+'%':'—'}</div>
        </div>
        <div class="p-2.5 border-r border-slate-100">
          <div class="text-[9px] uppercase text-slate-500 font-bold">Ejecución</div>
          <div class="text-sm font-bold ${k.ejecucion_pct!=null&&k.ejecucion_pct<=100?'text-slate-900':'text-red-700'}">${k.ejecucion_pct!=null?k.ejecucion_pct+'%':'—'}</div>
        </div>
        <div class="p-2.5">
          <div class="text-[9px] uppercase text-slate-500 font-bold">Labor</div>
          <div class="text-sm font-bold ${k.labor_ratio!=null&&k.labor_ratio<=BENCHMARKS_AUSTIN.labor_ratio_max?'text-slate-900':'text-red-700'}">${k.labor_ratio!=null?k.labor_ratio+'%':'—'}</div>
        </div>
      </div>

      <!-- línea financiera -->
      <div class="px-3 py-2 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100">
        <div>Costo <strong class="text-slate-900">$${Math.round(k.totalCost/1000)}k</strong> / Presup. <strong>$${Math.round((p.presupuesto_interno||0)/1000)}k</strong></div>
        <div>Venta <strong class="text-slate-900">$${Math.round((p.valor_cliente||0)/1000)}k</strong></div>
      </div>

      ${x.acciones.length ? `
        <div class="px-3 py-2.5 bg-red-50/60 border-t border-red-100">
          <button onclick="document.getElementById('${accId}').classList.toggle('hidden')" class="print:hidden w-full flex items-center justify-between text-xs font-bold text-red-800">
            <span>🚨 ${x.acciones.length} acción${x.acciones.length>1?'es':''} requerida${x.acciones.length>1?'s':''}</span>
            <span class="text-[10px] font-normal">click ▾</span>
          </button>
          <div id="${accId}" class="hidden mt-2 space-y-1">
            ${k.flags.map(f => `<div class="text-[11px] text-red-700">🔴 ${rdFlagLabel(f, k)}</div>`).join('')}
            ${x.acciones.map((a, i) => `<div class="text-[11px] text-slate-700"><strong>${i+1}.</strong> ${a.titulo} <span class="text-slate-500">— ${a.responsable}</span></div>`).join('')}
          </div>
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

// ─── FORECAST: calculadora rápida de proyección dentro del drill-down ───
function rdForecastUpdate(airtableId) {
  const p = rdState.properties.find(x => x.airtable_id === airtableId);
  if (!p) return;
  const matExtra = +document.getElementById('fc-mat-'+airtableId)?.value || 0;
  const labExtra = +document.getElementById('fc-lab-'+airtableId)?.value || 0;
  const daysExtra = +document.getElementById('fc-days-'+airtableId)?.value || 0;

  const costActual = (+p.gasto_materiales||0) + (+p.gasto_trabajadores||0);
  const presup = +p.presupuesto_interno || 0;
  const venta = +p.valor_cliente || 0;
  const costFinal = costActual + matExtra + labExtra;
  const ganancia = venta - costFinal;
  const margen = venta > 0 ? Math.round((ganancia/venta) * 1000) / 10 : 0;
  const sobrePresup = presup > 0 ? Math.round((costFinal - presup) / presup * 100 * 10) / 10 : null;

  const costEl = document.getElementById('fc-cost-'+airtableId);
  const costDeltaEl = document.getElementById('fc-cost-delta-'+airtableId);
  const gainEl = document.getElementById('fc-gain-'+airtableId);
  const marginEl = document.getElementById('fc-margin-'+airtableId);
  const marginBenchEl = document.getElementById('fc-margin-bench-'+airtableId);
  const dateEl = document.getElementById('fc-date-'+airtableId);
  const dateDeltaEl = document.getElementById('fc-date-delta-'+airtableId);

  if (costEl) costEl.textContent = '$'+Math.round(costFinal).toLocaleString();
  if (costDeltaEl) {
    if (presup > 0) {
      const txt = sobrePresup > 0
        ? `+${sobrePresup}% sobre presup. ($${Math.round(costFinal-presup).toLocaleString()})`
        : `${Math.abs(sobrePresup)}% bajo presup. ($${Math.round(presup-costFinal).toLocaleString()} libre)`;
      costDeltaEl.textContent = txt;
      costDeltaEl.className = `text-[9px] font-semibold ${sobrePresup > 10 ? 'text-red-700' : sobrePresup > 0 ? 'text-amber-700' : 'text-emerald-700'}`;
    } else {
      costDeltaEl.textContent = 'sin presupuesto cargado';
    }
  }
  if (gainEl) {
    gainEl.textContent = '$'+Math.round(ganancia).toLocaleString();
    gainEl.className = `text-base font-bold ${ganancia >= 0 ? 'text-emerald-700' : 'text-red-700'}`;
  }
  if (marginEl) {
    marginEl.textContent = (margen>0?'+':'')+margen+'%';
    marginEl.className = `text-base font-bold ${margen >= BENCHMARKS_AUSTIN.margen_min ? 'text-emerald-700' : margen >= BENCHMARKS_AUSTIN.margen_critico ? 'text-amber-700' : 'text-red-700'}`;
  }
  if (marginBenchEl) {
    marginBenchEl.textContent = margen >= BENCHMARKS_AUSTIN.margen_min ? '✅ sobre objetivo' :
                                 margen >= BENCHMARKS_AUSTIN.margen_critico ? `⚠️ objetivo ≥${BENCHMARKS_AUSTIN.margen_min}%` :
                                 `🔴 crítico (mín ${BENCHMARKS_AUSTIN.margen_critico}%)`;
  }
  if (dateEl && p.fecha_estimada_fin) {
    if (daysExtra > 0) {
      const newDate = new Date(p.fecha_estimada_fin + 'T00:00:00');
      newDate.setDate(newDate.getDate() + daysExtra);
      dateEl.textContent = newDate.toISOString().slice(0,10);
      if (dateDeltaEl) {
        dateDeltaEl.textContent = `+${daysExtra}d sobre ${p.fecha_estimada_fin}`;
        dateDeltaEl.className = 'text-[9px] font-semibold text-amber-700';
      }
    } else {
      dateEl.textContent = p.fecha_estimada_fin;
      if (dateDeltaEl) {
        dateDeltaEl.textContent = 'sin días extra';
        dateDeltaEl.className = 'text-[9px] text-slate-500';
      }
    }
  }
}

function rdForecastReset(airtableId) {
  ['fc-mat-','fc-lab-','fc-days-'].forEach(prefix => {
    const el = document.getElementById(prefix+airtableId);
    if (el) el.value = 0;
  });
  rdForecastUpdate(airtableId);
}

// ─── DRILL-DOWN POR OBRA ───
async function rdOpenObra(airtable_id) {
  const p = rdState.properties.find(x => x.airtable_id === airtable_id);
  if (!p) return;

  // Cargar histórico + ejecución real desde weekly_activities (cruza por address/property_name)
  const [snapRes, wpRes] = await Promise.all([
    sb.from('remodel_snapshots').select('*').eq('airtable_id', airtable_id).order('snapshot_date', { ascending: true }),
    // Buscar por nombre/dirección — Airtable y weekly_activities suelen diferir en project_id
    sb.from('weekly_activities').select('*').or(`property_name.ilike.%${(p.address||'').slice(0,30)}%,property_name.ilike.%${(p.name||p.address||'').slice(0,30)}%`)
  ]);
  const history = snapRes.data || [];
  const wpActs = wpRes.data || [];

  // KPIs de ejecución real
  const ejecTotal = wpActs.length;
  const ejecDone = wpActs.filter(a => a.status === 'done').length;
  const ejecPct = ejecTotal ? Math.round(ejecDone/ejecTotal*100) : null;
  const ejecCriticas = wpActs.filter(a => (a.priority==='critical'||a.priority==='urgent'));
  const ejecCritDone = ejecCriticas.filter(a => a.status === 'done').length;
  const todayIsoObra = new Date().toISOString().slice(0,10);
  const ejecAtrasadas = wpActs.filter(a => a.status !== 'done' && a.status !== 'cancelled' && a.date && a.date < todayIsoObra);
  const ejecAplazadas = wpActs.filter(a => (a.notes||'').includes('[APLAZADA'));

  const cost = (p.gasto_materiales||0) + (p.gasto_trabajadores||0);
  const presup = p.presupuesto_interno || 0;
  const remaining = presup - cost;
  const matPct = (p.gasto_materiales||0)+(p.gasto_trabajadores||0) > 0 ? Math.round((p.gasto_materiales||0) / ((p.gasto_materiales||0)+(p.gasto_trabajadores||0)) * 100) : 0;

  const latestSnap = history[history.length-1];
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

      <!-- 🔗 EJECUCIÓN REAL desde Weekly Planner -->
      ${ejecTotal > 0 ? `
      <div class="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-xl p-3">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div class="text-xs font-bold uppercase text-blue-900">🔗 Ejecución real (Weekly Planner)</div>
          <div class="text-[10px] text-blue-700">${ejecTotal} actividades cruzadas por dirección</div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div class="bg-white rounded-lg p-2.5 border border-blue-200">
            <div class="text-[10px] uppercase text-slate-500 font-bold">% Plan ejecutado</div>
            <div class="text-base font-bold ${ejecPct>=80?'text-emerald-700':ejecPct>=50?'text-amber-700':'text-red-700'}">${ejecPct!=null?ejecPct+'%':'—'}</div>
            <div class="text-[10px] text-slate-500">${ejecDone}/${ejecTotal} hechas</div>
          </div>
          <div class="bg-white rounded-lg p-2.5 border border-blue-200">
            <div class="text-[10px] uppercase text-slate-500 font-bold">Ruta crítica</div>
            <div class="text-base font-bold ${ejecCriticas.length === 0 ? 'text-slate-400' : ejecCritDone === ejecCriticas.length ? 'text-emerald-700' : 'text-rose-700'}">${ejecCriticas.length>0?`${ejecCritDone}/${ejecCriticas.length}`:'—'}</div>
            <div class="text-[10px] text-slate-500">${ejecCriticas.length>0?'críticas hechas':'sin críticas'}</div>
          </div>
          <div class="bg-white rounded-lg p-2.5 border border-blue-200">
            <div class="text-[10px] uppercase text-slate-500 font-bold">Atrasadas</div>
            <div class="text-base font-bold ${ejecAtrasadas.length>0?'text-red-700':'text-emerald-700'}">${ejecAtrasadas.length}</div>
            <div class="text-[10px] text-slate-500">sin completar fecha</div>
          </div>
          <div class="bg-white rounded-lg p-2.5 border border-blue-200">
            <div class="text-[10px] uppercase text-slate-500 font-bold">Aplazadas</div>
            <div class="text-base font-bold ${ejecAplazadas.length>0?'text-amber-700':'text-slate-400'}">${ejecAplazadas.length}</div>
            <div class="text-[10px] text-slate-500">con motivo registrado</div>
          </div>
        </div>
        ${ejecAtrasadas.length > 0 || ejecAplazadas.length > 0 ? `
        <div class="mt-2 text-[10px] text-blue-700 italic">
          💡 Las cifras de avance del cronograma operativo pueden diferir del avance reportado en Airtable.
          ${ejecAtrasadas.length>0?` Hay ${ejecAtrasadas.length} tareas atrasadas en el planner.`:''}
        </div>` : ''}
        <div class="mt-2 flex justify-end">
          <button onclick="closeModal(); setTimeout(() => { const sys = rdState.sys; if (sys && typeof openWeeklyPlanner === 'function') { openWeeklyPlanner(sys); setTimeout(() => { if (typeof wpSetHouseFilter === 'function') wpSetHouseFilter('name:${(p.address||'').replace(/'/g,'')}'); }, 200); } }, 100)" class="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded">📅 Ver cronograma de esta casa →</button>
        </div>
      </div>` : ''}

      <!-- 💼 ANÁLISIS FINANCIERO COMPLETO -->
      ${(() => {
        const fin = rdFinanzas(p);
        const cfg = rdGetFinCfg();
        const colorMargen = (pct, hi, lo) => pct >= hi ? 'text-emerald-700' : pct >= lo ? 'text-amber-700' : 'text-red-700';
        const fmt = n => '$' + Math.round(n).toLocaleString();
        return `
        <div class="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300 rounded-xl p-3">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs font-bold uppercase text-slate-700">💼 Análisis financiero completo</div>
            <button onclick="rdOpenFinCfg()" class="text-[10px] bg-white border border-slate-300 hover:bg-slate-50 px-2 py-1 rounded font-semibold">⚙️ Editar tasas</button>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div class="bg-white rounded-lg p-2.5 border border-slate-200">
              <div class="text-[10px] uppercase text-slate-500 font-bold">Margen Bruto</div>
              <div class="text-base font-bold ${colorMargen(fin.margenBrutoPct, 25, 15)}">${fmt(fin.margenBruto)}</div>
              <div class="text-[10px] text-slate-500">${fin.margenBrutoPct.toFixed(1)}% sobre venta</div>
            </div>
            <div class="bg-white rounded-lg p-2.5 border border-slate-200">
              <div class="text-[10px] uppercase text-slate-500 font-bold">EBITDA</div>
              <div class="text-base font-bold ${colorMargen(fin.ebitdaPct, 15, 5)}">${fmt(fin.ebitda)}</div>
              <div class="text-[10px] text-slate-500">${fin.ebitdaPct.toFixed(1)}% · post-overhead</div>
            </div>
            <div class="bg-white rounded-lg p-2.5 border border-slate-200">
              <div class="text-[10px] uppercase text-slate-500 font-bold">EBIT</div>
              <div class="text-base font-bold ${colorMargen(fin.ebitPct, 12, 4)}">${fmt(fin.ebit)}</div>
              <div class="text-[10px] text-slate-500">${fin.ebitPct.toFixed(1)}% · post-depreciación</div>
            </div>
            <div class="bg-white rounded-lg p-2.5 border border-slate-200">
              <div class="text-[10px] uppercase text-slate-500 font-bold">Antes de impuestos</div>
              <div class="text-base font-bold ${colorMargen(fin.utilidadAntesImpPct, 10, 3)}">${fmt(fin.utilidadAntesImp)}</div>
              <div class="text-[10px] text-slate-500">${fin.utilidadAntesImpPct.toFixed(1)}% · post-intereses</div>
            </div>
            <div class="bg-white rounded-lg p-2.5 border border-slate-200">
              <div class="text-[10px] uppercase text-slate-500 font-bold">Impuestos (${cfg.tasa_impuestos_pct}%)</div>
              <div class="text-base font-bold text-red-700">−${fmt(fin.impuestos)}</div>
              <div class="text-[10px] text-slate-500">sobre utilidad gravable</div>
            </div>
            <div class="rounded-lg p-2.5 border-2 ${fin.margenNetoDespuesImpPct >= 5 ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-400'}">
              <div class="text-[10px] uppercase font-bold ${fin.margenNetoDespuesImpPct >= 5 ? 'text-emerald-800' : 'text-red-800'}">⭐ Neto post-impuestos</div>
              <div class="text-base font-bold ${fin.margenNetoDespuesImpPct >= 5 ? 'text-emerald-700' : 'text-red-700'}">${fmt(fin.utilidadNeta)}</div>
              <div class="text-[10px] ${fin.margenNetoDespuesImpPct >= 5 ? 'text-emerald-700' : 'text-red-700'}">${fin.margenNetoDespuesImpPct.toFixed(1)}% · objetivo 5-15% E.A.</div>
            </div>
          </div>
          <div class="text-[10px] text-slate-500 mt-2 italic">
            Overhead prorrateado: ${fmt(fin.overheadProrr)} · Depreciación: ${fmt(fin.depreciacionProrr)} · Intereses: ${fmt(fin.interesesProrr)} ·
            Días de obra: ${fin.dias} de 365 sobre ${cfg.obras_activas_promedio} obras paralelas
          </div>
        </div>

        <!-- 📋 Informes por hito de avance -->
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2">📋 Informes por hito de avance</div>
          <div class="text-[10px] text-slate-500 mb-2">Genera informe detallado con análisis de personal, gasto vs plan, ritmo y proyección al cierre.</div>
          <div class="flex flex-wrap gap-1">
            ${[10,25,50,75,90,100].map(h => {
              const llego = (p.avance_pct||0) >= h;
              return `<button onclick="rdOpenHitoReport('${p.airtable_id}', ${h})" class="text-xs px-2.5 py-1.5 rounded font-bold ${llego?'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300':'bg-slate-100 hover:bg-slate-200 text-slate-600'}">${llego?'✅':'·'} Hito ${h}%</button>`;
            }).join('')}
          </div>
        </div>
        `;
      })()}

      <!-- Forecast / Calculadora rápida (colapsada por defecto) -->
      <details class="bg-violet-50 border border-violet-200 rounded-xl overflow-hidden" id="rd-forecast-${p.airtable_id}">
        <summary class="cursor-pointer px-3 py-2 flex items-center justify-between hover:bg-violet-100">
          <div class="text-xs font-bold uppercase text-violet-900">🔮 Calculadora rápida · proyectar números finales</div>
          <div class="text-[10px] text-violet-700">click para abrir ▾</div>
        </summary>
        <div class="p-3 pt-2 border-t border-violet-200">
          <div class="text-[10px] text-violet-800 mb-2">Sumá gastos que vas a hacer hasta cerrar la obra y mirá cómo quedan los números finales. No se guarda en DB — sólo para que te hagas una idea.</div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            <div>
              <label class="block text-[9px] uppercase font-bold text-violet-900 mb-0.5">$ Materiales extra</label>
              <input id="fc-mat-${p.airtable_id}" type="number" min="0" step="100" value="0" oninput="rdForecastUpdate('${p.airtable_id}')" class="w-full border border-violet-300 rounded px-2 py-1 text-sm font-mono" placeholder="0"/>
            </div>
            <div>
              <label class="block text-[9px] uppercase font-bold text-violet-900 mb-0.5">$ Mano de obra extra</label>
              <input id="fc-lab-${p.airtable_id}" type="number" min="0" step="100" value="0" oninput="rdForecastUpdate('${p.airtable_id}')" class="w-full border border-violet-300 rounded px-2 py-1 text-sm font-mono" placeholder="0"/>
            </div>
            <div>
              <label class="block text-[9px] uppercase font-bold text-violet-900 mb-0.5">Días extra <span class="font-normal opacity-70">(opcional)</span></label>
              <input id="fc-days-${p.airtable_id}" type="number" min="0" step="1" value="0" oninput="rdForecastUpdate('${p.airtable_id}')" class="w-full border border-violet-300 rounded px-2 py-1 text-sm font-mono" placeholder="0"/>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white border border-violet-200 rounded-lg p-2">
            <div>
              <div class="text-[9px] uppercase text-slate-500 font-bold">Costo final proy.</div>
              <div id="fc-cost-${p.airtable_id}" class="text-base font-bold text-slate-900">$${Math.round(cost).toLocaleString()}</div>
              <div id="fc-cost-delta-${p.airtable_id}" class="text-[9px] text-slate-500">vs presup. $${Math.round(presup).toLocaleString()}</div>
            </div>
            <div>
              <div class="text-[9px] uppercase text-slate-500 font-bold">Ganancia final</div>
              <div id="fc-gain-${p.airtable_id}" class="text-base font-bold ${(p.valor_cliente||0)-cost>=0?'text-emerald-700':'text-red-700'}">$${Math.round((p.valor_cliente||0)-cost).toLocaleString()}</div>
              <div id="fc-gain-delta-${p.airtable_id}" class="text-[9px] text-slate-500">venta $${Math.round(p.valor_cliente||0).toLocaleString()}</div>
            </div>
            <div>
              <div class="text-[9px] uppercase text-slate-500 font-bold">Margen final</div>
              <div id="fc-margin-${p.airtable_id}" class="text-base font-bold">${(p.valor_cliente||0)>0 ? Math.round(((p.valor_cliente-cost)/p.valor_cliente)*1000)/10 : 0}%</div>
              <div id="fc-margin-bench-${p.airtable_id}" class="text-[9px] text-slate-500">objetivo ≥${BENCHMARKS_AUSTIN.margen_min}%</div>
            </div>
            <div>
              <div class="text-[9px] uppercase text-slate-500 font-bold">Entrega proy.</div>
              <div id="fc-date-${p.airtable_id}" class="text-base font-bold text-slate-900">${p.fecha_estimada_fin || '—'}</div>
              <div id="fc-date-delta-${p.airtable_id}" class="text-[9px] text-slate-500">sin días extra</div>
            </div>
          </div>

          <button onclick="rdForecastReset('${p.airtable_id}')" class="mt-2 text-[10px] text-violet-700 hover:text-violet-900 font-semibold">↺ Reset</button>
        </div>
      </details>

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

// ════════════════════════════════════════════════════════════
// 💼 TAB FINANZAS — EBITDA / EBIT / Neto post-impuestos empresa-wide
// ════════════════════════════════════════════════════════════
function rdRenderFinanzas(active, finalizada) {
  const cfg = rdGetFinCfg();
  const fmt = n => '$' + Math.round(n).toLocaleString();
  // Suma agregada activas + finalizadas para vista empresa
  const todas = [...active, ...finalizada];
  let revenue=0, costoDirecto=0, margenBruto=0, ebitda=0, ebit=0, utilidadAntesImp=0, impuestos=0, utilidadNeta=0;
  const perObra = todas.map(p => {
    const f = rdFinanzas(p, cfg);
    revenue += f.revenue; costoDirecto += f.costoDirecto; margenBruto += f.margenBruto;
    ebitda += f.ebitda; ebit += f.ebit;
    utilidadAntesImp += f.utilidadAntesImp; impuestos += f.impuestos; utilidadNeta += f.utilidadNeta;
    return { p, f };
  });
  const margenBrutoPct = revenue > 0 ? margenBruto/revenue*100 : 0;
  const ebitdaPct = revenue > 0 ? ebitda/revenue*100 : 0;
  const ebitPct = revenue > 0 ? ebit/revenue*100 : 0;
  const netoPct = revenue > 0 ? utilidadNeta/revenue*100 : 0;
  const color = (pct, hi, lo) => pct >= hi ? 'from-emerald-600 to-emerald-800' : pct >= lo ? 'from-amber-500 to-orange-700' : 'from-red-600 to-red-800';

  return `
    <div class="space-y-3">
      <!-- Hero EBITDA -->
      <div class="bg-gradient-to-br ${color(ebitdaPct, 15, 5)} text-white rounded-2xl p-5 shadow-lg">
        <div class="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div class="text-[10px] uppercase tracking-widest opacity-80 font-bold">Empresa · ${todas.length} obra(s) analizadas</div>
            <div class="text-3xl font-bold mt-1">${fmt(ebitda)} EBITDA</div>
            <div class="text-sm opacity-90 mt-1">${ebitdaPct.toFixed(1)}% sobre ${fmt(revenue)} de ingresos</div>
          </div>
          <button onclick="rdOpenFinCfg()" class="bg-white/20 hover:bg-white/30 text-xs font-bold px-3 py-2 rounded-lg backdrop-blur">⚙️ Editar tasas y supuestos</button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div class="bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20">
            <div class="text-[10px] uppercase opacity-80 font-bold">Margen Bruto</div>
            <div class="text-xl font-bold mt-1">${fmt(margenBruto)}</div>
            <div class="text-[11px] opacity-85">${margenBrutoPct.toFixed(1)}%</div>
          </div>
          <div class="bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20">
            <div class="text-[10px] uppercase opacity-80 font-bold">EBIT</div>
            <div class="text-xl font-bold mt-1">${fmt(ebit)}</div>
            <div class="text-[11px] opacity-85">${ebitPct.toFixed(1)}%</div>
          </div>
          <div class="bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20">
            <div class="text-[10px] uppercase opacity-80 font-bold">Impuestos (${cfg.tasa_impuestos_pct}%)</div>
            <div class="text-xl font-bold mt-1">−${fmt(impuestos)}</div>
            <div class="text-[11px] opacity-85">sobre utilidad gravable</div>
          </div>
          <div class="bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20">
            <div class="text-[10px] uppercase opacity-80 font-bold">⭐ Neto post-imp</div>
            <div class="text-xl font-bold mt-1">${fmt(utilidadNeta)}</div>
            <div class="text-[11px] opacity-85">${netoPct.toFixed(1)}% (obj 5-15%)</div>
          </div>
        </div>
      </div>

      <!-- Educación rápida -->
      <div class="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-900">
        <strong>📚 Cómo leerlo:</strong>
        Negocios EXCELENTES de fix & flip dan hasta <strong>25%</strong> de margen neto. Bien estructurado este negocio anda
        en <strong>5–15% E.A.</strong> post-impuestos. Si tu Neto está bajo del 5% hay fugas: overhead, mano de obra mal medida,
        o ventas bajas. EBITDA aísla la operación pura (sin depreciación, intereses, impuestos).
      </div>

      <!-- Detalle por obra -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase">Detalle por obra</div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr class="border-b border-slate-200">
                <th class="text-left p-2">Obra</th>
                <th class="text-right p-2">Revenue</th>
                <th class="text-right p-2">M. Bruto</th>
                <th class="text-right p-2">EBITDA</th>
                <th class="text-right p-2">EBIT</th>
                <th class="text-right p-2">Imp.</th>
                <th class="text-right p-2 bg-emerald-50">Neto</th>
                <th class="text-right p-2 bg-emerald-50">Neto %</th>
              </tr>
            </thead>
            <tbody>
              ${perObra.map(({p, f}) => `
                <tr class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="rdOpenObra('${p.airtable_id}')">
                  <td class="p-2 font-medium truncate max-w-[180px]">${(p.address||'—').replace(/</g,'&lt;')}</td>
                  <td class="p-2 text-right">${fmt(f.revenue)}</td>
                  <td class="p-2 text-right">${fmt(f.margenBruto)}</td>
                  <td class="p-2 text-right">${fmt(f.ebitda)}</td>
                  <td class="p-2 text-right">${fmt(f.ebit)}</td>
                  <td class="p-2 text-right text-red-700">−${fmt(f.impuestos)}</td>
                  <td class="p-2 text-right font-bold bg-emerald-50 ${f.utilidadNeta>=0?'text-emerald-800':'text-red-700'}">${fmt(f.utilidadNeta)}</td>
                  <td class="p-2 text-right font-bold bg-emerald-50 ${f.margenNetoDespuesImpPct>=5?'text-emerald-800':'text-red-700'}">${f.margenNetoDespuesImpPct.toFixed(1)}%</td>
                </tr>
              `).join('')}
              <tr class="border-t-2 border-slate-300 font-bold bg-slate-50">
                <td class="p-2">TOTAL EMPRESA</td>
                <td class="p-2 text-right">${fmt(revenue)}</td>
                <td class="p-2 text-right">${fmt(margenBruto)}</td>
                <td class="p-2 text-right">${fmt(ebitda)}</td>
                <td class="p-2 text-right">${fmt(ebit)}</td>
                <td class="p-2 text-right text-red-700">−${fmt(impuestos)}</td>
                <td class="p-2 text-right ${utilidadNeta>=0?'text-emerald-800':'text-red-700'}">${fmt(utilidadNeta)}</td>
                <td class="p-2 text-right ${netoPct>=5?'text-emerald-800':'text-red-700'}">${netoPct.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function rdOpenFinCfg() {
  const cfg = rdGetFinCfg();
  openModal('⚙️ Configuración financiera empresa', `
    <div class="space-y-3 text-sm">
      <div class="text-xs text-slate-600">Estos parámetros afectan TODOS los cálculos de EBITDA, EBIT y margen neto post-impuestos. Se guardan en tu navegador.</div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Tasa impuestos (%)</label>
          <input id="fc-tax" type="number" step="0.5" value="${cfg.tasa_impuestos_pct}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Obras paralelas promedio</label>
          <input id="fc-obras" type="number" min="1" value="${cfg.obras_activas_promedio}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Overhead anual ($)</label>
          <input id="fc-overhead" type="number" step="1000" value="${cfg.overhead_anual}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" title="Oficina, seguros, software, salarios admin"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Depreciación anual ($)</label>
          <input id="fc-dep" type="number" step="500" value="${cfg.depreciacion_anual}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" title="Camionetas, herramientas grandes — vida útil 5-7 años"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Amortización anual ($)</label>
          <input id="fc-amort" type="number" step="500" value="${cfg.amortizacion_anual}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" title="Intangibles (software, marca, licencias)"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Intereses préstamos anual ($)</label>
          <input id="fc-int" type="number" step="500" value="${cfg.interes_prestamos_anual}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" title="Costo financiero de líneas de crédito y préstamos"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">Cuadrilla mínima (personas)</label>
          <input id="fc-crew" type="number" min="1" value="${cfg.crew_min_personas}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" title="Tamaño esperado del crew por obra activa"/>
        </div>
      </div>
      <div class="bg-amber-50 border border-amber-300 rounded p-2 text-[11px] text-amber-900 flex items-start justify-between gap-2">
        <div>
          💡 La camioneta 4Runner típica se deprecia ~$8,000-$12,000/año. Herramientas grandes (compresores, sierras industriales) ~$3,000-$5,000/año.
          <br><strong>Modo auto:</strong> si listás activos individuales, la depreciación se calcula sola.
        </div>
        <button onclick="rdOpenActivos()" class="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded whitespace-nowrap">📦 Catálogo activos</button>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="rdSaveFinCfg()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">💾 Guardar</button>
      </div>
    </div>
  `);
}

function rdSaveFinCfg() {
  rdSetFinCfg({
    tasa_impuestos_pct: +document.getElementById('fc-tax').value || 21,
    obras_activas_promedio: Math.max(1, +document.getElementById('fc-obras').value || 3),
    overhead_anual: +document.getElementById('fc-overhead').value || 0,
    depreciacion_anual: +document.getElementById('fc-dep').value || 0,
    amortizacion_anual: +document.getElementById('fc-amort').value || 0,
    interes_prestamos_anual: +document.getElementById('fc-int').value || 0,
    crew_min_personas: Math.max(1, +document.getElementById('fc-crew').value || 3)
  });
  closeModal();
  rdRender();
}

// ─── Catálogo de activos: gestión visual ───
function rdOpenActivos() {
  const activos = rdGetActivos();
  const cfg = rdGetFinCfg();
  const depAuto = rdCalcDepreciacionFromActivos();
  const fmt = n => '$' + Math.round(n).toLocaleString();

  // Plantillas comunes para agregar rápido
  const plantillas = [
    { name: '🚙 Camioneta 4Runner / pickup', type: 'vehiculo', cost: 35000, vida: 5 },
    { name: '🚛 Camión utility / dump', type: 'vehiculo', cost: 28000, vida: 6 },
    { name: '🛠️ Compresor industrial', type: 'herramienta', cost: 2500, vida: 8 },
    { name: '⚡ Generador grande', type: 'herramienta', cost: 3000, vida: 7 },
    { name: '🪚 Sierra de mesa industrial', type: 'herramienta', cost: 1800, vida: 7 },
    { name: '🔨 Set de herramientas eléctricas', type: 'herramienta', cost: 4500, vida: 5 },
    { name: '📱 Software / licencias', type: 'intangible', cost: 5000, vida: 3 }
  ];

  openModal('📦 Catálogo de activos depreciables', `
    <div class="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
      <div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900">
        Registrá camionetas, herramientas grandes y equipos con su <strong>costo inicial</strong> y <strong>vida útil en años</strong>.
        La depreciación anual se calcula automáticamente y se aplica al EBITDA de la empresa.
      </div>

      <!-- Resumen -->
      <div class="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-300 rounded-xl p-3">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <div class="text-[10px] uppercase font-bold text-amber-800">Total invertido</div>
            <div class="text-xl font-bold text-amber-900">${fmt(activos.reduce((s,a) => s + (+a.cost_initial||0), 0))}</div>
          </div>
          <div>
            <div class="text-[10px] uppercase font-bold text-amber-800">Activos registrados</div>
            <div class="text-xl font-bold text-amber-900">${activos.length}</div>
          </div>
          <div>
            <div class="text-[10px] uppercase font-bold text-amber-800">⚙️ Depreciación auto / año</div>
            <div class="text-xl font-bold text-amber-900">${fmt(depAuto)}</div>
          </div>
        </div>
        <label class="flex items-center gap-2 mt-2 text-xs cursor-pointer">
          <input type="checkbox" ${cfg.activos_auto?'checked':''} onchange="rdToggleActivosAuto(this.checked)"/>
          <span>Usar este valor automáticamente para EBITDA (modo auto). Si destildás, podés escribir un número manual en la config financiera.</span>
        </label>
      </div>

      <!-- Plantillas rápidas -->
      <div>
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">⚡ Agregar rápido (plantillas comunes)</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          ${plantillas.map((t, i) => `
            <button onclick='rdAddActivoFromTemplate(${i})' class="text-left border border-slate-200 hover:border-violet-400 hover:bg-violet-50 rounded p-2 text-xs">
              <div class="font-semibold">${t.name}</div>
              <div class="text-[10px] text-slate-500">${fmt(t.cost)} · ${t.vida}a vida útil · ≈${fmt(t.cost/t.vida)}/año</div>
            </button>
          `).join('')}
        </div>
      </div>
      <script>window._rdActivosPlantillas = ${JSON.stringify(plantillas)};</script>

      <!-- Tabla de activos -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase flex items-center justify-between">
          <span>📋 Activos registrados</span>
          <button onclick="rdAddActivoBlank()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded">+ Nuevo activo</button>
        </div>
        ${activos.length === 0 ? '<div class="p-6 text-center text-slate-400 text-sm">Sin activos registrados. Usá las plantillas o + Nuevo activo.</div>' : `
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr class="border-b border-slate-200">
              <th class="text-left p-2">Nombre</th>
              <th class="text-left p-2 w-24">Tipo</th>
              <th class="text-right p-2 w-28">Costo</th>
              <th class="text-right p-2 w-20">Vida</th>
              <th class="text-right p-2 w-28">Dep./año</th>
              <th class="p-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            ${activos.map((a, idx) => {
              const depAnual = a.vida_util_anios > 0 ? (a.cost_initial || 0) / a.vida_util_anios : 0;
              return `
                <tr class="border-t border-slate-100">
                  <td class="p-1"><input type="text" value="${(a.name||'').replace(/"/g,'&quot;')}" onchange="rdEditActivo(${idx}, 'name', this.value)" class="w-full border border-slate-200 rounded px-1.5 py-1 text-xs"/></td>
                  <td class="p-1">
                    <select onchange="rdEditActivo(${idx}, 'type', this.value)" class="w-full border border-slate-200 rounded px-1 py-1 text-xs">
                      <option value="vehiculo" ${a.type==='vehiculo'?'selected':''}>🚙 Vehículo</option>
                      <option value="herramienta" ${a.type==='herramienta'?'selected':''}>🔨 Herramienta</option>
                      <option value="equipo" ${a.type==='equipo'?'selected':''}>⚙️ Equipo</option>
                      <option value="intangible" ${a.type==='intangible'?'selected':''}>💾 Intangible</option>
                      <option value="otro" ${a.type==='otro'?'selected':''}>📦 Otro</option>
                    </select>
                  </td>
                  <td class="p-1"><input type="number" min="0" step="100" value="${a.cost_initial||0}" onchange="rdEditActivo(${idx}, 'cost_initial', this.value)" class="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right"/></td>
                  <td class="p-1"><input type="number" min="1" step="1" value="${a.vida_util_anios||5}" onchange="rdEditActivo(${idx}, 'vida_util_anios', this.value)" class="w-full border border-slate-200 rounded px-1.5 py-1 text-xs text-right"/></td>
                  <td class="p-2 text-right text-slate-700 font-semibold">${fmt(depAnual)}</td>
                  <td class="p-1 text-center"><button onclick="rdRemoveActivo(${idx})" class="text-red-600 hover:bg-red-100 px-1.5 py-0.5 rounded font-bold">✕</button></td>
                </tr>`;
            }).join('')}
            <tr class="border-t-2 border-slate-300 bg-slate-50 font-bold">
              <td colspan="2" class="p-2 text-right">TOTAL</td>
              <td class="p-2 text-right">${fmt(activos.reduce((s,a) => s + (+a.cost_initial||0), 0))}</td>
              <td></td>
              <td class="p-2 text-right text-emerald-700">${fmt(depAuto)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>`}
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200 sticky bottom-0 bg-white">
        <button onclick="rdOpenFinCfg()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">← Volver a config</button>
        <button onclick="closeModal()" class="flex-1 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2 rounded">✓ Listo</button>
      </div>
    </div>
  `);
}

function rdAddActivoFromTemplate(i) {
  const t = window._rdActivosPlantillas[i];
  const activos = rdGetActivos();
  activos.push({ name: t.name, type: t.type, cost_initial: t.cost, vida_util_anios: t.vida, fecha_compra: null });
  rdSetActivos(activos);
  rdOpenActivos();
}

function rdAddActivoBlank() {
  const activos = rdGetActivos();
  activos.push({ name: 'Nuevo activo', type: 'herramienta', cost_initial: 1000, vida_util_anios: 5, fecha_compra: null });
  rdSetActivos(activos);
  rdOpenActivos();
}

function rdEditActivo(idx, field, value) {
  const activos = rdGetActivos();
  if (!activos[idx]) return;
  activos[idx][field] = ['cost_initial','vida_util_anios'].includes(field) ? Math.max(0, +value || 0) : value;
  rdSetActivos(activos);
  // Si modo auto está activo, refrescar el render del dashboard de fondo
  if (rdGetFinCfg().activos_auto) {
    // No re-abrir modal, solo refrescar el total
    const depAuto = rdCalcDepreciacionFromActivos();
    const tots = document.querySelectorAll('.font-bold.text-amber-900');
    // Refrescar dashboard si está visible
    if (typeof rdRender === 'function') setTimeout(() => rdRender(), 100);
  }
}

function rdRemoveActivo(idx) {
  if (!confirm('¿Eliminar este activo del catálogo?')) return;
  const activos = rdGetActivos();
  activos.splice(idx, 1);
  rdSetActivos(activos);
  rdOpenActivos();
}

function rdToggleActivosAuto(checked) {
  rdSetFinCfg({ activos_auto: checked });
  if (typeof rdRender === 'function') rdRender();
}

// ════════════════════════════════════════════════════════════
// 🧑‍🔧 TAB PERSONAL — rendimiento de cuadrillas
// Detecta cuadrillas incompletas (1-2 personas cuando deberían ser 3-4)
// y mide productividad: avance/día/persona
// ════════════════════════════════════════════════════════════
function rdRenderPersonal(active) {
  const cfg = rdGetFinCfg();
  const min = cfg.crew_min_personas;
  // Por cada obra activa: contar personas asignadas (lider + ayudantes)
  const rows = active.map(p => {
    // Heurística simple — Airtable suele tener un solo campo 'lider' + 'crew_count' o 'crew' jsonb
    const lider = p.lider || null;
    const crewSize = +p.crew_size || +p.crew_count || (lider ? 1 : 0) + (+p.ayudantes || 0);
    const personas = Math.max(crewSize, lider ? 1 : 0);
    const sqft = +p.sqft || 0;
    const avance = +p.avance_pct || 0;
    const dias = p.fecha_inicio
      ? Math.max(1, Math.round((new Date() - new Date(p.fecha_inicio)) / 86400000))
      : null;
    // sqft de avance por persona-día (productividad)
    const prod = dias && personas > 0
      ? Math.round((sqft * avance/100) / (dias * personas) * 10) / 10
      : null;
    const okSize = personas >= min;
    return { p, lider, personas, sqft, avance, dias, prod, okSize };
  }).sort((a,b) => (a.okSize ? 1 : 0) - (b.okSize ? 1 : 0));

  const incompletas = rows.filter(r => !r.okSize).length;

  return `
    <div class="space-y-3">
      <div class="bg-gradient-to-br ${incompletas>0?'from-red-600 to-red-800':'from-emerald-600 to-emerald-800'} text-white rounded-xl p-4">
        <div class="text-sm uppercase tracking-wider opacity-80 font-bold">Rendimiento del personal</div>
        <div class="text-2xl font-bold mt-1">${incompletas>0 ? `⚠️ ${incompletas} obra(s) con cuadrilla incompleta` : `✅ Todas las cuadrillas en tamaño`}</div>
        <div class="text-sm opacity-90 mt-1">Tamaño mínimo esperado: ${min} personas (configurable en ⚙️ tasas)</div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase">Cuadrillas por obra</div>
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr class="border-b border-slate-200">
              <th class="text-left p-2">Obra</th>
              <th class="text-left p-2">Líder</th>
              <th class="text-center p-2">Personas</th>
              <th class="text-right p-2">SqFt</th>
              <th class="text-right p-2">Días</th>
              <th class="text-right p-2">Avance</th>
              <th class="text-right p-2">SqFt / pers / día</th>
              <th class="text-left p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr class="border-t border-slate-100 ${!r.okSize?'bg-red-50':''} hover:bg-slate-50 cursor-pointer" onclick="rdOpenObra('${r.p.airtable_id}')">
                <td class="p-2 font-medium truncate max-w-[180px]">${(r.p.address||'—').replace(/</g,'&lt;')}</td>
                <td class="p-2">${(r.lider||'—').replace(/</g,'&lt;')}</td>
                <td class="p-2 text-center font-bold ${r.okSize?'text-emerald-700':'text-red-700'}">${r.personas} / ${min}</td>
                <td class="p-2 text-right">${r.sqft||'—'}</td>
                <td class="p-2 text-right">${r.dias||'—'}</td>
                <td class="p-2 text-right">${r.avance}%</td>
                <td class="p-2 text-right">${r.prod!=null?r.prod:'—'}</td>
                <td class="p-2">${r.okSize?'<span class="text-emerald-700 font-bold">✅ OK</span>':'<span class="text-red-700 font-bold">⚠️ Incompleta · agregar '+(min-r.personas)+' persona(s)</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
        <strong>💡 Cómo leer:</strong> La columna SqFt/persona/día mide productividad real. Un equipo balanceado en obras
        medianas hace ~50-80 SqFt/persona/día. Si un crew rinde menos de 30, hay sobreasignación o líder solo.
        Si un crew tiene 1-2 personas en una obra grande, suelen aparecer atrasos y sobrecostos en mano de obra.
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
// 🔍 TAB COMPARAR — comparativa de 2 obras lado a lado
// Compara $/sqft, días, productividad, márgenes
// ════════════════════════════════════════════════════════════
function rdRenderComparar(active, finalizada) {
  const todas = [...active, ...finalizada].sort((a,b) => (a.address||'').localeCompare(b.address||''));
  if (!rdState.cmpA) rdState.cmpA = todas[0]?.airtable_id || null;
  if (!rdState.cmpB) rdState.cmpB = todas[1]?.airtable_id || null;
  const A = todas.find(p => p.airtable_id === rdState.cmpA);
  const B = todas.find(p => p.airtable_id === rdState.cmpB);
  const cfg = rdGetFinCfg();

  const opts = todas.map(p => `<option value="${p.airtable_id}">${(p.address||'—').replace(/</g,'&lt;')}</option>`).join('');

  if (!A || !B) {
    return '<div class="text-center text-slate-400 py-12">Necesitás al menos 2 obras cargadas para comparar.</div>';
  }

  const fA = rdFinanzas(A, cfg), fB = rdFinanzas(B, cfg);
  const kA = rdAdvancedKPIs(A), kB = rdAdvancedKPIs(B);

  const dollar = n => '$' + Math.round(n).toLocaleString();
  const sqftA = +A.sqft || 0, sqftB = +B.sqft || 0;
  const costPerSqftA = sqftA > 0 ? fA.costoDirecto/sqftA : null;
  const costPerSqftB = sqftB > 0 ? fB.costoDirecto/sqftB : null;
  const revPerSqftA = sqftA > 0 ? fA.revenue/sqftA : null;
  const revPerSqftB = sqftB > 0 ? fB.revenue/sqftB : null;

  // Helper: badge de "mejor"
  const winner = (a, b, higherIsBetter) => {
    if (a == null || b == null) return ['', ''];
    if (Math.abs(a-b) < 0.001) return ['', ''];
    const aWins = higherIsBetter ? a > b : a < b;
    return aWins ? ['🏆','—'] : ['—','🏆'];
  };
  const row = (label, valA, valB, higherIsBetter, fmt) => {
    fmt = fmt || (x => x);
    const [bA, bB] = winner(valA, valB, higherIsBetter);
    return `
      <tr class="border-t border-slate-100">
        <td class="p-2 font-semibold text-slate-700">${label}</td>
        <td class="p-2 text-right ${bA==='🏆'?'bg-emerald-50 font-bold text-emerald-800':''}">${valA!=null?fmt(valA):'—'} ${bA==='🏆'?'🏆':''}</td>
        <td class="p-2 text-right ${bB==='🏆'?'bg-emerald-50 font-bold text-emerald-800':''}">${valB!=null?fmt(valB):'—'} ${bB==='🏆'?'🏆':''}</td>
      </tr>
    `;
  };

  return `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <label class="block text-[10px] uppercase font-bold text-blue-900 mb-1">Casa A</label>
          <select onchange="rdState.cmpA=this.value; rdRender()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-semibold">${opts.replace(`value="${rdState.cmpA}"`, `value="${rdState.cmpA}" selected`)}</select>
        </div>
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-3">
          <label class="block text-[10px] uppercase font-bold text-violet-900 mb-1">Casa B</label>
          <select onchange="rdState.cmpB=this.value; rdRender()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-semibold">${opts.replace(`value="${rdState.cmpB}"`, `value="${rdState.cmpB}" selected`)}</select>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table class="w-full text-xs">
          <thead class="bg-slate-100">
            <tr>
              <th class="text-left p-2 w-1/3">Métrica</th>
              <th class="text-right p-2 w-1/3">${(A.address||'A').replace(/</g,'&lt;')}</th>
              <th class="text-right p-2 w-1/3">${(B.address||'B').replace(/</g,'&lt;')}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="bg-slate-50"><td colspan="3" class="p-2 text-[10px] uppercase font-bold text-slate-600">🏠 Tamaño y plazo</td></tr>
            ${row('SqFt', sqftA, sqftB, true, x => x.toLocaleString())}
            ${row('Días totales obra', fA.dias, fB.dias, false)}
            ${row('Líder', null, null, true)}
            <tr class="border-t border-slate-100">
              <td class="p-2 font-semibold text-slate-700">Líder</td>
              <td class="p-2 text-right">${(A.lider||'—').replace(/</g,'&lt;')}</td>
              <td class="p-2 text-right">${(B.lider||'—').replace(/</g,'&lt;')}</td>
            </tr>
            <tr class="bg-slate-50"><td colspan="3" class="p-2 text-[10px] uppercase font-bold text-slate-600">💵 Costo y revenue</td></tr>
            ${row('Costo directo total', fA.costoDirecto, fB.costoDirecto, false, dollar)}
            ${row('Revenue cliente', fA.revenue, fB.revenue, true, dollar)}
            ${row('Costo / SqFt', costPerSqftA, costPerSqftB, false, x => '$'+x.toFixed(1))}
            ${row('Revenue / SqFt', revPerSqftA, revPerSqftB, true, x => '$'+x.toFixed(1))}
            ${row('Labor / costo (%)', kA.labor_ratio, kB.labor_ratio, false, x => x+'%')}
            <tr class="bg-slate-50"><td colspan="3" class="p-2 text-[10px] uppercase font-bold text-slate-600">⚙️ Operación</td></tr>
            ${row('Eficiencia gasto (% esperado)', kA.eficiencia_gasto, kB.eficiencia_gasto, false, x => x+'%')}
            ${row('Ejecución presupuesto (%)', kA.ejecucion_pct, kB.ejecucion_pct, false, x => x+'%')}
            ${(() => {
              const velA = sqftA > 0 && fA.dias > 0 ? sqftA / fA.dias : null;
              const velB = sqftB > 0 && fB.dias > 0 ? sqftB / fB.dias : null;
              return row('Velocity SqFt/día', velA, velB, true, x => x.toFixed(1));
            })()}
            ${(() => {
              const costPerDayA = fA.dias > 0 ? fA.costoDirecto / fA.dias : null;
              const costPerDayB = fB.dias > 0 ? fB.costoDirecto / fB.dias : null;
              return row('Burn rate ($/día)', costPerDayA, costPerDayB, false, dollar);
            })()}
            ${row('Días de retraso', kA.dias_retraso, kB.dias_retraso, false)}
            ${row('Sobre presupuesto (%)', kA.sobre_presupuesto_pct, kB.sobre_presupuesto_pct, false, x => (x>0?'+':'')+x+'%')}
            <tr class="bg-slate-50"><td colspan="3" class="p-2 text-[10px] uppercase font-bold text-slate-600">📊 Resultados</td></tr>
            ${row('Margen Bruto %', fA.margenBrutoPct, fB.margenBrutoPct, true, x => x.toFixed(1)+'%')}
            ${row('EBITDA', fA.ebitda, fB.ebitda, true, dollar)}
            ${row('EBITDA %', fA.ebitdaPct, fB.ebitdaPct, true, x => x.toFixed(1)+'%')}
            ${row('Neto post-impuestos', fA.utilidadNeta, fB.utilidadNeta, true, dollar)}
            ${row('Margen neto %', fA.margenNetoDespuesImpPct, fB.margenNetoDespuesImpPct, true, x => x.toFixed(1)+'%')}
          </tbody>
        </table>
      </div>

      <!-- Resumen comparativo en lenguaje natural -->
      ${(() => {
        const ganA = fA.margenNetoDespuesImpPct >= fB.margenNetoDespuesImpPct;
        const wins = ganA ? A : B;
        const loses = ganA ? B : A;
        const winF = ganA ? fA : fB;
        const loseF = ganA ? fB : fA;
        const deltaPct = Math.abs(winF.margenNetoDespuesImpPct - loseF.margenNetoDespuesImpPct);
        const deltaUSD = Math.abs(winF.utilidadNeta - loseF.utilidadNeta);
        const insights = [];
        if (deltaPct > 0.5) insights.push(`<strong>${wins.address}</strong> dejó <strong>${dollar(deltaUSD)}</strong> más de utilidad neta (${deltaPct.toFixed(1)}pp más de margen).`);
        if (sqftA && sqftB && Math.abs(sqftA-sqftB) > 200) {
          const chica = sqftA < sqftB ? A : B;
          const grande = sqftA < sqftB ? B : A;
          insights.push(`${chica.address} es ${Math.abs(sqftA-sqftB)} SqFt más chica que ${grande.address} — comparar márgenes a igual escala revela ineficiencias.`);
        }
        if (kA.labor_ratio != null && kB.labor_ratio != null && Math.abs(kA.labor_ratio - kB.labor_ratio) > 5) {
          const altoLab = kA.labor_ratio > kB.labor_ratio ? A : B;
          insights.push(`${altoLab.address} gastó más en mano de obra proporcionalmente (${Math.max(kA.labor_ratio, kB.labor_ratio)}%). Revisar productividad del crew.`);
        }
        if (fA.dias && fB.dias && Math.abs(fA.dias - fB.dias) > 14) {
          const lenta = fA.dias > fB.dias ? A : B;
          insights.push(`${lenta.address} tardó ${Math.abs(fA.dias - fB.dias)} días más. Diferencia de ${dollar(Math.abs(fA.dias - fB.dias) * (winF.costoDirecto/Math.max(1,winF.dias)))} en burn rate equivalente.`);
        }
        if (insights.length === 0) return '';
        return `
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-3">
          <div class="text-xs font-bold uppercase text-violet-900 mb-2">💡 Análisis comparativo</div>
          <ul class="space-y-1 text-xs text-violet-900">
            ${insights.map(i => `<li>• ${i}</li>`).join('')}
          </ul>
        </div>`;
      })()}

      <div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900">
        <strong>💡 Cómo leer:</strong> 🏆 marca a la obra que ganó esa métrica. Comparando $/SqFt podés ver cuál fue
        más eficiente; comparando Revenue/SqFt cuál se vendió mejor. Si la casa más chica tiene mejor margen %, hay
        algo que está jugando — busca el delta en labor/costo o tiempos.
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
// 📋 INFORME POR HITO DE AVANCE — 10/25/50/75/90/100%
// ════════════════════════════════════════════════════════════
function rdOpenHitoReport(airtableId, hito) {
  const p = rdState.properties.find(x => x.airtable_id === airtableId);
  if (!p) return;
  const k = rdAdvancedKPIs(p);
  const f = rdFinanzas(p);
  const dollar = n => '$' + Math.round(n).toLocaleString();
  const avance = p.avance_pct || 0;
  const llego = avance >= hito;
  const proyMatLab = hito > 0 ? (((+p.gasto_materiales||0) + (+p.gasto_trabajadores||0)) / Math.max(1, avance)) * 100 : 0;
  const proyTotalCost = (avance > 0 && hito > 0) ? proyMatLab : 0;
  const proyDias = p.fecha_inicio && avance > 0
    ? Math.round(((new Date() - new Date(p.fecha_inicio)) / 86400000) * (100 / avance))
    : null;
  const proyGanancia = (+p.valor_cliente||0) - proyTotalCost;
  const proyMargenPct = (+p.valor_cliente||0) > 0 ? proyGanancia / (+p.valor_cliente) * 100 : 0;

  openModal(`📋 Informe @ ${hito}% — ${p.address}`, `
    <div class="space-y-3">
      <div class="bg-gradient-to-br ${llego?'from-emerald-600 to-emerald-800':'from-slate-700 to-slate-900'} text-white rounded-xl p-4">
        <div class="text-[10px] uppercase opacity-80 font-bold">Análisis del hito ${hito}%</div>
        <div class="text-xl font-bold mt-1">${llego?'✅ HITO ALCANZADO':'⏳ Hito proyectado'}</div>
        <div class="text-xs opacity-90">${p.address}</div>
        <div class="text-sm mt-2 opacity-90">Avance real: <strong>${avance}%</strong> · Líder: <strong>${p.lider||'—'}</strong></div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">🎯 Proyección al cierre (extrapolando el ritmo actual)</div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="bg-slate-50 rounded p-2"><div class="text-[10px] uppercase text-slate-500 font-bold">Costo final proy.</div><div class="text-base font-bold">${dollar(proyTotalCost)}</div></div>
          <div class="bg-slate-50 rounded p-2"><div class="text-[10px] uppercase text-slate-500 font-bold">Ganancia proy.</div><div class="text-base font-bold ${proyGanancia>=0?'text-emerald-700':'text-red-700'}">${dollar(proyGanancia)}</div></div>
          <div class="bg-slate-50 rounded p-2"><div class="text-[10px] uppercase text-slate-500 font-bold">Margen proy.</div><div class="text-base font-bold ${proyMargenPct>=20?'text-emerald-700':proyMargenPct>=10?'text-amber-700':'text-red-700'}">${proyMargenPct.toFixed(1)}%</div></div>
          <div class="bg-slate-50 rounded p-2"><div class="text-[10px] uppercase text-slate-500 font-bold">Duración proy.</div><div class="text-base font-bold">${proyDias||'—'} días</div></div>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">📊 Análisis para la gerencia</div>
        <ul class="space-y-1.5 text-xs text-slate-700">
          <li>• <strong>Eficiencia gasto:</strong> ${k.eficiencia_gasto!=null?k.eficiencia_gasto+'% del esperado':'—'} ${k.eficiencia_gasto != null && k.eficiencia_gasto <= 100 ? '✅' : k.eficiencia_gasto > 120 ? '🔴 sobre-gastando' : '⚠️'}</li>
          <li>• <strong>Ratio labor:</strong> ${k.labor_ratio||'—'}% ${k.labor_ratio > 60 ? '🔴 sobre benchmark' : '✅'}</li>
          <li>• <strong>Días de retraso:</strong> ${k.dias_retraso!=null?(k.dias_retraso>0?`🔴 ${k.dias_retraso}d retraso`:`✅ ${-k.dias_retraso}d restantes`):'—'}</li>
          <li>• <strong>Margen actual:</strong> ${k.margen_venta!=null?k.margen_venta+'%':'—'} (objetivo ≥${BENCHMARKS_AUSTIN.margen_min}%)</li>
          <li>• <strong>EBITDA actual:</strong> ${dollar(f.ebitda)} (${f.ebitdaPct.toFixed(1)}%)</li>
          <li>• <strong>Neto post-impuestos:</strong> ${dollar(f.utilidadNeta)} (${f.margenNetoDespuesImpPct.toFixed(1)}%)</li>
        </ul>
      </div>

      <div class="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900">
        <strong>🎯 Foco gerencial para cierre de semana:</strong>
        ${k.dias_retraso > 5 ? `<div>• Recuperar plazo: la obra lleva ${k.dias_retraso}d de retraso, considerá refuerzo de crew o doble turno.</div>`:''}
        ${k.eficiencia_gasto > 120 ? '<div>• Auditar gasto: estás 20%+ sobre lo esperado para tu avance. Revisar cotizaciones de materiales y horas de cuadrilla.</div>':''}
        ${proyMargenPct < BENCHMARKS_AUSTIN.margen_min ? `<div>• Margen proyectado bajo (${proyMargenPct.toFixed(1)}%): renegociar materiales o ajustar scope con cliente.</div>`:''}
        ${k.flags.length === 0 && proyMargenPct >= BENCHMARKS_AUSTIN.margen_min ? '<div>• Sin alertas — mantener ritmo. Documentar buenas prácticas para Estimador Pro.</div>':''}
      </div>

      <button onclick="window.print()" class="w-full bg-slate-900 text-white text-sm font-bold py-2 rounded">🖨️ Imprimir / Guardar PDF</button>
    </div>
  `);
}

// ════════════════════════════════════════════════════════════
// 📊 EDITOR DE PRESENTACIÓN — configurar antes de generar PPTX
// Permite elegir slides, escribir noticias, seleccionar obras destacadas
// y agregar narrativa antes de exportar el .pptx
// ════════════════════════════════════════════════════════════
const rdPPTXConfig = {
  titulo: 'Informe Ejecutivo Remodelación',
  subtitulo: 'Reunión semanal de gerencia',
  autor: 'Rental Profitss',
  slides: {
    cover: true,
    kpis: true,
    pl: true,
    alertas: true,
    noticias: true,
    decisiones: true,
    cierre: true
  },
  noticiasMd: '',
  decisionesMd: '',
  obrasDestacadas: [] // airtable_ids
};

function rdOpenPPTXEditor() {
  // Cargar config persistida
  try {
    const saved = localStorage.getItem('rd_pptx_cfg');
    if (saved) Object.assign(rdPPTXConfig, JSON.parse(saved));
  } catch {}

  const active = rdState.properties.filter(p => p.proceso === 'En obra' || p.proceso === 'En venta');
  const fecha = new Date().toLocaleDateString('es', { day:'numeric', month:'long', year:'numeric' });
  const defaultNoticias = rdPPTXConfig.noticiasMd || `• Caso Garden — describir incidente, impacto y plan de acción
• Material en escasez / cambios de precios
• Cambios en cuadrilla / nuevas contrataciones
• Eventos del mercado Austin TX`;

  const defaultDecisiones = rdPPTXConfig.decisionesMd || `• Aprobar refuerzo de crew en obras críticas
• Renegociar materiales con proveedor X
• Revisar pricing para próximas obras
• Próximos pasos para la semana entrante`;

  openModal('📊 Configurar presentación ejecutiva', `
    <div class="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
      <div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900">
        Configurá la presentación antes de generarla. Todo lo que escribas acá queda guardado para la próxima vez.
        El .pptx se puede seguir editando en PowerPoint o Keynote después.
      </div>

      <!-- Metadatos -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">📋 Datos generales</div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Título</label>
            <input id="pptx-titulo" type="text" value="${rdPPTXConfig.titulo.replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Subtítulo</label>
            <input id="pptx-subtitulo" type="text" value="${rdPPTXConfig.subtitulo.replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
          </div>
        </div>
        <div class="text-[10px] text-slate-500 mt-1">Fecha automática: ${fecha}</div>
      </div>

      <!-- Selector de slides -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">📑 Slides a incluir</div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-xs">
          ${[
            ['cover','🎨 Portada'],
            ['kpis','💰 KPIs financieros'],
            ['pl','📊 P&L por obra'],
            ['alertas','🚨 Alertas críticas'],
            ['noticias','📰 Noticias y eventos'],
            ['decisiones','✅ Decisiones tomadas'],
            ['cierre','🙏 Cierre']
          ].map(([key, label]) => `
            <label class="flex items-center gap-1.5 border border-slate-200 rounded px-2 py-1.5 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" id="pptx-slide-${key}" ${rdPPTXConfig.slides[key]?'checked':''}/>
              <span>${label}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Obras destacadas -->
      ${active.length > 0 ? `
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-bold uppercase text-slate-600">⭐ Destacar obras (opcional)</div>
          <div class="text-[10px] text-slate-500">Si marcás 1+, aparecen en slide propio</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs max-h-32 overflow-y-auto">
          ${active.map(p => `
            <label class="flex items-center gap-1.5 border border-slate-200 rounded px-2 py-1 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" data-pptx-obra="${p.airtable_id}" ${rdPPTXConfig.obrasDestacadas.includes(p.airtable_id)?'checked':''}/>
              <span class="truncate">${(p.address||'—').replace(/</g,'&lt;')}</span>
            </label>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- Noticias / Eventos -->
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div class="flex items-center justify-between mb-1">
          <div class="text-xs font-bold uppercase text-amber-900">📰 Noticias y eventos importantes</div>
          <div class="text-[10px] text-amber-700">Un punto por línea</div>
        </div>
        <textarea id="pptx-noticias" rows="6" class="w-full border border-amber-300 rounded px-2 py-1.5 text-sm font-mono">${defaultNoticias.replace(/</g,'&lt;')}</textarea>
      </div>

      <!-- Decisiones tomadas -->
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <div class="flex items-center justify-between mb-1">
          <div class="text-xs font-bold uppercase text-emerald-900">✅ Decisiones tomadas / Próximos pasos</div>
          <div class="text-[10px] text-emerald-700">Un punto por línea</div>
        </div>
        <textarea id="pptx-decisiones" rows="5" class="w-full border border-emerald-300 rounded px-2 py-1.5 text-sm font-mono">${defaultDecisiones.replace(/</g,'&lt;')}</textarea>
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200 sticky bottom-0 bg-white">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="rdGeneratePPTXFromEditor()" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 rounded">📊 Generar .pptx</button>
      </div>
    </div>
  `);
  // Ensanchar modal
  const inner = document.querySelector('#modal > div');
  if (inner) {
    ['max-w-sm','max-w-md','max-w-lg','max-w-xl','max-w-2xl','max-w-3xl','max-w-5xl','max-w-7xl'].forEach(c => inner.classList.remove(c));
    inner.classList.add('max-w-3xl');
  }
}

function rdGeneratePPTXFromEditor() {
  // Recoger config
  rdPPTXConfig.titulo = document.getElementById('pptx-titulo').value || 'Informe Ejecutivo';
  rdPPTXConfig.subtitulo = document.getElementById('pptx-subtitulo').value || '';
  ['cover','kpis','pl','alertas','noticias','decisiones','cierre'].forEach(k => {
    rdPPTXConfig.slides[k] = document.getElementById('pptx-slide-'+k).checked;
  });
  rdPPTXConfig.noticiasMd = document.getElementById('pptx-noticias').value || '';
  rdPPTXConfig.decisionesMd = document.getElementById('pptx-decisiones').value || '';
  rdPPTXConfig.obrasDestacadas = Array.from(document.querySelectorAll('[data-pptx-obra]:checked')).map(el => el.getAttribute('data-pptx-obra'));

  try { localStorage.setItem('rd_pptx_cfg', JSON.stringify(rdPPTXConfig)); } catch {}
  closeModal();
  setTimeout(() => rdGeneratePPTX(), 100);
}

// ════════════════════════════════════════════════════════════
// 📊 GENERAR PRESENTACIÓN PPTX — para reuniones de gerencia
// Usa la config de rdPPTXConfig (editada por rdOpenPPTXEditor)
// ════════════════════════════════════════════════════════════
async function rdGeneratePPTX() {
  if (typeof PptxGenJS === 'undefined') {
    alert('Librería PptxGenJS no disponible. Refrescá la página.');
    return;
  }
  const active = rdState.properties.filter(p => p.proceso === 'En obra' || p.proceso === 'En venta');
  const finalizada = rdState.properties.filter(p => p.proceso === 'Finalizado');
  const finCfg = rdGetFinCfg();

  // Cálculos agregados
  const todas = [...active, ...finalizada];
  let revenue=0, ebitda=0, utilidadNeta=0, gananciaActivas=0;
  todas.forEach(p => {
    const f = rdFinanzas(p, finCfg);
    revenue += f.revenue; ebitda += f.ebitda; utilidadNeta += f.utilidadNeta;
  });
  active.forEach(p => { gananciaActivas += (+p.valor_cliente||0) - ((+p.gasto_materiales||0)+(+p.gasto_trabajadores||0)); });
  const gananciaHistorica = finalizada.reduce((s,p) => s + (+p.ganancia||0), 0);

  const activeKpis = active.map(p => ({ p, k: rdAdvancedKPIs(p) }));
  const criticas = activeKpis.filter(x => x.k.estado === 'critico');
  const sanas = activeKpis.filter(x => x.k.estado === 'sano');
  const fmt = n => '$' + Math.round(n).toLocaleString();

  const cfg = rdPPTXConfig;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = cfg.autor;
  pptx.company = 'Rental Profitss';
  pptx.title = cfg.titulo;

  // ─── COVER ───
  if (cfg.slides.cover) {
    const s = pptx.addSlide();
    s.background = { color: '0F172A' };
    s.addText(cfg.subtitulo || 'Reunión semanal de gerencia', { x:0.5, y:1.2, w:12.3, h:0.8, fontSize:28, color:'94A3B8' });
    s.addText(cfg.titulo, { x:0.5, y:2.0, w:12.3, h:1.5, fontSize:54, color:'FFFFFF', bold:true });
    s.addText(`${active.length} obras activas · ${finalizada.length} finalizadas · ${new Date().toLocaleDateString('es')}`, { x:0.5, y:3.8, w:12.3, h:0.5, fontSize:18, color:'CBD5E1' });
    s.addText('Agua Construction Group · Structure One · Flipping Rentals', { x:0.5, y:6.5, w:12.3, h:0.4, fontSize:14, color:'64748B' });
  }

  // ─── KPIs HERO ───
  if (cfg.slides.kpis) {
    const s = pptx.addSlide();
    s.addText('Resumen Financiero', { x:0.5, y:0.3, w:12.3, h:0.6, fontSize:28, bold:true, color:'0F172A' });
    const kpis = [
      { title:'Revenue total', value: fmt(revenue), sub:`${todas.length} obras` },
      { title:'EBITDA empresa', value: fmt(ebitda), sub:`${revenue>0?(ebitda/revenue*100).toFixed(1):0}% sobre revenue` },
      { title:'Neto post-impuestos', value: fmt(utilidadNeta), sub:`${revenue>0?(utilidadNeta/revenue*100).toFixed(1):0}% (obj 5-15%)` },
      { title:'Ganancia histórica', value: fmt(gananciaHistorica), sub:`${finalizada.length} flips cerrados` }
    ];
    kpis.forEach((k, i) => {
      const x = 0.5 + (i % 2) * 6.4;
      const y = 1.2 + Math.floor(i/2) * 2.5;
      s.addShape(pptx.ShapeType.roundRect, { x, y, w:6.0, h:2.2, fill:{color:'F1F5F9'}, line:{color:'CBD5E1', width:1}, rectRadius:0.1 });
      s.addText(k.title.toUpperCase(), { x:x+0.3, y:y+0.2, w:5.4, h:0.4, fontSize:12, bold:true, color:'64748B' });
      s.addText(k.value, { x:x+0.3, y:y+0.6, w:5.4, h:1.0, fontSize:36, bold:true, color:'0F172A' });
      s.addText(k.sub, { x:x+0.3, y:y+1.6, w:5.4, h:0.4, fontSize:14, color:'64748B' });
    });
  }

  // ─── P&L POR OBRA ───
  if (cfg.slides.pl && activeKpis.length > 0) {
    const s = pptx.addSlide();
    s.addText('Ganancias y pérdidas por obra activa', { x:0.5, y:0.3, w:12.3, h:0.6, fontSize:28, bold:true });
    const rowsPL = [['Obra','Líder','Revenue','Costo','Ganancia','Margen %']];
    activeKpis.forEach(({p, k}) => {
      rowsPL.push([
        (p.address||'').slice(0,35),
        p.lider||'—',
        fmt(+p.valor_cliente||0),
        fmt(k.totalCost),
        fmt(k.ganancia||0),
        (k.margen_venta!=null?k.margen_venta+'%':'—')
      ]);
    });
    s.addTable(rowsPL, { x:0.5, y:1.2, w:12.3, fontSize:11, border:{type:'solid', pt:0.5, color:'CBD5E1'},
      colW:[3.5, 1.8, 1.8, 1.8, 1.8, 1.6], fill:{color:'F8FAFC'} });
  }

  // ─── ALERTAS CRÍTICAS ───
  if (cfg.slides.alertas && criticas.length > 0) {
    const s = pptx.addSlide();
    s.addText(`Alertas críticas (${criticas.length})`, { x:0.5, y:0.3, w:12.3, h:0.6, fontSize:28, bold:true, color:'B91C1C' });
    criticas.slice(0, 6).forEach((x, i) => {
      const y = 1.2 + i * 0.85;
      s.addShape(pptx.ShapeType.roundRect, { x:0.5, y, w:12.3, h:0.75, fill:{color:'FEF2F2'}, line:{color:'FCA5A5', width:1}, rectRadius:0.05 });
      s.addText(`⚠ ${x.p.address}`, { x:0.7, y:y+0.05, w:11.9, h:0.35, fontSize:16, bold:true, color:'991B1B' });
      s.addText(x.k.flags.map(f => rdFlagLabel(f, x.k)).join(' · '), { x:0.7, y:y+0.4, w:11.9, h:0.3, fontSize:12, color:'7F1D1D' });
    });
  }

  // ─── OBRAS DESTACADAS ───
  if (cfg.obrasDestacadas && cfg.obrasDestacadas.length > 0) {
    cfg.obrasDestacadas.forEach(airtableId => {
      const p = rdState.properties.find(x => x.airtable_id === airtableId);
      if (!p) return;
      const k = rdAdvancedKPIs(p);
      const f = rdFinanzas(p);
      const s = pptx.addSlide();
      s.addText('🏠 Obra destacada', { x:0.5, y:0.3, w:12.3, h:0.4, fontSize:14, color:'64748B', bold:true });
      s.addText(p.address || '—', { x:0.5, y:0.7, w:12.3, h:0.8, fontSize:30, bold:true, color:'0F172A' });
      s.addText(`Líder: ${p.lider||'—'} · ${p.avance_pct||0}% avance · ${k.dias_retraso!=null?(k.dias_retraso>0?k.dias_retraso+'d retraso':-k.dias_retraso+'d restantes'):'—'}`, { x:0.5, y:1.5, w:12.3, h:0.4, fontSize:14, color:'475569' });
      const rows = [
        ['Revenue', fmt(+p.valor_cliente||0)],
        ['Costo directo', fmt(k.totalCost)],
        ['Margen Bruto', fmt(f.margenBruto)+' ('+f.margenBrutoPct.toFixed(1)+'%)'],
        ['EBITDA', fmt(f.ebitda)+' ('+f.ebitdaPct.toFixed(1)+'%)'],
        ['Neto post-impuestos', fmt(f.utilidadNeta)+' ('+f.margenNetoDespuesImpPct.toFixed(1)+'%)'],
        ['Eficiencia gasto', k.eficiencia_gasto!=null?k.eficiencia_gasto+'%':'—'],
        ['Labor / costo', (k.labor_ratio||0)+'%']
      ];
      s.addTable(rows.map(r => [{text:r[0], options:{bold:true, fill:'F1F5F9'}}, r[1]]), { x:0.5, y:2.1, w:12.3, fontSize:14, border:{type:'solid', pt:0.5, color:'CBD5E1'}, colW:[4, 8.3] });
    });
  }

  // ─── NOTICIAS / EVENTOS ───
  if (cfg.slides.noticias) {
    const s = pptx.addSlide();
    s.addText('Noticias y eventos importantes', { x:0.5, y:0.3, w:12.3, h:0.6, fontSize:28, bold:true });
    const items = (cfg.noticiasMd||'').split('\n').filter(l => l.trim()).map(l => l.replace(/^[-•*]\s*/, ''));
    if (items.length === 0) {
      s.addText('(Sin noticias registradas)', { x:0.5, y:1.5, w:12.3, h:0.5, fontSize:16, italic:true, color:'94A3B8' });
    } else {
      items.slice(0, 10).forEach((txt, i) => {
        const y = 1.5 + i * 0.55;
        s.addText('• ' + txt, { x:0.7, y, w:11.8, h:0.5, fontSize:16, color:'1E293B', valign:'middle' });
      });
    }
  }

  // ─── DECISIONES TOMADAS ───
  if (cfg.slides.decisiones) {
    const s = pptx.addSlide();
    s.addText('Decisiones tomadas / Próximos pasos', { x:0.5, y:0.3, w:12.3, h:0.6, fontSize:28, bold:true, color:'047857' });
    const items = (cfg.decisionesMd||'').split('\n').filter(l => l.trim()).map(l => l.replace(/^[-•*]\s*/, ''));
    if (items.length === 0) {
      s.addText('(Sin decisiones registradas)', { x:0.5, y:1.5, w:12.3, h:0.5, fontSize:16, italic:true, color:'94A3B8' });
    } else {
      items.slice(0, 10).forEach((txt, i) => {
        const y = 1.5 + i * 0.55;
        s.addText('✓ ' + txt, { x:0.7, y, w:11.8, h:0.5, fontSize:16, color:'064E3B', valign:'middle' });
      });
    }
  }

  // ─── CIERRE ───
  if (cfg.slides.cierre) {
    const s = pptx.addSlide();
    s.background = { color: '0F172A' };
    s.addText('Gracias', { x:0.5, y:2.5, w:12.3, h:1.5, fontSize:64, bold:true, color:'FFFFFF', align:'center' });
    s.addText(cfg.autor + ' · Empresa OS', { x:0.5, y:4.3, w:12.3, h:0.5, fontSize:18, color:'94A3B8', align:'center' });
  }

  const safeTitle = cfg.titulo.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
  await pptx.writeFile({ fileName: `${safeTitle}_${new Date().toISOString().slice(0,10)}.pptx` });
}

// ════════════════════════════════════════════════════════════
// 📱 VISTA CEO MOBILE — pantalla full screen
// El dueño abre desde su celular y ve estado portfolio, KPIs hero,
// alertas críticas, top 3 decisiones, lista de obras. Acciones táctiles.
// ════════════════════════════════════════════════════════════
function rdOpenCeoMobile() {
  rdRenderCeoMobile();
}

function rdRenderCeoMobile() {
  const active = rdState.properties.filter(p => p.proceso === 'En obra' || p.proceso === 'En venta');
  const finalizada = rdState.properties.filter(p => p.proceso === 'Finalizado');
  const finCfg = rdGetFinCfg();
  const fmt = n => '$' + Math.round(n).toLocaleString();
  const fmtK = n => '$' + Math.round(n/1000) + 'k';

  // Empresa-wide finanzas
  const todas = [...active, ...finalizada];
  let revenue=0, ebitda=0, utilidadNeta=0;
  todas.forEach(p => { const f = rdFinanzas(p, finCfg); revenue+=f.revenue; ebitda+=f.ebitda; utilidadNeta+=f.utilidadNeta; });
  const gananciaPipeline = active.reduce((s,p) => s + ((+p.valor_cliente||0) - ((+p.gasto_materiales||0)+(+p.gasto_trabajadores||0))), 0);
  const gananciaHistorica = finalizada.reduce((s,p) => s + (+p.ganancia||0), 0);
  const ebitdaPct = revenue > 0 ? (ebitda/revenue*100).toFixed(1) : '0';
  const netoPct = revenue > 0 ? (utilidadNeta/revenue*100).toFixed(1) : '0';

  // Status portfolio
  const activeKpis = active.map(p => ({ p, k: rdAdvancedKPIs(p), acciones: rdAccionesRequeridas(p, rdAdvancedKPIs(p)) }));
  const criticas = activeKpis.filter(x => x.k.estado === 'critico');
  const advertencias = activeKpis.filter(x => x.k.estado === 'advertencia');
  const sanas = activeKpis.filter(x => x.k.estado === 'sano');

  let estado, color, icon, msg;
  if (criticas.length > 0) {
    estado = 'ALERTAS CRÍTICAS'; color = 'from-red-600 to-red-800'; icon = '🔴';
    msg = `${criticas.length} proyecto${criticas.length>1?'s':''} requiere${criticas.length>1?'n':''} tu atención hoy.`;
  } else if (advertencias.length > 0) {
    estado = 'OPERACIÓN ESTABLE'; color = 'from-amber-500 to-amber-700'; icon = '🟡';
    msg = `${advertencias.length} señal${advertencias.length>1?'es':''} de advertencia.`;
  } else {
    estado = 'PORTAFOLIO SANO'; color = 'from-emerald-600 to-emerald-800'; icon = '✅';
    msg = 'Todos los proyectos dentro de parámetros.';
  }

  // Top 3 decisiones
  const decisiones = [];
  criticas.slice(0, 2).forEach(x => decisiones.push({
    tipo: 'CRÍTICO', titulo: x.p.address, detalle: x.k.flags.map(f => rdFlagLabel(f, x.k)).join(' · '),
    color: 'red', airtable_id: x.p.airtable_id
  }));
  advertencias.slice(0, 3 - decisiones.length).forEach(x => decisiones.push({
    tipo: 'ADVERTENCIA', titulo: x.p.address, detalle: x.k.flags.map(f => rdFlagLabel(f, x.k)).join(' · ') || 'Revisar variables',
    color: 'amber', airtable_id: x.p.airtable_id
  }));
  if (decisiones.length === 0) decisiones.push({ tipo: 'TODO OK', titulo: 'Sin acciones urgentes', detalle: 'Mantener disciplina de registro semanal.', color: 'emerald' });

  // Overlay full screen
  let overlay = document.getElementById('rd-ceo-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'rd-ceo-overlay';
    overlay.className = 'fixed inset-0 bg-slate-100 z-[60] overflow-y-auto';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="min-h-full flex flex-col">
      <!-- Hero sticky -->
      <div class="bg-gradient-to-br ${color} text-white p-4 shadow-xl">
        <div class="flex items-center justify-between mb-3">
          <button onclick="rdCloseCeoMobile()" class="bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm font-bold">✕ Salir</button>
          <div class="text-center flex-1">
            <div class="text-[10px] uppercase opacity-75 font-bold tracking-wider">Vista CEO</div>
            <div class="text-sm opacity-90">${new Date().toLocaleDateString('es', { day:'numeric', month:'long' })}</div>
          </div>
          <button onclick="rdCeoMobileShare()" class="bg-emerald-500 hover:bg-emerald-600 rounded-lg px-3 py-2 text-sm font-bold">📤</button>
        </div>
        <div class="text-center">
          <div class="text-4xl">${icon}</div>
          <div class="text-xl font-bold mt-1">${estado}</div>
          <div class="text-sm opacity-90 mt-1">${msg}</div>
        </div>
        <!-- Distribución -->
        <div class="grid grid-cols-3 gap-2 mt-4">
          <div class="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div class="text-[10px] uppercase opacity-80 font-bold">Críticas</div>
            <div class="text-2xl font-bold">${criticas.length}</div>
          </div>
          <div class="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div class="text-[10px] uppercase opacity-80 font-bold">Advertencias</div>
            <div class="text-2xl font-bold">${advertencias.length}</div>
          </div>
          <div class="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div class="text-[10px] uppercase opacity-80 font-bold">Sanas</div>
            <div class="text-2xl font-bold">${sanas.length}</div>
          </div>
        </div>
      </div>

      <!-- KPIs Financieros -->
      <div class="p-3 grid grid-cols-2 gap-2 max-w-2xl mx-auto w-full">
        <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div class="text-[10px] uppercase text-slate-500 font-bold">💰 Pipeline ganancia</div>
          <div class="text-xl font-bold text-slate-900 mt-0.5">${fmtK(gananciaPipeline)}</div>
          <div class="text-[10px] text-slate-500">${active.length} obras activas</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div class="text-[10px] uppercase text-slate-500 font-bold">📊 EBITDA</div>
          <div class="text-xl font-bold text-slate-900 mt-0.5">${fmtK(ebitda)}</div>
          <div class="text-[10px] text-slate-500">${ebitdaPct}% sobre revenue</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div class="text-[10px] uppercase text-slate-500 font-bold">⭐ Neto post-imp</div>
          <div class="text-xl font-bold ${utilidadNeta>=0?'text-emerald-700':'text-red-700'} mt-0.5">${fmtK(utilidadNeta)}</div>
          <div class="text-[10px] text-slate-500">${netoPct}% (obj 5-15%)</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div class="text-[10px] uppercase text-slate-500 font-bold">🏁 Histórico</div>
          <div class="text-xl font-bold text-slate-900 mt-0.5">${fmtK(gananciaHistorica)}</div>
          <div class="text-[10px] text-slate-500">${finalizada.length} flips cerrados</div>
        </div>
      </div>

      <!-- Top 3 decisiones -->
      <div class="px-3 pb-3 max-w-2xl mx-auto w-full">
        <div class="text-xs uppercase tracking-wider font-bold text-slate-500 px-1 mb-2">🎯 Hoy decidís</div>
        <div class="space-y-2">
          ${decisiones.map((d, i) => `
            <button onclick="${d.airtable_id?`rdCloseCeoMobile(); setTimeout(()=>rdOpenObra('${d.airtable_id}'), 200)`:''}" class="w-full text-left bg-white border-l-4 ${d.color==='red'?'border-red-500':d.color==='amber'?'border-amber-500':'border-emerald-500'} border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition">
              <div class="flex items-center gap-3">
                <div class="text-3xl font-black ${d.color==='red'?'text-red-700':d.color==='amber'?'text-amber-700':'text-emerald-700'}">${i+1}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase tracking-wider font-bold ${d.color==='red'?'text-red-700':d.color==='amber'?'text-amber-700':'text-emerald-700'}">${d.tipo}</div>
                  <div class="font-bold text-sm text-slate-900 truncate">${d.titulo}</div>
                  <div class="text-xs text-slate-600 line-clamp-2">${d.detalle}</div>
                </div>
                ${d.airtable_id?'<span class="text-slate-400 text-lg">›</span>':''}
              </div>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Lista de obras compacta -->
      <div class="px-3 pb-3 max-w-2xl mx-auto w-full">
        <div class="text-xs uppercase tracking-wider font-bold text-slate-500 px-1 mb-2">🏠 Todas las obras (${active.length})</div>
        <div class="space-y-1.5">
          ${activeKpis.sort((a,b) => ({critico:0,advertencia:1,sano:2}[a.k.estado] - ({critico:0,advertencia:1,sano:2}[b.k.estado]))).map(({p, k}) => {
            const avance = p.avance_pct || 0;
            const avanceColor = avance >= 75 ? 'bg-emerald-500' : avance >= 40 ? 'bg-blue-500' : avance > 0 ? 'bg-amber-500' : 'bg-slate-300';
            const dot = k.estado === 'critico' ? '🔴' : k.estado === 'advertencia' ? '🟡' : '🟢';
            return `
              <button onclick="rdCloseCeoMobile(); setTimeout(()=>rdOpenObra('${p.airtable_id}'), 200)" class="w-full text-left bg-white border border-slate-200 rounded-xl p-2.5 active:bg-slate-50">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-base">${dot}</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-sm text-slate-900 truncate">${(p.address||'—').replace(/</g,'&lt;')}</div>
                    <div class="text-[10px] text-slate-500 truncate">${p.lider||'Sin líder'}${k.dias_retraso!=null?(k.dias_retraso>0?` · ⏰ ${k.dias_retraso}d`:` · ${-k.dias_retraso}d restantes`):''}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-bold ${k.ganancia>=0?'text-emerald-700':'text-red-700'}">${fmtK(k.ganancia)}</div>
                    <div class="text-[10px] text-slate-500">${k.margen_venta!=null?(k.margen_venta>0?'+':'')+k.margen_venta+'%':'—'}</div>
                  </div>
                </div>
                <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="${avanceColor} h-full" style="width:${avance}%"></div>
                </div>
              </button>`;
          }).join('')}
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-white border-t-2 border-slate-200 p-3 grid grid-cols-2 gap-2 shadow-lg">
        <button onclick="rdCeoMobileShare()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-xl">📤 Compartir</button>
        <button onclick="rdCloseCeoMobile()" class="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-3 rounded-xl">✕ Cerrar</button>
      </div>
    </div>
  `;
}

function rdCloseCeoMobile() {
  const o = document.getElementById('rd-ceo-overlay');
  if (o) o.remove();
}

function rdCeoMobileShare() {
  const active = rdState.properties.filter(p => p.proceso === 'En obra' || p.proceso === 'En venta');
  const finalizada = rdState.properties.filter(p => p.proceso === 'Finalizado');
  const finCfg = rdGetFinCfg();
  const fmtK = n => '$' + Math.round(n/1000) + 'k';
  let revenue=0, ebitda=0, utilidadNeta=0;
  [...active, ...finalizada].forEach(p => { const f = rdFinanzas(p, finCfg); revenue+=f.revenue; ebitda+=f.ebitda; utilidadNeta+=f.utilidadNeta; });
  const gananciaPipeline = active.reduce((s,p) => s + ((+p.valor_cliente||0) - ((+p.gasto_materiales||0)+(+p.gasto_trabajadores||0))), 0);

  const activeKpis = active.map(p => ({ p, k: rdAdvancedKPIs(p) }));
  const criticas = activeKpis.filter(x => x.k.estado === 'critico');
  const advertencias = activeKpis.filter(x => x.k.estado === 'advertencia');

  const base = window.location.origin + window.location.pathname;
  const url = `${base}?rd_mode=ceo`;

  let msg = `📊 *RESUMEN PORTFOLIO · ${new Date().toLocaleDateString('es',{day:'numeric',month:'long'}).toUpperCase()}*\n\n`;
  msg += `🏗️ Activas: ${active.length} · Finalizadas: ${finalizada.length}\n`;
  msg += `💰 Pipeline: ${fmtK(gananciaPipeline)}\n`;
  msg += `📊 EBITDA: ${fmtK(ebitda)}\n`;
  msg += `⭐ Neto post-imp: ${fmtK(utilidadNeta)}\n\n`;
  if (criticas.length > 0) {
    msg += `🔴 *CRÍTICAS (${criticas.length})*\n`;
    criticas.slice(0,5).forEach(x => msg += `• ${x.p.address}\n`);
    msg += '\n';
  }
  if (advertencias.length > 0) {
    msg += `🟡 *ADVERTENCIAS (${advertencias.length})*\n`;
    advertencias.slice(0,3).forEach(x => msg += `• ${x.p.address}\n`);
    msg += '\n';
  }
  msg += `📱 Ver dashboard completo:\n${url}`;

  openModal('📤 Compartir resumen CEO', `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-200 rounded p-2 text-xs">
        Link al dashboard CEO: <code class="text-[10px]">${url}</code>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Mensaje (editable)</label>
        <textarea id="rd-ceo-share-msg" rows="14" class="w-full border border-violet-300 rounded p-2 text-xs font-mono">${msg.replace(/</g,'&lt;')}</textarea>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">📞 Número (opcional)</label>
        <input id="rd-ceo-share-phone" type="text" placeholder="521555..." class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="(()=>{const m=document.getElementById('rd-ceo-share-msg').value;const p=(document.getElementById('rd-ceo-share-phone').value||'').replace(/[^0-9]/g,'');const u=p?\`https://wa.me/\${p}?text=\${encodeURIComponent(m)}\`:\`https://wa.me/?text=\${encodeURIComponent(m)}\`;window.open(u,'_blank');closeModal();})()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">💬 WhatsApp</button>
      </div>
    </div>
  `);
}

// Auto-abrir desde URL ?rd_mode=ceo
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('rd_mode') === 'ceo') {
      const tryOpen = () => {
        if (typeof rdState !== 'undefined' && rdState.properties && rdState.properties.length > 0) {
          rdOpenCeoMobile();
        } else {
          setTimeout(tryOpen, 800);
        }
      };
      setTimeout(tryOpen, 1500);
    }
  });
}
