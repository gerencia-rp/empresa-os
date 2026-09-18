// CARGA REAL del panel de Accesos del portal de inversionistas (/inversionistas → tab Accesos).
// Login por el formulario, navegación normal, sin stubs de estado ni osInit forzado.
//
// Qué verifica (18-sep-2026, migración 20260917100000_control_accesos_inversionistas):
//   1. El dominio sirve el build nuevo (window.__APP_VERSION__ con commit real, no "local").
//   2. La tabla trae las columnas nuevas: Estado · Rol / permiso · Casas con acceso.
//   3. Cada fila trae las 4 acciones: Pausar/Reactivar · Revocar · 🏠 Casas · 🔑 Rol.
//   4. Los accesos REVOCADOS aparecen (antes la consulta filtraba active=true y no se veían).
//   5. Pausar → Reactivar sobre la cuenta de QA funciona de punta a punta: el botón llama a
//      inv_admin_set_estado, el estado cambia en pantalla y vuelve a su valor original.
//   6. Los editores de 🏠 Casas y 🔑 Rol abren y cierran (no se guardan: no se tocan permisos).
//
// La cuenta que se toca es qa-investor-test@rentalprofitss.com y queda como estaba (activo).
// Cada acción deja rastro en inv_audit; al final el script imprime cómo verlo.
//
// Uso: QA_PASS=… node scripts/qa-accesos-panel.mjs
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE || 'https://empresa-os.vercel.app';
const CHROME = process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EMAIL = process.env.QA_EMAIL || 'qa-admin-test@rentalprofitss.com';
const PASS = process.env.QA_PASS;
const OBJETIVO = process.env.QA_TARGET || 'qa-investor-test@rentalprofitss.com';
if (!PASS) { console.error('Falta QA_PASS'); process.exit(1); }

const ok = [], fail = [], pageerrors = [];
const chk = (n, c, e) => (c ? ok : fail).push(n + (e ? ' — ' + e : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1300 });
await page.evaluateOnNewDocument(() => {
  try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {}
  // las acciones piden confirmación: se aceptan automáticamente. prompt devuelve '' para que
  // la ruta de "convertir en ADMIN" quede CANCELADA aunque alguien la dispare por error.
  window.confirm = () => true;
  window.prompt = () => '';
});
page.on('pageerror', e => pageerrors.push(e.message));

// ── helpers de la tabla de accesos ──
const filaDe = email => page.evaluate(em => {
  const tr = [...document.querySelectorAll('#os-root table tbody tr')]
    .find(r => r.innerText.includes(em) && !r.querySelector('td[colspan]'));
  if (!tr) return null;
  const c = [...tr.children].map(td => td.innerText.trim());
  return {
    inversionista: c[0], email: c[1], estado: c[2], rol: c[3], casas: c[4],
    botones: [...tr.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean),
  };
}, email);

const clickEnFila = (email, texto) => page.evaluate((em, tx) => {
  const tr = [...document.querySelectorAll('#os-root table tbody tr')]
    .find(r => r.innerText.includes(em) && !r.querySelector('td[colspan]'));
  if (!tr) return false;
  const b = [...tr.querySelectorAll('button')].find(x => x.innerText.includes(tx));
  if (!b) return false;
  b.click(); return true;
}, email, texto);

const esperarEstado = async (email, estado) => {
  for (let i = 0; i < 60; i++) {
    const f = await filaDe(email);
    if (f && new RegExp(estado, 'i').test(f.estado)) return true;
    await sleep(500);
  }
  return false;
};

// ══ LOGIN ══
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
const ver = await page.evaluate(() => window.__APP_VERSION__ || null);
chk('build servido por ' + BASE + ' (' + (ver ? ver.version + ' · ' + ver.commit + ' · ' + ver.builtAt : 'sin __APP_VERSION__') + ')',
  !!ver && ver.commit !== 'local');
await page.waitForSelector('#auth-email', { timeout: 20000 });
await page.type('#auth-email', EMAIL, { delay: 10 });
await page.type('#auth-password', PASS, { delay: 10 });
await page.click('#auth-login-btn');
for (let i = 0; i < 40 && !(await page.evaluate(() => !!document.getElementById('os-root'))); i++) await sleep(500);
chk('login real como ' + EMAIL, await page.evaluate(() => !!document.getElementById('os-root')));

// el admin NO debe ser redirigido al portal del inversionista
chk('el admin NO cae en /inversionista', !/\/inversionista$/.test(page.url()), page.url());

// ══ /inversionistas → tab Accesos ══
await page.evaluate(() => window.osNav('/inversionistas'));
for (let i = 0; i < 90 && !(await page.evaluate(() => !!(window.IA && window.IA.loaded))); i++) await sleep(500);
chk('/inversionistas cargado (IA.loaded)', await page.evaluate(() => !!(window.IA && window.IA.loaded)));
chk('los accesos vienen de la RPC de admin (IA.accRpc)', await page.evaluate(() => window.IA && window.IA.accRpc === true));
await page.evaluate(() => window.iaGoTab && window.iaGoTab('accesos'));
await sleep(800);

const encabezados = await page.evaluate(() => {
  const t = [...document.querySelectorAll('#os-root table')].find(x => /Rol \/ permiso/.test(x.innerText));
  return t ? [...t.querySelectorAll('thead th')].map(th => th.innerText.trim()) : [];
});
for (const col of ['Estado', 'Rol / permiso', 'Casas con acceso', 'Acciones']) {
  chk('columna "' + col + '" en la tabla', encabezados.some(h => h.includes(col)), encabezados.join(' | '));
}

// los revocados tienen que estar listados (antes se filtraban por active=true)
const revocados = await page.evaluate(() => (window.IA.access || []).filter(a => a.estado === 'revocado').map(a => a.email));
chk('los accesos revocados se listan (' + revocados.length + ')', revocados.length > 0, revocados.join(', '));

// ══ la fila objetivo trae las 4 acciones ══
const f0 = await filaDe(OBJETIVO);
chk('fila de ' + OBJETIVO + ' visible', !!f0);
if (f0) {
  for (const b of ['Invitar', 'Casas', 'Rol', 'Pausar', 'Revocar']) {
    chk('acción "' + b + '" en la fila', f0.botones.some(x => x.includes(b)), f0.botones.join(' | '));
  }
  chk('la fila declara casas con acceso', !!f0.casas, JSON.stringify(f0.casas));
}

// ══ PAUSAR → REACTIVAR (de punta a punta contra inv_admin_set_estado) ══
const estadoOriginal = f0 && f0.estado;
chk('estado inicial = activo', /activo/i.test(estadoOriginal || ''), estadoOriginal);
chk('click en Pausar', await clickEnFila(OBJETIVO, 'Pausar'));
chk('la fila pasa a PAUSADO en pantalla', await esperarEstado(OBJETIVO, 'pausado'));
const fPaus = await filaDe(OBJETIVO);
chk('pausado deja de ver casas', /ninguna|acceso pausado/i.test((fPaus && fPaus.casas) || ''), fPaus && fPaus.casas);
chk('click en Reactivar', await clickEnFila(OBJETIVO, 'Reactivar'));
chk('la fila vuelve a ACTIVO', await esperarEstado(OBJETIVO, 'activo'));

// ══ editores (abrir y cancelar — no se guarda nada) ══
chk('el editor de 🏠 Casas abre', await clickEnFila(OBJETIVO, 'Casas') && (await sleep(600), await page.evaluate(() => /A qué casas tiene acceso/i.test(document.getElementById('os-root').innerText))));
await page.evaluate(() => { const b = [...document.querySelectorAll('#os-root button')].find(x => x.innerText.trim() === 'Cancelar'); if (b) b.click(); });
await sleep(500);
chk('el editor de 🔑 Rol abre', await clickEnFila(OBJETIVO, 'Rol') && (await sleep(600), await page.evaluate(() => /Permiso de/i.test(document.getElementById('os-root').innerText))));
await page.evaluate(() => { const b = [...document.querySelectorAll('#os-root button')].find(x => x.innerText.trim() === 'Cancelar'); if (b) b.click(); });
await sleep(500);

// ══ estado final: la cuenta quedó como estaba ══
const fFin = await filaDe(OBJETIVO);
chk('la cuenta de QA queda como estaba (activo)', /activo/i.test((fFin && fFin.estado) || ''), fFin && fFin.estado);

chk('0 errores de consola', pageerrors.length === 0, pageerrors.join(' || '));

await browser.close();
console.log('\n✅ OK (' + ok.length + ')'); ok.forEach(x => console.log('   ' + x));
if (fail.length) { console.log('\n❌ FALLA (' + fail.length + ')'); fail.forEach(x => console.log('   ' + x)); }
console.log('\nRastro de auditoría de esta corrida:');
console.log("  select at, tabla, accion, editado_por, antes->>'estado', despues->>'estado'");
console.log('    from inv_audit where at > now() - interval \'10 minutes\' order by at;');
process.exit(fail.length ? 1 : 0);
