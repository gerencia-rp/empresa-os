// Envío de PDFs por WhatsApp (link a Storage) y correo (Resend, adjunto).
// Resiliente: si falta config (bucket / RESEND_API_KEY / tokens WA), devuelve
// un error claro en vez de romper la generación del PDF.
import { fetchWithTimeout } from './_fetch.mjs';
const DEFAULT_URL = "https://nezbaljfhhyznhltpjnk.supabase.co";
const BUCKET = "pm-reports";

function cfg() {
  const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { supabaseUrl, key };
}

// Sube el PDF a Storage (bucket público pm-reports) y devuelve la URL pública.
export async function uploadPDF(buffer, filename) {
  const { supabaseUrl, key } = cfg();
  const path = `${new Date().toISOString().slice(0, 10)}/${filename}`;
  const r = await fetchWithTimeout(`${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/pdf", "x-upsert": "true" },
    body: Buffer.from(buffer),
  }, 30000);
  if (!r.ok) throw new Error(`Storage upload falló (${r.status}). ¿Existe el bucket público "${BUCKET}"? ${await r.text()}`);
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}

// WhatsApp: sube el PDF y manda un mensaje de texto con el link.
export async function sendWhatsApp(to, text, pdfBuffer, filename) {
  const { supabaseUrl, key } = cfg();
  let link = null;
  if (pdfBuffer) { link = await uploadPDF(pdfBuffer, filename); }
  const body = link ? `${text}\n\n📄 ${link}` : text;
  const r = await fetchWithTimeout(`${supabaseUrl}/functions/v1/whatsapp-send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, type: "text", text: body }),
  }, 20000);
  const out = await r.json().catch(() => ({}));
  if (!r.ok || out.ok === false) throw new Error("WhatsApp falló: " + (out.error || r.status));
  return { ok: true, link };
}

// Email vía Resend con el PDF adjunto.
export async function sendEmail(to, subject, html, pdfBuffer, filename) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REPORT_EMAIL_FROM || "Rental Profits <reportes@rentalprofitss.com>";
  if (!apiKey) throw new Error("Falta RESEND_API_KEY (correo no configurado).");
  const r = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: Array.isArray(to) ? to : [to], subject, html,
      attachments: pdfBuffer ? [{ filename, content: Buffer.from(pdfBuffer).toString("base64") }] : [],
    }),
  }, 20000);
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Resend falló: " + (out?.message || r.status));
  return { ok: true, id: out?.id };
}
