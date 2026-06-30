/* viral-metrics.js — Fase 2. Tab 📊 Métricas: carga manual + dashboard.
   Reusa window.Memory (markAsPublished/saveMetrics/getDashboard/listGenerations).
   Resuelve ids→nombres con OPERA (global de viral-opera.js). Registra OPERA_RENDERERS.metricas. */
(function () {
  'use strict';
  const Eh = (s) => (s == null ? '' : String(s)).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const N = (n) => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('es'));
  const D = () => (typeof OPERA !== 'undefined' && OPERA) ? OPERA : null;

  function enemigoName(id) {
    const d = D(); if (!d || !id) return id || '—';
    const en = d.arquetipo.enemigos;
    if (id === 'principal') return en.principal.nombre;
    if (id === 'invisible') return en.invisible.nombre;
    const t = en.tacticos.find(e => e.id === id); return t ? t.nombre : id;
  }
  function avatarName(id) { const d = D(); return (d && d.avatares[id]) ? d.avatares[id].nombre : (id || '—'); }
  function tacticaName(id) { const d = D(); if (!d) return id; const t = d.psicologia.tacticasAplicadas.find(x => String(x.id) === String(id)); return t ? (t.maestro + ' — ' + t.tecnica) : id; }

  // ---------- Tab shell ----------
  function render() {
    const out = document.getElementById('tab-metricas'); if (!out) return;
    out.dataset.rendered = '1';
    if (!window.Memory || !window.Memory.enabled()) {
      out.innerHTML = `<h2 class="font-display text-2xl font-extrabold text-accent mb-2">📊 Métricas</h2><p class="text-sm text-zinc-400">Memoria no configurada (config.public.js).</p>`;
      return;
    }
    out.innerHTML = `
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div><h2 class="font-display text-2xl font-extrabold text-accent">📊 Métricas</h2><p class="text-xs text-zinc-500">Carga manual de números → análisis de qué funciona</p></div>
        <div class="flex gap-2">
          <button onclick="metricsOpenCargar()" class="text-sm px-3 py-2 rounded-lg bg-accent text-primary font-semibold">📥 Cargar métricas</button>
          <button onclick="metricsLoadDashboard()" class="text-sm px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">📈 Refrescar</button>
        </div>
      </div>
      <div id="metrics-modal"></div>
      <div id="metrics-dash"><div class="text-sm text-zinc-500">Cargando dashboard…</div></div>`;
    loadDashboard();
  }

  // ---------- Dashboard ----------
  function kpiCard(label, value, sub) {
    return `<div class="bg-primary/40 border border-accent/15 rounded-xl p-4 text-center">
      <div class="font-display text-2xl font-black text-accent">${value}</div>
      <div class="text-[11px] uppercase text-zinc-400 mt-1">${Eh(label)}</div>
      ${sub ? `<div class="text-[10px] text-zinc-500 mt-0.5">${Eh(sub)}</div>` : ''}</div>`;
  }
  function topTable(title, rows, valKey, valLabel) {
    if (!rows || !rows.length) return '';
    const trs = rows.map((r, i) => `<tr class="border-t border-zinc-800">
      <td class="py-1.5 pr-2 text-zinc-600 text-xs">${i + 1}</td>
      <td class="py-1.5 pr-3 text-sm truncate max-w-[260px]">${Eh(r.hook)}</td>
      <td class="py-1.5 pr-3 text-sm text-accent text-right">${N(r[valKey])}${valKey !== 'views' ? '%' : ''}</td>
      <td class="py-1.5 pr-2 text-[10px] text-zinc-500">${Eh(r.plataforma || '')}</td>
      <td class="py-1.5 text-[10px] text-zinc-500">${r.fecha ? new Date(r.fecha).toLocaleDateString('es') : ''}</td>
    </tr>`).join('');
    return `<div class="bg-primary/40 border border-accent/15 rounded-xl p-4 mb-4">
      <h3 class="font-display font-bold text-accent mb-2">${Eh(title)}</h3>
      <div class="overflow-x-auto"><table class="w-full"><thead><tr class="text-[10px] uppercase text-zinc-600 text-left"><th></th><th>Hook</th><th class="text-right">${Eh(valLabel)}</th><th>Plat</th><th>Fecha</th></tr></thead><tbody>${trs}</tbody></table></div></div>`;
  }
  function crossTable(title, rows, nameFn) {
    if (!rows || !rows.length) return '';
    const trs = rows.map(r => `<tr class="border-t border-zinc-800">
      <td class="py-1.5 pr-3 text-sm">${Eh(nameFn(r.key))}</td>
      <td class="py-1.5 pr-3 text-sm text-accent text-right">${N(r.avg_views)}</td>
      <td class="py-1.5 pr-3 text-sm text-emerald-300 text-right">${r.avg_engagement}%</td>
      <td class="py-1.5 text-xs text-zinc-500 text-right">${r.count}</td>
    </tr>`).join('');
    return `<div class="bg-primary/40 border border-accent/15 rounded-xl p-4 mb-4">
      <h3 class="font-display font-bold text-accent mb-2">${Eh(title)}</h3>
      <div class="overflow-x-auto"><table class="w-full"><thead><tr class="text-[10px] uppercase text-zinc-600 text-left"><th>Categoría</th><th class="text-right">Avg views</th><th class="text-right">Avg eng%</th><th class="text-right">N</th></tr></thead><tbody>${trs}</tbody></table></div></div>`;
  }
  function loadDashboard() {
    const el = document.getElementById('metrics-dash'); if (!el) return;
    window.Memory.getDashboard().then(d => {
      const k = d.kpis || {};
      if (!k.con_metricas) {
        el.innerHTML = `<div class="bg-primary/40 border border-zinc-800 rounded-xl p-6 text-center text-sm text-zinc-400">Todavía no hay métricas cargadas.<br>Generá contenido, publicalo y cargá los números con <b class="text-accent">📥 Cargar métricas</b>.</div>`;
        return;
      }
      const top = k.top_reel;
      el.innerHTML =
        `<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          ${kpiCard('Publicados', N(k.total_publicados), k.con_metricas + ' con métricas')}
          ${kpiCard('Avg views', N(k.avg_views))}
          ${kpiCard('Top pieza', N(top ? top.views : 0), top ? top.hook.slice(0, 22) : '')}
          ${kpiCard('Followers ganados', N(k.total_followers_ganados))}
        </div>` +
        topTable('🏆 Top 10 por views', d.top_views, 'views', 'Views') +
        topTable('💬 Top 10 por engagement', d.top_engagement, 'engagement_rate', 'Eng %') +
        topTable('💾 Top por save rate', d.top_save_rate, 'save_rate', 'Save %') +
        crossTable('👹 Enemigos × performance', d.cross_enemigos, enemigoName) +
        crossTable('🎭 Avatares × performance', d.cross_avatares, avatarName) +
        crossTable('🧠 Tácticas × performance', d.cross_tacticas, tacticaName);
    }).catch(e => { el.innerHTML = `<p class="text-sm text-red-400">Error dashboard: ${Eh(e.message)}</p>`; });
  }

  // ---------- Modal Cargar métricas ----------
  let SEL = null; // pieza seleccionada
  function openCargar() {
    const m = document.getElementById('metrics-modal'); if (!m) return;
    m.innerHTML = `<div class="bg-primary/40 border border-accent/30 rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-2"><h3 class="font-display font-bold text-accent">📥 Cargar métricas</h3><button onclick="metricsCloseCargar()" class="text-zinc-500 hover:text-white">✕</button></div>
      <div id="metrics-step" class="text-sm text-zinc-500">Cargando piezas…</div></div>`;
    window.Memory.listGenerations({ limit: 100 }).then(gens => {
      const elig = gens.filter(g => ['producida', 'publicada'].includes(g.estado));
      if (!elig.length) { document.getElementById('metrics-step').innerHTML = 'No hay piezas producidas/publicadas. Generá algo en Studio primero.'; return; }
      const opts = elig.map(g => {
        const ov = g.output_variantes; const v0 = Array.isArray(ov) ? ov[0] : (ov && ov.variantes ? ov.variantes[0] : null);
        const hook = (v0 && (v0.hook || v0.thumbnail_text)) || g.input_idea || '(sin título)';
        const fecha = g.created_at ? new Date(g.created_at).toLocaleDateString('es') : '';
        return `<option value="${g.id}">[${Eh(g.tipo)}] ${Eh(hook.slice(0, 60))} · ${fecha} · ${Eh(g.estado)}</option>`;
      }).join('');
      window.__metricsGens = elig;
      document.getElementById('metrics-step').innerHTML =
        `<label class="text-xs font-semibold text-zinc-400">Pieza</label>
         <select id="m-pieza" onchange="metricsSelectPiece(this.value)" class="mt-1 w-full bg-dark border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"><option value="">— elegí —</option>${opts}</select>
         <div id="m-detail" class="mt-3"></div>`;
    }).catch(e => { document.getElementById('metrics-step').innerHTML = `<span class="text-red-400">Error: ${Eh(e.message)}</span>`; });
  }
  function selectPiece(id) {
    SEL = (window.__metricsGens || []).find(g => g.id === id) || null;
    const el = document.getElementById('m-detail'); if (!el) return;
    if (!SEL) { el.innerHTML = ''; return; }
    const pub = Array.isArray(SEL.content_published) && SEL.content_published.length ? SEL.content_published[0] : null;
    if (SEL.estado === 'publicada' && pub) { renderMetricForm(el, pub.id); return; }
    // Producida → formulario de publicación primero
    el.innerHTML = `<div class="bg-dark/50 border border-zinc-800 rounded-lg p-3">
      <div class="text-[11px] uppercase text-zinc-400 font-bold mb-2">Publicar (pieza producida)</div>
      <div class="flex gap-3 mb-2 text-sm">
        ${['instagram', 'tiktok', 'youtube'].map((p, i) => `<label class="flex items-center gap-1"><input type="radio" name="m-plat" value="${p}" ${i === 0 ? 'checked' : ''} class="accent-[#C8A864]"> ${p}</label>`).join('')}
      </div>
      <input id="m-url" placeholder="URL del post (opcional)" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm mb-2 focus:border-accent outline-none">
      <button onclick="metricsPublish()" class="w-full bg-accent text-primary font-semibold py-2 rounded text-sm">Marcar como publicada → cargar números</button>
      <div id="m-puberr" class="text-[11px] text-red-400 mt-1"></div>
    </div>`;
  }
  function doPublish() {
    if (!SEL) return;
    const plat = (document.querySelector('input[name="m-plat"]:checked') || {}).value || 'instagram';
    const url = (document.getElementById('m-url') || {}).value || '';
    window.Memory.markAsPublished({ generation_id: SEL.id, plataforma: plat, url_post: url || null })
      .then(r => { renderMetricForm(document.getElementById('m-detail'), r.published_id); })
      .catch(e => { const x = document.getElementById('m-puberr'); if (x) x.textContent = e.message; });
  }
  const METRIC_FIELDS = [
    { id: 'views', label: 'Views *', req: true }, { id: 'likes', label: 'Likes' }, { id: 'comments', label: 'Comments' },
    { id: 'shares', label: 'Shares' }, { id: 'saves', label: 'Saves' }, { id: 'watch_time_avg_seconds', label: 'Watch avg (s)' },
    { id: 'hook_hold_3s_percent', label: 'Hook 3s (%)', pct: true }, { id: 'midpoint_hold_percent', label: 'Midpoint (%)', pct: true },
    { id: 'completion_rate_percent', label: 'Completion (%)', pct: true }, { id: 'followers_ganados', label: 'Followers ganados' },
    { id: 'profile_visits', label: 'Profile visits' }, { id: 'link_clicks', label: 'Link clicks' }, { id: 'dms_recibidos', label: 'DMs' },
  ];
  function renderMetricForm(el, publishedId) {
    if (!el) return;
    el.dataset.pub = publishedId;
    el.innerHTML = `<div class="bg-dark/50 border border-emerald-900/40 rounded-lg p-3">
      <div class="text-[11px] uppercase text-emerald-300 font-bold mb-2">Cargar números</div>
      <div class="grid grid-cols-2 gap-2">${METRIC_FIELDS.map(f => `<label class="block"><span class="text-[11px] text-zinc-400">${f.label}</span><input id="mf-${f.id}" type="number" min="0" ${f.pct ? 'max="100"' : ''} class="mt-0.5 w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none"></label>`).join('')}</div>
      <button onclick="metricsSave('${publishedId}')" class="w-full bg-accent text-primary font-semibold py-2 rounded text-sm mt-3">💾 Guardar métricas</button>
      <div id="m-saveerr" class="text-[11px] mt-1"></div>
    </div>`;
  }
  function saveMetrics(publishedId) {
    const payload = { published_id: publishedId };
    let bad = '';
    METRIC_FIELDS.forEach(f => {
      const v = (document.getElementById('mf-' + f.id) || {}).value;
      if (v === '' || v == null) { if (f.req) bad = 'Views es obligatorio.'; return; }
      const num = Number(v);
      if (num < 0) bad = f.label + ' no puede ser negativo.';
      if (f.pct && (num < 0 || num > 100)) bad = f.label + ' debe estar entre 0 y 100.';
      payload[f.id] = num;
    });
    if (payload.views == null) bad = bad || 'Views es obligatorio.';
    const err = document.getElementById('m-saveerr');
    if (bad) { if (err) { err.className = 'text-[11px] mt-1 text-red-400'; err.textContent = bad; } return; }
    window.Memory.saveMetrics(payload).then(() => {
      if (err) { err.className = 'text-[11px] mt-1 text-emerald-400'; err.textContent = '✓ Guardado.'; }
      if (window.studioToast) window.studioToast('Métricas guardadas ✓');
      setTimeout(() => { closeCargar(); loadDashboard(); }, 700);
    }).catch(e => { if (err) { err.className = 'text-[11px] mt-1 text-red-400'; err.textContent = e.message; } });
  }
  function closeCargar() { const m = document.getElementById('metrics-modal'); if (m) m.innerHTML = ''; SEL = null; }

  window.metricsOpenCargar = openCargar;
  window.metricsCloseCargar = closeCargar;
  window.metricsSelectPiece = selectPiece;
  window.metricsPublish = doPublish;
  window.metricsSave = saveMetrics;
  window.metricsLoadDashboard = loadDashboard;
  if (window.OPERA_RENDERERS) window.OPERA_RENDERERS.metricas = render;
})();
