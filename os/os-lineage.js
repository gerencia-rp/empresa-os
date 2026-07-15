// ════════════════════════════════════════════════════════════════
// 🗺️ MAPA DE CONEXIONES (linaje de datos) — pedido CEO 14-jul.
// Vista /mapa del OS: árbol Empresa → Sistema → cada número, con su origen exacto
// (base · tabla · columna), en dos modos: 📋 LISTA (detalle fino, buscador, semáforo
// editable, reasignar fuente) y 🕸 DIAGRAMA de nodos estilo n8n (orígenes a la
// izquierda, números de la pantalla a la derecha, líneas de color por base, clic
// para aislar, panel de detalle). Todo vive en data_lineage_map (RLS + audit por
// trigger) — el equipo lo edita desde acá y queda logueado quién/cuándo.
// El linaje vista→tabla·columna viene GENERADO de information_schema
// (os/os-lineage-views.js, regenerable con scripts/lineage-gen.mjs).
// ⓘ osLineageInfo(empresa, sistema, dato) se usa desde cualquier pantalla.
// ════════════════════════════════════════════════════════════════
/* global sb, OS, osRender, osNav, OS_E, LINEAGE_VIEWS */

const LM = { rows: null, loading: false, err: null, emp: null, sys: null, q: '', qn: '', mode: 'lista', focus: null, edit: null, sel: null, cov: null };
window.LM = LM;

const LM_COLORS = { 'Fix & Flip': '#ef6c47', 'Rentas': '#3aa0ff', 'Remodelación': '#37c98b', 'Contable / QBO': '#c084fc', 'Supabase (vista)': '#8a93ad' };
const LM_PILL = { ok: 'OK', warn: 'REVISAR', bug: 'BUG', pend: 'PENDIENTE' };
const LM_E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lmColor = b => LM_COLORS[b] || '#8a93ad';

async function lmLoad(force) {
  if (LM.loading || (LM.rows && !force)) return;
  LM.loading = true; LM.err = null;
  try {
    const { data, error } = await sb.from('data_lineage_map').select('*').eq('active', true)
      .order('empresa').order('sistema').order('orden').order('dato').limit(2000);
    if (error) throw error;
    LM.rows = data || [];
    LM.cov = await sb.from('lineage_coverage_runs').select('*').order('run_at', { ascending: false }).limit(1).maybeSingle().then(r => r.data).catch(() => null);
  } catch (e) { LM.err = e.message || String(e); }
  LM.loading = false;
  osRender();
}
window.lmLoad = lmLoad;

function lmTreeData() {
  const t = {};
  (LM.rows || []).forEach(r => { ((t[r.empresa] = t[r.empresa] || {})[r.sistema] = t[r.empresa][r.sistema] || []).push(r); });
  return t;
}
function lmRowsSel() {
  let rows = (LM.rows || []).filter(r => (!LM.emp || r.empresa === LM.emp) && (!LM.sys || r.sistema === LM.sys));
  const q = LM.q.trim().toLowerCase();
  if (q) rows = rows.filter(r => (r.dato + ' ' + r.tabla + ' ' + r.columna + ' ' + (r.nota || '') + ' ' + (r.formula || '')).toLowerCase().includes(q));
  return rows;
}

// ─── acciones (persisten en data_lineage_map; el trigger loguea quién/cuándo) ───
async function lmSetEstado(id, estado) {
  const { error } = await sb.from('data_lineage_map').update({ estado }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  const r = (LM.rows || []).find(x => x.id === id); if (r) r.estado = estado;
  osRender();
}
window.lmSetEstado = lmSetEstado;
function lmEdit(id) { LM.edit = id; LM.focus = null; osRender(); }
window.lmEdit = lmEdit;
async function lmSaveEdit(id) {
  const g = k => { const el = document.getElementById('lm-e-' + k); return el ? el.value.trim() : ''; };
  const r = (LM.rows || []).find(x => x.id === id); if (!r) return;
  const upd = { base: g('base'), tabla: g('tabla'), columna: g('columna'), formula: g('formula') || null, nota: g('nota') || null };
  // GOBERNANZA: reasignar la fuente de una cifra CONTABLE exige reconciliar con QBO antes de
  // activarse → queda en 'pend' hasta que un humano la valide (el cambio igual queda auditado).
  const cambioFuente = upd.base !== r.base || upd.tabla !== r.tabla || upd.columna !== r.columna;
  if (cambioFuente && (r.empresa === 'Contable / QBO' || upd.base === 'Contable / QBO')) {
    upd.estado = 'pend';
    upd.nota = ((upd.nota || '') + ' · fuente reasignada: pendiente de reconciliación QBO').trim();
  }
  const { error } = await sb.from('data_lineage_map').update(upd).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  Object.assign(r, upd);
  LM.edit = null;
  if (window.toast) toast('✓ Fuente actualizada (queda en el audit)', 'success');
  osRender();
}
window.lmSaveEdit = lmSaveEdit;
async function lmArchive(id) {
  if (!confirm('¿Quitar este dato del mapa? (soft-delete, reversible por admin)')) return;
  const { error } = await sb.from('data_lineage_map').update({ active: false, archived_at: new Date().toISOString() }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  LM.rows = LM.rows.filter(x => x.id !== id);
  osRender();
}
window.lmArchive = lmArchive;
async function lmAdd() {
  if (!LM.emp || !LM.sys) return alert('Elegí primero una empresa y un sistema en el árbol');
  const dato = prompt('Nombre del número/dato nuevo (como lo ve el equipo):');
  if (!dato) return;
  const row = { empresa: LM.emp, sistema: LM.sys, grupo: 'Nuevos', dato, base: LM.emp === 'Contable / QBO' ? 'Contable / QBO' : LM.emp, tabla: '—', columna: '—', estado: 'pend', nota: 'creado desde el mapa — definir fuente (gobernado: queda pendiente hasta validar)' };
  const { data, error } = await sb.from('data_lineage_map').insert(row).select().single();
  if (error) return alert('Error: ' + error.message);
  LM.rows.push(data); LM.edit = data.id;
  osRender();
}
window.lmAdd = lmAdd;
function lmSetQ(v) { LM.q = v; osRender(); const el = document.getElementById('lm-q'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
window.lmSetQ = lmSetQ;
function lmGo(emp, sys) { LM.emp = emp || null; LM.sys = sys || null; LM.focus = null; LM.edit = null; LM.sel = null; osRender(); }
window.lmGo = lmGo;
// seleccionar un NÚMERO → vista de flujo "viene → número → alimenta"
function lmSel(mk) {
  const r = (LM.rows || []).find(x => x.metric_key === mk);
  if (!r) return;
  LM.sel = mk; LM.emp = r.empresa; LM.sys = r.sistema; LM.focus = null; LM.edit = null;
  osRender();
  const main = document.querySelector('.lm-wrap > div:last-child'); if (main) main.scrollIntoView({ block: 'start' });
}
window.lmSel = lmSel;
function lmSetQn(v) { LM.qn = v; osRender(); const el = document.getElementById('lm-qn'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
window.lmSetQn = lmSetQn;
// empresas colapsables del árbol (persistido): cerradas por default salvo la activa
function lmOpenMap() { try { return JSON.parse(localStorage.getItem('lm_emp_open') || '{}'); } catch (e) { return {}; } }
function lmEmpOpen(emp) { const m = lmOpenMap(); return m[emp] != null ? !!m[emp] : (LM.emp === emp); }
function lmToggleEmp(emp) { const m = lmOpenMap(); m[emp] = !lmEmpOpen(emp); try { localStorage.setItem('lm_emp_open', JSON.stringify(m)); } catch (e) {} osRender(); }
window.lmToggleEmp = lmToggleEmp;
// tabla Airtable/QBO → tabla espejo pg (para cruzar con la metadata de las vistas)
const LM_MIRROR = { 'propiedades': ['ff_deals'], 'desglose draws': ['ff_draws'], 'datos por casa': ['ff_hml_loans', 'ff_hml_payments'],
  'casas': ['pm_properties'], 'pagos': ['pm_payments'], 'gastos x casa': ['pm_expenses'], 'inquilinos': ['pm_tenants'], 'unidades': ['pm_units'],
  'reservas': ['pm_bookings'], 'accesos': ['pm_credentials'], 'propiedad en reparación': ['remodel_at_properties'], 'quickbooks': ['qb_report_cache'] };
function lmMirrorOf(tabla) {
  const t = String(tabla || '').toLowerCase().replace(/[^a-zñáéíóú ]/g, '').trim();
  for (const k of Object.keys(LM_MIRROR)) if (t.includes(k)) return LM_MIRROR[k];
  const m = String(tabla || '').match(/\(espejo ([a-z_]+)\)/); if (m) return [m[1]];
  return [];
}
// downstream AUTOMÁTICO (grafo inverso): feeds explícitos + mismo origen tabla·columna + vistas que consumen la tabla
function lmDownstream(r) {
  const out = []; const seen = new Set([r.metric_key]);
  const add = (row, w) => { if (row && !seen.has(row.metric_key)) { seen.add(row.metric_key); out.push({ row, w }); } };
  (r.feeds || []).forEach(mk => add((LM.rows || []).find(x => x.metric_key === mk), 'cadena'));
  const mirrors = lmMirrorOf(r.tabla);
  (LM.rows || []).forEach(x => {
    if (x.tabla === r.tabla && x.columna === r.columna && x.metric_key !== r.metric_key) add(x, 'mismo origen');
    else if (mirrors.length && x.vista && typeof LINEAGE_VIEWS !== 'undefined' && LINEAGE_VIEWS[x.vista]
      && LINEAGE_VIEWS[x.vista].some(d => mirrors.includes(d.t))) add(x, 'vía ' + x.vista);
  });
  return out;
}
// upstream inverso: qué números declaran alimentar a ESTE (feeds que lo contienen)
function lmUpstreamOf(r) {
  return (LM.rows || []).filter(x => (x.feeds || []).includes(r.metric_key));
}
function lmMode(m) { LM.mode = m; LM.focus = null; osRender(); }
window.lmMode = lmMode;
function lmFocus(id) { LM.focus = LM.focus === id ? null : id; osRender(); }
window.lmFocus = lmFocus;

// ─── export (el mapa es la fuente de verdad del linaje — compartible y versionable) ───
function lmExportRows(todo) {
  const rows = todo ? (LM.rows || []) : lmRowsSel();
  return rows.map(r => ({ empresa: r.empresa, pantalla: r.sistema, dato: r.dato, base: r.base, tabla: r.tabla, columna: r.columna, formula: r.formula || '', nota: r.nota || '', estado: r.estado }));
}
function lmDownload(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
}
function lmJSON(todo) { lmDownload('mapa_conexiones' + (todo ? '_completo' : '') + '.json', JSON.stringify(lmExportRows(todo), null, 2), 'application/json'); }
window.lmJSON = lmJSON;
function lmCSV(todo) {
  const rows = lmExportRows(todo);
  const head = ['empresa', 'pantalla', 'dato', 'base', 'tabla', 'columna', 'formula', 'nota', 'estado'];
  const csv = [head.join(',')].concat(rows.map(r => head.map(h => '"' + String(r[h] || '').replace(/"/g, '""') + '"').join(','))).join('\n');
  lmDownload('mapa_conexiones' + (todo ? '_completo' : '') + '.csv', csv, 'text/csv');
}
window.lmCSV = lmCSV;

// ─── "la vista lee de…" (metadata generada — information_schema) ───
function lmViewChain(tabla) {
  if (typeof LINEAGE_VIEWS === 'undefined') return null;
  const vn = Object.keys(LINEAGE_VIEWS).find(v => String(tabla || '').includes(v));
  return vn ? { view: vn, deps: LINEAGE_VIEWS[vn] } : null;
}

// ─── CSS scoped ───
function lmCSS() {
  if (document.getElementById('lm-css')) return;
  const st = document.createElement('style'); st.id = 'lm-css';
  st.textContent = ''
    + '#os-root .lm-wrap{display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start}'
    + '#os-root .lm-tree .emp-h{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;cursor:pointer;font-weight:700;font-size:13px}'
    + '#os-root .lm-tree .emp-h:hover{background:var(--glass)}'
    + '#os-root .lm-tree .bdot{width:10px;height:10px;border-radius:3px;flex:none}'
    + '#os-root .lm-tree .cnt{margin-left:auto;font-size:10.5px;color:var(--mut2);font-weight:500}'
    + '#os-root .lm-tree ul{list-style:none;margin:2px 0 8px;padding:0 0 0 24px}'
    + '#os-root .lm-tree li{padding:6px 10px;border-radius:7px;cursor:pointer;font-size:12px;color:var(--mut);display:flex;align-items:center;gap:6px}'
    + '#os-root .lm-tree li:hover{background:var(--glass);color:var(--ink)}'
    + '#os-root .lm-tree li.on{background:var(--glass);color:var(--ink);font-weight:600;border:1px solid var(--glassb)}'
    + '#os-root .lm-tree li .n{margin-left:auto;font-size:10px;color:var(--mut2)}'
    + '#os-root .lm-pill{font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap}'
    + '#os-root .lm-pill.ok{background:rgba(55,201,139,.15);color:var(--pos)}'
    + '#os-root .lm-pill.warn{background:rgba(245,178,61,.15);color:var(--amber)}'
    + '#os-root .lm-pill.bug{background:rgba(255,92,108,.18);color:var(--neg)}'
    + '#os-root .lm-pill.pend{background:rgba(120,130,160,.18);color:var(--mut2)}'
    + '#os-root .lm-btag{display:inline-block;font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:6px;white-space:nowrap}'
    + '#os-root .lm-key{padding:9px 13px;background:rgba(201,162,39,.10);border:1px solid rgba(201,162,39,.35);border-radius:9px;font-size:12px;color:var(--amber);margin:10px 0}'
    + '#os-root .lm-table{width:100%;border-collapse:collapse;font-size:12px}'
    + '#os-root .lm-table th{text-align:left;font-size:9.5px;letter-spacing:.5px;text-transform:uppercase;color:var(--mut2);padding:8px 9px;border-bottom:1px solid var(--glassb)}'
    + '#os-root .lm-table td{padding:8px 9px;border-bottom:1px solid var(--glassb);vertical-align:top}'
    + '#os-root .lm-table tr.bug{background:rgba(255,92,108,.06)}'
    + '#os-root .lm-mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:var(--mut)}'
    + '#os-root .lm-act{cursor:pointer;padding:2px 6px;border-radius:6px;color:var(--mut2);font-size:12px}'
    + '#os-root .lm-act:hover{color:var(--ink);background:var(--glass)}'
    + '#os-root .lm-sel{background:var(--glass);color:var(--ink);border:1px solid var(--glassb);border-radius:7px;padding:4px 6px;font-size:11px;max-width:170px}'
    + '#os-root .lm-in{background:var(--glass);color:var(--ink);border:1px solid var(--glassb);border-radius:7px;padding:6px 9px;font-size:12px;width:100%}'
    + '#os-root .lm-stage{position:relative;overflow:auto;border:1px solid var(--glassb);border-radius:12px;padding:14px;background:var(--glass)}'
    + '#os-root .lm-cols{display:grid;grid-template-columns:1fr 80px 1.1fr;position:relative;min-width:900px;align-items:start}'
    + '#os-root .lm-svg{position:absolute;inset:0;pointer-events:none;z-index:1}'
    + '#os-root .lm-cl,#os-root .lm-cr{position:relative;z-index:2;display:flex;flex-direction:column;gap:12px}'
    + '#os-root .lm-base{background:var(--glass);border:1px solid var(--glassb);border-radius:11px;overflow:hidden}'
    + '#os-root .lm-base-h{padding:8px 11px;font-weight:700;font-size:12.5px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--glassb)}'
    + '#os-root .lm-tbl{margin:8px;background:var(--glass);border:1px solid var(--glassb);border-radius:8px}'
    + '#os-root .lm-tbl-h{padding:6px 10px;font-size:11px;font-weight:600;color:var(--mut);border-bottom:1px solid var(--glassb)}'
    + '#os-root .lm-colrow{padding:5px 10px;font-size:11px;font-family:ui-monospace,Menlo,monospace;color:var(--mut);display:flex;align-items:center;gap:7px;cursor:pointer}'
    + '#os-root .lm-colrow:hover{background:var(--glass)}'
    + '#os-root .lm-anchor{width:7px;height:7px;border-radius:50%;flex:none}'
    + '#os-root .lm-field{padding:8px 12px;font-size:12.5px;display:flex;align-items:center;gap:8px;cursor:pointer;border-top:1px solid var(--glassb)}'
    + '#os-root .lm-field:hover{background:var(--glass)}'
    + '#os-root .lm-field .fn{flex:1;font-weight:600}'
    + '#os-root .lm-field .fs{font-size:9.5px;color:var(--mut2);font-family:ui-monospace,Menlo,monospace;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '#os-root .lm-dim{opacity:.22}'
    + '#os-root .lm-hl{box-shadow:0 0 0 2px var(--a2) inset;opacity:1!important}'
    + '#os-root .lm-detail{position:sticky;bottom:8px;margin-top:12px;background:var(--bg,#0f1220);border:1px solid var(--a2);border-radius:12px;padding:14px 16px;box-shadow:0 12px 40px rgba(0,0,0,.35)}'
    + '#os-root .lm-grp{padding:6px 12px;font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--mut2);border-top:1px solid var(--glassb);background:var(--glass)}'
    + '#os-root .lm-syslabel{padding:6px 10px 3px 24px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:var(--mut2);cursor:pointer;border-radius:6px}'
    + '#os-root .lm-syslabel:hover{color:var(--ink)}'
    + '#os-root .lm-syslabel.on{color:var(--a2);font-weight:700}'
    + '#os-root .lm-num{padding:5px 10px 5px 26px;font-size:12px;color:var(--mut);cursor:pointer;border-radius:7px;display:flex;align-items:center;gap:7px}'
    + '#os-root .lm-num:hover{background:var(--glass);color:var(--ink)}'
    + '#os-root .lm-num.on{background:var(--glass);color:var(--ink);font-weight:600;border:1px solid var(--glassb)}'
    + '#os-root .lm-sd{width:7px;height:7px;border-radius:50%;flex:none}'
    + '#os-root .lm-flow{display:flex;align-items:stretch;gap:0;flex-wrap:wrap}'
    + '#os-root .lm-node{border:1px solid var(--glassb);border-radius:11px;padding:11px 14px;background:var(--glass);min-width:130px}'
    + '#os-root .lm-node .lab{margin-bottom:5px}'
    + '#os-root .lm-node .val{font-size:13.5px;font-weight:600}'
    + '#os-root .lm-node.number{background:linear-gradient(180deg,rgba(201,162,39,.16),rgba(201,162,39,.05));border-color:rgba(201,162,39,.5)}'
    + '#os-root .lm-arrow{display:flex;align-items:center;justify-content:center;color:var(--mut2);font-size:20px;padding:0 9px}'
    + '#os-root .lm-formula{background:var(--glass);border:1px solid var(--glassb);border-radius:9px;padding:10px 14px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:var(--mut);line-height:1.6;margin-top:12px}'
    + '#os-root .lm-feeds{display:flex;gap:10px;flex-wrap:wrap}'
    + '#os-root .lm-feed{border:1px solid var(--glassb);border-radius:9px;padding:9px 13px;background:var(--glass);font-size:12.5px;cursor:pointer;font-weight:600}'
    + '#os-root .lm-feed:hover{border-color:var(--a2)}'
    + '#os-root .lm-feed .w{display:block;font-size:10.5px;color:var(--mut2);margin-top:2px;font-weight:500}'
    + '@media(max-width:820px){#os-root .lm-arrow{transform:rotate(90deg);width:100%;padding:4px 0}}'
    + '@media(max-width:900px){#os-root .lm-wrap{grid-template-columns:1fr}}';
  document.head.appendChild(st);
}

// ─── vista principal ───
function osLineageView() {
  lmCSS();
  if (!LM.rows && !LM.err) { lmLoad(); return '<div class="empty">⏳ Cargando el mapa de conexiones…</div>'; }
  if (LM.err) return '<div class="empty down">' + LM_E(LM.err) + ' <button class="cbtn" onclick="lmLoad(true)">Reintentar</button></div>';
  const tree = lmTreeData();
  const qn = (LM.qn || '').trim().toLowerCase();
  const stDot = s => '<span class="lm-sd" style="background:' + (s === 'ok' ? 'var(--pos)' : s === 'warn' ? 'var(--amber)' : s === 'bug' ? 'var(--neg)' : 'var(--mut2)') + '"></span>';
  const treeHtml = '<div class="card lm-tree" style="padding:12px">'
    + '<div style="font-weight:800;font-size:14px;margin:2px 6px 2px">🔎 Conexiones al detalle</div>'
    + '<div class="meta" style="margin:0 6px 8px">Elegí un número → ves de dónde viene y qué alimenta.</div>'
    + '<input id="lm-qn" class="lm-in" style="margin:0 4px 10px;width:calc(100% - 8px)" placeholder="Buscar número…" value="' + LM_E(LM.qn) + '" oninput="lmSetQn(this.value)">'
    + Object.keys(tree).map(emp => {
      const sist = tree[emp];
      const items = Object.keys(sist).map(sys => ({ sys, rows: sist[sys].filter(r => !qn || (r.dato + ' ' + r.tabla + ' ' + r.columna).toLowerCase().includes(qn)) })).filter(x => x.rows.length);
      if (!items.length) return '';
      const tot = Object.values(sist).reduce((s, a) => s + a.length, 0);
      const sinF = Object.values(sist).flat().filter(r => r.origen === 'crawler' && r.estado === 'pend').length;
      // empresa COLAPSABLE (pedido CEO): cerrada por default salvo la activa o si hay búsqueda
      const open = qn ? true : lmEmpOpen(emp);
      return '<div><div class="emp-h" onclick="lmToggleEmp(\'' + LM_E(emp) + '\')"><span style="width:12px;color:var(--mut2);font-size:10px">' + (open ? '▾' : '▸') + '</span><span class="bdot" style="background:' + lmColor(emp) + '"></span>' + LM_E(emp) + '<span class="cnt">' + (tot - sinF) + '/' + tot + ' con fuente</span></div>'
        + (open ? items.map(({ sys, rows }) => {
          const on = LM.emp === emp && LM.sys === sys && !LM.sel;
          return '<div class="lm-syslabel' + (on ? ' on' : '') + '" onclick="lmGo(\'' + LM_E(emp) + '\',\'' + LM_E(sys).replace(/'/g, "\\'") + '\')" title="abrir el sistema (lista + diagrama)">' + LM_E(sys) + ' <span style="float:right">' + rows.length + '</span></div>'
            + rows.map(r => '<div class="lm-num' + (LM.sel === r.metric_key ? ' on' : '') + '" onclick="lmSel(\'' + LM_E(r.metric_key) + '\')">' + stDot(r.estado) + LM_E(r.dato) + '</div>').join('');
        }).join('') : '') + '</div>';
    }).join('')
    + '<div class="meta" style="margin:8px 6px 2px;font-size:10.5px">Clic en el SISTEMA = lista/diagrama completo · clic en un NÚMERO = su flujo. El linaje de vistas se regenera solo (scripts/lineage-gen.mjs); toda edición queda en el audit.</div>'
    + '</div>';

  let main;
  const selRow = LM.sel ? (LM.rows || []).find(x => x.metric_key === LM.sel) : null;
  if (selRow) {
    main = lmFlujo(selRow);
  } else if (!LM.sys) {
    const rows = lmRowsSel();
    const bugs = (LM.rows || []).filter(x => x.estado === 'bug'), warns = (LM.rows || []).filter(x => x.estado === 'warn');
    main = '<div class="card">'
      + '<h1 style="font-size:19px">🗺️ Mapa de Conexiones <span>· de dónde sale cada número</span></h1>'
      + '<div class="sub">' + (LM.rows || []).length + ' números trazados en ' + Object.keys(tree).length + ' empresas · <b style="color:var(--pos)">' + ((LM.rows || []).length - bugs.length - warns.length) + ' OK</b> · <b style="color:var(--amber)">' + warns.length + ' a revisar</b> · <b style="color:var(--neg)">' + bugs.length + ' bug</b></div>'
      + '<div class="lm-key">🔑 <b>La llave que une las bases:</b> la casa (<b>property_id</b> ↔ Dirección). La misma casa vive en Fix & Flip, Rentas y Remodelación — si la dirección está escrita distinto, el property_id la cruza igual (por eso la Ficha se arregló resolviendo por property_id).</div>'
      + (() => {
        const sinF = (LM.rows || []).filter(r => r.origen === 'crawler' && r.estado === 'pend').length;
        const tot = (LM.rows || []).length;
        const cov = LM.cov;
        return '<div class="kv" style="margin-top:10px"><span>📈 <b>Cobertura de linaje</b> (gate de CI: ningún número visible sin registro)</span><b>'
          + (cov ? (cov.sin_linaje === 0 ? '<span style="color:var(--pos)">✓ ' + cov.con_linaje + '/' + cov.numeros_vistos + ' números vistos con registro</span>' : '<span style="color:var(--neg)">' + cov.sin_linaje + ' sin registro de ' + cov.numeros_vistos + '</span>') + ' <span class="meta">(' + String(cov.run_at || '').slice(0, 10) + ' · ' + cov.pantallas + ' pantallas)</span>' : '<span class="meta">sin corrida del crawler todavía (npm run gate:lineage)</span>')
          + '</b></div>'
          + '<div class="kv"><span>Fuente exacta definida</span><b>' + (tot - sinF) + '/' + tot + ' registrados' + (sinF ? ' · <span style="color:var(--amber)">' + sinF + ' descubiertos por el crawler esperando curación</span>' : ' <span style="color:var(--pos)">✓</span>') + '</b></div>';
      })()
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="ibtn" onclick="lmJSON(true)">⬇ JSON completo</button><button class="ibtn" onclick="lmCSV(true)">⬇ CSV completo</button></div>'
      + ((warns.length || bugs.length) ? '<div class="lab" style="margin-top:16px">⚠ Casos marcados (dual-source / cálculo sobre vacío / a revisar)</div>'
        + bugs.concat(warns).slice(0, 12).map(r => '<div class="kv" style="cursor:pointer" onclick="lmGo(\'' + LM_E(r.empresa) + '\',\'' + LM_E(r.sistema).replace(/'/g, "\\'") + '\')"><span><span class="lm-pill ' + r.estado + '">' + LM_PILL[r.estado] + '</span> ' + LM_E(r.empresa) + ' › ' + LM_E(r.sistema) + ' › <b>' + LM_E(r.dato) + '</b></span><b class="meta" style="max-width:45%;text-align:right;font-weight:500">' + LM_E(r.nota || r.formula || '') + '</b></div>').join('') : '')
      + '<div class="empty" style="padding:22px">Elegí un sistema en el árbol para ver sus números, editarlos o abrir el diagrama.</div>'
      + '</div>';
  } else {
    const rows = lmRowsSel();
    const all = (tree[LM.emp] || {})[LM.sys] || [];
    const bugs = all.filter(x => x.estado === 'bug').length, warns = all.filter(x => x.estado === 'warn').length;
    const head = '<div class="card" style="margin-bottom:12px">'
      + '<div class="meta">' + LM_E(LM.emp) + ' ›</div>'
      + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h1 style="font-size:19px;margin:0">' + LM_E(LM.sys) + '</h1>'
      + '<span class="meta">' + all.length + ' números · <b style="color:var(--pos)">' + (all.length - bugs - warns) + ' OK</b> · <b style="color:var(--amber)">' + warns + ' revisar</b> · <b style="color:var(--neg)">' + bugs + ' bug</b></span>'
      + '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">'
      + '<button class="ibtn" style="' + (LM.mode === 'lista' ? 'border-color:var(--a2);color:var(--ink)' : '') + '" onclick="lmMode(\'lista\')">📋 Lista</button>'
      + '<button class="ibtn" style="' + (LM.mode === 'diagrama' ? 'border-color:var(--a2);color:var(--ink)' : '') + '" onclick="lmMode(\'diagrama\')">🕸 Diagrama</button>'
      + '<button class="ibtn" onclick="lmAdd()">＋ Agregar dato</button>'
      + '<button class="ibtn" onclick="lmJSON(false)">⬇ JSON</button><button class="ibtn" onclick="lmCSV(false)">⬇ CSV</button></span></div>'
      + '<input id="lm-q" class="lm-in" style="max-width:340px;margin-top:10px" placeholder="🔍 Buscar número, tabla o columna…" value="' + LM_E(LM.q) + '" oninput="lmSetQ(this.value)">'
      + '</div>';
    main = head + (LM.mode === 'diagrama' ? lmDiagrama(rows) : lmLista(rows));
  }
  setTimeout(lmDrawLines, 60);
  return '<div class="lm-wrap">' + treeHtml + '<div>' + main + '</div></div>';
}
window.osLineageView = osLineageView;

// ─── FLUJO por número: ① de dónde viene → [número] → ② qué alimenta (réplica del HTML "conexiones-al-detalle") ───
function lmFlujo(r) {
  const node = (lab, val, mono, cls) => '<div class="lm-node' + (cls ? ' ' + cls : '') + '"><div class="lab">' + lab + '</div><div class="val' + (mono ? ' lm-mono' : '') + '">' + val + '</div></div>';
  const arrow = '<div class="lm-arrow">→</div>';
  const chain = [];
  chain.push(node('Base', '<span style="color:' + lmColor(r.base) + '">' + LM_E(r.base) + '</span>'));
  chain.push(node('Tabla', LM_E(r.tabla), 1));
  chain.push(node('Columna', LM_E(r.columna), 1));
  if (r.vista) chain.push(node('Vista (Supabase)', LM_E(r.vista), 1));
  if (r.formula) chain.push(node('Fórmula', 'ƒ', 0));
  const flow = chain.join(arrow) + arrow + '<div class="lm-node number"><div class="lab" style="color:#c9a227">Número en la app</div><div class="val" style="font-size:15px">' + LM_E(r.dato) + '</div><div class="meta" style="font-size:10px">' + LM_E(r.sistema) + '</div></div>';
  const vc = lmViewChain(r.vista || r.tabla);
  const upInv = lmUpstreamOf(r);
  const feeds = lmDownstream(r);
  const feedCard = f => '<div class="lm-feed" onclick="lmSel(\'' + LM_E(f.row.metric_key) + '\')">' + LM_E(f.row.dato)
    + '<span class="w">en ' + LM_E(f.row.empresa) + ' · ' + LM_E(f.row.sistema) + (f.w !== 'cadena' ? ' <i style="opacity:.7">(' + LM_E(f.w) + ')</i>' : '') + '</span></div>';
  return '<div class="card">'
    + '<div class="meta">' + LM_E(r.empresa) + ' › ' + LM_E(r.sistema) + (r.grupo ? ' › ' + LM_E(r.grupo) : '') + '</div>'
    + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:2px 0 4px"><h1 style="font-size:21px;margin:0">' + LM_E(r.dato) + '</h1><span class="lm-pill ' + r.estado + '">' + LM_PILL[r.estado] + '</span>'
    + '<span style="margin-left:auto;display:flex;gap:6px"><button class="ibtn" onclick="LM.sel=null;LM.mode=\'lista\';lmEdit(\'' + r.id + '\')">✎ Cambiar fuente</button>'
    + '<button class="ibtn" onclick="LM.sel=null;LM.mode=\'diagrama\';lmFocus(\'' + r.id + '\')">🕸 Ver en el diagrama</button></span></div>'
    + '<div class="meta" style="margin-bottom:16px">De dónde viene y qué alimenta.</div>'
    + '<div class="lab" style="margin-bottom:10px">① De dónde viene (Airtable/QBO → app)</div>'
    + '<div class="lm-flow">' + flow + '</div>'
    + (r.formula ? '<div class="lm-formula">ƒ &nbsp; ' + LM_E(r.formula) + '</div>' : '')
    + (r.nota ? '<div style="color:var(--amber);font-size:12.5px;margin-top:8px">⚠ ' + LM_E(r.nota) + '</div>' : '')
    + (vc ? '<div class="meta" style="margin-top:8px">🧬 La vista <b>' + LM_E(vc.view) + '</b> lee de: ' + vc.deps.map(d => '<span class="lm-mono">' + LM_E(d.t) + '</span> (' + d.c.length + ' col)').join(' · ') + ' <span style="opacity:.7">(metadata generada de Postgres)</span></div>' : '')
    + (upInv.length ? '<div class="lab" style="margin-top:18px;margin-bottom:8px">⬅ Se alimenta también de</div><div class="lm-feeds">' + upInv.map(x => '<div class="lm-feed" onclick="lmSel(\'' + LM_E(x.metric_key) + '\')">' + LM_E(x.dato) + '<span class="w">en ' + LM_E(x.empresa) + ' · ' + LM_E(x.sistema) + '</span></div>').join('') + '</div>' : '')
    + '<div class="lab" style="margin-top:18px;margin-bottom:8px">② Qué alimenta (este número → otros)</div>'
    + '<div class="lm-feeds">' + (feeds.length ? feeds.map(feedCard).join('') : '<span class="meta">— dato final (no alimenta otros números registrados)</span>') + '</div>'
    + '<div class="lm-key" style="margin-top:20px">🔑 La misma casa se une entre bases por la <b>Dirección (property_id)</b>. Clic en una tarjeta de "alimenta" para saltar a ese número y seguir la cadena.</div>'
    + '<div class="meta" style="margin-top:8px;font-size:10.5px">Editado por ' + LM_E(r.editado_por || '—') + ' · ' + LM_E(String(r.updated_at || '').slice(0, 16).replace('T', ' ')) + ' · origen del registro: ' + LM_E(r.origen || 'curado') + '</div>'
    + '</div>';
}

// ─── modo LISTA ───
function lmLista(rows) {
  if (!rows.length) return '<div class="card"><div class="empty">Nada coincide.</div></div>';
  const btag = b => '<span class="lm-btag" style="background:' + lmColor(b) + '22;color:' + lmColor(b) + '">' + LM_E(b) + '</span>';
  const estadoSel = r => '<select class="lm-sel" onchange="lmSetEstado(\'' + r.id + '\', this.value)">' + ['ok', 'warn', 'bug', 'pend'].map(s => '<option value="' + s + '"' + (r.estado === s ? ' selected' : '') + '>' + LM_PILL[s] + '</option>').join('') + '</select>';
  return '<div class="card overx"><table class="lm-table"><thead><tr><th>Número en la app</th><th>Base</th><th>Tabla</th><th>Columna</th><th>Fórmula</th><th>Estado</th><th></th></tr></thead><tbody>'
    + rows.map(r => {
      const vc = lmViewChain(r.tabla);
      if (LM.edit === r.id) {
        return '<tr class="' + r.estado + '"><td colspan="7" style="background:var(--glass)">'
          + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">'
          + '<div><div class="lab">Base</div><select id="lm-e-base" class="lm-in">' + Object.keys(LM_COLORS).map(b => '<option' + (r.base === b ? ' selected' : '') + '>' + b + '</option>').join('') + '</select></div>'
          + '<div><div class="lab">Tabla / vista</div><input id="lm-e-tabla" class="lm-in" value="' + LM_E(r.tabla) + '"></div>'
          + '<div><div class="lab">Columna / campo</div><input id="lm-e-columna" class="lm-in" value="' + LM_E(r.columna) + '"></div>'
          + '<div style="grid-column:span 2"><div class="lab">Fórmula (si es derivado)</div><input id="lm-e-formula" class="lm-in" value="' + LM_E(r.formula || '') + '"></div>'
          + '<div><div class="lab">Nota</div><input id="lm-e-nota" class="lm-in" value="' + LM_E(r.nota || '') + '"></div>'
          + '</div><div style="display:flex;gap:8px"><button class="cbtn" style="padding:7px 14px" onclick="lmSaveEdit(\'' + r.id + '\')">💾 Guardar (queda auditado)</button><button class="ibtn" onclick="LM.edit=null;osRender()">Cancelar</button>'
          + '<span class="meta" style="align-self:center">Reasignar la fuente de una cifra contable la deja PENDIENTE hasta reconciliar con QBO.</span></div>'
          + '</td></tr>';
      }
      return '<tr class="' + r.estado + '">'
        + '<td><b>' + LM_E(r.dato) + '</b>' + (r.nota ? '<div class="meta" style="font-size:10.5px;max-width:280px">' + LM_E(r.nota) + '</div>' : '') + '</td>'
        + '<td>' + btag(r.base) + '</td>'
        + '<td class="lm-mono">' + LM_E(r.tabla) + (vc ? '<div class="meta" style="font-size:9.5px">lee de: ' + vc.deps.map(d => LM_E(d.t)).join(', ') + '</div>' : '') + '</td>'
        + '<td class="lm-mono">' + LM_E(r.columna) + '</td>'
        + '<td class="lm-mono" style="max-width:220px">' + LM_E(r.formula || '—') + '</td>'
        + '<td>' + estadoSel(r) + '</td>'
        + '<td style="white-space:nowrap"><span class="lm-act" title="ver en el diagrama" onclick="LM.mode=\'diagrama\';lmFocus(\'' + r.id + '\')">🔗</span><span class="lm-act" title="cambiar fuente" onclick="lmEdit(\'' + r.id + '\')">✎</span><span class="lm-act" title="quitar" onclick="lmArchive(\'' + r.id + '\')">✕</span></td>'
        + '</tr>';
    }).join('')
    + '</tbody></table></div>';
}

// ─── modo DIAGRAMA (nodos + líneas SVG, réplica del artefacto de referencia) ───
function lmDiagrama(rows) {
  // orígenes: agrupar por base → tabla → columnas únicas
  const bases = {};
  rows.forEach(r => { ((bases[r.base] = bases[r.base] || {})[r.tabla] = bases[r.base][r.tabla] || new Set()).add(r.columna); });
  const colId = (b, t, c) => 'lmc-' + btoa(unescape(encodeURIComponent(b + '|' + t + '|' + c))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
  const left = Object.keys(bases).map(b => '<div class="lm-base"><div class="lm-base-h"><span class="lm-anchor" style="width:10px;height:10px;border-radius:3px;background:' + lmColor(b) + '"></span>' + LM_E(b) + '</div>'
    + Object.keys(bases[b]).map(t => '<div class="lm-tbl"><div class="lm-tbl-h">▦ ' + LM_E(t) + '</div>'
      + [...bases[b][t]].map(c => '<div class="lm-colrow" id="' + colId(b, t, c) + '" onclick="event.stopPropagation();lmFocusCol(\'' + LM_E(b).replace(/'/g, "\\'") + '\',\'' + LM_E(t).replace(/'/g, "\\'") + '\',\'' + LM_E(c).replace(/'/g, "\\'") + '\')"><span class="lm-anchor" style="background:' + lmColor(b) + '"></span>' + LM_E(c) + '</div>').join('')
      + '</div>').join('')
    + '</div>').join('');
  let lastG = '';
  const right = '<div class="lm-base"><div class="lm-base-h"><span class="lm-anchor" style="width:10px;height:10px;border-radius:3px;background:#c9a227"></span>' + LM_E(LM.sys) + ' <span class="meta" style="font-weight:400">· lo que ve el equipo</span></div>'
    + rows.map(r => {
      let g = '';
      if ((r.grupo || '') !== lastG) { lastG = r.grupo || ''; g = '<div class="lm-grp">' + LM_E(lastG || '—') + '</div>'; }
      return g + '<div class="lm-field" id="lmf-' + r.id + '" onclick="event.stopPropagation();lmFocus(\'' + r.id + '\')">'
        + '<span class="lm-anchor" style="background:' + lmColor(r.base) + '"></span>'
        + '<span class="fn">' + LM_E(r.dato) + '</span>'
        + '<span class="lm-pill ' + r.estado + '">' + LM_PILL[r.estado] + '</span>'
        + '<span class="fs">' + LM_E(r.tabla) + '</span></div>';
    }).join('')
    + '</div>';
  const f = rows.find(r => r.id === LM.focus);
  const vc = f ? lmViewChain(f.tabla) : null;
  const detail = f ? '<div class="lm-detail">'
    + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>' + LM_E(f.dato) + '</b><span style="display:flex;gap:6px"><button class="ibtn" onclick="LM.mode=\'lista\';lmEdit(\'' + f.id + '\')">✎ Cambiar fuente</button><button class="ibtn" onclick="lmFocus(\'' + f.id + '\')">✕</button></span></div>'
    + '<div class="kv"><span>Base</span><b><span class="lm-btag" style="background:' + lmColor(f.base) + '22;color:' + lmColor(f.base) + '">' + LM_E(f.base) + '</span></b></div>'
    + '<div class="kv"><span>Tabla</span><b class="lm-mono">' + LM_E(f.tabla) + '</b></div>'
    + '<div class="kv"><span>Columna</span><b class="lm-mono">' + LM_E(f.columna) + '</b></div>'
    + (f.formula ? '<div class="kv"><span>Fórmula</span><b class="lm-mono" style="max-width:60%;text-align:right">' + LM_E(f.formula) + '</b></div>' : '')
    + (f.nota ? '<div class="kv"><span>Nota</span><b style="max-width:60%;text-align:right;font-weight:500;font-size:11px">' + LM_E(f.nota) + '</b></div>' : '')
    + '<div class="kv"><span>Estado</span><b><span class="lm-pill ' + f.estado + '">' + LM_PILL[f.estado] + '</span></b></div>'
    + (vc ? '<div class="kv"><span>La vista <b>' + LM_E(vc.view) + '</b> lee de</span><b class="lm-mono" style="max-width:60%;text-align:right;font-size:10px">' + vc.deps.map(d => LM_E(d.t) + ' (' + d.c.length + ' col)').join(' · ') + '</b></div>' : '')
    + '</div>' : '';
  return '<div class="lm-stage" id="lm-stage" onclick="if(LM.focus){LM.focus=null;osRender()}">'
    + '<div class="lm-cols"><svg class="lm-svg" id="lm-svg"></svg>'
    + '<div class="lm-cl">' + left + '</div><div></div><div class="lm-cr">' + right + '</div>'
    + '</div></div>' + detail;
}
function lmFocusCol(b, t, c) {
  const rows = lmRowsSel().filter(r => r.base === b && r.tabla === t && r.columna === c);
  LM.focus = rows.length === 1 ? rows[0].id : (rows[0] ? rows[0].id : null);
  osRender();
}
window.lmFocusCol = lmFocusCol;
function lmDrawLines() {
  const svg = document.getElementById('lm-svg'); if (!svg) return;
  const cont = svg.parentElement, cb = cont.getBoundingClientRect();
  svg.innerHTML = '';
  svg.setAttribute('width', cont.scrollWidth); svg.setAttribute('height', cont.scrollHeight);
  const NS = 'http://www.w3.org/2000/svg';
  const rows = lmRowsSel();
  const colId = (b, t, c) => 'lmc-' + btoa(unescape(encodeURIComponent(b + '|' + t + '|' + c))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
  rows.forEach(r => {
    const src = document.getElementById(colId(r.base, r.tabla, r.columna));
    const dst = document.getElementById('lmf-' + r.id);
    if (!src || !dst) return;
    const s = src.getBoundingClientRect(), d = dst.getBoundingClientRect();
    const x1 = s.right - cb.left, y1 = s.top - cb.top + s.height / 2, x2 = d.left - cb.left, y2 = d.top - cb.top + d.height / 2, mx = (x1 + x2) / 2;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + mx + ' ' + y1 + ', ' + mx + ' ' + y2 + ', ' + x2 + ' ' + y2);
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', lmColor(r.base));
    const on = LM.focus === r.id;
    p.setAttribute('stroke-width', on ? '2.6' : '1.5');
    p.setAttribute('stroke-opacity', LM.focus ? (on ? '0.95' : '0.06') : '0.35');
    svg.appendChild(p);
    if (LM.focus) {
      dst.classList.toggle('lm-dim', !on); dst.classList.toggle('lm-hl', on);
      src.classList.toggle('lm-dim', !on && !src.classList.contains('lm-hl'));
      if (on) { src.classList.remove('lm-dim'); src.classList.add('lm-hl'); }
    }
  });
  const st = document.getElementById('lm-stage');
  if (st && !st._lmWired) { st._lmWired = true; st.addEventListener('scroll', lmDrawLines); }
}
window.lmDrawLines = lmDrawLines;
window.addEventListener('resize', () => { if (document.getElementById('lm-svg')) lmDrawLines(); });

// ─── ⓘ "de dónde sale" — usable desde cualquier pantalla del OS ───
async function osLineageInfo(empresa, sistema, dato) {
  if (!LM.rows) {
    const { data } = await sb.from('data_lineage_map').select('*').eq('active', true).limit(2000);
    LM.rows = data || [];
  }
  const r = (LM.rows || []).find(x => x.empresa === empresa && x.sistema === sistema && x.dato === dato);
  const old = document.getElementById('lm-info-ov'); if (old) old.remove();
  const ov = document.createElement('div');
  ov.id = 'lm-info-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,12,.55);display:grid;place-items:center;z-index:99999;padding:18px';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  const vc = r ? lmViewChain(r.tabla) : null;
  const kv = (k, v) => '<div style="display:flex;justify-content:space-between;gap:12px;font-size:12.5px;padding:6px 0;border-top:1px solid var(--glassb,#2a2f4a)"><span style="color:var(--mut,#9aa0b8)">' + k + '</span><b style="text-align:right;font-family:ui-monospace,Menlo,monospace;max-width:60%">' + v + '</b></div>';
  ov.innerHTML = '<div style="background:var(--bg,#0f1220);border:1px solid var(--glassb,#2a2f4a);border-radius:14px;padding:18px;max-width:480px;width:100%;color:var(--ink,#e8eaf2);box-shadow:0 18px 50px rgba(0,0,0,.45)">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px"><b style="font-size:14px">ⓘ ¿De dónde sale "' + LM_E(dato) + '"?</b><button class="ibtn" onclick="document.getElementById(\'lm-info-ov\').remove()">✕</button></div>'
    + (r
      ? kv('Base', '<span style="color:' + lmColor(r.base) + '">' + LM_E(r.base) + '</span>') + kv('Tabla', LM_E(r.tabla)) + kv('Columna', LM_E(r.columna))
        + (r.formula ? kv('Fórmula', LM_E(r.formula)) : '') + (r.nota ? kv('Nota', '<span style="font-weight:500;font-size:11px">' + LM_E(r.nota) + '</span>') : '')
        + kv('Estado', '<span class="lm-pill ' + r.estado + '">' + LM_PILL[r.estado] + '</span>')
        + (vc ? kv('La vista lee de', '<span style="font-size:10px">' + vc.deps.map(d => LM_E(d.t)).join(' · ') + '</span>') : '')
        + '<div style="margin-top:12px;display:flex;gap:8px"><button class="cbtn" style="padding:8px 14px" onclick="document.getElementById(\'lm-info-ov\').remove();osNav(\'/mapa\');LM.emp=\'' + LM_E(empresa) + '\';LM.sys=\'' + LM_E(sistema).replace(/'/g, "\\'") + '\';osRender()">🗺️ Abrir en el mapa (y reasignar fuente)</button></div>'
      : '<div style="padding:16px 0;color:var(--mut,#9aa0b8);font-size:12.5px">Este número todavía no está trazado en el mapa. Agregalo desde 🗺️ /mapa → ' + LM_E(empresa) + ' → ' + LM_E(sistema) + ' → ＋ Agregar dato.</div>')
    + '</div>';
  document.body.appendChild(ov);
}
window.osLineageInfo = osLineageInfo;
// helper corto para plantillas: ícono ⓘ junto a un número
function osLinI(empresa, sistema, dato) {
  return '<span title="¿De dónde sale este número?" style="cursor:pointer;font-size:10px;color:var(--mut2);vertical-align:middle" onclick="event.stopPropagation();osLineageInfo(\'' + LM_E(empresa) + '\',\'' + LM_E(sistema).replace(/'/g, "\\'") + '\',\'' + LM_E(dato).replace(/'/g, "\\'") + '\')">ⓘ</span>';
}
window.osLinI = osLinI;
