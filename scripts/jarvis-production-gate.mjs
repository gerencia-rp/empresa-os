import { PUBLIC_ANON_KEY } from '../api/_pm-report-data.mjs';

const REST = 'https://nezbaljfhhyznhltpjnk.supabase.co/rest/v1/';
let token = process.env.SB_KEY || '';
const apiKey = process.env.SB_APIKEY || PUBLIC_ANON_KEY;
if (!token) {
  const qaPass = process.env.QA_PASS || '';
  if (!qaPass) {
    console.error('Falta SB_KEY o QA_PASS. La certificación nunca guarda secretos en el repositorio.');
    process.exit(1);
  }
  const login = await fetch('https://nezbaljfhhyznhltpjnk.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qa-admin-test@rentalprofitss.com', password: qaPass }),
  });
  const auth = await login.json().catch(() => ({}));
  token = auth.access_token || '';
  if (!login.ok || !token) {
    console.error('No se pudo iniciar la sesión administrativa de QA.');
    process.exit(1);
  }
}

async function query(path) {
  const response = await fetch(REST + path, {
    headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`${path} → ${response.status}: ${(await response.text()).slice(0, 180)}`);
  return response.json();
}

const passed = [];
const failed = [];
const check = (name, condition, detail = '') => {
  (condition ? passed : failed).push(`${name}${detail ? ` — ${detail}` : ''}`);
};

const [gaps, automations, businesses, roles, findings, reports] = await Promise.all([
  query('v_automation_expectation_gaps?select=jobname'),
  query('v_automation_effective_health?select=jobname,criticality,effective_health,evidence_at,evidence_error'),
  query('v_business_agent_coverage?select=slug,name,cobertura_completa,capacidades_faltantes'),
  query('v_operational_role_coverage?select=role_code,role_name,primary_ready,backup_ready'),
  query('v_financial_findings_actionable?select=check_id,responsable,evidencia_requerida,siguiente_accion,prioridad_operativa'),
  query('pm_informes?select=tipo,corte,payload,updated_at&tipo=in.(salud_automatizaciones,salud_integraciones,continuidad_ausencia_6_meses)&archived_at=is.null&order=corte.desc'),
]);

check('Horarios activos catalogados', gaps.length === 0, `${gaps.length} sin dueño/frecuencia`);
check('Vigilante con inventario', automations.length >= 55, `${automations.length} automatizaciones visibles`);
const falseGreens = automations.filter(row => row.effective_health === 'healthy'
  && (!row.evidence_at || row.evidence_error));
check('Sin verdes falsos', falseGreens.length === 0, `${falseGreens.length} resultados inconsistentes`);
const p1Failures = automations.filter(row => row.criticality === 'P1' && row.effective_health !== 'healthy');
check('Automatizaciones P1 saludables', p1Failures.length === 0,
  p1Failures.map(row => row.jobname).slice(0, 6).join(', ') || 'sin fallos');

check('Empresas canónicas presentes', businesses.length >= 4, `${businesses.length} empresas`);
const incompleteBusinesses = businesses.filter(row => !row.cobertura_completa);
check('Seis capacidades por empresa', incompleteBusinesses.length === 0,
  incompleteBusinesses.map(row => `${row.name}: ${(row.capacidades_faltantes || []).join('/')}`).join(' · '));

check('Nueve roles humanos versionados', roles.length === 9, `${roles.length} roles`);
const uncoveredRoles = roles.filter(row => !row.primary_ready || !row.backup_ready);
check('Titular y respaldo confirmados', uncoveredRoles.length === 0,
  `${uncoveredRoles.length} roles todavía dependen de Nicolás`);

const incompleteFindings = findings.filter(row => !row.responsable || !row.evidencia_requerida
  || !row.siguiente_accion || !row.prioridad_operativa);
check('Hallazgos financieros accionables', incompleteFindings.length === 0,
  `${incompleteFindings.length} hallazgos sin resolución completa`);

for (const type of ['salud_automatizaciones', 'salud_integraciones', 'continuidad_ausencia_6_meses']) {
  const latest = reports.find(report => report.tipo === type);
  check(`Informe vigente: ${type}`, !!latest && !!latest.updated_at, latest ? String(latest.corte) : 'ausente');
}

console.log(`\nCertificación Jarvis producción — ${passed.length} aprobadas · ${failed.length} pendientes`);
passed.forEach(item => console.log(`  ✓ ${item}`));
failed.forEach(item => console.log(`  ✗ ${item}`));
if (failed.length) process.exit(1);
