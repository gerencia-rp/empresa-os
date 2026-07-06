// Sync Airtable "Empresa de Remodelación" → Supabase
// Pulls propiedades, calcula KPIs (SPI, CPI, burn rate), genera snapshot diario + alertas.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const AIRTABLE_TOKEN = Deno.env.get("AIRTABLE_TOKEN")!;
const AIRTABLE_BASE_ID = Deno.env.get("AIRTABLE_BASE_ID_REMODEL") || "appwFRqnkyyRljOld";
const AIRTABLE_TABLE_ID = "tblw28KVOUcCAKZBU"; // Propiedad en reparación
// Tablas linked que resolvemos a nombres (accedidas por nombre URL-encoded)
const AIRTABLE_LINKED_TABLES = ["Cuadrillas", "Contactos del negocio"];
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FIELD_IDS = {
  direccion: "fldaDd6TuMkEKILyn",
  lider: "fldGryDWkPw99eYCd",
  proceso: "fldpO1nrcsC48WVhJ",
  avance: "fld2lDnIslXTl9o75",
  materiales: "fldtqskgPEajaJT4Y",
  trabajadores: "fldNmR8PgZWdjutIw",
  interno: "fldsRWMQJ4Lv86GOU",
  presupuesto: "fldPMBhxLYr4TMje0",
  cliente: "fldAP3lI2FgXds14q",
  ganancia: "fldW26WBuAFPnWhi8",
  retraso: "fld7Pl5a9YhAazAby",
  monto_por_gastar: "fldg9kWaf60x6SeJo",
  rentabilidad: "fldxyxgo4B4VcuQJX",
  monto_real: "fldq1Xpfb1SPPGIuz",
  desviacion: "fldVgmxP8Z1xtdrmj",
  inicio: "fldG2SABUD5Ptcuj8",
  fin_estimado: "fldQtRD47N2jHaRyh",
  fin_real: "fld8LqUjkqDV7qIP7",
  dias: "fld8kILrCV4xXras6",
  ciudad: "fldupd1Y33ciLAHjj",
  fotos_url: "fldVnVcQU9MjNHTYp",
  sqft: "fldQrlNrrEJexZRrp",
};

// Tabla "Pagos otros" (otros costos por casa) para refinar el % otros costos
const AIRTABLE_PAGOS_OTROS_TABLE = "tbluntyaPtpfuvuT6";
const PAGOS_OTROS_FIELDS = { casa: "fldngcDQ9dkXeimdW", precio: "fldXr6RL6TwfkUB82" };

// Tabla "Horas trabajadas semana" — para costo/hora y rendimiento por trabajador
const AIRTABLE_HORAS_TABLE = "tblyCieXLFdZM60El";
const HORAS_FIELDS = {
  trabajador: "fldpIYjB33HK0tdEk",
  horas: "fldRWftVP66WRcbYD",
  pago: "fldP8mv5lJdehwvKx"
};

const N_THRESHOLD_DEFAULT = 3; // mín casas completas para usar refinamiento histórico

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Thresholds para alertas
const THRESHOLD_SPI_ATRASADA = 0.85;
const THRESHOLD_CPI_SOBRECOSTO = 0.90;
const THRESHOLD_DAYS_ESTANCADA = 7;
const THRESHOLD_BUDGET_USAGE_HIGH = 0.95;

function parseAvance(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v.name) v = v.name;
  if (typeof v !== "string") return null;
  const m = v.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

// La API Airtable devuelve singleSelect como STRING directo (no objeto).
// Manejamos los 3 formatos posibles para máxima robustez.
function getName(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v.name) return v.name;
    if (Array.isArray(v) && v.length > 0) {
      return typeof v[0] === "string" ? v[0] : (v[0].name || null);
    }
  }
  return null;
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const d1 = new Date(a + "T00:00:00").getTime();
  const d2 = new Date(b + "T00:00:00").getTime();
  return Math.round((d2 - d1) / 86400000);
}

async function fetchAirtable(): Promise<any[]> {
  const records: any[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
    url.searchParams.set("returnFieldsByFieldId", "true");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

// S7-Fix · Fetchea linked tables (Cuadrillas, etc) sin returnFieldsByFieldId
// para poder leer el "Name" primary directamente
async function fetchAirtableTableByName(tableName: string): Promise<any[]> {
  const records: any[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    if (!res.ok) {
      console.warn(`Skip linked table "${tableName}": ${res.status}`);
      return [];
    }
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

// Extrae el "name" de un record de Airtable buscando el primer campo de texto razonable
function extractPrimaryName(r: any): string | null {
  const f = r.fields || {};
  // Buscar campos típicos de nombre
  const candidates = ["Name", "Nombre", "name", "nombre", "Title", "Titulo", "Title", "Líder", "Lider"];
  for (const c of candidates) {
    if (f[c] && typeof f[c] === "string") return f[c];
  }
  // Si no encontramos, tomar el primer string field
  for (const k of Object.keys(f)) {
    if (typeof f[k] === "string" && f[k].length < 100) return f[k];
  }
  return null;
}

// Resuelve un valor que puede ser ID o array de IDs usando el cache
function resolveLinked(v: any, cache: Map<string, string>): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    // ¿Parece un Airtable recID?
    if (/^rec[A-Za-z0-9]{14,}$/.test(v)) return cache.get(v) || v;
    return v;
  }
  if (Array.isArray(v) && v.length > 0) {
    const names = v.map((id) => {
      if (typeof id === "string") {
        if (/^rec[A-Za-z0-9]{14,}$/.test(id)) return cache.get(id) || id;
        return id;
      }
      return id?.name || null;
    }).filter(Boolean);
    return names.join(", ");
  }
  if (typeof v === "object" && v.name) return v.name;
  return null;
}

function projectFromAirtable(r: any, liderCache: Map<string, string>) {
  const f = r.fields || {};
  // S7-Fix · resolver linked record IDs a nombres si tenemos cache
  const lider = resolveLinked(f[FIELD_IDS.lider], liderCache) || getName(f[FIELD_IDS.lider]);
  const proceso = getName(f[FIELD_IDS.proceso]);
  const avance_pct = parseAvance(f[FIELD_IDS.avance]);
  const desviacion = getName(f[FIELD_IDS.desviacion]);

  return {
    airtable_id: r.id,
    address: f[FIELD_IDS.direccion] || null,
    city: f[FIELD_IDS.ciudad] || null,
    lider,
    proceso,
    avance_pct,
    gasto_materiales: f[FIELD_IDS.materiales] || null,
    gasto_trabajadores: f[FIELD_IDS.trabajadores] || null,
    presupuesto_interno: f[FIELD_IDS.presupuesto] || null,
    valor_interno: f[FIELD_IDS.interno] || null,
    valor_cliente: f[FIELD_IDS.cliente] || null,
    ganancia: f[FIELD_IDS.ganancia] || null,
    retraso_dias: typeof f[FIELD_IDS.retraso] === "number" ? f[FIELD_IDS.retraso] : null,
    monto_por_gastar: typeof f[FIELD_IDS.monto_por_gastar] === "number" ? f[FIELD_IDS.monto_por_gastar] : null,
    rentabilidad: typeof f[FIELD_IDS.rentabilidad] === "number" ? f[FIELD_IDS.rentabilidad] : null,
    monto_real: typeof f[FIELD_IDS.monto_real] === "number" ? f[FIELD_IDS.monto_real] : null,
    sqft: f[FIELD_IDS.sqft] || null,
    desviacion_label: desviacion,
    fecha_inicio: f[FIELD_IDS.inicio] || null,
    fecha_estimada_fin: f[FIELD_IDS.fin_estimado] || null,
    fecha_real_fin: f[FIELD_IDS.fin_real] || null,
    dias_transcurridos: f[FIELD_IDS.dias] || null,
    fotos_url: f[FIELD_IDS.fotos_url] || null,
    raw: f,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function computeKPIs(p: any, today: string) {
  const avance = p.avance_pct;
  const presup = p.presupuesto_interno;
  const matCost = p.gasto_materiales || 0;
  const laborCost = p.gasto_trabajadores || 0;
  const totalCost = matCost + laborCost;

  // Días
  const totalDaysPlanned = daysBetween(p.fecha_inicio, p.fecha_estimada_fin);
  const daysElapsed = daysBetween(p.fecha_inicio, today);
  const daysToEnd = daysBetween(today, p.fecha_estimada_fin);

  // SPI = % avance / % tiempo. >1 adelanto, <1 atraso
  let spi = null;
  if (avance != null && totalDaysPlanned && totalDaysPlanned > 0 && daysElapsed != null && daysElapsed >= 0) {
    const timePct = Math.min(100, (daysElapsed / totalDaysPlanned) * 100);
    spi = timePct > 0 ? (avance / timePct) : null;
  }

  // CPI = (presup * avance%) / costo. >1 ahorro, <1 sobre-costo
  let cpi = null;
  if (presup && presup > 0 && totalCost > 0 && avance != null) {
    const earnedValue = presup * (avance / 100);
    cpi = earnedValue / totalCost;
  }

  // Burn rate y proyección
  let burnRate = null, projected = null;
  if (totalCost > 0 && daysElapsed && daysElapsed > 0) {
    burnRate = totalCost / daysElapsed;
    if (totalDaysPlanned) projected = burnRate * totalDaysPlanned;
  }

  // Flags
  const flags: string[] = [];
  if (spi != null && spi < THRESHOLD_SPI_ATRASADA) flags.push("atrasada");
  if (cpi != null && cpi < THRESHOLD_CPI_SOBRECOSTO) flags.push("sobre_presupuesto");
  if (presup && totalCost > presup * THRESHOLD_BUDGET_USAGE_HIGH && (avance || 0) < 90) flags.push("presupuesto_alto");
  if ((p.proceso === "En construcción" || (avance != null && avance < 100 && avance > 0)) && projected && presup && projected > presup * 1.1) flags.push("proyeccion_sobrecosto");

  return {
    spi: spi != null ? Number(spi.toFixed(3)) : null,
    cpi: cpi != null ? Number(cpi.toFixed(3)) : null,
    burn_rate: burnRate != null ? Number(burnRate.toFixed(2)) : null,
    proyeccion_costo_final: projected != null ? Number(projected.toFixed(2)) : null,
    days_elapsed: daysElapsed,
    days_to_end: daysToEnd,
    total_cost: totalCost,
    flags,
  };
}

async function checkEstancada(sb: any, airtable_id: string, currentAvance: number | null): Promise<boolean> {
  if (currentAvance == null || currentAvance >= 100) return false;
  const cutoff = new Date(Date.now() - THRESHOLD_DAYS_ESTANCADA * 86400000).toISOString().split("T")[0];
  const { data } = await sb.from("remodel_snapshots")
    .select("avance_pct,snapshot_date")
    .eq("airtable_id", airtable_id)
    .gte("snapshot_date", cutoff)
    .order("snapshot_date", { ascending: true })
    .limit(1);
  if (!data || !data.length) return false;
  return data[0].avance_pct === currentAvance;
}

function generateAlerts(p: any, kpis: any, estancada: boolean): any[] {
  const alerts: any[] = [];
  if (p.proceso === "Finalizado") return alerts;

  if (kpis.flags.includes("atrasada")) {
    alerts.push({
      airtable_id: p.airtable_id, alert_type: "atrasada", severity: "critical",
      title: `🚨 Obra atrasada — ${p.address}`,
      detail: `SPI ${kpis.spi}. Avance ${p.avance_pct}% pero ya pasó ${kpis.days_elapsed}d de obra. Líder: ${p.lider || '—'}`,
      metric_value: kpis.spi, threshold: THRESHOLD_SPI_ATRASADA,
    });
  }
  if (kpis.flags.includes("sobre_presupuesto")) {
    alerts.push({
      airtable_id: p.airtable_id, alert_type: "sobre_presupuesto", severity: "critical",
      title: `🚨 Sobre presupuesto — ${p.address}`,
      detail: `CPI ${kpis.cpi}. Gastado $${kpis.total_cost.toLocaleString()} vs ganado $${(p.presupuesto_interno * (p.avance_pct||0)/100).toLocaleString()}.`,
      metric_value: kpis.cpi, threshold: THRESHOLD_CPI_SOBRECOSTO,
    });
  }
  if (kpis.flags.includes("proyeccion_sobrecosto")) {
    alerts.push({
      airtable_id: p.airtable_id, alert_type: "proyeccion_sobrecosto", severity: "warning",
      title: `⚠️ Proyección sobre-costo — ${p.address}`,
      detail: `Burn rate $${kpis.burn_rate}/d. Proyectado al final: $${kpis.proyeccion_costo_final?.toLocaleString()} (presupuesto $${p.presupuesto_interno?.toLocaleString()}).`,
      metric_value: kpis.proyeccion_costo_final, threshold: p.presupuesto_interno,
    });
  }
  if (estancada) {
    alerts.push({
      airtable_id: p.airtable_id, alert_type: "estancada", severity: "warning",
      title: `🟡 Obra estancada — ${p.address}`,
      detail: `Mismo % avance (${p.avance_pct}%) por ${THRESHOLD_DAYS_ESTANCADA}+ días. Investigar bloqueo.`,
      metric_value: p.avance_pct, threshold: null,
    });
  }
  // Ratio anormal materiales/trabajadores
  const mat = p.gasto_materiales || 0, lab = p.gasto_trabajadores || 0;
  if (mat + lab > 5000) {
    const ratio = mat / (mat + lab);
    if (ratio > 0.65 || ratio < 0.25) {
      alerts.push({
        airtable_id: p.airtable_id, alert_type: "ratio_anormal", severity: "info",
        title: `📊 Ratio materiales/trabajadores fuera de rango — ${p.address}`,
        detail: `${Math.round(ratio*100)}% materiales / ${Math.round((1-ratio)*100)}% trabajadores. Típico Austin ~45/55.`,
        metric_value: ratio, threshold: 0.5,
      });
    }
  }
  return alerts;
}

// Fetch genérico de una tabla por ID (returnFieldsByFieldId)
async function fetchAirtableTableById(tableId: string): Promise<any[]> {
  const records: any[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}`);
    url.searchParams.set("returnFieldsByFieldId", "true");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    if (!res.ok) { console.warn(`Skip table ${tableId}: ${res.status}`); return []; }
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

function normAddr(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 14);
}

// Agrega "Horas trabajadas semana" → costo/hora promedio + rendimiento por trabajador.
// Sección 3.3-3.4 del prompt: anidar horas y pago por trabajador para obtener costo/hora.
async function computeWorkerStats(): Promise<{costoHora: number, totalHoras: number, nTrabajadores: number, porTrabajador: Record<string, {horas:number, pago:number, costoHora:number}>}> {
  const records = await fetchAirtableTableById(AIRTABLE_HORAS_TABLE);
  let totalHoras = 0, totalPago = 0;
  const porTrabajador: Record<string, {horas:number, pago:number, costoHora:number}> = {};
  records.forEach((r: any) => {
    const f = r.fields || {};
    const trab = getName(f[HORAS_FIELDS.trabajador]) || "(sin trabajador)";
    const horas = +f[HORAS_FIELDS.horas] || 0;
    const pago = +f[HORAS_FIELDS.pago] || 0;
    if (horas <= 0) return;
    totalHoras += horas;
    totalPago += pago;
    if (!porTrabajador[trab]) porTrabajador[trab] = { horas: 0, pago: 0, costoHora: 0 };
    porTrabajador[trab].horas += horas;
    porTrabajador[trab].pago += pago;
  });
  Object.values(porTrabajador).forEach(w => { w.costoHora = w.horas > 0 ? +(w.pago / w.horas).toFixed(2) : 0; });
  const costoHora = totalHoras > 0 ? +(totalPago / totalHoras).toFixed(2) : 0;
  return { costoHora, totalHoras, nTrabajadores: Object.keys(porTrabajador).length, porTrabajador };
}

// Refina coeficientes globales desde casas completas y los escribe a remodel_forecast_params
async function computeAndStoreRefinement(sb: any, projected: any[]) {
  // Pagos otros agregados por casa (match por dirección normalizada)
  const otrosRecords = await fetchAirtableTableById(AIRTABLE_PAGOS_OTROS_TABLE);
  const otrosByCasa: Record<string, number> = {};
  otrosRecords.forEach((r: any) => {
    const f = r.fields || {};
    const casa = getName(f[PAGOS_OTROS_FIELDS.casa]);
    const precio = +f[PAGOS_OTROS_FIELDS.precio] || 0;
    if (!casa) return;
    const k = normAddr(casa);
    otrosByCasa[k] = (otrosByCasa[k] || 0) + precio;
  });

  // Casas COMPLETAS = Finalizado + sqft válido + ambas fechas
  const completas = projected.filter(p =>
    p.proceso === "Finalizado" && +p.sqft > 0 && p.fecha_inicio && p.fecha_real_fin
  );

  const n = completas.length;
  let totalPsf = 0, moRatioSum = 0, diasPorSqftSum = 0, otrosPctSum = 0, otrosCount = 0;
  completas.forEach(p => {
    const mat = +p.gasto_materiales || 0, lab = +p.gasto_trabajadores || 0;
    const cost = mat + lab;
    const sqft = +p.sqft;
    if (cost > 0 && sqft > 0) {
      totalPsf += cost / sqft;
      moRatioSum += lab / cost;
      const dias = daysBetween(p.fecha_inicio, p.fecha_real_fin);
      if (dias && dias > 0) diasPorSqftSum += dias / sqft;
      const otros = otrosByCasa[normAddr(p.address)] || 0;
      if (otros > 0) { otrosPctSum += otros / cost; otrosCount++; }
    }
  });

  const params: Record<string, number> = { n_casas_completas: n };
  if (n > 0) {
    params.total_psf_real = +(totalPsf / n).toFixed(2);
    params.mo_ratio_real = +((moRatioSum / n) * 100).toFixed(1);
    params.dias_por_sqft_real = +(diasPorSqftSum / n).toFixed(4);
  }
  if (otrosCount > 0) params.otros_costos_pct_real = +((otrosPctSum / otrosCount) * 100).toFixed(1);

  // Leer n_threshold actual
  const { data: thRow } = await sb.from("remodel_forecast_params").select("value").eq("key", "n_threshold").maybeSingle();
  const nThreshold = thRow ? +thRow.value : N_THRESHOLD_DEFAULT;

  // Estadísticas de trabajadores (Horas trabajadas semana → costo/hora promedio)
  let workerStats: any = null;
  try { workerStats = await computeWorkerStats(); }
  catch (e) { console.warn("workerStats skip:", String(e)); }

  // Escribir SIEMPRE los valores "_real" + n_casas (visibilidad).
  // Solo promover a los params que usa el motor (dias_por_sqft, otros_costos_pct) si n >= threshold.
  const upserts: any[] = [
    { key: "n_casas_completas", value: n, label: "Casas completas (Finalizado + sqft + fechas)" },
  ];
  if (workerStats && workerStats.costoHora > 0) {
    upserts.push({ key: "costo_hora_promedio", value: workerStats.costoHora, label: "Costo/hora promedio (de Horas trabajadas semana)" });
    upserts.push({ key: "total_horas_trabajadas", value: workerStats.totalHoras, label: "Total horas registradas en Airtable" });
    upserts.push({ key: "n_trabajadores", value: workerStats.nTrabajadores, label: "# trabajadores únicos con horas registradas" });
  }
  if (params.total_psf_real != null) upserts.push({ key: "total_psf_real", value: params.total_psf_real, label: "Total $/sqft real (histórico)" });
  if (params.mo_ratio_real != null) upserts.push({ key: "mo_ratio_real", value: params.mo_ratio_real, label: "% mano de obra real (histórico)" });
  if (params.dias_por_sqft_real != null) upserts.push({ key: "dias_por_sqft_real", value: params.dias_por_sqft_real, label: "Días/sqft real (histórico)" });
  if (params.otros_costos_pct_real != null) upserts.push({ key: "otros_costos_pct_real", value: params.otros_costos_pct_real, label: "% otros costos real (histórico)" });

  if (n >= nThreshold) {
    if (params.dias_por_sqft_real != null) upserts.push({ key: "dias_por_sqft", value: params.dias_por_sqft_real, label: "Días/sqft (activo, refinado)" });
    if (params.otros_costos_pct_real != null) upserts.push({ key: "otros_costos_pct", value: params.otros_costos_pct_real, label: "% otros costos (activo, refinado)" });
  }

  for (const u of upserts) {
    await sb.from("remodel_forecast_params").upsert({ ...u, updated_at: new Date().toISOString() }, { onConflict: "key" });
  }
  return { n, nThreshold, promovido: n >= nThreshold, ...params, workerStats };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startMs = Date.now();
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split("T")[0];

  let body: any = {};
  try { body = await req.json(); } catch {}
  const triggeredBy = body.user_id || null;

  try {
    // S7-Fix · Resolver linked records (Cuadrillas → nombres de líderes)
    // Fetcheamos las tablas linked primero y construimos un cache ID → nombre
    const liderCache = new Map<string, string>();
    const nameRows: any[] = [];
    for (const tableName of AIRTABLE_LINKED_TABLES) {
      try {
        const linked = await fetchAirtableTableByName(tableName);
        for (const lr of linked) {
          const name = extractPrimaryName(lr);
          if (name) {
            liderCache.set(lr.id, name);
            nameRows.push({
              record_id: lr.id,
              name,
              table_ref: tableName,
              base_id: AIRTABLE_BASE_ID,
              last_synced_at: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.warn(`Linked table ${tableName} failed:`, e);
      }
    }
    if (nameRows.length) {
      await sb.from("airtable_record_names").upsert(nameRows, { onConflict: "record_id" });
    }

    const airtableRecords = await fetchAirtable();
    let snapshotCount = 0, alertCount = 0;
    const projectedAll: any[] = [];

    // Limpiar alertas no resueltas — se regeneran
    await sb.from("remodel_alerts").delete().is("resolved_at", null);

    for (const r of airtableRecords) {
      const proj = projectFromAirtable(r, liderCache);
      if (!proj.address) continue;
      projectedAll.push(proj);

      // Upsert propiedad
      await sb.from("remodel_at_properties")
        .upsert(proj, { onConflict: "airtable_id" });

      // Calcular KPIs y snapshot
      const kpis = computeKPIs(proj, today);
      const estancada = await checkEstancada(sb, proj.airtable_id, proj.avance_pct);
      if (estancada) kpis.flags.push("estancada");

      const snapshot = {
        airtable_id: proj.airtable_id,
        snapshot_date: today,
        avance_pct: proj.avance_pct,
        gasto_materiales: proj.gasto_materiales,
        gasto_trabajadores: proj.gasto_trabajadores,
        gasto_total: kpis.total_cost || null,
        presupuesto: proj.presupuesto_interno,
        dias_desde_inicio: kpis.days_elapsed,
        dias_hasta_fin_estimado: kpis.days_to_end,
        spi: kpis.spi,
        cpi: kpis.cpi,
        burn_rate: kpis.burn_rate,
        proyeccion_costo_final: kpis.proyeccion_costo_final,
        flags: kpis.flags,
      };
      const { error: sErr } = await sb.from("remodel_snapshots")
        .upsert(snapshot, { onConflict: "airtable_id,snapshot_date" });
      if (!sErr) snapshotCount++;

      // Alertas (sólo para obras activas)
      const alerts = generateAlerts(proj, kpis, estancada);
      if (alerts.length) {
        await sb.from("remodel_alerts").insert(alerts);
        alertCount += alerts.length;
      }
    }

    let wbStatus = "skip";
    // Backbone: asignar property_id (properties.id) a obras/proyectos/actividades nuevas (self-healing).
    try { await sb.rpc("remodel_backfill_property_ids"); } catch (e) { console.warn("property_id backfill skip:", String(e)); }

    // Write-back del avance_real (Planner) → campo 'Avance Real (Planner)' en Airtable (Supabase es la fuente del avance).
    // Requiere que el AIRTABLE_TOKEN tenga scope data.records:write en la base de Remodelación (si no → 403, se saltea).
    try {
      const { data: avRows } = await sb.from("remodel_at_properties")
        .select("airtable_id, avance_real").eq("active", true).not("avance_real", "is", null);
      const patches = (avRows || []).filter((r: any) => r.airtable_id && r.avance_real != null)
        .map((r: any) => ({ id: r.airtable_id, fields: { "fld5nTFwW161Xu3sk": Math.round(Number(r.avance_real)) } }));
      for (let i = 0; i < patches.length; i += 10) {
        const wbRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ records: patches.slice(i, i + 10), typecast: false }),
        });
        wbStatus = wbRes.ok ? ("ok " + patches.length) : (wbRes.status + " " + (await wbRes.text()).slice(0, 80));
        if (!wbRes.ok) break;
      }
    } catch (e) { wbStatus = "err"; console.warn("avance write-back skip:", String(e)); }

    // Soft-delete de paridad: archivar obras NO vistas en este run (fantasmas borrados en Airtable).
    // Seguro: se basa en last_synced_at (los vistos quedaron con last_synced_at ≈ ahora por el upsert).
    const seenIds = projectedAll.map((p) => p.airtable_id).filter(Boolean);
    const runStartIso = new Date(startMs).toISOString();
    try {
      await sb.from("remodel_at_properties")
        .update({ active: false, archived_at: new Date().toISOString() })
        .lt("last_synced_at", runStartIso).eq("active", true);
      if (seenIds.length) {
        await sb.from("remodel_at_properties")
          .update({ active: true, archived_at: null }).in("airtable_id", seenIds);
      }
      const { count: mirrorCount } = await sb.from("remodel_at_properties")
        .select("id", { count: "exact", head: true }).eq("active", true);
      const airtableCount = seenIds.length;
      await sb.from("remodel_sync_parity").upsert({
        source: "remodel_at_properties",
        airtable_count: airtableCount,
        mirror_count: mirrorCount ?? airtableCount,
        in_sync: (mirrorCount ?? airtableCount) === airtableCount,
        checked_at: new Date().toISOString(),
      }, { onConflict: "source" });
    } catch (e) { console.warn("parity/softdelete skip:", String(e)); }

    // Overhead / EBITDA (P1-4): Gastos Empresariales + Nómina Admin + Plataformas → remodel_overhead
    try {
      const OVERHEAD_SOURCES = [
        { table: "tblk1vS2PW6OP0OyY", source: "gastos_empresariales", monto: "fldDgzONzOg9v0tev", concepto: "fldIUMOsInhxxGs5Y", fecha: "fld12a5wWYFPSM5VH", categoria: "fldr8TNXyOx6fF9qR", mes: "fld9h5l9GOAeI3Czr", anio: "fldFDsokteNLzRGem" },
        { table: "tblv77DAUX7mznOso", source: "nomina_admin", monto: "fldv0pTlmzh9Qxaoo", concepto: "fldPI1F8hqouEaXUL", mes: "fldy8UDu3y9OD9MLi" },
        { table: "tblgd4wcFSa7Aq9R5", source: "plataformas", monto: "fldYnTphFfdhuDAm0", concepto: "fld3ELE48t7BtgUQo", mes: "fldZQqHQz1xCLXBWI" },
      ] as any[];
      const sel = (v: any) => (v && v.name) || (Array.isArray(v) ? (v[0]?.name || v[0]) : v) || null;
      const ohRows: any[] = [];
      for (const src of OVERHEAD_SOURCES) {
        const recs = await fetchAirtableTableById(src.table);
        for (const r of recs) {
          const f = r.fields || {};
          ohRows.push({
            airtable_id: r.id, source: src.source,
            concepto: f[src.concepto] != null ? String(f[src.concepto]) : null,
            monto: typeof f[src.monto] === "number" ? f[src.monto] : null,
            fecha: src.fecha ? (f[src.fecha] || null) : null,
            categoria: src.categoria ? sel(f[src.categoria]) : null,
            mes: src.mes ? sel(f[src.mes]) : null,
            anio: src.anio ? sel(f[src.anio]) : null,
            active: true, archived_at: null, last_synced_at: new Date().toISOString(),
          });
        }
      }
      if (ohRows.length) {
        for (let i = 0; i < ohRows.length; i += 500) {
          await sb.from("remodel_overhead").upsert(ohRows.slice(i, i + 500), { onConflict: "airtable_id" });
        }
        await sb.from("remodel_overhead").update({ active: false, archived_at: new Date().toISOString() }).lt("last_synced_at", runStartIso).eq("active", true);
      }
    } catch (e) { console.warn("overhead skip:", String(e)); }

    // RM-C2: Pago de Materiales → remodel_material_payments (control de presupuesto por casa)
    try {
      const MP = { table: "tbl7ivvry9GW4H8X3", casa: "fld0beA7STBEOu0hT", propLink: "fldmdpIcIYEIEq5Pv", precio: "fldAm8O2PzNWU6fcZ", fecha: "fldLmoj5megyrXZAC", cat: "fldULzXeG5oegyud6", orden: "fld6GXm1R2W0JGkeS" };
      const addrByRec: Record<string, string> = {};
      projectedAll.forEach((p) => { if (p.airtable_id && p.address) addrByRec[p.airtable_id] = p.address; });
      const normA = (t: string) => (t || "").toLowerCase().replace(/(ee\.?\s*uu\.?|\yusa\y|\ytx\y|\ytexas\y|austin|round rock|marlin)/gi, "").replace(/[0-9]{5}(-[0-9]{4})?/g, "").replace(/\b(dr|st|rd|ave|ln|trail|cove|way|path|blvd|ct|pl|street|drive|road|avenue|lane|place|court)\b/g, "").replace(/[^a-z0-9]/g, "");
      const mpRecs = await fetchAirtableTableById(MP.table);
      const mpRows = mpRecs.map((r) => {
        const f = r.fields || {};
        const linked = Array.isArray(f[MP.propLink]) ? f[MP.propLink][0] : null;
        const linkId = typeof linked === "string" ? linked : (linked as any)?.id;
        const addr = (linkId && addrByRec[linkId]) || (typeof f[MP.casa] === "string" ? f[MP.casa] : null);
        const cat = f[MP.cat];
        return {
          airtable_id: r.id, address: addr, address_norm: normA(String(addr || "")),
          precio: typeof f[MP.precio] === "number" ? f[MP.precio] : null,
          fecha: f[MP.fecha] || null,
          categoria: Array.isArray(cat) ? cat.map((x: any) => (x && x.name) || x).filter(Boolean).join(", ") : ((cat as any)?.name || cat || null),
          orden: f[MP.orden] || null,
          active: true, archived_at: null, last_synced_at: new Date().toISOString(),
        };
      }).filter((r) => r.address);
      for (let i = 0; i < mpRows.length; i += 500) {
        await sb.from("remodel_material_payments").upsert(mpRows.slice(i, i + 500), { onConflict: "airtable_id" });
      }
      await sb.from("remodel_material_payments").update({ active: false, archived_at: new Date().toISOString() }).lt("last_synced_at", runStartIso).eq("active", true);
      await sb.from("remodel_sync_parity").upsert({ source: "remodel_material_payments", airtable_count: mpRows.length, mirror_count: mpRows.length, in_sync: true, checked_at: new Date().toISOString() }, { onConflict: "source" });
    } catch (e) { console.warn("material payments skip:", String(e)); }

    // OKRs / Metas (Reportes CEO): tabla OKRs / Metas → remodel_okrs
    try {
      const OK = { table: "tblGUPnE4E5IrUGEt", metrica: "fldO1bR2kRbpkBMBk", clave: "fldmeai0JuTWSLvTs", objetivo: "fldXQbJB3I5o0q3zt", comparador: "fld0fngB6uZnV92CS", unidad: "fldRdSqlgqyQ10r9m", periodo: "fldTMwsdgQuAWVA4Q", descripcion: "fld3Q6boqaf1aGPUb" };
      const selName = (v: any) => (v && v.name) || (Array.isArray(v) ? (v[0]?.name || v[0]) : v) || null;
      const okRecs = await fetchAirtableTableById(OK.table);
      const okRows = okRecs.map((r: any) => {
        const f = r.fields || {};
        return {
          airtable_id: r.id,
          metrica: f[OK.metrica] != null ? String(f[OK.metrica]) : null,
          clave: f[OK.clave] != null ? String(f[OK.clave]) : null,
          objetivo: typeof f[OK.objetivo] === "number" ? f[OK.objetivo] : null,
          comparador: selName(f[OK.comparador]),
          unidad: selName(f[OK.unidad]),
          periodo: selName(f[OK.periodo]),
          descripcion: f[OK.descripcion] != null ? String(f[OK.descripcion]) : null,
          active: true, archived_at: null, last_synced_at: new Date().toISOString(),
        };
      });
      if (okRows.length) {
        for (let i = 0; i < okRows.length; i += 500) {
          await sb.from("remodel_okrs").upsert(okRows.slice(i, i + 500), { onConflict: "airtable_id" });
        }
        await sb.from("remodel_okrs").update({ active: false, archived_at: new Date().toISOString() }).lt("last_synced_at", runStartIso).eq("active", true);
      }
    } catch (e) { console.warn("okrs skip:", String(e)); }

    // Refinamiento del pronosticador desde casas completas (no rompe el sync si falla)
    let refinement: any = null;
    try { refinement = await computeAndStoreRefinement(sb, projectedAll); }
    catch (e) { console.warn("refinement skip:", String(e)); }

    // Log
    const duration_ms = Date.now() - startMs;
    await sb.from("remodel_sync_log").insert({
      records_synced: airtableRecords.length,
      snapshots_inserted: snapshotCount,
      alerts_generated: alertCount,
      duration_ms,
      triggered_by: triggeredBy,
    });

    return new Response(JSON.stringify({
      ok: true,
      records_synced: airtableRecords.length,
      snapshots: snapshotCount,
      alerts: alertCount,
      refinement,
      wb_status: wbStatus,
      duration_ms,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const duration_ms = Date.now() - startMs;
    await sb.from("remodel_sync_log").insert({
      error: String(e), duration_ms, triggered_by: triggeredBy,
    });
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
