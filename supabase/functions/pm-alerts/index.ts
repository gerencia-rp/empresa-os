// ════════════════════════════════════════════════════════════════
// 🔔 PM-ALERTS · Edge Function — generadores de alertas automáticas
// Implementa los 5 "crons" del spec en una sola función parametrizable:
//   ?check=contracts | payments | services | tasks | occupancy | all (default)
//
// Cada check detecta condiciones y hace upsert idempotente en pm_alerts
// usando dedup_key (no duplica la misma alerta viva entre corridas).
//
// Disparo: pg_cron (public.cron_invoke_function) o Vercel cron (/api/cron/*).
// Auth: Bearer == SUPABASE_SERVICE_ROLE_KEY (modo cron) o JWT de usuario válido.
// Test manual:  GET /functions/v1/pm-alerts?check=all   (Bearer service_role)
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a: string, b: string) => Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);

type AlertRow = {
  type: string; severity: "critical" | "warning" | "info"; category: string;
  property_id?: string | null; tenant_id?: string | null; message: string; dedup_key: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Auth: service role (cron) o JWT válido de usuario
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return json({ error: "Falta Authorization: Bearer <token>" }, 401);
  const isCron = !!SERVICE_KEY && bearer === SERVICE_KEY;
  if (!isCron) {
    // Validar que sea un JWT de usuario autenticado
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const u = createClient(SUPABASE_URL, anon, { global: { headers: { Authorization: `Bearer ${bearer}` } } });
    const { data, error } = await u.auth.getUser(bearer);
    if (error || !data?.user) return json({ error: "Token inválido" }, 401);
  }

  const url = new URL(req.url);
  let check = url.searchParams.get("check") || "";
  if (!check) { try { check = (await req.json())?.check || ""; } catch { /* sin body */ } }
  check = check || "all";

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const alerts: AlertRow[] = [];
  const ran: string[] = [];

  // ── Cargar datos base una vez ──
  const [propsR, unitsR, booksR, paysR, tasksR, credsR] = await Promise.all([
    sb.from("pm_properties").select("id,name,status"),
    sb.from("pm_units").select("id,property_id,status"),
    sb.from("pm_bookings").select("id,property_id,tenant_id,unit_id,status,start_date,end_date"),
    sb.from("pm_payments").select("id,tenant_id,property_id,type,paid_at").eq("type", "ingreso"),
    sb.from("pm_tasks").select("id,title,property_id,task_type,scheduled_date,status,assignee"),
    sb.from("pm_credentials").select("id,name,property_id,category,auto_pay,next_payment_date,payment_failed"),
  ]);
  const properties = propsR.data || [];
  const units = unitsR.data || [];
  const bookings = booksR.data || [];
  const payments = paysR.data || [];
  const tasks = tasksR.data || [];
  const creds = credsR.data || [];
  const activeProps = properties.filter((p) => p.status === "activa");
  const activeBookings = bookings.filter((b) => ["activo", "confirmado"].includes(b.status || ""));
  const nameOf = (id?: string | null) => properties.find((p) => p.id === id)?.name || "casa";

  // ── CRON 1 · check_contracts ──
  if (check === "contracts" || check === "all") {
    ran.push("contracts");
    const today = todayISO(), in30 = addDays(30);
    for (const b of activeBookings) {
      if (!b.end_date) continue;
      if (b.end_date >= today && b.end_date <= in30) {
        const d = daysBetween(b.end_date, today);
        alerts.push({ type: "contract_expiring", severity: "warning", category: "contract",
          property_id: b.property_id, tenant_id: b.tenant_id,
          message: `Contrato en ${nameOf(b.property_id)} vence en ${d} día(s) (${b.end_date}).`,
          dedup_key: `contract_expiring:${b.id}` });
      } else if (b.end_date < today) {
        alerts.push({ type: "contract_expired", severity: "critical", category: "contract",
          property_id: b.property_id, tenant_id: b.tenant_id,
          message: `Contrato en ${nameOf(b.property_id)} venció el ${b.end_date} sin renovar.`,
          dedup_key: `contract_expired:${b.id}` });
      }
    }
    // Unidades disponibles > 60 días (sin reserva activa, último fin > 60d atrás)
    for (const u of units) {
      if (!activeProps.find((p) => p.id === u.property_id)) continue;
      if (activeBookings.find((b) => b.unit_id === u.id)) continue;
      const ends = bookings.filter((b) => b.unit_id === u.id && b.end_date).map((b) => b.end_date).sort();
      const lastEnd = ends[ends.length - 1];
      const vacantDays = lastEnd ? daysBetween(todayISO(), lastEnd) : 999;
      if (vacantDays > 60) {
        alerts.push({ type: "unit_vacant_long", severity: "warning", category: "contract",
          property_id: u.property_id, message: `Unidad en ${nameOf(u.property_id)} disponible hace ${vacantDays > 900 ? "más de 60" : vacantDays} días.`,
          dedup_key: `unit_vacant_long:${u.id}` });
      }
    }
  }

  // ── CRON 2 · check_payments ──
  if (check === "payments" || check === "all") {
    ran.push("payments");
    const cutoff = addDays(-30);
    const recentPayers = new Set(payments.filter((p) => p.paid_at && p.paid_at >= cutoff && p.tenant_id).map((p) => p.tenant_id));
    for (const b of activeBookings) {
      if (!b.tenant_id) continue;
      if (b.start_date && b.start_date > cutoff) continue; // recién iniciadas no cuentan
      if (!recentPayers.has(b.tenant_id)) {
        alerts.push({ type: "payment_late", severity: "critical", category: "payment",
          property_id: b.property_id, tenant_id: b.tenant_id,
          message: `Sin pago registrado en 30+ días para inquilino en ${nameOf(b.property_id)}.`,
          dedup_key: `payment_late:${b.id}:${todayISO().slice(0, 7)}` });
      }
    }
  }

  // ── CRON 3 · check_services ──
  if (check === "services" || check === "all") {
    ran.push("services");
    const in7 = addDays(7), today = todayISO();
    for (const c of creds) {
      if (c.payment_failed) {
        alerts.push({ type: "service_payment_failed", severity: "critical", category: "service",
          property_id: c.property_id, message: `Pago del servicio "${c.name}" falló — revisar.`,
          dedup_key: `service_payment_failed:${c.id}` });
      }
      if (c.auto_pay && c.next_payment_date && c.next_payment_date >= today && c.next_payment_date <= in7) {
        alerts.push({ type: "service_auto_pay_soon", severity: "info", category: "service",
          property_id: c.property_id, message: `Pago automático de "${c.name}" el ${c.next_payment_date}.`,
          dedup_key: `service_auto_pay_soon:${c.id}:${c.next_payment_date}` });
      }
    }
  }

  // ── CRON 4 · check_tasks ──
  if (check === "tasks" || check === "all") {
    ran.push("tasks");
    const today = todayISO(), tomorrow = addDays(1);
    for (const t of tasks) {
      if (["completado", "cancelado"].includes(t.status || "")) continue;
      if (!t.scheduled_date) continue;
      if (t.scheduled_date === today || t.scheduled_date === tomorrow) {
        alerts.push({ type: "task_due", severity: "info", category: "task",
          property_id: t.property_id, message: `Tarea "${t.title}" programada para ${t.scheduled_date === today ? "hoy" : "mañana"}.`,
          dedup_key: `task_due:${t.id}:${t.scheduled_date}` });
      } else if (t.scheduled_date < today) {
        alerts.push({ type: "task_overdue", severity: "warning", category: "task",
          property_id: t.property_id, message: `Tarea "${t.title}" atrasada desde ${t.scheduled_date}.`,
          dedup_key: `task_overdue:${t.id}` });
      }
    }
  }

  // ── CRON 5 · check_occupancy ──
  if (check === "occupancy" || check === "all") {
    ran.push("occupancy");
    for (const p of activeProps) {
      const us = units.filter((u) => u.property_id === p.id);
      if (!us.length) continue;
      const occ = us.filter((u) => activeBookings.find((b) => b.unit_id === u.id)).length;
      const rate = occ / us.length;
      if (rate < 0.80) {
        alerts.push({ type: "occupancy_low", severity: "warning", category: "occupancy",
          property_id: p.id, message: `Ocupación de ${p.name} en ${Math.round(rate * 100)}% (objetivo 80%).`,
          dedup_key: `occupancy_low:${p.id}:${todayISO().slice(0, 7)}` });
      }
    }
  }

  // ── Upsert idempotente por dedup_key (solo entre alertas vivas) ──
  let created = 0, skipped = 0;
  for (const a of alerts) {
    const { data: existing } = await sb.from("pm_alerts").select("id")
      .eq("dedup_key", a.dedup_key).eq("resolved", false).limit(1);
    if (existing && existing.length) { skipped++; continue; }
    const { error } = await sb.from("pm_alerts").insert(a);
    if (!error) created++;
  }

  return json({ ok: true, check, ran, detected: alerts.length, created, skipped, at: new Date().toISOString() });
});
