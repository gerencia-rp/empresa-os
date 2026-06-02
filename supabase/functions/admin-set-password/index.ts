// Permite al admin setear la contraseña de cualquier usuario.
// Útil cuando un empleado olvidó su password y no puede esperar al email de reset.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const user_id = body.user_id;
  const new_password = body.new_password;
  const requester_id = body.requester_id;

  if (!user_id || !new_password || !requester_id) return json({ ok: false, error: "Falta user_id / new_password / requester_id" }, 400);
  if (new_password.length < 6) return json({ ok: false, error: "La contraseña debe tener al menos 6 caracteres" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Verificar que el requester sea admin
  const { data: requester } = await admin.from("profiles").select("role").eq("id", requester_id).maybeSingle();
  if (!requester || requester.role !== "admin") return json({ ok: false, error: "Solo admins pueden cambiar contraseñas" }, 403);

  const { error } = await admin.auth.admin.updateUserById(user_id, { password: new_password });
  if (error) return json({ ok: false, error: error.message }, 500);

  return json({ ok: true });
});
