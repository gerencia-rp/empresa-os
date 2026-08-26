import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LDS = require('../pm/ff-luxury-studio.js');

assert.equal(LDS.tierFor(1505000, {}), 'luxury');
assert.equal(LDS.tierFor(800000, {}), 'premium');
assert.equal(LDS.tierFor(446500, {}), 'standard');

const ficha = {
  property_id: 'fixture-property-003', canonical_property_key: 'v1:fixture-003',
  address: 'Synthetic Luxury Fixture', purchase: 780000, appraisal: 0, arv: 1505000, contingency_pct: 18,
  arv_evidence: { source: 'motor contractual · sold arms-length', verification_status: 'calculado', confidence: 'alta', as_of: '2026-08-26' },
  internal_owner: 'NO DEBE CRUZAR', interest_hml_accumulated: 12345
};
const output = {
  negocio: { cashToClose: 260000, payoffHml: 1100000, mesesHold: 11 },
  cashout: { prestamo: 0, cashOut: 0 }, intereses: { pagoDscr: 0 },
  venta: { utilidad: 95944.24, capital: 260000, roi: 36.9, roiAnual: 40.87, margen: 8.32, meses: 11, netWire: 1379120, parteInv: 47972.12, parteOp: 47972.12 },
  unificada: { modo: 'venta', veredicto: 'revisar', allIn: 1153175, allInPct: 76.62 }
};
const studio = LDS.buildStudio(ficha, output, {});
assert.equal(studio.tier, 'luxury');
assert.equal(studio.executive_summary.irr_raw_pct, 40.87);
assert.equal(studio.gates.length, 6);
assert.equal(studio.gates.find(g => g.key === 'identity').pass, true);
assert.equal(studio.gates.find(g => g.key === 'budget_contingency').pass, true);
assert.equal(studio.promotion_payload.property_ref, 'v1:fixture-003');
assert.equal(JSON.stringify(studio.promotion_payload).includes('NO DEBE CRUZAR'), false);
assert.equal(JSON.stringify(studio.promotion_payload).includes('12345'), false);

console.log('✅ Luxury Deal Studio: contrato, tiering, gates y payload privado');
