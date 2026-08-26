// ═══ LUXURY DEAL STUDIO · M5 ═══
// Laboratorio premium tier-aware. No consulta fuentes: consume la Ficha 360 ya cargada
// y el motor contractual de Underwriting. Portable a Bóveda Plus vía el contrato LDS_SHAPE.
(function (root) {
  'use strict';

  const money = n => n == null || Number.isNaN(+n) ? '—' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(+n)).toLocaleString('en-US');
  const pct = n => n == null || Number.isNaN(+n) ? '—' : (Math.round(+n * 10) / 10) + '%';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => Number.isFinite(+v) ? +v : 0;

  const LDS_SHAPE = Object.freeze({
    version: '1.0',
    reads: ['property_id', 'ficha360', 'underwriting.inputs', 'underwriting.outputs', 'evidence'],
    produces: ['tier', 'executive_summary', 'gates', 'risk_register', 'capital_plan', 'exit_plan', 'promotion_payload'],
    gates: ['identity', 'arv_evidence', 'budget_contingency', 'capital', 'absorption', 'contract_parity'],
    privacy: 'promotion_payload excludes internal names, raw documents and Rental Profitss operational data'
  });

  function tierFor(arv, cfg) {
    const luxuryFloor = num(cfg && cfg.luxury_arv_floor) || 1000000;
    const premiumFloor = num(cfg && cfg.premium_arv_floor) || 650000;
    return arv >= luxuryFloor ? 'luxury' : arv >= premiumFloor ? 'premium' : 'standard';
  }

  function ficha360FromUw(UW, output) {
    const a = UW && UW.a;
    if (!a) return null;
    const p360 = (UW.p360 || []).find(x => x.property_id && x.property_id === a.property_id) || {};
    const inp = a.inputs || {};
    const arv = output && output.arv || {};
    const source = arv.fuente || arv.source || (arv.esAirtable ? 'ARV existente del deal' : arv.fallbackSource || 'motor contractual');
    return {
      property_id: a.property_id || p360.property_id || null,
      canonical_property_key: a.canonical_property_key || null,
      address: a.direccion || p360.address || a.nombre,
      stage: p360.etapa || null,
      purchase: num(inp.purchase || p360.compra),
      rehab_real: num(p360.rehab_real),
      appraisal: num(inp.appraisal),
      contingency_pct: num(inp.contingencia_pct),
      arv: num(arv.probable),
      arv_evidence: {
        source,
        verification_status: arv.verification_status || (arv.esAirtable ? 'sin_verificar' : 'calculado'),
        confidence: arv.confianza || 'declarada por el motor',
        as_of: arv.as_of || new Date().toISOString().slice(0, 10)
      },
      planner_progress: p360.avance_planner == null ? null : num(p360.avance_planner),
      internal_owner: p360.lider || null,
      interest_hml_accumulated: num(p360.interes_hml_acumulado)
    };
  }

  function buildStudio(ficha, output, cfg) {
    if (!ficha || !output) return null;
    const u = output.unificada || {};
    const v = output.venta || {};
    const n = output.negocio || {};
    const c = output.cashout || {};
    const i = output.intereses || {};
    const arv = num(ficha.arv);
    const tier = tierFor(arv, cfg);
    const isLuxury = tier === 'luxury';
    const holdMonths = num(v.meses || n.mesesHold);
    const contingencyPct = num(ficha.contingency_pct);
    const minContingency = isLuxury ? 15 : tier === 'premium' ? 12 : 10;
    const maxAbsorption = isLuxury ? 12 : tier === 'premium' ? 9 : 7;
    const gates = [
      { key: 'identity', label: 'Identidad de propiedad', pass: !!ficha.property_id, detail: ficha.property_id ? 'property_id conectado' : 'Falta conectar property_id' },
      { key: 'arv_evidence', label: 'ARV con evidencia', pass: arv > 0 && !!ficha.arv_evidence.source, detail: arv > 0 ? ficha.arv_evidence.source + ' · ' + ficha.arv_evidence.confidence : 'Falta ARV contractual' },
      { key: 'budget_contingency', label: 'Contingencia por franja', pass: contingencyPct >= minContingency, detail: contingencyPct + '% cargado · mínimo recomendado ' + minContingency + '%' },
      { key: 'capital', label: 'Capital y retorno', pass: num(v.utilidad) > 0 && num(v.capital) > 0, detail: 'utilidad ' + money(v.utilidad) + ' · capital ' + money(v.capital) },
      { key: 'absorption', label: 'Absorción / salida', pass: holdMonths > 0 && holdMonths <= maxAbsorption, detail: holdMonths ? holdMonths + ' meses · máximo de control ' + maxAbsorption : 'Falta plazo de salida' },
      { key: 'contract_parity', label: 'Motor contractual', pass: !!u.veredicto, detail: u.veredicto ? 'veredicto ' + u.veredicto : 'Sin resultado del motor' }
    ];
    const failed = gates.filter(g => !g.pass);
    const risks = [];
    if (contingencyPct < minContingency) risks.push({ level: 'high', title: 'Contingencia insuficiente', action: 'Subir contingencia a ' + minContingency + '% o justificar por alcance cerrado.' });
    if (holdMonths > maxAbsorption) risks.push({ level: 'high', title: 'Salida prolongada', action: 'Preparar reducción de precio, staging y presupuesto de carry.' });
    if (num(v.margen) < (isLuxury ? 10 : 8)) risks.push({ level: 'medium', title: 'Margen sensible', action: 'Revisar precio, concesiones y costos de venta en escenario conservador.' });
    if (!risks.length) risks.push({ level: 'low', title: 'Sin alertas críticas', action: 'Validar documentos y ejecutar due diligence antes de comprometer capital.' });
    return {
      version: LDS_SHAPE.version,
      property_id: ficha.property_id,
      tier,
      status: failed.length ? 'review' : 'ready',
      executive_summary: {
        verdict: u.veredicto || 'revisar', arv, all_in: num(u.allIn), all_in_pct: u.allInPct,
        utility: num(v.utilidad), roi_pct: v.roi, irr_raw_pct: v.irrRawPct == null ? v.roiAnual : v.irrRawPct,
        irr_display_pct: v.irrDisplayPct == null ? v.roiAnual : v.irrDisplayPct,
        irr_is_capped: !!v.irrIsCapped
      },
      gates,
      risk_register: risks,
      capital_plan: { cash_to_close: num(n.cashToClose), hml_payoff: num(n.payoffHml), refi_loan: num(c.prestamo), cash_out: num(c.cashOut), dscr_payment: num(i.pagoDscr) },
      exit_plan: { strategy: u.modo || 'venta', months: holdMonths, net_wire: num(v.netWire), investor_share: num(v.parteInv), operator_share: num(v.parteOp) },
      evidence: ficha.arv_evidence,
      promotion_payload: {
        schema_version: 'lds-1', property_ref: ficha.canonical_property_key || ficha.property_id,
        tier, inputs: { purchase: ficha.purchase, appraisal: ficha.appraisal, arv },
        outputs: { ...u, irr_raw_pct: v.irrRawPct == null ? v.roiAnual : v.irrRawPct, irr_display_pct: v.irrDisplayPct == null ? v.roiAnual : v.irrDisplayPct, irr_is_capped: !!v.irrIsCapped },
        evidence: ficha.arv_evidence, gates: gates.map(({ key, pass }) => ({ key, pass }))
      }
    };
  }

  function render() {
    if (!root.UW || !root.UW.a || typeof root.ffUwComputeAll !== 'function') return '<div class="card">Elegí una propiedad para abrir Luxury Deal Studio.</div>';
    const out = root.ffUwComputeAll();
    const ficha = ficha360FromUw(root.UW, out);
    const studio = buildStudio(ficha, out, root.UW.cfg || {});
    root.UW.luxuryStudio = studio;
    const kpi = (l, v, sub) => '<div class="card kpi" style="padding:16px"><div class="lab">' + l + '</div><div class="big">' + v + '</div><div class="meta">' + sub + '</div></div>';
    const gate = g => '<div style="display:grid;grid-template-columns:18px 1fr auto;gap:9px;align-items:center;padding:10px 0;border-top:1px solid var(--line,rgba(255,255,255,.08))"><span style="color:' + (g.pass ? 'var(--pos,#4ade9e)' : 'var(--amber,#fbbf24)') + '">' + (g.pass ? '●' : '◆') + '</span><div><b>' + esc(g.label) + '</b><div class="meta">' + esc(g.detail) + '</div></div><b style="font-size:10px;text-transform:uppercase;color:' + (g.pass ? 'var(--pos,#4ade9e)' : 'var(--amber,#fbbf24)') + '">' + (g.pass ? 'listo' : 'revisar') + '</b></div>';
    const risk = r => '<div style="padding:11px 12px;border-radius:10px;background:color-mix(in srgb,' + (r.level === 'high' ? 'var(--neg,#ff6b6b)' : r.level === 'medium' ? 'var(--amber,#fbbf24)' : 'var(--pos,#4ade9e)') + ' 8%,transparent);margin-top:8px"><b>' + esc(r.title) + '</b><div class="meta" style="margin-top:3px">' + esc(r.action) + '</div></div>';
    return '<div style="max-width:1100px;margin:0 auto">'
      + '<div style="display:flex;justify-content:space-between;gap:16px;align-items:end;flex-wrap:wrap;margin-bottom:16px"><div><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--a1,#5c79f0)">M5 · Luxury Deal Studio</div><h2 style="font-size:28px;margin:4px 0">Sala de decisión del deal</h2><div class="meta">Ficha 360 → motor contractual → riesgo, capital y salida. Lujo primero; reglas parametrizadas por franja.</div></div><div class="badge ' + (studio.status === 'ready' ? 'b-ok' : 'b-warn') + '">' + studio.tier.toUpperCase() + ' · ' + (studio.status === 'ready' ? 'LISTO PARA DUE DILIGENCE' : 'REQUIERE REVISIÓN') + '</div></div>'
      + '<div class="grid k4">' + kpi('ARV', money(studio.executive_summary.arv), esc(studio.evidence.source) + ' · ' + esc(studio.evidence.confidence)) + kpi('All-in', money(studio.executive_summary.all_in), pct(studio.executive_summary.all_in_pct) + ' del ARV') + kpi('Utilidad', money(studio.executive_summary.utility), 'ROI ' + pct(studio.executive_summary.roi_pct)) + kpi('IRR', pct(studio.executive_summary.irr_display_pct), studio.executive_summary.irr_is_capped ? 'display capado · raw ' + pct(studio.executive_summary.irr_raw_pct) : 'raw = display') + '</div>'
      + '<div class="grid k2" style="margin-top:16px;align-items:start"><div class="card" style="padding:18px"><div class="cardh">Gates de inversión <span class="tg">' + studio.gates.filter(g => g.pass).length + '/' + studio.gates.length + '</span></div>' + studio.gates.map(gate).join('') + '</div><div class="card" style="padding:18px"><div class="cardh">Registro de riesgos</div>' + studio.risk_register.map(risk).join('') + '</div></div>'
      + '<div class="grid k2" style="margin-top:16px"><div class="card" style="padding:18px"><div class="cardh">Plan de capital</div>' + [['Cash to close',studio.capital_plan.cash_to_close],['Payoff HML',studio.capital_plan.hml_payoff],['Préstamo refi',studio.capital_plan.refi_loan],['Cash-out',studio.capital_plan.cash_out]].map(x => '<div class="drow"><span class="dt">' + x[0] + '</span><b>' + money(x[1]) + '</b></div>').join('') + '</div><div class="card" style="padding:18px"><div class="cardh">Salida</div><div class="drow"><span class="dt">Estrategia</span><b>' + esc(studio.exit_plan.strategy) + '</b></div><div class="drow"><span class="dt">Plazo</span><b>' + studio.exit_plan.months + ' meses</b></div><div class="drow"><span class="dt">Net wire</span><b>' + money(studio.exit_plan.net_wire) + '</b></div><div class="meta" style="margin-top:10px">La promoción a Bóveda Plus usa un payload anonimizado; no incluye responsables, documentos ni datos operativos internos.</div></div></div>'
      + '</div>';
  }

  root.LuxuryDealStudio = { shape: LDS_SHAPE, tierFor, ficha360FromUw, buildStudio, render };
  root.ffLuxuryDealStudioView = render;
  if (typeof module !== 'undefined' && module.exports) module.exports = { shape: LDS_SHAPE, tierFor, buildStudio };
})(typeof window !== 'undefined' ? window : globalThis);
