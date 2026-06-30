// Endpoint de reportes PM (Vercel Node Function).
//   GET/POST /api/pm-report?type=weekly|monthly[&month=YYYY-MM][&format=pdf|html][&send=email|whatsapp&to=...]
// Auth: Bearer service key (cron) o JWT de usuario logueado (app).
//   · format=pdf (default) → PDF inline (chromium headless).
//   · format=html          → HTML (preview / debug).
//   · send=email|whatsapp  → genera + envía, devuelve JSON {ok,...}.
import { reportConfig, fetchWeeklyData, fetchMonthlyData, prevMonth } from "./_pm-report-data.mjs";
import { weeklyReportHTML, monthlyReportHTML, BRAND } from "./_pm-report-templates.mjs";
import { renderPDF } from "./_pm-pdf.mjs";
import { verifyAuth } from "./_pm-auth.mjs";
import { sendEmail, sendWhatsApp } from "./_pm-send.mjs";

export const config = { maxDuration: 60 };

function parseMonth(q) {
  const m = /^(\d{4})-(\d{1,2})$/.exec(q || "");
  return m ? { year: +m[1], month: +m[2] } : null;
}

export default async function handler(req, res) {
  const auth = await verifyAuth(req);
  if (!auth.ok) return res.status(401).json({ error: auth.reason });

  const q = req.query || {};
  const type = (q.type || "weekly").toLowerCase();
  const format = (q.format || "pdf").toLowerCase();
  const send = (q.send || "").toLowerCase();

  try {
    const cfg = reportConfig();
    let html, filename, title, summary;
    if (type === "monthly") {
      const m = parseMonth(q.month) || prevMonth(new Date());
      const data = await fetchMonthlyData(cfg, m.year, m.month, new Date());
      html = monthlyReportHTML(data);
      filename = `reporte-mensual-${data.period.year}-${String(data.period.month).padStart(2, "0")}.pdf`;
      title = `Reporte mensual · ${data.period.label}`;
      summary = `Ingresos ${data.income} · Gastos ${data.expenseTotal} · Cashflow ${data.cashflow}. ${data.losses.length} casa(s) en pérdida.`;
    } else {
      const data = await fetchWeeklyData(cfg, new Date());
      html = weeklyReportHTML(data);
      filename = "reporte-semanal.pdf";
      title = "Reporte semanal de operación";
      summary = `Ocupación ${data.occupancy.pct}% · ${data.occupancy.free} unidad(es) libre(s) · ${data.criticalAlerts.length} alerta(s) crítica(s).`;
    }

    if (format === "html" && !send) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.send(html);
    }

    const pdf = await renderPDF(html);

    if (send) {
      const to = q.to;
      if (!to) return res.status(400).json({ error: "Falta ?to=" });
      if (send === "email") {
        const r = await sendEmail(to, title, `<p>${BRAND.name} — ${title}.</p><p>${summary}</p>`, pdf, filename);
        return res.json({ ok: true, sent: "email", to, ...r });
      }
      if (send === "whatsapp") {
        const r = await sendWhatsApp(to, `📊 ${title}\n${summary}`, pdf, filename);
        return res.json({ ok: true, sent: "whatsapp", to, ...r });
      }
      return res.status(400).json({ error: "send debe ser email|whatsapp" });
    }

    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `inline; filename="${filename}"`);
    return res.send(Buffer.from(pdf));
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
