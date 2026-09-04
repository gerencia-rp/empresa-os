const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey || !(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)) {
  throw new Error('La prueba requiere SUPABASE_SERVICE_ROLE_KEY y un acceso al motor de IA en el entorno.');
}

const agentId = process.argv[2] || 'management';
const { default: handler } = await import('../api/brain-chat.mjs');

const response = {
  statusCode: 200,
  body: null,
  headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(value) { this.body = value; return this; },
  end() { return this; }
};

await handler({
  method: 'POST',
  query: { resource: 'growth-agent-run' },
  headers: { authorization: `Bearer ${serviceKey}` },
  body: {
    agentId,
    inputMode: 'demo',
    brief: 'Prueba técnica controlada sobre datos de demostración: evaluar una semana multiplataforma para personas que analizan su primer Fix & Flip. No publicar ni afirmar acceso a fuentes en vivo.',
    snapshot: { meta: { mode: 'demo' }, directive: { focus: 'Conversaciones calificadas', constraint: 'Datos demo' } },
    priorOutputs: []
  }
}, response);

if (response.statusCode !== 200 || !response.body?.ok) {
  throw new Error(`La prueba falló con HTTP ${response.statusCode}: ${response.body?.error || 'sin detalle seguro'}`);
}

const run = response.body.run;
console.log(JSON.stringify({
  ok: true,
  agentId: run.agentId,
  model: run.model,
  provider: run.provider,
  score: run.score,
  verdict: run.output?.verdict,
  headline: run.output?.headline,
  durationMs: run.durationMs
}, null, 2));
