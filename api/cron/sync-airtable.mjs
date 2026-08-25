// Cron diario: Vercel Cron → pm-sync-airtable (Airtable base nueva → Supabase pm_*).
//
// Env vars (Vercel → Settings → Environment Variables):
//   SUPABASE_SERVICE_ROLE_KEY   (obligatorio) — Bearer para la edge function. DEBE ser
//                                 la MISMA service key que tiene la función (sb_secret_...),
//                                 igual que la usan los crons de alertas (pm-alerts isCron).
//   SUPABASE_FUNCTIONS_URL      (opcional)    — default deriva del proyecto.
//   CRON_SECRET                 (opcional)    — Vercel lo manda como Bearer en cron; si está, se valida.
//
// archive:false → sync defensivo (anti-wipe): NO archiva en el job desatendido. Para purgar
// registros borrados en Airtable, correr manualmente con archive:true tras revisar.
//
// Test manual:  GET/POST  /api/cron/sync-airtable
const DEFAULT_FUNCTIONS_URL = "https://nezbaljfhhyznhltpjnk.supabase.co/functions/v1";
import { fetchWithTimeout } from "../_fetch.mjs";

export default async function handler(req, res) {
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
    const r = await fetchWithTimeout(`${base}/pm-sync-airtable`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ dry_run: false, archive: false, triggered_by: "vercel-cron" }),
    }, 50000);
    const text = await r.text();
    // Sync FF (deals/draws/investors/overhead/HML) + Remodelación en el mismo cron — best-effort, no rompen el PM sync.
    let ffText = null, rmText = null;
    try {
      const rf = await fetchWithTimeout(`${base}/sync-ff-airtable`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ triggered_by: "vercel-cron" }),
      }, 50000);
      ffText = await rf.text();
    } catch (e) { ffText = "error: " + e.message; }
    try {
      const rr = await fetchWithTimeout(`${base}/sync-remodel-airtable`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ triggered_by: "vercel-cron" }),
      }, 50000);
      rmText = await rr.text();
    } catch (e) { rmText = "error: " + e.message; }
    try { await fetchWithTimeout(`${base}/sync-clickup`, { method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}" }, 50000); } catch (e) { /* best effort */ }
    res.status(r.status).setHeader("content-type", "application/json")
      .send(JSON.stringify({ pm: safeParse(text), ff: safeParse(ffText), remodel: safeParse(rmText) }));
  } catch (e) {
    res.status(502).json({ error: "Cron proxy error: " + e.message });
  }
}

function safeParse(t) { try { return JSON.parse(t); } catch { return t; } }
