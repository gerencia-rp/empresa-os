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
  ganancia: "fldjqSnHYrjkHtWRZ",
  desviacion: "fldVgmxP8Z1xtdrmj",
  inicio: "fldG2SABUD5Ptcuj8",
  fin_estimado: "fldQtRD47N2jHaRyh",
  fin_real: "fld8LqUjkqDV7qIP7",
  dias: "fld8kILrCV4xXras6",
  ciudad: "fldupd1Y33ciLAHjj",
  fotos_url: "fldVnVcQU9MjNHTYp",
};

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

    // Limpiar alertas no resueltas — se regeneran
    await sb.from("remodel_alerts").delete().is("resolved_at", null);

    for (const r of airtableRecords) {
      const proj = projectFromAirtable(r, liderCache);
      if (!proj.address) continue;

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
