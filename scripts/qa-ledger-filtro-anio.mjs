// CARGA REAL del filtro de PERÍODO del Ledger (admin /inversionistas) en el dominio oficial:
// login por el formulario, navegación normal, click en la pestaña Ledger y selección de casa por
// el <select> real. SIN stubs, SIN forzar osInit().
//
// Verifica el ajuste pedido por el CEO (27-ago-2026): el desplegable suma nivel de AÑO
// ("Todos los años" / "Todo 2025" / un mes dentro del año) y los totales de arriba
// —Saldo de caja, Servicio de deuda y Subtotales— se RECALCULAN con el período elegido.
//
// Uso: QA_PASS=… node scripts/qa-ledger-filtro-anio.mjs
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE || 'https://empresa-os.vercel.app';
const CHROME = process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EMAIL = process.env.QA_EMAIL || 'qa-admin-test@rentalprofitss.com';
const PASS = process.env.QA_PASS;
const CASA = process.env.QA_CASA || 'Barkbridge';
if (!PASS) { console.error('Falta QA_PASS'); process.exit(1); }

// esperados = suma de los movimientos reales de 4916 Barkbridge en Supabase (agrupados por FECHA,
// que es el criterio del Ledger del admin). Los dos años tienen que sumar el total:
//   2,568.04 + 1,517.77 = 4,085.81   ·   9,774.27 + 11,058.11 = 20,832.38
const CASOS = [
  { valor: 'todos',   etiqueta: 'todos los años', saldo: '$4,086',  deuda: '$20,832', movs: 117 },
  { valor: '2025',    etiqueta: 'año 2025',       saldo: '$2,568',  deuda: '$9,774',  movs: 59 },
  { valor: '2026',    etiqueta: 'año 2026',       saldo: '$1,518',  deuda: '$11,058', movs: 58 },
  { valor: '2026-06', etiqueta: 'Junio 2026',     saldo: '$-314',   deuda: '$1,580',  movs: 9 },
];

const ok = [], fail = [], consola = [], pageerrors = [];
const chk = (n, c, e) => (c ? ok : fail).push(n + (e ? ' — ' + e : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200 });
await page.evaluateOnNewDocument(() => { try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {} });
page.on('pageerror', e => pageerrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') consola.push(m.text().slice(0, 200)); });

// ── login real ──
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('#auth-email', { timeout: 20000 });
await page.type('#auth-email', EMAIL, { delay: 10 });
await page.type('#auth-password', PASS, { delay: 10 });
await page.click('#auth-login-btn');
for (let i = 0; i < 40; i++) { if (await page.evaluate(() => !!document.getElementById('os-root'))) break; await sleep(500); }
await sleep(2000);
chk('login real en ' + BASE, await page.evaluate(() => !!document.getElementById('os-root')));

// ── /inversionistas (iaLoad tarda 6-8 s: se espera el flag, no un sleep fijo) ──
await page.evaluate(() => window.osNav('/inversionistas'));
for (let i = 0; i < 80 && !(await page.evaluate(() => !!(window.IA && window.IA.loaded))); i++) await sleep(500);
chk('/inversionistas cargado (IA.loaded)', await page.evaluate(() => !!(window.IA && window.IA.loaded)));

// ── pestaña Ledger ──
const tab = await page.evaluate(() => {
  const b = [...document.querySelectorAll('#os-root button')].find(x => /Ledger/.test(x.textContent));
  if (!b) return 'no encontré la pestaña Ledger'; b.click(); return 'ok';
});
chk('pestaña Ledger abierta', tab === 'ok', tab);
for (let i = 0; i < 60 && await page.evaluate(() => /Armando el ledger/.test(document.getElementById('os-root').innerText)); i++) await sleep(500);
await sleep(1200);

// ── casa por el selector real ──
const sel = await page.evaluate(casa => {
  const s = [...document.querySelectorAll('#os-root select')].find(x => [...x.options].some(o => o.textContent.includes(casa)));
  if (!s) return 'no encontré el selector de casa';
  const opt = [...s.options].find(o => o.textContent.includes(casa));
  s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true }));
  return opt.textContent.trim();
}, CASA);
chk('casa "' + CASA + '" seleccionada', !/^no /.test(sel), sel);
for (let i = 0; i < 60 && await page.evaluate(() => /Armando el ledger/.test(document.getElementById('os-root').innerText)); i++) await sleep(500);
await sleep(1500);

// ── el desplegable de período: años dinámicos, sin períodos vacíos ──
const opts = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#os-root select')].find(x => [...x.options].some(o => /Todos los años/.test(o.textContent)));
  if (!s) return null;
  return {
    grupos: [...s.querySelectorAll('optgroup')].map(g => g.label),
    valores: [...s.options].map(o => o.value),
    textos: [...s.options].map(o => o.textContent.trim()),
  };
});
chk('el desplegable tiene la opción "Todos los años"', !!opts && opts.textos.includes('Todos los años'), JSON.stringify(opts && opts.textos.slice(0, 4)));
chk('hay un grupo por AÑO con datos (2025 y 2026)', !!opts && opts.grupos.includes('2025') && opts.grupos.includes('2026'), JSON.stringify(opts && opts.grupos));
chk('cada año ofrece "Todo <año>"', !!opts && opts.textos.includes('Todo 2025') && opts.textos.includes('Todo 2026'), JSON.stringify(opts && opts.textos.filter(t => /^Todo /.test(t))));
chk('hay meses dentro del año (ej. Junio 2026)', !!opts && opts.valores.includes('2026-06'), JSON.stringify(opts && opts.valores.filter(v => /^2026-/.test(v))));
chk('NO se listan años sin datos', !!opts && opts.grupos.every(g => /^(2025|2026)$/.test(g)), JSON.stringify(opts && opts.grupos));

// ── recorrer los períodos y comparar los totales de arriba ──
const leer = () => page.evaluate(() => {
  const t = document.getElementById('os-root').innerText;
  const saldo = t.match(/Saldo de caja \(P&L\)[^·]*·\s*([^:]+):\s*(\$-?[\d,]+)/);
  const deuda = t.match(/Servicio de deuda[^·]*·\s*([^:]+):\s*(\$-?[\d,]+)/);
  const movs = t.match(/(\d+)\s+movimientos/);
  const filas = document.querySelectorAll('#os-root table.ptable tbody tr').length;
  const subt = [...document.querySelectorAll('#os-root .kv')].map(k => k.innerText.replace(/\s+/g, ' ').trim());
  return {
    saldoLbl: saldo && saldo[1].trim(), saldoVal: saldo && saldo[2],
    deudaLbl: deuda && deuda[1].trim(), deudaVal: deuda && deuda[2],
    movs: movs && +movs[1], filas, subt,
  };
});

for (const c of CASOS) {
  const puesto = await page.evaluate(v => {
    const s = [...document.querySelectorAll('#os-root select')].find(x => [...x.options].some(o => /Todos los años/.test(o.textContent)));
    if (!s) return false;
    s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value === v;
  }, c.valor);
  chk('período "' + c.valor + '" seleccionable', puesto);
  await sleep(900);
  const r = await leer();
  chk('[' + c.valor + '] el encabezado dice el período elegido ("' + c.etiqueta + '")', r.saldoLbl === c.etiqueta, JSON.stringify(r.saldoLbl));
  chk('[' + c.valor + '] Saldo de caja = ' + c.saldo, r.saldoVal === c.saldo, r.saldoVal);
  chk('[' + c.valor + '] Servicio de deuda = ' + c.deuda, r.deudaVal === c.deuda, r.deudaVal);
  chk('[' + c.valor + '] ' + c.movs + ' movimientos', r.movs === c.movs, String(r.movs));
  chk('[' + c.valor + '] la tabla muestra esos mismos ' + c.movs + ' movimientos', r.filas === c.movs, String(r.filas));
  chk('[' + c.valor + '] hay Subtotales por categoría recalculados', (r.subt || []).length > 0, String((r.subt || []).length) + ' filas de subtotal');
  console.log('\n[' + c.valor + '] ' + r.saldoLbl + ' → saldo ' + r.saldoVal + ' · deuda ' + r.deudaVal + ' · ' + r.movs + ' movs (tabla: ' + r.filas + ')');
}

// los años tienen que sumar el total (prueba de que el filtro parte, no pierde ni duplica)
const n = v => +String(v || '').replace(/[^0-9.\-]/g, '');
chk('2025 + 2026 = todos (saldo de caja)', n(CASOS[1].saldo) + n(CASOS[2].saldo) === n(CASOS[0].saldo) + 0,
  CASOS[1].saldo + ' + ' + CASOS[2].saldo + ' vs ' + CASOS[0].saldo);
chk('2025 + 2026 = todos (movimientos)', CASOS[1].movs + CASOS[2].movs === CASOS[0].movs,
  CASOS[1].movs + ' + ' + CASOS[2].movs + ' vs ' + CASOS[0].movs);

chk('0 pageerrors', pageerrors.length === 0, pageerrors.join(' | '));
const consolaReal = consola.filter(c => !/config\.js|favicon|Failed to load resource/.test(c));
chk('0 errores de consola (fuera del 404 by-design de /config.js)', consolaReal.length === 0, consolaReal.join(' | '));

console.log('\nQA FILTRO DE PERÍODO DEL LEDGER (' + BASE + ') — ' + ok.length + ' OK · ' + fail.length + ' FALLAS');
ok.forEach(o => console.log('  ✓ ' + o));
fail.forEach(f => console.log('  ✗ ' + f));
await browser.close();
process.exit(fail.length ? 1 : 0);
