import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const command = readFileSync(join(root, 'os/os-command-center.js'), 'utf8');
const migrations = readFileSync(join(root, 'supabase/migrations/20260827010000_business_continuity_agent.sql'), 'utf8');

const coverage = [
  ['Líder Contable & Datos', 'Director de Continuidad Operativa', 'partial'],
  ['Auditor de Datos', 'Auditor de Agentes', 'partial'],
  ['Datos & Conciliación', 'Financiero Fix & Flip', 'covered'],
  ['Datos & Conciliación', 'Financiero Remodelación', 'covered'],
  ['Datos & Conciliación', 'Financiero Rentas', 'covered'],
  ['Analista de Cobranza', 'Financiero Rentas', 'covered'],
  ['Sabueso Contable', 'Director de Continuidad Operativa', 'partial'],
  ['Ops · Auditor', 'Auditor de Agentes', 'covered'],
  ['Ops · Líder', 'Director de Continuidad Operativa', 'covered'],
  ['Ops · Coordinador', 'Ejecución Rentas', 'covered'],
  ['Ops · Coordinador', 'Ejecución Remodelación', 'covered'],
  ['Ops · Coordinador', 'Ejecución Fix & Flip', 'covered'],
  ['Ops · Analista de Calidad', 'Calidad de Obra (Remodelación)', 'covered'],
  ['Verificador Fix & Flip', 'Financiero Fix & Flip', 'covered'],
  ['Verificador Remodelación', 'Financiero Remodelación', 'covered'],
  ['Verificador Rentas', 'Financiero Rentas', 'covered'],
  ['Verificador Educación', 'Gerente de Éxito Estudiantil', 'covered'],
  ['Reportero Fix & Flip', 'Reportes Fix & Flip', 'covered'],
  ['Reportero Remodelación', 'Reportes Remodelación', 'covered'],
  ['Reportero Rentas', 'Reportes Rentas', 'covered'],
  ['Reportero Educación', 'Gerente de Éxito Estudiantil', 'covered'],
];

const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const failures = [];
for (const [legacy, owner, state] of coverage) {
  const key = normalized(owner);
  const inUi = command.includes(`'${key}'`);
  const inMigration = migrations.includes(`'${owner}'`) || inUi;
  const implemented = inUi && inMigration;
  if (!implemented) failures.push({ legacy, owner, reason: 'dueño sin ejecutor versionado' });
  console.log(`${implemented ? 'OK ' : 'BAD'} ${state.padEnd(7)} ${legacy} → ${owner}`);
}

for (const relative of ['docs/JARVIS-CONTINUITY-OPERATING-MODEL.md', 'supabase/migrations/20260827010000_business_continuity_agent.sql']) {
  if (!existsSync(join(root, relative))) failures.push({ artifact: relative, reason: 'faltante' });
}

const partial = coverage.filter(([, , state]) => state === 'partial').length;
console.log(`\n${coverage.length - failures.length}/${coverage.length} traspasos tienen dueño operativo versionado; ${partial} requieren demostrar paridad con evidencia de producción.`);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
