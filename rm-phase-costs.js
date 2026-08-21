// ════════════════════════════════════════════════════════════════
// 📥 C.2 — IMPORTADOR DE COSTOS POR FASE (Excel → remodel_phase_costs)
// Lee la hoja "PRESUPUESTO GENERAL" del Excel del Estimado (Etapa | Material |
// Mano obra | Equipo | TOTAL) y guarda por fase {materiales, mano_obra, equipo,
// total}. Fallback: hojas de detalle por fase ("1. DEMOLICION"…) sumando
// "Total Mat" + "Total MO". Idempotente por obra. Alimenta el BAC del EVM (C.1).
//
// Convenciones: XLSX.read(buf,{type:'array',cellDates:true}) +
// sheet_to_json(ws,{header:1,defval:null,raw:true}). TOTAL se CALCULA
// (Material+MO+Equipo), no se lee de la fórmula de Excel (llega vacía por SheetJS).
// Escritura por sb; confirmDialog/withLoading/toast; reemplazo por obra.
// Depende de rmEvmPhaseOf / RM_EVM_FASES (rm-evm.js).
// ════════════════════════════════════════════════════════════════

// ── Parser puro (testeable en Node) ──────────────────────────────
function rmPCNum(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v).replace(/[^0-9.,-]/g, '');
  if (!s) return 0;
  const hasComma = s.indexOf(',') >= 0, hasDot = s.indexOf('.') >= 0;
  if (hasComma && hasDot) s = s.replace(/,/g, '');                 // comas = miles
  else if (hasComma && !hasDot) {                                  // solo coma
    const parts = s.split(',');
    s = (parts[parts.length - 1].length <= 2) ? parts.slice(0, -1).join('') + '.' + parts[parts.length - 1] : s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function rmPCFindHeader(rows) {
  const lim = Math.min(rows.length, 20);
  for (let i = 0; i < lim; i++) {
    const r = (rows[i] || []).map(c => String(c == null ? '' : c).trim().toLowerCase());
    const hasEtapa = r.some(c => c === 'etapa' || c.startsWith('etapa'));
    const hasMat = r.some(c => c.includes('material'));
    if (hasEtapa && hasMat) return i;
  }
  return -1;
}

function rmPCColMap(headerRow) {
  const map = { etapa: -1, material: -1, mano: -1, equipo: -1, total: -1 };
  (headerRow || []).forEach((c, idx) => {
    const s = String(c == null ? '' : c).trim().toLowerCase();
    if (!s) return;
    if (map.etapa < 0 && (s === 'etapa' || s.startsWith('etapa'))) map.etapa = idx;
    else if (map.material < 0 && s.includes('material')) map.material = idx;
    else if (map.mano < 0 && (s.includes('mano') || s.includes('obra') || s === 'mo' || s.includes('m.obra'))) map.mano = idx;
    else if (map.equipo < 0 && s.includes('equipo')) map.equipo = idx;
    else if (map.total < 0 && (s === 'total' || s === 'total ($)')) map.total = idx;
  });
  return map;
}

// rows: AOA de sheet_to_json(header:1). Devuelve {ok, phases:[6], total, error}.
function rmPCRowsToPhases(rows) {
  if (!rows || !rows.length) return { ok: false, error: 'Hoja vacía.' };
  const hi = rmPCFindHeader(rows);
  if (hi < 0) return { ok: false, error: 'No encontré el encabezado (Etapa/Material) en la hoja.' };
  const cols = rmPCColMap(rows[hi]);
  if (cols.etapa < 0 || cols.material < 0) return { ok: false, error: 'Faltan columnas Etapa y/o Material en el encabezado.' };
  const byPhase = {};
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const eta = String(r[cols.etapa] == null ? '' : r[cols.etapa]).trim();
    if (!eta) continue;
    if (/^total/i.test(eta)) break;                 // fila TOTAL → fin
    const fase = (typeof rmEvmPhaseOf === 'function') ? rmEvmPhaseOf(eta) : null;
    if (!fase) continue;
    const mat = rmPCNum(r[cols.material]);
    const mano = cols.mano >= 0 ? rmPCNum(r[cols.mano]) : 0;
    const eq = cols.equipo >= 0 ? rmPCNum(r[cols.equipo]) : 0;
    const total = mat + mano + eq;                  // CALCULADO (no de la fórmula)
    byPhase[fase] = { fase, nombre: (typeof RM_EVM_FASES !== 'undefined' ? RM_EVM_FASES[fase] : fase), costo_materiales: mat, costo_mano_obra: mano, costo_equipo: eq, total };
  }
  const phases = ['1', '2', '3', '4', '5', '6'].map(p => byPhase[p] || { fase: p, nombre: (typeof RM_EVM_FASES !== 'undefined' ? RM_EVM_FASES[p] : p), costo_materiales: 0, costo_mano_obra: 0, costo_equipo: 0, total: 0 });
  const total = phases.reduce((a, x) => a + x.total, 0);
  if (total <= 0) return { ok: false, error: 'Se leyeron 0 costos. ¿Es la hoja PRESUPUESTO GENERAL con columnas Material/Mano obra/Equipo?' };
  return { ok: true, phases, total };
}

// Fallback: sumar hojas de detalle por fase (Total Mat + Total MO). Sin equipo.
function rmPCPhaseSheetsToPhases(wb) {
  if (typeof XLSX === 'undefined' || !wb) return { ok: false, error: 'Sin XLSX.' };
  const byPhase = {};
  (wb.SheetNames || []).forEach(name => {
    const fase = (typeof rmEvmPhaseOf === 'function') ? rmEvmPhaseOf(name) : null;
    if (!fase) return;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true });
    const hi = rows.findIndex(r => (r || []).some(c => String(c == null ? '' : c).trim().toLowerCase().includes('total mat')));
    if (hi < 0) return;
    const hdr = (rows[hi] || []).map(c => String(c == null ? '' : c).trim().toLowerCase());
    const ciMat = hdr.findIndex(c => c.includes('total mat'));
    const ciMo = hdr.findIndex(c => c.includes('total mo') || c.includes('total m.o'));
    let mat = 0, mano = 0;
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      if (ciMat >= 0) mat += rmPCNum(r[ciMat]);
      if (ciMo >= 0) mano += rmPCNum(r[ciMo]);
    }
    byPhase[fase] = { fase, nombre: (typeof RM_EVM_FASES !== 'undefined' ? RM_EVM_FASES[fase] : fase), costo_materiales: mat, costo_mano_obra: mano, costo_equipo: 0, total: mat + mano };
  });
  const phases = ['1', '2', '3', '4', '5', '6'].map(p => byPhase[p] || { fase: p, nombre: (typeof RM_EVM_FASES !== 'undefined' ? RM_EVM_FASES[p] : p), costo_materiales: 0, costo_mano_obra: 0, costo_equipo: 0, total: 0 });
  const total = phases.reduce((a, x) => a + x.total, 0);
  if (total <= 0) return { ok: false, error: 'No se pudo leer costos de las hojas por fase.' };
  return { ok: true, phases, total, fromDetail: true };
}

// Toma un workbook XLSX y devuelve las fases (prioriza PRESUPUESTO GENERAL).
function rmPCParseWorkbook(wb) {
  if (typeof XLSX === 'undefined' || !wb) return { ok: false, error: 'Sin librería XLSX.' };
  const target = (wb.SheetNames || []).find(n => String(n).trim().toLowerCase().replace(/\s+/g, ' ') === 'presupuesto general')
    || (wb.SheetNames || []).find(n => String(n).toLowerCase().includes('presupuesto'));
  if (target) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[target], { header: 1, defval: null, raw: true });
    const res = rmPCRowsToPhases(rows);
    if (res.ok) { res.sheet = target; return res; }
    const fb = rmPCPhaseSheetsToPhases(wb);
    return fb.ok ? fb : res;
  }
  return rmPCPhaseSheetsToPhases(wb);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { rmPCNum, rmPCFindHeader, rmPCColMap, rmPCRowsToPhases, rmPCParseWorkbook, rmPCPhaseSheetsToPhases };
}

/* ═══════════════════════ UI (solo browser) ═══════════════════════ */
var rmPCState = { phases: null, total: 0, obras: [], sheet: null };

async function rmPCOpenImport(preselectPropId) {
  let el = document.getElementById('rmpc-modal');
  if (!el) { el = document.createElement('div'); el.id = 'rmpc-modal'; document.body.appendChild(el); }
  rmPCState = { phases: null, total: 0, obras: [], sheet: null, preselect: preselectPropId || null };
  el.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
  el.innerHTML = `<div style="background:#14161b;color:#e7eaf0;border:1px solid rgba(255,255,255,.12);border-radius:16px;max-width:660px;width:100%;max-height:90vh;overflow:auto;padding:22px;font-family:inherit;box-shadow:0 20px 60px rgba(0,0,0,.5)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><b style="font-size:16px">📥 Importar costos por fase</b><button onclick="rmPCClose()" style="background:none;border:none;color:#8b93a1;font-size:20px;cursor:pointer">✕</button></div>
    <div style="font-size:12px;color:#8b93a1;margin-bottom:14px;line-height:1.5">Sube el Excel del Estimado (hoja <b>PRESUPUESTO GENERAL</b>). Se leen Material · Mano obra · Equipo por fase (el Total se recalcula). <b>Reemplaza</b> los costos previos de la obra seleccionada.</div>
    <label style="font-size:11px;color:#8b93a1;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Obra destino</label>
    <select id="rmpc-obra" style="width:100%;padding:9px;border-radius:8px;background:#1c1f26;border:1px solid rgba(255,255,255,.14);color:#e7eaf0;margin-bottom:14px;font-size:13px"><option>Cargando obras…</option></select>
    <label style="font-size:11px;color:#8b93a1;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px">Archivo .xlsx</label>
    <input id="rmpc-file" type="file" accept=".xlsx,.xls" onchange="rmPCHandleFile(this)" style="margin-bottom:14px;color:#e7eaf0;font-size:12px;width:100%"/>
    <div id="rmpc-preview"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button onclick="rmPCClose()" style="padding:9px 16px;border-radius:8px;background:#1c1f26;border:1px solid rgba(255,255,255,.14);color:#e7eaf0;cursor:pointer;font-size:13px">Cancelar</button>
      <button id="rmpc-save" onclick="rmPCSave()" disabled style="padding:9px 18px;border-radius:8px;background:#3a5be0;border:none;color:#fff;cursor:pointer;font-size:13px;font-weight:700;opacity:.5">Guardar costos</button>
    </div>
  </div>`;
  await rmPCLoadObras();
}

async function rmPCLoadObras() {
  const selEl = document.getElementById('rmpc-obra'); if (!selEl) return;
  try {
    const r = await sb.from('remodel_at_properties').select('property_id, address, proceso').eq('active', true).order('proceso').order('address');
    const obras = (r.data || []).filter(o => o.property_id);
    rmPCState.obras = obras;
    selEl.innerHTML = obras.length
      ? obras.map(o => `<option value="${o.property_id}"${rmPCState.preselect === o.property_id ? ' selected' : ''}>${(o.address || o.property_id).replace(/</g, '&lt;')}${o.proceso ? ' · ' + o.proceso : ''}</option>`).join('')
      : '<option value="">No hay obras activas</option>';
  } catch (e) { selEl.innerHTML = '<option value="">Error cargando obras</option>'; }
}

async function rmPCHandleFile(input) {
  const prev = document.getElementById('rmpc-preview'), saveBtn = document.getElementById('rmpc-save');
  if (!input.files || !input.files[0]) return;
  if (typeof XLSX === 'undefined') { if (prev) prev.innerHTML = rmPCErr('No cargó la librería XLSX.'); return; }
  try {
    const buf = await input.files[0].arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const res = rmPCParseWorkbook(wb);
    if (!res.ok) { rmPCState.phases = null; if (prev) prev.innerHTML = rmPCErr(res.error); if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = .5; } return; }
    rmPCState.phases = res.phases; rmPCState.total = res.total; rmPCState.sheet = res.sheet || (res.fromDetail ? 'hojas por fase' : '');
    if (prev) prev.innerHTML = rmPCRenderPreview(res);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = 1; }
  } catch (e) {
    if (prev) prev.innerHTML = rmPCErr('No se pudo leer el Excel: ' + (e && e.message));
    if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = .5; }
  }
}

function rmPCErr(msg) { return `<div style="background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.35);color:#fca5a5;border-radius:8px;padding:11px;font-size:12px">⚠ ${String(msg || '').replace(/</g, '&lt;')}</div>`; }

function rmPCMoney(n) { return '$' + Math.round(+n || 0).toLocaleString(); }

function rmPCRenderPreview(res) {
  const rowsH = res.phases.map(p => `<tr>
      <td style="padding:5px 8px"><span style="opacity:.5">${p.fase}</span> ${p.nombre}</td>
      <td style="padding:5px 8px;text-align:right">${rmPCMoney(p.costo_materiales)}</td>
      <td style="padding:5px 8px;text-align:right">${rmPCMoney(p.costo_mano_obra)}</td>
      <td style="padding:5px 8px;text-align:right">${rmPCMoney(p.costo_equipo)}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:700">${rmPCMoney(p.total)}</td>
    </tr>`).join('');
  return `<div style="background:rgba(74,222,158,.08);border:1px solid rgba(74,222,158,.28);border-radius:8px;padding:6px 10px;font-size:11.5px;color:#8fe9bf;margin-bottom:10px">✓ Leído de <b>${(res.sheet || 'PRESUPUESTO GENERAL').replace(/</g, '&lt;')}</b>${res.fromDetail ? ' (detalle por fase, sin equipo)' : ''}. Revisa y guarda.</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid rgba(255,255,255,.1);border-radius:8px;overflow:hidden">
      <thead><tr style="background:#1c1f26;color:#8b93a1">
        <th style="padding:7px 8px;text-align:left">Fase</th><th style="padding:7px 8px;text-align:right">Material</th><th style="padding:7px 8px;text-align:right">Mano obra</th><th style="padding:7px 8px;text-align:right">Equipo</th><th style="padding:7px 8px;text-align:right">Total</th>
      </tr></thead>
      <tbody>${rowsH}</tbody>
      <tfoot><tr style="border-top:2px solid rgba(255,255,255,.16);font-weight:800"><td style="padding:7px 8px">TOTAL</td><td style="padding:7px 8px;text-align:right">${rmPCMoney(res.phases.reduce((a, x) => a + x.costo_materiales, 0))}</td><td style="padding:7px 8px;text-align:right">${rmPCMoney(res.phases.reduce((a, x) => a + x.costo_mano_obra, 0))}</td><td style="padding:7px 8px;text-align:right">${rmPCMoney(res.phases.reduce((a, x) => a + x.costo_equipo, 0))}</td><td style="padding:7px 8px;text-align:right">${rmPCMoney(res.total)}</td></tr></tfoot>
    </table>`;
}

async function rmPCSave() {
  if (!rmPCState.phases) return;
  const selEl = document.getElementById('rmpc-obra');
  const propId = selEl && selEl.value; if (!propId) { if (window.toast) toast('Selecciona una obra.', 'warning'); return; }
  const obra = (rmPCState.obras || []).find(o => o.property_id === propId);
  const addr = obra ? obra.address : null;
  const ok = await confirmDialog(
    `Se guardarán los costos por fase de <b>${String(addr || propId).replace(/</g, '&lt;')}</b> (total ${rmPCMoney(rmPCState.total)}). Reemplaza los costos previos de esta obra.`,
    { title: 'Importar costos por fase', confirmText: 'Guardar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  const btn = document.getElementById('rmpc-save');
  const run = async () => {
    const batch = 'imp_' + Date.now();
    const payload = rmPCState.phases.map(p => ({
      property_id: propId, fase: p.fase,
      costo_materiales: +p.costo_materiales || 0, costo_mano_obra: +p.costo_mano_obra || 0,
      costo_equipo: +p.costo_equipo || 0, total: +p.total || 0,
      address: addr, source: 'excel_import', import_batch: batch, updated_at: new Date().toISOString()
    }));
    // Reemplazo idempotente por obra: borrar y re-insertar.
    const del = await sb.from('remodel_phase_costs').delete().eq('property_id', propId);
    if (del.error) { if (window.toast) toast('No se pudo limpiar costos previos: ' + del.error.message, 'error'); return; }
    const ins = (typeof safeInsert === 'function')
      ? await safeInsert(() => sb.from('remodel_phase_costs'), payload, { select: false })
      : await sb.from('remodel_phase_costs').insert(payload);
    if (ins.error) { if (window.toast) toast('No se pudieron guardar los costos: ' + ins.error.message, 'error'); return; }
    if (window.toast) toast('Costos por fase importados (' + rmPCState.phases.length + ' fases)', 'success');
    rmPCClose();
    // Refrescar EVM si el Command Center está abierto en esa sección.
    if (typeof RC !== 'undefined' && RC.evm) { RC.evm.loaded = false; if (typeof rcEVMLoad === 'function') { await rcEVMLoad(); if (typeof rcRender === 'function') rcRender(); } }
  };
  if (typeof withLoading === 'function' && btn) await withLoading(btn, run); else await run();
}

function rmPCClose() { const el = document.getElementById('rmpc-modal'); if (el) el.remove(); }

if (typeof window !== 'undefined') {
  window.rmPCOpenImport = rmPCOpenImport;
  window.rmPCHandleFile = rmPCHandleFile;
  window.rmPCSave = rmPCSave;
  window.rmPCClose = rmPCClose;
}
