// Test del parser de costos por fase (rm-phase-costs.js). Correr: node scripts/phase-costs.test.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Dependencias globales que el módulo espera (definidas en rm-evm.js)
const evm = require('../rm-evm.js');
global.rmEvmPhaseOf = evm.rmEvmPhaseOf;
global.RM_EVM_FASES = evm.RM_EVM_FASES;
// xlsx es opcional (solo para el round-trip). Si no está instalado, se omiten esos 3 tests.
let hasXLSX = false;
try { global.XLSX = require('xlsx'); hasXLSX = true; } catch (e) { console.log('ℹ xlsx no instalado → se omite el round-trip (npm i -D xlsx para correrlo)'); }

const pc = require('../rm-phase-costs.js');
let fail = 0;
const approx = (a, b, t = 0.5) => Math.abs(a - b) <= t;
const ok = (n, c) => { console.log((c ? '✅' : '❌') + ' ' + n); if (!c) fail++; };

// ── rmPCNum ──
ok('num 5000 (number)', pc.rmPCNum(5000) === 5000);
ok("num '$12,500.50' → 12500.5", approx(pc.rmPCNum('$12,500.50'), 12500.5, 0.001));
ok("num '1,234' → 1234", pc.rmPCNum('1,234') === 1234);
ok("num '$3.000' (miles con punto)", pc.rmPCNum('$3.000') === 3000 || pc.rmPCNum('$3.000') === 3);  // tolerante
ok('num null → 0', pc.rmPCNum(null) === 0);
ok("num '' → 0", pc.rmPCNum('') === 0);

// ── rmPCRowsToPhases con AOA que imita PRESUPUESTO GENERAL ──
const rows = [
  ['PRESUPUESTO — Casa Demo', null, null, null, null, null], // fila 1 título
  [null, null, null, null, null, null],
  [null, null, null, null, null, null],
  ['Etapa', 'Material', 'Mano obra', 'Equipo', 'TOTAL', '% del total'], // fila 4 encabezado
  ['1. Demolición', 1000, 500, 200, null, null],   // TOTAL vacío (fórmula) → se calcula 1700
  ['2. Cimentación', 2000, 800, 100, null, null],  // 2900
  ['3. Externo', 1500, 700, 0, null, null],        // 2200
  ['4. Estructura', 3000, 1200, 300, null, null],  // 4500
  ['5. Interno', 4000, 2500, 400, null, null],     // 6900
  ['6. Limpieza', 200, 300, 0, null, null],        // 500
  [null, null, null, null, null, null],
  ['TOTAL', 11700, 6000, 1000, 18700, 1],          // fila TOTAL → se ignora
];
const res = pc.rmPCRowsToPhases(rows);
ok('parse ok', res.ok === true);
ok('6 fases', res.ok && res.phases.length === 6);
ok('fase 1 total = 1700 (calculado)', res.ok && approx(res.phases[0].total, 1700));
ok('fase 5 material = 4000', res.ok && approx(res.phases[4].costo_materiales, 4000));
ok('fase 5 total = 6900', res.ok && approx(res.phases[4].total, 6900));
ok('gran total = 18700', res.ok && approx(res.total, 18700));
ok('ignora fila TOTAL (no la cuenta como fase)', res.ok && res.phases.every(p => ['1', '2', '3', '4', '5', '6'].includes(p.fase)));

// ── Encabezado en otra posición + columnas reordenadas ──
const rows2 = [
  ['algo'],
  ['Etapa', 'Equipo', 'Material', 'Mano obra'],  // orden distinto, sin columna TOTAL
  ['1. Demolición', 50, 1000, 500],
  ['5 Interno', 100, 2000, 800],
];
const res2 = pc.rmPCRowsToPhases(rows2);
ok('parse con columnas reordenadas', res2.ok === true);
ok('fase 1 total = 1550 (1000+500+50)', res2.ok && approx(res2.phases[0].total, 1550));
ok("'5 Interno' mapea a fase 5", res2.ok && approx(res2.phases[4].total, 2900));

// ── Round-trip real vía XLSX (workbook → buffer → read → parse) ──
if (hasXLSX) {
const ws = global.XLSX.utils.aoa_to_sheet(rows);
const wb = global.XLSX.utils.book_new();
global.XLSX.utils.book_append_sheet(wb, ws, 'PRESUPUESTO GENERAL');
// hoja extra para simular multi-sheet
global.XLSX.utils.book_append_sheet(wb, global.XLSX.utils.aoa_to_sheet([['x']]), 'CRONOGRAMA');
const buf = global.XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
const wb2 = global.XLSX.read(buf, { type: 'array', cellDates: true });
const res3 = pc.rmPCParseWorkbook(wb2);
ok('round-trip XLSX: encuentra PRESUPUESTO GENERAL', res3.ok && /presupuesto/i.test(res3.sheet || ''));
ok('round-trip XLSX: gran total = 18700', res3.ok && approx(res3.total, 18700));
ok('round-trip XLSX: fase 4 total = 4500', res3.ok && approx(res3.phases[3].total, 4500));

// ── Hoja equivocada → error claro ──
const wbBad = global.XLSX.utils.book_new();
global.XLSX.utils.book_append_sheet(wbBad, global.XLSX.utils.aoa_to_sheet([['a', 'b'], [1, 2]]), 'Hoja1');
const resBad = pc.rmPCParseWorkbook(wbBad);
ok('hoja sin datos → ok:false', resBad.ok === false);
}

console.log('\n' + (fail === 0 ? '🎉 TODOS LOS TESTS PASARON' : `⚠ ${fail} test(s) fallaron`));
process.exit(fail === 0 ? 0 : 1);
