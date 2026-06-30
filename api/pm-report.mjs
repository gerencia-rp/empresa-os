// Endpoint de reportes PM (Vercel Node Function).
//   GET/POST /api/pm-report?type=weekly|monthly[&month=YYYY-MM][&format=pdf|html][&send=email|whatsapp&to=...]
// Auth: Bearer service key (cron) o JWT de usuario logueado (app).
//   · format=pdf (default) → PDF inline (chromium headless).
//   · format=html          → HTML (preview / debug).
//   · send=email|whatsapp  → genera + envía, devuelve JSON {ok,...}.
import { reportConfig, reportConfigUser, fetchWeeklyData, fetchMonthlyData, prevMonth } from "./_pm-report-data.mjs";
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
    // Prefiere service key (lee completo, sin RLS) si está en el server; si no, usa el
    // JWT del usuario (RLS). Setear SUPABASE_SERVICE_ROLE_KEY en Vercel = reportes completos.
    const cfg = process.env.SUPABASE_SERVICE_ROLE_KEY ? reportConfig() : reportConfigUser(auth.token);
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

    if (send) {
      // Envío SIN chromium: email = el reporte HTML como cuerpo; WhatsApp = resumen.
      const to = q.to;
      if (!to) return res.status(400).json({ error: "Falta ?to=" });
      if (send === "email") {
        const r = await sendEmail(to, title, html, null, null);
        return res.json({ ok: true, sent: "email", to, ...r });
      }
      if (send === "whatsapp") {
        const r = await sendWhatsApp(to, `📊 ${title}\n${summary}`, null, null);
        return res.json({ ok: true, sent: "whatsapp", to, ...r });
      }
      return res.status(400).json({ error: "send debe ser email|whatsapp" });
    }

    if (format === "pdf") {
      // PDF directo: render con chromium serverless (best-effort). La app usa format=html
      // + impresión del navegador (chromium del usuario), que es lo confiable.
      const pdf = await renderPDF(html);
      res.setHeader("content-type", "application/pdf");
      res.setHeader("content-disposition", `inline; filename="${filename}"`);
      return res.send(Buffer.from(pdf));
    }

    res.setHeader("content-type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
