// ═══ ARV ENGINE · motor puro de valuación (UMD: browser + node) ═══
// UNA sola matemática para la UI (Simple y Experto) y el BACK-TEST contra tasaciones reales.
// Principios (directiva ARV certero, 13-jul):
//   · comps con criterio de tasador (filtros duros + outliers estadísticos fuera)
//   · ajustes paired-sales estilo 1004 (JAMÁS $/sqft promedio × sqft)
//   · ARV = MEDIANA PONDERADA de los comps ajustados (similitud × recencia × cercanía)
//   · confianza MEDIDA (CV/n/recencia/distancia) + rango real P25–P75
//   · backtest()/calibrar(): MdAPE y sesgo contra "Valuación por el Appraisal" (Airtable)
// Sin window/UW/sb: todo entra por parámetros. cfg = objeto plano (keys arv_* de ff_uw_config).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ArvEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const N = v => { const x = parseFloat(v); return isNaN(x) ? null : x; };
  const cfgN = (cfg, k, def) => (cfg && cfg[k] != null && !isNaN(+cfg[k])) ? +cfg[k] : def;
  const mesesDesde = (fecha, hoy) => {
    if (!fecha) return null;
    const t = new Date(fecha).getTime(); if (isNaN(t)) return null;
    const ref = hoy ? new Date(hoy).getTime() : Date.now();
    return (ref - t) / (30.44 * 86400000);
  };
  const mediana = arr => {
    if (!arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  // cuantil ponderado (q en [0,1]) sobre [{v,w}]
  const cuantilPond = (items, q) => {
    if (!items.length) return null;
    const s = items.slice().sort((a, b) => a.v - b.v);
    const tot = s.reduce((x, i) => x + i.w, 0);
    let acc = 0;
    for (const i of s) { acc += i.w; if (acc >= tot * q) return i.v; }
    return s[s.length - 1].v;
  };
  const glaPsf = (cfg, zip) => (zip != null && cfg && cfg['arv_adj_gla_psf_' + zip] != null && !isNaN(+cfg['arv_adj_gla_psf_' + zip]))
    ? +cfg['arv_adj_gla_psf_' + zip] : cfgN(cfg, 'arv_adj_gla_psf', 90);

  // D-020: solo cierres vendidos y arms-length entran al ARV. Un listing Active/Pending es
  // temperatura; Inactive/removed NO prueba una venta y queda fuera hasta verificarla.
  const normToken = v => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  function clasificaComp(c) {
    const status = normToken(c && (c.statusCanonical || c.status));
    const saleType = normToken(c && (c.saleType || c.sale_type || c.transactionType));
    const temperatura = status === 'active' || status === 'pending';
    const sold = status === 'sold' || status === 'closed' || status === 'closed_sale';
    const armsLength = saleType === 'arms_length' || saleType === 'armslength';
    const elegibleArv = sold && armsLength && +c.price > 0 && !!(c.closeDate || c.close_date || c.fecha);
    let razon = null;
    if (!elegibleArv) {
      if (temperatura) razon = 'temperatura de mercado: listing ' + status + ', nunca entra al ARV';
      else if (!sold) razon = status === 'inactive' ? 'inactive/removed no demuestra venta cerrada' : 'sin venta cerrada verificada';
      else if (!armsLength) razon = saleType ? 'venta no arms-length (' + saleType + ')' : 'arms-length sin verificar';
      else razon = 'venta sin precio o fecha de cierre verificable';
    }
    return { status, saleType, temperatura, sold, armsLength, elegibleArv, razon };
  }

  // ─── filtros duros del tasador (defaults directiva: ≤1 mi · ≤6 meses · sqft ±15% · camas ±1 · mismo tipo) ───
  function filtros(cfg, over) {
    const o = over || {};
    return {
      dist: o.dist != null ? +o.dist : cfgN(cfg, 'arv_filtro_dist_mi', 1.0),
      meses: o.meses != null ? +o.meses : cfgN(cfg, 'arv_filtro_meses', 6),
      sqftPct: o.sqftPct != null ? +o.sqftPct : cfgN(cfg, 'arv_filtro_sqft_pct', 15),
      camas: o.camas != null ? +o.camas : cfgN(cfg, 'arv_filtro_camas', 1),
      banos: o.banos != null ? +o.banos : cfgN(cfg, 'arv_filtro_banos', 1.5),
      ano: o.ano != null ? +o.ano : cfgN(cfg, 'arv_filtro_ano', 20),
      tipo: o.tipo != null ? !!o.tipo : cfgN(cfg, 'arv_filtro_tipo', 1) === 1,
    };
  }
  function pasaFiltro(s, c, f, hoy) {
    const razones = [];
    if (c.dist != null && c.dist > f.dist) razones.push('a ' + c.dist.toFixed(2) + ' mi (>' + f.dist + ')');
    const m = mesesDesde(c.fecha, hoy);
    if (m != null && m > f.meses) razones.push('venta hace ' + Math.round(m) + 'm (>' + f.meses + ')');
    if (s.sqft && c.sqft && Math.abs(c.sqft - s.sqft) / s.sqft * 100 > f.sqftPct) razones.push('sqft ±' + Math.round(Math.abs(c.sqft - s.sqft) / s.sqft * 100) + '% (>' + f.sqftPct + '%)');
    if (s.beds != null && c.beds != null && Math.abs(c.beds - s.beds) > f.camas) razones.push('camas Δ' + Math.abs(c.beds - s.beds));
    if (s.baths != null && c.baths != null && Math.abs(c.baths - s.baths) > f.banos) razones.push('baños Δ' + Math.abs(c.baths - s.baths));
    if (s.year && c.year && Math.abs(c.year - s.year) > f.ano) razones.push('año Δ' + Math.abs(c.year - s.year));
    if (f.tipo && s.tipo && c.tipo && String(s.tipo) !== String(c.tipo)) razones.push('tipo ' + c.tipo + ' ≠ ' + s.tipo);
    if (s.pool === true && c.pool === false) razones.push('sin piscina (subject tiene)');   // solo si AMBOS son dato
    return { pasa: razones.length === 0, razones };
  }

  // ─── ajustes 1004 (ajusto el COMP hacia el subject; + = el subject vale más) ───
  function ajustes(s, c, cfg, man, hoy) {
    man = man || {};
    const rows = [];
    const add = (cat, concepto, monto, fuente) => { if (monto) rows.push({ cat, concepto, monto: Math.round(monto), fuente }); };
    const psf = glaPsf(cfg, s.zip);
    if (s.sqft && c.sqft) add('gla', 'GLA ' + (s.sqft - c.sqft > 0 ? '+' : '') + Math.round(s.sqft - c.sqft) + ' sqft × $' + psf, (s.sqft - c.sqft) * psf, 'auto');
    if (s.beds != null && c.beds != null && s.beds !== c.beds) add('cuartos', 'Cuartos Δ' + (s.beds - c.beds), (s.beds - c.beds) * cfgN(cfg, 'arv_adj_cuarto', 15000), 'auto');
    if (s.baths != null && c.baths != null && s.baths !== c.baths) add('banos', 'Baños Δ' + (s.baths - c.baths), (s.baths - c.baths) * cfgN(cfg, 'arv_adj_bano', 15000), 'auto');
    if (s.year && c.year && s.year !== c.year) add('ano', 'Año Δ' + (s.year - c.year), (s.year - c.year) * (cfgN(cfg, 'arv_adj_ano_pct', 0.5) / 100) * c.price, 'auto');
    if (s.lot && c.lot && Math.abs(s.lot - c.lot) > 500) add('lote', 'Lote Δ' + Math.round(s.lot - c.lot) + ' sqft', (s.lot - c.lot) * cfgN(cfg, 'arv_adj_lote_psf', 2), 'auto');
    if (s.pool != null && c.pool != null && s.pool !== c.pool) add('piscina', s.pool ? 'Piscina (subject sí)' : 'Piscina (comp sí)', (s.pool ? 1 : -1) * cfgN(cfg, 'arv_adj_piscina', 25000), 'auto');
    if (s.garage != null && c.garage != null && s.garage !== c.garage) add('garaje', s.garage ? 'Garaje (subject sí)' : 'Garaje (comp sí)', (s.garage ? 1 : -1) * cfgN(cfg, 'arv_adj_garaje', 20000), 'auto');
    const m = mesesDesde(c.fecha, hoy);
    const tend = cfgN(cfg, 'arv_mercado_pct_mes', 0);
    if (m != null && tend) add('tend', 'Tendencia mercado ' + Math.round(m) + 'm × ' + tend + '%/m', m * (tend / 100) * c.price, 'auto');
    add('man', 'Condición/reno (manual)', N(man.cond) || 0, 'manual');
    add('man', 'Ubicación/submercado (manual)', N(man.ubic) || 0, 'manual');
    add('man', 'Concesiones vendedor (manual)', -(N(man.conces) || 0), 'manual');
    add('man', 'Otros (manual)', N(man.otros) || 0, 'manual');
    const neto = rows.reduce((x, r) => x + r.monto, 0);
    const bruto = rows.reduce((x, r) => x + Math.abs(r.monto), 0);
    return { rows, neto, bruto, valorAjustado: Math.round(c.price + neto), netPct: c.price ? neto / c.price * 100 : 0, grossPct: c.price ? bruto / c.price * 100 : 0 };
  }

  // ─── saneo del subject: dato de UNA fuente implausible = DUDOSO (null + flag), jamás usado en silencio ───
  // (caso Cervin/Dove/Childress: el condado dice 1-3 camas en casas convertidas → mata los comps)
  function saneaSubject(s) {
    const out = Object.assign({}, s), dudosos = [];
    if (out.beds != null && out.beds <= 1 && out.sqft >= 1000) { dudosos.push({ attr: 'beds', lbl: 'camas', v: out.beds, motivo: out.beds + ' cama(s) con ' + out.sqft + ' sqft — dato del condado dudoso' }); out.beds = null; }
    if (out.baths != null && out.baths < 1) { dudosos.push({ attr: 'baths', lbl: 'baños', v: out.baths, motivo: 'menos de 1 baño — dato dudoso' }); out.baths = null; }
    if (out.sqft != null && out.sqft < 400) { dudosos.push({ attr: 'sqft', lbl: 'sqft', v: out.sqft, motivo: 'sqft irreal' }); out.sqft = null; }
    return { s: out, dudosos };
  }

  // ─── reconciliación: MEDIANA PONDERADA de comps ajustados · outliers MAD fuera · confianza medida ───
  // opts: { man: {compId:{...}}, excl: {compId:true}, filtrosOver, hoy (ISO p/ backtest) }
  // Si <minN comps: EXPANSIÓN ADAPTATIVA del tasador (6→9→12 meses · +0.5 mi) declarada y con confianza capada.
  function reconciliar(s, comps, cfg, opts) {
    opts = opts || {};
    const clasificados = (comps || []).map(c => ({ c, elegibilidad: clasificaComp(c) }));
    const temperatura = clasificados.filter(x => x.elegibilidad.temperatura).map(x => x.c);
    const noElegibles = clasificados.filter(x => !x.elegibilidad.elegibleArv).map(x => ({ c: x.c, razon: x.elegibilidad.razon }));
    const ventasElegibles = clasificados.filter(x => x.elegibilidad.elegibleArv).map(x => x.c);
    const f0 = filtros(cfg, opts.filtrosOver);
    const maxN = cfgN(cfg, 'arv_comps_max', 8), minN = cfgN(cfg, 'arv_comps_min', 3);
    const grossWarn = cfgN(cfg, 'arv_gross_adj_warn_pct', 25);
    const escalones = [f0,
      Object.assign({}, f0, { meses: f0.meses * 1.5 }),
      Object.assign({}, f0, { meses: f0.meses * 2, dist: f0.dist + 0.5 }),
      Object.assign({}, f0, { meses: f0.meses * 2, dist: f0.dist + 0.5, sqftPct: f0.sqftPct + 10 })];
    let f = f0, relajado = 0, usables = [];
    for (let e = 0; e < escalones.length; e++) {
      f = escalones[e]; relajado = e;
      usables = ventasElegibles.map(c => ({ c, filtro: pasaFiltro(s, c, f, opts.hoy), adj: ajustes(s, c, cfg, (opts.man || {})[c.id], opts.hoy) }))
        .filter(x => x.filtro.pasa && !(opts.excl || {})[x.c.id])
        .sort((a, b) => a.adj.grossPct - b.adj.grossPct)
        .slice(0, maxN);
      if (usables.length >= minN) break;
    }
    // outliers estadísticos: valor ajustado a > k×MAD de la mediana → fuera (con razón visible)
    const outliers = [];
    if (usables.length >= 4) {
      const med = mediana(usables.map(x => x.adj.valorAjustado));
      const mad = mediana(usables.map(x => Math.abs(x.adj.valorAjustado - med))) || 1;
      const k = cfgN(cfg, 'arv_outlier_mad_k', 2.5);
      usables = usables.filter(x => {
        const z = Math.abs(x.adj.valorAjustado - med) / (1.4826 * mad);
        if (z > k && usables.length - outliers.length > minN) { x.outlier = z; outliers.push(x); return false; }
        return true;
      });
    }
    if (!usables.length) return { usables, outliers, temperatura, noElegibles, ventasElegibles, arv: null, provisional: false, relajado,
      confianza: { nivel: 'sin comps', score: 0, razones: [ventasElegibles.length ? 'ninguna venta arms-length verificada pasa filtros (ni con búsqueda expandida)' : 'no hay ventas cerradas arms-length verificadas; activos/inactivos no entran al ARV'] } };
    // pesos: similitud (menor gross adj) × recencia × cercanía
    usables.forEach(x => {
      const wSim = 1 / (x.adj.grossPct + 2);
      const m = mesesDesde(x.c.fecha, opts.hoy);
      const wRec = 1 / (1 + (m != null ? m : f.meses) / 6);
      const wDist = 1 / (1 + (x.c.dist != null ? x.c.dist : f.dist));
      x.peso = wSim * wRec * wDist;
    });
    const sw = usables.reduce((x, u) => x + u.peso, 0);
    usables.forEach(x => x.pesoPct = Math.round(100 * x.peso / sw));
    const items = usables.map(x => ({ v: x.adj.valorAjustado, w: x.peso }));
    // sesgo calibrado: global + submercado (arv_bias_pct_<zip>, calibrado con n≥2 tasaciones reales del zip)
    const zipBias = (s.zip != null && cfg && cfg['arv_bias_pct_' + s.zip] != null && !isNaN(+cfg['arv_bias_pct_' + s.zip])) ? +cfg['arv_bias_pct_' + s.zip] : 0;
    const bias = cfgN(cfg, 'arv_bias_pct', 0) + zipBias;
    const arv = Math.round(cuantilPond(items, 0.5) * (1 + bias / 100));
    const p25 = Math.round(cuantilPond(items, 0.25) * (1 + bias / 100));
    const p75 = Math.round(cuantilPond(items, 0.75) * (1 + bias / 100));
    // confianza MEDIDA: CV de los ajustados + n + recencia media + distancia media
    const vals = usables.map(x => x.adj.valorAjustado);
    const prom = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, v) => a + (v - prom) * (v - prom), 0) / vals.length);
    const cv = prom ? sd / prom * 100 : 0;
    const mProm = usables.reduce((a, x) => { const m = mesesDesde(x.c.fecha, opts.hoy); return a + (m != null ? m : f.meses); }, 0) / usables.length;
    const dProm = usables.reduce((a, x) => a + (x.c.dist || 0), 0) / usables.length;
    const grossProm = usables.reduce((a, u) => a + u.adj.grossPct, 0) / usables.length;
    const cvWarn = cfgN(cfg, 'arv_cv_warn_pct', 10), cvAlto = cfgN(cfg, 'arv_cv_alto_pct', 15);
    let score = 100;
    score -= Math.min(40, cv * 3);                                  // dispersión pega fuerte
    score -= Math.max(0, (minN + 1 - usables.length)) * 15;         // pocos comps
    score -= Math.min(15, Math.max(0, mProm - 3) * 3);              // viejos
    score -= Math.min(15, dProm * 10);                              // lejos
    score -= Math.min(15, Math.max(0, grossProm - 15));             // muy ajustados
    score = Math.max(0, Math.round(score));
    if (relajado) score = Math.max(0, score - relajado * 8);        // búsqueda expandida = menos confianza
    let nivel = (cv > cvAlto || usables.length < minN) ? 'baja' : (cv > cvWarn || usables.length < minN + 1 || grossProm > grossWarn) ? 'media' : 'alta';
    if (relajado >= 2 && nivel === 'alta') nivel = 'media';
    const razones = [usables.length + ' comps reconciliados (mediana ponderada)', 'CV ' + cv.toFixed(1) + '%', 'gross adj prom ' + grossProm.toFixed(1) + '%',
      'venta media hace ' + mProm.toFixed(1) + 'm', 'a ' + dProm.toFixed(2) + ' mi prom'];
    if (relajado) razones.push('búsqueda expandida (escalón ' + relajado + ': ' + Math.round(f.meses) + 'm / ' + f.dist + ' mi) por pocos comps');
    if (outliers.length) razones.push(outliers.length + ' outlier(s) estadístico(s) excluido(s)');
    if (bias) razones.push('sesgo calibrado ' + (Math.round(bias * 100) / 100) + '%' + (zipBias ? ' (incluye submercado ' + s.zip + ': ' + zipBias + '%)' : ''));
    if (usables.length < minN) razones.push('menos de ' + minN + ' comps válidos');
    return { usables, outliers, temperatura, noElegibles, ventasElegibles, arv, p25, p75, cv, score, grossProm, dispersion: cv, distProm: dProm, mesesProm: mProm, bias, relajado, filtrosUsados: f,
      conservador: p25, optimista: p75, confianza: { nivel, score, razones } };
  }

  // Respaldo decidido por Nicolás (25-ago-2026): si faltan cierres verificables,
  // el AVM de RentCast entrega el ARV. Sigue siendo una señal separada, no una
  // mediana fabricada con listings activos/inactivos.
  function conFallbackRentcast(rec, avm) {
    if (rec && rec.arv > 0) return rec;
    const value = +(avm && (avm.value || avm.price));
    if (!(value > 0)) return rec;
    const low = +(avm.priceRangeLow || avm.rangeLow) || Math.round(value * 0.92);
    const high = +(avm.priceRangeHigh || avm.rangeHigh) || Math.round(value * 1.08);
    return Object.assign({}, rec || {}, {
      arv: Math.round(value), conservador: Math.round(low), optimista: Math.round(high),
      p25: Math.round(low), p75: Math.round(high), fuenteArv: 'rentcast_avm', provisional: true,
      confianza: { nivel: 'estimado', score: 55, razones: ['ARV automático de respaldo: estimado AVM de RentCast; no equivale a una mediana de ventas cerradas verificadas'] },
    });
  }

  function conFallbackLocal(rec, fallback) {
    if (rec && rec.arv > 0) return rec;
    const value = +(fallback && fallback.value);
    if (!(value > 0)) return rec;
    const pct = +(fallback.rangePct) > 0 ? +(fallback.rangePct) : 8;
    return Object.assign({}, rec || {}, {
      arv: Math.round(value), conservador: Math.round(value * (1 - pct / 100)), optimista: Math.round(value * (1 + pct / 100)),
      p25: Math.round(value * (1 - pct / 100)), p75: Math.round(value * (1 + pct / 100)),
      fuenteArv: fallback.source || 'estimacion_local', provisional: true,
      confianza: { nivel: 'estimado', score: +(fallback.score) || 35, razones: [fallback.reason || 'ARV estimado con los datos internos disponibles'] },
    });
  }

  // ─── conflictos del subject: ≥2 fuentes por atributo; discrepancia = NO usar en silencio ───
  // fuentes = [{nombre:'RentCast', beds:3, sqft:1970,…}, {nombre:'Airtable', sqft:2040}, …] · manual = st.subj
  function conflictos(fuentes, manual) {
    manual = manual || {};
    const attrs = [['beds', 'camas', 0], ['baths', 'baños', 0.5], ['sqft', 'sqft', 0.05], ['year', 'año', 2]];
    const out = [];
    attrs.forEach(([k, lbl, tol]) => {
      if (manual[k] != null && manual[k] !== '') return;            // confirmado/override por humano → sin conflicto
      const con = fuentes.filter(f => f[k] != null).map(f => ({ fuente: f.nombre, v: +f[k] }));
      if (con.length < 2) { if (con.length === 1 && (k === 'beds' || k === 'sqft')) out.push({ attr: k, lbl, tipo: 'una_fuente', valores: con }); return; }
      const vs = con.map(x => x.v);
      const difiere = tol < 1 ? (Math.max(...vs) - Math.min(...vs)) / Math.max(...vs) > tol : Math.max(...vs) - Math.min(...vs) > tol;
      if (tol === 0 ? Math.max(...vs) !== Math.min(...vs) : difiere) out.push({ attr: k, lbl, tipo: 'conflicto', valores: con });
    });
    return out;
  }

  // ─── triangulación: comps | AVM | assessed×factor | appraisal previa — divergencia >umbral = ⚠ con razón ───
  function triangular(senales, cfg, conflictosSubject) {
    const s = senales.filter(x => x.valor > 0);
    if (s.length < 2) return { senales: s, divergenciaPct: null, warn: false, razones: [] };
    const vals = s.map(x => x.valor);
    const med = mediana(vals);
    const divergenciaPct = med ? (Math.max(...vals) - Math.min(...vals)) / med * 100 : null;
    const umbral = cfgN(cfg, 'arv_triang_warn_pct', 8);
    const warn = divergenciaPct != null && divergenciaPct > umbral;
    const razones = [];
    if (warn) {
      const hi = s.find(x => x.valor === Math.max(...vals)), lo = s.find(x => x.valor === Math.min(...vals));
      razones.push(hi.nombre + ' ' + Math.round(hi.valor / 1000) + 'k vs ' + lo.nombre + ' ' + Math.round(lo.valor / 1000) + 'k (Δ' + divergenciaPct.toFixed(1) + '%)');
      (conflictosSubject || []).forEach(c => {
        if (c.tipo === 'conflicto') razones.push('probable causa: ' + c.lbl + ' en conflicto (' + c.valores.map(v => v.v + ' ' + v.fuente).join(' vs ') + ') — revisá el dato del subject');
        if (c.tipo === 'una_fuente') razones.push('dato de ' + c.lbl + ' con UNA sola fuente (' + c.valores[0].fuente + ') — confirmalo');
      });
      if (!(conflictosSubject || []).length) razones.push('subject confirmado — puede ser mix de comps o zona; revisá los comps excluidos');
    }
    return { senales: s, divergenciaPct, warn, umbral, razones };
  }

  // ─── BACK-TEST: MdAPE + sesgo contra la tasación/venta REAL ───
  // casas = [{casa, subject, comps, real, hoy?}] · real = "Valuación por el Appraisal" o precio de venta
  function backtest(casas, cfg) {
    const porCasa = casas.map(x => {
      const rec = reconciliar(x.subject, x.comps, cfg, { hoy: x.hoy });
      const pred = rec.arv;
      const err = (pred != null && x.real > 0) ? (pred - x.real) / x.real * 100 : null;
      return { casa: x.casa, pred, real: x.real, errPct: err, n: rec.usables.length, cv: rec.cv, nivel: rec.confianza && rec.confianza.nivel };
    });
    const ok = porCasa.filter(x => x.errPct != null);
    return {
      porCasa,
      n: ok.length,
      mdape: ok.length ? mediana(ok.map(x => Math.abs(x.errPct))) : null,
      mape: ok.length ? ok.reduce((a, x) => a + Math.abs(x.errPct), 0) / ok.length : null,
      sesgo: ok.length ? ok.reduce((a, x) => a + x.errPct, 0) / ok.length : null,
      sesgoMediano: ok.length ? mediana(ok.map(x => x.errPct)) : null,
    };
  }

  // ─── CALIBRACIÓN: búsqueda por coordenadas sobre los parámetros (minimiza MdAPE, luego |sesgo|) ───
  function calibrar(casas, cfgBase, opts) {
    opts = opts || {};
    const espacio = opts.espacio || {
      arv_adj_gla_psf: [50, 60, 70, 80, 90, 100, 110, 120],
      arv_adj_cuarto: [8000, 10000, 12500, 15000, 20000],
      arv_adj_bano: [7500, 10000, 12500, 15000],
      arv_adj_ano_pct: [0.2, 0.35, 0.5, 0.75],
      arv_mercado_pct_mes: [-0.5, -0.25, 0, 0.25, 0.5],
      arv_adj_lote_psf: [0.5, 1, 2, 3],
      arv_outlier_mad_k: [2, 2.5, 3],
    };
    let mejor = Object.assign({}, cfgBase);
    delete mejor.arv_bias_pct; mejor.arv_bias_pct = 0;              // el bias se calibra AL FINAL (cierra el sesgo)
    let bt = backtest(casas, mejor);
    let mejorScore = bt.mdape == null ? Infinity : bt.mdape;
    const pasadas = opts.pasadas || 3;
    let probados = 1;
    for (let p = 0; p < pasadas; p++) {
      for (const key of Object.keys(espacio)) {
        for (const v of espacio[key]) {
          if (mejor[key] === v) continue;
          const cand = Object.assign({}, mejor); cand[key] = v;
          const r = backtest(casas, cand); probados++;
          const sc = r.mdape == null ? Infinity : r.mdape;
          if (sc < mejorScore - 0.01) { mejor = cand; mejorScore = sc; }
        }
      }
    }
    // 2) sesgo por SUBMERCADO (zip con ≥ minZipN tasaciones reales): bias_zip = −mediana del error del zip
    const minZipN = (opts.zipMinN != null ? opts.zipMinN : 2);
    const btZip = backtest(casas, mejor);
    const porZip = {};
    btZip.porCasa.forEach((x, i) => { const z = casas[i].subject && casas[i].subject.zip; if (z && x.errPct != null) (porZip[z] = porZip[z] || []).push(x.errPct); });
    const zipsCal = [];
    Object.entries(porZip).forEach(([z, errs]) => {
      if (errs.length >= minZipN) {
        const b = Math.max(-12, Math.min(12, -mediana(errs)));
        if (Math.abs(b) >= 1) { mejor['arv_bias_pct_' + z] = Math.round(b * 100) / 100; zipsCal.push({ zip: z, n: errs.length, bias: mejor['arv_bias_pct_' + z] }); }
      }
    });
    // 3) sesgo GLOBAL: grid fino que minimiza MdAPE SUJETO a |sesgo medio| ≤ metaSesgo (si es alcanzable)
    const metaSesgo = (opts.metaSesgo != null ? opts.metaSesgo : 2) - 0.2;   // margen
    let mejorBias = 0, mejorFin = null;
    for (let b = -6; b <= 6.001; b += 0.25) {
      const cand = Object.assign({}, mejor); cand.arv_bias_pct = Math.round(b * 100) / 100;
      const r = backtest(casas, cand);
      if (r.mdape == null) continue;
      const cumple = Math.abs(r.sesgo) <= metaSesgo;
      const mejorCumple = mejorFin && Math.abs(mejorFin.sesgo) <= metaSesgo;
      const gana = !mejorFin || (cumple && !mejorCumple) || (cumple === mejorCumple && (cumple ? r.mdape < mejorFin.mdape : Math.abs(r.sesgo) < Math.abs(mejorFin.sesgo)));
      if (gana) { mejorBias = cand.arv_bias_pct; mejorFin = r; }
    }
    mejor.arv_bias_pct = mejorBias;
    const final = backtest(casas, mejor);
    return { params: mejor, antes: backtest(casas, cfgBase), despues: final, probados, zipsCal };
  }

  return { filtros, pasaFiltro, ajustes, clasificaComp, reconciliar, conFallbackRentcast, conFallbackLocal, saneaSubject, conflictos, triangular, backtest, calibrar, _mediana: mediana, _cuantilPond: cuantilPond, mesesDesde };
});
