// ════════════════════════════════════════════════════════════════════
// 🧠 CEREBRO — panel flotante OMNIPRESENTE (líder IA del negocio)
//
// Botón + panel de chat presentes en CUALQUIER pantalla (admin y clásicos):
// se montan sobre document.body con z-index por encima de #os-root y #modal.
// Habla con la edge function `cerebro` (Supabase), que arma el snapshot de
// NÚMEROS REALES server-side y responde SIMPLE, solo lectura.
//
// Reusa: `sb` (cliente supabase global de app.js), marked + DOMPurify (index.html),
// tokens del sistema de diseño (--grad/--a1/--a2/--glass/--ink…).
// ════════════════════════════════════════════════════════════════════
(function () {
  if (window.__cerebroBooted) return;
  window.__cerebroBooted = true;

  const CB = { open: false, busy: false, chat: [], mounted: false };
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  function pantallaActual() {
    // Etiqueta amigable de dónde está parado el usuario (para dar contexto al Cerebro)
    try {
      const p = (location.pathname || '/').replace(/\/+$/, '') || '/';
      const modalOpen = document.getElementById('modal') && getComputedStyle(document.getElementById('modal')).display !== 'none';
      if (modalOpen) return 'módulo clásico abierto (PM / Estimador / Planner / etc.)';
      const map = { '/': 'Panel Global del holding', '/fix-and-flip': 'Fix & Flip', '/rentas': 'Rentas', '/remodelacion': 'Remodelación', '/educacion': 'FlipMentoría', '/operacion': 'Operación', '/contable': 'Contable', '/inversionistas': 'Admin Inversionistas', '/cartera': 'Informe de Cartera', '/cobros': 'Cobros', '/mapa': 'Mapa de conexiones' };
      return map[p] || ('ruta ' + p);
    } catch (e) { return 'no especificada'; }
  }

  function css() {
    if (document.getElementById('cerebro-css')) return;
    const s = document.createElement('style');
    s.id = 'cerebro-css';
    s.textContent = `
    #cerebro-fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;
      background:var(--grad,linear-gradient(135deg,#12c2b3,#3b74ff));box-shadow:0 10px 30px rgba(23,43,77,.35),0 0 0 1px rgba(255,255,255,.08) inset;
      display:flex;align-items:center;justify-content:center;font-size:26px;transition:transform .15s ease, box-shadow .2s ease}
    #cerebro-fab:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 14px 38px rgba(23,43,77,.45)}
    #cerebro-fab .cdot{position:absolute;top:8px;right:9px;width:9px;height:9px;border-radius:50%;background:#48d69c;box-shadow:0 0 0 2px rgba(0,0,0,.25);animation:cbpulse 2.4s infinite}
    @keyframes cbpulse{0%{opacity:.5}50%{opacity:1}100%{opacity:.5}}
    #cerebro-panel{position:fixed;right:20px;bottom:88px;z-index:2147483000;width:min(420px,calc(100vw - 32px));height:min(620px,calc(100vh - 130px));
      display:none;flex-direction:column;border-radius:18px;overflow:hidden;background:var(--bg,#06080d);color:var(--ink,#e6ebf5);
      border:1px solid var(--glassb,rgba(255,255,255,.12));box-shadow:0 24px 70px rgba(0,0,0,.5)}
    #cerebro-panel.on{display:flex;animation:cbin .18s ease}
    @keyframes cbin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    .cb-head{display:flex;align-items:center;gap:11px;padding:14px 16px;background:var(--grad,linear-gradient(135deg,#12c2b3,#3b74ff));color:#fff}
    .cb-orb{width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#eafffb,#a9f5e6 30%,#fff 70%);flex:0 0 auto;box-shadow:0 0 16px rgba(255,255,255,.5)}
    .cb-head b{font-size:15px;display:block;line-height:1.1}
    .cb-head span{font-size:10px;opacity:.85;letter-spacing:.06em;text-transform:uppercase}
    .cb-x{margin-left:auto;background:rgba(255,255,255,.18);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:15px}
    .cb-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
    .cb-body::-webkit-scrollbar{width:8px}.cb-body::-webkit-scrollbar-thumb{background:var(--glassb,rgba(255,255,255,.14));border-radius:8px}
    .cb-bub{max-width:88%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;word-wrap:break-word}
    .cb-bub.u{align-self:flex-end;background:var(--grad,linear-gradient(135deg,#12c2b3,#3b74ff));color:#fff;border-bottom-right-radius:4px}
    .cb-bub.a{align-self:flex-start;background:var(--glass,rgba(255,255,255,.045));border:1px solid var(--glassb,rgba(255,255,255,.09));border-bottom-left-radius:4px}
    .cb-bub.err{border-color:var(--neg,#f0687a);color:var(--neg,#f0687a)}
    .cb-bub.a p{margin:0 0 7px}.cb-bub.a p:last-child{margin:0}.cb-bub.a ul,.cb-bub.a ol{margin:4px 0;padding-left:18px}.cb-bub.a li{margin:2px 0}
    .cb-bub.a table{border-collapse:collapse;width:100%;margin:6px 0;font-size:12px}.cb-bub.a th,.cb-bub.a td{border:1px solid var(--glassb,rgba(255,255,255,.12));padding:4px 7px;text-align:left}
    .cb-bub.a code{background:rgba(127,127,127,.18);padding:1px 4px;border-radius:4px;font-size:12px}
    .cb-think{align-self:flex-start;font-size:12px;color:var(--mut,#93a0b6);display:flex;gap:5px;align-items:center}
    .cb-think i{width:6px;height:6px;border-radius:50%;background:var(--a1,#45e3c6);animation:cbb 1s infinite}
    .cb-think i:nth-child(2){animation-delay:.15s}.cb-think i:nth-child(3){animation-delay:.3s}
    @keyframes cbb{0%,100%{opacity:.3}50%{opacity:1}}
    .cb-hint{align-self:stretch;display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
    .cb-hint button{background:var(--glass,rgba(255,255,255,.045));border:1px solid var(--glassb,rgba(255,255,255,.1));color:var(--ink,#e6ebf5);
      font-size:11.5px;padding:6px 10px;border-radius:20px;cursor:pointer}
    .cb-hint button:hover{border-color:var(--a2,#4f8dff)}
    .cb-foot{padding:10px 12px;border-top:1px solid var(--glassb,rgba(255,255,255,.1));display:flex;gap:8px;align-items:flex-end}
    .cb-foot textarea{flex:1;resize:none;background:var(--glass,rgba(255,255,255,.045));border:1px solid var(--glassb,rgba(255,255,255,.12));
      color:var(--ink,#e6ebf5);border-radius:12px;padding:9px 11px;font-size:13.5px;font-family:inherit;max-height:110px;min-height:20px;line-height:1.4}
    .cb-foot textarea:focus{outline:none;border-color:var(--a2,#4f8dff)}
    .cb-send{background:var(--grad,linear-gradient(135deg,#12c2b3,#3b74ff));border:none;color:#fff;width:38px;height:38px;border-radius:11px;cursor:pointer;font-size:16px;flex:0 0 auto}
    .cb-send:disabled{opacity:.5;cursor:default}
    .cb-empty{text-align:center;color:var(--mut,#93a0b6);font-size:13px;padding:18px 8px}
    .cb-empty .cb-orb{margin:0 auto 10px}
    @media(max-width:520px){#cerebro-panel{right:8px;left:8px;width:auto;bottom:82px}#cerebro-fab{right:14px;bottom:14px}}
    `;
    document.head.appendChild(s);
  }

  const SUGERENCIAS = [
    '¿Cuánta caja atrapada tiene el portafolio?',
    '¿Cómo va la cartera vencida?',
    '¿Qué casa drena más caja?',
    '¿Cómo viene la ocupación de rentas?'
  ];

  function renderChat() {
    const body = document.getElementById('cerebro-body');
    if (!body) return;
    if (!CB.chat.length) {
      body.innerHTML = `<div class="cb-empty"><div class="cb-orb"></div>
        <b>Soy el Cerebro</b><div style="margin-top:4px">Entiendo los números reales del negocio y te los explico simple. Preguntame lo que quieras.</div>
        <div class="cb-hint" style="justify-content:center;margin-top:12px">${SUGERENCIAS.map(q => `<button data-cbq="${E(q)}">${E(q)}</button>`).join('')}</div></div>`;
      return;
    }
    const md = (t) => (window.marked && window.DOMPurify) ? DOMPurify.sanitize(marked.parse(t)) : E(t);
    body.innerHTML = CB.chat.map(m => {
      if (m.thinking) return `<div class="cb-think"><i></i><i></i><i></i> pensando…</div>`;
      if (m.role === 'user') return `<div class="cb-bub u">${E(m.content)}</div>`;
      return `<div class="cb-bub a${m.error ? ' err' : ''}">${m.error ? E(m.content) : md(m.content)}</div>`;
    }).join('');
    body.scrollTop = body.scrollHeight;
  }

  async function ask(q) {
    const inp = document.getElementById('cerebro-input');
    const question = (q || (inp ? inp.value : '')).trim();
    if (!question || CB.busy) return;
    if (inp) { inp.value = ''; inp.style.height = 'auto'; }
    CB.busy = true;
    CB.chat.push({ role: 'user', content: question });
    CB.chat.push({ role: 'assistant', content: '', thinking: true });
    renderChat();
    const sendBtn = document.getElementById('cerebro-send'); if (sendBtn) sendBtn.disabled = true;
    try {
      let tok = window.SUPABASE_ANON_KEY;
      try { const s = await sb.auth.getSession(); if (s && s.data.session) tok = s.data.session.access_token; } catch (e) {}
      const history = CB.chat.filter(m => !m.thinking && !m.error).slice(0, -1).slice(-8).map(m => ({ role: m.role, content: m.content }));
      const r = await fetch(window.SUPABASE_URL + '/functions/v1/cerebro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + tok },
        body: JSON.stringify({ question, history, screen: pantallaActual() })
      });
      const data = await r.json().catch(() => ({}));
      CB.chat.pop();
      if (r.ok && data.answer) CB.chat.push({ role: 'assistant', content: data.answer });
      else CB.chat.push({ role: 'assistant', content: data.error || ('No pude responder (HTTP ' + r.status + ').'), error: true });
    } catch (e) {
      CB.chat.pop();
      CB.chat.push({ role: 'assistant', content: 'No pude conectar con el Cerebro: ' + (e.message || e), error: true });
    } finally {
      CB.busy = false;
      const sb2 = document.getElementById('cerebro-send'); if (sb2) sb2.disabled = false;
      renderChat();
    }
  }
  window.cerebroAsk = ask;

  function toggle(force) {
    const panel = document.getElementById('cerebro-panel');
    if (!panel) return;
    CB.open = force != null ? force : !CB.open;
    panel.classList.toggle('on', CB.open);
    if (CB.open) { renderChat(); setTimeout(() => { const i = document.getElementById('cerebro-input'); if (i) i.focus(); }, 60); }
  }
  window.cerebroToggle = toggle;

  function mount() {
    if (CB.mounted) return;
    css();
    const fab = document.createElement('button');
    fab.id = 'cerebro-fab';
    fab.title = 'Cerebro — asistente del negocio';
    fab.setAttribute('aria-label', 'Abrir el Cerebro');
    fab.innerHTML = '🧠<span class="cdot"></span>';
    fab.onclick = () => toggle();

    const panel = document.createElement('div');
    panel.id = 'cerebro-panel';
    panel.innerHTML = `
      <div class="cb-head">
        <div class="cb-orb"></div>
        <div><b>Cerebro</b><span>Líder IA · números reales</span></div>
        <button class="cb-x" id="cerebro-close" aria-label="Cerrar">✕</button>
      </div>
      <div class="cb-body" id="cerebro-body"></div>
      <div class="cb-foot">
        <textarea id="cerebro-input" rows="1" placeholder="Preguntale al Cerebro…"></textarea>
        <button class="cb-send" id="cerebro-send" aria-label="Enviar">➤</button>
      </div>`;
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    document.getElementById('cerebro-close').onclick = () => toggle(false);
    document.getElementById('cerebro-send').onclick = () => ask();
    const inp = document.getElementById('cerebro-input');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } });
    inp.addEventListener('input', () => { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 110) + 'px'; });
    // delegación para las sugerencias
    document.getElementById('cerebro-body').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cbq]'); if (b) ask(b.getAttribute('data-cbq'));
    });
    CB.mounted = true;
    renderChat();
  }

  async function boot() {
    // Solo para usuarios logueados (el Cerebro es interno). El portal del inversor
    // standalone no incluye este script.
    try {
      if (!window.sb) return;
      const s = await sb.auth.getSession();
      if (s && s.data && s.data.session) mount();
    } catch (e) {}
  }

  // Montar al cargar y re-chequear en cambios de sesión (login/logout).
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  try {
    if (window.sb) sb.auth.onAuthStateChange((_ev, session) => {
      if (session) mount();
      else { const f = document.getElementById('cerebro-fab'), p = document.getElementById('cerebro-panel'); if (f) f.remove(); if (p) p.remove(); CB.mounted = false; CB.open = false; }
    });
  } catch (e) {}
})();
