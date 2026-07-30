// ════════════════════════════════════════════════════════════════
// 📊 INFORMES AUTOMÁTICOS DE RENTAS (29-jul-2026) — panel /informes.
// Reemplaza los 3 informes manuales por generación viva desde el OS:
//   1) Semanal de Ocupación y Gestión (lunes)  2) Balance de Rentas (por corte)  3) Combinado (cierre de mes)
// Flujo: elegir tipo + fecha de corte → BORRADOR editable (Carlos ajusta textos) → PDF (informe-render).
// Cada informe congela un snapshot inmutable (pm_cartera_snapshots) → la "franja de avance" compara cortes.
// La MISMA RPC rentas_generar_informe la llaman este botón y el pg_cron (semanal/cierre) → una definición.
// Fuentes: cartera_matriz · v_ocupacion · v_rentas_unidades · rentas_contratos_por_vencer (todo con linaje).
// ════════════════════════════════════════════════════════════════
/* global sb, OS, osRender, OS_E, osIcon, informeOpen */

const INF = { list: null, loading: false, err: null, draft: null, msg: null, gen: {} };
window.INF = INF;

const inYmd = d => d.toISOString().slice(0, 10);
const inFinMes = () => { const n = new Date(); return inYmd(new Date(n.getFullYear(), n.getMonth() + 1, 0)); };
const inFecha = s => { if (!s) return '—'; const d = new Date(s + (s.length === 10 ? 'T00:00:00' : '')); return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); };
const inTipoLbl = t => ({ semanal: 'Semanal · Ocupación y Gestión', balance: 'Balance de Rentas', combinado: 'Cartera + Portafolio (combinado)' })[t] || t;
const inTipoIco = t => ({ semanal: 'house', balance: 'bar-chart', combinado: 'clipboard' })[t] || 'file-text';

async function inLoad(force) {
  if (INF.loading || (INF.list && !force)) return;
  INF.loading = true; INF.err = null;
  try {
    const { data, error } = await sb.from('pm_informes')
      .select('id,tipo,corte,titulo,estado,origen,generado_por,emitido_at,created_at')
      .is('archived_at', null).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    INF.list = data || [];
  } catch (e) { INF.err = e.message || String(e); }
  INF.loading = false; osRender();
}
window.inLoad = inLoad;

function inSetCorte(tipo, v) { INF.gen[tipo] = v; }
window.inSetCorte = inSetCorte;

async function inGenerar(tipo) {
  const corte = INF.gen[tipo] || (tipo === 'combinado' ? inFinMes() : inYmd(new Date()));
  INF.msg = { k: 'info', t: 'Generando borrador…' }; osRender();
  try {
    const { data, error } = await sb.rpc('rentas_generar_informe', { p_tipo: tipo, p_corte: corte, p_origen: 'manual' });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('La RPC no devolvió el informe.');
    INF.draft = row; INF.msg = { k: 'ok', t: 'Borrador creado — revisá y emití el PDF.' };
    INF.list = null; inLoad(true);
  } catch (e) { INF.msg = { k: 'neg', t: 'No se pudo generar: ' + (e.message || e) }; osRender(); }
}
window.inGenerar = inGenerar;

async function inOpenDraft(id) {
  INF.msg = null;
  try {
    const { data, error } = await sb.from('pm_informes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Informe no encontrado.');
    INF.draft = data; osRender();
  } catch (e) { INF.msg = { k: 'neg', t: e.message || String(e) }; osRender(); }
}
window.inOpenDraft = inOpenDraft;

function inBack() { INF.draft = null; INF.msg = null; osRender(); }
window.inBack = inBack;

// ── edición del borrador (en memoria) ──
function inEd() { INF.draft.payload.editable = INF.draft.payload.editable || {}; return INF.draft.payload.editable; }
function inEdit(field, v) { inEd()[field] = v; }
window.inEdit = inEdit;
function inGpmAdd() { const e = inEd(); e.gestion_pm = e.gestion_pm || []; e.gestion_pm.push({ texto: '', estado: 'EN PROCESO' }); osRender(); }
window.inGpmAdd = inGpmAdd;
function inGpmDel(i) { const e = inEd(); e.gestion_pm.splice(i, 1); osRender(); }
window.inGpmDel = inGpmDel;
function inGpmSet(i, k, v) { const e = inEd(); e.gestion_pm[i][k] = v; }
window.inGpmSet = inGpmSet;
function inPaAdd() { const e = inEd(); e.proximas_actividades = e.proximas_actividades || []; e.proximas_actividades.push(''); osRender(); }
window.inPaAdd = inPaAdd;
function inPaDel(i) { const e = inEd(); e.proximas_actividades.splice(i, 1); osRender(); }
window.inPaDel = inPaDel;
function inPaSet(i, v) { const e = inEd(); e.proximas_actividades[i] = v; }
window.inPaSet = inPaSet;

async function inSave(silent) {
  try {
    const { error } = await sb.from('pm_informes').update({ payload: INF.draft.payload, updated_at: new Date().toISOString() }).eq('id', INF.draft.id);
    if (error) throw error;
    if (!silent) { INF.msg = { k: 'ok', t: 'Borrador guardado.' }; osRender(); }
    return true;
  } catch (e) { INF.msg = { k: 'neg', t: 'No se guardó: ' + (e.message || e) }; osRender(); return false; }
}
window.inSave = inSave;

function inPDF(payload) { informeOpen(payload || INF.draft.payload); }
window.inPDF = inPDF;

async function inEmitir(id) {
  // emitir desde el editor (usa el borrador en memoria) o desde la bandeja (fetch)
  let payload;
  if (INF.draft && INF.draft.id === id) { await inSave(true); payload = INF.draft.payload; }
  else { const { data } = await sb.from('pm_informes').select('*').eq('id', id).maybeSingle(); if (!data) return; payload = data.payload; }
  try {
    const { error } = await sb.from('pm_informes').update({ estado: 'emitido', emitido_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    informeOpen(payload);
    INF.msg = { k: 'ok', t: 'Informe emitido — se abrió la ventana de impresión/PDF.' };
    if (INF.draft && INF.draft.id === id) INF.draft.estado = 'emitido';
    INF.list = null; inLoad(true);
  } catch (e) { INF.msg = { k: 'neg', t: e.message || String(e) }; osRender(); }
}
window.inEmitir = inEmitir;

async function inArchivar(id) {
  if (!confirm('¿Archivar este informe de la bandeja? (reversible)')) return;
  try {
    const { error } = await sb.from('pm_informes').update({ archived_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    INF.list = null; inLoad(true);
  } catch (e) { INF.msg = { k: 'neg', t: e.message || String(e) }; osRender(); }
}
window.inArchivar = inArchivar;

// ── vista ──
function inMsgHtml() {
  if (!INF.msg) return '';
  const c = { ok: 'var(--pos)', neg: 'var(--neg)', info: 'var(--accent,#3a5be0)' }[INF.msg.k] || 'var(--mut)';
  return '<div class="card" style="border-left:3px solid ' + c + ';margin:10px 0;padding:8px 12px;font-size:13px">' + OS_E(INF.msg.t) + '</div>';
}

function osInformesView() {
  if (INF.draft) return inDraftEditor();
  if (!INF.list && !INF.err) { inLoad(); return '<div class="empty">' + osIcon('loader') + ' Cargando bandeja de informes…</div>'; }
  if (INF.err) return '<div class="empty down">' + OS_E(INF.err) + ' <button class="cbtn" onclick="inLoad(true)">Reintentar</button></div>';
  const hoy = inYmd(new Date());
  const genCard = (tipo, desc, defCorte) => {
    const cv = INF.gen[tipo] || defCorte;
    return '<div class="card"><div style="display:flex;align-items:center;gap:8px"><span>' + osIcon(inTipoIco(tipo)) + '</span><b>' + OS_E(inTipoLbl(tipo)) + '</b></div>'
      + '<div class="meta" style="margin:6px 0 10px">' + desc + '</div>'
      + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
      + '<span class="meta">Corte</span><input type="date" class="ibtn" value="' + cv + '" onchange="inSetCorte(\'' + tipo + '\', this.value)">'
      + '<button class="cbtn" style="padding:7px 12px;margin-left:auto" onclick="inGenerar(\'' + tipo + '\')">' + osIcon('plus') + ' Generar borrador</button></div></div>';
  };
  let html = '<h1>' + osIcon('file-text') + ' Informes de Rentas <span>· automáticos</span></h1>'
    + '<div class="sub">Los 3 informes que el equipo armaba a mano, generados con la data viva del OS (una fuente por métrica). Elegí tipo + corte → borrador editable → PDF. Cada emisión congela un snapshot inmutable — la franja de "avance entre cortes" compara esos snapshots. Programables: semanal (lunes 8am) y cierre de mes dejan el borrador listo en esta bandeja.</div>'
    + inMsgHtml()
    + '<div class="grid k3" style="margin-top:12px">'
    + genCard('semanal', 'Ocupación por unidad, movimientos de la semana, gestión PM, unidades a gestionar, vencimientos 90 días y detalle por propiedad.', hoy)
    + genCard('balance', 'Cartera vencida por inquilino y mes (neteada), concentración del mes, avance entre cortes y matriz de antigüedad.', hoy)
    + genCard('combinado', 'Balance de cartera con días de mora + plan de acción + estado del portafolio (ocupación efectiva, empalmes) + anexo de unidades.', inFinMes())
    + '</div>';
  // bandeja
  html += '<div class="card overx" style="margin-top:16px"><div class="chart-h"><div class="t">Bandeja de informes · ' + (INF.list.length) + '</div><div class="k">borradores editables + emitidos · clic en un borrador para editarlo</div></div>';
  if (!INF.list.length) html += '<div class="empty" style="padding:20px">Todavía no hay informes. Generá el primero arriba.</div>';
  else {
    html += '<table><thead><tr><th>Tipo</th><th>Corte</th><th>Estado</th><th>Origen</th><th>Generado</th><th style="text-align:right">Acciones</th></tr></thead><tbody>'
      + INF.list.map(r => {
        const est = r.estado === 'emitido'
          ? '<span style="color:var(--pos);font-weight:700">✓ Emitido</span>'
          : '<span style="color:var(--amber);font-weight:700">✎ Borrador</span>';
        const org = r.origen === 'cron' ? '<span class="src">⏰ automático</span>' : '<span class="src">manual</span>';
        return '<tr><td>' + osIcon(inTipoIco(r.tipo)) + ' ' + OS_E(inTipoLbl(r.tipo)) + '</td>'
          + '<td>' + inFecha(r.corte) + '</td><td>' + est + '</td><td>' + org + '</td>'
          + '<td class="src">' + inFecha((r.created_at || '').slice(0, 10)) + '<br>' + OS_E(r.generado_por || '') + '</td>'
          + '<td style="text-align:right;white-space:nowrap">'
          + '<button class="ibtn" onclick="inOpenDraft(\'' + r.id + '\')" title="Editar borrador">' + osIcon('edit') + '</button> '
          + '<button class="ibtn" onclick="inEmitir(\'' + r.id + '\')" title="Emitir / abrir PDF">' + osIcon('printer') + '</button> '
          + '<button class="ibtn" onclick="inArchivar(\'' + r.id + '\')" title="Archivar">' + osIcon('trash') + '</button></td></tr>';
      }).join('')
      + '</tbody></table>';
  }
  html += '</div>';
  html += '<div class="meta" style="margin-top:12px">Fuentes: <b>cartera_matriz</b> (deuda por mes, neteo por inquilino, días de mora por schedule real), <b>v_ocupacion</b> + <b>v_rentas_unidades</b> (ocupación y detalle), <b>rentas_contratos_por_vencer</b> (vencimientos). Snapshots inmutables en <b>pm_cartera_snapshots</b>. Donde el dato vivo difiera del PDF manual histórico, el informe lo reporta como alerta (no lo copia).</div>';
  return html;
}
window.osInformesView = osInformesView;

function inDraftEditor() {
  const d = INF.draft; const p = d.payload || {}; const e = p.editable || {};
  const t = d.tipo;
  const esCartera = (t === 'balance' || t === 'combinado');
  const esOcup = (t === 'semanal' || t === 'combinado');
  let html = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    + '<button class="ibtn" onclick="inBack()">← Bandeja</button>'
    + '<h1 style="margin:0">' + osIcon(inTipoIco(t)) + ' ' + OS_E(inTipoLbl(t)) + '</h1>'
    + '<span class="meta">corte ' + inFecha(d.corte) + ' · ' + (d.estado === 'emitido' ? '✓ emitido' : '✎ borrador') + '</span>'
    + '<span style="margin-left:auto;display:flex;gap:6px">'
    + '<button class="ibtn" onclick="inSave()">' + osIcon('save') + ' Guardar</button>'
    + '<button class="ibtn" onclick="inPDF()">' + osIcon('eye') + ' Vista previa</button>'
    + '<button class="cbtn" style="padding:8px 14px" onclick="inEmitir(\'' + d.id + '\')">' + osIcon('printer') + ' Emitir PDF</button></span></div>'
    + '<div class="sub" style="margin-top:6px">Los datos (ocupación, cartera, vencimientos) ya están congelados del corte. Editá acá solo los textos del equipo; la vista previa refleja lo que verá el PDF.</div>'
    + inMsgHtml();

  // resumen de lo congelado
  const tot = p.totales || {}; const od = p.ocup_derivado || {}; const oc = p.ocupacion || {};
  html += '<div class="grid k4" style="margin-top:10px">';
  if (esOcup) {
    html += '<div class="card"><div class="lab">Ocupación (activas)</div><div class="big">' + (od.ocup_activas_pct != null ? od.ocup_activas_pct + '%' : '—') + '</div><div class="meta">' + (oc.ocupadas || 0) + '/' + (od.activas || 0) + '</div></div>';
    html += '<div class="card"><div class="lab">Ingreso contratado</div><div class="big up">$' + Math.round(od.ingreso_contratado || 0).toLocaleString('en-US') + '</div><div class="meta">' + (od.propiedades || 0) + ' propiedades · ' + (od.ciudades || 0) + ' ciudades</div></div>';
  }
  if (esCartera) {
    html += '<div class="card"><div class="lab">Cartera (Σ meses)</div><div class="big down">$' + Math.round(tot.bruto || 0).toLocaleString('en-US') + '</div><div class="meta">neto ' + '$' + Math.round(tot.neto || 0).toLocaleString('en-US') + ' · ' + (tot.casos || 0) + ' casos</div></div>';
    html += '<div class="card"><div class="lab">Concentración mes</div><div class="big">' + (tot.conc_pct != null ? tot.conc_pct + '%' : '—') + '</div><div class="meta">$' + Math.round(tot.conc_monto || 0).toLocaleString('en-US') + '</div></div>';
  }
  html += '</div>';

  const ta = (field, label, val) => '<div class="card" style="margin-top:10px"><div class="lab">' + label + '</div>'
    + '<textarea class="ibtn" style="width:100%;min-height:70px;margin-top:6px;resize:vertical" onchange="inEdit(\'' + field + '\', this.value)" placeholder="Texto libre…">' + OS_E(val || '') + '</textarea></div>';

  if (esOcup) {
    // Gestión PM
    const gpm = e.gestion_pm || [];
    const estados = ['META', 'AVANZANDO', 'EN PROCESO', 'EN SEGUIMIENTO', 'EVALUACIÓN'];
    html += '<div class="card" style="margin-top:12px"><div style="display:flex;align-items:center;gap:8px"><b>Gestión PM — cierre de semana</b><button class="ibtn" style="margin-left:auto" onclick="inGpmAdd()">＋ Frente</button></div>';
    if (!gpm.length) html += '<div class="meta" style="margin-top:8px">Agregá los frentes de trabajo con su estado (aparecen numerados en el informe).</div>';
    gpm.forEach((g, i) => {
      html += '<div style="display:flex;gap:6px;margin-top:8px;align-items:center">'
        + '<input class="ibtn" style="flex:1" value="' + OS_E(g.texto || '') + '" onchange="inGpmSet(' + i + ',\'texto\',this.value)" placeholder="Frente de trabajo…">'
        + '<select class="ibtn" onchange="inGpmSet(' + i + ',\'estado\',this.value)">' + estados.map(s => '<option' + (g.estado === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select>'
        + '<button class="ibtn" onclick="inGpmDel(' + i + ')" title="Quitar">✕</button></div>';
    });
    html += '</div>';
    html += ta('notas_unidades', 'Notas — unidades a gestionar (disponibles / mantenimiento)', e.notas_unidades);
    // Próximas actividades
    const pa = e.proximas_actividades || [];
    html += '<div class="card" style="margin-top:10px"><div style="display:flex;align-items:center;gap:8px"><b>Próximas actividades (checklist)</b><button class="ibtn" style="margin-left:auto" onclick="inPaAdd()">＋ Actividad</button></div>';
    if (!pa.length) html += '<div class="meta" style="margin-top:8px">Sin actividades cargadas.</div>';
    pa.forEach((x, i) => {
      html += '<div style="display:flex;gap:6px;margin-top:8px;align-items:center">'
        + '<input class="ibtn" style="flex:1" value="' + OS_E(x || '') + '" onchange="inPaSet(' + i + ',this.value)" placeholder="Actividad…">'
        + '<button class="ibtn" onclick="inPaDel(' + i + ')" title="Quitar">✕</button></div>';
    });
    html += '</div>';
    html += ta('punto_mejora', 'Punto de mejora', e.punto_mejora);
  }
  if (esCartera) {
    html += ta('notas_casos', 'Notas de casos (caja azul del informe — ej. posible duplicado de inquilino, acuerdos)', e.notas_casos);
    // alertas / deltas que el informe reportará
    const dis = p.discrepancias || [];
    if (dis.length) {
      html += '<div class="card" style="margin-top:10px"><div class="lab">Alertas que el informe reportará (auto)</div>'
        + dis.map(x => '<div class="meta" style="margin-top:6px">• <b>' + OS_E(x.label) + '</b>: ' + OS_E(x.detalle) + '</div>').join('') + '</div>';
    }
  }
  html += '<div class="meta" style="margin-top:14px">Al emitir, el informe queda marcado ✓ Emitido en la bandeja y se abre la ventana de impresión/PDF (Guardar como PDF del navegador). Los datos congelados no cambian aunque la cartera viva se mueva después.</div>';
  return html;
}
