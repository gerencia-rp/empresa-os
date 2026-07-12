// Golden tests · Calc 3 Cash-Out (refi DSCR) — corre el ffUwCalcCashout REAL de pm/ff-underwriting.js
// contra los refis reales de Champions Funding (datos espejados de Airtable).
//   node scripts/test-uw-cashout.mjs
// Verifica EXACTO: Michelle $23,093.29 · Echo $10,951.14 · Childress $50,968.24 · Meadow $138.63
// (Dove tiene Δ de data conocida en Airtable → se reporta, no falla.)
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = readFileSync(path.join(import.meta.dirname, '..', 'pm', 'ff-underwriting.js'), 'utf8');
global.window = {};
// eslint-disable-next-line no-eval
eval(src + '\n;globalThis.__uw = { ffUwCalcCashout, ffUwCalcIntereses, UW };');
const { ffUwCalcCashout, ffUwCalcIntereses, UW } = globalThis.__uw;

// Config de prod (ff_uw_config — seeds de la migración 20260712100000)
UW.cfg = {
  refi_ltv_pct: 75, refi_dscr_objetivo: 1.0, dscr_tasa_anual: 7.125, dscr_plazo_anos: 30,
  refi_fee_underwriting: 1495, refi_fee_processing: 695, refi_originacion_pct: 0,
  refi_titulo_base: 2100, refi_titulo_pct: 0, refi_dias_prepagado: 17,
  refi_seguro_anual: 1900, refi_impound_seguro_meses: 3, refi_impound_imp_meses: 3, refi_tax_pct: 2.1,
};

const DEF = { // subset de ffUwDefaults relevante a la calc 3
  ltv_pct: 75, payoff: 0, renta_mensual: 0, refi_prestamo_real: 0, refi_dscr_obj: 1.0,
  refi_orig_pct: 0, refi_uw_fee: 1495, refi_proc_fee: 695, refi_titulo: 2100, refi_titulo_pct: 0,
  refi_dias_prepagado: 17, refi_seguro_anual: 1900, refi_imp_seguro_m: 3, refi_imp_imp_m: 3,
  refi_tax_pct: 2.1, refi_otros: 0, appraisal: 0,
};
const arvObj = (arv, appraisal) => ({ arvAirtable: arv, probable: arv, appraisal });
const run = (over, arv, appraisal) => ffUwCalcCashout({ ...DEF, appraisal, ...over }, arvObj(arv, appraisal));

let fails = 0;
const eq = (name, got, want, tol = 0.005) => {
  const ok = Math.abs(got - want) <= tol;
  console.log(`  ${ok ? '✅' : '❌'} ${name}: ${got.toFixed(2)} ${ok ? '=' : '≠ esperado ' + want.toFixed(2) + ' (Δ ' + (got - want).toFixed(2) + ')'}`);
  if (!ok) fails++;
};

// ═══ 1) MICHELLE (5003 Michelle Ct) — datos espejados de Airtable ═══
console.log('\n═══ Michelle · seeds Airtable (préstamo real + pagado real) ═══');
let c = run({ ltv_pct: 75, refi_prestamo_real: 321000, _refi_pagado_real: 297906.71, renta_mensual: 3700, _cashout_real: 23093.29 }, 428000, 428000);
eq('préstamo', c.prestamo, 321000);
eq('préstamo calculado (428k × 75%)', c.prestamoCalc, 321000);
eq('cash-out', c.cashOut, 23093.29);
eq('payoff + costos = pagado Airtable', c.payoff + c.costos, 297906.71);
console.log(`  limitante: ${c.limitante} (tope DSCR ${Math.round(c.topeDscr).toLocaleString()} > LTV ${c.prestamoLtv.toLocaleString()} ✓ renta alta)`);

// ═══ 2) MICHELLE camino HUD manual: payoff puro + costos itemizados = 25,790.14 ═══
console.log('\n═══ Michelle · camino HUD (payoff $272,116.57 + itemización con orig 1.5%) ═══');
c = run({ ltv_pct: 75, payoff: 272116.57, refi_orig_pct: 1.5, refi_otros: 2009.90, renta_mensual: 3700 }, 428000, 428000);
eq('préstamo (sin override, fórmula)', c.prestamo, 321000);
eq('costos itemizados', c.costos, 25790.14);
eq('cash-out', c.cashOut, 23093.29);
console.log(`    items: fees ${c.feesLender} (orig ${c.origination}) + título ${c.titulo} + prepagado ${c.prepagado} + seguro ${c.seguro} + impuestos ${c.impuestos} + otros ${c.otros}`);
eq('escrows (imp + seguro)', c.escrows, c.impuestos + c.seguro);
eq('recuperado neto', c.recuperadoNeto, c.cashOut + c.escrows);

// ═══ 3) ECHO (1100 Echo Ln) — renta baja: préstamo real 337,500 < LTV 350,250 ═══
console.log('\n═══ Echo · seeds Airtable ═══');
c = run({ ltv_pct: 72.27, refi_prestamo_real: 337500, _refi_pagado_real: 326548.86, _cashout_real: 10951.14 }, 450000, 467000);
eq('préstamo', c.prestamo, 337500);
eq('cash-out', c.cashOut, 10951.14);
// con DSCR 1.0 y la renta implícita del PITI real (~3,084), el tope DSCR limita bajo el LTV 75% del appraisal:
const cEcho = run({ ltv_pct: 75, renta_mensual: 3084, refi_dscr_obj: 1.0 }, 450000, 467000);
console.log(`  75% × appraisal 467k = ${cEcho.prestamoLtv.toLocaleString()} · tope DSCR (renta 3,084) = ${Math.round(cEcho.topeDscr).toLocaleString()} → manda ${cEcho.limitante} (explica por qué Echo NO llegó a 350,250)`);

// ═══ 4) CHILDRESS — la TASACIÓN manda aunque sea MAYOR que el ARV (380k > 355k) ═══
console.log('\n═══ Childress ═══');
c = run({ ltv_pct: 75, refi_prestamo_real: 285000, _refi_pagado_real: 234031.76, renta_mensual: 4850, _cashout_real: 50968.24 }, 355000, 380000);
eq('préstamo calculado (75% × appraisal 380k)', c.prestamoCalc, 285000);
eq('cash-out', c.cashOut, 50968.24);

// ═══ 5) MEADOW — appraisal 318k < ARV 350k (acá la tasación baja el préstamo) ═══
console.log('\n═══ Meadow ═══');
c = run({ ltv_pct: 75, refi_prestamo_real: 238500, _refi_pagado_real: 238361.37, renta_mensual: 3200, _cashout_real: 138.63 }, 350000, 318000);
eq('préstamo calculado (75% × appraisal 318k)', c.prestamoCalc, 238500);
eq('cash-out', c.cashOut, 138.63);

// ═══ 6) DOVE — discrepancia de data conocida (solo informativa) ═══
console.log('\n═══ Dove (Δ de data en Airtable — informativo) ═══');
c = run({ ltv_pct: 76.2, refi_prestamo_real: 282000, _refi_pagado_real: 262926.67, renta_mensual: 3500, _cashout_real: 22207.13 }, 370000, 370000);
console.log(`  préstamo 282,000 − pagado 262,926.67 = ${c.cashOut.toLocaleString()} vs cash-out Airtable 22,207.13 → Δ ${(c.cashOut - 22207.13).toFixed(2)} (revisar en Airtable)`);

// ═══ 7) Pago DSCR (Calc 4) con la tasa reverseada 7.125% vs PITI reales ═══
console.log('\n═══ P&I @ 7.125% / 30a vs PITI reales (PITI = P&I + T/12 + S/12) ═══');
for (const [casa, prestamo, piti, valor] of [['Michelle', 321000, 3032.26, 428000], ['Echo', 337500, 3084.34, 467000], ['Childress', 285000, 2609.35, 380000], ['Meadow', 238500, 2407.48, 318000], ['Dove', 282000, 2725.57, 370000]]) {
  const i = ffUwCalcIntereses({ purchase: 0, hml_finance_pct: 90 }, { prestamoRefi: prestamo });
  const pitiModelo = i.pagoDscr + valor * 0.021 / 12 + 1900 / 12;
  console.log(`  ${casa}: P&I ${i.pagoDscr.toLocaleString()} + T&I → PITI modelo ${Math.round(pitiModelo).toLocaleString()} vs real ${piti.toLocaleString()} (Δ ${(pitiModelo - piti).toFixed(0)})`);
}

console.log(fails ? `\n❌ ${fails} FALLAS` : '\n✅ GOLDEN TESTS OK — Michelle/Echo/Childress/Meadow exactos');
process.exit(fails ? 1 : 0);
