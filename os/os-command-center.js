// ════════════════════════════════════════════════════════════════
// 🛰 COMMAND CENTER (/jarvis) — Agent Network estilo ATTU · SOLO ADMIN.
// Sidebar de navegación + 8 vistas. Todo con datos REALES:
//   agent_registry (roster 18 agentes: capa/area/riesgo/estado) ·
//   agent_proposals (task lanes + propuestas) · agent_audit_log (corridas/bitácora) ·
//   ct_findings (alertas 🔴) · edge fn `cerebro` (el mismo Cerebro orquestador del FAB).
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
  vaultSel: null, vaultNodes: {}, mapEdit: null, mapBusy: false, filterLinea: null, inspectAgentId: null,
  busyId: null, chat: [], chatBusy: false, decisionArea: 'Todas', reportArea: 'Todas',
  workArea: 'Todas', workState: 'Todos', workAgentId: null,
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
function jvEvidObj(p) {
  const e = p && (p.evidencia != null ? p.evidencia : p.payload);
  if (e && typeof e === 'object') return e;
  if (typeof e === 'string') { try { return JSON.parse(e); } catch (_) { return { detalle: e }; } }
  return {};
}
function jvIsLegacy(a) { return String((a && a.linea) || '').toLowerCase().indexOf('transversal') === 0; }
function jvAgentLastRun(a) {
  if (!a) return null;
  const own = JV.lastRun[a.id] || null;
  if (!/cerebro ejecutivo/i.test(a.nombre || '')) return own;
  const commandRuns = JV.agents
    .filter(x => !jvIsLegacy(x) && (x.capa === 'Command' || /cerebro/i.test(x.nombre || '')))
    .map(x => JV.lastRun[x.id]).filter(Boolean).sort().reverse();
  return commandRuns[0] || own;
}
function jvFreshnessDays(a) {
  const schedule = jvScheduleText(a).toLowerCase();
  if (/mensual|monthly|d[ií]a 1|cada mes/.test(schedule)) return 40;
  if (/semanal|weekly|cada semana/.test(schedule)) return 10;
  if (/quincenal|cada 15/.test(schedule)) return 20;
  if (/on-demand|bajo demanda|nicol[aá]s pide/.test(schedule)) return 30;
  return 3;
}
function jvIsRecent(a, days) {
  const ts = jvAgentLastRun(a);
  return !!ts && (Date.now() - new Date(ts).getTime()) < (days || jvFreshnessDays(a)) * 86400000;
}
function jvOperational(a) { return !!a && !jvIsLegacy(a) && jvIsRecent(a) && a.estado !== 'pausado' && a.estado !== 'planificado'; }
function jvHumanState(a) {
  if (jvIsLegacy(a)) return { cls: 'b-idle', label: 'absorbido' };
  if (jvOperational(a)) return { cls: a.estado === 'activo' || a.estado === 'live' ? 'b-work' : 'b-asis', label: a.estado === 'activo' || a.estado === 'live' ? 'funcionando' : 'funcionando · supervisado' };
  if (a.estado === 'planificado') return { cls: 'b-idle', label: 'sin automatización' };
  return { cls: 'b-wait', label: 'requiere configuración' };
}
function jvAgentIssue(a) {
  if (jvOperational(a)) return '';
  if (a.estado === 'planificado') return 'Este puesto está definido, pero todavía no tiene una automatización que ejecute sus tareas.';
  if (!jvAgentLastRun(a)) return 'No hay evidencia de una ejecución real. Debe conectarse a una fuente y realizar una corrida de prueba.';
  return 'Su última ejecución quedó fuera del horario esperado. Revisa la automatización y la evidencia antes de marcarlo activo.';
}
function jvAgentHumanBadge(a) { const s = jvHumanState(a); return '<span class="jv-badge ' + s.cls + '">' + s.label + '</span>'; }
function jvScheduleText(a) {
  const d = (a && a.disparadores && typeof a.disparadores === 'object') ? a.disparadores : {};
  const vals = Object.keys(d).map(k => String(d[k] || '')).filter(Boolean);
  return vals.length ? vals.join(' · ') : 'Sin horario automático';
}
function jvProposalInfo(p) {
  const e = jvEvidObj(p), type = String((p && p.tipo_accion) || '').toLowerCase();
  const first = (...xs) => xs.find(x => x !== undefined && x !== null && x !== '');
  let title = first(e.titulo, e.hallazgo, e.mensaje, 'Revisión del agente');
  let summary = first(e.detalle, e.resumen, e.impacto, e.recomendacion, e.accion_recomendada, e.texto, 'Revisá la información y decidí si querés aplicarla.');
  if (type.includes('cobranza')) { title = 'Resumen de cobranza'; summary = 'Hay ' + jvNum(first(e.pendientes, e.total_pendientes, e.cantidad, 0)) + ' cobros para revisar' + (first(e.monto, e.total, e.monto_pendiente) != null ? ', por ' + jvMoney(first(e.monto, e.total, e.monto_pendiente)) : '') + '.'; }
  else if (type.includes('ocupacion')) { title = 'Plan para mejorar ocupación'; summary = first(e.plan, e.recomendacion, e.detalle, summary); }
  else if (type.includes('cuello')) { title = 'Cuello de botella detectado'; summary = first(e.hallazgo, e.impacto, e.detalle, summary); }
  else if (type.includes('underwriting')) { title = 'Revisión del negocio'; summary = first(e.veredicto, e.resumen, e.detalle, summary); }
  else if (type.includes('descuadre')) { title = 'Diferencia en materiales'; summary = first(e.hallazgo, e.detalle, summary); }
  else if (type.includes('higiene')) { title = 'Datos que necesitan limpieza'; summary = first(e.hallazgo, e.detalle, summary); }
  else if (type.includes('anomalia')) { title = 'Datos fuera de lo esperado'; summary = first(e.hallazgo, e.detalle, summary); }
  else if (type.includes('pulso') || type.includes('ejecucion')) { title = 'Seguimiento operativo'; summary = first(e.resumen, e.hallazgo, e.detalle, summary); }
  if (typeof title === 'object') title = 'Revisión del agente';
  if (typeof summary === 'object') summary = first(summary.detalle, summary.mensaje, summary.resumen, 'Información disponible para revisión.');
  return { title: String(title), summary: String(summary), source: first(e.fuente, e.source, ''), cut: first(e.corte, e.fecha, '') };
}
function jvHumanize(v) {
  return String(v || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}
function jvProposalArea(p) {
  const a = jvAgent(p && p.agent_id);
  return a ? jvLineaLabel(a.linea || a.area || 'General') : 'General';
}
function jvProposalDetails(p) {
  const e = jvEvidObj(p);
  const skip = /^(id|uuid|token|prompt|raw|debug|sql|query|stack|trace|source)$/i;
  const labels = { propiedad: 'Propiedad', property: 'Propiedad', property_name: 'Propiedad', address: 'Propiedad', monto: 'Monto', impacto: 'Impacto', recomendacion: 'Recomendación', accion_recomendada: 'Acción recomendada', razon: 'Por qué', porque: 'Por qué', riesgo: 'Riesgo', fecha: 'Fecha', corte: 'Corte', responsable: 'Responsable', plazo: 'Plazo' };
  const rows = Object.keys(e).filter(k => !skip.test(k) && e[k] != null && e[k] !== '' && typeof e[k] !== 'object').slice(0, 8).map(k => {
    const val = typeof e[k] === 'number' && /monto|impacto|total|costo|precio/i.test(k) ? jvMoney(e[k]) : String(e[k]);
    return '<div class="jv-detail-row"><span>' + OS_E(labels[k] || jvHumanize(k)) + '</span><b>' + OS_E(val) + '</b></div>';
  });
  return { html: rows.join(''), sufficient: rows.length > 0 || !!(e.detalle || e.resumen || e.recomendacion || e.accion_recomendada) };
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
  { k: 'network', ic: 'network', t: 'Equipo' },
  { k: 'command', ic: 'layout', t: 'Sala de Dirección' },
  { k: 'work', ic: 'list', t: 'Trabajo' },
  { k: 'propuestas', ic: 'inbox', t: 'Decisiones' },
  { k: 'vault', ic: 'library', t: 'Memoria compartida' },
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
function jvLineaLabel(linea) { return linea === 'Meta' ? 'Equipo central' : linea; }
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
    '#os-root .jv-lc{background:rgba(167,139,250,.05);border:1px solid rgba(167,139,250,.25);border-radius:8px;padding:8px 9px;margin-bottom:8px;font-size:11.5px;line-height:1.45}',
    '#os-root .jv-lc.red{border-color:rgba(244,114,182,.34)}#os-root .jv-lc.grn{border-color:rgba(52,211,153,.3)}',
    '#os-root .jv-lc .who{font-size:9.5px;color:var(--jc-mut);margin-top:4px}',
    '#os-root .jv-appr{display:flex;gap:6px;margin-top:8px}',
    '#os-root .jv-appr button{flex:1;font-size:10.5px;border-radius:7px;border:1px solid var(--jc-line);background:transparent;color:var(--jc-mut);padding:5px;cursor:pointer}',
    '#os-root .jv-appr button:disabled{opacity:.5}',
    '#os-root .jv-appr .ok{color:var(--jc-grn);border-color:rgba(52,211,153,.3)}#os-root .jv-appr .no{color:var(--jc-pink);border-color:rgba(244,114,182,.3)}',
    '#os-root .jv-empty{font-size:11px;color:var(--jc-mut);padding:6px 2px}',
    '#os-root .jv-status-strip{display:flex;gap:8px;flex-wrap:wrap;margin:-10px 0 18px}',
    '#os-root .jv-status-strip span{font-size:11px;padding:6px 10px;border:1px solid var(--jc-line);border-radius:10px;color:var(--jc-mut)}',
    '#os-root .jv-decision{background:var(--jc-card);border:1px solid rgba(167,139,250,.28);border-radius:12px;padding:13px 14px;margin-bottom:10px}',
    '#os-root .jv-decision.alert{border-color:rgba(244,114,182,.34)}',
    '#os-root .jv-decision h4{font-size:13px;margin:0 0 5px}',
    '#os-root .jv-decision p{font-size:12px;color:var(--jc-mut);line-height:1.5;margin:0}',
    '#os-root .jv-page-title{font-size:24px;letter-spacing:-.025em;margin:0 0 5px}',
    '#os-root .jv-filter-tabs{display:flex;gap:7px;overflow-x:auto;margin:0 0 18px;padding-bottom:3px;scrollbar-width:none}#os-root .jv-filter-tabs::-webkit-scrollbar{display:none}',
    '#os-root .jv-filter-tabs button{flex:0 0 auto;border:1px solid var(--jc-line);background:transparent;color:var(--jc-mut);border-radius:9px;padding:7px 10px;cursor:pointer;font:inherit;font-size:11px}#os-root .jv-filter-tabs button.on{color:#fff;background:rgba(167,139,250,.14);border-color:rgba(167,139,250,.42)}#os-root .jv-filter-tabs button span{margin-left:5px;color:var(--jc-cyan)}',
    '#os-root .jv-decisions-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,.75fr);gap:22px;align-items:start}#os-root .jv-section-title{font-size:13px;font-weight:700;margin:0 0 10px}#os-root .jv-section-title span{color:var(--jc-amber);margin-left:5px}',
    '#os-root .jv-decision-head{display:flex;align-items:center;gap:8px;color:var(--jc-mut);font-size:10px;margin-bottom:9px}#os-root .jv-decision-more{margin-top:10px;border-top:1px solid var(--jc-line);padding-top:8px}#os-root .jv-decision-more summary{cursor:pointer;color:var(--jc-cyan);font-size:11px}#os-root .jv-detail-list{display:grid;gap:5px;margin-top:9px}#os-root .jv-detail-row{display:grid;grid-template-columns:120px 1fr;gap:10px;font-size:10.5px}#os-root .jv-detail-row span{color:var(--jc-mut)}#os-root .jv-detail-row b{font-weight:550;overflow-wrap:anywhere}',
    '#os-root .jv-needs-info{margin-top:10px;padding:9px 10px;border-radius:9px;background:rgba(251,191,36,.08);color:#f6d784;font-size:10.5px;line-height:1.45}',
    '#os-root .jv-command-action{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 16px;margin:0 0 18px;border:1px solid rgba(96,165,250,.24);border-radius:13px;background:rgba(96,165,250,.055)}#os-root .jv-command-action b{display:block;font-size:13px}#os-root .jv-command-action span{display:block;color:var(--jc-mut);font-size:11px;margin-top:3px}#os-root .jv-command-action button{border:0;border-radius:9px;background:#506ff2;color:#fff;padding:8px 12px;cursor:pointer;white-space:nowrap;font-weight:650}',
    '#os-root .jv-report-group{margin-bottom:26px}#os-root .jv-report-list{display:grid;gap:9px}#os-root .jv-report-item{border-top:1px solid var(--jc-line);padding:13px 2px 2px}#os-root .jv-report-item:first-child{border-top:0}#os-root .jv-report-item summary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;cursor:pointer;list-style:none}#os-root .jv-report-item summary::-webkit-details-marker{display:none}#os-root .jv-report-item h3{font-size:13px;margin:0}#os-root .jv-report-item .report-meta{font-size:10px;color:var(--jc-mut);margin-top:3px}#os-root .jv-report-body{max-width:75ch;color:#b8c4d8;font-size:12px;line-height:1.65;padding:12px 0 6px;white-space:pre-wrap}',
    '@media(max-width:900px){#os-root .jv-decisions-layout{grid-template-columns:1fr}}',
    '#os-root .jv-simple-list{display:grid;gap:8px}',
    '#os-root .jv-simple-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--jc-line);border-radius:10px;background:rgba(255,255,255,.015)}',
    '#os-root .jv-simple-row .body{flex:1;min-width:0}#os-root .jv-simple-row .body b{display:block;font-size:12.5px}#os-root .jv-simple-row .body span{display:block;font-size:10.5px;color:var(--jc-mut);margin-top:2px}',
    '#os-root .jv-work-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 16px}#os-root .jv-work-toolbar select{appearance:none;background:var(--jc-card);color:var(--jc-tx);border:1px solid var(--jc-line);border-radius:9px;padding:7px 30px 7px 10px;font:inherit;font-size:11px;cursor:pointer}#os-root .jv-work-toolbar .jv-filter-tabs{margin:0;flex:1}',
    '#os-root .jv-work-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:16px}#os-root .jv-work-stat{padding:11px 12px;background:var(--jc-card);border:1px solid var(--jc-line);border-radius:11px}#os-root .jv-work-stat b{display:block;font-size:18px;font-variant-numeric:tabular-nums}#os-root .jv-work-stat span{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--jc-mut)}',
    '#os-root .jv-work-table{border:1px solid var(--jc-line);border-radius:13px;overflow:hidden;background:var(--jc-card)}#os-root .jv-work-row{display:grid;grid-template-columns:92px minmax(220px,1.6fr) minmax(150px,.8fr) minmax(130px,.7fr) 90px;gap:12px;align-items:center;padding:11px 13px;border-top:1px solid var(--jc-line);font-size:11px}#os-root .jv-work-row:first-child{border-top:0}#os-root .jv-work-row.head{background:rgba(255,255,255,.025);color:var(--jc-mut);font-size:9px;letter-spacing:.08em;text-transform:uppercase}#os-root .jv-work-task b{display:block;font-size:12px}#os-root .jv-work-task span,#os-root .jv-work-owner span{display:block;color:var(--jc-mut);margin-top:2px;font-size:10px}#os-root .jv-work-owner{cursor:pointer}#os-root .jv-work-owner:hover b{color:var(--jc-cyan)}#os-root .jv-work-time{color:var(--jc-mut);font-variant-numeric:tabular-nums}',
    '#os-root .jv-work-state{font-size:9px;padding:4px 7px;border-radius:7px;display:inline-flex;align-items:center;gap:5px;width:max-content}#os-root .jv-work-state::before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}#os-root .jv-work-state.running{color:var(--jc-cyan);background:rgba(56,189,248,.1)}#os-root .jv-work-state.waiting{color:var(--jc-amber);background:rgba(251,191,36,.1)}#os-root .jv-work-state.done{color:var(--jc-grn);background:rgba(52,211,153,.1)}#os-root .jv-work-state.failed{color:var(--jc-pink);background:rgba(244,114,182,.1)}',
    '@media(max-width:900px){#os-root .jv-work-summary{grid-template-columns:repeat(2,1fr)}#os-root .jv-work-row{grid-template-columns:82px 1fr}#os-root .jv-work-row.head{display:none}#os-root .jv-work-row>*:nth-child(n+3){grid-column:2}#os-root .jv-work-time{grid-column:1;grid-row:1/5}}',
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
    '#os-root .jv-bar>span{display:block;height:100%;background:linear-gradient(90deg,var(--jc-purple),var(--jc-cyan));border-radius:6px}',
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
    '#os-root .jv-network-stage{position:relative;padding-top:8px}',
    '#os-root .jv-map-hub{width:min(560px,100%);margin:0 auto 42px;padding:18px 20px;border:1px solid rgba(167,139,250,.42);border-radius:16px;background:radial-gradient(circle at 20% 20%,rgba(167,139,250,.2),rgba(14,18,32,.96) 62%);display:flex;align-items:center;gap:14px;box-shadow:0 18px 60px rgba(56,189,248,.08),0 0 28px rgba(167,139,250,.12);position:relative}',
    '#os-root .jv-map-hub::after{content:"";position:absolute;left:50%;top:100%;height:42px;border-left:2px dashed rgba(56,189,248,.55);animation:jvflow 1.2s linear infinite}',
    '#os-root .jv-map-hub .orb{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#d8ccff;background:linear-gradient(135deg,rgba(167,139,250,.48),rgba(56,189,248,.24));box-shadow:0 0 22px rgba(167,139,250,.38)}',
    '#os-root .jv-map-hub .body{flex:1}#os-root .jv-map-hub .body b{display:block;font-size:17px}#os-root .jv-map-hub .body span{font-size:11px;color:var(--jc-mut)}',
    '#os-root .jv-linea-h{position:relative}',
    '#os-root .jv-linea-h::before{content:"";position:absolute;left:-14px;width:8px;height:8px;border-radius:50%;background:var(--lc);box-shadow:0 0 12px var(--lc);animation:jvpulse 1.8s infinite}',
    '#os-root .jv-cards{position:relative;padding-left:14px;border-left:1px dashed rgba(120,140,180,.28)}',
    '@keyframes jvflow{to{border-left-color:rgba(167,139,250,.25);transform:translateY(4px)}}',
    '#os-root .jv-holo-shell{position:relative;min-height:calc(100vh - 150px);overflow:hidden;border:1px solid rgba(82,205,255,.16);border-radius:24px;background:radial-gradient(circle at 50% 48%,rgba(45,126,255,.14),transparent 27%),radial-gradient(circle at 50% 50%,#0a1424 0,#060a12 58%,#030509 100%);box-shadow:inset 0 0 90px rgba(22,111,255,.08),0 28px 90px rgba(0,0,0,.42)}',
    '#os-root .jv-holo-shell::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.18;background-image:linear-gradient(rgba(78,182,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(78,182,255,.16) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(circle,#000 15%,transparent 78%)}',
    '#os-root .jv-holo-head{position:relative;z-index:3;display:flex;justify-content:space-between;align-items:flex-start;padding:22px 24px 0;gap:20px}',
    '#os-root .jv-holo-title b{display:block;font-size:19px;letter-spacing:-.02em}#os-root .jv-holo-title span{display:block;color:#7f98b8;font-size:11px;margin-top:4px}',
    '#os-root .jv-holo-stats{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}',
    '#os-root .jv-holo-stat{padding:7px 11px;border-radius:9px;border:1px solid rgba(97,190,255,.18);background:rgba(6,15,27,.72);font-size:10px;color:#7890ac}.jv-holo-stat b{color:#dcefff;font-size:12px}',
    '#os-root .jv-holo-map{position:relative;z-index:2;min-height:650px;display:grid;grid-template-columns:minmax(200px,1fr) 180px minmax(200px,1fr);grid-template-rows:1fr 1fr;gap:48px 80px;padding:52px 4% 42px;align-items:center}',
    '#os-root .jv-holo-lines{position:absolute;inset:8% 8% 6%;width:84%;height:86%;z-index:0;pointer-events:none;overflow:visible}',
    '#os-root .jv-holo-lines path{fill:none;stroke:url(#jv-holo-grad);stroke-width:1.2;stroke-dasharray:7 12;opacity:.62;animation:jvdataflow 2.5s linear infinite;vector-effect:non-scaling-stroke}',
    '#os-root .jv-holo-lines circle{fill:#62d5ff;filter:drop-shadow(0 0 5px #62d5ff)}',
    '@keyframes jvdataflow{to{stroke-dashoffset:-38}}',
    '#os-root .jv-holo-core{position:absolute;left:50%;top:50%;z-index:3;width:170px;height:170px;transform:translate(-50%,-50%);display:grid;place-items:center;cursor:pointer}',
    '#os-root .jv-core-ring{position:absolute;border:1px solid rgba(79,198,255,.35);border-radius:50%;inset:0;animation:jvspin 16s linear infinite;box-shadow:inset 0 0 32px rgba(63,144,255,.08)}',
    '#os-root .jv-core-ring.r2{inset:19px;border-style:dashed;border-color:rgba(151,100,255,.48);animation-direction:reverse;animation-duration:11s}',
    '#os-root .jv-core-ring.r3{inset:43px;border-color:rgba(75,225,201,.42);animation-duration:7s}',
    '#os-root .jv-core-reactor{width:82px;height:82px;border-radius:50%;display:grid;place-items:center;color:#eafaff;background:radial-gradient(circle at 38% 32%,#efffff 0,#73ddff 13%,#3b75ff 42%,#24145c 72%,#050711 100%);box-shadow:0 0 18px #72dcff,0 0 58px rgba(57,119,255,.75),0 0 100px rgba(125,65,255,.35);animation:jvbreathe 2.8s ease-in-out infinite}',
    '#os-root .jv-core-label{position:absolute;top:calc(50% + 92px);left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap}#os-root .jv-core-label b{font-size:14px}#os-root .jv-core-label span{display:block;font-size:9px;letter-spacing:.18em;color:#65d7ff;text-transform:uppercase;margin-top:3px}',
    '#os-root .jv-holo-area{position:relative;z-index:2;min-height:184px;padding:16px 17px;border-radius:17px;border:1px solid color-mix(in srgb,var(--ac) 40%,transparent);background:linear-gradient(145deg,color-mix(in srgb,var(--ac) 10%,#08101d),rgba(5,10,18,.94));box-shadow:0 18px 45px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.04);cursor:pointer;transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}',
    '#os-root .jv-holo-area:hover{transform:translateY(-4px);border-color:var(--ac);box-shadow:0 24px 60px rgba(0,0,0,.38),0 0 28px color-mix(in srgb,var(--ac) 18%,transparent)}',
    '#os-root .jv-holo-area:nth-of-type(1){grid-column:1;grid-row:1}#os-root .jv-holo-area:nth-of-type(2){grid-column:3;grid-row:1}#os-root .jv-holo-area:nth-of-type(3){grid-column:1;grid-row:2}#os-root .jv-holo-area:nth-of-type(4){grid-column:3;grid-row:2}',
    '#os-root .jv-holo-core:focus-visible,#os-root .jv-holo-area:focus-visible{outline:2px solid #72dcff;outline-offset:4px}',
    '#os-root .jv-ha-head{display:flex;align-items:center;gap:10px}.jv-ha-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:var(--ac);background:color-mix(in srgb,var(--ac) 14%,transparent)}',
    '#os-root .jv-ha-title{flex:1}.jv-ha-title b{display:block;font-size:14px}.jv-ha-title span{display:block;font-size:9px;color:#7186a2;margin-top:2px;text-transform:uppercase;letter-spacing:.12em}',
    '#os-root .jv-ha-count{font-size:10px;color:var(--ac)}',
    '#os-root .jv-ha-agents{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}.jv-ha-agent{display:flex;align-items:center;gap:5px;max-width:100%;font-size:9.5px;color:#a7b6ca;padding:5px 7px;border-radius:7px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.055)}.jv-ha-agent i{width:5px;height:5px;border-radius:50%;background:#53e3b2;box-shadow:0 0 6px #53e3b2}.jv-ha-agent i.wait{background:#f4bb43;box-shadow:0 0 6px #f4bb43}',
    '#os-root button.jv-ha-agent{font:inherit;cursor:pointer;transition:transform .2s ease,border-color .2s ease,background .2s ease}#os-root button.jv-ha-agent:hover,#os-root button.jv-ha-agent:focus-visible{color:#effaff;background:rgba(94,217,255,.09);border-color:rgba(94,217,255,.38);transform:translateY(-1px);outline:none}#os-root button.jv-ha-agent[aria-pressed="true"]{color:#fff;border-color:var(--ac);background:color-mix(in srgb,var(--ac) 14%,transparent);box-shadow:0 0 16px color-mix(in srgb,var(--ac) 14%,transparent)}',
    '#os-root .jv-ha-foot{display:flex;justify-content:space-between;align-items:center;margin-top:13px;padding-top:10px;border-top:1px solid rgba(255,255,255,.055);font-size:9.5px;color:#6f849e}.jv-ha-foot strong{color:var(--ac);font-weight:600}',
    '#os-root .jv-agent-inspector{position:absolute;z-index:8;right:18px;top:72px;width:min(360px,calc(100% - 36px));max-height:calc(100% - 92px);overflow:auto;border:1px solid rgba(94,217,255,.28);border-radius:18px;background:linear-gradient(155deg,rgba(13,25,43,.98),rgba(5,10,18,.98));box-shadow:-22px 26px 80px rgba(0,0,0,.54),inset 0 1px rgba(255,255,255,.05);animation:jvInspectorIn .24s ease-out}',
    '@keyframes jvInspectorIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}',
    '#os-root .jv-ai-top{display:flex;gap:12px;align-items:center;padding:18px;border-bottom:1px solid rgba(120,160,205,.14);position:sticky;top:0;background:rgba(8,16,29,.96);backdrop-filter:blur(18px);z-index:2}',
    '#os-root .jv-ai-avatar{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;color:#bdeeff;background:linear-gradient(135deg,rgba(94,217,255,.25),rgba(149,104,255,.22));box-shadow:0 0 22px rgba(94,217,255,.12)}',
    '#os-root .jv-ai-title{flex:1;min-width:0}#os-root .jv-ai-title b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#os-root .jv-ai-title span{display:block;margin-top:3px;color:#75dfff;font-size:9px;letter-spacing:.13em;text-transform:uppercase}',
    '#os-root .jv-ai-close{width:30px;height:30px;border:1px solid rgba(120,160,205,.18);border-radius:9px;background:transparent;color:#8ca0bb;cursor:pointer}#os-root .jv-ai-close:hover,#os-root .jv-ai-close:focus-visible{color:#fff;border-color:#5ed9ff;outline:none}',
    '#os-root .jv-ai-body{padding:16px 18px 20px}#os-root .jv-ai-section{padding:13px 0;border-bottom:1px solid rgba(120,160,205,.12)}#os-root .jv-ai-section:last-child{border-bottom:0}',
    '#os-root .jv-ai-label{font-size:8.5px;letter-spacing:.15em;text-transform:uppercase;color:#7088a6;margin-bottom:7px}#os-root .jv-ai-copy{font-size:11.5px;line-height:1.55;color:#c5d0df}',
    '#os-root .jv-ai-now{padding:11px 12px;border-left:2px solid #5ed9ff;background:rgba(94,217,255,.055);border-radius:0 10px 10px 0}#os-root .jv-ai-now b{display:block;color:#e8f8ff;font-size:11.5px}#os-root .jv-ai-now span{display:block;color:#8095af;font-size:10px;margin-top:4px}',
    '#os-root .jv-ai-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}#os-root .jv-ai-metric{padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.035)}#os-root .jv-ai-metric span{display:block;color:#7188a5;font-size:8.5px;text-transform:uppercase;letter-spacing:.08em}#os-root .jv-ai-metric b{display:block;margin-top:4px;color:#e7f2ff;font-size:11px}',
    '#os-root .jv-ai-tags{display:flex;flex-wrap:wrap;gap:5px}#os-root .jv-ai-tags span{padding:4px 7px;border:1px solid rgba(120,160,205,.15);border-radius:7px;color:#9cafc5;font-size:9.5px;background:rgba(255,255,255,.025)}',
    '#os-root .jv-ai-action{width:100%;margin-top:12px;padding:9px 12px;border-radius:10px;border:1px solid rgba(94,217,255,.3);background:rgba(94,217,255,.08);color:#bdefff;cursor:pointer;font-size:10.5px;font-weight:650}#os-root .jv-ai-action:hover,#os-root .jv-ai-action:focus-visible{background:rgba(94,217,255,.14);outline:none}',
    '@media(max-width:1100px){#os-root .jv-holo-map{grid-template-columns:1fr 1fr;grid-template-rows:auto;gap:14px;padding:230px 18px 24px}#os-root .jv-holo-core{top:120px}#os-root .jv-holo-lines{display:none}#os-root .jv-holo-area:nth-of-type(n){grid-column:auto;grid-row:auto}}',
    '@media(max-width:680px){#os-root .jv{display:block}#os-root .jv-side{width:100%;padding:7px 8px;border-right:0;border-bottom:1px solid var(--jc-line);overflow:hidden}#os-root .jv-logo,#os-root .jv-lbl,#os-root .jv-mini{display:none}#os-root .jv-nav{display:flex;gap:3px;overflow-x:auto;scrollbar-width:none}#os-root .jv-nav::-webkit-scrollbar{display:none}#os-root .jv-nav a{flex:0 0 auto;white-space:nowrap;margin:0;padding:7px 9px}#os-root .jv-main{padding:14px 10px}#os-root .jv-top{margin-bottom:12px}#os-root .jv-holo-head{display:block;padding:18px 16px 0}#os-root .jv-holo-stats{justify-content:flex-start;margin-top:12px}#os-root .jv-holo-map{grid-template-columns:1fr;padding:270px 12px 18px}#os-root .jv-holo-core{top:135px}#os-root .jv-holo-area:nth-of-type(n){grid-column:1}#os-root .jv-agent-inspector{position:fixed;left:10px;right:10px;top:78px;width:auto;max-height:calc(100dvh - 92px)}}',
    '@media(prefers-reduced-motion:reduce){#os-root .jv-holo-lines path,#os-root .jv-core-ring,#os-root .jv-core-reactor{animation:none!important}}',
    '#os-root .jv-card2{background:var(--jc-card);border:1px solid var(--jc-line);border-radius:13px;padding:14px;display:flex;flex-direction:column}',
    '#os-root .jv-card2.jv-editing{border-color:var(--jc-purple)}',
    '#os-root .jv-c2-top{display:flex;align-items:center;gap:10px;margin-bottom:10px}',
    '#os-root .jv-c2-nm{flex:1;min-width:0}',
    '#os-root .jv-c2-nm b{font-size:13.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#os-root .jv-c2-nm span{display:block;font-size:10px;color:var(--jc-mut);margin-top:1px}',
    '#os-root .jv-c2-resp{font-size:12px;color:var(--jc-tx);opacity:.9;line-height:1.5;margin-bottom:8px}',
    '#os-root .jv-c2-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}',
    '#os-root .jv-c2-tareas{font-size:11px;color:var(--jc-mut);line-height:1.55;margin-bottom:10px}',
    '#os-root .jv-c2-tsub{color:var(--jc-mut);opacity:.7}',
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
      sb.from('agent_audit_log').select('id,agent_id,proposal_id,input,resultado,output,ts').order('ts', { ascending: false }).limit(40),
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
  const todos = '<div class="jv-mini jv-mini-all' + (JV.filterLinea == null ? ' on' : '') + '" onclick="jvFilterClear()" style="cursor:pointer"><div class="ic">' + osIcon('list', { size: 13 }) + '</div>Todo el equipo<span class="stt idle" style="visibility:hidden"></span></div>';
  const minis = JV_LINEAS.filter(L => L.linea !== 'Comando' && L.linea.indexOf('Transversal') !== 0 && (JV.agents.some(a => a.linea === L.linea && !jvIsLegacy(a)) || JV_LINEA_PLANNED.includes(L.linea))).map(L => {
    const st = jvLineaStatus(L.linea);
    return '<div class="jv-mini' + (JV.filterLinea === L.linea ? ' on' : '') + '" onclick="jvFilterLinea(\'' + OS_E(L.linea).replace(/'/g, "\\'") + '\')" style="cursor:pointer"><div class="ic">' + osIcon(L.icon, { size: 13 }) + '</div>' + OS_E(jvLineaLabel(L.linea)) + '<span class="stt ' + st + '"></span></div>';
  }).join('');
  return '<aside class="jv-side"><div class="jv-logo"><div class="m"></div><b>Rental Profitss</b></div>'
    + '<nav class="jv-nav">' + nav + '</nav>'
    + '<div class="jv-lbl">Áreas</div>' + todos + minis + '</aside>';
}
function jvTopBar() {
  const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return '<div class="jv-top"><div class="jv-eyebrow">Rental Profitss · Agentic OS</div><div class="jv-op"><span class="d"></span> Sistema Operativo · ' + now + '</div></div>';
}
function jvTabBody() {
  switch (JV.tab) {
    case 'command': return jvDashboard();
    case 'work': return jvWorkView();
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
function jvMapaOverview(current, activos, pendientes) {
  const areas = JV_LINEAS.filter(L => ['Meta', 'Rentas', 'Remodelación', 'Fix & Flip'].includes(L.linea));
  const areaHTML = areas.map(L => {
    const agents = current.filter(a => a.linea === L.linea).sort((a, b) => (a.orden == null ? 99 : a.orden) - (b.orden == null ? 99 : b.orden));
    const working = agents.filter(jvOperational).length;
    const waiting = agents.length - working;
    const chips = agents.map(a => '<button type="button" class="jv-ha-agent" aria-pressed="' + (JV.inspectAgentId === a.id ? 'true' : 'false') + '" onclick="event.stopPropagation();jvInspectAgent(\'' + a.id + '\')"><i class="' + (jvOperational(a) ? '' : 'wait') + '"></i>' + OS_E(a.nombre.replace(/\s*\([^)]*\)/g, '')) + '</button>').join('');
    const label = jvLineaLabel(L.linea);
    const descriptor = L.linea === 'Meta' ? 'Administra y verifica el equipo digital' : agents.length + ' empleados digitales';
    return '<section class="jv-holo-area" style="--ac:' + L.color + '" tabindex="0" role="button" onclick="jvFilterLinea(\'' + OS_E(L.linea).replace(/'/g, "\\'") + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();jvFilterLinea(\'' + OS_E(L.linea).replace(/'/g, "\\'") + '\')}" aria-label="Abrir organigrama de ' + OS_E(label) + '">'
      + '<div class="jv-ha-head"><div class="jv-ha-icon">' + osIcon(L.icon, { size: 17 }) + '</div><div class="jv-ha-title"><b>' + OS_E(label) + '</b><span>' + OS_E(descriptor) + '</span></div><div class="jv-ha-count">' + working + '/' + agents.length + ' activos</div></div>'
      + '<div class="jv-ha-agents">' + chips + '</div><div class="jv-ha-foot"><span>' + (waiting ? waiting + ' requieren atención' : 'equipo sincronizado') + '</span><strong>EXPANDIR ÁREA →</strong></div></section>';
  }).join('');
  return '<div class="jv-holo-shell"><div class="jv-holo-head"><div class="jv-holo-title"><b>Red Operativa JARVIS</b><span>Una inteligencia central. Cuatro áreas. Un solo contexto compartido.</span></div>'
    + '<div class="jv-holo-stats"><span class="jv-holo-stat"><b>' + activos + '</b> funcionando</span><span class="jv-holo-stat"><b>' + pendientes + '</b> requieren atención</span><span class="jv-holo-stat"><b>' + jvNum(JV.runsTotal) + '</b> ejecuciones registradas</span></div></div>'
    + '<div class="jv-holo-map"><svg class="jv-holo-lines" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="jv-holo-grad"><stop offset="0" stop-color="#9568ff"/><stop offset=".5" stop-color="#5ed9ff"/><stop offset="1" stop-color="#48e0b0"/></linearGradient></defs><path d="M500 300 C390 270 310 170 160 130"/><path d="M500 300 C610 270 690 170 840 130"/><path d="M500 300 C390 330 310 430 160 480"/><path d="M500 300 C610 330 690 430 840 480"/><circle cx="500" cy="300" r="4"/></svg>'
    + '<div class="jv-holo-core" role="button" tabindex="0" aria-label="Abrir Sala de Dirección" onclick="jvNav(\'command\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();jvNav(\'command\')}" title="Abrir Sala de Dirección"><div class="jv-core-ring"></div><div class="jv-core-ring r2"></div><div class="jv-core-ring r3"></div><div class="jv-core-reactor">' + osIcon('brain', { size: 27 }) + '</div><div class="jv-core-label"><b>Cerebro Ejecutivo</b><span>orquestación en vivo</span></div></div>'
    + areaHTML + '</div>' + jvAgentInspector() + '</div>';
}

function jvAuditSummary(a) {
  const row = JV.audit.find(r => r.agent_id === a.id);
  if (!row) return { title: 'Sin actividad reciente registrada', detail: 'La ficha existe, pero todavía no hay una corrida reciente dentro de la bitácora visible.' };
  const out = row.output && typeof row.output === 'object' ? row.output : {};
  const title = out.accion || out.titulo || out.estado || row.resultado || 'Ejecución registrada';
  const detail = out.nota || out.resumen || out.detalle || out.mensaje || 'La ejecución dejó evidencia en la bitácora del sistema.';
  return { title: String(title), detail: String(detail) };
}
function jvAgentInspector() {
  const a = jvAgent(JV.inspectAgentId);
  if (!a || jvIsLegacy(a)) return '';
  const state = jvHumanState(a), audit = jvAuditSummary(a);
  const skills = Array.isArray(a.skills) ? a.skills : [];
  const tasks = Array.isArray(a.tareas) ? a.tareas : [];
  const pending = JV.props.filter(p => p.agent_id === a.id && p.estado === 'propuesta').length;
  const parent = a.parent_id ? jvAgent(a.parent_id) : null;
  const cleanTask = t => typeof t === 'object' ? (t.tarea || t.nombre || t.name || t.salida || '') : String(t || '');
  return '<aside class="jv-agent-inspector" aria-label="Ficha operativa de ' + OS_E(a.nombre) + '">'
    + '<div class="jv-ai-top"><div class="jv-ai-avatar">' + osIcon(jvAgentIcon(a), { size: 20 }) + '</div><div class="jv-ai-title"><b>' + OS_E(a.nombre) + '</b><span>' + OS_E(jvLineaLabel(a.linea || a.area || 'Equipo')) + ' · ' + OS_E(state.label) + '</span></div><button type="button" class="jv-ai-close" onclick="jvInspectAgent(null)" aria-label="Cerrar ficha">×</button></div>'
    + '<div class="jv-ai-body"><div class="jv-ai-section"><div class="jv-ai-label">Responsabilidad</div><div class="jv-ai-copy">' + OS_E(a.responsabilidad || a.proceso || 'Responsabilidad todavía no documentada.') + '</div></div>'
    + '<div class="jv-ai-section"><div class="jv-ai-label">Qué hizo recientemente</div><div class="jv-ai-now"><b>' + OS_E(audit.title) + '</b><span>' + OS_E(audit.detail) + ' · ' + OS_E(jvFmtTs(jvAgentLastRun(a))) + '</span></div></div>'
    + '<div class="jv-ai-section"><div class="jv-ai-grid"><div class="jv-ai-metric"><span>Reporta a</span><b>' + OS_E(parent ? parent.nombre : 'Cerebro Ejecutivo') + '</b></div><div class="jv-ai-metric"><span>Decisiones</span><b>' + pending + ' pendientes</b></div><div class="jv-ai-metric"><span>Horario</span><b>' + OS_E(jvScheduleText(a)) + '</b></div><div class="jv-ai-metric"><span>Riesgo</span><b>' + OS_E(a.nivel_riesgo || 'Sin clasificar') + '</b></div></div></div>'
    + (skills.length ? '<div class="jv-ai-section"><div class="jv-ai-label">Skills</div><div class="jv-ai-tags">' + skills.slice(0, 10).map(s => '<span>' + OS_E(String(s)) + '</span>').join('') + '</div></div>' : '')
    + (tasks.length ? '<div class="jv-ai-section"><div class="jv-ai-label">Tareas asignadas</div><div class="jv-ai-copy">' + tasks.slice(0, 5).map(t => '• ' + OS_E(cleanTask(t))).join('<br>') + '</div></div>' : '')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button type="button" class="jv-ai-action" onclick="jvWorkAgent(\'' + a.id + '\')">Ver trabajo →</button><button type="button" class="jv-ai-action" onclick="jvInspectOpenArea(\'' + OS_E(a.linea || '').replace(/'/g, "\\'") + '\')">Ficha completa →</button></div></div></aside>';
}
function jvInspectAgent(id) { JV.inspectAgentId = id || null; if (window.osRender) osRender(); }
function jvInspectOpenArea(linea) { JV.inspectAgentId = null; JV.filterLinea = linea || null; JV.tab = 'network'; if (window.osRender) osRender(); }
window.jvInspectAgent = jvInspectAgent;
window.jvInspectOpenArea = jvInspectOpenArea;

function jvMapaView() {
  const canEdit = jvRole() === 'admin';
  const current = JV.agents.filter(a => !jvIsLegacy(a));
  const activos = current.filter(jvOperational).length;
  const pendientes = current.length - activos;
  const legacy = JV.agents.length - current.length;
  const flt = JV.filterLinea;
  if (!flt) return jvMapaOverview(current, activos, pendientes);
  const baseLineas = JV_LINEAS.filter(L => L.linea !== 'Comando' && L.linea.indexOf('Transversal') !== 0);
  const lineas = flt ? baseLineas.filter(L => L.linea === flt) : baseLineas;
  let html = '<div class="jv-eyebrow">Equipo · ' + OS_E(jvLineaLabel(flt)) + '</div>'
    + '<div class="jv-lead">Responsabilidades, skills, tareas, horarios y evidencia real de ejecución.</div>'
    + '<div class="jv-status-strip"><span><b style="color:var(--jc-grn)">' + activos + '</b> funcionando</span><span><b style="color:var(--jc-amber)">' + pendientes + '</b> requieren configuración</span>' + (legacy ? '<span>' + legacy + ' agentes antiguos ocultos porque ya fueron absorbidos</span>' : '') + '</div>'
    + '<div class="jv-network-stage"><div class="jv-map-hub"><div class="orb">' + osIcon('brain', { size: 22 }) + '</div><div class="body"><b>Cerebro Ejecutivo</b><span>Coordina el equipo, comparte contexto, reúne perspectivas y te entrega la decisión final.</span></div><span class="jv-badge b-work">orquestando</span></div>'
    + '<div class="jv-filter-bar">' + osIcon('filter', { size: 13 }) + ' Área: <b>' + OS_E(jvLineaLabel(flt)) + '</b> <button class="jv-filter-x" onclick="jvFilterClear()">' + osIcon('arrow-left', { size: 12 }) + ' Volver al equipo completo</button></div>';
  lineas.forEach(L => {
    const ags = current.filter(a => a.linea === L.linea).sort((a, b) => (a.orden == null ? 99 : a.orden) - (b.orden == null ? 99 : b.orden));
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
  return html + '</div>';
}
function jvLineaHeader(L, count, planned) {
  return '<div class="jv-linea-h" style="--lc:' + L.color + '"><div class="ic">' + osIcon(L.icon, { size: 16 }) + '</div><b>' + OS_E(jvLineaLabel(L.linea)) + '</b>'
    + (planned ? '<span class="jv-chip">escuadra planificada</span>' : '<span class="jv-chip">' + count + ' agente' + (count !== 1 ? 's' : '') + '</span>') + '</div>';
}
// Una tarea puede venir como string o como objeto {tarea, salida}. Render seguro.
function jvFmtTarea(t) {
  if (t && typeof t === 'object') {
    const main = t.tarea || t.nombre || t.name || '';
    const sub = t.salida || t.output || '';
    return '<div>· ' + OS_E(String(main)) + (sub ? '<span class="jv-c2-tsub"> → ' + OS_E(String(sub)) + '</span>' : '') + '</div>';
  }
  return '<div>· ' + OS_E(String(t)) + '</div>';
}
function jvAgentCard(a, canEdit, canUp, canDown) {
  if (JV.mapEdit === a.id) return jvAgentEditForm(a);
  const tareas = Array.isArray(a.tareas) ? a.tareas : [];
  const skills = Array.isArray(a.skills) ? a.skills : [];
  const pend = JV.props.filter(p => p.agent_id === a.id && p.estado === 'propuesta').length;
  return '<div class="jv-card2">'
    + '<div class="jv-c2-top"><div class="jv-av">' + osIcon(jvAgentIcon(a), { size: 15 }) + '</div>'
    + '<div class="jv-c2-nm"><b>' + OS_E(a.nombre) + '</b><span>' + OS_E((a.capa || '') + ' · ' + jvFmtTs(jvAgentLastRun(a))) + '</span></div>'
    + jvAgentHumanBadge(a) + '</div>'
    + '<p class="jv-c2-resp">' + OS_E(a.responsabilidad || a.proceso || '') + '</p>'
    + (jvAgentIssue(a) ? '<div class="jv-needs-info">' + OS_E(jvAgentIssue(a)) + '</div>' : '')
    + ((tareas.length || skills.length) ? '<details class="jv-c2-tareas"><summary>Abrir ficha del empleado</summary>'
      + (skills.length ? '<div class="jv-st" style="margin-top:8px">Skills</div><div class="jv-c2-chips">' + skills.slice(0, 8).map(s => '<span class="jv-chip">' + OS_E(String(s)) + '</span>').join('') + '</div>' : '')
      + (tareas.length ? '<div class="jv-st" style="margin-top:8px">Tareas</div>' + tareas.slice(0, 6).map(jvFmtTarea).join('') : '') + '</details>' : '')
    + '<div class="jv-c2-meta"><span class="jv-chip">' + osIcon('clock', { size: 11 }) + ' ' + OS_E(jvScheduleText(a)) + '</span>'
    + (pend ? '<span class="jv-chip">' + pend + ' decisiones pendientes</span>' : '<span class="jv-chip">Sin decisiones pendientes</span>') + '</div>'
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
    const { error: auditError } = await sb.from('agent_audit_log').insert({ agent_id: id, input: { accion: 'editar_ficha', por: jvMe() }, output: { campos: ['responsabilidad', 'estado', 'riesgo', 'dueno_humano', 'skills', 'tareas'], estado: est }, resultado: 'ok' });
    if (auditError) console.warn('No se pudo registrar la edición en la bitácora:', auditError.message);
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
    const { error: auditError } = await sb.from('agent_audit_log').insert({ agent_id: id, input: { accion: 'reordenar', por: jvMe(), dir }, output: { de: a.orden, a: b.orden }, resultado: 'ok' });
    if (auditError) console.warn('No se pudo registrar el reordenamiento en la bitácora:', auditError.message);
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
  const pending = JV.props.filter(p => p.estado === 'propuesta').length;
  const decisionCallout = '<div class="jv-command-action"><div><b>' + (pending ? pending + ' decisiones necesitan revisión' : 'No hay decisiones pendientes') + '</b><span>' + (pending ? 'Están organizadas por área y cada una explica qué cambia antes de aprobar.' : 'El equipo puede seguir trabajando sin intervención.') + '</span></div>' + (pending ? '<button onclick="jvNav(\'propuestas\')">Revisar decisiones</button>' : '') + '</div>';
  return jvHudHeader() + jvCounters() + jvNorthStar() + decisionCallout + jvCore() + jvChatUI()
    + jvWorkPulse()
    + '<div class="jv-section-title" style="margin-top:24px">Actividad reciente del equipo</div>' + jvFeedHTML();
}

// ════════════════════════════════════════════════════════════════
// VIEW · TRABAJO (cola unificada, derivada de evidencia real)
// ════════════════════════════════════════════════════════════════
function jvAuditWorkInfo(r) {
  const out = r && r.output && typeof r.output === 'object' ? r.output : {};
  const inp = r && r.input && typeof r.input === 'object' ? r.input : {};
  const failed = /error|fail|fall/i.test(String((r && r.resultado) || ''));
  const title = out.accion || out.titulo || out.hallazgo || out.estado || inp.accion || inp.mode || 'Ejecución del agente';
  const detail = out.resumen || out.detalle || out.nota || out.mensaje || (failed ? 'La corrida terminó con un error registrado.' : 'La corrida dejó evidencia en la bitácora.');
  return { title: jvHumanize(title), detail: String(detail), state: failed ? 'failed' : 'done' };
}
function jvWorkItems() {
  const proposalItems = JV.props.map(p => {
    const info = jvProposalInfo(p);
    const state = p.estado === 'propuesta' ? 'waiting' : (p.estado === 'aprobada' ? 'running' : 'done');
    return { id: 'p-' + p.id, kind: 'Decisión', agentId: p.agent_id, area: jvProposalArea(p), title: info.title, detail: info.summary, state, ts: p.created_at, source: info.source || 'agent_proposals' };
  });
  const auditItems = JV.audit.map(r => {
    const info = jvAuditWorkInfo(r), a = jvAgent(r.agent_id);
    return { id: 'a-' + r.id, kind: 'Ejecución', agentId: r.agent_id, area: a ? jvLineaLabel(a.linea || a.area || 'General') : 'General', title: info.title, detail: info.detail, state: info.state, ts: r.ts, source: 'agent_audit_log' };
  });
  return proposalItems.concat(auditItems).sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
}
function jvWorkStateLabel(s) {
  return { waiting: 'necesita decisión', running: 'aprobada · en cola', done: 'completada', failed: 'requiere revisión' }[s] || 'registrada';
}
function jvWorkPulse() {
  const items = jvWorkItems().filter(x => x.state !== 'failed').slice(0, 4);
  if (!items.length) return '';
  return '<section style="margin-top:24px"><div class="jv-section-title">Trabajo visible ahora <span>' + items.length + '</span></div><div class="jv-work-table">'
    + items.map(x => '<div class="jv-work-row" style="grid-template-columns:92px minmax(200px,1.5fr) minmax(150px,.8fr) 110px"><span class="jv-work-state ' + x.state + '">' + OS_E(jvWorkStateLabel(x.state)) + '</span><div class="jv-work-task"><b>' + OS_E(x.title) + '</b><span>' + OS_E(x.detail) + '</span></div><div class="jv-work-owner" onclick="jvWorkAgent(\'' + (x.agentId || '') + '\')"><b>' + OS_E(jvAgentName(x.agentId)) + '</b><span>' + OS_E(x.area) + '</span></div><span class="jv-work-time">' + OS_E(jvFmtTs(x.ts)) + '</span></div>').join('')
    + '</div><button class="jv-filter-x" style="margin-top:9px" onclick="jvNav(\'work\')">Abrir toda la cola →</button></section>';
}
function jvWorkView() {
  const all = jvWorkItems();
  const areas = ['Todas'].concat([...new Set(all.map(x => x.area).filter(Boolean))]);
  const states = [['Todos', 'Todo'], ['waiting', 'Necesita decisión'], ['running', 'En cola'], ['done', 'Completado'], ['failed', 'Revisar']];
  let rows = all.filter(x => (JV.workArea === 'Todas' || x.area === JV.workArea) && (JV.workState === 'Todos' || x.state === JV.workState) && (!JV.workAgentId || x.agentId === JV.workAgentId));
  const counts = { waiting: all.filter(x => x.state === 'waiting').length, running: all.filter(x => x.state === 'running').length, done: all.filter(x => x.state === 'done').length, failed: all.filter(x => x.state === 'failed').length };
  const filters = '<div class="jv-work-toolbar"><div class="jv-filter-tabs">' + states.map(s => '<button class="' + (JV.workState === s[0] ? 'on' : '') + '" onclick="jvWorkState(\'' + s[0] + '\')">' + s[1] + '</button>').join('') + '</div><select onchange="jvWorkArea(this.value)" aria-label="Filtrar trabajo por área">' + areas.map(a => '<option value="' + OS_E(a) + '"' + (JV.workArea === a ? ' selected' : '') + '>' + OS_E(a) + '</option>').join('') + '</select>' + (JV.workAgentId ? '<button class="jv-filter-x" onclick="jvWorkAgent(null)">Agente: ' + OS_E(jvAgentName(JV.workAgentId)) + ' ×</button>' : '') + '</div>';
  const table = rows.length ? '<div class="jv-work-table"><div class="jv-work-row head"><span>Estado</span><span>Trabajo</span><span>Responsable</span><span>Evidencia</span><span>Hora</span></div>' + rows.slice(0, 120).map(x => '<article class="jv-work-row"><span class="jv-work-state ' + x.state + '">' + OS_E(jvWorkStateLabel(x.state)) + '</span><div class="jv-work-task"><b>' + OS_E(x.title) + '</b><span>' + OS_E(x.detail) + '</span></div><div class="jv-work-owner" role="button" tabindex="0" onclick="jvWorkAgent(\'' + (x.agentId || '') + '\')"><b>' + OS_E(jvAgentName(x.agentId)) + '</b><span>' + OS_E(x.area) + '</span></div><span class="jv-chip">' + OS_E(x.source) + '</span><span class="jv-work-time">' + OS_E(jvFmtTs(x.ts)) + '</span></article>').join('') + '</div>' : '<div class="jv-card"><b>No hay trabajo en este filtro</b><div class="jv-empty">Cambia el área o el estado. Jarvis no completa la cola con actividad simulada.</div></div>';
  return '<h1 class="jv-page-title">Cola de trabajo</h1><div class="jv-lead">Todo lo que los agentes hicieron, esperan o necesitan revisar, con responsable, hora y fuente de evidencia.</div><div class="jv-work-summary"><div class="jv-work-stat"><b>' + counts.waiting + '</b><span>Necesitan decisión</span></div><div class="jv-work-stat"><b>' + counts.running + '</b><span>Aprobadas en cola</span></div><div class="jv-work-stat"><b>' + counts.done + '</b><span>Completadas visibles</span></div><div class="jv-work-stat"><b>' + counts.failed + '</b><span>Requieren revisión</span></div></div>' + filters + table;
}
function jvWorkState(state) { JV.workState = state || 'Todos'; if (window.osRender) osRender(); }
function jvWorkArea(area) { JV.workArea = area || 'Todas'; if (window.osRender) osRender(); }
function jvWorkAgent(id) { JV.workAgentId = id || null; JV.tab = 'work'; if (window.osRender) osRender(); }
window.jvWorkState = jvWorkState;
window.jvWorkArea = jvWorkArea;
window.jvWorkAgent = jvWorkAgent;

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
    case 'cerebro': return jvAbrirCerebro();
    default: return;
  }
}
window.jvCmd = jvCmd;
function jvCore() {
  return '<div class="jv-core"><div class="jv-orbw"><div class="jv-ring jv-r1"></div><div class="jv-ring jv-r2"></div><div class="jv-orb"></div></div><div class="t">CEREBRO EJECUTIVO</div></div>';
}
// UNA SOLA PUERTA DE CHAT: el FAB omnipresente (os/os-cerebro.js) es la única caja
// de conversación de toda la app. Acá NO se renderiza un segundo chat — este CTA
// abre el MISMO Cerebro flotante (mismo backend `cerebro`, misma conversación).
function jvChatUI() {
  return '<div class="jv-chatbar" role="button" tabindex="0" style="cursor:pointer" onclick="jvAbrirCerebro()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();jvAbrirCerebro();}" title="Abrir el Cerebro">'
    + '<span class="jv-cta-orb" style="display:flex;align-items:center;color:var(--jc-pink)">' + osIcon('brain', { size: 16 }) + '</span>'
    + '<span style="flex:1;color:var(--jc-mut);font-size:14px;pointer-events:none">Hablá con el Cerebro — ¿qué está atrasado hoy? · ¿qué propuestas tengo pendientes?</span>'
    + '<button class="jv-send" onclick="event.stopPropagation();jvAbrirCerebro()">ABRIR CHAT</button></div>';
}
// Abre el FAB (Cerebro flotante). Puerta única de conversación en toda la app.
function jvAbrirCerebro(q) {
  if (typeof window.cerebroToggle === 'function') {
    window.cerebroToggle(true);
    if (q && typeof window.cerebroAsk === 'function') setTimeout(function () { window.cerebroAsk(q); }, 140);
    return;
  }
  if (typeof window.cerebroAsk === 'function') return window.cerebroAsk(q || '');
}
window.jvAbrirCerebro = jvAbrirCerebro;
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
  return '<h1 class="jv-page-title">Decisiones que necesitan tu atención</h1><div class="jv-lead">Revisa qué propone el agente, por qué lo recomienda y qué cambia antes de decidir.</div>' + jvLanesHTML();
}
function jvLanesHTML() {
  const lanes = { propuesta: [], aprobada: [], ejecutada: [], alerta: [] };
  JV.props.forEach(p => { const l = jvLaneOf(p); if (l) lanes[l].push(p); });
  const card = (p, alert, actions) => {
    const info = jvProposalInfo(p);
    const detail = jvProposalDetails(p);
    const busy = JV.busyId === p.id;
    const meta = [jvProposalArea(p), jvAgentName(p.agent_id), info.source, info.cut].filter(Boolean).join(' · ');
    return '<article class="jv-decision' + (alert ? ' alert' : '') + '"><div class="jv-decision-head"><span class="jv-chip">' + OS_E(jvProposalArea(p)) + '</span><span>' + OS_E(jvHumanize(p.tipo_accion || 'revisión')) + '</span></div><h4>' + OS_E(info.title) + '</h4><p>' + OS_E(info.summary) + '</p>'
      + (detail.html ? '<details class="jv-decision-more"><summary>Ver información para decidir</summary><div class="jv-detail-list">' + detail.html + '</div></details>' : '<div class="jv-needs-info">Falta información concreta. No la apruebes hasta que el agente explique la propiedad, el impacto y la acción.</div>')
      + '<div class="who">' + OS_E(meta) + '</div>'
      + (actions ? '<div class="jv-appr"><button class="ok" onclick="jvDecide(\'' + p.id + '\',\'aprobada\')"' + (busy || !detail.sufficient ? ' disabled' : '') + '>' + (busy ? 'Procesando…' : (detail.sufficient ? 'Aprobar propuesta' : 'Falta información')) + '</button><button class="no" onclick="jvDecide(\'' + p.id + '\',\'rechazada\')"' + (busy ? ' disabled' : '') + '>No aplicar</button></div>' : '') + '</article>';
  };
  const allPending = lanes.alerta.concat(lanes.propuesta);
  const areas = ['Todas'].concat([...new Set(allPending.map(jvProposalArea))]);
  const filters = '<div class="jv-filter-tabs">' + areas.map(a => '<button class="' + (JV.decisionArea === a ? 'on' : '') + '" onclick="jvDecisionArea(\'' + OS_E(a).replace(/'/g, "\\'") + '\')">' + OS_E(a) + ' <span>' + (a === 'Todas' ? allPending.length : allPending.filter(p => jvProposalArea(p) === a).length) + '</span></button>').join('') + '</div>';
  const pending = JV.decisionArea === 'Todas' ? allPending : allPending.filter(p => jvProposalArea(p) === JV.decisionArea);
  const history = lanes.aprobada.concat(lanes.ejecutada).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return filters + '<div class="jv-decisions-layout"><section><div class="jv-section-title">Pendientes <span>' + pending.length + '</span></div>'
    + (pending.length ? pending.slice(0, 40).map(p => card(p, jvIsAlert(p), true)).join('') : '<div class="jv-card"><b>Todo al día</b><div class="jv-empty">No hay decisiones pendientes en esta área.</div></div>') + '</section>'
    + '<aside><div class="jv-section-title">Resueltas recientemente</div>'
    + (history.length ? history.slice(0, 8).map(p => card(p, false, false)).join('') : '<div class="jv-empty">Todavía no hay historial.</div>') + '</aside></div>';
}
function jvDecisionArea(area) { JV.decisionArea = area; if (window.osRender) osRender(); }
window.jvDecisionArea = jvDecisionArea;
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
    const squad = JV.agents.filter(a => a.area === e.area && !jvIsLegacy(a));
    const areaAgentIds = squad.map(a => a.id);
    const props = JV.props.filter(p => areaAgentIds.includes(p.agent_id));
    const pend = props.filter(p => p.estado === 'propuesta').length;
    const line = a => '<div class="jv-simple-row"><div class="jv-av">' + osIcon(jvAgentIcon(a), { size: 14 }) + '</div><div class="body"><b>' + OS_E(a.nombre) + '</b><span>' + OS_E(a.responsabilidad || a.proceso || '') + ' · ' + jvFmtTs(jvAgentLastRun(a)) + '</span></div>' + jvAgentHumanBadge(a) + '</div>';
    return '<div class="jv-card"><div style="display:flex;align-items:center;gap:9px;margin-bottom:12px"><div class="jv-av">' + osIcon(e.icon, { size: 15 }) + '</div><b style="font-size:14px">' + OS_E(e.name) + '</b><span class="jv-chip" style="margin-left:auto">' + pend + ' pendientes · ' + props.length + ' props</span></div>'
      + (squad.length ? '<div class="jv-simple-list">' + squad.map(line).join('') + '</div>' : '<div class="jv-empty">Todavía no hay agentes conectados a esta empresa.</div>') + '</div>';
  }).join('');
  return '<div class="jv-eyebrow">Empresas</div><div class="jv-lead">Qué equipo trabaja en cada negocio, cuándo trabajó por última vez y qué necesita de vos.</div><div class="jv-2col">' + cards + '</div>';
}

// ════════════════════════════════════════════════════════════════
// VIEW · HORARIOS (cadena diaria + crons live)
// ════════════════════════════════════════════════════════════════
function jvHorariosView() {
  const agents = JV.agents.filter(a => !jvIsLegacy(a));
  const rows = agents.map(a => '<div class="jv-simple-row"><div class="jv-av">' + osIcon('clock', { size: 14 }) + '</div><div class="body"><b>' + OS_E(a.nombre) + '</b><span>' + OS_E(jvScheduleText(a)) + ' · última ejecución ' + jvFmtTs(jvAgentLastRun(a)) + '</span></div>' + jvAgentHumanBadge(a) + '</div>').join('');
  return '<div class="jv-eyebrow">Horarios y automatizaciones</div><div class="jv-lead">Horarios declarados por cada agente y evidencia de su última ejecución. Ya no se muestran cadenas teóricas como si estuvieran activas.</div><div class="jv-card"><div class="jv-simple-list">' + rows + '</div></div>';
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
  const sources = JV_FUENTES.map(f => '<div class="jv-simple-row"><div class="jv-av">' + osIcon(f.icon, { size: 14 }) + '</div><div class="body"><b>' + OS_E(f.label) + '</b><span>' + OS_E(f.desc) + '</span></div><span class="jv-badge b-work">fuente conectada</span></div>').join('');
  const activity = JV.audit.slice(0, 8).map(r => {
    const tm = r.ts ? jvFmtTs(r.ts) : 'sin fecha'; let out = '';
    try { const o = r.output; out = o && typeof o === 'object' ? (o.accion || o.nota || o.estado || r.resultado) : (r.resultado || 'actualización'); } catch (_) { out = r.resultado || 'actualización'; }
    return '<div class="jv-simple-row"><div class="jv-av">' + osIcon('brain', { size: 14 }) + '</div><div class="body"><b>' + OS_E(jvAgentName(r.agent_id)) + '</b><span>' + OS_E(String(out || 'Actualizó la memoria compartida')) + '</span></div><span class="jv-chip">' + OS_E(tm) + '</span></div>';
  }).join('');
  return '<h1 class="jv-page-title">Memoria compartida</h1><div class="jv-lead">El contexto que permite que todos los agentes trabajen con la misma información y continúen donde otro terminó.</div>'
    + '<div class="jv-kpis"><div class="jv-kpi"><div class="n">' + jvNum(JV.memCount) + '</div><div class="l">recuerdos guardados</div><div class="s">Contexto reutilizable entre agentes</div></div><div class="jv-kpi"><div class="n">' + JV_FUENTES.length + '</div><div class="l">fuentes principales</div><div class="s">Datos operativos y financieros</div></div></div>'
    + '<div class="jv-2col"><section><div class="jv-section-title">Fuentes conectadas</div><div class="jv-simple-list">' + sources + '</div></section><section><div class="jv-section-title">Actividad reciente de la memoria</div><div class="jv-simple-list">' + (activity || '<div class="jv-empty">Todavía no hay actividad reciente.</div>') + '</div></section></div>';
}

function jvVaultGraphView() {
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
  nodes[cId] = { kind: 'cerebro', label: cerebro ? cerebro.nombre : 'Cerebro Ejecutivo', icon: 'brain', color: JV_CAPA_COL.Command, capaLabel: 'Comando · Orquestador', proceso: cerebro ? cerebro.proceso : '', riesgo: cerebro && cerebro.nivel_riesgo, estado: cerebro && cerebro.estado, area: 'holding', squad: null, run: cerebro ? jvAgentLastRun(cerebro) : null };
  svg += nodeG(cId, cx, cy, 40, 'brain', JV_CAPA_COL.Command) + lbl(cx, cy, 40, cerebro ? cerebro.nombre : 'Cerebro Ejecutivo');
  ring.forEach(a => {
    const col = JV_CAPA_COL[a.capa] || '#888', ic = jvAgentIcon(a);
    nodes[a.id] = { kind: 'agent', label: a.nombre, icon: ic, color: col, capaLabel: JV_CAPA_LABEL[a.capa] || a.capa, proceso: a.proceso, riesgo: a.nivel_riesgo, estado: a.estado, area: a.area, squad: a.squad, run: jvAgentLastRun(a) };
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
  const informes = JV.props.filter(p => p.tipo_accion === 'informe' || p.estado === 'ejecutada');
  const areas = ['Todas'].concat([...new Set(informes.map(jvProposalArea))]);
  const selected = JV.reportArea === 'Todas' ? informes : informes.filter(p => jvProposalArea(p) === JV.reportArea);
  const filters = '<div class="jv-filter-tabs">' + areas.map(a => '<button class="' + (JV.reportArea === a ? 'on' : '') + '" onclick="jvReportArea(\'' + OS_E(a).replace(/'/g, "\\'") + '\')">' + OS_E(a) + ' <span>' + (a === 'Todas' ? informes.length : informes.filter(p => jvProposalArea(p) === a).length) + '</span></button>').join('') + '</div>';
  const groups = [...new Set(selected.map(jvProposalArea))].map(area => {
    const rows = selected.filter(p => jvProposalArea(p) === area).slice(0, 30).map(p => {
      const info = jvProposalInfo(p); const raw = jvEvid(p);
      const body = typeof raw === 'string' ? raw : info.summary;
      const date = p.created_at ? new Date(p.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Sin fecha';
      return '<details class="jv-report-item"><summary><div><h3>' + OS_E(info.title) + '</h3><div class="report-meta">' + OS_E(jvAgentName(p.agent_id)) + ' · ' + OS_E(date) + '</div></div>' + osIcon('chevron-down', { size: 15 }) + '</summary><div class="jv-report-body">' + OS_E(body || 'Este reporte todavía no contiene un resumen legible.') + '</div></details>';
    }).join('');
    return '<section class="jv-report-group"><div class="jv-section-title">' + OS_E(area) + ' <span>' + selected.filter(p => jvProposalArea(p) === area).length + '</span></div><div class="jv-report-list">' + rows + '</div></section>';
  }).join('');
  return '<h1 class="jv-page-title">Reportes del equipo</h1><div class="jv-lead">Organizados por área. Abre cualquiera para leer el resultado completo y saber qué agente lo generó.</div>' + filters + (groups || '<div class="jv-empty">Todavía no hay reportes en esta área.</div>');
}
function jvReportArea(area) { JV.reportArea = area; if (window.osRender) osRender(); }
window.jvReportArea = jvReportArea;

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
    agentes: JV.agents.map(a => ({ nombre: a.nombre, capa: a.capa, area: a.area, riesgo: a.nivel_riesgo, estado: a.estado, ultima_corrida: jvAgentLastRun(a) })),
    holding: os ? os.holding : null, cobranza: os ? os.cobranza : null,
  };
}
async function jvAsk(q) {
  const inp = document.getElementById('jv-ask'); const question = (q || (inp ? inp.value.trim() : '')).trim();
  if (!question || JV.chatBusy) return; if (inp) inp.value = '';
  JV.chatBusy = true; JV.chat.push({ role: 'user', content: question }); JV.chat.push({ role: 'assistant', content: '', thinking: true }); jvRenderChat();
  const history = JV.chat.filter(m => !m.thinking && !m.error).slice(0, -1).map(m => ({ role: m.role, content: m.content }));
  try {
    // Un solo cerebro: el chat del control room usa el MISMO orquestador `cerebro`
    // (snapshot server-side de números reales + delegación en los agentes de área).
    const tok = await (async () => { try { const s = await sb.auth.getSession(); return (s && s.data.session && s.data.session.access_token) || window.SUPABASE_ANON_KEY; } catch (e) { return window.SUPABASE_ANON_KEY; } })();
    const r = await fetch(window.SUPABASE_URL + '/functions/v1/cerebro', { method: 'POST', headers: { 'content-type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + tok }, body: JSON.stringify({ question, history, screen: 'Sala de control de agentes (/jarvis)' }) });
    const data = await r.json().catch(() => ({})); JV.chat.pop();
    JV.chat.push(r.ok ? { role: 'assistant', content: data.answer || 'Sin respuesta.' } : { role: 'assistant', content: data.error || ('Error (HTTP ' + r.status + ').'), error: true });
  } catch (e) { JV.chat.pop(); JV.chat.push({ role: 'assistant', content: 'No pude conectar: ' + (e.message || e), error: true }); }
  JV.chatBusy = false; jvRenderChat();
}
window.jvAsk = jvAsk;
