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
function UWct(k, def) { const v = (UW.cfgTxt || {})[k]; return v != null && v !== '' ? String(v) : def; }
window.UWct = UWct;

const UW_NAV = [
  ['negocio', '💵', 'Del Negocio', 'Draw + Cash to Close'],
  ['arv', '🏷️', 'ARV', 'comparables + appraisals'],
  ['cashout', '💰', 'Cash-Out', 'refi capital recuperado'],
  ['intereses', '📉', 'Intereses', 'Harmony + DSCR'],
  ['ingreso', '🏠', 'Ingreso Mensual', 'renta por modelo de negocio'],
  ['unificada', '🎯', 'Vista Unificada', 'one-pager GO/NO-GO'],
];

async function ffUwLoad() {
  try {
    const [cfg, deals, hml, an, draws, pmProps, pmUnits] = await Promise.all([
      sb.from('ff_uw_config').select('key, value, text_value').then(r => r.data || []),
      sb.from('ff_deals').select('*').eq('active', true).order('address').then(r => r.data || []),
      sb.from('ff_hml_loans').select('*').eq('active', true).then(r => r.data || []),
      sb.from('ff_underwriting_analyses').select('*').eq('active', true).order('updated_at', { ascending: false }).limit(50).then(r => r.data || []),
      sb.from('ff_draws').select('address_norm, remodel_complete, total_draws, net_total, hml_months, interest_hml, interest_until_rent').eq('active', true).then(r => r.data || []),
      // mezcla real de unidades (Rentas) para la Calc 5 — bajo RLS sin área rentas devuelve []
      sb.from('pm_properties').select('id,property_id,name').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('pm_units').select('property_id,unit_type,name,target_rent').eq('active', true).then(r => r.data || []).catch(() => []),
    ]);
    UW.pmProps = pmProps; UW.pmUnits = pmUnits;
    UW.cfg = {}; UW.cfgTxt = {}; cfg.forEach(c => { UW.cfg[c.key] = c.value; if (c.text_value != null) UW.cfgTxt[c.key] = c.text_value; });
    UW.deals = deals; UW.analyses = an;
    UW.hml = {}; hml.forEach(h => { if (h.address_norm) UW.hml[h.address_norm] = h; });
    UW.draws = {}; (draws || []).forEach(dr => { if (dr.address_norm) UW.draws[dr.address_norm] = dr; });
    // O7 (auditoría 13-jul): supuestos calibrados desde la HISTORIA real — visibles y aplicables
    UW.calib = await sb.from('v_supuestos_calibrados').select('*').maybeSingle().then(r => r.data).catch(() => null);
    // ARV certero: última calibración del motor (precisión medida en pantalla)
    UW.arvCalib = await sb.from('v_arv_calibracion').select('*').maybeSingle().then(r => r.data).catch(() => null);
  } catch (e) { console.warn('ffUwLoad', e); }
}

// ─── calibración: $/sqft del histórico ───
function ffUwPsf(tipo) { return UWc(tipo === 'suave' ? 'psf_suave' : tipo === 'pesada' ? 'psf_pesada' : 'psf_media', 63); }
// ─── TIEMPOS separados (obs #11): obra ≠ renta; hold = obra + renta (derivado, NO input suelto) ───
// El interés del HML corre SOLO sobre meses_OBRA. Legacy: análisis viejos con meses_hold → obra=hold, renta=0.
function ffUwMesesObra(inp) {
  const m = +inp.meses_obra; if (m > 0) return m;
  const h = +inp.meses_hold; if (h > 0) return h;                    // legacy (análisis guardados pre-cambio)
  const cal = (UW.calib && +UW.calib.obra_meses_prom) || 0;
  return cal > 0 ? cal : UWc('default_meses_hold', 6);
}
function ffUwMesesRenta(inp) {
  if (inp.meses_renta != null && inp.meses_renta !== '' && +inp.meses_renta >= 0) return +inp.meses_renta;
  if (+inp.meses_hold > 0 && !(+inp.meses_obra > 0)) return 0;       // legacy: el hold viejo ya era el total
  const cal = UW.calib;
  return (cal && +cal.holding_meses_prom > 0 && +cal.obra_meses_prom > 0)
    ? Math.max(0, Math.round((cal.holding_meses_prom - cal.obra_meses_prom) * 10) / 10) : 0;
}
function ffUwMesesHold(inp) { return Math.round((ffUwMesesObra(inp) + ffUwMesesRenta(inp)) * 10) / 10; }
// % que presta el HML, SEPARADO (pedido CEO 14-jul): compra (90 típico) ≠ remodelación/draws (100 típico).
// Fallback = hml_finance_pct legacy → los análisis guardados dan el MISMO número que antes.
function ffUwPctCompra(inp) { const v = +inp.hml_pct_compra; if (v > 0) return Math.min(100, v); const l = +inp.hml_finance_pct; return l > 0 ? Math.min(100, l) : 90; }
function ffUwPctRemo(inp) { const v = +inp.hml_pct_remo; if (v > 0) return Math.min(100, v); const l = +inp.hml_finance_pct; return l > 0 ? Math.min(100, l) : 90; }
// tasas por deal (override) con fallback a config — UNA sola fuente para las 5 calcs
function ffUwTasaHml(inp) { return +inp.hml_tasa_anual > 0 ? +inp.hml_tasa_anual : UWc('harmony_tasa_anual', 12); }
function ffUwTasaDscr(inp) { return +inp.dscr_tasa_anual > 0 ? +inp.dscr_tasa_anual : UWc('dscr_tasa_anual', 7.125); }
function ffUwPlazoDscr(inp) { return +inp.dscr_plazo_anos > 0 ? +inp.dscr_plazo_anos : UWc('dscr_plazo_anos', 30); }

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
    meses_obra: (UW.calib && +UW.calib.obra_meses_prom) || UWc('default_meses_hold', 6),   // tiempo de REMODELACIÓN (calibrado, editable)
    meses_renta: (UW.calib && +UW.calib.holding_meses_prom > 0 && +UW.calib.obra_meses_prom > 0) ? Math.max(0, Math.round((UW.calib.holding_meses_prom - UW.calib.obra_meses_prom) * 10) / 10) : 0,  // rentando hasta el refi
    meses_hold: 0,                                               // DERIVADO = obra + hasta rentar/vender (no se edita suelto)
    utilities_mes: 250, insurance_mes: UWc('uw_insurance_mes', 0), muebles: 4000, appraisal_cost: 600, cashout_en_draw: 0,
    contingencia_fija: 0,                                        // valor fijo opcional de contingencia (pisa el %)
    hml_tasa_anual: 0, dscr_tasa_anual: 0, dscr_plazo_anos: 0,   // 0 = usar config; editable inline en Intereses
    hml_capitaliza: 0,                                           // interés/fees que el term sheet CAPITALIZA al payoff
    intereses_override: 0,                                       // monto MANUAL de intereses del draw (0 = calculado)
    contingencia_pct: UWc('draw_contingencia_pct', 10), permisos: 1500, dumpster: 800, ac: 0,
    // 1B · El inversionista pone (HUD-1, defaults calibrados con el HUD de Bethune)
    purchase: 0, hml_finance_pct: 90,
    hml_pct_compra: 90, hml_pct_remo: 100,   // % separados (CEO 14-jul): 90 de la compra · 100 de la remodelación
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
    arv: 0, appraisal: 0, ltv_pct: UWc('refi_ltv_pct', 75), payoff: 0,
    renta_mensual: 0, gastos_mensuales: 0,
    // 3 · Cash-Out refi DSCR (Champions) — itemizado, calibrado con los HUD de Michelle/Echo
    refi_prestamo_real: 0,                                              // override: préstamo real del refi (Airtable) — 0 = calculado
    refi_dscr_obj: UWc('refi_dscr_objetivo', 1.0),
    refi_orig_pct: UWc('refi_originacion_pct', 0), refi_uw_fee: UWc('refi_fee_underwriting', 1495), refi_proc_fee: UWc('refi_fee_processing', 695),
    refi_titulo: UWc('refi_titulo_base', 2100), refi_titulo_pct: UWc('refi_titulo_pct', 0),
    refi_dias_prepagado: UWc('refi_dias_prepagado', 17),
    refi_seguro_anual: UWc('refi_seguro_anual', 1900), refi_imp_seguro_m: UWc('refi_impound_seguro_meses', 3),
    refi_imp_imp_m: UWc('refi_impound_imp_meses', 3), refi_tax_pct: UWc('refi_tax_pct', 2.1),
    refi_otros: 0,                                                      // ajuste vs HUD (línea "otros" del cierre)
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
  // refi (Calc 3): seeds desde el espejo de "Datos por casa" + anclas reales
  inp.refi_prestamo_real = +h.monto_prestamo_refi || 0;
  inp._refi_pagado_real = +h.monto_pagado_hml_refi || 0;   // Airtable: payoff + costos de refi (todo menos el cash-out)
  if (+h.pct_banco_refi > 0) inp.ltv_pct = Math.round(h.pct_banco_refi * 10000) / 100;
  inp._cashout_real = +d.cashout || null;                  // ancla: Balance to Borrower real
  inp._ref30_real = +d.ref30_payment || null;              // ancla: PITI DSCR real
  // payoff: con dato real del refi se DERIVA (pagado − costos itemizados); sin refi aún → saldo HML como arranque
  inp.payoff = inp._refi_pagado_real > 0 ? 0 : (+h.monto_hml || 0);
  if (h.cash_to_close) inp._ctc_real = +h.cash_to_close;   // ancla real para calibrar
  // ⛓ CADENA (obs #10): lo que ya sabemos del deal NO se re-pide — queda como fuente con chip
  inp._hml_saldo = +h.monto_hml || 0;                      // saldo HML → fallback de payoff en Calc 3
  inp._draw_real = +dr.total_draws || 0;                   // draw real de Airtable → comparador en Calc 1
  if (+h.tasa_pct > 0) inp.hml_tasa_anual = Math.round((h.tasa_pct > 1 ? +h.tasa_pct : +h.tasa_pct * 100) * 100) / 100;  // tasa HML real del préstamo
  // tiempos reales del deal (obs #11): obra = meses de interés pagados; renta = hueco hasta rentar (ff_draws)
  if (+dr.hml_months > 0) {
    inp.meses_obra = +dr.hml_months;
    const mensualInt = +dr.interest_hml > 0 ? +dr.interest_hml / +dr.hml_months : 0;
    inp.meses_renta = mensualInt > 0 ? Math.round(((+dr.interest_until_rent || 0) / mensualInt) * 10) / 10 : 0;
    inp.meses_hold = 0;                                    // derivado
  }
  UW.a = { id: null, nombre: (d.address || '').split(',')[0], property_id: d.property_id, ff_deal_id: d.id, es_hipotetica: false, direccion: d.address, ciudad: d.city || 'Austin', inputs: inp, outputs: {}, veredicto: null };
  UW.sub = 'negocio'; ffUwRender();
}
async function ffUwAbrir(id) {
  const a = UW.analyses.find(x => x.id === id); if (!a) return;
  // legacy: análisis guardados con meses_hold y sin meses_obra → NO pisar con los defaults nuevos
  // (obra = hold viejo, renta = 0: los números guardados no cambian en silencio)
  const base = ffUwDefaults(); const sIn = a.inputs || {};
  if (+sIn.meses_hold > 0 && !(+sIn.meses_obra > 0)) { base.meses_obra = 0; base.meses_renta = ''; }
  // legacy: guardados con hml_finance_pct único → no pisar con 90/100 (mismo % en compra y remo, como antes)
  if (+sIn.hml_finance_pct > 0 && !(+sIn.hml_pct_compra > 0)) { base.hml_pct_compra = 0; base.hml_pct_remo = 0; }
  UW.a = { id: a.id, nombre: a.nombre, property_id: a.property_id, ff_deal_id: a.ff_deal_id, es_hipotetica: a.es_hipotetica, direccion: a.direccion, ciudad: a.ciudad, inputs: Object.assign(base, sIn), outputs: a.outputs || {}, veredicto: a.veredicto };
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
// FIX guardado (CEO 14-jul): el re-render inmediato del onchange DESTRUÍA el botón 💾 entre
// mousedown y mouseup → el click de Guardar se perdía en silencio. Render diferido (150ms) para
// que el click aterrice + listener DELEGADO por pointerup (sobrevive al re-render, pase lo que pase).
function ffUwSet(k, v) {
  if (!UW.a) return;
  UW.a.inputs[k] = (typeof UW.a.inputs[k] === 'number' || /^-?[0-9.]+$/.test(v)) ? (v === '' ? 0 : +v) : v;
  clearTimeout(UW._renderT); UW._renderT = setTimeout(ffUwRender, 150);
}
if (typeof document !== 'undefined' && !window.__uwSaveHook) {
  window.__uwSaveHook = true;
  // pointerdown dispara ANTES del blur: acá se COMMITEAN los inputs editados que aún no dispararon
  // su onchange (valor ≠ defaultValue del render) — sin esto, "tipear y clickear 💾" perdía el valor.
  document.addEventListener('pointerdown', (e) => {
    const b = e.target && e.target.closest && e.target.closest('[data-uw-guardar]');
    if (!b || !UW.a) return;
    document.querySelectorAll('#ff-uw-body input').forEach(el => {
      if (el.value !== el.defaultValue) { try { el.dispatchEvent(new Event('change')); } catch (err) { /* noop */ } }
    });
  });
  document.addEventListener('pointerup', (e) => {
    const b = e.target && e.target.closest && e.target.closest('[data-uw-guardar]');
    if (!b || !UW.a) return;
    if (UW._lastSave && Date.now() - UW._lastSave < 800) return;   // anti doble-disparo (pointerup + click)
    UW._lastSave = Date.now();
    setTimeout(() => ffUwGuardar(), 40);                           // los change del pointerdown ya committearon
  });
}
function ffUwSub(s) { UW.sub = s; UW.visibles = null; ffUwRender(); }
window.ffUwSet = ffUwSet; window.ffUwSub = ffUwSub;

// ═══ CALCULADORA 1 · DEL NEGOCIO ═══
function ffUwCalcNegocio(inp) {
  // 1A · Draw al Harmony
  const remod = inp.usar_estimador ? Math.round(ffUwPsf(inp.est_tipo) * (+inp.est_sqft || 0)) : (+inp.remod_directo || 0);
  // tasa HML del deal (o config 12%/año = 1%/mes) — la MISMA que ven las 5 calcs
  const intMensual = ffUwTasaHml(inp) / 12 / 100;
  // TIEMPOS (CEO 14-jul): obra + HASTA RENTAR O VENDER = holding. El interés, utilities e insurance
  // corren sobre el HOLDING COMPLETO — esa suma es lo que realmente se paga y sale de los draws.
  const mesesObra = ffUwMesesObra(inp);
  const mesesRenta = ffUwMesesRenta(inp);
  const mesesHold = Math.round((mesesObra + mesesRenta) * 10) / 10;
  const utilities = Math.round((+inp.utilities_mes || 0) * mesesHold);
  const insurance = Math.round((+inp.insurance_mes || 0) * mesesHold);   // insurance de la casa (CEO 14-jul)
  const extras = (+inp.muebles || 0) + (+inp.appraisal_cost || 0) + (+inp.cashout_en_draw || 0) + (+inp.permisos || 0) + (+inp.dumpster || 0) + (+inp.ac || 0);
  // ═ UNA SOLA BASE DEL HML (punto 0): préstamo bruto = %COMPRA × compra + %REMO × DRAW TOTAL ═
  // % SEPARADOS (CEO 14-jul): el HML presta distinto sobre la compra (90 típico) que sobre la remo (100).
  // El interés corre sobre ESE préstamo × meses de HOLDING → punto fijo (converge en 2-3 vueltas).
  const pctCompra0 = ffUwPctCompra(inp) / 100;
  const pctRemo0 = ffUwPctRemo(inp) / 100;
  const baseModo0 = UWct('uw_base_modo', 'draw');
  const contingenciaFija = +inp.contingencia_fija || 0;                  // valor fijo opcional (pisa el %)
  // intereses AJUSTABLES (CEO 14-jul): override manual del monto — si está, pisa el punto fijo
  const interesesOverride = +inp.intereses_override || 0;
  let intereses = interesesOverride > 0 ? Math.round(interesesOverride) : 0;
  let subtotal = 0, contingencia = 0, draw = 0, prestamoIter = 0;
  for (let i = 0; i < 6; i++) {
    subtotal = remod + intereses + utilities + insurance + extras;
    contingencia = contingenciaFija > 0 ? Math.round(contingenciaFija) : Math.round(subtotal * ((+inp.contingencia_pct || 0) / 100));
    draw = subtotal + contingencia;
    prestamoIter = (+inp.purchase || 0) * pctCompra0 + (baseModo0 === 'rehab' ? remod : draw) * pctRemo0;
    if (interesesOverride > 0) break;                                    // monto manual: no iterar
    const nuevo = Math.round(prestamoIter * intMensual * mesesHold);
    if (nuevo === intereses) break;
    intereses = nuevo;
  }
  // alerta déficit: remod del draw vs costo real calibrado
  const psfDraw = (+inp.est_sqft > 0) ? remod / +inp.est_sqft : null;
  const psfAlerta = UWc('deficit_alert_psf', 60);
  const deficitRiesgo = psfDraw != null && psfDraw < psfAlerta;
  // 1B · EL INVERSIONISTA PONE (HUD-1):
  //   Base = compra + DRAW TOTAL (obs #8 CEO 13-jul: $200,000 + $135,080 = $335,080 · 90% = $301,572)
  //   modo 'rehab' (legacy, calibración Bethune compra+rehab) disponible via ff_uw_config uw_base_modo
  //   Inversionista pone = Down + gastos de cierre − créditos (earnest + option + proración: se ACREDITAN, no se suman)
  const R2 = n => Math.round(n * 100) / 100;
  const financia = Math.round((+inp.purchase || 0) * pctCompra0);   // legado: base de intereses (calc 4)
  const baseModo = baseModo0;
  const baseHud = (+inp.purchase || 0) + (baseModo === 'rehab' ? remod : draw);
  // LA base única del HML (misma del punto fijo): %compra × compra + %remo × draw
  const prestamo = R2((+inp.purchase || 0) * pctCompra0 + (baseModo === 'rehab' ? remod : draw) * pctRemo0);
  const downPayment = R2(baseHud - prestamo);   // = compra×(1−%compra) + draw×(1−%remo)
  const origination = R2(prestamo * ((+inp.cc_origination_pct || 0) / 100));
  const feesPrestamista = R2(origination + (+inp.cc_documentation || 0) + (+inp.cc_draw_fee || 0) + (+inp.cc_underwriting || 0) + (+inp.cc_prepaid_interest || 0));
  const feesTitulo = R2((+inp.cc_title || 0) + (+inp.cc_escrow || 0) + (+inp.cc_recording || 0) + (+inp.cc_ucc || 0) + (+inp.cc_courier || 0) + (+inp.cc_guaranty || 0));
  const assignment = inp.wholesale ? (+inp.cc_assignment || 0) : 0;
  const closing = R2(feesPrestamista + feesTitulo + assignment);
  const creditos = R2((+inp.earnest || 0) + (+inp.option_fee || 0) + (+inp.prorata_impuestos || 0));
  const cashToClose = R2(downPayment + closing - creditos);
  const yaPagado = R2((+inp.earnest || 0) + (+inp.option_fee || 0));
  // 1C · EL HARD MONEY TE PRESTA (desembolso neto) vs PAYOFF al refinanciar — dos números DISTINTOS
  const feesLenderCierre = R2((+inp.cc_documentation || 0) + (+inp.cc_draw_fee || 0) + (+inp.cc_underwriting || 0));
  const desembolsoNeto = R2(prestamo - origination - feesLenderCierre);
  const capitaliza = +inp.hml_capitaliza || 0;                  // interés/reserva que el term sheet suma al principal
  const payoffHml = R2(prestamo + capitaliza);                  // → alimenta la Calc 3 (Cash-Out) solo
  return { remod, intereses, utilities, insurance, contingencia, draw, psfDraw: psfDraw ? Math.round(psfDraw) : null, psfAlerta, deficitRiesgo,
    mesesObra, mesesRenta, mesesHold, tasaHml: ffUwTasaHml(inp), baseModo,
    pctCompra: ffUwPctCompra(inp), pctRemo: ffUwPctRemo(inp),
    financia, baseHud, prestamo, downPayment, origination, feesPrestamista, feesTitulo, assignment, closing, creditos, yaPagado, cashToClose,
    feesLenderCierre, desembolsoNeto, capitaliza, payoffHml,
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
// ═══ CALCULADORA 3 · CASH-OUT (refi DSCR itemizado — ingeniería inversa de Michelle/Echo, Champions Funding) ═══
// Valor tasado (appraisal si existe, si no ARV — Childress probó que la tasación del refi manda, incluso > ARV)
// → préstamo = min(valor × LTV, tope DSCR) → − payoff − costos ITEMIZADOS = cash-out (Balance to Borrower).
// El campo Airtable "Monto Pagado al HML con la Refi" = payoff + costos (todo menos el cash-out) → ancla exacta.
function ffUwCalcCashout(inp, arv) {
  const R2 = n => Math.round(n * 100) / 100;
  // 1) valor
  const arvA = arv.arvAirtable || arv.probable || 0;
  const appraisal = +inp.appraisal || 0;
  const valorTasado = appraisal > 0 ? appraisal : arvA;     // base del préstamo y de los impuestos
  const usaAppraisal = appraisal > 0;
  // 2) préstamo = min(LTV, tope DSCR)
  const ltvPct = +inp.ltv_pct || UWc('refi_ltv_pct', 75);
  const tasaAnual = ffUwTasaDscr(inp) / 100;               // ⛓ UNA tasa DSCR para Calc 3 y 4 (editable inline)
  const r = tasaAnual / 12, nM = ffUwPlazoDscr(inp) * 12;
  const factorPI = r > 0 ? r * Math.pow(1 + r, nM) / (Math.pow(1 + r, nM) - 1) : 0;  // pago P&I por $1
  const taxPct = (+inp.refi_tax_pct || 0) / 100;
  const taxMes = valorTasado * taxPct / 12;
  const segMes = (+inp.refi_seguro_anual || 0) / 12;
  const dscrObj = +inp.refi_dscr_obj || 1;
  const renta = +inp.renta_mensual || 0;
  const piMax = renta > 0 ? renta / dscrObj - taxMes - segMes : null;                // P&I máximo que la renta banca
  const topeDscr = (piMax != null && piMax > 0 && factorPI > 0) ? Math.round(piMax / factorPI) : null;
  const prestamoLtv = Math.round(valorTasado * ltvPct / 100);
  const prestamoCalc = topeDscr != null ? Math.min(prestamoLtv, topeDscr) : prestamoLtv;
  const limitante = (topeDscr != null && topeDscr < prestamoLtv) ? 'dscr' : 'ltv';
  const prestamoReal = +inp.refi_prestamo_real || 0;
  const prestamo = prestamoReal > 0 ? prestamoReal : prestamoCalc;                   // real de Airtable manda si existe
  // 4) costos de refi — itemizados y COMPUTADOS (no un fee plano)
  const origination = R2(prestamo * ((+inp.refi_orig_pct || 0) / 100));
  const feesLender = R2(origination + (+inp.refi_uw_fee || 0) + (+inp.refi_proc_fee || 0));
  const titulo = R2((+inp.refi_titulo || 0) + prestamo * ((+inp.refi_titulo_pct || 0) / 100));
  const prepagado = R2(prestamo * tasaAnual / 365 * (+inp.refi_dias_prepagado || 0));
  const seguroAnual = +inp.refi_seguro_anual || 0;
  const seguro = R2(seguroAnual + (seguroAnual / 12) * (+inp.refi_imp_seguro_m || 0));  // prima + impound
  const taxAnual = R2(valorTasado * taxPct);
  const impuestos = R2(taxAnual * (1 + (+inp.refi_imp_imp_m || 0) / 12));               // 1 año + impound M meses
  const otros = +inp.refi_otros || 0;
  const costos = R2(feesLender + titulo + prepagado + seguro + impuestos + otros);
  // 3) payoff — CADENA (punto 2): override manual → real del refi (Airtable) → ⛓ CALCULADO en Del Negocio → saldo HML
  const pagadoReal = +inp._refi_pagado_real || 0;
  let payoff, payoffFuente, payoffOverride = false;
  if (+inp.payoff > 0) {
    payoff = +inp.payoff; payoffOverride = true;
    payoffFuente = (+inp._hml_saldo > 0 && +inp.payoff === +inp._hml_saldo) ? 'real: saldo HML del deal (Airtable)' : 'override manual';
  }
  else if (pagadoReal > 0) { payoff = R2(pagadoReal - costos); payoffFuente = 'derivado: pagado Airtable − costos'; }
  else if (+inp._payoffCalc > 0) { payoff = +inp._payoffCalc; payoffFuente = '⛓ calculado en Del Negocio (principal HML + capitalizado)'; }
  else if (+inp._hml_saldo > 0) { payoff = +inp._hml_saldo; payoffFuente = '⛓ del deal: saldo HML (Airtable)'; }
  else { payoff = 0; payoffFuente = 'sin dato — cargalo del HUD o corré Del Negocio'; }
  // 5) cash-out (Balance to Borrower)
  const cashOut = R2(prestamo - payoff - costos);
  // 6) escrows = tu propia plata guardada (impuestos + seguro prepagados/impound)
  const escrows = R2(impuestos + seguro);
  const recuperadoNeto = R2(cashOut + escrows);
  const ctc = (inp._ctcCalc != null ? inp._ctcCalc : 0);
  const recuperaPct = ctc > 0 ? Math.round(100 * cashOut / ctc) : null;
  const cashoutReal = inp._cashout_real != null ? +inp._cashout_real : null;         // ancla Airtable
  return { valorTasado, usaAppraisal, arvA, appraisal, ltv: ltvPct, prestamoLtv, topeDscr, limitante, prestamoCalc, prestamoReal, prestamo,
    origination, feesLender, titulo, prepagado, seguro, seguroAnual, taxAnual, impuestos, otros, costos,
    payoff, payoffFuente, payoffOverride, payoffCalc: +inp._payoffCalc || null, pagadoReal, cashOut, escrows, recuperadoNeto, recuperaPct, ctc, cashoutReal,
    tasaAnual: ffUwTasaDscr(inp), dscrObj, renta,
    // compat con calc 4/6 (nombre legado)
    prestamoRefi: prestamo, base: valorTasado };
}
// ═══ CALCULADORA 4 · INTERESES ═══
function ffUwCalcIntereses(inp, cashout, negocio) {
  // ⛓ UNA base del HML (punto 0): el préstamo bruto de Del Negocio — se acabó el $291,780 vs $280,000
  const prestamoBruto = negocio && negocio.prestamo > 0 ? Math.round(negocio.prestamo)
    : Math.round((+inp.purchase || 0) * (ffUwPctCompra(inp) / 100) + (inp._remodCalc || 0) * (ffUwPctRemo(inp) / 100));  // fallback legacy
  const tasaHarmony = ffUwTasaHml(inp) / 100;
  const mesesObra = negocio ? negocio.mesesObra : ffUwMesesObra(inp);
  const mesesHoldI = negocio ? negocio.mesesHold : ffUwMesesHold(inp);
  const R2i = n => Math.round(n * 100) / 100;
  // solo interés: el PAGO MENSUAL no depende de los meses (295,856 × 12%/12 = 2,958.56 — con centavos)
  const intMensualHarmony = R2i(prestamoBruto * tasaHarmony / 12);
  // el CARRY real = HOLDING completo (obra + hasta rentar/vender — CEO 14-jul): lo que de verdad se paga
  const interesTotalObra = R2i(intMensualHarmony * mesesHoldI);
  const dscrPrincipal = cashout.prestamoRefi || 0;
  const tasaDscr = ffUwTasaDscr(inp) / 100 / 12;
  const nDscr = ffUwPlazoDscr(inp) * 12;
  const pagoDscr = dscrPrincipal > 0 && tasaDscr > 0 ? Math.round(dscrPrincipal * tasaDscr * Math.pow(1 + tasaDscr, nDscr) / (Math.pow(1 + tasaDscr, nDscr) - 1)) : 0;
  return { financia: prestamoBruto, prestamoBruto, intMensualHarmony, interesTotalObra, dscrPrincipal, pagoDscr,
    tasaHarmony: ffUwTasaHml(inp), tasaDscr: ffUwTasaDscr(inp), plazoDscr: ffUwPlazoDscr(inp),
    mesesObra, mesesRenta: negocio ? negocio.mesesRenta : ffUwMesesRenta(inp), mesesHold: negocio ? negocio.mesesHold : ffUwMesesHold(inp) };
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
  inp._payoffCalc = negocio.payoffHml;                 // ⛓ el payoff fluye SOLO a la Calc 3 (punto 2)
  const arv = ffUwCalcArv(inp);
  const cashout = ffUwCalcCashout(inp, arv);
  const intereses = ffUwCalcIntereses(inp, cashout, negocio);
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
  return `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${sel}${a ? `<input value="${UW_E(a.nombre)}" onchange="UW.a.nombre=this.value" style="background:var(--card,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:9px;padding:8px 11px;color:inherit;font-size:13px" placeholder="nombre del análisis"><button class="repbtn" data-uw-guardar="1">💾 Guardar</button><span style="font-size:11px;opacity:.6">${a.ff_deal_id ? '📎 casa real' : a.es_hipotetica ? '🧪 hipotética' : ''} · calibrado con ${UW.deals.length} casas</span>` : ''}</div>${nav}${body}`;
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
// ─── Calc 1 · UI patrón Cash-Out (ola 1, 12-jul): hero + 4 inputs + ajustes colapsados. Lógica intacta en ffUwCalcNegocio. ───
function ffUwViewNegocio() {
  const inp = UW.a.inputs, r = ffUwCalcNegocio(inp);
  const estToggle = '<div style="display:flex;gap:6px;margin-bottom:10px"><button class="repbtn ' + (inp.usar_estimador ? 'ghost' : '') + '" style="padding:5px 11px;font-size:11px" onclick="ffUwSet(\'usar_estimador\',false)">Costo real (Remodelación)</button><button class="repbtn ' + (inp.usar_estimador ? '' : 'ghost') + '" style="padding:5px 11px;font-size:11px" onclick="ffUwSet(\'usar_estimador\',true)">Estimador rápido $/sqft</button></div>';
  const estBox = inp.usar_estimador
    ? '<div style="background:color-mix(in srgb, var(--a1) 7%, transparent);border-radius:10px;padding:12px;margin-bottom:16px">' + kitInput('Superficie (sqft)', 'pies cuadrados a remodelar', inp.est_sqft, "ffUwSet('est_sqft',VAL)", { plain: true }) + '<div style="display:flex;gap:5px;margin-bottom:6px">' + ['suave', 'media', 'pesada'].map(t => '<button class="repbtn ' + (inp.est_tipo === t ? '' : 'ghost') + '" style="flex:1;padding:6px;font-size:11px;text-transform:capitalize" onclick="ffUwSet(\'est_tipo\',\'' + t + '\')">' + t + ' $' + ffUwPsf(t) + '</button>').join('') + '</div><div style="font-size:11px;color:var(--txt3,#9fb0c9)">' + (+inp.est_sqft || 0) + ' sqft &times; $' + ffUwPsf(inp.est_tipo) + '/sqft = <b>' + UW_M(r.remod) + '</b> &middot; afuera costaría ' + UW_M(UWc('psf_mercado_externo', 110) * (+inp.est_sqft || 0))
      + (() => { const afuera = UWc('psf_mercado_externo', 110) * (+inp.est_sqft || 0); const sug = Math.round((r.remod + afuera) / 2); return (r.remod > 0 && afuera > 0) ? ' &middot; <b style="color:var(--a1,#12b5a0)">sugerido (media): ' + UW_M(sug) + '</b> <button class="repbtn ghost" style="padding:2px 8px;font-size:10px" onclick="ffUwSet(\'remod_directo\',' + sug + ');ffUwSet(\'usar_estimador\',false)">→ usar</button>' : ''; })() + '</div></div>'
    : kitInput('Costo de remodelación', 'real de la empresa de Remodelación', inp.remod_directo, "ffUwSet('remod_directo',VAL)", { foot: r.remod === 0 ? '⚠ sin costo real cargado — usá el estimador rápido' : 'del histórico de Remodelación' });
  const alerta = r.deficitRiesgo ? '<div class="ui-error" style="margin-top:8px">&#9888; Riesgo de déficit: el remod del draw es $' + r.psfDraw + '/sqft, por debajo del calibrado ($' + r.psfAlerta + '/sqft). El draw puede no cubrir la obra real.</div>' : '';
  // O7 (auditoría 13-jul): supuestos desde la HISTORIA real — visibles, aplicación a 1 clic (humano)
  const cal = UW.calib;
  const supuestosO7 = cal ? '<div style="background:rgba(18,181,160,.07);border:1px solid rgba(18,181,160,.28);border-radius:10px;padding:10px 12px;margin-top:10px;font-size:11.5px">'
    + '⚙️ <b>Historia real</b>: obra <b>$' + (cal.psf_real || '—') + '/sqft</b> (' + cal.psf_n + ' finalizadas) · duración <b>' + (cal.obra_meses_prom || '—') + ' m</b> · holding hasta rentar <b>' + (cal.holding_meses_prom || '—') + ' m</b>. Hoy: $/sqft media <b>$' + ffUwPsf('media') + '</b> · hold <b>' + r.mesesHold + ' m</b> (default = obra calibrada).'
    + (cal.psf_real && Math.abs(cal.psf_real - ffUwPsf('media')) > 3 && window.apCfgSet ? ' <button class="repbtn" style="padding:3px 10px;font-size:10.5px" onclick="apCfgSet(\'psf_media\',' + cal.psf_real + ')">aplicar $' + cal.psf_real + '/sqft</button>' : '')
    + (cal.holding_meses_prom && Math.abs(Math.round(cal.holding_meses_prom) - UWc('default_meses_hold', 6)) >= 1 && window.apCfgSet ? ' <button class="repbtn ghost" style="padding:3px 10px;font-size:10.5px" onclick="apCfgSet(\'default_meses_hold\',' + Math.round(cal.holding_meses_prom) + ')">aplicar hold ' + Math.round(cal.holding_meses_prom) + ' m</button>' : '')
    + '</div>' : '';
  // hero protagonista: lo que pone el inversionista (+ draw como dato hermano)
  const hero = kitHero('El inversionista pone', UW_M2(r.cashToClose),
    'down + gastos de cierre &minus; créditos (HUD) · Draw al Harmony: <b>' + UW_M(r.draw) + '</b>' + (r.ctcReal ? ' · 🎯 real Airtable ' + UW_M(r.ctcReal) + ' (Δ ' + UW_M(r.cashToClose - r.ctcReal) + ')' : ''), 'var(--a2,#2f6ef0)');
  const inputs = '<div class="card" style="padding:20px 22px;margin-bottom:16px;border-radius:18px">'
    + kitInput('Precio de compra', 'lo que se paga por la casa', inp.purchase, "ffUwSet('purchase',VAL)")
    + estToggle + estBox
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + kitInputSm('% de la COMPRA que presta', r.pctCompra, "ffUwSet('hml_pct_compra',VAL)", { pct: true })
    + kitInputSm('% de la REMODELACIÓN que presta', r.pctRemo, "ffUwSet('hml_pct_remo',VAL)", { pct: true })
    + '</div>'
    + '<div style="font-size:11px;color:var(--txt3,#9fb0c9);margin:-4px 0 10px">típico Harmony: <b>90%</b> de la compra · <b>100%</b> de la remo — préstamo = ' + r.pctCompra + '%×compra + ' + r.pctRemo + '%×' + (r.baseModo === 'rehab' ? 'rehab' : 'draw') + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + kitInputSm('Meses de OBRA (remodelación)', r.mesesObra, "ffUwSet('meses_obra',VAL)")
    + kitInputSm('Meses HASTA RENTAR O VENDER (después de la obra)', r.mesesRenta, "ffUwSet('meses_renta',VAL)")
    + '</div>'
    + '<div style="font-size:11px;color:var(--txt3,#9fb0c9);margin:-4px 0 10px">⏱ obra ' + r.mesesObra + ' m + hasta rentar/vender ' + r.mesesRenta + ' m = <b>holding ' + r.mesesHold + ' m</b> — sobre ESA suma corren intereses, utilities e insurance (lo real que se paga y sale de los draws) · obra calibrada: ' + ((UW.calib && UW.calib.obra_meses_prom) || '—') + ' m</div>'
    + '</div>';
  const adv = '<details ' + (UW.negAdv ? 'open' : '') + ' ontoggle="UW.negAdv=this.open" style="background:var(--card,rgba(255,255,255,.04));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:18px;padding:4px 22px;margin-bottom:16px">'
    + '<summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--txt3,#9fb0c9);padding:14px 0;list-style:none">⚙︎ Ajustes (opcional) — draw y cierre HUD, ya calibrados</summary>'
    + '<div style="padding-bottom:16px">'
    + '<div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--a1,#12b5a0);margin:4px 0 8px">Del draw</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + kitInputSm('Utilities / mes', inp.utilities_mes, "ffUwSet('utilities_mes',VAL)")
    + kitInputSm('Insurance de la casa / mes', inp.insurance_mes, "ffUwSet('insurance_mes',VAL)")
    + kitInputSm('Tasa HML (%/año)', ffUwTasaHml(inp), "ffUwSet('hml_tasa_anual',VAL)", { pct: true })
    + kitInputSm('Intereses del draw — MANUAL (0 = calculado)', inp.intereses_override, "ffUwSet('intereses_override',VAL)")
    + kitInputSm('Muebles / staging', inp.muebles, "ffUwSet('muebles',VAL)")
    + kitInputSm('Appraisal', inp.appraisal_cost, "ffUwSet('appraisal_cost',VAL)")
    + kitInputSm('Cash-out en el draw', inp.cashout_en_draw, "ffUwSet('cashout_en_draw',VAL)")
    + kitInputSm('Permisos', inp.permisos, "ffUwSet('permisos',VAL)")
    + kitInputSm('Dumpster', inp.dumpster, "ffUwSet('dumpster',VAL)")
    + kitInputSm('AC / HVAC', inp.ac, "ffUwSet('ac',VAL)")
    + kitInputSm('Contingencia (%)', inp.contingencia_pct, "ffUwSet('contingencia_pct',VAL)", { pct: true })
    + kitInputSm('Contingencia FIJA (pisa el %)', inp.contingencia_fija, "ffUwSet('contingencia_fija',VAL)")
    + kitInputSm('Interés/fees capitalizados al payoff', inp.hml_capitaliza, "ffUwSet('hml_capitaliza',VAL)")
    + '</div>'
    + '<div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--a2,#2f6ef0);margin:16px 0 8px">Cierre HUD · fees prestamista</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + kitInputSm('Origination (%)', inp.cc_origination_pct, "ffUwSet('cc_origination_pct',VAL)", { pct: true })
    + kitInputSm('Documentation', inp.cc_documentation, "ffUwSet('cc_documentation',VAL)")
    + kitInputSm('Draw fee', inp.cc_draw_fee, "ffUwSet('cc_draw_fee',VAL)")
    + kitInputSm('Underwriting', inp.cc_underwriting, "ffUwSet('cc_underwriting',VAL)")
    + kitInputSm('Prepaid interest', inp.cc_prepaid_interest, "ffUwSet('cc_prepaid_interest',VAL)")
    + kitInputSm('Title insurance', inp.cc_title, "ffUwSet('cc_title',VAL)")
    + kitInputSm('Escrow fee', inp.cc_escrow, "ffUwSet('cc_escrow',VAL)")
    + kitInputSm('Recording', inp.cc_recording, "ffUwSet('cc_recording',VAL)")
    + kitInputSm('UCC', inp.cc_ucc, "ffUwSet('cc_ucc',VAL)")
    + kitInputSm('Courier', inp.cc_courier, "ffUwSet('cc_courier',VAL)")
    + kitInputSm('Guaranty', inp.cc_guaranty, "ffUwSet('cc_guaranty',VAL)")
    + '</div>'
    + '<div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--pos,#34d399);margin:16px 0 8px">Créditos al cierre (ya pagados, se acreditan)</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + kitInputSm('Earnest money', inp.earnest, "ffUwSet('earnest',VAL)")
    + kitInputSm('Option fee', inp.option_fee, "ffUwSet('option_fee',VAL)")
    + kitInputSm('Proración de impuestos', inp.prorata_impuestos, "ffUwSet('prorata_impuestos',VAL)")
    + '</div>'
    + '<div style="margin-top:14px;display:flex;gap:8px;align-items:center"><button class="repbtn ' + (inp.wholesale ? '' : 'ghost') + '" style="padding:5px 11px;font-size:11px" onclick="ffUwSet(\'wholesale\',' + (inp.wholesale ? 'false' : 'true') + ')">' + (inp.wholesale ? '☑' : '☐') + ' Deal por wholesaler</button>'
    + (inp.wholesale ? '<div style="flex:1">' + kitInputSm('Assignment fee', inp.cc_assignment, "ffUwSet('cc_assignment',VAL)") + '</div>' : '<span style="font-size:10px;color:var(--txt3,#9fb0c9)">assignment fee al cierre (Bethune: $40,000)</span>') + '</div>'
    + '</div></details>';
  const desglose = '<div class="card" style="padding:20px 22px;border-radius:18px">'
    + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3,#9fb0c9);margin-bottom:4px">Draw al Harmony</div>'
    + kitRow('Remodelación', r.remod) + kitRow(+inp.intereses_override > 0 ? 'Intereses HML (MANUAL — <a style="cursor:pointer;color:var(--a1,#12b5a0)" onclick="ffUwSet(\'intereses_override\',0)">↩ volver al calculado</a>)' : 'Intereses HML (' + r.mesesHold + 'm de HOLDING @ ' + r.tasaHml + '%/año · solo interés · sobre el préstamo bruto)', r.intereses) + kitRow('Utilities (' + r.mesesHold + 'm de holding)', r.utilities)
    + (r.insurance > 0 ? kitRow('Insurance de la casa (' + r.mesesHold + 'm)', r.insurance) : '')
    + kitRow('Muebles + appraisal + permisos + dumpster + AC', (+inp.muebles) + (+inp.appraisal_cost) + (+inp.permisos) + (+inp.dumpster) + (+inp.ac))
    + (+inp.cashout_en_draw > 0 ? kitRow('Cash-out incluido', +inp.cashout_en_draw) : '')
    + kitRow('Contingencia (' + (+inp.contingencia_fija > 0 ? 'FIJA' : inp.contingencia_pct + '%') + ')', r.contingencia)
    + kitRow('<b>= Draw total</b>', r.draw, { big: true, color: 'var(--a1,#12b5a0)' })
    + (+inp._draw_real > 0 ? '<div style="font-size:10.5px;color:var(--txt3,#9fb0c9);margin-top:4px">⛓ Draw real del deal (Airtable): ' + UW_M(+inp._draw_real) + ' &middot; &Delta; modelo ' + UW_M(r.draw - inp._draw_real) + '</div>' : '')
    + alerta + supuestosO7
    + '<div style="border-top:1px solid var(--line,rgba(255,255,255,.12));margin-top:10px;padding-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3,#9fb0c9)">El inversionista pone (HUD)</div>'
    + kitRow(r.baseModo === 'rehab' ? 'Base (compra ' + UW_M(+inp.purchase) + ' + rehab ' + UW_M(r.remod) + ')' : 'Base (compra ' + UW_M(+inp.purchase) + ' + DRAW TOTAL ' + UW_M(r.draw) + ')', r.baseHud)
    + kitRow('&minus; Préstamo (' + r.pctCompra + '% compra + ' + r.pctRemo + '% ' + (r.baseModo === 'rehab' ? 'rehab' : 'draw') + ')', r.prestamo, { neg: true })
    + kitRow('= Down payment', r.downPayment)
    + kitRow('+ Fees prestamista (orig ' + UW_M2(r.origination) + ' + doc + draw + uw + prepaid)', r.feesPrestamista)
    + kitRow('+ Título / escrow / registro', r.feesTitulo)
    + (inp.wholesale ? kitRow('+ Assignment fee (wholesaler)', r.assignment) : '')
    + kitRow('&minus; Créditos (earnest + option + proración)', r.creditos, { neg: true })
    + kitRow('<b>= EL INVERSIONISTA PONE</b>', null, { big: true, txt: UW_M2(r.cashToClose), color: 'var(--a2,#2f6ef0)', last: true })
    + '<div style="font-size:11px;color:var(--txt2,#c9d5ea);margin-top:8px;background:color-mix(in srgb, var(--a2) 8%, transparent);border-radius:8px;padding:8px 10px">Ya pagado como earnest/option: <b>' + UW_M2(r.yaPagado) + '</b> (acreditado) &middot; falta al cierre: <b>' + UW_M2(r.cashToClose) + '</b></div>'
    + (r.closingReal ? '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:6px">Gastos de cierre reales (Airtable): ' + UW_M(r.closingReal) + ' &middot; &Delta; ' + UW_M(r.closing - r.closingReal) + '</div>' : '')
    // 1C · lo que RECIBE el negocio vs lo que DEBE al refinanciar — dos números distintos (punto 1)
    + '<div style="border-top:1px solid var(--line,rgba(255,255,255,.12));margin-top:12px;padding-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3,#9fb0c9)">El hard money te presta (desembolso neto)</div>'
    + kitRow('Préstamo bruto (' + r.pctCompra + '% compra + ' + r.pctRemo + '% ' + (r.baseModo === 'rehab' ? 'rehab' : 'draw') + ')', r.prestamo)
    + kitRow('&minus; Puntos/originación (' + (+inp.cc_origination_pct || 0) + '%)', r.origination, { neg: true })
    + kitRow('&minus; Fees de cierre del lender (doc + draw + uw)', r.feesLenderCierre, { neg: true })
    + kitRow('<b>= Desembolso neto al negocio</b>', null, { big: true, txt: UW_M2(r.desembolsoNeto), color: 'var(--pos,#34d399)' })
    + '<div style="border-top:1px solid var(--line,rgba(255,255,255,.12));margin-top:12px;padding-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3,#9fb0c9)">Payoff del HML al refinanciar</div>'
    + kitRow('Principal del HML', r.prestamo)
    + kitRow('+ Interés/fees que se capitalizan (term sheet)', r.capitaliza || 0)
    + kitRow('<b>= Lo que le pagás al refinanciar</b>', null, { big: true, txt: UW_M2(r.payoffHml), color: 'var(--amber,#e7b65e)', last: true })
    + '<div style="font-size:10.5px;color:var(--txt3,#9fb0c9);margin-top:6px">⛓ Este payoff alimenta SOLO la Calc 3 (Cash-Out) — no lo re-tecleás. Recibís ' + UW_M2(r.desembolsoNeto) + ' pero debés ' + UW_M2(r.payoffHml) + ': no son lo mismo.</div>'
    + '</div>';
  return '<div style="max-width:560px;margin:0 auto">'
    + '<div style="margin-bottom:16px"><div style="font-size:19px;font-weight:700">Del Negocio</div><div style="font-size:13px;color:var(--txt3,#9fb0c9)">Compra + obra: cuánto desembolsa el prestamista y cuánto pone el inversionista.</div></div>'
    + hero + inputs + adv + desglose + '</div>';
}
function ffUwRender() {
  const el = document.getElementById('ff-uw-body');
  if (el) el.innerHTML = ffUwShell();
}

// ═══ VISTAS de las calculadoras 2-6 ═══
function ffUwViewArv() {
  // Calc 2 = ARV PROFESIONAL (pm/ff-arv-pro.js): tasador con comps RentCast ajustados estilo 1004.
  // El ARV de Airtable sigue siendo la fuente de verdad de MAO/cash-out; el motor produce el estimado profesional.
  if (window.ffArvProView) return ffArvProView();
  const inp = UW.a.inputs, o = ffUwComputeAll(), a = o.arv;
  const hero = UW_HERO('ARV (valor de reventa)', UW_M(a.probable), a.esAirtable ? 'de Airtable (fuente de verdad) &middot; confianza ' + a.confianza : 'estimado por comps &middot; confianza ' + a.confianza, a.esAirtable ? 'var(--pos,#34d399)' : 'var(--amber,#e7b65e)');
  const izq = UW_CARD('2 &middot; ARV', 'El valor de la casa remodelada. La fuente de verdad es el ARV de Airtable.',
    UW_BLOCK('Fuente de verdad', UW_IN('ARV de Airtable', 'arv', inp.arv, { help: 'Propiedades.ARV — alimenta MAO, cash-out y margen en toda la app' }) + UW_IN('Appraisal real (ancla)', 'appraisal', inp.appraisal, { help: 'Valor de tasación cuando exista' })) +
    UW_BLOCK('Referencia por comparables', UW_IN('Superficie (sqft)', 'est_sqft', inp.est_sqft, { tipo: 'num' }) + '<div style="font-size:11px;color:var(--txt3,#9fb0c9)">$/sqft de la zona: $' + a.psfZona + ' &rarr; comps = ' + UW_M(a.arvComps) + ' <b>(referencia)</b></div>' + ffUwRcCompsBox()) +
    '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:6px">&#128268; Mercado en vivo (PropStream/HAR): pendiente de enganche.</div>');
  const der = hero + '<div class="card" style="padding:16px"><div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--txt3,#9fb0c9);margin-bottom:8px">Rango de valor</div>' + UW_ROW('&#128317; Conservador', a.conservador) + UW_ROW('&#127919; Probable', a.probable, 'tot') + UW_ROW('&#128316; Optimista', a.optimista) + '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:8px">Comps (referencia): ' + UW_M(a.arvComps) + (a.appraisal > 0 ? ' &middot; appraisal: ' + UW_M(a.appraisal) : '') + '</div></div>';
  return '<div class="grid k2" style="gap:16px;align-items:start"><div>' + izq + '</div><div>' + der + '</div></div>';
}
// ─── Calc 3 · UI rediseñada (12-jul, mockup CEO): 3 inputs protagonistas + hero + ajustes colapsados.
// La LÓGICA vive intacta en ffUwCalcCashout — esto es solo presentación.
function ffUwViewCashout() {
  const inp = UW.a.inputs, o = ffUwComputeAll(), c = o.cashout;
  const infinito = c.recuperaPct != null && c.recuperaPct >= 100;
  const pos = c.cashOut >= 0;
  const heroCol = pos ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)';
  // input grande (mockup): label + hint, caja redondeada, número a la derecha
  const IN3 = (lab, hint, k, val, opts) => {
    opts = opts || {}; const pct = !!opts.pct;
    return '<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">' + lab + (hint ? ' <span style="color:var(--txt3,#9fb0c9);font-weight:400;font-size:12px">— ' + hint + '</span>' : '') + '</div>'
      + '<div style="display:flex;align-items:center;border:1.5px solid var(--line,rgba(255,255,255,.14));border-radius:12px;padding:0 12px;background:var(--card,rgba(255,255,255,.04))">'
      + (pct ? '' : '<span style="color:var(--txt3,#9fb0c9);font-size:15px">' + UW_DLR + '</span>')
      + '<input value="' + UW_FMT(val, pct ? 'pct' : 'money') + '" placeholder="0" onchange="ffUwSet(&quot;' + k + '&quot;,this.value.replace(/[,%\\s' + UW_DLR + ']/g,&quot;&quot;))" style="border:0;outline:0;width:100%;padding:12px 8px;font-size:17px;font-weight:600;color:inherit;background:transparent;text-align:right">'
      + (pct ? '<span style="color:var(--txt3,#9fb0c9);font-size:15px">%</span>' : '') + '</div>'
      + (opts.foot ? '<div style="font-size:11px;color:var(--txt3,#9fb0c9);margin-top:4px">' + opts.foot + '</div>' : '') + '</div>';
  };
  const IN3s = (lab, k, val, opts) => { // versión compacta para "Ajustes" (grilla 2 col)
    opts = opts || {}; const pct = !!opts.pct, plain = !!opts.plain;
    return '<div><div style="font-size:12px;font-weight:600;margin-bottom:5px;color:var(--txt2,#c9d5ea)">' + lab + '</div>'
      + '<div style="display:flex;align-items:center;border:1.5px solid var(--line,rgba(255,255,255,.12));border-radius:10px;padding:0 10px;background:var(--card,rgba(255,255,255,.04))">'
      + (pct || plain ? '' : '<span style="color:var(--txt3,#9fb0c9);font-size:13px">' + UW_DLR + '</span>')
      + '<input value="' + UW_FMT(val, pct ? 'pct' : plain ? 'num' : 'money') + '" placeholder="0" onchange="ffUwSet(&quot;' + k + '&quot;,this.value.replace(/[,%\\s' + UW_DLR + ']/g,&quot;&quot;))" style="border:0;outline:0;width:100%;padding:9px 6px;font-size:14px;font-weight:600;color:inherit;background:transparent;text-align:right">'
      + (pct ? '<span style="color:var(--txt3,#9fb0c9);font-size:13px">%</span>' : '') + '</div></div>';
  };
  const ROW3 = (l, v, opts) => {
    opts = opts || {};
    return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:7px 0;' + (opts.last ? '' : 'border-bottom:1px dashed var(--line,rgba(255,255,255,.1));') + (opts.big ? 'font-size:15px;' : 'font-size:13px;') + 'color:var(--txt2,#c9d5ea)"><span>' + l + '</span><b style="color:' + (opts.neg ? 'var(--neg,#f87171)' : opts.color || 'inherit') + ';font-weight:700;white-space:nowrap">' + (opts.txt != null ? opts.txt : UW_M2(v)) + '</b></div>';
  };
  // ── HERO: un solo número protagonista ──
  const heroNote = c.topeDscr != null && c.limitante === 'dscr'
    ? '⚠ el préstamo lo limita el DSCR (renta baja): tope ' + UW_M(c.topeDscr) + ' &lt; LTV ' + UW_M(c.prestamoLtv)
    : 'plata que sale del refi, después de pagar el HML y los costos';
  const heroReal = c.cashoutReal != null ? '<div style="font-size:12px;margin-top:8px;opacity:.85;color:' + heroCol + '">🎯 real (Airtable): <b>' + UW_M2(c.cashoutReal) + '</b> · Δ modelo ' + UW_M2(c.cashOut - c.cashoutReal) + '</div>' : '';
  const recupera = c.recuperaPct != null ? '<div style="font-size:12px;margin-top:4px;opacity:.85;color:' + heroCol + '">' + (infinito ? '♾️ <b>retorno infinito</b> — recuperás el ' + c.recuperaPct + '% de lo que pusiste (' + UW_M2(c.ctc) + ')' : 'recuperás el <b>' + c.recuperaPct + '%</b> de lo que pusiste (' + UW_M2(c.ctc) + ')') + '</div>' : '';
  const hero = '<div style="background:color-mix(in srgb, ' + heroCol + ' 10%, transparent);border:1px solid color-mix(in srgb, ' + heroCol + ' 35%, transparent);border-radius:20px;padding:22px 24px;margin-bottom:18px">'
    + '<div style="font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:' + heroCol + ';font-weight:700">Cash-out estimado</div>'
    + '<div style="font-size:42px;font-weight:800;color:' + heroCol + ';margin-top:4px;letter-spacing:-1px">' + UW_M2(c.cashOut) + '</div>'
    + '<div style="font-size:12px;color:' + heroCol + ';margin-top:4px;opacity:.9">' + heroNote + '</div>' + heroReal + recupera + '</div>';
  // ── SOLO 3 INPUTS visibles ──
  const valorMostrado = (+inp.appraisal || 0) > 0 ? inp.appraisal : (inp.arv_airtable || inp.arv || 0);
  const inputs = '<div class="card" style="padding:20px 22px;margin-bottom:16px;border-radius:18px">'
    + IN3('Valor de refi / ARV', 'tasación esperada', 'appraisal', valorMostrado, { foot: c.usaAppraisal ? 'usando la tasación (appraisal)' : 'usando el ARV de Airtable — al escribir acá pasás a tasación' })
    + IN3('Renta mensual', 'para el tope DSCR', 'renta_mensual', inp.renta_mensual, { foot: c.topeDscr != null ? 'tope DSCR (' + c.dscrObj + 'x): ' + UW_M(c.topeDscr) + ' · tope LTV: ' + UW_M(c.prestamoLtv) : 'sin renta, el tope DSCR no se evalúa (solo LTV)' })
    + IN3('Payoff del HML', 'saldo a pagar al refinanciar — ⛓ se llena solo desde Del Negocio', 'payoff', c.payoffOverride ? inp.payoff : c.payoff, {
      foot: 'fuente: ' + c.payoffFuente
        + (c.payoffOverride && c.payoffCalc > 0 ? ' · <a style="cursor:pointer;color:var(--a1,#12b5a0)" onclick="ffUwSet(\'payoff\',0)">↩ volver al calculado (' + UW_M2(c.payoffCalc) + ')</a>' : '')
        + (!c.payoffOverride ? ' · escribí un valor para override manual' : '') })
    + '</div>';
  // ── AJUSTES colapsados (defaults calibrados de ff_uw_config) ──
  const adv = '<details ' + (UW.cashoutAdv ? 'open' : '') + ' ontoggle="UW.cashoutAdv=this.open" style="background:var(--card,rgba(255,255,255,.04));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:18px;padding:4px 22px;margin-bottom:16px">'
    + '<summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--txt3,#9fb0c9);padding:14px 0;list-style:none">⚙︎ Ajustes (opcional) — ya vienen con tus valores calibrados</summary>'
    + '<div style="padding-bottom:16px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + IN3s('LTV del refi (%)', 'ltv_pct', inp.ltv_pct, { pct: true })
    + IN3s('DSCR objetivo (x)', 'refi_dscr_obj', inp.refi_dscr_obj, { plain: true })
    + IN3s('Originación (%)', 'refi_orig_pct', inp.refi_orig_pct, { pct: true })
    + IN3s('Escala título (%)', 'refi_titulo_pct', inp.refi_titulo_pct, { pct: true })
    + IN3s('Underwriting', 'refi_uw_fee', inp.refi_uw_fee)
    + IN3s('Processing', 'refi_proc_fee', inp.refi_proc_fee)
    + IN3s('Título / registro', 'refi_titulo', inp.refi_titulo)
    + IN3s('Días al 1er pago', 'refi_dias_prepagado', inp.refi_dias_prepagado, { plain: true })
    + IN3s('Seguro anual', 'refi_seguro_anual', inp.refi_seguro_anual)
    + IN3s('Impound seguro (meses)', 'refi_imp_seguro_m', inp.refi_imp_seguro_m, { plain: true })
    + IN3s('Impuesto condado (%/año)', 'refi_tax_pct', inp.refi_tax_pct, { pct: true })
    + IN3s('Impound impuestos (meses)', 'refi_imp_imp_m', inp.refi_imp_imp_m, { plain: true })
    + IN3s('Préstamo real (override)', 'refi_prestamo_real', inp.refi_prestamo_real)
    + IN3s('Otros (ajuste vs HUD)', 'refi_otros', inp.refi_otros)
    + '</div><div style="font-size:11px;color:var(--txt3,#9fb0c9);margin-top:12px">Tasa DSCR ' + c.tasaAnual + '% · 30 años (Champions, reverseada de tus refis — editable en config)' + (c.prestamoReal > 0 ? ' · usando el préstamo REAL de Airtable ' + UW_M(c.prestamoReal) : '') + '</div></div></details>';
  // ── MINI DESGLOSE (préstamo − payoff − costos) + detalle ──
  const origYEscala = c.origination + (c.titulo - Math.min(c.titulo, +inp.refi_titulo || 0));
  const desglose = '<div class="card" style="padding:20px 22px;border-radius:18px">'
    + ROW3('Préstamo del refi (' + c.ltv + '% de ' + UW_M(c.valorTasado) + (c.prestamoReal > 0 ? ' · real Airtable' : c.limitante === 'dscr' ? ' · limitado por DSCR' : '') + ')', c.prestamo)
    + ROW3('&minus; Payoff del HML', c.payoff, { neg: true })
    + ROW3('&minus; Costos del refi', c.costos, { neg: true })
    + ROW3('<b>= Cash-out</b>', c.cashOut, { big: true, color: heroCol })
    + '<div style="border-top:1px solid var(--line,rgba(255,255,255,.12));margin-top:8px;padding-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3,#9fb0c9)">Detalle de costos</div>'
    + ROW3('Underwriting + Processing', (+inp.refi_uw_fee || 0) + (+inp.refi_proc_fee || 0))
    + ROW3('Título / registro', c.titulo)
    + ROW3('Interés prepagado (' + inp.refi_dias_prepagado + ' días @ ' + c.tasaAnual + '%)', c.prepagado)
    + ROW3('Seguro (prima + ' + inp.refi_imp_seguro_m + 'm escrow)', c.seguro)
    + ROW3('Impuestos (1 año + ' + inp.refi_imp_imp_m + 'm escrow)', c.impuestos)
    + (c.origination > 0 ? ROW3('Originación (' + inp.refi_orig_pct + '%)', c.origination) : '')
    + (c.otros ? ROW3('Otros (ajuste HUD)', c.otros) : '')
    + '<div style="background:rgba(47,110,240,.07);border-radius:10px;padding:10px 12px;margin-top:10px;font-size:12px;color:var(--txt2,#c9d5ea);line-height:1.5">💡 De los costos, <b>' + UW_M2(c.escrows) + '</b> son escrows (impuestos + seguro): <b>tu propia plata guardada</b>, no un gasto perdido. Capital recuperado neto: <b style="color:var(--pos,#34d399)">' + UW_M2(c.recuperadoNeto) + '</b></div>'
    + (c.pagadoReal > 0 ? '<div style="font-size:10.5px;color:var(--txt3,#9fb0c9);margin-top:8px">Pagado al HML con la refi (Airtable, incluye costos): ' + UW_M2(c.pagadoReal) + ' · modelo payoff+costos: ' + UW_M2(c.payoff + c.costos) + '</div>' : '')
    + '</div>';
  return '<div style="max-width:560px;margin:0 auto">'
    + '<div style="margin-bottom:16px"><div style="font-size:19px;font-weight:700">Refi Cash-Out</div><div style="font-size:13px;color:var(--txt3,#9fb0c9)">Meté 3 datos y te da el cash-out. Lo demás ya está calibrado con tus refis reales.</div></div>'
    + hero + inputs + adv + desglose + '</div>';
}
// ─── Calc 4 · DOS MODELITOS SEPARADOS (CEO 13-jul): dos préstamos, dos bases, dos fórmulas — nunca una sola tarjeta ───
//   1) HML solo-interés: pago mensual = préstamo × tasa/12 (los meses SOLO mueven el total del hold)
//   2) Refi DSCR amortizado: cuota P&I a 30 años sobre el préstamo del refi (⛓ Calc 3: LTV × valor / tope DSCR)
//   Cada base viene ⛓ de su calc de origen — acá no se re-teclea nada.
function ffUwViewIntereses() {
  const inp = UW.a.inputs, o = ffUwComputeAll(), i = o.intereses, co = o.cashout;
  const refReal = inp._ref30_real;
  const amber = 'var(--amber,#e7b65e)', azul = 'var(--a2,#2f6ef0)';
  // ═ MODELITO 1 · HARMONY (HML) — SOLO INTERÉS, durante la obra/hold ═
  const heroHml = kitHero('🔨 Pago mensual al Harmony', UW_M2(i.intMensualHarmony) + '/mes',
    'HML · ' + i.tasaHarmony + '%/año · solo interés · durante la obra/hold — <b>el pago mensual no depende de los meses</b>', amber);
  const cardHml = '<div class="card" style="padding:18px 22px;border-radius:18px;margin-bottom:22px">'
    + kitRow('Préstamo bruto del HML (⛓ Del Negocio: ' + o.negocio.pctCompra + '% compra + ' + o.negocio.pctRemo + '% draw)', i.prestamoBruto)
    + kitRow('× ' + i.tasaHarmony + '% ÷ 12 = pago mensual', i.intMensualHarmony, { money2: true })
    + kitRow('<b>Interés total estimado del holding (' + i.mesesHold + ' m = obra ' + i.mesesObra + ' + hasta rentar/vender ' + i.mesesRenta + ')</b>', i.interesTotalObra, { money2: true, big: true, color: amber, last: true })
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">'
    + kitInputSm('Tasa HML (%/año)', i.tasaHarmony, "ffUwSet('hml_tasa_anual',VAL)", { pct: true })
    + kitInputSm('Meses de OBRA', i.mesesObra, "ffUwSet('meses_obra',VAL)")
    + kitInputSm('Meses HASTA RENTAR O VENDER', i.mesesRenta, "ffUwSet('meses_renta',VAL)")
    + '</div>'
    + '<div style="font-size:10.5px;color:var(--txt3,#9fb0c9);margin-top:8px">Holding = obra + hasta rentar/vender (los meses solo mueven el <b>total</b>, no el pago mensual). ⛓ Propaga: el pago mensual al flujo durante el hold (Calc 5) y al carry del déficit; el total a la reserva de interés del draw (Calc 1).</div>'
    + '</div>';
  // ═ MODELITO 2 · REFI (DSCR) — AMORTIZADO, después del refi ═
  const baseTxt = co.prestamoReal > 0 ? 'préstamo real del refi (Airtable/override)' : (co.limitante === 'dscr' ? 'tope DSCR — la renta manda' : co.ltv + '% × ' + (co.usaAppraisal ? 'tasación del refi' : 'ARV'));
  const heroRefi = kitHero('🏦 Pago mensual de la refi', UW_M(i.pagoDscr) + '/mes',
    'DSCR · refinanciación · amortizado — P&amp;I sobre ' + UW_M(i.dscrPrincipal) + ' (' + baseTxt + ') a ' + i.plazoDscr + ' años @ ' + i.tasaDscr + '%', azul);
  const cardRefi = '<div class="card" style="padding:18px 22px;border-radius:18px;margin-bottom:16px">'
    + kitRow('Préstamo del refi (⛓ Cash-Out: ' + baseTxt + ')', i.dscrPrincipal)
    + kitRow('<b>Cuota amortizada P&amp;I (' + (i.plazoDscr * 12) + ' cuotas @ ' + i.tasaDscr + '%/año)</b>', i.pagoDscr, { big: true, color: azul, last: !refReal })
    + (refReal ? kitRow('🎯 PITI real de referencia (Airtable, incluye imp+seguro)', null, { txt: UW_M2(refReal), last: true }) : '')
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px">'
    + kitInputSm('Tasa DSCR (%/año)', i.tasaDscr, "ffUwSet('dscr_tasa_anual',VAL)", { pct: true })
    + kitInputSm('Plazo (años)', i.plazoDscr, "ffUwSet('dscr_plazo_anos',VAL)")
    + kitInputSm('Préstamo (override)', inp.refi_prestamo_real, "ffUwSet('refi_prestamo_real',VAL)")
    + '</div>'
    + '<div style="font-size:10.5px;color:var(--txt3,#9fb0c9);margin-top:8px">La base NO tiene nada que ver con la compra ni con el HML: nace en el Cash-Out (LTV × valor tasado, con tope DSCR). Override vacío = ⛓ calculado. ⛓ Propaga: la cuota al flujo después del refi (Calc 5) y a Analítica; el préstamo al cash-out (Calc 3: refi − payoff − costos).</div>'
    + '</div>';
  const porQue = '<div style="font-size:11px;color:var(--txt3,#9fb0c9);line-height:1.6;padding:0 4px">Son <b>dos préstamos, dos bases y dos fórmulas</b>: el HML es solo-interés sobre compra + draw (pago = préstamo × tasa ÷ 12); la refi es amortizada sobre el valor tasado (cuota a 30 años). Cambiar el ARV mueve la refi sin tocar el HML; cambiar el draw mueve el HML sin tocar la refi.</div>';
  return '<div style="max-width:560px;margin:0 auto">'
    + '<div style="margin-bottom:16px"><div style="font-size:19px;font-weight:700">Intereses</div><div style="font-size:13px;color:var(--txt3,#9fb0c9)">Dos préstamos distintos, cada uno con su pago mensual: el hard money durante la obra/hold y el DSCR después del refi.</div></div>'
    + heroHml + cardHml + heroRefi + cardRefi + porQue + '</div>';
}
// ─── Calc 5 · UI patrón Cash-Out (ola 1): hero flujo + 1 input + desglose. Lógica intacta. ───
function ffUwViewIngreso() {
  // Calc 5 = INGRESO POR MODELO (pm/ff-ingreso-modelos.js): casa/habitaciones/unidades/mixta con tarifas
  // calibradas de Rentas real, comparadas lado a lado. renta_mensual sigue siendo la fuente guardada.
  if (window.ffIngresoView) return ffIngresoView();
  const inp = UW.a.inputs, o = ffUwComputeAll(), g = o.ingreso;
  const pos = g.flujo >= 0;
  const hero = kitHero('Flujo mensual', UW_M(g.flujo) + '/mes',
    (pos ? '' : '⚠ <b>flujo negativo</b> — la renta no cubre los gastos · ') + (g.cashOnCash != null ? 'cash-on-cash ' + g.cashOnCash + '% sobre ' + UW_M(g.cashLeft) + ' que quedan invertidos' : (g.renta === 0 ? 'cargá la renta para ver el flujo real' : '')), pos ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)');
  const inputs = '<div class="card" style="padding:20px 22px;margin-bottom:16px;border-radius:18px">'
    + kitInput('Renta mensual proyectada', 'de Rentas real por modelo', inp.renta_mensual, "ffUwSet('renta_mensual',VAL)", { foot: 'Gastos calibrados (config): PM ' + UWc('pm_fee_pct', 8) + '% · vacancy ' + UWc('vacancy_pct', 5) + '% · mantenimiento ' + UWc('mantenimiento_pct', 5) + '% · impuestos ' + UWc('impuestos_pct_arv', 2.2) + '% ARV/año · seguro ' + UW_M(UWc('seguro_mensual', 120)) + '/mes' })
    + ffUwRcRentBox()
    + '</div>';
  const desglose = '<div class="card" style="padding:20px 22px;border-radius:18px">'
    + kitRow('Renta', g.renta)
    + kitRow('&minus; Pago DSCR (Calc 4)', g.pagoDscr, { neg: true })
    + kitRow('&minus; Impuestos', g.impuestos, { neg: true })
    + kitRow('&minus; Seguro', g.seguro, { neg: true })
    + kitRow('&minus; Property management (' + UWc('pm_fee_pct', 8) + '%)', g.pmFee, { neg: true })
    + kitRow('&minus; Vacancy (' + UWc('vacancy_pct', 5) + '%)', g.vacancy, { neg: true })
    + kitRow('&minus; Mantenimiento (' + UWc('mantenimiento_pct', 5) + '%)', g.mantenimiento, { neg: true })
    + kitRow('<b>= Flujo mensual</b>', g.flujo, { big: true, color: pos ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)', last: true })
    + '</div>'
    // ⛓ pago HML de la Calc 4: antes del refi el flujo paga el hard money, no la cuota DSCR
    + (o.intereses.intMensualHarmony > 0 ? '<div class="card" style="padding:11px 16px;margin-top:10px;font-size:12px;color:var(--txt3,#9fb0c9)">⏳ <b>Durante el hold</b> (antes del refi, si ya renta): pagando el HML ' + UW_M(o.intereses.intMensualHarmony) + '/mes (⛓ Calc 4) en vez de la cuota DSCR → <b style="color:' + (g.flujo + g.pagoDscr - o.intereses.intMensualHarmony >= 0 ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)') + '">' + UW_M(g.flujo + g.pagoDscr - o.intereses.intMensualHarmony) + '/mes</b></div>' : '');
  return '<div style="max-width:560px;margin:0 auto">'
    + '<div style="margin-bottom:16px"><div style="font-size:19px;font-weight:700">Ingreso Mensual</div><div style="font-size:13px;color:var(--txt3,#9fb0c9)">El flujo que deja la casa rentada, después de TODOS los gastos.</div></div>'
    + hero + inputs + desglose + '</div>';
}
function ffUwViewUnificada() {
  // Calc 6 = VISTA UNIFICADA PRO (pm/ff-unificada-pro.js): resumen de un vistazo + one-pager inversionista.
  if (window.ffUnificadaView) return ffUnificadaView();
  const o = ffUwComputeAll(), u = o.unificada;
  const chip = (ok, l) => '<span class="badge ' + (ok ? 'b-ok' : 'b-warn') + '" style="font-size:10px">' + (ok ? '&#10003;' : '&#9888;') + ' ' + l + '</span>';
  const verColor = u.veredicto === 'GO' ? 'var(--pos,#34d399)' : u.veredicto === 'NO-GO' ? 'var(--neg,#f87171)' : 'var(--amber,#e7b65e)';
  const kpi = (l, v, sub) => '<div class="card kpi" style="padding:16px"><div class="lab">' + l + '</div><div class="big">' + v + '</div>' + (sub ? '<div class="meta">' + sub + '</div>' : '') + '</div>';
  return '<div class="card" style="text-align:center;padding:24px;border:2px solid ' + verColor + '"><div style="font-size:12px;color:var(--txt2,#c9d5ea);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Veredicto del deal</div><div style="font-size:46px;font-weight:800;color:' + verColor + '">' + u.veredicto + '</div><div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap">' + chip(u.gAllIn, 'all-in &le;' + u.allInMax + '% ARV') + chip(u.gDeficit, 'sin riesgo déficit') + chip(u.gFlujo, 'flujo +') + '</div><button class="repbtn" style="margin-top:16px" onclick="ffUwPresentacion()">&#128196; Generar presentación de negocio</button></div>' +
    '<div class="grid k4" style="margin-top:16px">' + kpi('All-in', UW_M(u.allIn), u.allInPct != null ? u.allInPct + '% del ARV (máx ' + u.allInMax + '%)' : '') + kpi('MAO (oferta máxima)', UW_M(u.mao), 'compra máxima al guardrail') + kpi('El inversionista pone', UW_M2(u.cashToClose), 'HUD: down + cierre &minus; créditos') + kpi('Cash-out / recupera', UW_M(u.cashOut), u.recuperaPct != null ? (u.recuperaPct >= 100 ? '♾️ retorno infinito (' + u.recuperaPct + '%)' : u.recuperaPct + '% recuperado') + ' · escrows ' + UW_M(o.cashout.escrows) : '') + '</div>' +
    '<div class="grid k3" style="margin-top:14px">' + kpi('Cash left in', UW_M(u.cashLeftIn), 'capital que queda invertido') + kpi('Flujo mensual', UW_M(u.flujo) + '/mes', '') + kpi('ROI (cash-on-cash)', u.roi != null ? u.roi + '%' : '—', 'flujo anual &divide; cash left in') + '</div>' +
    '<div class="card" style="margin-top:16px;padding:16px"><div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--txt3,#9fb0c9);margin-bottom:6px">Cadena del deal</div><div style="font-size:11.5px;color:var(--txt2,#c9d5ea);line-height:1.6">ARV ' + UW_M(o.arv.probable) + ' &rarr; remod ' + UW_M(o.negocio.remod) + ' + draw ' + UW_M(o.negocio.draw) + ' &rarr; el inversionista pone ' + UW_M2(o.negocio.cashToClose) + ' (HUD) &rarr; cash-out ' + UW_M(o.cashout.cashOut) + ' &rarr; Harmony ' + UW_M(o.intereses.intMensualHarmony) + '/mes &middot; DSCR ' + UW_M(o.intereses.pagoDscr) + '/mes &rarr; flujo ' + UW_M(o.ingreso.flujo) + '/mes. Guardrails: all-in &le;' + u.allInMax + '% ARV, regla de déficit. ' + (u.veredicto === 'GO' ? '&#9989; pasa.' : u.veredicto === 'NO-GO' ? '&#10060; no pasa.' : '&#9888; revisar.') + '</div></div>';
}
function ffUwPresentacion() {
  if (window.ffUnificadaOnePager) return ffUnificadaOnePager();   // one-pager pro (fallback: el viejo)
  const o = ffUwComputeAll(), u = o.unificada, a = UW.a;
  const DLR = String.fromCharCode(36);
  const M = n => DLR + Math.round(n || 0).toLocaleString('en-US');
  const w = window.open('', '_blank', 'width=800,height=1000');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Análisis ${UW_E(a.nombre)}</title><style>
    body{font-family:-apple-system,Segoe UI,sans-serif;color:#111;margin:0;padding:36px;max-width:720px}
    .h{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #2563eb;padding-bottom:14px}
    .logo{font-size:22px;font-weight:800;color:#2563eb}.logo span{display:block;font-size:10px;letter-spacing:2px;color:#666}
    .ver{font-size:34px;font-weight:800;color:${u.veredicto === 'GO' ? '#16a34a' : u.veredicto === 'NO-GO' ? '#dc2626' : '#d97706'}}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}
    .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:10px}.kpi .l{font-size:10px;text-transform:uppercase;color:#666}.kpi .v{font-size:20px;font-weight:800}
    .chain{font-size:12px;color:#444;line-height:1.6;margin-top:16px;background:#f8fafc;padding:12px;border-radius:8px}
    .btn{position:fixed;top:10px;right:10px;padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700}
    @media print{.btn{display:none}}</style></head><body>
    <button class="btn" onclick="window.print()">🖨 PDF</button>
    <div class="h"><div class="logo">FLIPPING RENTALS <span>ANÁLISIS DE INVERSIÓN</span></div><div style="text-align:right"><div class="ver">${u.veredicto}</div><div style="font-size:11px;color:#666">${UW_E(a.direccion || a.nombre)}</div></div></div>
    <div class="grid">
      <div class="kpi"><div class="l">ARV</div><div class="v">${M(o.arv.probable)}</div></div>
      <div class="kpi"><div class="l">All-in (${u.allInPct}% ARV)</div><div class="v">${M(u.allIn)}</div></div>
      <div class="kpi"><div class="l">El inversionista pone (HUD)</div><div class="v">${M(u.cashToClose)}</div></div>
      <div class="kpi"><div class="l">Cash-out (${u.recuperaPct >= 100 ? '♾️ retorno infinito' : 'recupera ' + (u.recuperaPct || 0) + '%'})</div><div class="v">${M(u.cashOut)}</div></div>
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
window.ffUwRentcast = ffUwRentcast; window.ffUwRcSlot = ffUwRcSlot;
// referencia de comps de RentCast (pestaña ARV)
function ffUwRcCompsBox() {
  const s = ffUwRcSlot('value');
  if (s === 'loading') return '<div style="font-size:11px;color:var(--txt3,#9fb0c9)">⏳ consultando mercado en vivo…</div>';
  if (!s) return '<button class="repbtn ghost" style="padding:5px 11px;font-size:11px" onclick="ffUwRentcast(\'value\')">🔌 Traer mercado en vivo (RentCast)</button>';
  if (s.disponible === false) return '<div style="font-size:11px;color:var(--amber,#e7b65e)">⚠ Mercado en vivo no disponible' + (s.error ? ' (' + UW_E(String(s.error).slice(0, 60)) + ')' : '') + ' — se usa el $/sqft por zona.</div>';
  const comps = (s.payload && s.payload.comparables) || [];
  const fecha = s.fetched_at ? String(s.fetched_at).slice(0, 10) : '';
  return '<div style="background:color-mix(in srgb, var(--a2,#2563eb) 7%, transparent);border-radius:9px;padding:10px;margin-top:6px">'
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
