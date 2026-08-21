// ════════════════════════════════════════════════════════════════
// 🔮 MOTOR DE ESCENARIOS DE VENTA + WATERFALL (Analizador de Portafolio).
// PURO (browser + node). NO redefine métricas existentes: IRR = invEngine.IRR
// (la del Excel), equity/paper/deuda = inv_indicadores_data (regla vigente),
// aporte/pct = inv_holdings. Este módulo agrega: métricas base del snapshot FF
// (EGI/NOI/cap implícito/servicio/flujo/CoC/DSCR sobre ff_deals — fuente
// DECLARADA, distinta del modelo mensual del portal), Saldo(n), escenarios de
// venta 3/5/8 con DOS niveles SIEMPRE juntos (TIR BRUTA del deal / TIR NETA
// del inversionista post-waterfall) y el waterfall simple (+preferred opcional).
// Config: defaults en ff_uw_config (esc_*) · override por casa en
// inv_model_params (vacancia, apreciacion_anual, crec_renta_anual, costo_venta,
// costos_cierre) — manual > default, siempre etiquetado.
// Honestidad: sin deuda registrada o sin renta → "por completar", jamás inventar.
// ════════════════════════════════════════════════════════════════
/* eslint-disable */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root.invEngine || (typeof require === 'function' ? null : null));
  else root.invEsc = factory(root.invEngine);
})(typeof self !== 'undefined' ? self : this, function (engineMaybe) {
  'use strict';
  // IRR: UNA definición — la de invEngine (Excel). En node se inyecta con setEngine.
  let ENG = engineMaybe || null;
  function setEngine(e) { ENG = e; }
  function irr(flows) {
    if (ENG && ENG.IRR) return ENG.IRR(flows);
    throw new Error('invEsc: falta invEngine (IRR)');
  }

  // ─── fórmulas exactas de la spec ───
  // PMT mensual de un préstamo amortizado
  function pmtMensual(tasaAnual, plazoAnios, principal) {
    const i = tasaAnual / 12, n = plazoAnios * 12;
    if (!principal || !n) return 0;
    if (!i) return principal / n;
    return principal * i / (1 - Math.pow(1 + i, -n));
  }
  // Saldo tras n años de pagos (amortizada; interes_only = saldo constante)
  function saldoTras(principal, tasaAnual, plazoAnios, nAnios, tipo) {
    if (principal == null) return null;
    if (tipo === 'interes_only') return principal;
    const i = tasaAnual / 12, k = nAnios * 12;
    const P = pmtMensual(tasaAnual, plazoAnios, principal);
    if (!i) return Math.max(0, principal - P * k);
    return Math.max(0, principal * Math.pow(1 + i, k) - P * ((Math.pow(1 + i, k) - 1) / i));
  }

  // ─── métricas base (sobre el snapshot FF; fuente declarada por campo) ───
  // casa: { aporte, pct, renta_mensual, gastos_anuales, arv(paper), deuda_saldo, deuda_tasa,
  //         deuda_tipo('amortizada'|'interes_only'), deuda_plazo, porCompletar }
  function base(c, cfg) {
    const vac = c.vacancia != null ? +c.vacancia : +cfg.vacancia;
    const egi = (+c.renta_mensual || 0) * 12 * (1 - vac);
    const noi = egi - (+c.gastos_anuales || 0);
    const cap = +c.arv > 0 ? noi / +c.arv : null;
    let servicio = null;
    if (c.deuda_saldo != null && c.deuda_tasa != null) {
      servicio = c.deuda_tipo === 'interes_only'
        ? +c.deuda_saldo * +c.deuda_tasa
        : pmtMensual(+c.deuda_tasa, +c.deuda_plazo || 30, +c.deuda_saldo) * 12;
    }
    const flujo = servicio != null ? noi - servicio : (c.deuda_saldo === 0 ? noi : null);
    const coc = (flujo != null && +c.aporte > 0) ? flujo / +c.aporte : null;
    const dscr = (servicio > 0) ? noi / servicio : null;
    const equity = (c.deuda_saldo != null && +c.arv > 0) ? +c.arv - +c.deuda_saldo : null;
    return { vacancia: vac, egi, noi, cap, servicio, flujo, coc, dscr, dscrAlerta: dscr != null && dscr < 1.20, equity, renta_mensual: +c.renta_mensual || 0, renta_fuente: c.renta_fuente || null };
  }

  // ─── waterfall simple: capital primero, luego split del excedente ───
  // reparto_venta(n) = aporte + max(0, producto_neto − aporte) × pct
  // preferred (si cfg.preferred_on): capital → pref acumulado (aporte×pref×n) → excedente×pct
  function repartoVenta(productoNeto, aporte, pct, n, cfg) {
    if (productoNeto == null) return null;
    if (cfg.preferred_on) {
      const pref = Math.min(Math.max(0, productoNeto - aporte), aporte * (+cfg.preferred_pct || 0.08) * n);
      const excedente = Math.max(0, productoNeto - aporte - pref);
      return Math.min(productoNeto, aporte) + pref + excedente * pct;
    }
    return Math.min(productoNeto, aporte) + Math.max(0, productoNeto - aporte) * pct;
  }

  // ─── escenarios de venta (n = 3/5/8) — bruto (deal) y neto (inversionista) ───
  function escenarios(c, cfg, anios) {
    const b = base(c, cfg);
    const apre = c.apreciacion_anual != null ? +c.apreciacion_anual : +cfg.apreciacion_anual;
    const crec = c.crec_renta_anual != null ? +c.crec_renta_anual : +cfg.crec_renta_anual;
    const cVenta = c.costo_venta != null ? +c.costo_venta : +cfg.costo_venta;
    const pct = +c.pct || 0;
    const incompleto = c.porCompletar || b.flujo == null || !(+c.arv > 0) || !(+c.aporte > 0) || !(+c.renta_mensual > 0);
    const out = { base: b, supuestos: { apreciacion: apre, crec_renta: crec, costo_venta: cVenta, vacancia: b.vacancia, origen: { apreciacion: c.apreciacion_anual != null ? 'manual' : 'config', crec_renta: c.crec_renta_anual != null ? 'manual' : 'config', costo_venta: c.costo_venta != null ? 'manual' : 'config', vacancia: c.vacancia != null ? 'manual' : 'config' } }, filas: [], porCompletar: incompleto };
    out.flujoNegativo = !incompleto && b.flujo < 0; // la fórmula de la spec hace crecer el déficit — leer como señal de salida temprana
    if (incompleto) return out;
    for (const n of (anios || [3, 5, 8])) {
      const valorVenta = +c.arv * Math.pow(1 + apre, n);
      const saldoN = saldoTras(+c.deuda_saldo, +c.deuda_tasa, +c.deuda_plazo || 30, n, c.deuda_tipo);
      const productoNeto = valorVenta * (1 - cVenta) - saldoN;
      // flujos anuales del hold: flujo_caja(t) = flujo×(1+crec)^(t−1)
      const flujosAnuales = []; let rentasAcum = 0;
      for (let t = 1; t <= n; t++) { const f = b.flujo * Math.pow(1 + crec, t - 1); flujosAnuales.push(f); rentasAcum += f; }
      // BRUTO (deal completo sobre el aporte — el nivel que valida el ejemplo)
      const cfB = [-(+c.aporte)].concat(flujosAnuales.slice());
      cfB[n] += productoNeto;
      const irrBruta = irr(cfB);
      const multBruto = (rentasAcum + productoNeto) / +c.aporte;
      // NETO (inversionista: flujos×pct + waterfall en la venta)
      const reparto = repartoVenta(productoNeto, +c.aporte, pct, n, cfg);
      const cfN = [-(+c.aporte)].concat(flujosAnuales.map(f => f * pct));
      cfN[n] += reparto;
      const irrNeta = irr(cfN);
      const multNeto = (flujosAnuales.reduce((s, f) => s + f * pct, 0) + reparto) / +c.aporte;
      out.filas.push({ n, valorVenta, saldoN, productoNeto, rentasAcum, irrBruta, multBruto, reparto, irrNeta, multNeto, cocProm: rentasAcum / n / +c.aporte });
    }
    return out;
  }

  // ─── agregado del portafolio (suma de flujos de las casas completas) ───
  function agregado(casas, cfg, anios) {
    const escs = casas.map(c => ({ c, e: escenarios(c, cfg, anios) }));
    const completas = escs.filter(x => !x.e.porCompletar);
    const out = { n: casas.length, completas: completas.length, porCompletar: escs.filter(x => x.e.porCompletar).map(x => x.c.casa), filas: [], baseAgg: null };
    const aporteT = completas.reduce((s, x) => s + +x.c.aporte, 0);
    out.baseAgg = {
      aporteT,
      noiT: completas.reduce((s, x) => s + x.e.base.noi, 0),
      flujoT: completas.reduce((s, x) => s + (x.e.base.flujo || 0), 0),
      equityT: completas.reduce((s, x) => s + (x.e.base.equity || 0), 0),
      capPond: (function () { const va = completas.reduce((s, x) => s + +x.c.arv, 0); return va ? completas.reduce((s, x) => s + x.e.base.noi, 0) / va : null; })(),
    };
    for (const n of (anios || [3, 5, 8])) {
      const cf = [-aporteT];
      for (let t = 1; t <= n; t++) cf.push(completas.reduce((s, x) => s + x.e.base.flujo * Math.pow(1 + (x.e.supuestos.crec_renta), t - 1), 0));
      let prodT = 0, rentasT = 0, multNum = 0;
      completas.forEach(x => { const f = x.e.filas.find(r => r.n === n); prodT += f.productoNeto; rentasT += f.rentasAcum; multNum += f.rentasAcum + f.productoNeto; });
      cf[n] += prodT;
      out.filas.push({ n, productoNeto: prodT, rentasAcum: rentasT, irrBruta: irr(cf), multBruto: aporteT ? multNum / aporteT : null });
    }
    return out;
  }

  // descomposición del retorno a n años: renta acumulada + amortización (saldo0−saldoN) + plusvalía (valorN−arv)
  function descomposicion(c, cfg, n) {
    const e = escenarios(c, cfg, [n]);
    if (e.porCompletar) return null;
    const f = e.filas[0];
    return { renta: f.rentasAcum, amortizacion: (+c.deuda_saldo || 0) - (f.saldoN || 0), plusvalia: f.valorVenta - +c.arv, costoVenta: f.valorVenta * (e.supuestos.costo_venta) };
  }

  // ═══════════════════════════════════════════════════════════════
  // INDICADORES INSTITUCIONALES — valor forzado + compresión de cap + NAV.
  // MÉTRICAS NUEVAS que se SUMAN sobre el motor: reusa base() (NOI/equity) — NO
  // recalcula NOI/valor/deuda con otra fórmula. Regla de un dato/una fuente:
  //   • NOI = base(c,cfg).noi (renta operativa − gastos operativos, del motor)
  //   • costo total = c.costo_total = ind.all_in (compra + remodelación, del motor)
  //   • valor = c.arv (paper_value) · deuda = c.deuda_saldo (deuda_vigente del motor)
  //   • NAV = navEquity (= equityActual del Panel de Rendimiento, UN solo número).
  //     Si no se pasa navEquity, fallback = base.equity × pct (misma cadena).
  // Cap de mercado = SUPUESTO (cfg.cap_mercado_pct o override por casa), etiquetado.
  // ═══════════════════════════════════════════════════════════════
  function valorCreado(c, cfg, navEquity) {
    cfg = cfg || {};
    const b = base(c, cfg);
    const noi = b.noi;
    const costoTotal = (c.costo_total != null && +c.costo_total > 0) ? +c.costo_total : null;
    const capMercado = (c.cap_mercado != null ? +c.cap_mercado : (cfg.cap_mercado_pct != null ? +cfg.cap_mercado_pct : 0.07));
    // válido solo si hay renta operativa registrada (sin renta → NOI no es representativo)
    const noiValido = costoTotal != null && noi != null && +c.renta_mensual > 0;
    const yieldOnCost = noiValido ? noi / costoTotal : null;               // cap sobre lo que invertimos
    const spread = yieldOnCost != null ? yieldOnCost - capMercado : null;  // valor forzado en puntos %
    // valor de mercado del NOI (NOI/cap) menos lo que nos costó = valor creado aprox.
    const valorForzado = (noiValido && capMercado > 0) ? (noi / capMercado - costoTotal) : null;
    const pct = +c.pct || 0;
    // NAV = equity del Panel de Rendimiento (un solo número) · fallback = equity base × pct
    const nav = (navEquity != null && isFinite(+navEquity)) ? +navEquity
      : ((b.equity != null) ? b.equity * pct : null);
    return {
      casa: c.casa, property_id: c.property_id,
      noi, costoTotal, capMercado, yieldOnCost, spread, valorForzado,
      valorActual: c.arv != null ? +c.arv : null,
      deuda: c.deuda_saldo != null ? +c.deuda_saldo : null,
      pct, nav, aporte: c.aporte != null ? +c.aporte : null,
      capMercadoOrigen: (c.cap_mercado != null ? 'manual' : 'supuesto'),
      tipoContrato: c.tipo_contrato || 'N/D',
      // honestidad: sin renta/costo → por completar; nunca un spread/valor forzado inflado
      porCompletar: !noiValido || c.porCompletar,
    };
  }

  // ─── mapeo ÚNICO datos→casa (admin y portal usan EXACTAMENTE este) ───
  // ind = fila de inv_indicadores_data · P = params efectivos {key: value} · holding = inv_holdings
  function desdeDatos(ind, P, holding) {
    const nz = v => (v == null || +v === 0) ? null : +v;
    P = P || {};
    const refin = !!ind.refinanciada;
    return {
      casa: ind.casa, property_id: ind.property_id,
      aporte: holding ? +holding.inversion_aportada : null,
      pct: holding ? +holding.reparto_pct : 0,
      // SALUD con renta REAL (rent-roll actual) cuando existe; si no, la modelada (CEO #4)
      renta_mensual: (+ind.renta_actual_anual > 0 ? +ind.renta_actual_anual : (+ind.renta_anual || 0)) / 12,
      renta_fuente: (+ind.renta_actual_anual > 0 ? (ind.renta_actual_fuente || 'rent-roll Rentas') : ((+ind.renta_anual > 0) ? 'renta del modelo' : null)),
      gastos_anuales: +ind.gastos_anuales || 0,
      arv: ind.paper_value != null ? +ind.paper_value : null,
      arv_fuente: ind.paper_fuente || null,
      deuda_saldo: ind.deuda_vigente != null ? +ind.deuda_vigente : null,
      deuda_tasa: refin ? (nz(P.refi_tasa) != null ? nz(P.refi_tasa) : 0.07125) : nz(P.hm_tasa),
      deuda_tipo: refin ? 'amortizada' : 'interes_only',
      deuda_plazo: refin ? Math.round((nz(P.refi_plazo_m) || 360) / 12) : 30,
      vacancia: nz(P.vacancia), apreciacion_anual: nz(P.apreciacion_anual),
      crec_renta_anual: nz(P.crec_renta_anual), costo_venta: nz(P.costo_venta),
      // ── indicadores institucionales (valor forzado / cap comprimido / NAV) ──
      // costo total = compra + remodelación = ind.all_in (LA MISMA definición del motor, cero doble fuente)
      costo_total: ind.all_in != null ? +ind.all_in : null,
      cap_mercado: nz(P.cap_mercado_pct),                       // override por casa (opcional) del cap de mercado
      tipo_contrato: (P.tipo_contrato && String(P.tipo_contrato).trim()) ? String(P.tipo_contrato).trim() : 'N/D',
      porCompletar: (ind.deuda_vigente == null && !ind.vendida) || !(+ind.renta_actual_anual > 0 || +ind.renta_anual > 0),
    };
  }
  // defaults de config desde ff_uw_config (filas esc_*) — editable, cero hardcode
  function cfgDesde(rows) {
    const cfg = { vacancia: 0.05, apreciacion_anual: 0.04, crec_renta_anual: 0.08, costo_venta: 0.07, costos_cierre_default: 8000, preferred_on: false, preferred_pct: 0.08, benchmark_tir: 0.15, sp500_anual: 0.10, cap_mercado_pct: 0.07 };
    (rows || []).forEach(r => {
      const k = String(r.key || '').replace(/^esc_/, '');
      if (k === 'preferred_on') cfg.preferred_on = +r.value > 0;
      else if (cfg[k] !== undefined) cfg[k] = +r.value;
    });
    return cfg;
  }
  return { setEngine, pmtMensual, saldoTras, base, repartoVenta, escenarios, agregado, descomposicion, valorCreado, desdeDatos, cfgDesde };
});
