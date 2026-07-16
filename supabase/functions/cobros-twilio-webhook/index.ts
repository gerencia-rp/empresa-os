// ════════════════════════════════════════════════════════════════
// 📣 COBROS · WEBHOOK TWILIO (Fase 1) — dos trabajos:
//  1) STOP / opt-out (TCPA): SMS entrante con STOP/UNSUBSCRIBE/BAJA → marca
//     pm_tenants.opt_out=true por número — a ese teléfono NUNCA más se textea.
//  2) Delivery receipts (StatusCallback): actualiza provider_status del registro
//     en cobros_recordatorios (queued→sent→delivered/failed) — no solo "enviado".
// Twilio manda form-encoded; validación por firma X-Twilio-Signature (si hay
// TWILIO_AUTH_TOKEN seteado). Deploy con --no-verify-jwt (Twilio no manda JWT).
// ════════════════════════════════════════════════════════════════
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function validSignature(req: Request, params: URLSearchParams): Promise<boolean> {
  const tok = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!tok) return true;   // sandbox sin credenciales: aceptar (no hay envíos reales todavía)
  const sig = req.headers.get("X-Twilio-Signature") || "";
  const url = Deno.env.get("SUPABASE_URL")! + "/functions/v1/cobros-twilio-webhook";
  const data = url + [...params.keys()].sort().map((k) => k + params.get(k)).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(tok), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === sig;
}
const normPhone = (s: string) => String(s || "").replace(/[^0-9]/g, "").slice(-10);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const raw = await req.text();
  const p = new URLSearchParams(raw);
  if (!(await validSignature(req, p))) return new Response("bad signature", { status: 403 });

  // 2) delivery receipt
  const sid = p.get("MessageSid") || p.get("SmsSid");
  const status = p.get("MessageStatus") || p.get("SmsStatus");
  if (sid && status && !p.get("Body")) {
    await sb.from("cobros_recordatorios").update({ provider_status: status }).eq("provider_id", sid);
    return new Response("", { status: 204 });
  }

  // 1) SMS entrante → STOP
  const from = normPhone(p.get("From") || "");
  const bodyTxt = (p.get("Body") || "").trim().toUpperCase();
  if (from && /^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT|BAJA|ALTO)$/.test(bodyTxt)) {
    const { data: tens } = await sb.from("pm_tenants").select("id,phone,telefono_sms").eq("active", true);
    const hits = (tens || []).filter((t: { phone?: string; telefono_sms?: string }) =>
      normPhone(t.telefono_sms || "") === from || normPhone(t.phone || "") === from);
    for (const t of hits) {
      await sb.from("pm_tenants").update({ opt_out: true, opt_out_fecha: new Date().toISOString() }).eq("id", (t as { id: string }).id);
      await sb.from("cobros_recordatorios").insert({ tenant_id: (t as { id: string }).id, tipo: "opt_out", canal: "sms", destinatario: p.get("From"), cuerpo: bodyTxt, estado: "opt_out", provider: "twilio", provider_response: Object.fromEntries(p) });
    }
    // TwiML de confirmación (Twilio Advanced Opt-Out también responde solo; esto es respaldo)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Message>You are unsubscribed. No more messages will be sent. / Quedaste dado de baja.</Message></Response>', { headers: { "Content-Type": "text/xml" } });
  }
  // otros entrantes: registrar para respuesta manual (Gmail/humano)
  if (from && bodyTxt) {
    await sb.from("cobros_recordatorios").insert({ tipo: "entrante", canal: "sms", destinatario: p.get("From"), cuerpo: p.get("Body"), estado: "entrante", provider: "twilio", provider_response: Object.fromEntries(p) });
  }
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { "Content-Type": "text/xml" } });
});
