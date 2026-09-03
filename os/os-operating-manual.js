// Manual Operativo Vivo · captura primero, valida después, automatiza al final.
// Depende de globals del OS: sb, OS_E, osIcon, toast y osRender.
const OPM = window.OPM || {
  loaded: false, loading: false, error: null, tab: 'resumen', query: '', area: '', editing: null,
  areas: [], positions: [], tasks: [], processes: [], steps: [], sops: [], saving: false,
};
window.OPM = OPM;

const OPM_TABS = [
  ['resumen', 'layout', 'Vista general'], ['tareas', 'list', 'Tareas y necesidades'],
  ['areas', 'layers', 'Áreas'], ['posiciones', 'users', 'Posiciones'],
  ['procesos', 'network', 'Procesos'], ['sops', 'library', 'SOPs'],
];
const OPM_STATE_LABEL = {
  capturada: 'Capturada', en_revision: 'En revisión', validada: 'Validada', disenada_para_agente: 'Diseñada para agente',
  prueba_supervisada: 'Prueba supervisada', operativa: 'Operativa', borrador: 'Borrador', validado: 'Validado',
  activo: 'Activo', vigente: 'Vigente', obsoleto: 'Obsoleto', archivada: 'Archivada', archivado: 'Archivado',
};

function opmCSS() {
  if (document.getElementById('opm-css')) return;
  const st = document.createElement('style'); st.id = 'opm-css';
  st.textContent = [
    '#os-root .opm{--opm-line:rgba(111,179,188,.16);--opm-soft:rgba(10,27,34,.72);color:#dce9e6}',
    '#os-root .opm-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end;margin:8px 0 24px}',
    '#os-root .opm-head h1{font:400 clamp(32px,4vw,54px)/1.02 Georgia,serif;letter-spacing:-.025em;margin:0;color:#f0f7f4}',
    '#os-root .opm-head p{max-width:72ch;color:#8aa0a5;font-size:11px;line-height:1.65;margin:10px 0 0}',
    '#os-root .opm-primary,#os-root .opm-secondary{min-height:38px;border:1px solid rgba(57,221,177,.38);background:rgba(57,221,177,.09);color:#c7f8ea;padding:9px 13px;font:750 9px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:7px}',
    '#os-root .opm-secondary{border-color:var(--opm-line);background:transparent;color:#9eb3b7}',
    '#os-root .opm-primary:hover{background:rgba(57,221,177,.16)}#os-root .opm-primary:disabled{opacity:.5;cursor:not-allowed}',
    '#os-root .opm-tabs{display:flex;gap:2px;overflow:auto;border-bottom:1px solid var(--opm-line);margin-bottom:18px}',
    '#os-root .opm-tabs button{white-space:nowrap;border:0;border-bottom:2px solid transparent;background:transparent;color:#71878d;padding:10px 13px;font:700 9px Inter,sans-serif;cursor:pointer;display:flex;gap:7px;align-items:center}',
    '#os-root .opm-tabs button.on{color:#dff6ef;border-bottom-color:#39ddb1;background:rgba(57,221,177,.04)}',
    '#os-root .opm-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid var(--opm-line);margin-bottom:20px}',
    '#os-root .opm-metric{padding:16px 18px;border-right:1px solid var(--opm-line)}#os-root .opm-metric:last-child{border-right:0}',
    '#os-root .opm-metric b{display:block;font:400 27px Georgia,serif;color:#edf8f4;font-variant-numeric:tabular-nums}',
    '#os-root .opm-metric span{display:block;margin-top:5px;color:#70868c;font-size:8px;text-transform:uppercase;letter-spacing:.09em}',
    '#os-root .opm-summary{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:18px}',
    '#os-root .opm-section{border-top:1px solid var(--opm-line);padding-top:14px}',
    '#os-root .opm-section h2{font:400 21px Georgia,serif;margin:0 0 5px;color:#edf7f3}',
    '#os-root .opm-section>p{color:#789097;font-size:10px;line-height:1.55;margin:0 0 14px}',
    '#os-root .opm-area-progress{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(180px,1.4fr) 72px;gap:12px;align-items:center;padding:11px 0;border-top:1px solid rgba(111,179,188,.1)}',
    '#os-root .opm-area-progress b{font-size:10px}#os-root .opm-area-progress small{display:block;color:#6f858b;font-size:8px;margin-top:3px}',
    '#os-root .opm-bar{height:4px;background:#10232b;overflow:hidden}#os-root .opm-bar i{display:block;height:100%;background:#39ddb1}',
    '#os-root .opm-area-progress strong{font:400 17px Georgia,serif;text-align:right;color:#9ddfd0}',
    '#os-root .opm-path{display:grid;gap:0;border:1px solid var(--opm-line)}#os-root .opm-path div{display:grid;grid-template-columns:28px 1fr;gap:9px;padding:11px 12px;border-bottom:1px solid var(--opm-line);font-size:9px;color:#8fa3a7}',
    '#os-root .opm-path div:last-child{border-bottom:0}#os-root .opm-path b{color:#39ddb1;font:400 16px Georgia,serif}',
    '#os-root .opm-tools{display:grid;grid-template-columns:minmax(220px,1fr) 190px auto;gap:8px;margin-bottom:14px}',
    '#os-root .opm-input,#os-root .opm-select,#os-root .opm-textarea{width:100%;border:1px solid var(--opm-line);background:#050e15;color:#dce9e6;padding:9px 10px;font:10px Inter,sans-serif;box-sizing:border-box}',
    '#os-root .opm-input:focus,#os-root .opm-select:focus,#os-root .opm-textarea:focus{outline:2px solid rgba(57,221,177,.65);outline-offset:1px}',
    '#os-root .opm-list{border:1px solid var(--opm-line)}#os-root .opm-row{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(120px,.8fr) minmax(100px,.7fr) 100px 34px;gap:12px;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(111,179,188,.11);cursor:pointer}',
    '#os-root .opm-row:last-child{border-bottom:0}#os-root .opm-row:hover{background:rgba(57,221,177,.035)}',
    '#os-root .opm-row b{display:block;font-size:10px;color:#e5f0ed}#os-root .opm-row small{display:block;color:#71878d;font-size:8px;line-height:1.45;margin-top:4px}',
    '#os-root .opm-chip{display:inline-flex;width:max-content;border:1px solid var(--opm-line);padding:4px 7px;color:#90a5aa;font-size:7.5px;text-transform:uppercase;letter-spacing:.06em}',
    '#os-root .opm-chip.ok{color:#7ee2c8;border-color:rgba(57,221,177,.28)}#os-root .opm-chip.warn{color:#e8ba6e;border-color:rgba(232,186,110,.28)}',
    '#os-root .opm-editor{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);border:1px solid var(--opm-line);margin-bottom:18px;background:rgba(3,12,17,.74)}',
    '#os-root .opm-editor-intro{padding:20px;border-right:1px solid var(--opm-line)}#os-root .opm-editor-intro h2{font:400 27px Georgia,serif;margin:0 0 8px}#os-root .opm-editor-intro p{max-width:62ch;color:#82979c;font-size:10px;line-height:1.6}',
    '#os-root .opm-form{padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:11px}',
    '#os-root .opm-field{display:block;min-width:0}#os-root .opm-field.full{grid-column:1/-1}#os-root .opm-field>span{display:block;color:#789097;font-size:8px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}',
    '#os-root .opm-textarea{min-height:72px;resize:vertical;line-height:1.5}#os-root .opm-form-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;padding-top:4px}',
    '#os-root .opm-empty{border:1px dashed rgba(111,179,188,.24);padding:36px 24px;text-align:center;color:#789097;font-size:10px;line-height:1.6}',
    '#os-root .opm-empty b{display:block;color:#dce9e6;font:400 19px Georgia,serif;margin-bottom:6px}',
    '#os-root .opm-error{border:1px solid rgba(255,120,120,.28);background:rgba(255,100,100,.05);color:#ffaaaa;padding:12px;font-size:10px;margin-bottom:14px}',
    '@media(max-width:1050px){#os-root .opm-metrics{grid-template-columns:repeat(3,1fr)}#os-root .opm-metric:nth-child(3){border-right:0}#os-root .opm-summary,#os-root .opm-editor{grid-template-columns:1fr}#os-root .opm-editor-intro{border-right:0;border-bottom:1px solid var(--opm-line)}#os-root .opm-tools{grid-template-columns:1fr 170px}#os-root .opm-tools button{grid-column:1/-1;justify-self:start}}',
    '@media(max-width:700px){#os-root .opm-head{grid-template-columns:1fr;align-items:start}#os-root .opm-head .opm-primary{justify-self:start}#os-root .opm-metrics{grid-template-columns:1fr 1fr}#os-root .opm-metric{border-bottom:1px solid var(--opm-line)}#os-root .opm-form{grid-template-columns:1fr}#os-root .opm-field.full,#os-root .opm-form-actions{grid-column:auto}#os-root .opm-row{grid-template-columns:1fr auto}#os-root .opm-row>div:nth-child(2),#os-root .opm-row>div:nth-child(3){grid-column:1/-1}#os-root .opm-tools{grid-template-columns:1fr}#os-root .opm-area-progress{grid-template-columns:1fr 64px}#os-root .opm-area-progress .opm-bar{grid-column:1/-1;grid-row:2}}',
  ].join('\n');
  document.head.appendChild(st);
}

async function opmLoad(force) {
  if (OPM.loading || (OPM.loaded && !force)) return;
  OPM.loading = true; OPM.error = null;
  try {
    const [areas, positions, tasks, processes, steps, sops] = await Promise.all([
      sb.from('ops_areas').select('*').is('deleted_at', null).order('nombre'),
      sb.from('ops_positions').select('*').is('deleted_at', null).order('titulo'),
      sb.from('ops_task_intake').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      sb.from('ops_processes').select('*').is('deleted_at', null).order('nombre'),
      sb.from('ops_process_steps').select('*').order('process_id').order('orden'),
      sb.from('ops_sops').select('*').is('deleted_at', null).order('updated_at', { ascending: false }),
    ]);
    const failed = [areas, positions, tasks, processes, steps, sops].find(result => result.error);
    if (failed) throw failed.error;
    OPM.areas = areas.data || []; OPM.positions = positions.data || []; OPM.tasks = tasks.data || [];
    OPM.processes = processes.data || []; OPM.steps = steps.data || []; OPM.sops = sops.data || [];
    OPM.loaded = true;
  } catch (error) { OPM.error = error.message || String(error); }
  OPM.loading = false; if (window.osRender) osRender();
}
window.opmLoad = opmLoad;

function opmSetTab(tab) { OPM.tab = tab; OPM.editing = null; if (window.osRender) osRender(); }
function opmSetQuery(value) { OPM.query = value || ''; if (window.osRender) osRender(); }
function opmSetArea(value) { OPM.area = value || ''; if (window.osRender) osRender(); }
function opmOpen(type, id) { OPM.editing = { type, id: id || null }; OPM.error = null; if (window.osRender) osRender(); }
function opmCancel() { OPM.editing = null; OPM.error = null; if (window.osRender) osRender(); }
Object.assign(window, { opmSetTab, opmSetQuery, opmSetArea, opmOpen, opmCancel });

function opmAreaName(id) { return (OPM.areas.find(area => area.id === id) || {}).nombre || 'Sin área'; }
function opmPositionName(id) { return (OPM.positions.find(position => position.id === id) || {}).titulo || 'Sin posición'; }
function opmEntity(type, id) {
  const source = { tarea: OPM.tasks, area: OPM.areas, posicion: OPM.positions, proceso: OPM.processes, sop: OPM.sops }[type] || [];
  return source.find(row => row.id === id) || {};
}
function opmVal(id) { const node = document.getElementById(id); return node ? String(node.value || '').trim() : ''; }
function opmLines(value) { return String(value || '').split('\n').map(row => row.trim()).filter(Boolean); }
function opmCsv(value) { return String(value || '').split(',').map(row => row.trim()).filter(Boolean); }
function opmOptions(rows, selected, label) { return '<option value="">' + OS_E(label || 'Seleccionar') + '</option>' + rows.map(row => '<option value="' + row.id + '"' + (row.id === selected ? ' selected' : '') + '>' + OS_E(row.nombre || row.titulo) + '</option>').join(''); }
function opmField(label, id, value, opts) {
  opts = opts || {}; const full = opts.full ? ' full' : '';
  const control = opts.textarea
    ? '<textarea id="' + id + '" class="opm-textarea" placeholder="' + OS_E(opts.placeholder || '') + '">' + OS_E(value || '') + '</textarea>'
    : opts.options
      ? '<select id="' + id + '" class="opm-select">' + opts.options + '</select>'
      : '<input id="' + id + '" class="opm-input" type="' + (opts.type || 'text') + '" value="' + OS_E(value == null ? '' : value) + '" placeholder="' + OS_E(opts.placeholder || '') + '">';
  return '<label class="opm-field' + full + '"><span>' + OS_E(label) + '</span>' + control + '</label>';
}

function opmStateField(type, state) {
  const states = {
    tarea: ['capturada','en_revision','validada','disenada_para_agente','prueba_supervisada','operativa','archivada'],
    area: ['borrador','en_revision','validada','archivada'], posicion: ['borrador','en_revision','validada','archivada'],
    proceso: ['borrador','en_revision','validado','activo','archivado'], sop: ['borrador','en_revision','vigente','obsoleto','archivado'],
  }[type];
  const fallback = type === 'tarea' ? 'capturada' : 'borrador';
  return opmField('Estado de madurez','opm-state',state || fallback,{options:states.map(item=>'<option value="'+item+'"'+((state||fallback)===item?' selected':'')+'>'+OS_E(OPM_STATE_LABEL[item]||item)+'</option>').join('')});
}

function opmEditor() {
  if (!OPM.editing) return '';
  const type = OPM.editing.type, row = opmEntity(type, OPM.editing.id);
  const areaOptions = opmOptions(OPM.areas, row.area_id, 'Seleccionar área');
  const posOptions = opmOptions(OPM.positions, row.position_id || row.owner_position_id, 'Sin posición asignada');
  let title = '', help = '', fields = '';
  if (type === 'tarea') {
    title = row.id ? 'Editar tarea operativa' : 'Registrar lo que realmente haces';
    help = 'Describe el trabajo como ocurre hoy. No hace falta diseñar todavía la automatización; necesitamos entender el evento, los pasos, el resultado y los problemas reales.';
    fields = opmField('Área *','opm-area',row.area_id,{options:areaOptions}) + opmField('Posición responsable','opm-position',row.position_id,{options:posOptions})
      + opmField('Nombre de la tarea *','opm-title',row.titulo,{full:true,placeholder:'Ej. Revisar saldos pendientes de inquilinos'})
      + opmField('¿Qué haces paso a paso?','opm-description',row.descripcion,{textarea:true,full:true,placeholder:'Explica el proceso en lenguaje sencillo.'})
      + opmField('Frecuencia','opm-frequency',row.frecuencia,{placeholder:'Diaria, semanal, día 1...'}) + opmField('¿Qué la activa?','opm-trigger',row.disparador,{placeholder:'Horario, pago nuevo, solicitud...'})
      + opmField('Tiempo aproximado (min)','opm-duration',row.duracion_minutos,{type:'number'}) + opmField('Sistemas (separados por coma)','opm-systems',(row.sistemas||[]).join(', '))
      + opmField('Información que necesitas','opm-inputs',row.entradas,{textarea:true,full:true}) + opmField('Resultado que entregas *','opm-output',row.resultado,{textarea:true,full:true})
      + opmField('¿Quién recibe el resultado?','opm-recipient',row.destinatario) + opmField('Evidencia requerida','opm-evidence',row.evidencia_requerida)
      + opmField('Problemas o retrabajo frecuentes','opm-problems',row.problemas,{textarea:true,full:true}) + opmField('¿Qué pasa si no se hace?','opm-consequence',row.consecuencia,{textarea:true,full:true})
      + opmField('Riesgo','opm-risk',row.nivel_riesgo || 'bajo',{options:['bajo','medio','alto','critico'].map(x=>'<option value="'+x+'"'+((row.nivel_riesgo||'bajo')===x?' selected':'')+'>'+x+'</option>').join('')})
      + opmField('Aprobación','opm-approval',row.requiere_aprobacion ? 'si' : 'no',{options:'<option value="no"'+(!row.requiere_aprobacion?' selected':'')+'>No</option><option value="si"'+(row.requiere_aprobacion?' selected':'')+'>Sí</option>'}) + opmStateField(type,row.estado);
  } else if (type === 'area') {
    title = row.id ? 'Editar área' : 'Documentar un área'; help = 'Define para qué existe, qué resultado debe producir y qué sistemas utiliza.';
    fields = opmField('Empresa *','opm-company',row.empresa) + opmField('Nombre del área *','opm-title',row.nombre)
      + opmField('Propósito','opm-purpose',row.proposito,{textarea:true,full:true}) + opmField('Resultado esperado','opm-output',row.resultado_esperado,{textarea:true,full:true})
      + opmField('Sistemas (separados por coma)','opm-systems',(row.sistemas||[]).join(', '),{full:true}) + opmStateField(type,row.estado);
  } else if (type === 'posicion') {
    title = row.id ? 'Editar posición' : 'Documentar una posición'; help = 'Registra la misión del puesto, responsabilidades, herramientas y respaldo. Puede ser humana, IA o híbrida.';
    fields = opmField('Área *','opm-area',row.area_id,{options:areaOptions}) + opmField('Nombre de la posición *','opm-title',row.titulo)
      + opmField('Tipo','opm-type',row.tipo||'humana',{options:['humana','agente_ia','hibrida'].map(x=>'<option value="'+x+'"'+((row.tipo||'humana')===x?' selected':'')+'>'+x.replace('_',' ')+'</option>').join('')}) + opmField('Horario','opm-schedule',row.horario)
      + opmField('Misión','opm-purpose',row.mision,{textarea:true,full:true}) + opmField('Responsabilidades (una por línea)','opm-responsibilities',(row.responsabilidades||[]).join('\n'),{textarea:true,full:true})
      + opmField('Sistemas (separados por coma)','opm-systems',(row.sistemas||[]).join(', ')) + opmField('Respaldo','opm-backup',row.respaldo,{placeholder:'Persona o posición de respaldo'}) + opmStateField(type,row.estado);
  } else if (type === 'proceso') {
    title = row.id ? 'Editar proceso' : 'Documentar un proceso'; help = 'Une tareas y posiciones desde el evento inicial hasta un resultado verificable.';
    fields = opmField('Área *','opm-area',row.area_id,{options:areaOptions}) + opmField('Nombre del proceso *','opm-title',row.nombre)
      + opmField('Posición responsable','opm-position',row.owner_position_id,{options:posOptions}) + opmField('Tiempo objetivo (horas)','opm-duration',row.tiempo_objetivo_horas,{type:'number'})
      + opmField('Objetivo','opm-purpose',row.objetivo,{textarea:true,full:true}) + opmField('Evento inicial','opm-trigger',row.disparador,{full:true})
      + opmField('Cómo funciona hoy','opm-current',row.estado_actual,{textarea:true,full:true}) + opmField('Cómo debería funcionar','opm-future',row.estado_futuro,{textarea:true,full:true})
      + opmField('Pasos actuales (uno por línea) *','opm-process-steps',(OPM.steps||[]).filter(step=>step.process_id===row.id).map(step=>step.titulo).join('\n'),{textarea:true,full:true,placeholder:'1. Recibir la solicitud\n2. Verificar la información\n3. Entregar el resultado'})
      + opmField('KPI','opm-kpi',row.kpi,{full:true}) + opmStateField(type,row.estado);
  } else {
    title = row.id ? 'Editar SOP' : 'Crear un SOP'; help = 'Convierte conocimiento operativo en un procedimiento claro, recuperable y versionado.';
    fields = opmField('Área *','opm-area',row.area_id,{options:areaOptions}) + opmField('Posición','opm-position',row.position_id,{options:posOptions})
      + opmField('Título del SOP *','opm-title',row.titulo,{full:true}) + opmField('Propósito','opm-purpose',row.proposito,{textarea:true,full:true})
      + opmField('Cuándo se usa','opm-when',row.cuando_usar,{textarea:true,full:true}) + opmField('Requisitos previos','opm-requisites',row.requisitos,{textarea:true,full:true})
      + opmField('Pasos (uno por línea) *','opm-steps',(row.pasos||[]).map(x=>typeof x==='string'?x:x.texto||x.titulo||'').join('\n'),{textarea:true,full:true})
      + opmField('Resultado esperado','opm-output',row.resultado_esperado,{textarea:true,full:true}) + opmField('Evidencia requerida','opm-evidence',row.evidencia_requerida,{textarea:true,full:true})
      + opmField('Errores frecuentes','opm-errors',row.errores_frecuentes,{textarea:true,full:true}) + opmField('Cómo recuperarse','opm-recovery',row.recuperacion,{textarea:true,full:true})
      + opmField('Cuándo y a quién escalar','opm-escalation',row.escalamiento,{textarea:true,full:true}) + opmStateField(type,row.estado);
  }
  return '<section class="opm-editor"><div class="opm-editor-intro"><h2>' + OS_E(title) + '</h2><p>' + OS_E(help) + '</p><div class="opm-path" style="margin-top:18px"><div><b>1</b><span>Capturar cómo funciona hoy.</span></div><div><b>2</b><span>Validar con quien hace el trabajo.</span></div><div><b>3</b><span>Mejorar y asignar al equipo o a un agente.</span></div></div></div><div class="opm-form">' + fields + '<div class="opm-form-actions"><button class="opm-secondary" onclick="opmCancel()">Cancelar</button><button class="opm-primary" onclick="opmSave()"' + (OPM.saving?' disabled':'') + '>' + osIcon('save',{size:13}) + (OPM.saving?' Guardando…':' Guardar cambios') + '</button></div></div></section>';
}

async function opmSave() {
  if (!OPM.editing || OPM.saving) return;
  const type = OPM.editing.type, id = OPM.editing.id; let table, payload;
  const areaId = opmVal('opm-area'), title = opmVal('opm-title');
  try {
    if (!title) throw new Error('Escribe un nombre para poder guardar.');
    if (type !== 'area' && !areaId) throw new Error('Selecciona el área a la que pertenece.');
    if (type === 'tarea') {
      if (!opmVal('opm-output')) throw new Error('Describe el resultado que entrega esta tarea.');
      table='ops_task_intake'; payload={area_id:areaId,position_id:opmVal('opm-position')||null,titulo:title,descripcion:opmVal('opm-description'),frecuencia:opmVal('opm-frequency'),disparador:opmVal('opm-trigger'),duracion_minutos:opmVal('opm-duration')?Number(opmVal('opm-duration')):null,sistemas:opmCsv(opmVal('opm-systems')),entradas:opmVal('opm-inputs'),resultado:opmVal('opm-output'),destinatario:opmVal('opm-recipient'),problemas:opmVal('opm-problems'),consecuencia:opmVal('opm-consequence'),evidencia_requerida:opmVal('opm-evidence'),nivel_riesgo:opmVal('opm-risk')||'bajo',requiere_aprobacion:opmVal('opm-approval')==='si',estado:opmVal('opm-state')||'capturada'};
    } else if (type === 'area') {
      table='ops_areas'; const empresa=opmVal('opm-company'); if(!empresa) throw new Error('Escribe la empresa.');
      payload={empresa,nombre:title,slug:(empresa+'-'+title).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),proposito:opmVal('opm-purpose'),resultado_esperado:opmVal('opm-output'),sistemas:opmCsv(opmVal('opm-systems')),estado:opmVal('opm-state')||'borrador'};
    } else if (type === 'posicion') {
      table='ops_positions'; payload={area_id:areaId,titulo:title,tipo:opmVal('opm-type')||'humana',mision:opmVal('opm-purpose'),horario:opmVal('opm-schedule'),responsabilidades:opmLines(opmVal('opm-responsibilities')),sistemas:opmCsv(opmVal('opm-systems')),respaldo:opmVal('opm-backup'),estado:opmVal('opm-state')||'borrador'};
    } else if (type === 'proceso') {
      if(!opmLines(opmVal('opm-process-steps')).length) throw new Error('Escribe al menos un paso del proceso.');
      table='ops_processes'; payload={area_id:areaId,nombre:title,owner_position_id:opmVal('opm-position')||null,tiempo_objetivo_horas:opmVal('opm-duration')?Number(opmVal('opm-duration')):null,objetivo:opmVal('opm-purpose'),disparador:opmVal('opm-trigger'),estado_actual:opmVal('opm-current'),estado_futuro:opmVal('opm-future'),kpi:opmVal('opm-kpi'),estado:opmVal('opm-state')||'borrador'};
    } else {
      table='ops_sops'; const steps=opmLines(opmVal('opm-steps')); if(!steps.length) throw new Error('Escribe al menos un paso del procedimiento.');
      payload={area_id:areaId,position_id:opmVal('opm-position')||null,titulo:title,proposito:opmVal('opm-purpose'),cuando_usar:opmVal('opm-when'),requisitos:opmVal('opm-requisites'),pasos:steps.map((texto,index)=>({orden:index+1,texto})),resultado_esperado:opmVal('opm-output'),evidencia_requerida:opmVal('opm-evidence'),errores_frecuentes:opmVal('opm-errors'),recuperacion:opmVal('opm-recovery'),escalamiento:opmVal('opm-escalation'),estado:opmVal('opm-state')||'borrador'};
    }
    OPM.saving=true; OPM.error=null; if(window.osRender) osRender();
    const result = id ? await sb.from(table).update(payload).eq('id',id).select().single() : await sb.from(table).insert(payload).select().single();
    if(result.error) throw result.error;
    if(type==='proceso') {
      const processId=result.data.id, lines=opmLines(opmVal('opm-process-steps'));
      const stepRows=lines.map((step,index)=>({process_id:processId,orden:index+1,titulo:step}));
      const saved=await sb.from('ops_process_steps').upsert(stepRows,{onConflict:'process_id,orden'});
      if(saved.error) throw saved.error;
      const stale=await sb.from('ops_process_steps').delete().eq('process_id',processId).gt('orden',lines.length);
      if(stale.error) throw stale.error;
    }
    OPM.editing=null; OPM.loaded=false; if(window.toast) toast('Guardado en el Manual Operativo'); await opmLoad(true);
  } catch(error) { OPM.error=error.message||String(error); OPM.saving=false; if(window.osRender) osRender(); }
  OPM.saving=false;
}
window.opmSave = opmSave;

function opmFiltered(rows, kind) {
  const query = (OPM.query||'').toLowerCase();
  return rows.filter(row => (!OPM.area || row.area_id === OPM.area || row.id === OPM.area) && (!query || JSON.stringify(row).toLowerCase().includes(query))).map(row => Object.assign({_kind:kind},row));
}
function opmList(kind, rows, emptyTitle, emptyCopy) {
  if (!rows.length) return '<div class="opm-empty"><b>' + OS_E(emptyTitle) + '</b>' + OS_E(emptyCopy) + '</div>';
  return '<div class="opm-list">' + rows.map(row => {
    const title=row.titulo||row.nombre, area=kind==='area'?row.empresa:opmAreaName(row.area_id);
    const detail=kind==='tarea'?(row.resultado||row.descripcion||'Sin resultado documentado'):kind==='posicion'?(row.mision||'Misión por documentar'):kind==='proceso'?(row.objetivo||'Objetivo por documentar'):kind==='sop'?(row.proposito||'Propósito por documentar'):(row.resultado_esperado||row.proposito||'Por completar');
    const state=row.estado||'borrador', meta=kind==='tarea'?(row.frecuencia||'Sin frecuencia'):kind==='posicion'?row.tipo:kind==='sop'?'v'+(row.version||1):(row.sistemas||[]).slice(0,2).join(' · ');
    return '<div class="opm-row" role="button" tabindex="0" onclick="opmOpen(\''+kind+'\',\''+row.id+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();opmOpen(\''+kind+'\',\''+row.id+'\')}"><div><b>'+OS_E(title)+'</b><small>'+OS_E(detail)+'</small></div><div><b>'+OS_E(area)+'</b><small>'+OS_E(meta||'Por definir')+'</small></div><div><span class="opm-chip '+(/valid|vigente|activo|operativa/.test(state)?'ok':/revision|capturada/.test(state)?'warn':'')+'">'+OS_E(OPM_STATE_LABEL[state]||state)+'</span></div><div><small>'+OS_E(row.updated_at?new Date(row.updated_at).toLocaleDateString('es-MX'):'Sin fecha')+'</small></div><div>'+osIcon('chevron-right',{size:14})+'</div></div>';
  }).join('') + '</div>';
}

function opmSummary() {
  const validated=OPM.tasks.filter(task=>['validada','disenada_para_agente','prueba_supervisada','operativa'].includes(task.estado)).length;
  const pct=OPM.tasks.length?Math.round(validated/OPM.tasks.length*100):0;
  const areaRows=OPM.areas.map(area=>{const tasks=OPM.tasks.filter(t=>t.area_id===area.id),ok=tasks.filter(t=>['validada','disenada_para_agente','prueba_supervisada','operativa'].includes(t.estado)).length,p=tasks.length?Math.round(ok/tasks.length*100):0;return '<div class="opm-area-progress"><div><b>'+OS_E(area.nombre)+'</b><small>'+tasks.length+' tareas · '+OPM.positions.filter(x=>x.area_id===area.id).length+' posiciones</small></div><div class="opm-bar"><i style="width:'+p+'%"></i></div><strong>'+p+'%</strong></div>';}).join('');
  return '<div class="opm-metrics">'+[['Áreas',OPM.areas.length],['Posiciones',OPM.positions.length],['Tareas capturadas',OPM.tasks.length],['Procesos',OPM.processes.length],['SOPs vigentes',OPM.sops.filter(s=>s.estado==='vigente').length]].map(x=>'<div class="opm-metric"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>').join('')+'</div><div class="opm-summary"><section class="opm-section"><h2>Avance de documentación</h2><p>'+pct+'% de las tareas capturadas ya fue validado. La meta no es llenar formularios: es demostrar quién hace qué, con qué información y qué resultado entrega.</p>'+areaRows+'</section><section class="opm-section"><h2>Ruta hacia los agentes</h2><p>Ninguna tarea salta directamente a producción.</p><div class="opm-path"><div><b>1</b><span>El equipo registra el trabajo real.</span></div><div><b>2</b><span>El responsable valida pasos y evidencia.</span></div><div><b>3</b><span>Jarvis identifica desperdicio y riesgos.</span></div><div><b>4</b><span>Se diseña la automatización y sus límites.</span></div><div><b>5</b><span>El agente prueba bajo supervisión.</span></div></div></section></div>';
}

function opmBody() {
  if(OPM.tab==='resumen') return opmSummary();
  const map={tareas:['tarea',OPM.tasks,'Todavía no hay tareas registradas','Empieza documentando una actividad repetitiva que realice tu equipo.'],areas:['area',OPM.areas,'No hay áreas documentadas','Crea la primera área y define el resultado que debe producir.'],posiciones:['posicion',OPM.positions,'No hay posiciones documentadas','Registra los cargos humanos, digitales o híbridos.'],procesos:['proceso',OPM.processes,'No hay procesos documentados','Conecta tareas desde su evento inicial hasta un resultado verificable.'],sops:['sop',OPM.sops,'No hay SOPs documentados','Convierte un proceso validado en instrucciones claras y recuperables.']};
  const cfg=map[OPM.tab], rows=opmFiltered(cfg[1],cfg[0]);
  return '<div class="opm-tools"><input class="opm-input" aria-label="Buscar" placeholder="Buscar por nombre, sistema o resultado…" value="'+OS_E(OPM.query)+'" onchange="opmSetQuery(this.value)"><select class="opm-select" aria-label="Filtrar por área" onchange="opmSetArea(this.value)">'+opmOptions(OPM.areas,OPM.area,'Todas las áreas')+'</select><button class="opm-primary" onclick="opmOpen(\''+cfg[0]+'\')">'+osIcon('plus',{size:13})+' Crear</button></div>'+opmList(cfg[0],rows,cfg[2],cfg[3]);
}

function opmView() {
  opmCSS();
  if(!OPM.loaded && !OPM.loading && !OPM.error) opmLoad();
  const error=OPM.error?'<div class="opm-error"><b>No se pudo completar la operación.</b><br>'+OS_E(OPM.error)+' <button class="opm-secondary" onclick="opmLoad(true)" style="margin-left:8px">Reintentar</button></div>':'';
  if(OPM.loading&&!OPM.loaded) return '<div class="opm"><div class="opm-empty"><b>Cargando el Manual Operativo…</b>Estamos reuniendo áreas, posiciones, tareas, procesos y SOPs.</div></div>';
  const tabs=OPM_TABS.map(tab=>'<button class="'+(OPM.tab===tab[0]?'on':'')+'" onclick="opmSetTab(\''+tab[0]+'\')">'+osIcon(tab[1],{size:13})+OS_E(tab[2])+'</button>').join('');
  const primary=OPM.tab==='resumen'?'<button class="opm-primary" onclick="opmSetTab(\'tareas\');opmOpen(\'tarea\')">'+osIcon('plus',{size:13})+' Registrar una tarea</button>':'';
  return '<div class="opm"><header class="opm-head"><div><h1>Manual Operativo Vivo</h1><p>Documenta cómo funciona la empresa, valida el trabajo con quienes lo realizan y convierte únicamente los procesos maduros en responsabilidades para agentes.</p></div>'+primary+'</header>'+error+'<nav class="opm-tabs" aria-label="Secciones del manual">'+tabs+'</nav>'+opmEditor()+opmBody()+'</div>';
}
window.opmView = opmView;
