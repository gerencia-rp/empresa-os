// scripts/test-inv-rehab.mjs — GOLDEN de la regla 3B (casa en rehab / sin renta).
// Corre el CÓDIGO REAL (os/inv-engine.js). Norte: una casa que todavía no cobra renta
// NUNCA debe publicar CAP negativo, DSCR -Infinity ni "Equilibrio Infinity%" — esos
// indicadores se calculan sobre la renta y AÚN NO APLICAN (null + estadoOperativo).
// Además protege el camino normal: una casa rentando debe seguir dando lo mismo.
//   node scripts/test-inv-rehab.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const invEngine = require('../os/inv-engine.js');

let ok = 0, fail = 0;
const t = (nombre, cond, detalle) => {
  if (cond) { ok++; console.log('  ✓ ' + nombre); }
  else { fail++; console.log('  ✗ ' + nombre + (detalle != null ? '  → ' + detalle : '')); }
};

// Base común: mismos supuestos, lo único que cambia es si la casa YA cobra renta.
const BASE = {
  compra: 205000, cierreCompra: 6000, arv: 530000,
  ocupacionEstable: 1, rampa: [],
  mantenimientoMes: 150, serviciosMes: 300, hoaMes: 0,
  impPropiedadPct: 0.021, impRentaPct: 0.21, seguroMes: 120,
  hmInicial: 150000, draws: { 1: 40000, 2: 40000 }, hmTasa: 0.12,
  refiTasa: 0.07125, refiPlazoM: 360,
  valorizacion: 0.053, inflacion: 0.03, retornoEsperado: 0.08, repartoInv: 0.5,
};

console.log('\n① CASA EN REHAB — sin renta todavía, sin refi (perfil 5320 Wellington Dr)');
const rehab = invEngine.run({ ...BASE, numHab: 0, arriendoHab: 0, refiMes: null, refiMonto: 0 }).indicadores;
const eo = rehab.estadoOperativo || {};
t('estadoOperativo.enRehab = true', eo.enRehab === true, JSON.stringify(eo.enRehab));
t('estadoOperativo.sinRenta = true', eo.sinRenta === true);
t('estadoOperativo.texto explica el estado', /rehab/i.test(eo.texto || ''), eo.texto);
t('CAP (valor) = null — no un negativo engañoso', rehab.capValor === null, rehab.capValor);
t('CAP (costo) = null', rehab.capCosto === null, rehab.capCosto);
t('DSCR = null — NO -Infinity', rehab.dscr === null, rehab.dscr);
t('Punto de equilibrio = null — NO Infinity%', rehab.puntoEquilibrio === null, rehab.puntoEquilibrio);
t('razonCap/razonDscr/razonEquilibrio presentes', !!(eo.razonCap && eo.razonDscr && eo.razonEquilibrio));
// lo que SÍ tiene sentido en rehab se sigue publicando
t('noiAnual se sigue publicando (dato crudo)', typeof rehab.noiAnual === 'number');
t('cashInvertido se sigue publicando', typeof rehab.cashInvertido === 'number' && isFinite(rehab.cashInvertido));
// ningún indicador publicado puede ser no-finito
const noFinitos = ['capValor', 'capCosto', 'dscr', 'puntoEquilibrio']
  .filter(k => rehab[k] !== null && !isFinite(rehab[k]));
t('ningún indicador publicado es ±Infinity/NaN', noFinitos.length === 0, noFinitos.join(','));

console.log('\n② CASA RENTANDO — control de NO regresión (debe dar números normales)');
const rent = invEngine.run({ ...BASE, numHab: 6, arriendoHab: 800, refiMes: 6, refiMonto: 336973 }).indicadores;
t('enRehab = false', rent.estadoOperativo.enRehab === false);
t('CAP = 9.63% (valor exacto previo al cambio)', (rent.capValor * 100).toFixed(2) === '9.63', (rent.capValor * 100).toFixed(2));
t('DSCR = 1.97 (valor exacto previo al cambio)', rent.dscr.toFixed(2) === '1.97', rent.dscr.toFixed(2));
t('Equilibrio = 92% (valor exacto previo al cambio)', (rent.puntoEquilibrio * 100).toFixed(0) === '92', (rent.puntoEquilibrio * 100).toFixed(0));
t('razonDscr = null (no hay nada que explicar)', rent.estadoOperativo.razonDscr === null);

console.log('\n③ CASA RENTANDO SIN DEUDA — compra en cash / todavía sin refi');
const cash = invEngine.run({ ...BASE, numHab: 6, arriendoHab: 800, refiMes: null, refiMonto: 0 }).indicadores;
t('NO se marca como rehab (sí cobra renta)', cash.estadoOperativo.enRehab === false);
t('sinDeuda = true', cash.estadoOperativo.sinDeuda === true);
t('DSCR = null — NO Infinity (no hay cuota)', cash.dscr === null, cash.dscr);
t('CAP SÍ se publica (es válido sin deuda)', cash.capValor != null && isFinite(cash.capValor), cash.capValor);
t('Equilibrio SÍ se publica', cash.puntoEquilibrio != null && isFinite(cash.puntoEquilibrio));
t('razonDscr habla de la CUOTA, no de rehab', /cuota|cash|refi/i.test(cash.estadoOperativo.razonDscr || '') && !/rehab/i.test(cash.estadoOperativo.razonDscr || ''), cash.estadoOperativo.razonDscr);

console.log('\n④ VUELTA A LA NORMALIDAD — al empezar a cobrar renta, los indicadores vuelven solos');
const vuelve = invEngine.run({ ...BASE, numHab: 6, arriendoHab: 800, refiMes: 6, refiMonto: 336973 }).indicadores;
t('CAP/DSCR/equilibrio dejan de ser null', vuelve.capValor != null && vuelve.dscr != null && vuelve.puntoEquilibrio != null);
t('estadoOperativo.texto vuelve a null', vuelve.estadoOperativo.texto === null);

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' GOLDEN 3B: ' + ok + '/' + (ok + fail) + ' checks');
process.exit(fail === 0 ? 0 : 1);
