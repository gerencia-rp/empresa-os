(function () {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));

  class GrowthIntegrationClient {
    constructor(options) {
      this.authClient = options && options.authClient;
      this.localPreview = Boolean(options && options.localPreview);
    }

    async getReadiness(fallback) {
      if (this.localPreview || !this.authClient) {
        return {
          checkedAt: null,
          source: 'local-preview',
          agentRuntime: { configured: false, fixture: true, catalog: window.GrowthAgents ? window.GrowthAgents.CATALOG : [] },
          integrations: clone(fallback).map(item => ({ ...item, status: item.id === 'supabase-auth' ? 'unverified' : item.status }))
        };
      }

      const { data } = await this.authClient.auth.getSession();
      const token = data && data.session && data.session.access_token;
      if (!token) throw new Error('No hay una sesión disponible para revisar conexiones.');
      const response = await fetch('/api/brain-chat?resource=growth-readiness', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No pudimos revisar las conexiones.');
      return { checkedAt: payload.checkedAt, source: 'server', integrations: payload.integrations || clone(fallback), agentRuntime: payload.agentRuntime || { configured: false, catalog: [] } };
    }
  }

  function calendarExport(snapshot) {
    const byId = new Map(snapshot.pieces.map(piece => [piece.id, piece]));
    const rows = snapshot.calendar.map(slot => {
      const piece = byId.get(slot.pieceId) || {};
      return {
        day: slot.day,
        time: slot.time,
        platform: slot.platform,
        title: piece.title || 'Pieza sin detalle',
        status: slot.status,
        contentStatus: piece.status || 'unknown',
        assetStatus: piece.asset && piece.asset.status || 'missing',
        note: 'Paquete demo. Sustituir datos y adjuntar activos reales antes de publicar.'
      };
    });
    return {
      kind: 'empresa-os-growth-manual-handoff',
      demo: true,
      generatedAt: new Date().toISOString(),
      period: snapshot.meta.period,
      publicationAuthorized: false,
      rows
    };
  }

  function downloadCalendarExport(snapshot) {
    const payload = calendarExport(snapshot);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `growth-handoff-${String(snapshot.meta.period || 'semana').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return payload;
  }

  window.GrowthIntegrations = { GrowthIntegrationClient, calendarExport, downloadCalendarExport };
})();
