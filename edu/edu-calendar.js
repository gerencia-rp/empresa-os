// ════════════════════════════════════════════════════════════
// 📅 Calendario de sesiones (postventa)
// (extraído de education.js)
// Filtros · KPIs · modal sesión · modal resultado · Google Calendar
// Depende de: eduState, eduMyStudents, sb, state, openModal, closeModal,
// eduShowStudentDetail (de education.js)
// ════════════════════════════════════════════════════════════

// ─── CALENDARIO LIGADO A ESTUDIANTE + PLAN ───
// ════════════════════════════════════════════════════════════
// 📅 CALENDARIO DE SESIONES (postventa)
// Filtros: mes, status, estudiante, coach, motivo
// KPIs: asistencia, no-shows, reprogramadas
// Modal nueva sesión + modal de resultado (status + motivo + evidencia)
// Export ICS + mailto para invitación por correo
// ════════════════════════════════════════════════════════════

// Estado local del calendario
const eduCallsState = {
  monthAnchor: null,          // ISO string del primer día del mes visible
  statusFilter: 'all',
  motivoFilter: 'all',
  studentFilter: 'all',
  coachFilter: 'all',
  view: 'list',               // list | month
  showAttendModalFor: null    // call.id si está abierto el modal de marcar resultado
};

// Catálogo cargado en eduLoadAll (si no, default)
const EDU_CALL_MOTIVOS_DEFAULT = [
  { id:'bienvenida', label:'Bienvenida / Onboarding', emoji:'👋' },
  { id:'diagnostico', label:'Diagnóstico inicial', emoji:'🎯' },
  { id:'plan_review', label:'Revisión Plan de Acción', emoji:'📋' },
  { id:'coaching', label:'Coaching 1-on-1', emoji:'💬' },
  { id:'credito', label:'Diagnóstico / Coaching crédito', emoji:'💳' },
  { id:'buybox', label:'Buy Box / Análisis mercado', emoji:'🏘️' },
  { id:'deal_review', label:'Revisión de deal específico', emoji:'🔍' },
  { id:'cierre', label:'Cierre / Celebración deal', emoji:'🎉' },
  { id:'crisis', label:'Crisis / Bloqueo', emoji:'🚨' },
  { id:'renovacion', label:'Renovación / Renewal', emoji:'🔄' },
  { id:'exit', label:'Exit / Despedida', emoji:'👋' },
  { id:'grupal', label:'Sesión grupal', emoji:'👥' },
  { id:'otro', label:'Otro', emoji:'📌' }
];
function eduGetMotivos() {
  return (eduState.callMotivos && eduState.callMotivos.length) ? eduState.callMotivos : EDU_CALL_MOTIVOS_DEFAULT;
}

function eduCallsMonthAnchor() {
  if (!eduCallsState.monthAnchor) {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0);
    eduCallsState.monthAnchor = d.toISOString().slice(0,10);
  }
  return eduCallsState.monthAnchor;
}
function eduCallsNavMonth(delta) {
  const a = new Date(eduCallsMonthAnchor() + 'T00:00:00');
  a.setMonth(a.getMonth() + delta);
  a.setDate(1);
  eduCallsState.monthAnchor = a.toISOString().slice(0,10);
  eduRender();
}

function eduRenderCallsEnhanced() {
  const allCalls = eduState.calls || [];
  const students = eduMyStudents();
  const motivos = eduGetMotivos();

  // Filtrar por mes visible
  const anchor = new Date(eduCallsMonthAnchor() + 'T00:00:00');
  const monthStart = new Date(anchor); monthStart.setDate(1);
  const monthEnd = new Date(anchor); monthEnd.setMonth(monthEnd.getMonth() + 1); monthEnd.setDate(0);
  monthEnd.setHours(23,59,59,999);

  let calls = allCalls.filter(c => {
    const d = new Date(c.scheduled_at);
    return d >= monthStart && d <= monthEnd && (!c.mentorship_id || c.mentorship_id === eduState.mentorshipId);
  });
  if (eduCallsState.statusFilter !== 'all') calls = calls.filter(c => (c.status_attendance || 'pendiente') === eduCallsState.statusFilter);
  if (eduCallsState.motivoFilter !== 'all') calls = calls.filter(c => c.motivo === eduCallsState.motivoFilter);
  if (eduCallsState.studentFilter !== 'all') calls = calls.filter(c => c.student_id === eduCallsState.studentFilter);
  if (eduCallsState.coachFilter !== 'all') calls = calls.filter(c => (c.attended_by || '') === eduCallsState.coachFilter);

  // KPIs del mes
  const total = calls.length;
  const asist = calls.filter(c => c.status_attendance === 'asistio').length;
  const noShow = calls.filter(c => c.status_attendance === 'no_asistio').length;
  const reprog = calls.filter(c => c.status_attendance === 'reprogramo').length;
  const cancel = calls.filter(c => c.status_attendance === 'cancelo').length;
  const pend = calls.filter(c => !c.status_attendance || ['pendiente','confirmado'].includes(c.status_attendance)).length;
  const pctAsistencia = (asist + noShow) > 0 ? Math.round(100 * asist / (asist + noShow)) : null;

  // Coach options de los datos
  const coachSet = new Set(allCalls.map(c => c.attended_by).filter(Boolean));

  const monthLabel = anchor.toLocaleDateString('es', { month:'long', year:'numeric' });

  return `
    <div class="space-y-3">
      <!-- Header: nav mes + KPIs -->
      <div class="bg-slate-900 text-white rounded-xl p-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="text-xs font-bold uppercase text-slate-400">${osIcon('calendar',{size:12})} Calendario de sesiones</div>
            <div class="flex items-center gap-2 mt-1">
              <button onclick="eduCallsNavMonth(-1)" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">←</button>
              <div class="text-xl font-bold capitalize">${monthLabel}</div>
              <button onclick="eduCallsNavMonth(1)" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">→</button>
              <button onclick="eduCallsNavMonth(0); eduCallsState.monthAnchor=null; eduRender();" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">Hoy</button>
            </div>
          </div>
          <button onclick="eduAgendarCallNueva()" class="bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold px-4 py-2 rounded">+ Nueva sesión</button>
        </div>
        <div class="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4">
          <div class="bg-white/10 rounded p-2"><div class="text-[10px] opacity-80">Total mes</div><div class="text-xl font-bold">${total}</div></div>
          <div class="bg-emerald-500/30 rounded p-2"><div class="text-[10px] opacity-90">Asistió</div><div class="text-xl font-bold">${asist}</div></div>
          <div class="bg-red-500/30 rounded p-2"><div class="text-[10px] opacity-90">No asistió</div><div class="text-xl font-bold">${noShow}</div></div>
          <div class="bg-amber-500/30 rounded p-2"><div class="text-[10px] opacity-90">Reprogramó</div><div class="text-xl font-bold">${reprog}</div></div>
          <div class="bg-slate-500/30 rounded p-2"><div class="text-[10px] opacity-90">Canceló</div><div class="text-xl font-bold">${cancel}</div></div>
          <div class="bg-blue-500/30 rounded p-2"><div class="text-[10px] opacity-90">% asistencia</div><div class="text-xl font-bold">${pctAsistencia != null ? pctAsistencia+'%' : '—'}</div></div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2 text-xs">
        <span class="font-bold text-slate-700 mr-1">Filtrar:</span>
        <select onchange="eduCallsState.statusFilter=this.value; eduRender();" class="border border-slate-300 rounded px-2 py-1">
          <option value="all" ${eduCallsState.statusFilter==='all'?'selected':''}>Todos los status</option>
          <option value="pendiente" ${eduCallsState.statusFilter==='pendiente'?'selected':''}>Pendiente</option>
          <option value="confirmado" ${eduCallsState.statusFilter==='confirmado'?'selected':''}>Confirmado</option>
          <option value="asistio" ${eduCallsState.statusFilter==='asistio'?'selected':''}>✓ Asistió</option>
          <option value="no_asistio" ${eduCallsState.statusFilter==='no_asistio'?'selected':''}>✗ No asistió</option>
          <option value="reprogramo" ${eduCallsState.statusFilter==='reprogramo'?'selected':''}>Reprogramó</option>
          <option value="cancelo" ${eduCallsState.statusFilter==='cancelo'?'selected':''}>✕ Canceló</option>
        </select>
        <select onchange="eduCallsState.motivoFilter=this.value; eduRender();" class="border border-slate-300 rounded px-2 py-1">
          <option value="all" ${eduCallsState.motivoFilter==='all'?'selected':''}>Todos los motivos</option>
          ${motivos.map(m => `<option value="${m.id}" ${eduCallsState.motivoFilter===m.id?'selected':''}>${m.label}</option>`).join('')}
        </select>
        <select onchange="eduCallsState.studentFilter=this.value; eduRender();" class="border border-slate-300 rounded px-2 py-1">
          <option value="all" ${eduCallsState.studentFilter==='all'?'selected':''}>Todos los estudiantes</option>
          ${students.map(s => `<option value="${s.id}" ${eduCallsState.studentFilter===s.id?'selected':''}>${(s.full_name||'').replace(/</g,'&lt;')}</option>`).join('')}
        </select>
        ${coachSet.size > 0 ? `<select onchange="eduCallsState.coachFilter=this.value; eduRender();" class="border border-slate-300 rounded px-2 py-1">
          <option value="all" ${eduCallsState.coachFilter==='all'?'selected':''}>Todos los coaches</option>
          ${[...coachSet].map(c => `<option value="${c}" ${eduCallsState.coachFilter===c?'selected':''}>${c.replace(/</g,'&lt;')}</option>`).join('')}
        </select>` : ''}
      </div>

      <!-- Tabla de sesiones -->
      ${calls.length === 0 ? `<div class="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">Sin sesiones que coincidan con los filtros del mes.</div>` : `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-50">
                <tr class="text-[10px] uppercase text-slate-600">
                  <th class="text-left p-2">Fecha y hora</th>
                  <th class="text-left p-2">Estudiante</th>
                  <th class="text-left p-2">Motivo · Tema</th>
                  <th class="text-left p-2">Coach</th>
                  <th class="text-left p-2">Status</th>
                  <th class="text-left p-2">Evidencia</th>
                  <th class="text-right p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${calls.sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)).map(c => {
                  const st = students.find(s => s.id === c.student_id);
                  const mot = motivos.find(m => m.id === c.motivo);
                  const stat = c.status_attendance || 'pendiente';
                  const statBadge = {
                    pendiente: '<span class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">' + osIcon('hourglass',{size:9}) + ' PEND</span>',
                    confirmado: '<span class="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold">' + osIcon('check-circle',{size:9}) + ' CONF</span>',
                    asistio: '<span class="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ ASIS</span>',
                    no_asistio: '<span class="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[9px] font-bold">✗ NO ASIS</span>',
                    reprogramo: '<span class="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-bold">' + osIcon('refresh',{size:9}) + ' REPROG</span>',
                    cancelo: '<span class="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">✕ CANC</span>'
                  }[stat] || stat;
                  const d = new Date(c.scheduled_at);
                  const isFuture = d >= new Date();
                  return `<tr class="border-t border-slate-100 hover:bg-slate-50">
                    <td class="p-2 whitespace-nowrap">
                      <div class="font-bold">${d.toLocaleDateString('es', {weekday:'short', day:'numeric', month:'short'})}</div>
                      <div class="text-[10px] text-slate-500">${d.toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'})} · ${c.duration_min||60}min</div>
                    </td>
                    <td class="p-2 max-w-[150px]"><button onclick="eduShowStudentDetail('${c.student_id}')" class="text-blue-600 hover:underline truncate text-left block">${(st?.full_name||'—').replace(/</g,'&lt;')}</button></td>
                    <td class="p-2 max-w-[220px]">
                      <div class="font-medium">${mot ? mot.label : (c.motivo || c.type || '—')}</div>
                      ${c.topic ? `<div class="text-[10px] text-slate-500 truncate" title="${(c.topic||'').replace(/"/g,'&quot;')}">${(c.topic||'').replace(/</g,'&lt;')}</div>` : ''}
                    </td>
                    <td class="p-2 max-w-[120px]"><div class="truncate">${(c.attended_by||'—').replace(/</g,'&lt;')}</div></td>
                    <td class="p-2">${statBadge}${c.status_reason ? `<div class="text-[9px] text-slate-500 truncate max-w-[100px]" title="${(c.status_reason||'').replace(/"/g,'&quot;')}">${(c.status_reason||'').replace(/</g,'&lt;')}</div>` : ''}</td>
                    <td class="p-2">${c.evidence_url ? `<a href="${c.evidence_url}" target="_blank" class="text-[10px] text-blue-600 hover:underline">${osIcon('paperclip',{size:10})} ver</a>` : '<span class="text-[10px] text-slate-300">—</span>'}</td>
                    <td class="p-2 text-right whitespace-nowrap">
                      ${isFuture ? `
                        <button onclick="eduCallSendInvite('${c.id}')" class="text-[10px] text-blue-700 hover:underline mr-1" title="Enviar invitación por correo">${osIcon('mail')}</button>
                        <button onclick="eduCallDownloadICS('${c.id}')" class="text-[10px] text-violet-700 hover:underline mr-1" title="Descargar invitación .ics">${osIcon('calendar')}</button>
                      ` : ''}
                      <button onclick="eduCallOpenResult('${c.id}')" class="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold mr-1">Marcar</button>
                      <button onclick="eduCallEdit('${c.id}')" class="text-[10px] text-slate-600 hover:text-slate-900 mr-1" title="Editar">${osIcon('pencil')}</button>
                      <button onclick="eduCallDelete('${c.id}')" class="text-[10px] text-red-600 hover:text-red-800" title="Eliminar">${osIcon('trash')}</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>
  `;
}

// ─── Modal: agendar nueva sesión ───
async function eduAgendarCallNueva(presetStudentId) {
  const students = eduMyStudents();
  if (!students.length) return alert('Sin estudiantes en la mentoría. Sincronizá primero.');
  const motivos = eduGetMotivos();
  const now = new Date(); now.setMinutes(0,0,0); now.setHours(now.getHours() + 1);
  const defaultDate = now.toISOString().slice(0,16);
  const coachDefault = (state.user && state.user.email) || '';
  const studentOpts = students.map(s => `<option value="${s.id}" ${presetStudentId===s.id?'selected':''} data-email="${(s.email||'').replace(/"/g,'&quot;')}">${(s.full_name||'').replace(/</g,'&lt;')}${s.email?' · '+s.email:''}</option>`).join('');
  const motivoOpts = motivos.map(m => `<option value="${m.id}">${m.emoji||''} ${m.label}</option>`).join('');

  const html = `
    <div class="space-y-3">
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Estudiante *</label>
        <select id="ec-student" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" onchange="eduCallOnStudentChange()">
          <option value="">— Selecciona —</option>
          ${studentOpts}
        </select>
        <div id="ec-student-email-hint" class="text-[10px] text-slate-500 mt-1"></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Fecha y hora *</label>
          <input id="ec-datetime" type="datetime-local" value="${defaultDate}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Duración (min)</label>
          <input id="ec-duration" type="number" value="60" min="15" step="15" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Motivo *</label>
        <select id="ec-motivo" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
          <option value="">— Categoría —</option>
          ${motivoOpts}
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tema específico (texto libre)</label>
        <input id="ec-topic" type="text" placeholder="Ej. Revisión buybox Austin SE + 3 comps" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
      </div>

      <!-- ── ASISTENTES Y UBICACIÓN ── -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
        <div class="text-[10px] font-bold uppercase text-blue-800">${osIcon('mail')} Asistentes que reciben invitación</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Coach que atiende (email) *</label>
            <input id="ec-coach" type="email" value="${coachDefault.replace(/"/g,'&quot;')}" placeholder="coach@empresa.com" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Status inicial</label>
            <select id="ec-status" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="pendiente">${osIcon('loader')} Pendiente</option>
              <option value="confirmado">${osIcon('check-circle')} Confirmado</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-600 mb-1">Asistentes adicionales (emails separados por coma)</label>
          <textarea id="ec-attendees" rows="2" placeholder="otro_coach@empresa.com, partner@empresa.com, observador@empresa.com" class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
          <div class="text-[10px] text-slate-500 mt-0.5">El estudiante (su email) + el coach se agregan automáticamente. Aquí agregás extras.</div>
        </div>
      </div>

      <!-- ── LUGAR / VIDEO LLAMADA ── -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Lugar / plataforma</label>
          <input id="ec-location" type="text" placeholder="Zoom, Google Meet, Oficina..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">URL de la reunión</label>
          <input id="ec-meeting-url" type="url" placeholder="https://meet.google.com/..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Notas / Agenda (opcional)</label>
        <textarea id="ec-notes" rows="3" placeholder="Puntos a tratar..." class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
      </div>

      <div class="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded p-2">
        <input type="checkbox" id="ec-send-invites" checked />
        <label for="ec-send-invites" class="text-xs text-slate-700"><strong>${osIcon('upload')} Enviar invitaciones por correo al guardar</strong> (abre tu cliente de email con .ics adjunto y todos los emails como destinatarios)</label>
      </div>

      <div class="flex gap-2">
        <button onclick="eduCallSave()" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold py-2.5 rounded-lg">${osIcon('save')} Agendar sesión</button>
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">Cancelar</button>
      </div>
    </div>
  `;
  openModal('Nueva sesión', html);
  if (presetStudentId) setTimeout(eduCallOnStudentChange, 50);
}

function eduCallOnStudentChange() {
  const sel = document.getElementById('ec-student');
  const opt = sel.options[sel.selectedIndex];
  const email = opt ? opt.getAttribute('data-email') : '';
  const hint = document.getElementById('ec-student-email-hint');
  if (!hint) return;
  if (email) {
    hint.innerHTML = `✓ Email del estudiante: <strong>${email}</strong> — recibirá invitación automáticamente.`;
    hint.className = 'text-[10px] text-emerald-700 mt-1';
  } else {
    hint.innerHTML = `${osIcon('alert')} Este estudiante <strong>no tiene email en el CRM</strong>. Editalo primero o agregalo manualmente en "asistentes adicionales" abajo.`;
    hint.className = 'text-[10px] text-amber-700 mt-1';
  }
}

async function eduCallSave() {
  const studentId = document.getElementById('ec-student').value;
  const datetime = document.getElementById('ec-datetime').value;
  const duration = +document.getElementById('ec-duration').value || 60;
  const motivo = document.getElementById('ec-motivo').value;
  const topic = document.getElementById('ec-topic').value.trim();
  const coach = document.getElementById('ec-coach').value.trim();
  const status = document.getElementById('ec-status').value;
  const notes = document.getElementById('ec-notes').value.trim();
  const attendeesRaw = document.getElementById('ec-attendees').value.trim();
  const location = document.getElementById('ec-location').value.trim();
  const meetingUrl = document.getElementById('ec-meeting-url').value.trim();
  const sendInvites = document.getElementById('ec-send-invites').checked;

  if (!studentId) return alert('Falta estudiante.');
  if (!datetime) return alert('Falta fecha y hora.');
  if (!motivo) return alert('Falta motivo.');

  // Parsear asistentes
  const extraEmails = attendeesRaw.split(/[,;\s\n]+/).map(s => s.trim()).filter(s => s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));

  const { data: inserted, error } = await sb.from('edu_student_calls').insert({
    mentorship_id: eduState.mentorshipId,
    student_id: studentId,
    scheduled_at: new Date(datetime).toISOString(),
    duration_min: duration,
    motivo,
    topic: topic || null,
    attended_by: coach || null,
    status_attendance: status,
    notes_md: notes || null,
    attendee_emails: extraEmails,
    location: location || null,
    meeting_url: meetingUrl || null,
    type: 'mentoring'
  }).select().single();

  if (error) return alert('Error: '+error.message);
  closeModal();
  await eduLoadAll();
  eduRender();

  if (sendInvites && inserted) {
    // Disparar envío de invitación multi-destinatario
    setTimeout(() => eduCallSendInvite(inserted.id, true), 200);
  }
}

// ─── Modal: marcar resultado (status + motivo + evidencia + resumen) ───
function eduCallOpenResult(callId) {
  const c = (eduState.calls || []).find(x => x.id === callId);
  if (!c) return;
  const motivos = eduGetMotivos();
  const motivoOpts = motivos.map(m => `<option value="${m.id}" ${c.motivo===m.id?'selected':''}>${m.emoji||''} ${m.label}</option>`).join('');

  const html = `
    <div class="space-y-3">
      <div class="bg-slate-50 border border-slate-200 rounded p-2 text-xs">
        <div class="font-bold">${new Date(c.scheduled_at).toLocaleString('es', {dateStyle:'full', timeStyle:'short'})}</div>
        <div class="text-slate-600">${c.topic || 'Sin tema'}</div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Status de asistencia *</label>
        <div class="grid grid-cols-2 gap-1">
          ${['asistio','no_asistio','reprogramo','cancelo','confirmado','pendiente'].map(s => {
            const labels = { asistio:'✓ Asistió', no_asistio:'✗ No asistió', reprogramo:'Reprogramó', cancelo:'✕ Canceló', confirmado:'Confirmado', pendiente:'Pendiente' };
            const sel = (c.status_attendance || 'pendiente') === s;
            return `<button type="button" onclick="document.getElementById('ec-r-status').value='${s}'; document.querySelectorAll('.ec-r-stat-btn').forEach(b=>b.classList.remove('bg-amber-500','text-white')); this.classList.add('bg-amber-500','text-white');" class="ec-r-stat-btn px-3 py-1.5 rounded border border-slate-300 text-xs font-bold ${sel?'bg-amber-500 text-white':'bg-white hover:bg-slate-50'}">${labels[s]}</button>`;
          }).join('')}
        </div>
        <input type="hidden" id="ec-r-status" value="${c.status_attendance||'pendiente'}"/>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Motivo si no asistió / reprogramó / canceló</label>
        <input id="ec-r-reason" type="text" value="${(c.status_reason||'').replace(/"/g,'&quot;')}" placeholder="Ej. Conflicto laboral · Falta de preparación · Emergencia familiar" class="w-full border border-slate-300 rounded px-3 py-2 text-xs"/>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Atendió (coach)</label>
          <input id="ec-r-coach" type="text" value="${(c.attended_by||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Motivo (categoría)</label>
          <select id="ec-r-motivo" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
            <option value="">—</option>
            ${motivoOpts}
          </select>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Evidencia (URL — Drive, Zoom recording, Notion, etc.)</label>
        <input id="ec-r-evidence" type="url" value="${(c.evidence_url||'').replace(/"/g,'&quot;')}" placeholder="https://..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">${osIcon('star')} Calificación de la sesión (preparación + interés del estudiante)</label>
        <div class="flex items-center gap-2">
          ${[1,2,3,4,5].map(n => `<button type="button" onclick="document.getElementById('ec-r-rating').value=${n}; document.querySelectorAll('.ec-r-star').forEach((s,i)=>s.classList.toggle('text-amber-500', i<${n}));" class="ec-r-star text-3xl ${(+c.rating||0)>=n?'text-amber-500':'text-slate-300'}">★</button>`).join('')}
          <input type="hidden" id="ec-r-rating" value="${c.rating||''}"/>
          <span class="text-[10px] text-slate-500 ml-2">1=muy pobre · 5=excelente</span>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Resumen post-sesión (qué se cubrió / próximos pasos)</label>
        <textarea id="ec-r-summary" rows="4" class="w-full border border-slate-300 rounded px-3 py-2 text-xs">${escapeHtml(c.summary || c.notes_md || '')}</textarea>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded p-2 text-[11px] text-blue-800">
        ${osIcon('lightbulb')} Si el status es "reprogramó", al guardar te ofrezco crear la nueva sesión vinculada.
      </div>
      <div class="flex gap-2">
        <button onclick="eduCallSaveResult('${callId}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-lg">${osIcon('save')} Guardar resultado</button>
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">Cancelar</button>
      </div>
    </div>
  `;
  openModal('Marcar resultado de la sesión', html);
}

async function eduCallSaveResult(callId) {
  const c = (eduState.calls || []).find(x => x.id === callId);
  if (!c) return;
  const ratingVal = +document.getElementById('ec-r-rating').value || null;
  const update = {
    status_attendance: document.getElementById('ec-r-status').value,
    status_reason: document.getElementById('ec-r-reason').value.trim() || null,
    attended_by: document.getElementById('ec-r-coach').value.trim() || null,
    motivo: document.getElementById('ec-r-motivo').value || c.motivo,
    evidence_url: document.getElementById('ec-r-evidence').value.trim() || null,
    summary: document.getElementById('ec-r-summary').value.trim() || null,
    rating: ratingVal,
    attended: document.getElementById('ec-r-status').value === 'asistio',
    updated_at: new Date().toISOString()
  };
  // safeUpdate por si 'rating' no existe en el schema todavía
  const { error } = await (window.safeUpdate
    ? window.safeUpdate(p => sb.from('edu_student_calls').update(p).eq('id', callId), update)
    : sb.from('edu_student_calls').update(update).eq('id', callId));
  if (error) return alert('Error: '+error.message);

  // Si reprogramó, ofrecer crear nueva sesión
  if (update.status_attendance === 'reprogramo' && confirm('¿Crear la nueva sesión reprogramada?')) {
    closeModal();
    setTimeout(() => eduAgendarCallNueva(c.student_id), 100);
  } else {
    closeModal();
  }
  await eduLoadAll();
  eduRender();
}

async function eduCallDelete(id) {
  if (!confirm('¿Eliminar esta sesión? No se puede deshacer.')) return;
  await sb.from('edu_student_calls').delete().eq('id', id);
  await eduLoadAll();
  eduRender();
}

async function eduCallEdit(id) {
  const c = (eduState.calls || []).find(x => x.id === id);
  if (!c) return;
  // Reusa el modal nuevo pero pre-llena valores
  await eduAgendarCallNueva(c.student_id);
  setTimeout(() => {
    document.getElementById('ec-datetime').value = new Date(c.scheduled_at).toISOString().slice(0,16);
    document.getElementById('ec-duration').value = c.duration_min || 60;
    if (c.motivo) document.getElementById('ec-motivo').value = c.motivo;
    if (c.topic) document.getElementById('ec-topic').value = c.topic;
    if (c.attended_by) document.getElementById('ec-coach').value = c.attended_by;
    if (c.status_attendance) document.getElementById('ec-status').value = c.status_attendance;
    if (c.notes_md) document.getElementById('ec-notes').value = c.notes_md;
    // Cambia el botón a "Actualizar"
    const btn = document.querySelector('#modal-body button[onclick="eduCallSave()"]');
    if (btn) { btn.textContent = 'Actualizar sesión'; btn.setAttribute('onclick', `eduCallUpdate('${id}')`); }
  }, 50);
}

async function eduCallUpdate(id) {
  const update = {
    student_id: document.getElementById('ec-student').value,
    scheduled_at: new Date(document.getElementById('ec-datetime').value).toISOString(),
    duration_min: +document.getElementById('ec-duration').value || 60,
    motivo: document.getElementById('ec-motivo').value,
    topic: document.getElementById('ec-topic').value.trim() || null,
    attended_by: document.getElementById('ec-coach').value.trim() || null,
    status_attendance: document.getElementById('ec-status').value,
    notes_md: document.getElementById('ec-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('edu_student_calls').update(update).eq('id', id);
  if (error) return alert('Error: '+error.message);
  closeModal();
  await eduLoadAll();
  eduRender();
}

// ─── Invitación por correo: ICS + mailto (multi-destinatario) ───

// Recolecta todos los emails de asistentes (estudiante + coach + extras), únicos.
function eduCallCollectAttendees(c, student) {
  const set = new Set();
  if (student && student.email) set.add(student.email.toLowerCase().trim());
  if (c.attended_by && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.attended_by)) set.add(c.attended_by.toLowerCase().trim());
  (c.attendee_emails || []).forEach(e => { if (e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) set.add(e.toLowerCase().trim()); });
  return [...set];
}

function eduCallBuildICS(c, student, motivo) {
  const start = new Date(c.scheduled_at);
  const end = new Date(start.getTime() + (c.duration_min || 60) * 60000);
  const fmt = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d+/, '');
  const uid = (c.id || ('uid-'+Date.now())) + '@empresa-os';
  const summary = (motivo ? motivo.label : c.motivo || 'Sesión') + (c.topic ? ' · ' + c.topic : '');
  const descParts = [];
  if (c.topic) descParts.push(c.topic);
  if (c.notes_md) descParts.push(c.notes_md);
  if (c.meeting_url) descParts.push('Link: ' + c.meeting_url);
  if (c.attended_by) descParts.push('Coach: ' + c.attended_by);
  const desc = descParts.join('\\n\\n').replace(/\n/g, '\\n').replace(/,/g, '\\,');
  const allAttendees = eduCallCollectAttendees(c, student);

  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//EmpresaOS//Edu//ES','METHOD:REQUEST','CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:'+uid,
    'DTSTAMP:'+fmt(new Date()),
    'DTSTART:'+fmt(start),
    'DTEND:'+fmt(end),
    'SUMMARY:'+summary,
    desc ? 'DESCRIPTION:'+desc : '',
    c.location ? 'LOCATION:'+ (c.meeting_url ? (c.location + ' ' + c.meeting_url) : c.location) : (c.meeting_url ? 'LOCATION:'+c.meeting_url : ''),
    c.meeting_url ? 'URL:'+c.meeting_url : '',
    // Validar email del coach antes de meterlo como ORGANIZER (un valor "Daniel" sin @ rompe el ICS)
    (c.attended_by && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.attended_by)) ? 'ORGANIZER;CN='+c.attended_by+':mailto:'+c.attended_by : '',
    ...allAttendees.map(em => {
      const role = (em === (c.attended_by||'').toLowerCase()) ? 'CHAIR' : 'REQ-PARTICIPANT';
      const cn = (student && student.email && em === student.email.toLowerCase()) ? (student.full_name || '') : '';
      return `ATTENDEE;CN=${cn};ROLE=${role};RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${em}`;
    }),
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT','END:VCALENDAR'
  ].filter(Boolean);
  return lines.join('\r\n');
}

function eduCallDownloadICS(id) {
  const c = (eduState.calls || []).find(x => x.id === id);
  if (!c) return;
  const student = (eduState.students || []).find(s => s.id === c.student_id);
  const motivo = eduGetMotivos().find(m => m.id === c.motivo);
  const ics = eduCallBuildICS(c, student, motivo);
  const blob = new Blob([ics], { type:'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `sesion-${(student?.full_name||'estudiante').replace(/\s+/g,'_')}-${new Date(c.scheduled_at).toISOString().slice(0,10)}.ics`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Construye URL de Google Calendar TEMPLATE — abre Google Calendar con el evento
// pre-llenado y los emails como guests. El user solo da "Save" y Google manda
// las invitaciones nativas (que SÍ funcionan en Gmail/Outlook/Apple, no como
// el mailto+ICS attach que falla en Gmail web).
function eduCallGoogleCalendarUrl(c, student, motivo, attendees) {
  const start = new Date(c.scheduled_at);
  const end = new Date(start.getTime() + (c.duration_min || 60) * 60000);
  const fmt = d => d.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
  const title = (motivo ? motivo.label : c.motivo || 'Sesión') + (c.topic ? ' · ' + c.topic : '');
  const detailParts = [];
  if (c.topic) detailParts.push('Tema: ' + c.topic);
  if (student) detailParts.push('Estudiante: ' + (student.full_name || ''));
  if (c.attended_by) detailParts.push('Coach: ' + c.attended_by);
  if (c.meeting_url) detailParts.push('Link: ' + c.meeting_url);
  if (c.notes_md) detailParts.push('\n' + c.notes_md);
  const details = detailParts.join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details
  });
  if (c.location || c.meeting_url) params.set('location', c.location || c.meeting_url || '');
  if (attendees && attendees.length) params.set('add', attendees.join(','));
  return 'https://calendar.google.com/calendar/render?' + params.toString();
}

function eduCallSendInvite(id, silent) {
  const c = (eduState.calls || []).find(x => x.id === id);
  if (!c) return;
  const student = (eduState.students || []).find(s => s.id === c.student_id);
  if (!student) {
    if (window.toast) toast('Estudiante no encontrado', 'error');
    else alert('Estudiante no encontrado');
    return;
  }
  const attendees = eduCallCollectAttendees(c, student);
  if (!attendees.length) {
    if (!silent) {
      if (window.toast) toast('No hay emails de destinatarios. Editá la sesión y agregalos.', 'warning');
      else alert('No hay emails de destinatarios. Agregalos en el modal de edición.');
    }
    return;
  }

  const motivo = eduGetMotivos().find(m => m.id === c.motivo);
  const gcalUrl = eduCallGoogleCalendarUrl(c, student, motivo, attendees);

  // Abrir Google Calendar con el evento pre-llenado + guests. El user da "Save"
  // y Google manda las invitaciones nativas a cada attendee.
  window.open(gcalUrl, '_blank');

  // Marcar email_sent_at + invite_meta
  sb.from('edu_student_calls').update({
    email_sent_at: new Date().toISOString(),
    invite_meta: { sent_to: attendees, count: attendees.length, at: new Date().toISOString(), method: 'gcal' }
  }).eq('id', id).then(() => {});

  if (!silent) {
    const msg = `Se abrió Google Calendar con la invitación para ${attendees.length} persona(s).\n\nRevisá los datos y dale "Guardar" — Google manda las invitaciones automáticamente.`;
    if (window.toast) toast(msg, 'info');
    else alert(msg);
  }
}
