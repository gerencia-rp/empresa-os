// os/inv-rendimiento.js — Panel de Rendimiento del inversionista (estilo Robinhood).
// PURO (browser + node). Regla de credibilidad del CEO:
//   • REALIZADO (distribuciones pagadas + avalúo real) SEPARADO de PROYECTADO (apreciación/venta, "supuesto").
//   • La TIR usa flujos REALES fechados + el terminal del escenario elegido; se expone la línea de flujos.
//   • Cero apreciación inventada: valor actual = avalúo real (paper_value) o proyección declarada/editable.
// Reusa invEsc (desdeDatos + saldoTras) para NO redefinir la normalización de casa ni la amortización.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.invRend = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  let ESC = null;
  function setEsc(e) { ESC = e; }

  // ── XIRR: bisección robusta sobre XNPV base 365 (misma metodología que invInd) ──
  function xnpv(rate, flows) {
    const t0 = new Date(flows[0].fecha).getTime();
    return flows.reduce((s, f) => s + (+f.monto) / Math.pow(1 + rate, (new Date(f.fecha).getTime() - t0) / (365 * 86400000)), 0);
  }
  function xirr(flows) {
    flows = (flows || []).filter(f => f && f.fecha && isFinite(+f.monto));
    if (flows.length < 2) return null;
    if (!flows.some(f => +f.monto > 0) || !flows.some(f => +f.monto < 0)) return null;
    let lo = -0.9999, hi = 100, flo = xnpv(lo, flows), fhi = xnpv(hi, flows);
    if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2, fm = xnpv(mid, flows);
      if (Math.abs(fm) < 1e-7) return mid;
      if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }
  function addYears(iso, n) {
    const x = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''));
    const whole = Math.floor(n); x.setFullYear(x.getFullYear() + whole);
    x.setMonth(x.getMonth() + Math.round((n - whole) * 12));
    return x.toISOString().slice(0, 10);
  }
  const num = v => (v == null || v === '' || !isFinite(+v)) ? null : +v;

  // panel({ ind, Pv, holding, distribuciones, hoy }, cfg, horizonAnios)
  //   ind = fila inv_indicadores_data · Pv = params EFECTIVOS planos {key:value}
  //   holding = inv_holdings · distribuciones = [{fecha, monto}] pagadas del inversionista
  function panel(datos, cfg, horizonAnios) {
    cfg = cfg || {};
    const ind = datos.ind || {}, Pv = datos.Pv || {}, holding = datos.holding || {};
    const hoy = datos.hoy || new Date().toISOString().slice(0, 10);
    const N = horizonAnios || 6;
    const c = ESC.desdeDatos(ind, Pv, holding); // aporte,pct,arv(=valorActual),deuda_saldo,deuda_tasa,deuda_tipo,deuda_plazo,apreciacion_anual,costo_venta
    const capital = num(c.aporte), pct = +c.pct || 0;
    const apre = c.apreciacion_anual != null ? +c.apreciacion_anual : (cfg.apreciacion_anual != null ? +cfg.apreciacion_anual : 0.04);
    const costoVenta = c.costo_venta != null ? +c.costo_venta : (cfg.costo_venta != null ? +cfg.costo_venta : 0.07);
    const sp500 = cfg.sp500_anual != null ? +cfg.sp500_anual : 0.10;
    const compra = num(ind.compra);
    const closeDate = ind.close_date || null;
    const dists = (datos.distribuciones || []).filter(d => d && d.fecha && isFinite(+d.monto))
      .map(d => ({ fecha: String(d.fecha).slice(0, 10), monto: +d.monto })).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const distAcum = dists.reduce((s, d) => s + d.monto, 0);
    const yrsHeld = closeDate ? Math.max(0.01, (new Date(hoy) - new Date(closeDate + 'T00:00:00')) / (365.25 * 86400000)) : null;

    // valor actual: avalúo REAL (paper_value) o proyección declarada
    let valorActual = num(c.arv), valorFuente = ind.paper_fuente || null, esProyeccion = false;
    if (valorActual == null && compra != null && yrsHeld != null) {
      valorActual = compra * Math.pow(1 + apre, yrsHeld);
      valorFuente = 'proyección ' + (apre * 100).toFixed(1) + '%/año (supuesto)'; esProyeccion = true;
    }

    // deuda: amortización desde el refi (usa la tabla real: monto/tasa/plazo de la casa)
    const refin = !!ind.refinanciada;
    const principal = num(c.deuda_saldo) || 0;
    const deudaTasa = +c.deuda_tasa || 0, deudaPlazo = +c.deuda_plazo || 30, deudaTipo = c.deuda_tipo;
    const refiMesOffset = num(Pv.refi_mes) || 0;               // meses de compra→refi
    const yrsSinceRefi = refin ? Math.max(0, (yrsHeld || 0) - refiMesOffset / 12) : 0;
    const currentBalance = refin ? ESC.saldoTras(principal, deudaTasa, deudaPlazo, yrsSinceRefi, deudaTipo) : principal;
    const amortToDate = refin ? Math.max(0, principal - currentBalance) : 0;

    // ── 4 fuentes de ganancia (nivel inversionista) ──
    const flujoInv = distAcum;                                                    // REALIZADO
    const aprecInv = (valorActual != null && compra != null) ? (valorActual - compra) * pct : null; // real o proyectado
    const aprecCAGR = (valorActual != null && compra > 0 && yrsHeld > 0) ? Math.pow(valorActual / compra, 1 / yrsHeld) - 1 : null;
    const amortInv = amortToDate * pct;                                           // "se paga sola"
    const cashoutTot = num(Pv.cashout_real);
    const cashoutInv = cashoutTot != null ? cashoutTot * pct : null;             // capital devuelto en el refi

    const equityActual = valorActual != null ? (valorActual - currentBalance) * pct : null;
    const retornoTotal = (flujoInv || 0) + (aprecInv || 0) + (amortInv || 0);     // spec item 7
    const retornoTotalPct = (capital > 0) ? retornoTotal / capital : null;
    const cocAnual = (capital > 0 && yrsHeld > 0) ? (distAcum / yrsHeld) / capital : null;
    const cocMensual = cocAnual != null ? cocAnual / 12 : null;

    // ── TIR REALIZADA (a hoy): −capital@compra + distribuciones fechadas + equity hoy (terminal) ──
    // A1: NO anualizar en holds < 1 año (da TIR extrema no representativa) → se muestra el múltiplo.
    const holdCorto = yrsHeld != null && yrsHeld < 1;
    const flowsReal = (closeDate && capital) ? [{ fecha: closeDate, monto: -capital }].concat(dists)
      .concat(equityActual != null ? [{ fecha: hoy, monto: equityActual }] : []) : [];
    const tirReal = holdCorto ? null : xirr(flowsReal);
    const multReal = (capital > 0 && equityActual != null) ? (distAcum + equityActual) / capital : null;

    // ── ESCENARIO DE VENTA a N años (supuesto editable) ──
    const precioVenta = valorActual != null ? valorActual * Math.pow(1 + apre, N) : null;
    const payoff = refin ? ESC.saldoTras(principal, deudaTasa, deudaPlazo, yrsSinceRefi + N, deudaTipo) : principal;
    const costoVentaMonto = precioVenta != null ? precioVenta * costoVenta : null;
    const netoInv = precioVenta != null ? (precioVenta - costoVentaMonto - payoff) * pct : null;
    const ventaFecha = addYears(hoy, N);
    const flowsHor = (closeDate && capital && netoInv != null) ? [{ fecha: closeDate, monto: -capital }].concat(dists)
      .concat([{ fecha: ventaFecha, monto: netoInv }]) : [];
    const tirHor = xirr(flowsHor);
    const multHor = (capital > 0 && netoInv != null) ? (distAcum + netoInv) / capital : null;

    // ── vs S&P 500 (ILUSTRACIÓN, tasa supuesta editable — no es promesa) ──
    const spValorFinal = capital != null ? capital * Math.pow(1 + sp500, N) : null;
    const spMult = Math.pow(1 + sp500, N);

    const porCompletar = [];
    if (!capital) porCompletar.push('capital del inversionista (inv_holdings)');
    if (!closeDate) porCompletar.push('fecha de compra (close_date)');
    if (valorActual == null) porCompletar.push('valor actual (avalúo/ARV)');
    if (!dists.length) porCompletar.push('distribuciones pagadas (aún no hay flujo real)');

    return {
      property_id: ind.property_id, casa: ind.casa, capital, pct, closeDate, yrsHeld,
      valorActual, valorFuente, esProyeccion, refinanciada: refin,
      currentBalance, deudaOriginal: principal,
      fuentes: { flujo: flujoInv, apreciacion: aprecInv, apreciacionCAGR: aprecCAGR, amortizacion: amortInv, cashout: cashoutInv, cashoutTot },
      equityActual, retornoTotal, retornoTotalPct, cocAnual, cocMensual,
      realizado: { tir: tirReal, tirCorto: holdCorto, multiplo: multReal, distAcum, flows: flowsReal, equityActual },
      // DPI/RVPI/TVPI del fondo (realizado) — para liderar el titular (A3)
      dpi: (capital > 0) ? distAcum / capital : null,
      rvpi: (capital > 0 && equityActual != null) ? Math.max(0, equityActual) / capital : null,
      tvpi: (capital > 0 && equityActual != null) ? (distAcum + Math.max(0, equityActual)) / capital : null,
      horizonte: { anios: N, precioVenta, costoVenta: costoVentaMonto, payoff, netoInv, tir: tirHor, multiplo: multHor, flows: flowsHor, ventaFecha },
      sp500: { tasa: sp500, valorFinal: spValorFinal, multiplo: spMult },
      supuestos: { apreciacion: apre, costoVenta: costoVenta, sp500: sp500, apreOrigen: c.apreciacion_anual != null ? 'manual' : 'config' },
      porCompletar
    };
  }

  // agregado del portafolio del inversionista (suma de paneles) + XIRR de TODOS los flujos reales
  function portafolio(paneles, hoy) {
    hoy = hoy || new Date().toISOString().slice(0, 10);
    const ok = paneles.filter(p => p && p.capital);
    const capitalT = ok.reduce((s, p) => s + p.capital, 0);
    const equityT = ok.reduce((s, p) => s + (p.equityActual || 0), 0);
    const distT = ok.reduce((s, p) => s + (p.realizado.distAcum || 0), 0);
    const retornoT = ok.reduce((s, p) => s + (p.retornoTotal || 0), 0);
    // XIRR de la cartera: todos los −capital fechados + todas las distribuciones + equity total hoy
    let flows = [];
    ok.forEach(p => { if (p.closeDate) flows.push({ fecha: p.closeDate, monto: -p.capital }); flows = flows.concat(p.realizado.flows.filter(f => f.monto > 0 && f.fecha !== hoy)); });
    if (equityT) flows.push({ fecha: hoy, monto: equityT });
    // A1: si el hold ponderado por capital es < 1 año, la TIR anualizada no es representativa
    const capYrs = ok.reduce((s, p) => s + (p.capital * (p.yrsHeld || 0)), 0);
    const holdPond = capitalT > 0 ? capYrs / capitalT : 0;
    const cortoPond = holdPond < 1;
    const tir = cortoPond ? null : xirr(flows);
    return {
      capitalT, equityT, distT, retornoT,
      retornoPct: capitalT > 0 ? retornoT / capitalT : null,
      tir, tirCorto: cortoPond, holdPond,
      dpi: capitalT > 0 ? distT / capitalT : null,
      rvpi: capitalT > 0 ? Math.max(0, equityT) / capitalT : null,
      tvpi: capitalT > 0 ? (distT + Math.max(0, equityT)) / capitalT : null,
      multiplo: capitalT > 0 ? (distT + equityT) / capitalT : null, n: ok.length
    };
  }

  return { setEsc, xirr, xnpv, panel, portafolio };
});
