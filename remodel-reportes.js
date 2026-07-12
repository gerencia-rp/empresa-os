// ════════════════════════════════════════════════════════════════════════
// 📑 REPORTES CEO — Remodelación (módulo del Command Center, /remodelacion/reportes)
// Modular/vendible: consume rcCompute() + rcObraDataset() del CC. Datos 100% Airtable.
// ════════════════════════════════════════════════════════════════════════

const RP = { tipo: 'r1', period: 'historico', lider: 'all', estado: 'all', ciudad: 'all', liderMode: 'split', customFrom: '', customTo: '', charts: [] };

const RP_TIPOS = [
  ['r1', 'R1 · Ejecutivo CEO'],
  ['r2', 'R2 · P&L / EBITDA'],
  ['r3', 'R3 · Líder / Obra'],
  ['r4', 'R4 · KPIs + OKRs'],
  ['r5', 'R5 · Costos $/sqft']
];
const RP_PERIODS = [['mes', 'Mes'], ['trimestre', 'Trimestre'], ['ytd', 'YTD'], ['historico', 'Histórico'], ['custom', 'Custom']];

function rpUnit(u, v) {
  if (v == null) return '—';
  if (typeof v === 'number' && !isFinite(v)) return '—';   // sin dato ≠ NaN mudo
  if (u === '%') return v + '%';
  if (u === 'usd' || u === '$') return RC_M(v);
  if (u === 'días') return (v > 0 ? '+' : '') + v + 'd';
  return String(v);
}
function rpMedian(arr) {
  const a = [...arr].sort((x, y) => x - y);
  if (!a.length) return 0;
  return a.length % 2 ? a[(a.length - 1) / 2] : Math.round((a[a.length / 2 - 1] + a[a.length / 2]) / 2);
}
function rpSem(ok) { return ok == null ? '#94a3b8' : ok ? '#34d399' : '#f87171'; }
// Formateador defensivo para celdas: null/NaN/Infinity → '—' (regla "sin dato ≠ $0")
function rpM(v) { return (v == null || !isFinite(v)) ? '—' : RC_M(v); }

// Filtro por período (sobre fecha_real, o fecha_inicio si no finalizó) + líder/estado/ciudad
function rpFilter(ds) {
  const now = new Date();
  return ds.filter(o => {
    if (RP.lider !== 'all' && o.lider !== RP.lider) return false;
    if (RP.estado !== 'all' && o.estado !== RP.estado) return false;
    if (RP.ciudad !== 'all' && o.ciudad !== RP.ciudad) return false;
    if (RP.period === 'historico') return true;
    const d = o.fecha_real || o.fecha_inicio;
    if (!d) return false;
    const dt = new Date(d);
    if (RP.period === 'mes') return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    if (RP.period === 'trimestre') return dt.getFullYear() === now.getFullYear() && Math.floor(dt.getMonth() / 3) === Math.floor(now.getMonth() / 3);
    if (RP.period === 'ytd') return dt.getFullYear() === now.getFullYear();
    if (RP.period === 'custom') { if (RP.customFrom && d < RP.customFrom) return false; if (RP.customTo && d > RP.customTo) return false; return true; }
    return true;
  });
}

// Agregación por líder con regla de líder compartido (split / primero / ambos)
function rpLiderAgg(obras) {
  const map = {};
  obras.forEach(o => {
    let liders = String(o.lider || '—').split(',').map(x => x.trim()).filter(Boolean);
    if (!liders.length) liders = ['—'];
    const shared = liders.length > 1;
    liders.forEach((L, idx) => {
      if (RP.liderMode === 'primero' && idx > 0) return;
      const w = (RP.liderMode === 'split' && shared) ? (1 / liders.length) : 1;
      if (!map[L]) map[L] = { lider: L, n: 0, ganancia: 0, ingreso: 0, costo: 0, sqft: 0, diasSum: 0, diasN: 0, shared: false };
      const m = map[L];
      m.n += w; m.ganancia += (o.utilidad || 0) * w; m.ingreso += (o.ingreso || 0) * w; m.costo += (o.costo_real || 0) * w; m.sqft += (o.sqft || 0) * w;
      if (o.retraso != null && Math.abs(o.retraso) <= 180) { m.diasSum += o.retraso; m.diasN++; }
      if (shared) m.shared = true;
    });
  });
  return Object.values(map).map(m => ({
    ...m, nR: Math.round(m.n * 10) / 10,
    margen: m.ingreso > 0 ? Math.round(m.ganancia / m.ingreso * 100) : 0,
    psf: m.sqft > 0 ? Math.round(m.costo / m.sqft) : null,
    desvDias: m.diasN ? Math.round(m.diasSum / m.diasN) : null
  })).sort((a, b) => b.ganancia - a.ganancia);
}

// Métricas agregadas del subconjunto filtrado (usa las MISMAS definiciones del CC)
function rpMetrics(obras) {
  const fin = obras.filter(o => o.fin);
  const ganancia = fin.reduce((s, o) => s + (o.utilidad || 0), 0);
  const ingreso = fin.reduce((s, o) => s + (o.ingreso || 0), 0);
  const costo = fin.reduce((s, o) => s + (o.costo_real || 0), 0);
  const presup = fin.reduce((s, o) => s + (o.presupuesto || 0), 0);
  const margen = ingreso > 0 ? Math.round(ganancia / ingreso * 100) : 0;
  const evrFin = fin.filter(o => o.presupuesto > 0 && o.costo_real > 0);
  const desvCosto = evrFin.length ? Math.round(evrFin.reduce((s, o) => s + (o.costo_real - o.presupuesto) / o.presupuesto * 100, 0) / evrFin.length) : 0;
  const diasAll = fin.map(o => o.retraso).filter(d => d != null);
  const diasOk = diasAll.filter(d => Math.abs(d) <= 180);
  const diasRev = diasAll.filter(d => Math.abs(d) > 180).length;
  const desvDias = diasOk.length ? Math.round(diasOk.reduce((s, d) => s + d, 0) / diasOk.length) : 0;
  const psfArr = fin.filter(o => o.sqft > 0).map(o => o.costo_real / o.sqft);
  const psf = psfArr.length ? Math.round(psfArr.reduce((s, x) => s + x, 0) / psfArr.length) : 0;
  const conDias = fin.filter(o => o.retraso != null);
  const aTiempo = conDias.length ? Math.round(conDias.filter(o => o.retraso <= 0).length / conDias.length * 100) : 0;
  const enPresup = evrFin.length ? Math.round(evrFin.filter(o => o.costo_real <= o.presupuesto).length / evrFin.length * 100) : 0;
  const rent = (() => { const r = fin.map(o => o.rentabilidad).filter(x => x != null); return r.length ? +(r.reduce((s, x) => s + x, 0) / r.length).toFixed(1) : 0; })();
  return { fin, nFin: fin.length, ganancia, ingreso, costo, presup, margen, desvCosto, desvDias, desvDiasMed: rpMedian(diasOk), diasRev, psf, aTiempo, enPresup, rent };
}

// Overhead prorrateado al período seleccionado (histórico = total; mes/trim/ytd = fracción por meses)
function rpOverhead(c) {
  const opex = c.overheadOpex || 0, capex = c.overheadCapex || 0, total = c.overheadTotal || 0, by = c.overheadBy || {};
  return { opex, capex, total, by };
}


function rpInjectCSS() {
  if (document.getElementById('rp-styles')) return;
  const st = document.createElement('style'); st.id = 'rp-styles';
  st.textContent = `
  #rc-overlay .rp-toolbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px}
  #rc-overlay .rp-tabs{display:flex;gap:6px;flex-wrap:wrap}
  #rc-overlay .rp-tab{font-size:12px;font-weight:700;padding:7px 12px;border-radius:9px;border:1px solid var(--line,rgba(255,255,255,.1));background:var(--glass,rgba(255,255,255,.04));color:var(--txt2,#9fb0c9);cursor:pointer}
  #rc-overlay .rp-tab.on{background:linear-gradient(135deg,#12b5a0,#2f6ef0);color:#fff;border-color:transparent}
  #rc-overlay .rp-exports{display:flex;gap:6px}
  #rc-overlay .rp-x{font-size:12px;font-weight:700;padding:7px 12px;border-radius:9px;border:1px solid var(--line,rgba(255,255,255,.1));background:var(--glass,rgba(255,255,255,.04));color:var(--txt,#e8eefc);cursor:pointer}
  #rc-overlay .rp-x:hover{border-color:#12b5a0}
  #rc-overlay .rp-filters{background:var(--glass,rgba(255,255,255,.03));border:1px solid var(--line,rgba(255,255,255,.08));border-radius:12px;padding:10px 12px;margin-bottom:14px}
  #rc-overlay details.rp-filters > summary{cursor:pointer;font-size:12px;font-weight:700;color:var(--txt2,#9fb0c9);user-select:none;list-style:none}
  #rc-overlay details.rp-filters > summary::-webkit-details-marker{display:none}
  #rc-overlay details.rp-filters > summary::after{content:'▸';margin-left:6px;opacity:.6;display:inline-block;transition:transform .15s}
  #rc-overlay details.rp-filters[open] > summary::after{transform:rotate(90deg)}
  #rc-overlay details.rp-filters[open] > summary{margin-bottom:8px}
  #rc-overlay .rp-frow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
  #rc-overlay .rp-flab{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3,#64748b);font-weight:700}
  #rc-overlay .rp-chip{font-size:11px;font-weight:600;padding:5px 11px;border-radius:20px;border:1px solid var(--line,rgba(255,255,255,.1));background:transparent;color:var(--txt2,#9fb0c9);cursor:pointer}
  #rc-overlay .rp-chip.on{background:#12b5a0;color:#fff;border-color:#12b5a0}
  #rc-overlay .rp-sel,#rc-overlay .rp-date{font-size:12px;padding:5px 8px;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,.12));background:var(--glass,rgba(255,255,255,.04));color:var(--txt,#e8eefc)}
  #rc-overlay .rp-note{font-size:11px;color:var(--txt3,#64748b);margin-top:4px}
  #rc-overlay .rp-okrbar{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0}
  #rc-overlay .rp-okr{font-size:10px;font-weight:700;padding:4px 9px;border-radius:7px;border:1px solid}
  #rc-overlay .rp-dec{font-size:12.5px;line-height:1.5;padding:8px 4px;border-bottom:1px solid var(--line,rgba(255,255,255,.06));color:var(--txt,#e8eefc)}
  #rc-overlay .rp-canvas{height:230px;position:relative;padding:6px;overflow:hidden}
  #rc-overlay table.rp-t{width:100%;border-collapse:collapse;font-size:12px}
  #rc-overlay table.rp-t th{text-align:left;padding:6px 8px;color:var(--txt3,#64748b);font-size:10px;text-transform:uppercase;font-weight:700;border-bottom:1px solid var(--line,rgba(255,255,255,.1))}
  #rc-overlay table.rp-t td{padding:6px 8px;border-bottom:1px solid var(--line,rgba(255,255,255,.05));color:var(--txt,#e8eefc)}
  #rc-overlay table.rp-t td.r,#rc-overlay table.rp-t th.r{text-align:right}
  #rc-overlay table.rp-t tr.rp-total td{font-weight:800;border-top:1px solid var(--line,rgba(255,255,255,.18));background:var(--glass,rgba(255,255,255,.03))}
  #rc-overlay .rp-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle}
  #rc-overlay .rp-sh{color:#e7b65e;font-size:11px}
  #rc-overlay .rp-modenote{font-size:11.5px;color:var(--txt2,#9fb0c9);background:var(--glass,rgba(255,255,255,.03));border:1px solid var(--line,rgba(255,255,255,.08));border-radius:8px;padding:8px 10px;margin-bottom:12px}
  #rc-overlay .up{color:#34d399}#rc-overlay .down{color:#f87171}
  @media print { body > *:not(#rc-overlay){display:none!important} #rc-overlay{position:static!important;background:#fff!important;color:#111!important} #rc-overlay .rc-sidebar,#rc-overlay .rc-header,.no-print{display:none!important} #rc-overlay .rp-canvas{height:200px} #rc-overlay table.rp-t td,#rc-overlay table.rp-t th{color:#111!important} }
  `;
  document.head.appendChild(st);
}

// ─── Shell ───
function rcSecReportes(c) {
  rpInjectCSS();
  const ds = rcObraDataset();
  const obras = rpFilter(ds);
  const lideres = [...new Set(ds.flatMap(o => String(o.lider || '—').split(',').map(x => x.trim())).filter(Boolean))].sort();
  const estados = [...new Set(ds.map(o => o.estado).filter(Boolean))].sort();
  const ciudades = [...new Set(ds.map(o => o.ciudad).filter(Boolean))].sort();
  const opt = (arr, cur) => ['<option value="all">Todos</option>'].concat(arr.map(x => `<option value="${RC_E(x)}" ${cur === x ? 'selected' : ''}>${RC_E(x)}</option>`)).join('');
  const tipoBtns = RP_TIPOS.map(([k, lab]) => `<button onclick="rpSet('tipo','${k}')" class="rp-tab ${RP.tipo === k ? 'on' : ''}">${lab}</button>`).join('');
  const periodBtns = RP_PERIODS.map(([k, lab]) => `<button onclick="rpSet('period','${k}')" class="rp-chip ${RP.period === k ? 'on' : ''}">${lab}</button>`).join('');
  const custom = RP.period === 'custom' ? `<input type="date" value="${RP.customFrom}" onchange="rpSet('customFrom',this.value)" class="rp-date"><span style="opacity:.5">→</span><input type="date" value="${RP.customTo}" onchange="rpSet('customTo',this.value)" class="rp-date">` : '';
  const body = { r1: rpR1, r2: rpR2, r3: rpR3, r4: rpR4, r5: rpR5 }[RP.tipo] || rpR1;
  setTimeout(rpDrawCharts, 40);
  return rcHeader('Reportes CEO', 'Reportes exportables desde Airtable — KPIs, OKRs, P&L/EBITDA, líder/obra y costos $/sqft. Una sola definición por métrica.') + `
    <div class="rp-toolbar no-print">
      <div class="rp-tabs">${tipoBtns}</div>
      <div class="rp-exports">
        <button onclick="rpExportPDF()" class="rp-x" title="Imprimir / Guardar PDF">🖨️ PDF</button>
        <button onclick="rpExportExcel()" class="rp-x" title="Exportar Excel (una hoja por tabla)">⬇ Excel</button>
        <button onclick="rpCopyResumen()" class="rp-x" title="Copiar resumen ejecutivo">📋 Copiar</button>
      </div>
    </div>
    <details class="rp-filters no-print"${window.innerWidth > 768 ? ' open' : ''}>
      <summary>🔍 Filtros <span style="font-weight:400;opacity:.75">· ${obras.length} obras · ${RP.period}</span></summary>
      <div class="rp-frow"><span class="rp-flab">Período</span>${periodBtns}${custom}</div>
      <div class="rp-frow">
        <span class="rp-flab">Líder</span><select onchange="rpSet('lider',this.value)" class="rp-sel">${opt(lideres, RP.lider)}</select>
        <span class="rp-flab">Estado</span><select onchange="rpSet('estado',this.value)" class="rp-sel">${opt(estados, RP.estado)}</select>
        <span class="rp-flab">Ciudad</span><select onchange="rpSet('ciudad',this.value)" class="rp-sel">${opt(ciudades, RP.ciudad)}</select>
        <span class="rp-flab" title="Regla para obras con 2 líderes">Líder compartido</span>
        <select onchange="rpSet('liderMode',this.value)" class="rp-sel">
          <option value="split" ${RP.liderMode === 'split' ? 'selected' : ''}>Split 50-50</option>
          <option value="primero" ${RP.liderMode === 'primero' ? 'selected' : ''}>Primer líder</option>
          <option value="ambos" ${RP.liderMode === 'ambos' ? 'selected' : ''}>Ambos (100%)</option>
        </select>
      </div>
      <div class="rp-note">${obras.length} obras en el filtro · período <b>${RP.period}</b>${!c.okrsConfigured ? ' · <span style="color:#e7b65e">⚠ metas no configuradas (usando defaults) — cargalas en la tabla “OKRs / Metas” de Airtable</span>' : ''}</div>
    </details>
    <div id="rp-report">${body(c, obras)}</div>`;
}

function rpKpiCard(lab, val, meta, cls) {
  return `<div class="card kpi"><div class="lab">${lab}</div><div class="big ${cls || ''}">${val}</div><div class="meta">${meta || ''}</div></div>`;
}

// ─── R1 · Ejecutivo CEO ───
function rpR1(c, obras) {
  const m = rpMetrics(obras);
  const oh = rpOverhead(c);
  const ebitda = m.ganancia - oh.opex;
  const ebitdaMargen = m.ingreso > 0 ? Math.round(ebitda / m.ingreso * 100) : 0;
  const okr = c.okrRows || [];
  const okrOk = okr.filter(o => o.cumple).length;
  const top = [...m.fin].sort((a, b) => b.utilidad - a.utilidad).slice(0, 5);
  const bottom = [...m.fin].sort((a, b) => a.utilidad - b.utilidad).slice(0, 3);
  const lideres = rpLiderAgg(m.fin);
  const decisiones = rpDecisiones(c, m, okr, lideres);
  const okrChips = okr.map(o => `<span class="rp-okr" style="border-color:${rpSem(o.cumple)}44;background:${rpSem(o.cumple)}18;color:${rpSem(o.cumple)}">${RC_E(o.metrica)}: ${rpUnit(o.unidad, o.actual)} / ${o.comparador}${rpUnit(o.unidad, o.objetivo)}</span>`).join('');
  const topRows = top.map(o => `<tr><td>${RC_E(rcShort(o.address))}</td><td>${RC_E(o.lider)}</td><td class="r">${rpM(o.utilidad)}</td><td class="r ${o.margen >= 20 ? 'up' : 'down'}">${(o.margen != null && isFinite(o.margen)) ? o.margen + '%' : '—'}</td><td class="r">${rpM(o.psf)}</td></tr>`).join('');
  const bottomRows = bottom.map(o => `<tr><td>${RC_E(rcShort(o.address))}</td><td>${RC_E(o.lider)}</td><td class="r ${o.utilidad >= 0 ? 'up' : 'down'}">${rpM(o.utilidad)}</td><td class="r">${(o.retraso != null && isFinite(o.retraso)) ? (o.retraso > 0 ? '+' : '') + o.retraso + 'd' : '—'}</td></tr>`).join('');
  // El número protagonista arriba (ADN premium): ganancia bruta del período en degradé. Sin obras finalizadas → '—' (sin dato ≠ $0).
  const hero = (typeof kitHero === 'function')
    ? kitHero('Ganancia bruta del período 🏗',
      (typeof kitMoney === 'function' ? kitMoney(m.nFin ? m.ganancia : null) : rpM(m.nFin ? m.ganancia : null)),
      m.nFin + ' obras finalizadas · margen <b>' + (isFinite(m.margen) ? m.margen + '%' : '—') + '</b> · EBITDA <b>' + rpM(ebitda) + '</b> (opex ' + rpM(oh.opex) + ')')
    : '';
  return hero + `
    <div class="grid kpis">
      ${rpKpiCard('Ganancia BRUTA', RC_K(m.ganancia), m.nFin + ' finalizadas · margen ' + m.margen + '%', 'up glow')}
      ${rpKpiCard('EBITDA', RC_K(ebitda), 'margen ' + ebitdaMargen + '% · opex ' + RC_K(oh.opex), ebitda >= 0 ? 'up' : 'down')}
      ${rpKpiCard('OKRs cumplidos', okrOk + '/' + okr.length, 'metas alcanzadas', okrOk >= okr.length / 2 ? 'up' : 'down')}
      ${rpKpiCard('$/sqft prom', RC_M(m.psf), 'costo real por sqft')}
    </div>
    <div class="grid kpis" style="margin-top:12px">
      ${rpKpiCard('Rentabilidad', m.rent + '%', 'histórico')}
      ${rpKpiCard('Desv. costo', (m.desvCosto > 0 ? '+' : '') + m.desvCosto + '%', m.enPresup + '% en presup.', m.desvCosto > 5 ? 'down' : 'up')}
      ${rpKpiCard('Desv. días', (m.desvDias > 0 ? '+' : '') + m.desvDias + 'd', 'mediana ' + (m.desvDiasMed > 0 ? '+' : '') + m.desvDiasMed + 'd · ' + m.aTiempo + '% a tiempo' + (m.diasRev ? ' · ' + m.diasRev + ' a revisar' : ''), m.desvDias > 7 ? 'down' : 'up')}
      ${rpKpiCard('Obras', m.nFin + '', obras.length + ' en filtro')}
    </div>
    <div class="rp-okrbar">${okrChips}</div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Utilidad por obra (top 8)</div><div class="k">finalizadas</div></div><div class="rp-canvas"><canvas id="rp-c1"></canvas></div></div>
      <div class="card"><div class="chart-h"><div class="t">Decisiones recomendadas</div><div class="k">del período</div></div>${decisiones.map((d, i) => `<div class="rp-dec"><b>${i + 1}.</b> ${d}</div>`).join('')}</div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Top 5 obras por utilidad</div></div><table class="ptable rp-t"><thead><tr><th>Obra</th><th>Líder</th><th class="r">Utilidad</th><th class="r">Margen</th><th class="r">$/sqft</th></tr></thead><tbody>${topRows}</tbody></table></div>
      <div class="card"><div class="chart-h"><div class="t">A vigilar (menor utilidad)</div></div><table class="ptable rp-t"><thead><tr><th>Obra</th><th>Líder</th><th class="r">Utilidad</th><th class="r">Retraso</th></tr></thead><tbody>${bottomRows}</tbody></table></div>
    </div>`;
}

// ─── R2 · P&L / EBITDA ───
function rpR2(c, obras) {
  const m = rpMetrics(obras);
  const oh = rpOverhead(c);
  const utilBruta = m.ganancia;
  const ebitda = utilBruta - oh.opex;
  const rows = [
    ['Ingreso (Monto Real Remodelación)', m.ingreso, 'up'],
    ['− Costo real (trab + mat) ×1.05', -m.costo, 'down'],
    ['= Utilidad bruta', utilBruta, utilBruta >= 0 ? 'up' : 'down'],
    ['− Overhead OPEX', -oh.opex, 'down'],
    ['&nbsp;&nbsp;· Nómina admin', -(oh.by.nomina_admin || 0), ''],
    ['&nbsp;&nbsp;· Gastos empresariales (opex)', -(oh.opex - (oh.by.nomina_admin || 0) - (oh.by.plataformas || 0)), ''],
    ['&nbsp;&nbsp;· Plataformas', -(oh.by.plataformas || 0), ''],
    ['= EBITDA', ebitda, ebitda >= 0 ? 'up' : 'down'],
    ['(memo) CAPEX vehículos/activos (excluido)', -oh.capex, '']
  ];
  const trs = rows.map(r => `<tr class="${r[0].startsWith('=') ? 'rp-total' : ''}"><td>${r[0]}</td><td class="r ${r[2]}">${RC_M(r[1])}</td></tr>`).join('');
  const ebitdaMargen = m.ingreso > 0 ? Math.round(ebitda / m.ingreso * 100) : 0;
  return `
    <div class="grid kpis">
      ${rpKpiCard('Ingreso', RC_K(m.ingreso), 'draws (Monto Real)')}
      ${rpKpiCard('Utilidad bruta', RC_K(utilBruta), 'margen ' + m.margen + '%', 'up')}
      ${rpKpiCard('EBITDA', RC_K(ebitda), 'margen ' + ebitdaMargen + '%', ebitda >= 0 ? 'up glow' : 'down')}
      ${rpKpiCard('Overhead OPEX', RC_K(oh.opex), 'capex ' + RC_K(oh.capex) + ' aparte', 'down')}
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Estado de resultados (P&L)</div><div class="k">del período</div></div><table class="ptable rp-t"><tbody>${trs}</tbody></table></div>
      <div class="card"><div class="chart-h"><div class="t">Puente Ingreso → EBITDA</div></div><div class="rp-canvas"><canvas id="rp-c2"></canvas></div></div>
    </div>`;
}

// ─── R3 · Líder / Obra ───
function rpR3(c, obras) {
  const m = rpMetrics(obras);
  const lideres = rpLiderAgg(m.fin);
  const lidRows = lideres.map(l => `<tr><td><b>${RC_E(l.lider)}</b>${l.shared ? ' <span class="rp-sh" title="Tiene obras compartidas — regla aplicada">⚖</span>' : ''}</td><td class="r">${isFinite(l.nR) ? l.nR : '—'}</td><td class="r">${rpM(l.ganancia)}</td><td class="r ${l.margen >= 20 ? 'up' : 'down'}">${isFinite(l.margen) ? l.margen + '%' : '—'}</td><td class="r">${rpM(l.psf)}</td><td class="r ${(l.desvDias || 0) > 7 ? 'down' : 'up'}">${(l.desvDias != null && isFinite(l.desvDias)) ? (l.desvDias > 0 ? '+' : '') + l.desvDias + 'd' : '—'}</td></tr>`).join('');
  const obraRows = [...m.fin].sort((a, b) => b.utilidad - a.utilidad).map(o => `<tr><td>${RC_E(rcShort(o.address))}</td><td>${RC_E(o.lider)}</td><td>${RC_E(o.ciudad || '—')}</td><td class="r ${o.utilidad >= 0 ? 'up' : 'down'}">${rpM(o.utilidad)}</td><td class="r ${o.margen >= 20 ? 'up' : 'down'}">${(o.margen != null && isFinite(o.margen)) ? o.margen + '%' : '—'}</td><td class="r">${(o.retraso != null && isFinite(o.retraso)) ? (o.retraso > 0 ? '+' : '') + o.retraso + 'd' : '—'}</td></tr>`).join('');
  return `
    <div class="rp-modenote">Regla de líder compartido: <b>${RP.liderMode === 'split' ? 'Split 50-50' : RP.liderMode === 'primero' ? 'Primer líder' : 'Ambos (100%)'}</b> — obras con 2 líderes (ej. Bethune) se atribuyen según esta regla. ⚖ = líder con obras compartidas.</div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Performance por líder</div><div class="k">${lideres.length} líderes</div></div><table class="ptable rp-t"><thead><tr><th>Líder</th><th class="r">Obras</th><th class="r">Ganancia</th><th class="r">Margen</th><th class="r">$/sqft</th><th class="r">Desv días</th></tr></thead><tbody>${lidRows}</tbody></table></div>
      <div class="card"><div class="chart-h"><div class="t">Ganancia por líder</div></div><div class="rp-canvas"><canvas id="rp-c3"></canvas></div></div>
    </div>
    <div class="card"><div class="chart-h"><div class="t">Obras (${m.nFin})</div><div class="k">finalizadas del filtro</div></div><table class="ptable rp-t"><thead><tr><th>Obra</th><th>Líder</th><th>Ciudad</th><th class="r">Utilidad</th><th class="r">Margen</th><th class="r">Retraso</th></tr></thead><tbody>${obraRows}</tbody></table></div>`;
}

// ─── R4 · KPIs + OKRs ───
function rpR4(c, obras) {
  const m = rpMetrics(obras);
  const okr = c.okrRows || [];
  const rows = okr.map(o => {
    const gap = (o.actual == null) ? null : (o.comparador === '≤' ? o.objetivo - o.actual : o.actual - o.objetivo);
    return `<tr><td>${RC_E(o.metrica)}</td><td class="r">${o.comparador} ${rpUnit(o.unidad, o.objetivo)}</td><td class="r"><b>${rpUnit(o.unidad, o.actual)}</b></td><td class="r"><span class="rp-dot" style="background:${rpSem(o.cumple)}"></span>${o.cumple == null ? 's/d' : o.cumple ? 'cumple' : 'no'}</td><td class="r ${gap != null && gap >= 0 ? 'up' : 'down'}">${gap == null ? '—' : (gap > 0 ? '+' : '') + rpUnit(o.unidad, Math.round(gap * 10) / 10)}</td></tr>`;
  }).join('');
  const okrOk = okr.filter(o => o.cumple).length;
  return `
    <div class="grid kpis">
      ${rpKpiCard('OKRs cumplidos', okrOk + '/' + okr.length, c.okrsConfigured ? 'metas desde Airtable' : 'metas por defecto', okrOk >= okr.length / 2 ? 'up' : 'down')}
      ${rpKpiCard('Margen bruto', m.margen + '%', 'obras finalizadas')}
      ${rpKpiCard('% a tiempo', m.aTiempo + '%', 'retraso ≤ 0')}
      ${rpKpiCard('% en presupuesto', m.enPresup + '%', 'costo ≤ presup.')}
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Scorecard OKRs</div><div class="k">actual vs meta</div></div><table class="ptable rp-t"><thead><tr><th>Métrica</th><th class="r">Meta</th><th class="r">Actual</th><th class="r">Estado</th><th class="r">Gap</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="card"><div class="chart-h"><div class="t">Cumplimiento (radar)</div></div><div class="rp-canvas"><canvas id="rp-c4"></canvas></div></div>
    </div>`;
}

// ─── R5 · Costos $/sqft ───
function rpR5(c, obras) {
  const m = rpMetrics(obras);
  const withSq = m.fin.filter(o => o.sqft > 0);
  const matProm = withSq.length ? Math.round(withSq.reduce((s, o) => s + (o.costo_real * 0.476) / o.sqft, 0) / withSq.length) : 0;
  const rows = [...withSq].sort((a, b) => (b.costo_real / b.sqft) - (a.costo_real / a.sqft)).map(o => {
    const psf = Math.round(o.costo_real / o.sqft);
    return `<tr><td>${RC_E(rcShort(o.address))}</td><td>${RC_E(o.lider)}</td><td class="r">${isFinite(o.sqft) ? o.sqft : '—'}</td><td class="r"><b>${rpM(psf)}</b></td><td class="r ${psf <= 50 ? 'up' : 'down'}">${!isFinite(psf) ? '—' : psf <= 50 ? '✓' : '⚠'}</td></tr>`;
  }).join('');
  const byCity = {};
  withSq.forEach(o => { const k = o.ciudad || '—'; if (!byCity[k]) byCity[k] = { c: 0, s: 0 }; byCity[k].c += o.costo_real; byCity[k].s += o.sqft; });
  const cityRows = Object.entries(byCity).map(([k, v]) => `<tr><td>${RC_E(k)}</td><td class="r">${rpM(Math.round(v.c / v.s))}</td></tr>`).join('');
  return `
    <div class="grid kpis">
      ${rpKpiCard('$/sqft prom', RC_M(m.psf), withSq.length + ' obras con sqft')}
      ${rpKpiCard('Material /sqft', RC_M(matProm), 'aprox por ratio real')}
      ${rpKpiCard('MO /sqft', RC_M(Math.max(0, m.psf - matProm)), 'aprox por ratio real')}
      ${rpKpiCard('Meta $/sqft', RC_M(50), m.psf <= 50 ? 'dentro de meta' : 'sobre meta', m.psf <= 50 ? 'up' : 'down')}
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">$/sqft por obra</div><div class="k">costo real / sqft</div></div><table class="ptable rp-t"><thead><tr><th>Obra</th><th>Líder</th><th class="r">sqft</th><th class="r">$/sqft</th><th class="r">Meta</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="card"><div class="chart-h"><div class="t">$/sqft por ciudad</div></div><table class="ptable rp-t"><thead><tr><th>Ciudad</th><th class="r">$/sqft</th></tr></thead><tbody>${cityRows}</tbody></table><div class="rp-canvas" style="margin-top:8px"><canvas id="rp-c5"></canvas></div></div>
    </div>`;
}

// Decisiones recomendadas (data-driven)
function rpDecisiones(c, m, okr, lideres) {
  const d = [];
  const failed = okr.filter(o => o.cumple === false).sort((a, b) => 0);
  if (failed.length) d.push(`Meta no alcanzada en <b>${RC_E(failed[0].metrica)}</b> (${rpUnit(failed[0].unidad, failed[0].actual)} vs objetivo ${failed[0].comparador}${rpUnit(failed[0].unidad, failed[0].objetivo)}). Priorizar acciones sobre ese driver.`);
  if (m.desvCosto > 5) d.push(`Desviación de costo <b>+${m.desvCosto}%</b> sobre presupuesto: recalibrar el Estimador ($/sqft por etapa) y apretar cotización de material.`);
  else d.push(`Costo bajo control (desv <b>${m.desvCosto}%</b>): mantener el estándar de cotización y trasladarlo a las obras en curso.`);
  if (lideres.length > 1) { const w = lideres[lideres.length - 1]; if (w.margen < 15) d.push(`Líder <b>${RC_E(w.lider)}</b> con margen ${w.margen}% (bajo meta 20%): revisar cuadrilla, tiempos y compras de sus obras.`); }
  if (m.diasRev) d.push(`${m.diasRev} obra(s) con retraso atípico (|>180d|) marcada(s) “a revisar”: corregir fechas en Airtable para no sesgar el promedio.`);
  if (d.length < 3) d.push(`EBITDA del período: ${RC_K(m.ganancia - (c.overheadOpex || 0))}. Sostener overhead OPEX plano mientras crece la ganancia bruta.`);
  return d.slice(0, 3);
}

// ─── Charts ───
function rpDrawCharts() {
  if (typeof Chart === 'undefined') return;
  const c = (typeof rcCompute === 'function') ? rcCompute() : {};
  (RP.charts || []).forEach(ch => { try { ch.destroy(); } catch (e) {} });
  RP.charts = [];
  const theme = (typeof posGetTheme === 'function' && posGetTheme() === 'light');
  const grid = theme ? 'rgba(15,28,46,.08)' : 'rgba(255,255,255,.06)';
  const tick = theme ? '#475569' : '#9fb0c9';
  const ds = rpFilter(rcObraDataset());
  const m = rpMetrics(ds);
  const mk = (id, cfg) => { const el = document.getElementById(id); if (!el) return; cfg.options = cfg.options || {}; cfg.options.responsive = true; cfg.options.maintainAspectRatio = false; cfg.options.resizeDelay = 200; cfg.options.plugins = Object.assign({ legend: { display: false } }, cfg.options.plugins || {}); cfg.options.scales = cfg.options.scales || {}; ['x', 'y', 'r'].forEach(ax => { if (cfg.options.scales[ax]) { cfg.options.scales[ax].grid = { color: grid }; cfg.options.scales[ax].ticks = Object.assign({ color: tick }, cfg.options.scales[ax].ticks || {}); if (cfg.options.scales[ax].pointLabels) cfg.options.scales[ax].pointLabels.color = tick; } }); try { RP.charts.push(new Chart(el, cfg)); } catch (e) {} };
  const teal = '#12b5a0', blue = '#2f6ef0', red = '#f87171', amber = '#e7b65e';
  if (RP.tipo === 'r1') {
    const top = [...m.fin].sort((a, b) => b.utilidad - a.utilidad).slice(0, 8);
    mk('rp-c1', { type: 'bar', data: { labels: top.map(o => rcShort(o.address)), datasets: [{ data: top.map(o => Math.round(o.utilidad)), backgroundColor: top.map(o => o.utilidad >= 0 ? teal : red) }] }, options: { scales: { x: { ticks: { maxRotation: 60, minRotation: 45, font: { size: 9 } } }, y: {} } } });
  } else if (RP.tipo === 'r2') {
    const oh = rpOverhead(c || {});
    const eb = m.ganancia - (oh.opex || 0);
    mk('rp-c2', { type: 'bar', data: { labels: ['Ingreso', 'Costo real', 'Overhead', 'EBITDA'], datasets: [{ data: [Math.round(m.ingreso), -Math.round(m.costo), -Math.round(oh.opex || 0), Math.round(eb)], backgroundColor: [blue, red, amber, teal] }] }, options: { scales: { x: {}, y: {} } } });
  } else if (RP.tipo === 'r3') {
    const lid = rpLiderAgg(m.fin).slice(0, 8);
    mk('rp-c3', { type: 'bar', data: { labels: lid.map(l => l.lider), datasets: [{ data: lid.map(l => Math.round(l.ganancia)), backgroundColor: teal }] }, options: { indexAxis: 'y', scales: { x: {}, y: { ticks: { font: { size: 10 } } } } } });
  } else if (RP.tipo === 'r4') {
    const okr = (c && c.okrRows) || [];
    mk('rp-c4', { type: 'radar', data: { labels: okr.map(o => o.metrica), datasets: [{ data: okr.map(o => o.cumple == null ? 0 : o.cumple ? 100 : 40), backgroundColor: 'rgba(18,181,160,.2)', borderColor: teal, pointBackgroundColor: okr.map(o => rpSem(o.cumple)) }] }, options: { scales: { r: { min: 0, max: 100, pointLabels: { font: { size: 9 } }, ticks: { display: false } } } } });
  } else if (RP.tipo === 'r5') {
    const withSq = m.fin.filter(o => o.sqft > 0).map(o => ({ a: rcShort(o.address), v: Math.round(o.costo_real / o.sqft) })).sort((a, b) => b.v - a.v).slice(0, 12);
    mk('rp-c5', { type: 'bar', data: { labels: withSq.map(o => o.a), datasets: [{ data: withSq.map(o => o.v), backgroundColor: withSq.map(o => o.v <= 50 ? teal : red) }] }, options: { scales: { x: { ticks: { maxRotation: 60, minRotation: 45, font: { size: 8 } } }, y: {} } } });
  }
}

// ─── Handlers ───
function rpSet(k, v) { RP[k] = v; if (typeof rcGo === 'function') rcGo('reportes'); }
window.RP = RP;
window.rpSet = rpSet;
window.rcSecReportes = rcSecReportes;
window.rpDrawCharts = rpDrawCharts;

// ─── Exports ───
function rpExportPDF() { window.print(); }
function rpExportExcel() {
  if (typeof XLSX === 'undefined') { alert('Librería Excel no disponible.'); return; }
  const c = (typeof rcCompute === 'function') ? rcCompute() : {};
  const obras = rpFilter(rcObraDataset());
  const m = rpMetrics(obras);
  const wb = XLSX.utils.book_new();
  const obrasSheet = obras.map(o => ({ Obra: o.address, Lider: o.lider, Estado: o.estado, Ciudad: o.ciudad, Sqft: o.sqft, Ingreso: Math.round(o.ingreso), CostoReal: Math.round(o.costo_real), Presupuesto: Math.round(o.presupuesto), Utilidad: Math.round(o.utilidad), MargenPct: o.margen, RetrasoDias: o.retraso, PsfUSD: o.psf }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(obrasSheet), 'Obras');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rpLiderAgg(m.fin).map(l => ({ Lider: l.lider, Obras: l.nR, Ganancia: Math.round(l.ganancia), MargenPct: l.margen, PsfUSD: l.psf, DesvDias: l.desvDias, Compartidas: l.shared ? 'sí' : 'no' }))), 'Lideres');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((c.okrRows || []).map(o => ({ Metrica: o.metrica, Objetivo: o.objetivo, Comparador: o.comparador, Unidad: o.unidad, Actual: o.actual, Cumple: o.cumple == null ? 's/d' : o.cumple ? 'sí' : 'no' }))), 'OKRs');
  const oh = rpOverhead(c);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Ingreso: Math.round(m.ingreso), UtilidadBruta: Math.round(m.ganancia), OverheadOpex: Math.round(oh.opex), Capex: Math.round(oh.capex), EBITDA: Math.round(m.ganancia - oh.opex) }]), 'PL_EBITDA');
  XLSX.writeFile(wb, 'Reporte_Remodelacion_' + RP.tipo + '_' + RP.period + '.xlsx');
}
function rpCopyResumen() {
  const c = (typeof rcCompute === 'function') ? rcCompute() : {};
  const obras = rpFilter(rcObraDataset());
  const m = rpMetrics(obras);
  const oh = rpOverhead(c);
  const ebitda = m.ganancia - oh.opex;
  const okr = c.okrRows || [];
  const decisiones = rpDecisiones(c, m, okr, rpLiderAgg(m.fin));
  const strip = s => String(s).replace(/<[^>]+>/g, '');
  const L = [];
  L.push('REPORTE REMODELACIÓN — ' + (RP_TIPOS.find(t => t[0] === RP.tipo) || [, RP.tipo])[1] + ' · período ' + RP.period);
  L.push('');
  L.push('Ganancia BRUTA: ' + RC_M(m.ganancia) + '  (margen ' + m.margen + '%, ' + m.nFin + ' finalizadas)');
  L.push('EBITDA: ' + RC_M(ebitda) + '  (overhead opex ' + RC_M(oh.opex) + ', capex ' + RC_M(oh.capex) + ' aparte)');
  L.push('Desv. costo: ' + (m.desvCosto > 0 ? '+' : '') + m.desvCosto + '%  ·  Desv. días: ' + (m.desvDias > 0 ? '+' : '') + m.desvDias + 'd (mediana ' + m.desvDiasMed + 'd)');
  L.push('$/sqft prom: ' + RC_M(m.psf) + '  ·  OKRs cumplidos: ' + okr.filter(o => o.cumple).length + '/' + okr.length);
  L.push('');
  L.push('3 DECISIONES:');
  decisiones.forEach((d, i) => L.push((i + 1) + '. ' + strip(d)));
  const txt = L.join('\n');
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { if (window.toast) toast('Resumen copiado', 'success'); else alert('Resumen copiado'); }, () => alert(txt));
  else alert(txt);
}
window.rpExportPDF = rpExportPDF;
window.rpExportExcel = rpExportExcel;
window.rpCopyResumen = rpCopyResumen;
