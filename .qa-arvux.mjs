// QA headless en PROD: UX PropStream de la Calc 2 (mapa, ficha, resumen, tarjetas, grilla)
import puppeteer from 'puppeteer-core';
const BASE = 'https://empresa-os.vercel.app';
const SCRATCH = process.env.SCRATCH;
const ok = [], bad = [];
const chk = (n, c, e) => (c ? ok : bad).push(n + (e ? ' — ' + e : ''));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 1440, height: 3400, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(String(e).slice(0, 140)));
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.type('#auth-email', 'qa-admin-test@rentalprofitss.com');
  await page.type('#auth-password', 'QaAdmin2026!panel');
  await page.click('#auth-login-btn');
  await page.waitForFunction(() => window.OS && document.querySelector('#os-root'), { timeout: 60000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => window.osGo ? osGo('/fix-and-flip/underwriting') : (location.href = '/fix-and-flip/underwriting'));
  await page.waitForFunction(() => window.UW && UW.deals && UW.deals.length > 0 && document.getElementById('ff-uw-body'), { timeout: 90000 });
  await page.evaluate(async () => {
    const d = UW.deals.find(x => /shadow/i.test(x.address || ''));
    ffUwCargarCasa(d.id); ffUwSub('arv');
    apSet('dir', '6203 Shadow Bend, Austin, TX 78745');
    await apBuscar(false);
  });
  await new Promise(r => setTimeout(r, 5000)); // Leaflet + tiles

  const st = await page.evaluate(() => {
    const html = document.getElementById('ff-uw-body').innerHTML;
    return {
      ficha: /APN/.test(html) && /Condado/.test(html) && /Dueño/.test(html) && /Valor tasado/.test(html) && /Última venta/.test(html),
      warnDir: /devolvió otra dirección/.test(html),
      hero: /ARV estimado \(comps ajustados\)/.test(html) && /conservador/.test(html) && /optimista/.test(html),
      criterio: /Criterio de búsqueda/.test(html),
      resumen: /BAJO/.test(html) && /PROMEDIO/.test(html) && /ALTO/.test(html),
      mapaLoaded: !!(window.L && document.querySelector('#ap-map .leaflet-tile-container')),
      pins: document.querySelectorAll('#ap-map .ap-pin').length,
      cards: document.querySelectorAll('.ap-comp').length,
      pesos: (html.match(/peso \d+%/g) || []).length,
      corregir: /corregir dirección/.test(html),
    };
  });
  chk('ficha completa (APN/condado/dueño/assessed/venta)', st.ficha);
  chk('sin falso warning de dirección (Bend vs Bnd)', !st.warnDir);
  chk('hero + barra de rango', st.hero);
  chk('criterio de búsqueda visible', st.criterio);
  chk('resumen SUBJECT vs BAJO/PROM/ALTO', st.resumen);
  chk('mapa Leaflet con tiles', st.mapaLoaded);
  chk('pins subject + comps (21)', st.pins === 21, String(st.pins));
  chk('tarjetas de comps (20)', st.cards === 20, String(st.cards));
  chk('pesos visibles en tarjetas', st.pesos >= 6, String(st.pesos));
  chk('botón corregir dirección', st.corregir);

  // toggle grilla 1004
  const g = await page.evaluate(() => {
    apSet('vista', 'grid');
    const html = document.getElementById('ff-uw-body').innerHTML;
    return { grilla: /Comparable →/.test(html) && /Ajustes al subject/.test(html) && /Valor ajustado/.test(html) && /Peso en el ARV/.test(html), subjcol: /subjcol/.test(html) };
  });
  chk('grilla 1004 lado a lado (toggle)', g.grilla && g.subjcol);

  // click pin resalta comp (simulado con apPinClick)
  const pin = await page.evaluate(() => {
    apSet('vista', 'cards');
    const card = document.querySelector('.ap-comp'); if (!card) return false;
    apPinClick(card.id);
    return card.classList.contains('hl');
  });
  chk('click en pin resalta la tarjeta', pin);

  // screenshots por sección (mapa + comps)
  await page.evaluate(() => { apSet('vista', 'cards'); document.getElementById('ap-map').scrollIntoView(); });
  await new Promise(r => setTimeout(r, 2500));
  const mapEl = await page.$('#ap-map');
  if (mapEl) await mapEl.screenshot({ path: SCRATCH + '/arv-mapa.png' });
  const cardsEl = await page.$('.ap-cards');
  if (cardsEl) await cardsEl.screenshot({ path: SCRATCH + '/arv-cards.png' });
  await page.evaluate(() => { apSet('vista', 'grid'); });
  await new Promise(r => setTimeout(r, 600));
  const gridEl = await page.$('.ap-grid');
  if (gridEl) await gridEl.screenshot({ path: SCRATCH + '/arv-grilla.png' });

  chk('0 pageerrors', errors.length === 0, errors.join(' | '));
} finally { await browser.close(); }
console.log('\n✅ ' + ok.length + ' OK'); ok.forEach(x => console.log('  ✓ ' + x));
if (bad.length) { console.log('❌ ' + bad.length); bad.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
