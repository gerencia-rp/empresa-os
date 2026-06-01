// Invita usuarios al Empresa OS con rol + áreas pre-asignadas.
// El service-role permite crear el auth.user e insertar el profile.
// Requiere que el llamador sea admin (se valida server-side por seguridad).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://empresa-os.vercel.app";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const email = (body.email || "").trim().toLowerCase();
  const role = body.role === "admin" ? "admin" : "viewer";
  const allowed_areas: string[] = Array.isArray(body.allowed_areas) ? body.allowed_areas : [];
  const inviter_id = body.inviter_id;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "Email inválido" }, 400);
  if (!inviter_id) return json({ ok: false, error: "Falta inviter_id" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Verificación server-side: el que invita debe ser admin
  const { data: inviter } = await admin.from("profiles").select("role").eq("id", inviter_id).maybeSingle();
  if (!inviter || inviter.role !== "admin") return json({ ok: false, error: "Solo admins pueden invitar" }, 403);

  // Si el email ya existe, solo actualizamos rol/áreas
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) {
    await admin.from("profiles").update({ role, allowed_areas }).eq("id", existing.id);
    return json({ ok: true, user_id: existing.id, action: "updated", email });
  }

  // Invitar al usuario (Supabase envía email con link de signup)
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${APP_URL}/` });
  if (error) return json({ ok: false, error: error.message }, 400);

  const userId = data.user?.id;
  if (!userId) return json({ ok: false, error: "No se obtuvo user id de la invitación" }, 500);

  // El trigger handle_new_user ya creó el profile como viewer.
  // Actualizamos con el rol y áreas asignados por el admin.
  await admin.from("profiles").upsert(
    { id: userId, email, role, allowed_areas },
    { onConflict: "id" }
  );

  return json({ ok: true, user_id: userId, action: "invited", email });
});
