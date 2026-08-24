// CARGA REAL del admin en prod: login por el formulario, navegación normal a /inversionistas,
// click en la pestaña Distribuciones. SIN stubs, SIN forzar osInit(), SIN tocar IA.
// Es el flujo EXACTO del usuario. Reporta todo error de consola de esa ruta.
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE || 'https://empresa-os.vercel.app';
const CHROME = process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EMAIL = process.env.QA_EMAIL || 'qa-admin-test@rentalprofitss.com';
const PASS = process.env.QA_PASS;
if (!PASS) { console.error('Falta QA_PASS'); process.exit(1); }

const ok = [], fail = [], consola = [], pageerrors = [];
const chk = (n, c, e) => (c ? ok : fail).push(n + (e ? ' — ' + e : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
// el service worker recarga la página ~1 min después (gotcha conocido) → lo stubeamos
await page.evaluateOnNewDocument(() => { try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {} });
page.on('pageerror', e => pageerrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') consola.push(m.text().slice(0, 200)); });

// ── 1) LOGIN REAL por el formulario ──
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('#auth-email', { timeout: 20000 });
await page.type('#auth-email', EMAIL, { delay: 10 });
await page.type('#auth-password', PASS, { delay: 10 });
await page.click('#auth-login-btn');
// esperar a que el shell del OS se monte solo (login real → osInit lo dispara la app, no nosotros)
for (let i = 0; i < 40; i++) {
  if (await page.evaluate(() => !!document.getElementById('os-root') && getComputedStyle(document.getElementById('os-root')).display !== 'none')) break;
  await sleep(500);
}
await sleep(2000);
const est = await page.evaluate(() => ({
  root: !!document.getElementById('os-root'),
  // el form de login queda en el DOM pero oculto → offsetParent es el chequeo correcto
  login: document.getElementById('auth-password') ? document.getElementById('auth-password').offsetParent !== null : false,
  err: (document.getElementById('auth-error') || {}).textContent || '',
}));
chk('login real OK', est.root && !est.login, JSON.stringify(est));
if (!est.root || est.login) { console.log('LOGIN FALLÓ:', JSON.stringify(est), '\nconsola:', consola.slice(0, 6)); await browser.close(); process.exit(1); }

// ── 2) NAVEGACIÓN NORMAL a /inversionistas (History API, como el usuario) ──
const errsAntes = consola.length + pageerrors.length;
await page.evaluate(() => window.osNav('/inversionistas'));
// esperar a que el módulo termine de cargar sus datos (iaLoad tarda ~6-8s) — sin forzar nada
for (let i = 0; i < 60 && !(await page.evaluate(() => !!(window.IA && window.IA.loaded))); i++) await sleep(500);
await sleep(1000);
const enAdmin = await page.evaluate(() => /Inversionistas/.test(document.body.innerText) && !!window.IA);
chk('/inversionistas carga en navegación normal', enAdmin);
chk('el módulo terminó de cargar (IA.loaded)', await page.evaluate(() => !!(window.IA && window.IA.loaded)), await page.evaluate(() => JSON.stringify({ loaded: window.IA && window.IA.loaded, err: window.IA && window.IA.err })));

// ── 3) CLICK REAL en la pestaña Distribuciones ──
const clickTab = await page.evaluate(() => {
  const b = [...document.querySelectorAll('#os-root button')].find(x => /Distribuciones/.test(x.textContent));
  if (!b) return 'no encontré la pestaña';
  b.click(); return 'ok';
});
chk('pestaña "💸 Distribuciones" existe y se clickea', clickTab === 'ok', clickTab);
// la pestaña dispara un 2º load (iaLoadProducto) → esperar a IA.dists
for (let i = 0; i < 40 && !(await page.evaluate(() => !!(window.IA && window.IA.dists))); i++) await sleep(500);
await sleep(1200);

// ── 4) ¿SE VE EL TOGGLE? (medido sobre lo realmente renderizado) ──
const r = await page.evaluate(() => {
  const root = document.getElementById('os-root');
  const btns = [...root.querySelectorAll('button')].filter(b => /^(✍️ Manual|⚙️ Automática|✍️Manual)/.test(b.textContent.trim()) || /Modo/.test(b.textContent));
  const modo = [...root.querySelectorAll('button')].filter(b => /Manual|Autom/.test(b.textContent) && !/Agregar manual|Elegir de/.test(b.textContent));
  return {
    tab: window.IA && window.IA.tab,
    txtHasModo: /modo de carga/i.test(root.innerText),
    nBotones: modo.length,
    botones: modo.map(b => { const q = b.getBoundingClientRect(), cs = getComputedStyle(b); return { t: b.textContent.trim(), w: Math.round(q.width), h: Math.round(q.height), disp: cs.display, vis: cs.visibility, op: cs.opacity, bg: cs.backgroundColor }; }),
    manualForm: !!document.getElementById('ia-d-monto'),
    autoCasa: !!document.getElementById('ia-da-casa'),
    iaStyles: !!document.getElementById('ia-styles'),
    osStyles: !!document.getElementById('os-styles'),
    snippet: root.innerText.slice(0, 260).replace(/\n+/g, ' | '),
  };
});
chk('IA.tab === "dist"', r.tab === 'dist', String(r.tab));
chk('label "Modo de carga" VISIBLE en carga normal', r.txtHasModo, r.snippet);
chk('2 botones de modo renderizados', r.nBotones === 2, JSON.stringify(r.botones.map(b => b.t)));
chk('botones con tamaño real (>60x24)', r.nBotones === 2 && r.botones.every(b => b.w > 60 && b.h > 24), JSON.stringify(r.botones.map(b => b.w + 'x' + b.h)));
chk('ninguno oculto', r.nBotones === 2 && r.botones.every(b => b.disp !== 'none' && b.vis !== 'hidden' && +b.op > .5), JSON.stringify(r.botones.map(b => b.disp + '/' + b.vis + '/' + b.op)));
chk('#ia-styles inyectado en carga normal', r.iaStyles);
chk('#os-styles presente (sin forzar osInit)', r.osStyles);
chk('form manual visible por defecto', r.manualForm);

// ── 5) CLICK en "Automática" (flujo del usuario) ──
await page.evaluate(() => [...document.querySelectorAll('#os-root button')].find(b => /Autom/.test(b.textContent) && !/Agregar/.test(b.textContent))?.click());
await sleep(1200);
const a = await page.evaluate(() => ({
  modo: window.IA && window.IA.distMode,
  casa: !!document.getElementById('ia-da-casa'), mes: !!document.getElementById('ia-da-mes'),
  calc: /Calcular desde el Ledger/.test(document.getElementById('os-root').innerText),
  manualForm: !!document.getElementById('ia-d-monto'),
}));
chk('click "Automática" → IA.distMode = auto', a.modo === 'auto', String(a.modo));
chk('modo auto: selector de casa + mes', a.casa && a.mes, JSON.stringify(a));
chk('modo auto: botón "Calcular desde el Ledger"', a.calc);
chk('modo auto: el form manual se oculta', !a.manualForm);

const errsRuta = consola.length + pageerrors.length - errsAntes;
chk('0 errores de consola en /inversionistas', errsRuta === 0, errsRuta + ' errores');
if (process.env.QA_SHOTS) await page.screenshot({ path: 'real-auto.png', fullPage: false });

console.log('\n🚦 CARGA REAL (login + navegación normal) — ' + ok.length + ' OK · ' + fail.length + ' FALLAS');
ok.forEach(x => console.log('  ✓ ' + x));
fail.forEach(x => console.log('  ✗ ' + x));
if (pageerrors.length) { console.log('\n  PAGEERRORS:'); pageerrors.forEach(e => console.log('   ✗ ' + e)); }
if (consola.length) { console.log('\n  CONSOLA (error):'); consola.slice(0, 12).forEach(e => console.log('   · ' + e)); }
await browser.close();
process.exit(fail.length ? 1 : 0);
