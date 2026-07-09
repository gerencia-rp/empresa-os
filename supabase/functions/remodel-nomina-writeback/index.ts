// remodel-nomina-writeback: crea el recibo quincenal en Airtable "Nomina Trabajadores en Campo"
// (base Remodelación appwFRqnkyyRljOld, tabla tblsmtrvcJbwwLjch) a partir de un remodel_payroll_receipts.
//
// UN recibo POR CASA por período. Movimiento de plata → DRY-RUN por defecto:
//   dry_run:true  (default) → devuelve EXACTAMENTE lo que se escribiría, SIN tocar Airtable.
//   dry_run:false → escribe (sólo tras aprobación humana en la UI) y marca airtable_writeback='ok'.
//
// Mismo patrón que pm-payment-writeback, pero:
//   - secret AIRTABLE_TOKEN (no AIRTABLE_API_KEY) → base de Remodelación.
//   - Responsable = "Lider asignado" de la Propiedad (Personal en Campo), resuelto en vivo.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const AIRTABLE_TOKEN = Deno.env.get("AIRTABLE_TOKEN")!;
const BASE_ID = Deno.env.get("AIRTABLE_BASE_ID_REMODEL") || "appwFRqnkyyRljOld";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// SAFE_MODE (default ON): valida el choice de "Estado del Pago" vía Meta API (requiere schema.bases:read).
// Apagar con WRITEBACK_SAFE_MODE=false si el token no tiene ese scope (usa typecast en su lugar).
const SAFE_MODE = (Deno.env.get("WRITEBACK_SAFE_MODE") ?? "true").toLowerCase() !== "false";

const NOMINA_TABLE = "tblsmtrvcJbwwLjch";     // Nomina Trabajadores en Campo
const PROP_TABLE = "tblw28KVOUcCAKZBU";       // Propiedad en Reparación
const F = {
  fecha:  "fld3N6NHkkvM93pAR",  // Fecha de Pago Quincena (date)
  ini:    "fldwKifKq76Un5Em7",  // Inicio de Periodo (date)
  fin:    "fldLa7LLEnO2C9ncC",  // Fin de Periodo (date)
  total:  "fldKWmMHGKPduuWce",  // Valor Total de Pago (currency)
  prop:   "fld3j9xJQnAprUuWW",  // Propiedad (link → Propiedad en Reparación)
  resp:   "fld9GOVwKmSKzTtBv",  // Responsable (link → Personal en Campo)
  estado: "fldEFY9GKbcQRrGWJ",  // Estado del Pago (singleSelect)
};
const PROP_LIDER = "fldGryDWkPw99eYCd";        // "Lider asignado" (link → Personal en Campo) en Propiedad en Reparación
const ESTADO_INICIAL = "Pendiente";            // choice válido: Pendiente / Realizado / Congelado

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

// Choices (nombres) por fieldId desde la Meta API. null si no está disponible (token sin schema.bases:read).
async function getChoices(): Promise<Record<string, Set<string>> | null> {
  const r = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  });
  if (!r.ok) return null;
  const j = await r.json();
  const t = (j.tables || []).find((x: any) => x.id === NOMINA_TABLE);
  if (!t) return null;
  const out: Record<string, Set<string>> = {};
  for (const f of t.fields || []) {
    if (f.options?.choices) out[f.id] = new Set(f.options.choices.map((c: any) => c.name));
  }
  return out;
}

// Responsable = recId del "Lider asignado" de la Propiedad (Personal en Campo). Cadena que pidió el negocio:
// Propiedad en Reparación → Lider asignado (mismo tabla que Responsable → recId directo, sin name-matching).
async function resolveLider(propRecId: string): Promise<string | null> {
  const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${PROP_TABLE}/${propRecId}?returnFieldsByFieldId=true`, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  });
  if (!r.ok) return null;
  const j = await r.json();
  const links = j.fields?.[PROP_LIDER];
  if (Array.isArray(links) && links.length) {
    const first = links[0];
    return typeof first === "string" ? first : (first?.id || null);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!AIRTABLE_TOKEN) return json({ ok: false, error: "Falta AIRTABLE_TOKEN" }, 500);
    const body = await req.json().catch(() => ({}));
    const receiptId = body.receipt_id;
    const dryRun = body.dry_run !== false;   // default DRY-RUN
    if (!receiptId) return json({ ok: false, error: "Falta receipt_id" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: rec, error } = await sb.from("remodel_payroll_receipts").select("*").eq("id", receiptId).single();
    if (error || !rec) return json({ ok: false, error: "Recibo no encontrado" }, 404);
    if (rec.airtable_record_id) return json({ ok: false, error: "Ya escrito en Airtable (recId " + rec.airtable_record_id + ")" }, 409);

    const casaRec: string | null = (rec.detalle && rec.detalle.casa_rec) || null;
    const warnings: string[] = [];
    let respRec: string | null = null;
    if (!casaRec) {
      warnings.push("Sin recId de casa (la casa no cruza con una obra del espejo) → no se puede enlazar Propiedad ni resolver Responsable.");
    } else {
      respRec = await resolveLider(casaRec);
      if (!respRec) warnings.push("La casa no tiene 'Lider asignado' en Airtable → Responsable queda vacío.");
    }

    // SAFE_MODE: valida el choice de Estado del Pago antes de escribir.
    if (SAFE_MODE) {
      const choices = await getChoices();
      if (!choices) return json({ ok: false, safe_mode: true, error: "no_puedo_validar_opciones",
        detail: "Meta API no disponible (token sin scope schema.bases:read). En SAFE_MODE no se escribe. Apagá con WRITEBACK_SAFE_MODE=false." }, 500);
      if (choices[F.estado] && !choices[F.estado].has(ESTADO_INICIAL)) {
        return json({ ok: false, safe_mode: true, error: "estado_no_existe", detail: `Estado del Pago: '${ESTADO_INICIAL}'` }, 500);
      }
    }

    const fields: Record<string, unknown> = {
      [F.fecha]: rec.fecha_pago,
      [F.ini]: rec.periodo_ini,
      [F.fin]: rec.periodo_fin,
      [F.total]: Number(rec.total) || 0,
      [F.estado]: ESTADO_INICIAL,
    };
    if (casaRec) fields[F.prop] = [casaRec];
    if (respRec) fields[F.resp] = [respRec];

    const blocking = !casaRec;   // sin Propiedad enlazable no tiene sentido escribir

    if (dryRun) {
      return json({ ok: true, dry_run: true, blocking, warnings,
        preview: { base: BASE_ID, table: NOMINA_TABLE, typecast: !SAFE_MODE, fields },
        resolved: { casa: rec.casa, lider: rec.lider, propiedad_rec: casaRec, responsable_rec: respRec, estado: ESTADO_INICIAL } });
    }

    if (blocking) return json({ ok: false, error: "Sin Propiedad enlazable (la casa no cruza con una obra del espejo)." }, 400);

    const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${NOMINA_TABLE}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ fields }], typecast: !SAFE_MODE }),
    });
    const txt = await r.text();
    if (!r.ok) return json({ ok: false, error: `Airtable ${r.status}: ${txt.slice(0, 300)}` }, 500);
    const j = JSON.parse(txt);
    const recId = j.records?.[0]?.id || null;
    await sb.from("remodel_payroll_receipts").update({ airtable_writeback: "ok", airtable_record_id: recId }).eq("id", receiptId);
    return json({ ok: true, dry_run: false, record_id: recId, warnings });
  } catch (err: any) {
    return json({ ok: false, error: "Excepción: " + (err?.message || String(err)) }, 500);
  }
});
