// ============================================================
// S8-D · Edge Function: pm-daily-close
// Cada Mon-Sat a las 6pm:
//   1. Para cada daily assignment del día que NO esté closed
//   2. Manda mensaje "Cierre del día. Te faltan X. ¿Cómo te fue?"
//   3. Tareas no marcadas done se mueven a mañana (due_date+1 en ClickUp)
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

  const today = new Date().toISOString().split('T')[0];

  // Dailies de hoy que no están cerrados
  const { data: dailies } = await sb.from('pm_daily_assignments')
    .select('*, pm_whatsapp_recipients(*)')
    .eq('assigned_date', today)
    .neq('status', 'closed');

  if (!dailies?.length) {
    return new Response(JSON.stringify({ ok: true, closed: 0, note: 'no pending dailies' }), {
      headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  let pinged = 0;

  for (const d of dailies) {
    const r = d.pm_whatsapp_recipients as Record<string, unknown>;
    if (!r || !r.receives_daily_close) continue;

    const tasks = (d.tasks as Array<{ id: string; name: string; done: boolean }>) || [];
    const pending = tasks.filter(t => !t.done);
    const done = tasks.filter(t => t.done);

    // Carry-over de las pendientes (ClickUp due_date +1)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString();

    for (const t of pending) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/clickup-execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({
            action_type: 'comment',
            target_task_id: t.id,
            payload: { comment: `📅 Movida automáticamente a mañana (no completada hoy). Carry-over auto del PM bot.`, notify_all: false }
          })
        });
      } catch (e) { console.warn('carry-over fail', e); }
    }

    // Mensaje de cierre
    const name = String(r.full_name || '').split(' ')[0] || 'crack';
    const ratio = `${done.length}/${tasks.length}`;
    const pct = tasks.length > 0 ? Math.round(done.length / tasks.length * 100) : 0;
    const tone = pct >= 80 ? '🏆 Buen día!' : pct >= 50 ? '👍 Día normal.' : '💪 Mañana retomamos.';
    const carriedLines = pending.slice(0, 5).map((t, i) => `${i+1}. ${t.name}`).join('\n');

    const body = `${tone}\n\n📊 Cierre del día ${ratio} (${pct}%)\n` +
      (pending.length > 0
        ? `\n📅 ${pending.length} pendientes se mueven a mañana:\n${carriedLines}${pending.length > 5 ? '\n…' : ''}\n\nSi alguna ya está hecha respondé con "1 ok", "2 ok", etc. Si querés moverla más adelante avisame.`
        : `\n🎯 Cerraste todo. Genio.`);

    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({
        to: r.phone_number,
        type: 'text',
        text: body,
        recipient_id: r.id
      })
    });

    // Update daily
    await sb.from('pm_daily_assignments').update({
      tasks_carried_over: pending.length,
      status: pending.length === 0 ? 'closed' : 'in_progress',
      closed_at: pending.length === 0 ? new Date().toISOString() : null
    }).eq('id', d.id);

    pinged++;
  }

  return new Response(JSON.stringify({ ok: true, pinged, total: dailies.length }), {
    headers: { ...CORS, 'content-type': 'application/json' }
  });
});
