// ════════════════════════════════════════════════════════════════
// 🎯 CALC 6 · VISTA UNIFICADA PRO — toda la profundidad del deal de un vistazo + one-pager
// para inversionistas. REGLA DE ORO: CERO recálculo — todo sale de ffUwComputeAll(), los
// mismos números de las Calc 1–5 (HUD 1B, ARV profesional, DSCR, modelo de renta, cash-out).
// Faltantes HONESTOS: si un input no está, se marca "falta: cargalo en Calc X" — nunca $0 fingido.
// One-pager imprimible (print CSS) con mini-mapa OSM; foto real: los campos de Airtable son links
// de Drive no embebibles y los attachments expiran — pendiente campo URL pública si se quiere foto.
// UI con tokens del tema FF (--ink/--mut, claro/oscuro). Reusa .ap-* (apCSS de ff-arv-pro).
// ════════════════════════════════════════════════════════════════

const UN_M = n => (n == null || isNaN(n)) ? '—' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const UN_M2 = n => { if (n == null || isNaN(n)) return '—'; const r = Math.round(n * 100) / 100; const c = Math.abs(r - Math.round(r)) >= 0.005; return (r < 0 ? '-$' : '$') + Math.abs(r).toLocaleString('en-US', { minimumFractionDigits: c ? 2 : 0, maximumFractionDigits: c ? 2 : 0 }); };
const UN_E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UN_MODELO_LBL = { casa: '🏠 Casa Completa', hab: '🚪 Por Habitaciones', unidades: '🏢 Por Unidades', mixta: '🧩 Mixta' };

// contexto unificado: computeAll + tiempo hasta rentar + confianza del ARV pro + modelo de renta
function unCtx() {
  const inp = UW.a.inputs;
  const o = ffUwComputeAll();
  // tiempos: obra ≠ renta (obs #11) — la MISMA fuente de Calc 1 (deal real ya seteó obra/renta al cargar)
  let mesesObra = o.negocio.mesesObra || null;
  let mesesRenta = o.negocio.mesesRenta || 0;
  let mesesHastaRenta = o.negocio.mesesHold || null;
  let fuenteTiempo = 'obra + renta (Calc 1)';
  const deal = UW.a.ff_deal_id ? (UW.deals || []).find(d => d.id === UW.a.ff_deal_id) : null;
  const dr = deal ? (UW.draws || {})[deal.address_norm] : null;
  if (dr && +dr.hml_months > 0) fuenteTiempo = 'real: meses cubiertos + hueco (ff_draws)';
  // confianza del ARV: tasador profesional si corrió; si no, la fuente de la Calc 2
  let arvConf = o.arv.confianza, arvProfesional = null;
  try {
    if (window.apComps && UW.a.inputs.arvpro && apComps().length) {
      const rec = apReconciliar(apSubject(), apComps());
      if (rec && rec.arv) { arvProfesional = rec; arvConf = rec.confianza.nivel + ' (tasador, ' + rec.usables.length + ' comps)'; }
    }
  } catch (e) { /* el tasador es opcional acá */ }
  const modeloRenta = (inp.ing && inp.ing.modelo) ? UN_MODELO_LBL[inp.ing.modelo] : null;
  return { inp, o, mesesObra, mesesRenta, mesesHastaRenta, fuenteTiempo, arvConf, arvProfesional, modeloRenta };
}

// tarjeta con manejo de FALTANTES (nunca $0 fingido)
function unKpi(lab, valor, sub, opts) {
  opts = opts || {};
  if (opts.falta) return '<div class="ap-card" style="padding:15px;border-style:dashed"><div class="ap-lab">' + lab + '</div>'
    + '<div style="font-size:20px;font-weight:700;color:var(--mut,#9fb0c9);margin:5px 0 2px">—</div>'
    + '<div style="font-size:11px;color:var(--amber,#e7b65e);cursor:pointer" onclick="ffUwSub(\'' + opts.tab + '\')">🟡 falta: ' + opts.falta + ' →</div></div>';
  return '<div class="ap-card" style="padding:15px;' + (opts.css || '') + '"><div class="ap-lab">' + lab + '</div>'
    + '<div style="font-size:' + (opts.big ? '30px' : '24px') + ';font-weight:800;margin:5px 0 2px;' + (opts.color ? 'color:' + opts.color : '') + '">' + valor + '</div>'
    + (sub ? '<div style="font-size:11px;color:var(--mut,#9fb0c9)">' + sub + '</div>' : '') + '</div>';
}
function unSec(titulo, cards, cols) {
  return '<div style="margin-top:16px"><div class="ap-lab" style="margin-bottom:8px">' + titulo + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(' + (cols || 200) + 'px,1fr));gap:12px">' + cards.join('') + '</div></div>';
}

// línea de tiempo visual: compra → obra → renta → refi → capital recuperado
function unTimeline(c) {
  const u = c.o.unificada;
  const rec = u.recuperaPct;
  const pasos = u.modo === 'venta'
    ? [
      ['🔑', 'Compra', c.inp.purchase > 0 ? UN_M(+c.inp.purchase) : '—'],
      ['🔨', 'Obra', c.mesesObra ? c.mesesObra + ' meses' : '—'],
      ['🏦', 'Venta', c.o.venta.precio > 0 ? UN_M(c.o.venta.precio) : '—'],
      ['💰', 'Utilidad', c.o.venta.utilidad != null ? UN_M(c.o.venta.utilidad) : '—'],
    ]
    : [
      ['🔑', 'Compra', c.inp.purchase > 0 ? UN_M(+c.inp.purchase) : '—'],
      ['🔨', 'Obra', c.mesesObra ? c.mesesObra + ' meses' : '—'],
      ['🏠', 'Renta', c.mesesHastaRenta ? 'mes ' + c.mesesHastaRenta : '—'],
      ['🏦', 'Refi', c.o.cashout.prestamoRefi > 0 ? UN_M(c.o.cashout.prestamoRefi) : '—'],
      ['💰', 'Capital recuperado', rec != null ? (rec >= 100 ? '♾️ ' + rec + '%' : rec + '%') : '—'],
    ];
  return '<div class="ap-card" style="padding:18px 20px;margin-top:16px"><div class="ap-lab" style="margin-bottom:14px">Línea de tiempo del deal</div>'
    + '<div style="display:flex;align-items:flex-start;gap:0;overflow-x:auto">'
    + pasos.map((p, i) => '<div style="flex:1;min-width:105px;text-align:center;position:relative">'
      + (i > 0 ? '<div style="position:absolute;left:-50%;right:50%;top:17px;height:3px;background:linear-gradient(90deg,var(--a1,#12b5a0),var(--a2,#2f6ef0));opacity:.45"></div>' : '')
      + '<div style="width:36px;height:36px;border-radius:50%;background:var(--glass,rgba(255,255,255,.06));border:2px solid var(--a1,#12b5a0);display:grid;place-items:center;margin:0 auto;font-size:15px;position:relative;z-index:1">' + p[0] + '</div>'
      + '<div style="font-size:11px;font-weight:700;margin-top:6px">' + p[1] + '</div>'
      + '<div style="font-size:11.5px;color:var(--mut,#9fb0c9)">' + p[2] + '</div></div>').join('')
    + '</div><div style="font-size:10px;color:var(--mut,#9fb0c9);margin-top:10px">Tiempo: obra ' + (c.mesesObra || '—') + ' m + renta ' + (c.mesesRenta || 0) + ' m = hold ' + (c.mesesHastaRenta || '—') + ' m (' + c.fuenteTiempo + ')</div></div>';
}

function ffUnificadaView() {
  if (window.apCSS) apCSS();
  const c = unCtx();
  const o = c.o, u = o.unificada, inp = c.inp;
  const esVenta = u.modo === 'venta';
  const verColor = u.veredicto === 'GO' ? 'var(--pos,#34d399)' : u.veredicto === 'NO-GO' ? 'var(--neg,#f87171)' : 'var(--amber,#e7b65e)';
  const verIco = u.veredicto === 'GO' ? '🟢' : u.veredicto === 'NO-GO' ? '🔴' : '🟡';
  const chip = (ok, l) => '<span class="ap-pill" style="color:' + (ok ? 'var(--pos,#34d399)' : 'var(--amber,#e7b65e)') + ';border-color:currentColor">' + (ok ? '✓' : '⚠') + ' ' + l + '</span>';

  const tienePurchase = +inp.purchase > 0, tieneRemod = o.negocio.remod > 0, tieneArv = o.arv.probable > 0, tieneRenta = o.ingreso.renta > 0;

  const banda = '<div class="ap-card" style="padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;border-color:' + verColor + ';box-shadow:0 0 0 1px ' + verColor + ',0 6px 22px rgba(23,43,77,.08)">'
    + '<div style="display:flex;align-items:center;gap:14px"><div style="font-size:40px">' + verIco + '</div><div>'
    + '<div style="font-size:30px;font-weight:800;color:' + verColor + ';line-height:1">' + u.veredicto + '</div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + chip(u.gAllIn, 'all-in ≤' + u.allInMax + '% del ARV') + chip(u.gDeficit, 'sin riesgo de déficit') + (esVenta ? chip(u.gUtil, 'utilidad positiva') : chip(u.gFlujo, 'flujo positivo')) + '</div></div></div>'
    + '<button class="ap-btn" onclick="ffUwPresentacion()">📄 Generar presentación / Imprimir PDF</button></div>';

  const proyecto = unSec('El proyecto', [
    tienePurchase ? unKpi('Compra', UN_M(+inp.purchase), 'precio de compra') : unKpi('Compra', '', '', { falta: 'cargá la compra en Del Negocio', tab: 'negocio' }),
    tieneRemod ? unKpi('Remodelación', UN_M(o.negocio.remod), inp.usar_estimador ? 'estimador $/sqft' : 'costo real Remodelación') : unKpi('Remodelación', '', '', { falta: 'cargá la remo en Del Negocio', tab: 'negocio' }),
    unKpi('Draw al Harmony', UN_M(o.negocio.draw), 'obra + intereses + utilities'),
    c.mesesObra ? unKpi('Meses de obra', c.mesesObra + ' m', c.fuenteTiempo.startsWith('real') ? 'real (ff_draws)' : 'estimado') : unKpi('Meses de obra', '', '', { falta: 'meses de hold en Del Negocio', tab: 'negocio' }),
    c.mesesHastaRenta ? unKpi('Hasta rentar', c.mesesHastaRenta + ' m', 'obra ' + (c.mesesObra || 0) + ' m + renta ' + (c.mesesRenta || 0) + ' m') : unKpi('Hasta rentar', '', '', { falta: 'meses de hold en Del Negocio', tab: 'negocio' }),
  ]);

  const inversion = unSec('La inversión', [
    unKpi('El inversionista pone', UN_M2(o.negocio.cashToClose), 'HUD: down + cierre − créditos · ya pagado ' + UN_M(o.negocio.yaPagado), { big: true, color: 'var(--a2,#2f6ef0)' }),
    unKpi('Presta el Harmony', UN_M(o.negocio.prestamo), o.negocio.pctCompra + '% compra + ' + o.negocio.pctRemo + '% remo'),
    tieneArv ? unKpi('ARV (valor de reventa)', UN_M(o.arv.probable), 'confianza ' + UN_E(c.arvConf)) : unKpi('ARV', '', '', { falta: 'buscá comps en ARV', tab: 'arv' }),
    tieneArv ? unKpi('Oferta máxima (MAO)', UN_M(u.mao), 'para cumplir all-in ≤' + u.allInMax + '%' + (tienePurchase ? (u.mao >= +inp.purchase ? ' · ✓ compra por debajo' : ' · ⚠ compra arriba') : '')) : unKpi('MAO', '', '', { falta: 'necesita ARV', tab: 'arv' }),
  ]);

  const renta = unSec('Renta y flujo', [
    tieneRenta ? unKpi('Renta mensual', UN_M(o.ingreso.renta), c.modeloRenta ? 'modelo ' + c.modeloRenta : 'del deal real (Airtable)') : unKpi('Renta mensual', '', '', { falta: 'elegí el modelo en Ingreso', tab: 'ingreso' }),
    unKpi('Pago DSCR (post-refi)', UN_M(o.intereses.pagoDscr) + '/mes', 'sobre ' + UN_M(o.intereses.dscrPrincipal) + ' a 30 años'),
    tieneRenta ? unKpi('Flujo mensual', UN_M(o.ingreso.flujo) + '/mes', 'después de TODOS los gastos', { color: o.ingreso.flujo >= 0 ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)' }) : unKpi('Flujo mensual', '', '', { falta: 'necesita la renta', tab: 'ingreso' }),
  ]);

  const allInBar = u.allInPct != null
    ? '<div style="height:7px;border-radius:6px;background:var(--glassb,rgba(255,255,255,.1));margin-top:7px;position:relative;overflow:hidden"><div style="position:absolute;left:0;top:0;bottom:0;width:' + Math.min(100, u.allInPct / u.allInMax * 100) + '%;border-radius:6px;background:' + (u.gAllIn ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)') + '"></div></div>'
    : '';
  const retorno = unSec('El retorno', [
    unKpi('Cash-out del refi', UN_M(u.cashOut), 'refi ' + UN_M(o.cashout.prestamoRefi) + ' − payoff ' + UN_M(o.cashout.payoff), { color: u.cashOut >= 0 ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)' }),
    u.recuperaPct != null ? unKpi('Capital recuperado', (u.recuperaPct >= 100 ? '♾️ ' : '') + u.recuperaPct + '%', u.recuperaPct >= 100 ? 'retorno infinito — recuperás todo y te queda la casa' : 'queda invertido ' + UN_M(u.cashLeftIn), { big: true, color: u.recuperaPct >= 100 ? 'var(--pos,#34d399)' : undefined }) : unKpi('Capital recuperado', '', '', { falta: 'necesita ARV y compra', tab: 'cashout' }),
    unKpi('ROI (cash-on-cash)', u.roi != null ? u.roi + '%' : '—', 'flujo anual ÷ ' + UN_M(u.cashLeftIn) + ' que quedan adentro'),
    unKpi('All-in', u.allInPct != null ? u.allInPct + '%' : '—', 'del ARV (máx ' + u.allInMax + '%)' + allInBar),
  ]);

  // ── MODO VENTA (fix & flip): salida = vender · la ganancia es UNA vez (no hay renta/refi) ──
  const vo = o.venta;
  const ventaSec = unSec('La venta', [
    unKpi('Precio de venta', UN_M(vo.precio), vo.esArv ? '= ARV (Calc 2)' : 'precio fijado'),
    unKpi('Net Wire', UN_M(vo.netWire), 'venta − costos de venta − payoff HML', { color: vo.netWire >= 0 ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)' }),
    unKpi('Utilidad neta', UN_M(vo.utilidad), 'net wire − staging − capital', { big: true, color: vo.utilidad >= 0 ? 'var(--pos,#34d399)' : 'var(--neg,#f87171)' }),
  ]);
  const ventaRet = unSec('El retorno (venta)', [
    unKpi('ROI del período', vo.roiPeriodo != null ? vo.roiPeriodo + '%' : '—', 'utilidad del inversionista ÷ su capital'),
    unKpi('ROI anualizado', vo.roiAnual != null ? vo.roiAnual + '%' : '—', vo.dias ? '× 365 ÷ ' + vo.dias + ' días' : 'cargá los días del proyecto', { big: true, color: 'var(--pos,#34d399)' }),
    unKpi('Inversionista (' + vo.splitInvPct + '%)', UN_M(vo.parteInv), 'su parte de la utilidad', { color: 'var(--a2,#2f6ef0)' }),
    unKpi('Operador (' + (100 - vo.splitInvPct) + '%)', UN_M(vo.parteOp), 'nuestra parte'),
  ]);

  return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><b style="font-size:18px">🎯 El deal completo de un vistazo</b><span class="ap-pill">' + (esVenta ? 'estrategia: vender (flip)' : 'estrategia: rentar (hold)') + ' — mismos números de las calculadoras</span></div>'
    + banda + proyecto + inversion + (esVenta ? ventaSec + ventaRet : renta + retorno) + unTimeline(c);
}
window.ffUnificadaView = ffUnificadaView;

// ─── ONE-PAGER para inversionista (imprimible / PDF) ───
function ffUnificadaOnePager() {
  const c = unCtx();
  const o = c.o, u = o.unificada, inp = c.inp, a = UW.a;
  const esVenta = u.modo === 'venta';
  const verColor = u.veredicto === 'GO' ? '#0ea371' : u.veredicto === 'NO-GO' ? '#dc2626' : '#d97706';
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const M = UN_M, M2 = UN_M2, E = UN_E;
  // mini-mapa estático OSM con el lat/lng de RentCast (si falla, se oculta solo)
  let mapa = '';
  try {
    const p = window.ffUwRcSlot && ffUwRcSlot('property');
    const lat = p && p.payload && p.payload.latitude, lng = p && p.payload && p.payload.longitude;
    if (lat && lng) mapa = '<img src="https://staticmap.openstreetmap.de/staticmap.php?center=' + lat + ',' + lng + '&zoom=15&size=680x180&markers=' + lat + ',' + lng + ',red-pushpin" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin:10px 0 0" onerror="this.style.display=\'none\'">';
  } catch (e) {}
  const kpi = (l, v, sub) => '<div class="k"><div class="l">' + l + '</div><div class="v">' + v + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</div>';
  const fila = (l, v) => '<div class="row"><span>' + l + '</span><b>' + v + '</b></div>';
  const sec = (t, inner) => '<div class="sec"><div class="st">' + t + '</div>' + inner + '</div>';
  const pasos = esVenta
    ? [['🔑', 'Compra'], ['🔨', 'Obra ' + (c.mesesObra ? c.mesesObra + 'm' : '')], ['🏦', 'Venta ' + M(o.venta.precio)], ['💰', o.venta.utilidad != null ? 'Utilidad ' + M(o.venta.utilidad) : 'Utilidad']]
    : [['🔑', 'Compra'], ['🔨', 'Obra ' + (c.mesesObra ? c.mesesObra + 'm' : '')], ['🏠', 'Renta' + (c.mesesHastaRenta ? ' mes ' + c.mesesHastaRenta : '')], ['🏦', 'Refi'], ['💰', u.recuperaPct != null ? (u.recuperaPct >= 100 ? '♾️ ' : '') + u.recuperaPct + '% recuperado' : 'Recuperación']];

  const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + E(a.direccion || a.nombre) + ' · Rental Profits</title><style>'
    + 'body{font-family:-apple-system,"Segoe UI",Inter,sans-serif;color:#12203a;margin:0;padding:34px;max-width:760px;margin:0 auto;line-height:1.4;background:#fff}'
    + '.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #12b5a0;padding-bottom:14px}'
    + '.logo{font-size:21px;font-weight:800;letter-spacing:.5px;color:#0f766e}.logo em{font-style:normal;color:#2563eb}.logo span{display:block;font-size:9.5px;letter-spacing:2.4px;color:#64748b;font-weight:700;margin-top:2px}'
    + '.addr{font-size:22px;font-weight:800;margin:16px 0 2px}.meta{font-size:11.5px;color:#64748b}'
    + '.ver{display:inline-block;font-size:15px;font-weight:800;color:#fff;background:' + verColor + ';padding:5px 16px;border-radius:22px;margin-top:8px}'
    + '.hero{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0 4px}'
    + '.k{border:1px solid #e2e8f0;border-radius:11px;padding:11px 13px;background:#f8fafc}'
    + '.k .l{font-size:9px;text-transform:uppercase;letter-spacing:.7px;color:#64748b;font-weight:800}'
    + '.k .v{font-size:19px;font-weight:800;margin-top:3px}.k .s{font-size:10px;color:#64748b;margin-top:1px}'
    + '.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}'
    + '.sec{margin-top:16px;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;page-break-inside:avoid}'
    + '.st{font-size:10.5px;text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#0f766e;margin-bottom:8px}'
    + '.row{display:flex;justify-content:space-between;font-size:12.5px;padding:4.5px 0;border-bottom:1px dashed #eef2f7}.row b{font-variant-numeric:tabular-nums}'
    + '.tl{display:flex;gap:0;margin-top:6px}.tl div{flex:1;text-align:center;font-size:10.5px;font-weight:700;position:relative;padding-top:4px}'
    + '.tl div:not(:first-child):before{content:"";position:absolute;left:-50%;right:50%;top:16px;height:2px;background:#12b5a0;opacity:.4}'
    + '.tl .ic{width:30px;height:30px;border-radius:50%;background:#e6f7f4;border:2px solid #12b5a0;display:grid;place-items:center;margin:0 auto 4px;font-size:13px;position:relative;z-index:1}'
    + '.foot{margin-top:22px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;gap:10px}'
    + '.btn{position:fixed;top:12px;right:12px;padding:9px 18px;background:linear-gradient(135deg,#12b5a0,#2563eb);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:800;font-size:13px}'
    + '@media print{.btn{display:none}body{padding:18px}}'
    + '</style></head><body>'
    + '<button class="btn" onclick="window.print()">🖨 Imprimir / PDF</button>'
    + '<div class="top"><div class="logo">RENTAL <em>PROFITS</em><span>ANÁLISIS DE INVERSIÓN INMOBILIARIA</span></div>'
    + '<div style="text-align:right;font-size:11px;color:#64748b">' + fecha + '<br>Austin, TX</div></div>'
    + '<div class="addr">' + E((a.direccion || a.nombre || '').split(',')[0]) + '</div>'
    + '<div class="meta">' + E(a.direccion || '') + (inp.est_sqft ? ' · ' + (+inp.est_sqft).toLocaleString() + ' sqft' : '') + '</div>'
    + '<span class="ver">' + (u.veredicto === 'GO' ? '✓ RECOMENDADO — GO' : u.veredicto === 'NO-GO' ? '✗ NO-GO' : '⚠ REVISAR') + '</span>'
    + mapa
    + '<div class="hero">'
    + kpi('El inversionista pone', M2(o.negocio.cashToClose), esVenta ? 'capital invertido' : 'cash total al cierre')
    + kpi(esVenta ? 'Precio de venta (ARV)' : 'Valor de reventa (ARV)', M(o.arv.probable), esVenta ? 'precio de salida' : 'confianza ' + E(c.arvConf))
    + (esVenta
      ? kpi('Utilidad neta', M(o.venta.utilidad), 'del proyecto') + kpi('ROI anualizado', o.venta.roiAnual != null ? o.venta.roiAnual + '%' : '—', 'del inversionista')
      : kpi('Capital recuperado', u.recuperaPct != null ? (u.recuperaPct >= 100 ? '♾️ ' : '') + u.recuperaPct + '%' : '—', u.recuperaPct >= 100 ? 'retorno infinito' : 'al refinanciar') + kpi('Flujo mensual', o.ingreso.renta > 0 ? M(o.ingreso.flujo) : '—', 'después de todos los gastos'))
    + '</div>'
    + '<div class="cols">'
    + sec('💵 Inversión requerida',
      fila('Down payment', M2(o.negocio.downPayment)) + fila('+ Gastos de cierre', M2(o.negocio.closing)) + fila('− Créditos (earnest/option/proración)', '−' + M2(o.negocio.creditos))
      + fila('= El inversionista pone', '<b style="color:#2563eb">' + M2(o.negocio.cashToClose) + '</b>') + fila('Ya pagado como earnest/option', M(o.negocio.yaPagado))
      + fila('Presta el Harmony (' + o.negocio.pctCompra + '% compra + ' + o.negocio.pctRemo + '% remo)', M(o.negocio.prestamo)))
    + sec('🔨 El proyecto',
      fila('Precio de compra', +inp.purchase > 0 ? M(+inp.purchase) : 'por definir') + fila('Remodelación', o.negocio.remod > 0 ? M(o.negocio.remod) : 'por definir')
      + fila('Draw total (obra + intereses)', M(o.negocio.draw)) + fila('Meses de obra', c.mesesObra ? c.mesesObra + ' meses' : 'por definir')
      + (esVenta ? fila('Días del proyecto', o.venta.dias ? o.venta.dias + ' días' : 'por definir') : fila('Tiempo hasta rentar', c.mesesHastaRenta ? c.mesesHastaRenta + ' meses' : 'por definir'))
      + fila('All-in vs ARV', u.allInPct != null ? u.allInPct + '% (máx ' + u.allInMax + '%)' : '—'))
    + (esVenta
      ? sec('🏦 La venta (Net Wire)',
        fila('Precio de venta', M(o.venta.precio)) + fila('− Comisión (' + inp.venta_comision_pct + '%)', '−' + M(o.venta.comision))
        + (o.venta.titulo > 0 ? fila('− Título / escrow', '−' + M(o.venta.titulo)) : '') + fila('− Closing de venta', '−' + M(o.venta.closing))
        + fila('− Payoff del HML', '−' + M(o.venta.payoff))
        + fila('= Net Wire', '<b style="color:' + (o.venta.netWire >= 0 ? '#0ea371' : '#dc2626') + '">' + M(o.venta.netWire) + '</b>'))
        + sec('📈 Utilidad y retorno',
          fila('Net Wire', M(o.venta.netWire)) + fila('− Staging', '−' + M(o.venta.staging)) + fila('− Capital invertido', '−' + M(o.venta.capital))
          + fila('= Utilidad neta', '<b style="color:' + (o.venta.utilidad >= 0 ? '#0ea371' : '#dc2626') + '">' + M(o.venta.utilidad) + '</b>')
          + fila('Inversionista (' + o.venta.splitInvPct + '%)', M(o.venta.parteInv)) + fila('Operador (' + (100 - o.venta.splitInvPct) + '%)', M(o.venta.parteOp))
          + fila('ROI del período', o.venta.roiPeriodo != null ? o.venta.roiPeriodo + '%' : '—') + fila('ROI anualizado', o.venta.roiAnual != null ? o.venta.roiAnual + '%' : '—'))
      : sec('📈 Retorno proyectado',
        fila('ARV probable', M(o.arv.probable)) + (c.arvProfesional ? fila('Rango del tasador', M(c.arvProfesional.conservador) + ' – ' + M(c.arvProfesional.optimista)) : '')
        + fila('Oferta máxima (MAO)', M(u.mao)) + fila('Cash-out del refi', M(u.cashOut))
        + fila('Capital que queda invertido', M(u.cashLeftIn)) + fila('ROI (cash-on-cash)', u.roi != null ? u.roi + '%' : '—'))
        + sec('🏠 Renta y flujo mensual',
          fila('Renta' + (c.modeloRenta ? ' · ' + c.modeloRenta.replace(/^\S+ /, '') : ''), o.ingreso.renta > 0 ? M(o.ingreso.renta) : 'por definir')
          + fila('− Pago DSCR (refi 30 años)', '−' + M(o.intereses.pagoDscr)) + fila('− Impuestos + seguro', '−' + M(o.ingreso.impuestos + o.ingreso.seguro))
          + fila('− PM + vacancy + mantenimiento', '−' + M(o.ingreso.pmFee + o.ingreso.vacancy + o.ingreso.mantenimiento))
          + fila('= Flujo neto', '<b style="color:' + (o.ingreso.flujo >= 0 ? '#0ea371' : '#dc2626') + '">' + M(o.ingreso.flujo) + '/mes</b>')))
    + '</div>'
    + sec(esVenta ? '💰 De compra a utilidad' : '💰 Recuperación del capital', '<div class="tl">' + pasos.map(p => '<div><div class="ic">' + p[0] + '</div>' + p[1] + '</div>').join('') + '</div>'
      + '<div style="font-size:11px;color:#64748b;margin-top:8px">' + (esVenta
        ? (o.venta.utilidad != null ? 'Al vender, el proyecto deja ' + M(o.venta.utilidad) + ' de utilidad neta (una sola vez), repartida ' + o.venta.splitInvPct + '/' + (100 - o.venta.splitInvPct) + ' entre inversionista y operador — ROI ' + (o.venta.roiPeriodo != null ? o.venta.roiPeriodo + '%' : '—') + ' del período' + (o.venta.roiAnual != null ? ' (' + o.venta.roiAnual + '% anualizado)' : '') + '.' : 'Cargá precio de venta y capital para ver la utilidad.')
        : (u.recuperaPct != null && u.recuperaPct >= 100
          ? 'Al refinanciar, el inversionista recupera el 100% de su capital y conserva la propiedad rentando — el retorno se vuelve infinito.'
          : u.recuperaPct != null ? 'Al refinanciar se recupera el ' + u.recuperaPct + '% del capital; el resto (' + M(u.cashLeftIn) + ') queda invertido generando ' + (u.roi != null ? u.roi + '% anual' : 'flujo mensual') + '.' : 'Proyección de refinanciación pendiente de ARV/appraisal.')) + '</div>')
    + '<div class="foot"><span>Preparado por <b>Rental Profits</b> · ' + fecha + '</span><span>Proyección basada en datos reales y supuestos calibrados — no constituye garantía de retorno.</span></div>'
    + '</body></html>';
  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) { alert('El navegador bloqueó la ventana — permití popups.'); return; }
  w.document.write(html); w.document.close();
}
window.ffUnificadaOnePager = ffUnificadaOnePager;
