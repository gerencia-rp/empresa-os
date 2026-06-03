// Sync inverso: actualiza un record en Airtable desde la app
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AIRTABLE_KEY = Deno.env.get("AIRTABLE_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!AIRTABLE_KEY) return json({ ok: false, error: "Falta AIRTABLE_API_KEY" }, 500);
    const body = await req.json();
    const { mentorship_id, airtable_record_id, fields } = body || {};
    if (!mentorship_id || !airtable_record_id || !fields) return json({ ok: false, error: "Faltan mentorship_id, airtable_record_id, fields" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: m } = await supabase.from("edu_mentorships").select("airtable_base_id,airtable_students_table").eq("id", mentorship_id).single();
    if (!m?.airtable_base_id || !m?.airtable_students_table) return json({ ok: false, error: "Mentoría sin Airtable configurado" }, 400);

    // Limpiar fields null/undefined (Airtable PATCH ignora estos pero por las dudas)
    const clean: Record<string, any> = {};
    for (const k in fields) if (fields[k] != null) clean[k] = fields[k];

    const url = `https://api.airtable.com/v0/${m.airtable_base_id}/${m.airtable_students_table}/${airtable_record_id}`;
    const r = await fetch(url, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${AIRTABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: clean, typecast: true })  // typecast permite que Airtable convierta select options
    });
    const txt = await r.text();
    if (!r.ok) return json({ ok: false, error: `Airtable ${r.status}: ${txt.slice(0,400)}`, sent_fields: Object.keys(clean) }, 500);
    return json({ ok: true, updated_fields: Object.keys(clean), airtable_response: JSON.parse(txt) });
  } catch (err: any) {
    return json({ ok: false, error: "Excepción: " + (err?.message || String(err)) }, 500);
  }
});
