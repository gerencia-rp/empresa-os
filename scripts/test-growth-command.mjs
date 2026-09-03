import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const port = 5187;
const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const waitForServer = async () => {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/growth-command.html?auth=demo`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('El servidor local no respondió.');
};

let browser;
try {
  await waitForServer();
  browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'],
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewport({ width: 1440, height: 980, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/growth-command.html?auth=demo`, { waitUntil: 'networkidle2' });
  try {
    await page.waitForSelector('.directive-card', { timeout: 10000 });
  } catch (error) {
    const body = await page.$eval('body', node => node.innerText.slice(0, 1000));
    throw new Error(`La vista inicial no apareció. Errores: ${pageErrors.join(' | ') || 'ninguno'}. Pantalla: ${body}`, { cause: error });
  }

  assert.match(await page.$eval('.demo-banner', element => element.innerText), /Datos de demostración/);
  assert.equal(await page.$$eval('.funnel-step', nodes => nodes.length), 5, 'El embudo debe tener cinco etapas');
  assert.equal(await page.$$eval('.platform-card', nodes => nodes.length), 5, 'Debe cubrir cinco plataformas');
  assert.ok((await page.$$eval('.platform-card', nodes => nodes.map(node => node.innerText))).every(text => /\/ 5 piezas/.test(text)), 'Cada plataforma debe mostrar la meta de cinco piezas');

  for (const view of ['teams', 'flow', 'approval', 'calendar', 'learning', 'quality']) {
    await page.click(`[data-view="${view}"]`);
    await page.waitForSelector('#view-root > *');
    assert.equal(await page.$eval('#view-title', node => node.textContent.trim()), {
      teams: 'Equipos de agentes', flow: 'Flujo integral', approval: 'Aprobación semanal', calendar: 'Calendario editorial', learning: 'Aprendizaje', quality: 'Consejo de calidad'
    }[view]);
  }

  assert.ok(await page.$$eval('.qa-card', nodes => nodes.length) >= 12, 'El consejo debe incluir todos los controles requeridos');
  assert.match(await page.$eval('.qa-gate h2', node => node.textContent), /No listo todavía/);
  if (process.env.GROWTH_SCREENSHOTS_DIR) {
    await page.screenshot({ path: `${process.env.GROWTH_SCREENSHOTS_DIR}/growth-quality-desktop.png`, fullPage: true });
  }
  const qualityBefore = Number(await page.$eval('#quality-count', node => node.textContent));
  const firstOpenCheck = await page.$('[data-action="qa-status"][data-id="virality-validation"][data-status="passed"]');
  await firstOpenCheck.click();
  await page.waitForFunction(before => Number(document.querySelector('#quality-count').textContent) < before, {}, qualityBefore);

  await page.click('[data-view="approval"]');
  const pendingBefore = Number(await page.$eval('#approval-count', node => node.textContent));
  await page.click('.piece-card [data-status="approved"]');
  await page.waitForFunction(before => Number(document.querySelector('#approval-count').textContent) < before, {}, pendingBefore);

  await page.select('#demo-state', 'empty');
  await page.waitForSelector('.empty-state');
  assert.match(await page.$eval('.empty-state', node => node.innerText), /No vamos a inventar actividad/);

  await page.click('[data-action="show-demo"]');
  await page.waitForSelector('.piece-card');

  if (process.env.GROWTH_SCREENSHOTS_DIR) {
    await page.click('[data-view="command"]');
    await page.screenshot({ path: `${process.env.GROWTH_SCREENSHOTS_DIR}/growth-command-desktop.png`, fullPage: true });
  }

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.click('[data-view="command"]');
  const mobile = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    navVisible: getComputedStyle(document.querySelector('.sidebar')).position === 'fixed',
    cards: document.querySelectorAll('.platform-card').length,
  }));
  assert.equal(mobile.width, mobile.viewport, 'La vista móvil no debe desbordar horizontalmente');
  assert.equal(mobile.navVisible, true, 'La navegación móvil debe quedar disponible');
  assert.equal(mobile.cards, 5);

  if (process.env.GROWTH_SCREENSHOTS_DIR) {
    await page.screenshot({ path: `${process.env.GROWTH_SCREENSHOTS_DIR}/growth-command-mobile.png`, fullPage: true });
    await page.evaluate(() => document.querySelector('[data-view="quality"]').click());
    await page.screenshot({ path: `${process.env.GROWTH_SCREENSHOTS_DIR}/growth-quality-mobile.png`, fullPage: true });
  }

  assert.deepEqual(pageErrors, [], `Errores de página: ${pageErrors.join(' | ')}`);
  console.log('Growth Command UI: navegación, decisiones, estados y responsive verificados.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
