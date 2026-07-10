// ════════════════════════════════════════════════════════════════
// 🏭 DEPARTAMENTO IA v2 — FÁBRICA DE HERRAMIENTAS (ruta /ia del OS).
// Chat con la edge function `ia-builder` (Claude en vivo): entrevista al
// empleado y resuelve por 2 carriles — LIBRE publica un HTML autocontenido
// al instante en la Galería; CON OK guarda un spec pendiente (ia_specs) que
// construye un humano después. NUNCA auto-toca producción.
// Seguridad de render: <iframe sandbox="allow-scripts"> SIN allow-same-origin
// (origen opaco: sin localStorage/cookies/sesión, sin DOM del padre).
// ⚠ NAMESPACE: OSIA/osia* — el prefijo IA/ia* lo ocupa os/inv-admin.js.
// ════════════════════════════════════════════════════════════════
const OSIA = { loaded: false, loading: false, err: null, arts: [], specs: [], tab: 'crear', q: '', fArea: '', me: '', chat: [], sessionId: null, busy: false, _rec: null };
window.OSIA = OSIA;

const OSIA_TIPO_LBL = { prompt: '💬 Prompt', dashboard: '📊 Calculadora', agente: '🤖 Asistente', automatizacion: '⚡ Automatización' };
const OSIA_SPEC_ESTADOS = ['pendiente', 'aprobado', 'construido', 'descartado'];
const OSIA_SPEC_CLS = { pendiente: 'b-warn', aprobado: 'b-ok', construido: 'b-ok', descartado: 'b-red' };

function osiaE(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function osiaCanManage() { return window.osCanArea ? osCanArea('ia') : false; }
function osiaFecha(ts) { try { return new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }); } catch (e) { return ''; } }

// ─── CSS propio ───
function osiaCSS() {
  if (document.getElementById('osia-styles')) return;
  const st = document.createElement('style'); st.id = 'osia-styles';
  st.textContent = `
  #os-root .osia-tabs{display:flex;gap:8px;margin:6px 0 18px;flex-wrap:wrap}
  #os-root .osia-tab{background:var(--glass);border:1px solid var(--glassb);color:var(--mut);padding:8px 16px;border-radius:11px;cursor:pointer;font-size:12.5px;font-weight:600}
  #os-root .osia-tab:hover{color:var(--ink);border-color:var(--a2)}
  #os-root .osia-tab.on{color:var(--ink);border-color:var(--a2);background:linear-gradient(135deg,rgba(69,227,198,.12),rgba(79,141,255,.1))}
  #os-root .osia-chat{display:flex;flex-direction:column;gap:10px;max-height:52vh;overflow-y:auto;padding:4px 2px}
  #os-root .osia-b{max-width:86%;padding:11px 14px;border-radius:13px;font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
  #os-root .osia-b.u{align-self:flex-end;background:linear-gradient(135deg,rgba(69,227,198,.16),rgba(79,141,255,.14));border:1px solid rgba(79,141,255,.3)}
  #os-root .osia-b.a{align-self:flex-start;background:var(--glass);border:1px solid var(--glassb)}
  #os-root .osia-b.think{color:var(--mut2);font-style:italic;align-self:flex-start}
  #os-root .osia-b.err{align-self:flex-start;border:1px solid rgba(240,104,122,.4);color:var(--neg);background:var(--glass)}
  #os-root .osia-ask{display:flex;gap:8px;margin-top:12px}
  #os-root .osia-ask textarea{flex:1;background:var(--glass);border:1px solid var(--glassb);border-radius:11px;padding:11px 14px;color:var(--ink);font-size:13px;outline:none;font-family:inherit;resize:none;min-height:44px;max-height:120px;line-height:1.4}
  #os-root .osia-ask textarea:focus{border-color:var(--a2)}
  #os-root .osia-mic{background:var(--glass);border:1px solid var(--glassb);border-radius:10px;cursor:pointer;font-size:15px;padding:0 12px;color:var(--ink)}
  #os-root .osia-mic.rec{border-color:var(--neg);animation:osiapulse 1s infinite}
  @keyframes osiapulse{50%{opacity:.5}}
  #os-root .osia-in{background:var(--glass);border:1px solid var(--glassb);border-radius:8px;padding:6px 9px;color:var(--ink);font-size:11.5px;outline:none;font-family:inherit;max-width:100%}
  #os-root .osia-frame-wrap{position:fixed;inset:0;z-index:1200;background:rgba(4,6,10,.72);display:flex;align-items:center;justify-content:center;padding:26px}
  #os-root .osia-frame-box{background:#fff;border-radius:14px;width:min(1080px,96vw);height:min(760px,92vh);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 40px 90px -30px rgba(0,0,0,.8)}
  #os-root .osia-frame-hd{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#f1f5fb;border-bottom:1px solid #dfe6f0;color:#0f1c2e;font-size:13px;font-weight:700}
  #os-root .osia-frame-hd .x{margin-left:auto;cursor:pointer;border:none;background:#e3e9f3;border-radius:8px;padding:5px 12px;font-size:12px;color:#0f1c2e}
  #os-root .osia-frame-box iframe{flex:1;border:none;width:100%;background:#fff}
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

function osiaGo(tab) {
  OSIA.tab = tab;
  const path = tab === 'crear' ? '/ia' : '/ia/' + tab;
  if (location.pathname.replace(/\/+$/, '') !== path) { osNav(path); } else { osRender(); }
}
window.osiaGo = osiaGo;

// ─── VISTA (la despacha osEmpresa de os.js) ───
function osiaView() {
  osiaCSS();
  if (OSIA.tab === 'pedir' || OSIA.tab === 'bandeja') OSIA.tab = OSIA.tab === 'bandeja' ? 'pendientes' : 'crear'; // rutas v1
  const tab = OSIA.tab;
  if (!OSIA.loaded && !OSIA.loading && !OSIA.err) osiaLoad();
  const mgr = osiaCanManage();
  const nPend = OSIA.specs.filter(s => s.estado === 'pendiente').length;
  const tabBtn = (k, lbl) => '<button class="osia-tab ' + (tab === k ? 'on' : '') + '" onclick="osiaGo(\'' + k + '\')">' + lbl + '</button>';
  let body;
  if (OSIA.err) body = '<div class="empty"><div style="font-size:34px">⚠️</div><div class="down" style="margin-top:8px">' + osiaE(OSIA.err) + '</div></div>';
  else if (!OSIA.loaded) body = '<div class="empty">⏳ Cargando la fábrica de herramientas…</div>';
  else body = tab === 'galeria' ? osiaGaleria() : tab === 'pendientes' ? (mgr ? osiaPendientes() : osiaNoAccess()) : osiaCrear();
  return '<h1>🏭 IA <span>· Fábrica de herramientas</span></h1><div class="sub">Contale a la IA qué tarea querés resolver: te entrevista y construye la herramienta al instante — o la deja lista para aprobación si toca datos reales.</div>' +
    '<div class="osia-tabs">' + tabBtn('crear', '🏭 Crear') + tabBtn('galeria', '🖼 Galería (' + OSIA.arts.length + ')') + (mgr ? tabBtn('pendientes', '📥 Pendientes de OK' + (nPend ? ' (' + nPend + ')' : '')) : '') + '</div>' + body;
}
window.osiaView = osiaView;

function osiaNoAccess() {
  return '<div class="empty"><div style="font-size:34px">🔒</div><div style="margin-top:8px">Los pendientes de OK son para gestores del área IA (o admins).</div></div>';
}

// ═══ 1) CREAR — chat con ia-builder ═══
function osiaCrear() {
  const hasVoice = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const micBtn = hasVoice ? '<button type="button" class="osia-mic" id="osia-mic" onclick="osiaVoice()" title="Dictar por voz">🎤</button>' : '';
  const hello = '<div class="osia-b a">¡Hola! Soy el builder del equipo. Contame qué tarea hacés (o querés dejar de hacer) y te armo una herramienta.\n\nEj: "cada semana calculo a mano cuánto le toca a cada trabajador" · "necesito un checklist de inspección de obra" · "quiero un generador de mensajes de cobro".</div>';
  const nueva = OSIA.chat.length ? '<button class="ibtn" style="margin-left:auto" onclick="osiaNueva()">＋ Nueva conversación</button>' : '';
  return '<div class="grid k2" style="align-items:start;grid-template-columns:1.6fr 1fr">' +
    '<div class="card"><div class="chart-h"><div class="t">🏭 Construí tu herramienta</div>' + nueva + '</div>' +
    '<div class="osia-chat" id="osia-chat">' + hello + osiaChatHTML() + '</div>' +
    '<div class="osia-ask"><textarea id="osia-inp" placeholder="Describí la tarea… (Enter envía, Shift+Enter salto de línea)" onkeydown="osiaKey(event)"></textarea>' + micBtn + '<button class="cbtn" style="padding:0 18px" onclick="osiaSend()">Enviar</button></div></div>' +
    '<div class="card"><div class="chart-h"><div class="t">Cómo funciona</div></div>' +
    '<div class="kv"><span>1 · Contás la tarea</span><b>con tus palabras' + (hasVoice ? ' o por voz 🎤' : '') + '</b></div>' +
    '<div class="kv"><span>2 · La IA te entrevista</span><b>4-5 preguntas cortas</b></div>' +
    '<div class="kv"><span>3a · Herramienta libre</span><b>se publica al instante 🖼</b></div>' +
    '<div class="kv"><span>3b · Toca datos reales</span><b>🔒 queda para OK del admin</b></div>' +
    '<div class="meta" style="margin-top:12px">Carril libre = calculadoras, generadores de documentos, checklists, plantillas (los datos los ingresás vos). Todo lo que toque plata, Airtable, pagos o mensajes a terceros NUNCA se auto-construye: queda como spec pendiente de aprobación.</div></div></div>';
}

function osiaChatHTML() {
  return OSIA.chat.map(m => {
    if (m.role === 'user') return '<div class="osia-b u">' + osiaE(m.content) + '</div>';
    if (m.role === 'err') return '<div class="osia-b err">' + osiaE(m.content) + '</div>';
    let extra = '';
    if (m.artifact) extra = '<div style="margin-top:9px"><button class="cbtn" style="padding:7px 14px" onclick="osiaAbrir(\'' + m.artifact.id + '\')">▶ Abrir "' + osiaE(m.artifact.titulo) + '"</button> <button class="ibtn" style="height:30px;padding:0 12px" onclick="osiaGo(\'galeria\')">Ver en Galería →</button></div>';
    if (m.spec) extra = '<div style="margin-top:8px"><span class="badge b-warn">🔒 pendiente de OK del admin</span></div>';
    return '<div class="osia-b a">' + osiaE(m.content) + extra + '</div>';
  }).join('') + (OSIA.busy ? '<div class="osia-b think" id="osia-think">⏳ pensando / construyendo…</div>' : '');
}
function osiaPaintChat() { const el = document.getElementById('osia-chat'); if (el) { el.innerHTML = el.children[0].outerHTML + osiaChatHTML(); el.scrollTop = el.scrollHeight; } }

function osiaKey(ev) { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); osiaSend(); } }
window.osiaKey = osiaKey;
function osiaNueva() { OSIA.chat = []; OSIA.sessionId = null; OSIA.busy = false; osRender(); }
window.osiaNueva = osiaNueva;

async function osiaSend() {
  const inp = document.getElementById('osia-inp');
  const msg = inp ? inp.value.trim() : '';
  if (!msg || OSIA.busy) return;
  inp.value = '';
  OSIA.chat.push({ role: 'user', content: msg });
  OSIA.busy = true; osiaPaintChat();
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
    if (j.action === 'published') {
      OSIA.chat.push({ role: 'assistant', content: j.texto, artifact: j.artifact });
      OSIA.sessionId = null; // sesión cerrada
      await osiaReloadData();
      if (j.artifact && j.artifact.html) { OSIA._lastHtml = { id: j.artifact.id, titulo: j.artifact.titulo, html: j.artifact.html }; }
    } else if (j.action === 'spec') {
      OSIA.chat.push({ role: 'assistant', content: j.texto, spec: true });
      OSIA.sessionId = null;
      await osiaReloadData();
    } else {
      OSIA.chat.push({ role: 'assistant', content: j.texto });
    }
  } catch (e) {
    OSIA.chat.push({ role: 'err', content: '⚠️ ' + (e.message || String(e)) });
  }
  OSIA.busy = false; osiaPaintChat();
  const el = document.getElementById('osia-inp'); if (el) el.focus();
}
window.osiaSend = osiaSend;

async function osiaReloadData() {
  const [ar, sp] = await Promise.all([
    sb.from('ia_artifacts').select('id,titulo,area,tipo,descripcion,ruta,carril,solicitante,creado_at,activo').eq('activo', true).order('creado_at', { ascending: false }),
    sb.from('ia_specs').select('*').eq('activo', true).order('creado_at', { ascending: false }),
  ]);
  OSIA.arts = ar.data || OSIA.arts; OSIA.specs = sp.data || OSIA.specs;
}

// Dictado por voz (Web Speech API)
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
    '<input class="osia-in" style="flex:1;min-width:200px;padding:9px 12px" placeholder="🔎 Buscar herramienta…" value="' + osiaE(OSIA.q) + '" oninput="osiaSetQ(this.value)">' +
    '<select class="osia-in" style="padding:9px 12px" onchange="osiaSetArea(this.value)">' + areas.map(a => '<option value="' + osiaE(a) + '" ' + (OSIA.fArea === a ? 'selected' : '') + '>' + (a ? osiaE(a) : 'Todas las áreas') + '</option>').join('') + '</select></div>';
  return filtro + '<div id="osia-gal-list">' + osiaGalList() + '</div>';
}

function osiaGalList() {
  const q = (OSIA.q || '').toLowerCase();
  const list = OSIA.arts
    .filter(a => !OSIA.fArea || a.area === OSIA.fArea)
    .filter(a => !q || ((a.titulo || '') + ' ' + (a.descripcion || '')).toLowerCase().includes(q));
  if (!list.length) return '<div class="empty"><div style="font-size:34px">🖼</div><div style="margin-top:8px">Todavía no hay herramientas' + (q || OSIA.fArea ? ' con ese filtro' : '') + '. Creá la primera en 🏭 Crear.</div></div>';
  const card = a => '<div class="card"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
    (a.tipo ? '<span class="badge b-ok">' + (OSIA_TIPO_LBL[a.tipo] || a.tipo) + '</span>' : '') +
    (a.area ? '<span class="badge b-warn">' + osiaE(a.area) + '</span>' : '') +
    '<span class="meta" style="margin-left:auto">' + osiaFecha(a.creado_at) + '</span></div>' +
    '<div style="font-size:15px;font-weight:700;margin-top:10px">' + osiaE(a.titulo) + '</div>' +
    (a.descripcion ? '<div class="meta" style="margin-top:6px">' + osiaE(a.descripcion) + '</div>' : '') +
    (a.solicitante ? '<div class="meta" style="margin-top:4px">pedida por ' + osiaE(a.solicitante) + '</div>' : '') +
    '<div class="go" style="cursor:pointer" onclick="osiaAbrir(\'' + a.id + '\')">▶ Abrir herramienta</div>';
  return '<div class="grid k3" style="align-items:start">' + list.map(a => card(a) + '</div>').join('') + '</div>';
}
function osiaSetQ(v) { OSIA.q = v; const el = document.getElementById('osia-gal-list'); if (el) el.innerHTML = osiaGalList(); }
window.osiaSetQ = osiaSetQ;
function osiaSetArea(v) { OSIA.fArea = v; const el = document.getElementById('osia-gal-list'); if (el) el.innerHTML = osiaGalList(); }
window.osiaSetArea = osiaSetArea;

// Abrir artefacto: html → iframe SANDBOX (allow-scripts, SIN allow-same-origin);
// legacy con `ruta` → navegar/abrir link.
async function osiaAbrir(id) {
  const meta = OSIA.arts.find(a => a.id === id) || {};
  let html = (OSIA._lastHtml && OSIA._lastHtml.id === id) ? OSIA._lastHtml.html : null;
  if (!html) {
    const { data } = await sb.from('ia_artifacts').select('html,ruta,titulo').eq('id', id).maybeSingle();
    if (data && data.html) html = data.html;
    else if (data && data.ruta) { if (/^https?:/i.test(data.ruta)) window.open(data.ruta, '_blank'); else osNav(data.ruta); return; }
  }
  if (!html) { if (window.toast) toast('Este artefacto no tiene contenido para abrir', 'error'); return; }
  osiaCSS();
  const wrap = document.createElement('div'); wrap.className = 'osia-frame-wrap'; wrap.id = 'osia-frame-wrap';
  wrap.addEventListener('click', ev => { if (ev.target === wrap) osiaCerrar(); });
  const box = document.createElement('div'); box.className = 'osia-frame-box';
  const hd = document.createElement('div'); hd.className = 'osia-frame-hd';
  hd.innerHTML = '<span>🏭 ' + osiaE(meta.titulo || 'Herramienta') + '</span><span class="meta" style="font-weight:400">sandbox aislado</span>';
  const x = document.createElement('button'); x.className = 'x'; x.textContent = '✕ Cerrar'; x.onclick = osiaCerrar;
  hd.appendChild(x);
  const fr = document.createElement('iframe');
  fr.setAttribute('sandbox', 'allow-scripts'); // SIN allow-same-origin: origen opaco, sin storage/cookies/sesión, sin DOM padre
  fr.srcdoc = html;
  box.appendChild(hd); box.appendChild(fr); wrap.appendChild(box);
  const root = document.getElementById('os-root') || document.body; root.appendChild(wrap);
}
window.osiaAbrir = osiaAbrir;
function osiaCerrar() { const w = document.getElementById('osia-frame-wrap'); if (w) w.remove(); }
window.osiaCerrar = osiaCerrar;

// ═══ 3) PENDIENTES DE OK (gestores) ═══
function osiaPendientes() {
  const rows = OSIA.specs;
  if (!rows.length) return '<div class="empty"><div style="font-size:34px">📥</div><div style="margin-top:8px">Sin specs. Cuando un pedido toque datos reales, el prompt completo cae acá para tu OK.</div></div>';
  const row = s => '<div class="card" style="margin-bottom:14px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
    '<span class="badge ' + (OSIA_SPEC_CLS[s.estado] || 'b-warn') + '">' + osiaE(s.estado) + '</span>' +
    (s.area ? '<span class="badge b-warn">' + osiaE(s.area) + '</span>' : '') +
    '<span class="meta">' + osiaFecha(s.creado_at) + ' · ' + osiaE(s.solicitante || '—') + '</span>' +
    '<span style="margin-left:auto;display:flex;gap:6px">' +
    '<select class="osia-in" id="osia-se-' + s.id + '">' + OSIA_SPEC_ESTADOS.map(e => '<option value="' + e + '" ' + (s.estado === e ? 'selected' : '') + '>' + e + '</option>').join('') + '</select>' +
    '<button class="cbtn" style="padding:5px 11px" onclick="osiaSpecSave(\'' + s.id + '\')">💾</button>' +
    '<button class="ibtn" style="height:28px;padding:0 10px" onclick="osiaSpecCopy(\'' + s.id + '\')" title="Copiar prompt completo">📋 Prompt</button></span></div>' +
    '<div style="font-size:14.5px;font-weight:700;margin-top:9px">' + osiaE(s.titulo) + '</div>' +
    (s.motivo ? '<div class="meta" style="margin-top:4px">🔒 ' + osiaE(s.motivo) + '</div>' : '') +
    '<div class="osia-spec-pre" style="margin-top:9px">' + osiaE(s.prompt_completo || '') + '</div>' +
    '<input class="osia-in" id="osia-sn-' + s.id + '" value="' + osiaE(s.nota || '') + '" placeholder="Nota (qué se decidió / dónde quedó construido)" style="margin-top:9px;width:100%">' +
    '</div>';
  return '<div class="meta" style="margin-bottom:12px">Cada spec es el prompt COMPLETO para construir la herramienta (copiable → Claude Code). Nada de esto se ejecuta solo: siempre lo construye y aprueba un humano.</div>' + rows.map(row).join('');
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
  try { await navigator.clipboard.writeText(txt); if (window.toast) toast('Prompt copiado 📋', 'success'); } catch (e) { prompt('Copiá el prompt:', txt); }
}
window.osiaSpecCopy = osiaSpecCopy;
