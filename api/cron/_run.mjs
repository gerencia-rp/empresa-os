// Runner compartido para los cron jobs de alertas (Vercel Cron → edge function).
// Los archivos con prefijo "_" NO son rutas en Vercel; es un helper.
//
// Env vars (Vercel → Settings → Environment Variables):
//   SUPABASE_SERVICE_ROLE_KEY   (obligatorio) — Bearer para la edge function
//   SUPABASE_FUNCTIONS_URL      (opcional)    — default deriva del proyecto
//   CRON_SECRET                 (opcional)    — Vercel lo manda como Bearer en cron;
//                                                si está seteado, se valida.
//
// Test manual (local con `vercel dev` o prod):
//   GET  /api/cron/check-contracts
//   POST /api/cron/check-contracts
const DEFAULT_FUNCTIONS_URL = "https://nezbaljfhhyznhltpjnk.supabase.co/functions/v1";
import { fetchWithTimeout } from "../_fetch.mjs";

export async function runCheck(check, req, res) {
  // Si CRON_SECRET está configurado, exigirlo (Vercel Cron lo envía automáticamente).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers["authorization"] || "";
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: "No autorizado (CRON_SECRET)" });
      return;
    }
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    res.status(500).json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." });
    return;
  }
  const base = process.env.SUPABASE_FUNCTIONS_URL || DEFAULT_FUNCTIONS_URL;
  try {
    const r = await fetchWithTimeout(`${base}/pm-alerts?check=${encodeURIComponent(check)}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ triggered_by: "vercel-cron", check }),
    }, 50000);
    const text = await r.text();
    res.status(r.status).setHeader("content-type", "application/json").send(text);
  } catch (e) {
    res.status(502).json({ error: "Cron proxy error: " + e.message });
  }
}
