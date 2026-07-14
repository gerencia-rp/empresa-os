// ════════════════════════════════════════════════════════════════
// 📊 ANALÍTICA & KPIs — Fix & Flip (rediseño 13-jul, pedido del CEO)
// Las preguntas que importan: volumen, rentabilidad realizada, portafolio
// en renta, patrimonio, proyección, ritmo, velocidad y salud/riesgo.
// SOLO LECTURA. KPIs desde FF.* (espejo Airtable + vistas v_*). Cada KPI
// declara de dónde sale (kitDrill) y, donde aplica, NextAction (kitNext).
// Regla dura: sin dato ≠ $0 (noZeroAsReal / "faltan datos").
// Se engancha al CC: ffSecAnalitica delega en window.ffAnaliticaView(comp).
// ════════════════════════════════════════════════════════════════
(function () {
  const AN = window.AN = window.AN || {
    tasa: null,          // % apreciación del slider (default de cfg o 4)
    saludOpen: null,     // bucket abierto en Salud de cartera
    sup: null, supLoading: false, // v_supuestos_calibrados (lazy)
  };

  const M = (n, o) => (typeof kitMoney === 'function' ? kitMoney(n, o) : (n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US')));
  const ESC = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PCT = (n, d) => (n == null || !isFinite(n)) ? '—' : (n).toFixed(d == null ? 1 : d) + '%';
  const casaCorta = a => String(a || '').split(',')[0].trim();
  const EN_RENTA = ['rentada', 'rentada_y_refinanciada'];
  const OPERADOR = 'Prestación de Servicios como Operador'; // casas operadas p/ terceros: NO patrimonio propio

  // ─── CSS scopeado (#ff-overlay, anti-reset) — tokens, cero paleta propia ───
  function anCSS() {
    if (document.getElementById('an-css')) return;
    const st = document.createElement('style'); st.id = 'an-css';
    st.textContent = `
    #ff-overlay .an-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin:10px 0}
    #ff-overlay .an-sec{margin:26px 0 10px}
    #ff-overlay .an-sec h3{font-size:14px;font-weight:800;color:var(--ink);margin:0 0 2px;letter-spacing:.2px}
    #ff-overlay .an-sec .an-sub{font-size:11.5px;color:var(--mut);margin:0 0 8px}
    #ff-overlay .an-t{width:100%;border-collapse:collapse;font-size:12px;color:var(--ink)}
    #ff-overlay .an-t th{text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.6px;color:var(--mut);padding:6px 8px;border-bottom:1px solid rgba(128,140,160,.25)}
    #ff-overlay .an-t td{padding:7px 8px;border-bottom:1px solid rgba(128,140,160,.14);white-space:nowrap;font-variant-numeric:tabular-nums}
    #ff-overlay .an-t tr:last-child td{border-bottom:none}
    #ff-overlay .an-t .r{text-align:right}
    #ff-overlay .an-wrap{overflow-x:auto}
    #ff-overlay .an-pos{color:var(--pos,#0f9d6b);font-weight:700}
    #ff-overlay .an-neg{color:var(--neg,#dc2626);font-weight:700}
    #ff-overlay .an-amb{color:var(--amber,#b45309);font-weight:700}
    #ff-overlay .an-mut{color:var(--mut)}
    #ff-overlay .an-bar{height:10px;border-radius:6px;background:rgba(128,140,160,.18);overflow:hidden;min-width:90px}
    #ff-overlay .an-bar>i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#12b5a0,#2f6ef0)}
    #ff-overlay .an-bar.rojo>i{background:var(--neg,#dc2626)}
    #ff-overlay .an-chart{position:relative;height:240px;width:100%;overflow:hidden}
    #ff-overlay .an-bucket{cursor:pointer;transition:.15s;border:1px solid rgba(128,140,160,.25);border-radius:12px;padding:12px 14px;background:transparent}
    #ff-overlay .an-bucket:hover{border-color:var(--a2,#2563eb)}
    #ff-overlay .an-bucket.on{border-color:var(--a2,#2563eb);box-shadow:0 0 0 1px var(--a2,#2563eb)}
    #ff-overlay .an-bucket .n{font-size:22px;font-weight:800;color:var(--ink)}
    #ff-overlay .an-bucket .l{font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.5px}
    #ff-overlay .an-slider{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 10px;color:var(--ink);font-size:12px}
    #ff-overlay .an-slider input[type=range]{flex:1;min-width:160px;accent-color:var(--a2,#2563eb)}
    #ff-overlay .an-note{font-size:10.5px;color:var(--mut);margin-top:6px}
    `;
    document.head.appendChild(st);
  }

  // ─── días hábiles/fechas ───
  const D = iso => new Date(iso + 'T00:00:00');
  const diasEntre = (a, b) => (a && b) ? Math.round((D(b) - D(a)) / 86400000) : null;
  const mesesEntre = (a, b) => (a && b) ? (D(b) - D(a)) / (86400000 * 30.44) : null;
  const ym = iso => String(iso).slice(0, 7);

  // ════════════════ MODELO (una pasada, todo declarado) ════════════════
  function anModel(comp) {
    const deals = FF.deals || [];
    const loans = FF.loans || [];
    const pays = FF.hml || [];
    const cfg = FF.cfg || {};
    const cap = FF.capital || {};
    const loanBy = {}; loans.forEach(l => { if (l.address_norm) loanBy[l.address_norm] = l; });
    const hoy = new Date();

    // S1 — volumen + ritmo
    const porEstado = {};
    deals.forEach(d => { porEstado[d.stage] = (porEstado[d.stage] || 0) + 1; });
    const closes = deals.filter(d => d.close_date).map(d => d.close_date).sort();
    const sinFechaCierre = deals.filter(d => !d.close_date);
    const porMes = {};
    closes.forEach(c => { porMes[ym(c)] = (porMes[ym(c)] || 0) + 1; });
    const mesesSpan = closes.length ? Math.max(1, mesesEntre(closes[0], hoy.toISOString().slice(0, 10))) : null;
    const ritmo = n => {
      const corte = new Date(hoy); corte.setMonth(corte.getMonth() - n);
      const cIso = corte.toISOString().slice(0, 10);
      return closes.filter(c => c >= cIso).length / n;
    };

    // S2 — vendidas (venta desde ff_hml_loans ← "Datos por casa")
    const vendidas = deals.filter(d => d.stage === 'vendida').map(d => {
      const l = loanBy[d.address_norm] || {};
      return { d, venta: l.precio_venta, bruta: l.utilidad_bruta_venta, neta: l.utilidad_neta_venta, roi: l.roi_venta, conDatos: l.precio_venta != null };
    });
    const vConDatos = vendidas.filter(v => v.conDatos);
    const vSum = k => vConDatos.reduce((s, v) => s + (+v[k] || 0), 0);

    // S3 — portafolio en renta (flujo op vs post-deuda)
    const enRenta = deals.filter(d => EN_RENTA.includes(d.stage));
    const rentaConDato = enRenta.filter(d => d.renta_mensual != null);
    const flujoOpMes = enRenta.reduce((s, d) => s + ((+d.renta_mensual || 0) - (+d.gastos_mensuales || 0)), 0);
    const carryMes = enRenta.reduce((s, d) => s + (+d.hml_payment || 0) + (+d.ref30_payment || 0), 0);
    const postDeudaMes = flujoOpMes - carryMes;
    const refis = enRenta.filter(d => d.stage === 'rentada_y_refinanciada');
    const enHml = enRenta.filter(d => d.stage === 'rentada');

    // S4 — patrimonio (propias = no vendidas y NO operadas para terceros)
    const propias = deals.filter(d => d.stage !== 'vendida' && (d.modelo_negocio || '') !== OPERADOR);
    const operadas = deals.filter(d => d.stage !== 'vendida' && (d.modelo_negocio || '') === OPERADOR);
    const valorPortafolio = propias.reduce((s, d) => s + (+d.arv || 0), 0);
    const propiasSinArv = propias.filter(d => !d.arv);
    const deudaHmlQbo = +cap.deuda_hml_qbo || null;
    const deudaRefiQbo = +cap.deuda_refi_qbo || null;
    const deudaQbo = (deudaHmlQbo != null || deudaRefiQbo != null) ? (deudaHmlQbo || 0) + (deudaRefiQbo || 0) : null;
    const deudaOsHml = loans.filter(l => l.monto_prestamo_refi == null).reduce((s, l) => s + (+l.monto_hml || 0), 0);
    const deudaOsRefi = loans.reduce((s, l) => s + (+l.monto_prestamo_refi || 0), 0);
    const capital = +cap.equity_comprometido_airtable || null;
    const equity = (valorPortafolio && deudaQbo != null) ? valorPortafolio - deudaQbo : null;
    const mult = (equity != null && capital) ? equity / capital : null;

    // S6 — velocidad (por casa desde ff_hml_loans + primer ref30 de ff_hml_payments)
    const primeraRef30 = {};
    pays.forEach(p => { if (p.fecha_ref30 && p.address_norm) { if (!primeraRef30[p.address_norm] || p.fecha_ref30 < primeraRef30[p.address_norm]) primeraRef30[p.address_norm] = p.fecha_ref30; } });
    const obras = loans.filter(l => l.fecha_inicio_rehab && l.fecha_fin_rehab)
      .map(l => ({ casa: casaCorta(l.address), dias: diasEntre(l.fecha_inicio_rehab, l.fecha_fin_rehab), fin: l.fecha_fin_rehab, norm: l.address_norm, venc: l.fecha_vencimiento }))
      .filter(o => o.dias != null && o.dias >= 0);
    const hastaRefi = loans.filter(l => l.fecha_fin_rehab && primeraRef30[l.address_norm])
      .map(l => ({ casa: casaCorta(l.address), dias: diasEntre(l.fecha_fin_rehab, primeraRef30[l.address_norm]) }))
      .filter(o => o.dias != null && o.dias >= 0);
    const prom = arr => arr.length ? arr.reduce((s, o) => s + o.dias, 0) / arr.length : null;
    const aTiempo = loans.filter(l => l.fecha_fin_rehab && l.fecha_vencimiento);
    const aTiempoOk = aTiempo.filter(l => l.fecha_fin_rehab <= l.fecha_vencimiento);
    const conPresu = (comp?.deals || []).filter(d => d.budgetDevPct != null && isFinite(d.budgetDevPct));
    const presuOk = conPresu.filter(d => !d.semBudget);

    // S7.1 — pipeline de refi (rentadas aún en HML)
    const ltvPct = +cfg.refi_ltv_pct || 75;
    const pipeline = enHml.map(d => {
      const l = loanBy[d.address_norm] || {};
      const saldo = +l.monto_hml || null;
      const tope = d.arv ? d.arv * ltvPct / 100 : null;
      const gap = (tope != null && saldo != null) ? tope - saldo : null;
      return { d, casa: casaCorta(d.address), arv: d.arv, saldo, tope, gap, lista: gap != null && gap >= 0 };
    }).sort((a, b) => (b.gap ?? -1e15) - (a.gap ?? -1e15));

    // S7.2 — concentración por inversionista (co-inversión = sin la empresa propia)
    const coInvs = (FF.investors || []).filter(i => (+i.capital_aportado || 0) > 0 && !/flipping\s*rentals/i.test(i.name || ''));
    const coTotal = coInvs.reduce((s, i) => s + (+i.capital_aportado || 0), 0);
    const umbralConc = +cfg.an_conc_max_pct || 25;
    const conc = coInvs.map(i => ({
      name: i.name, capital: +i.capital_aportado || 0, nDeals: String(i.deal_rec_ids || '').split(',').filter(Boolean).length,
      share: coTotal ? (+i.capital_aportado || 0) / coTotal * 100 : 0,
    })).sort((a, b) => b.capital - a.capital);

    // S7.3 — salud de cartera (flujo mensual POST-deuda por casa; déficit corregido, NUNCA desde draws)
    const salud = { sanas: [], deficit: [], sinDatos: [], noAplica: [] };
    deals.filter(d => d.stage !== 'vendida').forEach(d => {
      if (!EN_RENTA.includes(d.stage)) { salud.noAplica.push({ d, flujo: null }); return; }
      if (d.renta_mensual == null) { salud.sinDatos.push({ d, flujo: null }); return; }
      const flujo = (+d.renta_mensual || 0) - (+d.gastos_mensuales || 0) - (+d.hml_payment || 0) - (+d.ref30_payment || 0);
      (flujo >= 0 ? salud.sanas : salud.deficit).push({ d, flujo });
    });
    salud.deficit.sort((a, b) => a.flujo - b.flujo);

    return {
      deals, cfg, porEstado, closes, sinFechaCierre, porMes, mesesSpan, ritmo,
      vendidas, vConDatos, vSum,
      enRenta, rentaConDato, flujoOpMes, carryMes, postDeudaMes, refis, enHml,
      propias, operadas, propiasSinArv, valorPortafolio, deudaQbo, deudaHmlQbo, deudaRefiQbo, deudaOsHml, deudaOsRefi, capital, equity, mult, qboAsOf: cap.qbo_as_of,
      obras, hastaRefi, promObra: prom(obras), promHastaRefi: prom(hastaRefi), aTiempo, aTiempoOk, conPresu, presuOk,
      pipeline, ltvPct, conc, coTotal, umbralConc, salud,
    };
  }

  // ════════════════ SECCIONES ════════════════
  const sec = (t, sub, inner) => `<div class="an-sec"><h3>${t}</h3><div class="an-sub">${sub}</div>${inner}</div>`;
  const kpi = o => (typeof kitKpi === 'function') ? kitKpi(o) : `<div class="card" style="padding:12px">${o.label}: <b>${o.valor ?? o.falta ?? '—'}</b></div>`;

  // S1 · OPERACIONES
  function anS1(m) {
    const est = [
      ['En renta', (m.porEstado.rentada || 0) + (m.porEstado.rentada_y_refinanciada || 0), `${m.porEstado.rentada || 0} rentadas + ${m.porEstado.rentada_y_refinanciada || 0} rentadas y refinanciadas`],
      ['En rehab', m.porEstado.en_rehab || 0, 'obra en curso'],
      ['Adquiridas', m.porEstado.adquirida || 0, 'por empezar'],
      ['Vendidas', m.porEstado.vendida || 0, 'ciclo completo'],
      ['En venta', m.porEstado.en_venta || 0, 'listadas'],
    ];
    const meses = Object.keys(m.porMes).sort();
    const drillEstados = `<table class="an-t"><tr><th>Estado</th><th class="r">Casas</th></tr>${est.map(e => `<tr><td>${e[0]} <span class="an-mut">· ${e[2]}</span></td><td class="r"><b>${e[1]}</b></td></tr>`).join('')}</table>
      <div class="an-note">Fuente: ff_deals.stage (espejo Airtable "Propiedades", campo Estado). ${m.sinFechaCierre.length ? `⚠ ${m.sinFechaCierre.length} sin "Fecha de Cierre Compra": ${m.sinFechaCierre.map(d => ESC(casaCorta(d.address))).join(', ')} — no cuentan en el ritmo.` : ''}</div>`;
    const drillRitmo = `<table class="an-t"><tr><th>Mes</th><th class="r">Cierres</th></tr>${meses.slice(-12).map(k => `<tr><td>${k}</td><td class="r">${m.porMes[k]}</td></tr>`).join('')}</table>
      <div class="an-note">Fuente: ff_deals.close_date ("Fecha de Cierre Compra" fldG2SABUD5Ptcuj8). Promedio histórico = ${m.closes.length} cierres ÷ ${m.mesesSpan ? m.mesesSpan.toFixed(1) : '—'} meses desde ${m.closes[0] || '—'}.</div>`;
    return sec('1 · Operaciones', 'Volumen: lo que pasó por nuestras manos, y a qué ritmo.', `
      <div class="an-grid">
        ${kpi({ label: 'Total operaciones (histórico)', valor: String(m.deals.length), sub: est.filter(e => e[1]).map(e => `${e[1]} ${e[0].toLowerCase()}`).join(' · '), fuente: 'Airtable', drill: { titulo: 'Desglose por estado', html: drillEstados } })}
        ${kpi({ label: 'Ritmo de cierres', term: null, valor: m.mesesSpan ? (m.closes.length / m.mesesSpan).toFixed(1) + '/mes' : null, falta: m.mesesSpan ? null : 'sin fechas de cierre', sub: `últimos 3m: ${m.ritmo(3).toFixed(1)} · 6m: ${m.ritmo(6).toFixed(1)} · 12m: ${m.ritmo(12).toFixed(1)}`, fuente: 'Airtable', drill: { titulo: 'Cierres por mes (últimos 12)', html: drillRitmo } })}
      </div>
      <div class="an-chart"><canvas id="an-ritmo"></canvas></div>`);
  }

  // S2 · RENTABILIDAD REALIZADA
  function anS2(m) {
    const sinDatos = m.vendidas.filter(v => !v.conDatos);
    const roiProm = m.vConDatos.length ? m.vConDatos.reduce((s, v) => s + (+v.roi || 0), 0) / m.vConDatos.length * 100 : null;
    const filas = m.vendidas.map(v => v.conDatos
      ? `<tr><td>${ESC(casaCorta(v.d.address))}</td><td class="r">${M(v.venta)}</td><td class="r">${M(v.bruta)}</td><td class="r ${(+v.neta || 0) >= 0 ? 'an-pos' : 'an-neg'}">${M(v.neta)}</td><td class="r">${PCT(v.roi * 100)}</td></tr>`
      : `<tr><td>${ESC(casaCorta(v.d.address))}</td><td class="r an-amb" colspan="4">🟡 faltan datos de venta en Airtable ("Datos por casa") → cargarlos</td></tr>`).join('');
    const tabla = `<div class="an-wrap"><table class="an-t"><tr><th>Casa</th><th class="r">Venta</th><th class="r">Utilidad bruta</th><th class="r">Utilidad NETA</th><th class="r">ROI</th></tr>${filas}</table></div>`;
    // lectura honesta (dinámica, con los números reales)
    const lectura = m.vConDatos.length
      ? `De ${m.vendidas.length} vendidas, ${m.vConDatos.length} con datos. La utilidad neta ${M(m.vSum('neta'))} sobre ${M(m.vSum('venta'))} de venta (${PCT(m.vSum('venta') ? m.vSum('neta') / m.vSum('venta') * 100 : null)}) es delgada → <b>el negocio hoy es HOLD (rentar y refinanciar), no flip</b>. ${sinDatos.length ? `Falta cargar la venta de ${sinDatos.map(v => ESC(casaCorta(v.d.address))).join(', ')}.` : ''}`
      : 'Ninguna vendida tiene datos de venta cargados — no se puede leer la rentabilidad realizada todavía.';
    return sec('2 · Rentabilidad realizada', 'Casas vendidas: lo que efectivamente dejó cada flip.', `
      <div class="an-grid">
        ${kpi({ label: 'Vendidas', valor: `${m.vendidas.length}`, sub: `${m.vConDatos.length} con datos de venta`, fuente: 'Airtable' })}
        ${kpi({ label: 'Ingreso por ventas', valor: m.vConDatos.length ? M(m.vSum('venta')) : null, falta: m.vConDatos.length ? null : 'sin ventas con datos', fuente: 'Airtable', drill: { titulo: 'Ventas con datos', html: tabla } })}
        ${kpi({ label: 'Utilidad NETA realizada', valor: m.vConDatos.length ? M(m.vSum('neta')) : null, falta: m.vConDatos.length ? null : 'sin ventas con datos', estado: m.vSum('neta') >= 0 ? 'ok' : 'neg', sub: `bruta ${M(m.vSum('bruta'))}`, fuente: 'Airtable' })}
        ${kpi({ label: 'ROI promedio', valor: roiProm != null ? PCT(roiProm) : null, falta: roiProm == null ? 'sin ventas con datos' : null, fuente: 'Airtable' })}
      </div>
      ${tabla}
      ${typeof kitNext === 'function' ? kitNext(lectura, sinDatos.length ? 'Cargar los datos de venta de ' + sinDatos.map(v => casaCorta(v.d.address)).join(', ') + ' en "Datos por casa"' : 'Priorizar el pipeline de refi (Sección 7) — ahí está el retorno del hold', 'Nico / Michell') : `<div class="an-note">${lectura}</div>`}`);
  }

  // S3 · PORTAFOLIO EN RENTA
  function anS3(m) {
    const drillFlujo = `<div class="an-wrap"><table class="an-t"><tr><th>Casa</th><th class="r">Renta/mes</th><th class="r">Gastos/mes</th><th class="r">Deuda/mes</th><th class="r">Flujo/mes</th></tr>
      ${m.enRenta.map(d => {
        const deuda = (+d.hml_payment || 0) + (+d.ref30_payment || 0);
        const flujo = d.renta_mensual == null ? null : (+d.renta_mensual || 0) - (+d.gastos_mensuales || 0) - deuda;
        return `<tr><td>${ESC(casaCorta(d.address))} ${d.stage === 'rentada_y_refinanciada' ? '<span class="an-pos">· refi ✓</span>' : ''}</td>
          <td class="r">${typeof noZeroAsReal === 'function' ? noZeroAsReal(d.renta_mensual) : M(d.renta_mensual)}</td>
          <td class="r">${M(d.gastos_mensuales)}</td><td class="r">${M(deuda)}</td>
          <td class="r ${flujo == null ? 'an-amb' : flujo >= 0 ? 'an-pos' : 'an-neg'}">${flujo == null ? 'sin renta cargada' : M(flujo)}</td></tr>`;
      }).join('')}</table></div>
      <div class="an-note">Fuente: ff_deals (renta_mensual, gastos_mensuales, hml_payment, ref30_payment — espejo Airtable). Flujo operativo = renta − gastos. Post-deuda = − cuota HML/DSCR. ${m.enRenta.length - m.rentaConDato.length ? `⚠ ${m.enRenta.length - m.rentaConDato.length} casa(s) sin renta cargada suman $0 al flujo (subestima).` : ''}</div>`;
    const yieldOp = (m.equity != null && m.equity > 0) ? m.flujoOpMes * 12 / m.equity * 100 : null;
    const coc = m.capital ? m.postDeudaMes * 12 / m.capital * 100 : null;
    return sec('3 · Portafolio en renta', `${m.enRenta.length} casas rentando — el flujo operativo y el flujo REAL después de deuda, lado a lado.`, `
      <div class="an-grid">
        ${kpi({ label: 'Flujo OPERATIVO anual', term: 'noi', valor: M(m.flujoOpMes * 12), sub: `${M(m.flujoOpMes)}/mes = renta − gastos`, estado: m.flujoOpMes >= 0 ? 'ok' : 'neg', fuente: 'Airtable', drill: { titulo: 'Flujo por casa', html: drillFlujo } })}
        ${kpi({ label: 'Flujo DESPUÉS de deuda (real)', valor: M(m.postDeudaMes * 12), sub: `${M(m.postDeudaMes)}/mes — el carry HML se lo come`, estado: m.postDeudaMes >= 0 ? 'ok' : 'neg', fuente: 'Airtable', drill: { titulo: 'Flujo por casa', html: drillFlujo }, next: { porque: `El servicio de deuda es ${M(m.carryMes)}/mes (${M(m.carryMes * 12)}/año), casi todo HML al 12% interés-solo`, accion: `Priorizar la refi de las ${m.enHml.length} casas en HML (Sección 7) — cada refi baja el carry`, quien: 'Nico' } })}
        ${kpi({ label: 'Yield operativo', term: 'cap-rate', valor: yieldOp != null ? PCT(yieldOp) : null, falta: yieldOp == null ? 'necesita equity (Sección 4)' : null, sub: 'flujo operativo ÷ equity del portafolio', fuente: 'OS' })}
        ${kpi({ label: 'Cash-on-cash (real)', valor: coc != null ? PCT(coc) : null, falta: coc == null ? 'sin capital desplegado' : null, sub: 'flujo post-deuda ÷ capital desplegado', estado: coc != null && coc < 0 ? 'neg' : 'ok', fuente: 'OS' })}
        ${kpi({ label: 'Tasa de refinanciación', term: 'refi', valor: `${m.refis.length} de ${m.enRenta.length}`, sub: `${m.enHml.length} siguen en HML (12% interés-solo)`, estado: 'warn', fuente: 'Airtable' })}
      </div>`);
  }

  // S4 · PATRIMONIO
  function anS4(m) {
    const drillValor = `<div class="an-wrap"><table class="an-t"><tr><th>Casa</th><th>Estado</th><th class="r">ARV</th></tr>
      ${m.propias.slice().sort((a, b) => (+b.arv || 0) - (+a.arv || 0)).map(d => `<tr><td>${ESC(casaCorta(d.address))}</td><td class="an-mut">${ESC(d.stage)}</td><td class="r">${typeof noZeroAsReal === 'function' ? noZeroAsReal(d.arv) : M(d.arv)}</td></tr>`).join('')}</table></div>
      <div class="an-note">Propias = activas, no vendidas y NO "${OPERADOR}" (esas ${m.operadas.length} se operan para terceros: ${m.operadas.map(d => ESC(casaCorta(d.address))).join(', ') || '—'} — no son patrimonio). ${m.propiasSinArv.length ? `⚠ ${m.propiasSinArv.length} propia(s) sin ARV.` : ''} Fuente: ff_deals.arv + modelo_negocio (Airtable).</div>`;
    const drillDeuda = `<table class="an-t">
      <tr><td>Deuda HML (QBO · Loan Payable–HML)</td><td class="r">${M(m.deudaHmlQbo)}</td></tr>
      <tr><td>Deuda refi/DSCR (QBO · HML-Refin)</td><td class="r">${M(m.deudaRefiQbo)}</td></tr>
      <tr><td><b>Total QBO</b> <span class="an-mut">· libros al ${m.qboAsOf ? String(m.qboAsOf).slice(0, 10) : '—'}</span></td><td class="r"><b>${M(m.deudaQbo)}</b></td></tr>
      <tr><td class="an-mut">Espejo OS (Airtable): HML activo ${M(m.deudaOsHml)} + refi ${M(m.deudaOsRefi)}</td><td class="r an-mut">${M(m.deudaOsHml + m.deudaOsRefi)}</td></tr></table>
      <div class="an-note">Manda QBO (los libros). La diferencia OS↔QBO la audita el Sabueso (C1).</div>`;
    return sec('4 · Patrimonio', 'Lo que vale el portafolio, lo que se debe, y cuánto equity generó cada dólar de capital.', `
      ${typeof kitHero === 'function' ? kitHero('Multiplicador de capital 🏆', m.mult != null ? m.mult.toFixed(1) + '×' : '—', `cada $1 de capital desplegado (${M(m.capital)}) generó ${m.mult != null ? '$' + m.mult.toFixed(2) : '—'} de equity`) : ''}
      <div class="an-grid">
        ${kpi({ label: 'Valor del portafolio (en papel)', term: 'arv', valor: m.valorPortafolio ? M(m.valorPortafolio) : null, falta: m.valorPortafolio ? null : 'sin ARVs cargados', sub: `Σ ARV de las ${m.propias.length} casas propias`, fuente: 'Airtable', drill: { titulo: `ARV por casa (${m.propias.length} propias)`, html: drillValor } })}
        ${kpi({ label: 'Deuda del portafolio', valor: m.deudaQbo != null ? M(m.deudaQbo) : null, falta: m.deudaQbo == null ? 'sin espejo QBO' : null, sub: `HML ${M(m.deudaHmlQbo)} + refi ${M(m.deudaRefiQbo)}`, fuente: 'QBO', drill: { titulo: 'Deuda reconciliada', html: drillDeuda } })}
        ${kpi({ label: 'Equity generado', term: 'equity', valor: m.equity != null ? M(m.equity) : null, falta: m.equity == null ? 'necesita valor y deuda' : null, sub: 'valor − deuda', estado: (m.equity || 0) >= 0 ? 'ok' : 'neg', fuente: 'OS' })}
        ${kpi({ label: 'Capital desplegado', valor: M(m.capital), sub: 'equity comprometido por inversionistas', fuente: 'Airtable' })}
      </div>`);
  }

  // S5 · PROYECCIÓN
  function anProyCalc(m, tasa) {
    const base = m.valorPortafolio || 0;
    const refiDeuda = m.deudaRefiQbo || 0, hmlDeuda = m.deudaHmlQbo || 0;
    const rAnual = (+FF.cfg?.dscr_tasa_anual || 7.125) / 100, nTot = 360, rMes = rAnual / 12;
    const saldoRefi = anios => { // saldo restante de la deuda DSCR (amortización 30a); HML interés-solo = constante
      const k = anios * 12; if (!refiDeuda) return 0;
      return refiDeuda * (Math.pow(1 + rMes, nTot) - Math.pow(1 + rMes, k)) / (Math.pow(1 + rMes, nTot) - 1);
    };
    return [5, 10, 15, 20].map(a => {
      const valor = base * Math.pow(1 + tasa / 100, a);
      const deuda = hmlDeuda + saldoRefi(a);
      return { a, valor, deuda, equity: valor - deuda };
    });
  }
  function anProyBody(m) {
    const tasa = AN.tasa;
    const rows = anProyCalc(m, tasa);
    return `<div class="an-wrap"><table class="an-t"><tr><th>Horizonte</th><th class="r">Valor del portafolio</th><th class="r">Deuda proyectada</th><th class="r">EQUITY proyectado</th></tr>
      <tr><td>Hoy</td><td class="r">${M(m.valorPortafolio)}</td><td class="r">${M(m.deudaQbo)}</td><td class="r an-pos">${M(m.equity)}</td></tr>
      ${rows.map(r => `<tr><td>${r.a} años</td><td class="r">${M(r.valor)}</td><td class="r">${M(r.deuda)}</td><td class="r an-pos"><b>${M(r.equity)}</b></td></tr>`).join('')}</table></div>
      <div class="an-note">📐 <b>Proyección, no hecho</b> — supuesto ${tasa}%/año compuesto sobre el ARV de hoy. El equity crece más rápido que el valor: apreciación + amortización de la deuda DSCR (${(+FF.cfg?.dscr_tasa_anual || 7.125)}% · 30 años); el HML se asume constante (interés-solo) — conservador: cada refi lo convierte en deuda que amortiza.</div>`;
  }
  function anS5(m) {
    if (!m.valorPortafolio) return sec('5 · Proyección de valorización', 'Configurable.', kitEmpty ? kitEmpty('📐', 'Sin ARVs cargados no hay base para proyectar.') : '');
    return sec('5 · Proyección de valorización', 'A 5/10/15/20 años, con la tasa que vos elijas — rotulado como supuesto, no como hecho.', `
      <div class="an-slider">Apreciación anual: <input type="range" min="2" max="6" step="0.25" value="${AN.tasa}" oninput="anProySet(this.value)"> <b id="an-tasa-lbl" style="min-width:52px">${AN.tasa}%/año</b> <span class="an-mut">(default ${(+FF.cfg?.an_apreciacion_pct || 4)}% Austin — editable en ff_uw_config.an_apreciacion_pct)</span></div>
      <div id="an-proy-body">${anProyBody(m)}</div>
      <div class="an-chart"><canvas id="an-proy"></canvas></div>`);
  }

  // S6 · VELOCIDAD / EFICIENCIA
  function anS6(m) {
    const drillObras = `<div class="an-wrap"><table class="an-t"><tr><th>Casa</th><th class="r">Días de obra</th></tr>${m.obras.slice().sort((a, b) => b.dias - a.dias).map(o => `<tr><td>${ESC(o.casa)}</td><td class="r">${o.dias}d</td></tr>`).join('')}</table></div><div class="an-note">Titular = calibración oficial (v_supuestos_calibrados, capa KPI). Crudo: ff_hml_loans.fecha_inicio_rehab → fecha_fin_rehab ("Datos por casa") = ${m.promObra != null ? Math.round(m.promObra) + 'd · n=' + m.obras.length : 'sin fechas'}.</div>`;
    const supDias = AN.sup && !AN.sup._vacio ? +AN.sup.obra_dias_prom : null;
    const drillRefiDias = m.hastaRefi.length ? `<table class="an-t"><tr><th>Casa</th><th class="r">Fin rehab → 1ª cuota refi</th></tr>${m.hastaRefi.map(o => `<tr><td>${ESC(o.casa)}</td><td class="r">${o.dias}d</td></tr>`).join('')}</table>` : '<div class="an-note">Sin refis con fecha de fin de rehab + primera cuota ref30.</div>';
    return sec('6 · Velocidad y eficiencia', 'Cuánto tarda cada fase y qué tan disciplinada es la ejecución.', `
      <div class="an-grid">
        ${kpi({ label: 'Días promedio de obra', valor: supDias != null ? supDias + 'd' : (m.promObra != null ? Math.round(m.promObra) + 'd' : null), falta: (supDias == null && m.promObra == null) ? 'sin fechas de rehab' : null, sub: supDias != null ? `${AN.sup.obra_meses_prom} meses (calibración oficial) · crudo Datos por casa: ${m.promObra != null ? Math.round(m.promObra) + 'd · n=' + m.obras.length + ' ✓ valida' : '—'}` : `${m.promObra != null ? (m.promObra / 30.44).toFixed(1) + ' meses · n=' + m.obras.length : ''}`, fuente: 'OS', drill: { titulo: 'Obra por casa', html: drillObras } })}
        ${kpi({ label: 'Días hasta refinanciar', valor: m.promHastaRefi != null ? Math.round(m.promHastaRefi) + 'd' : null, falta: m.promHastaRefi == null ? 'sin refis con fechas' : null, sub: `fin de rehab → 1ª cuota DSCR · n=${m.hastaRefi.length}`, fuente: 'Airtable', drill: { titulo: 'Hasta refi por casa', html: drillRefiDias } })}
        ${kpi({ label: '% en presupuesto', valor: m.conPresu.length ? PCT(m.presuOk.length / m.conPresu.length * 100, 0) : null, falta: m.conPresu.length ? null : 'sin presupuestos comparables', sub: `${m.presuOk.length}/${m.conPresu.length} casas sin alerta de sobrecosto`, fuente: 'OS' })}
        ${kpi({ label: '% a tiempo (vs plazo HML)', valor: m.aTiempo.length ? PCT(m.aTiempoOk.length / m.aTiempo.length * 100, 0) : null, falta: m.aTiempo.length ? null : 'sin fechas comparables', sub: `${m.aTiempoOk.length}/${m.aTiempo.length} terminaron la obra antes del vencimiento del HML`, fuente: 'Airtable' })}
      </div>`);
  }

  // S7 · SALUD / RIESGO
  function anS7(m) {
    // 7.1 pipeline de refi
    const filas = m.pipeline.map(p => {
      const semaforo = p.gap == null ? `<span class="an-amb">🟡 faltan datos (${p.arv ? 'saldo HML' : 'ARV'})</span>`
        : p.lista ? '<span class="an-pos">🟢 lista para refi</span>'
        : `<span class="an-neg">🔴 falta ${M(-p.gap)} de valor</span>`;
      const next = p.gap == null ? 'completar datos en Airtable' : p.lista ? 'pedir cotización DSCR ya' : `re-tasar o esperar apreciación (${M(-p.gap)})`;
      return `<tr><td>${ESC(p.casa)}</td><td class="r">${typeof noZeroAsReal === 'function' ? noZeroAsReal(p.arv) : M(p.arv)}</td><td class="r">${typeof noZeroAsReal === 'function' ? noZeroAsReal(p.saldo) : M(p.saldo)}</td><td class="r">${M(p.tope)}</td><td>${semaforo}</td><td class="an-mut">→ ${next}</td></tr>`;
    }).join('');
    const listas = m.pipeline.filter(p => p.lista);
    const pipelineHtml = `<div class="an-wrap"><table class="an-t"><tr><th>Casa</th><th class="r">ARV</th><th class="r">Saldo HML</th><th class="r">Tope ${m.ltvPct}%×ARV</th><th>Semáforo</th><th>Próximo paso</th></tr>${filas || '<tr><td colspan="6" class="an-mut">No queda ninguna casa rentada en HML 🎉</td></tr>'}</table></div>`;

    // 7.2 concentración
    const concHtml = `<div class="an-wrap"><table class="an-t"><tr><th>Inversionista</th><th class="r">Capital</th><th class="r">Casas</th><th style="width:40%">% del capital de co-inversión (${M(m.coTotal)})</th></tr>
      ${m.conc.slice(0, 10).map(c => `<tr><td>${ESC(c.name)}</td><td class="r">${M(c.capital)}</td><td class="r">${c.nDeals}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="an-bar ${c.share > m.umbralConc ? 'rojo' : ''}" style="flex:1"><i style="width:${Math.min(100, c.share)}%"></i></div><b class="${c.share > m.umbralConc ? 'an-neg' : ''}" style="font-size:11px;min-width:44px;text-align:right">${PCT(c.share)}</b></div></td></tr>`).join('')}</table></div>`;
    const concentrados = m.conc.filter(c => c.share > m.umbralConc);

    // 7.3 salud de cartera
    const b = (key, icon, label, arr, cls) => `<div class="an-bucket ${AN.saludOpen === key ? 'on' : ''}" onclick="anSaludToggle('${key}')"><div class="n ${cls}">${icon} ${arr.length}</div><div class="l">${label}</div></div>`;
    const abierto = AN.saludOpen && m.salud[AN.saludOpen] ? `<div class="an-wrap" style="margin-top:10px"><table class="an-t"><tr><th>Casa</th><th class="r">Flujo/mes post-deuda</th></tr>
      ${m.salud[AN.saludOpen].map(x => `<tr><td>${ESC(casaCorta(x.d.address))} <span class="an-mut">· ${ESC(x.d.stage)}</span></td><td class="r ${x.flujo == null ? 'an-amb' : x.flujo >= 0 ? 'an-pos' : 'an-neg'}">${x.flujo == null ? (AN.saludOpen === 'noAplica' ? 'sin flujo aún (obra/por empezar)' : 'sin renta cargada') : M(x.flujo)}</td></tr>`).join('')}</table></div>` : '';

    return sec('7 · Salud y riesgo', 'Las tres alarmas elegidas: refi pendiente (la sangría), concentración de capital, y casas en déficit.', `
      <div style="font-weight:700;font-size:12.5px;color:var(--ink);margin:8px 0 4px">7.1 · Pipeline de refinanciación — ${listas.length} de ${m.pipeline.length} listas ${typeof kitBadge === 'function' ? kitBadge(`ahorro potencial: cada refi baja el carry del 12% interés-solo`, listas.length ? 'ok' : 'warn') : ''}</div>
      ${pipelineHtml}
      ${typeof kitNext === 'function' ? kitNext(`${m.pipeline.length} casas rentadas siguen pagando HML al 12% interés-solo — esta lista ES el plan para dar vuelta el flujo post-deuda (${M(m.postDeudaMes * 12)}/año)`, listas.length ? `Arrancar la refi de ${listas.slice(0, 3).map(p => p.casa).join(', ')}${listas.length > 3 ? ` (+${listas.length - 3} más)` : ''}` : 'Re-tasar las casas con ARV corto y completar datos faltantes', 'Nico') : ''}
      <div style="font-weight:700;font-size:12.5px;color:var(--ink);margin:18px 0 4px">7.2 · Concentración por inversionista ${concentrados.length ? `<span class="an-neg">— ⚠ ${concentrados.map(c => ESC(c.name.split('(')[0].trim()) + ' ' + PCT(c.share)).join(', ')} supera el umbral ${m.umbralConc}%</span>` : `<span class="an-pos">— ninguno supera el ${m.umbralConc}%</span>`}</div>
      ${concHtml}
      ${concentrados.length && typeof kitNext === 'function' ? kitNext(`Si ${ESC(concentrados[0].name.split('(')[0].trim())} sale, se va el ${PCT(concentrados[0].share)} del capital de co-inversión`, 'Diversificar los próximos deals con inversionistas nuevos o menores', 'Nico') : ''}
      <div style="font-weight:700;font-size:12.5px;color:var(--ink);margin:18px 0 4px">7.3 · Salud de cartera <span class="an-mut" style="font-weight:400">(flujo mensual post-deuda por casa — déficit corregido, jamás desde draws vacíos; clic en un grupo p/ ver las casas)</span></div>
      <div class="an-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        ${b('sanas', '🟢', 'Sanas (flujo ≥ 0)', m.salud.sanas, 'an-pos')}
        ${b('deficit', '🔴', 'En déficit', m.salud.deficit, 'an-neg')}
        ${b('sinDatos', '🟡', 'Sin datos de renta', m.salud.sinDatos, 'an-amb')}
        ${b('noAplica', '🏗', 'Aún sin flujo (obra)', m.salud.noAplica, 'an-mut')}
      </div>
      ${abierto}`);
  }

  // ════════════════ CHARTS (regla dura: wrapper fijo + overflow:hidden + destroy) ════════════════
  function anMountCharts(m) {
    if (!window.Chart) return;
    const mk = (id, cfg) => {
      const el = document.getElementById(id); if (!el) return;
      try { const ex = Chart.getChart && Chart.getChart(el); if (ex) ex.destroy(); } catch (e) {}
      cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, resizeDelay: 200 }, cfg.options || {});
      (FF._charts = FF._charts || []).push(new Chart(el, cfg));
    };
    const mut = getComputedStyle(document.getElementById('ff-overlay') || document.body).getPropertyValue('--mut').trim() || '#64748b';
    const grid = 'rgba(128,140,160,.15)';
    const meses = Object.keys(m.porMes).sort().slice(-14);
    mk('an-ritmo', { type: 'bar', data: { labels: meses, datasets: [{ data: meses.map(k => m.porMes[k]), backgroundColor: 'rgba(47,110,240,.55)', borderRadius: 4 }] },
      options: { plugins: { legend: { display: false }, title: { display: true, text: 'Casas cerradas por mes', color: mut, font: { size: 11 } } }, scales: { x: { grid: { display: false }, ticks: { color: mut, font: { size: 9 } } }, y: { grid: { color: grid }, ticks: { color: mut, precision: 0 } } } } });
    const proy = anProyCalc(m, AN.tasa);
    const labels = ['Hoy', ...proy.map(r => r.a + 'a')];
    mk('an-proy', { type: 'line', data: { labels, datasets: [
      { label: 'Valor', data: [m.valorPortafolio, ...proy.map(r => r.valor)], borderColor: '#2f6ef0', backgroundColor: 'rgba(47,110,240,.08)', fill: true, tension: .3 },
      { label: 'Equity', data: [m.equity, ...proy.map(r => r.equity)], borderColor: '#12b5a0', backgroundColor: 'rgba(18,181,160,.10)', fill: true, tension: .3 },
    ] }, options: { plugins: { legend: { labels: { color: mut, font: { size: 10 } } }, title: { display: true, text: `Proyección al ${AN.tasa}%/año (supuesto)`, color: mut, font: { size: 11 } } }, scales: { x: { grid: { display: false }, ticks: { color: mut } }, y: { grid: { color: grid }, ticks: { color: mut, callback: v => '$' + (v / 1e6).toFixed(1) + 'M' } } } } });
  }

  // ════════════════ INTERACCIONES ════════════════
  window.anProySet = function (v) {
    AN.tasa = +v;
    const m = anModel(window.__anComp || {});
    const body = document.getElementById('an-proy-body'); if (body) body.innerHTML = anProyBody(m);
    const lbl = document.getElementById('an-tasa-lbl'); if (lbl) lbl.textContent = AN.tasa + '%/año';
    anMountCharts(m);
  };
  window.anSaludToggle = function (k) { AN.saludOpen = AN.saludOpen === k ? null : k; if (window.ffRender) ffRender(); };

  // ════════════════ VISTA ════════════════
  window.ffAnaliticaView = function (comp) {
    anCSS();
    window.__anComp = comp;
    if (AN.tasa == null) AN.tasa = +FF.cfg?.an_apreciacion_pct || 4;
    // v_supuestos_calibrados (validación de la calibración de obra) — lazy, 1 vez
    if (!AN.sup && !AN.supLoading && typeof sb !== 'undefined') {
      AN.supLoading = true;
      sb.from('v_supuestos_calibrados').select('*').maybeSingle().then(({ data }) => { AN.sup = data || { _vacio: true }; if (FF.section === 'analitica' && window.ffRender) ffRender(); });
    }
    const m = anModel(comp);
    setTimeout(() => anMountCharts(m), 60);
    const head = (typeof ffHeader === 'function') ? ffHeader('Analítica', 'KPIs que importan', 'Volumen · rentabilidad realizada · renta · patrimonio · proyección · velocidad · riesgo — todo con "de dónde sale" (⌕) y próximo paso') : '';
    const acciones = `<div class="no-print" style="display:flex;gap:8px;margin:4px 0 6px;flex-wrap:wrap">
      <button class="chip" onclick="window.print()">🖨 PDF</button>
      ${typeof ffExportExcelFF === 'function' ? '<button class="chip" onclick="ffExportExcelFF()">⬇ Excel</button>' : ''}
      ${typeof ffCopyResumenFF === 'function' ? '<button class="chip" onclick="ffCopyResumenFF()">📋 Copiar resumen</button>' : ''}
    </div>`;
    return head + acciones + anS1(m) + anS2(m) + anS3(m) + anS4(m) + anS5(m) + anS6(m) + anS7(m);
  };
})();
