// ════════════════════════════════════════════════════════════════
// 🏠 PROPERTY MANAGEMENT · módulo principal
// Tabs: Propiedades · Calendario · Reservas · Finanzas
// Depende de: sb, state, openModal, closeModal (de app.js / ui-toolkit)
// ════════════════════════════════════════════════════════════════

const pmaState = {
  tab: 'properties',                 // properties · calendar · bookings · finance · feeds
  selectedPropertyId: null,           // para vista detalle
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),   // 0-11
  calendarView: 'month',                  // 'year' | 'month'
  calendarFilterPropertyId: null,     // filtro de calendario (null = todas)
  // Data
  properties: [],
  units: [],
  bookings: [],
  tenants: [],
  payments: [],
  feeds: [],                          // 🆕 calendarios externos
  loading: false,
  // Form state
  editingProperty: null,
  editingUnit: null,
  editingBooking: null,
  editingPayment: null
};
window.pmaState = pmaState;

// ════════════════════════════════════════════════════════════════
// CARGA DE DATOS
// ════════════════════════════════════════════════════════════════
async function pmLoadAll() {
  pmaState.loading = true;
  pmaState.loadError = null;
  pmRender();
  console.log('[pm] pmLoadAll iniciado');

  // Verificar sesión activa
  try {
    const sbAuth = (typeof sb !== 'undefined' && sb) ? sb : (window.sb || null);
    if (!sbAuth) {
      pmaState.loadError = 'No hay cliente Supabase disponible (sb). Reload la página.';
      console.error('[pm]', pmaState.loadError);
      pmaState.loading = false;
      return pmRender();
    }
    const sess = await sbAuth.auth.getSession();
    if (!sess?.data?.session?.access_token) {
      pmaState.loadError = '⚠️ Sin sesión activa. Cerrá sesión (botón Salir abajo a la izquierda) y volvé a entrar.';
      console.error('[pm]', pmaState.loadError);
      pmaState.loading = false;
      return pmRender();
    }
    console.log('[pm] Sesión OK · user:', sess.data.session.user?.email);
  } catch (e) {
    pmaState.loadError = 'Error verificando sesión: ' + e.message;
    pmaState.loading = false;
    return pmRender();
  }

  // Cargar cada tabla con error específico (NO usar .eq('is_active',true) — algunas units
  // recién importadas pueden tener is_active null y se las saltearíamos)
  const queries = [
    { name: 'properties', q: () => sb.from('pm_properties').select('*').order('name') },
    { name: 'units',      q: () => sb.from('pm_units').select('*').order('code') },
    { name: 'bookings',   q: () => sb.from('pm_bookings').select('*').order('start_date', { ascending: false }).limit(2000) },
    { name: 'tenants',    q: () => sb.from('pm_tenants').select('*').order('full_name').limit(500) },
    { name: 'payments',   q: () => sb.from('pm_payments').select('*').order('paid_at', { ascending: false, nullsFirst: false }).limit(1000) },
    { name: 'feeds',      q: () => sb.from('pm_calendar_feeds').select('*').order('created_at', { ascending: false }) }
  ];

  const results = {};
  for (const { name, q } of queries) {
    try {
      const r = await q();
      if (r.error) {
        console.error(`[pm] Error cargando ${name}:`, r.error);
        results[name] = [];
        pmaState.loadError = pmaState.loadError || `Error cargando ${name}: ${r.error.message}`;
      } else {
        results[name] = r.data || [];
        console.log(`[pm] ${name}: ${results[name].length} registros`);
      }
    } catch (e) {
      console.error(`[pm] Exception cargando ${name}:`, e);
      results[name] = [];
      pmaState.loadError = pmaState.loadError || `Exception cargando ${name}: ${e.message}`;
    }
  }

  pmaState.properties = results.properties || [];
  pmaState.units = results.units || [];
  pmaState.bookings = results.bookings || [];
  pmaState.tenants = results.tenants || [];
  pmaState.payments = results.payments || [];
  pmaState.feeds = results.feeds || [];

  console.log('[pm] Carga completa:', {
    properties: pmaState.properties.length,
    units: pmaState.units.length,
    bookings: pmaState.bookings.length,
    tenants: pmaState.tenants.length,
    payments: pmaState.payments.length,
    feeds: pmaState.feeds.length
  });

  pmaState.loading = false;
  pmRender();
}
window.pmLoadAll = pmLoadAll;

// ════════════════════════════════════════════════════════════════
// HELPERS de cálculo
// ════════════════════════════════════════════════════════════════
function pmUnitsOf(propertyId) {
  return pmaState.units.filter(u => u.property_id === propertyId);
}
function pmBookingsOf(unitId) {
  return pmaState.bookings.filter(b => b.unit_id === unitId);
}
function pmActiveBookingOf(unitId, date = new Date()) {
  const d = (typeof date === 'string') ? date : date.toISOString().slice(0,10);
  return pmaState.bookings.find(b =>
    b.unit_id === unitId
    && ['activo','confirmado'].includes(b.status)
    && b.start_date <= d
    && (!b.end_date || b.end_date >= d)
  );
}
function pmTenantName(id) {
  const t = pmaState.tenants.find(x => x.id === id);
  return t?.full_name || '—';
}
function pmPropertyName(id) {
  const p = pmaState.properties.find(x => x.id === id);
  return p?.name || '—';
}
function pmOccupancyOf(propertyId) {
  const us = pmUnitsOf(propertyId);
  if (!us.length) return { occupied: 0, total: 0, pct: 0 };
  const occ = us.filter(u => pmActiveBookingOf(u.id)).length;
  return { occupied: occ, total: us.length, pct: Math.round(100 * occ / us.length) };
}
function pmFinanceOf(propertyId, monthDate = null) {
  // monthDate: Date|null. null = all-time, else solo el mes específico
  let pays = pmaState.payments.filter(p => p.property_id === propertyId && p.status === 'pagado');
  if (monthDate) {
    const ym = monthDate.toISOString().slice(0,7);
    pays = pays.filter(p => (p.paid_at || '').startsWith(ym));
  }
  const ingresos = pays.filter(p => p.type === 'ingreso').reduce((s,p) => s + Number(p.amount||0), 0);
  const gastos = pays.filter(p => p.type === 'gasto').reduce((s,p) => s + Number(p.amount||0), 0);
  return { ingresos, gastos, utilidad: ingresos - gastos };
}

// ════════════════════════════════════════════════════════════════
// LAUNCHER
// ════════════════════════════════════════════════════════════════
function openPmSystem() {
  pmaState.tab = pmaState.tab || 'properties';
  pmaState.selectedPropertyId = null;
  openModal('🏠 Property Management · Rental Profits', '<div id="pm-root" style="min-height:60vh;">Cargando…</div>');
  // Ensanchar modal
  setTimeout(() => {
    const md = document.querySelector('#modal > div');
    if (md) { md.classList.remove('max-w-3xl'); md.classList.add('max-w-7xl'); }
  }, 50);
  pmLoadAll();
}
window.openPmSystem = openPmSystem;

// ════════════════════════════════════════════════════════════════
// RENDER ROOT — orquesta el tab activo
// ════════════════════════════════════════════════════════════════
function pmRender() {
  const root = document.getElementById('pm-root');
  if (!root) return;
  if (pmaState.loading) {
    root.innerHTML = '<div class="p-8 text-center text-slate-500">⏳ Cargando datos...</div>';
    return;
  }
  if (pmaState.loadError) {
    root.innerHTML = `
      <div class="p-8">
        <div class="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
          <div class="text-5xl mb-2">⚠️</div>
          <div class="font-bold text-red-900 mb-2">No pude cargar los datos</div>
          <div class="text-sm text-red-700 mb-4 whitespace-pre-wrap">${pmaState.loadError}</div>
          <div class="flex gap-2 justify-center">
            <button onclick="pmLoadAll()" class="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded">🔄 Reintentar</button>
            <button onclick="closeModal()" class="bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold px-4 py-2 rounded">Cerrar</button>
          </div>
          <div class="text-[10px] text-red-600 mt-3">Abrí la consola (F12 → Console) para ver el error completo</div>
        </div>
      </div>
    `;
    return;
  }
  root.innerHTML = `
    <div class="flex flex-col" style="min-height:60vh;">
      <!-- Header con tabs -->
      <div class="border-b border-slate-200 mb-3">
        <div class="flex gap-1 -mb-px overflow-x-auto">
          ${[
            ['properties','🏘️ Propiedades', pmaState.properties.length],
            ['calendar','📅 Calendario', ''],
            ['bookings','📋 Reservas', pmaState.bookings.length],
            ['feeds','📡 Feeds', pmaState.feeds.length],
            ['finance','💰 Finanzas', '']
          ].map(([k, label, count]) => `
            <button onclick="pmSetTab('${k}')" class="px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${pmaState.tab===k?'border-emerald-500 text-emerald-700':'border-transparent text-slate-500 hover:text-slate-700'}">
              ${label}${count!==''?` <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">${count}</span>`:''}
            </button>
          `).join('')}
        </div>
      </div>
      <!-- Contenido del tab -->
      <div class="flex-1 overflow-y-auto" style="max-height:75vh;">
        ${pmaState.tab === 'properties' ? (pmaState.selectedPropertyId ? pmRenderPropertyDetail() : pmRenderPropertiesList()) : ''}
        ${pmaState.tab === 'calendar'   ? pmRenderCalendar() : ''}
        ${pmaState.tab === 'bookings'   ? pmRenderBookings() : ''}
        ${pmaState.tab === 'feeds'      ? pmRenderFeeds() : ''}
        ${pmaState.tab === 'finance'    ? pmRenderFinance() : ''}
      </div>
    </div>
  `;
}
window.pmRender = pmRender;

function pmSetTab(tab) {
  pmaState.tab = tab;
  pmaState.selectedPropertyId = null;
  pmRender();
}
window.pmSetTab = pmSetTab;

// ════════════════════════════════════════════════════════════════
// TAB 1 · PROPIEDADES (lista)
// ════════════════════════════════════════════════════════════════
function pmRenderPropertiesList() {
  const props = pmaState.properties;
  pmaState.expandedProperties = pmaState.expandedProperties || new Set();
  return `
    <div class="space-y-3 p-1">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="text-base font-bold text-slate-900">${props.length} propiedades — Click para ver unidades</div>
          <div class="text-xs text-slate-500">${pmaState.units.length} unidades totales · ${pmaState.bookings.filter(b => ['activo','confirmado'].includes(b.status)).length} reservas activas</div>
        </div>
        <div class="flex gap-2">
          <button onclick="pmOpenAirtableImport()" class="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold px-3 py-1.5 rounded">🔄 Sync Airtable</button>
          <button onclick="pmEditProperty(null)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">+ Nueva Propiedad</button>
        </div>
      </div>
      ${!props.length ? `
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center">
          <div class="text-5xl mb-2">🏠</div>
          <div class="font-bold text-slate-700">Sin propiedades cargadas</div>
          <div class="text-xs text-slate-500 mt-1">Cargá la primera para empezar.</div>
          <button onclick="pmEditProperty(null)" class="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 rounded">+ Nueva Propiedad</button>
        </div>
      ` : `
        <div class="space-y-2">
          ${props.map(p => pmRenderPropertyCardInline(p)).join('')}
        </div>
      `}
    </div>
  `;
}

// Card expandible inline — estilo RentasPro
function pmRenderPropertyCardInline(p) {
  const expanded = pmaState.expandedProperties.has(p.id);
  const units = pmUnitsOf(p.id);
  const occupiedUnits = units.filter(u => pmActiveBookingOf(u.id));
  const reservedUnits = units.filter(u => pmaState.bookings.find(b => b.unit_id === u.id && b.status === 'confirmado'));
  const maintenanceUnits = units.filter(u => u.maintenance_status === 'en_mantenimiento' || u.is_active === false);
  const freeUnits = Math.max(0, units.length - occupiedUnits.length - reservedUnits.length - maintenanceUnits.length);
  const potentialMo = units.reduce((s, u) => s + Number(u.target_rent || 0), 0);
  const modelLabel = p.rental_model === 'casa_completa' ? '🏡 Casa Completa'
                   : p.rental_model === 'por_habitaciones' ? '🛏 Habitaciones'
                   : p.rental_model === 'por_estudios' ? '🎨 Estudios'
                   : p.rental_model === 'por_apartamentos' ? '🏢 Apartamentos'
                   : '🔀 Mixto';

  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden ${expanded?'ring-2 ring-emerald-200':''}">
      <!-- Header colapsado -->
      <div class="px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3 flex-wrap" onclick="pmToggleExpandProperty('${p.id}')">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <span class="text-slate-400 text-sm">${expanded?'▼':'▶'}</span>
          <span class="text-2xl">🏠</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <strong class="text-sm text-slate-900 truncate">${(p.name||'').replace(/</g,'&lt;')}</strong>
              <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase font-bold">${p.status||'activa'}</span>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap mt-0.5">
              <span>📍 ${(p.address||'').replace(/</g,'&lt;')}</span>
              ${p.zone ? `<span>· ${p.zone}</span>` : ''}
              ${units.length ? `<span>· 🛏 ${units.length} unid.</span>` : ''}
              ${p.sqft ? `<span>· ${p.sqft} sqft</span>` : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 text-right flex-shrink-0">
          <div class="hidden md:block">
            <div class="text-[9px] uppercase text-slate-500 font-bold">${modelLabel}</div>
            <div class="text-[11px] text-slate-700">
              ${units.length} unid · ${occupiedUnits.length} inq · $${potentialMo.toLocaleString()}/mes
            </div>
          </div>
          <button onclick="event.stopPropagation();pmEditProperty('${p.id}')" class="text-slate-400 hover:text-slate-700 p-1" title="Editar">✏️</button>
          <button onclick="event.stopPropagation();pmDeleteProperty('${p.id}')" class="text-slate-400 hover:text-red-600 p-1" title="Eliminar">🗑</button>
        </div>
      </div>

      ${expanded ? `
        <div class="border-t border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <!-- TRAZABILIDAD: chips de unidades -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="text-[10px] uppercase font-bold text-slate-700 tracking-wider">● Trazabilidad</div>
              <div class="text-[10px] text-slate-500">${units.filter(u=>u.is_active!==false).length} de ${units.length} activas</div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${units.length ? units.map(u => {
                const active = pmActiveBookingOf(u.id);
                const reserved = pmaState.bookings.find(b => b.unit_id === u.id && b.status === 'confirmado');
                const isMaint = u.maintenance_status === 'en_mantenimiento';
                const isInactive = u.is_active === false;
                const stateLabel = isMaint?'MANTEN.':isInactive?'INACTIVA':active?'ACTIVO':reserved?'RESERVADA':'LIBRE';
                const stateColor = isMaint?'bg-amber-100 text-amber-800 border-amber-300':isInactive?'bg-slate-100 text-slate-600 border-slate-300':active?'bg-emerald-100 text-emerald-800 border-emerald-300':reserved?'bg-blue-100 text-blue-800 border-blue-300':'bg-red-50 text-red-700 border-red-200';
                const dot = isMaint?'bg-amber-500':isInactive?'bg-slate-400':active?'bg-emerald-500':reserved?'bg-blue-500':'bg-red-400';
                const icon = u.unit_type==='casa_completa'?'🏠':u.unit_type==='estudio'?'🎨':u.unit_type==='apartamento'?'🏢':'🛏';
                return `<button onclick="pmEditUnit('${u.id}','${p.id}')" class="inline-flex items-center gap-1.5 ${stateColor} border text-[11px] font-bold px-2 py-1 rounded hover:shadow-sm transition">
                  <span class="${dot} w-1.5 h-1.5 rounded-full"></span>
                  <span>${icon} ${(u.code||'').replace(/</g,'&lt;')} - ${(u.name||u.code||'').replace(/</g,'&lt;')}</span>
                  <span class="text-[9px] opacity-70">${stateLabel}</span>
                </button>`;
              }).join('') : '<div class="text-xs text-slate-400 italic">Sin unidades. Agregá la primera con el botón + Agregar Unidad.</div>'}
            </div>
          </div>

          <!-- LISTA UNIDADES con detalle -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="text-[10px] uppercase font-bold text-slate-700 tracking-wider">⚙️ Unidades (${units.length})</div>
              <button onclick="pmEditUnit(null,'${p.id}')" class="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold">+ Agregar Unidad</button>
            </div>
            <div class="space-y-1.5">
              ${units.map(u => pmRenderUnitRow(u, p)).join('') || '<div class="text-xs text-slate-400 italic px-2 py-3 text-center bg-white rounded">Sin unidades.</div>'}
            </div>
          </div>

          <!-- FOOTER con stats -->
          <div class="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-200">
            <div class="flex items-center gap-3 text-xs flex-wrap">
              <span class="flex items-center gap-1"><span class="bg-emerald-500 w-2 h-2 rounded-full"></span> <strong>${occupiedUnits.length}</strong> ocupadas</span>
              <span class="flex items-center gap-1"><span class="bg-red-400 w-2 h-2 rounded-full"></span> <strong>${freeUnits}</strong> libres</span>
              <span class="flex items-center gap-1"><span class="bg-blue-500 w-2 h-2 rounded-full"></span> <strong>${reservedUnits.length}</strong> reservadas</span>
              <span class="flex items-center gap-1"><span class="bg-amber-500 w-2 h-2 rounded-full"></span> <strong>${maintenanceUnits.length}</strong> mant.</span>
            </div>
            <div class="text-xs">
              <span class="text-slate-500">Potencial:</span> <strong class="text-emerald-700">$${potentialMo.toLocaleString()}/mes</strong>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function pmRenderUnitRow(u, p) {
  const active = pmActiveBookingOf(u.id);
  const reserved = pmaState.bookings.find(b => b.unit_id === u.id && b.status === 'confirmado');
  const isMaint = u.maintenance_status === 'en_mantenimiento';
  const isInactive = u.is_active === false;
  const state = isMaint?'mantenimiento':isInactive?'inactiva':active?'ocupada':reserved?'reservada':'libre';
  const stateLabel = state.charAt(0).toUpperCase()+state.slice(1);
  const stateColor = isMaint?'bg-amber-100 text-amber-800':isInactive?'bg-slate-100 text-slate-600':active?'bg-emerald-100 text-emerald-800':reserved?'bg-blue-100 text-blue-800':'bg-red-50 text-red-700';
  const borderColor = isMaint?'border-l-amber-500':isInactive?'border-l-slate-400':active?'border-l-emerald-500':reserved?'border-l-blue-500':'border-l-red-400';
  const icon = u.unit_type==='casa_completa'?'🏠':u.unit_type==='estudio'?'🎨':u.unit_type==='apartamento'?'🏢':'🛏';
  const typeLabel = u.unit_type==='casa_completa'?'Casa Completa':u.unit_type==='estudio'?'Estudio':u.unit_type==='apartamento'?'Apartamento':'Habitación';
  const isOn = u.is_active !== false;
  return `
    <div class="bg-white border border-slate-200 border-l-4 ${borderColor} rounded p-2.5 hover:shadow-sm transition">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-xl">${icon}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <strong class="text-sm text-slate-900">${(u.code||'').replace(/</g,'&lt;')} - ${(u.name||u.code||'').replace(/</g,'&lt;')}</strong>
            <span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">${typeLabel}</span>
            <span class="text-[10px] ${stateColor} px-1.5 py-0.5 rounded font-bold uppercase">${stateLabel}</span>
          </div>
          <div class="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap mt-0.5">
            ${u.bath_type ? `<span>${u.bath_type === 'compartido'?'Compartido':u.bath_type==='privado'?'Privado':u.bath_type==='privado_compartido'?'Privado+Compartido':u.bath_type} baño</span>` : ''}
            ${active ? `<span>· 👤 ${pmTenantName(active.tenant_id)}</span>` : ''}
            ${active && active.end_date ? `<span>· vence ${active.end_date}</span>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="text-right">
            <div class="text-sm font-bold text-emerald-700">$${Number(u.target_rent||0).toLocaleString()}</div>
            <div class="text-[9px] text-slate-500 uppercase">Mensual</div>
          </div>
          <button onclick="pmToggleUnitActive('${u.id}', ${!isOn})" class="relative inline-flex h-5 w-9 rounded-full transition ${isOn?'bg-emerald-500':'bg-slate-300'}" title="${isOn?'Desactivar':'Activar'}">
            <span class="absolute ${isOn?'right-0.5':'left-0.5'} top-0.5 h-4 w-4 rounded-full bg-white shadow transition"></span>
          </button>
          <button onclick="pmEditBooking(null,'${u.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-2 py-1 rounded" title="Nueva reserva">+ Reserva</button>
          <button onclick="pmEditUnit('${u.id}','${p.id}')" class="text-slate-400 hover:text-slate-700 p-1">✏️</button>
        </div>
      </div>
    </div>
  `;
}

function pmToggleExpandProperty(id) {
  pmaState.expandedProperties = pmaState.expandedProperties || new Set();
  if (pmaState.expandedProperties.has(id)) pmaState.expandedProperties.delete(id);
  else pmaState.expandedProperties.add(id);
  pmRender();
}
window.pmToggleExpandProperty = pmToggleExpandProperty;

async function pmToggleUnitActive(unitId, makeActive) {
  try {
    await sb.from('pm_units').update({ is_active: makeActive }).eq('id', unitId);
    const u = pmaState.units.find(x => x.id === unitId);
    if (u) u.is_active = makeActive;
    pmRender();
  } catch (e) { alert('Error: ' + e.message); }
}
window.pmToggleUnitActive = pmToggleUnitActive;

function pmSelectProperty(id) {
  pmaState.selectedPropertyId = id;
  pmRender();
}
window.pmSelectProperty = pmSelectProperty;

// ════════════════════════════════════════════════════════════════
// TAB 1.b · DETALLE de propiedad (con desglose de unidades + calendario)
// ════════════════════════════════════════════════════════════════
function pmRenderPropertyDetail() {
  const p = pmaState.properties.find(x => x.id === pmaState.selectedPropertyId);
  if (!p) return '<div class="p-4 text-slate-500">Propiedad no encontrada.</div>';
  const units = pmUnitsOf(p.id);
  const occ = pmOccupancyOf(p.id);
  const fin = pmFinanceOf(p.id);
  const grouped = {
    casa_completa: units.filter(u => u.unit_type === 'casa_completa'),
    apartamento:   units.filter(u => u.unit_type === 'apartamento'),
    habitacion:    units.filter(u => u.unit_type === 'habitacion'),
    estudio:       units.filter(u => u.unit_type === 'estudio')
  };
  const labels = { casa_completa: '🏡 Casa completa', apartamento: '🏢 Apartamentos', habitacion: '🛏 Habitaciones', estudio: '🎨 Estudios' };

  return `
    <div class="space-y-3 p-1">
      <button onclick="pmaState.selectedPropertyId=null;pmRender()" class="text-xs text-slate-500 hover:text-slate-900">← Volver a propiedades</button>

      <!-- Header propiedad -->
      <div class="bg-gradient-to-br from-slate-900 to-blue-900 text-white rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div class="text-[10px] uppercase font-bold text-blue-200 tracking-wider">${p.rental_model||'mixto'}</div>
          <div class="text-lg font-bold mt-1">${(p.name||'').replace(/</g,'&lt;')}</div>
          <div class="text-[11px] text-blue-200">${(p.address||'').replace(/</g,'&lt;')}</div>
        </div>
        <div class="flex gap-2">
          <button onclick="pmEditProperty('${p.id}')" class="bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded">✏️ Editar</button>
          <button onclick="pmEditUnit(null,'${p.id}')" class="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded">+ Unidad</button>
        </div>
      </div>

      <!-- KPIs propiedad -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div class="bg-white border border-slate-200 rounded p-3"><div class="text-[9px] uppercase text-slate-500 font-bold">Unidades</div><div class="text-xl font-bold text-slate-900 mt-1">${units.length}</div></div>
        <div class="bg-white border border-slate-200 rounded p-3"><div class="text-[9px] uppercase text-slate-500 font-bold">Ocupación</div><div class="text-xl font-bold text-emerald-700 mt-1">${occ.pct}%</div><div class="text-[10px] text-slate-500">${occ.occupied}/${occ.total}</div></div>
        <div class="bg-white border border-slate-200 rounded p-3"><div class="text-[9px] uppercase text-slate-500 font-bold">Ingresos</div><div class="text-xl font-bold text-emerald-700 mt-1">$${Math.round(fin.ingresos).toLocaleString()}</div></div>
        <div class="bg-white border border-slate-200 rounded p-3"><div class="text-[9px] uppercase text-slate-500 font-bold">Utilidad</div><div class="text-xl font-bold ${fin.utilidad>=0?'text-emerald-700':'text-red-700'} mt-1">$${Math.round(fin.utilidad).toLocaleString()}</div></div>
      </div>

      <!-- Calendario tipo Airbnb (timeline anual) -->
      <div class="bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
        <div class="px-4 py-3 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="text-[10px] uppercase font-bold text-slate-300 tracking-wider">📅 Calendario de ocupación</div>
            <div class="text-sm font-bold mt-0.5">${pmaState.calendarYear}</div>
          </div>
          <div class="flex gap-1">
            <button onclick="pmaState.calendarYear--;pmRender()" class="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-xs">←</button>
            <button onclick="pmaState.calendarYear=new Date().getFullYear();pmRender()" class="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs">Hoy</button>
            <button onclick="pmaState.calendarYear++;pmRender()" class="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-xs">→</button>
          </div>
        </div>
        ${pmRenderTimelineForUnits(units, pmaState.calendarYear)}
      </div>

      <!-- Desglose de unidades agrupadas -->
      ${Object.entries(grouped).filter(([, us]) => us.length).map(([kind, us]) => `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-4 py-2 text-xs font-bold uppercase text-slate-700 flex items-center justify-between">
            <span>${labels[kind]} · ${us.length}</span>
          </div>
          <div class="divide-y divide-slate-100">
            ${us.map(u => {
              const active = pmActiveBookingOf(u.id);
              return `
                <div class="px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold font-mono">${u.code}</span>
                      <span class="font-bold text-sm text-slate-900">${(u.name||u.code).replace(/</g,'&lt;')}</span>
                      ${active ? '<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">ocupada</span>' : '<span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">libre</span>'}
                    </div>
                    <div class="text-[11px] text-slate-500 mt-0.5">
                      ${u.target_rent ? `Renta objetivo: $${Number(u.target_rent).toLocaleString()}/mes` : 'Sin renta objetivo'}
                      ${active ? ` · 👤 ${pmTenantName(active.tenant_id)} · ${active.start_date} → ${active.end_date||'∞'}` : ''}
                    </div>
                  </div>
                  <div class="flex gap-1">
                    <button onclick="pmEditBooking(null,'${u.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded">+ Reserva</button>
                    <button onclick="pmEditUnit('${u.id}','${p.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded">✏️</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}

      ${!units.length ? `
        <div class="bg-amber-50 border border-amber-200 rounded p-4 text-center">
          <div class="text-sm text-amber-900 mb-2">Esta propiedad no tiene unidades aún.</div>
          <div class="text-xs text-amber-700 mb-3">Agregá las habitaciones / estudios / o marcala como casa completa.</div>
          <button onclick="pmEditUnit(null,'${p.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 rounded">+ Agregar unidad</button>
        </div>
      ` : ''}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// TIMELINE de ocupación tipo Airbnb (anual)
// Filas = unidades. Columnas = días del año o meses.
// ════════════════════════════════════════════════════════════════
// Calcula huecos + ocupación + $ perdido para una unidad en un año
function pmCalcUnitGaps(unit, year) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const totalDays = Math.floor((yearEnd - yearStart) / 86400000) + 1;
  const dailyRate = (Number(unit.target_rent) || 0) / 30;
  // Construir set de días ocupados
  const occupied = new Array(totalDays).fill(false);
  const bks = pmBookingsOf(unit.id).filter(b =>
    b.start_date && ['activo','confirmado','finalizado','vencido'].includes(b.status)
  );
  bks.forEach(b => {
    const s = new Date(b.start_date);
    const e = b.end_date ? new Date(b.end_date) : yearEnd;
    const dStart = Math.max(0, Math.floor((s - yearStart) / 86400000));
    const dEnd   = Math.min(totalDays - 1, Math.floor((e - yearStart) / 86400000));
    for (let i = dStart; i <= dEnd; i++) occupied[i] = true;
  });
  // Detectar bloques contiguos de huecos
  const gaps = [];
  let curStart = null;
  for (let i = 0; i < totalDays; i++) {
    if (!occupied[i]) {
      if (curStart === null) curStart = i;
    } else if (curStart !== null) {
      gaps.push({ startIdx: curStart, endIdx: i - 1 });
      curStart = null;
    }
  }
  if (curStart !== null) gaps.push({ startIdx: curStart, endIdx: totalDays - 1 });
  const totalEmpty = gaps.reduce((s, g) => s + (g.endIdx - g.startIdx + 1), 0);
  const occupiedCount = totalDays - totalEmpty;
  const occPct = Math.round(100 * occupiedCount / totalDays);
  const lostRevenue = Math.round(totalEmpty * dailyRate);
  // Convertir gaps a {start, end, days} con fechas reales
  const gapsDated = gaps.map(g => {
    const ss = new Date(yearStart.getTime() + g.startIdx * 86400000);
    const ee = new Date(yearStart.getTime() + g.endIdx * 86400000);
    return { start: ss, end: ee, days: g.endIdx - g.startIdx + 1, lost: Math.round((g.endIdx - g.startIdx + 1) * dailyRate) };
  });
  return { occPct, totalDays, occupiedCount, totalEmpty, lostRevenue, gaps: gapsDated, bookings: bks };
}

function pmRenderTimelineForUnits(units, year) {
  if (!units.length) return '<div class="p-4 text-center text-slate-400 text-xs italic">Sin unidades para mostrar.</div>';
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const totalDays = Math.floor((yearEnd - yearStart) / 86400000) + 1;
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  const todayPct = (year === new Date().getFullYear())
    ? Math.max(0, Math.min(100, 100 * Math.floor((new Date() - yearStart) / 86400000) / totalDays))
    : null;

  // Calcular gaps por unidad
  const rows = units.map(u => {
    const calc = pmCalcUnitGaps(u, year);
    return { unit: u, ...calc };
  });

  const fmtDate = (d) => `${d.getDate()} ${months[d.getMonth()]}`;

  return `
    <div class="overflow-x-auto">
      <div style="min-width:1000px;">
        <!-- Header con columnas: UNIDAD | % | meses -->
        <div class="flex items-center border-b border-slate-200 bg-slate-100" style="font-size:10px;font-weight:bold;color:#475569;text-transform:uppercase;">
          <div style="width:220px;padding:6px 8px;">Unidad</div>
          <div style="width:50px;text-align:center;padding:6px 0;">%</div>
          <div class="flex flex-1">
            ${months.map(m => `<div style="flex:1;border-right:1px solid #e2e8f0;text-align:center;padding:6px 0;">${m}</div>`).join('')}
          </div>
        </div>
        ${rows.map(({unit, occPct, totalEmpty, lostRevenue, gaps, bookings}) => {
          const colorPct = occPct >= 80 ? 'text-emerald-600' : occPct >= 50 ? 'text-amber-600' : 'text-red-600';
          return `
            <div class="flex items-center border-b border-slate-100 hover:bg-slate-50" style="min-height:38px;">
              <div class="flex items-center gap-2" style="width:220px;padding:6px 8px;">
                <span class="text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold font-mono">${(unit.code||'').replace(/</g,'&lt;')}</span>
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-slate-700 truncate">${(unit.name||unit.code||'').replace(/</g,'&lt;')}</div>
                  <div class="text-[9px] text-slate-500">${bookings.length} reserva${bookings.length===1?'':'s'}${unit.target_rent?` · $${Number(unit.target_rent).toLocaleString()}/mes`:''}</div>
                </div>
              </div>
              <div style="width:50px;text-align:center;" class="${colorPct} font-bold text-sm">${occPct}%</div>
              <div class="relative flex-1" style="height:34px;background:#fafafa;border-left:1px solid #e2e8f0;">
                <!-- Background: bloques de huecos en rojo claro -->
                ${gaps.map(g => {
                  const left = 100 * Math.floor((g.start - yearStart) / 86400000) / totalDays;
                  const width = Math.max(0.2, 100 * g.days / totalDays);
                  const label = g.days >= 25 ? `${g.days}d vacío${g.lost?` · -$${(g.lost/1000).toFixed(1)}K`:''}` : '';
                  return `<div title="${g.days} días vacíos · ~$${g.lost.toLocaleString()} perdidos" style="position:absolute;left:${left}%;width:${width}%;top:3px;bottom:3px;background:rgba(254,202,202,0.4);border:1px dashed #fca5a5;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#b91c1c;font-weight:bold;overflow:hidden;white-space:nowrap;">${label}</div>`;
                }).join('')}
                <!-- Bookings encima -->
                ${bookings.filter(b => {
                  const start = new Date(b.start_date);
                  const end = b.end_date ? new Date(b.end_date) : yearEnd;
                  return start <= yearEnd && end >= yearStart;
                }).map(b => {
                  const start = new Date(Math.max(yearStart, new Date(b.start_date)));
                  const end = new Date(Math.min(yearEnd, b.end_date ? new Date(b.end_date) : yearEnd));
                  const left = 100 * Math.floor((start - yearStart) / 86400000) / totalDays;
                  const width = Math.max(0.5, 100 * Math.floor((end - start) / 86400000) / totalDays);
                  const colorByType = {
                    contrato_directo: 'background:linear-gradient(135deg,#10b981,#059669);',
                    airbnb:            'background:linear-gradient(135deg,#f43f5e,#e11d48);',
                    booking:           'background:linear-gradient(135deg,#3b82f6,#2563eb);',
                    vrbo:              'background:linear-gradient(135deg,#8b5cf6,#7c3aed);',
                    hospitable:        'background:linear-gradient(135deg,#0ea5e9,#0284c7);',
                    padsplit:          'background:linear-gradient(135deg,#a855f7,#9333ea);',
                    reserva_corta:     'background:linear-gradient(135deg,#f59e0b,#d97706);',
                    otro:              'background:linear-gradient(135deg,#64748b,#475569);'
                  };
                  const bg = colorByType[b.booking_type] || colorByType.otro;
                  const opacity = b.status === 'finalizado' || b.status === 'vencido' ? 0.55 : 1;
                  const tenant = pmTenantName(b.tenant_id);
                  const tooltip = `${tenant}\n${b.start_date} → ${b.end_date||'∞'}\n$${Number(b.rent_amount||0).toLocaleString()}/${b.rent_period}\n[${b.booking_type}]`;
                  return `<div onclick="event.stopPropagation();pmShowBookingDetail('${b.id}')" title="${tooltip.replace(/"/g,'&quot;')}" style="position:absolute;left:${left}%;width:${width}%;top:5px;bottom:5px;${bg};opacity:${opacity};border-radius:4px;padding:0 5px;display:flex;align-items:center;overflow:hidden;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.2);z-index:1;">
                    <span style="color:white;font-size:10px;font-weight:bold;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;">${tenant.split(' ')[0]||'·'}</span>
                  </div>`;
                }).join('')}
                ${todayPct !== null ? `<div style="position:absolute;left:${todayPct}%;top:0;bottom:0;width:2px;background:#ef4444;z-index:2;" title="Hoy"></div>` : ''}
              </div>
            </div>
            ${(totalEmpty > 0 && unit.target_rent) ? `
              <div class="border-b border-slate-100 px-3 py-1 bg-red-50/30" style="padding-left:270px;">
                <div class="text-[10px] text-red-700">⚠️ <strong>${totalEmpty} días vacíos</strong> — <strong>~$${lostRevenue.toLocaleString()} perdidos</strong></div>
              </div>
            ` : ''}
          `;
        }).join('')}
        <!-- Leyenda -->
        <div class="flex gap-3 px-3 py-2 text-[10px] text-slate-600 flex-wrap border-t border-slate-200 bg-slate-50">
          <span class="font-bold uppercase text-slate-500">Referencias:</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#10b981,#059669);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>👤 Contrato directo</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#f43f5e,#e11d48);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>🌐 Airbnb</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Booking</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#a855f7,#9333ea);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Padsplit</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:rgba(254,202,202,0.6);border:1px dashed #fca5a5;border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Hueco (sin ocupar)</span>
          <span><span style="display:inline-block;width:2px;height:10px;background:#ef4444;margin-right:3px;vertical-align:middle;"></span>Hoy</span>
        </div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// TAB 2 · CALENDARIO GENERAL (todas las propiedades)
// ════════════════════════════════════════════════════════════════
// Dedupe units: si hay 2+ con mismo property_id+code, dejar la más reciente
function pmDedupeUnits(units) {
  const map = new Map();
  units.forEach(u => {
    const key = `${u.property_id}|${(u.code||'').toUpperCase()}|${u.unit_type||''}`;
    const existing = map.get(key);
    if (!existing) { map.set(key, u); return; }
    // Conservar la que tenga más datos (target_rent + created_at más reciente)
    const score = (x) => (x.target_rent?2:0) + (x.bath_type?1:0) + new Date(x.created_at||0).getTime()/1e15;
    if (score(u) > score(existing)) map.set(key, u);
  });
  return Array.from(map.values());
}

function pmRenderCalendar() {
  const filter = pmaState.calendarFilterPropertyId;
  let rawUnits = filter
    ? pmUnitsOf(filter)
    : pmaState.units.filter(u => pmaState.properties.some(p => p.id === u.property_id));
  const allUnits = pmDedupeUnits(rawUnits);
  const dupesHidden = rawUnits.length - allUnits.length;
  const byProperty = {};
  allUnits.forEach(u => {
    if (!byProperty[u.property_id]) byProperty[u.property_id] = [];
    byProperty[u.property_id].push(u);
  });

  // Totales del año
  let totalEmptyAll = 0, lostRevenueAll = 0, fullOccUnits = 0;
  let totalDaysSum = 0, occupiedDaysSum = 0;
  allUnits.forEach(u => {
    const c = pmCalcUnitGaps(u, pmaState.calendarYear);
    totalEmptyAll += c.totalEmpty;
    lostRevenueAll += c.lostRevenue;
    totalDaysSum += c.totalDays;
    occupiedDaysSum += c.occupiedCount;
    if (c.occPct === 100) fullOccUnits++;
  });
  const coverage = totalDaysSum ? Math.round(100 * occupiedDaysSum / totalDaysSum) : 0;

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const view = pmaState.calendarView || 'month';
  const periodLabel = view === 'month'
    ? `${monthNames[pmaState.calendarMonth]} ${pmaState.calendarYear}`
    : `${pmaState.calendarYear}`;

  return `
    <div class="space-y-3 p-1">
      <!-- Header con título + toggle vista + navegación -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">📅</span>
            <strong class="text-base text-slate-900">Calendario de Ocupación</strong>
            <span class="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">${periodLabel}</span>
          </div>
          <div class="text-[11px] text-slate-500 mt-0.5">${view==='month'?'Vista mensual — Click reserva para ver detalles':'Vista anual — Detecta huecos y planifica rotaciones'}</div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Toggle vista -->
          <div class="inline-flex bg-slate-100 rounded-lg p-0.5">
            <button onclick="pmaState.calendarView='month';pmRender()" class="px-3 py-1 text-xs font-bold rounded ${view==='month'?'bg-white text-slate-900 shadow':'text-slate-500'}">📆 Mes</button>
            <button onclick="pmaState.calendarView='year';pmRender()" class="px-3 py-1 text-xs font-bold rounded ${view==='year'?'bg-white text-slate-900 shadow':'text-slate-500'}">📊 Año</button>
          </div>
          <select onchange="pmaState.calendarFilterPropertyId=this.value||null;pmRender()" class="text-xs border border-slate-300 rounded px-2 py-1 max-w-[180px]">
            <option value="">Todas las propiedades</option>
            ${pmaState.properties.map(p => `<option value="${p.id}" ${filter===p.id?'selected':''}>${(p.name||'').replace(/</g,'&lt;')}</option>`).join('')}
          </select>
          <!-- Navegación temporal -->
          <div class="inline-flex bg-white border border-slate-300 rounded-lg overflow-hidden">
            <button onclick="pmCalNavPrev()" class="px-2 py-1 hover:bg-slate-100 text-sm">←</button>
            <button onclick="pmCalNavToday()" class="px-3 py-1 hover:bg-slate-100 text-xs font-bold border-l border-r border-slate-300">Hoy</button>
            <button onclick="pmCalNavNext()" class="px-2 py-1 hover:bg-slate-100 text-sm">→</button>
          </div>
          <button onclick="pmEditBooking(null)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">+ Reserva</button>
        </div>
      </div>

      ${dupesHidden ? `<div class="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900">⚠️ Se detectaron <strong>${dupesHidden} unidades duplicadas</strong> con el mismo código en la misma propiedad. Se muestran fusionadas. Para limpiarlas definitivamente, andá al tab Propiedades → click en la propiedad → eliminá los duplicados.</div>` : ''}

      <!-- KPIs hero del año -->
      ${allUnits.length ? `
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div class="bg-white border border-slate-200 rounded-lg p-3">
            <div class="text-[9px] uppercase font-bold text-slate-500">Cobertura</div>
            <div class="text-2xl font-bold ${coverage>=80?'text-emerald-700':coverage>=50?'text-amber-700':'text-red-700'} mt-0.5">${coverage}%</div>
            <div class="text-[10px] text-slate-500">${fullOccUnits}/${allUnits.length} al 100%</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-lg p-3">
            <div class="text-[9px] uppercase font-bold text-slate-500">Unidades</div>
            <div class="text-2xl font-bold text-slate-900 mt-0.5">${allUnits.length}</div>
            <div class="text-[10px] text-slate-500">${allUnits.filter(u => pmCalcUnitGaps(u, pmaState.calendarYear).totalEmpty > 0).length} con huecos</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-lg p-3">
            <div class="text-[9px] uppercase font-bold text-slate-500">Días vacíos</div>
            <div class="text-2xl font-bold text-red-600 mt-0.5">${totalEmptyAll.toLocaleString()}</div>
            <div class="text-[10px] text-slate-500">total año</div>
          </div>
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="text-[9px] uppercase font-bold text-red-700">Ingreso perdido</div>
            <div class="text-2xl font-bold text-red-700 mt-0.5">$${(lostRevenueAll/1000).toFixed(0)}K</div>
            <div class="text-[10px] text-red-600">estimado · ~$${lostRevenueAll.toLocaleString()}</div>
          </div>
          <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div class="text-[9px] uppercase font-bold text-emerald-700">Al 100%</div>
            <div class="text-2xl font-bold text-emerald-700 mt-0.5">${fullOccUnits}</div>
            <div class="text-[10px] text-emerald-600">de ${allUnits.length}</div>
          </div>
        </div>
      ` : ''}

      ${!allUnits.length ? `
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center">
          <div class="text-4xl mb-2">📅</div>
          <div class="text-sm text-slate-600">Sin unidades para mostrar. Cargá propiedades y unidades primero.</div>
        </div>
      ` : ''}

      <!-- Timeline por cada propiedad -->
      ${Object.entries(byProperty).map(([propId, units]) => {
        const p = pmaState.properties.find(x => x.id === propId);
        if (!p) return '';
        let propLost = 0, propEmpty = 0, propOccSum = 0, propTotalSum = 0;
        units.forEach(u => {
          const c = pmCalcUnitGaps(u, pmaState.calendarYear);
          propLost += c.lostRevenue;
          propEmpty += c.totalEmpty;
          propOccSum += c.occupiedCount;
          propTotalSum += c.totalDays;
        });
        const propOccPct = propTotalSum ? Math.round(100 * propOccSum / propTotalSum) : 0;
        const colorPct = propOccPct >= 80 ? 'text-emerald-600' : propOccPct >= 50 ? 'text-amber-600' : 'text-red-600';
        return `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="px-4 py-3 bg-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm">🏠</span>
                  <strong class="text-sm text-slate-900 truncate">${(p.name||'').replace(/</g,'&lt;')}</strong>
                  <span class="text-[10px] bg-slate-700 text-white px-1.5 py-0.5 rounded font-bold">${units.length}u</span>
                  <span class="text-sm font-bold ${colorPct}">${propOccPct}%</span>
                </div>
                ${propEmpty > 0 ? `<div class="text-[11px] text-red-700 mt-0.5">⚠️ ${propEmpty} días vacíos — ~$${propLost.toLocaleString()} perdidos</div>` : `<div class="text-[11px] text-emerald-700 mt-0.5">✓ Sin huecos detectados</div>`}
              </div>
              <button onclick="pmaState.tab='properties';pmaState.expandedProperties=pmaState.expandedProperties||new Set();pmaState.expandedProperties.add('${p.id}');pmRender()" class="text-[11px] bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-3 py-1 rounded">Ver propiedad →</button>
            </div>
            ${view === 'month'
              ? pmRenderMonthTimelineForUnits(units, pmaState.calendarYear, pmaState.calendarMonth)
              : pmRenderTimelineForUnits(units, pmaState.calendarYear)
            }
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// 🆕 NAVEGACIÓN DE CALENDARIO (← → según vista)
// ════════════════════════════════════════════════════════════════
function pmCalNavPrev() {
  if (pmaState.calendarView === 'month') {
    pmaState.calendarMonth--;
    if (pmaState.calendarMonth < 0) { pmaState.calendarMonth = 11; pmaState.calendarYear--; }
  } else {
    pmaState.calendarYear--;
  }
  pmRender();
}
function pmCalNavNext() {
  if (pmaState.calendarView === 'month') {
    pmaState.calendarMonth++;
    if (pmaState.calendarMonth > 11) { pmaState.calendarMonth = 0; pmaState.calendarYear++; }
  } else {
    pmaState.calendarYear++;
  }
  pmRender();
}
function pmCalNavToday() {
  pmaState.calendarYear = new Date().getFullYear();
  pmaState.calendarMonth = new Date().getMonth();
  pmRender();
}
window.pmCalNavPrev = pmCalNavPrev;
window.pmCalNavNext = pmCalNavNext;
window.pmCalNavToday = pmCalNavToday;

// ════════════════════════════════════════════════════════════════
// 🆕 VISTA MENSUAL ESTILO AIRBNB
// Por cada unidad, un grid con días del mes y las reservas como barras.
// ════════════════════════════════════════════════════════════════
function pmRenderMonthTimelineForUnits(units, year, month) {
  if (!units.length) return '<div class="p-4 text-center text-slate-400 text-xs italic">Sin unidades.</div>';
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0); // último día del mes
  const totalDays = monthEnd.getDate();
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const today = new Date();
  const todayDay = (today.getFullYear() === year && today.getMonth() === month) ? today.getDate() : null;
  const colWidth = 32; // px por día — agradable para 28-31 días

  return `
    <div class="overflow-x-auto" style="background:white;">
      <div style="min-width:${280 + totalDays * colWidth}px;">
        <!-- Header con días -->
        <div class="flex items-center border-b border-slate-200 bg-slate-50 sticky top-0 z-10" style="font-size:10px;font-weight:bold;color:#475569;">
          <div style="width:240px;padding:8px 10px;">Unidad</div>
          <div style="width:40px;text-align:center;padding:8px 0;">%</div>
          <div class="flex">
            ${days.map(d => {
              const dt = new Date(year, month, d);
              const dow = ['D','L','M','M','J','V','S'][dt.getDay()];
              const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
              const isToday = d === todayDay;
              return `<div style="width:${colWidth}px;text-align:center;padding:6px 0;${isWeekend?'background:#f8fafc;':''}${isToday?'background:#fee2e2;color:#991b1b;font-weight:bold;':''};border-right:1px solid #f1f5f9;">
                <div style="font-size:9px;color:#94a3b8;">${dow}</div>
                <div style="font-size:11px;${isToday?'color:#991b1b;':'color:#334155;'}">${d}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        ${units.map(unit => {
          const allBks = pmBookingsOf(unit.id).filter(b => {
            if (!['activo','confirmado','finalizado','vencido'].includes(b.status)) return false;
            if (!b.start_date) return false;
            const s = new Date(b.start_date);
            const e = b.end_date ? new Date(b.end_date) : monthEnd;
            return s <= monthEnd && e >= monthStart;
          });
          // Calcular ocupación del mes
          const occupiedDays = new Set();
          allBks.forEach(b => {
            const s = new Date(Math.max(monthStart, new Date(b.start_date)));
            const e = new Date(Math.min(monthEnd, b.end_date ? new Date(b.end_date) : monthEnd));
            for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
              if (d.getMonth() === month) occupiedDays.add(d.getDate());
            }
          });
          const occPct = Math.round(100 * occupiedDays.size / totalDays);
          const colorPct = occPct >= 80 ? 'text-emerald-600' : occPct >= 50 ? 'text-amber-600' : 'text-red-600';
          return `
            <div class="flex items-center border-b border-slate-100 hover:bg-slate-50" style="min-height:48px;">
              <div class="flex items-center gap-2" style="width:240px;padding:6px 10px;">
                <span class="text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold font-mono">${(unit.code||'').replace(/</g,'&lt;')}</span>
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-slate-700 truncate">${(unit.name||unit.code||'').replace(/</g,'&lt;')}</div>
                  <div class="text-[9px] text-slate-500">${allBks.length} reserva${allBks.length===1?'':'s'} este mes${unit.target_rent?` · $${Number(unit.target_rent).toLocaleString()}/mes`:''}</div>
                </div>
              </div>
              <div style="width:40px;text-align:center;" class="${colorPct} font-bold text-xs">${occPct}%</div>
              <div class="relative flex" style="background:#fafafa;height:44px;">
                ${days.map(d => {
                  const dt = new Date(year, month, d);
                  const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                  const isToday = d === todayDay;
                  return `<div onclick="pmCreateBookingFromDay('${unit.id}', ${year}, ${month}, ${d})" style="width:${colWidth}px;border-right:1px solid #f1f5f9;${isWeekend?'background:#f8fafc;':''}${isToday?'border-left:2px solid #ef4444;border-right:2px solid #ef4444;':''}cursor:pointer;" title="${dt.toLocaleDateString('es')} — click para nueva reserva"></div>`;
                }).join('')}
                <!-- Bookings encima -->
                ${allBks.map(b => {
                  const s = new Date(Math.max(monthStart, new Date(b.start_date)));
                  const e = new Date(Math.min(monthEnd, b.end_date ? new Date(b.end_date) : monthEnd));
                  const startCol = s.getDate() - 1;
                  const endCol = e.getDate();
                  const leftPx = startCol * colWidth + 2;
                  const widthPx = (endCol - startCol) * colWidth - 4;
                  const colorByType = {
                    contrato_directo: 'background:linear-gradient(135deg,#10b981,#059669);',
                    airbnb:            'background:linear-gradient(135deg,#f43f5e,#e11d48);',
                    booking:           'background:linear-gradient(135deg,#3b82f6,#2563eb);',
                    vrbo:              'background:linear-gradient(135deg,#8b5cf6,#7c3aed);',
                    hospitable:        'background:linear-gradient(135deg,#0ea5e9,#0284c7);',
                    padsplit:          'background:linear-gradient(135deg,#a855f7,#9333ea);',
                    reserva_corta:     'background:linear-gradient(135deg,#f59e0b,#d97706);',
                    otro:              'background:linear-gradient(135deg,#64748b,#475569);'
                  };
                  const bg = colorByType[b.booking_type] || colorByType.otro;
                  const opacity = b.status === 'finalizado' || b.status === 'vencido' ? 0.55 : 1;
                  const tenant = pmTenantName(b.tenant_id);
                  return `<div onclick="event.stopPropagation();pmShowBookingDetail('${b.id}')" title="Click para ver detalles · ${tenant} · ${b.start_date}→${b.end_date||'∞'}" style="position:absolute;left:${leftPx}px;width:${widthPx}px;top:6px;bottom:6px;${bg};opacity:${opacity};border-radius:6px;padding:0 8px;display:flex;align-items:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.25);z-index:1;overflow:hidden;">
                    <span style="color:white;font-size:11px;font-weight:bold;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;">${tenant} · $${Number(b.rent_amount||0).toLocaleString()}</span>
                  </div>`;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
        <!-- Leyenda -->
        <div class="flex gap-3 px-3 py-2 text-[10px] text-slate-600 flex-wrap border-t border-slate-200 bg-slate-50 sticky bottom-0">
          <span class="font-bold uppercase text-slate-500">Click reserva → detalles · Click día vacío → nueva reserva</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#10b981,#059669);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Directo</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#f43f5e,#e11d48);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Airbnb</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Booking</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#a855f7,#9333ea);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Padsplit</span>
          <span><span style="display:inline-block;width:2px;height:10px;background:#ef4444;margin-right:3px;vertical-align:middle;"></span>Hoy</span>
        </div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// 🆕 MODAL DE DETALLES DE RESERVA (click sobre la barra)
// ════════════════════════════════════════════════════════════════
function pmShowBookingDetail(bookingId) {
  const b = pmaState.bookings.find(x => x.id === bookingId);
  if (!b) return alert('Reserva no encontrada.');
  const tenant = pmaState.tenants.find(t => t.id === b.tenant_id);
  const unit = pmaState.units.find(u => u.id === b.unit_id);
  const property = pmaState.properties.find(p => p.id === b.property_id);
  // Duración
  const dur = (b.start_date && b.end_date)
    ? Math.floor((new Date(b.end_date) - new Date(b.start_date)) / 86400000) + 1
    : null;
  const platformLabel = {
    contrato_directo: '📄 Contrato directo',
    airbnb: '🌐 Airbnb', vrbo: '🌐 VRBO', booking: '🌐 Booking',
    hospitable: '🌐 Hospitable', padsplit: '🌐 Padsplit',
    reserva_corta: '⏱ Reserva corta', otro: '• Otro'
  }[b.booking_type] || b.booking_type;
  const statusColor = {
    activo: 'bg-emerald-100 text-emerald-800',
    confirmado: 'bg-blue-100 text-blue-800',
    borrador: 'bg-slate-100 text-slate-700',
    vencido: 'bg-amber-100 text-amber-800',
    cancelado: 'bg-red-100 text-red-800',
    finalizado: 'bg-slate-200 text-slate-700'
  }[b.status] || 'bg-slate-100 text-slate-700';

  openModal('📋 Detalle de Reserva', `
    <div class="space-y-3">
      <!-- Header con plataforma y estado -->
      <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg p-4 -m-2 mb-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="text-[10px] uppercase font-bold text-slate-300 tracking-wider">${platformLabel}</div>
            <div class="text-xl font-bold mt-1">${(tenant?.full_name || 'Sin inquilino asignado').replace(/</g,'&lt;')}</div>
            ${tenant?.phone ? `<div class="text-xs text-slate-300 mt-1">📞 ${tenant.phone}</div>` : ''}
            ${tenant?.email ? `<div class="text-xs text-slate-300">📧 ${tenant.email}</div>` : ''}
          </div>
          <span class="text-[10px] ${statusColor} px-2 py-1 rounded font-bold uppercase">${b.status||'—'}</span>
        </div>
      </div>

      <!-- Propiedad y unidad -->
      <div class="bg-slate-50 border border-slate-200 rounded p-3">
        <div class="text-[10px] uppercase font-bold text-slate-500">📍 Propiedad / Unidad</div>
        <div class="font-bold text-sm text-slate-900 mt-1">${(property?.name||'—').replace(/</g,'&lt;')}</div>
        <div class="text-xs text-slate-600 mt-0.5">
          <span class="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold">${(unit?.code||'').replace(/</g,'&lt;')}</span>
          ${(unit?.name||'').replace(/</g,'&lt;')}
          ${unit?.unit_type ? `<span class="text-slate-400">· ${unit.unit_type}</span>` : ''}
        </div>
      </div>

      <!-- KPIs principales -->
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-white border border-slate-200 rounded p-2 text-center">
          <div class="text-[9px] uppercase font-bold text-slate-500">Inicio</div>
          <div class="text-sm font-bold text-slate-900 mt-1">${b.start_date || '—'}</div>
        </div>
        <div class="bg-white border border-slate-200 rounded p-2 text-center">
          <div class="text-[9px] uppercase font-bold text-slate-500">Fin</div>
          <div class="text-sm font-bold text-slate-900 mt-1">${b.end_date || '∞'}</div>
        </div>
        <div class="bg-white border border-slate-200 rounded p-2 text-center">
          <div class="text-[9px] uppercase font-bold text-slate-500">Duración</div>
          <div class="text-sm font-bold text-slate-900 mt-1">${dur != null ? dur + ' días' : '—'}</div>
        </div>
      </div>

      <!-- Económicas -->
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-emerald-50 border border-emerald-200 rounded p-2 text-center">
          <div class="text-[9px] uppercase font-bold text-emerald-700">Renta</div>
          <div class="text-lg font-bold text-emerald-700 mt-1">$${Number(b.rent_amount||0).toLocaleString()}</div>
          <div class="text-[10px] text-emerald-600">/${b.rent_period||'mes'}</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded p-2 text-center">
          <div class="text-[9px] uppercase font-bold text-blue-700">Depósito</div>
          <div class="text-lg font-bold text-blue-700 mt-1">$${Number(b.deposit||0).toLocaleString()}</div>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded p-2 text-center">
          <div class="text-[9px] uppercase font-bold text-amber-700">Día pago</div>
          <div class="text-xs font-bold text-amber-700 mt-1.5">${b.payment_day || '—'}</div>
        </div>
      </div>

      ${b.contract_status ? `
        <div class="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
          <span class="font-bold text-amber-800">Estado contrato:</span> ${b.contract_status.replace(/</g,'&lt;')}
        </div>
      ` : ''}
      ${b.notes ? `
        <div class="bg-slate-50 border border-slate-200 rounded p-2 text-xs">
          <div class="font-bold text-slate-700 mb-1">📝 Notas</div>
          <div class="text-slate-600 whitespace-pre-wrap">${(b.notes||'').replace(/</g,'&lt;')}</div>
        </div>
      ` : ''}

      <!-- Acciones -->
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cerrar</button>
        ${tenant?.phone ? `<a href="https://wa.me/${(tenant.phone||'').replace(/\\D/g,'')}" target="_blank" class="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded text-center">💬 WhatsApp</a>` : ''}
        ${b.contract_url ? `<a href="${b.contract_url}" target="_blank" class="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded text-center">📄 Contrato</a>` : ''}
        <button onclick="closeModal();pmEditBooking('${b.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">✏️ Editar reserva</button>
      </div>
    </div>
  `);
}
window.pmShowBookingDetail = pmShowBookingDetail;

// Click sobre un día vacío del calendario → abrir form de nueva reserva pre-llenado
function pmCreateBookingFromDay(unitId, year, month, day) {
  const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  // Llamar a pmEditBooking(null, unitId) y luego prepopular start_date
  pmEditBooking(null, unitId);
  setTimeout(() => {
    const startInput = document.getElementById('pm-bf-start');
    if (startInput) startInput.value = dateStr;
  }, 100);
}
window.pmCreateBookingFromDay = pmCreateBookingFromDay;

// ════════════════════════════════════════════════════════════════
// TAB 3 · RESERVAS (lista)
// ════════════════════════════════════════════════════════════════
function pmRenderBookings() {
  const today = new Date().toISOString().slice(0,10);
  const all = pmaState.bookings;
  const activeOrFuture = all.filter(b => (b.end_date || '9999') >= today && b.status !== 'cancelado');
  const pastOrFinished = all.filter(b => (b.end_date || '') < today || b.status === 'finalizado' || b.status === 'cancelado');

  const renderRow = (b) => {
    const u = pmaState.units.find(x => x.id === b.unit_id);
    const p = pmaState.properties.find(x => x.id === b.property_id);
    const colorByType = { contrato_directo: 'emerald', airbnb: 'rose', booking: 'blue', vrbo: 'violet', hospitable: 'sky', reserva_corta: 'amber', otro: 'slate' };
    const col = colorByType[b.booking_type] || 'slate';
    return `
      <div onclick="pmEditBooking('${b.id}')" class="border border-slate-200 rounded p-3 hover:border-emerald-400 cursor-pointer transition">
        <div class="flex items-start justify-between gap-2 flex-wrap">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[10px] uppercase bg-${col}-100 text-${col}-800 px-1.5 py-0.5 rounded font-bold">${b.booking_type}</span>
              <span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">${b.status}</span>
              <strong class="text-sm text-slate-900">${pmTenantName(b.tenant_id)}</strong>
            </div>
            <div class="text-[11px] text-slate-600 mt-1">
              📅 ${b.start_date} → ${b.end_date||'∞'} · 🏠 ${(p?.name||'').replace(/</g,'&lt;')} · 🛏 ${(u?.name||u?.code||'').replace(/</g,'&lt;')}
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm font-bold text-emerald-700">$${Number(b.rent_amount||0).toLocaleString()}</div>
            <div class="text-[10px] text-slate-500">/${b.rent_period}</div>
          </div>
        </div>
      </div>
    `;
  };

  return `
    <div class="space-y-3 p-1">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="text-xs uppercase font-bold text-slate-500">${all.length} reservas totales · ${activeOrFuture.length} actuales/futuras</div>
        <button onclick="pmEditBooking(null)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">+ Nueva Reserva</button>
      </div>

      <div>
        <div class="text-[10px] font-bold uppercase text-slate-700 mb-2">🟢 Actuales y futuras (${activeOrFuture.length})</div>
        ${activeOrFuture.length ? `<div class="space-y-2">${activeOrFuture.map(renderRow).join('')}</div>` : '<div class="text-xs text-slate-400 italic">Sin reservas actuales.</div>'}
      </div>

      ${pastOrFinished.length ? `
        <div>
          <div class="text-[10px] font-bold uppercase text-slate-700 mb-2 mt-4">⚫ Pasadas / finalizadas (${pastOrFinished.length})</div>
          <div class="space-y-2 opacity-60">${pastOrFinished.slice(0, 20).map(renderRow).join('')}</div>
        </div>
      ` : ''}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// TAB 4 · FINANZAS
// ════════════════════════════════════════════════════════════════
function pmRenderFinance() {
  const total = { ingresos: 0, gastos: 0, utilidad: 0 };
  const byProperty = pmaState.properties.map(p => {
    const f = pmFinanceOf(p.id);
    total.ingresos += f.ingresos;
    total.gastos += f.gastos;
    total.utilidad += f.utilidad;
    return { property: p, ...f };
  }).sort((a, b) => b.utilidad - a.utilidad);

  return `
    <div class="space-y-3 p-1">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="text-xs uppercase font-bold text-slate-500">Finanzas · ${pmaState.payments.length} movimientos cargados</div>
        <div class="flex gap-2">
          <button onclick="pmEditPayment(null,'ingreso')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">+ Ingreso</button>
          <button onclick="pmEditPayment(null,'gasto')" class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded">+ Gasto</button>
        </div>
      </div>

      <!-- Totales -->
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-emerald-50 border border-emerald-200 rounded p-3"><div class="text-[10px] uppercase font-bold text-emerald-800">Ingresos</div><div class="text-2xl font-bold text-emerald-700 mt-1">$${Math.round(total.ingresos).toLocaleString()}</div></div>
        <div class="bg-red-50 border border-red-200 rounded p-3"><div class="text-[10px] uppercase font-bold text-red-800">Gastos</div><div class="text-2xl font-bold text-red-700 mt-1">$${Math.round(total.gastos).toLocaleString()}</div></div>
        <div class="bg-blue-50 border border-blue-200 rounded p-3"><div class="text-[10px] uppercase font-bold text-blue-800">Utilidad</div><div class="text-2xl font-bold ${total.utilidad>=0?'text-blue-700':'text-red-700'} mt-1">$${Math.round(total.utilidad).toLocaleString()}</div></div>
      </div>

      <!-- Por propiedad -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-4 py-2 text-xs font-bold uppercase text-slate-700">Rendimiento por propiedad</div>
        <table class="w-full text-xs">
          <thead class="bg-slate-50">
            <tr><th class="text-left px-3 py-2">Propiedad</th><th class="text-right px-3 py-2">Ingresos</th><th class="text-right px-3 py-2">Gastos</th><th class="text-right px-3 py-2">Utilidad</th></tr>
          </thead>
          <tbody>
            ${byProperty.map(r => `
              <tr class="border-t border-slate-100">
                <td class="px-3 py-2">${(r.property.name||'').replace(/</g,'&lt;')}</td>
                <td class="text-right px-3 py-2 text-emerald-700 font-bold">$${Math.round(r.ingresos).toLocaleString()}</td>
                <td class="text-right px-3 py-2 text-red-700">$${Math.round(r.gastos).toLocaleString()}</td>
                <td class="text-right px-3 py-2 font-bold ${r.utilidad>=0?'text-emerald-700':'text-red-700'}">$${Math.round(r.utilidad).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Últimos movimientos -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-100 px-4 py-2 text-xs font-bold uppercase text-slate-700">Últimos movimientos · ${pmaState.payments.length}</div>
        ${pmaState.payments.length ? `
          <table class="w-full text-xs">
            <thead class="bg-slate-50"><tr><th class="text-left px-3 py-2">Fecha</th><th class="text-left px-3 py-2">Concepto</th><th class="text-left px-3 py-2">Propiedad</th><th class="text-left px-3 py-2">Cat</th><th class="text-right px-3 py-2">Monto</th><th class="text-center px-3 py-2">Estado</th></tr></thead>
            <tbody>
              ${pmaState.payments.slice(0, 50).map(pay => `
                <tr class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="pmEditPayment('${pay.id}')">
                  <td class="px-3 py-2">${pay.paid_at||pay.due_at||'—'}</td>
                  <td class="px-3 py-2 font-semibold">${(pay.concept||'').replace(/</g,'&lt;')}</td>
                  <td class="px-3 py-2 text-slate-600">${pmPropertyName(pay.property_id).slice(0,28)}</td>
                  <td class="px-3 py-2 text-slate-500 text-[10px]">${(pay.category||'').replace(/</g,'&lt;')}</td>
                  <td class="text-right px-3 py-2 font-bold ${pay.type==='ingreso'?'text-emerald-700':'text-red-700'}">${pay.type==='ingreso'?'+':'-'}$${Number(pay.amount||0).toLocaleString()}</td>
                  <td class="text-center px-3 py-2"><span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">${pay.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="p-4 text-center text-slate-400 text-xs italic">Sin movimientos cargados. Empezá registrando un ingreso o gasto.</div>'}
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// CRUD · MODALES (Propiedad, Unidad, Reserva, Pago, Inquilino)
// ════════════════════════════════════════════════════════════════
async function pmEditProperty(id) {
  const p = id ? pmaState.properties.find(x => x.id === id) : {};
  const isNew = !id;
  openModal((isNew?'+ Nueva':'✏️ Editar')+' Propiedad', `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Nombre *</label>
          <input id="pm-pf-name" value="${(p.name||'').replace(/"/g,'&quot;')}" placeholder="Ej. 4916 Barkbridge Trail" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Modelo de renta</label>
          <select id="pm-pf-model" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${[['casa_completa','🏡 Casa completa'],['por_habitaciones','🛏 Por habitaciones'],['por_estudios','🎨 Por estudios'],['por_apartamentos','🏢 Por apartamentos'],['mixto','🔀 Mixto']].map(([v,l])=>`<option value="${v}" ${(p.rental_model||'mixto')===v?'selected':''}>${l}</option>`).join('')}
          </select></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Dirección</label>
        <input id="pm-pf-addr" value="${(p.address||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      <div class="grid grid-cols-3 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Ciudad</label>
          <input id="pm-pf-city" value="${(p.city||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Estado</label>
          <input id="pm-pf-state" value="${(p.state||'TX').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">ZIP</label>
          <input id="pm-pf-zip" value="${(p.zip||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="grid grid-cols-4 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Habs.</label><input id="pm-pf-rooms" type="number" value="${p.total_rooms||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Baños</label><input id="pm-pf-baths" type="number" step="0.5" value="${p.total_baths||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Estudios</label><input id="pm-pf-studios" type="number" value="${p.total_studios||0}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">SqFt</label><input id="pm-pf-sqft" type="number" value="${p.sqft||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Notas</label>
        <textarea id="pm-pf-notes" rows="2" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">${(p.notes||'').replace(/</g,'&lt;')}</textarea></div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${!isNew ? `<button onclick="pmDeleteProperty('${id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded">🗑 Eliminar</button>` : ''}
        <button onclick="pmSaveProperty('${id||''}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">${isNew?'Crear':'Guardar'}</button>
      </div>
    </div>
  `);
}
window.pmEditProperty = pmEditProperty;

// Helper: reabre el modal del PM después de un CRUD (porque closeModal cierra el modal padre)
async function pmAfterCrud(updateLocalFn) {
  if (typeof updateLocalFn === 'function') updateLocalFn();
  closeModal();
  // Re-abrir el modal del PM con los datos refrescados
  await new Promise(rs => setTimeout(rs, 80));
  openPmSystem();
}
window.pmAfterCrud = pmAfterCrud;

// Helper: ejecuta query Supabase con manejo de error claro
async function pmExecQuery(qPromise, opLabel) {
  try {
    const r = await qPromise;
    if (r && r.error) {
      console.error('[pm]', opLabel, 'error:', r.error);
      alert('⚠️ ' + opLabel + ' falló:\n\n' + (r.error.message || JSON.stringify(r.error)) + '\n\nVerificá: sesión activa, RLS, datos válidos.');
      return null;
    }
    return r;
  } catch (e) {
    console.error('[pm]', opLabel, 'exception:', e);
    alert('⚠️ ' + opLabel + ' excepción:\n\n' + (e.message || String(e)));
    return null;
  }
}

async function pmSaveProperty(id) {
  const payload = {
    name: document.getElementById('pm-pf-name').value.trim(),
    rental_model: document.getElementById('pm-pf-model').value,
    address: document.getElementById('pm-pf-addr').value.trim(),
    city: document.getElementById('pm-pf-city').value.trim(),
    state: document.getElementById('pm-pf-state').value.trim(),
    zip: document.getElementById('pm-pf-zip').value.trim(),
    total_rooms: +document.getElementById('pm-pf-rooms').value || null,
    total_baths: +document.getElementById('pm-pf-baths').value || null,
    total_studios: +document.getElementById('pm-pf-studios').value || 0,
    sqft: +document.getElementById('pm-pf-sqft').value || null,
    notes: document.getElementById('pm-pf-notes').value.trim() || null
  };
  if (!payload.name) return alert('El nombre es obligatorio.');
  const r = id
    ? await pmExecQuery(sb.from('pm_properties').update(payload).eq('id', id).select(), 'Update propiedad')
    : await pmExecQuery(sb.from('pm_properties').insert(payload).select(), 'Crear propiedad');
  if (!r) return; // error ya mostrado
  console.log('[pm] propiedad guardada:', r.data);
  await pmAfterCrud();
}
window.pmSaveProperty = pmSaveProperty;

async function pmDeleteProperty(id) {
  if (!confirm('¿Eliminar esta propiedad y todas sus unidades/reservas?')) return;
  const r = await pmExecQuery(sb.from('pm_properties').delete().eq('id', id), 'Eliminar propiedad');
  if (!r) return;
  await pmAfterCrud();
}
window.pmDeleteProperty = pmDeleteProperty;

// ── UNIDAD ──
async function pmEditUnit(id, propertyId) {
  const u = id ? pmaState.units.find(x => x.id === id) : { property_id: propertyId };
  const isNew = !id;
  openModal((isNew?'+ Nueva':'✏️ Editar')+' Unidad', `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Código *</label>
          <input id="pm-uf-code" value="${(u.code||'').replace(/"/g,'&quot;')}" placeholder="Ej. CHILD-HB3" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Tipo</label>
          <select id="pm-uf-type" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${[['habitacion','🛏 Habitación'],['estudio','🎨 Estudio'],['apartamento','🏢 Apartamento'],['casa_completa','🏡 Casa completa']].map(([v,l])=>`<option value="${v}" ${(u.unit_type||'habitacion')===v?'selected':''}>${l}</option>`).join('')}
          </select></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Nombre descriptivo</label>
        <input id="pm-uf-name" value="${(u.name||'').replace(/"/g,'&quot;')}" placeholder="Ej. Casa Childress Hab 3" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Renta objetivo $/mes</label>
        <input id="pm-uf-rent" type="number" value="${u.target_rent||''}" placeholder="800" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${!isNew ? `<button onclick="pmDeleteUnit('${id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded">🗑</button>` : ''}
        <button onclick="pmSaveUnit('${id||''}','${u.property_id||propertyId||''}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">${isNew?'Crear':'Guardar'}</button>
      </div>
    </div>
  `);
}
window.pmEditUnit = pmEditUnit;

async function pmSaveUnit(id, propertyId) {
  const payload = {
    property_id: propertyId,
    code: document.getElementById('pm-uf-code').value.trim(),
    name: document.getElementById('pm-uf-name').value.trim() || null,
    unit_type: document.getElementById('pm-uf-type').value,
    target_rent: +document.getElementById('pm-uf-rent').value || null,
    is_active: true
  };
  if (!payload.code) return alert('El código es obligatorio.');
  if (!payload.property_id) return alert('Falta propiedad.');
  const r = id
    ? await pmExecQuery(sb.from('pm_units').update(payload).eq('id', id).select(), 'Update unidad')
    : await pmExecQuery(sb.from('pm_units').insert(payload).select(), 'Crear unidad');
  if (!r) return;
  await pmAfterCrud();
}
window.pmSaveUnit = pmSaveUnit;

async function pmDeleteUnit(id) {
  if (!confirm('¿Eliminar esta unidad?')) return;
  const r = await pmExecQuery(sb.from('pm_units').delete().eq('id', id), 'Eliminar unidad');
  if (!r) return;
  await pmAfterCrud();
}
window.pmDeleteUnit = pmDeleteUnit;

// ── RESERVA ──
async function pmEditBooking(id, unitId) {
  const b = id ? pmaState.bookings.find(x => x.id === id) : { unit_id: unitId, status: 'activo', booking_type: 'contrato_directo', rent_period: 'mensual' };
  const isNew = !id;
  const unit = pmaState.units.find(u => u.id === (b.unit_id || unitId));
  openModal((isNew?'+ Nueva':'✏️ Editar')+' Reserva', `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Unidad *</label>
          <select id="pm-bf-unit" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">— Elegir —</option>
            ${pmaState.units.map(u => { const p = pmaState.properties.find(x=>x.id===u.property_id); return `<option value="${u.id}" ${(b.unit_id||unitId)===u.id?'selected':''}>${(p?.name||'').slice(0,20)} · ${u.code}</option>`; }).join('')}
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Tipo</label>
          <select id="pm-bf-type" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${[['contrato_directo','📄 Contrato directo'],['airbnb','🌐 Airbnb'],['booking','🌐 Booking'],['vrbo','🌐 VRBO'],['hospitable','🌐 Hospitable'],['reserva_corta','⏱ Reserva corta'],['otro','• Otro']].map(([v,l])=>`<option value="${v}" ${(b.booking_type||'contrato_directo')===v?'selected':''}>${l}</option>`).join('')}
          </select></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Inquilino</label>
        <select id="pm-bf-tenant" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
          <option value="">— Sin asociar —</option>
          ${pmaState.tenants.map(t => `<option value="${t.id}" ${b.tenant_id===t.id?'selected':''}>${(t.full_name||'').replace(/</g,'&lt;')}</option>`).join('')}
        </select>
        <button onclick="pmQuickAddTenant()" class="text-[10px] text-blue-600 hover:underline mt-1">+ Crear nuevo inquilino</button></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Inicio *</label><input id="pm-bf-start" type="date" value="${b.start_date||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Fin (vacío = indefinido)</label><input id="pm-bf-end" type="date" value="${b.end_date||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Monto $</label><input id="pm-bf-amount" type="number" value="${b.rent_amount||''}" placeholder="800" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Período</label>
          <select id="pm-bf-period" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${[['mensual','Mensual'],['quincenal','Quincenal'],['semana','Semana'],['noche','Noche'],['anual','Anual'],['estadia','Estadía total']].map(([v,l])=>`<option value="${v}" ${(b.rent_period||'mensual')===v?'selected':''}>${l}</option>`).join('')}
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Depósito $</label><input id="pm-bf-deposit" type="number" value="${b.deposit||0}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Estado</label>
          <select id="pm-bf-status" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${[['activo','Activo'],['confirmado','Confirmado'],['borrador','Borrador'],['vencido','Vencido'],['finalizado','Finalizado'],['cancelado','Cancelado']].map(([v,l])=>`<option value="${v}" ${(b.status||'activo')===v?'selected':''}>${l}</option>`).join('')}
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Día de pago</label>
          <input id="pm-bf-payday" value="${(b.payment_day||'').replace(/"/g,'&quot;')}" placeholder="primer_dia / 15 / biweekly" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Notas</label>
        <textarea id="pm-bf-notes" rows="2" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">${(b.notes||'').replace(/</g,'&lt;')}</textarea></div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${!isNew ? `<button onclick="pmDeleteBooking('${id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded">🗑</button>` : ''}
        <button onclick="pmSaveBooking('${id||''}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">${isNew?'Crear':'Guardar'}</button>
      </div>
    </div>
  `);
}
window.pmEditBooking = pmEditBooking;

async function pmSaveBooking(id) {
  const unit_id = document.getElementById('pm-bf-unit').value;
  if (!unit_id) return alert('Elegí una unidad.');
  const unit = pmaState.units.find(u => u.id === unit_id);
  const payload = {
    unit_id,
    property_id: unit?.property_id,
    tenant_id: document.getElementById('pm-bf-tenant').value || null,
    booking_type: document.getElementById('pm-bf-type').value,
    start_date: document.getElementById('pm-bf-start').value,
    end_date: document.getElementById('pm-bf-end').value || null,
    rent_amount: +document.getElementById('pm-bf-amount').value || 0,
    rent_period: document.getElementById('pm-bf-period').value,
    deposit: +document.getElementById('pm-bf-deposit').value || 0,
    status: document.getElementById('pm-bf-status').value,
    payment_day: document.getElementById('pm-bf-payday').value.trim() || null,
    notes: document.getElementById('pm-bf-notes').value.trim() || null
  };
  if (!payload.start_date) return alert('La fecha de inicio es obligatoria.');
  const r = id
    ? await pmExecQuery(sb.from('pm_bookings').update(payload).eq('id', id).select(), 'Update reserva')
    : await pmExecQuery(sb.from('pm_bookings').insert(payload).select(), 'Crear reserva');
  if (!r) return;
  await pmAfterCrud();
}
window.pmSaveBooking = pmSaveBooking;

async function pmDeleteBooking(id) {
  if (!confirm('¿Eliminar esta reserva?')) return;
  const r = await pmExecQuery(sb.from('pm_bookings').delete().eq('id', id), 'Eliminar reserva');
  if (!r) return;
  await pmAfterCrud();
}
window.pmDeleteBooking = pmDeleteBooking;

async function pmQuickAddTenant() {
  const name = prompt('Nombre del nuevo inquilino:');
  if (!name) return;
  const phone = prompt('Teléfono (opcional):') || null;
  try {
    const { data } = await sb.from('pm_tenants').insert({ full_name: name, phone }).select().single();
    if (data) {
      pmaState.tenants.push(data);
      const sel = document.getElementById('pm-bf-tenant');
      if (sel) {
        const opt = document.createElement('option');
        opt.value = data.id; opt.text = data.full_name; opt.selected = true;
        sel.appendChild(opt);
      }
    }
  } catch (e) { alert('Error: ' + e.message); }
}
window.pmQuickAddTenant = pmQuickAddTenant;

// ── PAGO / FINANZA ──
async function pmEditPayment(id, defaultType) {
  const pay = id ? pmaState.payments.find(x => x.id === id) : { type: defaultType || 'ingreso', status: 'pendiente' };
  const isNew = !id;
  openModal((isNew?'+ Nuevo':'✏️ Editar')+(pay.type==='gasto'?' Gasto':' Ingreso'), `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Tipo</label>
          <select id="pm-yf-type" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="ingreso" ${pay.type==='ingreso'?'selected':''}>🟢 Ingreso</option>
            <option value="gasto" ${pay.type==='gasto'?'selected':''}>🔴 Gasto</option>
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Categoría</label>
          <input id="pm-yf-cat" value="${(pay.category||'').replace(/"/g,'&quot;')}" placeholder="renta / limpieza / servicios" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Concepto *</label>
        <input id="pm-yf-concept" value="${(pay.concept||'').replace(/"/g,'&quot;')}" placeholder="Ej. Renta mayo 2026 — Kiki" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Monto * $</label>
          <input id="pm-yf-amount" type="number" step="0.01" value="${pay.amount||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Estado</label>
          <select id="pm-yf-status" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${[['pendiente','Pendiente'],['pagado','Pagado'],['vencido','Vencido'],['anulado','Anulado']].map(([v,l])=>`<option value="${v}" ${(pay.status||'pendiente')===v?'selected':''}>${l}</option>`).join('')}
          </select></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Propiedad</label>
          <select id="pm-yf-prop" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">— Sin asignar —</option>
            ${pmaState.properties.map(p => `<option value="${p.id}" ${pay.property_id===p.id?'selected':''}>${(p.name||'').replace(/</g,'&lt;')}</option>`).join('')}
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Fecha pago</label>
          <input id="pm-yf-paid" type="date" value="${pay.paid_at||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${!isNew ? `<button onclick="pmDeletePayment('${id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded">🗑</button>` : ''}
        <button onclick="pmSavePayment('${id||''}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">${isNew?'Crear':'Guardar'}</button>
      </div>
    </div>
  `);
}
window.pmEditPayment = pmEditPayment;

async function pmSavePayment(id) {
  const payload = {
    type: document.getElementById('pm-yf-type').value,
    category: document.getElementById('pm-yf-cat').value.trim() || null,
    concept: document.getElementById('pm-yf-concept').value.trim(),
    amount: +document.getElementById('pm-yf-amount').value || 0,
    status: document.getElementById('pm-yf-status').value,
    property_id: document.getElementById('pm-yf-prop').value || null,
    paid_at: document.getElementById('pm-yf-paid').value || null
  };
  if (!payload.concept) return alert('El concepto es obligatorio.');
  if (!payload.amount) return alert('El monto es obligatorio.');
  const r = id
    ? await pmExecQuery(sb.from('pm_payments').update(payload).eq('id', id).select(), 'Update movimiento')
    : await pmExecQuery(sb.from('pm_payments').insert(payload).select(), 'Crear movimiento');
  if (!r) return;
  await pmAfterCrud();
}
window.pmSavePayment = pmSavePayment;

async function pmDeletePayment(id) {
  if (!confirm('¿Eliminar este movimiento?')) return;
  const r = await pmExecQuery(sb.from('pm_payments').delete().eq('id', id), 'Eliminar movimiento');
  if (!r) return;
  await pmAfterCrud();
}
window.pmDeletePayment = pmDeletePayment;

// ════════════════════════════════════════════════════════════════
// 📡 TAB 5 · FEEDS (calendarios iCal externos)
// ════════════════════════════════════════════════════════════════
function pmRenderFeeds() {
  const feeds = pmaState.feeds || [];
  const groupedByPlatform = {};
  feeds.forEach(f => {
    if (!groupedByPlatform[f.platform]) groupedByPlatform[f.platform] = [];
    groupedByPlatform[f.platform].push(f);
  });
  return `
    <div class="space-y-3 p-1">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="text-base font-bold text-slate-900">📡 Calendarios externos · ${feeds.length} feeds</div>
          <div class="text-xs text-slate-500">Sincronización iCal con Airbnb, VRBO, Booking. Trae reservas automático.</div>
        </div>
        <div class="flex gap-2">
          ${feeds.length ? `<button onclick="pmSyncAllFeeds()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded">🔄 Sync todos</button>` : ''}
          <button onclick="pmEditFeed(null)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">+ Nuevo feed</button>
        </div>
      </div>

      <!-- Guía rápida -->
      <details class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
        <summary class="cursor-pointer font-bold">📖 Cómo sacar el iCal de Airbnb (paso a paso)</summary>
        <ol class="list-decimal ml-5 mt-2 space-y-1">
          <li>Entrá a Airbnb (cuenta de host) → <strong>Today</strong> → <strong>Calendar</strong></li>
          <li>Elegí el listing que querés sincronizar (de la lista de propiedades)</li>
          <li>Arriba a la derecha: <strong>Availability</strong> → <strong>Connect another calendar</strong> (a veces "Sync calendars")</li>
          <li>En la sección <strong>"Export your calendar"</strong>, copiá el link <code>.ics</code> (empieza con <code>https://www.airbnb.com/calendar/ical/...</code>)</li>
          <li>Volvé acá → click <strong>+ Nuevo feed</strong> → elegí la unidad → pegá el link</li>
          <li>Click <strong>🔄 Sync ahora</strong> → vas a ver las reservas en el calendario PM</li>
        </ol>
        <div class="mt-2 text-[11px] italic">⚠️ El iCal solo trae fechas+nombre del huésped (no monto). El monto $/noche lo configurás como "default" del feed.</div>
      </details>

      ${!feeds.length ? `
        <div class="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-10 text-center">
          <div class="text-5xl mb-2">📡</div>
          <div class="font-bold text-slate-700">Sin feeds configurados</div>
          <div class="text-xs text-slate-500 mt-1">Agregá tu primer iCal de Airbnb para empezar a sincronizar.</div>
          <button onclick="pmEditFeed(null)" class="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 rounded">+ Agregar primer feed</button>
        </div>
      ` : `
        <div class="space-y-2">
          ${Object.entries(groupedByPlatform).map(([platform, list]) => `
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div class="bg-slate-100 px-4 py-2 flex items-center justify-between">
                <div class="font-bold text-xs uppercase text-slate-700">${platform === 'airbnb' ? '🌐 Airbnb' : platform === 'vrbo' ? '🌐 VRBO' : platform === 'booking' ? '🌐 Booking' : platform === 'hospitable' ? '🌐 Hospitable' : '🔗 ' + platform} · ${list.length} feed${list.length===1?'':'s'}</div>
              </div>
              <div class="divide-y divide-slate-100">
                ${list.map(f => pmRenderFeedRow(f)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function pmRenderFeedRow(f) {
  const unit = pmaState.units.find(u => u.id === f.unit_id);
  const property = unit ? pmaState.properties.find(p => p.id === unit.property_id) : null;
  const statusColor = f.last_status === 'success' ? 'text-emerald-700' : f.last_status === 'error' ? 'text-red-700' : 'text-slate-500';
  const statusIcon = f.last_status === 'success' ? '✅' : f.last_status === 'error' ? '❌' : '⏳';
  const lastSyncDate = f.last_synced_at ? new Date(f.last_synced_at).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'nunca';
  return `
    <div class="px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          ${f.active ? '<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase">ACTIVO</span>' : '<span class="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase">PAUSADO</span>'}
          <strong class="text-sm text-slate-900">${property ? property.name.replace(/</g,'&lt;') : '—'}</strong>
          <span class="text-[10px] text-slate-500">·</span>
          <span class="text-xs text-slate-700">${unit ? `${unit.code} ${unit.name||''}`.replace(/</g,'&lt;') : 'Sin unidad'}</span>
        </div>
        <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
          <span class="${statusColor}">${statusIcon} ${f.last_status || 'pendiente'}</span>
          <span>· última sync: ${lastSyncDate}</span>
          ${f.last_total ? `<span>· ${f.last_total} eventos</span>` : ''}
          ${f.default_rent ? `<span>· $${Number(f.default_rent).toLocaleString()}/${f.default_period||'noche'}</span>` : ''}
        </div>
        ${f.last_error ? `<div class="text-[10px] text-red-700 mt-0.5 truncate" title="${(f.last_error||'').replace(/"/g,'&quot;')}">⚠️ ${(f.last_error||'').slice(0,120)}</div>` : ''}
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <button onclick="pmSyncFeed('${f.id}')" class="bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-bold px-2 py-1 rounded" title="Sync ahora">🔄</button>
        <button onclick="pmEditFeed('${f.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-1 rounded">✏️</button>
        <button onclick="pmDeleteFeed('${f.id}')" class="bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold px-2 py-1 rounded">🗑</button>
      </div>
    </div>
  `;
}

async function pmEditFeed(id) {
  const f = id ? pmaState.feeds.find(x => x.id === id) : { platform: 'airbnb', feed_type: 'ical', active: true, auto_sync: true, default_period: 'noche' };
  const isNew = !id;
  openModal((isNew?'+ Nuevo':'✏️ Editar')+' Feed (iCal externo)', `
    <div class="space-y-3">
      <div class="bg-blue-50 border border-blue-200 rounded p-2 text-[11px] text-blue-900">
        💡 Para Airbnb: <strong>Calendar → Availability → Export calendar</strong>. Copiá la URL <code>.ics</code>.
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-[10px] font-bold uppercase text-slate-600">Plataforma *</label>
          <select id="pm-ff-platform" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${[['airbnb','🌐 Airbnb'],['vrbo','🌐 VRBO'],['booking','🌐 Booking'],['hospitable','🌐 Hospitable'],['custom','🔗 Custom iCal'],['otro','• Otro']].map(([v,l])=>`<option value="${v}" ${(f.platform||'airbnb')===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-[10px] font-bold uppercase text-slate-600">Unidad *</label>
          <select id="pm-ff-unit" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">— Elegir —</option>
            ${pmaState.units.map(u => { const p = pmaState.properties.find(x=>x.id===u.property_id); return `<option value="${u.id}" ${f.unit_id===u.id?'selected':''}>${(p?.name||'').slice(0,25)} · ${u.code}</option>`; }).join('')}
          </select>
        </div>
      </div>
      <div>
        <label class="text-[10px] font-bold uppercase text-slate-600">URL del iCal (.ics) *</label>
        <textarea id="pm-ff-url" rows="2" placeholder="https://www.airbnb.com/calendar/ical/XXXXXX.ics?s=XXXXXX" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs font-mono">${(f.source_url||'').replace(/</g,'&lt;')}</textarea>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-[10px] font-bold uppercase text-slate-600">$/noche (default)</label>
          <input id="pm-ff-rent" type="number" value="${f.default_rent||''}" placeholder="80" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
          <div class="text-[9px] text-slate-500 mt-0.5">iCal no trae monto. Esto se usa para reservas nuevas.</div>
        </div>
        <div>
          <label class="text-[10px] font-bold uppercase text-slate-600">Período</label>
          <select id="pm-ff-period" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${[['noche','Noche'],['estadia','Estadía total'],['mensual','Mensual']].map(([v,l])=>`<option value="${v}" ${(f.default_period||'noche')===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="flex items-center gap-2 text-xs">
          <input id="pm-ff-active" type="checkbox" ${f.active!==false?'checked':''}/>
          <span>Feed activo</span>
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input id="pm-ff-auto" type="checkbox" ${f.auto_sync!==false?'checked':''}/>
          <span>Sync automático</span>
        </label>
      </div>
      <div>
        <label class="text-[10px] font-bold uppercase text-slate-600">Notas</label>
        <textarea id="pm-ff-notes" rows="2" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">${(f.notes||'').replace(/</g,'&lt;')}</textarea>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${!isNew ? `<button onclick="pmDeleteFeed('${id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded">🗑</button>` : ''}
        <button onclick="pmSaveFeed('${id||''}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">${isNew?'Crear feed':'Guardar'}</button>
      </div>
    </div>
  `);
}
window.pmEditFeed = pmEditFeed;

async function pmSaveFeed(id) {
  const unit_id = document.getElementById('pm-ff-unit').value;
  if (!unit_id) return alert('Elegí una unidad.');
  const unit = pmaState.units.find(u => u.id === unit_id);
  const payload = {
    unit_id,
    property_id: unit?.property_id,
    platform: document.getElementById('pm-ff-platform').value,
    feed_type: 'ical',
    source_url: document.getElementById('pm-ff-url').value.trim(),
    default_rent: +document.getElementById('pm-ff-rent').value || null,
    default_period: document.getElementById('pm-ff-period').value,
    active: document.getElementById('pm-ff-active').checked,
    auto_sync: document.getElementById('pm-ff-auto').checked,
    notes: document.getElementById('pm-ff-notes').value.trim() || null
  };
  if (!payload.source_url) return alert('La URL del iCal es obligatoria.');
  if (!/^https?:\/\//.test(payload.source_url)) return alert('La URL debe empezar con https://');
  const r = id
    ? await pmExecQuery(sb.from('pm_calendar_feeds').update(payload).eq('id', id).select(), 'Update feed')
    : await pmExecQuery(sb.from('pm_calendar_feeds').insert(payload).select(), 'Crear feed');
  if (!r) return;
  // Si es nuevo, ofrecer sync inmediato
  if (!id && r.data && r.data[0]) {
    closeModal();
    if (confirm('Feed creado. ¿Sincronizar ahora?')) {
      await pmSyncFeed(r.data[0].id);
    } else {
      await pmAfterCrud();
    }
  } else {
    await pmAfterCrud();
  }
}
window.pmSaveFeed = pmSaveFeed;

async function pmDeleteFeed(id) {
  if (!confirm('¿Eliminar este feed? Las reservas ya sincronizadas se mantienen.')) return;
  const r = await pmExecQuery(sb.from('pm_calendar_feeds').delete().eq('id', id), 'Eliminar feed');
  if (!r) return;
  await pmAfterCrud();
}
window.pmDeleteFeed = pmDeleteFeed;

async function pmSyncFeed(feedId) {
  openModal('🔄 Sincronizando feed...', `
    <div class="text-center py-8">
      <div class="text-5xl animate-pulse mb-3">📡</div>
      <div class="font-bold text-slate-900">Descargando iCal y procesando reservas...</div>
      <div class="text-xs text-slate-500 mt-2">Hasta 30 segundos.</div>
    </div>
  `);

  let accessToken;
  try {
    const sess = await sb.auth.getSession();
    accessToken = sess?.data?.session?.access_token;
    if (!accessToken) throw new Error('Sin sesión');
  } catch (e) {
    closeModal();
    return alert('⚠️ Sesión expirada.');
  }

  try {
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/pm-sync-calendars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ feed_ids: [feedId] })
    });
    const txt = await res.text();
    let r;
    try { r = JSON.parse(txt); } catch { throw new Error(`HTTP ${res.status}: ${txt.slice(0,200)}`); }
    if (!r.ok) throw new Error(r.error || 'Sync falló');

    closeModal();
    const s = r.stats || {};
    openModal('✅ Sync completado', `
      <div class="space-y-3">
        <div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-900">
          Feed sincronizado correctamente · ${Math.round((r.duration_ms||0)/1000)}s
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="bg-slate-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-slate-500">Procesados</div><div class="text-2xl font-bold">${s.feeds_processed||0}</div></div>
          <div class="bg-emerald-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-emerald-700">Eventos iCal</div><div class="text-2xl font-bold text-emerald-700">${s.total_events||0}</div></div>
          <div class="bg-blue-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-blue-700">Sincronizados</div><div class="text-2xl font-bold text-blue-700">${s.total_added||0}</div></div>
        </div>
        ${(s.errors||[]).length ? `<details class="bg-amber-50 border border-amber-200 rounded p-2"><summary class="text-xs font-bold text-amber-900 cursor-pointer">⚠️ ${s.errors.length} warnings</summary><pre class="text-[10px] mt-2 whitespace-pre-wrap">${s.errors.join('\\n').replace(/</g,'&lt;')}</pre></details>` : ''}
        <div class="flex gap-2 pt-2 border-t border-slate-200">
          <button onclick="closeModal();openPmSystem();" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">✓ Ver reservas</button>
        </div>
      </div>
    `);
  } catch (e) {
    closeModal();
    alert('⚠️ Sync falló:\n\n' + (e?.message || String(e)) + '\n\nVerificá:\n• La URL es un .ics válido\n• El URL es accesible (probá pegarlo en otra pestaña)');
  }
}
window.pmSyncFeed = pmSyncFeed;

async function pmSyncAllFeeds() {
  if (!confirm('¿Sincronizar TODOS los feeds activos? Puede tardar varios minutos.')) return;
  openModal('🔄 Sincronizando todos los feeds...', `
    <div class="text-center py-8">
      <div class="text-5xl animate-pulse mb-3">📡</div>
      <div class="font-bold text-slate-900">Procesando ${(pmaState.feeds||[]).filter(f=>f.active).length} feeds...</div>
      <div class="text-xs text-slate-500 mt-2">No cierres la ventana.</div>
    </div>
  `);

  let accessToken;
  try {
    const sess = await sb.auth.getSession();
    accessToken = sess?.data?.session?.access_token;
    if (!accessToken) throw new Error('Sin sesión');
  } catch (e) {
    closeModal();
    return alert('⚠️ Sesión expirada.');
  }

  try {
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/pm-sync-calendars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ all: true })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'Falló');
    closeModal();
    const s = r.stats || {};
    alert(`✅ Sync completo\n\n${s.feeds_processed||0} feeds procesados\n${s.total_events||0} eventos\n${s.total_added||0} sincronizados\n\n${(s.errors||[]).length} warnings`);
    await pmLoadAll();
  } catch (e) {
    closeModal();
    alert('⚠️ Falló: ' + (e?.message||String(e)));
  }
}
window.pmSyncAllFeeds = pmSyncAllFeeds;

// ════════════════════════════════════════════════════════════════
// 🆕 SYNC AIRTABLE — Edge Function que jala las 10 tablas
// Token + Base ID en localStorage del navegador. Idempotente.
// ════════════════════════════════════════════════════════════════
function pmOpenAirtableImport() {
  const savedToken = localStorage.getItem('pm-airtable-token') || '';
  const savedBaseId = localStorage.getItem('pm-airtable-base') || 'appzEnsuy4qPT6iHj';
  openModal('🔄 Sync Airtable', `
    <div class="space-y-3 text-sm">
      <div class="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
        Sincroniza tu base Airtable <code class="font-mono">${savedBaseId}</code> con el módulo PM.
        Trae: propiedades, unidades, inquilinos, reservas, pagos, gastos, accesos y tareas.
        <br><br>
        🔐 <strong>Tu token NO se guarda en el servidor</strong> — solo en localStorage de este navegador.
        Crealo en <a href="https://airtable.com/create/tokens" target="_blank" class="underline font-bold">airtable.com/create/tokens</a> con scopes:
        <ul class="list-disc ml-5 mt-1">
          <li><code>data.records:read</code></li>
          <li><code>schema.bases:read</code></li>
        </ul>
        Y accesso a esta base específicamente.
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Airtable Personal Access Token *</label>
        <input id="pm-at-token" type="password" value="${savedToken.replace(/"/g,'&quot;')}" placeholder="patXXXX...." class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono"/>
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Base ID</label>
        <input id="pm-at-base" value="${savedBaseId.replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono"/>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900">
        ⚠️ Primera sync: 30-90 segundos. <strong>No cierres la ventana.</strong> Hacé "Dry run" primero para ver qué se va a importar.
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="pmStartAirtableSync(true)" class="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded" title="Prueba sin escribir a la DB">🧪 Dry run</button>
        <button onclick="pmStartAirtableSync(false)" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">🔄 Sync ahora</button>
      </div>

      <details class="text-[11px] text-slate-500">
        <summary class="cursor-pointer">📋 Plan B · Importar JSON manualmente (legacy)</summary>
        <div class="mt-2 bg-slate-50 border border-slate-200 rounded p-2">
          <textarea id="pm-airtable-json" rows="4" placeholder='[{"name":"4916 Barkbridge",...}]' class="w-full border border-slate-300 rounded p-1 text-[10px] font-mono"></textarea>
          <button onclick="pmImportFromJSON()" class="mt-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded">Importar JSON</button>
        </div>
      </details>
    </div>
  `);
}
window.pmOpenAirtableImport = pmOpenAirtableImport;

async function pmStartAirtableSync(dryRun) {
  const token = (document.getElementById('pm-at-token')?.value || '').trim();
  const baseId = (document.getElementById('pm-at-base')?.value || '').trim();
  if (!token) return alert('Falta el token de Airtable.');
  if (!baseId) return alert('Falta el Base ID.');
  localStorage.setItem('pm-airtable-token', token);
  localStorage.setItem('pm-airtable-base', baseId);

  openModal('🔄 Sincronizando con Airtable...', `
    <div class="text-center py-8">
      <div class="text-5xl animate-pulse mb-3">🔄</div>
      <div class="font-bold text-slate-900">${dryRun?'🧪 Dry run':'Sincronizando 10 tablas'}</div>
      <div class="text-xs text-slate-500 mt-2">Hasta 90 segundos. No cierres la ventana.</div>
    </div>
  `);

  // Auth strict
  let accessToken;
  try {
    const sbAuth = (typeof sb !== 'undefined' && sb) ? sb : (window.sb || null);
    let sess = await sbAuth.auth.getSession();
    if (!sess?.data?.session?.access_token) {
      try { await sbAuth.auth.refreshSession(); sess = await sbAuth.auth.getSession(); } catch (e) {}
    }
    accessToken = sess?.data?.session?.access_token;
    if (!accessToken || accessToken === window.SUPABASE_ANON_KEY) throw new Error('Sin sesión activa');
  } catch (e) {
    closeModal();
    return alert('⚠️ Sesión expirada. Cerrá sesión y volvé a entrar.');
  }

  try {
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/pm-sync-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ airtable_token: token, base_id: baseId, dry_run: !!dryRun })
    });
    const txt = await res.text();
    let r;
    try { r = JSON.parse(txt); } catch { throw new Error(`HTTP ${res.status}: ${txt.slice(0,200)}`); }
    if (!r.ok) throw new Error(r.error || 'Sync falló');

    closeModal();
    const stats = r.stats || {};
    const errs = (r.errors||[]);
    openModal(dryRun ? '🧪 Dry run completado' : '✅ Sync completado', `
      <div class="space-y-3">
        <div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-900">
          ${dryRun ? 'Simulación OK. <strong>No se escribió nada a la DB.</strong>' : 'Datos sincronizados correctamente.'}
          <br><span class="text-[10px]">⏱ ${Math.round((r.duration_ms||0)/1000)}s</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div class="bg-slate-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-slate-500">Propiedades</div><div class="text-xl font-bold">${stats.properties||0}</div></div>
          <div class="bg-slate-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-slate-500">Unidades</div><div class="text-xl font-bold">${stats.units||0}</div></div>
          <div class="bg-slate-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-slate-500">Inquilinos</div><div class="text-xl font-bold">${stats.tenants||0}</div></div>
          <div class="bg-slate-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-slate-500">Reservas</div><div class="text-xl font-bold">${stats.bookings||0}</div></div>
          <div class="bg-emerald-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-emerald-700">Ingresos</div><div class="text-xl font-bold text-emerald-700">${stats.payments_in||0}</div></div>
          <div class="bg-red-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-red-700">Gastos</div><div class="text-xl font-bold text-red-700">${stats.payments_out||0}</div></div>
          <div class="bg-slate-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-slate-500">Accesos</div><div class="text-xl font-bold">${stats.credentials||0}</div></div>
          <div class="bg-slate-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-slate-500">Tareas</div><div class="text-xl font-bold">${stats.tasks||0}</div></div>
        </div>
        ${errs.length ? `<details class="bg-amber-50 border border-amber-200 rounded p-2"><summary class="text-xs font-bold text-amber-900 cursor-pointer">⚠️ ${errs.length} warnings (sync continuó pese a estos errores)</summary><pre class="text-[10px] mt-2 whitespace-pre-wrap">${errs.join('\\n').replace(/</g,'&lt;')}</pre></details>` : ''}
        <div class="flex gap-2 pt-2 border-t border-slate-200">
          <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cerrar</button>
          ${!dryRun ? `<button onclick="closeModal();pmLoadAll();" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">✓ Ver datos</button>` : ''}
        </div>
      </div>
    `);
    if (!dryRun) await pmLoadAll();
  } catch (e) {
    closeModal();
    alert('⚠️ Sync falló:\n\n' + (e?.message || String(e)) + '\n\nVerificá:\n• Token con scopes correctos\n• Base ID correcto\n• Token tiene acceso a esa base');
  }
}
window.pmStartAirtableSync = pmStartAirtableSync;

async function pmImportFromJSON() {
  const raw = document.getElementById('pm-airtable-json').value.trim();
  if (!raw) return alert('Pegá un JSON primero.');
  let arr;
  try { arr = JSON.parse(raw); } catch (e) { return alert('JSON inválido: ' + e.message); }
  if (!Array.isArray(arr)) return alert('El JSON debe ser un array.');
  // Normalizar y subir
  const payload = arr.map(r => ({
    name: r.name || r.Name || r.nombre || '',
    address: r.address || r.direccion || r.Address || null,
    city: r.city || r.ciudad || null,
    state: r.state || r.estado || null,
    zip: r.zip || r.codigo_postal || null,
    rental_model: r.rental_model || r.modelo || 'mixto',
    total_rooms: r.total_rooms || r.habitaciones || r.rooms || null,
    total_baths: r.total_baths || r.banos || r.baths || null,
    total_studios: r.total_studios || r.estudios || 0,
    sqft: r.sqft || null,
    notes: r.notes || r.notas || null,
    external_id: r.id || r.airtable_id || null
  })).filter(p => p.name);
  if (!payload.length) return alert('No encontré propiedades válidas. Verificá que tengan "name".');
  if (!confirm(`Se van a crear ${payload.length} propiedades. ¿Continuar?`)) return;
  try {
    await sb.from('pm_properties').insert(payload);
    closeModal();
    await pmLoadAll();
    alert('✅ Importadas ' + payload.length + ' propiedades.');
  } catch (e) { alert('Error: ' + e.message); }
}
window.pmImportFromJSON = pmImportFromJSON;
