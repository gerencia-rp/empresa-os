// Verifica EN PANTALLA (prod) que el toggle Manual/Automática de Distribuciones se ve y funciona.
// Renderiza iaTabDist vía window.invAdminView con IA stubbeado (no requiere login: es render puro).
import puppeteer from 'puppeteer-core';

const BASE = 'https://empresa-os-admin.vercel.app';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ok = [], fail = [], errs = [];
const chk = (n, c, e) => (c ? ok : fail).push(n + (e ? ' — ' + e : ''));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
await page.evaluateOnNewDocument(() => { try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {} });
page.on('pageerror', e => errs.push(e.message));
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));

// monta el admin de inversionistas con estado mínimo y la pestaña Distribuciones abierta
const setup = async (modo) => page.evaluate((modo) => {
  const IA = window.IA;
  IA.tab = 'dist'; IA.distMode = modo; IA.distCalc = null; IA.loaded = true; IA.loading = false; IA.err = null;
  IA.holdings = [{ property_id: 'pid-demo', investor_airtable_id: 'recDEMO', reparto_pct: 0.4, active: true }];
  IA.investors = [{ airtable_id: 'recDEMO', nombre: 'Inversionista Demo' }];
  IA.deals = [{ property_id: 'pid-demo', address: '5003 Michelle Ct' }];
  IA.dists = []; IA.access = [];
  // el shell del OS inyecta #os-styles (.card/.cbtn/.lab/.osa-in) al montarse; sin login no
  // corrió → lo forzamos para que el screenshot refleje el aspecto REAL, no el del stub.
  try { if (!document.getElementById('os-styles') && window.osInit) window.osInit(); } catch (e) {}
  // el login queda montado encima → lo sacamos para poder VER el panel en el screenshot
  document.querySelectorAll('body > *').forEach(el => { if (el.id !== 'os-root') el.style.display = 'none'; });
  let root = document.getElementById('os-root');
  if (!root) { root = document.createElement('div'); root.id = 'os-root'; document.body.appendChild(root); }
  document.querySelectorAll('body > *').forEach(el => { if (el.id !== 'os-root') el.remove(); });
  root.style.display = ''; root.style.zIndex = '9999'; root.style.opacity = '1'; root.style.filter = 'none';
  root.innerHTML = '<div class="wrap">' + window.invAdminView() + '</div>';
  return true;
}, modo);

await setup('manual');
const vis = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('#os-root button')].filter(b => /Manual|Autom/.test(b.textContent));
  return btns.map(b => {
    const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    return { txt: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), disp: cs.display, vis: cs.visibility, op: cs.opacity, bg: cs.backgroundColor, color: cs.color };
  });
});
chk('hay 2 botones de modo en el DOM', vis.length === 2, JSON.stringify(vis.map(v => v.txt)));
chk('ambos tienen tamaño visible (>60x24px)', vis.every(v => v.w > 60 && v.h > 24), JSON.stringify(vis.map(v => v.w + 'x' + v.h)));
chk('ninguno oculto (display/visibility/opacity)', vis.every(v => v.disp !== 'none' && v.vis !== 'hidden' && +v.op > 0.5), JSON.stringify(vis.map(v => v.disp + '/' + v.vis + '/' + v.op)));
chk('el activo (Manual) está resaltado', vis.some(v => /Manual/.test(v.txt) && v.bg !== 'rgba(0, 0, 0, 0)'), vis.map(v => v.txt + ':' + v.bg).join(' | '));
// gotcha conocido: .lab lleva text-transform:uppercase y innerText lo respeta → case-insensitive
chk('label "Modo de carga" presente', await page.evaluate(() => /modo de carga/i.test(document.getElementById('os-root').innerText)));
chk('el form MANUAL se ve por defecto', await page.evaluate(() => !!document.getElementById('ia-d-monto')));
if (process.env.QA_SHOTS) await page.screenshot({ path: 'verify-manual.png', clip: await page.evaluate(() => { const c = document.querySelector('#os-root .card'); const r = c.getBoundingClientRect(); return { x: Math.max(0,r.x-10), y: Math.max(0,r.y-10), width: Math.min(1380, r.width+20), height: Math.min(700, r.height+20) }; }) });

// cambiar a Automática por CLICK real
await page.evaluate(() => { [...document.querySelectorAll('#os-root button')].find(b => /Autom/.test(b.textContent)).click(); });
await new Promise(r => setTimeout(r, 400));
// osRender() del shell no re-renderiza nuestro stub → re-montamos leyendo el estado que dejó el click
const modoTrasClick = await page.evaluate(() => window.IA.distMode);
chk('el click cambia IA.distMode a "auto"', modoTrasClick === 'auto', String(modoTrasClick));
await setup('auto');
const auto = await page.evaluate(() => {
  const t = document.getElementById('os-root').innerText;
  return {
    casa: !!document.getElementById('ia-da-casa'), mes: !!document.getElementById('ia-da-mes'),
    calcular: /Calcular desde el Ledger/.test(t), formula: /renta − gastos operativos − servicio de deuda/.test(t),
    manualForm: !!document.getElementById('ia-d-monto'),
  };
});
chk('modo auto: selector de CASA', auto.casa);
chk('modo auto: selector de MES', auto.mes);
chk('modo auto: botón "Calcular desde el Ledger"', auto.calcular);
chk('modo auto: explica la fórmula (renta − operativos − deuda)', auto.formula);
chk('modo auto: el form manual ya NO se muestra', !auto.manualForm);
chk('0 pageerrors', errs.length === 0, errs.join(' | '));
chk('estilos del OS presentes (#os-styles)', await page.evaluate(() => !!document.getElementById('os-styles')));
chk('el botón primario .cbtn queda estilado', await page.evaluate(() => { const b = [...document.querySelectorAll('#os-root button')].find(x => /Calcular desde el Ledger/.test(x.textContent)); return b && getComputedStyle(b).backgroundImage !== 'none'; }));
if (process.env.QA_SHOTS) await page.screenshot({ path: 'verify-auto.png', clip: await page.evaluate(() => { const c = document.querySelector('#os-root .card'); const r = c.getBoundingClientRect(); return { x: Math.max(0,r.x-10), y: Math.max(0,r.y-10), width: Math.min(1380, r.width+20), height: Math.min(700, r.height+20) }; }) });

console.log('\n🚦 VERIFICACIÓN DEL TOGGLE — ' + ok.length + ' OK · ' + fail.length + ' FALLAS');
ok.forEach(x => console.log('  ✓ ' + x));
fail.forEach(x => console.log('  ✗ ' + x));
await browser.close();
process.exit(fail.length ? 1 : 0);
