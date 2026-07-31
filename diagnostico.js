// ═══ APP STANDALONE · Diagnóstico Patológico de Vivienda ═══
// /diagnostico — shell propio de 4 pestañas. Reusa las tablas insp_* y remodel_inspecciones.
// Motor de daño IDÉNTICO al verificado (Starbright 67.2%, Interno 75.5) — no modificar.
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, { auth: { persistSession: true } });
if (typeof window.osIcon !== 'function') window.osIcon = () => ''; // si /ui/icons.js no cargó, la app degrada sin iconos en vez de colgarse
const $ = h => { document.getElementById('app').innerHTML = h; };
const M = n => n == null ? '—' : '$' + Math.round(+n).toLocaleString('en-US');
const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const D = { divisiones: [], patologias: [], etapas: [], config: {}, checklistItems: [], inspecciones: [], props: [], tab: 'evaluar', wizard: null, theme: 'dark' };
function Dcfg(k, def) { const v = D.config[k]; return v != null ? +v : def; }

// ─── MOTOR (idéntico al módulo verificado) ───
function dCelda(score) { return (Math.max(1, Math.min(5, +score)) - 1) / 4 * 100; }
function dDanoDivision(sc) { let n = 0, den = 0; D.patologias.forEach(p => { const s = sc && sc[p.key]; if (s == null) return; n += (+p.peso_pct) * dCelda(s); den += (+p.peso_pct); }); return den ? n / den : null; }
function dCompute(scores) {
  const divD = {}; let gn = 0, gd = 0;
  D.divisiones.forEach(d => { const dd = dDanoDivision(scores[d.key]); if (dd == null) return; divD[d.key] = Math.round(dd * 10) / 10; gn += (+d.peso_pct) * dd; gd += (+d.peso_pct); });
  const global = gd ? Math.round(gn / gd * 10) / 10 : null;
  const patD = {}; D.patologias.forEach(p => { let n = 0, ds = 0; D.divisiones.forEach(d => { const v = scores[d.key] && scores[d.key][p.key]; if (v == null) return; n += (+d.peso_pct) * dCelda(v); ds += (+d.peso_pct); }); if (ds) patD[p.key] = Math.round(n / ds * 10) / 10; });
  const etD = {}; D.etapas.forEach(e => { const divs = e.divisiones || []; let n = 0, ds = 0; divs.forEach(dk => { if (divD[dk] == null) return; const w = +(D.divisiones.find(x => x.key === dk) || {}).peso_pct || 0; n += w * divD[dk]; ds += w; }); if (ds) etD[e.etapa] = Math.round(n / ds * 10) / 10; });
  return { global, divisiones: divD, patologias: patD, etapas: etD };
}
function dVeredicto(g) { if (g == null) return '—'; if (g < 20) return 'Excelente'; if (g < 40) return 'Buen estado'; if (g < 60) return 'Estado regular'; if (g < 80) return 'Deterioro grave'; return 'Crítico'; }
function dVerColor(g) { return g == null ? 'var(--mut2)' : g >= 60 ? 'var(--neg)' : g >= 40 ? 'var(--amber)' : 'var(--pos)'; }

// ─── AUTH + CARGA ───
async function dInit() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session && !window.__diagTest) { location.href = '/?next=/diagnostico'; return; }
    if (!session && window.__diagTest) return; // test: no redirige, la data se inyecta
    D.theme = (localStorage.getItem('diag_theme') || 'dark'); document.documentElement.dataset.theme = D.theme;
    await dLoad(); dRender();
  } catch (e) { // nunca dejar el "Cargando…" colgado: error visible + reintentar
    console.error('dInit', e);
    $(`<div class="login card"><h1 class="down">No se pudo cargar</h1><div style="font-size:12px;color:var(--mut);margin:10px 0">${E(e && e.message || e)}</div><button class="btn" onclick="location.reload()">↻ Reintentar</button></div>`);
  }
}
async function dLoad() {
  try {
    const [dv, pt, et, cf, ins, pr, ci] = await Promise.all([
      sb.from('insp_divisiones').select('*').eq('active', true).order('orden').then(r => r.data || []),
      sb.from('insp_patologias').select('*').eq('active', true).order('orden').then(r => r.data || []),
      sb.from('insp_etapas_map').select('*').eq('active', true).order('orden').then(r => r.data || []),
      sb.from('insp_config').select('*').then(r => r.data || []),
      sb.from('remodel_inspecciones').select('*').eq('active', true).order('fecha_evaluacion', { ascending: false }).then(r => r.data || []),
      sb.from('remodel_at_properties').select('property_id, address, sqft').eq('active', true).then(r => r.data || []),
      sb.from('insp_checklist_items').select('*').eq('active', true).order('orden').then(r => r.data || []),
    ]);
    D.divisiones = dv; D.patologias = pt;
    D.etapas = et.map(e => ({ ...e, divisiones: Array.isArray(e.divisiones) ? e.divisiones : JSON.parse(e.divisiones || '[]') }));
    D.config = {}; cf.forEach(c => D.config[c.key] = c.value);
    D.inspecciones = ins || []; D.props = pr || []; D.checklistItems = ci || [];
  } catch (e) { console.warn('dLoad', e); }
}
function dSetTab(t) { D.tab = t; dRender(); }
function dToggleTheme() { D.theme = D.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = D.theme; localStorage.setItem('diag_theme', D.theme); dRender(); }
window.dSetTab = dSetTab; window.dToggleTheme = dToggleTheme;

// ─── SHELL ───
function dRender() {
  const TABS = [['evaluar', 'Evaluar'], ['db', 'Base de Datos'], ['checklist', 'Checklist'], ['propiedades', 'Propiedades']];
  const body = { evaluar: dTabEvaluar, db: dTabDB, checklist: dTabChecklist, propiedades: dTabPropiedades }[D.tab] || dTabEvaluar;
  let inner = '';
  try { inner = body(); } catch (e) { inner = `<div class="card"><b class="down">Error en la pestaña</b><div style="font-size:12px;opacity:.7;margin-top:6px">${E(e.message)}</div></div>`; console.warn(e); }
  $(`<div class="top">
    <div class="ic">${osIcon('stethoscope')}</div>
    <div><h1>Diagnóstico Patológico de Vivienda</h1><div class="sub">Rental Profits · Remodelación</div></div>
    <div class="right">
      <span class="sync"><i></i> Nube sincronizada</span>
      <button class="iconbtn" onclick="dToggleTheme()" title="Tema claro/oscuro">${D.theme === 'dark' ? '︎' : '☾'}</button>
    </div></div>
    <div class="tabs">${TABS.map(([k, l]) => `<button class="tab ${D.tab === k ? 'on' : ''}" onclick="dSetTab('${k}')">${l}</button>`).join('')}</div>
    <div id="tabbody">${inner}</div>
    <div class="aibubble" onclick="dOpenAI()" title="Asistente de obra IA">${osIcon('bot')}</div>`);
}

// ─── TAKE-OFF: catálogo de cantidades por división ───
// Derivado 1:1 de insp_divisiones + insp_checklist_items. NO altera el scoring:
// las cantidades se guardan aparte (insp_cantidades) y no entran en dCompute.
// DESACOPLADO del daño (decisión CEO 31-jul): ningún ítem toca dSetCarp ni w.scores.
// En Carpintería el conteo del take-off es dato independiente del "dañadas N de M"
// de la pregunta de patología, que sigue siendo la ÚNICA que puntúa.
const D_CANT = {
  acceso_externo: [['Puerta / portón de acceso', 'u'], ['Cerramiento / muro perimetral', 'ft'], ['Patio / jardín / andenes', 'ft2']],
  techo: [['Cubierta / tejado (exterior)', 'ft2'], ['Cielorraso / techo interior', 'ft2'], ['Estructura de techo (correas)', 'u']],
  estructura: [['Zapatas y cimientos', 'u'], ['Muros de contención', 'ft2'], ['Vigas de carga', 'u'], ['Viguetas de entrepiso', 'u'], ['Columnas / pilares', 'u'], ['Losa de contrapiso', 'ft2']],
  muros: [['Muros interiores', 'ft2'], ['Revoques / estuco interior', 'ft2'], ['Muros exteriores (fachada)', 'ft2'], ['Impermeabilización de muros', 'ft2']],
  piso: [['Piso interior (acabado)', 'ft2'], ['Zócalos / guardaescobas', 'ft'], ['Contrapiso / base de piso', 'ft2']],
  placa: [['Placa de entrepiso', 'ft2'], ['Escaleras (tramos)', 'u'], ['Barandas', 'ft']],
  carpinteria: [['Ventanería', 'u'], ['Puertas interiores', 'u'], ['Gabinetes (cocina/baños)', 'u'], ['Closets', 'u']],
  redes: [['Puntos hidráulicos / plomería', 'u'], ['Puntos de gas', 'u'], ['Puntos eléctricos (tomas/salidas)', 'u'], ['Baños', 'u'], ['Cocinas', 'u'], ['Equipos HVAC', 'u']],
};
const D_UNI = { u: 'u', ft2: 'ft²', ft: 'ft lin.' };
function dCantKey(div, item) { return div + '|' + item; }
function dCantGet(div, item) {
  const w = D.wizard; if (!w) return '';
  const v = (w.cant || {})[dCantKey(div, item)];
  return v == null ? '' : v;
}
function dSetCant(div, item, val) { // solo escribe w.cant — jamás w.scores ni w.raw
  const w = D.wizard; if (!w) return;
  w.cant = w.cant || {};
  const n = val === '' || val == null ? null : +val;
  if (n == null || isNaN(n)) delete w.cant[dCantKey(div, item)]; else w.cant[dCantKey(div, item)] = n;
}
window.dSetCant = dSetCant;
function dCantBlock(div) { // bloque de take-off que se agrega DEBAJO de las preguntas actuales
  const items = D_CANT[div]; if (!items || !items.length) return '';
  const filas = items.map(([item, uni]) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;gap:10px">
      <span style="font-size:12px">${E(item)}</span>
      <span style="white-space:nowrap"><input type="number" min="0" step="any" value="${dCantGet(div, item)}" onchange="dSetCant('${div}','${E(item).replace(/'/g, '&#39;')}',this.value)" style="width:76px;text-align:right;padding:3px"> <span style="font-size:10px;color:var(--mut2);display:inline-block;min-width:34px">${D_UNI[uni] || uni}</span></span>
    </div>`).join('');
  return `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><b style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--mut2)">📐 Cantidades (take-off)</b><span style="font-size:10px;color:var(--mut2)">opcional · cuántos hay · no afecta el puntaje</span></div>
    ${filas}</div>`;
}
function dCantResumen() { // tabla de repaso en el paso Reporte
  const w = D.wizard; if (!w) return '';
  const divs = (w.steps || []).filter(s => D_CANT[s.division]).map(s => s.division);
  const uniq = [...new Set(divs)];
  const filas = [];
  uniq.forEach(div => (D_CANT[div] || []).forEach(([item, uni]) => {
    const v = dCantGet(div, item);
    if (v === '' || v == null) return;
    const d = D.divisiones.find(x => x.key === div) || {};
    filas.push(`<tr><td style="font-size:11px">${d.emoji || ''} ${E(d.nombre || div)}</td><td style="font-size:11px">${E(item)}</td><td style="text-align:right"><b>${v}</b> <span style="font-size:10px;color:var(--mut2)">${D_UNI[uni] || uni}</span></td></tr>`);
  }));
  if (!filas.length) return `<div style="font-size:11px;color:var(--mut2);margin-top:10px">📐 Sin cantidades cargadas (opcional).</div>`;
  return `<div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--mut2);margin:14px 0 4px">📐 Cantidades (take-off) · ${filas.length} ítems</div><table><tbody>${filas.join('')}</tbody></table>`;
}

// ═══ PESTAÑA 1 · EVALUAR (wizard) ═══
function dBuildSteps(w) {
  const steps = [{ tipo: 'datos', titulo: 'Datos básicos', seccion: 'Inicio' }];
  const secDe = { acceso_externo: 'Externo', techo: 'Externo', estructura: 'Estructura', muros: 'Estructura', piso: 'Interno', carpinteria: 'Interno', redes: 'Interno' };
  ['acceso_externo', 'techo', 'estructura', 'muros'].forEach(k => { const d = D.divisiones.find(x => x.key === k); if (d) steps.push({ tipo: 'division', division: k, titulo: d.nombre, emoji: d.emoji, seccion: secDe[k] }); });
  steps.push({ tipo: 'pisos', titulo: '¿Cuántos pisos?', seccion: 'Estructura' });
  if ((w.numero_pisos || 1) >= 2) {
    steps.push({ tipo: 'division', division: 'placa', titulo: 'Placa de entrepiso', emoji: '🏗️', seccion: 'Placa & Escaleras', subgrupo: 'placa_entrepiso' });
    steps.push({ tipo: 'division', division: 'placa', titulo: 'Escaleras', emoji: '🪜', seccion: 'Placa & Escaleras', subgrupo: 'escaleras' });
  }
  ['piso', 'carpinteria', 'redes'].forEach(k => { const d = D.divisiones.find(x => x.key === k); if (d) steps.push({ tipo: k === 'redes' ? 'redes' : k === 'carpinteria' ? 'carpinteria' : 'division', division: k, titulo: d.nombre, emoji: d.emoji, seccion: 'Interno' }); });
  steps.push({ tipo: 'patio', titulo: 'Patio trasero', emoji: '🌳', seccion: 'Interno' });
  steps.push({ tipo: 'limpieza', titulo: 'Limpieza', emoji: '🧹', seccion: 'Interno' });
  steps.push({ tipo: 'reporte', titulo: 'Reporte', seccion: 'Reporte' });
  return steps;
}
async function dStartWizard(inspId) {
  const base = inspId ? D.inspecciones.find(x => x.id === inspId) : null;
  let cant = {}; // take-off ya guardado (solo al editar una inspección existente)
  if (base && base.id) {
    try {
      const { data } = await sb.from('insp_cantidades').select('division,item,cantidad').eq('inspeccion_id', base.id);
      (data || []).forEach(r => { if (r.cantidad != null) cant[dCantKey(r.division, r.item)] = +r.cantidad; });
    } catch (e) { console.warn('cantidades', e); }
  }
  D.wizard = { cant, id: base ? base.id : null, nombre_ref: base ? base.nombre_ref : '', direccion: base ? base.direccion : '', uso: base ? base.uso : 'compra', property_id: base ? base.property_id : null, numero_pisos: base ? (base.numero_pisos || 1) : 1, scores: base ? JSON.parse(JSON.stringify(base.scores || {})) : {}, raw: base ? JSON.parse(JSON.stringify(base.raw_answers || {})) : {}, limpieza: base ? (base.limpieza_items || []) : [], subScores: {}, idx: 0, avisos: [] };
  D.wizard.steps = dBuildSteps(D.wizard);
  D.wizard.maxIdx = base ? D.wizard.steps.length - 1 : 0; // editar una existente = todos los pasos ya recorridos (minimapa clickeable)
  D.tab = 'evaluar'; dRender();
}
window.dStartWizard = dStartWizard;
function dWizardCompute() {
  const w = D.wizard;
  if (w.subScores.placa_entrepiso || w.subScores.escaleras) {
    const merged = {}; D.patologias.forEach(p => { const a = (w.subScores.placa_entrepiso || {})[p.key], b = (w.subScores.escaleras || {})[p.key]; const vals = [a, b].filter(v => v != null); if (vals.length) merged[p.key] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length); });
    if (Object.keys(merged).length) w.scores.placa = merged;
  }
  return dCompute(w.scores);
}
function dTabEvaluar() {
  const w = D.wizard;
  if (!w) return `<div class="card" style="text-align:center;padding:40px"><div style="font-size:40px;margin-bottom:10px">${osIcon('search')}</div><h2 style="margin-bottom:8px">Asistente de inspección</h2><p style="color:var(--mut);font-size:13px;margin-bottom:16px">Recorré la vivienda por partes; el daño global se calcula en vivo.</p><button class="btn" onclick="dStartWizard()">＋ Nueva inspección</button></div>`;
  const step = w.steps[w.idx], total = w.steps.length, pct = Math.round(100 * w.idx / (total - 1));
  const res = dWizardCompute();
  const barra = (label, val, emoji) => `<div style="margin-bottom:7px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px"><span>${emoji || ''} ${E(label)}</span><b>${val != null ? val + '%' : '—'}</b></div><div class="bar"><i style="width:${Math.min(100, val || 0)}%;background:${(val || 0) >= 60 ? 'var(--neg)' : (val || 0) >= 40 ? 'var(--amber)' : 'var(--pos)'}"></i></div></div>`;
  const panel = `<div class="card"><div style="text-align:center;padding:6px 0"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--mut2)">Daño Global Estimado</div><div style="font-size:38px;font-weight:800;color:${dVerColor(res.global)}">${res.global != null ? res.global + '%' : '—'}</div><div style="font-size:11px;color:var(--mut)">${E(dVeredicto(res.global))}</div></div>
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin:10px 0 6px;color:var(--mut2)">Divisiones Técnicas</div>${D.divisiones.map(d => barra(d.nombre, res.divisiones[d.key], d.emoji)).join('')}
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px;color:var(--mut2)">Patologías · en vivo</div>${D.patologias.map(p => barra(p.nombre, res.patologias[p.key], p.emoji)).join('')}</div>`;
  const av = (w.avisos || []).length ? `<div class="card" style="border-color:var(--amber);margin-bottom:10px"><div style="color:var(--amber);font-size:11px;font-weight:700">${osIcon('alert')} Avisos</div>${w.avisos.map(a => `<div style="font-size:11px;margin-top:3px">• ${E(a)}</div>`).join('')}</div>` : '';
  const body = dStepBody(step, w, res);
  const nav = `<div style="display:flex;justify-content:space-between;margin-top:12px"><button class="btn ghost" ${w.idx === 0 ? 'disabled' : ''} onclick="dNav(-1)">← Atrás</button><span style="font-size:11px;color:var(--mut2);align-self:center">Paso ${w.idx + 1} de ${total} · ${step.seccion} · ${pct}%</span>${w.idx < total - 1 ? `<button class="btn" onclick="dNav(1)">Siguiente →</button>` : '<span></span>'}</div>`;
  // Minimapa del wizard: un chip por paso — actual resaltado, recorridos con ✓ (clickeables via dGoStep), futuros apagados
  const maxIdx = Math.min(Math.max(w.maxIdx || 0, w.idx), total - 1);
  const chips = w.steps.map((s, i) => {
    const cur = i === w.idx, done = !cur && i <= maxIdx;
    const label = (s.emoji ? s.emoji + ' ' : '') + E(s.titulo);
    const base = 'flex:0 0 auto;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;border:1px solid var(--line);white-space:nowrap;';
    if (cur) return `<span class="chip" style="${base}background:linear-gradient(135deg,var(--a1),var(--a2));color:#fff;border-color:transparent" title="Paso actual · ${E(s.seccion)}">${label}</span>`;
    if (done) return `<span class="chip" style="${base}background:rgba(52,211,153,.12);color:var(--pos);cursor:pointer" title="Completado · volver a este paso" onclick="dGoStep(${i})">✓ ${label}</span>`;
    return `<span class="chip" style="${base}background:transparent;color:var(--mut2);opacity:.5" title="Pendiente · ${E(s.seccion)}">${label}</span>`;
  }).join('');
  return `<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:10px;padding-bottom:4px;-webkit-overflow-scrolling:touch">${chips}</div>
    <div class="bar" style="margin-bottom:12px"><i style="width:${pct}%;background:linear-gradient(90deg,var(--a1),var(--a2))"></i></div>
    <div class="grid" style="grid-template-columns:1fr 300px">${`<div>${av}${body}${nav}</div>`}${panel}</div>`;
}
function dStepBody(step, w, res) {
  if (step.tipo === 'datos') return `<div class="card"><h3 style="margin-bottom:10px">Datos básicos</h3>
    <div style="font-size:11px;color:var(--mut);margin-bottom:3px">Nombre / Referencia *</div><input id="d-nom" value="${E(w.nombre_ref)}" style="width:100%;margin-bottom:10px">
    <div style="font-size:11px;color:var(--mut);margin-bottom:3px">Dirección</div><input id="d-dir" value="${E(w.direccion || '')}" style="width:100%;margin-bottom:10px">
    <div style="font-size:11px;color:var(--mut);margin-bottom:3px">Casa (Ficha por property_id)</div><select id="d-pid" style="width:100%;margin-bottom:10px"><option value="">(sin casa)</option>${D.props.map(p => `<option value="${p.property_id}" ${w.property_id === p.property_id ? 'selected' : ''}>${E((p.address || '').split(',')[0])}</option>`).join('')}</select>
    <div style="font-size:11px;color:var(--mut);margin-bottom:4px">¿Compra o Renta?</div><div style="display:flex;gap:8px">${['compra', 'renta'].map(u => `<button class="btn ${w.uso === u ? '' : 'ghost'}" onclick="D.wizard.uso='${u}';dRender()">${u === 'compra' ? 'Compra' : 'Renta'}</button>`).join('')}</div></div>`;
  if (step.tipo === 'pisos') return `<div class="card"><h3 style="margin-bottom:6px">¿Cuántos pisos tiene?</h3><p style="font-size:12px;color:var(--mut);margin-bottom:10px">2+ agrega Placa de entrepiso y Escaleras.</p><div style="display:flex;gap:10px">${[[1, '1 Piso'], [2, '2 o más pisos']].map(([n, l]) => `<button class="btn ${(w.numero_pisos >= 2 ? 2 : 1) === n ? '' : 'ghost'}" style="flex:1;padding:14px" onclick="dSetPisos(${n})">${l}</button>`).join('')}</div></div>`;
  if (step.tipo === 'redes') { const raw = w.raw.redes = w.raw.redes || {}; return `<div class="card"><h3>${osIcon('link')} Redes</h3><p style="font-size:12px;color:var(--mut);margin:4px 0 10px">Cada red pesa ${Dcfg('red_peso_pct', 33.33)}% · solo cuenta "No funciona".</p>${['plomeria', 'gas', 'electricidad'].map(r => `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)"><b style="text-transform:capitalize">${r}</b><div style="display:flex;gap:6px">${[['funciona', 'Funciona'], ['no_funciona', 'No funciona']].map(([v, l]) => `<button class="btn ${raw[r] === v ? '' : 'ghost'}" style="padding:4px 10px;font-size:11px" onclick="dSetRed('${r}','${v}')">${l}</button>`).join('')}</div></div>`).join('')}${dCantBlock('redes')}</div>`; }
  if (step.tipo === 'carpinteria') { const raw = w.raw.carpinteria = w.raw.carpinteria || {}; return `<div class="card"><h3>Carpintería</h3><p style="font-size:12px;color:var(--mut);margin:4px 0 10px">Ratio de unidades dañadas → score (no afecta otras patologías).</p>${[['ventanas', 'Ventanas'], ['puertas_int', 'Puertas interiores'], ['gabinetes', 'Gabinetes']].map(([k, l]) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0"><span>${l}</span><span style="font-size:11px">dañadas <input type="number" min="0" value="${raw[k + '_mal'] || 0}" onchange="dSetCarp('${k}_mal',this.value)" style="width:52px;text-align:right;padding:3px"> de <input type="number" min="0" value="${raw[k + '_tot'] || 0}" onchange="dSetCarp('${k}_tot',this.value)" style="width:52px;text-align:right;padding:3px"></span></div>`).join('')}${dCantBlock('carpinteria')}</div>`; }
  if (step.tipo === 'patio') { const raw = w.raw.patio = w.raw.patio || {}; return `<div class="card"><h3>Patio trasero</h3><p style="font-size:12px;color:var(--mut);margin:4px 0 10px">¿Cuenta con pérgola, hangar o depósito? Solo "Malo" suma (tope ${Dcfg('pergola_max_pct', 2)}% del total).</p><div style="display:flex;gap:8px">${[['no', 'No tiene'], ['bueno', 'Bueno'], ['regular', 'Regular'], ['malo', 'Malo']].map(([v, l]) => `<button class="btn ${raw.estado === v ? '' : 'ghost'}" style="padding:6px 12px;font-size:12px" onclick="D.wizard.raw.patio={estado:'${v}'};dRender()">${l}</button>`).join('')}</div></div>`; }
  if (step.tipo === 'limpieza') { const items = ['Retiro de escombros', 'Limpieza profunda interior', 'Limpieza de fachada', 'Retiro de basura/enseres', 'Limpieza de patio/jardín']; return `<div class="card"><h3>Limpieza</h3><p style="font-size:12px;color:var(--mut);margin:4px 0 10px">NO pondera el daño — solo BD y entregable.</p>${items.map(it => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px"><input type="checkbox" ${(w.limpieza || []).includes(it) ? 'checked' : ''} onchange="dToggleLimpieza('${E(it).replace(/'/g, '')}')"> ${it}</label>`).join('')}</div>`; }
  if (step.tipo === 'reporte') return dReporte(w, res);
  // division genérica (5 patologías)
  const cur = step.subgrupo ? (w.subScores[step.subgrupo] || {}) : (w.scores[step.division] || {});
  const cubierta = step.division === 'techo' ? `<div style="background:rgba(251,191,36,.12);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--amber);margin-bottom:10px">${osIcon('alert')} Debe buscar la forma de subir a la cubierta y verificar el estado de la estructura antes de continuar. La cubierta (exterior) y el interior del techo pesan ambos en esta división.</div>` : '';
  return `<div class="card"><h3>${step.emoji} ${E(step.titulo)}</h3>${cubierta}<p style="font-size:12px;color:var(--mut);margin:4px 0 10px">Respondé solo lo que aplique · escala 1 (sin daño) a 5 (crítico).</p>
    ${D.patologias.map(p => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div style="font-size:12px;margin-bottom:5px">${p.emoji} <b>${E(p.nombre)}</b> <span style="color:var(--mut);font-size:10px">${E(p.pregunta)}</span></div><div style="display:flex;gap:5px">${[1, 2, 3, 4, 5].map(s => `<button class="btn ${cur[p.key] === s ? '' : 'ghost'}" style="flex:1;padding:5px;font-size:11px" onclick="dSetScore('${step.subgrupo || step.division}','${p.key}',${s},${step.subgrupo ? 'true' : 'false'})">${s}</button>`).join('')}</div></div>`).join('')}${dCantBlock(step.division)}</div>`;
}
function dReporte(w, res) {
  return `<div class="card"><h3>${osIcon('chart')} Reporte — ${E(w.nombre_ref || 'Sin nombre')}</h3>
    <div style="text-align:center;padding:12px"><div style="font-size:46px;font-weight:800;color:${dVerColor(res.global)}">${res.global != null ? res.global + '%' : '—'}</div><div style="color:var(--mut)">${E(dVeredicto(res.global))}</div></div>
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--mut2);margin:8px 0 4px">Daño por etapa de renovación</div>
    <table><tbody>${D.etapas.filter(e => e.etapa !== 'Limpieza').map(e => `<tr><td>${e.emoji} ${E(e.etapa)}</td><td style="text-align:right"><b class="${(res.etapas[e.etapa] || 0) >= 50 ? 'down' : ''}">${res.etapas[e.etapa] != null ? res.etapas[e.etapa] + '%' : '—'}</b></td></tr>`).join('')}</tbody></table>
    ${dCantResumen()}
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn" onclick="dSaveWizard()">${osIcon('save')} Guardar</button><button class="btn ghost" onclick="dPrellenar()">→ Estimador</button></div></div>`;
}
function dNav(dir) { const w = D.wizard; if (dir > 0 && w.idx === 0) { w.nombre_ref = (document.getElementById('d-nom') || {}).value || w.nombre_ref; w.direccion = (document.getElementById('d-dir') || {}).value || ''; w.property_id = (document.getElementById('d-pid') || {}).value || null; if (!w.nombre_ref.trim()) { alert('El Nombre / Referencia es obligatorio.'); return; } } w.idx = Math.max(0, Math.min(w.steps.length - 1, w.idx + dir)); w.maxIdx = Math.max(w.maxIdx || 0, w.idx); dRender(); }
function dGoStep(i) { // salto directo desde el minimapa — SOLO a pasos ya recorridos
  const w = D.wizard; if (!w) return;
  i = Math.max(0, Math.min(w.steps.length - 1, +i || 0));
  if (i > Math.max(w.maxIdx || 0, w.idx)) return; // futuros: no clickeables
  if (w.idx === 0 && i > 0) { // mismo guard de Datos básicos que dNav
    w.nombre_ref = (document.getElementById('d-nom') || {}).value || w.nombre_ref;
    w.direccion = (document.getElementById('d-dir') || {}).value || '';
    w.property_id = (document.getElementById('d-pid') || {}).value || null;
    if (!w.nombre_ref.trim()) { alert('El Nombre / Referencia es obligatorio.'); return; }
  }
  w.idx = i; w.maxIdx = Math.max(w.maxIdx || 0, w.idx); dRender();
}
function dSetPisos(n) { D.wizard.numero_pisos = n; D.wizard.steps = dBuildSteps(D.wizard); dNav(1); }
function dSetScore(k, p, s, isSub) { const w = D.wizard; if (isSub) { w.subScores[k] = w.subScores[k] || {}; w.subScores[k][p] = s; } else { w.scores[k] = w.scores[k] || {}; w.scores[k][p] = s; } dRender(); }
function dSetRed(red, val) { const w = D.wizard; w.raw.redes = w.raw.redes || {}; w.raw.redes[red] = val; const noF = ['plomeria', 'gas', 'electricidad'].filter(r => w.raw.redes[r] === 'no_funciona').length; const pct = noF * (Dcfg('red_peso_pct', 33.33) / 100); const score = pct <= 0 ? 1 : Math.min(5, 1 + Math.round(pct * 4)); w.scores.redes = {}; D.patologias.forEach(p => w.scores.redes[p.key] = score); if (val === 'no_funciona') { const a = `Necesitás tramitar permisos para restablecer el servicio de: ${red}`; if (!w.avisos.includes(a)) w.avisos.push(a); } dRender(); }
function dSetCarp(c, v) { const w = D.wizard; w.raw.carpinteria = w.raw.carpinteria || {}; w.raw.carpinteria[c] = +v || 0; const r = w.raw.carpinteria; const mal = (r.ventanas_mal || 0) + (r.puertas_int_mal || 0) + (r.gabinetes_mal || 0); const tot = (r.ventanas_tot || 0) + (r.puertas_int_tot || 0) + (r.gabinetes_tot || 0); const ratio = tot > 0 ? mal / tot : 0; const score = ratio <= 0 ? 1 : Math.min(5, 1 + Math.round(ratio * 4)); w.scores.carpinteria = {}; D.patologias.forEach(p => w.scores.carpinteria[p.key] = score); dRender(); }
function dToggleLimpieza(it) { const w = D.wizard; w.limpieza = w.limpieza || []; const i = w.limpieza.indexOf(it); if (i >= 0) w.limpieza.splice(i, 1); else w.limpieza.push(it); dRender(); }
window.dNav = dNav; window.dGoStep = dGoStep; window.dSetPisos = dSetPisos; window.dSetScore = dSetScore; window.dSetRed = dSetRed; window.dSetCarp = dSetCarp; window.dToggleLimpieza = dToggleLimpieza;
function dToast(msg, ms) { // feedback breve no bloqueante (usa window.toast si existe)
  if (typeof window.toast === 'function') { window.toast(msg); return; }
  let t = document.getElementById('d-toast');
  if (!t) { t = document.createElement('div'); t.id = 'd-toast'; t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--a1),var(--a2));color:#fff;padding:9px 18px;border-radius:20px;font-size:13px;font-weight:700;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.35);opacity:0;transition:opacity .25s;max-width:90vw;text-align:center'; document.body.appendChild(t); }
  t.textContent = msg; clearTimeout(t._h1); clearTimeout(t._h2);
  requestAnimationFrame(() => { t.style.opacity = '1'; });
  t._h1 = setTimeout(() => { t.style.opacity = '0'; }, ms || 2400);
  t._h2 = setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, (ms || 2400) + 400);
}
window.dToast = dToast;
async function dSaveWizard() {
  const w = D.wizard, res = dWizardCompute();
  dToast('Guardando…', 6000);
  const row = { property_id: w.property_id || null, nombre_ref: w.nombre_ref, direccion: w.direccion || null, uso: w.uso || null, numero_pisos: w.numero_pisos || 1, scores: w.scores, raw_answers: w.raw, limpieza_items: w.limpieza || [], dano_global_pct: res.global, dano_divisiones: res.divisiones, dano_patologias: res.patologias, dano_etapas: res.etapas, veredicto: dVeredicto(res.global), estado: 'completa', updated_at: new Date().toISOString() };
  const { data: { session } } = await sb.auth.getSession(); row.created_by = (session && session.user && session.user.email) || 'diagnostico';
  let error, inspId = w.id;
  if (w.id) ({ error } = await sb.from('remodel_inspecciones').update(row).eq('id', w.id));
  else { const r = await sb.from('remodel_inspecciones').insert(row).select('id').single(); error = r.error; inspId = r.data && r.data.id; }
  if (error) { alert('No se pudo guardar: ' + error.message); return; }
  // Take-off aparte: la inspección ya quedó guardada, así que un fallo acá NO la pierde (se avisa y sigue).
  const cantMsg = await dSaveCantidades(inspId, w);
  dToast('Inspección guardada' + (res.global != null ? ' — daño global ' + res.global + '%' : '') + cantMsg);
  D.wizard = null; await dLoad(); D.tab = 'db'; dRender();
}
async function dSaveCantidades(inspId, w) { // upsert idempotente por (inspeccion_id, division, item)
  if (!inspId) return '';
  const divs = [...new Set((w.steps || []).filter(s => D_CANT[s.division]).map(s => s.division))];
  const filas = [], vacios = [];
  divs.forEach(div => (D_CANT[div] || []).forEach(([item, uni]) => {
    const v = dCantGet(div, item);
    if (v === '' || v == null || isNaN(+v)) { vacios.push({ div, item }); return; }
    filas.push({ inspeccion_id: inspId, property_id: w.property_id || null, division: div, item, cantidad: +v, unidad: uni, updated_at: new Date().toISOString() });
  }));
  try {
    if (filas.length) {
      const { error } = await sb.from('insp_cantidades').upsert(filas, { onConflict: 'inspeccion_id,division,item' });
      if (error) throw error;
    }
    // un ítem que se dejó en blanco tras haber tenido valor debe DESAPARECER, no quedar viejo
    if (vacios.length) {
      for (const v of vacios) await sb.from('insp_cantidades').delete().eq('inspeccion_id', inspId).eq('division', v.div).eq('item', v.item);
    }
    return filas.length ? ` · ${filas.length} cantidades` : '';
  } catch (e) {
    console.warn('insp_cantidades', e);
    dToast('⚠ La inspección se guardó, pero las cantidades no: ' + (e.message || e), 5000);
    return '';
  }
}
function dPrellenar() { const w = D.wizard, res = dWizardCompute(); try { localStorage.setItem('rm_insp_handoff', JSON.stringify({ property_id: w.property_id, nombre: w.nombre_ref, direccion: w.direccion, uso: w.uso, afectacion_por_etapa: res.etapas, dano_global: res.global })); } catch (e) {} alert(`Handoff listo para el Estimador Pro (${w.nombre_ref}).\nAbrí Remodelación → Estimador: arranca con estas afectaciones por etapa.`); }
window.dSaveWizard = dSaveWizard; window.dPrellenar = dPrellenar;

// ═══ PESTAÑA 2 · BASE DE DATOS ═══
function dTabDB() {
  const ins = D.inspecciones, q = (D._q || '').toLowerCase();
  const rows = ins.filter(x => !q || (x.nombre_ref || '').toLowerCase().includes(q) || (x.direccion || '').toLowerCase().includes(q));
  // panel 1: distribución de veredictos
  const buckets = { 'Excelente': 0, 'Buen estado': 0, 'Estado regular': 0, 'Deterioro grave': 0, 'Crítico': 0 };
  ins.forEach(x => { const v = x.veredicto && buckets[x.veredicto] != null ? x.veredicto : dVeredicto(x.dano_global_pct); if (buckets[v] != null) buckets[v]++; });
  const maxV = Math.max(...Object.values(buckets), 1);
  const distr = Object.entries(buckets).map(([k, n]) => `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11px"><span>${k}</span><b>${n}</b></div><div class="bar"><i style="width:${100 * n / maxV}%;background:${k === 'Crítico' || k === 'Deterioro grave' ? 'var(--neg)' : k === 'Estado regular' ? 'var(--amber)' : 'var(--pos)'}"></i></div></div>`).join('');
  // panel 2: daño promedio por división
  const acc = {}, cnt = {};
  ins.forEach(x => { const dd = x.dano_divisiones || {}; Object.keys(dd).forEach(k => { acc[k] = (acc[k] || 0) + (+dd[k] || 0); cnt[k] = (cnt[k] || 0) + 1; }); });
  const divAvg = D.divisiones.map(d => ({ nombre: d.nombre, emoji: d.emoji, avg: cnt[d.key] ? Math.round(acc[d.key] / cnt[d.key] * 10) / 10 : 0 })).sort((a, b) => b.avg - a.avg);
  const maxD = Math.max(...divAvg.map(x => x.avg), 1);
  const divBars = divAvg.map(d => `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11px"><span>${d.emoji} ${E(d.nombre)}</span><b>${d.avg}%</b></div><div class="bar"><i style="width:${100 * d.avg / maxD}%;background:${d.avg >= 60 ? 'var(--neg)' : d.avg >= 40 ? 'var(--amber)' : 'var(--a1)'}"></i></div></div>`).join('');
  const fila = x => `<tr style="cursor:pointer" onclick="dToggleRow('${x.id}')"><td><b>${E(x.nombre_ref)}</b> <span style="opacity:.4">${D._openRow === x.id ? '▾' : '▸'}</span><div style="font-size:10px;color:var(--mut2)">${E(x.direccion || '')}</div></td><td style="text-align:right"><b style="color:${dVerColor(x.dano_global_pct)}">${x.dano_global_pct != null ? x.dano_global_pct + '%' : '—'}</b></td><td>${E(x.veredicto || dVeredicto(x.dano_global_pct))}</td><td style="font-size:11px">${(x.fecha_evaluacion || '').slice(0, 10)}</td><td style="text-align:right" onclick="event.stopPropagation()"><button class="btn ghost" style="padding:3px 8px;font-size:10px" onclick="dExportJSON('${x.id}')">JSON</button> <button class="btn ghost" style="padding:3px 8px;font-size:10px" onclick="dExportXLS('${x.id}')">XLS</button></td></tr>${D._openRow === x.id ? dRowDetail(x) : ''}`;
  return `<div class="grid k4" style="margin-bottom:14px">
    <div class="card kpi"><div class="lab">Propiedades Evaluadas</div><div class="big">${ins.length}</div><div class="meta">inspecciones activas</div></div>
    <div class="card" style="grid-column:span 1"><div class="lab" style="font-size:10px;text-transform:uppercase;color:var(--mut2);font-weight:700;margin-bottom:8px">Distribución de Veredictos</div>${distr}</div>
    <div class="card" style="grid-column:span 2"><div class="lab" style="font-size:10px;text-transform:uppercase;color:var(--mut2);font-weight:700;margin-bottom:8px">Daño Promedio por División</div>${divBars}</div>
  </div>
  <div class="card"><div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap"><input placeholder="Buscar propiedad…" value="${E(D._q || '')}" onchange="D._q=this.value;dRender()" style="flex:1;min-width:160px"><button class="btn" onclick="dStartWizard()">＋ Nueva</button><button class="btn ghost" onclick="dExportTodo()">⬇ Exportar todo</button><button class="btn ghost" onclick="dRefresh()">↻ Actualizar</button></div>
    <table><thead><tr><th>Propiedad</th><th style="text-align:right">Daño</th><th>Veredicto</th><th>Fecha</th><th></th></tr></thead><tbody>${rows.map(fila).join('') || '<tr><td colspan="5" style="padding:14px;color:var(--mut2)">Sin inspecciones.</td></tr>'}</tbody></table></div>`;
}
function dRowDetail(x) {
  const dd = x.dano_divisiones || {}, dp = x.dano_patologias || {};
  return `<tr><td colspan="5" style="background:rgba(255,255,255,.02);padding:10px 14px"><div class="grid k2"><div><b style="font-size:11px">Divisiones</b>${D.divisiones.map(d => dd[d.key] != null ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>${d.emoji} ${E(d.nombre)}</span><b>${dd[d.key]}%</b></div>` : '').join('')}</div><div><b style="font-size:11px">Patologías</b>${D.patologias.map(p => dp[p.key] != null ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>${p.emoji} ${E(p.nombre)}</span><b>${dp[p.key]}%</b></div>` : '').join('')}</div></div>${x.property_id ? `<button class="btn" style="margin-top:8px;padding:4px 10px;font-size:11px" onclick="dPrellenarId('${x.id}')">→ Pre-llenar Estimador</button>` : ''}</td></tr>`;
}
function dToggleRow(id) { D._openRow = D._openRow === id ? null : id; dRender(); }
async function dRefresh() { await dLoad(); dRender(); }
window.dToggleRow = dToggleRow; window.dRefresh = dRefresh;

// ═══ PESTAÑA 3 · CHECKLIST ═══
function dTabChecklist() {
  const items = D.checklistItems, filt = D._clFilt || 'all';
  const shown = filt === 'all' ? items : items.filter(i => i.division === filt);
  // KPIs desde la inspección más reciente (scores por división como proxy del ítem)
  const last = D.inspecciones[0];
  const scores = last ? (last.scores || {}) : {};
  let evaluados = 0, criticos = 0, peorPat = { key: null, val: 0 };
  items.forEach(i => { const sc = scores[i.division]; if (sc && Object.keys(sc).length) { evaluados++; const mx = Math.max(...Object.values(sc)); if (mx >= 4) criticos++; } });
  D.patologias.forEach(p => { const v = last && last.dano_patologias ? (last.dano_patologias[p.key] || 0) : 0; if (v > peorPat.val) peorPat = { key: p.nombre, val: v }; });
  const estado = last ? dVeredicto(last.dano_global_pct) : '—';
  const divFilters = [['all', 'Todas'], ...D.divisiones.map(d => [d.key, d.nombre])];
  // agrupar división → subdivisión → ítems
  const byDiv = {}; shown.forEach(i => { (byDiv[i.division] = byDiv[i.division] || {}); (byDiv[i.division][i.subdivision || '—'] = byDiv[i.division][i.subdivision || '—'] || []).push(i); });
  const lista = Object.keys(byDiv).map(dk => { const d = D.divisiones.find(x => x.key === dk) || { nombre: dk, emoji: '' }; const sc = scores[dk] || {};
    return `<div class="card" style="margin-bottom:10px"><div style="font-weight:700;margin-bottom:6px">${d.emoji} ${E(d.nombre)}</div>${Object.keys(byDiv[dk]).map(sub => `<div style="margin-bottom:6px"><div style="font-size:10px;text-transform:uppercase;color:var(--mut2);font-weight:700;margin:4px 0">${E(sub)}</div>${byDiv[dk][sub].map(it => { const mx = Object.keys(sc).length ? Math.max(...Object.values(sc)) : 0; return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:4px 0;border-bottom:1px solid var(--line)"><span>${E(it.item)}</span>${mx ? `<span class="badge ${mx >= 4 ? 'b-neg' : mx >= 3 ? 'b-warn' : 'b-ok'}">score ${mx}</span>` : '<span class="badge" style="opacity:.4">sin eval.</span>'}</div>`; }).join('')}</div>`).join('')}</div>`; }).join('');
  const guia = D._guiaOpen ? `<div class="card" style="margin-bottom:12px;font-size:12px"><b>Guía de patologías y escala</b><div style="margin-top:6px">${D.patologias.map(p => `<div style="padding:3px 0"><b>${p.emoji} ${E(p.nombre)}</b> (${p.peso_pct}%): ${E(p.descripcion || p.pregunta)}</div>`).join('')}<div style="margin-top:6px;color:var(--mut)">Escala: 1 sin daño · 2 leve · 3 moderado · 4 grave · 5 crítico. Crítico ≥ 4.0.</div></div></div>` : '';
  return `<div class="grid k4" style="margin-bottom:14px">
    <div class="card kpi"><div class="lab">Estado General</div><div class="big" style="font-size:18px;color:${dVerColor(last ? last.dano_global_pct : null)}">${E(estado)}</div><div class="meta">última inspección</div></div>
    <div class="card kpi"><div class="lab">Ítems Evaluados</div><div class="big">${evaluados}/${items.length}</div></div>
    <div class="card kpi"><div class="lab">Ítems Críticos</div><div class="big warn">${criticos}</div><div class="meta">score ≥ 4.0</div></div>
    <div class="card kpi"><div class="lab">Peor Patología</div><div class="big" style="font-size:16px">${E(peorPat.key || '—')}</div><div class="meta">${peorPat.val ? peorPat.val + '%' : ''}</div></div></div>
  <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center"><button class="btn ghost" onclick="D._guiaOpen=!D._guiaOpen;dRender()">${D._guiaOpen ? '▾' : '▸'} Ver guía de patologías y escala</button><span style="flex:1"></span><button class="btn" onclick="dStartWizard()">＋ Agregar (inspección)</button></div>
  ${guia}
  <div style="display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap">${divFilters.map(([k, l]) => `<button class="btn ${filt === k ? '' : 'ghost'}" style="padding:4px 10px;font-size:11px" onclick="D._clFilt='${k}';dRender()">${E(l)}</button>`).join('')}</div>
  ${lista || '<div class="card" style="color:var(--mut2)">Sin ítems para este filtro.</div>'}`;
}

// ═══ PESTAÑA 4 · PROPIEDADES (con guards) ═══
function dTabPropiedades() {
  const props = D.props || [];
  const byPid = {}; (D.inspecciones || []).forEach(i => { if (i && i.property_id) { if (!byPid[i.property_id] || (i.fecha_evaluacion || '') > (byPid[i.property_id].fecha_evaluacion || '')) byPid[i.property_id] = i; } });
  const conInsp = props.filter(p => p && p.property_id && byPid[p.property_id]);
  const sinInsp = props.filter(p => p && p.property_id && !byPid[p.property_id]);
  const card = p => { const ins = byPid[p.property_id] || {}; const g = ins.dano_global_pct; return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline"><b>${E((p.address || 'Sin dirección').split(',')[0])}</b><span style="color:${dVerColor(g)};font-weight:800">${g != null ? g + '%' : '—'}</span></div><div style="font-size:11px;color:var(--mut2);margin-top:3px">${p.sqft ? p.sqft + ' sqft · ' : ''}${E(ins.veredicto || dVeredicto(g))}</div><div style="font-size:10px;color:var(--mut2);margin-top:4px">Última inspección: ${(ins.fecha_evaluacion || '').slice(0, 10) || '—'}</div>${ins.id ? `<button class="btn ghost" style="margin-top:8px;padding:4px 10px;font-size:11px" onclick="dStartWizard('${ins.id}')">Ver / editar</button>` : ''}</div>`; };
  return `<div class="card kpi" style="margin-bottom:14px"><div class="lab">Propiedades con inspección</div><div class="big">${conInsp.length} <span style="font-size:14px;color:var(--mut2)">de ${props.length} casas</span></div></div>
    <div class="grid k3">${conInsp.map(card).join('') || '<div class="card" style="color:var(--mut2)">Ninguna casa tiene inspección todavía.</div>'}</div>
    ${sinInsp.length ? `<div style="font-size:11px;color:var(--mut2);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 8px">Sin inspección (${sinInsp.length})</div><div class="grid k3">${sinInsp.slice(0, 12).map(p => `<div class="card" style="opacity:.65"><b>${E((p.address || 'Sin dirección').split(',')[0])}</b><div style="font-size:11px;color:var(--mut2);margin-top:3px">${p.sqft ? p.sqft + ' sqft' : ''}</div><button class="btn ghost" style="margin-top:8px;padding:4px 10px;font-size:11px" onclick="dStartWizard()">＋ Inspeccionar</button></div>`).join('')}</div>` : ''}`;
}

// ─── EXPORTS ───
function dExportJSON(id) {
  const x = D.inspecciones.find(i => i.id === id); if (!x) return;
  const j = { _schema: 'taskade_visita_previa_v2', propiedad: { nombre: x.nombre_ref, direccion: x.direccion, uso: x.uso, property_id: x.property_id, numero_pisos: x.numero_pisos }, resultado_global: { dano_pct: x.dano_global_pct, veredicto: x.veredicto || dVeredicto(x.dano_global_pct) }, grupos: D.divisiones.map(d => ({ key: d.key, nombre: d.nombre, peso: +d.peso_pct, dano_pct: (x.dano_divisiones || {})[d.key] ?? null, scores_1_5: (x.scores || {})[d.key] || {} })), patologias: D.patologias.map(p => ({ key: p.key, nombre: p.nombre, peso: +p.peso_pct, dano_pct: (x.dano_patologias || {})[p.key] ?? null })), etapas_renovacion: D.etapas.map(e => ({ etapa: e.etapa, dano_pct: (x.dano_etapas || {})[e.etapa] ?? null })), checklist: x.checklist || {}, limpieza: x.limpieza_items || [], scores_raw: x.scores || {}, raw_answers: x.raw_answers || {} };
  dDownload(`inspeccion_${(x.nombre_ref || 'casa').replace(/\W+/g, '_')}.json`, JSON.stringify(j, null, 2), 'application/json');
}
function dExportXLS(id) { dXls([D.inspecciones.find(i => i.id === id)].filter(Boolean), `inspeccion_${id}`); }
function dExportTodo() { dXls(D.inspecciones, 'inspecciones_todas'); }
function dXls(insps, fname) {
  if (!insps.length) { alert('Sin inspecciones.'); return; }
  const cols = insps.map(x => x.nombre_ref);
  const rows = [['Sección', 'Ítem', 'Detalle', ...cols], ['General', 'Daño Global', '%', ...insps.map(x => x.dano_global_pct)], ['General', 'Veredicto', '', ...insps.map(x => x.veredicto || '')], ['General', 'Uso', '', ...insps.map(x => x.uso || '')]];
  D.divisiones.forEach(d => { rows.push(['División', d.nombre, 'daño %', ...insps.map(x => (x.dano_divisiones || {})[d.key] ?? '')]); D.patologias.forEach(p => rows.push(['División · ' + d.nombre, p.nombre, 'score', ...insps.map(x => ((x.scores || {})[d.key] || {})[p.key] ?? '')])); });
  D.patologias.forEach(p => rows.push(['Patología', p.nombre, 'daño %', ...insps.map(x => (x.dano_patologias || {})[p.key] ?? '')]));
  D.etapas.forEach(e => rows.push(['Etapa', e.etapa, 'daño %', ...insps.map(x => (x.dano_etapas || {})[e.etapa] ?? '')]));
  if (typeof XLSX !== 'undefined') { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Inspección'); XLSX.writeFile(wb, fname + '.xlsx'); }
  else dDownload(fname + '.csv', rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
}
function dDownload(name, content, mime) { const b = new Blob([content], { type: mime }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
function dPrellenarId(id) { const x = D.inspecciones.find(i => i.id === id); if (!x) return; try { localStorage.setItem('rm_insp_handoff', JSON.stringify({ property_id: x.property_id, nombre: x.nombre_ref, direccion: x.direccion, uso: x.uso, afectacion_por_etapa: x.dano_etapas || {}, dano_global: x.dano_global_pct })); } catch (e) {} alert(`Handoff listo (${x.nombre_ref}). Abrí Remodelación → Estimador.`); }
window.dExportJSON = dExportJSON; window.dExportXLS = dExportXLS; window.dExportTodo = dExportTodo; window.dPrellenarId = dPrellenarId;

// ─── ASISTENTE DE OBRA IA (dry-run, propone scope; nada se aplica sin aprobación) ───
function dOpenAI() {
  const last = D.inspecciones[0];
  if (!last) { alert('Primero registrá o abrí una inspección.'); return; }
  const et = last.dano_etapas || {};
  const orden = Object.entries(et).filter(([k]) => k !== 'Limpieza').sort((a, b) => b[1] - a[1]);
  const prioridades = orden.map(([e, v], i) => `${i + 1}. ${e} — ${v}% de daño${v >= 60 ? ' prioritario' : ''}`).join('\n');
  const dealbreaker = (et['Estructura'] || 0) >= 70 ? '\n\nDEAL-BREAKER: daño estructural alto — revisar viabilidad del negocio antes de comprar.' : '';
  alert(`Asistente de obra (propuesta, dry-run)\n\nCasa: ${last.nombre_ref} · daño global ${last.dano_global_pct}%\n\nScope sugerido por prioridad:\n${prioridades}${dealbreaker}\n\n(Esto es una propuesta; ninguna acción se ejecuta sin tu aprobación. Usá "→ Estimador" para convertirlo en presupuesto.)`);
}
window.dOpenAI = dOpenAI;

window.D = D; window.dRender = dRender; window.dLoad = dLoad; window.dCompute = dCompute; window.dInit = dInit;
dInit();
