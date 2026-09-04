import assert from 'node:assert/strict';
import { growthAgentCatalog, growthAgentRuntime, growthIntegrationReadiness, normalizeGrowthAgentOutput } from '../api/brain-chat.mjs';

const empty = growthIntegrationReadiness({});
assert.equal(empty.length, 4);
assert.equal(empty.find(item => item.id === 'supabase-auth').status, 'verified');
assert.ok(empty.filter(item => item.id !== 'supabase-auth').every(item => item.status === 'not_configured'));

const configured = growthIntegrationReadiness({
  GROWTH_SUPABASE_ENABLED: 'true',
  GROWTH_SUPABASE_SCHEMA_VERSION: '1',
  GOOGLE_DRIVE_CLIENT_EMAIL: 'service@example.invalid',
  GOOGLE_DRIVE_PRIVATE_KEY: 'PRIVATE-SECRET',
  GOOGLE_DRIVE_ROOT_FOLDER_ID: 'folder-secret',
  METRICOOL_API_TOKEN: 'TOKEN-SECRET',
  METRICOOL_USER_ID: 'user-secret',
  METRICOOL_BLOG_ID: 'blog-secret'
});

assert.ok(configured.filter(item => item.id !== 'supabase-auth').every(item => item.status === 'configured'));
const responseShape = JSON.stringify(configured);
for (const secret of ['PRIVATE-SECRET', 'folder-secret', 'TOKEN-SECRET', 'user-secret', 'blog-secret']) {
  assert.equal(responseShape.includes(secret), false, 'La respuesta nunca debe reflejar secretos');
}
assert.match(responseShape, /GOOGLE_DRIVE_CLIENT_EMAIL/);
assert.match(responseShape, /METRICOOL_API_TOKEN/);

const catalog = growthAgentCatalog();
assert.equal(catalog.length, 9, 'El equipo ejecutable debe contener nueve agentes');
assert.ok(catalog.some(agent => agent.id === 'quality'));
assert.ok(catalog.some(agent => agent.model.includes('haiku')), 'Los roles de volumen deben usar el modelo acotado');
assert.equal(growthAgentRuntime({ ANTHROPIC_API_KEY: 'direct-key' }).provider, 'anthropic-direct');
const gatewayRuntime = growthAgentRuntime({ ANTHROPIC_API_KEY: 'invalid-direct', VERCEL_OIDC_TOKEN: 'oidc-token' });
assert.equal(gatewayRuntime.provider, 'vercel-ai-gateway');
assert.equal(gatewayRuntime.model('management'), 'anthropic/claude-opus-4.8');
assert.equal(gatewayRuntime.model('production'), 'anthropic/claude-haiku-4.5');
const brokerRuntime = growthAgentRuntime({ VERCEL: '1', SUPABASE_URL: 'https://example.supabase.co' });
assert.equal(brokerRuntime.provider, 'supabase-anthropic-broker');
assert.equal(brokerRuntime.endpoint, 'https://example.supabase.co/functions/v1/growth-agent-inference');

const normalized = normalizeGrowthAgentOutput({
  verdict: 'usable', headline: 'Prueba', summary: 'Entrega controlada',
  communication: { tension: 'Tensión', reframe: 'Reencuadre', repeatable_idea: 'Idea', data_to_scene: 'Dato → beneficio → escena', credibility_guardrail: 'Límite' },
  deliverables: [{ label: 'Salida', content: 'Contenido' }],
  evidence: [{ source: 'Brief demo', note: 'No es un resultado real.' }],
  assumptions: ['Datos ficticios'], risks: ['Revisión humana requerida'],
  next_actions: [{ owner: 'Nicolás', action: 'Revisar', due: 'Hoy' }], quality_checks: []
});
assert.equal(normalized.score, 100);
assert.equal(normalized.output.verdict, 'usable');

const safeDisclaimer = normalizeGrowthAgentOutput({
  verdict: 'needs_review', headline: 'Prueba controlada',
  summary: 'El consejo no garantiza que sea viral ni que esté libre de fallos.',
  communication: { tension: 'Tensión', reframe: 'Reencuadre', repeatable_idea: 'Idea', data_to_scene: 'Dato → beneficio → escena', credibility_guardrail: 'Límite' },
  deliverables: [{ label: 'Salida', content: 'Evitar cualquier promesa de viralidad garantizada.' }],
  evidence: [{ source: 'Brief demo', note: 'No es un resultado real.' }],
  assumptions: ['Datos ficticios'], risks: ['Revisión humana requerida'],
  next_actions: [{ owner: 'Nicolás', action: 'Revisar', due: 'Hoy' }],
  quality_checks: [{ criterion: 'Garantías', status: 'pass', note: 'No promete resultados.' }]
});
assert.equal(safeDisclaimer.checks.find(check => check.id === 'no_false_guarantee').passed, true, 'Las advertencias contra garantías no deben producir falsos positivos');
assert.equal(safeDisclaimer.score, 100);

const unsafe = normalizeGrowthAgentOutput({
  verdict: 'usable', headline: 'Viralidad garantizada', summary: 'Será viral',
  communication: { tension: 'Tensión', reframe: 'Reencuadre', repeatable_idea: 'Idea', data_to_scene: 'Dato → beneficio → escena', credibility_guardrail: 'Límite' },
  deliverables: [{ label: 'Salida', content: 'Resultado' }], evidence: [{ source: 'Ninguna', note: 'Sin evidencia' }],
  assumptions: ['Ninguno'], risks: ['Ninguno'], next_actions: [{ owner: 'IA', action: 'Publicar', due: 'Ya' }]
});
assert.equal(unsafe.checks.find(check => check.id === 'no_false_guarantee').passed, false, 'Las garantías falsas deben fallar el control');

console.log('Growth runtime: preparación, catálogo, contrato y no exposición de secretos verificados.');
