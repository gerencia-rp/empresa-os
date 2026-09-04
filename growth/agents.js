(function () {
  'use strict';

  const STORAGE_KEY = 'empresa-os-growth-agent-runs-v1';
  const clone = value => JSON.parse(JSON.stringify(value));

  const CATALOG = [
    { id: 'management', name: 'Gerencia de crecimiento' },
    { id: 'virality', name: 'Radar de viralidad' },
    { id: 'avatars', name: 'Avatares y ángulos' },
    { id: 'production', name: 'Fábrica de contenido' },
    { id: 'magnets', name: 'Lead magnets' },
    { id: 'conversations', name: 'Conversaciones y CTA' },
    { id: 'nurture', name: 'Nutrición' },
    { id: 'analytics', name: 'Analítica y aprendizaje' },
    { id: 'quality', name: 'Consejo de calidad' }
  ];

  function safeSnapshot(snapshot) {
    if (snapshot.research?.status === 'verified_public') {
      return clone({
        meta: { ...snapshot.meta, mode: 'mixed', label: 'Investigación pública verificada; sin analítica privada' },
        communicationPlaybook: snapshot.communicationPlaybook,
        platforms: snapshot.platforms.map(platform => ({ id: platform.id, name: platform.name, minimumWeeklyPieces: platform.goal })),
        research: snapshot.research,
        operatingConstraints: {
          publicationAuthorized: false,
          humanApprovalRequired: true,
          metricoolConnected: false,
          driveConnected: false,
          privateAnalyticsAvailable: false,
          instruction: 'Crear entregables nuevos desde research. No usar ni inferir el funnel, piezas, calendario, señales o métricas del escenario demo.'
        }
      });
    }
    return clone({
      meta: snapshot.meta,
      directive: snapshot.directive,
      communicationPlaybook: snapshot.communicationPlaybook,
      funnel: snapshot.funnel,
      platforms: snapshot.platforms,
      signals: snapshot.signals,
      alerts: snapshot.alerts,
      pieces: snapshot.pieces,
      calendar: snapshot.calendar,
      metrics: snapshot.metrics,
      research: snapshot.research || null,
      qualityCouncil: { status: snapshot.qualityCouncil.status, summary: snapshot.qualityCouncil.summary }
    });
  }

  function priorSummary(runs) {
    return runs.filter(run => run && run.status === 'completed').map(run => ({
      agentId: run.agentId,
      headline: run.output && run.output.headline,
      summary: run.output && run.output.summary,
      communication: run.output && run.output.communication,
      deliverables: (run.output && run.output.deliverables || []).slice(0, 4)
    }));
  }

  function fixtureRun(agent, started) {
    return {
      id: `fixture-${agent.id}-${Date.now()}`,
      agentId: agent.id,
      agentName: agent.name,
      model: 'fixture-local',
      inputMode: 'demo',
      startedAt: new Date(started).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      score: 100,
      checks: [{ id: 'fixture', label: 'Fixture de interfaz, no ejecución IA', passed: true }],
      output: {
        verdict: 'needs_review',
        headline: `${agent.name}: interfaz de resultado comprobada`,
        summary: 'Fixture exclusiva de localhost. En producción esta tarjeta se sustituye por una respuesta real del modelo configurado.',
        communication: {
          tension: 'Una interfaz sin ejecución puede parecer más operativa de lo que es.',
          reframe: 'El fixture valida presentación, no calidad del modelo ni resultados.',
          repeatable_idea: 'Una prueba visual no equivale a una ejecución real.',
          data_to_scene: 'Sin datos reales → sin evidencia de negocio → revisar la salida como maqueta local.',
          credibility_guardrail: 'Rotular siempre el fixture y sustituirlo por una ejecución autenticada antes de decidir.'
        },
        deliverables: [{ label: 'Entrega de prueba', content: 'La interfaz puede mostrar, expandir y conservar una salida estructurada.' }],
        evidence: [{ source: 'Fixture local', note: 'No representa ejecución de negocio ni llamada al modelo.' }],
        assumptions: ['La prueba se ejecuta en localhost.'],
        risks: ['No usar este contenido como entrega real.'],
        next_actions: [{ owner: 'QA', action: 'Ejecutar la batería en producción con sesión administradora.', due: 'Antes de declarar operativo' }],
        quality_checks: [{ criterion: 'Rotulado honesto', status: 'pass', note: 'El resultado declara que es fixture.' }]
      },
      usage: null,
      fixture: true
    };
  }

  class GrowthAgentClient {
    constructor(options) {
      this.authClient = options && options.authClient;
      this.localPreview = Boolean(options && options.localPreview);
    }

    async run(agentId, brief, snapshot, completedRuns) {
      const agent = CATALOG.find(item => item.id === agentId);
      if (!agent) throw new Error('Agente no reconocido.');
      const started = Date.now();
      if (this.localPreview) {
        await new Promise(resolve => setTimeout(resolve, 90));
        return fixtureRun(agent, started);
      }
      if (!this.authClient) throw new Error('No hay una sesión para ejecutar el agente.');
      const { data } = await this.authClient.auth.getSession();
      const token = data && data.session && data.session.access_token;
      if (!token) throw new Error('La sesión venció. Volvé a ingresar.');
      const response = await fetch('/api/brain-chat?resource=growth-agent-run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          agentId, brief, snapshot: safeSnapshot(snapshot), priorOutputs: priorSummary(completedRuns || []),
          inputMode: snapshot.meta.mode === 'demo' && snapshot.research?.status === 'verified_public' ? 'mixed' : snapshot.meta.mode === 'demo' ? 'demo' : 'real'
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || !payload.run) throw new Error(payload.error || 'El agente no devolvió una entrega.');
      return payload.run;
    }
  }

  function loadRuns() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.slice(0, 30) : [];
    } catch { return []; }
  }

  function saveRuns(runs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify((runs || []).slice(0, 30)));
  }

  function clearRuns() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function downloadRuns(runs, brief) {
    const payload = { kind: 'empresa-os-growth-agent-test', exportedAt: new Date().toISOString(), brief, publicationAuthorized: false, runs };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `growth-agent-test-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  window.GrowthAgents = { CATALOG, GrowthAgentClient, loadRuns, saveRuns, clearRuns, downloadRuns };
})();
