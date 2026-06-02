// ============================================================
// S8-D · Edge Function: pm-weekly-review
// Cada lunes 7am: corre Claude sobre los KPIs cross-empresa de la semana pasada,
// genera un Weekly Business Review, lo guarda en pm_executive_reports
// y manda el resumen al grupo central.
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

const SYSTEM_PROMPT = `Sos el director de operaciones IA de Rental Profitss (Austin TX).

Te paso el snapshot de la semana pasada cross-empresa (Remodelación + Fix&Flip + Rentas + Property Mgmt + ClickUp ops).

REGLAS:
- Respondé en JSON: { "executive_summary": "...", "kpis": {...}, "alerts": [...], "recommendations": [...], "this_week_focus": "..." }
- executive_summary: máx 3 párrafos rioplatense, directo, sin jerga corporate
- kpis: 5-8 números clave de la semana
- alerts: max 5, priorizadas por impacto operativo
- recommendations: max 5 acciones concretas para esta semana, c/u con responsable sugerido
- this_week_focus: 1 frase con el foco macro de la semana entrante`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const supaUrl = Deno.env.get('SUPABASE_URL') || '';
  const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY no configurado' }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  const sb = createClient(supaUrl, supaKey);

  // Cargar contexto: scorecard + alertas + remodel snapshots últimos 7d + clickup ultimo snapshot + dailies semana
  const [score, alerts, remodSnaps, cuSnap, weekDailies, requiredActions] = await Promise.all([
    sb.from('pm_scorecard').select('*').single(),
    sb.from('remodel_alerts').select('*').is('resolved_at', null).limit(20),
    sb.from('remodel_snapshots').select('*').gte('snapshot_date', new Date(Date.now() - 7*86400000).toISOString().split('T')[0]).order('snapshot_date', { ascending: false }).limit(50),
    sb.from('clickup_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(1).single(),
    sb.from('pm_daily_assignments').select('assigned_date, tasks_total, tasks_done, tasks_carried_over, recipient_id').gte('assigned_date', new Date(Date.now() - 7*86400000).toISOString().split('T')[0]),
    sb.from('remodel_required_actions').select('*').eq('status', 'pending').limit(30)
  ]);

  const context = {
    scorecard: score.data,
    remodel_alerts_critical: (alerts.data || []).filter(a => a.severity === 'critical'),
    remodel_snapshots_recent: remodSnaps.data,
    clickup_last_snapshot: cuSnap.data,
    week_dailies_summary: aggregateWeekDailies(weekDailies.data || []),
    required_actions_pending: requiredActions.data
  };

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `<context>\n${JSON.stringify(context, null, 2)}\n</context>\n\nGeneré el Weekly Business Review. Solo JSON.` }]
    })
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ ok: false, error: 'Anthropic: ' + await resp.text() }), {
      status: resp.status, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  const claude = await resp.json();
  const text = (claude.content || []).map((c: { type: string; text?: string }) => c.type === 'text' ? c.text : '').join('');
  let review: Record<string, unknown> = {};
  try {
    const match = text.match(/\{[\s\S]*\}/);
    review = match ? JSON.parse(match[0]) : {};
  } catch { review = { executive_summary: text }; }

  // Calcular semana
  const monday = new Date();
  monday.setDate(monday.getDate() - 7 - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
  const periodStart = monday.toISOString().split('T')[0];
  const periodEnd = sunday.toISOString().split('T')[0];

  // Guardar reporte
  await sb.from('pm_executive_reports').upsert({
    report_type: 'weekly',
    period_start: periodStart,
    period_end: periodEnd,
    summary_md: String(review.executive_summary || ''),
    kpis: review.kpis || {},
    alerts: review.alerts || [],
    recommendations: review.recommendations || [],
    generated_by: 'ai',
    cost_tokens_used: (claude.usage?.input_tokens || 0) + (claude.usage?.output_tokens || 0)
  }, { onConflict: 'report_type,period_start' });

  // Mandar resumen al grupo
  const { data: cfg } = await sb.from('pm_whatsapp_config').select('group_chat_id').single();
  if (cfg?.group_chat_id) {
    const wbr = `📊 *Weekly Business Review*\n${periodStart} → ${periodEnd}\n\n${review.executive_summary}\n\n🎯 Foco de esta semana: ${review.this_week_focus || '—'}\n\nVer reporte completo en el Dashboard PM → Reportes Ejecutivos.`;
    await fetch(`${supaUrl}/functions/v1/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supaKey}` },
      body: JSON.stringify({ to: cfg.group_chat_id, type: 'text', text: wbr })
    });
  }

  return new Response(JSON.stringify({ ok: true, period: `${periodStart} → ${periodEnd}` }), {
    headers: { ...CORS, 'content-type': 'application/json' }
  });
});

function aggregateWeekDailies(rows: Array<{ assigned_date: string; tasks_total: number; tasks_done: number; tasks_carried_over: number }>) {
  const totals = rows.reduce((a, r) => {
    a.total += r.tasks_total;
    a.done += r.tasks_done;
    a.carried += r.tasks_carried_over;
    return a;
  }, { total: 0, done: 0, carried: 0 });
  return {
    week_total_tasks: totals.total,
    week_done: totals.done,
    week_carried_over: totals.carried,
    completion_pct: totals.total > 0 ? Math.round(totals.done / totals.total * 100) : 0
  };
}
