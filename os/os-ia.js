// ════════════════════════════════════════════════════════════════
// 🏭 DEPARTAMENTO IA v3.1 — FÁBRICA DE ARTEFACTOS "modo económico".
// Wizard conversacional (Haiku, una pregunta por vez, texto o voz) que llena
// la FICHA DEL ARTEFACTO (10 campos, barra de progreso). Al completar, el
// server genera el PROMPT PODEROSO (plantilla Guía Maestra v2) → botón
// "Copiar prompt" → se construye en Claude Code (SIN auto-build por API).
// El spec (ficha+prompt) queda en ia_specs: libre='aprobado', ok='pendiente'.
// Galería intacta; render seguro <iframe sandbox> sin allow-same-origin.
// ⚠ NAMESPACE: OSIA/osia* — el prefijo IA/ia* lo ocupa os/inv-admin.js.
// ════════════════════════════════════════════════════════════════
const OSIA = { loaded: false, loading: false, err: null, arts: [], specs: [], tab: 'crear', q: '', fArea: '', me: '', chat: [], sessionId: null, busy: false, busyMsg: '', stage: 'chat', ficha: {}, progreso: 0, promptPack: null, _rec: null };
window.OSIA = OSIA;

const OSIA_TIPO_LBL = { prompt: 'Generador', dashboard: 'Calculadora', agente: 'Asistente', automatizacion: 'Checklist/Flujo' };
const OSIA_SPEC_ESTADOS = ['pendiente', 'aprobado', 'construido', 'descartado'];
const OSIA_SPEC_CLS = { pendiente: 'b-warn', aprobado: 'b-ok', construido: 'b-ok', descartado: 'b-red' };
const OSIA_FICHA = [
  ['nombre', 'Nombre'], ['trabajo', 'El trabajo'], ['quien_cuando', 'Quién y cuándo'], ['inputs', 'Qué datos entran'],
  ['reglas', 'Reglas'], ['resultado', 'Qué decide'], ['entregable', 'Cómo lo entrega'], ['ejemplos_oro', 'Ejemplos de oro'],
  ['casos_borde', 'Casos borde'], ['no_debe', 'Qué NO hace'],
];

function osiaE(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function osiaCanManage() { return window.osCanArea ? osCanArea('ia') : false; }
function osiaFecha(ts) { try { return new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }); } catch (e) { return ''; } }

// ─── CSS ───
function osiaCSS() {
  if (document.getElementById('osia-styles')) return;
  const st = document.createElement('style'); st.id = 'osia-styles';
  st.textContent = `
  #os-root .osia-tabs{display:flex;gap:8px;margin:6px 0 18px;flex-wrap:wrap}
  #os-root .osia-tab{background:var(--glass);border:1px solid var(--glassb);color:var(--mut);padding:8px 16px;border-radius:11px;cursor:pointer;font-size:12.5px;font-weight:600}
  #os-root .osia-tab:hover{color:var(--ink);border-color:var(--a2)}
  #os-root .osia-tab.on{color:var(--ink);border-color:var(--a2);background:linear-gradient(135deg,rgba(92,121,240,.12),rgba(58,91,224,.1))}
  #os-root .osia-prog{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px}
  #os-root .osia-step{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--mut2);background:var(--glass);border:1px solid var(--glassb);border-radius:14px;padding:3px 9px}
  #os-root .osia-step.ok{color:var(--pos);border-color:rgba(74,222,158,.4)}
  #os-root .osia-chat{display:flex;flex-direction:column;gap:10px;max-height:46vh;overflow-y:auto;padding:4px 2px}
  #os-root .osia-b{max-width:88%;padding:11px 14px;border-radius:13px;font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
  #os-root .osia-b.u{align-self:flex-end;background:linear-gradient(135deg,rgba(92,121,240,.16),rgba(58,91,224,.14));border:1px solid rgba(58,91,224,.3)}
  #os-root .osia-b.a{align-self:flex-start;background:var(--glass);border:1px solid var(--glassb)}
  #os-root .osia-blbl{font-size:10px;color:var(--mut2);font-weight:700;letter-spacing:.4px;margin-bottom:4px}
  #os-root .osia-b.think{color:var(--mut2);font-style:italic;align-self:flex-start}
  #os-root .osia-b.err{align-self:flex-start;border:1px solid rgba(255,107,107,.4);color:var(--neg);background:var(--glass)}
  #os-root .osia-ask{display:flex;gap:8px;margin-top:12px}
  #os-root .osia-ask textarea{flex:1;background:var(--glass);border:1px solid var(--glassb);border-radius:11px;padding:11px 14px;color:var(--ink);font-size:13px;outline:none;font-family:inherit;resize:none;min-height:44px;max-height:120px;line-height:1.4}
  #os-root .osia-ask textarea:focus{border-color:var(--a2)}
  #os-root .osia-mic{background:var(--glass);border:1px solid var(--glassb);border-radius:10px;cursor:pointer;font-size:15px;padding:0 12px;color:var(--ink)}
  #os-root .osia-mic.rec{border-color:var(--neg);animation:osiapulse 1s infinite}
  @keyframes osiapulse{50%{opacity:.5}}
  #os-root .osia-flow{display:flex;flex-direction:column;gap:0;margin:10px 0}
  #os-root .osia-fbox{background:var(--glass);border:1px solid var(--glassb);border-radius:10px;padding:9px 13px;font-size:12px;line-height:1.4}
  #os-root .osia-farr{text-align:center;color:var(--a2);font-size:13px;line-height:1.6}
  #os-root .osia-bigbtn{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#fff;font-weight:800;padding:12px 22px;border-radius:12px;cursor:pointer;font-size:13.5px}
  #os-root .osia-ghostbtn{background:var(--glass);border:1px solid var(--glassb);color:var(--ink);font-weight:600;padding:12px 18px;border-radius:12px;cursor:pointer;font-size:12.5px}
  #os-root .osia-ghostbtn:hover{border-color:var(--a2)}
  #os-root .osia-demo-fr{width:100%;height:380px;border:1px solid var(--glassb);border-radius:12px;background:#fff}
  #os-root .osia-in{background:var(--glass);border:1px solid var(--glassb);border-radius:8px;padding:6px 9px;color:var(--ink);font-size:11.5px;outline:none;font-family:inherit;max-width:100%}
  #os-root .osia-frame-wrap{position:fixed;inset:0;z-index:1200;background:rgba(4,6,10,.72);display:flex;align-items:center;justify-content:center;padding:26px}
  #os-root .osia-frame-box{background:#fff;border-radius:14px;width:min(1080px,96vw);height:min(760px,92vh);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 40px 90px -30px rgba(0,0,0,.8)}
  #os-root .osia-frame-hd{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#f1f5fb;border-bottom:1px solid #dfe6f0;color:#0e1420;font-size:13px;font-weight:700}
  #os-root .osia-frame-hd .x{margin-left:auto;cursor:pointer;border:none;background:#e3e9f3;border-radius:8px;padding:5px 12px;font-size:12px;color:#0e1420}
  #os-root .osia-frame-box iframe{flex:1;border:none;width:100%;background:#fff}
  #os-root .osia-frame-box .osia-doc{flex:1;overflow-y:auto;padding:22px 26px;color:#0e1420;font-size:13.5px;line-height:1.65;white-space:pre-wrap}
  #os-root .osia-spec-pre{background:var(--glass);border:1px solid var(--glassb);border-radius:10px;padding:12px;font-size:11.5px;line-height:1.5;white-space:pre-wrap;max-height:220px;overflow-y:auto;color:var(--mut)}`;
  document.head.appendChild(st);
}

// ─── DATA ───
async function osiaLoad(force) {
  if (OSIA.loading || (OSIA.loaded && !force)) return;
  OSIA.loading = true; OSIA.err = null;
  try {
    const [ar, sp, usr] = await Promise.all([
      sb.from('ia_artifacts').select('id,titulo,area,tipo,descripcion,ruta,carril,solicitante,creado_at,activo').eq('activo', true).order('creado_at', { ascending: false }),
      sb.from('ia_specs').select('*').eq('activo', true).order('creado_at', { ascending: false }),
      sb.auth.getUser().catch(() => null),
    ]);
    OSIA.arts = ar.data || []; OSIA.specs = sp.data || [];
    OSIA.me = (usr && usr.data && usr.data.user && usr.data.user.email) || '';
    OSIA.loaded = true;
  } catch (e) { OSIA.err = e.message || String(e); }
  OSIA.loading = false;
  osRender();
}
window.osiaLoad = osiaLoad;
async function osiaReloadData() {
  const [ar, sp] = await Promise.all([
    sb.from('ia_artifacts').select('id,titulo,area,tipo,descripcion,ruta,carril,solicitante,creado_at,activo').eq('activo', true).order('creado_at', { ascending: false }),
    sb.from('ia_specs').select('*').eq('activo', true).order('creado_at', { ascending: false }),
  ]);
  OSIA.arts = ar.data || OSIA.arts; OSIA.specs = sp.data || OSIA.specs;
}

function osiaGo(tab) {
  OSIA.tab = tab;
  const path = tab === 'crear' ? '/ia' : '/ia/' + tab;
  if (location.pathname.replace(/\/+$/, '') !== path) { osNav(path); } else { osRender(); }
}
window.osiaGo = osiaGo;

// ─── VISTA raíz ───
function osiaView() {
  osiaCSS();
  if (OSIA.tab === 'pedir' || OSIA.tab === 'bandeja') OSIA.tab = OSIA.tab === 'bandeja' ? 'pendientes' : 'crear'; // rutas viejas
  const tab = OSIA.tab;
  if (!OSIA.loaded && !OSIA.loading && !OSIA.err) osiaLoad();
  const mgr = osiaCanManage();
  const nPend = OSIA.specs.filter(s => s.estado === 'pendiente').length;
  const tabBtn = (k, lbl) => '<button class="osia-tab ' + (tab === k ? 'on' : '') + '" onclick="osiaGo(\'' + k + '\')">' + lbl + '</button>';
  let body;
  if (OSIA.err) body = '<div class="empty"><div style="font-size:34px">' + osIcon('alert') + '</div><div class="down" style="margin-top:8px">' + osiaE(OSIA.err) + '</div></div>';
  else if (!OSIA.loaded) body = '<div class="empty">' + osIcon('loader') + ' Cargando la fábrica…</div>';
  else body = tab === 'galeria' ? osiaGaleria() : tab === 'pendientes' ? (mgr ? osiaPendientes() : osiaNoAccess()) : osiaCrear();
  const pendBand = (mgr && nPend > 0 && window.kitVerdict)
    ? kitVerdict('revisar', nPend + (nPend === 1 ? ' spec esperando' : ' specs esperando') + ' tu OK', 'Revisalas en Pendientes')
    : '';
  return '<h1>' + osIcon('factory') + ' IA <span>· Fábrica de artefactos</span></h1><div class="sub">Contale a la IA una tarea: te entrevista a fondo y te entrega el prompt listo para construir tu artefacto en Claude Code.</div>' +
    '<div class="osia-tabs">' + tabBtn('crear', 'Crear') + tabBtn('galeria', 'Galería (' + OSIA.arts.length + ')') + (mgr ? tabBtn('pendientes', 'Pendientes de OK' + (nPend ? ' (' + nPend + ')' : '')) : '') + '</div>' + pendBand + body;
}
window.osiaView = osiaView;

function osiaNoAccess() {
  return '<div class="empty"><div style="font-size:34px">' + osIcon('lock') + '</div><div style="margin-top:8px">Los pendientes de OK son para gestores del área IA (o admins).</div></div>';
}

// ═══ 1) CREAR — wizard ═══
function osiaProgressHTML() {
  const f = OSIA.ficha || {};
  return '<div class="osia-prog">' + OSIA_FICHA.map(p => {
    const done = f[p[0]] && String(f[p[0]]).trim();
    return '<span class="osia-step ' + (done ? 'ok' : '') + '">' + (done ? '✓' : '·') + ' ' + p[1] + '</span>';
  }).join('') + '</div>';
}

function osiaCrear() {
  const hasVoice = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const micBtn = hasVoice ? '<button type="button" class="osia-mic" id="osia-mic" onclick="osiaVoice()" title="Dictar por voz">' + osIcon('mic') + '</button>' : '';
  const hello = '<div class="osia-b a"><div class="osia-blbl">' + osIcon('factory') + ' Builder</div>¡Hola! Contame una tarea que hagas seguido (o que te gustaría no hacer más) y la convertimos en una herramienta.\n\nEj: "calculo a mano cuánto cobrar cuando un inquilino entra a mitad de mes" · "necesito un checklist de inspección" · "armo mensajes de cobro uno por uno".</div>';
  const nueva = OSIA.chat.length ? '<button class="ibtn" style="margin-left:auto" onclick="osiaNueva()">＋ Nueva</button>' : '';
  const started = OSIA.chat.length > 0;
  const promptCard = (OSIA.stage === 'prompt' && OSIA.promptPack) ? osiaPromptHTML() : '';
  const lateral = started ? osiaFichaCard() : osiaComoFunciona(hasVoice);
  return '<div class="grid k2" style="align-items:start;grid-template-columns:1.65fr 1fr">' +
    '<div><div class="card"><div class="chart-h"><div class="t">' + osIcon('factory') + ' Construí tu artefacto</div>' + nueva + '</div>' +
    (started ? osiaProgressHTML() : '') +
    '<div class="osia-chat" id="osia-chat">' + hello + osiaChatHTML() + '</div>' +
    '<div class="osia-ask"><textarea id="osia-inp" placeholder="Contá tu tarea… (Enter envía, Shift+Enter salto de línea)" onkeydown="osiaKey(event)"></textarea>' + micBtn + '<button class="cbtn" style="padding:0 18px" onclick="osiaSend()">Enviar</button></div></div>' +
    promptCard + '</div>' + lateral + '</div>';
}

function osiaComoFunciona(hasVoice) {
  return '<div class="card"><div class="chart-h"><div class="t">Cómo funciona</div></div>' +
    '<div class="kv"><span>1 · Contás la tarea</span><b>con tus palabras' + (hasVoice ? ' o por voz ' : '') + '</b></div>' +
    '<div class="kv"><span>2 · Te entrevista a fondo</span><b>una pregunta por vez</b></div>' +
    '<div class="kv"><span>3 · Ficha completa (10 pasos)</span><b>sale tu PROMPT PODEROSO ' + osIcon('clipboard') + '</b></div>' +
    '<div class="kv"><span>4 · Lo pegás en Claude Code</span><b>ahí se construye</b></div>' +
    '<div class="kv"><span>5 · Publicado</span><b>aparece en la Galería ' + osIcon('image') + '</b></div>' +
    '<div class="meta" style="margin-top:12px">Si el artefacto necesita datos reales de la empresa (pagos, Airtable, mensajes a inquilinos…), el brief queda pendiente del OK de un admin antes de construirse. ' + osIcon('lock') + '</div></div>';
}

function osiaFichaCard() {
  const f = OSIA.ficha || {};
  return '<div class="card"><div class="chart-h"><div class="t">' + osIcon('clipboard') + ' Ficha del artefacto</div><div class="k">' + (OSIA.progreso || 0) + '/10</div></div>' +
    OSIA_FICHA.map(p => {
      const v = f[p[0]] ? String(f[p[0]]) : '';
      return '<div class="kv"><span>' + p[1] + '</span><b style="max-width:60%;font-weight:' + (v ? '600' : '400') + ';color:' + (v ? 'var(--ink)' : 'var(--mut2)') + '">' + (v ? osiaE(v.slice(0, 90)) + (v.length > 90 ? '…' : '') : '…') + '</b></div>';
    }).join('') + '</div>';
}

function osiaPromptHTML() {
  const p = OSIA.promptPack;
  const flow = (p.pasos || []).map((s, i) => '<div class="osia-fbox"><b>' + (i + 1) + '.</b> ' + osiaE(s) + '</div>').join('<div class="osia-farr">↓</div>');
  const esOk = p.carril === 'ok';
  const carril = esOk
    ? '<span class="badge b-warn">' + osIcon('lock') + ' pendiente del OK de un admin (usa datos reales)</span>'
    : '<span class="badge b-ok">' + osIcon('check-circle') + ' listo para construir</span>';
  const cta = esOk
    ? '<div class="meta" style="margin-top:12px">El brief completo quedó guardado. Cuando un admin lo apruebe, se construye y te avisan — no hace falta que hagas nada más.</div>'
    : '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;align-items:center">' +
      '<button class="osia-bigbtn" onclick="osiaCopyPrompt()">' + osIcon('clipboard') + ' Copiar prompt</button>' +
      '<span class="meta">Pegá esto en <b>Claude Code</b> para construir tu artefacto.</span></div>';
  return '<div class="card" style="margin-top:16px"><div class="chart-h"><div class="t">' + osIcon('clipboard') + ' ' + osiaE(p.titulo || 'Tu prompt') + '</div>' + carril + '</div>' +
    '<div class="meta" style="margin-bottom:6px">' + osiaE(p.resumen || '') + '</div>' +
    (flow ? '<div class="osia-flow">' + flow + '</div>' : '') +
    (esOk ? '' : '<div class="osia-spec-pre" style="margin-top:10px;max-height:300px">' + osiaE(p.prompt || '') + '</div>') +
    cta + '</div>';
}

async function osiaCopyPrompt() {
  const p = OSIA.promptPack; if (!p || !p.prompt) return;
  try { await navigator.clipboard.writeText(p.prompt); if (window.toast) toast('Prompt copiado — pegalo en Claude Code', 'success'); }
  catch (e) { prompt('Copiá el prompt:', p.prompt); }
}
window.osiaCopyPrompt = osiaCopyPrompt;

function osiaChatHTML() {
  return OSIA.chat.map(m => {
    if (m.role === 'user') return '<div class="osia-b u">' + osiaE(m.content) + '</div>';
    if (m.role === 'err') return '<div class="osia-b err">' + osiaE(m.content) + '</div>';
    let extra = '';
    if (m.artifact) extra = '<div style="margin-top:9px"><button class="cbtn" style="padding:7px 14px" onclick="osiaAbrir(\'' + m.artifact.id + '\')">Abrir "' + osiaE(m.artifact.titulo) + '"</button> <button class="ibtn" style="height:30px;padding:0 12px" onclick="osiaGo(\'galeria\')">Ver en Galería →</button></div>';
    if (m.spec) extra = '<div style="margin-top:8px"><span class="badge b-warn">' + osIcon('lock') + ' pendiente de OK del admin</span></div>';
    return '<div class="osia-b a"><div class="osia-blbl">' + osIcon('factory') + ' Builder</div>' + osiaE(m.content) + extra + '</div>';
  }).join('') + (OSIA.busy ? '<div class="osia-b think" id="osia-think">' + osiaE(OSIA.busyMsg || 'pensando…') + '</div>' : '');
}
function osiaPaintChat() { const el = document.getElementById('osia-chat'); if (el) { el.innerHTML = el.children[0].outerHTML + osiaChatHTML(); el.scrollTop = el.scrollHeight; } }

function osiaKey(ev) { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); osiaSend(); } }
window.osiaKey = osiaKey;
function osiaNueva() { OSIA.chat = []; OSIA.sessionId = null; OSIA.busy = false; OSIA.stage = 'chat'; OSIA.ficha = {}; OSIA.progreso = 0; OSIA.promptPack = null; osRender(); }
window.osiaNueva = osiaNueva;

async function osiaSend() {
  const inp = document.getElementById('osia-inp');
  const msg = inp ? inp.value.trim() : '';
  if (!msg || OSIA.busy) return;
  inp.value = '';
  await osiaSendMsg(msg, 'pensando…');
}
window.osiaSend = osiaSend;

async function osiaSendMsg(msg, busyMsg) {
  if (OSIA.busy) return;
  OSIA.chat.push({ role: 'user', content: msg });
  OSIA.busy = true; OSIA.busyMsg = busyMsg || 'pensando…'; osiaPaintChat();
  try {
    const { data: sess } = await sb.auth.getSession();
    const token = sess && sess.session && sess.session.access_token;
    if (!token) throw new Error('Sesión expirada — recargá y logueate de nuevo.');
    const res = await fetch(window.SUPABASE_URL + '/functions/v1/ia-builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ session_id: OSIA.sessionId, message: msg }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error(j.error || ('Error ' + res.status));
    OSIA.sessionId = j.session_id || OSIA.sessionId;
    OSIA.busy = false;
    if (j.action === 'ask') {
      OSIA.ficha = j.ficha || OSIA.ficha; OSIA.progreso = j.progreso ?? OSIA.progreso; OSIA.stage = 'chat'; OSIA.promptPack = null;
      OSIA.chat.push({ role: 'assistant', content: j.texto });
      osRender();
    } else if (j.action === 'prompt') {
      OSIA.ficha = j.ficha || OSIA.ficha; OSIA.progreso = j.progreso ?? 10; OSIA.stage = 'prompt';
      OSIA.promptPack = { titulo: j.titulo, carril: j.carril, pasos: j.pasos || [], resumen: j.resumen, prompt: j.prompt };
      OSIA.chat.push({ role: 'assistant', content: j.texto, spec: j.carril === 'ok' });
      await osiaReloadData(); osRender();
    } else if (j.action === 'spec') { // compat
      OSIA.stage = 'chat'; OSIA.promptPack = null; OSIA.sessionId = null;
      OSIA.chat.push({ role: 'assistant', content: j.texto, spec: true });
      await osiaReloadData(); osRender();
    } else { osRender(); }
  } catch (e) {
    OSIA.busy = false;
    OSIA.chat.push({ role: 'err', content: osIcon('alert') + (e.message || String(e)) });
    osiaPaintChat();
  }
  const el = document.getElementById('osia-inp'); if (el) el.focus();
}

// Dictado por voz
function osiaVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const btn = document.getElementById('osia-mic');
  if (OSIA._rec) { try { OSIA._rec.stop(); } catch (e) {} OSIA._rec = null; if (btn) btn.classList.remove('rec'); return; }
  const rec = new SR(); rec.lang = 'es-MX'; rec.continuous = true; rec.interimResults = false;
  rec.onresult = ev => { let t = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript; const el = document.getElementById('osia-inp'); if (el && t) el.value = (el.value ? el.value + ' ' : '') + t.trim(); };
  rec.onend = () => { OSIA._rec = null; const b = document.getElementById('osia-mic'); if (b) b.classList.remove('rec'); };
  rec.onerror = rec.onend;
  OSIA._rec = rec; if (btn) btn.classList.add('rec');
  try { rec.start(); } catch (e) { OSIA._rec = null; if (btn) btn.classList.remove('rec'); }
}
window.osiaVoice = osiaVoice;

// ═══ 2) GALERÍA ═══
function osiaGaleria() {
  const areas = ['', ...new Set(OSIA.arts.map(a => a.area).filter(Boolean))];
  const filtro = '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">' +
    '<input class="osia-in" style="flex:1;min-width:200px;padding:9px 12px" placeholder="Buscar artefacto…" value="' + osiaE(OSIA.q) + '" oninput="osiaSetQ(this.value)">' +
    '<select class="osia-in" style="padding:9px 12px" onchange="osiaSetArea(this.value)">' + areas.map(a => '<option value="' + osiaE(a) + '" ' + (OSIA.fArea === a ? 'selected' : '') + '>' + (a ? osiaE(a) : 'Todas las áreas') + '</option>').join('') + '</select></div>';
  return filtro + '<div id="osia-gal-list">' + osiaGalList() + '</div>';
}

function osiaGalList() {
  const q = (OSIA.q || '').toLowerCase();
  const list = OSIA.arts
    .filter(a => !OSIA.fArea || a.area === OSIA.fArea)
    .filter(a => !q || ((a.titulo || '') + ' ' + (a.descripcion || '')).toLowerCase().includes(q));
  if (!list.length) return '<div class="empty"><div style="font-size:34px">' + osIcon('image') + '</div><div style="margin-top:8px">Todavía no hay artefactos' + (q || OSIA.fArea ? ' con ese filtro' : '') + '. Creá el primero en ' + osIcon('factory') + ' Crear.</div></div>';
  const card = a => '<div class="card"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
    (a.tipo ? '<span class="badge b-ok">' + (OSIA_TIPO_LBL[a.tipo] || a.tipo) + '</span>' : '') +
    (a.area ? '<span class="badge b-warn">' + osiaE(a.area) + '</span>' : '') +
    '<span class="meta" style="margin-left:auto">' + osiaFecha(a.creado_at) + '</span></div>' +
    '<div style="font-size:15px;font-weight:700;margin-top:10px">' + osiaE(a.titulo) + '</div>' +
    (a.descripcion ? '<div class="meta" style="margin-top:6px">' + osiaE(a.descripcion) + '</div>' : '') +
    (a.solicitante ? '<div class="meta" style="margin-top:4px">pedido por ' + osiaE(a.solicitante) + '</div>' : '') +
    '<div style="display:flex;gap:12px;margin-top:12px"><span class="go" style="cursor:pointer;margin-top:0" onclick="osiaAbrir(\'' + a.id + '\')">' + osIcon('play') + ' Abrir</span>' +
    '<span class="go" style="cursor:pointer;margin-top:0" onclick="osiaInstructivo(\'' + a.id + '\')">' + osIcon('book') + ' Instructivo</span></div>';
  return '<div class="grid k3" style="align-items:start">' + list.map(a => card(a) + '</div>').join('') + '</div>';
}
function osiaSetQ(v) { OSIA.q = v; const el = document.getElementById('osia-gal-list'); if (el) el.innerHTML = osiaGalList(); }
window.osiaSetQ = osiaSetQ;
function osiaSetArea(v) { OSIA.fArea = v; const el = document.getElementById('osia-gal-list'); if (el) el.innerHTML = osiaGalList(); }
window.osiaSetArea = osiaSetArea;

// Modal genérico (iframe sandbox o documento de texto)
function osiaModalHtml(titulo, html, docText) {
  osiaCSS(); osiaCerrar();
  const wrap = document.createElement('div'); wrap.className = 'osia-frame-wrap'; wrap.id = 'osia-frame-wrap';
  wrap.addEventListener('click', ev => { if (ev.target === wrap) osiaCerrar(); });
  const box = document.createElement('div'); box.className = 'osia-frame-box';
  const hd = document.createElement('div'); hd.className = 'osia-frame-hd';
  hd.innerHTML = '<span>' + osIcon('factory') + ' ' + osiaE(titulo) + '</span>' + (docText ? '' : '<span class="meta" style="font-weight:400">sandbox aislado</span>');
  const x = document.createElement('button'); x.className = 'x'; x.textContent = '✕ Cerrar'; x.onclick = osiaCerrar;
  hd.appendChild(x); box.appendChild(hd);
  if (docText) { const d = document.createElement('div'); d.className = 'osia-doc'; d.textContent = docText; box.appendChild(d); }
  else { const fr = document.createElement('iframe'); fr.setAttribute('sandbox', 'allow-scripts'); fr.srcdoc = html; box.appendChild(fr); }
  wrap.appendChild(box);
  const root = document.getElementById('os-root') || document.body; root.appendChild(wrap);
}
function osiaCerrar() { const w = document.getElementById('osia-frame-wrap'); if (w) w.remove(); }
window.osiaCerrar = osiaCerrar;

async function osiaAbrir(id) {
  const meta = OSIA.arts.find(a => a.id === id) || {};
  const { data } = await sb.from('ia_artifacts').select('html,ruta,titulo,carril,ficha_json,aprobado_por').eq('id', id).maybeSingle();
  let html = (data && data.html) || ((OSIA._lastHtml && OSIA._lastHtml.id === id) ? OSIA._lastHtml.html : null);
  if (!html && data && data.ruta) { if (/^https?:/i.test(data.ruta)) window.open(data.ruta, '_blank'); else osNav(data.ruta); return; }
  if (!html) { if (window.toast) toast('Este artefacto no tiene contenido para abrir', 'error'); return; }
  // N8 · carril DATOS-LECTURA: la data whitelisted se trae ACÁ (con la sesión del usuario → su RLS)
  // y se inyecta en el iframe como window.__IA_DATA__ — el sandbox nunca ve un token.
  if (data && data.carril === 'datos') {
    if (!data.aprobado_por) {
      const admin = confirm('Este artefacto lee DATOS y todavía no tiene el OK de un admin.\n¿Sos admin y querés aprobarlo ahora?');
      if (admin) {
        const { error } = await sb.rpc('ia_aprobar_artifact', { aid: id });
        if (error) { if (window.toast) toast('No se pudo aprobar: ' + error.message, 'error'); return; }
        if (window.toast) toast('Aprobado — queda en el audit log');
      } else return;
    }
    const recursos = (data.ficha_json && (data.ficha_json.recursos || data.ficha_json.data_recursos)) || [];
    const pack = {};
    for (const rec of recursos) {
      try {
        const { data: r, error } = await sb.functions.invoke('ia-data', { body: { artifact_id: id, recurso: rec } });
        pack[rec] = error ? { error: error.message } : (r && r.data) || [];
      } catch (e) { pack[rec] = { error: String(e && e.message || e) }; }
    }
    html = '<script>window.__IA_DATA__=' + JSON.stringify(pack).replace(/</g, '\\u003c') + ';</script>' + html;
  }
  osiaModalHtml((meta.titulo || (data && data.titulo) || 'Artefacto') + (data && data.carril === 'datos' ? ' · datos read-only' : ''), html);
}
window.osiaAbrir = osiaAbrir;

async function osiaInstructivo(id) {
  const meta = OSIA.arts.find(a => a.id === id) || {};
  const { data } = await sb.from('ia_artifacts').select('instructivo,descripcion').eq('id', id).maybeSingle();
  const txt = (data && data.instructivo) || (data && data.descripcion) || 'Este artefacto no tiene instructivo cargado.';
  osiaModalHtml('Instructivo · ' + (meta.titulo || ''), '', txt);
}
window.osiaInstructivo = osiaInstructivo;

// ═══ 3) PENDIENTES DE OK (gestores) ═══
function osiaPendientes() {
  const rows = OSIA.specs;
  if (!rows.length) return '<div class="empty"><div style="font-size:34px">' + osIcon('inbox') + '</div><div style="margin-top:8px">Sin specs. Cuando un pedido toque datos reales, el prompt completo cae acá para tu OK.</div></div>';
  const row = s => '<div class="card" style="margin-bottom:14px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
    '<span class="badge ' + (OSIA_SPEC_CLS[s.estado] || 'b-warn') + '">' + osiaE(s.estado) + '</span>' +
    (s.area ? '<span class="badge b-warn">' + osiaE(s.area) + '</span>' : '') +
    '<span class="meta">' + osiaFecha(s.creado_at) + ' · ' + osiaE(s.solicitante || '—') + '</span>' +
    '<span style="margin-left:auto;display:flex;gap:6px">' +
    '<select class="osia-in" id="osia-se-' + s.id + '">' + OSIA_SPEC_ESTADOS.map(e => '<option value="' + e + '" ' + (s.estado === e ? 'selected' : '') + '>' + e + '</option>').join('') + '</select>' +
    '<button class="cbtn" style="padding:5px 11px" onclick="osiaSpecSave(\'' + s.id + '\')">' + osIcon('save') + '</button>' +
    '<button class="ibtn" style="height:28px;padding:0 10px" onclick="osiaSpecCopy(\'' + s.id + '\')" title="Copiar prompt completo">' + osIcon('clipboard') + ' Prompt</button></span></div>' +
    '<div style="font-size:14.5px;font-weight:700;margin-top:9px">' + osiaE(s.titulo) + '</div>' +
    (s.motivo ? '<div class="meta" style="margin-top:4px">' + osIcon('lock') + ' ' + osiaE(s.motivo) + '</div>' : '') +
    '<div class="osia-spec-pre" style="margin-top:9px">' + osiaE(s.prompt_completo || '') + '</div>' +
    '<input class="osia-in" id="osia-sn-' + s.id + '" value="' + osiaE(s.nota || '') + '" placeholder="Nota (qué se decidió / dónde quedó construido)" style="margin-top:9px;width:100%">' +
    '</div>';
  return '<div class="meta" style="margin-bottom:12px">Cada spec es el prompt COMPLETO para construir el artefacto (copiable → Claude Code). Nada se ejecuta solo: siempre lo construye y aprueba un humano.</div>' + rows.map(row).join('');
}

async function osiaSpecSave(id) {
  const est = document.getElementById('osia-se-' + id), nota = document.getElementById('osia-sn-' + id);
  const { error } = await sb.from('ia_specs').update({ estado: est ? est.value : 'pendiente', nota: nota ? (nota.value || null) : null }).eq('id', id);
  if (error) { if (window.toast) toast('Error: ' + error.message, 'error'); else alert(error.message); return; }
  if (window.toast) toast('Spec actualizado', 'success');
  await osiaReloadData(); osRender();
}
window.osiaSpecSave = osiaSpecSave;

async function osiaSpecCopy(id) {
  const s = OSIA.specs.find(x => x.id === id); if (!s) return;
  const txt = '# ' + s.titulo + '\nÁrea: ' + (s.area || '—') + ' · Solicitante: ' + (s.solicitante || '—') + '\nMotivo carril OK: ' + (s.motivo || '—') + '\n\n' + (s.prompt_completo || '');
  try { await navigator.clipboard.writeText(txt); if (window.toast) toast('Prompt copiado ', 'success'); } catch (e) { prompt('Copiá el prompt:', txt); }
}
window.osiaSpecCopy = osiaSpecCopy;
