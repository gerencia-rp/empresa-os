// ════════════════════════════════════════════════════════════════
// Datos de los reportes PM (semanal · operación / mensual · finanzas).
// Lee de Supabase (PostgREST) con la service key. Funciona en Node (Vercel
// Functions) y en scripts locales (Node 18+ trae fetch global).
//
// Fuente de verdad: Airtable → pm_* (espejo). Acá solo LEEMOS y agregamos.
// ════════════════════════════════════════════════════════════════

const DEFAULT_URL = "https://nezbaljfhhyznhltpjnk.supabase.co";
// Anon key PÚBLICA (misma que config.public.js). Segura de exponer: la seguridad la
// da RLS. Permite que los endpoints de usuario lean pm_* con el JWT del usuario
// SIN depender de SUPABASE_SERVICE_ROLE_KEY (que puede no estar seteada en Vercel).
export const PUBLIC_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lemJhbGpmaGh5em5obHRwam5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDA2MTgsImV4cCI6MjA5NDExNjYxOH0.bfCAuX5CZhyHDHkbbLewfrKayfzP6ZsH9JuqcAn8AUU";

export function supabaseUrl(env = process.env) {
  return (env.SUPABASE_URL || DEFAULT_URL).replace(/\/$/, "");
}

// Config server (cron): service key como apikey + bearer (lee sin RLS). Lanza si falta.
export function reportConfig(env = process.env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SB_SECRET || "";
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return { supabaseUrl: supabaseUrl(env), apikey: key, bearer: key };
}

// Config usuario (botón en la app): anon key como apikey + JWT del usuario como bearer
// → lee pm_* respetando RLS, igual que el navegador. No necesita service key.
export function reportConfigUser(userJWT, env = process.env) {
  return { supabaseUrl: supabaseUrl(env), apikey: env.SUPABASE_ANON_KEY || PUBLIC_ANON_KEY, bearer: userJWT };
}

async function rest(cfg, path) {
  const r = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: cfg.apikey, Authorization: `Bearer ${cfg.bearer}` },
  });
  if (!r.ok) throw new Error(`REST ${path} → ${r.status} ${await r.text()}`);
  return r.json();
}

// ─── Helpers de fecha/mes ───────────────────────────────────────────
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
export function monthBounds(year, month1to12) {
  const m = String(month1to12).padStart(2, "0");
  const last = new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
  return { from: `${year}-${m}-01`, to: `${year}-${m}-${String(last).padStart(2, "0")}`, label: `${MESES[month1to12-1]} ${year}` };
}
export function prevMonth(d = new Date()) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth(); // 0..11 (mes actual)
  return m === 0 ? { year: y - 1, month: 12 } : { year: y, month: m }; // mes anterior (1..12)
}

// ─── Mapa Tipo de Gasto (subcategory) → bucket del reporte ──────────
export function expenseBucket(subcategory) {
  const s = (subcategory || "").toLowerCase();
  if (/hipotec/.test(s)) return "hipoteca";
  if (/servicio|público|publico|utilit/.test(s)) return "servicios";
  if (/aseo|podada|mantenim|jard|limpiez/.test(s)) return "mantenimiento";
  if (/nómina|nomina|equipo|sueldo|salario/.test(s)) return "nomina";
  if (/plataforma/.test(s)) return "plataforma";
  return "otro";
}
export const BUCKET_LABELS = {
  hipoteca: "🏦 Hipoteca", servicios: "💡 Servicios públicos", mantenimiento: "🔧 Mantenimiento",
  nomina: "👥 Nómina / Equipo", plataforma: "🌐 Plataformas", otro: "📦 Otros",
};

const money = (n) => Math.round((n || 0) * 100) / 100;

// ════════════════════════════════════════════════════════════════
// SEMANAL · operación
// ════════════════════════════════════════════════════════════════
export async function fetchWeeklyData(cfg, now = new Date()) {
  const [units, props, alerts] = await Promise.all([
    rest(cfg, "pm_units?select=property_id,status,name,code,target_rent,unit_type&is_active=eq.true"),
    rest(cfg, "pm_properties?select=id,name,total_units&active=eq.true"),
    rest(cfg, "pm_alerts?select=severity,category,message,property_id,created_at&resolved=eq.false&order=created_at.desc"),
  ]);
  const nameById = Object.fromEntries(props.map((p) => [p.id, p.name]));
  const totalUnitsById = Object.fromEntries(props.map((p) => [p.id, p.total_units]));

  const isOcc = (s) => /ocupad/i.test(s || "");
  const isRes = (s) => /reservad/i.test(s || "");
  const INDEP = ["casa_completa", "apartamento", "estudio"];

  // REGLA DE UNIDADES (igual que el front): casa=1, estudio=1, apto=1, y TODAS las
  // habitaciones de la casa juntas=1. Ocupación con la misma definición.
  const byProp = {};
  for (const u of units) {
    const pid = u.property_id || "—";
    (byProp[pid] ||= { id: pid, name: nameById[pid] || "Sin casa", indep: [], rooms: [] });
    if (u.unit_type === "habitacion") byProp[pid].rooms.push(u);
    else if (INDEP.includes(u.unit_type)) byProp[pid].indep.push(u);
    else byProp[pid].indep.push(u); // tipo desconocido → cuenta como independiente
  }
  const houses = Object.values(byProp).map((b) => {
    const indepTotal = b.indep.length;
    const hasRooms = b.rooms.length > 0 ? 1 : 0;
    let total = indepTotal + hasRooms;
    if (!total) total = Math.max(1, parseInt(totalUnitsById[b.id]) || 1);
    const indepOcc = b.indep.filter((u) => isOcc(u.status)).length;
    const roomsOcc = hasRooms && b.rooms.some((u) => isOcc(u.status)) ? 1 : 0;
    const occ = Math.min(indepOcc + roomsOcc, total);
    const indepRes = b.indep.filter((u) => isRes(u.status) && !isOcc(u.status)).length;
    const roomsRes = (hasRooms && !b.rooms.some((u) => isOcc(u.status)) && b.rooms.some((u) => isRes(u.status))) ? 1 : 0;
    const res = indepRes + roomsRes;
    const free = Math.max(0, total - occ - res);
    // Lista de libres (independientes libres + "Habitaciones" si el grupo está libre)
    const freeUnits = b.indep.filter((u) => !isOcc(u.status) && !isRes(u.status)).map((u) => u.name || u.code || "Unidad");
    if (hasRooms && !roomsOcc && !roomsRes) freeUnits.push(b.rooms.length > 1 ? `Habitaciones (${b.rooms.length})` : "Habitación");
    return { id: b.id, name: b.name, total, occ, res, free, freeUnits, pct: total ? Math.round(((occ + res) / total) * 100) : 0 };
  });

  const total = houses.reduce((s, h) => s + h.total, 0);
  const occupied = houses.reduce((s, h) => s + h.occ, 0);
  const reserved = houses.reduce((s, h) => s + h.res, 0);
  const free = houses.reduce((s, h) => s + h.free, 0);
  // Ocupación = ocupadas / total rentable (un solo número en toda la app). Reservadas aparte.
  const occupancyPct = total ? Math.round((occupied / total) * 100) : 0;
  // Baja ocupación: peor primero (las que tienen al menos 1 libre).
  const lowOccupancy = houses.filter((h) => h.free > 0).sort((a, b) => a.pct - b.pct || b.free - a.free);

  // Unidades libres (lista plana con casa).
  const freeUnits = [];
  for (const h of houses) for (const fu of h.freeUnits) freeUnits.push({ house: h.name, unit: fu });

  const critical = alerts.filter((a) => a.severity === "critical");
  const warnings = alerts.filter((a) => a.severity === "warning");

  return {
    kind: "weekly",
    generatedAt: now.toISOString(),
    occupancy: { total, occupied, reserved, free, pct: occupancyPct },
    houses: houses.sort((a, b) => a.pct - b.pct),
    lowOccupancy,
    freeUnits,
    criticalAlerts: critical,
    warningCount: warnings.length,
  };
}

// ════════════════════════════════════════════════════════════════
// GUÍA DE BIENVENIDA · datos por casa (+ unidad opcional)
// ════════════════════════════════════════════════════════════════
// Extrae el keypad de un texto libre tipo "Acceso a casa: 2005\nHabitaciones: Llaves".
function parseKeypad(text) {
  if (!text) return null;
  const m = String(text).match(/(?:acceso|casa|keypad|c[oó]digo|code)[^0-9]{0,18}(\d{3,8})/i) || String(text).match(/\b(\d{4,8})\b/);
  return m ? m[1] : null;
}
export async function fetchWelcomeGuideData(cfg, propertyId, unitId = null) {
  const props = await rest(cfg, `pm_properties?select=id,name,address,city,state,zip,wifi_name,wifi_pass,access_code,total_rooms,rental_model&id=eq.${propertyId}`);
  const p = props[0];
  if (!p) throw new Error("Casa no encontrada: " + propertyId);
  const units = await rest(cfg, `pm_units?select=id,name,code,status,access_codes,unit_type&property_id=eq.${propertyId}&is_active=eq.true`);
  const unit = unitId ? units.find((u) => u.id === unitId) : null;

  // Keypad principal: 1º access_code de la Casa; 2º parse del access_codes de cualquier unidad.
  let accessCode = p.access_code || null;
  if (!accessCode) for (const u of units) { const k = parseKeypad(u.access_codes); if (k) { accessCode = k; break; } }

  const rooms = p.total_rooms || units.filter((u) => /habitaci|room/i.test(u.unit_type || u.name || "")).length;
  const modelLabel = { casa_completa: "Full house", por_habitaciones: "Private rooms", por_estudios: "Studios", por_apartamentos: "Apartments", mixto: "Mixed units" }[p.rental_model] || "";
  const subtitle = rooms ? `Full house + ${rooms} private rooms` : modelLabel;

  return {
    kind: "welcome",
    property_id: p.id,
    address: p.address || p.name,
    city: p.city, state: p.state, zip: p.zip,
    subtitle,
    wifiName: p.wifi_name, wifiPass: p.wifi_pass,
    accessCode,
    unitName: unit ? (unit.name || unit.code) : null,
    unitAccess: unit ? (unit.access_codes || null) : null,
  };
}

// ════════════════════════════════════════════════════════════════
// MENSUAL · finanzas (cortado por mes)
// ════════════════════════════════════════════════════════════════
export async function fetchMonthlyData(cfg, year, month1to12, now = new Date()) {
  const { from, to, label } = monthBounds(year, month1to12);
  const [props, payments, expenses] = await Promise.all([
    rest(cfg, "pm_properties?select=id,name&active=eq.true"),
    rest(cfg, `pm_payments?select=amount,property_id,paid_at&active=eq.true&type=eq.ingreso&status=eq.pagado&paid_at=gte.${from}&paid_at=lte.${to}`),
    rest(cfg, `pm_expenses?select=amount,property_id,subcategory,description,expense_date&active=eq.true&expense_date=gte.${from}&expense_date=lte.${to}`),
  ]);
  const nameById = Object.fromEntries(props.map((p) => [p.id, p.name]));

  const income = money(payments.reduce((s, p) => s + (p.amount || 0), 0));
  const expenseTotal = money(expenses.reduce((s, e) => s + (e.amount || 0), 0));
  const cashflow = money(income - expenseTotal);

  // Desglose por Tipo (bucket).
  const buckets = {};
  for (const e of expenses) {
    const b = expenseBucket(e.subcategory);
    (buckets[b] ||= { bucket: b, label: BUCKET_LABELS[b], total: 0, count: 0, byHouse: {} });
    buckets[b].total = money(buckets[b].total + (e.amount || 0));
    buckets[b].count++;
    if (e.property_id) {
      const h = (buckets[b].byHouse[e.property_id] ||= { name: nameById[e.property_id] || "Sin casa", total: 0 });
      h.total = money(h.total + (e.amount || 0));
    }
  }
  const breakdown = Object.values(buckets).sort((a, b) => b.total - a.total);

  // OUTLIERS: casas con hipoteca o servicios muy altos (> media + 1·desv del bucket).
  const outliers = [];
  for (const key of ["hipoteca", "servicios"]) {
    const bk = buckets[key];
    if (!bk) continue;
    const vals = Object.values(bk.byHouse).map((h) => h.total);
    if (vals.length < 2) continue;
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    const thr = mean + Math.max(sd, mean * 0.4); // umbral robusto
    for (const h of Object.values(bk.byHouse)) {
      if (h.total >= thr && h.total > mean) outliers.push({ type: BUCKET_LABELS[key], house: h.name, amount: h.total, mean: money(mean) });
    }
  }
  outliers.sort((a, b) => b.amount - a.amount);

  // P&L por casa (income casa − gastos con property_id de esa casa).
  const houseAgg = {};
  for (const p of props) houseAgg[p.id] = { id: p.id, name: p.name, income: 0, expense: 0 };
  for (const p of payments) if (p.property_id && houseAgg[p.property_id]) houseAgg[p.property_id].income = money(houseAgg[p.property_id].income + (p.amount || 0));
  for (const e of expenses) if (e.property_id && houseAgg[e.property_id]) houseAgg[e.property_id].expense = money(houseAgg[e.property_id].expense + (e.amount || 0));
  const houses = Object.values(houseAgg).map((h) => ({ ...h, net: money(h.income - h.expense) }))
    .filter((h) => h.income > 0 || h.expense > 0);

  const losses = houses.filter((h) => h.net < 0).sort((a, b) => a.net - b.net);     // pérdida: más negativo primero
  const topProfit = houses.filter((h) => h.net > 0).sort((a, b) => b.net - a.net).slice(0, 8);

  // Gastos no asignados a casa (nómina/plataforma/operacional).
  const unassigned = money(expenses.filter((e) => !e.property_id).reduce((s, e) => s + (e.amount || 0), 0));

  return {
    kind: "monthly",
    generatedAt: now.toISOString(),
    period: { year, month: month1to12, label, from, to },
    income, expenseTotal, cashflow, unassigned,
    breakdown, outliers, houses, losses, topProfit,
    counts: { payments: payments.length, expenses: expenses.length, properties: props.length },
  };
}
