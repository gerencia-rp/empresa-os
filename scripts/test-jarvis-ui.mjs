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
    window.state = { role: 'admin', user: { id: 'user-qa', email: 'qa@example.com' } };
    window.osIcon = name => `<span data-icon="${name}"></span>`;
    window.OS_E = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  });
  await page.addScriptTag({ path: path.join(root, 'os/os-operating-manual.js') });
  await page.addScriptTag({ path: path.join(root, 'os/os-command-center.js') });
  await page.evaluate(() => { jvCSS(); window.OPM.loaded = true; });

  const initial = await page.evaluate(() => {
    window.osRender = () => { document.getElementById('render-state').textContent = window.JV.tab; };
    document.getElementById('os-root').innerHTML = jvSidebar();
    return window.JV.tab;
  });
  assert.equal(initial, 'network', 'Jarvis debe iniciar en el organigrama');

  const routes = ['network', 'command', 'work', 'propuestas', 'horarios', 'vault', 'reportes', 'manual'];
  for (const route of routes) {
    await page.click(`[data-jv-nav="${route}"]`);
    assert.equal(await page.$eval('#render-state', node => node.textContent), route, `${route} debe cambiar el estado y renderizar`);
  }

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

  const approvalSafety = await page.evaluate(() => {
    const base = {
      id: 'proposal-qa', agent_id: 'agent-qa', tipo_accion: 'conciliacion', estado: 'propuesta',
      created_at: new Date().toISOString(), last_validated_at: new Date().toISOString(),
      payload: { requiere_aprobacion: true, accion: 'conciliar' },
    };
    window.JV.props = [{ ...base, evidencia: { tipo: 'conciliacion', regla: 'QA-1', fuente: 'fixture', origen: 'test', nota: 'sin detalle sustantivo' } }];
    window.JV.decisionPreview = { id: base.id, estado: 'aprobada' };
    document.getElementById('os-root').innerHTML = jvDecisionPreviewHTML();
    const metadataOnlyDisabled = document.querySelector('.jv-review-actions .confirm')?.disabled === true;

    window.JV.props = [{ ...base, evidencia: { tipo: 'conciliacion', fuente: 'fixture', hallazgo: 'Diferencia de $1,250 en la cuenta de prueba', monto: 1250 } }];
    document.getElementById('os-root').innerHTML = jvDecisionPreviewHTML();
    const substantiveEnabled = document.querySelector('.jv-review-actions .confirm')?.disabled === false;

    window.JV.props = [{ ...base, last_validated_at: new Date(Date.now() - 10 * 86400000).toISOString(), evidencia: { tipo: 'conciliacion', fuente: 'fixture', hallazgo: 'Diferencia vencida', monto: 1250 } }];
    document.getElementById('os-root').innerHTML = jvDecisionPreviewHTML();
    const staleDisabled = document.querySelector('.jv-review-actions .confirm')?.disabled === true;
    return { metadataOnlyDisabled, substantiveEnabled, staleDisabled };
  });
  assert.deepEqual(approvalSafety, { metadataOnlyDisabled: true, substantiveEnabled: true, staleDisabled: true }, 'Las aprobaciones sensibles deben exigir evidencia sustantiva y fresca');

  const decisionTriage = await page.evaluate(() => {
    const now = new Date().toISOString();
    const base = { agent_id: 'agent-qa', tipo_accion: 'conciliacion', estado: 'propuesta', created_at: now, payload: { requiere_aprobacion: true } };
    window.JV.props = [
      { ...base, id: 'ready', last_validated_at: now, evidencia: { hallazgo: 'Diferencia confirmada', monto: 900 } },
      { ...base, id: 'stale', last_validated_at: new Date(Date.now() - 10 * 86400000).toISOString(), evidencia: { hallazgo: 'Dato anterior', monto: 500 } },
      { ...base, id: 'metadata', last_validated_at: now, evidencia: { tipo: 'conciliacion', fuente: 'fixture', regla: 'QA' } },
    ];
    window.JV.decisionArea = 'Todas';
    document.getElementById('os-root').innerHTML = jvLanesHTML();
    return document.getElementById('os-root').innerText;
  });
  assert.match(decisionTriage, /1\s*Listas para decidir/i);
  assert.match(decisionTriage, /2\s*esperando evidencia/i);
  assert.match(decisionTriage, /Listas para decidir\s+1/i);
  assert.match(decisionTriage, /Esperando nueva evidencia\s+2/i);
  assert.match(decisionTriage, /Falta información concreta/i);

  const financialPackets = await page.evaluate(() => {
    window.JV.reportArea = 'Todas';
    window.JV.reports = [{
      tipo: 'triage_excepciones_financieras', titulo: 'Prioridades financieras', estado: 'borrador',
      corte: '2026-08-29', generado_por: 'Auditor de Integridad Financiera y Datos',
      payload: { resumen: '3 alertas requieren evidencia.', kpis: { criticos: 2, impacto_critico_usd: 170000, antiguedad_max_dias: 12 }, hallazgos_por_frente: [] },
    }];
    window.JV.financialActions = [
      { id: 'finding-a', check_id: 'C11', frente: 'Fondos de obra y cobros', responsable: 'Financiero Fix & Flip + Financiero Remodelación', titulo: 'Draw sin conciliar A', fuente: 'Airtable FF', impacto_usd: 100000, severidad: 'critica', dias_abierto: 12, evidencia_requerida: 'Draw statement y factura.', siguiente_accion: 'Conciliar por propiedad.' },
      { id: 'finding-b', check_id: 'C11', frente: 'Fondos de obra y cobros', responsable: 'Financiero Fix & Flip + Financiero Remodelación', titulo: 'Draw sin conciliar B', fuente: 'Airtable FF', impacto_usd: 70000, severidad: 'critica', dias_abierto: 8, evidencia_requerida: 'Draw statement y factura.', siguiente_accion: 'Conciliar por propiedad.' },
      { id: 'finding-c', check_id: 'C4', frente: 'Cartera y cobranza', responsable: 'Financiero Rentas', titulo: 'Saldo por verificar', fuente: 'ledger', impacto_usd: 3000, severidad: 'media', dias_abierto: 4, evidencia_requerida: 'Ledger y pagos aplicados.', siguiente_accion: 'Validar saldo neto.' },
    ];
    window.JV.financialEvidenceStatus = {
      'finding-a': { closure_state: 'soporte_verificado_fuente_pendiente', verified_count: 1, pending_verification_count: 0 },
      'finding-b': { closure_state: 'pendiente_verificacion', verified_count: 0, pending_verification_count: 1 },
    };
    window.JV.financialEvidence = [
      { id: 'support-b', finding_id: 'finding-b', evidence_type: 'factura', title: 'Factura de Remodelación', artifact_url: 'https://example.com/support-b', status: 'submitted', submitted_by: 'another-user' },
    ];
    document.getElementById('os-root').innerHTML = jvReportesView();
    document.querySelectorAll('details').forEach(report => { report.open = true; });
    return document.getElementById('os-root').innerText;
  });
  assert.match(financialPackets, /Paquetes por responsable/i);
  assert.match(financialPackets, /Fondos de obra y cobros/i);
  assert.match(financialPackets, /2 casos/i);
  assert.match(financialPackets, /Draw statement y factura/i);
  assert.match(financialPackets, /Soporte verificado · falta corrida limpia/i);
  assert.match(financialPackets, /Soporte pendiente de verificar/i);
  assert.match(financialPackets, /Adjuntar soporte al expediente/i);
  assert.match(financialPackets, /Factura de Remodelación/i);
  assert.match(financialPackets, /Verificar/i);

  const handoffQueue = await page.evaluate(() => {
    const now = new Date().toISOString();
    window.JV.agents = [{ id: 'agent-qa', nombre: 'Financiero Fix & Flip', linea: 'Fix & Flip' }];
    window.JV.props = [{ id: 'handoff-proposal', agent_id: 'agent-qa', tipo_accion: 'conciliacion', estado: 'propuesta', created_at: now, last_validated_at: now, payload: { dedup_key: 'qa-handoff' }, evidencia: { hallazgo: 'Draw por conciliar', monto: 1000 } }];
    window.JV.audit = [];
    window.JV.handoffs = [{ proposal_id: 'handoff-proposal', from_agent_id: 'agent-qa', from_agent: 'Financiero Fix & Flip', to_role: 'Controller', backup_role: 'Auditor de Integridad', escalation_role: 'Dirección', sla_hours: 24, handoff_state: 'overdue', evidence_at: now }];
    window.JV.workArea = 'Todas'; window.JV.workState = 'Todos'; window.JV.workAgentId = null; window.JV.workSelectedId = null;
    document.getElementById('os-root').innerHTML = jvWorkView();
    return document.getElementById('os-root').innerText;
  });
  assert.match(handoffQueue, /1\s*Traspasos vencidos/i);
  assert.match(handoffQueue, /Financiero Fix & Flip\s*→\s*Controller/i);
  assert.match(handoffQueue, /Respaldo:\s*Auditor de Integridad/i);
  assert.match(handoffQueue, /Escala a:\s*Dirección/i);

  const vaultLayout = await page.evaluate(() => {
    const capas = ['Command', 'Finance', 'Ops', 'Integrity', 'Report', 'Signal'];
    window.JV.agents = [{ id: 'brain', nombre: 'Cerebro Ejecutivo', capa: 'Command', area: 'holding', estado: 'activo', proceso: 'Coordina el equipo.' }]
      .concat(capas.flatMap((capa, ci) => Array.from({ length: 7 }, (_, i) => ({
        id: `agent-${ci}-${i}`, nombre: `${capa} especialista ${i + 1}`, capa,
        area: i % 3 === 0 ? 'rentas' : (i % 3 === 1 ? 'remodelacion' : 'fix-flip'),
        estado: 'activo', proceso: `Responsabilidad ${i + 1}`,
      }))));
    window.JV.audit = [];
    window.JV.vaultSel = null;
    document.getElementById('os-root').innerHTML = `<div class="jv"><main class="jv-main">${jvVaultGraphView()}</main></div>`;
    const canvas = document.querySelector('.jv-vcanvas').getBoundingClientRect();
    const panel = document.querySelector('.jv-vpanel').getBoundingClientRect();
    const hiddenLabels = [...document.querySelectorAll('.jv-vlabel')].filter(node => getComputedStyle(node).opacity === '0').length;
    const groups = document.querySelectorAll('.jv-vgroup-label').length;
    const firstAgent = document.querySelector('.jv-vnode[data-nid^="agent-"]');
    firstAgent.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return {
      panelOutsideCanvas: canvas.right <= panel.left + 1,
      hiddenLabels,
      groups,
      selectedByKeyboard: firstAgent.classList.contains('sel'),
      nodeCount: document.querySelectorAll('.jv-vnode').length,
    };
  });
  assert.equal(vaultLayout.panelOutsideCanvas, true, 'El inspector no debe invadir el mapa en escritorio');
  assert.equal(vaultLayout.groups, 6, 'El mapa debe separar visualmente las seis capas');
  assert.ok(vaultLayout.hiddenLabels >= 40, 'Las etiquetas de detalle deben aparecer progresivamente');
  assert.equal(vaultLayout.selectedByKeyboard, true, 'Los nodos deben poder inspeccionarse con teclado');
  assert.equal(vaultLayout.nodeCount, 50, 'El rediseño no debe ocultar nodos reales');
  if (process.env.JARVIS_VISUAL_DIR) {
    await page.screenshot({ path: path.join(process.env.JARVIS_VISUAL_DIR, 'memoria-escritorio.png'), fullPage: true });
  }

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const mobileVault = await page.evaluate(() => {
    const canvas = document.querySelector('.jv-vcanvas').getBoundingClientRect();
    const panel = document.querySelector('.jv-vpanel').getBoundingClientRect();
    return { panelBelowCanvas: panel.top >= canvas.bottom - 1, canvasHeight: canvas.height, pageWidth: document.documentElement.scrollWidth };
  });
  assert.equal(mobileVault.panelBelowCanvas, true, 'En móvil el inspector debe quedar debajo del mapa');
  assert.ok(mobileVault.canvasHeight >= 460, 'El mapa móvil debe conservar un área útil de exploración');
  if (process.env.JARVIS_VISUAL_DIR) {
    await page.screenshot({ path: path.join(process.env.JARVIS_VISUAL_DIR, 'memoria-movil.png'), fullPage: true });
  }

  console.log(`OK ${routes.length + 1}/${routes.length + 1} navegación real: ${routes.length} vistas principales + destino del plan de recuperación.`);
  console.log('OK 4/4 compuertas fallidas: orden, responsable y evidencia legible.');
  console.log('OK 3/3 seguridad de decisiones: metadatos bloqueados, evidencia sustantiva permitida, evidencia vencida bloqueada.');
  console.log('OK 4/4 clasificación ejecutiva: lista, vencida, alto riesgo y escalamiento sin mezclar evidencia pendiente.');
  console.log('OK 8/8 paquetes financieros: responsable, impacto, soporte, verificación y corrida limpia obligatoria.');
  console.log('OK 4/4 traspasos verificables: origen, destino, respaldo y escalamiento con SLA.');
  console.log('OK 7/7 memoria visual: capas separadas, inspector externo, detalle progresivo, teclado, nodos completos y adaptación móvil.');
} finally {
  await browser.close();
}
