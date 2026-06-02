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

// Parse date from various formats
function parseDate(v: any): string | null {
  if (!v) return null;
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
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
  const stages = Array.isArray(m.stages) ? m.stages : [];
  const rows = allRecords.map((rec: any) => {
    const f = rec.fields || {};
    const fullName = findField(f, ['Nombre completo','Nombre Completo','Full Name','Nombre','Name','Estudiante','Student']) || `Estudiante ${rec.id.slice(-6)}`;
    const email = findField(f, ['Email','Correo','Correo electrónico','e-mail','Mail']);
    const phone = findField(f, ['Phone','Teléfono','Telefono','Celular','WhatsApp','Tel']);
    const city = findField(f, ['City','Ciudad']);
    const state = findField(f, ['State','Estado','Provincia']);
    const country = findField(f, ['Country','País','Pais']);
    const enrolledRaw = findField(f, ['Fecha inicio','Inicio','Fecha de inscripción','Enrolled','Start Date','Fecha ingreso','Ingreso']);
    const expiresRaw = findField(f, ['Vence','Fecha vencimiento','Expires','Expiration','End Date','Fecha fin','Termina']);
    const stageRaw = findField(f, ['Etapa','Stage','Current Stage','Etapa actual','Progreso','Fase']);
    const paymentRaw = findField(f, ['Pago','Payment','Estado de pago','Payment Status','Status de Pago']);
    const notes = findField(f, ['Notas','Notes','Comentarios','Observaciones']);
    const goals = findField(f, ['Metas','Goals','Objetivos','Objetivo']);

    const stageKey = stageRaw ? detectStage(String(Array.isArray(stageRaw)?stageRaw[0]:stageRaw), stages) : null;
    const paymentStatus = paymentRaw ? (() => {
      const p = String(Array.isArray(paymentRaw)?paymentRaw[0]:paymentRaw).toLowerCase();
      if (p.includes('vencid') || p.includes('expired') || p.includes('inactiv')) return 'expired';
      if (p.includes('atras') || p.includes('past') || p.includes('overdue')) return 'past_due';
      if (p.includes('pausa') || p.includes('paused')) return 'paused';
      if (p.includes('cancel')) return 'cancelled';
      return 'active';
    })() : 'active';

    return {
      mentorship_id: mentorshipId,
      airtable_record_id: rec.id,
      full_name: typeof fullName === 'object' ? JSON.stringify(fullName) : String(fullName).slice(0, 200),
      email: email ? String(Array.isArray(email)?email[0]:email).slice(0, 200) : null,
      phone: phone ? String(Array.isArray(phone)?phone[0]:phone).slice(0, 50) : null,
      city: city ? String(Array.isArray(city)?city[0]:city).slice(0, 100) : null,
      state: state ? String(Array.isArray(state)?state[0]:state).slice(0, 100) : null,
      country: country ? String(Array.isArray(country)?country[0]:country).slice(0, 100) : null,
      enrolled_at: parseDate(enrolledRaw),
      expires_at: parseDate(expiresRaw),
      current_stage: stageKey,
      payment_status: paymentStatus,
      notes: notes ? String(notes).slice(0, 2000) : null,
      goals: goals ? String(goals).slice(0, 2000) : null,
      updated_at: new Date().toISOString()
    };
  });

  // 4) Upsert por (mentorship_id, airtable_record_id)
  let inserted = 0;
  let updated = 0;
  const errors: any[] = [];
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error, count } = await supabase
      .from("edu_students")
      .upsert(slice, { onConflict: "mentorship_id,airtable_record_id", count: "exact" });
    if (error) errors.push(error.message);
    else updated += count || slice.length;
  }

  return json({
    ok: true,
    mentorship: m.name,
    fetched_from_airtable: allRecords.length,
    synced: rows.length,
    errors: errors.length ? errors : undefined
  });
});
