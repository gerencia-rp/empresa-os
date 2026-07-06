// ════════════════════════════════════════════════════════════════
// 🔨 COMMAND CENTER DE REMODELACIÓN
// Reemplaza el "Dashboard de Obras" (11 tabs) con una vista coherente al patrón de los
// Command Centers de Rentas y Fix & Flip: KPIs + secciones, glass premium claro/oscuro,
// Cerebro de obra, guard de calidad (obras en curso NO se muestran como final) y
// "Ver ficha de casa" por obra. SOLO LECTURA de datos (lee el mirror de Airtable en vivo).
// Reusa la lógica valiosa del Dashboard (KPIs histórico, performance por líder, alertas,
// Pull Airtable) sin tocar su código (remodel-dashboard.js sigue intacto).
// ════════════════════════════════════════════════════════════════
const RC = { sys: null, section: 'command', obras: [], alerts: [], syncLog: null, names: {}, loading: false, chat: [] };
window.RC = RC;
const RC_FN_URL = () => `${window.SUPABASE_URL}/functions/v1/sync-remodel-airtable`;
function RC_M(n) { return (typeof posMoney === 'function') ? posMoney(n) : '$' + Math.round(n || 0).toLocaleString(); }
function RC_K(n) { return (typeof posMoneyK === 'function') ? posMoneyK(n) : RC_M(n); }
function RC_E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function rcShort(a) { return String(a || '').split(',')[0].trim(); }

// ─── Diseño: reusa la CSS del FF Command Center re-scopeada a #rc-overlay (misma DNA visual) ───
function rcInjectCSS() {
  if (document.getElementById('rc-styles')) return;
  if (typeof ffInjectCSS === 'function') ffInjectCSS(); // garantiza que exista la fuente
  const src = document.getElementById('ff-styles');
  const st = document.createElement('style'); st.id = 'rc-styles';
  const base = src ? src.textContent.replace(/#ff-overlay/g, '#rc-overlay') : '';
  st.textContent = base + `
  #rc-overlay .lidbar{height:6px;border-radius:6px;background:var(--glassb);overflow:hidden;margin-top:6px}#rc-overlay .lidbar i{display:block;height:100%;background:linear-gradient(90deg,var(--a1),var(--a2))}
  #rc-overlay .alertrow{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--glassb)}#rc-overlay .alertrow:last-child{border-bottom:none}
  #rc-overlay .adot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0}#rc-overlay .adot.r{background:var(--neg)}#rc-overlay .adot.y{background:var(--amber)}
  #rc-overlay .pullbtn{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#04121a;font-weight:750;padding:8px 15px;border-radius:20px;cursor:pointer;font-size:11.5px}#rc-overlay .pullbtn:hover{filter:brightness(1.08)}#rc-overlay .pullbtn:disabled{opacity:.6;cursor:wait}#rc-overlay .rc-hide{display:none}#rc-overlay .ptable tr[onclick]:hover td{background:var(--glass)}`;
  document.head.appendChild(st);
}

// ─── Entrada / carga ───
async function openRemodelCommandCenter(sys) {
  RC.sys = sys; RC.section = 'command';
  rcInjectCSS();
  let ov = document.getElementById('rc-overlay');
  if (!ov) { ov = document.createElement('div'); ov.id = 'rc-overlay'; document.body.appendChild(ov); }
  if (typeof posApplyTheme === 'function') posApplyTheme(ov);
  ov.innerHTML = '<div class="bgfx"></div><div class="gridfx"></div><div class="app"><aside class="side"></aside><main class="main"><div style="padding:60px;color:#5b6780">⏳ Conectando con Airtable Remodelación…</div></main></div><button class="pos-theme-btn" onclick="rcToggleTheme()" title="Tema claro/oscuro">◐</button><button class="ffclose" onclick="closeRemodelCommandCenter()" title="Cerrar">✕</button>';
  document.body.style.overflow = 'hidden';
  await rcLoadAll();
  rcRender();
}
window.openRemodelCommandCenter = openRemodelCommandCenter;
function closeRemodelCommandCenter() { const ov = document.getElementById('rc-overlay'); if (ov) ov.remove(); document.body.style.overflow = ''; }
window.closeRemodelCommandCenter = closeRemodelCommandCenter;
function rcToggleTheme() { if (typeof posToggleTheme === 'function') posToggleTheme(); rcRender(); }
window.rcToggleTheme = rcToggleTheme;

async function rcLoadAll() {
  try {
    const [p, a, l, names, crews, hrs, parity, overhead, okrs, calibC, calibE, presup, scPct, ledger, vivo, receipts] = await Promise.all([
      sb.from('remodel_at_properties').select('*').eq('active', true).order('proceso').order('avance_pct', { ascending: true }),
      sb.from('remodel_alerts').select('*').is('resolved_at', null).order('severity').then(r => r).catch(() => ({ data: [] })),
      sb.from('remodel_sync_log').select('*').order('synced_at', { ascending: false }).limit(1).then(r => r).catch(() => ({ data: [] })),
      sb.from('airtable_record_names').select('record_id, name').then(r => r.data || []).catch(() => []),
      sb.from('remodel_crew_rates').select('airtable_id, nombre, pago_x_hora').then(r => r.data || []).catch(() => []),
      sb.from('remodel_worker_pay_summary').select('casa_norm, horas').then(r => r.data || []).catch(() => []),
      sb.from('remodel_sync_parity').select('*').eq('source', 'remodel_at_properties').maybeSingle().then(r => r.data).catch(() => null),
      sb.from('remodel_overhead').select('source, monto, categoria').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('remodel_okrs').select('*').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('v_remodel_calib_costos').select('*').then(r => r.data || []).catch(() => []),
      sb.from('v_remodel_calib_etapas').select('*').then(r => r.data || []).catch(() => []),
      sb.from('v_remodel_presupuesto_casa').select('*').then(r => r.data || []).catch(() => []),
      sb.from('remodel_forecast_params').select('key, value').eq('key', 'alerta_sobrecosto_pct').maybeSingle().then(r => r.data).catch(() => null),
      sb.from('v_remodel_nomina_ledger').select('*').then(r => r.data || []).catch(() => []),
      sb.from('v_remodel_avance_vivo').select('*').then(r => r.data || []).catch(() => []),
      sb.from('remodel_payroll_receipts').select('id, fecha_pago, periodo_ini, periodo_fin, casa, lider, total, estado, airtable_writeback').eq('active', true).order('created_at', { ascending: false }).limit(20).then(r => r.data || []).catch(() => [])
    ]);
    RC.names = {}; (names || []).forEach(n => { RC.names[n.record_id] = n.name; });
    (crews || []).forEach(c => { if (c.airtable_id && c.nombre) RC.names[c.airtable_id] = c.nombre; });
    RC.casaHoras = {}; (hrs || []).forEach(x => { if (x.casa_norm) RC.casaHoras[x.casa_norm] = (RC.casaHoras[x.casa_norm] || 0) + (+x.horas || 0); });
    RC.obras = (p.data || []).map(o => ({ ...o, lider: rcResolveName(o.lider), avance_pct: (o.avance_real != null ? +o.avance_real : o.avance_pct) })); // avance del Planner (v_remodel_progress) si existe
    RC.alerts = a.data || [];
    RC.syncLog = (l.data && l.data[0]) || null;
    RC.parity = parity || null;
    RC.overhead = overhead || [];
    RC.okrs = okrs || [];
    RC.calibCostos = calibC || []; RC.calibEtapas = calibE || [];
    RC.presupCasa = presup || [];
    RC.sobrecostoPct = scPct ? +scPct.value : 10;
    RC.ledger = ledger || [];
    RC.avanceVivo = vivo || [];
    RC.crewRates = crews || [];
    RC.receipts = receipts || [];
  } catch (e) { RC.obras = RC.obras || []; }
}
function rcResolveName(v) {
  if (Array.isArray(v)) return v.map(rcResolveName).filter(Boolean).join(', ');
  if (typeof v === 'string' && v.includes(',')) return v.split(',').map(x => rcResolveName(x.trim())).filter(Boolean).join(', ');
  if (typeof v === 'string' && /^rec[A-Za-z0-9]{14,20}$/.test(v)) return RC.names[v] || v;
  return v || '';
}

// ─── Guard de calidad por obra ───
function rcDQ(o) {
  const mat = +o.gasto_materiales || 0, lab = +o.gasto_trabajadores || 0, gasto = mat + lab;
  const presup = +o.presupuesto_interno || 0, fin = o.proceso === 'Finalizado';
  const sinDatos = !(gasto > 0) && !(+o.valor_cliente > 0);
  const sobrePresup = presup > 0 && gasto > presup * (1 + ((RC.sobrecostoPct != null ? RC.sobrecostoPct : 10) / 100));
  return { fin, enCurso: !fin && !sinDatos, sinDatos, sobrePresup, confiable: fin && gasto > 0, gasto, presup, mat, lab };
}

function rcObraHoras(o) {
  const na = String(o.address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ch = RC.casaHoras || {};
  for (const cn in ch) { if (cn && cn.length >= 4 && na.includes(cn)) return ch[cn]; }
  return 0;
}
// Capa financiera (una sola definición): ingreso (draws) vs costo_real (Valor Remodelación) vs presupuesto.
function rcFin(o) {
  const mat = +o.gasto_materiales || 0, lab = +o.gasto_trabajadores || 0;
  const ingreso = +o.monto_real || 0;              // Monto Real Remodelación (Draws − Intereses − Servicios − Muebles)
  const costoReal = (mat + lab) * 1.05;            // Valor Remodelación = (Gasto trab + Gasto mat) × 1.05
  const presupuesto = +o.presupuesto_interno || 0; // Presupuesto Remodelación
  return { mat, lab, ingreso, costoReal, presupuesto, margen: ingreso - costoReal, devCostoPct: presupuesto > 0 ? (costoReal - presupuesto) / presupuesto * 100 : null };
}
function rcObraDataset() {
  return (RC.obras || []).map(o => {
    const ff = rcFin(o); const sq = +o.sqft || 0; const dq = rcDQ(o);
    return {
      address: o.address, lider: o.lider || '—', estado: o.proceso || null, ciudad: o.city || null, sqft: sq,
      ingreso: ff.ingreso, costo_real: ff.costoReal, presupuesto: ff.presupuesto, utilidad: +o.ganancia || 0,
      margen: ff.ingreso > 0 ? Math.round((+o.ganancia || 0) / ff.ingreso * 100) : null,
      retraso: o.retraso_dias != null ? +o.retraso_dias : null,
      psf: sq > 0 ? Math.round(ff.costoReal / sq) : null,
      rentabilidad: o.rentabilidad != null ? +o.rentabilidad : null,
      fecha_inicio: o.fecha_inicio || null, fecha_real: o.fecha_real_fin || null,
      fin: dq.fin, sinDatos: dq.sinDatos
    };
  });
}
function rcCompute() {
  const obras = RC.obras.map(o => ({ ...o, dq: rcDQ(o) }));
  const fin = obras.filter(o => o.dq.fin);
  const activas = obras.filter(o => !o.dq.fin);
  const pipeline = obras.filter(o => o.proceso === 'Pre construcción');
  // Histórico REAL (finalizadas)
  const gananciaHist = fin.reduce((s, o) => s + (+o.ganancia || 0), 0);
  const revenueHist = fin.reduce((s, o) => s + (+o.valor_cliente || 0), 0);
  const margenHist = revenueHist > 0 ? Math.round(gananciaHist / revenueHist * 100) : 0;
  // P1-4: overhead (Gastos Empresariales + Nómina Admin + Plataformas) → Utilidad NETA = ganancia BRUTA − overhead
  const overheadRows = RC.overhead || [];
  const overheadTotal = overheadRows.reduce((s, x) => s + (+x.monto || 0), 0);
  const overheadBy = {}; overheadRows.forEach(x => { overheadBy[x.source] = (overheadBy[x.source] || 0) + (+x.monto || 0); });
  const CAPEX_RE = /veh[ií]culo|activo|compra de|maquinaria|equipo|mobiliario/i;
  const overheadOpex = overheadRows.reduce((sum, x) => sum + ((x.source === 'gastos_empresariales' && CAPEX_RE.test(x.categoria || '')) ? 0 : (+x.monto || 0)), 0);
  const overheadCapex = overheadTotal - overheadOpex;
  const ingresoTotal = fin.reduce((sum, o) => sum + rcFin(o).ingreso, 0);
  const utilidadNeta = gananciaHist - overheadTotal;
  const ebitda = gananciaHist - overheadOpex;
  const ebitdaMargen = ingresoTotal > 0 ? Math.round(ebitda / ingresoTotal * 100) : 0;
  const matHist = fin.reduce((s, o) => s + (+o.gasto_materiales || 0), 0);
  const labHist = fin.reduce((s, o) => s + (+o.gasto_trabajadores || 0), 0);
  const matPctHist = (matHist + labHist) > 0 ? Math.round(matHist / (matHist + labHist) * 100) : 0;
  const _psfArr = fin.filter(o => (+o.sqft || 0) > 0).map(o => { const ff = rcFin(o); return { psf: ff.costoReal / +o.sqft, mat: ff.mat / +o.sqft, lab: ff.lab / +o.sqft }; });
  const psfProm = _psfArr.length ? Math.round(_psfArr.reduce((s, x) => s + x.psf, 0) / _psfArr.length) : 0;
  const matPsfProm = _psfArr.length ? Math.round(_psfArr.reduce((s, x) => s + x.mat, 0) / _psfArr.length) : 0;
  const labPsfProm = _psfArr.length ? Math.round(_psfArr.reduce((s, x) => s + x.lab, 0) / _psfArr.length) : 0;
  // Capital desplegado en obras activas
  const capitalActivo = activas.reduce((s, o) => s + o.dq.gasto, 0);
  const presupActivo = activas.reduce((s, o) => s + (+o.presupuesto_interno || 0), 0);
  const avgAvance = activas.length ? Math.round(activas.reduce((s, o) => s + (+o.avance_pct || 0), 0) / activas.length) : 0;
  // Pipeline PROYECTADO (no final) — guard: NO se suma a la ganancia real
  const pipelineProj = activas.reduce((s, o) => s + ((+o.valor_cliente || 0) - (+o.presupuesto_interno || 0)), 0);
  // Performance por líder (histórico, confiable)
  const lidMap = {};
  fin.forEach(o => {
    const k = (o.lider || '—').trim() || '—';
    if (!lidMap[k]) lidMap[k] = { lider: k, n: 0, ganancia: 0, revenue: 0, sobre: 0, sqft: 0, real: 0, presup: 0, diasSum: 0, diasN: 0, horas: 0, obras: [] };
    const L = lidMap[k]; const real = rcFin(o).costoReal; const presup = (+o.presupuesto_interno || 0);
    L.n++; L.ganancia += (+o.ganancia || 0); L.revenue += (+o.valor_cliente || 0);
    if (o.dq.sobrePresup) L.sobre++;
    L.sqft += (+o.sqft || 0); L.real += real; L.presup += presup; L.horas += rcObraHoras(o);
    if (o.retraso_dias != null) { L.diasSum += +o.retraso_dias; L.diasN++; }
    L.obras.push({ address: rcShort(o.address), devPct: presup > 0 ? Math.round((real - presup) / presup * 100) : null, dias: o.retraso_dias != null ? +o.retraso_dias : null, rent: o.rentabilidad != null ? +o.rentabilidad : null });
  });
  const lideres = Object.values(lidMap).map(l => ({ ...l, margen: l.revenue > 0 ? Math.round(l.ganancia / l.revenue * 100) : 0, devCosto: l.presup > 0 ? Math.round((l.real - l.presup) / l.presup * 100) : null, desvDias: l.diasN ? Math.round(l.diasSum / l.diasN) : null, psf: l.sqft > 0 ? Math.round(l.real / l.sqft) : null, horasSqft: (l.sqft > 0 && l.horas > 0) ? +(l.horas / l.sqft).toFixed(2) : null, sobrePct: l.n ? Math.round(l.sobre / l.n * 100) : 0 }))
    .sort((a, b) => b.ganancia - a.ganancia);
  // Alertas críticas computadas + de la tabla
  const compAlerts = [];
  activas.concat(fin).forEach(o => {
    if (o.dq.sobrePresup) compAlerts.push({ sev: 'r', obra: rcShort(o.address), t: `Sobre presupuesto: gastó ${RC_M(o.dq.gasto)} vs ${RC_M(o.dq.presup)} presupuestado (${Math.round((o.dq.gasto / o.dq.presup - 1) * 100)}% más).` });
    const fe = o.fecha_estimada_fin, fr = o.fecha_real_fin;
    if (o.dq.fin && fe && fr && new Date(fr) > new Date(fe)) {
      const d = Math.round((new Date(fr) - new Date(fe)) / 86400000);
      if (d > 10) compAlerts.push({ sev: 'y', obra: rcShort(o.address), t: `Cerró con ${d} días de atraso (estimado ${fe}, real ${fr}).` });
    }
  });
  // C) ESTIMADO vs REAL por casa (finalizadas confiables): presupuesto (est) vs monto_real (real)
  const evr = fin.filter(o => (+o.presupuesto_interno || 0) > 0 && rcFin(o).costoReal > 0).map(o => {
    const est = +o.presupuesto_interno || 0, real = rcFin(o).costoReal;
    return { address: rcShort(o.address), lider: (o.lider || '—'), est, real, devAbs: real - est, devPct: Math.round((real - est) / est * 100), devDias: o.retraso_dias != null ? +o.retraso_dias : null, rent: o.rentabilidad != null ? +o.rentabilidad : null };
  });
  const evrTot = { est: evr.reduce((s, x) => s + x.est, 0), real: evr.reduce((s, x) => s + x.real, 0) };
  evrTot.devAbs = evrTot.real - evrTot.est; evrTot.devPct = evrTot.est > 0 ? Math.round(evrTot.devAbs / evrTot.est * 100) : 0;
  const topDesv = [...evr].sort((a, b) => Math.abs(b.devPct) - Math.abs(a.devPct)).slice(0, 8);
  const desvCostoProm = evr.length ? Math.round(evr.reduce((s, x) => s + x.devPct, 0) / evr.length) : 0;
  const margenReal = fin.reduce((s, o) => { const ff = rcFin(o); return s + ((ff.ingreso > 0 && ff.costoReal > 0) ? ff.margen : 0); }, 0);
  const _diasAll = fin.map(o => o.retraso_dias).filter(d => d != null).map(Number);
  const _diasRev = _diasAll.filter(d => Math.abs(d) > 180);   // outliers |>180d| = dato a revisar
  const _dias = _diasAll.filter(d => Math.abs(d) <= 180);
  const desvDiasProm = _dias.length ? Math.round(_dias.reduce((s, x) => s + x, 0) / _dias.length) : 0;
  const _sd = [..._dias].sort((a, b) => a - b);
  const desvDiasMed = _sd.length ? (_sd.length % 2 ? _sd[(_sd.length - 1) / 2] : Math.round((_sd[_sd.length / 2 - 1] + _sd[_sd.length / 2]) / 2)) : 0;
  const desvDiasRevN = _diasRev.length;
  const _rent = fin.map(o => o.rentabilidad).filter(r => r != null).map(Number);
  const rentProm = _rent.length ? +(_rent.reduce((s, x) => s + x, 0) / _rent.length).toFixed(1) : 0;
  const _conDias = fin.filter(o => o.retraso_dias != null);
  const aTiempoPct = _conDias.length ? Math.round(_conDias.filter(o => +o.retraso_dias <= 0).length / _conDias.length * 100) : 0;
  const enPresupPct = evr.length ? Math.round(evr.filter(x => x.devPct <= 0).length / evr.length * 100) : 0;
  const gastoTipo = { material: matHist, labor: labHist, total: matHist + labHist };
  const OKR_DEFAULTS = [
    { clave: 'margen_bruto', metrica: 'Margen bruto', objetivo: 20, comparador: '≥', unidad: '%' },
    { clave: 'rentabilidad', metrica: 'Rentabilidad', objetivo: 15, comparador: '≥', unidad: '%' },
    { clave: 'desv_costo', metrica: 'Desviación de costo', objetivo: 5, comparador: '≤', unidad: '%' },
    { clave: 'desv_dias', metrica: 'Desviación de días', objetivo: 7, comparador: '≤', unidad: 'días' },
    { clave: 'psf', metrica: 'Costo por sqft', objetivo: 50, comparador: '≤', unidad: 'usd' },
    { clave: 'ebitda_margen', metrica: 'Margen EBITDA', objetivo: 10, comparador: '≥', unidad: '%' },
    { clave: 'a_tiempo', metrica: '% Obras a tiempo', objetivo: 70, comparador: '≥', unidad: '%' },
    { clave: 'en_presupuesto', metrica: '% Obras en presupuesto', objetivo: 70, comparador: '≥', unidad: '%' }
  ];
  const okrsConfigured = (RC.okrs || []).length > 0;
  const okrsList = okrsConfigured ? RC.okrs : OKR_DEFAULTS;
  const okrActual = { margen_bruto: margenHist, rentabilidad: rentProm, desv_costo: desvCostoProm, desv_dias: desvDiasProm, psf: psfProm, ebitda_margen: ebitdaMargen, a_tiempo: aTiempoPct, en_presupuesto: enPresupPct };
  const okrRows = okrsList.map(o => { const actual = okrActual[o.clave]; const meta = +o.objetivo; const cumple = actual == null ? null : (o.comparador === '≤' ? actual <= meta : actual >= meta); return { clave: o.clave, metrica: o.metrica, objetivo: meta, comparador: o.comparador, unidad: o.unidad, actual, cumple }; });
  return { obras, fin, activas, pipeline, gananciaHist, revenueHist, margenHist, matPctHist, capitalActivo, presupActivo, avgAvance, pipelineProj, lideres, compAlerts, evr, evrTot, topDesv, desvCostoProm, desvDiasProm, desvDiasMed, desvDiasRevN, margenReal, psfProm, matPsfProm, labPsfProm, overheadTotal, overheadBy, overheadOpex, overheadCapex, utilidadNeta, ebitda, ebitdaMargen, ingresoTotal, okrRows, okrsConfigured, rentProm, aTiempoPct, enPresupPct, gastoTipo, sinDatosN: obras.filter(o => o.dq.sinDatos).length, sobreN: obras.filter(o => o.dq.sobrePresup).length };
}

function rcInsights(c) {
  const ins = [];
  if (c.sobreN > 0) ins.push({ s: 'r', t: `<b>${c.sobreN} obra(s) sobre presupuesto</b> (gasto real > 110% del presupuesto). Revisar antes de cerrar.` });
  if (c.lideres.length) {
    const best = c.lideres[0], worst = c.lideres[c.lideres.length - 1];
    ins.push({ s: 'g', t: `Mejor líder por ganancia: <b>${RC_E(best.lider)}</b> — ${RC_M(best.ganancia)} en ${best.n} obra(s) (${best.margen}% margen).` });
    if (c.lideres.length > 1 && worst.margen < 10) ins.push({ s: 'y', t: `<b>${RC_E(worst.lider)}</b> con margen ${worst.margen}% (${worst.n} obra) — debajo del objetivo (20%).` });
  }
  if (c.pipelineProj > 0) ins.push({ s: 'b', t: `Pipeline proyectado de <b>${RC_M(c.pipelineProj)}</b> en ${c.activas.length} obra(s) en curso — <b>proyectado, aún no realizado</b>.` });
  if (c.sinDatosN > 0) ins.push({ s: 'y', t: `${c.sinDatosN} obra(s) sin datos de gasto/valor — cargar en Airtable para incluir en KPIs.` });
  if (c.desvCostoProm > 5) ins.push({ s: 'r', t: `Desviación de costo promedio <b>+${c.desvCostoProm}%</b> sobre presupuesto. Recomendación: recalibrar el Estimador (revisá $/sqft por etapa) y apretar cotización de material.` });
  if (c.desvDiasProm > 7) ins.push({ s: 'y', t: `Atraso promedio <b>+${c.desvDiasProm} días</b> vs estimado. Recomendación: sumar buffer de inspecciones/lead-times al cronograma.` });
  if (c.topDesv[0] && Math.abs(c.topDesv[0].devPct) > 20) ins.push({ s: 'r', t: `Mayor desvío: <b>${RC_E(c.topDesv[0].address)}</b> (${c.topDesv[0].devPct > 0 ? '+' : ''}${c.topDesv[0].devPct}% vs presupuesto). Revisar carga o alcance.` });
  ins.push({ s: 'g', t: `Ganancia histórica realizada: <b>${RC_M(c.gananciaHist)}</b> en ${c.fin.length} obras finalizadas (margen ${c.margenHist}%).` });
  return ins;
}

// ─── Pull Airtable (mismo endpoint que el Dashboard, JWT del user) ───
async function rcPull() {
  const btn = document.getElementById('rc-pull'); if (btn) { btn.disabled = true; btn.textContent = '⏳ Trayendo…'; }
  try {
    const res = await fetch(RC_FN_URL(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await window.getAccessToken()}` }, body: JSON.stringify({ user_id: (window.state && state.user && state.user.id) || null }) });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'Sync falló');
    await rcLoadAll(); rcRender();
    if (window.toast) toast(`Airtable actualizado — ${r.records_synced || 0} obras`, 'success');
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '↻ Pull Airtable'; }
    if (window.toast) toast('Error en Pull: ' + e.message, 'error');
  }
}
window.rcPull = rcPull;

// ─── Render ───
const RC_NAV = [
  ['command', '◆', 'Command Center'],
  ['evr', '⇄', 'Estimado vs Real'],
  ['obras', '▤', 'Obras'],
  ['lideres', '◈', 'Líderes'],
  ['gestion', '◎', 'Gestión (EVM)'],
  ['reportes', '📑', 'Reportes CEO'],
  ['cerebro', '✦', 'Cerebro de obra'],
];
function rcRender() {
  const ov = document.getElementById('rc-overlay'); if (!ov) return;
  if (typeof posApplyTheme === 'function') posApplyTheme(ov);
  const c = rcCompute();
  const side = ov.querySelector('.side'), main = ov.querySelector('.main');
  if (side) side.innerHTML = rcSidebar(c);
  const sec = { command: rcSecCommand, evr: rcSecEvR, obras: rcSecObras, lideres: rcSecLideres, gestion: rcSecGestion, reportes: (window.rcSecReportes || rcSecCommand), cerebro: rcSecCerebro }[RC.section] || rcSecCommand;
  if (main) main.innerHTML = sec(c);
}
window.rcRender = rcRender;
function rcGo(s) { RC.section = s; rcRender(); document.getElementById('rc-overlay')?.scrollTo(0, 0); }
window.rcGo = rcGo;

function rcSidebar(c) {
  const sync = RC.syncLog && RC.syncLog.synced_at ? new Date(RC.syncLog.synced_at).toLocaleDateString('es') : '—';
  return `<div class="brand"><div class="logo">🔨</div><div><b>Remodelación</b><span>COMMAND CENTER</span></div></div>
    <div class="navlbl">Obra</div>
    <nav class="nav">${RC_NAV.map(([k, i, n]) => `<a class="${RC.section === k ? 'on' : ''}" onclick="rcGo('${k}')"><span class="i">${i}</span>${n}${k === 'obras' ? `<span class="b">${c.obras.length}</span>` : ''}${k === 'lideres' ? `<span class="b">${c.lideres.length}</span>` : ''}</a>`).join('')}</nav>
    <div class="foot">Fuente: <b>Airtable en vivo</b> (Remodelación).<br>Último sync: ${sync}<br>${c.fin.length} finalizadas · ${c.activas.length} en curso</div>`;
}
function rcHeader(title, sub) {
  return `<div class="top"><div><h1><span>${title}</span></h1><div class="sub">${sub}</div></div>
    <div class="pills"><span class="pill"><span class="cdot"></span>Airtable en vivo</span><button class="pullbtn" style="background:var(--glass);color:var(--ink);border:1px solid var(--glassb)" onclick="rcExportCSV()">⤓ Exportar</button><button id="rc-pull" class="pullbtn" onclick="rcPull()">↻ Pull Airtable</button></div></div>`;
}

function rcSecCommand(c) {
  const atrasadas = (RC.avanceVivo || []).filter(x => x.atrasada_cronograma && x.proceso === 'En construcción');
  const bannerAtraso = atrasadas.length ? `<div class="card" style="border:1px solid rgba(248,113,113,.5);margin-bottom:12px"><div class="lab" style="color:#f87171">📉 ${atrasadas.length} OBRA(S) ATRASADA(S) SEGÚN CRONOGRAMA</div>${atrasadas.map(o => `<div class="krow"><span><b>${RC_E(rcShort(o.address))}</b>: ${o.pct_tareas}% real vs ${o.pct_esperado}% esperado</span><b class="down">${o.atraso_pts} pts · ~${o.atraso_dias}d</b></div>`).join('')}</div>` : '';
  const ins = rcInsights(c);
  const parN = RC.parity ? RC.parity.airtable_count : c.obras.length;
  const paritySync = RC.parity ? (RC.parity.in_sync !== false && (RC.parity.airtable_count == null || RC.parity.airtable_count === c.obras.length)) : true;
  const parityNote = paritySync
    ? `Última verificación de paridad: <b style="color:#34d399">OK</b> · ${c.obras.length}/${parN} obras activas (Airtable)`
    : `Última verificación de paridad: <b style="color:#f87171">ALERTA</b> · app ${c.obras.length} vs Airtable ${parN} — sync desincronizado`;
  const parityBg = paritySync ? 'rgba(52,211,153,.1)' : 'rgba(248,113,113,.12)';
  const parityBd = paritySync ? 'rgba(52,211,153,.25)' : 'rgba(248,113,113,.35)';
  return rcHeader('Command Center', `${c.obras.length} obras · ${c.fin.length} finalizadas · ${c.activas.length} en curso — capital, ganancia realizada y pipeline.`) + `
    <div style="font-size:11px;padding:6px 12px;margin-bottom:10px;border-radius:8px;background:${parityBg};border:1px solid ${parityBd};color:var(--txt2)">${parityNote}</div>
    <div class="grid kpis">
      <div class="card kpi"><div class="lab">Ganancia realizada</div><div class="big up glow">${RC_K(c.gananciaHist)}</div><div class="meta">BRUTO · ${c.fin.length} finalizadas · margen ${c.margenHist}%</div></div>
      <div class="card kpi"><div class="lab">Obras en curso</div>${paritySync ? `<div class="big">${c.activas.length}</div>` : `<div class="big down" style="font-size:15px;line-height:1.15" title="El conteo de la app no coincide con Airtable">⚠ sync<br>desincronizado</div>`}<div class="meta">avance promedio ${c.avgAvance}% · ${c.obras.length} obras</div></div>
      <div class="card kpi"><div class="lab">Capital desplegado</div><div class="big">${RC_K(c.capitalActivo)}</div><div class="meta">en obras activas · presup. ${RC_K(c.presupActivo)}</div></div>
      <div class="card kpi"><div class="lab">Pipeline <span class="warn">proyectado</span></div><div class="big warn">${RC_K(c.pipelineProj)}</div><div class="meta">NO realizado · ${c.pipeline.length} en pre-construcción</div></div>
    </div>
    <div class="grid kpis" style="margin-top:14px">
      <div class="card kpi"><div class="lab">Rentabilidad prom</div><div class="big ${c.rentProm>=0?'up':'down'}">${c.rentProm}%</div><div class="meta">histórico (${c.fin.length} finalizadas)</div></div>
      <div class="card kpi"><div class="lab">Desviación de costo prom</div><div class="big ${c.desvCostoProm>0?'down':'up'}">${c.desvCostoProm>0?'+':''}${c.desvCostoProm}%</div><div class="meta">real vs presupuesto · ${c.enPresupPct}% en presup.</div></div>
      <div class="card kpi"><div class="lab">Desviación de días prom</div><div class="big ${c.desvDiasProm>0?'down':'up'}">${c.desvDiasProm>0?'+':''}${c.desvDiasProm}d</div><div class="meta">mediana ${c.desvDiasMed>0?'+':''}${c.desvDiasMed}d · ${c.aTiempoPct}% a tiempo${c.desvDiasRevN?` · <span class="warn">${c.desvDiasRevN} a revisar</span>`:''}</div></div>
      <div class="card kpi"><div class="lab">Margen realizado</div><div class="big ${c.margenReal>=0?'up':'down'}">${RC_K(c.margenReal)}</div><div class="meta">ingreso − costo real (${c.fin.length} fin)</div></div>
      <div class="card kpi"><div class="lab">Alertas</div><div class="big ${c.compAlerts.length?'down':'up'}">${c.compAlerts.length}</div><div class="meta">sobre-presupuesto / atraso</div></div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="chart-h"><div class="t">Overhead / EBITDA de Remodelación</div><div class="k">Ganancia BRUTA − overhead</div></div>
      <div class="grid kpis">
        <div class="card kpi"><div class="lab">Ganancia BRUTA</div><div class="big up">${RC_K(c.gananciaHist)}</div><div class="meta">de obras, antes de overhead</div></div>
        <div class="card kpi"><div class="lab">Overhead del período</div><div class="big down">${RC_K(c.overheadTotal)}</div><div class="meta">nómina admin ${RC_K(c.overheadBy.nomina_admin||0)} · gastos ${RC_K(c.overheadBy.gastos_empresariales||0)} · plataformas ${RC_K(c.overheadBy.plataformas||0)}</div></div>
        <div class="card kpi"><div class="lab">Utilidad NETA</div><div class="big ${c.utilidadNeta>=0?'up glow':'down'}">${RC_K(c.utilidadNeta)}</div><div class="meta">EBITDA aprox = BRUTA − overhead</div></div>
      </div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Alertas críticas</div><div class="k">${c.compAlerts.length} activas</div></div>
        ${c.compAlerts.length ? c.compAlerts.slice(0, 8).map(a => `<div class="alertrow"><div class="adot ${a.sev}"></div><div><div style="font-size:12px;line-height:1.5"><b>${RC_E(a.obra)}</b> — ${a.t}</div></div></div>`).join('') : '<div class="meta" style="padding:14px 0">Sin alertas de sobre-presupuesto ni atraso. ✓</div>'}</div>
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro de obra</b><span>INSIGHTS DEL HISTÓRICO</span></div></div>
        ${ins.map(i => `<div class="insight"><div class="ic ${i.s === 'r' ? 'r' : i.s === 'y' ? 'y' : i.s === 'g' ? 'g' : 'b'}">●</div><div class="tx">${i.t}</div></div>`).join('')}
        <div style="margin-top:12px"><span class="chip" onclick="rcGo('cerebro')">Abrir chat de obra →</span></div></div>
    </div>`;
}

function rcCompletitud(o) {
  const num = v => (+v || 0) > 0;
  const has = [num(o.presupuesto_interno), num(o.gasto_trabajadores), num(o.gasto_materiales), !!o.fecha_inicio, !!o.fecha_estimada_fin];
  return { n: has.filter(Boolean).length, total: 5 };
}
function rcObraCard(o) {
  const dq = o.dq, av = Math.round(+o.avance_pct || 0);
  const badge = dq.sinDatos ? '<span class="ff-dq ff-dq-nd">sin datos</span>' : dq.sobrePresup ? '<span class="ff-dq ff-dq-rev">⚠ sobre presupuesto</span>' : (!dq.fin ? '<span class="ff-dq ff-dq-pre">en curso · proyectado</span>' : '');
  const util = dq.fin ? (+o.ganancia || 0) : ((+o.valor_cliente || 0) - dq.gasto);
  const slug = window.osSlug ? osSlug(o.address) : '';
  const _ff = rcFin(o), _sq = +o.sqft || 0;
  const _psf = _sq > 0 ? Math.round(_ff.costoReal / _sq) : null;
  const _matPsf = _sq > 0 ? Math.round(_ff.mat / _sq) : null, _labPsf = _sq > 0 ? Math.round(_ff.lab / _sq) : null;
  let _psfStr = '—';
  if (_psf != null) _psfStr = `${_psf} <span style="opacity:.55;font-weight:400">(mat ${_matPsf} · MO ${_labPsf})</span>`;
  const _comp = rcCompletitud(o);
  const _cc = _comp.n >= 5 ? '#34d399' : _comp.n >= 3 ? '#e7b65e' : '#f87171';
  return `${bannerAtraso}<div class="kcard">
    <div class="addr">${RC_E(rcShort(o.address))} ${badge} <span class="ff-dq" style="background:${_cc}22;color:${_cc};border-color:${_cc}44" title="Campos clave: presupuesto, gasto trab, gasto mat, fecha inicio, fecha estimada">${_comp.n}/${_comp.total} campos</span></div>
    <div class="meta">${RC_E(o.lider || '—')} · ${RC_E(o.proceso || 's/estado')}${o.sqft ? ' · ' + o.sqft + ' sqft' : ''}</div>
    <div class="krow"><span>Gasto real</span><b>${RC_M(dq.gasto)}</b></div>
    <div class="krow"><span>$/sqft (mat+MO)</span><b>${_psfStr}</b></div>
    <div class="krow"><span>Valor cliente</span><b>${RC_M(+o.valor_cliente || 0)}</b></div>
    <div class="krow"><span>${dq.fin ? 'Utilidad' : 'Utilidad (proy.)'}</span><b class="${util >= 0 ? 'up' : 'down'}">${RC_M(util)}</b></div>
    <div class="kbar"><i style="width:${Math.min(100, av)}%"></i></div>
    <div class="kficha" onclick="event.stopPropagation();osOpenFicha('${slug}')">🏠 Ver ficha de casa →</div>
  </div>`;
}
const RC_STAGES = ['Pre construcción', 'En construcción', 'Pre-entrega', 'Entrega', 'Finalizado'];
function rcSecObras(c) {
  const cols = RC_STAGES.map(st => [st, c.obras.filter(o => o.proceso === st)]);
  const sin = c.obras.filter(o => !RC_STAGES.includes(o.proceso));
  if (sin.length) cols.push(['Sin estado', sin]);
  return rcHeader('Pipeline de obras', 'Por etapa real de Procesos: Pre construcción → En construcción → Pre-entrega → Entrega → Finalizado. En curso = proyectado.') + `
    <div class="kan">${cols.map(([t, list]) => `<div class="kcol"><div class="kcol-h">${RC_E(t)}<span class="cnt">${list.length}</span></div>${list.length ? list.map(rcObraCard).join('') : '<div class="meta" style="padding:14px 4px">—</div>'}</div>`).join('')}</div>`;
}

function rcSecLideres(c) {
  const dchip = (v, unit) => v == null ? '<span style="color:var(--mut2)">—</span>' : `<span class="${v > 0 ? 'down' : 'up'}">${v > 0 ? '+' : ''}${v}${unit}</span>`;
  const detalle = l => l.obras.map(o => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:3px 0;border-top:1px solid var(--glassb)"><span>${RC_E(o.address)}</span><span style="color:var(--mut)">${o.devPct != null ? 'desv ' + (o.devPct > 0 ? '+' : '') + o.devPct + '%' : ''}${o.dias != null ? ' · ' + o.dias + 'd' : ''}${o.rent != null ? ' · rent ' + o.rent + '%' : ''}</span></div>`).join('');
  const rows = c.lideres.map((l, i) => {
    const main = `<tr style="cursor:pointer" onclick="document.getElementById('rc-lid-${i}').classList.toggle('rc-hide')"><td><b>${RC_E(l.lider)}</b> <span style="color:var(--mut2);font-size:9px">▸</span></td><td>${l.n}</td><td class="${l.ganancia >= 0 ? 'up' : 'down'}">${RC_M(l.ganancia)}</td><td>${dchip(l.devCosto, '%')}</td><td>${dchip(l.desvDias, 'd')}</td><td>${l.psf != null ? '$' + l.psf : '—'}</td><td>${l.horasSqft != null ? l.horasSqft : '—'}</td><td class="${l.sobrePct > 30 ? 'down' : ''}">${l.sobrePct}%</td></tr>`;
    const det = `<tr id="rc-lid-${i}" class="rc-hide"><td colspan="8" style="padding:0"><div style="padding:9px 12px;background:var(--glass)"><div style="font-size:9px;letter-spacing:1px;color:var(--mut2);margin-bottom:6px">OBRAS DE ${RC_E((l.lider || '').toUpperCase())}</div>${detalle(l)}</div></td></tr>`;
    return main + det;
  }).join('');
  return rcHeader('Performance por líder', 'Desviación de costo/días, $/sqft logrado, productividad (hrs/sqft) y % sobre presupuesto — finalizadas. Click para ver sus obras.') + `
    <div class="card"><table class="ptable"><thead><tr><th>Líder</th><th>Obras</th><th>Ganancia</th><th>Desv costo</th><th>Desv días</th><th>$/sqft</th><th>hrs/sqft</th><th>% sobre pres.</th></tr></thead><tbody>
    ${c.lideres.length ? rows : '<tr><td colspan="8" class="meta" style="padding:20px">Sin obras finalizadas.</td></tr>'}
    </tbody></table></div>`;
}

function rcSecCerebro(c) {
  const ins = rcInsights(c);
  return rcHeader('Cerebro de obra', 'Insights del histórico + chat sobre tus obras (reglas de negocio de Remodelación).') + `
    <div class="grid row2">
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Chat de obra</b><span>PREGUNTALE AL CEREBRO</span></div></div>
        <div id="rc-chat" class="cc-chat">${rcChatHTML()}</div>
        <div class="ask"><input id="rc-q" placeholder="¿Qué líder rinde mejor? ¿Qué obra está sobre presupuesto?" onkeydown="if(event.key==='Enter')rcAsk(this.value)"><button onclick="rcAsk(document.getElementById('rc-q').value)">Preguntar</button></div>
        <div style="margin-top:10px;display:flex;gap:7px;flex-wrap:wrap">${['¿Cuál obra está más atrasada?', '¿Cómo viene el margen histórico?', '¿Quién es el mejor líder?'].map(q => `<span class="chip" onclick="rcAsk('${q}')">${q}</span>`).join('')}</div>
      </div>
      <div class="card"><div class="chart-h"><div class="t">Insights</div></div>
        ${ins.map(i => `<div class="insight"><div class="ic ${i.s === 'r' ? 'r' : i.s === 'y' ? 'y' : i.s === 'g' ? 'g' : 'b'}">●</div><div class="tx">${i.t}</div></div>`).join('')}</div>
    </div>`;
}
function rcChatHTML() {
  if (!RC.chat.length) return '';
  return RC.chat.map(m => `<div class="cbub ${m.role === 'user' ? 'u' : (m.err ? 'a err' : 'a')} ${m.think ? 'think' : ''}">${m.think ? 'Pensando' : (typeof marked !== 'undefined' && m.role !== 'user' ? (window.DOMPurify ? DOMPurify.sanitize(marked.parse(m.text)) : m.text) : RC_E(m.text))}</div>`).join('');
}
function rcRenderChat() { const el = document.getElementById('rc-chat'); if (el) { el.innerHTML = rcChatHTML(); el.scrollTop = el.scrollHeight; } }
async function rcAsk(q) {
  q = (q || '').trim(); if (!q) return;
  const inp = document.getElementById('rc-q'); if (inp) inp.value = '';
  RC.chat.push({ role: 'user', text: q }); RC.chat.push({ role: 'assistant', text: '', think: true }); rcRenderChat();
  const c = rcCompute();
  const ctx = `Sos el Cerebro de obra de una empresa de Remodelación. Datos actuales (Airtable en vivo): ${c.fin.length} obras finalizadas, ganancia realizada ${RC_M(c.gananciaHist)} (margen ${c.margenHist}%), ${c.activas.length} en curso, capital desplegado ${RC_M(c.capitalActivo)}, pipeline proyectado ${RC_M(c.pipelineProj)}. Líderes: ${c.lideres.map(l => `${l.lider} (${l.n} obras, ${RC_M(l.ganancia)}, ${l.margen}%)`).join('; ')}. Alertas: ${c.compAlerts.map(a => a.obra + ': ' + a.t).join(' | ') || 'ninguna'}. Reglas: margen objetivo 20%, obras en curso son PROYECTADAS (no final), no inflar. Respondé conciso en español rioplatense.`;
  try {
    const res = await fetch('/api/brain-chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await window.getAccessToken()}` }, body: JSON.stringify({ message: q, system: ctx, area: 'remodelacion' }) });
    const r = await res.json();
    RC.chat.pop();
    RC.chat.push({ role: 'assistant', text: r.reply || r.message || r.error || 'Sin respuesta.', err: !!r.error });
  } catch (e) {
    RC.chat.pop(); RC.chat.push({ role: 'assistant', text: 'No pude responder: ' + e.message, err: true });
  }
  rcRenderChat();
}
window.rcAsk = rcAsk;

// ─── C) Sección Estimado vs Real ───
function rcSecEvR(c) {
  const chip = pct => pct > 5 ? `<span class="down">+${pct}%</span>` : pct < -5 ? `<span class="up">${pct}%</span>` : `<span>${pct > 0 ? '+' : ''}${pct}%</span>`;
  const gt = c.gastoTipo, matPct = gt.total ? Math.round(gt.material / gt.total * 100) : 0;
  const rows = [...c.evr].sort((a, b) => Math.abs(b.devPct) - Math.abs(a.devPct));
  return rcHeader('Estimado vs Real', 'Presupuesto (estimado) vs monto real por casa — desviación $ y %, y días estimados vs reales. Guard: solo finalizadas confiables.') + `
    <div class="grid kpis">
      <div class="card kpi"><div class="lab">Presupuesto (estimado)</div><div class="big">${RC_K(c.evrTot.est)}</div><div class="meta">${c.evr.length} obras</div></div>
      <div class="card kpi"><div class="lab">Costo real</div><div class="big">${RC_K(c.evrTot.real)}</div><div class="meta">(gasto trab+mat)×1.05</div></div>
      <div class="card kpi"><div class="lab">Desviación $</div><div class="big ${c.evrTot.devAbs > 0 ? 'down' : 'up'}">${c.evrTot.devAbs > 0 ? '+' : ''}${RC_K(c.evrTot.devAbs)}</div><div class="meta">real − estimado</div></div>
      <div class="card kpi"><div class="lab">$/sqft prom</div><div class="big">${c.psfProm}</div><div class="meta">mat ${c.matPsfProm} · MO ${c.labPsfProm} (real/sqft)</div></div>
      <div class="card kpi"><div class="lab">Desviación %</div><div class="big ${c.evrTot.devPct > 0 ? 'down' : 'up'}">${c.evrTot.devPct > 0 ? '+' : ''}${c.evrTot.devPct}%</div><div class="meta">agregado</div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Top desviaciones — por casa</div><div class="k">${c.evr.length} finalizadas</div></div>
        <table class="ptable"><thead><tr><th>Casa</th><th>Líder</th><th>Estimado</th><th>Real</th><th>Desv $</th><th>Desv %</th><th>Días</th><th>Rent.</th></tr></thead><tbody>
        ${rows.length ? rows.map(x => `<tr><td><b>${RC_E(x.address)}</b></td><td>${RC_E(x.lider)}</td><td>${RC_M(x.est)}</td><td>${RC_M(x.real)}</td><td class="${x.devAbs > 0 ? 'down' : 'up'}">${x.devAbs > 0 ? '+' : ''}${RC_M(x.devAbs)}</td><td>${chip(x.devPct)}</td><td class="${(x.devDias || 0) > 0 ? 'down' : ''}">${x.devDias != null ? x.devDias + 'd' : '—'}</td><td class="${(x.rent || 0) >= 0 ? 'up' : 'down'}">${x.rent != null ? x.rent + '%' : '—'}</td></tr>`).join('') : '<tr><td colspan="8" class="meta" style="padding:16px">Sin finalizadas con presupuesto cargado.</td></tr>'}
        </tbody></table></div>
      <div class="card"><div class="chart-h"><div class="t">Gasto por tipo (histórico)</div></div>
        <div class="krow"><span>Material</span><b>${RC_M(gt.material)} · ${matPct}%</b></div>
        <div class="kbar"><i style="width:${matPct}%"></i></div>
        <div class="krow" style="margin-top:12px"><span>Mano de obra</span><b>${RC_M(gt.labor)} · ${100 - matPct}%</b></div>
        <div class="kbar"><i style="width:${100 - matPct}%;background:linear-gradient(90deg,var(--a3),var(--a2))"></i></div>
        <div class="meta" style="margin-top:14px">Total gastado (finalizadas): <b>${RC_M(gt.total)}</b>.</div>
        <div class="meta" style="margin-top:6px">% a tiempo: <b>${c.aTiempoPct}%</b> · % en presupuesto: <b>${c.enPresupPct}%</b></div>
        <div class="meta" style="margin-top:6px">Estos agregados alimentan la calibración del Estimador (aprendizaje).</div>
      </div>
    </div>`;
}

// ─── C) Exportar reporte (CSV/Excel) ───
function rcExportCSV() {
  const c = rcCompute();
  const rows = [['Casa', 'Lider', 'Estimado', 'Real', 'Desv $', 'Desv %', 'Dias atraso', 'Rentabilidad %']];
  c.evr.forEach(x => rows.push([x.address, x.lider, x.est, x.real, x.devAbs, x.devPct, x.devDias == null ? '' : x.devDias, x.rent == null ? '' : x.rent]));
  rows.push([], ['KPIs'], ['Ganancia historica', c.gananciaHist], ['Rentabilidad prom %', c.rentProm], ['Desv costo prom %', c.desvCostoProm], ['Desv dias prom', c.desvDiasProm], ['% a tiempo', c.aTiempoPct], ['% en presupuesto', c.enPresupPct], ['Obras finalizadas', c.fin.length], ['Obras en curso', c.activas.length]);
  const csv = rows.map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'remodelacion-estimado-vs-real.csv'; a.click(); URL.revokeObjectURL(url);
  if (window.toast) toast('Reporte exportado (CSV / Excel)', 'success');
}
window.rcExportCSV = rcExportCSV;

// ─── F) Gestión (EVM): SPI/CPI por casa + agregados de calibración para el Estimador ───
function rcEVM(o) {
  const avance = +o.avance_pct || 0;
  const cost = o.dq ? o.dq.gasto : ((+o.gasto_materiales || 0) + (+o.gasto_trabajadores || 0));
  const presup = +o.presupuesto_interno || 0;
  let timePct = null, spi = null, cpi = null;
  if (o.fecha_inicio && o.fecha_estimada_fin) {
    const total = (new Date(o.fecha_estimada_fin) - new Date(o.fecha_inicio)) / 86400000;
    const elapsed = (Date.now() - new Date(o.fecha_inicio)) / 86400000;
    if (total > 0) { timePct = Math.min(100, Math.max(0, elapsed / total * 100)); if (timePct > 0) spi = avance / timePct; }
  }
  if (presup > 0 && cost > 0 && avance > 0) cpi = (presup * avance / 100) / cost;
  return { avance, timePct, spi, cpi };
}
function rcSecGestion(c) {
  const rows = c.activas.map(o => ({ o, ...rcEVM(o) })).filter(x => x.spi != null || x.cpi != null);
  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const spiProm = avg(rows.map(r => r.spi).filter(v => v != null));
  const cpiProm = avg(rows.map(r => r.cpi).filter(v => v != null));
  const cal = c.fin.filter(o => (+o.sqft || 0) > 0 && ((+o.monto_real || o.dq.gasto) > 0) && (+o.presupuesto_interno || 0) > 0);
  const realPsf = cal.length ? Math.round(avg(cal.map(o => (+o.monto_real || o.dq.gasto) / (+o.sqft)))) : 0;
  const estPsf = cal.length ? Math.round(avg(cal.map(o => (+o.presupuesto_interno) / (+o.sqft)))) : 0;
  return rcHeader('Gestión (EVM)', 'CPI/SPI por casa (obras en curso), avance físico vs planeado, y agregados de calibración listos para el Estimador.') + `
    <div class="grid kpis">
      <div class="card kpi"><div class="lab">SPI promedio</div><div class="big ${(spiProm || 0) >= 1 ? 'up' : 'down'}">${spiProm != null ? spiProm.toFixed(2) : '—'}</div><div class="meta">cronograma (>1 adelantado)</div></div>
      <div class="card kpi"><div class="lab">CPI promedio</div><div class="big ${(cpiProm || 0) >= 1 ? 'up' : 'down'}">${cpiProm != null ? cpiProm.toFixed(2) : '—'}</div><div class="meta">costo (>1 bajo presupuesto)</div></div>
      <div class="card kpi"><div class="lab">% a tiempo</div><div class="big">${c.aTiempoPct}%</div><div class="meta">finalizadas</div></div>
      <div class="card kpi"><div class="lab">% en presupuesto</div><div class="big">${c.enPresupPct}%</div><div class="meta">finalizadas</div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">EVM por casa (en curso)</div><div class="k">${rows.length} obras</div></div>
        <table class="ptable"><thead><tr><th>Casa</th><th>Físico %</th><th>Planeado %</th><th>SPI</th><th>CPI</th></tr></thead><tbody>
        ${rows.length ? rows.map(x => `<tr><td><b>${RC_E(rcShort(x.o.address))}</b></td><td>${Math.round(x.avance)}%</td><td>${x.timePct != null ? Math.round(x.timePct) + '%' : '—'}</td><td class="${(x.spi || 0) >= 1 ? 'up' : 'down'}">${x.spi != null ? x.spi.toFixed(2) : '—'}</td><td class="${(x.cpi || 0) >= 1 ? 'up' : 'down'}">${x.cpi != null ? x.cpi.toFixed(2) : '—'}</td></tr>`).join('') : '<tr><td colspan="5" class="meta" style="padding:16px">Sin obras en curso con fechas y costo cargados.</td></tr>'}
        </tbody></table></div>
      ${rcVivoCard()}
      <div class="card"><div class="chart-h"><div class="t">Control de presupuesto por casa</div><div class="k">material (pagos) + MO (horas×rate) · alerta > presup +${RC.sobrecostoPct != null ? RC.sobrecostoPct : 10}%</div></div>
        <table class="ptable"><thead><tr><th>Casa</th><th class="r" style="text-align:right">Presup.</th><th style="text-align:right">Material</th><th style="text-align:right">MO (horas)</th><th style="text-align:right">Total real</th><th style="text-align:right">%</th></tr></thead><tbody>
        ${(RC.presupCasa || []).filter(x => x.proceso === 'En construcción' || x.sobrecosto).sort((a2, b2) => (b2.pct_gastado || 0) - (a2.pct_gastado || 0)).map(x => `<tr${x.sobrecosto ? ' style="background:rgba(248,113,113,.08)"' : ''}><td><b>${RC_E(rcShort(x.address))}</b>${x.sobrecosto ? ' <span class="ff-dq ff-dq-rev">⚠ SOBRECOSTO</span>' : ''}</td><td style="text-align:right">${x.presupuesto ? RC_M(+x.presupuesto) : '—'}</td><td style="text-align:right">${RC_M(+x.mat_real || 0)}</td><td style="text-align:right">${RC_M(+x.mo_real || 0)}${x.horas ? ` <span style="opacity:.5;font-size:10px">(${Math.round(+x.horas)}h)</span>` : ''}</td><td style="text-align:right"><b>${RC_M(+x.total_real || 0)}</b></td><td style="text-align:right" class="${x.pct_gastado > 100 ? 'down' : ''}">${x.pct_gastado != null ? x.pct_gastado + '%' : '<span class="warn">s/presup</span>'}</td></tr>`).join('')}
        </tbody></table>
        <div style="border-top:1px solid var(--line,rgba(255,255,255,.1));margin:12px 0 6px;padding-top:10px;font-size:10px;color:var(--txt3,#64748b);text-transform:uppercase;letter-spacing:.5px">Ledger de nómina de campo — a quién le debemos <button class="repbtn" style="padding:3px 10px;font-size:10px;margin-left:8px" onclick="rcPagoQuincenal()">💵 Generar pago quincenal</button></div>
        ${(() => { const tot = (RC.ledger || []).length; const sin = (RC.ledger || []).filter(x => x.rate_conocido === false).length; return sin ? `<div class="meta" style="margin-bottom:6px">⚠ Cobertura parcial: ${sin} de ${tot} filas del ledger sin rate conocido (nombre no matchea Personal en Campo) — su devengado no se computa. Corregir nombres en Airtable para cobertura total.</div>` : ''; })()}
        ${(() => { const map = {}; (RC.ledger || []).forEach(r => { if (!map[r.worker]) map[r.worker] = { w: r.worker, horas: 0, dev: 0, pag: 0, deuda: 0, casas: [] }; const m2 = map[r.worker]; m2.horas += +r.horas || 0; m2.dev += +r.devengado || 0; m2.pag += +r.pagado || 0; m2.deuda += +r.deuda || 0; if (+r.deuda > 100) m2.casas.push(rcShort(r.casa) + ' ' + RC_M(+r.deuda)); }); const tot = Object.values(map).filter(x => Math.abs(x.deuda) > 100).sort((x, y) => y.deuda - x.deuda); const deudaTotal = tot.reduce((s2, x) => s2 + Math.max(0, x.deuda), 0); return `<div class="krow"><span><b>DEUDA TOTAL</b></span><b class="down">${RC_M(deudaTotal)}</b></div>` + tot.slice(0, 8).map(x => `<div class="krow"><span>${RC_E(x.w)} <span style="opacity:.5;font-size:10px">(${Math.round(x.horas)}h · ${x.casas.slice(0, 2).join(', ')})</span></span><b class="${x.deuda > 0 ? 'down' : 'up'}">${RC_M(x.deuda)}</b></div>`).join(''); })()}
        ${(RC.receipts || []).length ? `<div style="border-top:1px solid var(--line,rgba(255,255,255,.1));margin:12px 0 6px;padding-top:10px;font-size:10px;color:var(--txt3,#64748b);text-transform:uppercase;letter-spacing:.5px">Recibos quincenales registrados</div>` + (RC.receipts || []).slice(0, 6).map(rc2 => `<div class="krow"><span>${rc2.fecha_pago} · <b>${RC_E(rc2.lider || '—')}</b> · ${RC_E((rc2.casa || '').slice(0, 22))} <span style="opacity:.5;font-size:10px">(${rc2.periodo_ini}→${rc2.periodo_fin})</span></span><span><b>${RC_M(+rc2.total || 0)}</b> <span class="badge ${rc2.estado === 'realizado' ? 'b-ok' : 'b-warn'}" style="font-size:8px">${RC_E(rc2.estado)}</span>${rc2.airtable_writeback === 'pendiente' ? ' <span style="opacity:.5;font-size:9px">↗AT pend.</span>' : ''}</span></div>`).join('') : ''}
        <div class="meta" style="margin-top:8px">Fuente: remodel_material_payments (${(RC.presupCasa || []).length ? 'espejo Pago de Materiales' : '—'}) + remodel_worker_pay_summary. Muestra en-construcción + cualquier sobrecosto.</div>
      </div>
    </div>
    <div class="grid row2">
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Aprendizaje · calibración</b><span>DATO LISTO PARA EL ESTIMADOR</span></div></div>
        <div class="krow"><span>$/sqft real (prom)</span><b>$${realPsf}</b></div>
        <div class="krow"><span>$/sqft estimado (prom)</span><b>$${estPsf}</b></div>
        <div class="krow"><span>Desviación de costo prom</span><b class="${c.desvCostoProm > 0 ? 'down' : 'up'}">${c.desvCostoProm > 0 ? '+' : ''}${c.desvCostoProm}%</b></div>
        <div class="krow"><span>Desviación de días prom</span><b>${c.desvDiasProm > 0 ? '+' : ''}${c.desvDiasProm}d</b></div>
        <div class="krow"><span>Ratio material histórico</span><b>${c.matPctHist}%</b></div>
        ${(() => { const h = (RC.calibCostos || []).find(x => x.ventana === 'historico') || {}; const u = (RC.calibCostos || []).find(x => x.ventana === 'ultimas_5') || {}; const et = (RC.calibEtapas || []).filter(x => x.aplicable); const converge = (u.desv_costo_pct != null && h.desv_costo_pct != null) ? (Math.abs(+u.desv_costo_pct) <= Math.abs(+h.desv_costo_pct)) : null; const etRows = et.map(x => `<div class="krow"><span>factor días · ${RC_E(x.etapa)} (n=${x.n_tareas})</span><b class="${+x.factor_dias > 1.05 ? 'down' : 'up'}">×${(+x.factor_dias).toFixed(3)}</b></div>`).join(''); return `<div style="border-top:1px solid var(--line,rgba(255,255,255,.1));margin:10px 0 6px;padding-top:8px;font-size:10px;color:var(--txt3,#64748b);text-transform:uppercase;letter-spacing:.5px">Tendencia (se afina con cada obra cerrada)</div><div class="krow"><span>Desv. costo — histórico (${h.n || 0})</span><b>${h.desv_costo_pct > 0 ? '+' : ''}${h.desv_costo_pct}%</b></div><div class="krow"><span>Desv. costo — últimas 5</span><b class="${converge === false ? 'down' : 'up'}">${u.desv_costo_pct > 0 ? '+' : ''}${u.desv_costo_pct}%${converge === false ? ' ⚠ empeorando' : converge === true ? ' ✓ converge' : ''}</b></div><div class="krow"><span>$/sqft real — hist → últimas 5</span><b>${h.psf_real} → ${u.psf_real}</b></div>${etRows}`; })()}
        <div class="meta" style="margin-top:12px"><b>LOOP ACTIVO</b>: los factores de días por etapa (real del Planner) y el $/sqft real YA se aplican a la generación del cronograma y al pronosticador (rmAutoGenPlanner · remodel_forecast_params). Se recalibra solo con cada obra cerrada.</div>
      </div>
    </div>`;
}
window.rcSecGestion = rcSecGestion;

// ─── RM-M1 · Avance de obra EN VIVO (tareas vs plata + semáforos de costo y tiempo) ───
function rcVivoCard() {
  const obras = (RC.avanceVivo || []).filter(x => x.proceso === 'En construcción');
  const SEM = { verde: '🟢', amarillo: '🟡', rojo: '🔴', gris: '⚪' };
  const bar = (pct, color) => `<div style="height:8px;border-radius:5px;background:rgba(255,255,255,.06);overflow:hidden;margin:3px 0 7px"><i style="display:block;height:100%;width:${Math.min(100, +pct || 0)}%;background:${color}"></i></div>`;
  const card = (o) => {
    const revisar = [];
    if ((+o.pct_plata || 0) > (+o.pct_tareas || 0) + 15) revisar.push(`la plata (${o.pct_plata}%) corre ${Math.round(o.pct_plata - o.pct_tareas)}pts adelante de las tareas — posible sobrecosto`);
    if (o.atrasada_cronograma) revisar.push(`ATRASADA según cronograma: ${o.pct_tareas}% real vs ${o.pct_esperado}% esperado → ${o.atraso_pts} pts atrás, ~${o.atraso_dias} día(s) de retraso`);
    else if (o.sem_tiempo === 'rojo') revisar.push(o.dias_pasados_fin > 0 ? `cronograma vencido hace ${o.dias_pasados_fin} días y va ${o.pct_tareas}%` : `vamos lentos: ${o.pct_tareas}% hecho con ${o.pct_dias}% del tiempo consumido`);
    if (o.sem_costo === 'rojo') revisar.push(`gasto $${(+o.gasto_real).toLocaleString('en-US')} supera lo proyectado a hoy ($${(+o.costo_proyectado || 0).toLocaleString('en-US')})`);
    if (!o.presupuesto) revisar.push('sin presupuesto cargado en Airtable — semáforo de costo ciego');
    return `<div class="card" style="min-width:0">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><b>${RC_E(rcShort(o.address))}</b><span style="font-size:11px;opacity:.7">${o.done || 0}/${o.total || 0} tareas</span></div>
      <div style="font-size:10px;color:var(--txt3,#64748b);margin-top:8px">AVANCE POR TAREAS · ${o.pct_tareas || 0}%</div>${bar(o.pct_tareas, 'linear-gradient(90deg,#12b5a0,#2f6ef0)')}
      <div style="font-size:10px;color:var(--txt3,#64748b)">AVANCE POR PLATA · ${o.pct_plata != null ? o.pct_plata + '%' : 's/presup'} ${o.presupuesto ? `($${(+o.gasto_real).toLocaleString('en-US')} de $${(+o.presupuesto).toLocaleString('en-US')})` : ''}</div>${bar(o.pct_plata, (+o.pct_plata || 0) > (+o.pct_tareas || 0) + 15 ? 'linear-gradient(90deg,#e7b65e,#f87171)' : 'linear-gradient(90deg,#34d399,#12b5a0)')}
      <div style="display:flex;gap:12px;font-size:11px;margin-top:4px">
        <span>${SEM[o.sem_costo] || '⚪'} costo ${o.costo_proyectado ? `<span style="opacity:.6">(proy. a hoy $${(+o.costo_proyectado).toLocaleString('en-US')})</span>` : ''}</span>
        <span>${SEM[o.sem_tiempo] || '⚪'} tiempo <span style="opacity:.6">(${o.pct_dias != null ? o.pct_dias + '% días' : 's/cronograma'})</span></span></div>
      ${revisar.length ? `<div class="meta" style="margin-top:8px;color:var(--amber,#e7b65e)">🔍 Qué revisar: ${RC_E(revisar.join(' · '))}</div>` : '<div class="meta" style="margin-top:8px;color:#34d399">En plan ✓</div>'}
    </div>`;
  };
  return `<div class="card"><div class="chart-h"><div class="t">Avance de obra EN VIVO</div><div class="k">tareas (Planner) vs plata (pagos+horas) · desviación contra cronograma · ${obras.length} en construcción</div></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px;margin-top:10px">${obras.map(card).join('') || '<div class="meta">Sin obras en construcción.</div>'}</div>
    <div class="meta" style="margin-top:10px">Definiciones: tareas = v_remodel_progress (cronograma del Planner cumplido) · plata = C2 (material_payments + horas×rate ÷ presupuesto) · proyección lineal sobre el cronograma · umbral = alerta_sobrecosto_pct. ⚠ Write-back del % a Airtable parqueado: falta scope write del token.</div></div>`;
}

// ─── RM-M2 · Recibo de pago quincenal por LÍDER (regla Silvia: sin contrato individual; el líder recibe y reparte) ───
function rcPagoQuincenal() {
  const hoy = new Date(); const d = hoy.getDate();
  const ini = d <= 15 ? new Date(hoy.getFullYear(), hoy.getMonth(), 1) : new Date(hoy.getFullYear(), hoy.getMonth(), 16);
  const fin = d <= 15 ? new Date(hoy.getFullYear(), hoy.getMonth(), 15) : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const iso = x => x.toISOString().slice(0, 10);
  const casas = (RC.obras || []).filter(o => o.active !== false).map(o => rcShort(o.address)).sort();
  let lideres = (RC.crewRates || []).map(c => c.nombre).filter(Boolean).sort();
  if (!lideres.length) lideres = [...new Set((RC.ledger || []).map(x => x.worker).filter(Boolean))].sort();
  const el = document.createElement('div');
  el.id = 'rc-pq-modal';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center';
  el.innerHTML = `<div class="card" style="width:520px;max-width:94vw;background:#0d1420;border:1px solid rgba(255,255,255,.15)">
    <div class="chart-h"><div class="t">💵 Pago de nómina quincenal</div><div class="k">recibo por LÍDER · horas del espejo</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0">
      <label style="font-size:11px;color:#9fb0c9">Desde<br><input id="pq-ini" type="date" value="${iso(ini)}" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px;color:inherit"></label>
      <label style="font-size:11px;color:#9fb0c9">Hasta<br><input id="pq-fin" type="date" value="${iso(fin)}" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px;color:inherit"></label>
    </div>
    <label style="font-size:11px;color:#9fb0c9">Casa<br><select id="pq-casa" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px;color:inherit;margin:4px 0 10px"><option value="">(todas las casas del período)</option>${casas.map(c => `<option>${RC_E(c)}</option>`).join('')}</select></label>
    <label style="font-size:11px;color:#9fb0c9">Líder que recibe y firma<br><select id="pq-lider" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px;color:inherit;margin:4px 0 14px">${lideres.map(c => `<option>${RC_E(c)}</option>`).join('')}</select></label>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="repbtn ghost" onclick="document.getElementById('rc-pq-modal').remove()">Cancelar</button><button class="repbtn" onclick="rcPagoGenerar()">Ver desglose →</button></div></div>`;
  document.body.appendChild(el);
}
async function rcPagoGenerar() {
  const ini = document.getElementById('pq-ini').value, fin = document.getElementById('pq-fin').value;
  const casa = document.getElementById('pq-casa').value, lider = document.getElementById('pq-lider').value;
  if (!ini || !fin || !lider) { alert('Completá período y líder.'); return; }
  const { data: hrs, error } = await sb.from('remodel_worker_hours').select('worker, casa, casa_norm, fecha, horas, pago').gte('fecha', ini).lte('fecha', fin).limit(3000);
  if (error) { alert('Error leyendo horas: ' + error.message); return; }
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const casaKey = norm(casa);
  // MISMA definición que el ledger C4: match por casa_norm contenido en la casa normalizada (≥4 chars)
  const rows = (hrs || []).filter(h => !casa || (h.casa_norm && h.casa_norm.length >= 4 && casaKey.includes(h.casa_norm)));
  if (!rows.length) { alert('Sin horas registradas en ese período' + (casa ? ' para esa casa' : '') + '.'); return; }
  const rates = {}; (RC.crewRates || []).forEach(c => rates[String(c.nombre || '').toLowerCase().trim()] = +c.pago_x_hora || 0);
  const porW = {};
  rows.forEach(h => {
    const w = (h.worker || '?').trim(); if (!porW[w]) porW[w] = { w, horas: 0, pagoReg: 0, casas: new Set() };
    porW[w].horas += +h.horas || 0; porW[w].pagoReg += +h.pago || 0; if (h.casa) porW[w].casas.add(String(h.casa).split(',')[0]);
  });
  const det = Object.values(porW).map(x => {
    const rate = rates[x.w.toLowerCase()] || 0;
    const devengado = rate ? Math.round(x.horas * rate * 100) / 100 : null;
    return { ...x, rate, monto: devengado != null ? devengado : Math.round(x.pagoReg * 100) / 100, sinRate: !rate };
  }).sort((a, b) => b.monto - a.monto);
  const total = Math.round(det.reduce((s, x) => s + x.monto, 0) * 100) / 100;
  document.getElementById('rc-pq-modal')?.remove();
  rcReciboOverlay({ ini, fin, casa: casa || 'Todas las casas', lider, det, total, horasTot: Math.round(det.reduce((s, x) => s + x.horas, 0) * 10) / 10 });
}
function rcReciboRender(r) {
  const M = n => '$' + (+n).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const filas = r.det.map(x => `<tr><td>${RC_E(x.w)}${x.sinRate ? ' <span style="color:#b45309;font-size:9px">(sin tarifa — se usa pago registrado)</span>' : ''}<div style="font-size:9px;color:#777">${RC_E([...x.casas].slice(0, 3).join(', '))}</div></td><td style="text-align:right">${x.horas.toFixed(1)}</td><td style="text-align:right">${x.rate ? M(x.rate) : '—'}</td><td style="text-align:right"><b>${M(x.monto)}</b></td></tr>`).join('');
  const w = window.open('', '_blank', 'width=760,height=900');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Recibo nómina ${r.ini} a ${r.fin}</title><style>
    body{font-family:-apple-system,Segoe UI,sans-serif;color:#111;margin:0;padding:36px;max-width:700px}
    .head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #b45309;padding-bottom:14px}
    .logo{font-size:22px;font-weight:800;color:#b45309}.logo span{display:block;font-size:10px;letter-spacing:2px;color:#666;font-weight:600}
    h1{font-size:16px;margin:18px 0 2px}.sub{font-size:12px;color:#555;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#666;border-bottom:1px solid #ccc;padding:6px 4px}
    th:nth-child(n+2),td:nth-child(n+2){text-align:right}td{padding:8px 4px;border-bottom:1px solid #eee}
    .tot{font-size:17px;font-weight:800;text-align:right;margin:14px 0;padding:10px;background:#faf5ef;border-radius:8px}
    .firma{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:40px}.firma div{border-top:1.5px solid #333;padding-top:6px;font-size:11px;color:#444}
    .nota{font-size:10px;color:#777;margin-top:26px;line-height:1.5}
    .btn{position:fixed;top:10px;right:10px;padding:8px 16px;background:#b45309;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700}
    @media print{.btn{display:none}}</style></head><body>
    <button class="btn" onclick="window.print()">🖨 Imprimir / PDF</button>
    <div class="head"><div class="logo">STRUCTURE ONE <span>REMODELACIÓN · AUSTIN, TX</span></div><div style="font-size:11px;color:#666;text-align:right">Recibo de pago de nómina<br><b>${r.ini} → ${r.fin}</b></div></div>
    <h1>Pago de nómina — ${RC_E(r.casa)}</h1>
    <div class="sub">Período ${r.ini} a ${r.fin} · ${r.det.length} trabajador(es) · ${r.horasTot} horas · Recibe y distribuye: <b>${RC_E(r.lider)}</b></div>
    <table><thead><tr><th>Trabajador</th><th>Horas</th><th>Valor/hora</th><th>Subtotal</th></tr></thead><tbody>${filas}</tbody></table>
    <div class="tot">TOTAL A PAGAR: ${M(r.total)}</div>
    <div class="firma"><div>Firma del líder (${RC_E(r.lider)})<br>Recibí conforme el total indicado para distribuir a mi equipo</div><div>Firma Structure One<br>Fecha: ____ / ____ / ______</div></div>
    <div class="nota">El dinero se entrega al líder de cuadrilla, quien lo distribuye a su equipo. Desglose calculado de las horas registradas en el sistema (Horas Trabajadas por Semana × tarifa de Personal en Campo). Generado por Flipping Rentals OS · ${new Date().toLocaleString('es-MX')}</div>
    </body></html>`);
  w.document.close();
}
window.rcPagoQuincenal = rcPagoQuincenal; window.rcPagoGenerar = rcPagoGenerar;

// ─── RM-M2 fase 2 · Recibo en overlay con FIRMA (canvas) + registro ───
function rcReciboOverlay(r) {
  RC._recibo = r;
  const M = n => '$' + (+n).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const filas = r.det.map(x => `<tr><td>${RC_E(x.w)}${x.sinRate ? ' <span style="color:#b45309;font-size:9px">(sin tarifa — pago registrado)</span>' : ''}<div style="font-size:9px;color:#777">${RC_E([...x.casas].slice(0, 3).join(', '))}</div></td><td style="text-align:right">${x.horas.toFixed(1)}</td><td style="text-align:right">${x.rate ? M(x.rate) : '—'}</td><td style="text-align:right"><b>${M(x.monto)}</b></td></tr>`).join('');
  const el = document.createElement('div');
  el.id = 'rc-recibo-ov';
  el.innerHTML = `<style>
    #rc-recibo-ov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99998;overflow:auto;padding:20px}
    #rc-recibo-doc{background:#fff;color:#111;max-width:700px;margin:0 auto;padding:34px;border-radius:12px;font-family:-apple-system,Segoe UI,sans-serif}
    #rc-recibo-doc .rrh{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #b45309;padding-bottom:12px}
    #rc-recibo-doc .rrlogo{font-size:21px;font-weight:800;color:#b45309}#rc-recibo-doc .rrlogo span{display:block;font-size:10px;letter-spacing:2px;color:#666}
    #rc-recibo-doc table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}
    #rc-recibo-doc th{text-align:left;font-size:10px;text-transform:uppercase;color:#666;border-bottom:1px solid #ccc;padding:6px 4px}
    #rc-recibo-doc th:nth-child(n+2),#rc-recibo-doc td:nth-child(n+2){text-align:right}
    #rc-recibo-doc td{padding:8px 4px;border-bottom:1px solid #eee}
    #rc-recibo-doc .rrtot{font-size:17px;font-weight:800;text-align:right;margin:12px 0;padding:10px;background:#faf5ef;border-radius:8px}
    #rc-firma-canvas{border:1.5px dashed #999;border-radius:8px;touch-action:none;background:#fcfcfc}
    .rrbtns{display:flex;gap:8px;justify-content:flex-end;max-width:700px;margin:12px auto 40px}
    .rrbtn{padding:9px 18px;border-radius:9px;border:none;font-weight:700;cursor:pointer;font-size:13px}
    @media print{ body *{visibility:hidden !important} #rc-recibo-ov{position:absolute;inset:0;background:#fff;padding:0;overflow:visible} #rc-recibo-doc, #rc-recibo-doc *{visibility:visible !important} #rc-recibo-doc{border-radius:0;max-width:none} .rrbtns{display:none} }
    </style>
    <div id="rc-recibo-doc">
      <div class="rrh"><div class="rrlogo">STRUCTURE ONE <span>REMODELACIÓN · AUSTIN, TX</span></div><div style="font-size:11px;color:#666;text-align:right">Recibo de pago de nómina<br><b>${r.ini} → ${r.fin}</b></div></div>
      <h2 style="font-size:16px;margin:16px 0 2px">Pago de nómina — ${RC_E(r.casa)}</h2>
      <div style="font-size:12px;color:#555">Período ${r.ini} a ${r.fin} · ${r.det.length} trabajador(es) · ${r.horasTot} horas · Recibe y distribuye: <b>${RC_E(r.lider)}</b></div>
      <table><thead><tr><th>Trabajador</th><th>Horas</th><th>Valor/hora</th><th>Subtotal</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="rrtot">TOTAL A PAGAR: ${M(r.total)}</div>
      <div style="margin-top:22px;font-size:11px;color:#444"><b>Firma del líder (${RC_E(r.lider)})</b> — Recibí conforme el total indicado para distribuir a mi equipo:</div>
      <canvas id="rc-firma-canvas" width="620" height="130" style="width:100%;max-width:620px;margin-top:6px"></canvas>
      <div style="display:flex;gap:10px;margin-top:4px"><button class="rrbtn" style="background:#eee;font-size:10px;padding:4px 10px" onclick="rcFirmaClear()">✕ borrar firma</button></div>
      <div style="font-size:10px;color:#777;margin-top:18px;line-height:1.5">El dinero se entrega al líder de cuadrilla, quien lo distribuye a su equipo (regla operativa; sin contrato individual). Desglose = horas registradas × tarifa de Personal en Campo. Generado por Flipping Rentals OS · ${new Date().toLocaleString('es-MX')}</div>
    </div>
    <div class="rrbtns">
      <button class="rrbtn" style="background:#e5e7eb" onclick="document.getElementById('rc-recibo-ov').remove()">Cerrar</button>
      <button class="rrbtn" style="background:#374151;color:#fff" onclick="window.print()">🖨 Imprimir / PDF</button>
      <button class="rrbtn" style="background:#b45309;color:#fff" onclick="rcReciboGuardar()">✍️ Firmar y registrar pago</button>
    </div>`;
  document.body.appendChild(el);
  const cv = document.getElementById('rc-firma-canvas');
  const ctx = cv.getContext('2d'); ctx.strokeStyle = '#1a1a5e'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  let draw = false, last = null; RC._firmaDirty = false;
  const pos = e => { const rect = cv.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return { x: (p.clientX - rect.left) * (cv.width / rect.width), y: (p.clientY - rect.top) * (cv.height / rect.height) }; };
  const start = e => { draw = true; last = pos(e); e.preventDefault(); };
  const move = e => { if (!draw) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; RC._firmaDirty = true; e.preventDefault(); };
  const end = () => { draw = false; };
  cv.addEventListener('mousedown', start); cv.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
  cv.addEventListener('touchstart', start); cv.addEventListener('touchmove', move); cv.addEventListener('touchend', end);
}
function rcFirmaClear() { const cv = document.getElementById('rc-firma-canvas'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); RC._firmaDirty = false; }
async function rcReciboGuardar() {
  const r = RC._recibo; if (!r) return;
  if (!RC._firmaDirty) { alert('Falta la firma del líder (dibujala en el recuadro).'); return; }
  const cv = document.getElementById('rc-firma-canvas');
  const firma = cv.toDataURL('image/png');
  const { data: { session } } = await sb.auth.getSession();
  const { error } = await sb.from('remodel_payroll_receipts').insert({
    periodo_ini: r.ini, periodo_fin: r.fin, casa: r.casa, lider: r.lider,
    total: r.total, horas: r.horasTot,
    detalle: r.det.map(x => ({ worker: x.w, horas: x.horas, rate: x.rate, monto: x.monto, sinRate: !!x.sinRate })),
    firma_png: firma, estado: 'realizado', airtable_writeback: 'pendiente',
    created_by: (session && session.user && session.user.email) || 'panel'
  });
  if (error) { alert('No se pudo registrar (¿logueado?): ' + error.message); return; }
  alert('✅ Pago registrado y firmado. Queda pendiente el write-back a Airtable (falta scope write del token).');
  document.getElementById('rc-recibo-ov')?.remove();
  try { const { data } = await sb.from('remodel_payroll_receipts').select('id, fecha_pago, periodo_ini, periodo_fin, casa, lider, total, estado, airtable_writeback').eq('active', true).order('created_at', { ascending: false }).limit(20); RC.receipts = data || []; } catch (e) {}
  rcRender();
}
window.rcReciboOverlay = rcReciboOverlay; window.rcFirmaClear = rcFirmaClear; window.rcReciboGuardar = rcReciboGuardar;
