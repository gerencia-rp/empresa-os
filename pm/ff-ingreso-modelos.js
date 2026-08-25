// ════════════════════════════════════════════════════════════════
// 🏠 CALC 5 · INGRESO POR MODELO DE NEGOCIO — la renta depende de CÓMO se renta la casa.
// 4 modelos: Casa Completa · Por Habitaciones · Por Unidades · Mixta, comparados LADO A LADO
// (bruta + flujo neto + cash-on-cash por modelo) con el mejor resaltado.
// Tarifas calibradas con la base de Rentas REAL (apptTKRYbx6gu701i): hab $800 · estudio $1,100 ·
// apto $2,000 · casa Austin $3,100 / Marlin $1,200 — en ff_uw_config, editables POR ZONA
// (sur/norte/rr/marlin, key ing_<tipo>_<zona> con fallback ing_<tipo>). Vacancy por modelo
// (más rotación en habitaciones/unidades). Cero hardcode. La mezcla REAL de la casa viene de
// pm_units (espejo Rentas) cuando existe; el # de habitaciones también sale de RentCast (Calc 2).
// La renta elegida se aplica al análisis con un botón explícito (renta_mensual sigue siendo la
// fuente guardada). Estado por análisis en UW.a.inputs.ing.
// ════════════════════════════════════════════════════════════════

const IG_M = n => (n == null || isNaN(n)) ? '—' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const IG_E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const IG_ZONAS = [['sur', 'Austin Sur'], ['norte', 'Austin Norte'], ['rr', 'Round Rock'], ['marlin', 'Marlin']];
const IG_MODELOS = [['casa', 'Casa Completa', 'house'], ['hab', 'Por Habitaciones', 'door'], ['unidades', 'Por Unidades', 'building'], ['mixta', 'Mixta', 'layout']];

function igState() {
  if (!UW.a) return null;
  if (!UW.a.inputs.ing) UW.a.inputs.ing = { modelo: null, zona: null, hab_n: null, est_n: null, apto_n: null, mx_hab: 0, mx_est: 0, mx_apto: 0, casa_manual: null };
  return UW.a.inputs.ing;
}
// zona: detectada de la dirección (editable) — Marlin / Round Rock / zips del norte / resto = sur
function igZonaAuto() {
  const dir = ((UW.a && UW.a.direccion) || '') + ' ' + ((UW.a && UW.a.ciudad) || '');
  if (/marlin/i.test(dir)) return 'marlin';
  if (/round rock|78664|78665|78681/i.test(dir)) return 'rr';
  const zip = (dir.match(/\b(7\d{4})\b/) || [])[1];
  if (zip && ['78753', '78752', '78757', '78758', '78727', '78728', '78729', '78717', '78754', '78660'].includes(zip)) return 'norte';
  return 'sur';
}
function igZona() { const st = igState(); return (st && st.zona) || igZonaAuto(); }
// tarifa por zona con fallback a la base (ing_hab_marlin → ing_hab)
function igRate(tipo, def) { const z = igZona(); return UWc('ing_' + tipo + '_' + z, UWc('ing_' + tipo, def)); }
function igVac(modelo) { return UWc('ing_vac_' + modelo, { casa: 5, hab: 10, unidades: 8, mixta: 8 }[modelo] || 8); }

// mezcla REAL de la casa en Rentas (pm_units espejo, dedupe por nombre) — si la casa ya renta
function igMixReal() {
  if (!UW.a || !UW.a.property_id || !UW.pmProps || !UW.pmUnits) return null;
  const pm = UW.pmProps.find(p => p.property_id === UW.a.property_id);
  if (!pm) return null;
  const vistos = new Set(); const mix = { habitacion: 0, estudio: 0, apartamento: 0, casa_completa: 0 };
  UW.pmUnits.filter(u => u.property_id === pm.id).forEach(u => {
    const k = (u.unit_type || '') + '|' + (u.name || '');
    if (vistos.has(k) || mix[u.unit_type] == null) return;
    vistos.add(k); mix[u.unit_type]++;
  });
  const total = mix.habitacion + mix.estudio + mix.apartamento + mix.casa_completa;
  return total ? mix : null;
}
// # habitaciones: manual → RentCast (Calc 2) → mezcla real de Rentas → 4
function igHabN() {
  const st = igState();
  if (st.hab_n != null && st.hab_n !== '') return +st.hab_n;
  const rc = (window.ffUwRcSlot && ffUwRcSlot('property')) || null;
  if (rc && rc !== 'loading' && rc.payload && rc.payload.bedrooms != null) return +rc.payload.bedrooms;
  const mx = igMixReal();
  if (mx && mx.habitacion) return mx.habitacion;
  return 4;
}

// ─── CÁLCULO por modelo: bruta → flujo neto → cash-on-cash (gastos calibrados, editables) ───
function ffIngCalc(inp, ctx) {
  const st = igState();
  const mx = igMixReal();
  const rcRent = (window.ffUwRcSlot && (s => s && s !== 'loading' && s.value ? +s.value : null)(ffUwRcSlot('rent'))) || null;
  const habN = igHabN();
  const estN = st.est_n != null && st.est_n !== '' ? +st.est_n : (mx ? mx.estudio : 0);
  const aptoN = st.apto_n != null && st.apto_n !== '' ? +st.apto_n : (mx ? mx.apartamento : 0);
  const brutas = {
    casa: st.casa_manual != null && st.casa_manual !== '' ? +st.casa_manual : (rcRent || igRate('casa', 3100)),
    hab: habN * igRate('hab', 800),
    unidades: estN * igRate('estudio', 1100) + aptoN * igRate('apto', 2000),
    mixta: (+st.mx_hab || 0) * igRate('hab', 800) + (+st.mx_est || 0) * igRate('estudio', 1100) + (+st.mx_apto || 0) * igRate('apto', 2000),
  };
  const out = {};
  Object.entries(brutas).forEach(([m, bruta]) => {
    const vacPct = igVac(m);
    const pmFee = Math.round(bruta * UWc('pm_fee_pct', 8) / 100);
    const vacancy = Math.round(bruta * vacPct / 100);
    const mant = Math.round(bruta * UWc('mantenimiento_pct', 5) / 100);
    const flujo = Math.round(bruta - ctx.pagoDscr - ctx.impuestos - ctx.seguro - ctx.hoa - pmFee - vacancy - mant);
    out[m] = { bruta: Math.round(bruta), vacPct, pmFee, vacancy, mant, flujo, coc: ctx.cashLeft > 0 ? Math.round(1000 * flujo * 12 / ctx.cashLeft) / 10 : null };
  });
  return { modelos: out, habN, estN, aptoN, rcRent, mixReal: mx, mejor: Object.entries(out).sort((a, b) => b[1].bruta - a[1].bruta)[0][0] };
}

// ─── acciones ───
function igSet(k, v) { const st = igState(); if (!st) return; st[k] = v; ffUwRender(); }
window.igSet = igSet;
function igUsarRenta(v, modelo) {
  if (!UW.a || !(v > 0)) return;
  UW.a.inputs.renta_mensual = v; igState().modelo = modelo;
  ffUwRender(); if (window.toast) toast('Renta del análisis ← ' + IG_M(v) + ' (' + modelo + ')', 'success');
}
window.igUsarRenta = igUsarRenta;
function igUsarMix() {
  const mx = igMixReal(); if (!mx) return;
  const st = igState(); st.est_n = mx.estudio; st.apto_n = mx.apartamento; st.hab_n = mx.habitacion || null;
  st.mx_hab = mx.habitacion; st.mx_est = mx.estudio; st.mx_apto = mx.apartamento;
  ffUwRender();
}
window.igUsarMix = igUsarMix;

// ─── UI (tokens del tema FF: --ink/--mut; reusa .ap-* de ff-arv-pro) ───
function igIn(lab, val, onchange, w) {
  return '<div><div style="font-size:10.5px;color:var(--mut,#8b93a1);font-weight:700;margin-bottom:2px">' + lab + '</div>'
    + '<input value="' + (val == null || val === '' ? '' : IG_E(val)) + '" placeholder="0" onchange="' + onchange + '" style="width:' + (w || '84px') + ';background:var(--glass,rgba(255,255,255,.05));border:1px solid var(--glassb,rgba(255,255,255,.12));border-radius:8px;padding:6px 9px;color:var(--ink,#eaf0ff);font-size:13px;font-weight:700;outline:none"></div>';
}
function igCfgIn(lab, key, def) {
  const z = igZona();
  const k = key + '_' + z;
  const v = UWc(k, UWc(key, def));
  return igIn(lab, v, "apCfgSet('" + k + "',this.value)", '100%');
}

function ffIngresoView() {
  if (window.apCSS) apCSS();
  const inp = UW.a.inputs;
  const st = igState();
  const o = ffUwComputeAll();
  const ctx = { pagoDscr: o.intereses.pagoDscr || 0, pagoHml: o.intereses.intMensualHarmony || 0, impuestos: o.ingreso.impuestos || 0, seguro: UWc('seguro_mensual', 120), hoa: Math.round(+inp.hoa_mes || 0), cashLeft: inp._cashLeftIn != null ? inp._cashLeftIn : 0 };
  const r = ffIngCalc(inp, ctx);
  const zona = igZona();
  const modeloSel = st.modelo || r.mejor;
  const mm = r.modelos;

  // header: zona + tarifas de la zona (editables de verdad)
  const zonaSel = '<select onchange="igSet(\'zona\',this.value)" style="background:var(--glass,rgba(255,255,255,.05));border:1px solid var(--glassb,rgba(255,255,255,.12));border-radius:9px;padding:7px 10px;color:var(--ink,#eaf0ff);font-size:12.5px;font-weight:700">'
    + IG_ZONAS.map(([k, l]) => '<option value="' + k + '" ' + (zona === k ? 'selected' : '') + '>' + l + (k === igZonaAuto() ? ' (auto)' : '') + '</option>').join('') + '</select>';
  const head = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px">'
    + '<div style="display:flex;align-items:center;gap:10px"><b style="font-size:18px">' + osIcon('house', { size: 18 }) + ' Ingreso · ¿cómo conviene rentarla?</b><span class="ap-pill">tarifas calibradas con Rentas real</span></div>'
    + '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;color:var(--mut,#8b93a1)">Zona</span>' + zonaSel + '</div></div>';

  // COMPARADOR: los 4 modelos lado a lado, el mejor resaltado
  const lblM = Object.fromEntries(IG_MODELOS.map(([k, l]) => [k, l]));
  const icoM = Object.fromEntries(IG_MODELOS.map(([k, l, i]) => [k, i]));
  const casaBase = mm.casa.bruta;
  const cards = IG_MODELOS.map(([m, lbl, ico]) => {
    const x = mm[m];
    const esMejor = m === r.mejor && x.bruta > 0;
    const sel = m === modeloSel;
    const detalle = m === 'casa' ? (st.casa_manual ? 'renta manual' : (r.rcRent ? 'RentCast ' + IG_M(r.rcRent) : 'tarifa zona ' + IG_M(igRate('casa', 3100))))
      : m === 'hab' ? r.habN + ' hab × ' + IG_M(igRate('hab', 800))
      : m === 'unidades' ? r.estN + ' est × ' + IG_M(igRate('estudio', 1100)) + ' + ' + r.aptoN + ' apto × ' + IG_M(igRate('apto', 2000))
      : (+st.mx_hab || 0) + 'h + ' + (+st.mx_est || 0) + 'e + ' + (+st.mx_apto || 0) + 'a';
    return '<div class="ap-card" onclick="igSet(\'modelo\',\'' + m + '\')" style="padding:16px;cursor:pointer;position:relative;' + (esMejor ? 'border-color:var(--pos,#4ade9e);box-shadow:0 0 0 2px var(--pos,#4ade9e),0 6px 22px rgba(23,43,77,.08);' : '') + (sel && !esMejor ? 'border-color:var(--a2,#3a5be0);' : '') + '">'
      + (esMejor ? '<span style="position:absolute;top:-9px;left:12px;background:var(--pos,#4ade9e);color:#fff;font-size:10px;font-weight:800;padding:2px 10px;border-radius:20px">' + osIcon('dollar', { size: 10 }) + ' GENERA MÁS</span>' : '')
      + '<div class="ap-lab">' + osIcon(ico, { size: 12 }) + ' ' + lbl + '</div>'
      + '<div style="font-size:26px;font-weight:800;margin:6px 0 1px;color:' + (esMejor ? 'var(--pos,#4ade9e)' : 'var(--ink,#eaf0ff)') + '">' + IG_M(x.bruta) + '<span style="font-size:12px;font-weight:600;color:var(--mut,#8b93a1)">/mes</span></div>'
      + '<div style="font-size:10.5px;color:var(--mut,#8b93a1)">' + IG_E(detalle) + '</div>'
      + '<div style="border-top:1px solid var(--glassb,rgba(255,255,255,.08));margin-top:9px;padding-top:8px;font-size:11.5px;display:flex;justify-content:space-between"><span style="color:var(--mut,#8b93a1)">flujo neto</span><b class="' + (x.flujo >= 0 ? 'ap-pos' : 'ap-neg') + '">' + IG_M(x.flujo) + '/mes</b></div>'
      + '<div style="font-size:11.5px;display:flex;justify-content:space-between"><span style="color:var(--mut,#8b93a1)">cash-on-cash</span><b>' + (x.coc != null ? x.coc + '%' : '—') + '</b></div>'
      + '<div style="font-size:11.5px;display:flex;justify-content:space-between"><span style="color:var(--mut,#8b93a1)">vacancy</span><span style="color:var(--mut,#8b93a1)">' + x.vacPct + '%</span></div>'
      + '<button class="ap-btn' + (sel ? '' : ' ghost') + '" style="width:100%;margin-top:9px;padding:7px;font-size:11.5px" onclick="event.stopPropagation();igUsarRenta(' + x.bruta + ',\'' + m + '\')">→ Usar como renta</button>'
      + '</div>';
  }).join('');
  const mejorTxt = r.mejor !== 'casa' && mm[r.mejor].bruta > casaBase
    ? '<div style="background:rgba(52,211,153,.09);border:1px solid rgba(52,211,153,.3);border-radius:11px;padding:10px 14px;margin:12px 0;font-size:13px">' + osIcon('lightbulb', { size: 13 }) + ' Con <b>' + lblM[r.mejor] + '</b> generás <b>' + IG_M(mm[r.mejor].bruta) + '</b> vs <b>' + IG_M(casaBase) + '</b> como Casa Completa — <b class="ap-pos">' + IG_M(mm[r.mejor].bruta - casaBase) + ' más por mes</b> (' + IG_M((mm[r.mejor].bruta - casaBase) * 12) + '/año), con vacancy ' + mm[r.mejor].vacPct + '% vs ' + mm.casa.vacPct + '%.</div>'
    : '';

  // CONFIGURAR la mezcla del modelo seleccionado
  const mixChip = r.mixReal ? '<button class="ap-btn ghost" style="font-size:11px;padding:5px 11px" onclick="igUsarMix()">' + osIcon('download', { size: 11 }) + ' Usar mezcla real de Rentas: ' + (r.mixReal.habitacion ? r.mixReal.habitacion + ' hab · ' : '') + (r.mixReal.estudio ? r.mixReal.estudio + ' estudios · ' : '') + (r.mixReal.apartamento ? r.mixReal.apartamento + ' aptos' : '') + '</button>' : '';
  let cfg = '';
  if (modeloSel === 'casa') cfg = '<div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap">' + igIn('Renta manual (pisa la tarifa)', st.casa_manual, "igSet('casa_manual',this.value)", '130px')
    + (r.rcRent ? '<span class="ap-pill" style="align-self:center">RentCast sugiere ' + IG_M(r.rcRent) + '/mes</span>' : '<button class="ap-btn ghost" style="font-size:11px" onclick="ffUwRentcast(\'rent\')">' + osIcon('zap', { size: 11 }) + ' Sugerir renta (RentCast)</button>') + '</div>';
  else if (modeloSel === 'hab') cfg = '<div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap">' + igIn('# Habitaciones', r.habN, "igSet('hab_n',this.value)")
    + '<span class="ap-pill" style="align-self:center">' + (st.hab_n != null && st.hab_n !== '' ? 'manual' : 'de RentCast/Rentas') + ' · ' + IG_M(igRate('hab', 800)) + '/hab (zona)</span>' + mixChip + '</div>';
  else if (modeloSel === 'unidades') cfg = '<div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap">' + igIn('# Estudios', r.estN, "igSet('est_n',this.value)") + igIn('# Apartamentos', r.aptoN, "igSet('apto_n',this.value)") + mixChip + '</div>';
  else cfg = '<div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap">' + igIn('# Habitaciones', st.mx_hab, "igSet('mx_hab',this.value)") + igIn('# Estudios', st.mx_est, "igSet('mx_est',this.value)") + igIn('# Apartamentos', st.mx_apto, "igSet('mx_apto',this.value)") + mixChip + '</div>';
  const config = '<div class="ap-card" style="padding:16px;margin-top:14px"><div class="ap-lab" style="margin-bottom:10px">Configurar · ' + lblM[modeloSel] + '</div>' + cfg + '</div>';

  // FLUJO NETO del modelo seleccionado, línea por línea
  const x = mm[modeloSel];
  const fila = (l, v, cls) => '<div class="ap-mrow"><span>' + l + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
  const flujoCard = '<div class="ap-card" style="padding:16px;margin-top:14px"><div class="ap-lab" style="margin-bottom:6px">Flujo neto mensual · ' + lblM[modeloSel] + '</div>'
    + fila('Renta bruta', IG_M(x.bruta))
    + fila('− Pago DSCR (Calc 4)', '−' + IG_M(ctx.pagoDscr), 'ap-neg')
    + fila('− Impuestos (' + UWc('impuestos_pct_arv', 2.2) + '% ARV/año)', '−' + IG_M(ctx.impuestos), 'ap-neg')
    + fila('− Seguro', '−' + IG_M(ctx.seguro), 'ap-neg')
    + (ctx.hoa > 0 ? fila('− HOA', '−' + IG_M(ctx.hoa), 'ap-neg') : '')
    + fila('− Property mgmt (' + UWc('pm_fee_pct', 8) + '%)', '−' + IG_M(x.pmFee), 'ap-neg')
    + fila('− Vacancy (' + x.vacPct + '% · modelo ' + lblM[modeloSel] + ')', '−' + IG_M(x.vacancy), 'ap-neg')
    + fila('− Mantenimiento (' + UWc('mantenimiento_pct', 5) + '%)', '−' + IG_M(x.mant), 'ap-neg')
    + '<div class="ap-mrow" style="border-top:2px solid var(--glassb,rgba(255,255,255,.15))"><span style="font-weight:800;color:var(--ink,#eaf0ff)">= Flujo neto</span><b class="' + (x.flujo >= 0 ? 'ap-pos' : 'ap-neg') + '" style="font-size:16px">' + IG_M(x.flujo) + '/mes</b></div>'
    + '<div class="ap-mrow" style="border-top:none"><span>Cash-on-cash (flujo anual ÷ ' + IG_M(ctx.cashLeft) + ' invertidos)</span><b>' + (x.coc != null ? x.coc + '%' : '—') + '</b></div>'
    + '</div>'
    // ⛓ pago HML de la Calc 4: el flujo ANTES del refi paga el hard money, no la cuota DSCR
    + (ctx.pagoHml > 0 ? '<div class="ap-card" style="padding:11px 16px;margin-top:10px;font-size:12px;color:var(--mut,#8b93a1)">' + osIcon('hourglass', { size: 12 }) + ' <b style="color:var(--ink,#eaf0ff)">Durante el hold</b> (antes del refi, si ya renta): mismo flujo pero pagando el HML ' + IG_M(Math.round(ctx.pagoHml)) + '/mes (' + osIcon('link', { size: 11 }) + ' Calc 4) en vez de la cuota DSCR → <b class="' + (x.flujo + ctx.pagoDscr - ctx.pagoHml >= 0 ? 'ap-pos' : 'ap-neg') + '">' + IG_M(Math.round(x.flujo + ctx.pagoDscr - ctx.pagoHml)) + '/mes</b></div>' : '');

  // TARIFAS de la zona + vacancy por modelo + gastos — editables de verdad (ff_uw_config)
  const tarifas = '<details class="ap-card" style="padding:14px;margin-top:14px"><summary style="cursor:pointer" class="ap-lab">' + osIcon('settings', { size: 12 }) + ' Tarifas de la zona ' + (IG_ZONAS.find(z => z[0] === zona) || [])[1] + ' + vacancy por modelo + gastos (editables — ff_uw_config)</summary>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px">'
    + igCfgIn('$/Habitación', 'ing_hab', 800) + igCfgIn('$/Estudio', 'ing_estudio', 1100) + igCfgIn('$/Apartamento', 'ing_apto', 2000) + igCfgIn('$ Casa completa', 'ing_casa', 3100)
    + igIn('Vacancy % Casa', igVac('casa'), "apCfgSet('ing_vac_casa',this.value)", '100%') + igIn('Vacancy % Habitaciones', igVac('hab'), "apCfgSet('ing_vac_hab',this.value)", '100%')
    + igIn('Vacancy % Unidades', igVac('unidades'), "apCfgSet('ing_vac_unidades',this.value)", '100%') + igIn('Vacancy % Mixta', igVac('mixta'), "apCfgSet('ing_vac_mixta',this.value)", '100%')
    + igIn('PM fee %', UWc('pm_fee_pct', 8), "apCfgSet('pm_fee_pct',this.value)", '100%') + igIn('Mantenimiento %', UWc('mantenimiento_pct', 5), "apCfgSet('mantenimiento_pct',this.value)", '100%')
    + igIn('Impuestos % ARV/año', UWc('impuestos_pct_arv', 2.2), "apCfgSet('impuestos_pct_arv',this.value)", '100%') + igIn('Seguro $/mes', UWc('seguro_mensual', 120), "apCfgSet('seguro_mensual',this.value)", '100%')
    + igIn('HOA $/mes', inp.hoa_mes || 0, "ffUwSet('hoa_mes',this.value)", '100%')
    + '</div><div style="font-size:10px;color:var(--mut,#8b93a1);margin-top:6px">La tarifa se guarda para la zona elegida (ing_&lt;tipo&gt;_' + zona + '); si no existe, cae a la base Austin. Calibración real: hab $780–880 · estudio $1,000–1,150 · apto $1,600–2,200 · casa $2,600–3,700 (Marlin $1,000–1,400).</div></details>';

  const nota = inp.renta_mensual ? '<div style="font-size:11px;color:var(--mut,#8b93a1);margin-top:10px">Renta del análisis (alimenta la Vista Unificada): <b style="color:var(--ink,#eaf0ff)">' + IG_M(inp.renta_mensual) + '/mes</b>' + (st.modelo ? ' · modelo ' + lblM[st.modelo] : ' · del deal real (Airtable)') + '</div>' : '';

  return head + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;align-items:stretch;margin-top:4px">' + cards + '</div>' + mejorTxt + config + flujoCard + tarifas + nota;
}
window.ffIngresoView = ffIngresoView;
