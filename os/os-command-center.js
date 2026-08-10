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
  capital: null, nsCfg: null, nsEditing: false, _clock: null,
  vaultSel: null, vaultNodes: {}, mapEdit: null, mapBusy: false, filterLinea: null,
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
  { k: 'network', ic: 'network', t: 'Mapa de Agentes' },
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
];
const JV_FUENTES = [
  { id: 'src-airtable', label: 'Airtable', icon: 'table', desc: 'Bases Rentas / Fix&Flip / Remodelación — origen operativo de las casas.' },
  { id: 'src-qbo', label: 'QuickBooks', icon: 'receipt', desc: 'Flipping Rentals LLC + realms — la contabilidad real.' },
  { id: 'src-clickup', label: 'ClickUp', icon: 'check-circle', desc: 'Cronograma y tareas de operación por empresa.' },
  { id: 'src-supabase', label: 'Supabase OS', icon: 'dna', desc: 'agent_registry · agent_proposals · agent_audit_log — el OS compartido.' },
];
// Líneas de negocio (organigrama del Mapa de Agentes) — orden canónico
const JV_LINEAS = [
  { linea: 'Comando', icon: 'brain', color: 'var(--jc-purple)' },
  { linea: 'Meta', icon: 'users', color: 'var(--jc-blue)' },
  { linea: 'Rentas', icon: 'house', color: 'var(--jc-grn)' },
  { linea: 'Remodelación', icon: 'hammer', color: 'var(--jc-amber)' },
  { linea: 'Fix & Flip', icon: 'construction', color: 'var(--jc-cyan)' },
  { linea: 'Transversal (legacy)', icon: 'library', color: 'var(--jc-mut)' },
  { linea: 'Transversal (Señal)', icon: 'alert', color: 'var(--jc-amber)' },
];
const JV_LINEA_PLANNED = [];
function jvEstadoBadge(e) {
  const m = { 'activo': ['b-work', 'activo'], 'live': ['b-work', 'activo'], 'asistido': ['b-asis', 'asistido'], 'dry-run': ['b-wait', 'dry-run'], 'planificado': ['b-idle', 'planificado'], 'en-consolidación': ['b-cons', 'en consolidación'], 'pausado': ['b-paused', 'pausado'] };
  const x = m[e] || ['b-idle', e || '—'];
  return '<span class="jv-badge ' + x[0] + '">' + x[1] + '</span>';
}
function jvLineaStatus(linea) {
  const ags = JV.agents.filter(a => a.linea === linea);
  if (ags.some(a => ['activo', 'live', 'asistido'].includes(a.estado))) return 'work';
  if (ags.some(a => a.estado === 'dry-run')) return 'wait';
  return 'idle';
}

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
    '#os-root .jv-mini{display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:8px;font-size:11.5px;color:var(--jc-tx);border:1px solid transparent}',
    '#os-root .jv-mini:hover{background:rgba(167,139,250,.06)}',
    '#os-root .jv-mini.on{background:rgba(167,139,250,.16);border-color:rgba(167,139,250,.4);color:#fff}',
    '#os-root .jv-mini-all{color:var(--jc-mut)}',
    '#os-root .jv-filter-bar{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:var(--jc-tx);background:rgba(167,139,250,.10);border:1px solid rgba(167,139,250,.28);border-radius:20px;padding:5px 12px;margin:-8px 0 18px}',
    '#os-root .jv-filter-x{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--jc-mut);background:transparent;border:1px solid var(--jc-line);border-radius:14px;padding:2px 9px;cursor:pointer}',
    '#os-root .jv-filter-x:hover{color:#fff;border-color:var(--jc-purple)}',
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
    // HUD header + reloj
    '#os-root .jv-hud-hdr{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;gap:16px;flex-wrap:wrap}',
    '#os-root .jv-hi{font-size:23px;font-weight:700;letter-spacing:-.01em}',
    '#os-root .jv-hi span{color:var(--jc-cyan)}',
    '#os-root .jv-hud-date{font-size:12px;color:var(--jc-mut);margin-top:3px}',
    '#os-root .jv-clock{text-align:right}',
    '#os-root .jv-clock .t{font-size:25px;font-weight:700;font-variant-numeric:tabular-nums}',
    '#os-root .jv-clock .w{font-size:11px;color:var(--jc-mut)}',
    // strip contadores
    '#os-root .jv-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px}',
    '@media(max-width:1000px){#os-root .jv-strip{grid-template-columns:repeat(2,1fr)}}',
    '#os-root .jv-ct{background:var(--jc-card);border:1px solid var(--jc-line);border-radius:11px;padding:11px 13px}',
    '#os-root .jv-ct .n{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums}',
    '#os-root .jv-ct .l{font-size:9.5px;letter-spacing:.06em;color:var(--jc-mut);text-transform:uppercase;margin-top:2px}',
    // north-star
    '#os-root .jv-ns{background:linear-gradient(90deg,rgba(167,139,250,.12),rgba(56,189,248,.06));border:1px solid rgba(167,139,250,.28);border-radius:13px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:16px}',
    '#os-root .jv-ns .star{color:var(--jc-amber);display:flex}',
    '#os-root .jv-ns .body{flex:1;min-width:0}',
    '#os-root .jv-ns .lab{font-size:10px;letter-spacing:.16em;color:var(--jc-purple);text-transform:uppercase}',
    '#os-root .jv-ns .goal{font-size:15px;font-weight:650;margin:2px 0 8px}',
    '#os-root .jv-ns-sub{font-size:10.5px;color:var(--jc-mut);margin-top:6px}',
    '#os-root .jv-bar{height:8px;border-radius:6px;background:rgba(255,255,255,.06);overflow:hidden}',
    '#os-root .jv-bar>span{display:block;height:100%;background:linear-gradient(90deg,var(--jc-purple),var(--jc-cyan));border-radius:6px;transition:width .4s}',
    '#os-root .jv-pct{font-size:20px;font-weight:700;color:var(--jc-cyan);font-variant-numeric:tabular-nums}',
    '#os-root .jv-nsbtn{background:var(--jc-card);border:1px solid var(--jc-line);color:var(--jc-mut);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:5px}',
    '#os-root .jv-nsbtn:hover{color:#fff;border-color:var(--jc-purple)}',
    '#os-root .jv-nsbtn.ok{color:var(--jc-grn);border-color:rgba(52,211,153,.35)}',
    '#os-root .jv-ns-edit{display:block}',
    '#os-root .jv-nsin{background:var(--jc-bg);border:1px solid var(--jc-line);color:var(--jc-tx);border-radius:8px;padding:6px 10px;font-size:12.5px;outline:none}',
    '#os-root .jv-nsin:focus{border-color:var(--jc-purple)}',
    // command deck
    '#os-root .jv-deck{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}',
    '@media(max-width:1000px){#os-root .jv-deck{grid-template-columns:repeat(2,1fr)}}',
    '#os-root .jv-cmd{background:var(--jc-card);border:1px solid var(--jc-line);border-radius:12px;padding:14px;cursor:pointer;transition:.15s;position:relative;overflow:hidden}',
    '#os-root .jv-cmd::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--c)}',
    '#os-root .jv-cmd:hover{border-color:var(--c);box-shadow:0 0 20px color-mix(in srgb,var(--c) 22%,transparent)}',
    '#os-root .jv-cmd .ic{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--c) 15%,transparent);color:var(--c);margin-bottom:9px}',
    '#os-root .jv-cmd b{font-size:13px;display:block}',
    '#os-root .jv-cmd span{font-size:10.5px;color:var(--jc-mut)}',
    // Mapa de Agentes (organigrama + fichas)
    '#os-root .b-asis{background:rgba(56,189,248,.16);color:var(--jc-cyan)}',
    '#os-root .b-cons{background:rgba(124,136,163,.16);color:var(--jc-mut)}',
    '#os-root .b-paused{background:rgba(248,113,113,.16);color:#f87171}',
    '#os-root .jv-linea-h{display:flex;align-items:center;gap:9px;margin:22px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--jc-line)}',
    '#os-root .jv-linea-h .ic{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--lc) 16%,transparent);color:var(--lc)}',
    '#os-root .jv-linea-h b{font-size:15px}',
    '#os-root .jv-linea-h .jv-chip{margin-left:auto}',
    '#os-root .jv-eqh{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--jc-mut);margin:12px 2px 8px}',
    '#os-root .jv-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}',
    '#os-root .jv-card2{background:var(--jc-card);border:1px solid var(--jc-line);border-radius:13px;padding:14px;display:flex;flex-direction:column}',
    '#os-root .jv-card2.jv-editing{border-color:var(--jc-purple)}',
    '#os-root .jv-c2-top{display:flex;align-items:center;gap:10px;margin-bottom:10px}',
    '#os-root .jv-c2-nm{flex:1;min-width:0}',
    '#os-root .jv-c2-nm b{font-size:13.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#os-root .jv-c2-nm span{display:block;font-size:10px;color:var(--jc-mut);margin-top:1px}',
    '#os-root .jv-c2-resp{font-size:12px;color:var(--jc-tx);opacity:.9;line-height:1.5;margin-bottom:8px}',
    '#os-root .jv-c2-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}',
    '#os-root .jv-c2-tareas{font-size:11px;color:var(--jc-mut);line-height:1.55;margin-bottom:10px}',
    '#os-root .jv-c2-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:auto;padding-top:8px;border-top:1px solid var(--jc-line)}',
    '#os-root .jv-c2-act{display:flex;gap:6px;margin-top:10px}',
    '#os-root .jv-c2-act button{background:transparent;border:1px solid var(--jc-line);color:var(--jc-mut);border-radius:8px;padding:5px 9px;cursor:pointer;font-size:11px}',
    '#os-root .jv-c2-act button:hover:not(:disabled){color:#fff;border-color:var(--jc-purple)}',
    '#os-root .jv-c2-act button:disabled{opacity:.35;cursor:default}',
    '#os-root .jv-c2-act .ok{color:var(--jc-grn);border-color:rgba(52,211,153,.35)}',
    '#os-root .jv-el{display:block;font-size:10.5px;color:var(--jc-mut);margin-bottom:8px}',
    '#os-root .jv-erow{display:flex;gap:8px}#os-root .jv-erow .jv-el{flex:1}',
    '#os-root .jv-ein{width:100%;margin-top:3px;background:var(--jc-bg);border:1px solid var(--jc-line);color:var(--jc-tx);border-radius:8px;padding:6px 9px;font-size:12px;outline:none;font-family:inherit}',
    '#os-root textarea.jv-ein{min-height:52px;resize:vertical}',
    '#os-root .jv-ein:focus{border-color:var(--jc-purple)}',
    // DNA map (Knowledge Vault)
    '#os-root .jv-vault-wrap{position:relative;height:640px;margin-top:8px;border:1px solid var(--jc-line);border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 46%,rgba(20,30,60,.45),var(--jc-bg) 72%)}',
    '#os-root .jv-vstage{position:absolute;inset:0;width:100%;height:100%}',
    '#os-root .jv-vnode{cursor:pointer}',
    '#os-root .jv-vnode circle{transition:.15s}',
    '#os-root .jv-vnode:hover circle{filter:brightness(1.35)}',
    '#os-root .jv-vnode.sel circle{filter:brightness(1.45)}',
    '#os-root .jv-vnode text{user-select:none}',
    '#os-root .jv-vcount{position:absolute;top:14px;right:14px;display:flex;gap:8px;z-index:3}',
    '#os-root .jv-vcount .cbox{background:var(--jc-card);border:1px solid var(--jc-line);border-radius:10px;padding:6px 12px;text-align:center}',
    '#os-root .jv-vcount .n{font-size:16px;font-weight:750;color:var(--jc-cyan);font-variant-numeric:tabular-nums}',
    '#os-root .jv-vcount .l{font-size:8.5px;letter-spacing:.08em;color:var(--jc-mut);text-transform:uppercase}',
    '#os-root .jv-vlegend{position:absolute;left:14px;bottom:14px;background:var(--jc-card);border:1px solid var(--jc-line);border-radius:12px;padding:10px 12px;z-index:3}',
    '#os-root .jv-vlegend .li{display:flex;align-items:center;gap:8px;font-size:11px;padding:2px 0;color:var(--jc-mut)}',
    '#os-root .jv-vlegend .sw{width:10px;height:10px;border-radius:50%}',
    '#os-root .jv-vpanel{position:absolute;right:14px;top:70px;width:262px;background:var(--jc-card);border:1px solid var(--jc-line);border-radius:14px;padding:16px;z-index:3;max-height:540px;overflow:auto}',
    '#os-root .jv-vp-ic{margin-bottom:2px}',
    '#os-root .jv-vpanel h3{font-size:15px;margin:4px 0 2px}',
    '#os-root .jv-vp-lay{font-size:10px;letter-spacing:.1em;text-transform:uppercase}',
    '#os-root .jv-vpanel p{font-size:12px;color:var(--jc-mut);margin-top:10px;line-height:1.5}',
    '#os-root .jv-vp-meta{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px}',
    '#os-root .jv-vp-meta .tag{font-size:10px;padding:3px 8px;border-radius:8px;background:rgba(120,140,180,.14);color:var(--jc-tx)}',
    '#os-root .jv-vp-run{margin-top:12px;font-size:11px;color:var(--jc-mut);border-top:1px solid var(--jc-line);padding-top:10px}',
    '#os-root .jv-vhint{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);font-size:10.5px;color:var(--jc-mut);z-index:2;pointer-events:none}',
    '@media(max-width:1000px){#os-root .jv-vpanel{position:static;width:auto;max-height:none;margin-top:10px}#os-root .jv-vault-wrap{height:auto;padding-bottom:10px}#os-root .jv-vstage{position:relative;height:440px}#os-root .jv-vcount{position:static;justify-content:flex-end;padding:10px 10px 0}#os-root .jv-vlegend{position:static;margin:10px}}',
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
    const [reg, props, audit, runs, crit, mem, cap, ns] = await Promise.all([
      sb.from('agent_registry').select('id,nombre,proceso,empresa,area,capa,squad,linea,equipo,responsabilidad,skills,tareas,disparadores,nivel_riesgo,estado,dueno,dueno_humano,eval_score,eval_fecha,parent_id,orden').is('deleted_at', null).order('orden', { nullsFirst: false }),
      sb.from('agent_proposals').select('id,agent_id,tipo_accion,property_id,payload,evidencia,estado,approved_by,approved_at,created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(300),
      sb.from('agent_audit_log').select('id,agent_id,proposal_id,resultado,output,ts').order('ts', { ascending: false }).limit(40),
      sb.from('agent_audit_log').select('id', { count: 'exact', head: true }),
      sb.from('ct_findings').select('titulo,impacto_usd').eq('active', true).is('resolved_at', null).eq('severidad', 'critica').order('impacto_usd', { ascending: false, nullsFirst: false }),
      sb.from('pm_brain_memory').select('id', { count: 'exact', head: true }).then(r => r).catch(() => ({ count: null })),
      sb.from('v_inversionistas').select('capital_desplegado').then(r => r).catch(() => ({ data: null })),
      sb.from('cc_northstar').select('*').maybeSingle().then(r => r).catch(() => ({ data: null })),
    ]);
    if (reg.error) throw reg.error;
    JV.agents = reg.data || [];
    JV.props = props.error ? [] : (props.data || []);
    JV.audit = audit.error ? [] : (audit.data || []);
    JV.runsTotal = runs.count || 0;
    JV.crit = crit.error ? [] : (crit.data || []);
    JV.critImpact = JV.crit.reduce((s, f) => s + (+f.impacto_usd || 0), 0);
    JV.memCount = (mem && typeof mem.count === 'number') ? mem.count : null;
    JV.capital = (cap && cap.data) ? cap.data.reduce((s, r) => s + (+r.capital_desplegado || 0), 0) : null;
    JV.nsCfg = (ns && ns.data) ? ns.data : null;
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
// Filtro del Mapa de Agentes por escuadra/línea (sidebar "Escuadras")
function jvFilterLinea(linea) { JV.filterLinea = (JV.filterLinea === linea) ? null : linea; JV.tab = 'network'; if (window.osRender) osRender(); }
window.jvFilterLinea = jvFilterLinea;
function jvFilterClear() { JV.filterLinea = null; JV.tab = 'network'; if (window.osRender) osRender(); }
window.jvFilterClear = jvFilterClear;
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
  const todos = '<div class="jv-mini jv-mini-all' + (JV.filterLinea == null ? ' on' : '') + '" onclick="jvFilterClear()" style="cursor:pointer"><div class="ic">' + osIcon('list', { size: 13 }) + '</div>Todos<span class="stt idle" style="visibility:hidden"></span></div>';
  const minis = JV_LINEAS.filter(L => JV.agents.some(a => a.linea === L.linea) || JV_LINEA_PLANNED.includes(L.linea)).map(L => {
    const st = jvLineaStatus(L.linea);
    return '<div class="jv-mini' + (JV.filterLinea === L.linea ? ' on' : '') + '" onclick="jvFilterLinea(\'' + OS_E(L.linea).replace(/'/g, "\\'") + '\')" style="cursor:pointer"><div class="ic">' + osIcon(L.icon, { size: 13 }) + '</div>' + OS_E(L.linea) + '<span class="stt ' + st + '"></span></div>';
  }).join('');
  return '<aside class="jv-side"><div class="jv-logo"><div class="m"></div><b>Rental Profitss</b></div>'
    + '<nav class="jv-nav">' + nav + '</nav>'
    + '<div class="jv-lbl">Escuadras</div>' + todos + minis + '</aside>';
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
    default: return jvMapaView();
  }
}

// ════════════════════════════════════════════════════════════════
// VIEW · MAPA DE AGENTES (organigrama por escuadra + fichas editables)
// ════════════════════════════════════════════════════════════════
function jvMapaView() {
  const canEdit = jvRole() === 'admin';
  const activos = JV.agents.filter(a => ['activo', 'live'].includes(a.estado)).length;
  const flt = JV.filterLinea;
  const lineas = flt ? JV_LINEAS.filter(L => L.linea === flt) : JV_LINEAS;
  let html = '<div class="jv-eyebrow">Mapa de Agentes</div>'
    + '<div class="jv-lead">La empresa de trabajadores digitales — holding → líneas → escuadras → agentes. ' + JV.agents.length + ' agentes · ' + activos + ' activos. Tarjetas editables' + (canEdit ? '' : ' (solo admin)') + '.</div>'
    + (flt ? '<div class="jv-filter-bar">' + osIcon('filter', { size: 13 }) + ' Filtrando: <b>' + OS_E(flt) + '</b> <button class="jv-filter-x" onclick="jvFilterClear()">' + osIcon('x', { size: 12 }) + ' Todos</button></div>' : '');
  lineas.forEach(L => {
    const ags = JV.agents.filter(a => a.linea === L.linea).sort((a, b) => (a.orden == null ? 99 : a.orden) - (b.orden == null ? 99 : b.orden));
    if (!ags.length) {
      if (JV_LINEA_PLANNED.includes(L.linea)) html += jvLineaHeader(L, 0, true);
      return;
    }
    html += jvLineaHeader(L, ags.length, false);
    const equipos = []; ags.forEach(a => { const e = a.equipo || '—'; if (!equipos.includes(e)) equipos.push(e); });
    equipos.forEach(eq => {
      const eqAgs = ags.filter(a => (a.equipo || '—') === eq);
      html += (eq !== L.linea ? '<div class="jv-eqh">' + OS_E(eq) + '</div>' : '')
        + '<div class="jv-cards">' + eqAgs.map((a, i) => jvAgentCard(a, canEdit, i > 0, i < eqAgs.length - 1)).join('') + '</div>';
    });
  });
  return html;
}
function jvLineaHeader(L, count, planned) {
  return '<div class="jv-linea-h" style="--lc:' + L.color + '"><div class="ic">' + osIcon(L.icon, { size: 16 }) + '</div><b>' + OS_E(L.linea) + '</b>'
    + (planned ? '<span class="jv-chip">escuadra planificada</span>' : '<span class="jv-chip">' + count + ' agente' + (count !== 1 ? 's' : '') + '</span>') + '</div>';
}
function jvAgentCard(a, canEdit, canUp, canDown) {
  if (JV.mapEdit === a.id) return jvAgentEditForm(a);
  const skills = Array.isArray(a.skills) ? a.skills : [];
  const tareas = Array.isArray(a.tareas) ? a.tareas : [];
  const disp = (a.disparadores && typeof a.disparadores === 'object') ? a.disparadores : {};
  const dispStr = Object.keys(disp).map(k => k + ': ' + disp[k]).join(' · ');
  const evalStr = a.eval_score != null ? ('eval ' + a.eval_score + '%' + (a.eval_fecha ? ' · ' + a.eval_fecha : '')) : '';
  return '<div class="jv-card2">'
    + '<div class="jv-c2-top"><div class="jv-av">' + osIcon(jvAgentIcon(a), { size: 15 }) + '</div>'
    + '<div class="jv-c2-nm"><b>' + OS_E(a.nombre) + '</b><span>' + OS_E((a.capa || '') + ' · ' + jvFmtTs(JV.lastRun[a.id])) + '</span></div>'
    + jvEstadoBadge(a.estado) + '</div>'
    + '<p class="jv-c2-resp">' + OS_E(a.responsabilidad || a.proceso || '') + '</p>'
    + (skills.length ? '<div class="jv-c2-chips">' + skills.slice(0, 6).map(s => '<span class="jv-chip">' + OS_E(String(s)) + '</span>').join('') + '</div>' : '')
    + (tareas.length ? '<div class="jv-c2-tareas">' + tareas.slice(0, 4).map(t => '<div>· ' + OS_E(String(t)) + '</div>').join('') + '</div>' : '')
    + '<div class="jv-c2-meta"><span class="jv-chip">' + OS_E(a.nivel_riesgo || '—') + '</span>'
    + (evalStr ? '<span class="jv-chip">' + OS_E(evalStr) + '</span>' : '')
    + (a.dueno_humano ? '<span class="jv-chip">' + osIcon('user', { size: 11 }) + ' ' + OS_E(a.dueno_humano) + '</span>' : '')
    + (dispStr ? '<span class="jv-chip">' + osIcon('clock', { size: 11 }) + ' ' + OS_E(dispStr) + '</span>' : '') + '</div>'
    + (canEdit ? '<div class="jv-c2-act"><button onclick="jvMapaEdit(\'' + a.id + '\')">' + osIcon('pencil', { size: 12 }) + ' Editar</button>'
      + '<button onclick="jvMapaMove(\'' + a.id + '\',-1)"' + (canUp ? '' : ' disabled') + ' title="Subir">↑</button>'
      + '<button onclick="jvMapaMove(\'' + a.id + '\',1)"' + (canDown ? '' : ' disabled') + ' title="Bajar">↓</button></div>' : '')
    + '</div>';
}
function jvAgentEditForm(a) {
  const skills = (Array.isArray(a.skills) ? a.skills : []).join(', ');
  const tareas = (Array.isArray(a.tareas) ? a.tareas : []).join('\n');
  const estOpts = ['activo', 'asistido', 'dry-run', 'planificado', 'en-consolidación', 'pausado'].map(e => '<option' + (a.estado === e ? ' selected' : '') + '>' + e + '</option>').join('');
  const rskOpts = ['P1', 'P2', 'P3'].map(r => '<option' + (a.nivel_riesgo === r ? ' selected' : '') + '>' + r + '</option>').join('');
  return '<div class="jv-card2 jv-editing">'
    + '<div class="jv-c2-nm"><b>' + OS_E(a.nombre) + '</b><span>' + OS_E(a.linea || '') + ' · ' + OS_E(a.equipo || '') + '</span></div>'
    + '<label class="jv-el">Responsabilidad<textarea id="jve-resp" class="jv-ein">' + OS_E(a.responsabilidad || '') + '</textarea></label>'
    + '<div class="jv-erow"><label class="jv-el">Estado<select id="jve-est" class="jv-ein">' + estOpts + '</select></label><label class="jv-el">Riesgo<select id="jve-rsk" class="jv-ein">' + rskOpts + '</select></label></div>'
    + '<label class="jv-el">Dueño humano<input id="jve-duh" class="jv-ein" value="' + OS_E(a.dueno_humano || '') + '"></label>'
    + '<label class="jv-el">Skills (separadas por coma)<input id="jve-skills" class="jv-ein" value="' + OS_E(skills) + '"></label>'
    + '<label class="jv-el">Tareas (una por línea)<textarea id="jve-tareas" class="jv-ein">' + OS_E(tareas) + '</textarea></label>'
    + '<div class="jv-c2-act"><button class="ok" onclick="jvMapaSave(\'' + a.id + '\')">Guardar</button><button onclick="jvMapaCancel()">Cancelar</button></div>'
    + '</div>';
}
function jvMapaEdit(id) { JV.mapEdit = id; if (window.osRender) osRender(); }
window.jvMapaEdit = jvMapaEdit;
function jvMapaCancel() { JV.mapEdit = null; if (window.osRender) osRender(); }
window.jvMapaCancel = jvMapaCancel;
async function jvMapaSave(id) {
  const g = x => document.getElementById(x);
  const resp = (g('jve-resp') || {}).value || '';
  const est = (g('jve-est') || {}).value; const rsk = (g('jve-rsk') || {}).value;
  const duh = (g('jve-duh') || {}).value || '';
  const skills = ((g('jve-skills') || {}).value || '').split(',').map(s => s.trim()).filter(Boolean);
  const tareas = ((g('jve-tareas') || {}).value || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (JV.mapBusy) return; JV.mapBusy = true;
  try {
    const { error } = await sb.from('agent_registry').update({ responsabilidad: resp, estado: est, nivel_riesgo: rsk, dueno_humano: duh, skills, tareas, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    await sb.from('agent_audit_log').insert({ agent_id: id, input: { accion: 'editar_ficha', por: jvMe() }, output: { campos: ['responsabilidad', 'estado', 'riesgo', 'dueno_humano', 'skills', 'tareas'], estado: est }, resultado: 'ok' }).catch(() => {});
    JV.mapEdit = null; await jvLoad(true);
  } catch (e) { alert('No se pudo guardar la ficha: ' + (e.message || e)); }
  finally { JV.mapBusy = false; }
}
window.jvMapaSave = jvMapaSave;
async function jvMapaMove(id, dir) {
  if (JV.mapBusy) return; JV.mapBusy = true;
  try {
    const me = JV.agents.find(x => x.id === id); if (!me) return;
    // orden FRESCO de la DB (no confiar en JV.agents en memoria) → swap robusto
    const { data: sibs, error: e0 } = await sb.from('agent_registry').select('id,orden').eq('linea', me.linea).eq('equipo', me.equipo || '').is('deleted_at', null).order('orden', { nullsFirst: false });
    if (e0) throw e0;
    const list = sibs || [];
    const idx = list.findIndex(s => s.id === id); const j = idx + dir;
    if (idx < 0 || j < 0 || j >= list.length) return;
    const a = list[idx], b = list[j];
    const { error: e1 } = await sb.from('agent_registry').update({ orden: b.orden }).eq('id', a.id); if (e1) throw e1;
    const { error: e2 } = await sb.from('agent_registry').update({ orden: a.orden }).eq('id', b.id); if (e2) throw e2;
    await sb.from('agent_audit_log').insert({ agent_id: id, input: { accion: 'reordenar', por: jvMe(), dir }, output: { de: a.orden, a: b.orden }, resultado: 'ok' }).catch(() => {});
    await jvLoad(true);
  } catch (e) { alert('No se pudo reordenar: ' + (e.message || e)); }
  finally { JV.mapBusy = false; }
}
window.jvMapaMove = jvMapaMove;

// ════════════════════════════════════════════════════════════════
// VIEW · COMMAND CENTER (dashboard: KPIs + orbe + chat + lanes + feed)
// ════════════════════════════════════════════════════════════════
function jvDashboard() {
  jvClockStart();
  return jvHudHeader() + jvCounters() + jvNorthStar() + jvDeck() + jvCore() + jvChatUI()
    + '<div class="jv-2col"><div><div class="jv-st">Task lanes · propuestas en vivo</div>' + jvLanesHTML() + '</div>'
    + '<div><div class="jv-st">Bitácora · agent_audit_log</div>' + jvFeedHTML() + '</div></div>';
}

// ─── métricas vivas del holding (para strip + North-Star) ───
function jvMetrics() {
  let occ = null, deuda = null;
  try { if (typeof osCompute === 'function') { const c = osCompute(); if (c) { occ = c.rentas ? c.rentas.occPct : null; deuda = c.cobranza ? c.cobranza.total : null; } } } catch (e) {}
  const pend = JV.props.filter(p => p.estado === 'propuesta').length;
  return { ocupacion: occ, deuda: deuda, pendientes: pend, criticas: JV.crit.length, capital: JV.capital };
}
function jvGreetName() {
  try {
    const u = state && state.user;
    const fn = u && u.user_metadata && u.user_metadata.full_name;
    if (fn) return String(fn).trim().split(/\s+/)[0];
    const em = u && u.email || '';
    if (/^gerencia@/.test(em)) return 'Nicolás';
    if (em) { const p = em.split('@')[0]; return p.charAt(0).toUpperCase() + p.slice(1); }
  } catch (e) {}
  return 'Nicolás';
}
function jvHudHeader() {
  const d = new Date();
  const fecha = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Chicago' });
  const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Chicago' });
  return '<div class="jv-hud-hdr"><div><div class="jv-hi">Buen día, <span>' + OS_E(jvGreetName()) + '</span> 👋</div><div class="jv-hud-date">' + OS_E(fecha.charAt(0).toUpperCase() + fecha.slice(1)) + ' · todo bajo control</div></div>'
    + '<div class="jv-clock"><div class="t" id="jv-clock">' + hora + '</div><div class="w">Austin, TX</div></div></div>';
}
function jvClockStart() {
  if (JV._clock) { clearInterval(JV._clock); JV._clock = null; }
  JV._clock = setInterval(function () {
    const el = document.getElementById('jv-clock');
    if (!el) { clearInterval(JV._clock); JV._clock = null; return; }
    el.textContent = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Chicago' });
  }, 1000);
}
function jvCounters() {
  const m = jvMetrics();
  const ct = (n, l, col) => '<div class="jv-ct"><div class="n"' + (col ? ' style="color:' + col + '"' : '') + '>' + n + '</div><div class="l">' + l + '</div></div>';
  return '<div class="jv-strip">'
    + ct(m.ocupacion == null ? '—' : m.ocupacion + '%', 'Ocupación Rentas', 'var(--jc-grn)')
    + ct(m.deuda == null ? '—' : jvMoney(m.deuda), 'Deuda cobrable', 'var(--jc-amber)')
    + ct(jvNum(m.pendientes), 'Propuestas esperando', m.pendientes ? 'var(--jc-amber)' : '')
    + ct(jvNum(m.criticas), 'Alertas críticas', m.criticas ? 'var(--jc-pink)' : 'var(--jc-grn)')
    + ct(m.capital == null ? '—' : jvMoney(m.capital), 'Capital inversionistas', '')
    + '</div>';
}

// ─── North-Star ───
function jvNsProgress() {
  const c = JV.nsCfg; if (!c) return { pct: 0, cur: null, has: false };
  if (c.metric_key) {
    const m = jvMetrics(); const cur = m[c.metric_key];
    const tgt = +c.target || 0;
    if (cur == null || !tgt) return { pct: 0, cur: cur, has: true };
    return { pct: Math.max(0, Math.min(100, Math.round(cur / tgt * 100))), cur: cur, has: true };
  }
  return { pct: Math.max(0, Math.min(100, Math.round(+c.manual_pct || 0))), cur: null, has: true };
}
function jvNorthStar() {
  const c = JV.nsCfg;
  if (JV.nsEditing) return jvNsEditor();
  if (!c) return '<div class="jv-ns"><div class="star">' + osIcon('target', { size: 20 }) + '</div><div class="body"><div class="lab">North Star del holding</div><div class="goal">Sin meta configurada</div></div><button class="jv-nsbtn" onclick="jvNsEdit()">Configurar</button></div>';
  const p = jvNsProgress();
  const sub = c.metric_key ? ('en vivo · ' + (p.cur == null ? '—' : (c.metric_key === 'deuda' || c.metric_key === 'capital' ? jvMoney(p.cur) : jvNum(p.cur))) + ' / meta ' + jvNum(c.target) + (c.unit || '')) : 'meta manual';
  return '<div class="jv-ns"><div class="star">' + osIcon('target', { size: 20 }) + '</div>'
    + '<div class="body"><div class="lab">North Star del holding</div><div class="goal">' + OS_E(c.label) + '</div>'
    + '<div class="jv-bar"><span style="width:' + p.pct + '%"></span></div><div class="jv-ns-sub">' + OS_E(sub) + '</div></div>'
    + '<div class="jv-pct">' + p.pct + '%</div><button class="jv-nsbtn" onclick="jvNsEdit()" title="Editar meta">' + osIcon('pencil', { size: 14 }) + '</button></div>';
}
function jvNsEditor() {
  const c = JV.nsCfg || { label: '', metric_key: 'ocupacion', target: 95, manual_pct: 50, unit: '%' };
  const live = !!c.metric_key;
  const opts = [['ocupacion', 'Ocupación Rentas (%)'], ['deuda', 'Deuda cobrable ($)'], ['pendientes', 'Propuestas pendientes'], ['criticas', 'Alertas críticas'], ['capital', 'Capital inversionistas ($)']]
    .map(o => '<option value="' + o[0] + '"' + (c.metric_key === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('');
  return '<div class="jv-ns jv-ns-edit"><div class="body"><div class="lab">Editar North Star</div>'
    + '<input id="jv-ns-label" class="jv-nsin" placeholder="Nombre de la meta" value="' + OS_E(c.label || '') + '" style="width:100%;margin:6px 0">'
    + '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:12px">'
    + '<label><input type="radio" name="jv-nsmode" value="live"' + (live ? ' checked' : '') + ' onchange="jvNsMode()"> Métrica en vivo</label>'
    + '<label><input type="radio" name="jv-nsmode" value="manual"' + (live ? '' : ' checked') + ' onchange="jvNsMode()"> Manual %</label></div>'
    + '<div id="jv-ns-live" style="display:' + (live ? 'flex' : 'none') + ';gap:8px;margin-top:8px;align-items:center">'
    + '<select id="jv-ns-metric" class="jv-nsin">' + opts + '</select> meta: <input id="jv-ns-target" class="jv-nsin" type="number" value="' + (c.target != null ? c.target : 95) + '" style="width:100px"></div>'
    + '<div id="jv-ns-manual" style="display:' + (live ? 'none' : 'flex') + ';gap:8px;margin-top:8px;align-items:center">% avance: <input id="jv-ns-pct" class="jv-nsin" type="number" min="0" max="100" value="' + (c.manual_pct != null ? c.manual_pct : 50) + '" style="width:100px"></div>'
    + '<div style="margin-top:12px;display:flex;gap:8px"><button class="jv-nsbtn ok" onclick="jvNsSave()">Guardar</button><button class="jv-nsbtn" onclick="jvNsCancel()">Cancelar</button></div>'
    + '</div></div>';
}
function jvNsEdit() { JV.nsEditing = true; if (window.osRender) osRender(); }
window.jvNsEdit = jvNsEdit;
function jvNsCancel() { JV.nsEditing = false; if (window.osRender) osRender(); }
window.jvNsCancel = jvNsCancel;
function jvNsMode() {
  const live = document.querySelector('input[name="jv-nsmode"]:checked');
  const isLive = live && live.value === 'live';
  const l = document.getElementById('jv-ns-live'); const mm = document.getElementById('jv-ns-manual');
  if (l) l.style.display = isLive ? 'flex' : 'none'; if (mm) mm.style.display = isLive ? 'none' : 'flex';
}
window.jvNsMode = jvNsMode;
async function jvNsSave() {
  const label = (document.getElementById('jv-ns-label') || {}).value || '';
  const mode = (document.querySelector('input[name="jv-nsmode"]:checked') || {}).value || 'live';
  const row = { id: true, label: label.trim() || 'North Star', updated_by: jvMe(), updated_at: new Date().toISOString() };
  if (mode === 'live') { row.metric_key = (document.getElementById('jv-ns-metric') || {}).value || 'ocupacion'; row.target = Number((document.getElementById('jv-ns-target') || {}).value) || 0; row.manual_pct = null; }
  else { row.metric_key = null; row.manual_pct = Number((document.getElementById('jv-ns-pct') || {}).value) || 0; }
  try {
    const { error } = await sb.from('cc_northstar').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    JV.nsCfg = Object.assign({}, JV.nsCfg, row); JV.nsEditing = false;
    if (window.osRender) osRender();
  } catch (e) { alert('No se pudo guardar la meta: ' + (e.message || e)); }
}
window.jvNsSave = jvNsSave;

// ─── Command Deck ───
const JV_DECK = [
  { k: 'matutino', ic: 'sun', c: 'var(--jc-cyan)', t: 'Reporte matutino', s: 'El brief del Cerebro de hoy' },
  { k: 'aprobar', ic: 'check-circle', c: 'var(--jc-grn)', t: 'Aprobar propuestas', s: '' },
  { k: 'cobranza', ic: 'banknote', c: 'var(--jc-pink)', t: 'Cobranza', s: 'Aging + borradores' },
  { k: 'empresas', ic: 'building', c: 'var(--jc-blue)', t: 'Estado por empresa', s: 'Ocupación · mora · contratos' },
  { k: 'alertas', ic: 'alert', c: 'var(--jc-amber)', t: 'Alertas críticas', s: 'Lo que no cuadra hoy' },
  { k: 'verificar', ic: 'shield-check', c: 'var(--jc-purple)', t: 'Verificar', s: 'Chequeo de fuentes (mapa)' },
  { k: 'cerrar', ic: 'chart', c: 'var(--jc-cyan)', t: 'Cerrar el día', s: 'Cadena + cierre' },
  { k: 'cerebro', ic: 'brain', c: 'var(--jc-pink)', t: 'Hablar con el Cerebro', s: 'Preguntale lo que sea' },
];
function jvDeck() {
  const pend = JV.props.filter(p => p.estado === 'propuesta').length;
  const cards = JV_DECK.map(d => {
    const sub = d.k === 'aprobar' ? (pend + ' esperando tu OK') : d.s;
    return '<div class="jv-cmd" style="--c:' + d.c + '" onclick="jvCmd(\'' + d.k + '\')"><div class="ic">' + osIcon(d.ic, { size: 16 }) + '</div><b>' + d.t + '</b><span>' + OS_E(sub) + '</span></div>';
  }).join('');
  return '<div class="jv-st">Command Deck · un clic</div><div class="jv-deck">' + cards + '</div>';
}
function jvCmd(k) {
  switch (k) {
    case 'matutino': return jvNav('brief');
    case 'aprobar': return jvNav('propuestas');
    case 'empresas': return jvNav('empresas');
    case 'cerrar': return jvNav('horarios');
    case 'cobranza': return (typeof osNav === 'function') ? osNav('/cobros') : null;
    case 'alertas': return (typeof osNav === 'function') ? osNav('/contable') : null;
    case 'verificar': return (typeof osNav === 'function') ? osNav('/mapa') : null;
    case 'cerebro': { const el = document.getElementById('jv-ask'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); } return; }
    default: return;
  }
}
window.jvCmd = jvCmd;
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
// ─── DNA map helpers ───
const JV_CAPA_COL = { Command: '#a78bfa', Finance: '#38bdf8', Ops: '#f472b6', Integrity: '#34d399', Report: '#60a5fa', Signal: '#f87171' };
const JV_CAPA_LABEL = { Command: 'Comando', Finance: 'Finance · Contable & Datos', Ops: 'Ops · Operación', Integrity: 'Integrity · Verificadores', Report: 'Report · Reporteros', Signal: 'Signal · Sabueso' };
const JV_EMP_COL = '#fbbf24', JV_SRC_COL = '#8492ac';
function jvSvgIcon(name, x, y, size, color) {
  const inner = (window.OS_ICONS && OS_ICONS[name]) || '';
  const h = size / 2;
  return '<svg x="' + (x - h) + '" y="' + (y - h) + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}
function jvVaultFicha(n) {
  if (!n) return '';
  const chips = [];
  if (n.riesgo) chips.push('<span class="tag">' + OS_E(n.riesgo) + '</span>');
  if (n.estado) chips.push('<span class="tag">' + OS_E(n.estado) + '</span>');
  if (n.area) chips.push('<span class="tag">' + OS_E(n.area) + '</span>');
  const run = (n.kind === 'agent' || n.kind === 'cerebro') ? '<div class="jv-vp-run">Última corrida: ' + OS_E(jvFmtTs(n.run)) + '</div>' : '';
  return '<div class="jv-vp-ic" style="color:' + n.color + '">' + osIcon(n.icon, { size: 22 }) + '</div>'
    + '<h3>' + OS_E(n.label) + '</h3>'
    + '<div class="jv-vp-lay" style="color:' + n.color + '">' + OS_E(n.capaLabel) + (n.squad ? ' · Escuadra ' + OS_E(n.squad) : '') + '</div>'
    + '<p>' + OS_E(n.proceso || '') + '</p>'
    + (chips.length ? '<div class="jv-vp-meta">' + chips.join('') + '</div>' : '') + run;
}
function jvVaultPick(id) {
  const n = JV.vaultNodes && JV.vaultNodes[id]; if (!n) return;
  JV.vaultSel = id;
  const p = document.getElementById('jv-vault-panel'); if (p) p.innerHTML = jvVaultFicha(n);
  const root = document.getElementById('os-root'); if (!root) return;
  root.querySelectorAll('.jv-vnode.sel').forEach(g => g.classList.remove('sel'));
  const g = root.querySelector('.jv-vnode[data-nid="' + id + '"]'); if (g) g.classList.add('sel');
}
window.jvVaultPick = jvVaultPick;

function jvVaultView() {
  const cx = 600, cy = 400;
  const nodes = {}, lines = [];
  const cerebro = JV.agents.find(a => a.nombre === 'Cerebro Ejecutivo') || JV.agents.find(a => a.capa === 'Command');
  const cId = cerebro ? cerebro.id : 'cerebro';
  const order = ['Finance', 'Ops', 'Integrity', 'Report', 'Signal', 'Command'];
  const ring = JV.agents.filter(a => a.id !== cId).map(a => Object.assign({}, a)).sort((a, b) => order.indexOf(a.capa) - order.indexOf(b.capa));
  const emps = JV_EMPRESAS.map(e => Object.assign({}, e));
  const fus = JV_FUENTES.map(f => Object.assign({}, f));
  const place = (arr, rad, start) => { const n = arr.length; arr.forEach((it, k) => { const ang = (start + k / n * 360) * Math.PI / 180; it._x = cx + rad * Math.cos(ang); it._y = cy + rad * Math.sin(ang); }); };
  place(ring, 250, -90); place(emps, 365, -50); place(fus, 365, 130);
  const cNode = { _x: cx, _y: cy };
  const L = (a, b, col) => lines.push('<line x1="' + a._x + '" y1="' + a._y + '" x2="' + b._x + '" y2="' + b._y + '" stroke="' + col + '" stroke-width="1" stroke-opacity="0.22"/>');
  ring.forEach(a => L(cNode, a, JV_CAPA_COL[a.capa] || '#888'));
  fus.forEach(f => L(cNode, f, JV_SRC_COL));
  emps.forEach(emp => {
    const v = ring.find(a => a.capa === 'Integrity' && a.area === emp.area);
    const r = ring.find(a => a.capa === 'Report' && a.area === emp.area && !a.squad);
    if (v) L(v, emp, JV_EMP_COL); if (r) L(r, emp, JV_EMP_COL);
  });
  const rentasEmp = emps.find(e => e.area === 'rentas');
  if (rentasEmp) ring.filter(a => a.squad === 'Rentas').forEach(a => L(a, rentasEmp, JV_EMP_COL));
  const linkCount = lines.length;
  let svg = '';
  const nodeG = (id, x, y, r, icon, col) => {
    const isSel = id === (JV.vaultSel || cId);
    return '<g class="jv-vnode' + (isSel ? ' sel' : '') + '" data-nid="' + id + '" onclick="jvVaultPick(\'' + id + '\')">'
      + '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#0e1220" stroke="' + col + '" stroke-width="' + (id === cId ? 3 : 1.6) + '"/>'
      + (id === cId ? '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 8) + '" fill="none" stroke="' + col + '" stroke-opacity="0.4"/>' : '')
      + jvSvgIcon(icon, x, y, Math.round(r * 0.85), col) + '</g>';
  };
  const lbl = (x, y, r, t) => '<text x="' + x + '" y="' + (y + r + 13) + '" text-anchor="middle" font-size="10" fill="#c7d0e0">' + OS_E(t.length > 15 ? t.slice(0, 14) + '…' : t) + '</text>';
  // cerebro
  nodes[cId] = { kind: 'cerebro', label: cerebro ? cerebro.nombre : 'Cerebro Ejecutivo', icon: 'brain', color: JV_CAPA_COL.Command, capaLabel: 'Comando · Orquestador', proceso: cerebro ? cerebro.proceso : '', riesgo: cerebro && cerebro.nivel_riesgo, estado: cerebro && cerebro.estado, area: 'holding', squad: null, run: cerebro ? JV.lastRun[cerebro.id] : null };
  svg += nodeG(cId, cx, cy, 40, 'brain', JV_CAPA_COL.Command) + lbl(cx, cy, 40, cerebro ? cerebro.nombre : 'Cerebro Ejecutivo');
  ring.forEach(a => {
    const col = JV_CAPA_COL[a.capa] || '#888', ic = jvAgentIcon(a);
    nodes[a.id] = { kind: 'agent', label: a.nombre, icon: ic, color: col, capaLabel: JV_CAPA_LABEL[a.capa] || a.capa, proceso: a.proceso, riesgo: a.nivel_riesgo, estado: a.estado, area: a.area, squad: a.squad, run: JV.lastRun[a.id] };
    svg += nodeG(a.id, a._x, a._y, 19, ic, col) + lbl(a._x, a._y, 19, a.nombre);
  });
  emps.forEach(e => {
    const id = 'emp-' + e.area;
    nodes[id] = { kind: 'empresa', label: e.name, icon: e.icon, color: JV_EMP_COL, capaLabel: 'Empresa · property_id', proceso: 'La casa como clave común (property_id): una propiedad fluye Fix&Flip → Remodelación → Rentas con la misma identidad.', area: e.area, squad: null, run: null };
    svg += nodeG(id, e._x, e._y, 20, e.icon, JV_EMP_COL) + lbl(e._x, e._y, 20, e.name);
  });
  fus.forEach(f => {
    nodes[f.id] = { kind: 'fuente', label: f.label, icon: f.icon, color: JV_SRC_COL, capaLabel: 'Fuente de verdad', proceso: f.desc, area: null, squad: null, run: null };
    svg += nodeG(f.id, f._x, f._y, 20, f.icon, JV_SRC_COL) + lbl(f._x, f._y, 20, f.label);
  });
  JV.vaultNodes = nodes;
  if (!JV.vaultSel || !nodes[JV.vaultSel]) JV.vaultSel = cId;
  const nodeCount = Object.keys(nodes).length;
  const legItems = JV_CAPAS.map(c => ({ col: JV_CAPA_COL[c.capa], name: JV_CAPA_LABEL[c.capa] || c.name })).concat([{ col: JV_EMP_COL, name: 'Empresas (property_id)' }, { col: JV_SRC_COL, name: 'Fuentes de verdad' }]);
  const legend = legItems.map(l => '<div class="li"><span class="sw" style="background:' + l.col + '"></span>' + OS_E(l.name) + '</div>').join('');
  const counters = '<div class="jv-vcount"><div class="cbox"><div class="n">' + nodeCount + '</div><div class="l">Nodos</div></div><div class="cbox"><div class="n">' + linkCount + '</div><div class="l">Enlaces</div></div><div class="cbox"><div class="n">' + JV_TEAMS.length + '</div><div class="l">Capas</div></div></div>';
  return '<div class="jv-eyebrow">Knowledge Vault · Mapa DNA</div><div class="jv-lead">El genoma de tu operación — el Cerebro conecta cada capa, empresa y fuente de datos. ' + JV.agents.length + ' agentes.</div>'
    + '<div class="jv-vault-wrap">' + counters
    + '<svg class="jv-vstage" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">' + lines.join('') + svg + '</svg>'
    + '<div class="jv-vlegend">' + legend + '</div>'
    + '<div class="jv-vpanel" id="jv-vault-panel">' + jvVaultFicha(nodes[JV.vaultSel]) + '</div>'
    + '<div class="jv-vhint">Tocá un nodo para inspeccionarlo</div></div>';
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
