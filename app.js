// ============================================================
// Empresa OS — Supabase edition
// ============================================================

const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// Estado en memoria (espejo de la DB)
let state = {
  user: null,
  role: 'viewer',
  currentAreaId: null,
  areas: [],
  systems: {} // areaId -> [systems]
};

// ===== Tipos =====
const SYSTEM_TYPES = {
  link: { label: 'Link externo', icon: '🔗', desc: 'URL a una app web o servicio' },
  app: { label: 'App de escritorio', icon: '🖥️', desc: 'Aplicación instalada (usa URL scheme)' },
  table: { label: 'Tabla / Base de datos', icon: '📋', desc: 'Formulario + tabla editable' },
  checklist: { label: 'Checklist / SOP', icon: '✅', desc: 'Lista de pasos marcables' },
  calculator: { label: 'Calculadora', icon: '🧮', desc: 'Inputs numéricos + fórmula' },
  notes: { label: 'Notas / Documento', icon: '📝', desc: 'Texto libre por proyecto' }
};

function uid() { return Math.random().toString(36).slice(2, 10); }
const isAdmin = () => state.role === 'admin';

// ============================================================
// AUTH
// ============================================================
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await onLogin(session.user);
  else showAuth();
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') location.reload();
  });
}

function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('app').classList.remove('flex');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('app').classList.add('flex');
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

document.getElementById('auth-login-btn').addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return showAuthError(error.message);
  await onLogin(data.user);
});

document.getElementById('auth-signup-btn').addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || password.length < 6) return showAuthError('Email válido y password de 6+ caracteres');
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return showAuthError(error.message);
  if (!data.session) return showAuthError('Revisa tu email para confirmar la cuenta (o desactiva confirmación en Supabase → Auth → Providers).');
  await onLogin(data.user);
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
});

async function onLogin(user) {
  state.user = user;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single();
  state.role = profile?.role || 'viewer';
  document.getElementById('user-email').textContent = user.email;
  const roleEl = document.getElementById('user-role');
  roleEl.textContent = state.role;
  roleEl.className = `text-[10px] font-bold uppercase tracking-wide ${state.role === 'admin' ? 'text-green-400' : 'text-slate-500'}`;
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin() ? '' : 'none');
  showApp();
  await loadData();
  render();
}

// ============================================================
// DATA (Supabase queries)
// ============================================================
async function loadData() {
  const { data: areas, error: e1 } = await sb.from('areas').select('*').order('position');
  if (e1) return alert('Error cargando áreas: ' + e1.message);
  state.areas = areas || [];
  state.systems = {};
  const { data: systems, error: e2 } = await sb.from('systems').select('*').order('position');
  if (e2) return alert('Error cargando sistemas: ' + e2.message);
  for (const a of state.areas) state.systems[a.id] = [];
  for (const s of systems || []) {
    if (!state.systems[s.area_id]) state.systems[s.area_id] = [];
    state.systems[s.area_id].push(s);
  }
  if (!state.currentAreaId && state.areas[0]) state.currentAreaId = state.areas[0].id;
}

async function saveSystemData(system) {
  const { error } = await sb.from('systems').update({ data: system.data }).eq('id', system.id);
  if (error) console.error('saveSystemData', error);
}

// ============================================================
// PROPIEDADES — helpers compartidos entre sistemas
// ============================================================
window.propertiesCache = [];

async function loadProperties() {
  const { data } = await sb.from('properties').select('*').order('updated_at', { ascending: false });
  window.propertiesCache = data || [];
  return window.propertiesCache;
}

function propertySelectorHtml(currentId, onChangeFn, saveFn) {
  const opts = '<option value="">— Sin vincular (one-off) —</option>' +
    window.propertiesCache.map(p => `<option value="${p.id}" ${currentId===p.id?'selected':''}>${p.address}${p.arv?` · ARV ${'$'+Math.round(+p.arv).toLocaleString()}`:''}</option>`).join('');
  return `
    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 mb-3">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-base">🏠</span>
        <h3 class="text-xs font-bold text-blue-900 uppercase">Propiedad</h3>
        ${currentId ? '<span class="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">VINCULADA</span>' : '<span class="text-[10px] text-slate-500">análisis sin guardar</span>'}
      </div>
      <div class="flex gap-2">
        <select onchange="${onChangeFn}(this.value)" class="flex-1 border border-slate-300 rounded px-3 py-2 text-sm bg-white">${opts}</select>
        <button onclick="${saveFn}()" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-bold whitespace-nowrap">${currentId?'💾 Actualizar':'➕ Guardar como propiedad'}</button>
      </div>
      <p class="text-[10px] text-blue-700 mt-1">Esta info se comparte entre Cashout, ARV, Estimador y Predictor de Cashflow.</p>
    </div>
  `;
}

// ============================================================
// AI ANALYSIS — helper compartido entre sistemas
// ============================================================
window.aiState = {}; // por sistema: { loading, analysis, error }

async function aiAnalyze(systemKey, context, force = false) {
  window.aiState[systemKey] = { loading: true, analysis: null, error: null };
  if (window._aiRefreshCb) window._aiRefreshCb();
  try {
    const { data, error } = await sb.functions.invoke('ai-deep-analyze', {
      body: { system: systemKey, context, force }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    window.aiState[systemKey] = { loading: false, analysis: data, error: null };
  } catch (e) {
    window.aiState[systemKey] = { loading: false, analysis: null, error: e.message || String(e) };
  }
  if (window._aiRefreshCb) window._aiRefreshCb();
}

function aiBoxHtml(systemKey, title, hint, runFn) {
  const s = window.aiState[systemKey] || {};
  return `
    <div class="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4 mt-3">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 class="text-sm font-bold text-purple-900 uppercase">🤖 ${title}</h3>
          <p class="text-[10px] text-purple-700">${hint}</p>
        </div>
        <button onclick="${runFn}()" ${s.loading?'disabled':''} class="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white text-xs font-bold px-3 py-2 rounded whitespace-nowrap">${s.loading?'🔄 Analizando...':'🚀 Analizar con IA'}</button>
      </div>
      ${s.error ? `<div class="text-xs text-red-700 bg-red-100 rounded p-2 mt-2">⚠️ ${s.error}</div>` : ''}
      ${s.loading ? `<div class="text-center py-6 text-purple-700"><div class="text-3xl animate-pulse">🔍</div><p class="text-xs mt-2">Buscando en internet... (30-60s)</p></div>` : ''}
      ${s.analysis ? `<div id="ai-result-${systemKey}"></div>` : ''}
    </div>
  `;
}

function aiResultGenericHtml(a) {
  // Render genérico para cualquier objeto JSON con summary, comps, etc.
  const blocks = [];
  if (a.summary) blocks.push(`<div class="text-xs text-slate-700 italic bg-white rounded p-2 border border-purple-200">"${a.summary}"</div>`);

  // Recorrer keys y renderizar cosas conocidas
  for (const [k, v] of Object.entries(a)) {
    if (k.startsWith('_') || k === 'summary') continue;
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number') {
      blocks.push(`<div class="bg-white rounded p-2 border border-purple-200 text-xs"><strong class="text-purple-900 uppercase text-[10px]">${k.replace(/_/g,' ')}:</strong> ${v}</div>`);
    } else if (Array.isArray(v)) {
      if (v.length === 0) continue;
      if (typeof v[0] === 'string') {
        blocks.push(`<div class="bg-white rounded p-2 border border-purple-200 text-xs"><strong class="text-purple-900 uppercase text-[10px]">${k.replace(/_/g,' ')}</strong><ul class="ml-3 list-disc text-slate-700 mt-1">${v.map(x=>`<li>${x}</li>`).join('')}</ul></div>`);
      } else {
        blocks.push(`<div class="bg-white rounded p-2 border border-purple-200 text-xs"><strong class="text-purple-900 uppercase text-[10px]">${k.replace(/_/g,' ')} (${v.length})</strong><div class="space-y-1 mt-1">${v.slice(0,5).map(item => `<div class="text-[10px] text-slate-600">${Object.entries(item).map(([ik,iv])=>`<strong>${ik}:</strong> ${typeof iv==='string'&&iv.startsWith('http')?`<a href="${iv}" target="_blank" class="text-purple-700 hover:underline">${iv.slice(0,40)}...</a>`:iv}`).join(' · ')}</div>`).join('')}</div></div>`);
      }
    } else if (typeof v === 'object') {
      blocks.push(`<div class="bg-white rounded p-2 border border-purple-200 text-xs"><strong class="text-purple-900 uppercase text-[10px]">${k.replace(/_/g,' ')}</strong><div class="mt-1 grid grid-cols-2 gap-1 text-[10px]">${Object.entries(v).map(([ik,iv])=>`<div><span class="text-slate-500">${ik}:</span> <strong>${typeof iv === 'object' ? JSON.stringify(iv) : iv}</strong></div>`).join('')}</div></div>`);
    }
  }
  blocks.push(`<div class="flex items-center justify-between text-[10px] text-slate-500 mt-2"><span>${a._fromCache ? `📦 Cache (${new Date(a._cachedAt).toLocaleDateString()})` : '🌐 Recién analizado'}</span></div>`);
  return `<div class="space-y-2">${blocks.join('')}</div>`;
}

async function upsertProperty(payload, currentId) {
  payload.updated_at = new Date().toISOString();
  if (!payload.user_id) payload.user_id = state.user.id;
  if (currentId) {
    const { error } = await sb.from('properties').update(payload).eq('id', currentId);
    if (error) { alert('Error: ' + error.message); return null; }
    return currentId;
  }
  if (!payload.address) {
    alert('Pon una dirección antes de guardar como propiedad');
    return null;
  }
  const { data, error } = await sb.from('properties').insert(payload).select().single();
  if (error) { alert('Error: ' + error.message); return null; }
  return data.id;
}

// ============================================================
// RENDER
// ============================================================
function render() {
  renderSidebar();
  const area = state.areas.find(a => a.id === state.currentAreaId);
  if (!area) {
    document.getElementById('content').innerHTML = '<p class="text-slate-500">Crea un área para empezar.</p>';
    document.getElementById('area-title').textContent = '';
    document.getElementById('area-desc').textContent = '';
    return;
  }
  document.getElementById('area-title').textContent = `${area.icon} ${area.name}`;
  document.getElementById('area-desc').textContent = area.description || '';
  renderSystems(area);
}

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = state.areas.map(area => {
    const count = (state.systems[area.id] || []).length;
    return `
      <button onclick="selectArea('${area.id}')"
        class="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm transition ${state.currentAreaId === area.id ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50'}">
        <span class="text-lg">${area.icon}</span>
        <span class="flex-1 truncate">${area.name}</span>
        <span class="text-xs text-slate-500">${count}</span>
      </button>`;
  }).join('');
}

function selectArea(id) {
  state.currentAreaId = id;
  render();
}

function renderSystems(area) {
  const systems = state.systems[area.id] || [];
  const content = document.getElementById('content');
  if (systems.length === 0) {
    content.innerHTML = `
      <div class="text-center py-20">
        <div class="text-6xl mb-4">📦</div>
        <h3 class="text-lg font-semibold text-slate-700">Sin sistemas aún</h3>
        <p class="text-sm text-slate-500 mt-2">${isAdmin() ? 'Agrega links, apps o crea sistemas internos para esta área.' : 'El admin debe agregar sistemas.'}</p>
        ${isAdmin() ? '<button onclick="openAddSystem()" class="mt-6 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg">+ Nuevo sistema</button>' : ''}
      </div>`;
    return;
  }
  content.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      ${systems.map(sys => systemCard(area, sys)).join('')}
    </div>`;
}

function systemCard(area, sys) {
  const type = SYSTEM_TYPES[sys.type] || { icon: sys.icon || '💎', label: sys.type };
  const adminBtns = isAdmin() ? `
    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
      <button onclick="editSystem('${area.id}','${sys.id}')" class="text-xs text-slate-400 hover:text-slate-900 p-1">✏️</button>
      <button onclick="deleteSystem('${area.id}','${sys.id}')" class="text-xs text-slate-400 hover:text-red-600 p-1">🗑️</button>
    </div>` : '';
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition group">
      <div class="flex items-start justify-between mb-3">
        <div class="text-3xl">${sys.icon || type.icon}</div>
        ${adminBtns}
      </div>
      <h4 class="font-semibold text-slate-900">${sys.name}</h4>
      <p class="text-xs text-slate-500 mt-1 line-clamp-2">${sys.description || type.label}</p>
      <button onclick="openSystem('${area.id}','${sys.id}')" class="mt-4 w-full text-sm bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 font-medium py-2 rounded-lg transition">
        Abrir
      </button>
    </div>`;
}

// ============================================================
// SYSTEM ACTIONS
// ============================================================
function openSystem(areaId, sysId) {
  const sys = (state.systems[areaId] || []).find(s => s.id === sysId);
  if (!sys) return;
  if (sys.type === 'link' || sys.type === 'app') {
    window.open(sys.config.url, '_blank');
    return;
  }
  openInternalSystem(sys);
}

async function deleteSystem(areaId, sysId) {
  if (!confirm('¿Eliminar este sistema?')) return;
  const { error } = await sb.from('systems').delete().eq('id', sysId);
  if (error) return alert('Error: ' + error.message);
  state.systems[areaId] = state.systems[areaId].filter(s => s.id !== sysId);
  render();
}

function editSystem(areaId, sysId) {
  const sys = state.systems[areaId].find(s => s.id === sysId);
  openSystemForm(areaId, sys);
}

// ============================================================
// MODAL
// ============================================================
function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

// ============================================================
// CRUD: sistema
// ============================================================
function openAddSystem() {
  openSystemForm(state.currentAreaId, null);
}

function openSystemForm(areaId, sys) {
  const isEdit = !!sys;
  const data = sys || { id: uid(), type: 'link', name: '', icon: '', description: '', config: {}, data: {} };
  const typeOptions = Object.entries(SYSTEM_TYPES).map(([key, t]) =>
    `<option value="${key}" ${data.type === key ? 'selected' : ''}>${t.icon} ${t.label}</option>`
  ).join('');

  openModal(isEdit ? 'Editar sistema' : 'Nuevo sistema', `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
        <select id="f-type" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" ${isEdit ? 'disabled' : ''}>${typeOptions}</select>
        <p class="text-xs text-slate-500 mt-1" id="f-type-desc"></p>
      </div>
      <div class="grid grid-cols-[80px_1fr] gap-3">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Ícono</label>
          <input id="f-icon" value="${data.icon}" placeholder="🏠" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-center text-xl" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
          <input id="f-name" value="${data.name}" placeholder="Ej: HubSpot CRM" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
        <input id="f-desc" value="${data.description || ''}" placeholder="Para qué sirve" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div id="f-extra"></div>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="closeModal()" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        <button onclick="saveSystem('${areaId}','${data.id}', ${isEdit})" class="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700">${isEdit ? 'Guardar' : 'Crear'}</button>
      </div>
    </div>
  `);
  document.getElementById('f-type').addEventListener('change', () => renderExtraFields(data));
  renderExtraFields(data);
}

function renderExtraFields(data) {
  const type = document.getElementById('f-type').value;
  document.getElementById('f-type-desc').textContent = SYSTEM_TYPES[type].desc;
  const extra = document.getElementById('f-extra');
  const cfg = data.config || {};
  if (type === 'link') {
    extra.innerHTML = `
      <label class="block text-sm font-medium text-slate-700 mb-1">URL</label>
      <input id="cfg-url" value="${cfg.url || ''}" placeholder="https://app.hubspot.com" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />`;
  } else if (type === 'app') {
    extra.innerHTML = `
      <label class="block text-sm font-medium text-slate-700 mb-1">URL scheme o ruta</label>
      <input id="cfg-url" value="${cfg.url || ''}" placeholder="vscode://file/..." class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      <p class="text-xs text-slate-500 mt-1">Ej: <code>vscode://</code>, <code>slack://</code></p>`;
  } else if (type === 'table') {
    const cols = (cfg.columns || ['Nombre','Estado','Notas']).join(', ');
    extra.innerHTML = `
      <label class="block text-sm font-medium text-slate-700 mb-1">Columnas (separadas por coma)</label>
      <input id="cfg-cols" value="${cols}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />`;
  } else if (type === 'checklist') {
    const items = (cfg.items || ['Paso 1','Paso 2','Paso 3']).join('\n');
    extra.innerHTML = `
      <label class="block text-sm font-medium text-slate-700 mb-1">Pasos (uno por línea)</label>
      <textarea id="cfg-items" rows="5" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono">${items}</textarea>`;
  } else if (type === 'calculator') {
    const inputs = (cfg.inputs || [{name:'precio_compra',label:'Precio de compra'},{name:'remodelacion',label:'Remodelación'},{name:'precio_venta',label:'Precio de venta'}])
      .map(i => `${i.name}|${i.label}`).join('\n');
    extra.innerHTML = `
      <label class="block text-sm font-medium text-slate-700 mb-1">Variables (<code>nombre|etiqueta</code>, una por línea)</label>
      <textarea id="cfg-inputs" rows="4" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono">${inputs}</textarea>
      <label class="block text-sm font-medium text-slate-700 mb-1 mt-3">Fórmula</label>
      <input id="cfg-formula" value="${cfg.formula || 'precio_venta - precio_compra - remodelacion'}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono" />
      <label class="block text-sm font-medium text-slate-700 mb-1 mt-3">Etiqueta del resultado</label>
      <input id="cfg-result-label" value="${cfg.resultLabel || 'Ganancia estimada'}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />`;
  } else {
    extra.innerHTML = `<p class="text-xs text-slate-500">Sin configuración extra.</p>`;
  }
}

async function saveSystem(areaId, sysId, isEdit) {
  const type = document.getElementById('f-type').value;
  const name = document.getElementById('f-name').value.trim();
  if (!name) return alert('Pon un nombre');
  const icon = document.getElementById('f-icon').value.trim();
  const description = document.getElementById('f-desc').value.trim();
  const config = {};
  if (type === 'link' || type === 'app') {
    config.url = document.getElementById('cfg-url').value.trim();
    if (!config.url) return alert('Falta la URL');
  } else if (type === 'table') {
    config.columns = document.getElementById('cfg-cols').value.split(',').map(s => s.trim()).filter(Boolean);
  } else if (type === 'checklist') {
    config.items = document.getElementById('cfg-items').value.split('\n').map(s => s.trim()).filter(Boolean);
  } else if (type === 'calculator') {
    config.inputs = document.getElementById('cfg-inputs').value.split('\n').map(line => {
      const [n, l] = line.split('|').map(s => s.trim());
      return n ? { name: n, label: l || n } : null;
    }).filter(Boolean);
    config.formula = document.getElementById('cfg-formula').value.trim();
    config.resultLabel = document.getElementById('cfg-result-label').value.trim();
  }

  const position = (state.systems[areaId] || []).length;
  const payload = { id: sysId, area_id: areaId, type, name, icon, description, config, data: {}, position };

  let error;
  if (isEdit) {
    ({ error } = await sb.from('systems').update({ name, icon, description, config }).eq('id', sysId));
  } else {
    ({ error } = await sb.from('systems').insert(payload));
  }
  if (error) return alert('Error: ' + error.message);
  await loadData();
  closeModal();
  render();
}

// ============================================================
// SISTEMAS INTERNOS
// ============================================================
function openInternalSystem(sys) {
  if (sys.type === 'table') return openTable(sys);
  if (sys.type === 'checklist') return openChecklist(sys);
  if (sys.type === 'calculator') return openCalculator(sys);
  if (sys.type === 'notes') return openNotes(sys);
  if (sys.type === 'cashout') return openCashout(sys);
  if (sys.type === 'appraisals') return openAppraisals(sys);
  if (sys.type === 'arv-calc') return openArvCalc(sys);
  if (sys.type === 'estimator') return openEstimator(sys);
  if (sys.type === 'rental-predictor') return openRentalPredictor(sys);
  if (sys.type === 'loan-calc') return openLoanCalculator(sys);
  if (sys.type === 'deep-analyzer') return openPropertyAnalyzer(sys);
  if (sys.type === 'remodel-pro') return openRemodelPro(sys);
  if (sys.type === 'weekly-planner') return openWeeklyPlanner(sys);
}

// ============================================================
// ARV CALCULATOR — predice ARV basado en appraisals históricos
// ============================================================
async function openArvCalc(sys) {
  const [{ data: all }] = await Promise.all([
    sb.from('appraisals').select('*').eq('status', 'done'),
    loadProperties()
  ]);
  const data = all || [];

  if (!data.length) {
    return openModal(`🎯 ${sys.name}`, `<p class="text-sm text-slate-500">Necesitas al menos 1 appraisal procesado. Sube PDFs en 📂 Appraisals primero.</p>`);
  }

  const i = sys.data.input || { zip: '', sqft: 1500, beds: 3, baths: 2, year_built: 1980, condition: 'C3', lot_size: 7000, propertyId: null };
  window._arvCurrentSys = sys;

  openModal(`🎯 ${sys.name}`, `
    ${propertySelectorHtml(i.propertyId, 'arvOnPropertyChange', 'arvSaveProperty')}
    <div class="grid grid-cols-2 gap-6">
      <div class="space-y-3">
        <h4 class="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">Casa a evaluar</h4>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Zip code</label>
          <input id="ac-zip" value="${i.zip}" placeholder="78744" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Sqft (GLA)</label>
            <input type="number" id="ac-sqft" value="${i.sqft}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Año construcción</label>
            <input type="number" id="ac-year" value="${i.year_built}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Beds</label>
            <input type="number" id="ac-beds" value="${i.beds}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Baths</label>
            <input type="number" step="0.5" id="ac-baths" value="${i.baths}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Lot size (sqft)</label>
            <input type="number" id="ac-lot" value="${i.lot_size}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Condition objetivo</label>
            <select id="ac-cond" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              ${['C1','C2','C3','C4','C5','C6'].map(c => `<option value="${c}" ${i.condition===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <p class="text-[10px] text-slate-400">Tip: post-remodel apunta a C2-C3. C1 es nuevo, C4+ necesita trabajo.</p>
      </div>

      <div class="space-y-3">
        <div class="bg-slate-900 text-white rounded-xl p-5">
          <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">ARV estimado</h4>
          <div id="ac-arv" class="text-4xl font-bold text-green-400">—</div>
          <div id="ac-range" class="text-xs text-slate-400 mt-1">—</div>
          <div class="border-t border-slate-700 mt-3 pt-3 space-y-1 text-xs text-slate-400">
            <div class="flex justify-between"><span>$/sqft usado</span><span id="ac-ppsf">—</span></div>
            <div class="flex justify-between"><span>Comps en zip</span><span id="ac-zip-count">—</span></div>
            <div class="flex justify-between"><span>Confianza</span><span id="ac-confidence">—</span></div>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-600 uppercase mb-2">Comps más similares</h4>
          <div id="ac-comps" class="space-y-2"></div>
        </div>
        ${aiBoxHtml('arv-calc', 'Validar ARV con Redfin/Zillow live', 'Claude busca comps reales sold últimos 6 meses + tendencias del zip + ajustes por condición', 'arvRunAI')}
      </div>
    </div>
  `);
  setTimeout(() => {
    const aiState = window.aiState['arv-calc'];
    const el = document.getElementById('ai-result-arv-calc');
    if (el && aiState?.analysis) el.innerHTML = aiResultGenericHtml(aiState.analysis);
  }, 50);

  const ids = ['ac-zip','ac-sqft','ac-beds','ac-baths','ac-year','ac-lot','ac-cond'];
  const fmt = n => Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—';

  const recompute = () => {
    const input = {
      zip: document.getElementById('ac-zip').value.trim(),
      sqft: +document.getElementById('ac-sqft').value || 0,
      beds: +document.getElementById('ac-beds').value || 0,
      baths: +document.getElementById('ac-baths').value || 0,
      year_built: +document.getElementById('ac-year').value || 0,
      lot_size: +document.getElementById('ac-lot').value || 0,
      condition: document.getElementById('ac-cond').value
    };

    // Filtrar comps: zip exacto > zip similar > todos
    const sameZip = data.filter(a => a.zip === input.zip && a.price_per_sqft);
    const useZip = sameZip.length >= 3;
    const pool = useZip ? sameZip : data.filter(a => a.price_per_sqft);

    // Score de similitud
    const condRank = { C1: 1, C2: 2, C3: 3, C4: 4, C5: 5, C6: 6 };
    const targetCond = condRank[input.condition] || 3;
    const scored = pool.map(a => {
      let score = 0;
      // Sqft proximity (50% weight)
      if (a.gla_sqft && input.sqft) score += 50 * (1 - Math.min(1, Math.abs(a.gla_sqft - input.sqft) / input.sqft));
      // Beds/baths match (10% each)
      if (a.bedrooms === input.beds) score += 10;
      if (a.bathrooms === input.baths) score += 10;
      // Condition proximity (15%)
      const ac = condRank[a.condition_rating] || 3;
      score += 15 * (1 - Math.abs(ac - targetCond) / 5);
      // Year proximity (10%)
      if (a.year_built && input.year_built) score += 10 * (1 - Math.min(1, Math.abs(a.year_built - input.year_built) / 50));
      // Zip exact bonus (5%)
      if (a.zip === input.zip) score += 5;
      return { ...a, similarity: score };
    }).sort((x, y) => y.similarity - x.similarity);

    // Top comps para promedio (top 5 o todos si <5)
    const topN = scored.slice(0, Math.min(5, scored.length));
    const weights = topN.map(c => c.similarity);
    const totalW = weights.reduce((s,w) => s+w, 0) || 1;
    const avgPpsf = topN.reduce((s,c,idx) => s + (+c.price_per_sqft) * weights[idx], 0) / totalW;

    // Ajuste por condition objetivo vs comps
    const compAvgCond = topN.reduce((s,c) => s + (condRank[c.condition_rating] || 3), 0) / topN.length;
    const condAdjustment = (compAvgCond - targetCond) * 0.04; // 4% por nivel mejor
    const adjustedPpsf = avgPpsf * (1 + condAdjustment);

    const arv = adjustedPpsf * input.sqft;
    const rangeLow = arv * 0.93;
    const rangeHigh = arv * 1.07;

    let confidence = 'Baja';
    if (sameZip.length >= 5 && input.sqft) confidence = 'Alta';
    else if (sameZip.length >= 3 || pool.length >= 8) confidence = 'Media';

    document.getElementById('ac-arv').textContent = fmt(arv);
    document.getElementById('ac-range').textContent = `Rango: ${fmt(rangeLow)} – ${fmt(rangeHigh)}`;
    document.getElementById('ac-ppsf').textContent = '$' + adjustedPpsf.toFixed(0) + '/sqft';
    document.getElementById('ac-zip-count').textContent = `${sameZip.length} (de ${data.length} total)`;
    document.getElementById('ac-confidence').textContent = confidence + (useZip ? '' : ' (sin comps en zip)');

    document.getElementById('ac-comps').innerHTML = topN.map(c => `
      <div class="bg-slate-50 rounded p-2 text-xs">
        <div class="flex justify-between font-semibold">
          <span>${c.property_address || '—'}</span>
          <span class="text-slate-500">${c.zip || ''}</span>
        </div>
        <div class="text-slate-600 mt-0.5">
          ${fmt(+c.appraised_value)} • ${c.gla_sqft || '?'} sqft • $${(+c.price_per_sqft).toFixed(0)}/sqft •
          ${c.bedrooms || '?'}bd/${c.bathrooms || '?'}ba • ${c.condition_rating || '?'} • similitud ${c.similarity.toFixed(0)}
        </div>
      </div>
    `).join('') || '<p class="text-xs text-slate-400">Sin comps</p>';

    // Conservar propertyId entre re-renders
    input.propertyId = sys.data.input?.propertyId || null;
    input.arv_estimated = arv;
    sys.data.input = input;
    saveSystemData(sys);
  };

  ids.forEach(id => document.getElementById(id).addEventListener('input', recompute));
  recompute();
}

function arvOnPropertyChange(propId) {
  const sys = window._arvCurrentSys;
  if (!sys.data.input) sys.data.input = {};
  if (!propId) { sys.data.input.propertyId = null; saveSystemData(sys); openArvCalc(sys); return; }
  const p = window.propertiesCache.find(x => x.id === propId);
  if (!p) return;
  sys.data.input.propertyId = p.id;
  if (p.zip) sys.data.input.zip = p.zip;
  if (p.sqft) sys.data.input.sqft = +p.sqft;
  if (p.bedrooms) sys.data.input.beds = +p.bedrooms;
  if (p.bathrooms) sys.data.input.baths = +p.bathrooms;
  if (p.year_built) sys.data.input.year_built = +p.year_built;
  if (p.lot_size_sqft) sys.data.input.lot_size = +p.lot_size_sqft;
  saveSystemData(sys);
  openArvCalc(sys);
}

async function arvRunAI(force = false) {
  const sys = window._arvCurrentSys;
  const i = sys.data.input || {};
  window._aiRefreshCb = () => openArvCalc(sys);
  await aiAnalyze('arv-calc', {
    zip: i.zip, sqft: i.sqft, beds: i.beds, baths: i.baths,
    year_built: i.year_built, lot_size: i.lot_size,
    condition: i.condition,
    system_arv: i.arv_estimated
  }, force);
}

async function arvSaveProperty() {
  const sys = window._arvCurrentSys;
  const i = sys.data.input || {};
  const payload = {
    address: window.propertiesCache.find(p => p.id === i.propertyId)?.address || `Casa en zip ${i.zip || '?'}`,
    zip: i.zip,
    sqft: i.sqft,
    bedrooms: i.beds,
    bathrooms: i.baths,
    year_built: i.year_built,
    lot_size_sqft: i.lot_size,
    arv: i.arv_estimated
  };
  const newId = await upsertProperty(payload, i.propertyId);
  if (newId) {
    sys.data.input.propertyId = newId;
    saveSystemData(sys);
    await loadProperties();
    openArvCalc(sys);
    alert('✓ Propiedad guardada/actualizada con ARV estimado');
  }
}

// ============================================================
// ARV INSIGHTS — qué mueve el valor
// ============================================================
async function openArvInsights(sys) {
  const { data: all } = await sb.from('appraisals').select('*').eq('status', 'done');
  const data = (all || []).filter(a => a.price_per_sqft);

  if (data.length < 2) {
    return openModal(`📊 ${sys.name}`, `<p class="text-sm text-slate-500">Necesitas al menos 2 appraisals procesados. Tienes ${data.length}.</p>`);
  }

  const ppsf = data.map(a => +a.price_per_sqft);
  const avg = arr => arr.reduce((s,n)=>s+n,0) / arr.length;
  const median = arr => { const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };

  // Grupo por zip
  const byZip = {};
  data.forEach(a => { (byZip[a.zip] = byZip[a.zip] || []).push(a); });
  const zipRows = Object.entries(byZip).filter(([z]) => z).map(([zip, arr]) => ({
    zip, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft)), avgValue: avg(arr.map(a=>+a.appraised_value||0))
  })).sort((a,b) => b.avgPpsf - a.avgPpsf);

  // Por condition
  const byCond = {};
  data.forEach(a => { if (a.condition_rating) (byCond[a.condition_rating] = byCond[a.condition_rating] || []).push(a); });
  const condRows = Object.entries(byCond).sort().map(([c, arr]) => ({
    cond: c, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft))
  }));

  // Por bucket de año
  const yearBuckets = { 'Antes 1960': [], '1960-1979': [], '1980-1999': [], '2000-2014': [], '2015+': [] };
  data.forEach(a => {
    if (!a.year_built) return;
    const y = a.year_built;
    if (y < 1960) yearBuckets['Antes 1960'].push(a);
    else if (y < 1980) yearBuckets['1960-1979'].push(a);
    else if (y < 2000) yearBuckets['1980-1999'].push(a);
    else if (y < 2015) yearBuckets['2000-2014'].push(a);
    else yearBuckets['2015+'].push(a);
  });
  const yearRows = Object.entries(yearBuckets).filter(([_, arr]) => arr.length).map(([bucket, arr]) => ({
    bucket, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft))
  }));

  // Notas IA — palabras frecuentes (simple parse)
  const allNotes = data.map(a => a.notes || '').join(' ').toLowerCase();
  const keywords = ['kitchen','bathroom','floor','hardwood','tile','granite','quartz','updated','remodel','roof','hvac','garage','pool','lot','location','condition','renovation','open','upgrade','new','modern'];
  const wordFreq = keywords.map(k => ({
    word: k,
    count: (allNotes.match(new RegExp('\\b'+k+'\\w*','g'))||[]).length
  })).filter(x => x.count > 0).sort((a,b) => b.count - a.count);

  const fmt$ = n => Number.isFinite(n) ? '$' + Math.round(n).toLocaleString() : '—';
  const bar = (val, max) => `<div class="w-full bg-slate-100 rounded-full h-1.5"><div class="bg-slate-900 h-1.5 rounded-full" style="width:${(val/max*100).toFixed(0)}%"></div></div>`;
  const maxPpsfZip = Math.max(...zipRows.map(r => r.avgPpsf), 1);
  const maxCondPpsf = Math.max(...condRows.map(r => r.avgPpsf), 1);
  const maxYearPpsf = Math.max(...yearRows.map(r => r.avgPpsf), 1);
  const maxWordCount = Math.max(...wordFreq.map(w => w.count), 1);

  openModal(`📊 ${sys.name}`, `
    <div class="space-y-5">
      <div class="grid grid-cols-4 gap-3">
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Appraisals</div>
          <div class="text-xl font-bold">${data.length}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">$/sqft avg</div>
          <div class="text-xl font-bold">$${avg(ppsf).toFixed(0)}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">$/sqft mediana</div>
          <div class="text-xl font-bold">$${median(ppsf).toFixed(0)}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Rango $/sqft</div>
          <div class="text-sm font-bold">$${Math.min(...ppsf).toFixed(0)} – $${Math.max(...ppsf).toFixed(0)}</div>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Zip Code</h4>
        <div class="space-y-1">
          ${zipRows.map(r => `
            <div class="grid grid-cols-[80px_1fr_60px_40px] gap-3 items-center text-sm">
              <span class="font-mono font-semibold">${r.zip}</span>
              ${bar(r.avgPpsf, maxPpsfZip)}
              <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
              <span class="text-right text-xs text-slate-500">n=${r.count}</span>
            </div>
          `).join('') || '<p class="text-xs text-slate-400">Sin data</p>'}
        </div>
        <p class="text-[10px] text-slate-500 mt-2">📍 <strong>Apunta a comprar en zips con $/sqft más alto.</strong></p>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Condition</h4>
          <div class="space-y-1">
            ${condRows.map(r => `
              <div class="grid grid-cols-[40px_1fr_60px_30px] gap-2 items-center text-sm">
                <span class="font-mono font-semibold">${r.cond}</span>
                ${bar(r.avgPpsf, maxCondPpsf)}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-xs text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
          <p class="text-[10px] text-slate-500 mt-2">⬆️ <strong>Subir de C3→C2 vale la pena si la diferencia $/sqft &gt; costo de remodel.</strong></p>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Año de construcción</h4>
          <div class="space-y-1">
            ${yearRows.map(r => `
              <div class="grid grid-cols-[100px_1fr_60px_30px] gap-2 items-center text-xs">
                <span class="font-semibold">${r.bucket}</span>
                ${bar(r.avgPpsf, maxYearPpsf)}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Features mencionadas en notas IA</h4>
        <p class="text-[10px] text-slate-500 mb-2">Palabras que los appraisers mencionan más al justificar el valor — pistas de qué upgrades importan.</p>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1">
          ${wordFreq.slice(0, 14).map(w => `
            <div class="grid grid-cols-[100px_1fr_30px] gap-2 items-center text-xs">
              <span class="font-semibold capitalize">${w.word}</span>
              ${bar(w.count, maxWordCount)}
              <span class="text-right text-slate-500">${w.count}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 class="text-xs font-bold text-amber-900 uppercase mb-2">💡 Cómo subir tu ARV (basado en tu data)</h4>
        <ul class="text-xs text-amber-900 space-y-1 leading-relaxed">
          <li>• <strong>Compra en el zip con $/sqft más alto</strong> de los que aparecen arriba (top: ${zipRows[0]?.zip || '—'}, $${zipRows[0]?.avgPpsf.toFixed(0) || '—'}/sqft).</li>
          <li>• <strong>Apunta a Condition C2 o C3</strong> en la remodelación. Diferencial entre tus C2 y C3: $${(condRows.find(c=>c.cond==='C2')?.avgPpsf - condRows.find(c=>c.cond==='C3')?.avgPpsf || 0).toFixed(0)}/sqft.</li>
          <li>• <strong>Features que más aparecen en notas:</strong> ${wordFreq.slice(0,5).map(w=>w.word).join(', ')} — prioriza estos upgrades.</li>
          <li>• <strong>Sweet spot de sqft:</strong> mira tu rango de comps, evita casas que se salen de la norma del barrio.</li>
        </ul>
      </div>
    </div>
  `);
}

// ============================================================
// APPRAISALS (Upload + IA + Análisis profundo en una sola vista)
// ============================================================
async function openAppraisals(sys) {
  const { data: appraisals } = await sb.from('appraisals').select('*').order('uploaded_at', { ascending: false });
  const all = appraisals || [];
  const done = all.filter(a => a.status === 'done' && a.appraised_value && a.price_per_sqft);
  const tab = sys.data.activeTab || 'analytics';

  openModal(`📂 ${sys.name}`, `
    <div class="border-b border-slate-200 -mt-2 -mx-6 px-6 mb-4">
      <div class="flex gap-1">
        <button onclick="switchApprTab('${sys.id}','analytics')" class="px-4 py-2 text-sm font-medium border-b-2 ${tab==='analytics'?'border-slate-900 text-slate-900':'border-transparent text-slate-500 hover:text-slate-900'}">📊 Análisis (${done.length})</button>
        <button onclick="switchApprTab('${sys.id}','list')" class="px-4 py-2 text-sm font-medium border-b-2 ${tab==='list'?'border-slate-900 text-slate-900':'border-transparent text-slate-500 hover:text-slate-900'}">📂 Lista y Upload (${all.length})</button>
      </div>
    </div>
    <div id="appr-tab-content"></div>
  `);

  if (tab === 'analytics') renderAnalyticsTab(sys, done);
  else renderListTab(sys, all);
}

function switchApprTab(sysId, tab) {
  const sys = findSystem(sysId);
  sys.data.activeTab = tab;
  saveSystemData(sys);
  openAppraisals(sys);
}

// ===== Tab: ANALYTICS =====
function renderAnalyticsTab(sys, done) {
  const container = document.getElementById('appr-tab-content');
  if (done.length === 0) {
    container.innerHTML = `<div class="text-center py-12">
      <div class="text-5xl mb-3">📊</div>
      <p class="text-sm text-slate-500">Sin data todavía. Ve a "Lista y Upload" y sube PDFs.</p>
    </div>`;
    return;
  }

  const fmt$ = n => Number.isFinite(n) ? '$' + Math.round(n).toLocaleString() : '—';
  const ppsf = done.map(a => +a.price_per_sqft);
  const values = done.map(a => +a.appraised_value);
  const avg = arr => arr.length ? arr.reduce((s,n)=>s+n,0)/arr.length : 0;
  const median = arr => { if (!arr.length) return 0; const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };

  // Por zip
  const byZip = {};
  done.forEach(a => { if (a.zip) (byZip[a.zip] = byZip[a.zip] || []).push(a); });
  const zipRows = Object.entries(byZip).map(([zip, arr]) => ({
    zip, count: arr.length,
    avgPpsf: avg(arr.map(a=>+a.price_per_sqft)),
    minPpsf: Math.min(...arr.map(a=>+a.price_per_sqft)),
    maxPpsf: Math.max(...arr.map(a=>+a.price_per_sqft)),
    avgValue: avg(arr.map(a=>+a.appraised_value)),
    avgSqft: avg(arr.map(a=>+a.gla_sqft||0))
  })).sort((a,b) => b.avgPpsf - a.avgPpsf);

  // Por condition
  const byCond = {};
  done.forEach(a => { if (a.condition_rating) (byCond[a.condition_rating] = byCond[a.condition_rating] || []).push(a); });
  const condRows = Object.entries(byCond).sort().map(([c, arr]) => ({
    cond: c, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft))
  }));

  // Por sqft bucket (sweet spot)
  const sqftBuckets = { '<1200': [], '1200-1500': [], '1500-1800': [], '1800-2200': [], '2200+': [] };
  done.forEach(a => {
    const s = +a.gla_sqft;
    if (!s) return;
    if (s < 1200) sqftBuckets['<1200'].push(a);
    else if (s < 1500) sqftBuckets['1200-1500'].push(a);
    else if (s < 1800) sqftBuckets['1500-1800'].push(a);
    else if (s < 2200) sqftBuckets['1800-2200'].push(a);
    else sqftBuckets['2200+'].push(a);
  });
  const sqftRows = Object.entries(sqftBuckets).filter(([_,arr])=>arr.length).map(([b,arr])=>({
    bucket: b, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft)), avgValue: avg(arr.map(a=>+a.appraised_value))
  }));

  // Por año
  const yearBuckets = { 'Antes 1970': [], '1970-1979': [], '1980-1989': [], '1990-1999': [], '2000+': [] };
  done.forEach(a => {
    if (!a.year_built) return; const y = a.year_built;
    if (y < 1970) yearBuckets['Antes 1970'].push(a);
    else if (y < 1980) yearBuckets['1970-1979'].push(a);
    else if (y < 1990) yearBuckets['1980-1989'].push(a);
    else if (y < 2000) yearBuckets['1990-1999'].push(a);
    else yearBuckets['2000+'].push(a);
  });
  const yearRows = Object.entries(yearBuckets).filter(([_,arr])=>arr.length).map(([b,arr])=>({
    bucket: b, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft))
  }));

  // Por beds/baths
  const bbMap = {};
  done.forEach(a => {
    if (!a.bedrooms || !a.bathrooms) return;
    const k = `${a.bedrooms}bd/${a.bathrooms}ba`;
    (bbMap[k] = bbMap[k] || []).push(a);
  });
  const bbRows = Object.entries(bbMap).map(([k,arr])=>({
    config: k, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft)), avgValue: avg(arr.map(a=>+a.appraised_value))
  })).sort((a,b)=>b.avgPpsf-a.avgPpsf);

  // Per-casa scoring: cada appraisal vs avg de su zip
  const houseScores = done.map(a => {
    const zipAvg = zipRows.find(z => z.zip === a.zip)?.avgPpsf || avg(ppsf);
    const delta = +a.price_per_sqft - zipAvg;
    const pct = (delta / zipAvg) * 100;
    return { ...a, zipAvg, delta, pct };
  }).sort((x,y) => y.pct - x.pct);

  // Features mencionadas
  const allNotes = done.map(a => a.notes || '').join(' ').toLowerCase();
  const keywords = ['kitchen','bathroom','remodel','updated','renovated','hardwood','tile','granite','quartz','floor','roof','hvac','garage','pool','open','modern','upgrade','new','crown','molding','stainless'];
  const wordFreq = keywords.map(k => ({
    word: k, count: (allNotes.match(new RegExp('\\b'+k+'\\w*','g'))||[]).length
  })).filter(x => x.count > 0).sort((a,b) => b.count - a.count);

  // Recomendaciones dinámicas
  const bestZip = zipRows[0];
  const worstZip = zipRows[zipRows.length-1];
  const bestSqft = [...sqftRows].sort((a,b)=>b.avgPpsf-a.avgPpsf)[0];
  const c2 = condRows.find(c=>c.cond==='C2'); const c3 = condRows.find(c=>c.cond==='C3');
  const condDiff = c2 && c3 ? c2.avgPpsf - c3.avgPpsf : null;
  const zipSpread = bestZip && worstZip ? ((bestZip.avgPpsf - worstZip.avgPpsf) / worstZip.avgPpsf * 100) : 0;

  const bar = (val, max, color='bg-slate-900') => `<div class="w-full bg-slate-100 rounded-full h-2"><div class="${color} h-2 rounded-full" style="width:${Math.min(100,val/max*100).toFixed(0)}%"></div></div>`;
  const maxZip = Math.max(...zipRows.map(r=>r.avgPpsf),1);
  const maxCond = Math.max(...condRows.map(r=>r.avgPpsf),1);
  const maxSqftR = Math.max(...sqftRows.map(r=>r.avgPpsf),1);
  const maxYear = Math.max(...yearRows.map(r=>r.avgPpsf),1);
  const maxBb = Math.max(...bbRows.map(r=>r.avgPpsf),1);
  const maxWord = Math.max(...wordFreq.map(w=>w.count),1);

  container.innerHTML = `
    <div class="space-y-5">
      <!-- KPIs top -->
      <div class="grid grid-cols-4 gap-3">
        <div class="bg-slate-900 text-white rounded-lg p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Appraisals</div>
          <div class="text-2xl font-bold">${done.length}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Valor promedio</div>
          <div class="text-2xl font-bold">${fmt$(avg(values))}</div>
          <div class="text-[10px] text-slate-400">mediana ${fmt$(median(values))}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">$/sqft promedio</div>
          <div class="text-2xl font-bold">$${avg(ppsf).toFixed(0)}</div>
          <div class="text-[10px] text-slate-400">mediana $${median(ppsf).toFixed(0)}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Rango $/sqft</div>
          <div class="text-sm font-bold">$${Math.min(...ppsf).toFixed(0)}–$${Math.max(...ppsf).toFixed(0)}</div>
          <div class="text-[10px] text-slate-400">spread ${((Math.max(...ppsf)-Math.min(...ppsf))/Math.min(...ppsf)*100).toFixed(0)}%</div>
        </div>
      </div>

      <!-- Recomendaciones IA -->
      <div class="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-5">
        <h4 class="text-sm font-bold text-amber-900 uppercase tracking-wide mb-3">💡 Recomendaciones para tu próxima casa</h4>
        <ul class="space-y-2 text-sm text-amber-950">
          ${bestZip ? `<li>🎯 <strong>Zip ${bestZip.zip}</strong> paga el $/sqft más alto: <strong>$${bestZip.avgPpsf.toFixed(0)}</strong> (n=${bestZip.count}). ${zipSpread > 10 ? `Eso es ${zipSpread.toFixed(0)}% más que ${worstZip.zip} ($${worstZip.avgPpsf.toFixed(0)}). Prioriza ese zip si encuentras deal.` : ''}</li>` : ''}
          ${bestSqft ? `<li>📏 <strong>Sweet spot: ${bestSqft.bucket} sqft</strong> — rinde $${bestSqft.avgPpsf.toFixed(0)}/sqft en promedio. Casas en ese rango maximizan tu $/sqft.</li>` : ''}
          ${condDiff ? `<li>🔧 <strong>C2 vs C3 diferencial:</strong> $${condDiff.toFixed(0)}/sqft. En una casa de 1500 sqft eso son ${fmt$(condDiff*1500)} extra. Vale la pena escalar el remodel si el costo extra es menor.</li>` : `<li>⚠️ <strong>Todas tus casas son ${condRows[0]?.cond||'C?'}</strong> — sin datos para medir el lift de subir condition. En el próximo refi, pídele al appraiser que considere C2 si tu remodel lo justifica.</li>`}
          ${wordFreq[0] ? `<li>🛠️ <strong>Features que más aparecen en justificación de valor:</strong> ${wordFreq.slice(0,5).map(w=>`<strong>${w.word}</strong> (${w.count})`).join(', ')}. Estos upgrades pesan en el ARV.</li>` : ''}
          ${bbRows[0] ? `<li>🛏️ <strong>Mejor config beds/baths:</strong> ${bbRows[0].config} → $${bbRows[0].avgPpsf.toFixed(0)}/sqft. ${bbRows[1] ? `Peor: ${bbRows[bbRows.length-1].config} → $${bbRows[bbRows.length-1].avgPpsf.toFixed(0)}/sqft.` : ''}</li>` : ''}
        </ul>
      </div>

      <!-- $/sqft por zip -->
      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Zip Code</h4>
        <div class="space-y-1.5">
          ${zipRows.map(r => `
            <div class="grid grid-cols-[70px_1fr_70px_50px] gap-3 items-center text-sm">
              <span class="font-mono font-semibold">${r.zip}</span>
              ${bar(r.avgPpsf, maxZip, r === bestZip ? 'bg-green-600' : 'bg-slate-700')}
              <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
              <span class="text-right text-xs text-slate-500">n=${r.count}</span>
            </div>
            <div class="text-[10px] text-slate-400 pl-[82px] -mt-1 mb-1">avg ${fmt$(r.avgValue)} • avg ${r.avgSqft.toFixed(0)} sqft • rango $${r.minPpsf.toFixed(0)}-$${r.maxPpsf.toFixed(0)}/sqft</div>
          `).join('')}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <!-- Por Condition -->
        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Condition</h4>
          <div class="space-y-1.5">
            ${condRows.map(r => `
              <div class="grid grid-cols-[40px_1fr_60px_30px] gap-2 items-center text-sm">
                <span class="font-mono font-semibold">${r.cond}</span>
                ${bar(r.avgPpsf, maxCond)}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-xs text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Por Año -->
        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Año construcción</h4>
          <div class="space-y-1.5">
            ${yearRows.map(r => `
              <div class="grid grid-cols-[90px_1fr_60px_30px] gap-2 items-center text-xs">
                <span class="font-semibold">${r.bucket}</span>
                ${bar(r.avgPpsf, maxYear)}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Por Sqft bucket -->
        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Sweet Spot por Sqft</h4>
          <div class="space-y-1.5">
            ${sqftRows.map(r => `
              <div class="grid grid-cols-[90px_1fr_60px_30px] gap-2 items-center text-xs">
                <span class="font-semibold">${r.bucket}</span>
                ${bar(r.avgPpsf, maxSqftR, r === bestSqft ? 'bg-green-600' : 'bg-slate-700')}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">Casas más pequeñas suelen tener $/sqft más alto.</p>
        </div>

        <!-- Por Beds/Baths -->
        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por configuración Beds/Baths</h4>
          <div class="space-y-1.5">
            ${bbRows.map(r => `
              <div class="grid grid-cols-[80px_1fr_60px_30px] gap-2 items-center text-xs">
                <span class="font-semibold">${r.config}</span>
                ${bar(r.avgPpsf, maxBb)}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Performance por casa -->
      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Performance de cada casa vs. promedio de su zip</h4>
        <p class="text-[10px] text-slate-500 mb-2">Verde = sobre-performer (excelente refi). Rojo = bajo del promedio (oportunidad de mejorar).</p>
        <div class="overflow-x-auto border border-slate-200 rounded-lg">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left px-2 py-2 font-semibold">Casa</th>
                <th class="text-right px-2 py-2 font-semibold">Valor</th>
                <th class="text-right px-2 py-2 font-semibold">$/sqft</th>
                <th class="text-right px-2 py-2 font-semibold">Zip avg</th>
                <th class="text-right px-2 py-2 font-semibold">Delta</th>
                <th class="text-center px-2 py-2 font-semibold">Performance</th>
              </tr>
            </thead>
            <tbody>
              ${houseScores.map(h => {
                const cls = h.pct > 5 ? 'text-green-700 bg-green-50' : h.pct < -5 ? 'text-red-700 bg-red-50' : 'text-slate-600';
                const arrow = h.pct > 5 ? '↑' : h.pct < -5 ? '↓' : '→';
                return `<tr class="border-t border-slate-200 hover:bg-slate-50">
                  <td class="px-2 py-1.5">${h.property_address} <span class="text-slate-400">(${h.zip})</span></td>
                  <td class="px-2 py-1.5 text-right">${fmt$(+h.appraised_value)}</td>
                  <td class="px-2 py-1.5 text-right font-semibold">$${(+h.price_per_sqft).toFixed(0)}</td>
                  <td class="px-2 py-1.5 text-right text-slate-500">$${h.zipAvg.toFixed(0)}</td>
                  <td class="px-2 py-1.5 text-right">${h.delta>=0?'+':''}$${h.delta.toFixed(0)}</td>
                  <td class="px-2 py-1.5 text-center font-bold ${cls} rounded">${arrow} ${h.pct>0?'+':''}${h.pct.toFixed(1)}%</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Features mencionadas -->
      ${wordFreq.length ? `
      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Features que justifican el valor (de las notas del appraiser)</h4>
        <p class="text-[10px] text-slate-500 mb-2">Cuanto más se menciona, más impacta. Prioriza estos upgrades en tu próxima remodelación.</p>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
          ${wordFreq.slice(0,12).map(w => `
            <div class="grid grid-cols-[90px_1fr_25px] gap-2 items-center text-xs">
              <span class="font-semibold capitalize">${w.word}</span>
              ${bar(w.count, maxWord)}
              <span class="text-right text-slate-500">${w.count}</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}
    </div>
  `;
}

// ===== Tab: LISTA =====
function renderListTab(sys, appraisals) {
  const container = document.getElementById('appr-tab-content');
  const fmt = n => n == null ? '—' : (typeof n === 'number' ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : n);
  const statusBadge = a => {
    const map = { pending:'bg-slate-200 text-slate-700', processing:'bg-amber-100 text-amber-700 animate-pulse', done:'bg-green-100 text-green-700', error:'bg-red-100 text-red-700' };
    return `<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded ${map[a.status]}">${a.status}</span>`;
  };

  container.innerHTML = `
    <div class="space-y-4">
      <div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-slate-900 transition">
        <input type="file" id="appr-upload" accept="application/pdf" multiple class="hidden" />
        <label for="appr-upload" class="cursor-pointer">
          <div class="text-3xl mb-2">📄</div>
          <div class="text-sm font-semibold text-slate-700">Subir PDF(s) de appraisal</div>
          <div class="text-xs text-slate-500 mt-1">La IA extrae los datos automáticamente. Los insights se actualizan solos.</div>
        </label>
      </div>

      <div id="appr-progress" class="hidden text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded p-3"></div>

      <div class="overflow-x-auto border border-slate-200 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Dirección</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Valor</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">$/sqft</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Sqft</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Bd/Ba</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Año</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Zip</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Cond.</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Status</th>
              <th class="w-20"></th>
            </tr>
          </thead>
          <tbody>
            ${appraisals.map(a => `
              <tr class="border-t border-slate-200 hover:bg-slate-50">
                <td class="px-3 py-2">${a.property_address || '—'}</td>
                <td class="px-3 py-2 font-semibold">${fmt(a.appraised_value)}</td>
                <td class="px-3 py-2">${a.price_per_sqft ? '$'+(+a.price_per_sqft).toFixed(0) : '—'}</td>
                <td class="px-3 py-2">${a.gla_sqft || '—'}</td>
                <td class="px-3 py-2">${a.bedrooms || '—'}/${a.bathrooms || '—'}</td>
                <td class="px-3 py-2">${a.year_built || '—'}</td>
                <td class="px-3 py-2">${a.zip || '—'}</td>
                <td class="px-3 py-2">${a.condition_rating || '—'}</td>
                <td class="px-3 py-2">${statusBadge(a)}</td>
                <td class="px-2 py-2 text-right whitespace-nowrap">
                  <button onclick="viewAppraisal('${a.id}')" class="text-xs text-slate-600 hover:text-slate-900 mr-1">👁️</button>
                  ${a.status === 'error' ? `<button onclick="retryAppraisal('${a.id}','${sys.id}')" class="text-xs text-amber-600 hover:text-amber-800 mr-1" title="Reintentar">🔄</button>` : ''}
                  ${isAdmin() ? `<button onclick="deleteAppraisal('${a.id}','${sys.id}')" class="text-xs text-red-600 hover:text-red-800">🗑️</button>` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="10" class="text-center text-slate-400 py-8">Sin appraisals todavía.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('appr-upload').addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const progress = document.getElementById('appr-progress');
    progress.classList.remove('hidden');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progress.textContent = `📤 Subiendo ${i+1}/${files.length}: ${file.name}...`;
      try {
        await uploadAppraisal(file, (msg) => {
          progress.textContent = `🤖 (${i+1}/${files.length}) ${file.name}: ${msg}`;
        });
      } catch (err) {
        progress.textContent = `⚠️ ${file.name}: ${err.message}. Continuando...`;
        await sleep(2000);
      }
      // Espera entre uploads para no exceder rate limit Claude (30K tokens/min)
      if (i < files.length - 1) {
        for (let s = 30; s > 0; s--) {
          progress.textContent = `⏳ Esperando ${s}s antes del siguiente PDF (rate limit Claude)...`;
          await sleep(1000);
        }
      }
    }
    progress.textContent = `✓ Todo procesado.`;
    setTimeout(() => openAppraisals(sys), 1500);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function uploadAppraisal(file, onProgress) {
  const path = `${state.user.id}/${Date.now()}_${file.name}`;
  if (onProgress) onProgress('subiendo PDF...');
  const { error: upErr } = await sb.storage.from('appraisals').upload(path, file);
  if (upErr) throw upErr;
  const { data: inserted, error: insErr } = await sb.from('appraisals')
    .insert({ pdf_path: path, uploaded_by: state.user.id, status: 'pending' })
    .select().single();
  if (insErr) throw insErr;
  if (onProgress) onProgress('extrayendo datos con IA (puede tomar 30-60s)...');
  // Await edge function para procesar secuencialmente y evitar rate limit
  const { error: fnErr } = await sb.functions.invoke('extract-appraisal', { body: { appraisalId: inserted.id } });
  if (fnErr) throw new Error(fnErr.message || 'Error en extract-appraisal');
  return inserted;
}

async function retryAppraisal(appraisalId, sysId) {
  await sb.from('appraisals').update({ status: 'pending', error_message: null }).eq('id', appraisalId);
  const sys = findSystem(sysId);
  if (sys) openAppraisals(sys);
  try {
    await sb.functions.invoke('extract-appraisal', { body: { appraisalId } });
  } catch (e) {
    console.error(e);
  }
  if (sys) setTimeout(() => openAppraisals(sys), 1000);
}

async function viewAppraisal(id) {
  const { data: a } = await sb.from('appraisals').select('*').eq('id', id).single();
  if (!a) return;
  const fmt = n => n == null ? '—' : (typeof n === 'number' ? n.toLocaleString('en-US') : n);
  const { data: urlData } = await sb.storage.from('appraisals').createSignedUrl(a.pdf_path, 3600);
  const pdfUrl = urlData?.signedUrl;
  const row = (k, v) => `<div class="flex justify-between py-1 border-b border-slate-100 text-sm"><span class="text-slate-500">${k}</span><span class="font-medium">${v ?? '—'}</span></div>`;
  const comps = (a.comparables || []).map(c => `
    <div class="bg-slate-50 rounded p-2 text-xs">
      <div class="font-semibold">${c.address || '—'}</div>
      <div class="text-slate-600">${c.sale_price ? '$'+(+c.sale_price).toLocaleString() : '—'} • ${c.gla_sqft || '—'} sqft • ${c.sale_date || '—'}</div>
    </div>
  `).join('') || '<p class="text-xs text-slate-400">Sin comparables extraídos</p>';

  openModal(`📄 ${a.property_address || 'Appraisal'}`, `
    <div class="grid grid-cols-2 gap-6">
      <div>
        <h4 class="text-xs font-bold text-slate-600 uppercase mb-2">Propiedad</h4>
        ${row('Dirección', a.property_address)}
        ${row('Ciudad', `${a.city || ''}, ${a.state || ''} ${a.zip || ''}`)}
        ${row('Condado', a.county)}
        ${row('Effective date', a.effective_date)}

        <h4 class="text-xs font-bold text-slate-600 uppercase mb-2 mt-4">Características</h4>
        ${row('GLA (sqft)', fmt(a.gla_sqft))}
        ${row('Lot size (sqft)', fmt(a.lot_size_sqft))}
        ${row('Año', a.year_built)}
        ${row('Beds / Baths', `${a.bedrooms || '—'} / ${a.bathrooms || '—'}`)}
        ${row('Garage', a.garage_spaces)}
        ${row('Pisos', a.stories)}
        ${row('Condition', a.condition_rating)}
        ${row('Quality', a.quality_rating)}

        <h4 class="text-xs font-bold text-slate-600 uppercase mb-2 mt-4">Valoración</h4>
        ${row('Appraised value', a.appraised_value ? '$'+(+a.appraised_value).toLocaleString() : '—')}
        ${row('$/sqft', a.price_per_sqft ? '$'+(+a.price_per_sqft).toFixed(2) : '—')}

        ${pdfUrl ? `<a href="${pdfUrl}" target="_blank" class="block mt-4 text-center bg-slate-900 text-white text-sm py-2 rounded-lg hover:bg-slate-700">📄 Ver PDF original</a>` : ''}
      </div>
      <div>
        <h4 class="text-xs font-bold text-slate-600 uppercase mb-2">Comparables</h4>
        <div class="space-y-2">${comps}</div>

        <h4 class="text-xs font-bold text-slate-600 uppercase mb-2 mt-4">Notas IA</h4>
        <p class="text-xs text-slate-600 bg-slate-50 rounded p-3 leading-relaxed">${a.notes || '—'}</p>

        ${a.status === 'error' ? `<div class="mt-4 text-xs text-red-600 bg-red-50 rounded p-3"><strong>Error:</strong> ${a.error_message}</div>` : ''}
      </div>
    </div>
  `);
}

async function deleteAppraisal(id, sysId) {
  if (!confirm('¿Borrar este appraisal y su PDF?')) return;
  const { data: a } = await sb.from('appraisals').select('pdf_path').eq('id', id).single();
  if (a?.pdf_path) await sb.storage.from('appraisals').remove([a.pdf_path]);
  await sb.from('appraisals').delete().eq('id', id);
  const sys = findSystem(sysId);
  if (sys) openAppraisals(sys);
}

// --- Tabla ---
function openTable(sys) {
  const cols = sys.config.columns || [];
  const rows = sys.data.rows || [];
  openModal(`📋 ${sys.name}`, `
    <div class="space-y-3">
      <div class="overflow-x-auto border border-slate-200 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>${cols.map(c => `<th class="text-left px-3 py-2 font-semibold text-slate-700">${c}</th>`).join('')}<th class="w-10"></th></tr>
          </thead>
          <tbody id="tbl-body">
            ${rows.map((r, i) => `
              <tr class="border-t border-slate-200">
                ${cols.map((c, ci) => `<td class="px-3 py-2"><input data-row="${i}" data-col="${ci}" value="${(r[ci] || '').replace(/"/g,'&quot;')}" class="w-full bg-transparent focus:bg-white focus:outline-1 focus:outline-slate-300 rounded px-1" /></td>`).join('')}
                <td class="px-2 text-center"><button onclick="tableDelRow('${sys.id}',${i})" class="text-slate-400 hover:text-red-600">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button onclick="tableAddRow('${sys.id}')" class="text-sm text-slate-600 hover:text-slate-900">+ Agregar fila</button>
    </div>`);
  document.getElementById('tbl-body').addEventListener('input', e => {
    if (e.target.tagName !== 'INPUT') return;
    const r = +e.target.dataset.row, c = +e.target.dataset.col;
    if (!sys.data.rows) sys.data.rows = [];
    if (!sys.data.rows[r]) sys.data.rows[r] = [];
    sys.data.rows[r][c] = e.target.value;
    saveSystemData(sys);
  });
}
function findSystem(sysId) {
  for (const arr of Object.values(state.systems)) {
    const s = arr.find(x => x.id === sysId);
    if (s) return s;
  }
}
function tableAddRow(sysId) {
  const sys = findSystem(sysId);
  if (!sys.data.rows) sys.data.rows = [];
  sys.data.rows.push(sys.config.columns.map(() => ''));
  saveSystemData(sys);
  openTable(sys);
}
function tableDelRow(sysId, idx) {
  const sys = findSystem(sysId);
  sys.data.rows.splice(idx, 1);
  saveSystemData(sys);
  openTable(sys);
}

// --- Checklist ---
function openChecklist(sys) {
  const items = sys.config.items || [];
  const checked = sys.data.checked || {};
  openModal(`✅ ${sys.name}`, `
    <div class="space-y-2">
      ${items.map((it, i) => `
        <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
          <input type="checkbox" data-i="${i}" ${checked[i] ? 'checked' : ''} class="w-5 h-5 rounded" />
          <span class="${checked[i] ? 'line-through text-slate-400' : 'text-slate-800'}">${it}</span>
        </label>`).join('')}
      <div class="pt-3 text-xs text-slate-500">${Object.values(checked).filter(Boolean).length} / ${items.length} completados</div>
      <button onclick="checklistReset('${sys.id}')" class="text-xs text-slate-500 hover:text-slate-900">Reiniciar</button>
    </div>`);
  document.getElementById('modal-body').addEventListener('change', e => {
    if (e.target.type !== 'checkbox') return;
    const i = e.target.dataset.i;
    if (!sys.data.checked) sys.data.checked = {};
    sys.data.checked[i] = e.target.checked;
    saveSystemData(sys);
    openChecklist(sys);
  });
}
function checklistReset(sysId) {
  const sys = findSystem(sysId);
  sys.data.checked = {};
  saveSystemData(sys);
  openChecklist(sys);
}

// --- Calculadora genérica ---
function openCalculator(sys) {
  const inputs = sys.config.inputs || [];
  const values = sys.data.values || {};
  openModal(`🧮 ${sys.name}`, `
    <div class="space-y-3">
      ${inputs.map(inp => `
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">${inp.label}</label>
          <input type="number" data-name="${inp.name}" value="${values[inp.name] ?? ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>`).join('')}
      <div class="mt-4 p-4 bg-slate-900 text-white rounded-lg">
        <div class="text-xs text-slate-400">${sys.config.resultLabel || 'Resultado'}</div>
        <div id="calc-result" class="text-2xl font-bold mt-1">—</div>
      </div>
    </div>`);
  const recompute = () => {
    const vars = {};
    document.querySelectorAll('#modal-body input[data-name]').forEach(el => { vars[el.dataset.name] = parseFloat(el.value) || 0; });
    sys.data.values = vars;
    saveSystemData(sys);
    try {
      const fn = new Function(...Object.keys(vars), `return (${sys.config.formula});`);
      const res = fn(...Object.values(vars));
      document.getElementById('calc-result').textContent = Number.isFinite(res) ? res.toLocaleString('es-MX', { maximumFractionDigits: 2 }) : '—';
    } catch { document.getElementById('calc-result').textContent = 'Error'; }
  };
  document.getElementById('modal-body').addEventListener('input', recompute);
  recompute();
}

// --- Notas ---
function openNotes(sys) {
  openModal(`📝 ${sys.name}`, `
    <textarea id="notes-area" rows="18" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono" placeholder="Escribe aquí...">${sys.data.text || ''}</textarea>
    <p class="text-xs text-slate-400 mt-2">Se guarda automáticamente</p>`);
  document.getElementById('notes-area').addEventListener('input', e => {
    sys.data.text = e.target.value;
    saveSystemData(sys);
  });
}

// --- Cash-Out Refi (simple: solo ARV + Payoff) ---
function migrateCashoutData(sys) {
  if (sys.data && sys.data.deals && sys.data.settings) return;
  const old = sys.data || {};
  // Migración: extrae el deal anterior si existe
  const firstDeal = old.deals ? Object.values(old.deals)[0] : null;
  sys.data = {
    settings: {
      ltv: 75,
      closingCostsFixed: 23000, // promedio de 3 deals reales (Texas)
      useCostsPct: false,
      closingCostsPct: 8 // si prefiere % en vez de fijo
    },
    currentDealId: 'd1',
    deals: {
      d1: {
        name: firstDeal?.name || 'Deal ejemplo',
        arv: firstDeal?.arv ?? old.arv ?? 380000,
        payoff: firstDeal?.payoff ?? old.payoff ?? 211543
      }
    }
  };
}

async function openCashout(sys) {
  migrateCashoutData(sys);
  await loadProperties();
  const fmt = n => (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const s = sys.data.settings;
  const d = sys.data.deals[sys.data.currentDealId];

  const dealOptions = Object.entries(sys.data.deals).map(([id, dd]) =>
    `<option value="${id}" ${id === sys.data.currentDealId ? 'selected' : ''}>${dd.name || id}</option>`
  ).join('');

  const showAdminSettings = isAdmin();
  window._cashoutCurrentSys = sys;

  openModal(`💰 ${sys.name}`, `
    ${propertySelectorHtml(d.propertyId, 'cashoutOnPropertyChange', 'cashoutSaveProperty')}
    <div class="flex items-center gap-2 mb-5 pb-3 border-b border-slate-200">
      <label class="text-xs font-semibold text-slate-600 uppercase">Deal:</label>
      <select id="co-deal-select" class="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm">${dealOptions}</select>
      <button onclick="cashoutNewDeal('${sys.id}')" class="text-xs bg-slate-900 text-white px-3 py-1.5 rounded">+ Nuevo</button>
      <button onclick="cashoutDeleteDeal('${sys.id}')" class="text-xs text-red-600 hover:bg-red-50 px-2 py-1.5 rounded">Borrar</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Propiedad</label>
          <input id="co-name" value="${d.name || ''}" placeholder="Ej: 1100 Echo Lane" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Valor del appraisal (ARV)</label>
          <input type="number" id="co-arv" value="${d.arv ?? ''}" class="w-full border border-slate-300 rounded-lg px-4 py-3 text-lg" />
          <p class="text-xs text-slate-500 mt-1">Lo que tasó la propiedad ya remodelada</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Préstamo actual (Payoff)</label>
          <input type="number" id="co-payoff" value="${d.payoff ?? ''}" class="w-full border border-slate-300 rounded-lg px-4 py-3 text-lg" />
          <p class="text-xs text-slate-500 mt-1">Lo que debes hoy al Hard Money Lender</p>
        </div>

        ${showAdminSettings ? `
        <details class="border border-slate-200 rounded-lg">
          <summary class="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600 uppercase hover:bg-slate-50">⚙️ Ajustes (admin)</summary>
          <div class="p-3 space-y-3 border-t border-slate-200">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">LTV % del refi</label>
              <input type="number" step="0.01" id="co-ltv" value="${s.ltv}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <p class="text-[10px] text-slate-400 mt-0.5">75% típico para conv. cash-out refi</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Closing costs estimados</label>
              <div class="flex gap-2 mb-2">
                <label class="flex items-center gap-1 text-xs"><input type="radio" name="co-mode" value="fixed" ${!s.useCostsPct ? 'checked' : ''}> Monto fijo</label>
                <label class="flex items-center gap-1 text-xs"><input type="radio" name="co-mode" value="pct" ${s.useCostsPct ? 'checked' : ''}> % del loan</label>
              </div>
              <div id="co-costs-fixed" class="${s.useCostsPct ? 'hidden' : ''}">
                <input type="number" id="co-costs-fixed-input" value="${s.closingCostsFixed}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <p class="text-[10px] text-slate-400 mt-0.5">Promedio histórico: ~$23,000 (3 refis TX)</p>
              </div>
              <div id="co-costs-pct" class="${s.useCostsPct ? '' : 'hidden'}">
                <input type="number" step="0.1" id="co-costs-pct-input" value="${s.closingCostsPct}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <p class="text-[10px] text-slate-400 mt-0.5">Promedio: ~8% del loan amount</p>
              </div>
            </div>
          </div>
        </details>` : ''}
      </div>

      <div class="bg-slate-900 text-white rounded-xl p-6 self-start sticky top-0">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Estimación</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-slate-300">Nuevo préstamo (<span id="co-ltv-show">75</span>% × ARV)</span><span id="co-loan" class="font-semibold">—</span></div>
          <div class="flex justify-between text-red-300"><span>− Payoff actual</span><span id="co-payoff-out">—</span></div>
          <div class="flex justify-between text-red-300"><span>− Closing costs estimados</span><span id="co-costs">—</span></div>
          <div class="border-t border-slate-700 pt-4 mt-4">
            <div class="text-xs text-slate-400 uppercase tracking-wide">Cash-out estimado</div>
            <div id="co-cashout" class="text-4xl font-bold mt-1">—</div>
            <div id="co-warning" class="hidden mt-2 text-xs text-amber-300"></div>
          </div>
          <div class="border-t border-slate-700 pt-3 mt-3 space-y-1 text-xs text-slate-400">
            <div class="flex justify-between"><span>Cash-out vs ARV</span><span id="co-cashout-arv">—</span></div>
            <div class="flex justify-between"><span>Payoff vs nuevo loan</span><span id="co-ltc">—</span></div>
          </div>
          <p class="text-[10px] text-slate-500 mt-4 leading-relaxed">Estimación basada en promedio de costos de cierre históricos. El número real al cierre puede variar ±$2-3K.</p>
        </div>
        ${aiBoxHtml('cashout-refi', 'Validar con mercado en vivo', 'Claude busca comps reales, valida ARV, trae LTV real de lenders Texas mayo 2026, tasas actuales', 'cashoutRunAI')}
      </div>
    </div>`);
  // Render AI result si existe
  setTimeout(() => {
    const aiState = window.aiState['cashout-refi'];
    const el = document.getElementById('ai-result-cashout-refi');
    if (el && aiState?.analysis) el.innerHTML = aiResultGenericHtml(aiState.analysis);
  }, 50);

  document.getElementById('co-deal-select').addEventListener('change', e => {
    sys.data.currentDealId = e.target.value;
    saveSystemData(sys);
    openCashout(sys);
  });

  const recompute = () => {
    const dd = sys.data.deals[sys.data.currentDealId];
    dd.name = document.getElementById('co-name').value;
    dd.arv = parseFloat(document.getElementById('co-arv').value) || 0;
    dd.payoff = parseFloat(document.getElementById('co-payoff').value) || 0;

    if (showAdminSettings) {
      s.ltv = parseFloat(document.getElementById('co-ltv').value) || 75;
      s.useCostsPct = document.querySelector('input[name="co-mode"]:checked').value === 'pct';
      s.closingCostsFixed = parseFloat(document.getElementById('co-costs-fixed-input').value) || 0;
      s.closingCostsPct = parseFloat(document.getElementById('co-costs-pct-input').value) || 0;
      document.getElementById('co-costs-fixed').classList.toggle('hidden', s.useCostsPct);
      document.getElementById('co-costs-pct').classList.toggle('hidden', !s.useCostsPct);
    }

    const loan = dd.arv * (s.ltv / 100);
    const closingCosts = s.useCostsPct ? loan * (s.closingCostsPct / 100) : s.closingCostsFixed;
    const cashout = loan - dd.payoff - closingCosts;

    document.getElementById('co-ltv-show').textContent = s.ltv;
    document.getElementById('co-loan').textContent = fmt(loan);
    document.getElementById('co-payoff-out').textContent = fmt(dd.payoff);
    document.getElementById('co-costs').textContent = fmt(closingCosts);
    const co = document.getElementById('co-cashout');
    co.textContent = fmt(cashout);
    co.className = `text-4xl font-bold mt-1 ${cashout < 0 ? 'text-red-400' : cashout < 5000 ? 'text-amber-300' : 'text-green-400'}`;
    const warn = document.getElementById('co-warning');
    if (cashout < 0) { warn.textContent = `⚠️ Faltarían ${fmt(Math.abs(cashout))} para cubrir el cierre`; warn.classList.remove('hidden'); }
    else if (cashout < 5000) { warn.textContent = `⚠️ Cash-out marginal — revisar números`; warn.classList.remove('hidden'); }
    else warn.classList.add('hidden');

    document.getElementById('co-cashout-arv').textContent = dd.arv ? `${(cashout/dd.arv*100).toFixed(2)}%` : '—';
    document.getElementById('co-ltc').textContent = loan ? `${(dd.payoff/loan*100).toFixed(1)}%` : '—';

    const opt = document.querySelector(`#co-deal-select option[value="${sys.data.currentDealId}"]`);
    if (opt) opt.textContent = dd.name || sys.data.currentDealId;

    saveSystemData(sys);
  };

  ['co-name','co-arv','co-payoff'].forEach(id => document.getElementById(id).addEventListener('input', recompute));
  if (showAdminSettings) {
    ['co-ltv','co-costs-fixed-input','co-costs-pct-input'].forEach(id => document.getElementById(id).addEventListener('input', recompute));
    document.querySelectorAll('input[name="co-mode"]').forEach(el => el.addEventListener('change', recompute));
  }
  recompute();
}

function cashoutNewDeal(sysId) {
  const sys = findSystem(sysId);
  const name = prompt('Nombre del nuevo deal (ej: "1100 Echo Lane"):');
  if (!name) return;
  const id = 'd' + Date.now();
  sys.data.deals[id] = { name, arv: 0, payoff: 0 };
  sys.data.currentDealId = id;
  saveSystemData(sys);
  openCashout(sys);
}

function cashoutDeleteDeal(sysId) {
  const sys = findSystem(sysId);
  if (Object.keys(sys.data.deals).length <= 1) return alert('Debe quedar al menos un deal');
  const dd = sys.data.deals[sys.data.currentDealId];
  if (!confirm(`¿Borrar "${dd.name || sys.data.currentDealId}"?`)) return;
  delete sys.data.deals[sys.data.currentDealId];
  sys.data.currentDealId = Object.keys(sys.data.deals)[0];
  saveSystemData(sys);
  openCashout(sys);
}

// ===== Cashout — integración con properties =====
function cashoutOnPropertyChange(propId) {
  const sys = window._cashoutCurrentSys;
  const d = sys.data.deals[sys.data.currentDealId];
  if (!propId) { d.propertyId = null; saveSystemData(sys); openCashout(sys); return; }
  const p = window.propertiesCache.find(x => x.id === propId);
  if (!p) return;
  d.propertyId = p.id;
  if (p.address) d.name = p.address;
  if (p.arv) d.arv = +p.arv;
  if (p.payoff_hml) d.payoff = +p.payoff_hml;
  saveSystemData(sys);
  openCashout(sys);
}

async function cashoutRunAI(force = false) {
  const sys = window._cashoutCurrentSys;
  const d = sys.data.deals[sys.data.currentDealId];
  const s = sys.data.settings;
  const loan = (+d.arv || 0) * ((+s.ltv || 75) / 100);
  const closingCosts = s.useCostsPct ? loan * (s.closingCostsPct / 100) : s.closingCostsFixed;
  window._aiRefreshCb = () => openCashout(sys);
  await aiAnalyze('cashout-refi', {
    name: d.name, address: d.name,
    arv: d.arv, payoff: d.payoff,
    ltv: s.ltv,
    closing_costs: closingCosts,
    sqft: null, zip: null
  }, force);
}

async function cashoutSaveProperty() {
  const sys = window._cashoutCurrentSys;
  const d = sys.data.deals[sys.data.currentDealId];
  const s = sys.data.settings;
  const loan = (+d.arv || 0) * ((+s.ltv || 75) / 100);
  const cashout = loan - (+d.payoff || 0) - (s.useCostsPct ? loan * (s.closingCostsPct / 100) : s.closingCostsFixed);
  const payload = {
    address: d.name || 'Sin nombre',
    arv: d.arv,
    payoff_hml: d.payoff,
    cashout_estimated: cashout
  };
  const newId = await upsertProperty(payload, d.propertyId);
  if (newId) {
    d.propertyId = newId;
    saveSystemData(sys);
    await loadProperties();
    openCashout(sys);
    alert('✓ Propiedad guardada/actualizada');
  }
}

// ============================================================
// ÁREAS
// ============================================================
document.getElementById('add-area-btn').addEventListener('click', async () => {
  const name = prompt('Nombre del área:');
  if (!name) return;
  const icon = prompt('Ícono (emoji):', '📁') || '📁';
  const description = prompt('Descripción:') || '';
  const id = uid();
  const position = state.areas.length;
  const { error } = await sb.from('areas').insert({ id, name, icon, description, position });
  if (error) return alert('Error: ' + error.message);
  await loadData();
  state.currentAreaId = id;
  render();
});

document.getElementById('add-system-btn').addEventListener('click', openAddSystem);

// ============================================================
// INIT
// ============================================================
initAuth();
