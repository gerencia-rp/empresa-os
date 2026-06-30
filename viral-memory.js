/* viral-memory.js — cliente de memoria (Fase 1). Persiste en Supabase vía edge functions.
   Requiere window.SUPABASE_URL + window.SUPABASE_ANON_KEY (config.public.js).
   Expone window.Memory. Falla suave: si no hay config o el endpoint falla, no rompe la app. */
(function () {
  'use strict';
  const URL = () => (window.SUPABASE_URL || '').replace(/\/$/, '');
  const KEY = () => window.SUPABASE_ANON_KEY || '';
  const enabled = () => !!(URL() && KEY());

  async function call(fn, payload) {
    if (!enabled()) throw new Error('Supabase no configurado (config.public.js)');
    const res = await fetch(`${URL()}/functions/v1/${fn}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + KEY(), 'apikey': KEY() },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  // UUID v4 (crypto si está disponible)
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
    });
  }

  window.Memory = {
    enabled,
    getCurrentSessionId() {
      let s = localStorage.getItem('viralChatSession');
      if (!s) { s = uuid(); localStorage.setItem('viralChatSession', s); }
      return s;
    },
    newSession() { const s = uuid(); localStorage.setItem('viralChatSession', s); return s; },
    saveGeneration(data) { return call('save-generation', data); },
    saveChatMessage(sessionId, role, content, metadata) {
      return call('save-chat-message', { session_id: sessionId, role, content, metadata: metadata || null });
    },
    getChatHistory(sessionId, limit) {
      return call('get-chat-history', { session_id: sessionId, limit: limit || 50 }).then(r => r.messages || []);
    },
    listGenerations(filters) {
      return call('list-generations', filters || {}).then(r => r.generations || []);
    },
    markAsPublished(data) { return call('mark-as-published', data); },
    saveMetrics(data) { return call('save-metrics', data); },
    getDashboard() { return call('get-dashboard', {}); },
    extractMetricsFromImage(data) { return call('extract-metrics-from-image', data); },
    searchSimilar(query_text, top_k) { return call('search-similar-generations', { query_text, top_k: top_k || 5 }).then(r => r.results || []).catch(() => []); },
    computeInsights() { return call('compute-insights', {}); },
    getInsights() { return call('get-insights', {}); },
    markInsightRead(id) { return call('mark-insight-read', { id }); },
  };
})();
