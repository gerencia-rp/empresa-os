// ════════════════════════════════════════════════════════════
// 📊 Export Excel multi-sheet (extraído de remodel-pro.js)
// Depende de: rmState, RM_PHASES, RM_CATALOG, rmGetCatalog, XLSX, ExcelJS
// ════════════════════════════════════════════════════════════

// ─── EXPORT EXCEL multi-sheet (SheetJS): Config · Presupuesto · Cronograma ───
function rmBuildWorkbookForProject(proj) {
  // proj: { name, address, sqft, start_date, end_date_estimated, activities[], budget_*, pricing? }
  const acts = proj.activities || [];
  const sqft = +proj.sqft || 0;
  const tot = acts.reduce((a, x) => ({
    total: a.total + (+x.total||0), material: a.material + (+x.material||0),
    labor: a.labor + (+x.labor||0), equipment: a.equipment + (+x.equipment||0)
  }), { total:0, material:0, labor:0, equipment:0 });

  // Sheet 1: Config
  const configRows = [
    ['CONFIGURACIÓN DEL PROYECTO'],
    [],
    ['Nombre', proj.name || ''],
    ['Dirección', proj.address || ''],
    ['Sqft', sqft || ''],
    ['Fecha inicio', proj.start_date || ''],
    ['Fecha fin estimada', proj.end_date_estimated || ''],
    [],
    ['Presupuesto total (costo directo)', Math.round(tot.total)],
    ['$ / sqft', sqft ? +(tot.total/sqft).toFixed(2) : ''],
    ['Materiales', Math.round(tot.material)],
    ['Mano de obra', Math.round(tot.labor)],
    ['Equipo', Math.round(tot.equipment)],
  ];
  if (proj.budget_total) configRows.push([], ['Precio cliente (guardado)', Math.round(proj.budget_total)]);

  // Sheet 2: Presupuesto (por actividad agrupado por fase)
  const budgetRows = [['Código','Grupo','Subcategoría','Descripción','Unidad','Cant.','$/u','Material','Mano obra','Equipo','TOTAL','Días']];
  const phases = ['1','2','3','4','5','6'];
  phases.forEach(p => {
    const inPhase = acts.filter(a => a.phase === p);
    if (!inPhase.length) return;
    const ph = RM_PHASES[p];
    budgetRows.push([`${p}. ${ph?.name || ''}`.toUpperCase(), '', '', '', '', '', '', '', '', '', '', '']);
    inPhase.forEach(a => budgetRows.push([
      a.code, ph?.name || '', a.subcat || '', a.desc || '', a.unit || '',
      +a.qty || 0, +a.vu || 0, Math.round(+a.material||0), Math.round(+a.labor||0),
      Math.round(+a.equipment||0), Math.round(+a.total||0), +a.days || 0
    ]));
    const pt = inPhase.reduce((a,x) => ({ m:a.m+(+x.material||0), l:a.l+(+x.labor||0), e:a.e+(+x.equipment||0), t:a.t+(+x.total||0) }), {m:0,l:0,e:0,t:0});
    budgetRows.push(['', '', '', `Subtotal ${ph?.name||''}`, '', '', '', Math.round(pt.m), Math.round(pt.l), Math.round(pt.e), Math.round(pt.t), '']);
  });
  budgetRows.push([]);
  budgetRows.push(['', '', '', 'TOTAL COSTO DIRECTO', '', '', '', Math.round(tot.material), Math.round(tot.labor), Math.round(tot.equipment), Math.round(tot.total), '']);

  // Sheet 3: Cronograma (Gantt por fase secuencial)
  const ganttRows = [['Fase','Inicio (offset días)','Días','Actividades']];
  let cursor = 0;
  phases.forEach(p => {
    const inPhase = acts.filter(a => a.phase === p);
    if (!inPhase.length) return;
    const ph = RM_PHASES[p];
    const days = Math.max(0, ...inPhase.map(a => (+a.start_offset||0) + (+a.days||0)));
    ganttRows.push([`${p}. ${ph?.name||''}`, cursor, days, inPhase.length]);
    cursor += days;
  });
  ganttRows.push([]);
  ganttRows.push(['TOTAL DÍAS', '', cursor, '']);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(configRows), 'Config');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budgetRows), 'Presupuesto');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ganttRows), 'Cronograma');
  return wb;
}

function rmExportEditorExcel() {
  if (typeof XLSX === 'undefined') return alert('Librería Excel aún cargando, reintentá en 1 seg.');
  const e = rmCalcProject();
  if (!e.activities.length) return alert('Agrega actividades antes de exportar.');
  const proj = {
    name: rmState.editName || 'Proyecto', address: rmState.editAddress, sqft: rmState.editSqft,
    start_date: rmState.editStartDate,
    end_date_estimated: e.totalDays ? rmAddDays(new Date(rmState.editStartDate), e.totalDays).toISOString().split('T')[0] : '',
    activities: e.activities, budget_total: e.pricing.clientPrice
  };
  const wb = rmBuildWorkbookForProject(proj);
  XLSX.writeFile(wb, `Presupuesto_${(proj.name||'proyecto').replace(/[^a-z0-9]/gi,'_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function rmExportProjectExcel(projectId) {
  if (typeof XLSX === 'undefined') return alert('Librería Excel aún cargando.');
  const p = rmState.projects.find(x => x.id === projectId);
  if (!p) return alert('Proyecto no encontrado');
  const wb = rmBuildWorkbookForProject(p);
  XLSX.writeFile(wb, `Presupuesto_${(p.name||'proyecto').replace(/[^a-z0-9]/gi,'_')}.xlsx`);
}

function rmExportAllExcel() {
  if (typeof XLSX === 'undefined') return alert('Librería Excel aún cargando.');
  if (!rmState.projects.length) return alert('Sin proyectos para exportar.');
  const wb = XLSX.utils.book_new();
  // Hoja resumen del portfolio
  const resumen = [['RESUMEN PORTFOLIO REMODELACIÓN'], [],
    ['Proyecto','Sqft','Presupuesto','$/sqft','Material','Mano obra','Equipo','Real','Status','Inicio']];
  rmState.projects.forEach(p => {
    resumen.push([
      p.name||'', +p.sqft||0, Math.round(+p.budget_total||0),
      p.sqft ? +((+p.budget_total||0)/p.sqft).toFixed(0) : '',
      Math.round(+p.budget_material||0), Math.round(+p.budget_labor||0), Math.round(+p.budget_equipment||0),
      Math.round(+p.real_total||0), p.status||'', p.start_date||''
    ]);
  });
  const totBudget = rmState.projects.reduce((s,p) => s + (+p.budget_total||0), 0);
  resumen.push([], ['TOTAL', '', Math.round(totBudget)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');
  // Una hoja de presupuesto por proyecto (máx 20 para no saturar)
  rmState.projects.slice(0, 20).forEach((p, i) => {
    const acts = p.activities || [];
    const rows = [['Código','Grupo','Descripción','Cant.','$/u','Material','MO','Equipo','TOTAL','Días']];
    acts.forEach(a => rows.push([a.code, RM_PHASES[a.phase]?.name||'', a.desc||'', +a.qty||0, +a.vu||0, Math.round(+a.material||0), Math.round(+a.labor||0), Math.round(+a.equipment||0), Math.round(+a.total||0), +a.days||0]));
    const safeName = (p.name||('Proj'+i)).replace(/[^a-z0-9 ]/gi,'').slice(0,28) || ('Proj'+i);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), safeName);
  });
  XLSX.writeFile(wb, `Portfolio_Remodelacion_${new Date().toISOString().split('T')[0]}.xlsx`);
}
