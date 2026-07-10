// ════════════════════════════════════════════════════════════════
// 📐 MOTOR DE CIERRE — definiciones únicas de la reunión 9-jul-2026 + 10 checks anti-recaída.
// UNA definición por métrica, codificada ACÁ (no en fórmulas de Airtable donde cualquiera las rompe).
// Motor PURO: corre en browser (Sabueso /contable, Estimador) y en node (QA/cron). Sin I/O, sin DOM.
// Cada output declara: valor + fórmula + fuente de cada input. Umbrales por cfg (ct_config), sin hardcode.
// Todo hallazgo → propuesta (agent_proposals), siempre aprueba un humano.
// ════════════════════════════════════════════════════════════════
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CierreEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const N = v => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
  const R2 = v => Math.round(v * 100) / 100;

  // Umbrales por defecto — overrideables desde ct_config (misma key). NUNCA editar acá para "ajustar un caso".
  const CFG_DEF = {
    margen_error_materiales_pct: 5,   // 5% margen de error de materiales (reunión 9-jul)
    c9_dup_min_usd: 50,               // valor idéntico en 2 casas: ignorar montos chicos
    c10_tolerancia_meses: 0,          // meses de interés > plazo: sin tolerancia (regla dura)
    c11_gap_min_usd: 1000,            // draws vs cobrado: gap mínimo para alertar
    c11_gap_critico_usd: 5000,
    c12_avance_min_pct: 50,           // obra "ejecutada" = finalizada o avance ≥ 50%
    c13_muebles_min_usd: 100,
    c14_max_listar: 12,               // sin comprobante: top N por $ (el resto agregado)
    c15_gracia_dias: 15,              // plazo vencido: días de gracia antes de exigir extensión
    c17_factor_mediana: 8,            // fuera de rango: > factor × mediana de su categoría
    c17_min_usd: 2000,                // ...y además supera este piso absoluto
    c17_min_muestras: 8,              // mediana solo con n suficiente
    c18_ventana_dias: 30,             // labor sin obra: margen antes/después de la obra
  };
  function cfgNum(cfg, key) { const v = cfg && cfg[key] != null ? parseFloat(cfg[key]) : NaN; return isNaN(v) ? CFG_DEF[key] : v; }

  // ─────────────────────────────────────────────────────────────
  // CAPA 1 · DEFINICIONES (campos calculados con fuente declarada)
  // ─────────────────────────────────────────────────────────────

  // REMODELACIÓN por casa. Inputs:
  //  valorRemodelacion  = lo que Remodelación COBRA a F&F        [manual · Airtable Remodel "Valor" → remodel_at_properties.valor_interno]
  //  presupuesto        = presupuesto interno                    [manual · remodel_at_properties.presupuesto_interno]
  //  drawsIngresados    = draws recibidos del HML                [Airtable FF "Datos por casa" → ff_draws.total_draws]
  //  intereses          = intereses pagados CON dinero del draw  [ff_draws.interest_hml]
  //  servicios          = servicios pagados con dinero del draw  [ff_draws.services_hml]
  //  muebles            = muebles pagados con dinero del draw    [ff_draws.furniture]
  //  pagoExtension      = prórroga del HML (🆕 reunión 9-jul)    [ff_extension_payments Σ por casa; suma al dinero que sale del draw]
  //  gastoMateriales    = gasto real de materiales               [remodel_at_properties.gasto_materiales]
  //  gastoTrabajadores  = gasto real de trabajadores             [remodel_at_properties.gasto_trabajadores]
  //  airtable           = {monto_real, monto_por_gastar, rentabilidad} espejados de la fórmula de Airtable → SOLO para detectar drift
  function remodelCasa(inp, cfg) {
    const draws = N(inp.drawsIngresados), inte = N(inp.intereses), serv = N(inp.servicios), mueb = N(inp.muebles), ext = N(inp.pagoExtension);
    const gm = N(inp.gastoMateriales), gt = N(inp.gastoTrabajadores);
    const margenPct = cfgNum(cfg, 'margen_error_materiales_pct') / 100;

    // Monto real = la plata con la que realmente se cuenta (draws menos lo que ya salió del draw)
    const montoReal = R2(draws - inte - serv - mueb - ext);
    const margenError = R2(gm * margenPct);                    // en moneda, no en %
    const gastoInternoReal = R2(gt + gm + margenError);
    const montoPorGastar = R2(montoReal - gastoInternoReal);   // durante la obra
    const utilidad = R2(montoReal - gastoInternoReal);         // al cierre (misma fórmula, otro momento)
    const rentabilidadPct = montoReal ? R2(utilidad / montoReal * 100) : null;

    const out = {
      valorRemodelacion: { valor: N(inp.valorRemodelacion), formula: 'dato manual (lo que Remodelación cobra a F&F)', fuente: 'Airtable Remodel · valor_interno' },
      presupuesto: { valor: N(inp.presupuesto), formula: 'dato manual (presupuesto interno)', fuente: 'Airtable Remodel · presupuesto_interno' },
      montoReal: { valor: montoReal, formula: 'draws − intereses − servicios − muebles − extensión', fuente: 'ff_draws.total_draws − interest_hml − services_hml − furniture − ff_extension_payments' },
      margenErrorMateriales: { valor: margenError, formula: 'gasto materiales real × ' + (margenPct * 100) + '%', fuente: 'remodel_at_properties.gasto_materiales × ct_config' },
      gastoInternoReal: { valor: gastoInternoReal, formula: 'trabajadores + materiales + margen de error', fuente: 'remodel_at_properties.gasto_trabajadores + gasto_materiales + margen' },
      montoPorGastar: { valor: montoPorGastar, formula: 'monto real − gasto interno real', fuente: 'calculado OS' },
      utilidad: { valor: utilidad, formula: 'monto real − gasto interno real', fuente: 'calculado OS' },
      rentabilidadPct: { valor: rentabilidadPct, formula: 'utilidad / monto real × 100', fuente: 'calculado OS' },
    };
    // Drift vs la fórmula que hoy vive en Airtable (si alguien la rompe allá, esto lo grita)
    if (inp.airtable) {
      out.drift = {};
      if (inp.airtable.monto_real != null) out.drift.montoReal = R2(montoReal - N(inp.airtable.monto_real));
      if (inp.airtable.monto_por_gastar != null) out.drift.montoPorGastar = R2(montoPorGastar - N(inp.airtable.monto_por_gastar));
    }
    return out;
  }

  // FIX & FLIP por casa: meses cubiertos vs hueco (déficit) — NUNCA sumar ambos como intereses del mismo periodo.
  //  hmlMonths          = meses de intereses+servicios cubiertos por el draw   [ff_draws.hml_months]
  //  interesHml         = interés pagado con dinero del draw                   [ff_draws.interest_hml]
  //  interesHastaRenta  = interés del hueco plazo→renta = DÉFICIT              [ff_draws.interest_until_rent]
  //  pagoMensual        = cuota HML que efectivamente se paga (incluye escrow/impound si el statement lo trae)  [ff_deals.hml_payment / statements]
  //  plazoMeses         = plazo del préstamo                                   [ff_hml_loans.plazo_meses]
  //  extension          = {monto, meses} de prórrogas (🆕)                     [ff_extension_payments]
  function ffCasa(inp, cfg) {
    const mensual = N(inp.interesHml) && N(inp.hmlMonths) ? N(inp.interesHml) / N(inp.hmlMonths) : N(inp.pagoMensual);
    const mesesCubiertos = N(inp.hmlMonths);
    const mesesHueco = mensual > 0 ? Math.round(N(inp.interesHastaRenta) / mensual) : null;
    const extMonto = N(inp.extension && inp.extension.monto), extMeses = N(inp.extension && inp.extension.meses);
    const deficit = R2(N(inp.interesHastaRenta) + extMonto);   // el hueco ES déficit; la extensión SUMA al déficit
    return {
      pagoMensual: { valor: R2(mensual), formula: 'interés del draw / meses cubiertos (fallback: cuota del deal, escrow incluido)', fuente: 'ff_draws.interest_hml / hml_months · ff_deals.hml_payment' },
      mesesCubiertos: { valor: mesesCubiertos, formula: 'meses de intereses+servicios pagados con dinero del draw', fuente: 'ff_draws.hml_months' },
      mesesHueco: { valor: mesesHueco, formula: 'interés del hueco / pago mensual (desde plazo final hasta rentar)', fuente: 'ff_draws.interest_until_rent / mensual' },
      mesesInteresTotal: { valor: mesesHueco != null ? mesesCubiertos + mesesHueco : null, formula: 'cubiertos + hueco — deben ser periodos DISTINTOS, jamás el mismo mes en ambos', fuente: 'calculado OS' },
      plazoTotalMeses: { valor: N(inp.plazoMeses) + extMeses, formula: 'plazo del préstamo + meses de extensión', fuente: 'ff_hml_loans.plazo_meses + ff_extension_payments.meses' },
      pagoExtension: { valor: extMonto, formula: 'prórroga del HML — suma al déficit', fuente: 'ff_extension_payments' },
      deficit: { valor: deficit, formula: 'interés del hueco + pago de extensión', fuente: 'ff_draws.interest_until_rent + ff_extension_payments' },
    };
  }

  // PRICING (Estimador Pro) — nunca cobrar de menos: del draw también salen intereses/servicios/muebles.
  // Capitol: cobraron $85k del draw pero solo quedaban ~$63,750 disponibles → déficit $36k. Este cálculo lo evita.
  function precioCobrar(inp, cfg) {
    const gi = N(inp.gastoInternoEsperado), ro = N(inp.rentabilidadObjetivo);
    const salidasDraw = R2(N(inp.interesesDraw) + N(inp.serviciosDraw) + N(inp.mueblesDraw) + N(inp.extensionDraw));
    const valorACobrar = R2(gi + ro + salidasDraw);
    const disponible = R2(N(inp.drawsIngresados) - salidasDraw);
    return {
      valorACobrar: { valor: valorACobrar, formula: 'gasto interno esperado + rentabilidad objetivo + (intereses + servicios + muebles que salen del draw)', fuente: 'Estimador + ff_draws' },
      montoRealDisponible: { valor: disponible, formula: 'draws − lo que sale del mismo draw', fuente: 'ff_draws' },
      brecha: { valor: R2(valorACobrar - disponible), formula: 'a cobrar − disponible (si > 0, el draw no alcanza: pedir draw mayor o ajustar)', fuente: 'calculado OS' },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CAPA 2 · CHECKS C9–C18 (los 10 de la reunión 9-jul)
  // data = { deals, draws, loans, hmlPays, extensiones, remodel, matPays, workerHours, pmProps, pmPay, pmExp }
  // Devuelve findings en el shape de ct_findings (los persiste el Sabueso).
  // ─────────────────────────────────────────────────────────────
  function runChecks(data, cfg, hoyISO) {
    const F = [];
    const hoy = hoyISO ? new Date(hoyISO) : new Date();
    const add = (check, empresa, clave, titulo, impacto, sev, fuente, detalle) =>
      F.push({ check_id: check, empresa, clave, titulo, impacto_usd: Math.round(Math.abs(impacto || 0)), severidad: sev, fuente, detalle: detalle || {} });
    const casa = a => (a || '').split(',')[0].trim();
    const slug = a => (a || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 22);
    // matcher casa↔obra: el Personal en Campo usa solo la calle ("RAMBLE"), Remodel la dirección completa
    const letras = a => (a || '').toLowerCase().replace(/[^a-z]/g, '');
    const matchObra = (casaNombre, obras) => {
      const k = letras(casaNombre); if (k.length < 4) return null;
      return obras.find(o => letras(o.address).includes(k)) || null;
    };
    const deals = data.deals || [], draws = data.draws || [], loans = data.loans || [], hmlPays = data.hmlPays || [];
    const exts = data.extensiones || [], remodel = data.remodel || [], matPays = data.matPays || [];
    const wh = data.workerHours || [], pmProps = data.pmProps || [], pmPay = data.pmPay || [], pmExp = data.pmExp || [];
    const dealByNorm = {}; deals.forEach(d => { if (d.address_norm) dealByNorm[d.address_norm] = d; });
    const loanByNorm = {}; loans.forEach(l => { if (l.address_norm) loanByNorm[l.address_norm] = l; });
    const extByNorm = {}; exts.forEach(e => { if (e.active === false) return; const k = e.address_norm; if (!extByNorm[k]) extByNorm[k] = { monto: 0, meses: 0, n: 0 }; extByNorm[k].monto += N(e.monto); extByNorm[k].meses += N(e.meses); extByNorm[k].n++; });
    // primera renta por property_id (mes de RENTA = billing_ym, regla dura de Rentas)
    const primeraRenta = {}; // property_id (uuid canónico) → 'YYYY-MM'
    const pmPropById = {}; pmProps.forEach(p => pmPropById[p.id] = p);
    pmPay.forEach(x => {
      if (!(N(x.amount) > 0) || !x.billing_ym) return;
      const pp = pmPropById[x.property_id]; const pid = pp && pp.property_id; if (!pid) return;
      if (!primeraRenta[pid] || x.billing_ym < primeraRenta[pid]) primeraRenta[pid] = x.billing_ym;
    });
    const median = arr => { const s = arr.filter(v => v > 0).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

    // ══ C9 · VALOR IDÉNTICO EN DOS CASAS (copy-paste) — casos reunión: Capitol/Virginia $546.31, Michelle/Echo $654.41 ══
    const dupMin = cfgNum(cfg, 'c9_dup_min_usd');
    [['services_hml', 'servicios pagados con el draw'], ['interest_hml', 'intereses del draw'], ['interest_until_rent', 'interés hasta rentar'], ['furniture', 'muebles'], ['other_costs', 'otros costos']].forEach(([f, lbl]) => {
      const porValor = {};
      draws.forEach(d => { const v = R2(N(d[f])); if (v >= dupMin) (porValor[v] = porValor[v] || []).push(d.address); });
      Object.entries(porValor).filter(([v, arr]) => arr.length > 1).forEach(([v, arr]) => {
        // con centavos = casi seguro copy-paste (caso $546.31); redondo puede ser costo estándar (appraisal $750)
        const conCentavos = Math.abs(N(v) - Math.round(N(v))) > 0.001;
        add('C9', 'fix_flip', 'dup-' + f + '-' + String(v).replace('.', '_'),
          'Mismo valor en ' + arr.length + ' casas · ' + lbl + ' = $' + v + ' en ' + arr.map(casa).join(' y ') + (conCentavos ? ' — con centavos idénticos: huele a copy-paste, verificar contra statements' : ' — monto redondo: puede ser costo estándar, confirmar una vez y aceptar'),
          N(v) * (arr.length - 1), conCentavos ? 'critica' : 'info', 'Airtable FF', { campo: f, valor: N(v), casas: arr });
      });
    });
    // mismo monto + misma categoría + mismo mes de renta en 2 propiedades distintas (utilities copy-paste en Rentas)
    const porKey = {};
    pmExp.forEach(e => { const v = R2(N(e.amount)); if (v < dupMin || !e.billing_ym || !e.property_id) return; const k = v + '|' + (e.subcategory || e.category || '') + '|' + e.billing_ym; (porKey[k] = porKey[k] || new Set()).add(e.property_id); });
    Object.entries(porKey).filter(([k, set]) => set.size > 1).forEach(([k, set]) => {
      const [v, cat, ym] = k.split('|');
      const conCentavos = Math.abs(N(v) - Math.round(N(v))) > 0.001;
      if (!conCentavos) return; // tarifa plana legítima (ej. Aseo $100/casa) — no alertar
      add('C9', 'rentas', 'dup-exp-' + slug(k), 'Mismo gasto $' + v + ' (' + cat + ') en ' + set.size + ' casas el mismo mes ' + ym + ' — centavos idénticos, verificar facturas', N(v) * (set.size - 1), 'media', 'Airtable Rentas', { monto: N(v), categoria: cat, mes: ym, n: set.size });
    });

    // ══ C10 · MESES DE INTERÉS > PLAZO DEL PRÉSTAMO (doble conteo cubiertos + hueco) — caso Idlewood 5+6=11 ══
    const tolM = cfgNum(cfg, 'c10_tolerancia_meses');
    draws.forEach(d => {
      const deal = dealByNorm[d.address_norm], loan = loanByNorm[d.address_norm];
      if (!loan || !N(loan.plazo_meses)) return;
      const ff = ffCasa({ hmlMonths: d.hml_months, interesHml: d.interest_hml, interesHastaRenta: d.interest_until_rent, pagoMensual: deal && deal.hml_payment, plazoMeses: loan.plazo_meses, extension: extByNorm[d.address_norm] }, cfg);
      const total = ff.mesesInteresTotal.valor, plazo = ff.plazoTotalMeses.valor;
      if (total == null || !(total > plazo + tolM)) return;
      const exceso = total - plazo;
      add('C10', 'fix_flip', 'meses-' + slug(d.address_norm),
        casa(d.address) + ': ' + total + ' meses de interés contados (' + ff.mesesCubiertos.valor + ' cubiertos + ' + ff.mesesHueco.valor + ' de hueco) > plazo ' + plazo + 'm — NUNCA sumar ambos bloques del mismo periodo; ¿doble conteo o extensión sin registrar?',
        exceso * ff.pagoMensual.valor, 'critica', 'Airtable FF', { meses_cubiertos: ff.mesesCubiertos.valor, meses_hueco: ff.mesesHueco.valor, plazo_total: plazo, exceso_meses: exceso, mensual: ff.pagoMensual.valor });
    });

    // ══ C11 · DRAWS ≠ VALOR COBRADO — casos Capitol 63,750/85,000 · Idlewood 80,000/75,000 · Stonleigh 5,000/10,000 ══
    const gapMin = cfgNum(cfg, 'c11_gap_min_usd'), gapCrit = cfgNum(cfg, 'c11_gap_critico_usd');
    draws.forEach(d => {
      const td = N(d.total_draws), cobrado = N(d.remodel_complete);
      if (!td && !cobrado) return;
      const gap = cobrado - td;
      if (Math.abs(gap) < gapMin) return;
      const loan = loanByNorm[d.address_norm];
      add('C11', 'fix_flip', 'gap-draw-' + slug(d.address_norm),
        casa(d.address) + ': draws ingresados $' + td.toLocaleString() + ' vs cobrado por Remodelación $' + cobrado.toLocaleString() + ' → gap ' + (gap > 0 ? '+' : '') + '$' + gap.toLocaleString() + (gap > 0 ? ' (se cobró MÁS de lo que entró: sale de la caja de F&F)' : ' (draw sin cobrar o cobro de menos)'),
        gap, Math.abs(gap) >= gapCrit ? 'critica' : 'media', 'Airtable FF',
        { draws: td, cobrado, gap, draws_cobrados_hml: loan ? N(loan.draws_cobrados) : null });
    });

    // ══ C12 · GASTO TRABAJADORES = $0 EN CASA CON OBRA EJECUTADA — caso Stonleigh (labor cargada a otra casa) ══
    const avMin = cfgNum(cfg, 'c12_avance_min_pct');
    remodel.forEach(o => {
      const ejecutada = o.proceso === 'Finalizado' || N(o.avance_real != null ? o.avance_real : o.avance_pct) >= avMin;
      if (!ejecutada || N(o.gasto_trabajadores) > 0) return;
      const horas = wh.filter(h => { const k = letras(h.casa_norm || h.casa); return k.length >= 4 && letras(o.address).includes(k); });
      const hrs = horas.reduce((s, h) => s + N(h.horas), 0);
      add('C12', 'remodelacion', 'labor0-' + slug(o.address),
        casa(o.address) + ' (' + (o.proceso || 'en obra') + '): gasto trabajadores = $0 con obra ejecutada' + (hrs ? ' — hay ' + Math.round(hrs) + 'h registradas en campo: la labor está cargada a OTRA casa o sin rate' : ' — ni horas en campo: cargar la nómina real'),
        N(o.gasto_materiales), 'critica', 'Airtable Remodel', { proceso: o.proceso, gasto_materiales: N(o.gasto_materiales), horas_campo: Math.round(hrs) });
    });

    // ══ C13 · MUEBLES > 0 CON FACTURA YA DENTRO DE MATERIALES (doble conteo) ══
    const muebMin = cfgNum(cfg, 'c13_muebles_min_usd');
    const matMueblesPorNorm = {};
    matPays.forEach(m => { if (/mueble/i.test(m.categoria || '')) { const k = m.address_norm || slug(m.address); matMueblesPorNorm[k] = (matMueblesPorNorm[k] || 0) + N(m.precio); } });
    draws.forEach(d => {
      const fur = N(d.furniture); if (fur < muebMin) return;
      const enMat = matMueblesPorNorm[d.address_norm] || 0;
      if (enMat < muebMin) return;
      add('C13', 'fix_flip', 'muebles-doble-' + slug(d.address_norm),
        casa(d.address) + ': columna muebles $' + fur.toLocaleString() + ' Y pagos "Amazon - muebles" $' + Math.round(enMat).toLocaleString() + ' dentro de materiales — si la factura ya está en materiales, muebles va en $0 (facturas mixtas: partir en 2 filas con el mismo comprobante)',
        Math.min(fur, enMat), 'critica', 'Airtable FF+Remodel', { muebles_col: fur, muebles_en_materiales: R2(enMat) });
    });

    // ══ C14 · PAGO SIN COMPROBANTE (regla de Silvia: sin soporte NO se da por bueno) ══
    const maxList = cfgNum(cfg, 'c14_max_listar');
    const sinSoporte = [];
    pmPay.forEach(x => { if (['pagado', 'paid', 'completado'].includes(x.status) && !((x.proof_url || '').trim() || (x.attachment_url || '').trim()) && N(x.amount) > 0) sinSoporte.push({ tipo: 'renta', casa: (pmPropById[x.property_id] || {}).name, monto: N(x.amount), ref: x.concept || x.billing_ym }); });
    pmExp.forEach(e => { if (!((e.invoice_url || '').trim()) && N(e.amount) > 0) sinSoporte.push({ tipo: 'gasto', casa: (pmPropById[e.property_id] || {}).name, monto: N(e.amount), ref: e.description || e.subcategory }); });
    matPays.forEach(m => { if (!((m.orden || '').trim()) && N(m.precio) > 0) sinSoporte.push({ tipo: 'material', casa: m.address, monto: N(m.precio), ref: m.categoria }); });
    if (sinSoporte.length) {
      const tot = sinSoporte.reduce((s, x) => s + x.monto, 0);
      const top = [...sinSoporte].sort((a, b) => b.monto - a.monto).slice(0, maxList);
      const porTipo = {}; sinSoporte.forEach(x => porTipo[x.tipo] = (porTipo[x.tipo] || 0) + 1);
      add('C14', 'holding', 'sin-comprobante',
        sinSoporte.length + ' pagos SIN comprobante por $' + Math.round(tot).toLocaleString() + ' (' + Object.entries(porTipo).map(([t, n]) => n + ' ' + t).join(' · ') + ') — sin soporte el pago NO se da por bueno; adjuntar factura/recibo con link específico (no el Drive general)',
        tot, 'media', 'Airtable', { total: sinSoporte.length, monto: R2(tot), por_tipo: porTipo, top });
    }

    // ══ C15 · PLAZO HML VENCIDO SIN "PAGO DE EXTENSIÓN" REGISTRADO ══
    const gracia = cfgNum(cfg, 'c15_gracia_dias') * 86400000;
    loans.forEach(l => {
      if (!l.fecha_vencimiento) return;
      const deal = dealByNorm[l.address_norm] || {};
      if (/refinanciad|vendida/.test(deal.stage || '')) return;  // HML ya salió
      const venc = new Date(l.fecha_vencimiento);
      if (hoy.getTime() - venc.getTime() < gracia) return;
      if (extByNorm[l.address_norm]) return;
      const feePost = hmlPays.filter(p => p.address_norm === l.address_norm && N(p.fee) > 0 && p.fecha && p.fecha >= l.fecha_vencimiento);
      if (feePost.length) return;  // hay fee posterior al vencimiento (posible extensión ya pagada, falta clasificarla)
      const dias = Math.floor((hoy.getTime() - venc.getTime()) / 86400000);
      add('C15', 'fix_flip', 'venc-sin-ext-' + slug(l.address_norm),
        casa(l.address) + ': HML vencido hace ' + dias + ' días (' + l.fecha_vencimiento + ') sin "Pago de extensión" registrado — si se pagó prórroga, registrarla CON comprobante (suma al déficit); si no, el préstamo está en default técnico',
        N(l.monto_hml) * 0.01, 'critica', 'OS', { vencimiento: l.fecha_vencimiento, dias_vencido: dias, monto_hml: N(l.monto_hml), stage: deal.stage });
    });

    // ══ C16 · REGLA DE CORTE ENTRE EMPRESAS: servicios antes de la 1ª renta = F&F; desde la 1ª renta = Rentas ══
    const esServicio = t => /util|servic|luz|agua|electric|gas\b|internet|aseo|poda|jardin/i.test(t || '');
    const corte = {}; // una fila por casa+lado, con los ítems adentro
    pmExp.forEach(e => {
      if (!esServicio((e.subcategory || '') + ' ' + (e.category || '') + ' ' + (e.description || ''))) return;
      const pp = pmPropById[e.property_id]; const pid = pp && pp.property_id; if (!pid) return;
      const prim = primeraRenta[pid]; if (!prim || !e.billing_ym || e.billing_ym >= prim) return;
      const k = 'pm|' + pid;
      if (!corte[k]) corte[k] = { lado: 'rentas', casa: pp.name, prim, monto: 0, items: [] };
      corte[k].monto += N(e.amount);
      corte[k].items.push({ que: e.description || e.subcategory, mes: e.billing_ym, monto: N(e.amount) });
    });
    matPays.forEach(m => {
      if (!/aseo|jardin|internet|poda|basura/i.test(m.categoria || '') || !m.fecha || !m.property_id) return;
      const prim = primeraRenta[m.property_id]; if (!prim || (m.fecha || '').slice(0, 7) <= prim) return;
      const k = 'ff|' + m.property_id;
      if (!corte[k]) corte[k] = { lado: 'remodelacion', casa: m.address, prim, monto: 0, items: [] };
      corte[k].monto += N(m.precio);
      corte[k].items.push({ que: m.categoria, mes: m.fecha, monto: N(m.precio) });
    });
    Object.entries(corte).forEach(([k, x]) => add('C16', x.lado, 'corte-' + slug(k + x.casa),
      casa(x.casa) + ': ' + x.items.length + ' servicio(s) por $' + Math.round(x.monto).toLocaleString() + (x.lado === 'rentas'
        ? ' cargados a Rentas ANTES de la 1ª renta (' + x.prim + ') — antes de la primera renta los paga Fix & Flip, nunca en ambos'
        : ' pagados por la obra DESPUÉS de la 1ª renta (' + x.prim + ') — desde la primera renta los paga Rentas'),
      x.monto, 'media', x.lado === 'rentas' ? 'Airtable Rentas' : 'Airtable Remodel', { primera_renta: x.prim, items: x.items }));

    // ══ C17 · MONTO FUERA DE RANGO (cero faltante / dígito de más) vs histórico de categoría y portafolio ══
    const factor = cfgNum(cfg, 'c17_factor_mediana'), minAbs = cfgNum(cfg, 'c17_min_usd'), minN = cfgNum(cfg, 'c17_min_muestras');
    const maxRango = cfgNum(cfg, 'c14_max_listar');
    const outliers = [];
    const porCat = {};
    matPays.forEach(m => { const c = (m.categoria || 'sin categoría').trim(); (porCat[c] = porCat[c] || []).push(m); });
    Object.entries(porCat).forEach(([c, arr]) => {
      if (arr.length < minN) return;
      const med = median(arr.map(m => N(m.precio))); if (!med) return;
      arr.filter(m => N(m.precio) > Math.max(med * factor, minAbs)).forEach(m => outliers.push({
        ratio: N(m.precio) / med, clave: 'rango-mat-' + slug((m.address || '') + m.fecha + m.precio),
        titulo: casa(m.address) + ': pago de materiales $' + N(m.precio).toLocaleString() + ' (' + c + ', ' + (m.fecha || 's/f') + ') = ' + Math.round(N(m.precio) / med) + '× la mediana de su categoría ($' + Math.round(med).toLocaleString() + ') — ¿dígito de más?',
        impacto: N(m.precio) - med, detalle: { categoria: c, monto: N(m.precio), mediana_categoria: R2(med), n_muestras: arr.length },
      }));
    });
    const diasPago = wh.map(h => N(h.pago_total_dia || h.pago)).filter(v => v > 0);
    const medDia = median(diasPago);
    if (medDia && diasPago.length >= minN) wh.filter(h => N(h.pago_total_dia || h.pago) > Math.max(medDia * factor, minAbs)).forEach(h => outliers.push({
      ratio: N(h.pago_total_dia || h.pago) / medDia, clave: 'rango-dia-' + slug((h.worker || '') + (h.fecha || '') + h.pago),
      titulo: 'Pago de día fuera de rango: ' + (h.worker || '¿?') + ' $' + N(h.pago_total_dia || h.pago).toLocaleString() + ' el ' + (h.fecha || 's/f') + ' en ' + casa(h.casa) + ' (mediana del portafolio $' + Math.round(medDia) + '/día) — ¿cero de más?',
      impacto: N(h.pago_total_dia || h.pago) - medDia, detalle: { worker: h.worker, fecha: h.fecha, pago: N(h.pago_total_dia || h.pago), mediana_dia: R2(medDia) },
    }));
    outliers.sort((a, b) => b.ratio - a.ratio);
    outliers.slice(0, maxRango).forEach(o => add('C17', 'remodelacion', o.clave, o.titulo, o.impacto, 'media', 'Airtable Remodel', o.detalle));
    if (outliers.length > maxRango) {
      const resto = outliers.slice(maxRango);
      add('C17', 'remodelacion', 'rango-resto', resto.length + ' montos más fuera de rango (ratio menor) por $' + Math.round(resto.reduce((s, o) => s + o.impacto, 0)).toLocaleString() + ' — revisar tras despachar los primeros ' + maxRango,
        resto.reduce((s, o) => s + o.impacto, 0), 'info', 'Airtable Remodel', { n: resto.length });
    }

    // ══ C18 · LABOR CARGADA A CASA SIN OBRA EN ESE PERIODO (el reverso del caso Stonleigh) ══
    const ventana = cfgNum(cfg, 'c18_ventana_dias') * 86400000;
    const obraCache = {};
    const fueraPorCasa = {};
    wh.forEach(h => {
      if (!h.fecha || !(N(h.horas) > 0)) return;
      const ck = letras(h.casa_norm || h.casa);
      if (!(ck in obraCache)) obraCache[ck] = matchObra(h.casa_norm || h.casa, remodel);
      const o = obraCache[ck];
      const f = new Date(h.fecha).getTime();
      let fuera = false, motivo = '';
      if (!o) { fuera = true; motivo = 'casa sin obra en Remodelación'; }
      else {
        const ini = o.fecha_inicio ? new Date(o.fecha_inicio).getTime() - ventana : null;
        const fin = o.fecha_real_fin ? new Date(o.fecha_real_fin).getTime() + ventana : null;
        if (ini != null && f < ini) { fuera = true; motivo = 'antes del inicio de obra (' + o.fecha_inicio + ')'; }
        if (fin != null && f > fin) { fuera = true; motivo = 'después del fin de obra (' + o.fecha_real_fin + ')'; }
      }
      if (!fuera) return;
      const k = (h.casa || h.casa_norm || '¿?') + '|' + motivo;
      if (!fueraPorCasa[k]) fueraPorCasa[k] = { casa: h.casa || h.casa_norm, motivo, horas: 0, pago: 0, n: 0, desde: h.fecha, hasta: h.fecha };
      const x = fueraPorCasa[k]; x.horas += N(h.horas); x.pago += N(h.pago_total_dia || h.pago); x.n++;
      if (h.fecha < x.desde) x.desde = h.fecha; if (h.fecha > x.hasta) x.hasta = h.fecha;
    });
    Object.values(fueraPorCasa).filter(x => x.horas >= 8).forEach(x =>
      add('C18', 'remodelacion', 'labor-fuera-' + slug(x.casa + x.motivo),
        casa(x.casa) + ': ' + Math.round(x.horas) + 'h de labor (' + x.n + ' registros, ' + x.desde + '→' + x.hasta + ') cargadas ' + x.motivo + ' — ¿labor de otra casa? (así se perdió la de Stonleigh)',
        x.pago, 'media', 'Airtable Remodel', x));

    return F;
  }

  return { CFG_DEF, remodelCasa, ffCasa, precioCobrar, runChecks };
});
