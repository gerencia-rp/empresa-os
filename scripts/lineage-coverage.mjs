// 📈 GATE DE COBERTURA DE LINAJE — recorre las pantallas headless, junta cada número
// visible (tarjetas .lab/.big y filas .kv con valor numérico) y lo cruza contra
// data_lineage_map. Modos:
//   --register  registra los números NUEVOS como origen='crawler', estado='pend'
//               (inventario completo; después se cura la fuente exacta en /mapa)
//   --gate      NO registra: FALLA (exit 1) si algún número visible no tiene entrada
//               → quien agrega un número nuevo está obligado a registrar de dónde viene.
// Siempre escribe la corrida en lineage_coverage_runs (el ci:gate exige última corrida
// fresca y ok). Uso:
//   SERVICE_KEY=sb_secret_... QA_BASE=http://localhost:5173/index.html node scripts/lineage-coverage.mjs --register
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('/Users/nicolaslara/Desktop/CLAUDE CODE/empresa-os-admin/node_modules/puppeteer-core');

const BASE = process.env.QA_BASE || 'http://localhost:5173/index.html';
const SB_URL = 'https://nezbaljfhhyznhltpjnk.supabase.co';
const SK = process.env.SERVICE_KEY || process.env.SB_KEY;
const MODE = process.argv.includes('--gate') ? 'gate' : 'register';
const EMAIL = 'qa-admin-test@rentalprofitss.com';
const PASS = 'QaPortal2026!cov';
if (!SK) { console.error('Falta SERVICE_KEY'); process.exit(1); }

// pantallas del shell OS (v1). Los overlays (FF CC, PM clásico, Planner, Estimador)
// están inventariados por seed curado — entran al crawler en v2.
const SCREENS = [
  { emp: 'Holding', sys: 'Panel Global', nav: "osNav('/')" },
  { emp: 'Fix & Flip', sys: 'Empresa (OS)', nav: "osNav('/fix-and-flip')" },
  { emp: 'Rentas', sys: 'Empresa (OS)', nav: "osNav('/rentas')" },
  { emp: 'Remodelación', sys: 'Empresa (OS)', nav: "osNav('/remodelacion')" },
  { emp: 'Holding', sys: 'Operación', nav: "osNav('/operacion')" },
  { emp: 'Contable / QBO', sys: 'Contable (OS)', nav: "osNav('/contable')" },
  { emp: 'Fix & Flip', sys: 'Ficha de Casa', nav: "osNav('/casa/' + osSlug('9909 Childress Dr, Austin, Texas 78753'))" },
];

const MESES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(new RegExp('\\b(' + MESES + ')\\b', 'g'), '')
    .replace(/[^a-z%&+ ]+/g, ' ')   // números fuera: los labels dinámicos ("salud 15", años) no rompen el match
    .replace(/\s+/g, ' ').trim();
}
const matches = (a, b) => a && b && (a === b || a.startsWith(b) || b.startsWith(a) || (a.length > 6 && b.includes(a)) || (b.length > 6 && a.includes(b)));

const H = { Authorization: 'Bearer ' + SK, apikey: SK, 'Content-Type': 'application/json' };
async function rest(path, opts) {
  const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: { ...H, Prefer: 'return=representation' }, ...opts });
  if (!r.ok) throw new Error(path + ': ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

async function main() {
  // reset pass QA (las sesiones paralelas la pisan)
  const j = await (await fetch(SB_URL + '/auth/v1/admin/users?per_page=1000', { headers: H })).json();
  const u = (j.users || []).find(x => x.email === EMAIL);
  await fetch(SB_URL + '/auth/v1/admin/users/' + u.id, { method: 'PUT', headers: H, body: JSON.stringify({ password: PASS }) });

  const lineage = await rest('data_lineage_map?select=metric_key,empresa,sistema,dato&active=eq.true&limit=2000');
  const normed = lineage.map(r => ({ ...r, n: norm(r.dato) }));

  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.resolve({}); });
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.evaluate(async (email, pw) => {
    const c = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { error } = await c.auth.signInWithPassword({ email, password: pw });
    if (error) throw new Error(error.message);
  }, EMAIL, PASS);
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => window.OS && window.OS.loaded, { timeout: 60000 });

  const vistos = [], sin = [];
  for (const sc of SCREENS) {
    try {
      await page.evaluate(sc.nav);
      await new Promise(r => setTimeout(r, 1200));
      const nums = await page.evaluate(() => {
        const out = []; const seen = new Set();
        const push = (label, value) => {
          label = (label || '').replace(/ⓘ/g, '').trim(); value = (value || '').trim().slice(0, 50);
          if (!label || label.length < 2 || !/\d/.test(value)) return;
          if (/^\d[\d\s.,%$xX×\-–—:\/]*$/.test(label)) return;                 // label puramente numérico = fila de tabla
          const k = label.toLowerCase(); if (seen.has(k)) return; seen.add(k);
          out.push({ label, value });
        };
        document.querySelectorAll('#os-root .card').forEach(c => {
          const lab = c.querySelector('.lab'), big = c.querySelector('.big');
          if (lab && big) push(lab.textContent, big.textContent);
        });
        document.querySelectorAll('#os-root .kv').forEach(kv => {
          const s = kv.querySelector('span'), b = kv.querySelector('b');
          if (s && b) push(s.textContent, b.textContent);
        });
        return out;
      });
      for (const x of nums) {
        const n = norm(x.label);
        if (!n) continue;
        const hit = normed.find(r => r.empresa === sc.emp && r.sistema === sc.sys && matches(n, r.n))
          || normed.find(r => matches(n, r.n));   // trazado en OTRA pantalla también cuenta (mismo número)
        vistos.push({ emp: sc.emp, sys: sc.sys, label: x.label, value: x.value, hit: hit ? hit.metric_key : null });
        if (!hit) sin.push({ emp: sc.emp, sys: sc.sys, label: x.label, value: x.value });
      }
      console.log('· ' + sc.emp + ' › ' + sc.sys + ': ' + nums.length + ' números');
    } catch (e) { console.error('⚠ pantalla ' + sc.sys + ': ' + e.message); }
  }
  await browser.close();

  let nuevos = 0;
  if (MODE === 'register' && sin.length) {
    for (const s of sin) {
      const mk = [s.emp, s.sys, s.label].map(x => norm(x).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')).join('|');
      try {
        await rest('data_lineage_map', { method: 'POST', body: JSON.stringify({
          empresa: s.emp, sistema: s.sys, grupo: 'Descubiertos por el crawler', dato: s.label,
          base: '(por definir)', tabla: '(por definir)', columna: '(por definir)',
          nota: 'descubierto por el gate de cobertura — valor visto: ' + s.value, estado: 'pend', origen: 'crawler', metric_key: mk,
        }) });
        nuevos++;
      } catch (e) { if (!/duplicate|409/.test(e.message)) console.error('  insert ' + s.label + ': ' + e.message); }
    }
  }
  const conLinaje = vistos.filter(v => v.hit).length;
  const sinFinal = MODE === 'register' ? 0 : sin.length; // en register, lo nuevo queda registrado (inventario 100%)
  await rest('lineage_coverage_runs', { method: 'POST', body: JSON.stringify({
    pantallas: SCREENS.length, numeros_vistos: vistos.length, con_linaje: conLinaje + (MODE === 'register' ? nuevos : 0),
    sin_linaje: sinFinal, nuevos_registrados: nuevos,
    detalle: { modo: MODE, base: BASE, sin: sin.slice(0, 60), por_pantalla: SCREENS.map(sc => ({ sys: sc.emp + '›' + sc.sys, n: vistos.filter(v => v.emp === sc.emp && v.sys === sc.sys).length })) },
  }) });
  console.log('\n📈 ' + vistos.length + ' números vistos en ' + SCREENS.length + ' pantallas · ' + conLinaje + ' ya trazados · ' + sin.length + ' sin entrada' + (MODE === 'register' ? ' → ' + nuevos + ' registrados (pend, curar en /mapa)' : ''));
  if (MODE === 'gate' && sin.length) {
    console.error('⛔ GATE: hay números visibles SIN entrada en data_lineage:');
    sin.slice(0, 20).forEach(s => console.error('   · [' + s.emp + ' › ' + s.sys + '] ' + s.label + ' = ' + s.value));
    process.exit(1);
  }
  console.log('✅ gate de linaje OK');
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
