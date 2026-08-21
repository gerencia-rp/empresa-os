/* viral-agente.js — pieza #9. Chat conversacional con TODO el contexto de marca.
   Reusa OPERA (data v2) + window.callClaudeMessages. Historial en localStorage.
   Se carga DESPUÉS de viral-opera.js, así que registra su renderer en OPERA_RENDERERS. */
(function () {
  'use strict';
  const CHAT_KEY = 'viralOperaChat';
  const MODEL = 'claude-sonnet-4-5';
  const Eh = (s) => (s == null ? '' : String(s)).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function getChat() { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || []; } catch { return []; } }
  function setChat(arr) { localStorage.setItem(CHAT_KEY, JSON.stringify(arr.slice(-40))); }

  function agentSystem() {
    const d = (typeof OPERA !== 'undefined') ? OPERA : null;
    if (!d) return 'Sos el asistente de marca de Nicolás Lara (Fix & Flip). Esperá a que cargue el contexto.';
    const a = d.arquetipo, id = d.identidad, en = a.enemigos;
    const fase = (window.ContextBuilder ? window.ContextBuilder.getCurrentFase() : 'siembra');
    return `Sos el asistente personal de Nicolás Lara, operador de Fix & Flip con +20 propiedades y 4 empresas inmobiliarias operando. Tenés TODO su contexto de marca cargado.

Tu rol: brainstorming (ideas, ángulos, hooks), análisis de piezas, decisiones estratégicas (qué publicar según la fase del mes), y atajos a las tabs de la app.

REGLAS:
- Hablás como un colega senior, no como un robot. Español rioplatense, directo, sin floritura.
- Respuestas CORTAS por default (3-5 párrafos máx). Expandís solo si lo piden.
- Respetás las reglas de marca: NO uses palabras prohibidas (${a.palabrasProhibidas.join(', ')}); priorizá palabras de marca (${a.palabrasDeMarca.slice(0, 10).join(', ')}); usá frases recurrentes cuando encaje.
- NO inventes datos: si no sabés algo, decílo.
- Si el usuario quiere GENERAR una pieza, NO la generes vos en el chat: ofrecé "¿Querés que lo genere en Studio con auto-config?" y resumí el ángulo (tipo + dolor + enemigo + tema).
- CTA siempre con palabra clave por DM en MAYÚSCULAS, nunca "link en bio".

CONTEXTO DE MARCA:
- Eslogan: "${id.esloganPrincipal}" · Framework: ${id.framework} · Frase maestra: "${id.fraseMaestra}"
- Arquetipo: ${a.nombre}. Foco 95% Fix & Flip; las 4 empresas solo como credibilidad.
- Enemigo visible: ${en.principal.nombre}. Enemigo invisible: ${en.invisible.nombre}. 10 enemigos tácticos disponibles.
- Avatares: 1) ${d.avatares.avatar1.nombre}; 2) ${d.avatares.avatar2.nombre} (default).
- Fase del mes HOY: ${fase} (${fase === 'cosecha' ? 'vender desde stories' : 'sembrar valor, no vender de frente'}).
- Tabs de la app: Studio (generar), Herramientas (calculadoras), Biblioteca (45 piezas), Tendencias, Calendario, Marca.`;
  }

  const QUICK = [
    { label: '💡 Idea para hoy', prompt: 'Dame 3 ideas de contenido para hoy según la fase del mes actual y un dolor relevante del avatar. Concretas, listas para grabar.' },
    { label: '🔍 Analizá mi última pieza', prompt: 'Te paso el texto de mi última pieza y me decís qué mejorar según mis reglas de marca. Si no la tenés, pedímela.' },
    { label: '🎯 Sugerime un dolor', prompt: 'Sugerime el próximo dolor del avatar a atacar esta semana y con qué enemigo, según la fase del mes.' },
    { label: '📅 ¿Qué publico hoy?', prompt: 'Dame las 3 piezas que debería publicar HOY según el plan de re-launch y la fase del mes.' },
  ];

  function bubbles() {
    const chat = getChat();
    if (!chat.length) return `<div class="text-center text-zinc-600 text-sm py-10">Arrancá una conversación.<br>Tengo todo tu contexto de marca cargado.</div>`;
    return chat.map(m => m.role === 'user'
      ? `<div class="flex justify-end mb-2"><div class="bg-accent/20 text-light rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap">${Eh(m.content)}</div></div>`
      : `<div class="flex justify-start mb-2"><div class="bg-primary/50 border border-zinc-800 text-zinc-100 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[90%] text-sm whitespace-pre-wrap">${Eh(m.content)}</div></div>`
    ).join('');
  }

  function render() {
    const out = document.getElementById('tab-agente'); if (!out) return;
    out.dataset.rendered = '1';
    const quick = QUICK.map(q => `<button onclick="agenteQuick(${QUICK.indexOf(q)})" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-primary/40 border border-zinc-800 text-zinc-300 hover:border-accent/40 shrink-0">${q.label}</button>`).join('');
    out.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div><h2 class="font-display text-xl font-bold text-accent">${osIcon('message')} Agente · Operador con Método</h2><p class="text-xs text-zinc-500">Chat con todo tu contexto de marca cargado</p></div>
        <div class="flex gap-1">
          <button onclick="agenteNueva()" class="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700">＋ Nueva</button>
          <button onclick="agenteBorrar()" class="text-xs px-2.5 py-1.5 rounded-lg bg-bordeaux/40 text-red-200 hover:bg-bordeaux/60">${osIcon('trash')}</button>
        </div>
      </div>
      <div class="flex gap-2 overflow-x-auto pb-2 mb-2">${quick}</div>
      <div id="ag-messages" class="bg-dark/40 border border-zinc-800 rounded-xl p-3 min-h-[280px] max-h-[55vh] overflow-y-auto mb-2">${bubbles()}</div>
      <div id="ag-actions" class="flex flex-wrap gap-2 mb-2"></div>
      <div class="flex gap-2">
        <textarea id="ag-input" rows="2" placeholder="Escribí acá… (Enter envía)" class="flex-1 bg-dark border border-zinc-800 rounded-lg px-3 py-2 text-sm resize-none focus:border-accent outline-none"></textarea>
        <button id="ag-send" onclick="agenteSend()" class="bg-accent text-primary font-semibold px-4 rounded-lg shrink-0">➤</button>
      </div>`;
    const inp = document.getElementById('ag-input');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); agenteSend(); } });
    scrollMsgs();
    // Rehidratar desde Supabase (si hay memoria configurada y el chat local está vacío)
    if (window.Memory && window.Memory.enabled()) {
      const sid = window.Memory.getCurrentSessionId();
      window.Memory.getChatHistory(sid, 50).then(msgs => {
        if (msgs && msgs.length && getChat().length <= msgs.length) {
          setChat(msgs.map(m => ({ role: m.role, content: m.content })));
          refreshMsgs();
        }
      }).catch(() => {});
    }
  }
  function scrollMsgs() { const m = document.getElementById('ag-messages'); if (m) m.scrollTop = m.scrollHeight; }
  function refreshMsgs() { const m = document.getElementById('ag-messages'); if (m) m.innerHTML = bubbles(); scrollMsgs(); }

  function persist(role, content) {
    if (window.Memory && window.Memory.enabled()) {
      try { window.Memory.saveChatMessage(window.Memory.getCurrentSessionId(), role, content).catch(() => {}); } catch (e) {}
    }
  }
  async function send(text) {
    text = (text || '').trim(); if (!text) return;
    const chat = getChat(); chat.push({ role: 'user', content: text }); setChat(chat); refreshMsgs();
    persist('user', text);
    const inp = document.getElementById('ag-input'); if (inp) inp.value = '';
    const m = document.getElementById('ag-messages');
    if (m) { m.insertAdjacentHTML('beforeend', `<div id="ag-typing" class="flex justify-start mb-2"><div class="bg-primary/50 border border-zinc-800 rounded-2xl px-3 py-2 text-sm typing"><span>●</span><span>●</span><span>●</span></div></div>`); scrollMsgs(); }
    const send = document.getElementById('ag-send'); if (send) send.disabled = true;
    try {
      const history = getChat().slice(-10).map(x => ({ role: x.role, content: x.content }));
      const reply = await window.callClaudeMessages(history, { system: agentSystem(), max_tokens: 1200, model: MODEL });
      const chat2 = getChat(); chat2.push({ role: 'assistant', content: reply }); setChat(chat2);
      persist('assistant', reply);
      refreshMsgs(); renderActions(text);
    } catch (e) {
      const t = document.getElementById('ag-typing'); if (t) t.remove();
      const chat2 = getChat(); chat2.push({ role: 'assistant', content: '⚠ Error: ' + e.message }); setChat(chat2); refreshMsgs();
    } finally { if (send) send.disabled = false; }
  }
  // Atajos contextuales debajo del chat
  function renderActions(lastUserText) {
    const el = document.getElementById('ag-actions'); if (!el) return;
    const tema = (lastUserText || '').slice(0, 140).replace(/"/g, '');
    el.innerHTML =
      `<button onclick="agenteToStudio('${tema.replace(/'/g, "\\'")}')" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25">${osIcon('target')} Generar en Studio</button>` +
      `<button onclick="document.querySelector('[data-tab=sistema]').click()" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-primary/40 border border-zinc-800 text-zinc-300">${osIcon('wrench')} Herramientas</button>` +
      `<button onclick="document.querySelector('[data-tab=biblioteca]').click()" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-primary/40 border border-zinc-800 text-zinc-300">${osIcon('book')} Biblioteca</button>` +
      `<button onclick="document.querySelector('[data-tab=calendario]').click()" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-primary/40 border border-zinc-800 text-zinc-300">${osIcon('calendar')} Calendario</button>`;
  }

  // API global
  window.agenteSend = () => send((document.getElementById('ag-input') || {}).value);
  window.agenteQuick = (i) => send(QUICK[i].prompt);
  window.agenteNueva = () => { setChat([]); if (window.Memory && window.Memory.enabled()) window.Memory.newSession(); refreshMsgs(); const a = document.getElementById('ag-actions'); if (a) a.innerHTML = ''; };
  window.agenteBorrar = () => { if (confirm('¿Borrar toda la conversación?')) window.agenteNueva(); };
  window.agenteToStudio = (tema) => { if (window.studioLoadPiece) window.studioLoadPiece({ tipo: 'reel', tema }); };

  // Registro en el dispatcher de tabs (viral-opera.js ya definió OPERA_RENDERERS)
  if (window.OPERA_RENDERERS) window.OPERA_RENDERERS.agente = render;
})();
