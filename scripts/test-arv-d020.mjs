import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Arv = require('../pm/ff-arv-engine.js');

const subject = { sqft: 1500, beds: 3, baths: 2, year: 2000, lot: 6000, zip: '78745', tipo: 'Single Family' };
const base = { sqft: 1500, beds: 3, baths: 2, year: 2000, lot: 6000, dist: 0.2, tipo: 'Single Family' };
const comps = [
  { ...base, id: 'sold-arm-1', price: 300000, status: 'sold', saleType: 'arms_length', closeDate: '2026-07-01', fecha: '2026-07-01' },
  { ...base, id: 'sold-arm-2', price: 310000, status: 'closed', saleType: 'arms-length', closeDate: '2026-07-05', fecha: '2026-07-05' },
  { ...base, id: 'active-hot', price: 900000, status: 'Active', listingType: 'Standard', fecha: '2026-08-01' },
  { ...base, id: 'pending-hot', price: 800000, status: 'Pending', listingType: 'Standard', fecha: '2026-08-01' },
  { ...base, id: 'inactive-unknown', price: 700000, status: 'Inactive', listingType: 'Standard', fecha: '2026-07-15' },
  { ...base, id: 'sold-foreclosure', price: 100000, status: 'Sold', saleType: 'foreclosure', closeDate: '2026-06-01', fecha: '2026-06-01' },
];
const cfg = { arv_comps_min: 2, arv_comps_max: 8, arv_bias_pct: 0, arv_bias_pct_78745: 0 };
const rec = Arv.reconciliar(subject, comps, cfg, { hoy: '2026-08-25' });

const ids = rec.usables.map(x => x.c.id).sort();
const ok = ids.join(',') === 'sold-arm-1,sold-arm-2' && rec.temperatura.length === 2 && rec.arv >= 300000 && rec.arv <= 310000;
console.log(JSON.stringify({ arv: rec.arv, incluidos: ids, temperatura: rec.temperatura.map(x => x.id), excluidos: rec.noElegibles.map(x => [x.c.id, x.razon]) }, null, 2));
if (!ok) throw new Error('D-020 incumplida: el ARV incluyó un comp no elegible o perdió la capa de temperatura');
console.log('✅ D-020: solo sold + arms_length entra al ARV; activos/pending quedan como temperatura.');

const sinVentas = Arv.reconciliar(subject, comps.filter(c => c.status !== 'sold' && c.status !== 'closed' && c.status !== 'Sold'), cfg, { hoy: '2026-08-25' });
const conAvm = Arv.conFallbackRentcast(sinVentas, { value: 412345, priceRangeLow: 390000, priceRangeHigh: 435000 });
if (conAvm.arv !== 412345 || conAvm.conservador !== 390000 || conAvm.optimista !== 435000 || conAvm.fuenteArv !== 'rentcast_avm') {
  throw new Error('Fallback RentCast incumplido');
}
console.log('✅ RentCast AVM: entrega ARV automático cuando no hay ventas documentadas.');

const conLocal = Arv.conFallbackLocal(sinVentas, { value: 1500 * 295, source: 'estimacion_local_psf', score: 30 });
if (conLocal.arv !== 442500 || conLocal.fuenteArv !== 'estimacion_local_psf') throw new Error('Fallback local incumplido');
console.log('✅ Respaldo local: el ARV no queda vacío cuando RentCast no responde.');
