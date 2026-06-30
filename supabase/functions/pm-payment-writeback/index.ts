// Write-back: crea un registro de pago en Airtable "Pagos" (base NUEVA) desde la app.
// Best-effort: si falla, el pago ya quedó guardado en pm_payments (no se pierde).
//
// BASE NUEVA apptTKRYbx6gu701i (cutover 2026-06-29): Pagos enlaza Inquilino/Casa/Reserva
// por LINKED RECORD ID (no texto/single-select). El front manda los recIds (tenant_rec,
// casa_rec, reserva_rec) que saca de pmaState (tenant.external_id, property.airtable_address_id,
// booking.external_id). Plataforma sigue siendo single-select (se valida en SAFE_MODE).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const AIRTABLE_KEY = Deno.env.get("AIRTABLE_API_KEY")!;
const BASE_ID = Deno.env.get("AIRTABLE_BASE_ID") || "apptTKRYbx6gu701i";
const PAGOS_TABLE = "tbl5p63dUEhrzgHVJ";
// SAFE_MODE (default ON): NO usa typecast; valida que Plataforma exista EXACTO como opción.
// Apagar con env WRITEBACK_SAFE_MODE=false una vez validado que los nombres están limpios.
const SAFE_MODE = (Deno.env.get("WRITEBACK_SAFE_MODE") ?? "true").toLowerCase() !== "false";
// Field IDs de "Pagos" (base nueva)
const F = {
  pago:    "fldc3bGGY0JZMeODz",   // Pago (primary, texto)
  monto:   "fld4plr3PqxUksUgo",   // Monto (currency)
  fecha:   "fld6lAfD9vg7fUv6T",   // Fecha de Pago (date)
  plat:    "fldfrgInDS8MQp12Z",   // Plataforma (single-select)
  inq:     "fld01OK8T8TJl8ZXb",   // Inquilino (linked record)
  casa:    "fld0RYuPMMUpcgnoF",   // Casa (linked record)
  reserva: "fldU0KUvfPEdpp1tY"    // Reserva (linked record)
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

// Choices (nombres) por fieldId desde la Meta API. null si la Meta API no está disponible.
async function getChoices(token: string): Promise<Record<string, Set<string>> | null> {
  const r = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!r.ok) return null;
  const j = await r.json();
  const t = (j.tables || []).find((x: any) => x.id === PAGOS_TABLE);
  if (!t) return null;
  const out: Record<string, Set<string>> = {};
  for (const f of t.fields || []) {
    if (f.options?.choices) out[f.id] = new Set(f.options.choices.map((c: any) => c.name));
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.airtable_token || AIRTABLE_KEY;
    if (!token) return json({ ok: false, error: "Falta AIRTABLE_API_KEY" }, 500);

    const fields: Record<string, any> = {};
    if (body.concepto)      fields[F.pago]    = String(body.concepto).slice(0, 200);
    if (body.monto != null) fields[F.monto]   = Number(body.monto);
    if (body.fecha)         fields[F.fecha]   = String(body.fecha);
    if (body.plataforma)    fields[F.plat]    = String(body.plataforma);
    // Linked records: arrays de record IDs de Airtable (recXXXXXXXXXXXXXX).
    if (body.tenant_rec)    fields[F.inq]     = [String(body.tenant_rec)];
    if (body.casa_rec)      fields[F.casa]    = [String(body.casa_rec)];
    if (body.reserva_rec)   fields[F.reserva] = [String(body.reserva_rec)];
    if (!Object.keys(fields).length) return json({ ok: false, error: "Sin campos para escribir" }, 400);

    // GUARDRAIL: en SAFE_MODE validamos la opción de Plataforma (único single-select) antes de crear.
    if (SAFE_MODE && body.plataforma) {
      const choices = await getChoices(token);
      if (!choices) return json({ ok: false, safe_mode: true,
        error: "no_puedo_validar_opciones", detail: "Meta API no disponible (token sin scope schema.bases:read). En SAFE_MODE no se crea el record." }, 500);
      if (choices[F.plat] && !choices[F.plat].has(String(body.plataforma))) {
        return json({ ok: false, safe_mode: true,
          error: "opción_no_existe", detail: `Plataforma: '${body.plataforma}'`,
          hint: "Corregí el nombre o creá la opción en Airtable, o apagá SAFE_MODE (WRITEBACK_SAFE_MODE=false)." }, 500);
      }
    }

    const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${PAGOS_TABLE}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      // SAFE_MODE → typecast:false (opciones ya validadas). Normal → typecast:true.
      body: JSON.stringify({ records: [{ fields }], typecast: !SAFE_MODE })
    });
    const txt = await r.text();
    if (!r.ok) return json({ ok: false, error: `Airtable ${r.status}: ${txt.slice(0, 300)}` }, 500);
    const j = JSON.parse(txt);
    return json({ ok: true, safe_mode: SAFE_MODE, record_id: j.records?.[0]?.id || null });
  } catch (err: any) {
    return json({ ok: false, error: "Excepción: " + (err?.message || String(err)) }, 500);
  }
});
