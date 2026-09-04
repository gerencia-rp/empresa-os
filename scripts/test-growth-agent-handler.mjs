import assert from 'node:assert/strict';

process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
const { default: handler } = await import('../api/brain-chat.mjs');

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

const originalFetch = globalThis.fetch;
let expectedProvider = 'anthropic-direct';
globalThis.fetch = async (url, options) => {
  const request = JSON.parse(options.body);
  assert.equal(request.output_config.format.type, 'json_schema');
  assert.deepEqual(request.output_config.format.schema.required, ['verdict', 'headline', 'summary', 'deliverables', 'evidence', 'assumptions', 'risks', 'next_actions', 'quality_checks']);
  if (expectedProvider === 'vercel-ai-gateway') {
    assert.match(String(url), /ai-gateway\.vercel\.sh\/v1\/messages/);
    assert.equal(options.headers.authorization, 'Bearer test-oidc-token');
    assert.equal(request.model, 'anthropic/claude-haiku-4.5');
  } else if (expectedProvider === 'supabase-anthropic-broker') {
    assert.match(String(url), /nezbaljfhhyznhltpjnk\.supabase\.co\/functions\/v1\/growth-agent-inference/);
    assert.equal(options.headers.authorization, 'Bearer test-service-key');
    assert.equal(request.model, 'claude-opus-4-8');
  } else {
    assert.match(String(url), /api\.anthropic\.com\/v1\/messages/);
    assert.equal(options.headers['x-api-key'], 'test-anthropic-key');
  }
  return new Response(JSON.stringify({
    content: [{ type: 'text', text: JSON.stringify({
      verdict: 'needs_review', headline: 'Directiva de prueba', summary: 'Resultado limitado a datos demo.',
      deliverables: [{ label: 'Directiva', content: 'Priorizar conversaciones calificadas.' }],
      evidence: [{ source: 'Brief demo', note: 'No contiene resultados reales.' }],
      assumptions: ['Escenario ficticio'], risks: ['Requiere revisión humana'],
      next_actions: [{ owner: 'Nicolás', action: 'Revisar la propuesta', due: 'Antes de publicar' }],
      quality_checks: [{ criterion: 'Honestidad', status: 'pass', note: 'Rotulado demo.' }]
    }) }],
    usage: { input_tokens: 120, output_tokens: 90 }
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  const res = responseRecorder();
  await handler({
    method: 'POST', query: { resource: 'growth-agent-run' }, headers: { authorization: 'Bearer test-service-key' },
    body: { agentId: 'management', brief: 'Prueba operativa suficientemente concreta sobre datos demo.', inputMode: 'demo', snapshot: { meta: { mode: 'demo' } }, priorOutputs: [] }
  }, res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(res.body.ok, true);
  assert.equal(res.body.run.agentId, 'management');
  assert.equal(res.body.run.provider, 'anthropic-direct');
  assert.equal(res.body.run.score, 100);
  assert.equal(res.body.run.output.verdict, 'needs_review');
  assert.equal(JSON.stringify(res.body).includes('test-anthropic-key'), false);

  process.env.VERCEL_OIDC_TOKEN = 'test-oidc-token';
  expectedProvider = 'vercel-ai-gateway';
  const gateway = responseRecorder();
  await handler({
    method: 'POST', query: { resource: 'growth-agent-run' }, headers: { authorization: 'Bearer test-service-key' },
    body: { agentId: 'production', brief: 'Prueba operativa suficientemente concreta sobre datos demo.', inputMode: 'demo', snapshot: {}, priorOutputs: [] }
  }, gateway);
  assert.equal(gateway.statusCode, 200, JSON.stringify(gateway.body));
  assert.equal(gateway.body.run.provider, 'vercel-ai-gateway');
  delete process.env.VERCEL_OIDC_TOKEN;
  expectedProvider = 'anthropic-direct';

  process.env.VERCEL = '1';
  expectedProvider = 'supabase-anthropic-broker';
  const broker = responseRecorder();
  await handler({
    method: 'POST', query: { resource: 'growth-agent-run' }, headers: { authorization: 'Bearer test-service-key' },
    body: { agentId: 'quality', brief: 'Prueba operativa suficientemente concreta sobre datos demo.', inputMode: 'demo', snapshot: {}, priorOutputs: [] }
  }, broker);
  assert.equal(broker.statusCode, 200, JSON.stringify(broker.body));
  assert.equal(broker.body.run.provider, 'supabase-anthropic-broker');
  delete process.env.VERCEL;
  expectedProvider = 'anthropic-direct';

  const bad = responseRecorder();
  await handler({ method: 'POST', query: { resource: 'growth-agent-run' }, headers: { authorization: 'Bearer test-service-key' }, body: { agentId: 'unknown', brief: 'Contexto suficiente para la prueba.' } }, bad);
  assert.equal(bad.statusCode, 400);

  const unauth = responseRecorder();
  await handler({ method: 'POST', query: { resource: 'growth-agent-run' }, headers: {}, body: {} }, unauth);
  assert.equal(unauth.statusCode, 401);
  console.log('Growth agent handler: auth, modelo, contrato y errores verificados.');
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.VERCEL;
}
