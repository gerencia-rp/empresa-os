import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const commandPath = join(root, 'os/os-command-center.js');
const source = readFileSync(commandPath, 'utf8');
const block = source.match(/const JV_AUTOMATIONS = \{([\s\S]*?)\n\};/);
if (!block) throw new Error('No se encontró JV_AUTOMATIONS.');

const automations = [...block[1].matchAll(/^\s*'([^']+)':\s*\{\s*executor:\s*'([^']+)'/gm)]
  .map(([, name, executor]) => ({ name, executor }));
const migrationsDir = join(root, 'supabase/migrations');
const migrations = readdirSync(migrationsDir)
  .filter(name => name.endsWith('.sql'))
  .map(name => readFileSync(join(migrationsDir, name), 'utf8'))
  .join('\n');

const failures = [];
const rows = automations.map(({ name, executor }) => {
  const sqlExecutor = executor.match(/^([a-z0-9_]+)\(/i);
  const edgeName = sqlExecutor ? null : executor;
  const implementationPath = sqlExecutor
    ? migrationsDir
    : join(root, `supabase/functions/${edgeName}/index.ts`);
  const implemented = sqlExecutor
    ? new RegExp(`function\\s+public\\.${sqlExecutor[1]}\\s*\\(`, 'i').test(migrations)
    : existsSync(implementationPath);
  let auth = true;
  let evidence = true;
  if (edgeName && implemented) {
    const edge = readFileSync(implementationPath, 'utf8');
    auth = /requireAuth|bearer\s*!==\s*SERVICE_KEY/.test(edge);
    evidence = edgeName === 'cerebro' || /agent_audit_log/.test(edge);
  }
  const scheduleTarget = edgeName === 'cerebro' ? 'notify-whatsapp' : (sqlExecutor ? sqlExecutor[1] : edgeName);
  const scheduled = new RegExp(scheduleTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(migrations);
  const ok = implemented && auth && evidence && scheduled;
  if (!ok) failures.push({ name, executor, implemented, auth, evidence, scheduled });
  return { name, executor, implemented, auth, evidence, scheduled, ok };
});

for (const row of rows) {
  const marks = [row.implemented, row.auth, row.evidence, row.scheduled].map(v => v ? '✓' : '✗').join(' ');
  console.log(`${row.ok ? 'OK ' : 'BAD'} ${marks}  ${row.name} → ${row.executor}`);
}
console.log(`\n${rows.length - failures.length}/${rows.length} automatizaciones pasan implementación + autenticación + evidencia + horario versionado.`);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
