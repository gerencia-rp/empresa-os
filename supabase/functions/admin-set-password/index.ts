// Permite al admin setear la contraseña de cualquier usuario.
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

  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const user_id = body.user_id;
  const new_password = body.new_password;

  if (!user_id || !new_password) return json({ ok: false, error: "Falta user_id / new_password" }, 400);
  if (new_password.length < 8) return json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { error } = await admin.auth.admin.updateUserById(user_id, { password: new_password });
  if (error) return json({ ok: false, error: error.message }, 500);

  return json({ ok: true });
});
