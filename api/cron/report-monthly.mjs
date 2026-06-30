// Cron DÍA 1 → Reporte MENSUAL de finanzas (PDF, mes anterior cerrado) + envío.
// vercel.json: { "path": "/api/cron/report-monthly", "schedule": "0 13 1 * *" }
// Env: CRON_SECRET (opc), SUPABASE_SERVICE_ROLE_KEY, REPORT_EMAIL_TO, REPORT_WHATSAPP_TO,
//      MONTHLY_REPORT_EMAIL_TO / MONTHLY_REPORT_WHATSAPP_TO (overrides opcionales).
import { reportConfig, fetchMonthlyData, prevMonth } from "../_pm-report-data.mjs";
import { monthlyReportHTML, BRAND } from "../_pm-report-templates.mjs";
import { renderPDF } from "../_pm-pdf.mjs";
import { sendEmail, sendWhatsApp } from "../_pm-send.mjs";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers["authorization"] || "") !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "No autorizado (CRON_SECRET)" });
  }
  try {
    const cfg = reportConfig();
    const m = prevMonth(new Date());                 // mes anterior (cerrado)
    const data = await fetchMonthlyData(cfg, m.year, m.month, new Date());
    const pdf = await renderPDF(monthlyReportHTML(data));
    const filename = `reporte-mensual-${data.period.year}-${String(data.period.month).padStart(2, "0")}.pdf`;
    const title = `Reporte mensual · ${data.period.label}`;
    const summary = `Ingresos ${data.income} · Gastos ${data.expenseTotal} · Cashflow ${data.cashflow}. ${data.losses.length} casa(s) en pérdida.`;

    const emailTo = process.env.MONTHLY_REPORT_EMAIL_TO || process.env.REPORT_EMAIL_TO;
    const waTo = process.env.MONTHLY_REPORT_WHATSAPP_TO || process.env.REPORT_WHATSAPP_TO;
    const sent = [];
    if (emailTo) { try { await sendEmail(emailTo.split(","), title, `<p>${BRAND.name} — ${title}</p><p>${summary}</p>`, pdf, filename); sent.push("email"); } catch (e) { sent.push("email:ERR " + e.message); } }
    if (waTo) { for (const to of waTo.split(",")) { try { await sendWhatsApp(to.trim(), `💰 ${title}\n${summary}`, pdf, filename); sent.push("wa:" + to.trim()); } catch (e) { sent.push("wa:ERR " + e.message); } } }

    return res.json({ ok: true, report: "monthly", period: data.period.label, summary, sent, bytes: pdf.length });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
