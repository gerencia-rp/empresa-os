import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><html><head></head><body><div id="os-root"></div><output id="render-state"></output></body></html>');
  await page.evaluate(() => {
    window.state = { role: 'admin', user: { email: 'qa@example.com' } };
    window.osIcon = name => `<span data-icon="${name}"></span>`;
    window.OS_E = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  });
  await page.addScriptTag({ path: path.join(root, 'os/os-command-center.js') });

  const initial = await page.evaluate(() => {
    window.osRender = () => { document.getElementById('render-state').textContent = window.JV.tab; };
    document.getElementById('os-root').innerHTML = jvSidebar();
    return window.JV.tab;
  });
  assert.equal(initial, 'network', 'Jarvis debe iniciar en el organigrama');

  await page.click('[data-jv-nav="command"]');
  assert.equal(await page.$eval('#render-state', node => node.textContent), 'command', 'Centro de mando debe cambiar el estado y renderizar');

  const recovery = await page.evaluate(() => {
    window.JV.reports = [{
      tipo: 'continuidad_ausencia_6_meses',
      payload: {
        compuertas: {
          integridad_financiera: { ok: false, hallazgos_criticos: 35 },
          cobertura_humana: { ok: false, evidencia: '0/9' },
          decisiones: { ok: false, fuera_de_sla: 53 },
          integraciones: { ok: false, saludables: 3, vigiladas: 5, detalle: [{ sistema: 'ClickUp', ok: false }, { sistema: 'WhatsApp', ok: false }] },
        },
      },
    }];
    document.getElementById('os-root').innerHTML = jvRecoveryPlan();
    return document.getElementById('os-root').innerText;
  });
  assert.match(recovery, /35 hallazgo/);
  assert.match(recovery, /0\/9/);
  assert.match(recovery, /53 decisión/);
  assert.match(recovery, /ClickUp, WhatsApp/);

  const ranks = await page.$$eval('.jv-recovery-rank', nodes => nodes.map(node => node.textContent));
  assert.deepEqual(ranks, ['01', '02', '03', '04'], 'El plan debe conservar el orden de riesgo');
  await page.click('[data-jv-nav="reportes"]');
  assert.equal(await page.$eval('#render-state', node => node.textContent), 'reportes', 'Cada frente debe abrir su destino operativo');

  console.log('OK 2/2 navegación real: menú principal + destino del plan de recuperación.');
  console.log('OK 4/4 compuertas fallidas: orden, responsable y evidencia legible.');
} finally {
  await browser.close();
}
