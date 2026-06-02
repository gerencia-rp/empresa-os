// ============================================================
// S8-C · Edge Function: whatsapp-webhook
// Recibe los webhooks de WhatsApp Cloud API (status updates + mensajes entrantes).
//
// Setup en Meta for Developers:
//   - Callback URL: https://<project>.supabase.co/functions/v1/whatsapp-webhook
//   - Verify token: configurar el mismo en WA_VERIFY_TOKEN secret
//   - Subscribe to: messages, message_template_status_update
//
// Deploy:
//   supabase functions deploy whatsapp-webhook --no-verify-jwt --use-api
// Secrets:
//   supabase secrets set WA_VERIFY_TOKEN=<token-random-que-elijas>
//
// Lógica:
//   - GET: verificación inicial del webhook (Meta hace handshake)
//   - POST: recibe eventos. Parsea respuestas tipo "1 ✅" o botones interactivos.
//     Si la respuesta cierra una task, llama a clickup-execute con close_task.
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // 1) Handshake de verificación (GET con hub.* params)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const expected = Deno.env.get('WA_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === expected) {
      return new Response(challenge || '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // 2) Webhook POST con evento
  const payload = await req.json().catch(() => ({}));
  const supaUrl = Deno.env.get('SUPABASE_URL') || '';
  const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const sb = createClient(supaUrl, supaKey);

  // Estructura típica del webhook:
  // { entry: [{ changes: [{ value: { messages: [...], statuses: [...] }}]}]}
  const entries = payload.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value || {};

      // 2a) Status updates (delivered, read)
      for (const s of (value.statuses || [])) {
        await sb.from('pm_whatsapp_messages').update({
          status: s.status,
          delivered_at: s.status === 'delivered' ? new Date(+s.timestamp * 1000).toISOString() : null,
          read_at: s.status === 'read' ? new Date(+s.timestamp * 1000).toISOString() : null
        }).eq('meta_message_id', s.id);
      }

      // 2b) Mensajes entrantes
      for (const msg of (value.messages || [])) {
        const from = msg.from;                  // número del usuario
        const msgText = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title || '';
        const buttonId = msg.interactive?.button_reply?.id || null;

        // Buscar recipient por phone
        const { data: recipient } = await sb.from('pm_whatsapp_recipients')
          .select('*')
          .or(`phone_number.eq.+${from},phone_number.eq.${from}`)
          .maybeSingle();

        // Log mensaje entrante
        await sb.from('pm_whatsapp_messages').insert({
          direction: 'in',
          recipient_id: recipient?.id || null,
          phone_number: '+' + from,
          message_type: msg.type,
          body: msgText,
          meta_message_id: msg.id,
          raw_payload: msg,
          status: 'read'
        });

        // Parsear intención: ¿está cerrando una task?
        const closeMatch = parseCloseIntent(msgText, buttonId);
        if (closeMatch && recipient) {
          await handleTaskClose(sb, recipient, closeMatch, from);
        } else if (recipient) {
          // Responder genérico
          await sendQuickReply(from, '👀 Recibido. Si querés cerrar una tarea respondé con el número + "ok" (ej: "3 ok").');
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, 'content-type': 'application/json' }
  });
});

// Parsea texto tipo "1 ok", "3 ✅", "todas hechas", botón con id "task_abc"
function parseCloseIntent(text: string, buttonId: string | null): { kind: 'index'; index: number } | { kind: 'task'; id: string } | { kind: 'all' } | null {
  const t = (text || '').toLowerCase().trim();
  if (buttonId && buttonId.startsWith('task_')) return { kind: 'task', id: buttonId.replace('task_', '') };
  if (/^(todas|all|listo todo|done all)/.test(t)) return { kind: 'all' };
  // patrón: número + (ok|✓|✅|hecha|hecho|done|listo)
  const m = t.match(/^(\d+)\s*(ok|✓|✅|hecha|hecho|done|listo)/);
  if (m) return { kind: 'index', index: +m[1] };
  return null;
}

async function handleTaskClose(sb: ReturnType<typeof createClient>, recipient: Record<string, unknown>, intent: { kind: string; index?: number; id?: string }, from: string) {
  // Buscar asignación del día más reciente
  const today = new Date().toISOString().split('T')[0];
  const { data: daily } = await sb.from('pm_daily_assignments')
    .select('*')
    .eq('recipient_id', recipient.id as string)
    .gte('assigned_date', today)
    .order('assigned_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!daily) {
    await sendQuickReply(from, '🤔 No tenés tareas asignadas para hoy todavía. Esperá el push de las 7am.');
    return;
  }

  const tasks = (daily.tasks as Array<{ id: string; name: string; done: boolean }>) || [];
  const toClose: string[] = [];

  if (intent.kind === 'all') {
    tasks.forEach(t => { if (!t.done) toClose.push(t.id); t.done = true; });
  } else if (intent.kind === 'index' && intent.index) {
    const idx = intent.index - 1;
    if (idx >= 0 && idx < tasks.length && !tasks[idx].done) {
      toClose.push(tasks[idx].id);
      tasks[idx].done = true;
    }
  } else if (intent.kind === 'task' && intent.id) {
    const t = tasks.find(x => x.id === intent.id);
    if (t && !t.done) { toClose.push(t.id); t.done = true; }
  }

  if (toClose.length === 0) {
    await sendQuickReply(from, '🤷 No encontré esa tarea. Mandame el número de tu lista del día (ej: "2 ok").');
    return;
  }

  // Cerrar las tasks en ClickUp via clickup-execute
  for (const taskId of toClose) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/clickup-execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({
        action_type: 'close_task',
        target_task_id: taskId,
        payload: { comment: `Cerrada via WhatsApp por ${recipient.full_name}` }
      })
    });
  }

  // Update daily
  const done = tasks.filter(t => t.done).length;
  await sb.from('pm_daily_assignments').update({
    tasks,
    tasks_done: done,
    status: done === tasks.length ? 'closed' : 'in_progress',
    closed_at: done === tasks.length ? new Date().toISOString() : null
  }).eq('id', daily.id as string);

  // Responder al usuario
  const pending = tasks.length - done;
  const msg = pending === 0
    ? `🏆 Listo! Cerraste todo el día. Tomate un café ☕`
    : `✅ Marcada. Te quedan ${pending} en la lista.`;
  await sendQuickReply(from, msg);
}

async function sendQuickReply(to: string, text: string) {
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ to: '+' + to.replace('+', ''), type: 'text', text })
    });
  } catch (e) {
    console.warn('quick reply fail:', e);
  }
}
