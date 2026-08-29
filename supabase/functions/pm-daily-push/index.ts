// ============================================================
// S8-D · Edge Function: pm-daily-push
// Cada Mon-Sat a las 7am (cron desde Supabase):
//   1. Para cada recipient activo con receives_daily_push=true
//   2. Lee sus tasks de ClickUp con due_date=hoy (matchea por clickup_username)
//   3. Arma un mensaje formateado y envía via whatsapp-send
//   4. Crea row en pm_daily_assignments
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
  const todayEnd = today + 'T23:59:59.999Z';

  // 1) Recipients
  const { data: recipients } = await sb.from('pm_whatsapp_recipients')
    .select('*')
    .eq('active', true)
    .eq('receives_daily_push', true);

  if (!recipients?.length) {
    return new Response(JSON.stringify({ ok: true, pushed: 0, note: 'no active recipients with daily push' }), {
      headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  let pushed = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    try {
      // 2) Tasks de ClickUp para esa persona con due_date hoy
      const { data: tasks } = await sb.from('clickup_tasks_mirror')
        .select('id, name, status, priority, folder_name, due_date, url')
        .eq('primary_assignee', r.clickup_username)
        .gte('due_date', today)
        .lte('due_date', todayEnd)
        .neq('status_type', 'closed')
        .order('priority', { ascending: false })
        .limit(15);

      if (!tasks || tasks.length === 0) {
        // Igual mandamos un push positivo
        const empty = `Buenos días ${r.full_name.split(' ')[0]} 👋\n\nNo tenés tareas en ClickUp para hoy.\n¿Te ayudo a planificar tu día? Respondé "PLAN" y te ayudo a priorizarlo.`;
        await sendWhatsApp(r, empty, []);
        continue;
      }

      // 3) Armar mensaje
      const taskLines = tasks.map((t, i) => {
        const prioIcon = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : '';
        const folder = t.folder_name ? ` [${t.folder_name}]` : '';
        return `${i + 1}. ☐ ${prioIcon}${t.name}${folder}`;
      }).join('\n');

      const greeting = greetingFor(new Date(), r.full_name.split(' ')[0]);
      const body = `${greeting}\n\nHoy en tu lista (${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'}):\n\n${taskLines}\n\n📲 Cuando cierres una mandame el número + "ok" (ej: "1 ok"). Si las cerrás todas mandá "TODAS".\n\n¡Vamos! 💪`;

      const sent = await sendWhatsApp(r, body, tasks.map(t => t.id));

      // 4) Guardar el daily assignment
      await sb.from('pm_daily_assignments').upsert({
        recipient_id: r.id,
        assigned_date: today,
        tasks: tasks.map(t => ({
          id: t.id,
          name: t.name,
          area: t.folder_name,
          priority: t.priority,
          url: t.url,
          done: false
        })),
        tasks_total: tasks.length,
        tasks_done: 0,
        status: 'pending',
        push_message_id: sent || null
      }, { onConflict: 'recipient_id,assigned_date' });

      pushed++;
    } catch (e) {
      errors.push(`${r.full_name}: ${String(e)}`);
    }
  }

  return new Response(JSON.stringify({ ok: true, pushed, total_recipients: recipients.length, errors }), {
    headers: { ...CORS, 'content-type': 'application/json' }
  });
});

function greetingFor(d: Date, name: string): string {
  const day = d.getDay();
  if (day === 1) return `Buenos días ${name} 👋 ¡Arrancamos la semana fuerte!`;
  if (day === 5) return `Buenos días ${name} 👋 Último empujón de la semana 💪`;
  if (day === 6) return `Buenos días ${name} 👋 ¡Sábado productivo!`;
  return `Buenos días ${name} 👋`;
}

async function sendWhatsApp(recipient: Record<string, unknown>, text: string, taskIds: string[]): Promise<string | null> {
  try {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({
        to: recipient.phone_number,
        type: 'text',
        text,
        related_task_ids: taskIds,
        recipient_id: recipient.id
      })
    });
    const j = await res.json();
    return j.meta_message_id || null;
  } catch (e) {
    console.warn('send fail:', e);
    return null;
  }
}
