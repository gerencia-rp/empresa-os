// Verificación de RENDER en navegador real del rediseño (bundle real, sin login posible: la cred QA
// del entorno está rotada). Inyecta datos de shape realista + los números YA verificados por SQL, y
// dispara osRender() sobre el bundle en vivo → confirma que el layout nuevo pinta sin throw y con la
// estructura de la referencia. Los VALORES reales se validaron aparte contra Supabase prod.
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { existsSync } from 'node:fs';
import { join, extname } from 'node:path'; import puppeteer from 'puppeteer-core';
const DIST = join(process.cwd(), 'dist');
const CHROME = process.env.QA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; let f = join(DIST, p); if (!existsSync(f) && !extname(p)) f = join(DIST, 'index.html'); try { const b = await readFile(f); res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end('404'); } });
await new Promise(r => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = [], fail = [], pageerrors = [];
const chk = (n, c, e) => { (c ? ok : fail).push(n); console.log((c ? '✓' : '✗') + ' ' + n + (e && !c ? ' — ' + e : '')); };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 1000 });
await page.evaluateOnNewDocument(() => { try { navigator.serviceWorker.register = () => Promise.reject(new Error('stub')); } catch (e) {} });
page.on('pageerror', e => pageerrors.push(e.message));
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(500);

// Inyectar estado + datos realistas (números reales verificados por SQL) y renderizar el bundle real.
const inj = await page.evaluate(() => {
  try {
    // `state` es un `let` global-léxico de app.js (no window.state) — se muta por nombre.
    state.user = { id: 'qa' }; state.role = 'admin'; state.allowedAreas = ['fix-flip', 'rentas', 'remodelacion', 'operacion', 'contable'];
    const O = window.OS;
    O.userName = 'Nicolás';
    O.ff = [
      { address: '6504 Stonleigh, Austin, TX', address_norm: 'stonleigh', purchase_price: 200000, arv: 300000, remodel_est: 60000, deficit_total: 70855, stage: 'rentada' },
      { address: '902 Virginia, Austin, TX', address_norm: 'virginia', purchase_price: 180000, arv: 280000, remodel_est: 55000, deficit_total: 70529, stage: 'rentada' },
      { address: '2315 Dove Springs, Austin, TX', address_norm: 'dove', purchase_price: 150000, arv: 240000, remodel_est: 50000, deficit_total: 30430, stage: 'rentada' },
      { address: '1200 Echo, Austin, TX', address_norm: 'echo', purchase_price: 160000, arv: 250000, remodel_est: 48000, deficit_total: 36391, stage: 'rentada' },
      { address: '77 Charles St, Austin, TX', address_norm: 'charles', purchase_price: 247000, arv: 400000, remodel_est: 110000, deficit_total: null, stage: 'rehab' },
      { address: '9 Sold Ave, Austin, TX', address_norm: 'sold', purchase_price: 100000, arv: 200000, remodel_est: 30000, deficit_total: null, stage: 'vendida' },
    ];
    O.draws = [];
    O.props = [{ id: 'p1', name: '4905 Nesting Way, Austin, TX 78744' }, { id: 'p2', name: '5702 Meadow Crest, Austin, TX 78744' }];
    O.units = [
      { id: 'u1', property_id: 'p1', status: 'Ocupada', unit_type: 'casa_completa', target_rent: 3000, is_active: true },
      { id: 'u2', property_id: 'p2', status: 'Disponible', unit_type: 'casa_completa', target_rent: 3200, is_active: true },
    ];
    const ym = new Date().toISOString().slice(0, 7);
    O.pay = [{ amount: 37718, type: 'ingreso', status: 'pagado', property_id: 'p1', billing_ym: ym }];
    O.expenses = [{ amount: 39121.79, billing_ym: ym, category: 'operativo', scope: 'casa' }];
    O.cartera = [
      { inquilino: 'A', vencido_neto: 3000, aging: '0-30' }, { inquilino: 'B', vencido_neto: 1400, aging: '30-60' },
      { inquilino: 'C', vencido_neto: 1600, aging: '0-30' }, { inquilino: 'D', vencido_neto: 12636.01, aging: '60+' },
    ];
    O.remodel = [
      { address: '77 Charles St', city: 'Austin', proceso: 'Construcción', avance_pct: 60, retraso_dias: 14, avance_real: 60 },
      { address: '20 Bitter Creek', city: 'Austin', proceso: 'Pre construcción', avance_pct: 0, retraso_dias: 0, avance_real: 0 },
    ];
    O.ocup = { ocupacion_pct: 70.59, unidades_rentables: 51, ocupadas: 36, mantenimiento: 4, disponibles: 11 };
    O.agProps = Array.from({ length: 168 }, (_, i) => ({ tipo_accion: ['recordatorio_cobro', 'nudge', 'informe', 'conciliacion', 'archivar_tarea'][i % 5] }));
    O.qbCache = []; O.capital = null; O.loaded = true; O.loadErr = null;
    window.osInjectCSS && osInjectCSS();
    if (!document.getElementById('os-root')) { const d = document.createElement('div'); d.id = 'os-root'; document.body.appendChild(d); }
    O.route = osParse('/'); osRender();
    return 'ok';
  } catch (e) { return 'THREW: ' + e.message; }
});
chk('inyección + osRender() sin throw', inj === 'ok', inj);
await sleep(400);

const inicio = await page.evaluate(() => {
  const t = document.querySelector('#os-root .osx-main')?.innerText || '';
  return {
    sidebar: !!document.querySelector('#os-root .osx-side'),
    navs: [...document.querySelectorAll('#os-root .osx-nav')].map(a => a.innerText.trim()),
    kpis: document.querySelectorAll('#os-root .card.kpi').length,
    hasAtrapada: /Caja atrapada/i.test(t), hasOcup: /Ocupaci/i.test(t), hasTeDeben: /Te deben/i.test(t), hasCaja: /Caja del mes/i.test(t),
    directiva: /Directiva del d/.test(t), decisiones: /Decisiones que necesitan tu s/.test(t), ask: !!document.querySelector('#os-root .askbig'),
    salud: /Salud por l/.test(t), vigilar: /Casas que vigilar/.test(t),
    saludo: /Buen(os|as)/.test(t),
    montos: (t.match(/\$[\d.,]+/g) || []),
  };
});
console.log('  navs:', JSON.stringify(inicio.navs));
console.log('  montos:', JSON.stringify(inicio.montos.slice(0, 10)));
chk('sidebar business-language (Inicio·Casas·Rentas·Cobros·Cerebro·Decisiones·Reportes)', inicio.sidebar && ['Inicio', 'Casas', 'Rentas', 'Cobros y pagos', 'Cerebro', 'Decisiones', 'Reportes'].every(x => inicio.navs.some(n => n.includes(x))), JSON.stringify(inicio.navs));
chk('4 KPIs de la referencia', inicio.kpis === 4 && inicio.hasAtrapada && inicio.hasOcup && inicio.hasTeDeben && inicio.hasCaja);
chk('Directiva + Decisiones + Cerebro + Salud + Casas que vigilar', inicio.directiva && inicio.decisiones && inicio.ask && inicio.salud && inicio.vigilar, JSON.stringify(inicio));
chk('saludo personalizado', inicio.saludo);
chk('KPIs con montos reales ($297k/$302k, $18,636, etc.)', inicio.montos.length >= 4);
await page.screenshot({ path: '/tmp/inicio.png', fullPage: true });

// Casas
await page.evaluate(() => { OS.route = osParse('/casas'); osRender(); }); await sleep(400);
const casas = await page.evaluate(() => { const t = document.querySelector('#os-root .osx-main')?.innerText || ''; return { title: /Tus casas/.test(t), rows: document.querySelectorAll('#os-root .drow').length, rentas: /Rentas/.test(t), ff: /Fix . Flip/.test(t) || /Holding/.test(t), remo: /Remodelaci/.test(t) }; });
chk('/casas portafolio (3 líneas + filas)', casas.title && casas.rows > 0, JSON.stringify(casas));
await page.screenshot({ path: '/tmp/casas.png', fullPage: true });

// Decisiones
await page.evaluate(() => { OS.route = osParse('/decisiones'); osRender(); }); await sleep(400);
const dec = await page.evaluate(() => { const t = document.querySelector('#os-root .osx-main')?.innerText || ''; return { title: /Decisiones por aprobar/.test(t), agentes: /Propuestas de tus agentes/.test(t), enCola: /168/.test(t), rows: document.querySelectorAll('#os-root .drow').length }; });
chk('/decisiones (tus decisiones + 168 propuestas de agentes)', dec.title && dec.agentes && dec.enCola, JSON.stringify(dec));
await page.screenshot({ path: '/tmp/decisiones.png', fullPage: true });

// Light mode
await page.evaluate(() => { OS.route = osParse('/'); osRender(); window.osToggleTheme && osToggleTheme(); }); await sleep(400);
const theme = await page.evaluate(() => document.getElementById('os-root').getAttribute('data-theme'));
chk('toggle claro/oscuro', theme === 'light', 'theme=' + theme);
await page.screenshot({ path: '/tmp/inicio-light.png', fullPage: true });

chk('sin pageerrors', pageerrors.length === 0, pageerrors.slice(0, 4).join(' | '));
console.log('\nRESULTADO:', ok.length + '/' + (ok.length + fail.length), '· pageerrors:', pageerrors.length);
console.log('screenshots: /tmp/inicio.png /tmp/casas.png /tmp/decisiones.png /tmp/inicio-light.png');
await browser.close(); server.close();
process.exit(fail.length || pageerrors.length ? 1 : 0);
