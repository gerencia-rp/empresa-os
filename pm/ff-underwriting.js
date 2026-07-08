// ═══ SUITE DE UNDERWRITING · Fix & Flip ═══
// 6 calculadoras calibradas con el histórico (Airtable → ff_*), memoria (ff_underwriting_analyses),
// cargar casa real o hipotética. Sub-nav limpio. Soft-delete. Cero hardcode: todo de ff_uw_config + ff_deals.
const UW = {
  cfg: {},            // ff_uw_config (calibración)
  deals: [],          // ff_deals (casas reales)
  hml: {},            // ff_hml_loans por address_norm
  analyses: [],       // ff_underwriting_analyses (memoria)
  a: null,            // análisis activo { nombre, inputs, outputs, ... }
  sub: 'negocio',     // sub-vista activa
  visibles: null,     // set de vistas en modo multi (null = una sola)
};
const UW_M = n => (n == null || isNaN(n)) ? '—' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const UW_E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function UWc(k, def) { const v = UW.cfg[k]; return v != null ? +v : def; }

const UW_NAV = [
  ['negocio', '💵', 'Del Negocio', 'Draw + Cash to Close'],
  ['arv', '🏷️', 'ARV', 'comparables + appraisals'],
  ['cashout', '💰', 'Cash-Out', 'refi capital recuperado'],
  ['intereses', '📉', 'Intereses', 'Harmony + DSCR'],
  ['ingreso', '🏠', 'Ingreso Mensual', 'flujo + cash-on-cash'],
  ['unificada', '🎯', 'Vista Unificada', 'one-pager GO/NO-GO'],
];

async function ffUwLoad() {
  try {
    const [cfg, deals, hml, an] = await Promise.all([
      sb.from('ff_uw_config').select('key, value').then(r => r.data || []),
      sb.from('ff_deals').select('*').eq('active', true).order('address').then(r => r.data || []),
      sb.from('ff_hml_loans').select('*').eq('active', true).then(r => r.data || []),
      sb.from('ff_underwriting_analyses').select('*').eq('active', true).order('updated_at', { ascending: false }).limit(50).then(r => r.data || []),
    ]);
    UW.cfg = {}; cfg.forEach(c => UW.cfg[c.key] = c.value);
    UW.deals = deals; UW.analyses = an;
    UW.hml = {}; hml.forEach(h => { if (h.address_norm) UW.hml[h.address_norm] = h; });
  } catch (e) { console.warn('ffUwLoad', e); }
}

// ─── calibración: $/sqft del histórico ───
function ffUwPsf(tipo) { return UWc(tipo === 'suave' ? 'psf_suave' : tipo === 'pesada' ? 'psf_pesada' : 'psf_media', 63); }

// ─── análisis: nuevo, cargar casa real, cargar guardado ───
function ffUwNuevo(hipotetica) {
  UW.a = { id: null, nombre: hipotetica ? 'Casa hipotética' : 'Nuevo análisis', property_id: null, ff_deal_id: null, es_hipotetica: !!hipotetica, direccion: '', ciudad: 'Austin',
    inputs: ffUwDefaults(), outputs: {}, veredicto: null };
  UW.sub = 'negocio'; ffUwRender();
}
function ffUwDefaults() {
  return {
    // negocio
    remod_directo: 0, usar_estimador: false, est_sqft: 1400, est_tipo: 'media',
    meses_hold: 6, utilities_mes: 250, muebles: 4000, appraisal_cost: 600, cashout_en_draw: 0,
    contingencia_pct: UWc('draw_contingencia_pct', 10), permisos: 1500, dumpster: 800, ac: 0,
    // cash to close
    purchase: 0, hml_finance_pct: 90, closing_costs: UWc('ctc_closing_default', 16052), earnest: 5000,
    // otras calc (se llenan en 2-6)
    arv: 0, appraisal: 0, ltv_pct: 75, payoff: 0,
    renta_mensual: 0, gastos_mensuales: 0,
  };
}
function ffUwCargarCasa(dealId) {
  const d = UW.deals.find(x => x.id === dealId); if (!d) return;
  const h = UW.hml[d.address_norm] || {};
  const inp = ffUwDefaults();
  inp.remod_directo = +d.remodel_est || 0;
  inp.est_sqft = +d.sqft || 1400;
  inp.purchase = +d.purchase_price || 0;
  inp.arv = +d.arv || 0; inp.appraisal = +d.appraisal || 0;
  inp.cashout_en_draw = 0;
  inp.closing_costs = +h.gastos_cierre || UWc('ctc_closing_default', 16052);
  inp.renta_mensual = +d.renta_mensual || 0; inp.gastos_mensuales = +d.gastos_mensuales || 0;
  inp.payoff = +h.monto_hml || 0;
  if (h.cash_to_close) inp._ctc_real = +h.cash_to_close;   // ancla real para calibrar
  UW.a = { id: null, nombre: (d.address || '').split(',')[0], property_id: d.property_id, ff_deal_id: d.id, es_hipotetica: false, direccion: d.address, ciudad: d.city || 'Austin', inputs: inp, outputs: {}, veredicto: null };
  UW.sub = 'negocio'; ffUwRender();
}
async function ffUwAbrir(id) {
  const a = UW.analyses.find(x => x.id === id); if (!a) return;
  UW.a = { id: a.id, nombre: a.nombre, property_id: a.property_id, ff_deal_id: a.ff_deal_id, es_hipotetica: a.es_hipotetica, direccion: a.direccion, ciudad: a.ciudad, inputs: Object.assign(ffUwDefaults(), a.inputs || {}), outputs: a.outputs || {}, veredicto: a.veredicto };
  UW.sub = 'negocio'; ffUwRender();
}
async function ffUwGuardar() {
  if (!UW.a) return;
  const a = UW.a; a.outputs = ffUwComputeAll();
  const row = { nombre: a.nombre, property_id: a.property_id || null, ff_deal_id: a.ff_deal_id || null, es_hipotetica: a.es_hipotetica, direccion: a.direccion || null, ciudad: a.ciudad || 'Austin', inputs: a.inputs, outputs: a.outputs, veredicto: a.outputs.unificada ? a.outputs.unificada.veredicto : null, updated_at: new Date().toISOString() };
  const { data: { session } } = await sb.auth.getSession(); row.created_by = (session && session.user && session.user.email) || 'uw';
  let error, res;
  if (a.id) ({ error } = await sb.from('ff_underwriting_analyses').update(row).eq('id', a.id));
  else { ({ data: res, error } = await sb.from('ff_underwriting_analyses').insert(row).select('id').single()); if (res) a.id = res.id; }
  if (error) { alert('No se pudo guardar: ' + error.message); return; }
  await ffUwLoad(); alert('✅ Análisis guardado.'); ffUwRender();
}
window.ffUwNuevo = ffUwNuevo; window.ffUwCargarCasa = ffUwCargarCasa; window.ffUwAbrir = ffUwAbrir; window.ffUwGuardar = ffUwGuardar;
function ffUwSet(k, v) { if (!UW.a) return; UW.a.inputs[k] = (typeof UW.a.inputs[k] === 'number' || /^-?[0-9.]+$/.test(v)) ? (v === '' ? 0 : +v) : v; ffUwRender(); }
function ffUwSub(s) { UW.sub = s; UW.visibles = null; ffUwRender(); }
window.ffUwSet = ffUwSet; window.ffUwSub = ffUwSub;

// ═══ CALCULADORA 1 · DEL NEGOCIO ═══
function ffUwCalcNegocio(inp) {
  // 1A · Draw al Harmony
  const remod = inp.usar_estimador ? Math.round(ffUwPsf(inp.est_tipo) * (+inp.est_sqft || 0)) : (+inp.remod_directo || 0);
  const intMensual = UWc('harmony_int_mensual_pct', 1) / 100;
  // el interés se calcula sobre lo que financia el Harmony (compra × %) + remod (lo pone Harmony via draws)
  const baseInteres = (+inp.purchase || 0) * ((+inp.hml_finance_pct || 90) / 100) + remod;
  const intereses = Math.round(baseInteres * intMensual * (+inp.meses_hold || 6));
  const utilities = Math.round((+inp.utilities_mes || 0) * (+inp.meses_hold || 6));
  const subtotal = remod + intereses + utilities + (+inp.muebles || 0) + (+inp.appraisal_cost || 0) + (+inp.cashout_en_draw || 0) + (+inp.permisos || 0) + (+inp.dumpster || 0) + (+inp.ac || 0);
  const contingencia = Math.round(subtotal * ((+inp.contingencia_pct || 0) / 100));
  const draw = subtotal + contingencia;
  // alerta déficit: remod del draw vs costo real calibrado
  const psfDraw = (+inp.est_sqft > 0) ? remod / +inp.est_sqft : null;
  const psfAlerta = UWc('deficit_alert_psf', 60);
  const deficitRiesgo = psfDraw != null && psfDraw < psfAlerta;
  // 1B · Cash to close = (compra − financia Harmony) + closing + earnest
  const financia = Math.round((+inp.purchase || 0) * ((+inp.hml_finance_pct || 90) / 100));
  const downPayment = (+inp.purchase || 0) - financia;
  const cashToClose = downPayment + (+inp.closing_costs || 0) + (+inp.earnest || 0);
  return { remod, intereses, utilities, contingencia, draw, psfDraw: psfDraw ? Math.round(psfDraw) : null, psfAlerta, deficitRiesgo, financia, downPayment, closing: +inp.closing_costs || 0, earnest: +inp.earnest || 0, cashToClose, ctcReal: inp._ctc_real || null };
}
function ffUwComputeAll() {
  const inp = UW.a.inputs;
  return { negocio: ffUwCalcNegocio(inp) };  // 2-6 se agregan en los siguientes módulos
}

// ═══ SHELL + RENDER ═══
function ffUwShell() {
  const a = UW.a;
  const sel = `<select onchange="if(this.value==='__new')ffUwNuevo(false);else if(this.value==='__hyp')ffUwNuevo(true);else if(this.value.startsWith('deal:'))ffUwCargarCasa(this.value.slice(5));else if(this.value.startsWith('an:'))ffUwAbrir(this.value.slice(3));this.value='__keep'" style="background:var(--card,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:9px;padding:8px 11px;color:inherit;font-size:13px;min-width:230px">
    <option value="__keep">${a ? UW_E(a.nombre) + (a.es_hipotetica ? ' (hipotética)' : '') : '— Elegí un análisis —'}</option>
    <option value="__new">＋ Nuevo análisis</option>
    <option value="__hyp">🧪 Casa hipotética</option>
    <optgroup label="Cargar casa real (${UW.deals.length})">${UW.deals.map(d => `<option value="deal:${d.id}">${UW_E((d.address || '').split(',')[0])}</option>`).join('')}</optgroup>
    <optgroup label="Análisis guardados (${UW.analyses.length})">${UW.analyses.map(x => `<option value="an:${x.id}">${UW_E(x.nombre)}${x.veredicto ? ' · ' + x.veredicto : ''}</option>`).join('')}</optgroup>
  </select>`;
  const nav = a ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin:14px 0">${UW_NAV.map(([k, i, n]) => `<button onclick="ffUwSub('${k}')" style="padding:8px 13px;border-radius:9px;border:1px solid ${UW.sub === k ? 'var(--a1,#12b5a0)' : 'var(--line,rgba(255,255,255,.12))'};background:${UW.sub === k ? 'rgba(18,181,160,.12)' : 'transparent'};color:inherit;cursor:pointer;font-size:12px;font-weight:${UW.sub === k ? '700' : '500'}">${i} ${n}</button>`).join('')}</div>` : '';
  const body = a ? ffUwSubBody() : `<div class="card" style="text-align:center;padding:40px"><div style="font-size:42px;margin-bottom:10px">📊</div><h2 style="margin-bottom:8px">Suite de Underwriting</h2><p style="color:var(--txt3,#9fb0c9);font-size:13px;margin-bottom:16px">Calibrada con ${UW.deals.length} casas reales · $/sqft: suave ${UWc('psf_suave', 45)} · media ${UWc('psf_media', 63)} · pesada ${UWc('psf_pesada', 77)}</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="repbtn" onclick="ffUwNuevo(false)">＋ Nuevo análisis</button><button class="repbtn ghost" onclick="ffUwNuevo(true)">🧪 Casa hipotética</button></div></div>`;
  return `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${sel}${a ? `<input value="${UW_E(a.nombre)}" onchange="UW.a.nombre=this.value" style="background:var(--card,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:9px;padding:8px 11px;color:inherit;font-size:13px" placeholder="nombre del análisis"><button class="repbtn" onclick="ffUwGuardar()">💾 Guardar</button><span style="font-size:11px;opacity:.6">${a.ff_deal_id ? '📎 casa real' : a.es_hipotetica ? '🧪 hipotética' : ''} · calibrado con ${UW.deals.length} casas</span>` : ''}</div>${nav}${body}`;
}
function ffUwSubBody() {
  if (UW.sub === 'negocio') return ffUwViewNegocio();
  return `<div class="card"><div class="chart-h"><div class="t">${(UW_NAV.find(x => x[0] === UW.sub) || [])[2] || ''}</div></div><div class="meta" style="padding:20px;text-align:center">Esta calculadora se construye en el siguiente paso. Ya podés usar "Del Negocio".</div></div>`;
}
const UW_IN = (lab, k, val, hint) => `<div style="margin-bottom:8px"><div style="font-size:10px;color:var(--txt3,#9fb0c9);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">${lab}${hint ? ` <span style="opacity:.5;text-transform:none">${hint}</span>` : ''}</div><input value="${val}" onchange="ffUwSet('${k}',this.value)" style="width:100%;background:var(--card,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;padding:7px 10px;color:inherit;font-size:13px"></div>`;
function ffUwViewNegocio() {
  const inp = UW.a.inputs, r = ffUwCalcNegocio(inp);
  const row = (l, v, cls) => `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px${cls ? ';font-weight:700' : ''}"><span>${l}</span><b class="${cls || ''}">${UW_M(v)}</b></div>`;
  const estToggle = `<div style="display:flex;gap:6px;margin:6px 0 10px"><button class="repbtn ${inp.usar_estimador ? 'ghost' : ''}" style="padding:4px 10px;font-size:11px" onclick="ffUwSet('usar_estimador',false)">Costo directo (Remodelación)</button><button class="repbtn ${inp.usar_estimador ? '' : 'ghost'}" style="padding:4px 10px;font-size:11px" onclick="ffUwSet('usar_estimador',true)">Estimador rápido $/sqft</button></div>`;
  const estBox = inp.usar_estimador
    ? `<div style="background:rgba(18,181,160,.06);border-radius:8px;padding:10px;margin-bottom:8px">${UW_IN('Sqft', 'est_sqft', inp.est_sqft)}<div style="font-size:10px;color:var(--txt3,#9fb0c9);text-transform:uppercase;margin-bottom:3px">Tipo de remod</div><div style="display:flex;gap:5px;margin-bottom:6px">${['suave', 'media', 'pesada'].map(t => `<button class="repbtn ${inp.est_tipo === t ? '' : 'ghost'}" style="flex:1;padding:5px;font-size:11px" onclick="ffUwSet('est_tipo','${t}')">${t} $${ffUwPsf(t)}</button>`).join('')}</div><div class="meta">Estimado: ${(+inp.est_sqft || 0)} sqft × $${ffUwPsf(inp.est_tipo)}/sqft = <b>${UW_M(r.remod)}</b> · mercado externo $${UWc('psf_mercado_externo', 110)}/sqft = ${UW_M(UWc('psf_mercado_externo', 110) * (+inp.est_sqft || 0))} (adentro ahorra ${UW_M((UWc('psf_mercado_externo', 110) - ffUwPsf(inp.est_tipo)) * (+inp.est_sqft || 0))})</div></div>`
    : UW_IN('Costo Remodelación (directo)', 'remod_directo', inp.remod_directo, '· lo pasa Remodelación');
  const alerta = r.deficitRiesgo ? `<div style="background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.4);border-radius:8px;padding:8px 10px;margin-top:8px;font-size:11px;color:#f87171">⚠️ RIESGO DE DÉFICIT: el remod del draw es $${r.psfDraw}/sqft, por debajo del calibrado ($${r.psfAlerta}/sqft de las casas de Remodelación). El draw puede no cubrir la obra real.</div>` : '';
  return `<div class="grid k2" style="gap:14px">
    <div class="card"><div class="chart-h"><div class="t">1A · Draw al Harmony</div><div class="k">desglose calibrado</div></div>
      ${estToggle}${estBox}
      ${UW_IN('Meses de hold', 'meses_hold', inp.meses_hold)}
      ${UW_IN('Compra (para interés/CTC)', 'purchase', inp.purchase)}
      ${UW_IN('% que financia el Harmony', 'hml_finance_pct', inp.hml_finance_pct, '· varía por deal')}
      <div class="grid k2" style="gap:8px">${UW_IN('Utilities/mes', 'utilities_mes', inp.utilities_mes)}${UW_IN('Muebles/staging', 'muebles', inp.muebles)}</div>
      <div class="grid k2" style="gap:8px">${UW_IN('Appraisal', 'appraisal_cost', inp.appraisal_cost)}${UW_IN('Cash-out en draw', 'cashout_en_draw', inp.cashout_en_draw)}</div>
      <div class="grid k2" style="gap:8px">${UW_IN('Permisos', 'permisos', inp.permisos)}${UW_IN('Dumpster', 'dumpster', inp.dumpster)}</div>
      <div class="grid k2" style="gap:8px">${UW_IN('AC/HVAC', 'ac', inp.ac)}${UW_IN('Contingencia %', 'contingencia_pct', inp.contingencia_pct)}</div>
    </div>
    <div>
      <div class="card"><div class="chart-h"><div class="t">Draw total</div></div>
        ${row('Remodelación', r.remod)}${row('Intereses (' + inp.meses_hold + 'm × ' + UWc('harmony_int_mensual_pct', 1) + '%)', r.intereses)}${row('Utilities', r.utilities)}${row('Muebles', +inp.muebles)}${row('Appraisal', +inp.appraisal_cost)}${(+inp.cashout_en_draw > 0) ? row('Cash-out incluido', +inp.cashout_en_draw) : ''}${row('Permisos + dumpster + AC', (+inp.permisos) + (+inp.dumpster) + (+inp.ac))}${row('Contingencia (' + inp.contingencia_pct + '%)', r.contingencia)}
        <div style="border-top:1px solid var(--line,rgba(255,255,255,.12));margin-top:6px;padding-top:6px">${row('DRAW AL HARMONY', r.draw, 'up')}</div>${alerta}</div>
      <div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">1B · Cash to Close</div><div class="k">lo que pone el inversionista</div></div>
        ${row('Compra', +inp.purchase)}${row('− Financia el Harmony (' + inp.hml_finance_pct + '%)', -r.financia)}${row('= Down payment', r.downPayment)}${row('+ Closing costs (Gastos cierre HML)', r.closing)}${row('+ Earnest money', r.earnest)}
        <div style="border-top:1px solid var(--line,rgba(255,255,255,.12));margin-top:6px;padding-top:6px">${row('EL INVERSIONISTA PONE', r.cashToClose, 'down')}</div>
        ${r.ctcReal ? `<div class="meta" style="margin-top:6px">Cash to close real en Airtable: ${UW_M(r.ctcReal)} · Δ ${UW_M(r.cashToClose - r.ctcReal)} (calibración)</div>` : ''}</div>
    </div>
  </div>`;
}
function ffUwRender() {
  const el = document.getElementById('ff-uw-body');
  if (el) el.innerHTML = ffUwShell();
}
window.UW = UW; window.ffUwLoad = ffUwLoad; window.ffUwShell = ffUwShell; window.ffUwRender = ffUwRender; window.ffUwComputeAll = ffUwComputeAll;
