// Verificación EN VIVO del rediseño del Centro de Mando (Inicio + sidebar + Casas + Decisiones).
// Sirve dist/ local, loguea por el formulario real y navega como el usuario. Sin stubs.
// Uso: QA_CHROME=... RP_QA_ADMIN_EMAIL=... RP_QA_ADMIN_PASSWORD=... node scripts/qa-inicio-verify.mjs
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { existsSync } from 'node:fs';
import { join, extname } from 'node:path'; import puppeteer from 'puppeteer-core';

const DIST = join(process.cwd(), 'dist');
const CHROME = process.env.QA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EMAIL = process.env.RP_QA_ADMIN_EMAIL, PASS = process.env.RP_QA_ADMIN_PASSWORD;
if (!EMAIL || !PASS) { console.error('Faltan RP_QA_ADMIN_EMAIL / RP_QA_ADMIN_PASSWORD'); process.exit(1); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  let f = join(DIST, p);
  if (!existsSync(f) && !extname(p)) f = join(DIST, 'index.html'); // SPA fallback
  try { const b = await readFile(f); res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end('404'); }
});
await new Promise(r => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port;
console.log('sirviendo dist en', BASE);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = [], fail = [], pageerrors = [], consola = [];
const chk = (n, c, e) => { (c ? ok : fail).push(n + (e ? ' — ' + e : '')); console.log((c ? '✓' : '✗') + ' ' + n + (e && !c ? ' — ' + e : '')); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
await page.evaluateOnNewDocument(() => { try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {} });
page.on('pageerror', e => pageerrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') consola.push(m.text().slice(0, 160)); });

await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('#auth-email', { timeout: 20000 });
await page.type('#auth-email', EMAIL, { delay: 8 });
await page.type('#auth-password', PASS, { delay: 8 });
await page.click('#auth-login-btn');
for (let i = 0; i < 40; i++) { if (await page.evaluate(() => { const r = document.getElementById('os-root'); return !!r && getComputedStyle(r).display !== 'none'; })) break; await sleep(500); }
await sleep(3500); // esperar osLoad (varias queries + RPC cartera)

const est = await page.evaluate(() => ({ root: !!document.getElementById('os-root'), login: document.getElementById('auth-password') ? document.getElementById('auth-password').offsetParent !== null : false, err: (document.getElementById('auth-error') || {}).textContent || '' }));
chk('login real + shell montado', est.root && !est.login, JSON.stringify(est));
if (!est.root || est.login) { console.log('LOGIN FALLÓ. consola:', consola.slice(0, 8)); await browser.close(); server.close(); process.exit(1); }

// ── INICIO ──
const inicio = await page.evaluate(() => {
  const t = document.querySelector('#os-root .osx-main')?.innerText || '';
  return {
    sidebar: !!document.querySelector('#os-root .osx-side'),
    navInicio: !![...document.querySelectorAll('#os-root .osx-nav')].find(a => /Inicio/.test(a.innerText)),
    navCasas: !![...document.querySelectorAll('#os-root .osx-nav')].find(a => /Casas/.test(a.innerText)),
    navDecisiones: !![...document.querySelectorAll('#os-root .osx-nav')].find(a => /Decisiones/.test(a.innerText)),
    kpiCajaAtrapada: /Caja atrapada/.test(t), kpiOcupacion: /Ocupaci/.test(t), kpiTeDeben: /Te deben/.test(t),
    directiva: /Directiva del d/.test(t), decisiones: /Decisiones que necesitan tu s/.test(t),
    ask: !!document.querySelector('#os-root .askbig'),
    kpiCount: document.querySelectorAll('#os-root .card.kpi').length,
    montos: (t.match(/\$[\d.,]+/g) || []).slice(0, 8),
  };
});
chk('sidebar en lenguaje de negocio', inicio.sidebar && inicio.navInicio && inicio.navCasas && inicio.navDecisiones, JSON.stringify({ s: inicio.sidebar, i: inicio.navInicio, c: inicio.navCasas, d: inicio.navDecisiones }));
chk('KPIs reales (caja atrapada / ocupación / te deben)', inicio.kpiCajaAtrapada && inicio.kpiOcupacion && inicio.kpiTeDeben, JSON.stringify(inicio));
chk('Directiva del día + Decisiones + botón Cerebro', inicio.directiva && inicio.decisiones && inicio.ask, JSON.stringify({ dir: inicio.directiva, dec: inicio.decisiones, ask: inicio.ask }));
chk('montos con datos reales visibles', inicio.montos.length >= 3, JSON.stringify(inicio.montos));
await page.screenshot({ path: '/tmp/inicio.png' });

// ── CASAS ──
await page.evaluate(() => window.osNav('/casas')); await sleep(1200);
const casas = await page.evaluate(() => { const t = document.querySelector('#os-root .osx-main')?.innerText || ''; return { title: /Tus casas/.test(t), rows: document.querySelectorAll('#os-root .drow').length, err: !!document.querySelector('#os-root .empty') }; });
chk('/casas renderiza portafolio', casas.title && casas.rows > 0, JSON.stringify(casas));
await page.screenshot({ path: '/tmp/casas.png' });

// ── DECISIONES ──
await page.evaluate(() => window.osNav('/decisiones')); await sleep(1200);
const dec = await page.evaluate(() => { const t = document.querySelector('#os-root .osx-main')?.innerText || ''; return { title: /Decisiones por aprobar/.test(t), agentes: /Propuestas de tus agentes/.test(t), rows: document.querySelectorAll('#os-root .drow').length }; });
chk('/decisiones renderiza cola', dec.title && dec.rows > 0, JSON.stringify(dec));
await page.screenshot({ path: '/tmp/decisiones.png' });

// ── LIGHT MODE (toggle) ──
await page.evaluate(() => window.osNav('/')); await sleep(600);
await page.evaluate(() => window.osToggleTheme()); await sleep(600);
const light = await page.evaluate(() => document.getElementById('os-root').getAttribute('data-theme'));
chk('toggle claro/oscuro funciona', light === 'light', 'theme=' + light);
await page.screenshot({ path: '/tmp/inicio-light.png' });

chk('sin pageerrors', pageerrors.length === 0, pageerrors.slice(0, 5).join(' | '));
console.log('\nRESULTADO:', ok.length + '/' + (ok.length + fail.length), '· pageerrors:', pageerrors.length, '· consola errs:', consola.length);
if (consola.length) console.log('consola:', consola.slice(0, 6));
await browser.close(); server.close();
process.exit(fail.length || pageerrors.length ? 1 : 0);
