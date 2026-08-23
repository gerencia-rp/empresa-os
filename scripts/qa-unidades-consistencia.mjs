// CARGA REAL logueada: verifica que el conteo de unidades y la ocupación sean CONSISTENTES
// (misma cifra que v_ocupacion = 51/36/70.59%) en OS Global y en el Property Manager (Rentas).
// Uso: RP_QA_ADMIN_EMAIL=… RP_QA_ADMIN_PASSWORD=… node scripts/qa-unidades-consistencia.mjs
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE || 'https://empresa-os-admin.vercel.app';
const CHROME = process.env.QA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EMAIL = process.env.RP_QA_ADMIN_EMAIL;
const PASS = process.env.RP_QA_ADMIN_PASSWORD;
if (!EMAIL || !PASS) { console.error('Falta RP_QA_ADMIN_EMAIL / RP_QA_ADMIN_PASSWORD'); process.exit(1); }

const ok = [], fail = [], pageerrors = [];
const chk = (n, c, e) => (c ? ok : fail).push(n + (e ? ' — ' + e : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100 });
await page.evaluateOnNewDocument(() => { try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {} });
page.on('pageerror', e => pageerrors.push(e.message));

// 1) LOGIN
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('#auth-email', { timeout: 20000 });
await page.type('#auth-email', EMAIL, { delay: 10 });
await page.type('#auth-password', PASS, { delay: 10 });
await page.click('#auth-login-btn');
// login OK = el input de email desaparece (overlay de auth cerrado)
let logged = false;
for (let i = 0; i < 60; i++) {
  logged = await page.evaluate(() => !document.getElementById('auth-email'));
  if (logged) break;
  await sleep(500);
}
chk('login real (overlay de auth cerrado)', logged);

// 2) OS GLOBAL — esperar a que OS.ocup (v_ocupacion) cargue
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
for (let i = 0; i < 40; i++) {
  if (await page.evaluate(() => !!(window.OS && window.OS.ocup))) break;
  await sleep(500);
}
const global = await page.evaluate(() => {
  const t = document.body.innerText || '';
  const os = window.OS || {};
  return { ocupView: os.ocup || null, snippet: (t.match(/ocupaci[oó]n[\s\S]{0,60}/i) || [''])[0] };
});
chk('OS Global: v_ocupacion cargada (51 unidades rentables)',
  global.ocupView && +global.ocupView.unidades_rentables === 51,
  global.ocupView ? `${global.ocupView.unidades_rentables}u / ${global.ocupView.ocupadas}ocup / ${global.ocupView.ocupacion_pct}%` : 'sin ocupView');

// 3) PROPERTY MANAGER (Rentas) — abrir el clásico y leer subtítulo + funciones canónicas
await page.goto(BASE + '/rentas', { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(2000);
// abrir el Property Manager (sistema clásico) desde el OS
await page.evaluate(() => {
  const el = [...document.querySelectorAll('button,a,div,span')]
    .find(e => /Property Manager|Administrador de Propiedades|Rentas.*Manager|🏠.*Propiedades/i.test(e.textContent) && e.textContent.length < 60);
  if (el) el.click();
});
await sleep(6000);
const pm = await page.evaluate(() => {
  const out = { hasPmState: !!window.pmaState, calc: null, subtitle: null };
  try {
    if (typeof pmPhysOccupancy === 'function') out.calc = pmPhysOccupancy();
  } catch (e) { out.err = e.message; }
  const st = [...document.querySelectorAll('*')].map(n => n.childNodes.length === 1 ? n.textContent : '')
    .find(s => /propiedades ·.*unidades rentables/i.test(s || ''));
  out.subtitle = st ? st.trim().slice(0, 160) : null;
  return out;
});
chk('PM: pmPhysOccupancy() = 51 total / 36 ocupadas',
  pm.calc && pm.calc.total === 51 && pm.calc.occupied === 36,
  pm.calc ? `${pm.calc.total}/${pm.calc.occupied}/${Math.round(pm.calc.pct*100)}% (${pm.calc.fuente})` : (pm.err || 'sin pmPhysOccupancy'));
chk('PM: invariante ocup+libres+reserv+mant = total',
  pm.calc && (pm.calc.occupied + pm.calc.free + pm.calc.reserved + pm.calc.maintenance === pm.calc.total),
  pm.calc ? `${pm.calc.occupied}+${pm.calc.free}+${pm.calc.reserved}+${pm.calc.maintenance}` : '');
if (pm.subtitle) chk('PM: subtítulo lista propiedades (51 unidades)', /51 unidades rentables/.test(pm.subtitle), pm.subtitle);

chk('0 pageerrors', pageerrors.length === 0, pageerrors.slice(0, 3).join(' || '));

console.log('\n===== QA UNIDADES/OCUPACIÓN CONSISTENCIA =====');
console.log('OK   (' + ok.length + '):'); ok.forEach(x => console.log('  ✅ ' + x));
console.log('FAIL (' + fail.length + '):'); fail.forEach(x => console.log('  ❌ ' + x));
console.log('pageerrors:', pageerrors.length);
await browser.close();
process.exit(fail.length ? 1 : 0);
