// Auth para los endpoints de reportes/guía. Acepta:
//   1) La service key (cron / server) en Authorization: Bearer.
//   2) Un JWT de usuario logueado (Supabase Auth) — se valida contra /auth/v1/user.
//   3) CRON_SECRET (Vercel Cron lo manda como Bearer) si está configurado.
const DEFAULT_URL = "https://nezbaljfhhyznhltpjnk.supabase.co";

export async function verifyAuth(req) {
  const hdr = req.headers["authorization"] || req.headers["Authorization"] || "";
  const token = hdr.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, reason: "Falta Authorization Bearer" };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if ((serviceKey && token === serviceKey) || (cronSecret && token === cronSecret)) {
    return { ok: true, via: "service" };
  }

  // JWT de usuario → validar con Supabase Auth.
  const base = (process.env.SUPABASE_URL || DEFAULT_URL).replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const u = await r.json();
      return { ok: true, via: "user", email: u?.email || null };
    }
  } catch { /* fallthrough */ }
  return { ok: false, reason: "Token inválido" };
}
