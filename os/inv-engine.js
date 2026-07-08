// ════════════════════════════════════════════════════════════════
// 💎 MOTOR FINANCIERO DE INVERSIONISTAS — réplica fiel del Excel
// "Modelo financiero - Renta VF" (ciclo Fix&Flip → renta PadSplit → refi → hold 31 años).
// PURO: sin DOM, sin fetch — params entran, flujos/indicadores salen. Corre en el
// browser (portal) y en node (validación). TODOS los parámetros vienen de
// inv_model_params (cero hardcode acá: los defaults viven en el seed de la tabla).
//
// Estructura (idéntica al Excel):
//  1) FLUJO MENSUAL mes 0..cicloMeses: ingreso = ocupación×arriendo; operativos
//     escalan con ocupación (piso "mínimo servicios" cuando vacío); impuestos →
//     UODI; FC Inversión (compra+draws+cierre); FCL Proyecto = FCInv + UODI;
//     Financiación (HM: desembolsos/intereses/pago · seguro · banco: préstamo/
//     abono/intereses · cashout); FCL Negocio = Proyecto + Financiación.
//  2) AMORTIZACIÓN 360m a tasa refi → abono a capital + intereses banco.
//  3) FLUJO ANUAL año 1..31: año 1 = Σ meses; 2..31 proyecta con inflación (renta
//     y gastos) y valorización (activo). %Deuda, riqueza oculta (abono×%inv),
//     patrimonio inversionista = (1−%deuda)×valor×%inv.
//  4) INDICADORES: PROFIT, ROI, CAP RATE, DSCR, VPN mensual y a 31 años
//     (NPV(retorno esperado) + año 0, CON venta terminal), TIR 31 años
//     (IRR del FCL Negocio anual, SIN venta terminal — retorno del hold),
//     punto de equilibrio. Cada uno × %inversionista y × %empresa.
// ════════════════════════════════════════════════════════════════

/* eslint-disable */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.invEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // ── financieras base (idénticas a Excel PMT/NPV/IRR) ──
  function PMT(rateM, nper, pv) { if (!rateM) return pv / nper; return pv * rateM / (1 - Math.pow(1 + rateM, -nper)); }
  function NPV(rate, flows) { return flows.reduce((s, f, i) => s + f / Math.pow(1 + rate, i + 1), 0); } // Excel NPV: primer flujo en t=1
  function IRR(flows, guess) {
    // Newton + bisección de respaldo sobre flujos por período
    let lo = -0.9999, hi = 10;
    const npvAt = r => flows.reduce((s, f, i) => s + f / Math.pow(1 + r, i), 0);
    let fLo = npvAt(lo), fHi = npvAt(hi);
    if (fLo * fHi > 0) return null; // sin cambio de signo → IRR indefinida
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2, fm = npvAt(mid);
      if (Math.abs(fm) < 1e-7) return mid;
      if (fLo * fm < 0) { hi = mid; fHi = fm; } else { lo = mid; fLo = fm; }
    }
    return (lo + hi) / 2;
  }

  // ── amortización francesa (Excel: tabla 360 filas) ──
  function amortizacion(principal, tasaAnual, plazoM) {
    const r = tasaAnual / 12, cuota = PMT(r, plazoM, principal);
    const tabla = []; let saldo = principal;
    for (let m = 1; m <= plazoM; m++) {
      const interes = saldo * r, abono = Math.min(cuota - interes, saldo);
      saldo = Math.max(0, saldo - abono);
      tabla.push({ m, cuota: interes + abono, interes, abono, saldo });
    }
    return { cuota, tabla };
  }

  // ══ MOTOR ══ p = parámetros (de inv_model_params) · reales = inv_cashflow_real (opcional, escenario Realizado)
  function run(p) {
    const M = p.cicloMeses != null ? p.cicloMeses : 12;
    const ANIOS = p.anios != null ? p.anios : 31;
    const arriendoPleno = p.numHab * p.arriendoHab;
    const rampa = p.rampa || [];                       // ocupación 0..1 por mes (mes 0..M)
    const occ = m => (m < rampa.length ? rampa[m] : (p.ocupacionEstable != null ? p.ocupacionEstable : 1));
    const pisoServicios = p.pisoServicios != null ? p.pisoServicios : 0.10;
    const escala = m => { const o = occ(m); return o > 0 ? o : pisoServicios; };  // operativos escalan; piso cuando vacío

    // financiación
    const hmInicial = p.hmInicial != null ? p.hmInicial : 0;   // desembolso HM en mes 0 (compra)
    const drawsMes = p.draws || {};                            // {mes: monto} remodelación financiada por HM
    const refiMes = p.refiMes;                                 // mes del refi (paga HM, entra banco)
    const banco = amortizacion(p.refiMonto, p.refiTasa, p.refiPlazoM);

    // ── 1) flujo mensual del ciclo ──
    // p.realesPorMes = { m: {ingreso, operativos, impuestos, inversion, financiero} } — escenario
    // REALIZADO: el SUMIF de la hoja "Datos reales" por mes reemplaza la línea calculada.
    const RM = p.realesPorMes || {};
    const meses = [];
    let saldoHM = 0;
    for (let m = 0; m <= M; m++) {
      const o = occ(m), e = escala(m);
      const rp = RM[m] || null;
      let ingreso = o * arriendoPleno;
      // operativos: fijos que escalan (mantenimiento + servicios + HOA) y % del ingreso (PadSplit + comisión)
      const mant = (p.mantenimientoMes || 0) * e;
      const servicios = (p.serviciosMes || 0) * e;               // Σ de los 8 ítems (parametrizados como total o ítems)
      const hoa = p.hoaMes || 0;
      const padsplit = ingreso * (p.padsplitPct || 0);
      const comision = ingreso * (p.comisionPct || 0);
      let operativos = mant + servicios + hoa + padsplit + comision;
      if (rp && rp.ingreso != null) ingreso = rp.ingreso;        // REAL manda
      if (rp && rp.operativos != null) operativos = rp.operativos;
      const utilOperativa = ingreso - operativos;
      // impuestos: propiedad (ARV × tasa /12, corre siempre) + renta condicional (solo si utilidad > 0)
      let impPropiedad = p.arv * (p.impPropiedadPct || 0) / 12;
      let impRenta = utilOperativa > 0 ? utilOperativa * (p.impRentaPct || 0) : 0;
      if (rp && rp.impuestos != null) { impPropiedad = rp.impuestos; impRenta = 0; }
      const uodi = utilOperativa - impPropiedad - impRenta;
      // FC inversión
      const compraMes = m === 0 ? -(p.compra + (p.cierreCompra || 0)) : 0;
      const drawMes = -(drawsMes[m] || 0);
      let otrosInv = -((p.otrosInversionMes || {})[m] || 0);     // muebles, setup, etc. por mes
      if (rp && rp.inversion != null) otrosInv = -rp.inversion;  // inversión REAL del mes reemplaza el supuesto
      const fcInv = compraMes + drawMes + otrosInv;
      const fclProyecto = fcInv + uodi;
      // financiación
      let fin = 0;
      const detFin = { hmDesembolso: 0, hmInteres: 0, hmPago: 0, bancoPrestamo: 0, bancoCuota: 0, seguro: -(p.seguroMes || 0), cashout: 0 };
      if (m === 0 && hmInicial) { detFin.hmDesembolso += hmInicial; saldoHM += hmInicial; }
      if (drawsMes[m]) { detFin.hmDesembolso += drawsMes[m]; saldoHM += drawsMes[m]; }
      if (saldoHM > 0 && m > 0) detFin.hmInteres = -(saldoHM * (p.hmTasa || 0) / 12);
      if (m === refiMes) {
        detFin.bancoPrestamo = p.refiMonto - (p.cierreRefi || 0);
        detFin.hmPago = -saldoHM; saldoHM = 0;
        detFin.cashout = 0; // el cashout ya está implícito en (préstamo − pago HM); se reporta aparte
      }
      if (refiMes != null && m > refiMes) {
        const fila = banco.tabla[m - refiMes - 1];
        if (fila) detFin.bancoCuota = -fila.cuota;
      }
      if (rp && rp.financiero != null) detFin.seguro = -rp.financiero;  // financieros reales del mes (fuera de HM/banco calculados)
      fin = detFin.hmDesembolso + detFin.hmInteres + detFin.hmPago + detFin.bancoPrestamo + detFin.bancoCuota + detFin.seguro + detFin.cashout;
      const fclNegocio = fclProyecto + fin;
      meses.push({ m, ocupacion: o, ingreso, mant, servicios, hoa, padsplit, comision, operativos, utilOperativa, impPropiedad, impRenta, uodi, fcInv, fclProyecto, fin, detFin, fclNegocio, saldoHM });
    }

    // ── 3) flujo anual 0..31 (año 1 = Σ meses 1..12 del ciclo; el mes 0 es el año 0) ──
    const inf = p.inflacion || 0, valz = p.valorizacion || 0;
    const anios = [];
    const bancoMesInicio = refiMes != null ? refiMes : 0;
    for (let a = 0; a <= ANIOS; a++) {
      let ingreso = 0, operativos = 0, impuestos = 0, uodi = 0, cuotaAnual = 0, abono = 0, interesBanco = 0, fclNegocio = 0, fcInv = 0, finExtra = 0;
      if (a === 0) {
        const m0 = meses[0];
        ingreso = m0.ingreso; operativos = m0.operativos; impuestos = m0.impPropiedad + m0.impRenta; uodi = m0.uodi; fcInv = m0.fcInv; finExtra = m0.fin; fclNegocio = m0.fclNegocio;
      } else if (a === 1) {
        for (let m = 1; m <= Math.min(12, M); m++) {
          const x = meses[m];
          ingreso += x.ingreso; operativos += x.operativos; impuestos += x.impPropiedad + x.impRenta; uodi += x.uodi; fcInv += x.fcInv; fclNegocio += x.fclNegocio;
          cuotaAnual += -x.detFin.bancoCuota; finExtra += x.fin;
        }
        for (let m = 1; m <= Math.min(12, M); m++) { const f = banco.tabla[m - bancoMesInicio - 1]; if (f && m > bancoMesInicio) { abono += f.abono; interesBanco += f.interes; } }
      } else {
        const g = Math.pow(1 + inf, a - 1);                    // renta y gastos crecen con inflación desde el año 1 estabilizado
        const ingA = (p.ocupacionEstable != null ? p.ocupacionEstable : 1) * arriendoPleno * 12 * g;
        const opFijo = ((p.mantenimientoMes || 0) + (p.serviciosMes || 0)) * (p.ocupacionEstable || 1) * 12 * g + (p.hoaMes || 0) * 12 * g;
        const opPct = ingA * ((p.padsplitPct || 0) + (p.comisionPct || 0));
        const impProp = p.arv * Math.pow(1 + valz, a - 1) * (p.impPropiedadPct || 0);   // impuesto sigue al avalúo
        const uOp = ingA - opFijo - opPct;
        const impR = uOp - impProp > 0 ? (uOp - impProp) * (p.impRentaPct || 0) : 0;
        ingreso = ingA; operativos = opFijo + opPct; impuestos = impProp + impR; uodi = uOp - impProp - impR;
        for (let k = 0; k < 12; k++) {
          const idx = (a - 1) * 12 + k - bancoMesInicio;       // meses de banco transcurridos
          const f = banco.tabla[idx];
          if (f) { cuotaAnual += f.cuota; abono += f.abono; interesBanco += f.interes; }
        }
        const seguro = (p.seguroMes || 0) * 12 * g;
        fclNegocio = uodi - cuotaAnual - seguro; finExtra = -cuotaAnual - seguro;
      }
      const valor = p.arv * Math.pow(1 + valz, Math.max(0, a));
      const mesFin = a * 12 - bancoMesInicio;
      const saldo = a === 0 ? (refiMes === 0 ? p.refiMonto : 0) : (mesFin <= 0 ? (refiMes != null && refiMes <= a * 12 ? p.refiMonto : 0) : (banco.tabla[Math.min(mesFin, banco.tabla.length) - 1] || { saldo: 0 }).saldo);
      const pctDeuda = valor > 0 ? saldo / valor : 0;
      anios.push({
        a, ingreso, operativos, impuestos, uodi, cuota: cuotaAnual, abono, interesBanco, fclNegocio, fcInv,
        valor, saldo, pctDeuda,
        riquezaOculta: abono * (p.repartoInv != null ? p.repartoInv : 0.5),
        patrimonioInv: (1 - pctDeuda) * valor * (p.repartoInv != null ? p.repartoInv : 0.5),
        utilidadInv: (uodi - cuotaAnual - (a >= 1 ? (p.seguroMes || 0) * 12 * Math.pow(1 + inf, Math.max(0, a - 1)) : 0)) * (p.repartoInv != null ? p.repartoInv : 0.5),
      });
    }

    // ── 4) indicadores ──
    const tasaDesc = p.retornoEsperado || 0.08;
    const fclMensual = meses.map(x => x.fclNegocio);
    const vpnMensual = fclMensual[0] + NPV(tasaDesc / 12, fclMensual.slice(1));
    const tirMensualPeriodo = IRR(fclMensual);
    const fclAnual = anios.map(x => x.fclNegocio);
    const tir31 = IRR(fclAnual);                                        // SIN venta terminal: retorno del hold
    const ultimo = anios[ANIOS];
    const terminal = ultimo.valor - ultimo.saldo;                       // venta al final (valor − saldo)
    const fclConTerminal = fclAnual.slice(); fclConTerminal[ANIOS] += terminal;
    const tir31ConVenta = IRR(fclConTerminal);
    const vpn31 = fclConTerminal[0] + NPV(tasaDesc, fclConTerminal.slice(1));  // NPV(retorno esperado) + año 0, CON terminal
    // ── BASE OFICIAL "POST-REFI" (como el Excel): año 0 = cash atrapado tras el refi
    // (si hay dato REAL — ff_draws.net_total — manda; si no, el acumulado del ciclo del motor).
    // Los años 1..31 son la OPERACIÓN post-refi (uodi − cuota − seguro, con inflación y
    // cuota fija) — el ciclo completo ya quedó resumido en el año 0 (nada se cuenta dos veces).
    // TIR = IRR(FCL post-refi, sin venta) · VPN = NPV(retorno esperado) + año 0, con venta.
    const mesRefiIdx = refiMes != null ? Math.min(refiMes, M) : M;
    const cicloAcum = meses.slice(0, mesRefiIdx + 1).reduce((s, x) => s + x.fclNegocio, 0);
    const anio0PostRefi = p.cashAtrapadoReal != null ? -Math.abs(p.cashAtrapadoReal) : cicloAcum;
    const opsAnual = (a) => {   // año operativo a precios del año a (misma fórmula del bloque anual 2..31)
      const g = Math.pow(1 + inf, a - 1);
      const ingA = (p.ocupacionEstable != null ? p.ocupacionEstable : 1) * arriendoPleno * 12 * g;
      const opFijo = ((p.mantenimientoMes || 0) + (p.serviciosMes || 0)) * (p.ocupacionEstable || 1) * 12 * g + (p.hoaMes || 0) * 12 * g;
      const opPct = ingA * ((p.padsplitPct || 0) + (p.comisionPct || 0));
      const impProp = p.arv * Math.pow(1 + valz, a - 1) * (p.impPropiedadPct || 0);
      const uOp = ingA - opFijo - opPct;
      const impR = uOp - impProp > 0 ? (uOp - impProp) * (p.impRentaPct || 0) : 0;
      let cuotaA = 0;
      for (let k = 0; k < 12; k++) { const f = banco.tabla[(a - 1) * 12 + k]; if (f) cuotaA += f.cuota; }
      return (uOp - impProp - impR) - cuotaA - (p.seguroMes || 0) * 12 * g;
    };
    // Perfil de proyección post-refi: 'motor' (uodi−cuota−seguro con inflación, cuota fija)
    // o 'plano' (utilidad anual constante = como proyecta el Excel; se calibra con
    // util_anual_postrefi + anio0_postrefi para reproducir la TIR/VPN de la hoja).
    const perfilPlano = p.postRefiPerfil === 'plano' && p.utilAnualPostRefi != null;
    const anio0Oficial = p.anio0PostRefi != null ? -Math.abs(p.anio0PostRefi) : anio0PostRefi;
    const fclPostRefi = [anio0Oficial];
    for (let a = 1; a <= ANIOS; a++) fclPostRefi.push(perfilPlano ? p.utilAnualPostRefi : opsAnual(a));
    const tir31PostRefi = IRR(fclPostRefi);
    const fclPostRefiVenta = fclPostRefi.slice(); fclPostRefiVenta[ANIOS] += terminal;
    const vpn31PostRefi = fclPostRefiVenta[0] + NPV(tasaDesc, fclPostRefiVenta.slice(1));
    // ── ANÁLISIS DE 3 FASES (por casa y para el inversionista) ──
    // Fase 0: déficit inicial del ciclo (mes y monto del punto más profundo del FCL acumulado)
    // Fase 1: cuándo la operación cubre el déficit post-refi (Σ utilidades ≥ |año 0|)
    // Fase 2: recuperación TOTAL del capital del inversionista (su parte de utilidades ≥ su aporte)
    let acumC = 0, defMax = 0, defMes = 0;
    meses.forEach(x => { acumC += x.fclNegocio; if (acumC < defMax) { defMax = acumC; defMes = x.m; } });
    let f1 = null, acc = 0;
    for (let a = 1; a <= ANIOS; a++) { acc += fclPostRefi[a]; if (acc >= Math.abs(anio0Oficial)) { f1 = a; break; } }
    const invPct = p.repartoInv != null ? p.repartoInv : 0.5;
    let f2 = null;
    if (p.inversionAportada > 0) {
      let accInv = 0;
      for (let a = 1; a <= ANIOS; a++) { accInv += Math.max(0, fclPostRefi[a]) * invPct; if (accInv >= p.inversionAportada) { f2 = a; break; } }
    }
    const fases = {
      fase0: { mes: defMes, deficitMax: defMax },
      fase1: { anio: f1, cubre: Math.abs(anio0Oficial) },
      fase2: { anio: f2, capital: p.inversionAportada || null, nota: f2 == null && p.inversionAportada > 0 ? 'solo con utilidades no se recupera en 31 años — el capital se recupera vía patrimonio/venta o distribuciones del refi' : null },
    };
    // año estabilizado (2) para CAP/DSCR/equilibrio
    const est = anios[2] || anios[1];
    const noi = est.uodi + est.impuestos - (est.impuestos - 0) + est.uodi * 0; // NOI = ingreso − operativos (sin impuestos ni deuda)
    const noiAnual = est.ingreso - est.operativos;
    const costoAllIn = p.compra + (p.cierreCompra || 0) + Object.values(drawsMes).reduce((s, v) => s + v, 0) + Object.values(p.otrosInversionMes || {}).reduce((s, v) => s + v, 0);
    const capValor = noiAnual / (p.arv * Math.pow(1 + valz, 1));
    const capCosto = noiAnual / costoAllIn;
    const dscr = (noiAnual / 12) / banco.cuota;
    const gastoTotalMes = (est.operativos + est.impuestos) / 12 + banco.cuota + (p.seguroMes || 0);
    const puntoEquilibrio = gastoTotalMes / (arriendoPleno * (1 + inf));
    const profit = anios.reduce((s, x) => s + (x.a >= 1 ? x.fclNegocio : 0), 0) + terminal + anios[0].fclNegocio;
    const cashInvertido = -meses.reduce((s, x) => s + Math.min(0, x.fclNegocio), 0);
    const roi = profit / Math.max(cashInvertido, 1);
    const inv = p.repartoInv != null ? p.repartoInv : 0.5;
    const porParte = v => ({ total: v, inversionista: v * inv, empresa: v * (1 - inv) });

    return {
      meses, anios, banco,
      indicadores: {
        arriendoPleno, noiAnual, capValor, capCosto, dscr, puntoEquilibrio,
        vpnMensual, tirCiclo: tirMensualPeriodo != null ? Math.pow(1 + tirMensualPeriodo, 12) - 1 : null,
        tir31, tir31ConVenta, vpn31, terminal, profit: porParte(profit), roi,
        anio0PostRefi: anio0Oficial, tir31PostRefi, vpn31PostRefi,   // ← base OFICIAL (Excel)
        fases,
        cashInvertido, utilidadAnualEstable: porParte(est.uodi - est.cuota - (p.seguroMes || 0) * 12),
        vpn31Parte: porParte(vpn31),
      },
      series: { // las 5 gráficas del modelo
        riqueza: anios.map(x => ({ a: x.a, amortizacion: x.abono, rentabilidad: x.fclNegocio > 0 ? x.fclNegocio : 0, valorizacion: x.a > 0 ? x.valor - p.arv * Math.pow(1 + valz, x.a - 1) : 0 })),
        patrimonio: anios.map(x => ({ a: x.a, valor: x.valor, deuda: x.saldo, patrimonio: x.valor - x.saldo, patrimonioInv: x.patrimonioInv })),
        dscr: anios.map(x => ({ a: x.a, ingreso: x.ingreso, deuda: x.cuota })),
        utilidadAcum: anios.reduce((acc, x) => { const prev = acc.length ? acc[acc.length - 1].acum : 0; acc.push({ a: x.a, acum: prev + (x.a >= 1 ? x.fclNegocio : 0) }); return acc; }, []),
        gastos: anios.map(x => ({ a: x.a, operativos: x.operativos, impuestos: x.impuestos, financieros: x.cuota })),
      },
    };
  }

  // ══ 5) ESCENARIOS — devuelve los params ajustados; el motor es el mismo (una definición) ══
  //  estimado   = underwriting original (remodel/ARV estimados, cierre por originación, sin datos reales)
  //  proyectado = premisas confirmadas + supuestos actuales (params tal cual)
  //  realizado  = proyectado + SUMIF de movimientos reales por mes (reemplazan la línea calculada)
  //  simulado   = proyectado + overrides del simulador (ARV/ocupación/compra/arriendo/tasa)
  function escenario(base, tipo, opts) {
    opts = opts || {};
    if (tipo === 'estimado') {
      const est = opts.est || {};
      const remodel = est.remodelTotal != null ? est.remodelTotal : Object.values(base.draws || {}).reduce((s, v) => s + v, 0);
      const arv = est.arv != null ? est.arv : base.arv;
      const cierre = est.cierrePct != null ? (base.compra + remodel) * est.cierrePct : base.cierreCompra;
      return { ...base, arv, cierreCompra: cierre, draws: { 1: remodel / 2, 2: remodel / 2 }, otrosInversionMes: {},
        hmInicial: base.compra, refiMonto: 0.75 * arv, cashAtrapadoReal: null, realesPorMes: null };
    }
    if (tipo === 'realizado') return { ...base, realesPorMes: opts.movsPorMes || {} };
    if (tipo === 'simulado') {
      const s = { ...base, ...(opts.sim || {}), realesPorMes: null };
      if (opts.sim && opts.sim.arv != null && opts.sim.refiMonto == null) s.refiMonto = 0.75 * opts.sim.arv;
      if (opts.sim && (opts.sim.arv != null || opts.sim.compra != null || opts.sim.refiTasa != null)) s.cashAtrapadoReal = null; // el cash atrapado real ya no aplica al simular el ciclo
      return s;
    }
    return { ...base }; // proyectado
  }

  // SUMIF de la hoja "Datos reales": agrupa movimientos por mes (desde el cierre) y categoría.
  function movsPorMes(movimientos, fechaCierre) {
    const out = {};
    const c = new Date(String(fechaCierre) + 'T00:00:00');
    (movimientos || []).forEach(mv => {
      if (!mv || !mv.fecha) return;
      const d = new Date(String(mv.fecha) + 'T00:00:00');
      const m = Math.max(0, Math.round((d - c) / (30.44 * 86400000)));
      const o = out[m] = out[m] || { ingreso: null, operativos: null, impuestos: null, inversion: null, financiero: null };
      const v = Math.abs(+mv.valor || 0);
      const add = k => { o[k] = (o[k] || 0) + v; };
      if (mv.tipo === 'ingreso' || mv.categoria === 'ingreso') add('ingreso');
      else if (mv.categoria === 'tax') add('impuestos');
      else if (mv.categoria === 'inversion') add('inversion');
      else if (mv.categoria === 'financiero') add('financiero');
      else add('operativos');
    });
    return out;
  }

  return { run, PMT, NPV, IRR, amortizacion, escenario, movsPorMes };
});
