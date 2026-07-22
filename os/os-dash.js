// ════════════════════════════════════════════════════════════════
// 📊 DASHBOARDS EJECUTIVOS por empresa + holding ("Warren Buffett audita mi holding").
// Rutas: /fix-and-flip/dashboard · /remodelacion/dashboard · /rentas/dashboard ·
// /educacion/dashboard · /holding. Estructura idéntica (5 secciones): los 5 números
// (meta+semáforo, dash_metas editable) · tendencia 12m · unit economics · riesgos
// (Sabueso Ops+Contable por $) · decisiones sugeridas (máx 3, por impacto $).
// REGLAS: una definición por métrica (REUSA: inv_indicadores_data+invInd (FF),
// utilidad_remodelacion limpia (RC), billing_ym/v_ocupacion/v_cartera_kpi (Rentas),
// vistas edu_* (Educación), v_holding_pnl+QBO (Holding)); cada cifra declara fuente;
// sin dato ≠ $0; ⓘ educativo de glosario_terminos; banner papel donde aplique.
// ════════════════════════════════════════════════════════════════
/* global sb, OS, osRender, osNav, OS_E, invInd, Chart, kitError */

const DH = { metas: null, glos: null, d: {}, err: {}, charts: [] };
window.DH = DH;

const dhM = v => (v == null || isNaN(+v)) ? '—' : ((+v < 0 ? '−$' : '$') + Math.abs(Math.round(+v)).toLocaleString('en-US'));
const dhP = (v, d) => (v == null || isNaN(+v)) ? '—' : (+v * 100).toFixed(d == null ? 1 : d) + '%';
const dhX = v => (v == null || isNaN(+v)) ? '—' : (+v).toFixed(2) + 'x';
const dhN = v => (v == null || isNaN(+v)) ? '—' : Math.round(+v).toLocaleString('en-US');
const dhHoy = () => new Date().toISOString().slice(0, 10);
const DH_EMP = {
  'fix-and-flip': { key: 'fix_flip', nombre: 'Fix & Flip', icon: '🏚' },
  'remodelacion': { key: 'remodelacion', nombre: 'Remodelación', icon: '🔨' },
  'rentas': { key: 'rentas', nombre: 'Rentas', icon: '🏠' },
  'educacion': { key: 'educacion', nombre: 'Educación', icon: '🎓' },
  'holding': { key: 'holding', nombre: 'Holding consolidado', icon: '🏛' },
};

// ─── base: metas (config editable) + glosario (⓵ educativo) ───
async function dhBase() {
  if (DH.metas) return;
  const [m, g] = await Promise.all([
    sb.from('dash_metas').select('*').eq('active', true).then(r => r.data || []).catch(() => []),
    sb.from('glosario_terminos').select('*').eq('active', true).then(r => r.data || []).catch(() => []),
  ]);
  DH.metas = {}; m.forEach(x => DH.metas[x.clave] = x);
  DH.glos = {}; g.forEach(x => DH.glos[x.clave] = x);
}
function dhMeta(clave) { return (DH.metas || {})[clave] || null; }
function dhSem(valor, metaClave) {
  const mt = dhMeta(metaClave);
  if (valor == null || !mt) return { cls: 'pend', txt: mt ? 'sin dato' : 'sin meta' };
  const cumple = mt.comparador === '<=' ? +valor <= +mt.meta : +valor >= +mt.meta;
  return { cls: cumple ? 'ok' : 'bad', txt: 'meta ' + mt.comparador + ' ' + (Math.abs(+mt.meta) <= 20 ? (+mt.meta % 1 !== 0 || +mt.meta <= 2 ? (String(mt.clave).includes('pct') || +mt.meta <= 2 && String(mt.clave).match(/tir|margen|ltv|ocup/) ? dhP(+mt.meta, 0) : +mt.meta + '') : dhN(+mt.meta)) : dhN(+mt.meta)) };
}
function dhIGlos(clave, hoyTxt) {
  const g = (DH.glos || {})[clave];
  if (!g) return '';
  DH._i = DH._i || {}; DH._i[clave] = hoyTxt || '';
  return ' <span style="cursor:pointer;color:var(--mut2);font-size:10px;vertical-align:middle" title="¿Qué es esto?" onclick="event.stopPropagation();dhGlos(\'' + clave + '\')">ⓘ</span>';
}
function dhGlos(clave) {
  const g = (DH.glos || {})[clave]; if (!g) return;
  const old = document.getElementById('dh-glos-ov'); if (old) old.remove();
  const ov = document.createElement('div');
  ov.id = 'dh-glos-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,12,.55);display:grid;place-items:center;z-index:99999;padding:18px';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  const hoy = (DH._i || {})[clave];
  ov.innerHTML = '<div style="background:var(--bg,#0f1220);border:1px solid var(--glassb,#2a2f4a);border-radius:14px;padding:18px;max-width:460px;width:100%;color:var(--ink,#e8eaf2);box-shadow:0 18px 50px rgba(0,0,0,.45)">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><b style="font-size:15px">' + OS_E(g.termino_es) + '</b><button class="ibtn" onclick="document.getElementById(\'dh-glos-ov\').remove()">✕</button></div>'
    + '<div class="lab">Qué es</div><div style="font-size:13px;line-height:1.6;color:var(--mut)">' + OS_E(g.que_es) + '</div>'
    + (g.para_que ? '<div class="lab" style="margin-top:10px">Para qué sirve</div><div style="font-size:12.5px;color:var(--mut)">' + OS_E(g.para_que) + '</div>' : '')
    + (g.formula ? '<div class="lab" style="margin-top:10px">Fórmula</div><div style="font-family:ui-monospace,Menlo,monospace;font-size:11.5px;background:var(--glass);border:1px solid var(--glassb);border-radius:8px;padding:8px 11px">ƒ ' + OS_E(g.formula) + '</div>' : '')
    + (hoy ? '<div class="lab" style="margin-top:10px">Hoy en tu holding</div><div style="font-size:12.5px;font-weight:700">' + hoy + '</div>' : '')
    + '</div>';
  document.body.appendChild(ov);
}
window.dhGlos = dhGlos;

// ─── framework de render ───
function dhCSS() {
  if (document.getElementById('dh-css')) return;
  const st = document.createElement('style'); st.id = 'dh-css';
  st.textContent = ''
    + '#os-root .dh-big{position:relative}'
    + '#os-root .dh-sem{position:absolute;top:12px;right:12px;width:10px;height:10px;border-radius:50%}'
    + '#os-root .dh-sem.ok{background:var(--pos)}#os-root .dh-sem.bad{background:var(--neg)}#os-root .dh-sem.pend{background:var(--mut2)}'
    + '#os-root .dh-src{display:inline-block;font-size:9px;color:var(--mut2);border:1px solid var(--glassb);border-radius:5px;padding:0 5px;margin-left:5px;vertical-align:middle}'
    + '#os-root .dh-banner{padding:9px 12px;border:1px solid rgba(245,178,61,.45);background:rgba(245,178,61,.08);border-radius:9px;font-size:11.5px;color:var(--amber);margin-bottom:12px}'
    + '#os-root .dh-dec{border:1px solid var(--glassb);border-radius:11px;padding:12px 14px;background:var(--glass)}'
    + '#os-root .dh-tbl{width:100%;border-collapse:collapse;font-size:11.5px}'
    + '#os-root .dh-tbl th{text-align:left;font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:var(--mut2);padding:7px 8px;border-bottom:1px solid var(--glassb);white-space:nowrap}'
    + '#os-root .dh-tbl td{padding:6px 8px;border-bottom:1px solid var(--glassb);white-space:nowrap}'
    + '#os-root .dh-num{text-align:right;font-variant-numeric:tabular-nums}';
  document.head.appendChild(st);
}
function dhSrc(t) { return '<span class="dh-src" title="fuente">' + OS_E(t) + '</span>'; }
function dhBig(cards) {
  return '<div class="grid k5" style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px">' + cards.map(c => {
    const s = dhSem(c.v, c.meta);
    return '<div class="card dh-big" style="margin:0"><span class="dh-sem ' + s.cls + '" title="' + OS_E(s.txt) + '"></span>'
      + '<div class="lab">' + c.lab + (c.glos ? dhIGlos(c.glos, c.txt) : '') + '</div>'
      + '<div class="big ' + (c.cls || '') + '" style="font-size:clamp(17px,1.6vw,24px)">' + c.txt + '</div>'
      + '<div class="meta" style="font-size:10.5px">' + (c.linea || '') + ' <span style="opacity:.75">· ' + OS_E(s.txt) + '</span>' + dhSrc(c.fuente) + '</div></div>';
  }).join('') + '</div>'
  + '<style>@media(max-width:900px){#os-root .grid.k5{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:560px){#os-root .grid.k5{grid-template-columns:1fr!important}}</style>';
}
function dhSecTitle(n, t, extra) { return '<div class="lab" style="margin:18px 0 8px;font-size:11px">' + n + ' · ' + t + (extra ? ' <span style="text-transform:none;letter-spacing:0">' + extra + '</span>' : '') + '</div>'; }
function dhChartBox(id, h) { return '<div class="card" style="margin:0"><div style="position:relative;height:' + (h || 260) + 'px;width:100%;overflow:hidden"><canvas id="' + id + '"></canvas></div></div>'; }
function dhDrawChart(id, cfg) {
  const el = document.getElementById(id); if (!el || !window.Chart) return;
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, resizeDelay: 200 }, cfg.options || {});
  DH.charts.push(new Chart(el, cfg));
}
function dhPend(txt) { return '<span class="warn" style="font-size:12px">' + OS_E(txt || 'pendiente de dato') + '</span>'; }

// ─── riesgos (Sabuesos filtrados a la empresa, por $ impacto) ───
async function dhRiesgos(empKey) {
  const [ct, ops] = await Promise.all([
    sb.from('ct_findings').select('titulo,detalle,impacto_usd,severidad,check_id,empresa').eq('active', true).neq('estado', 'resuelto')
      .or(empKey === 'holding' ? 'empresa.neq.__' : 'empresa.eq.' + empKey + ',empresa.eq.holding')
      .order('impacto_usd', { ascending: false, nullsFirst: false }).limit(6).then(r => r.data || []).catch(() => []),
    sb.from('sabueso_findings').select('task_name,detalle,severidad,empresa,dueno_sugerido').eq('active', true).neq('estado', 'resuelto')
      .then(r => (r.data || []).filter(x => empKey === 'holding' || String(x.empresa || '').toLowerCase().includes(empKey.replace('_', ''))).slice(0, 4)).catch(() => []),
  ]);
  return { ct, ops };
}
function dhRiesgosHtml(r, empKey) {
  const sev = s => '<span class="lm-pill ' + (s === 'critica' || s === 'alta' ? 'bug' : 'warn') + '" style="font-size:8px">' + OS_E(s || '—') + '</span>';
  return '<div class="grid k2" style="align-items:start">'
    + '<div class="card" style="margin:0"><div class="chart-h"><div class="t">🐕 Sabueso Contable</div><div class="k">abiertos por $ impacto' + dhSrc('ct_findings') + '</div></div>'
    + ((r.ct || []).map(f => '<div class="kv"><span style="max-width:70%">' + sev(f.severidad) + ' ' + OS_E(f.titulo) + '</span><b class="down">' + (f.impacto_usd != null ? dhM(f.impacto_usd) : '—') + '</b></div>').join('') || '<div class="empty" style="padding:14px">Sin hallazgos abiertos de esta empresa 🎯</div>')
    + '</div>'
    + '<div class="card" style="margin:0"><div class="chart-h"><div class="t">🐕 Sabueso Ops</div><div class="k">operativos abiertos' + dhSrc('sabueso_findings') + '</div></div>'
    + ((r.ops || []).map(f => '<div class="kv"><span style="max-width:75%">' + sev(f.severidad) + ' ' + OS_E(f.task_name || f.detalle || '') + '</span><b class="meta">' + OS_E(f.dueno_sugerido || '') + '</b></div>').join('') || '<div class="empty" style="padding:14px">Sin hallazgos operativos abiertos 🎯</div>')
    + '</div></div>';
}
function dhDecHtml(decs) {
  if (!decs.length) return '<div class="empty" style="padding:16px">Sin decisiones urgentes según los datos de hoy 🎯</div>';
  return '<div class="grid k3" style="align-items:start">' + decs.slice(0, 3).map((d, i) => '<div class="dh-dec">'
    + '<div style="font-size:11px;color:var(--mut2)">#' + (i + 1) + ' · impacto ' + (d.imp != null ? dhM(d.imp) : 'estratégico') + '</div>'
    + '<div style="font-weight:700;font-size:13px;margin:4px 0">' + d.t + '</div>'
    + '<div class="meta" style="font-size:11px">' + d.d + '</div>'
    + '<div style="margin-top:8px">' + (d.accion ? '<button class="ibtn" onclick="' + d.accion + '">' + (d.accionLbl || 'Ir') + '</button>' : '<span class="meta">dueño: <b>' + OS_E(d.dueno || '—') + '</b></span>') + '</div>'
    + '</div>').join('') + '</div>';
}
const DH_BANNER_PAPEL = '<div class="dh-banner">📄 Los valores de portafolio/equity son sobre <b>valor en papel</b> (appraisal/ARV; vendidas a precio real) — no son ganancias realizadas hasta la venta o el refi.</div>';

// ════════ FIX & FLIP ════════
async function dhLoadFF() {
  if (DH.d.ff) return;
  const hoy = dhHoy();
  const [ind, loans, holds, dists, riesgos] = await Promise.all([
    sb.rpc('inv_indicadores_data').then(r => r.data || []).catch(e => { DH.err.ff = e.message; return []; }),
    sb.from('ff_hml_loans').select('address_norm,address,fecha_vencimiento,monto_hml,fecha_refi,monto_prestamo_refi').eq('active', true).then(r => r.data || []).catch(() => []),
    sb.from('inv_holdings').select('*').eq('active', true).then(r => r.data || []).catch(() => []),
    sb.from('inv_distributions').select('*').eq('active', true).eq('estado', 'pagada').then(r => r.data || []).catch(() => []),
    dhRiesgos('fix_flip'),
  ]);
  const casas = ind.map(r => invInd.casa(r, hoy));
  const port = invInd.portfolio(ind, hoy);
  // ciclo promedio compra→refi/venta (días; sin cierre = hoy, declarado)
  const ciclos = ind.filter(r => r.close_date).map(r => {
    const ln = loans.find(l => (l.address || '').startsWith(r.casa));
    const fin = (ln && (ln.fecha_refi || null)) || (r.vendida && r.fecha_venta) || hoy;
    return Math.round((new Date(fin) - new Date(r.close_date)) / 86400000);
  });
  const ciclo = ciclos.length ? ciclos.reduce((s, x) => s + x, 0) / ciclos.length : null;
  const defRows = await sb.from('ff_deals').select('address,deficit_total').eq('active', true).then(r => r.data).catch(() => null);
  const deficit = defRows ? defRows.reduce((s, d) => s + (+d.deficit_total || 0), 0) : null;
  // TVPI/DPI/RVPI agregado inversionistas
  const capT = holds.reduce((s, h) => s + (+h.inversion_aportada || 0), 0);
  const distT = dists.reduce((s, d) => s + (+d.monto || 0), 0);
  let resid = 0; holds.forEach(h => { const c = casas.find(x => x.property_id === h.property_id); if (c && c.equityHoy != null) resid += Math.max(0, c.equityHoy) * (+h.reparto_pct || 0); });
  // precisión de estimación: |appraisal − ARV|/ARV (solo casas con ambos)
  const errRows = await sb.from('ff_deals').select('appraisal,arv').eq('active', true).gt('appraisal', 0).gt('arv', 0).then(r => r.data).catch(() => null);
  const errArv = errRows && errRows.length ? errRows.reduce((s, d) => s + Math.abs(+d.appraisal - +d.arv) / +d.arv, 0) / errRows.length : null;
  // tendencia: TIR y capital al corte de cada fin de mes (12m)
  const meses = []; const dNow = new Date();
  for (let i = 11; i >= 0; i--) { const d0 = new Date(dNow.getFullYear(), dNow.getMonth() - i + 1, 0); meses.push(d0.toISOString().slice(0, 10)); }
  const trend = meses.map(corte => {
    const rows = ind.filter(r => r.close_date && r.close_date <= corte);
    const p = invInd.portfolio(rows, corte);
    return { corte, tir: p.xirrAllIn, cap: rows.reduce((s, r) => s + +r.all_in, 0) };
  });
  DH.d.ff = { ind, casas, port, loans, ciclo, deficit, capT, distT, resid, errArv, trend, riesgos, hoy };
}
function dhViewFF() {
  const D = DH.d.ff; if (!D) { dhLoadFF().then(osRender); return '<div class="empty">⏳ Calculando el portafolio…</div>'; }
  const p = D.port;
  const invEng = window.invEngine || {};
  const big = dhBig([
    { lab: 'TIR del portafolio', glos: 'xirr', v: p.xirrAllIn, txt: dhP(p.xirrAllIn), meta: 'ff_tir', fuente: 'inv_indicadores_data + invInd (XIRR all-in)', linea: p.n + ' casas · papel al corte ' + D.hoy, cls: p.xirrAllIn > 0 ? 'up' : 'down' },
    { lab: 'Múltiplo equity', glos: 'mult_equity', v: p.multEquity, txt: dhX(p.multEquity), meta: 'ff_mult_eq', fuente: 'definición Excel (deuda faltante=0)', linea: p.porCompletar.length + ' casas con deuda por completar — sesgo declarado' },
    { lab: 'Capital vs equity · LTV', glos: 'ltv', v: p.ltvPond, txt: dhP(p.ltvPond), meta: 'ff_ltv', fuente: 'Σ deuda ÷ Σ papel (casas con deuda)', linea: 'desplegado ' + dhM(p.invTotal) + ' · equity propio ' + dhM(p.equityInv) },
    { lab: 'Ciclo compra→refi/venta', v: D.ciclo, txt: D.ciclo != null ? dhN(D.ciclo) + ' días' : '—', meta: 'ff_ciclo_dias', fuente: 'close_date → fecha_refi/venta (sin cierre = hoy)', linea: 'promedio del portafolio — bajarlo libera capital' },
    { lab: 'Déficit acumulado', glos: 'deficit_harmony', v: D.deficit, txt: dhM(D.deficit), meta: 'ff_deficit', fuente: 'Σ ff_deals.deficit_total (Airtable FF)', linea: 'Harmony + rentas · plata propia tapando huecos', cls: D.deficit > 0 ? 'down' : 'up' },
  ]);
  const venc60 = D.ind.filter(r => { const ln = D.loans.find(l => (l.address || '').startsWith(r.casa)); return ln && ln.fecha_vencimiento && !ln.fecha_refi && !r.vendida && (new Date(ln.fecha_vencimiento) - Date.now()) < 60 * 86400000; });
  const ue = '<div class="card overx" style="margin:0"><table class="dh-tbl"><thead><tr><th>Casa</th><th class="dh-num">All-in</th><th class="dh-num">Papel</th><th>Fuente</th><th class="dh-num">Margen s/all-in</th><th class="dh-num">Compra → Papel</th><th class="dh-num">Aprec./año</th><th class="dh-num">Equity hoy</th><th class="dh-num">Deuda</th><th>Vence HML</th></tr></thead><tbody>'
    + D.casas.slice().sort((a, b) => (b.multAllIn || 0) - (a.multAllIn || 0)).map(c => {
      const ln = D.loans.find(l => (l.address || '').startsWith(c.casa)) || {};
      const vencSoon = ln.fecha_vencimiento && !ln.fecha_refi && !c.vendida && (new Date(ln.fecha_vencimiento) - Date.now()) < 60 * 86400000;
      return '<tr' + (vencSoon ? ' style="background:rgba(255,92,108,.07)"' : '') + '><td>' + OS_E(c.casa) + (c.vendida ? ' <span class="lm-pill ok" style="font-size:8px">vendida</span>' : '') + '</td>'
        + '<td class="dh-num">' + dhM(c.all_in) + '</td><td class="dh-num">' + dhM(c.paper_value) + '</td><td class="meta" style="font-size:9px">' + OS_E(c.paper_fuente || '') + '</td>'
        + '<td class="dh-num ' + ((c.multAllIn || 0) >= 1 ? 'up' : 'down') + '">' + (c.multAllIn != null ? dhP(c.multAllIn - 1) : '—') + '</td>'
        + '<td class="dh-num" style="font-size:10px">' + (c.compra && c.paper_value ? dhM(c.compra) + ' → ' + dhM(c.paper_value) : '—') + '</td>'
        + '<td class="dh-num">' + (c.tirNA ? 'n/a' : dhP(c.aprecAnual)) + '</td>'
        + '<td class="dh-num">' + (c.equityHoy != null ? dhM(c.equityHoy) : '—') + '</td>'
        + '<td class="dh-num">' + (c.deuda_vigente != null ? dhM(c.deuda_vigente) : dhPend('por completar')) + '</td>'
        + '<td>' + (ln.fecha_vencimiento ? OS_E(ln.fecha_vencimiento) + (vencSoon ? ' <b class="down">⚠ <60d</b>' : '') : '—') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  const extra = '<div class="grid k3" style="margin-top:12px;align-items:start">'
    + '<div class="card" style="margin:0"><div class="lab">Precisión de estimación' + dhIGlos('appraisal', dhP(D.errArv)) + '</div><div class="big">' + dhP(D.errArv) + '</div><div class="meta">error |appraisal − ARV| promedio · ¿compramos bien?' + dhSrc('ff_deals (casas con ambos)') + '</div></div>'
    + '<div class="card" style="margin:0"><div class="lab">Inversionistas · DPI / RVPI / TVPI' + dhIGlos('tvpi') + '</div><div class="big">' + dhX(D.capT ? D.distT / D.capT : null) + ' · ' + dhX(D.capT ? D.resid / D.capT : null) + ' · ' + dhX(D.capT ? (D.distT + D.resid) / D.capT : null) + '</div><div class="meta">capital ' + dhM(D.capT) + ' · pagado ' + dhM(D.distT) + ' · residual papel ' + dhM(D.resid) + dhSrc('inv_holdings + inv_distributions') + '</div></div>'
    + '<div class="card" style="margin:0"><div class="lab">HML por vencer &lt;60 días</div><div class="big ' + (venc60.length ? 'down' : 'up') + '">' + venc60.length + '</div><div class="meta">' + (venc60.map(c => OS_E(c.casa)).join(' · ') || 'ninguno sin plan de salida') + dhSrc('ff_hml_loans') + '</div></div></div>';
  const decs = [];
  if (venc60.length) decs.push({ t: 'Resolver HML por vencer', d: venc60.length + ' casa(s) con HML venciendo <60 días sin refi/venta: ' + venc60.map(c => c.casa).join(', ') + '. Refi, extensión o venta.', imp: venc60.reduce((s, c) => s + (+c.hml_original || 0), 0), dueno: 'Juan' });
  if (p.porCompletar.length) decs.push({ t: 'Completar deuda de ' + p.porCompletar.length + ' casas', d: 'Term sheets reales a "Datos por casa" — el múltiplo equity hoy las cuenta con deuda 0.', imp: null, accion: "osNav('/inversionistas')", accionLbl: 'Checklist con deep-links' });
  if (D.deficit > 0) decs.push({ t: 'Bajar el déficit acumulado', d: 'Hoy ' + dhM(D.deficit) + ' de plata propia tapando huecos (Harmony+rentas). Priorizar refis con cash-out.', imp: D.deficit, dueno: 'Juan / CEO' });
  setTimeout(() => {
    dhDrawChart('dh-ff-t', { type: 'bar', data: { labels: D.trend.map(t => t.corte.slice(2, 7)), datasets: [
      { type: 'line', label: 'TIR all-in al corte', yAxisID: 'y1', data: D.trend.map(t => t.tir != null ? +(t.tir * 100).toFixed(1) : null), borderColor: '#48d69c', pointRadius: 2 },
      { label: 'Capital desplegado acum.', yAxisID: 'y', data: D.trend.map(t => Math.round(t.cap)), backgroundColor: 'rgba(79,141,255,.5)' },
    ] }, options: { scales: { y: { ticks: { font: { size: 9 } } }, y1: { position: 'right', ticks: { callback: v => v + '%', font: { size: 9 } }, grid: { drawOnChartArea: false } }, x: { ticks: { font: { size: 9 } } } }, plugins: { legend: { labels: { boxWidth: 10, font: { size: 10 } } } } } });
  }, 80);
  return DH_BANNER_PAPEL + big
    + dhSecTitle('2', 'Tendencia 12 meses', '(TIR y capital al corte de cada mes · déficit/ciclo sin histórico — el espejo no guarda snapshots)') + dhChartBox('dh-ff-t')
    + dhSecTitle('3', 'Unit economics por casa') + ue + extra
    + dhSecTitle('4', 'Riesgos') + dhRiesgosHtml(D.riesgos, 'fix_flip')
    + dhSecTitle('5', 'Decisiones sugeridas') + dhDecHtml(decs);
}

// ════════ REMODELACIÓN ════════
async function dhLoadRM() {
  if (DH.d.rm) return;
  const [obras, oh, horas, riesgos] = await Promise.all([
    sb.from('remodel_at_properties').select('*').eq('active', true).then(r => r.data || []).catch(e => { DH.err.rm = e.message; return []; }),
    sb.from('remodel_overhead').select('monto,categoria,source').then(r => r.data || []).catch(() => []),
    sb.from('remodel_worker_hours').select('fecha,horas,worker').gte('fecha', new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10)).is('archived_at', null).then(r => r.data || []).catch(() => []),
    dhRiesgos('remodelacion'),
  ]);
  DH.d.rm = { obras, oh, horas, riesgos };
}
function dhViewRM() {
  const D = DH.d.rm; if (!D) { dhLoadRM().then(osRender); return '<div class="empty">⏳ Cargando obras…</div>'; }
  const fin = D.obras.filter(o => o.proceso === 'Finalizado');
  const act = D.obras.filter(o => o.proceso !== 'Finalizado');
  const gasto = o => (Number(o.gasto_materiales) || 0) + (Number(o.gasto_trabajadores) || 0);
  const gastoReal = o => gasto(o) * 1.05;
  const util = fin.reduce((s, o) => s + (Number(o.utilidad_remodelacion) || 0), 0);
  const ohOpex = D.oh.filter(x => !/veh|transporte/i.test(x.categoria || '')).reduce((s, x) => s + (+x.monto || 0), 0);
  const ohCapex = D.oh.reduce((s, x) => s + (+x.monto || 0), 0) - ohOpex;
  const ebitda = util - ohOpex;
  const vc = fin.reduce((s, o) => s + (Number(o.valor_cliente) || 0), 0);
  const margen = vc ? util / vc : null;
  const backlog = act.filter(o => o.valor_cliente != null).reduce((s, o) => s + (Number(o.valor_cliente) - gastoReal(o)), 0);
  const conP = fin.filter(o => Number(o.presupuesto_interno) > 0);
  const desvs = conP.map(o => (gastoReal(o) - o.presupuesto_interno) / o.presupuesto_interno).sort((a, b) => a - b);
  const desvMed = desvs.length ? desvs[Math.floor(desvs.length / 2)] : null;
  const retr = fin.map(o => Number(o.retraso_dias)).filter(x => !isNaN(x) && Math.abs(x) <= 180).sort((a, b) => a - b);
  const retrMed = retr.length ? retr[Math.floor(retr.length / 2)] : null;
  const sqftFin = fin.filter(o => Number(o.sqft) > 0);
  const psfReal = sqftFin.length ? sqftFin.reduce((s, o) => s + gastoReal(o), 0) / sqftFin.reduce((s, o) => s + +o.sqft, 0) : null;
  const psfCobr = sqftFin.filter(o => o.valor_cliente != null).length ? sqftFin.filter(o => o.valor_cliente != null).reduce((s, o) => s + +o.valor_cliente, 0) / sqftFin.filter(o => o.valor_cliente != null).reduce((s, o) => s + +o.sqft, 0) : null;
  const big = dhBig([
    { lab: 'EBITDA (limpio)', glos: 'ebitda', v: ebitda, txt: dhM(ebitda), meta: 'rm_ebitda', fuente: 'Σ utilidad_remodelacion − overhead opex', linea: 'utilidad limpia ' + dhM(util) + ' − overhead ' + dhM(ohOpex) + ' (capex ' + dhM(ohCapex) + ' fuera)', cls: ebitda >= 0 ? 'up' : 'down' },
    { lab: 'Margen bruto obras', v: margen, txt: dhP(margen), meta: 'rm_margen_pct', fuente: 'Σ utilidad ÷ Σ valor cliente (criterio B9)', linea: fin.length + ' finalizadas · fórmula limpia acordada' },
    { lab: 'Backlog', glos: 'backlog', v: backlog, txt: dhM(backlog), meta: null, fuente: 'Σ (valor cliente − gasto interno) activas', linea: act.length + ' obras activas' },
    { lab: 'Desviación costo · días', v: desvMed, txt: dhP(desvMed) + ' · ' + (retrMed != null ? retrMed + 'd' : '—'), meta: 'rm_desv_costo', fuente: 'mediana finalizadas (outliers >180d fuera)', linea: 'gasto real vs presupuesto · fin real vs plan' },
    { lab: '$/sqft real vs cobrado', v: psfCobr != null && psfReal != null ? psfCobr - psfReal : null, txt: (psfReal != null ? '$' + psfReal.toFixed(2) : '—') + ' / ' + (psfCobr != null ? '$' + psfCobr.toFixed(2) : '—'), meta: 'rm_psf_margen', fuente: 'gasto interno ÷ sqft · valor cliente ÷ sqft', linea: 'margen por pie²: ' + (psfCobr != null && psfReal != null ? '$' + (psfCobr - psfReal).toFixed(2) : '—') },
  ]);
  const ue = '<div class="card overx" style="margin:0"><table class="dh-tbl"><thead><tr><th>Obra</th><th>Estado</th><th class="dh-num">Draws recibidos</th><th class="dh-num">Cobrado (cliente)</th><th class="dh-num">Gap</th><th class="dh-num">Gasto interno</th><th class="dh-num">Utilidad</th><th class="dh-num">Rent.%</th><th class="dh-num">Avance real</th></tr></thead><tbody>'
    + D.obras.slice().sort((a, b) => (b.valor_cliente || 0) - (a.valor_cliente || 0)).map(o => {
      const gap = (o.draws_ingresados != null && o.valor_cliente != null) ? +o.draws_ingresados - +o.valor_cliente : null;
      return '<tr><td>' + OS_E((o.address || '').split(',')[0]) + '</td><td class="meta" style="font-size:10px">' + OS_E(o.proceso || '—') + '</td>'
        + '<td class="dh-num">' + dhM(o.draws_ingresados) + '</td><td class="dh-num">' + dhM(o.valor_cliente) + '</td>'
        + '<td class="dh-num ' + (gap > 0 ? 'down' : '') + '">' + (gap != null ? dhM(gap) : '—') + '</td>'
        + '<td class="dh-num">' + dhM(gastoReal(o)) + '</td>'
        + '<td class="dh-num ' + ((o.utilidad_remodelacion || 0) >= 0 ? 'up' : 'down') + '">' + (o.utilidad_remodelacion != null ? dhM(o.utilidad_remodelacion) : dhPend(o.proceso === 'Finalizado' ? 'sin dato' : 'en obra')) + '</td>'
        + '<td class="dh-num">' + (o.rentabilidad_remodelacion != null ? dhP(o.rentabilidad_remodelacion / (Math.abs(o.rentabilidad_remodelacion) > 1.5 ? 100 : 1)) : '—') + '</td>'
        + '<td class="dh-num">' + (o.avance_real != null ? dhP(o.avance_real / (o.avance_real > 1.5 ? 100 : 1), 0) : '—') + '</td></tr>';
    }).join('') + '</tbody></table></div>'
    + '<div class="grid k2" style="margin-top:12px;align-items:start">'
    + '<div class="card" style="margin:0"><div class="lab">Utilización de cuadrillas (28 días)</div><div class="big">' + dhN(D.horas.reduce((s, h) => s + (+h.horas || 0), 0)) + ' h</div><div class="meta">' + new Set(D.horas.map(h => h.worker)).size + ' trabajadores · ' + act.length + ' obras activas' + dhSrc('remodel_worker_hours') + '</div></div>'
    + '<div class="card" style="margin:0"><div class="lab">Costo unitario por ítem</div><div class="big">' + dhPend('en medición') + '</div><div class="meta">sale del piloto de Denfield — jamás un número inventado</div></div></div>';
  // tendencia: por mes de fin real (finalizadas)
  const porMes = {};
  fin.filter(o => o.fecha_real_fin).forEach(o => { const ym = String(o.fecha_real_fin).slice(0, 7); const x = porMes[ym] = porMes[ym] || { u: 0, vc: 0 }; x.u += +o.utilidad_remodelacion || 0; x.vc += +o.valor_cliente || 0; });
  const ms = Object.keys(porMes).sort().slice(-12);
  const decs = [];
  const gapTop = D.obras.filter(o => o.draws_ingresados != null && o.valor_cliente != null && +o.draws_ingresados - +o.valor_cliente > 5000).sort((a, b) => (+b.draws_ingresados - +b.valor_cliente) - (+a.draws_ingresados - +a.valor_cliente));
  if (gapTop.length) decs.push({ t: 'Cerrar el gap draws vs cobrado', d: gapTop.length + ' obra(s) con draws por encima del valor al cliente — el flip está poniendo de más. Peor: ' + (gapTop[0].address || '').split(',')[0] + ' (' + dhM(+gapTop[0].draws_ingresados - +gapTop[0].valor_cliente) + ').', imp: gapTop.reduce((s, o) => s + (+o.draws_ingresados - +o.valor_cliente), 0), dueno: 'Juan / Alejandra' });
  const sobre = act.filter(o => Number(o.presupuesto_interno) > 0 && gastoReal(o) > +o.presupuesto_interno * (1 + 0.1) * Math.max(0.05, +o.avance_real > 1 ? o.avance_real / 100 : (+o.avance_real || 1)));
  if (sobre.length) decs.push({ t: 'Frenar sobrecosto en obra', d: sobre.map(o => (o.address || '').split(',')[0]).join(', ') + ' gastando por encima del presupuesto proporcional al avance.', imp: sobre.reduce((s, o) => s + gastoReal(o) - +o.presupuesto_interno, 0), dueno: 'Alejandra' });
  if (backlog > 0 && act.length) decs.push({ t: 'Convertir el backlog', d: dhM(backlog) + ' contratados por ejecutar en ' + act.length + ' obras — cada semana de retraso posterga ese ingreso.', imp: backlog, accion: "osOpenApp('remodelacion','command-center')", accionLbl: 'Abrir Command Center' });
  setTimeout(() => {
    dhDrawChart('dh-rm-t', { type: 'bar', data: { labels: ms.map(m => invEngineSafeMes(m)), datasets: [
      { label: 'Utilidad limpia/mes', data: ms.map(m => Math.round(porMes[m].u)), backgroundColor: 'rgba(72,214,156,.6)' },
      { label: 'Valor cliente/mes', data: ms.map(m => Math.round(porMes[m].vc)), backgroundColor: 'rgba(79,141,255,.4)' },
    ] }, options: { plugins: { legend: { labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } } });
  }, 80);
  return big
    + dhSecTitle('2', 'Tendencia', '(obras finalizadas por mes de fin real — EBITDA/backlog sin snapshots mensuales, declarado)') + dhChartBox('dh-rm-t')
    + dhSecTitle('3', 'Unit economics por obra') + ue
    + dhSecTitle('4', 'Riesgos') + dhRiesgosHtml(D.riesgos, 'remodelacion')
    + dhSecTitle('5', 'Decisiones sugeridas') + dhDecHtml(decs);
}
function invEngineSafeMes(m) { return (window.invEngine && invEngine.mesEs) ? invEngine.mesEs(m) : m; }

// ════════ RENTAS ════════
async function dhLoadRE() {
  if (DH.d.re) return;
  const desde = new Date(); desde.setMonth(desde.getMonth() - 12);
  const dIso = desde.toISOString().slice(0, 7);
  const [oc, pays, exps, kpi, cart, props, units, deals, riesgos] = await Promise.all([
    sb.from('v_ocupacion').select('*').maybeSingle().then(r => r.data).catch(() => null),
    sb.from('pm_payments').select('billing_ym,amount,status,property_id,tenant_id').eq('active', true).eq('status', 'pagado').gte('billing_ym', dIso).then(r => r.data || []).catch(() => []),
    sb.from('pm_expenses').select('billing_ym,amount,property_id,description,category,subcategory').eq('active', true).gte('billing_ym', dIso).then(r => r.data || []).catch(() => []),
    sb.from('v_cartera_kpi').select('*').maybeSingle().then(r => r.data).catch(() => null),
    sb.from('v_cartera_inquilino').select('*').then(r => r.data || []).catch(() => []),
    sb.from('pm_properties').select('id,name,address,total_units').eq('active', true).then(r => r.data || []).catch(() => []),
    sb.from('pm_units').select('property_id,status').eq('active', true).then(r => r.data || []).catch(() => []),
    sb.from('ff_deals').select('address,renta_mensual,hml_payment,ref30_payment,property_id').eq('active', true).then(r => r.data || []).catch(() => []),
    dhRiesgos('rentas'),
  ]);
  const esHipo = e => /hipoteca/i.test((e.description || '') + (e.category || '') + (e.subcategory || ''));
  DH.d.re = { oc, pays, exps, kpi, cart, props, units, deals, riesgos, esHipo };
}
function dhViewRE() {
  const D = DH.d.re; if (!D) { dhLoadRE().then(osRender); return '<div class="empty">⏳ Cargando Rentas…</div>'; }
  const ym = new Date().toISOString().slice(0, 7);
  const S = (arr, f) => arr.reduce((s, x) => s + (f(x) ? +x.amount || 0 : 0), 0);
  const rentaMes = S(D.pays, p => p.billing_ym === ym);
  const gasMes = S(D.exps, e => e.billing_ym === ym && !D.esHipo(e));
  const hipoMes = S(D.exps, e => e.billing_ym === ym && D.esHipo(e));
  const noi = rentaMes - gasMes;
  const cf = noi - hipoMes;
  const ocPct = D.oc ? +D.oc.ocupacion_pct / 100 : null;
  const venc = D.kpi ? +D.kpi.vencido_neto : null;
  const big = dhBig([
    { lab: 'Ocupación', glos: 'ocupacion', v: ocPct, txt: dhP(ocPct), meta: 're_ocupacion_pct', fuente: 'v_ocupacion (regla del dueño)', linea: D.oc ? D.oc.ocupadas + '/' + D.oc.unidades_rentables + ' unidades' : 'sin dato' },
    { lab: 'Renta cobrada · ' + invEngineSafeMes(ym), v: rentaMes || null, txt: dhM(rentaMes), meta: null, fuente: 'pm_payments billing_ym (Mes de Renta)', linea: 'definición corregida: mes de renta, no fecha de cobro', cls: 'up' },
    { lab: 'NOI del mes', glos: 'noi', v: noi, txt: dhM(noi), meta: 're_noi', fuente: 'renta − operativos (P&L SÍ, sin hipoteca)', linea: 'gastos operativos ' + dhM(gasMes), cls: noi >= 0 ? 'up' : 'down' },
    { lab: 'Deuda vencida real', v: venc, txt: dhM(venc), meta: 're_vencido', fuente: 'v_cartera_kpi.vencido_neto (neteado)', linea: 'meses cerrados — el mes en curso NO es mora', cls: venc > 0 ? 'down' : 'up' },
    { lab: 'Cash flow post-deuda', v: cf, txt: dhM(cf), meta: 're_cf_postdeuda', fuente: 'NOI − hipotecas del mes (billing_ym)', linea: 'hipotecas ' + dhM(hipoMes) + ' — informativo P&L NO', cls: cf >= 0 ? 'up' : 'down' },
  ]);
  // aging + top deudores
  const morosos = (D.cart || []).filter(x => +((x.vencido_neto != null ? x.vencido_neto : x.vencido) || 0) > 0).sort((a, b) => +((b.vencido_neto != null ? b.vencido_neto : b.vencido) || 0) - +((a.vencido_neto != null ? a.vencido_neto : a.vencido) || 0));
  // por casa: renta 12m, NOI, ocupación, DSCR
  const byProp = {};
  D.pays.forEach(p => { if (!p.property_id) return; const o = byProp[p.property_id] = byProp[p.property_id] || { renta: 0, gas: 0, meses: new Set() }; o.renta += +p.amount || 0; o.meses.add(p.billing_ym); });
  D.exps.forEach(e => { if (!e.property_id || D.esHipo(e)) return; const o = byProp[e.property_id] = byProp[e.property_id] || { renta: 0, gas: 0, meses: new Set() }; o.gas += +e.amount || 0; });
  const filas = Object.keys(byProp).map(pid => {
    const pr = D.props.find(p => p.id === pid) || {};
    const o = byProp[pid];
    const nm = o.meses.size || 1;
    const noiM = (o.renta - o.gas) / nm;
    const us = D.units.filter(u => u.property_id === pid);
    const ocp = us.length ? us.filter(u => /ocupad/i.test(u.status || '')).length / us.length : null;
    const deal = D.deals.find(dd => dd.property_id && pr.address && String(dd.address || '').slice(0, 8).toLowerCase() === String(pr.address || '').slice(0, 8).toLowerCase());
    const serv = deal ? (+deal.hml_payment || 0) + (+deal.ref30_payment || 0) : null;
    const dscr = serv > 0 ? noiM / serv : null;
    return { nombre: (pr.name || pr.address || pid).split(',')[0], rentaM: o.renta / nm, noiM, ocp, dscr, serv };
  }).sort((a, b) => b.noiM - a.noiM);
  const ue = '<div class="card overx" style="margin:0"><table class="dh-tbl"><thead><tr><th>Casa</th><th class="dh-num">Renta/mes (12m)</th><th class="dh-num">NOI/mes</th><th class="dh-num">Ocupación</th><th class="dh-num">DSCR</th></tr></thead><tbody>'
    + filas.map(f => '<tr><td>' + OS_E(f.nombre) + '</td><td class="dh-num">' + dhM(f.rentaM) + '</td><td class="dh-num ' + (f.noiM >= 0 ? 'up' : 'down') + '">' + dhM(f.noiM) + '</td>'
      + '<td class="dh-num">' + dhP(f.ocp, 0) + '</td>'
      + '<td class="dh-num ' + (f.dscr != null && f.dscr < 1 ? 'down' : '') + '">' + (f.dscr != null ? f.dscr.toFixed(2) + 'x' + (f.dscr < 1 ? ' ⚠' : '') : dhPend('deuda FF: requiere área fix-flip')) + '</td></tr>').join('')
    + '</tbody></table><div class="meta" style="margin-top:6px;font-size:10px">DSCR' + dhIGlos('dscr') + ' = NOI mensual ÷ servicio de deuda (hml+ref30 de ff_deals) — sin acceso al área FF se declara, no se inventa.</div></div>'
    + '<div class="grid k2" style="margin-top:12px;align-items:start">'
    + '<div class="card" style="margin:0"><div class="chart-h"><div class="t">Top 5 deudores (neteado)</div><div class="k">' + dhSrc('v_cartera_inquilino') + ' · <a style="cursor:pointer;color:var(--a2)" onclick="osNav(\'/cobros\')">abrir Cobros →</a></div></div>'
    + (morosos.slice(0, 5).map(x => '<div class="kv"><span>' + OS_E(x.inquilino || x.tenant || '—') + '</span><b class="down">' + dhM(x.vencido_neto != null ? x.vencido_neto : x.vencido) + '</b></div>').join('') || '<div class="empty" style="padding:12px">Sin morosos netos 🎯</div>') + '</div>'
    + '<div class="card" style="margin:0"><div class="lab">% cobranza del mes · churn</div><div class="big">' + (function () { const pact = (D.cart || []).reduce((s, x) => s + (+x.por_cobrar_mes || 0), 0) + rentaMes; return pact ? dhP(rentaMes / pact) : '—'; })() + '</div><div class="meta">cobrado ÷ pactado del mes' + dhSrc('cartera + billing_ym') + ' · churn de inquilinos: ' + dhPend('sin serie de salidas espejada — pendiente de dato') + '</div></div></div>';
  const meses12 = [...new Set(D.pays.map(p => p.billing_ym))].sort().slice(-12);
  const serie = meses12.map(m => { const r = S(D.pays, p => p.billing_ym === m); const g = S(D.exps, e => e.billing_ym === m && !D.esHipo(e)); const h = S(D.exps, e => e.billing_ym === m && D.esHipo(e)); return { m, r, noi: r - g, cf: r - g - h }; });
  const decs = [];
  if (morosos.length) decs.push({ t: 'Cobrar la deuda vencida', d: 'Top: ' + morosos.slice(0, 3).map(x => (x.inquilino || '—') + ' (' + dhM(x.vencido_neto != null ? x.vencido_neto : x.vencido) + ')').join(', ') + '.', imp: venc, accion: "osNav('/cobros')", accionLbl: 'Abrir Cobros' });
  const dscrBajo = filas.filter(f => f.dscr != null && f.dscr < 1);
  if (dscrBajo.length) decs.push({ t: 'Casas que no cubren su deuda', d: dscrBajo.map(f => f.nombre).join(', ') + ' con DSCR < 1.0 — subir renta/ocupación o refinanciar.', imp: Math.round(dscrBajo.reduce((s, f) => s + (f.serv - f.noiM), 0) * 12), dueno: 'Carlos' });
  if (D.oc && +D.oc.disponibles > 0) decs.push({ t: 'Llenar ' + D.oc.disponibles + ' unidades disponibles', d: 'Cada unidad vacía es renta que no entra — priorizar publicación y showing.', imp: null, dueno: 'Carlos' });
  setTimeout(() => {
    dhDrawChart('dh-re-t', { type: 'line', data: { labels: serie.map(s => s.m.slice(2)), datasets: [
      { label: 'Renta cobrada', data: serie.map(s => Math.round(s.r)), borderColor: '#48d69c', pointRadius: 2 },
      { label: 'NOI', data: serie.map(s => Math.round(s.noi)), borderColor: '#4f8dff', pointRadius: 2 },
      { label: 'Post-deuda', data: serie.map(s => Math.round(s.cf)), borderColor: '#f0687a', pointRadius: 2 },
    ] }, options: { plugins: { legend: { labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } } });
  }, 80);
  return big
    + dhSecTitle('2', 'Tendencia 12 meses', '(por Mes de Renta · ocupación/vencido sin serie histórica — declarado)') + dhChartBox('dh-re-t')
    + dhSecTitle('3', 'Unit economics por casa') + ue
    + dhSecTitle('4', 'Riesgos') + dhRiesgosHtml(D.riesgos, 'rentas')
    + dhSecTitle('5', 'Decisiones sugeridas') + dhDecHtml(decs);
}

// ════════ EDUCACIÓN ════════
async function dhLoadED() {
  if (DH.d.ed) return;
  const q = (t) => sb.from(t).select('*').then(r => r.data || []).catch(() => null);
  const [snap, etapas, creditos, tiempos, rev, riesgos] = await Promise.all([
    sb.from('edu_ceo_snapshot').select('*').maybeSingle().then(r => r.data).catch(() => null),
    q('edu_kpi_cartera_por_etapa'), q('edu_kpi_creditos_diagnosticados'), q('edu_kpi_tiempo_por_etapa'), q('edu_ceo_revenue'),
    dhRiesgos('educacion'),
  ]);
  const tend6 = await q('edu_ceo_tendencia_6m');
  DH.d.ed = { snap, etapas, creditos, tiempos, rev, riesgos, tend6 };
}
function dhViewED() {
  const D = DH.d.ed; if (!D) { dhLoadED().then(osRender); return '<div class="empty">⏳ Cargando Educación…</div>'; }
  const s = D.snap || {};
  const cred = D.creditos && D.creditos[0] ? D.creditos[0] : null;
  const credN = cred ? +(cred.diagnosticados != null ? cred.diagnosticados : (cred.total != null ? cred.total : Object.values(cred).find(v => !isNaN(+v)))) : null;
  const ingresos = D.rev && D.rev.length ? D.rev.reduce((x, r) => x + (+(r.ingresos != null ? r.ingresos : (r.total != null ? r.total : 0)) || 0), 0) : null;
  const tProm = D.tiempos && D.tiempos.length ? D.tiempos.reduce((x, r) => x + (+(r.dias_promedio != null ? r.dias_promedio : (r.dias != null ? r.dias : 0)) || 0), 0) / D.tiempos.length : null;
  const big = dhBig([
    { lab: 'Estudiantes activos', v: s.activos, txt: dhN(s.activos), meta: 'edu_activos', fuente: 'edu_ceo_snapshot', linea: (s.en_riesgo || 0) + ' en riesgo · ' + (s.nuevos_30d || 0) + ' nuevos 30d' },
    { lab: 'Ingresos del período', v: ingresos, txt: ingresos != null ? dhM(ingresos) : dhPend('sin cobros espejados'), meta: null, fuente: 'edu_ceo_revenue', linea: 'cobros del área educación' },
    { lab: 'Cartera de créditos', v: D.etapas ? D.etapas.length : null, txt: D.etapas ? D.etapas.length + ' etapas' : '—', meta: null, fuente: 'edu_kpi_cartera_por_etapa', linea: 'conversión entre etapas abajo' },
    { lab: 'Créditos diagnosticados', v: credN, txt: dhN(credN), meta: 'edu_creditos', fuente: 'edu_kpi_creditos_diagnosticados', linea: 'vs meta editable (dash_metas)' },
    { lab: 'Tiempo prom. por etapa', v: tProm, txt: tProm != null ? Math.round(tProm) + ' días' : '—', meta: null, fuente: 'edu_kpi_tiempo_por_etapa', linea: 'promedio simple entre etapas' },
  ]);
  const tbl = (rows, titulo) => rows && rows.length
    ? '<div class="card overx" style="margin:0"><div class="chart-h"><div class="t">' + titulo + '</div></div><table class="dh-tbl"><thead><tr>' + Object.keys(rows[0]).slice(0, 6).map(k => '<th>' + OS_E(k) + '</th>').join('') + '</tr></thead><tbody>'
      + rows.slice(0, 12).map(r => '<tr>' + Object.keys(rows[0]).slice(0, 6).map(k => '<td>' + OS_E(String(r[k] == null ? '—' : r[k])) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'
    : '<div class="card" style="margin:0"><div class="empty" style="padding:14px">' + dhPend('vista sin datos') + '</div></div>';
  const decs = [];
  if ((s.en_riesgo || 0) > 0) decs.push({ t: 'Rescatar ' + s.en_riesgo + ' estudiantes en riesgo', d: 'Sesión de seguimiento antes de que se conviertan en churn.', imp: null, dueno: 'Coaches' });
  if ((s.inactivos_30d || 0) > 0) decs.push({ t: 'Reactivar ' + s.inactivos_30d + ' inactivos 30d', d: 'Sin actividad en 30 días — campaña de reactivación.', imp: null, dueno: 'Coordinación' });
  if ((s.churn_rate_30d || 0) > 0.05) decs.push({ t: 'Frenar el churn', d: 'Churn 30d ' + dhP(s.churn_rate_30d) + ' — revisar motivos de deserción (edu_ceo_motivos_desercion).', imp: null, dueno: 'CEO Educación' });
  return '<div class="dh-banner">🧾 Esta empresa <b>no tiene libros en QBO</b> — contabilidad pendiente de conectar. Acá NO se inventa EBITDA: solo métricas operativas con fuente.</div>'
    + big
    + dhSecTitle('2', 'Tendencia', '(vista edu_ceo_tendencia_6m del módulo Educación — 6 meses)') + tbl(D.tend6 || [], 'Tendencia 6m — edu_ceo_tendencia_6m')
    + dhSecTitle('3', 'Unit economics · cartera por etapa') + tbl(D.etapas, 'Cartera de créditos por etapa' + ' ')
    + dhSecTitle('4', 'Riesgos') + dhRiesgosHtml(D.riesgos, 'educacion')
    + dhSecTitle('5', 'Decisiones sugeridas') + dhDecHtml(decs);
}

// ════════ HOLDING ════════
async function dhLoadHO() {
  if (DH.d.ho) return;
  const [pnl, qb, ct, ops] = await Promise.all([
    sb.from('v_holding_pnl').select('*').then(r => r.data || []).catch(() => []),
    sb.from('qb_report_cache').select('empresa,report,label,value,fetched_at').eq('active', true).eq('report', 'balance').then(r => r.data || []).catch(() => []),
    sb.from('ct_findings').select('impacto_usd,severidad,empresa,titulo').eq('active', true).neq('estado', 'resuelto').then(r => r.data || []).catch(() => []),
    sb.from('sabueso_findings').select('id,severidad').eq('active', true).neq('estado', 'resuelto').then(r => r.data || []).catch(() => []),
  ]);
  if (!DH.d.ff) await dhLoadFF();
  DH.d.ho = { pnl, qb, ct, ops };
}
function dhViewHO() {
  const D = DH.d.ho; if (!D) { dhLoadHO().then(osRender); return '<div class="empty">⏳ Consolidando el holding…</div>'; }
  const ff = DH.d.ff, port = ff && ff.port;
  const qbv = (emp, lab) => { const r = D.qb.find(x => x.empresa === emp && String(x.label).toLowerCase() === lab.toLowerCase()); return r ? +r.value : null; };
  const liab = qbv('fix_flip', 'Total Liabilities'), eq = qbv('fix_flip', 'Total Equity');
  const de = (liab != null && eq) ? liab / eq : null;
  const cash = ['fix_flip', 'remodelacion', 'rentas', 'educacion'].map(e => ({ e, v: qbv(e, 'Total Bank Accounts') }));
  const cashT = cash.reduce((s, c) => s + (c.v || 0), 0);
  const cons = D.pnl.find(x => x.empresa === 'consolidado') || {};
  const anomM = D.ct.reduce((s, f) => s + (+f.impacto_usd || 0), 0);
  const fetched = (D.qb[0] || {}).fetched_at;
  const big = dhBig([
    { lab: 'EBITDA consolidado', glos: 'ebitda', v: cons.ebitda != null ? +cons.ebitda : null, txt: dhM(cons.ebitda), meta: 'hold_ebitda', fuente: 'v_holding_pnl (FF realizado/inyectado aparte)', linea: 'FF realizado ' + dhM(cons.realizado) + ' · inyectado ' + dhM(cons.inyectado), cls: +cons.ebitda >= 0 ? 'up' : 'down' },
    { lab: 'Cash por empresa', v: cashT || null, txt: dhM(cashT), meta: null, fuente: 'QBO balance (' + String(fetched || '').slice(0, 10) + ')', linea: cash.map(c => c.e.slice(0, 4) + ' ' + (c.v != null ? dhM(c.v) : dhPend('sin libros'))).join(' · ') + ' · runway: ' + dhPend('requiere burn mensual QBO — pendiente'), cls: 'up' },
    { lab: 'Deuda total · D/E', glos: 'd_e', v: de, txt: dhX(de), meta: 'hold_de_max', fuente: 'QBO fix_flip: pasivos ÷ equity', linea: 'pasivos ' + dhM(liab) + ' · equity contable ' + dhM(eq), cls: de != null && de > 8 ? 'down' : '' },
    { lab: 'Equity del portafolio (papel)', v: port ? port.equityHoy : null, txt: port ? dhM(port.equityHoy) : '—', meta: null, fuente: 'Σ papel − Σ deuda (inv_indicadores_data)', linea: 'con banner papel — no realizado', cls: 'up' },
    { lab: 'Anomalías abiertas', v: D.ct.length + D.ops.length, txt: dhN(D.ct.length + D.ops.length), meta: null, fuente: 'ct_findings + sabueso_findings', linea: dhM(anomM) + ' de impacto contable sin resolver', cls: (D.ct.length + D.ops.length) > 0 ? 'down' : 'up' },
  ]);
  const filaEmp = (nombre, ruta, pnlKey, extra) => {
    const r = D.pnl.find(x => x.empresa === pnlKey) || {};
    const ok = +r.ebitda >= 0;
    return '<tr style="cursor:pointer" onclick="osNav(\'' + ruta + '\')"><td><b>' + nombre + '</b></td>'
      + '<td class="dh-num">' + dhM(r.ingreso) + '</td><td class="dh-num">' + dhM(r.utilidad_bruta) + '</td>'
      + '<td class="dh-num ' + (ok ? 'up' : 'down') + '">' + (r.ebitda != null ? dhM(r.ebitda) : dhPend(pnlKey === 'educacion' ? 'sin libros QBO' : 'sin dato')) + '</td>'
      + '<td>' + (extra || '') + '</td>'
      + '<td><span class="dh-sem ' + (r.ebitda == null ? 'pend' : ok ? 'ok' : 'bad') + '" style="position:static;display:inline-block"></span> <span class="meta" style="font-size:10px">entrar →</span></td></tr>';
  };
  const tabla = '<div class="card overx" style="margin:0"><table class="dh-tbl"><thead><tr><th>Empresa</th><th class="dh-num">Ingreso</th><th class="dh-num">Utilidad bruta</th><th class="dh-num">EBITDA</th><th>Nota</th><th>Estado</th></tr></thead><tbody>'
    + filaEmp('🏚 Fix & Flip', '/fix-and-flip/dashboard', 'fix_flip', 'TIR papel ' + (port ? dhP(port.xirrAllIn) : '—') + ' · déficit ' + dhM(ff && ff.deficit))
    + filaEmp('🔨 Remodelación', '/remodelacion/dashboard', 'remodelacion', 'v_holding_pnl usa la fórmula VIEJA — el dashboard usa la limpia (declarado)')
    + filaEmp('🏠 Rentas', '/rentas/dashboard', 'rentas', 'vencido neto ' + (DH.d.re && DH.d.re.kpi ? dhM(DH.d.re.kpi.vencido_neto) : '—'))
    + filaEmp('🎓 Educación', '/educacion/dashboard', 'educacion', 'contabilidad pendiente de conectar')
    + '</tbody></table></div>';
  const decs = [
    { t: 'Bajar el apalancamiento (D/E ' + dhX(de) + ')', d: 'Semáforo rojo sobre ' + (dhMeta('hold_de_max') ? dhMeta('hold_de_max').meta + '×' : '8×') + ': cada refi con cash-out o venta baja pasivos y libera equity.', imp: liab, dueno: 'CEO + Juan' },
    { t: 'Completar deuda de las 7 casas', d: 'El equity papel del holding está sobreestimado hasta cargar los term sheets (checklist con deep-links en /inversionistas).', imp: null, accion: "osNav('/inversionistas')", accionLbl: 'Abrir checklist' },
    { t: 'Resolver anomalías de mayor impacto', d: (D.ct[0] ? 'Mayor: ' + (D.ct.slice().sort((a, b) => (+b.impacto_usd || 0) - (+a.impacto_usd || 0))[0].titulo || '') : 'Ver Sabueso Contable') + '.', imp: anomM, accion: "osNav('/contable')", accionLbl: 'Abrir Sabueso' },
  ];
  setTimeout(() => {
    const emps = ['fix_flip', 'remodelacion', 'rentas'];
    dhDrawChart('dh-ho-t', { type: 'bar', data: { labels: emps, datasets: [{ label: 'EBITDA (v_holding_pnl)', data: emps.map(e => { const r = D.pnl.find(x => x.empresa === e) || {}; return r.ebitda != null ? Math.round(+r.ebitda) : null; }), backgroundColor: ['rgba(240,104,122,.6)', 'rgba(72,214,156,.6)', 'rgba(79,141,255,.6)'] }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 9 } } } } } });
  }, 80);
  return DH_BANNER_PAPEL + big
    + dhSecTitle('2', 'Tendencia', '(EBITDA por empresa — QBO espejo sin snapshots mensuales: serie pendiente de dato, declarado)') + dhChartBox('dh-ho-t', 220)
    + dhSecTitle('3', 'Una fila por empresa (clic = entrar a su dashboard)') + tabla
    + dhSecTitle('4', 'Riesgos (cross-empresa)') + dhRiesgosHtml({ ct: D.ct.slice().sort((a, b) => (+b.impacto_usd || 0) - (+a.impacto_usd || 0)).slice(0, 6), ops: D.ops.slice(0, 4) }, 'holding')
    + dhSecTitle('5', 'Decisiones del holding') + dhDecHtml(decs);
}

// ─── vista raíz ───
function osDashView() {
  dhCSS();
  const emp = OS.route.dashEmp || 'holding';
  const meta = DH_EMP[emp] || DH_EMP.holding;
  if (!DH.metas) { dhBase().then(osRender); return '<div class="empty">⏳</div>'; }
  DH.charts.forEach(c => { try { c.destroy(); } catch (e) {} }); DH.charts = [];
  let body = '';
  try {
    body = emp === 'fix-and-flip' ? dhViewFF() : emp === 'remodelacion' ? dhViewRM() : emp === 'rentas' ? dhViewRE() : emp === 'educacion' ? dhViewED() : dhViewHO();
  } catch (e) { body = (window.kitError ? kitError(e.message, 'DH.d={};osRender()') : '<div class="empty down">' + OS_E(e.message) + '</div>'); }
  return '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h1>' + meta.icon + ' Dashboard Ejecutivo <span>· ' + meta.nombre + '</span></h1>'
    + '<span class="meta">corte ' + dhHoy() + ' · metas editables en dash_metas · cada cifra declara fuente · ⓘ = qué es</span>'
    + (emp !== 'holding' ? '<button class="ibtn" style="margin-left:auto" onclick="osNav(\'/holding\')">🏛 Holding</button>' : '') + '</div>'
    + '<div style="margin-top:10px">' + body + '</div>';
}
window.osDashView = osDashView;
