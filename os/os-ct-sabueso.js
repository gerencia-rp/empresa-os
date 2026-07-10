// ════════════════════════════════════════════════════════════════
// 🐕 SABUESO CONTABLE — microscopio sobre cada número del holding (sección de /contable).
// Filosofía = Sabueso de Operación: detectar TODO descuadre → proponer → humano aprueba.
// Reglas duras: UNA definición por métrica (v_holding_pnl / espejos / qb_report_cache),
// sin hardcode (umbrales en ct_config), fuente declarada en cada cifra, soft-delete,
// findings persistentes en ct_findings (track abierto→resuelto entre cierres).
// El norte: "$0 sin conciliar = todo cuadra".
// ════════════════════════════════════════════════════════════════

const CT = { loaded: false, loading: false, err: null, cfg: {}, hml: [], pmf: [], db: [], run: [], extra: {}, fEmp: '', fSev: '', lastRunAt: null, modo: 'sabueso', eng: null, docx: [] };
window.CT = CT;

const CT_EMP_LBL = { fix_flip: '🏚 Fix & Flip', rentas: '🏠 Rentas', remodelacion: '🔨 Remodelación', educacion: '🎓 Educación', holding: '🏛 Holding' };
const CT_SEV = { critica: { lbl: 'CRÍTICO', cls: 'b-red' }, media: { lbl: 'REVISAR', cls: 'b-warn' }, info: { lbl: 'INFO', cls: 'b-ok' } };

function ctNum(key, def) { const r = CT.cfg[key]; const v = r != null ? parseFloat(r) : NaN; return isNaN(v) ? def : v; }
function ctQb(emp, report, label) { const r = (OS.qbCache || []).find(x => x.empresa === emp && x.report === report && x.label === label); return r ? +r.value : null; }
function ctQbSumLike(emp, report, prefix) {
  const rows = (OS.qbCache || []).filter(x => x.empresa === emp && x.report === report && (x.label || '').startsWith(prefix));
  return rows.length ? rows.reduce((s, x) => s + (+x.value || 0), 0) : null;
}
function ctQbFecha() { let m = null; (OS.qbCache || []).forEach(x => { if (x.fetched_at && (!m || x.fetched_at > m)) m = x.fetched_at; }); return m; }
function ctTieneLibrosPnl(emp) { return (OS.qbCache || []).some(x => x.empresa === emp && x.report && x.report.startsWith('pnl') && +x.value); }
function ctFmtD(ts) { return ts ? new Date(ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'; }

// ─── Carga (una vez por sesión de /contable; refresh con el botón) ───
async function ctLoad(force) {
  if (CT.loading) return;
  if (CT.loaded && !force) return;
  CT.loading = true; CT.err = null;
  try {
    const [cfg, hml, pmf, db, rev, sinAno, ag] = await Promise.all([
      sb.from('ct_config').select('*'),
      sb.from('ff_hml_loans').select('address,address_norm,monto_hml,fecha_vencimiento,fecha_inicio,plazo_meses,draws_cobrados').eq('active', true),
      sb.from('pm_monthly_finance').select('*').then(r => r.data || []).catch(() => []),
      sb.from('ct_findings').select('*').eq('active', true),
      sb.from('pm_payments').select('id', { count: 'exact', head: true }).eq('active', true).eq('status', 'revisar'),
      sb.from('pm_expenses').select('id', { count: 'exact', head: true }).eq('active', true).not('month', 'is', null).is('year', null),
      sb.from('agent_registry').select('id,nombre').eq('nombre', 'Sabueso Contable').is('deleted_at', null).maybeSingle().then(r => r.data).catch(() => null),
    ]);
    // datasets para los checks C9–C18 del motor de cierre (reunión 9-jul) — bajo RLS, áreas ajenas devuelven []
    const g = (q) => q.then(r => r.data || []).catch(() => []);
    const [hmlPays, ext, remodelC, matPays, wh, pmPayC, pmExpC, docx] = await Promise.all([
      g(sb.from('ff_hml_payments').select('address_norm,fecha,fee,pago_hml').eq('active', true)),
      g(sb.from('ff_extension_payments').select('*').eq('active', true)),
      g(sb.from('remodel_at_properties').select('address,property_id,proceso,avance_pct,avance_real,gasto_materiales,gasto_trabajadores,presupuesto_interno,valor_interno,monto_real,monto_por_gastar,fecha_inicio,fecha_real_fin').eq('active', true)),
      g(sb.from('remodel_material_payments').select('address,address_norm,property_id,precio,fecha,categoria,orden').eq('active', true).limit(3000)),
      g(sb.from('remodel_worker_hours').select('worker,casa,casa_norm,fecha,horas,pago,pago_total_dia').limit(6000)),
      g(sb.from('pm_payments').select('property_id,amount,billing_ym,proof_url,attachment_url,status,concept').eq('active', true).eq('type', 'ingreso').in('status', ['pagado', 'paid', 'completado']).limit(3000)),
      g(sb.from('pm_expenses').select('property_id,amount,billing_ym,category,subcategory,description,invoice_url').eq('active', true).limit(3000)),
      g(sb.from('ct_doc_extracts').select('*').eq('active', true).eq('estado', 'propuesta').order('created_at', { ascending: false })),
    ]);
    CT.eng = { hmlPays, extensiones: ext, remodel: remodelC, matPays, workerHours: wh, pmPay: pmPayC, pmExp: pmExpC };
    CT.docx = docx;
    CT.agentId = ag ? ag.id : null;
    if (cfg.error) throw cfg.error;
    CT.cfg = {}; (cfg.data || []).forEach(r => CT.cfg[r.key] = r.value);
    CT.hml = hml.data || [];
    CT.pmf = pmf;
    CT.db = db.data || [];
    CT.extra = { pagosRevisar: rev.count || 0, gastosSinAno: sinAno.count || 0 };
    CT.run = ctRunChecks();
    await ctPersist(CT.run);
    CT.lastRunAt = new Date().toISOString();
    CT.loaded = true;
  } catch (e) { CT.err = e.message || String(e); }
  CT.loading = false;
  if (window.osRender) osRender();
}
window.ctLoad = ctLoad;

// ─── Definiciones únicas (cada una con fuente) ───
function ctInversionistas() {
  const comprometido = (OS.investors || []).reduce((s, i) => s + (+i.capital_aportado || 0), 0);
  const pagado = (OS.investors || []).reduce((s, i) => s + (+i.capital_pagado || 0), 0);
  const qbo = ctQb('fix_flip', 'balance', 'Investor Contributions');
  return { comprometido, pagado, qbo };
}
function ctPrestamos() {
  const dealByNorm = {}; (OS.ff || []).forEach(d => dealByNorm[d.address_norm] = d);
  const esRefi = st => /refinanciad/.test(st || '');
  let osVivo = 0, osRefi = 0, osVendida = 0, vendidas = [];
  (CT.hml || []).forEach(l => {
    const st = (dealByNorm[l.address_norm] || {}).stage || '';
    const m = +l.monto_hml || 0;
    if (esRefi(st)) osRefi += m;
    else if (st === 'vendida') { osVendida += m; vendidas.push(l.address); }
    else osVivo += m;
  });
  return {
    osTotal: (CT.hml || []).reduce((s, l) => s + (+l.monto_hml || 0), 0),
    osVivo, osRefi, osVendida, vendidas,
    qboHml: ctQb('fix_flip', 'balance', 'Loan Payable – HML'),
    qboRefin: ctQb('fix_flip', 'balance', 'Loan Payable – HML- Refin'),
  };
}
function ctApalancamiento() {
  const deuda = ctQb('fix_flip', 'balance', 'Total Liabilities');
  const equity = ctQb('fix_flip', 'balance', 'Total Equity');
  return { deuda, equity, de: (deuda != null && equity) ? deuda / equity : null };
}
function ctCashPorEmpresa() {
  const out = {};
  ['fix_flip', 'remodelacion', 'educacion'].forEach(e => {
    const v = ctQb(e, 'balance', 'Total Bank Accounts');
    const v2 = v != null ? v : ctQb(e, 'balance', 'Efectivo y equivalentes de efectivo');
    if (v2 != null) out[e] = v2;
  });
  return out;
}

// ─── Runner: catálogo C1..C8 ───
function ctRunChecks() {
  const F = [];
  const add = (check, empresa, clave, titulo, impacto, sev, fuente, detalle) =>
    F.push({ check_id: check, empresa, clave, titulo, impacto_usd: Math.round(Math.abs(impacto || 0)), severidad: sev, fuente, detalle: detalle || {} });
  const dAbs = ctNum('c1_delta_abs_usd', 5000), dPct = ctNum('c1_delta_pct', 10) / 100, dCrit = ctNum('c1_critico_usd', 50000);
  const descuadra = (delta, base) => delta != null && (Math.abs(delta) > dAbs && Math.abs(delta) / Math.max(Math.abs(base || 0), 1) > 0.0001) && (Math.abs(delta) > dAbs || Math.abs(delta) / Math.max(Math.abs(base || 0), 1) > dPct);
  const sevPorMonto = d => Math.abs(d) > dCrit ? 'critica' : 'media';

  // ══ C1 · CONCILIACIÓN OS↔QBO ══
  const inv = ctInversionistas();
  if (inv.qbo != null) {
    const dPag = inv.pagado - inv.qbo;
    if (descuadra(dPag, inv.qbo)) add('C1', 'fix_flip', 'inv-pagado-vs-qbo',
      'Inversionistas: cash pagado [OS ' + OS_M(inv.pagado) + '] vs contabilizado [QBO ' + OS_M(inv.qbo) + '] — mismo concepto, debe cuadrar',
      dPag, sevPorMonto(dPag), 'OS↔QBO', { os_pagado: inv.pagado, qbo: inv.qbo, delta: dPag });
    const dComp = inv.comprometido - inv.qbo;
    if (descuadra(dComp, inv.qbo)) add('C1', 'fix_flip', 'inv-comprometido-vs-qbo',
      'Inversionistas: comprometido [OS ' + OS_M(inv.comprometido) + '] vs contabilizado [QBO ' + OS_M(inv.qbo) + '] — DIFERENCIA DE DEFINICIÓN, no error: capital firmado aún no recibido/contabilizado',
      dComp, 'info', 'OS↔QBO', { os_comprometido: inv.comprometido, qbo: inv.qbo, delta: dComp, nota: 'revisar con contadora qué comprometido ya debería estar en libros' });
  }
  const pre = ctPrestamos();
  if (pre.qboHml != null) {
    const dHml = pre.osVivo - pre.qboHml;
    if (descuadra(dHml, pre.qboHml)) add('C1', 'fix_flip', 'hml-vivo-vs-qbo',
      'Préstamos HML vivos: [OS ' + OS_M(pre.osVivo) + ' — deals sin refi/venta] vs [QBO Loan Payable–HML ' + OS_M(pre.qboHml) + ']',
      dHml, sevPorMonto(dHml), 'OS↔QBO', { os_vivo: pre.osVivo, qbo_hml: pre.qboHml, delta: dHml });
  }
  if (pre.qboRefin != null && pre.qboRefin > 0) add('C1', 'fix_flip', 'refi-sin-espejo',
    'Refi: QBO tiene Loan Payable–HML-Refin ' + OS_M(pre.qboRefin) + ' pero el OS NO espeja el principal del refi (falta campo "Monto Refi" en Airtable; hoy solo hay cashout/pago mensual)',
    pre.qboRefin, 'media', 'QBO', { qbo_refin: pre.qboRefin, os_refinanciadas_hml_original: pre.osRefi, accion: 'crear campo Monto Refi en Airtable FF y mapearlo al sync' });
  if (pre.osVendida > 0) add('C1', 'fix_flip', 'loan-en-vendida',
    'Préstamo HML activo en OS sobre casa VENDIDA (' + pre.vendidas.join(', ') + ') — si se pagó al cierre, archivar el préstamo en Airtable',
    pre.osVendida, 'media', 'OS', { casas: pre.vendidas, monto: pre.osVendida });
  const capQB = (ctQb('fix_flip', 'balance', 'Total Fixed Assets') || 0) + (ctQb('fix_flip', 'balance', 'Total Inventory – Properties Held for Sale') || 0);
  const compraOS = (OS.ff || []).reduce((s, d) => s + (+d.purchase_price || 0), 0);
  if (capQB && compraOS) {
    const dCap = compraOS - capQB;
    add('C1', 'fix_flip', 'capitalizado-vs-compra',
      'Casas: compra [OS ' + OS_M(compraOS) + '] vs capitalizado [QBO ' + OS_M(capQB) + '] — QBO incluye rehab capitalizado; diferencia esperable, revisar si el signo sorprende',
      dCap, 'info', 'OS↔QBO', { os_compra: compraOS, qbo_capitalizado: capQB });
  }
  // C1b · Rental Property POR CASA (fixed assets por dirección en QBO ↔ deals OS)
  const qbProps = (OS.qbCache || []).filter(x => x.empresa === 'fix_flip' && x.report === 'balance' && /^(Rental Property -|\. TX -)/.test(x.label || ''));
  const usados = new Set();
  qbProps.forEach(q => {
    const key = (q.label || '').replace(/^Rental Property -\s*/, '').replace(/^\. TX -\s*/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const matches = (OS.ff || []).filter(d => key && (d.address_norm || '').includes(key.slice(0, Math.min(key.length, 12))));
    if (!matches.length && !/casasmarlin/.test(key)) {
      add('C1', 'fix_flip', 'qbo-casa-sin-deal-' + key.slice(0, 16),
        'QBO tiene "' + q.label + '" (' + OS_M(+q.value) + ') sin deal que matchee en el OS — verificar dirección/estado',
        +q.value, 'info', 'QBO', { label: q.label, valor: +q.value });
    } else matches.forEach(m => usados.add(m.address_norm));
  });
  (OS.ff || []).filter(d => d.stage !== 'vendida' && !usados.has(d.address_norm)).forEach(d => {
    if (/marlin/.test(d.address_norm || '')) return; // Casas Marlin va agrupada en QBO
    add('C1', 'fix_flip', 'deal-sin-qbo-' + (d.address_norm || '').slice(0, 16),
      'Casa activa en OS sin cuenta "Rental Property" en QBO: ' + (d.address || '').split(',')[0] + ' (compra ' + OS_M(+d.purchase_price || 0) + ') — ¿capitalizada?',
      +d.purchase_price || 0, 'media', 'OS↔QBO', { address: d.address, stage: d.stage });
  });

  // ══ C2 · SALUD POR EMPRESA ══
  (OS.pnl || []).forEach(r => {
    if (r.empresa === 'consolidado') return;
    if (r.utilidad_bruta != null && +r.utilidad_bruta < 0) add('C2', r.empresa, 'margen-bruto-' + r.empresa,
      CT_EMP_LBL[r.empresa] + ': MARGEN BRUTO NEGATIVO — ingreso ' + OS_M(+r.ingreso) + ' < costo ' + OS_M(+r.costo_real) + ' (pierde antes del overhead)',
      +r.utilidad_bruta, 'critica', 'OS', { ingreso: +r.ingreso, costo: +r.costo_real, bruto: +r.utilidad_bruta });
    else if (r.ebitda != null && +r.ebitda < 0 && r.empresa !== 'fix_flip') add('C2', r.empresa, 'ebitda-neg-' + r.empresa,
      CT_EMP_LBL[r.empresa] + ': EBITDA operativo negativo (' + OS_M(+r.ebitda) + ')', +r.ebitda, 'media', 'OS', { ebitda: +r.ebitda });
  });
  const ffPnl = (OS.pnl || []).find(x => x.empresa === 'fix_flip') || {};
  if (ffPnl.realizado != null && +ffPnl.realizado < 0) add('C2', 'fix_flip', 'ff-realizado',
    'F&F: pérdida REALIZADA ' + OS_M(+ffPnl.realizado) + ' (casas con ciclo cerrado). El inyectado ' + OS_M(+ffPnl.inyectado || 0) + ' es cash en casas vivas, NO pérdida — se evalúa al cierre de cada casa',
    +ffPnl.realizado, 'critica', 'OS', { realizado: +ffPnl.realizado, inyectado: +ffPnl.inyectado });

  // ══ C3 · LIBROS AL DÍA ══
  const librosPct = ctNum('c3_libros_pct', 10) / 100;
  ['remodelacion', 'fix_flip'].forEach(emp => {
    const net = ctQb(emp, 'pnl_all', 'Net Income');
    const op = (OS.pnl || []).find(x => x.empresa === emp);
    if (net == null || !op || op.ebitda == null) return;
    const delta = (+op.ebitda) - net;
    if (Math.abs(delta) / Math.max(Math.abs(net), Math.abs(+op.ebitda), 1) > librosPct)
      add('C3', emp, 'libros-' + emp,
        CT_EMP_LBL[emp] + ': EBITDA operativo [OS ' + OS_M(+op.ebitda) + '] vs Net Income [QBO ' + OS_M(net) + '] desincronizados — libros atrasados o criterios distintos; revisar con contadora',
        delta, 'media', 'OS↔QBO', { ebitda_os: +op.ebitda, net_qbo: net, delta });
  });
  const qf = ctQbFecha();
  if (qf) {
    const dias = Math.floor((Date.now() - new Date(qf).getTime()) / 86400000);
    if (dias > ctNum('c3_qbo_stale_dias', 30)) add('C3', 'holding', 'qbo-stale',
      'El snapshot de QBO tiene ' + dias + ' días (' + ctFmtD(qf) + ') — refrescar antes de conciliar', 0, 'critica', 'QBO', { fetched_at: qf, dias });
  }

  // ══ C4 · COBRANZA / AR (por casa, mes de renta con aging 3 meses) ══
  const minDeuda = ctNum('c4_deuda_min_usd', 200);
  const mb0 = osMonthBounds();
  const ym = k => osYmShift(mb0.from.slice(0, 7), -k);
  (OS.props || []).forEach(p => {
    const occRent = (OS.units || []).filter(u => u.property_id === p.id && osUnitState(u) === 'ocupada').reduce((s, u) => s + (+u.target_rent || 0), 0);
    if (occRent <= 0) return;
    const cobradoYm = k => (OS.pay || []).filter(x => x.property_id === p.id && osBillYm(x) === ym(k)).reduce((s, x) => s + (+x.amount || 0), 0);
    const b = [0, 1, 2].map(k => Math.max(0, occRent - cobradoYm(k)));
    const total = b[0] + b[1] + b[2];
    if (total <= minDeuda) return;
    add('C4', 'rentas', 'ar-' + (p.name || p.id).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20),
      'Por cobrar · ' + (p.name || '').split(',')[0] + ': ' + OS_M(total) + ' (0-30: ' + OS_M(b[0]) + ' · 30-60: ' + OS_M(b[1]) + ' · 60+: ' + OS_M(b[2]) + ')',
      total, b[2] > minDeuda ? 'critica' : 'media', 'OS', { casa: p.name, aging: b, esperado_mes: occRent });
  });

  // ══ C7 · ANOMALÍA POR CASA ══
  const drawRatio = ctNum('c7_draw_ratio', 2), drawMin = ctNum('c7_draw_min_usd', 100000);
  (OS.draws || []).forEach(dr => {
    const deal = (OS.ff || []).find(x => x.address_norm === dr.address_norm);
    if (!deal) return;
    const est = +deal.remodel_est || 0, real = +dr.remodel_complete || 0;
    if (est > 0 && real > est * drawRatio && real >= drawMin)
      add('C7', 'fix_flip', 'draw-inflado-' + (dr.address_norm || '').slice(0, 16),
        'Draw inflado · ' + (deal.address || '').split(',')[0] + ': remodelación real ' + OS_M(real) + ' > ' + drawRatio + '× el estimado ' + OS_M(est) + ' — posible cash-out registrado como remodelación, marcar para revisión',
        real - est, 'critica', 'OS', { estimado: est, real, ratio: est ? real / est : null });
  });
  (OS.remodel || []).filter(o => o.proceso === 'Finalizado' && +o.ganancia < 0).forEach(o => {
    add('C7', 'remodelacion', 'obra-perdida-' + (o.address || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20),
      'Obra finalizada con PÉRDIDA · ' + (o.address || '').split(',')[0] + ': ' + OS_M(+o.ganancia), +o.ganancia, 'media', 'OS', { address: o.address, ganancia: +o.ganancia });
  });
  // Rentas: casas con utilidad negativa el mes cerrado (pm_monthly_finance)
  const mesCerrado = mb0.from.slice(0, 7);
  const pmfMes = (CT.pmf || []).filter(x => (x.month || '').startsWith(mesCerrado) && +x.utilidad < -minDeuda);
  pmfMes.forEach(x => {
    const p = (OS.props || []).find(pp => pp.id === x.property_id);
    add('C7', 'rentas', 'casa-roja-' + (x.property_id || '').slice(0, 8),
      'Casa en rojo (' + mb0.label + ') · ' + ((p && p.name) || 'casa').split(',')[0] + ': ingresos ' + OS_M(+x.ingresos) + ' − gastos ' + OS_M(+x.gastos) + ' = ' + OS_M(+x.utilidad),
      +x.utilidad, 'media', 'OS', { month: x.month, ingresos: +x.ingresos, gastos: +x.gastos });
  });

  // ══ C8 · HIGIENE DE DATOS ══
  if (!(OS.qbCache || []).some(x => x.empresa === 'rentas')) add('C8', 'rentas', 'rentas-sin-qbo',
    'Rentas SIN QuickBooks conectado (EverHome / Rental Profits en USD) — la conciliación OS↔QBO de rentas no es posible todavía', 0, 'media', 'QBO', {});
  if (!ctTieneLibrosPnl('educacion')) add('C8', 'educacion', 'edu-sin-pnl',
    'Educación sin P&L en QBO (hay balance, no libros de resultados) — sus métricas se muestran "sin datos", no $0', 0, 'info', 'QBO', {});
  if (CT.extra.pagosRevisar > 0) add('C8', 'rentas', 'pagos-revisar',
    CT.extra.pagosRevisar + ' pagos en "revisar" (sin Fecha de Pago en Airtable) — completar fecha y monto al cobrarse', 0, 'info', 'Airtable', { n: CT.extra.pagosRevisar });
  if (CT.extra.gastosSinAno > 0) add('C8', 'rentas', 'gastos-sin-ano',
    CT.extra.gastosSinAno + ' gastos con tag Mes pero SIN Año en Airtable — hoy caen al año de su fecha; taguear el Año', 0, 'info', 'Airtable', { n: CT.extra.gastosSinAno });
  (OS.remodel || []).filter(o => o.proceso === 'Finalizado' && !(+o.monto_real > 0)).slice(0, 5).forEach(o =>
    add('C8', 'remodelacion', 'obra-sin-monto-' + (o.address || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20),
      'Obra finalizada SIN Monto Real (ingreso vacío): ' + (o.address || '').split(',')[0] + ' — cargar el valor real en Airtable', 0, 'media', 'Airtable', { address: o.address }));

  // ══ C9–C18 · LOS 10 CHECKS ANTI-RECAÍDA (reunión 9-jul) — motor os/os-cierre-engine.js, una definición por métrica ══
  if (window.CierreEngine && CT.eng) {
    try {
      F.push(...CierreEngine.runChecks({
        deals: OS.ff || [],
        draws: (OS.draws || []).filter(d => d.active !== false),
        loans: CT.hml || [],
        hmlPays: CT.eng.hmlPays, extensiones: CT.eng.extensiones, remodel: CT.eng.remodel,
        matPays: CT.eng.matPays, workerHours: CT.eng.workerHours,
        pmProps: OS.props || [], pmPay: CT.eng.pmPay, pmExp: CT.eng.pmExp,
      }, CT.cfg));
    } catch (e) { add('C9', 'holding', 'engine-error', 'Motor de cierre falló: ' + (e.message || e), 0, 'info', 'OS', {}); }
  }

  return F;
}

// ─── Dueño único por dato (vista Cierre del mes) — configurable en ct_config, fallback por empresa ───
const CT_DUENO_EMP = { fix_flip: 'Juan', rentas: 'Carlos', remodelacion: 'Michell' };
function ctDueno(f) {
  const base = 'cierre_dueno_' + (f.check_id || '').toLowerCase();
  return CT.cfg[base + '_' + f.empresa] || CT.cfg[base] || CT_DUENO_EMP[f.empresa] || 'Silvia';
}

// ─── Persistencia: upsert + auto-resolver lo que dejó de disparar ───
async function ctPersist(run) {
  const nowISO = new Date().toISOString();
  const rows = run.map(f => ({ check_id: f.check_id, empresa: f.empresa, clave: f.clave, titulo: f.titulo, detalle: f.detalle, fuente: f.fuente, impacto_usd: f.impacto_usd, severidad: f.severidad, last_seen: nowISO, active: true }));
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await sb.from('ct_findings').upsert(rows.slice(i, i + 50), { onConflict: 'check_id,clave' });
    if (error) { CT.err = 'persist: ' + error.message; return; }
  }
  // auto-resolver: findings abiertos en DB cuya clave ya no dispara
  const vivas = new Set(run.map(f => f.check_id + '|' + f.clave));
  const aResolver = (CT.db || []).filter(d => d.estado !== 'resuelto' && !vivas.has(d.check_id + '|' + d.clave)).map(d => d.id);
  if (aResolver.length) await sb.from('ct_findings').update({ estado: 'resuelto', resolved_at: nowISO }).in('id', aResolver);
  const { data } = await sb.from('ct_findings').select('*').eq('active', true);
  CT.db = data || [];
}

// ─── Acciones (siempre propuesta + humano) ───
async function ctSetEstado(id, estado) {
  const { error } = await sb.from('ct_findings').update({ estado }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  const f = CT.db.find(x => x.id === id); if (f) f.estado = estado;
  osRender();
}
window.ctSetEstado = ctSetEstado;

async function ctProponerAjuste(id) {
  const f = CT.db.find(x => x.id === id); if (!f) return;
  if (!CT.agentId) return alert('No encontré el agente "Sabueso Contable" en agent_registry.');
  const { error } = await sb.from('agent_proposals').insert({
    agent_id: CT.agentId, tipo_accion: 'ajuste_contable',
    payload: { finding_id: f.id, check: f.check_id, empresa: f.empresa, titulo: f.titulo, impacto_usd: f.impacto_usd, detalle: f.detalle },
    evidencia: { resumen: f.titulo, impacto_usd: +f.impacto_usd, fuente: f.fuente || 'OS', detalle: f.detalle },
    estado: 'propuesta',
  });
  if (error) return alert('Error: ' + error.message);
  await ctSetEstado(id, 'ajuste_propuesto');
  if (window.toast) toast('✓ Ajuste propuesto — queda esperando aprobación humana', 'success');
}
window.ctProponerAjuste = ctProponerAjuste;

function ctAbiertos() { return (CT.db || []).filter(f => ['abierto', 'marcado_contadora', 'ajuste_propuesto'].includes(f.estado)); }

// Cierre semanal: lista para la contadora ordenada por plata + resueltos recientes
async function ctCierre() {
  const ab = ctAbiertos().sort((a, b) => (+b.impacto_usd || 0) - (+a.impacto_usd || 0));
  const desde = new Date(Date.now() - 7 * 86400000).toISOString();
  const resueltos = (CT.db || []).filter(f => f.estado === 'resuelto' && f.resolved_at && f.resolved_at >= desde);
  const L = [];
  L.push('CIERRE FINANCIERO · Sabueso Contable · ' + new Date().toLocaleDateString('es-MX'));
  L.push('Sin conciliar: ' + OS_M(ab.reduce((s, f) => s + (+f.impacto_usd || 0), 0)) + ' en ' + ab.length + ' descuadres (norte: $0)');
  L.push('Libros QBO al ' + ctFmtD(ctQbFecha()) + ' · fuente declarada por ítem [OS / QBO / Airtable]');
  L.push('');
  L.push('— QUÉ REVISAR CON LA CONTADORA (por $ de impacto) —');
  ab.forEach((f, i) => L.push((i + 1) + '. [' + (CT_SEV[f.severidad] || {}).lbl + ' · ' + OS_M(+f.impacto_usd) + ' · ' + (CT_EMP_LBL[f.empresa] || f.empresa || 'holding') + ' · ' + (f.fuente || '') + '] ' + f.titulo + (f.estado !== 'abierto' ? '  «' + f.estado.replace('_', ' ') + '»' : '')));
  L.push('');
  L.push('— RESUELTOS ESTA SEMANA (' + resueltos.length + ') —');
  resueltos.forEach(f => L.push('✓ ' + f.titulo + ' (' + OS_M(+f.impacto_usd) + ')'));
  const txt = L.join('\n');
  try { await navigator.clipboard.writeText(txt); if (window.toast) toast('📋 Cierre copiado al portapapeles (' + ab.length + ' pendientes, ' + resueltos.length + ' resueltos)', 'success'); }
  catch (e) { alert(txt.slice(0, 4000)); }
}
window.ctCierre = ctCierre;

// ─── 🗓 CIERRE DEL MES: SOLO excepciones, por $ de impacto, con dueño sugerido — objetivo 30–60 min, no 3 horas ───
function ctCierreMes() {
  const ab = ctAbiertos().filter(f => f.severidad !== 'info').sort((a, b) => (+b.impacto_usd || 0) - (+a.impacto_usd || 0));
  const porDueno = {};
  ab.forEach(f => { const d = ctDueno(f); (porDueno[d] = porDueno[d] || []).push(f); });
  const total = ab.reduce((s, f) => s + (+f.impacto_usd || 0), 0);
  const duenos = Object.keys(porDueno).sort((a, b) => porDueno[b].reduce((s, f) => s + (+f.impacto_usd || 0), 0) - porDueno[a].reduce((s, f) => s + (+f.impacto_usd || 0), 0));
  return '<div style="display:flex;gap:18px;align-items:baseline;flex-wrap:wrap;margin:2px 0 10px">'
    + '<div><span style="font-size:30px;font-weight:800" class="' + (ab.length ? 'down' : 'up') + '">' + ab.length + '</span> <span class="lab">excepciones</span></div>'
    + '<div><span style="font-size:22px;font-weight:760" class="warn">' + OS_M(total) + '</span> <span class="lab">impacto</span></div>'
    + '<div class="meta">solo lo que NO cuadra (nada de casa por casa) · dueño único por dato · cierre de 30–60 min · <button class="ct-btn" style="padding:3px 8px;font-size:10px" onclick="ctCopiarCierreMes()">📋 Copiar cierre del mes</button></div></div>'
    + (ab.length ? duenos.map(d => {
      const fs = porDueno[d]; const sub = fs.reduce((s, f) => s + (+f.impacto_usd || 0), 0);
      return '<div class="card" style="margin-bottom:10px"><div class="lab">👤 ' + OS_E(d) + ' — ' + fs.length + ' pendiente(s) · ' + OS_M(sub) + '</div>'
        + '<div style="overflow-x:auto"><table class="ptable"><tbody>' + fs.map(ctFindingRow).join('') + '</tbody></table></div></div>';
    }).join('') : '<div class="empty" style="padding:24px">🎯 <b class="up">$0 — el mes cierra sin excepciones.</b></div>');
}

async function ctCopiarCierreMes() {
  const ab = ctAbiertos().filter(f => f.severidad !== 'info').sort((a, b) => (+b.impacto_usd || 0) - (+a.impacto_usd || 0));
  const porDueno = {};
  ab.forEach(f => { const d = ctDueno(f); (porDueno[d] = porDueno[d] || []).push(f); });
  const L = ['CIERRE DEL MES · ' + new Date().toLocaleDateString('es-MX') + ' · ' + ab.length + ' excepciones · ' + OS_M(ab.reduce((s, f) => s + (+f.impacto_usd || 0), 0))];
  Object.keys(porDueno).forEach(d => {
    L.push('', '— ' + d.toUpperCase() + ' —');
    porDueno[d].forEach((f, i) => L.push((i + 1) + '. [' + (CT_SEV[f.severidad] || {}).lbl + ' · ' + OS_M(+f.impacto_usd) + ' · ' + f.check_id + '] ' + f.titulo));
  });
  try { await navigator.clipboard.writeText(L.join('\n')); if (window.toast) toast('📋 Cierre del mes copiado', 'success'); } catch (e) { alert(L.join('\n').slice(0, 4000)); }
}
window.ctCopiarCierreMes = ctCopiarCierreMes;

// ─── 📄 CAPA 0: statements HML / facturas → parser → PROPUESTA (nada entra sin aprobación humana) ───
function ctDocOpen() {
  let el = document.getElementById('ct-doc-modal');
  if (el) { el.remove(); }
  el = document.createElement('div'); el.id = 'ct-doc-modal';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px';
  el.innerHTML = '<div class="card" style="max-width:640px;width:100%;max-height:85vh;overflow:auto;background:var(--bg,#0a0e14);border:1px solid var(--glassb)">'
    + '<div class="chart-h"><div class="t">📄 Cargar statement HML / factura</div><div class="k"><button class="ct-btn" onclick="document.getElementById(\'ct-doc-modal\').remove()">✕ Cerrar</button></div></div>'
    + '<div class="meta" style="margin-bottom:8px">El parser extrae fecha/pago/interés/escrow/fee (statement) o ítems material/mueble/herramienta (factura). TODO entra como propuesta: nada cuenta hasta que un humano lo aprueba. Sin comprobante el pago NO se da por bueno.</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'
    + '<select id="ct-doc-tipo" class="ct-btn" style="padding:6px 8px"><option value="hml_statement">Statement HML</option><option value="factura">Factura / recibo</option></select>'
    + '<input id="ct-doc-file" type="file" accept="application/pdf,image/*" class="ct-btn" style="padding:6px 8px">'
    + '<input id="ct-doc-casa" placeholder="Casa (dirección)" class="ct-btn" style="padding:6px 8px;flex:1;min-width:160px">'
    + '<input id="ct-doc-url" placeholder="Link específico al comprobante (Drive)" class="ct-btn" style="padding:6px 8px;flex:1;min-width:200px">'
    + '<button class="ct-btn" style="padding:6px 12px" onclick="ctDocParse()">🔍 Extraer</button></div>'
    + '<div id="ct-doc-out" class="meta">Elegí el archivo y dale Extraer.</div></div>';
  document.body.appendChild(el);
}
window.ctDocOpen = ctDocOpen;

async function ctDocParse() {
  const file = (document.getElementById('ct-doc-file') || {}).files && document.getElementById('ct-doc-file').files[0];
  const out = document.getElementById('ct-doc-out');
  if (!file) { out.textContent = 'Falta el archivo.'; return; }
  if (file.size > 3 * 1024 * 1024) { out.textContent = 'Archivo muy grande (máx 3MB — límite del body de Vercel).'; return; }
  out.textContent = '⏳ Extrayendo con IA…';
  try {
    const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
    const { data: { session } } = await sb.auth.getSession();
    const resp = await fetch('/api/brain-chat?resource=parse-doc', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session && session.access_token || '') },
      body: JSON.stringify({ tipo: document.getElementById('ct-doc-tipo').value, media_type: file.type || 'application/pdf', data_base64: b64 }),
    });
    const j = await resp.json();
    if (!resp.ok || j.error) throw new Error(j.error || ('HTTP ' + resp.status));
    CT.docParsed = j.extract || {};
    out.innerHTML = '<div style="overflow-x:auto"><pre style="font-size:10.5px;white-space:pre-wrap;background:var(--glass);padding:10px;border-radius:8px">' + OS_E(JSON.stringify(CT.docParsed, null, 2)) + '</pre></div>'
      + '<button class="ct-btn" style="padding:6px 12px;margin-top:6px" onclick="ctDocGuardar()">💾 Guardar como propuesta</button>';
  } catch (e) { out.textContent = 'Error: ' + (e.message || e); }
}
window.ctDocParse = ctDocParse;

async function ctDocGuardar() {
  const casa = (document.getElementById('ct-doc-casa') || {}).value || (CT.docParsed && CT.docParsed.casa) || '';
  const url = (document.getElementById('ct-doc-url') || {}).value || '';
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('ct_doc_extracts').insert({
    tipo: document.getElementById('ct-doc-tipo').value, casa, payload: CT.docParsed || {}, comprobante_url: url || null,
    estado: 'propuesta', created_by: user && user.email,
  });
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('💾 Guardado como propuesta — apróbala en el Sabueso', 'success');
  document.getElementById('ct-doc-modal').remove();
  ctLoad(true);
}
window.ctDocGuardar = ctDocGuardar;

async function ctDocResolver(id, estado) {
  const d = (CT.docx || []).find(x => x.id === id); if (!d) return;
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('ct_doc_extracts').update({ estado, aprobado_por: user && user.email, aprobado_at: new Date().toISOString() }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  // statement aprobado con extensión → registra el "Pago de extensión" (con su comprobante) en el OS
  if (estado === 'aprobado' && d.tipo === 'hml_statement') {
    const ext = d.payload && (d.payload.extension || d.payload.pago_extension);
    if (ext && +ext.monto > 0) {
      await sb.from('ff_extension_payments').insert({
        address: d.casa, address_norm: (d.casa || '').toLowerCase().replace(/\s+/g, ' ').trim(), monto: +ext.monto,
        meses: +ext.meses || 1, fecha: ext.fecha || null, comprobante_url: d.comprobante_url, fuente: 'parser', created_by: user && user.email,
      });
      if (window.toast) toast('🆕 Pago de extensión registrado (' + OS_M(+ext.monto) + ')', 'success');
    }
  }
  // factura aprobada → propuesta para que Michell la cargue/etiquete en Airtable (material/mueble/herramienta)
  if (estado === 'aprobado' && d.tipo === 'factura' && CT.agentId) {
    await sb.from('agent_proposals').insert({
      agent_id: CT.agentId, tipo_accion: 'cargar_factura',
      payload: { doc_extract_id: d.id, casa: d.casa, items: d.payload && d.payload.items, comprobante_url: d.comprobante_url },
      evidencia: { resumen: 'Factura parseada p/ cargar en Airtable con categoría material/mueble/herramienta', fuente: 'parser' },
      estado: 'propuesta',
    });
  }
  ctLoad(true);
}
window.ctDocResolver = ctDocResolver;

function ctDocxBlock() {
  if (!(CT.docx || []).length) return '';
  return '<div class="card" style="margin-bottom:12px;border-color:rgba(94,182,231,.3)"><div class="lab">📄 Documentos parseados esperando aprobación (' + CT.docx.length + ')</div>'
    + CT.docx.map(d => '<div class="kv"><span>' + OS_E((d.tipo === 'hml_statement' ? 'Statement · ' : 'Factura · ') + (d.casa || 'sin casa') + ' · ' + new Date(d.created_at).toLocaleDateString('es-MX')) + (d.comprobante_url ? ' <a href="' + OS_E(d.comprobante_url) + '" target="_blank">📎</a>' : ' <span class="warn">sin comprobante</span>') + '</span>'
      + '<b><button class="ct-btn" style="padding:3px 8px;font-size:10px" onclick="ctDocResolver(\'' + d.id + '\',\'aprobado\')">✓ Aprobar</button> <button class="ct-btn" style="padding:3px 8px;font-size:10px" onclick="ctDocResolver(\'' + d.id + '\',\'rechazado\')">✕ Rechazar</button></b></div>').join('')
    + '</div>';
}

// ─── UI ───
function ctCSS() {
  if (document.getElementById("ct-styles")) return;
  const st = document.createElement("style"); st.id = "ct-styles";
  st.textContent = "#os-root .ct-btn{background:var(--glass);border:1px solid var(--glassb);color:var(--mut);border-radius:8px;cursor:pointer;font-size:11px;padding:5px 9px} #os-root .ct-btn:hover{color:var(--ink);border-color:var(--a2)} #os-root select.ct-btn{appearance:auto}";
  document.head.appendChild(st);
}
function ctChipFuente(f) { return '<span class="osbadge" style="margin:0 0 0 6px;font-size:8.5px">' + OS_E(f || 'OS') + '</span>'; }
function ctSemaforo(emp) {
  const r = (OS.pnl || []).find(x => x.empresa === emp) || {};
  const ab = ctAbiertos().filter(f => f.empresa === emp);
  const critAb = ab.some(f => f.severidad === 'critica');
  if (emp === 'educacion' && r.ebitda == null) return { ico: '⚪', lbl: 'sin libros' };
  if ((r.utilidad_bruta != null && +r.utilidad_bruta < 0) || critAb) return { ico: '🔴', lbl: 'atención' };
  if ((r.ebitda != null && +r.ebitda < 0) || ab.length) return { ico: '🟡', lbl: 'revisar' };
  return { ico: '🟢', lbl: 'sano' };
}
function ctCardEmpresa(emp) {
  const r = (OS.pnl || []).find(x => x.empresa === emp) || {};
  const s = ctSemaforo(emp);
  const net = ctQb(emp, 'pnl_all', 'Net Income');
  const ab = ctAbiertos().filter(f => f.empresa === emp);
  const abSum = ab.reduce((x, f) => x + (+f.impacto_usd || 0), 0);
  const filas = [];
  const kv = (k, v, cls) => '<div class="kv"><span>' + k + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
  if (emp === 'educacion' && r.ebitda == null) filas.push(kv('P&L', 'sin datos (QBO sin libros de resultados)', 'warn'));
  else {
    if (r.ingreso != null) filas.push(kv('Ingreso <span style="opacity:.5">[OS]</span>', OS_M(+r.ingreso)));
    if (r.utilidad_bruta != null) filas.push(kv('Margen bruto <span style="opacity:.5">[OS]</span>', (+r.ingreso ? Math.round(+r.utilidad_bruta / +r.ingreso * 100) + '%' : '—') + ' (' + OS_M(+r.utilidad_bruta) + ')', +r.utilidad_bruta < 0 ? 'down' : 'up'));
    if (r.ebitda != null) filas.push(kv('EBITDA op <span style="opacity:.5">[OS]</span>', OS_M(+r.ebitda), +r.ebitda < 0 ? 'down' : 'up'));
    if (emp === 'fix_flip') filas.push(kv('Realizado / inyectado <span style="opacity:.5">[OS]</span>', OS_M(+r.realizado || 0) + ' / ' + OS_M(+r.inyectado || 0), 'down'));
    filas.push(kv('Net Income <span style="opacity:.5">[QBO]</span>', net != null ? OS_M(net) : 'sin libros', net != null && net < 0 ? 'down' : ''));
  }
  filas.push(kv('Descuadres abiertos', ab.length ? ab.length + ' · ' + OS_M(abSum) : '0 ✓', ab.length ? 'warn' : 'up'));
  return '<div class="card"><div class="lab">' + (CT_EMP_LBL[emp] || emp) + ' ' + s.ico + ' <span style="letter-spacing:0;text-transform:none;font-weight:600">' + s.lbl + '</span></div>' + filas.join('') + '</div>';
}

function ctFindingRow(f) {
  const sev = CT_SEV[f.severidad] || CT_SEV.media;
  const est = { abierto: '', marcado_contadora: '<span class="osbadge warn">📌 p/ contadora</span>', ajuste_propuesto: '<span class="osbadge warn">📝 ajuste propuesto</span>', aceptado: '<span class="osbadge ok">aceptado</span>' }[f.estado] || '';
  const acts = [];
  if (f.estado === 'abierto' || f.estado === 'marcado_contadora') {
    if (f.estado === 'abierto') acts.push('<button class="ct-btn" style="padding:3px 8px;font-size:10px" onclick="ctSetEstado(\'' + f.id + '\',\'marcado_contadora\')">📌 Contadora</button>');
    acts.push('<button class="ct-btn" style="padding:3px 8px;font-size:10px" onclick="ctProponerAjuste(\'' + f.id + '\')">📝 Proponer ajuste</button>');
    acts.push('<button class="ct-btn" style="padding:3px 8px;font-size:10px" onclick="ctSetEstado(\'' + f.id + '\',\'aceptado\')" title="No es un error: diferencia entendida/aceptada">✓ Aceptar</button>');
  }
  return '<tr><td style="white-space:nowrap"><span class="badge ' + sev.cls + '">' + sev.lbl + '</span></td>'
    + '<td style="white-space:nowrap;font-weight:700;text-align:right">' + (f.impacto_usd ? OS_M(+f.impacto_usd) : '—') + '</td>'
    + '<td>' + OS_E(f.titulo) + ctChipFuente(f.fuente) + ' ' + est + '<div style="font-size:9px;opacity:.5">' + (CT_EMP_LBL[f.empresa] || f.empresa || '') + ' · ' + f.check_id + ' · 👤 ' + OS_E(ctDueno(f)) + ' · visto desde ' + ctFmtD(f.first_seen) + '</div></td>'
    + '<td style="white-space:nowrap;text-align:right">' + acts.join(' ') + '</td></tr>';
}

function ctSabuesoBlock(comp) {
  ctCSS();
  if (!CT.loaded && !CT.err) { ctLoad(); return '<div class="card" style="margin-top:16px"><div class="empty">🐕 Sabueso Contable corriendo los checks…</div></div>'; }
  if (CT.err) return '<div class="card" style="margin-top:16px"><div class="empty down">Sabueso: ' + OS_E(CT.err) + ' <button class="cbtn" onclick="ctLoad(true)">Reintentar</button></div></div>';
  const ab = ctAbiertos();
  const total = ab.reduce((s, f) => s + (+f.impacto_usd || 0), 0);
  let list = ab;
  if (CT.fEmp) list = list.filter(f => f.empresa === CT.fEmp);
  if (CT.fSev) list = list.filter(f => f.severidad === CT.fSev);
  list = [...list].sort((a, b) => (+b.impacto_usd || 0) - (+a.impacto_usd || 0));
  const inv = ctInversionistas(); const pre = ctPrestamos(); const apal = ctApalancamiento(); const cash = ctCashPorEmpresa();
  const deOk = apal.de == null || apal.de <= ctNum('de_max', 8);
  const emps = ['', 'fix_flip', 'rentas', 'remodelacion', 'educacion', 'holding'];
  const sevs = ['', 'critica', 'media', 'info'];
  const kv = (k, v, cls) => '<div class="kv"><span>' + k + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';

  const hdr = '<div class="chart-h"><div class="t">🐕 Sabueso Contable</div><div class="k">libros QBO al ' + ctFmtD(ctQbFecha()) + ' · corrida ' + ctFmtD(CT.lastRunAt)
    + ' · <button class="ct-btn" style="padding:3px 8px;font-size:10px' + (CT.modo === 'sabueso' ? ';color:var(--ink);border-color:var(--a2)' : '') + '" onclick="CT.modo=\'sabueso\';osRender()">🐕 Microscopio</button>'
    + ' <button class="ct-btn" style="padding:3px 8px;font-size:10px' + (CT.modo === 'cierre' ? ';color:var(--ink);border-color:var(--a2)' : '') + '" onclick="CT.modo=\'cierre\';osRender()">🗓 Cierre del mes</button>'
    + ' <button class="ct-btn" style="padding:3px 8px;font-size:10px" onclick="ctDocOpen()">📄 Statement/Factura</button>'
    + ' <button class="ct-btn" style="padding:3px 8px;font-size:10px" onclick="ctLoad(true)">↻ Re-correr</button> <button class="ct-btn" style="padding:3px 8px;font-size:10px" onclick="ctCierre()">📋 Cierre p/ contadora</button></div></div>';
  if (CT.modo === 'cierre') return '<div class="card" style="margin-top:16px;border-color:rgba(231,182,94,.3)">' + hdr + ctDocxBlock() + ctCierreMes() + '</div>';
  return '<div class="card" style="margin-top:16px;border-color:rgba(231,182,94,.3)">'
    + hdr + ctDocxBlock()
    + '<div style="display:flex;gap:18px;align-items:baseline;flex-wrap:wrap;margin:2px 0 12px">'
    + '<div><span style="font-size:30px;font-weight:800" class="' + (total ? 'down' : 'up') + '">' + OS_M(total) + '</span> <span class="lab">sin conciliar</span></div>'
    + '<div><span style="font-size:22px;font-weight:760" class="' + (ab.length ? 'warn' : 'up') + '">' + ab.length + '</span> <span class="lab">descuadres abiertos</span></div>'
    + '<div class="meta">el norte: <b class="up">$0 = todo cuadra</b> · cada cifra declara su fuente [OS / QBO / Airtable]</div></div>'

    + '<div class="grid k4" style="margin-bottom:14px">'
    + ctCardEmpresa('fix_flip') + ctCardEmpresa('rentas') + ctCardEmpresa('remodelacion') + ctCardEmpresa('educacion')
    + '</div>'

    + '<div class="grid k3" style="margin-bottom:14px">'
    + '<div class="card"><div class="lab">Inversionistas — 3 conceptos, no un número</div>'
    + kv('Comprometido <span style="opacity:.5">[OS aportado]</span>', OS_M(inv.comprometido))
    + kv('Pagado (cash) <span style="opacity:.5">[OS]</span>', OS_M(inv.pagado))
    + kv('Contabilizado <span style="opacity:.5">[QBO]</span>', inv.qbo != null ? OS_M(inv.qbo) : 'sin libros')
    + '<div class="meta" style="margin-top:6px">Se reconcilia pagado↔QBO (mismo concepto). Comprometido−QBO = ' + (inv.qbo != null ? OS_M(inv.comprometido - inv.qbo) : '—') + ' es diferencia de definición.</div></div>'
    + '<div class="card"><div class="lab">Préstamos — espejando el chart of accounts QBO</div>'
    + kv('HML vivo <span style="opacity:.5">[OS]</span>', OS_M(pre.osVivo)) + kv('Loan Payable–HML <span style="opacity:.5">[QBO]</span>', pre.qboHml != null ? OS_M(pre.qboHml) : '—', 'warn')
    + kv('Refinanciadas (HML orig.) <span style="opacity:.5">[OS]</span>', OS_M(pre.osRefi)) + kv('HML-Refin <span style="opacity:.5">[QBO]</span>', pre.qboRefin != null ? OS_M(pre.qboRefin) + ' <span class="ff-dqx">sin espejo OS</span>' : '—')
    + '</div>'
    + '<div class="card"><div class="lab">Apalancamiento y caja</div>'
    + kv('Deuda / Equity <span style="opacity:.5">[QBO F&F]</span>', apal.de != null ? apal.de.toFixed(1) + '× ' + (deOk ? '' : '⚠ > ' + ctNum('de_max', 8) + '×') : '—', deOk ? '' : 'down')
    + Object.keys(cash).map(e => kv('Cash ' + (CT_EMP_LBL[e] || e) + ' <span style="opacity:.5">[QBO]</span>', OS_M(cash[e]))).join('')
    + kv('Cash Rentas', 'sin QBO conectado', 'warn')
    + '<div class="meta" style="margin-top:6px">Runway: pendiente P&L mensual QBO (no se inventa burn).</div></div>'
    + '</div>'

    + '<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">'
    + '<select class="ct-btn" style="padding:5px 8px" onchange="CT.fEmp=this.value;osRender()">' + emps.map(e => '<option value="' + e + '" ' + (CT.fEmp === e ? 'selected' : '') + '>' + (e ? (CT_EMP_LBL[e] || e) : 'Todas las empresas') + '</option>').join('') + '</select>'
    + '<select class="ct-btn" style="padding:5px 8px" onchange="CT.fSev=this.value;osRender()">' + sevs.map(s => '<option value="' + s + '" ' + (CT.fSev === s ? 'selected' : '') + '>' + (s ? (CT_SEV[s] || {}).lbl : 'Toda severidad') + '</option>').join('') + '</select>'
    + '<span class="meta" style="align-self:center">' + list.length + ' de ' + ab.length + ' · acciones: siempre propuesta, un humano aprueba</span></div>'
    + (list.length
      ? '<div style="overflow-x:auto"><table class="ptable"><thead><tr><th>Sev</th><th style="text-align:right">$ impacto</th><th>Descuadre</th><th style="text-align:right">Acción</th></tr></thead><tbody>' + list.map(ctFindingRow).join('') + '</tbody></table></div>'
      : '<div class="empty" style="padding:24px">🎯 <b class="up">$0 — todo cuadra</b> con los filtros actuales.</div>')
    + '</div>';
}
window.ctSabuesoBlock = ctSabuesoBlock;
