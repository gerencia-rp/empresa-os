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
    if (!IA.email) { try { const u = await sb.auth.getUser(); IA.email = (u.data && u.data.user && u.data.user.email) || ''; } catch (e) { IA.email = ''; } }
    IA.casa = IA.casa || (IA.holdings[0] && IA.holdings[0].property_id) || null;
    if (IA.casa) await iaLoadCasa(IA.casa);
    IA.loaded = true;
  } catch (e) { IA.err = e.message || String(e); }
  IA.loading = false;
  osRender();
}
window.iaLoad = iaLoad;
async function iaLoadCasa(pid) {
  const [prm, cf, ov] = await Promise.all([
    sb.from('inv_model_params').select('*').eq('property_id', pid).eq('active', true).order('key'),
    sb.from('inv_cashflow_real').select('*').eq('property_id', pid).eq('active', true).order('fecha', { ascending: false }).limit(200),
    sb.from('inv_param_overrides').select('*').eq('property_id', pid).eq('active', true).then(r => r.data || []).catch(() => []),
  ]);
  IA.params = prm.data || []; IA.cashflow = cf.data || [];
  // overrides: el valor EFECTIVO es el override; el de la fuente queda en _base (reversible ↩)
  IA.ovr = {}; (ov || []).forEach(o => { IA.ovr[o.key] = o; });
  IA.params.forEach(p => { const o = IA.ovr[p.key]; if (o) { p._base = p.value; p._ov = o; p.value = o.valor; } });
  IA.pDirty = {}; IA.pSaved = {};
}
async function iaSetCasa(pid) {
  if (iaDirtyAny() && !confirm('⚠ Tenés cambios sin guardar en Parámetros del modelo. ¿Cambiar de casa igual y perderlos?')) return;
  IA.casa = pid; await iaLoadCasa(pid); osRender();
}
window.iaSetCasa = iaSetCasa;
// ─── guardado por bloque + overrides (ajustes Juan v3) ───
function iaDirtyAny() { return Object.keys(IA.pDirty || {}).length > 0; }
function iaGoTab(t) {
  if (iaDirtyAny() && !confirm('⚠ Tenés cambios sin guardar en Parámetros del modelo. ¿Salir igual y perderlos?')) return;
  IA.pDirty = {}; IA.tab = t; osRender();
}
window.iaGoTab = iaGoTab;
function iaDirty(bid) {
  (IA.pDirty = IA.pDirty || {})[bid] = 1;
  const el = document.getElementById('ia-bst-' + bid);
  if (el) { el.textContent = '● sin guardar'; el.style.color = 'var(--amber)'; }
}
window.iaDirty = iaDirty;
if (!window._iaBeforeUnload) {
  window._iaBeforeUnload = 1;
  window.addEventListener('beforeunload', e => { if (window.IA && iaDirtyAny()) { e.preventDefault(); e.returnValue = ''; } });
}
// ¿el parámetro es AUTO (viene de Airtable/espejo)? → editarlo NO pisa la fuente: va a override
function iaEsAuto(p) { return /^real:|^excel/.test(p.fuente || '') && !/^real:manual/.test(p.fuente || ''); }
async function iaPersistParam(p, val) {
  if (p._ov || iaEsAuto(p)) {
    const row = { property_id: IA.casa, key: p.key, valor: val, valor_origen: p._base != null ? p._base : p.value, fuente_origen: p.fuente || null, tipo: 'override_de_auto', editado_por: IA.email || null, active: true, archived_at: null, updated_at: new Date().toISOString() };
    return (await sb.from('inv_param_overrides').upsert(row, { onConflict: 'property_id,key' })).error;
  }
  return (await sb.from('inv_model_params').update({ value: val, updated_at: new Date().toISOString() }).eq('property_id', IA.casa).eq('key', p.key)).error;
}
async function iaSaveBloque(bid) {
  const b = IA_BLOQUES.find(x => x[0] === bid);
  const rows = IA.params.filter(p => bid === 'b0' ? !IA_BLOQUES.some(x => x[2].test(p.key)) : (b && b[2].test(p.key)));
  let n = 0; const errs = [];
  for (const p of rows) {
    const el = document.getElementById('ia-p-' + p.key);
    if (!el) continue;
    const val = el.value.trim();
    if (val === String(p.value)) continue;
    const error = await iaPersistParam(p, val);
    if (error) errs.push(p.key + ': ' + error.message); else n++;
  }
  delete (IA.pDirty = IA.pDirty || {})[bid];
  (IA.pSaved = IA.pSaved || {})[bid] = true;
  if (errs.length) return alert('Errores guardando:\n' + errs.join('\n'));
  if (window.toast) toast(n ? '💾 ' + n + ' parámetro(s) guardados — los auto quedan como override reversible, todo en el audit' : '✓ Sin cambios en este bloque', 'success');
  await iaLoadCasa(IA.casa); osRender();
}
window.iaSaveBloque = iaSaveBloque;
async function iaRevertOverride(key) {
  if (!confirm('↩ ¿Volver al valor de origen (' + ((IA.ovr[key] || {}).valor_origen != null ? IA.ovr[key].valor_origen : '—') + ')? El override se archiva (queda en el audit).')) return;
  const { error } = await sb.from('inv_param_overrides').update({ active: false, archived_at: new Date().toISOString() }).eq('property_id', IA.casa).eq('key', key);
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('↩ ' + key + ' volvió al valor de la fuente', 'success');
  await iaLoadCasa(IA.casa); osRender();
}
window.iaRevertOverride = iaRevertOverride;

function iaInvName(id) {
  const x = IA.investors.find(i => i.airtable_id === id); if (x) return x.name;
  const a = (IA.access || []).find(y => y.investor_airtable_id === id); // inversionista MANUAL (app-side)
  return a && a.nombre ? a.nombre : id;
}
// opciones de inversionista para selects: sincronizados de Airtable + manuales (app-side)
function iaInvOptions() {
  const man = (IA.access || []).filter(a => a.origen === 'manual' && a.active);
  return IA.investors.map(i => '<option value="' + i.airtable_id + '">' + OS_E(i.name || i.airtable_id) + '</option>').join('')
    + man.map(a => '<option value="' + OS_E(a.investor_airtable_id) + '">✍️ ' + OS_E(a.nombre || a.email) + ' (manual)</option>').join('');
}
function iaCasaName(pid) { const d = IA.deals.find(x => x.property_id === pid); return d ? (d.address || '').split(',')[0] : (pid || '').slice(0, 8); }

// ─── acciones ───
async function iaCrearAcceso() {
  const invId = document.getElementById('ia-acc-inv').value;
  const email = (document.getElementById('ia-acc-email').value || '').trim().toLowerCase();
  if (!invId || !email) return alert('Elegí inversionista y email');
  const inv = IA.investors.find(i => i.airtable_id === invId);
  const { error } = await sb.from('inv_access').insert({ investor_airtable_id: invId, email, estado: 'invitado', origen: 'airtable', nombre: inv ? inv.name : null, created_by: IA.email || null });
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Acceso creado. Mandale el link con "✉️ Invitar".', 'success');
  await iaLoad(true);
}
window.iaCrearAcceso = iaCrearAcceso;
// acceso MANUAL (nombre+email, sin Airtable ni sync): inversionista app-side, RLS igual —
// solo verá las casas que se le asignen en Casas & reparto (o ninguna hasta asignarle)
async function iaCrearAccesoManual() {
  const nombre = ((document.getElementById('ia-accm-nombre') || {}).value || '').trim();
  const email = ((document.getElementById('ia-accm-email') || {}).value || '').trim().toLowerCase();
  if (!nombre || !email) return alert('Nombre y email son obligatorios');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert('Email inválido');
  const id = 'manual-' + Math.random().toString(36).slice(2, 10);
  const { error } = await sb.from('inv_access').insert({ investor_airtable_id: id, email, nombre, estado: 'invitado', origen: 'manual', created_by: IA.email || null });
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Acceso manual creado (' + nombre + '). Asignale casas en 🏠 Casas & reparto y mandale "✉️ Invitar".', 'success');
  await iaLoad(true);
}
window.iaCrearAccesoManual = iaCrearAccesoManual;
function iaAccMode(m) { IA.accMode = m; osRender(); }
window.iaAccMode = iaAccMode;
// vincular un acceso manual a un inversionista de Airtable cuando aparece en el sync
async function iaLinkManual(accId, oldId) {
  const sel = document.getElementById('ia-link-' + accId); if (!sel || !sel.value) return alert('Elegí el inversionista de Airtable');
  const newId = sel.value;
  if (!confirm('¿Vincular este acceso manual a "' + iaInvName(newId) + '" (Airtable)? Sus casas, distribuciones, documentos y mensajes se re-apuntan al registro de Airtable.')) return;
  const { error } = await sb.from('inv_access').update({ investor_airtable_id: newId, origen: 'airtable' }).eq('id', accId);
  if (error) return alert('Error: ' + error.message);
  for (const t of ['inv_holdings', 'inv_distributions', 'inv_documents', 'inv_messages']) {
    const r = await sb.from(t).update({ investor_airtable_id: newId }).eq('investor_airtable_id', oldId);
    if (r.error) alert('⚠ ' + t + ': ' + r.error.message);
  }
  IA.linkEdit = null;
  if (window.toast) toast('⇄ Vinculado al registro de Airtable (todo re-apuntado, queda en el audit)', 'success');
  await iaLoad(true);
}
window.iaLinkManual = iaLinkManual;
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
  // ruta única de guardado (Enter en una fila): manual → update directo · auto → OVERRIDE
  const el = document.getElementById('ia-p-' + key); if (!el) return;
  const p = IA.params.find(x => x.key === key); if (!p) return;
  const error = await iaPersistParam(p, el.value.trim());
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ ' + key + ' guardado' + (iaEsAuto(p) || p._ov ? ' como override (la fuente no se pisa — ↩ reversible)' : ''), 'success');
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
// Alta directa de un campo de lista cerrada (estrategia/plan_salida): crea la fila vacía
// para que aparezca el <select> listo para elegir — sin obligar a teclear texto libre.
async function iaAddSelectParam(key, desc) {
  const row = { property_id: IA.casa, key, value: '', fuente: 'manual', descripcion: desc || null };
  const { error } = await sb.from('inv_model_params').upsert(row, { onConflict: 'property_id,key' });
  if (error) return alert('Error: ' + error.message);
  if (!IA.pOpen) IA.pOpen = {}; IA.pOpen.b2 = true;
  await iaLoadCasa(IA.casa); osRender();
}
window.iaAddSelectParam = iaAddSelectParam;
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
  let cat = g('ia-m-cat') || 'operativo';
  // E1B: un draw JAMÁS es P&L SÍ — siempre financiero (advertencia + corrección automática)
  if (/draw/i.test(g('ia-m-conc') + ' ' + g('ia-m-item')) && iaPnl(cat)) {
    alert('⚠ Los draws SIEMPRE son financiero · P&L NO (no afectan el balance operativo). Se guarda como financiero.');
    cat = 'financiero';
  }
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
  let cat = g('cat') || 'operativo';
  if (/draw/i.test(g('conc')) && iaPnl(cat)) {
    alert('⚠ Los draws SIEMPRE son financiero · P&L NO. Se guarda como financiero.');
    cat = 'financiero';
  }
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
function iaEngineParamsFromRows(rows, holdingPct, movs) {
  const P = {}; rows.forEach(r => P[r.key] = r);
  const g = (k, d) => { const r = P[k]; const v = r ? parseFloat(r.value) : NaN; return isNaN(v) ? d : v; };
  const draws = {}, otros = {};
  rows.forEach(r => { let m = r.key.match(/^draw_m(\d+)$/); if (m) draws[+m[1]] = parseFloat(r.value) || 0; m = r.key.match(/^otros_inv_m(\d+)$/); if (m) otros[+m[1]] = parseFloat(r.value) || 0; });
  // E2: draws desde los movimientos migrados; hm_compra reemplaza a hm_inicial en el motor
  const drawsEf = Object.keys(draws).length ? draws : invEngine.drawsFromMovs(movs || IA.cashflow || [], P.fecha_cierre ? P.fecha_cierre.value : null);
  return { compra: g('compra', 0), cierreCompra: g('cierre_compra', 0), hmInicial: g('hm_compra', g('hm_inicial', 0)), hmTasa: g('hm_tasa', 0), draws: drawsEf, otrosInversionMes: otros,
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
  return iaEngineParamsFromRows(IA.params, h ? +h.reparto_pct : null, IA.cashflow);
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
  const [d, m, dl, pj, dc, ind, gl] = await Promise.all([
    sb.from('inv_distributions').select('*').eq('active', true).order('fecha', { ascending: false }),
    sb.from('inv_messages').select('*').eq('active', true).order('created_at', { ascending: false }).limit(100),
    sb.from('inv_deals').select('*').eq('active', true),
    sb.from('inv_projection').select('property_id,escenario,data,computed_at').eq('active', true).eq('escenario', 'proyectado'),
    sb.from('inv_documents').select('*').eq('active', true).order('created_at', { ascending: false }),
    sb.rpc('inv_indicadores_data').then(r => r.data || []).catch(() => []),
    sb.from('glosario_terminos').select('*').eq('active', true).then(r => r.data || []).catch(() => []),
  ]);
  IA.dists = d.data || []; IA.msgs = m.data || []; IA.deals2 = dl.data || []; IA.proj = pj.data || []; IA.docsAll = dc.data || [];
  IA.indData = ind || []; IA.glos = gl || [];
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
  const invOpts = '<option value="">🏠 Todos los inversionistas de la casa</option>' + iaInvOptions();
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
  const row = { investor_airtable_id: g('ia-d-inv'), property_id: g('ia-d-casa'), fecha: g('ia-d-fecha'), tipo: g('ia-d-tipo') || 'utilidad', monto: parseFloat(g('ia-d-monto')) || 0, estado: g('ia-d-estado') || 'programada', comprobante_url: g('ia-d-comp') || null, k1_url: g('ia-d-k1') || null };
  if (!row.investor_airtable_id || !row.property_id || !row.fecha || !row.monto) return alert('Inversionista, casa, fecha y monto son obligatorios');
  const { error } = await sb.from('inv_distributions').insert(row);
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Distribución creada — los links quedan visibles en la fila', 'success');
  await iaLoadProducto(); osRender();
}
window.iaCrearDist = iaCrearDist;
function iaEditDist(id) { IA.distEdit = id; osRender(); }
window.iaEditDist = iaEditDist;
async function iaSaveDist(id) {
  const g = k => (document.getElementById('ia-de-' + k) || {}).value || '';
  const upd = { fecha: g('fecha'), tipo: g('tipo') || 'utilidad', monto: parseFloat(g('monto')) || 0, comprobante_url: g('comp') || null, k1_url: g('k1') || null };
  if (!upd.fecha || !upd.monto) return alert('Fecha y monto son obligatorios');
  const { error } = await sb.from('inv_distributions').update(upd).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  IA.distEdit = null;
  if (window.toast) toast('✓ Distribución editada (antes→después en el audit)', 'success');
  await iaLoadProducto(); osRender();
}
window.iaSaveDist = iaSaveDist;
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
  const invOpts = iaInvOptions();
  const casaOpts = [...new Set(IA.holdings.map(h => h.property_id))].map(c => '<option value="' + c + '">' + OS_E(iaCasaName(c)) + '</option>').join('');
  const linkTag = (url, lbl) => url ? '<a href="' + OS_E(url) + '" target="_blank" style="color:var(--a2);white-space:nowrap">' + lbl + ' ↗</a>' : '<span class="meta">—</span>';
  const editRow = d => {
    if (IA.distEdit !== d.id) return '';
    return '<tr><td colspan="8" style="background:var(--glass)"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">'
      + '<input id="ia-de-fecha" type="date" class="osa-in" value="' + OS_E(d.fecha) + '">'
      + '<select id="ia-de-tipo" class="osa-in">' + ['utilidad', 'refi', 'venta', 'devolucion_capital'].map(t => '<option' + (d.tipo === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>'
      + '<input id="ia-de-monto" type="number" class="osa-in" value="' + OS_E(d.monto) + '">'
      + '<input id="ia-de-comp" class="osa-in" placeholder="URL comprobante de pago (Drive)" value="' + OS_E(d.comprobante_url || '') + '" style="grid-column:span 2">'
      + '<input id="ia-de-k1" class="osa-in" placeholder="URL del K-1" value="' + OS_E(d.k1_url || '') + '">'
      + '</div><div style="display:flex;gap:6px;margin-top:8px"><button class="cbtn" style="padding:6px 12px" onclick="iaSaveDist(\'' + d.id + '\')">💾 Guardar</button><button class="ct-btn" onclick="IA.distEdit=null;osRender()">Cancelar</button></div></td></tr>';
  };
  return '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">➕ Nueva distribución</div><div class="k">comprobante de pago (soporte) ≠ K-1 (fiscal) — ambos se guardan y se VEN como links</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
    + '<select id="ia-d-inv" class="osa-in">' + invOpts + '</select>'
    + '<select id="ia-d-casa" class="osa-in">' + casaOpts + '</select>'
    + '<input id="ia-d-fecha" type="date" class="osa-in">'
    + '<input id="ia-d-monto" type="number" class="osa-in" placeholder="monto $">'
    + '<select id="ia-d-tipo" class="osa-in"><option>utilidad</option><option>refi</option><option>venta</option><option>devolucion_capital</option></select>'
    + '<select id="ia-d-estado" class="osa-in"><option>programada</option><option>pagada</option></select>'
    + '<input id="ia-d-comp" class="osa-in" placeholder="URL comprobante de pago (recomendado)" style="grid-column:span 2">'
    + '<input id="ia-d-k1" class="osa-in" placeholder="URL del K-1 (opcional)" style="grid-column:span 2">'
    + '</div><button class="cbtn" style="margin-top:10px" onclick="iaCrearDist()">Crear</button></div>'
    + '<div class="card overx"><div class="chart-h"><div class="t">Distribuciones (' + (IA.dists || []).length + ')</div><div class="k">✎ editar (queda en el audit) · ⏸ soft-delete</div></div>'
    + '<table class="ptable"><thead><tr><th>Inversionista</th><th>Casa</th><th>Fecha</th><th>Tipo</th><th style="text-align:right">Monto</th><th>Links</th><th>Estado</th><th style="text-align:right"></th></tr></thead><tbody>'
    + ((IA.dists || []).map(d => editRow(d) + '<tr><td>' + OS_E(iaInvName(d.investor_airtable_id)) + '</td><td>' + OS_E(iaCasaName(d.property_id)) + '</td><td style="white-space:nowrap">' + OS_E(d.fecha) + '</td><td>' + OS_E(d.tipo) + '</td>'
      + '<td style="text-align:right">' + iaMoney(d.monto) + '</td>'
      + '<td style="font-size:11px">' + linkTag(d.comprobante_url, '📎 pago') + ' · ' + linkTag(d.k1_url, '📄 K-1') + '</td>'
      + '<td>' + (d.estado === 'pagada' ? '<span class="badge b-ok">pagada</span>' : '<span class="badge b-warn">programada</span> <button class="ct-btn" style="padding:2px 7px;font-size:9px" onclick="iaDistEstado(\'' + d.id + '\',\'pagada\')">✓ pagar</button>') + '</td>'
      + '<td style="text-align:right;white-space:nowrap"><button class="ct-btn" style="padding:2px 7px" onclick="iaEditDist(\'' + d.id + '\')">✎</button><button class="ct-btn" style="color:var(--neg);padding:2px 7px" onclick="iaDelDist(\'' + d.id + '\')">⏸</button></td></tr>').join('') || '<tr><td colspan="8" class="empty">Sin distribuciones.</td></tr>')
    + '</tbody></table></div>';
}
function iaTabMsgs() {
  const invOpts = iaInvOptions();
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
// ─── 📈 E4: portafolio (XIRR, múltiplos, LTV) — cálculo compartido os/inv-indicadores.js ───
function iaPctI(v) { return v == null ? 'n/a' : (v * 100).toFixed(1) + '%'; }
function iaXI(v) { return v == null ? '—' : v.toFixed(2) + 'x'; }
function iaSecPortafolioE4() {
  if (!window.invInd || !(IA.indData || []).length) return '';
  const hoy = new Date().toISOString().slice(0, 10);
  const rows = IA.indData;
  const casas = rows.map(r => invInd.casa(r, hoy));
  const port = invInd.portfolio(rows, hoy);
  // agregados de inversionistas (DPI/RVPI/TVPI del fondo): capital y dists de TODOS
  const capTotal = IA.holdings.reduce((s, h) => s + (+h.inversion_aportada || 0), 0);
  const distPag = (IA.dists || []).filter(d => d.estado === 'pagada').reduce((s, d) => s + (+d.monto || 0), 0);
  let residual = 0;
  IA.holdings.forEach(h => { const ci = casas.find(x => x.property_id === h.property_id); if (ci && ci.equityHoy != null) residual += Math.max(0, ci.equityHoy) * (+h.reparto_pct || 0); });
  const dpi = capTotal ? distPag / capTotal : null, rvpi = capTotal ? residual / capTotal : null;
  const sem = c => c.ltvSem == null ? '' : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;background:' + (c.ltvSem === 'verde' ? 'var(--pos)' : c.ltvSem === 'ambar' ? 'var(--amber)' : 'var(--neg)') + '"></span>';
  const kpi = (lab, val, meta) => '<div class="card"><div class="lab">' + lab + '</div><div class="big">' + val + '</div>' + (meta ? '<div class="meta">' + meta + '</div>' : '') + '</div>';
  const tabla = '<div class="card overx" style="margin-top:14px"><div class="chart-h"><div class="t">Indicadores por casa (papel · corte ' + hoy + ')</div><div class="k">TIR = (V/C)^(365/días)−1 · vendidas con precio real en su fecha</div></div>'
    + '<table class="ptable"><thead><tr><th>Casa</th><th>Etapa</th><th style="text-align:right">All-in</th><th style="text-align:right">Valor papel</th><th>Fuente</th><th style="text-align:right">TIR</th><th style="text-align:right">×All-in</th><th style="text-align:right">×Equity</th><th style="text-align:right">LTV</th><th style="text-align:right">Yield</th><th style="text-align:right">Aprec./año</th></tr></thead><tbody>'
    + casas.slice().sort((a, b) => (b.tirActivo || -9) - (a.tirActivo || -9)).map(c => '<tr' + (c.porCompletar ? ' style="opacity:.6"' : '') + '><td>' + OS_E(c.casa) + '</td><td class="meta">' + OS_E(c.etapa || '—') + '</td>'
      + '<td style="text-align:right">' + iaMoney(c.all_in) + '</td><td style="text-align:right">' + iaMoney(c.paper_value) + '</td><td class="meta" style="font-size:10px">' + OS_E(c.paper_fuente || '') + '</td>'
      + '<td style="text-align:right" class="' + (c.tirActivo > 0 ? 'up' : 'down') + '">' + (c.tirNA ? 'n/a' : iaPctI(c.tirActivo)) + '</td>'
      + '<td style="text-align:right">' + iaXI(c.multAllIn) + '</td>'
      + '<td style="text-align:right">' + (c.porCompletar ? '<span class="badge b-warn" style="font-size:8px">por completar</span>' : (c.equityLeq0 ? '<span title="la deuda financió todo — el retorno sale de la valorización">equity ≤ 0</span>' : iaXI(c.multEquity))) + '</td>'
      + '<td style="text-align:right">' + sem(c) + iaPctI(c.ltv) + '</td>'
      + '<td style="text-align:right">' + iaPctI(c.yieldOnCost) + '</td><td style="text-align:right">' + iaPctI(c.aprecAnual) + '</td></tr>').join('')
    + '</tbody></table>'
    + (port.porCompletar.length ? '<div style="margin-top:10px;padding:9px 12px;border:1px solid rgba(245,178,61,.45);background:rgba(245,178,61,.08);border-radius:9px;font-size:11.5px">📋 <b>Por completar — deuda HML (' + port.porCompletar.length + ' casas)</b>: los montos salen de los <b>term sheets reales</b> que Juan carga en Airtable → "Datos por casa" (jamás se inventan). Al cargarlos, el sync los trae y el múltiplo se recalcula solo.<div style="margin-top:5px;display:flex;gap:8px;flex-wrap:wrap">'
      + port.porCompletar.map(r => '<a href="https://airtable.com/applMXFyPq1hXj7iN/' + (r.at_loan_id ? 'tbluy4xlHJav9RtrZ/' + OS_E(r.at_loan_id) : 'tblw28KVOUcCAKZBU/' + OS_E(r.at_deal_id || '')) + '" target="_blank" rel="noopener" style="color:var(--a2);text-decoration:none;border:1px solid var(--glassb);border-radius:7px;padding:3px 9px;font-size:11px" title="' + (r.at_loan_id ? 'abrir su registro en Datos por casa' : 'abrir la casa en Propiedades — crearle su registro de Datos por casa') + '">🔗 ' + OS_E(r.casa) + (r.at_loan_id ? '' : ' <span style="opacity:.7">(sin registro aún)</span>') + '</a>').join('')
      + '</div></div>' : '')
    + '</div>';
  return '<div class="card" style="margin-bottom:14px;border-color:rgba(245,178,61,.4)"><div style="font-size:12px;color:var(--amber)">📄 Indicadores sobre <b>valor en papel</b> (appraisal/ARV) — no incluyen rentas, intereses ni gastos; no son ganancias realizadas hasta la venta o refi. Vendidas usan precio REAL en su fecha (Arcadia $615,000 · 2026-05-04); Slaughter usa ARV como proxy (precio de venta por completar).</div></div>'
    + '<div class="grid k4">'
    + kpi('XIRR portafolio (all-in)', iaPctI(port.xirrAllIn), port.n + ' casas · flujos compra→papel/venta [inv_indicadores_data]')
    + kpi('XIRR solo compra', iaPctI(port.xirrCompra), 'sin contar la obra (draws)')
    + kpi('Múltiplo sobre equity', iaXI(port.multEquity), '(papel − deuda) ÷ (all-in − HML) · ' + port.nConDeuda + ' casas con deuda')
    + kpi('LTV promedio ponderado', iaPctI(port.ltvPond), 'deuda vigente ÷ valor papel')
    + '</div><div class="grid k4" style="margin-top:10px">'
    + kpi('Inversión total (all-in)', iaMoney(port.invTotal), 'compra + draws de todas las casas')
    + kpi('Valor papel total', iaMoney(port.paperTotal), 'appraisal/ARV + ventas reales')
    + kpi('Equity invertido → hoy', iaMoney(port.equityInv) + ' → ' + iaMoney(port.equityHoy), 'plata propia vs lo que vale hoy')
    + kpi('Fondo: DPI · RVPI · TVPI', (dpi != null ? dpi.toFixed(2) : '—') + 'x · ' + (rvpi != null ? rvpi.toFixed(2) : '—') + 'x · ' + (dpi != null && rvpi != null ? (dpi + rvpi).toFixed(2) : '—') + 'x', 'Σ dists pagadas / Σ capital · residual en papel')
    + '</div>' + tabla;
}
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
  return iaSecPortafolioE4() + '<div class="grid k4" style="margin-top:14px">'
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
  // ── E1: saldo OPERATIVO = SOLO movimientos P&L SÍ (regla única invEngine.pnlSi) ──
  const pnl = m => invEngine.pnlSi(m.categoria);
  // acumulado sobre TODO el historial: las filas P&L NO repiten el saldo anterior
  let acum = 0;
  const full = led.map(m => { if (pnl(m)) acum += (m.tipo === "ingreso" ? 1 : -1) * (+m.monto || 0); return { ...m, acum, pnl: pnl(m) }; });
  // filtro de MES ("Julio 2026", solo meses con movimientos, default Todos)
  const mesesAll = [...new Set(led.map(m => String(m.fecha || "").slice(0, 7)))].filter(Boolean).sort().reverse();
  const mf = IA.ledgerMes && mesesAll.includes(IA.ledgerMes) ? IA.ledgerMes : "todos";
  const mesSel = "<select class=\"osa-in\" style=\"padding:6px\" onchange=\"IA.ledgerMes=this.value;osRender()\"><option value=\"todos\">Todos los meses</option>" + mesesAll.map(m => "<option value=\"" + m + "\"" + (mf === m ? " selected" : "") + ">" + invEngine.mesEs(m) + "</option>").join("") + "</select>";
  const vis = full.filter(m => mf === "todos" || String(m.fecha || "").startsWith(mf));
  const saldoPer = vis.filter(m => m.pnl).reduce((s2, m) => s2 + (m.tipo === "ingreso" ? 1 : -1) * (+m.monto || 0), 0);
  const cats = {};
  vis.forEach(m => { const k = m.tipo + ":" + m.categoria; cats[k] = (cats[k] || 0) + +m.monto; });
  const subt = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => "<div class=\"kv\"><span>" + OS_E(k.replace(":", " · ")) + (invEngine.pnlSi(k.split(":")[1]) ? "" : " <span class=\"badge b-warn\" style=\"font-size:8px\" title=\"informativo — no afecta balance operativo\">P&L NO</span>") + "</span><b class=\"" + (k.startsWith("ingreso") ? "up" : "down") + "\">" + iaMoney(v) + "</b></div>").join("");
  const tagNo = "<span class=\"badge b-warn\" style=\"font-size:8px\" title=\"informativo — no afecta balance operativo\">P&L NO</span>";
  return "<div style=\"display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap\">" + casaSel + mesSel
    + "<span style=\"font-size:14px;font-weight:800\">Saldo operativo (P&L)" + (mf === "todos" ? "" : " · " + OS_E(invEngine.mesEs(mf))) + ": <span style=\"color:" + (saldoPer >= 0 ? "var(--pos)" : "var(--neg)") + "\">" + iaMoney(saldoPer) + "</span></span>"
    + "<span class=\"meta\">" + vis.length + " movimientos · solo P&L SÍ mueve el saldo (inversión/financiero/distribución = informativos) · <b>SOLO LECTURA</b> — se edita en 📐 Modelo & movimientos</span></div>"
    + "<div class=\"grid k2\"><div class=\"card\"><div class=\"chart-h\"><div class=\"t\">Subtotales por categoría</div></div>" + subt + "</div>"
    + "<div class=\"card\"><div class=\"chart-h\"><div class=\"t\">Fuentes</div></div>"
    + Object.entries(vis.reduce((a, m) => { a[m.fuente] = (a[m.fuente] || 0) + 1; return a; }, {})).map(([f, n]) => "<div class=\"kv\"><span>" + OS_E(f) + "</span><b>" + n + " movs</b></div>").join("") + "</div></div>"
    + "<div class=\"card overx\" style=\"margin-top:14px\"><table class=\"ptable\"><thead><tr><th>Fecha</th><th>Concepto</th><th>Cat.</th><th style=\"text-align:right\">Monto</th><th style=\"text-align:right\">Saldo operativo</th><th>Fuente</th></tr></thead><tbody>"
    + vis.slice().reverse().map(m => "<tr" + (m.pnl ? "" : " style=\"opacity:.55\"") + "><td style=\"white-space:nowrap\">" + OS_E(m.fecha) + "</td><td>" + OS_E(m.concepto) + (m.pnl ? "" : " " + tagNo) + (m.comprobante ? " <a href=\"" + OS_E(m.comprobante) + "\" target=\"_blank\">📎</a>" : "") + "</td><td>" + OS_E(m.categoria) + "</td>"
      + "<td style=\"text-align:right\" class=\"" + (m.tipo === "ingreso" ? "up" : "down") + "\">" + (m.tipo === "ingreso" ? "+" : "−") + iaMoney(m.monto) + "</td>"
      + "<td style=\"text-align:right;color:" + (m.acum >= 0 ? "var(--pos)" : "var(--neg)") + "\"" + (m.pnl ? "" : " title=\"P&L NO: repite el saldo anterior\"") + ">" + iaMoney(m.acum) + "</td><td class=\"meta\">" + OS_E(m.fuente) + "</td></tr>").join("")
    + "</tbody></table></div>";
}

// ── B: parámetros en los 9 BLOQUES de Juan (colapsables; mayoría auto-llenada con su fuente) ──
const IA_BLOQUES = [
  ['b1', '🏠 1 · Identificación', /^(direccion|nombre_corto|tipo|num_hab|banos|sqft|ano)$/],
  ['b2', '🎯 2 · Estrategia y estado', /^(estrategia|estado_casa|plan_salida|modelo_operativo|fecha_cierre|fecha_exit|fecha_exit_proyectada|es_ejemplo)$/],
  ['b3', '💰 3 · Financieros de compra', /^(compra|remodel_real|cierre_compra|arv|est_arv|est_remodel_total|est_cierre_pct|cash_atrapado_real)$/],
  ['b4', '🏦 4 · Financiamiento HML', /^(hm_compra|hm_rehab|hm_tasa|hm_plazo|hm_fecha_inicio|hm_puntos|otros_inv_m\d+)$/],
  ['b5', '🏛️ 5 · Refinanciación', /^(refi_|cierre_refi|cashout_real)/],
  ['b6', '👥 6 · Inversionistas y equity', /^(reparto_inv)$/],
  ['b7', '📊 7 · Operación mensual', /^(arriendo_hab|rampa|ocupacion_estable|piso_servicios|vacancy|servicios_mes|mantenimiento_mes|hoa_mes|seguro_mes|padsplit_pct|comision_pct|imp_propiedad_pct|imp_renta_pct)$/],
  ['b8', '📈 8 · Supuestos (manual)', /^(valorizacion|inflacion|retorno_esperado|anios|ciclo_meses|postrefi_perfil|util_anual_postrefi|anio0_postrefi)$/],
  ['b9', '🎯 9 · Metas del deal (manual)', /^(tir_objetivo|cap_objetivo|fecha_breakeven|fecha_recuperacion)$/],
];
const IA_METAS_KEYS = ['tir_objetivo', 'cap_objetivo', 'fecha_breakeven', 'fecha_recuperacion'];
function iaTogglePB(id) { IA.pOpen = IA.pOpen || { b1: true }; IA.pOpen[id] = !IA.pOpen[id]; osRender(); }
window.iaTogglePB = iaTogglePB;
// ─── ORIGEN claro de cada parámetro (duda de Juan: "auto" era ambiguo) ───
// real · Airtable (tabla) = dato real traído de la base · estimado · calculado = lo estima el
// modelo (no hay dato real todavía) · manual = lo cargás vos · manual · override = ajuste tuyo
// SOBRE un auto (reversible ↩, la fuente no se pisa).
const IA_FTAB = { ff_deals: 'Airtable FF · Propiedades', ff_draws: 'Airtable FF · Desglose Draws', ff_hml_loans: 'Airtable FF · Datos por casa', ff_hml_payments: 'Airtable FF · Pagos interes (HML & REFI)' };
function iaOrigen(p) {
  if (p._ov) return { st: 'background:rgba(192,132,252,.16);color:#c084fc', lab: 'manual · override', tip: 'ajustado a mano sobre el valor de origen (' + (p._base != null ? p._base : '—') + ' · ' + (p.fuente || '') + ') — reversible con ↩' };
  const f = p.fuente || '';
  if (/^(manual|real:manual)/.test(f)) return { st: 'background:rgba(192,132,252,.16);color:#c084fc', lab: 'manual', tip: 'lo cargás vos [' + f + ']' };
  if (/\(estimado\)/.test(f)) return { st: 'background:rgba(58,160,255,.14);color:#3aa0ff', lab: /^draw_m/.test(p.key) ? 'estimado · repartido en partes iguales' : 'estimado · calculado', tip: (p.descripcion || 'el modelo lo estima — cuando el dato real se cargue en Airtable, lo reemplaza') + ' [' + f + ']' };
  if (/\(derivado/.test(f)) return { st: 'background:rgba(58,160,255,.14);color:#3aa0ff', lab: 'estimado · calculado', tip: 'derivado de datos reales: ' + (p.descripcion || '') + ' [' + f + ']' };
  if (/^(supuesto|modelo|estructura|default|seed|real:calc)/.test(f)) return { st: 'background:rgba(58,160,255,.14);color:#3aa0ff', lab: 'estimado · ' + (f === 'supuesto' ? 'supuesto' : 'calculado'), tip: 'premisa del modelo (no hay dato real todavía) [' + f + ']' };
  if (/^excel/.test(f)) return { st: '', cls: 'b-ok', lab: 'real · Excel calibrado', tip: 'calibrado contra el Excel "Renta VF" [' + f + ']' };
  const m = f.match(/^real:([a-z_]+)/);
  if (m) return { st: '', cls: 'b-ok', lab: 'real · ' + (IA_FTAB[m[1]] || m[1]), tip: 'dato REAL traído de la base [' + f + ']' };
  return { st: 'background:rgba(58,160,255,.14);color:#3aa0ff', lab: 'estimado', tip: f || 'sin fuente declarada' };
}
function iaOrigenBadge(p) {
  const o = iaOrigen(p);
  return '<span class="badge ' + (o.cls || '') + '" style="font-size:8px;' + (o.st || '') + '" title="' + OS_E(o.tip) + '">' + OS_E(o.lab) + '</span>';
}
// ⓘ explicador por parámetro: qué es + fórmula + de dónde sale (en cristiano)
const IA_PINFO = {
  compra: ['Precio de compra de la casa (lo que se pagó al cierre).'],
  remodel_real: ['Costo REAL de la remodelación (lo que cobró la empresa de Remodelación).'],
  cierre_compra: ['Gastos de cierre de la COMPRA: título, escrow, fees del prestamista.'],
  arv: ['Valor de la casa ya remodelada (After Repair Value) — la base del refi.', 'préstamo refi ≈ ARV × % del banco'],
  est_arv: ['ARV que se usó en el underwriting original (escenario Estimado).'],
  est_remodel_total: ['Remodelación estimada del underwriting original.'],
  est_cierre_pct: ['% de originación estimado del underwriting.'],
  cash_atrapado_real: ['Plata propia que quedó atrapada en el deal después del refi (año 0 oficial de TIR/VPN).'],
  hm_inicial: ['Plata del Hard Money desembolsada AL CIERRE (sin draws).', 'monto_hml − Σ draws'],
  hm_compra: ['HML para COMPRA: lo que el Hard Money desembolsó al cierre para comprar la casa.', 'hm_inicial (HML total) = hm_compra + hm_rehab'],
  hm_rehab: ['HML para REHAB: el escrow del Hard Money reservado para la obra (se libera en draws).', 'los draws ejecutados viven como movimientos "Draws (construcción)" — no deberían superar este monto'],
  hm_puntos: ['Puntos de originación del Hard Money (% del préstamo cobrado al cierre).'],
  hm_fecha_inicio: ['Fecha de inicio del préstamo Hard Money.'],
  fecha_exit_proyectada: ['Fecha ESTIMADA de salida del deal (venta o refi) — supuesto, no compromiso.'],
  hm_tasa: ['Tasa anual del Hard Money (solo interés).', 'interés mensual = préstamo × tasa ÷ 12'],
  hm_plazo: ['Plazo del Hard Money en meses.'],
  refi_mes: ['Mes del ciclo en que la casa se refinancia (entra el banco a 30 años y se paga el HML).'],
  refi_monto: ['Monto del préstamo del refi (banco 30 años).', '≈ valor tasado × % que presta el banco'],
  refi_tasa: ['Tasa anual del préstamo refi (fracción: 0.07125 = 7.125%).'],
  refi_plazo_m: ['Plazo del refi en MESES (360 = 30 años).'],
  cierre_refi: ['Costos de cierre del refi (fees, título, prepagados, escrows).'],
  cashout_real: ['Cash-out REAL que entró con el refi (préstamo − payoff HML − costos).'],
  refi_lender: ['Prestamista del refi (banco de los 30 años).'],
  reparto_inv: ['Participación del inversionista en la casa (fracción: 0.5 = 50%).'],
  num_hab: ['Número de habitaciones rentables (modelo por habitaciones).'],
  arriendo_hab: ['Renta mensual por habitación.', 'ingreso = num_hab × arriendo_hab × ocupación'],
  rampa: ['Ocupación mes a mes del arranque (lista separada por comas, 0 a 1).'],
  ocupacion_estable: ['Ocupación de crucero una vez estabilizada (fracción).'],
  piso_servicios: ['Piso de servicios: mínimo de gasto aunque la ocupación baje (fracción del gasto).'],
  mantenimiento_mes: ['Mantenimiento mensual presupuestado.'],
  servicios_mes: ['Servicios públicos mensuales (luz, agua, gas, internet).'],
  hoa_mes: ['Cuota mensual de la HOA (si aplica).'],
  seguro_mes: ['Seguro mensual de la propiedad.'],
  padsplit_pct: ['Comisión de la plataforma (PadSplit) como % del ingreso.'],
  comision_pct: ['Comisión de administración como % del ingreso.'],
  imp_propiedad_pct: ['Impuesto a la propiedad, % ANUAL sobre el avalúo.', 'impuesto = avalúo × % ÷ 12 por mes'],
  imp_renta_pct: ['Impuesto a la renta sobre la utilidad (si está en 0, apagado).'],
  valorizacion: ['Apreciación anual del valor de la casa (fracción: 0.053 = 5.3%).'],
  inflacion: ['Inflación anual aplicada a rentas y gastos.'],
  retorno_esperado: ['Tu retorno alternativo — la tasa de descuento del VPN.'],
  anios: ['Horizonte del análisis (31 años = hold completo del Excel).'],
  ciclo_meses: ['Meses del ciclo inicial compra→remo→renta→refi.'],
  postrefi_perfil: ['Perfil de proyección post-refi: motor (crecimiento) o plano (como el Excel).'],
  util_anual_postrefi: ['Utilidad anual post-refi calibrada contra el Excel.'],
  anio0_postrefi: ['Año 0 oficial post-refi (cash atrapado) calibrado contra el Excel.'],
  fecha_cierre: ['Fecha del cierre de compra — ancla de toda la línea de tiempo.'],
  estrategia: ['Estrategia del deal (BRRRR, flip, hold…).'],
  estado_casa: ['Etapa actual de la casa en el pipeline.'],
  plan_salida: ['Cómo se recupera la inversión (refi, venta, hold).'],
  tir_objetivo: ['Meta de TIR del deal (para comparar contra la proyectada).'],
  cap_objetivo: ['Meta de CAP rate del deal.'],
  fecha_breakeven: ['Fecha meta en que la operación cubre sus gastos.'],
  fecha_recuperacion: ['Fecha meta de recuperación del capital del inversionista.'],
};
function iaParamInfo(key) {
  const p = IA.params.find(x => x.key === key); if (!p) return;
  let info = IA_PINFO[key];
  const mDraw = key.match(/^draw_m(\d+)$/), mOtros = key.match(/^otros_inv_m(\d+)$/);
  if (!info && mDraw) info = ['Draw de remodelación del mes ' + mDraw[1] + ': plata del Hard Money desembolsada para la obra ese mes.' + (/\(estimado\)/.test(p.fuente || '') ? ' HOY es ESTIMADO: la casa no tiene registro en Desglose Draws (Airtable) → el modelo estima la remodelación y la reparte en partes iguales. Cuando se carguen los draws reales, reemplazan la estimación.' : '')];
  if (!info && mOtros) info = ['Otra inversión propia del mes ' + mOtros[1] + ' (plata que no vino del HML).'];
  if (!info) info = [p.descripcion || 'Parámetro del modelo financiero de esta casa.'];
  const o = iaOrigen(p);
  const esAirtable = /^real:ff_/.test(p.fuente || '') && !p._ov;
  const old = document.getElementById('ia-pinfo-ov'); if (old) old.remove();
  const ov = document.createElement('div');
  ov.id = 'ia-pinfo-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,12,.55);display:grid;place-items:center;z-index:99999;padding:18px';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = '<div style="background:var(--bg,#0f1220);border:1px solid var(--glassb,#2a2f4a);border-radius:14px;padding:18px;max-width:460px;width:100%;color:var(--ink,#e8eaf2);box-shadow:0 18px 50px rgba(0,0,0,.45)">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><b style="font-size:14px">ⓘ ' + OS_E(key) + '</b><button class="ibtn" onclick="document.getElementById(\'ia-pinfo-ov\').remove()">✕</button></div>'
    + '<div style="font-size:12.5px;line-height:1.65;color:var(--mut,#9aa0b8)">' + OS_E(info[0]) + '</div>'
    + (info[1] ? '<div style="margin-top:10px;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;background:var(--glass,rgba(255,255,255,.04));border:1px solid var(--glassb,#2a2f4a);border-radius:8px;padding:8px 11px">ƒ ' + OS_E(info[1]) + '</div>' : '')
    + '<div style="margin-top:12px;font-size:12px"><b>De dónde sale:</b> <span class="badge" style="font-size:9px;' + (o.st || '') + '">' + OS_E(o.lab) + '</span>'
    + '<div class="meta" style="font-size:11px;margin-top:4px">' + OS_E(o.tip) + '</div>'
    + (esAirtable ? '<div class="meta" style="font-size:11px;margin-top:4px">🗺 La cadena completa (base · tabla · columna con IDs exactos) vive en el <a style="color:var(--a2);cursor:pointer" onclick="document.getElementById(\'ia-pinfo-ov\').remove();osNav(\'/mapa\')">Mapa de Conexiones</a>.</div>' : '')
    + '<div style="font-size:11px;margin-top:6px;color:var(--mut2,#8a93ad)">Valor actual: <b>' + OS_E(p.value) + '</b>' + (p._ov ? ' · origen: ' + OS_E(p._base != null ? p._base : '—') + ' <a style="color:var(--a2);cursor:pointer" onclick="document.getElementById(\'ia-pinfo-ov\').remove();iaRevertOverride(\'' + OS_E(key) + '\')">↩ volver al origen</a>' : '') + '</div>'
    + '</div></div>';
  document.body.appendChild(ov);
}
window.iaParamInfo = iaParamInfo;
// Campos con lista cerrada de opciones (manuales) — evita el caos de texto libre
// (ej. estrategia hoy escrita "Fix & Hold" / "Fix and hold" / "Fix And Hold").
const IA_PARAM_OPCIONES = {
  estrategia: ['Fix & Flip', 'Fix & Hold', 'BRRRR', 'Wholesale', 'Otro'],
  plan_salida: ['Venta', 'Refinanciación', 'Renta a largo plazo (Hold)', 'Sin definir aún']
};
function iaParamControl(p, bid) {
  const opciones = IA_PARAM_OPCIONES[p.key];
  if (opciones) {
    const cur = p.value == null ? '' : String(p.value);
    const lista = opciones.slice();
    if (cur && !lista.includes(cur)) lista.unshift(cur); // preserva el valor legacy sin perderlo
    return '<select id="ia-p-' + OS_E(p.key) + '" class="osa-in" style="width:210px;padding:4px 8px;font-size:11px" onchange="iaDirty(\'' + bid + '\')">'
      + '<option value="">— sin definir —</option>'
      + lista.map(o => '<option value="' + OS_E(o) + '"' + (o === cur ? ' selected' : '') + '>' + OS_E(o) + '</option>').join('')
      + '</select>';
  }
  const frac = /(_pct$|tasa|reparto|ocupacion|valorizacion|inflacion|retorno|piso_servicios)/.test(p.key);
  return '<input id="ia-p-' + OS_E(p.key) + '" class="osa-in" style="width:150px;padding:4px 8px;font-size:11px;text-align:right" value="' + OS_E(p.value) + '" oninput="iaDirty(\'' + bid + '\')" onkeydown="if(event.key===\'Enter\')iaSaveBloque(\'' + bid + '\')">'
    + (frac ? '<span style="color:var(--mut2);font-size:10px;font-weight:700" title="fracción: 0.5 = 50%">×</span>' : '');
}
function iaParamRow(p, bid) {
  return '<div class="kv"><span title="' + OS_E(p.descripcion || '') + '">'
    + '<span class="lm-act" style="padding:0 4px;cursor:pointer;font-size:11px" title="¿qué es y de dónde sale?" onclick="iaParamInfo(\'' + OS_E(p.key) + '\')">ⓘ</span> '
    + OS_E(p.key) + ' ' + iaOrigenBadge(p)
    + (p._ov ? ' <a style="cursor:pointer;color:var(--a2);font-size:9.5px" title="volver al valor de origen (' + OS_E(p._base != null ? p._base : '—') + ')" onclick="iaRevertOverride(\'' + OS_E(p.key) + '\')">↩ origen</a>' : '')
    + '</span>'
    + '<b style="display:inline-flex;align-items:center;gap:4px">' + iaParamControl(p, bid) + '</b></div>';
}
function iaParamsBloques() {
  IA.pOpen = IA.pOpen || { b1: true };
  const grupos = {}; const otros = [];
  IA.params.forEach(p => {
    const b = IA_BLOQUES.find(x => x[2].test(p.key));
    if (b) (grupos[b[0]] = grupos[b[0]] || []).push(p); else otros.push(p);
  });
  const estadoChip = (id, rows) => {
    if (IA.pDirty && IA.pDirty[id]) return '<span id="ia-bst-' + id + '" style="color:var(--amber);font-weight:600">● sin guardar</span>';
    if (IA.pSaved && IA.pSaved[id]) return '<span id="ia-bst-' + id + '" style="color:var(--pos);font-weight:600">✓ guardado</span>';
    return '<span id="ia-bst-' + id + '"></span>';
  };
  const saveBtn = id => '<button class="ct-btn" style="padding:2px 9px;font-size:10px" onclick="event.stopPropagation();iaSaveBloque(\'' + id + '\')">💾 Guardar</button>';
  let html = '<div class="card" style="max-height:640px;overflow-y:auto"><div class="chart-h"><div class="t">Parámetros del modelo (' + IA.params.length + ')</div><div class="k">9 bloques con 💾 por bloque · <span class="badge b-ok" style="font-size:8px">real</span> de la base · <span class="badge" style="font-size:8px;background:rgba(58,160,255,.14);color:#3aa0ff">estimado</span> lo calcula el modelo · <span class="badge" style="font-size:8px;background:rgba(192,132,252,.16);color:#c084fc">manual</span> lo cargás vos (editar un real = override reversible, la fuente no se pisa)</div></div>';
  IA_BLOQUES.forEach(([id, titulo]) => {
    const rows = grupos[id] || [];
    const open = !!IA.pOpen[id];
    const autos = rows.filter(p => iaEsAuto(p) && !p._ov).length;
    const ovs = rows.filter(p => p._ov).length;
    html += '<div onclick="iaTogglePB(\'' + id + '\')" style="display:flex;justify-content:space-between;gap:8px;cursor:pointer;padding:8px 10px;border:1px solid var(--glassb);border-radius:9px;background:var(--glass);margin-top:8px;font-size:12.5px;font-weight:700;align-items:center">'
      + '<span>' + (open ? '▾' : '▸') + ' ' + titulo + '</span><span class="meta" style="font-weight:500;display:inline-flex;gap:8px;align-items:center">' + estadoChip(id, rows) + rows.length + (rows.length ? ' · ' + autos + ' real' + (ovs ? ' · ' + ovs + ' override' : '') : ' · vacío') + (open && rows.length ? saveBtn(id) : '') + '</span></div>';
    if (open) {
      html += rows.map(p => iaParamRow(p, id)).join('') || '';
      if (id === 'b2') {
        // E2D: claves nuevas del deal, cargables con un clic si faltan
        const faltan2 = [['estrategia', 'Fix & Flip / Fix & Hold / BRRRR / Wholesale / Otro'], ['plan_salida', 'Venta / Refinanciación / Renta a largo plazo / Sin definir aún'], ['fecha_exit_proyectada', 'fecha estimada de salida (estimado·supuesto)']].filter(x => !rows.some(p2 => p2.key === x[0]));
        if (faltan2.length) html += '<div class="meta" style="padding:6px 2px">Faltan: ' + faltan2.map(x => IA_PARAM_OPCIONES[x[0]]
          ? '<a style="cursor:pointer;color:var(--a2)" title="' + x[1] + ' — se agrega como lista para elegir" onclick="iaAddSelectParam(\'' + x[0] + '\',\'' + x[1] + '\')">＋ ' + x[0] + '</a>'
          : '<a style="cursor:pointer;color:var(--a2)" title="' + x[1] + '" onclick="document.getElementById(\'ia-np-key\').value=\'' + x[0] + '\';document.getElementById(\'ia-np-desc\').value=\'' + x[1] + '\';document.getElementById(\'ia-np-key\').scrollIntoView({block:\'center\'});document.getElementById(\'ia-np-val\').focus()">＋ ' + x[0] + '</a>').join(' · ') + '</div>';
      }
      if (id === 'b4') {
        // E2A/C: hm_inicial = hm_compra + hm_rehab (calculado, no editable) + guardia de draws
        const g4 = k => { const r = rows.find(x => x.key === k); return r ? parseFloat(r.value) || 0 : 0; };
        const hmTot = g4('hm_compra') + g4('hm_rehab');
        if (rows.length) html += '<div class="kv"><span><b>hm_inicial (HML total)</b> <span class="badge b-ok" style="font-size:8px" title="no editable — suma de los dos términos fijos">calculado · hm_compra + hm_rehab</span></span><b>' + iaMoney(hmTot) + '</b></div>';
        const drawsEj = (IA.cashflow || []).filter(m => /draws?\s*\(construcci/i.test(m.concepto || '')).reduce((s2, m) => s2 + (+m.valor || 0), 0);
        if (drawsEj > 0) html += '<div class="kv"><span>Draws (construcción) ejecutados <span class="badge b-ok" style="font-size:8px">Σ movimientos financiero</span></span><b>' + iaMoney(drawsEj) + '</b></div>';
        if (rows.length && drawsEj > g4('hm_rehab')) html += '<div style="margin:6px 0;padding:8px 11px;border:1px solid rgba(245,178,61,.5);background:rgba(245,178,61,.1);border-radius:9px;color:var(--amber);font-size:11.5px;font-weight:600">⚠️ Los draws ejecutados (' + iaMoney(drawsEj) + ') superan el HML asignado a rehab (' + iaMoney(g4('hm_rehab')) + '). Verificar.</div>';
        const faltan4 = ['hm_compra', 'hm_rehab', 'hm_tasa', 'hm_plazo', 'hm_fecha_inicio', 'hm_puntos'].filter(k => !rows.some(p2 => p2.key === k));
        if (faltan4.length) html += '<div class="meta" style="padding:6px 2px">Faltan: ' + faltan4.map(k => '<a style="cursor:pointer;color:var(--a2)" onclick="document.getElementById(\'ia-np-key\').value=\'' + k + '\';document.getElementById(\'ia-np-key\').scrollIntoView({block:\'center\'});document.getElementById(\'ia-np-val\').focus()">＋ ' + k + '</a>').join(' · ') + '</div>';
      }
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
    html += '<div onclick="iaTogglePB(\'b0\')" style="display:flex;justify-content:space-between;gap:8px;cursor:pointer;padding:8px 10px;border:1px solid var(--glassb);border-radius:9px;background:var(--glass);margin-top:8px;font-size:12.5px;font-weight:700;align-items:center"><span>' + (open ? '▾' : '▸') + ' 🧩 Otros</span><span class="meta" style="font-weight:500;display:inline-flex;gap:8px;align-items:center">' + estadoChip('b0', otros) + otros.length + (open ? saveBtn('b0') : '') + '</span></div>';
    if (open) html += otros.map(p => iaParamRow(p, 'b0')).join('');
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
    + (IA.cashflow.map(m => editRow(m) + '<div class="kv"><span title="' + OS_E(m.fecha) + '">' + OS_E(invEngine.mesEs(String(m.fecha || '').slice(0, 7))) + ' · ' + OS_E(m.concepto || m.item || m.linea) + ' <span class="badge b-warn" style="font-size:8px">manual</span> ' + iaPnlBadge(m.categoria) + (m.factura_url ? ' <a href="' + OS_E(m.factura_url) + '" target="_blank" style="color:var(--a2);font-size:10px">📄 Ver factura</a>' : (m.id_factura ? ' · #' + OS_E(m.id_factura) : '')) + '</span>'
      + '<b class="' + (m.tipo === 'ingreso' ? 'up' : 'down') + '" style="white-space:nowrap">' + iaMoney(m.tipo === 'ingreso' ? m.valor : -m.valor)
      + ' <button class="ct-btn" style="padding:1px 6px;font-size:9px" onclick="iaEditMov(\'' + m.id + '\')">✎</button><button class="ct-btn" style="padding:1px 6px;font-size:9px;color:var(--neg)" onclick="iaDelMov(\'' + m.id + '\')">🗑</button></b></div>').join('') || '<div class="meta" style="padding:6px 2px">Sin movimientos manuales.</div>')
    + '<div class="lab" style="margin-top:12px">⚙️ Auto-importados (' + (autos ? autos.length : '⏳') + ') — de FF/Rentas, con su linaje, no se re-teclean</div>'
    + (autos === null ? '<div class="meta">⏳ cargando…</div>'
      : autos.slice(-40).reverse().map(m => '<div class="kv"><span title="' + OS_E(m.fecha) + ' · ' + OS_E(m.fuente) + '">' + OS_E(invEngine.mesEs(String(m.fecha || '').slice(0, 7))) + ' · ' + OS_E(m.concepto) + ' <span class="badge b-ok" style="font-size:8px">auto · ' + OS_E(String(m.fuente || '').split(':')[0]) + '</span> ' + iaPnlBadge(m.categoria === 'renta' ? 'ingreso' : m.categoria) + (m.comprobante ? ' <a href="' + OS_E(m.comprobante) + '" target="_blank" style="color:var(--a2);font-size:10px">📎</a>' : '') + '</span>'
        + '<b class="' + (m.tipo === 'ingreso' ? 'up' : 'down') + '" style="white-space:nowrap">' + iaMoney(m.tipo === 'ingreso' ? m.monto : -m.monto) + '</b></div>').join(''))
    + '<div class="meta" style="margin-top:8px;font-size:10.5px">El 💰 Ledger es la vista de SOLO LECTURA de estos mismos movimientos (manuales + auto) agrupados por categoría — cero doble digitación. Para corregir un auto: cargá un movimiento manual de ajuste (queda auditado).</div>'
    + '</div>';
}

// ─── 👁 E4.5E: "ver como inversionista" (guard: sin markup) + 🖨 guía imprimible ───
function iaCasaInd(pid) {
  if (!window.invInd || !(IA.indData || []).length) return null;
  const r = (IA.indData || []).find(x => x.property_id === pid);
  return r ? invInd.casa(r, new Date().toISOString().slice(0, 10)) : null;
}
function iaGlosDe(clave) { return (IA.glos || []).find(g => g.clave === clave) || {}; }
function iaIndResumen(pid, forPrint) {
  const c = iaCasaInd(pid);
  if (!c) return '<div class="meta">Sin datos de indicadores para esta casa (¿tiene deal FF con property_id?).</div>';
  const P = v => v == null ? 'n/a' : (v * 100).toFixed(1) + '%';
  const X = v => v == null ? '—' : v.toFixed(2) + 'x';
  const fila = (clave, lab, val, estado) => {
    const g = iaGlosDe(clave);
    return '<div style="padding:8px 0;border-top:1px solid ' + (forPrint ? '#ddd' : 'var(--glassb)') + '"><b>' + lab + ': ' + val + '</b>'
      + (estado ? '<div style="font-size:11px;color:#b45309">' + estado + '</div>' : '')
      + (g.que_es ? '<div style="font-size:11.5px;opacity:.75;margin-top:2px">' + OS_E(g.que_es) + (g.para_que ? ' ➜ ' + OS_E(g.para_que) : '') + '</div>' : '') + '</div>';
  };
  return '<div style="font-size:12.5px">'
    + '<div style="padding:7px 10px;border:1px solid #e0a83d66;background:#e0a83d14;border-radius:8px;font-size:11px">📄 Indicadores sobre valor en PAPEL (' + OS_E(c.paper_fuente || '') + ') — no son ganancias realizadas hasta la venta o el refi.</div>'
    + fila('tir', 'TIR del activo', c.tirNA ? 'n/a' : P(c.tirActivo), c.tirNA ? 'n/a: muy reciente para anualizar — mirar el múltiplo' : null)
    + fila('mult_allin', 'Múltiplo all-in', X(c.multAllIn))
    + fila('mult_equity', 'Múltiplo sobre equity', c.porCompletar ? 'por completar' : (c.equityLeq0 ? 'equity ≤ 0' : X(c.multEquity)), c.equityLeq0 ? 'la deuda financió todo — el retorno sale de la valorización' : (c.porCompletar ? 'falta registrar el HML de esta casa' : null))
    + fila('ltv', 'LTV actual', P(c.ltv))
    + fila('yield_on_cost', 'Yield on cost', P(c.yieldOnCost))
    + fila('apreciacion', 'Apreciación anualizada', P(c.aprecAnual))
    + '<div style="margin-top:8px;font-size:11px;opacity:.7">Valor papel ' + iaMoney(c.paper_value) + ' · all-in ' + iaMoney(c.all_in) + ' · deuda ' + (c.deuda_vigente != null ? iaMoney(c.deuda_vigente) : 'por completar') + ' (' + OS_E(c.deuda_fuente || '') + ') · corte ' + new Date().toISOString().slice(0, 10) + '</div></div>';
}
function iaVerComoInversor(pid) {
  // 👁 abre el PORTAL REAL en modo vista (misma UI, datos filtrados server-side por el
  // inversionista objetivo vía inv_portal_como — solo admin, auditado, read-only)
  pid = pid || IA.casa;
  const hs = IA.holdings.filter(h => h.property_id === pid);
  const inv = hs.length ? hs[0].investor_airtable_id : null;
  if (!inv) return alert('Esta casa no tiene inversionistas vinculados — vinculá uno en 🏠 Casas & reparto.');
  if (hs.length > 1 && window.toast) toast('👁 La casa tiene ' + hs.length + ' inversionistas — abriendo como ' + iaInvName(inv) + ' (cambiá con el selector de arriba en la vista)', 'success');
  window.open('/inversionista?ver=' + encodeURIComponent(inv) + '&casa=' + encodeURIComponent(pid), '_blank');
}
window.iaVerComoInversor = iaVerComoInversor;
function iaVerComo(inv, pid) { window.open('/inversionista?ver=' + encodeURIComponent(inv) + (pid ? '&casa=' + encodeURIComponent(pid) : ''), '_blank'); }
window.iaVerComo = iaVerComo;
function iaVerComoInversorModalViejo(pid) {
  const old = document.getElementById('ia-vci-ov'); if (old) old.remove();
  const ov = document.createElement('div'); ov.id = 'ia-vci-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,12,.55);display:grid;place-items:center;z-index:99999;padding:18px';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = '<div style="background:var(--bg,#0f1220);border:1px solid var(--glassb,#2a2f4a);border-radius:14px;padding:18px;max-width:560px;width:100%;max-height:85vh;overflow-y:auto;color:var(--ink,#e8eaf2)">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><b>👁 Lo que ve el inversionista · ' + OS_E(iaCasaName(pid)) + '</b><button class="ibtn" onclick="document.getElementById(\'ia-vci-ov\').remove()">✕</button></div>'
    + '<div class="meta" style="margin-bottom:8px">Vista SIN markup ni datos de otros inversionistas (mismo cálculo que el portal).</div>'
    + iaIndResumen(pid, false) + '</div>';
  document.body.appendChild(ov);
}
function iaGuiaPantalla(pid) {
  const w = window.open('', '_blank');
  if (!w) return alert('Permití pop-ups para imprimir la guía');
  w.document.write('<html><head><title>Guía · ' + OS_E(iaCasaName(pid)) + '</title><style>body{font-family:system-ui;margin:32px;color:#111;max-width:720px}h1{font-size:20px}b{font-weight:700}</style></head><body>'
    + '<h1>Guía de indicadores · ' + OS_E(iaCasaName(pid)) + '</h1>'
    + '<p style="font-size:12px;color:#555">Para leer con el inversionista — cada indicador con su explicación y sus números. Generado ' + new Date().toISOString().slice(0, 10) + '.</p>'
    + iaIndResumen(pid, true)
    + '</body></html>');
  w.document.close();
  setTimeout(() => { try { w.print(); } catch (e) {} }, 400);
}
window.iaGuiaPantalla = iaGuiaPantalla;

// ─── 📚 E4.5: editor del glosario (los textos viven en glosario_terminos, sin hardcode) ───
async function iaGlosSave(clave) {
  const g = k => { const el = document.getElementById('ia-g-' + k); return el ? el.value : null; };
  const upd = { que_es: g('quees'), para_que: g('paraque'), formula: g('formula') || null, ejemplo_template: g('ejemplo') || null, updated_at: new Date().toISOString() };
  const { error } = await sb.from('glosario_terminos').update(upd).eq('clave', clave);
  if (error) return alert('Error: ' + error.message);
  IA.glosEdit = null;
  if (window.toast) toast('✓ ' + clave + ' actualizado — tooltips, glosario y asistente lo leen de acá', 'success');
  await iaLoadProducto(); osRender();
}
window.iaGlosSave = iaGlosSave;
function iaTabGlosario() {
  const list = (IA.glos || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
  return '<div class="card"><div class="chart-h"><div class="t">📚 Glosario (' + list.length + ' términos)</div><div class="k">alimenta los ⓘ, la pestaña Aprende del portal y el asistente — editable acá, sin código</div></div>'
    + list.map(g => {
      if (IA.glosEdit === g.clave) {
        return '<div style="background:var(--glass);border:1px solid var(--a2);border-radius:9px;padding:10px;margin:6px 0">'
          + '<b>' + OS_E(g.termino_es) + '</b> <span class="meta">(' + OS_E(g.clave) + ' · ' + OS_E(g.tema) + ')</span>'
          + '<div class="lab" style="margin-top:6px">Qué es</div><textarea id="ia-g-quees" rows="2" class="osa-in" style="width:100%">' + OS_E(g.que_es) + '</textarea>'
          + '<div class="lab" style="margin-top:6px">Para qué sirve</div><textarea id="ia-g-paraque" rows="2" class="osa-in" style="width:100%">' + OS_E(g.para_que || '') + '</textarea>'
          + '<div class="lab" style="margin-top:6px">Fórmula</div><input id="ia-g-formula" class="osa-in" style="width:100%" value="' + OS_E(g.formula || '') + '">'
          + '<div class="lab" style="margin-top:6px">Plantilla "Tu caso" ({{placeholders}})</div><input id="ia-g-ejemplo" class="osa-in" style="width:100%" value="' + OS_E(g.ejemplo_template || '') + '">'
          + '<div style="display:flex;gap:6px;margin-top:8px"><button class="cbtn" style="padding:6px 12px" onclick="iaGlosSave(\'' + OS_E(g.clave) + '\')">💾 Guardar</button><button class="ct-btn" onclick="IA.glosEdit=null;osRender()">Cancelar</button></div></div>';
      }
      return '<div class="kv"><span><b>' + OS_E(g.termino_es) + '</b> <span class="meta" style="font-size:10px">' + OS_E(g.tema) + '</span><div class="meta" style="font-size:11px;max-width:520px">' + OS_E(g.que_es) + '</div></span>'
        + '<b><button class="ct-btn" style="padding:2px 8px" onclick="IA.glosEdit=\'' + OS_E(g.clave) + '\';osRender()">✎</button></b></div>';
    }).join('')
    + '</div>';
}

// ─── 🔮 ANALIZADOR DE PORTAFOLIO (A): escenarios de venta 3/5/8 + waterfall ───
// Motor = os/inv-escenarios.js (18/18 del ejemplo validados). La RECOMENDACIÓN es SOLO ADMIN.
async function iaLoadAnalizador() {
  if (IA.escData) return;
  const props = [...new Set(IA.holdings.map(h => h.property_id))];
  const [prm, ovr, cfg] = await Promise.all([
    sb.from('inv_model_params').select('property_id,key,value').eq('active', true).in('property_id', props).then(r => r.data || []).catch(() => []),
    sb.from('inv_param_overrides').select('property_id,key,valor').eq('active', true).in('property_id', props).then(r => r.data || []).catch(() => []),
    sb.from('ff_uw_config').select('key,value').like('key', 'esc\_%').then(r => r.data || []).catch(() => []),
  ]);
  const P = {}; prm.forEach(r => { (P[r.property_id] = P[r.property_id] || {})[r.key] = r.value; });
  ovr.forEach(o => { (P[o.property_id] = P[o.property_id] || {})[o.key] = o.valor; });
  IA.escData = { P, cfg: invEsc.cfgDesde(cfg) };
}
function iaEscCasas() {
  const D = IA.escData;
  const porCasa = {};
  IA.holdings.forEach(h => { const o = porCasa[h.property_id] = porCasa[h.property_id] || { aporte: 0, pct: 0 }; o.aporte += +h.inversion_aportada || 0; o.pct += +h.reparto_pct || 0; });
  return (IA.indData || []).filter(i => !i.vendida && porCasa[i.property_id]).map(i => {
    const c = invEsc.desdeDatos(i, D.P[i.property_id] || {}, { inversion_aportada: porCasa[i.property_id].aporte, reparto_pct: Math.min(1, porCasa[i.property_id].pct) });
    return c;
  });
}
function iaRecomendar(e, bench) {
  // SOLO ADMIN. Regla declarada: riesgo primero, después equilibrio TIR↔múltiplo vs benchmark.
  const riesgos = [];
  if (e.base.dscrAlerta) riesgos.push('DSCR ' + (e.base.dscr != null ? e.base.dscr.toFixed(2) + 'x' : '—') + ' < 1.20');
  if (e.flujoNegativo) riesgos.push('flujo negativo hoy (drena caja)');
  if (e.base.equity > 0 && e.base.coc != null && e.base.coc < 0.04) riesgos.push('equity atrapado (equity alto, CoC ' + (e.base.coc * 100).toFixed(1) + '%)');
  if (e.supuestos.origen.apreciacion === 'manual' && e.supuestos.apreciacion > 0.04) riesgos.push('apreciación manual optimista (' + (e.supuestos.apreciacion * 100).toFixed(1) + '%)');
  if (e.porCompletar) return { txt: '📋 Completar datos (deuda/renta) antes de decidir', riesgos };
  if (e.flujoNegativo || (e.base.dscr != null && e.base.dscr < 1)) {
    return { txt: '🔴 Vender pronto (≤3 años) o refinanciar — la casa drena caja y el escenario largo amplifica el déficit', riesgos };
  }
  const ok = e.filas.filter(f => f.irrBruta != null && f.irrBruta >= bench);
  if (!ok.length) return { txt: '🟡 Conservar (renta): ninguna venta supera el benchmark ' + (bench * 100).toFixed(0) + '% — el valor está en el hold', riesgos };
  const mejor = ok.slice().sort((a, b) => b.multBruto - a.multBruto)[0];
  const f3 = e.filas.find(f => f.n === 3);
  const txt = mejor.n === 8
    ? '🟢 Conservar hasta ~8 años: la TIR (' + (mejor.irrBruta * 100).toFixed(1) + '%) sigue sobre el benchmark y el múltiplo crece a ' + mejor.multBruto.toFixed(2) + 'x'
    : '🟢 Vender a ' + mejor.n + ' años: equilibrio TIR ' + (mejor.irrBruta * 100).toFixed(1) + '% / múltiplo ' + mejor.multBruto.toFixed(2) + 'x' + (f3 && f3.irrBruta > mejor.irrBruta ? ' (a 3 años la TIR es mayor, ' + (f3.irrBruta * 100).toFixed(1) + '%, pero el múltiplo cae a ' + f3.multBruto.toFixed(2) + 'x)' : '');
  return { txt, riesgos };
}
function iaTabAnalizador() {
  if (!window.invEsc || !window.invEngine) return '<div class="empty">Falta el motor de escenarios.</div>';
  if (!IA.escData) { iaLoadAnalizador().then(osRender); return '<div class="empty">⏳ Armando escenarios…</div>'; }
  invEsc.setEngine(invEngine);
  const cfg = IA.escData.cfg;
  const casas = iaEscCasas();
  const escs = casas.map(c => ({ c, e: invEsc.escenarios(c, cfg, [3, 5, 8]) }));
  const agg = invEsc.agregado(casas, cfg, [3, 5, 8]);
  const $=v=>v==null?'—':(v<0?'−$':'$')+Math.abs(Math.round(v)).toLocaleString('en-US');
  const p1=v=>v==null?'n/a':(v*100).toFixed(1)+'%';
  const x2=v=>v==null?'—':v.toFixed(2)+'x';
  const sup = '<div class="card" style="margin-bottom:12px;border-color:rgba(245,178,61,.4)"><div style="font-size:11.5px;color:var(--amber)">📐 <b>Supuestos (editables en ff_uw_config esc_* · override por casa en params)</b>: vacancia ' + p1(cfg.vacancia) + ' · apreciación ' + p1(cfg.apreciacion_anual) + '/año · renta +' + p1(cfg.crec_renta_anual) + '/año · costo de venta ' + p1(cfg.costo_venta) + ' · benchmark TIR value-add <b>' + p1(cfg.benchmark_tir) + '</b> (objetivo mínimo 15–16%) · preferred ' + (cfg.preferred_on ? p1(cfg.preferred_pct) : 'OFF') + '. Escenarios en papel — no son promesas. Deuda: refinanciada = amortizada 30a · HML = solo interés · sin registrar = por completar (jamás se inventa).</div></div>';
  const estado = '<div class="card overx" style="margin:0"><div class="chart-h"><div class="t">Estado actual por casa</div><div class="k">fuentes: ff_deals (renta/gastos) · inv_indicadores_data (papel/deuda) · inv_holdings (aporte)</div></div>'
    + '<table class="ptable"><thead><tr><th>Casa</th><th class="dh-num" style="text-align:right">Aporte</th><th style="text-align:right">NOI</th><th style="text-align:right">Cap impl.</th><th style="text-align:right">Flujo/mes</th><th style="text-align:right">CoC</th><th style="text-align:right">Equity</th><th style="text-align:right">DSCR</th></tr></thead><tbody>'
    + escs.map(({c, e}) => '<tr' + (e.porCompletar ? ' style="opacity:.55"' : '') + '><td>' + OS_E(c.casa) + (e.porCompletar ? ' <span class="badge b-warn" style="font-size:8px">por completar</span>' : '') + '</td>'
      + '<td style="text-align:right">' + $(c.aporte) + '</td><td style="text-align:right">' + (e.porCompletar ? '—' : $(e.base.noi)) + '</td>'
      + '<td style="text-align:right">' + (e.porCompletar ? '—' : p1(e.base.cap)) + '</td>'
      + '<td style="text-align:right" class="' + (e.base.flujo >= 0 ? 'up' : 'down') + '">' + (e.base.flujo != null ? $(e.base.flujo / 12) : '—') + '</td>'
      + '<td style="text-align:right">' + p1(e.base.coc) + '</td><td style="text-align:right">' + $(e.base.equity) + '</td>'
      + '<td style="text-align:right">' + (e.base.dscr != null ? (e.base.dscr.toFixed(2) + 'x' + (e.base.dscrAlerta ? ' <b class="down">⚠</b>' : '')) : '—') + '</td></tr>').join('')
    + '</tbody></table></div>';
  const venta = '<div class="card overx" style="margin-top:12px"><div class="chart-h"><div class="t">Escenarios de venta 3 / 5 / 8 años</div><div class="k">TIR bruta = deal completo · TIR neta = inversionista post-waterfall (capital primero, excedente × %)</div></div>'
    + '<table class="ptable"><thead><tr><th>Casa</th>' + [3,5,8].map(n => '<th style="text-align:right">' + n + 'a: prod. neto</th><th style="text-align:right">TIR bruta</th><th style="text-align:right">TIR neta</th><th style="text-align:right">×bruto</th>').join('') + '</tr></thead><tbody>'
    + escs.map(({c, e}) => '<tr' + (e.porCompletar ? ' style="opacity:.55"' : '') + '><td>' + OS_E(c.casa) + (e.flujoNegativo ? ' <span class="badge b-warn" style="font-size:8px" title="flujo negativo hoy: el modelo amplifica el déficit — señal de salida temprana">flujo −</span>' : '') + '</td>'
      + (e.porCompletar ? '<td colspan="12" class="meta">por completar (deuda/renta sin registrar — no se inventa)</td>'
        : e.filas.map(f => '<td style="text-align:right">' + $(f.productoNeto) + '</td><td style="text-align:right" class="' + (f.irrBruta >= cfg.benchmark_tir ? 'up' : 'down') + '">' + p1(f.irrBruta) + '</td><td style="text-align:right">' + p1(f.irrNeta) + '</td><td style="text-align:right">' + x2(f.multBruto) + '</td>').join(''))
      + '</tr>').join('')
    + '</tbody></table><div class="meta" style="margin-top:6px;font-size:10px">verde/rojo = vs benchmark ' + p1(cfg.benchmark_tir) + ' · TIR redondeada a 1 decimal · neta &lt; bruta por el waterfall (correcto, no bug)</div></div>';
  const cons = '<div class="grid k4" style="margin-top:12px">'
    + '<div class="card" style="margin:0"><div class="lab">Total invertido (aportes)</div><div class="big">' + $(agg.baseAgg.aporteT) + '</div><div class="meta">' + agg.completas + '/' + agg.n + ' casas con datos completos</div></div>'
    + '<div class="card" style="margin:0"><div class="lab">Equity total · flujo anual</div><div class="big">' + $(agg.baseAgg.equityT) + '</div><div class="meta">flujo ' + $(agg.baseAgg.flujoT) + '/año · cap ponderado ' + p1(agg.baseAgg.capPond) + '</div></div>'
    + agg.filas.map(f => '').join('')
    + '<div class="card" style="margin:0"><div class="lab">TIR bruta agregada 3/5/8</div><div class="big" style="font-size:16px">' + agg.filas.map(f => p1(f.irrBruta)).join(' · ') + '</div><div class="meta">todas las casas completas juntas</div></div>'
    + '<div class="card" style="margin:0"><div class="lab">Múltiplo agregado 3/5/8</div><div class="big" style="font-size:16px">' + agg.filas.map(f => x2(f.multBruto)).join(' · ') + '</div><div class="meta">producto + rentas ÷ aportes</div></div>'
    + '</div>';
  const d5 = escs.filter(x => !x.e.porCompletar).map(x => invEsc.descomposicion(x.c, cfg, 5)).filter(Boolean);
  const dT = d5.reduce((a, d) => ({ renta: a.renta + d.renta, amort: a.amort + d.amortizacion, plus: a.plus + d.plusvalia }), { renta: 0, amort: 0, plus: 0 });
  const desc = '<div class="card" style="margin-top:12px"><div class="chart-h"><div class="t">De dónde sale el retorno (a 5 años, agregado)</div><div class="k">renta + amortización + plusvalía — antes de costos de venta</div></div>'
    + '<div class="kv"><span>💵 Renta acumulada (flujo)</span><b class="' + (dT.renta >= 0 ? 'up' : 'down') + '">' + $(dT.renta) + '</b></div>'
    + '<div class="kv"><span>🏦 Amortización de deuda</span><b class="up">' + $(dT.amort) + '</b></div>'
    + '<div class="kv"><span>📈 Plusvalía (apreciación ' + p1(cfg.apreciacion_anual) + ' supuesta)</span><b class="up">' + $(dT.plus) + '</b></div>'
    + '</div>';
  const reco = '<div class="card" style="margin-top:12px;border-color:var(--a2)"><div class="chart-h"><div class="t">🎯 Recomendación por casa</div><div class="k"><b>SOLO ADMIN</b> — jamás visible al inversionista</div></div>'
    + escs.map(({c, e}) => { const r = iaRecomendar(e, cfg.benchmark_tir); return '<div style="padding:8px 0;border-top:1px solid var(--glassb)"><b style="font-size:12.5px">' + OS_E(c.casa) + '</b><div style="font-size:12px;margin-top:2px">' + r.txt + '</div>' + (r.riesgos.length ? '<div class="meta" style="font-size:10.5px;color:var(--amber)">⚠ ' + r.riesgos.join(' · ') + '</div>' : '') + '</div>'; }).join('')
    + '</div>';
  const hoja = '<div class="card" style="margin-top:12px"><div class="chart-h"><div class="t">🖨 Hoja de 1 página por inversionista</div><div class="k">imprimible / compartible — lenguaje simple, TIR neta, disclaimer</div></div>'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><select id="ia-hoja-inv" class="osa-in">' + iaInvOptions() + '</select>'
    + '<button class="cbtn" onclick="iaHojaInversionista(document.getElementById(\'ia-hoja-inv\').value)">🖨 Generar hoja</button></div></div>';
  return sup + estado + venta + cons + desc + reco + hoja;
}
function iaHojaInversionista(inv) {
  invEsc.setEngine(invEngine);
  const cfg = IA.escData.cfg;
  const hs = IA.holdings.filter(h => h.investor_airtable_id === inv);
  if (!hs.length) return alert('Este inversionista no tiene casas vinculadas.');
  const nombre = iaInvName(inv);
  const $=v=>v==null?'—':(v<0?'−$':'$')+Math.abs(Math.round(v)).toLocaleString('en-US');
  const p1=v=>v==null?'n/a':(v*100).toFixed(1)+'%'; const x2=v=>v==null?'—':v.toFixed(2)+'x';
  let cuerpo = '';
  for (const h of hs) {
    const ind = (IA.indData || []).find(i => i.property_id === h.property_id);
    if (!ind) continue;
    const c = invEsc.desdeDatos(ind, (IA.escData.P || {})[h.property_id] || {}, h);
    const e = invEsc.escenarios(c, cfg, [3, 5, 8]);
    cuerpo += '<h2 style="font-size:15px;margin:18px 0 4px">' + OS_E(c.casa) + '</h2>'
      + '<p style="font-size:12px;margin:2px 0">Pusiste <b>' + $(c.aporte) + '</b> (' + p1(c.pct) + ' de la casa). Hoy la casa vale <b>' + $(c.arv) + '</b> en papel (' + OS_E(c.arv_fuente || '') + ') y debe <b>' + (c.deuda_saldo != null ? $(c.deuda_saldo) : 'por completar') + '</b>.</p>'
      + (e.porCompletar ? '<p style="font-size:12px;color:#b45309">Escenarios por completar: falta registrar ' + (!(+ind.renta_anual > 0) ? 'la renta' : 'la deuda') + ' de esta casa.</p>'
        : '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px"><tr style="text-align:left"><th style="border-bottom:1px solid #ccc;padding:4px">Si vendemos en…</th><th style="border-bottom:1px solid #ccc;padding:4px">Te tocaría de la venta</th><th style="border-bottom:1px solid #ccc;padding:4px">Tu TIR (neta)</th><th style="border-bottom:1px solid #ccc;padding:4px">Tu múltiplo</th></tr>'
        + e.filas.map(f => '<tr><td style="padding:4px;border-bottom:1px solid #eee">' + f.n + ' años</td><td style="padding:4px;border-bottom:1px solid #eee">' + $(f.reparto) + '</td><td style="padding:4px;border-bottom:1px solid #eee">' + p1(f.irrNeta) + '</td><td style="padding:4px;border-bottom:1px solid #eee">' + x2(f.multNeto) + '</td></tr>').join('') + '</table>'
        + (e.flujoNegativo ? '<p style="font-size:11px;color:#b45309">Hoy la casa no cubre su cuota con la renta — el plan contempla salida por refinanciación o venta.</p>' : ''));
  }
  const w = window.open('', '_blank');
  if (!w) return alert('Permití pop-ups');
  w.document.write('<html><head><title>Tu inversión · ' + OS_E(nombre) + '</title><style>body{font-family:system-ui;margin:36px;color:#111;max-width:700px}h1{font-size:20px}</style></head><body>'
    + '<h1>Tu inversión con Flipping Rentals — ' + OS_E(nombre) + '</h1>'
    + '<p style="font-size:12px;color:#555">Generado ' + new Date().toISOString().slice(0, 10) + ' · escenarios con SUPUESTOS declarados: apreciación ' + p1(cfg.apreciacion_anual) + '/año, renta +' + p1(cfg.crec_renta_anual) + '/año, costo de venta ' + p1(cfg.costo_venta) + ', vacancia ' + p1(cfg.vacancia) + '. El reparto de venta devuelve primero tu capital y divide la ganancia según tu porcentaje (waterfall).</p>'
    + cuerpo
    + '<p style="font-size:10.5px;color:#777;margin-top:24px;border-top:1px solid #ccc;padding-top:8px">Análisis interno con supuestos — no es una promesa de retorno ni asesoría de inversión.</p>'
    + '</body></html>');
  w.document.close();
  setTimeout(() => { try { w.print(); } catch (err) {} }, 400);
}
window.iaHojaInversionista = iaHojaInversionista;

function invAdminView() {
  if (typeof osaCSS === 'function') osaCSS();
  if (!IA.loaded && !IA.err) { iaLoad(); return '<div class="empty">⏳ Cargando inversionistas…</div>'; }
  if (IA.err) return window.kitError ? kitError(IA.err, 'iaLoad(true)') : '<div class="empty down">' + OS_E(IA.err) + ' <button class="cbtn" onclick="iaLoad(true)">Reintentar</button></div>';
  const tabs = [['global', '📊 Global'], ['analizador', '🔮 Analizador'], ['pipeline', '🏗 Pipeline'], ['accesos', '🔑 Accesos'], ['holdings', '🏠 Casas & reparto'], ['modelo', '📐 Modelo & movimientos'], ['escenarios', '🎛 Escenarios & simulador'], ['dist', '💸 Distribuciones'], ['docs2', '📄 Documentos'], ['msgs', '💬 Mensajes'], ['ledger', '💰 Ledger'], ['glosario', '📚 Glosario']];
  const tabBtns = tabs.map(t => '<button class="ibtn" style="' + (IA.tab === t[0] ? 'border-color:var(--a2);color:var(--ink)' : '') + '" onclick="iaGoTab(\'' + t[0] + '\')">' + t[1] + '</button>').join(' ');
  let body = '';

  if (IA.tab === 'accesos') {
    const invOpts = IA.investors.map(i => '<option value="' + i.airtable_id + '">' + OS_E(i.name || i.airtable_id) + '</option>').join('');
    const mode = IA.accMode || 'airtable';
    const modeBtn = (m, lab) => '<button class="ibtn" style="' + (mode === m ? 'border-color:var(--a2);color:var(--ink)' : '') + '" onclick="iaAccMode(\'' + m + '\')">' + lab + '</button>';
    const formAirtable = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
      + iaLbl('Inversionista (sincronizado de Airtable)', '<select id="ia-acc-inv" class="osa-in" onchange="var i=IA.investors.find(x=>x.airtable_id===this.value); if(i&&i.email) document.getElementById(\'ia-acc-email\').value=i.email">' + invOpts + '</select>')
      + iaLbl('Email del portal', '<input id="ia-acc-email" class="osa-in" style="max-width:280px" placeholder="email del inversionista">')
      + '<button class="cbtn" onclick="iaCrearAcceso()">Crear acceso</button></div>';
    const formManual = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
      + iaLbl('Nombre', '<input id="ia-accm-nombre" class="osa-in" style="max-width:240px" placeholder="nombre del socio">')
      + iaLbl('Email del portal', '<input id="ia-accm-email" class="osa-in" style="max-width:280px" placeholder="email">')
      + '<button class="cbtn" onclick="iaCrearAccesoManual()">Crear acceso manual</button></div>'
      + '<div class="meta" style="margin-top:6px">Sin ir a Airtable ni esperar el sync — queda marcado ✍️ manual. Solo verá las casas que le asignes en 🏠 Casas &amp; reparto (RLS igual de estricta; sin casas = portal vacío). Después se puede vincular ⇄ a su registro de Airtable si aparece.</div>';
    body = '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">➕ Crear acceso al portal</div><div class="k">el inversionista entra en /inversionista con magic link (sin contraseña)</div></div>'
      + '<div style="display:flex;gap:8px;margin-bottom:10px">' + modeBtn('airtable', '📋 Elegir de Airtable') + modeBtn('manual', '✍️ Agregar manual') + '</div>'
      + (mode === 'manual' ? formManual : formAirtable) + '</div>'
      + '<div class="card overx"><div class="chart-h"><div class="t">Accesos (' + IA.access.length + ')</div><div class="k">quién creó cada acceso queda auditado (inv_audit)</div></div>'
      + '<table class="ptable"><thead><tr><th>Inversionista</th><th>Email</th><th>Origen</th><th>Estado</th><th>Reclamado</th><th>Creado por</th><th style="text-align:right">Acciones</th></tr></thead><tbody>'
      + (IA.access.map(a => {
        const manual = a.origen === 'manual';
        const nCasas = IA.holdings.filter(h => h.investor_airtable_id === a.investor_airtable_id).length;
        const linkRow = (manual && IA.linkEdit === a.id)
          ? '<tr><td colspan="7" style="background:var(--glass)"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:4px 0">⇄ Vincular a Airtable: <select id="ia-link-' + a.id + '" class="osa-in" style="max-width:260px"><option value="">— elegí el inversionista —</option>' + invOpts + '</select>'
            + '<button class="cbtn" style="padding:6px 12px" onclick="iaLinkManual(\'' + a.id + '\',\'' + OS_E(a.investor_airtable_id) + '\')">Vincular</button><button class="ct-btn" onclick="IA.linkEdit=null;osRender()">Cancelar</button></div></td></tr>'
          : '';
        return linkRow + '<tr><td>' + OS_E(iaInvName(a.investor_airtable_id)) + (manual ? ' <span class="meta" style="font-size:10px">(' + nCasas + ' casa' + (nCasas === 1 ? '' : 's') + ' asignada' + (nCasas === 1 ? '' : 's') + ')</span>' : '') + '</td><td>' + OS_E(a.email) + '</td>'
          + '<td>' + (manual ? '<span class="badge" style="font-size:9px;background:rgba(192,132,252,.16);color:#c084fc">✍️ manual</span>' : '<span class="badge b-ok" style="font-size:9px">Airtable</span>') + '</td>'
          + '<td><span class="badge ' + (a.estado === 'activo' ? 'b-ok' : a.estado === 'revocado' ? 'b-red' : 'b-warn') + '">' + a.estado + '</span></td>'
          + '<td>' + (a.claimed_at ? new Date(a.claimed_at).toLocaleDateString('es-MX') : '—') + '</td>'
          + '<td class="meta" style="font-size:10.5px">' + OS_E(a.created_by || '—') + '</td>'
          + '<td style="text-align:right;white-space:nowrap"><button class="ct-btn" onclick="iaEnviarLink(\'' + OS_E(a.email) + '\')">✉️ Invitar</button> '
          + (manual ? '<button class="ct-btn" title="vincular a un inversionista de Airtable" onclick="IA.linkEdit=\'' + a.id + '\';osRender()">⇄</button> ' : '')
          + (a.estado === 'revocado' ? '<button class="ct-btn" onclick="iaRevocar(\'' + a.id + '\', true)">↩︎ Rehabilitar</button>' : '<button class="ct-btn" style="color:var(--neg)" onclick="iaRevocar(\'' + a.id + '\', false)">⏸ Revocar</button>')
          + '</td></tr>';
      }).join('') || '<tr><td colspan="7" class="empty">Sin accesos.</td></tr>')
      + '</tbody></table></div>';
  }

  if (IA.tab === 'holdings') {
    const invOpts = iaInvOptions();
    const casaOpts = IA.deals.filter(d => d.property_id).map(d => '<option value="' + d.property_id + '">' + OS_E((d.address || '').split(',')[0]) + '</option>').join('');
    body = '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">➕ Vincular inversionista a casa</div><div class="k">reparto configurable por casa · default 50/50</div></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
      + iaLbl('Inversionista', '<select id="ia-h-inv" class="osa-in">' + invOpts + '</select>')
      + iaLbl('Casa', '<select id="ia-h-casa" class="osa-in">' + casaOpts + '</select>')
      + iaLbl('Inversión aportada ($)', '<input id="ia-h-monto" class="osa-in" style="max-width:140px" type="number" placeholder="inversión $">')
      + iaLbl('Su participación', '<span style="display:inline-flex;align-items:center;gap:4px"><input id="ia-h-pct" class="osa-in" style="max-width:110px" type="number" value="50" min="0" max="100" title="% del inversionista"><span style="color:var(--mut2);font-size:11px;font-weight:700">%</span></span>')
      + '<button class="cbtn" onclick="iaVincular()">Vincular</button></div></div>'
      + (() => {
        // búsqueda + orden (pedido Juan): por dirección/nombre o por inversionista
        const q = (IA.hQ || '').toLowerCase();
        let rows = IA.holdings.filter(h => !q || (iaCasaName(h.property_id) + ' ' + iaInvName(h.investor_airtable_id)).toLowerCase().includes(q));
        const sort = IA.hSort || 'casa';
        rows = rows.slice().sort((a, b) => sort === 'inv' ? iaInvName(a.investor_airtable_id).localeCompare(iaInvName(b.investor_airtable_id))
          : sort === 'monto' ? (+b.inversion_aportada || 0) - (+a.inversion_aportada || 0)
          : iaCasaName(a.property_id).localeCompare(iaCasaName(b.property_id)));
        return '<div class="card overx"><div class="chart-h"><div class="t">Holdings (' + rows.length + '/' + IA.holdings.length + ')</div><div class="k" style="display:flex;gap:6px;flex-wrap:wrap">'
          + '<input id="ia-h-q" class="osa-in" style="padding:6px 10px;max-width:220px" placeholder="🔍 casa o inversionista…" value="' + OS_E(IA.hQ || '') + '" oninput="IA.hQ=this.value;osRender();var e=document.getElementById(\'ia-h-q\');e.focus();e.setSelectionRange(e.value.length,e.value.length)">'
          + '<select class="osa-in" style="padding:6px" onchange="IA.hSort=this.value;osRender()">' + [['casa', 'A-Z casa'], ['inv', 'A-Z inversionista'], ['monto', 'Mayor inversión']].map(o => '<option value="' + o[0] + '"' + ((IA.hSort || 'casa') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>'
          + '</div></div>'
          + '<table class="ptable"><thead><tr><th>Inversionista</th><th>Casa</th><th style="text-align:right">Inversión</th><th style="text-align:right">Su %</th><th>Entrada</th><th style="text-align:right"></th></tr></thead><tbody>'
          + (rows.map(h => '<tr><td>' + OS_E(iaInvName(h.investor_airtable_id)) + '</td><td>' + OS_E(iaCasaName(h.property_id)) + '</td>'
            + '<td style="text-align:right">' + iaMoney(h.inversion_aportada) + '</td><td style="text-align:right">' + Math.round(h.reparto_pct * 100) + '%</td>'
            + '<td>' + (h.fecha_entrada || '—') + '</td>'
            + '<td style="text-align:right;white-space:nowrap"><button class="ct-btn" title="ver el portal como este inversionista (solo lectura, auditado)" onclick="iaVerComo(\'' + OS_E(h.investor_airtable_id) + '\',\'' + h.property_id + '\')">👁</button><button class="ct-btn" style="color:var(--neg)" onclick="iaSoftDeleteHolding(\'' + h.id + '\')">⏸</button></td></tr>').join('') || '<tr><td colspan="6" class="empty">Nada coincide.</td></tr>')
          + '</tbody></table></div>';
      })();
  }

  if (IA.tab === 'modelo') {
    const casas = [...new Set(IA.holdings.map(h => h.property_id))];
    const casaSel = '<select class="osa-in" onchange="iaSetCasa(this.value)">' + casas.map(c => '<option value="' + c + '" ' + (c === IA.casa ? 'selected' : '') + '>' + OS_E(iaCasaName(c)) + '</option>').join('') + '</select>';
    let preview = '<div class="meta">Sin parámetros para esta casa.</div>';
    if (IA.params.length && window.invEngine) {
      const h = IA.holdings.find(x => x.property_id === IA.casa);
      const r = invEngine.run(iaEngineParamsFromRows(IA.params, h ? +h.reparto_pct : null, IA.cashflow));
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
      + '<button class="ibtn" onclick="iaVerComoInversor(IA.casa)">👁 Ver como inversionista</button>'
      + '<button class="ibtn" onclick="iaGuiaPantalla(IA.casa)">🖨 Guía de esta pantalla</button>'
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
  const needsProd = ['dist', 'msgs', 'pipeline', 'global', 'docs2', 'glosario', 'modelo', 'analizador'].includes(IA.tab);
  if (needsProd && !IA.dists) { iaLoadProducto().then(osRender); body = '<div class="empty">⏳</div>'; }
  else if (IA.tab === 'dist') body = iaTabDist();
  else if (IA.tab === 'docs2') body = iaTabDocs();
  else if (IA.tab === 'msgs') body = iaTabMsgs();
  else if (IA.tab === 'pipeline') body = iaTabPipeline();
  else if (IA.tab === 'global') body = iaTabGlobal();
  else if (IA.tab === 'ledger') body = iaTabLedger();
  else if (IA.tab === 'glosario') body = iaTabGlosario();
  else if (IA.tab === 'analizador') body = iaTabAnalizador();

  return '<h1>💎 Inversionistas <span>· Portal & Modelo</span></h1>'
    + '<div class="sub">Accesos con RLS estricto (cada inversionista ve SOLO sus casas) · reparto por casa · motor compartido con el portal. Portal público: <b>' + location.origin + '/inversionista</b></div>'
    + '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">' + tabBtns + '<button class="ibtn" style="margin-left:auto" onclick="iaLoad(true)">↻</button></div>'
    + body;
}
window.invAdminView = invAdminView;
