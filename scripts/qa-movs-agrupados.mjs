// CARGA REAL de la lista "Todos los movimientos" AGRUPADA POR MES en las DOS vistas:
//   · admin  -> /inversionistas > pestaña Ledger (fondo claro, agrupa por FECHA)
//   · portal -> /inversionista?ver=… > pestaña Flujo Mensual (fondo oscuro, agrupa por MES contable)
// Login por el formulario, navegación normal, sin stubs ni osInit forzado.
//
// Verifica el pedido del CEO (03-sep-2026): meses en acordeón (más reciente arriba y ABIERTO),
// resumen del mes en el encabezado aunque esté cerrado, ingresos arriba / gastos abajo dentro
// del mes, saldo por fila REAL (calculado en orden cronológico, no según el orden visual) y
// botones Expandir/Colapsar todo.
//
// Uso: QA_PASS=… node scripts/qa-movs-agrupados.mjs
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE || 'https://empresa-os.vercel.app';
const CHROME = process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EMAIL = process.env.QA_EMAIL || 'qa-admin-test@rentalprofitss.com';
const PASS = process.env.QA_PASS;
if (!PASS) { console.error('Falta QA_PASS'); process.exit(1); }

// 4916 Barkbridge Trl — los esperados salen de SUMAR A MANO los movimientos reales de
// inv_ledger en Supabase (la misma RPC que pinta las dos pantallas), agrupados como agrupa
// cada vista. Nada de esto se recalcula en el front: son los montos que ya existen.
const CASA = 'Barkbridge';
const PID = '6fa5ad93-31a7-462e-b48b-444491dd2b65';
const INV = 'rec8MhKDmkdD6Ouyr';
const ADM_JUL = { ing: '$3,500', gas: '−$7,434', neto: '−$3,934' }; // admin agrupa por FECHA
const ADM_JUN = { neto: '−$294' };                                   // = el saldo del período que ya daba el filtro
const POR_JUL = { ing: '$3,500', gas: '−$7,369', neto: '−$3,869' };  // portal agrupa por MES CONTABLE
// (la diferencia jul/jun entre las dos vistas es la divergencia PRE-EXISTENTE declarada en
//  CLAUDE.md: fecha de cobro vs mes de renta. No se tocó.)

const ok = [], fail = [], pageerrors = [];
const chk = (n, c, e) => (c ? ok : fail).push(n + (e ? ' — ' + e : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = v => +String(v || '').replace(/[\u2212\u2013]/g, '-').replace(/[^0-9.\-]/g, '');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1300 });
await page.evaluateOnNewDocument(() => { try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {} });
page.on('pageerror', e => pageerrors.push(e.message));

// lee encabezados de mes + filas visibles de la tabla agrupada (la busca por su columna de saldo)
const leerGrupos = () => page.evaluate(() => {
  const tbl = [...document.querySelectorAll('table')].find(t => /saldo (de caja|operativo)/i.test(t.innerText));
  if (!tbl) return null;
  const out = { meses: [], filas: [] };
  let mesAct = null;
  [...tbl.querySelectorAll('tbody tr')].forEach(tr => {
    const cs = tr.querySelector('td[colspan]');
    if (cs) {
      const t = cs.innerText.replace(/\s+/g, ' ').trim();
      const m = t.match(/^([\u25be\u25b8])\s+([A-Za-zÁÉÍÓÚáéíóúñ]+ \d{4})/);
      mesAct = m ? m[2] : t;
      out.meses.push({ mes: mesAct, abierto: t.charAt(0) === '\u25be', txt: t });
    } else {
      const td = [...tr.querySelectorAll('td')].map(x => x.innerText.trim());
      out.filas.push({ mes: mesAct, fecha: td[0], concepto: td[1], cat: td[2], monto: td[3], saldo: td[4] });
    }
  });
  return out;
});

// las pruebas que valen IGUAL en las dos vistas (misma función de render)
function comun(pref, g) {
  if (!g) { chk(pref + 'tabla de movimientos encontrada', false); return []; }
  chk(pref + 'la tabla está agrupada en meses', g.meses.length > 1, g.meses.length + ' meses');
  const yms = g.meses.map(m => m.mes);
  chk(pref + 'el mes más reciente va ARRIBA', /2026/.test(yms[0] || ''), JSON.stringify(yms.slice(0, 3)));
  chk(pref + 'solo el mes más reciente arranca ABIERTO', g.meses[0].abierto && g.meses.slice(1).every(m => !m.abierto),
    JSON.stringify(g.meses.map(m => m.mes + (m.abierto ? ':abierto' : ':cerrado')).slice(0, 4)));
  chk(pref + 'los meses cerrados igual muestran Ingresos · Gastos · Neto',
    g.meses.every(m => /Ingresos \$/.test(m.txt) && /Gastos \u2212\$/.test(m.txt) && /Neto /.test(m.txt)),
    g.meses[1] && g.meses[1].txt);
  const vis = g.filas.filter(f => f.mes === g.meses[0].mes);
  const idxGasto = vis.findIndex(f => f.monto.charAt(0) === '\u2212');
  const ultIng = vis.reduce((a, f, i) => (f.monto.charAt(0) === '+' ? i : a), -1);
  chk(pref + 'dentro del mes: PRIMERO ingresos, DEBAJO gastos', idxGasto === -1 || ultIng === -1 || ultIng < idxGasto,
    vis.map(f => f.monto).join(' '));
  const desc = a => a.every((x, i) => i === 0 || a[i - 1] >= x);
  const fIng = vis.filter(f => f.monto.charAt(0) === '+').map(f => f.fecha);
  const fGas = vis.filter(f => f.monto.charAt(0) === '\u2212').map(f => f.fecha);
  chk(pref + 'ingresos por fecha DESCENDENTE', desc(fIng), fIng.join(' '));
  chk(pref + 'gastos por fecha DESCENDENTE', desc(fGas), fGas.join(' '));
  return vis;
}

// El saldo de cada fila tiene que seguir la cadena CRONOLÓGICA REAL de TODO el ledger
// (se calcula una sola vez, antes de agrupar). Se valida por DÍA y sobre TODAS las filas
// visibles, no por grupo: en el portal los grupos son por MES CONTABLE, así que un gasto
// del 12-jul con mes de renta agosto cae en otro grupo y la cadena "salta" dentro del mes
// —el saldo igual es el correcto—. Las filas P&L NO repiten el saldo anterior: no suman.
function saldoReal(pref, filas) {
  const netas = filas.filter(f => !/P&L NO/.test(f.concepto));
  if (!netas.length) { chk(pref + 'hay filas para validar el saldo', false); return; }
  const dias = [...new Set(netas.map(f => f.fecha))].sort();
  const porDia = d => netas.filter(f => f.fecha === d);
  // pantalla y check trabajan con montos REDONDEADOS a dólar: la tolerancia crece 0.5 por
  // fila acumulada (deriva de redondeo, no descuadre) — con 126 filas son ~$2.
  let acum = 0, vistas = 0, malo = '';
  for (const d of dias) {
    const del = porDia(d);
    acum += del.reduce((s2, f) => s2 + (f.monto.charAt(0) === '+' ? 1 : -1) * Math.abs(num(f.monto)), 0);
    vistas += del.length;
    const tol = 1 + 0.5 * vistas;
    const saldos = del.map(f => num(f.saldo));
    if (!saldos.some(v => Math.abs(v - acum) <= tol)) { malo = d + ': el acumulado real da ' + Math.round(acum) + ' y ninguna fila de ese día lo muestra (' + saldos.join(', ') + ')'; break; }
  }
  chk(pref + 'el saldo de cada fila sigue la cadena cronológica REAL de todo el ledger (agrupar/reordenar no lo recalculó)', !malo, malo);
}

// ══ 1) LOGIN REAL ══
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('#auth-email', { timeout: 20000 });
await page.type('#auth-email', EMAIL, { delay: 10 });
await page.type('#auth-password', PASS, { delay: 10 });
await page.click('#auth-login-btn');
for (let i = 0; i < 40 && !(await page.evaluate(() => !!document.getElementById('os-root'))); i++) await sleep(500);
chk('login real en ' + BASE, await page.evaluate(() => !!document.getElementById('os-root')));

// ══ 2) ADMIN · pestaña Ledger ══
await page.evaluate(() => window.osNav('/inversionistas'));
for (let i = 0; i < 80 && !(await page.evaluate(() => !!(window.IA && window.IA.loaded))); i++) await sleep(500);
chk('/inversionistas cargado (IA.loaded)', await page.evaluate(() => !!(window.IA && window.IA.loaded)));
await page.evaluate(() => { const b = [...document.querySelectorAll('#os-root button')].find(x => /Ledger/.test(x.textContent)); if (b) b.click(); });
for (let i = 0; i < 60 && await page.evaluate(() => /Armando el ledger/.test(document.getElementById('os-root').innerText)); i++) await sleep(500);
await page.evaluate(casa => {
  const s = [...document.querySelectorAll('#os-root select')].find(x => [...x.options].some(o => o.textContent.includes(casa)));
  const opt = s && [...s.options].find(o => o.textContent.includes(casa));
  if (opt) { s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
}, CASA);
for (let i = 0; i < 60 && await page.evaluate(() => /Armando el ledger/.test(document.getElementById('os-root').innerText)); i++) await sleep(500);
await sleep(1500);

const gA = await leerGrupos();
comun('[admin] ', gA);
const julA = gA && gA.meses.find(m => m.mes === 'Julio 2026');
chk('[admin] Julio 2026 · Ingresos ' + ADM_JUL.ing, !!julA && julA.txt.includes('Ingresos ' + ADM_JUL.ing), julA && julA.txt);
chk('[admin] Julio 2026 · Gastos ' + ADM_JUL.gas, !!julA && julA.txt.includes('Gastos ' + ADM_JUL.gas), julA && julA.txt);
chk('[admin] Julio 2026 · Neto ' + ADM_JUL.neto, !!julA && julA.txt.includes('Neto ' + ADM_JUL.neto), julA && julA.txt);
const junA = gA && gA.meses.find(m => m.mes === 'Junio 2026');
chk('[admin] Junio 2026 · Neto ' + ADM_JUN.neto + ' (= el saldo del período que ya daba el filtro)', !!junA && junA.txt.includes('Neto ' + ADM_JUN.neto), junA && junA.txt);

await page.evaluate(() => window.iaMesTodos(true)); await sleep(900);
const gA2 = await leerGrupos() || { meses: [], filas: [] };
chk('[admin] "Expandir todo" abre todos los meses', gA2.meses.every(m => m.abierto), gA2.meses.filter(m => !m.abierto).length + ' cerrados');
saldoReal('[admin] ', gA2.filas);
await page.evaluate(() => window.iaMesTodos(false)); await sleep(700);
const gA3 = await leerGrupos() || { meses: [], filas: [] };
chk('[admin] "Colapsar todo" cierra todos los meses', gA3.filas.length === 0 && gA3.meses.every(m => !m.abierto), gA3.filas.length + ' filas visibles');
chk('[admin] con todo colapsado los encabezados siguen mostrando el resumen', gA3.meses.every(m => /Neto /.test(m.txt)), gA3.meses[0] && gA3.meses[0].txt);
await page.evaluate(() => {
  const h = [...document.querySelectorAll('#os-root table.ptable td[colspan]')].find(t => /Junio 2026/.test(t.innerText));
  if (h) h.click();
});
await sleep(700);
const gA4 = await leerGrupos() || { meses: [], filas: [] };
chk('[admin] click en el encabezado abre SOLO ese mes', gA4.filas.length > 0 && gA4.filas.every(f => f.mes === 'Junio 2026'), [...new Set(gA4.filas.map(f => f.mes))].join(','));

// ══ 3) PORTAL · pestaña Flujo Mensual (MISMA función de render) ══
await page.goto(BASE + '/inversionista?ver=' + INV + '&casa=' + PID, { waitUntil: 'networkidle2', timeout: 60000 });
for (let i = 0; i < 60 && !/Flujo Mensual/i.test(await page.evaluate(() => document.body.innerText || '')); i++) await sleep(500);
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Flujo Mensual'); if (b) b.click(); });
for (let i = 0; i < 60 && !/Todos los movimientos/.test(await page.evaluate(() => document.body.innerText || '')); i++) await sleep(500);
await sleep(1200);

const gP = await leerGrupos();
comun('[portal] ', gP);
const julP = gP && gP.meses.find(m => m.mes === 'Julio 2026');
chk('[portal] Julio 2026 · Ingresos ' + POR_JUL.ing, !!julP && julP.txt.includes('Ingresos ' + POR_JUL.ing), julP && julP.txt);
chk('[portal] Julio 2026 · Gastos ' + POR_JUL.gas, !!julP && julP.txt.includes('Gastos ' + POR_JUL.gas), julP && julP.txt);
chk('[portal] Julio 2026 · Neto ' + POR_JUL.neto, !!julP && julP.txt.includes('Neto ' + POR_JUL.neto), julP && julP.txt);
chk('[portal] botones "Expandir todo / Colapsar todo" presentes',
  await page.evaluate(() => [...document.querySelectorAll('button')].some(b => /Expandir todo/.test(b.textContent)) && [...document.querySelectorAll('button')].some(b => /Colapsar todo/.test(b.textContent))));
await page.evaluate(() => window.ipMesTodos(true)); await sleep(900);
const gP2 = await leerGrupos() || { meses: [], filas: [] };
chk('[portal] "Expandir todo" abre todos los meses', gP2.meses.every(m => m.abierto), gP2.meses.filter(m => !m.abierto).length + ' cerrados');
saldoReal('[portal] ', gP2.filas);
// el filtro que ya existía re-arma la agrupación sobre lo filtrado
await page.evaluate(() => window.ipLedgerF('tipo', 'ingreso')); await sleep(900);
const gP3 = await leerGrupos() || { meses: [], filas: [] };
chk('[portal] el filtro "Ingresos" re-arma la agrupación sobre lo filtrado',
  gP3.filas.length > 0 && gP3.meses.length > 0 && gP3.filas.every(f => f.monto.charAt(0) === '+'),
  gP3.filas.length + ' filas / ' + gP3.meses.length + ' meses');
await page.evaluate(() => window.ipLedgerF('tipo', 'todos')); await sleep(700);

console.log('\n' + ok.map(x => '  OK ' + x).join('\n'));
if (fail.length) console.log('\n' + fail.map(x => '  XX ' + x).join('\n'));
console.log('\nRESULTADO: ' + ok.length + '/' + (ok.length + fail.length) + ' · pageerrors: ' + pageerrors.length);
if (pageerrors.length) console.log(pageerrors.slice(0, 5).join('\n'));
await browser.close();
process.exit(fail.length || pageerrors.length ? 1 : 0);
