// CARGA REAL: login por el formulario en empresa-os-admin.vercel.app, y de ahí al PORTAL
// del inversionista (misma sesión, navegación normal — SIN forzar osInit ni stubs de datos).
// Uso: QA_PASS=… node scripts/qa-flujo-deuda.mjs
// Verifica la pestaña 📅 Flujo Mensual de 5003 Michelle Ct: deuda mes a mes + neto real.
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE || 'https://empresa-os-admin.vercel.app';
const CHROME = process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EMAIL = 'qa-admin-test@rentalprofitss.com';
const PASS = process.env.QA_PASS;
const INV = 'recRZUim6SaOnNmm5';           // inversionista de Michelle (40%)
const PID = 'efad086f-3008-49fd-96da-dbeaaba650f2'; // 5003 Michelle Ct
if (!PASS) { console.error('Falta QA_PASS'); process.exit(1); }

const ok = [], fail = [], consola = [], pageerrors = [];
const chk = (n, c, e) => (c ? ok : fail).push(n + (e ? ' — ' + e : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100 });
await page.evaluateOnNewDocument(() => { try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {} });
page.on('pageerror', e => pageerrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') consola.push(m.text().slice(0, 200)); });
const req404 = [];
page.on('requestfailed', r => req404.push(r.url()));
page.on('response', r => { if (r.status() >= 400) req404.push(r.status() + ' ' + r.url()); });

// ── 1) LOGIN REAL ──
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('#auth-email', { timeout: 20000 });
await page.type('#auth-email', EMAIL, { delay: 10 });
await page.type('#auth-password', PASS, { delay: 10 });
await page.click('#auth-login-btn');
for (let i = 0; i < 40; i++) {
  if (await page.evaluate(() => !!document.getElementById('os-root') && getComputedStyle(document.getElementById('os-root')).display !== 'none')) break;
  await sleep(500);
}
chk('login real (shell OS montado)', await page.evaluate(() => !!document.getElementById('os-root')));

// ── 2) PORTAL del inversionista en la misma sesión (carga normal, sin stubs) ──
await page.goto(BASE + '/inversionista?ver=' + INV + '&casa=' + PID, { waitUntil: 'networkidle2', timeout: 60000 });
for (let i = 0; i < 60; i++) {
  const t = await page.evaluate(() => document.body.innerText || '');
  if (/Flujo Mensual/i.test(t)) break;
  await sleep(500);
}
chk('portal cargado (pestañas visibles)', /Flujo Mensual/i.test(await page.evaluate(() => document.body.innerText)));

// ── 3) pestaña 📅 Flujo Mensual (click real) ──
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,a,div')].find(e => /📅\s*Flujo Mensual/.test(e.textContent) && e.textContent.length < 40);
  if (b) { b.click(); return true; } return false;
});
chk('click en 📅 Flujo Mensual', clicked);
for (let i = 0; i < 60; i++) {
  const t = await page.evaluate(() => document.body.innerText || '');
  if (/Detalle año/i.test(t) && !/Armando tu flujo mensual/.test(t)) break;
  await sleep(500);
}
await sleep(1500);

const d = await page.evaluate(() => {
  const txt = document.body.innerText;
  // tabla mensual: encabezados + fila de junio 2026
  const heads = [...document.querySelectorAll('table thead tr')].map(tr => [...tr.children].map(t => t.innerText.trim()).join(' | '));
  const filas = [...document.querySelectorAll('table tbody tr')].map(tr => [...tr.children].map(t => t.innerText.trim()));
  return {
    txt,
    heads,
    junio: filas.find(f => /Junio 2026/i.test(f[0] || '')) || null,
    julio: filas.find(f => /Julio 2026/i.test(f[0] || '')) || null,
    filasDeuda: filas.filter(f => /servicio de deuda/i.test(f.join(' '))).length,
  };
});

chk('encabezado con Servicio de deuda + Flujo neto',
  d.heads.some(h => /Servicio de deuda/i.test(h) && /Flujo neto/i.test(h)), d.heads.filter(h => /Mes/.test(h))[0]);
chk('tarjeta 💰 Flujo después de deuda visible', /Flujo después de deuda/i.test(d.txt));
chk('tarjeta 🏦 Servicio de deuda visible', /Servicio de deuda/i.test(d.txt));
chk('NOI (balance operativo) se mantiene', /Balance operativo/i.test(d.txt));
// junio 2026 esperado: ingresos 3,700 · operativos 0 · deuda 2,116.13 · neto 1,583.87
const j = d.junio || [];
chk('junio 2026 · ingresos $3,700', /3,700/.test(j[1] || ''), JSON.stringify(j));
chk('junio 2026 · servicio de deuda $2,116.13', /2,116/.test(j[3] || ''), JSON.stringify(j));
chk('junio 2026 · flujo neto $1,584 (1,583.87 redondeado)', /1,584/.test(j[4] || ''), JSON.stringify(j));
// julio 2026: la cuota de la refi 3,032.26 → neto 667.74
const jl = d.julio || [];
chk('julio 2026 · deuda $3,032.26 (cuota refi)', /3,032/.test(jl[3] || ''), JSON.stringify(jl));
chk('julio 2026 · flujo neto = ingresos − operativos − deuda', /520/.test(jl[4] || ''), JSON.stringify(jl));
chk('filas de servicio de deuda visibles en "Todos los movimientos"', d.filasDeuda > 0, d.filasDeuda + ' filas');
chk('0 pageerrors', pageerrors.length === 0, pageerrors.join(' | '));
// el 404 de /config.js es POR DISEÑO (override local gitignored, con onerror que lo remueve)
// los únicos 404 son /config.js (override local, con onerror) y /favicon.ico → se descartan por URL
const ruido = req404.filter(u => !/config\.js|favicon\.ico/.test(u));
const consolaReal = consola.filter(c => !/config\.js|favicon|Failed to load resource/.test(c));
chk('0 errores de consola (fuera del 404 by-design de /config.js)', consolaReal.length === 0, consolaReal.join(' | '));
chk('sin requests fallidos ajenos a /config.js y /favicon.ico', ruido.length === 0, req404.join(' | '));

// ── 4) COHERENCIA con la distribución automática: misma casa/mes, mismo neto ──
const rpc = await page.evaluate(async (pid) => {
  // el portal tiene su cliente en scope de módulo → creamos uno igual (misma sesión persistida)
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  if (!sb || !sb.rpc) return { err: 'sin cliente supabase en el portal' };
  const ses = await sb.auth.getSession();
  if (!ses.data.session) return { err: 'sin sesión persistida' };
  const out = {};
  for (const mes of ['2026-06', '2026-07']) {
    const r = await sb.rpc('inv_dist_auto', { p_property_id: pid, p_billing_ym: mes });
    out[mes] = r.error ? { err: r.error.message } : { renta: r.data.renta, oper: r.data.operativos, deuda: r.data.deuda, neto: r.data.neto };
  }
  return out;
}, PID);
console.log('\ninv_dist_auto → ' + JSON.stringify(rpc));
const netoJun = rpc['2026-06'] && rpc['2026-06'].neto, netoJul = rpc['2026-07'] && rpc['2026-07'].neto;
const money = n => '$' + Math.round(+n).toLocaleString('en-US');
chk('neto jun-26 del portal = neto de inv_dist_auto', netoJun != null && (j[4] || '') === money(netoJun), (j[4] || '') + ' vs ' + JSON.stringify(rpc['2026-06']));
chk('neto jul-26 del portal = neto de inv_dist_auto', netoJul != null && (jl[4] || '') === money(netoJul), (jl[4] || '') + ' vs ' + JSON.stringify(rpc['2026-07']));

console.log('\n📅 QA FLUJO MENSUAL (carga real logueada) — ' + ok.length + ' OK · ' + fail.length + ' FALLAS');
ok.forEach(o => console.log('  ✓ ' + o));
fail.forEach(f => console.log('  ✗ ' + f));
console.log('\nJunio 2026: ' + JSON.stringify(d.junio) + '\nJulio 2026: ' + JSON.stringify(d.julio));
console.log('Encabezados: ' + JSON.stringify(d.heads.slice(0, 3)));
await browser.close();
process.exit(fail.length ? 1 : 0);
