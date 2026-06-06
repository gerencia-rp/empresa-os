// ============================================================
// 💬 WhatsApp Masivo IA — Sistema 5 de Educación
// Genera mensajes personalizados con Claude basados en etapa+plan
// Envía via wa.me individual + captura respuestas + analiza con IA
// para actualizar el plan automáticamente.
// ============================================================

const wpsState = {
  sys: null,
  campaigns: [],
  activeCampaignId: null,
  activeView: 'list',      // list | new | detail
  // Filtros para nueva campaña
  newCampaign: {
    name: '',
    prompt_template: 'Hola {nombre}, te escribo para hacer seguimiento de tu plan en la mentoría. Específicamente sobre tu etapa actual y tareas pendientes.',
    filters: {
      etapa: 'all',
      grupo: 'all',
      status: 'all',
      inactivos_dias: 0
    },
    preview_count: 0
  },
  messages: [],
  loading: false,
  responseModal: null      // { messageId, text } abierto?
};

async function openEduWhatsappSystem(sys) {
  wpsState.sys = sys;
  openModal('💬 ' + (sys.name || 'WhatsApp Masivo IA'), '<div id="wps-root">Cargando...</div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  await wpsLoad();
  wpsRender();
}

async function wpsLoad() {
  wpsState.loading = true;
  // Asumimos eduState.students ya cargado por education.js
  if (!eduState || !eduState.students || !eduState.students.length) {
    if (typeof eduLoadAll === 'function') await eduLoadAll();
  }
  const { data: campaigns } = await sb.from('edu_whatsapp_campaigns')
    .select('*')
    .order('created_at', { ascending: false }).limit(50);
  wpsState.campaigns = campaigns || [];

  if (wpsState.activeCampaignId) {
    const { data: msgs } = await sb.from('edu_whatsapp_messages')
      .select('*, student:edu_students(id,full_name,phone,email,current_stage)')
      .eq('campaign_id', wpsState.activeCampaignId)
      .order('created_at');
    wpsState.messages = msgs || [];
  }
  wpsState.loading = false;
}

function wpsRender() {
  const root = document.getElementById('wps-root');
  if (!root) return;
  if (wpsState.loading) { root.innerHTML = '<div class="p-8 text-slate-500">⏳ Cargando...</div>'; return; }

  if (wpsState.activeView === 'new') return wpsRenderNew();
  if (wpsState.activeView === 'detail' && wpsState.activeCampaignId) return wpsRenderDetail();
  return wpsRenderList();
}

function wpsRenderList() {
  const root = document.getElementById('wps-root');
  const cs = wpsState.campaigns;
  root.innerHTML = `
    <div class="space-y-3">
      <!-- 🚀 Botón gigante de seguimiento semanal -->
      <div class="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-4 text-white shadow-lg">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex-1 min-w-0">
            <div class="text-[10px] font-bold uppercase opacity-80 tracking-wider">⚡ Modo rápido</div>
            <div class="text-xl font-bold mt-0.5">Seguimiento semanal en 1 click</div>
            <div class="text-xs opacity-90 mt-1">Plantilla pre-armada con nombre + etapa + tareas pendientes. Sin IA, sin esperas.</div>
          </div>
          <button onclick="wpsOpenQuickWeekly()" class="bg-white text-emerald-700 font-bold text-sm px-4 py-3 rounded-lg shadow hover:bg-emerald-50 whitespace-nowrap">📤 Empezar →</button>
        </div>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div class="text-xs font-bold uppercase text-slate-700">💬 Campañas con IA (modo avanzado)</div>
          <div class="text-lg font-bold text-slate-900">${cs.length} campañas</div>
          <div class="text-[11px] text-slate-600">IA personaliza cada mensaje · tarda 1-3 min · ideal para mensajes complejos</div>
        </div>
        <button onclick="wpsState.activeView='new'; wpsRender()" class="bg-slate-900 hover:bg-slate-700 text-white font-bold text-sm px-4 py-2.5 rounded-lg">+ Nueva campaña IA</button>
      </div>

      ${cs.length === 0 ? `<div class="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">Sin campañas todavía. Click "+ Nueva campaña" para empezar.</div>` : `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50"><tr class="text-[10px] uppercase text-slate-600">
              <th class="text-left p-2">Nombre</th>
              <th class="text-left p-2">Status</th>
              <th class="text-right p-2">Destinatarios</th>
              <th class="text-right p-2">Enviados</th>
              <th class="text-right p-2">Respondidos</th>
              <th class="text-left p-2">Fecha</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${cs.map(c => {
                const statBadge = {
                  draft: '<span class="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">BORRADOR</span>',
                  generating: '<span class="bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-bold">🧠 GENERANDO</span>',
                  ready: '<span class="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ LISTA</span>',
                  sending: '<span class="bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded text-[9px] font-bold">📤 ENVIANDO</span>',
                  completed: '<span class="bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold">✅ COMPLETA</span>',
                  archived: '<span class="bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">📁 ARCHIVADA</span>'
                }[c.status] || c.status;
                return `<tr class="border-t border-slate-100 hover:bg-slate-50">
                  <td class="p-2 font-medium">${(c.name||'?').replace(/</g,'&lt;')}</td>
                  <td class="p-2">${statBadge}</td>
                  <td class="p-2 text-right">${c.total_recipients||0}</td>
                  <td class="p-2 text-right text-blue-700">${c.sent_count||0}</td>
                  <td class="p-2 text-right text-emerald-700 font-bold">${c.responded_count||0}</td>
                  <td class="p-2 text-[10px] text-slate-500">${new Date(c.created_at).toLocaleDateString('es')}</td>
                  <td class="p-2 text-right">
                    <button onclick="wpsOpenDetail('${c.id}')" class="text-blue-700 text-[10px] hover:underline">abrir →</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function wpsRenderNew() {
  const root = document.getElementById('wps-root');
  const allStudents = (eduState.students || []).filter(s => !eduState.mentorshipId || s.mentorship_id === eduState.mentorshipId);
  const f = wpsState.newCampaign.filters;
  const filtered = wpsFilterStudents(allStudents, f);

  // Listar etapas y grupos únicos
  const etapas = [...new Set(allStudents.map(s => s.current_stage).filter(Boolean))].sort();
  const grupos = [...new Set(allStudents.map(s => s.grupo).filter(Boolean))].sort();

  root.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <button onclick="wpsState.activeView='list'; wpsRender()" class="text-xs text-slate-600 hover:text-slate-900">← Volver a campañas</button>
        <div class="text-sm font-bold">📝 Nueva campaña</div>
      </div>

      <!-- Nombre + prompt -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Nombre de la campaña *</label>
          <input id="wps-name" type="text" placeholder="Ej. Seguimiento semanal enero" value="${(wpsState.newCampaign.name||'').replace(/"/g,'&quot;')}" oninput="wpsState.newCampaign.name=this.value" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Brief para la IA *</label>
          <textarea id="wps-prompt" rows="4" oninput="wpsState.newCampaign.prompt_template=this.value" placeholder="Describí qué querés que diga el mensaje. La IA va a personalizar por estudiante usando su etapa, capital, FICO, plan activo, última sesión y tareas pendientes." class="w-full border border-slate-300 rounded px-3 py-2 text-xs">${(wpsState.newCampaign.prompt_template||'').replace(/</g,'&lt;')}</textarea>
          <div class="text-[10px] text-slate-500 mt-1">Ejemplos: "Hacé seguimiento sobre su próxima oferta" · "Recordá la sesión de mañana" · "Felicitalo por avanzar a la siguiente etapa"</div>
        </div>
      </div>

      <!-- Filtros de selección -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <div class="text-xs font-bold uppercase text-blue-800">🎯 Filtros de destinatarios</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Etapa</label>
            <select onchange="wpsState.newCampaign.filters.etapa=this.value; wpsRender()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs">
              <option value="all" ${f.etapa==='all'?'selected':''}>Todas</option>
              ${etapas.map(e => `<option value="${e}" ${f.etapa===e?'selected':''}>${e.replace(/</g,'&lt;')}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Grupo</label>
            <select onchange="wpsState.newCampaign.filters.grupo=this.value; wpsRender()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs">
              <option value="all" ${f.grupo==='all'?'selected':''}>Todos</option>
              ${grupos.map(g => `<option value="${g}" ${f.grupo===g?'selected':''}>${g.replace(/</g,'&lt;')}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Status</label>
            <select onchange="wpsState.newCampaign.filters.status=this.value; wpsRender()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs">
              <option value="all" ${f.status==='all'?'selected':''}>Todos</option>
              <option value="active" ${f.status==='active'?'selected':''}>Activos</option>
              <option value="at_risk" ${f.status==='at_risk'?'selected':''}>En riesgo</option>
              <option value="paused" ${f.status==='paused'?'selected':''}>Pausados</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Inactivos >X días</label>
            <input type="number" min="0" max="365" value="${f.inactivos_dias||0}" oninput="wpsState.newCampaign.filters.inactivos_dias=+this.value; wpsRender()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"/>
          </div>
        </div>
        <div class="bg-white border border-blue-300 rounded p-2 text-xs">
          <strong>${filtered.length}</strong> estudiante(s) van a recibir el mensaje
          ${(() => {
            const sinTel = filtered.filter(s => {
              const p = typeof eduCleanPhone === 'function' ? eduCleanPhone(s.phone) : (s.phone||'').replace(/\D/g,'');
              return !p || p.length < 10;
            }).length;
            if (sinTel === 0) return '<span class="text-emerald-700 ml-2 font-bold">✓ Todos con teléfono válido</span>';
            if (sinTel === filtered.length) return `<span class="text-amber-700 ml-2">⚠️ ${sinTel} sin teléfono (podés agregarlos al enviar)</span>`;
            return `<span class="text-amber-700 ml-2">⚠️ ${sinTel} sin teléfono</span>`;
          })()}
        </div>
      </div>

      <!-- Preview de destinatarios -->
      <details class="bg-white border border-slate-200 rounded-xl p-3">
        <summary class="cursor-pointer text-xs font-bold text-slate-700">👀 Ver destinatarios (${filtered.length})</summary>
        <div class="mt-2 max-h-48 overflow-y-auto">
          <table class="w-full text-[11px]">
            <thead><tr class="text-[9px] uppercase text-slate-500"><th class="text-left p-1">Nombre</th><th class="text-left p-1">Etapa</th><th class="text-left p-1">Teléfono</th></tr></thead>
            <tbody>
              ${filtered.slice(0,50).map(s => `<tr class="border-t border-slate-100"><td class="p-1 truncate max-w-[180px]">${(s.full_name||'?').replace(/</g,'&lt;')}</td><td class="p-1 text-slate-600">${(s.current_stage||'—').replace(/</g,'&lt;')}</td><td class="p-1 ${s.phone?'text-emerald-700':'text-amber-700'}">${s.phone || '—'}</td></tr>`).join('')}
            </tbody>
          </table>
          ${filtered.length > 50 ? `<div class="text-[10px] text-slate-500 italic text-center mt-1">+${filtered.length-50} más</div>` : ''}
        </div>
      </details>

      <div class="flex gap-2">
        <button onclick="wpsGenerateCampaign()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 rounded-lg">🧠 Generar mensajes con IA (${filtered.length})</button>
        <button onclick="wpsState.activeView='list'; wpsRender()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded-lg">Cancelar</button>
      </div>
    </div>
  `;
}

function wpsFilterStudents(students, f) {
  const todayIso = new Date().toISOString().slice(0,10);
  return students.filter(s => {
    if (f.etapa !== 'all' && s.current_stage !== f.etapa) return false;
    if (f.grupo !== 'all' && s.grupo !== f.grupo) return false;
    if (f.status !== 'all' && (s.status||'active') !== f.status) return false;
    if (f.inactivos_dias > 0) {
      const lastCall = (eduState.calls || []).filter(c => c.student_id === s.id && c.status_attendance === 'asistio')
        .sort((a,b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))[0];
      const lastDate = lastCall ? new Date(lastCall.scheduled_at) : new Date(s.created_at || s.enrolled_at || todayIso);
      const dias = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
      if (dias < f.inactivos_dias) return false;
    }
    return true;
  });
}

async function wpsGenerateCampaign() {
  const name = (wpsState.newCampaign.name || '').trim();
  const promptTpl = (wpsState.newCampaign.prompt_template || '').trim();
  if (!name) return alert('Falta nombre de campaña');
  if (!promptTpl) return alert('Falta el brief para la IA');

  const allStudents = (eduState.students || []).filter(s => !eduState.mentorshipId || s.mentorship_id === eduState.mentorshipId);
  const targets = wpsFilterStudents(allStudents, wpsState.newCampaign.filters);
  if (targets.length === 0) return alert('Sin destinatarios con esos filtros.');
  if (!confirm(`Generar mensajes personalizados para ${targets.length} estudiante(s)?\n\nEsto puede tardar 1-3 minutos.`)) return;

  // Crear campaña con safeInsert (descarta columnas inexistentes)
  const campaignPayload = {
    mentorship_id: eduState.mentorshipId,
    name,
    prompt_template: promptTpl,
    filtros: wpsState.newCampaign.filters,
    status: 'draft',
    total_recipients: targets.length,
    created_by: state.user.id
  };
  let campaign;
  if (typeof window.safeInsert === 'function') {
    const r = await window.safeInsert(() => sb.from('edu_whatsapp_campaigns'), campaignPayload, { single: true });
    if (r.error) return alert('Error: ' + (r.error.message || r.error));
    campaign = r.data;
  } else {
    const r = await sb.from('edu_whatsapp_campaigns').insert(campaignPayload).select().single();
    if (r.error) return alert('Error: ' + r.error.message);
    campaign = r.data;
  }

  // Llamar edge function
  const res = await fetch(`${window.SUPABASE_URL}/functions/v1/edu-whatsapp-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAccessToken()}` },
    body: JSON.stringify({
      campaign_id: campaign.id,
      mentorship_id: eduState.mentorshipId,
      student_ids: targets.map(s => s.id),
      prompt_template: promptTpl
    })
  });
  const r = await res.json();
  if (!r.ok) {
    alert('Error generando: ' + (r.error || 'fallo'));
    return;
  }

  // Reset state y abrir detalle
  wpsState.newCampaign = { name:'', prompt_template:wpsState.newCampaign.prompt_template, filters:{etapa:'all',grupo:'all',status:'all',inactivos_dias:0} };
  wpsState.activeCampaignId = campaign.id;
  wpsState.activeView = 'detail';
  // Pollear hasta que status sea 'ready'
  let attempts = 0;
  const poll = async () => {
    attempts++;
    await wpsLoad();
    const c = wpsState.campaigns.find(x => x.id === campaign.id);
    if (c && c.status === 'ready') {
      wpsRender();
      return;
    }
    if (attempts < 60) setTimeout(poll, 3000);
    else wpsRender();
  };
  wpsRender();
  poll();
}

async function wpsOpenDetail(campaignId) {
  wpsState.activeCampaignId = campaignId;
  wpsState.activeView = 'detail';
  await wpsLoad();
  wpsRender();
}

function wpsRenderDetail() {
  const root = document.getElementById('wps-root');
  const c = wpsState.campaigns.find(x => x.id === wpsState.activeCampaignId);
  if (!c) { root.innerHTML = '<div class="p-4">Campaña no encontrada</div>'; return; }
  const msgs = wpsState.messages;

  root.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <button onclick="wpsState.activeView='list'; wpsState.activeCampaignId=null; wpsRender()" class="text-xs text-slate-600 hover:text-slate-900">← Volver</button>
        <div class="text-sm font-bold">📋 ${(c.name||'').replace(/</g,'&lt;')}</div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-2">
        <div class="bg-slate-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-slate-600">Total</div><div class="text-2xl font-bold">${c.total_recipients||0}</div></div>
        <div class="bg-blue-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-blue-800">Enviados</div><div class="text-2xl font-bold">${c.sent_count||0}</div></div>
        <div class="bg-emerald-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-emerald-800">Respondidos</div><div class="text-2xl font-bold">${c.responded_count||0}</div></div>
        <div class="bg-amber-100 rounded p-2"><div class="text-[10px] uppercase font-bold text-amber-800">Pendientes</div><div class="text-2xl font-bold">${msgs.filter(m => m.status === 'pending').length}</div></div>
        <div class="bg-slate-200 rounded p-2"><div class="text-[10px] uppercase font-bold text-slate-700">Status</div><div class="text-xs font-bold">${c.status}</div></div>
      </div>

      ${c.status === 'generating' || c.status === 'draft' ? `
        <div class="bg-violet-50 border border-violet-200 rounded p-4 text-center">
          <div class="text-3xl animate-pulse">🧠</div>
          <div class="mt-2 font-bold text-violet-900">IA generando mensajes personalizados...</div>
          <div class="text-[10px] text-violet-700 mt-1">Esto puede tardar 1-3 minutos. Quedate en esta pestaña o volvé después.</div>
        </div>
      ` : ''}

      ${msgs.length === 0 && (c.status === 'ready' || c.status === 'completed') ? `<div class="p-6 text-center text-slate-500 bg-white border border-slate-200 rounded">Sin mensajes generados.</div>` : ''}

      ${msgs.length > 0 ? `
        <!-- Toolbar de acciones masivas -->
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
          <div class="text-xs font-bold text-emerald-900">⚡ Acciones rápidas:</div>
          <button onclick="wpsCheckAll(true)" class="text-[11px] bg-white border border-slate-300 hover:bg-slate-50 px-2 py-1 rounded font-bold">☑ Marcar todos pendientes</button>
          <button onclick="wpsCheckAll(false)" class="text-[11px] bg-white border border-slate-300 hover:bg-slate-50 px-2 py-1 rounded font-bold">☐ Desmarcar</button>
          <button onclick="wpsOpenSelected()" class="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded font-bold" title="Abre 1 wa.me por cada seleccionado (con pausa de 1s entre cada uno para evitar bloqueo)">📤 Abrir WhatsApp de los seleccionados</button>
          <button onclick="wpsMarkAllSent()" class="text-[11px] bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-bold" title="Marca como enviados los seleccionados (asume que ya los enviaste)">✓ Marcar enviados</button>
          <div class="ml-auto text-[10px] text-slate-500">💡 Tip: si el navegador bloquea los popups, autorizalos en la barra de URL.</div>
        </div>

        <div class="space-y-2 max-h-[60vh] overflow-y-auto">
          ${msgs.map(m => wpsRenderMessage(m)).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// ─── Helpers de selección masiva ───
function wpsCheckAll(checked) {
  document.querySelectorAll('[data-wps-msg-id]').forEach(cb => {
    if (!cb.disabled) cb.checked = checked;
  });
}

function wpsGetSelectedIds() {
  return Array.from(document.querySelectorAll('[data-wps-msg-id]:checked'))
    .map(cb => cb.getAttribute('data-wps-msg-id'));
}

async function wpsOpenSelected() {
  const ids = wpsGetSelectedIds();
  if (!ids.length) return alert('Seleccioná al menos un mensaje (checkbox a la izquierda del nombre).');
  if (!confirm(`Abrir ${ids.length} WhatsApp en pestañas separadas?\n\nEl navegador puede pedirte permitir popups. Si bloquea, autorizalos y reintentá.`)) return;

  let opened = 0, failed = 0, noPhone = 0;
  for (const id of ids) {
    const m = wpsState.messages.find(x => x.id === id);
    if (!m) continue;
    const s = m.student || {};
    const phoneClean = typeof eduCleanPhone === 'function' ? eduCleanPhone(s.phone || m.phone) : (s.phone||m.phone||'').replace(/\D/g,'');
    if (!phoneClean || phoneClean.length < 10) { noPhone++; continue; }
    const url = `https://wa.me/${phoneClean}?text=${encodeURIComponent(m.message_text)}`;
    const win = window.open(url, '_blank');
    if (win) {
      opened++;
      // marcar enviado en background
      wpsMarkSent(id).catch(() => {});
    } else {
      failed++;
    }
    // Pausa de 800ms para no saturar y dar tiempo al browser
    await new Promise(r => setTimeout(r, 800));
  }
  alert(`Resultado:\n✓ Abiertos: ${opened}\n⚠ Sin teléfono: ${noPhone}\n✗ Bloqueados (popup): ${failed}\n\n${failed > 0 ? 'Si hubo bloqueos: autorizá popups para este sitio y reintentá los faltantes.' : ''}`);
}

async function wpsMarkAllSent() {
  const ids = wpsGetSelectedIds();
  if (!ids.length) return alert('Seleccioná los que quieras marcar.');
  if (!confirm(`Marcar ${ids.length} mensajes como enviados?`)) return;
  for (const id of ids) {
    try { await wpsMarkSent(id); } catch {}
  }
  alert(`✓ ${ids.length} mensajes marcados como enviados.`);
}

// Editar número y enviar (para los que no tienen phone en DB)
function wpsEditPhoneAndSend(messageId, messageText) {
  const m = wpsState.messages.find(x => x.id === messageId);
  if (!m) return;
  const s = m.student || {};
  // Usar el flujo del WhatsApp rápido pero pre-cargado con el mensaje generado
  if (typeof eduOpenWhatsappQuick === 'function') {
    // Si el student existe en eduState, lo pasamos por ID. Sino, pasamos sólo el mensaje.
    if (s.id) {
      eduOpenWhatsappQuick(s.id, { message: messageText });
    } else {
      eduOpenWhatsappQuick(null, { message: messageText });
    }
  } else {
    alert('No se pudo abrir el editor.');
  }
}

window.wpsCheckAll = wpsCheckAll;
window.wpsOpenSelected = wpsOpenSelected;
window.wpsMarkAllSent = wpsMarkAllSent;
window.wpsEditPhoneAndSend = wpsEditPhoneAndSend;

function wpsRenderMessage(m) {
  const s = m.student || {};
  const stat = m.status || 'pending';
  const statBadge = {
    pending: '<span class="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">⏳ PEND</span>',
    sent: '<span class="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-bold">📤 ENV</span>',
    responded: '<span class="bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ RESP</span>',
    no_response: '<span class="bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-bold">⌛ SIN RESP</span>',
    failed: '<span class="bg-red-200 text-red-800 px-1.5 py-0.5 rounded text-[9px] font-bold">✗ FAIL</span>'
  }[stat] || stat;

  const phone = s.phone || m.phone || '';
  // Validar phone: usar eduCleanPhone que normaliza con CC default (configurable)
  const phoneClean = typeof eduCleanPhone === 'function' ? eduCleanPhone(phone) : (phone||'').replace(/\D/g,'');
  const phoneValid = phoneClean && phoneClean.length >= 10 && phoneClean.length <= 15;
  const waUrl = phoneValid ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(m.message_text)}` : null;

  return `
    <div class="bg-white border border-slate-200 rounded-lg p-3">
      <div class="flex items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <input type="checkbox" data-wps-msg-id="${m.id}" ${m.status==='pending'?'':'disabled'} class="mr-1 cursor-pointer"/>
          <div class="font-bold text-sm truncate">${(s.full_name||'?').replace(/</g,'&lt;')}</div>
          <div class="text-[10px] text-slate-500 truncate">${(s.current_stage||'').replace(/</g,'&lt;')}</div>
          ${statBadge}
        </div>
        <div class="flex gap-1">
          ${waUrl
            ? `<a href="${waUrl}" target="_blank" onclick="wpsMarkSent('${m.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2 py-1 rounded">📤 WhatsApp</a>`
            : `<button onclick="wpsEditPhoneAndSend('${m.id}', \`${(m.message_text||'').replace(/`/g,'\\\`').replace(/\\/g,'\\\\')}\`)" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded" title="Sin teléfono — editar y enviar">📞 Agregar nº</button>`
          }
          <button onclick="eduOpenWhatsappQuick('${s.id||''}', { message: \`${(m.message_text||'').replace(/`/g,'\\\`').replace(/\\/g,'\\\\')}\` })" class="bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold px-2 py-1 rounded" title="Abrir editor de WhatsApp rápido">✏️</button>
          <button onclick="wpsOpenResponseModal('${m.id}')" class="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-2 py-1 rounded" title="Pegar respuesta del estudiante y analizar con IA">📥 Resp</button>
        </div>
      </div>
      <div class="bg-emerald-50 border border-emerald-100 rounded p-2 text-xs whitespace-pre-wrap">${(m.message_text||'').replace(/</g,'&lt;')}</div>
      ${m.response_text ? `
        <div class="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
          <div class="text-[10px] font-bold text-blue-800 uppercase mb-1">💬 Respuesta del estudiante</div>
          <div class="text-xs whitespace-pre-wrap">${(m.response_text||'').replace(/</g,'&lt;')}</div>
        </div>
      ` : ''}
      ${m.response_analysis ? wpsRenderAnalysis(m.response_analysis, m.plan_updated) : ''}
    </div>
  `;
}

function wpsRenderAnalysis(a, planUpdated) {
  const sentBadge = {
    positivo:'bg-emerald-100 text-emerald-800',
    neutro:'bg-slate-100 text-slate-700',
    negativo:'bg-red-100 text-red-800',
    confundido:'bg-amber-100 text-amber-800',
    frustrado:'bg-orange-100 text-orange-800'
  }[a.sentimiento] || 'bg-slate-100 text-slate-700';
  const urgBadge = {alta:'bg-red-500 text-white', media:'bg-amber-500 text-white', baja:'bg-slate-400 text-white'}[a.urgencia] || 'bg-slate-400 text-white';
  return `
    <div class="mt-2 bg-violet-50 border border-violet-200 rounded p-2 space-y-1.5">
      <div class="flex items-center gap-2 flex-wrap text-[10px]">
        <span class="text-violet-800 font-bold uppercase">🧠 IA</span>
        <span class="${sentBadge} px-1.5 py-0.5 rounded font-bold">${(a.sentimiento||'').toUpperCase()}</span>
        <span class="${urgBadge} px-1.5 py-0.5 rounded font-bold">${(a.urgencia||'').toUpperCase()}</span>
        ${a.categoria ? `<span class="bg-slate-200 px-1.5 py-0.5 rounded">${a.categoria}</span>` : ''}
        ${planUpdated ? `<span class="bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold">✓ PLAN ACTUALIZADO</span>` : ''}
      </div>
      ${a.intencion ? `<div class="text-xs"><strong>Intención:</strong> ${a.intencion.replace(/</g,'&lt;')}</div>` : ''}
      ${a.accion_recomendada ? `<div class="text-xs"><strong>Acción recomendada:</strong> ${a.accion_recomendada.replace(/</g,'&lt;')}</div>` : ''}
      ${a.respuesta_sugerida ? `<div class="text-xs bg-white border border-violet-200 rounded p-1.5"><strong>📩 Respuesta sugerida:</strong><br>${a.respuesta_sugerida.replace(/</g,'&lt;')}</div>` : ''}
    </div>
  `;
}

async function wpsMarkSent(messageId) {
  await sb.from('edu_whatsapp_messages').update({
    status: 'sent',
    sent_at: new Date().toISOString()
  }).eq('id', messageId);
  // Incrementar sent_count
  const m = wpsState.messages.find(x => x.id === messageId);
  if (m) {
    const { data: c } = await sb.from('edu_whatsapp_campaigns').select('sent_count').eq('id', m.campaign_id).single();
    await sb.from('edu_whatsapp_campaigns').update({ sent_count: (c?.sent_count || 0) + 1 }).eq('id', m.campaign_id);
  }
  await wpsLoad();
  wpsRender();
}

function wpsOpenResponseModal(messageId) {
  wpsState.responseModal = { messageId, text: '' };
  const html = `
    <div class="space-y-3">
      <div class="text-xs text-slate-700">Pegá la respuesta del estudiante. La IA va a analizar, sugerir acción y actualizar el plan si corresponde.</div>
      <textarea id="wps-resp-text" rows="6" placeholder="Pegá acá lo que respondió el estudiante en WhatsApp..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"></textarea>
      <div class="flex gap-2">
        <button onclick="wpsSubmitResponse('${messageId}')" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm py-2.5 rounded">🧠 Analizar con IA</button>
        <button onclick="closeModal2()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2.5 rounded">Cancelar</button>
      </div>
    </div>
  `;
  // Crear modal de segundo nivel (no cierra el principal)
  const overlay = document.createElement('div');
  overlay.id = 'wps-resp-modal';
  overlay.className = 'fixed inset-0 z-[110] bg-slate-900/80 flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-xl w-full max-w-xl">
      <div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div class="text-sm font-bold">📥 Capturar respuesta</div>
        <button onclick="closeModal2()" class="text-2xl leading-none">×</button>
      </div>
      <div class="p-4">${html}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('wps-resp-text')?.focus(), 100);
}

window.closeModal2 = function() {
  document.getElementById('wps-resp-modal')?.remove();
};

// ════════════════════════════════════════════════════════════
// 💬 WhatsApp RÁPIDO — abre modal con número editable + mensaje
// Funciona desde cualquier parte (detalle estudiante, lista, etc.)
// y NO requiere campaña previa. Lectura/envío de 1 paso.
// ════════════════════════════════════════════════════════════
function eduGetDefaultCountryCode() {
  try { return localStorage.getItem('edu_wa_country_code') || '52'; } catch { return '52'; }
}
function eduSetDefaultCountryCode(cc) {
  try { localStorage.setItem('edu_wa_country_code', String(cc||'52')); } catch {}
}

// Normaliza un teléfono a formato wa.me. Default country = 52 (MX) configurable.
function eduCleanPhone(phone, defaultCC) {
  if (!phone) return '';
  let c = String(phone).replace(/\D/g, '');
  const cc = String(defaultCC || eduGetDefaultCountryCode() || '52');
  // Si empieza por 00, quitar
  if (c.startsWith('00')) c = c.slice(2);
  // Si tiene exactamente 10 dígitos (formato local), prefijar default country code
  if (c.length === 10) c = cc + c;
  // Si tiene 11 dígitos y empieza por "1" → ya tiene CC USA
  // Si tiene 12-13 dígitos → asumir ya tiene CC
  return c;
}

// Plantillas rápidas comunes
const EDU_WA_TEMPLATES = [
  { id: 'check', label: '👋 Check-in', text: 'Hola {nombre}, ¿cómo va todo? Hace tiempo no hablamos. ¿En qué puedo ayudarte esta semana?' },
  { id: 'sesion', label: '📅 Recordatorio sesión', text: 'Hola {nombre}, te recuerdo que tenemos sesión mañana. ¿Confirmás? Cualquier cosa avisame.' },
  { id: 'tarea', label: '✅ Pregunta por tarea', text: 'Hola {nombre}, ¿cómo vas con la tarea que quedó pendiente de la última sesión? Si tenés dudas, decime.' },
  { id: 'pago', label: '💰 Recordatorio pago', text: 'Hola {nombre}, te paso recordatorio amable que el pago de la mentoría está pendiente. Si querés, mandame el comprobante por acá.' },
  { id: 'agendar', label: '📆 Agendar sesión', text: 'Hola {nombre}, necesitamos agendar la próxima sesión. ¿Qué día te queda mejor esta semana? Tengo lunes y miércoles disponibles.' },
  { id: 'felic', label: '🎉 Felicitación', text: 'Hola {nombre}, vi que avanzaste mucho. Felicitaciones por el esfuerzo. Seguí así.' }
];

function eduOpenWhatsappQuick(studentId, opts) {
  opts = opts || {};
  const s = studentId
    ? (window.eduState?.students || []).find(x => x.id === studentId)
    : null;
  const initialPhone = (s?.phone || opts.phone || '');
  const initialMsg = opts.message || '';
  const cc = eduGetDefaultCountryCode();

  openModal('💬 Enviar WhatsApp', `
    <div class="space-y-3">
      ${s ? `
        <div class="bg-emerald-50 border border-emerald-200 rounded p-2">
          <div class="font-bold text-sm">${(s.full_name||'—').replace(/</g,'&lt;')}</div>
          <div class="text-[10px] text-slate-600">${(s.grupo || s.current_stage || '').replace(/</g,'&lt;')}</div>
        </div>
      ` : ''}

      <div class="grid grid-cols-3 gap-2">
        <div class="col-span-1">
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Cód. país</label>
          <input id="wa-cc" type="text" value="${cc}" maxlength="4" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono"/>
        </div>
        <div class="col-span-2">
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Número (sin código de país)</label>
          <input id="wa-phone" type="text" value="${initialPhone.replace(/\D/g,'').slice(-10)}" placeholder="5512345678" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono"/>
        </div>
      </div>
      <div class="text-[10px] text-slate-500">Si tu número ya incluye código país, igual funciona — lo limpio yo.</div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Plantillas rápidas</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-1">
          ${EDU_WA_TEMPLATES.map(t => `<button type="button" onclick="eduApplyTemplate('${t.id}', ${s ? `'${(s.full_name||'').replace(/'/g,"\\'")}'` : 'null'})" class="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-1 text-left">${t.label}</button>`).join('')}
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Mensaje</label>
        <textarea id="wa-msg" rows="6" class="w-full border border-emerald-300 rounded p-2 text-sm" placeholder="Escribí tu mensaje o usá una plantilla...">${initialMsg.replace(/</g,'&lt;')}</textarea>
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="eduCopyWaMessage()" class="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded" title="Copia solo el mensaje al portapapeles">📋 Copiar</button>
        <button onclick="eduSendWaQuick(${studentId ? `'${studentId}'` : 'null'})" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">💬 Abrir WhatsApp</button>
      </div>
    </div>
  `);
}

function eduApplyTemplate(templateId, studentName) {
  const t = EDU_WA_TEMPLATES.find(x => x.id === templateId);
  if (!t) return;
  const ta = document.getElementById('wa-msg');
  if (!ta) return;
  const nombre = (studentName || 'tú').split(' ')[0]; // sólo primer nombre
  ta.value = t.text.replace(/\{nombre\}/g, nombre);
  ta.focus();
}

function eduCopyWaMessage() {
  const ta = document.getElementById('wa-msg');
  if (!ta || !ta.value.trim()) return alert('Escribí un mensaje primero.');
  navigator.clipboard.writeText(ta.value).then(() => {
    const btn = document.querySelector('[onclick="eduCopyWaMessage()"]');
    if (btn) { const old = btn.innerHTML; btn.innerHTML = '✓ Copiado'; setTimeout(() => btn.innerHTML = old, 1500); }
  });
}

function eduSendWaQuick(studentId) {
  const cc = (document.getElementById('wa-cc').value || '52').replace(/\D/g,'');
  const phoneInput = (document.getElementById('wa-phone').value || '').replace(/\D/g,'');
  const msg = (document.getElementById('wa-msg').value || '').trim();
  if (!phoneInput) return alert('Falta el número.');
  if (!msg) return alert('Falta el mensaje.');

  // Persistir el cc default
  eduSetDefaultCountryCode(cc);

  // Construir número final: si phoneInput ya tiene 11+ asume CC incluido
  let finalPhone = phoneInput;
  if (phoneInput.length === 10) finalPhone = cc + phoneInput;
  if (phoneInput.length === 11 && phoneInput.startsWith('1')) finalPhone = phoneInput; // USA con 1
  // Si tiene 12+ dígitos asume CC ya está

  const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`;
  const win = window.open(url, '_blank');
  if (!win) {
    // Pop-up bloqueado — copiar y mostrar
    navigator.clipboard.writeText(url).then(() => alert('⚠️ El navegador bloqueó el popup. Copié el link al portapapeles — pegalo en una pestaña nueva.'));
    return;
  }
  closeModal();
}

window.eduOpenWhatsappQuick = eduOpenWhatsappQuick;
window.eduApplyTemplate = eduApplyTemplate;
window.eduCopyWaMessage = eduCopyWaMessage;
window.eduSendWaQuick = eduSendWaQuick;

// ════════════════════════════════════════════════════════════
// 🚀 SEGUIMIENTO SEMANAL en 1 click — sin IA, sin esperas
// Plantillas pre-armadas que sustituyen {nombre}, {etapa},
// {tareas_pendientes}, {dias_sin_contacto}. Crea campaña + mensajes
// directamente (no llama a Claude). Mucho más rápido y predecible.
// ════════════════════════════════════════════════════════════
const WPS_WEEKLY_TEMPLATES = [
  {
    id: 'general',
    label: '👋 Check-in semanal',
    desc: 'Para todos: cómo va la semana',
    text: '¡Hola {nombre}! 👋\n\n¿Cómo vas con tu plan esta semana? Veo que estás en la etapa de *{etapa}*.\n\n{tareas_pendientes_block}\n\nCualquier duda o si querés que agendemos sesión, decime.\n\nSeguimos. 💪'
  },
  {
    id: 'inactivos',
    label: '🔔 Activación inactivos',
    desc: 'Para los que llevan días sin contacto',
    text: 'Hola {nombre}, ¿cómo estás?\n\nHace {dias_sin_contacto} días que no hablamos y quería ver cómo vas con tu proceso. Estás en *{etapa}* y sé que puede ser desafiante.\n\n¿Hay algo en lo que pueda ayudarte? ¿Querés que agendemos una sesión esta semana?\n\nMe encantaría saber de vos. 🙌'
  },
  {
    id: 'tareas',
    label: '✅ Recordatorio de tareas',
    desc: 'Foco en tareas pendientes',
    text: 'Hola {nombre} 👋\n\nTe escribo para recordarte las tareas que tenés pendientes en tu plan:\n\n{tareas_pendientes_list}\n\n¿Cómo vas con eso? Si necesitás ayuda con alguna, avisame.'
  },
  {
    id: 'motivacion',
    label: '💪 Motivación + plan',
    desc: 'Mensaje motivacional con foco en próximo paso',
    text: '¡Buen día {nombre}! ☀️\n\nSé que el camino en la etapa *{etapa}* puede sentirse pesado a veces, pero cada paso cuenta.\n\n{tareas_pendientes_block}\n\nTu próximo objetivo está más cerca de lo que pensás. Si en algo te puedo ayudar esta semana, acá estoy. 🚀'
  },
  {
    id: 'sesion',
    label: '📅 Agendar sesión',
    desc: 'Pedir disponibilidad para próxima sesión',
    text: 'Hola {nombre} 👋\n\nQuiero agendar contigo la próxima sesión de mentoría. Estás avanzando en *{etapa}* y tengo cosas concretas que repasar contigo.\n\n¿Qué día te queda mejor esta semana? Mandame 2-3 opciones de horario y la confirmamos.\n\nSaludos!'
  }
];

const wpsQuickState = { templateId: 'general', filterStage: 'all', filterStatus: 'active', filterInactivos: 0, prefillName: '' };

function wpsOpenQuickWeekly() {
  const root = document.getElementById('wps-root');
  if (!root) return;

  const allStudents = (eduState.students || []).filter(s => !eduState.mentorshipId || s.mentorship_id === eduState.mentorshipId);
  const etapas = [...new Set(allStudents.map(s => s.current_stage).filter(Boolean))].sort();

  const filteredAll = wpsFilterQuickStudents(allStudents);
  const template = WPS_WEEKLY_TEMPLATES.find(t => t.id === wpsQuickState.templateId) || WPS_WEEKLY_TEMPLATES[0];

  // Preview de mensaje con el primer estudiante (si hay)
  const previewStudent = filteredAll[0] || { full_name: 'Juan Pérez', current_stage: 'Crédito', _daysWithoutContact: 7 };
  const previewMsg = wpsFillTemplate(template.text, previewStudent);

  root.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <button onclick="wpsState.activeView='list'; wpsRender()" class="text-xs text-slate-600 hover:text-slate-900">← Volver a campañas</button>
        <div class="text-sm font-bold">⚡ Seguimiento semanal rápido</div>
      </div>

      <!-- Elegir plantilla -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">1️⃣ Elegí la plantilla</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          ${WPS_WEEKLY_TEMPLATES.map(t => `
            <button onclick="wpsQuickState.templateId='${t.id}'; wpsOpenQuickWeekly()" class="text-left border-2 ${wpsQuickState.templateId===t.id?'border-emerald-500 bg-emerald-50':'border-slate-200 hover:border-slate-300'} rounded-lg p-2.5">
              <div class="font-bold text-sm">${t.label}</div>
              <div class="text-[10px] text-slate-500">${t.desc}</div>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Filtros simples -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">2️⃣ ¿A quiénes?</div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Etapa</label>
            <select onchange="wpsQuickState.filterStage=this.value; wpsOpenQuickWeekly()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs">
              <option value="all" ${wpsQuickState.filterStage==='all'?'selected':''}>Todas</option>
              ${etapas.map(e => `<option value="${e}" ${wpsQuickState.filterStage===e?'selected':''}>${e.replace(/</g,'&lt;')}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Status</label>
            <select onchange="wpsQuickState.filterStatus=this.value; wpsOpenQuickWeekly()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs">
              <option value="all" ${wpsQuickState.filterStatus==='all'?'selected':''}>Todos los activos</option>
              <option value="active" ${wpsQuickState.filterStatus==='active'?'selected':''}>Solo activos</option>
              <option value="at_risk" ${wpsQuickState.filterStatus==='at_risk'?'selected':''}>Solo at_risk</option>
              <option value="paused" ${wpsQuickState.filterStatus==='paused'?'selected':''}>Solo pausados</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Solo inactivos &gt; X días</label>
            <input type="number" min="0" max="365" value="${wpsQuickState.filterInactivos}" oninput="wpsQuickState.filterInactivos=+this.value; wpsOpenQuickWeekly()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"/>
          </div>
        </div>
        <div class="mt-2 bg-emerald-50 border border-emerald-300 rounded p-2 text-xs">
          ✓ <strong>${filteredAll.length}</strong> estudiante(s) van a recibir el mensaje
          ${(() => {
            const sinTel = filteredAll.filter(s => {
              const p = eduCleanPhone(s.phone);
              return !p || p.length < 10;
            }).length;
            if (sinTel === 0) return ' · <span class="text-emerald-700 font-bold">Todos con teléfono ✓</span>';
            return ` · <span class="text-amber-700">⚠️ ${sinTel} sin teléfono (vas a poder agregarlos al enviar)</span>`;
          })()}
        </div>
      </div>

      <!-- Preview del mensaje -->
      <div class="bg-white border border-slate-200 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-slate-700 mb-2">3️⃣ Vista previa</div>
        <div class="text-[10px] text-slate-500 mb-1">Ejemplo para <strong>${(previewStudent.full_name||'').replace(/</g,'&lt;')}</strong>:</div>
        <div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm whitespace-pre-wrap">${previewMsg.replace(/</g,'&lt;')}</div>
        <div class="text-[10px] text-slate-500 mt-1">Cada estudiante recibe su versión personalizada con sus datos.</div>
      </div>

      <!-- 🧪 Modo prueba (probar antes de mandar a todos) -->
      <details class="bg-amber-50 border border-amber-300 rounded-xl p-3">
        <summary class="cursor-pointer text-xs font-bold uppercase text-amber-900 flex items-center gap-2">
          🧪 Probar primero con un número (recomendado)
          <span class="text-[10px] font-normal text-amber-700">click para abrir ▾</span>
        </summary>
        <div class="mt-3 space-y-2">
          <div class="text-xs text-amber-900">Manda 1 mensaje de prueba al número que quieras (el tuyo, tu teléfono personal, etc.) para validar el mensaje y el formato antes de ir a todos los estudiantes.</div>
          <div class="grid grid-cols-3 gap-2">
            <div class="col-span-1">
              <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tu número (con código país)</label>
              <div class="text-[10px] text-slate-500 mb-1">Ej. 521555... (México) o 1555... (USA)</div>
            </div>
            <div class="col-span-2">
              <input id="wps-test-phone" type="text" placeholder="521234567890" value="${(localStorage.getItem('wps_test_phone')||'').replace(/\D/g,'')}" oninput="try{localStorage.setItem('wps_test_phone', this.value.replace(/\\D/g,''))}catch(e){}" class="w-full border border-amber-400 rounded px-2 py-1.5 text-sm font-mono"/>
            </div>
          </div>
          <button onclick="wpsCreateQuickTest()" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm py-2.5 rounded">🧪 Crear 1 mensaje de prueba</button>
          <div class="text-[10px] text-slate-500">Se crea una campaña con prefijo "🧪 PRUEBA" y un solo mensaje hacia tu número. Lo abrís, lo enviás a vos mismo y validás cómo queda.</div>
        </div>
      </details>

      <!-- Botón generar (real, a todos) -->
      <button onclick="wpsCreateQuickWeekly()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base py-3 rounded-lg" ${filteredAll.length === 0 ? 'disabled' : ''}>
        🚀 Crear ${filteredAll.length} mensaje${filteredAll.length===1?'':'s'} y ver para enviar
      </button>
    </div>
  `;
}

function wpsFilterQuickStudents(students) {
  const now = Date.now();
  const dayMs = 86400000;
  return students.filter(s => {
    if (wpsQuickState.filterStage !== 'all' && s.current_stage !== wpsQuickState.filterStage) return false;
    if (wpsQuickState.filterStatus !== 'all' && s.status !== wpsQuickState.filterStatus) return false;
    // Si filter status es 'all', no incluir graduados/dropped
    if (wpsQuickState.filterStatus === 'all' && (s.status === 'graduated' || s.status === 'dropped')) return false;
    if (wpsQuickState.filterInactivos > 0) {
      const last = s.ultima_fecha_seguimiento || s.enrolled_at;
      if (!last) return true;
      const dias = Math.floor((now - new Date(last).getTime()) / dayMs);
      if (dias < wpsQuickState.filterInactivos) return false;
    }
    return true;
  });
}

function wpsFillTemplate(template, student) {
  const m = window.eduState?.mentorships?.find(x => x.id === student.mentorship_id);
  const stageObj = (m?.stages || []).find(st => st.key === student.current_stage);
  const nombre = (student.full_name || 'estudiante').split(' ')[0]; // sólo primer nombre
  const etapa = stageObj?.name || student.current_stage || 'tu etapa actual';

  // Tareas pendientes desde eduTasksState
  const allTasks = window.eduTasksState?.all || [];
  const studentTasks = allTasks.filter(t => t.student_id === student.id && !t.completed).slice(0, 3);
  const tareasList = studentTasks.length > 0
    ? studentTasks.map((t, i) => `${i+1}. ${t.paso_text}`).join('\n')
    : 'No tenés tareas pendientes registradas en el sistema.';
  const tareasBlock = studentTasks.length > 0
    ? `Tus tareas pendientes son:\n${tareasList}`
    : '';

  // Días sin contacto
  let diasSinContacto = student._daysWithoutContact;
  if (diasSinContacto == null && student.ultima_fecha_seguimiento) {
    diasSinContacto = Math.floor((Date.now() - new Date(student.ultima_fecha_seguimiento).getTime()) / 86400000);
  }
  if (diasSinContacto == null) diasSinContacto = 'varios';

  return template
    .replace(/\{nombre\}/g, nombre)
    .replace(/\{etapa\}/g, etapa)
    .replace(/\{tareas_pendientes_list\}/g, tareasList)
    .replace(/\{tareas_pendientes_block\}/g, tareasBlock)
    .replace(/\{dias_sin_contacto\}/g, String(diasSinContacto));
}

async function wpsCreateQuickWeekly() {
  const allStudents = (eduState.students || []).filter(s => !eduState.mentorshipId || s.mentorship_id === eduState.mentorshipId);
  const filtered = wpsFilterQuickStudents(allStudents);
  if (!filtered.length) return alert('Sin destinatarios con esos filtros.');

  const template = WPS_WEEKLY_TEMPLATES.find(t => t.id === wpsQuickState.templateId) || WPS_WEEKLY_TEMPLATES[0];
  const fecha = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short' });
  const campaignName = `${template.label} · ${fecha}`;

  // Cargar tareas si no están cargadas
  if (typeof eduLoadAllTasks === 'function' && !window.eduTasksState?.loaded) {
    try { await eduLoadAllTasks(); } catch {}
  }

  await wpsActuallyCreate(filtered, template, campaignName);
}

// Modo prueba: crea una campaña con UN solo destinatario hacia un teléfono de prueba
async function wpsCreateQuickTest() {
  const phone = (document.getElementById('wps-test-phone')?.value || '').replace(/\D/g, '');
  if (!phone || phone.length < 10) return alert('Pon un número válido de prueba (con código país, ej. 521555... o 1555...)');

  const allStudents = (eduState.students || []).filter(s => !eduState.mentorshipId || s.mentorship_id === eduState.mentorshipId);
  const filtered = wpsFilterQuickStudents(allStudents);
  const previewStudent = filtered[0] || allStudents[0] || {
    id: null, full_name: 'Estudiante Prueba', current_stage: 'Crédito', mentorship_id: eduState.mentorshipId
  };

  // Forzar phone en el preview student
  const testStudent = { ...previewStudent, phone };

  const template = WPS_WEEKLY_TEMPLATES.find(t => t.id === wpsQuickState.templateId) || WPS_WEEKLY_TEMPLATES[0];
  const fecha = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short' });
  const campaignName = `🧪 PRUEBA · ${template.label} · ${fecha}`;

  if (typeof eduLoadAllTasks === 'function' && !window.eduTasksState?.loaded) {
    try { await eduLoadAllTasks(); } catch {}
  }

  await wpsActuallyCreate([testStudent], template, campaignName, { phoneOverride: phone });
}

// Insert real con safeInsert (descarta columnas que el schema no tenga)
async function wpsActuallyCreate(students, template, campaignName, opts) {
  opts = opts || {};
  const campaignPayload = {
    name: campaignName,
    mentorship_id: eduState.mentorshipId || null,
    prompt_template: template.text,
    target_filters: {
      stage: wpsQuickState.filterStage,
      status: wpsQuickState.filterStatus,
      inactivos_dias: wpsQuickState.filterInactivos,
      template_id: template.id
    },
    total_recipients: students.length,
    sent_count: 0,
    responded_count: 0,
    status: 'ready',
    created_by: state.user?.id || null
  };

  let campaign;
  if (typeof window.safeInsert === 'function') {
    const r = await window.safeInsert(() => sb.from('edu_whatsapp_campaigns'), campaignPayload, { single: true });
    if (r.error) return alert('Error creando campaña: ' + (r.error.message || r.error));
    campaign = r.data;
  } else {
    const r = await sb.from('edu_whatsapp_campaigns').insert(campaignPayload).select().single();
    if (r.error) return alert('Error creando campaña: ' + r.error.message);
    campaign = r.data;
  }

  const messages = students.map(s => ({
    campaign_id: campaign.id,
    student_id: s.id || null,
    phone: opts.phoneOverride || s.phone || null,
    message_text: wpsFillTemplate(template.text, s),
    status: 'pending'
  }));

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    if (typeof window.safeInsert === 'function') {
      const r = await window.safeInsert(() => sb.from('edu_whatsapp_messages'), chunk, { select: false });
      if (r.error) { alert('Error insertando mensajes: ' + (r.error.message || r.error)); return; }
    } else {
      const r = await sb.from('edu_whatsapp_messages').insert(chunk);
      if (r.error) { alert('Error insertando mensajes: ' + r.error.message); return; }
    }
  }

  await wpsLoad();
  wpsState.activeCampaignId = campaign.id;
  wpsState.activeView = 'detail';
  wpsRender();
}

window.wpsCreateQuickTest = wpsCreateQuickTest;

window.wpsOpenQuickWeekly = wpsOpenQuickWeekly;
window.wpsCreateQuickWeekly = wpsCreateQuickWeekly;

async function wpsSubmitResponse(messageId) {
  const text = document.getElementById('wps-resp-text').value.trim();
  if (!text) return alert('Pegá la respuesta primero.');

  document.getElementById('wps-resp-modal').innerHTML = `
    <div class="bg-white rounded-xl w-full max-w-xl p-8 text-center">
      <div class="text-3xl animate-pulse">🧠</div>
      <div class="mt-2 font-bold text-violet-900">Analizando respuesta con IA...</div>
    </div>
  `;

  try {
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/edu-whatsapp-analyze-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAccessToken()}` },
      body: JSON.stringify({ message_id: messageId, response_text: text })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'Análisis falló');

    closeModal2();
    await wpsLoad();
    wpsRender();
    // Toast simple
    setTimeout(() => {
      alert(`✓ Respuesta analizada\n\nSentimiento: ${r.analysis.sentimiento}\nUrgencia: ${r.analysis.urgencia}\nAcción: ${r.analysis.accion_recomendada}\n\n${r.plan_updates?.applied?.length ? 'Plan actualizado: ' + r.plan_updates.applied.join('; ') : 'Plan sin cambios'}`);
    }, 100);
  } catch (e) {
    alert('Error: ' + e.message);
    closeModal2();
  }
}
