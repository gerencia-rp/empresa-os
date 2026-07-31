// ════════════════════════════════════════════════════════════
// 🔄 Sync Estimador → Weekly Planner (extraído de remodel-pro.js)
// Depende de: rmState, sb, alert/confirm
// ════════════════════════════════════════════════════════════

// ─── SYNC: Estimador → Planner Semanal ───
async function rmSyncToPlanner() {
  if (!rmState.currentProject) {
    return alert('Primero guarda el proyecto (botón "Guardar" abajo) y luego sincroniza.');
  }
  if (Object.keys(rmState.selectedActivities).length === 0) {
    return alert('No hay actividades seleccionadas. Marca actividades en el catálogo primero.');
  }
  if (!confirm(`Sincronizar ${Object.keys(rmState.selectedActivities).length} actividades al Planner Semanal?\n\nEsto BORRARÁ las actividades existentes en el Planner de este proyecto y las reemplazará con las nuevas fechas calculadas.`)) return;

  const e = rmCalcProject();
  const startDate = new Date(rmState.editStartDate);
  const projectId = rmState.currentProject.id;
  const projectName = rmState.editName || rmState.currentProject.name;

  // 1) Borrar weekly_activities previas auto-generadas de este proyecto
  await sb.from('weekly_activities').delete().eq('project_id', projectId);

  // 2) Para cada actividad seleccionada: calcular fecha basada en su fase + start_offset
  const inserts = [];
  Object.entries(rmState.selectedActivities).forEach(([code, cfg]) => {
    const cat = rmGetCatalog().find(c => c.code === code);
    if (!cat) return;
    // Fecha = inicio de la fase del estimador + offset propio
    const phaseSch = e.phaseSchedule[cat.phase];
    let activityStart = phaseSch ? new Date(phaseSch.start) : startDate;
    if (cfg.start_offset) activityStart = rmAddDays(activityStart, cfg.start_offset);
    const _sf = (typeof rmState !== 'undefined' && rmState._stageFactors) || {};
    const _f = (typeof rmCalibFactor === 'function') ? rmCalibFactor(_sf, (RM_PHASES[cat.phase] || { name: cat.cat }).name) : 1;
    const days = Math.max(1, Math.round((cfg.days || Math.max(1, Math.ceil((cat.days_per_qty || 0) * (cfg.qty || 1)))) * _f));

    // Crear 1 entry por día de duración (para verlo en cada día del Planner)
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = (typeof rmAddWorkDays === "function" ? rmAddWorkDays(activityStart, i) : rmAddDays(activityStart, i));
      const phaseInfo = RM_PHASES[cat.phase] || { name: cat.cat, color: '#756c5c' };
      const dayLabel = days > 1 ? ` (día ${i+1}/${days})` : '';
      inserts.push({
        project_id: projectId,
        property_name: projectName,
        date: date.toISOString().split('T')[0],
        activity_name: cat.desc + dayLabel,
        stage: phaseInfo.name.toLowerCase().replace(/\s/g, '_'),
        activity_code: code, // S6-U2: link a catalog para validar dependencias CPM
        notes: `[Estimador] ${code} · qty ${cfg.qty || 1} ${cat.unit} · $${Math.round((cfg.qty||0)*(cfg.vu||cat.vu))}`,
        start_hour: 7,
        end_hour: 17,
        status: 'planned',
        priority: i === 0 ? 'normal' : 'low',
        is_critical: !!(e.cpm && e.cpm.criticalPath && e.cpm.criticalPath.includes(code)),
        created_by: state.user.id
      });
    }
  });

  if (inserts.length === 0) return alert('No hay actividades para sincronizar.');

  // Insertar en chunks (Postgrest tiene límite)
  const chunkSize = 50;
  for (let i = 0; i < inserts.length; i += chunkSize) {
    const chunk = inserts.slice(i, i + chunkSize);
    const { error } = await sb.from('weekly_activities').insert(chunk);
    if (error) return alert('Error sync: ' + error.message);
  }

  // Rango de fechas resultante
  const dates = inserts.map(i => i.date).sort();
  const minDate = dates[0], maxDate = dates[dates.length-1];
  const fmt = d => new Date(d+'T00:00:00').toLocaleDateString('es-MX', {weekday:'short', day:'numeric', month:'short'});

  if (confirm(`✓ SINCRONIZACIÓN EXITOSA\n\n${inserts.length} actividades-día creadas en el Planner Semanal\n\n• Proyecto: ${projectName}\n• Desde: ${fmt(minDate)}\n• Hasta: ${fmt(maxDate)}\n• Duración: ${e.totalDays} días\n• Etapas: ${Object.keys(e.byPhase).length}\n\n¿Abrir el Planner Semanal ahora?`)) {
    // Cerrar este modal y abrir el planner
    closeModal();
    setTimeout(async () => {
      const plannerSys = state.systems[state.currentAreaId]?.find(s => s.type === 'weekly-planner')
        || (await sb.from('systems').select('*').eq('type','weekly-planner').single()).data;
      if (plannerSys) {
        // Asegurar que la semana inicial esté en el rango del proyecto
        if (typeof wpState !== 'undefined') {
          wpState.weekStart = wpMondayOf(new Date(minDate + 'T00:00:00'));
        }
        openWeeklyPlanner(plannerSys);
      }
    }, 300);
  }
}

async function rmRunAI(force = false) {
  const e = rmCalcProject();
  window._aiRefreshCb = () => rmRenderTab();
  await aiAnalyze('remodel-pro', {
    project_name: rmState.editName,
    address: rmState.editAddress,
    sqft: rmState.editSqft,
    activities_count: e.activities.length,
    activities_summary: e.activities.map(a => ({code:a.code, desc:a.desc.slice(0,50), qty:a.qty, total:a.total})).slice(0,30),
    direct_cost: e.pricing.directCost,
    internal_cost: e.pricing.internalCost,
    client_price: e.pricing.clientPrice,
    total_days: e.totalDays,
    crew_size: rmState.crewSize,
    contingency_pct: rmState.contingencyPct,
    overhead_pct: rmState.overheadPct,
    markup_pct: rmState.markupPct,
    // Activos del proyecto
    matterport_url: rmState.matterportUrl,
    scope_text: rmState.scopeText,
    scope_audio_transcript: rmState.scopeAudioTranscript,
    plans_count: rmState.plans.length,
    photos_count: rmState.photos.length
  }, force);
}

function rmToggleActivity(code) {
  if (rmState.selectedActivities[code]) delete rmState.selectedActivities[code];
  else {
    const cat = rmGetCatalog().find(c => c.code === code);
    rmState.selectedActivities[code] = { qty: 1, vu: cat.vu, days: Math.max(1, Math.ceil(cat.days_per_qty)), start_offset: 0 };
  }
  rmRenderTab();
}
function rmSetQty(code, v) { if(!rmState.selectedActivities[code])return; rmState.selectedActivities[code].qty = +v; rmState.selectedActivities[code].src = 'manual'; rmRenderTab(); }

// Trae las cantidades del diagnóstico (insp_cantidades) al Editor. No pisa nada cargado.
async function rmTraerTakeoff() {
  const res = await rmLoadTakeoff();
  if (res.error) { alert(res.error); return; }
  const rep = rmApplyTakeoff(res.cant);
  rep._insp = res.insp;
  rmState.takeoffRep = rep;
  rmRenderTab();
}
function rmCerrarTakeoffBanner() { rmState.takeoffRep = null; rmRenderTab(); }
window.rmTraerTakeoff = rmTraerTakeoff; window.rmCerrarTakeoffBanner = rmCerrarTakeoffBanner;
function rmSetVu(code, v) { if(!rmState.selectedActivities[code])return; rmState.selectedActivities[code].vu = +v; rmRenderTab(); }
function rmSetDays(code, v) { if(!rmState.selectedActivities[code])return; rmState.selectedActivities[code].days = +v; rmRenderTab(); }

// QW2 — Auto-calcula permitsCost para Austin TX según sqft
// Fórmula: $1,500 base + $0.50 por ft² sobre 1,500
function rmAutoPermitsAustin() {
  const sqft = +rmState.editSqft || 0;
  const over = Math.max(0, sqft - 1500);
  const auto = 1500 + over * 0.50;
  rmState.permitsCost = Math.round(auto);
  rmRenderTab();
}

// QW6 — Validación URL Matterport (no bloqueante)
// Acepta los 3 formatos oficiales: /show/?m=, /discover/space/, /models/
function rmIsValidMatterport(url) {
  if (!url) return true; // vacío es válido (opcional)
  return /(?:my\.matterport\.com\/show\/\?m=|matterport\.com\/discover\/space\/|my\.matterport\.com\/models\/)[A-Za-z0-9]+/.test(url);
}
// Extrae el modelId desde cualquiera de los 3 formatos
function rmExtractMatterportId(url) {
  if (!url) return null;
  const m = url.match(/(?:my\.matterport\.com\/show\/\?m=|matterport\.com\/discover\/space\/|my\.matterport\.com\/models\/)([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}
