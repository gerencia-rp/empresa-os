// Cron LUNES AM → Reporte SEMANAL de operación (PDF) + envío.
// vercel.json: { "path": "/api/cron/report-weekly", "schedule": "0 13 * * 1" }  (13:00 UTC ≈ 8am CT)
// Env: CRON_SECRET (opc), SUPABASE_SERVICE_ROLE_KEY, REPORT_EMAIL_TO, REPORT_WHATSAPP_TO,
//      WEEKLY_REPORT_EMAIL_TO / WEEKLY_REPORT_WHATSAPP_TO (overrides opcionales).
import { reportConfig, fetchWeeklyData } from "../_pm-report-data.mjs";
import { weeklyReportHTML, BRAND } from "../_pm-report-templates.mjs";
import { sendEmail, sendWhatsApp } from "../_pm-send.mjs";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers["authorization"] || "") !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "No autorizado (CRON_SECRET)" });
  }
  try {
    const cfg = reportConfig();
    const data = await fetchWeeklyData(cfg, new Date());
    const html = weeklyReportHTML(data);                 // sin chromium: email HTML / resumen WA
    const title = "Reporte semanal de operación";
    const summary = `Ocupación ${data.occupancy.pct}% · ${data.occupancy.free} libre(s) · ${data.criticalAlerts.length} alerta(s) crítica(s).`;

    const emailTo = process.env.WEEKLY_REPORT_EMAIL_TO || process.env.REPORT_EMAIL_TO;
    const waTo = process.env.WEEKLY_REPORT_WHATSAPP_TO || process.env.REPORT_WHATSAPP_TO;
    const sent = [];
    if (emailTo) { try { await sendEmail(emailTo.split(","), title, html, null, null); sent.push("email"); } catch (e) { sent.push("email:ERR " + e.message); } }
    if (waTo) { for (const to of waTo.split(",")) { try { await sendWhatsApp(to.trim(), `📊 ${title}\n${summary}`, null, null); sent.push("wa:" + to.trim()); } catch (e) { sent.push("wa:ERR " + e.message); } } }

    return res.json({ ok: true, report: "weekly", summary, sent });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
