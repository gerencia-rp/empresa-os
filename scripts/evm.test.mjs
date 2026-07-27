// Test de la matemática pura EVM (rm-evm.js). Correr: node scripts/evm.test.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { rmEvmMetrics, rmEvmLight, rmEvmPhaseOf, rmEvmPlannedValueAt } = require('../rm-evm.js');

let fail = 0;
const approx = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;
function ok(name, cond) { console.log((cond ? '✅' : '❌') + ' ' + name); if (!cond) fail++; }

// ── Caso PMI clásico: BAC 100k, PV 40k, EV 35k, AC 45k ──
const m = rmEvmMetrics({ BAC: 100000, PV: 40000, EV: 35000, AC: 45000 });
ok('CV = -10000', approx(m.CV, -10000));
ok('SV = -5000', approx(m.SV, -5000));
ok('CPI ≈ 0.7778', approx(m.CPI, 0.77778, 0.001));
ok('SPI = 0.875', approx(m.SPI, 0.875, 0.001));
ok('EAC (BAC/CPI) ≈ 128571', approx(m.EAC, 128571.43, 1));
ok('EAC atípico == EAC (algebraico)', approx(m.EAC_atipico, m.EAC, 1));
ok('ETC ≈ 83571', approx(m.ETC, 83571.43, 1));
ok('VAC ≈ -28571', approx(m.VAC, -28571.43, 1));
ok('%avance = 0.35', approx(m.pctAvance, 0.35, 0.001));
ok('TCPI ≈ 1.1818', approx(m.tcpi, 1.18182, 0.001));

// ── Guards división por cero ──
const z = rmEvmMetrics({ BAC: 50000, PV: 0, EV: 0, AC: 0 });
ok('CPI null si AC=0', z.CPI === null);
ok('SPI null si PV=0', z.SPI === null);
ok('EAC null si CPI null', z.EAC === null);

// ── Semáforos ──
ok('light 1.00 → ok', rmEvmLight(1.00) === 'ok');
ok('light 1.20 → ok', rmEvmLight(1.20) === 'ok');
ok('light 0.95 → warn', rmEvmLight(0.95) === 'warn');
ok('light 0.90 → warn', rmEvmLight(0.90) === 'warn');
ok('light 0.89 → bad', rmEvmLight(0.89) === 'bad');
ok('light null → off', rmEvmLight(null) === 'off');

// ── Normalizador de fase ──
ok("'Demolición' → 1", rmEvmPhaseOf('Demolición') === '1');
ok("'5.1.2' → 5", rmEvmPhaseOf('5.1.2') === '5');
ok("'1. Demolición' → 1", rmEvmPhaseOf('1. Demolición') === '1');
ok("'Interior' → 5", rmEvmPhaseOf('Interior') === '5');
ok("'Exterior' → 3", rmEvmPhaseOf('Exterior') === '3');
ok("'Cimentación' → 2", rmEvmPhaseOf('Cimentación') === '2');
ok("'Estructura' → 4", rmEvmPhaseOf('Estructura') === '4');
ok("'Limpieza' → 6", rmEvmPhaseOf('Limpieza') === '6');
ok("'3' → 3", rmEvmPhaseOf('3') === '3');
ok("vacío → null", rmEvmPhaseOf('') === null);

// ── Valor planeado (PV) por rangos de fase ──
const day = 86400000;
const t0 = Date.UTC(2026, 0, 1);
// Fase 1: 10k, del día 0 al 9 (10 días). Fase 2: 20k, del día 10 al 19.
const bacPhase = { '1': 10000, '2': 20000, '3': 0, '4': 0, '5': 0, '6': 0 };
const ranges = { '1': { min: t0, max: t0 + 9 * day }, '2': { min: t0 + 10 * day, max: t0 + 19 * day } };
// En el día 4 (mitad de fase 1, fase 2 no empieza): PV ≈ 10k*(5/10) = 5000
const pvMid1 = rmEvmPlannedValueAt(t0 + 4 * day, bacPhase, ranges, null);
ok('PV a mitad de fase 1 ≈ 5000', approx(pvMid1, 5000, 1));
// Después de todo: PV = 30000
const pvEnd = rmEvmPlannedValueAt(t0 + 30 * day, bacPhase, ranges, null);
ok('PV al final = 30000', approx(pvEnd, 30000, 1));
// Fallback temporal sin rangos
const pvFb = rmEvmPlannedValueAt(t0 + 5 * day, { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 }, {}, { start: t0, end: t0 + 10 * day, bac: 100000 });
ok('PV fallback temporal (día 5/10) ≈ 50000', approx(pvFb, 50000, 1));

console.log('\n' + (fail === 0 ? '🎉 TODOS LOS TESTS PASARON' : `⚠ ${fail} test(s) fallaron`));
process.exit(fail === 0 ? 0 : 1);
