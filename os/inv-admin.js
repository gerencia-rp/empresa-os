// ════════════════════════════════════════════════════════════════
// 💎 INVERSIONISTAS · ADMIN (ruta /inversionistas del OS, solo área fix-flip).
// Gestiona el portal: accesos (invitación magic link), holdings (casa+inversión+%),
// parámetros del modelo por casa (con fuente), movimientos reales y preview del motor.
// Todo soft-delete; escrituras protegidas por RLS (has_area fix-flip).
// ════════════════════════════════════════════════════════════════

const IA = { loaded: false, loading: false, err: null, access: [], holdings: [], investors: [], deals: [], params: [], cashflow: [], casa: null, tab: 'accesos', sim: {} };
window.IA = IA;

function iaMoney(v) { return '$' + Math.round(+v || 0).toLocaleString('en-US'); }
// label chico arriba de un control (solo presentación — no toca ids ni handlers)
function iaLbl(txt, inner) { return '<div><div style="font-size:11px;color:var(--mut2);font-weight:600;margin-bottom:3px">' + txt + '</div>' + inner + '</div>'; }

async function iaLoad(force) {
  if (IA.loading || (IA.loaded && !force)) return;
  IA.loading = true; IA.err = null;
  try {
    const [acc, hold, inv, deals] = await Promise.all([
      sb.from('inv_access').select('*').eq('active', true),
      sb.from('inv_holdings').select('*').eq('active', true),
      sb.from('ff_investors').select('airtable_id,name,email,label,capital_aportado').eq('active', true),
      sb.from('ff_deals').select('airtable_id,address,address_norm,property_id,stage,capital_inversionista,investor_rec_ids').eq('active', true),
    ]);
    IA.access = acc.data || []; IA.holdings = hold.data || []; IA.investors = inv.data || []; IA.deals = deals.data || [];
    IA.casa = IA.casa || (IA.holdings[0] && IA.holdings[0].property_id) || null;
    if (IA.casa) await iaLoadCasa(IA.casa);
    IA.loaded = true;
  } catch (e) { IA.err = e.message || String(e); }
  IA.loading = false;
  osRender();
}
window.iaLoad = iaLoad;
async function iaLoadCasa(pid) {
  const [prm, cf] = await Promise.all([
    sb.from('inv_model_params').select('*').eq('property_id', pid).eq('active', true).order('key'),
    sb.from('inv_cashflow_real').select('*').eq('property_id', pid).eq('active', true).order('fecha', { ascending: false }).limit(200),
  ]);
  IA.params = prm.data || []; IA.cashflow = cf.data || [];
}
async function iaSetCasa(pid) { IA.casa = pid; await iaLoadCasa(pid); osRender(); }
window.iaSetCasa = iaSetCasa;

function iaInvName(id) { const x = IA.investors.find(i => i.airtable_id === id); return x ? x.name : id; }
function iaCasaName(pid) { const d = IA.deals.find(x => x.property_id === pid); return d ? (d.address || '').split(',')[0] : (pid || '').slice(0, 8); }

// ─── acciones ───
async function iaCrearAcceso() {
  const invId = document.getElementById('ia-acc-inv').value;
  const email = (document.getElementById('ia-acc-email').value || '').trim().toLowerCase();
  if (!invId || !email) return alert('Elegí inversionista y email');
  const { error } = await sb.from('inv_access').insert({ investor_airtable_id: invId, email, estado: 'invitado' });
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Acceso creado. Mandale el link con "✉️ Invitar".', 'success');
  await iaLoad(true);
}
window.iaCrearAcceso = iaCrearAcceso;
async function iaEnviarLink(email) {
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + '/inversionista', shouldCreateUser: true } });
  if (error) return alert('Error enviando el link: ' + error.message);
  if (window.toast) toast('✉️ Link de acceso enviado a ' + email, 'success');
}
window.iaEnviarLink = iaEnviarLink;
async function iaRevocar(id, on) {
  const { error } = await sb.from('inv_access').update({ estado: on ? 'invitado' : 'revocado' }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await iaLoad(true);
}
window.iaRevocar = iaRevocar;
async function iaVincular() {
  const invId = document.getElementById('ia-h-inv').value;
  const pid = document.getElementById('ia-h-casa').value;
  const monto = parseFloat(document.getElementById('ia-h-monto').value) || 0;
  const pct = (parseFloat(document.getElementById('ia-h-pct').value) || 50) / 100;
  if (!invId || !pid) return alert('Elegí inversionista y casa');
  const { error } = await sb.from('inv_holdings').upsert({ investor_airtable_id: invId, property_id: pid, inversion_aportada: monto, reparto_pct: pct, active: true, archived_at: null }, { onConflict: 'investor_airtable_id,property_id' });
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Vinculado ' + iaInvName(invId) + ' → ' + iaCasaName(pid), 'success');
  await iaLoad(true);
}
window.iaVincular = iaVincular;
async function iaSoftDeleteHolding(id) {
  if (!confirm('¿Desvincular? (soft-delete, reversible)')) return;
  const { error } = await sb.from('inv_holdings').update({ active: false, archived_at: new Date().toISOString() }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await iaLoad(true);
}
window.iaSoftDeleteHolding = iaSoftDeleteHolding;
async function iaSaveParam(key) {
  const el = document.getElementById('ia-p-' + key); if (!el) return;
  const { error } = await sb.from('inv_model_params').update({ value: el.value, updated_at: new Date().toISOString() }).eq('property_id', IA.casa).eq('key', key);
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ ' + key + ' actualizado', 'success');
  await iaLoadCasa(IA.casa); osRender();
}
window.iaSaveParam = iaSaveParam;
// ➕ parámetro NUEVO (para que todo "sin dato" del portal sea cargable desde acá)
async function iaAddParam() {
  const g = id => ((document.getElementById(id) || {}).value || '').trim();
  const key = g('ia-np-key').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const value = g('ia-np-val');
  if (!key || !value) return alert('Key y valor son obligatorios');
  const row = { property_id: IA.casa, key, value, fuente: g('ia-np-fuente') || 'manual', descripcion: g('ia-np-desc') || null };
  const { error } = await sb.from('inv_model_params').upsert(row, { onConflict: 'property_id,key' });
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Parámetro ' + key + ' guardado', 'success');
  await iaLoadCasa(IA.casa); osRender();
}
window.iaAddParam = iaAddParam;
// ── Movimientos v2 (ajustes Juan 15-jul) ──
// P&L derivado de la categoría (NO se elige a mano): ingreso/operativo/tax entran al Estado
// de Resultados (afectan utilidad); inversión/financiero son capital/financiamiento.
const IA_PNL_SI = ['ingreso', 'operativo', 'tax'];
function iaPnl(cat) { return IA_PNL_SI.includes(String(cat || '').toLowerCase()); }
const IA_PNL_TIP = 'P&L = ¿entra al Estado de Resultados (afecta la utilidad)? SÍ: ingreso, operativo, tax. NO: inversión y financiero (son capital/financiamiento, no ganancia).';
const IA_CAT_GUIA = [
  ['ingreso', '💵 Ingreso', 'renta recibida, otros ingresos'],
  ['operativo', '🧾 Operativo', 'utilities, mantenimiento, property mgmt, HOA, seguro, limpieza'],
  ['inversion', '🏗 Inversión', 'compra de propiedad, CapEx mayor, venta de propiedad'],
  ['financiero', '🏦 Financiero', 'DRAW del HML (no es ingreso), aporte de capital, cash-out del refi, intereses/principal HML-refi, distribuciones'],
  ['tax', '🏛 Tax', 'impuesto predial, impuesto de renta'],
];
// sugerencia automática de categoría según la descripción (editable siempre)
function iaSugerirCat(txt) {
  const t = String(txt || '').toLowerCase();
  if (/draw|hml|inter[eé]s|refi|cash.?out|aporte|distribu|principal|pr[eé]stamo|harmony/.test(t)) return 'financiero';
  if (/predial|impuesto|tax/.test(t)) return 'tax';
  if (/compra|capex|venta de|remodelaci[oó]n/.test(t)) return 'inversion';
  if (/renta|rent\b|dep[oó]sito de renta/.test(t)) return 'ingreso';
  if (/util|electric|agua|water|luz|gas|internet|hoa|seguro|insurance|manten|limpieza|clean|property m|pm\b/.test(t)) return 'operativo';
  return null;
}
function iaMovSugerir() {
  const conc = (document.getElementById('ia-m-conc') || {}).value || '';
  const sug = iaSugerirCat(conc);
  const sel = document.getElementById('ia-m-cat');
  if (sug && sel && !sel.dataset.tocado) { sel.value = sug; iaMovPnlPreview(); }
}
window.iaMovSugerir = iaMovSugerir;
function iaMovPnlPreview() {
  const sel = document.getElementById('ia-m-cat'); const out = document.getElementById('ia-m-pnl');
  if (sel && out) out.innerHTML = iaPnlBadge(sel.value);
}
window.iaMovPnlPreview = iaMovPnlPreview;
function iaPnlBadge(cat) {
  const si = iaPnl(cat);
  return '<span class="badge ' + (si ? 'b-ok' : 'b-warn') + '" title="' + IA_PNL_TIP + '" style="cursor:help">P&L ' + (si ? 'SÍ' : 'NO') + '</span>';
}
window.iaPnlBadge = iaPnlBadge;
function iaCatSel(id, cur) {
  return '<select id="' + id + '" class="osa-in" style="padding:6px" onchange="this.dataset.tocado=1;iaMovPnlPreview()">'
    + IA_CAT_GUIA.map(c => '<option value="' + c[0] + '"' + (cur === c[0] ? ' selected' : '') + ' title="' + c[2] + '">' + c[1] + '</option>').join('') + '</select>';
}
function iaGuiaCat() {
  return '<div id="ia-guia-cat" style="display:none;background:var(--glass);border:1px solid var(--glassb);border-radius:9px;padding:10px 12px;margin:8px 0;font-size:11.5px;line-height:1.7">'
    + '<b>Guía de clasificación de flujos</b> · ' + IA_PNL_TIP + '<br>'
    + IA_CAT_GUIA.map(c => c[1] + ' → ' + c[2]).join('<br>')
    + '</div>';
}
async function iaAddMov() {
  const g = id => (document.getElementById(id) || {}).value || '';
  const cat = g('ia-m-cat') || 'operativo';
  const row = { property_id: IA.casa, fecha: g('ia-m-fecha'), linea: iaPnl(cat) ? 'P&L' : 'Capital', tipo: cat === 'ingreso' ? 'ingreso' : 'gasto', categoria: cat, item: g('ia-m-item'), concepto: g('ia-m-conc'), valor: parseFloat(g('ia-m-valor')) || 0, factura_url: g('ia-m-fact') || null, fuente: 'manual' };
  if (!row.fecha || !row.valor) return alert('Fecha y valor son obligatorios');
  const { error } = await sb.from('inv_cashflow_real').insert(row);
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Movimiento cargado (queda en el audit)', 'success');
  delete IA.ledgerCache[IA.casa];
  await iaLoadCasa(IA.casa); osRender();
}
window.iaAddMov = iaAddMov;
async function iaDelMov(id) {
  if (!confirm('¿Quitar este movimiento? (soft-delete, queda en el audit)')) return;
  const { error } = await sb.from('inv_cashflow_real').update({ active: false, archived_at: new Date().toISOString() }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  delete IA.ledgerCache[IA.casa];
  await iaLoadCasa(IA.casa); osRender();
}
window.iaDelMov = iaDelMov;
function iaEditMov(id) { IA.movEdit = id; osRender(); }
window.iaEditMov = iaEditMov;
async function iaSaveMov(id) {
  const g = k => (document.getElementById('ia-me-' + k) || {}).value || '';
  const cat = g('cat') || 'operativo';
  const upd = { fecha: g('fecha'), categoria: cat, tipo: cat === 'ingreso' ? 'ingreso' : 'gasto', linea: iaPnl(cat) ? 'P&L' : 'Capital', valor: parseFloat(g('valor')) || 0, concepto: g('conc'), factura_url: g('fact') || null };
  if (!upd.fecha || !upd.valor) return alert('Fecha y valor son obligatorios');
  const { error } = await sb.from('inv_cashflow_real').update(upd).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  IA.movEdit = null;
  if (window.toast) toast('✓ Movimiento editado (antes→después en el audit)', 'success');
  delete IA.ledgerCache[IA.casa];
  await iaLoadCasa(IA.casa); osRender();
}
window.iaSaveMov = iaSaveMov;
function iaToggleGuia() { const el = document.getElementById('ia-guia-cat'); if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
window.iaToggleGuia = iaToggleGuia;

// ─── vista ───
function iaEngineParamsFromRows(rows, holdingPct) {
  const P = {}; rows.forEach(r => P[r.key] = r);
  const g = (k, d) => { const r = P[k]; const v = r ? parseFloat(r.value) : NaN; return isNaN(v) ? d : v; };
  const draws = {}, otros = {};
  rows.forEach(r => { let m = r.key.match(/^draw_m(\d+)$/); if (m) draws[+m[1]] = parseFloat(r.value) || 0; m = r.key.match(/^otros_inv_m(\d+)$/); if (m) otros[+m[1]] = parseFloat(r.value) || 0; });
  return { compra: g('compra', 0), cierreCompra: g('cierre_compra', 0), hmInicial: g('hm_inicial', 0), hmTasa: g('hm_tasa', 0), draws, otrosInversionMes: otros,
    refiMes: g('refi_mes', null), refiMonto: g('refi_monto', 0), refiTasa: g('refi_tasa', 0), refiPlazoM: g('refi_plazo_m', 360), cierreRefi: g('cierre_refi', 0),
    arv: g('arv', 0), valorizacion: g('valorizacion', 0), inflacion: g('inflacion', 0), retornoEsperado: g('retorno_esperado', 0.08),
    numHab: g('num_hab', 1), arriendoHab: g('arriendo_hab', 0), rampa: P.rampa ? P.rampa.value.split(',').map(parseFloat) : [],
    ocupacionEstable: g('ocupacion_estable', 1), pisoServicios: g('piso_servicios', 0.1),
    mantenimientoMes: g('mantenimiento_mes', 0), serviciosMes: g('servicios_mes', 0), hoaMes: g('hoa_mes', 0),
    padsplitPct: g('padsplit_pct', 0), comisionPct: g('comision_pct', 0), impPropiedadPct: g('imp_propiedad_pct', 0), impRentaPct: g('imp_renta_pct', 0),
    seguroMes: g('seguro_mes', 0), cicloMeses: g('ciclo_meses', 12), anios: g('anios', 31),
    repartoInv: holdingPct != null ? holdingPct : g('reparto_inv', 0.5), cashAtrapadoReal: g('cash_atrapado_real', null),
    postRefiPerfil: P.postrefi_perfil ? P.postrefi_perfil.value : null,
    utilAnualPostRefi: g('util_anual_postrefi', null), anio0PostRefi: g('anio0_postrefi', null) };
}

// ─── F2: escenarios + simulador ───
function iaBaseParams() {
  const h = IA.holdings.find(x => x.property_id === IA.casa);
  return iaEngineParamsFromRows(IA.params, h ? +h.reparto_pct : null);
}
function iaEstOpts() {
  const P = {}; IA.params.forEach(r => P[r.key] = r);
  const g = k => { const r = P[k]; const v = r ? parseFloat(r.value) : NaN; return isNaN(v) ? null : v; };
  return { remodelTotal: g('est_remodel_total'), arv: g('est_arv'), cierrePct: g('est_cierre_pct') };
}
function iaFechaCierre() { const r = IA.params.find(x => x.key === 'fecha_cierre'); return r ? r.value : null; }
function iaRunEscenario(tipo) {
  const base = iaBaseParams();
  const p = invEngine.escenario(base, tipo, {
    est: iaEstOpts(),
    movsPorMes: tipo === 'realizado' ? invEngine.movsPorMes(IA.cashflow, iaFechaCierre()) : null,
    sim: IA.sim,
  });
  return { p, r: invEngine.run(p) };
}
function iaSimSet(k, v) { const n = parseFloat(v); if (isNaN(n)) delete IA.sim[k]; else IA.sim[k] = n; osRender(); }
window.iaSimSet = iaSimSet;
function iaSimReset() { IA.sim = {}; osRender(); }
window.iaSimReset = iaSimReset;
async function iaGuardarCache() {
  const tipos = ['estimado', 'proyectado', 'realizado', 'simulado'];
  for (const t of tipos) {
    const { r } = iaRunEscenario(t);
    const data = {
      indicadores: r.indicadores,
      anios: r.anios.map(a => ({ a: a.a, fclNegocio: Math.round(a.fclNegocio), valor: Math.round(a.valor), saldo: Math.round(a.saldo), patrimonioInv: Math.round(a.patrimonioInv), abono: Math.round(a.abono) })),
      sim: t === 'simulado' ? IA.sim : undefined,
    };
    const { error } = await sb.from('inv_projection').upsert({ property_id: IA.casa, escenario: t, data, params_hash: String(JSON.stringify(iaBaseParams()).length), computed_at: new Date().toISOString(), active: true, archived_at: null }, { onConflict: 'property_id,escenario' });
    if (error) return alert('Error guardando ' + t + ': ' + error.message);
  }
  if (window.toast) toast('💾 Proyección cacheada (4 escenarios) en inv_projection', 'success');
}
window.iaGuardarCache = iaGuardarCache;

function iaTabEscenarios() {
  const casas = [...new Set(IA.holdings.map(h => h.property_id))];
  const casaSel = '<select class="osa-in" onchange="iaSetCasa(this.value)">' + casas.map(c => '<option value="' + c + '" ' + (c === IA.casa ? 'selected' : '') + '>' + OS_E(iaCasaName(c)) + '</option>').join('') + '</select>';
  if (!IA.params.length) return '<div class="empty">Esta casa no tiene parámetros del modelo.</div>';
  const tipos = [['estimado', '📋 Estimado', 'underwriting original'], ['proyectado', '🎯 Proyectado', 'premisas confirmadas + supuestos'], ['realizado', '✅ Realizado', IA.cashflow.length + ' movimientos reales'], ['simulado', '🧪 Simulado', 'sensibilidad del simulador']];
  const runs = {}; tipos.forEach(t => { try { runs[t[0]] = iaRunEscenario(t[0]); } catch (e) { runs[t[0]] = null; } });
  const base = iaBaseParams();
  const fila = (lab, fn, fmt) => '<tr><td>' + lab + '</td>' + tipos.map(t => { const x = runs[t[0]]; return '<td style="text-align:right">' + (x ? (fmt || (v => v))(fn(x)) : '—') + '</td>'; }).join('') + '</tr>';
  const pct1 = v => v == null ? '—' : (v * 100).toFixed(1) + '%';
  const inv = base.repartoInv;
  const comp = '<div class="card overx" style="margin-bottom:14px"><div class="chart-h"><div class="t">Comparativa de escenarios · ' + OS_E(iaCasaName(IA.casa)) + '</div><div class="k">mismo motor, distintos inputs · reparto inversionista ' + Math.round(inv * 100) + '%</div></div>'
    + '<table class="ptable"><thead><tr><th>Indicador</th>' + tipos.map(t => '<th style="text-align:right" title="' + t[2] + '">' + t[1] + '</th>').join('') + '</tr></thead><tbody>'
    + fila('TIR 31 años (post-refi)', x => x.r.indicadores.tir31PostRefi, pct1)
    + fila('VPN 31 años · casa', x => x.r.indicadores.vpn31PostRefi, iaMoney)
    + fila('VPN 31 años · inversionista', x => x.r.indicadores.vpn31PostRefi * inv, iaMoney)
    + fila('CAP rate (valor)', x => x.r.indicadores.capValor, pct1)
    + fila('DSCR', x => x.r.indicadores.dscr, v => v.toFixed(2))
    + fila('Punto de equilibrio', x => x.r.indicadores.puntoEquilibrio, pct1)
    + fila('Cash del ciclo (FCL negativos)', x => -x.r.indicadores.cashInvertido, iaMoney)
    + fila('Utilidad año 2 (casa)', x => x.r.anios[2] ? x.r.anios[2].fclNegocio : null, iaMoney)
    + fila('Patrimonio inversionista año 10', x => x.r.anios[10] ? x.r.anios[10].patrimonioInv : null, iaMoney)
    + '</tbody></table>'
    + '<div class="meta" style="margin-top:8px">Realizado usa el SUMIF de los movimientos reales por mes (reemplazan la línea calculada); sin movimientos = proyectado. Estimado reconstruye el underwriting (remodelación ' + iaMoney(iaEstOpts().remodelTotal || 0) + ' estimada, originación ' + pct1(iaEstOpts().cierrePct) + ').</div></div>';

  const simDef = [['arv', 'ARV / avalúo', base.arv, ''], ['compra', 'Precio de compra', base.compra, ''], ['arriendoHab', 'Arriendo por habitación', base.arriendoHab, ''], ['ocupacionEstable', 'Ocupación estable (0-1)', base.ocupacionEstable, '×'], ['refiTasa', 'Tasa refi (0-1)', base.refiTasa, '×'], ['valorizacion', 'Valorización anual (0-1)', base.valorizacion, '×']];
  const simRun = runs.simulado, proyRun = runs.proyectado;
  const dTir = simRun && proyRun && simRun.r.indicadores.tir31PostRefi != null && proyRun.r.indicadores.tir31PostRefi != null ? (simRun.r.indicadores.tir31PostRefi - proyRun.r.indicadores.tir31PostRefi) : null;
  const dVpn = simRun && proyRun ? simRun.r.indicadores.vpn31PostRefi - proyRun.r.indicadores.vpn31PostRefi : null;
  const sim = '<div class="card"><div class="chart-h"><div class="t">🧪 Simulador — sensibilidad ARV / ocupación / compra / arriendo / tasa</div><div class="k"><button class="ct-btn" onclick="iaSimReset()">↺ Reset</button> <button class="ct-btn" onclick="iaGuardarCache()">💾 Guardar proyección (4 escenarios)</button></div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">'
    + simDef.map(([k, lab, cur, unit]) => '<div><div class="lab" style="margin-bottom:4px">' + lab + '</div><div style="display:flex;align-items:center;gap:5px"><input class="osa-in" style="flex:1;width:100%" type="number" step="any" value="' + (IA.sim[k] != null ? IA.sim[k] : (cur != null ? cur : '')) + '" onchange="iaSimSet(\'' + k + '\', this.value)">' + (unit ? '<span style="color:var(--mut2);font-size:11px;font-weight:700" title="fracción: 0.5 = 50%">' + unit + '</span>' : '') + '</div></div>').join('')
    + '</div>'
    + (dTir != null ? '<div class="meta" style="margin-top:12px;font-size:13px">Simulado vs Proyectado: <b class="' + (dTir >= 0 ? 'up' : 'down') + '">Δ TIR ' + (dTir >= 0 ? '+' : '') + (dTir * 100).toFixed(1) + ' pts</b> · <b class="' + (dVpn >= 0 ? 'up' : 'down') + '">Δ VPN ' + (dVpn >= 0 ? '+' : '') + iaMoney(dVpn) + '</b></div>' : '')
    + '</div>';
  return '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">' + casaSel + '</div>' + comp + sim;
}

// ─── F1 producto: distribuciones + mensajes (admin) ───
async function iaLoadProducto() {
  const [d, m, dl, pj, dc] = await Promise.all([
    sb.from('inv_distributions').select('*').eq('active', true).order('fecha', { ascending: false }),
    sb.from('inv_messages').select('*').eq('active', true).order('created_at', { ascending: false }).limit(100),
    sb.from('inv_deals').select('*').eq('active', true),
    sb.from('inv_projection').select('property_id,escenario,data,computed_at').eq('active', true).eq('escenario', 'proyectado'),
    sb.from('inv_documents').select('*').eq('active', true).order('created_at', { ascending: false }),
  ]);
  IA.dists = d.data || []; IA.msgs = m.data || []; IA.deals2 = dl.data || []; IA.proj = pj.data || []; IA.docsAll = dc.data || [];
}
// ─── 📄 documentos del inversionista (el portal los lista con buscador + audit) ───
async function iaAddDoc() {
  const g = id => ((document.getElementById(id) || {}).value || '').trim();
  const row = { property_id: g('ia-doc-casa'), investor_airtable_id: g('ia-doc-inv') || null, tipo: g('ia-doc-tipo') || 'otro', nombre: g('ia-doc-nombre'), url: g('ia-doc-url') };
  if (!row.property_id || !row.nombre || !row.url) return alert('Casa, nombre y URL son obligatorios');
  const { error } = await sb.from('inv_documents').insert(row);
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Documento cargado — ya lo ve el inversionista en su portal', 'success');
  await iaLoadProducto(); osRender();
}
window.iaAddDoc = iaAddDoc;
async function iaDelDoc(id) {
  const { error } = await sb.from('inv_documents').update({ active: false, archived_at: new Date().toISOString() }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await iaLoadProducto(); osRender();
}
window.iaDelDoc = iaDelDoc;
function iaTabDocs() {
  const invOpts = '<option value="">🏠 Todos los inversionistas de la casa</option>' + IA.investors.map(i => '<option value="' + i.airtable_id + '">' + OS_E(i.name || i.airtable_id) + '</option>').join('');
  const casaOpts = [...new Set(IA.holdings.map(h => h.property_id))].map(c => '<option value="' + c + '">' + OS_E(iaCasaName(c)) + '</option>').join('');
  const docs = IA.docsAll || [];
  return '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">➕ Subir documento al portal</div><div class="k">contrato · fiscal (K-1) · legal · otro — URL de Drive/Storage</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'
    + '<select id="ia-doc-casa" class="osa-in">' + casaOpts + '</select>'
    + '<select id="ia-doc-inv" class="osa-in">' + invOpts + '</select>'
    + '<select id="ia-doc-tipo" class="osa-in"><option>contrato</option><option>fiscal</option><option>legal</option><option>otro</option></select>'
    + '<input id="ia-doc-nombre" class="osa-in" placeholder="Nombre visible (ej: Operating Agreement 2025)">'
    + '<input id="ia-doc-url" class="osa-in" placeholder="URL del documento" style="grid-column:span 2">'
    + '</div><button class="cbtn" style="margin-top:10px" onclick="iaAddDoc()">Subir al portal</button>'
    + '<div class="meta" style="margin-top:6px">Sin inversionista = lo ven todos los holders de la casa. Cada vista del inversionista queda en el audit log del documento.</div></div>'
    + '<div class="card"><div class="chart-h"><div class="t">Documentos (' + docs.length + ')</div></div>'
    + '<table class="ptable"><thead><tr><th>Documento</th><th>Casa</th><th>Para</th><th>Tipo</th><th>Vistas</th><th style="text-align:right"></th></tr></thead><tbody>'
    + (docs.map(d => '<tr><td><a href="' + OS_E(d.url) + '" target="_blank" style="color:var(--a2)">' + OS_E(d.nombre) + ' ↗</a></td><td>' + OS_E(iaCasaName(d.property_id)) + '</td>'
      + '<td>' + (d.investor_airtable_id ? OS_E(iaInvName(d.investor_airtable_id)) : '🏠 todos') + '</td><td>' + OS_E(d.tipo || '—') + '</td>'
      + '<td>' + ((d.audit || []).length || 0) + '</td>'
      + '<td style="text-align:right"><button class="ct-btn" style="color:var(--neg);padding:2px 7px" onclick="iaDelDoc(\'' + d.id + '\')">⏸</button></td></tr>').join('') || '<tr><td colspan="6" class="empty">Sin documentos.</td></tr>')
    + '</tbody></table></div>';
}
async function iaCrearDist() {
  const g = id => (document.getElementById(id) || {}).value || '';
  const row = { investor_airtable_id: g('ia-d-inv'), property_id: g('ia-d-casa'), fecha: g('ia-d-fecha'), tipo: g('ia-d-tipo') || 'utilidad', monto: parseFloat(g('ia-d-monto')) || 0, estado: g('ia-d-estado') || 'programada', k1_url: g('ia-d-k1') || null };
  if (!row.investor_airtable_id || !row.property_id || !row.fecha || !row.monto) return alert('Inversionista, casa, fecha y monto son obligatorios');
  const { error } = await sb.from('inv_distributions').insert(row);
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Distribución creada', 'success');
  await iaLoadProducto(); osRender();
}
window.iaCrearDist = iaCrearDist;
async function iaDistEstado(id, estado) {
  const { error } = await sb.from('inv_distributions').update({ estado }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await iaLoadProducto(); osRender();
}
window.iaDistEstado = iaDistEstado;
async function iaDelDist(id) {
  const { error } = await sb.from('inv_distributions').update({ active: false, archived_at: new Date().toISOString() }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await iaLoadProducto(); osRender();
}
window.iaDelDist = iaDelDist;
async function iaEnviarMsgAdmin() {
  const g = id => (document.getElementById(id) || {}).value || '';
  const dest = g('ia-mm-dest');
  const row = { de: 'admin', asunto: g('ia-mm-asunto'), cuerpo: g('ia-mm-cuerpo') };
  if (!row.cuerpo) return alert('Escribí el mensaje');
  if (dest.startsWith('casa:')) row.property_id = dest.slice(5);          // fan-out: todos los holders de la casa
  else row.investor_airtable_id = dest;
  const { error } = await sb.from('inv_messages').insert(row);
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✉️ Mensaje enviado', 'success');
  await iaLoadProducto(); osRender();
}
window.iaEnviarMsgAdmin = iaEnviarMsgAdmin;

function iaTabDist() {
  const invOpts = IA.investors.map(i => '<option value="' + i.airtable_id + '">' + OS_E(i.name || i.airtable_id) + '</option>').join('');
  const casaOpts = [...new Set(IA.holdings.map(h => h.property_id))].map(c => '<option value="' + c + '">' + OS_E(iaCasaName(c)) + '</option>').join('');
  return '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">➕ Nueva distribución</div><div class="k">utilidad / refi / venta / devolución de capital · con K-1</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
    + '<select id="ia-d-inv" class="osa-in">' + invOpts + '</select>'
    + '<select id="ia-d-casa" class="osa-in">' + casaOpts + '</select>'
    + '<input id="ia-d-fecha" type="date" class="osa-in">'
    + '<input id="ia-d-monto" type="number" class="osa-in" placeholder="monto $">'
    + '<select id="ia-d-tipo" class="osa-in"><option>utilidad</option><option>refi</option><option>venta</option><option>devolucion_capital</option></select>'
    + '<select id="ia-d-estado" class="osa-in"><option>programada</option><option>pagada</option></select>'
    + '<input id="ia-d-k1" class="osa-in" placeholder="URL del K-1 (opcional)" style="grid-column:span 2">'
    + '</div><button class="cbtn" style="margin-top:10px" onclick="iaCrearDist()">Crear</button></div>'
    + '<div class="card"><div class="chart-h"><div class="t">Distribuciones (' + (IA.dists || []).length + ')</div></div>'
    + '<table class="ptable"><thead><tr><th>Inversionista</th><th>Casa</th><th>Fecha</th><th>Tipo</th><th style="text-align:right">Monto</th><th>Estado</th><th style="text-align:right"></th></tr></thead><tbody>'
    + ((IA.dists || []).map(d => '<tr><td>' + OS_E(iaInvName(d.investor_airtable_id)) + '</td><td>' + OS_E(iaCasaName(d.property_id)) + '</td><td>' + OS_E(d.fecha) + '</td><td>' + OS_E(d.tipo) + (d.k1_url ? ' 📄' : '') + '</td>'
      + '<td style="text-align:right">' + iaMoney(d.monto) + '</td>'
      + '<td>' + (d.estado === 'pagada' ? '<span class="badge b-ok">pagada</span>' : '<span class="badge b-warn">programada</span> <button class="ct-btn" style="padding:2px 7px;font-size:9px" onclick="iaDistEstado(\'' + d.id + '\',\'pagada\')">✓ pagar</button>') + '</td>'
      + '<td style="text-align:right"><button class="ct-btn" style="color:var(--neg);padding:2px 7px" onclick="iaDelDist(\'' + d.id + '\')">⏸</button></td></tr>').join('') || '<tr><td colspan="7" class="empty">Sin distribuciones.</td></tr>')
    + '</tbody></table></div>';
}
function iaTabMsgs() {
  const invOpts = IA.investors.map(i => '<option value="' + i.airtable_id + '">👤 ' + OS_E(i.name || i.airtable_id) + '</option>').join('');
  const casaOpts = [...new Set(IA.holdings.map(h => h.property_id))].map(c => '<option value="casa:' + c + '">🏠 Todos los de ' + OS_E(iaCasaName(c)) + '</option>').join('');
  return '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">✉️ Enviar mensaje</div><div class="k">a un inversionista o fan-out a todos los holders de una casa</div></div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><select id="ia-mm-dest" class="osa-in">' + casaOpts + invOpts + '</select>'
    + '<input id="ia-mm-asunto" class="osa-in" style="flex:1;min-width:220px" placeholder="Asunto"></div>'
    + '<textarea id="ia-mm-cuerpo" rows="3" class="osa-in" style="width:100%" placeholder="Mensaje…"></textarea>'
    + '<button class="cbtn" style="margin-top:8px" onclick="iaEnviarMsgAdmin()">Enviar</button></div>'
    + ((IA.msgs || []).map(m => '<div class="card" style="margin-bottom:8px"><div class="kv" style="border:none;padding:0"><span>' + (m.de === 'admin' ? '🏢 → ' + (m.investor_airtable_id ? OS_E(iaInvName(m.investor_airtable_id)) : '🏠 ' + OS_E(iaCasaName(m.property_id))) : '👤 ' + OS_E(iaInvName(m.investor_airtable_id))) + ' · ' + OS_E((m.created_at || '').slice(0, 10)) + '</span><b class="meta">leído por: ' + ((m.read_by || []).length ? OS_E((m.read_by || []).join(', ')) : '—') + '</b></div>'
      + (m.asunto ? '<div style="font-weight:700;font-size:13px;margin:3px 0">' + OS_E(m.asunto) + '</div>' : '')
      + '<div class="meta" style="white-space:pre-wrap">' + OS_E(m.cuerpo) + '</div></div>').join('') || '<div class="empty">Sin mensajes.</div>');
}

// ─── F2: pipeline 3 etapas + calculadora de propuesta (markup SOLO acá) ───
async function iaGuardarDeal() {
  const g = id => (document.getElementById(id) || {}).value || '';
  const n = id => parseFloat(g(id)) || 0;
  const pid = g('ia-pl-casa'); if (!pid) return alert('Elegí casa');
  const adquisicion = n('ia-pl-adq'), remodelacion = n('ia-pl-rem'), holding = n('ia-pl-hold'), intereses = n('ia-pl-int'), costosVenta = n('ia-pl-cv'), markup = n('ia-pl-mk');
  const arv = n('ia-pl-arv'), renta = n('ia-pl-renta'), pct = n('ia-pl-pct') || 50;
  const precio_total = adquisicion + remodelacion + holding + intereses + costosVenta + markup;
  // retornos públicos: del motor si la casa tiene params (proyectado)
  let retornos = null;
  try { if (IA.casa === pid && IA.params.length) { const r = iaRunEscenario('proyectado').r.indicadores; retornos = { tir31: +r.tir31PostRefi.toFixed(4), vpn31: Math.round(r.vpn31PostRefi) }; } } catch (e) {}
  const proposal = {
    direccion: iaCasaName(pid), adquisicion, remodelacion, holding, intereses_hml: intereses, costos_venta: costosVenta,
    markup_empresa: markup, precio_total, arv, renta_proyectada: renta,
    estructura_publica: { inversionista_pct: pct },
    retornos_publicos: retornos || undefined,
    escenarios: [{ arv: Math.round(arv * 0.9) }, { arv }, { arv: Math.round(arv * 1.1) }],
  };
  const { error } = await sb.from('inv_deals').upsert({ property_id: pid, modelo: g('ia-pl-modelo') || 'brrrr', proposal, updated_at: new Date().toISOString(), active: true, archived_at: null }, { onConflict: 'property_id' });
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Propuesta guardada — copiá el link público desde la card', 'success');
  await iaLoadProducto(); osRender();
}
window.iaGuardarDeal = iaGuardarDeal;
async function iaDealEtapa(id, etapa) {
  const { error } = await sb.from('inv_deals').update({ etapa, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await iaLoadProducto(); osRender();
}
window.iaDealEtapa = iaDealEtapa;
async function iaCerrarDeal(id, bucket) {
  const rev = new Date(Date.now() + 48 * 3600000).toISOString();
  const { error } = await sb.from('inv_deals').update({ etapa: 'salida', closure: { bucket, cerrado_at: new Date().toISOString(), reversible_until: rev } }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Deal cerrado (' + bucket + ') — reversible por 48h', 'success');
  await iaLoadProducto(); osRender();
}
window.iaCerrarDeal = iaCerrarDeal;
async function iaRevertirCierre(id) {
  const d = (IA.deals2 || []).find(x => x.id === id);
  if (!d || !d.closure || d.closure.reversible_until < new Date().toISOString()) return alert('La ventana de reversión (48h) ya venció.');
  const { error } = await sb.from('inv_deals').update({ closure: null }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await iaLoadProducto(); osRender();
}
window.iaRevertirCierre = iaRevertirCierre;
function iaCopiarLink(linkId) {
  const url = location.origin + '/propuesta?link=' + linkId;
  navigator.clipboard.writeText(url).then(() => { if (window.toast) toast('🔗 Link público copiado: ' + url, 'success'); }).catch(() => prompt('Link público:', url));
}
window.iaCopiarLink = iaCopiarLink;

function iaDealCard(d) {
  const pr = d.proposal || {};
  const proj = (IA.proj || []).find(x => x.property_id === d.property_id);
  const ind = proj && proj.data && proj.data.indicadores;
  const h = IA.holdings.filter(x => x.property_id === d.property_id);
  const capital = h.reduce((s, x) => s + (+x.inversion_aportada || 0), 0);
  const coc = ind && capital > 0 && ind.utilidadAnualEstable ? (ind.utilidadAnualEstable.inversionista / capital) : null;
  const rec = ind && ind.cashInvertido > 0 ? (ind.cashInvertido - Math.abs(ind.anio0PostRefi || 0)) / ind.cashInvertido : null;
  const cerrado = !!d.closure;
  const rev = cerrado && d.closure.reversible_until > new Date().toISOString();
  return '<div class="card" style="margin-bottom:10px">'
    + '<div style="font-weight:700;font-size:13px">' + OS_E(iaCasaName(d.property_id)) + ' <span class="osbadge" style="margin:0">' + OS_E(d.modelo) + '</span>' + (cerrado ? ' <span class="badge b-ok">cerrado: ' + OS_E(d.closure.bucket) + '</span>' : '') + '</div>'
    + '<div class="kv"><span>Precio al inversionista</span><b>' + iaMoney(pr.precio_total) + '</b></div>'
    + '<div class="kv"><span>Markup empresa <span class="ff-dqx" style="font-size:8px">SOLO ADMIN</span></span><b class="warn">' + iaMoney(pr.markup_empresa) + '</b></div>'
    + (coc != null ? '<div class="kv"><span>CoC anual / Recuperado</span><b>' + (coc * 100).toFixed(1) + '% · ' + (rec * 100).toFixed(0) + '%</b></div>' : '')
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'
    + '<button class="ct-btn" onclick="iaCopiarLink(\'' + d.public_link_id + '\')">🔗 Link público</button>'
    + (d.etapa === 'preventa' ? '<button class="ct-btn" onclick="iaDealEtapa(\'' + d.id + '\',\'gestion\')">→ Gestión</button>' : '')
    + (d.etapa === 'gestion' ? '<button class="ct-btn" onclick="iaDealEtapa(\'' + d.id + '\',\'salida\')">→ Salida</button>' : '')
    + (d.etapa === 'salida' && !cerrado ? ['rentando', 'refi', 'vendida'].map(b => '<button class="ct-btn" onclick="iaCerrarDeal(\'' + d.id + '\',\'' + b + '\')">🏁 ' + b + '</button>').join('') : '')
    + (cerrado && rev ? '<button class="ct-btn" style="color:var(--neg)" onclick="iaRevertirCierre(\'' + d.id + '\')">↩︎ Revertir (48h)</button>' : '')
    + '</div></div>';
}
function iaTabPipeline() {
  const deals = IA.deals2 || [];
  const casaOpts = IA.deals.filter(x => x.property_id).map(x => '<option value="' + x.property_id + '">' + OS_E((x.address || '').split(',')[0]) + '</option>').join('');
  const col = (etapa, titulo) => '<div><div class="lab" style="margin-bottom:8px">' + titulo + ' (' + deals.filter(x => x.etapa === etapa).length + ')</div>'
    + (deals.filter(x => x.etapa === etapa).map(iaDealCard).join('') || '<div class="meta">—</div>') + '</div>';
  return '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">🧮 Calculadora de propuesta</div><div class="k">el MARKUP solo se ve acá — el link público sale sanitizado (verificado)</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
    + '<select id="ia-pl-casa" class="osa-in" onchange="iaSetCasa(this.value)">' + casaOpts + '</select>'
    + '<select id="ia-pl-modelo" class="osa-in"><option value="brrrr">BRRRR</option><option value="fixflip">Fix & Flip</option><option value="fixhold">Fix & Hold</option></select>'
    + '<input id="ia-pl-adq" type="number" class="osa-in" placeholder="Adquisición $">'
    + '<input id="ia-pl-rem" type="number" class="osa-in" placeholder="Remodelación $">'
    + '<input id="ia-pl-hold" type="number" class="osa-in" placeholder="Holding $">'
    + '<input id="ia-pl-int" type="number" class="osa-in" placeholder="Intereses HML $">'
    + '<input id="ia-pl-cv" type="number" class="osa-in" placeholder="Costos de venta $">'
    + '<input id="ia-pl-mk" type="number" class="osa-in" placeholder="MARKUP empresa $" style="border-color:rgba(231,182,94,.5)">'
    + '<input id="ia-pl-arv" type="number" class="osa-in" placeholder="ARV $">'
    + '<input id="ia-pl-renta" type="number" class="osa-in" placeholder="Renta proyectada $/mes">'
    + '<input id="ia-pl-pct" type="number" class="osa-in" placeholder="% inversionista (50)">'
    + '<button class="cbtn" onclick="iaGuardarDeal()">💾 Guardar propuesta</button>'
    + '</div><div class="meta" style="margin-top:8px">precio al inversionista = adquisición + remodelación + holding + intereses + costos de venta + markup · escenarios ARV ±10% automáticos · retornos públicos = TIR/VPN del escenario proyectado si la casa tiene modelo</div></div>'
    + '<div class="grid k3">' + col('preventa', '1 · PRE-VENTA') + col('gestion', '2 · GESTIÓN') + col('salida', '3 · SALIDA') + '</div>';
}

// ─── F3: dashboard global ───
function iaTabGlobal() {
  const caps = {};
  IA.holdings.forEach(h => { caps[h.investor_airtable_id] = (caps[h.investor_airtable_id] || 0) + (+h.inversion_aportada || 0); });
  const capTotal = Object.values(caps).reduce((s, v) => s + v, 0);
  const porCasa = {};
  IA.holdings.forEach(h => { porCasa[h.property_id] = (porCasa[h.property_id] || 0) + (+h.inversion_aportada || 0); });
  const projs = IA.proj || [];
  const tirs = projs.map(p => p.data && p.data.indicadores && p.data.indicadores.tir31PostRefi).filter(x => x != null);
  const vpns = projs.map(p => p.data && p.data.indicadores && p.data.indicadores.vpn31PostRefi).filter(x => x != null);
  const alertas = [];
  (IA.access || []).filter(a => a.estado === 'invitado').forEach(a => alertas.push('🔑 Acceso sin reclamar: ' + iaInvName(a.investor_airtable_id) + ' (' + a.email + ')'));
  const hoy = new Date().toISOString().slice(0, 10);
  (IA.dists || []).filter(d => d.estado === 'programada' && d.fecha >= hoy && (new Date(d.fecha) - Date.now()) < 14 * 86400000).forEach(d => alertas.push('💸 Distribución en <14 días: ' + iaInvName(d.investor_airtable_id) + ' · ' + iaMoney(d.monto) + ' el ' + d.fecha));
  [...new Set(IA.holdings.map(h => h.property_id))].filter(pid => !projs.some(p => p.property_id === pid)).forEach(pid => alertas.push('📐 Casa con capital SIN modelo/proyección: ' + iaCasaName(pid) + ' — cargar params y guardar cache'));
  const cerradas = (IA.deals2 || []).filter(d => d.closure);
  const kpi = (lab, val, meta) => '<div class="card"><div class="lab">' + lab + '</div><div class="big">' + val + '</div>' + (meta ? '<div class="meta">' + meta + '</div>' : '') + '</div>';
  return '<div class="grid k4">'
    + kpi('Capital total invertido', iaMoney(capTotal), Object.keys(caps).length + ' inversionistas · ' + Object.keys(porCasa).length + ' casas [inv_holdings]')
    + kpi('TIR promedio proyectada', tirs.length ? (tirs.reduce((s, x) => s + x, 0) / tirs.length * 100).toFixed(1) + '%' : 'sin datos', tirs.length + ' de ' + projs.length + ' casas con proyección (resto en calibración)')
    + kpi('VPN agregado (31a)', vpns.length ? iaMoney(vpns.reduce((s, x) => s + x, 0)) : 'sin datos', 'suma de proyecciones [inv_projection]')
    + kpi('Alertas', alertas.length, alertas.length ? 'ver abajo' : 'todo al día')
    + '</div>'
    + '<div class="grid k2" style="margin-top:14px">'
    + '<div class="card"><div class="chart-h"><div class="t">Capital por inversionista</div></div>'
    + Object.entries(caps).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<div class="kv"><span>' + OS_E(iaInvName(k)) + '</span><b>' + iaMoney(v) + '</b></div>').join('')
    + '<div class="lab" style="margin-top:12px">Por propiedad</div>'
    + Object.entries(porCasa).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<div class="kv"><span>' + OS_E(iaCasaName(k)) + '</span><b>' + iaMoney(v) + '</b></div>').join('')
    + (cerradas.length ? '<div class="lab" style="margin-top:12px">Participaciones cerradas</div>' + cerradas.map(d => '<div class="kv"><span>' + OS_E(iaCasaName(d.property_id)) + '</span><b>' + OS_E(d.closure.bucket) + ' · ' + OS_E((d.closure.cerrado_at || '').slice(0, 10)) + '</b></div>').join('') : '')
    + '</div>'
    + '<div class="card"><div class="chart-h"><div class="t">Alertas</div></div>'
    + (alertas.length ? alertas.map(a => '<div class="kv"><span>' + OS_E(a) + '</span></div>').join('') : '<div class="empty" style="padding:20px">🎯 Todo al día.</div>')
    + '</div></div>';
}

// ─── 💰 Ledger "movimiento del dinero" (misma RPC que el portal — una definición) ───
IA.ledgerCache = IA.ledgerCache || {};
async function iaLoadLedger(pid) {
  const { data, error } = await sb.rpc("inv_ledger", { pid });
  IA.ledgerCache[pid] = error ? { err: error.message } : (data || []);
  osRender();
}
function iaTabLedger() {
  const casas = [...new Set(IA.holdings.map(h => h.property_id))];
  if (!casas.includes(IA.casa)) IA.casa = casas[0];
  const casaSel = "<select class=\"osa-in\" onchange=\"iaSetCasa(this.value)\">" + casas.map(c => "<option value=\"" + c + "\" " + (c === IA.casa ? "selected" : "") + ">" + OS_E(iaCasaName(c)) + "</option>").join("") + "</select>";
  const led = IA.ledgerCache[IA.casa];
  if (led === undefined) { iaLoadLedger(IA.casa); return casaSel + "<div class=\"empty\">⏳ Armando el ledger…</div>"; }
  if (led.err) return casaSel + (window.kitError ? kitError(led.err, "delete IA.ledgerCache[IA.casa];osRender()") : "<div class=\"empty down\">" + OS_E(led.err) + "</div>");
  if (!led.length) return casaSel + "<div class=\"empty\">Sin movimientos para esta casa.</div>";
  let acum = 0;
  const full = led.map(m => { acum += (m.tipo === "ingreso" ? 1 : -1) * (+m.monto || 0); return { ...m, acum }; });
  const cats = {};
  led.forEach(m => { const k = m.tipo + ":" + m.categoria; cats[k] = (cats[k] || 0) + +m.monto; });
  const subt = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => "<div class=\"kv\"><span>" + OS_E(k.replace(":", " · ")) + "</span><b class=\"" + (k.startsWith("ingreso") ? "up" : "down") + "\">" + iaMoney(v) + "</b></div>").join("");
  return "<div style=\"display:flex;gap:10px;align-items:center;margin-bottom:12px\">" + casaSel + "<span class=\"meta\">" + led.length + " movimientos · saldo final <b style=\"color:" + (acum >= 0 ? "var(--pos)" : "var(--neg)") + "\">" + iaMoney(acum) + "</b></span></div>"
    + "<div class=\"grid k2\"><div class=\"card\"><div class=\"chart-h\"><div class=\"t\">Subtotales por categoría</div></div>" + subt + "</div>"
    + "<div class=\"card\"><div class=\"chart-h\"><div class=\"t\">Fuentes</div></div>"
    + Object.entries(led.reduce((a, m) => { a[m.fuente] = (a[m.fuente] || 0) + 1; return a; }, {})).map(([f, n]) => "<div class=\"kv\"><span>" + OS_E(f) + "</span><b>" + n + " movs</b></div>").join("") + "</div></div>"
    + "<div class=\"card overx\" style=\"margin-top:14px\"><table class=\"ptable\"><thead><tr><th>Fecha</th><th>Concepto</th><th>Cat.</th><th style=\"text-align:right\">Monto</th><th style=\"text-align:right\">Saldo</th><th>Fuente</th></tr></thead><tbody>"
    + full.slice().reverse().map(m => "<tr><td style=\"white-space:nowrap\">" + OS_E(m.fecha) + "</td><td>" + OS_E(m.concepto) + (m.comprobante ? " <a href=\"" + OS_E(m.comprobante) + "\" target=\"_blank\">📎</a>" : "") + "</td><td>" + OS_E(m.categoria) + "</td>"
      + "<td style=\"text-align:right\" class=\"" + (m.tipo === "ingreso" ? "up" : "down") + "\">" + (m.tipo === "ingreso" ? "+" : "−") + iaMoney(m.monto) + "</td>"
      + "<td style=\"text-align:right;color:" + (m.acum >= 0 ? "var(--pos)" : "var(--neg)") + "\">" + iaMoney(m.acum) + "</td><td class=\"meta\">" + OS_E(m.fuente) + "</td></tr>").join("")
    + "</tbody></table></div>";
}

// ── B: parámetros en los 9 BLOQUES de Juan (colapsables; mayoría auto-llenada con su fuente) ──
const IA_BLOQUES = [
  ['b1', '🏠 1 · Identificación', /^(direccion|nombre_corto|tipo|num_hab|banos|sqft|ano)$/],
  ['b2', '🎯 2 · Estrategia y estado', /^(estrategia|estado_casa|plan_salida|modelo_operativo|fecha_cierre|fecha_exit|es_ejemplo)$/],
  ['b3', '💰 3 · Financieros de compra', /^(compra|remodel_real|cierre_compra|arv|est_arv|est_remodel_total|est_cierre_pct|cash_atrapado_real)$/],
  ['b4', '🏦 4 · Financiamiento HML', /^(hm_inicial|hm_tasa|hm_plazo|draw_m\d+|otros_inv_m\d+)$/],
  ['b5', '🏛️ 5 · Refinanciación', /^(refi_|cierre_refi|cashout_real)/],
  ['b6', '👥 6 · Inversionistas y equity', /^(reparto_inv)$/],
  ['b7', '📊 7 · Operación mensual', /^(arriendo_hab|rampa|ocupacion_estable|piso_servicios|vacancy|servicios_mes|mantenimiento_mes|hoa_mes|seguro_mes|padsplit_pct|comision_pct|imp_propiedad_pct|imp_renta_pct)$/],
  ['b8', '📈 8 · Supuestos (manual)', /^(valorizacion|inflacion|retorno_esperado|anios|ciclo_meses|postrefi_perfil|util_anual_postrefi|anio0_postrefi)$/],
  ['b9', '🎯 9 · Metas del deal (manual)', /^(tir_objetivo|cap_objetivo|fecha_breakeven|fecha_recuperacion)$/],
];
const IA_METAS_KEYS = ['tir_objetivo', 'cap_objetivo', 'fecha_breakeven', 'fecha_recuperacion'];
function iaTogglePB(id) { IA.pOpen = IA.pOpen || { b1: true }; IA.pOpen[id] = !IA.pOpen[id]; osRender(); }
window.iaTogglePB = iaTogglePB;
function iaFuenteBadge(fuente) {
  const auto = /^real|^excel/.test(fuente || '');
  return '<span class="badge ' + (auto ? 'b-ok' : 'b-warn') + '" style="font-size:8px" title="' + OS_E(fuente || '') + '">' + (auto ? 'auto · ' + OS_E((fuente || '').split(':')[1] || fuente) : 'manual') + '</span>';
}
function iaParamRow(p) {
  const frac = /(_pct$|tasa|reparto|ocupacion|valorizacion|inflacion|retorno|piso_servicios)/.test(p.key);
  return '<div class="kv"><span title="' + OS_E(p.descripcion || '') + '">' + OS_E(p.key) + ' ' + iaFuenteBadge(p.fuente) + '</span>'
    + '<b style="display:inline-flex;align-items:center;gap:4px"><input id="ia-p-' + OS_E(p.key) + '" class="osa-in" style="width:150px;padding:4px 8px;font-size:11px;text-align:right" value="' + OS_E(p.value) + '" onkeydown="if(event.key===\'Enter\')iaSaveParam(\'' + OS_E(p.key) + '\')">'
    + (frac ? '<span style="color:var(--mut2);font-size:10px;font-weight:700" title="fracción: 0.5 = 50%">×</span>' : '') + '</b></div>';
}
function iaParamsBloques() {
  IA.pOpen = IA.pOpen || { b1: true };
  const grupos = {}; const otros = [];
  IA.params.forEach(p => {
    const b = IA_BLOQUES.find(x => x[2].test(p.key));
    if (b) (grupos[b[0]] = grupos[b[0]] || []).push(p); else otros.push(p);
  });
  let html = '<div class="card" style="max-height:640px;overflow-y:auto"><div class="chart-h"><div class="t">Parámetros del modelo (' + IA.params.length + ')</div><div class="k">9 bloques · <span class="badge b-ok" style="font-size:8px">auto</span> viene de las bases · <span class="badge b-warn" style="font-size:8px">manual</span> lo cargás vos</div></div>';
  IA_BLOQUES.forEach(([id, titulo]) => {
    const rows = grupos[id] || [];
    const open = !!IA.pOpen[id];
    const autos = rows.filter(p => /^real|^excel/.test(p.fuente || '')).length;
    html += '<div onclick="iaTogglePB(\'' + id + '\')" style="display:flex;justify-content:space-between;gap:8px;cursor:pointer;padding:8px 10px;border:1px solid var(--glassb);border-radius:9px;background:var(--glass);margin-top:8px;font-size:12.5px;font-weight:700">'
      + '<span>' + (open ? '▾' : '▸') + ' ' + titulo + '</span><span class="meta" style="font-weight:500">' + rows.length + (rows.length ? ' · ' + autos + ' auto' : ' · vacío') + '</span></div>';
    if (open) {
      html += rows.map(iaParamRow).join('') || '';
      if (id === 'b3' && rows.length) {
        const g = k => { const r = rows.find(x => x.key === k) || IA.params.find(x => x.key === k); return r ? parseFloat(r.value) || 0 : 0; };
        const tot = g('compra') + (g('remodel_real') || g('est_remodel_total')) + g('cierre_compra');
        if (tot > 0) html += '<div class="kv"><span><b>Total invertido</b> <span class="badge b-ok" style="font-size:8px">calculado</span></span><b>' + iaMoney(tot) + '</b></div>';
      }
      if (id === 'b6') {
        const hs = IA.holdings.filter(h => h.property_id === IA.casa);
        const sum = hs.reduce((s, h) => s + (+h.reparto_pct || 0), 0);
        html += hs.map(h => '<div class="kv"><span>' + OS_E(iaInvName(h.investor_airtable_id)) + ' <span class="badge b-ok" style="font-size:8px">auto · inv_holdings</span></span><b>' + Math.round(h.reparto_pct * 100) + '% · ' + iaMoney(h.inversion_aportada) + '</b></div>').join('')
          + '<div class="kv"><span>Operador (Flipping Rentals) <span class="badge b-ok" style="font-size:8px">calculado</span></span><b>' + Math.max(0, Math.round((1 - sum) * 100)) + '%</b></div>';
      }
      if (id === 'b9') {
        const faltan = IA_METAS_KEYS.filter(k => !rows.some(p => p.key === k));
        if (faltan.length) html += '<div class="meta" style="padding:6px 2px">Faltan: ' + faltan.map(k => '<a style="cursor:pointer;color:var(--a2)" onclick="document.getElementById(\'ia-np-key\').value=\'' + k + '\';document.getElementById(\'ia-np-key\').scrollIntoView({block:\'center\'});document.getElementById(\'ia-np-val\').focus()">＋ ' + k + '</a>').join(' · ') + '</div>';
      }
    }
  });
  if (otros.length) {
    const open = !!IA.pOpen.b0;
    html += '<div onclick="iaTogglePB(\'b0\')" style="display:flex;justify-content:space-between;gap:8px;cursor:pointer;padding:8px 10px;border:1px solid var(--glassb);border-radius:9px;background:var(--glass);margin-top:8px;font-size:12.5px;font-weight:700"><span>' + (open ? '▾' : '▸') + ' 🧩 Otros</span><span class="meta" style="font-weight:500">' + otros.length + '</span></div>';
    if (open) html += otros.map(iaParamRow).join('');
  }
  return html + '</div>';
}

// ── A6+C: Movimientos = UNA fuente — manuales (editables) + auto-importados del ledger (badge) ──
function iaMovsCard() {
  const led = IA.ledgerCache[IA.casa];
  if (led === undefined) iaLoadLedger(IA.casa);
  const autos = Array.isArray(led) ? led.filter(m => !/^OS:manual/.test(m.fuente || '')) : null;
  const editRow = m => {
    if (IA.movEdit !== m.id) return '';
    return '<div style="background:var(--glass);border:1px solid var(--a2);border-radius:9px;padding:10px;margin:4px 0">'
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">'
      + '<input id="ia-me-fecha" type="date" class="osa-in" style="padding:6px" value="' + OS_E(m.fecha) + '">'
      + iaCatSel('ia-me-cat', m.categoria)
      + '<input id="ia-me-valor" type="number" class="osa-in" style="padding:6px" value="' + OS_E(m.valor) + '">'
      + '<input id="ia-me-conc" class="osa-in" style="padding:6px;grid-column:span 2" placeholder="concepto" value="' + OS_E(m.concepto || m.item || '') + '">'
      + '<input id="ia-me-fact" class="osa-in" style="padding:6px" placeholder="URL factura (Drive)" value="' + OS_E(m.factura_url || '') + '">'
      + '</div><div style="display:flex;gap:6px;margin-top:8px"><button class="cbtn" style="padding:6px 12px" onclick="iaSaveMov(\'' + m.id + '\')">💾 Guardar</button><button class="ct-btn" onclick="IA.movEdit=null;osRender()">Cancelar</button></div></div>';
  };
  return '<div class="card" style="max-height:640px;overflow-y:auto"><div class="chart-h"><div class="t">Movimientos (una sola fuente)</div><div class="k"><a style="cursor:pointer;color:var(--a2)" onclick="iaToggleGuia()">❓ guía de clasificación</a></div></div>'
    + iaGuiaCat()
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:4px">'
    + '<input id="ia-m-fecha" type="date" class="osa-in" style="padding:6px" title="se guarda la fecha completa; la vista muestra Año-Mes">'
    + iaCatSel('ia-m-cat', 'operativo')
    + '<input id="ia-m-valor" type="number" class="osa-in" style="padding:6px" placeholder="valor $">'
    + '<input id="ia-m-conc" class="osa-in" style="padding:6px;grid-column:span 2" placeholder="concepto / descripción (sugiere la categoría)" oninput="iaMovSugerir()">'
    + '<input id="ia-m-item" class="osa-in" style="padding:6px" placeholder="ítem (opcional)">'
    + '<input id="ia-m-fact" class="osa-in" style="padding:6px;grid-column:span 3" placeholder="URL de la factura (Google Drive) — se muestra como link">'
    + '</div><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span id="ia-m-pnl">' + iaPnlBadge('operativo') + '</span><span class="meta" style="font-size:10.5px" title="' + IA_PNL_TIP + '">ⓘ P&L se deriva solo de la categoría</span></div>'
    + '<button class="cbtn" style="width:100%" onclick="iaAddMov()">＋ Cargar movimiento manual</button>'
    + '<div class="lab" style="margin-top:12px">✍️ Manuales (' + IA.cashflow.length + ') — editables</div>'
    + (IA.cashflow.map(m => editRow(m) + '<div class="kv"><span title="' + OS_E(m.fecha) + '">' + OS_E(String(m.fecha || '').slice(0, 7)) + ' · ' + OS_E(m.concepto || m.item || m.linea) + ' <span class="badge b-warn" style="font-size:8px">manual</span> ' + iaPnlBadge(m.categoria) + (m.factura_url ? ' <a href="' + OS_E(m.factura_url) + '" target="_blank" style="color:var(--a2);font-size:10px">📄 Ver factura</a>' : (m.id_factura ? ' · #' + OS_E(m.id_factura) : '')) + '</span>'
      + '<b class="' + (m.tipo === 'ingreso' ? 'up' : 'down') + '" style="white-space:nowrap">' + iaMoney(m.tipo === 'ingreso' ? m.valor : -m.valor)
      + ' <button class="ct-btn" style="padding:1px 6px;font-size:9px" onclick="iaEditMov(\'' + m.id + '\')">✎</button><button class="ct-btn" style="padding:1px 6px;font-size:9px;color:var(--neg)" onclick="iaDelMov(\'' + m.id + '\')">🗑</button></b></div>').join('') || '<div class="meta" style="padding:6px 2px">Sin movimientos manuales.</div>')
    + '<div class="lab" style="margin-top:12px">⚙️ Auto-importados (' + (autos ? autos.length : '⏳') + ') — de FF/Rentas, con su linaje, no se re-teclean</div>'
    + (autos === null ? '<div class="meta">⏳ cargando…</div>'
      : autos.slice(-40).reverse().map(m => '<div class="kv"><span title="' + OS_E(m.fecha) + ' · ' + OS_E(m.fuente) + '">' + OS_E(String(m.fecha || '').slice(0, 7)) + ' · ' + OS_E(m.concepto) + ' <span class="badge b-ok" style="font-size:8px">auto · ' + OS_E(String(m.fuente || '').split(':')[0]) + '</span> ' + iaPnlBadge(m.categoria === 'renta' ? 'ingreso' : m.categoria) + (m.comprobante ? ' <a href="' + OS_E(m.comprobante) + '" target="_blank" style="color:var(--a2);font-size:10px">📎</a>' : '') + '</span>'
        + '<b class="' + (m.tipo === 'ingreso' ? 'up' : 'down') + '" style="white-space:nowrap">' + iaMoney(m.tipo === 'ingreso' ? m.monto : -m.monto) + '</b></div>').join(''))
    + '<div class="meta" style="margin-top:8px;font-size:10.5px">El 💰 Ledger es la vista de SOLO LECTURA de estos mismos movimientos (manuales + auto) agrupados por categoría — cero doble digitación. Para corregir un auto: cargá un movimiento manual de ajuste (queda auditado).</div>'
    + '</div>';
}

function invAdminView() {
  if (typeof osaCSS === 'function') osaCSS();
  if (!IA.loaded && !IA.err) { iaLoad(); return '<div class="empty">⏳ Cargando inversionistas…</div>'; }
  if (IA.err) return window.kitError ? kitError(IA.err, 'iaLoad(true)') : '<div class="empty down">' + OS_E(IA.err) + ' <button class="cbtn" onclick="iaLoad(true)">Reintentar</button></div>';
  const tabs = [['global', '📊 Global'], ['pipeline', '🏗 Pipeline'], ['accesos', '🔑 Accesos'], ['holdings', '🏠 Casas & reparto'], ['modelo', '📐 Modelo & movimientos'], ['escenarios', '🎛 Escenarios & simulador'], ['dist', '💸 Distribuciones'], ['docs2', '📄 Documentos'], ['msgs', '💬 Mensajes'], ['ledger', '💰 Ledger']];
  const tabBtns = tabs.map(t => '<button class="ibtn" style="' + (IA.tab === t[0] ? 'border-color:var(--a2);color:var(--ink)' : '') + '" onclick="IA.tab=\'' + t[0] + '\';osRender()">' + t[1] + '</button>').join(' ');
  let body = '';

  if (IA.tab === 'accesos') {
    const invOpts = IA.investors.map(i => '<option value="' + i.airtable_id + '">' + OS_E(i.name || i.airtable_id) + '</option>').join('');
    body = '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">➕ Crear acceso al portal</div><div class="k">el inversionista entra en /inversionista con magic link (sin contraseña)</div></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
      + iaLbl('Inversionista', '<select id="ia-acc-inv" class="osa-in" onchange="var i=IA.investors.find(x=>x.airtable_id===this.value); if(i&&i.email) document.getElementById(\'ia-acc-email\').value=i.email">' + invOpts + '</select>')
      + iaLbl('Email del portal', '<input id="ia-acc-email" class="osa-in" style="max-width:280px" placeholder="email del inversionista">')
      + '<button class="cbtn" onclick="iaCrearAcceso()">Crear acceso</button></div></div>'
      + '<div class="card"><div class="chart-h"><div class="t">Accesos (' + IA.access.length + ')</div></div>'
      + '<table class="ptable"><thead><tr><th>Inversionista</th><th>Email</th><th>Estado</th><th>Reclamado</th><th style="text-align:right">Acciones</th></tr></thead><tbody>'
      + (IA.access.map(a => '<tr><td>' + OS_E(iaInvName(a.investor_airtable_id)) + '</td><td>' + OS_E(a.email) + '</td>'
        + '<td><span class="badge ' + (a.estado === 'activo' ? 'b-ok' : a.estado === 'revocado' ? 'b-red' : 'b-warn') + '">' + a.estado + '</span></td>'
        + '<td>' + (a.claimed_at ? new Date(a.claimed_at).toLocaleDateString('es-MX') : '—') + '</td>'
        + '<td style="text-align:right;white-space:nowrap"><button class="ct-btn" onclick="iaEnviarLink(\'' + OS_E(a.email) + '\')">✉️ Invitar</button> '
        + (a.estado === 'revocado' ? '<button class="ct-btn" onclick="iaRevocar(\'' + a.id + '\', true)">↩︎ Rehabilitar</button>' : '<button class="ct-btn" style="color:var(--neg)" onclick="iaRevocar(\'' + a.id + '\', false)">⏸ Revocar</button>')
        + '</td></tr>').join('') || '<tr><td colspan="5" class="empty">Sin accesos.</td></tr>')
      + '</tbody></table></div>';
  }

  if (IA.tab === 'holdings') {
    const invOpts = IA.investors.map(i => '<option value="' + i.airtable_id + '">' + OS_E(i.name || i.airtable_id) + '</option>').join('');
    const casaOpts = IA.deals.filter(d => d.property_id).map(d => '<option value="' + d.property_id + '">' + OS_E((d.address || '').split(',')[0]) + '</option>').join('');
    body = '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">➕ Vincular inversionista a casa</div><div class="k">reparto configurable por casa · default 50/50</div></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
      + iaLbl('Inversionista', '<select id="ia-h-inv" class="osa-in">' + invOpts + '</select>')
      + iaLbl('Casa', '<select id="ia-h-casa" class="osa-in">' + casaOpts + '</select>')
      + iaLbl('Inversión aportada ($)', '<input id="ia-h-monto" class="osa-in" style="max-width:140px" type="number" placeholder="inversión $">')
      + iaLbl('Su participación', '<span style="display:inline-flex;align-items:center;gap:4px"><input id="ia-h-pct" class="osa-in" style="max-width:110px" type="number" value="50" min="0" max="100" title="% del inversionista"><span style="color:var(--mut2);font-size:11px;font-weight:700">%</span></span>')
      + '<button class="cbtn" onclick="iaVincular()">Vincular</button></div></div>'
      + '<div class="card"><div class="chart-h"><div class="t">Holdings (' + IA.holdings.length + ')</div></div>'
      + '<table class="ptable"><thead><tr><th>Inversionista</th><th>Casa</th><th style="text-align:right">Inversión</th><th style="text-align:right">Su %</th><th>Entrada</th><th style="text-align:right"></th></tr></thead><tbody>'
      + (IA.holdings.map(h => '<tr><td>' + OS_E(iaInvName(h.investor_airtable_id)) + '</td><td>' + OS_E(iaCasaName(h.property_id)) + '</td>'
        + '<td style="text-align:right">' + iaMoney(h.inversion_aportada) + '</td><td style="text-align:right">' + Math.round(h.reparto_pct * 100) + '%</td>'
        + '<td>' + (h.fecha_entrada || '—') + '</td>'
        + '<td style="text-align:right"><button class="ct-btn" style="color:var(--neg)" onclick="iaSoftDeleteHolding(\'' + h.id + '\')">⏸</button></td></tr>').join('') || '<tr><td colspan="6" class="empty">Sin holdings.</td></tr>')
      + '</tbody></table></div>';
  }

  if (IA.tab === 'modelo') {
    const casas = [...new Set(IA.holdings.map(h => h.property_id))];
    const casaSel = '<select class="osa-in" onchange="iaSetCasa(this.value)">' + casas.map(c => '<option value="' + c + '" ' + (c === IA.casa ? 'selected' : '') + '>' + OS_E(iaCasaName(c)) + '</option>').join('') + '</select>';
    let preview = '<div class="meta">Sin parámetros para esta casa.</div>';
    if (IA.params.length && window.invEngine) {
      const h = IA.holdings.find(x => x.property_id === IA.casa);
      const r = invEngine.run(iaEngineParamsFromRows(IA.params, h ? +h.reparto_pct : null));
      const i = r.indicadores;
      preview = '<div class="grid k4">'
        + '<div class="card"><div class="lab">TIR 31a (post-refi)</div><div class="big up">' + (i.tir31PostRefi != null ? (i.tir31PostRefi * 100).toFixed(1) + '%' : '—') + '</div></div>'
        + '<div class="card"><div class="lab">VPN 31a</div><div class="big up">' + iaMoney(i.vpn31PostRefi) + '</div></div>'
        + '<div class="card"><div class="lab">CAP / DSCR</div><div class="big">' + (i.capValor * 100).toFixed(1) + '% · ' + i.dscr.toFixed(2) + '</div></div>'
        + '<div class="card"><div class="lab">Equilibrio</div><div class="big warn">' + (i.puntoEquilibrio * 100).toFixed(0) + '%</div><div class="meta">ocupación mínima</div></div>'
        + '</div>';
    }
    const esEjemplo = IA.params.some(p => p.key === 'es_ejemplo' && p.value === 'true');
    body = '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap">' + casaSel
      + (esEjemplo ? '<span class="badge b-warn" title="Casa de ejemplo del Excel Modelo financiero - Renta VF">🧪 ejemplo del Excel</span>' : '')
      + '<span class="meta">el portal del inversionista muestra EXACTAMENTE esto (motor compartido)</span></div>'
      + preview
      + '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">➕ Agregar parámetro</div><div class="k">todo "sin dato" del portal se carga acá (ej: estrategia, plan_salida, refi_lender, cashout_real)</div></div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
      + '<input id="ia-np-key" class="osa-in" placeholder="key (ej: refi_lender)">'
      + '<input id="ia-np-val" class="osa-in" placeholder="valor">'
      + '<select id="ia-np-fuente" class="osa-in"><option value="real:manual">real:manual</option><option value="supuesto">supuesto</option><option value="modelo">modelo</option></select>'
      + '<input id="ia-np-desc" class="osa-in" placeholder="descripción (opcional)">'
      + '</div><button class="cbtn" style="margin-top:10px" onclick="iaAddParam()">Guardar parámetro</button></div>'
      + '<div class="grid k2" style="margin-top:14px;align-items:start">'
      + iaParamsBloques()
      + iaMovsCard()
      + '</div>';
  }

  if (IA.tab === 'escenarios') body = iaTabEscenarios();
  const needsProd = ['dist', 'msgs', 'pipeline', 'global', 'docs2'].includes(IA.tab);
  if (needsProd && !IA.dists) { iaLoadProducto().then(osRender); body = '<div class="empty">⏳</div>'; }
  else if (IA.tab === 'dist') body = iaTabDist();
  else if (IA.tab === 'docs2') body = iaTabDocs();
  else if (IA.tab === 'msgs') body = iaTabMsgs();
  else if (IA.tab === 'pipeline') body = iaTabPipeline();
  else if (IA.tab === 'global') body = iaTabGlobal();
  else if (IA.tab === 'ledger') body = iaTabLedger();

  return '<h1>💎 Inversionistas <span>· Portal & Modelo</span></h1>'
    + '<div class="sub">Accesos con RLS estricto (cada inversionista ve SOLO sus casas) · reparto por casa · motor compartido con el portal. Portal público: <b>' + location.origin + '/inversionista</b></div>'
    + '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">' + tabBtns + '<button class="ibtn" style="margin-left:auto" onclick="iaLoad(true)">↻</button></div>'
    + body;
}
window.invAdminView = invAdminView;
