// Auth para los endpoints de reportes/guía. Acepta:
//   1) La service key (cron / server) en Authorization: Bearer → via "service".
//   2) Un JWT de usuario logueado (Supabase Auth) → se valida contra /auth/v1/user
//      usando la anon key como apikey (NO depende de SUPABASE_SERVICE_ROLE_KEY).
//   3) CRON_SECRET (si está configurado).
// Devuelve { ok, via, token } — token es el bearer a usar para leer datos.
import { PUBLIC_ANON_KEY, supabaseUrl } from "./_pm-report-data.mjs";

export async function verifyAuth(req) {
  const hdr = req.headers["authorization"] || req.headers["Authorization"] || "";
  const token = hdr.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, reason: "Falta Authorization Bearer" };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if ((serviceKey && token === serviceKey) || (cronSecret && token === cronSecret)) {
    return { ok: true, via: "service", token: serviceKey || token };
  }

  // JWT de usuario → validar con Supabase Auth usando la anon key como apikey.
  const apikey = process.env.SUPABASE_ANON_KEY || PUBLIC_ANON_KEY;
  try {
    const r = await fetch(`${supabaseUrl()}/auth/v1/user`, {
      headers: { apikey, Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const u = await r.json();
      return { ok: true, via: "user", token, email: u?.email || null };
    }
  } catch { /* fallthrough */ }
  return { ok: false, reason: "Token inválido" };
}
