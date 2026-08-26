// C2 · Golden cases contractuales compartibles Empresa OS ⇄ La Bóveda.
// Sin argumentos imprime la corrida autoritativa. Con --verify compara contra el fixture congelado.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ArvEngine = require('../pm/ff-arv-engine.js');
const uwSrc = readFileSync(path.join(import.meta.dirname, '..', 'pm', 'ff-underwriting.js'), 'utf8');
global.window = {};
global.osIcon = () => '';
// eslint-disable-next-line no-eval
eval(uwSrc + '\n;globalThis.__goldenUw = { UW, ffUwComputeFor };');
const { UW, ffUwComputeFor } = globalThis.__goldenUw;

UW.cfg = {
  allin_max_pct: 75, harmony_tasa_anual: 12, dscr_tasa_anual: 7.125, dscr_plazo_anos: 30,
  refi_ltv_pct: 75, refi_dscr_objetivo: 1.2, refi_tax_pct: 2.1, refi_seguro_anual: 1900,
  refi_fee_underwriting: 1495, refi_fee_processing: 695, refi_originacion_pct: 0,
  refi_titulo_base: 2100, refi_titulo_pct: 0, refi_dias_prepagado: 17,
  refi_impound_seguro_meses: 3, refi_impound_imp_meses: 3,
  impuestos_pct_arv: 2.2, seguro_mensual: 120, pm_fee_pct: 8, vacancy_pct: 5,
  mantenimiento_pct: 5, arv_adj_gla_psf: 70, arv_adj_cuarto: 8000, arv_adj_bano: 12500,
  arv_adj_ano_pct: 0.35, arv_adj_lote_psf: 3, arv_mercado_pct_mes: 0,
  arv_outlier_mad_k: 3, arv_bias_pct: 0,
};
UW.cfgTxt = {};

const subject = { sqft: 1800, beds: 3, baths: 2, year: 1995, lot: 7200, zip: '78745', tipo: 'Single Family' };
const sold = (id, price, closeDate, over = {}) => ({ id, dir: id, price, closeDate, fecha: closeDate, status: 'sold', saleType: 'arms_length', dist: .4, sqft: 1800, beds: 3, baths: 2, year: 1995, lot: 7200, tipo: 'Single Family', ...over });
const compsStandard = [
  sold('GC-S-01', 445000, '2026-07-10'),
  sold('GC-S-02', 450000, '2026-06-28', { sqft: 1850 }),
  sold('GC-S-03', 455000, '2026-06-15', { sqft: 1750 }),
  sold('GC-S-04', 460000, '2026-05-30', { dist: .7, year: 1998 }),
  sold('GC-S-05', 900000, '2026-07-01', { status: 'active' }),
];

function arvFrom(comps, subjectOverride = subject) {
  const rec = ArvEngine.reconciliar(subjectOverride, comps, UW.cfg, { hoy: new Date('2026-08-25T00:00:00Z'), minN: 3 });
  if (!(rec.arv > 0)) throw new Error('Fixture sin ARV verificable');
  return rec;
}

const common = {
  usar_estimador: false, est_sqft: 1800, arv_airtable: 0, appraisal: 0,
  meses_obra: 4, meses_renta: 1, utilities_mes: 300, insurance_mes: 150, hoa_mes: 0,
  muebles: 0, appraisal_cost: 650, contingencia_pct: 10, contingencia_fija: 0,
  permisos: 2500, dumpster: 1200, ac: 0, cashout_en_draw: 0,
  hml_pct_compra: 90, hml_pct_remo: 100, hml_tasa_anual: 12, hml_capitaliza: 0,
  cc_origination_pct: 1.5, cc_documentation: 1495, cc_draw_fee: 500, cc_underwriting: 995,
  cc_prepaid_interest: 0, cc_title: 1800, cc_escrow: 700, cc_recording: 250,
  cc_ucc: 0, cc_courier: 75, cc_guaranty: 0, cc_assignment: 0, wholesale: false,
  earnest: 2500, option_fee: 250, prorata_impuestos: 0,
  ltv_pct: 75, refi_dscr_obj: 1.2, refi_orig_pct: 0, refi_uw_fee: 1495,
  refi_proc_fee: 695, refi_titulo: 2100, refi_titulo_pct: 0, refi_dias_prepagado: 17,
  refi_seguro_anual: 1900, refi_imp_seguro_m: 3, refi_imp_imp_m: 3, refi_tax_pct: 2.1,
  refi_otros: 0, refi_prestamo_real: 0, payoff: 0,
  venta_comision_pct: 6, venta_cierre_pct: 1.5, venta_concesiones_pct: 0,
  venta_split_inv_pct: 50, venta_impuesto_pct: 0, venta_payoff: 0,
};

const r2 = n => n == null ? null : Math.round(n * 100) / 100;
const annualized = (profit, capital, months) => capital > 0 && months > 0 && capital + profit > 0
  ? (Math.pow((capital + profit) / capital, 12 / months) - 1) * 100 : null;

function normalize(id, description, priceTier, inputs, rec) {
  const out = ffUwComputeFor(structuredClone({ ...inputs, arv: rec.arv }));
  const u = out.unificada;
  const capital = out.venta.capital;
  const profit = out.venta.utilidad;
  const irrRaw = inputs.estrategia === 'venta' ? annualized(profit, capital, out.venta.meses) : null;
  const cap = 999;
  const expected = {
    arv: rec.arv,
    mao: u.mao,
    all_in: r2(u.allIn),
    gate_pass: !!u.gAllIn,
    utilidad: inputs.estrategia === 'venta' ? profit : null,
    cash_invested: r2(inputs.estrategia === 'venta' ? capital : u.cashLeftIn),
    roi_pct: r2(inputs.estrategia === 'venta' ? out.venta.roi : u.roi),
    moic: inputs.estrategia === 'venta' && capital > 0 ? r2((capital + profit) / capital) : null,
    pct_sobre_all_in: inputs.estrategia === 'venta' && u.allIn > 0 ? r2(profit / u.allIn * 100) : null,
    irr_raw_pct: r2(irrRaw),
    irr_display_pct: r2(irrRaw == null ? null : Math.min(cap, irrRaw)),
    irr_is_capped: irrRaw != null ? irrRaw > cap : false,
    dscr: inputs.estrategia === 'hold' && out.intereses.pitiTotal > 0 ? r2(inputs.renta_mensual / out.intereses.pitiTotal) : null,
    cap_rate: inputs.estrategia === 'hold' && rec.arv > 0 ? r2((inputs.renta_mensual - out.ingreso.pmFee - out.ingreso.vacancy - out.ingreso.mantenimiento - out.ingreso.impuestos - out.ingreso.seguro - out.ingreso.hoa) * 12 / rec.arv * 100) : null,
    monthly_cashflow: inputs.estrategia === 'hold' ? r2(out.ingreso.flujo) : null,
    cash_on_cash_anual: inputs.estrategia === 'hold' ? r2(out.ingreso.cashOnCash) : null,
    equity_recuperado_refi: inputs.estrategia === 'hold' ? r2(out.cashout.cashOut) : null,
  };
  return { id, description, canonical_property_key: 'fixture:v1:' + id.toLowerCase(), strategy: inputs.estrategia === 'venta' ? 'flip' : 'hold/brrrr', price_tier: priceTier,
    assumptions: { as_of: '2026-08-25', irr_display_cap_pct: cap, cash_invested_formula: inputs.estrategia === 'venta' ? 'venta_capital override; fallback cash_to_close' : 'max(0, cash_to_close - max(0, cash_out))' },
    arv_evidence: { eligible_ids: rec.usables.map(x => x.c.id), temperature_ids: rec.temperatura.map(x => x.id) }, inputs, expected };
}

const recStd = arvFrom(compsStandard);
const cases = [
  normalize('GC-001', 'Flip estándar reproducible', 'standard', { ...common, estrategia: 'venta', purchase: 235000, remod_directo: 85000, venta_meses: 6, venta_staging: 3500, venta_capital: 65000, renta_mensual: 0 }, recStd),
  normalize('GC-002', 'Hold BRRRR limitado por DSCR', 'standard', { ...common, estrategia: 'hold', purchase: 220000, remod_directo: 80000, renta_mensual: 3200, meses_renta: 2 }, recStd),
  normalize('GC-003', 'Flip de lujo con absorción y marketing prolongados', 'luxury', { ...common, estrategia: 'venta', purchase: 780000, remod_directo: 310000, est_sqft: 3500, venta_meses: 11, venta_staging: 28000, venta_capital: 260000, utilities_mes: 900, insurance_mes: 650, permisos: 18000, dumpster: 4500, contingencia_pct: 18, venta_comision_pct: 5, venta_cierre_pct: 2, venta_concesiones_pct: 1 },
    arvFrom(compsStandard.map((c, i) => ({ ...c, id: c.id.replace('S', 'L'), price: c.status === 'active' ? 2100000 : 1480000 + i * 25000, sqft: 3500, beds: 5, baths: 4, year: 2018, lot: 14000 })),
      { ...subject, sqft: 3500, beds: 5, baths: 4, year: 2018, lot: 14000 })),
];

const frozenExpected = {
  'GC-001': { arv: 446500, mao: 231853, all_in: 338022, gate_pass: false, utilidad: 62254.98, cash_invested: 65000, roi_pct: 95.78, moic: 1.96, pct_sobre_all_in: 18.42, irr_raw_pct: 283.29, irr_display_pct: 283.29, irr_is_capped: false, dscr: null, cap_rate: null, monthly_cashflow: null, cash_on_cash_anual: null, equity_recuperado_refi: null },
  'GC-002': { arv: 446500, mao: 234204, all_in: 320671, gate_pass: true, utilidad: null, cash_invested: 29782.70, roi_pct: -1.7, moic: null, pct_sobre_all_in: null, irr_raw_pct: null, irr_display_pct: null, irr_is_capped: false, dscr: 1.2, cap_rate: 4.53, monthly_cashflow: -42, cash_on_cash_anual: -1.7, equity_recuperado_refi: -77417.27 },
  'GC-003': { arv: 1505000, mao: 755575, all_in: 1153175, gate_pass: false, utilidad: 95944.24, cash_invested: 260000, roi_pct: 36.9, moic: 1.37, pct_sobre_all_in: 8.32, irr_raw_pct: 40.87, irr_display_pct: 40.87, irr_is_capped: false, dscr: null, cap_rate: null, monthly_cashflow: null, cash_on_cash_anual: null, equity_recuperado_refi: null },
};
if (process.argv.includes('--verify')) {
  let failures = 0;
  for (const c of cases) {
    const got = JSON.stringify(c.expected);
    const want = JSON.stringify(frozenExpected[c.id]);
    if (got !== want) { failures++; console.error('❌ ' + c.id + ' cambió\n  esperado: ' + want + '\n  obtenido: ' + got); }
    else console.log('✅ ' + c.id + ' exacto');
  }
  if (failures) process.exit(1);
  console.log('✅ C2 Empresa OS: 3/3 golden cases exactos');
} else {
  console.log(JSON.stringify({ schema_version: '1.0.0', cases }, null, 2));
}
