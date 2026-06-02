// Sincroniza estudiantes desde Airtable → edu_students (Supabase)
// Token Airtable se lee desde env AIRTABLE_API_KEY (Supabase Vault/Secrets).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AIRTABLE_KEY = Deno.env.get("AIRTABLE_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

// Buscar campo por nombres comunes (case-insensitive)
function findField(fields: any, candidates: string[]): any {
  if (!fields) return null;
  const keys = Object.keys(fields);
  for (const cand of candidates) {
    const k = keys.find(k => k.toLowerCase().trim() === cand.toLowerCase().trim());
    if (k && fields[k] != null && fields[k] !== '') return fields[k];
  }
  // Try contains
  for (const cand of candidates) {
    const k = keys.find(k => k.toLowerCase().includes(cand.toLowerCase()));
    if (k && fields[k] != null && fields[k] !== '') return fields[k];
  }
  return null;
}

// Normaliza un valor que puede ser string, array (linked records), o objeto
function normalize(v: any): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    // Array de strings (linked record names) o de objetos {name, id}
    const first = v[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object') return first.name || first.value || String(first);
    return String(first);
  }
  if (typeof v === 'object') return v.name || v.value || JSON.stringify(v);
  return String(v);
}

// Parse date from various formats
function parseDate(v: any): string | null {
  const s = normalize(v);
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

// Heurística para detectar la etapa del estudiante desde un texto libre
function detectStage(text: string, stages: any[]): string | null {
  if (!text || !stages?.length) return null;
  const t = String(text).toLowerCase();
  for (const s of stages) {
    if (t.includes(s.name.toLowerCase()) || t.includes(s.key.toLowerCase())) return s.key;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!AIRTABLE_KEY) return json({ ok: false, error: "Falta AIRTABLE_API_KEY en Supabase secrets" }, 500);

  let body: any = {};
  try { body = await req.json(); } catch {}
  const mentorshipId = body.mentorship_id;
  if (!mentorshipId) return json({ ok: false, error: "Falta mentorship_id" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1) Cargar config de la mentoría
  const { data: m, error: mErr } = await supabase.from("edu_mentorships").select("*").eq("id", mentorshipId).single();
  if (mErr || !m) return json({ ok: false, error: "Mentoría no encontrada: " + mentorshipId }, 404);
  if (!m.airtable_base_id || !m.airtable_students_table) return json({ ok: false, error: "Mentoría sin Airtable configurado" }, 400);

  // 2) Fetch todos los records de Airtable (paginación)
  const baseId = m.airtable_base_id;
  const tableId = m.airtable_students_table;
  const allRecords: any[] = [];
  let offset: string | null = null;
  let pages = 0;
  try {
    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
      url.searchParams.set("pageSize", "100");
      if (offset) url.searchParams.set("offset", offset);
      const r = await fetch(url.toString(), {
        headers: { "Authorization": `Bearer ${AIRTABLE_KEY}` }
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`Airtable ${r.status}: ${txt.slice(0,200)}`);
      }
      const j: any = await r.json();
      allRecords.push(...(j.records || []));
      offset = j.offset || null;
      pages++;
      if (pages > 50) break;  // safety
    } while (offset);
  } catch (e: any) {
    return json({ ok: false, error: "Fetch Airtable: " + e.message }, 500);
  }

  // 3) Mapear cada record → estructura edu_students
  // Heurísticas AMPLIADAS para nomenclatura real del usuario
  const stages = Array.isArray(m.stages) ? m.stages : [];
  const rows = allRecords.map((rec: any) => {
    const f = rec.fields || {};
    // Nombre — añadidas variantes de linked records (From Ventas), "Nombre Cliente"
    const fullName = normalize(findField(f, [
      'Nombre completo','Nombre Completo','Full Name','Nombre',
      'Nombre Cliente','Nombre Cliente (From Ventas)','Cliente',
      'Name','Estudiante','Student'
    ])) || `Estudiante ${rec.id.slice(-6)}`;

    const email = normalize(findField(f, ['Email','Correo','Correo electrónico','e-mail','Mail','correo electronico']));
    const phone = normalize(findField(f, ['Phone','Teléfono','Telefono','Celular','WhatsApp','Tel']));
    const city = normalize(findField(f, ['City','Ciudad']));
    const state = normalize(findField(f, ['State','Estado','Provincia']));
    const country = normalize(findField(f, ['Country','País','Pais']));

    // FECHAS — más variantes
    const enrolledRaw = findField(f, [
      'Fecha inicio','Fecha de inicio','Inicio','Fecha de inscripción','Fecha inscripción',
      'Enrolled','Start Date','Fecha ingreso','Ingreso','Fecha de Compra','Fecha compra'
    ]);
    const expiresRaw = findField(f, [
      'Vence','Fecha vencimiento','Fecha de vencimiento','Vencimiento',
      'Fecha de finalización','Fecha finalización','Fecha fin','Termina',
      'Expires','Expiration','End Date'
    ]);

    // STAGE — ampliado a "Proceso", "Estado del Estudiante", "Estado"
    const stageRaw = normalize(findField(f, [
      'Etapa','Etapa actual','Stage','Current Stage',
      'Proceso','Estado del Estudiante','Estado Estudiante',
      'Progreso','Fase','Estado Renovación','ONBOARDING'
    ]));

    const paymentRaw = normalize(findField(f, [
      'Estado de pago','Estado pago','Payment Status','Status de Pago',
      'Pago','Payment','Estado de vigencia','Estado de Cuotas Visual','Estado Cuotas'
    ]));

    const notes = normalize(findField(f, ['Notas','Notes','Comentarios','Observaciones','Próximo seguimiento']));
    const goals = normalize(findField(f, ['Metas','Goals','Objetivos','Objetivo','Compromiso']));

    const stageKey = stageRaw ? detectStage(stageRaw, stages) : null;
    const paymentStatus = paymentRaw ? (() => {
      const p = paymentRaw.toLowerCase();
      if (p.includes('vencid') || p.includes('expired') || p.includes('inactiv') || p.includes('bloque')) return 'expired';
      if (p.includes('atras') || p.includes('past') || p.includes('overdue') || p.includes('pendiente')) return 'past_due';
      if (p.includes('pausa') || p.includes('paused')) return 'paused';
      if (p.includes('cancel')) return 'cancelled';
      return 'active';
    })() : 'active';

    // STATUS general del estudiante
    const statusRaw = normalize(findField(f, ['Status','Estado','Estado del Estudiante']));
    let status = 'active';
    if (statusRaw) {
      const s = statusRaw.toLowerCase();
      if (s.includes('expir') || s.includes('vencid')) status = 'dropped';
      else if (s.includes('graduad')) status = 'graduated';
      else if (s.includes('pausa')) status = 'paused';
      else if (s.includes('riesgo') || s.includes('risk')) status = 'at_risk';
    }

    return {
      mentorship_id: mentorshipId,
      airtable_record_id: rec.id,
      full_name: (fullName || `Estudiante ${rec.id.slice(-6)}`).slice(0, 200),
      email: email ? email.slice(0, 200) : null,
      phone: phone ? phone.slice(0, 50) : null,
      city: city ? city.slice(0, 100) : null,
      state: state ? state.slice(0, 100) : null,
      country: country ? country.slice(0, 100) : null,
      enrolled_at: parseDate(enrolledRaw),
      expires_at: parseDate(expiresRaw),
      current_stage: stageKey,
      payment_status: paymentStatus,
      status,
      notes: notes ? notes.slice(0, 2000) : null,
      goals: goals ? goals.slice(0, 2000) : null,
      updated_at: new Date().toISOString()
    };
  });

  // 4) Upsert por (mentorship_id, airtable_record_id)
  let synced = 0;
  const errors: any[] = [];
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error, data } = await supabase
      .from("edu_students")
      .upsert(slice, { onConflict: "mentorship_id,airtable_record_id" })
      .select("id");
    if (error) {
      errors.push(error.message);
    } else {
      synced += (data?.length || 0);
    }
  }

  // Debug info
  const fieldNamesInAirtable = allRecords.length > 0 ? Object.keys(allRecords[0].fields || {}) : [];
  const sampleMapped = rows.slice(0, 2);

  return json({
    ok: true,
    mentorship: m.name,
    fetched_from_airtable: allRecords.length,
    synced,
    errors: errors.length ? errors : undefined,
    debug: {
      airtable_field_names: fieldNamesInAirtable,
      sample_mapped_record: sampleMapped[0] || null,
      note: synced === 0 && errors.length
        ? "Synced=0 + errores → corré el SQL edu-fix-constraint.sql en Supabase para arreglar el ON CONFLICT."
        : synced > 0
          ? "Verificá los campos mapeados. Si algo está vacío decime cómo se llama en Airtable y lo mapeo."
          : "Sin records ni errores — la tabla Airtable está vacía."
    }
  });
});
