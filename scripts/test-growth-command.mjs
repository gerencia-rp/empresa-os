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
    await page.waitForSelector('.today-hero', { timeout: 10000 });
  } catch (error) {
    const body = await page.$eval('body', node => node.innerText.slice(0, 1000));
    throw new Error(`La vista inicial no apareció. Errores: ${pageErrors.join(' | ') || 'ninguno'}. Pantalla: ${body}`, { cause: error });
  }

  assert.match(await page.$eval('.demo-banner', element => element.innerText), /Datos y decisiones de demostración/);
  assert.equal(await page.$$eval('.day-step', nodes => nodes.length), 9, 'La jornada inicial debe tener nueve pasos operables');
  assert.equal(await page.$$eval('.connection-card', nodes => nodes.length), 4, 'Debe explicar el estado de las cuatro capas de integración');
  assert.match(await page.$eval('.today-side', node => node.innerText), /Preparar, no publicar/);

  const todayBefore = Number(await page.$eval('#today-count', node => node.textContent));
  await page.click('[data-action="day-status"][data-id="directive"]');
  await page.waitForFunction(before => Number(document.querySelector('#today-count').textContent) < before, {}, todayBefore);

  await page.click('[data-view="radar"]');
  assert.equal(await page.$$eval('.signal-card', nodes => nodes.length), 5, 'El radar debe mostrar señales con fuente y vigencia');
  await page.click('[data-action="signal-decision"][data-id="signal-1"][data-status="test"]');
  await page.waitForFunction(() => document.querySelector('.signal-card')?.innerText.includes('Probar'));

  await page.click('[data-view="command"]');
  assert.equal(await page.$$eval('.funnel-step', nodes => nodes.length), 5, 'El embudo debe tener cinco etapas');
  assert.equal(await page.$$eval('.platform-card', nodes => nodes.length), 5, 'Debe cubrir cinco plataformas');
  assert.ok((await page.$$eval('.platform-card', nodes => nodes.map(node => node.innerText))).every(text => /\/ 5 piezas/.test(text)), 'Cada plataforma debe mostrar la meta de cinco piezas');

  await page.click('[data-view="lab"]');
  assert.equal(await page.$$eval('.agent-run-card', nodes => nodes.length), 9, 'El banco debe incluir los nueve agentes');
  assert.match(await page.$eval('.runtime-line', node => node.innerText), /Fixture exclusiva de localhost/);
  await page.click('[data-action="run-all"]');
  await page.waitForFunction(() => Number(document.querySelector('#agent-run-count')?.textContent || 0) === 9, { timeout: 20000 });
  assert.equal(await page.$$eval('.agent-run-card.is-complete', nodes => nodes.length), 9, 'La batería local debe mostrar nueve entregas completas');
  assert.ok((await page.$$eval('.run-foot > span', nodes => nodes.map(node => node.innerText))).every(text => /Fixture local/.test(text)), 'Las pruebas locales deben rotularse como fixtures');
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('empresa-os-growth-agent-runs-v1') || '[]').length === 9), 'Las entregas deben conservarse en el navegador');

  for (const view of ['today', 'radar', 'teams', 'lab', 'flow', 'approval', 'calendar', 'learning', 'quality']) {
    await page.click(`[data-view="${view}"]`);
    await page.waitForSelector('#view-root > *');
    assert.equal(await page.$eval('#view-title', node => node.textContent.trim()), {
      today: 'Qué hacer hoy', radar: 'Radar de oportunidades', teams: 'Equipos de agentes', lab: 'Agentes en vivo', flow: 'Flujo integral', approval: 'Aprobación semanal', calendar: 'Calendario editorial', learning: 'Aprendizaje', quality: 'Consejo de calidad'
    }[view]);
    const accessibility = await page.evaluate(() => {
      const buttonsWithoutName = Array.from(document.querySelectorAll('button')).filter(button => !String(button.innerText || button.getAttribute('aria-label') || button.title || '').trim()).length;
      const ids = Array.from(document.querySelectorAll('[id]')).map(node => node.id);
      return { buttonsWithoutName, duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index) };
    });
    assert.equal(accessibility.buttonsWithoutName, 0, `${view}: todos los botones deben tener nombre accesible`);
    assert.deepEqual(accessibility.duplicateIds, [], `${view}: no debe haber ids duplicados`);
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
  await page.waitForSelector('.today-hero');

  await page.click('[data-view="calendar"]');
  assert.equal(await page.$eval('[data-action="export-week"]', node => node.disabled), false, 'La entrega manual debe poder exportarse');
  assert.equal(await page.$eval('[aria-describedby="publish-disabled-reason"]', node => node.disabled), true, 'La publicación debe seguir bloqueada sin Metricool verificado');
  assert.match(await page.$eval('.calendar-gate', node => node.innerText), /No configurado|No verificado/);

  if (process.env.GROWTH_SCREENSHOTS_DIR) {
    await page.click('[data-view="today"]');
    await page.screenshot({ path: `${process.env.GROWTH_SCREENSHOTS_DIR}/growth-command-desktop.png`, fullPage: true });
  }

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.click('[data-view="today"]');
  const mobile = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    navVisible: getComputedStyle(document.querySelector('.sidebar')).position === 'fixed',
    visibleNavItems: Array.from(document.querySelectorAll('.nav-item')).filter(node => {
      const rect = node.getBoundingClientRect();
      return rect.right > 0 && rect.left < document.documentElement.clientWidth;
    }).length,
    steps: document.querySelectorAll('.day-step').length,
  }));
  assert.equal(mobile.width, mobile.viewport, 'La vista móvil no debe desbordar horizontalmente');
  assert.equal(mobile.navVisible, true, 'La navegación móvil debe quedar disponible');
  assert.ok(mobile.visibleNavItems >= 4, 'La navegación móvil debe mostrar varias áreas sin interacción previa');
  assert.equal(mobile.steps, 9);

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
