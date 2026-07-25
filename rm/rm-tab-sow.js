// 📋 TAB SOW (Scope of Work para lenders) (extraído de remodel-pro.js)
// Mapeo activity_code → categoría SOW. Compute + export CSV + draws.
// Depende de: rmState, rmGetCatalog.

// Mapeo: activity_code → categoría SOW estándar de lenders
const RM_SOW_CATEGORIES = [
  { section: 'Soft Costs', items: [
    { sow_name: 'Permits', codes: ['4.2.1'] },
    { sow_name: 'Architectural', codes: [] },
    { sow_name: 'Engineering', codes: ['4.2.2'] },
    { sow_name: 'Legal', codes: [] },
    { sow_name: 'General Contractor Fee', codes: ['4.2.3'] },
    { sow_name: 'Other - Soft Costs', codes: [] }
  ]},
  { section: 'Demo, Foundation', items: [
    { sow_name: 'Demolition', codes: ['1.1.1','1.1.3','1.1.4','1.1.6','1.1.7','1.1.8','1.1.9','1.1.10','1.1.11','1.1.12'] },
    { sow_name: 'Foundation + Driveway', codes: ['2.1.4','2.2.6','2.2.1','2.2.9','2.1.1'] },
    { sow_name: 'Other - Demo', codes: [] }
  ]},
  { section: 'HVAC, Plumbing, Electrical', items: [
    { sow_name: 'HVAC Rough', codes: ['5.5.1h'], pct: 0.6 },
    { sow_name: 'HVAC Trim Out', codes: ['5.5.1h'], pct: 0.4 },
    { sow_name: 'HVAC Service / Repair', codes: ['5.5.2h','hvac_mantenimiento','hvac_reparacion'] },
    { sow_name: 'Electrical Service', codes: ['5.1.5'] },
    { sow_name: 'Electrical Rough', codes: ['5.1.6'] },
    { sow_name: 'Electrical Final / Fixtures', codes: ['5.1.4','5.1.7','5.1.9'] },
    { sow_name: 'Plumbing Rough', codes: ['5.2.1p'], pct: 0.4 },
    { sow_name: 'Plumbing Top Out', codes: ['5.2.1p','5.2.2p'], pct: 0.3 },
    { sow_name: 'Plumbing Final / Fixtures', codes: ['5.2.3p','5.2.4p'] },
    { sow_name: 'Other - Systems', codes: [] }
  ]},
  { section: 'Interno', items: [
    { sow_name: 'Windows', codes: ['3.7.1'] },
    { sow_name: 'Interior Doors', codes: ['5.8.1'] },
    { sow_name: 'Interior Trim', codes: ['5.2.1','5.6.3'] },
    { sow_name: 'Insulation', codes: ['5.1.3','5.2.3'] },
    { sow_name: 'Drywall', codes: ['5.1.1'] },
    { sow_name: 'Interior Paint', codes: ['5.1.2'] },
    { sow_name: 'Tile Flooring', codes: [] },
    { sow_name: 'Carpet', codes: ['5.6.2'] },
    { sow_name: 'Vinyl / Wood Flooring (LVP)', codes: ['5.6.1'] },
    { sow_name: 'Kitchen Countertops', codes: ['5.4.2'] },
    { sow_name: 'Kitchen Cabinets', codes: ['5.4.1','5.4.5'] },
    { sow_name: 'Backsplash', codes: ['5.4.3'] },
    { sow_name: 'Appliances', codes: ['5.4.6','5.4.4'] },
    { sow_name: 'Bathroom Cabinets / Vanity', codes: ['5.3.5'] },
    { sow_name: 'Bathroom Floors / Showers Tile', codes: ['5.3.1','5.3.2'] },
    { sow_name: 'Tubs / Toilets', codes: ['5.3.6'] },
    { sow_name: 'Shower Glass', codes: ['5.3.3'] },
    { sow_name: 'Bathroom Accessories (mirrors, hardware)', codes: ['5.3.4'] },
    { sow_name: 'Closet Shelving', codes: ['5.8.2'] },
    { sow_name: 'Other - Interior', codes: [] }
  ]},
  { section: 'Externo', items: [
    { sow_name: 'Masonry / Stucco', codes: [] },
    { sow_name: 'Roofing', codes: ['3.1.1','3.1.2'] },
    { sow_name: 'Framing', codes: ['4.1.2','4.1.3','4.1.4','4.1.5'] },
    { sow_name: 'Siding', codes: ['3.4.1','3.16.1'] },
    { sow_name: 'Exterior Paint', codes: ['3.4.3'] },
    { sow_name: 'Exterior Doors', codes: ['3.5.1','3.5.2'] },
    { sow_name: 'Garage Doors', codes: [] },
    { sow_name: 'Driveway / Flatwork', codes: ['3.13.1','3.6.1'] },
    { sow_name: 'Pressure Wash', codes: [] },
    { sow_name: 'Landscaping', codes: ['3.15.1'] },
    { sow_name: 'Decks / Patio', codes: [] },
    { sow_name: 'Rain Gutters', codes: ['3.1.3'] },
    { sow_name: 'Sprinkler System', codes: [] },
    { sow_name: 'Fencing', codes: ['3.14.1'] },
    { sow_name: 'Rough Clean', codes: [] },
    { sow_name: 'Final Clean', codes: ['6.2.3','6.3.1','6.3.2'] },
    { sow_name: 'Other - Exterior', codes: [] }
  ]}
];

const rmSowState = {
  numDraws: 3,
  contingencyPct: 10,
  lenderName: 'STX Capital',
  loanNumber: '',
  borrowerName: '',
  borrowerEmail: '',
  description: '',
  edits: {} // sow_name -> {amount, description, draw1, draw2, draw3}
};

function rmComputeSow() {
  // Mapea actividades del proyecto a categorías SOW
  const projActs = Object.entries(rmState.selectedActivities).map(([code, cfg]) => {
    const cat = rmGetCatalog().find(c => c.code === code);
    if (!cat) return null;
    const total = (+cfg.qty || 0) * (+cfg.vu || cat.vu);
    return { code, desc: cat.desc, total };
  }).filter(Boolean);

  const sections = RM_SOW_CATEGORIES.map(sec => ({
    section: sec.section,
    items: sec.items.map(item => {
      // Suma actividades mapeadas
      let mapped = projActs.filter(pa => item.codes.includes(pa.code));
      let auto = mapped.reduce((s, m) => s + m.total, 0);
      // Algunos items toman solo un % del activity
      if (item.pct) auto = auto * item.pct;
      const editKey = `${sec.section}::${item.sow_name}`;
      const edit = rmSowState.edits[editKey] || {};
      const amount = edit.amount !== undefined ? +edit.amount : auto;
      const description = edit.description !== undefined ? edit.description : mapped.map(m => m.desc).join('; ').slice(0, 200);
      return {
        sow_name: item.sow_name,
        auto, amount, description,
        editKey,
        draws: [edit.draw1 || 0, edit.draw2 || 0, edit.draw3 || 0, edit.draw4 || 0, edit.draw5 || 0]
      };
    })
  }));

  const directTotal = sections.reduce((s, sec) => s + sec.items.reduce((a, i) => a + (+i.amount || 0), 0), 0);
  const contingency = directTotal * (rmSowState.contingencyPct / 100);
  const grandTotal = directTotal + contingency;
  return { sections, directTotal, contingency, grandTotal };
}

function rmSetSowEdit(editKey, field, value) {
  if (!rmSowState.edits[editKey]) rmSowState.edits[editKey] = {};
  rmSowState.edits[editKey][field] = value;
  // Debounced render
  rmRenderTabDebounced();
}

function rmDistributeAutoDraws() {
  // Lógica: Demo + soft + roughs → Draw 1; Drywall+paint+pisos → Draw 2; Finishes+ext+clean → Draw 3
  const drawMap = {
    'Soft Costs': 1, 'Demo, Foundation': 1,
    'HVAC, Plumbing, Electrical': 1,
    'Interno': 2,
    'Externo': 3
  };
  const sow = rmComputeSow();
  sow.sections.forEach(sec => {
    sec.items.forEach(it => {
      if (it.amount > 0) {
        const targetDraw = drawMap[sec.section] || 2;
        // Algunos items específicos van a draw 3 (finales)
        const lateItems = ['Appliances','Final Clean','Mirrors','Door and Cabinet Handles','Bathroom Accessories (mirrors, hardware)','Shower Glass','Landscaping','Sprinkler System'];
        const draw = lateItems.includes(it.sow_name) ? 3 : targetDraw;
        const editKey = it.editKey;
        if (!rmSowState.edits[editKey]) rmSowState.edits[editKey] = {};
        rmSowState.edits[editKey][`draw${draw}`] = it.amount;
      }
    });
  });
  rmRenderTab();
}

function rmExportSowCSV() {
  const sow = rmComputeSow();
  const lines = [];
  lines.push(`BUDGET FOR A FIX AND FLIP PROJECT — ${rmState.editName}`);
  lines.push('');
  lines.push('PROPERTY INFORMATION - 1ST PART');
  lines.push('Item,Amount,Description');
  lines.push(`Construction Budget,${sow.grandTotal.toFixed(2)},${rmState.editAddress}`);
  lines.push(`Estimated Completion Timeframe,${Math.round((rmCalcProject().totalDays)||0)} days,`);
  lines.push(`Final Square Footage,${rmState.editSqft},`);
  lines.push(`Will you be using a General Contractor,Yes,`);
  lines.push('');
  lines.push(`General Contractor Name,Email,Loan Number`);
  lines.push(`Rental Profitss,${rmSowState.borrowerEmail || 'gerencia@rentalprofitss.com'},${rmSowState.loanNumber}`);
  lines.push('');
  lines.push('BUDGET - 2ND PART');
  const drawCols = Array.from({length: rmSowState.numDraws}, (_, i) => `Draw #${i+1}`).join(',');
  lines.push(`Item,Description,Total Cost,${drawCols}`);
  sow.sections.forEach(sec => {
    lines.push('');
    lines.push(`${sec.section.toUpperCase()},,,`);
    sec.items.forEach(it => {
      if (it.amount === 0 && !it.description) return;
      const draws = it.draws.slice(0, rmSowState.numDraws).map(d => d || '').join(',');
      lines.push(`"${it.sow_name}","${(it.description||'').replace(/"/g,'""')}",${(+it.amount).toFixed(2)},${draws}`);
    });
  });
  lines.push('');
  lines.push(`Contingency (${rmSowState.contingencyPct}%),,${sow.contingency.toFixed(2)},`);
  lines.push(`GRAND TOTAL,,${sow.grandTotal.toFixed(2)},`);
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `SOW_${rmState.editName||'project'}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function rmRenderSow(body) {
  if (!rmState.currentProject && Object.keys(rmState.selectedActivities).length === 0) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">Crea o carga un proyecto en el Editor primero (con actividades). El SOW se genera automáticamente desde tu presupuesto.</div>`;
    return;
  }
  const sow = rmComputeSow();
  const e = rmCalcProject();
  const drawTotals = Array.from({length: rmSowState.numDraws}, () => 0);
  sow.sections.forEach(sec => sec.items.forEach(it => it.draws.forEach((d, i) => { if (i < rmSowState.numDraws) drawTotals[i] += +d || 0; })));

  body.innerHTML = `
    <div class="space-y-4">
      <!-- HEADER PROYECTO -->
      <div class="bg-white rounded-xl p-4 border border-slate-200">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-bold">${osIcon('clipboard')} Scope of Work — ${rmState.editName || 'Sin nombre'}</h2>
            <p class="text-xs text-slate-500">Generado automáticamente desde el presupuesto. Edita lo que necesites antes de exportar.</p>
          </div>
          <div class="flex gap-2">
            <button onclick="rmDistributeAutoDraws()" class="bg-slate-100 hover:bg-slate-200 text-xs font-bold px-3 py-2 rounded">${osIcon('zap')} Auto-distribuir Draws</button>
            <button onclick="rmExportSowCSV()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded">${osIcon('download')} Exportar CSV (Lender)</button>
          </div>
        </div>
      </div>

      <!-- INFO LENDER -->
      <div class="bg-white rounded-xl p-4 border border-slate-200">
        <h3 class="text-xs font-bold uppercase text-slate-700 mb-2">Información del préstamo</h3>
        <div class="grid grid-cols-4 gap-2">
          <div><label class="block text-[10px] text-slate-500 mb-0.5">Lender</label><input value="${rmSowState.lenderName}" oninput="rmSowState.lenderName=this.value" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div><label class="block text-[10px] text-slate-500 mb-0.5">Loan #</label><input value="${rmSowState.loanNumber}" oninput="rmSowState.loanNumber=this.value" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div><label class="block text-[10px] text-slate-500 mb-0.5"># Draws</label><input type="number" min="1" max="5" value="${rmSowState.numDraws}" onchange="rmSowState.numDraws=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div><label class="block text-[10px] text-slate-500 mb-0.5">Contingency %</label><input type="number" value="${rmSowState.contingencyPct}" onchange="rmSowState.contingencyPct=+this.value; rmRenderTabDebounced()" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div class="col-span-2"><label class="block text-[10px] text-slate-500 mb-0.5">Borrower Name</label><input value="${rmSowState.borrowerName}" oninput="rmSowState.borrowerName=this.value" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div class="col-span-2"><label class="block text-[10px] text-slate-500 mb-0.5">Borrower Email</label><input value="${rmSowState.borrowerEmail}" oninput="rmSowState.borrowerEmail=this.value" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" /></div>
          <div class="col-span-4"><label class="block text-[10px] text-slate-500 mb-0.5">Description of Work (overview general)</label><textarea oninput="rmSowState.description=this.value" rows="2" placeholder="Full remodel: new kitchen, 2 bathrooms, paint, flooring, exterior refresh..." class="w-full border border-slate-300 rounded px-2 py-1 text-sm">${rmSowState.description}</textarea></div>
        </div>
      </div>

      <!-- SOW TABLE -->
      ${sow.sections.map(sec => `
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div class="bg-slate-100 px-3 py-2 font-bold text-sm">${sec.section}</div>
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left py-1.5 px-2 w-1/4">Item</th>
                <th class="text-left py-1.5 px-2">Description / Specification</th>
                <th class="text-right py-1.5 px-2 w-24">Total</th>
                ${Array.from({length: rmSowState.numDraws}, (_, i) => `<th class="text-right py-1.5 px-2 w-20">Draw #${i+1}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${sec.items.map(it => {
                const sum = it.draws.slice(0, rmSowState.numDraws).reduce((a,b)=>a+(+b||0),0);
                const mismatch = it.amount > 0 && Math.abs(sum - it.amount) > 1;
                return `<tr class="border-t border-slate-100 ${it.amount>0?'':'opacity-60'}">
                  <td class="py-1 px-2 font-semibold">${it.sow_name}</td>
                  <td class="py-1 px-2"><input value="${(it.description||'').replace(/"/g,'&quot;')}" oninput="rmSetSowEdit('${it.editKey}','description',this.value)" class="w-full border border-slate-200 rounded px-2 py-1 text-xs" placeholder="${it.auto>0?'auto: '+it.description:'-'}" /></td>
                  <td class="py-1 px-2 text-right"><input type="number" value="${it.amount||''}" oninput="rmSetSowEdit('${it.editKey}','amount',this.value)" class="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right font-bold" placeholder="${it.auto?'auto: '+Math.round(it.auto):'0'}" /></td>
                  ${it.draws.slice(0, rmSowState.numDraws).map((d, i) => `<td class="py-1 px-2 text-right"><input type="number" value="${d||''}" oninput="rmSetSowEdit('${it.editKey}','draw${i+1}',this.value)" class="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right ${mismatch?'border-red-400':''}" /></td>`).join('')}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}

      <!-- TOTALES -->
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <h3 class="text-xs font-bold uppercase text-slate-400 mb-3">Totales</h3>
        <table class="w-full text-sm">
          <tbody>
            <tr class="border-b border-slate-700"><td class="py-2">Subtotal directo</td><td class="py-2 text-right">${rmFmt(sow.directTotal)}</td></tr>
            <tr class="border-b border-slate-700"><td class="py-2">Contingency (${rmSowState.contingencyPct}%)</td><td class="py-2 text-right text-amber-300">${rmFmt(sow.contingency)}</td></tr>
            <tr class="font-bold text-amber-400"><td class="py-2 text-lg">GRAND TOTAL</td><td class="py-2 text-right text-lg">${rmFmt(sow.grandTotal)}</td></tr>
          </tbody>
        </table>
        <div class="mt-3 pt-3 border-t border-slate-700 grid grid-cols-${rmSowState.numDraws+1} gap-2 text-xs">
          ${drawTotals.map((d, i) => `<div class="bg-slate-800 rounded p-2"><div class="text-[10px] text-slate-400 uppercase">Draw #${i+1}</div><div class="font-bold">${rmFmt(d)}</div></div>`).join('')}
          <div class="bg-emerald-900/50 rounded p-2"><div class="text-[10px] text-emerald-300 uppercase">Distribuido</div><div class="font-bold ${Math.abs(drawTotals.reduce((a,b)=>a+b,0) - sow.directTotal) > 1 ? 'text-red-400':'text-emerald-400'}">${rmFmt(drawTotals.reduce((a,b)=>a+b,0))} / ${rmFmt(sow.directTotal)}</div></div>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-950">
        <strong>${osIcon('lightbulb')} Cómo funciona:</strong>
        <ul class="mt-1 ml-4 list-disc space-y-0.5">
          <li>Los <strong>montos auto-calculados</strong> vienen de las actividades de tu proyecto (mapeo de 60+ códigos del catálogo a categorías SOW del lender)</li>
          <li>Puedes <strong>editar cualquier valor</strong>: monto, descripción, distribución de draws</li>
          <li>Click <strong>"Auto-distribuir Draws"</strong> para llenar automáticamente Draw #1 (demo+rough), #2 (interior), #3 (finishes+exterior)</li>
          <li>Click <strong>"Exportar CSV"</strong> genera archivo en formato LRC standard que puedes copiar/pegar al template del lender</li>
          <li>Soporta formatos: LRC Generic, STX Capital, 04 Rehab Budget</li>
        </ul>
      </div>
    </div>
  `;
}

// ============================================================
// S2-G4 · TAB CATÁLOGO (CRUD) + S2-G5 · Suppliers
// ============================================================

async function rmCatalogSave(code, payload) {
  // upsert por code
  const row = { ...payload, code };
  const { error } = await sb.from('remodel_catalog_items').upsert(row, { onConflict: 'code' });
  if (error) return alert('Error: ' + error.message);
  await rmLoadCatalog();
  rmRenderTab();
}

async function rmCatalogUpdateField(code, field, value) {
  const upd = {};
  upd[field] = (field === 'description' || field === 'subcat' || field === 'unit' || field === 'phase') ? value : (value === '' ? null : +value);
  const { error } = await sb.from('remodel_catalog_items').update(upd).eq('code', code);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCatalog();
  rmRenderTabDebounced();
}

// S3-G3: Update depends_on (text[]) parsing comma-separated input
async function rmCatalogUpdateDeps(code, value) {
  // "5.4.1, 5.6.1" → ['5.4.1','5.6.1']
  const allCodes = new Set(rmGetCatalog().map(c => c.code));
  const newDeps = (value || '').split(',').map(s => s.trim()).filter(Boolean);
  const invalid = newDeps.filter(d => !allCodes.has(d));
  if (invalid.length) {
    return alert('Códigos inválidos: ' + invalid.join(', ') + '\n\nUsá codes que existan en el catálogo.');
  }
  if (newDeps.includes(code)) {
    return alert('Una actividad no puede depender de sí misma.');
  }
  const { error } = await sb.from('remodel_catalog_items').update({ depends_on: newDeps }).eq('code', code);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCatalog();
  rmRenderTab();
}

async function rmCatalogToggleActive(code, currentActive) {
  const { error } = await sb.from('remodel_catalog_items').update({ active: !currentActive }).eq('code', code);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCatalog();
  rmRenderTab();
}

async function rmCatalogDelete(code) {
  if (!confirm(`¿Borrar ${code} del catálogo?\n\nSi es seed lo mejor es DESACTIVAR (no borrar) para no romper proyectos viejos.`)) return;
  const { error } = await sb.from('remodel_catalog_items').delete().eq('code', code);
  if (error) return alert('Error: ' + error.message);
  await rmLoadCatalog();
  rmRenderTab();
}

async function rmCatalogAddNew() {
  const n = rmState.catalogNew;
  if (!n.code || !n.description) return alert('Code y Descripción son obligatorios.');
  if (rmGetCatalog().some(c => c.code === n.code)) return alert('El code ya existe.');
  const { error } = await sb.from('remodel_catalog_items').insert({
    code: n.code, phase: n.phase, subcat: n.subcat || null, description: n.description,
    unit: n.unit, vu_default: +n.vu_default || 0, mat_pct: +n.mat_pct || 0.5,
    days_per_qty: +n.days_per_qty || 0, active: n.active, is_seed: false,
    created_by: state.user?.id || null
  });
  if (error) return alert('Error: ' + error.message);
  rmState.catalogNew = { code:'', phase:'5', subcat:'', description:'', unit:'unit', vu_default:0, mat_pct:0.5, days_per_qty:1, active:true };
  rmState.catalogEditView = 'list';
  await rmLoadCatalog();
  rmRenderTab();
}

function rmCatalogExportJson() {
  const data = rmGetCatalog();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `catalogo_remodel_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// S2-G5 helpers
async function rmSupplierAdd() {
  const name = prompt('Nombre del supplier:');
  if (!name) return;
  const type = prompt('Tipo (general/materiales/labor/equipo/servicio/distribuidor):', 'materiales') || 'general';
  const city = prompt('Ciudad (opcional):', 'Austin TX') || null;
  const { error } = await sb.from('remodel_suppliers').insert({ name, type, city, active: true, created_by: state.user?.id || null });
  if (error) return alert('Error: ' + error.message);
  await rmLoadSuppliers();
  rmRenderTab();
}

async function rmSupplierTogglePreferred(id, current) {
  const { error } = await sb.from('remodel_suppliers').update({ preferred: !current }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await rmLoadSuppliers();
  rmRenderTab();
}

async function rmSupplierAddPrice(supplierId, supplierName) {
  const code = prompt('Activity code (ej. 5.4.2 para countertops):');
  if (!code) return;
  if (!rmGetCatalog().some(c => c.code === code)) return alert(`El code "${code}" no existe en el catálogo.`);
  const priceStr = prompt(`Precio unitario para ${code} en ${supplierName}:`);
  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) return alert('Precio inválido.');
  const source = prompt('Fuente (cotizacion/factura/estimado/website):', 'cotizacion') || 'cotizacion';
  const { error } = await sb.from('remodel_supplier_prices').insert({
    supplier_id: supplierId, activity_code: code, unit_price: price,
    source, created_by: state.user?.id || null
  });
  if (error) return alert('Error: ' + error.message);
  await rmLoadSuppliers();
  alert(`✓ Precio ${rmFmt(price)} guardado para ${code} en ${supplierName}`);
  rmRenderTab();
}

