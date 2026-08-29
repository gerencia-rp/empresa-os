import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const commandPath = join(root, 'os/os-command-center.js');
const source = readFileSync(commandPath, 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
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

const requiredControls = [
  'run_business_continuity_review',
  'run_operational_role_review',
  'run_decision_sla_review',
  'run_absence_readiness_review',
  'run_data_integrity_review',
  'run_financial_exception_triage',
  'run_financial_source_scan',
  'run_automation_watchdog',
  'security_audit_run',
  'record_rentcast_call',
  'run_integration_health_review',
  'run_approved_work_review',
];
const missingControls = requiredControls.filter(control =>
  !new RegExp(`function\\s+public\\.${control}\\s*\\(`, 'i').test(migrations)
);
if (missingControls.length) {
  console.error(`Faltan controles ejecutivos versionados: ${missingControls.join(', ')}`);
  process.exit(1);
}
console.log(`${requiredControls.length}/${requiredControls.length} controles ejecutivos de continuidad e integridad están versionados.`);

if (!/view\s+public\.v_automation_effective_health/i.test(migrations)
  || !/view\s+public\.v_automation_expectation_gaps/i.test(migrations)
  || !/clickup_sync_log/i.test(migrations)
  || !/pm_sync_log/i.test(migrations)
  || !/remodel_sync_log/i.test(migrations)
  || !/remodel_sync_parity/i.test(migrations)
  || !/source\s+in\s*\(\s*'ff_deals'\s*,\s*'ff_draws'\s*,\s*'ff_investors'\s*,\s*'ff_hml_loans'\s*\)/i.test(migrations)
  || !/from\s+public\.v_automation_effective_health/i.test(migrations)
  || !/effective_health\s*<>\s*'healthy'/i.test(migrations)) {
  throw new Error('El vigilante de automatizaciones todavía puede confundir un cron disparado con un resultado exitoso.');
}
console.log('1/1 vigilante ejecutivo exige evidencia real para sincronizaciones críticas; un cron disparado no cuenta como éxito.');

const scheduledJobNames = new Set([...migrations.matchAll(/cron\.schedule\(\s*'([^']+)'/gi)].map(match => match[1]));
const expectedJobNames = new Set([...migrations.matchAll(/\(\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*\d+(?:\.\d+)?\s*,\s*'P[123]'\s*\)/g)].map(match => match[1]));
const uncataloguedJobs = [...scheduledJobNames].filter(jobname => !expectedJobNames.has(jobname));
if (uncataloguedJobs.length) {
  throw new Error(`Hay trabajos programados sin dueño o frecuencia esperada: ${uncataloguedJobs.join(', ')}`);
}
console.log(`${scheduledJobNames.size}/${scheduledJobNames.size} horarios versionados tienen dueño, criticidad y máximo silencio; los futuros no catalogados se escalan automáticamente.`);

const productionGatePath = join(root, 'scripts/jarvis-production-gate.mjs');
const productionGate = existsSync(productionGatePath) ? readFileSync(productionGatePath, 'utf8') : '';
if (packageJson.scripts?.['gate:jarvis:prod'] !== 'node scripts/jarvis-production-gate.mjs'
  || !/v_automation_expectation_gaps/.test(productionGate)
  || !/v_automation_effective_health/.test(productionGate)
  || !/v_business_agent_coverage/.test(productionGate)
  || !/v_operational_role_coverage/.test(productionGate)
  || !/v_financial_findings_actionable/.test(productionGate)) {
  throw new Error('La certificación de producción no cubre horarios, resultados, empresas, roles y hallazgos financieros.');
}
console.log('1/1 gate de producción certifica horarios, evidencia, empresas, roles humanos, finanzas e informes vivos.');

if (!/function\s+public\.assign_operational_role\s*\(/i.test(migrations)
  || !/operational_role_assignment_history/i.test(migrations)
  || !/public\.is_admin\(\)/i.test(migrations)
  || !/p_attested\s+is\s+not\s+true/i.test(migrations)
  || !/p_primary_profile_id\s*=\s*p_backup_profile_id/i.test(migrations)
  || !/run_operational_role_review\(\)/i.test(migrations)) {
  throw new Error('La cobertura humana no tiene asignación atómica, atestación, historial o revisión integral.');
}
if (!/sb\.rpc\(['"]assign_operational_role['"]/.test(source)
  || /sb\.from\(['"]operational_role_assignments['"]\)\.update/.test(source)
  || !/jv-role-attest-/.test(source)) {
  throw new Error('Jarvis no usa el flujo auditable de asignación humana o permite escritura directa desde la interfaz.');
}
console.log('1/1 matriz humana exige administrador, atestación, accesos, historial y revisión atómica.');

if (!/view\s+public\.v_financial_findings_actionable/i.test(migrations)
  || !/evidencia_requerida/i.test(migrations)
  || !/prioridad_operativa/i.test(migrations)
  || !/v_financial_findings_actionable/.test(source)) {
  throw new Error('Los hallazgos financieros no tienen una cola accionable con responsable, evidencia y prioridad.');
}
console.log('1/1 cola financiera traduce cada control a responsable, evidencia, acción y prioridad operativa.');

if (!/view\s+public\.v_business_agent_coverage/i.test(migrations)
  || !/capacidades_faltantes/i.test(migrations)
  || !/direccion\s+and\s+ejecucion\s+and\s+finanzas\s+and\s+optimizacion\s+and\s+reportes\s+and\s+integridad/i.test(migrations)
  || !/v_business_agent_coverage/.test(source)) {
  throw new Error('Jarvis no demuestra cobertura mínima por cada empresa activa.');
}
console.log('1/1 matriz empresarial exige seis capacidades mínimas por cada empresa activa.');

const protectedClickUpWriters = ['clickup-writeback', 'clickup-execute'];
for (const functionName of protectedClickUpWriters) {
  const path = join(root, `supabase/functions/${functionName}/index.ts`);
  const edge = readFileSync(path, 'utf8');
  if (!/requireAuth\(req,\s*\{\s*requireAdmin:\s*true\s*\}\)/.test(edge)) {
    throw new Error(`${functionName} puede escribir en ClickUp sin autenticación administrativa explícita.`);
  }
  if (!/clickup_sync_log/.test(edge) || !/syncAgeMs\s*>\s*2\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(edge)) {
    throw new Error(`${functionName} no bloquea escrituras cuando el espejo de ClickUp está vencido o con error.`);
  }
}
console.log(`${protectedClickUpWriters.length}/${protectedClickUpWriters.length} rutas de escritura ClickUp exigen administrador y evidencia fresca.`);
const clickUpExecutor = readFileSync(join(root, 'supabase/functions/clickup-execute/index.ts'), 'utf8');
const dailyClose = readFileSync(join(root, 'supabase/functions/pm-daily-close/index.ts'), 'utf8');
if (!/action_type\s*===\s*['"]reschedule['"]/.test(clickUpExecutor) || !/due_date:\s*dueAt/.test(clickUpExecutor)) {
  throw new Error('clickup-execute no implementa el cambio real de vencimiento para el carry-over diario.');
}
if (!/action_type:\s*['"]reschedule['"]/.test(dailyClose) || !/tasks_carried_over:\s*carried/.test(dailyClose) || !/Carry-over ClickUp incompleto/.test(dailyClose)) {
  throw new Error('pm-daily-close afirma mover tareas sin verificar ni registrar el resultado real.');
}
console.log('1/1 carry-over diario cambia la fecha real, cuenta éxitos y registra fallos.');

const rentalsFinance = readFileSync(join(root, 'supabase/functions/rentas-financiero/index.ts'), 'utf8');
if (!rentalsFinance.includes("reconcile_agent_proposal_set(${agent.id},'conciliacion','svc:'")
  || !/svcSeen\.push\(dedupKey\)/.test(rentalsFinance)) {
  throw new Error('Financiero Rentas no retira hallazgos de servicios que desaparecieron de un escaneo completo.');
}
console.log('1/1 escaneo de servicios retira hallazgos resueltos sin ejecutar decisiones.');

const whatsappSender = readFileSync(join(root, 'supabase/functions/whatsapp-send/index.ts'), 'utf8');
const whatsappCloudSender = readFileSync(join(root, 'supabase/functions/whatsapp-send-cloud/index.ts'), 'utf8');
const sharedAuth = readFileSync(join(root, 'supabase/functions/_shared/auth.ts'), 'utf8');
if (!/token\s*===\s*SERVICE_KEY/.test(sharedAuth) || !/role:\s*["']service_role["']/.test(sharedAuth)) {
  throw new Error('El autenticador compartido no reconoce de forma explícita el service role usado por crons internos.');
}
if (!/requireAuth\(req,\s*\{\s*requireAdmin:\s*true\s*\}\)/.test(whatsappSender)) {
  throw new Error('whatsapp-send puede emitir mensajes externos sin autenticación administrativa explícita.');
}
if (!/\['text',\s*'template',\s*'interactive'\]\.includes\(type\)/.test(whatsappSender)) {
  throw new Error('whatsapp-send no limita los tipos de mensaje aceptados.');
}
if (!/requireAuth\(req,\s*\{\s*requireAdmin:\s*true\s*\}\)/.test(whatsappCloudSender)) {
  throw new Error('whatsapp-send-cloud puede emitir mensajes masivos sin autenticación administrativa explícita.');
}
console.log('2/2 canales WhatsApp exigen administrador; el emisor genérico también valida el tipo de mensaje.');

const scheduledMutators = [
  'pm-coaching-prompts', 'pm-daily-close', 'pm-daily-push',
  'pm-group-report', 'pm-weekly-review', 'sync-remodel-airtable',
];
for (const functionName of scheduledMutators) {
  const edge = readFileSync(join(root, `supabase/functions/${functionName}/index.ts`), 'utf8');
  if (!/requireAuth\(req,\s*\{\s*requireAdmin:\s*true\s*\}\)/.test(edge)) {
    throw new Error(`${functionName} puede ejecutar trabajo programado sin service role o administrador.`);
  }
}
console.log(`${scheduledMutators.length}/${scheduledMutators.length} ejecutores programados exigen service role o administrador.`);

const whatsappWebhook = readFileSync(join(root, 'supabase/functions/whatsapp-webhook/index.ts'), 'utf8');
if (!/META_APP_SECRET/.test(whatsappWebhook) || !/x-hub-signature-256/.test(whatsappWebhook) || !/crypto\.subtle\.sign\('HMAC'/.test(whatsappWebhook)) {
  throw new Error('whatsapp-webhook procesa eventos sin verificar la firma HMAC de Meta.');
}
console.log('1/1 webhook de WhatsApp exige firma HMAC de Meta antes de ejecutar respuestas.');

const quickBooksOauth = readFileSync(join(root, 'supabase/functions/qb-oauth/index.ts'), 'utf8');
if (!/req\.method\s*!==\s*['"]POST['"]/.test(quickBooksOauth) || !/requireAuth\(req,\s*\{\s*requireAdmin:\s*true\s*\}\)/.test(quickBooksOauth)) {
  throw new Error('qb-oauth permite iniciar o consultar conexiones sin administrador autenticado.');
}
if (!/crypto\.subtle\.sign\('HMAC'/.test(quickBooksOauth) || !/crypto\.subtle\.verify\('HMAC'/.test(quickBooksOauth) || !/exp:\s*Date\.now\(\)\s*\+\s*10\s*\*\s*60_000/.test(quickBooksOauth)) {
  throw new Error('qb-oauth no firma o no vence el estado que vincula una empresa con un realm de QuickBooks.');
}
console.log('1/1 flujo OAuth de QuickBooks exige administrador y estado HMAC con vencimiento.');
