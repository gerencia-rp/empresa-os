// ============================================================
// S8-D · Edge Function: pm-group-report
// Cada noche a las 8pm: agrega los resultados del día y manda un único mensaje
// al chat grupal central (config group_chat_id).
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

  const { data: cfg } = await sb.from('pm_whatsapp_config').select('*').eq('id', 1).single();
  if (!cfg?.group_chat_id) {
    return new Response(JSON.stringify({ ok: false, error: 'group_chat_id no configurado' }), {
      status: 400, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  const today = new Date().toISOString().split('T')[0];

  // Cargar dailies del día con nombres
  const { data: dailies } = await sb.from('pm_daily_assignments')
    .select('*, pm_whatsapp_recipients(full_name)')
    .eq('assigned_date', today);

  if (!dailies?.length) {
    return new Response(JSON.stringify({ ok: true, note: 'no dailies today' }), {
      headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  // Stats
  const lines = dailies.map(d => {
    const r = d.pm_whatsapp_recipients as { full_name?: string };
    const name = (r?.full_name || '?').split(' ')[0];
    const tot = d.tasks_total;
    const dn = d.tasks_done;
    const pct = tot > 0 ? Math.round(dn / tot * 100) : 0;
    const icon = pct >= 80 ? '✅' : pct >= 50 ? '🟡' : '🔴';
    return `${icon} ${name}: ${dn}/${tot} (${pct}%)${d.tasks_carried_over > 0 ? ` · ${d.tasks_carried_over} a mañana` : ''}`;
  }).join('\n');

  const totals = dailies.reduce((acc, d) => {
    acc.total += d.tasks_total;
    acc.done += d.tasks_done;
    acc.carry += d.tasks_carried_over;
    return acc;
  }, { total: 0, done: 0, carry: 0 });
  const overallPct = totals.total > 0 ? Math.round(totals.done / totals.total * 100) : 0;

  const today_es = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const body = `📊 *Cierre del día* — ${today_es}\n\n${lines}\n\n📈 Total: ${totals.done}/${totals.total} (${overallPct}%) · ${totals.carry} a mañana\n\n${overallPct >= 80 ? '🏆 Buen día equipo!' : overallPct >= 50 ? '👍 Sostenemos el ritmo.' : '💪 Mañana recuperamos.'}`;

  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({
      to: cfg.group_chat_id,
      type: 'text',
      text: body
    })
  });

  return new Response(JSON.stringify({ ok: true, sent: true, overall_pct: overallPct }), {
    headers: { ...CORS, 'content-type': 'application/json' }
  });
});
