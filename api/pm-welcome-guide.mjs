// Endpoint Guía de Bienvenida (Vercel Node Function).
//   GET/POST /api/pm-welcome-guide?property_id=...[&unit_id=...][&format=pdf|html][&send=whatsapp|email&to=...]
// Auth: Bearer service key o JWT de usuario logueado.
import { reportConfig, reportConfigUser, fetchWelcomeGuideData } from "./_pm-report-data.mjs";
import { welcomeGuideHTML } from "./_pm-report-templates.mjs";
import { renderPDF } from "./_pm-pdf.mjs";
import { verifyAuth } from "./_pm-auth.mjs";
import { sendEmail, sendWhatsApp } from "./_pm-send.mjs";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const auth = await verifyAuth(req);
  if (!auth.ok) return res.status(401).json({ error: auth.reason });

  const q = req.query || {};
  const propertyId = q.property_id;
  if (!propertyId) return res.status(400).json({ error: "Falta ?property_id=" });
  const format = (q.format || "pdf").toLowerCase();
  const send = (q.send || "").toLowerCase();

  try {
    const cfg = auth.via === "service" ? reportConfig() : reportConfigUser(auth.token);
    const data = await fetchWelcomeGuideData(cfg, propertyId, q.unit_id || null);
    const html = welcomeGuideHTML(data);
    const slug = (data.address || "guia").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    const filename = `guia-bienvenida-${slug}.pdf`;

    if (format === "html" && !send) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.send(html);
    }

    const pdf = await renderPDF(html);

    if (send) {
      const to = q.to;
      if (!to) return res.status(400).json({ error: "Falta ?to=" });
      const title = `Guía de Bienvenida — ${data.address}`;
      if (send === "email") {
        const r = await sendEmail(to, title, `<p>¡Bienvenido/a! Adjuntamos tu guía de check-in para ${data.address}.</p>`, pdf, filename);
        return res.json({ ok: true, sent: "email", to, ...r });
      }
      if (send === "whatsapp") {
        const r = await sendWhatsApp(to, `🏠 ${title}\nWiFi: ${data.wifiName || "—"} · Acceso: ${data.accessCode || "ver guía"}`, pdf, filename);
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
