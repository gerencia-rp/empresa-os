// Golden tests · ARV-first + escenarios del Underwriting.
// Valida que el stress-test use el mismo motor y no modifique el análisis Base.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = readFileSync(path.join(import.meta.dirname, '..', 'pm', 'ff-underwriting.js'), 'utf8');
global.window = {};
global.osIcon = () => '';
// eslint-disable-next-line no-eval
eval(src + '\n;globalThis.__uwScenario = { UW, UW_NAV, UW_NAV_VENTA, ffUwComputeFor };');
const { UW, UW_NAV, UW_NAV_VENTA, ffUwComputeFor } = globalThis.__uwScenario;

let fails = 0;
const ok = (name, pass) => { console.log(`${pass ? '✅' : '❌'} ${name}`); if (!pass) fails++; };
ok('ARV es el primer paso de Hold', UW_NAV[0][0] === 'arv');
ok('ARV es el primer paso de Venta', UW_NAV_VENTA[0][0] === 'arv');

UW.cfg = { allin_max_pct: 75, harmony_tasa_anual: 12, dscr_tasa_anual: 7.125, dscr_plazo_anos: 30, refi_ltv_pct: 75, refi_tax_pct: 2.1, refi_seguro_anual: 1900 };
UW.cfgTxt = {};
const baseInputs = {
  estrategia: 'venta', purchase: 200000, remod_directo: 100000, usar_estimador: false,
  est_sqft: 1500, arv: 450000, arv_airtable: 450000, appraisal: 0,
  meses_obra: 4, meses_renta: 1, utilities_mes: 250, insurance_mes: 120, hoa_mes: 75,
  muebles: 0, appraisal_cost: 0, contingencia_pct: 10, permisos: 0, dumpster: 0, ac: 0,
  hml_pct_compra: 90, hml_pct_remo: 100, hml_tasa_anual: 12, dscr_tasa_anual: 7.125,
  cc_origination_pct: 1.5, cc_documentation: 1495, cc_draw_fee: 500, cc_underwriting: 995,
  venta_comision_pct: 6, venta_cierre_pct: 1.5, venta_concesiones_pct: 0, venta_meses: 5,
  venta_split_inv_pct: 50, renta_mensual: 3500,
};
const original = JSON.stringify(baseInputs);
const base = ffUwComputeFor(structuredClone(baseInputs));
const stressedInputs = structuredClone(baseInputs);
stressedInputs.arv = Math.round(base.arv.probable * .92);
stressedInputs.remod_directo = Math.round(base.negocio.remod * 1.15);
stressedInputs.hml_tasa_anual += 1;
const stressed = ffUwComputeFor(stressedInputs);
ok('el escenario conservador baja la utilidad', stressed.venta.utilidad < base.venta.utilidad);
ok('el escenario conservador sube el costo de rehab', stressed.negocio.remod > base.negocio.remod);
ok('el análisis Base no se modifica', JSON.stringify(baseInputs) === original);

console.log(fails ? `\n❌ ${fails} FALLAS` : '\n✅ ESCENARIOS OK');
process.exit(fails ? 1 : 0);
