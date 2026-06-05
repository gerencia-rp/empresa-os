// ════════════════════════════════════════════════════════════
// 📐 deal-rules.js — Fuente única para fórmulas de Fix & Flip
// Consumido por: loan-calculator.js · property-analyzer.js ·
// estimator.js · edge functions (deep-property-analysis).
//
// Antes cada calculadora tenía su propia versión de MAO/BRRRR check,
// con pequeñas inconsistencias que generaban decisiones contradictorias
// entre el cliente y el servidor. Ahora todo viene de acá.
// ════════════════════════════════════════════════════════════

(function() {
  const DealRules = {};

  // ─── Constantes default (sobreescribibles desde UI) ───
  DealRules.DEFAULTS = {
    arvDiscountPct: 70,        // Regla 70%: MAO = ARV * 0.70 - rehab
    profitMinPct: 12,          // % ARV de profit mínimo en deal saludable
    holdingCostsPctMonth: 1.5, // % ARV/mes (taxes + insurance + utilities + interest reserve heurístico)
    holdingMonthsDefault: 6,   // meses de hold típico para Fix & Flip
    closingBuyerPct: 3,        // % ARV
    closingSellerPct: 8,       // % ARV (comisiones agentes + taxes + title)
    brrrrLtvPct: 75            // LTV del DSCR refi
  };

  // ─── usd(n) ───
  // Si window.usd existe (ui-toolkit), lo usa. Sino, fallback inline.
  DealRules.usd = function(n) {
    if (typeof window !== 'undefined' && window.usd) return window.usd(n);
    const v = Number(n) || 0;
    return '$' + Math.round(v).toLocaleString('en-US');
  };

  // ─── Maximum Allowable Offer (MAO) ───
  // Fórmula estándar del flipper: MAO = ARV * pct - rehab - holding - closing - profit
  // Devuelve { mao, breakdown } para mostrar TODOS los componentes (no solo el número).
  DealRules.mao = function(opts) {
    const arv = +opts.arv || 0;
    const rehab = +opts.rehab || 0;
    const pct = (+opts.arvDiscountPct || DealRules.DEFAULTS.arvDiscountPct) / 100;
    const profitPct = (+opts.profitPct || DealRules.DEFAULTS.profitMinPct) / 100;
    const holdMonths = +opts.holdingMonths || DealRules.DEFAULTS.holdingMonthsDefault;
    const holdPctMonth = (+opts.holdingCostsPctMonth || DealRules.DEFAULTS.holdingCostsPctMonth) / 100;
    const closingBuyerPct = (+opts.closingBuyerPct || DealRules.DEFAULTS.closingBuyerPct) / 100;
    const closingSellerPct = (+opts.closingSellerPct || DealRules.DEFAULTS.closingSellerPct) / 100;

    const arvDiscount = arv * (1 - pct);                 // "descuento" (margen vs ARV)
    const profit = arv * profitPct;
    const holding = arv * holdPctMonth * holdMonths;
    const closingBuyer = arv * closingBuyerPct;
    const closingSeller = arv * closingSellerPct;
    const totalCostsExceptPrice = rehab + profit + holding + closingBuyer + closingSeller;
    const mao = (arv * pct) - rehab - profit - holding - closingBuyer - closingSeller;

    return {
      mao: Math.max(0, mao),
      breakdown: {
        arv,
        arvDiscount,      // arv * (1-pct)
        rehab,
        profit,
        holding,
        closingBuyer,
        closingSeller,
        totalCosts: totalCostsExceptPrice
      }
    };
  };

  // ─── BRRRR check ───
  // Regla: el refi convencional debe recuperar TODO el cash invested.
  // Devuelve { passes, ltvRequired, cashLeftIn, allInBasis }
  DealRules.brrrrCheck = function(opts) {
    const purchase = +opts.purchasePrice || 0;
    const rehab = +opts.rehab || 0;
    const arv = +opts.arv || 0;
    const ltvPct = (+opts.brrrrLtvPct || DealRules.DEFAULTS.brrrrLtvPct) / 100;
    const refiClosingPct = (+opts.refiClosingPct || 4) / 100;
    const holdingTotal = +opts.holdingTotal || 0;

    const allInBasis = purchase + rehab + holdingTotal;
    const refiLoan = arv * ltvPct;
    const refiClosing = refiLoan * refiClosingPct;
    const cashOut = refiLoan - refiClosing - holdingTotal;
    const cashLeftIn = allInBasis - cashOut;

    return {
      passes: cashLeftIn <= 0,        // BRRRR "perfecto" = 0 cash left in
      perfect: Math.abs(cashLeftIn) < 500,
      allInBasis,
      refiLoan,
      cashOut,
      cashLeftIn,
      ltvRequired: arv > 0 ? Math.ceil((allInBasis + refiClosing) / arv * 100) : null
    };
  };

  // ─── Cap Rate ───
  // Estándar: NOI / Price. NOI = gross - vacancy - operating - taxes - insurance (NO debt, NO capex reserve).
  DealRules.capRate = function(opts) {
    const annualNOI = +opts.annualNOI || 0;
    const price = +opts.arv || +opts.price || 0;
    return price > 0 ? (annualNOI / price) * 100 : null;
  };

  // ─── Cash-on-cash return ───
  DealRules.cocReturn = function(opts) {
    const annualCashflow = +opts.annualCashflow || 0;
    const cashInvested = +opts.cashInvested || 0;
    return cashInvested > 0 ? (annualCashflow / cashInvested) * 100 : null;
  };

  // ─── 70% Rule (quick check) ───
  // Si el deal pasa el "70% rule": MAO simple = ARV * 0.70 - rehab.
  DealRules.rule70 = function(arv, rehab, askPrice) {
    const mao = (+arv || 0) * 0.70 - (+rehab || 0);
    return {
      mao,
      passes: (+askPrice || 0) <= mao,
      margin: mao - (+askPrice || 0)
    };
  };

  // ─── Health score del deal ───
  // 0-100 según margen MAO, profit estimado, ratio price/ARV.
  DealRules.dealHealth = function(opts) {
    const r = DealRules.mao(opts);
    const askPrice = +opts.askPrice || 0;
    const arv = +opts.arv || 0;
    if (!askPrice || !arv) return null;
    const marginVsMao = r.mao - askPrice;
    const priceToArv = askPrice / arv;
    let score = 100;
    if (marginVsMao < 0) score -= Math.min(50, Math.abs(marginVsMao / arv) * 100);
    if (priceToArv > 0.75) score -= (priceToArv - 0.75) * 200;
    if (priceToArv > 0.85) score -= 20;
    return {
      score: Math.max(0, Math.round(score)),
      mao: r.mao,
      marginVsMao,
      priceToArvPct: Math.round(priceToArv * 100),
      passes70Rule: askPrice <= (arv * 0.70 - (+opts.rehab || 0))
    };
  };

  // Exponer global (compatible con browser + edge functions Deno via importScripts si se quiere)
  if (typeof window !== 'undefined') window.DealRules = DealRules;
  if (typeof globalThis !== 'undefined') globalThis.DealRules = DealRules;
})();
