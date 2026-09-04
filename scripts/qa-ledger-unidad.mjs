// CARGA REAL: las filas de "Renta cobrada" declaran DE QUÉ UNIDAD es el pago, en las dos
// vistas que leen inv_ledger (Ledger del admin y Flujo Mensual del portal).
// Login por el formulario, navegación normal, sin stubs ni osInit forzado.
//
// Cambio verificado: migración 20260904100000_ledger_renta_por_unidad.sql
//   'Renta cobrada · 2026-07 · Julio 2026'  ->  '… — Habitación 4'
// La unidad es SOLO etiqueta (pm_units.name vía pm_payments.unit_id): montos, fechas,
// categorías y saldos no se tocan — por eso el script también compara los totales.
//
// Uso: QA_PASS=… node scripts/qa-ledger-unidad.mjs
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE || 'https://empresa-os.vercel.app';
const CHROME = process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EMAIL = process.env.QA_EMAIL || 'qa-admin-test@rentalprofitss.com';
const PASS = process.env.QA_PASS;
if (!PASS) { console.error('Falta QA_PASS'); process.exit(1); }

// Esperados = leídos de inv_ledger en Supabase el 04-sep-2026 (misma RPC que pinta la pantalla).
const CASAS = [
  {
    nombre: '512 Bramble Dr', casa: 'Bramble', pid: 'c0cfbd43-cbc5-4edc-ac76-824f5b9db828', inv: 'recNU08Xri3he9jaC',
    movs: 47, saldo: '$9,385', rentas: 20, rentasSinUnidad: 0,
    // multiunidad: cada renta dice su unidad
    unidades: ['Estudio 1', 'Habitación 1', 'Habitación 2', 'Habitación 3', 'Apartamento 1'],
  },
  {
    nombre: '4916 Barkbridge', casa: 'Barkbridge', pid: '6fa5ad93-31a7-462e-b48b-444491dd2b65', inv: 'rec8MhKDmkdD6Ouyr',
    movs: 126, saldo: '$-3,944', rentas: 42, rentasSinUnidad: 33,
    unidades: ['Casa Completa'],
  },
];

const ok = [], fail = [], pageerrors = [];
const chk = (n, c, e) => (c ? ok : fail).push(n + (e ? ' — ' + e : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1300 });
await page.evaluateOnNewDocument(() => { try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {} });
page.on('pageerror', e => pageerrors.push(e.message));

// filas de "Renta cobrada" tal cual se ven (la lista viene agrupada por mes: hay que expandirla)
const leerRentas = () => page.evaluate(() => {
  const tbl = [...document.querySelectorAll('table')].find(t => /saldo (de caja|operativo)/i.test(t.innerText));
  if (!tbl) return null;
  return [...tbl.querySelectorAll('tbody tr')]
    .filter(tr => !tr.querySelector('td[colspan]'))
    .map(tr => [...tr.children].map(td => td.innerText.trim()))
    .filter(c => /^Renta cobrada/.test(c[1] || ''))
    .map(c => ({ fecha: c[0], concepto: c[1].split('\n')[0], monto: c[3], saldo: c[4] }));
});
const unidadDe = r => { const m = r.concepto.match(/ — (.+)$/); return m ? m[1].trim() : null; };

// ══ LOGIN ══
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('#auth-email', { timeout: 20000 });
await page.type('#auth-email', EMAIL, { delay: 10 });
await page.type('#auth-password', PASS, { delay: 10 });
await page.click('#auth-login-btn');
for (let i = 0; i < 40 && !(await page.evaluate(() => !!document.getElementById('os-root'))); i++) await sleep(500);
chk('login real en ' + BASE, await page.evaluate(() => !!document.getElementById('os-root')));

// ══ ADMIN · Ledger ══
await page.evaluate(() => window.osNav('/inversionistas'));
for (let i = 0; i < 80 && !(await page.evaluate(() => !!(window.IA && window.IA.loaded))); i++) await sleep(500);
chk('/inversionistas cargado (IA.loaded)', await page.evaluate(() => !!(window.IA && window.IA.loaded)));
await page.evaluate(() => { const b = [...document.querySelectorAll('#os-root button')].find(x => /Ledger/.test(x.textContent)); if (b) b.click(); });
for (let i = 0; i < 60 && await page.evaluate(() => /Armando el ledger/.test(document.getElementById('os-root').innerText)); i++) await sleep(500);

for (const c of CASAS) {
  const puesta = await page.evaluate(casa => {
    const s = [...document.querySelectorAll('#os-root select')].find(x => [...x.options].some(o => o.textContent.includes(casa)));
    const opt = s && [...s.options].find(o => o.textContent.includes(casa));
    if (!opt) return false;
    s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true })); return true;
  }, c.casa);
  chk('[admin] casa "' + c.casa + '" seleccionada', puesta);
  for (let i = 0; i < 60 && await page.evaluate(() => /Armando el ledger/.test(document.getElementById('os-root').innerText)); i++) await sleep(500);
  await sleep(1200);
  await page.evaluate(() => window.iaMesTodos(true)); // la lista viene en acordeón por mes
  await sleep(1000);

  const rentas = await leerRentas() || [];
  const conU = rentas.filter(unidadDe), sinU = rentas.filter(r => !unidadDe(r));
  const vistas = [...new Set(conU.map(unidadDe))].sort();
  chk('[admin] ' + c.nombre + ' · ' + c.rentas + ' filas de "Renta cobrada"', rentas.length === c.rentas, rentas.length + ' filas');
  chk('[admin] ' + c.nombre + ' · ' + (c.rentas - c.rentasSinUnidad) + ' rentas declaran su unidad', conU.length === c.rentas - c.rentasSinUnidad, conU.length + ' con unidad');
  chk('[admin] ' + c.nombre + ' · las ' + c.rentasSinUnidad + ' sin unidad en Airtable quedan SIN etiqueta extra (no rompen, no inventan)',
    sinU.length === c.rentasSinUnidad, sinU.length + ' sin unidad · ej: ' + (sinU[0] ? sinU[0].concepto : '—'));
  c.unidades.forEach(u => chk('[admin] ' + c.nombre + ' · aparece la unidad "' + u + '"', vistas.includes(u), vistas.join(' | ')));
  chk('[admin] ' + c.nombre + ' · ninguna unidad muestra el slug feo (code) en vez del nombre',
    !vistas.some(u => /^[0-9]{3,}-|HABITACI-N|ESTUDIO-|APARTAMENTO-/i.test(u)), vistas.join(' | '));
  // ── los números NO cambiaron: la unidad es solo texto ──
  const tot = await page.evaluate(() => {
    const t = document.getElementById('os-root').innerText;
    const s = t.match(/Saldo de caja \(P&L\)[^:]*:\s*(\$-?[\d,]+)/);
    const m = t.match(/(\d+)\s+movimientos/);
    return { saldo: s && s[1], movs: m && +m[1] };
  });
  chk('[admin] ' + c.nombre + ' · Saldo de caja sigue siendo ' + c.saldo, tot.saldo === c.saldo, String(tot.saldo));
  chk('[admin] ' + c.nombre + ' · ' + c.movs + ' movimientos (el LEFT JOIN de unidades no duplicó filas)', tot.movs === c.movs, String(tot.movs));
  chk('[admin] ' + c.nombre + ' · los montos de renta siguen siendo por unidad (todos > 0)',
    rentas.every(r => /^\+\$[\d,]/.test(r.monto)), rentas.slice(0, 3).map(r => r.monto).join(' '));
}

// ══ PORTAL · Flujo Mensual (misma fuente inv_ledger → tiene que verse igual) ══
for (const c of CASAS) {
  await page.goto(BASE + '/inversionista?ver=' + c.inv + '&casa=' + c.pid, { waitUntil: 'networkidle2', timeout: 60000 });
  for (let i = 0; i < 60 && !/Flujo Mensual/i.test(await page.evaluate(() => document.body.innerText || '')); i++) await sleep(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Flujo Mensual'); if (b) b.click(); });
  for (let i = 0; i < 60 && !/Todos los movimientos/.test(await page.evaluate(() => document.body.innerText || '')); i++) await sleep(500);
  await sleep(1000);
  await page.evaluate(() => window.ipMesTodos(true));
  await sleep(1000);
  const rentas = await leerRentas() || [];
  const vistas = [...new Set(rentas.map(unidadDe).filter(Boolean))].sort();
  chk('[portal] ' + c.nombre + ' · las rentas declaran la unidad igual que en el admin',
    vistas.length > 0 && c.unidades.every(u => vistas.includes(u)), vistas.join(' | '));
  chk('[portal] ' + c.nombre + ' · ' + c.rentas + ' filas de "Renta cobrada"', rentas.length === c.rentas, rentas.length + ' filas');
}

console.log('\n' + ok.map(x => '  OK ' + x).join('\n'));
if (fail.length) console.log('\n' + fail.map(x => '  XX ' + x).join('\n'));
console.log('\nRESULTADO: ' + ok.length + '/' + (ok.length + fail.length) + ' · pageerrors: ' + pageerrors.length);
if (pageerrors.length) console.log(pageerrors.slice(0, 5).join('\n'));
await browser.close();
process.exit(fail.length || pageerrors.length ? 1 : 0);
