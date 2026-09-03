// CARGA REAL en el DOMINIO OFICIAL (empresa-os.vercel.app): login por el formulario y de ahí
// al PORTAL del inversionista en la MISMA sesión — navegación normal, sin forzar osInit ni
// stubear datos (un harness con stubs puede pasar 15/15 sobre un bug real; ya pasó).
//
// Verifica las DOS mitades del servicio de deuda pedidas por el CEO (27-ago-2026):
//   1) pestaña "Flujo Mensual" por casa: flujo del mes = ingresos − gastos operativos − deuda
//      (4916 Barkbridge, donde el −1,600 tiene que bajar el neto · 5003 Michelle de control)
//   2) "Mi Portafolio": el TOTAL de todas las casas también resta el servicio de deuda
//      (inversionista con 4 casas), y cuadra con la suma de inv_portal_resumen.
//
// Uso: QA_PASS=… node scripts/qa-flujo-portafolio-deuda.mjs
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE || 'https://empresa-os.vercel.app';
const CHROME = process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EMAIL = process.env.QA_EMAIL || 'qa-admin-test@rentalprofitss.com';
const PASS = process.env.QA_PASS;
if (!PASS) { console.error('Falta QA_PASS'); process.exit(1); }

// casas a verificar en la pestaña Flujo Mensual (esperados = datos reales de Supabase,
// espejo de Airtable "Pagos interes (HML & REFI)" tras el sync del 27-ago).
// `conceptos` / `prohibidos` verifican que HML y Refi 30 se distingan por su nombre real.
const CASAS = [
  {
    nombre: '4916 Barkbridge Trl (refinanciada oct-2025)',
    inv: 'rec8MhKDmkdD6Ouyr',
    pid: '6fa5ad93-31a7-462e-b48b-444491dd2b65',
    // jun-26: renta 2,000 · operativos 649.35 (569.35 + PM 80) · REFI 30 1,579.73 · neto −229.08
    mes: 'Junio 2026', ym: '2026-06', ing: /2,000/, gas: /649/, deu: /1,580/, neto: /−\$229|-\$229/,
    // Property Management: renta 2,000 x 4% = 80, al ultimo dia del mes.
    // (se probo editarlo a mano a $120/28-jun: el ledger lo respeto; despues se volvio al automatico con ↩)
    pm: { concepto: 'Pago Property Management (4%)', monto: '$80', fecha: '2026-06-30' },
    // HML hasta sep-2025, Refi 30 desde oct-2025: los DOS conceptos tienen que aparecer
    conceptos: ['Pago Refi 30 años', 'Pago interés HML'], prohibidos: [/Pago interés HML.*1,600|1,600/],
  },
  {
    nombre: '5003 Michelle Ct (refinanciada jul-2026)',
    inv: 'recRZUim6SaOnNmm5',
    pid: 'efad086f-3008-49fd-96da-dbeaaba650f2',
    // jun-26 todavía HML: renta 3,700 · operativos 148 (solo el PM 4%) · deuda 2,116.13 · neto 1,435.87
    mes: 'Junio 2026', ym: '2026-06', ing: /3,700/, gas: /148/, deu: /2,116/, neto: /1,436/,
    // renta 3,700 x 4% = 148, al ultimo dia del mes. En jul-26 NO debe existir (hay uno manual de $148)
    pm: { concepto: 'Pago Property Management (4%)', monto: '$148', fecha: '2026-06-30' },
    conceptos: ['Pago interés HML', 'Pago Refi 30 años'], prohibidos: [],
  },
  {
    nombre: '311 Bartlett St (NO refinanciada)',
    inv: 'reclmX5mhMW6zrkaP',
    pid: '565c8ef9-f019-4acb-8b54-4c57d1056e01',
    // jul-26: renta 850 · operativos 34 (solo el PM 4%) · interés HML 3,060 · neto −2,244
    mes: 'Julio 2026', ym: '2026-07', ing: /850/, gas: /34/, deu: /3,060/, neto: /−\$2,244|-\$2,244/,
    // renta 850 x 4% = 34
    pm: { concepto: 'Pago Property Management (4%)', monto: '$34', fecha: '2026-07-31' },
    // sin refi: NINGÚN movimiento puede decir "Refi 30"
    conceptos: ['Pago interés HML'], prohibidos: [/Refi 30/],
  },
];
// inversionista con 4 casas → sirve para el TOTAL del portafolio
const PORTA = { inv: 'recNU08Xri3he9jaC', nCasas: 4 };

const ok = [], fail = [], consola = [], pageerrors = [], req404 = [];
const chk = (n, c, e) => (c ? ok : fail).push(n + (e ? ' — ' + e : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const money = n => (+n < 0 ? '−$' : '$') + Math.abs(Math.round(+n)).toLocaleString('en-US');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200 });
// el service worker recarga la página ~1 min después de cargar (controllerchange) y parte la suite
await page.evaluateOnNewDocument(() => { try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {} });
page.on('pageerror', e => pageerrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') consola.push(m.text().slice(0, 200)); });
page.on('requestfailed', r => req404.push('failed ' + r.url()));
page.on('response', r => { if (r.status() >= 400) req404.push(r.status() + ' ' + r.url()); });

// ── 1) LOGIN REAL por el formulario ──
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('#auth-email', { timeout: 20000 });
await page.type('#auth-email', EMAIL, { delay: 10 });
await page.type('#auth-password', PASS, { delay: 10 });
await page.click('#auth-login-btn');
for (let i = 0; i < 40; i++) {
  if (await page.evaluate(() => !!document.getElementById('os-root') && getComputedStyle(document.getElementById('os-root')).display !== 'none')) break;
  await sleep(500);
}
chk('login real en ' + BASE + ' (shell OS montado)', await page.evaluate(() => !!document.getElementById('os-root')));
// el ruido del SHELL OS (antes de entrar al portal) se separa: no es del portal del inversionista.
// Hoy aparece un 401 de remodel_cost_calibracion durante el boot del shell — pre-existente,
// ajeno a este cambio; se reporta como informativo y NO tumba la corrida.
const ruidoShell = req404.splice(0, req404.length);

// helper: abre el portal de un inversionista y espera a que rendericen las pestañas
async function abrirPortal(inv, casa) {
  await page.goto(BASE + '/inversionista?ver=' + inv + (casa ? '&casa=' + casa : ''), { waitUntil: 'networkidle2', timeout: 60000 });
  for (let i = 0; i < 60; i++) {
    if (/Flujo Mensual/i.test(await page.evaluate(() => document.body.innerText || ''))) break;
    await sleep(500);
  }
}
async function clickTab(label) {
  const hecho = await page.evaluate(lab => {
    const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === lab);
    if (b) { b.click(); return true; } return false;
  }, label);
  await sleep(400);
  return hecho;
}

// ── 2) PESTAÑA "Flujo Mensual" por casa ──
for (const c of CASAS) {
  await abrirPortal(c.inv, c.pid);
  chk(c.nombre + ' · portal cargado', /Flujo Mensual/i.test(await page.evaluate(() => document.body.innerText)));
  chk(c.nombre + ' · click en la pestaña Flujo Mensual', await clickTab('Flujo Mensual'));
  for (let i = 0; i < 60; i++) {
    const t = await page.evaluate(() => document.body.innerText || '');
    if (/Detalle año/i.test(t) && !/Armando tu flujo mensual/.test(t)) break;
    await sleep(500);
  }
  await sleep(1200);
  // desde 03-sep-2026 "Todos los movimientos" viene AGRUPADO POR MES en acordeón (solo el mes
  // más reciente abierto): para revisar todo el historial hay que expandirlo primero.
  await page.evaluate(() => { if (window.ipMesTodos) window.ipMesTodos(true); });
  await sleep(900);

  const d = await page.evaluate(mes => {
    const heads = [...document.querySelectorAll('table thead tr')].map(tr => [...tr.children].map(t => t.innerText.trim()).join(' | '));
    const filas = [...document.querySelectorAll('table tbody tr')].map(tr => [...tr.children].map(t => t.innerText.trim()));
    const deudaRows = filas.filter(f => /servicio de deuda/i.test(f.join(' ')));
    // "Todos los movimientos": Fecha | Concepto | Categoría | Monto | Saldo | Fuente.
    // Las filas de encabezado de mes tienen una sola celda, así que quedan fuera de `movs`.
    // ⚠ desde el agrupado por mes (03-sep-2026) el orden VISUAL es ingresos-arriba /
    // gastos-abajo: el saldo anterior ya NO es "la fila de abajo" — hay que ordenar por FECHA.
    const movs = filas.filter(f => f.length >= 6);
    const crono = movs.slice().sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const n = t => { const v = parseFloat(String(t || '').replace(/[^0-9.\-]/g, '')); return isNaN(v) ? null : v; };
    const saldoMueve = re => {
      for (let i = 1; i < crono.length; i++) {
        if (!re.test(crono[i][1] || '')) continue;
        const a = n(crono[i][4]), b = n(crono[i - 1][4]);
        if (a == null || b == null) continue;
        return { concepto: crono[i][1], saldo: crono[i][4], saldoPrevio: crono[i - 1][4], cambia: a !== b, pnlNo: /P&L NO/.test(crono[i][1] || '') };
      }
      return null;
    };
    return {
      txt: document.body.innerText,
      heads,
      fila: filas.find(f => new RegExp(mes, 'i').test(f[0] || '')) || null,
      nDeuda: deudaRows.length,
      // concepto + monto de cada movimiento de deuda, tal cual se ve en "Todos los movimientos"
      deudaTxt: deudaRows.map(f => (f[1] || '') + ' ' + (f[3] || '')).join(' || '),
      // ¿el pago de deuda BAJA el saldo? ¿el draw/cash-out lo deja igual?
      movDeuda: saldoMueve(/servicio de deuda/i),
      movCapital: saldoMueve(/Desembolso Hard Money|Cash-out|Draw|Distribuci/i),
      // Property Management: todas sus filas (fecha | concepto | monto | saldo)
      pmRows: movs.filter(f => /Property Management/i.test(f[1] || ''))
                  .map(f => ({ fecha: f[0], concepto: f[1], categoria: f[2], monto: f[3], saldo: f[4], fuente: f[5] })),
      movPm: saldoMueve(/Property Management/i),
    };
  }, c.mes);

  const f = d.fila || [];
  chk(c.nombre + ' · tabla mensual con columna "Servicio de deuda" + "Flujo neto"',
    d.heads.some(h => /Servicio de deuda/i.test(h) && /Flujo neto/i.test(h)), d.heads.find(h => /Mes/.test(h)));
  chk(c.nombre + ' · tarjeta "Servicio de deuda"', /Servicio de deuda/i.test(d.txt));
  chk(c.nombre + ' · tarjeta "Flujo después de deuda"', /Flujo después de deuda/i.test(d.txt));
  chk(c.nombre + ' · el NOI (Balance operativo) se mantiene aparte', /Balance operativo/i.test(d.txt));
  chk(c.nombre + ' · ' + c.mes + ' ingresos', c.ing.test(f[1] || ''), JSON.stringify(f));
  chk(c.nombre + ' · ' + c.mes + ' gastos operativos', c.gas.test(f[2] || ''), JSON.stringify(f));
  chk(c.nombre + ' · ' + c.mes + ' SERVICIO DE DEUDA', c.deu.test(f[3] || ''), JSON.stringify(f));
  chk(c.nombre + ' · ' + c.mes + ' FLUJO NETO ya con la deuda restada', c.neto.test(f[4] || ''), JSON.stringify(f));
  chk(c.nombre + ' · filas 🏦 servicio de deuda en "Todos los movimientos"', d.nDeuda > 0, d.nDeuda + ' filas');
  // CONCEPTO real: HML y Refi 30 tienen que distinguirse por nombre, no ser todos "HML"
  (c.conceptos || []).forEach(cc => chk(c.nombre + ' · concepto "' + cc + '" presente',
    d.deudaTxt.includes(cc), d.deudaTxt.slice(0, 220)));
  (c.prohibidos || []).forEach(rx => chk(c.nombre + ' · NO aparece ' + rx,
    !rx.test(d.deudaTxt), d.deudaTxt.slice(0, 220)));
  // ── el ajuste del 27-ago: el servicio de deuda RESTA y MUEVE EL SALDO ──
  chk(c.nombre + ' · la columna del Ledger es "Saldo de caja"', /Saldo de caja/i.test(d.heads.join(' | ')), d.heads.find(h => /Saldo/.test(h)));
  chk(c.nombre + ' · el pago de deuda BAJA el saldo del Ledger',
    !!(d.movDeuda && d.movDeuda.cambia), JSON.stringify(d.movDeuda));
  chk(c.nombre + ' · el pago de deuda YA NO lleva la etiqueta "P&L NO"',
    !!(d.movDeuda && !d.movDeuda.pnlNo), JSON.stringify(d.movDeuda));
  if (d.movCapital) {
    chk(c.nombre + ' · draw / cash-out / distribución NO mueve el saldo (sigue P&L NO)',
      d.movCapital.cambia === false, JSON.stringify(d.movCapital));
  }
  // ── ítem automático "Pago Property Management" (4% de la renta del mes) ──
  if (c.pm) {
    const fila = (d.pmRows || []).find(f => f.fecha === c.pm.fecha);
    chk(c.nombre + ' · PM: hay ítem en ' + c.pm.fecha, !!fila, JSON.stringify((d.pmRows || []).slice(0, 3)));
    chk(c.nombre + ' · PM: concepto "' + c.pm.concepto + '"', !!(fila && fila.concepto.includes(c.pm.concepto)), fila && fila.concepto);
    chk(c.nombre + ' · PM: monto ' + c.pm.monto, !!(fila && fila.monto.includes(c.pm.monto)), fila && fila.monto);
    chk(c.nombre + ' · PM: categoría operativo (resta del mes)', !!(fila && /operativo/i.test(fila.categoria)), fila && fila.categoria);
    chk(c.nombre + ' · PM: fecha = fin de mes o la editada', !!(fila && /-(28|29|30|31)$/.test(fila.fecha)), fila && fila.fecha);
    chk(c.nombre + ' · PM: BAJA el saldo del Ledger', !!(d.movPm && d.movPm.cambia), JSON.stringify(d.movPm));
    chk(c.nombre + ' · PM: todas las fechas son fin de mes o edición manual',
      (d.pmRows || []).every(f => /-(28|29|30|31)$/.test(f.fecha)), (d.pmRows || []).map(f => f.fecha).join(', '));
    chk(c.nombre + ' · PM: un solo ítem por mes (sin duplicados)',
      new Set((d.pmRows || []).map(f => String(f.fecha).slice(0, 7))).size === (d.pmRows || []).length,
      (d.pmRows || []).map(f => f.fecha).join(', '));
  }

  // coherencia con la distribución automática: mismo mes, mismo neto
  const rpc = await page.evaluate(async ([pid, mes]) => {
    const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const r = await sb.rpc('inv_dist_auto', { p_property_id: pid, p_billing_ym: mes });
    return r.error ? { err: r.error.message } : { renta: r.data.renta, oper: r.data.operativos, deuda: r.data.deuda, neto: r.data.neto };
  }, [c.pid, c.ym]);
  chk(c.nombre + ' · el neto del portal = el neto de inv_dist_auto (' + c.ym + ')',
    rpc && rpc.neto != null && (f[4] || '') === money(rpc.neto), (f[4] || '') + ' vs ' + JSON.stringify(rpc));
  console.log('\n' + c.nombre + ' · ' + c.mes + ': ' + JSON.stringify(d.fila) + '  | inv_dist_auto: ' + JSON.stringify(rpc));
}

// ── 3) "Mi Portafolio": el TOTAL de todas las casas resta el servicio de deuda ──
await abrirPortal(PORTA.inv, null);
chk('portafolio (4 casas) · click en la pestaña Mi Portafolio', await clickTab('Mi Portafolio'));
for (let i = 0; i < 60; i++) {
  if (/Tus casas de un vistazo/i.test(await page.evaluate(() => document.body.innerText || ''))) break;
  await sleep(500);
}
await sleep(1200);

// OJO: se lee IP.resumen (el dataset que REALMENTE pinta la pantalla). Llamar a la RPC desde
// acá daría otra cosa: logueado como admin, inv_portal_resumen() devuelve las 23 casas del
// portafolio entero, mientras que el portal en modo "ver como" trae solo las de ESE
// inversionista (inv_portal_como → inv_portal_resumen_de).
const p = await page.evaluate(() => {
  const filas = (window.IP && window.IP.resumen ? window.IP.resumen : []).map(x => ({ casa: x.casa, flujo: x.flujo_ult_mes, ym: x.flujo_ult_mes_ym }));
  const txt = document.body.innerText;
  const m = txt.match(/Flujo del último mes · todas tus casas:\s*(−?\$[\d,]+)/);
  return { txt, filas, total: m ? m[1] : null };
});
const sumaRpc = p.filas.reduce((s, x) => s + (x.flujo != null ? +x.flujo : 0), 0);
chk('portafolio · línea de TOTAL "todas tus casas" visible', !!p.total, p.total || 'no encontrada');
chk('portafolio · el total en pantalla = suma de las casas del resumen',
  p.total === money(sumaRpc), p.total + ' vs ' + money(sumaRpc));
chk('portafolio · la línea declara que ya resta el servicio de deuda',
  /servicio de deuda/i.test(p.txt) && /renta − gastos operativos − servicio de deuda/i.test(p.txt));
chk('portafolio · las tarjetas dicen "ya con la deuda descontada"', /ya con la deuda descontada/i.test(p.txt));
chk('portafolio · ' + PORTA.nCasas + ' casas en el resumen', p.filas.length === PORTA.nCasas, p.filas.length + ' casas');
console.log('\nPortafolio: total en pantalla ' + p.total + ' · suma RPC ' + money(sumaRpc));
console.log('Casas: ' + JSON.stringify(p.filas));

// ── 4) higiene ──
chk('0 pageerrors', pageerrors.length === 0, pageerrors.join(' | '));
// el 404 de /config.js es POR DISEÑO (override local gitignored, con onerror que lo remueve)
const ruido = req404.filter(u => !/config\.js|favicon\.ico/.test(u));
const consolaReal = consola.filter(c => !/config\.js|favicon|Failed to load resource/.test(c));
chk('0 errores de consola (fuera del 404 by-design de /config.js)', consolaReal.length === 0, consolaReal.join(' | '));
chk('portal · sin requests fallidos ajenos a /config.js y /favicon.ico', ruido.length === 0, ruido.join(' | '));
const ruidoShellReal = ruidoShell.filter(u => !/config\.js|favicon\.ico/.test(u));
if (ruidoShellReal.length) console.log('\nℹ ruido del shell OS previo al portal (informativo, ajeno a este cambio): ' + ruidoShellReal.join(' | '));

console.log('\nQA FLUJO + PORTAFOLIO con servicio de deuda (' + BASE + ') — ' + ok.length + ' OK · ' + fail.length + ' FALLAS');
ok.forEach(o => console.log('  ✓ ' + o));
fail.forEach(f => console.log('  ✗ ' + f));
await browser.close();
process.exit(fail.length ? 1 : 0);
