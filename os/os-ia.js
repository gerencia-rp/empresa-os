// ════════════════════════════════════════════════════════════════
// 🤖 DEPARTAMENTO IA (ruta /ia del OS) — 3 vistas: Pedir / Bandeja / Galería.
// Persistencia: Supabase `ia_requests` + `ia_artifacts` (soft-delete `activo`).
// Acceso: Pedir + Galería = cualquier usuario logueado (RLS: cada uno ve SUS
// pedidos); Bandeja = área 'ia' o admin (has_area('ia') en la DB).
// ⚠ NAMESPACE: OSIA / osia* — el prefijo IA/ia* ya lo ocupa os/inv-admin.js.
// Estilo: reusa los tokens/clases del shell del OS (light/dark vía pos-theme).
// ════════════════════════════════════════════════════════════════
const OSIA = { loaded: false, loading: false, err: null, reqs: [], arts: [], tab: 'pedir', q: '', fArea: '', ok: null, me: '', artForm: false };
window.OSIA = OSIA;

const OSIA_TIPOS = ['prompt', 'dashboard', 'agente', 'automatizacion'];
const OSIA_TIPO_LBL = { prompt: '💬 Prompt', dashboard: '📊 Dashboard', agente: '🤖 Agente', automatizacion: '⚡ Automatización' };
const OSIA_ESTADOS = ['nueva', 'en_revision', 'en_construccion', 'publicada', 'descartada'];
const OSIA_ESTADO_LBL = { nueva: 'Nueva', en_revision: 'En revisión', en_construccion: 'En construcción', publicada: 'Publicada', descartada: 'Descartada' };
const OSIA_ESTADO_CLS = { nueva: 'b-warn', en_revision: 'b-warn', en_construccion: 'b-warn', publicada: 'b-ok', descartada: 'b-red' };
const OSIA_IMPACTOS = ['alto', 'medio', 'bajo'];

function osiaE(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function osiaAreas() { return ['Fix & Flip', 'Rentas', 'Remodelación', 'Educación', 'Operación', 'Contable', 'Administración', 'Otro']; }
function osiaCanManage() { return window.osCanArea ? osCanArea('ia') : false; }
function osiaFecha(ts) { try { return new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }); } catch (e) { return ''; } }

// ─── CSS propio (solo campos de formulario; el resto viene del shell) ───
function osiaCSS() {
  if (document.getElementById('osia-styles')) return;
  const st = document.createElement('style'); st.id = 'osia-styles';
  st.textContent = `
  #os-root .osia-field{display:flex;flex-direction:column;gap:5px;margin-bottom:13px}
  #os-root .osia-field label{font-size:10.5px;letter-spacing:1px;color:var(--mut2);text-transform:uppercase;font-weight:700}
  #os-root .osia-field input,#os-root .osia-field select,#os-root .osia-field textarea{background:var(--glass);border:1px solid var(--glassb);border-radius:10px;padding:10px 12px;color:var(--ink);font-size:12.5px;outline:none;font-family:inherit;width:100%}
  #os-root .osia-field input:focus,#os-root .osia-field select:focus,#os-root .osia-field textarea:focus{border-color:var(--a2)}
  #os-root .osia-field textarea{min-height:74px;resize:vertical;line-height:1.5}
  #os-root .osia-hint{font-size:10.5px;color:var(--mut2)}
  #os-root .osia-tabs{display:flex;gap:8px;margin:6px 0 18px;flex-wrap:wrap}
  #os-root .osia-tab{background:var(--glass);border:1px solid var(--glassb);color:var(--mut);padding:8px 16px;border-radius:11px;cursor:pointer;font-size:12.5px;font-weight:600}
  #os-root .osia-tab:hover{color:var(--ink);border-color:var(--a2)}
  #os-root .osia-tab.on{color:var(--ink);border-color:var(--a2);background:linear-gradient(135deg,rgba(69,227,198,.12),rgba(79,141,255,.1))}
  #os-root .osia-mic{background:var(--glass);border:1px solid var(--glassb);border-radius:10px;cursor:pointer;font-size:15px;padding:0 12px;color:var(--ink)}
  #os-root .osia-mic.rec{border-color:var(--neg);animation:osiapulse 1s infinite}
  @keyframes osiapulse{50%{opacity:.5}}
  #os-root .osia-row-in{background:var(--glass);border:1px solid var(--glassb);border-radius:8px;padding:5px 8px;color:var(--ink);font-size:11.5px;outline:none;font-family:inherit;max-width:100%}
  #os-root .osia-ok{background:rgba(72,214,156,.12);border:1px solid rgba(72,214,156,.35);border-radius:12px;padding:12px 16px;font-size:12.5px;color:var(--pos);margin-bottom:14px}`;
  document.head.appendChild(st);
}

// ─── DATA ───
async function osiaLoad(force) {
  if (OSIA.loading || (OSIA.loaded && !force)) return;
  OSIA.loading = true; OSIA.err = null;
  try {
    const [rq, ar, usr] = await Promise.all([
      sb.from('ia_requests').select('*').eq('activo', true).order('creado_at', { ascending: false }),
      sb.from('ia_artifacts').select('*').eq('activo', true).order('creado_at', { ascending: false }),
      sb.auth.getUser().catch(() => null),
    ]);
    if (rq.error) throw rq.error;
    OSIA.reqs = rq.data || []; OSIA.arts = ar.data || [];
    OSIA.me = (usr && usr.data && usr.data.user && usr.data.user.email) || '';
    OSIA.loaded = true;
  } catch (e) { OSIA.err = e.message || String(e); }
  OSIA.loading = false;
  osRender();
}
window.osiaLoad = osiaLoad;

function osiaGo(tab) {
  OSIA.tab = tab; OSIA.ok = null;
  const path = tab === 'pedir' ? '/ia' : '/ia/' + tab;
  if (location.pathname.replace(/\/+$/, '') !== path) { osNav(path); } else { osRender(); }
}
window.osiaGo = osiaGo;

// ─── VISTA (la despacha osEmpresa de os.js para empresa='ia') ───
function osiaView() {
  osiaCSS();
  const tab = OSIA.tab;
  if (!OSIA.loaded && !OSIA.loading && !OSIA.err) osiaLoad();
  const mgr = osiaCanManage();
  const tabBtn = (k, lbl) => '<button class="osia-tab ' + (tab === k ? 'on' : '') + '" onclick="osiaGo(\'' + k + '\')">' + lbl + '</button>';
  let body;
  if (OSIA.err) body = '<div class="empty"><div style="font-size:34px">⚠️</div><div class="down" style="margin-top:8px">' + osiaE(OSIA.err) + '</div></div>';
  else if (!OSIA.loaded) body = '<div class="empty">⏳ Cargando departamento IA…</div>';
  else body = tab === 'bandeja' ? (mgr ? osiaBandeja() : osiaNoAccess()) : tab === 'galeria' ? osiaGaleria() : osiaPedir();
  const nNew = mgr ? OSIA.reqs.filter(r => r.estado === 'nueva').length : 0;
  return '<h1>🤖 IA <span>· Departamento</span></h1><div class="sub">Pedí una automatización, seguí su estado y usá lo ya publicado. Cada pedido alimenta el registro de agentes del holding.</div>' +
    '<div class="osia-tabs">' + tabBtn('pedir', '📝 Pedir') + (mgr ? tabBtn('bandeja', '📥 Bandeja' + (nNew ? ' (' + nNew + ')' : '')) : '') + tabBtn('galeria', '🖼 Galería') + '</div>' + body;
}
window.osiaView = osiaView;

function osiaNoAccess() {
  return '<div class="empty"><div style="font-size:34px">🔒</div><div style="margin-top:8px">La Bandeja es para gestores del área IA (o admins).</div></div>';
}

// ─── 1) PEDIR ───
function osiaPedir() {
  const mine = OSIA.reqs; // RLS ya filtra: un no-gestor solo recibe SUS pedidos
  const areaOpts = ['<option value="">Elegí un área…</option>'].concat(osiaAreas().map(a => '<option>' + osiaE(a) + '</option>')).join('');
  const hasVoice = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const micBtn = hasVoice ? '<button type="button" class="osia-mic" id="osia-mic" onclick="osiaVoice()" title="Dictar por voz">🎤</button>' : '';
  const okMsg = OSIA.ok ? '<div class="osia-ok">✅ ' + osiaE(OSIA.ok) + '</div>' : '';
  const misPedidos = mine.length ? '<div class="card" style="margin-top:16px"><div class="chart-h"><div class="t">Pedidos</div><div class="k">' + mine.length + ' · estado actualizado por el equipo IA</div></div>' +
    '<table class="ptable"><thead><tr><th>Fecha</th><th>Área</th><th>Pedido</th><th>Estado</th></tr></thead><tbody>' +
    mine.slice(0, 30).map(r => '<tr><td>' + osiaFecha(r.creado_at) + '</td><td>' + osiaE(r.area || '—') + '</td><td style="max-width:420px">' + osiaE((r.descripcion || '').slice(0, 140)) + '</td><td><span class="badge ' + (OSIA_ESTADO_CLS[r.estado] || 'b-warn') + '">' + (OSIA_ESTADO_LBL[r.estado] || r.estado) + '</span></td></tr>').join('') +
    '</tbody></table></div>' : '';
  return okMsg + '<div class="grid k2" style="align-items:start">' +
    '<div class="card"><div class="chart-h"><div class="t">📝 Pedí algo a la IA</div><div class="k">2 minutos</div></div>' +
    '<div class="osia-field"><label>Tu nombre</label><input id="osia-nombre" value="' + osiaE(OSIA.me) + '" placeholder="Nombre o email"></div>' +
    '<div class="osia-field"><label>Área</label><select id="osia-area">' + areaOpts + '</select></div>' +
    '<div class="osia-field"><label>¿Qué tarea hacés hoy? *</label><div style="display:flex;gap:8px"><textarea id="osia-desc" placeholder="Contá la tarea con tus palabras. Ej: todos los lunes copio los pagos de Airtable a una planilla y armo el resumen para el grupo…" style="flex:1"></textarea>' + micBtn + '</div>' +
    (hasVoice ? '<div class="osia-hint">Tocá el micrófono y dictá — se agrega al texto.</div>' : '') + '</div>' +
    '<div class="osia-field"><label>¿Cuánto tiempo te lleva y con qué frecuencia?</label><input id="osia-frec" placeholder="Ej: 2 horas, todos los lunes"></div>' +
    '<div class="osia-field"><label>¿Qué te gustaría que hiciera la IA?</label><textarea id="osia-res" placeholder="Ej: que el resumen se arme y se mande solo, y yo solo lo revise"></textarea></div>' +
    '<div class="osia-field"><label>Ejemplo (opcional)</label><textarea id="osia-ej" placeholder="Pegá un ejemplo real: un mensaje, una planilla, un link…"></textarea></div>' +
    '<button class="cbtn" style="padding:10px 22px;font-size:12.5px" onclick="osiaSubmit()">Enviar pedido →</button></div>' +
    '<div class="card"><div class="chart-h"><div class="t">💡 ¿Qué puede salir de tu pedido?</div></div>' +
    OSIA_TIPOS.map(t => '<div class="kv"><span>' + OSIA_TIPO_LBL[t] + '</span><b>' + ({ prompt: 'una instrucción lista para usar', dashboard: 'un tablero con tus datos', agente: 'un asistente que lo hace por vos', automatizacion: 'el proceso corre solo' }[t]) + '</b></div>').join('') +
    '<div class="meta" style="margin-top:12px">El equipo IA revisa cada pedido, estima el impacto y lo construye. Cuando se publica, lo encontrás en la <a style="color:var(--a2);cursor:pointer" onclick="osiaGo(\'galeria\')">Galería</a>.</div></div></div>' + misPedidos;
}

async function osiaSubmit() {
  const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const desc = g('osia-desc');
  if (!desc) { if (window.toast) toast('Contanos la tarea (campo obligatorio)', 'error'); else alert('Contanos la tarea'); return; }
  const payload = { solicitante: g('osia-nombre') || OSIA.me || null, area: g('osia-area') || null, descripcion: desc, frecuencia: g('osia-frec') || null, resultado_deseado: g('osia-res') || null, ejemplo: g('osia-ej') || null };
  const { error } = await sb.from('ia_requests').insert(payload);
  if (error) { if (window.toast) toast('Error al guardar: ' + error.message, 'error'); else alert(error.message); return; }
  OSIA.ok = 'Pedido enviado. El equipo IA lo revisa y te va a aparecer acá abajo con su estado.';
  await osiaLoad(true);
}
window.osiaSubmit = osiaSubmit;

// Dictado por voz (Web Speech API — campo descripción)
function osiaVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const btn = document.getElementById('osia-mic');
  if (OSIA._rec) { try { OSIA._rec.stop(); } catch (e) {} OSIA._rec = null; if (btn) btn.classList.remove('rec'); return; }
  const rec = new SR(); rec.lang = 'es-MX'; rec.continuous = true; rec.interimResults = false;
  rec.onresult = ev => { let t = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript; const el = document.getElementById('osia-desc'); if (el && t) el.value = (el.value ? el.value + ' ' : '') + t.trim(); };
  rec.onend = () => { OSIA._rec = null; const b = document.getElementById('osia-mic'); if (b) b.classList.remove('rec'); };
  rec.onerror = rec.onend;
  OSIA._rec = rec; if (btn) btn.classList.add('rec');
  try { rec.start(); } catch (e) { OSIA._rec = null; if (btn) btn.classList.remove('rec'); }
}
window.osiaVoice = osiaVoice;

// ─── 2) BANDEJA (gestores) ───
function osiaBandeja() {
  const rows = OSIA.reqs;
  if (!rows.length) return '<div class="empty"><div style="font-size:34px">📥</div><div style="margin-top:8px">Sin pedidos todavía. Cuando alguien pida algo en 📝 Pedir, aparece acá.</div></div>';
  const sel = (id, opts, cur, lbls) => '<select class="osia-row-in" id="' + id + '">' + ['<option value="">—</option>'].concat(opts.map(o => '<option value="' + o + '" ' + (cur === o ? 'selected' : '') + '>' + ((lbls && lbls[o]) || o) + '</option>')).join('') + '</select>';
  const tr = r => '<tr>' +
    '<td style="white-space:nowrap">' + osiaFecha(r.creado_at) + '</td>' +
    '<td>' + osiaE(r.solicitante || '—') + '<div class="meta" style="margin-top:2px">' + osiaE(r.area || '') + '</div></td>' +
    '<td style="max-width:340px"><div title="' + osiaE(r.descripcion) + '">' + osiaE((r.descripcion || '').slice(0, 120)) + ((r.descripcion || '').length > 120 ? '…' : '') + '</div>' +
    (r.frecuencia ? '<div class="meta">⏱ ' + osiaE(r.frecuencia) + '</div>' : '') +
    (r.resultado_deseado ? '<div class="meta">🎯 ' + osiaE(r.resultado_deseado.slice(0, 90)) + '</div>' : '') + '</td>' +
    '<td>' + sel('osia-est-' + r.id, OSIA_ESTADOS, r.estado, OSIA_ESTADO_LBL) + '</td>' +
    '<td>' + sel('osia-tipo-' + r.id, OSIA_TIPOS, r.tipo, OSIA_TIPO_LBL) + '</td>' +
    '<td>' + sel('osia-imp-' + r.id, OSIA_IMPACTOS, r.impacto) + '</td>' +
    '<td><input class="osia-row-in" id="osia-nota-' + r.id + '" value="' + osiaE(r.nota || '') + '" placeholder="Nota interna" style="min-width:130px"></td>' +
    '<td style="white-space:nowrap"><button class="cbtn" style="padding:5px 10px" onclick="osiaSaveRow(\'' + r.id + '\')">💾</button> <button class="ibtn" style="height:27px;padding:0 9px" title="Soft-delete (activo=false)" onclick="osiaDropRow(\'' + r.id + '\')">🗑</button></td></tr>';
  return '<div class="card"><div class="chart-h"><div class="t">📥 Bandeja de pedidos</div><div class="k">' + rows.length + ' activos · editá estado/tipo/impacto/nota y guardá por fila</div></div>' +
    '<div style="overflow-x:auto"><table class="ptable"><thead><tr><th>Fecha</th><th>Solicitante</th><th>Pedido</th><th>Estado</th><th>Tipo</th><th>Impacto</th><th>Nota</th><th></th></tr></thead><tbody>' +
    rows.map(tr).join('') + '</tbody></table></div></div>';
}

async function osiaSaveRow(id) {
  const g = k => { const el = document.getElementById('osia-' + k + '-' + id); return el ? (el.value || null) : null; };
  const { error } = await sb.from('ia_requests').update({ estado: g('est') || 'nueva', tipo: g('tipo'), impacto: g('imp'), nota: g('nota') }).eq('id', id);
  if (error) { if (window.toast) toast('Error: ' + error.message, 'error'); else alert(error.message); return; }
  if (window.toast) toast('Pedido actualizado', 'success');
  await osiaLoad(true);
}
window.osiaSaveRow = osiaSaveRow;

async function osiaDropRow(id) {
  if (!confirm('¿Sacar este pedido de la bandeja? (soft-delete, recuperable en la DB)')) return;
  const { error } = await sb.from('ia_requests').update({ activo: false }).eq('id', id);
  if (error) { if (window.toast) toast('Error: ' + error.message, 'error'); return; }
  await osiaLoad(true);
}
window.osiaDropRow = osiaDropRow;

// ─── 3) GALERÍA ───
function osiaGaleria() {
  const mgr = osiaCanManage();
  const areas = ['', ...new Set(OSIA.arts.map(a => a.area).filter(Boolean))];
  const filtro = '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">' +
    '<input class="osia-row-in" style="flex:1;min-width:200px;padding:9px 12px" placeholder="🔎 Buscar por título o descripción…" value="' + osiaE(OSIA.q) + '" oninput="osiaSetQ(this.value)">' +
    '<select class="osia-row-in" style="padding:9px 12px" onchange="osiaSetArea(this.value)">' + areas.map(a => '<option value="' + osiaE(a) + '" ' + (OSIA.fArea === a ? 'selected' : '') + '>' + (a ? osiaE(a) : 'Todas las áreas') + '</option>').join('') + '</select>' +
    (mgr ? '<button class="ibtn" onclick="OSIA.artForm=!OSIA.artForm;osRender()">＋ Publicar artefacto</button>' : '') + '</div>';
  const form = (mgr && OSIA.artForm) ? '<div class="card" style="margin-bottom:16px"><div class="chart-h"><div class="t">＋ Publicar artefacto</div><div class="k">visible para todo el equipo</div></div>' +
    '<div class="grid k2"><div class="osia-field"><label>Título *</label><input id="osia-at"></div>' +
    '<div class="osia-field"><label>Área</label><select id="osia-aa">' + ['<option value=""></option>'].concat(osiaAreas().map(a => '<option>' + osiaE(a) + '</option>')).join('') + '</select></div>' +
    '<div class="osia-field"><label>Tipo</label><select id="osia-atp">' + ['<option value=""></option>'].concat(OSIA_TIPOS.map(t => '<option value="' + t + '">' + OSIA_TIPO_LBL[t] + '</option>')).join('') + '</select></div>' +
    '<div class="osia-field"><label>Ruta / link</label><input id="osia-ar" placeholder="/rentas o https://…"></div></div>' +
    '<div class="osia-field"><label>Descripción</label><textarea id="osia-ad" placeholder="Qué hace y cómo se usa"></textarea></div>' +
    '<button class="cbtn" style="padding:9px 18px" onclick="osiaArtSave()">Publicar →</button></div>' : '';
  return filtro + form + '<div id="osia-gal-list">' + osiaGalList() + '</div>';
}

function osiaGalList() {
  const q = (OSIA.q || '').toLowerCase();
  const list = OSIA.arts.filter(a => a.activo !== false)
    .filter(a => !OSIA.fArea || a.area === OSIA.fArea)
    .filter(a => !q || ((a.titulo || '') + ' ' + (a.descripcion || '')).toLowerCase().includes(q));
  if (!list.length) return '<div class="empty"><div style="font-size:34px">🖼</div><div style="margin-top:8px">Todavía no hay artefactos publicados' + (q || OSIA.fArea ? ' con ese filtro' : '') + '. Los pedidos que se construyen aparecen acá.</div></div>';
  const card = a => '<div class="card"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
    (a.tipo ? '<span class="badge b-ok">' + (OSIA_TIPO_LBL[a.tipo] || a.tipo) + '</span>' : '') +
    (a.area ? '<span class="badge b-warn">' + osiaE(a.area) + '</span>' : '') +
    '<span class="meta" style="margin-left:auto">' + osiaFecha(a.creado_at) + '</span></div>' +
    '<div style="font-size:15px;font-weight:700;margin-top:10px">' + osiaE(a.titulo) + '</div>' +
    (a.descripcion ? '<div class="meta" style="margin-top:6px">' + osiaE(a.descripcion) + '</div>' : '') +
    (a.ruta ? '<div class="go" style="cursor:pointer" onclick="osiaOpen(\'' + osiaE(a.ruta) + '\')">Abrir →</div>' : '');
  return '<div class="grid k3" style="align-items:start">' + list.map(a => card(a) + '</div>').join('') + '</div>';
}

function osiaSetQ(v) { OSIA.q = v; const el = document.getElementById('osia-gal-list'); if (el) el.innerHTML = osiaGalList(); }
window.osiaSetQ = osiaSetQ;
function osiaSetArea(v) { OSIA.fArea = v; const el = document.getElementById('osia-gal-list'); if (el) el.innerHTML = osiaGalList(); }
window.osiaSetArea = osiaSetArea;
function osiaOpen(ruta) { if (/^https?:/i.test(ruta)) window.open(ruta, '_blank'); else osNav(ruta); }
window.osiaOpen = osiaOpen;

async function osiaArtSave() {
  const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const titulo = g('osia-at');
  if (!titulo) { if (window.toast) toast('Falta el título', 'error'); else alert('Falta el título'); return; }
  const { error } = await sb.from('ia_artifacts').insert({ titulo, area: g('osia-aa') || null, tipo: g('osia-atp') || null, descripcion: g('osia-ad') || null, ruta: g('osia-ar') || null });
  if (error) { if (window.toast) toast('Error: ' + error.message, 'error'); else alert(error.message); return; }
  OSIA.artForm = false;
  if (window.toast) toast('Artefacto publicado', 'success');
  await osiaLoad(true);
}
window.osiaArtSave = osiaArtSave;
