// Sync pago de trabajadores de Remodelación (Airtable → Supabase).
// "Horas trabajadas semana" (persona × casa × semana: horas + pago) + "Cuadrillas" (pago x hora).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const AIRTABLE_TOKEN = Deno.env.get("AIRTABLE_TOKEN")!;
const AIRTABLE_BASE_ID = Deno.env.get("AIRTABLE_BASE_ID_REMODEL") || "appwFRqnkyyRljOld";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const HOURS_TABLE = "tblyCieXLFdZM60El"; // Horas trabajadas semana
const CREW_TABLE = "tblQzJoPvakTbz4gt";  // Cuadrillas
const F = { fecha: "fldkFHa9K5pRlO29V", worker: "fldpIYjB33HK0tdEk", casa: "fldN20CWfhDsgwQNS", horas: "fldRWftVP66WRcbYD", pago: "fldP8mv5lJdehwvKx" };
const C = { nombre: "fldnSityxRqbpwDEF", experiencia: "fld4PEcliEXZ4kTgY", rate: "fld4bAKu6waby0jrR" };

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function fetchAll(tableId: string) {
  const all: any[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("returnFieldsByFieldId", "true");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    const data = await res.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    all.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return all;
}

async function upsertChunks(sb: any, table: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + 500), { onConflict: "airtable_id" });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    const hours = await fetchAll(HOURS_TABLE);
    const hourRows = hours.map((r) => {
      const f = r.cellValuesByFieldId || r.fields || {};
      const casaArr = f[F.casa];
      const casaList = Array.isArray(casaArr) ? casaArr.map((x: any) => (x && x.name) || x) : (casaArr ? [casaArr] : []);
      const casa = casaList.join(", ");
      return {
        airtable_id: r.id,
        worker: f[F.worker] || null,
        casa: casa || null,
        casa_norm: norm(casaList[0] || ""),
        fecha: f[F.fecha] || null,
        horas: f[F.horas] ?? null,
        pago: f[F.pago] ?? null,
        last_synced_at: now,
      };
    });
    await upsertChunks(sb, "remodel_worker_hours", hourRows);

    const crews = await fetchAll(CREW_TABLE);
    const crewRows = crews.map((r) => {
      const f = r.cellValuesByFieldId || r.fields || {};
      const exp = f[C.experiencia];
      return {
        airtable_id: r.id,
        nombre: f[C.nombre] || null,
        experiencia: (exp && exp.name) || exp || null,
        pago_x_hora: f[C.rate] ?? null,
        last_synced_at: now,
      };
    });
    await upsertChunks(sb, "remodel_crew_rates", crewRows);

    return new Response(JSON.stringify({ ok: true, worker_hours: hourRows.length, crew_rates: crewRows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
