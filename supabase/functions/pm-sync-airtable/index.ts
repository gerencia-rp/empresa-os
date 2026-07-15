// ════════════════════════════════════════════════════════════════
// 🔄 PM-SYNC-AIRTABLE · Edge Function · BASE NUEVA (apptTKRYbx6gu701i)
// Sincroniza la base Airtable "limpia" de rentas → Supabase pm_*
//
/**
 * ═════════════════════════════════════════════════════════════════
 * Property Manager — MIRROR SYNC desde Airtable (esquema NUEVO)
 * ═════════════════════════════════════════════════════════════════
 *
 * La base nueva tiene 5 tablas con LINKED RECORDS reales (no texto/apodos),
 * por lo que se ELIMINA todo el fuzzy matching del esquema viejo:
 *   - sin HOUSE_NICKNAME_MAP, sin normalizeAddress para pagos
 *   - sin match de inquilino por nombre
 *   - pm_payments resuelve tenant/property/booking por los LINKED RECORD IDs
 *     de Airtable (Inquilino, Casa, Reserva).
 *
 * MAPEO OFICIAL:
 *   🏠 pm_properties ← "Casas"      (tblisRfa2IW02ltCL) · 1 fila = 1 propiedad
 *   👥 pm_tenants    ← "Inquilinos" (tblXuFC9azHTZGjmE)
 *   🏡 pm_bookings   ← "Reservas"   (tblzz3fokkBprEpIm) · enlaza Casa + Inquilino
 *   🚪 pm_units      ← derivadas de "Reservas" (Casa + "Unidad / Habitación")
 *   💰 pm_payments   ← "Pagos"      (tbl5p63dUEhrzgHVJ) · LINKED Inquilino/Casa/Reserva
 *   💸 pm_expenses   ← "Gastos"     (tblGBQ5xn9Zp6YrTN) · LINKED Casa
 *
 * LLAVES ESTABLES (external_id = record_id de Airtable, con prefijo):
 *   casa-{recId} · tenant-{recId} · booking-{recId} · pay-{recId} · exp-{recId}
 *   unit-{casaRecId}-{slug(unidad)}  (compuesta, estable por unidad física)
 *   pm_properties.airtable_address_id = recId de la Casa (clave de upsert/mirror).
 *
 * REGLAS:
 * - SOLO la sección Casas hace INSERT/UPDATE de pm_properties; las demás hacen
 *   LOOKUP por linked record id → property_id. Nunca crear propiedad desde otra tabla.
 * - Re-vinculación one-time: si ya existe una propiedad con el mismo address_normalized
 *   (cargada desde la base vieja), se le setea airtable_address_id = recId de la Casa
 *   nueva para conservar su id (no romper el front). Idempotente.
 * - Soft delete: registro ausente en Airtable → active=false + archived_at (sello
 *   last_synced_at por run). GATED: solo con ARCHIVE_ENABLED y si la fuente sincronizó ok.
 * - El esquema nuevo NO tiene tablas para credenciales/wifi/nómina/cronograma → esas
 *   secciones se removieron de este sync (sin fuente).
 * - Idempotente.
 */
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
// TABLE / FIELD IDs · base nueva apptTKRYbx6gu701i
// ────────────────────────────────────────────────────────────────
const TABLE_IDS = {
  casas:      "tblisRfa2IW02ltCL",
  inquilinos: "tblXuFC9azHTZGjmE",
  reservas:   "tblzz3fokkBprEpIm",
  pagos:      "tbl5p63dUEhrzgHVJ",
  gastos:     "tblGBQ5xn9Zp6YrTN",
  gastos_emp: "tbl9dJXwI9Vn3kjKy",  // "Gastos x Empresa" → pm_expenses scope='empresa'
  accesos:    "tblfb63Yhn0NIMDNw",
  // tareas: ELIMINADA de Airtable (2026-06-30) — pm_tasks ahora es 100% app-generada
  unidades:   "tblItO7iMZT9QS87y"
};

const F = {
  // Casas
  casa_direccion: "fld1ZJXQndjw79IO1",
  casa_zona:      "fldlgIZi2Tx30Z639",
  casa_modelo:    "fldxHBhZP4JrTks29",
  casa_unidades:  "fldsr8FGN6y5OsaEr",
  casa_estado:    "fldmRNmQdq6ocx3q2",
  casa_notas:     "fldueu9f3umYV27z7",
  casa_wifi_nombre: "fldnukNsOSGMk1nEQ",
  casa_wifi_clave:  "fldMlhg35OmZwJA5i",
  casa_drive:       "fldohaq4JEfOuYiCj",
  casa_habitaciones:"fldFsDu4p97kXAwh9",
  casa_hipoteca:  "fldvyb3pip9EI8Tef",
  casa_prestamo:  "fldn2af5YZi9Y12Hj",
  casa_acceso:      "fldKuVpYVzh7JzRP8",  // Código de acceso (keypad principal de la Casa)
  // Inquilinos
  inq_nombre:     "flddqJeRovK6Hoxx0",
  inq_telefono:   "fldr9V8dpcuFQhvS0",
  inq_estado:     "flde117ojmuCdVnQu",
  inq_tipo_renta: "fldUqcPdrxxwoVXLz",
  inq_monto:      "fldkvSFigcof1c5Cg",
  inq_fecha_in:   "fldmK1GKgpS2Pm21c",
  inq_fecha_out:  "fld4fnXiwSYRYEWHy",
  inq_metodo:     "fldVz4dXzg8Pg8nn9",
  inq_deposito:   "fldJ4tTS1NEtWTKKw",
  inq_casa:       "fldeTQFmUfpeZNpZk",  // link → Casas
  inq_obs_ia:     "fldjpVuBes0xpGN5c",
  // Reservas
  res_nombre:     "fld9fNiZbMNRVGioI",
  res_unidad:     "fldFKmuQlwK3ABKtV",  // "Unidad / Habitación" (texto)
  res_plataforma: "fldkYCooy9CsZ7Xv5",
  res_fecha_in:   "fldPj5rGjT0F71D18",
  res_fecha_out:  "fldjfrjwVTS9og5QF",
  res_estado:     "flda3APWY41IFIkU0",
  res_casa:       "fldBi4LqUYkX7Yu2f",  // link → Casas
  res_inquilino:  "fldZJGnRFauzi8kM1",  // link → Inquilinos
  res_unidad_link:"fldPbGSnYMEhbX79X",  // link → Unidades (tabla dedicada)
  // Unidades (🚪 tabla dedicada)
  uni_unidad:     "fld1YmPcUiBlHbcye",
  uni_tipo:       "fldq2nGAAzyFsYbUU",
  uni_etiqueta:   "fldQUeZq6LlBDUTob",
  uni_estado:     "fldPXwcneyhx7GPfB",  // Ocupada / Disponible / Reservada
  uni_casa:       "fldkVcVVoAInhf6H1",  // link → Casas
  uni_inquilino:  "fld36cAgIi5WfX1Vm",  // link → Inquilinos (actual)
  uni_banos_cant: "fldUrTYKTmnJFMa9G",
  uni_banos_tipo: "fldgzt12iBgwvrJce",
  uni_mobiliario: "fldVfGtDVG0MdKpeh",
  uni_accesos:    "fldvyq3nl4rwZPiF8",
  uni_obs:        "fldqZKuz5F1VGFhr7",
  uni_renta:      "fldgT2qWEHUJ8juCK",  // Renta objetivo (currency)
  // Pagos
  pag_pago:       "fldc3bGGY0JZMeODz",
  pag_monto:      "fld4plr3PqxUksUgo",
  pag_fecha:      "fld6lAfD9vg7fUv6T",
  pag_mes:        "fldZp3MbTaJMyFftZ",
  pag_año:        "fld5MWlLjaCNxaJ1I",
  pag_plataforma: "fldfrgInDS8MQp12Z",
  pag_comprob:    "fldyrBFPPdTyDw2EJ",
  pag_inquilino:  "fld01OK8T8TJl8ZXb",  // link → Inquilinos
  pag_casa:       "fld0RYuPMMUpcgnoF",  // link → Casas
  pag_reserva:    "fldU0KUvfPEdpp1tY",  // link → Reservas
  pag_revisar:    "fldlvCJbf2CgTspx5",
  pag_concil_ia:  "fldBVvODboUMNwqHR",
  pag_pactada:    "fldpUSJ1HdZQmQPMH",  // Renta pactada - Contrato (base del cálculo de cartera en el OS)
  pag_deuda:      "flduMsIV5gZRIv1eU",  // Deuda Pendiente de Pago (fórmula Airtable, espejo p/ conciliar)
  // Gastos
  gst_concepto:   "fld3anzEcnkjUd8Wg",
  gst_tipo:       "fldrCKw1ODHixzyi6",
  gst_valor:      "fldfjaeafdA2lS99K",
  gst_fecha:      "fldHnaieHa4XRCS7A",
  gst_mes:        "fldc2AxqIU7xJldZE",
  gst_factura:    "fldFGenqtv8piockd",
  gst_casa:       "fld3NuV9K8Wxg86bL",  // link → Casas
  gst_ambito:     "fldhHLYaoS8VhfuTZ",  // Ámbito (Casa/Plataforma/Equipo)
  gst_año:        "fldtoc3jPdOZ5A2M3",  // Año (singleSelect) — alimenta billing_ym
  // Gastos x Empresa (overhead sin Casa) → pm_expenses scope='empresa'
  ge_concepto:    "fldTkGSK4rwO4VeBM",
  ge_tipo:        "fldS8m6mtZpiT1Lfb",
  ge_valor:       "fldOXIxBa41E7dqev",
  ge_fecha:       "fldI3Zjvp7OiGwbB9",
  ge_mes:         "fld9gH2SlnD13fjzy",
  ge_año:         "fldcW0W0sA5Iv70SJ",
  ge_factura:     "fld8YOKPID9G3gRdI",  // url (no attachment)
  ge_ambito:      "fld66QLuEkhXtJ4M1",
  // Accesos (🔑)
  acc_servicio:   "fldiAGNHPO8ieYrcF",
  acc_categoria:  "fldCmDi12qdwmFD9c",
  acc_usuario:    "fldV2yIKzsCNnnRB3",
  acc_clave:      "fldzyp9gzUMexAZ5p",
  acc_link:       "fldRROMLIDcJU052K",
  acc_casa:       "fldzsUenXndDo2ohg",  // link → Casas
  acc_obs:        "fld4JiSfJ5ONWsZKC"
  // Tareas Mantenimiento (🧰): tabla ELIMINADA de Airtable (2026-06-30), campos tar_* removidos.
};

// ────────────────────────────────────────────────────────────────
// HELPERS de mapping
// ────────────────────────────────────────────────────────────────
function getSel(cell: any): string | null {
  if (!cell) return null;
  if (typeof cell === "string") return cell;
  if (cell.name) return cell.name;
  if (Array.isArray(cell)) return cell[0]?.name || (typeof cell[0] === "string" ? cell[0] : null);
  return null;
}
function getMultiSel(cell: any): string[] {
  if (!cell) return [];
  if (Array.isArray(cell)) return cell.map((c: any) => c.name || c).filter(Boolean);
  return [];
}
// Linked record → primer record id (con returnFieldsByFieldId los links son string[] de recIds)
function linkedId(cell: any): string | null {
  if (Array.isArray(cell) && cell.length) {
    const v = cell[0];
    return typeof v === "string" ? v : (v?.id || null);
  }
  return null;
}
function slugify(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
// Igual fórmula que el índice único SQL address_normalized.
function normKey(addr: string | null): string {
  return (addr || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
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
const MES_NUM: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10",
  noviembre: "11", diciembre: "12"
};
function expenseDate(fecha: any, mesCell: any, createdTime?: string): string | null {
  if (fecha) return fecha;
  const mesRaw = getMultiSel(mesCell)[0] || getSel(mesCell);
  if (!mesRaw) return null;
  const m = MES_NUM[mesRaw.trim().toLowerCase()];
  if (!m) return null;
  const year = (createdTime && /^\d{4}/.test(createdTime)) ? createdTime.slice(0, 4)
             : String(new Date().getFullYear());
  return `${year}-${m}-01`;
}
function extractZip(addr: string): { zip?: string; city?: string; state?: string } {
  const m = (addr || "").match(/(\d{5})/);
  const zip = m?.[1];
  let city = "Austin", state = "TX";
  if (/marlin/i.test(addr)) city = "Marlin";
  else if (/round rock/i.test(addr)) city = "Round Rock";
  return { zip, city, state };
}
function inferRentalModel(modelo: string | null): string {
  const s = (modelo || "").toLowerCase();
  if (/casa\s*completa|tradicional/.test(s)) return "casa_completa";
  if (/habitaci/.test(s))                    return "por_habitaciones";
  if (/estudio|apart|unidad/.test(s))        return "por_unidades";
  if (/mixt/.test(s))                        return "mixta";
  return "mixta";
}
function inferUnitType(tipo: string | null): string {
  if (!tipo) return "habitacion";
  if (/casa\s*completa/i.test(tipo)) return "casa_completa";
  if (/habitaci/i.test(tipo))        return "habitacion";
  if (/estudio/i.test(tipo))         return "estudio";
  if (/apartamento|apto/i.test(tipo))return "apartamento";
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
  if (/norte/i.test(z))        return "norte";
  if (/sur/i.test(z))          return "sur";
  if (/marlin/i.test(z))       return "marlin";
  if (/round\s*rock/i.test(z)) return "round_rock";
  return z.toLowerCase();
}
function inferExpenseCategory(tipo: string | null): string {
  const s = (tipo || "").toLowerCase();
  if (/aseo|podad|limpie|jard/.test(s))            return "cleaning";
  if (/plataforma|software|suscrip|servicio|equipo|n[oó]mina|salario/.test(s)) return "operational";
  return "house";
}

// ────────────────────────────────────────────────────────────────
// Airtable API (paginación automática)
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
  // Archivado: OFF por defecto (anti-wipe). ON solo con env DISABLE_ARCHIVE=false o body.archive=true.
  const DISABLE_ARCHIVE_ENV = (Deno.env.get("DISABLE_ARCHIVE") ?? "true").toLowerCase();
  let ARCHIVE_ENABLED = DISABLE_ARCHIVE_ENV === "false";
  if (body.archive === true) ARCHIVE_ENABLED = true;
  if (body.archive === false) ARCHIVE_ENABLED = false;
  console.log(`[pm-sync] archive config · DISABLE_ARCHIVE=${Deno.env.get("DISABLE_ARCHIVE") ?? "(unset→true)"} · body.archive=${body.archive ?? "(none)"} · ARCHIVE_ENABLED=${ARCHIVE_ENABLED}`);
  if (!ARCHIVE_ENABLED) console.log("[pm-sync] archivado OMITIDO este run (sync defensivo)");

  const envToken = Deno.env.get("AIRTABLE_API_KEY");
  const airtable_token = envToken || body.airtable_token;
  console.log("[pm-sync] token source:", envToken ? "env" : (body.airtable_token ? "body" : "none"));
  const base_id = body.base_id || Deno.env.get("AIRTABLE_BASE_ID") || "apptTKRYbx6gu701i";
  const srcCounts: Record<string, number> = {}; // conteos de la FUENTE para el assert de paridad
  console.log("[pm-sync] base_id:", base_id);
  if (!airtable_token) return json({ ok: false, error: "Airtable token no configurado en el servidor (AIRTABLE_API_KEY)" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const startMs = Date.now();
  const stats: any = { properties: 0, units: 0, tenants: 0, bookings: 0, payments_in: 0, expenses: 0 };
  const errors: string[] = [];
  const todayISO = new Date().toISOString().slice(0, 10);
  const warnings: any[] = [];
  const addWarn = (warning_type: string, entity_type: string, entity_id: string, property_id: string | null, details: any) => {
    warnings.push({ warning_type, entity_type, entity_id, property_id, details, dedup_key: `${warning_type}:${entity_id}`, resolved: false });
  };

  const { data: log } = await supabase.from("pm_sync_log").insert({
    source: "airtable",
    user_id: userId,
    status: "running"
  }).select().single();

  try {
    // ── MIRROR: helpers de soft-delete + sello de sincronización ──
    const nowISO = new Date().toISOString();
    let MIRROR = true;
    {
      const probe = await supabase.from("pm_payments").select("active,last_synced_at,archived_at").limit(1);
      if (probe.error) { MIRROR = false; errors.push("mirror cols ausentes (correr 2026-06-22-mirror-sync.sql): " + probe.error.message); }
    }
    const mirrorFields = () => MIRROR ? { active: true, last_synced_at: nowISO, archived_at: null } : {};
    // Probe aparte para tablas auxiliares (credentials/tasks): si su migración
    // (2026-06-23-mirror-sync-aux-tables.sql) no corrió, MIRROR_AUX=false y siguen sin mirror.
    let MIRROR_AUX = MIRROR;
    if (MIRROR) {
      const pa = await supabase.from("pm_credentials").select("active,last_synced_at,archived_at").limit(1);
      if (pa.error) { MIRROR_AUX = false; errors.push("mirror AUX cols ausentes (2026-06-23-mirror-sync-aux-tables.sql): " + pa.error.message); }
    }
    const mirrorFieldsAux = () => MIRROR_AUX ? { active: true, last_synced_at: nowISO, archived_at: null } : {};

    const archivedCount: Record<string, number> = {
      pm_properties: 0, pm_units: 0, pm_tenants: 0, pm_bookings: 0, pm_payments: 0, pm_expenses: 0,
      pm_credentials: 0, pm_tasks: 0
    };
    const archivedSamples: Record<string, any[]> = {};
    // Archiva (soft-delete) filas no vistas en este run. GATED anti-wipe (ver reglas arriba).
    const mirrorArchive = async (table: string, keyCol: string, activeCol: string, sourceOK: boolean) => {
      if (dry_run || !MIRROR) return;
      if (!ARCHIVE_ENABLED) return;
      if (!sourceOK) { errors.push(`archive ${table}: OMITIDO (la fuente no sincronizó completa → se evita wipe)`); return; }
      const baseSel = () => supabase.from(table).select(`id, ${keyCol}`).eq(activeCol, true).not(keyCol, "is", null);
      const sampleA = await baseSel().lt("last_synced_at", nowISO).limit(3);
      const sampleB = await baseSel().is("last_synced_at", null).limit(3);
      archivedSamples[table] = [...(sampleA.data || []), ...(sampleB.data || [])].slice(0, 3).map((r: any) => r[keyCol] || r.id);
      const upd: any = { archived_at: nowISO }; upd[activeCol] = false;
      let total = 0;
      const a = await supabase.from(table).update(upd, { count: "exact" }).eq(activeCol, true).not(keyCol, "is", null).lt("last_synced_at", nowISO);
      if (a.error) { errors.push(`archive ${table} (lt): ${a.error.message}`); } else total += a.count || 0;
      const b = await supabase.from(table).update(upd, { count: "exact" }).eq(activeCol, true).not(keyCol, "is", null).is("last_synced_at", null);
      if (b.error) { errors.push(`archive ${table} (null): ${b.error.message}`); } else total += b.count || 0;
      archivedCount[table] = total;
      (stats as any)[`${table}_archived`] = total;
    };

    // ════════════════════════════════════════════════════════════
    // 1) CASAS → pm_properties
    // ════════════════════════════════════════════════════════════
    const casas = await fetchAllRecords(base_id, TABLE_IDS.casas, airtable_token);
    srcCounts.pm_properties = casas.length;

    // Existentes: mapa por recId de Casa y por address_normalized (conserva id / no duplica).
    const { data: existingProps0 } = await supabase.from("pm_properties").select("id, address, address_normalized, airtable_address_id");
    const propIdByRec: Record<string, string> = {};
    const propIdByNorm: Record<string, string> = {};
    for (const p of existingProps0 || []) {
      if (p.airtable_address_id) propIdByRec[p.airtable_address_id] = p.id;
      const n = p.address_normalized || normKey(p.address);
      if (n && !(n in propIdByNorm)) propIdByNorm[n] = p.id;
    }

    const propsArr = casas.filter((r: any) => r.fields?.[F.casa_direccion]).map((r: any) => {
      const dir = r.fields[F.casa_direccion];
      const { zip, city, state } = extractZip(dir);
      const estado = (getSel(r.fields?.[F.casa_estado]) || "").toLowerCase();
      const isInactive = /inactiv|vendid|baja|cerrad/.test(estado);
      return {
        _rec: r.id,                                // helper interno (se quita antes de escribir)
        airtable_address_id: r.id,                 // ← recId de la Casa (clave estable)
        external_id: "casa-" + r.id,
        address_normalized: normKey(dir),
        name: dir,
        address: dir,
        city, state, zip,
        zone: inferZone(getSel(r.fields?.[F.casa_zona])),
        rental_model: inferRentalModel(getSel(r.fields?.[F.casa_modelo])),
        wifi_name: r.fields?.[F.casa_wifi_nombre] || null,
        wifi_pass: r.fields?.[F.casa_wifi_clave] || null,
        access_code: r.fields?.[F.casa_acceso] != null ? String(r.fields[F.casa_acceso]) : null,
        mortgage_monthly: typeof r.fields?.[F.casa_hipoteca] === "number" ? r.fields[F.casa_hipoteca] : null,
        loan_type: getSel(r.fields?.[F.casa_prestamo]),
        total_units: (() => { const v = parseInt(String(r.fields?.[F.casa_unidades] ?? "").replace(/[^0-9]/g, "")); return isNaN(v) ? null : v; })(),
        drive_url: r.fields?.[F.casa_drive] || null,
        status: isInactive ? "inactiva" : "activa",
        active: !isInactive,
        ...(MIRROR ? { last_synced_at: nowISO, archived_at: isInactive ? nowISO : null } : {}),
        updated_at: nowISO
      };
    });

    // INSERT/UPDATE explícito: pm_properties no tiene constraint único usable para ON CONFLICT
    // (airtable_address_id sin unique; address_normalized es índice PARCIAL). Conserva el id
    // existente si ya hay propiedad con el mismo recId o address_normalized (no duplica las viejas).
    let propsUpsertOK = true, propsInserted = 0, propsUpdated = 0;
    if (!dry_run) {
      for (const row of propsArr) {
        const { _rec, ...payload } = row as any;
        const existingId = propIdByRec[_rec] || propIdByNorm[payload.address_normalized] || null;
        if (existingId) {
          const { error } = await supabase.from("pm_properties").update(payload).eq("id", existingId);
          if (error) { errors.push("property update " + _rec + ": " + error.message); propsUpsertOK = false; }
          else { propsUpdated++; propIdByRec[_rec] = existingId; }
        } else {
          const { data, error } = await supabase.from("pm_properties").insert(payload).select("id").single();
          if (error) { errors.push("property insert " + _rec + ": " + error.message); propsUpsertOK = false; }
          else if (data) { propsInserted++; propIdByRec[_rec] = data.id; }
        }
      }
    }
    const propertiesSourceOK = propsUpsertOK && propsArr.length > 0;
    await mirrorArchive("pm_properties", "airtable_address_id", "active", propertiesSourceOK);
    stats.properties = propsArr.length;
    stats.properties_inserted = propsInserted;
    stats.properties_updated = propsUpdated;

    // Mapa recId de Casa → property_id / name / zone (para las auto-tareas del cronograma)
    const { data: dbProps } = await supabase.from("pm_properties").select("id, name, zone, airtable_address_id");
    const propIdByCasaRec: Record<string, string> = {};
    const propNameByCasaRec: Record<string, string> = {};
    const propZoneByCasaRec: Record<string, string | null> = {};
    (dbProps || []).forEach((p: any) => {
      if (p.airtable_address_id) { propIdByCasaRec[p.airtable_address_id] = p.id; propNameByCasaRec[p.airtable_address_id] = p.name; propZoneByCasaRec[p.airtable_address_id] = p.zone || null; }
    });

    // ════════════════════════════════════════════════════════════
    // 2) INQUILINOS → pm_tenants
    // ════════════════════════════════════════════════════════════
    const inquilinos = await fetchAllRecords(base_id, TABLE_IDS.inquilinos, airtable_token);
    srcCounts.pm_tenants = inquilinos.filter((r: any) => r.fields?.[F.inq_nombre]).length; // solo filas válidas (las vacías se saltean y se reportan)
    const tenantMontoByRec: Record<string, number> = {};   // recId inquilino → Monto Renta (para bookings)
    const allTenants: any[] = [];
    for (const r of inquilinos) {
      const name = r.fields?.[F.inq_nombre];
      if (!name) addWarn("inquilino_sin_nombre", "tenant", "tenant-" + r.id, null, { detalle: "Fila de Inquilinos sin Nombre en Airtable (probable fila vacía accidental): el sync la saltea. Completar o borrar en Airtable." });
      if (!name) continue;
      const monto = r.fields?.[F.inq_monto];
      if (typeof monto === "number") tenantMontoByRec[r.id] = monto;
      allTenants.push({
        external_id: "tenant-" + r.id,
        full_name: name,
        phone: r.fields?.[F.inq_telefono] || null,
        client_state: getSel(r.fields?.[F.inq_estado]) || null,
        rent_amount: typeof monto === "number" ? monto : null,
        rent_type: getSel(r.fields?.[F.inq_tipo_renta]) || null,
        contract_start: r.fields?.[F.inq_fecha_in] || null,
        contract_end: r.fields?.[F.inq_fecha_out] || null,
        deposit: typeof r.fields?.[F.inq_deposito] === "number" ? r.fields[F.inq_deposito] : null,
        ai_summary: r.fields?.[F.inq_obs_ia] || null,
        notes: null,
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
    await mirrorArchive("pm_tenants", "external_id", "active", tenantsUpsertOK && allTenants.length > 0);
    stats.tenants = allTenants.length;

    // Mapa recId de Inquilino → tenant_id
    const { data: dbTen } = await supabase.from("pm_tenants").select("id, external_id");
    const tenantIdByRec: Record<string, string> = {};
    (dbTen || []).forEach((t: any) => {
      if (typeof t.external_id === "string" && t.external_id.startsWith("tenant-")) {
        tenantIdByRec[t.external_id.slice("tenant-".length)] = t.id;
      }
    });

    // ════════════════════════════════════════════════════════════
    // 3) UNIDADES (tabla dedicada) → pm_units · RESERVAS → pm_bookings
    // ════════════════════════════════════════════════════════════
    const reservas = await fetchAllRecords(base_id, TABLE_IDS.reservas, airtable_token);
    srcCounts.pm_bookings = reservas.length;

    // 3a) pm_units = 1 fila por registro de la tabla "Unidades" (tblItO7iMZT9QS87y).
    //     external_id = "unit-{recId}". Ocupación desde el campo Estado de la unidad
    //     (Ocupada/Disponible/Reservada) → pm_units.status, NO desde reservas.
    const unidades = await fetchAllRecords(base_id, TABLE_IDS.unidades, airtable_token);
    srcCounts.pm_units = unidades.length;
    const mapUnitStatus = (s: string | null): string | null => {
      const v = (s || "").toLowerCase();
      if (/mantenim/.test(v))                 return "mantenimiento";
      if (/ocupad/.test(v))                   return "ocupada";
      if (/reservad/.test(v))                 return "reservada";
      if (/disponible|libre|vacante/.test(v)) return "disponible";
      return null;
    };
    const unitsArr: any[] = [];
    let unitsSinCasa = 0;
    for (const r of unidades) {
      const casaRec = linkedId(r.fields?.[F.uni_casa]);
      const propId = casaRec ? (propIdByCasaRec[casaRec] || null) : null;
      if (!propId) {
        unitsSinCasa++;
        addWarn("unidad_sin_casa", "unit", "unit-" + r.id, null, { unidad: r.fields?.[F.uni_unidad] || r.id });
        continue;
      }
      const nombre = (r.fields?.[F.uni_unidad] || "Unidad").toString().trim();
      const etiqueta = (r.fields?.[F.uni_etiqueta] || "").toString().trim();
      const banosCant = parseInt(String(r.fields?.[F.uni_banos_cant] ?? "").replace(/[^0-9]/g, ""));
      unitsArr.push({
        external_id: "unit-" + r.id,
        property_id: propId,
        code: etiqueta || (slugify(propNameByCasaRec[casaRec] || "").split("-").slice(0, 2).join("-").toUpperCase() + "-" + slugify(nombre).toUpperCase()),
        name: nombre,
        unit_type: inferUnitType(getSel(r.fields?.[F.uni_tipo]) || nombre),
        status: mapUnitStatus(getSel(r.fields?.[F.uni_estado])),
        target_rent: (typeof r.fields?.[F.uni_renta] === "number") ? r.fields[F.uni_renta] : null,
        bath_type: r.fields?.[F.uni_banos_tipo] || null,
        bathroom_count: isNaN(banosCant) ? null : banosCant,
        access_codes: r.fields?.[F.uni_accesos] || null,
        decoration: r.fields?.[F.uni_mobiliario] || null,
        notes: r.fields?.[F.uni_obs] || null,
        is_active: true,
        ...(MIRROR ? { last_synced_at: nowISO, archived_at: null } : {})
      });
    }
    let unitsUpsertOK = true;
    if (!dry_run && unitsArr.length) {
      for (let i = 0; i < unitsArr.length; i += 50) {
        const { error } = await supabase.from("pm_units").upsert(unitsArr.slice(i, i + 50), { onConflict: "external_id" });
        if (error) { errors.push("units chunk " + i + ": " + error.message); unitsUpsertOK = false; break; }
      }
    }
    await mirrorArchive("pm_units", "external_id", "is_active", propertiesSourceOK && unitsUpsertOK && unitsArr.length > 0);
    stats.units = unitsArr.length;
    stats.units_sin_casa = unitsSinCasa;

    // Migración de esquema (one-time): desactiva las units VIEJAS derivadas de Reservas.
    // Su external_id era "unit-{casaRec}-{slug}" → empieza con "unit-rec" (el casaRec es recId)
    // PERO tiene "-slug" después. Las nuevas (tabla Unidades) son canónicas: "unit-{recId}" exacto
    // (/^unit-rec[A-Za-z0-9]{14}$/). Reversible (is_active=false). Limpieza de cambio de esquema,
    // independiente de DISABLE_ARCHIVE (que rige el soft-delete de ausentes en Airtable).
    let unitsLegacyDeactivated = 0;
    if (!dry_run && unitsUpsertOK && unitsArr.length > 0) {
      const isCanonical = (e: string) => /^unit-rec[A-Za-z0-9]{14}$/.test(e);
      const { data: actUnits } = await supabase.from("pm_units").select("id, external_id").eq("is_active", true);
      const legacyIds = (actUnits || [])
        .filter((u: any) => typeof u.external_id === "string" && u.external_id.startsWith("unit-") && !isCanonical(u.external_id))
        .map((u: any) => u.id);
      if (legacyIds.length) {
        const leg = await supabase.from("pm_units").update({ is_active: false, archived_at: nowISO }).in("id", legacyIds);
        if (leg.error) errors.push("units legacy deactivate: " + leg.error.message);
        else unitsLegacyDeactivated = legacyIds.length;
      }
    }
    stats.units_legacy_deactivated = unitsLegacyDeactivated;

    // Mapas: recId de Unidad → unit_id (para linkear bookings por "Unidad (link)" de Reservas)
    //        + (property_id|slug(name)) → unit_id (fallback por texto de "Unidad / Habitación").
    const { data: dbUnits } = await supabase.from("pm_units").select("id, property_id, name, external_id");
    const unitIdByRec: Record<string, string> = {};
    const unitIdByPropName: Record<string, string> = {};
    (dbUnits || []).forEach((u: any) => {
      if (typeof u.external_id === "string" && u.external_id.startsWith("unit-rec")) {
        unitIdByRec[u.external_id.slice("unit-".length)] = u.id;
      }
      if (u.property_id && u.name) unitIdByPropName[`${u.property_id}|${slugify(u.name)}`] = u.id;
    });

    // 3b) Bookings = 1 por Reserva.
    const deriveStatus = (ci: string | null, co: string | null): string => {
      if (ci && ci > todayISO) return "confirmado";
      if (co && co < todayISO) return "finalizado";
      return "activo";
    };
    const resBookings: any[] = [];
    let resSinTenant = 0, resSinCasa = 0, resSinFecha = 0;
    for (const r of reservas) {
      const casaRec = linkedId(r.fields?.[F.res_casa]);
      const propId = casaRec ? propIdByCasaRec[casaRec] : null;
      if (!propId) { resSinCasa++; addWarn("reserva_sin_casa", "booking", "booking-" + r.id, null, { reserva: r.fields?.[F.res_nombre] || r.id }); continue; }
      const unidad = (getSel(r.fields?.[F.res_unidad]) || "Habitación").toString().trim();
      // unit_id: 1º por "Unidad (link)" de Reservas → recId de la tabla Unidades; 2º fallback por texto.
      const unidadRec = linkedId(r.fields?.[F.res_unidad_link]);
      const unitId = (unidadRec && unitIdByRec[unidadRec]) || unitIdByPropName[`${propId}|${slugify(unidad)}`] || null;
      const inqRec = linkedId(r.fields?.[F.res_inquilino]);
      const tenantId = inqRec ? (tenantIdByRec[inqRec] || null) : null;
      if (!tenantId) {
        resSinTenant++;
        addWarn("booking_sin_tenant", "booking", "booking-" + r.id, propId,
          { reserva: r.fields?.[F.res_nombre] || r.id, detalle: "Reserva sin Inquilino enlazado en Airtable." });
      }
      const startDate = r.fields?.[F.res_fecha_in] || null;
      const checkOut = r.fields?.[F.res_fecha_out] || null;
      // pm_bookings.start_date es NOT NULL → reserva sin Fecha de Entrada no genera booking (sí su unit).
      if (!startDate) {
        resSinFecha++;
        addWarn("reserva_sin_fecha", "booking", "booking-" + r.id, propId,
          { reserva: r.fields?.[F.res_nombre] || r.id, detalle: "Reserva sin Fecha de Entrada → no se crea booking (start_date NOT NULL)." });
        continue;
      }
      if (startDate && checkOut && startDate > checkOut) {
        addWarn("fechas_invertidas", "booking", "booking-" + r.id, propId, { check_in: startDate, check_out: checkOut });
      }
      const fuentes = [getSel(r.fields?.[F.res_plataforma]) || ""];
      resBookings.push({
        external_id: "booking-" + r.id,
        unit_id: unitId,
        property_id: propId,
        tenant_id: tenantId,
        booking_type: inferBookingType(fuentes),
        start_date: startDate,
        end_date: checkOut,
        rent_amount: (inqRec && tenantMontoByRec[inqRec]) || 0,
        rent_period: "mensual",
        payment_day: null,
        platform_account: null,
        status: deriveStatus(startDate, checkOut),
        notes: null,
        ...mirrorFields()
      });
    }
    let bookingsUpsertOK = true;
    if (!dry_run && resBookings.length) {
      for (let i = 0; i < resBookings.length; i += 50) {
        const { error } = await supabase.from("pm_bookings").upsert(resBookings.slice(i, i + 50), { onConflict: "external_id" });
        if (error) { errors.push("bookings chunk " + i + ": " + error.message); bookingsUpsertOK = false; break; }
      }
    }
    await mirrorArchive("pm_bookings", "external_id", "active", bookingsUpsertOK && resBookings.length > 0);
    if (!dry_run && MIRROR && ARCHIVE_ENABLED) {
      await supabase.from("pm_bookings").update({ status: "finalizado" }).eq("active", false).in("status", ["activo", "confirmado"]);
    }
    stats.bookings = resBookings.length;
    stats.bookings_sin_tenant = resSinTenant;
    stats.bookings_sin_casa = resSinCasa;
    stats.bookings_sin_fecha = resSinFecha;

    // Mapa recId de Reserva → { booking_id, unit_id, property_id, tenant_id }
    const { data: dbBookings } = await supabase.from("pm_bookings").select("id, external_id, unit_id, property_id, tenant_id");
    const bookingByResRec: Record<string, { id: string; unit_id: string | null; property_id: string | null; tenant_id: string | null }> = {};
    (dbBookings || []).forEach((b: any) => {
      if (typeof b.external_id === "string" && b.external_id.startsWith("booking-")) {
        bookingByResRec[b.external_id.slice("booking-".length)] = { id: b.id, unit_id: b.unit_id, property_id: b.property_id, tenant_id: b.tenant_id };
      }
    });

    // ════════════════════════════════════════════════════════════
    // 3c) OPERACIÓN INTELIGENTE → auto-tareas en pm_tasks (capa propia del PM)
    //     · Reserva Histórica (check-out) → tarea de LIMPIEZA / turnover.
    //     · Reserva Activa/Reservada con entrada próxima → tarea de RECEPCIÓN.
    //     Idempotente por external_id (auto-clean-/auto-reception-{resRec}) con
    //     ignoreDuplicates → NO resucita tareas ya completadas por el equipo.
    //     Ventanas de fecha acotadas → la lista queda operativamente relevante.
    // ════════════════════════════════════════════════════════════
    try {
      const dayMs = 86400000;
      const dOff = (n: number) => new Date(Date.now() + n * dayMs).toISOString().slice(0, 10);
      const cleanFromISO = dOff(-14);   // check-out reciente (últimos 14 días)
      const cleanToISO   = dOff(1);     // hasta mañana inclusive
      const recFromISO   = dOff(-3);    // recién ingresado (últimos 3 días)
      const recToISO     = dOff(7);     // o ingresa en los próximos 7 días
      const autoTasks: any[] = [];
      for (const r of reservas) {
        const casaRec = linkedId(r.fields?.[F.res_casa]);
        const propId = casaRec ? (propIdByCasaRec[casaRec] || null) : null;
        if (!propId) continue;
        const estado = (getSel(r.fields?.[F.res_estado]) || "").toLowerCase();
        const checkIn = (r.fields?.[F.res_fecha_in] ? String(r.fields[F.res_fecha_in]).slice(0, 10) : null);
        const checkOut = (r.fields?.[F.res_fecha_out] ? String(r.fields[F.res_fecha_out]).slice(0, 10) : null);
        const unidad = (getSel(r.fields?.[F.res_unidad]) || "Unidad").toString().trim();
        const propName = propNameByCasaRec[casaRec] || "Casa";
        const propZone = propZoneByCasaRec[casaRec] || null;   // zona real de la Casa (Airtable)
        const unitId = bookingByResRec[r.id]?.unit_id || null;
        const loc = propName + " · " + unidad;

        // LIMPIEZA / turnover: Reserva Histórica con check-out en la ventana. Equipo = Limpieza.
        const esHistorica = /hist|salid|finaliz|complet|cerrad|pasad/.test(estado);
        if (esHistorica && checkOut && checkOut >= cleanFromISO && checkOut <= cleanToISO) {
          autoTasks.push({
            external_id: "auto-clean-" + r.id,
            title: "🧹 Limpieza turnover — " + loc,
            task_type: "cleaning",
            property_id: propId,
            unit_id: unitId,
            scheduled_date: checkOut,
            status: "pendiente",
            priority: "alta",
            auto_generated: true,
            active: true,
            assignee: "Limpieza",
            zone: propZone,
            notes: "Turnover automático tras check-out (" + checkOut + "). Limpiar y preparar la unidad para el próximo huésped.",
          });
        }
        // RECEPCIÓN: Reserva Activa o Reservada con check-in en la ventana. Equipo = Limpieza.
        const esEntrada = /activ|reservad|confirm/.test(estado);
        if (esEntrada && checkIn && checkIn >= recFromISO && checkIn <= recToISO) {
          autoTasks.push({
            external_id: "auto-reception-" + r.id,
            title: "🛎️ Recepción — " + loc,
            task_type: "recepcion",
            property_id: propId,
            unit_id: unitId,
            scheduled_date: checkIn,
            status: "pendiente",
            priority: "alta",
            auto_generated: true,
            active: true,
            assignee: "Limpieza",
            zone: propZone,
            notes: "Recepción automática (entrada " + checkIn + "). Preparar la unidad, entregar accesos y enviar la guía de bienvenida.",
          });
        }
      }
      if (!dry_run && autoTasks.length) {
        for (let i = 0; i < autoTasks.length; i += 50) {
          const { error } = await supabase.from("pm_tasks").upsert(autoTasks.slice(i, i + 50), { onConflict: "external_id", ignoreDuplicates: true });
          if (error) { errors.push("auto-tasks chunk " + i + ": " + error.message); break; }
        }
      }
      stats.auto_tasks = autoTasks.length;
    } catch (e: any) { errors.push("auto-tasks: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 4) PAGOS → pm_payments · resuelto por LINKED RECORD IDs (sin fuzzy)
    // ════════════════════════════════════════════════════════════
    try {
      const pagos = await fetchAllRecords(base_id, TABLE_IDS.pagos, airtable_token);
      srcCounts.pm_payments = pagos.length;
      const paymentsIn: any[] = [];
      let paysLinked = 0, paysSkippedNoDate = 0, paysSinLink = 0;
      for (const r of pagos) {
        const fechaPago = r.fields?.[F.pag_fecha] || null;
        if (!fechaPago) {
          paysSkippedNoDate++;
          addWarn("pago_sin_fecha", "payment", "pay-" + r.id, null,
            { pago: r.fields?.[F.pag_pago] || r.id, monto: r.fields?.[F.pag_monto] || null,
              detalle: "Pago sin Fecha de Pago en Airtable: importado con status 'revisar' (NO cuenta en ingresos). Cargar la fecha en Airtable para activarlo." });
        }

        const casaRec    = linkedId(r.fields?.[F.pag_casa]);
        const inqRec     = linkedId(r.fields?.[F.pag_inquilino]);
        const reservaRec = linkedId(r.fields?.[F.pag_reserva]);

        const propId    = casaRec    ? (propIdByCasaRec[casaRec] || null) : null;
        const tenantId  = inqRec     ? (tenantIdByRec[inqRec]   || null) : null;
        const bk        = reservaRec ? (bookingByResRec[reservaRec] || null) : null;
        const bookingId = bk?.id || null;
        // unit_id: del booking enlazado (la reserva ya resolvió su unidad).
        const unitId    = bk?.unit_id || null;
        // Backfill: si el pago no enlazó Casa/Inquilino directo pero sí la Reserva,
        // se hereda property/tenant del booking (link indirecto, sigue siendo por record id).
        const propIdFinal   = propId   || bk?.property_id || null;
        const tenantIdFinal = tenantId || bk?.tenant_id   || null;

        if (propIdFinal && tenantIdFinal) paysLinked++;
        if (!casaRec || !inqRec) {
          paysSinLink++;
          addWarn("pago_link_faltante", "payment", "pay-" + r.id, propIdFinal,
            { pago: r.fields?.[F.pag_pago] || r.id, monto: r.fields?.[F.pag_monto] || null,
              tiene_casa: !!casaRec, tiene_inquilino: !!inqRec, tiene_reserva: !!reservaRec,
              detalle: "Pago sin Inquilino y/o Casa enlazados en Airtable (resolución por linked record)." });
        }

        const month = getSel(r.fields?.[F.pag_mes]);
        const yearRaw = getSel(r.fields?.[F.pag_año]);
        const year = yearRaw ? parseInt(yearRaw) : null;
        paymentsIn.push({
          external_id: "pay-" + r.id,
          booking_id: bookingId,
          property_id: propIdFinal,
          unit_id: unitId,
          tenant_id: tenantIdFinal,
          type: "ingreso",
          category: "renta",
          concept: `${month || ""} ${year || ""}`.trim() || (r.fields?.[F.pag_pago] || ""),
          amount: r.fields?.[F.pag_monto] || 0,
          renta_pactada: (typeof r.fields?.[F.pag_pactada] === "number") ? r.fields[F.pag_pactada] : null,
          deuda: (typeof r.fields?.[F.pag_deuda] === "number") ? r.fields[F.pag_deuda] : null,
          paid_at: fechaPago || null,
          month, year: (year && !isNaN(year)) ? year : null,
          platform: getSel(r.fields?.[F.pag_plataforma]),
          casa_nickname: (casaRec && propNameByCasaRec[casaRec]) || null,
          payment_method: null,
          proof_url: getAttachUrl(r.fields?.[F.pag_comprob]),
          status: fechaPago ? "pagado" : "revisar",
          notes: r.fields?.[F.pag_concil_ia] || null,
          ...mirrorFields()
        });
      }
      let paymentsUpsertOK = true;
      if (!dry_run && paymentsIn.length) {
        for (let i = 0; i < paymentsIn.length; i += 50) {
          const { error } = await supabase.from("pm_payments").upsert(paymentsIn.slice(i, i + 50), { onConflict: "external_id" });
          if (error) { errors.push("pagos chunk " + i + ": " + error.message); paymentsUpsertOK = false; break; }
        }
      }
      await mirrorArchive("pm_payments", "external_id", "active", paymentsUpsertOK && pagos.length > 0 && paymentsIn.length > 0);
      stats.payments_in = paymentsIn.length;
      stats.payments_linked = paysLinked;
      stats.payments_skipped_no_date = paysSkippedNoDate;
      stats.payments_sin_link = paysSinLink;
      console.log(`[pm-sync] pm_payments: ${paymentsIn.length} pagos · ${paysLinked} con casa+inquilino · ${paysSinLink} sin link completo · ${paysSkippedNoDate} sin fecha (omitidos)`);
    } catch (e: any) { errors.push("pagos: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 5) GASTOS → pm_expenses · property por LINKED Casa
    // ════════════════════════════════════════════════════════════
    try {
      const gastos = await fetchAllRecords(base_id, TABLE_IDS.gastos, airtable_token);
      srcCounts.pm_expenses = gastos.length;
      const exp: any[] = [];
      let gastosSinCasa = 0;
      for (const r of gastos) {
        const casaRec = linkedId(r.fields?.[F.gst_casa]);
        const propId = casaRec ? (propIdByCasaRec[casaRec] || null) : null;
        const tipo = getSel(r.fields?.[F.gst_tipo]);
        const ambito = getSel(r.fields?.[F.gst_ambito]);
        // Gasto de "Equipo"/"Plataforma" suele NO tener Casa (es operativo, no por propiedad) → no es warning.
        const esOperativo = /equipo|plataforma|software|nómina|nomina/i.test(ambito || "");
        if (!propId && !esOperativo) {
          gastosSinCasa++;
          addWarn("gasto_sin_casa", "expense", "exp-" + r.id, null,
            { concepto: r.fields?.[F.gst_concepto] || null, tipo, ambito, monto: r.fields?.[F.gst_valor] || null });
        }
        const gYearRaw = getSel(r.fields?.[F.gst_año]);
        exp.push({
          external_id: "exp-" + r.id,
          category: inferExpenseCategory(ambito || tipo),
          subcategory: tipo || ambito || null,
          property_id: propId,
          scope: "casa",
          amount: r.fields?.[F.gst_valor] || 0,
          expense_date: expenseDate(r.fields?.[F.gst_fecha], r.fields?.[F.gst_mes], r.createdTime),
          month: getSel(r.fields?.[F.gst_mes])?.toLowerCase() || null,
          year: gYearRaw ? parseInt(gYearRaw) : null,   // alimenta billing_ym (mes de renta)
          description: r.fields?.[F.gst_concepto] || tipo || "Gasto",
          invoice_url: getAttachUrl(r.fields?.[F.gst_factura]),
          paid: true,
          notes: null,
          ...mirrorFields()
        });
      }
      // ── "Gastos x Empresa" (overhead SIN casa) → mismas filas con scope='empresa'.
      //    Se upsertean JUNTO a los de casa (un solo mirrorArchive para pm_expenses).
      const gastosEmp = await fetchAllRecords(base_id, TABLE_IDS.gastos_emp, airtable_token);
      srcCounts.pm_expenses += gastosEmp.length;
      for (const r of gastosEmp) {
        const tipo = getSel(r.fields?.[F.ge_tipo]);
        const ambito = getSel(r.fields?.[F.ge_ambito]);
        const yRaw = getSel(r.fields?.[F.ge_año]);
        exp.push({
          external_id: "gastoemp-" + r.id,
          category: inferExpenseCategory(ambito || tipo) === "house" ? "operational" : inferExpenseCategory(ambito || tipo),
          subcategory: tipo || ambito || null,
          property_id: null,
          scope: "empresa",
          amount: r.fields?.[F.ge_valor] || 0,
          expense_date: expenseDate(r.fields?.[F.ge_fecha], r.fields?.[F.ge_mes], r.createdTime),
          month: getSel(r.fields?.[F.ge_mes])?.toLowerCase() || null,
          year: yRaw ? parseInt(yRaw) : null,
          description: r.fields?.[F.ge_concepto] || tipo || "Gasto empresa",
          invoice_url: (typeof r.fields?.[F.ge_factura] === "string" ? r.fields[F.ge_factura] : null),
          paid: true,
          notes: null,
          ...mirrorFields()
        });
      }
      let expensesUpsertOK = true;
      if (!dry_run && exp.length) {
        for (let i = 0; i < exp.length; i += 50) {
          const { error } = await supabase.from("pm_expenses").upsert(exp.slice(i, i + 50), { onConflict: "external_id" });
          if (error) { errors.push("gastos chunk " + i + ": " + error.message); expensesUpsertOK = false; break; }
        }
      }
      await mirrorArchive("pm_expenses", "external_id", "active", expensesUpsertOK && gastos.length > 0 && exp.length > 0);
      stats.expenses = exp.length;
      stats.expenses_sin_casa = gastosSinCasa;
    } catch (e: any) { errors.push("gastos: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 6) ACCESOS → pm_credentials (🔑) · property por LINKED Casa
    // ════════════════════════════════════════════════════════════
    try {
      const accesos = await fetchAllRecords(base_id, TABLE_IDS.accesos, airtable_token);
      const creds: any[] = [];
      for (const r of accesos) {
        const casaRec = linkedId(r.fields?.[F.acc_casa]);
        creds.push({
          external_id: "cred-" + r.id,
          name: r.fields?.[F.acc_servicio] || "Sin nombre",
          category: getSel(r.fields?.[F.acc_categoria]) || "otro",
          username: r.fields?.[F.acc_usuario] || null,
          password_enc: r.fields?.[F.acc_clave] || null,
          url: r.fields?.[F.acc_link] || null,
          property_id: casaRec ? (propIdByCasaRec[casaRec] || null) : null,
          notes: r.fields?.[F.acc_obs] || null,
          ...mirrorFieldsAux()
        });
      }
      let credsUpsertOK = true;
      if (!dry_run && creds.length) {
        for (let i = 0; i < creds.length; i += 50) {
          const { error } = await supabase.from("pm_credentials").upsert(creds.slice(i, i + 50), { onConflict: "external_id" });
          if (error) { errors.push("accesos chunk " + i + ": " + error.message); credsUpsertOK = false; break; }
        }
      }
      await mirrorArchive("pm_credentials", "external_id", "active", MIRROR_AUX && credsUpsertOK && accesos.length > 0 && creds.length > 0);
      stats.credentials = creds.length;
    } catch (e: any) { errors.push("accesos: " + e.message); }

    // ════════════════════════════════════════════════════════════
    // 7) TAREAS MANTENIMIENTO → ELIMINADO (2026-06-30)
    //    La tabla "Tareas Mantenimiento" fue borrada de Airtable.
    //    pm_tasks ahora vive 100% en el task system propio del PM
    //    (tareas auto-generadas por la app: turnover/recepción).
    //    NO se sincroniza ni se archiva desde Airtable.
    // ════════════════════════════════════════════════════════════
    stats.tasks = 0;

    // ════════════════════════════════════════════════════════════
    // Persistir alertas de datos + auto-resolver las ya corregidas
    // ════════════════════════════════════════════════════════════
    const warnMap: Record<string, any> = {};
    for (const w of warnings) warnMap[w.dedup_key] = w;
    const uniqWarnings = Object.values(warnMap);
    stats.data_warnings = uniqWarnings.length;
    if (!dry_run) {
      try {
        const detectedKeys = uniqWarnings.map((w: any) => w.dedup_key);
        for (let i = 0; i < uniqWarnings.length; i += 50) {
          const chunk = uniqWarnings.slice(i, i + 50).map((w: any) => ({ ...w, detected_at: nowISO, resolved: false, resolved_at: null }));
          const { error } = await supabase.from("pm_data_warnings").upsert(chunk, { onConflict: "dedup_key" });
          if (error) { errors.push("data_warnings: " + error.message); break; }
        }
        let q = supabase.from("pm_data_warnings").update({ resolved: true, resolved_at: nowISO }).eq("resolved", false);
        if (detectedKeys.length) q = q.not("dedup_key", "in", `(${detectedKeys.map(x => `"${x}"`).join(",")})`);
        await q;
      } catch (e: any) { errors.push("data_warnings persist: " + e.message); }
    }
    console.log(`[pm-sync] data_warnings: ${uniqWarnings.length} detectadas`);

    const processedCount = {
      properties: stats.properties || 0,
      units: stats.units || 0,
      tenants: stats.tenants || 0,
      bookings: stats.bookings || 0,
      payments: stats.payments_in || 0,
      expenses: stats.expenses || 0,
      credentials: stats.credentials || 0,
      tasks: stats.tasks || 0
    };

    const status = errors.length === 0 ? "success" : "partial";
    if (log) {
      await supabase.from("pm_sync_log").update({
        status,
        records_synced: { ...stats, archivedCount, archive_enabled: ARCHIVE_ENABLED, mirror: MIRROR, base_id },
        error_message: errors.length ? errors.join("\n") : null,
        duration_ms: Date.now() - startMs,
        finished_at: new Date().toISOString()
      }).eq("id", log.id);
    }
    // Backbone: property_id self-healing (molde FF/Remodel)
    if (!dry_run) { try { await supabase.rpc("pm_backfill_property_ids"); } catch (e) { errors.push("pid backfill: " + (e as any)?.message); } }

    // Assert de paridad fuente vs espejo (molde Remodelación/FF) — solo en runs reales
    const parityOut: Record<string, any> = {};
    if (!dry_run) {
      try {
        const mirrors: Array<[string, string, string]> = [
          ["pm_properties", "pm_properties", "active"], ["pm_units", "pm_units", "is_active"],
          ["pm_tenants", "pm_tenants", "active"], ["pm_bookings", "pm_bookings", "active"],
          ["pm_payments", "pm_payments", "active"], ["pm_expenses", "pm_expenses", "active"],
        ];
        for (const [src, table, flag] of mirrors) {
          if (srcCounts[src] == null) continue;
          const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq(flag, true);
          const inSync = (count ?? 0) === srcCounts[src];
          parityOut[src] = { airtable: srcCounts[src], mirror: count ?? 0, in_sync: inSync };
          await supabase.from("remodel_sync_parity").upsert({
            source: src, airtable_count: srcCounts[src], mirror_count: count ?? 0,
            in_sync: inSync, checked_at: new Date().toISOString(),
          }, { onConflict: "source" });
        }
      } catch (e) { errors.push("parity: " + (e as any)?.message); }
    }
    return json({
      ok: true, dry_run, base_id, archive_enabled: ARCHIVE_ENABLED, mirror: MIRROR,
      processedCount, archivedCount, archivedSamples, parity: parityOut,
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
