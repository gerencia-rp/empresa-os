import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CierreEngine = require('../os/os-cierre-engine.js');

const base = {
  deals: [{ address: '514 Ramble Ln', address_norm: '514-ramble', stage: 'rentada', hml_payment: 3292 }],
  draws: [{
    address: '514 Ramble Ln', address_norm: '514-ramble', total_draws: 150000,
    remodel_complete: 110000, hml_months: 6, interest_hml: 19752,
    services_hml: 2011.14, furniture: 0, interest_until_rent: 6584,
  }],
  loans: [{
    address: '514 Ramble Ln', address_norm: '514-ramble', plazo_meses: 6,
    fecha_vencimiento: '2026-05-26', monto_hml: 354000,
  }],
};

const findings = CierreEngine.runChecks(base, {}, '2026-08-28');
const c11 = findings.find(f => f.check_id === 'C11');
assert.ok(c11, 'C11 debe detectar el gap contra fondos disponibles');
assert.equal(c11.detalle.draws, 150000);
assert.equal(c11.detalle.salidas_draw, 21763.14);
assert.equal(c11.detalle.fondos_disponibles_obra, 128236.86);
assert.equal(c11.detalle.gap, -18236.86);
assert.match(c11.titulo, /fondos disponibles para obra/);

const refinanced = structuredClone(base);
refinanced.loans[0].monto_prestamo_refi = 321000;
const afterRefi = CierreEngine.runChecks(refinanced, {}, '2026-08-28');
assert.equal(afterRefi.some(f => f.check_id === 'C15'), false,
  'C15 no debe marcar HML vencido cuando existe evidencia de refinanciación');

const openHml = CierreEngine.runChecks(base, {}, '2026-08-28');
assert.equal(openHml.some(f => f.check_id === 'C15'), true,
  'C15 debe permanecer abierto sin evidencia de salida o extensión');

console.log('Motor de cierre: 9 aserciones financieras aprobadas.');
