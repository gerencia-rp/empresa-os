// Sync ClickUp space "Empresa Remodelación" → Supabase
// Pull all tasks, compute KPIs (bus factor, sobrecarga, vencidas), genera alertas.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CLICKUP_TOKEN = Deno.env.get("CLICKUP_TOKEN")!;
const TEAM_ID = Deno.env.get("CLICKUP_TEAM_ID") || "9011352877";
const SPACE_ID = Deno.env.get("CLICKUP_SPACE_REMODEL") || "90113866434";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Thresholds
const OVERLOAD_TASK_THRESHOLD = 25;   // > 25 tasks abiertas = sobrecargado
const STALE_DAYS = 7;                  // sin movimiento 7+ días = estancada
const CASA_INACTIVA_DAYS = 5;          // casa sin tarea actualizada 5+ días

function listFaseFromName(listName: string): string | null {
  const n = (listName || "").toLowerCase();
  if (n.includes("preconstruccion") || n.includes("preconstrucción")) return "preconstruccion";
  if (n.includes("construccion") || n.includes("construcción")) return "construccion";
  if (n.includes("pre-entrega") || n.includes("preentrega")) return "pre-entrega";
  if (n.includes("entrega") && !n.includes("pre") && !n.includes("post")) return "entrega";
  if (n.includes("post")) return "post-entrega";
  return null;
}

async function clickupGet(path: string, query: Record<string, string> = {}) {
  const url = new URL(`https://api.clickup.com/api/v2${path}`);
  Object.entries(query).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: CLICKUP_TOKEN } });
  if (!res.ok) throw new Error(`ClickUp ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

// Pull all tasks from space using workspace tasks endpoint
async function fetchAllTasks(): Promise<any[]> {
  const tasks: any[] = [];
  let page = 0;
  while (true) {
    const data = await clickupGet(`/team/${TEAM_ID}/task`, {
      "space_ids[]": SPACE_ID,
      include_closed: "true",
      subtasks: "true",
      page: String(page),
    });
    const batch = data.tasks || [];
    if (!batch.length) break;
    tasks.push(...batch);
    if (batch.length < 100) break; // last page (ClickUp returns up to 100)
    page++;
    if (page > 50) break; // safety
  }
  return tasks;
}

function projectTask(t: any) {
  const assignees = (t.assignees || []).map((a: any) => ({ id: a.id, username: a.username }));
  const primary = assignees[0]?.username || null;
  const listName = t.list?.name || null;
  return {
    id: t.id,
    name: t.name,
    status: t.status?.status || null,
    status_type: t.status?.type || null,
    priority: t.priority?.priority || null,
    assignees,
    primary_assignee: primary,
    due_date: t.due_date ? new Date(+t.due_date).toISOString() : null,
    date_created: t.date_created ? new Date(+t.date_created).toISOString() : null,
    date_updated: t.date_updated ? new Date(+t.date_updated).toISOString() : null,
    date_closed: t.date_closed ? new Date(+t.date_closed).toISOString() : null,
    date_done: t.date_done ? new Date(+t.date_done).toISOString() : null,
    list_id: t.list?.id || null,
    list_name: listName,
    folder_id: t.folder?.id || null,
    folder_name: t.folder?.name || null,
    space_id: t.space?.id || null,
    tags: (t.tags || []).map((x: any) => x.name),
    custom_fields: t.custom_fields || null,
    url: t.url || null,
    is_recurring: (t.list?.name || "").toLowerCase().includes("recurrente") || false,
    time_estimate: t.time_estimate || null,
    time_spent: t.time_spent || null,
    fase: listFaseFromName(listName || ""),
    raw: t,
    last_synced_at: new Date().toISOString(),
  };
}

function computeKPIs(tasks: any[]) {
  const today = new Date();
  const nowMs = today.getTime();
  const sevenDaysAgo = nowMs - 7 * 86400000;

  const open = tasks.filter(t => t.status_type !== "closed" && t.status !== "completado");
  const closed = tasks.filter(t => t.status_type === "closed" || t.status === "completado");
  const closedWeek = closed.filter(t => t.date_closed && +new Date(t.date_closed) >= sevenDaysAgo);
  const overdue = open.filter(t => t.due_date && +new Date(t.due_date) < nowMs);
  const noAssignee = open.filter(t => !t.primary_assignee);

  // Por persona
  const byAssignee: Record<string, any> = {};
  open.forEach(t => {
    const name = t.primary_assignee || "(sin asignar)";
    if (!byAssignee[name]) byAssignee[name] = { open: 0, closed_week: 0, overdue: 0, ages: [] };
    byAssignee[name].open++;
    if (t.due_date && +new Date(t.due_date) < nowMs) byAssignee[name].overdue++;
    if (t.date_created) byAssignee[name].ages.push(Math.floor((nowMs - +new Date(t.date_created)) / 86400000));
  });
  closedWeek.forEach(t => {
    const name = t.primary_assignee || "(sin asignar)";
    if (!byAssignee[name]) byAssignee[name] = { open: 0, closed_week: 0, overdue: 0, ages: [] };
    byAssignee[name].closed_week++;
  });
  Object.values(byAssignee).forEach((v: any) => {
    if (v.ages.length) {
      v.ages.sort((a: number, b: number) => a - b);
      v.p50_age_days = v.ages[Math.floor(v.ages.length / 2)];
    }
    delete v.ages;
  });

  // Por casa (folder)
  const byCasa: Record<string, any> = {};
  tasks.forEach(t => {
    if (!t.folder_id || !t.folder_name) return;
    const k = t.folder_id;
    if (!byCasa[k]) byCasa[k] = { name: t.folder_name, open: 0, closed: 0, last_activity: null };
    if (t.status_type === "closed" || t.status === "completado") byCasa[k].closed++;
    else byCasa[k].open++;
    const upd = t.date_updated ? +new Date(t.date_updated) : 0;
    if (upd > (byCasa[k].last_activity || 0)) byCasa[k].last_activity = upd;
  });
  Object.values(byCasa).forEach((v: any) => {
    v.pct = (v.open + v.closed) > 0 ? Math.round(v.closed / (v.open + v.closed) * 100) : 0;
    v.last_activity_iso = v.last_activity ? new Date(v.last_activity).toISOString() : null;
    delete v.last_activity;
  });

  // Por status
  const byStatus: Record<string, number> = {};
  tasks.forEach(t => {
    const s = t.status || "sin_status";
    byStatus[s] = (byStatus[s] || 0) + 1;
  });

  // Por fase
  const byFase: Record<string, any> = {};
  tasks.forEach(t => {
    if (!t.fase) return;
    if (!byFase[t.fase]) byFase[t.fase] = { open: 0, closed: 0 };
    if (t.status_type === "closed" || t.status === "completado") byFase[t.fase].closed++;
    else byFase[t.fase].open++;
  });

  // Recurrentes: detecta tasks con mismo nombre en list "recurrente"
  const recurrentes: Record<string, any> = {};
  tasks.filter(t => t.is_recurring).forEach(t => {
    const k = t.name;
    if (!recurrentes[k]) recurrentes[k] = { total: 0, completed: 0, last_due: null };
    recurrentes[k].total++;
    if (t.status_type === "closed" || t.status === "completado") recurrentes[k].completed++;
    const due = t.due_date ? +new Date(t.due_date) : 0;
    if (due > (recurrentes[k].last_due || 0)) recurrentes[k].last_due = due;
  });
  Object.values(recurrentes).forEach((v: any) => {
    v.completion_rate = v.total > 0 ? Math.round(v.completed / v.total * 100) : 0;
    v.last_due_iso = v.last_due ? new Date(v.last_due).toISOString() : null;
    delete v.last_due;
  });

  // Bus factor: % open tasks que dependen de 1 persona
  const sortedByLoad = Object.entries(byAssignee)
    .filter(([n]) => n !== "(sin asignar)")
    .sort((a, b) => (b[1] as any).open - (a[1] as any).open);
  const totalOpen = open.length;
  const topPerson = sortedByLoad[0];
  const bus_factor_pct = topPerson && totalOpen > 0 ? Math.round((topPerson[1] as any).open / totalOpen * 100) : 0;

  return {
    total_tasks: tasks.length,
    total_open: open.length,
    total_closed: closed.length,
    total_closed_last_7d: closedWeek.length,
    total_overdue: overdue.length,
    total_no_assignee: noAssignee.length,
    by_assignee: byAssignee,
    by_casa: byCasa,
    by_status: byStatus,
    by_fase: byFase,
    recurrentes_status: recurrentes,
    bus_factor_pct,
    top_overloaded_person: topPerson?.[0] || null,
    top_overloaded_count: topPerson ? (topPerson[1] as any).open : 0,
  };
}

function generateAlerts(tasks: any[], kpis: any): any[] {
  const alerts: any[] = [];
  const today = Date.now();

  // 1) Sobrecarga
  Object.entries(kpis.by_assignee).forEach(([name, v]: any) => {
    if (name === "(sin asignar)") return;
    if (v.open >= OVERLOAD_TASK_THRESHOLD) {
      alerts.push({
        alert_type: "sobrecarga", severity: v.open >= OVERLOAD_TASK_THRESHOLD * 2 ? "critical" : "warning",
        title: `🚨 ${name} sobrecargado — ${v.open} tareas abiertas`,
        detail: `${v.overdue} vencidas. Cerró ${v.closed_week} esta semana. Edad mediana: ${v.p50_age_days || 0}d.`,
        related_assignee: name, metric_value: v.open, threshold: OVERLOAD_TASK_THRESHOLD,
      });
    }
  });

  // 2) Bus factor crítico
  if (kpis.bus_factor_pct >= 60) {
    alerts.push({
      alert_type: "bus_factor", severity: "critical",
      title: `🚨 Bus factor crítico — ${kpis.bus_factor_pct}% depende de ${kpis.top_overloaded_person}`,
      detail: `Si esa persona se enferma o se va, ${kpis.top_overloaded_count} tareas se quedan sin dueño. Reasignar urgente.`,
      related_assignee: kpis.top_overloaded_person, metric_value: kpis.bus_factor_pct, threshold: 60,
    });
  }

  // 3) Tareas vencidas críticas (priority urgent + due_date past)
  const criticalOverdue = tasks.filter(t =>
    t.status_type !== "closed" && t.status !== "completado" &&
    t.due_date && +new Date(t.due_date) < today &&
    (t.priority === "urgent" || t.priority === "high")
  );
  criticalOverdue.slice(0, 5).forEach(t => {
    const daysOver = Math.floor((today - +new Date(t.due_date)) / 86400000);
    alerts.push({
      alert_type: "vencida", severity: t.priority === "urgent" ? "critical" : "warning",
      title: `⏰ Vencida ${daysOver}d — ${t.name}`,
      detail: `Asignado: ${t.primary_assignee || "—"} · Casa: ${t.folder_name || "—"} · Prioridad: ${t.priority}`,
      related_task_id: t.id, related_assignee: t.primary_assignee,
      related_folder_id: t.folder_id, metric_value: daysOver, threshold: 0,
    });
  });

  // 4) Tareas sin assignee
  if (kpis.total_no_assignee > 0) {
    alerts.push({
      alert_type: "sin_assignee", severity: "warning",
      title: `🟡 ${kpis.total_no_assignee} tareas sin asignar`,
      detail: `Tareas abiertas sin responsable. Riesgo de quedar olvidadas.`,
      metric_value: kpis.total_no_assignee, threshold: 0,
    });
  }

  // 5) Casas inactivas
  Object.entries(kpis.by_casa).forEach(([folderId, v]: any) => {
    if (!v.last_activity_iso || v.open === 0) return;
    const daysInactive = Math.floor((today - +new Date(v.last_activity_iso)) / 86400000);
    if (daysInactive >= CASA_INACTIVA_DAYS) {
      alerts.push({
        alert_type: "casa_inactiva", severity: daysInactive >= 14 ? "warning" : "info",
        title: `🏠 ${v.name} inactiva ${daysInactive}d`,
        detail: `${v.open} tareas abiertas, sin movimiento desde ${v.last_activity_iso.split("T")[0]}. Avance: ${v.pct}%.`,
        related_folder_id: folderId, metric_value: daysInactive, threshold: CASA_INACTIVA_DAYS,
      });
    }
  });

  // 6) Recurrentes con baja completitud
  Object.entries(kpis.recurrentes_status).forEach(([name, v]: any) => {
    if (v.total >= 3 && v.completion_rate < 70) {
      alerts.push({
        alert_type: "recurrente_saltada", severity: "warning",
        title: `🔁 Recurrente con baja tasa — ${name}`,
        detail: `Solo ${v.completion_rate}% completadas (${v.completed}/${v.total}). Revisar si el proceso está roto.`,
        metric_value: v.completion_rate, threshold: 70,
      });
    }
  });

  // 7) Estancadas: open tasks sin updated en 7+ días
  const stale = tasks.filter(t => {
    if (t.status_type === "closed" || t.status === "completado") return false;
    if (!t.date_updated) return false;
    const days = (today - +new Date(t.date_updated)) / 86400000;
    return days >= STALE_DAYS;
  });
  if (stale.length > 0) {
    alerts.push({
      alert_type: "estancada", severity: stale.length >= 20 ? "warning" : "info",
      title: `🕸️ ${stale.length} tareas estancadas (${STALE_DAYS}+d sin movimiento)`,
      detail: `Top 3: ${stale.slice(0, 3).map(t => t.name).join(" · ")}`,
      metric_value: stale.length, threshold: STALE_DAYS,
    });
  }

  return alerts;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startMs = Date.now();
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split("T")[0];

  let body: any = {};
  try { body = await req.json(); } catch {}

  try {
    const tasks = await fetchAllTasks();
    const projected = tasks.map(projectTask);

    // Upsert tasks (batch)
    const BATCH = 100;
    for (let i = 0; i < projected.length; i += BATCH) {
      const slice = projected.slice(i, i + BATCH);
      const { error } = await sb.from("clickup_tasks_mirror").upsert(slice, { onConflict: "id" });
      if (error) console.warn("upsert batch error:", error.message);
    }

    // KPIs + snapshot
    const kpis = computeKPIs(projected);
    await sb.from("clickup_snapshots").upsert({
      snapshot_date: today,
      ...kpis,
    }, { onConflict: "snapshot_date" });

    // Limpiar y regenerar alertas
    await sb.from("clickup_alerts").delete().is("resolved_at", null);
    const alerts = generateAlerts(projected, kpis);
    if (alerts.length) {
      await sb.from("clickup_alerts").insert(alerts);
    }

    const duration_ms = Date.now() - startMs;
    await sb.from("clickup_sync_log").insert({
      tasks_synced: projected.length,
      alerts_generated: alerts.length,
      duration_ms,
      triggered_by: body.user_id || null,
    });

    return new Response(JSON.stringify({
      ok: true,
      tasks_synced: projected.length,
      alerts: alerts.length,
      duration_ms,
      kpis: {
        total_open: kpis.total_open,
        total_overdue: kpis.total_overdue,
        bus_factor_pct: kpis.bus_factor_pct,
        top_overloaded: kpis.top_overloaded_person,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const duration_ms = Date.now() - startMs;
    await sb.from("clickup_sync_log").insert({
      error: String(e), duration_ms,
      triggered_by: body.user_id || null,
    });
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
