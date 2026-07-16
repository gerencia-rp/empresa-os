// ════════════════════════════════════════════════════════════════
// 📣 COBROS · MOTOR DIARIO (Fase 1 — solo recordatorios con link de pago)
// Recorre contratos activos y decide recordatorios usando la definición CORREGIDA
// de cartera (v_cobros_estado → v_cartera_inquilino): saldo NETEADO por inquilino,
// vencido (meses cerrados) ≠ mes en curso, pagos parciales soportados.
//  · Día de pago del inquilino → recordatorio amistoso (si el mes en curso no está cubierto)
//  · Followups (config followup_dias: 3,7,10 tras el día de pago) SOLO si vencido_neto > 0
//  · TCPA: SMS solo con consentimiento y sin opt_out · quiet hours 8-20 (tz config)
//  · CADA mensaje lleva link de pago (tenant.payment_link → link_pago_default; sin link = skip registrado)
//  · modo sandbox (default, A2P 10DLC en trámite): REGISTRA en cobros_recordatorios sin llamar proveedores
//  · modo live: Twilio (SMS, con StatusCallback → cobros-twilio-webhook) + Resend (email)
//  · dry_run=true: devuelve las decisiones SIN escribir nada (para aprobación humana)
// Los pagos frenan solos los recordatorios: el motor recalcula desde las vistas en cada corrida.
// ════════════════════════════════════════════════════════════════
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function render(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}
function firstName(s: string | null) { return String(s || "").trim().split(/\s+/)[0] || "vecino/a"; }
function money(n: number) { return "$" + (+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // auth: secret del proyecto (cron) o JWT de usuario con rol admin
  const bearer = (req.headers.get("authorization") || "").replace(/^bearer /i, "").trim();
  if (bearer !== SERVICE_KEY) {
    const auth = await requireAuth(req, { requireAdmin: true });
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);
  }
  let body: { dry_run?: boolean; fecha?: string } = {};
  try { body = await req.json(); } catch (_) { /* GET/empty */ }
  const dryRun = body.dry_run !== false;   // DEFAULT dry-run: nada se escribe sin pedirlo explícito

  // ── config ──
  const cfgRows = (await sb.from("cobros_config").select("*")).data || [];
  const cfg = Object.fromEntries(cfgRows.map((r: { key: string; value: string }) => [r.key, r.value]));
  const modo = cfg.modo || "sandbox";
  const followups = String(cfg.followup_dias || "3,7,10").split(",").map((x) => parseInt(x.trim())).filter(Boolean);
  const tz = cfg.tz_default || "America/Chicago";
  const quietStart = parseInt(cfg.quiet_start || "8"), quietEnd = parseInt(cfg.quiet_end || "20");

  // "hoy" en la zona del inquilino (param fecha para simular otros días)
  const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const hoy = body.fecha ? new Date(body.fecha + "T12:00:00") : nowLocal;
  const hora = nowLocal.getHours();
  const ymNow = hoy.toISOString().slice(0, 7);
  const diaHoy = hoy.getDate();
  const enQuiet = hora < quietStart || hora >= quietEnd;

  // ── estado por inquilino (definición corregida) + plantillas + dedupe del mes ──
  const [est, tpls, prev] = await Promise.all([
    sb.from("v_cobros_estado").select("*"),
    sb.from("pm_message_templates").select("key,body").like("key", "cobros_%"),
    sb.from("cobros_recordatorios").select("tenant_id,tipo,canal,mes_ref").eq("active", true).eq("mes_ref", ymNow),
  ]);
  if (est.error) return json({ ok: false, error: est.error.message }, 500);
  const T = Object.fromEntries((tpls.data || []).map((t: { key: string; body: string }) => [t.key, t.body]));
  const yaEnviado = new Set((prev.data || []).map((r: { tenant_id: string; tipo: string; canal: string }) => r.tenant_id + "|" + r.tipo + "|" + r.canal));

  type Decision = {
    tenant_id: string; inquilino: string; casa: string; tipo: string; canal: string; idioma: string;
    destinatario: string | null; asunto: string | null; cuerpo: string; payment_link: string | null;
    saldo_neteado: number; mes_ref: string; estado: string; provider: string; motivo?: string;
  };
  const decisiones: Decision[] = [];
  const resumen: Record<string, number> = {};
  const estados: unknown[] = [];

  for (const r of (est.data || []) as Record<string, never>[]) {
    const vencidoNeto = +(r.vencido_neto as number) || 0;
    const porCobrarNeto = +(r.por_cobrar_neto as number) || 0;
    const aFavor = +(r.a_favor as number) || 0;
    const pendienteTotal = vencidoNeto + porCobrarNeto;
    estados.push({ inquilino: r.inquilino, casa: r.casa, vencido_bruto: r.vencido_bruto, a_favor: aFavor, vencido_neto: vencidoNeto, por_cobrar_mes: r.por_cobrar_mes, por_cobrar_neto: porCobrarNeto, estado: r.estado_cobro, aging: r.aging });
    if ((r.estado_contrato as string) !== "activo") continue;

    // qué recordatorio toca HOY (si toca)
    const diaPago = +(r.dia_pago as number) || parseInt(cfg.dia_pago_default || "1");
    let tipo: string | null = null;
    if (diaHoy === diaPago && porCobrarNeto > 0) tipo = "due";
    else {
      const diasDesdeDue = diaHoy - diaPago;
      if (vencidoNeto > 0 && followups.includes(diasDesdeDue)) tipo = "followup_" + diasDesdeDue;
    }
    if (!tipo) continue;

    const idioma = (r.idioma as string) === "en" ? "en" : "es";
    const tplKey = "cobros_" + (tipo === "due" ? "due" : "followup") + "_" + idioma;
    const link = (r.payment_link as string) || cfg.link_pago_default || null;
    const dueDate = ymNow + "-" + String(diaPago).padStart(2, "0");
    const vars = {
      nombre: firstName(r.inquilino as string),
      direccion: String(r.casa || "tu propiedad").split(",")[0],
      unidad: "",
      monto_renta: money(+(r.rent_amount as number) || +(r.por_cobrar_mes as number) || 0),
      saldo: money(pendienteTotal),
      due_date: dueDate,
      link_pago: link || "(link de pago pendiente)",
    };
    const cuerpo = render(T[tplKey] || "", vars);
    const asunto = tipo === "due"
      ? (idioma === "en" ? "Rent reminder · " + vars.direccion : "Recordatorio de renta · " + vars.direccion)
      : (idioma === "en" ? "Outstanding balance · " + vars.direccion : "Saldo pendiente · " + vars.direccion);

    for (const canal of ["sms", "email"]) {
      if (yaEnviado.has((r.tenant_id as string) + "|" + tipo + "|" + canal)) continue;   // dedupe mes
      let estado = modo === "sandbox" ? "sandbox" : "pendiente";
      let motivo: string | undefined;
      const dest = canal === "sms" ? (r.telefono as string) : (r.email as string);
      if (!T[tplKey]) { estado = "skip_sin_plantilla"; motivo = tplKey; }
      else if (!dest) { estado = "skip_sin_destino"; motivo = canal; }
      else if (canal === "sms" && (r.opt_out as boolean)) { estado = "skip_optout"; motivo = "STOP recibido"; }
      else if (canal === "sms" && !(r.consentimiento_sms as boolean)) { estado = "skip_consent"; motivo = "TCPA: sin consentimiento SMS"; }
      else if (!link) { estado = "skip_sin_link"; motivo = "sin payment_link del inquilino ni default"; }
      else if (enQuiet && modo !== "sandbox") { estado = "skip_quiet"; motivo = "fuera de 8-20 " + tz; }
      decisiones.push({ tenant_id: r.tenant_id as string, inquilino: r.inquilino as string, casa: r.casa as string, tipo, canal, idioma, destinatario: dest || null, asunto, cuerpo, payment_link: link, saldo_neteado: pendienteTotal, mes_ref: ymNow, estado, provider: modo === "sandbox" ? "(sandbox)" : (canal === "sms" ? "twilio" : "resend"), motivo });
      resumen[estado] = (resumen[estado] || 0) + 1;
    }
  }

  // ── dry-run: devolver decisiones sin escribir ──
  if (dryRun) return json({ ok: true, dry_run: true, modo, fecha: hoy.toISOString().slice(0, 10), quiet: enQuiet, estados, decisiones, resumen });

  // ── ejecutar: sandbox registra; live envía y registra con respuesta del proveedor ──
  for (const d of decisiones) {
    let provider_id: string | null = null, provider_status: string | null = null, provider_response: unknown = null;
    if (d.estado === "pendiente" && modo === "live") {
      try {
        if (d.canal === "sms") {
          const sid = Deno.env.get("TWILIO_ACCOUNT_SID"), tok = Deno.env.get("TWILIO_AUTH_TOKEN"), from = Deno.env.get("TWILIO_FROM");
          if (!sid || !tok || !from) throw new Error("faltan secrets TWILIO_*");
          const res = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json", {
            method: "POST",
            headers: { Authorization: "Basic " + btoa(sid + ":" + tok), "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ To: d.destinatario!, From: from, Body: d.cuerpo, StatusCallback: SUPABASE_URL + "/functions/v1/cobros-twilio-webhook" }),
          });
          provider_response = await res.json();
          provider_id = (provider_response as { sid?: string }).sid || null;
          provider_status = (provider_response as { status?: string }).status || null;
          d.estado = res.ok ? "enviado" : "fallido";
        } else {
          const rk = Deno.env.get("RESEND_API_KEY");
          if (!rk) throw new Error("falta secret RESEND_API_KEY");
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST", headers: { Authorization: "Bearer " + rk, "Content-Type": "application/json" },
            body: JSON.stringify({ from: "Rental Profits <cobros@rentalprofitss.com>", to: [d.destinatario], subject: d.asunto, text: d.cuerpo }),
          });
          provider_response = await res.json();
          provider_id = (provider_response as { id?: string }).id || null;
          d.estado = res.ok ? "enviado" : "fallido";
        }
      } catch (e) { d.estado = "fallido"; provider_response = { error: String(e) }; }
    }
    await sb.from("cobros_recordatorios").insert({
      tenant_id: d.tenant_id, tipo: d.tipo, canal: d.canal, idioma: d.idioma, destinatario: d.destinatario,
      asunto: d.asunto, cuerpo: d.cuerpo, payment_link: d.payment_link, saldo_neteado: d.saldo_neteado,
      mes_ref: d.mes_ref, estado: d.estado, provider: d.provider, provider_id, provider_status, provider_response,
    });
  }
  return json({ ok: true, dry_run: false, modo, registrados: decisiones.length, resumen });
});
