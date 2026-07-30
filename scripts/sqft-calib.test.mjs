// Test de la estadística de calibración $/ft² (rm-sqft-calib.js). Correr: node scripts/sqft-calib.test.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { rmSqftStats } = require('../rm-sqft-calib.js');

let fail = 0;
const approx = (a, b, t = 0.5) => a != null && Math.abs(a - b) <= t;
const ok = (n, c) => { console.log((c ? '✅' : '❌') + ' ' + n); if (!c) fail++; };

// ── Caso base: 4 casas, $/ft² = 40, 50, 60, 50 ──
// costo = psf * sqft. sqft todas 1000 → costo 40k,50k,60k,50k.
const items = [
  { address: 'A', sqft: 1000, costo: 40000, est: 45000 },
  { address: 'B', sqft: 1000, costo: 50000, est: 48000 },
  { address: 'C', sqft: 1000, costo: 60000, est: 50000 },
  { address: 'D', sqft: 1000, costo: 50000, est: 52000 },
];
const s = rmSqftStats(items, { weighted: true });
ok('n = 4 (sin outliers)', s.n === 4);
ok('psf simple = 50', approx(s.psfSimple, 50));
ok('psf ponderado = 50 (Σcosto/Σft²)', approx(s.psfWeighted, 50));
// std muestral de [40,50,60,50]: media 50, desv² = (100+0+100+0)/3 = 66.67 → σ=8.165
ok('σ ≈ 8.16', approx(s.std, 8.165, 0.02));
ok('CV ≈ 16.3%', approx(s.cv, 16.33, 0.1));
// psf_est: (45+48+50+52)/4 = 48.75
ok('psf_est ≈ 48.75', approx(s.psfEst, 48.75, 0.01));

// ── Ponderación por ft²: casa grande barata baja el promedio ponderado ──
const items2 = [
  { address: 'grande', sqft: 4000, costo: 160000, est: 0 }, // 40/ft²
  { address: 'chica', sqft: 1000, costo: 60000, est: 0 },   // 60/ft²
];
const s2 = rmSqftStats(items2, { weighted: true });
// ponderado = (160000+60000)/(5000) = 44 ; simple = (40+60)/2 = 50
ok('ponderado = 44', approx(s2.psfWeighted, 44));
ok('simple = 50', approx(s2.psfSimple, 50));

// ── Outlier: una casa a 200/ft² con n>=4 se excluye ──
const items3 = [
  { address: 'A', sqft: 1000, costo: 48000, est: 0 },
  { address: 'B', sqft: 1000, costo: 50000, est: 0 },
  { address: 'C', sqft: 1000, costo: 52000, est: 0 },
  { address: 'D', sqft: 1000, costo: 49000, est: 0 },
  { address: 'OUT', sqft: 1000, costo: 200000, est: 0 }, // 200/ft² outlier
];
const s3 = rmSqftStats(items3, { weighted: true, zThresh: 2 });
ok('detecta 1 outlier', s3.outliers.length === 1);
ok('outlier es OUT', s3.outliers[0] && s3.outliers[0].address === 'OUT');
ok('n incluidas = 4', s3.n === 4);
ok('nTotal = 5', s3.nTotal === 5);
ok('psf incluido ≈ 49.75', approx(s3.psfWeighted, 49.75, 0.5));

// ── Guards ──
const sEmpty = rmSqftStats([], {});
ok('vacío → n 0', sEmpty.n === 0 && sEmpty.psfWeighted === null);
const sBad = rmSqftStats([{ address: 'x', sqft: 0, costo: 1000 }, { address: 'y', sqft: 1000, costo: 0 }], {});
ok('filtra sqft/costo inválidos → n 0', sBad.nTotal === 0);

console.log('\n' + (fail === 0 ? '🎉 TODOS LOS TESTS PASARON' : `⚠ ${fail} test(s) fallaron`));
process.exit(fail === 0 ? 0 : 1);
