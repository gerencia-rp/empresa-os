// ════════════════════════════════════════════════════════════════
// ∿ EVM — SEGUIMIENTO GERENCIAL POR VALOR GANADO (Earned Value Management)
// Bloque C.1 del handoff. Sección nueva del Command Center de Remodelación
// para obras EN CURSO: BAC / PV / EV / AC → CV, SV, CPI, SPI, EAC, ETC, VAC,
// %avance, con semáforos, curva S (Chart.js), tabla por fase, narrativa
// gerencial y vista de cartera. Cortes "congelados" a remodel_snapshots.
//
// Fuentes de datos (mapeadas al código real, SOLO LECTURA salvo el corte):
//   BAC (total y por fase) ← remodel_projects.activities[].{phase,total}
//                            (fallback: remodel_at_properties.presupuesto_interno)
//   EV  ← avance físico por fase = weekly_activities done/total por norm_etapa,
//         ponderado por remodel_stage_weights; con OVERRIDE MANUAL por fase.
//         (fallback casa: avance_real del Planner)
//   AC  ← v_remodel_presupuesto_casa.total_real (pagos material + horas×rate).
//         Nota: la data NO trae AC por fase → el AC por fase es PRORRATEO
//         proporcional al EV de cada fase, ETIQUETADO como estimado.
//   PV  ← cronograma baseline (weekly_activities.baseline_date por fase).
//   Serie curva S ← remodel_snapshots (EV≈presupuesto×avance%, AC=gasto_total).
//
// NO expone `sb` en window. Escrituras vía upsert/ safe helpers. Idempotente.
// ════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 1) MATEMÁTICA PURA (sin dependencias del browser → testeable en Node)
// ─────────────────────────────────────────────────────────────
function rmEvmMetrics(v) {
  const BAC = +v.BAC || 0, PV = +v.PV || 0, EV = +v.EV || 0, AC = +v.AC || 0;
  const CV = EV - AC;                       // Cost Variance
  const SV = EV - PV;                       // Schedule Variance
  const CPI = AC > 0 ? EV / AC : null;      // Cost Performance Index
  const SPI = PV > 0 ? EV / PV : null;      // Schedule Performance Index
  // EAC principal = BAC / CPI (asume que el desempeño de costo continúa).
  const EAC_cpi = (CPI != null && CPI > 0) ? BAC / CPI : null;
  // EAC alterno = AC + (BAC − EV)/CPI (equivalente algebraico; se muestra también).
  const EAC_atipico = (CPI != null && CPI > 0) ? AC + (BAC - EV) / CPI : null;
  const EAC = EAC_cpi;
  const ETC = (EAC != null) ? EAC - AC : null;   // Estimate To Complete
  const VAC = (EAC != null) ? BAC - EAC : null;  // Variance At Completion
  const pctAvance = BAC > 0 ? EV / BAC : null;   // % avance (valor ganado / total)
  const pctGastado = BAC > 0 ? AC / BAC : null;
  // TCPI = trabajo restante / fondos restantes (eficiencia requerida para cerrar en BAC)
  const tcpi = (BAC - AC) !== 0 ? (BAC - EV) / (BAC - AC) : null;
  return { BAC, PV, EV, AC, CV, SV, CPI, SPI, EAC, EAC_cpi, EAC_atipico, ETC, VAC, pctAvance, pctGastado, tcpi };
}

// Semáforo canónico de índices (CPI/SPI): verde ≥1.00, amarillo 0.90–0.99, rojo <0.90.
function rmEvmLight(x) {
  if (x == null || !isFinite(x)) return 'off';
  if (x >= 1.00) return 'ok';
  if (x >= 0.90) return 'warn';
  return 'bad';
}

// Normaliza la etapa/stage (texto libre o número) a fase '1'..'6' del catálogo.
// 1 Demolición · 2 Cimentación · 3 Externo · 4 Estructura · 5 Interno · 6 Limpieza
function rmEvmPhaseOf(stage) {
  if (stage == null) return null;
  const s = String(stage).trim().toLowerCase();
  if (!s) return null;
  const m = s.match(/^\s*([1-6])(?:[.\)\s]|$)/);       // "1", "1.", "1)", "1 Demolición"
  if (m) return m[1];
  if (/demol/.test(s)) return '1';
  if (/ciment|cimient|foundation|concret|zapata/.test(s)) return '2';
  if (/exter|extern|fachad|roof|techo|outdoor|jard|landscap/.test(s)) return '3';
  if (/estructur|structur|framing|marco|drywall|dry wall|panel|electr|plom|fontan|mep|hvac|climat/.test(s)) return '4';
  if (/interi|intern|pintur|paint|piso|floor|cocina|kitchen|bath|baño|bano|acabado|carpint|puerta|closet/.test(s)) return '5';
  if (/limpie|clean|aseo|final|entrega|detail|touch|punch/.test(s)) return '6';
  return null;
}

// Nombres de fase (para UI y para el test)
const RM_EVM_FASES = { '1': 'Demolición', '2': 'Cimentación', '3': 'Externo', '4': 'Estructura', '5': 'Interno', '6': 'Limpieza' };

// Valor planeado a una fecha `t` (ms), a partir de los rangos baseline por fase.
// bacPhase: {fase: presupuesto}. ranges: {fase: {min,max}} en ms. bacTotal + fechas obra para fallback.
function rmEvmPlannedValueAt(tMs, bacPhase, ranges, fallback) {
  let pv = 0, cov = 0;
  for (const p of ['1', '2', '3', '4', '5', '6']) {
    const bac = +bacPhase[p] || 0;
    if (bac <= 0) continue;
    const r = ranges[p];
    if (!r) continue;
    cov += bac;
    const span = Math.max(1, (r.max - r.min) / 86400000 + 1);
    const elapsed = (tMs - r.min) / 86400000 + 1;
    const frac = Math.max(0, Math.min(1, elapsed / span));
    pv += bac * frac;
  }
  if (cov <= 0) {
    // Sin cronograma por fase: prorrateo temporal simple sobre fechas de la obra.
    if (fallback && fallback.start && fallback.end && fallback.bac > 0) {
      const st = fallback.start, en = fallback.end;
      if (en > st) { const f = Math.max(0, Math.min(1, (tMs - st) / (en - st))); return fallback.bac * f; }
    }
    return null;
  }
  return pv;
}

// Exponer para Node (test) sin romper el browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { rmEvmMetrics, rmEvmLight, rmEvmPhaseOf, rmEvmPlannedValueAt, RM_EVM_FASES };
}

/* ═══════════════════════════ EVM-UI (solo browser) ═══════════════════════════ */

// ─────────────────────────────────────────────────────────────
// 2) CARGA PEREZOSA DE DATOS (remodel_projects, weekly_activities,
//    remodel_snapshots, remodel_stage_weights) — cacheada en RC.evm
// ─────────────────────────────────────────────────────────────
async function rcEVMLoad() {
  if (typeof RC === 'undefined') return;
  RC.evm = RC.evm || { manual: {} };
  RC.evm.loading = true;
  try {
    const propIds = (RC.obras || []).map(o => o.property_id).filter(Boolean);
    const atIds = (RC.obras || []).map(o => o.airtable_id).filter(Boolean);
    const [proj, wa, snaps, weights, phaseCosts] = await Promise.all([
      sb.from('remodel_projects').select('id, property_id, address, activities, start_date, end_date_estimated, budget_total, budget_material, budget_labor, progress_real').is('archived_at', null).then(r => r.data || []).catch(() => []),
      propIds.length
        ? sb.from('weekly_activities').select('property_id, stage, status, activity_code, date, baseline_date, is_critical').in('property_id', propIds).then(r => r.data || []).catch(() => [])
        : Promise.resolve([]),
      atIds.length
        ? sb.from('remodel_snapshots').select('airtable_id, snapshot_date, avance_pct, gasto_total, presupuesto, gasto_materiales, gasto_trabajadores').in('airtable_id', atIds).order('snapshot_date', { ascending: true }).then(r => r.data || []).catch(() => [])
        : Promise.resolve([]),
      sb.from('remodel_stage_weights').select('property_id, etapa, peso_pct').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('remodel_phase_costs').select('property_id, fase, costo_materiales, costo_mano_obra, costo_equipo, total').then(r => r.data || []).catch(() => [])
    ]);
    const projByProp = {}; (proj || []).forEach(p => { if (p.property_id) projByProp[p.property_id] = p; });
    const waByProp = {}; (wa || []).forEach(a => { if (!a.property_id) return; (waByProp[a.property_id] = waByProp[a.property_id] || []).push(a); });
    const snapsByAt = {}; (snaps || []).forEach(s => { if (!s.airtable_id) return; (snapsByAt[s.airtable_id] = snapsByAt[s.airtable_id] || []).push(s); });
    const weightByProp = {}; (weights || []).forEach(w => { if (!w.property_id) return; (weightByProp[w.property_id] = weightByProp[w.property_id] || {})[w.etapa] = +w.peso_pct || 0; });
    const phaseCostsByProp = {}; (phaseCosts || []).forEach(pc => { if (!pc.property_id) return; (phaseCostsByProp[pc.property_id] = phaseCostsByProp[pc.property_id] || {})[String(pc.fase)] = pc; });
    RC.evm.phaseCostsByProp = phaseCostsByProp;
    RC.evm.projByProp = projByProp;
    RC.evm.waByProp = waByProp;
    RC.evm.snapsByAt = snapsByAt;
    RC.evm.weightByProp = weightByProp;
    RC.evm.loaded = true;
  } catch (e) {
    RC.evm.loaded = true; // evita loop infinito; muestra lo que se pueda
    RC.evm.error = e && e.message;
  } finally {
    RC.evm.loading = false;
  }
}

// Match casa → fila de costo real (v_remodel_presupuesto_casa) por property_id / airtable_id / dirección.
function rcEVMMatchCost(o) {
  const pc = RC.presupCasa || [];
  let f = pc.find(x => o.property_id && x.property_id === o.property_id);
  if (!f) f = pc.find(x => o.airtable_id && x.airtable_id === o.airtable_id);
  if (!f && o.address) { const na = String(o.address).split(',')[0].trim().toLowerCase(); f = pc.find(x => (x.address || '').split(',')[0].trim().toLowerCase() === na); }
  return f || null;
}

// ─────────────────────────────────────────────────────────────
// 3) CÓMPUTO EVM POR OBRA
// ─────────────────────────────────────────────────────────────
function rcEVMObra(o) {
  const evm = RC.evm || {};
  const proj = (evm.projByProp || {})[o.property_id] || null;
  const acts = (proj && Array.isArray(proj.activities)) ? proj.activities : [];

  // BAC por fase — prioridad: costos importados (C.2) > activities del Estimador.
  const bacPhase = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };
  const pcImport = (evm.phaseCostsByProp || {})[o.property_id] || null;
  let bacFromActs = 0, fuenteBAC = null;
  if (pcImport) {
    for (const p of ['1', '2', '3', '4', '5', '6']) { if (pcImport[p]) bacPhase[p] = +pcImport[p].total || 0; }
    fuenteBAC = 'importado';
  } else {
    acts.forEach(a => { const p = rmEvmPhaseOf(a.phase); const t = +a.total || 0; bacFromActs += t; if (p) bacPhase[p] += t; });
    if (bacFromActs > 0) fuenteBAC = 'estimador';
  }
  const bacPhaseSum = Object.values(bacPhase).reduce((a, x) => a + (+x || 0), 0);
  const BAC = bacPhaseSum > 0 ? bacPhaseSum : (+o.presupuesto_interno || 0);
  // ¿Hay desglose de presupuesto por fase fiable?
  const tienePresupFase = bacPhaseSum > 0;

  // Avance físico por fase desde weekly_activities (done/total), con override manual.
  const wa = (evm.waByProp || {})[o.property_id] || [];
  const doneTot = {};
  wa.forEach(a => {
    const st = (a.status || '').toLowerCase();
    if (st === 'cancelled' || st === 'canceled') return;
    const p = rmEvmPhaseOf(a.stage);
    if (!p) return;
    const d = doneTot[p] = doneTot[p] || { done: 0, total: 0 };
    d.total++; if (st === 'done') d.done++;
  });
  const manual = ((evm.manual || {})[o.property_id]) || {};

  const evPhase = {};
  let EV = 0, evCubierto = 0;
  for (const p of ['1', '2', '3', '4', '5', '6']) {
    const dt = doneTot[p];
    let pct = (dt && dt.total > 0) ? dt.done / dt.total : null;
    let esManual = false;
    if (manual[p] != null && manual[p] !== '') { pct = Math.max(0, Math.min(100, +manual[p])) / 100; esManual = true; }
    const bac = bacPhase[p];
    const ev = (pct != null) ? bac * pct : 0;
    evPhase[p] = { pct, bac, ev, ac: 0, done: dt ? dt.done : null, total: dt ? dt.total : null, manual: esManual };
    if (pct != null && bac > 0) { EV += ev; evCubierto += bac; }
  }

  // ¿Hay señal de avance por fase? Si no, EV a nivel casa (avance del Planner / grueso).
  const hayFase = tienePresupFase && Object.values(evPhase).some(x => x.pct != null && x.bac > 0);
  if (!hayFase) {
    const physHouse = (o.avance_pct != null ? +o.avance_pct : 0) / 100;
    EV = BAC * physHouse;
  }

  // AC (costo real) a nivel casa
  const pc = rcEVMMatchCost(o);
  const AC = pc ? (+pc.total_real || 0) : ((+o.gasto_materiales || 0) + (+o.gasto_trabajadores || 0));

  // AC por fase = prorrateo proporcional al EV de cada fase (proxy, etiquetado).
  const evSum = Object.values(evPhase).reduce((a, x) => a + (x.ev || 0), 0);
  const bacSum = Object.values(evPhase).reduce((a, x) => a + (x.bac || 0), 0);
  for (const p of ['1', '2', '3', '4', '5', '6']) {
    const w = evSum > 0 ? (evPhase[p].ev / evSum) : (bacSum > 0 ? (evPhase[p].bac / bacSum) : 0);
    evPhase[p].ac = AC * w;
  }

  // PV (valor planeado) desde el cronograma baseline
  const ranges = rcEVMPhaseRanges(wa);
  const fallback = { start: o.fecha_inicio ? new Date(o.fecha_inicio).getTime() : null, end: o.fecha_estimada_fin ? new Date(o.fecha_estimada_fin).getTime() : null, bac: BAC };
  const PV = rmEvmPlannedValueAt(Date.now(), bacPhase, ranges, fallback);

  const metrics = rmEvmMetrics({ BAC, PV: PV || 0, EV, AC });
  return { o, proj, BAC, PV, EV, AC, evPhase, hayFase, tienePresupFase, fuenteBAC, ranges, bacPhase, fallback, metrics };
}

// Rangos de fechas planeadas por fase (baseline_date, fallback date) → {fase:{min,max}} en ms.
function rcEVMPhaseRanges(wa) {
  const ranges = {};
  (wa || []).forEach(a => {
    const p = rmEvmPhaseOf(a.stage); if (!p) return;
    const d = a.baseline_date || a.date; if (!d) return;
    const t = new Date(String(d).slice(0, 10) + 'T00:00:00').getTime();
    if (isNaN(t)) return;
    const r = ranges[p] = ranges[p] || { min: t, max: t };
    if (t < r.min) r.min = t; if (t > r.max) r.max = t;
  });
  return ranges;
}

// ─────────────────────────────────────────────────────────────
// 4) SECCIÓN UI — cartera + detalle por obra
// ─────────────────────────────────────────────────────────────
function rcSecEVM(c) {
  // Carga perezosa
  if (!RC.evm || !RC.evm.loaded) {
    if (!RC.evm || !RC.evm.loading) { setTimeout(() => { rcEVMLoad().then(() => rcRender()); }, 0); }
    return rcHeader('Valor Ganado (EVM)', 'Cargando cronograma, presupuestos y cortes…') +
      `<div class="card" style="text-align:center;padding:40px"><div style="font-size:34px">${osIcon('loader')}</div><div class="meta" style="margin-top:10px">Preparando el análisis EVM…</div></div>`;
  }

  const activas = (c.activas || []).filter(o => (o.proceso === 'En construcción') || rcEVMMatchCost(o) || (RC.evm.projByProp || {})[o.property_id]);
  const rows = activas.map(rcEVMObra).filter(r => r.BAC > 0);
  // Ordenar: primero las de peor CPI
  rows.sort((a, b) => (a.metrics.CPI == null ? 9 : a.metrics.CPI) - (b.metrics.CPI == null ? 9 : b.metrics.CPI));

  const sel = RC.evm.sel && rows.find(r => r.o.airtable_id === RC.evm.sel) ? RC.evm.sel : (rows[0] && rows[0].o.airtable_id);

  const head = rcHeader('Valor Ganado (EVM)', 'Seguimiento gerencial de obras en curso: costo, cronograma y proyección a cierre.');
  if (!rows.length) {
    return head + `<div class="card" style="padding:26px"><div class="meta">No hay obras en curso con presupuesto cargado para EVM. Se requiere: un proyecto del Estimador (BAC) o <b>presupuesto_interno</b>, y costo real / avance. ${RC.evm.error ? '<br>⚠ ' + RC_E(RC.evm.error) : ''}</div></div>`;
  }

  return head + rcEVMPortfolio(rows) + rcEVMDetalle(rows.find(r => r.o.airtable_id === sel) || rows[0], rows);
}
typeof window !== 'undefined' && (window.rcSecEVM = rcSecEVM);

// Agregados de cartera
function rcEVMPortfolio(rows) {
  const sum = (f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
  const BAC = sum(r => r.BAC), EV = sum(r => r.EV), AC = sum(r => r.AC), PV = sum(r => r.PV);
  const agg = rmEvmMetrics({ BAC, PV, EV, AC });
  const kpi = (lab, val, light, meta) => `<div class="card kpi"><div class="lab">${lab}</div><div class="big ${light === 'ok' ? 'up' : light === 'bad' ? 'down' : ''}">${val}</div><div class="meta">${meta}</div></div>`;
  const rowHtml = rows.map(r => {
    const m = r.metrics; const sel = RC.evm.sel === r.o.airtable_id;
    return `<tr onclick="rcEVMSel('${r.o.airtable_id}')" style="cursor:pointer${sel ? ';background:var(--glass)' : ''}">
      <td><b>${RC_E(rcShort(r.o.address))}</b>${sel ? ' ◂' : ''}</td>
      <td style="text-align:right">${RC_M(r.BAC)}</td>
      <td style="text-align:right">${m.pctAvance != null ? Math.round(m.pctAvance * 100) + '%' : '—'}</td>
      <td style="text-align:right">${RC_M(r.AC)}</td>
      <td style="text-align:right" class="${rcEVMcls(m.CPI)}">${kitStatusDot(rmEvmLight(m.CPI))} ${m.CPI != null ? m.CPI.toFixed(2) : '—'}</td>
      <td style="text-align:right" class="${rcEVMcls(m.SPI)}">${kitStatusDot(rmEvmLight(m.SPI))} ${m.SPI != null ? m.SPI.toFixed(2) : '—'}</td>
      <td style="text-align:right">${m.EAC != null ? RC_M(m.EAC) : '—'}</td>
      <td style="text-align:right" class="${(m.VAC || 0) < 0 ? 'down' : 'up'}">${m.VAC != null ? RC_M(m.VAC) : '—'}</td>
    </tr>`;
  }).join('');

  return `<div class="grid kpis">
      ${kpi('CPI cartera', agg.CPI != null ? agg.CPI.toFixed(2) : '—', rmEvmLight(agg.CPI), 'costo (ΣEV/ΣAC · >1 bajo presup.)')}
      ${kpi('SPI cartera', agg.SPI != null ? agg.SPI.toFixed(2) : '—', rmEvmLight(agg.SPI), 'cronograma (ΣEV/ΣPV)')}
      ${kpi('BAC total', RC_K(BAC), 'off', 'presupuesto a completar')}
      ${kpi('EAC total', RC_K(agg.EAC || 0), (agg.VAC || 0) < 0 ? 'bad' : 'ok', `proyección a cierre · VAC ${agg.VAC != null ? RC_M(agg.VAC) : '—'}`)}
    </div>
    <div class="card"><div class="chart-h"><div class="t">Cartera en obra · EVM</div><div class="k">${rows.length} obras · clic para ver detalle <button class="repbtn" style="padding:3px 10px;font-size:10px;margin-left:8px" onclick="rmPCOpenImport()">${osIcon('inbox') || '📥'} Importar costos por fase</button><button class="repbtn" style="padding:3px 10px;font-size:10px;margin-left:6px" onclick="if(window.rmSqftOpenPanel)rmSqftOpenPanel()">📐 Recalcular $/ft²</button></div></div>
      <table class="ptable"><thead><tr><th>Obra</th><th style="text-align:right">BAC</th><th style="text-align:right">% avance</th><th style="text-align:right">AC (real)</th><th style="text-align:right">CPI</th><th style="text-align:right">SPI</th><th style="text-align:right">EAC</th><th style="text-align:right">VAC</th></tr></thead>
      <tbody>${rowHtml}</tbody></table>
      <div class="meta" style="margin-top:8px">CPI/SPI: ${kitStatusDot('ok')} ≥1.00 · ${kitStatusDot('warn')} 0.90–0.99 · ${kitStatusDot('bad')} &lt;0.90. VAC &lt;0 = sobrecosto proyectado.</div>
    </div>`;
}

function rcEVMcls(x) { const l = rmEvmLight(x); return l === 'ok' ? 'up' : l === 'bad' ? 'down' : ''; }

// Detalle de una obra
function rcEVMDetalle(r, rows) {
  if (!r) return '';
  const m = r.metrics, o = r.o;
  const fila = (lab, val, cls, hint) => `<div class="krow"><span>${lab}${hint ? ` <span style="opacity:.5;font-size:10px">${hint}</span>` : ''}</span><b class="${cls || ''}">${val}</b></div>`;
  const money = (n) => n == null ? '—' : RC_M(n);

  // Tabla por fase
  const faseRows = ['1', '2', '3', '4', '5', '6'].map(p => {
    const e = r.evPhase[p]; if (!e || (e.bac <= 0 && !e.total)) return '';
    const cpi = e.ac > 0 ? e.ev / e.ac : null;
    return `<tr>
      <td><span style="opacity:.6">${p}</span> ${RM_EVM_FASES[p]}</td>
      <td style="text-align:right">${money(e.bac)}</td>
      <td style="text-align:right">${e.pct != null ? Math.round(e.pct * 100) + '%' : '—'}${e.manual ? ' <span style="opacity:.5;font-size:9px">man</span>' : (e.total ? ` <span style="opacity:.4;font-size:9px">${e.done}/${e.total}</span>` : '')}</td>
      <td style="text-align:right">${money(e.ev)}</td>
      <td style="text-align:right" style="opacity:.85">${money(e.ac)}<span style="opacity:.4;font-size:9px"> ~</span></td>
      <td style="text-align:right" class="${rcEVMcls(cpi)}">${cpi != null ? cpi.toFixed(2) : '—'}</td>
      <td style="text-align:right"><input type="number" min="0" max="100" step="1" value="${e.manual ? Math.round(e.pct * 100) : ''}" placeholder="${e.pct != null ? Math.round(e.pct * 100) : '·'}" onchange="rcEVMSetManual('${o.property_id}','${p}',this.value)" style="width:52px;text-align:right;background:var(--glass);border:1px solid var(--glassb);border-radius:6px;padding:3px 6px;color:var(--ink);font-size:11px" title="Override manual % de avance de esta fase"/></td>
    </tr>`;
  }).join('');

  const narr = rcEVMNarrativa(r);

  return `<div class="grid row2">
    <div class="card">
      <div class="chart-h"><div class="t">${RC_E(rcShort(o.address))}</div><div class="k">${RC_E(o.proceso || '')} · ${o.sqft ? Math.round(o.sqft) + ' ft²' : 's/ft²'}</div></div>
      <div class="grid kpis" style="margin:2px 0 6px">
        <div class="card kpi"><div class="lab">CPI</div><div class="big ${rcEVMcls(m.CPI)}">${kitStatusDot(rmEvmLight(m.CPI))} ${m.CPI != null ? m.CPI.toFixed(2) : '—'}</div><div class="meta">EV/AC</div></div>
        <div class="card kpi"><div class="lab">SPI</div><div class="big ${rcEVMcls(m.SPI)}">${kitStatusDot(rmEvmLight(m.SPI))} ${m.SPI != null ? m.SPI.toFixed(2) : '—'}</div><div class="meta">EV/PV</div></div>
        <div class="card kpi"><div class="lab">% avance (EV/BAC)</div><div class="big">${m.pctAvance != null ? Math.round(m.pctAvance * 100) + '%' : '—'}</div><div class="meta">${money(m.EV)} de ${money(m.BAC)}</div></div>
        <div class="card kpi"><div class="lab">Proyección (EAC)</div><div class="big ${(m.VAC || 0) < 0 ? 'down' : 'up'}">${money(m.EAC)}</div><div class="meta">VAC ${money(m.VAC)}</div></div>
      </div>
      <div class="krow" style="border-top:1px solid var(--glassb);padding-top:8px">${fila('BAC — presupuesto', money(m.BAC), '', r.fuenteBAC === 'importado' ? 'costos importados (C.2)' : r.fuenteBAC === 'estimador' ? 'Estimador (por fase)' : 'presupuesto_interno')}</div>
      ${fila('PV — valor planeado', money(m.PV), '', 'cronograma baseline')}
      ${fila('EV — valor ganado', money(m.EV), '', r.hayFase ? 'avance por fase' : 'avance del Planner (casa)')}
      ${fila('AC — costo real', money(m.AC), '', 'pagos material + horas×rate')}
      ${fila('CV — variación costo', money(m.CV), (m.CV < 0 ? 'down' : 'up'), 'EV−AC')}
      ${fila('SV — variación cronograma', money(m.SV), (m.SV < 0 ? 'down' : 'up'), 'EV−PV')}
      ${fila('ETC — falta por gastar', money(m.ETC), '', 'EAC−AC')}
      ${fila('EAC alterno', money(m.EAC_atipico), '', 'AC+(BAC−EV)/CPI')}
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="pullbtn" onclick="rcEVMFreeze('${o.airtable_id}')">${osIcon('camera') || '◉'} Congelar corte de hoy</button>
        <button class="pullbtn" style="background:var(--glass);color:var(--ink);border:1px solid var(--glassb)" onclick="rcEVMClearManual('${o.property_id}')">Limpiar overrides</button>
      </div>
      <div class="meta" style="margin-top:8px"><b>~</b> El AC por fase es prorrateo proporcional al avance (la data no trae costo real por fase). El AC total y CPI/SPI de la obra sí son exactos.</div>
    </div>
    <div class="card">
      <div class="chart-h"><div class="t">Curva S · PV / EV / AC</div><div class="k">proyección a EAC</div></div>
      <div style="position:relative;height:230px"><canvas id="rc-evm-scurve"></canvas></div>
      <div class="chart-h" style="margin-top:14px"><div class="t">Por fase</div><div class="k">BAC · avance · EV · AC~ · CPI · override</div></div>
      <table class="ptable"><thead><tr><th>Fase</th><th style="text-align:right">BAC</th><th style="text-align:right">Avance</th><th style="text-align:right">EV</th><th style="text-align:right">AC~</th><th style="text-align:right">CPI</th><th style="text-align:right">Manual %</th></tr></thead>
      <tbody>${faseRows || '<tr><td colspan="7" class="meta" style="padding:14px">Sin presupuesto por fase (falta proyecto del Estimador para esta obra).</td></tr>'}</tbody></table>
    </div>
  </div>
  <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Lectura gerencial</b><span>AUTOMÁTICA · ${RC_E(rcShort(o.address))}</span></div></div>${narr}</div>`;
}

// Narrativa gerencial automática
function rcEVMNarrativa(r) {
  const m = r.metrics; const t = [];
  const pct = m.pctAvance != null ? Math.round(m.pctAvance * 100) : null;
  if (pct != null) t.push(`Avance ganado del <b>${pct}%</b> (${RC_M(m.EV)} de ${RC_M(m.BAC)}).`);
  if (m.CPI != null) {
    if (m.CPI >= 1.0) t.push(`Costo <b class="up">bajo presupuesto</b> (CPI ${m.CPI.toFixed(2)}): por cada $1 de trabajo se gastan $${(1 / m.CPI).toFixed(2)}.`);
    else t.push(`Costo <b class="down">sobre presupuesto</b> (CPI ${m.CPI.toFixed(2)}): por cada $1 de trabajo se gastan $${(1 / m.CPI).toFixed(2)}.`);
  } else t.push('Sin costo real cargado → CPI no calculable.');
  if (m.SPI != null) {
    if (m.SPI >= 1.0) t.push(`Cronograma <b class="up">a tiempo o adelantado</b> (SPI ${m.SPI.toFixed(2)}).`);
    else t.push(`Cronograma <b class="down">atrasado</b> (SPI ${m.SPI.toFixed(2)}): avanzando al ${Math.round(m.SPI * 100)}% del plan.`);
  } else t.push('Sin cronograma baseline → SPI no calculable.');
  if (m.EAC != null) {
    const over = m.VAC != null && m.VAC < 0;
    t.push(`Proyección a cierre (EAC) <b>${RC_M(m.EAC)}</b> → ${over ? `<b class="down">sobrecosto</b> de ${RC_M(-m.VAC)} vs BAC` : `<b class="up">ahorro</b> de ${RC_M(m.VAC)} vs BAC`}.`);
    if (m.tcpi != null && isFinite(m.tcpi)) t.push(`Para cerrar en presupuesto se necesitaría un desempeño (TCPI) de <b>${m.tcpi.toFixed(2)}</b> en lo que falta${m.tcpi > 1.1 ? ' — exigente' : ''}.`);
  }
  return `<div style="font-size:12.5px;line-height:1.7">${t.map(x => '• ' + x).join('<br>')}</div>`;
}

// ─────────────────────────────────────────────────────────────
// 5) CURVA S (Chart.js) — montada tras el render
// ─────────────────────────────────────────────────────────────
function rcEVMMountChart(r) {
  if (!window.Chart || !r) return;
  const el = document.getElementById('rc-evm-scurve'); if (!el) return;
  try { const ex = Chart.getChart && Chart.getChart(el); if (ex) ex.destroy(); } catch (e) {}

  const snaps = (RC.evm.snapsByAt || {})[r.o.airtable_id] || [];
  // Eje de fechas: inicio de obra → fin estimado (semanal); + puntos de snapshots + hoy.
  const start = r.fallback.start || (snaps[0] ? new Date(snaps[0].snapshot_date).getTime() : Date.now());
  const end = r.fallback.end || Date.now() + 30 * 86400000;
  const axis = [];
  for (let t = start; t <= end + 1; t += 7 * 86400000) axis.push(t);
  if (axis[axis.length - 1] < end) axis.push(end);
  const fmt = (ms) => new Date(ms).toLocaleDateString('es', { day: '2-digit', month: 'short' });

  // PV planeado (línea completa, determinística)
  const pv = axis.map(t => rmEvmPlannedValueAt(t, r.bacPhase, r.ranges, r.fallback));
  // EV y AC desde snapshots (puntos reales)
  const evPts = axis.map(() => null), acPts = axis.map(() => null);
  const nearest = (ms) => { let bi = 0, bd = Infinity; axis.forEach((t, i) => { const d = Math.abs(t - ms); if (d < bd) { bd = d; bi = i; } }); return bi; };
  (snaps || []).forEach(s => {
    const ms = new Date(String(s.snapshot_date).slice(0, 10) + 'T00:00:00').getTime(); if (isNaN(ms)) return;
    const i = nearest(ms);
    const pres = +s.presupuesto || r.BAC;
    if (s.avance_pct != null) evPts[i] = pres * (+s.avance_pct) / 100;
    if (s.gasto_total != null) acPts[i] = +s.gasto_total;
  });
  // Punto de hoy con EV/AC calculados (si no hay snapshot de hoy)
  const iHoy = nearest(Date.now());
  if (evPts[iHoy] == null) evPts[iHoy] = r.EV;
  if (acPts[iHoy] == null) acPts[iHoy] = r.AC;

  // Proyección a EAC (línea punteada desde hoy hasta fin)
  const eac = r.metrics.EAC;
  const proj = axis.map((t, i) => (eac != null && t >= Date.now() && i >= iHoy) ? (i === iHoy ? r.AC : (i === axis.length - 1 ? eac : null)) : null);

  const ax = { grid: { color: 'rgba(120,130,150,.10)' }, ticks: { color: '#8b93a1', font: { size: 9 }, callback: (v) => RC_K(v) } };
  new Chart(el, {
    type: 'line',
    data: {
      labels: axis.map(fmt),
      datasets: [
        { label: 'PV (plan)', data: pv, borderColor: '#8b93a1', borderDash: [5, 4], borderWidth: 1.6, pointRadius: 0, tension: .25, fill: false },
        { label: 'EV (ganado)', data: evPts, borderColor: '#4ade9e', backgroundColor: 'rgba(74,222,158,.10)', borderWidth: 2.2, pointRadius: 2.5, tension: .25, spanGaps: true, fill: true },
        { label: 'AC (real)', data: acPts, borderColor: '#ff6b6b', borderWidth: 2.2, pointRadius: 2.5, tension: .25, spanGaps: true, fill: false },
        { label: 'Proyección EAC', data: proj, borderColor: '#fbbf24', borderDash: [3, 3], borderWidth: 1.6, pointRadius: 0, spanGaps: true, fill: false }
      ]
    },
    options: {
      maintainAspectRatio: false, resizeDelay: 150, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { color: '#8b93a1', font: { size: 10 }, boxWidth: 10, padding: 8 } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${RC_M(ctx.parsed.y)}` } } },
      scales: { x: { grid: { display: false }, ticks: { color: '#8b93a1', font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } }, y: ax }
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 6) INTERACCIÓN — selección, override manual, congelar corte
// ─────────────────────────────────────────────────────────────
function rcEVMSel(atId) { RC.evm.sel = atId; rcRender(); }
typeof window !== 'undefined' && (window.rcEVMSel = rcEVMSel);

function rcEVMSetManual(propId, phase, val) {
  RC.evm.manual = RC.evm.manual || {};
  RC.evm.manual[propId] = RC.evm.manual[propId] || {};
  if (val === '' || val == null) delete RC.evm.manual[propId][phase];
  else RC.evm.manual[propId][phase] = +val;
  rcRender();
}
typeof window !== 'undefined' && (window.rcEVMSetManual = rcEVMSetManual);

function rcEVMClearManual(propId) {
  if (RC.evm.manual) delete RC.evm.manual[propId];
  rcRender();
}
typeof window !== 'undefined' && (window.rcEVMClearManual = rcEVMClearManual);

// Congela un corte EVM del día en remodel_snapshots (idempotente por airtable_id+snapshot_date).
async function rcEVMFreeze(atId) {
  const o = (RC.obras || []).find(x => x.airtable_id === atId); if (!o) return;
  const r = rcEVMObra(o); const m = r.metrics;
  const ok = await confirmDialog(
    `Se guardará un corte EVM de hoy para <b>${RC_E(rcShort(o.address))}</b>:<br>CPI ${m.CPI != null ? m.CPI.toFixed(2) : '—'} · SPI ${m.SPI != null ? m.SPI.toFixed(2) : '—'} · EAC ${m.EAC != null ? RC_M(m.EAC) : '—'}.<br>Reemplaza el corte de hoy si ya existe.`,
    { title: 'Congelar corte EVM', confirmText: 'Congelar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  const btn = event && event.target ? event.target : null;
  const run = async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const diasIni = o.fecha_inicio ? Math.round((Date.now() - new Date(o.fecha_inicio).getTime()) / 86400000) : null;
    const diasFin = o.fecha_estimada_fin ? Math.round((new Date(o.fecha_estimada_fin).getTime() - Date.now()) / 86400000) : null;
    const payload = {
      airtable_id: atId, snapshot_date: hoy,
      avance_pct: m.pctAvance != null ? +(m.pctAvance * 100).toFixed(2) : null,
      gasto_total: r.AC || null, presupuesto: r.BAC || null,
      dias_desde_inicio: diasIni, dias_hasta_fin_estimado: diasFin,
      spi: m.SPI != null ? +m.SPI.toFixed(4) : null,
      cpi: m.CPI != null ? +m.CPI.toFixed(4) : null,
      burn_rate: (diasIni && diasIni > 0 && r.AC) ? +(r.AC / diasIni).toFixed(2) : null,
      proyeccion_costo_final: m.EAC != null ? +m.EAC.toFixed(2) : null,
      flags: [
        ...(m.CPI != null && m.CPI < 0.9 ? ['sobre_presupuesto'] : []),
        ...(m.SPI != null && m.SPI < 0.9 ? ['atrasada'] : [])
      ]
    };
    const res = await sb.from('remodel_snapshots').upsert(payload, { onConflict: 'airtable_id,snapshot_date' });
    if (res.error) { if (window.toast) toast('No se pudo congelar el corte: ' + res.error.message, 'error'); return; }
    if (window.toast) toast('Corte EVM congelado (' + hoy + ')', 'success');
    // refrescar snapshots
    RC.evm.loaded = false; await rcEVMLoad(); rcRender();
  };
  if (typeof withLoading === 'function' && btn) await withLoading(btn, run); else await run();
}
typeof window !== 'undefined' && (window.rcEVMFreeze = rcEVMFreeze);

// Hook de montaje del chart: se llama tras cada render si la sección EVM está activa.
(function rcEVMInstallRenderHook() {
  if (typeof window === 'undefined') return;
  const tryHook = () => {
    if (typeof rcRender !== 'function' || rcRender.__evmHooked) return false;
    const orig = rcRender;
    const wrapped = function () {
      const out = orig.apply(this, arguments);
      if (typeof RC !== 'undefined' && RC.section === 'evm' && RC.evm && RC.evm.loaded) {
        setTimeout(() => {
          try {
            const activas = (rcCompute().activas || []).filter(o => (o.proceso === 'En construcción') || rcEVMMatchCost(o) || (RC.evm.projByProp || {})[o.property_id]);
            const rows = activas.map(rcEVMObra).filter(x => x.BAC > 0);
            rows.sort((a, b) => (a.metrics.CPI == null ? 9 : a.metrics.CPI) - (b.metrics.CPI == null ? 9 : b.metrics.CPI));
            const sel = (RC.evm.sel && rows.find(x => x.o.airtable_id === RC.evm.sel)) || rows[0];
            if (sel) rcEVMMountChart(sel);
          } catch (e) { /* silencioso */ }
        }, 40);
      }
      return out;
    };
    wrapped.__evmHooked = true;
    window.rcRender = wrapped;
    return true;
  };
  if (!tryHook()) { let n = 0; const iv = setInterval(() => { if (tryHook() || ++n > 50) clearInterval(iv); }, 100); }
})();
