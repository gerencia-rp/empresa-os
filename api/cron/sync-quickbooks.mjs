// Vercel Cron → espejo contable de las cuatro empresas en QuickBooks.
// La ruta pública exige CRON_SECRET; el proxy transmite la service role solo
// entre servidores y la edge function vuelve a validarla.
import { fetchWithTimeout } from "../_fetch.mjs";

const DEFAULT_FUNCTIONS_URL = "https://nezbaljfhhyznhltpjnk.supabase.co/functions/v1";

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers["authorization"] || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: "No autorizado (CRON_SECRET)" });
    return;
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    res.status(500).json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." });
    return;
  }
  const base = process.env.SUPABASE_FUNCTIONS_URL || DEFAULT_FUNCTIONS_URL;
  try {
    const response = await fetchWithTimeout(`${base}/qb-oauth/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ triggered_by: "vercel-cron" }),
    }, 55000);
    const text = await response.text();
    res.status(response.status).setHeader("content-type", "application/json").send(text);
  } catch (error) {
    res.status(502).json({ error: "QuickBooks sync proxy: " + error.message });
  }
}
