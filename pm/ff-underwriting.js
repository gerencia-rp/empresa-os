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
    // 1B · El inversionista pone (HUD-1, defaults calibrados con el HUD de Bethune)
    purchase: 0, hml_finance_pct: 90,
    //   fees prestamista
    cc_origination_pct: UWc('cc_origination_pct', 1.5), cc_documentation: UWc('cc_documentation', 1495),
    cc_draw_fee: UWc('cc_draw_fee', 500), cc_underwriting: UWc('cc_underwriting', 995), cc_prepaid_interest: UWc('cc_prepaid_interest', 2042.40),
    //   título / escrow / registro (~$3,400 típico)
    cc_title: UWc('cc_title', 2050), cc_escrow: UWc('cc_escrow', 550), cc_recording: UWc('cc_recording', 250),
    cc_ucc: UWc('cc_ucc', 150), cc_courier: UWc('cc_courier', 100), cc_guaranty: UWc('cc_guaranty', 300),
    //   wholesale (opcional)
    wholesale: false, cc_assignment: 0,
    //   créditos — se ACREDITAN al cierre (earnest/option ya pagados + proración de impuestos)
    earnest: 5000, option_fee: 0, prorata_impuestos: 0,
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
  inp._closing_real = +h.gastos_cierre || null;   // ancla real del HUD (Airtable) p/ comparar con las líneas
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
  // 1B · EL INVERSIONISTA PONE (HUD-1, calibrado con Bethune):
  //   Base = compra + rehab draw · Préstamo = Base × %financia (90% Harmony típico, 100% permitido)
  //   Inversionista pone = Down + gastos de cierre − créditos (earnest + option + proración: se ACREDITAN, no se suman)
  const R2 = n => Math.round(n * 100) / 100;
  const pctFin = Math.min(100, Math.max(0, +inp.hml_finance_pct || 90)) / 100;
  const financia = Math.round((+inp.purchase || 0) * pctFin);   // legado: base de intereses (calc 4)
  const baseHud = (+inp.purchase || 0) + remod;                 // rehab holdback = la obra (Bethune: 240k+170k=410k); intereses/utilities NO van en el loan amount
  const prestamo = R2(baseHud * pctFin);
  const downPayment = R2(baseHud - prestamo);
  const origination = R2(prestamo * ((+inp.cc_origination_pct || 0) / 100));
  const feesPrestamista = R2(origination + (+inp.cc_documentation || 0) + (+inp.cc_draw_fee || 0) + (+inp.cc_underwriting || 0) + (+inp.cc_prepaid_interest || 0));
  const feesTitulo = R2((+inp.cc_title || 0) + (+inp.cc_escrow || 0) + (+inp.cc_recording || 0) + (+inp.cc_ucc || 0) + (+inp.cc_courier || 0) + (+inp.cc_guaranty || 0));
  const assignment = inp.wholesale ? (+inp.cc_assignment || 0) : 0;
  const closing = R2(feesPrestamista + feesTitulo + assignment);
  const creditos = R2((+inp.earnest || 0) + (+inp.option_fee || 0) + (+inp.prorata_impuestos || 0));
  const cashToClose = R2(downPayment + closing - creditos);
  const yaPagado = R2((+inp.earnest || 0) + (+inp.option_fee || 0));
  return { remod, intereses, utilities, contingencia, draw, psfDraw: psfDraw ? Math.round(psfDraw) : null, psfAlerta, deficitRiesgo,
    financia, baseHud, prestamo, downPayment, origination, feesPrestamista, feesTitulo, assignment, closing, creditos, yaPagado, cashToClose,
    earnest: +inp.earnest || 0, ctcReal: inp._ctc_real || null, closingReal: inp._closing_real || null };
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
// ─── helpers de diseño (premium, legible para no-expertos) ───
const UW_DLR = '\u0024';
const UW_FMT = (val, tipo) => { const n = +val || 0; if (tipo === 'money') return n === 0 ? '' : (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }); if (tipo === 'pct') return n === 0 ? '' : n; return val === 0 ? '' : val; };
// formato con centavos (fidelidad HUD) — solo cuando los hay
const UW_M2 = n => { if (n == null || isNaN(n)) return '—'; const r = Math.round(n * 100) / 100; const c = Math.abs(r - Math.round(r)) >= 0.005; return (r < 0 ? '-$' : '$') + Math.abs(r).toLocaleString('en-US', { minimumFractionDigits: c ? 2 : 0, maximumFractionDigits: c ? 2 : 0 }); };
function UW_IN(lab, k, val, opts) {
  opts = opts || {}; const tipo = opts.tipo || (/pct|_pct$/.test(k) ? 'pct' : (/sqft|meses|hold/.test(k) ? 'num' : 'money'));
  const pre = tipo === 'money' ? UW_DLR : '', suf = tipo === 'pct' ? '%' : '';
  const ph = opts.ph != null ? opts.ph : '0';
  const shown = UW_FMT(val, tipo);
  return '<div style="margin-bottom:10px"><div style="font-size:11.5px;color:var(--txt2,#c9d5ea);font-weight:600;margin-bottom:3px">' + lab + (opts.help ? '<span title="' + UW_E(opts.help) + '" style="opacity:.45;margin-left:5px;cursor:help;font-size:11px">&#9432;</span>' : '') + '</div><div style="display:flex;align-items:center;background:var(--card,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:9px;padding:0 10px">' + (pre ? '<span style="opacity:.5;font-size:13px">' + pre + '</span>' : '') + '<input value="' + shown + '" placeholder="' + ph + '" onchange="ffUwSet(&quot;' + k + '&quot;,this.value.replace(/[,%\\s' + UW_DLR + ']/g,&quot;&quot;))" style="flex:1;background:none;border:none;padding:8px 6px;color:inherit;font-size:14px;font-weight:600;outline:none">' + (suf ? '<span style="opacity:.5;font-size:13px">' + suf + '</span>' : '') + '</div>' + (opts.hint ? '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:2px">' + opts.hint + '</div>' : '') + '</div>';
}
function UW_HERO(titulo, valor, sub, color) {
  const c = color || 'var(--a1,#12b5a0)';
  return '<div style="background:linear-gradient(135deg,' + c + '22,transparent);border:1px solid ' + c + '55;border-radius:14px;padding:18px 22px;margin-bottom:16px"><div style="font-size:12px;color:var(--txt2,#c9d5ea);font-weight:600;text-transform:uppercase;letter-spacing:.5px">' + titulo + '</div><div style="font-size:40px;font-weight:800;color:' + c + ';line-height:1.1;margin:4px 0">' + valor + '</div>' + (sub ? '<div style="font-size:12px;color:var(--txt3,#9fb0c9)">' + sub + '</div>' : '') + '</div>';
}
function UW_BLOCK(subtitulo, inner) {
  return '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--a1,#12b5a0);margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--line,rgba(255,255,255,.08))">' + subtitulo + '</div>' + inner + '</div>';
}
function UW_ROW(l, v, cls) {
  return '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px' + (cls === 'tot' ? ';font-weight:700;border-top:1px solid var(--line,rgba(255,255,255,.12));margin-top:6px;padding-top:8px' : '') + '"><span style="color:var(--txt2,#c9d5ea)">' + l + '</span><b class="' + (cls && cls !== 'tot' ? cls : '') + '">' + UW_M(v) + '</b></div>';
}
function UW_CARD(titulo, proposito, inner) {
  return '<div class="card" style="padding:20px"><div style="margin-bottom:14px"><div style="font-size:17px;font-weight:700">' + titulo + '</div><div style="font-size:12px;color:var(--txt3,#9fb0c9);margin-top:2px">' + proposito + '</div></div>' + inner + '</div>';
}
function ffUwViewNegocio() {
  const inp = UW.a.inputs, r = ffUwCalcNegocio(inp);
  const estToggle = '<div style="display:flex;gap:6px;margin-bottom:10px"><button class="repbtn ' + (inp.usar_estimador ? 'ghost' : '') + '" style="padding:5px 11px;font-size:11px" onclick="ffUwSet(\'usar_estimador\',false)">Costo real (Remodelación)</button><button class="repbtn ' + (inp.usar_estimador ? '' : 'ghost') + '" style="padding:5px 11px;font-size:11px" onclick="ffUwSet(\'usar_estimador\',true)">Estimador rápido $/sqft</button></div>';
  const estBox = inp.usar_estimador
    ? '<div style="background:rgba(18,181,160,.06);border-radius:10px;padding:12px;margin-bottom:8px">' + UW_IN('Superficie (sqft)', 'est_sqft', inp.est_sqft, { tipo: 'num', help: 'Pies cuadrados a remodelar' }) + '<div style="font-size:11.5px;color:var(--txt2,#c9d5ea);font-weight:600;margin-bottom:5px">Tipo de remodelación</div><div style="display:flex;gap:5px;margin-bottom:6px">' + ['suave', 'media', 'pesada'].map(t => '<button class="repbtn ' + (inp.est_tipo === t ? '' : 'ghost') + '" style="flex:1;padding:6px;font-size:11px;text-transform:capitalize" onclick="ffUwSet(\'est_tipo\',\'' + t + '\')">' + t + ' $' + ffUwPsf(t) + '</button>').join('') + '</div><div style="font-size:11px;color:var(--txt3,#9fb0c9)">' + (+inp.est_sqft || 0) + ' sqft &times; $' + ffUwPsf(inp.est_tipo) + '/sqft = <b>' + UW_M(r.remod) + '</b> &middot; contratista externo $' + UWc('psf_mercado_externo', 110) + '/sqft = ' + UW_M(UWc('psf_mercado_externo', 110) * (+inp.est_sqft || 0)) + ' (adentro ahorra ' + UW_M((UWc('psf_mercado_externo', 110) - ffUwPsf(inp.est_tipo)) * (+inp.est_sqft || 0)) + ')</div></div>'
    : UW_IN('Costo de remodelación (real)', 'remod_directo', inp.remod_directo, { help: 'Costo Real que cobra la empresa de Remodelación (Airtable). Si la obra no terminó, queda en 0 y podés usar el estimador.', hint: r.remod === 0 ? '⚠ sin costo real cargado — usá el estimador rápido' : 'del histórico de Remodelación' });
  const alerta = r.deficitRiesgo ? '<div style="background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.4);border-radius:9px;padding:9px 11px;margin-top:8px;font-size:11.5px;color:#f87171">&#9888; Riesgo de déficit: el remod del draw es $' + r.psfDraw + '/sqft, por debajo del calibrado ($' + r.psfAlerta + '/sqft). El draw puede no cubrir la obra real.</div>' : '';
  const izq = UW_CARD('1A &middot; Draw al Harmony', 'Lo que el Harmony te desembolsa para hacer la obra.',
    UW_BLOCK('Remodelación', estToggle + estBox) +
    UW_BLOCK('Holding e intereses', UW_IN('Meses de hold', 'meses_hold', inp.meses_hold, { tipo: 'num', help: 'Cuántos meses vas a tener el préstamo antes del refi/venta' }) + UW_IN('Precio de compra', 'purchase', inp.purchase, { help: 'Para calcular intereses y cash to close' }) + UW_IN('% que financia el Harmony', 'hml_finance_pct', inp.hml_finance_pct, { help: 'Porcentaje de la compra que pone el prestamista. Varía por deal.' }) + UW_IN('Utilities por mes', 'utilities_mes', inp.utilities_mes)) +
    UW_BLOCK('Muebles y otros', '<div class="grid k2" style="gap:8px">' + UW_IN('Muebles / staging', 'muebles', inp.muebles) + UW_IN('Appraisal', 'appraisal_cost', inp.appraisal_cost) + '</div><div class="grid k2" style="gap:8px">' + UW_IN('Cash-out en el draw', 'cashout_en_draw', inp.cashout_en_draw) + UW_IN('Permisos', 'permisos', inp.permisos) + '</div><div class="grid k2" style="gap:8px">' + UW_IN('Dumpster', 'dumpster', inp.dumpster) + UW_IN('AC / HVAC', 'ac', inp.ac) + '</div>' + UW_IN('Contingencia', 'contingencia_pct', inp.contingencia_pct, { help: 'Colchón sobre el subtotal por imprevistos' })));
  // 1B · inputs HUD (fórmula calibrada con el HUD-1 de Bethune)
  const whToggle = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><button class="repbtn ' + (inp.wholesale ? '' : 'ghost') + '" style="padding:5px 11px;font-size:11px" onclick="ffUwSet(\'wholesale\',' + (inp.wholesale ? 'false' : 'true') + ')">' + (inp.wholesale ? '☑' : '☐') + ' Deal por wholesaler</button><span style="font-size:10px;color:var(--txt3,#9fb0c9)">assignment fee al cierre (Bethune: $40,000)</span></div>';
  const izqHud = UW_CARD('1B &middot; El inversionista pone (HUD)', 'Base = compra + rehab draw &middot; préstamo = base &times; %financia &middot; pone = down + gastos de cierre &minus; créditos.',
    UW_BLOCK('Financiación', UW_IN('% que financia el prestamista', 'hml_finance_pct', inp.hml_finance_pct, { help: 'Sobre la BASE (compra + rehab draw). Default 90% Harmony; se permite 100% (Bethune).' })) +
    UW_BLOCK('Fees prestamista', UW_IN('Origination (% del préstamo)', 'cc_origination_pct', inp.cc_origination_pct, { hint: UW_M2(r.origination) + ' sobre préstamo ' + UW_M(r.prestamo) }) + '<div class="grid k2" style="gap:8px">' + UW_IN('Documentation', 'cc_documentation', inp.cc_documentation) + UW_IN('Draw fee', 'cc_draw_fee', inp.cc_draw_fee) + '</div><div class="grid k2" style="gap:8px">' + UW_IN('Underwriting', 'cc_underwriting', inp.cc_underwriting) + UW_IN('Prepaid interest', 'cc_prepaid_interest', inp.cc_prepaid_interest) + '</div>') +
    UW_BLOCK('Título / escrow / registro', '<div class="grid k2" style="gap:8px">' + UW_IN('Title insurance', 'cc_title', inp.cc_title) + UW_IN('Escrow fee', 'cc_escrow', inp.cc_escrow) + '</div><div class="grid k2" style="gap:8px">' + UW_IN('Recording', 'cc_recording', inp.cc_recording) + UW_IN('UCC', 'cc_ucc', inp.cc_ucc) + '</div><div class="grid k2" style="gap:8px">' + UW_IN('Courier', 'cc_courier', inp.cc_courier) + UW_IN('Guaranty', 'cc_guaranty', inp.cc_guaranty) + '</div><div style="font-size:10px;color:var(--txt3,#9fb0c9)">grupo típico ~$3,400 (HUD Bethune)</div>') +
    UW_BLOCK('Wholesale (opcional)', whToggle + (inp.wholesale ? UW_IN('Assignment fee', 'cc_assignment', inp.cc_assignment) : '')) +
    UW_BLOCK('Créditos al cierre', '<div class="grid k2" style="gap:8px">' + UW_IN('Earnest money', 'earnest', inp.earnest, { help: 'Se paga al inicio y se ACREDITA al cierre — no suma al total, ya lo pusiste antes.' }) + UW_IN('Option fee', 'option_fee', inp.option_fee, { help: 'Igual que el earnest: pagado al inicio, acreditado al cierre.' }) + '</div>' + UW_IN('Proración de impuestos', 'prorata_impuestos', inp.prorata_impuestos, { help: 'Crédito del vendedor por impuestos del año en curso (HUD línea de prorations).' })));
  const der = UW_HERO('Draw al Harmony', UW_M(r.draw), 'lo que el prestamista desembolsa', 'var(--a1,#12b5a0)') +
    '<div class="card" style="padding:16px">' + UW_ROW('Remodelación', r.remod) + UW_ROW('Intereses (' + inp.meses_hold + 'm)', r.intereses) + UW_ROW('Utilities', r.utilities) + UW_ROW('Muebles', +inp.muebles) + UW_ROW('Appraisal', +inp.appraisal_cost) + (+inp.cashout_en_draw > 0 ? UW_ROW('Cash-out incluido', +inp.cashout_en_draw) : '') + UW_ROW('Permisos + dumpster + AC', (+inp.permisos) + (+inp.dumpster) + (+inp.ac)) + UW_ROW('Contingencia (' + inp.contingencia_pct + '%)', r.contingencia) + UW_ROW('Draw total', r.draw, 'tot') + alerta + '</div>' +
    UW_HERO('El inversionista pone', UW_M2(r.cashToClose), 'down + gastos de cierre &minus; créditos (HUD)', 'var(--a2,#2f6ef0)') +
    '<div class="card" style="padding:16px">'
    + UW_ROW('Base (compra ' + UW_M(+inp.purchase) + ' + rehab ' + UW_M(r.remod) + ')', r.baseHud)
    + UW_ROW('&minus; Préstamo (' + inp.hml_finance_pct + '% de la base)', -r.prestamo)
    + UW_ROW('= Down payment', r.downPayment, 'tot')
    + '<div style="font-size:10.5px;font-weight:800;text-transform:uppercase;color:var(--txt3,#9fb0c9);margin:10px 0 2px">+ Gastos de cierre</div>'
    + UW_ROW('&nbsp;&nbsp;Fees prestamista (orig ' + UW_M2(r.origination) + ' + doc + draw + uw + prepaid)', r.feesPrestamista)
    + UW_ROW('&nbsp;&nbsp;Título / escrow / registro', r.feesTitulo)
    + (inp.wholesale ? UW_ROW('&nbsp;&nbsp;Assignment fee (wholesaler)', r.assignment) : '')
    + UW_ROW('&nbsp;&nbsp;Subtotal gastos de cierre', r.closing, 'tot')
    + UW_ROW('&minus; Créditos (earnest + option + proración)', -r.creditos, 'down')
    + UW_ROW('EL INVERSIONISTA PONE', r.cashToClose, 'tot')
    + '<div style="font-size:11px;color:var(--txt2,#c9d5ea);margin-top:8px;background:rgba(47,110,240,.08);border-radius:8px;padding:8px 10px">Ya pagado como earnest/option: <b>' + UW_M2(r.yaPagado) + '</b> (acreditado) &middot; falta al cierre: <b>' + UW_M2(r.cashToClose) + '</b></div>'
    + (r.ctcReal ? '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:6px">Cash to close real (Airtable): ' + UW_M(r.ctcReal) + ' &middot; &Delta; ' + UW_M(r.cashToClose - r.ctcReal) + '</div>' : '')
    + (r.closingReal ? '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:2px">Gastos de cierre reales (Airtable): ' + UW_M(r.closingReal) + ' &middot; &Delta; ' + UW_M(r.closing - r.closingReal) + '</div>' : '') + '</div>';
  return '<div class="grid k2" style="gap:16px;align-items:start"><div>' + izq + izqHud + '</div><div>' + der + '</div></div>';
}
function ffUwRender() {
  const el = document.getElementById('ff-uw-body');
  if (el) el.innerHTML = ffUwShell();
}

// ═══ VISTAS de las calculadoras 2-6 ═══
function ffUwViewArv() {
  const inp = UW.a.inputs, o = ffUwComputeAll(), a = o.arv;
  const hero = UW_HERO('ARV (valor de reventa)', UW_M(a.probable), a.esAirtable ? 'de Airtable (fuente de verdad) &middot; confianza ' + a.confianza : 'estimado por comps &middot; confianza ' + a.confianza, a.esAirtable ? 'var(--pos,#34d399)' : 'var(--amber,#e7b65e)');
  const izq = UW_CARD('2 &middot; ARV', 'El valor de la casa remodelada. La fuente de verdad es el ARV de Airtable.',
    UW_BLOCK('Fuente de verdad', UW_IN('ARV de Airtable', 'arv', inp.arv, { help: 'Propiedades.ARV — alimenta MAO, cash-out y margen en toda la app' }) + UW_IN('Appraisal real (ancla)', 'appraisal', inp.appraisal, { help: 'Valor de tasación cuando exista' })) +
    UW_BLOCK('Referencia por comparables', UW_IN('Superficie (sqft)', 'est_sqft', inp.est_sqft, { tipo: 'num' }) + '<div style="font-size:11px;color:var(--txt3,#9fb0c9)">$/sqft de la zona: $' + a.psfZona + ' &rarr; comps = ' + UW_M(a.arvComps) + ' <b>(referencia)</b></div>' + ffUwRcCompsBox()) +
    '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:6px">&#128268; Mercado en vivo (PropStream/HAR): pendiente de enganche.</div>');
  const der = hero + '<div class="card" style="padding:16px"><div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--txt3,#9fb0c9);margin-bottom:8px">Rango de valor</div>' + UW_ROW('&#128317; Conservador', a.conservador) + UW_ROW('&#127919; Probable', a.probable, 'tot') + UW_ROW('&#128316; Optimista', a.optimista) + '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:8px">Comps (referencia): ' + UW_M(a.arvComps) + (a.appraisal > 0 ? ' &middot; appraisal: ' + UW_M(a.appraisal) : '') + '</div></div>';
  return '<div class="grid k2" style="gap:16px;align-items:start"><div>' + izq + '</div><div>' + der + '</div></div>';
}
function ffUwViewCashout() {
  const inp = UW.a.inputs, o = ffUwComputeAll(), c = o.cashout;
  const hero = UW_HERO('Cash-out del refi', UW_M(c.cashOut), c.recuperaPct != null ? 'recupera ' + c.recuperaPct + '% de lo que puso el inversionista (HUD)' : '', c.cashOut >= 0 ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)');
  const izq = UW_CARD('3 &middot; Cash-Out (refinanciación)', 'Cuánto capital recuperás al refinanciar. min(ARV, appraisal) &times; LTV &minus; payoff.',
    UW_BLOCK('Parámetros del refi', UW_IN('LTV del refi', 'ltv_pct', inp.ltv_pct, { help: 'Loan-to-value que da el prestamista del refi (' + UWc('cashout_ltv_pct', 75) + '–' + UWc('cashout_ltv_max', 80) + '%)' }) + UW_IN('Payoff (saldo Harmony)', 'payoff', inp.payoff, { help: 'Lo que se le debe al Harmony y hay que pagar con el refi' })) +
    '<div style="font-size:11px;color:var(--txt3,#9fb0c9)">Base = min(ARV ' + UW_M(o.arv.probable) + ', appraisal ' + UW_M(inp.appraisal) + ') = <b>' + UW_M(c.base) + '</b></div>');
  const der = hero + '<div class="card" style="padding:16px">' + UW_ROW('Base (min ARV/appraisal)', c.base) + UW_ROW('&times; LTV (' + c.ltv + '%)', c.prestamoRefi) + UW_ROW('&minus; Payoff Harmony', -c.payoff) + UW_ROW('Cash-out', c.cashOut, c.cashOut >= 0 ? 'up' : 'down') + '</div>' + UW_HERO('Capital recuperado', c.recuperaPct != null ? c.recuperaPct + '%' : '—', 'cash-out &divide; lo que puso el inversionista ' + UW_M2(c.ctc) + ' (HUD)', c.recuperaPct >= 100 ? 'var(--pos,#34d399)' : 'var(--amber,#e7b65e)');
  return '<div class="grid k2" style="gap:16px;align-items:start"><div>' + izq + '</div><div>' + der + '</div></div>';
}
function ffUwViewIntereses() {
  const inp = UW.a.inputs, o = ffUwComputeAll(), i = o.intereses;
  const izq = UW_CARD('4 &middot; Intereses', 'El pago mensual durante la obra (Harmony) y después del refi (DSCR).',
    UW_BLOCK('Base del préstamo', UW_IN('Precio de compra', 'purchase', inp.purchase) + UW_IN('% que financia el Harmony', 'hml_finance_pct', inp.hml_finance_pct)) +
    '<div style="font-size:11px;color:var(--txt3,#9fb0c9)">Tasa Harmony ' + i.tasaHarmony + '%/año (interest-only) &middot; DSCR ' + i.tasaDscr + '%/año a ' + UWc('dscr_plazo_anos', 30) + ' años. Editables en config.</div>');
  const der = UW_HERO('Interés mensual (Harmony)', UW_M(i.intMensualHarmony), 'durante el hold &middot; sobre ' + UW_M(i.financia) + ' financiados', 'var(--amber,#e7b65e)') + UW_HERO('Pago mensual (DSCR post-refi)', UW_M(i.pagoDscr), 'sobre ' + UW_M(i.dscrPrincipal) + ' a 30 años', 'var(--a2,#2f6ef0)');
  return '<div class="grid k2" style="gap:16px;align-items:start"><div>' + izq + '</div><div>' + der + '</div></div>';
}
function ffUwViewIngreso() {
  const inp = UW.a.inputs, o = ffUwComputeAll(), g = o.ingreso;
  const hero = UW_HERO('Flujo mensual', UW_M(g.flujo) + '/mes', g.cashOnCash != null ? 'cash-on-cash ' + g.cashOnCash + '% sobre ' + UW_M(g.cashLeft) + ' invertidos' : '', g.flujo >= 0 ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)');
  const izq = UW_CARD('5 &middot; Ingreso Mensual', 'El flujo que deja la casa rentada, después de todos los gastos.',
    UW_BLOCK('Ingreso', UW_IN('Renta mensual proyectada', 'renta_mensual', inp.renta_mensual, { help: 'De Rentas real por modelo' }) + ffUwRcRentBox()) +
    '<div style="font-size:11px;color:var(--txt3,#9fb0c9)">Gastos calibrados (% de renta): PM ' + UWc('pm_fee_pct', 8) + '% &middot; vacancy ' + UWc('vacancy_pct', 5) + '% &middot; mantenimiento ' + UWc('mantenimiento_pct', 5) + '% &middot; impuestos ' + UWc('impuestos_pct_arv', 2.2) + '% ARV/año &middot; seguro ' + UW_M(UWc('seguro_mensual', 120)) + '/mes.</div>');
  const der = hero + '<div class="card" style="padding:16px">' + UW_ROW('Renta', g.renta) + UW_ROW('&minus; Pago DSCR', -g.pagoDscr, 'down') + UW_ROW('&minus; Impuestos', -g.impuestos, 'down') + UW_ROW('&minus; Seguro', -g.seguro, 'down') + UW_ROW('&minus; PM fee', -g.pmFee, 'down') + UW_ROW('&minus; Vacancy', -g.vacancy, 'down') + UW_ROW('&minus; Mantenimiento', -g.mantenimiento, 'down') + UW_ROW('Flujo mensual', g.flujo, 'tot') + '</div>';
  return '<div class="grid k2" style="gap:16px;align-items:start"><div>' + izq + '</div><div>' + der + '</div></div>';
}
function ffUwViewUnificada() {
  const o = ffUwComputeAll(), u = o.unificada;
  const chip = (ok, l) => '<span class="badge ' + (ok ? 'b-ok' : 'b-warn') + '" style="font-size:10px">' + (ok ? '&#10003;' : '&#9888;') + ' ' + l + '</span>';
  const verColor = u.veredicto === 'GO' ? 'var(--pos,#34d399)' : u.veredicto === 'NO-GO' ? 'var(--neg,#f87171)' : 'var(--amber,#e7b65e)';
  const kpi = (l, v, sub) => '<div class="card kpi" style="padding:16px"><div class="lab">' + l + '</div><div class="big">' + v + '</div>' + (sub ? '<div class="meta">' + sub + '</div>' : '') + '</div>';
  return '<div class="card" style="text-align:center;padding:24px;border:2px solid ' + verColor + '"><div style="font-size:12px;color:var(--txt2,#c9d5ea);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Veredicto del deal</div><div style="font-size:46px;font-weight:800;color:' + verColor + '">' + u.veredicto + '</div><div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap">' + chip(u.gAllIn, 'all-in &le;' + u.allInMax + '% ARV') + chip(u.gDeficit, 'sin riesgo déficit') + chip(u.gFlujo, 'flujo +') + '</div><button class="repbtn" style="margin-top:16px" onclick="ffUwPresentacion()">&#128196; Generar presentación de negocio</button></div>' +
    '<div class="grid k4" style="margin-top:16px">' + kpi('All-in', UW_M(u.allIn), u.allInPct != null ? u.allInPct + '% del ARV (máx ' + u.allInMax + '%)' : '') + kpi('MAO (oferta máxima)', UW_M(u.mao), 'compra máxima al guardrail') + kpi('El inversionista pone', UW_M2(u.cashToClose), 'HUD: down + cierre &minus; créditos') + kpi('Cash-out / recupera', UW_M(u.cashOut), u.recuperaPct != null ? u.recuperaPct + '% recuperado' : '') + '</div>' +
    '<div class="grid k3" style="margin-top:14px">' + kpi('Cash left in', UW_M(u.cashLeftIn), 'capital que queda invertido') + kpi('Flujo mensual', UW_M(u.flujo) + '/mes', '') + kpi('ROI (cash-on-cash)', u.roi != null ? u.roi + '%' : '—', 'flujo anual &divide; cash left in') + '</div>' +
    '<div class="card" style="margin-top:16px;padding:16px"><div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--txt3,#9fb0c9);margin-bottom:6px">Cadena del deal</div><div style="font-size:11.5px;color:var(--txt2,#c9d5ea);line-height:1.6">ARV ' + UW_M(o.arv.probable) + ' &rarr; remod ' + UW_M(o.negocio.remod) + ' + draw ' + UW_M(o.negocio.draw) + ' &rarr; el inversionista pone ' + UW_M2(o.negocio.cashToClose) + ' (HUD) &rarr; cash-out ' + UW_M(o.cashout.cashOut) + ' &rarr; Harmony ' + UW_M(o.intereses.intMensualHarmony) + '/mes &middot; DSCR ' + UW_M(o.intereses.pagoDscr) + '/mes &rarr; flujo ' + UW_M(o.ingreso.flujo) + '/mes. Guardrails: all-in &le;' + u.allInMax + '% ARV, regla de déficit. ' + (u.veredicto === 'GO' ? '&#9989; pasa.' : u.veredicto === 'NO-GO' ? '&#10060; no pasa.' : '&#9888; revisar.') + '</div></div>';
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
      <div class="kpi"><div class="l">El inversionista pone (HUD)</div><div class="v">${M(u.cashToClose)}</div></div>
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


// ─── RentCast (mercado en vivo) — vía proxy backend, la key nunca llega acá ───
UW.rentcast = {};   // { address_norm: { value, rent, comps, fecha, cached, disponible } }
async function ffUwRentcast(endpoint, refresh) {
  const a = UW.a; if (!a) return null;
  const addr = a.direccion || a.nombre; if (!addr) return null;
  const key = String(addr).toLowerCase().replace(/[^a-z0-9]/g, '');
  UW.rentcast[key] = UW.rentcast[key] || {};
  const slot = UW.rentcast[key];
  if (!refresh && slot[endpoint] !== undefined) return slot[endpoint];
  slot[endpoint] = 'loading'; ffUwRender();
  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/rentcast`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session ? session.access_token : window.SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ address: addr, endpoint, refresh: !!refresh })
    });
    const j = await res.json();
    slot[endpoint] = j.ok ? { value: j.value, payload: j.payload, cached: j.cached, fetched_at: j.fetched_at, llamadas: j.llamadas } : { disponible: false, error: j.error };
    slot.llamadas = j.llamadas;
  } catch (e) { slot[endpoint] = { disponible: false, error: e.message }; }
  ffUwRender(); return slot[endpoint];
}
function ffUwRcSlot(endpoint) {
  const a = UW.a; if (!a) return null;
  const key = String(a.direccion || a.nombre || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return (UW.rentcast[key] || {})[endpoint];
}
window.ffUwRentcast = ffUwRentcast;
// referencia de comps de RentCast (pestaña ARV)
function ffUwRcCompsBox() {
  const s = ffUwRcSlot('value');
  if (s === 'loading') return '<div style="font-size:11px;color:var(--txt3,#9fb0c9)">⏳ consultando mercado en vivo…</div>';
  if (!s) return '<button class="repbtn ghost" style="padding:5px 11px;font-size:11px" onclick="ffUwRentcast(\'value\')">🔌 Traer mercado en vivo (RentCast)</button>';
  if (s.disponible === false) return '<div style="font-size:11px;color:var(--amber,#e7b65e)">⚠ Mercado en vivo no disponible' + (s.error ? ' (' + UW_E(String(s.error).slice(0, 60)) + ')' : '') + ' — se usa el $/sqft por zona.</div>';
  const comps = (s.payload && s.payload.comparables) || [];
  const fecha = s.fetched_at ? String(s.fetched_at).slice(0, 10) : '';
  return '<div style="background:rgba(47,110,240,.06);border-radius:9px;padding:10px;margin-top:6px">'
    + '<div style="font-size:11px;font-weight:700;color:var(--a2,#2f6ef0)">Mercado en vivo (RentCast) · referencia, NO alimenta cálculos ' + (s.cached ? '· cache' : '') + '</div>'
    + '<div style="font-size:20px;font-weight:800;margin:4px 0">' + UW_M(s.value) + ' <span style="font-size:11px;font-weight:400;opacity:.6">valor estimado RentCast</span></div>'
    + '<div style="font-size:10px;color:var(--txt3,#9fb0c9)">' + comps.length + ' comparables' + (fecha ? ' · ' + fecha : '') + '</div>'
    + (comps.length ? '<div style="margin-top:6px;max-height:120px;overflow:auto">' + comps.slice(0, 5).map(c => '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-top:1px solid var(--line,rgba(255,255,255,.06))"><span style="opacity:.75">' + UW_E((c.formattedAddress || c.address || '').slice(0, 32)) + '</span><b>' + UW_M(c.price) + (c.squareFootage ? ' · ' + Math.round((c.price || 0) / c.squareFootage) + '/sqft' : '') + '</b></div>').join('') + '</div>' : '')
    + '<button class="repbtn ghost" style="padding:3px 9px;font-size:10px;margin-top:6px" onclick="ffUwRentcast(\'value\',true)">↻ Actualizar mercado</button>'
    + (s.llamadas != null ? '<span style="font-size:9px;opacity:.5;margin-left:8px">' + s.llamadas + '/50 llamadas usadas</span>' : '') + '</div>';
}
// sugerencia de renta de RentCast (pestaña Ingreso)
function ffUwRcRentBox() {
  const s = ffUwRcSlot('rent');
  if (s === 'loading') return '<div style="font-size:11px;color:var(--txt3,#9fb0c9)">⏳ consultando renta de mercado…</div>';
  if (!s) return '<button class="repbtn ghost" style="padding:5px 11px;font-size:11px" onclick="ffUwRentcast(\'rent\')">🔌 Sugerir renta (RentCast)</button>';
  if (s.disponible === false) return '<div style="font-size:11px;color:var(--amber,#e7b65e)">⚠ Renta de mercado no disponible — usá tu proyección.</div>';
  return '<div style="background:rgba(52,211,153,.06);border-radius:9px;padding:10px;margin-top:6px"><div style="font-size:11px;font-weight:700;color:var(--pos,#34d399)">Renta de mercado (RentCast) · sugerencia</div><div style="display:flex;align-items:center;gap:10px;margin-top:4px"><div style="font-size:22px;font-weight:800">' + UW_M(s.value) + '/mes</div><button class="repbtn" style="padding:4px 12px;font-size:11px" onclick="ffUwSet(\'renta_mensual\',' + (+s.value || 0) + ')">Usar esta renta</button></div>' + ((s.payload && s.payload.comparables) ? '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:4px">' + s.payload.comparables.length + ' comparables de renta</div>' : '') + '<button class="repbtn ghost" style="padding:3px 9px;font-size:10px;margin-top:6px" onclick="ffUwRentcast(\'rent\',true)">↻ Actualizar</button></div>';
}

window.UW = UW; window.ffUwLoad = ffUwLoad; window.ffUwShell = ffUwShell; window.ffUwRender = ffUwRender; window.ffUwComputeAll = ffUwComputeAll;
