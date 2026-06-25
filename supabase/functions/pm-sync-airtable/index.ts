// ════════════════════════════════════════════════════════════════
// 🔄 PM-SYNC-AIRTABLE · Edge Function
// Sincroniza la base Airtable de rentas → Supabase pm_*
//
/**
 * ═════════════════════════════════════════════════════════════════
 * Property Manager — MIRROR SYNC desde Airtable
 * ═════════════════════════════════════════════════════════════════
 *
 * MAPEO OFICIAL (NO MEZCLAR FUENTES):
 *   🏠 Propiedades    ← "Datos x Casa" (option_id de Dirección)
 *   📅 Calendario     ← "Base de datos Tenant"
 *   🏡 Reservas       ← "Base de datos Tenant"
 *   👥 Inquilinos     ← "Base de datos Tenant"
 *   💰 Pagos          ← "Pagos Rentas"
 *   💸 Gastos         ← "Gastos por Casa"
 *
 * LLAVES ESTABLES:
 *   pm_properties → airtable_address_id (option_id sel_xxx del select Dirección)
 *   pm_tenants/bookings/payments/expenses/units → external_id (record_id de Airtable,
 *     con prefijo: tenant-at-/booking-ten-/pay-/exp-/unit-). external_id ES la llave
 *     estable record-id (equivale al airtable_record_id del spec).
 *
 * REGLAS:
 * - SOLO syncProperties (bloque 1) INSERT/UPDATE pm_properties; los demás hacen LOOKUP
 *   por property_id. NUNCA crear propiedad desde Tenant/Pagos/Gastos.
 * - Soft delete: registro ausente en Airtable → active=false + archived_at (las propiedades
 *   además status=inactiva). Hard delete PROHIBIDO. Reaparece → active=true.
 *   Implementado con sello last_synced_at=nowISO por run + mirrorArchive() (no toca
 *   registros manuales: solo filas con external_id/airtable_address_id NOT NULL).
 * - address SIEMPRE LITERAL (.name del option); nunca derivar por código.
 * - pm_units se mantiene DEDUPLICADA (1 por unidad física addr+tipo), NO por record_id.
 * - Fallback: si las columnas del mirror no existen (migración 2026-06-22-mirror-sync.sql
 *   no aplicada), MIRROR=false y el sync corre como antes (no rompe el deploy).
 * - Idempotente.
 *
 * pm_properties  ← "Datos x Casa" (tblbSJ4K8e7mSHT5E),
 *                  mirror por sel_id de "Dirección"
 * pm_bookings    ← "Datos x Casa" (tblbSJ4K8e7mSHT5E), tenant_id por nombre exacto
 * pm_tenants     ← "Base de datos Tenant" (tblxEHBbGylH1aF2F) — SOLO esta fuente
 * pm_payments    ← "Pagos Rentas" (tblqJlSgnLNfn34dh), UNIQUE por external_id
 * pm_expenses    ← "Gastos por Casa" (tblsihpE31f116RCR)
 *
 * TABLAS QUE EXISTEN PERO NO SON FUENTE DE LOS 6 MÓDULOS:
 * - "Acceso a plataforma" (tblYrOKj2xOV1gAZe)          → pm_credentials (pestaña aparte)
 * - "Cuentas de wifi" (tblga4BybYVBBRCTu)              → enrich pm_properties
 * - "Gastos Por Plataforma" (tblrs9nCGsew8SvCR)        → pm_expenses (operativo) [DECISIÓN: entra]
 * - "Gastos Equipo" (tbl21GE6fjUdU4sxF)               → pm_payroll          [DECISIÓN: entra]
 * - "Gastos Aseo y Podada" (tblxfX2no190lvLYo)         → pm_expenses (aseo)  [DECISIÓN: entra]
 * - "Cronograma Tareas Juan Austin" (tblHrLZFet9CxFMxP) → pm_tasks (ops)
 *
 * REGLA: reservas (bookings) SOLO de "Datos x Casa" (booking-dxc-); su tenant_id se
 * resuelve por nombre EXACTO contra tenant-at-. Inquilinos = SOLO "Base de datos Tenant"
 * (tenant-at-). Si un inquilino de DxC no está en Tenant → warning inquilino_falta_en_tenant.
 */
//
// Tablas que sincroniza:
//   1. Datos x Casa        → pm_properties + pm_units + pm_bookings (+ warnings)
//   2. Base de datos Tenant → pm_tenants (tenant-at-, única fuente de inquilinos)
//   3. Pagos Rentas        → pm_payments (ingresos)
//   4. Gastos por casa     → pm_expenses (con observaciones, recibos, fecha)
//   5. Acceso a plataforma → pm_credentials             [extra]
//   6. Cuentas de wifi     → enrichment de pm_properties [extra]
//   7. Gastos Plataforma/Equipo/Aseo → pm_expenses       [extra]
//   8. Cronograma Juan Austin → pm_tasks                 [extra]
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

// ── Mapeo nombres cortos (Pagos Rentas / Tenant) → dirección completa ──
// "Datos x Casa" usa direcciones completas; "Pagos Rentas" usa apodos cortos.
const HOUSE_NICKNAME_MAP: Record<string, string> = {
  "Barkbridge":   "4916 Barkbridge Trail, Austin, TX 78744",
  "Bartlett":     "311 Bartlett St, Marlin, TX 76661",
  "Bramble":      "512 Bramble Dr, Austin, TX 78745",
  "Capitol":      "407 Capitol Dr, Austin, TX 78753",
  "Capps":        "406 Capps St, Marlin, TX 76661",
  "Childress":    "9909 Childress Dr, Austin, TX 78753",
  "Dove Springs": "2315 Dove Springs Dr, Austin, TX 78744",
  "Echo":         "1100 Echo Ln, Austin, TX 78745",
  "Garden":       "1302 Garden Path Dr, Round Rock, TX 78664",
  "Idlewood":     "6107 Idlewood Cove, Austin, TX 78745",
  "Meadow":       "5702 Meadow Crest, Austin, TX 78744",
  "Michelle":     "5003 Michelle Ct, Austin, TX 78744",
  "Nesting Way":  "4905 Nesting Way, Austin, TX 78744",
  "Picnic":       "1607 Picnic Cove, Round Rock, TX 78664",
  "Shadow":       "6203 Shadow Bend, Austin, TX 78745",
  "Stonleigh":    "6504 Stonleigh Pl, Austin, TX 78744",
  "Virginia":     "902 Virginia Dr, Round Rock, TX 78664",
  "Bethune":      "7105 Bethune Ave, Austin, TX 78752"
};
// Lookup case-insensitive del apodo
const HOUSE_NICKNAME_LC: Record<string, string> = {};
for (const k of Object.keys(HOUSE_NICKNAME_MAP)) HOUSE_NICKNAME_LC[k.toLowerCase().trim()] = HOUSE_NICKNAME_MAP[k];

// Normaliza una dirección a una clave estable para hacer match entre tablas.
function normalizeAddress(addr: string | null): string {
  let s = (addr || "").toLowerCase();
  s = s.replace(/[,.]/g, " ");
  // Sufijos de calle → forma corta (consistente en ambos lados del match)
  s = s.replace(/\bdrive\b/g, "dr").replace(/\bcourt\b/g, "ct").replace(/\bplace\b/g, "pl")
       .replace(/\btrail\b/g, "trl").replace(/\blane\b/g, "ln").replace(/\bcove\b/g, "cv")
       .replace(/\bstreet\b/g, "st").replace(/\bavenue\b/g, "ave")
       .replace(/\bbnd\b/g, "bend");   // H: "6203 Shadow Bnd" ≡ "6203 Shadow Bend"
  // Quitar ciudad y estado
  s = s.replace(/\bround rock\b/g, " ").replace(/\baustin\b/g, " ").replace(/\bmarlin\b/g, " ")
       .replace(/\btexas\b/g, " ").replace(/\btx\b/g, " ");
  // Quitar zip de 5 dígitos
  s = s.replace(/\b\d{5}\b/g, " ");
  // Colapsar espacios
  return s.replace(/\s+/g, " ").trim();
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
// FIX 3: fecha del gasto. Usa "Fecha" exacta si está; si no, deriva del "Mes"
// (multiselect "enero".."diciembre", SIN año) usando el año del createdTime del
// registro y día 1. Devuelve null si no hay ni fecha ni mes parseable.
const MES_NUM: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10",
  noviembre: "11", diciembre: "12"
};
function expenseDate(fecha: any, mesCell: any, createdTime?: string): string | null {
  if (fecha) return fecha;                                    // Fecha exacta de Airtable
  const mesRaw = getMultiSel(mesCell)[0] || getSel(mesCell);  // "Mes" es multiselect
  if (!mesRaw) return null;
  const m = MES_NUM[mesRaw.trim().toLowerCase()];
  if (!m) return null;
  const year = (createdTime && /^\d{4}/.test(createdTime)) ? createdTime.slice(0, 4)
             : String(new Date().getFullYear());             // año estimado (Mes no trae año)
  return `${year}-${m}-01`;                                   // día 1 si no hay fecha exacta
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

// Lee las options {id, name} de un campo single-select vía Meta API.
// Devuelve null si la Meta API no está disponible (token sin scope schema.bases:read).
// Captura TODAS las opciones, incluidas las que aún no tienen filas (mirror real).
async function fetchFieldChoices(
  baseId: string, tableId: string, fieldId: string, token: string
): Promise<Array<{ id: string; name: string }> | null> {
  try {
    const r = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const data = await r.json();
    const t = (data.tables || []).find((x: any) => x.id === tableId);
    const f = (t?.fields || []).find((x: any) => x.id === fieldId);
    const choices = f?.options?.choices;
    if (!Array.isArray(choices)) return null;
    return choices.map((c: any) => ({ id: c.id, name: c.name }));
  } catch {
    return null;
  }
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
  // ── Archivado DESHABILITADO por defecto (anti-wipe) ──
  // Se HABILITA solo con env DISABLE_ARCHIVE=false (o body.archive=true para un test puntual).
  // Se fuerza OFF con body.archive=false. Env ausente ⇒ se asume "true" ⇒ archivado OFF.
  const DISABLE_ARCHIVE_ENV = (Deno.env.get("DISABLE_ARCHIVE") ?? "true").toLowerCase();
  let ARCHIVE_ENABLED = DISABLE_ARCHIVE_ENV === "false";
  if (body.archive === true) ARCHIVE_ENABLED = true;
  if (body.archive === false) ARCHIVE_ENABLED = false;
  console.log(`[pm-sync] archive config · DISABLE_ARCHIVE=${Deno.env.get("DISABLE_ARCHIVE") ?? "(unset→true)"} · body.archive=${body.archive ?? "(none)"} · ARCHIVE_ENABLED=${ARCHIVE_ENABLED}`);
  if (!ARCHIVE_ENABLED) console.log("[pm-sync] DISABLE_ARCHIVE=true detected → archivado OMITIDO este run (sync defensivo)");
  const airtable_token = body.airtable_token || Deno.env.get("AIRTABLE_API_KEY");
  const base_id = body.base_id || Deno.env.get("AIRTABLE_BASE_ID") || "appzEnsuy4qPT6iHj";
  if (!airtable_token) return json({ ok: false, error: "Falta airtable_token (body o AIRTABLE_API_KEY env)" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const startMs = Date.now();
  const stats: any = { properties: 0, units: 0, tenants: 0, bookings: 0, payments_in: 0, expenses_house: 0, expenses_operational: 0, expenses_cleaning: 0, payroll: 0, credentials: 0, wifi: 0, tasks: 0 };
  const errors: string[] = [];
  const todayISO = new Date().toISOString().slice(0, 10);
  // Colector de alertas de integridad de datos (pm_data_warnings)
  const warnings: any[] = [];
  const addWarn = (warning_type: string, entity_type: string, entity_id: string, property_id: string | null, details: any) => {
    warnings.push({ warning_type, entity_type, entity_id, property_id, details, dedup_key: `${warning_type}:${entity_id}`, resolved: false });
  };

  // Log inicio
  const { data: log } = await supabase.from("pm_sync_log").insert({
    source: "airtable",
    user_id: userId,
    status: "running"
  }).select().single();

  try {
    // ── MIRROR: helpers de soft-delete + sello de sincronización ──
    // nowISO sella cada upsert de este run; las filas no vistas (last_synced_at != nowISO)
    // se archivan (active=false). Fallback: si las columnas del mirror no existen aún
    // (migración no aplicada), MIRROR=false y el sync corre como antes (sin romper deploy).
    const nowISO = new Date().toISOString();
    let MIRROR = true;
    {
      const probe = await supabase.from("pm_payments").select("active,last_synced_at,archived_at").limit(1);
      if (probe.error) { MIRROR = false; errors.push("mirror cols ausentes (correr 2026-06-22-mirror-sync.sql): " + probe.error.message); }
    }
    const mirrorFields = () => MIRROR ? { active: true, last_synced_at: nowISO, archived_at: null } : {};
    // Probe aparte para las tablas auxiliares (payroll/credentials/wifi/tasks): si su
    // migración (2026-06-23-mirror-sync-aux-tables.sql) no corrió, MIRROR_AUX=false y esas
    // tablas siguen sincronizando sin mirror (no rompe su sync).
    let MIRROR_AUX = MIRROR;
    if (MIRROR) {
      const pa = await supabase.from("pm_payroll").select("active,last_synced_at,archived_at").limit(1);
      if (pa.error) { MIRROR_AUX = false; errors.push("mirror AUX cols ausentes (correr 2026-06-23-mirror-sync-aux-tables.sql): " + pa.error.message); }
    }
    const mirrorFieldsAux = () => MIRROR_AUX ? { active: true, last_synced_at: nowISO, archived_at: null } : {};
    // Diagnóstico de archivado (pre-inicializado en 0 para que sea explícito cuando el archivado está OFF)
    const archivedCount: Record<string, number> = {
      pm_properties: 0, pm_units: 0, pm_tenants: 0, pm_bookings: 0, pm_payments: 0, pm_expenses: 0,
      pm_payroll: 0, pm_credentials: 0, pm_wifi_credentials: 0, pm_tasks: 0
    };
    const archivedSamples: Record<string, any[]> = {};
    // Archiva (soft-delete) las filas de Airtable que ya no aparecieron en este run.
    // GATING (protección anti-wipe):
    //   - sourceOK=false (la fuente tuvo error/upsert incompleto) → NO archiva.
    //   - ARCHIVE_ENABLED=false (sync defensivo) → NO archiva.
    //   - dry_run / !MIRROR → NO archiva.
    // Solo toca filas con llave de Airtable (NOT NULL) → nunca archiva registros manuales.
    // Filtro robusto en 2 pasos (lt + is null), evitando timestamps dentro de .or().
    const mirrorArchive = async (table: string, keyCol: string, activeCol: string, sourceOK: boolean) => {
      if (dry_run || !MIRROR) return;
      if (!ARCHIVE_ENABLED) return;   // archivado globalmente OFF (ya se logueó arriba); sin ruido por tabla
      if (!sourceOK) { errors.push(`archive ${table}: OMITIDO (la fuente no sincronizó completa → se evita wipe)`); return; }
      // Muestra de hasta 3 que se archivarían (para diagnóstico)
      const baseSel = () => supabase.from(table).select(`id, ${keyCol}`).eq(activeCol, true).not(keyCol, "is", null);
      const sampleA = await baseSel().lt("last_synced_at", nowISO).limit(3);
      const sampleB = await baseSel().is("last_synced_at", null).limit(3);
      archivedSamples[table] = [...(sampleA.data || []), ...(sampleB.data || [])].slice(0, 3).map((r: any) => r[keyCol] || r.id);
      const upd: any = { archived_at: nowISO }; upd[activeCol] = false;
      let total = 0;
      // (a) sello viejo (sincronizadas en un run anterior, ausentes en este)
      const a = await supabase.from(table).update(upd, { count: "exact" }).eq(activeCol, true).not(keyCol, "is", null).lt("last_synced_at", nowISO);
      if (a.error) { errors.push(`archive ${table} (lt): ${a.error.message}`); } else total += a.count || 0;
      // (b) nunca selladas (last_synced_at NULL) — legacy sin sincronizar este run
      const b = await supabase.from(table).update(upd, { count: "exact" }).eq(activeCol, true).not(keyCol, "is", null).is("last_synced_at", null);
      if (b.error) { errors.push(`archive ${table} (null): ${b.error.message}`); } else total += b.count || 0;
      archivedCount[table] = total;
      (stats as any)[`${table}_archived`] = total;
    };

    // ════════════════════════════════════════════════════════════
    // 1) DATOS X CASA → properties + units + bookings
    // ════════════════════════════════════════════════════════════
    const datosCasa = await fetchAllRecords(base_id, TABLE_IDS.datos_casa, airtable_token);

    // 1a) PROPIEDADES = MIRROR de las options del single-select "Dirección".
    //     Llave estable = airtable_address_id (sel_xxx). address = .name LITERAL.
    //     Las options se leen de la METADATA (así capturamos opciones sin filas aún).
    //     Fallback: si la Meta API no está disponible, se derivan de las filas
    //     (no captura opciones sin filas; se loguea).
    let propertiesMetaOK = true;   // false si caemos al fallback (no podemos confiar el universo completo)
    let dirChoices = await fetchFieldChoices(base_id, TABLE_IDS.datos_casa, F.dxc_direccion, airtable_token);
    if (!dirChoices) {
      propertiesMetaOK = false;     // ⚠️ sin Meta API NO archivamos propiedades (evita wipe)
      const seen: Record<string, string> = {};
      for (const r of datosCasa) { const c: any = r.fields?.[F.dxc_direccion]; if (c?.id && !seen[c.id]) seen[c.id] = c.name; }
      dirChoices = Object.entries(seen).map(([id, name]) => ({ id, name }));
      errors.push("meta API Dirección no disponible (scope schema.bases:read): fallback a filas; NO se archivan propiedades este run.");
    }

    // Tipos + #habitaciones + zona/drive por sel_id (para derivar modelo y enriquecer)
    const tiposBySel: Record<string, Set<string>> = {};
    const habBySel: Record<string, boolean> = {};
    const zoneBySel: Record<string, string | null> = {};
    const driveBySel: Record<string, string | null> = {};
    for (const r of datosCasa) {
      const c: any = r.fields?.[F.dxc_direccion]; if (!c?.id) continue;
      if (!tiposBySel[c.id]) tiposBySel[c.id] = new Set<string>();
      for (const t of getMultiSel(r.fields?.[F.dxc_tipo])) { const v = (t || "").trim(); if (v) tiposBySel[c.id].add(v); }
      const nh = getSel(r.fields?.[F.dxc_habs]); if (nh && parseInt(nh) >= 1) habBySel[c.id] = true;
      if (!(c.id in zoneBySel)) zoneBySel[c.id] = inferZone(getSel(r.fields?.[F.dxc_ubicacion]));
      if (!driveBySel[c.id] && r.fields?.[F.dxc_drive]) driveBySel[c.id] = r.fields[F.dxc_drive];
    }

    // MIGRACIÓN: vincular filas existentes a su sel_id por address EXACTO o NORMALIZADO
    // (one-time, idempotente). Evita insertar duplicados de las 18 ya cargadas.
    if (!dry_run) {
      const { data: existingProps } = await supabase.from("pm_properties").select("id, address, airtable_address_id");
      const unlinkedByAddr: Record<string, string> = {};
      const unlinkedByNorm: Record<string, string> = {};
      for (const p of existingProps || []) {
        if (p.airtable_address_id) continue;                 // ya vinculada
        if (p.address) unlinkedByAddr[p.address] = p.id;
        const n = normalizeAddress(p.address || ""); if (n && !unlinkedByNorm[n]) unlinkedByNorm[n] = p.id;
      }
      for (const c of dirChoices) {
        if (!c.id || !c.name) continue;
        const pid = unlinkedByAddr[c.name] || unlinkedByNorm[normalizeAddress(c.name)];
        if (pid) await supabase.from("pm_properties").update({ airtable_address_id: c.id }).eq("id", pid).is("airtable_address_id", null);
      }
    }

    // Payloads (ANTI-FANTASMA: nunca id null; address = .name LITERAL, sin transformar).
    const propsArr = dirChoices.filter(c => c.id && c.name).map(c => {
      const tipos = Array.from(tiposBySel[c.id] || []);
      const { zip, city, state } = extractZip(c.name);
      // Conteos derivados del "Tipo alojamiento" (identidad de cada unidad).
      const nEstudios = tipos.filter(t => /estudio/i.test(t)).length;
      const nAptos = tipos.filter(t => /apart|apto/i.test(t)).length;
      const hayHab = tipos.some(t => /habitaci/i.test(t)) || !!habBySel[c.id];
      const nCasa = tipos.some(t => /casa\s*completa/i.test(t)) ? 1 : 0;
      // rental_model derivado (vocabulario nuevo): casa+otros→mixta · estudios/aptos→por_unidades
      //   · solo habitaciones→por_habitaciones · solo casa→casa_completa.
      const rental_model = (nCasa > 0 && (nEstudios + nAptos > 0 || hayHab)) ? "mixta"
        : (nEstudios + nAptos > 0) ? "por_unidades"
        : hayHab ? "por_habitaciones"
        : "casa_completa";
      return {
        airtable_address_id: c.id,
        external_id: "addr-" + slugify(c.name),
        address_normalized: normalizeAddress(c.name),  // helper read-side (pagos/gastos)
        name: c.name,
        address: c.name,                               // ← LITERAL del option de Airtable
        city, state, zip,
        zone: zoneBySel[c.id] || null,
        drive_url: driveBySel[c.id] || null,
        cantidad_estudios: nEstudios,
        cantidad_aptos: nAptos,
        rentada_por_habitaciones: hayHab,
        cantidad_casa_completa: nCasa,
        rental_model,                                  // BUG5: el sync ahora setea el modelo derivado
        status: "activa",
        active: true,                                  // presente en Airtable ⇒ viva (reactiva si estaba inactiva)
        ...(MIRROR ? { last_synced_at: nowISO, archived_at: null } : {}),
        updated_at: nowISO
      };
    });
    let propsUpsertOK = true;
    if (!dry_run && propsArr.length) {
      const { error } = await supabase.from("pm_properties").upsert(propsArr, { onConflict: "airtable_address_id" });
      if (error) { errors.push("properties: " + error.message); propsUpsertOK = false; }
    }
    // ARCHIVAR solo si Meta OK + upsert OK + hubo options (anti-wipe).
    const propertiesSourceOK = propertiesMetaOK && propsUpsertOK && propsArr.length > 0;
    await mirrorArchive("pm_properties", "airtable_address_id", "active", propertiesSourceOK);
    if (!dry_run && MIRROR) {
      await supabase.from("pm_properties").update({ status: "inactiva" }).eq("active", false).eq("status", "activa");
      await supabase.from("pm_properties").update({ status: "activa" }).eq("active", true).eq("status", "inactiva");
    }
    stats.properties = propsArr.length;

    // Map address / sel_id → property_id
    const { data: dbProps } = await supabase.from("pm_properties").select("id, external_id, address, airtable_address_id");
    const propIdByExtId: Record<string, string> = {};
    const propIdByAddr: Record<string, string> = {};
    const propIdByNormAddr: Record<string, string> = {};   // dirección normalizada → property_id
    const propIdBySel: Record<string, string> = {};        // airtable_address_id (sel_xxx) → property_id
    (dbProps || []).forEach((p: any) => {
      if (p.external_id) propIdByExtId[p.external_id] = p.id;
      if (p.address) propIdByAddr[p.address] = p.id;
      if (p.airtable_address_id) propIdBySel[p.airtable_address_id] = p.id;
      const n = normalizeAddress(p.address || "");
      if (n) propIdByNormAddr[n] = p.id;
    });
    stats.addresses_normalized = Object.keys(propIdByNormAddr).length;
    let nicknameResolved = 0;

    // Lookup tolerante:
    //  1) apodo corto (HOUSE_NICKNAME_MAP) → dirección completa → normalizada → match exacto
    //  2) substring sobre direcciones normalizadas
    //  3) fallback histórico: external_id por slug, luego substring por slug
    const findPropId = (name: string | null): string | null => {
      if (!name) return null;
      const full = HOUSE_NICKNAME_LC[name.toLowerCase().trim()] || name;
      const usedNickname = !!HOUSE_NICKNAME_LC[name.toLowerCase().trim()];
      const norm = normalizeAddress(full);
      if (norm && propIdByNormAddr[norm]) { if (usedNickname) nicknameResolved++; return propIdByNormAddr[norm]; }
      if (norm) {
        for (const pn of Object.keys(propIdByNormAddr)) {
          if (pn.includes(norm) || norm.includes(pn)) { if (usedNickname) nicknameResolved++; return propIdByNormAddr[pn]; }
        }
      }
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
      // La propiedad se identifica por sel_id de Dirección (estable); fallbacks literal/normalizado.
      const selId = (r.fields?.[F.dxc_direccion] as any)?.id;
      const propId = (selId && propIdBySel[selId]) || propIdByAddr[addr] || propIdByNormAddr[normalizeAddress(addr)];
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
        is_active: true,
        ...(MIRROR ? { last_synced_at: nowISO, archived_at: null } : {})
      };
    }
    const unitsArr = Object.values(unitsByKey);
    let unitsUpsertOK = true;
    if (!dry_run && unitsArr.length) {
      const { error } = await supabase.from("pm_units").upsert(unitsArr, { onConflict: "external_id" });
      if (error) { errors.push("units: " + error.message); unitsUpsertOK = false; }
    }
    // Solo archiva si propiedades OK (units cuelgan de props) + units OK + hubo filas.
    await mirrorArchive("pm_units", "external_id", "is_active", propertiesSourceOK && unitsUpsertOK && unitsArr.length > 0);
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

    // ════════════════════════════════════════════════════════════
    // 2) TENANTS = SOLO "Base de datos Tenant" (tenant-at-, datos ricos).
    //    Match de pagos/bookings por nombre EXACTO (case-insensitive, sin fuzzy).
    //    Carlos limpia los nombres en Airtable para que calcen con Pagos/DxC.
    // ════════════════════════════════════════════════════════════
    const tenantsAt = await fetchAllRecords(base_id, TABLE_IDS.tenants, airtable_token);
    const tenantNamesAtLc = new Set<string>();
    const allTenants: any[] = [];
    for (const r of tenantsAt) {
      const name = r.fields?.[F.ten_nombre];
      if (!name) continue;
      tenantNamesAtLc.add(name.toString().trim().toLowerCase());
      allTenants.push({
        external_id: "tenant-at-" + r.id,
        full_name: name,
        phone: r.fields?.[F.ten_telefono] || null,
        source: inferBookingType([getSel(r.fields?.[F.ten_fuente]) || ""]),
        client_state: getMultiSel(r.fields?.[F.ten_estado])[0] || null,
        ai_summary: (r.fields?.[F.ten_ai_summary]?.value || null),
        notes: r.fields?.[F.ten_comentario] || null,
        ...mirrorFields()
      });
    }
    let tenantsUpsertOK = true;
    if (!dry_run && allTenants.length) {
      for (let i = 0; i < allTenants.length; i += 50) {
        const { error } = await supabase.from("pm_tenants").upsert(allTenants.slice(i, i + 50), { onConflict: "external_id" });
        if (error) { errors.push("tenants chunk " + i + ": " + error.message); tenantsUpsertOK = false; break; }
      }
    }
    // Archiva lo no sellado este run (incluye tenant-name- legacy del deploy anterior). Anti-wipe.
    await mirrorArchive("pm_tenants", "external_id", "active", tenantsUpsertOK && tenantsAt.length > 0 && allTenants.length > 0);
    stats.tenants = allTenants.length;
    stats.tenants_at = tenantNamesAtLc.size;

    // Re-leer tenants para ID real. Mapa nombre→id SOLO desde tenant-at-* (match exacto).
    const { data: dbTen } = await supabase.from("pm_tenants").select("id, external_id, full_name");
    const tenantIdRealByExtId: Record<string, string> = {};
    const tenantIdRealByName: Record<string, string> = {};
    (dbTen || []).forEach((t: any) => {
      if (t.external_id) tenantIdRealByExtId[t.external_id] = t.id;
      if (t.full_name && typeof t.external_id === "string" && t.external_id.startsWith("tenant-at-")) {
        tenantIdRealByName[t.full_name.toLowerCase()] = t.id;
      }
    });
    void tenantIdRealByExtId;

    // (A3) Inquilinos en "Datos x Casa" que NO están en "Base de datos Tenant" → warning
    //      inquilino_falta_en_tenant (para que Carlos los agregue en Airtable Tenant).
    const seenOrphanTen = new Set<string>();
    let tenantsMissing = 0;
    for (const r of datosCasa) {
      const nm = (r.fields?.[F.dxc_inquilino] || "").toString().trim();
      if (!nm) continue;
      const lc = nm.toLowerCase();
      if (tenantNamesAtLc.has(lc) || seenOrphanTen.has(lc)) continue;
      seenOrphanTen.add(lc);
      tenantsMissing++;
      addWarn("inquilino_falta_en_tenant", "tenant", "tenant-name-" + slugify(nm), findPropId(getSel(r.fields?.[F.dxc_direccion])),
        { inquilino: nm, casa: getSel(r.fields?.[F.dxc_direccion]) || null,
          detalle: "Inquilino en 'Datos x Casa' sin registro en 'Base de datos Tenant'. Agregalo en Tenant para vincular pagos/reservas." });
    }
    stats.tenants_missing_in_tenant = tenantsMissing;

    // ════════════════════════════════════════════════════════════
    // 3) Recorrida de Datos x Casa SOLO para warnings de integridad.
    //    Las reservas se crean únicamente en 3b (Base de datos Tenant).
    // ════════════════════════════════════════════════════════════
    const today0 = new Date().toISOString().slice(0, 10);
    // Dedup de reservas: clave (unit_id + nombre inquilino + check_in)
    const bookingKeys = new Set<string>();
    const bkKey = (uid: string, nm: string | null, ci: string | null) => `${uid}|${slugify(nm || "")}|${ci || ""}`;
    const dxcBookings: any[] = [];   // reservas creadas desde Datos x Casa (fuente única)
    let dxcDeduped = 0, dxcSinTenant = 0;
    // Status SIEMPRE por fechas (se ignora el campo Estado de Airtable).
    // Vocabulario interno activo/confirmado/finalizado ≡ active/upcoming/past
    // (se mantiene en español para no romper el frontend ni los joins).
    const deriveStatus = (ci: string | null, co: string | null): string => {
      if (ci && ci > today0) return "confirmado";            // upcoming
      if (co && co < today0) return "finalizado";            // past
      return "activo";                                       // active (ci<=hoy<=co o sin co)
    };
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
      const obs = r.fields?.[F.dxc_obs] || null;
      const modelo = getSel(r.fields?.[F.dxc_modelo]) || "";
      const checkOut = r.fields?.[F.dxc_fecha_out] || null;
      const estadoAt = getSel(r.fields?.[F.dxc_estado]) || "";

      // ── Warnings de integridad ──
      // (a) contrato vencido marcado Activo/Ocupada en Airtable
      if (checkOut && checkOut < todayISO && /activo|ocupad/i.test(estadoAt)) {
        addWarn("contrato_vencido_activo", "booking", "booking-dxc-" + r.id, unitInfo.property_id,
          { inquilino, casa: getSel(r.fields?.[F.dxc_direccion]), check_out: checkOut, estado_airtable: estadoAt });
      }
      // (g) check_in posterior a check_out
      if (checkOut && startDate > checkOut) {
        addWarn("fechas_invertidas", "booking", "booking-dxc-" + r.id, unitInfo.property_id,
          { inquilino, check_in: startDate, check_out: checkOut });
      }
      // (h) renta = 0
      if (!(r.fields?.[F.dxc_pago])) {
        addWarn("renta_cero", "unit", unitExtId, unitInfo.property_id,
          { inquilino, casa: getSel(r.fields?.[F.dxc_direccion]), tipo: getMultiSel(r.fields?.[F.dxc_tipo])[0] });
      }

      // ── BOOKING desde Datos x Casa (FUENTE ÚNICA de reservas) ──
      const bkk = bkKey(unitInfo.id, inquilino, startDate);
      if (bookingKeys.has(bkk)) { dxcDeduped++; }
      else {
        bookingKeys.add(bkk);
        // (B) tenant_id por nombre EXACTO contra tenant-at-; sin match → warning (booking igual se crea).
        if (!tenantId) {
          dxcSinTenant++;
          addWarn("booking_sin_tenant", "booking", "booking-dxc-" + r.id, unitInfo.property_id,
            { inquilino, casa: getSel(r.fields?.[F.dxc_direccion]), check_in: startDate,
              detalle: "Reserva de Datos x Casa cuyo inquilino no existe (nombre exacto) en 'Base de datos Tenant'." });
        }
        dxcBookings.push({
          external_id: "booking-dxc-" + r.id,
          unit_id: unitInfo.id,
          property_id: unitInfo.property_id,
          tenant_id: tenantId,
          booking_type: inferBookingType(fuentes),
          start_date: startDate,
          end_date: checkOut,
          rent_amount: r.fields?.[F.dxc_pago] || 0,
          rent_period: "mensual",
          payment_day: getSel(r.fields?.[F.dxc_tiempo_pago]) || null,
          platform_account: platformAcc,
          status: deriveStatus(startDate, checkOut),
          notes: obs
        });
      }
      void modelo;
    }

    // (b) Unidad Ocupada sin inquilino
    for (const r of datosCasa) {
      const estadoAt = getSel(r.fields?.[F.dxc_estado]) || "";
      const inq = r.fields?.[F.dxc_inquilino];
      if (/ocupad/i.test(estadoAt) && !inq) {
        const addr = getSel(r.fields?.[F.dxc_direccion]);
        addWarn("ocupada_sin_inquilino", "unit", "unit-" + slugify(addr || "") + "-" + slugify(getMultiSel(r.fields?.[F.dxc_tipo])[0] || ""), propIdByNormAddr[normalizeAddress(addr || "")] || null,
          { casa: addr, tipo: getMultiSel(r.fields?.[F.dxc_tipo])[0], estado_airtable: estadoAt });
      }
    }

    // ════════════════════════════════════════════════════════════
    // 3b) UPSERT de reservas (Datos x Casa = fuente única).
    //     Cualquier booking-* ausente del run (incluye booking-ten- legacy)
    //     se archiva (anti-wipe gated) y pasa a status='finalizado'.
    // ════════════════════════════════════════════════════════════
    const dxcBookingsM = dxcBookings.map(b => ({ ...b, ...mirrorFields() }));
    let bookingsUpsertOK = true;
    if (!dry_run && dxcBookingsM.length) {
      for (let i = 0; i < dxcBookingsM.length; i += 50) {
        const { error } = await supabase.from("pm_bookings").upsert(dxcBookingsM.slice(i, i + 50), { onConflict: "external_id" });
        if (error) { errors.push("dxc bookings chunk " + i + ": " + error.message); bookingsUpsertOK = false; break; }
      }
    }
    // Solo archiva si DxC trajo filas, hubo bookings y NINGÚN chunk falló (anti-wipe parcial).
    await mirrorArchive("pm_bookings", "external_id", "active", bookingsUpsertOK && datosCasa.length > 0 && dxcBookingsM.length > 0);
    if (!dry_run && MIRROR && ARCHIVE_ENABLED) {
      await supabase.from("pm_bookings").update({ status: "finalizado" })
        .eq("active", false).in("status", ["activo", "confirmado"]);
    }
    stats.bookings = dxcBookings.length;
    stats.bookings_deduped = dxcDeduped;
    stats.bookings_sin_tenant = dxcSinTenant;
    console.log(`[pm-sync] pm_bookings (Datos x Casa): ${dxcBookings.length} nuevas · ${dxcDeduped} dedup · ${dxcSinTenant} sin tenant`);

    // ════════════════════════════════════════════════════════════
    // 4) PAGOS (Pagos Rentas → ingresos)
    // ════════════════════════════════════════════════════════════
    try {
      const pagos = await fetchAllRecords(base_id, TABLE_IDS.pagos, airtable_token);
      // (C) Reservas activas para vincular pago→booking por tenant+property+ventana de fechas.
      //     En dry_run los booking-dxc- nuevos aún no están upserteados (warnings pueden sobre-reportar).
      const { data: activeBookings } = await supabase.from("pm_bookings")
        .select("id, tenant_id, property_id, start_date, end_date").eq("active", true);
      const findBookingId = (tid: string | null, pid: string | null, paidAt: string | null): string | null => {
        if (!tid || !pid || !paidAt) return null;
        const b = (activeBookings || []).find((x: any) =>
          x.tenant_id === tid && x.property_id === pid &&
          (x.start_date || "") <= paidAt && (!x.end_date || paidAt <= x.end_date));
        return b ? b.id : null;
      };
      const paymentsIn: any[] = [];
      let paysLinked = 0, paysUnlinked = 0, paysSkippedNoDate = 0, paysSinBooking = 0, paysSinTenant = 0;
      const unlinkedCasas: Record<string, number> = {};
      for (const r of pagos) {
        // (E) Sin "Fecha de Pago" no se crea el pago (skip + counter).
        const fechaPago = r.fields?.[F.pag_fecha] || null;
        if (!fechaPago) { paysSkippedNoDate++; continue; }
        const casaName = getSel(r.fields?.[F.pag_casa]);
        const propId = findPropId(casaName);
        if (propId) paysLinked++;
        else {
          paysUnlinked++;
          if (casaName) unlinkedCasas[casaName] = (unlinkedCasas[casaName] || 0) + 1;
          console.warn(`[pm-sync] ⚠️ pago SIN vincular · Casa="${casaName || "(vacío)"}" → property_id NULL`);
          // (c) pago sin casa válida
          addWarn("pago_sin_casa", "payment", "pay-" + r.id, null,
            { casa_airtable: casaName, inquilino: r.fields?.[F.pag_inq] || null, monto: r.fields?.[F.pag_monto] || null });
        }
        const tipo = getSel(r.fields?.[F.pag_tipo]);
        const unitId = (propId && tipo) ? (unitIdByPropName[`${propId}|${slugify(tipo)}`] || null) : null;
        const inq = r.fields?.[F.pag_inq] || "";
        // (D) Match EXACTO de nombre completo → tenant-at-* (sin fuzzy). Sin match → warning.
        const tenantId = inq ? (tenantIdRealByName[inq.toLowerCase()] || null) : null;
        if (inq && !tenantId) {
          paysSinTenant++;
          addWarn("pago_sin_tenant", "payment", "pay-" + r.id, propId,
            { inquilino: inq, casa_airtable: casaName, monto: r.fields?.[F.pag_monto] || null,
              detalle: "Nombre de pago sin inquilino idéntico en 'Base de datos Tenant'." });
        }
        // (C) Vincular pago a reserva activa; sin match → warning pago_sin_booking.
        const bookingId = findBookingId(tenantId, propId, fechaPago);
        if (!bookingId) {
          paysSinBooking++;
          addWarn("pago_sin_booking", "payment", "pay-" + r.id, propId,
            { inquilino: inq, casa_airtable: casaName, paid_at: fechaPago, monto: r.fields?.[F.pag_monto] || null,
              detalle: "Pago sin reserva activa que cubra la fecha (tenant+property+start≤paid_at≤end)." });
        }
        const { month, year } = { month: getSel(r.fields?.[F.pag_mes]), year: (() => { const y = getSel(r.fields?.[F.pag_año]); return y ? parseInt(y) : null; })() };
        paymentsIn.push({
          external_id: "pay-" + r.id,
          booking_id: bookingId,
          property_id: propId,
          unit_id: unitId,
          tenant_id: tenantId,
          type: "ingreso",
          category: "renta",
          concept: `${inq} · ${month || ""} ${year || ""}`.trim(),
          amount: r.fields?.[F.pag_monto] || 0,
          paid_at: fechaPago,
          month, year: isNaN(year as any) ? null : year,
          platform: getSel(r.fields?.[F.pag_plat]),
          casa_nickname: casaName || null,                 // FIX4: preserva el nombre de casa de Airtable
          payment_method: r.fields?.[F.pag_obs] || null,
          proof_url: getAttachUrl(r.fields?.[F.pag_comprob]),
          status: "pagado",
          notes: r.fields?.[F.pag_obs] || null
        });
      }
      const paymentsInM = paymentsIn.map(p => ({ ...p, ...mirrorFields() }));
      let paymentsUpsertOK = true;
      if (!dry_run && paymentsInM.length) {
        for (let i = 0; i < paymentsInM.length; i += 50) {
          const { error } = await supabase.from("pm_payments").upsert(paymentsInM.slice(i, i + 50), { onConflict: "external_id" });
          if (error) { errors.push("pagos chunk " + i + ": " + error.message); paymentsUpsertOK = false; break; }
        }
      }
      // Solo archiva si Pagos trajo filas, hubo pagos y ningún chunk falló (anti-wipe parcial).
      await mirrorArchive("pm_payments", "external_id", "active", paymentsUpsertOK && pagos.length > 0 && paymentsInM.length > 0);
      stats.payments_in = paymentsIn.length;
      stats.payments_linked = paysLinked;
      stats.payments_unlinked = paysUnlinked;
      stats.payments_unlinked_casas = unlinkedCasas;
      stats.payments_nickname_resolved = nicknameResolved;
      stats.payments_skipped_no_date = paysSkippedNoDate;
      stats.payments_sin_booking = paysSinBooking;
      stats.payments_sin_tenant = paysSinTenant;
      console.log(`[pm-sync] pm_payments: ${paymentsIn.length} pagos · ${paysLinked} vinculados · ${paysUnlinked} sin vincular · ${paysSkippedNoDate} sin fecha (omitidos) · ${paysSinBooking} sin booking · ${paysSinTenant} sin tenant · ${nicknameResolved} resueltos vía apodo`);
      if (paysUnlinked) console.warn(`[pm-sync] ⚠️ Casas sin match:`, JSON.stringify(unlinkedCasas));
    } catch (e: any) { errors.push("pagos: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 5) GASTOS POR CASA → pm_expenses (category='house')
    // ════════════════════════════════════════════════════════════
    try {
      const gastos = await fetchAllRecords(base_id, TABLE_IDS.gastos_casa, airtable_token);
      // (H) Casas vendidas / fuera del sistema: sus gastos no matchean ninguna propiedad
      //     y se archivan como legacy (active=false) para que no ensucien el dashboard.
      const LEGACY_SOLD = new Set(
        ["1109 Arcadia Ave", "14808 Cervin Cove", "3704 Commerce St", "5802 Blythewood Dr"].map(a => normalizeAddress(a))
      );
      const exp: any[] = [];
      let legacyArchived = 0;
      for (const r of gastos) {
        const gDir = r.fields?.[F.gst_dir];
        const gPropId = findPropId(gDir);
        const isLegacy = !gPropId && LEGACY_SOLD.has(normalizeAddress(gDir || ""));
        if (isLegacy) legacyArchived++;
        // (f) gasto sin casa — legacy vs a-corregir
        if (!gPropId) addWarn(isLegacy ? "gasto_sin_propiedad_legacy" : "gasto_sin_casa", "expense", "exp-house-" + r.id, null,
          { casa_airtable: gDir || null, tipo: getSel(r.fields?.[F.gst_tipo]), monto: r.fields?.[F.gst_valor] || null,
            ...(isLegacy ? { detalle: "Casa vendida/fuera del sistema → gasto archivado como legacy." } : {}) });
        exp.push({
          external_id: "exp-house-" + r.id,
          category: "house",
          subcategory: getSel(r.fields?.[F.gst_tipo]) || null,
          property_id: gPropId,
          amount: r.fields?.[F.gst_valor] || 0,
          expense_date: expenseDate(r.fields?.[F.gst_fecha], r.fields?.[F.gst_mes], r.createdTime),
          month: getMultiSel(r.fields?.[F.gst_mes])[0]?.toLowerCase() || null,
          description: getSel(r.fields?.[F.gst_tipo]) || "Gasto casa",
          invoice_url: r.fields?.[F.gst_drive] || getAttachUrl(r.fields?.[F.gst_factura]),
          paid: true,
          notes: r.fields?.[F.gst_obs] || null,
          __legacy: isLegacy
        });
      }
      if (!dry_run && exp.length) {
        for (let i = 0; i < exp.length; i += 50) {
          const { error } = await supabase.from("pm_expenses").upsert(exp.slice(i, i + 50).map(x => {
            const { __legacy, ...row } = x;
            return (__legacy && MIRROR)
              ? { ...row, active: false, archived_at: nowISO, last_synced_at: nowISO }   // legacy: archivado
              : { ...row, ...mirrorFields() };
          }), { onConflict: "external_id" });
          if (error) { errors.push("gastos_casa chunk " + i + ": " + error.message); break; }
        }
      }
      stats.expenses_house = exp.length;
      stats.expenses_house_legacy_archived = legacyArchived;
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
          const { error } = await supabase.from("pm_expenses").upsert(exp.slice(i, i + 50).map(x => ({ ...x, ...mirrorFields() })), { onConflict: "external_id" });
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
          const { error } = await supabase.from("pm_expenses").upsert(exp.slice(i, i + 50).map(x => ({ ...x, ...mirrorFields() })), { onConflict: "external_id" });
          if (error) { errors.push("gastos_aseo chunk " + i + ": " + error.message); break; }
        }
      }
      stats.expenses_cleaning = exp.length;
    } catch (e: any) { errors.push("gastos_aseo: " + e.message); }

    // Soft-delete de gastos ausentes — SOLO si las 3 fuentes de gastos sincronizaron ok
    // (si alguna falló, no archivamos para no marcar como ausentes gastos que no se leyeron).
    const expensesSourceOK = !errors.some(e => /gastos_|expenses|pm_expenses/i.test(e));
    await mirrorArchive("pm_expenses", "external_id", "active", expensesSourceOK);

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
      const rowsM = rows.map(x => ({ ...x, ...mirrorFieldsAux() }));
      let payrollOK = true;
      if (!dry_run && rowsM.length) {
        const { error } = await supabase.from("pm_payroll").upsert(rowsM, { onConflict: "external_id" });
        if (error) { errors.push("payroll: " + error.message); payrollOK = false; }
      }
      await mirrorArchive("pm_payroll", "external_id", "active", MIRROR_AUX && payrollOK && rows.length > 0);
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
      const credsM = creds.map(x => ({ ...x, ...mirrorFieldsAux() }));
      let credsOK = true;
      if (!dry_run && credsM.length) {
        const { error } = await supabase.from("pm_credentials").upsert(credsM, { onConflict: "external_id" });
        if (error) { errors.push("credentials: " + error.message); credsOK = false; }
      }
      await mirrorArchive("pm_credentials", "external_id", "active", MIRROR_AUX && credsOK && creds.length > 0);
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
      const wifiRowsM = wifiRows.map(x => ({ ...x, ...mirrorFieldsAux() }));
      let wifiOK = true;
      if (!dry_run && wifiRowsM.length) {
        const { error } = await supabase.from("pm_wifi_credentials").upsert(wifiRowsM, { onConflict: "external_id" });
        if (error) { errors.push("wifi_credentials: " + error.message); wifiOK = false; }
      }
      await mirrorArchive("pm_wifi_credentials", "external_id", "active", MIRROR_AUX && wifiOK && wifiRows.length > 0);
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
            return casa ? (propIdByNormAddr[normalizeAddress(casa)] || null) : null;
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
      const tasksM = tasks.map(x => ({ ...x, ...mirrorFieldsAux() }));
      let tasksOK = true;
      if (!dry_run && tasksM.length) {
        for (let i = 0; i < tasksM.length; i += 50) {
          const { error } = await supabase.from("pm_tasks").upsert(tasksM.slice(i, i + 50), { onConflict: "external_id" });
          if (error) { errors.push("tasks chunk " + i + ": " + error.message); tasksOK = false; break; }
        }
      }
      await mirrorArchive("pm_tasks", "external_id", "active", MIRROR_AUX && tasksOK && tasks.length > 0);
      stats.tasks = tasks.length;
    } catch (e: any) { errors.push("cronograma: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // (i) Inquilino duplicado: mismo nombre + misma casa + fechas solapadas
    // ════════════════════════════════════════════════════════════
    try {
      const byKey: Record<string, any[]> = {};
      for (const r of datosCasa) {
        const inq = r.fields?.[F.dxc_inquilino]; const ci = r.fields?.[F.dxc_fecha_in];
        if (!inq || !ci) continue;
        const addr = getSel(r.fields?.[F.dxc_direccion]) || "";
        const k = slugify(inq) + "|" + slugify(addr);
        (byKey[k] = byKey[k] || []).push({ recId: r.id, ci, co: r.fields?.[F.dxc_fecha_out] || "9999-12-31", inq, addr, propId: propIdByNormAddr[normalizeAddress(addr)] || null });
      }
      for (const k of Object.keys(byKey)) {
        const arr = byKey[k]; if (arr.length < 2) continue;
        for (let a = 0; a < arr.length; a++) for (let b = a + 1; b < arr.length; b++) {
          if (arr[a].ci <= arr[b].co && arr[b].ci <= arr[a].co) {  // solapan
            addWarn("inquilino_duplicado", "booking", "booking-dxc-" + arr[b].recId, arr[b].propId,
              { inquilino: arr[a].inq, casa: arr[a].addr, periodo_a: `${arr[a].ci}→${arr[a].co}`, periodo_b: `${arr[b].ci}→${arr[b].co}` });
          }
        }
      }
    } catch (e: any) { errors.push("dup-check: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // Persistir alertas de datos + auto-resolver las ya corregidas
    // ════════════════════════════════════════════════════════════
    // Dedupe por dedup_key: un upsert con dedup_keys repetidos en el MISMO batch
    // falla ("cannot affect row a second time"). Esto antes impedía escribir warnings.
    const warnMap: Record<string, any> = {};
    for (const w of warnings) warnMap[w.dedup_key] = w;
    const uniqWarnings = Object.values(warnMap);
    stats.data_warnings = uniqWarnings.length;
    if (!dry_run) {
      try {
        const nowISO = new Date().toISOString();
        const detectedKeys = uniqWarnings.map((w: any) => w.dedup_key);
        for (let i = 0; i < uniqWarnings.length; i += 50) {
          const chunk = uniqWarnings.slice(i, i + 50).map((w: any) => ({ ...w, detected_at: nowISO, resolved: false, resolved_at: null }));
          const { error } = await supabase.from("pm_data_warnings").upsert(chunk, { onConflict: "dedup_key" });
          if (error) { errors.push("data_warnings: " + error.message); break; }
        }
        // Auto-resolver: unresolved cuyo dedup_key ya no se detecta
        let q = supabase.from("pm_data_warnings").update({ resolved: true, resolved_at: nowISO }).eq("resolved", false);
        if (detectedKeys.length) q = q.not("dedup_key", "in", `(${detectedKeys.map(x => `"${x}"`).join(",")})`);
        await q;
      } catch (e: any) { errors.push("data_warnings persist: " + e.message); }
    }
    console.log(`[pm-sync] data_warnings: ${warnings.length} detectadas`);

    // Diagnóstico de archivado (para detectar wipes falsos por tabla)
    const processedCount = {
      properties: stats.properties || 0,
      units: stats.units || 0,
      tenants: stats.tenants || 0,
      bookings: stats.bookings || 0,
      payments: stats.payments_in || 0,
      expenses: (stats.expenses_house || 0) + (stats.expenses_operational || 0) + (stats.expenses_cleaning || 0),
      payroll: stats.payroll || 0,
      credentials: stats.credentials || 0,
      wifi: stats.wifi || 0,
      tasks: stats.tasks || 0
    };

    // Cerrar log
    const status = errors.length === 0 ? "success" : "partial";
    if (log) {
      await supabase.from("pm_sync_log").update({
        status,
        records_synced: { ...stats, archivedCount, archive_enabled: ARCHIVE_ENABLED, mirror: MIRROR },
        error_message: errors.length ? errors.join("\n") : null,
        duration_ms: Date.now() - startMs,
        finished_at: new Date().toISOString()
      }).eq("id", log.id);
    }
    return json({
      ok: true, dry_run, archive_enabled: ARCHIVE_ENABLED, mirror: MIRROR,
      processedCount, archivedCount, archivedSamples,
      stats, errors, duration_ms: Date.now() - startMs
    });
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
