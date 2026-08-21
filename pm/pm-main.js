// ════════════════════════════════════════════════════════════════
// 🏠 PROPERTY MANAGEMENT · módulo principal
// Tabs: Propiedades · Calendario · Reservas · Finanzas
// Depende de: sb, state, openModal, closeModal (de app.js / ui-toolkit)
// ════════════════════════════════════════════════════════════════

const pmaState = {
  tab: 'dashboard',                  // dashboard (landing CEO) · properties · calendar · bookings · finance · feeds
  selectedPropertyId: null,           // para vista detalle
  pdTab: 'units',                     // sub-tab de la vista detalle: units·creds·pnl·docs·tasks
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),   // 0-11
  calendarView: 'timeline',               // 'timeline' (multi-unit) | 'single' (un solo listing)
  calendarFilterPropertyId: null,
  calendarSelectedUnitId: null,           // si seteado → vista single de esa unidad
  calendarSelectedBookingId: null,        // panel derecho con detalles
  calendarListingSearch: '',              // buscador del sidebar
  calendarTimelineStart: null,            // fecha de inicio del timeline (ISO date)
  calendarTimelineDays: 21,               // cuántos días mostrar en el timeline
  calendarMonthDatePickerOpen: false,
  calendarOccupancyFilter: 'all',         // 'all' | 'occupied' | 'free'
  calendarPlatformFilter: null,           // null | 'airbnb' | 'contrato_directo' | ...
  calendarGroupByProperty: true,          // agrupar sidebar por propiedad (default ON)
  calendarCollapsedProps: {},             // { propertyId: true } — qué grupos están colapsados
  calendarGroupsInitialized: false,       // primera vez: colapsar todos
  bookingsSearch: '',                     // buscador del tab Reservas
  bookingsPlatformFilter: null,           // filtro de plataforma (fuente) en tab Reservas
  bookingsFilterProperty: null,           // filtro por casa
  bookingsFilterStatus: 'all',            // all·active·upcoming·past·expiring
  bookingsFiltersLoaded: false,           // guard de carga desde localStorage
  tenantsFilter: 'activos',               // CRM Inquilinos: todos·activos·expiring·late·historico
  tenantsSearch: '',                      // buscador del tab Inquilinos
  tenantsFilterProperty: null,            // filtro por casa
  tenantsFilterType: null,                // filtro por tipo de unidad
  tenantsFiltersLoaded: false,
  tenantDetailId: null,                   // tenant_id → vista detalle CRM
  ceoDetailKey: null,                     // alerta CEO con detalle expandido (overlay)
  payStatusFilter: 'all',                 // Pagos: all·aldia·pendiente·proximo·atrasado·revisar·sincontrato
  payRecurrenceFilter: null,              // mensual·quincenal·airbnb
  paySearch: '',
  paySortKey: null,                       // columna de orden de la tabla Pagos (null = default paid_at desc)
  paySortDir: 'asc',
  expSortKey: null,                       // columna de orden de la tabla Gastos
  expSortDir: 'asc',
  payFiltersLoaded: false,
  expStatusFilter: 'all',                 // Gastos: all·paid·pending
  expFiltersLoaded: false,
  payMonth: null,                         // tab Pagos: 'YYYY-MM' (null = mes actual)
  payFilterProperty: null,                // tab Pagos: property_id
  payFilterPlatform: null,                // tab Pagos: plataforma
  expSubTab: 'house',                     // tab Gastos: house·operational·payroll
  expMonth: null,                         // tab Gastos: 'YYYY-MM' (null = mes actual)
  expFilterProperty: null,                // tab Gastos: property_id (sub-tab casa)
  expFilterSubcat: null,                  // tab Gastos: subcategoría
  payrollView: 'people',                  // sub-tab Nómina: people·monthly
  finPeriod: 'this_month',                // Finanzas: this_month·last3·ytd·custom (legacy toggle)
  finMonthSel: null,                      // Finanzas: 'YYYY-MM'|'ytd'|'last-3m'|...|'all-time' (null=mes actual)
  finFilterProperty: null,                // Finanzas: filtrar dashboard por casa
  finFilterPlatform: null,                // Finanzas: filtrar por plataforma
  finFilterModel: null,                   // Finanzas: filtrar por modelo de renta
  finCustomFrom: null,                    // Finanzas custom: 'YYYY-MM-DD'
  finCustomTo: null,
  pnlSortKey: 'net',                      // P&L por casa: columna de orden
  pnlSortDir: 'desc',                     // asc·desc
  opsSubTab: 'tasks',                     // Operación: tasks·utilities·services·comms·alerts
  tasksView: 'calendar',                  // tasks: calendar·weekly·list·byassignee
  opsFilterProperty: null,                // filtros globales Operación
  opsFilterType: null,
  opsFilterAssignee: null,
  opsWeekStart: null,                     // ISO lunes de la semana mostrada
  tasksListRange: '7',                    // list: '7'·'30'·'late'
  opsCalMonth: null,                      // 'YYYY-MM' (null = mes actual)
  commsTenantId: null,                    // Centro de comunicación: tenant elegido
  commsTemplateKey: null,                 // template elegido
  commsCustomText: null,                  // texto editado
  alertSeverityFilter: null,              // panel alertas: critical·warning·info
  alertCategoryFilter: null,              // contract·payment·service·task·occupancy
  alertShowResolved: false,
  alertsDropdownOpen: false,              // bell dropdown
  financePeriod: 'all',                   // 'all' | 'this_month' | 'this_year'
  financeTypeFilter: 'all',               // 'all' | 'ingreso' | 'gasto'
  financeSearch: '',                      // buscador de Finanzas
  financeShowOrphansOnly: false,          // mostrar solo huérfanos
  // Data
  properties: [],
  units: [],
  bookings: [],
  tenants: [],
  payments: [],
  feeds: [],                          // 🆕 calendarios externos
  alerts: [],                         // 🆕 alertas automáticas
  templates: [],                      // 🆕 plantillas de mensajes
  bookingHistory: [],                 // 🆕 movimientos de reserva entre unidades
  utilities: [],                      // 🆕 recibos públicos (Spectrum/Gas/Water/Electric)
  dataWarnings: [],                   // 🆕 alertas de integridad de datos (del sync)
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
// Filtra los registros archivados (active=false / is_active=false) salvo que el
// usuario active "mostrar archivados". Mirror sync: lo que no está en Airtable
// queda active=false pero NO se borra (historia preservada). Si la columna `active`
// no existe aún (migración no aplicada), x.active es undefined → no filtra (fallback).
function pmApplyActiveFilter() {
  const raw = pmaState._raw || {};
  const showArc = pmaState.showArchived;
  const keep = (arr, col) => showArc ? (arr || []) : (arr || []).filter(x => x[col] !== false);
  pmaState.properties = keep(raw.properties, 'active');
  pmaState.units      = keep(raw.units, 'is_active');
  pmaState.bookings   = keep(raw.bookings, 'active');
  pmaState.tenants    = keep(raw.tenants, 'active');
  pmaState.expenses   = keep(raw.expenses, 'active');
  // pm_expenses se normaliza a forma "pago gasto" y se mergea con payments (Finanzas).
  const expAsPays = pmaState.expenses.map(e => ({
    id: e.id, _src: 'expense', type: 'gasto', status: 'pagado',
    property_id: e.property_id || null, amount: e.amount,
    paid_at: e.expense_date || null, category: e.category || 'gasto',
    concept: e.description || e.subcategory || e.category || 'Gasto'
  }));
  pmaState.payments = [...keep(raw.payments, 'active'), ...expAsPays];
}
function pmToggleArchived() {
  pmaState.showArchived = !pmaState.showArchived;
  pmApplyActiveFilter();
  pmRender();
}
window.pmToggleArchived = pmToggleArchived;

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

  // Cargar cada tabla. `optional: true` = si falla solo warning, NO bloquea todo el módulo.
  const queries = [
    { name: 'properties', optional: false, q: () => sb.from('pm_properties').select('*').order('name') },
    { name: 'units',      optional: false, q: () => sb.from('pm_units').select('*').order('code') },
    { name: 'bookings',   optional: false, q: () => sb.from('pm_bookings').select('*').order('start_date', { ascending: false }).limit(2000) },
    { name: 'tenants',    optional: false, q: () => sb.from('pm_tenants').select('*').order('full_name').limit(500) },
    // SOLO filas activas del espejo (los inactivos son residuo soft-deleted del sync viejo y
    // NO entran en ningún cálculo). Antes: select sin filtro + limit(1000) sobre 1228 filas
    // cortaba pagos con paid_at null (los "revisar" del mes) — bug real.
    { name: 'payments',   optional: false, q: () => sb.from('pm_payments').select('*').eq('active', true).order('paid_at', { ascending: false, nullsFirst: false }).limit(2000) },
    { name: 'expenses',   optional: true,  q: () => sb.from('pm_expenses').select('*').eq('active', true).order('expense_date', { ascending: false, nullsFirst: false }).limit(2000) },
    { name: 'payroll',    optional: true,  q: () => sb.from('pm_payroll').select('*').limit(1000) },
    { name: 'credentials',optional: true,  q: () => sb.from('pm_credentials').select('*').limit(1000) },
    { name: 'wifi',       optional: true,  q: () => sb.from('pm_wifi_credentials').select('*').limit(500) },
    { name: 'tasks',      optional: true,  q: () => sb.from('pm_tasks').select('*').order('scheduled_date', { ascending: true, nullsFirst: false }).limit(1000) },
    { name: 'lastSync',   optional: true,  q: () => sb.from('pm_sync_log').select('*').eq('source','airtable').order('started_at', { ascending: false }).limit(1) },
    { name: 'feeds',      optional: true,  q: () => sb.from('pm_calendar_feeds').select('*').order('created_at', { ascending: false }) },
    { name: 'alerts',     optional: true,  q: () => sb.from('pm_alerts').select('*').order('created_at', { ascending: false }).limit(500) },
    { name: 'templates',  optional: true,  q: () => sb.from('pm_message_templates').select('*').order('name') },
    { name: 'bookingHistory', optional: true, q: () => sb.from('pm_booking_history').select('*').order('moved_at', { ascending: false }).limit(2000) },
    { name: 'utilities',  optional: true,  q: () => sb.from('pm_utilities').select('*').order('service_name') },
    { name: 'dataWarnings', optional: true, q: () => sb.from('pm_data_warnings').select('*').eq('resolved', false).order('detected_at', { ascending: false }).limit(500) },
    // ocupación ÚNICA del holding (v_ocupacion, capa de KPIs) — la MISMA cifra que Global/Rentas CC
    { name: 'ocupView', optional: true, q: () => sb.from('v_ocupacion').select('*') }
  ];

  const results = {};
  pmaState.loadWarnings = [];
  for (const { name, optional, q } of queries) {
    try {
      const r = await q();
      if (r.error) {
        console.warn(`[pm] ${optional?'(opcional)':''} Error cargando ${name}:`, r.error.message);
        results[name] = [];
        if (optional) {
          pmaState.loadWarnings.push(`${name}: ${r.error.message}`);
        } else {
          pmaState.loadError = pmaState.loadError || `Error cargando ${name}: ${r.error.message}`;
        }
      } else {
        results[name] = r.data || [];
        console.log(`[pm] ${name}: ${results[name].length} registros`);
      }
    } catch (e) {
      console.warn(`[pm] ${optional?'(opcional)':''} Exception cargando ${name}:`, e);
      results[name] = [];
      if (optional) {
        pmaState.loadWarnings.push(`${name}: ${e.message}`);
      } else {
        pmaState.loadError = pmaState.loadError || `Exception cargando ${name}: ${e.message}`;
      }
    }
  }

  // Crudos (incluyen archivados) para poder togglear sin recargar.
  pmaState._raw = {
    properties: results.properties || [],
    units: results.units || [],
    bookings: results.bookings || [],
    tenants: results.tenants || [],
    payments: results.payments || [],
    expenses: results.expenses || []
  };
  pmApplyActiveFilter();   // setea properties/units/bookings/tenants/expenses/payments según showArchived
  pmaState.payroll = results.payroll || [];
  pmaState.credentials = results.credentials || [];
  pmaState.wifi = results.wifi || [];
  pmaState.tasks = results.tasks || [];
  pmaState.lastSync = (results.lastSync || [])[0] || null;
  pmaState.feeds = results.feeds || [];
  pmaState.alerts = results.alerts || [];
  pmaState.templates = results.templates || [];
  pmaState.bookingHistory = results.bookingHistory || [];
  pmaState.utilities = results.utilities || [];
  pmaState.dataWarnings = results.dataWarnings || [];
  pmaState.ocupView = (results.ocupView || [])[0] || null;   // v_ocupacion (ocupación única del holding)

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

// Indicador "Última sync: hace X" para el header (desde pm_sync_log)
function pmSyncStatusLabel() {
  const s = pmaState.lastSync;
  if (!s) return '';
  const ts = s.finished_at || s.started_at;
  if (!ts) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  const rel = mins < 1 ? 'recién' : mins < 60 ? `hace ${mins} min` : mins < 1440 ? `hace ${Math.round(mins/60)} h` : `hace ${Math.round(mins/1440)} d`;
  const color = s.status === 'success' ? 'text-emerald-600' : s.status === 'running' ? 'text-blue-600' : s.status === 'error' ? 'text-red-600' : 'text-amber-600';
  const dot = s.status === 'running' ? '<span class="animate-pulse">●</span>' : '●';
  const stale = mins > 60
    ? `<span class="ml-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded" title="La última sincronización fue hace más de 1 hora">⚠️ Datos desactualizados</span>`
    : '';
  return `<span class="text-[11px] ${color} font-semibold whitespace-nowrap" title="Estado: ${s.status||'?'}">${dot} Última sync: ${rel}</span>${stale}`;
}

// ════════════════════════════════════════════════════════════════
// HELPERS de cálculo
// ════════════════════════════════════════════════════════════════
function pmUnitsOf(propertyId) {
  return pmaState.units.filter(u => u.property_id === propertyId);
}
function pmBookingsOf(unitId) {
  return pmaState.bookings.filter(b => b.unit_id === unitId);
}
// Bookings de una unidad que puede estar "colapsada" (varias unidades físicas
// en una sola línea de calendario, p.ej. por_habitaciones). Para unidades
// normales equivale a pmBookingsOf(u.id).
function pmMergedBookings(unitObj) {
  const ids = unitObj._mergedUnitIds || [unitObj.id];
  return ids.length === 1 ? pmBookingsOf(ids[0]) : pmaState.bookings.filter(b => ids.includes(b.unit_id));
}
function pmMergedActiveBooking(unitObj, date = new Date()) {
  const ids = unitObj._mergedUnitIds || [unitObj.id];
  for (const id of ids) { const a = pmActiveBookingOf(id, date); if (a) return a; }
  return null;
}
function pmActiveBookingOf(unitId, date = new Date()) {
  const d = (typeof date === 'string') ? date : date.toISOString().slice(0,10);
  return pmaState.bookings.find(b =>
    b.unit_id === unitId
    && ['activo','confirmado','reservada'].includes(b.status)
    && b.start_date <= d
    && (!b.end_date || b.end_date >= d)
  );
}
// Ocupación de una unidad: derivada de su Estado (Airtable Unidades) vía pmUnitState,
// no de las reservas. (pmUnitState está hoisted; ver su definición más abajo.)
function pmUnitOccupied(u) { return !!u && pmUnitState(u) === 'ocupada'; }
function pmTenantName(id) {
  const t = pmaState.tenants.find(x => x.id === id);
  return t?.full_name || '—';
}
function pmPropertyName(id) {
  const p = pmaState.properties.find(x => x.id === id);
  return p?.name || '—';
}
function pmOccupancyOf(propertyId) {
  // Ocupación de la propiedad en términos de UNIDADES (regla del dueño, ver abajo).
  const total = pmRentableUnitsOf(propertyId);
  const occ = pmOccupiedRentableUnitsOf(propertyId);
  return { occupied: occ, total, pct: total ? Math.round(100 * occ / total) : 0 };
}
// ── REGLA DE UNIDADES (confirmada por el dueño · jun 2026) ──
//   Cada casa_completa = 1, cada estudio = 1, cada apartamento = 1, y TODAS las
//   habitaciones de la casa juntas = 1 (6 habitaciones = 1 unidad).
//   Ej: casa completa + 3 estudios = 4 unidades · 407 Capitol = 4.
//   Es MODEL-AGNÓSTICO: se calcula desde las unidades reales (no del rental_model).
//   Equivale a Casas.Unidades de Airtable (fldsr8FGN6y5OsaEr → pm_properties.total_units).
//   La ocupación (% y libres) usa la MISMA definición.
const PM_INDEP_TYPES = ['casa_completa', 'apartamento', 'estudio'];
function isRentableUnit(u) { return PM_INDEP_TYPES.includes(u?.unit_type); }
function pmIndepUnitsOf(propertyId) { return pmUnitsOf(propertyId).filter(u => PM_INDEP_TYPES.includes(u.unit_type)); }
function pmRoomsOf(propertyId) { return pmUnitsOf(propertyId).filter(u => u.unit_type === 'habitacion'); }
// Subunidades rentables independientes (compat: apartamentos/estudios)
function pmRentableSubunitsOf(propertyId) {
  return pmUnitsOf(propertyId).filter(u => u.unit_type === 'apartamento' || u.unit_type === 'estudio');
}
// Unidades casa+habitaciones (para estado agregado del grupo)
function pmHouseUnitsOf(propertyId) {
  return pmUnitsOf(propertyId).filter(u => u.unit_type === 'casa_completa' || u.unit_type === 'habitacion');
}
// ══════════════════════════════════════════════════════════════════════════
// INVENTARIO RENTABLE ÚNICO — una sola definición para TODA la app (Item 27/B4)
// ──────────────────────────────────────────────────────────────────────────
// Fuente canónica = la MISMA regla que v_ocupacion / OS Global / Rentas CC:
//   unidad rentable = pm_unit del espejo NUEVO (external_id 'unit-rec…') con unit_type,
//   de propiedad activa. CADA habitación cuenta individual (meta = 51 físicas).
//   Se dedupean las legacy (mismo code+tipo+renta) para no inflar; los external_id viejos
//   ('unit-{casa}-{slug}') quedan afuera (son fantasmas del sync viejo).
// La OCUPACIÓN sale de RESERVAS VIGENTES hoy (pmActiveBookingOf) O del Estado 'ocupada'
//   de Airtable — hoy coinciden 1:1 (verificado en Supabase) — con un ÚNICO denominador
//   en Resumen, Disponibilidad, KPIs y Analítica.
// (La vieja regla "habitaciones de la casa juntas = 1" daba 36 y DIVERGÍA del headline
//  v_ocupacion=51 → retirada del CONTEO. El drill por casa muestra cada habitación igual.)
// ══════════════════════════════════════════════════════════════════════════
function pmIsPhysUnit(u){ return !!u && u.active !== false && /^unit-rec/.test(u.external_id || '') && !!u.unit_type; }
// Unidades físicas rentables de una casa (deduped), independientes del filtro de "archivados".
function pmPhysUnitsOf(propertyId){
  const raw = (pmaState._raw && pmaState._raw.units) || pmaState.units || [];
  return pmDedupeUnits(raw.filter(u => u.property_id === propertyId && pmIsPhysUnit(u)));
}
// ¿ocupada AHORA? = reserva vigente hoy O Estado 'ocupada' (Airtable). Robusto a status stale.
function pmUnitOccupiedNow(u){ return !!u && (!!pmActiveBookingOf(u.id) || pmUnitState(u) === 'ocupada'); }
// Inventario rentable del portafolio (todas las casas activas), deduped = 51 físicas.
function pmRentableInventory(){
  const activeProps = new Set(pmaState.properties.filter(p => p.active !== false).map(p => p.id));
  const raw = (pmaState._raw && pmaState._raw.units) || pmaState.units || [];
  return pmDedupeUnits(raw.filter(u => pmIsPhysUnit(u) && activeProps.has(u.property_id)));
}
// Ocupación del portafolio — cifra ÚNICA (v_ocupacion; fallback = inventario físico + reservas).
// Invariante GARANTIZADA: ocupadas + libres + reservadas + mantenimiento = total.
function pmPhysOccupancy(){
  const oc = pmaState.ocupView;
  if (oc && +oc.unidades_rentables > 0){
    const total = +oc.unidades_rentables, occupied = +oc.ocupadas || 0,
          reserved = +oc.reservadas || 0, maintenance = +oc.mantenimiento || 0;
    return { total, occupied, reserved, maintenance,
             free: Math.max(0, total - occupied - reserved - maintenance),
             pct: total ? occupied / total : 0, fuente: 'v_ocupacion' };
  }
  const inv = pmRentableInventory();
  const occupied    = inv.filter(pmUnitOccupiedNow).length;
  const reserved    = inv.filter(u => !pmUnitOccupiedNow(u) && pmUnitState(u) === 'reservada').length;
  const maintenance = inv.filter(u => !pmUnitOccupiedNow(u) && pmUnitState(u) === 'mantenimiento').length;
  return { total: inv.length, occupied, reserved, maintenance,
           free: Math.max(0, inv.length - occupied - reserved - maintenance),
           pct: inv.length ? occupied / inv.length : 0, fuente: 'físico' };
}
function pmRentableUnitsOf(propertyId) {
  const n = pmPhysUnitsOf(propertyId).length;
  if (n > 0) return n;
  // Fallback si la casa aún no tiene unidades cargadas: Casas.Unidades (Airtable) → total_units.
  const p = pmaState.properties.find(x => x.id === propertyId);
  return Math.max(1, parseInt(p?.total_units) || 1);
}
function pmOccupiedRentableUnitsOf(propertyId) {
  return pmPhysUnitsOf(propertyId).filter(pmUnitOccupiedNow).length;
}
function pmReservedRentableUnitsOf(propertyId) {
  return pmPhysUnitsOf(propertyId).filter(u => !pmUnitOccupiedNow(u) && pmUnitState(u) === 'reservada').length;
}
// Totales del portafolio (solo propiedades activas)
function pmTotalRentableUnits() {
  return pmaState.properties.filter(p => p.active !== false)
    .reduce((s, p) => s + pmRentableUnitsOf(p.id), 0);
}
function pmTotalOccupiedRentableUnits() {
  return pmaState.properties.filter(p => p.active !== false)
    .reduce((s, p) => s + pmOccupiedRentableUnitsOf(p.id), 0);
}
// Unidades rentables LIBRES = rentables − ocupadas (invariante: libres+ocupadas=rentables)
function pmFreeRentableUnits() {
  return Math.max(0, pmTotalRentableUnits() - pmTotalOccupiedRentableUnits());
}
// ── TILES para la vista Disponibilidad (misma regla de unidades) ──
// Cada casa_completa / estudio / apartamento = 1 tile; TODAS las habitaciones
// de la casa juntas = 1 tile sintético "Habitaciones".
function pmRentableTiles(propIds) {
  const tiles = [];
  for (const p of pmaState.properties.filter(x => x.active !== false && (!propIds || propIds.has(x.id)))) {
    pmIndepUnitsOf(p.id).forEach(u => tiles.push(u));          // casa_completa + estudios + aptos
    const rooms = pmRoomsOf(p.id);
    if (rooms.length) tiles.push({                              // grupo de habitaciones = 1 tile
      id: 'rooms-' + p.id, _roomsGroup: true, _roomIds: rooms.map(r => r.id),
      property_id: p.id, code: 'HAB', unit_type: 'habitacion',
      name: rooms.length > 1 ? `Habitaciones (${rooms.length})` : 'Habitación',
    });
  }
  return tiles;
}
// unidades físicas que determinan el estado de un tile
function pmTileUnitIds(tile) {
  if (tile._roomsGroup) return tile._roomIds;
  return [tile.id];
}
function pmTileState(tile) {
  if (!tile._roomsGroup) {
    if (tile.maintenance_status === 'en_mantenimiento') return 'mantenimiento';
    return pmUnitState(tile);   // casa_completa / estudio / apto = unidad real
  }
  // grupo de habitaciones: estado agregado
  const today = new Date().toISOString().slice(0, 10);
  const us = tile._roomIds.map(id => pmaState.units.find(u => u.id === id)).filter(Boolean);
  if (us.some(u => u.maintenance_status === 'en_mantenimiento')) return 'mantenimiento';
  if (us.some(u => pmUnitOccupied(u))) return 'ocupada';
  if (us.some(u => pmUnitState(u) === 'reservada')) return 'reservada';
  if (tile._roomIds.some(id => pmaState.bookings.some(b => b.unit_id === id && ['confirmado','reservada'].includes(b.status) && (b.start_date || '') > today))) return 'reservada';
  return 'libre';
}
// ═══ UNA definición de "mes" para dinero (regla dura): el MES DE RENTA es el tag
// Mes/Año de Airtable (pm_payments/pm_expenses.billing_ym, columna generada en la DB).
// Si la fila no tiene tag, cae explícitamente a la fecha (paid_at/expense_date).
// paid_at queda SOLO para la vista de flujo de caja ("cobrado en el mes").
function pmBillYm(x) { return (x && (x.billing_ym || (x.paid_at || x.expense_date || '').slice(0, 7))) || ''; }

// ═══ ESTATUS DE COBRANZA (regla dura): el MONTO se deriva SOLO del balance
// espejado de Airtable — pm_payments.deuda = "Balance de pago" (renta pactada
// del período − pago, mismas columnas que /cartera) — por PERÍODO Mes/Año. Un
// pago que cubre el mes (deuda ≤ 0) NUNCA es "Atrasado", sin importar cuándo se
// recibió. Con saldo, el TIEMPO lo define el vencimiento del inquilino
// ("Vencimiento Pago Renta"): vencido → Atrasado · N días (incluye mes en curso).
const PM_BAL_GUARD = 6; // |balance| ≤ $6 = diferencia de centavos/redondeo → $0

function pmHoyYm() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; }

// Balance real del pago: columna deuda del sync; fallback = renta pactada − pago
// (la MISMA fórmula de Airtable, jamás la renta fija del inquilino).
function pmPayBalance(p) {
  if (!p) return null;
  let b = (typeof p.deuda === 'number') ? p.deuda
        : (typeof p.renta_pactada === 'number') ? p.renta_pactada - Number(p.amount || 0)
        : null;
  if (b == null) return null;
  return Math.abs(b) <= PM_BAL_GUARD ? 0 : b;
}
// ¿Ingreso de plataforma (PadSplit)? No es deuda de inquilino: nunca "Atrasado".
function pmPayEsPlataforma(p) {
  const n = ((p && p.tenant_id ? pmTenantName(p.tenant_id) : '') || (p && p.concept) || '').toLowerCase();
  return /pads?\s*s?plit|pads?lit/.test(n);
}
// ── Vencimiento POR INQUILINO (👤 "Vencimiento Pago Renta", texto libre) ──
const PM_DIA_VENC_DEFAULT = 3; // fallback si el inquilino aún no tiene día definido
// "Primeros 3 dias del mes" → 3 · "Dia 27 de cada mes" → 27
function pmDiaVenc(texto) {
  const m = String(texto || '').match(/\d{1,2}/);
  if (m) { const d = parseInt(m[0], 10); if (d >= 1 && d <= 31) return d; }
  return PM_DIA_VENC_DEFAULT;
}
// Días vencido del período del pago (0 si aún no vence). Vence el día del
// inquilino dentro del Mes/Año del PERÍODO de renta (billing_ym).
function pmDiasVencido(p, hoy = new Date()) {
  const ym = pmBillYm(p);
  if (!/^\d{4}-\d{2}$/.test(ym)) return 0;
  const anio = +ym.slice(0, 4), mes = +ym.slice(5, 7);
  const t = pmaState.tenants.find(x => x.id === p.tenant_id);
  const dia = pmDiaVenc(t && t.vencimiento_pago);
  const ultimo = new Date(anio, mes, 0).getDate();
  const venc = new Date(anio, mes - 1, Math.min(dia, ultimo));
  const t0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.floor((t0 - venc) / 86400000);
  return dias > 0 ? dias : 0;
}
function pmTextoVencido(dias) {
  if (dias <= 0) return '';
  if (dias < 31) return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  const m = Math.floor(dias / 30), r = dias % 30;
  return r ? `${m} ${m === 1 ? 'mes' : 'meses'} ${r} d` : `${m} ${m === 1 ? 'mes' : 'meses'}`;
}
// Estatus de UN pago. debe = lo que realmente se debe (balance), NUNCA la renta.
// Atrasado = saldo pendiente y ya pasó el día de vencimiento del inquilino
// (incluye el mes en curso). Antes de vencer → Pendiente.
function pmPayStatus(p) {
  if (pmPayEsPlataforma(p)) return { key: 'aldia', label: '🏦 Plataforma', cls: 'text-slate-500 bg-slate-50', debe: 0, dias: 0 };
  // Sin "Renta pactada - Contrato" no hay balance confiable (la fórmula da 0 igual):
  // → revisar, nunca asumir la renta actual del inquilino.
  const bal = (p && typeof p.renta_pactada !== 'number') ? null : pmPayBalance(p);
  if (bal == null) return { key: 'revisar', label: '⚠️ Revisar (sin renta pactada)', cls: 'text-amber-700 bg-amber-50', debe: 0, dias: 0 };
  if (bal < 0) return { key: 'aldia', label: '💚 Saldo a favor', cls: 'text-emerald-700 bg-emerald-50', debe: 0, dias: 0 };
  if (bal === 0) return { key: 'aldia', label: '✅ Pagado', cls: 'text-emerald-700 bg-emerald-50', debe: 0, dias: 0 };
  const dias = pmDiasVencido(p);
  if (dias > 0) return { key: 'atrasado', label: `🔴 Atrasado · ${pmTextoVencido(dias)}`, cls: 'text-red-700 bg-red-50', debe: bal, dias };
  return { key: 'pendiente', label: '⏳ Pendiente', cls: 'text-amber-700 bg-amber-50', debe: bal, dias: 0 };
}
// Deuda vencida real de un inquilino = Σ balance>0 de sus pagos ya vencidos.
function pmTenantDebt(tenantId) {
  if (!tenantId) return 0;
  return pmaState.payments
    .filter(p => p.type === 'ingreso' && p.tenant_id === tenantId)
    .reduce((s, p) => { const st = pmPayStatus(p); return s + (st.key === 'atrasado' ? st.debe : 0); }, 0);
}

function pmFinanceOf(propertyId, monthDate = null) {
  // monthDate: Date|null. null = all-time, else solo el mes específico (mes de renta)
  let pays = pmaState.payments.filter(p => p.property_id === propertyId && p.status === 'pagado');
  if (monthDate) {
    const ym = monthDate.toISOString().slice(0,7);
    pays = pays.filter(p => pmBillYm(p) === ym);
  }
  const ingresos = pays.filter(p => p.type === 'ingreso').reduce((s,p) => s + Number(p.amount||0), 0);
  const gastos = pays.filter(p => p.type === 'gasto').reduce((s,p) => s + Number(p.amount||0), 0);
  return { ingresos, gastos, utilidad: ingresos - gastos };
}

// ── Helpers CRM Inquilinos (queries sobre pmaState) ──
function pmActiveBookings() {
  const today = new Date().toISOString().slice(0,10);
  return pmaState.bookings.filter(b =>
    ['activo','confirmado','reservada'].includes(b.status)
    && (!b.end_date || b.end_date >= today)
  );
}
function pmExpiringIn(days = 30) {
  const now = new Date();
  const limit = new Date(now); limit.setDate(limit.getDate() + days);
  return pmActiveBookings().filter(b => {
    if (!b.end_date) return false;
    const end = new Date(b.end_date);
    return end >= now && end <= limit;
  });
}
// "Por ingresar": reservas confirmadas cuyo check_in es a futuro (aún no activas).
function pmUpcomingBookings() {
  const today = new Date().toISOString().slice(0,10);
  return pmaState.bookings.filter(b => ['confirmado','reservada'].includes(b.status) && b.start_date && b.start_date > today);
}
function pmLateBookings() {
  // ATRASADO = balance (deuda >0 tras guard) ya VENCIDO según el día del
  // inquilino (incluye mes en curso). Un pago que cubrió el mes (deuda ≤ 0)
  // jamás aparece acá aunque haya entrado tarde.
  const lateTenants = new Set();
  for (const p of pmaState.payments) {
    if (p.type !== 'ingreso' || !p.tenant_id) continue;
    if (pmPayStatus(p).key === 'atrasado') lateTenants.add(p.tenant_id);
  }
  return pmActiveBookings().filter(b => b.tenant_id && lateTenants.has(b.tenant_id));
}
function pmLastPaymentOf(bookingId) {
  const b = pmaState.bookings.find(x => x.id === bookingId);
  const pays = pmaState.payments.filter(p =>
    p.type === 'ingreso' && p.paid_at &&
    (p.booking_id === bookingId || (b && b.tenant_id && p.tenant_id === b.tenant_id))
  ).sort((a,c) => (c.paid_at||'').localeCompare(a.paid_at||''));
  return pays[0] || null;
}

// ════════════════════════════════════════════════════════════════
// LAUNCHER
// ════════════════════════════════════════════════════════════════
function openPmSystem() {
  pmaState.tab = 'dashboard';   // landing CEO
  pmaState.selectedPropertyId = null;
  pmEnsureModalNav();
  openModal('🏠 Property Management · Rental Profits', '<div id="pm-root" style="min-height:60vh;">Cargando…</div>');
  // Ensanchar modal
  setTimeout(() => {
    const md = document.querySelector('#modal > div');
    if (md) { md.classList.remove('max-w-3xl'); md.classList.add('max-w-7xl'); }
  }, 50);
  pmInjectTheme();
  pmLoadAll();
}
window.openPmSystem = openPmSystem;

// ════════════════════════════════════════════════════════════════
// 🎨 TEMA (diseño nuevo dentro de PM). SOLO ESTILOS — no toca lógica/markup/datos.
//   Cubre TODA la paleta Tailwind que usa pm-main + clases propias + estilos inline
//   del calendario. Se sincroniza con el tema del OS vía html[data-osreskin].
// ════════════════════════════════════════════════════════════════
function pmInjectTheme() {
  if (window.posInjectDesignSystem) posInjectDesignSystem(); // ADN del OS (sistema de diseño compartido)
  if (document.getElementById('pm-theme-css')) return;
  const D = 'html[data-osreskin="dark"] #pm-root';
  const st = document.createElement('style'); st.id = 'pm-theme-css';
  st.textContent = `
  /* #13 sidebar (sub-nav vertical) — patrón unificado con Fix & Flip */
  #pm-root .pm-nav{width:190px;position:sticky;top:0}
  #pm-root .pm-navitem-active{background:rgba(37,99,235,.1);color:#2563eb !important;box-shadow:inset 3px 0 0 #2563eb} /* light canon 12-jul */
  html[data-osreskin="dark"] #pm-root .pm-navitem-active{background:rgba(69,227,198,.14);color:#45e3c6 !important;box-shadow:inset 3px 0 0 #45e3c6}
  html[data-osreskin="dark"] #pm-root .pm-navitem:hover{background:rgba(255,255,255,.05) !important;color:#e7ecf5 !important}
  @media (max-width:820px){#pm-root .pm-shell{flex-direction:column}#pm-root .pm-nav{width:100% !important;flex-direction:row !important;overflow-x:auto;position:static}}
  /* Solo lo específico de PM que el diseño compartido no cubre: clases propias + calendario inline */
  ${D} .pm-filter-select,${D} .pm-filter-select:hover{background:rgba(255,255,255,.05) !important;border-color:rgba(255,255,255,.14) !important;color:#e7ecf5 !important}
  ${D} .pm-filter-select.has-value{background:rgba(212,175,55,.16) !important;border-color:#d4af37 !important;color:#ecd28f !important}
  ${D} .pm-filter-dropdown label{color:#93a0b6 !important}
  ${D} .pm-clear-filters{border-color:rgba(255,255,255,.14) !important;color:#93a0b6 !important}
  ${D} .pm-resize-handle{border-color:rgba(255,255,255,.1) !important}
  ${D} .pm-split-sidebar{background:rgba(255,255,255,.03) !important}
  /* calendario: estilos inline por atributo (celdas/bordes/labels) */
  ${D} [style*="background:#fafafa"],${D} [style*="background: #fafafa"],${D} [style*="background:#f8fafc"],${D} [style*="background: #f8fafc"],${D} [style*="background:#f1f5f9"]{background:#0d141d !important}
  ${D} [style*="background:#fff"],${D} [style*="background: #fff"],${D} [style*="background:#ffffff"]{background:rgba(255,255,255,.045) !important}
  ${D} [style*="solid #f1f5f9"]{border-color:rgba(255,255,255,.07) !important}
  ${D} [style*="solid #e2e8f0"],${D} [style*="solid #cbd5e1"]{border-color:rgba(255,255,255,.1) !important}
  ${D} [style*="color:#1e293b"],${D} [style*="color: #1e293b"],${D} [style*="color:#334155"],${D} [style*="color:#475569"],${D} [style*="color:#0f172a"]{color:#e7ecf5 !important}
  ${D} [style*="color:#64748b"],${D} [style*="color:#94a3b8"]{color:#93a0b6 !important}
  ${D} [style*="color:#000"],${D} [style*="color: #000"],${D} [style*="color:black"],${D} [style*="color:#111"],${D} [style*="color:#020617"]{color:#e7ecf5 !important} /* ola 3: texto negro sobre vidrio */
  ${D} [style*="background:white"],${D} [style*="background-color:#fff"],${D} [style*="background-color: #fff"]{background:rgba(255,255,255,.045) !important}
  /* barras de reserva (gradientes por tipo) y marcador HOY se conservan tal cual */
  html[data-osreskin="light"] #pm-root .pm-filter-select.has-value{background:#fdf8e7 !important}
  `;
  document.head.appendChild(st);
}
window.pmInjectTheme = pmInjectTheme;

// ════════════════════════════════════════════════════════════════
// Navegación jerárquica del modal: ESC / X / backdrop
//   - En vista detalle (propiedad/inquilino/unidad/booking) → volver al listado
//   - En listado → cerrar SOLO el modal (vuelve al dashboard de Rentas)
//   - NUNCA cierra la sesión (closeModal solo oculta el modal)
// ════════════════════════════════════════════════════════════════
function pmIsActive() {
  const m = document.getElementById('modal');
  return !!(m && !m.classList.contains('hidden') && document.getElementById('pm-root'));
}
function pmCanGoBack() {
  return !!(pmaState.ceoDetailKey
    || (pmaState.tab === 'properties' && pmaState.selectedPropertyId)
    || (pmaState.tab === 'tenants' && pmaState.tenantDetailId)
    || (pmaState.tab === 'calendar' && (pmaState.calendarSelectedUnitId || pmaState.calendarSelectedBookingId)));
}
function pmGoBack() {
  if (pmaState.ceoDetailKey) { pmaState.ceoDetailKey = null; pmRender(); return true; }
  if (pmaState.tab === 'properties' && pmaState.selectedPropertyId) { pmaState.selectedPropertyId = null; pmRender(); return true; }
  if (pmaState.tab === 'tenants' && pmaState.tenantDetailId) { pmaState.tenantDetailId = null; pmRender(); return true; }
  if (pmaState.tab === 'calendar' && pmaState.calendarSelectedBookingId) { pmaState.calendarSelectedBookingId = null; pmRender(); return true; }
  if (pmaState.tab === 'calendar' && pmaState.calendarSelectedUnitId) { pmaState.calendarSelectedUnitId = null; pmRender(); return true; }
  return false;
}
window.pmGoBack = pmGoBack;
function pmEnsureModalNav() {
  if (window.__pmModalNavInit) return;
  window.__pmModalNavInit = true;
  const intercept = (e) => {
    if (!pmIsActive()) return;                       // solo cuando el PM está visible
    if (document.getElementById('ui-confirm-overlay') || document.getElementById('ui-prompt-overlay')) return;
    if (pmCanGoBack()) { e.preventDefault(); e.stopImmediatePropagation(); pmGoBack(); }
    // si no hay a dónde volver → dejar pasar: closeModal() cierra el modal (→ dashboard)
  };
  // Capture-phase: corre ANTES de los handlers de app.js (que llaman closeModal()).
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') intercept(e); }, true);
  document.addEventListener('click', (e) => {
    if (!pmIsActive()) return;
    const modal = document.getElementById('modal');
    const onX = e.target.closest && e.target.closest('#modal-close-x');
    if (onX || e.target === modal) intercept(e);     // X o click en backdrop
  }, true);
}

// Breadcrumb clickeable: Rentas › Property Mgmt › [Tab] › [Detalle]
function pmTabLabel(t) {
  return ({ dashboard: 'Resumen', properties: 'Propiedades', calendar: 'Calendario', bookings: 'Reservas',
    tenants: 'Inquilinos', payments: 'Pagos', expenses: 'Gastos', operations: 'Operación', finance: 'Finanzas' })[t] || t;
}
function pmBreadcrumb() {
  const parts = [
    { label: 'Rentas', onclick: 'closeModal()' },
    { label: 'Property Mgmt', onclick: "pmSetTab('dashboard')" }
  ];
  if (pmaState.tab && pmaState.tab !== 'dashboard') parts.push({ label: pmTabLabel(pmaState.tab), onclick: `pmSetTab('${pmaState.tab}')` });
  let detail = null;
  if (pmaState.tab === 'properties' && pmaState.selectedPropertyId) detail = pmPropertyName(pmaState.selectedPropertyId);
  else if (pmaState.tab === 'tenants' && pmaState.tenantDetailId) detail = pmTenantName(pmaState.tenantDetailId);
  else if (pmaState.tab === 'calendar' && pmaState.calendarSelectedUnitId) { const u = pmaState.units.find(x => x.id === pmaState.calendarSelectedUnitId); detail = u ? (u.name || u.code) : 'Unidad'; }
  if (detail) parts.push({ label: detail, current: true });
  return `<nav class="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2 flex-wrap">
    ${parts.map((p, i) => {
      const sep = i > 0 ? '<span class="text-slate-300">›</span>' : '';
      const txt = (p.label || '').replace(/</g, '&lt;').slice(0, 32);
      return (i === parts.length - 1)
        ? `${sep}<span class="font-bold text-slate-800">${txt}</span>`
        : `${sep}<button onclick="${p.onclick}" class="hover:text-[#b8941f] hover:underline">${txt}</button>`;
    }).join(' ')}
  </nav>`;
}

// ════════════════════════════════════════════════════════════════
// RENDER ROOT — orquesta el tab activo
// ════════════════════════════════════════════════════════════════
function pmRender() {
  const root = document.getElementById('pm-root');
  if (!root) return;
  pmEnsureResizerInfra();
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
      ${pmBreadcrumb()}
      ${pmRenderAlertsBar()}
      <!-- Layout: sidebar (sub-nav vertical) + contenido — patrón unificado con Fix & Flip (#13) -->
      <div class="pm-shell flex gap-4 items-start">
        <nav class="pm-nav shrink-0 flex flex-col gap-1">
          ${[
            ['dashboard','Resumen', ''],
            ['properties','🏘️ Propiedades', pmaState.properties.length],
            ['calendar','📅 Calendario', ''],
            ['bookings','📋 Reservas', pmaState.bookings.length],
            ['tenants','👥 Inquilinos', pmActiveBookings().length],
            ['payments','💵 Pagos', ''],
            ['expenses','📤 Gastos', ''],
            ['operations','🛠 Operación', ''],
            ['finance','💰 Finanzas', '']
          ].map(([k, label, count]) => `
            <button onclick="pmSetTab('${k}')" class="pm-navitem text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-between gap-2 whitespace-nowrap ${pmaState.tab===k?'pm-navitem-active':'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}">
              <span>${label}</span>${count!==''?`<span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">${count}</span>`:''}
            </button>
          `).join('')}
        </nav>
        <div class="flex-1 min-w-0 overflow-y-auto" style="max-height:80vh;">
        ${pmaState.tab === 'dashboard'  ? pmRenderDashboard() : ''}
        ${pmaState.tab === 'properties' ? (pmaState.selectedPropertyId ? pmRenderPropertyDetail() : pmRenderPropertiesList()) : ''}
        ${pmaState.tab === 'calendar'   ? pmRenderCalendar() : ''}
        ${pmaState.tab === 'bookings'   ? pmRenderBookings() : ''}
        ${pmaState.tab === 'tenants'    ? (pmaState.tenantDetailId ? pmRenderTenantDetail() : pmRenderTenants()) : ''}
        ${pmaState.tab === 'payments'   ? pmRenderPayments() : ''}
        ${pmaState.tab === 'expenses'   ? pmRenderExpenses() : ''}
        ${pmaState.tab === 'operations' ? pmRenderOperations() : ''}
        ${pmaState.tab === 'finance'    ? pmRenderFinance() : ''}
      </div>
      </div>
    </div>
    ${pmaState.ceoDetailKey ? pmRenderCeoDetailOverlay(pmaState.ceoDetailKey) : ''}
  `;
}
window.pmRender = pmRender;

// ════════════════════════════════════════════════════════════════
// Split panes redimensionables (divisor arrastrable) — vanilla JS, sin libs.
// Listeners globales una sola vez (delegación por .pm-resize-handle). El ancho
// persiste en localStorage y se reaplica inline en cada render del split, así
// sobrevive a los re-render completos de innerHTML que hace pmRender().
// ════════════════════════════════════════════════════════════════
function pmSidebarWidth(key, def = 320) {
  const v = parseInt(localStorage.getItem(key), 10);
  return (v && v >= 240 && v <= 600) ? v : def;
}
// Default responsivo por breakpoint (si no hay ancho guardado)
function pmSidebarDefault() {
  const w = window.innerWidth || 1280;
  if (w < 768) return 320;          // móvil: el CSS lo pone full-width igual
  if (w > 1280) return 360;         // pantallas grandes
  return 280;                       // medianas (768–1280)
}
function pmResizeHandle(targetSel, key, def = 320) {
  return `<div class="pm-resize-handle" data-target="${targetSel}" data-key="${key}" data-default="${def}" title="Arrastrá para ajustar el ancho · doble-click para resetear"></div>`;
}
function pmEnsureResizerInfra() {
  if (window.__pmResizerInit) return;
  window.__pmResizerInit = true;

  const st = document.createElement('style');
  st.id = 'pm-resizer-styles';
  st.textContent = `
    .pm-split{display:flex;align-items:stretch}
    .pm-split-sidebar{min-width:240px;max-width:600px;overflow-x:hidden}
    .pm-split-main{flex:1;min-width:0;overflow-x:auto}
    .pm-resize-handle{width:6px;cursor:col-resize;background:transparent;border-left:1px solid #e2e8f0;transition:background .15s;user-select:none;flex-shrink:0}
    .pm-resize-handle:hover,.pm-resize-handle.is-dragging{background:#d4af37;border-color:#d4af37}
    .pm-ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pm-clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.25}
    .pm-clamp1{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
    .pm-filters-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
    .pm-filter-dropdown{display:flex;flex-direction:column;gap:3px;min-width:148px}
    .pm-filter-dropdown label{font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:700;letter-spacing:.04em}
    .pm-filter-select{padding:7px 10px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;color:#334155;font-size:13px;cursor:pointer;transition:all .15s;max-width:220px}
    .pm-filter-select:hover,.pm-filter-select:focus{border-color:#d4af37;outline:none}
    .pm-filter-select.has-value{background:#fdf8e7;border-color:#d4af37;color:#92710f;font-weight:600}
    .pm-clear-filters{padding:7px 14px;background:transparent;border:1px solid #cbd5e1;border-radius:6px;color:#64748b;cursor:pointer;font-size:12px;font-weight:700;align-self:flex-end;white-space:nowrap}
    .pm-clear-filters:hover{color:#92710f;border-color:#d4af37}
    @media (max-width:767px){
      .pm-split{flex-direction:column}
      .pm-split-sidebar{flex:0 0 auto !important;max-width:none;width:100%;max-height:240px;overflow-y:auto}
      .pm-resize-handle{display:none}
    }`;
  document.head.appendChild(st);

  let dragging = false, startX = 0, startW = 0, sidebarEl = null, handleEl = null, saveKey = null;
  const findSidebar = (h) => { const sel = h.getAttribute('data-target'); return sel ? document.querySelector(sel) : h.previousElementSibling; };
  const begin = (clientX, target) => {
    const handle = target && target.closest ? target.closest('.pm-resize-handle') : null;
    if (!handle) return false;
    const sidebar = findSidebar(handle);
    if (!sidebar) return false;
    dragging = true; startX = clientX; startW = sidebar.offsetWidth;
    sidebarEl = sidebar; handleEl = handle; saveKey = handle.getAttribute('data-key');
    handle.classList.add('is-dragging');
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    return true;
  };
  const move = (clientX) => {
    if (!dragging || !sidebarEl) return;
    const w = Math.max(240, Math.min(600, startW + (clientX - startX)));
    sidebarEl.style.flexBasis = w + 'px';
  };
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (handleEl) handleEl.classList.remove('is-dragging');
    document.body.style.cursor = ''; document.body.style.userSelect = '';
    if (saveKey && sidebarEl) { try { localStorage.setItem(saveKey, String(sidebarEl.offsetWidth)); } catch (e) {} }
    sidebarEl = handleEl = saveKey = null;
  };

  document.addEventListener('mousedown', (e) => { if (begin(e.clientX, e.target)) e.preventDefault(); });
  document.addEventListener('mousemove', (e) => move(e.clientX));
  document.addEventListener('mouseup', end);
  // Touch (mobile/iPad)
  document.addEventListener('touchstart', (e) => { const t = e.touches && e.touches[0]; if (t) begin(t.clientX, e.target); }, { passive: true });
  document.addEventListener('touchmove', (e) => { if (dragging) { const t = e.touches && e.touches[0]; if (t) { move(t.clientX); e.preventDefault(); } } }, { passive: false });
  document.addEventListener('touchend', end);
  document.addEventListener('touchcancel', end);
  // Doble-click en el handle → reset al ancho default
  document.addEventListener('dblclick', (e) => {
    const handle = e.target && e.target.closest ? e.target.closest('.pm-resize-handle') : null;
    if (!handle) return;
    const sidebar = findSidebar(handle);
    const key = handle.getAttribute('data-key');
    const def = parseInt(handle.getAttribute('data-default') || '320', 10);
    if (sidebar) sidebar.style.flexBasis = def + 'px';
    if (key) { try { localStorage.setItem(key, String(def)); } catch (e2) {} }
  });
}
window.pmEnsureResizerInfra = pmEnsureResizerInfra;

function pmSetTab(tab) {
  pmaState.tab = tab;
  pmaState.selectedPropertyId = null;
  pmaState.tenantDetailId = null;
  pmRender();
}
window.pmSetTab = pmSetTab;

// ════════════════════════════════════════════════════════════════
// TAB 0 · DASHBOARD CEO (landing) — pulso del negocio en 30 segundos
// Sobrio (charcoal/blanco/dorado). Verde=positivo, rojo=crítico.
// Todo se computa desde pmaState ya cargado.
// ════════════════════════════════════════════════════════════════
const PM_ES_MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const PM_ES_MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function pmMoney(v){ return posMoney(v); } // #10: formato único compartido
function pmInMonth(iso,y,m){ if(!iso) return false; return String(iso).slice(0,7) === `${y}-${String(m+1).padStart(2,'0')}`; }
// mes de renta (billing) del row x == año/mes dado — misma firma que pmInMonth pero por tag
function pmBillInMonth(x,y,m){ return pmBillYm(x) === `${y}-${String(m+1).padStart(2,'0')}`; }
function pmPayrollForMonth(y,m){
  return (pmaState.payroll||[]).filter(p=>Number(p.year)===y && PM_ES_MONTHS.indexOf((p.month||'').toLowerCase())===m)
    .reduce((s,p)=>s+Number(p.salary||0),0);
}
function pmOccupancyAt(date){
  const active = new Set(pmaState.properties.filter(p=>p.active!==false).map(p=>p.id));
  const units = pmaState.units.filter(u=>active.has(u.property_id));
  // OCUPACIÓN ÚNICA (15-jul): el headline sale de v_ocupacion (capa de KPIs, base rentable 48)
  // — la MISMA cifra que Global y Rentas CC. La regla del dueño queda como fallback sin la
  // vista y para el detalle por casa/cobranza (pmRentableUnitsOf, que no cambia).
  const oc = pmaState.ocupView || null;
  if (oc && +oc.unidades_rentables > 0) {
    return { occupied: +oc.ocupadas, total: +oc.unidades_rentables, pct: +oc.ocupadas / +oc.unidades_rentables, units, fuente: 'v_ocupacion' };
  }
  const total = pmTotalRentableUnits();
  const occ = pmTotalOccupiedRentableUnits();
  return { occupied: occ, total, pct: total?occ/total:0, units };
}
function pmCashflowOf(y,m){
  const pays = pmaState.payments.filter(p=>p.status==='pagado');
  const income = pays.filter(p=>p.type==='ingreso' && pmBillInMonth(p,y,m)).reduce((s,p)=>s+Number(p.amount||0),0);
  const gExp   = pays.filter(p=>p.type==='gasto'   && pmBillInMonth(p,y,m)).reduce((s,p)=>s+Number(p.amount||0),0);
  const payroll = pmPayrollForMonth(y,m);
  return { income, gastos: gExp+payroll, net: income-gExp-payroll };
}
// "Atendido" persiste con timestamp + firma de severidad. Reaparece si pasaron
// >7 días o si la condición empeoró (sig actual > sig guardado).
function pmCeoDismissedMap(){ try{ return JSON.parse(localStorage.getItem('pm_ceo_dismissed_v2')||'{}'); }catch{ return {}; } }
function pmCeoIsDismissed(key, sig){ const d=pmCeoDismissedMap()[key]; if(!d) return false; if(Date.now()-(d.at||0) > 7*86400000) return false; if(Number(sig||0) > Number(d.sig||0)) return false; return true; }
function pmCeoDismiss(key, sig){ const m=pmCeoDismissedMap(); m[key]={at:Date.now(), sig:Number(sig||0)}; localStorage.setItem('pm_ceo_dismissed_v2', JSON.stringify(m)); pmRender(); }
window.pmCeoDismiss = pmCeoDismiss;
function pmCeoShowDetail(key){ pmaState.ceoDetailKey = key; pmRender(); }
window.pmCeoShowDetail = pmCeoShowDetail;
function pmCeoGoTenant(tenantId){ pmaState.ceoDetailKey=null; pmaState.tab='tenants'; pmaState.tenantDetailId=tenantId; pmRender(); }
window.pmCeoGoTenant = pmCeoGoTenant;

function pmCeoActions(){
  const now=new Date(), actions=[];
  const activeProps = pmaState.properties.filter(p=>p.active!==false);
  const activePropIds = new Set(activeProps.map(p=>p.id));
  const activeBookings = pmaState.bookings.filter(b=>['activo','confirmado','reservada'].includes(b.status));
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate()-30);
  const recentPayers = new Set(pmaState.payments.filter(p=>p.type==='ingreso' && p.tenant_id && p.paid_at && new Date(p.paid_at)>=cutoff).map(p=>p.tenant_id));
  const late = activeBookings.filter(b=> b.tenant_id && !(b.start_date && new Date(b.start_date)>cutoff) && !recentPayers.has(b.tenant_id));
  const in30 = new Date(now); in30.setDate(in30.getDate()+30);
  const expiring = activeBookings.filter(b=> b.end_date && new Date(b.end_date)>=now && new Date(b.end_date)<=in30);
  const negProps = activeProps.filter(p=>{ for(let i=1;i<=3;i++){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); const f=pmFinanceOf(p.id,d); if(f.ingresos===0&&f.gastos===0) return false; if(f.utilidad>=0) return false; } return true; });

  const negMonthsOf = (pid) => { let c=0; for(let i=0;i<12;i++){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); const f=pmFinanceOf(pid,d); if(f.ingresos===0&&f.gastos===0) break; if(f.utilidad<0) c++; else break; } return c; };

  if(late.length) actions.push({ sev:'critical', key:'late-tenants', tab:'bookings', sig:late.length, title:`${late.length} inquilino${late.length>1?'s':''} sin pago registrado +30 días`, q:'¿Iniciar proceso de salida o gestionar cobro?' });
  negProps.slice(0,2).forEach(p=> actions.push({ sev:'critical', key:'negpnl-'+p.id, tab:'finance', sig:negMonthsOf(p.id), title:`${p.name}: P&L negativo ${negMonthsOf(p.id)} meses seguidos`, q:'¿Vender / refinanciar / ajustar renta?' }));
  if(expiring.length) actions.push({ sev:'important', key:'expiring-contracts', tab:'bookings', sig:expiring.length, title:`${expiring.length} contrato${expiring.length>1?'s':''} termina${expiring.length>1?'n':''} en 30 días`, q:'Confirmar estrategia: renovar o re-rentar.' });
  pmaState.units.filter(u=>activePropIds.has(u.property_id) && !pmUnitOccupied(u)).map(u=>{
    const bs = pmaState.bookings.filter(b=>b.unit_id===u.id && b.end_date).sort((a,b)=> a.end_date<b.end_date?1:-1);
    const lastEnd = bs[0]?.end_date ? new Date(bs[0].end_date) : null;
    return { u, days: lastEnd ? Math.round((now-lastEnd)/86400000) : null };
  }).filter(x=> x.days===null || x.days>30).slice(0,2).forEach(({u,days})=>
    actions.push({ sev:'important', key:'vacant-'+u.id, tab:'properties', sig:days||999, title:`${pmPropertyName(u.property_id).slice(0,22)} · ${(u.name||u.code||'unidad')} vacía ${days?('hace '+days+'d'):'(sin historial)'}`, q:'¿Bajar precio / cambiar marketing?' }));
  activeProps.map(p=>{ const cur=pmFinanceOf(p.id,new Date(now.getFullYear(),now.getMonth(),1)).utilidad; let s=0; for(let i=1;i<=3;i++) s+=pmFinanceOf(p.id,new Date(now.getFullYear(),now.getMonth()-i,1)).utilidad; return {p,cur,avg:s/3}; })
    .filter(x=> x.cur>0 && x.avg>0 && x.cur>x.avg*1.2).sort((a,b)=>b.cur-a.cur).slice(0,1)
    .forEach(({p,cur})=> actions.push({ sev:'opportunity', key:'oppy-'+p.id, tab:'finance', sig:0, title:`${p.name} rindió ${pmMoney(cur)} este mes (sobre su promedio)`, q:'¿Replicar estrategia en otras casas?' }));

  const ord={critical:0,important:1,opportunity:2};
  return { all: actions.sort((a,b)=>ord[a.sev]-ord[b.sev]).filter(a=>!pmCeoIsDismissed(a.key, a.sig)).slice(0,5), lateCount:late.length, expiringCount:expiring.length, negCount:negProps.length };
}

// ── Detalle expandible de alertas CEO (overlay accionable, ESC-cerrable) ──
function pmRenderCeoDetailOverlay(key) {
  let title = 'Detalle', body = '';
  if (key === 'late-tenants') { title = '🔴 Inquilinos sin pago +30 días'; body = pmCeoBodyLate(); }
  else if (key === 'expiring-contracts') { title = '📋 Contratos que terminan en 30 días'; body = pmCeoBodyExpiring(); }
  else if (key.startsWith('negpnl-')) { const p = pmaState.properties.find(x=>x.id===key.slice(7)); title = '📉 P&L negativo · ' + (p?.name||''); body = pmCeoBodyNegPnl(key.slice(7)); }
  else if (key.startsWith('vacant-')) { const u = pmaState.units.find(x=>x.id===key.slice(7)); title = '🏚 Unidad vacía · ' + (u?.code||u?.name||''); body = pmCeoBodyVacant(key.slice(7)); }
  else if (key.startsWith('oppy-')) { const p = pmaState.properties.find(x=>x.id===key.slice(5)); title = '🏆 Oportunidad · ' + (p?.name||''); body = `<div class="p-4 text-sm text-slate-600">Esta casa rinde por encima de su promedio. Revisá su estrategia (precio, plataforma, tipo de inquilino) para replicarla.<div class="mt-3"><button onclick="pmaState.ceoDetailKey=null;pmSetTab('finance')" class="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded">Ir a Finanzas →</button></div></div>`; }
  return `
    <div onclick="pmaState.ceoDetailKey=null;pmRender()" style="position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:60;display:flex;align-items:center;justify-content:center;padding:20px" class="pm-fade">
      <div onclick="event.stopPropagation()" class="bg-white rounded-xl shadow-2xl w-full" style="max-width:760px;max-height:82vh;display:flex;flex-direction:column">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200" style="background:#1e293b">
          <span class="text-sm font-bold text-white">${title}</span>
          <button onclick="pmaState.ceoDetailKey=null;pmRender()" class="text-slate-300 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div class="flex-1 overflow-y-auto p-3">${body}</div>
        <div class="px-4 py-2 border-t border-slate-200 text-right">
          <button onclick="pmaState.ceoDetailKey=null;pmRender()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-1.5 rounded">Cerrar</button>
        </div>
      </div>
    </div>`;
}
function pmCeoDaysSincePay(b) {
  const lp = pmLastPaymentOf(b.id);
  if (!lp || !lp.paid_at) return null;
  return Math.floor((new Date() - new Date(lp.paid_at+'T00:00:00')) / 86400000);
}
function pmCeoBodyLate() {
  const rows = pmLateBookings();
  if (!rows.length) return '<div class="text-center py-8 text-slate-400 text-sm">✓ Sin inquilinos atrasados.</div>';
  return `<table class="w-full text-xs"><thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold"><tr>
    <th class="px-2 py-2 text-left">Inquilino</th><th class="px-2 py-2 text-left">Casa · Unidad</th><th class="px-2 py-2 text-left">Últ. pago</th><th class="px-2 py-2 text-right">Días</th><th class="px-2 py-2 text-right">Debe</th><th class="px-2 py-2 text-center">Acciones</th>
  </tr></thead><tbody>${rows.map(b => {
    const t = pmaState.tenants.find(x=>x.id===b.tenant_id); const u = pmaState.units.find(x=>x.id===b.unit_id);
    const lp = pmLastPaymentOf(b.id); const days = pmCeoDaysSincePay(b); const phone=(t?.phone||'').replace(/\D/g,'');
    return `<tr class="border-t border-slate-100">
      <td class="px-2 py-2"><button onclick="pmCeoGoTenant('${b.tenant_id}')" class="font-bold text-slate-800 hover:text-[#b8941f] hover:underline text-left">${pmTenantName(b.tenant_id).replace(/</g,'&lt;').slice(0,20)}</button></td>
      <td class="px-2 py-2 text-slate-600">${pmPropertyName(b.property_id).replace(/</g,'&lt;').slice(0,14)} · ${(u?.code||u?.name||'').replace(/</g,'&lt;')}</td>
      <td class="px-2 py-2 text-slate-500">${lp?.paid_at||'nunca'}</td>
      <td class="px-2 py-2 text-right font-bold text-red-600">${days!=null?days+'d':'+30'}</td>
      <td class="px-2 py-2 text-right text-slate-700 font-bold" title="Σ balance >0 en períodos cerrados (lo que realmente debe, no la renta)">$${pmTenantDebt(b.tenant_id).toLocaleString()}</td>
      <td class="px-2 py-2 text-center whitespace-nowrap">
        <button onclick="pmMarkPayment('${b.id}')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-1 rounded">Marcar pago</button>
        ${phone?`<a href="https://wa.me/${phone}" target="_blank" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-1.5 py-1 rounded text-xs inline-block">💬</a>`:''}
        <button onclick="pmEditBooking('${b.id}')" title="Iniciar proceso de salida" class="bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-1 rounded">Salida</button>
      </td>
    </tr>`;
  }).join('')}</tbody></table>`;
}
function pmCeoBodyExpiring() {
  const rows = pmExpiringIn(30).slice().sort((a,b)=>(a.end_date||'').localeCompare(b.end_date||''));
  if (!rows.length) return '<div class="text-center py-8 text-slate-400 text-sm">✓ Sin contratos por vencer.</div>';
  const today = new Date();
  return `<table class="w-full text-xs"><thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold"><tr>
    <th class="px-2 py-2 text-left">Inquilino</th><th class="px-2 py-2 text-left">Casa · Unidad</th><th class="px-2 py-2 text-left">Fin</th><th class="px-2 py-2 text-right">Días</th><th class="px-2 py-2 text-center">Acciones</th>
  </tr></thead><tbody>${rows.map(b => {
    const u = pmaState.units.find(x=>x.id===b.unit_id); const days = Math.floor((new Date(b.end_date)-today)/86400000);
    return `<tr class="border-t border-slate-100">
      <td class="px-2 py-2"><button onclick="pmCeoGoTenant('${b.tenant_id}')" class="font-bold text-slate-800 hover:text-[#b8941f] hover:underline">${pmTenantName(b.tenant_id).replace(/</g,'&lt;').slice(0,20)}</button></td>
      <td class="px-2 py-2 text-slate-600">${pmPropertyName(b.property_id).replace(/</g,'&lt;').slice(0,14)} · ${(u?.code||u?.name||'').replace(/</g,'&lt;')}</td>
      <td class="px-2 py-2 text-slate-500">${b.end_date}</td>
      <td class="px-2 py-2 text-right font-bold ${days<=7?'text-red-600':'text-amber-600'}">${days}d</td>
      <td class="px-2 py-2 text-center whitespace-nowrap">
        <button onclick="pmCeoRenew('${b.id}')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-1 rounded">Renovar</button>
        <button onclick="pmEditBooking('${b.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-1 rounded">Marcar saliendo</button>
      </td>
    </tr>`;
  }).join('')}</tbody></table>`;
}
async function pmCeoRenew(bookingId) {
  const b = pmaState.bookings.find(x=>x.id===bookingId); if (!b) return;
  const nd = prompt('Nueva fecha fin del contrato (YYYY-MM-DD):', b.end_date||'');
  if (!nd) return;
  const r = await pmExecQuery(sb.from('pm_bookings').update({ end_date: nd, status: 'activo' }).eq('id', bookingId).select(), 'Renovar contrato');
  if (!r) return;
  await pmAfterCrud();
}
window.pmCeoRenew = pmCeoRenew;
function pmCeoBodyNegPnl(pid) {
  const p = pmaState.properties.find(x=>x.id===pid); if (!p) return '';
  const now = new Date(); const rowsHtml = [];
  for (let i=0;i<12;i++) { const d=new Date(now.getFullYear(),now.getMonth()-i,1); const f=pmFinanceOf(pid,d);
    rowsHtml.push(`<tr class="border-t border-slate-100 ${f.utilidad<0?'bg-red-50':''}"><td class="px-2 py-1.5 text-slate-600">${PM_ES_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}</td><td class="px-2 py-1.5 text-right text-emerald-700">${pmMoney(f.ingresos)}</td><td class="px-2 py-1.5 text-right text-red-600">${pmMoney(f.gastos)}</td><td class="px-2 py-1.5 text-right font-bold ${f.utilidad>=0?'text-emerald-700':'text-red-600'}">${pmMoney(f.utilidad)}</td></tr>`); }
  const act = pmaState.bookings.filter(b=>b.property_id===pid && pmActiveBookingOf(b.unit_id));
  const contractual = act.reduce((s,b)=>s+Number(b.rent_amount||0),0);
  return `
    <div class="space-y-3">
      <div class="text-[11px] text-slate-500">Inquilinos activos: <strong>${act.length}</strong> · monto contractual: <strong class="text-emerald-700">${pmMoney(contractual)}/mes</strong></div>
      <table class="w-full text-xs"><thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold"><tr><th class="px-2 py-2 text-left">Mes</th><th class="px-2 py-2 text-right">Ingresos</th><th class="px-2 py-2 text-right">Gastos</th><th class="px-2 py-2 text-right">Utilidad</th></tr></thead><tbody>${rowsHtml.join('')}</tbody></table>
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900"><strong>Acciones sugeridas:</strong> ajustar renta al mercado · renegociar/reducir gastos fijos · evaluar refinanciar · considerar venta si el déficit persiste.</div>
      <button onclick="pmaState.ceoDetailKey=null;pmaState.tab='properties';pmSelectProperty('${pid}')" class="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded">Ver detalle de la casa →</button>
    </div>`;
}
function pmCeoBodyVacant(uid) {
  const u = pmaState.units.find(x=>x.id===uid); if (!u) return '';
  const past = pmaState.bookings.filter(b=>b.unit_id===uid && b.end_date).sort((a,b)=>(b.end_date||'').localeCompare(a.end_date||''));
  const rents = past.map(b=>Number(b.rent_amount||0)).filter(Boolean);
  const avgRent = rents.length?Math.round(rents.reduce((a,b)=>a+b,0)/rents.length):0;
  const dv = pmDaysVacant ? pmDaysVacant(u) : null;
  return `
    <div class="space-y-3">
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="bg-slate-50 rounded-lg p-2"><div class="text-[9px] uppercase text-slate-400 font-bold">Días vacía</div><div class="text-lg font-extrabold text-red-600">${dv!=null?dv+'d':'—'}</div></div>
        <div class="bg-slate-50 rounded-lg p-2"><div class="text-[9px] uppercase text-slate-400 font-bold">Renta prom. hist.</div><div class="text-lg font-extrabold text-slate-800">${pmMoney(avgRent)}</div></div>
        <div class="bg-slate-50 rounded-lg p-2"><div class="text-[9px] uppercase text-slate-400 font-bold">Renta objetivo</div><div class="text-lg font-extrabold text-emerald-700">${pmMoney(u.target_rent||0)}</div></div>
      </div>
      <div class="text-[10px] uppercase font-bold text-slate-400">Inquilinos pasados (${past.length})</div>
      <div class="space-y-1">${past.slice(0,8).map(b=>`<div class="flex justify-between text-[11px] border-b border-slate-50 py-1"><span class="text-slate-700">${pmTenantName(b.tenant_id).replace(/</g,'&lt;').slice(0,22)}</span><span class="text-slate-500">${b.start_date||'?'} → ${b.end_date||'?'} · $${Number(b.rent_amount||0).toLocaleString()}</span></div>`).join('')||'<div class="text-xs text-slate-400 italic">Sin historial.</div>'}</div>
      <div class="flex gap-2">
        <button onclick="pmaState.ceoDetailKey=null;pmEditBooking(null,'${uid}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">Crear reserva</button>
        <a href="https://www.airbnb.com/host/homes" target="_blank" class="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded">Listar en Airbnb</a>
        <button onclick="pmMarkMaintenance('${uid}')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded">Mantenimiento</button>
      </div>
    </div>`;
}

function pmTrendSvg(trend){
  const W=620,H=190,padL=12,padR=12,padT=14,padB=24,n=trend.length;
  const max=Math.max(1,...trend.map(t=>Math.max(t.income,t.gastos)));
  const x=i=> padL+(i*(W-padL-padR)/Math.max(1,n-1));
  const yv=v=> H-padB-(v/max)*(H-padT-padB);
  const path=k=> trend.map((t,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${yv(t[k]).toFixed(1)}`).join(' ');
  const area=k=>`${path(k)} L${x(n-1).toFixed(1)},${H-padB} L${x(0).toFixed(1)},${H-padB} Z`;
  const dots=(k,c)=> trend.map((t,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${yv(t[k]).toFixed(1)}" r="2.6" fill="${c}"><title>${t.label} · ${k==='income'?'Ingresos':'Gastos'}: ${pmMoney(t[k])}</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full" style="height:210px">
    <path d="${area('income')}" fill="rgba(5,150,105,.07)"/><path d="${area('gastos')}" fill="rgba(220,38,38,.05)"/>
    <path d="${path('income')}" fill="none" stroke="#059669" stroke-width="2"/><path d="${path('gastos')}" fill="none" stroke="#dc2626" stroke-width="2"/>
    ${dots('income','#059669')}${dots('gastos','#dc2626')}
    ${trend.map((t,i)=>`<text x="${x(i).toFixed(1)}" y="${H-7}" font-size="9" fill="#94a3b8" text-anchor="middle">${t.label}</text>`).join('')}
  </svg>`;
}

function pmRenderDashboard(){
  const now=new Date(), y=now.getFullYear(), m=now.getMonth();
  const occ=pmOccupancyAt(now);
  const occPrev=pmOccupancyAt(new Date(y,m-1,Math.min(now.getDate(),28)));
  // Período financiero = ÚLTIMO MES CERRADO (default unificado); la ocupación sí es de "ahora".
  const fym=pmDefaultYM(), fy=pmYmYear(fym), fm=pmYmMonthIdx(fym);
  const cf=pmCashflowOf(fy,fm), cfPrev=pmCashflowOf(new Date(fy,fm-1,1).getFullYear(),(fm+11)%12);
  // Potencial perdido = SOLO unidades Disponibles (no reservadas ni en mantenimiento).
  const empties=occ.units.filter(u=>pmUnitState(u)==='libre');
  const potentialLost=empties.reduce((s,u)=>s+Number(u.target_rent||0),0);
  const { all:actions, lateCount, expiringCount }=pmCeoActions();
  const trend=[]; for(let i=5;i>=0;i--){ const d=new Date(fy,fm-i,1); const c=pmCashflowOf(d.getFullYear(),d.getMonth()); trend.push({ label:`${PM_ES_MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, income:c.income, gastos:c.gastos, net:c.net }); }
  const t6i=trend.reduce((s,t)=>s+t.income,0), t6g=trend.reduce((s,t)=>s+t.gastos,0);

  // Health
  let health='yellow';
  if(occ.pct>0.85 && cf.net>0 && expiringCount<2 && lateCount<3) health='green';
  else if(occ.pct<0.70 || cf.net<0 || expiringCount>5 || lateCount>5) health='red';
  const HB={ green:['🟢','NEGOCIO SANO','bg-emerald-50 border-emerald-200 text-emerald-900'], yellow:['🟡','ATENCIÓN','bg-amber-50 border-amber-200 text-amber-900'], red:['🔴','ACCIÓN REQUERIDA','bg-red-50 border-red-200 text-red-900'] }[health];

  // Trends KPI
  const occDelta=Math.round((occ.pct-occPrev.pct)*100);
  const netDelta = cfPrev.net!==0 ? Math.round((cf.net-cfPrev.net)/Math.abs(cfPrev.net)*100) : (cf.net>0?100:0);
  const arrow=(d)=> d>0?`<span class="text-emerald-600">↑${Math.abs(d)}</span>`:d<0?`<span class="text-red-600">↓${Math.abs(d)}</span>`:`<span class="text-slate-400">→0</span>`;

  // Quick stats
  const activeProps=pmaState.properties.filter(p=>p.active!==false);
  const activeBookings=pmaState.bookings.filter(b=>['activo','confirmado','reservada'].includes(b.status));
  const activeTenants=new Set(activeBookings.map(b=>b.tenant_id).filter(Boolean)).size;
  const rentableTotal=pmTotalRentableUnits();
  // Renta promedio / unidad = ingresos del mes / unidades rentables del portafolio
  const avgRent=rentableTotal?cf.income/rentableTotal:0;
  let gaps=[]; pmaState.units.forEach(u=>{ const bs=pmaState.bookings.filter(b=>b.unit_id===u.id && b.start_date).sort((a,b)=>a.start_date<b.start_date?-1:1); for(let i=1;i<bs.length;i++){ const pe=bs[i-1].end_date, ns=bs[i].start_date; if(pe&&ns&&ns>pe){ const g=Math.round((new Date(ns)-new Date(pe))/86400000); if(g>0&&g<400) gaps.push(g); } } });
  const avgFill=pmAvgVacancyDays();

  const SEV={ critical:['border-l-red-500','bg-red-50','text-red-700','CRÍTICO'], important:['border-l-amber-500','bg-amber-50','text-amber-700','IMPORTANTE'], opportunity:['border-l-emerald-500','bg-emerald-50','text-emerald-700','OPORTUNIDAD'] };

  return `
  <style>@keyframes pmfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.pm-fade{animation:pmfade .4s ease both}</style>
  <div class="space-y-4 p-1 pm-fade" style="font-family:Inter,system-ui,sans-serif">

    <!-- 1 · HEALTH -->
    <div class="flex items-center justify-between flex-wrap gap-2 border ${HB[2]} rounded-xl px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="text-2xl">${HB[0]}</span>
        <div>
          <div class="text-sm font-extrabold tracking-wide">${HB[1]}</div>
          <div class="text-xs opacity-80">${occ.occupied}/${occ.total} unidades ocupadas · ${pmMoney(cf.net)} cashflow neto este mes</div>
        </div>
      </div>
      ${pmSyncStatusLabel()}
    </div>

    ${(pmaState.dataWarnings||[]).length ? `<button onclick="pmSetTab('operations');pmaState.opsSubTab='datawarn';pmRender()" class="w-full text-left bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 rounded-xl px-4 py-3 flex items-center justify-between transition">
      <div class="flex items-center gap-3"><span class="text-2xl">🔎</span><div><div class="text-sm font-extrabold text-amber-900">${pmaState.dataWarnings.length} inconsistencia${pmaState.dataWarnings.length>1?'s':''} de datos</div><div class="text-xs text-amber-700">Airtable tiene datos contradictorios — revisá y corregí</div></div></div>
      <span class="text-amber-800 font-bold text-sm">Ver →</span>
    </button>` : ''}

    <!-- 2 · KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <button onclick="pmSetTab('properties')" class="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition shadow-sm">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ocupación</div>
        <div class="text-3xl font-extrabold text-slate-900 mt-1">${Math.round(occ.pct*100)}%</div>
        <div class="text-xs text-slate-500 mt-0.5">${occ.occupied} de ${occ.total} unidades</div>
        <div class="text-[11px] font-bold mt-1">${arrow(occDelta)}<span class="text-slate-400 font-normal"> pp vs mes pasado</span></div>
      </button>
      <button onclick="pmSetTab('finance')" class="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition shadow-sm">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cashflow · ${pmYmLabelC(fym)}</div>
        <div class="text-3xl font-extrabold mt-1 ${cf.net>=0?'text-emerald-700':'text-red-700'}">${pmMoney(cf.net)}</div>
        <div class="text-xs text-slate-500 mt-0.5">Ing ${pmMoney(cf.income)} − Gas ${pmMoney(cf.gastos)}</div>
        <div class="text-[11px] font-bold mt-1">${arrow(netDelta)}<span class="text-slate-400 font-normal">% vs mes pasado</span></div>
        <div class="mt-2">${pmMonthBadge(fym)}</div>
      </button>
      <button onclick="pmShowFreeUnits()" class="text-left bg-white border-2 hover:shadow-md rounded-xl p-4 transition shadow-sm" style="border-color:#d4af37">
        <div class="text-[10px] uppercase font-bold tracking-wider" style="color:#b8941f">Unidades libres ahora</div>
        <div class="text-3xl font-extrabold text-slate-900 mt-1">${pmFreeRentableUnits()}</div>
        <div class="text-xs text-slate-500 mt-0.5">Potencial perdido: <span class="font-bold text-red-600">${pmMoney(potentialLost)}/mes</span></div>
        <div class="text-[11px] font-bold mt-1" style="color:#b8941f">Ver lista →</div>
      </button>
      <button onclick="document.getElementById('pm-ceo-actions')?.scrollIntoView({behavior:'smooth'})" class="text-left bg-slate-900 text-white hover:bg-slate-800 rounded-xl p-4 transition shadow-sm">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Decisiones tuyas</div>
        <div class="text-3xl font-extrabold mt-1" style="color:#d4af37">${actions.length}</div>
        <div class="text-xs text-slate-300 mt-0.5">requieren tu input</div>
      </button>
    </div>

    <!-- 3 · TREND -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div class="flex items-center justify-between mb-1">
        <div class="text-sm font-bold text-slate-800">Ingresos vs Gastos · 6 meses</div>
        <div class="flex gap-3 text-[11px]"><span class="text-emerald-600 font-bold">● Ingresos</span><span class="text-red-600 font-bold">● Gastos</span></div>
      </div>
      ${pmTrendSvg(trend)}
      <div class="text-xs text-slate-500 text-center mt-1">Últimos 6 meses: <span class="text-emerald-700 font-bold">${pmMoney(t6i)}</span> ingresos · <span class="text-red-700 font-bold">${pmMoney(t6g)}</span> gastos · <span class="font-bold ${t6i-t6g>=0?'text-emerald-700':'text-red-700'}">${pmMoney(t6i-t6g)}</span> neto</div>
    </div>

    <!-- 4 · ACCIONES CEO -->
    <div id="pm-ceo-actions" class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div class="text-sm font-bold text-slate-800 mb-2">Requiere tu atención <span class="text-[11px] font-normal text-slate-400">— decisiones, no operación</span></div>
      ${actions.length ? `<div class="space-y-2">${actions.map(a=>{ const s=SEV[a.sev]; return `
        <div class="flex items-start gap-3 border-l-4 ${s[0]} ${s[1]} rounded-r-lg pl-3 pr-2 py-2">
          <div class="flex-1 min-w-0">
            <div class="text-[9px] uppercase font-extrabold ${s[2]} tracking-wider">${s[3]}</div>
            <div class="text-sm font-semibold text-slate-800 leading-snug">${a.title.replace(/</g,'&lt;')}</div>
            <div class="text-xs text-slate-500">${a.q}</div>
          </div>
          <div class="flex flex-col gap-1 flex-shrink-0">
            <button onclick="pmCeoShowDetail('${a.key}')" class="text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded whitespace-nowrap" style="border:1px solid #d4af37">Ver detalles</button>
            <button onclick="pmCeoDismiss('${a.key}', ${a.sig||0})" class="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-0.5 whitespace-nowrap">✓ Atendido</button>
          </div>
        </div>`; }).join('')}</div>`
        : `<div class="text-center py-6 text-slate-400 text-sm">✓ Nada requiere tu decisión ahora mismo.</div>`}
    </div>

    <!-- 5 · QUICK STATS -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      ${[
        ['Propiedades activas', activeProps.length],
        ['Unidades rentables', rentableTotal],
        ['Inquilinos activos', activeTenants],
        ['Renta promedio / unidad', pmMoney(avgRent)],
        ['Días prom. para llenar', avgFill!==null?avgFill+' días':'—']
      ].map(([l,v])=>`<div class="bg-slate-50 border border-slate-200 rounded-xl p-3"><div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${l}</div><div class="text-xl font-extrabold text-slate-900 mt-1">${v}</div></div>`).join('')}
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// TAB 1 · PROPIEDADES (lista)
// ════════════════════════════════════════════════════════════════
function pmRenderPropertiesList() {
  const props = pmaState.properties;
  pmaState.expandedProperties = pmaState.expandedProperties || new Set();
  const view = pmaState.propsView || 'list';
  const vb = (k,l) => `<button onclick="pmaState.propsView='${k}';pmRender()" class="px-3 py-1 rounded-full text-[11px] font-bold ${view===k?'bg-slate-900 text-white':'text-slate-500 hover:text-slate-900'}">${l}</button>`;
  return `
    <div class="space-y-3 p-1">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center bg-slate-100 rounded-full p-0.5">${vb('list','🏘️ Lista')}${vb('availability','🟢 Disponibilidad')}</div>
        <div class="flex items-center gap-2">
          ${pmSyncStatusLabel()}
          <button onclick="pmToggleArchived()" class="text-xs font-bold px-3 py-1.5 rounded ${pmaState.showArchived?'bg-slate-800 text-white':'bg-slate-100 hover:bg-slate-200 text-slate-700'}" title="Mostrar/ocultar registros archivados (ya no están en Airtable)">📦 ${pmaState.showArchived?'Ocultar':'Mostrar'} archivados</button>
          <button onclick="pmOpenAirtableImport()" class="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold px-3 py-1.5 rounded">🔄 Sync Airtable</button>
          <button onclick="pmEditProperty(null)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded">+ Nueva Propiedad</button>
        </div>
      </div>
      ${view === 'availability' ? pmRenderAvailability() : `
      <div class="text-xs text-slate-500">${(() => { const o = pmPhysOccupancy(); return `${props.length} propiedades · ${o.total} unidades rentables (${o.occupied} ocupadas · ${o.free} libres · ${Math.round(o.pct*100)}% ocupación)`; })()} · ${pmaState.bookings.filter(b => ['activo','confirmado','reservada'].includes(b.status)).length} reservas activas</div>
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
      `}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// Disponibilidad en tiempo real + forecast 60 días
// ════════════════════════════════════════════════════════════════
// ÚNICA fuente del estado de una unidad = campo Estado de Airtable (Unidades.Estado,
// fldPXwcneyhx7GPfB): Ocupada / Disponible / Reservada / Mantenimiento. El badge de
// CADA unidad, los conteos del encabezado y del pie derivan TODOS de acá → coherencia.
function pmUnitState(u) {
  if (!u) return 'libre';
  const today = new Date().toISOString().slice(0,10);
  if (u.is_active === false) return 'inactiva';
  if (u.maintenance_status === 'en_mantenimiento') return 'mantenimiento';
  const s = (u.status || '').toLowerCase();
  if (/mantenim/.test(s))                  return 'mantenimiento';
  if (/ocupad/.test(s))                    return 'ocupada';
  if (/reservad/.test(s))                  return 'reservada';
  if (/disponible|libre|vacante/.test(s))  return 'libre';
  // Sin Estado sincronizado en Airtable → fallback por reservas (no debería pasar).
  if (pmActiveBookingOf(u.id)) return 'ocupada';
  if (pmaState.bookings.some(b => b.unit_id===u.id && ['confirmado','reservada'].includes(b.status) && (b.start_date||'') > today)) return 'reservada';
  return 'libre';
}
// Paleta ÚNICA y coherente en toda la app (ficha, disponibilidad, tiles):
// Ocupada=verde (rinde) · Reservada=azul (próxima) · Disponible=ámbar (a colocar) · Mant=gris.
const PM_UNIT_STATE = {
  ocupada:      { label: 'Ocupada',       dot: '🟢', bg: 'bg-emerald-50 border-emerald-300', txt: 'text-emerald-700', chip: 'bg-emerald-100 text-emerald-800', border: 'border-l-emerald-500', dotc: 'bg-emerald-500', hex: '#10b981' },
  reservada:    { label: 'Reservada',     dot: '🔵', bg: 'bg-blue-50 border-blue-300',       txt: 'text-blue-700',    chip: 'bg-blue-100 text-blue-800',       border: 'border-l-blue-500',    dotc: 'bg-blue-500',    hex: '#3b82f6' },
  libre:        { label: 'Disponible',    dot: '🟡', bg: 'bg-amber-50 border-amber-300',     txt: 'text-amber-700',   chip: 'bg-amber-100 text-amber-800',     border: 'border-l-amber-500',   dotc: 'bg-amber-500',   hex: '#f59e0b' },
  mantenimiento:{ label: 'Mantenimiento', dot: '⚙️', bg: 'bg-slate-100 border-slate-300',    txt: 'text-slate-600',   chip: 'bg-slate-200 text-slate-700',     border: 'border-l-slate-500',   dotc: 'bg-slate-500',   hex: '#64748b' },
  inactiva:     { label: 'Inactiva',      dot: '⚪', bg: 'bg-slate-50 border-slate-200',      txt: 'text-slate-400',   chip: 'bg-slate-100 text-slate-500',     border: 'border-l-slate-300',   dotc: 'bg-slate-400',   hex: '#94a3b8' },
};
function pmLastBookingOf(unitId) {
  return pmaState.bookings.filter(b => b.unit_id===unitId && b.end_date).sort((a,b)=>(b.end_date||'').localeCompare(a.end_date||''))[0] || null;
}
function pmDaysVacant(u) {
  const last = pmLastBookingOf(u.id);
  if (!last || !last.end_date) return null;
  const d = Math.floor((new Date() - new Date(last.end_date+'T00:00:00'))/86400000);
  return d > 0 ? d : 0;
}
function pmFreeUnitsNow() {
  const activePropIds = new Set(pmaState.properties.filter(p=>p.active!==false).map(p=>p.id));
  return pmaState.units.filter(u => activePropIds.has(u.property_id) && pmUnitState(u)==='libre');
}
// FIX5: días promedio de vacancy = gaps entre reservas consecutivas + vacancy en curso
function pmAvgVacancyDays() {
  const todayISO = new Date().toISOString().slice(0,10);
  const gaps = [];
  pmaState.units.forEach(u => {
    const bs = pmaState.bookings.filter(b => b.unit_id===u.id && b.start_date).sort((a,b)=>(a.start_date||'').localeCompare(b.start_date||''));
    for (let i=1;i<bs.length;i++){ const pe=bs[i-1].end_date, ns=bs[i].start_date; if(pe&&ns&&ns>pe){ const g=Math.round((new Date(ns)-new Date(pe))/86400000); if(g>0&&g<400) gaps.push(g); } }
    const last = bs.filter(b=>b.end_date).sort((a,b)=>(b.end_date||'').localeCompare(a.end_date||''))[0];
    if (last && last.end_date < todayISO && !pmActiveBookingOf(u.id)) { const g=Math.round((new Date(todayISO)-new Date(last.end_date))/86400000); if(g>0&&g<400) gaps.push(g); }
  });
  return gaps.length ? Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length) : null;
}

function pmShowFreeUnits() {
  const free = pmFreeUnitsNow().sort((a,b)=>(pmDaysVacant(b)??0)-(pmDaysVacant(a)??0));
  openModal('🟢 Unidades libres ahora · ' + free.length, `
    <div class="max-h-[65vh] overflow-y-auto">
      ${free.length ? `<table class="w-full text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0"><tr>
          <th class="px-2 py-2 text-left">Casa</th><th class="px-2 py-2 text-left">Unidad</th><th class="px-2 py-2 text-right">Días vacía</th>
          <th class="px-2 py-2 text-right">Renta sug.</th><th class="px-2 py-2 text-right">Última renta</th><th class="px-2 py-2 text-center">Acción</th>
        </tr></thead>
        <tbody>${free.map(u => { const dv = pmDaysVacant(u); const last = pmLastBookingOf(u.id); return `<tr class="border-t border-slate-100">
          <td class="px-2 py-2 text-slate-700">${pmPropertyName(u.property_id).replace(/</g,'&lt;').slice(0,16)}</td>
          <td class="px-2 py-2 font-semibold text-slate-800">${(u.code||u.name||'').replace(/</g,'&lt;')}</td>
          <td class="px-2 py-2 text-right ${dv>30?'text-red-600 font-bold':'text-slate-600'}">${dv!=null?dv+'d':'—'}</td>
          <td class="px-2 py-2 text-right text-emerald-700 font-bold">${u.target_rent?'$'+Number(u.target_rent).toLocaleString():'—'}</td>
          <td class="px-2 py-2 text-right text-slate-500">${last?'$'+Number(last.rent_amount||0).toLocaleString():'—'}</td>
          <td class="px-2 py-2 text-center whitespace-nowrap">
            <button onclick="closeModal();setTimeout(()=>pmEditBooking(null,'${u.id}'),60)" title="Marcar reservada" class="bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-1 rounded">Reservar</button>
            <a href="https://www.airbnb.com/host/homes" target="_blank" title="Listar en Airbnb" class="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-1 rounded inline-block">Airbnb</a>
            <button onclick="pmMarkMaintenance('${u.id}')" title="Marcar mantenimiento" class="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-1 rounded">⚙️</button>
          </td>
        </tr>`; }).join('')}</tbody>
      </table>` : '<div class="text-center py-10 text-slate-400 text-sm">✓ No hay unidades libres ahora mismo.</div>'}
    </div>`);
}
window.pmShowFreeUnits = pmShowFreeUnits;

async function pmMarkMaintenance(unitId) {
  const u = pmaState.units.find(x => x.id === unitId);
  if (!u) return;
  const active = pmActiveBookingOf(unitId) || pmaState.bookings.find(b => b.unit_id===unitId && ['confirmado','reservada'].includes(b.status) && b.status!=='cancelado');
  if (active) {
    if (!confirm('⚠️ Esta unidad tiene una reserva ('+pmTenantName(active.tenant_id)+'). Hay que mover esa reserva antes. ¿Abrir "Mover reserva" para reubicarla en una unidad libre?')) return;
    closeModal();
    setTimeout(() => pmMoveBooking(active.id), 80);
    return;
  }
  if (!confirm('¿Marcar '+(u.code||u.name||'la unidad')+' en mantenimiento?')) return;
  const r = await pmExecQuery(sb.from('pm_units').update({ maintenance_status: 'en_mantenimiento' }).eq('id', unitId).select(), 'Marcar mantenimiento');
  if (!r) return;
  if (u) u.maintenance_status = 'en_mantenimiento';
  pmaState.ceoDetailKey = null;
  // Si estamos en el modal de "unidades libres" (openModal), pmAfterCrud reabre el PM;
  // si estamos en el overlay (pm-root presente), basta re-renderizar.
  if (document.getElementById('pm-root')) pmRender(); else await pmAfterCrud();
}
window.pmMarkMaintenance = pmMarkMaintenance;

function pmRenderAvailability() {
  const activeProps = pmaState.properties.filter(p => p.active!==false);
  const activePropIds = new Set(activeProps.map(p=>p.id));
  const stF = pmaState.availFilterState, propF = pmaState.availFilterProperty, typeF = pmaState.availFilterType;
  // Tiles = UNIDADES RENTABLES (casa=1 tile, apto/estudio=1 c/u; habitaciones NO)
  const allTiles = pmRentableTiles(activePropIds);
  let units = allTiles.slice();
  if (propF) units = units.filter(u => u.property_id === propF);
  if (typeF) units = units.filter(u => u.unit_type === typeF);
  if (stF) units = units.filter(u => pmTileState(u) === stF);
  // counts (sobre tiles rentables)
  const counts = { libre:0, reservada:0, ocupada:0, mantenimiento:0 };
  allTiles.forEach(u=>{ const s=pmTileState(u); if(counts[s]!=null) counts[s]++; });

  // Próximamente libres (30d)
  const today = new Date().toISOString().slice(0,10);
  const in30 = new Date(); in30.setDate(in30.getDate()+30); const in30ISO = in30.toISOString().slice(0,10);
  const freeingSoon = pmActiveBookings().filter(b => b.end_date && b.end_date >= today && b.end_date <= in30ISO && activePropIds.has(b.property_id))
    .map(b => { const next = pmaState.bookings.find(x => x.unit_id===b.unit_id && x.id!==b.id && x.status!=='cancelado' && (x.start_date||'') >= (b.end_date||'')); return { b, next }; })
    .sort((a,c) => (a.b.end_date||'').localeCompare(c.b.end_date||''));

  // Forecast 60d (8 semanas): unidades RENTABLES libres por semana (tiles, no habitaciones)
  const rentableTiles = allTiles;
  const tileIdsCache = rentableTiles.map(t => pmTileUnitIds(t));
  const weeks = [];
  for (let w=0; w<9; w++) {
    const ws = new Date(); ws.setDate(ws.getDate() + w*7); ws.setHours(0,0,0,0);
    const we = new Date(ws); we.setDate(we.getDate()+6);
    const wsISO = ws.toISOString().slice(0,10), weISO = we.toISOString().slice(0,10);
    const occ = tileIdsCache.filter(ids => ids.some(id => pmaState.bookings.some(b => b.unit_id===id && b.status!=='cancelado' && b.start_date && (b.start_date <= weISO) && ((b.end_date||'9999') >= wsISO)))).length;
    weeks.push({ label: `${ws.getDate()}/${ws.getMonth()+1}`, free: rentableTiles.length - occ, total: rentableTiles.length });
  }
  const maxFree = Math.max(1, ...weeks.map(w=>w.free));

  const chip = (active, onclick, label, count, color) => `<button onclick="${onclick}" class="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${active?'text-white':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}" style="${active?`background:${color||'#d4af37'};border-color:${color||'#d4af37'}`:''}">${label}${count!=null?` ${count}`:''}</button>`;

  return `
    <div class="space-y-3">
      <!-- Filtros -->
      <div class="flex flex-wrap items-center gap-1.5">
        ${chip(!stF,"pmaState.availFilterState=null;pmRender()",'Todas')}
        ${chip(stF==='ocupada',"pmaState.availFilterState='ocupada';pmRender()",'🟢 Ocupadas',counts.ocupada,'#10b981')}
        ${chip(stF==='reservada',"pmaState.availFilterState='reservada';pmRender()",'🔵 Reservadas',counts.reservada,'#3b82f6')}
        ${chip(stF==='libre',"pmaState.availFilterState='libre';pmRender()",'🟡 Disponibles',counts.libre,'#f59e0b')}
        ${chip(stF==='mantenimiento',"pmaState.availFilterState='mantenimiento';pmRender()",'⚙️ Mant.',counts.mantenimiento,'#64748b')}
        <select onchange="pmaState.availFilterProperty=this.value||null;pmRender()" class="border border-slate-300 rounded px-2 py-1 text-xs ml-1"><option value="">🏠 Todas</option>${activeProps.map(p=>`<option value="${p.id}" ${propF===p.id?'selected':''}>${(p.name||'').replace(/</g,'&lt;')}</option>`).join('')}</select>
        <select onchange="pmaState.availFilterType=this.value||null;pmRender()" class="border border-slate-300 rounded px-2 py-1 text-xs"><option value="">Tipo</option>${['casa_completa','apartamento','estudio','habitacion'].map(t=>`<option value="${t}" ${typeF===t?'selected':''}>${pmUnitTypeLabel(t)}</option>`).join('')}</select>
      </div>

      <!-- Grid -->
      <div class="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-1.5">
        ${units.map(u => { const s=pmTileState(u); const meta=PM_UNIT_STATE[s]||PM_UNIT_STATE.inactiva; const onclick=`pmToggleExpandProperty('${u.property_id}');pmSetTab('properties')`; return `
          <button onclick="${onclick}" title="${pmPropertyName(u.property_id).replace(/"/g,'&quot;')} · ${(u.code||u.name||'').replace(/"/g,'&quot;')} · ${meta.label}" class="border ${meta.bg} rounded-lg p-1.5 text-left hover:shadow-sm transition">
            <div class="text-[13px]">${meta.dot}</div>
            <div class="text-[9px] font-bold ${meta.txt} truncate">${(u.code||u.name||'').replace(/</g,'&lt;').slice(0,12)}</div>
            <div class="text-[8px] text-slate-400 truncate">${pmPropertyName(u.property_id).replace(/</g,'&lt;').slice(0,12)}</div>
          </button>`; }).join('') || '<div class="col-span-full text-xs text-slate-400 italic py-6 text-center">Sin unidades con ese filtro.</div>'}
      </div>

      <!-- Próximamente libres -->
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[11px] uppercase font-bold text-slate-700 tracking-wider mb-2" style="border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:2px">Próximamente libres (30 días) · ${freeingSoon.length}</div>
        ${freeingSoon.length ? `<div class="space-y-1 mt-1">${freeingSoon.map(({b,next}) => { const u=pmaState.units.find(x=>x.id===b.unit_id); const days=Math.floor((new Date(b.end_date)-new Date(today))/86400000); return `
          <div class="flex items-center justify-between gap-2 text-[11px] border-b border-slate-50 py-1.5">
            <div class="min-w-0"><span class="font-bold text-slate-800">${pmPropertyName(b.property_id).replace(/</g,'&lt;').slice(0,16)}</span> · ${(u?.code||u?.name||'').replace(/</g,'&lt;')} <span class="text-slate-400">· sale ${pmTenantName(b.tenant_id).replace(/</g,'&lt;').slice(0,18)}</span></div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="text-slate-500">se libera <strong>${b.end_date}</strong> (${days}d)</span>
              <span class="text-emerald-700 font-bold">$${Number(b.rent_amount||0).toLocaleString()}</span>
              ${next?'<span class="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">✓ ya reservada</span>':'<span class="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">sin reserva</span>'}
            </div>
          </div>`; }).join('')}</div>` : '<div class="text-xs text-slate-400 italic">Ninguna se libera en los próximos 30 días.</div>'}
      </div>

      <!-- Forecast 60d -->
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[11px] uppercase font-bold text-slate-700 tracking-wider mb-3" style="border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:2px">Forecast 60 días · unidades libres por semana</div>
        <div class="flex items-end gap-2 h-32 mt-2">
          ${weeks.map(w => `<div class="flex-1 flex flex-col items-center justify-end gap-1">
            <div class="text-[10px] font-bold text-slate-700">${w.free}</div>
            <div class="w-full rounded-t" style="height:${Math.round(100*w.free/maxFree)}%;min-height:3px;background:#d4af37"></div>
            <div class="text-[8px] text-slate-400">${w.label}</div>
          </div>`).join('')}
        </div>
        <div class="text-[10px] text-slate-400 text-center mt-2">de ${weeks[0]?.total||0} unidades rentables · cada barra = 1 semana</div>
      </div>
    </div>`;
}

// Card expandible inline — estilo RentasPro
function pmRenderPropertyCardInline(p) {
  const expanded = pmaState.expandedProperties.has(p.id);
  // Dedup de units fantasma: dos pm_units activas con mismo code+renta (legacy + nueva del mirror)
  // → conservar UNA, prefiriendo la OCUPADA (luego reservada/activa). Same code + renta DISTINTA
  // = unidades reales distintas (se conservan ambas).
  // INVENTARIO FÍSICO ÚNICO (mismo que el portafolio y v_ocupacion): unidades 'unit-rec…'
  // deduped. Así las filas de la card SUMAN exactamente el conteo de arriba (no diverge).
  const units = pmPhysUnitsOf(p.id);
  // Conteos FÍSICOS por unidad, TODOS desde pmUnitState (= Estado de Airtable) → coherentes
  // con los badges y mutuamente excluyentes. libres = nº Disponible, ocupadas = nº Ocupada, etc.
  const occupiedUnits    = units.filter(u => pmUnitState(u) === 'ocupada');
  const reservedUnits    = units.filter(u => pmUnitState(u) === 'reservada');
  const maintenanceUnits = units.filter(u => pmUnitState(u) === 'mantenimiento');
  const freeUnits = Math.max(0, units.length - occupiedUnits.length - reservedUnits.length - maintenanceUnits.length);
  const potentialMo = units.reduce((s, u) => s + Number(u.target_rent || 0), 0);
  const modelLabel = p.rental_model === 'casa_completa' ? '🏡 Casa Completa'
                   : p.rental_model === 'por_habitaciones' ? '🛏 Habitaciones'
                   : p.rental_model === 'por_unidades' ? '🏘 Unidades'
                   : p.rental_model === 'por_estudios' ? '🎨 Estudios'
                   : p.rental_model === 'por_apartamentos' ? '🏢 Apartamentos'
                   : p.rental_model === 'mixta' ? '🔀 Mixta'
                   : '🔀 Mixto';
  // REGLA DE UNIDADES (única en toda la app): habitaciones de la casa juntas = 1.
  // El label de "unidades" y la ocupación usan el conteo RENTABLE; las habitaciones
  // físicas se muestran como detalle entre paréntesis. Los badges de abajo siguen
  // mostrando el Estado de cada habitación (drill-down).
  const rentN = pmRentableUnitsOf(p.id);
  const rentOcc = pmOccupiedRentableUnitsOf(p.id);
  const rentRes = pmReservedRentableUnitsOf(p.id);
  const rentFree = Math.max(0, rentN - rentOcc - rentRes);
  const physLabel = `${rentN} unid`;
  const _rooms = units.filter(u => u.unit_type === 'habitacion').length;
  const rentNote = _rooms ? ` (incluye ${_rooms} hab)` : '';

  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden ${expanded?'ring-2 ring-emerald-200':''}">
      <!-- Header colapsado -->
      <div class="px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3 flex-wrap" onclick="pmToggleExpandProperty('${p.id}')">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <span class="text-slate-400 text-sm">${expanded?'▼':'▶'}</span>
          <span class="text-2xl">🏠</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <strong class="text-sm text-slate-900 pm-clamp2 pm-property-name" title="${(p.name||'').replace(/"/g,'&quot;')}">${(p.name||'').replace(/</g,'&lt;')}</strong>
              <span class="text-[10px] px-2 py-0.5 rounded uppercase font-bold ${p.active===false?(p.archived_manual?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'):'bg-emerald-100 text-emerald-800'}">${p.active===false?(p.archived_manual?'📦 ARCHIVADA':'INACTIVA'):'ACTIVA'}</span>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap mt-0.5">
              <span>📍 ${(p.address||'').replace(/</g,'&lt;')}</span>
              ${p.zone ? `<span>· ${p.zone}</span>` : ''}
              <span>· 🏘 ${physLabel}${rentNote?`<span class="text-slate-400">${rentNote}</span>`:''}</span>
              ${p.sqft ? `<span>· ${p.sqft} sqft</span>` : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 text-right flex-shrink-0">
          <div class="hidden md:block">
            <div class="text-[9px] uppercase text-slate-500 font-bold">${modelLabel}</div>
            <div class="text-[11px] text-slate-700">
              ${physLabel} · ${rentOcc} ocup · ${rentFree} disp · $${potentialMo.toLocaleString()}/mes
            </div>
          </div>
          <button onclick="event.stopPropagation();pmGenerateWelcomeGuide('${p.id}')" class="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded" title="Generar la Guía de Bienvenida / Check-in en PDF">📄 Guía Check-in</button>
          <button onclick="event.stopPropagation();pmEditProperty('${p.id}')" class="text-slate-400 hover:text-slate-700 p-1" title="Editar">✏️</button>
          ${p.active === false
            ? `<button onclick="event.stopPropagation();pmArchiveProperty('${p.id}', false)" class="text-emerald-600 hover:text-emerald-700 text-[11px] font-bold px-2 py-1 rounded bg-emerald-50" title="Reactivar: vuelve a contar en ocupación y KPIs">↩ Reactivar</button>`
            : `<button onclick="event.stopPropagation();pmArchiveProperty('${p.id}', true)" class="text-slate-400 hover:text-amber-600 p-1" title="Archivar (reversible): deja de contar en ocupación y KPIs; el sync la respeta">📦</button>`}
        </div>
      </div>

      ${expanded ? `
        <div class="border-t border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <!-- ACCIONES: Guía de Bienvenida / Check-in -->
          <div class="flex items-center gap-2 flex-wrap bg-white border border-slate-200 rounded-lg p-2">
            <span class="text-[11px] font-bold text-slate-500 px-1">🏡 Check-in</span>
            <button onclick="pmGenerateWelcomeGuide('${p.id}')" class="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded" title="Generar la Guía de Bienvenida en PDF (WiFi, acceso, reglas)">📄 Generar Guía de Bienvenida</button>
            <button onclick="pmSendWelcomeGuide('${p.id}')" class="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-bold px-2.5 py-1.5 rounded" title="Compartir al huésped por correo o WhatsApp">Compartir ›</button>
            ${(p.wifi_name || p.access_code) ? `<span class="text-[10px] text-slate-400 ml-auto">WiFi: ${(p.wifi_name||'—')} · Acceso: ${(p.access_code||'—')}</span>` : ''}
          </div>
          <!-- TRAZABILIDAD: chips de unidades -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="text-[10px] uppercase font-bold text-slate-700 tracking-wider">● Trazabilidad</div>
              <div class="text-[10px] text-slate-500">${units.filter(u=>u.is_active!==false).length} de ${units.length} activas</div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${units.length ? units.map(u => {
                // Badge = Estado EXACTO de Airtable (pmUnitState). Nada de lógica de reservas acá.
                const st = pmUnitState(u);
                const meta = PM_UNIT_STATE[st] || PM_UNIT_STATE.inactiva;
                const icon = u.unit_type==='casa_completa'?'🏠':u.unit_type==='estudio'?'🎨':u.unit_type==='apartamento'?'🏢':'🛏';
                return `<span class="inline-flex items-center gap-1.5 ${meta.chip} text-[11px] font-bold px-2 py-1 rounded" title="${meta.label}">
                  <span class="${meta.dotc} w-1.5 h-1.5 rounded-full"></span>
                  <span>${icon} ${(u.name||u.code||'').replace(/</g,'&lt;')}</span>
                  <span class="text-[9px] opacity-70 uppercase">${meta.label}</span>
                </span>`;
              }).join('') : '<div class="text-xs text-slate-400 italic">Sin unidades cargadas en Airtable para esta casa.</div>'}
            </div>
          </div>

          <!-- LISTA UNIDADES con detalle -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="text-[10px] uppercase font-bold text-slate-700 tracking-wider">⚙️ Unidades y habitaciones (${units.length})</div>
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
              <span class="flex items-center gap-1"><span class="bg-blue-500 w-2 h-2 rounded-full"></span> <strong>${reservedUnits.length}</strong> reservadas</span>
              <span class="flex items-center gap-1"><span class="bg-amber-500 w-2 h-2 rounded-full"></span> <strong>${freeUnits}</strong> disponibles</span>
              <span class="flex items-center gap-1"><span class="bg-slate-500 w-2 h-2 rounded-full"></span> <strong>${maintenanceUnits.length}</strong> mant.</span>
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
  // Estado = Estado EXACTO de Airtable (pmUnitState) → badge, color y borde coherentes.
  const state = pmUnitState(u);
  const meta = PM_UNIT_STATE[state] || PM_UNIT_STATE.inactiva;
  const stateLabel = meta.label;
  const stateColor = meta.chip;
  const borderColor = meta.border;
  const icon = u.unit_type==='casa_completa'?'🏠':u.unit_type==='estudio'?'🎨':u.unit_type==='apartamento'?'🏢':'🛏';
  const typeLabel = u.unit_type==='casa_completa'?'Casa Completa':u.unit_type==='estudio'?'Estudio':u.unit_type==='apartamento'?'Apartamento':'Habitación';
  const isOn = u.is_active !== false;
  // Mini-cards: reserva actual + próximas (N bookings por unidad física agrupada)
  const today = new Date().toISOString().slice(0,10);
  const unitBookings = pmBookingsOf(u.id)
    .filter(b => b.status !== 'cancelado' && (!b.end_date || b.end_date >= today))
    .sort((a,b) => (a.start_date||'').localeCompare(b.start_date||''));
  // Reserva vigente HOY (antes se leía un global `active` inexistente → ReferenceError latente)
  const active = unitBookings.find(b => b.start_date && b.start_date <= today && (!b.end_date || b.end_date >= today) && ['activo','confirmado','reservada'].includes(b.status)) || null;
  const bookingChip = (b) => {
    const isActive = b.start_date && b.start_date <= today && (!b.end_date || b.end_date >= today) && ['activo','confirmado','reservada'].includes(b.status);
    const isUpcoming = b.start_date && b.start_date > today;
    const cls = isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : isUpcoming ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600';
    const tag = isActive ? 'Actual' : isUpcoming ? 'Próxima' : (b.status||'');
    return `<button onclick="event.stopPropagation();pmEditBooking('${b.id}')" class="text-left border ${cls} rounded px-1.5 py-1 text-[10px] leading-tight hover:shadow-sm" title="${tag}">
      <span class="font-bold">${tag}</span> · ${pmTenantName(b.tenant_id).replace(/</g,'&lt;').slice(0,16)}<br>
      <span class="opacity-70">${b.start_date||'?'} → ${b.end_date||'∞'} · $${Number(b.rent_amount||0).toLocaleString()}</span>
    </button>`;
  };
  return `
    <div class="bg-white border border-slate-200 border-l-4 ${borderColor} rounded p-2.5 hover:shadow-sm transition">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-xl">${icon}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <strong class="text-sm text-slate-900 break-words" title="Código generado automáticamente">${(u.name||u.code||'').replace(/</g,'&lt;')} <span class="text-[9px] text-slate-400 font-normal" title="Código generado automáticamente">(${(u.code||'').replace(/</g,'&lt;')})</span></strong>
            <span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">${typeLabel}</span>
            <span class="text-[10px] ${stateColor} px-1.5 py-0.5 rounded font-bold uppercase">${stateLabel}</span>
          </div>
          <div class="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap mt-0.5">
            ${u.bath_type ? `<span>${u.bath_type === 'compartido'?'Compartido':u.bath_type==='privado'?'Privado':u.bath_type==='privado_compartido'?'Privado+Compartido':u.bath_type} baño</span>` : ''}
            ${active ? `<span>· 👤 ${pmTenantName(active.tenant_id)}</span>` : ''}
            ${active && active.end_date ? `<span>· vence ${active.end_date}</span>` : ''}
          </div>
          ${u.access_codes ? `<div class="text-[11px] text-slate-600 mt-0.5 whitespace-pre-line" title="Accesos y códigos (🚪 Unidades en Airtable)">🔑 ${String(u.access_codes).replace(/</g,'&lt;').slice(0,140)}</div>` : ''}
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="text-right">
            <div class="text-sm font-bold text-emerald-700">$${Number(u.target_rent||0).toLocaleString()}</div>
            <div class="text-[9px] text-slate-500 uppercase">Mensual</div>
          </div>
          <button onclick="pmToggleUnitActive('${u.id}', ${!isOn})" class="relative inline-flex h-5 w-9 rounded-full transition ${isOn?'bg-emerald-500':'bg-slate-300'}" title="${isOn?'Desactivar':'Activar'}">
            <span class="absolute ${isOn?'right-0.5':'left-0.5'} top-0.5 h-4 w-4 rounded-full bg-white shadow transition"></span>
          </button>
          <button onclick="event.stopPropagation();pmGenerateWelcomeGuide('${p.id}','${u.id}')" class="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded" title="Guía de Bienvenida / Check-in de ESTA unidad (usa su código de acceso)">📄 Check-in</button>
          <button onclick="pmEditBooking(null,'${u.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-2 py-1 rounded" title="Nueva reserva">+ Reserva</button>
          <button onclick="pmEditUnit('${u.id}','${p.id}')" class="text-slate-400 hover:text-slate-700 p-1">✏️</button>
        </div>
      </div>
      ${unitBookings.length ? `<div class="mt-2 pl-9 flex flex-wrap gap-1.5">${unitBookings.slice(0,6).map(bookingChip).join('')}${unitBookings.length>6?`<span class="text-[10px] text-slate-400 self-center">+${unitBookings.length-6}</span>`:''}</div>` : ''}
    </div>
  `;
}

function pmToggleExpandProperty(id) {
  pmaState.expandedProperties = pmaState.expandedProperties || new Set();
  if (pmaState.expandedProperties.has(id)) pmaState.expandedProperties.delete(id);
  else pmaState.expandedProperties.add(id);
  pmPreserveScroll(pmRender);
}
window.pmToggleExpandProperty = pmToggleExpandProperty;

// Conserva la posición de scroll del contenedor del PM al re-renderizar (evita el
// salto al inicio al expandir una casa). Captura scrollTop antes y lo restaura después.
function pmPreserveScroll(fn) {
  const sel = '#pm-root .overflow-y-auto';
  const before = document.querySelector(sel);
  const top = before ? before.scrollTop : 0;
  fn();
  const restore = () => { const el = document.querySelector(sel); if (el) el.scrollTop = top; };
  restore();
  requestAnimationFrame(restore);   // por si el layout se asienta en el próximo frame
}
window.pmPreserveScroll = pmPreserveScroll;

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
// Status badge de propiedad (mapea valores del schema a etiquetas del spec)
function pmPropStatusBadge(status){
  const map = { activa:['Activa','bg-emerald-100 text-emerald-800'], pausada:['Pausada','bg-amber-100 text-amber-800'], inactiva:['Pausada','bg-amber-100 text-amber-800'], en_remodelacion:['En remodelación','bg-blue-100 text-blue-800'], venta:['Venta','bg-purple-100 text-purple-800'], vendida:['Vendida','bg-slate-200 text-slate-700'] };
  const [label,cls] = map[status] || [status||'—','bg-slate-100 text-slate-700'];
  return `<span class="text-[10px] font-bold px-2 py-0.5 rounded ${cls}">${label}</span>`;
}

function pmRenderPropertyDetail() {
  const p = pmaState.properties.find(x => x.id === pmaState.selectedPropertyId);
  if (!p) return '<div class="p-4 text-slate-500">Propiedad no encontrada.</div>';
  const units = pmUnitsOf(p.id);
  const occ = pmOccupancyOf(p.id);
  const now = new Date();
  const finMonth = pmFinanceOf(p.id, new Date(now.getFullYear(), now.getMonth(), 1));
  // Inquilinos al día (con pago en los últimos 30d) vs total con inquilino
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate()-30);
  const recentPayers = new Set(pmaState.payments.filter(x=>x.type==='ingreso' && x.tenant_id && x.paid_at && new Date(x.paid_at)>=cutoff).map(x=>x.tenant_id));
  const propBookings = pmaState.bookings.filter(b=>b.property_id===p.id && ['activo','confirmado','reservada'].includes(b.status) && b.tenant_id);
  const alDia = propBookings.filter(b=>recentPayers.has(b.tenant_id)).length;

  const SUBTABS = [['units','Unidades'],['creds','Acceso y credenciales'],['pnl','Histórico P&L'],['docs','Documentos'],['tasks','Tareas']];
  const pd = pmaState.pdTab || 'units';

  return `
    <div class="space-y-3 p-1">
      <div class="flex items-center justify-between">
        <button onclick="pmaState.selectedPropertyId=null;pmRender()" class="text-xs text-slate-500 hover:text-slate-900">← Volver a propiedades</button>
        ${window.osOpenFicha ? `<button onclick="osOpenFicha('${window.osSlug ? osSlug(p.name) : ''}')" class="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">🏠 Ver ficha de casa (ciclo completo) →</button>` : ''}
      </div>

      ${p.active === false ? `
        <div class="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-amber-900 text-xs">
          📦 <strong>Propiedad archivada${p.archived_at?' el '+new Date(p.archived_at).toLocaleDateString('es-MX'):''}</strong> porque ya no está en Airtable "Datos x Casa".
          Sus bookings y pagos históricos se preservan. Para reactivarla, agregala de vuelta en Airtable y corré el sync.
        </div>` : ''}

      <!-- Header propiedad -->
      <div class="bg-gradient-to-br from-slate-900 to-blue-900 text-white rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div class="flex items-center gap-2">
            <div class="text-[10px] uppercase font-bold text-blue-200 tracking-wider">${p.rental_model||'mixto'}</div>
            ${pmPropStatusBadge(p.status)}
          </div>
          <div class="text-lg font-bold mt-1">${(p.name||'').replace(/</g,'&lt;')}</div>
          <div class="text-[11px] text-blue-200">${(p.address||'').replace(/</g,'&lt;')}</div>
        </div>
        <div class="flex gap-2">
          <button onclick="pmGenerateWelcomeGuide('${p.id}')" class="bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold px-3 py-1.5 rounded" title="Generar PDF de la guía de check-in">📄 Guía de Bienvenida</button>
          <button onclick="pmSendWelcomeGuide('${p.id}')" class="bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded" title="Compartir al huésped por correo o WhatsApp (mailto/wa.me)">Compartir ›</button>
          <button onclick="pmEditProperty('${p.id}')" class="bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded">✏️ Editar</button>
          <button onclick="pmEditUnit(null,'${p.id}')" class="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded">+ Unidad</button>
        </div>
      </div>

      <!-- Métricas rápidas (4 cards) -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div class="bg-white border border-slate-200 rounded p-3"><div class="text-[9px] uppercase text-slate-500 font-bold">Ocupación</div><div class="text-xl font-bold text-emerald-700 mt-1">${occ.pct}%</div><div class="text-[10px] text-slate-500">${occ.occupied}/${occ.total} unidades</div></div>
        <div class="bg-white border border-slate-200 rounded p-3"><div class="text-[9px] uppercase text-slate-500 font-bold">Inquilinos al día</div><div class="text-xl font-bold text-slate-900 mt-1">${alDia}<span class="text-sm text-slate-400">/${propBookings.length}</span></div></div>
        <div class="bg-white border border-slate-200 rounded p-3"><div class="text-[9px] uppercase text-slate-500 font-bold">Ingresos mes</div><div class="text-xl font-bold text-emerald-700 mt-1">${pmMoney(finMonth.ingresos)}</div></div>
        <div class="bg-white border border-slate-200 rounded p-3"><div class="text-[9px] uppercase text-slate-500 font-bold">Gastos mes</div><div class="text-xl font-bold text-red-700 mt-1">${pmMoney(finMonth.gastos)}</div></div>
      </div>

      <!-- Sub-tabs -->
      <div class="border-b border-slate-200">
        <div class="flex gap-1 -mb-px overflow-x-auto">
          ${SUBTABS.map(([k,l])=>`<button onclick="pmaState.pdTab='${k}';pmRender()" class="px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap ${pd===k?'border-emerald-500 text-emerald-700':'border-transparent text-slate-500 hover:text-slate-700'}">${l}</button>`).join('')}
        </div>
      </div>

      <div>
        ${pd==='units' ? pmPdUnits(p, units) : ''}
        ${pd==='creds' ? pmPdCreds(p) : ''}
        ${pd==='pnl'   ? pmPdPnl(p) : ''}
        ${pd==='docs'  ? pmPdDocs(p) : ''}
        ${pd==='tasks' ? pmPdTasks(p) : ''}
      </div>
    </div>
  `;
}

// ─── TAB A · Unidades (timeline + tabla) ───────────────────────
function pmPdUnits(p, units){
  if(!units.length) return `
    <div class="bg-amber-50 border border-amber-200 rounded p-4 text-center">
      <div class="text-sm text-amber-900 mb-2">Esta propiedad no tiene unidades aún.</div>
      <button onclick="pmEditUnit(null,'${p.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 rounded">+ Agregar unidad</button>
    </div>`;
  const lastPayOf = (uid)=>{ const ps=pmaState.payments.filter(x=>x.unit_id===uid && x.type==='ingreso' && x.paid_at).sort((a,b)=>a.paid_at<b.paid_at?1:-1); return ps[0]?.paid_at || null; };
  return `
    <div class="space-y-3">
      <div class="bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
        <div class="px-4 py-3 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-2">
          <div><div class="text-[10px] uppercase font-bold text-slate-300 tracking-wider">📅 Calendario de ocupación</div><div class="text-sm font-bold mt-0.5">${pmaState.calendarYear}</div></div>
          <div class="flex gap-1">
            <button onclick="pmaState.calendarYear--;pmRender()" class="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-xs">←</button>
            <button onclick="pmaState.calendarYear=new Date().getFullYear();pmRender()" class="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs">Hoy</button>
            <button onclick="pmaState.calendarYear++;pmRender()" class="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-xs">→</button>
          </div>
        </div>
        ${pmRenderTimelineForUnits(units, pmaState.calendarYear)}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-slate-50"><tr>
            <th class="text-left px-3 py-2">Unidad</th><th class="text-left px-3 py-2">Baño</th><th class="text-left px-3 py-2">Estado</th>
            <th class="text-left px-3 py-2">Inquilino</th><th class="text-right px-3 py-2">Renta</th><th class="text-left px-3 py-2">Desde→Hasta</th>
            <th class="text-left px-3 py-2">Último pago</th><th class="text-right px-3 py-2">Acciones</th>
          </tr></thead>
          <tbody>
            ${units.map(u=>{ const a=pmActiveBookingOf(u.id); const lp=lastPayOf(u.id); return `
              <tr class="border-t border-slate-100 hover:bg-slate-50">
                <td class="px-3 py-2"><span class="font-bold text-slate-900">${(u.name||u.code||'').replace(/</g,'&lt;')}</span></td>
                <td class="px-3 py-2 text-slate-600">${(u.bath_type||u.bathroom_count||'—').replace(/</g,'&lt;')}</td>
                <td class="px-3 py-2">${a?'<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">ocupada</span>':'<span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">libre</span>'}</td>
                <td class="px-3 py-2 text-slate-700">${a?pmTenantName(a.tenant_id).replace(/</g,'&lt;'):'—'}</td>
                <td class="px-3 py-2 text-right font-semibold">${u.target_rent?pmMoney(u.target_rent):'—'}</td>
                <td class="px-3 py-2 text-slate-500 whitespace-nowrap">${a?`${a.start_date||'?'} → ${a.end_date||'∞'}`:'—'}</td>
                <td class="px-3 py-2 text-slate-500 whitespace-nowrap">${lp||'—'}</td>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button onclick="pmEditUnit('${u.id}','${p.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-1 rounded">Editar</button>
                  <button onclick="pmEditBooking(null,'${u.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-2 py-1 rounded">Asignar</button>
                </td>
              </tr>`; }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ─── TAB B · Acceso y credenciales ─────────────────────────────
function pmPdCreds(p){
  const creds = (pmaState.credentials||[]).filter(c=>c.property_id===p.id);
  const wifis = (pmaState.wifi||[]).filter(w=>w.property_id===p.id);
  const iconFor = (cat)=>{ const c=(cat||'').toLowerCase(); if(/electr|energy|amigo|luz/.test(c))return'⚡'; if(/gas/.test(c))return'🔥'; if(/internet|spectrum|wifi|web/.test(c))return'🌐'; if(/bank|banco/.test(c))return'🏦'; if(/agua|water/.test(c))return'💧'; return'🔑'; };
  const pwCell = (id, pw)=> pw ? `
    <span id="cred-pw-${id}" data-pw="${encodeURIComponent(pw)}" data-shown="0" class="font-mono text-slate-700">••••••••</span>
    <button onclick="pmCredToggle('${id}')" class="text-[10px] text-blue-600 hover:underline ml-1">Ver</button>
    <button onclick="pmCredCopy('${id}')" class="text-[10px] text-slate-500 hover:underline ml-1">Copiar</button>` : '<span class="text-slate-400">—</span>';
  if(!creds.length && !wifis.length) return '<div class="text-center py-8 text-slate-400 text-sm">Sin credenciales registradas para esta propiedad.</div>';
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      ${wifis.map(w=>`
        <div class="bg-gradient-to-br from-sky-50 to-white border border-sky-200 rounded-xl p-3">
          <div class="flex items-center gap-2 text-sm font-bold text-slate-900">📡 WiFi <span class="text-[10px] font-normal text-sky-600">red</span></div>
          <div class="text-xs text-slate-600 mt-1">SSID: <span class="font-mono font-semibold">${(w.network_name||'—').replace(/</g,'&lt;')}</span></div>
          <div class="text-xs text-slate-600 mt-0.5">Clave: ${pwCell('wifi-'+w.id, w.password_encrypted)}</div>
        </div>`).join('')}
      ${creds.map(c=>`
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="flex items-center gap-2 text-sm font-bold text-slate-900">${iconFor(c.category)} ${(c.name||'Servicio').replace(/</g,'&lt;')} ${c.category?`<span class="text-[10px] font-normal text-slate-400">${c.category}</span>`:''}</div>
          ${c.username?`<div class="text-xs text-slate-600 mt-1">Usuario: <span class="font-mono">${(c.username||'').replace(/</g,'&lt;')}</span></div>`:''}
          <div class="text-xs text-slate-600 mt-0.5">Clave: ${pwCell('cred-'+c.id, c.password_enc)}</div>
          ${c.url?`<div class="text-xs mt-1"><a href="${c.url}" target="_blank" rel="noopener" class="text-blue-600 hover:underline">🔗 Abrir portal</a></div>`:''}
          ${c.notes?`<div class="text-[11px] text-slate-500 mt-1 italic">${(c.notes||'').replace(/</g,'&lt;')}</div>`:''}
        </div>`).join('')}
    </div>
    <div class="text-[10px] text-amber-600 mt-3">⚠️ Las claves se muestran tal como vienen de Airtable (texto plano en DB). Encriptación real + audit log pendientes.</div>`;
}

// ─── TAB C · Histórico P&L ─────────────────────────────────────
function pmPdPnl(p){
  const now=new Date();
  const rows=[]; const trend=[];
  for(let i=11;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); const f=pmFinanceOf(p.id,d);
    const label=`${PM_ES_MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    rows.push({label, ing:f.ingresos, gas:f.gastos, net:f.utilidad});
    trend.push({label, income:f.ingresos, gastos:f.gastos}); }
  const hasData = rows.some(r=>r.ing||r.gas);
  if(!hasData) return '<div class="text-center py-8 text-slate-400 text-sm">Sin movimientos registrados para esta propiedad.</div>';
  return `
    <div class="space-y-3">
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-1"><div class="text-sm font-bold text-slate-800">Ingresos vs Gastos · 12 meses</div><div class="flex gap-3 text-[11px]"><span class="text-emerald-600 font-bold">● Ingresos</span><span class="text-red-600 font-bold">● Gastos</span></div></div>
        ${pmTrendSvg(trend.slice(-12))}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-slate-50"><tr><th class="text-left px-3 py-2">Mes</th><th class="text-right px-3 py-2">Ingresos</th><th class="text-right px-3 py-2">Gastos</th><th class="text-right px-3 py-2">Neto</th></tr></thead>
          <tbody>${rows.slice().reverse().map(r=>`<tr class="border-t border-slate-100"><td class="px-3 py-2 font-semibold">${r.label}</td><td class="px-3 py-2 text-right text-emerald-700">${pmMoney(r.ing)}</td><td class="px-3 py-2 text-right text-red-700">${pmMoney(r.gas)}</td><td class="px-3 py-2 text-right font-bold ${r.net>=0?'text-emerald-700':'text-red-700'}">${pmMoney(r.net)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

// ─── TAB D · Documentos y comprobantes ─────────────────────────
function pmPdDocs(p){
  const docs=[];
  pmaState.bookings.filter(b=>b.property_id===p.id && b.contract_url).forEach(b=>docs.push({tipo:'Contrato', date:b.start_date, url:b.contract_url, label:pmTenantName(b.tenant_id)}));
  pmaState.payments.filter(x=>x.property_id===p.id && x.proof_url).forEach(x=>docs.push({tipo:'Comprobante', date:x.paid_at, url:x.proof_url, label:x.concept||'Pago'}));
  (pmaState.expenses||[]).filter(e=>e.property_id===p.id && e.invoice_url).forEach(e=>docs.push({tipo:'Factura', date:e.expense_date, url:e.invoice_url, label:e.description||e.subcategory||'Gasto'}));
  docs.sort((a,b)=> (b.date||'')<(a.date||'')?-1:1);
  if(!docs.length) return '<div class="text-center py-8 text-slate-400 text-sm">Sin documentos. Los comprobantes/facturas aparecen al sincronizar Airtable.</div>';
  const badge={Contrato:'bg-blue-100 text-blue-800',Comprobante:'bg-emerald-100 text-emerald-800',Factura:'bg-amber-100 text-amber-800'};
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="bg-slate-50"><tr><th class="text-left px-3 py-2">Tipo</th><th class="text-left px-3 py-2">Detalle</th><th class="text-left px-3 py-2">Fecha</th><th class="text-right px-3 py-2"></th></tr></thead>
        <tbody>${docs.map(d=>`<tr class="border-t border-slate-100 hover:bg-slate-50"><td class="px-3 py-2"><span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${badge[d.tipo]||'bg-slate-100'}">${d.tipo}</span></td><td class="px-3 py-2 text-slate-700">${(d.label||'').replace(/</g,'&lt;').slice(0,50)}</td><td class="px-3 py-2 text-slate-500 whitespace-nowrap">${d.date||'—'}</td><td class="px-3 py-2 text-right"><a href="${d.url}" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-bold">Abrir ↗</a></td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

// ─── TAB E · Tareas pendientes ─────────────────────────────────
function pmPdTasks(p){
  const tasks=(pmaState.tasks||[]).filter(t=>t.property_id===p.id && (t.status==='pendiente'||t.status==='pending'||t.status==='en_progreso')).sort((a,b)=> (a.scheduled_date||'9999')<(b.scheduled_date||'9999')?-1:1);
  if(!tasks.length) return '<div class="text-center py-8 text-slate-400 text-sm">✓ Sin tareas pendientes para esta propiedad.</div>';
  return `<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
    ${tasks.map(t=>`
      <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold text-slate-900">${(t.task_type||t.title||'Tarea').replace(/</g,'&lt;')}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">📅 ${t.scheduled_date||t.start_at?.slice(0,10)||'sin fecha'}${t.assigned_to||t.assignee?` · 👤 ${(t.assigned_to||t.assignee).replace(/</g,'&lt;')}`:''}</div>
          ${t.notes?`<div class="text-[11px] text-slate-400 mt-1 italic">${(t.notes||'').replace(/</g,'&lt;').slice(0,80)}</div>`:''}
        </div>
        <div class="flex flex-col gap-1 flex-shrink-0">
          <button onclick="pmTaskComplete('${t.id}')" class="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded whitespace-nowrap">✓ Completada</button>
          <button onclick="pmTaskReschedule('${t.id}')" class="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-0.5 whitespace-nowrap">Reprogramar</button>
        </div>
      </div>`).join('')}
  </div>`;
}

// Helpers credenciales (toggle/copia, auto-hide 10s — sin re-render)
const pmCredTimers = {};
function pmCredToggle(id){ const el=document.getElementById('cred-pw-'+id); if(!el) return; const pw=decodeURIComponent(el.dataset.pw||''); if(el.dataset.shown==='1'){ el.textContent='••••••••'; el.dataset.shown='0'; clearTimeout(pmCredTimers[id]); } else { el.textContent=pw||'(vacío)'; el.dataset.shown='1'; clearTimeout(pmCredTimers[id]); pmCredTimers[id]=setTimeout(()=>{ if(el.isConnected){ el.textContent='••••••••'; el.dataset.shown='0'; } },10000); } }
function pmCredCopy(id){ const el=document.getElementById('cred-pw-'+id); if(!el) return; const pw=decodeURIComponent(el.dataset.pw||''); navigator.clipboard?.writeText(pw); }
window.pmCredToggle=pmCredToggle; window.pmCredCopy=pmCredCopy;

async function pmTaskComplete(id){ try{ const {error}=await sb.from('pm_tasks').update({status:'completado'}).eq('id',id); if(error) return alert('No se pudo completar: '+error.message); pmaState.tasks=(pmaState.tasks||[]).map(t=>t.id===id?{...t,status:'completado'}:t); pmRender(); }catch(e){ alert('Error: '+e.message); } }
async function pmTaskReschedule(id){ const d=prompt('Nueva fecha programada (YYYY-MM-DD):'); if(!d) return; try{ const {error}=await sb.from('pm_tasks').update({scheduled_date:d}).eq('id',id); if(error) return alert('No se pudo reprogramar: '+error.message); pmaState.tasks=(pmaState.tasks||[]).map(t=>t.id===id?{...t,scheduled_date:d}:t); pmRender(); }catch(e){ alert('Error: '+e.message); } }
window.pmTaskComplete=pmTaskComplete; window.pmTaskReschedule=pmTaskReschedule;

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
  const bks = pmMergedBookings(unit).filter(b =>
    b.start_date && ['activo','confirmado','reservada','finalizado','vencido'].includes(b.status)
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
                    airbnb:            'background:linear-gradient(135deg,#ec4899,#db2777);',
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
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#ec4899,#db2777);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>🌐 Airbnb</span>
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
// Dedupe units: solo fusiona si TODOS los datos importantes son iguales
// (mismo property_id, mismo code, mismo type, Y mismo target_rent o uno null).
// Si dos unidades tienen el mismo code pero rentas diferentes, son UNIDADES REALES
// distintas (error de import en Airtable) y deben mostrarse ambas.
function pmDedupeUnits(units) {
  const map = new Map();
  units.forEach(u => {
    const rent = u.target_rent ? Math.round(u.target_rent) : 'NULL';
    const key = `${u.property_id}|${(u.code||'').toUpperCase()}|${u.unit_type||''}|${rent}`;
    const existing = map.get(key);
    if (!existing) { map.set(key, u); return; }
    // Ante código duplicado (activa + inactiva del mirror), GANA la que tiene reserva activa,
    // luego la activa, luego la más completa. Evita mostrar la habitación vacía en vez de la ocupada.
    const score = (x) => (pmActiveBookingOf(x.id)?1000:0) + (x.is_active!==false?100:0) + (x.target_rent?2:0) + (x.bath_type?1:0) + new Date(x.created_at||0).getTime()/1e15;
    if (score(u) > score(existing)) map.set(key, u);
  });
  // El sync ahora produce 1 pm_unit por unidad física (clave property+tipo),
  // así que NO se agrega sufijo "(B)/(C)": cada unidad ya es única.
  return Array.from(map.values());
}

// Colapsa unidades de propiedades 'por_habitaciones'/'casa_completa' a UNA línea
// de calendario (la casa entera es la unidad rentable). 'por_unidades'/'mixta'
// muestran sus unidades individuales. La línea colapsada lleva _mergedUnitIds
// para que sus bookings se agreguen vía pmMergedBookings/pmMergedActiveBooking.
function pmCollapseForCalendar(units) {
  const byProp = {};
  units.forEach(u => { (byProp[u.property_id] = byProp[u.property_id] || []).push(u); });
  const out = [];
  Object.keys(byProp).forEach(pid => {
    const us = byProp[pid];
    const model = pmaState.properties.find(x => x.id === pid)?.rental_model || 'casa_completa';
    if ((model === 'por_habitaciones' || model === 'casa_completa') && us.length > 1) {
      out.push({ ...us[0], _mergedUnitIds: us.map(x => x.id), _collapsed: true,
        name: model === 'por_habitaciones' ? `Habitaciones (${us.length})` : (us[0].name || us[0].code) });
    } else {
      out.push(...us);
    }
  });
  return out;
}

function pmRenderCalendar() {
  const filter = pmaState.calendarFilterPropertyId;
  let rawUnits = filter
    ? pmUnitsOf(filter)
    : pmaState.units.filter(u => pmaState.properties.some(p => p.id === u.property_id));
  const deduped = pmDedupeUnits(rawUnits);
  const dupesHidden = rawUnits.length - deduped.length;   // solo dups reales (no colapsos)
  // VISUALIZACIÓN: cada unidad física (incluidas habitaciones) es su propia fila en el
  // calendario — NO se colapsan a "Habitaciones (N)". El conteo de unidades rentables del
  // portafolio sigue excluyendo habitaciones (isRentableUnit), pero el timeline las muestra.
  const allUnits = deduped;

  if (pmaState.calendarSelectedUnitId) {
    const unit = allUnits.find(u => u.id === pmaState.calendarSelectedUnitId)
              || pmaState.units.find(u => u.id === pmaState.calendarSelectedUnitId);
    if (unit) return pmRenderSingleListing(unit, allUnits);
  }

  const q = (pmaState.calendarListingSearch || '').toLowerCase().trim();
  let filteredUnits = q
    ? allUnits.filter(u => {
        const p = pmaState.properties.find(x => x.id === u.property_id);
        return (u.code||'').toLowerCase().includes(q)
            || (u.name||'').toLowerCase().includes(q)
            || (p?.name||'').toLowerCase().includes(q);
      })
    : allUnits;
  if (pmaState.calendarFilterType) filteredUnits = filteredUnits.filter(u => u.unit_type === pmaState.calendarFilterType);

  if (!pmaState.calendarTimelineStart) {
    pmaState.calendarTimelineStart = new Date().toISOString().slice(0,10);
  }

  // Primera vez con agrupado: colapsar todos los grupos (que el usuario abra los que quiera ver)
  if (pmaState.calendarGroupByProperty && !pmaState.calendarGroupsInitialized) {
    const propIds = [...new Set(filteredUnits.map(u => u.property_id))];
    propIds.forEach(pid => { pmaState.calendarCollapsedProps[pid] = true; });
    pmaState.calendarGroupsInitialized = true;
  }

  // Si está agrupado y sin búsqueda activa → el timeline solo muestra units de grupos EXPANDIDOS
  let timelineUnits = filteredUnits;
  if (pmaState.calendarGroupByProperty && !q) {
    timelineUnits = filteredUnits.filter(u => !pmaState.calendarCollapsedProps[u.property_id]);
  }

  const fs = !!pmaState.calendarFullscreen;
  const splitH = fs ? 'calc(100vh - 92px)' : 'calc(82vh - 56px)';   // más alto por defecto + modo full
  const inner = `
    <div class="flex bg-white pm-split" style="height: ${splitH}; margin: -4px;">
      ${pmRenderListingsSidebar(filteredUnits, allUnits.length)}
      ${pmResizeHandle('#pm-cal-sidebar', 'pm_calendar_sidebar_width', 320)}
      <div class="flex-1 flex flex-col overflow-hidden pm-split-main">
        ${pmRenderTimelineHeader()}
        ${pmRenderCalControlBar(timelineUnits)}
        ${dupesHidden ? `<div class="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-[10px] text-amber-900 flex items-center justify-between"><span>⚠️ ${dupesHidden} ${dupesHidden===1?'registro duplicado':'registros duplicados'} fusionado${dupesHidden===1?'':'s'} (mismo código, tipo y renta)</span><span class="text-amber-700 italic">Si ves códigos como "ESTUDIO-1 (B)" son unidades distintas con mismo código en Airtable.</span></div>` : ''}
        <div class="flex-1 overflow-auto">${timelineUnits.length === 0 && pmaState.calendarGroupByProperty ? `
          <div class="p-12 text-center text-slate-400 text-sm">
            <div class="text-5xl mb-3">📂</div>
            <div class="font-bold text-slate-600 mb-1">Todas las propiedades están colapsadas</div>
            <div class="text-xs">Haz click en una propiedad del sidebar (▶) para ver sus unidades en el timeline</div>
            <button onclick="pmCalExpandAll()" class="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg">Expandir todas</button>
          </div>
        ` : pmRenderTimelineGrid(timelineUnits)}</div>
      </div>
      ${pmaState.calendarSelectedBookingId ? pmRenderBookingSidePanel(pmaState.calendarSelectedBookingId) : ''}
    </div>
  `;
  if (fs) {
    return `<div class="fixed inset-0 z-[70] bg-white flex flex-col" style="padding:8px 12px;">
      <div class="flex items-center justify-between mb-1.5">
        <div class="font-bold text-slate-800 text-sm">📅 Calendario · pantalla completa</div>
        <button onclick="pmCalToggleFullscreen()" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded">✕ Salir de pantalla completa</button>
      </div>
      ${inner}
    </div>`;
  }
  return inner;
}
function pmCalToggleFullscreen() {
  pmaState.calendarFullscreen = !pmaState.calendarFullscreen;
  pmRender();
}
window.pmCalToggleFullscreen = pmCalToggleFullscreen;

function pmCalExpandAll() {
  pmaState.calendarCollapsedProps = {};
  pmRender();
}
function pmCalCollapseAll() {
  const propIds = [...new Set(pmaState.units.map(u => u.property_id))];
  propIds.forEach(pid => { pmaState.calendarCollapsedProps[pid] = true; });
  pmRender();
}
window.pmCalExpandAll = pmCalExpandAll;
window.pmCalCollapseAll = pmCalCollapseAll;

function pmRenderListingsSidebar(filteredUnits, totalCount) {
  // Stats globales (sobre todos los listings deduplicados)
  const occCount = filteredUnits.filter(u => pmMergedActiveBooking(u)).length;
  const freeCount = filteredUnits.length - occCount;
  const occFilter = pmaState.calendarOccupancyFilter || 'all';
  const search = (pmaState.calendarListingSearch || '');
  const groupBy = !!pmaState.calendarGroupByProperty;

  // Aplica filtro ocupada/libre
  let listingsToShow = filteredUnits;
  if (occFilter === 'occupied') listingsToShow = filteredUnits.filter(u => pmMergedActiveBooking(u));
  else if (occFilter === 'free') listingsToShow = filteredUnits.filter(u => !pmMergedActiveBooking(u));

  // Render de cada item (reutilizable)
  const renderItem = (u) => {
    const p = pmaState.properties.find(x => x.id === u.property_id);
    const active = pmMergedActiveBooking(u);
    const tenant = active ? pmTenantName(active.tenant_id) : null;
    const icon = u.unit_type==='casa_completa'?'🏡' : u.unit_type==='estudio'?'🎨' : u.unit_type==='apartamento'?'🏢':'🛏';
    const platformColors = {contrato_directo:'#10b981',airbnb:'#ec4899',booking:'#3b82f6',vrbo:'#8b5cf6',hospitable:'#0ea5e9',padsplit:'#a855f7'};
    const dotColor = active ? (platformColors[active.booking_type] || '#10b981') : '#cbd5e1';
    const statusLabel = active ? tenant : 'Libre';
    const statusClass = active ? 'text-emerald-700' : 'text-slate-400';
    const displayName = (u.name||u.code||'') + (u._displaySuffix || '');
    const fullTip = `${displayName}${p?.name ? ' — ' + p.name : ''}${active ? ' · ' + tenant : ' · Libre'}`;
    return `<button onclick="pmaState.calendarSelectedUnitId='${u.id}';pmRender()" title="${fullTip.replace(/"/g,'&quot;')}" class="w-full px-3 py-2.5 hover:bg-white border-b border-slate-100 flex items-center gap-2.5 text-left transition group">
      <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center text-lg flex-shrink-0">${icon}</div>
      <div class="flex-1 min-w-0">
        <div class="text-xs font-bold text-slate-900 pm-clamp2" title="${displayName.replace(/"/g,'&quot;')}">${displayName.replace(/</g,'&lt;')}</div>
        <div class="text-[10px] text-slate-500 pm-clamp1" title="${(p?.name||'—').replace(/"/g,'&quot;')}">${(p?.name||'—').replace(/</g,'&lt;')}${u.target_rent ? ` · $${Number(u.target_rent).toLocaleString()}/mes` : ''}</div>
        <div class="text-[10px] ${statusClass} font-semibold pm-ellipsis flex items-center gap-1 mt-0.5">
          <span style="background:${dotColor}" class="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"></span>
          ${statusLabel.replace(/</g,'&lt;')}
        </div>
      </div>
      <span class="text-slate-300 group-hover:text-slate-500 text-xs flex-shrink-0">›</span>
    </button>`;
  };

  // Body — agrupado o flat
  let bodyHtml;
  if (listingsToShow.length === 0) {
    bodyHtml = '<div class="p-6 text-center text-xs text-slate-400"><div class="text-3xl mb-2">🔍</div>Sin resultados</div>';
  } else if (groupBy && !search) {
    // Agrupar por propiedad — ordenado alfabéticamente
    const groups = {};
    listingsToShow.forEach(u => {
      if (!groups[u.property_id]) groups[u.property_id] = [];
      groups[u.property_id].push(u);
    });
    const groupedKeys = Object.keys(groups).sort((a, b) => {
      const na = (pmaState.properties.find(x=>x.id===a)?.name||'').toLowerCase();
      const nb = (pmaState.properties.find(x=>x.id===b)?.name||'').toLowerCase();
      return na.localeCompare(nb);
    });
    bodyHtml = groupedKeys.map(pid => {
      const p = pmaState.properties.find(x => x.id === pid);
      const collapsed = pmaState.calendarCollapsedProps[pid];
      const items = groups[pid];
      const occ = items.filter(u => pmMergedActiveBooking(u)).length;
      const allOcc = occ === items.length && items.length > 0;
      const noneOcc = occ === 0;
      const indicatorColor = allOcc ? 'bg-emerald-500' : (noneOcc ? 'bg-slate-300' : 'bg-amber-400');
      return `<div>
        <button onclick="pmCalToggleGroup('${pid}')" class="w-full px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 flex items-center justify-between text-left transition group">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-slate-400 text-[10px] w-3 transition-transform" style="${collapsed?'':'transform:rotate(90deg);'}">▶</span>
            <span class="${indicatorColor} w-2 h-2 rounded-full flex-shrink-0"></span>
            <strong class="text-[11px] uppercase tracking-wide text-slate-700 pm-clamp2" title="${(p?.name||'Sin propiedad').replace(/"/g,'&quot;')}">${(p?.name||'Sin propiedad').replace(/</g,'&lt;')}</strong>
          </div>
          <span class="text-[10px] text-slate-500 flex-shrink-0 bg-white px-1.5 py-0.5 rounded self-start">${occ}<span class="opacity-60">/${items.length}</span></span>
        </button>
        ${collapsed ? '' : items.map(renderItem).join('')}
      </div>`;
    }).join('');
  } else {
    bodyHtml = listingsToShow.map(renderItem).join('');
  }

  return `
    <div id="pm-cal-sidebar" class="pm-split-sidebar border-r border-slate-200 bg-slate-50 flex flex-col" style="flex:0 0 ${pmSidebarWidth('pm_calendar_sidebar_width', pmSidebarDefault())}px;">
      <div class="p-3 border-b border-slate-200 bg-white space-y-2">
        <!-- Header con contador + agrupar -->
        <div class="flex items-center justify-between">
          <strong class="text-sm text-slate-900">${totalCount} <span class="text-slate-500 font-normal">anuncios</span></strong>
          <div class="flex items-center gap-1">
            ${pmaState.calendarFilterPropertyId ? `<button onclick="pmaState.calendarFilterPropertyId=null;pmRender()" class="text-[10px] text-blue-600 hover:underline">↩ Todas</button>` : ''}
            ${groupBy ? `<button onclick="pmCalExpandAll()" title="Expandir todo" class="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700">⇊</button>
            <button onclick="pmCalCollapseAll()" title="Colapsar todo" class="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">⇈</button>` : ''}
            <button onclick="pmaState.calendarGroupByProperty=!pmaState.calendarGroupByProperty;pmRender()" title="Agrupar por propiedad" class="text-[10px] px-2 py-1 rounded ${groupBy?'bg-slate-900 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}">⊞ ${groupBy?'Grupos ON':'Grupos'}</button>
          </div>
        </div>
        <!-- Buscador prominente -->
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input oninput="pmaState.calendarListingSearch=this.value;pmRender()" value="${search.replace(/"/g,'&quot;')}" placeholder="Buscar por nombre, código, dirección…" autocomplete="off" class="w-full border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-full pl-9 pr-9 py-2 text-xs outline-none transition"/>
          ${search ? `<button onclick="pmaState.calendarListingSearch='';pmRender()" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs">×</button>` : ''}
        </div>
        <!-- Chips filtro de ocupación -->
        <div class="flex gap-1 text-[10px] font-bold">
          <button onclick="pmaState.calendarOccupancyFilter='all';pmRender()" class="flex-1 px-2 py-1.5 rounded-full transition ${occFilter==='all'?'bg-slate-900 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}">Todas <span class="opacity-70">${filteredUnits.length}</span></button>
          <button onclick="pmaState.calendarOccupancyFilter='occupied';pmRender()" class="flex-1 px-2 py-1.5 rounded-full transition ${occFilter==='occupied'?'bg-emerald-600 text-white':'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}">● Ocupadas ${occCount}</button>
          <button onclick="pmaState.calendarOccupancyFilter='free';pmRender()" class="flex-1 px-2 py-1.5 rounded-full transition ${occFilter==='free'?'bg-slate-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}">○ Libres ${freeCount}</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">${bodyHtml}</div>
    </div>
  `;
}

function pmCalToggleGroup(pid) {
  pmaState.calendarCollapsedProps[pid] = !pmaState.calendarCollapsedProps[pid];
  pmRender();
}
window.pmCalToggleGroup = pmCalToggleGroup;

function pmRenderTimelineHeader() {
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const start = new Date(pmaState.calendarTimelineStart + 'T00:00:00');
  const monthLabel = `${months[start.getMonth()]} de ${start.getFullYear()}`;
  const days = pmaState.calendarTimelineDays;
  return `
    <div class="border-b border-slate-200 bg-white px-3 py-2 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-20">
      <div class="flex items-center gap-2">
        <div class="relative">
          <button onclick="pmaState.calendarMonthDatePickerOpen=!pmaState.calendarMonthDatePickerOpen;pmRender()" class="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold flex items-center gap-2 hover:bg-slate-50">${monthLabel} <span class="text-slate-400">▾</span></button>
          ${pmaState.calendarMonthDatePickerOpen ? pmRenderDatePicker() : ''}
        </div>
        <div class="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden">
          <button onclick="pmCalTimelineShift(-7)" title="← semana" class="px-2.5 py-1.5 hover:bg-slate-100 text-sm font-bold border-r border-slate-200">←</button>
          <button onclick="pmCalTimelineToday()" class="px-3 py-1.5 hover:bg-slate-100 text-sm font-bold border-r border-slate-200">Hoy</button>
          <button onclick="pmCalTimelineShift(7)" title="semana →" class="px-2.5 py-1.5 hover:bg-slate-100 text-sm font-bold">→</button>
        </div>
        <!-- Density / zoom -->
        <div class="hidden md:flex items-center bg-slate-100 rounded-lg p-0.5 text-[10px] font-bold">
          <button onclick="pmCalSetDays(14)" class="px-2 py-1 rounded ${days===14?'bg-white shadow text-slate-900':'text-slate-500 hover:text-slate-900'}">14d</button>
          <button onclick="pmCalSetDays(21)" class="px-2 py-1 rounded ${days===21?'bg-white shadow text-slate-900':'text-slate-500 hover:text-slate-900'}">21d</button>
          <button onclick="pmCalSetDays(30)" class="px-2 py-1 rounded ${days===30?'bg-white shadow text-slate-900':'text-slate-500 hover:text-slate-900'}">30d</button>
        </div>
      </div>
      <button onclick="pmEditBooking(null)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">+ Nueva reserva</button>
    </div>
  `;
}

function pmCalSetDays(n) {
  pmaState.calendarTimelineDays = n;
  pmRender();
}
window.pmCalSetDays = pmCalSetDays;

function pmRenderDatePicker() {
  const start = new Date(pmaState.calendarTimelineStart + 'T00:00:00');
  const year = start.getFullYear();
  const month = start.getMonth();
  const monthFirstDay = new Date(year, month, 1).getDay();
  const monthDays = new Date(year, month + 1, 0).getDate();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const offset = (monthFirstDay + 6) % 7;
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= monthDays; d++) cells.push(d);
  return `
    <div class="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-30" style="width:280px;" onclick="event.stopPropagation()">
      <div class="flex items-center justify-between mb-2">
        <button onclick="pmDpNav(-1)" class="text-slate-500 hover:text-slate-900 px-2 py-1">←</button>
        <strong class="text-sm">${monthNames[month]} ${year}</strong>
        <button onclick="pmDpNav(1)" class="text-slate-500 hover:text-slate-900 px-2 py-1">→</button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-[10px] font-bold text-slate-500 text-center mb-1">
        <div>L</div><div>Ma</div><div>Mi</div><div>J</div><div>V</div><div>S</div><div>D</div>
      </div>
      <div class="grid grid-cols-7 gap-1 text-xs">
        ${cells.map(d => d ? `<button onclick="pmDpPick(${year},${month},${d})" class="w-full aspect-square hover:bg-emerald-100 rounded text-center">${d}</button>` : '<div></div>').join('')}
      </div>
    </div>
  `;
}

function pmDpNav(delta) {
  const start = new Date(pmaState.calendarTimelineStart + 'T00:00:00');
  start.setMonth(start.getMonth() + delta);
  pmaState.calendarTimelineStart = start.toISOString().slice(0,10);
  pmRender();
}
function pmDpPick(year, month, day) {
  pmaState.calendarTimelineStart = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  pmaState.calendarMonthDatePickerOpen = false;
  pmRender();
}
function pmCalTimelineToday() {
  pmaState.calendarTimelineStart = new Date().toISOString().slice(0,10);
  pmRender();
}
window.pmDpNav = pmDpNav;
window.pmDpPick = pmDpPick;
window.pmCalTimelineToday = pmCalTimelineToday;

// Estado visual de una reserva para el timeline (color por estado).
// Paleta orientada a decisión: rojo SOLO = problema (atrasado). Naranja = atención
// (contrato por vencer → renovar/rotar). Azul = futuro neutro. Verde = al día.
const PM_CAL_VENCE_DIAS = 30;   // umbral "por vencer"
function pmBookingCalState(b, lateSet) {
  const today = new Date().toISOString().slice(0,10);
  if (b.end_date && b.end_date < today) return { key:'finalizado', label:'Finalizado', color:'#94a3b8' };
  if (b.start_date && b.start_date > today) return { key:'entrante', label:'Entrante', color:'#3b82f6' };
  if (lateSet && lateSet.has(b.id)) return { key:'atrasado', label:'Atrasado', color:'#ef4444' };
  if (b.end_date) {
    const days = Math.floor((new Date(b.end_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    if (days <= PM_CAL_VENCE_DIAS) return { key:'por_vencer', label:`Por vencer (${days}d)`, color:'#f97316', days };
  }
  return { key:'activo', label:'Activo', color:'#10b981' };
}
// Iniciales para el avatar circular del inquilino.
function pmAvatarInitials(name) {
  const parts = (name||'').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0]||'')).toUpperCase();
}
// % de ocupación de las unidades visibles en la ventana actual (días cubiertos / días totales).
function pmCalcOccupancy(units, startISO, days) {
  if (!units.length) return 0;
  const start = new Date(startISO + 'T00:00:00');
  const winEnd = new Date(start.getTime() + (days-1)*86400000);
  let occ = 0;
  for (const u of units) {
    const covered = new Set();
    for (const b of pmMergedBookings(u)) {
      if (!b.start_date || b.status==='cancelado' || b.status==='cancelled') continue;
      const s = new Date(b.start_date + 'T00:00:00');
      const e = b.end_date ? new Date(b.end_date + 'T00:00:00') : winEnd;
      const from = Math.max(0, Math.floor((s-start)/86400000));
      const to = Math.min(days-1, Math.floor((e-start)/86400000));
      for (let i=from; i<=to; i++) covered.add(i);
    }
    occ += covered.size;
  }
  return Math.round(100 * occ / (units.length * days));
}
function pmCalSetColorBy(v){ pmaState.calendarColorBy = v; pmRender(); }
function pmCalSetFilter(k, v){ const m={status:'calendarFilterStatus',platform:'calendarFilterPlatform',type:'calendarFilterType'}; pmaState[m[k]] = v; pmRender(); }
function pmCalClearFilters(){ pmaState.calendarFilterStatus = pmaState.calendarFilterPlatform = pmaState.calendarFilterType = null; pmRender(); }
window.pmCalSetColorBy = pmCalSetColorBy; window.pmCalSetFilter = pmCalSetFilter; window.pmCalClearFilters = pmCalClearFilters;

// Barra de control del calendario: ocupación %, toggle de color y filtros estado/plataforma/tipo.
function pmRenderCalControlBar(units) {
  // Ocupación: SOLO unidades rentables (habitaciones no cuentan). Si en la vista solo hay
  // habitaciones (casa por_habitaciones expandida), cae a todas para no mostrar 0% engañoso.
  const rentables = units.filter(isRentableUnit);
  const occUnits = rentables.length ? rentables : units;
  const occ = pmCalcOccupancy(occUnits, pmaState.calendarTimelineStart, pmaState.calendarTimelineDays);
  const colorBy = pmaState.calendarColorBy || 'estado';
  const fS = pmaState.calendarFilterStatus, fP = pmaState.calendarFilterPlatform, fT = pmaState.calendarFilterType;
  const occColor = occ>=80?'text-emerald-600':occ>=50?'text-amber-600':'text-red-600';
  return `<div class="border-b border-slate-200 bg-slate-50 px-3 py-1.5 flex items-center gap-2 flex-wrap" style="font-size:11px;">
    <span class="font-bold text-slate-700">Ocupación <span class="${occColor}" style="font-size:14px;">${occ}%</span> <span class="text-slate-400 font-normal">· ${units.length} filas${rentables.length!==units.length?` (${rentables.length} rentables)`:''} · ${pmaState.calendarTimelineDays}d</span></span>
    <span class="text-slate-300">·</span>
    <span class="text-[10px] font-bold text-slate-500">Color:</span>
    <div class="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden text-[10px] font-bold">
      <button onclick="pmCalSetColorBy('estado')" class="px-2 py-1 ${colorBy==='estado'?'bg-slate-900 text-white':'text-slate-500 hover:bg-slate-100'}">Estado</button>
      <button onclick="pmCalSetColorBy('plataforma')" class="px-2 py-1 ${colorBy==='plataforma'?'bg-slate-900 text-white':'text-slate-500 hover:bg-slate-100'}">Plataforma</button>
    </div>
    ${pmFilterSelect('Estado','⚡', fS, [['','Todos'],['activo','Activo'],['por_vencer','Por vencer'],['entrante','Entrante'],['atrasado','Atrasado'],['finalizado','Finalizado']], "pmCalSetFilter('status', this.value||null)")}
    ${pmFilterSelect('Plataforma','💳', fP, [['','Todas'],['contrato_directo','Directo'],['airbnb','Airbnb'],['padsplit','Padsplit'],['booking','Booking'],['vrbo','VRBO']], "pmCalSetFilter('platform', this.value||null)")}
    ${pmFilterSelect('Tipo','🛏', fT, [['','Todos'],['casa_completa','Casa'],['apartamento','Apartamento'],['estudio','Estudio'],['habitacion','Habitación']], "pmCalSetFilter('type', this.value||null)")}
    ${(fS||fP||fT)?`<button onclick="pmCalClearFilters()" class="text-[10px] text-amber-700 font-bold hover:underline">✕ Limpiar</button>`:''}
    <button onclick="pmCalToggleFullscreen()" class="ml-auto bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1" title="Ver el calendario más grande">${pmaState.calendarFullscreen?'✕ Salir':'⛶ Pantalla completa'}</button>
    <span class="flex items-center gap-2 text-[10px] text-slate-500">
      ${colorBy==='estado'
        ? `<span>🟩 Activo</span><span>🟠 Por vencer ≤${PM_CAL_VENCE_DIAS}d</span><span>🔵 Entrante</span><span>🟥 Atrasado</span><span>⬜ Finalizado</span>`
        : `<span class="italic">colores por canal/plataforma</span>`}
    </span>
  </div>`;
}

function pmRenderTimelineGrid(units) {
  if (!units.length) return '<div class="p-8 text-center text-slate-400 text-sm">Sin unidades para mostrar.</div>';
  const colW = 55;
  const labelW = 180;   // ancho columna fija izquierda (más ancho para 2 líneas)
  const rowH = 68;      // alto fijo que acomoda nombre en 2 líneas + dirección
  const startDate = new Date(pmaState.calendarTimelineStart + 'T00:00:00');
  const daysCount = pmaState.calendarTimelineDays;
  const days = Array.from({ length: daysCount }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date(); today.setHours(0,0,0,0);
  const todayIdx = days.findIndex(d => d.getTime() === today.getTime());
  const lateSet = new Set(pmLateBookings().map(b => b.id));
  const colorBy = pmaState.calendarColorBy || 'estado';
  const fStatus = pmaState.calendarFilterStatus, fPlat = pmaState.calendarFilterPlatform;
  const dows = ['D','L','Ma','Mi','J','V','S'];
  const monthLabels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const gridW = daysCount * colW;
  const totalW = labelW + gridW;
  const totalH = 60 + units.length * rowH;
  const platformLegend = [
    {key:'contrato_directo', label:'Contrato directo', color:'#10b981'},
    {key:'airbnb', label:'Airbnb', color:'#ec4899'},
    {key:'booking', label:'Booking', color:'#3b82f6'},
    {key:'vrbo', label:'VRBO', color:'#8b5cf6'},
    {key:'hospitable', label:'Hospitable', color:'#0ea5e9'},
    {key:'padsplit', label:'Padsplit', color:'#a855f7'},
    {key:'reserva_corta', label:'Reserva corta', color:'#f59e0b'},
    {key:'otro', label:'Otro', color:'#64748b'}
  ];

  return `
    <div style="position:relative;min-width:${totalW}px;">
      <!-- HEADER fila de fechas + label "Anuncio" izquierda -->
      <div class="flex sticky top-0 bg-white border-b-2 border-slate-200 z-20" style="height:60px;">
        <div style="width:${labelW}px;flex-shrink:0;padding:8px 12px;border-right:1px solid #e2e8f0;background:white;position:sticky;left:0;z-index:21;">
          <div style="font-size:9px;color:#94a3b8;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Anuncio</div>
          <div style="font-size:11px;color:#475569;font-weight:bold;margin-top:2px;">${units.length} ${units.length===1?'unidad':'unidades'}</div>
        </div>
        <div class="flex">
          ${days.map((d, i) => {
            const isToday = i === todayIdx;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const showMonth = i === 0 || d.getDate() === 1;
            return `<div style="width:${colW}px;border-right:1px solid #f1f5f9;${isWeekend?'background:#fafafa;':''}${isToday?'background:#fee2e2;':''};padding:6px 0;text-align:center;">
              ${showMonth ? `<div style="font-size:9px;color:#64748b;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">${monthLabels[d.getMonth()]}</div>` : '<div style="height:14px;"></div>'}
              <div style="font-size:10px;color:#94a3b8;">${dows[d.getDay()]}</div>
              <div style="font-size:13px;${isToday?'color:#dc2626;font-weight:bold;':'color:#334155;'}">${d.getDate()}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <!-- LÍNEA VERTICAL DE HOY (atraviesa todas las filas) -->
      ${todayIdx >= 0 ? `<div style="position:absolute;left:${labelW + todayIdx * colW + colW/2 - 1}px;top:60px;width:2px;height:${units.length * rowH}px;background:#dc2626;opacity:0.35;pointer-events:none;z-index:5;"></div>` : ''}
      <!-- FILAS DE UNIDADES -->
      ${units.map(unit => {
        const p = pmaState.properties.find(x => x.id === unit.property_id);
        const bks = pmMergedBookings(unit).filter(b => {
          if (!b.start_date) return false;
          // Mostrar TODAS excepto canceladas (incluye pendientes, reservadas, futuras)
          if (b.status === 'cancelado' || b.status === 'cancelled') return false;
          const s = new Date(b.start_date + 'T00:00:00');
          const e = b.end_date ? new Date(b.end_date + 'T00:00:00') : new Date(s.getTime() + 365*86400000);
          if (!(s <= days[daysCount-1] && e >= days[0])) return false;
          if (fPlat && b.booking_type !== fPlat) return false;                       // filtro plataforma
          if (fStatus && pmBookingCalState(b, lateSet).key !== fStatus) return false; // filtro estado
          return true;
        });
        const hasBookings = bks.length > 0;
        const icon = unit.unit_type==='casa_completa'?'🏡' : unit.unit_type==='estudio'?'🎨' : unit.unit_type==='apartamento'?'🏢':'🛏';
        const fullName = (unit.code||unit.name||'') + (unit._displaySuffix || '');
        const addrLine = (p?.name||'—') + (unit.target_rent ? ` · $${Number(unit.target_rent).toLocaleString()}` : '');
        return `<div class="flex relative hover:bg-slate-50 transition group" style="border-bottom:1px solid #e2e8f0;height:${rowH}px;align-items:center;">
          <!-- Columna fija izquierda (nombre en 2 líneas) -->
          <div onclick="pmaState.calendarSelectedUnitId='${unit.id}';pmRender()" title="${(fullName + ' — ' + (p?.name||'')).replace(/"/g,'&quot;')}" style="width:${labelW}px;flex-shrink:0;height:100%;padding:10px 12px;border-right:1px solid #e2e8f0;background:white;position:sticky;left:0;z-index:6;cursor:pointer;display:flex;align-items:center;gap:8px;" class="hover:bg-slate-50">
            <div style="font-size:18px;flex-shrink:0;">${icon}</div>
            <div style="min-width:0;flex:1;">
              <div class="pm-clamp2" style="font-size:13px;font-weight:600;color:#1e293b;">${fullName.replace(/</g,'&lt;')}</div>
              <div class="pm-clamp1" style="font-size:11px;color:#94a3b8;opacity:0.85;margin-top:1px;">${addrLine.replace(/</g,'&lt;')}</div>
            </div>
          </div>
          <!-- Celdas -->
          ${days.map((d, i) => {
            const isToday = i === todayIdx;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return `<div onclick="pmCreateBookingFromDay('${unit.id}', ${d.getFullYear()}, ${d.getMonth()}, ${d.getDate()})" style="width:${colW}px;border-right:1px solid #f1f5f9;${isWeekend?'background:#fafbfc;':''}${isToday?'background:rgba(254,226,226,0.4);':''};cursor:pointer;background-image:linear-gradient(135deg,transparent 49.5%,#e2e8f0 49.5%,#e2e8f0 50.5%,transparent 50.5%);"></div>`;
          }).join('')}
          ${!hasBookings ? `<div style="position:absolute;left:${labelW + 12}px;top:50%;transform:translateY(-50%);font-size:10px;color:#cbd5e1;font-style:italic;pointer-events:none;">Sin reservas en este período</div>` : ''}
          ${bks.map(b => {
            const s = new Date(b.start_date + 'T00:00:00');
            const e = b.end_date ? new Date(b.end_date + 'T00:00:00') : new Date(s.getTime() + 365*86400000);
            const startIdx = Math.max(0, Math.floor((s - days[0]) / 86400000));
            const endIdx = Math.min(daysCount - 1, Math.floor((e - days[0]) / 86400000));
            const leftPx = labelW + startIdx * colW + 2;
            const widthPx = (endIdx - startIdx + 1) * colW - 4;
            const colorByType = {contrato_directo:'#10b981',airbnb:'#ec4899',booking:'#3b82f6',vrbo:'#8b5cf6',hospitable:'#0ea5e9',padsplit:'#a855f7',reserva_corta:'#f59e0b',otro:'#64748b'};
            const stState = pmBookingCalState(b, lateSet);
            const bg = colorBy === 'estado' ? stState.color : (colorByType[b.booking_type] || colorByType.otro);
            const opacity = stState.key === 'finalizado' ? 0.7 : 1;
            const tenant = pmTenantName(b.tenant_id);
            const isSelected = pmaState.calendarSelectedBookingId === b.id;
            const platformIcon = {contrato_directo:'📝',airbnb:'🅰',booking:'🅱',vrbo:'V',hospitable:'H',padsplit:'P',reserva_corta:'⏱',otro:'•'}[b.booking_type] || '•';
            const initials = pmAvatarInitials(tenant);
            const showAmount = widthPx > 150;
            const showTenant = widthPx > 64;
            const showPlat = widthPx > 110;
            // Lado derecho: si está "por vencer" (modo estado) → countdown ⏳Nd; si no → icono plataforma.
            const rightBadge = (colorBy === 'estado' && stState.key === 'por_vencer' && widthPx > 88)
              ? `<span style="background:rgba(255,255,255,0.28);color:white;font-size:9px;font-weight:800;padding:1px 5px;border-radius:6px;flex-shrink:0;white-space:nowrap;" title="Vence en ${stState.days} días">⏳ ${stState.days}d</span>`
              : (showPlat ? `<span style="color:rgba(255,255,255,0.9);font-size:11px;flex-shrink:0;" title="${b.booking_type||''}">${platformIcon}</span>` : '');
            const tip = `${tenant}${b.reservation_code?` · ${b.reservation_code}`:''} · ${b.start_date||'?'} → ${b.end_date||'∞'} · $${Number(b.rent_amount||0).toLocaleString()} · ${stState.label}`;
            return `<div onclick="event.stopPropagation();pmaState.calendarSelectedBookingId='${b.id}';pmRender()" style="position:absolute;left:${leftPx}px;width:${widthPx}px;top:7px;bottom:7px;background:${bg};opacity:${opacity};border-radius:8px;padding:0 8px;display:flex;align-items:center;justify-content:space-between;gap:6px;cursor:pointer;box-shadow:${isSelected?'0 0 0 3px #fbbf24,':''} 0 1px 3px rgba(0,0,0,0.18);overflow:hidden;z-index:6;transition:transform 0.1s,box-shadow 0.1s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='${isSelected?'0 0 0 3px #fbbf24,':''} 0 4px 10px rgba(0,0,0,0.25)'" onmouseout="this.style.transform='';this.style.boxShadow='${isSelected?'0 0 0 3px #fbbf24,':''} 0 1px 3px rgba(0,0,0,0.18)'" title="${tip.replace(/"/g,'&quot;')}">
              <span style="color:white;font-size:11px;font-weight:bold;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;display:flex;align-items:center;gap:6px;min-width:0;">
                <span style="background:rgba(255,255,255,0.28);width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;letter-spacing:-0.5px;flex-shrink:0;border:1px solid rgba(255,255,255,0.35);">${initials}</span>
                <span style="overflow:hidden;text-overflow:ellipsis;">${showTenant ? tenant.replace(/</g,'&lt;') : ''}${showAmount ? ` · $${Number(b.rent_amount||0).toLocaleString()}` : ''}</span>
              </span>
              ${rightBadge}
            </div>`;
          }).join('')}
        </div>`;
      }).join('')}
      <!-- LEYENDA -->
      <div class="border-t border-slate-200 bg-slate-50 px-3 py-2 flex items-center gap-3 flex-wrap text-[10px]" style="position:sticky;bottom:0;z-index:7;">
        <span class="text-slate-500 font-bold uppercase tracking-wide">Plataforma:</span>
        ${platformLegend.map(p => `<span class="flex items-center gap-1.5"><span style="background:${p.color};width:10px;height:10px;border-radius:3px;display:inline-block;"></span><span class="text-slate-600">${p.label}</span></span>`).join('')}
        <span class="ml-auto text-slate-400">💡 Click en día vacío para nueva reserva · Click en barra para ver detalle</span>
      </div>
    </div>
  `;
}

function pmCalTimelineShift(deltaDays) {
  const start = new Date(pmaState.calendarTimelineStart + 'T00:00:00');
  start.setDate(start.getDate() + deltaDays);
  pmaState.calendarTimelineStart = start.toISOString().slice(0,10);
  pmRender();
}
window.pmCalTimelineShift = pmCalTimelineShift;

function pmRenderBookingSidePanel(bookingId) {
  const b = pmaState.bookings.find(x => x.id === bookingId);
  if (!b) return '';
  const tenant = pmaState.tenants.find(t => t.id === b.tenant_id);
  const unit = pmaState.units.find(u => u.id === b.unit_id);
  const property = pmaState.properties.find(p => p.id === b.property_id);
  const dur = (b.start_date && b.end_date) ? Math.floor((new Date(b.end_date) - new Date(b.start_date)) / 86400000) + 1 : null;
  const isPast = b.end_date && new Date(b.end_date) < new Date();
  const tagLabel = isPast ? 'Huésped anterior' : (['confirmado','reservada'].includes(b.status) ? 'Próximo huésped' : 'Huésped actual');
  const tagColor = isPast ? 'bg-slate-200 text-slate-700' : (['confirmado','reservada'].includes(b.status) ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800');
  const platformLabel = {contrato_directo:'Contrato directo',airbnb:'Airbnb',vrbo:'VRBO',booking:'Booking',hospitable:'Hospitable',padsplit:'Padsplit',reserva_corta:'Reserva corta',otro:'Otro'}[b.booking_type] || b.booking_type;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
  return `
    <div class="border-l border-slate-200 bg-white flex flex-col" style="width:340px;flex-shrink:0;overflow-y:auto;">
      <div class="p-3 flex items-start justify-between border-b border-slate-200">
        <button onclick="pmaState.calendarSelectedBookingId=null;pmRender()" class="text-slate-500 hover:text-slate-900 text-xl font-bold">×</button>
      </div>
      <div class="p-4 space-y-3">
        <div>
          <h3 class="text-xl font-bold text-slate-900">Reservación</h3>
          <div class="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span class="${tagColor} px-2 py-0.5 rounded font-bold uppercase text-[9px]">${tagLabel}</span>
            <span>· ${dur||'—'} ${dur===1?'noche':'noches'}</span>
            <span>· ${platformLabel}</span>
          </div>
        </div>
        <div class="flex items-center gap-3 py-3 border-y border-slate-100">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-bold text-lg">${(tenant?.full_name||'?').charAt(0).toUpperCase()}</div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm text-slate-900 truncate">${(tenant?.full_name || 'Sin inquilino').replace(/</g,'&lt;')}</div>
            <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              ${tenant?.phone ? `<a href="https://wa.me/${tenant.phone.replace(/\D/g,'')}" target="_blank" class="text-emerald-600 hover:underline">💬 WhatsApp</a>` : ''}
              ${tenant?.email ? `<a href="mailto:${tenant.email}" class="text-blue-600 hover:underline">📧 Email</a>` : ''}
            </div>
          </div>
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between py-2 border-b border-slate-100"><span class="text-slate-500">Llegada</span><strong class="text-slate-900">${fmtDate(b.start_date)}</strong></div>
          <div class="flex justify-between py-2 border-b border-slate-100"><span class="text-slate-500">Salida</span><strong class="text-slate-900">${fmtDate(b.end_date) || '∞'}</strong></div>
          <div class="flex justify-between py-2 border-b border-slate-100"><span class="text-slate-500">Renta</span><strong class="text-emerald-700">\$${Number(b.rent_amount||0).toLocaleString()}/${b.rent_period||'mes'}</strong></div>
          ${b.deposit ? `<div class="flex justify-between py-2 border-b border-slate-100"><span class="text-slate-500">Depósito</span><strong class="text-slate-900">\$${Number(b.deposit).toLocaleString()}</strong></div>` : ''}
          <div class="flex justify-between py-2 border-b border-slate-100"><span class="text-slate-500">Propiedad</span><span class="text-slate-700 text-right text-xs">${(property?.name||'—').replace(/</g,'&lt;')}</span></div>
          <div class="flex justify-between py-2 border-b border-slate-100"><span class="text-slate-500">Unidad</span><span class="text-slate-700 text-right text-xs"><span class="font-mono bg-slate-100 px-1 rounded">${(unit?.code||'—').replace(/</g,'&lt;')}</span></span></div>
        </div>
        ${b.notes ? `<div class="bg-slate-50 border border-slate-200 rounded p-2 text-xs"><div class="font-bold text-slate-700 mb-1">Notas</div><div class="text-slate-600 whitespace-pre-wrap">${(b.notes||'').replace(/</g,'&lt;')}</div></div>` : ''}
        <button onclick="pmaState.calendarSelectedBookingId=null;pmEditBooking('${b.id}')" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3 rounded-lg">Ver itinerario completo</button>
        ${b.contract_url ? `<a href="${b.contract_url}" target="_blank" class="block text-center w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 font-bold text-sm py-2 rounded-lg">📄 Ver contrato</a>` : ''}
      </div>
    </div>
  `;
}

function pmRenderSingleListing(unit, allUnits) {
  const property = pmaState.properties.find(p => p.id === unit.property_id);
  const monthsToShow = [
    { year: pmaState.calendarYear, month: pmaState.calendarMonth },
    { year: pmaState.calendarMonth === 11 ? pmaState.calendarYear + 1 : pmaState.calendarYear, month: (pmaState.calendarMonth + 1) % 12 }
  ];
  const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `
    <div class="flex bg-white" style="height: calc(75vh - 60px); margin: -4px;">
      <div class="border-r border-slate-200 bg-white flex flex-col" style="width:90px;flex-shrink:0;overflow-y:auto;">
        ${allUnits.map(u => {
          const icon = u.unit_type==='casa_completa'?'🏡' : u.unit_type==='estudio'?'🎨' : u.unit_type==='apartamento'?'🏢':'🛏';
          const isSelected = u.id === unit.id;
          return `<button onclick="pmaState.calendarSelectedUnitId='${u.id}';pmRender()" class="w-full p-2 hover:bg-slate-50 border-b border-slate-100 flex flex-col items-center gap-1 transition ${isSelected?'bg-slate-100':''}">
            <div class="w-14 h-14 rounded-lg bg-gradient-to-br ${isSelected?'from-emerald-500 to-emerald-700 ring-2 ring-emerald-400':'from-slate-700 to-slate-900'} text-white flex items-center justify-center text-2xl flex-shrink-0">${icon}</div>
            <div class="text-[9px] text-slate-600 truncate w-full text-center">${(u.code||'').replace(/</g,'&lt;')}</div>
          </button>`;
        }).join('')}
      </div>
      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 bg-white z-20">
          <div class="flex items-center gap-3">
            <button onclick="pmaState.calendarSelectedUnitId=null;pmRender()" class="text-slate-500 hover:text-slate-900 text-sm font-bold">↩ Volver</button>
            <div>
              <div class="text-xs text-slate-500">Anuncio</div>
              <div class="font-bold text-slate-900">${(property?.name||'').replace(/</g,'&lt;')} · ${(unit.name||unit.code||'').replace(/</g,'&lt;')}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="pmCalSingleNavMonth(-1)" class="bg-white border border-slate-300 rounded-full w-9 h-9 hover:bg-slate-50 text-sm font-bold">←</button>
            <button onclick="pmaState.calendarMonth=new Date().getMonth();pmaState.calendarYear=new Date().getFullYear();pmRender()" class="bg-white border border-slate-300 rounded px-3 py-2 hover:bg-slate-50 text-xs font-bold">Hoy</button>
            <button onclick="pmCalSingleNavMonth(1)" class="bg-white border border-slate-300 rounded-full w-9 h-9 hover:bg-slate-50 text-sm font-bold">→</button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-3">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            ${monthsToShow.map(({year, month}) => pmRenderMonthAirbnbStyle(unit, year, month, monthNames)).join('')}
          </div>
        </div>
      </div>
      <div class="border-l border-slate-200 bg-white p-4 flex flex-col" style="width:280px;flex-shrink:0;overflow-y:auto;">
        <h3 class="text-lg font-bold text-slate-900 mb-3">${(unit.name||unit.code||'').replace(/</g,'&lt;')}</h3>
        <div class="space-y-2 text-sm">
          <div class="border-b border-slate-100 pb-2"><div class="text-[10px] uppercase text-slate-500 font-bold">Renta objetivo</div><div class="text-emerald-700 font-bold text-lg">\$${Number(unit.target_rent||0).toLocaleString()}</div><div class="text-[10px] text-slate-500">por mes</div></div>
          <div class="border-b border-slate-100 pb-2"><div class="text-[10px] uppercase text-slate-500 font-bold">Tipo</div><div class="text-sm">${unit.unit_type==='casa_completa'?'🏡 Casa completa':unit.unit_type==='estudio'?'🎨 Estudio':unit.unit_type==='apartamento'?'🏢 Apartamento':'🛏 Habitación'}</div></div>
          ${unit.bath_type ? `<div class="border-b border-slate-100 pb-2"><div class="text-[10px] uppercase text-slate-500 font-bold">Baño</div><div class="text-sm capitalize">${unit.bath_type.replace(/_/g,' ')}</div></div>` : ''}
          <div class="border-b border-slate-100 pb-2"><div class="text-[10px] uppercase text-slate-500 font-bold">Código</div><div class="text-sm font-mono bg-slate-100 px-2 py-1 rounded inline-block">${(unit.code||'—').replace(/</g,'&lt;')}</div></div>
          <div><div class="text-[10px] uppercase text-slate-500 font-bold">Propiedad</div><div class="text-xs text-slate-700">${(property?.name||'—').replace(/</g,'&lt;')}</div><div class="text-[10px] text-slate-500">${(property?.address||'').replace(/</g,'&lt;')}</div></div>
        </div>
        <div class="mt-4 space-y-2">
          <button onclick="pmEditUnit('${unit.id}','${unit.property_id}')" class="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 text-xs font-bold py-2 rounded">✏️ Editar unidad</button>
          <button onclick="pmEditBooking(null,'${unit.id}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded">+ Nueva reserva</button>
        </div>
      </div>
      ${pmaState.calendarSelectedBookingId ? pmRenderBookingSidePanel(pmaState.calendarSelectedBookingId) : ''}
    </div>
  `;
}

function pmCalSingleNavMonth(delta) {
  let m = pmaState.calendarMonth + delta;
  let y = pmaState.calendarYear;
  while (m < 0) { m += 12; y -= 1; }
  while (m > 11) { m -= 12; y += 1; }
  pmaState.calendarMonth = m;
  pmaState.calendarYear = y;
  pmRender();
}
window.pmCalSingleNavMonth = pmCalSingleNavMonth;

function pmRenderMonthAirbnbStyle(unit, year, month, monthNames) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysCount = lastDay.getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const today = new Date(); today.setHours(0,0,0,0);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(d);
  const bks = pmMergedBookings(unit).filter(b => {
    if (b.status === 'cancelado' || b.status === 'cancelled') return false;
    if (!b.start_date) return false;
    const s = new Date(b.start_date);
    const e = b.end_date ? new Date(b.end_date) : firstDay;
    return s <= lastDay && e >= firstDay;
  });

  // Paleta con bg suave + texto color para no saturar visualmente
  const colorByType = {
    contrato_directo: { bg: 'bg-emerald-100', text: 'text-emerald-900', dot: 'bg-emerald-500', name: 'Contrato' },
    airbnb:           { bg: 'bg-rose-100',    text: 'text-rose-900',    dot: 'bg-rose-500',    name: 'Airbnb' },
    booking:          { bg: 'bg-blue-100',    text: 'text-blue-900',    dot: 'bg-blue-500',    name: 'Booking' },
    vrbo:             { bg: 'bg-violet-100',  text: 'text-violet-900',  dot: 'bg-violet-500',  name: 'VRBO' },
    hospitable:       { bg: 'bg-sky-100',     text: 'text-sky-900',     dot: 'bg-sky-500',     name: 'Hospitable' },
    padsplit:         { bg: 'bg-fuchsia-100', text: 'text-fuchsia-900', dot: 'bg-fuchsia-500', name: 'Padsplit' },
    reserva_corta:    { bg: 'bg-amber-100',   text: 'text-amber-900',   dot: 'bg-amber-500',   name: 'Corta' },
    otro:             { bg: 'bg-slate-100',   text: 'text-slate-900',   dot: 'bg-slate-500',   name: 'Otro' }
  };

  return `
    <div class="mb-4">
      <!-- Header del mes — pequeño y sutil -->
      <div class="flex items-baseline justify-between border-b border-slate-200 pb-2 mb-2">
        <h2 class="text-base font-bold text-slate-900 capitalize">${monthNames[month]} <span class="text-slate-400 font-normal text-xs">${year}</span></h2>
        ${bks.length ? `<div class="text-[10px] text-slate-500">${bks.length} ${bks.length===1?'reserva':'reservas'} este mes</div>` : ''}
      </div>
      <!-- Días de la semana -->
      <div class="grid grid-cols-7 gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">
        <div class="text-center">lun</div><div class="text-center">mar</div><div class="text-center">mié</div><div class="text-center">jue</div><div class="text-center">vie</div><div class="text-center">sáb</div><div class="text-center">dom</div>
      </div>
      <!-- Grid de cards compactas -->
      <div class="grid grid-cols-7 gap-1">
        ${cells.map(d => {
          if (!d) return '<div></div>';
          const dt = new Date(year, month, d);
          const isPast = dt < today;
          const isToday = dt.getTime() === today.getTime();
          const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
          const bk = bks.find(b => {
            const s = new Date(b.start_date);
            const e = b.end_date ? new Date(b.end_date) : firstDay;
            return dt >= s && dt <= e;
          });
          // ¿Es el primer día de la reserva? → mostrar nombre del huésped
          const isBkStart = bk && new Date(bk.start_date).toDateString() === dt.toDateString();
          const isBkEnd = bk && bk.end_date && new Date(bk.end_date).toDateString() === dt.toDateString();
          const c = bk ? (colorByType[bk.booking_type] || colorByType.otro) : null;
          const tenant = bk ? pmTenantName(bk.tenant_id) : '';
          // Bordes redondeados: izquierda si inicio, derecha si fin
          const roundClass = bk
            ? `${isBkStart?'rounded-l-md':''} ${isBkEnd?'rounded-r-md':''}`.trim() || 'rounded-none'
            : 'rounded-md';

          if (bk) {
            return `<button title="${tenant} · $${Number(bk.rent_amount||0).toLocaleString()}" onclick="event.stopPropagation();pmaState.calendarSelectedBookingId='${bk.id}';pmRender()" class="${c.bg} ${c.text} ${roundClass} ${isToday?'ring-2 ring-red-500':''} hover:brightness-95 transition cursor-pointer relative overflow-hidden text-left ${isPast?'opacity-60':''}" style="height:46px;padding:3px 5px;">
              <div class="flex items-start justify-between leading-none">
                <span class="text-[10px] font-bold">${d}</span>
                ${isBkStart ? `<span class="${c.dot} w-1.5 h-1.5 rounded-full"></span>` : ''}
              </div>
              ${isBkStart ? `<div class="text-[8px] font-bold truncate mt-0.5 leading-tight">${tenant.slice(0,12).replace(/</g,'&lt;')}</div>` : ''}
            </button>`;
          }
          // Día libre: card blanca con número y precio sutil
          const dayNumColor = isPast ? 'text-slate-300 line-through' : (isWeekend ? 'text-slate-500' : 'text-slate-800');
          return `<button title="Crear reserva el ${d}" onclick="pmCreateBookingFromDay('${unit.id}', ${year}, ${month}, ${d})" class="bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 ${roundClass} ${isToday?'ring-2 ring-red-500 border-red-300':''} ${isWeekend?'bg-slate-50/60':''} transition cursor-pointer text-left" style="height:46px;padding:3px 5px;">
            <div class="text-[10px] font-bold ${dayNumColor} leading-none">${d}</div>
            ${isToday ? '<div class="text-[7px] text-red-600 font-bold mt-1 uppercase leading-none">Hoy</div>' : (unit.target_rent && !isPast ? `<div class="text-[8px] text-slate-400 mt-1 leading-none">$${Math.round(unit.target_rent/30)}</div>` : '')}
          </button>`;
        }).join('')}
      </div>
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
          const allBks = pmMergedBookings(unit).filter(b => {
            // Mostrar TODAS excepto canceladas (incluye pendientes, reservadas, futuras)
          if (b.status === 'cancelado' || b.status === 'cancelled') return false;
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
                    airbnb:            'background:linear-gradient(135deg,#ec4899,#db2777);',
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
          <span><span style="display:inline-block;width:10px;height:10px;background:linear-gradient(135deg,#ec4899,#db2777);border-radius:2px;margin-right:3px;vertical-align:middle;"></span>Airbnb</span>
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
    reservada: 'bg-amber-100 text-amber-800',
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
        <button onclick="pmBackToPm()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">↩ Volver al calendario</button>
        ${tenant?.phone ? `<a href="https://wa.me/${(tenant.phone||'').replace(/\\D/g,'')}" target="_blank" class="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded text-center">💬 WhatsApp</a>` : ''}
        ${b.contract_url ? `<a href="${b.contract_url}" target="_blank" class="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded text-center">📄 Contrato</a>` : ''}
        <button onclick="closeModal();pmEditBooking('${b.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">✏️ Editar reserva</button>
      </div>
    </div>
  `);
}
window.pmShowBookingDetail = pmShowBookingDetail;

// Helper · cierra el modal hijo y reabre el módulo PM (no destruye toda la sesión)
function pmBackToPm() {
  closeModal();
  setTimeout(() => openPmSystem(), 80);
}
window.pmBackToPm = pmBackToPm;

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
const PM_PLATFORM_LABEL = { contrato_directo: 'Contrato directo', airbnb: 'Airbnb', booking: 'Booking', vrbo: 'VRBO', hospitable: 'Hospitable', padsplit: 'Padsplit', reserva_corta: 'Reserva corta', otro: 'Otro' };

// Dropdown de filtro reutilizable (estilo Mercury, dorado cuando tiene valor)
//   options: [[value,label],...]; onchangeExpr recibe this.value (usar ||null afuera)
function pmFilterSelect(label, icon, currentVal, options, onchangeExpr) {
  const has = currentVal != null && currentVal !== '' && currentVal !== 'all';
  return `<div class="pm-filter-dropdown"><label>${icon?icon+' ':''}${label}</label>
    <select onchange="${onchangeExpr}" class="pm-filter-select${has?' has-value':''}">
      ${options.map(([v,l]) => `<option value="${v}" ${String(currentVal==null?'':currentVal)===String(v)?'selected':''}>${(l||'').replace(/</g,'&lt;')}</option>`).join('')}
    </select></div>`;
}
// Opciones de mes para dropdowns (últimos 12 meses + rangos)
function pmMonthOptions(withRanges = true) {
  const now = new Date(); const opts = [];
  for (let i=0;i<12;i++){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; opts.push([ym, `${PM_ES_MONTHS[d.getMonth()].charAt(0).toUpperCase()+PM_ES_MONTHS[d.getMonth()].slice(1)} ${d.getFullYear()}`]); }
  if (withRanges) opts.push(['ytd','YTD '+now.getFullYear()], ['last-3m','Últimos 3 meses'], ['last-6m','Últimos 6 meses'], ['last-12m','Últimos 12 meses'], ['all-time','Todo el histórico']);
  return opts;
}
// Chip de filtro reutilizable (dorado Mercury cuando activo)
function pmChip(active, onclick, label, count) {
  return `<button onclick="${onclick}" class="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${active?'text-white':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}" style="${active?'background:#d4af37;border-color:#d4af37':''}">${label}${count!=null?` <span class="opacity-70">${count}</span>`:''}</button>`;
}
function pmUnitTypeLabel(t) {
  return ({ casa_completa:'Casa Completa', apartamento:'Apartamento', estudio:'Estudio', habitacion:'Habitación' })[t] || t || '—';
}

// ── Recurrencia de pago (deriva de booking.payment_day) ──
function pmRecurrenceOf(paymentDay) {
  const s = (paymentDay || '').toLowerCase();
  if (!s) return { kind: 'mensual', label: '🗓 Mensual' };
  if (/estad|airbnb|noche/.test(s)) return { kind: 'airbnb', label: '🏖 Airbnb' };
  if (/dos\s*seman|quincen|biweek|cada.?2.?seman|2\s*seman/.test(s)) return { kind: 'quincenal', label: '⏱ Quincenal' };
  if (/primeros?\s*3|1\s*-\s*3|3\s*primeros/.test(s)) return { kind: 'mensual', label: '🗓 Mensual (1-3)' };
  if (/primeros?\s*5|1\s*-\s*5|5\s*primeros/.test(s)) return { kind: 'mensual', label: '🗓 Mensual (1-5)' };
  const dayM = s.match(/(\d{1,2})\s*de\s*cada\s*mes/) || s.match(/d[ií]a\s*(\d{1,2})/) || s.match(/^\s*(\d{1,2})\s*$/);
  if (dayM) return { kind: 'mensual', label: `🗓 Mensual día ${dayM[1]}` };
  return { kind: 'mensual', label: '🗓 Mensual' };
}
function pmRecurrenceDay(paymentDay) {
  const s = (paymentDay || '').toLowerCase();
  const m = s.match(/(\d{1,2})\s*de\s*cada\s*mes/) || s.match(/d[ií]a\s*(\d{1,2})/) || s.match(/^\s*(\d{1,2})\s*$/) || s.match(/primeros?\s*(\d{1,2})/);
  if (m) return Math.min(28, Math.max(1, parseInt(m[1], 10)));
  return 1;
}
// Estatus de pago del inquilino (al día / próximo / atrasado / sin contrato)
// Estatus de pago del inquilino (al día / próximo / atrasado / sin contrato).
// "Atrasado" SOLO por deuda de balance en períodos cerrados (pmTenantDebt) — el
// día de vencimiento solo informa "próximo cobro", nunca mete a nadie en atrasados.
function pmTenantPayStatus(booking) {
  if (!booking) return { key: 'sincontrato', label: '💤 Sin contrato', cls: 'text-slate-400 bg-slate-50' };
  const rec = pmRecurrenceOf(booking.payment_day);
  if (rec.kind === 'airbnb') return { key: 'aldia', label: '✅ Al día', cls: 'text-emerald-700 bg-emerald-50' };
  const debe = pmTenantDebt(booking.tenant_id);
  if (debe > 0) return { key: 'atrasado', label: `🔴 Atrasado · debe $${debe.toLocaleString()}`, cls: 'text-red-700 bg-red-50' };
  // ¿El período del mes en curso ya quedó cubierto (balance ≤ 0)? → al día.
  const ymNow = pmHoyYm();
  const cubierto = pmaState.payments.some(p => p.type === 'ingreso' && pmBillYm(p) === ymNow &&
    (p.booking_id === booking.id || (booking.tenant_id && p.tenant_id === booking.tenant_id)) &&
    (pmPayBalance(p) == null || pmPayBalance(p) <= 0));
  if (cubierto) return { key: 'aldia', label: '✅ Al día', cls: 'text-emerald-700 bg-emerald-50' };
  const today = new Date();
  const tIn = pmaState.tenants.find(x => x.id === booking.tenant_id);
  const day = (tIn && tIn.vencimiento_pago) ? pmDiaVenc(tIn.vencimiento_pago) : pmRecurrenceDay(booking.payment_day);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(today.getFullYear(), today.getMonth(), Math.min(day, 28));
  const diff = Math.round((due - t0) / 86400000);
  if (diff < 0) return { key: 'pendiente', label: '⏳ Pendiente del mes', cls: 'text-amber-700 bg-amber-50' };
  if (diff <= 7) return { key: 'proximo', label: `⏰ Próximo (${diff}d)`, cls: 'text-amber-700 bg-amber-50' };
  return { key: 'aldia', label: '✅ Al día', cls: 'text-emerald-700 bg-emerald-50' };
}
// Fecha esperada del próximo cobro de una reserva activa (para "Próximos cobros")
function pmNextDueDate(booking) {
  const rec = pmRecurrenceOf(booking.payment_day);
  if (rec.kind === 'airbnb') return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const day = pmRecurrenceDay(booking.payment_day);
  let due = new Date(today.getFullYear(), today.getMonth(), Math.min(day, 28));
  // si la fecha de este mes ya pasó hace +3 días, usar el próximo mes
  if ((due - today) / 86400000 < -3) due = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(day, 28));
  return due;
}

function pmBookingsInitFilters() {
  if (pmaState.bookingsFiltersLoaded) return;
  pmaState.bookingsFiltersLoaded = true;
  try {
    const g = (k) => { const v = localStorage.getItem(k); return v === '' ? null : v; };
    if (localStorage.getItem('pm_reservas_filter_property') !== null) pmaState.bookingsFilterProperty = g('pm_reservas_filter_property');
    if (localStorage.getItem('pm_reservas_filter_platform') !== null) pmaState.bookingsPlatformFilter = g('pm_reservas_filter_platform');
    if (localStorage.getItem('pm_reservas_filter_status') !== null) pmaState.bookingsFilterStatus = localStorage.getItem('pm_reservas_filter_status') || 'all';
    if (localStorage.getItem('pm_reservas_filter_search') !== null) pmaState.bookingsSearch = localStorage.getItem('pm_reservas_filter_search') || '';
  } catch (e) { /* localStorage no disponible */ }
}
function pmBookingsSetFilter(key, value) {
  const map = { property: 'bookingsFilterProperty', platform: 'bookingsPlatformFilter', status: 'bookingsFilterStatus' };
  pmaState[map[key]] = value;
  try { localStorage.setItem('pm_reservas_filter_' + key, value == null ? '' : value); } catch (e) {}
  pmRender();
}
window.pmBookingsSetFilter = pmBookingsSetFilter;
function pmBookingsClearFilters() {
  pmaState.bookingsFilterProperty = null;
  pmaState.bookingsPlatformFilter = null;
  pmaState.bookingsFilterStatus = 'all';
  pmaState.bookingsSearch = '';
  try { ['property','platform','status','search'].forEach(k => localStorage.removeItem('pm_reservas_filter_' + k)); } catch (e) {}
  pmRender();
}
window.pmBookingsClearFilters = pmBookingsClearFilters;
function pmBookingsHasFilters() {
  return !!(pmaState.bookingsFilterProperty || pmaState.bookingsPlatformFilter
    || (pmaState.bookingsFilterStatus && pmaState.bookingsFilterStatus !== 'all') || (pmaState.bookingsSearch || '').trim());
}

// Estatus por fechas (date-based)
function pmBookingStatusKind(b, today) {
  if (b.status === 'cancelado') return 'cancelled';
  const start = b.start_date || '', end = b.end_date || '';
  if (end && end < today) return 'past';
  if (start && start > today) return 'upcoming';
  return 'active'; // start<=hoy<=end (o sin end)
}

// Lista filtrada (casa AND fuente AND estatus AND búsqueda)
function pmBookingsFilteredAll() {
  const today = new Date().toISOString().slice(0,10);
  const q = (pmaState.bookingsSearch || '').toLowerCase().trim();
  const propF = pmaState.bookingsFilterProperty;
  const platF = pmaState.bookingsPlatformFilter;
  const statF = pmaState.bookingsFilterStatus || 'all';
  return pmaState.bookings.filter(b => {
    if (propF && b.property_id !== propF) return false;
    if (platF && b.booking_type !== platF) return false;
    if (statF !== 'all') {
      const kind = pmBookingStatusKind(b, today);
      if (statF === 'expiring') {
        if (kind !== 'active' || !b.end_date) return false;
        const d = Math.floor((new Date(b.end_date) - new Date(today)) / 86400000);
        if (!(d >= 0 && d <= 30)) return false;
      } else if (kind !== statF) return false;
    }
    if (q) {
      const u = pmaState.units.find(x => x.id === b.unit_id);
      const p = pmaState.properties.find(x => x.id === b.property_id);
      const t = pmaState.tenants.find(t => t.id === b.tenant_id);
      const hay = `${t?.full_name||''} ${p?.name||''} ${u?.code||''} ${u?.name||''} ${b.reservation_code||''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function pmRenderBookingRow(b) {
  const today = new Date().toISOString().slice(0,10);
  const todayDate = new Date(today);
  const u = pmaState.units.find(x => x.id === b.unit_id);
  const p = pmaState.properties.find(x => x.id === b.property_id);
  const t = pmaState.tenants.find(t => t.id === b.tenant_id);
  const colorByType = { contrato_directo: 'emerald', airbnb: 'rose', booking: 'blue', vrbo: 'violet', hospitable: 'sky', reserva_corta: 'amber', padsplit: 'violet', otro: 'slate' };
  const col = colorByType[b.booking_type] || 'slate';
  const daysLeft = b.end_date ? Math.floor((new Date(b.end_date) - todayDate) / 86400000) : null;
  const venceBadge = (daysLeft != null && daysLeft >= 0 && daysLeft <= 30)
    ? `<span class="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold animate-pulse">⏰ Vence en ${daysLeft}d</span>`
    : (daysLeft != null && daysLeft < 0 && b.status !== 'finalizado')
      ? `<span class="text-[10px] bg-red-100 text-red-900 px-1.5 py-0.5 rounded font-bold">⚠ Vencida hace ${-daysLeft}d</span>` : '';
  const durDays = (b.start_date && b.end_date) ? Math.floor((new Date(b.end_date) - new Date(b.start_date)) / 86400000) + 1 : null;
  const durLabel = durDays ? (durDays >= 30 ? `${Math.round(durDays/30)} ${Math.round(durDays/30)===1?'mes':'meses'}` : `${durDays}d`) : '';
  const code = b.reservation_code || null;
  return `
    <div class="border border-slate-200 rounded-lg p-3 hover:border-[#d4af37] hover:shadow-sm transition group bg-white">
      <div class="flex items-start justify-between gap-2 flex-wrap">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            ${code ? `<button onclick="event.stopPropagation();pmCopyText('${code}')" title="Copiar código" class="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 hover:bg-[#d4af37]/20 px-1.5 py-0.5 rounded">${code} ⧉</button>` : ''}
            <span class="text-[10px] uppercase bg-${col}-100 text-${col}-800 px-1.5 py-0.5 rounded font-bold">${PM_PLATFORM_LABEL[b.booking_type] || b.booking_type}</span>
            <span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase">${b.status}</span>
            ${venceBadge}
          </div>
          <div class="flex items-center gap-2 flex-wrap mt-1 cursor-pointer" onclick="pmEditBooking('${b.id}')">
            <strong class="text-sm text-slate-900 pm-tenant-name" title="${pmTenantName(b.tenant_id).replace(/"/g,'&quot;')}">${pmTenantName(b.tenant_id)}</strong>
          </div>
          <div class="text-[11px] text-slate-600 mt-1 flex items-center gap-2 flex-wrap cursor-pointer" onclick="pmEditBooking('${b.id}')">
            <span>📅 ${b.start_date||'?'} → ${b.end_date||'∞'}${durLabel?` <span class="text-slate-400">(${durLabel})</span>`:''}</span>
            <span>·</span>
            <span>🏠 ${(p?.name||'').replace(/</g,'&lt;').slice(0,30)}</span>
            <span>·</span>
            <span>🛏 ${((u?.code||u?.name||'')).replace(/</g,'&lt;')}</span>
          </div>
        </div>
        <div class="text-right flex items-center gap-1.5 flex-shrink-0">
          ${(b.status !== 'finalizado' && b.status !== 'cancelado') ? `<button onclick="event.stopPropagation();pmGenerateWelcomeGuide('${b.property_id}'${b.unit_id ? `,'${b.unit_id}'` : ''})" title="Generar Guía de Bienvenida (PDF) para esta reserva" class="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-2 py-1.5 rounded">📄 Guía</button>` : ''}
          ${t?.phone ? `<a href="https://wa.me/${t.phone.replace(/\D/g,'')}" target="_blank" onclick="event.stopPropagation()" title="WhatsApp ${t.phone}" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded text-sm">💬</a>` : ''}
          <button onclick="event.stopPropagation();pmMoveBooking('${b.id}')" title="Mover de unidad" class="bg-slate-50 hover:bg-slate-100 text-slate-600 p-1.5 rounded text-sm">↔</button>
          <div class="cursor-pointer" onclick="pmEditBooking('${b.id}')">
            <div class="text-sm font-bold text-emerald-700">$${Number(b.rent_amount||0).toLocaleString()}</div>
            <div class="text-[10px] text-slate-500">/${b.rent_period||'mes'}</div>
          </div>
        </div>
      </div>
    </div>`;
}

function pmBookingsListHtml() {
  const today = new Date().toISOString().slice(0,10);
  const filtered = pmBookingsFilteredAll();
  const activeOrFuture = filtered.filter(b => (b.end_date || '9999') >= today && b.status !== 'cancelado')
    .sort((a,b) => (b.start_date||'').localeCompare(a.start_date||''));
  const pastOrFinished = filtered.filter(b => (b.end_date && b.end_date < today) || b.status === 'finalizado' || b.status === 'cancelado')
    .sort((a,b) => (b.start_date||'').localeCompare(a.start_date||''));
  return `
    <div>
      <div class="text-[10px] font-bold uppercase text-slate-700 mb-2 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Actuales y futuras (${activeOrFuture.length})
      </div>
      ${activeOrFuture.length ? `<div class="space-y-2">${activeOrFuture.map(pmRenderBookingRow).join('')}</div>` : '<div class="text-xs text-slate-400 italic px-3 py-6 text-center bg-slate-50 rounded-lg">Sin reservas que matcheen tu búsqueda/filtro.</div>'}
    </div>
    ${pastOrFinished.length ? `
      <div>
        <div class="text-[10px] font-bold uppercase text-slate-700 mb-2 mt-4 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-slate-400"></span> Pasadas / finalizadas (${pastOrFinished.length}) ${pastOrFinished.length > 30 ? '<span class="opacity-50">— mostrando 30</span>' : ''}
        </div>
        <div class="space-y-2 opacity-60">${pastOrFinished.slice(0, 30).map(pmRenderBookingRow).join('')}</div>
      </div>` : ''}
  `;
}

// Live search SIN re-render total (el input vive fuera del container reescrito)
function pmBookingsSearchInput(value) {
  pmaState.bookingsSearch = value;
  try { localStorage.setItem('pm_reservas_filter_search', value || ''); } catch (e) {}
  clearTimeout(window.__pmBookSearchT);
  window.__pmBookSearchT = setTimeout(() => {
    const list = document.getElementById('pm-res-list');
    if (list) list.innerHTML = pmBookingsListHtml();
    const cnt = document.getElementById('pm-res-count');
    if (cnt) cnt.innerHTML = pmBookingsCountLabel();
    const clr = document.getElementById('pm-res-clearx');
    if (clr) clr.style.display = value ? '' : 'none';
  }, 150);
}
window.pmBookingsSearchInput = pmBookingsSearchInput;
function pmBookingsCountLabel() {
  const total = pmaState.bookings.length;
  const shown = pmBookingsFilteredAll().length;
  return pmBookingsHasFilters()
    ? `Mostrando <strong>${shown}</strong> de ${total}`
    : `${total} reservas`;
}

function pmCopyText(text) {
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => { if (window.toast) toast('Copiado: ' + text); }).catch(()=>{});
  else { try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); if (window.toast) toast('Copiado'); } catch (e) {} }
}
window.pmCopyText = pmCopyText;

function pmRenderBookings() {
  pmBookingsInitFilters();
  const all = pmaState.bookings;
  const searchQ = (pmaState.bookingsSearch || '');
  const propF = pmaState.bookingsFilterProperty;
  const platF = pmaState.bookingsPlatformFilter;
  const statF = pmaState.bookingsFilterStatus || 'all';

  // Conteos por fuente (booking_type) para chips
  const platformCounts = {};
  all.forEach(b => { platformCounts[b.booking_type] = (platformCounts[b.booking_type] || 0) + 1; });
  const platforms = Object.keys(platformCounts).sort((a,b) => platformCounts[b] - platformCounts[a]);

  // Casas con reservas (chips)
  const propsWithBookings = pmaState.properties.filter(p => all.some(b => b.property_id === p.id));

  const chip = (active, onclick, label, count) => `
    <button onclick="${onclick}" class="px-2.5 py-1 rounded-full whitespace-nowrap border ${active?'text-white':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}" style="${active?'background:#d4af37;border-color:#d4af37':''}">${label}${count!=null?` <span class="opacity-70">${count}</span>`:''}</button>`;

  const statuses = [['all','Todas'],['active','Activas'],['upcoming','Próximas'],['past','Pasadas'],['expiring','Por vencer 30d']];

  return `
    <div class="space-y-3 p-1">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="text-sm font-bold text-slate-900" id="pm-res-count">${pmBookingsCountLabel()}</div>
          ${pmBookingsHasFilters() ? `<button onclick="pmBookingsClearFilters()" class="text-[11px] text-[#b8941f] hover:underline font-bold mt-0.5">✕ Limpiar filtros</button>` : ''}
        </div>
        <button onclick="pmEditBooking(null)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">+ Nueva Reserva</button>
      </div>

      <!-- Buscador (estático: vive fuera del container que se reescribe) -->
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="pm-res-search" oninput="pmBookingsSearchInput(this.value)" value="${searchQ.replace(/"/g,'&quot;')}" placeholder="Buscar por inquilino, casa, unidad o código RP-…" autocomplete="off" class="w-full border border-slate-300 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-full pl-9 pr-9 py-2 text-xs outline-none transition"/>
        <button id="pm-res-clearx" onclick="document.getElementById('pm-res-search').value='';pmBookingsSearchInput('')" style="display:${searchQ?'':'none'}" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs">×</button>
      </div>

      <!-- Filtros (dropdowns) -->
      <div class="pm-filters-bar">
        ${pmFilterSelect('Casa', '🏠', propF, [['','Todas'], ...propsWithBookings.map(p=>[p.id, p.name||''])], "pmBookingsSetFilter('property', this.value||null)")}
        ${pmFilterSelect('Fuente', '📡', platF, [['',`Todas (${all.length})`], ...platforms.map(pl=>[pl, `${PM_PLATFORM_LABEL[pl]||pl} (${platformCounts[pl]})`])], "pmBookingsSetFilter('platform', this.value||null)")}
        ${pmFilterSelect('Estatus', '⚡', statF==='all'?'':statF, statuses.map(([k,l])=>[k==='all'?'':k, l]), "pmBookingsSetFilter('status', this.value||'all')")}
        ${pmBookingsHasFilters()?`<button class="pm-clear-filters" onclick="pmBookingsClearFilters()">✕ Limpiar</button>`:''}
      </div>

      <!-- Lista (este container se reescribe en la búsqueda en vivo) -->
      <div id="pm-res-list" class="space-y-3">${pmBookingsListHtml()}</div>
    </div>
  `;
}

// ── Mover reserva de unidad (registra en pm_booking_history) ──
function pmBookingHistoryOf(bookingId) {
  return (pmaState.bookingHistory || []).filter(h => h.booking_id === bookingId)
    .sort((a,b) => (b.moved_at||'').localeCompare(a.moved_at||''));
}
function pmUnitLabel(unitId) {
  const u = pmaState.units.find(x => x.id === unitId);
  if (!u) return '—';
  const p = pmaState.properties.find(x => x.id === u.property_id);
  return `${(p?.name||'').slice(0,18)} · ${u.code||u.name||''}`;
}
async function pmMoveBooking(id) {
  const b = pmaState.bookings.find(x => x.id === id);
  if (!b) return;
  const curUnit = pmaState.units.find(u => u.id === b.unit_id);
  // Opciones agrupadas por casa (optgroup), excluyendo la unidad actual
  const byProp = {};
  pmaState.units.forEach(u => { (byProp[u.property_id] = byProp[u.property_id] || []).push(u); });
  const groups = Object.keys(byProp).sort((a,c) => (pmPropertyName(a)).localeCompare(pmPropertyName(c)))
    .map(pid => `<optgroup label="${pmPropertyName(pid).replace(/"/g,'&quot;')}">${
      byProp[pid].filter(u => u.id !== b.unit_id).map(u => `<option value="${u.id}">${(u.code||u.name||'').replace(/</g,'&lt;')}${u.target_rent?` · $${Number(u.target_rent).toLocaleString()}`:''}</option>`).join('')
    }</optgroup>`).join('');
  openModal('↔ Mover reserva de unidad', `
    <div class="space-y-3">
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
        <div class="text-[10px] uppercase font-bold text-slate-400">Reserva actual</div>
        <div class="font-bold text-slate-800">${pmTenantName(b.tenant_id).replace(/</g,'&lt;')}${b.reservation_code?` <span class="text-[10px] font-mono text-slate-400">${b.reservation_code}</span>`:''}</div>
        <div class="text-[11px] text-slate-500">🛏 ${pmUnitLabel(b.unit_id).replace(/</g,'&lt;')}</div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Mover a *</label>
        <select id="pm-mv-unit" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
          <option value="">— Elegir unidad —</option>
          ${groups}
        </select></div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Motivo (opcional)</label>
        <textarea id="pm-mv-reason" rows="2" placeholder="Ej. la unidad original necesita mantenimiento" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"></textarea></div>
      <div id="pm-mv-status" class="text-[11px] text-slate-500"></div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button id="pm-mv-save" onclick="pmConfirmMoveBooking('${id}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded" style="border:1px solid #d4af37">Confirmar movimiento</button>
      </div>
    </div>`);
}
window.pmMoveBooking = pmMoveBooking;

async function pmConfirmMoveBooking(id) {
  const b = pmaState.bookings.find(x => x.id === id);
  if (!b) return;
  const newUnitId = document.getElementById('pm-mv-unit').value;
  const reason = document.getElementById('pm-mv-reason').value.trim() || null;
  const statusEl = document.getElementById('pm-mv-status');
  const saveBtn = document.getElementById('pm-mv-save');
  if (!newUnitId) return alert('Elegí la unidad destino.');
  if (newUnitId === b.unit_id) return alert('Esa es la unidad actual.');
  const newUnit = pmaState.units.find(u => u.id === newUnitId);
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Moviendo…'; }
  let movedBy = null;
  try { const { data } = await sb.auth.getUser(); movedBy = data?.user?.email || null; } catch (e) {}

  // 1) Registrar en histórico
  const h = await pmExecQuery(sb.from('pm_booking_history').insert({
    booking_id: b.id, moved_from_unit_id: b.unit_id, moved_to_unit_id: newUnitId,
    moved_by: movedBy, reason
  }).select(), 'Registrar movimiento');
  if (!h) { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Confirmar movimiento'; } return; }

  // 2) Actualizar la reserva (unit + property destino)
  const r = await pmExecQuery(sb.from('pm_bookings').update({
    unit_id: newUnitId, property_id: newUnit?.property_id || b.property_id
  }).eq('id', b.id).select(), 'Mover reserva');
  if (!r) return;
  await pmAfterCrud();
}
window.pmConfirmMoveBooking = pmConfirmMoveBooking;

// ════════════════════════════════════════════════════════════════
// TAB · INQUILINOS (CRM completo)
// Estilo Mercury/Bloomberg · charcoal + dorado #d4af37 · verde/rojo solo status
// ════════════════════════════════════════════════════════════════
function pmTenantStatus(b) {
  // semáforo de una reserva activa: late > expiring > al día
  if (!b) return { key: 'historico', label: 'Histórico', dot: 'bg-slate-400', txt: 'text-slate-500', bg: 'bg-slate-100' };
  const late = pmLateBookings().some(x => x.id === b.id);
  if (late) return { key: 'late', label: 'Atrasado', dot: 'bg-red-500', txt: 'text-red-700', bg: 'bg-red-50' };
  const expiring = pmExpiringIn(30).some(x => x.id === b.id);
  if (expiring) return { key: 'expiring', label: 'Próximo a vencer', dot: 'bg-amber-500', txt: 'text-amber-700', bg: 'bg-amber-50' };
  return { key: 'aldia', label: 'Al día', dot: 'bg-emerald-500', txt: 'text-emerald-700', bg: 'bg-emerald-50' };
}
function pmDaysLeft(end_date) {
  if (!end_date) return null;
  return Math.floor((new Date(end_date) - new Date(new Date().toISOString().slice(0,10))) / 86400000);
}
// Reserva activa "principal" de un inquilino (la de fin más lejano / indefinido)
function pmActiveBookingOfTenant(tenantId) {
  const act = pmActiveBookings().filter(b => b.tenant_id === tenantId);
  act.sort((a,b) => (b.end_date || '9999').localeCompare(a.end_date || '9999'));
  return act[0] || null;
}

function pmTenantsInitFilters() {
  if (pmaState.tenantsFiltersLoaded) return;
  pmaState.tenantsFiltersLoaded = true;
  try {
    const g = (k) => { const v = localStorage.getItem(k); return (v === null || v === '') ? null : v; };
    if (localStorage.getItem('pm_inquilinos_filter_status') !== null) pmaState.tenantsFilter = localStorage.getItem('pm_inquilinos_filter_status') || 'activos';
    pmaState.tenantsFilterProperty = g('pm_inquilinos_filter_property');
    pmaState.tenantsFilterType = g('pm_inquilinos_filter_type');
    if (localStorage.getItem('pm_inquilinos_filter_search') !== null) pmaState.tenantsSearch = localStorage.getItem('pm_inquilinos_filter_search') || '';
  } catch (e) {}
}
function pmTenantsSetFilter(key, value) {
  const map = { status: 'tenantsFilter', property: 'tenantsFilterProperty', type: 'tenantsFilterType' };
  pmaState[map[key]] = value;
  try { localStorage.setItem('pm_inquilinos_filter_' + key, value == null ? '' : value); } catch (e) {}
  pmRender();
}
window.pmTenantsSetFilter = pmTenantsSetFilter;
function pmTenantsClearFilters() {
  pmaState.tenantsFilter = 'activos'; pmaState.tenantsFilterProperty = null; pmaState.tenantsFilterType = null; pmaState.tenantsSearch = '';
  try { ['status','property','type','search'].forEach(k => localStorage.removeItem('pm_inquilinos_filter_' + k)); } catch (e) {}
  pmRender();
}
window.pmTenantsClearFilters = pmTenantsClearFilters;
function pmTenantsHasFilters() {
  return !!(pmaState.tenantsFilterProperty || pmaState.tenantsFilterType || (pmaState.tenantsSearch||'').trim() || (pmaState.tenantsFilter && pmaState.tenantsFilter !== 'activos'));
}
function pmTenantsFilteredRows() {
  const filter = pmaState.tenantsFilter || 'activos';
  const q = (pmaState.tenantsSearch || '').toLowerCase().trim();
  const propF = pmaState.tenantsFilterProperty, typeF = pmaState.tenantsFilterType;
  const activeBs = pmActiveBookings();
  const expiringIds = new Set(pmExpiringIn(30).map(b => b.id));
  const lateIds = new Set(pmLateBookings().map(b => b.id));
  const activeTenantIds = new Set(activeBs.map(b => b.tenant_id).filter(Boolean));
  const historicTenants = pmaState.tenants.filter(t => !activeTenantIds.has(t.id) && pmaState.bookings.some(b => b.tenant_id === t.id));
  let rows;
  if (filter === 'historico') rows = historicTenants.map(t => ({ tenant: t, booking: null }));
  else if (filter === 'upcoming') {
    // Por ingresar: reservas a futuro (no entran en activeBs)
    rows = pmUpcomingBookings().map(b => ({ tenant: pmaState.tenants.find(t => t.id === b.tenant_id) || null, booking: b }));
  } else {
    let bs = activeBs;
    if (filter === 'expiring') bs = activeBs.filter(b => expiringIds.has(b.id));
    else if (filter === 'late') bs = activeBs.filter(b => lateIds.has(b.id));
    rows = bs.map(b => ({ tenant: pmaState.tenants.find(t => t.id === b.tenant_id) || null, booking: b }));
    if (filter === 'todos') rows = rows.concat(pmUpcomingBookings().map(b => ({ tenant: pmaState.tenants.find(t => t.id === b.tenant_id) || null, booking: b })))
                                       .concat(historicTenants.map(t => ({ tenant: t, booking: null })));
  }
  if (propF) rows = rows.filter(r => r.booking && r.booking.property_id === propF);
  if (typeF) rows = rows.filter(r => { if (!r.booking) return false; const u = pmaState.units.find(x => x.id === r.booking.unit_id); return u && u.unit_type === typeF; });
  if (q) rows = rows.filter(({ tenant, booking }) => {
    const t = tenant || {}; const p = booking ? pmaState.properties.find(x => x.id === booking.property_id) : null;
    return ((t.full_name||'').toLowerCase().includes(q) || (t.email||'').toLowerCase().includes(q) || (t.phone||'').toLowerCase().includes(q) || (p?.name||'').toLowerCase().includes(q));
  });
  rows.sort((a, b) => {
    const sa = pmTenantStatus(a.booking), sb = pmTenantStatus(b.booking);
    const ord = { late: 0, expiring: 1, aldia: 2, historico: 3 };
    if (ord[sa.key] !== ord[sb.key]) return ord[sa.key] - ord[sb.key];
    return (pmDaysLeft(a.booking?.end_date) ?? 99999) - (pmDaysLeft(b.booking?.end_date) ?? 99999);
  });
  return rows;
}
function pmTenantsListHtml() {
  const rows = pmTenantsFilteredRows();
  return rows.length ? `<div class="space-y-2">${rows.map(pmRenderTenantCard).join('')}</div>`
    : `<div class="text-xs text-slate-400 italic px-3 py-10 text-center bg-slate-50 rounded-lg">Sin inquilinos que matcheen el filtro/búsqueda.</div>`;
}
function pmTenantsCountLabel() {
  const shown = pmTenantsFilteredRows().length, total = pmaState.tenants.length;
  return pmTenantsHasFilters() ? `Mostrando <strong>${shown}</strong> de ${total} inquilinos` : `${total} en base`;
}
function pmTenantsSearchInput(value) {
  pmaState.tenantsSearch = value;
  try { localStorage.setItem('pm_inquilinos_filter_search', value || ''); } catch (e) {}
  clearTimeout(window.__pmTenSearchT);
  window.__pmTenSearchT = setTimeout(() => {
    const list = document.getElementById('pm-inq-list'); if (list) list.innerHTML = pmTenantsListHtml();
    const cnt = document.getElementById('pm-inq-count'); if (cnt) cnt.innerHTML = pmTenantsCountLabel();
    const clr = document.getElementById('pm-inq-clearx'); if (clr) clr.style.display = value ? '' : 'none';
  }, 150);
}
window.pmTenantsSearchInput = pmTenantsSearchInput;

function pmRenderTenants() {
  pmTenantsInitFilters();
  const filter = pmaState.tenantsFilter || 'activos';
  const propF = pmaState.tenantsFilterProperty, typeF = pmaState.tenantsFilterType;
  const searchQ = (pmaState.tenantsSearch || '');
  const counters = { activos: pmActiveBookings().length, expiring: pmExpiringIn(30).length, late: pmLateBookings().length,
    upcoming: pmUpcomingBookings().length,
    historico: pmaState.tenants.filter(t => { const ids = new Set(pmActiveBookings().map(b=>b.tenant_id)); return !ids.has(t.id) && pmaState.bookings.some(b=>b.tenant_id===t.id); }).length };
  const propsWithT = pmaState.properties.filter(p => pmaState.bookings.some(b => b.property_id === p.id && b.tenant_id));
  const types = ['casa_completa','apartamento','estudio','habitacion'];
  const counterCard = (label, value, accent) => `<div class="bg-white border border-slate-200 rounded-xl p-3"><div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${label}</div><div class="text-2xl font-extrabold mt-1 ${accent}">${value}</div></div>`;
  const statusChips = [['todos','Todos',null],['activos','Activos',counters.activos],['upcoming','Por ingresar',counters.upcoming],['expiring','Próximos a salir 30d',counters.expiring],['late','Atrasados',counters.late],['historico','Histórico',counters.historico]];

  return `
  <style>@keyframes pmfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.pm-fade{animation:pmfade .4s ease both}</style>
  <div class="space-y-3 p-1 pm-fade" style="font-family:Inter,system-ui,sans-serif">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <div class="text-base font-bold text-slate-900">Inquilinos · CRM</div>
        <div class="text-xs text-slate-500" id="pm-inq-count">${pmTenantsCountLabel()}</div>
      </div>
      <div class="flex items-center gap-2">
        ${pmTenantsHasFilters() ? `<button onclick="pmTenantsClearFilters()" class="text-[11px] text-[#b8941f] hover:underline font-bold">✕ Limpiar filtros</button>` : ''}
        <button onclick="pmEditTenant(null)" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm" style="border:1px solid #d4af37">+ Nuevo inquilino</button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
      ${counterCard('Activos', counters.activos, 'text-slate-900')}
      ${counterCard('Próximos a salir', counters.expiring, counters.expiring?'text-amber-600':'text-slate-900')}
      ${counterCard('Atrasados', counters.late, counters.late?'text-red-600':'text-slate-900')}
      ${counterCard('Histórico', counters.historico, 'text-slate-500')}
    </div>

    <!-- Tabs de estado (chips) -->
    <div class="flex flex-wrap gap-1.5">
      ${[['todos','TODOS',null],['activos','🟢 ACTIVOS',counters.activos],['historico','⚪ PASADOS',counters.historico],['upcoming','🔵 ENTRANTES',counters.upcoming],['expiring','🟡 PRÓXIMOS A SALIR',counters.expiring]].map(([k,l,c])=>{
        const active = filter===k;
        return `<button onclick="pmTenantsSetFilter('status','${k}')" class="text-[11px] font-bold px-3 py-1.5 rounded-full border transition ${active?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}">${l}${c!=null?` <span class="opacity-70">${c}</span>`:''}</button>`;
      }).join('')}
    </div>

    <!-- Buscador estático -->
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="pm-inq-search" oninput="pmTenantsSearchInput(this.value)" value="${searchQ.replace(/"/g,'&quot;')}" placeholder="Buscar por nombre, email o casa…" autocomplete="off" class="w-full border border-slate-300 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-full pl-9 pr-9 py-2 text-xs outline-none transition"/>
      <button id="pm-inq-clearx" onclick="document.getElementById('pm-inq-search').value='';pmTenantsSearchInput('')" style="display:${searchQ?'':'none'}" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs">×</button>
    </div>

    <!-- Filtros (dropdowns) -->
    <div class="pm-filters-bar">
      ${pmFilterSelect('Estado', '⚡', filter==='activos'?'':filter, statusChips.map(([k,l,c])=>[k==='activos'?'':k, l+(c!=null?` (${c})`:'')]), "pmTenantsSetFilter('status', this.value||'activos')")}
      ${pmFilterSelect('Casa', '🏠', propF, [['','Todas'], ...propsWithT.map(p=>[p.id, p.name||''])], "pmTenantsSetFilter('property', this.value||null)")}
      ${pmFilterSelect('Tipo', '🛏', typeF, [['','Todos'], ...types.map(tp=>[tp, pmUnitTypeLabel(tp)])], "pmTenantsSetFilter('type', this.value||null)")}
      ${pmTenantsHasFilters()?`<button class="pm-clear-filters" onclick="pmTenantsClearFilters()">✕ Limpiar</button>`:''}
    </div>

    <div id="pm-inq-list">${pmTenantsListHtml()}</div>
  </div>`;
}

function pmRenderTenantCard({ tenant, booking }) {
  const t = tenant || {};
  const st = pmTenantStatus(booking);
  const p = booking ? pmaState.properties.find(x => x.id === booking.property_id) : null;
  const u = booking ? pmaState.units.find(x => x.id === booking.unit_id) : null;
  const days = pmDaysLeft(booking?.end_date);
  const lastPay = booking ? pmLastPaymentOf(booking.id) : null;
  const phoneDigits = (t.phone||'').replace(/\D/g,'');
  const name = (t.full_name || '—').replace(/</g,'&lt;');
  const platform = booking?.payment_platform || booking?.platform_account || null;
  const followup = booking?.followup_observation || booking?.comment || t.ai_summary || null;

  const daysBadge = days != null
    ? (days < 0 ? `<span class="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold">vencido ${-days}d</span>`
       : days <= 30 ? `<span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">${days}d restantes</span>`
       : `<span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">${days}d restantes</span>`)
    : (booking ? `<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">indefinido</span>` : '');

  return `
    <div class="bg-white border border-slate-200 border-l-4 rounded-lg p-3 hover:shadow-sm transition" style="border-left-color:${st.key==='late'?'#ef4444':st.key==='expiring'?'#f59e0b':st.key==='aldia'?'#10b981':'#94a3b8'}">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="flex-1 min-w-0 cursor-pointer" onclick="pmOpenTenantDetail('${t.id}')">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="${st.dot} w-2 h-2 rounded-full"></span>
            <strong class="text-sm text-slate-900 pm-clamp2 pm-tenant-name" title="${(t.full_name||'').replace(/"/g,'&quot;')}">${name}</strong>
            <span class="text-[10px] ${st.bg} ${st.txt} px-1.5 py-0.5 rounded font-bold uppercase">${st.label}</span>
            ${(!booking && pmaState.bookings.some(b => b.tenant_id === t.id)) ? `<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase" title="Inquilino histórico — sin reserva activa">⚪ Histórico</span>` : ''}
            ${t.client_state ? `<span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">${(t.client_state||'').replace(/</g,'&lt;')}</span>` : ''}
            ${daysBadge}
          </div>
          ${booking ? `
            <div class="text-[11px] text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
              <span>🏠 ${(p?.name||'—').replace(/</g,'&lt;').slice(0,28)}</span>
              <span>· 🛏 ${((u?.code||u?.name||'—')).replace(/</g,'&lt;')}</span>
              <span>· 📅 ${booking.start_date||'?'} → ${booking.end_date||'∞'}</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span class="font-bold text-emerald-700">$${Number(booking.rent_amount||0).toLocaleString()}/${booking.rent_period||'mes'}</span>
              ${platform ? `<span>· 💳 ${(platform||'').replace(/</g,'&lt;')}</span>` : ''}
              ${lastPay ? `<span>· últ. pago ${lastPay.paid_at} ($${Number(lastPay.amount||0).toLocaleString()})</span>` : `<span class="text-red-500">· sin pagos registrados</span>`}
            </div>
          ` : `<div class="text-[11px] text-slate-400 mt-1">Sin contrato activo${t.email?` · ${t.email}`:''}</div>`}
          ${followup ? `<div class="text-[11px] text-slate-500 mt-1 italic truncate">📝 ${(followup||'').replace(/</g,'&lt;').slice(0,120)}</div>` : ''}
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          ${phoneDigits ? `<a href="https://wa.me/${phoneDigits}" target="_blank" onclick="event.stopPropagation()" title="WhatsApp ${t.phone}" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded text-sm">💬</a>` : ''}
          ${t.email ? `<a href="mailto:${t.email}" onclick="event.stopPropagation()" title="${t.email}" class="bg-blue-50 hover:bg-blue-100 text-blue-700 p-1.5 rounded text-sm">📧</a>` : ''}
          ${booking ? `<button onclick="event.stopPropagation();pmMarkPayment('${booking.id}')" title="Marcar pago" class="bg-amber-50 hover:bg-amber-100 text-amber-700 p-1.5 rounded text-sm">💵</button>` : ''}
          ${booking ? `<button onclick="event.stopPropagation();pmGoBookingFromTenant('${booking.id}')" title="Ver reserva" class="bg-blue-50 hover:bg-blue-100 text-blue-700 p-1.5 rounded text-sm">📅</button>` : ''}
          <button onclick="event.stopPropagation();pmGoPaymentsForTenant('${t.id}')" title="Ver pagos" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded text-sm">📑</button>
          <button onclick="event.stopPropagation();pmEditTenant('${t.id}')" title="Editar inquilino" class="text-slate-400 hover:text-slate-700 p-1.5 rounded text-sm">✏️</button>
          <button onclick="event.stopPropagation();pmOpenTenantDetail('${t.id}')" title="Ver detalle" class="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded">Detalle</button>
        </div>
      </div>
    </div>`;
}

// Navegación cruzada desde Inquilinos
function pmGoBookingFromTenant(bookingId) {
  pmaState.tab = 'calendar';
  pmaState.calendarSelectedBookingId = bookingId;
  pmRender();
}
window.pmGoBookingFromTenant = pmGoBookingFromTenant;
function pmGoPaymentsForTenant(tenantId) {
  pmaState.tab = 'payments';
  pmaState.paySearch = pmTenantName(tenantId) || '';
  pmaState.payPeriod = 'all-time';   // ver también pagos históricos del inquilino
  try { localStorage.setItem('pm_pagos_filter_search', pmaState.paySearch); } catch (e) {}
  pmRender();
}
window.pmGoPaymentsForTenant = pmGoPaymentsForTenant;
function pmOpenTenantDetail(id) {
  pmaState.tenantDetailId = id;
  pmRender();
}
window.pmOpenTenantDetail = pmOpenTenantDetail;

// ── Vista detalle CRM de un inquilino ──
function pmRenderTenantDetail() {
  const t = pmaState.tenants.find(x => x.id === pmaState.tenantDetailId);
  if (!t) { pmaState.tenantDetailId = null; return pmRenderTenants(); }
  const allBs = pmaState.bookings.filter(b => b.tenant_id === t.id)
    .sort((a,b) => (b.start_date||'').localeCompare(a.start_date||''));
  const activeB = pmActiveBookingOfTenant(t.id);
  const pastBs = allBs.filter(b => b.id !== activeB?.id);
  const pays = pmaState.payments.filter(p => p.type === 'ingreso' && p.tenant_id === t.id)
    .sort((a,b) => (b.paid_at||'').localeCompare(a.paid_at||''));
  const st = pmTenantStatus(activeB);
  const days = pmDaysLeft(activeB?.end_date);
  const phoneDigits = (t.phone||'').replace(/\D/g,'');

  const field = (label, val) => val ? `<div><div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${label}</div><div class="text-sm text-slate-800">${String(val).replace(/</g,'&lt;')}</div></div>` : '';

  const propOf = (b) => (pmaState.properties.find(x => x.id === b.property_id)?.name || '—').replace(/</g,'&lt;');
  const unitOf = (b) => (pmaState.units.find(x => x.id === b.unit_id)?.code || pmaState.units.find(x => x.id === b.unit_id)?.name || '—').replace(/</g,'&lt;');

  return `
  <style>@keyframes pmfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.pm-fade{animation:pmfade .4s ease both}</style>
  <div class="space-y-3 p-1 pm-fade" style="font-family:Inter,system-ui,sans-serif">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <button onclick="pmaState.tenantDetailId=null;pmRender()" class="text-slate-400 hover:text-slate-700 text-sm">← Volver</button>
        <span class="${st.dot} w-2.5 h-2.5 rounded-full"></span>
        <strong class="text-base text-slate-900">${(t.full_name||'—').replace(/</g,'&lt;')}</strong>
        <span class="text-[10px] ${st.bg} ${st.txt} px-1.5 py-0.5 rounded font-bold uppercase">${st.label}</span>
      </div>
      <div class="flex items-center gap-1.5">
        ${phoneDigits ? `<a href="https://wa.me/${phoneDigits}" target="_blank" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded text-xs font-bold">💬 WhatsApp</a>` : ''}
        ${t.email ? `<a href="mailto:${t.email}" class="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded text-xs font-bold">📧 Email</a>` : ''}
        <button onclick="pmEditTenant('${t.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded text-xs font-bold">✏️ Editar</button>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-3">
      <!-- Datos personales -->
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[11px] uppercase font-bold text-slate-700 tracking-wider mb-2" style="border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:2px">Datos personales</div>
        <div class="grid grid-cols-2 gap-3 mt-2">
          ${field('Nombre', t.full_name)}
          ${field('Teléfono', t.phone)}
          ${field('Email', t.email)}
          ${field('Documento', t.document_id)}
          ${field('Contacto emergencia', t.emergency_contact)}
          ${field('Fuente', t.source)}
          ${field('Estado cliente', t.client_state)}
        </div>
        ${t.notes ? `<div class="mt-3 text-[11px] text-slate-500 whitespace-pre-wrap border-t border-slate-100 pt-2">${(t.notes||'').replace(/</g,'&lt;')}</div>` : ''}
        ${t.ai_summary ? `<div class="mt-2 text-[11px] text-slate-500 bg-slate-50 rounded p-2"><span class="font-bold text-[#b8941f]">🤖 AI:</span> ${(t.ai_summary||'').replace(/</g,'&lt;')}</div>` : ''}
      </div>

      <!-- Contrato activo -->
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-[11px] uppercase font-bold text-slate-700 tracking-wider" style="border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:2px">Contrato activo</div>
          ${activeB ? `<button onclick="pmEditBooking('${activeB.id}')" class="text-[11px] text-slate-500 hover:text-slate-800 font-bold">Editar contrato</button>` : ''}
        </div>
        ${activeB ? `
          <div class="grid grid-cols-2 gap-3 mt-2">
            ${field('Propiedad', propOf(activeB))}
            ${field('Unidad', unitOf(activeB))}
            ${field('Inicio', activeB.start_date)}
            ${field('Fin', activeB.end_date || 'Indefinido')}
            ${field('Renta', '$'+Number(activeB.rent_amount||0).toLocaleString()+'/'+(activeB.rent_period||'mes'))}
            ${field('Plataforma pago', activeB.payment_platform || activeB.platform_account)}
            ${field('Depósito', activeB.deposit ? '$'+Number(activeB.deposit).toLocaleString() : '')}
          </div>
          ${days != null ? `<div class="mt-3 text-sm font-bold ${days<0?'text-red-600':days<=30?'text-amber-600':'text-emerald-700'}">${days<0?`Vencido hace ${-days} días`:`${days} días restantes`}</div>` : '<div class="mt-3 text-sm text-slate-500">Contrato indefinido</div>'}
          <button onclick="pmMarkPayment('${activeB.id}')" class="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2 rounded">💵 Marcar pago</button>
        ` : `<div class="text-sm text-slate-400 italic py-6 text-center">Sin contrato activo.</div>`}
      </div>
    </div>

    <!-- Seguimiento -->
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <div class="text-[11px] uppercase font-bold text-slate-700 tracking-wider" style="border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:2px">Seguimiento</div>
        <button onclick="pmAddTenantNote('${t.id}')" class="text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1 rounded">+ Agregar nota</button>
      </div>
      ${activeB?.followup_observation ? `<div class="text-[11px] text-slate-600 mb-1"><span class="font-bold">Observación:</span> ${(activeB.followup_observation||'').replace(/</g,'&lt;')}</div>` : ''}
      ${activeB?.comment ? `<div class="text-[11px] text-slate-600 mb-1"><span class="font-bold">Comentario:</span> ${(activeB.comment||'').replace(/</g,'&lt;')}</div>` : ''}
      ${activeB?.last_followup_at ? `<div class="text-[10px] text-slate-400">Último seguimiento: ${activeB.last_followup_at}</div>` : ''}
      ${(!activeB?.followup_observation && !activeB?.comment) ? `<div class="text-xs text-slate-400 italic">Sin notas de seguimiento.</div>` : ''}
    </div>

    <!-- Histórico de pagos -->
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-[11px] uppercase font-bold text-slate-700 tracking-wider mb-2" style="border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:2px">Histórico de pagos (${pays.length})</div>
      ${pays.length ? `<div class="space-y-1 mt-2">${pays.slice(0,40).map(p => {
        const url = p.proof_url || p.attachment_url;
        return `<div class="flex items-center justify-between gap-2 text-[11px] border-b border-slate-50 py-1.5">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-slate-500 whitespace-nowrap">${p.paid_at||'—'}</span>
            <span class="text-slate-700 truncate">${(p.concept||p.category||'Pago').replace(/</g,'&lt;')}</span>
            ${p.platform ? `<span class="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">${(p.platform||'').replace(/</g,'&lt;')}</span>` : ''}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="font-bold text-emerald-700">$${Number(p.amount||0).toLocaleString()}</span>
            ${url ? `<a href="${url}" target="_blank" class="text-blue-600 hover:underline">📎</a>` : ''}
          </div>
        </div>`;
      }).join('')}</div>` : `<div class="text-xs text-slate-400 italic py-4 text-center">Sin pagos registrados.</div>`}
    </div>

    <!-- Contratos anteriores -->
    ${pastBs.length ? `
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-[11px] uppercase font-bold text-slate-700 tracking-wider mb-2" style="border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:2px">Contratos anteriores (${pastBs.length})</div>
      <div class="space-y-1 mt-2">${pastBs.map(b => `
        <div class="flex items-center justify-between gap-2 text-[11px] border-b border-slate-50 py-1.5 cursor-pointer hover:bg-slate-50" onclick="pmEditBooking('${b.id}')">
          <span class="text-slate-700 truncate">🏠 ${propOf(b)} · 🛏 ${unitOf(b)}</span>
          <span class="text-slate-500 whitespace-nowrap">${b.start_date||'?'} → ${b.end_date||'∞'} · <span class="text-[9px] uppercase bg-slate-100 px-1 rounded">${b.status}</span></span>
        </div>`).join('')}</div>
    </div>` : ''}
  </div>`;
}

// ── CRUD inquilino ──
async function pmEditTenant(id) {
  const t = id ? pmaState.tenants.find(x => x.id === id) : {};
  const isNew = !id;
  const sources = ['directo','airbnb','booking','vrbo','hospitable','referido','walk-in','redes','otro'];
  openModal((isNew?'+ Nuevo':'✏️ Editar')+' Inquilino', `
    <div class="space-y-3">
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Nombre completo *</label>
        <input id="pm-tf-name" value="${(t.full_name||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Teléfono</label>
          <input id="pm-tf-phone" value="${(t.phone||'').replace(/"/g,'&quot;')}" placeholder="+1..." class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Email</label>
          <input id="pm-tf-email" value="${(t.email||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Documento (SSN/DNI)</label>
          <input id="pm-tf-doc" value="${(t.document_id||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Contacto emergencia</label>
          <input id="pm-tf-emerg" value="${(t.emergency_contact||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Fuente</label>
          <select id="pm-tf-source" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${sources.map(s => `<option value="${s}" ${(t.source||'directo')===s?'selected':''}>${s}</option>`).join('')}
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Estado cliente</label>
          <input id="pm-tf-state" value="${(t.client_state||'').replace(/"/g,'&quot;')}" placeholder="activo / pasado / en_seguimiento" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Notas</label>
        <textarea id="pm-tf-notes" rows="2" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">${(t.notes||'').replace(/</g,'&lt;')}</textarea></div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${!isNew ? `<button onclick="pmDeleteTenant('${id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded">🗑</button>` : ''}
        <button onclick="pmSaveTenant('${id||''}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded" style="border:1px solid #d4af37">${isNew?'Crear':'Guardar'}</button>
      </div>
    </div>
  `);
}
window.pmEditTenant = pmEditTenant;

async function pmSaveTenant(id) {
  const payload = {
    full_name: document.getElementById('pm-tf-name').value.trim(),
    phone: document.getElementById('pm-tf-phone').value.trim() || null,
    email: document.getElementById('pm-tf-email').value.trim() || null,
    document_id: document.getElementById('pm-tf-doc').value.trim() || null,
    emergency_contact: document.getElementById('pm-tf-emerg').value.trim() || null,
    source: document.getElementById('pm-tf-source').value,
    client_state: document.getElementById('pm-tf-state').value.trim() || null,
    notes: document.getElementById('pm-tf-notes').value.trim() || null
  };
  if (!payload.full_name) return alert('El nombre es obligatorio.');
  const r = id
    ? await pmExecQuery(sb.from('pm_tenants').update(payload).eq('id', id).select(), 'Update inquilino')
    : await pmExecQuery(sb.from('pm_tenants').insert(payload).select(), 'Crear inquilino');
  if (!r) return;
  await pmAfterCrud();
}
window.pmSaveTenant = pmSaveTenant;

async function pmDeleteTenant(id) {
  if (!confirm('¿Eliminar este inquilino? Sus reservas quedarán sin asociar.')) return;
  const r = await pmExecQuery(sb.from('pm_tenants').delete().eq('id', id), 'Eliminar inquilino');
  if (!r) return;
  pmaState.tenantDetailId = null;
  await pmAfterCrud();
}
window.pmDeleteTenant = pmDeleteTenant;

// ── Marcar pago (con upload de comprobante) ──
async function pmMarkPayment(bookingId) {
  const b = pmaState.bookings.find(x => x.id === bookingId);
  if (!b) return alert('Reserva no encontrada.');
  const t = pmaState.tenants.find(x => x.id === b.tenant_id);
  const today = new Date().toISOString().slice(0,10);
  openModal('💵 Marcar pago — ' + (t?.full_name||'Inquilino'), `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Monto * $</label>
          <input id="pm-mp-amount" type="number" step="0.01" value="${b.rent_amount||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Fecha pago *</label>
          <input id="pm-mp-date" type="date" value="${today}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Método</label>
          <select id="pm-mp-method" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white">
            ${['Zelle','CashApp','Airbnb','Cash','Cheque','Otro'].map(m=>`<option value="${m}">${m}</option>`).join('')}
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Plataforma</label>
          <select id="pm-mp-platform" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white">
            ${['Directo','Airbnb','Padsplit'].map(pl=>`<option value="${pl}" ${((b.payment_platform||'').toLowerCase()===pl.toLowerCase())?'selected':''}>${pl}</option>`).join('')}
          </select></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Observación / Comentario</label>
        <textarea id="pm-mp-notes" maxlength="500" rows="2" placeholder="Opcional (máx 500)" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm resize-none"></textarea></div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Comprobante (imagen/PDF)</label>
        <input id="pm-mp-file" type="file" accept="image/*,application/pdf" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"/></div>
      <div id="pm-mp-status" class="text-[11px] text-slate-500"></div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button id="pm-mp-save" onclick="pmSaveMarkPayment('${bookingId}')" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2 rounded">Registrar pago</button>
      </div>
    </div>
  `);
}
window.pmMarkPayment = pmMarkPayment;

async function pmSaveMarkPayment(bookingId) {
  const b = pmaState.bookings.find(x => x.id === bookingId);
  if (!b) return;
  const amount = +document.getElementById('pm-mp-amount').value || 0;
  const paid_at = document.getElementById('pm-mp-date').value || null;
  const platform = document.getElementById('pm-mp-platform').value.trim() || null;
  const method = (document.getElementById('pm-mp-method')?.value || '').trim() || null;
  const notes = (document.getElementById('pm-mp-notes')?.value || '').trim().slice(0,500) || null;
  const fileEl = document.getElementById('pm-mp-file');
  const statusEl = document.getElementById('pm-mp-status');
  const saveBtn = document.getElementById('pm-mp-save');
  if (!amount) return alert('El monto es obligatorio.');
  if (!paid_at) return alert('La fecha es obligatoria.');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando…'; }

  // Upload comprobante (best-effort)
  let proof_url = null;
  const file = fileEl?.files?.[0];
  if (file) {
    if (statusEl) statusEl.textContent = 'Subiendo comprobante…';
    const up = await pmUploadFile('payment-proofs', b.id, file);
    if (up.url) proof_url = up.url;
    else if (statusEl) statusEl.textContent = '⚠️ Comprobante no subido: ' + up.error + ' (se registra el pago sin adjunto)';
  }

  const payload = {
    booking_id: b.id,
    property_id: b.property_id || null,
    unit_id: b.unit_id || null,
    tenant_id: b.tenant_id || null,
    type: 'ingreso',
    category: 'renta',
    concept: `Renta ${paid_at} — ${pmTenantName(b.tenant_id)}`,
    amount,
    paid_at,
    platform,
    payment_method: method || platform,
    notes,
    proof_url,
    status: 'pagado'
  };
  const r = await pmExecQuery(sb.from('pm_payments').insert(payload).select(), 'Registrar pago');
  if (!r) { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Registrar pago'; } return; }
  const newId = Array.isArray(r) ? r[0]?.id : r?.id;

  // Write-back a Airtable Pagos Rentas (best-effort: si falla, el pago ya quedó guardado).
  try {
    if (statusEl) statusEl.textContent = 'Sincronizando a Airtable…';
    const prop = pmaState.properties.find(x => x.id === b.property_id);
    const unit = pmaState.units.find(x => x.id === b.unit_id);
    const sess = await sb.auth.getSession();
    const tok = sess?.data?.session?.access_token;
    if (tok) {
      // Base nueva: Pagos enlaza Inquilino/Casa/Reserva por LINKED RECORD ID.
      // Los recIds salen de pmaState: tenant.external_id (tenant-{rec}),
      // property.airtable_address_id (recId de la Casa), booking.external_id (booking-{rec}).
      const tenant = pmaState.tenants.find(x => x.id === b.tenant_id);
      const stripRec = (ext, pfx) => (typeof ext === 'string' && ext.startsWith(pfx)) ? ext.slice(pfx.length) : null;
      const res = await fetch(`${window.SUPABASE_URL}/functions/v1/pm-payment-writeback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
        body: JSON.stringify({
          tenant_rec:  stripRec(tenant?.external_id, 'tenant-'),
          casa_rec:    prop?.airtable_address_id || null,
          reserva_rec: stripRec(b.external_id, 'booking-'),
          concepto: `Renta ${paid_at} — ${pmTenantName(b.tenant_id)}`,
          monto: amount, fecha: paid_at, plataforma: platform
        })
      });
      const wb = await res.json().catch(() => ({}));
      if (wb?.ok && wb.record_id && newId) {
        await sb.from('pm_payments').update({ external_id: 'pay-' + wb.record_id }).eq('id', newId);
      } else if (!wb?.ok && statusEl) {
        statusEl.textContent = '⚠️ Pago guardado, pero no se sincronizó a Airtable: ' + (wb?.error || 'error');
      }
    }
  } catch (e) { /* best-effort: el pago local ya está */ }
  await pmAfterCrud();
}
window.pmSaveMarkPayment = pmSaveMarkPayment;

// Archivar un pago sin casa como legacy (active=false) → desaparece del dashboard.
async function pmArchivePaymentLegacy(id) {
  if (!confirm('¿Archivar este pago sin casa como legacy? Dejará de aparecer en el dashboard (no se borra).')) return;
  const r = await pmExecQuery(sb.from('pm_payments').update({ active: false, archived_at: new Date().toISOString() }).eq('id', id).select(), 'Archivar pago');
  if (r) await pmAfterCrud();
}
window.pmArchivePaymentLegacy = pmArchivePaymentLegacy;

// ── Agregar nota de seguimiento (escribe a pm_bookings o pm_tenants) ──
async function pmAddTenantNote(tenantId) {
  const t = pmaState.tenants.find(x => x.id === tenantId);
  const note = prompt('Nueva nota de seguimiento para ' + (t?.full_name||'inquilino') + ':');
  if (!note || !note.trim()) return;
  const stamp = new Date().toISOString().slice(0,10);
  const line = `[${stamp}] ${note.trim()}`;
  const activeB = pmActiveBookingOfTenant(tenantId);
  if (activeB) {
    const prev = activeB.followup_observation ? activeB.followup_observation + '\n' : '';
    const r = await pmExecQuery(
      sb.from('pm_bookings').update({ followup_observation: prev + line, last_followup_at: stamp }).eq('id', activeB.id).select(),
      'Agregar nota');
    if (!r) return;
    activeB.followup_observation = prev + line;
    activeB.last_followup_at = stamp;
  } else {
    const prev = t.notes ? t.notes + '\n' : '';
    const r = await pmExecQuery(
      sb.from('pm_tenants').update({ notes: prev + line }).eq('id', tenantId).select(),
      'Agregar nota');
    if (!r) return;
    t.notes = prev + line;
  }
  pmRender();
}
window.pmAddTenantNote = pmAddTenantNote;

// ════════════════════════════════════════════════════════════════
// Helpers compartidos Pagos/Gastos
// ════════════════════════════════════════════════════════════════
function pmCurrentYM() { return new Date().toISOString().slice(0,7); }
// Default de período UNIFICADO en toda la app = ÚLTIMO MES CERRADO (mes anterior al actual).
// El mes en curso (actual) se rotula "en curso". (Pilar: mismo criterio en PM y OS.)
function pmDefaultYM() { const n = new Date(); let y = n.getFullYear(), m = n.getMonth() - 1; if (m < 0) { m = 11; y -= 1; } return `${y}-${String(m + 1).padStart(2, '0')}`; }
function pmYmIsCurrent(ym) { return ym === pmCurrentYM(); }
function pmYmLabelC(ym) { return pmYmLabel(ym) + (pmYmIsCurrent(ym) ? ' · en curso' : ''); }
// Indicador de COMPLETITUD DE CARGA del mes: nº de pagos cargados vs promedio de meses previos.
// Un mes con muchos menos pagos que el histórico se lee como "carga en progreso", no como mal mes.
// (Pilar #1: no se maquilla el dato — se muestra el real + el contexto de completitud.)
function pmMonthLoadInfo(ym) {
  // Completitud de carga por MES DE RENTA (tag Mes/Año) — misma dimensión que los ingresos.
  const cnt = (yy) => pmaState.payments.filter(p => p.type === 'ingreso' && pmBillYm(p) === yy).length;
  const n = cnt(ym);
  const priors = []; for (let i = 1; i <= 3; i++) { const c = cnt(pmYmShift(ym, -i)); if (c > 0) priors.push(c); }
  const avg = priors.length ? priors.reduce((s, x) => s + x, 0) / priors.length : 0;
  const enCurso = pmYmIsCurrent(ym);
  const incompleto = enCurso || (avg > 0 && n < avg * 0.7);
  return { count: n, avg: Math.round(avg), incompleto, enCurso };
}
function pmMonthBadge(ym) {
  const i = pmMonthLoadInfo(ym);
  const nota = i.enCurso ? 'en curso' : i.incompleto ? 'carga en progreso' : 'carga completa';
  const cls = i.incompleto ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  const avgTxt = (i.avg && i.incompleto && !i.enCurso) ? ` · prom. previo ${i.avg}` : '';
  return `<span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}" title="Pagos cargados este mes vs promedio de meses previos">${i.count} pagos cargados · ${nota}${avgTxt}</span>`;
}
window.pmMonthLoadInfo = pmMonthLoadInfo; window.pmMonthBadge = pmMonthBadge;
function pmYmYear(ym) { return parseInt(ym.slice(0,4), 10); }
function pmYmMonthIdx(ym) { return parseInt(ym.slice(5,7), 10) - 1; }
function pmYmLabel(ym) { return `${PM_ES_MONTHS_SHORT[pmYmMonthIdx(ym)]} ${pmYmYear(ym)}`; }
function pmYmShift(ym, delta) {
  const d = new Date(pmYmYear(ym), pmYmMonthIdx(ym) + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function pmMonthlyRent(b) {
  const amt = Number(b.rent_amount || 0);
  switch (b.rent_period) {
    case 'quincenal': return amt * 2;
    case 'semana': return amt * 4.33;
    case 'noche': return amt * 30;
    case 'anual': return amt / 12;
    default: return amt;  // mensual / estadia / otros
  }
}
// Sube un archivo a un bucket (best-effort, crea bucket si falta). Devuelve {url}|{error}
async function pmUploadFile(bucket, folder, file) {
  try {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `${folder}/${Date.now()}.${ext}`;
    let { error } = await sb.storage.from(bucket).upload(path, file, { upsert: false });
    if (error && /not found|does not exist|bucket/i.test(error.message)) {
      try { await sb.storage.createBucket(bucket, { public: true }); } catch (e) { /* sin permiso: queda al SQL */ }
      ({ error } = await sb.storage.from(bucket).upload(path, file, { upsert: false }));
    }
    if (error) return { error: error.message };
    const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
    return { url: pub?.publicUrl || path };
  } catch (e) { return { error: e.message }; }
}
// Selector de mes reutilizable (← input month →). cb = nombre de fn que recibe el nuevo 'YYYY-MM'
function pmMonthNav(ym, cbExpr) {
  return `
    <div class="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
      <button onclick="${cbExpr.replace('%V%', `'${pmYmShift(ym,-1)}'`)}" class="px-2 py-1 text-slate-500 hover:text-slate-900 text-sm">‹</button>
      <input type="month" value="${ym}" onchange="${cbExpr.replace('%V%','this.value')}" class="text-xs font-bold text-slate-800 border-0 outline-none bg-transparent w-[120px]"/>
      <button onclick="${cbExpr.replace('%V%', `'${pmYmShift(ym,1)}'`)}" class="px-2 py-1 text-slate-500 hover:text-slate-900 text-sm">›</button>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// TAB · PAGOS (cobranza de rentas) — recurrencia + estatus + filtros
// ════════════════════════════════════════════════════════════════
const PM_AIRTABLE_BASE = 'apptTKRYbx6gu701i';
function pmAirtableLink(externalId, tableId) {
  if (!externalId) return null;
  const rec = externalId.replace(/^[a-z]+-/i, '');
  return `https://airtable.com/${PM_AIRTABLE_BASE}/${tableId}/${rec}`;
}
function pmPaymentBooking(p) {
  if (p.booking_id) { const b = pmaState.bookings.find(x => x.id === p.booking_id); if (b) return b; }
  if (p.tenant_id) return pmActiveBookingOfTenant(p.tenant_id);
  return null;
}
function pmPaymentsInitFilters() {
  if (pmaState.payFiltersLoaded) return;
  pmaState.payFiltersLoaded = true;
  try {
    const g = (k) => { const v = localStorage.getItem(k); return (v === null || v === '') ? null : v; };
    pmaState.payFilterProperty = g('pm_pagos_filter_property');
    pmaState.payFilterPlatform = g('pm_pagos_filter_platform');
    pmaState.payRecurrenceFilter = g('pm_pagos_filter_recurrence');
    if (localStorage.getItem('pm_pagos_filter_status') !== null) pmaState.payStatusFilter = localStorage.getItem('pm_pagos_filter_status') || 'all';
    if (localStorage.getItem('pm_pagos_filter_period') !== null) pmaState.payPeriod = localStorage.getItem('pm_pagos_filter_period') || 'month';
    if (localStorage.getItem('pm_pagos_filter_search') !== null) pmaState.paySearch = localStorage.getItem('pm_pagos_filter_search') || '';
  } catch (e) {}
}
function pmPaymentsSetFilter(key, value) {
  const map = { property: 'payFilterProperty', platform: 'payFilterPlatform', recurrence: 'payRecurrenceFilter', status: 'payStatusFilter', period: 'payPeriod' };
  pmaState[map[key]] = value;
  try { localStorage.setItem('pm_pagos_filter_' + key, value == null ? '' : value); } catch (e) {}
  pmRender();
}
window.pmPaymentsSetFilter = pmPaymentsSetFilter;
function pmPaymentsClearFilters() {
  pmaState.payFilterProperty = null; pmaState.payFilterPlatform = null; pmaState.payRecurrenceFilter = null;
  pmaState.payStatusFilter = 'all'; pmaState.payPeriod = 'month'; pmaState.paySearch = '';
  try { ['property','platform','recurrence','status','period','search'].forEach(k => localStorage.removeItem('pm_pagos_filter_' + k)); } catch (e) {}
  pmRender();
}
window.pmPaymentsClearFilters = pmPaymentsClearFilters;
function pmPaymentsHasFilters() {
  return !!(pmaState.payFilterProperty || pmaState.payFilterPlatform || pmaState.payRecurrenceFilter
    || (pmaState.payStatusFilter && pmaState.payStatusFilter !== 'all') || (pmaState.payPeriod && pmaState.payPeriod !== 'month') || (pmaState.paySearch||'').trim());
}
// ¿la fecha cae en el período? acepta 'YYYY-MM', 'ytd', 'last-Nm', 'all-time',
// y los legacy 'month'/'prev'/'year'/'all'.
function pmPeriodMatch(dateStr, period) {
  const d = dateStr || '';
  if (!period || period === 'all' || period === 'all-time') return true;
  if (/^\d{4}-\d{2}$/.test(period)) return d.startsWith(period);
  if (period === 'month') return d.startsWith(pmCurrentYM());
  if (period === 'prev') return d.startsWith(pmYmShift(pmCurrentYM(), -1));
  if (period === 'year' || period === 'ytd') return d.startsWith(String(new Date().getFullYear()));
  const m = period.match(/^last-(\d+)m$/);
  if (m) return d.slice(0,7) >= pmYmShift(pmCurrentYM(), -(parseInt(m[1],10)-1));
  return true;
}
function pmPaymentsFiltered() {
  const period = pmaState.payPeriod || 'month';
  // El período filtra por MES DE RENTA (tag Mes/Año), no por fecha de cobro.
  let pays = pmaState.payments.filter(p => p.type === 'ingreso' && pmPeriodMatch(pmBillYm(p), period));
  if (pmaState.payFilterProperty) pays = pays.filter(p => p.property_id === pmaState.payFilterProperty);
  if (pmaState.payFilterPlatform) pays = pays.filter(p => p.platform === pmaState.payFilterPlatform);
  if (pmaState.payRecurrenceFilter) pays = pays.filter(p => { const b = pmPaymentBooking(p); return b && pmRecurrenceOf(b.payment_day).kind === pmaState.payRecurrenceFilter; });
  if (pmaState.payStatusFilter && pmaState.payStatusFilter !== 'all') {
    const f = pmaState.payStatusFilter;
    // Estatus POR PAGO (balance del período); proximo/sincontrato siguen siendo del inquilino.
    pays = (f === 'proximo' || f === 'sincontrato')
      ? pays.filter(p => pmTenantPayStatus(pmPaymentBooking(p)).key === f)
      : pays.filter(p => pmPayStatus(p).key === f);
  }
  const q = (pmaState.paySearch || '').toLowerCase().trim();
  if (q) pays = pays.filter(p => `${p.tenant_id ? pmTenantName(p.tenant_id) : ''} ${p.concept||''} ${p.platform||''}`.toLowerCase().includes(q));
  // Orden por columna (clic en el encabezado). Sin elección → default: cobrado desc.
  const k = pmaState.paySortKey;
  if (!k) return pays.sort((a, b) => (b.paid_at||'').localeCompare(a.paid_at||''));
  const dir = pmaState.paySortDir === 'desc' ? -1 : 1;
  const val = (p) => {
    switch (k) {
      case 'mes': return pmBillYm(p);
      case 'cobrado': return p.paid_at || '';
      case 'inquilino': return p.tenant_id ? pmTenantName(p.tenant_id) : (p.concept || '');
      case 'casa': return (pmaState.properties.find(x => x.id === p.property_id) || {}).name || '';
      case 'unit': { const u = pmaState.units.find(x => x.id === p.unit_id); return (u && (u.code || u.name)) || ''; }
      case 'monto': return pmPayStatus(p).debe;
      case 'plataforma': return p.platform || '';
      case 'recurrencia': { const b2 = pmPaymentBooking(p); return b2 ? pmRecurrenceOf(b2.payment_day).label : ''; }
      case 'estatus': return pmPayStatus(p).label;
      default: return '';
    }
  };
  return pays.sort((a, b) => {
    const va = val(a), vb = val(b);
    if (typeof va === 'number' || typeof vb === 'number') return (Number(va||0) - Number(vb||0)) * dir;
    return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' }) * dir;
  });
}
// Encabezado ordenable: clic alterna A→Z / Z→A; flecha indica columna y dirección.
function pmPaySort(key) {
  if (pmaState.paySortKey === key) {
    if (pmaState.paySortDir === 'asc') pmaState.paySortDir = 'desc';
    else { pmaState.paySortKey = null; pmaState.paySortDir = 'asc'; }   // 3er clic = volver al default
  } else { pmaState.paySortKey = key; pmaState.paySortDir = 'asc'; }
  const list = document.getElementById('pm-pay-list'); if (list) list.innerHTML = pmPaymentsTableHtml();
}
window.pmPaySort = pmPaySort;
function pmPaymentsTableHtml() {
  const pays = pmPaymentsFiltered();
  const th = (key, label, align, title) => {
    const active = pmaState.paySortKey === key;
    const arrow = active ? (pmaState.paySortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return `<th class="px-3 py-2 text-${align} cursor-pointer select-none hover:text-slate-800 ${active ? 'text-slate-800' : ''}" ${title ? `title="${title} · clic para ordenar"` : 'title="Clic para ordenar"'} onclick="pmPaySort('${key}')">${label}${arrow}</th>`;
  };
  return `
    <table class="w-full text-xs">
      <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
        <tr>
          ${th('mes','Mes renta','left','Mes de renta (tag Mes/Año de Airtable)')}
          ${th('cobrado','Cobrado','left','Fecha en que se cobró (flujo de caja)')}${th('inquilino','Inquilino','left')}
          ${th('casa','Casa','left')}${th('unit','Unit','left')}
          ${th('monto','Monto','right')}${th('plataforma','Plataforma','left')}
          ${th('recurrencia','Recurrencia','left')}${th('estatus','Estatus','left')}
          <th class="px-3 py-2 text-center">Compr.</th><th class="px-3 py-2 text-center">Acc.</th>
        </tr>
      </thead>
      <tbody>
        ${pays.length ? pays.map(p => {
          const prop = pmaState.properties.find(x => x.id === p.property_id);
          const unit = pmaState.units.find(x => x.id === p.unit_id);
          const url = p.proof_url || p.attachment_url;
          const bk = pmPaymentBooking(p);
          const rec = bk ? pmRecurrenceOf(bk.payment_day).label : '—';
          const st = pmPayStatus(p);   // estatus del PAGO por balance del período, no del inquilino
          const orphan = !p.property_id;
          const atLink = (p._src === 'expense') ? null : pmAirtableLink(p.external_id, 'tbl5p63dUEhrzgHVJ');
          return `<tr class="border-t border-slate-100 ${orphan ? 'bg-red-50' : 'hover:bg-slate-50'}">
            <td class="px-3 py-2 whitespace-nowrap font-semibold text-slate-800">${p.month ? `${p.month} ${p.year||''}` : '<span class="text-amber-600" title="Sin tag Mes/Año en Airtable">sin mes</span>'}</td>
            <td class="px-3 py-2 whitespace-nowrap text-slate-500">${p.paid_at||'<span class="text-amber-600">—</span>'}</td>
            <td class="px-3 py-2 text-slate-800">${(p.tenant_id?pmTenantName(p.tenant_id):(p.concept||'—')).replace(/</g,'&lt;').slice(0,24)}</td>
            <td class="px-3 py-2 ${orphan?'text-amber-700':'text-slate-600'}">${orphan ? `<span class="inline-flex items-center gap-1"><span class="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded" title="Este pago no tiene casa asignada. ¿Vincular manualmente o archivar?">⚠️ Sin vincular</span>${p._src==='expense'?'':`<button onclick="pmEditPayment('${p.id}')" class="text-[10px] text-blue-700 hover:underline font-bold">Vincular a casa…</button> <button onclick="pmArchivePaymentLegacy('${p.id}')" class="text-[10px] text-slate-500 hover:underline">Archivar</button>`}</span>` : (prop?.name||'—').replace(/</g,'&lt;').slice(0,18)}</td>
            <td class="px-3 py-2 text-slate-600">${(unit?.code||unit?.name||'—').replace(/</g,'&lt;')}</td>
            <td class="px-3 py-2 text-right font-bold ${st.debe > 0 ? 'text-red-700' : 'text-slate-500'}" title="Lo que debe (balance del período) · pagado: $${Number(p.amount||0).toLocaleString()}">$${Number(st.debe||0).toLocaleString()}</td>
            <td class="px-3 py-2 text-slate-600">${(p.platform||'—').replace(/</g,'&lt;')}</td>
            <td class="px-3 py-2 text-slate-600 whitespace-nowrap">${rec}</td>
            <td class="px-3 py-2"><span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${st.cls}">${st.label}</span></td>
            <td class="px-3 py-2 text-center">${url?`<a href="${url}" target="_blank" class="text-blue-600 hover:underline">📎</a>`:'<span class="text-slate-300">—</span>'}</td>
            <td class="px-3 py-2 text-center whitespace-nowrap">${p._src==='expense'?'':`${bk?`<button onclick="pmMarkPayment('${bk.id}')" title="Marcar pago" class="text-amber-600 hover:text-amber-800 mr-1">💵</button>`:''}<button onclick="pmEditPayment('${p.id}')" title="Editar" class="text-slate-400 hover:text-slate-700">✏️</button>`}</td>
          </tr>`;
        }).join('') : `<tr><td colspan="11" class="px-3 py-8 text-center text-slate-400 italic">Sin pagos con estos filtros.</td></tr>`}
      </tbody>
    </table>`;
}
function pmPaymentsCountLabel() {
  const shown = pmPaymentsFiltered().length;
  const total = pmaState.payments.filter(p => p.type === 'ingreso').length;
  return pmPaymentsHasFilters() ? `Mostrando <strong>${shown}</strong> de ${total} pagos` : `${shown} pagos`;
}
function pmPaymentsSearchInput(value) {
  pmaState.paySearch = value;
  try { localStorage.setItem('pm_pagos_filter_search', value || ''); } catch (e) {}
  clearTimeout(window.__pmPaySearchT);
  window.__pmPaySearchT = setTimeout(() => {
    const list = document.getElementById('pm-pay-list'); if (list) list.innerHTML = pmPaymentsTableHtml();
    const cards = document.getElementById('pm-pay-cards'); if (cards) cards.innerHTML = pmPayCardsHtml();
    const cnt = document.getElementById('pm-pay-count'); if (cnt) cnt.innerHTML = pmPaymentsCountLabel();
    const clr = document.getElementById('pm-pay-clearx'); if (clr) clr.style.display = value ? '' : 'none';
  }, 150);
}
window.pmPaymentsSearchInput = pmPaymentsSearchInput;

// Cards del tab Pagos = resumen de EXACTAMENTE lo que muestra la tabla (reusa
// pmPaymentsFiltered: Mes, Casa, Plataforma, Recurrencia, Estatus y buscador).
// El buscador también las refresca (pmPaymentsSearchInput).
function pmPayCardsHtml() {
  const ym = pmaState.payMonth || pmDefaultYM();
  const now = new Date();
  const propFilter = pmaState.payFilterProperty;
  const Fp = pmPaymentsFiltered();
  const cobrado = Fp.reduce((s,p) => s + Number(p.amount||0), 0);
  const cobradoCash = Fp.filter(p => p.paid_at).reduce((s,p) => s + Number(p.amount||0), 0);
  const pagosAtrasados = Fp.filter(p => pmPayStatus(p).key === 'atrasado');
  const deudaAtrasada = pagosAtrasados.reduce((s, p) => s + pmPayStatus(p).debe, 0);
  const activeBs = pmActiveBookings().filter(b => !propFilter || b.property_id === propFilter);
  const proximos = activeBs.filter(b => {
    const due = pmNextDueDate(b); if (!due) return false;
    const diff = Math.floor((due - now) / 86400000);
    if (!(diff >= -3 && diff <= 7)) return false;
    const paid = pmaState.payments.some(p => p.type==='ingreso' && pmBillYm(p) === ym && (p.booking_id===b.id || (b.tenant_id && p.tenant_id===b.tenant_id)));
    return !paid;
  }).length;
  const card = (label, value, sub, accent) => `<div class="bg-white border border-slate-200 rounded-xl p-4"><div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${label}</div><div class="text-2xl font-extrabold mt-1 ${accent||'text-slate-900'}">${value}</div>${sub?`<div class="text-[11px] text-slate-500 mt-0.5">${sub}</div>`:''}</div>`;
  return `
      ${card('Renta', pmMoney(cobrado), 'Σ de lo filtrado (tag Mes/Año)', 'text-emerald-700')}<div class="mt-2">${pmMonthBadge(ym)}</div>
      ${card('Cobrado', pmMoney(cobradoCash), 'de lo filtrado, con fecha de pago', 'text-slate-700')}
      ${card('Pagos', Fp.length, 'filas mostradas en la tabla')}
      ${card('Pagos atrasados', pagosAtrasados.length, 'con saldo vencido (del filtro)', pagosAtrasados.length?'text-red-600':'text-slate-900')}
      ${card('Total atrasado', pmMoney(deudaAtrasada), 'suma de lo adeudado (del filtro)', pagosAtrasados.length?'text-red-600':'text-slate-900')}
      ${card('Próximos 7 días', proximos, 'por cobrar', proximos?'text-amber-600':'text-slate-900')}`;
}
function pmRenderPayments() {
  pmPaymentsInitFilters();
  const ym = pmaState.payMonth || pmDefaultYM();   // default unificado = último mes cerrado
  const now = new Date();
  const propFilter = pmaState.payFilterProperty;

  // "Próximos 7 días" es proyección hacia adelante (por bookings): respeta solo Casa.
  const activeBs = pmActiveBookings().filter(b => !propFilter || b.property_id === propFilter);

  // Próximos cobros (7 días): activos no pagados este mes con próximo vencimiento ≤7d
  const proximosList = activeBs.filter(b => {
    const due = pmNextDueDate(b); if (!due) return false;
    const diff = Math.floor((due - now) / 86400000);
    if (!(diff >= -3 && diff <= 7)) return false;   // incluye recién vencidos (3d gracia) + próximos 7d
    const paid = pmaState.payments.some(p => p.type==='ingreso' && pmBillYm(p) === ym && (p.booking_id===b.id || (b.tenant_id && p.tenant_id===b.tenant_id)));
    return !paid;
  }).sort((a,b) => pmNextDueDate(a) - pmNextDueDate(b));

  const platforms = [...new Set(pmaState.payments.filter(p => p.type==='ingreso' && p.platform).map(p => p.platform))].sort();
  const propsWithPay = pmaState.properties.filter(p => pmaState.payments.some(x => x.type==='ingreso' && x.property_id === p.id));
  const card = (label, value, sub, accent) => `<div class="bg-white border border-slate-200 rounded-xl p-4"><div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${label}</div><div class="text-2xl font-extrabold mt-1 ${accent||'text-slate-900'}">${value}</div>${sub?`<div class="text-[11px] text-slate-500 mt-0.5">${sub}</div>`:''}</div>`;
  const searchQ = (pmaState.paySearch || '');
  const statF = pmaState.payStatusFilter || 'all';
  const recF = pmaState.payRecurrenceFilter;
  const periodF = pmaState.payPeriod || 'month';

  return `
  <style>@keyframes pmfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.pm-fade{animation:pmfade .4s ease both}</style>
  <div class="space-y-3 p-1 pm-fade" style="font-family:Inter,system-ui,sans-serif">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <div class="text-base font-bold text-slate-900">Pagos · cobranza</div>
        <div class="text-xs text-slate-500" id="pm-pay-count">${pmPaymentsCountLabel()}</div>
      </div>
      <div class="flex items-center gap-2">
        ${pmPaymentsHasFilters() ? `<button onclick="pmPaymentsClearFilters()" class="text-[11px] text-[#b8941f] hover:underline font-bold">✕ Limpiar filtros</button>` : ''}
        <button onclick="pmPickLeaseForPayment()" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm" style="border:1px solid #d4af37">+ Registrar pago</button>
      </div>
    </div>

    <!-- Próximos cobros (7 días) -->
    ${proximosList.length ? `
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div class="text-[11px] uppercase font-bold text-amber-700 tracking-wider mb-2">⏰ Próximos cobros (7 días) · ${proximosList.length}</div>
        <div class="flex gap-2 overflow-x-auto pb-1">
          ${proximosList.map(b => {
            const prop = pmaState.properties.find(x => x.id === b.property_id);
            const unit = pmaState.units.find(x => x.id === b.unit_id);
            const due = pmNextDueDate(b);
            const t = pmaState.tenants.find(x => x.id === b.tenant_id);
            const phone = (t?.phone||'').replace(/\D/g,'');
            return `<div class="bg-white border border-amber-200 rounded-lg p-2.5 min-w-[210px] flex-shrink-0">
              <div class="text-sm font-bold text-slate-800 truncate">${pmTenantName(b.tenant_id).replace(/</g,'&lt;')}</div>
              <div class="text-[10px] text-slate-500 truncate">🏠 ${(prop?.name||'—').replace(/</g,'&lt;').slice(0,20)} · 🛏 ${(unit?.code||unit?.name||'—').replace(/</g,'&lt;')}</div>
              <div class="text-[11px] text-slate-600 mt-1">📅 ${due.toISOString().slice(0,10)} · <strong class="text-emerald-700">$${Number(b.rent_amount||0).toLocaleString()}</strong> · ${pmRecurrenceOf(b.payment_day).label}</div>
              <div class="flex gap-1.5 mt-1.5">
                <button onclick="pmMarkPayment('${b.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 rounded">Marcar pagado</button>
                ${phone ? `<a href="https://wa.me/${phone}" target="_blank" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs">💬</a>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

    <!-- cards = resumen de la tabla filtrada -->
    <div class="grid grid-cols-2 lg:grid-cols-6 gap-2" id="pm-pay-cards">${pmPayCardsHtml()}</div>

    <!-- Buscador estático -->
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="pm-pay-search" oninput="pmPaymentsSearchInput(this.value)" value="${searchQ.replace(/"/g,'&quot;')}" placeholder="Buscar por inquilino, concepto o plataforma…" autocomplete="off" class="w-full border border-slate-300 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-full pl-9 pr-9 py-2 text-xs outline-none transition"/>
      <button id="pm-pay-clearx" onclick="document.getElementById('pm-pay-search').value='';pmPaymentsSearchInput('')" style="display:${searchQ?'':'none'}" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs">×</button>
    </div>

    <!-- Filtros (dropdowns) -->
    <div class="pm-filters-bar">
      ${pmFilterSelect('Mes', '📅', periodF==='month'?pmCurrentYM():periodF, pmMonthOptions(), "pmPaymentsSetFilter('period', this.value)")}
      ${pmFilterSelect('Estatus', '⚡', statF==='all'?'':statF, [['','Todos'],['aldia','Al día'],['pendiente','Pendiente del mes'],['proximo','Próximos 7d'],['atrasado','Atrasados'],['revisar','Revisar'],['sincontrato','Sin contrato']], "pmPaymentsSetFilter('status', this.value||'all')")}
      ${pmFilterSelect('Casa', '🏠', propFilter, [['','Todas'], ...propsWithPay.map(p=>[p.id, p.name||''])], "pmPaymentsSetFilter('property', this.value||null)")}
      ${pmFilterSelect('Recurrencia', '🔁', recF, [['','Todas'],['mensual','🗓 Mensual'],['quincenal','⏱ Quincenal'],['airbnb','🏖 Airbnb']], "pmPaymentsSetFilter('recurrence', this.value||null)")}
      ${pmFilterSelect('Plataforma', '💳', pmaState.payFilterPlatform, [['','Todas'], ...platforms.map(pl=>[pl, pl])], "pmPaymentsSetFilter('platform', this.value||null)")}
      ${pmPaymentsHasFilters()?`<button class="pm-clear-filters" onclick="pmPaymentsClearFilters()">✕ Limpiar</button>`:''}
    </div>

    <!-- Tabla -->
    <div id="pm-pay-list" class="bg-white border border-slate-200 rounded-xl overflow-x-auto">${pmPaymentsTableHtml()}</div>
  </div>`;
}
function pmSetPayMonth(ym) { pmaState.payMonth = ym; pmRender(); }
window.pmSetPayMonth = pmSetPayMonth;

// Picker de lease para "Registrar pago" → reusa el modal de pmMarkPayment
function pmPickLeaseForPayment() {
  const act = pmActiveBookings().slice().sort((a,b) => pmTenantName(a.tenant_id).localeCompare(pmTenantName(b.tenant_id)));
  openModal('💵 Registrar pago — elegí el lease', `
    <div class="space-y-1 max-h-[60vh] overflow-y-auto">
      ${act.length ? act.map(b => {
        const prop = pmaState.properties.find(x => x.id === b.property_id);
        const unit = pmaState.units.find(x => x.id === b.unit_id);
        return `<button onclick="closeModal();setTimeout(()=>pmMarkPayment('${b.id}'),60)" class="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded hover:bg-slate-50 border border-slate-100">
          <div class="min-w-0">
            <div class="text-sm font-bold text-slate-800 truncate">${pmTenantName(b.tenant_id).replace(/</g,'&lt;')}</div>
            <div class="text-[11px] text-slate-500 truncate">🏠 ${(prop?.name||'—').replace(/</g,'&lt;').slice(0,24)} · 🛏 ${(unit?.code||unit?.name||'—').replace(/</g,'&lt;')}</div>
          </div>
          <span class="text-sm font-bold text-emerald-700 whitespace-nowrap">$${Number(b.rent_amount||0).toLocaleString()}</span>
        </button>`;
      }).join('') : '<div class="text-sm text-slate-400 italic py-6 text-center">No hay leases activos.</div>'}
    </div>`);
}
window.pmPickLeaseForPayment = pmPickLeaseForPayment;

// ════════════════════════════════════════════════════════════════
// TAB · GASTOS (3 sub-tabs: por casa · operativos · nómina)
// ════════════════════════════════════════════════════════════════
const PM_TEAM = ['Nicolás Lara','Daniel Lara','Lucas Lara','Juan Felipe','Nicolás Sánchez','Carlos Vasquez'];

function pmRenderExpenses() {
  const sub = pmaState.expSubTab || 'house';
  const tabs = [['house','🏠 Por Casa'],['operational','🏢 Operativos'],['payroll','👔 Nómina']];
  return `
  <style>@keyframes pmfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.pm-fade{animation:pmfade .4s ease both}</style>
  <div class="space-y-3 p-1 pm-fade" style="font-family:Inter,system-ui,sans-serif">
    <div class="flex gap-1 border-b border-slate-200">
      ${tabs.map(([k,l]) => `<button onclick="pmaState.expSubTab='${k}';pmRender()" class="px-3 py-1.5 text-xs font-bold border-b-2 -mb-px transition ${sub===k?'border-[#d4af37] text-slate-900':'border-transparent text-slate-500 hover:text-slate-700'}">${l}</button>`).join('')}
    </div>
    ${sub === 'house' ? pmRenderHouseExpenses() : ''}
    ${sub === 'operational' ? pmRenderOperationalExpenses() : ''}
    ${sub === 'payroll' ? pmRenderPayrollTab() : ''}
  </div>`;
}

// Gráfico de torta SVG por categoría
function pmPieChart(entries, size = 150) {
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const colors = ['#d4af37','#10b981','#3b82f6','#f43f5e','#8b5cf6','#0ea5e9','#f59e0b','#64748b','#a855f7','#14b8a6'];
  let acc = 0; const cx = size/2, cy = size/2, r = size/2 - 2;
  const arcs = entries.map(([cat, val], i) => {
    const a0 = acc/total*2*Math.PI - Math.PI/2; acc += val; const a1 = acc/total*2*Math.PI - Math.PI/2;
    if (entries.length === 1) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colors[0]}"><title>${cat}: ${pmMoney(val)}</title></circle>`;
    const x0 = cx + r*Math.cos(a0), y0 = cy + r*Math.sin(a0), x1 = cx + r*Math.cos(a1), y1 = cy + r*Math.sin(a1);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return `<path d="M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${colors[i%colors.length]}"><title>${(cat||'').replace(/</g,'&lt;')}: ${pmMoney(val)}</title></path>`;
  }).join('');
  const legend = entries.slice(0, 8).map(([cat, val], i) => `<div class="flex items-center gap-1.5 text-[10px]"><span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:${colors[i%colors.length]}"></span><span class="text-slate-600 truncate">${(cat||'').replace(/</g,'&lt;')}</span><span class="ml-auto font-bold text-slate-700 whitespace-nowrap">${pmMoney(val)}</span></div>`).join('');
  return `<div class="flex items-center gap-4"><svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;flex-shrink:0">${arcs}</svg><div class="flex-1 space-y-1 min-w-0">${legend || '<div class="text-xs text-slate-400 italic">Sin datos.</div>'}</div></div>`;
}

function pmExpensesSetFilter(key, value) {
  const map = { property: 'expFilterProperty', subcat: 'expFilterSubcat', status: 'expStatusFilter' };
  pmaState[map[key]] = value;
  try { localStorage.setItem('pm_gastos_filter_' + key, value == null ? '' : value); } catch (e) {}
  pmRender();
}
window.pmExpensesSetFilter = pmExpensesSetFilter;
function pmExpensesInitFilters() {
  if (pmaState.expFiltersLoaded) return;
  pmaState.expFiltersLoaded = true;
  try {
    const g = (k) => { const v = localStorage.getItem(k); return (v === null || v === '') ? null : v; };
    pmaState.expFilterProperty = g('pm_gastos_filter_property');
    pmaState.expFilterSubcat = g('pm_gastos_filter_subcat');
    if (localStorage.getItem('pm_gastos_filter_status') !== null) pmaState.expStatusFilter = localStorage.getItem('pm_gastos_filter_status') || 'all';
  } catch (e) {}
}
function pmExpensesClearFilters() {
  pmaState.expFilterProperty = null; pmaState.expFilterSubcat = null; pmaState.expStatusFilter = 'all';
  try { ['property','subcat','status'].forEach(k => localStorage.removeItem('pm_gastos_filter_' + k)); } catch (e) {}
  pmRender();
}
window.pmExpensesClearFilters = pmExpensesClearFilters;

// ── Sub-tab A: Gastos por Casa (house + cleaning) ──
function pmRenderHouseExpenses() {
  pmExpensesInitFilters();
  const ym = pmaState.expMonth || pmDefaultYM();
  const propFilter = pmaState.expFilterProperty;
  const subcatFilter = pmaState.expFilterSubcat;
  const statusFilter = pmaState.expStatusFilter || 'all';
  const houseExp = pmaState.expenses.filter(e => ['house','cleaning'].includes(e.category));

  let rows = houseExp.filter(e => pmBillYm(e) === ym);
  const subcats = [...new Set(houseExp.map(e => e.subcategory).filter(Boolean))].sort();
  if (propFilter) rows = rows.filter(e => e.property_id === propFilter);
  if (subcatFilter) rows = rows.filter(e => e.subcategory === subcatFilter);
  if (statusFilter === 'paid') rows = rows.filter(e => e.paid);
  else if (statusFilter === 'pending') rows = rows.filter(e => !e.paid);
  rows = [...rows].sort((a,b) => (b.expense_date||'').localeCompare(a.expense_date||''));

  const monthAll = houseExp.filter(e => pmBillYm(e) === ym);
  // Sin período (ni tag Mes/Año ni Fecha): nunca se pierden — bucket aparte p/ completar.
  const sinMes = houseExp.filter(e => !pmBillYm(e));
  const sinMesMonto = sinMes.reduce((s,e) => s + Number(e.amount||0), 0);
  const totalMonth = rows.reduce((s,e) => s + Number(e.amount||0), 0);
  const paidSum = rows.filter(e => e.paid).reduce((s,e) => s + Number(e.amount||0), 0);
  const pendSum = totalMonth - paidSum;
  // Sin casa
  const orphanSum = monthAll.filter(e => !e.property_id).reduce((s,e) => s + Number(e.amount||0), 0);
  const orphanCount = monthAll.filter(e => !e.property_id).length;
  // Por casa este mes
  const byProp = {};
  monthAll.forEach(e => { if (e.property_id) byProp[e.property_id] = (byProp[e.property_id]||0) + Number(e.amount||0); });
  const propEntries = Object.entries(byProp).sort((a,b) => b[1]-a[1]);
  const topProp = propEntries[0];
  // Top categorías + pie — respeta el filtro de casa seleccionado (G)
  const catBase = propFilter ? monthAll.filter(e => e.property_id === propFilter) : monthAll;
  const byCat = {};
  catBase.forEach(e => { const k = e.subcategory || '(otro)'; byCat[k] = (byCat[k]||0) + Number(e.amount||0); });
  const catEntries = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
  const top3 = catEntries.slice(0,3);
  // Tendencia vs mes anterior
  const prevYm = pmYmShift(ym, -1);
  const prevTotal = houseExp.filter(e => pmBillYm(e) === prevYm).reduce((s,e) => s + Number(e.amount||0), 0);
  const monthTotalAll = monthAll.reduce((s,e) => s + Number(e.amount||0), 0);
  const trendPct = prevTotal ? Math.round((monthTotalAll - prevTotal)/prevTotal*100) : (monthTotalAll>0?100:0);

  const card = (label, value, sub2, accent) => `
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${label}</div>
      <div class="text-xl font-extrabold mt-1 ${accent||'text-slate-900'}">${value}</div>
      ${sub2?`<div class="text-[11px] text-slate-500 mt-0.5">${sub2}</div>`:''}
    </div>`;
  const hasF = propFilter || subcatFilter || statusFilter !== 'all';

  return `
  <div class="space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="text-sm font-bold text-slate-900">Gastos por Casa · ${pmYmLabel(ym)}</div>
      <div class="flex items-center gap-2">
        ${hasF ? `<button onclick="pmExpensesClearFilters()" class="text-[11px] text-[#b8941f] hover:underline font-bold">✕ Limpiar</button>` : ''}
        ${pmMonthNav(ym, 'pmSetExpMonth(%V%)')}
        <button onclick="pmEditExpense(null,'house')" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg" style="border:1px solid #d4af37">+ Registrar gasto</button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
      ${card('Gasto del mes', pmMoney(monthTotalAll), `${monthAll.length} movimientos`, 'text-red-600')}
      ${card('Gastos sin casa', pmMoney(orphanSum), `${orphanCount} ${orphanCount===1?'registro':'registros'} a corregir`, orphanSum>0?'text-red-600':'text-emerald-700')}
      ${card('Top 3 categorías', top3.length?pmMoney(top3.reduce((s,[,v])=>s+v,0)):'—', top3.map(([c])=>c).join(', ').slice(0,28)||'—')}
      ${card('Tendencia vs mes ant.', (trendPct>=0?'+':'')+trendPct+'%', `ant. ${pmMoney(prevTotal)}`, trendPct>0?'text-red-600':'text-emerald-700')}
    </div>

    ${sinMes.length ? `<div class="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-800">
      ⚠️ <strong>${sinMes.length}</strong> gasto${sinMes.length>1?'s':''} sin mes (ni tag Mes/Año ni Fecha) · ${pmMoney(sinMesMonto)} — no entran a ningún período · <strong>completar en Airtable</strong>: ${sinMes.slice(0,4).map(e => (e.description||'—').replace(/</g,'&lt;').slice(0,26)).join(' · ')}${sinMes.length>4?' · …':''}
    </div>` : ''}

    <div class="grid lg:grid-cols-3 gap-3">
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Desglose por categoría</div>
        ${pmPieChart(catEntries)}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Desglose por casa · ${pmYmLabel(ym)}</div>
        ${propEntries.length ? `<div class="space-y-1 max-h-52 overflow-y-auto">${propEntries.map(([pid, v]) => {
          const pct = monthTotalAll ? Math.round(v/monthTotalAll*100) : 0;
          return `<div class="flex items-center gap-2 text-[11px]">
            <button onclick="pmExpensesSetFilter('property','${pid}')" class="text-slate-700 hover:text-[#b8941f] hover:underline text-left truncate flex-1">${pmPropertyName(pid).replace(/</g,'&lt;').slice(0,24)}</button>
            <div class="w-20 bg-slate-100 rounded-full h-1.5 flex-shrink-0"><div class="bg-red-400 h-1.5 rounded-full" style="width:${pct}%"></div></div>
            <span class="font-bold text-slate-800 whitespace-nowrap">${pmMoney(v)}</span>
          </div>`;
        }).join('')}</div>` : '<div class="text-[11px] text-slate-400 italic">Sin gastos con casa este mes.</div>'}
        ${orphanCount ? `<div class="text-[10px] text-amber-700 mt-2">+ ${pmMoney(orphanSum)} sin casa (${orphanCount})</div>` : ''}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Pagado vs pendiente (filtrado)</div>
        <div class="text-2xl font-extrabold text-emerald-700">${pmMoney(paidSum)} <span class="text-sm text-slate-400 font-normal">pagado</span></div>
        <div class="text-sm font-bold ${pendSum>0?'text-amber-600':'text-slate-400'} mt-1">${pmMoney(pendSum)} pendiente</div>
        ${topProp?`<div class="text-[11px] text-slate-500 mt-2">Casa con mayor gasto: <strong>${pmPropertyName(topProp[0]).replace(/</g,'&lt;').slice(0,20)}</strong> · ${pmMoney(topProp[1])}</div>`:''}
      </div>
    </div>

    <!-- Filtros (dropdowns) -->
    <div class="pm-filters-bar">
      ${pmFilterSelect('Mes', '📅', ym, pmMonthOptions(false), "pmSetExpMonth(this.value)")}
      ${pmFilterSelect('Casa', '🏠', propFilter, [['','Todas'], ...pmaState.properties.filter(p=>houseExp.some(e=>e.property_id===p.id)).map(p=>[p.id, p.name||''])], "pmExpensesSetFilter('property', this.value||null)")}
      ${pmFilterSelect('Categoría', '📂', subcatFilter, [['','Todas'], ...subcats.map(s=>[s, s])], "pmExpensesSetFilter('subcat', this.value||null)")}
      ${pmFilterSelect('Estatus', '⚡', statusFilter==='all'?'':statusFilter, [['','Todos'],['paid','Pagado'],['pending','Pendiente']], "pmExpensesSetFilter('status', this.value||'all')")}
      ${hasF?`<button class="pm-clear-filters" onclick="pmExpensesClearFilters()">✕ Limpiar</button>`:''}
    </div>

    ${pmExpenseTable(rows, true, true)}
  </div>`;
}

// ── Sub-tab B: Gastos Operativos Empresa ──
function pmRenderOperationalExpenses() {
  const ym = pmaState.expMonth || pmDefaultYM();
  const subcatFilter = pmaState.expFilterSubcat;
  const opExp = pmaState.expenses.filter(e => e.category === 'operational');

  let rows = opExp.filter(e => pmBillYm(e) === ym);
  const subcats = [...new Set(opExp.map(e => e.subcategory).filter(Boolean))].sort();
  if (subcatFilter) rows = rows.filter(e => e.subcategory === subcatFilter);
  rows = [...rows].sort((a,b) => (b.expense_date||'').localeCompare(a.expense_date||''));
  const totalMonth = rows.reduce((s,e) => s + Number(e.amount||0), 0);

  // Por categoría (bar chart) del mes
  const byCat = {};
  rows.forEach(e => { byCat[e.subcategory||'(otro)'] = (byCat[e.subcategory||'(otro)']||0) + Number(e.amount||0); });
  const catEntries = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
  const maxCat = Math.max(1, ...catEntries.map(c => c[1]));

  // Tendencia 12 meses
  const trend = [];
  for (let i=11; i>=0; i--) {
    const m = pmYmShift(ym, -i);
    const tot = opExp.filter(e => pmBillYm(e) === m).reduce((s,e) => s + Number(e.amount||0), 0);
    trend.push({ label: PM_ES_MONTHS_SHORT[pmYmMonthIdx(m)], value: tot });
  }

  return `
  <div class="space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="text-sm font-bold text-slate-900">Gastos Operativos · ${pmYmLabel(ym)}</div>
      <div class="flex items-center gap-2">
        ${pmMonthNav(ym, 'pmSetExpMonth(%V%)')}
        <button onclick="pmEditExpense(null,'operational')" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg" style="border:1px solid #d4af37">+ Registrar gasto</button>
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-3">
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total del mes</div>
        <div class="text-3xl font-extrabold mt-1 text-red-600">${pmMoney(totalMonth)}</div>
        <div class="text-[11px] text-slate-500 mt-0.5">${rows.length} movimientos</div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4 lg:col-span-2">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Por categoría</div>
        ${catEntries.length ? `<div class="space-y-1.5">${catEntries.slice(0,8).map(([cat,val]) => `
          <div class="flex items-center gap-2 text-[11px]">
            <span class="w-24 truncate text-slate-600">${(cat||'').replace(/</g,'&lt;')}</span>
            <div class="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden"><div class="h-3 rounded-full" style="width:${Math.round(100*val/maxCat)}%;background:#d4af37"></div></div>
            <span class="w-16 text-right font-bold text-slate-700">${pmMoney(val)}</span>
          </div>`).join('')}</div>` : '<div class="text-xs text-slate-400 italic">Sin datos.</div>'}
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Tendencia 12 meses</div>
      ${pmLineChart(trend)}
    </div>

    <div class="bg-white border border-slate-200 rounded-lg p-2 flex flex-wrap items-center gap-2">
      <select onchange="pmaState.expFilterSubcat=this.value||null;pmRender()" class="border border-slate-300 rounded px-2 py-1.5 text-xs">
        <option value="">📂 Todas las categorías</option>
        ${subcats.map(s => `<option value="${s}" ${subcatFilter===s?'selected':''}>${(s||'').replace(/</g,'&lt;')}</option>`).join('')}
      </select>
    </div>

    ${pmExpenseTable(rows, false)}
  </div>`;
}

// Mini line chart genérico para tendencia (1 serie)
function pmLineChart(series) {
  const W=620,H=150,padL=12,padR=12,padT=14,padB=22,n=series.length;
  const max=Math.max(1,...series.map(s=>s.value));
  const x=i=> padL+(i*(W-padL-padR)/Math.max(1,n-1));
  const yv=v=> H-padB-(v/max)*(H-padT-padB);
  const path=series.map((s,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${yv(s.value).toFixed(1)}`).join(' ');
  const area=`${path} L${x(n-1).toFixed(1)},${H-padB} L${x(0).toFixed(1)},${H-padB} Z`;
  const dots=series.map((s,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${yv(s.value).toFixed(1)}" r="2.6" fill="#d4af37"><title>${s.label}: ${pmMoney(s.value)}</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full" style="height:160px">
    <path d="${area}" fill="rgba(212,175,55,.08)"/>
    <path d="${path}" fill="none" stroke="#d4af37" stroke-width="2"/>${dots}
    ${series.map((s,i)=>`<text x="${x(i).toFixed(1)}" y="${H-6}" font-size="9" fill="#94a3b8" text-anchor="middle">${s.label}</text>`).join('')}
  </svg>`;
}

// Tabla de gastos compartida (withHouse = mostrar columna Casa)
function pmExpenseSortVal(e, key) {
  switch (key) {
    case 'mes': return pmBillYm(e) || '';
    case 'fecha': return e.expense_date || '';
    case 'casa': return e.property_id ? pmPropertyName(e.property_id) : '';
    case 'categoria': return (e.subcategory || e.category || '');
    case 'monto': return Number(e.amount || 0);
    case 'pagado': return e.paid ? 1 : 0;
    case 'notas': return (e.description || e.notes || '');
    default: return '';
  }
}
function pmExpensesSorted(rows) {
  const k = pmaState.expSortKey;
  if (!k) return rows;
  const dir = pmaState.expSortDir === 'desc' ? -1 : 1;
  return rows.slice().sort((a, b) => {
    const va = pmExpenseSortVal(a, k), vb = pmExpenseSortVal(b, k);
    if (typeof va === 'number' || typeof vb === 'number') return (Number(va || 0) - Number(vb || 0)) * dir;
    return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' }) * dir;
  });
}
function pmExpenseSort(key) {
  if (pmaState.expSortKey === key) {
    if (pmaState.expSortDir === 'asc') pmaState.expSortDir = 'desc';
    else { pmaState.expSortKey = null; pmaState.expSortDir = 'asc'; }  // 3er clic = vuelve al orden por defecto
  } else { pmaState.expSortKey = key; pmaState.expSortDir = 'asc'; }
  pmRender();
}
window.pmExpenseSort = pmExpenseSort;
function pmExpenseTable(rows, withHouse, flagOrphans) {
  rows = pmExpensesSorted(rows);
  const eth = (key, label, align, title) => {
    const active = pmaState.expSortKey === key;
    const arrow = active ? (pmaState.expSortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return `<th class="px-3 py-2 text-${align} cursor-pointer select-none hover:text-slate-800 ${active ? 'text-slate-800' : ''}" ${title ? `title="${title} · clic para ordenar"` : 'title="Clic para ordenar"'} onclick="pmExpenseSort('${key}')">${label}${arrow}</th>`;
  };
  return `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
          <tr>
            ${eth('mes','Mes gasto','left','Período que agrupa (tag Mes/Año de Airtable)')}
            ${eth('fecha','Fecha','left','Cuándo se pagó — solo informativa, no agrupa')}
            ${withHouse?eth('casa','Casa','left'):''}
            ${eth('categoria','Categoría','left')}
            ${eth('monto','Monto','right')}
            <th class="px-3 py-2 text-center">Factura</th>
            ${eth('pagado','Pagado','center')}
            ${eth('notas','Notas','left')}
            <th class="px-3 py-2 text-center">Acc.</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(e => {
            const url = e.invoice_url;
            const note = e.description || e.notes || '';
            const orphan = flagOrphans && !e.property_id;
            const atLink = e.external_id ? pmAirtableLink(e.external_id, 'tblGBQ5xn9Zp6YrTN') : null;
            const mesTag = e.month ? `${e.month.charAt(0).toUpperCase()+e.month.slice(1)} ${e.year||''}`.trim() : null;
            const ymE = pmBillYm(e);
            return `<tr class="border-t border-slate-100 ${orphan?'bg-red-50':'hover:bg-slate-50'}">
              <td class="px-3 py-2 whitespace-nowrap font-semibold text-slate-800">${mesTag || (ymE ? `${pmYmLabel(ymE)} <span class="text-[10px] text-slate-400 font-normal" title="Sin tag Mes/Año: período tomado de la fecha">· fecha</span>` : '<span class="text-amber-600" title="Sin Mes/Año ni Fecha en Airtable">sin mes</span>')}</td>
              <td class="px-3 py-2 whitespace-nowrap text-slate-500">${e.expense_date||'—'}</td>
              ${withHouse?`<td class="px-3 py-2 ${orphan?'text-red-700 font-bold':'text-slate-600'}">${orphan?`⚠️ Sin casa${atLink?` · <a href="${atLink}" target="_blank" class="underline">Abrir en Airtable</a>`:' — corregir'}`:(e.property_id?pmPropertyName(e.property_id):'—').replace(/</g,'&lt;').slice(0,18)}</td>`:''}
              <td class="px-3 py-2 text-slate-700">${(e.subcategory||e.category||'—').replace(/</g,'&lt;')}</td>
              <td class="px-3 py-2 text-right font-bold text-red-600">$${Number(e.amount||0).toLocaleString()}</td>
              <td class="px-3 py-2 text-center">${url?`<a href="${url}" target="_blank" class="text-blue-600 hover:underline">📎</a>`:'<span class="text-slate-300">—</span>'}</td>
              <td class="px-3 py-2 text-center"><button onclick="pmToggleExpensePaid('${e.id}',${!e.paid})" title="${e.paid?'Pagado':'Pendiente'}">${e.paid?'✅':'⏳'}</button></td>
              <td class="px-3 py-2 text-slate-500 max-w-[160px] truncate" title="${String(note).replace(/"/g,'&quot;')}">${String(note).replace(/</g,'&lt;').slice(0,40)}</td>
              <td class="px-3 py-2 text-center"><button onclick="pmEditExpense('${e.id}')" class="text-slate-400 hover:text-slate-700">✏️</button></td>
            </tr>`;
          }).join('') : `<tr><td colspan="${withHouse?8:7}" class="px-3 py-8 text-center text-slate-400 italic">Sin gastos en este período.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}
function pmSetExpMonth(ym) { pmaState.expMonth = ym; pmRender(); }
window.pmSetExpMonth = pmSetExpMonth;

async function pmToggleExpensePaid(id, paid) {
  const r = await pmExecQuery(sb.from('pm_expenses').update({ paid }).eq('id', id).select(), 'Actualizar gasto');
  if (!r) return;
  const e = pmaState.expenses.find(x => x.id === id);
  if (e) e.paid = paid;
  pmRender();
}
window.pmToggleExpensePaid = pmToggleExpensePaid;

// ── Sub-tab C: Nómina del Equipo ──
function pmRenderPayrollTab() {
  const ym = pmaState.expMonth || pmDefaultYM();
  const y = pmYmYear(ym);
  const mes = PM_ES_MONTHS[pmYmMonthIdx(ym)];
  const view = pmaState.payrollView || 'people';

  const rowsMonth = (pmaState.payroll||[]).filter(p => Number(p.year)===y && (p.month||'').toLowerCase()===mes);
  const rowFor = (name) => rowsMonth.find(p => (p.employee_name||'').toLowerCase() === name.toLowerCase());
  // Salario estándar = último salario conocido de la persona
  const lastSalary = {};
  (pmaState.payroll||[]).slice().sort((a,b) => (Number(b.year)||0)-(Number(a.year)||0) || PM_ES_MONTHS.indexOf((b.month||'').toLowerCase())-PM_ES_MONTHS.indexOf((a.month||'').toLowerCase()))
    .forEach(p => { const n=(p.employee_name||'').toLowerCase(); if(!(n in lastSalary) && p.salary) lastSalary[n]=Number(p.salary); });

  // Lista de personas: equipo fijo + cualquiera presente en datos
  const extra = [...new Set((pmaState.payroll||[]).map(p=>p.employee_name).filter(Boolean))].filter(n => !PM_TEAM.some(t => t.toLowerCase()===n.toLowerCase()));
  const team = [...PM_TEAM, ...extra];

  const totalMonth = rowsMonth.reduce((s,p) => s + Number(p.salary||0), 0);
  const paidMonth = rowsMonth.filter(p=>p.paid).reduce((s,p) => s + Number(p.salary||0), 0);

  const header = `
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="text-sm font-bold text-slate-900">Nómina · ${pmYmLabel(ym)}</div>
      <div class="flex items-center gap-2">
        <div class="flex items-center bg-slate-100 rounded-full p-0.5 text-[10px] font-bold">
          <button onclick="pmaState.payrollView='people';pmRender()" class="px-3 py-1 rounded-full ${view==='people'?'bg-white shadow text-slate-900':'text-slate-500'}">Por persona</button>
          <button onclick="pmaState.payrollView='monthly';pmRender()" class="px-3 py-1 rounded-full ${view==='monthly'?'bg-white shadow text-slate-900':'text-slate-500'}">Mensual</button>
        </div>
        ${pmMonthNav(ym, 'pmSetExpMonth(%V%)')}
      </div>
    </div>`;

  if (view === 'people') {
    return `
    <div class="space-y-3">
      ${header}
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
        ${team.map(name => {
          const row = rowFor(name);
          const salary = row ? Number(row.salary||0) : (lastSalary[name.toLowerCase()]||0);
          const paid = !!row?.paid;
          const initial = name.trim().charAt(0).toUpperCase();
          return `<div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style="background:#1e293b;border:2px solid #d4af37">${initial}</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-bold text-slate-900 truncate">${name.replace(/</g,'&lt;')}</div>
              <div class="text-[11px] text-slate-500">${salary?pmMoney(salary)+'/mes':'sin salario'}</div>
              <div class="text-[11px] font-bold ${paid?'text-emerald-600':'text-amber-600'}">${paid?'✅ Pagado':'⏳ Pendiente'}</div>
            </div>
            ${!paid ? `<button onclick="pmPayrollMarkPaid('${ym}','${name.replace(/'/g,"\\'")}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2 py-1 rounded whitespace-nowrap">Marcar pagado</button>`
                    : `<button onclick="pmPayrollMarkPaid('${ym}','${name.replace(/'/g,"\\'")}',false)" class="text-[11px] text-slate-400 hover:text-slate-600 whitespace-nowrap">Revertir</button>`}
          </div>`;
        }).join('')}
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
        <div class="text-xs text-slate-600">Total nómina del mes: <strong class="text-slate-900">${pmMoney(totalMonth)}</strong> · pagado ${pmMoney(paidMonth)}</div>
        <button onclick="pmGeneratePayroll('${ym}')" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg" style="border:1px solid #d4af37">Generar nómina del mes</button>
      </div>
    </div>`;
  }

  // Vista mensual: tabla
  const sorted = [...rowsMonth].sort((a,b) => (a.employee_name||'').localeCompare(b.employee_name||''));
  return `
  <div class="space-y-3">
    ${header}
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
          <tr><th class="px-3 py-2 text-left">Persona</th><th class="px-3 py-2 text-right">Salario</th><th class="px-3 py-2 text-center">Estado</th><th class="px-3 py-2 text-center">Factura</th><th class="px-3 py-2 text-center">Acc.</th></tr>
        </thead>
        <tbody>
          ${sorted.length ? sorted.map(p => `<tr class="border-t border-slate-100 hover:bg-slate-50">
            <td class="px-3 py-2 text-slate-800 font-semibold">${(p.employee_name||'—').replace(/</g,'&lt;')}</td>
            <td class="px-3 py-2 text-right font-bold text-slate-700">$${Number(p.salary||0).toLocaleString()}</td>
            <td class="px-3 py-2 text-center">${p.paid?'<span class="text-emerald-600 font-bold">✅ Pagado</span>':'<span class="text-amber-600 font-bold">⏳ Pendiente</span>'}</td>
            <td class="px-3 py-2 text-center">${p.invoice_url?`<a href="${p.invoice_url}" target="_blank" class="text-blue-600 hover:underline">📎</a>`:'—'}</td>
            <td class="px-3 py-2 text-center"><button onclick="pmPayrollMarkPaid('${ym}','${(p.employee_name||'').replace(/'/g,"\\'")}',${!p.paid})" class="text-slate-400 hover:text-slate-700">${p.paid?'↩️':'✅'}</button></td>
          </tr>`).join('') : '<tr><td colspan="5" class="px-3 py-8 text-center text-slate-400 italic">Sin nómina generada para este mes. Usá «Generar nómina del mes».</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
      <div class="text-xs text-slate-600">Total: <strong class="text-slate-900">${pmMoney(totalMonth)}</strong></div>
      <button onclick="pmGeneratePayroll('${ym}')" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg" style="border:1px solid #d4af37">Generar nómina del mes</button>
    </div>
  </div>`;
}

async function pmPayrollMarkPaid(ym, name, paid = true) {
  const y = pmYmYear(ym);
  const mes = PM_ES_MONTHS[pmYmMonthIdx(ym)];
  const existing = (pmaState.payroll||[]).find(p => Number(p.year)===y && (p.month||'').toLowerCase()===mes && (p.employee_name||'').toLowerCase()===name.toLowerCase());
  if (existing) {
    const r = await pmExecQuery(sb.from('pm_payroll').update({ paid }).eq('id', existing.id).select(), 'Actualizar nómina');
    if (!r) return;
    existing.paid = paid;
  } else {
    // crear row con último salario conocido
    const last = (pmaState.payroll||[]).filter(p => (p.employee_name||'').toLowerCase()===name.toLowerCase() && p.salary)
      .sort((a,b) => (Number(b.year)||0)-(Number(a.year)||0))[0];
    const payload = { employee_name: name, salary: last?Number(last.salary):0, month: mes, year: y, paid };
    const r = await pmExecQuery(sb.from('pm_payroll').insert(payload).select(), 'Crear nómina');
    if (!r) return;
    if (r.data?.[0]) pmaState.payroll.push(r.data[0]);
  }
  pmRender();
}
window.pmPayrollMarkPaid = pmPayrollMarkPaid;

async function pmGeneratePayroll(ym) {
  const y = pmYmYear(ym);
  const mes = PM_ES_MONTHS[pmYmMonthIdx(ym)];
  const lastSalary = {};
  (pmaState.payroll||[]).slice().sort((a,b) => (Number(b.year)||0)-(Number(a.year)||0))
    .forEach(p => { const n=(p.employee_name||'').toLowerCase(); if(!(n in lastSalary) && p.salary) lastSalary[n]=Number(p.salary); });
  const existing = new Set((pmaState.payroll||[]).filter(p => Number(p.year)===y && (p.month||'').toLowerCase()===mes).map(p => (p.employee_name||'').toLowerCase()));
  const toCreate = PM_TEAM.filter(n => !existing.has(n.toLowerCase()))
    .map(n => ({ employee_name: n, salary: lastSalary[n.toLowerCase()]||0, month: mes, year: y, paid: false }));
  if (!toCreate.length) return alert('La nómina de ' + pmYmLabel(ym) + ' ya está generada para todo el equipo.');
  if (!confirm(`Generar ${toCreate.length} registros de nómina pendientes para ${pmYmLabel(ym)}?`)) return;
  const r = await pmExecQuery(sb.from('pm_payroll').insert(toCreate).select(), 'Generar nómina');
  if (!r) return;
  await pmAfterCrud();
}
window.pmGeneratePayroll = pmGeneratePayroll;

// ── Registrar / editar Gasto ──
async function pmEditExpense(id, defaultCat) {
  const e = id ? pmaState.expenses.find(x => x.id === id) : { category: defaultCat || 'house', expense_date: new Date().toISOString().slice(0,10), paid: false };
  const isNew = !id;
  const cat = e.category || 'house';
  const allSub = [...new Set(pmaState.expenses.map(x => x.subcategory).filter(Boolean))].sort();
  openModal((isNew?'+ Registrar':'✏️ Editar')+' Gasto', `
    <div class="space-y-3">
      <div>
        <label class="text-[10px] font-bold uppercase text-slate-600">Categoría *</label>
        <div class="flex gap-2 mt-1" id="pm-ef-catwrap">
          ${[['house','🏠 Por casa'],['cleaning','🧹 Limpieza'],['operational','🏢 Operativo']].map(([v,l]) => `
            <label class="flex items-center gap-1 text-xs cursor-pointer border border-slate-300 rounded px-2 py-1.5 ${cat===v?'bg-slate-900 text-white':''}">
              <input type="radio" name="pm-ef-cat" value="${v}" ${cat===v?'checked':''} onchange="pmEfToggleCat()" class="hidden"/>${l}
            </label>`).join('')}
        </div>
      </div>
      <div id="pm-ef-proprow" style="${cat==='operational'?'display:none':''}">
        <label class="text-[10px] font-bold uppercase text-slate-600">Casa</label>
        <select id="pm-ef-prop" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
          <option value="">— Elegir —</option>
          ${pmaState.properties.map(p => `<option value="${p.id}" ${e.property_id===p.id?'selected':''}>${(p.name||'').replace(/</g,'&lt;')}</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Subcategoría</label>
          <input id="pm-ef-subcat" list="pm-ef-subcats" value="${(e.subcategory||'').replace(/"/g,'&quot;')}" placeholder="Coa / Texas Gas / Arreglos…" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
          <datalist id="pm-ef-subcats">${allSub.map(s => `<option value="${(s||'').replace(/"/g,'&quot;')}">`).join('')}</datalist></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Monto * $</label>
          <input id="pm-ef-amount" type="number" step="0.01" value="${e.amount||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Fecha *</label>
          <input id="pm-ef-date" type="date" value="${e.expense_date||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div class="flex items-end"><label class="flex items-center gap-2 text-sm font-bold text-slate-700"><input id="pm-ef-paid" type="checkbox" ${e.paid?'checked':''}/> Pagado</label></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Factura (imagen/PDF)</label>
        <input id="pm-ef-file" type="file" accept="image/*,application/pdf" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"/>
        ${e.invoice_url?`<a href="${e.invoice_url}" target="_blank" class="text-[11px] text-blue-600 hover:underline">📎 Factura actual</a>`:''}</div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Descripción / notas</label>
        <textarea id="pm-ef-desc" rows="2" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">${(e.description||e.notes||'').replace(/</g,'&lt;')}</textarea></div>
      <div id="pm-ef-status" class="text-[11px] text-slate-500"></div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${!isNew ? `<button onclick="pmDeleteExpense('${id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded">🗑</button>` : ''}
        <button id="pm-ef-save" onclick="pmSaveExpense('${id||''}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded" style="border:1px solid #d4af37">${isNew?'Registrar':'Guardar'}</button>
      </div>
    </div>
  `);
}
window.pmEditExpense = pmEditExpense;

function pmEfToggleCat() {
  const cat = document.querySelector('input[name="pm-ef-cat"]:checked')?.value;
  const row = document.getElementById('pm-ef-proprow');
  if (row) row.style.display = (cat === 'operational') ? 'none' : '';
  document.querySelectorAll('#pm-ef-catwrap label').forEach(l => {
    const on = l.querySelector('input')?.checked;
    l.classList.toggle('bg-slate-900', on); l.classList.toggle('text-white', on);
  });
}
window.pmEfToggleCat = pmEfToggleCat;

async function pmSaveExpense(id) {
  const cat = document.querySelector('input[name="pm-ef-cat"]:checked')?.value || 'house';
  const amount = +document.getElementById('pm-ef-amount').value || 0;
  const expense_date = document.getElementById('pm-ef-date').value || null;
  const property_id = (cat === 'operational') ? null : (document.getElementById('pm-ef-prop').value || null);
  const fileEl = document.getElementById('pm-ef-file');
  const statusEl = document.getElementById('pm-ef-status');
  const saveBtn = document.getElementById('pm-ef-save');
  if (!amount) return alert('El monto es obligatorio.');
  if (!expense_date) return alert('La fecha es obligatoria.');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando…'; }

  let invoice_url = null;
  const file = fileEl?.files?.[0];
  if (file) {
    if (statusEl) statusEl.textContent = 'Subiendo factura…';
    const up = await pmUploadFile('invoices', property_id || cat, file);
    if (up.url) invoice_url = up.url;
    else if (statusEl) statusEl.textContent = '⚠️ Factura no subida: ' + up.error + ' (se guarda sin adjunto)';
  }

  const ymd = expense_date;
  const payload = {
    category: cat,
    subcategory: document.getElementById('pm-ef-subcat').value.trim() || null,
    property_id,
    amount,
    expense_date,
    month: PM_ES_MONTHS[parseInt(ymd.slice(5,7),10)-1],
    year: parseInt(ymd.slice(0,4), 10),
    description: document.getElementById('pm-ef-desc').value.trim() || null,
    paid: document.getElementById('pm-ef-paid').checked
  };
  if (invoice_url) payload.invoice_url = invoice_url;
  const r = id
    ? await pmExecQuery(sb.from('pm_expenses').update(payload).eq('id', id).select(), 'Update gasto')
    : await pmExecQuery(sb.from('pm_expenses').insert(payload).select(), 'Crear gasto');
  if (!r) { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = id?'Guardar':'Registrar'; } return; }
  await pmAfterCrud();
}
window.pmSaveExpense = pmSaveExpense;

async function pmDeleteExpense(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  const r = await pmExecQuery(sb.from('pm_expenses').delete().eq('id', id), 'Eliminar gasto');
  if (!r) return;
  await pmAfterCrud();
}
window.pmDeleteExpense = pmDeleteExpense;

// ════════════════════════════════════════════════════════════════
// TAB 4 · FINANZAS — Dashboard ejecutivo + P&L por casa
// ════════════════════════════════════════════════════════════════
// Rango del período seleccionado → { fromISO, toISO, ymList, label }
function pmFinRange() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const sel = pmaState.finMonthSel || (pmaState.finPeriod === 'last3' ? 'last-3m' : pmaState.finPeriod === 'ytd' ? 'ytd' : pmaState.finPeriod === 'custom' ? 'custom' : pmDefaultYM());
  let from, to, label;
  if (/^\d{4}-\d{2}$/.test(sel)) { const yy=+sel.slice(0,4), mm=+sel.slice(5,7)-1; from=new Date(yy,mm,1); to=new Date(yy,mm+1,0); label=pmYmLabel(sel); }
  else if (sel === 'ytd' || sel === 'year') { from = new Date(y, 0, 1); to = now; label = 'YTD ' + y; }
  else if (sel === 'last-3m' || sel === 'last3') { from = new Date(y, m-2, 1); to = new Date(y, m+1, 0); label = 'Últimos 3 meses'; }
  else if (sel === 'last-6m') { from = new Date(y, m-5, 1); to = new Date(y, m+1, 0); label = 'Últimos 6 meses'; }
  else if (sel === 'last-12m') { from = new Date(y, m-11, 1); to = new Date(y, m+1, 0); label = 'Últimos 12 meses'; }
  else if (sel === 'all-time') { from = new Date(2020, 0, 1); to = now; label = 'Todo el histórico'; }
  else if (sel === 'custom') {
    from = pmaState.finCustomFrom ? new Date(pmaState.finCustomFrom+'T00:00:00') : new Date(y, m, 1);
    to   = pmaState.finCustomTo   ? new Date(pmaState.finCustomTo+'T00:00:00')   : now;
    label = `${iso(from)} → ${iso(to)}`;
  } else { from = new Date(y, m, 1); to = new Date(y, m+1, 0); label = pmYmLabel(pmCurrentYM()); }
  // Lista de YM cubiertos
  const ymList = [];
  let cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) { ymList.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`); cur.setMonth(cur.getMonth()+1); }
  return { fromISO: iso(from), toISO: iso(to), ymList, label, months: ymList.length };
}
function pmInRange(dateStr, r) { return dateStr && dateStr >= r.fromISO && dateStr <= r.toISO; }
// Índice de mes robusto (español, número, o inglés)
function pmMonthIdx(m) {
  if (m == null) return -1;
  const s = String(m).trim().toLowerCase();
  let i = PM_ES_MONTHS.indexOf(s);
  if (i >= 0) return i;
  const n = parseInt(s, 10);
  if (n >= 1 && n <= 12) return n - 1;
  const en = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  i = en.indexOf(s); if (i >= 0) return i;
  return -1;
}
function pmPayrollInRange(r) {
  return (pmaState.payroll||[]).filter(p => {
    const idx = pmMonthIdx(p.month);
    if (idx < 0) return false;
    if (p.year) return r.ymList.includes(`${p.year}-${String(idx+1).padStart(2,'0')}`);
    return r.ymList.some(ym => (parseInt(ym.slice(5,7),10)-1) === idx);  // sin año → match por mes
  }).reduce((s,p) => s + Number(p.salary||0), 0);
}
function pmIsAseo(e) { return e.category === 'cleaning' || /aseo|podada|cesped|césped|lawn|cleaning/i.test(e.subcategory||''); }
// Agregado P&L del período (ingresos, gastos por categoría, nómina, breakdowns, por casa)
// Respeta los filtros globales del dashboard: casa, plataforma, modelo de renta.
function pmFinAgg(r) {
  const propF = pmaState.finFilterProperty, platF = pmaState.finFilterPlatform, modelF = pmaState.finFilterModel;
  // Conjunto de propiedades en alcance (casa / modelo)
  let scopeProps = pmaState.properties.filter(p => p.active !== false);
  if (propF) scopeProps = scopeProps.filter(p => p.id === propF);
  if (modelF) scopeProps = scopeProps.filter(p => (p.rental_model || 'casa_completa') === modelF);
  const scopeIds = new Set(scopeProps.map(p => p.id));
  const scoped = (propF || modelF);
  // MES DE RENTA (tag Mes/Año → billing_ym) para ingresos Y gastos — una sola definición.
  // Si la fila no tiene tag, pmBillYm cae a la fecha (paid_at/expense_date).
  const inYms = (x) => r.ymList.includes(pmBillYm(x));
  const inc = pmaState.payments.filter(p => p.type==='ingreso' && inYms(p)
    && (!scoped || scopeIds.has(p.property_id))
    && (!platF || (pmPaymentBooking(p)?.booking_type === platF)));
  const exp = pmaState.expenses.filter(e => inYms(e) && (!scoped || scopeIds.has(e.property_id) || (!e.property_id && e.scope === 'empresa' && !propF)));
  const sum = (arr, f) => arr.reduce((s,x) => s + Number((f?f(x):x.amount)||0), 0);
  const income = sum(inc);
  // Flujo de caja del período (por fecha real de cobro) — solo informativo
  const incomeCash = sum(pmaState.payments.filter(p => p.type==='ingreso' && pmInRange(p.paid_at, r)
    && (!scoped || scopeIds.has(p.property_id))));
  // Buckets de categoría — FIX3 (+ Gastos x Empresa separados, vienen de la tabla "Gastos x Empresa")
  const isMaint = (e) => /mantenim|maintenance|repair|arreglo|reparac|plomer|electric/i.test(e.subcategory||'');
  const isHipo  = (e) => /hipotec|mortgage/i.test(e.subcategory||'');
  const empresaE = exp.filter(e => e.scope === 'empresa');
  const expC = exp.filter(e => e.scope !== 'empresa');
  const hipoE  = expC.filter(e => isHipo(e));                                   // 🏦 hipoteca = gasto fijo por casa
  const aseoE  = expC.filter(e => !isHipo(e) && pmIsAseo(e));
  const maintE = expC.filter(e => !isHipo(e) && !pmIsAseo(e) && isMaint(e));
  const operE  = expC.filter(e => !isHipo(e) && ['operational','platform'].includes(e.category));
  const houseE = expC.filter(e => e.category==='house' && !isHipo(e) && !pmIsAseo(e) && !isMaint(e));
  const acc = new Set([...hipoE, ...aseoE, ...maintE, ...operE, ...houseE].map(e => e.id));
  const otrosE = expC.filter(e => !acc.has(e.id));
  const house = sum(houseE), cleaning = sum(aseoE), operational = sum(operE), maintenance = sum(maintE), hipoteca = sum(hipoE), otros = sum(otrosE), empresa = sum(empresaE);
  const payroll = pmPayrollInRange(r);
  // Gastos directos = TODOS los pm_expenses (incl. hipoteca).
  // NOI (Net Operating Income) = ingresos − gastos OPERATIVOS, EXCLUYE la deuda (hipoteca).
  // Cash flow neto = NOI − servicio de deuda (hipoteca) − nómina. (Por eso NOI ≠ cash flow neto.)
  const directos = sum(exp);
  const opex = directos - hipoteca;               // gastos operativos (sin deuda)
  const noi = income - opex;                       // NOI = ingresos − opex
  const net = noi - hipoteca - payroll;            // cash flow neto = NOI − deuda − nómina
  const gastosTotal = directos + payroll;
  const margin = income > 0 ? noi / income : 0;   // margen operativo

  // Breakdowns
  const incomeByPlatform = {}, incomeByModel = {}, expenseByCategory = {};
  inc.forEach(p => {
    const bk = pmPaymentBooking(p);
    const plat = bk?.booking_type || pmNormalizePlatform(p.platform) || 'otro';   // FIX9
    incomeByPlatform[plat] = (incomeByPlatform[plat]||0) + Number(p.amount||0);
    const prop = pmaState.properties.find(x => x.id === p.property_id);
    const model = prop?.rental_model || 'sin_modelo';
    incomeByModel[model] = (incomeByModel[model]||0) + Number(p.amount||0);
  });
  expenseByCategory['🏦 Hipoteca'] = hipoteca;
  expenseByCategory['💡 Servicios/Casa'] = house;
  expenseByCategory['🧹 Aseo & Podada'] = cleaning;
  expenseByCategory['⚙️ Operativos/Plataforma'] = operational;
  expenseByCategory['🔧 Mantenimiento'] = maintenance;
  expenseByCategory['👥 Nómina'] = payroll;
  expenseByCategory['🏢 Gastos de empresa'] = empresa;
  expenseByCategory['📦 Otros'] = otros;

  const activeProps = scopeProps;   // ya filtrado por casa/modelo
  const payrollPerProp = activeProps.length ? payroll / activeProps.length : 0;
  const operativosPerProp = activeProps.length ? operational / activeProps.length : 0;
  const props = activeProps.map(p => {
    const rentable = pmRentableUnitsOf(p.id);
    const occ = rentable ? pmOccupiedRentableUnitsOf(p.id) / rentable : 0;
    const pIncome = sum(inc.filter(x => x.property_id===p.id));
    const pHipoteca = sum(exp.filter(e => e.property_id===p.id && isHipo(e)));
    const pHouse = sum(exp.filter(e => e.property_id===p.id && e.category==='house' && !isHipo(e) && !pmIsAseo(e)));
    const pClean = sum(exp.filter(e => e.property_id===p.id && !isHipo(e) && pmIsAseo(e)));
    const pNoi = pIncome - pHouse - pClean - operativosPerProp;    // NOI por casa (operativo, SIN deuda)
    const pNet = pNoi - pHipoteca - payrollPerProp;               // cash flow por casa (− deuda − nómina)
    const margin = pIncome > 0 ? pNoi / pIncome : 0;
    return { property: p, occ, rentable, income: pIncome, hipoteca: pHipoteca, house: pHouse, cleaning: pClean, payrollPro: payrollPerProp, operativosPro: operativosPerProp, net: pNet, noi: pNoi, margin };
  });
  return { income, incomeCash, house, cleaning, operational, maintenance, hipoteca, otros, empresa, payroll, directos, gastosTotal, noi, net, margin,
    incomeByPlatform, incomeByModel, expenseByCategory, props, activePropsCount: activeProps.length };
}
// Normaliza plataforma de pago a un booking_type (FIX9)
function pmNormalizePlatform(p) {
  const s = (p||'').toLowerCase().trim();
  if (!s) return null;
  if (/directo|contrato/.test(s)) return 'contrato_directo';
  if (/airbnb/.test(s)) return 'airbnb';
  if (/padsplit/.test(s)) return 'padsplit';
  if (/booking/.test(s)) return 'booking';
  if (/vrbo/.test(s)) return 'vrbo';
  if (/hospitable/.test(s)) return 'hospitable';
  return 'otro';
}
// Bar chart horizontal (entries [label,value])
function pmBarChart(entries, accent = '#d4af37') {
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return `<div class="space-y-1.5">${entries.map(([label, val]) => `
    <div class="flex items-center gap-2 text-[11px]">
      <span class="w-28 truncate text-slate-600" title="${(label||'').replace(/"/g,'&quot;')}">${(label||'').replace(/</g,'&lt;')}</span>
      <div class="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden"><div class="h-3 rounded-full" style="width:${Math.round(100*val/max)}%;background:${accent}"></div></div>
      <span class="w-16 text-right font-bold text-slate-700 whitespace-nowrap">${pmMoney(val)}</span>
    </div>`).join('') || '<div class="text-xs text-slate-400 italic">Sin datos.</div>'}</div>`;
}
// Multi-línea SVG (series: [{label,color,values:[]}], labels: [])
function pmMultiLineChart(labels, series) {
  const W=640,H=200,padL=12,padR=12,padT=14,padB=24,n=labels.length;
  const allVals = series.flatMap(s => s.values);
  const max = Math.max(1, ...allVals), min = Math.min(0, ...allVals);
  const x = i => padL + (i*(W-padL-padR)/Math.max(1,n-1));
  const y = v => H-padB - ((v-min)/(max-min||1))*(H-padT-padB);
  const path = vals => vals.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full" style="height:210px">
    ${series.map(s=>`<path d="${path(s.values)}" fill="none" stroke="${s.color}" stroke-width="2"/>`).join('')}
    ${labels.map((l,i)=>`<text x="${x(i).toFixed(1)}" y="${H-7}" font-size="9" fill="#94a3b8" text-anchor="middle">${l}</text>`).join('')}
  </svg>
  <div class="flex gap-3 justify-center text-[11px] mt-1">${series.map(s=>`<span style="color:${s.color}" class="font-bold">● ${s.label}</span>`).join('')}</div>`;
}
// Tendencia mensual (n meses hasta el fin del período) ingresos vs gastos totales
function pmFinTrend(nMonths, anchorYm) {
  const [ay, am] = anchorYm.split('-').map(Number);
  const out = [];
  for (let i = nMonths-1; i >= 0; i--) {
    const d = new Date(ay, am-1-i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const income = pmaState.payments.filter(p => p.type==='ingreso' && pmBillYm(p) === ym).reduce((s,p)=>s+Number(p.amount||0),0);
    const exps = pmaState.expenses.filter(e => pmBillYm(e) === ym).reduce((s,e)=>s+Number(e.amount||0),0);
    const pr = (pmaState.payroll||[]).filter(p => Number(p.year)===d.getFullYear() && PM_ES_MONTHS.indexOf((p.month||'').toLowerCase())===d.getMonth()).reduce((s,p)=>s+Number(p.salary||0),0);
    const gastos = exps + pr;
    out.push({ ym, label: `${PM_ES_MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, income, gastos, net: income-gastos });
  }
  return out;
}
function pmFinSetPeriod(p) {
  pmaState.finPeriod = p;
  pmaState.finMonthSel = p === 'this_month' ? pmCurrentYM() : p === 'last3' ? 'last-3m' : p === 'ytd' ? 'ytd' : p === 'custom' ? 'custom' : pmCurrentYM();
  try { localStorage.setItem('pm_finanzas_month', pmaState.finMonthSel); } catch (e) {}
  pmRender();
}
window.pmFinSetPeriod = pmFinSetPeriod;
function pmFinSetMonth(v) { pmaState.finMonthSel = v; pmaState.finPeriod = (/^\d{4}-\d{2}$/.test(v)?'this_month':v==='last-3m'?'last3':v==='ytd'?'ytd':v==='custom'?'custom':'this_month'); try { localStorage.setItem('pm_finanzas_month', v); } catch(e){} pmRender(); }
window.pmFinSetMonth = pmFinSetMonth;
function pmFinSetFilter(key, value) {
  const map = { property: 'finFilterProperty', platform: 'finFilterPlatform', model: 'finFilterModel' };
  pmaState[map[key]] = value;
  try { localStorage.setItem('pm_finanzas_' + key, value == null ? '' : value); } catch (e) {}
  pmRender();
}
window.pmFinSetFilter = pmFinSetFilter;
function pmFinClearFilters() {
  pmaState.finFilterProperty = null; pmaState.finFilterPlatform = null; pmaState.finFilterModel = null;
  try { ['property','platform','model'].forEach(k => localStorage.removeItem('pm_finanzas_' + k)); } catch (e) {}
  pmRender();
}
window.pmFinClearFilters = pmFinClearFilters;
function pmFinHasFilters() { return !!(pmaState.finFilterProperty || pmaState.finFilterPlatform || pmaState.finFilterModel); }
function pmFinInitFilters() {
  if (pmaState._finFiltersLoaded) return;
  pmaState._finFiltersLoaded = true;
  try {
    const g = (k) => { const v = localStorage.getItem(k); return (v === null || v === '') ? null : v; };
    pmaState.finFilterProperty = g('pm_finanzas_property');
    pmaState.finFilterPlatform = g('pm_finanzas_platform');
    pmaState.finFilterModel = g('pm_finanzas_model');
    const ms = localStorage.getItem('pm_finanzas_month'); if (ms) pmaState.finMonthSel = ms;
  } catch (e) {}
}
function pmSetPnlSort(key) {
  if (pmaState.pnlSortKey === key) pmaState.pnlSortDir = pmaState.pnlSortDir==='desc'?'asc':'desc';
  else { pmaState.pnlSortKey = key; pmaState.pnlSortDir = 'desc'; }
  pmRender();
}
window.pmSetPnlSort = pmSetPnlSort;

function pmFinShiftRangeBack(r) {
  const shift = (iso) => { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() - r.months); return d.toISOString().slice(0,10); };
  const fromISO = shift(r.fromISO), toISO = shift(r.toISO);
  const ymList = []; let cur = new Date(fromISO.slice(0,7) + '-01T00:00:00'); const end = new Date(toISO.slice(0,7) + '-01T00:00:00');
  while (cur <= end) { ymList.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`); cur.setMonth(cur.getMonth()+1); }
  return { fromISO, toISO, ymList, months: r.months, label: 'prev' };
}
function pmRenderFinance() {
  pmFinInitFilters();
  const r = pmFinRange();
  const agg = pmFinAgg(r);
  const prevAgg = pmFinAgg(pmFinShiftRangeBack(r));
  const delta = (cur, prev) => prev ? Math.round((cur - prev) / Math.abs(prev) * 100) : (cur > 0 ? 100 : 0);
  const arrowD = (d) => d > 0 ? `<span class="text-emerald-600">↑${Math.abs(d)}%</span>` : d < 0 ? `<span class="text-red-600">↓${Math.abs(d)}%</span>` : `<span class="text-slate-400">→</span>`;
  const anchorYm = r.ymList[r.ymList.length-1] || pmCurrentYM();
  const trend = pmFinTrend(12, anchorYm);
  const t12i = trend.reduce((s,t)=>s+t.income,0), t12g = trend.reduce((s,t)=>s+t.gastos,0);
  const period = pmaState.finPeriod || 'this_month';

  // Gastos SIN período (ni tag Mes/Año ni Fecha): no entran a ningún mes — se
  // muestran como "sin fecha · revisar" en vez de perderse en silencio.
  const gSinPeriodo = pmaState.expenses.filter(e => !pmBillYm(e));
  const gSinPeriodoMonto = gSinPeriodo.reduce((sm, e) => sm + Number(e.amount||0), 0);

  // ── Métricas clave portafolio ──
  const activeProps = pmaState.properties.filter(p => p.active!==false);
  const activePropIds = new Set(activeProps.map(p=>p.id));
  const units = pmaState.units.filter(u => activePropIds.has(u.property_id));
  const occUnits = units.filter(u => pmUnitOccupied(u));
  // Ocupación = cifra ÚNICA del portafolio (misma que Resumen/KPIs/Global, vía v_ocupacion).
  const _occAg = pmPhysOccupancy();
  const rentableTotal = _occAg.total;
  const occRentable = _occAg.occupied;
  const occPct = _occAg.pct;
  const activeBs = pmActiveBookings().filter(b => activePropIds.has(b.property_id));
  const monthlyRentRoll = activeBs.reduce((s,b)=>s+pmMonthlyRent(b),0);
  const avgRentRoom = rentableTotal ? monthlyRentRoll/rentableTotal : 0;
  const maintPerUnit = rentableTotal ? (agg.house+agg.cleaning)/rentableTotal : 0;
  // ROI mensual ≈ margen neto del período (sin costo de adquisición en el schema)
  const roiMensual = agg.income>0 ? agg.net/agg.income : 0;
  // Días promedio rotación (gap entre reservas consecutivas por unidad)
  let gaps=[]; pmaState.units.forEach(u=>{ const bs=pmaState.bookings.filter(b=>b.unit_id===u.id && b.start_date).sort((a,b)=>a.start_date<b.start_date?-1:1); for(let i=1;i<bs.length;i++){ const pe=bs[i-1].end_date, ns=bs[i].start_date; if(pe&&ns&&ns>pe){ const g=Math.round((new Date(ns)-new Date(pe))/86400000); if(g>0&&g<400) gaps.push(g); } } });
  const avgRot = pmAvgVacancyDays();
  // Cap rate: requiere valor de adquisición (no está en el schema) → n/d
  const capRate = null;

  // ── Alertas de rendimiento ──
  const lowMargin = agg.props.filter(x => x.income>0 && x.margin < 0.20);
  const lowOcc = activeProps.filter(p => (pmOccupancyOf(p.id).pct/100) < 0.70);
  const risingExp = activeProps.filter(p => {
    const e = []; for (let i=2;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      e.push(pmaState.expenses.filter(x=>x.property_id===p.id && ['house','cleaning'].includes(x.category) && pmBillYm(x) === ym).reduce((s,x)=>s+Number(x.amount||0),0)); }
    return e[0]>0 && e[1]>e[0] && e[2]>e[1];
  });

  // ── P&L rows ordenadas ──
  const dir = pmaState.pnlSortDir==='asc'?1:-1;
  const key = pmaState.pnlSortKey||'net';
  const rows = [...agg.props].sort((a,b) => {
    let va, vb;
    if (key==='name') { va=(a.property.name||'').toLowerCase(); vb=(b.property.name||'').toLowerCase(); return va<vb?-dir:va>vb?dir:0; }
    va = a[key]; vb = b[key];
    return (Number(va||0)-Number(vb||0))*dir;
  });
  const marginRowCls = m => m>0.40 ? 'bg-emerald-50' : m>=0.20 ? 'bg-amber-50' : 'bg-red-50';
  const sortArrow = k => key===k ? (pmaState.pnlSortDir==='desc'?' ▼':' ▲') : '';
  const th = (k, label, align='right') => `<th class="px-3 py-2 text-${align} cursor-pointer hover:text-slate-900 select-none" onclick="pmSetPnlSort('${k}')">${label}${sortArrow(k)}</th>`;

  const kpi = (label, value, sub, accent) => `
    <div class="bg-white border border-slate-200 rounded-xl p-3">
      <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${label}</div>
      <div class="text-xl font-extrabold mt-1 ${accent||'text-slate-900'}">${value}</div>
      ${sub?`<div class="text-[10px] text-slate-500 mt-0.5">${sub}</div>`:''}
    </div>`;
  const metric = (label, value, sub) => `
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${label}</div>
      <div class="text-lg font-extrabold text-slate-900 mt-1">${value}</div>
      ${sub?`<div class="text-[10px] text-slate-500 mt-0.5">${sub}</div>`:''}
    </div>`;
  const pBtn = (k, l) => `<button onclick="pmFinSetPeriod('${k}')" class="px-3 py-1 rounded-full ${period===k?'bg-slate-900 text-white':'text-slate-500 hover:text-slate-900'}">${l}</button>`;

  return `
  <style>@keyframes pmfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.pm-fade{animation:pmfade .4s ease both}</style>
  <div class="space-y-4 p-1 pm-fade" style="font-family:Inter,system-ui,sans-serif">

    ${gSinPeriodo.length ? `<div class="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-800">
      ⚠️ <strong>${gSinPeriodo.length}</strong> gasto${gSinPeriodo.length>1?'s':''} sin fecha ni Mes/Año (${pmMoney(gSinPeriodoMonto)}) — no entran a ningún período · <strong>revisar en Airtable</strong>: ${gSinPeriodo.slice(0,4).map(e => (e.description||'—').replace(/</g,'&lt;').slice(0,28)).join(' · ')}${gSinPeriodo.length>4?' · …':''}
    </div>` : ''}

    <!-- Header + período -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <div class="text-base font-bold text-slate-900">Finanzas · Dashboard ejecutivo</div>
        <div class="text-xs text-slate-500">${r.label} · ${agg.activePropsCount} ${agg.activePropsCount===1?'casa':'casas'}${pmFinHasFilters()?' (filtrado)':''}</div>
      </div>
      <div class="flex items-center bg-slate-100 rounded-full p-0.5 text-[10px] font-bold">
        ${pBtn('this_month','Mes actual')}${pBtn('last3','Últ. 3m')}${pBtn('ytd','YTD')}${pBtn('custom','Custom')}
      </div>
    </div>

    <!-- 📄 Reportes PDF (chromium headless) -->
    <div class="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-2">
      <span class="text-[11px] font-bold text-slate-500 px-1">📄 Reportes PDF</span>
      <button onclick="pmOpenReport('weekly')" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded">Generar semanal (operación)</button>
      <button onclick="pmSendReport('weekly')" class="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded" title="Compartir por correo o WhatsApp (mailto/wa.me)">Compartir ›</button>
      <span class="text-slate-300">·</span>
      <button onclick="pmOpenReport('monthly')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded">Generar mensual (finanzas)</button>
      <button onclick="pmSendReport('monthly')" class="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded" title="Compartir por correo o WhatsApp (mailto/wa.me)">Compartir ›</button>
    </div>

    <!-- Filtros del dashboard (dropdowns) -->
    <div class="pm-filters-bar">
      ${pmFilterSelect('Período', '📅', pmaState.finMonthSel||pmCurrentYM(), [...pmMonthOptions(), ['custom','Custom (rango)']], "pmFinSetMonth(this.value)")}
      ${pmFilterSelect('Casa', '🏠', pmaState.finFilterProperty, [['','Todas'], ...pmaState.properties.filter(p=>p.active!==false).map(p=>[p.id, p.name||''])], "pmFinSetFilter('property', this.value||null)")}
      ${pmFilterSelect('Plataforma', '💳', pmaState.finFilterPlatform, [['','Todas'], ...Object.entries(PM_PLATFORM_LABEL).map(([k,l])=>[k,l])], "pmFinSetFilter('platform', this.value||null)")}
      ${pmFilterSelect('Modelo', '🏗', pmaState.finFilterModel, [['','Todos'],['casa_completa','Casa Completa'],['por_habitaciones','Por Habitaciones'],['mixta','Mixta'],['por_unidades','Por Unidades']], "pmFinSetFilter('model', this.value||null)")}
      ${pmFinHasFilters()?`<button class="pm-clear-filters" onclick="pmFinClearFilters()">✕ Limpiar</button>`:''}
      ${(pmaState.finMonthSel==='custom'||period==='custom')?`<div class="pm-filter-dropdown"><label>Rango</label><div class="flex items-center gap-1">
        <input type="date" value="${pmaState.finCustomFrom||''}" onchange="pmaState.finCustomFrom=this.value;pmRender()" class="border border-slate-300 rounded px-1.5 py-1 text-xs"/>
        <span class="text-slate-400">→</span>
        <input type="date" value="${pmaState.finCustomTo||''}" onchange="pmaState.finCustomTo=this.value;pmRender()" class="border border-slate-300 rounded px-1.5 py-1 text-xs"/>
      </div></div>`:''}
    </div>

    <!-- SECCIÓN 1 · KPIs con delta MoM -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
      ${kpi('Renta del período (por Mes/Año)', pmMoney(agg.income), arrowD(delta(agg.income, prevAgg.income))+' MoM · '+r.label+' · cobrado en el período (caja): '+pmMoney(agg.incomeCash)+(r.months===1?' '+pmMonthBadge(r.ymList[0]):''), 'text-emerald-700')}
      ${kpi('Gastos totales', pmMoney(agg.gastosTotal), arrowD(delta(agg.gastosTotal, prevAgg.gastosTotal))+' MoM', 'text-red-600')}
      ${kpi('NOI (operativo, antes de deuda)', pmMoney(agg.noi), arrowD(delta(agg.noi, prevAgg.noi))+' MoM · ingresos − opex', agg.noi>=0?'text-emerald-700':'text-red-600')}
      ${kpi('Cash flow neto (después de deuda)', pmMoney(agg.net), arrowD(delta(agg.net, prevAgg.net))+' MoM · NOI − hipoteca − nómina', agg.net>=0?'text-emerald-700':'text-red-600')}
      ${kpi('Margen NOI', (agg.income>0?Math.round(agg.margin*100):0)+'%', `objetivo 25-60%`, agg.margin>=0.25?'text-emerald-700':'text-amber-600')}
      ${kpi('Ocupación', Math.round(occPct*100)+'%', `${occRentable}/${rentableTotal} uds`, occPct>=0.8?'text-emerald-700':'text-amber-600')}
      ${kpi('Renta prom / unidad', pmMoney(avgRentRoom), 'uds rentables')}
      ${kpi('Días vacancy prom.', avgRot!=null?avgRot+'d':'—', 'entre leases')}
    </div>

    <!-- SECCIÓN 2 · Origen de ingresos -->
    <div class="grid lg:grid-cols-3 gap-3">
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Ingresos por plataforma</div>
        ${pmPieChart(Object.entries(agg.incomeByPlatform).map(([k,v])=>[PM_PLATFORM_LABEL[k]||k, v]).sort((a,b)=>b[1]-a[1]))}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Ingresos por modelo</div>
        ${pmPieChart(Object.entries(agg.incomeByModel).map(([k,v])=>[(k||'—').replace(/_/g,' '), v]).sort((a,b)=>b[1]-a[1]))}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Casas por ingresos (todas)</div>
        ${pmBarChart([...agg.props].sort((a,b)=>b.income-a.income).slice(0,18).map(x=>[x.property.name, x.income]), '#10b981')}
      </div>
    </div>

    <!-- SECCIÓN 3 · Detalle de gastos -->
    <div class="grid lg:grid-cols-3 gap-3">
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Gastos por categoría</div>
        ${pmPieChart(Object.entries(agg.expenseByCategory).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]))}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Top 10 casas · gastos directos</div>
        ${pmBarChart([...agg.props].map(x=>[x.property.name, x.house+x.cleaning]).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,10), '#f43f5e')}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Costo operativo</div>
        <div><div class="text-[10px] text-slate-400">Promedio por casa</div><div class="text-lg font-extrabold text-slate-900">${pmMoney(agg.gastosTotal/Math.max(1,agg.activePropsCount))}</div></div>
        <div><div class="text-[10px] text-slate-400">Por unidad rentable</div><div class="text-lg font-extrabold text-slate-900">${pmMoney(rentableTotal?agg.gastosTotal/rentableTotal:0)}</div></div>
        <div><div class="text-[10px] text-slate-400">% de ingresos (cost-to-income)</div><div class="text-lg font-extrabold ${agg.income&&agg.gastosTotal/agg.income<0.75?'text-emerald-700':'text-amber-600'}">${agg.income?Math.round(agg.gastosTotal/agg.income*100):0}%</div></div>
      </div>
    </div>

    <!-- SECCIÓN 5 · Tendencia 12 meses (multi-línea) -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div class="text-sm font-bold text-slate-800 mb-1">Tendencia 12 meses · Ingresos / Gastos / NOI</div>
      ${pmMultiLineChart(trend.map(t=>t.label), [
        { label:'Ingresos', color:'#10b981', values: trend.map(t=>t.income) },
        { label:'Gastos', color:'#ef4444', values: trend.map(t=>t.gastos) },
        { label:'Cash flow neto', color:'#8b5cf6', values: trend.map(t=>t.net) }
      ])}
      <div class="text-xs text-slate-500 text-center mt-1">12 meses: <span class="text-emerald-700 font-bold">${pmMoney(t12i)}</span> ingresos · <span class="text-red-700 font-bold">${pmMoney(t12g)}</span> gastos · <span class="font-bold ${t12i-t12g>=0?'text-emerald-700':'text-red-700'}">${pmMoney(t12i-t12g)}</span> neto</div>
    </div>

    <!-- B · P&L por casa -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div class="px-4 py-2 flex items-center justify-between" style="background:#1e293b">
        <span class="text-xs font-bold uppercase tracking-wider text-white">P&L por casa</span>
        <span class="text-[10px] font-bold" style="color:#d4af37">nómina prorrateada entre ${agg.activePropsCount} casas</span>
      </div>
      <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
          <tr>
            ${th('name','Casa','left')}
            ${th('rentable','Uds.')}
            ${th('occ','Ocup.')}
            ${th('income','Ingresos')}
            ${th('hipoteca','Hipoteca')}
            ${th('house','Servicios')}
            ${th('cleaning','Aseo')}
            ${th('payrollPro','Nómina prorr.')}
            ${th('net','NETO')}
            ${th('margin','% margen')}
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(x => `
            <tr class="border-t border-slate-100 ${marginRowCls(x.margin)}">
              <td class="px-3 py-2 font-semibold text-slate-800"><div class="pm-clamp2" title="${(x.property.name||'').replace(/"/g,'&quot;')}">${(x.property.name||'').replace(/</g,'&lt;')}</div><div class="text-[9px] font-normal text-slate-400 uppercase">${(x.property.rental_model||'').replace(/_/g,' ')}</div></td>
              <td class="px-3 py-2 text-right text-slate-600">${x.rentable}</td>
              <td class="px-3 py-2 text-right text-slate-600">${Math.round(x.occ*100)}%</td>
              <td class="px-3 py-2 text-right text-emerald-700 font-bold">${pmMoney(x.income)}</td>
              <td class="px-3 py-2 text-right text-red-600">${pmMoney(x.hipoteca)}</td>
              <td class="px-3 py-2 text-right text-red-600">${pmMoney(x.house)}</td>
              <td class="px-3 py-2 text-right text-red-600">${pmMoney(x.cleaning)}</td>
              <td class="px-3 py-2 text-right text-slate-500">${pmMoney(x.payrollPro)}</td>
              <td class="px-3 py-2 text-right font-extrabold ${x.net>=0?'text-emerald-700':'text-red-600'}">${pmMoney(x.net)}</td>
              <td class="px-3 py-2 text-right font-bold ${x.margin>0.40?'text-emerald-700':x.margin>=0.20?'text-amber-700':'text-red-600'}">${x.income>0?Math.round(x.margin*100)+'%':'—'}</td>
            </tr>`).join('') : '<tr><td colspan="10" class="px-3 py-8 text-center text-slate-400 italic">Sin casas activas con datos en el período.</td></tr>'}
        </tbody>
        ${rows.length ? `<tfoot class="bg-slate-100 font-bold"><tr>
          <td class="px-3 py-2 text-slate-800">TOTAL</td>
          <td class="px-3 py-2 text-right text-slate-600">${rentableTotal}</td>
          <td class="px-3 py-2 text-right text-slate-600">${Math.round(occPct*100)}%</td>
          <td class="px-3 py-2 text-right text-emerald-700">${pmMoney(agg.income)}</td>
          <td class="px-3 py-2 text-right text-red-600">${pmMoney(agg.hipoteca)}</td>
          <td class="px-3 py-2 text-right text-red-600">${pmMoney(agg.house)}</td>
          <td class="px-3 py-2 text-right text-red-600">${pmMoney(agg.cleaning)}</td>
          <td class="px-3 py-2 text-right text-slate-500">${pmMoney(agg.payroll)}</td>
          <td class="px-3 py-2 text-right ${agg.net>=0?'text-emerald-700':'text-red-600'}">${pmMoney(agg.net)}</td>
          <td class="px-3 py-2 text-right text-slate-700">${agg.income>0?Math.round(agg.margin*100)+'%':'—'}</td>
        </tr></tfoot>` : ''}
      </table>
      </div>
    </div>

    <!-- SECCIÓN 6 · Rankings -->
    <div class="grid lg:grid-cols-3 gap-3">
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[11px] uppercase font-bold text-emerald-700 tracking-wider mb-2">🏆 Top 5 más rentables</div>
        ${[...agg.props].filter(x=>x.income>0).sort((a,b)=>b.noi-a.noi).slice(0,5).map(x=>`<div class="flex items-center justify-between text-[11px] py-1 border-b border-slate-50"><span class="text-slate-700 truncate">${(x.property.name||'').replace(/</g,'&lt;').slice(0,22)}</span><span class="font-bold ${x.noi>=0?'text-emerald-700':'text-red-600'}">${pmMoney(x.noi)} · ${Math.round(x.margin*100)}%</span></div>`).join('')||'<div class="text-xs text-slate-400 italic">Sin datos.</div>'}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[11px] uppercase font-bold text-red-600 tracking-wider mb-2">⚠️ Bottom 5 menos rentables</div>
        ${[...agg.props].filter(x=>x.income>0).sort((a,b)=>a.noi-b.noi).slice(0,5).map(x=>`<div class="flex items-center justify-between text-[11px] py-1 border-b border-slate-50"><span class="text-slate-700 truncate">${(x.property.name||'').replace(/</g,'&lt;').slice(0,22)}</span><span class="font-bold ${x.noi>=0?'text-amber-600':'text-red-600'}">${pmMoney(x.noi)} · ${Math.round(x.margin*100)}%</span></div>`).join('')||'<div class="text-xs text-slate-400 italic">Sin datos.</div>'}
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-[11px] uppercase font-bold text-amber-600 tracking-wider mb-2">🔥 Casas en alerta</div>
        ${(() => { const al = agg.props.filter(x => (x.income>0 && x.margin<0.20) || (pmOccupiedRentableUnitsOf(x.property.id)/Math.max(1,pmRentableUnitsOf(x.property.id)) < 0.7)); return al.length ? al.slice(0,8).map(x=>`<div class="flex items-center justify-between text-[11px] py-1 border-b border-slate-50"><span class="text-slate-700 truncate">${(x.property.name||'').replace(/</g,'&lt;').slice(0,22)}</span><span class="font-bold text-red-600">${x.income>0?Math.round(x.margin*100)+'%':'sin ingr.'}</span></div>`).join('') : '<div class="text-xs text-emerald-600">✓ Ninguna en alerta.</div>'; })()}
      </div>
    </div>

    <!-- C · Métricas clave + estratégicas -->
    <div>
      <div class="text-[11px] uppercase font-bold text-slate-700 tracking-wider mb-2" style="border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:2px">Métricas clave</div>
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-2">
        ${metric('Ocupación portafolio', Math.round(occPct*100)+'%', `${occRentable}/${rentableTotal} uds. rentables`)}
        ${metric('Renta prom. / unidad', pmMoney(avgRentRoom), 'uds. rentables')}
        ${metric('Cap rate anualiz.', capRate!=null?Math.round(capRate*100)+'%':'n/d', 'falta valor de compra')}
        ${metric('ROI mensual', agg.income>0?Math.round(roiMensual*100)+'%':'—', 'neto / ingresos')}
        ${metric('Mant. / unidad', pmMoney(maintPerUnit), 'casa+aseo del período')}
        ${metric('Días rotación', avgRot!=null?avgRot+'d':'—', 'promedio entre leases')}
      </div>
    </div>

    <!-- D · Alertas de rendimiento -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div class="text-[11px] uppercase font-bold text-slate-700 tracking-wider mb-2" style="border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:2px">Alertas de rendimiento</div>
      ${(lowMargin.length||lowOcc.length||risingExp.length) ? `<div class="space-y-2">
        ${lowMargin.length?`<div class="flex items-start gap-2 border-l-4 border-l-red-500 bg-red-50 rounded-r-lg px-3 py-2">
          <span class="text-[9px] uppercase font-extrabold text-red-700 tracking-wider mt-0.5">Crítico</span>
          <div class="text-xs text-slate-700"><strong>${lowMargin.length}</strong> ${lowMargin.length===1?'casa con margen':'casas con margen'} &lt; 20% — revisar: ${lowMargin.slice(0,4).map(x=>x.property.name.replace(/</g,'&lt;').slice(0,18)).join(', ')}</div>
        </div>`:''}
        ${lowOcc.length?`<div class="flex items-start gap-2 border-l-4 border-l-amber-500 bg-amber-50 rounded-r-lg px-3 py-2">
          <span class="text-[9px] uppercase font-extrabold text-amber-700 tracking-wider mt-0.5">Atención</span>
          <div class="text-xs text-slate-700"><strong>${lowOcc.length}</strong> ${lowOcc.length===1?'casa con ocupación':'casas con ocupación'} &lt; 70%: ${lowOcc.slice(0,4).map(p=>p.name.replace(/</g,'&lt;').slice(0,18)).join(', ')}</div>
        </div>`:''}
        ${risingExp.length?`<div class="flex items-start gap-2 border-l-4 border-l-amber-500 bg-amber-50 rounded-r-lg px-3 py-2">
          <span class="text-[9px] uppercase font-extrabold text-amber-700 tracking-wider mt-0.5">Tendencia</span>
          <div class="text-xs text-slate-700"><strong>${risingExp.length}</strong> ${risingExp.length===1?'casa con gastos creciendo':'casas con gastos creciendo'} 2+ meses: ${risingExp.slice(0,4).map(p=>p.name.replace(/</g,'&lt;').slice(0,18)).join(', ')}</div>
        </div>`:''}
      </div>` : '<div class="text-center py-4 text-slate-400 text-sm">✓ Sin alertas de rendimiento en este momento.</div>'}
    </div>

    <!-- E · Reportes exportables -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div class="text-[11px] uppercase font-bold text-slate-700 tracking-wider mb-2" style="border-bottom:2px solid #d4af37;display:inline-block;padding-bottom:2px">Reportes exportables</div>
      <div class="flex flex-wrap gap-2">
        <button onclick="pmFinReport('monthly')" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg" style="border:1px solid #d4af37">📄 Reporte mensual (PDF)</button>
        <button onclick="pmFinReport('investor')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg">📊 Reporte por inversionista (PDF)</button>
        <button onclick="pmFinReport('fiscal')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg">💼 Reporte fiscal anual (PDF)</button>
        <button onclick="pmFinExportCSV()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg">📈 Tendencias 12 meses (CSV)</button>
      </div>
    </div>
  </div>`;
}

// ── Reportes (PDF vía ventana imprimible — patrón usado en el resto del repo) ──
function pmOpenPrintReport(title, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) return alert('Habilitá pop-ups para generar el reporte.');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      *{box-sizing:border-box} body{font-family:Inter,Arial,sans-serif;color:#1e293b;margin:32px;font-size:12px}
      h1{font-size:20px;margin:0 0 4px} h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #d4af37;padding-bottom:3px;margin:22px 0 10px}
      .sub{color:#64748b;margin-bottom:18px} table{width:100%;border-collapse:collapse;margin:6px 0}
      th,td{padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0} th{background:#f1f5f9;text-transform:uppercase;font-size:10px;color:#64748b}
      th:first-child,td:first-child{text-align:left} .kpis{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0}
      .kpi{border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;min-width:130px} .kpi .l{font-size:9px;text-transform:uppercase;color:#94a3b8;font-weight:bold}
      .kpi .v{font-size:18px;font-weight:800;margin-top:2px} .pos{color:#047857} .neg{color:#dc2626}
      .foot{margin-top:30px;color:#94a3b8;font-size:10px;border-top:1px solid #e2e8f0;padding-top:8px}
      @media print{body{margin:14px}button{display:none}}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><h1>Rental Profits</h1><div class="sub">${title}</div></div>
      <button onclick="window.print()" style="background:#1e293b;color:#fff;border:1px solid #d4af37;border-radius:6px;padding:8px 14px;font-weight:bold;cursor:pointer">🖨️ Imprimir / PDF</button>
    </div>
    ${bodyHtml}
    <div class="foot">Generado por Empresa OS · Property Management — ${new Date().toLocaleString()}</div>
    <script>setTimeout(()=>window.print(),500)<\/script>
    </body></html>`);
  w.document.close();
}

function pmFinReport(kind) {
  const r = pmFinRange();
  const agg = pmFinAgg(r);
  const kpiRow = `<div class="kpis">
    <div class="kpi"><div class="l">Ingresos</div><div class="v pos">${pmMoney(agg.income)}</div></div>
    <div class="kpi"><div class="l">🏦 Hipoteca</div><div class="v neg">${pmMoney(agg.hipoteca)}</div></div>
    <div class="kpi"><div class="l">Servicios/Casa</div><div class="v neg">${pmMoney(agg.house)}</div></div>
    <div class="kpi"><div class="l">Aseo</div><div class="v neg">${pmMoney(agg.cleaning)}</div></div>
    <div class="kpi"><div class="l">Nómina</div><div class="v neg">${pmMoney(agg.payroll)}</div></div>
    <div class="kpi"><div class="l">Operativos</div><div class="v neg">${pmMoney(agg.operational)}</div></div>
    <div class="kpi"><div class="l">P&L Neto</div><div class="v ${agg.net>=0?'pos':'neg'}">${pmMoney(agg.net)}</div></div>
  </div>`;
  const pnlTable = (rows) => `<table>
    <thead><tr><th>Casa</th><th>Uds.</th><th>Ocup.</th><th>Ingresos</th><th>Hipoteca</th><th>Servicios</th><th>Aseo</th><th>Nómina prorr.</th><th>NETO</th><th>% margen</th></tr></thead>
    <tbody>${rows.map(x=>`<tr><td>${(x.property.name||'').replace(/</g,'&lt;')}</td><td>${x.rentable}</td><td>${Math.round(x.occ*100)}%</td><td>${pmMoney(x.income)}</td><td>${pmMoney(x.hipoteca)}</td><td>${pmMoney(x.house)}</td><td>${pmMoney(x.cleaning)}</td><td>${pmMoney(x.payrollPro)}</td><td class="${x.net>=0?'pos':'neg'}">${pmMoney(x.net)}</td><td>${x.income>0?Math.round(x.margin*100)+'%':'—'}</td></tr>`).join('')}</tbody>
  </table>`;
  const sorted = [...agg.props].sort((a,b)=>b.net-a.net);

  if (kind === 'investor') {
    const body = `<h2>Reporte por inversionista · ${r.label}</h2>${kpiRow}
      <h2>Rendimiento por propiedad</h2>${pnlTable(sorted)}
      <p style="margin-top:14px;color:#64748b">Margen promedio del portafolio: <strong>${agg.income>0?Math.round(agg.net/agg.income*100):0}%</strong> · ${agg.activePropsCount} propiedades activas.</p>`;
    return pmOpenPrintReport('Reporte por inversionista', body);
  }
  if (kind === 'fiscal') {
    // Año en curso (o año del 'to')
    const year = parseInt((r.toISO||'').slice(0,4),10) || new Date().getFullYear();
    const yr = { fromISO:`${year}-01-01`, toISO:`${year}-12-31`, ymList: Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`), label:String(year), months:12 };
    const a = pmFinAgg(yr);
    const months = pmFinTrend(12, `${year}-12`).filter(t=>t.ym.startsWith(String(year)));
    const body = `<h2>Reporte fiscal anual · ${year}</h2>
      <div class="kpis">
        <div class="kpi"><div class="l">Ingresos ${year}</div><div class="v pos">${pmMoney(a.income)}</div></div>
        <div class="kpi"><div class="l">Gastos totales</div><div class="v neg">${pmMoney(a.house+a.cleaning+a.operational+a.payroll)}</div></div>
        <div class="kpi"><div class="l">Resultado neto</div><div class="v ${a.net>=0?'pos':'neg'}">${pmMoney(a.net)}</div></div>
      </div>
      <h2>Desglose mensual</h2>
      <table><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Neto</th></tr></thead>
      <tbody>${months.map(m=>`<tr><td>${m.label}</td><td>${pmMoney(m.income)}</td><td>${pmMoney(m.gastos)}</td><td class="${m.net>=0?'pos':'neg'}">${pmMoney(m.net)}</td></tr>`).join('')}</tbody></table>
      <h2>P&L por propiedad ${year}</h2>${pnlTable([...a.props].sort((x,y)=>y.net-x.net))}
      <p style="margin-top:10px;color:#94a3b8">Para Excel: usá el botón «Tendencias 12 meses (CSV)» y abrilo en tu hoja de cálculo.</p>`;
    return pmOpenPrintReport(`Reporte fiscal ${year}`, body);
  }
  // monthly (default)
  const body = `<h2>Reporte mensual · ${r.label}</h2>${kpiRow}
    <h2>P&L por casa</h2>${pnlTable(sorted)}`;
  pmOpenPrintReport('Reporte mensual', body);
}
window.pmFinReport = pmFinReport;

function pmFinExportCSV() {
  const anchorYm = (pmFinRange().ymList.slice(-1)[0]) || pmCurrentYM();
  const trend = pmFinTrend(12, anchorYm);
  const rows = [['Mes','Ingresos','Gastos','Neto'], ...trend.map(t=>[t.label, Math.round(t.income), Math.round(t.gastos), Math.round(t.net)])];
  const csv = rows.map(r => r.map(c => /[",\n]/.test(String(c))?`"${String(c).replace(/"/g,'""')}"`:c).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `rental-profits-tendencias-12m.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
window.pmFinExportCSV = pmFinExportCSV;

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
// Tablas espejo de Airtable: la app NUNCA escribe ahí (fuente de verdad = Airtable).
// pm_tasks / pm_alerts / pm_data_warnings son capa propia → sí pueden escribirse.
const PM_RO_MIRROR_TABLES = new Set(['pm_properties','pm_units','pm_bookings','pm_booking_history','pm_tenants','pm_payments','pm_expenses','pm_payroll','pm_credentials','pm_utilities','pm_wifi_credentials','pm_calendar_feeds','pm_message_templates']);
async function pmExecQuery(qPromise, opLabel) {
  // 🔒 Red de seguridad solo-lectura: bloquea cualquier escritura a datos-Airtable
  // aunque se escapara algún botón/función (choke point de casi todas las escrituras).
  try {
    if (window.PM_READONLY && qPromise) {
      const m = String(qPromise.method || 'GET').toUpperCase();
      if (m !== 'GET' && m !== 'HEAD') {
        let table = '';
        try { table = String(qPromise.url?.pathname || qPromise.url || '').split('/rest/v1/')[1].split(/[?\/]/)[0]; } catch (e) {}
        if (PM_RO_MIRROR_TABLES.has(table)) {
          console.warn('[pm] escritura BLOQUEADA (solo-lectura):', m, table, '·', opLabel);
          if (window.toast) toast('📖 Solo lectura: cargá o editá estos datos en Airtable. La app solo muestra y reporta.', 'info');
          return null;
        }
      }
    }
  } catch (e) { /* si no se puede inspeccionar, sigue (las fns ya están guardadas) */ }
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

async function pmArchiveProperty(id, on) {
  const p = pmaState.properties.find(x => x.id === id) || ((pmaState._raw||{}).properties || []).find(x => x.id === id) || {};
  const nombre = p.name || p.address || 'esta propiedad';
  if (!confirm(on
    ? `📦 ¿Archivar "${nombre}"?

· Deja de contar en propiedades, unidades y ocupación
· El sync de Airtable NO la reactiva (marca manual)
· Reversible: ↩ Reactivar (visible con 📦 Mostrar archivados)`
    : `↩ ¿Reactivar "${nombre}"? Vuelve a contar en ocupación y KPIs.`)) return;
  const { data, error } = await sb.rpc('pm_archive_property', { p_id: id, p_on: on });
  if (error || !(data && data.ok)) { alert('Error: ' + (error ? error.message : ((data && data.error) || 'desconocido'))); return; }
  const raw = ((pmaState._raw||{}).properties || []).find(x => x.id === id);
  if (raw) { raw.active = !on; raw.archived_manual = on; }
  pmApplyActiveFilter(); pmRender();
}
window.pmArchiveProperty = pmArchiveProperty;

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
  const hist = id ? pmBookingHistoryOf(id) : [];
  const histHtml = (!isNew && (b.reservation_code || hist.length)) ? `
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
        ${b.reservation_code ? `<div class="flex items-center justify-between"><span class="text-[10px] uppercase font-bold text-slate-400">Código</span><button onclick="pmCopyText('${b.reservation_code}')" class="text-[11px] font-mono font-bold text-slate-700 hover:text-[#b8941f]">${b.reservation_code} ⧉</button></div>` : ''}
        ${hist.length ? `<div><div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Movimientos (${hist.length})</div>
          ${hist.map(h => `<div class="text-[11px] text-slate-600">↔ De <strong>${pmUnitLabel(h.moved_from_unit_id).replace(/</g,'&lt;')}</strong> a <strong>${pmUnitLabel(h.moved_to_unit_id).replace(/</g,'&lt;')}</strong> · ${(h.moved_at||'').slice(0,10)}${h.moved_by?` · ${(h.moved_by||'').replace(/</g,'&lt;')}`:''}${h.reason?`<span class="text-slate-400"> — ${(h.reason||'').replace(/</g,'&lt;')}</span>`:''}</div>`).join('')}
        </div>` : ''}
      </div>` : '';
  openModal((isNew?'+ Nueva':'✏️ Editar')+' Reserva', `
    <div class="space-y-3">
      ${histHtml}
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
            ${[['activo','Activo'],['confirmado','Confirmado'],['reservada','Reservada'],['borrador','Borrador'],['vencido','Vencido'],['finalizado','Finalizado'],['cancelado','Cancelado']].map(([v,l])=>`<option value="${v}" ${(b.status||'activo')===v?'selected':''}>${l}</option>`).join('')}
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
// 🔔 ALERTAS — barra contextual + bell dropdown
// ════════════════════════════════════════════════════════════════
function pmAlertSev(sev) {
  return ({
    critical: { label: 'Crítica', dot: 'bg-red-500',     txt: 'text-red-700',     bg: 'bg-red-50',     border: 'border-l-red-500' },
    warning:  { label: 'Advert.', dot: 'bg-amber-500',   txt: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-l-amber-500' },
    info:     { label: 'Info',    dot: 'bg-blue-500',    txt: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-l-blue-500' }
  })[sev] || { label: sev||'—', dot: 'bg-slate-400', txt: 'text-slate-600', bg: 'bg-slate-50', border: 'border-l-slate-400' };
}
function pmActiveAlerts() { return (pmaState.alerts||[]).filter(a => !a.resolved); }
function pmAlertCounts() {
  const a = pmActiveAlerts();
  return { total: a.length, unread: a.filter(x=>!x.read).length,
    critical: a.filter(x=>x.severity==='critical').length,
    warning: a.filter(x=>x.severity==='warning').length,
    info: a.filter(x=>x.severity==='info').length };
}

function pmRenderAlertsBar() {
  const c = pmAlertCounts();
  const open = pmaState.alertsDropdownOpen;
  const recent = pmActiveAlerts().slice(0, 10);
  return `
  <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
    <div class="text-[11px] text-slate-600">
      ${c.total ? `🔔 <strong>${c.total}</strong> alertas activas: <span class="text-red-600 font-bold">${c.critical} críticas</span> · <span class="text-amber-600 font-bold">${c.warning} advertencias</span> · <span class="text-blue-600 font-bold">${c.info} informativas</span>`
                : '<span class="text-slate-400">🔔 Sin alertas activas</span>'}
    </div>
    <div class="flex items-center gap-2 relative">
      <button onclick="pmRunAlertChecks(this)" title="Generar alertas ahora" class="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded">↻ Revisar</button>
      <button onclick="pmaState.alertsDropdownOpen=${open?'false':'true'};pmRender()" class="relative bg-white border border-slate-200 hover:bg-slate-50 rounded-lg px-2.5 py-1.5">
        <span class="text-base leading-none">🔔</span>
        ${c.unread ? `<span class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">${c.unread}</span>` : ''}
      </button>
      ${open ? `
        <div class="absolute right-0 top-full mt-1 w-[340px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div class="flex items-center justify-between px-3 py-2 border-b border-slate-100" style="background:#1e293b">
            <span class="text-xs font-bold text-white">Alertas recientes</span>
            <button onclick="pmAlertMarkAllRead()" class="text-[10px] font-bold" style="color:#d4af37">Marcar todas leídas</button>
          </div>
          <div class="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
            ${recent.length ? recent.map(a => { const s = pmAlertSev(a.severity); return `
              <div class="px-3 py-2 flex items-start gap-2 ${a.read?'':'bg-slate-50'}">
                <span class="${s.dot} w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"></span>
                <div class="flex-1 min-w-0">
                  <div class="text-[11px] text-slate-700 leading-snug">${(a.message||'').replace(/</g,'&lt;')}</div>
                  <div class="text-[9px] text-slate-400 mt-0.5">${(a.created_at||'').slice(0,16).replace('T',' ')}${a.property_id?` · ${pmPropertyName(a.property_id).slice(0,18)}`:''}</div>
                </div>
                ${!a.read?`<button onclick="pmAlertMarkRead('${a.id}')" title="Marcar leída" class="text-slate-300 hover:text-slate-600 text-xs">✓</button>`:''}
              </div>`; }).join('') : '<div class="px-3 py-6 text-center text-slate-400 text-xs italic">Sin alertas.</div>'}
          </div>
          <button onclick="pmaState.alertsDropdownOpen=false;pmSetTab('operations');pmaState.opsSubTab='alerts';pmRender()" class="w-full text-center text-[11px] font-bold text-slate-700 hover:bg-slate-50 py-2 border-t border-slate-100">Ver todas las alertas →</button>
        </div>` : ''}
    </div>
  </div>`;
}

async function pmRunAlertChecks(btn) {
  if (btn) { btn.disabled = true; btn.textContent = '↻ Revisando…'; }
  try {
    const { data: sess } = await sb.auth.getSession();
    const token = sess?.session?.access_token;
    const base = (window.SUPABASE_URL || (sb?.supabaseUrl) || '').replace(/\/$/,'');
    if (!token || !base) { alert('Sin sesión para invocar las alertas.'); return; }
    const r = await fetch(`${base}/functions/v1/pm-alerts?check=all`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggered_by: 'ui' })
    });
    const j = await r.json().catch(()=>({}));
    if (!r.ok) { alert('No se pudieron generar alertas: ' + (j.error||r.status)); return; }
    // recargar alertas
    const { data } = await sb.from('pm_alerts').select('*').order('created_at',{ascending:false}).limit(500);
    pmaState.alerts = data || [];
    pmRender();
  } catch (e) { alert('Error: ' + e.message); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '↻ Revisar'; } }
}
window.pmRunAlertChecks = pmRunAlertChecks;

async function pmAlertMarkRead(id) {
  const r = await pmExecQuery(sb.from('pm_alerts').update({ read: true }).eq('id', id).select(), 'Marcar leída');
  if (!r) return;
  const a = pmaState.alerts.find(x => x.id === id); if (a) a.read = true;
  pmRender();
}
window.pmAlertMarkRead = pmAlertMarkRead;

async function pmAlertMarkAllRead() {
  const ids = pmActiveAlerts().filter(a => !a.read).map(a => a.id);
  if (!ids.length) return;
  const r = await pmExecQuery(sb.from('pm_alerts').update({ read: true }).in('id', ids).select(), 'Marcar todas leídas');
  if (!r) return;
  pmaState.alerts.forEach(a => { if (ids.includes(a.id)) a.read = true; });
  pmRender();
}
window.pmAlertMarkAllRead = pmAlertMarkAllRead;

async function pmAlertResolve(id) {
  const r = await pmExecQuery(sb.from('pm_alerts').update({ resolved: true, read: true }).eq('id', id).select(), 'Resolver alerta');
  if (!r) return;
  const a = pmaState.alerts.find(x => x.id === id); if (a) { a.resolved = true; a.read = true; }
  pmRender();
}
window.pmAlertResolve = pmAlertResolve;

async function pmAlertAssign(id) {
  const who = prompt('Asignar alerta a (nombre del equipo):', PM_TEAM[0]);
  if (who === null) return;
  const r = await pmExecQuery(sb.from('pm_alerts').update({ assigned_to: who.trim() || null }).eq('id', id).select(), 'Asignar alerta');
  if (!r) return;
  const a = pmaState.alerts.find(x => x.id === id); if (a) a.assigned_to = who.trim() || null;
  pmRender();
}
window.pmAlertAssign = pmAlertAssign;

// ════════════════════════════════════════════════════════════════
// TAB · OPERACIÓN (3 sub-tabs + panel de alertas)
// ════════════════════════════════════════════════════════════════
const PM_TASK_TYPES = {
  cleaning:             { label: '🧹 Limpieza',  color: '#3b82f6', chip: 'bg-blue-100 text-blue-800' },
  recepcion:            { label: '🛎️ Recepción', color: '#0ea5e9', chip: 'bg-sky-100 text-sky-800' },
  aseo:                 { label: '🧹 Aseo',      color: '#3b82f6', chip: 'bg-blue-100 text-blue-800' },
  mantenimiento:        { label: '🔧 Manten.',   color: '#f97316', chip: 'bg-orange-100 text-orange-800' },
  podada:               { label: '🌱 Podada',    color: '#10b981', chip: 'bg-emerald-100 text-emerald-800' },
  cesped:               { label: '🌱 Césped',    color: '#10b981', chip: 'bg-emerald-100 text-emerald-800' },
  plagas:               { label: '🐛 Plagas',    color: '#a855f7', chip: 'bg-purple-100 text-purple-800' },
  inspeccion:           { label: '🚪 Inspección',color: '#f59e0b', chip: 'bg-amber-100 text-amber-800' },
  renovacion_contrato:  { label: '📄 Renovación',color: '#ef4444', chip: 'bg-red-100 text-red-800' }
};
function pmTaskMeta(t) { return PM_TASK_TYPES[t] || { label: 'Tarea', color: '#94a3b8', chip: 'bg-slate-100 text-slate-700' }; }
function pmTaskDate(t) { return t.scheduled_date || (t.start_at ? String(t.start_at).slice(0,10) : null); }

function pmOpsTaskOpen(t) { return !['completado','cancelado'].includes(t.status); }
function pmTasksFiltered(tasks) {
  let r = tasks;
  if (pmaState.opsFilterProperty) r = r.filter(t => t.property_id === pmaState.opsFilterProperty);
  if (pmaState.opsFilterType) r = r.filter(t => t.task_type === pmaState.opsFilterType);
  if (pmaState.opsFilterAssignee) r = r.filter(t => (t.assignee||'') === pmaState.opsFilterAssignee);
  return r;
}
function pmOpsHeaderCards() {
  const today = new Date().toISOString().slice(0,10);
  const in7 = new Date(); in7.setDate(in7.getDate()+7); const in7ISO = in7.toISOString().slice(0,10);
  const open = (pmaState.tasks||[]).filter(pmOpsTaskOpen);
  const hoy = open.filter(t => pmTaskDate(t) === today).length;
  const limpiezas = open.filter(t => (t.task_type==='cleaning'||t.task_type==='aseo') && pmTaskDate(t) >= today && pmTaskDate(t) <= in7ISO).length;
  const utilVenc = (pmaState.utilities||[]).filter(u => { const s = pmUtilityStatus(u); return s.key==='due_soon' || s.key==='overdue'; }).length;
  const alertas = pmActiveAlerts().length;
  const card = (label, value, accent) => `<div class="bg-white border border-slate-200 rounded-xl p-3"><div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${label}</div><div class="text-2xl font-extrabold mt-1 ${accent||'text-slate-900'}">${value}</div></div>`;
  return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
    ${card('Tareas pendientes hoy', hoy, hoy?'text-amber-600':'text-slate-900')}
    ${card('Limpiezas esta semana', limpiezas, 'text-blue-600')}
    ${card('Utilities por vencer 7d', utilVenc, utilVenc?'text-red-600':'text-slate-900')}
    ${card('Alertas activas', alertas, alertas?'text-red-600':'text-slate-900')}
  </div>`;
}
function pmOpsGlobalFilters() {
  const props = pmaState.properties.filter(p => (pmaState.tasks||[]).some(t => t.property_id === p.id));
  const assignees = [...new Set((pmaState.tasks||[]).map(t => t.assignee).filter(Boolean))];
  const pF = pmaState.opsFilterProperty, tF = pmaState.opsFilterType, aF = pmaState.opsFilterAssignee;
  const hasF = pF || tF || aF;
  return `<div class="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
    <select onchange="pmaState.opsFilterProperty=this.value||null;pmRender()" class="border border-slate-300 rounded px-2 py-1 text-xs"><option value="">🏠 Todas</option>${props.map(p=>`<option value="${p.id}" ${pF===p.id?'selected':''}>${(p.name||'').replace(/</g,'&lt;')}</option>`).join('')}</select>
    <select onchange="pmaState.opsFilterType=this.value||null;pmRender()" class="border border-slate-300 rounded px-2 py-1 text-xs"><option value="">Todo tipo</option>${Object.entries(PM_TASK_TYPES).map(([k,m])=>`<option value="${k}" ${tF===k?'selected':''}>${m.label}</option>`).join('')}</select>
    <select onchange="pmaState.opsFilterAssignee=this.value||null;pmRender()" class="border border-slate-300 rounded px-2 py-1 text-xs"><option value="">Todos</option>${PM_TEAM.concat(assignees.filter(a=>!PM_TEAM.includes(a))).map(a=>`<option value="${a}" ${aF===a?'selected':''}>${(a||'').replace(/</g,'&lt;')}</option>`).join('')}</select>
    ${hasF?`<button onclick="pmaState.opsFilterProperty=null;pmaState.opsFilterType=null;pmaState.opsFilterAssignee=null;pmRender()" class="text-[#b8941f] hover:underline">✕ Limpiar</button>`:''}
  </div>`;
}

function pmRenderOperations() {
  const sub = pmaState.opsSubTab || 'tasks';
  const c = pmAlertCounts();
  const dwN = (pmaState.dataWarnings||[]).length;
  const tabs = [['tasks','📋 Cronograma'],['utilities','💡 Utilities'],['datawarn',`🔎 Datos${dwN?` (${dwN})`:''}`],['services','⚡ Servicios'],['comms','💬 Comunicación'],['alerts',`🔔 Alertas${c.total?` (${c.total})`:''}`]];
  return `
  <style>@keyframes pmfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.pm-fade{animation:pmfade .4s ease both}</style>
  <div class="space-y-3 p-1 pm-fade" style="font-family:Inter,system-ui,sans-serif">
    ${pmOpsHeaderCards()}
    <div class="flex gap-1 border-b border-slate-200 overflow-x-auto">
      ${tabs.map(([k,l]) => `<button onclick="pmaState.opsSubTab='${k}';pmRender()" class="px-3 py-1.5 text-xs font-bold border-b-2 -mb-px transition whitespace-nowrap ${sub===k?'border-[#d4af37] text-slate-900':'border-transparent text-slate-500 hover:text-slate-700'}">${l}</button>`).join('')}
    </div>
    ${sub==='tasks'     ? pmRenderTasksSection() : ''}
    ${sub==='utilities' ? pmRenderUtilities() : ''}
    ${sub==='datawarn'  ? pmRenderDataWarnings() : ''}
    ${sub==='services'  ? pmRenderServices() : ''}
    ${sub==='comms'     ? pmRenderComms() : ''}
    ${sub==='alerts'    ? pmRenderAlertsPanel() : ''}
  </div>`;
}

// ── Sub-tab A: Cronograma de tareas ──
function pmRenderTasksSection() {
  const view = pmaState.tasksView || 'calendar';
  const vb = (k,l) => `<button onclick="pmaState.tasksView='${k}';pmRender()" class="px-3 py-1 rounded-full ${view===k?'bg-white shadow text-slate-900':'text-slate-500'}">${l}</button>`;
  // Casas que necesitan visita esta semana
  const today = new Date().toISOString().slice(0,10);
  const in7 = new Date(); in7.setDate(in7.getDate()+7); const in7ISO = in7.toISOString().slice(0,10);
  const needVisit = {};
  (pmaState.tasks||[]).filter(pmOpsTaskOpen).forEach(t => { const d = pmTaskDate(t); if (d && d >= today && d <= in7ISO && t.property_id) needVisit[t.property_id] = (needVisit[t.property_id]||0)+1; });
  const needVisitEntries = Object.entries(needVisit).sort((a,b)=>b[1]-a[1]);
  return `
  <div class="space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center bg-slate-100 rounded-full p-0.5 text-[10px] font-bold">
        ${vb('calendar','📅 Mes')}${vb('weekly','🗓 Semana')}${vb('list','📋 Lista')}${vb('byassignee','👥 Encargado')}
      </div>
      <div class="flex items-center gap-2">
        ${pmOpsGlobalFilters()}
        <button onclick="pmEditTask(null)" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg" style="border:1px solid #d4af37">+ Nueva tarea</button>
      </div>
    </div>

    ${needVisitEntries.length ? `<div class="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
      <div class="text-[11px] uppercase font-bold text-amber-700 mb-1">🏠 Casas que necesitan visita esta semana</div>
      <div class="flex gap-1.5 flex-wrap">${needVisitEntries.map(([pid,n])=>`<button onclick="pmaState.opsFilterProperty='${pid}';pmaState.tasksView='list';pmRender()" class="text-[11px] bg-white border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-100">${pmPropertyName(pid).replace(/</g,'&lt;').slice(0,20)} <strong>${n}</strong></button>`).join('')}</div>
    </div>` : ''}

    ${view==='calendar' ? pmRenderTasksCalendar() : view==='weekly' ? pmRenderTasksWeekly() : view==='byassignee' ? pmRenderTasksByAssignee() : pmRenderTasksList()}
  </div>`;
}

function pmWeeklyTaskBtn(t) {
  const m = pmTaskMeta(t.task_type);
  return `<button onclick="pmEditTask('${t.id}')" class="w-full text-left text-[9px] px-1 py-0.5 rounded leading-tight" style="background:${m.color}22;color:${m.color}" title="${(t.title||'').replace(/"/g,'&quot;')}">${(t.title||'').replace(/</g,'&lt;').slice(0,22)}${t.assignee?`<br><span class='opacity-70'>${(t.assignee||'').slice(0,12)}</span>`:''}</button>`;
}
// Vista semanal (Lun-Dom)
function pmRenderTasksWeekly() {
  const base = pmaState.opsWeekStart ? new Date(pmaState.opsWeekStart+'T00:00:00') : (() => { const d = new Date(); const dow = (d.getDay()+6)%7; d.setDate(d.getDate()-dow); return d; })();
  const monday = new Date(base); monday.setHours(0,0,0,0);
  const today = new Date().toISOString().slice(0,10);
  const days = Array.from({length:7}, (_,i) => { const d = new Date(monday); d.setDate(d.getDate()+i); return d; });
  const dows = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const tasks = pmTasksFiltered((pmaState.tasks||[]).filter(pmOpsTaskOpen));
  const shift = (n) => { const d = new Date(monday); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
  return `
    <div class="bg-white border border-slate-200 rounded-xl p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-bold text-slate-900">Semana del ${monday.toISOString().slice(0,10)}</div>
        <div class="flex items-center gap-1 text-sm">
          <button onclick="pmaState.opsWeekStart='${shift(-7)}';pmRender()" class="px-2 text-slate-500 hover:text-slate-900">‹</button>
          <button onclick="pmaState.opsWeekStart=null;pmRender()" class="text-[11px] font-bold text-slate-600">Hoy</button>
          <button onclick="pmaState.opsWeekStart='${shift(7)}';pmRender()" class="px-2 text-slate-500 hover:text-slate-900">›</button>
        </div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        ${days.map((d,i) => { const ds = d.toISOString().slice(0,10); const ts = tasks.filter(t => pmTaskDate(t)===ds);
          return `<div class="min-h-[120px] border border-slate-100 rounded p-1 ${ds===today?'ring-1 ring-[#d4af37]':''}">
            <div class="text-[9px] font-bold ${ds===today?'text-[#b8941f]':'text-slate-400'} uppercase">${dows[i]} ${d.getDate()}</div>
            <div class="space-y-1 mt-1">${ts.map(pmWeeklyTaskBtn).join('') || '<div class="text-[8px] text-slate-300">—</div>'}</div>
          </div>`; }).join('')}
      </div>
    </div>`;
}

function pmAssigneeTaskBtn(t) {
  const m = pmTaskMeta(t.task_type);
  return `<button onclick="pmEditTask('${t.id}')" class="w-full text-left text-[11px] px-1.5 py-1 rounded flex items-center gap-1.5" style="background:${m.color}14"><span class="w-1.5 h-1.5 rounded-full" style="background:${m.color}"></span><span class="truncate">${(t.title||'').replace(/</g,'&lt;').slice(0,28)}</span><span class="ml-auto text-slate-400">${(pmTaskDate(t)||'').slice(5)}</span></button>`;
}
// Vista por encargado
function pmRenderTasksByAssignee() {
  const today = new Date().toISOString().slice(0,10);
  const all = pmTasksFiltered(pmaState.tasks||[]);
  const team = [...new Set(PM_TEAM.concat(all.map(t=>t.assignee).filter(Boolean)))];
  const card = (name) => {
    const ts = all.filter(t => (t.assignee||'') === name);
    const done = ts.filter(t => t.status==='completado').length;
    const pend = ts.filter(t => pmOpsTaskOpen(t) && (pmTaskDate(t)||'')>=today).length;
    const late = ts.filter(t => pmOpsTaskOpen(t) && (pmTaskDate(t)||'9999')<today).length;
    const week = ts.filter(t => { const d=pmTaskDate(t); if(!d||!pmOpsTaskOpen(t))return false; const in7=new Date();in7.setDate(in7.getDate()+7); return d>=today && d<=in7.toISOString().slice(0,10); });
    return `<div class="bg-white border border-slate-200 rounded-xl p-3">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style="background:#1e293b;border:2px solid #d4af37">${name.charAt(0).toUpperCase()}</div>
        <div class="font-bold text-sm text-slate-800">${name.replace(/</g,'&lt;')}</div>
      </div>
      <div class="flex gap-2 text-[11px] mb-2">
        <span class="text-emerald-600 font-bold">✓ ${done}</span><span class="text-amber-600 font-bold">⏳ ${pend}</span><span class="text-red-600 font-bold">⚠ ${late}</span>
      </div>
      <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Esta semana (${week.length})</div>
      <div class="space-y-1">${week.slice(0,6).map(pmAssigneeTaskBtn).join('') || '<div class="text-[10px] text-slate-400 italic">Sin tareas.</div>'}</div>
    </div>`;
  };
  return `<div class="grid grid-cols-1 lg:grid-cols-3 gap-2">${team.map(card).join('')}</div>`;
}

function pmRenderTasksCalendar() {
  const ym = pmaState.opsCalMonth || pmCurrentYM();
  const y = pmYmYear(ym), mIdx = pmYmMonthIdx(ym);
  const first = new Date(y, mIdx, 1);
  const startDow = (first.getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(y, mIdx+1, 0).getDate();
  const today = new Date().toISOString().slice(0,10);
  const tasksByDay = {};
  (pmaState.tasks||[]).forEach(t => { const d = pmTaskDate(t); if (d && d.startsWith(ym)) { const day = parseInt(d.slice(8,10),10); (tasksByDay[day] = tasksByDay[day]||[]).push(t); } });

  const cells = [];
  for (let i=0;i<startDow;i++) cells.push('<div class="bg-slate-50 rounded"></div>');
  for (let day=1; day<=daysInMonth; day++) {
    const ds = `${ym}-${String(day).padStart(2,'0')}`;
    const ts = tasksByDay[day] || [];
    cells.push(`
      <div class="bg-white border border-slate-100 rounded p-1 min-h-[68px] ${ds===today?'ring-1 ring-[#d4af37]':''}">
        <div class="text-[10px] font-bold ${ds===today?'text-[#b8941f]':'text-slate-400'}">${day}</div>
        <div class="space-y-0.5 mt-0.5">
          ${ts.slice(0,3).map(t => { const m=pmTaskMeta(t.task_type); const done=t.status==='completado'; return `
            <button onclick="pmEditTask('${t.id}')" class="w-full text-left text-[9px] px-1 py-0.5 rounded truncate ${done?'opacity-40 line-through':''}" style="background:${m.color}22;color:${m.color}" title="${(t.title||'').replace(/"/g,'&quot;')}">${(t.title||'').replace(/</g,'&lt;').slice(0,18)}</button>`; }).join('')}
          ${ts.length>3?`<div class="text-[8px] text-slate-400">+${ts.length-3} más</div>`:''}
        </div>
      </div>`);
  }
  const dows = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  return `
    <div class="bg-white border border-slate-200 rounded-xl p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-bold text-slate-900">${PM_ES_MONTHS[mIdx]} ${y}</div>
        ${pmMonthNav(ym, 'pmSetOpsCalMonth(%V%)')}
      </div>
      <div class="grid grid-cols-7 gap-1 text-[9px] font-bold text-slate-400 uppercase mb-1">${dows.map(d=>`<div class="text-center">${d}</div>`).join('')}</div>
      <div class="grid grid-cols-7 gap-1">${cells.join('')}</div>
    </div>`;
}
function pmSetOpsCalMonth(ym) { pmaState.opsCalMonth = ym; pmRender(); }
window.pmSetOpsCalMonth = pmSetOpsCalMonth;

function pmRenderTasksList() {
  const range = pmaState.tasksListRange || '7';
  const today = new Date().toISOString().slice(0,10);
  const limit = new Date(); limit.setDate(limit.getDate() + (range==='30'?30:7)); const limitISO = limit.toISOString().slice(0,10);
  const open = pmTasksFiltered((pmaState.tasks||[]).filter(t => !['completado','cancelado'].includes(t.status)));
  let rows;
  if (range==='late') rows = open.filter(t => { const d=pmTaskDate(t); return d && d < today; });
  else rows = open.filter(t => { const d=pmTaskDate(t); return d && d >= today && d <= limitISO; });
  rows = rows.sort((a,b) => (pmTaskDate(a)||'').localeCompare(pmTaskDate(b)||''));

  const rb = (k,l) => `<button onclick="pmaState.tasksListRange='${k}';pmRender()" class="px-3 py-1 rounded-full ${range===k?'bg-slate-900 text-white':'text-slate-500 hover:text-slate-900'}">${l}</button>`;
  return `
    <div class="space-y-2">
      <div class="flex items-center bg-slate-100 rounded-full p-0.5 text-[10px] font-bold w-fit">
        ${rb('7','Próximos 7 días')}${rb('30','Próximos 30 días')}${rb('late','Atrasadas')}
      </div>
      ${rows.length ? `<div class="space-y-1.5">${rows.map(pmRenderTaskRow).join('')}</div>`
        : '<div class="text-xs text-slate-400 italic px-3 py-8 text-center bg-slate-50 rounded-lg">Sin tareas en este rango.</div>'}
    </div>`;
}

function pmRenderTaskRow(t) {
  const m = pmTaskMeta(t.task_type);
  const d = pmTaskDate(t);
  const today = new Date().toISOString().slice(0,10);
  const late = d && d < today && !['completado','cancelado'].includes(t.status);
  return `
    <div class="bg-white border border-slate-200 border-l-4 rounded-lg p-2.5 flex items-center gap-3 flex-wrap" style="border-left-color:${m.color}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[10px] ${m.chip} px-1.5 py-0.5 rounded font-bold">${m.label}</span>
          <strong class="text-sm text-slate-900">${(t.title||'(sin título)').replace(/</g,'&lt;')}</strong>
          ${late?'<span class="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold">Atrasada</span>':''}
          ${t.status==='completado'?'<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Completada</span>':''}
        </div>
        <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
          <span>📅 ${d||'sin fecha'}</span>
          ${t.property_id?`<span>· 🏠 ${pmPropertyName(t.property_id).replace(/</g,'&lt;').slice(0,22)}</span>`:''}
          ${t.assignee?`<span>· 👤 ${(t.assignee||'').replace(/</g,'&lt;')}</span>`:''}
        </div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        ${t.status!=='completado'?`<button onclick="pmTaskComplete('${t.id}')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">✓ Completar</button>`:''}
        <button onclick="pmTaskReschedule('${t.id}')" class="bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">↻ Reprogramar</button>
        <button onclick="pmTaskReassign('${t.id}')" class="bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">👤 Reasignar</button>
        <button onclick="pmEditTask('${t.id}')" class="text-slate-400 hover:text-slate-700 p-1">✏️</button>
      </div>
    </div>`;
}

async function pmTaskReassign(id) {
  const who = prompt('Reasignar tarea a:', PM_TEAM[0]);
  if (who === null) return;
  const r = await pmExecQuery(sb.from('pm_tasks').update({ assignee: who.trim() || null }).eq('id', id).select(), 'Reasignar tarea');
  if (!r) return;
  pmaState.tasks = (pmaState.tasks||[]).map(t => t.id===id?{...t, assignee: who.trim()||null}:t);
  pmRender();
}
window.pmTaskReassign = pmTaskReassign;

async function pmEditTask(id) {
  const t = id ? (pmaState.tasks||[]).find(x => x.id === id) : { status: 'pendiente', priority: 'media', scheduled_date: new Date().toISOString().slice(0,10) };
  const isNew = !id;
  openModal((isNew?'+ Nueva':'✏️ Editar')+' Tarea', `
    <div class="space-y-3">
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Título *</label>
        <input id="pm-kf-title" value="${(t.title||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Tipo</label>
          <select id="pm-kf-type" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">— Otro —</option>
            ${Object.entries(PM_TASK_TYPES).map(([k,m])=>`<option value="${k}" ${t.task_type===k?'selected':''}>${m.label}</option>`).join('')}
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Fecha programada</label>
          <input id="pm-kf-date" type="date" value="${pmTaskDate(t)||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Propiedad</label>
          <select id="pm-kf-prop" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">— Ninguna —</option>
            ${pmaState.properties.map(p=>`<option value="${p.id}" ${t.property_id===p.id?'selected':''}>${(p.name||'').replace(/</g,'&lt;')}</option>`).join('')}
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Asignado a</label>
          <input id="pm-kf-assignee" list="pm-kf-team" value="${(t.assignee||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
          <datalist id="pm-kf-team">${PM_TEAM.map(n=>`<option value="${n}">`).join('')}</datalist></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Estado</label>
          <select id="pm-kf-status" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${[['pendiente','Pendiente'],['en_progreso','En progreso'],['completado','Completada'],['cancelado','Saltada/Cancelada']].map(([v,l])=>`<option value="${v}" ${(t.status||'pendiente')===v?'selected':''}>${l}</option>`).join('')}
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Prioridad</label>
          <select id="pm-kf-priority" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${[['baja','Baja'],['media','Media'],['alta','Alta'],['urgente','Urgente']].map(([v,l])=>`<option value="${v}" ${(t.priority||'media')===v?'selected':''}>${l}</option>`).join('')}
          </select></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Notas</label>
        <textarea id="pm-kf-notes" rows="2" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">${(t.notes||'').replace(/</g,'&lt;')}</textarea></div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${!isNew?`<button onclick="pmDeleteTask('${id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded">🗑</button>`:''}
        <button onclick="pmSaveTask('${id||''}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded" style="border:1px solid #d4af37">${isNew?'Crear':'Guardar'}</button>
      </div>
    </div>`);
}
window.pmEditTask = pmEditTask;

async function pmSaveTask(id) {
  const payload = {
    title: document.getElementById('pm-kf-title').value.trim(),
    task_type: document.getElementById('pm-kf-type').value || null,
    scheduled_date: document.getElementById('pm-kf-date').value || null,
    property_id: document.getElementById('pm-kf-prop').value || null,
    assignee: document.getElementById('pm-kf-assignee').value.trim() || null,
    status: document.getElementById('pm-kf-status').value,
    priority: document.getElementById('pm-kf-priority').value,
    notes: document.getElementById('pm-kf-notes').value.trim() || null
  };
  if (!payload.title) return alert('El título es obligatorio.');
  const r = id
    ? await pmExecQuery(sb.from('pm_tasks').update(payload).eq('id', id).select(), 'Update tarea')
    : await pmExecQuery(sb.from('pm_tasks').insert(payload).select(), 'Crear tarea');
  if (!r) return;
  await pmAfterCrud();
}
window.pmSaveTask = pmSaveTask;

async function pmDeleteTask(id) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  const r = await pmExecQuery(sb.from('pm_tasks').delete().eq('id', id), 'Eliminar tarea');
  if (!r) return;
  await pmAfterCrud();
}
window.pmDeleteTask = pmDeleteTask;

// ── Sub-tab: Utilities (recibos públicos) ──
function pmUtilityStatus(u) {
  const today = new Date(); const ym = today.toISOString().slice(0,7);
  if (u.last_paid_date && String(u.last_paid_date).slice(0,7) === ym) return { key: 'paid', label: '✅ Pagado', cls: 'text-emerald-700 bg-emerald-50' };
  // FIX11: sin historial real (seeded) → no contar como "por vencer"
  if (!u.last_paid_date) return { key: 'sin_info', label: '— sin datos', cls: 'text-slate-400 bg-slate-50' };
  const cut = u.cutoff_day ? new Date(today.getFullYear(), today.getMonth(), Math.min(u.cutoff_day, 28)) : null;
  if (!cut) return { key: 'unknown', label: '—', cls: 'text-slate-400 bg-slate-50' };
  const days = Math.floor((cut - today) / 86400000);
  if (days < -14) return { key: 'cut', label: '❌ Cortado', cls: 'text-white bg-red-600' };
  if (days < 0) return { key: 'overdue', label: `🔴 Vencido ${Math.abs(days)}d`, cls: 'text-red-700 bg-red-50' };
  if (days <= 7) return { key: 'due_soon', label: `⏰ Por vencer (${days}d)`, cls: 'text-amber-700 bg-amber-50' };
  return { key: 'ok', label: '🟢 Al día', cls: 'text-emerald-700 bg-emerald-50' };
}
function pmRenderUtilities() {
  const utils = pmaState.utilities || [];
  const pF = pmaState.opsFilterProperty;
  // Un utility "configurado" tiene monto, cuenta o algún pago registrado. Los placeholders
  // vacíos (seed sin fuente en Airtable) NO se listan como filas fantasma: van a un aviso.
  const isConfigured = u => Number(u.monthly_amount||0) > 0 || (u.account_number||'').trim() || u.last_paid_date;
  const pending = utils.filter(u => !isConfigured(u));
  let rows = utils.filter(isConfigured);
  if (pF) rows = rows.filter(u => u.property_id === pF);
  rows = [...rows].sort((a,b) => (pmPropertyName(a.property_id)).localeCompare(pmPropertyName(b.property_id)) || (a.service_name||'').localeCompare(b.service_name||''));
  const props = pmaState.properties.filter(p => utils.some(u => u.property_id === p.id));
  const totalMonth = rows.reduce((s,u) => s + Number(u.monthly_amount||0), 0);
  const overdue = rows.filter(u => ['overdue','cut'].includes(pmUtilityStatus(u).key)).length;
  return `
  <div class="space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <div class="text-sm font-bold text-slate-900">Utilities · ${rows.length} configurados</div>
        <div class="text-xs text-slate-500">${pmMoney(totalMonth)}/mes estimado${overdue?` · <span class="text-red-600 font-bold">${overdue} vencidos</span>`:''}</div>
      </div>
      <div class="flex items-center gap-2">
        <select onchange="pmaState.opsFilterProperty=this.value||null;pmRender()" class="border border-slate-300 rounded px-2 py-1 text-xs"><option value="">🏠 Todas</option>${props.map(p=>`<option value="${p.id}" ${pF===p.id?'selected':''}>${(p.name||'').replace(/</g,'&lt;')}</option>`).join('')}</select>
        <button onclick="pmEditUtility(null)" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg" style="border:1px solid #d4af37">+ Servicio</button>
      </div>
    </div>
    ${rows.length ? `<div class="bg-white border border-slate-200 rounded-xl overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold"><tr>
          <th class="px-3 py-2 text-left">Casa</th><th class="px-3 py-2 text-left">Servicio</th><th class="px-3 py-2 text-left">Cuenta</th>
          <th class="px-3 py-2 text-right">Monto</th><th class="px-3 py-2 text-left">Últ. pago</th><th class="px-3 py-2 text-left">Próx corte</th>
          <th class="px-3 py-2 text-left">Status</th><th class="px-3 py-2 text-center">Acción</th>
        </tr></thead>
        <tbody>${rows.map(u => { const st = pmUtilityStatus(u); const cut = u.cutoff_day?`día ${u.cutoff_day}`:'—'; return `<tr class="border-t border-slate-100 ${['overdue','cut'].includes(st.key)?'bg-red-50':'hover:bg-slate-50'}">
          <td class="px-3 py-2 text-slate-700">${pmPropertyName(u.property_id).replace(/</g,'&lt;').slice(0,18)}</td>
          <td class="px-3 py-2 font-semibold text-slate-800">${(u.service_name||'').replace(/</g,'&lt;')}</td>
          <td class="px-3 py-2 text-slate-500 font-mono">${(u.account_number||'—').replace(/</g,'&lt;')}</td>
          <td class="px-3 py-2 text-right font-bold text-slate-700">${u.monthly_amount?'$'+Number(u.monthly_amount).toLocaleString():'—'}</td>
          <td class="px-3 py-2 text-slate-600">${u.last_paid_date||'—'}${u.last_paid_amount?` · $${Number(u.last_paid_amount).toLocaleString()}`:''}${u.proof_url?` <a href="${u.proof_url}" target="_blank" class="text-blue-600">📎</a>`:''}</td>
          <td class="px-3 py-2 text-slate-600">${cut}</td>
          <td class="px-3 py-2"><span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${st.cls}">${st.label}</span></td>
          <td class="px-3 py-2 text-center whitespace-nowrap"><button onclick="pmMarkUtilityPaid('${u.id}')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">Marcar pagado</button> <button onclick="pmEditUtility('${u.id}')" class="text-slate-400 hover:text-slate-700">✏️</button></td>
        </tr>`; }).join('')}</tbody>
      </table>
    </div>` : '<div class="text-xs text-slate-400 italic px-3 py-10 text-center bg-slate-50 rounded-lg">Todavía no hay utilities configurados (monto + cuenta). Agregá uno con "+ Servicio" o esperá la tabla de utilities en Airtable.</div>'}
    ${pending.length ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
      ⚠️ <b>${pending.length} servicios pendientes de configurar</b> (sin monto ni número de cuenta — hoy NO existe tabla de utilities en la base Modelo Nuevo, son placeholders del seed).
      Para activarlos: completalos acá con ✏️ (monto mensual + cuenta + día de corte) o definí la fuente en Airtable (tabla de utilities nueva, o 🔑 Accesos con Categoría=servicio) y se sincronizan.
      <button onclick="pmaState._showPendingUtils=!pmaState._showPendingUtils;pmRender()" class="ml-2 text-amber-900 underline font-bold">${pmaState._showPendingUtils?'Ocultar':'Ver lista'}</button>
      ${pmaState._showPendingUtils ? `<div class="mt-2 flex flex-wrap gap-1.5">${pending.map(u => `<button onclick="pmEditUtility('${u.id}')" class="bg-white border border-amber-200 rounded px-2 py-0.5 text-[10px] hover:bg-amber-100" title="Configurar">${pmPropertyName(u.property_id).replace(/</g,'&lt;').slice(0,14)} · ${(u.service_name||'').replace(/</g,'&lt;')}</button>`).join('')}</div>` : ''}
    </div>` : ''}
  </div>`;
}
async function pmMarkUtilityPaid(id) {
  const u = (pmaState.utilities||[]).find(x => x.id == id);
  if (!u) return;
  const today = new Date().toISOString().slice(0,10);
  openModal('💡 Marcar pagado — ' + (u.service_name||''), `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Monto $</label><input id="pm-ut-amount" type="number" step="0.01" value="${u.monthly_amount||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Fecha *</label><input id="pm-ut-date" type="date" value="${today}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Comprobante</label><input id="pm-ut-file" type="file" accept="image/*,application/pdf" class="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"/></div>
      <div id="pm-ut-status" class="text-[11px] text-slate-500"></div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button id="pm-ut-save" onclick="pmSaveUtilityPaid('${id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">Registrar pago</button>
      </div>
    </div>`);
}
window.pmMarkUtilityPaid = pmMarkUtilityPaid;
async function pmSaveUtilityPaid(id) {
  const amount = +document.getElementById('pm-ut-amount').value || null;
  const date = document.getElementById('pm-ut-date').value || null;
  const fileEl = document.getElementById('pm-ut-file'); const statusEl = document.getElementById('pm-ut-status');
  if (!date) return alert('La fecha es obligatoria.');
  let proof_url = null;
  const file = fileEl?.files?.[0];
  if (file) { if (statusEl) statusEl.textContent = 'Subiendo…'; const up = await pmUploadFile('invoices', 'utility-'+id, file); if (up.url) proof_url = up.url; else if (statusEl) statusEl.textContent = '⚠️ ' + up.error; }
  const payload = { last_paid_date: date, last_paid_amount: amount };
  if (proof_url) payload.proof_url = proof_url;
  const r = await pmExecQuery(sb.from('pm_utilities').update(payload).eq('id', id).select(), 'Marcar utility pagado');
  if (!r) return;
  await pmAfterCrud();
}
window.pmSaveUtilityPaid = pmSaveUtilityPaid;
async function pmEditUtility(id) {
  const u = id ? (pmaState.utilities||[]).find(x => x.id == id) : { status: 'active', billing_day: 1, cutoff_day: 20 };
  const isNew = !id;
  openModal((isNew?'+ Nuevo':'✏️ Editar')+' Servicio (utility)', `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Casa</label><select id="pm-uy-prop" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"><option value="">—</option>${pmaState.properties.map(p=>`<option value="${p.id}" ${u.property_id===p.id?'selected':''}>${(p.name||'').replace(/</g,'&lt;')}</option>`).join('')}</select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Servicio *</label><input id="pm-uy-name" value="${(u.service_name||'').replace(/"/g,'&quot;')}" placeholder="Spectrum / Texas Gas…" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Cuenta</label><input id="pm-uy-acct" value="${(u.account_number||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Monto $</label><input id="pm-uy-amount" type="number" value="${u.monthly_amount||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Día corte</label><input id="pm-uy-cutoff" type="number" value="${u.cutoff_day||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${!isNew?`<button onclick="pmDeleteUtility('${id}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded">🗑</button>`:''}
        <button onclick="pmSaveUtility('${id||''}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded" style="border:1px solid #d4af37">${isNew?'Crear':'Guardar'}</button>
      </div>
    </div>`);
}
window.pmEditUtility = pmEditUtility;
async function pmSaveUtility(id) {
  const payload = {
    property_id: document.getElementById('pm-uy-prop').value || null,
    service_name: document.getElementById('pm-uy-name').value.trim(),
    account_number: document.getElementById('pm-uy-acct').value.trim() || null,
    monthly_amount: +document.getElementById('pm-uy-amount').value || null,
    cutoff_day: +document.getElementById('pm-uy-cutoff').value || null
  };
  if (!payload.service_name) return alert('El servicio es obligatorio.');
  const r = id ? await pmExecQuery(sb.from('pm_utilities').update(payload).eq('id', id).select(), 'Update utility')
              : await pmExecQuery(sb.from('pm_utilities').insert(payload).select(), 'Crear utility');
  if (!r) return; await pmAfterCrud();
}
window.pmSaveUtility = pmSaveUtility;
async function pmDeleteUtility(id) {
  if (!confirm('¿Eliminar este servicio?')) return;
  const r = await pmExecQuery(sb.from('pm_utilities').delete().eq('id', id), 'Eliminar utility');
  if (!r) return; await pmAfterCrud();
}
window.pmDeleteUtility = pmDeleteUtility;

// ── Sub-tab: Alertas de Datos (pm_data_warnings) ──
const PM_WARN_META = {
  contrato_vencido_activo: { label: 'Contrato vencido marcado Activo', icon: '🔴', table: 'tblzz3fokkBprEpIm' },
  ocupada_sin_inquilino:   { label: 'Unidad Ocupada sin inquilino',     icon: '🟠', table: 'tblisRfa2IW02ltCL' },
  pago_link_faltante:      { label: 'Pago sin vínculo (Casa/Inquilino)',icon: '💸', table: 'tbl5p63dUEhrzgHVJ' },
  pago_sin_casa:           { label: 'Pago sin casa válida',             icon: '💸', table: 'tbl5p63dUEhrzgHVJ' },
  reserva_sin_casa:        { label: 'Reserva sin casa enlazada',        icon: '🏚️', table: 'tblzz3fokkBprEpIm' },
  unidad_sin_casa:         { label: 'Unidad sin casa enlazada',         icon: '🚪', table: 'tblItO7iMZT9QS87y' },
  reserva_sin_fecha:       { label: 'Reserva sin Fecha de Entrada',     icon: '📅', table: 'tblzz3fokkBprEpIm' },
  booking_sin_tenant:      { label: 'Reserva sin inquilino enlazado',   icon: '👤', table: 'tblzz3fokkBprEpIm' },
  inquilino_sin_fecha_fin: { label: 'Inquilino activo sin Fecha Fin',   icon: '📅', table: 'tblXuFC9azHTZGjmE' },
  direccion_no_matchea:    { label: 'Dirección no matchea entre tablas',icon: '🏠', table: 'tblXuFC9azHTZGjmE' },
  gasto_sin_casa:          { label: 'Gasto sin casa',                   icon: '🧾', table: 'tblGBQ5xn9Zp6YrTN' },
  fechas_invertidas:       { label: 'check_in posterior a check_out',   icon: '🔀', table: 'tblzz3fokkBprEpIm' },
  renta_cero:              { label: 'Renta = 0',                        icon: '0️⃣', table: 'tblisRfa2IW02ltCL' },
  inquilino_duplicado:     { label: 'Inquilino duplicado (solapado)',   icon: '👥', table: 'tblzz3fokkBprEpIm' }
};
function pmWarnMeta(t) { return PM_WARN_META[t] || { label: t, icon: '⚠️', table: null }; }
function pmRenderDataWarnings() {
  const warns = pmaState.dataWarnings || [];
  const byType = {};
  warns.forEach(w => { (byType[w.warning_type] = byType[w.warning_type] || []).push(w); });
  const types = Object.keys(byType).sort((a,b) => byType[b].length - byType[a].length);
  return `
  <div class="space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <div class="text-sm font-bold text-slate-900">Alertas de Datos · ${warns.length} sin resolver</div>
        <div class="text-xs text-slate-500">Inconsistencias detectadas en la última sync de Airtable</div>
      </div>
      <button onclick="pmRunAlertChecks && pmOpenAirtableImport && pmOpenAirtableImport()" class="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold px-3 py-1.5 rounded">🔄 Re-sync</button>
    </div>
    ${warns.length ? types.map(t => { const meta = pmWarnMeta(t); const items = byType[t]; return `
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="px-3 py-2 bg-slate-50 flex items-center justify-between"><span class="text-[11px] font-bold text-slate-700">${meta.icon} ${meta.label}</span><span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">${items.length}</span></div>
        <div class="divide-y divide-slate-100">${items.map(w => {
          const d = w.details || {};
          const desc = Object.entries(d).filter(([,v])=>v!=null&&v!=='').map(([k,v])=>`${k.replace(/_/g,' ')}: <strong>${String(v).replace(/</g,'&lt;').slice(0,30)}</strong>`).join(' · ');
          const recM = (w.entity_id||'').match(/rec[A-Za-z0-9]{10,}/);
          const atUrl = (meta.table && recM) ? `https://airtable.com/${PM_AIRTABLE_BASE}/${meta.table}/${recM[0]}` : null;
          return `<div class="px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
            <div class="text-[11px] text-slate-600 min-w-0">${desc||w.entity_id||''}${w.property_id?` <span class="text-slate-400">· ${pmPropertyName(w.property_id).slice(0,16)}</span>`:''}</div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              ${atUrl?`<a href="${atUrl}" target="_blank" class="text-[10px] text-blue-600 hover:underline">Airtable ↗</a>`:''}
              <button onclick="pmResolveWarning('${w.id}')" class="text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded">✓ Resuelto</button>
            </div>
          </div>`;
        }).join('')}</div>
      </div>`; }).join('')
      : '<div class="text-center py-10 text-emerald-600 text-sm">✓ Sin inconsistencias de datos. ¡Airtable está limpio!</div>'}
  </div>`;
}
async function pmResolveWarning(id) {
  const r = await pmExecQuery(sb.from('pm_data_warnings').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', id).select(), 'Resolver alerta de datos');
  if (!r) return;
  pmaState.dataWarnings = (pmaState.dataWarnings||[]).filter(w => String(w.id) !== String(id));
  pmRender();
}
window.pmResolveWarning = pmResolveWarning;

// ── Sub-tab B: Servicios automáticos ──
function pmRenderServices() {
  const services = (pmaState.credentials||[]).filter(c => c.category === 'servicio' || c.auto_pay);
  const byProp = {};
  services.forEach(s => { const k = s.property_id || '_none'; (byProp[k] = byProp[k]||[]).push(s); });
  const failed = services.filter(s => s.payment_failed);
  const today = new Date().toISOString().slice(0,10);

  return `
  <div class="space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="text-sm font-bold text-slate-900">Servicios automáticos · ${services.length}</div>
      <button onclick="pmEditService(null)" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg" style="border:1px solid #d4af37">+ Servicio</button>
    </div>
    ${failed.length ? `<div class="bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-800"><strong>⚠️ ${failed.length} servicio(s) con pago fallido:</strong> ${failed.map(s=>(s.name||'').replace(/</g,'&lt;')).join(', ')} — revisar.</div>` : ''}
    ${Object.keys(byProp).length ? Object.entries(byProp).map(([pid, list]) => `
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-50">🏠 ${pid==='_none'?'Sin casa asignada':pmPropertyName(pid).replace(/</g,'&lt;')}</div>
        <div class="divide-y divide-slate-100">
          ${list.map(s => {
            const due = s.next_payment_date;
            const soon = due && due >= today;
            return `<div class="px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-slate-800">${(s.name||'—').replace(/</g,'&lt;')}
                  ${s.auto_pay?'<span class="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold ml-1">AUTO</span>':''}
                  ${s.payment_failed?'<span class="text-[9px] bg-red-100 text-red-800 px-1 py-0.5 rounded font-bold ml-1">FALLÓ</span>':''}
                </div>
                <div class="text-[11px] text-slate-500">${due?`Próximo pago: ${due}`:'sin fecha de pago'}${s.amount?` · $${Number(s.amount).toLocaleString()}`:''}</div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <button onclick="pmToggleServiceFailed('${s.id}',${!s.payment_failed})" class="text-[10px] font-bold px-2 py-1 rounded ${s.payment_failed?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}">${s.payment_failed?'Marcar OK':'Marcar fallo'}</button>
                <button onclick="pmEditService('${s.id}')" class="text-slate-400 hover:text-slate-700 p-1">✏️</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('') : `<div class="text-xs text-slate-500 px-3 py-8 text-center bg-slate-50 rounded-lg">
        <div class="font-bold text-slate-700 mb-1">Sin servicios automáticos todavía</div>
        Esta vista lee la tabla <b>🔑 Accesos</b> de Airtable filtrando <b>Categoría = «servicio»</b> — hoy ningún acceso está marcado así.<br/>
        Para que aparezcan: en Airtable → 🔑 Accesos, poné Categoría «servicio» a los accesos de luz/agua/internet/etc. (el sync los trae solo), o agregá uno acá con «+ Servicio».
      </div>`}
  </div>`;
}

async function pmToggleServiceFailed(id, failed) {
  const r = await pmExecQuery(sb.from('pm_credentials').update({ payment_failed: failed }).eq('id', id).select(), 'Actualizar servicio');
  if (!r) return;
  const s = (pmaState.credentials||[]).find(x => x.id === id); if (s) s.payment_failed = failed;
  pmRender();
}
window.pmToggleServiceFailed = pmToggleServiceFailed;

async function pmEditService(id) {
  const s = id ? (pmaState.credentials||[]).find(x => x.id === id) : { category: 'servicio', auto_pay: true };
  const isNew = !id;
  openModal((isNew?'+ Nuevo':'✏️ Editar')+' Servicio', `
    <div class="space-y-3">
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Nombre *</label>
        <input id="pm-sv-name" value="${(s.name||'').replace(/"/g,'&quot;')}" placeholder="Spectrum / Texas Gas / Coa…" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Casa</label>
        <select id="pm-sv-prop" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
          <option value="">— Ninguna —</option>
          ${pmaState.properties.map(p=>`<option value="${p.id}" ${s.property_id===p.id?'selected':''}>${(p.name||'').replace(/</g,'&lt;')}</option>`).join('')}
        </select></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Próximo pago</label>
          <input id="pm-sv-date" type="date" value="${s.next_payment_date||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Monto $</label>
          <input id="pm-sv-amount" type="number" step="0.01" value="${s.amount||''}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      </div>
      <div class="flex gap-4">
        <label class="flex items-center gap-2 text-sm font-bold text-slate-700"><input id="pm-sv-auto" type="checkbox" ${s.auto_pay?'checked':''}/> Pago automático</label>
        <label class="flex items-center gap-2 text-sm font-bold text-slate-700"><input id="pm-sv-failed" type="checkbox" ${s.payment_failed?'checked':''}/> Pago falló</label>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="pmSaveService('${id||''}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded" style="border:1px solid #d4af37">${isNew?'Crear':'Guardar'}</button>
      </div>
    </div>`);
}
window.pmEditService = pmEditService;

async function pmSaveService(id) {
  const payload = {
    name: document.getElementById('pm-sv-name').value.trim(),
    category: 'servicio',
    property_id: document.getElementById('pm-sv-prop').value || null,
    next_payment_date: document.getElementById('pm-sv-date').value || null,
    amount: +document.getElementById('pm-sv-amount').value || null,
    auto_pay: document.getElementById('pm-sv-auto').checked,
    payment_failed: document.getElementById('pm-sv-failed').checked
  };
  if (!payload.name) return alert('El nombre es obligatorio.');
  const r = id
    ? await pmExecQuery(sb.from('pm_credentials').update(payload).eq('id', id).select(), 'Update servicio')
    : await pmExecQuery(sb.from('pm_credentials').insert(payload).select(), 'Crear servicio');
  if (!r) return;
  await pmAfterCrud();
}
window.pmSaveService = pmSaveService;

// ── Sub-tab C: Centro de comunicación ──
function pmCommsFill(body, tenant) {
  const b = tenant ? pmActiveBookingOfTenant(tenant.id) : null;
  const prop = b ? pmaState.properties.find(p => p.id === b.property_id) : null;
  const map = {
    tenant_name: tenant?.full_name || '',
    property_address: prop ? (prop.address || prop.name || '') : '',
    amount: b ? Number(b.rent_amount||0).toLocaleString() : '',
    due_date: '', start_date: b?.start_date || '', end_date: b?.end_date || '',
    visit_date: '', reason: ''
  };
  return (body||'').replace(/\{\{(\w+)\}\}/g, (m, k) => (k in map && map[k]) ? map[k] : m);
}

function pmRenderComms() {
  const tpls = pmaState.templates || [];
  const selKey = pmaState.commsTemplateKey || (tpls[0]?.key) || null;
  const tpl = tpls.find(t => t.key === selKey) || null;
  const tenant = pmaState.commsTenantId ? pmaState.tenants.find(t => t.id === pmaState.commsTenantId) : null;
  const rendered = pmaState.commsCustomText != null ? pmaState.commsCustomText : (tpl ? pmCommsFill(tpl.body, tenant) : '');

  return `
  <div class="grid lg:grid-cols-3 gap-3">
    <!-- Plantillas -->
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="px-3 py-2 flex items-center justify-between" style="background:#1e293b">
        <span class="text-xs font-bold text-white">Plantillas</span>
        <button onclick="pmEditTemplate(null)" class="text-[10px] font-bold" style="color:#d4af37">+ Nueva</button>
      </div>
      <div class="divide-y divide-slate-100">
        ${tpls.length ? tpls.map(t => `
          <div class="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer ${selKey===t.key?'bg-amber-50':''}" onclick="pmaState.commsTemplateKey='${t.key}';pmaState.commsCustomText=null;pmRender()">
            <div class="min-w-0"><div class="text-sm font-semibold text-slate-800 truncate">${(t.name||'').replace(/</g,'&lt;')}</div>
            <div class="text-[10px] text-slate-400">${(t.category||'').replace(/</g,'&lt;')}</div></div>
            <button onclick="event.stopPropagation();pmEditTemplate('${t.key}')" class="text-slate-300 hover:text-slate-600 text-xs">✏️</button>
          </div>`).join('') : '<div class="px-3 py-6 text-center text-xs text-slate-400 italic">Sin plantillas. Corré pm-operations-alerts.sql para sembrarlas.</div>'}
      </div>
    </div>

    <!-- Composer -->
    <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Inquilino</label>
          <select onchange="pmaState.commsTenantId=this.value||null;pmaState.commsCustomText=null;pmRender()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            <option value="">— Elegir inquilino —</option>
            ${pmaState.tenants.map(t => `<option value="${t.id}" ${pmaState.commsTenantId===t.id?'selected':''}>${(t.full_name||'').replace(/</g,'&lt;')}</option>`).join('')}
          </select></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Plantilla</label>
          <select onchange="pmaState.commsTemplateKey=this.value;pmaState.commsCustomText=null;pmRender()" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            ${tpls.map(t => `<option value="${t.key}" ${selKey===t.key?'selected':''}>${(t.name||'').replace(/</g,'&lt;')}</option>`).join('')}
          </select></div>
      </div>
      ${tpl?.variables?.length ? `<div class="text-[10px] text-slate-400">Variables: ${tpl.variables.map(v=>`<code class="bg-slate-100 px-1 rounded">{{${v}}}</code>`).join(' ')}</div>` : ''}
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Mensaje (editable)</label>
        <textarea id="pm-cm-text" oninput="pmaState.commsCustomText=this.value" rows="6" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">${(rendered||'').replace(/</g,'&lt;')}</textarea></div>
      ${tenant && !((tenant.phone||'').replace(/\D/g,'')) ? '<div class="text-[11px] text-amber-600">⚠️ Este inquilino no tiene teléfono cargado.</div>' : ''}
      <div class="flex gap-2">
        <button onclick="pmCommsSend()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">💬 Enviar por WhatsApp</button>
        <button onclick="pmCommsCopy()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold px-4 py-2 rounded">Copiar</button>
      </div>
    </div>
  </div>`;
}

function pmCommsText() {
  const el = document.getElementById('pm-cm-text');
  if (el) return el.value;
  const tpl = (pmaState.templates||[]).find(t => t.key === pmaState.commsTemplateKey);
  const tenant = pmaState.commsTenantId ? pmaState.tenants.find(t => t.id === pmaState.commsTenantId) : null;
  return pmaState.commsCustomText != null ? pmaState.commsCustomText : (tpl ? pmCommsFill(tpl.body, tenant) : '');
}
function pmCommsSend() {
  const tenant = pmaState.commsTenantId ? pmaState.tenants.find(t => t.id === pmaState.commsTenantId) : null;
  if (!tenant) return alert('Elegí un inquilino primero.');
  const phone = (tenant.phone||'').replace(/\D/g,'');
  if (!phone) return alert('El inquilino no tiene teléfono.');
  const text = encodeURIComponent(pmCommsText());
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}
window.pmCommsSend = pmCommsSend;
function pmCommsCopy() {
  const text = pmCommsText();
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(()=>{ if(window.toast) toast('Mensaje copiado'); else alert('Copiado'); });
  else alert(text);
}
window.pmCommsCopy = pmCommsCopy;

async function pmEditTemplate(key) {
  const t = key ? (pmaState.templates||[]).find(x => x.key === key) : { variables: [] };
  const isNew = !key;
  openModal((isNew?'+ Nueva':'✏️ Editar')+' Plantilla', `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Nombre *</label>
          <input id="pm-tp-name" value="${(t.name||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
        <div><label class="text-[10px] font-bold uppercase text-slate-600">Key ${isNew?'*':''}</label>
          <input id="pm-tp-key" value="${(t.key||'').replace(/"/g,'&quot;')}" ${isNew?'':'disabled'} placeholder="payment_reminder" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm ${isNew?'':'bg-slate-100'}"/></div>
      </div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Categoría</label>
        <input id="pm-tp-cat" value="${(t.category||'').replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/></div>
      <div><label class="text-[10px] font-bold uppercase text-slate-600">Mensaje (usá {{variables}})</label>
        <textarea id="pm-tp-body" rows="5" class="w-full border border-slate-300 rounded px-2 py-2 text-sm">${(t.body||'').replace(/</g,'&lt;')}</textarea></div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        ${!isNew?`<button onclick="pmDeleteTemplate('${key}')" class="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded">🗑</button>`:''}
        <button onclick="pmSaveTemplate('${key||''}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-2 rounded" style="border:1px solid #d4af37">${isNew?'Crear':'Guardar'}</button>
      </div>
    </div>`);
}
window.pmEditTemplate = pmEditTemplate;

async function pmSaveTemplate(key) {
  const body = document.getElementById('pm-tp-body').value;
  const vars = [...new Set((body.match(/\{\{(\w+)\}\}/g)||[]).map(s => s.replace(/[{}]/g,'')))];
  const payload = {
    name: document.getElementById('pm-tp-name').value.trim(),
    category: document.getElementById('pm-tp-cat').value.trim() || null,
    body, variables: vars
  };
  if (!payload.name || !payload.body) return alert('Nombre y mensaje son obligatorios.');
  let r;
  if (key) r = await pmExecQuery(sb.from('pm_message_templates').update(payload).eq('key', key).select(), 'Update plantilla');
  else {
    payload.key = document.getElementById('pm-tp-key').value.trim();
    if (!payload.key) return alert('La key es obligatoria.');
    r = await pmExecQuery(sb.from('pm_message_templates').insert(payload).select(), 'Crear plantilla');
  }
  if (!r) return;
  await pmAfterCrud();
}
window.pmSaveTemplate = pmSaveTemplate;

async function pmDeleteTemplate(key) {
  if (!confirm('¿Eliminar esta plantilla?')) return;
  const r = await pmExecQuery(sb.from('pm_message_templates').delete().eq('key', key), 'Eliminar plantilla');
  if (!r) return;
  await pmAfterCrud();
}
window.pmDeleteTemplate = pmDeleteTemplate;

// ── Sub-tab D: Panel de alertas ──
function pmRenderAlertsPanel() {
  const sevF = pmaState.alertSeverityFilter;
  const catF = pmaState.alertCategoryFilter;
  let rows = (pmaState.alerts||[]).filter(a => pmaState.alertShowResolved ? true : !a.resolved);
  if (sevF) rows = rows.filter(a => a.severity === sevF);
  if (catF) rows = rows.filter(a => a.category === catF);
  rows = rows.sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''));
  const cats = [...new Set((pmaState.alerts||[]).map(a => a.category).filter(Boolean))];

  const sevBtn = (k,l) => `<button onclick="pmaState.alertSeverityFilter=${k?`'${k}'`:'null'};pmRender()" class="px-2.5 py-1 rounded-full text-[10px] font-bold ${sevF===k||(!sevF&&!k)?'bg-slate-900 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}">${l}</button>`;
  const catBtn = (k,l) => `<button onclick="pmaState.alertCategoryFilter=${k?`'${k}'`:'null'};pmRender()" class="px-2.5 py-1 rounded-full text-[10px] font-bold ${catF===k||(!catF&&!k)?'bg-[#d4af37] text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}">${l}</button>`;

  return `
  <div class="space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex gap-1.5 flex-wrap">
        ${sevBtn(null,'Todas')}${sevBtn('critical','Críticas')}${sevBtn('warning','Advert.')}${sevBtn('info','Info')}
      </div>
      <div class="flex items-center gap-2">
        <button onclick="pmaState.alertShowResolved=${pmaState.alertShowResolved?'false':'true'};pmRender()" class="text-[10px] font-bold px-2.5 py-1 rounded-full ${pmaState.alertShowResolved?'bg-slate-900 text-white':'bg-slate-100 text-slate-600'}">${pmaState.alertShowResolved?'Ocultar resueltas':'Ver resueltas'}</button>
        <button onclick="pmRunAlertChecks(this)" class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100">↻ Revisar ahora</button>
      </div>
    </div>
    <div class="flex gap-1.5 flex-wrap">${catBtn(null,'Todas las categorías')}${cats.map(c=>catBtn(c,c)).join('')}</div>

    ${rows.length ? `<div class="space-y-1.5">${rows.map(a => { const s = pmAlertSev(a.severity); return `
      <div class="bg-white border border-slate-200 border-l-4 ${s.border} rounded-lg p-2.5 flex items-start gap-3 ${a.resolved?'opacity-50':''}">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[9px] uppercase font-extrabold ${s.txt} tracking-wider">${s.label}</span>
            ${a.category?`<span class="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">${a.category}</span>`:''}
            ${a.assigned_to?`<span class="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">👤 ${(a.assigned_to||'').replace(/</g,'&lt;')}</span>`:''}
            ${a.read?'':'<span class="text-[9px] bg-red-500 text-white px-1 py-0.5 rounded">nuevo</span>'}
          </div>
          <div class="text-sm text-slate-800 leading-snug mt-0.5">${(a.message||'').replace(/</g,'&lt;')}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">${(a.created_at||'').slice(0,16).replace('T',' ')}${a.property_id?` · ${pmPropertyName(a.property_id).replace(/</g,'&lt;').slice(0,20)}`:''}</div>
        </div>
        <div class="flex flex-col gap-1 flex-shrink-0">
          ${!a.resolved?`<button onclick="pmAlertResolve('${a.id}')" class="text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded whitespace-nowrap">✓ Resolver</button>` : '<span class="text-[10px] text-emerald-600 font-bold">Resuelta</span>'}
          ${!a.read?`<button onclick="pmAlertMarkRead('${a.id}')" class="text-[10px] text-slate-400 hover:text-slate-600 whitespace-nowrap">Marcar leída</button>`:''}
          <button onclick="pmAlertAssign('${a.id}')" class="text-[10px] text-slate-400 hover:text-slate-600 whitespace-nowrap">Asignar</button>
        </div>
      </div>`; }).join('')}</div>`
      : '<div class="text-xs text-slate-400 italic px-3 py-10 text-center bg-slate-50 rounded-lg">Sin alertas con estos filtros. Usá «↻ Revisar ahora» para generarlas.</div>'}
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// 📡 TAB 5 · FEEDS (calendarios iCal externos)
// ════════════════════════════════════════════════════════════════
function pmRenderFeeds() {
  // Detectar si la tabla pm_calendar_feeds no existe todavía
  const tableMissing = (pmaState.loadWarnings || []).some(w => /pm_calendar_feeds|feeds/.test(w));
  if (tableMissing) {
    return `
      <div class="space-y-3 p-1">
        <div class="bg-amber-50 border-2 border-amber-300 rounded-xl p-6">
          <div class="flex items-start gap-3">
            <span class="text-3xl">⚠️</span>
            <div class="flex-1">
              <div class="font-bold text-amber-900 mb-1">Falta crear la tabla de feeds en Supabase</div>
              <div class="text-sm text-amber-800 mb-3">Para usar la sincronización con calendarios externos (Airbnb, VRBO, Booking) tenés que correr el schema SQL primero.</div>
              <div class="bg-white border border-amber-200 rounded p-3 text-xs font-mono text-slate-700 mb-3">
                supabase/pm-calendar-feeds-schema.sql
              </div>
              <div class="text-xs text-amber-700 mb-2"><strong>Pasos:</strong></div>
              <ol class="text-xs text-amber-800 list-decimal ml-5 space-y-1">
                <li>Abrí Supabase Dashboard → SQL Editor</li>
                <li>Copiá y pegá el contenido del archivo <code>pm-calendar-feeds-schema.sql</code></li>
                <li>Click <strong>Run</strong></li>
                <li>Volvé acá y refrescá el módulo</li>
              </ol>
              <button onclick="pmLoadAll()" class="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded">🔄 Reintentar (ya corrí el SQL)</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

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
          <span>Sincronización automática</span>
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
  openModal('🔄 Sincronizar con Airtable', `
    <div class="space-y-3 text-sm">
      <div class="text-slate-600">
        Trae propiedades, unidades, inquilinos, reservas, pagos, gastos, accesos y tareas desde Airtable.
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900">
        ⚠️ Primera sync: 30-90 segundos. <strong>No cierres la ventana.</strong>
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
  // El Airtable PAT vive server-side (AIRTABLE_API_KEY). El usuario NO pega token.
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
      body: JSON.stringify({ dry_run: !!dryRun })   // token/base se leen del env server-side
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
          <div class="bg-red-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-red-700">Gastos</div><div class="text-xl font-bold text-red-700">${(stats.expenses_house||0)+(stats.expenses_operational||0)+(stats.expenses_cleaning||0)}</div></div>
          <div class="bg-amber-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-amber-700">Nómina</div><div class="text-xl font-bold text-amber-700">${stats.payroll||0}</div></div>
          <div class="bg-slate-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-slate-500">Accesos</div><div class="text-xl font-bold">${stats.credentials||0}</div></div>
          <div class="bg-slate-50 rounded p-2"><div class="text-[9px] uppercase font-bold text-slate-500">WiFi</div><div class="text-xl font-bold">${stats.wifi||0}</div></div>
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
  // GUARD: address debe ser el formato completo literal "Calle, Ciudad, TX ZIP" (con coma).
  // La fuente oficial de propiedades es "Datos x Casa"; este import manual NO debe crear
  // versiones cortas/transformadas que dupliquen filas.
  const sinFormato = payload.filter(p => !p.address || !String(p.address).includes(','));
  if (sinFormato.length) return alert(`❌ ${sinFormato.length} dirección(es) sin formato completo (falta coma "Calle, Ciudad, TX ZIP"):\n\n` +
    sinFormato.slice(0,8).map(p => '• ' + (p.address || '(vacía)')).join('\n') +
    '\n\nLa dirección debe ser LITERAL e idéntica a "Datos x Casa".Dirección. Corregí el JSON.');
  if (!confirm(`Se van a crear ${payload.length} propiedades. ¿Continuar?`)) return;
  try {
    await sb.from('pm_properties').insert(payload);
    closeModal();
    await pmLoadAll();
    alert('✅ Importadas ' + payload.length + ' propiedades.');
  } catch (e) { alert('Error: ' + e.message); }
}
window.pmImportFromJSON = pmImportFromJSON;

// ════════════════════════════════════════════════════════════════
// 📖 MODO SOLO-LECTURA (2026-06-30)
// La fuente de verdad es Airtable (apptTKRYbx6gu701i). La app NO escribe
// en datos espejados desde Airtable: propiedades, unidades, inquilinos,
// reservas, pagos, gastos, servicios/credenciales y feeds. Escribir ahí
// desincroniza (y "+ Nueva Propiedad" además rompía el check constraint
// pm_properties_rental_model_check). La app SÍ opera su capa propia:
// tareas (turnover/recepción) y alertas/warnings — esas no viven en Airtable.
// ════════════════════════════════════════════════════════════════
const PM_READONLY = true;
window.PM_READONLY = PM_READONLY;

// Funciones de escritura a datos-Airtable que quedan inhabilitadas.
const PM_RO_BLOCKED_FNS = [
  'pmEditProperty','pmDeleteProperty','pmSaveProperty','pmImportFromJSON',
  'pmEditUnit','pmDeleteUnit','pmSaveUnit','pmMarkMaintenance','pmToggleUnitActive',
  'pmEditBooking','pmDeleteBooking','pmSaveBooking','pmCreateBookingFromDay',
  'pmMoveBooking','pmConfirmMoveBooking','pmCeoRenew',
  'pmEditTenant','pmDeleteTenant','pmSaveTenant','pmAddTenantNote','pmQuickAddTenant',
  'pmMarkPayment','pmSaveMarkPayment','pmEditPayment','pmDeletePayment','pmSavePayment','pmArchivePaymentLegacy','pmPickLeaseForPayment',
  'pmEditExpense','pmDeleteExpense','pmSaveExpense','pmToggleExpensePaid',
  'pmPayrollMarkPaid','pmGeneratePayroll',
  'pmEditService','pmSaveService','pmEditUtility','pmSaveUtility','pmDeleteUtility','pmMarkUtilityPaid','pmSaveUtilityPaid','pmSetServicePaymentFailed','pmToggleServiceFailed',
  'pmEditFeed','pmDeleteFeed','pmSaveFeed','pmSyncFeed','pmSyncAllFeeds',
  'pmEditTemplate','pmDeleteTemplate','pmSaveTemplate'
];

function pmReadOnlyNotice() {
  if (window.toast) toast('📖 Solo lectura: cargá o editá estos datos en Airtable (fuente de verdad). La app solo muestra y reporta.', 'info', { duration: 4500 });
  return undefined;
}
window.pmReadOnlyNotice = pmReadOnlyNotice;

if (PM_READONLY) {
  // Sobrescribe el binding global de cada fn de escritura → tanto onclick inline
  // como llamadas directas resuelven al guard (no-op + aviso). Defensa de fondo:
  // aunque un botón quedara visible, no escribe nada.
  PM_RO_BLOCKED_FNS.forEach(fn => { try { window[fn] = pmReadOnlyNotice; } catch (e) {} });
}

// Barrido post-render: oculta los <button> de escritura (los que invocan una fn
// bloqueada). Se limita a <button> para no romper celdas clickeables del calendario.
const PM_RO_BTN_RE = new RegExp('\\b(' + PM_RO_BLOCKED_FNS.join('|') + ')\\s*\\(');
function pmApplyReadOnlyDOM() {
  if (!PM_READONLY) return;
  const root = document.getElementById('pm-root');
  if (!root) return;
  root.querySelectorAll('button[onclick]').forEach(btn => {
    if (!PM_RO_BTN_RE.test(btn.getAttribute('onclick') || '')) return;
    const txt = (btn.textContent || '').replace(/\s+/g, ' ').trim();
    // Botón de ACCIÓN puro (chico, sin info) → ocultar. Botón que MUESTRA info
    // (ej. chip de reserva con inquilino/fechas) → neutralizar pero dejar visible.
    const showsInfo = !!btn.querySelector('br') || txt.length > 24;
    if (showsInfo) {
      btn.removeAttribute('onclick');
      btn.style.cursor = 'default';
      btn.classList.remove('hover:shadow-sm', 'hover:bg-slate-50', 'hover:bg-slate-100', 'hover:bg-emerald-100', 'hover:bg-amber-100');
    } else {
      btn.style.display = 'none';
    }
  });
}
window.pmApplyReadOnlyDOM = pmApplyReadOnlyDOM;

// Hook al render: corre el barrido después de cada pmRender (re-oculta tras re-render).
if (typeof window.pmRender === 'function' && !window.__pmRenderRO) {
  window.__pmRenderRO = true;
  const _pmRenderOrig = window.pmRender;
  window.pmRender = function () {
    const r = _pmRenderOrig.apply(this, arguments);
    try { pmApplyReadOnlyDOM(); } catch (e) {}
    return r;
  };
}

// ════════════════════════════════════════════════════════════════
// 📄 REPORTES + GUÍA DE BIENVENIDA (PDF chromium vía /api/*)
// La app es solo-lectura: estos endpoints solo LEEN y renderizan PDF.
// Auth: JWT del usuario logueado (Supabase) en Authorization: Bearer.
// ════════════════════════════════════════════════════════════════
async function pmAuthToken() {
  try {
    const client = (typeof sb !== 'undefined' && sb) ? sb : window.sb;
    const s = await client.auth.getSession();
    return s?.data?.session?.access_token || null;
  } catch (e) { return null; }
}

// Genera el PDF con el CHROME del usuario (chromium real): pide el HTML al endpoint
// (auth con JWT del usuario) y lo abre en una ventana que dispara "Guardar como PDF".
// Confiable y sin depender de chromium serverless.
async function pmPrintReportHTML(path, params, okMsg) {
  const token = await pmAuthToken();
  if (!token) { toast('Iniciá sesión para generar el PDF.', 'error'); return; }
  const qs = new URLSearchParams({ ...params, format: 'html' }).toString();
  toast('⏳ Generando…', 'info');
  let html;
  try {
    const r = await fetch(`/api/${path}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { let m = r.status; try { m = (await r.json()).error || m; } catch (e) {} return toast('Error: ' + m, 'error'); }
    html = await r.text();
  } catch (e) { return toast('Error: ' + e.message, 'error'); }
  // Inyecta auto-print (Guardar como PDF) antes de cerrar el body.
  const autoPrint = "<scr" + "ipt>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print();},400)});</scr" + "ipt>";
  const printable = html.includes('</body>') ? html.replace('</body>', autoPrint + '</body>') : html + autoPrint;
  const w = window.open('', '_blank');
  if (!w) return toast('Permití las ventanas emergentes (popups) para generar el PDF.', 'error');
  w.document.open(); w.document.write(printable); w.document.close();
  toast(okMsg || '✅ Usá "Guardar como PDF" en el diálogo de impresión', 'success', { duration: 5000 });
}

async function pmOpenReport(type) {
  await pmPrintReportHTML('pm-report', { type }, '✅ Reporte ' + (type === 'monthly' ? 'mensual' : 'semanal') + ' — Guardar como PDF');
}
window.pmOpenReport = pmOpenReport;

// Compartir por correo/WhatsApp con enlaces YA armados (mailto: / wa.me). NO envía
// solo: abre el cliente con el texto listo para que el usuario le dé enviar a mano.
function pmShareOpen(channel, subject, body, phone) {
  const text = subject + '\n\n' + body;
  if (channel === 'email') {
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  } else {
    const ph = (phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${ph}?text=${encodeURIComponent(text)}`, '_blank');
  }
}
async function pmShareChannel() {
  const ch = await promptDialog('¿Compartir por correo o WhatsApp? (escribí "correo" o "whatsapp")', { defaultValue: 'whatsapp' });
  if (!ch) return null;
  return /mail|correo|email/i.test(ch) ? 'email' : 'whatsapp';
}

async function pmSendReport(type) {
  const channel = await pmShareChannel();
  if (!channel) return;
  const isMonthly = type === 'monthly';
  const subject = `Rental Profits — Reporte ${isMonthly ? 'mensual (finanzas)' : 'semanal (operación)'}`;
  const body = `Hola, te comparto el reporte ${isMonthly ? 'mensual de finanzas' : 'semanal de operación'} de Rental Profits.\n\nGeneralo en PDF con el botón "Generar ${isMonthly ? 'mensual' : 'semanal'}" y adjuntalo.`;
  pmShareOpen(channel, subject, body);
  toast('Abrí ' + (channel === 'email' ? 'el correo' : 'WhatsApp') + ' con el mensaje listo. Adjuntá el PDF y enviá.', 'info', { duration: 5000 });
}
window.pmSendReport = pmSendReport;

async function pmGenerateWelcomeGuide(propertyId, unitId) {
  const params = { property_id: propertyId };
  if (unitId) params.unit_id = unitId;
  await pmPrintReportHTML('pm-welcome-guide', params, '✅ Guía de Bienvenida — Guardar como PDF');
}
window.pmGenerateWelcomeGuide = pmGenerateWelcomeGuide;

// Compartir la guía de check-in con los datos (dirección + WiFi + acceso) ya en el mensaje.
async function pmSendWelcomeGuide(propertyId, unitId) {
  const channel = await pmShareChannel();
  if (!channel) return;
  const p = pmaState.properties.find(x => x.id === propertyId);
  if (!p) return toast('Casa no encontrada.', 'error');
  // Teléfono del inquilino actual (si hay reserva activa en la casa).
  const bk = pmaState.bookings.find(b => b.property_id === propertyId && ['activo','confirmado','reservada'].includes(b.status));
  const tenant = bk ? pmaState.tenants.find(t => t.id === bk.tenant_id) : null;
  const unit = unitId ? pmaState.units.find(u => u.id === unitId) : null;
  const acc = p.access_code || (unit && unit.access_codes) || '(ver guía)';
  const subject = `Bienvenido/a — ${p.address || p.name}`;
  const body = [
    `¡Hola${tenant ? ' ' + (tenant.full_name || '') : ''}! Te compartimos tu info de check-in:`,
    ``,
    `🏠 Dirección: ${p.address || p.name}`,
    `📶 WiFi: ${p.wifi_name || '—'}  ·  Clave: ${p.wifi_pass || '—'}`,
    `🔑 Código de acceso: ${acc}`,
    ``,
    `Check-in desde las 3:00 PM. Cualquier cosa, escribinos. ¡Bienvenido/a!`,
  ].join('\n');
  pmShareOpen(channel, subject, body, tenant?.phone);
  toast('Abrí ' + (channel === 'email' ? 'el correo' : 'WhatsApp') + ' con la guía lista para enviar.', 'success', { duration: 5000 });
}
window.pmSendWelcomeGuide = pmSendWelcomeGuide;
