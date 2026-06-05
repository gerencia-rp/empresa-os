// Versión TypeScript de lib/deal-rules.js para uso en edge functions.
// Mantiene paridad con la versión cliente — cualquier cambio de fórmula
// debe propagarse a ambas.

export const DEAL_DEFAULTS = {
  arvDiscountPct: 70,
  profitMinPct: 12,
  holdingCostsPctMonth: 1.5,
  holdingMonthsDefault: 6,
  closingBuyerPct: 3,
  closingSellerPct: 8,
  brrrrLtvPct: 75
};

export interface MaoOpts {
  arv: number;
  rehab: number;
  arvDiscountPct?: number;
  profitPct?: number;
  holdingMonths?: number;
  holdingCostsPctMonth?: number;
  closingBuyerPct?: number;
  closingSellerPct?: number;
}

export interface MaoResult {
  mao: number;
  breakdown: {
    arv: number;
    arvDiscount: number;
    rehab: number;
    profit: number;
    holding: number;
    closingBuyer: number;
    closingSeller: number;
    totalCosts: number;
  };
}

export function mao(opts: MaoOpts): MaoResult {
  const arv = +opts.arv || 0;
  const rehab = +opts.rehab || 0;
  const pct = (+(opts.arvDiscountPct ?? DEAL_DEFAULTS.arvDiscountPct)) / 100;
  const profitPct = (+(opts.profitPct ?? DEAL_DEFAULTS.profitMinPct)) / 100;
  const holdMonths = +(opts.holdingMonths ?? DEAL_DEFAULTS.holdingMonthsDefault);
  const holdPctMonth = (+(opts.holdingCostsPctMonth ?? DEAL_DEFAULTS.holdingCostsPctMonth)) / 100;
  const closingBuyerPct = (+(opts.closingBuyerPct ?? DEAL_DEFAULTS.closingBuyerPct)) / 100;
  const closingSellerPct = (+(opts.closingSellerPct ?? DEAL_DEFAULTS.closingSellerPct)) / 100;

  const arvDiscount = arv * (1 - pct);
  const profit = arv * profitPct;
  const holding = arv * holdPctMonth * holdMonths;
  const closingBuyer = arv * closingBuyerPct;
  const closingSeller = arv * closingSellerPct;
  const totalCosts = rehab + profit + holding + closingBuyer + closingSeller;
  const result = (arv * pct) - rehab - profit - holding - closingBuyer - closingSeller;

  return {
    mao: Math.max(0, result),
    breakdown: { arv, arvDiscount, rehab, profit, holding, closingBuyer, closingSeller, totalCosts }
  };
}

export interface BrrrrCheckOpts {
  purchasePrice: number;
  rehab: number;
  arv: number;
  brrrrLtvPct?: number;
  refiClosingPct?: number;
  holdingTotal?: number;
}

export interface BrrrrCheckResult {
  passes: boolean;
  perfect: boolean;
  allInBasis: number;
  refiLoan: number;
  cashOut: number;
  cashLeftIn: number;
  ltvRequired: number | null;
}

export function brrrrCheck(opts: BrrrrCheckOpts): BrrrrCheckResult {
  const purchase = +opts.purchasePrice || 0;
  const rehab = +opts.rehab || 0;
  const arv = +opts.arv || 0;
  const ltvPct = (+(opts.brrrrLtvPct ?? DEAL_DEFAULTS.brrrrLtvPct)) / 100;
  const refiClosingPct = (+(opts.refiClosingPct ?? 4)) / 100;
  const holdingTotal = +(opts.holdingTotal || 0);

  const allInBasis = purchase + rehab + holdingTotal;
  const refiLoan = arv * ltvPct;
  const refiClosing = refiLoan * refiClosingPct;
  const cashOut = refiLoan - refiClosing - holdingTotal;
  const cashLeftIn = allInBasis - cashOut;

  return {
    passes: cashLeftIn <= 0,
    perfect: Math.abs(cashLeftIn) < 500,
    allInBasis,
    refiLoan,
    cashOut,
    cashLeftIn,
    ltvRequired: arv > 0 ? Math.ceil((allInBasis + refiClosing) / arv * 100) : null
  };
}
