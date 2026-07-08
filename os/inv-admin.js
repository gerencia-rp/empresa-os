// ════════════════════════════════════════════════════════════════
// 💎 INVERSIONISTAS · ADMIN (ruta /inversionistas del OS, solo área fix-flip).
// Gestiona el portal: accesos (invitación magic link), holdings (casa+inversión+%),
// parámetros del modelo por casa (con fuente), movimientos reales y preview del motor.
// Todo soft-delete; escrituras protegidas por RLS (has_area fix-flip).
// ════════════════════════════════════════════════════════════════

const IA = { loaded: false, loading: false, err: null, access: [], holdings: [], investors: [], deals: [], params: [], cashflow: [], casa: null, tab: 'accesos' };
window.IA = IA;

function iaMoney(v) { return '$' + Math.round(+v || 0).toLocaleString('en-US'); }

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
async function iaAddMov() {
  const g = id => (document.getElementById(id) || {}).value || '';
  const row = { property_id: IA.casa, fecha: g('ia-m-fecha'), linea: g('ia-m-linea') || 'otros', tipo: g('ia-m-tipo') || 'gasto', categoria: g('ia-m-cat') || 'operativo', item: g('ia-m-item'), concepto: g('ia-m-conc'), valor: parseFloat(g('ia-m-valor')) || 0, id_factura: g('ia-m-fact') || null, fuente: 'manual' };
  if (!row.fecha || !row.valor) return alert('Fecha y valor son obligatorios');
  const { error } = await sb.from('inv_cashflow_real').insert(row);
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Movimiento cargado', 'success');
  await iaLoadCasa(IA.casa); osRender();
}
window.iaAddMov = iaAddMov;
async function iaDelMov(id) {
  const { error } = await sb.from('inv_cashflow_real').update({ active: false, archived_at: new Date().toISOString() }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await iaLoadCasa(IA.casa); osRender();
}
window.iaDelMov = iaDelMov;

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
    repartoInv: holdingPct != null ? holdingPct : g('reparto_inv', 0.5), cashAtrapadoReal: g('cash_atrapado_real', null) };
}

function invAdminView() {
  if (typeof osaCSS === 'function') osaCSS();
  if (!IA.loaded && !IA.err) { iaLoad(); return '<div class="empty">⏳ Cargando inversionistas…</div>'; }
  if (IA.err) return '<div class="empty down">' + OS_E(IA.err) + ' <button class="cbtn" onclick="iaLoad(true)">Reintentar</button></div>';
  const tabs = [['accesos', '🔑 Accesos'], ['holdings', '🏠 Casas & reparto'], ['modelo', '📐 Modelo & movimientos']];
  const tabBtns = tabs.map(t => '<button class="ibtn" style="' + (IA.tab === t[0] ? 'border-color:var(--a2);color:var(--ink)' : '') + '" onclick="IA.tab=\'' + t[0] + '\';osRender()">' + t[1] + '</button>').join(' ');
  let body = '';

  if (IA.tab === 'accesos') {
    const invOpts = IA.investors.map(i => '<option value="' + i.airtable_id + '">' + OS_E(i.name || i.airtable_id) + '</option>').join('');
    body = '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">➕ Crear acceso al portal</div><div class="k">el inversionista entra en /inversionista con magic link (sin contraseña)</div></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      + '<select id="ia-acc-inv" class="osa-in" onchange="var i=IA.investors.find(x=>x.airtable_id===this.value); if(i&&i.email) document.getElementById(\'ia-acc-email\').value=i.email">' + invOpts + '</select>'
      + '<input id="ia-acc-email" class="osa-in" style="max-width:280px" placeholder="email del inversionista">'
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
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      + '<select id="ia-h-inv" class="osa-in">' + invOpts + '</select>'
      + '<select id="ia-h-casa" class="osa-in">' + casaOpts + '</select>'
      + '<input id="ia-h-monto" class="osa-in" style="max-width:140px" type="number" placeholder="inversión $">'
      + '<input id="ia-h-pct" class="osa-in" style="max-width:110px" type="number" value="50" min="0" max="100" title="% del inversionista">'
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
    body = '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">' + casaSel + '<span class="meta">el portal del inversionista muestra EXACTAMENTE esto (motor compartido)</span></div>'
      + preview
      + '<div class="grid k2" style="margin-top:14px">'
      + '<div class="card" style="max-height:520px;overflow-y:auto"><div class="chart-h"><div class="t">Parámetros del modelo (' + IA.params.length + ')</div><div class="k">editá y Enter — fuente declarada</div></div>'
      + IA.params.map(p => '<div class="kv"><span title="' + OS_E(p.descripcion || '') + '">' + OS_E(p.key) + ' <span class="osbadge" style="font-size:8px;margin:0">' + OS_E((p.fuente || '').split(':')[0]) + '</span></span>'
        + '<b><input id="ia-p-' + OS_E(p.key) + '" class="osa-in" style="width:150px;padding:4px 8px;font-size:11px;text-align:right" value="' + OS_E(p.value) + '" onkeydown="if(event.key===\'Enter\')iaSaveParam(\'' + OS_E(p.key) + '\')"></b></div>').join('')
      + '</div>'
      + '<div class="card" style="max-height:520px;overflow-y:auto"><div class="chart-h"><div class="t">Movimientos reales (' + IA.cashflow.length + ')</div><div class="k">hoja "Datos reales" — alimenta el escenario Realizado</div></div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">'
      + '<input id="ia-m-fecha" type="date" class="osa-in" style="padding:6px">'
      + '<select id="ia-m-tipo" class="osa-in" style="padding:6px"><option value="gasto">gasto</option><option value="ingreso">ingreso</option></select>'
      + '<select id="ia-m-cat" class="osa-in" style="padding:6px"><option>operativo</option><option>inversion</option><option>financiero</option><option>tax</option><option>ingreso</option></select>'
      + '<input id="ia-m-valor" type="number" class="osa-in" style="padding:6px" placeholder="valor $">'
      + '<input id="ia-m-linea" class="osa-in" style="padding:6px" placeholder="línea P&L">'
      + '<input id="ia-m-item" class="osa-in" style="padding:6px" placeholder="ítem">'
      + '<input id="ia-m-conc" class="osa-in" style="padding:6px" placeholder="concepto">'
      + '<input id="ia-m-fact" class="osa-in" style="padding:6px" placeholder="# factura">'
      + '</div><button class="cbtn" style="width:100%" onclick="iaAddMov()">＋ Cargar movimiento</button>'
      + '<div style="margin-top:10px">'
      + IA.cashflow.map(m => '<div class="kv"><span>' + OS_E(m.fecha) + ' · ' + OS_E(m.item || m.linea) + (m.id_factura ? ' · #' + OS_E(m.id_factura) : '') + '</span><b class="' + (m.tipo === 'ingreso' ? 'up' : 'down') + '">' + iaMoney(m.tipo === 'ingreso' ? m.valor : -m.valor) + ' <button class="ct-btn" style="padding:1px 6px;font-size:9px" onclick="iaDelMov(\'' + m.id + '\')">🗑</button></b></div>').join('')
      + '</div></div></div>';
  }

  return '<h1>💎 Inversionistas <span>· Portal & Modelo</span></h1>'
    + '<div class="sub">Accesos con RLS estricto (cada inversionista ve SOLO sus casas) · reparto por casa · motor compartido con el portal. Portal público: <b>' + location.origin + '/inversionista</b></div>'
    + '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">' + tabBtns + '<button class="ibtn" style="margin-left:auto" onclick="iaLoad(true)">↻</button></div>'
    + body;
}
window.invAdminView = invAdminView;
