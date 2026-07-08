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
    const [cfg, deals, hml, an, draws] = await Promise.all([
      sb.from('ff_uw_config').select('key, value').then(r => r.data || []),
      sb.from('ff_deals').select('*').eq('active', true).order('address').then(r => r.data || []),
      sb.from('ff_hml_loans').select('*').eq('active', true).then(r => r.data || []),
      sb.from('ff_underwriting_analyses').select('*').eq('active', true).order('updated_at', { ascending: false }).limit(50).then(r => r.data || []),
      sb.from('ff_draws').select('address_norm, remodel_complete').eq('active', true).then(r => r.data || []),
    ]);
    UW.cfg = {}; cfg.forEach(c => UW.cfg[c.key] = c.value);
    UW.deals = deals; UW.analyses = an;
    UW.hml = {}; hml.forEach(h => { if (h.address_norm) UW.hml[h.address_norm] = h; });
    UW.draws = {}; (draws || []).forEach(dr => { if (dr.address_norm) UW.draws[dr.address_norm] = dr; });
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
  const dr = (UW.draws || {})[d.address_norm] || {};
  inp.remod_directo = +dr.remodel_complete || 0;   // Costo Remod REAL (cobrado por Remodelación). Si null (obra no terminada) → 0 editable + estimador.
  inp.usar_estimador = !(+dr.remodel_complete > 0);
  inp.est_sqft = +d.sqft || 1400;
  inp.purchase = +d.purchase_price || 0;
  inp.arv_airtable = +d.arv || 0;                  // FIX 3b: ARV de Airtable = fuente única
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
// ═══ CALCULADORA 2 · ARV ═══
function ffUwCalcArv(inp) {
  const psfZona = UWc('arv_psf_zona', 295);
  const sqft = +inp.est_sqft || 0;
  const arvComps = Math.round(psfZona * sqft);                 // SOLO referencia (no alimenta MAO/cash-out)
  const appraisal = +inp.appraisal || 0;                        // ancla real
  const arvAirtable = +inp.arv_airtable || +inp.arv || 0;       // FIX 3b: fuente de verdad = Propiedades.ARV
  // el ARV núcleo (probable) = Airtable si existe; si no (hipotética), comps
  const probable = arvAirtable > 0 ? arvAirtable : arvComps;
  const conservador = Math.round(probable * 0.92);
  const optimista = Math.round(probable * 1.08);
  // confianza: alta si appraisal presente y comps cerca
  const esAirtable = arvAirtable > 0;
  const confianza = esAirtable ? 'alta (Airtable)' : appraisal > 0 ? 'media' : 'baja';
  return { arvComps, appraisal, arvAirtable, esAirtable, probable, conservador, optimista, confianza, psfZona, sqft, mercadoVivo: false };
}
// ═══ CALCULADORA 3 · CASH-OUT ═══
function ffUwCalcCashout(inp, arv) {
  const base = Math.min(arv.probable || 0, (+inp.appraisal || arv.probable || 0));  // min(ARV, appraisal)
  const ltv = (+inp.ltv_pct || UWc('cashout_ltv_pct', 75)) / 100;
  const ltvMax = UWc('cashout_ltv_max', 80);
  const prestamoRefi = Math.round(base * ltv);
  const payoff = +inp.payoff || 0;                              // saldo Harmony a pagar
  const cashOut = prestamoRefi - payoff;
  const ctc = (inp._ctcCalc != null ? inp._ctcCalc : 0);        // cash to close del inversionista
  const recuperaPct = ctc > 0 ? Math.round(100 * cashOut / ctc) : null;
  return { base, ltv: +inp.ltv_pct || UWc('cashout_ltv_pct', 75), ltvMax, prestamoRefi, payoff, cashOut, recuperaPct, ctc };
}
// ═══ CALCULADORA 4 · INTERESES ═══
function ffUwCalcIntereses(inp, cashout) {
  const financia = Math.round((+inp.purchase || 0) * ((+inp.hml_finance_pct || 90) / 100)) + (inp._remodCalc || 0);
  const tasaHarmony = UWc('harmony_tasa_anual', 12) / 100;
  const intMensualHarmony = Math.round(financia * tasaHarmony / 12);   // interest-only
  const dscrPrincipal = cashout.prestamoRefi || 0;
  const tasaDscr = UWc('dscr_tasa_anual', 7.5) / 100 / 12;
  const nDscr = UWc('dscr_plazo_anos', 30) * 12;
  const pagoDscr = dscrPrincipal > 0 && tasaDscr > 0 ? Math.round(dscrPrincipal * tasaDscr * Math.pow(1 + tasaDscr, nDscr) / (Math.pow(1 + tasaDscr, nDscr) - 1)) : 0;
  return { financia, intMensualHarmony, dscrPrincipal, pagoDscr, tasaHarmony: UWc('harmony_tasa_anual', 12), tasaDscr: UWc('dscr_tasa_anual', 7.5) };
}
// ═══ CALCULADORA 5 · INGRESO MENSUAL ═══
function ffUwCalcIngreso(inp, arv, intereses) {
  const renta = +inp.renta_mensual || 0;
  const pagoDscr = intereses.pagoDscr || 0;
  const impuestos = Math.round((arv.probable || 0) * (UWc('impuestos_pct_arv', 2.2) / 100) / 12);
  const seguro = UWc('seguro_mensual', 120);
  const pmFee = Math.round(renta * UWc('pm_fee_pct', 8) / 100);
  const vacancy = Math.round(renta * UWc('vacancy_pct', 5) / 100);
  const mantenimiento = Math.round(renta * UWc('mantenimiento_pct', 5) / 100);
  const flujo = renta - pagoDscr - impuestos - seguro - pmFee - vacancy - mantenimiento;
  const cashLeft = (inp._cashLeftIn != null ? inp._cashLeftIn : 0);
  const cashOnCash = cashLeft > 0 ? Math.round(100 * (flujo * 12) / cashLeft * 10) / 10 : null;
  return { renta, pagoDscr, impuestos, seguro, pmFee, vacancy, mantenimiento, flujo, cashOnCash, cashLeft };
}
// ═══ CALCULADORA 6 · VISTA UNIFICADA ═══
function ffUwComputeAll() {
  const inp = UW.a.inputs;
  const negocio = ffUwCalcNegocio(inp);
  inp._remodCalc = negocio.remod; inp._ctcCalc = negocio.cashToClose;
  const arv = ffUwCalcArv(inp);
  const cashout = ffUwCalcCashout(inp, arv);
  const intereses = ffUwCalcIntereses(inp, cashout);
  // cash left in = cash to close − cash-out recuperado
  inp._cashLeftIn = Math.max(0, negocio.cashToClose - Math.max(0, cashout.cashOut));
  const ingreso = ffUwCalcIngreso(inp, arv, intereses);
  // all-in = compra + remod + holding(intereses del draw)
  const allIn = (+inp.purchase || 0) + negocio.remod + negocio.intereses + negocio.utilities;
  const allInPct = arv.probable > 0 ? Math.round(100 * allIn / arv.probable) : null;
  const allInMax = UWc('allin_max_pct', 75);
  const mao = arv.probable > 0 ? Math.round(arv.probable * allInMax / 100 - negocio.remod - negocio.intereses - negocio.utilities) : null;
  const roi = inp._cashLeftIn > 0 ? Math.round(100 * (ingreso.flujo * 12) / inp._cashLeftIn * 10) / 10 : null;
  // guardrails
  const gAllIn = allInPct != null && allInPct <= allInMax;
  const gDeficit = !negocio.deficitRiesgo;
  const gFlujo = ingreso.flujo >= 0;
  const go = gAllIn && gDeficit;
  const veredicto = go ? 'GO' : (gAllIn || gDeficit) ? 'revisar' : 'NO-GO';
  return { negocio, arv, cashout, intereses, ingreso, unificada: { allIn, allInPct, allInMax, mao, cashToClose: negocio.cashToClose, cashOut: cashout.cashOut, recuperaPct: cashout.recuperaPct, cashLeftIn: inp._cashLeftIn, flujo: ingreso.flujo, roi, gAllIn, gDeficit, gFlujo, veredicto } };
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
  return ({ negocio: ffUwViewNegocio, arv: ffUwViewArv, cashout: ffUwViewCashout, intereses: ffUwViewIntereses, ingreso: ffUwViewIngreso, unificada: ffUwViewUnificada }[UW.sub] || ffUwViewNegocio)();
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

// ═══ VISTAS de las calculadoras 2-6 ═══
function ffUwViewArv() {
  const inp = UW.a.inputs, o = ffUwComputeAll(), a = o.arv;
  const conf = { alta: 'up', media: 'warn', baja: 'down' }[a.confianza] || '';
  return `<div class="grid k2" style="gap:14px">
    <div class="card"><div class="chart-h"><div class="t">2 · ARV</div><div class="k">comparables + appraisals reales</div></div>
      ${UW_IN('Sqft', 'est_sqft', inp.est_sqft)}
      ${UW_IN('$/sqft de la zona (comparables)', 'arv_psf_override', inp.arv_psf_override != null ? inp.arv_psf_override : UWc('arv_psf_zona', 295), '· calibrado del histórico')}
      ${UW_IN('ARV manual (opcional)', 'arv', inp.arv)}
      ${UW_IN('Appraisal real (ancla)', 'appraisal', inp.appraisal)}
      <div class="meta" style="margin-top:6px">🔌 Mercado en vivo (PropStream/HAR): <b>pendiente de enganche</b> — hoy ARV = comparables ($/sqft zona) + tu appraisal real como ancla.</div></div>
    <div class="card"><div class="chart-h"><div class="t">ARV en rango</div><div class="k">confianza <span class="${conf}">${a.confianza}</span></div></div>
      <div style="text-align:center;padding:14px 0"><div style="font-size:36px;font-weight:800;color:var(--a1,#12b5a0)">${UW_M(a.probable)}</div><div class="meta">valor probable</div></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line,rgba(255,255,255,.12))"><span>🔻 Conservador</span><b>${UW_M(a.conservador)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0"><span>🎯 Probable</span><b>${UW_M(a.probable)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0"><span>🔺 Optimista</span><b>${UW_M(a.optimista)}</b></div>
      <div class="meta" style="margin-top:6px">Comps: ${UW_M(a.arvComps)} (${a.sqft} sqft × ${a.psfZona}) · Appraisal: ${a.appraisal ? UW_M(a.appraisal) : '—'}${a.appraisal > 0 && a.arvComps > 0 ? ` · appraisal es ${Math.round(100 * a.appraisal / a.arvComps)}% de comps` : ''}</div></div>
  </div>`;
}
function ffUwViewCashout() {
  const inp = UW.a.inputs, o = ffUwComputeAll(), c = o.cashout;
  const row = (l, v, cls) => `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px${cls ? ';font-weight:700' : ''}"><span>${l}</span><b class="${cls || ''}">${UW_M(v)}</b></div>`;
  return `<div class="grid k2" style="gap:14px">
    <div class="card"><div class="chart-h"><div class="t">3 · Cash-Out (refi)</div><div class="k">min(ARV, appraisal) × LTV − payoff</div></div>
      ${UW_IN('LTV del refi (%)', 'ltv_pct', inp.ltv_pct, '· ' + UWc('cashout_ltv_pct', 75) + '–' + UWc('cashout_ltv_max', 80) + '% por prestamista')}
      ${UW_IN('Payoff (saldo Harmony)', 'payoff', inp.payoff)}
      <div class="meta" style="margin-top:6px">Base = min(ARV probable ${UW_M(o.arv.probable)}, appraisal ${UW_M(inp.appraisal)}) = ${UW_M(c.base)}</div></div>
    <div class="card"><div class="chart-h"><div class="t">Cash-out + recuperación</div></div>
      ${row('Base (min ARV/appraisal)', c.base)}${row('× LTV (' + c.ltv + '%)', c.prestamoRefi)}${row('− Payoff Harmony', -c.payoff)}
      <div style="border-top:1px solid var(--line,rgba(255,255,255,.12));margin-top:6px;padding-top:6px">${row('CASH-OUT', c.cashOut, c.cashOut >= 0 ? 'up' : 'down')}</div>
      <div style="text-align:center;padding:12px 0;margin-top:8px;background:rgba(18,181,160,.06);border-radius:8px"><div style="font-size:28px;font-weight:800;color:${c.recuperaPct >= 100 ? 'var(--pos,#34d399)' : 'var(--amber,#e7b65e)'}">${c.recuperaPct != null ? c.recuperaPct + '%' : '—'}</div><div class="meta">capital recuperado (cash-out ÷ cash to close ${UW_M(c.ctc)})</div></div></div>
  </div>`;
}
function ffUwViewIntereses() {
  const inp = UW.a.inputs, o = ffUwComputeAll(), i = o.intereses;
  return `<div class="grid k2" style="gap:14px">
    <div class="card"><div class="chart-h"><div class="t">4 · Intereses</div><div class="k">Harmony interest-only + DSCR</div></div>
      ${UW_IN('Compra', 'purchase', inp.purchase)}
      ${UW_IN('% que financia el Harmony', 'hml_finance_pct', inp.hml_finance_pct)}
      <div class="meta" style="margin-top:6px">Tasa Harmony ${i.tasaHarmony}%/año (interest-only) · DSCR ${i.tasaDscr}%/año a ${UWc('dscr_plazo_anos', 30)} años. Editables en config.</div></div>
    <div class="card"><div class="chart-h"><div class="t">Pagos mensuales</div></div>
      <div style="text-align:center;padding:14px 0"><div style="font-size:30px;font-weight:800;color:var(--amber,#e7b65e)">${UW_M(i.intMensualHarmony)}</div><div class="meta">interés mensual Harmony (durante el hold) · sobre ${UW_M(i.financia)} financiados</div></div>
      <div style="border-top:1px solid var(--line,rgba(255,255,255,.12));padding-top:12px;text-align:center"><div style="font-size:30px;font-weight:800;color:var(--a2,#2f6ef0)">${UW_M(i.pagoDscr)}</div><div class="meta">pago mensual DSCR post-refi · sobre ${UW_M(i.dscrPrincipal)} a 30 años</div></div></div>
  </div>`;
}
function ffUwViewIngreso() {
  const inp = UW.a.inputs, o = ffUwComputeAll(), g = o.ingreso;
  const row = (l, v, neg) => `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px"><span>${l}</span><b class="${neg ? 'down' : ''}">${neg ? '-' : ''}${UW_M(Math.abs(v))}</b></div>`;
  return `<div class="grid k2" style="gap:14px">
    <div class="card"><div class="chart-h"><div class="t">5 · Ingreso Mensual</div><div class="k">renta por modelo − gastos</div></div>
      ${UW_IN('Renta mensual proyectada', 'renta_mensual', inp.renta_mensual, '· de Rentas real por modelo')}
      <div class="meta" style="margin-top:6px">Gastos calibrados (config, % de renta): PM ${UWc('pm_fee_pct', 8)}% · vacancy ${UWc('vacancy_pct', 5)}% · mantenimiento ${UWc('mantenimiento_pct', 5)}% · impuestos ${UWc('impuestos_pct_arv', 2.2)}% ARV/año · seguro ${UW_M(UWc('seguro_mensual', 120))}/mes.</div></div>
    <div class="card"><div class="chart-h"><div class="t">Flujo</div></div>
      ${row('Renta', g.renta)}${row('Pago DSCR', g.pagoDscr, true)}${row('Impuestos', g.impuestos, true)}${row('Seguro', g.seguro, true)}${row('PM fee', g.pmFee, true)}${row('Vacancy', g.vacancy, true)}${row('Mantenimiento', g.mantenimiento, true)}
      <div style="border-top:1px solid var(--line,rgba(255,255,255,.12));margin-top:6px;padding-top:10px;text-align:center"><div style="font-size:30px;font-weight:800;color:${g.flujo >= 0 ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)'}">${UW_M(g.flujo)}/mes</div><div class="meta">flujo mensual · cash-on-cash ${g.cashOnCash != null ? g.cashOnCash + '%' : '—'} (sobre ${UW_M(g.cashLeft)} left in)</div></div></div>
  </div>`;
}
function ffUwViewUnificada() {
  const o = ffUwComputeAll(), u = o.unificada;
  const chip = (ok, l) => `<span class="badge ${ok ? 'b-ok' : 'b-warn'}" style="font-size:10px">${ok ? '✓' : '⚠'} ${l}</span>`;
  const verColor = u.veredicto === 'GO' ? 'var(--pos,#34d399)' : u.veredicto === 'NO-GO' ? 'var(--neg,#f87171)' : 'var(--amber,#e7b65e)';
  const kpi = (l, v, sub) => `<div class="card kpi"><div class="lab">${l}</div><div class="big">${v}</div>${sub ? `<div class="meta">${sub}</div>` : ''}</div>`;
  return `<div class="card" style="text-align:center;padding:20px;border:2px solid ${verColor}">
      <div class="lab">Veredicto del deal</div><div style="font-size:44px;font-weight:800;color:${verColor}">${u.veredicto}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap">${chip(u.gAllIn, 'all-in ≤' + u.allInMax + '% ARV')}${chip(u.gDeficit, 'sin riesgo déficit')}${chip(u.gFlujo, 'flujo +')}</div>
      <button class="repbtn" style="margin-top:14px" onclick="ffUwPresentacion()">📄 Generar presentación de negocio</button></div>
    <div class="grid k4" style="margin-top:14px">
      ${kpi('All-in', UW_M(u.allIn), u.allInPct != null ? u.allInPct + '% del ARV (máx ' + u.allInMax + '%)' : '')}
      ${kpi('MAO (max offer)', UW_M(u.mao), 'compra máxima al guardrail')}
      ${kpi('Cash to close', UW_M(u.cashToClose), 'lo que pone el inversionista')}
      ${kpi('Cash-out / recupera', UW_M(u.cashOut), u.recuperaPct != null ? u.recuperaPct + '% recuperado' : '')}
    </div>
    <div class="grid k3" style="margin-top:14px">
      ${kpi('Cash left in', UW_M(u.cashLeftIn), 'capital que queda invertido')}
      ${kpi('Flujo mensual', UW_M(u.flujo) + '/mes', '')}
      ${kpi('ROI (cash-on-cash)', u.roi != null ? u.roi + '%' : '—', 'flujo anual ÷ cash left in')}
    </div>
    <div class="card" style="margin-top:14px"><div class="lab">Cadena del deal</div><div class="meta" style="margin-top:6px">comparables → ARV ${UW_M(o.arv.probable)} → remod ${UW_M(o.negocio.remod)} + draw ${UW_M(o.negocio.draw)} → cash to close ${UW_M(o.negocio.cashToClose)} → cash-out ${UW_M(o.cashout.cashOut)} → intereses Harmony ${UW_M(o.intereses.intMensualHarmony)}/DSCR ${UW_M(o.intereses.pagoDscr)} → flujo ${UW_M(o.ingreso.flujo)}/mes. Guardrails: all-in ≤${u.allInMax}% ARV, regla de déficit. ${u.veredicto === 'GO' ? '✅ pasa.' : u.veredicto === 'NO-GO' ? '❌ no pasa.' : '⚠ revisar.'}</div></div>`;
}
function ffUwPresentacion() {
  const o = ffUwComputeAll(), u = o.unificada, a = UW.a;
  const DLR = String.fromCharCode(36);
  const M = n => DLR + Math.round(n || 0).toLocaleString('en-US');
  const w = window.open('', '_blank', 'width=800,height=1000');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Análisis ${UW_E(a.nombre)}</title><style>
    body{font-family:-apple-system,Segoe UI,sans-serif;color:#111;margin:0;padding:36px;max-width:720px}
    .h{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #12b5a0;padding-bottom:14px}
    .logo{font-size:22px;font-weight:800;color:#12b5a0}.logo span{display:block;font-size:10px;letter-spacing:2px;color:#666}
    .ver{font-size:34px;font-weight:800;color:${u.veredicto === 'GO' ? '#16a34a' : u.veredicto === 'NO-GO' ? '#dc2626' : '#d97706'}}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}
    .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:10px}.kpi .l{font-size:10px;text-transform:uppercase;color:#666}.kpi .v{font-size:20px;font-weight:800}
    .chain{font-size:12px;color:#444;line-height:1.6;margin-top:16px;background:#f8fafc;padding:12px;border-radius:8px}
    .btn{position:fixed;top:10px;right:10px;padding:8px 16px;background:#12b5a0;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700}
    @media print{.btn{display:none}}</style></head><body>
    <button class="btn" onclick="window.print()">🖨 PDF</button>
    <div class="h"><div class="logo">FLIPPING RENTALS <span>ANÁLISIS DE INVERSIÓN</span></div><div style="text-align:right"><div class="ver">${u.veredicto}</div><div style="font-size:11px;color:#666">${UW_E(a.direccion || a.nombre)}</div></div></div>
    <div class="grid">
      <div class="kpi"><div class="l">ARV</div><div class="v">${M(o.arv.probable)}</div></div>
      <div class="kpi"><div class="l">All-in (${u.allInPct}% ARV)</div><div class="v">${M(u.allIn)}</div></div>
      <div class="kpi"><div class="l">Cash to close (inversionista)</div><div class="v">${M(u.cashToClose)}</div></div>
      <div class="kpi"><div class="l">Cash-out (recupera ${u.recuperaPct || 0}%)</div><div class="v">${M(u.cashOut)}</div></div>
      <div class="kpi"><div class="l">Cash left in</div><div class="v">${M(u.cashLeftIn)}</div></div>
      <div class="kpi"><div class="l">Flujo mensual</div><div class="v">${M(u.flujo)}</div></div>
      <div class="kpi"><div class="l">ROI cash-on-cash</div><div class="v">${u.roi || 0}%</div></div>
      <div class="kpi"><div class="l">MAO</div><div class="v">${M(u.mao)}</div></div>
    </div>
    <div class="chain"><b>Cadena:</b> comparables → ARV ${M(o.arv.probable)} → remod ${M(o.negocio.remod)} → draw ${M(o.negocio.draw)} → cash to close ${M(o.negocio.cashToClose)} → cash-out ${M(o.cashout.cashOut)} → flujo ${M(o.ingreso.flujo)}/mes. Guardrails: all-in ≤${u.allInMax}% ARV ${u.gAllIn ? '✓' : '✗'} · déficit ${u.gDeficit ? '✓' : '✗'}.</div>
    <div style="margin-top:20px;font-size:10px;color:#999">Calibrado con ${UW.deals.length} casas reales · Flipping Rentals OS · ${new Date().toLocaleDateString('es-MX')}</div>
    </body></html>`);
  w.document.close();
}
window.ffUwPresentacion = ffUwPresentacion;

window.UW = UW; window.ffUwLoad = ffUwLoad; window.ffUwShell = ffUwShell; window.ffUwRender = ffUwRender; window.ffUwComputeAll = ffUwComputeAll;
