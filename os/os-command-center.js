// ════════════════════════════════════════════════════════════════
// 🛰 COMMAND CENTER (/jarvis) — Agent Network estilo ATTU · SOLO ADMIN.
// Sidebar de navegación + 8 vistas. Todo con datos REALES:
//   agent_registry (roster 18 agentes: capa/area/riesgo/estado) ·
//   agent_proposals (task lanes + propuestas) · agent_audit_log (corridas/bitácora) ·
//   ct_findings (alertas 🔴) · /api/brain-chat (Cerebro).
// Badges working/en-espera/idle DERIVADOS de datos (última corrida + pendientes).
// Escrituras: SOLO Aprobar/Rechazar (human-in-the-loop) → agent_proposals + audit_log.
// Guard: el router bloquea /jarvis a no-admin; doble-check acá.
// Namespace JV / jv*.
// ════════════════════════════════════════════════════════════════

const JV = {
  loaded: false, loading: false, err: null,
  tab: 'network',
  agents: [], props: [], audit: [], lastRun: {}, runsTotal: 0, crit: [], critImpact: 0, memCount: null,
  busyId: null, chat: [], chatBusy: false,
};
window.JV = JV;

// ─── helpers ───
function jvRole() { try { return (state && state.role) || 'viewer'; } catch (e) { return 'viewer'; } }
function jvMe() { try { const u = state && state.user; return (u && (u.email || (u.user_metadata && u.user_metadata.full_name))) || 'admin'; } catch (e) { return 'admin'; } }
function jvNum(n) { return (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('es-MX'); }
function jvMoney(n) { return (n == null || isNaN(n)) ? '—' : '$' + Math.round(+n).toLocaleString('en-US'); }
function jvAgent(id) { return JV.agents.find(x => x.id === id) || null; }
function jvAgentName(id) { const a = jvAgent(id); return a ? a.nombre : 'Agente'; }
function jvEvid(p) {
  let e = p && p.evidencia; if (e == null) e = p && p.payload; if (e == null) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'object') return e.detalle || e.titulo || e.mensaje || e.texto || JSON.stringify(e);
  return String(e);
}
function jvFmtTs(ts) {
  if (!ts) return 'sin corridas';
  const d = new Date(ts); const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'recién'; if (min < 60) return 'hace ' + min + ' min';
  const h = Math.floor(min / 60); if (h < 24) return 'hace ' + h + ' h';
  return 'hace ' + Math.floor(h / 24) + ' d';
}
// icono por agente (según su proceso/nombre)
function jvAgentIcon(a) {
  const p = (((a && a.capa) || '') + ' ' + ((a && a.proceso) || '') + ' ' + ((a && a.nombre) || '')).toLowerCase();
  if (p.indexOf('command') >= 0 || p.indexOf('cerebro') >= 0 || p.indexOf('orquesta') >= 0) return 'brain';
  if (p.indexOf('cobr') >= 0) return 'banknote';
  if (p.indexOf('integrity') >= 0 || p.indexOf('verific') >= 0) return 'shield-check';
  if (p.indexOf('report') >= 0 || p.indexOf('briefing') >= 0) return 'send';
  if (p.indexOf('signal') >= 0 || p.indexOf('sabueso') >= 0 || p.indexOf('alerta') >= 0) return 'alert';
  if (p.indexOf('concili') >= 0 || p.indexOf('contab') >= 0 || p.indexOf('finance') >= 0 || p.indexOf('líder cont') >= 0) return 'notebook';
  if (p.indexOf('audit') >= 0 || p.indexOf('dato') >= 0) return 'search';
  if (p.indexOf('coordin') >= 0 || p.indexOf('cronog') >= 0) return 'calendar';
  if (p.indexOf('calidad') >= 0 || p.indexOf('tiempo') >= 0) return 'chart';
  if (p.indexOf('ops') >= 0 || p.indexOf('opera') >= 0 || p.indexOf('líder') >= 0) return 'settings';
  return 'bot';
}

// ─── clasificación de propuestas / alertas ───
const JV_ALERT_TIPOS = ['conciliacion', 'correccion_dato'];
function jvIsAlert(p) { return p.estado === 'propuesta' && JV_ALERT_TIPOS.indexOf(p.tipo_accion) >= 0; }
function jvLaneOf(p) {
  if (jvIsAlert(p)) return 'alerta';
  if (p.estado === 'propuesta') return 'propuesta';
  if (p.estado === 'aprobada') return 'aprobada';
  if (p.estado === 'ejecutada') return 'ejecutada';
  return null;
}

// ─── estado en vivo de cada agente / equipo ───
function jvAgentStatus(id) {
  const pend = JV.props.some(p => p.agent_id === id && p.estado === 'propuesta');
  const last = JV.lastRun[id];
  const recent = last && (Date.now() - new Date(last).getTime() < 24 * 3600 * 1000);
  if (recent) return 'work';
  if (pend) return 'wait';
  return 'idle';
}
function jvTeamAgents(capa) { return JV.agents.filter(a => a.capa === capa); }
function jvTeamStatus(capa) {
  const s = jvTeamAgents(capa).map(a => jvAgentStatus(a.id));
  if (s.includes('work')) return 'work'; if (s.includes('wait')) return 'wait'; return 'idle';
}
function jvNetworkActive() {
  // el Cerebro está "activo" si la red trabaja o hay pendientes
  return JV.agents.some(a => a.capa !== 'Command' && jvAgentStatus(a.id) !== 'idle');
}
function jvBadge(st) {
  const map = { work: ['b-work', 'activo'], wait: ['b-wait', 'en espera'], idle: ['b-idle', 'inactivo'] };
  const m = map[st] || map.idle;
  return '<span class="jv-badge ' + m[0] + '">' + m[1] + '</span>';
}

// equipos (5) — el molde ATTU sobre las capas reales
const JV_TEAMS = [
  { capa: 'Finance', name: 'Contable & Datos', icon: 'notebook', color: 'var(--jc-cyan)', layer: 'Finance Layer', desc: 'Concilia libros vs operación, cobranza y detecta lo que no cuadra.' },
  { capa: 'Ops', name: 'Operación', icon: 'settings', color: 'var(--jc-pink)', layer: 'Ops Layer', desc: 'Coordina tareas y cronograma, mide tiempos y calidad del equipo.' },
  { capa: 'Integrity', name: 'Verificadores', icon: 'shield-check', color: 'var(--jc-grn)', layer: 'Integrity Layer', desc: 'Chequeo profundo por empresa: Airtable ↔ OS ↔ QuickBooks ↔ ClickUp.' },
  { capa: 'Report', name: 'Reporteros', icon: 'send', color: 'var(--jc-blue)', layer: 'Report Layer', desc: 'Briefing diario por empresa: qué hacer hoy, qué se cumplió ayer.' },
  { capa: 'Signal', name: 'Sabueso', icon: 'alert', color: 'var(--jc-amber)', layer: 'Signal Layer', desc: 'Olfatea pagos y gastos nuevos, alerta lo crítico al instante.' },
];
const JV_CAPAS = [
  { capa: 'Command', name: 'Capa de Comando', color: 'var(--jc-purple)' },
  { capa: 'Finance', name: 'Finance Layer', color: 'var(--jc-cyan)' },
  { capa: 'Ops', name: 'Ops Layer', color: 'var(--jc-pink)' },
  { capa: 'Integrity', name: 'Integrity Layer', color: 'var(--jc-grn)' },
  { capa: 'Report', name: 'Report Layer', color: 'var(--jc-blue)' },
  { capa: 'Signal', name: 'Signal Layer', color: 'var(--jc-amber)' },
];
const JV_NAV = [
  { k: 'network', ic: 'network', t: 'Agentes' },
  { k: 'command', ic: 'layout', t: 'Command Center' },
  { k: 'brief', ic: 'sun', t: 'Brief del CEO' },
  { k: 'propuestas', ic: 'inbox', t: 'Propuestas' },
  { k: 'empresas', ic: 'building', t: 'Empresas' },
  { k: 'horarios', ic: 'clock', t: 'Horarios' },
  { k: 'vault', ic: 'library', t: 'Knowledge Vault' },
  { k: 'reportes', ic: 'chart', t: 'Reportes' },
];
const JV_EMPRESAS = [
  { area: 'fix-flip', name: 'Fix & Flip', icon: 'construction' },
  { area: 'remodelacion', name: 'Remodelación', icon: 'hammer' },
  { area: 'rentas', name: 'Rentas', icon: 'house' },
  { area: 'education', name: 'Educación', icon: 'graduation-cap' },
];

// ════════════════════════════════════════════════════════════════
// CSS (paleta ATTU, scopeado a #os-root .jv)
// ════════════════════════════════════════════════════════════════
function jvCSS() {
  if (document.getElementById('jv-styles')) return;
  const st = document.createElement('style'); st.id = 'jv-styles';
  st.textContent = [
    '#os-root .jv{--jc-bg:#080a10;--jc-side:#0b0e16;--jc-card:#0e1220;--jc-line:rgba(120,140,180,.14);--jc-tx:#e8edf7;--jc-mut:#7c88a3;--jc-purple:#a78bfa;--jc-cyan:#38bdf8;--jc-pink:#f472b6;--jc-grn:#34d399;--jc-amber:#fbbf24;--jc-blue:#60a5fa;background:var(--jc-bg);color:var(--jc-tx);border-radius:16px;overflow:hidden;display:flex;min-height:640px;border:1px solid var(--jc-line)}',
    // sidebar
    '#os-root .jv-side{width:212px;background:var(--jc-side);border-right:1px solid var(--jc-line);padding:16px 12px;flex-shrink:0}',
    '#os-root .jv-logo{display:flex;align-items:center;gap:9px;padding:4px 8px 16px}',
    '#os-root .jv-logo .m{width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,var(--jc-purple),var(--jc-cyan))}',
    '#os-root .jv-logo b{font-size:14px}',
    '#os-root .jv-nav a{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:8px;color:var(--jc-mut);cursor:pointer;font-size:12.5px;margin-bottom:2px}',
    '#os-root .jv-nav a.on{background:rgba(167,139,250,.14);color:#fff}',
    '#os-root .jv-nav a:hover{color:#fff;background:rgba(167,139,250,.06)}',
    '#os-root .jv-nav a .icn{width:15px;height:15px}',
    '#os-root .jv-lbl{font-size:9.5px;letter-spacing:.2em;color:var(--jc-mut);text-transform:uppercase;margin:18px 8px 8px}',
    '#os-root .jv-mini{display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:8px;font-size:11.5px;color:var(--jc-tx)}',
    '#os-root .jv-mini .ic{width:22px;height:22px;border-radius:6px;background:var(--jc-card);display:flex;align-items:center;justify-content:center}',
    '#os-root .jv-mini .stt{margin-left:auto;width:7px;height:7px;border-radius:50%}',
    '#os-root .jv-mini .stt.work{background:var(--jc-grn);box-shadow:0 0 7px var(--jc-grn)}',
    '#os-root .jv-mini .stt.wait{background:var(--jc-amber);box-shadow:0 0 7px var(--jc-amber)}',
    '#os-root .jv-mini .stt.idle{background:var(--jc-mut)}',
    // main
    '#os-root .jv-main{flex:1;padding:20px 26px;overflow:auto;min-width:0}',
    '#os-root .jv-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}',
    '#os-root .jv-op{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--jc-grn);border:1px solid rgba(52,211,153,.25);padding:5px 11px;border-radius:20px}',
    '#os-root .jv-op .d{width:6px;height:6px;border-radius:50%;background:var(--jc-grn);box-shadow:0 0 6px var(--jc-grn);animation:jvpulse 1.8s infinite}',
    '@keyframes jvpulse{0%,100%{opacity:1}50%{opacity:.35}}',
    '#os-root .jv-eyebrow{font-size:10px;letter-spacing:.24em;color:var(--jc-mut);text-transform:uppercase}',
    '#os-root .jv-lead{font-size:13.5px;color:var(--jc-mut);margin:3px 0 22px}',
    '#os-root .jv-h{font-size:16px;font-weight:700;margin:0 0 3px}',
    // orchestrator
    '#os-root .jv-orch{background:linear-gradient(180deg,rgba(167,139,250,.10),var(--jc-card));border:1px solid rgba(167,139,250,.28);border-radius:16px;padding:20px 22px;max-width:640px;margin:0 auto;position:relative;box-shadow:0 0 40px rgba(167,139,250,.10)}',
    '#os-root .jv-orch .row{display:flex;align-items:flex-start;gap:16px}',
    '#os-root .jv-crown{width:52px;height:52px;border-radius:13px;background:radial-gradient(circle at 40% 35%,rgba(167,139,250,.5),rgba(167,139,250,.12));display:flex;align-items:center;justify-content:center;color:var(--jc-purple);box-shadow:0 0 24px rgba(167,139,250,.4);flex-shrink:0}',
    '#os-root .jv-orch h2{font-size:21px;font-weight:700}',
    '#os-root .jv-orch .layer{font-size:10px;letter-spacing:.16em;color:var(--jc-purple);text-transform:uppercase;margin-top:2px}',
    '#os-root .jv-orch p{font-size:12.5px;color:var(--jc-mut);margin-top:10px;max-width:410px}',
    '#os-root .jv-badge{font-size:9.5px;letter-spacing:.05em;padding:3px 9px;border-radius:12px;display:inline-flex;align-items:center;gap:5px}',
    '#os-root .jv-badge::before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}',
    '#os-root .b-work{background:rgba(52,211,153,.14);color:var(--jc-grn)}#os-root .b-wait{background:rgba(251,191,36,.14);color:var(--jc-amber)}#os-root .b-idle{background:rgba(124,136,163,.16);color:var(--jc-mut)}',
    '#os-root .jv-metrics{position:absolute;top:18px;right:20px;display:flex;gap:10px}',
    '#os-root .jv-metric{border:1px solid var(--jc-line);border-radius:9px;padding:8px 12px;text-align:center;min-width:66px}',
    '#os-root .jv-metric .n{font-size:17px;font-weight:700}#os-root .jv-metric .l{font-size:8.5px;letter-spacing:.1em;color:var(--jc-mut);text-transform:uppercase}',
    '#os-root .jv-stem{width:1px;height:22px;background:var(--jc-line);margin:0 auto}',
    '#os-root .jv-hbar{height:1px;background:var(--jc-line);max-width:1000px;margin:0 auto;position:relative}',
    '#os-root .jv-hdot{width:6px;height:6px;border-radius:50%;position:absolute;top:-3px}',
    // specialists
    '#os-root .jv-specs{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:22px}',
    '@media(max-width:1000px){#os-root .jv-specs{grid-template-columns:repeat(2,1fr)}#os-root .jv-side{width:170px}}',
    '#os-root .jv-spec{background:var(--jc-card);border:1px solid var(--jc-line);border-radius:13px;padding:14px;position:relative;overflow:hidden;cursor:pointer}',
    '#os-root .jv-spec::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--sc)}',
    '#os-root .jv-spec:hover{border-color:var(--sc)}',
    '#os-root .jv-spec .hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}',
    '#os-root .jv-spec .ic{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--sc) 16%,transparent);color:var(--sc)}',
    '#os-root .jv-spec h3{font-size:14px;margin-top:2px}',
    '#os-root .jv-spec .layer{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--sc);margin-top:2px}',
    '#os-root .jv-spec p{font-size:11px;color:var(--jc-mut);margin-top:9px}',
    '#os-root .jv-spec .cnt{font-size:10px;color:var(--jc-mut);margin-top:8px}',
    // agents list
    '#os-root .jv-alist{margin-top:26px}',
    '#os-root .jv-grp{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gc,var(--jc-mut));margin:16px 2px 8px;display:flex;align-items:center;gap:8px}',
    '#os-root .jv-grp::after{content:"";flex:1;height:1px;background:var(--jc-line)}',
    '#os-root .jv-arow{display:flex;align-items:center;gap:11px;background:var(--jc-card);border:1px solid var(--jc-line);border-radius:11px;padding:10px 13px;margin-bottom:8px}',
    '#os-root .jv-av{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(167,139,250,.10);border:1px solid rgba(167,139,250,.18);color:var(--jc-purple);flex-shrink:0}',
    '#os-root .jv-arow .nm{flex:1;min-width:0}',
    '#os-root .jv-arow .nm b{font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#os-root .jv-arow .nm span{display:block;font-size:10.5px;color:var(--jc-mut);margin-top:1px}',
    '#os-root .jv-chip{font-size:9px;color:var(--jc-mut);border:1px solid var(--jc-line);border-radius:8px;padding:2px 7px;white-space:nowrap}',
    // generic cards / kpis
    '#os-root .jv-grid{display:grid;gap:12px}',
    '#os-root .jv-card{background:var(--jc-card);border:1px solid var(--jc-line);border-radius:13px;padding:14px 16px}',
    '#os-root .jv-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:4px 0 20px}',
    '@media(max-width:1000px){#os-root .jv-kpis{grid-template-columns:repeat(2,1fr)}}',
    '#os-root .jv-kpi{background:var(--jc-card);border:1px solid var(--jc-line);border-radius:13px;padding:13px 15px;position:relative;overflow:hidden}',
    '#os-root .jv-kpi::after{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--jc-purple),var(--jc-cyan))}',
    '#os-root .jv-kpi .n{font-size:21px;font-weight:700;font-variant-numeric:tabular-nums}',
    '#os-root .jv-kpi .l{font-size:10px;letter-spacing:.08em;color:var(--jc-mut);text-transform:uppercase;margin-top:3px}',
    '#os-root .jv-kpi .s{font-size:10px;color:var(--jc-mut);margin-top:2px;opacity:.8}',
    // orb
    '#os-root .jv-core{display:flex;flex-direction:column;align-items:center;margin:6px 0 18px}',
    '#os-root .jv-orbw{position:relative;width:150px;height:150px;display:flex;align-items:center;justify-content:center}',
    '#os-root .jv-ring{position:absolute;border-radius:50%}',
    '#os-root .jv-r1{width:150px;height:150px;border:1px solid rgba(167,139,250,.25);animation:jvspin 18s linear infinite}',
    '#os-root .jv-r2{width:120px;height:120px;border:1px dashed rgba(56,189,248,.3);animation:jvspin 12s linear infinite reverse}',
    '@keyframes jvspin{to{transform:rotate(360deg)}}',
    '#os-root .jv-orb{width:78px;height:78px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#d6c6ff,#a78bfa 45%,#5b8def 80%,#1b2a66);box-shadow:0 0 55px rgba(167,139,250,.6),inset 0 0 26px rgba(255,255,255,.32);animation:jvbreathe 3.4s ease-in-out infinite}',
    '@keyframes jvbreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
    '#os-root .jv-core .t{margin-top:12px;font-size:12px;letter-spacing:.28em;color:var(--jc-purple)}',
    // chat
    '#os-root .jv-chatbar{max-width:660px;margin:0 auto 8px;display:flex;gap:10px;align-items:center;background:var(--jc-card);border:1px solid rgba(167,139,250,.28);border-radius:30px;padding:8px 10px 8px 16px}',
    '#os-root .jv-chatbar input{flex:1;background:transparent;border:none;color:var(--jc-tx);font-size:14px;outline:none}',
    '#os-root .jv-chatbar input::placeholder{color:var(--jc-mut)}',
    '#os-root .jv-send{background:linear-gradient(135deg,var(--jc-purple),var(--jc-blue));color:#0a0e1a;border:none;font-weight:700;padding:9px 16px;border-radius:20px;cursor:pointer}',
    '#os-root .jv-send:disabled{opacity:.5;cursor:default}',
    '#os-root .jv-chat{max-width:660px;margin:0 auto 22px}',
    '#os-root .jv-bub{padding:9px 13px;border-radius:12px;margin:7px 0;font-size:13px;line-height:1.5;max-width:88%}',
    '#os-root .jv-bub.u{background:rgba(167,139,250,.14);border:1px solid rgba(167,139,250,.24);margin-left:auto}',
    '#os-root .jv-bub.a{background:var(--jc-card);border:1px solid var(--jc-line)}',
    '#os-root .jv-bub.a.err{border-color:rgba(244,114,182,.4);color:var(--jc-pink)}',
    '#os-root .jv-bub.think{color:var(--jc-mut)}',
    // lanes
    '#os-root .jv-st{font-size:11px;letter-spacing:.2em;color:var(--jc-mut);text-transform:uppercase;margin:0 0 11px}',
    '#os-root .jv-lanes{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}',
    '@media(max-width:1000px){#os-root .jv-lanes{grid-template-columns:repeat(2,1fr)}}',
    '#os-root .jv-lane{background:var(--jc-card);border:1px solid var(--jc-line);border-radius:12px;padding:10px;min-height:120px}',
    '#os-root .jv-lane h4{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--jc-mut);margin-bottom:9px;display:flex;justify-content:space-between}',
    '#os-root .jv-lane h4 b{color:var(--jc-purple)}',
    '#os-root .jv-lc{background:rgba(167,139,250,.05);border:1px solid var(--jc-line);border-left:2px solid var(--jc-purple);border-radius:8px;padding:8px 9px;margin-bottom:8px;font-size:11.5px;line-height:1.45}',
    '#os-root .jv-lc.red{border-left-color:var(--jc-pink)}#os-root .jv-lc.grn{border-left-color:var(--jc-grn)}',
    '#os-root .jv-lc .who{font-size:9.5px;color:var(--jc-mut);margin-top:4px}',
    '#os-root .jv-appr{display:flex;gap:6px;margin-top:8px}',
    '#os-root .jv-appr button{flex:1;font-size:10.5px;border-radius:7px;border:1px solid var(--jc-line);background:transparent;color:var(--jc-mut);padding:5px;cursor:pointer}',
    '#os-root .jv-appr button:disabled{opacity:.5}',
    '#os-root .jv-appr .ok{color:var(--jc-grn);border-color:rgba(52,211,153,.3)}#os-root .jv-appr .no{color:var(--jc-pink);border-color:rgba(244,114,182,.3)}',
    '#os-root .jv-empty{font-size:11px;color:var(--jc-mut);padding:6px 2px}',
    // feed
    '#os-root .jv-feed{background:var(--jc-card);border:1px solid var(--jc-line);border-radius:12px;padding:4px 4px;max-height:320px;overflow:auto}',
    '#os-root .jv-frow{display:flex;gap:10px;align-items:baseline;padding:7px 10px;border-bottom:1px solid var(--jc-line);font-size:11.5px}',
    '#os-root .jv-frow:last-child{border-bottom:none}',
    '#os-root .jv-frow .tm{color:var(--jc-mut);font-size:10px;min-width:66px}',
    '#os-root .jv-frow .ag{color:var(--jc-purple)}',
    '#os-root .jv-frow .rs{color:var(--jc-mut);flex:1}',
    // empresas / chain / vault
    '#os-root .jv-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    '@media(max-width:900px){#os-root .jv-2col{grid-template-columns:1fr}}',
    '#os-root .jv-chain{position:relative;margin-left:8px;padding-left:20px;border-left:2px solid var(--jc-line)}',
    '#os-root .jv-step{position:relative;margin-bottom:14px}',
    '#os-root .jv-step::before{content:"";position:absolute;left:-27px;top:3px;width:10px;height:10px;border-radius:50%;background:var(--jc-purple);box-shadow:0 0 8px rgba(167,139,250,.6)}',
    '#os-root .jv-step .hh{font-size:12px;font-weight:700}#os-root .jv-step .dd{font-size:11.5px;color:var(--jc-mut)}',
    '#os-root .jv-live{font-size:9px;color:var(--jc-grn);border:1px solid rgba(52,211,153,.3);border-radius:8px;padding:1px 6px;margin-left:6px}',
    '#os-root .jv-a{color:var(--jc-cyan);cursor:pointer}',
  ].join('\n');
  document.head.appendChild(st);
}

// ════════════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════════════
async function jvLoad(force) {
  if (JV.loading) return;
  if (JV.loaded && !force) return;
  if (jvRole() !== 'admin') { JV.err = 'Solo administradores.'; JV.loaded = true; return; }
  JV.loading = true; JV.err = null;
  try {
    const [reg, props, audit, runs, crit, mem] = await Promise.all([
      sb.from('agent_registry').select('id,nombre,proceso,empresa,area,capa,nivel_riesgo,estado,dueno').is('deleted_at', null).order('nombre'),
      sb.from('agent_proposals').select('id,agent_id,tipo_accion,property_id,payload,evidencia,estado,approved_by,approved_at,created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(300),
      sb.from('agent_audit_log').select('id,agent_id,proposal_id,resultado,output,ts').order('ts', { ascending: false }).limit(40),
      sb.from('agent_audit_log').select('id', { count: 'exact', head: true }),
      sb.from('ct_findings').select('titulo,impacto_usd').eq('active', true).is('resolved_at', null).eq('severidad', 'critica').order('impacto_usd', { ascending: false, nullsFirst: false }),
      sb.from('pm_brain_memory').select('id', { count: 'exact', head: true }).then(r => r).catch(() => ({ count: null })),
    ]);
    if (reg.error) throw reg.error;
    JV.agents = reg.data || [];
    JV.props = props.error ? [] : (props.data || []);
    JV.audit = audit.error ? [] : (audit.data || []);
    JV.runsTotal = runs.count || 0;
    JV.crit = crit.error ? [] : (crit.data || []);
    JV.critImpact = JV.crit.reduce((s, f) => s + (+f.impacto_usd || 0), 0);
    JV.memCount = (mem && typeof mem.count === 'number') ? mem.count : null;
    const rr = await Promise.all(JV.agents.map(a =>
      sb.from('agent_audit_log').select('ts').eq('agent_id', a.id).order('ts', { ascending: false }).limit(1)
        .then(r => ({ id: a.id, ts: (r.data && r.data[0] && r.data[0].ts) || null })).catch(() => ({ id: a.id, ts: null }))));
    JV.lastRun = {}; rr.forEach(r => { JV.lastRun[r.id] = r.ts; });
    JV.loaded = true;
  } catch (e) { JV.err = e.message || String(e); }
  JV.loading = false;
  if (window.osRender) osRender();
}
window.jvLoad = jvLoad;
function jvNav(tab) { JV.tab = tab; if (window.osRender) osRender(); }
window.jvNav = jvNav;

// ════════════════════════════════════════════════════════════════
// SHELL
// ════════════════════════════════════════════════════════════════
function jvView() {
  jvCSS();
  if (jvRole() !== 'admin') return '<div class="empty"><div style="font-size:40px">' + osIcon('shield') + '</div><div style="margin-top:10px">Solo el administrador (dueño) puede abrir el Command Center.</div></div>';
  if (!JV.loaded && !JV.err) { jvLoad(); return '<div class="empty">' + osIcon('loader') + ' Encendiendo el Agent Network…</div>'; }
  if (JV.err) return '<div class="empty"><div style="font-size:40px">' + osIcon('alert') + '</div><div class="down" style="margin-top:10px">' + OS_E(JV.err) + '</div><button class="cbtn" style="margin-top:14px" onclick="jvLoad(true)">Reintentar</button></div>';
  return '<div class="jv">' + jvSidebar() + '<div class="jv-main">' + jvTopBar() + jvTabBody() + '</div></div>';
}
window.jvView = jvView;

function jvSidebar() {
  const nav = JV_NAV.map(n => '<a class="' + (JV.tab === n.k ? 'on' : '') + '" onclick="jvNav(\'' + n.k + '\')">' + osIcon(n.ic, { size: 15 }) + ' ' + n.t + '</a>').join('');
  const minis = JV_TEAMS.map(t => {
    const st = jvTeamStatus(t.capa);
    return '<div class="jv-mini" onclick="jvNav(\'network\')" style="cursor:pointer"><div class="ic">' + osIcon(t.icon, { size: 13 }) + '</div>' + OS_E(t.name) + '<span class="stt ' + st + '"></span></div>';
  }).join('');
  return '<aside class="jv-side"><div class="jv-logo"><div class="m"></div><b>Rental Profitss</b></div>'
    + '<nav class="jv-nav">' + nav + '</nav>'
    + '<div class="jv-lbl">Equipos</div>' + minis + '</aside>';
}
function jvTopBar() {
  const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return '<div class="jv-top"><div class="jv-eyebrow">Rental Profitss · Agentic OS</div><div class="jv-op"><span class="d"></span> Sistema Operativo · ' + now + '</div></div>';
}
function jvTabBody() {
  switch (JV.tab) {
    case 'command': return jvDashboard();
    case 'brief': return jvBriefView();
    case 'propuestas': return jvPropuestasView();
    case 'empresas': return jvEmpresasView();
    case 'horarios': return jvHorariosView();
    case 'vault': return jvVaultView();
    case 'reportes': return jvReportesView();
    default: return jvNetwork();
  }
}

// ════════════════════════════════════════════════════════════════
// VIEW · AGENT NETWORK (default, ATTU)
// ════════════════════════════════════════════════════════════════
function jvNetwork() {
  const pend = JV.props.filter(p => p.estado === 'propuesta').length;
  const cerebro = JV.agents.find(a => a.capa === 'Command');
  const cerebroSt = jvNetworkActive() ? 'work' : (cerebro ? jvAgentStatus(cerebro.id) : 'idle');
  const dotColors = JV_TEAMS.map(t => t.color);
  const dots = [10, 30, 50, 70, 90].map((l, i) => '<span class="jv-hdot" style="left:' + l + '%;background:' + dotColors[i] + ';box-shadow:0 0 7px ' + dotColors[i] + '"></span>').join('');
  const specs = JV_TEAMS.map(t => {
    const st = jvTeamStatus(t.capa); const n = jvTeamAgents(t.capa).length;
    return '<div class="jv-spec" style="--sc:' + t.color + '" onclick="jvNav(\'network\')"><div class="hd"><div class="ic">' + osIcon(t.icon, { size: 16 }) + '</div>' + jvBadge(st) + '</div>'
      + '<h3>' + OS_E(t.name) + '</h3><div class="layer">' + t.layer + '</div><p>' + OS_E(t.desc) + '</p>'
      + '<div class="cnt">' + n + ' agente' + (n !== 1 ? 's' : '') + '</div></div>';
  }).join('');
  return '<div class="jv-eyebrow">Agent Network</div>'
    + '<div class="jv-lead">Una capa de comando coordinando a los 5 equipos especialistas de Rental Profitss — ' + JV.agents.length + ' agentes registrados.</div>'
    + '<div class="jv-orch"><div class="jv-metrics"><div class="jv-metric"><div class="n">' + jvNum(pend) + '</div><div class="l">Propuestas</div></div><div class="jv-metric"><div class="n">' + jvNum(JV.runsTotal) + '</div><div class="l">Corridas</div></div></div>'
    + '<div class="row"><div class="jv-crown">' + osIcon('brain', { size: 24 }) + '</div><div>' + jvBadge(cerebroSt) + '<h2>Cerebro Ejecutivo</h2><div class="layer">Command Layer · Orquestador</div>'
    + '<p>' + OS_E(cerebro ? cerebro.proceso : 'Rutea el trabajo, coordina a los especialistas y te devuelve la foto ejecutiva del negocio.') + '</p></div></div></div>'
    + '<div class="jv-stem"></div><div class="jv-hbar">' + dots + '</div>'
    + '<div class="jv-specs">' + specs + '</div>'
    + jvAgentsList();
}
function jvAgentsList() {
  let html = '<div class="jv-alist"><div class="jv-st">Todos los agentes · estado en vivo</div>';
  JV_CAPAS.forEach(c => {
    const ags = JV.agents.filter(a => a.capa === c.capa);
    if (!ags.length) return;
    html += '<div class="jv-grp" style="--gc:' + c.color + '">' + OS_E(c.name) + ' · ' + ags.length + '</div>';
    html += ags.map(a => {
      const st = jvAgentStatus(a.id);
      return '<div class="jv-arow"><div class="jv-av">' + osIcon(jvAgentIcon(a), { size: 15 }) + '</div>'
        + '<div class="nm"><b>' + OS_E(a.nombre) + '</b><span>' + OS_E((a.area || '') + ' · ' + (a.capa || '') + ' · ' + jvFmtTs(JV.lastRun[a.id])) + '</span></div>'
        + '<span class="jv-chip">' + OS_E(a.nivel_riesgo || '—') + '</span><span class="jv-chip">' + OS_E(a.estado || '') + '</span>' + jvBadge(st) + '</div>';
    }).join('');
  });
  return html + '</div>';
}

// ════════════════════════════════════════════════════════════════
// VIEW · COMMAND CENTER (dashboard: KPIs + orbe + chat + lanes + feed)
// ════════════════════════════════════════════════════════════════
function jvDashboard() {
  return '<div class="jv-eyebrow">Command Center</div><div class="jv-lead">Foto operativa del holding · todo propone un agente, vos aprobás.</div>'
    + jvKpis() + jvCore() + jvChatUI()
    + '<div class="jv-2col"><div><div class="jv-st">Task lanes · propuestas en vivo</div>' + jvLanesHTML() + '</div>'
    + '<div><div class="jv-st">Bitácora · agent_audit_log</div>' + jvFeedHTML() + '</div></div>';
}
function jvKpis() {
  const dry = JV.agents.filter(a => a.estado === 'dry-run').length;
  const asis = JV.agents.filter(a => a.estado === 'asistido').length;
  const pend = JV.props.filter(p => p.estado === 'propuesta' && !jvIsAlert(p)).length;
  const alert = JV.props.filter(jvIsAlert).length + JV.crit.length;
  const exe = JV.props.filter(p => p.estado === 'ejecutada').length;
  let occ = null; try { if (typeof osCompute === 'function') { const c = osCompute(); occ = c && c.rentas ? c.rentas.occPct : null; } } catch (e) {}
  const kpi = (n, l, s, col) => '<div class="jv-kpi"><div class="n"' + (col ? ' style="color:' + col + '"' : '') + '>' + n + '</div><div class="l">' + l + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
  return '<div class="jv-kpis">'
    + kpi(jvNum(JV.agents.length), 'Agentes', asis + ' asistido · ' + dry + ' dry-run')
    + kpi(jvNum(pend), 'Propuestas pendientes', 'esperan tu OK', pend ? 'var(--jc-amber)' : '')
    + kpi(jvNum(alert), 'Alertas 🔴', 'Sabueso + integridad', alert ? 'var(--jc-pink)' : 'var(--jc-grn)')
    + kpi(jvNum(exe), 'Ejecutadas', 'histórico')
    + kpi(occ == null ? '—' : occ + '%', 'Ocupación Rentas', 'capa KPIs del OS', 'var(--jc-grn)')
    + '</div>';
}
function jvCore() {
  return '<div class="jv-core"><div class="jv-orbw"><div class="jv-ring jv-r1"></div><div class="jv-ring jv-r2"></div><div class="jv-orb"></div></div><div class="t">CEREBRO EJECUTIVO</div></div>';
}
function jvChatUI() {
  return '<div class="jv-chatbar"><input id="jv-ask" placeholder="Hablá con el Cerebro…  ej: ¿qué está atrasado hoy? / ¿qué propuestas tengo pendientes?" onkeydown="if(event.key===\'Enter\')jvAsk()"><button class="jv-send" id="jv-send" onclick="jvAsk()"' + (JV.chatBusy ? ' disabled' : '') + '>ENVIAR</button></div><div class="jv-chat" id="jv-chat">' + jvChatHTML() + '</div>';
}
function jvChatHTML() {
  if (!JV.chat.length) return '';
  return JV.chat.map(m => m.role === 'user' ? '<div class="jv-bub u">' + OS_E(m.content) + '</div>'
    : '<div class="jv-bub a' + (m.error ? ' err' : '') + (m.thinking ? ' think' : '') + '">' + (m.thinking ? 'Pensando…' : (window.marked && window.DOMPurify ? DOMPurify.sanitize(marked.parse(m.content)) : OS_E(m.content))) + '</div>').join('');
}
function jvRenderChat() { const el = document.getElementById('jv-chat'); if (el) { el.innerHTML = jvChatHTML(); el.scrollTop = el.scrollHeight; } const s = document.getElementById('jv-send'); if (s) s.disabled = JV.chatBusy; }

// ════════════════════════════════════════════════════════════════
// VIEW · PROPUESTAS (task lanes)
// ════════════════════════════════════════════════════════════════
function jvPropuestasView() {
  return '<div class="jv-eyebrow">Propuestas</div><div class="jv-lead">Todo lo propone un agente — vos aprobás o rechazás. Cada decisión queda en la bitácora.</div>' + jvLanesHTML();
}
function jvLanesHTML() {
  const lanes = { propuesta: [], aprobada: [], ejecutada: [], alerta: [] };
  JV.props.forEach(p => { const l = jvLaneOf(p); if (l) lanes[l].push(p); });
  const card = (p, cls, actions) => {
    const txt = jvEvid(p); const short = txt.length > 140 ? txt.slice(0, 138) + '…' : txt;
    const who = OS_E(jvAgentName(p.agent_id)) + ' · ' + OS_E(p.tipo_accion || '') + (p.approved_by ? ' · ' + OS_E(p.approved_by) : '');
    const busy = JV.busyId === p.id;
    return '<div class="jv-lc ' + cls + '">' + OS_E(short || '(sin evidencia)') + '<div class="who">' + who + '</div>'
      + (actions ? '<div class="jv-appr"><button class="ok" onclick="jvDecide(\'' + p.id + '\',\'aprobada\')"' + (busy ? ' disabled' : '') + '>' + (busy ? '…' : '✓ Aprobar') + '</button><button class="no" onclick="jvDecide(\'' + p.id + '\',\'rechazada\')"' + (busy ? ' disabled' : '') + '>✕</button></div>' : '') + '</div>';
  };
  const lane = (title, arr, cls, actions) => {
    const body = arr.length ? arr.slice(0, 12).map(p => card(p, cls, actions)).join('') + (arr.length > 12 ? '<div class="jv-empty">+' + (arr.length - 12) + ' más</div>' : '') : '<div class="jv-empty">Sin ítems.</div>';
    return '<div class="jv-lane"><h4>' + title + ' <b>' + arr.length + '</b></h4>' + body + '</div>';
  };
  return '<div class="jv-lanes">' + lane('PROPUESTA', lanes.propuesta, '', true) + lane('ALERTAS', lanes.alerta, 'red', true) + lane('APROBADA', lanes.aprobada, 'grn', false) + lane('EJECUTADA', lanes.ejecutada, 'grn', false) + '</div>';
}
function jvFeedHTML() {
  if (!JV.audit.length) return '<div class="jv-feed"><div class="jv-empty" style="padding:12px">Sin registros de bitácora.</div></div>';
  return '<div class="jv-feed">' + JV.audit.map(r => {
    const tm = r.ts ? new Date(r.ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
    let out = ''; try { const o = r.output; if (o && typeof o === 'object') out = o.accion || o.estado || o.nota || ''; } catch (e) {}
    return '<div class="jv-frow"><span class="tm">' + OS_E(tm) + '</span><span class="ag">' + OS_E(jvAgentName(r.agent_id)) + '</span><span class="rs">' + OS_E(out || r.resultado || '') + '</span></div>';
  }).join('') + '</div>';
}

// ════════════════════════════════════════════════════════════════
// VIEW · BRIEF DEL CEO (matutino)
// ════════════════════════════════════════════════════════════════
function jvBriefView() {
  let occ = null; try { if (typeof osCompute === 'function') { const c = osCompute(); occ = c && c.rentas ? c.rentas.occPct : null; } } catch (e) {}
  const pend = JV.props.filter(p => p.estado === 'propuesta').length;
  const informe = (like) => { const a = JV.agents.find(x => (x.nombre || '').indexOf(like) === 0); if (!a) return null; const p = JV.props.find(x => x.agent_id === a.id && x.tipo_accion === 'informe'); return p ? jvEvid(p) : null; };
  const plan = informe('Ops · Líder'); const cal = informe('Ops · Analista de Calidad');
  const topCrit = JV.crit.slice(0, 5).map(f => '<div class="jv-frow"><span class="rs">' + OS_E(f.titulo) + '</span><span class="tm" style="color:var(--jc-pink)">' + jvMoney(f.impacto_usd) + '</span></div>').join('');
  const kpi = (n, l, col) => '<div class="jv-kpi"><div class="n"' + (col ? ' style="color:' + col + '"' : '') + '>' + n + '</div><div class="l">' + l + '</div></div>';
  return '<div class="jv-eyebrow">Brief del CEO</div><div class="jv-lead">El matutino del Cerebro — la foto del día. Se envía a tu WhatsApp 7:45 (Austin).</div>'
    + '<div class="jv-kpis">' + kpi(occ == null ? '—' : occ + '%', 'Ocupación Rentas', 'var(--jc-grn)') + kpi(jvNum(pend), 'Propuestas pendientes', 'var(--jc-amber)') + kpi(jvNum(JV.crit.length), 'Alertas críticas', 'var(--jc-pink)') + kpi(jvMoney(JV.critImpact), 'Impacto crítico', 'var(--jc-pink)') + kpi(jvNum(JV.runsTotal), 'Corridas', '') + '</div>'
    + '<div class="jv-2col"><div class="jv-card"><div class="jv-st">🔴 Top alertas críticas</div>' + (topCrit ? '<div class="jv-feed" style="max-height:none">' + topCrit + '</div>' : '<div class="jv-empty">Sin alertas críticas.</div>') + '</div>'
    + '<div class="jv-card"><div class="jv-st">📋 Plan del día (Ops)</div><div style="font-size:12.5px;color:var(--jc-mut);line-height:1.5">' + OS_E(plan || 'El Ops Líder todavía no generó el plan de hoy.') + '</div>'
    + '<div class="jv-st" style="margin-top:14px">📊 Calidad</div><div style="font-size:12.5px;color:var(--jc-mut);line-height:1.5">' + OS_E(cal || 'Sin informe de calidad reciente.') + '</div></div></div>';
}

// ════════════════════════════════════════════════════════════════
// VIEW · EMPRESAS (Verificador + Reportero por empresa)
// ════════════════════════════════════════════════════════════════
function jvEmpresasView() {
  const cards = JV_EMPRESAS.map(e => {
    const verif = JV.agents.find(a => a.area === e.area && a.capa === 'Integrity');
    const rep = JV.agents.find(a => a.area === e.area && a.capa === 'Report');
    const areaAgentIds = JV.agents.filter(a => a.area === e.area).map(a => a.id);
    const props = JV.props.filter(p => areaAgentIds.includes(p.agent_id));
    const pend = props.filter(p => p.estado === 'propuesta').length;
    const line = (a, lbl) => a ? '<div class="jv-arow" style="margin-bottom:8px"><div class="jv-av">' + osIcon(jvAgentIcon(a), { size: 14 }) + '</div><div class="nm"><b>' + OS_E(a.nombre) + '</b><span>' + lbl + ' · ' + jvFmtTs(JV.lastRun[a.id]) + '</span></div>' + jvBadge(jvAgentStatus(a.id)) + '</div>' : '<div class="jv-empty">' + lbl + ': sin agente</div>';
    return '<div class="jv-card"><div style="display:flex;align-items:center;gap:9px;margin-bottom:12px"><div class="jv-av">' + osIcon(e.icon, { size: 15 }) + '</div><b style="font-size:14px">' + OS_E(e.name) + '</b><span class="jv-chip" style="margin-left:auto">' + pend + ' pendientes · ' + props.length + ' props</span></div>'
      + line(verif, 'Verificador · Integrity') + line(rep, 'Reportero · Report') + '</div>';
  }).join('');
  return '<div class="jv-eyebrow">Empresas</div><div class="jv-lead">Cada empresa tiene su Verificador (integridad) y su Reportero (briefing).</div><div class="jv-2col">' + cards + '</div>';
}

// ════════════════════════════════════════════════════════════════
// VIEW · HORARIOS (cadena diaria + crons live)
// ════════════════════════════════════════════════════════════════
function jvHorariosView() {
  const chain = [
    ['06:45', 'Verificadores ×4', 'chequeo profundo por empresa (Airtable↔OS↔QB↔ClickUp)', false],
    ['07:00', 'Contable & Datos + Operación', 'auditan + proponen correcciones', false],
    ['07:15', 'Reporteros ×4', 'briefing por empresa', false],
    ['07:30', 'Cerebro Ejecutivo', 'consolida → foto ejecutiva', false],
    ['07:45', '→ CEO (WhatsApp / Command Center)', 'matutino del Cerebro a tu teléfono', true],
    ['12:30 / 17:30', 'Sabueso', 'pulso + cierre con Definition of Done', false],
    ['c/15 min', 'Sabueso · watcher', 'alertas 🔴 nuevas al instante', true],
  ];
  const steps = chain.map(s => '<div class="jv-step"><div class="hh">' + s[0] + ' · ' + OS_E(s[1]) + (s[3] ? '<span class="jv-live">cron activo</span>' : '') + '</div><div class="dd">' + OS_E(s[2]) + '</div></div>').join('');
  return '<div class="jv-eyebrow">Horarios</div><div class="jv-lead">La cadena de orquestación diaria. Todo propone → el CEO aprueba → se registra.</div>'
    + '<div class="jv-card"><div class="jv-st">Cadena diaria</div><div class="jv-chain">' + steps + '</div>'
    + '<div class="jv-empty" style="margin-top:12px">Crons de notificación en vivo: <b style="color:var(--jc-grn)">cerebro-matutino</b> (07:45 Austin) · <b style="color:var(--jc-grn)">cerebro-alertas</b> (cada 15 min). La cadena de agentes por empresa es el diseño de orquestación (EQUIPOS-Y-SKILLS).</div></div>';
}

// ════════════════════════════════════════════════════════════════
// VIEW · KNOWLEDGE VAULT (skills + memoria)
// ════════════════════════════════════════════════════════════════
function jvVaultView() {
  const grp = JV_CAPAS.map(c => {
    const ags = JV.agents.filter(a => a.capa === c.capa); if (!ags.length) return '';
    const items = ags.map(a => '<div class="jv-arow" style="margin-bottom:6px"><div class="jv-av">' + osIcon(jvAgentIcon(a), { size: 14 }) + '</div><div class="nm"><b>' + OS_E(a.nombre) + '</b><span>' + OS_E((a.proceso || '').slice(0, 90)) + '</span></div></div>').join('');
    return '<div class="jv-grp" style="--gc:' + c.color + '">' + OS_E(c.name) + '</div>' + items;
  }).join('');
  return '<div class="jv-eyebrow">Knowledge Vault</div><div class="jv-lead">La biblioteca de skills (cada agente = un prompt versionado) + la memoria del Cerebro.</div>'
    + '<div class="jv-kpis" style="grid-template-columns:repeat(3,1fr)"><div class="jv-kpi"><div class="n">' + jvNum(JV.agents.length) + '</div><div class="l">Skills / agentes</div></div>'
    + '<div class="jv-kpi"><div class="n">' + (JV.memCount == null ? '—' : jvNum(JV.memCount)) + '</div><div class="l">Memorias del Cerebro</div></div>'
    + '<div class="jv-kpi"><div class="n">' + JV_CAPAS.length + '</div><div class="l">Capas</div></div></div>'
    + '<div class="jv-alist">' + grp + '</div>';
}

// ════════════════════════════════════════════════════════════════
// VIEW · REPORTES (informes de los agentes)
// ════════════════════════════════════════════════════════════════
function jvReportesView() {
  const informes = JV.props.filter(p => p.tipo_accion === 'informe');
  const rows = informes.length ? informes.slice(0, 40).map(p => '<div class="jv-card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px"><b style="font-size:12.5px;color:var(--jc-cyan)">' + OS_E(jvAgentName(p.agent_id)) + '</b><span class="jv-chip">' + (p.created_at ? new Date(p.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '') + '</span></div><div style="font-size:12.5px;color:var(--jc-mut);margin-top:6px;line-height:1.5">' + OS_E(jvEvid(p)) + '</div></div>').join('') : '<div class="jv-empty">Todavía no hay informes de agentes.</div>';
  return '<div class="jv-eyebrow">Reportes</div><div class="jv-lead">Los briefings e informes que generan los agentes (tipo informe).</div>' + rows;
}

// ════════════════════════════════════════════════════════════════
// ACCIONES (aprobar/rechazar) + chat
// ════════════════════════════════════════════════════════════════
async function jvDecide(id, estado) {
  const p = JV.props.find(x => x.id === id); if (!p || JV.busyId) return;
  const me = jvMe(); const verb = estado === 'aprobada' ? 'Aprobar' : 'Rechazar';
  if (!confirm(verb + ' esta propuesta de "' + jvAgentName(p.agent_id) + '"?')) return;
  JV.busyId = id; if (window.osRender) osRender();
  try {
    const { error: e1 } = await sb.from('agent_proposals').update({ estado: estado, approved_by: me, approved_at: new Date().toISOString() }).eq('id', id);
    if (e1) throw e1;
    const { error: e2 } = await sb.from('agent_audit_log').insert({ agent_id: p.agent_id, proposal_id: id, input: { accion: estado, por: me, tipo: p.tipo_accion }, output: { estado: estado, por: me, accion: verb + ' desde Command Center' }, resultado: 'ok' });
    if (e2) console.warn('audit_log insert:', e2.message);
  } catch (e) { alert('No se pudo ' + verb.toLowerCase() + ': ' + (e.message || e)); }
  JV.busyId = null; await jvLoad(true);
}
window.jvDecide = jvDecide;

function jvSnapshot() {
  const informes = JV.props.filter(p => p.tipo_accion === 'informe').slice(0, 6).map(p => jvEvid(p));
  const pend = JV.props.filter(p => p.estado === 'propuesta');
  const byTipo = {}; pend.forEach(p => { byTipo[p.tipo_accion || 'otro'] = (byTipo[p.tipo_accion || 'otro'] || 0) + 1; });
  let os = null; try { if (typeof osSnapshot === 'function' && typeof osCompute === 'function') os = osSnapshot(osCompute()); } catch (e) {}
  return {
    contexto: 'Command Center del holding Rental Profitss — agentes de IA con aprobación humana (human-in-the-loop).',
    reportes_del_dia: informes,
    propuestas_pendientes: { total: pend.length, por_tipo: byTipo },
    alertas_criticas: { count: JV.crit.length, impacto_usd: Math.round(JV.critImpact), top: JV.crit.slice(0, 8).map(f => ({ titulo: f.titulo, impacto: Math.round(+f.impacto_usd || 0) })) },
    agentes: JV.agents.map(a => ({ nombre: a.nombre, capa: a.capa, area: a.area, riesgo: a.nivel_riesgo, estado: a.estado, ultima_corrida: JV.lastRun[a.id] })),
    holding: os ? os.holding : null, cobranza: os ? os.cobranza : null,
  };
}
async function jvAsk(q) {
  const inp = document.getElementById('jv-ask'); const question = (q || (inp ? inp.value.trim() : '')).trim();
  if (!question || JV.chatBusy) return; if (inp) inp.value = '';
  JV.chatBusy = true; JV.chat.push({ role: 'user', content: question }); JV.chat.push({ role: 'assistant', content: '', thinking: true }); jvRenderChat();
  const history = JV.chat.filter(m => !m.thinking && !m.error).slice(0, -1).map(m => ({ role: m.role, content: m.content }));
  try {
    const tok = await (async () => { try { const s = await sb.auth.getSession(); return (s && s.data.session && s.data.session.access_token) || ''; } catch (e) { return ''; } })();
    const r = await fetch('/api/brain-chat', { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify({ question, snapshot: jvSnapshot(), history }) });
    const data = await r.json().catch(() => ({})); JV.chat.pop();
    JV.chat.push(r.ok ? { role: 'assistant', content: data.answer || 'Sin respuesta.' } : { role: 'assistant', content: data.error || ('Error (HTTP ' + r.status + ').'), error: true });
  } catch (e) { JV.chat.pop(); JV.chat.push({ role: 'assistant', content: 'No pude conectar: ' + (e.message || e), error: true }); }
  JV.chatBusy = false; jvRenderChat();
}
window.jvAsk = jvAsk;
