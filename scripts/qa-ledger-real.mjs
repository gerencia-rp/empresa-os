// CARGA REAL del Ledger en prod: login por formulario, navegación normal, click en la
// pestaña 💰 Ledger y selección de casa por el <select>. SIN stubs, SIN forzar osInit().
// Comprueba que las filas subcategoria='servicio_deuda' se RENDERIZAN y que el total
// "Servicio de deuda" del encabezado cuadra con la suma de esas filas.
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE || 'https://empresa-os-admin.vercel.app';
const CHROME = process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EMAIL = process.env.QA_EMAIL || 'qa-admin-test@rentalprofitss.com';
const PASS = process.env.QA_PASS;
const CASA = process.env.QA_CASA || 'Michelle';
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

// login real
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('#auth-email', { timeout: 20000 });
await page.type('#auth-email', EMAIL, { delay: 10 });
await page.type('#auth-password', PASS, { delay: 10 });
await page.click('#auth-login-btn');
for (let i = 0; i < 40; i++) { if (await page.evaluate(() => !!document.getElementById('os-root'))) break; await sleep(500); }
await sleep(2000);
chk('login real OK', await page.evaluate(() => document.getElementById('auth-password') ? document.getElementById('auth-password').offsetParent === null : true));

// navegación normal + espera del módulo
await page.evaluate(() => window.osNav('/inversionistas'));
for (let i = 0; i < 60 && !(await page.evaluate(() => !!(window.IA && window.IA.loaded))); i++) await sleep(500);
await sleep(800);
chk('/inversionistas cargado (IA.loaded)', await page.evaluate(() => !!(window.IA && window.IA.loaded)));

// click en la pestaña 💰 Ledger
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll('#os-root button')].find(x => /Ledger/.test(x.textContent));
  if (!b) return 'no encontré la pestaña Ledger'; b.click(); return 'ok';
});
chk('pestaña 💰 Ledger clickeada', clicked === 'ok', clicked);
// esperar a que la RPC del ledger devuelva
for (let i = 0; i < 60 && await page.evaluate(() => /Armando el ledger/.test(document.getElementById('os-root').innerText)); i++) await sleep(500);
await sleep(1200);

// elegir la casa por el <select> real (dispara iaSetCasa → nueva RPC)
const sel = await page.evaluate((CASA) => {
  const s = [...document.querySelectorAll('#os-root select')].find(x => [...x.options].some(o => o.textContent.includes(CASA)));
  if (!s) return 'no encontré el selector de casa';
  const opt = [...s.options].find(o => o.textContent.includes(CASA));
  if (!opt) return 'no está la casa en el selector';
  s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true }));
  return opt.textContent.trim();
}, CASA);
chk('casa "' + CASA + '" seleccionada en el selector', !/^no /.test(sel), sel);
for (let i = 0; i < 60 && await page.evaluate(() => /Armando el ledger/.test(document.getElementById('os-root').innerText)); i++) await sleep(500);
await sleep(1500);

// ── lo que IMPORTA: ¿se ven las filas de servicio de deuda? ──
const r = await page.evaluate(() => {
  const root = document.getElementById('os-root');
  const txt = root.innerText;
  const filas = [...root.querySelectorAll('table.ptable tbody tr')].map(tr =>
    [...tr.querySelectorAll('td')].map(td => td.innerText.trim()));
  const deuda = filas.filter(f => /Pago interés HML|Pago refi 30 años/.test(f[1] || ''));
  const mTot = txt.match(/Servicio de deuda[^:]*:\s*\$?([\d.,]+)/i);
  // lo que la RPC devolvió realmente para la casa seleccionada (cache del front)
  const cache = (window.IA && window.IA.ledgerCache && window.IA.ledgerCache[window.IA.casa]) || null;
  const rpcDeuda = Array.isArray(cache) ? cache.filter(x => x.subcategoria === 'servicio_deuda') : null;
  return {
    casa: window.IA && window.IA.casa,
    totalFilas: filas.length,
    filasDeuda: deuda.length,
    ejemplos: deuda.slice(0, 3).map(f => f.slice(0, 4).join(' | ')),
    badge: /servicio de deuda/i.test(txt),
    totalHeader: mTot ? mTot[1] : null,
    rpcFilas: Array.isArray(cache) ? cache.length : null,
    rpcDeudaN: rpcDeuda ? rpcDeuda.length : null,
    rpcDeudaSuma: rpcDeuda ? rpcDeuda.reduce((s, x) => s + (+x.monto || 0), 0) : null,
    tieneSubcat: Array.isArray(cache) && cache.length ? Object.keys(cache[0]).includes('subcategoria') : null,
  };
});
chk('la RPC del front trae la columna subcategoria', r.tieneSubcat === true, JSON.stringify({ rpcFilas: r.rpcFilas, tieneSubcat: r.tieneSubcat }));
chk('la RPC del front trae filas servicio_deuda', r.rpcDeudaN > 0, 'n=' + r.rpcDeudaN + ' suma=' + r.rpcDeudaSuma);
chk('las filas de deuda se RENDERIZAN en la tabla', r.filasDeuda > 0, r.filasDeuda + ' de ' + r.totalFilas + ' filas · ej: ' + (r.ejemplos[0] || '—'));
chk('badge "servicio de deuda" visible', r.badge);
chk('total "Servicio de deuda" en el encabezado', r.totalHeader != null, 'valor: ' + r.totalHeader);
chk('el total del encabezado cuadra con la suma de la RPC',
  r.totalHeader != null && r.rpcDeudaSuma != null &&
  Math.abs(parseFloat(String(r.totalHeader).replace(/,/g, '')) - r.rpcDeudaSuma) < 1.01,
  'header=' + r.totalHeader + ' vs rpc=' + (r.rpcDeudaSuma != null ? r.rpcDeudaSuma.toFixed(2) : '—'));
chk('0 pageerrors', pageerrors.length === 0, pageerrors.join(' | '));

if (process.env.QA_SHOTS) await page.screenshot({ path: 'ledger-real.png' });
console.log('\n🚦 LEDGER · CARGA REAL (' + BASE + ' · casa ' + CASA + ') — ' + ok.length + ' OK · ' + fail.length + ' FALLAS');
ok.forEach(x => console.log('  ✓ ' + x));
fail.forEach(x => console.log('  ✗ ' + x));
if (r.ejemplos.length) { console.log('\n  filas de deuda renderizadas:'); r.ejemplos.forEach(e => console.log('   · ' + e)); }
if (pageerrors.length) { console.log('\n  PAGEERRORS:'); pageerrors.forEach(e => console.log('   ✗ ' + e)); }
await browser.close();
process.exit(fail.length ? 1 : 0);
