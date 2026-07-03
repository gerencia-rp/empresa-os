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
  #rc-overlay .pullbtn{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#04121a;font-weight:750;padding:8px 15px;border-radius:20px;cursor:pointer;font-size:11.5px}#rc-overlay .pullbtn:hover{filter:brightness(1.08)}#rc-overlay .pullbtn:disabled{opacity:.6;cursor:wait}`;
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
    const [p, a, l, names, crews] = await Promise.all([
      sb.from('remodel_at_properties').select('*').order('proceso').order('avance_pct', { ascending: true }),
      sb.from('remodel_alerts').select('*').is('resolved_at', null).order('severity').then(r => r).catch(() => ({ data: [] })),
      sb.from('remodel_sync_log').select('*').order('synced_at', { ascending: false }).limit(1).then(r => r).catch(() => ({ data: [] })),
      sb.from('airtable_record_names').select('record_id, name').then(r => r.data || []).catch(() => []),
      sb.from('remodel_crew_rates').select('airtable_id, nombre').then(r => r.data || []).catch(() => [])
    ]);
    RC.names = {}; (names || []).forEach(n => { RC.names[n.record_id] = n.name; });
    (crews || []).forEach(c => { if (c.airtable_id && c.nombre) RC.names[c.airtable_id] = c.nombre; });
    RC.obras = (p.data || []).map(o => ({ ...o, lider: rcResolveName(o.lider) }));
    RC.alerts = a.data || [];
    RC.syncLog = (l.data && l.data[0]) || null;
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
  const sobrePresup = presup > 0 && gasto > presup * 1.1;
  return { fin, enCurso: !fin && !sinDatos, sinDatos, sobrePresup, confiable: fin && gasto > 0, gasto, presup, mat, lab };
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
  const matHist = fin.reduce((s, o) => s + (+o.gasto_materiales || 0), 0);
  const labHist = fin.reduce((s, o) => s + (+o.gasto_trabajadores || 0), 0);
  const matPctHist = (matHist + labHist) > 0 ? Math.round(matHist / (matHist + labHist) * 100) : 0;
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
    if (!lidMap[k]) lidMap[k] = { lider: k, n: 0, ganancia: 0, revenue: 0, avance: 0, sobre: 0 };
    lidMap[k].n++; lidMap[k].ganancia += (+o.ganancia || 0); lidMap[k].revenue += (+o.valor_cliente || 0);
    if (o.dq.sobrePresup) lidMap[k].sobre++;
  });
  const lideres = Object.values(lidMap).map(l => ({ ...l, margen: l.revenue > 0 ? Math.round(l.ganancia / l.revenue * 100) : 0 }))
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
  const evr = fin.filter(o => (+o.presupuesto_interno || 0) > 0 && ((+o.monto_real || o.dq.gasto) > 0)).map(o => {
    const est = +o.presupuesto_interno || 0, real = +o.monto_real || o.dq.gasto;
    return { address: rcShort(o.address), lider: (o.lider || '—'), est, real, devAbs: real - est, devPct: Math.round((real - est) / est * 100), devDias: o.retraso_dias != null ? +o.retraso_dias : null, rent: o.rentabilidad != null ? +o.rentabilidad : null };
  });
  const evrTot = { est: evr.reduce((s, x) => s + x.est, 0), real: evr.reduce((s, x) => s + x.real, 0) };
  evrTot.devAbs = evrTot.real - evrTot.est; evrTot.devPct = evrTot.est > 0 ? Math.round(evrTot.devAbs / evrTot.est * 100) : 0;
  const topDesv = [...evr].sort((a, b) => Math.abs(b.devPct) - Math.abs(a.devPct)).slice(0, 8);
  const desvCostoProm = evr.length ? Math.round(evr.reduce((s, x) => s + x.devPct, 0) / evr.length) : 0;
  const _dias = fin.map(o => o.retraso_dias).filter(d => d != null).map(Number);
  const desvDiasProm = _dias.length ? Math.round(_dias.reduce((s, x) => s + x, 0) / _dias.length) : 0;
  const _rent = fin.map(o => o.rentabilidad).filter(r => r != null).map(Number);
  const rentProm = _rent.length ? +(_rent.reduce((s, x) => s + x, 0) / _rent.length).toFixed(1) : 0;
  const _conDias = fin.filter(o => o.retraso_dias != null);
  const aTiempoPct = _conDias.length ? Math.round(_conDias.filter(o => +o.retraso_dias <= 0).length / _conDias.length * 100) : 0;
  const enPresupPct = evr.length ? Math.round(evr.filter(x => x.devPct <= 0).length / evr.length * 100) : 0;
  const gastoTipo = { material: matHist, labor: labHist, total: matHist + labHist };
  return { obras, fin, activas, pipeline, gananciaHist, revenueHist, margenHist, matPctHist, capitalActivo, presupActivo, avgAvance, pipelineProj, lideres, compAlerts, evr, evrTot, topDesv, desvCostoProm, desvDiasProm, rentProm, aTiempoPct, enPresupPct, gastoTipo, sinDatosN: obras.filter(o => o.dq.sinDatos).length, sobreN: obras.filter(o => o.dq.sobrePresup).length };
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
  ['cerebro', '✦', 'Cerebro de obra'],
];
function rcRender() {
  const ov = document.getElementById('rc-overlay'); if (!ov) return;
  if (typeof posApplyTheme === 'function') posApplyTheme(ov);
  const c = rcCompute();
  const side = ov.querySelector('.side'), main = ov.querySelector('.main');
  if (side) side.innerHTML = rcSidebar(c);
  const sec = { command: rcSecCommand, evr: rcSecEvR, obras: rcSecObras, lideres: rcSecLideres, cerebro: rcSecCerebro }[RC.section] || rcSecCommand;
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
  const ins = rcInsights(c);
  return rcHeader('Command Center', `${c.obras.length} obras · ${c.fin.length} finalizadas · ${c.activas.length} en curso — capital, ganancia realizada y pipeline.`) + `
    <div class="grid kpis">
      <div class="card kpi"><div class="lab">Ganancia realizada</div><div class="big up glow">${RC_K(c.gananciaHist)}</div><div class="meta">${c.fin.length} obras finalizadas · margen ${c.margenHist}%</div></div>
      <div class="card kpi"><div class="lab">Obras en curso</div><div class="big">${c.activas.length}</div><div class="meta">avance promedio ${c.avgAvance}%</div></div>
      <div class="card kpi"><div class="lab">Capital desplegado</div><div class="big">${RC_K(c.capitalActivo)}</div><div class="meta">en obras activas · presup. ${RC_K(c.presupActivo)}</div></div>
      <div class="card kpi"><div class="lab">Pipeline <span class="warn">proyectado</span></div><div class="big warn">${RC_K(c.pipelineProj)}</div><div class="meta">NO realizado · ${c.pipeline.length} en pre-construcción</div></div>
    </div>
    <div class="grid kpis" style="margin-top:14px">
      <div class="card kpi"><div class="lab">Rentabilidad prom</div><div class="big ${c.rentProm>=0?'up':'down'}">${c.rentProm}%</div><div class="meta">histórico (${c.fin.length} finalizadas)</div></div>
      <div class="card kpi"><div class="lab">Desviación de costo prom</div><div class="big ${c.desvCostoProm>0?'down':'up'}">${c.desvCostoProm>0?'+':''}${c.desvCostoProm}%</div><div class="meta">real vs presupuesto · ${c.enPresupPct}% en presup.</div></div>
      <div class="card kpi"><div class="lab">Desviación de días prom</div><div class="big ${c.desvDiasProm>0?'down':'up'}">${c.desvDiasProm>0?'+':''}${c.desvDiasProm}d</div><div class="meta">${c.aTiempoPct}% a tiempo</div></div>
      <div class="card kpi"><div class="lab">Alertas</div><div class="big ${c.compAlerts.length?'down':'up'}">${c.compAlerts.length}</div><div class="meta">sobre-presupuesto / atraso</div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Alertas críticas</div><div class="k">${c.compAlerts.length} activas</div></div>
        ${c.compAlerts.length ? c.compAlerts.slice(0, 8).map(a => `<div class="alertrow"><div class="adot ${a.sev}"></div><div><div style="font-size:12px;line-height:1.5"><b>${RC_E(a.obra)}</b> — ${a.t}</div></div></div>`).join('') : '<div class="meta" style="padding:14px 0">Sin alertas de sobre-presupuesto ni atraso. ✓</div>'}</div>
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro de obra</b><span>INSIGHTS DEL HISTÓRICO</span></div></div>
        ${ins.map(i => `<div class="insight"><div class="ic ${i.s === 'r' ? 'r' : i.s === 'y' ? 'y' : i.s === 'g' ? 'g' : 'b'}">●</div><div class="tx">${i.t}</div></div>`).join('')}
        <div style="margin-top:12px"><span class="chip" onclick="rcGo('cerebro')">Abrir chat de obra →</span></div></div>
    </div>`;
}

function rcObraCard(o) {
  const dq = o.dq, av = Math.round(+o.avance_pct || 0);
  const badge = dq.sinDatos ? '<span class="ff-dq ff-dq-nd">sin datos</span>' : dq.sobrePresup ? '<span class="ff-dq ff-dq-rev">⚠ sobre presupuesto</span>' : (!dq.fin ? '<span class="ff-dq ff-dq-pre">en curso · proyectado</span>' : '');
  const util = dq.fin ? (+o.ganancia || 0) : ((+o.valor_cliente || 0) - dq.gasto);
  const slug = window.osSlug ? osSlug(o.address) : '';
  return `<div class="kcard">
    <div class="addr">${RC_E(rcShort(o.address))} ${badge}</div>
    <div class="meta">${RC_E(o.lider || '—')} · ${RC_E(o.proceso || 's/estado')}${o.sqft ? ' · ' + o.sqft + ' sqft' : ''}</div>
    <div class="krow"><span>Gasto real</span><b>${RC_M(dq.gasto)}</b></div>
    <div class="krow"><span>Valor cliente</span><b>${RC_M(+o.valor_cliente || 0)}</b></div>
    <div class="krow"><span>${dq.fin ? 'Utilidad' : 'Utilidad (proy.)'}</span><b class="${util >= 0 ? 'up' : 'down'}">${RC_M(util)}</b></div>
    <div class="kbar"><i style="width:${Math.min(100, av)}%"></i></div>
    <div class="kficha" onclick="event.stopPropagation();osOpenFicha('${slug}')">🏠 Ver ficha de casa →</div>
  </div>`;
}
function rcSecObras(c) {
  const order = { 'En construcción': 0, 'Pre construcción': 1, 'Finalizado': 2 };
  const cols = [['En curso', c.activas.filter(o => o.proceso === 'En construcción')], ['Pipeline', c.pipeline], ['Finalizadas', c.fin]];
  return rcHeader('Obras', 'Cada obra con su gasto real, utilidad y ficha de casa. Las en curso van marcadas como proyectadas.') + `
    <div class="kan">${cols.map(([t, list]) => `<div class="kcol"><div class="kcol-h">${t}<span class="cnt">${list.length}</span></div>${list.length ? list.map(rcObraCard).join('') : '<div class="meta" style="padding:14px 4px">—</div>'}</div>`).join('')}</div>`;
}

function rcSecLideres(c) {
  const maxG = Math.max(1, ...c.lideres.map(l => l.ganancia));
  return rcHeader('Performance por líder', 'Ranking por ganancia realizada (obras finalizadas). El margen objetivo es 20%.') + `
    <div class="card"><table class="ptable"><thead><tr><th>Líder</th><th>Obras</th><th>Ganancia</th><th>Margen</th><th>Sobre presup.</th><th style="width:22%"></th></tr></thead><tbody>
    ${c.lideres.length ? c.lideres.map(l => `<tr><td><b>${RC_E(l.lider)}</b></td><td>${l.n}</td><td class="${l.ganancia >= 0 ? 'up' : 'down'}">${RC_M(l.ganancia)}</td><td class="${l.margen >= 20 ? 'up' : l.margen >= 10 ? 'warn' : 'down'}">${l.margen}%</td><td>${l.sobre ? `<span class="warn">${l.sobre}</span>` : '0'}</td><td><div class="lidbar"><i style="width:${Math.round(Math.max(0, l.ganancia) / maxG * 100)}%"></i></div></td></tr>`).join('') : '<tr><td colspan="6" class="meta" style="padding:20px">Sin obras finalizadas todavía.</td></tr>'}
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
      <div class="card kpi"><div class="lab">Monto real</div><div class="big">${RC_K(c.evrTot.real)}</div><div class="meta">gastado real</div></div>
      <div class="card kpi"><div class="lab">Desviación $</div><div class="big ${c.evrTot.devAbs > 0 ? 'down' : 'up'}">${c.evrTot.devAbs > 0 ? '+' : ''}${RC_K(c.evrTot.devAbs)}</div><div class="meta">real − estimado</div></div>
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
