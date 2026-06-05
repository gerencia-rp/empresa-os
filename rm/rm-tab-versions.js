// 📑 TAB Versiones + Change Orders (extraído de remodel-pro.js)
// Snapshot del proyecto + comparativa de versiones.
// ─── S1-G2: Versionado + Change Orders ───

async function rmLoadVersionsAndCOs(projectId) {
  if (!projectId) { rmState.versions = []; rmState.changeOrders = []; return; }
  const [v, co] = await Promise.all([
    sb.from('remodel_budget_versions').select('*').eq('project_id', projectId).order('version', { ascending: false }),
    sb.from('remodel_change_orders').select('*').eq('project_id', projectId).order('number', { ascending: false })
  ]);
  rmState.versions = v.data || [];
  rmState.changeOrders = co.data || [];
}

async function rmApproveBudgetVersion() {
  if (!rmState.currentProject?.id) return alert('Guardá el proyecto primero en el Editor.');
  const e = rmCalcProject();
  if (e.activities.length === 0) return alert('No hay actividades para versionar.');

  const label = prompt('Etiqueta para esta versión (ej: "Aprobado inicial", "Post change order 1"):', `v${rmState.versions.length + 1} — ${new Date().toLocaleDateString('es-MX')}`);
  if (label === null) return; // cancel
  const approvedBy = prompt('¿Quién aprueba? (nombre o email del cliente/lender/partner):', '');
  if (approvedBy === null) return;

  // Calcular siguiente version number
  const { data: nv, error: nvErr } = await sb.rpc('next_budget_version', { p_project_id: rmState.currentProject.id });
  if (nvErr) return alert('Error obteniendo siguiente versión: ' + nvErr.message);

  const payload = {
    project_id: rmState.currentProject.id,
    version: nv,
    label: label || `v${nv}`,
    activities: e.activities,
    budget_total: e.pricing.clientPrice,
    budget_material: e.totals.material,
    budget_labor: e.totals.labor,
    budget_equipment: e.totals.equipment,
    pricing: {
      contingencyPct: rmState.contingencyPct,
      overheadPct: rmState.overheadPct,
      markupPct: rmState.markupPct,
      permitsCost: rmState.permitsCost,
      designFeesCost: rmState.designFeesCost,
      directCost: e.pricing.directCost,
      internalCost: e.pricing.internalCost,
      profit: e.pricing.profit,
      profitMarginPct: e.pricing.profitMarginPct,
      totalDays: e.totalDays
    },
    sqft: rmState.editSqft,
    approved_by: approvedBy || null,
    approved_at: approvedBy ? new Date().toISOString() : null,
    created_by: state.user?.id || null
  };

  const { error } = await sb.from('remodel_budget_versions').insert(payload);
  if (error) return alert('Error guardando versión: ' + error.message);
  await rmLoadVersionsAndCOs(rmState.currentProject.id);
  alert(`✓ Versión ${nv} creada${approvedBy?' y aprobada por '+approvedBy:''}`);
  rmRenderTab();
}

// Compara la versión última aprobada vs el estado actual del Editor.
// Devuelve { added: [{code, total}], removed: [{code, total}], modified: [{code, before, after, delta}], deltaCost, deltaDays }
function rmDiffAgainstVersion(versionRow) {
  const e = rmCalcProject();
  const prevActs = (versionRow.activities || []).reduce((m, a) => { m[a.code] = a; return m; }, {});
  const curActs = e.activities.reduce((m, a) => { m[a.code] = a; return m; }, {});

  const added = [];
  const removed = [];
  const modified = [];
  Object.keys(curActs).forEach(code => {
    if (!prevActs[code]) {
      added.push({ code, desc: curActs[code].desc, total: +curActs[code].total || 0 });
    } else {
      const before = +prevActs[code].total || 0;
      const after = +curActs[code].total || 0;
      if (Math.abs(after - before) > 0.5) {
        modified.push({ code, desc: curActs[code].desc, before, after, delta: after - before });
      }
    }
  });
  Object.keys(prevActs).forEach(code => {
    if (!curActs[code]) {
      removed.push({ code, desc: prevActs[code].desc, total: +prevActs[code].total || 0 });
    }
  });

  const deltaCost = e.pricing.clientPrice - (+versionRow.budget_total || 0);
  const prevDays = (versionRow.pricing && +versionRow.pricing.totalDays) || 0;
  const deltaDays = e.totalDays - prevDays;
  return { added, removed, modified, deltaCost, deltaDays };
}

async function rmCreateChangeOrder() {
  if (!rmState.currentProject?.id) return alert('Guardá el proyecto primero.');
  const lastApproved = rmState.versions.find(v => v.approved_at);
  if (!lastApproved) return alert('No hay versión aprobada todavía. Primero "📋 Aprobar versión actual".');

  const diff = rmDiffAgainstVersion(lastApproved);
  if (!diff.added.length && !diff.removed.length && !diff.modified.length) {
    return alert('No hay cambios vs la última versión aprobada (v' + lastApproved.version + '). Modificá actividades en el Editor primero.');
  }

  const title = prompt('Título del change order (ej: "Agregar quartz en isla cocina"):', '');
  if (title === null) return;
  const reason = prompt('Razón (cliente_solicitado / hallazgo_obra / codigo_local / otro):', 'cliente_solicitado');
  if (reason === null) return;
  const description = prompt('Descripción detallada (opcional):', '');

  // Snapshot de la versión NUEVA primero
  await rmApproveBudgetVersion();
  await rmLoadVersionsAndCOs(rmState.currentProject.id);
  const newVersion = rmState.versions[0]; // la más reciente

  const { data: nco, error: nErr } = await sb.rpc('next_change_order_number', { p_project_id: rmState.currentProject.id });
  if (nErr) return alert('Error obteniendo CO#: ' + nErr.message);

  const payload = {
    project_id: rmState.currentProject.id,
    from_version: lastApproved.version,
    to_version: newVersion.version,
    number: nco,
    title: title || `CO #${nco}`,
    description: description || null,
    reason: reason || 'otro',
    delta_cost: diff.deltaCost,
    delta_days: diff.deltaDays,
    activities_added: diff.added,
    activities_removed: diff.removed,
    activities_modified: diff.modified,
    status: 'pending',
    created_by: state.user?.id || null
  };

  const { error } = await sb.from('remodel_change_orders').insert(payload);
  if (error) return alert('Error creando CO: ' + error.message);
  await rmLoadVersionsAndCOs(rmState.currentProject.id);
  alert(`✓ Change Order #${nco} creado (delta ${diff.deltaCost >= 0 ? '+' : ''}${rmFmt(diff.deltaCost)} · ${diff.deltaDays >= 0 ? '+' : ''}${diff.deltaDays}d). Pasá a tab Historial para aprobarlo.`);
  rmState.tab = 'versions';
  rmRender();
}

async function rmApproveChangeOrder(coId) {
  const approvedBy = prompt('Cliente que aprueba (nombre o email):', '');
  if (approvedBy === null || approvedBy.trim() === '') return;
  const { error } = await sb.from('remodel_change_orders').update({
    status: 'approved',
    client_approved: true,
    client_approved_by: approvedBy,
    client_approved_at: new Date().toISOString()
  }).eq('id', coId);
  if (error) return alert('Error: ' + error.message);
  await rmLoadVersionsAndCOs(rmState.currentProject.id);
  alert('✓ Change Order aprobado por ' + approvedBy);
  rmRenderTab();
}

async function rmRejectChangeOrder(coId) {
  if (!confirm('¿Rechazar este Change Order? El cambio queda registrado pero marcado como rechazado.')) return;
  const { error } = await sb.from('remodel_change_orders').update({ status: 'rejected' }).eq('id', coId);
  if (error) return alert('Error: ' + error.message);
  await rmLoadVersionsAndCOs(rmState.currentProject.id);
  rmRenderTab();
}

function rmRenderVersions(body) {
  if (!rmState.currentProject) {
    body.innerHTML = `<div class="text-center py-12 text-slate-500">
      Cargá un proyecto desde <strong>📁 Proyectos</strong> para ver su historial de versiones y change orders.
    </div>`;
    return;
  }

  const lastApproved = rmState.versions.find(v => v.approved_at);
  const cosByStatus = { pending: [], approved: [], rejected: [], executed: [] };
  rmState.changeOrders.forEach(co => {
    (cosByStatus[co.status] || (cosByStatus.pending)).push(co);
  });

  body.innerHTML = `
    <div class="flex justify-between items-end mb-3 flex-wrap gap-2">
      <div>
        <h2 class="text-lg font-bold">📜 Historial — ${rmState.currentProject.name}</h2>
        <p class="text-xs text-slate-500">Versiones aprobadas del presupuesto y change orders ejecutados.</p>
      </div>
      <div class="flex gap-2">
        <button onclick="rmApproveBudgetVersion()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded">📋 Aprobar versión actual</button>
        ${lastApproved ? `<button onclick="rmCreateChangeOrder()" class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded">🔄 Crear Change Order</button>` : ''}
      </div>
    </div>

    <!-- Versiones -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
      <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">Versiones aprobadas (${rmState.versions.length})</div>
      ${rmState.versions.length === 0 ? `
        <div class="p-6 text-center text-xs text-slate-400">Sin versiones aún. Click "📋 Aprobar versión actual" para snapshot del Editor.</div>
      ` : `
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr><th class="text-left p-2">v#</th><th class="text-left p-2">Etiqueta</th><th class="text-right p-2">Budget</th><th class="text-right p-2">$/ft²</th><th class="text-left p-2">Aprobado por</th><th class="text-right p-2">Aprobado</th><th class="text-left p-2"># Activ.</th></tr>
          </thead>
          <tbody>
            ${rmState.versions.map(v => `
              <tr class="border-t border-slate-100 hover:bg-slate-50">
                <td class="p-2 font-bold">v${v.version}</td>
                <td class="p-2">${v.label || '—'}</td>
                <td class="p-2 text-right font-bold">${rmFmt(v.budget_total)}</td>
                <td class="p-2 text-right text-slate-500">${v.sqft ? '$' + (v.budget_total/v.sqft).toFixed(0) : '—'}</td>
                <td class="p-2 text-slate-700">${v.approved_by || '<span class="text-amber-600">⏳ borrador</span>'}</td>
                <td class="p-2 text-right text-slate-500">${v.approved_at ? rmFmtDate(v.approved_at) : '—'}</td>
                <td class="p-2 text-slate-500">${(v.activities || []).length}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Change Orders -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">Change Orders (${rmState.changeOrders.length})</div>
      ${rmState.changeOrders.length === 0 ? `
        <div class="p-6 text-center text-xs text-slate-400">Sin change orders. Modificá actividades en el Editor y click "🔄 Crear Change Order".</div>
      ` : `
        <div class="divide-y divide-slate-100">
          ${rmState.changeOrders.map(co => {
            const tone = co.status === 'approved' ? 'emerald' : co.status === 'rejected' ? 'red' : co.status === 'executed' ? 'blue' : 'amber';
            const icon = co.status === 'approved' ? '✅' : co.status === 'rejected' ? '❌' : co.status === 'executed' ? '⚙️' : '⏳';
            return `
              <div class="p-3">
                <div class="flex justify-between items-start gap-3 flex-wrap">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-bold">CO #${co.number}</span>
                      <span class="text-[10px] bg-${tone}-100 text-${tone}-800 px-2 py-0.5 rounded">${icon} ${co.status}</span>
                      <span class="text-[10px] text-slate-500">v${co.from_version} → v${co.to_version}</span>
                      <span class="text-[10px] text-slate-500">${co.reason || ''}</span>
                    </div>
                    <div class="text-sm font-semibold mt-1">${co.title || '(sin título)'}</div>
                    ${co.description ? `<div class="text-xs text-slate-600 mt-0.5">${co.description}</div>` : ''}
                  </div>
                  <div class="text-right whitespace-nowrap">
                    <div class="text-sm font-bold ${co.delta_cost > 0 ? 'text-red-700' : 'text-emerald-700'}">${co.delta_cost > 0 ? '+' : ''}${rmFmt(co.delta_cost)}</div>
                    <div class="text-[10px] text-slate-500">${co.delta_days > 0 ? '+' : ''}${co.delta_days}d</div>
                  </div>
                </div>
                <div class="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div class="bg-emerald-50 rounded p-1.5"><strong>+ ${(co.activities_added||[]).length}</strong> nuevas</div>
                  <div class="bg-red-50 rounded p-1.5"><strong>− ${(co.activities_removed||[]).length}</strong> removidas</div>
                  <div class="bg-amber-50 rounded p-1.5"><strong>~ ${(co.activities_modified||[]).length}</strong> modificadas</div>
                </div>
                ${co.status === 'pending' ? `
                  <div class="mt-2 flex gap-2">
                    <button onclick="rmApproveChangeOrder('${co.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded">✅ Aprobar</button>
                    <button onclick="rmRejectChangeOrder('${co.id}')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1 rounded">❌ Rechazar</button>
                  </div>
                ` : co.client_approved_by ? `
                  <div class="mt-2 text-[10px] text-slate-500">Aprobado por ${co.client_approved_by} el ${rmFmtDate(co.client_approved_at)}</div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <div class="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-950">
      <strong>💡 Flujo recomendado:</strong>
      <ol class="mt-1 ml-4 list-decimal space-y-0.5">
        <li>Editor → ajustás presupuesto → click "<strong>📋 Aprobar versión actual</strong>" → snapshot v1 con firma del cliente</li>
        <li>Cliente pide cambio → modificás actividades en el Editor → click "<strong>🔄 Crear Change Order</strong>" → snapshot v2 + diff vs v1</li>
        <li>Cliente revisa el delta y aprueba o rechaza el CO desde acá</li>
        <li>El SOW Lender usa siempre la última versión aprobada (vista <code class="bg-blue-100 px-1 rounded">remodel_latest_approved_version</code>)</li>
      </ol>
    </div>
  `;
}
