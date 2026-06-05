// Invita usuarios al Empresa OS con rol + áreas pre-asignadas.
// SEGURIDAD: requiere JWT real del header, no acepta inviter_id del body.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

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

  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const email = (body.email || "").trim().toLowerCase();
  const role = body.role === "admin" ? "admin" : "viewer";
  const allowed_areas: string[] = Array.isArray(body.allowed_areas) ? body.allowed_areas : [];

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "Email inválido" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Si el email ya existe en profiles, solo actualizamos rol/áreas
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) {
    await admin.from("profiles").update({ role, allowed_areas }).eq("id", existing.id);
    return json({ ok: true, user_id: existing.id, action: "updated", email });
  }

  // Si NO está en profiles, puede estar todavía en auth.users (de una eliminación previa).
  // Buscamos en auth.users por email — si existe, re-creamos el profile y mandamos reset password.
  // (auth.admin.listUsers + filter es la API oficial)
  const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingAuth = authList?.users?.find((u: any) => (u.email || "").toLowerCase() === email);

  if (existingAuth) {
    // Ya existe en auth pero el profile fue eliminado. Re-crear profile + mandar magic link
    // de password recovery para que el usuario pueda volver a entrar.
    await admin.from("profiles").upsert(
      { id: existingAuth.id, email, role, allowed_areas },
      { onConflict: "id" }
    );
    // Mandamos un magic link / recovery para que reset su password
    const { error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${APP_URL}/` }
    });
    if (linkErr) {
      // No es bloqueante — el profile ya existe. Solo avisamos
      return json({ ok: true, user_id: existingAuth.id, action: "reactivated_no_email", email,
        warning: "Profile re-creado pero no pude mandar email de recovery: " + linkErr.message });
    }
    return json({ ok: true, user_id: existingAuth.id, action: "reactivated", email });
  }

  // Invitar al usuario nuevo (Supabase envía email con link de signup)
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
