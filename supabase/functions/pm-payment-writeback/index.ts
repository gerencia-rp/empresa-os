// Write-back: crea un registro de pago en Airtable "Pagos Rentas" desde la app.
// Best-effort: si falla, el pago ya quedó guardado en pm_payments (no se pierde).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const AIRTABLE_KEY = Deno.env.get("AIRTABLE_API_KEY")!;
const BASE_ID = Deno.env.get("AIRTABLE_BASE_ID") || "appzEnsuy4qPT6iHj";
const PAGOS_TABLE = "tblqJlSgnLNfn34dh";
// SAFE_MODE (default ON): NO usa typecast; valida que Casa/Plataforma/Tipo existan EXACTO
// como opción en Airtable. Si no → 500 "opción_no_existe" (no crea opciones nuevas).
// Apagar con env WRITEBACK_SAFE_MODE=false una vez validado que los nombres están limpios.
const SAFE_MODE = (Deno.env.get("WRITEBACK_SAFE_MODE") ?? "true").toLowerCase() !== "false";
// Field IDs de "Pagos Rentas"
const F = {
  inq:   "fldfuAgnhxOcLOF6s",   // Inquilino (texto)
  casa:  "fldi8Xbv68PwMBfyH",   // Casa (single-select)
  tipo:  "fldnWnsVeieiIi2VQ",   // Tipo/Unidad (single-select)
  plat:  "fldjRoQFc8oU6TP1U",   // Plataforma (single-select)
  fecha: "fldvN5b0F88ZMz0VE",   // Fecha de Pago (date)
  monto: "fldLtAtolVlJMmVuX",   // Monto (number)
  obs:   "fldi5nc7sag6tkzqX"    // Observación (texto)
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
    if (body.inquilino)   fields[F.inq]   = String(body.inquilino);
    if (body.casa)        fields[F.casa]  = String(body.casa);
    if (body.tipo)        fields[F.tipo]  = String(body.tipo);
    if (body.plataforma)  fields[F.plat]  = String(body.plataforma);
    if (body.fecha)       fields[F.fecha] = String(body.fecha);
    if (body.monto != null) fields[F.monto] = Number(body.monto);
    if (body.observacion) fields[F.obs]   = String(body.observacion).slice(0, 500);
    if (!Object.keys(fields).length) return json({ ok: false, error: "Sin campos para escribir" }, 400);

    // GUARDRAIL: en SAFE_MODE validamos las opciones de los single-select antes de crear.
    if (SAFE_MODE) {
      const choices = await getChoices(token);
      if (!choices) return json({ ok: false, safe_mode: true,
        error: "no_puedo_validar_opciones", detail: "Meta API no disponible (token sin scope schema.bases:read). En SAFE_MODE no se crea el record." }, 500);
      const bad: string[] = [];
      const chk = (fieldId: string, val: any, label: string) => {
        if (val && choices[fieldId] && !choices[fieldId].has(String(val))) bad.push(`${label}: '${val}'`);
      };
      chk(F.casa, body.casa, "Casa");
      chk(F.plat, body.plataforma, "Plataforma");
      chk(F.tipo, body.tipo, "Tipo");
      if (bad.length) return json({ ok: false, safe_mode: true,
        error: "opción_no_existe", detail: bad.join("; "),
        hint: "Corregí el nombre o creá la opción en Airtable, o apagá SAFE_MODE (WRITEBACK_SAFE_MODE=false)." }, 500);
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
