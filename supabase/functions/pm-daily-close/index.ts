// ============================================================
// S8-D · Edge Function: pm-daily-close
// Cada Mon-Sat a las 6pm:
//   1. Para cada daily assignment del día que NO esté closed
//   2. Manda mensaje "Cierre del día. Te faltan X. ¿Cómo te fue?"
//   3. Tareas no marcadas done se mueven a mañana (due_date+1 en ClickUp)
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAuth } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth.ok) return new Response(JSON.stringify({ ok: false, error: auth.error }), { status: auth.status || 401, headers: { ...CORS, 'content-type': 'application/json' } });

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

    let carried = 0;
    const carriedTaskNames: string[] = [];
    const carryErrors: string[] = [];
    for (const t of pending) {
      try {
        const carryResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/clickup-execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({
            action_type: 'reschedule',
            target_task_id: t.id,
            payload: { due_date: tomorrowIso, comment: `Movida automáticamente a mañana por el cierre diario: no se completó hoy.` }
          })
        });
        const carryResult = await carryResponse.json().catch(() => ({}));
        if (!carryResponse.ok || !carryResult.ok) throw new Error(carryResult.error || `HTTP ${carryResponse.status}`);
        carried++;
        carriedTaskNames.push(t.name);
      } catch (e) {
        carryErrors.push(`${t.id}: ${String((e as Error)?.message || e)}`);
        console.warn('carry-over fail', e);
      }
    }
    if (carryErrors.length) {
      await sb.from('notification_log').insert({
        channel: 'webhook', severity: 'warning', source: 'pm_daily_close',
        title: 'Carry-over ClickUp incompleto',
        body: `${carryErrors.length}/${pending.length} tareas no cambiaron de fecha: ${carryErrors.slice(0, 8).join(' | ')}`,
        related_id: String(d.id)
      });
    }

    // Mensaje de cierre
    const name = String(r.full_name || '').split(' ')[0] || 'crack';
    const ratio = `${done.length}/${tasks.length}`;
    const pct = tasks.length > 0 ? Math.round(done.length / tasks.length * 100) : 0;
    const tone = pct >= 80 ? '🏆 Buen día!' : pct >= 50 ? '👍 Día normal.' : '💪 Mañana retomamos.';
    const carriedLines = carriedTaskNames.slice(0, 5).map((name, i) => `${i+1}. ${name}`).join('\n');

    const body = `${tone}\n\n📊 Cierre del día ${ratio} (${pct}%)\n` +
      (pending.length > 0
        ? `\n📅 ${carried} de ${pending.length} pendientes se movieron realmente a mañana:${carriedLines ? `\n${carriedLines}${carriedTaskNames.length > 5 ? '\n…' : ''}` : ''}${carryErrors.length ? `\n⚠️ ${carryErrors.length} no se movieron y quedaron registradas para revisión.` : ''}\n\nSi alguna ya está hecha respondé con "1 ok", "2 ok", etc. Si querés moverla más adelante avisame.`
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
      tasks_carried_over: carried,
      status: pending.length === 0 ? 'closed' : 'in_progress',
      closed_at: pending.length === 0 ? new Date().toISOString() : null
    }).eq('id', d.id);

    pinged++;
  }

  return new Response(JSON.stringify({ ok: true, pinged, total: dailies.length }), {
    headers: { ...CORS, 'content-type': 'application/json' }
  });
});
