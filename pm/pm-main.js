// ════════════════════════════════════════════════════════════════
// 🏠 PROPERTY MANAGEMENT · módulo principal
// Tabs: Propiedades · Calendario · Reservas · Finanzas
// Depende de: sb, state, openModal, closeModal (de app.js / ui-toolkit)
// ════════════════════════════════════════════════════════════════

const pmaState = {
  tab: 'properties',                 // properties · calendar · bookings · finance
  selectedPropertyId: null,           // para vista detalle
  calendarYear: new Date().getFullYear(),
  calendarFilterPropertyId: null,     // filtro de calendario (null = todas)
  // Data
  properties: [],
  units: [],
  bookings: [],
  tenants: [],
  payments: [],
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
  pmRender();
  try {
    const [props, units, bookings, tenants, payments] = await Promise.all([
      sb.from('pm_properties').select('*').order('name').catch(() => ({ data: [] })),
      sb.from('pm_units').select('*').eq('is_active', true).order('code').catch(() => ({ data: [] })),
      sb.from('pm_bookings').select('*').order('start_date', { ascending: false }).catch(() => ({ data: [] })),
      sb.from('pm_tenants').select('*').order('full_name').catch(() => ({ data: [] })),
      sb.from('pm_payments').select('*').order('paid_at', { ascending: false, nullsFirst: false }).limit(500).catch(() => ({ data: [] }))
    ]);
    pmaState.properties = props.data || [];
    pmaState.units = units.data || [];
    pmaState.bookings = bookings.data || [];
    pmaState.tenants = tenants.data || [];
    pmaState.payments = payments.data || [];
  } catch (e) {
    console.warn('[pm] load error:', e);
  }
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
  root.innerHTML = `
    <div class="flex flex-col" style="min-height:60vh;">
      <!-- Header con tabs -->
      <div class="border-b border-slate-200 mb-3">
        <div class="flex gap-1 -mb-px overflow-x-auto">
          ${[
            ['properties','🏘️ Propiedades', pmaState.properties.length],
            ['calendar','📅 Calendario', ''],
            ['bookings','📋 Reservas', pmaState.bookings.length],
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
  return `
    <div class="space-y-3 p-1">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="text-xs uppercase font-bold text-slate-500">${props.length} propiedades · ${pmaState.units.length} unidades</div>
        </div>
        <div class="flex gap-2">
          <button onclick="pmOpenAirtableImport()" class="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold px-3 py-1.5 rounded">📥 Importar de Airtable</button>
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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${props.map(p => {
            const occ = pmOccupancyOf(p.id);
            const fin = pmFinanceOf(p.id);
            const units = pmUnitsOf(p.id);
            const color = occ.pct >= 80 ? 'emerald' : occ.pct >= 50 ? 'amber' : 'red';
            return `
              <div class="bg-white border border-slate-200 hover:border-emerald-400 rounded-xl overflow-hidden cursor-pointer transition shadow-sm hover:shadow-md" onclick="pmSelectProperty('${p.id}')">
                <div class="bg-gradient-to-br from-slate-800 to-slate-900 text-white px-4 py-3">
                  <div class="text-[10px] uppercase font-bold text-slate-300 tracking-wider">${p.rental_model || 'mixto'}</div>
                  <div class="font-bold text-sm mt-0.5 truncate">${(p.name||'').replace(/</g,'&lt;')}</div>
                  <div class="text-[11px] text-slate-300 truncate">${(p.address||'').replace(/</g,'&lt;')}</div>
                </div>
                <div class="p-3 space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-600">Ocupación</span>
                    <strong class="text-${color}-700">${occ.occupied}/${occ.total} · ${occ.pct}%</strong>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-2">
                    <div class="bg-${color}-500 h-2 rounded-full transition-all" style="width:${occ.pct}%"></div>
                  </div>
                  <div class="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100">
                    <div class="text-center">
                      <div class="text-[9px] text-slate-500 uppercase">Unidades</div>
                      <div class="text-sm font-bold text-slate-900">${units.length}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[9px] text-slate-500 uppercase">Ingresos</div>
                      <div class="text-sm font-bold text-emerald-700">$${Math.round(fin.ingresos).toLocaleString()}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[9px] text-slate-500 uppercase">Utilidad</div>
                      <div class="text-sm font-bold ${fin.utilidad>=0?'text-emerald-700':'text-red-700'}">$${Math.round(fin.utilidad).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

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
function pmRenderTimelineForUnits(units, year) {
  if (!units.length) return '<div class="p-4 text-center text-slate-400 text-xs italic">Sin unidades para mostrar.</div>';
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const totalDays = Math.floor((yearEnd - yearStart) / 86400000) + 1;
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Posición de "hoy" como % del año
  const todayPct = (year === new Date().getFullYear())
    ? Math.max(0, Math.min(100, 100 * Math.floor((new Date() - yearStart) / 86400000) / totalDays))
    : null;

  // Para cada unidad, sus bookings overlapeando el año
  const rows = units.map(u => {
    const bks = pmBookingsOf(u.id).filter(b => {
      const start = b.start_date ? new Date(b.start_date) : null;
      const end = b.end_date ? new Date(b.end_date) : null;
      if (!start) return false;
      if (start > yearEnd) return false;
      if (end && end < yearStart) return false;
      return ['activo','confirmado','vencido','finalizado'].includes(b.status);
    });
    return { unit: u, bks };
  });

  return `
    <div class="overflow-x-auto">
      <div style="min-width:900px;">
        <!-- Header meses -->
        <div class="flex border-b border-slate-200" style="padding-left:200px;">
          ${months.map(m => `<div class="text-[10px] text-slate-500 font-bold uppercase text-center" style="flex:1;border-right:1px solid #f1f5f9;padding:4px 0;">${m}</div>`).join('')}
        </div>
        <!-- Rows -->
        ${rows.map(({unit, bks}, idx) => `
          <div class="flex items-center border-b border-slate-100 hover:bg-slate-50" style="min-height:36px;">
            <div class="flex items-center gap-2" style="width:200px;padding:6px 8px;">
              <span class="text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold font-mono">${unit.code}</span>
              <span class="text-xs font-semibold text-slate-700 truncate">${(unit.name||unit.code).replace(/</g,'&lt;')}</span>
            </div>
            <div class="relative flex-1" style="height:32px;background:#fafafa;border-left:1px solid #f1f5f9;">
              ${bks.map(b => {
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
                  reserva_corta:     'background:linear-gradient(135deg,#f59e0b,#d97706);',
                  otro:              'background:linear-gradient(135deg,#64748b,#475569);'
                };
                const bg = colorByType[b.booking_type] || colorByType.otro;
                const opacity = b.status === 'finalizado' || b.status === 'vencido' ? 0.5 : 1;
                const tenant = pmTenantName(b.tenant_id);
                const tooltip = `${tenant}\n${b.start_date} → ${b.end_date||'∞'}\n$${Number(b.rent_amount||0).toLocaleString()}/${b.rent_period}\n[${b.booking_type}]`;
                return `<div onclick="event.stopPropagation();pmEditBooking('${b.id}')" title="${tooltip.replace(/"/g,'&quot;')}" style="position:absolute;left:${left}%;width:${width}%;top:4px;bottom:4px;${bg};opacity:${opacity};border-radius:4px;padding:0 4px;display:flex;align-items:center;overflow:hidden;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.2);">
                  <span style="color:white;font-size:10px;font-weight:bold;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;">${tenant.split(' ')[0]||'·'}</span>
                </div>`;
              }).join('')}
              ${todayPct !== null ? `<div style="position:absolute;left:${todayPct}%;top:0;bottom:0;width:2px;background:#ef4444;z-index:2;" title="Hoy"></div>` : ''}
            </div>
          </div>
        `).join('')}
        <!-- Leyenda -->
        <div class="flex gap-3 px-3 py-2 text-[10px] text-slate-600 flex-wrap border-t border-slate-100">
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#10b981,#059669);border-radius:2px;margin-right:3px;"></span>Contrato directo</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#f43f5e,#e11d48);border-radius:2px;margin-right:3px;"></span>Airbnb</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:2px;margin-right:3px;"></span>Booking</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#0ea5e9,#0284c7);border-radius:2px;margin-right:3px;"></span>Hospitable</span>
          <span><span style="display:inline-block;width:2px;height:10px;background:#ef4444;margin-right:3px;"></span>Hoy</span>
        </div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// TAB 2 · CALENDARIO GENERAL (todas las propiedades)
// ════════════════════════════════════════════════════════════════
function pmRenderCalendar() {
  const filter = pmaState.calendarFilterPropertyId;
  const allUnits = filter
    ? pmUnitsOf(filter)
    : pmaState.units.filter(u => pmaState.properties.some(p => p.id === u.property_id));
  // Agrupar por propiedad
  const byProperty = {};
  allUnits.forEach(u => {
    if (!byProperty[u.property_id]) byProperty[u.property_id] = [];
    byProperty[u.property_id].push(u);
  });

  return `
    <div class="space-y-3 p-1">
      <!-- Header con filtros -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="text-xs uppercase font-bold text-slate-500">Calendario General · ${pmaState.calendarYear}</div>
          <div class="text-[11px] text-slate-500">${allUnits.length} unidades · ${pmaState.bookings.filter(b => ['activo','confirmado'].includes(b.status)).length} reservas activas</div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <select onchange="pmaState.calendarFilterPropertyId=this.value||null;pmRender()" class="text-xs border border-slate-300 rounded px-2 py-1">
            <option value="">Todas las propiedades</option>
            ${pmaState.properties.map(p => `<option value="${p.id}" ${filter===p.id?'selected':''}>${(p.name||'').replace(/</g,'&lt;')}</option>`).join('')}
          </select>
          <button onclick="pmaState.calendarYear--;pmRender()" class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-xs">←</button>
          <span class="text-sm font-bold">${pmaState.calendarYear}</span>
          <button onclick="pmaState.calendarYear++;pmRender()" class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-xs">→</button>
          <button onclick="pmEditBooking(null)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">+ Reserva</button>
        </div>
      </div>

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
        const occ = pmOccupancyOf(propId);
        return `
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="px-4 py-2 bg-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span class="text-xs font-bold text-slate-900">🏠 ${(p.name||'').replace(/</g,'&lt;')}</span>
                <span class="text-[10px] text-slate-500 ml-2">${units.length} unidades · ${occ.pct}% ocup.</span>
              </div>
              <button onclick="pmSelectProperty('${p.id}');pmaState.tab='properties';pmRender()" class="text-[10px] text-blue-600 hover:underline">Ver detalle →</button>
            </div>
            ${pmRenderTimelineForUnits(units, pmaState.calendarYear)}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

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
  try {
    if (id) await sb.from('pm_properties').update(payload).eq('id', id);
    else await sb.from('pm_properties').insert(payload);
    closeModal();
    await pmLoadAll();
  } catch (e) { alert('Error: ' + e.message); }
}
window.pmSaveProperty = pmSaveProperty;

async function pmDeleteProperty(id) {
  if (!confirm('¿Eliminar esta propiedad y todas sus unidades/reservas?')) return;
  try { await sb.from('pm_properties').delete().eq('id', id); closeModal(); await pmLoadAll(); }
  catch (e) { alert('Error: ' + e.message); }
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
    target_rent: +document.getElementById('pm-uf-rent').value || null
  };
  if (!payload.code) return alert('El código es obligatorio.');
  if (!payload.property_id) return alert('Falta propiedad.');
  try {
    if (id) await sb.from('pm_units').update(payload).eq('id', id);
    else await sb.from('pm_units').insert(payload);
    closeModal();
    await pmLoadAll();
  } catch (e) { alert('Error: ' + e.message); }
}
window.pmSaveUnit = pmSaveUnit;

async function pmDeleteUnit(id) {
  if (!confirm('¿Eliminar esta unidad?')) return;
  try { await sb.from('pm_units').delete().eq('id', id); closeModal(); await pmLoadAll(); }
  catch (e) { alert('Error: ' + e.message); }
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
  try {
    if (id) await sb.from('pm_bookings').update(payload).eq('id', id);
    else await sb.from('pm_bookings').insert(payload);
    closeModal();
    await pmLoadAll();
  } catch (e) { alert('Error: ' + e.message); }
}
window.pmSaveBooking = pmSaveBooking;

async function pmDeleteBooking(id) {
  if (!confirm('¿Eliminar esta reserva?')) return;
  try { await sb.from('pm_bookings').delete().eq('id', id); closeModal(); await pmLoadAll(); }
  catch (e) { alert('Error: ' + e.message); }
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
  try {
    if (id) await sb.from('pm_payments').update(payload).eq('id', id);
    else await sb.from('pm_payments').insert(payload);
    closeModal();
    await pmLoadAll();
  } catch (e) { alert('Error: ' + e.message); }
}
window.pmSavePayment = pmSavePayment;

async function pmDeletePayment(id) {
  if (!confirm('¿Eliminar este movimiento?')) return;
  try { await sb.from('pm_payments').delete().eq('id', id); closeModal(); await pmLoadAll(); }
  catch (e) { alert('Error: ' + e.message); }
}
window.pmDeletePayment = pmDeletePayment;

// ════════════════════════════════════════════════════════════════
// IMPORTAR DE AIRTABLE — placeholder con instrucciones
// (cuando estés listo, conectamos via API + Edge Function)
// ════════════════════════════════════════════════════════════════
function pmOpenAirtableImport() {
  openModal('📥 Importar de Airtable', `
    <div class="space-y-3 text-sm">
      <div class="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
        Para conectar Airtable necesitamos: <strong>(1)</strong> tu Airtable API key, <strong>(2)</strong> Base ID, <strong>(3)</strong> nombres de las tablas (propiedades, unidades, etc.). Por ahora podés:
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded p-3 text-xs">
        <div class="font-bold mb-2">Opción A · Pegar JSON manualmente</div>
        <div class="text-slate-600 mb-2">Exportá tus propiedades de Airtable como JSON o CSV y pegalo acá:</div>
        <textarea id="pm-airtable-json" rows="8" placeholder='Pegá array JSON:\n[\n  {"name":"4916 Barkbridge","address":"...","rental_model":"por_habitaciones","total_rooms":5},\n  ...\n]' class="w-full border border-slate-300 rounded p-2 text-xs font-mono"></textarea>
        <button onclick="pmImportFromJSON()" class="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded">📥 Importar JSON</button>
      </div>
      <div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-900">
        <div class="font-bold mb-1">Opción B · Conectar Airtable directo (próximo)</div>
        Cuando me pases tu API key y Base ID, hago una Edge Function que jala las propiedades automático cada X horas. Avísame cuando quieras.
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cerrar</button>
      </div>
    </div>
  `);
}
window.pmOpenAirtableImport = pmOpenAirtableImport;

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
