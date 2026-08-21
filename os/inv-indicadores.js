// ════════════════════════════════════════════════════════════════
// 📈 INDICADORES DE RETORNO (E4 mega-build) — módulo PURO (browser + node).
// UNA definición para admin (dashboard global) y portal del inversionista.
// Metodología del Excel "IRR Portafolio - Fix and Flip": flujos simples sobre
// VALOR EN PAPEL (appraisal/ARV; vendidas = precio real en su fecha).
// HONESTIDAD: no incluye rentas/intereses/gastos — no son ganancias realizadas
// hasta la venta o el refi (el banner en la UI es obligatorio).
// Inputs por casa = RPC inv_indicadores_data() (RLS del portal).
// ════════════════════════════════════════════════════════════════
/* eslint-disable */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.invInd = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DAY = 86400000;
  const dt = v => v instanceof Date ? v : new Date(String(v).slice(0, 10) + 'T00:00:00');

  // ─── XIRR (bisección robusta sobre XNPV, base 365) ───
  function xnpv(rate, flows) {
    const t0 = dt(flows[0].fecha);
    return flows.reduce((s, f) => s + f.monto / Math.pow(1 + rate, (dt(f.fecha) - t0) / DAY / 365), 0);
  }
  function xirr(flows) {
    const fl = (flows || []).filter(f => f && f.fecha && f.monto).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    if (fl.length < 2 || !fl.some(f => f.monto > 0) || !fl.some(f => f.monto < 0)) return null;
    let lo = -0.9999, hi = 100, flo = xnpv(lo, fl), fhi = xnpv(hi, fl);
    if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2, fm = xnpv(mid, fl);
      if (Math.abs(fm) < 1e-7) return mid;
      if (flo * fm < 0) { hi = mid; } else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }

  // ─── POR CASA (paper): (V/C)^(365/días)−1 · días<30 → TIR n/a (solo múltiplo) ───
  function casa(c, hoy) {
    const fin = (c.vendida && c.fecha_venta) ? dt(c.fecha_venta) : dt(hoy);
    const dias = c.close_date ? Math.max(1, Math.round((fin - dt(c.close_date)) / DAY)) : null;
    const C = +c.all_in || 0;
    const V = c.paper_value != null ? +c.paper_value : null;
    const o = Object.assign({}, c, { dias });
    o.multAllIn = (C > 0 && V != null) ? V / C : null;                       // múltiplo all-in
    // A1 (credibilidad): NO anualizar TIR en holds < 1 año (la plusvalía del rehab anualizada
    // sobre pocos meses da TIR extrema, no representativa). < 365 días → solo múltiplo.
    o.tirNA = dias != null && dias < 365;
    o.tirActivo = (o.multAllIn != null && dias != null && dias >= 365) ? Math.pow(V / C, 365 / dias) - 1 : null;
    const deuda = c.deuda_vigente != null ? +c.deuda_vigente : null;
    const hml = c.hml_original != null ? +c.hml_original : null;
    o.porCompletar = (deuda == null || hml == null) && !c.vendida;           // sin HML registrado → checklist
    o.equityInv = (hml != null && C > 0) ? C - hml : (c.vendida && hml == null ? null : null);
    o.equityHoy = (deuda != null && V != null) ? V - deuda : null;
    o.equityLeq0 = o.equityInv != null && o.equityInv <= 0;                  // la deuda financió todo
    o.multEquity = (o.equityInv != null && o.equityInv > 0 && o.equityHoy != null) ? o.equityHoy / o.equityInv : null;
    o.ltv = (deuda != null && V > 0) ? deuda / V : null;
    o.ltvSem = o.ltv == null ? null : (o.ltv < 0.70 ? 'verde' : (o.ltv <= 0.85 ? 'ambar' : 'rojo'));
    // yield on cost = renta REAL (rent-roll actual) ÷ inversión; cae a la modelada si no hay real (CEO #4)
    o.rentaSalud = (c.renta_actual_anual != null && +c.renta_actual_anual > 0) ? +c.renta_actual_anual : (c.renta_anual != null ? +c.renta_anual : null);
    o.rentaSaludFuente = (c.renta_actual_anual != null && +c.renta_actual_anual > 0) ? (c.renta_actual_fuente || 'rent-roll Rentas') : (c.renta_anual != null && +c.renta_anual > 0 ? 'renta del modelo' : null);
    o.yieldOnCost = (C > 0 && o.rentaSalud != null && o.rentaSalud > 0) ? o.rentaSalud / C : null;
    o.aprecAnual = (dias != null && dias >= 365 && +c.compra > 0 && V != null) ? Math.pow(V / +c.compra, 365 / dias) - 1 : null;
    return o;
  }

  // ─── POR INVERSIONISTA (estándar de fondos) ───
  // DPI = distribuciones/capital (YA realizado) · RVPI = equity residual hoy/capital
  // (en papel) · TVPI = DPI + RVPI · TIR combinada = XIRR(−aporte, +dists, +residual hoy)
  function inversionista(aportes, dists, equityResidualHoy, hoy) {
    // aportes = [{fecha, monto}] (uno por casa/entrada); dists = [{fecha, monto}] pagadas
    const list = (aportes || []).filter(a => a && +a.monto > 0);
    const cap = list.reduce((s, a) => s + +a.monto, 0);
    if (!cap) return { dpi: null, rvpi: null, tvpi: null, tir: null, distTotal: 0, capital: 0 };
    const distTotal = (dists || []).reduce((s, d) => s + (+d.monto || 0), 0);
    const dpi = distTotal / cap;
    const rvpi = equityResidualHoy != null ? Math.max(0, +equityResidualHoy) / cap : null;
    const tvpi = rvpi != null ? dpi + rvpi : null;
    let tir = null;
    const conFecha = list.filter(a => a.fecha);
    if (conFecha.length) {
      const flows = conFecha.map(a => ({ fecha: a.fecha, monto: -a.monto }))
        .concat((dists || []).filter(d => d.fecha).map(d => ({ fecha: d.fecha, monto: +d.monto || 0 })));
      if (equityResidualHoy != null && +equityResidualHoy > 0) flows.push({ fecha: hoy, monto: +equityResidualHoy });
      tir = xirr(flows);
    }
    return { dpi, rvpi, tvpi, tir, distTotal, capital: cap };
  }

  // ─── PORTAFOLIO (admin): XIRR de todos los flujos + KPIs agregados ───
  function portfolio(rows, hoy) {
    const usadas = (rows || []).filter(r => r.close_date && r.paper_value != null && +r.all_in > 0);
    // XIRR SOLO sobre holds >= 365 días — MISMA regla A1 que casa(): un hold <1 año se anualiza a valores
    // extremos no representativos (una casa recién cerrada con equity en papel inflaba el XIRR del portafolio).
    const holdDias = r => Math.max(1, Math.round((((r.vendida && r.fecha_venta) ? dt(r.fecha_venta) : dt(hoy)) - dt(r.close_date)) / DAY));
    const paraXirr = usadas.filter(r => holdDias(r) >= 365);
    const excluidasXirr = usadas.length - paraXirr.length;
    const fA = [], fC = [];
    paraXirr.forEach(r => {
      const fin = (r.vendida && r.fecha_venta) ? r.fecha_venta : hoy;
      fA.push({ fecha: r.close_date, monto: -(+r.all_in) }, { fecha: fin, monto: +r.paper_value });
      fC.push({ fecha: r.close_date, monto: -(+r.compra) }, { fecha: fin, monto: +r.paper_value });
    });
    const inv = usadas.reduce((s, r) => s + +r.all_in, 0);
    const paper = usadas.reduce((s, r) => s + +r.paper_value, 0);
    // múltiplo equity — definición CANÓNICA del Excel "IRR Portafolio": TODAS las casas,
    // deuda no registrada cuenta como 0 (⚠ sobreestima el equity hasta completar la deuda
    // de esas casas — declarado en la UI con el checklist "por completar")
    const deuda = usadas.reduce((s, r) => s + (+r.deuda_vigente || 0), 0);
    const hml = usadas.reduce((s, r) => s + (+r.hml_original || 0), 0);
    const conDeuda = usadas.filter(r => r.deuda_vigente != null && r.hml_original != null);
    const deudaReg = conDeuda.reduce((s, r) => s + +r.deuda_vigente, 0);
    const paperConDeuda = conDeuda.reduce((s, r) => s + +r.paper_value, 0);
    return {
      n: usadas.length, nConDeuda: conDeuda.length,
      nXirr: paraXirr.length, excluidasXirr,
      xirrAllIn: xirr(fA), xirrCompra: xirr(fC),
      invTotal: inv, paperTotal: paper,
      equityInv: inv - hml, equityHoy: paper - deuda,
      multEquity: (inv - hml) > 0 ? (paper - deuda) / (inv - hml) : null,
      ltvPond: paperConDeuda > 0 ? deudaReg / paperConDeuda : null,
      porCompletar: (rows || []).filter(r => (r.deuda_vigente == null || r.hml_original == null) && !r.vendida),
    };
  }

  return { xirr, xnpv, casa, inversionista, portfolio };
});
