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
    // Espejos independientes en paralelo: reducen duración total y ninguno
    // bloquea la respuesta principal de Property Management.
    const runMirror = async (path, body = "{}") => {
      try {
        const response = await fetchWithTimeout(`${base}/${path}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
          body,
        }, 50000);
        return await response.text();
      } catch (e) { return "error: " + e.message; }
    };
    const [ffText, rmText, clickupText, qbText] = await Promise.all([
      runMirror("sync-ff-airtable", JSON.stringify({ triggered_by: "vercel-cron" })),
      runMirror("sync-remodel-airtable", JSON.stringify({ triggered_by: "vercel-cron" })),
      runMirror("sync-clickup"),
      runMirror("qb-oauth/sync", JSON.stringify({ triggered_by: "vercel-cron" })),
    ]);
    res.status(r.status).setHeader("content-type", "application/json")
      .send(JSON.stringify({ pm: safeParse(text), ff: safeParse(ffText), remodel: safeParse(rmText), clickup: safeParse(clickupText), quickbooks: safeParse(qbText) }));
  } catch (e) {
    res.status(502).json({ error: "Cron proxy error: " + e.message });
  }
}

function safeParse(t) { try { return JSON.parse(t); } catch { return t; } }
