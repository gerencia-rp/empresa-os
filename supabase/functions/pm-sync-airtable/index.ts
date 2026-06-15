// ════════════════════════════════════════════════════════════════
// 🔄 PM-SYNC-AIRTABLE · Edge Function
// Sincroniza la base Airtable de rentas → Supabase pm_*
//
// Tablas que sincroniza:
//   1. Datos x Casa       → pm_properties + pm_units + pm_bookings
//   2. Base de datos Tenant → pm_tenants + pm_bookings (enriquece)
//   3. Pagos Rentas       → pm_payments (ingresos)
//   4. Gastos por casa    → pm_payments (gastos)
//   5. Acceso a plataforma → pm_credentials
//   6. Cuentas de wifi    → enrichment de pm_properties
//   7. Cronograma Juan Austin → pm_tasks
//
// Idempotente: usa external_id para detectar updates vs inserts.
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

// ────────────────────────────────────────────────────────────────
// HELPERS de mapping Airtable → nuestro schema
// ────────────────────────────────────────────────────────────────
const TABLE_IDS = {
  datos_casa:  "tblbSJ4K8e7mSHT5E",
  tenants:     "tblxEHBbGylH1aF2F",
  accesos:     "tblYrOKj2xOV1gAZe",
  wifi:        "tblga4BybYVBBRCTu",
  pagos:       "tblqJlSgnLNfn34dh",
  gastos_casa: "tblsihpE31f116RCR",
  gastos_plat: "tblrs9nCGsew8SvCR",
  gastos_eq:   "tbl21GE6fjUdU4sxF",
  gastos_aseo: "tblxfX2no190lvLYo",
  cronograma:  "tblHrLZFet9CxFMxP"
};

// Field IDs (los saqué del schema)
const F = {
  // Datos x Casa
  dxc_inquilino:  "fldTRvmckTIoB9B7o",
  dxc_direccion:  "fld1Thbg8RaXZXREv",
  dxc_ubicacion:  "fldoWhA7nQN8E9FY2",
  dxc_tipo:       "fld6Z3m6475L7nKfO",
  dxc_estado:     "fld5HSTZfYNGHXwlD",
  dxc_habs:       "fldPzlmBOftkYLwkK",
  dxc_tipo_bano:  "fldWpcpIBJueKim9R",
  dxc_telefono:   "fldtpplPafmlpPxgT",
  dxc_fuente:     "fldP6ibpOyTOkb2mR",
  dxc_fecha_in:   "fldTb6BYgQU9VMPov",
  dxc_fecha_out:  "fldtpWCmHd8edL4pR",
  dxc_deposito:   "fldcN97GXLtLQuWRC",
  dxc_tiempo_pago:"fldU5UnhS9lrnrVjT",
  dxc_pago:       "fld3v0ID9fKbcT2tX",
  dxc_drive:      "fldHosrYcY5mM5uG0",
  dxc_accesos:    "fld7QWVLy7eRD6HtB",
  dxc_obs:        "fld6xCGWkqkW402G2",
  dxc_modelo:     "fldeEsa5O8bXmBJhV",
  // Tenants
  ten_nombre:     "fldmAQPZgdnXtutUo",
  ten_estado:     "fldEjfHWUvqySC4kd",
  ten_casa:       "fld87VueQlzwIlDQb",
  ten_unit_estado:"fldL15xgonyptGqOX",
  ten_tipo_renta: "fld1mJTeCm7vNibFx",
  ten_fuente:     "fld9tnMTpyMm9GQZT",
  ten_telefono:   "fldnI10gkxTgGfi05",
  ten_monto:      "fldHGaK8FoKTGNEbm",
  ten_dia_pago:   "fldlvIxiw0RqEWMCX",
  ten_metodo_pago:"flduLCQ9qpAstmqlz",
  ten_fecha_in:   "fld5cYe01qNbeYxih",
  ten_fecha_out:  "fldLqIft0LvTtIBmH",
  ten_seguimiento:"fldKZB3Gl7aXqcqst",
  ten_fecha_seg:  "fldvHwu4fhKzvDu88",
  ten_comentario: "fld5cbn1lnVB05k8R",
  ten_ai_summary: "fldgkUZj1Q2CW6R3y",
  // Accesos
  acc_nombre:     "fldKjHLd9N7u8TTzO",
  acc_cat:        "fld7Rx25sF6yCLwOh",
  acc_user:       "fldaT1hn121fpbVCt",
  acc_clave:      "fldgwDvgKeKad9R3a",
  acc_link:       "fldFw6DslFjMlhHeD",
  acc_casa:       "fldGjJ1uNVV5zicjd",
  acc_obs:        "fld3vbSbdsxyk0zUr",
  // Wifi
  wifi_dir:       "fldvWI4WaHr7sCA3y",
  wifi_name:      "fldixZ7Gevdq5nWi4",
  wifi_pass:      "fld1EGYbvdBJen3mw",
  // Pagos
  pag_inq:        "fldfuAgnhxOcLOF6s",
  pag_casa:       "fldi8Xbv68PwMBfyH",
  pag_tipo:       "fldnWnsVeieiIi2VQ",
  pag_plat:       "fldjRoQFc8oU6TP1U",
  pag_mes:        "fld7QBkX1srKCL6vv",
  pag_año:        "fld81Cmk4Q6M0SD2L",
  pag_fecha:      "fldvN5b0F88ZMz0VE",
  pag_monto:      "fldLtAtolVlJMmVuX",
  pag_obs:        "fldi5nc7sag6tkzqX",
  // Gastos por casa
  gst_dir:        "fldH4VS22KLxSRPMV",
  gst_mes:        "flduFcVM6yxQvCb1r",
  gst_tipo:       "flddMTMhngV9ECi5T",
  gst_valor:      "fldfvxnWBS6naQI9k",
  gst_fecha:      "fldXA9CEpxSiRgtXA",
  gst_obs:        "flduvYThDM3Nng9gK",
  // Cronograma
  crn_tarea:      "fldJkl3TDGYU3ErPv",
  crn_casa:       "fldmYzSF558qjOsz7",
  crn_zona:       "fldYmhi64Ca7uPvmn",
  crn_prio:       "fldy1Ah327giPelE1",
  crn_tiempo_t:   "fldpGW81tY6DWk0la",
  crn_tiempo_v:   "fld4goaQSS70t697p",
  crn_enc:        "fldWELwRbsv24zl3S",
  crn_fecha_in:   "fldJX2NTE5hroF8hv",
  crn_fecha_fin:  "fld6HGo7KPJ4d0AOj",
  crn_estado:     "fld9GDz5nrUylruZI",
  crn_notes:      "fldYe07B6CU5KFCEY",
  // Gastos por casa (extra)
  gst_drive:      "fldSWIEtwIV1JaPcd",
  gst_factura:    "fldGw1KT0EBxwtLX0",
  // Pagos (extra)
  pag_comprob:    "fldjgaqPzrf5VuRSN",
  // Gastos Por Plataforma → expenses(operational)
  gpl_plataformas:"fldtpoBmbfCT6ebqp",
  gpl_mes:        "fldO40Y62BLk4KDVw",
  gpl_valor:      "fldZl3AVGCvH84rUZ",
  gpl_plataforma: "fldvVDKmWuzxt1kyv",
  gpl_coment:     "fldxbQbeOdZ9eiJP3",
  gpl_factura:    "fld6OcM2NSiOXUewn",
  // Gastos Equipo → payroll
  geq_name:       "fldkhKgww24YXI49J",
  geq_salario:    "fldeDHCUzfz8uLZOO",
  geq_mes:        "fldwl9ZknNqLNWs68",
  geq_factura:    "fldZ2QilHZmDd8mdI",
  // Gastos Aseo y Podada → expenses(cleaning)
  gas_plataformas:"fldzccg7TOxnjRrMW",
  gas_mes:        "fldURODRKaGOhnTh3",
  gas_valor:      "fld58RfGobqblHHgw",
  gas_casa:       "fldDYEQZwMUDrVZbA",
  gas_factura:    "fldcB0rNvrdiaxuSU"
};

// Mapear nombres legibles
function getSel(cell: any): string | null {
  if (!cell) return null;
  if (typeof cell === "string") return cell;
  if (cell.name) return cell.name;
  if (Array.isArray(cell)) return cell[0]?.name || null;
  return null;
}
function getMultiSel(cell: any): string[] {
  if (!cell) return [];
  if (Array.isArray(cell)) return cell.map((c: any) => c.name || c).filter(Boolean);
  return [];
}
function slugify(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
// Airtable attachment → primera URL
function getAttachUrl(cell: any): string | null {
  if (Array.isArray(cell) && cell[0]?.url) return cell[0].url;
  return null;
}
// "Febrero 2026" / "Febrero" → { month:'febrero', year:2026|null }
function parseMonthYear(raw: any): { month: string | null; year: number | null } {
  const s = getSel(raw);
  if (!s) return { month: null, year: null };
  const ym = s.match(/(20\d{2})/);
  const year = ym ? parseInt(ym[1]) : null;
  const month = s.replace(/20\d{2}/, "").trim().toLowerCase() || null;
  return { month, year };
}
function extractZip(addr: string): { zip?: string; city?: string; state?: string } {
  const m = (addr || "").match(/(\d{5})/);
  const zip = m?.[1];
  // Marlin / Round Rock / Austin tienen pistas en la dirección
  let city = "Austin", state = "TX";
  if (/marlin/i.test(addr)) city = "Marlin";
  else if (/round rock/i.test(addr)) city = "Round Rock";
  return { zip, city, state };
}
function inferRentalModel(modelo: string | null): string {
  switch (modelo) {
    case "Renta por habitaciones": return "por_habitaciones";
    case "Renta por estudios":     return "por_estudios";
    case "Renta por Apartamentos": return "por_apartamentos";
    case "Renta Tradicional":      return "casa_completa";
    case "Programas de ayuda":     return "mixto";
    default:                       return "mixto";
  }
}
function inferUnitType(tipo: string | null): string {
  if (!tipo) return "habitacion";
  if (/casa completa/i.test(tipo))   return "casa_completa";
  if (/habitaci/i.test(tipo))        return "habitacion";
  if (/estudio/i.test(tipo))         return "estudio";
  if (/apartamento/i.test(tipo))     return "apartamento";
  return "habitacion";
}
function inferBookingType(fuentes: string[]): string {
  for (const f of fuentes) {
    if (/airbnb/i.test(f))   return "airbnb";
    if (/padsplit/i.test(f)) return "padsplit";
    if (/booking/i.test(f))  return "booking";
    if (/vrbo/i.test(f))     return "vrbo";
  }
  return "contrato_directo";
}
function inferZone(z: string | null): string | null {
  if (!z) return null;
  if (/norte/i.test(z))      return "norte";
  if (/sur/i.test(z))        return "sur";
  if (/marlin/i.test(z))     return "marlin";
  if (/round\s*rock/i.test(z)) return "round_rock";
  return z.toLowerCase();
}
function inferBathType(t: string | null): string | null {
  if (!t) return null;
  if (/privado.+compart/i.test(t)) return "privado_compartido";
  if (/privado/i.test(t))          return "privado";
  if (/compart/i.test(t))          return "compartido";
  return null;
}
function inferMaintenanceStatus(estado: string | null): string | null {
  if (!estado) return null;
  if (/manten/i.test(estado)) return "en_mantenimiento";
  return "ok";
}
function inferContractStatus(obs: string | null): string | null {
  if (!obs) return null;
  if (/falta firmar/i.test(obs))   return "pendiente_firma";
  if (/pendiente.*contrato/i.test(obs)) return "sin_contrato";
  if (/✅/.test(obs) && !/falta/i.test(obs)) return "firmado";
  return null;
}

// ────────────────────────────────────────────────────────────────
// Llamadas a Airtable API (paginación automática)
// ────────────────────────────────────────────────────────────────
async function fetchAllRecords(baseId: string, tableId: string, token: string): Promise<any[]> {
  const all: any[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    url.searchParams.set("returnFieldsByFieldId", "true");
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }});
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Airtable ${tableId} HTTP ${r.status}: ${txt.slice(0, 200)}`);
    }
    const data = await r.json();
    all.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return all;
}

// ────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Cron: si el Bearer es el service_role key, es invocación server-side autorizada
  // (solo quien tiene el service key puede hacerlo) → bypass requireAuth + usa token de env.
  const bearer = (req.headers.get("authorization") || req.headers.get("Authorization") || "").replace(/^bearer /i, "").trim();
  const isCron = !!SERVICE_KEY && bearer === SERVICE_KEY;
  let userId: string | null = null;
  if (!isCron) {
    const auth = await requireAuth(req);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);
    userId = auth.user_id || null;
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const dry_run = body.dry_run === true;
  const airtable_token = body.airtable_token || Deno.env.get("AIRTABLE_API_KEY");
  const base_id = body.base_id || Deno.env.get("AIRTABLE_BASE_ID") || "appzEnsuy4qPT6iHj";
  if (!airtable_token) return json({ ok: false, error: "Falta airtable_token (body o AIRTABLE_API_KEY env)" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const startMs = Date.now();
  const stats: any = { properties: 0, units: 0, tenants: 0, bookings: 0, payments_in: 0, expenses_house: 0, expenses_operational: 0, expenses_cleaning: 0, payroll: 0, credentials: 0, wifi: 0, tasks: 0 };
  const errors: string[] = [];

  // Log inicio
  const { data: log } = await supabase.from("pm_sync_log").insert({
    source: "airtable",
    user_id: userId,
    status: "running"
  }).select().single();

  try {
    // ════════════════════════════════════════════════════════════
    // 1) DATOS X CASA → properties + units + bookings
    // ════════════════════════════════════════════════════════════
    const datosCasa = await fetchAllRecords(base_id, TABLE_IDS.datos_casa, airtable_token);

    // 1a) Deduplicar y crear properties por dirección
    const propsByAddr: Record<string, any> = {};
    for (const r of datosCasa) {
      const addr = getSel(r.fields?.[F.dxc_direccion]);
      if (!addr || propsByAddr[addr]) continue;
      const { zip, city, state } = extractZip(addr);
      propsByAddr[addr] = {
        external_id: "addr-" + slugify(addr),
        name: addr,
        address: addr,
        city, state, zip,
        zone: inferZone(getSel(r.fields?.[F.dxc_ubicacion])),
        rental_model: inferRentalModel(getSel(r.fields?.[F.dxc_modelo])),
        drive_url: r.fields?.[F.dxc_drive] || null,
        status: "activa"
      };
    }
    const propsArr = Object.values(propsByAddr);
    if (!dry_run && propsArr.length) {
      const { error } = await supabase.from("pm_properties").upsert(propsArr, { onConflict: "external_id" });
      if (error) errors.push("properties: " + error.message);
    }
    stats.properties = propsArr.length;

    // Map address → property_id
    const { data: dbProps } = await supabase.from("pm_properties").select("id, external_id, address");
    const propIdByExtId: Record<string, string> = {};
    const propIdByAddr: Record<string, string> = {};
    (dbProps || []).forEach((p: any) => {
      if (p.external_id) propIdByExtId[p.external_id] = p.id;
      if (p.address) propIdByAddr[p.address] = p.id;
    });
    // Lookup tolerante: exacto por slug, luego substring contra direcciones reales.
    const findPropId = (name: string | null): string | null => {
      if (!name) return null;
      const exact = propIdByExtId["addr-" + slugify(name)];
      if (exact) return exact;
      const ns = slugify(name);
      if (!ns) return null;
      for (const p of (dbProps || [])) {
        const a = slugify(p.address || "");
        if (a && (a.includes(ns) || ns.includes(a))) return p.id;
      }
      return null;
    };

    // 1b) Units: UNA por unidad física = (property + tipo de alojamiento).
    //     "Datos x Casa" tiene 1 fila por (unidad + inquilino + período), así que
    //     varias filas comparten la misma unidad física → se AGRUPAN en 1 pm_unit.
    //     external_id estable = "unit-" + slug(direccion) + "-" + slug(tipo)
    //     (NO el record_id de Airtable, que es distinto por reserva).
    const unitsByKey: Record<string, any> = {};
    const unitIdByExternalRec: Record<string, string> = {}; // airtable rec id → unit external_id (estable, compartido)
    let unitDupesAvoided = 0;

    for (const r of datosCasa) {
      const addr = getSel(r.fields?.[F.dxc_direccion]);
      if (!addr) continue;
      const tipo = getMultiSel(r.fields?.[F.dxc_tipo])[0] || "Habitación";
      const propExtId = "addr-" + slugify(addr);
      const propId = propIdByExtId[propExtId];
      if (!propId) continue;
      const ext = "unit-" + slugify(addr) + "-" + slugify(tipo);   // clave compuesta estable
      unitIdByExternalRec[r.id] = ext;                             // cada fila apunta a su unidad agrupada
      if (unitsByKey[ext]) { unitDupesAvoided++; continue; }       // ya creada por otra reserva de la misma unidad
      const code = (slugify(addr).split("-").slice(0,2).join("-").toUpperCase()) + "-" + slugify(tipo).toUpperCase();
      unitsByKey[ext] = {
        external_id: ext,
        property_id: propId,
        code,
        name: tipo,
        unit_type: inferUnitType(tipo),
        target_rent: r.fields?.[F.dxc_pago] || null,
        bath_type: inferBathType(getSel(r.fields?.[F.dxc_tipo_bano])),
        access_codes: r.fields?.[F.dxc_accesos] || null,
        maintenance_status: inferMaintenanceStatus(getSel(r.fields?.[F.dxc_estado])),
        drive_url: r.fields?.[F.dxc_drive] || null,
        is_active: true
      };
    }
    const unitsArr = Object.values(unitsByKey);
    if (!dry_run && unitsArr.length) {
      const { error } = await supabase.from("pm_units").upsert(unitsArr, { onConflict: "external_id" });
      if (error) errors.push("units: " + error.message);
    }
    stats.units = unitsArr.length;
    stats.units_dupes_avoided = unitDupesAvoided;
    console.log(`[pm-sync] pm_units: ${unitsArr.length} únicas · ${unitDupesAvoided} duplicados de unidad evitados (filas Airtable: ${datosCasa.length})`);

    // 1c) Bookings (de Datos x Casa, donde hay inquilino + fecha entrada)
    const { data: dbUnits } = await supabase.from("pm_units").select("id, external_id, property_id, name");
    const unitIdByExtId: Record<string, { id: string; property_id: string }> = {};
    const unitIdByPropName: Record<string, string> = {}; // `${property_id}|${slug(name)}` → unit_id
    (dbUnits || []).forEach((u: any) => {
      if (u.external_id) unitIdByExtId[u.external_id] = { id: u.id, property_id: u.property_id };
      if (u.property_id && u.name) unitIdByPropName[`${u.property_id}|${slugify(u.name)}`] = u.id;
    });

    // Mapa nombre inquilino → tenant_id (lo construimos en step 2)
    // Por ahora, tenants básicos desde Datos x Casa (sin teléfono o con teléfono airtable)
    const tenantsBasic: any[] = [];
    const tenantIdByName: Record<string, string> = {};
    for (const r of datosCasa) {
      const name = r.fields?.[F.dxc_inquilino];
      if (!name) continue;
      if (tenantIdByName[name.toLowerCase()]) continue;
      const ext = "tenant-name-" + slugify(name);
      tenantsBasic.push({
        external_id: ext,
        full_name: name,
        phone: r.fields?.[F.dxc_telefono] || null,
        source: inferBookingType(getMultiSel(r.fields?.[F.dxc_fuente]))
      });
      tenantIdByName[name.toLowerCase()] = ext; // placeholder
    }

    // ════════════════════════════════════════════════════════════
    // 2) TENANTS (Base de datos Tenant) — info más rica
    // ════════════════════════════════════════════════════════════
    const tenantsAt = await fetchAllRecords(base_id, TABLE_IDS.tenants, airtable_token);
    const tenantsFromTbl: any[] = [];
    for (const r of tenantsAt) {
      const name = r.fields?.[F.ten_nombre];
      if (!name) continue;
      const ext = "tenant-at-" + r.id;
      tenantsFromTbl.push({
        external_id: ext,
        full_name: name,
        phone: r.fields?.[F.ten_telefono] || null,
        source: inferBookingType([getSel(r.fields?.[F.ten_fuente]) || ""]),
        client_state: getMultiSel(r.fields?.[F.ten_estado])[0] || null,
        ai_summary: (r.fields?.[F.ten_ai_summary]?.value || null),
        notes: r.fields?.[F.ten_comentario] || null
      });
      tenantIdByName[name.toLowerCase()] = ext;
    }
    const allTenants = [...tenantsBasic.filter(t => !tenantsFromTbl.find(t2 => t2.full_name.toLowerCase() === t.full_name.toLowerCase())), ...tenantsFromTbl];
    if (!dry_run && allTenants.length) {
      const { error } = await supabase.from("pm_tenants").upsert(allTenants, { onConflict: "external_id" });
      if (error) errors.push("tenants: " + error.message);
    }
    stats.tenants = allTenants.length;

    // Re-leer tenants para tener ID real
    const { data: dbTen } = await supabase.from("pm_tenants").select("id, external_id, full_name");
    const tenantIdRealByExtId: Record<string, string> = {};
    const tenantIdRealByName: Record<string, string> = {};
    (dbTen || []).forEach((t: any) => {
      if (t.external_id) tenantIdRealByExtId[t.external_id] = t.id;
      if (t.full_name) tenantIdRealByName[t.full_name.toLowerCase()] = t.id;
    });

    // ════════════════════════════════════════════════════════════
    // 3) BOOKINGS desde Datos x Casa
    // ════════════════════════════════════════════════════════════
    const bookings: any[] = [];
    for (const r of datosCasa) {
      const inquilino = r.fields?.[F.dxc_inquilino];
      if (!inquilino) continue;
      const startDate = r.fields?.[F.dxc_fecha_in];
      if (!startDate) continue;
      const unitExtId = unitIdByExternalRec[r.id];
      const unitInfo = unitIdByExtId[unitExtId];
      if (!unitInfo) continue;
      const tenantId = tenantIdRealByName[inquilino.toLowerCase()] || null;
      const fuentes = getMultiSel(r.fields?.[F.dxc_fuente]);
      const platformAcc = fuentes.find(f => /@|gmail|gerencia/i.test(f)) || null;
      const estado = getSel(r.fields?.[F.dxc_estado]) || "";
      const obs = r.fields?.[F.dxc_obs] || null;
      const modelo = getSel(r.fields?.[F.dxc_modelo]) || "";

      // Status derivado de ESTADO + fechas. Vocabulario interno (activo/confirmado/
      // finalizado) ≡ active/upcoming/past del spec — se mantiene en español para no
      // romper el frontend (pmActiveBookings filtra ['activo','confirmado']) ni los joins.
      const today = new Date().toISOString().slice(0, 10);
      const checkOut = r.fields?.[F.dxc_fecha_out] || null;
      let status: string;
      if (checkOut && checkOut < today) status = "finalizado";                          // past
      else if (startDate && startDate > today) status = "confirmado";                   // upcoming
      else if (startDate && startDate <= today && (!checkOut || checkOut >= today)) status = "activo"; // active
      else status = /ocupada/i.test(estado) ? "activo"
                  : /reservado/i.test(estado) ? "confirmado"
                  : /disponible/i.test(estado) ? "finalizado"
                  : "activo";

      bookings.push({
        external_id: "booking-dxc-" + r.id,   // record_id de Airtable: único por reserva
        unit_id: unitInfo.id,
        property_id: unitInfo.property_id,
        tenant_id: tenantId,
        booking_type: inferBookingType(fuentes),
        platform_account: platformAcc,
        start_date: startDate,
        end_date: checkOut,
        rent_amount: r.fields?.[F.dxc_pago] || 0,
        rent_period: "mensual",
        deposit: r.fields?.[F.dxc_deposito] || 0,
        payment_day: getSel(r.fields?.[F.dxc_tiempo_pago]) || null,
        status,
        contract_status: inferContractStatus(obs),
        is_assistance_program: /programas de ayuda/i.test(modelo),
        contract_url: r.fields?.[F.dxc_drive] || null,
        notes: obs
      });
    }
    if (!dry_run && bookings.length) {
      // Insertar en chunks de 50 para evitar payload grande
      for (let i = 0; i < bookings.length; i += 50) {
        const chunk = bookings.slice(i, i + 50);
        const { error } = await supabase.from("pm_bookings").upsert(chunk, { onConflict: "external_id" });
        if (error) { errors.push("bookings chunk " + i + ": " + error.message); break; }
      }
    }
    stats.bookings = bookings.length;
    console.log(`[pm-sync] pm_bookings: ${bookings.length} reservas creadas (N por unidad).`);

    // ════════════════════════════════════════════════════════════
    // 4) PAGOS (Pagos Rentas → ingresos)
    // ════════════════════════════════════════════════════════════
    try {
      const pagos = await fetchAllRecords(base_id, TABLE_IDS.pagos, airtable_token);
      const paymentsIn: any[] = [];
      for (const r of pagos) {
        const casaName = getSel(r.fields?.[F.pag_casa]);
        const propId = findPropId(casaName);
        const tipo = getSel(r.fields?.[F.pag_tipo]);
        const unitId = (propId && tipo) ? (unitIdByPropName[`${propId}|${slugify(tipo)}`] || null) : null;
        const inq = r.fields?.[F.pag_inq] || "";
        const tenantId = inq ? (tenantIdRealByName[inq.toLowerCase()] || null) : null;
        const { month, year } = { month: getSel(r.fields?.[F.pag_mes]), year: (() => { const y = getSel(r.fields?.[F.pag_año]); return y ? parseInt(y) : null; })() };
        paymentsIn.push({
          external_id: "pay-" + r.id,
          booking_id: null,
          property_id: propId,
          unit_id: unitId,
          tenant_id: tenantId,
          type: "ingreso",
          category: "renta",
          concept: `${inq} · ${month || ""} ${year || ""}`.trim(),
          amount: r.fields?.[F.pag_monto] || 0,
          paid_at: r.fields?.[F.pag_fecha] || null,
          month, year: isNaN(year as any) ? null : year,
          platform: getSel(r.fields?.[F.pag_plat]),
          payment_method: r.fields?.[F.pag_obs] || null,
          proof_url: getAttachUrl(r.fields?.[F.pag_comprob]),
          status: "pagado",
          notes: r.fields?.[F.pag_obs] || null
        });
      }
      if (!dry_run && paymentsIn.length) {
        for (let i = 0; i < paymentsIn.length; i += 50) {
          const { error } = await supabase.from("pm_payments").upsert(paymentsIn.slice(i, i + 50), { onConflict: "external_id" });
          if (error) { errors.push("pagos chunk " + i + ": " + error.message); break; }
        }
      }
      stats.payments_in = paymentsIn.length;
    } catch (e: any) { errors.push("pagos: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 5) GASTOS POR CASA → pm_expenses (category='house')
    // ════════════════════════════════════════════════════════════
    try {
      const gastos = await fetchAllRecords(base_id, TABLE_IDS.gastos_casa, airtable_token);
      const exp: any[] = [];
      for (const r of gastos) {
        exp.push({
          external_id: "exp-house-" + r.id,
          category: "house",
          subcategory: getSel(r.fields?.[F.gst_tipo]) || null,
          property_id: findPropId(r.fields?.[F.gst_dir]),
          amount: r.fields?.[F.gst_valor] || 0,
          expense_date: r.fields?.[F.gst_fecha] || null,
          month: getMultiSel(r.fields?.[F.gst_mes])[0]?.toLowerCase() || null,
          description: getSel(r.fields?.[F.gst_tipo]) || "Gasto casa",
          invoice_url: r.fields?.[F.gst_drive] || getAttachUrl(r.fields?.[F.gst_factura]),
          paid: true,
          notes: r.fields?.[F.gst_obs] || null
        });
      }
      if (!dry_run && exp.length) {
        for (let i = 0; i < exp.length; i += 50) {
          const { error } = await supabase.from("pm_expenses").upsert(exp.slice(i, i + 50), { onConflict: "external_id" });
          if (error) { errors.push("gastos_casa chunk " + i + ": " + error.message); break; }
        }
      }
      stats.expenses_house = exp.length;
    } catch (e: any) { errors.push("gastos_casa: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 5b) GASTOS POR PLATAFORMA → pm_expenses (category='operational')
    // ════════════════════════════════════════════════════════════
    try {
      const gpl = await fetchAllRecords(base_id, TABLE_IDS.gastos_plat, airtable_token);
      const exp: any[] = [];
      for (const r of gpl) {
        const { month, year } = parseMonthYear(r.fields?.[F.gpl_mes]);
        exp.push({
          external_id: "exp-oper-" + r.id,
          category: "operational",
          subcategory: r.fields?.[F.gpl_plataformas] || getSel(r.fields?.[F.gpl_plataforma]) || null,
          property_id: null,
          amount: r.fields?.[F.gpl_valor] || 0,
          month, year,
          description: r.fields?.[F.gpl_plataformas] || "Gasto plataforma",
          invoice_url: getAttachUrl(r.fields?.[F.gpl_factura]),
          paid: true,
          notes: r.fields?.[F.gpl_coment] || null
        });
      }
      if (!dry_run && exp.length) {
        for (let i = 0; i < exp.length; i += 50) {
          const { error } = await supabase.from("pm_expenses").upsert(exp.slice(i, i + 50), { onConflict: "external_id" });
          if (error) { errors.push("gastos_plat chunk " + i + ": " + error.message); break; }
        }
      }
      stats.expenses_operational = exp.length;
    } catch (e: any) { errors.push("gastos_plat: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 5c) GASTOS ASEO Y PODADA → pm_expenses (category='cleaning')
    // ════════════════════════════════════════════════════════════
    try {
      const gas = await fetchAllRecords(base_id, TABLE_IDS.gastos_aseo, airtable_token);
      const exp: any[] = [];
      for (const r of gas) {
        const { month, year } = parseMonthYear(r.fields?.[F.gas_mes]);
        const casa = getMultiSel(r.fields?.[F.gas_casa])[0] || null;
        exp.push({
          external_id: "exp-clean-" + r.id,
          category: "cleaning",
          subcategory: r.fields?.[F.gas_plataformas] || getSel(r.fields?.[F.gas_casa]) || null,
          property_id: findPropId(casa),
          amount: r.fields?.[F.gas_valor] || 0,
          month, year,
          description: r.fields?.[F.gas_plataformas] || "Aseo/Podada",
          invoice_url: getAttachUrl(r.fields?.[F.gas_factura]),
          paid: true,
          notes: null
        });
      }
      if (!dry_run && exp.length) {
        for (let i = 0; i < exp.length; i += 50) {
          const { error } = await supabase.from("pm_expenses").upsert(exp.slice(i, i + 50), { onConflict: "external_id" });
          if (error) { errors.push("gastos_aseo chunk " + i + ": " + error.message); break; }
        }
      }
      stats.expenses_cleaning = exp.length;
    } catch (e: any) { errors.push("gastos_aseo: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 5d) GASTOS EQUIPO → pm_payroll
    // ════════════════════════════════════════════════════════════
    try {
      const geq = await fetchAllRecords(base_id, TABLE_IDS.gastos_eq, airtable_token);
      const rows: any[] = [];
      for (const r of geq) {
        const name = r.fields?.[F.geq_name] || getSel(r.fields?.[F.geq_name]);
        if (!name) continue;
        const { month, year } = parseMonthYear(r.fields?.[F.geq_mes]);
        rows.push({
          external_id: "payroll-" + r.id,
          employee_name: name,
          salary: r.fields?.[F.geq_salario] || 0,
          month, year,
          paid: true,
          invoice_url: getAttachUrl(r.fields?.[F.geq_factura])
        });
      }
      if (!dry_run && rows.length) {
        const { error } = await supabase.from("pm_payroll").upsert(rows, { onConflict: "external_id" });
        if (error) errors.push("payroll: " + error.message);
      }
      stats.payroll = rows.length;
    } catch (e: any) { errors.push("gastos_eq: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 6) ACCESOS → pm_credentials
    // ════════════════════════════════════════════════════════════
    try {
      const accesos = await fetchAllRecords(base_id, TABLE_IDS.accesos, airtable_token);
      const creds: any[] = [];
      for (const r of accesos) {
        creds.push({
          external_id: "cred-" + r.id,
          name: r.fields?.[F.acc_nombre] || "Sin nombre",
          category: getSel(r.fields?.[F.acc_cat]) || "otro",
          username: r.fields?.[F.acc_user] || null,
          password_enc: r.fields?.[F.acc_clave] || null,
          url: r.fields?.[F.acc_link] || null,
          notes: r.fields?.[F.acc_obs] || null
        });
      }
      if (!dry_run && creds.length) {
        const { error } = await supabase.from("pm_credentials").upsert(creds, { onConflict: "external_id" });
        if (error) errors.push("credentials: " + error.message);
      }
      stats.credentials = creds.length;
    } catch (e: any) { errors.push("accesos: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 7) WIFI → pm_wifi_credentials (+ enrich pm_properties best-effort)
    // ════════════════════════════════════════════════════════════
    try {
      const wifis = await fetchAllRecords(base_id, TABLE_IDS.wifi, airtable_token);
      const wifiRows: any[] = [];
      for (const r of wifis) {
        const dir = r.fields?.[F.wifi_dir];
        if (!dir) continue;
        const propId = findPropId(dir);
        wifiRows.push({
          external_id: "wifi-" + r.id,
          property_id: propId,
          network_name: r.fields?.[F.wifi_name] || null,
          password_encrypted: r.fields?.[F.wifi_pass] || null
        });
        if (!dry_run && propId) {
          await supabase.from("pm_properties").update({
            wifi_name: r.fields?.[F.wifi_name] || null,
            wifi_pass: r.fields?.[F.wifi_pass] || null
          }).eq("id", propId);
        }
      }
      if (!dry_run && wifiRows.length) {
        const { error } = await supabase.from("pm_wifi_credentials").upsert(wifiRows, { onConflict: "external_id" });
        if (error) errors.push("wifi_credentials: " + error.message);
      }
      stats.wifi = wifiRows.length;
    } catch (e: any) { errors.push("wifi: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 8) CRONOGRAMA → pm_tasks
    // ════════════════════════════════════════════════════════════
    try {
      const crn = await fetchAllRecords(base_id, TABLE_IDS.cronograma, airtable_token);
      const tasks: any[] = [];
      for (const r of crn) {
        tasks.push({
          external_id: "task-" + r.id,
          title: r.fields?.[F.crn_tarea] || "Sin título",
          property_id: (() => {
            const casa = getSel(r.fields?.[F.crn_casa]);
            return casa ? (propIdByExtId["addr-" + slugify(casa)] || null) : null;
          })(),
          zone: inferZone(getSel(r.fields?.[F.crn_zona])),
          priority: (getSel(r.fields?.[F.crn_prio]) || "media").toLowerCase(),
          task_duration: getSel(r.fields?.[F.crn_tiempo_t]) || null,
          travel_time: getSel(r.fields?.[F.crn_tiempo_v]) || null,
          assignee: getSel(r.fields?.[F.crn_enc]) || null,
          status: (() => {
            const s = (getSel(r.fields?.[F.crn_estado]) || "").toLowerCase();
            if (/complet/.test(s)) return "completado";
            if (/progres/.test(s)) return "en_progreso";
            if (/cancel/.test(s))  return "cancelado";
            return "pendiente";
          })(),
          start_at: r.fields?.[F.crn_fecha_in] || null,
          finish_at: r.fields?.[F.crn_fecha_fin] || null,
          notes: r.fields?.[F.crn_notes] || null
        });
      }
      if (!dry_run && tasks.length) {
        for (let i = 0; i < tasks.length; i += 50) {
          const { error } = await supabase.from("pm_tasks").upsert(tasks.slice(i, i + 50), { onConflict: "external_id" });
          if (error) { errors.push("tasks chunk " + i + ": " + error.message); break; }
        }
      }
      stats.tasks = tasks.length;
    } catch (e: any) { errors.push("cronograma: " + e.message); }

    // Cerrar log
    const status = errors.length === 0 ? "success" : "partial";
    if (log) {
      await supabase.from("pm_sync_log").update({
        status,
        records_synced: stats,
        error_message: errors.length ? errors.join("\n") : null,
        duration_ms: Date.now() - startMs,
        finished_at: new Date().toISOString()
      }).eq("id", log.id);
    }
    return json({ ok: true, dry_run, stats, errors, duration_ms: Date.now() - startMs });
  } catch (e: any) {
    if (log) {
      await supabase.from("pm_sync_log").update({
        status: "error",
        error_message: e?.message || String(e),
        duration_ms: Date.now() - startMs,
        finished_at: new Date().toISOString()
      }).eq("id", log.id);
    }
    return json({ ok: false, error: e?.message || String(e), stats, errors }, 500);
  }
});
