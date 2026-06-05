// Elimina un usuario COMPLETAMENTE: profile + auth.user.
// Esto permite re-invitar el mismo email después.
// SEGURIDAD: requiere JWT real del header, no acepta requester_id del body.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Validar JWT del header + verificar que es admin
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const user_id = body.user_id;

  if (!user_id) return json({ ok: false, error: "Falta user_id" }, 400);
  if (user_id === auth.user_id) return json({ ok: false, error: "No podés eliminarte a vos mismo" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1) Eliminar profile (cascade limpia FKs)
  const { error: pErr } = await admin.from("profiles").delete().eq("id", user_id);
  if (pErr) return json({ ok: false, error: "Error borrando profile: " + pErr.message }, 500);

  // 2) Eliminar auth.user — esto es lo que faltaba. Sin esto, no se puede re-invitar el mismo email.
  const { error: aErr } = await admin.auth.admin.deleteUser(user_id);
  if (aErr) {
    return json({ ok: true, action: "profile_deleted_auth_failed",
      warning: "Profile eliminado pero auth.user no: " + aErr.message });
  }

  return json({ ok: true, action: "fully_deleted" });
});
