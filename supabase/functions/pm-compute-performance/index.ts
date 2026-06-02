// ============================================================
// S9-C · Edge Function: pm-compute-performance
// Cada lunes 6am Texas — calcula performance score por persona × semana × empresa.
//
// Métricas:
//   - completion_score = closed / assigned * 100
//   - quality_score    = (1 - reopened / completed) * 100 (proxy)
//   - velocity_score   = vs lead_time benchmark del equipo (puntea 0-100)
//   - capacity_score   = % daily WhatsApp cumplido
//   - composite_score  = weighted avg
//   - trend            = up/flat/down vs semana anterior
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const supaUrl = Deno.env.get('SUPABASE_URL') || '';
  const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const sb = createClient(supaUrl, supaKey);

  // Calcular la semana actual (Mon=start)
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().split('T')[0];

  // Semana anterior (para trend)
  const prevMonday = new Date(monday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const prevWeekStart = prevMonday.toISOString().split('T')[0];

  // Cargar recipients activos
  const { data: recipients } = await sb.from('pm_whatsapp_recipients')
    .select('*')
    .eq('active', true);

  if (!recipients?.length) {
    return new Response(JSON.stringify({ ok: true, computed: 0, note: 'no recipients' }), {
      headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  // Cargar empresas activas
  const { data: companies } = await sb.from('pm_companies').select('id, name, slug').eq('active', true);
  if (!companies?.length) {
    return new Response(JSON.stringify({ ok: false, error: 'no companies' }), {
      status: 400, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  // Pre-load tasks de la semana de TODAS las empresas
  const weekStartDate = new Date(weekStart).toISOString();
  const weekEndDate = new Date(monday); weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEndIso = weekEndDate.toISOString();

  const { data: weekTasks } = await sb.from('clickup_tasks_mirror')
    .select('id, primary_assignee, status, status_type, due_date, date_created, date_closed, company_id');

  if (!weekTasks) {
    return new Response(JSON.stringify({ ok: false, error: 'no tasks' }), {
      status: 400, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  // Pre-load dailies de la semana
  const { data: weekDailies } = await sb.from('pm_daily_assignments')
    .select('recipient_id, tasks_total, tasks_done, tasks_carried_over, assigned_date, status')
    .gte('assigned_date', weekStart)
    .lt('assigned_date', weekEndDate.toISOString().split('T')[0]);

  // Benchmark equipo: lead time promedio de tasks closed esta semana
  const closedThisWeek = weekTasks.filter((t: any) =>
    t.status_type === 'closed' &&
    t.date_closed && new Date(t.date_closed) >= new Date(weekStartDate) &&
    t.date_created
  );
  const teamLeadTimes = closedThisWeek
    .map((t: any) => (new Date(t.date_closed).getTime() - new Date(t.date_created).getTime()) / 86400000)
    .filter((d: number) => d > 0 && d < 365);
  const teamAvgLeadTime = teamLeadTimes.length > 0 ? teamLeadTimes.reduce((s, x) => s + x, 0) / teamLeadTimes.length : 7;

  let computed = 0;
  const rows: any[] = [];

  for (const r of recipients) {
    for (const c of companies) {
      const personTasks = weekTasks.filter((t: any) =>
        t.primary_assignee === r.clickup_username &&
        t.company_id === c.id
      );

      if (personTasks.length === 0) continue;

      // Tasks asignadas en la semana o que tienen due en la semana
      const assigned = personTasks.length;
      const completedTasks = personTasks.filter((t: any) =>
        t.status_type === 'closed' &&
        t.date_closed && new Date(t.date_closed) >= new Date(weekStartDate)
      );
      const completed = completedTasks.length;
      const ontime = completedTasks.filter((t: any) =>
        !t.due_date || new Date(t.date_closed) <= new Date(t.due_date)
      ).length;
      const overdue = personTasks.filter((t: any) =>
        t.status_type !== 'closed' && t.due_date && new Date(t.due_date) < new Date()
      ).length;

      // Lead time persona
      const personLeadTimes = completedTasks
        .map((t: any) => t.date_created && t.date_closed ? (new Date(t.date_closed).getTime() - new Date(t.date_created).getTime()) / 86400000 : null)
        .filter((d: number | null): d is number => d != null && d > 0 && d < 365);
      const leadTimeAvg = personLeadTimes.length > 0 ? personLeadTimes.reduce((s, x) => s + x, 0) / personLeadTimes.length : null;

      // Capacity: dailies de esta persona en la semana
      const personDailies = (weekDailies || []).filter((d: any) => d.recipient_id === r.id);
      const dailyTotal = personDailies.reduce((s: number, d: any) => s + d.tasks_total, 0);
      const dailyDone = personDailies.reduce((s: number, d: any) => s + d.tasks_done, 0);
      const capacityAdherence = dailyTotal > 0 ? (dailyDone / dailyTotal * 100) : null;

      // Scores
      const completionScore = assigned > 0 ? Math.round(completed / assigned * 100) : 0;
      const ontimeScore = completed > 0 ? Math.round(ontime / completed * 100) : 0;
      // Quality: penalizar overdue + reopened (proxy)
      const qualityScore = assigned > 0 ? Math.max(0, Math.round(100 - (overdue / assigned * 50))) : 50;
      // Velocity: comparar lead time persona vs equipo. Si persona < team, mejor.
      let velocityScore = 50;
      if (leadTimeAvg != null && teamAvgLeadTime > 0) {
        const ratio = teamAvgLeadTime / leadTimeAvg;
        velocityScore = Math.max(0, Math.min(100, Math.round(50 + (ratio - 1) * 50)));
      }
      const capacityScore = capacityAdherence != null ? Math.round(capacityAdherence) : 50;
      // Composite: weighted
      const composite = Math.round(
        completionScore * 0.30 +
        ontimeScore * 0.20 +
        qualityScore * 0.20 +
        velocityScore * 0.15 +
        capacityScore * 0.15
      );

      // Trend: comparar con semana anterior
      const { data: prev } = await sb.from('pm_performance_weekly')
        .select('composite_score')
        .eq('recipient_id', r.id)
        .eq('company_id', c.id)
        .eq('week_start', prevWeekStart)
        .maybeSingle();
      let trend = 'new';
      if (prev?.composite_score != null) {
        const delta = composite - prev.composite_score;
        trend = delta > 5 ? 'up' : delta < -5 ? 'down' : 'flat';
      }

      rows.push({
        recipient_id: r.id,
        company_id: c.id,
        week_start: weekStart,
        tasks_assigned: assigned,
        tasks_completed: completed,
        tasks_completed_ontime: ontime,
        tasks_overdue: overdue,
        tasks_reopened: 0, // mejorar con análisis de status_history en V2
        lead_time_avg_days: leadTimeAvg != null ? Math.round(leadTimeAvg * 10) / 10 : null,
        capacity_adherence_pct: capacityAdherence != null ? Math.round(capacityAdherence) : null,
        alerts_generated: 0,
        completion_score: completionScore,
        quality_score: qualityScore,
        velocity_score: velocityScore,
        capacity_score: capacityScore,
        composite_score: composite,
        composite_score_prev: prev?.composite_score || null,
        trend
      });
      computed++;
    }
  }

  // Upsert en batch
  if (rows.length > 0) {
    const { error } = await sb.from('pm_performance_weekly')
      .upsert(rows, { onConflict: 'recipient_id,company_id,week_start' });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    week_start: weekStart,
    computed,
    team_avg_lead_time_days: Math.round(teamAvgLeadTime * 10) / 10
  }), { headers: { ...CORS, 'content-type': 'application/json' } });
});
