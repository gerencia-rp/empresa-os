// ════════════════════════════════════════════════════════════════
// 🛰 COMMAND CENTER (JARVIS) — /jarvis · SOLO ADMIN (dueño).
// Módulo autocontenido (pilar #3): UI + lógica + datos acá adentro.
// Referencia visual: command-center-JARVIS.html (azabache, grilla holográfica,
// orbe cian que respira = Cerebro Ejecutivo, task lanes Kanban).
//
// Datos (SOLO LECTURA + aprobar/rechazar, human-in-the-loop):
//   · agent_registry     → red de agentes (nombre, proceso, riesgo, estado, dueño)
//   · agent_proposals    → task lanes (Propuesta/Aprobada/Ejecutada/Alertas)
//   · agent_audit_log    → última corrida por agente + feed de bitácora
//   · /api/brain-chat    → Cerebro Ejecutivo (lenguaje natural sobre el día)
//
// Escrituras (las ÚNICAS): Aprobar/Rechazar = UPDATE agent_proposals.estado
//   + approved_by = mi email + INSERT en agent_audit_log con mi nombre.
//   NUNCA ejecuta acciones de negocio: todo lo decide un humano (yo).
//
// Namespace JV / jv* (evita colisión con OSA/IA/INF/etc; verificar con build.mjs).
// Guard: el router (osRouteGuard) ya bloquea /jarvis a no-admin; doble-check acá.
// ════════════════════════════════════════════════════════════════

const JV = {
  loaded: false, loading: false, err: null,
  agents: [], props: [], lastRun: {}, // lastRun: { agent_id: ts }
  audit: [], busyId: null,
  chat: [], chatBusy: false,
};
window.JV = JV;

// ─── helpers ───
function jvRole() { try { return (state && state.role) || 'viewer'; } catch (e) { return 'viewer'; } }
function jvMe() {
  try {
    const u = state && state.user;
    return (u && (u.email || u.user_metadata && u.user_metadata.full_name)) || 'admin';
  } catch (e) { return 'admin'; }
}
function jvNum(n) { return (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('es-MX'); }
function jvAgentName(id) { const a = JV.agents.find(x => x.id === id); return a ? a.nombre : 'Agente'; }
function jvAgentIcon(a) {
  const p = ((a && (a.proceso || '') + ' ' + (a && a.nombre || ''))).toLowerCase();
  if (p.indexOf('cobr') >= 0) return 'banknote';
  if (p.indexOf('concili') >= 0 || p.indexOf('contab') >= 0 || p.indexOf('sabueso') >= 0) return 'notebook';
  if (p.indexOf('audit') >= 0 || p.indexOf('integr') >= 0 || p.indexOf('dato') >= 0) return 'search';
  if (p.indexOf('coordin') >= 0 || p.indexOf('plan') >= 0 || p.indexOf('cronog') >= 0) return 'calendar';
  if (p.indexOf('calidad') >= 0 || p.indexOf('tiempo') >= 0) return 'chart';
  if (p.indexOf('líder') >= 0 || p.indexOf('lider') >= 0 || p.indexOf('matutino') >= 0) return 'sparkles';
  return 'bot';
}
// evidencia es jsonb: puede llegar como string (JSON-encoded) o como objeto.
function jvEvid(p) {
  let e = p && p.evidencia;
  if (e == null) e = p && p.payload;
  if (e == null) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'object') return e.detalle || e.titulo || e.mensaje || e.texto || JSON.stringify(e);
  return String(e);
}
function jvFmtTs(ts) {
  if (!ts) return 'sin corridas';
  const d = new Date(ts); const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return 'hace ' + min + ' min';
  const h = Math.floor(min / 60); if (h < 24) return 'hace ' + h + ' h';
  const days = Math.floor(h / 24); return 'hace ' + days + ' d';
}

// ─── CSS (scopeado a #os-root .jv-*, sobre los tokens del OS + glow cian) ───
function jvCSS() {
  if (document.getElementById('jv-styles')) return;
  const st = document.createElement('style'); st.id = 'jv-styles';
  st.textContent = [
    '#os-root .jv{--cyan:#42e8ff;--cyan-dim:#1f6f8a;--grn:#3ddc84;--yel:#f5c451;--red:#ff5d6c;--purple:#b78cff;position:relative}',
    '#os-root .jv-grid{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(66,232,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(66,232,255,.05) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:radial-gradient(circle at 50% 26%,#000 0%,transparent 68%);mask-image:radial-gradient(circle at 50% 26%,#000 0%,transparent 68%)}',
    '#os-root .jv-in{position:relative;z-index:1}',
    '#os-root .jv-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px}',
    '#os-root .jv-hd h1{font-size:19px;letter-spacing:.14em}',
    '#os-root .jv-hd h1 span{background:linear-gradient(120deg,#42e8ff,#b78cff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}',
    '#os-root .jv-pill{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.14em;color:var(--grn);border:1px solid rgba(61,220,132,.3);padding:6px 12px;border-radius:20px;background:rgba(61,220,132,.06)}',
    '#os-root .jv-dot{width:7px;height:7px;border-radius:50%;background:var(--grn);box-shadow:0 0 8px var(--grn);animation:jvpulse 1.8s infinite}',
    '@keyframes jvpulse{0%,100%{opacity:1}50%{opacity:.35}}',
    // KPIs
    '#os-root .jv-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:16px 0 20px}',
    '#os-root .jv-kpi{background:var(--glass);border:1px solid var(--glassb);border-radius:14px;padding:13px 15px;position:relative;overflow:hidden}',
    '#os-root .jv-kpi::after{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#42e8ff,#b78cff)}',
    '#os-root .jv-kpi .n{font-size:22px;font-weight:700;font-family:var(--font-mono,inherit);font-variant-numeric:tabular-nums}',
    '#os-root .jv-kpi .l{font-size:10px;letter-spacing:.1em;color:var(--mut);text-transform:uppercase;margin-top:3px}',
    '#os-root .jv-kpi .s{font-size:10px;color:var(--mut2);margin-top:2px}',
    // ORB
    '#os-root .jv-core{display:flex;flex-direction:column;align-items:center;margin:2px 0 20px}',
    '#os-root .jv-orbw{position:relative;width:180px;height:180px;display:flex;align-items:center;justify-content:center}',
    '#os-root .jv-ring{position:absolute;border-radius:50%}',
    '#os-root .jv-r1{width:180px;height:180px;border:1px solid rgba(66,232,255,.25);animation:jvspin 18s linear infinite}',
    '#os-root .jv-r2{width:144px;height:144px;border:1px dashed rgba(183,140,255,.3);animation:jvspin 12s linear infinite reverse}',
    '#os-root .jv-r3{width:108px;height:108px;border:1px solid rgba(66,232,255,.4)}',
    '@keyframes jvspin{to{transform:rotate(360deg)}}',
    '#os-root .jv-orb{width:88px;height:88px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#8ff6ff,#42e8ff 45%,#1b6bd6 80%,#0a2a66);box-shadow:0 0 60px rgba(66,232,255,.7),inset 0 0 30px rgba(255,255,255,.35);animation:jvbreathe 3.2s ease-in-out infinite}',
    '@keyframes jvbreathe{0%,100%{transform:scale(1);box-shadow:0 0 55px rgba(66,232,255,.55)}50%{transform:scale(1.06);box-shadow:0 0 90px rgba(66,232,255,.9)}}',
    '#os-root .jv-core .t{margin-top:14px;font-size:13px;letter-spacing:.3em;color:var(--cyan)}',
    '#os-root .jv-core .sub{font-size:11px;color:var(--mut);margin-top:3px}',
    '#os-root .jv-bars{display:flex;gap:3px;align-items:flex-end;height:18px;margin-top:10px}',
    '#os-root .jv-bars i{width:3px;background:var(--cyan);border-radius:2px;animation:jveq 1s ease-in-out infinite}',
    '#os-root .jv-bars i:nth-child(2){animation-delay:.15s}#os-root .jv-bars i:nth-child(3){animation-delay:.3s}#os-root .jv-bars i:nth-child(4){animation-delay:.45s}#os-root .jv-bars i:nth-child(5){animation-delay:.6s}',
    '@keyframes jveq{0%,100%{height:5px}50%{height:18px}}',
    // chat
    '#os-root .jv-chatbar{max-width:660px;margin:0 auto 8px;display:flex;gap:10px;align-items:center;background:var(--glass);border:1px solid rgba(66,232,255,.28);border-radius:30px;padding:8px 10px 8px 16px;box-shadow:0 0 30px rgba(66,232,255,.12)}',
    '#os-root .jv-chatbar input{flex:1;background:transparent;border:none;color:var(--ink);font-size:14px;outline:none}',
    '#os-root .jv-chatbar input::placeholder{color:var(--mut2)}',
    '#os-root .jv-send{background:linear-gradient(135deg,#42e8ff,#1b6bd6);color:#04101f;border:none;font-weight:700;padding:9px 16px;border-radius:20px;cursor:pointer;letter-spacing:.05em}',
    '#os-root .jv-send:disabled{opacity:.5;cursor:default}',
    '#os-root .jv-chat{max-width:660px;margin:0 auto 24px}',
    '#os-root .jv-bub{padding:9px 13px;border-radius:12px;margin:7px 0;font-size:13px;line-height:1.5;max-width:88%}',
    '#os-root .jv-bub.u{background:rgba(66,232,255,.12);border:1px solid rgba(66,232,255,.22);margin-left:auto;color:var(--ink)}',
    '#os-root .jv-bub.a{background:var(--glass);border:1px solid var(--glassb);color:var(--ink)}',
    '#os-root .jv-bub.a.err{border-color:rgba(255,93,108,.4);color:var(--neg)}',
    '#os-root .jv-bub.think{color:var(--mut)}',
    // columns
    '#os-root .jv-cols{display:grid;grid-template-columns:1.05fr 1.45fr;gap:16px}',
    '#os-root .jv-st{font-size:11px;letter-spacing:.22em;color:var(--mut);text-transform:uppercase;margin:0 0 11px}',
    // agents
    '#os-root .jv-agent{display:flex;align-items:center;gap:11px;background:var(--glass);border:1px solid var(--glassb);border-radius:12px;padding:11px 13px;margin-bottom:9px}',
    '#os-root .jv-av{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:rgba(66,232,255,.1);border:1px solid rgba(66,232,255,.2);color:var(--cyan)}',
    '#os-root .jv-agent .nm{flex:1;min-width:0}',
    '#os-root .jv-agent .nm b{font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#os-root .jv-agent .nm span{display:block;font-size:10px;letter-spacing:.06em;color:var(--mut2);margin-top:1px}',
    '#os-root .jv-tag{font-size:9.5px;letter-spacing:.06em;padding:3px 8px;border-radius:12px;text-transform:uppercase;white-space:nowrap}',
    '#os-root .jv-t-live{background:rgba(61,220,132,.14);color:var(--grn)}',
    '#os-root .jv-t-dry{background:rgba(245,196,81,.14);color:var(--yel)}',
    '#os-root .jv-risk{font-size:9px;color:var(--mut2);border:1px solid var(--glassb);border-radius:8px;padding:2px 6px;margin-left:6px}',
    // lanes
    '#os-root .jv-lanes{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}',
    '#os-root .jv-lane{background:var(--glass);border:1px solid var(--glassb);border-radius:12px;padding:10px;min-height:120px}',
    '#os-root .jv-lane h4{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--mut);margin-bottom:9px;display:flex;justify-content:space-between}',
    '#os-root .jv-lane h4 b{color:var(--cyan)}',
    '#os-root .jv-card{background:rgba(66,232,255,.05);border:1px solid var(--glassb);border-left:2px solid var(--cyan-dim);border-radius:8px;padding:8px 9px;margin-bottom:8px;font-size:11.5px;line-height:1.45}',
    '#os-root .jv-card.red{border-left-color:var(--red)}#os-root .jv-card.grn{border-left-color:var(--grn)}#os-root .jv-card.yel{border-left-color:var(--yel)}',
    '#os-root .jv-card .who{font-size:9.5px;color:var(--mut2);margin-top:4px}',
    '#os-root .jv-appr{display:flex;gap:6px;margin-top:8px}',
    '#os-root .jv-appr button{flex:1;font-size:10.5px;border-radius:7px;border:1px solid var(--glassb);background:transparent;color:var(--mut);padding:5px;cursor:pointer}',
    '#os-root .jv-appr button:disabled{opacity:.5;cursor:default}',
    '#os-root .jv-appr .ok{color:var(--grn);border-color:rgba(61,220,132,.3)}#os-root .jv-appr .no{color:var(--red);border-color:rgba(255,93,108,.3)}',
    '#os-root .jv-empty{font-size:11px;color:var(--mut2);padding:6px 2px}',
    // feed
    '#os-root .jv-feed{background:var(--glass);border:1px solid var(--glassb);border-radius:12px;padding:6px 4px;max-height:340px;overflow:auto}',
    '#os-root .jv-frow{display:flex;gap:10px;align-items:baseline;padding:7px 10px;border-bottom:1px solid var(--glassb);font-size:11.5px}',
    '#os-root .jv-frow:last-child{border-bottom:none}',
    '#os-root .jv-frow .tm{color:var(--mut2);font-size:10px;white-space:nowrap;min-width:66px}',
    '#os-root .jv-frow .ag{color:var(--cyan);white-space:nowrap}',
    '#os-root .jv-frow .rs{color:var(--mut);flex:1}',
    '@media(max-width:900px){#os-root .jv-cols{grid-template-columns:1fr}#os-root .jv-kpis{grid-template-columns:repeat(2,1fr)}}',
  ].join('\n');
  document.head.appendChild(st);
}

// ─── Data ───
async function jvLoad(force) {
  if (JV.loading) return;
  if (JV.loaded && !force) return;
  if (jvRole() !== 'admin') { JV.err = 'Solo administradores.'; JV.loaded = true; return; }
  JV.loading = true; JV.err = null;
  try {
    const [reg, props, audit] = await Promise.all([
      sb.from('agent_registry').select('id,nombre,proceso,empresa,nivel_riesgo,estado,dueno').is('deleted_at', null).order('created_at'),
      sb.from('agent_proposals').select('id,agent_id,tipo_accion,property_id,payload,evidencia,estado,approved_by,approved_at,created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(240),
      sb.from('agent_audit_log').select('id,agent_id,proposal_id,resultado,output,ts').order('ts', { ascending: false }).limit(40),
    ]);
    if (reg.error) throw reg.error;
    JV.agents = reg.data || [];
    JV.props = props.error ? [] : (props.data || []);
    JV.audit = audit.error ? [] : (audit.data || []);
    // última corrida por agente (7 agentes → 1 query c/u, exacto)
    const runs = await Promise.all(JV.agents.map(a =>
      sb.from('agent_audit_log').select('ts').eq('agent_id', a.id).order('ts', { ascending: false }).limit(1)
        .then(r => ({ id: a.id, ts: (r.data && r.data[0] && r.data[0].ts) || null })).catch(() => ({ id: a.id, ts: null }))
    ));
    JV.lastRun = {}; runs.forEach(r => { JV.lastRun[r.id] = r.ts; });
    JV.loaded = true;
  } catch (e) { JV.err = e.message || String(e); }
  JV.loading = false;
  if (window.osRender) osRender();
}
window.jvLoad = jvLoad;

// clasificación de lanes (honesta, sobre los tipo_accion reales)
const JV_ALERT_TIPOS = ['conciliacion', 'correccion_dato'];
function jvIsAlert(p) { return p.estado === 'propuesta' && JV_ALERT_TIPOS.indexOf(p.tipo_accion) >= 0; }
function jvLaneOf(p) {
  if (jvIsAlert(p)) return 'alerta';
  if (p.estado === 'propuesta') return 'propuesta';
  if (p.estado === 'aprobada') return 'aprobada';
  if (p.estado === 'ejecutada') return 'ejecutada';
  return null; // rechazada no se muestra en lanes
}

// ─── Render (lo llama osRender vía el view map del router) ───
function jvView() {
  jvCSS();
  if (jvRole() !== 'admin') {
    return '<div class="empty"><div style="font-size:40px">' + osIcon('shield') + '</div><div style="margin-top:10px">Solo el administrador (dueño) puede abrir el Command Center.</div></div>';
  }
  if (!JV.loaded && !JV.err) { jvLoad(); return '<div class="empty">' + osIcon('loader') + ' Encendiendo el Cerebro Ejecutivo…</div>'; }
  if (JV.err) {
    return '<div class="empty"><div style="font-size:40px">' + osIcon('alert') + '</div><div class="down" style="margin-top:10px">' + OS_E(JV.err) + '</div><button class="cbtn" style="margin-top:14px" onclick="jvLoad(true)">Reintentar</button></div>';
  }
  const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return '<div class="jv"><div class="jv-grid"></div><div class="jv-in">'
    + '<div class="jv-hd">'
    + '<h1>' + osIcon('bot') + ' Agentic <span>Command Center</span></h1>'
    + '<div class="jv-pill"><span class="jv-dot"></span> SISTEMA OPERATIVO · ' + now + '</div>'
    + '</div>'
    + '<div class="sub">Solo vos (admin). Todo lo propone un agente — vos aprobás o rechazás. Lectura + decisión, cero ejecución automática.</div>'
    + jvKpis()
    + jvCore()
    + jvChatUI()
    + '<div class="jv-cols">'
    + '<div><div class="jv-st">Red de agentes</div>' + jvAgentsHTML() + '</div>'
    + '<div><div class="jv-st">Task lanes · propuestas en vivo</div>' + jvLanesHTML() + '</div>'
    + '</div>'
    + '<div class="jv-st" style="margin-top:22px">Bitácora · agent_audit_log</div>' + jvFeedHTML()
    + '</div></div>';
}
window.jvView = jvView;

function jvKpis() {
  const dry = JV.agents.filter(a => a.estado === 'dry-run').length;
  const asis = JV.agents.filter(a => a.estado === 'asistido').length;
  const pend = JV.props.filter(p => p.estado === 'propuesta' && !jvIsAlert(p)).length;
  const alert = JV.props.filter(jvIsAlert).length;
  const exe = JV.props.filter(p => p.estado === 'ejecutada').length;
  // Ocupación Rentas reusada de la capa de KPIs del OS (misma cifra en todas las pantallas)
  let occ = null;
  try { if (typeof osCompute === 'function') { const c = osCompute(); occ = c && c.rentas ? c.rentas.occPct : null; } } catch (e) {}
  const kpi = (n, l, s, color) => '<div class="jv-kpi"><div class="n"' + (color ? ' style="color:' + color + '"' : '') + '>' + n + '</div><div class="l">' + l + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
  return '<div class="jv-kpis">'
    + kpi(jvNum(JV.agents.length), 'Agentes en registro', asis + ' asistido · ' + dry + ' dry-run')
    + kpi(jvNum(pend), 'Propuestas pendientes', 'esperan tu decisión', pend ? 'var(--yel)' : '')
    + kpi(jvNum(alert), 'Alertas de integridad', 'conciliación / datos', alert ? 'var(--red)' : 'var(--grn)')
    + kpi(jvNum(exe), 'Ejecutadas', 'histórico aprobado')
    + kpi(occ == null ? '—' : occ + '%', 'Ocupación Rentas', 'capa KPIs del OS', 'var(--grn)')
    + '</div>';
}

function jvCore() {
  return '<div class="jv-core">'
    + '<div class="jv-orbw"><div class="jv-ring jv-r1"></div><div class="jv-ring jv-r2"></div><div class="jv-ring jv-r3"></div><div class="jv-orb"></div></div>'
    + '<div class="t">CEREBRO EJECUTIVO</div>'
    + '<div class="sub">Orquestador · coordina ' + JV.agents.length + ' agentes especialistas</div>'
    + '<div class="jv-bars"><i></i><i></i><i></i><i></i><i></i></div>'
    + '</div>';
}

function jvChatUI() {
  return '<div class="jv-chatbar">'
    + '<input id="jv-ask" placeholder="Hablá con el Cerebro…  ej: ¿qué está atrasado hoy? / ¿qué propuestas tengo pendientes?" onkeydown="if(event.key===\'Enter\')jvAsk()">'
    + '<button class="jv-send" id="jv-send" onclick="jvAsk()"' + (JV.chatBusy ? ' disabled' : '') + '>ENVIAR</button>'
    + '</div>'
    + '<div class="jv-chat" id="jv-chat">' + jvChatHTML() + '</div>';
}
function jvChatHTML() {
  if (!JV.chat.length) return '';
  return JV.chat.map(m => m.role === 'user'
    ? '<div class="jv-bub u">' + OS_E(m.content) + '</div>'
    : '<div class="jv-bub a' + (m.error ? ' err' : '') + (m.thinking ? ' think' : '') + '">' + (m.thinking ? 'Pensando…' : (window.marked && window.DOMPurify ? DOMPurify.sanitize(marked.parse(m.content)) : OS_E(m.content))) + '</div>'
  ).join('');
}
function jvRenderChat() { const el = document.getElementById('jv-chat'); if (el) { el.innerHTML = jvChatHTML(); el.scrollTop = el.scrollHeight; } const s = document.getElementById('jv-send'); if (s) s.disabled = JV.chatBusy; }

function jvAgentsHTML() {
  if (!JV.agents.length) return '<div class="jv-empty">No hay agentes en el registro.</div>';
  return JV.agents.map(a => {
    const live = a.estado === 'asistido';
    const tag = live ? '<span class="jv-tag jv-t-live">Asistido</span>' : '<span class="jv-tag jv-t-dry">Dry-run</span>';
    return '<div class="jv-agent"><div class="jv-av">' + osIcon(jvAgentIcon(a)) + '</div>'
      + '<div class="nm"><b>' + OS_E(a.nombre || 'Agente') + '<span class="jv-risk">' + OS_E(a.nivel_riesgo || '—') + '</span></b>'
      + '<span>' + OS_E((a.empresa || '') + ' · ' + jvFmtTs(JV.lastRun[a.id])) + '</span></div>'
      + tag + '</div>';
  }).join('');
}

function jvLanesHTML() {
  const lanes = { propuesta: [], aprobada: [], ejecutada: [], alerta: [] };
  JV.props.forEach(p => { const l = jvLaneOf(p); if (l) lanes[l].push(p); });
  const cardHTML = (p, cls, actions) => {
    const txt = jvEvid(p);
    const short = txt.length > 140 ? txt.slice(0, 138) + '…' : txt;
    const who = OS_E(jvAgentName(p.agent_id)) + ' · ' + OS_E(p.tipo_accion || '')
      + (p.approved_by ? ' · ' + OS_E(p.approved_by) : '');
    const busy = JV.busyId === p.id;
    return '<div class="jv-card ' + cls + '">' + OS_E(short || '(sin evidencia)')
      + '<div class="who">' + who + '</div>'
      + (actions
        ? '<div class="jv-appr"><button class="ok" onclick="jvDecide(\'' + p.id + '\',\'aprobada\')"' + (busy ? ' disabled' : '') + '>' + (busy ? '…' : '✓ Aprobar') + '</button>'
          + '<button class="no" onclick="jvDecide(\'' + p.id + '\',\'rechazada\')"' + (busy ? ' disabled' : '') + '>✕ Rechazar</button></div>'
        : '')
      + '</div>';
  };
  const lane = (title, arr, cls, actions) => {
    const body = arr.length
      ? arr.slice(0, 12).map(p => cardHTML(p, cls, actions)).join('') + (arr.length > 12 ? '<div class="jv-empty">+' + (arr.length - 12) + ' más</div>' : '')
      : '<div class="jv-empty">Sin ítems.</div>';
    return '<div class="jv-lane"><h4>' + title + ' <b>' + arr.length + '</b></h4>' + body + '</div>';
  };
  return '<div class="jv-lanes">'
    + lane('PROPUESTA', lanes.propuesta, '', true)
    + lane('ALERTAS', lanes.alerta, 'red', true)
    + lane('APROBADA', lanes.aprobada, 'grn', false)
    + lane('EJECUTADA', lanes.ejecutada, 'grn', false)
    + '</div>';
}

function jvFeedHTML() {
  if (!JV.audit.length) return '<div class="jv-feed"><div class="jv-empty" style="padding:12px">Sin registros de bitácora todavía.</div></div>';
  return '<div class="jv-feed">' + JV.audit.map(r => {
    const tm = r.ts ? new Date(r.ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
    let out = '';
    try { const o = r.output; if (o && typeof o === 'object') out = o.accion || o.estado || o.nota || ''; } catch (e) {}
    const res = out || r.resultado || '';
    return '<div class="jv-frow"><span class="tm">' + OS_E(tm) + '</span><span class="ag">' + OS_E(jvAgentName(r.agent_id)) + '</span><span class="rs">' + OS_E(res) + '</span></div>';
  }).join('') + '</div>';
}

// ─── Aprobar / Rechazar (human-in-the-loop) ───
async function jvDecide(id, estado) {
  const p = JV.props.find(x => x.id === id); if (!p || JV.busyId) return;
  const me = jvMe();
  const verb = estado === 'aprobada' ? 'Aprobar' : 'Rechazar';
  if (!confirm(verb + ' esta propuesta de "' + jvAgentName(p.agent_id) + '"?')) return;
  JV.busyId = id; if (window.osRender) osRender();
  try {
    const upd = { estado: estado, approved_by: me, approved_at: new Date().toISOString() };
    const { error: e1 } = await sb.from('agent_proposals').update(upd).eq('id', id);
    if (e1) throw e1;
    // traza inmutable en la bitácora con mi nombre (RLS admin-only)
    const { error: e2 } = await sb.from('agent_audit_log').insert({
      agent_id: p.agent_id, proposal_id: id,
      input: { accion: estado, por: me, tipo: p.tipo_accion },
      output: { estado: estado, por: me, accion: verb + ' desde Command Center' },
      resultado: 'ok',
    });
    if (e2) console.warn('audit_log insert:', e2.message); // no bloquea la decisión
    // reflejar local
    p.estado = estado; p.approved_by = me; p.approved_at = upd.approved_at;
  } catch (e) {
    alert('No se pudo ' + verb.toLowerCase() + ': ' + (e.message || e));
  }
  JV.busyId = null;
  await jvLoad(true);
}
window.jvDecide = jvDecide;

// ─── Cerebro Ejecutivo (chat) — reusa /api/brain-chat ───
function jvSnapshot() {
  const informes = JV.props.filter(p => p.tipo_accion === 'informe').slice(0, 6).map(p => jvEvid(p));
  const pend = JV.props.filter(p => p.estado === 'propuesta');
  const byTipo = {}; pend.forEach(p => { byTipo[p.tipo_accion || 'otro'] = (byTipo[p.tipo_accion || 'otro'] || 0) + 1; });
  const alertas = JV.props.filter(jvIsAlert).slice(0, 10).map(p => jvAgentName(p.agent_id) + ': ' + jvEvid(p));
  let os = null;
  try { if (typeof osSnapshot === 'function' && typeof osCompute === 'function') os = osSnapshot(osCompute()); } catch (e) {}
  return {
    contexto: 'Command Center del holding Rental Profitss — agentes de IA con aprobación humana (human-in-the-loop).',
    reportes_del_dia: informes,
    propuestas_pendientes: { total: pend.length, por_tipo: byTipo },
    alertas_de_integridad: alertas,
    agentes: JV.agents.map(a => ({ nombre: a.nombre, proceso: a.proceso, riesgo: a.nivel_riesgo, estado: a.estado, ultima_corrida: JV.lastRun[a.id] })),
    holding: os ? os.holding : null,
    cobranza: os ? os.cobranza : null,
  };
}
async function jvAsk(q) {
  const inp = document.getElementById('jv-ask');
  const question = (q || (inp ? inp.value.trim() : '')).trim();
  if (!question || JV.chatBusy) return;
  if (inp) inp.value = '';
  JV.chatBusy = true;
  JV.chat.push({ role: 'user', content: question });
  JV.chat.push({ role: 'assistant', content: '', thinking: true });
  jvRenderChat();
  const history = JV.chat.filter(m => !m.thinking && !m.error).slice(0, -1).map(m => ({ role: m.role, content: m.content }));
  try {
    const tok = await (async () => { try { const s = await sb.auth.getSession(); return (s && s.data.session && s.data.session.access_token) || ''; } catch (e) { return ''; } })();
    const r = await fetch('/api/brain-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) },
      body: JSON.stringify({ question, snapshot: jvSnapshot(), history }),
    });
    const data = await r.json().catch(() => ({}));
    JV.chat.pop();
    JV.chat.push(r.ok ? { role: 'assistant', content: data.answer || 'Sin respuesta.' } : { role: 'assistant', content: data.error || ('Error (HTTP ' + r.status + ').'), error: true });
  } catch (e) {
    JV.chat.pop();
    JV.chat.push({ role: 'assistant', content: 'No pude conectar: ' + (e.message || e), error: true });
  }
  JV.chatBusy = false;
  jvRenderChat();
}
window.jvAsk = jvAsk;
