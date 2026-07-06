// ═══ INSPECCIÓN · Diagnóstico Patológico de Vivienda (port de Taskade) ═══
// Primera etapa de la cadena: Inspección → Estimador Pro → presupuesto+cronograma → Planner.
// Config desde tablas (insp_*), data por property_id (remodel_inspecciones), soft-delete.
// Motor de daño IDÉNTICO a la spec (verificado: Starbright 67.2% exacto).
const IN = {
  divisiones: [], patologias: [], etapas: [], config: {},
  inspecciones: [], props: [],
  wizard: null,   // estado del asistente activo
};
const IN_M = n => n == null ? '—' : '$' + Math.round(+n).toLocaleString('en-US');
const IN_E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function IN_cfg(k, def) { const v = IN.config[k]; return v != null ? +v : def; }

// ─── MOTOR DE DAÑO (doble ponderación) — no tocar sin re-verificar contra el CSV ───
function inCeldaPct(score) { return (Math.max(1, Math.min(5, +score)) - 1) / 4 * 100; } // 1..5 → 0/25/50/75/100
function inDanoDivision(scoresDiv) {
  // scoresDiv = { patologia_key: 1..5 } — promedia SOLO patologías respondidas
  let num = 0, den = 0;
  IN.patologias.forEach(p => {
    const s = scoresDiv && scoresDiv[p.key];
    if (s == null) return;
    num += (+p.peso_pct) * inCeldaPct(s); den += (+p.peso_pct);
  });
  return den ? num / den : null;
}
function inComputeDano(scores) {
  // scores = { division_key: { patologia_key: 1..5 } }
  const divD = {}; let gnum = 0, gden = 0;
  IN.divisiones.forEach(d => {
    const dd = inDanoDivision(scores[d.key]);
    if (dd == null) return;
    divD[d.key] = Math.round(dd * 10) / 10;
    gnum += (+d.peso_pct) * dd; gden += (+d.peso_pct);
  });
  const global = gden ? Math.round(gnum / gden * 10) / 10 : null;
  // panel de patologías: por cada patología, ponderar sobre las divisiones que la tienen respondida
  const patD = {};
  IN.patologias.forEach(p => {
    let n = 0, dsum = 0;
    IN.divisiones.forEach(d => {
      const v = scores[d.key] && scores[d.key][p.key];
      if (v == null) return;
      n += (+d.peso_pct) * inCeldaPct(v); dsum += (+d.peso_pct);
    });
    if (dsum) patD[p.key] = Math.round(n / dsum * 10) / 10;
  });
  // daño por ETAPA (para pre-llenar el Estimador): pesos de sus divisiones renormalizados
  const etD = {};
  IN.etapas.forEach(e => {
    const divs = (e.divisiones || []);
    let n = 0, dsum = 0;
    divs.forEach(dk => {
      if (divD[dk] == null) return;
      const w = +(IN.divisiones.find(d => d.key === dk) || {}).peso_pct || 0;
      n += w * divD[dk]; dsum += w;
    });
    if (dsum) etD[e.etapa] = Math.round(n / dsum * 10) / 10;
  });
  return { global, divisiones: divD, patologias: patD, etapas: etD };
}
function inVeredicto(g) {
  if (g == null) return '—';
  if (g < 20) return 'Buen estado';
  if (g < 40) return 'Estado regular';
  if (g < 60) return 'Deterioro moderado';
  if (g < 80) return 'Deterioro grave';
  return 'Deterioro crítico';
}

// ─── CARGA ───
async function inLoad() {
  try {
    const [dv, pt, et, cf, ins, pr] = await Promise.all([
      sb.from('insp_divisiones').select('*').eq('active', true).order('orden').then(r => r.data || []),
      sb.from('insp_patologias').select('*').eq('active', true).order('orden').then(r => r.data || []),
      sb.from('insp_etapas_map').select('*').eq('active', true).order('orden').then(r => r.data || []),
      sb.from('insp_config').select('*').then(r => r.data || []),
      sb.from('remodel_inspecciones').select('*').eq('active', true).order('fecha_evaluacion', { ascending: false }).then(r => r.data || []),
      sb.from('remodel_at_properties').select('property_id, address, sqft').eq('active', true).then(r => r.data || []),
    ]);
    IN.divisiones = dv; IN.patologias = pt;
    IN.etapas = et.map(e => ({ ...e, divisiones: Array.isArray(e.divisiones) ? e.divisiones : JSON.parse(e.divisiones || '[]') }));
    IN.config = {}; cf.forEach(c => IN.config[c.key] = c.value);
    IN.inspecciones = ins; IN.props = pr;
    await inLoadCalib();
  } catch (e) { console.warn('inLoad', e); }
}

// ─── UI: base de datos de inspecciones ───
function inRenderDB() {
  const rows = IN.inspecciones.map(x => `<tr>
    <td><b>${IN_E(x.nombre_ref)}</b><div style="font-size:10px;opacity:.55">${IN_E(x.direccion || '')}${x.uso ? ' · ' + IN_E(x.uso) : ''}</div></td>
    <td style="text-align:right"><b class="${x.dano_global_pct >= 60 ? 'down' : x.dano_global_pct >= 40 ? 'warn' : 'up'}">${x.dano_global_pct != null ? x.dano_global_pct + '%' : '—'}</b></td>
    <td>${IN_E(x.veredicto || inVeredicto(x.dano_global_pct))}</td>
    <td style="font-size:11px">${(x.fecha_evaluacion || '').slice(0, 10)}</td>
    <td>${x.property_id ? '<span class="badge b-ok" style="font-size:8px">en Ficha</span>' : '<span class="badge b-warn" style="font-size:8px">sin casa</span>'}</td>
    <td style="text-align:right;white-space:nowrap">
      <button class="repbtn ghost" style="padding:3px 7px;font-size:10px" onclick="inExportJSON('${x.id}')" title="JSON taskade_visita_previa_v2">JSON</button>
      <button class="repbtn ghost" style="padding:3px 7px;font-size:10px" onclick="inExportXLS('${x.id}')" title="XLS vertical">XLS</button>
      ${x.property_id ? `<button class="repbtn" style="padding:3px 7px;font-size:10px" onclick="inPrellenarEstimador('${x.id}')" title="Pre-llenar Estimador Pro con el daño por etapa">→ Estimador</button>` : ''}
    </td></tr>`).join('');
  return `<div class="card"><div class="chart-h"><div class="t">Inspecciones guardadas</div><div class="k">${IN.inspecciones.length} evaluaciones · por property_id (Ficha de Casa)</div></div>
    <div style="display:flex;gap:8px;margin:8px 0"><button class="repbtn" onclick="inStartWizard()">＋ Nueva inspección</button><button class="repbtn ghost" onclick="inExportTodo()">⬇ Exportar todo (XLS)</button></div>
    <table class="ptable"><thead><tr><th>Propiedad</th><th style="text-align:right">Daño global</th><th>Veredicto</th><th>Fecha</th><th>Ficha</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="padding:14px;opacity:.6">Sin inspecciones — creá la primera.</td></tr>'}</tbody></table></div>`;
}

// ─── WIZARD: construcción de pasos dinámicos ───
function inBuildSteps(w) {
  // secciones: Externo → (¿pisos?) → Estructura → [Placa & Escaleras si 2+] → Interno → Reporte
  // cada división = un paso con las 5 patologías. Ramificación por numero_pisos.
  const steps = [{ id: 'datos', tipo: 'datos', titulo: 'Datos básicos', seccion: 'Inicio' }];
  const seccionDe = {
    acceso_externo: 'Externo', techo: 'Externo',
    estructura: 'Estructura', muros: 'Estructura',
    piso: 'Interno', carpinteria: 'Interno', redes: 'Interno',
    placa: 'Placa & Escaleras',
  };
  const orden = ['acceso_externo', 'techo', 'estructura', 'muros'];
  orden.forEach(k => { const d = IN.divisiones.find(x => x.key === k); if (d) steps.push({ id: k, tipo: 'division', division: k, titulo: d.nombre, emoji: d.emoji, seccion: seccionDe[k] }); });
  steps.push({ id: 'pisos', tipo: 'pisos', titulo: '¿Cuántos pisos?', seccion: 'Estructura' });
  // Placa & Escaleras solo si 2+
  if ((w.numero_pisos || 1) >= 2) {
    steps.push({ id: 'placa', tipo: 'division', division: 'placa', titulo: 'Placa de entrepiso', emoji: '🏗️', seccion: 'Placa & Escaleras', subgrupo: 'placa_entrepiso' });
    steps.push({ id: 'escaleras', tipo: 'division', division: 'placa', titulo: 'Escaleras', emoji: '🪜', seccion: 'Placa & Escaleras', subgrupo: 'escaleras' });
  }
  ['piso', 'carpinteria', 'redes'].forEach(k => { const d = IN.divisiones.find(x => x.key === k); if (d) steps.push({ id: k, tipo: k === 'redes' ? 'redes' : k === 'carpinteria' ? 'carpinteria' : 'division', division: k, titulo: d.nombre, emoji: d.emoji, seccion: 'Interno' }); });
  steps.push({ id: 'limpieza', tipo: 'limpieza', titulo: 'Limpieza', emoji: '🧹', seccion: 'Interno' });
  steps.push({ id: 'reporte', tipo: 'reporte', titulo: 'Reporte', seccion: 'Reporte' });
  return steps;
}
function inStartWizard(inspId) {
  const base = inspId ? IN.inspecciones.find(x => x.id === inspId) : null;
  IN.wizard = {
    id: base ? base.id : null,
    nombre_ref: base ? base.nombre_ref : '', direccion: base ? base.direccion : '', uso: base ? base.uso : 'compra',
    property_id: base ? base.property_id : null,
    numero_pisos: base ? (base.numero_pisos || 1) : 1,
    scores: base ? JSON.parse(JSON.stringify(base.scores || {})) : {},   // {division:{patologia:1..5}}
    raw: base ? JSON.parse(JSON.stringify(base.raw_answers || {})) : {},  // TODAS las respuestas crudas
    limpieza: base ? (base.limpieza_items || []) : [],
    checklist: base ? (base.checklist || {}) : {},
    subScores: {},   // placa_entrepiso / escaleras antes de promediar a 'placa'
    idx: 0, avisos: [],
  };
  IN.wizard.steps = inBuildSteps(IN.wizard);
  inRenderWizard();
}
window.inStartWizard = inStartWizard;

function inWizardCompute() {
  const w = IN.wizard;
  // promediar subgrupos de placa (entrepiso + escaleras) al grupo 'placa'
  if (w.subScores.placa_entrepiso || w.subScores.escaleras) {
    const merged = {};
    IN.patologias.forEach(p => {
      const a = (w.subScores.placa_entrepiso || {})[p.key], b = (w.subScores.escaleras || {})[p.key];
      const vals = [a, b].filter(v => v != null);
      if (vals.length) merged[p.key] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    });
    if (Object.keys(merged).length) w.scores.placa = merged;
  }
  return inComputeDano(w.scores);
}

function inRenderWizard() {
  const w = IN.wizard; if (!w) return;
  const step = w.steps[w.idx];
  const total = w.steps.length;
  const pct = Math.round(100 * (w.idx) / (total - 1));
  const res = inWizardCompute();
  // panel lateral en vivo
  const barra = (pct2, label, val, emoji) => `<div style="margin-bottom:7px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px"><span>${emoji || ''} ${IN_E(label)}</span><b>${val != null ? val + '%' : '—'}</b></div><div style="height:6px;border-radius:4px;background:rgba(255,255,255,.07);overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, val || 0)}%;background:${(val || 0) >= 60 ? '#f87171' : (val || 0) >= 40 ? '#e7b65e' : '#34d399'}"></i></div></div>`;
  const panel = `<div class="card" style="align-self:flex-start;position:sticky;top:10px">
    <div style="text-align:center;padding:8px 0"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;opacity:.6">Daño Global Estimado</div>
      <div style="font-size:38px;font-weight:800;color:${(res.global || 0) >= 60 ? '#f87171' : (res.global || 0) >= 40 ? '#e7b65e' : '#34d399'}">${res.global != null ? res.global + '%' : '—'}</div>
      <div style="font-size:11px;opacity:.7">${IN_E(inVeredicto(res.global))}</div></div>
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin:10px 0 6px;opacity:.6">Divisiones Técnicas</div>
    ${IN.divisiones.map(d => barra(null, d.nombre, res.divisiones[d.key], d.emoji)).join('')}
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px;opacity:.6">Patologías · en vivo</div>
    ${IN.patologias.map(p => barra(null, p.nombre, res.patologias[p.key], p.emoji)).join('')}
  </div>`;
  // avisos
  const avisosHtml = (w.avisos || []).length ? `<div class="card" style="border:1px solid rgba(231,182,94,.4);margin-bottom:10px"><div class="lab" style="color:#e7b65e">⚠ Avisos</div>${w.avisos.map(a => `<div style="font-size:11px;margin:3px 0">• ${IN_E(a)}</div>`).join('')}</div>` : '';
  let body = '';
  if (step.tipo === 'datos') {
    body = `<div class="card"><div class="chart-h"><div class="t">Datos básicos</div></div>
      <label style="font-size:11px;opacity:.7">Nombre / Referencia *<br><input id="in-nom" value="${IN_E(w.nombre_ref)}" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px;color:inherit;margin:4px 0 10px"></label>
      <label style="font-size:11px;opacity:.7">Dirección<br><input id="in-dir" value="${IN_E(w.direccion || '')}" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px;color:inherit;margin:4px 0 10px"></label>
      <label style="font-size:11px;opacity:.7">Casa (property_id) — la inspección vive en su Ficha<br><select id="in-pid" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px;color:inherit;margin:4px 0 10px"><option value="">(sin casa asignada)</option>${IN.props.map(p => `<option value="${p.property_id}" ${w.property_id === p.property_id ? 'selected' : ''}>${IN_E((p.address || '').split(',')[0])}</option>`).join('')}</select></label>
      <div style="font-size:11px;opacity:.7;margin-bottom:4px">¿Compra o Renta?</div>
      <div style="display:flex;gap:8px">${['compra', 'renta'].map(u => `<button class="repbtn ${w.uso === u ? '' : 'ghost'}" onclick="IN.wizard.uso='${u}';inRenderWizard()">${u === 'compra' ? '🏷️ Compra (flip)' : '🔑 Renta'}</button>`).join('')}</div></div>`;
  } else if (step.tipo === 'pisos') {
    body = `<div class="card"><div class="chart-h"><div class="t">¿Cuántos pisos tiene la vivienda?</div><div class="k">2+ agrega la evaluación de Placa de entrepiso y Escaleras</div></div>
      <div style="display:flex;gap:10px;margin-top:8px">${[[1, '1 Piso'], [2, '2 o más pisos']].map(([n, l]) => `<button class="repbtn ${(w.numero_pisos >= 2 ? 2 : 1) === n ? '' : 'ghost'}" style="flex:1;padding:14px" onclick="inSetPisos(${n})">${l}</button>`).join('')}</div></div>`;
  } else if (step.tipo === 'redes') {
    const redes = ['plomeria', 'gas', 'electricidad'];
    const raw = w.raw.redes = w.raw.redes || {};
    body = `<div class="card"><div class="chart-h"><div class="t">🔌 Redes</div><div class="k">cada red pesa ${IN_cfg('red_peso_pct', 33.33)}% de la división · solo cuenta "No funciona"</div></div>
      ${redes.map(r => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><b style="text-transform:capitalize">${r}</b>
        <div style="display:flex;gap:6px">${[['funciona', 'Funciona'], ['no_funciona', 'No funciona']].map(([v, l]) => `<button class="repbtn ${raw[r] === v ? '' : 'ghost'}" style="padding:4px 10px;font-size:11px" onclick="inSetRed('${r}','${v}')">${l}</button>`).join('')}</div></div>`).join('')}
      <div class="meta" style="margin-top:8px">Las redes que "No funciona" cargan la división Redes. Externas sin servicio → aviso de permisos.</div></div>`;
  } else if (step.tipo === 'carpinteria') {
    const raw = w.raw.carpinteria = w.raw.carpinteria || {};
    const campos = [['ventanas', 'Ventanas'], ['puertas_int', 'Puertas interiores'], ['gabinetes', 'Gabinetes (cocina/baños)']];
    body = `<div class="card"><div class="chart-h"><div class="t">🪚 Carpintería</div><div class="k">ratio de unidades dañadas → score 1-5 (no afecta otras patologías)</div></div>
      ${campos.map(([k, l]) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0"><span>${l}</span><span style="font-size:11px">dañadas <input type="number" min="0" value="${raw[k + '_mal'] || 0}" onchange="inSetCarp('${k}_mal',this.value)" style="width:52px;text-align:right;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:3px;color:inherit"> de <input type="number" min="0" value="${raw[k + '_tot'] || 0}" onchange="inSetCarp('${k}_tot',this.value)" style="width:52px;text-align:right;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:3px;color:inherit"></span></div>`).join('')}
      <div class="meta" style="margin-top:8px">Ratio total dañadas/total → 0-100% → score. El resto de las patologías de la casa no se tocan.</div></div>`;
  } else if (step.tipo === 'division') {
    const dk = step.subgrupo || step.division;
    const cur = step.subgrupo ? (w.subScores[step.subgrupo] || {}) : (w.scores[step.division] || {});
    body = `<div class="card"><div class="chart-h"><div class="t">${step.emoji} ${IN_E(step.titulo)}</div><div class="k">respondé solo lo que aplique · escala 1 (sin daño) a 5 (crítico)</div></div>
      ${IN.patologias.map(p => `<div style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="font-size:12px;margin-bottom:5px">${p.emoji} <b>${IN_E(p.nombre)}</b> <span style="opacity:.6;font-size:10px">${IN_E(p.pregunta)}</span></div>
        <div style="display:flex;gap:5px">${[1, 2, 3, 4, 5].map(s => `<button class="repbtn ${cur[p.key] === s ? '' : 'ghost'}" style="flex:1;padding:5px;font-size:11px" onclick="inSetScore('${step.subgrupo || step.division}','${p.key}',${s},${step.subgrupo ? 'true' : 'false'})">${s}</button>`).join('')}</div>
        <div style="display:flex;justify-content:space-between;font-size:8px;opacity:.5;margin-top:2px"><span>sin daño</span><span>leve</span><span>moderado</span><span>grave</span><span>crítico</span></div></div>`).join('')}</div>`;
  } else if (step.tipo === 'limpieza') {
    const items = ['Retiro de escombros', 'Limpieza profunda interior', 'Limpieza de fachada', 'Retiro de basura/enseres', 'Limpieza de patio/jardín'];
    body = `<div class="card"><div class="chart-h"><div class="t">🧹 Limpieza</div><div class="k">NO pondera el daño — va a la BD y al entregable</div></div>
      ${items.map(it => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px"><input type="checkbox" ${(w.limpieza || []).includes(it) ? 'checked' : ''} onchange="inToggleLimpieza('${IN_E(it).replace(/'/g, '')}')"> ${it}</label>`).join('')}</div>`;
  } else if (step.tipo === 'reporte') {
    const etapas = res.etapas;
    body = `<div class="card"><div class="chart-h"><div class="t">📊 Reporte de diagnóstico</div><div class="k">${IN_E(w.nombre_ref)} · ${IN_E(inVeredicto(res.global))}</div></div>
      <div style="text-align:center;padding:12px"><div style="font-size:46px;font-weight:800;color:${(res.global || 0) >= 60 ? '#f87171' : '#34d399'}">${res.global != null ? res.global + '%' : '—'}</div><div style="opacity:.7">Daño Global Estimado</div></div>
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;opacity:.6;margin:8px 0 4px">Daño por etapa de renovación</div>
      <table class="ptable"><tbody>${IN.etapas.filter(e => e.etapa !== 'Limpieza').map(e => `<tr><td>${e.emoji} ${IN_E(e.etapa)}</td><td style="text-align:right"><b class="${(etapas[e.etapa] || 0) >= 50 ? 'down' : ''}">${etapas[e.etapa] != null ? etapas[e.etapa] + '%' : '—'}</b></td></tr>`).join('')}</tbody></table>
      ${(() => { try { const rh = inRehabEstimado({ property_id: w.property_id, dano_etapas: res.etapas }); return `<div style="font-size:11px;font-weight:800;text-transform:uppercase;opacity:.6;margin:12px 0 4px">💵 Rehab estimado (daño × $/sqft calibrado)</div><div style="padding:8px 10px;border-radius:8px;background:rgba(52,211,153,.08);margin-bottom:6px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:20px" class="up">${IN_M(rh.total)}</b><span style="font-size:10px;opacity:.7">${rh.sqft} sqft × ${rh.calibPsf}/sqft ${rh.n ? '<span style=\'background:rgba(18,181,160,.18);color:#12b5a0;padding:1px 6px;border-radius:8px;font-size:8px;font-weight:800\'>calibrado con ' + rh.n + ' obras</span>' : ''}</span></div></div><table class="ptable"><tbody>${IN.etapas.filter(e => e.etapa !== 'Limpieza').map(e => `<tr><td>${e.emoji} ${IN_E(e.etapa)}</td><td style="text-align:right">${IN_M(rh.porEtapa[e.etapa] || 0)}</td></tr>`).join('')}</tbody></table><div class="meta" style="margin-top:4px">Este total = candidato a \'Valor Remodelación\' → alimenta el MAO/underwriting de Fix & Flip por property_id.</div>`; } catch (e) { return ''; } })()}
      <div class="meta" style="margin-top:8px">Al guardar: se registra por property_id (Ficha de Casa) con TODAS las respuestas crudas + exportables JSON/XLS. Botón "→ Estimador" pre-llena el pronóstico con este daño por etapa.</div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="repbtn" onclick="inSaveWizard()">💾 Guardar inspección</button></div></div>`;
  }
  const nav = `<div style="display:flex;justify-content:space-between;margin-top:12px">
    <button class="repbtn ghost" ${w.idx === 0 ? 'disabled' : ''} onclick="inNav(-1)">← Atrás</button>
    <span style="font-size:11px;opacity:.6;align-self:center">Paso ${w.idx + 1} de ${total} · ${step.seccion} · ${pct}%</span>
    ${w.idx < total - 1 ? `<button class="repbtn" onclick="inNav(1)">Siguiente →</button>` : '<span></span>'}</div>`;
  const html = `<div style="display:grid;grid-template-columns:1fr 300px;gap:14px;align-items:start">
    <div>${avisosHtml}<div style="height:5px;border-radius:3px;background:rgba(255,255,255,.08);margin-bottom:12px;overflow:hidden"><i style="display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#12b5a0,#2f6ef0)"></i></div>${body}${nav}</div>
    ${panel}</div>`;
  const ov = document.getElementById('in-wizard-body');
  if (ov) ov.innerHTML = html;
  else openModal('🔍 Inspección de vivienda', `<div id="in-wizard-body">${html}</div>`);
}
window.inRenderWizard = inRenderWizard;

// ─── handlers del wizard ───
function inNav(dir) {
  const w = IN.wizard;
  if (dir > 0 && w.idx === 0) { // guardar datos básicos
    w.nombre_ref = (document.getElementById('in-nom') || {}).value || w.nombre_ref;
    w.direccion = (document.getElementById('in-dir') || {}).value || '';
    w.property_id = (document.getElementById('in-pid') || {}).value || null;
    if (!w.nombre_ref.trim()) { alert('El Nombre / Referencia es obligatorio.'); return; }
  }
  w.idx = Math.max(0, Math.min(w.steps.length - 1, w.idx + dir));
  inRenderWizard();
}
function inSetPisos(n) {
  IN.wizard.numero_pisos = n;
  IN.wizard.steps = inBuildSteps(IN.wizard);   // reconstruye pasos (ramificación)
  inNav(1);
}
function inSetScore(divOrSub, patKey, score, isSub) {
  const w = IN.wizard;
  if (isSub) { w.subScores[divOrSub] = w.subScores[divOrSub] || {}; w.subScores[divOrSub][patKey] = score; }
  else { w.scores[divOrSub] = w.scores[divOrSub] || {}; w.scores[divOrSub][patKey] = score; }
  w.raw['score_' + divOrSub] = isSub ? w.subScores[divOrSub] : w.scores[divOrSub];
  inRenderWizard();
}
function inSetRed(red, val) {
  const w = IN.wizard; w.raw.redes = w.raw.redes || {}; w.raw.redes[red] = val;
  // solo "no funciona" cuenta: mapear a score de la división redes (mecánica como proxy de "no funciona")
  const noFunc = ['plomeria', 'gas', 'electricidad'].filter(r => w.raw.redes[r] === 'no_funciona').length;
  const pesoRed = IN_cfg('red_peso_pct', 33.33) / 100;
  const pct = noFunc * pesoRed;              // 0..1 fracción de la división dañada
  const score = pct <= 0 ? 1 : Math.min(5, 1 + Math.round(pct * 4));
  w.scores.redes = {}; IN.patologias.forEach(p => { w.scores.redes[p.key] = score; }); // redes: daño uniforme por servicio caído
  if (val === 'no_funciona') { const av = `Necesitás tramitar permisos para restablecer el servicio de: ${red}`; if (!w.avisos.includes(av)) w.avisos.push(av); }
  inRenderWizard();
}
function inSetCarp(campo, val) {
  const w = IN.wizard; w.raw.carpinteria = w.raw.carpinteria || {}; w.raw.carpinteria[campo] = +val || 0;
  const r = w.raw.carpinteria;
  const mal = (r.ventanas_mal || 0) + (r.puertas_int_mal || 0) + (r.gabinetes_mal || 0);
  const tot = (r.ventanas_tot || 0) + (r.puertas_int_tot || 0) + (r.gabinetes_tot || 0);
  const ratio = tot > 0 ? mal / tot : 0;
  const score = ratio <= 0 ? 1 : Math.min(5, 1 + Math.round(ratio * 4));
  w.scores.carpinteria = {}; IN.patologias.forEach(p => { w.scores.carpinteria[p.key] = score; });
  inRenderWizard();
}
function inToggleLimpieza(it) {
  const w = IN.wizard; w.limpieza = w.limpieza || [];
  const i = w.limpieza.indexOf(it); if (i >= 0) w.limpieza.splice(i, 1); else w.limpieza.push(it);
  inRenderWizard();
}
window.inNav = inNav; window.inSetPisos = inSetPisos; window.inSetScore = inSetScore;
window.inSetRed = inSetRed; window.inSetCarp = inSetCarp; window.inToggleLimpieza = inToggleLimpieza;

async function inSaveWizard() {
  const w = IN.wizard; const res = inWizardCompute();
  const row = {
    property_id: w.property_id || null, nombre_ref: w.nombre_ref, direccion: w.direccion || null, uso: w.uso || null,
    numero_pisos: w.numero_pisos || 1, scores: w.scores, raw_answers: w.raw, limpieza_items: w.limpieza || [], checklist: w.checklist || {},
    dano_global_pct: res.global, dano_divisiones: res.divisiones, dano_patologias: res.patologias, dano_etapas: res.etapas,
    veredicto: inVeredicto(res.global), estado: 'completa', updated_at: new Date().toISOString(),
  };
  const { data: { session } } = await sb.auth.getSession();
  row.created_by = (session && session.user && session.user.email) || 'panel';
  let error;
  if (w.id) { ({ error } = await sb.from('remodel_inspecciones').update(row).eq('id', w.id)); }
  else { ({ error } = await sb.from('remodel_inspecciones').insert(row)); }
  if (error) { alert('No se pudo guardar: ' + error.message); return; }
  alert('✅ Inspección guardada' + (res.global != null ? ` — daño global ${res.global}%` : '') + '.');
  closeModal(); await inLoad(); if (window.rcRender) rcRender();
}
window.inSaveWizard = inSaveWizard;

// ─── EXPORTS (idénticos a Taskade) ───
function inExportJSON(id) {
  const x = IN.inspecciones.find(i => i.id === id) || IN.wizard; if (!x) return;
  const grupos = IN.divisiones.map(d => ({ key: d.key, nombre: d.nombre, peso: +d.peso_pct, dano_pct: (x.dano_divisiones || {})[d.key] ?? null, scores_1_5: (x.scores || {})[d.key] || {} }));
  const patologias = IN.patologias.map(p => ({ key: p.key, nombre: p.nombre, peso: +p.peso_pct, dano_pct: (x.dano_patologias || {})[p.key] ?? null }));
  const etapas = IN.etapas.map(e => ({ etapa: e.etapa, dano_pct: (x.dano_etapas || {})[e.etapa] ?? null, divisiones: e.divisiones }));
  const j = {
    _schema: 'taskade_visita_previa_v2',
    propiedad: { nombre: x.nombre_ref, direccion: x.direccion, uso: x.uso, property_id: x.property_id, numero_pisos: x.numero_pisos },
    resultado_global: { dano_pct: x.dano_global_pct, veredicto: x.veredicto || inVeredicto(x.dano_global_pct) },
    grupos, patologias, etapas_renovacion: etapas,
    checklist: x.checklist || {}, limpieza: x.limpieza_items || [], scores_raw: x.scores || {}, raw_answers: x.raw_answers || x.raw || {},
  };
  inDownload(`inspeccion_${(x.nombre_ref || 'casa').replace(/\W+/g, '_')}.json`, JSON.stringify(j, null, 2), 'application/json');
}
function inExportXLS(id) { inXlsRows([IN.inspecciones.find(i => i.id === id)].filter(Boolean), `inspeccion_${id}`); }
function inExportTodo() { inXlsRows(IN.inspecciones, 'inspecciones_todas'); }
function inXlsRows(insps, fname) {
  if (!insps.length) { alert('Sin inspecciones.'); return; }
  // tabla VERTICAL: Sección | Ítem | Detalle | Prop1 | Prop2 …
  const cols = insps.map(x => x.nombre_ref);
  const rows = [['Sección', 'Ítem', 'Detalle', ...cols]];
  rows.push(['General', 'Daño Global', '%', ...insps.map(x => x.dano_global_pct != null ? x.dano_global_pct + '%' : '')]);
  rows.push(['General', 'Veredicto', '', ...insps.map(x => x.veredicto || '')]);
  rows.push(['General', 'Uso', '', ...insps.map(x => x.uso || '')]);
  rows.push(['General', 'Nº pisos', '', ...insps.map(x => x.numero_pisos || 1)]);
  IN.divisiones.forEach(d => {
    rows.push(['División', d.nombre, 'daño %', ...insps.map(x => (x.dano_divisiones || {})[d.key] ?? '')]);
    IN.patologias.forEach(p => rows.push(['División · ' + d.nombre, p.nombre, 'score 1-5', ...insps.map(x => ((x.scores || {})[d.key] || {})[p.key] ?? '')]));
  });
  IN.patologias.forEach(p => rows.push(['Patología', p.nombre, 'daño %', ...insps.map(x => (x.dano_patologias || {})[p.key] ?? '')]));
  IN.etapas.forEach(e => rows.push(['Etapa renovación', e.etapa, 'daño %', ...insps.map(x => (x.dano_etapas || {})[e.etapa] ?? '')]));
  rows.push(['Limpieza', 'Plan', 'ítems', ...insps.map(x => (x.limpieza_items || []).join('; '))]);
  if (typeof XLSX !== 'undefined') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Inspección');
    XLSX.writeFile(wb, fname + '.xlsx');
  } else {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    inDownload(fname + '.csv', csv, 'text/csv');
  }
}
function inDownload(name, content, mime) {
  const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
window.inExportJSON = inExportJSON; window.inExportXLS = inExportXLS; window.inExportTodo = inExportTodo;

// ─── CONEXIÓN → ESTIMADOR PRO (pre-llenar con el daño por etapa) ───
function inPrellenarEstimador(id) {
  const x = IN.inspecciones.find(i => i.id === id); if (!x) return;
  const afect = x.dano_etapas || {};
  // handoff: guardar en un slot que el Estimador lee al abrir para una casa
  const rh = (() => { try { return inRehabEstimado(x); } catch (e) { return null; } })();
  window.__inspHandoff = { property_id: x.property_id, nombre: x.nombre_ref, direccion: x.direccion, uso: x.uso, afectacion_por_etapa: afect, dano_global: x.dano_global_pct, rehab_estimado: rh ? rh.total : null };
  try { localStorage.setItem('rm_insp_handoff', JSON.stringify(window.__inspHandoff)); } catch (e) {}
  const resumen = IN.etapas.filter(e => e.etapa !== 'Limpieza').map(e => `${e.emoji} ${e.etapa}: ${afect[e.etapa] != null ? afect[e.etapa] + '%' : '—'}`).join('\n');
  alert(`Handoff listo para el Estimador Pro (${x.nombre_ref}):\n\n${resumen}\n\nAbrí el Estimador → arranca el pronóstico con estas afectaciones por etapa (en vez de cero). El presupuesto que salga = candidato a "Valor Remodelación".`);
}
window.inPrellenarEstimador = inPrellenarEstimador;
window.IN = IN; window.inLoad = inLoad; window.inRenderDB = inRenderDB;

// ─── MEJORA daño→$: convertir % de daño en $ de rehab con calibración C1 ($/sqft por etapa) ───
// $/sqft por etapa (semilla del catálogo del Estimador); calibrado al total real por la calibración C1.
const IN_STAGE_PSF = { 'Demolición': 1.32, 'Cimentación': 0.00, 'Externo': 9.88, 'Estructura': 4.24, 'Interno': 28.01, 'Limpieza': 1.87 };
async function inLoadCalib() {
  try {
    const [{ data: cc }, { data: pr }] = await Promise.all([
      sb.from('v_remodel_calib_costos').select('*').eq('ventana', 'historico').maybeSingle(),
      sb.from('remodel_forecast_params').select('key,value').eq('key', 'total_psf_real').maybeSingle(),
    ]);
    IN.calib = { psf_real: cc ? +cc.psf_real : (pr ? +pr.value : null), n: cc ? +cc.n : null };
  } catch (e) { IN.calib = { psf_real: null, n: null }; }
  return IN.calib;
}
function inRehabEstimado(insp) {
  // sqft de la casa
  const prop = (IN.props || []).find(p => p.property_id === insp.property_id);
  const sqft = prop && +prop.sqft > 0 ? +prop.sqft : 1400;   // fallback promedio del portafolio
  const seedTotal = Object.values(IN_STAGE_PSF).reduce((s, v) => s + v, 0);  // ~45.3
  const calibPsf = IN.calib && IN.calib.psf_real ? IN.calib.psf_real : seedTotal;
  const factor = seedTotal > 0 ? calibPsf / seedTotal : 1;    // reescala la semilla al $/sqft real calibrado
  const et = insp.dano_etapas || {};
  const porEtapa = {}; let total = 0;
  IN.etapas.forEach(e => {
    if (e.etapa === 'Limpieza') { const c = Math.round(IN_STAGE_PSF['Limpieza'] * factor * sqft); porEtapa[e.etapa] = c; total += c; return; }
    const psf = (IN_STAGE_PSF[e.etapa] || 0) * factor;
    const dano = (et[e.etapa] || 0) / 100;                    // el daño % escala el costo de esa etapa
    const c = Math.round(psf * sqft * dano);
    porEtapa[e.etapa] = c; total += c;
  });
  return { sqft, calibPsf: Math.round(calibPsf * 100) / 100, n: IN.calib ? IN.calib.n : null, porEtapa, total };
}
window.inRehabEstimado = inRehabEstimado; window.inLoadCalib = inLoadCalib;
