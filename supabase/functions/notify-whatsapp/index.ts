// ════════════════════════════════════════════════════════════════
// 📲 NOTIFY-WHATSAPP — canal PERSONAL del CEO (Meta WhatsApp Cloud API).
// Empuja a MI teléfono (y solo al mío): el matutino del Cerebro (7:45 Austin)
// y las alertas 🔴 nuevas (Sabueso críticas + integridad) cada 15 min.
//
// LÍMITE DURO: esta función SOLO escribe a los destinatarios de
// user_notification_prefs (whatsapp_enabled=true). CERO auto-envío a terceros:
// los borradores de cobranza/informes a inquilinos siguen esperando el
// "Aprobar" humano en el Command Center — esta función no los toca.
//
// Reusa la infra Meta Cloud ya configurada (misma app/credenciales que
// whatsapp-send-cloud): secrets META_WHATSAPP_PHONE_ID + META_WHATSAPP_TOKEN
// (+ WA_BUSINESS_ID para crear plantillas).
// Fuera de la ventana de 24h Meta exige plantilla aprobada → env opcionales
// WA_MORNING_TEMPLATE / WA_ALERTS_TEMPLATE (+ WA_TEMPLATE_LANG, default 'es').
// Sin plantilla → free-form (solo entrega dentro de la ventana de 24h).
//
// Modos (?mode= o body.mode):
//   whoami          → número del negocio (a dónde mandar "hola" para abrir la ventana)
//   create-templates→ envía a aprobación las plantillas cerebro_matutino/cerebro_alertas
//   register        → guarda/confirma mi número en user_notification_prefs
//   test            → mensaje de prueba (free-form; o template=hello_world para probar fuera de ventana)
//   morning         → matutino del Cerebro (guard 07:45 America/Chicago; force=1 lo saltea)
//   alerts          → SOLO alertas nuevas desde la última corrida (dedup); 1ª vez = digest del backlog
// Auth: bearer = SERVICE_KEY (cron) o JWT admin.
// Deploy: npx supabase functions deploy notify-whatsapp
// ════════════════════════════════════════════════════════════════
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = (Deno.env.get("APP_URL") || "https://empresa-os.vercel.app").replace(/\/$/, "");
const GRAPH = "https://graph.facebook.com/v18.0";
const PHONE_ID = Deno.env.get("META_WHATSAPP_PHONE_ID") || Deno.env.get("WA_PHONE_NUMBER_ID") || "";
const WA_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN") || Deno.env.get("WA_ACCESS_TOKEN") || "";
const WABA_ID = Deno.env.get("WA_BUSINESS_ID") || "";
const TMPL_LANG = Deno.env.get("WA_TEMPLATE_LANG") || "es";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function money(n: number) { return "$" + (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function digits(n: string) { let p = String(n || "").replace(/\D/g, ""); if (p.length === 10) p = "1" + p; return p; }

// Hora local America/Chicago (Austin) — guard del matutino, robusto al DST.
function austinHM(): { h: number; m: number } {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", hour12: false });
  const mm = s.match(/(\d{1,2}):(\d{2})/);
  return mm ? { h: +mm[1] % 24, m: +mm[2] } : { h: -1, m: -1 };
}

// ── Envío por Meta WhatsApp Cloud API ──
async function metaSend(payload: Record<string, unknown>) {
  if (!PHONE_ID || !WA_TOKEN) return { ok: false, error: "faltan secrets META_WHATSAPP_PHONE_ID/META_WHATSAPP_TOKEN" };
  let res: Response, out: Record<string, any> = {};
  try {
    res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_TOKEN}` },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
    out = await res.json().catch(() => ({}));
  } catch (e) { return { ok: false, error: String((e as Error).message || e) }; }
  const id = out?.messages?.[0]?.id || null;
  return { ok: res.ok && !!id, id, status: res.ok ? "sent" : "failed", code: out?.error?.code || null, error: res.ok ? null : (out?.error?.message || ("HTTP " + res.status)), raw: out };
}
function sendText(to: string, body: string) { return metaSend({ to: digits(to), type: "text", text: { preview_url: true, body } }); }
function sendTemplate(to: string, name: string, params: string[], lang = TMPL_LANG) {
  const components = params.length ? [{ type: "body", parameters: params.map(p => ({ type: "text", text: p })) }] : [];
  return metaSend({ to: digits(to), type: "template", template: { name, language: { code: lang }, ...(components.length ? { components } : {}) } });
}

// Entrega con fallback: free-form; si falla por ventana 24h (131047/131051/131026) y hay
// plantilla configurada → reintenta con plantilla (params cortos = titular + link).
async function deliver(to: string, richBody: string, templateName: string | null, tmplParams: string[]) {
  if (templateName) {
    const t = await sendTemplate(to, templateName, tmplParams);
    if (t.ok) return t;
    // si la plantilla falla, probamos free-form (por si estamos dentro de ventana)
    const f = await sendText(to, richBody);
    return f.ok ? f : t;
  }
  const r = await sendText(to, richBody);
  return r;
}

async function logNotif(row: Record<string, unknown>) {
  try { await sb.from("notification_log").insert(row); } catch (_e) { /* no bloquea el envío */ }
}

async function recipients(override?: string | null) {
  if (override) return [{ user_id: null as string | null, whatsapp_number: override, notify_severities: ["critical", "warning", "info"] as string[], quiet_hours_start: null as string | null, quiet_hours_end: null as string | null }];
  const { data } = await sb.from("user_notification_prefs").select("user_id, whatsapp_number, notify_severities, quiet_hours_start, quiet_hours_end")
    .eq("whatsapp_enabled", true).not("whatsapp_number", "is", null);
  return data || [];
}

function inQuietHours(pref: { quiet_hours_start: string | null; quiet_hours_end: string | null }): boolean {
  if (!pref.quiet_hours_start || !pref.quiet_hours_end) return false;
  const { h, m } = austinHM(); const now = h * 60 + m;
  const [sh, sm] = pref.quiet_hours_start.split(":").map(Number);
  const [eh, em] = pref.quiet_hours_end.split(":").map(Number);
  const s = sh * 60 + sm, e = eh * 60 + em;
  return s <= e ? (now >= s && now < e) : (now >= s || now < e);
}

// ── MATUTINO ──
async function buildMorning(): Promise<{ rich: string; headline: string }> {
  const fecha = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Chicago" });
  let occPct = "-", occLine = "🏠 Ocupación: sin dato";
  try {
    const { data } = await sb.from("v_ocupacion").select("ocupacion_pct, ocupadas, unidades_rentables").maybeSingle();
    if (data) { occPct = String(Math.round(+data.ocupacion_pct)); occLine = `🏠 Ocupación Rentas: ${occPct}% (${data.ocupadas}/${data.unidades_rentables})`; }
  } catch (_e) {}
  let pend = 0;
  try { const { count } = await sb.from("agent_proposals").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("estado", "propuesta"); pend = count || 0; } catch (_e) {}
  let critN = 0, critImpact = 0; let top: { titulo: string; impacto_usd: number }[] = [];
  try {
    const { data } = await sb.from("ct_findings").select("titulo, impacto_usd").eq("active", true).is("resolved_at", null).eq("severidad", "critica").order("impacto_usd", { ascending: false, nullsFirst: false });
    critN = (data || []).length; critImpact = (data || []).reduce((s, f) => s + (+f.impacto_usd || 0), 0); top = (data || []).slice(0, 3);
  } catch (_e) {}
  const informe = async (like: string) => {
    try {
      const { data: ag } = await sb.from("agent_registry").select("id").ilike("nombre", like).is("deleted_at", null).limit(1);
      if (!ag || !ag[0]) return null;
      const { data } = await sb.from("agent_proposals").select("evidencia").eq("agent_id", ag[0].id).eq("tipo_accion", "informe").is("deleted_at", null).order("created_at", { ascending: false }).limit(1);
      if (!data || !data[0]) return null;
      const e = data[0].evidencia; return typeof e === "string" ? e : (e && (e.detalle || e.titulo)) || null;
    } catch (_e) { return null; }
  };
  const plan = await informe("Ops · Líder%"); const calidad = await informe("Ops · Analista de Calidad%");
  const headline = `Ocupación ${occPct}% · ${pend} propuestas pendientes · ${critN} alertas críticas`;
  let rich = `☀️ *Matutino del Cerebro* · ${fecha}\n\n${occLine}\n💵 Propuestas esperando tu OK: *${pend}*\n🔴 Alertas críticas abiertas: *${critN}* · ${money(critImpact)}`;
  if (top.length) rich += "\n" + top.map(t => `   • ${t.titulo} (${money(+t.impacto_usd)})`).join("\n");
  if (plan) rich += `\n\n📋 Plan del día: ${String(plan).slice(0, 300)}`;
  if (calidad) rich += `\n📊 Calidad: ${String(calidad).slice(0, 200)}`;
  rich += `\n\n➡️ Command Center: ${APP_URL}/jarvis`;
  return { rich, headline };
}

// ── ALERTAS (solo nuevas desde la última corrida; backlog = 1 digest) ──
async function buildAlerts(): Promise<{ rich: string; headline: string; count: number; backlog: boolean } | null> {
  let since: string | null = null;
  try {
    const { data } = await sb.from("notification_log").select("sent_at").eq("source", "cerebro_alert").eq("delivered", true).order("sent_at", { ascending: false }).limit(1);
    since = (data && data[0] && data[0].sent_at) || null;
  } catch (_e) {}
  const backlog = !since;
  const { data: critAll } = await sb.from("ct_findings").select("titulo, impacto_usd, first_seen").eq("active", true).is("resolved_at", null).eq("severidad", "critica").order("impacto_usd", { ascending: false, nullsFirst: false });
  const crit = (critAll || []).filter(f => backlog || (f.first_seen && f.first_seen > since!));
  const { data: intAll } = await sb.from("agent_proposals").select("tipo_accion, created_at").is("deleted_at", null).eq("estado", "propuesta").in("tipo_accion", ["conciliacion", "correccion_dato"]);
  const integ = (intAll || []).filter(p => backlog || (p.created_at && p.created_at > since!));
  const n = crit.length + integ.length;
  if (n === 0) return null;
  const impact = crit.reduce((s, f) => s + (+f.impacto_usd || 0), 0);
  const top = crit.slice(0, 5);
  const pre = backlog ? "🔴 *Alertas críticas abiertas*" : "🔴 *Nuevas alertas críticas*";
  const headline = `${crit.length} críticas${integ.length ? ` + ${integ.length} de integridad` : ""} · ${money(impact)}`;
  let rich = `${pre} — ${crit.length}${backlog ? " (backlog)" : ""} · ${money(impact)}`;
  if (top.length) rich += "\n" + top.map(t => `   • ${t.titulo} (${money(+t.impacto_usd)})`).join("\n");
  if (integ.length) rich += `\n🧩 ${integ.length} propuesta(s) de integridad esperan tu OK`;
  rich += `\n\n➡️ Command Center: ${APP_URL}/jarvis`;
  return { rich, headline, count: n, backlog };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const bearer = (req.headers.get("authorization") || "").replace(/^bearer /i, "").trim();
  if (bearer !== SERVICE_KEY) {
    const auth = await requireAuth(req, { requireAdmin: true });
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);
  }

  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const mode = String(url.searchParams.get("mode") || (body as { mode?: string }).mode || "test");
  const force = url.searchParams.get("force") === "1" || (body as { force?: boolean }).force === true;
  const numberOverride = ((body as { number?: string }).number || "").trim() || null;

  try {
    // ── WHOAMI: número del negocio (a dónde mandar "hola") ──
    if (mode === "whoami") {
      if (!PHONE_ID || !WA_TOKEN) return json({ ok: false, error: "faltan secrets META_WHATSAPP_PHONE_ID/META_WHATSAPP_TOKEN" }, 400);
      const r = await fetch(`${GRAPH}/${PHONE_ID}?fields=display_phone_number,verified_name,quality_rating`, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
      const d = await r.json().catch(() => ({}));
      return json({ ok: r.ok, business_number: d.display_phone_number || null, verified_name: d.verified_name || null, raw: d });
    }

    // ── CREATE-TEMPLATES: envía a aprobación las 2 plantillas (idempotente por nombre) ──
    if (mode === "create-templates") {
      if (!WABA_ID || !WA_TOKEN) return json({ ok: false, error: "faltan WA_BUSINESS_ID/META_WHATSAPP_TOKEN" }, 400);
      const defs = [
        { name: "cerebro_matutino", category: "UTILITY", body: "☀️ Matutino del Cerebro — {{1}}. Abrí el Command Center para el detalle: {{2}}", ex: ["Ocupación 85% · 36 pendientes · 46 críticas", `${APP_URL}/jarvis`] },
        { name: "cerebro_alertas", category: "UTILITY", body: "🔴 {{1}}: {{2}}. Revisá el Command Center: {{3}}", ex: ["Nuevas alertas críticas", "3 críticas · $12,000", `${APP_URL}/jarvis`] },
      ];
      const results = [];
      for (const d of defs) {
        const r = await fetch(`${GRAPH}/${WABA_ID}/message_templates`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_TOKEN}` },
          body: JSON.stringify({
            name: d.name, language: TMPL_LANG, category: d.category,
            components: [{ type: "BODY", text: d.body, example: { body_text: [d.ex] } }],
          }),
        });
        const out = await r.json().catch(() => ({}));
        results.push({ name: d.name, ok: r.ok, status: out.status || null, id: out.id || null, error: out.error?.error_user_msg || out.error?.message || null });
      }
      return json({ ok: results.every(r => r.ok), results, note: "Las plantillas quedan en revisión de Meta (PENDING). Cuando pasen a APPROVED, seteá WA_MORNING_TEMPLATE=cerebro_matutino y WA_ALERTS_TEMPLATE=cerebro_alertas para que los crons entreguen fuera de la ventana de 24h." });
    }

    // ── REGISTER ──
    if (mode === "register") {
      if (!numberOverride) return json({ ok: false, error: "Falta 'number' (E.164, ej. +15121234567)" }, 400);
      if (!/^\+\d{8,15}$/.test(numberOverride)) return json({ ok: false, error: "Número inválido; usá E.164 (+ y dígitos)" }, 400);
      let targetUid = (body as { user_id?: string }).user_id;
      if (!targetUid && bearer !== SERVICE_KEY) { const a = await requireAuth(req); targetUid = a.user_id; }
      if (!targetUid) return json({ ok: false, error: "Falta user_id (por service key pasá {user_id, number})" }, 400);
      const { error } = await sb.from("user_notification_prefs").upsert({
        user_id: targetUid, whatsapp_enabled: true, whatsapp_number: numberOverride, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, mode, user_id: targetUid, whatsapp_number: numberOverride });
    }

    const recs = await recipients(numberOverride);
    if (!recs.length) return json({ ok: false, error: "Sin destinatarios: cargá tu número con mode=register o pasá {number}" }, 400);

    // ── TEST ──
    if (mode === "test") {
      const useTemplate = (body as { template?: string }).template || null; // ej. "hello_world" (pre-aprobada) para probar fuera de ventana
      const txt = `✅ *Notificaciones del Cerebro activas.*\nEste es un mensaje de prueba de tu Command Center.\n${APP_URL}/jarvis`;
      const results = [];
      for (const r of recs) {
        const res = useTemplate ? await sendTemplate(r.whatsapp_number!, useTemplate, [], useTemplate === "hello_world" ? "en_US" : TMPL_LANG) : await sendText(r.whatsapp_number!, txt);
        await logNotif({ channel: "whatsapp", severity: "info", source: "cerebro_test", title: "Test", body: useTemplate ? ("template:" + useTemplate) : txt, recipient: r.whatsapp_number, delivered: res.ok, error: res.error, metadata: { id: res.id, status: res.status, code: res.code } });
        results.push({ to: r.whatsapp_number, ...res, raw: undefined });
      }
      return json({ ok: results.some(r => r.ok), mode, results });
    }

    // ── MORNING ──
    if (mode === "morning") {
      const { h, m } = austinHM();
      const inWindow = h === 7 && m >= 40 && m <= 50;
      if (!force && !inWindow) return json({ ok: true, mode, skipped: `hora local Austin ${h}:${String(m).padStart(2, "0")} (envía 07:45)` });
      const { rich, headline } = await buildMorning();
      const tmpl = Deno.env.get("WA_MORNING_TEMPLATE") || null;
      const results = [];
      for (const r of recs) {
        const res = await deliver(r.whatsapp_number!, rich, tmpl, [headline, APP_URL + "/jarvis"]);
        await logNotif({ channel: "whatsapp", severity: "info", source: "cerebro_morning", title: "Matutino del Cerebro", body: rich, recipient: r.whatsapp_number, delivered: res.ok, error: res.error, metadata: { id: res.id, status: res.status, code: res.code } });
        results.push({ to: r.whatsapp_number, ...res, raw: undefined });
      }
      return json({ ok: results.some(r => r.ok), mode, headline, results });
    }

    // ── ALERTS ──
    if (mode === "alerts") {
      const built = await buildAlerts();
      if (!built) return json({ ok: true, mode, sent: false, reason: "sin alertas nuevas" });
      const tmpl = Deno.env.get("WA_ALERTS_TEMPLATE") || null;
      const results = [];
      for (const r of recs) {
        if (inQuietHours(r) && !force) { results.push({ to: r.whatsapp_number, ok: false, skipped: "quiet_hours" }); continue; }
        if (!(r.notify_severities || ["critical"]).includes("critical")) { results.push({ to: r.whatsapp_number, ok: false, skipped: "no_critical_pref" }); continue; }
        const res = await deliver(r.whatsapp_number!, built.rich, tmpl, [(built.backlog ? "Alertas críticas abiertas" : "Nuevas alertas críticas"), built.headline, APP_URL + "/jarvis"]);
        await logNotif({ channel: "whatsapp", severity: "critical", source: "cerebro_alert", title: built.headline, body: built.rich, related_id: new Date().toISOString(), recipient: r.whatsapp_number, delivered: res.ok, error: res.error, metadata: { id: res.id, status: res.status, code: res.code, backlog: built.backlog, count: built.count } });
        results.push({ to: r.whatsapp_number, ...res, raw: undefined });
      }
      return json({ ok: results.some(r => r.ok), mode, backlog: built.backlog, count: built.count, results });
    }

    return json({ ok: false, error: "modo inválido: " + mode + " (whoami|create-templates|register|test|morning|alerts)" }, 400);
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
