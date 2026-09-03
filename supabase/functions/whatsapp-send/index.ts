// ============================================================
// S8-B · Edge Function: whatsapp-send
// Proxy a WhatsApp Cloud API (graph.facebook.com)
//
// Deploy:
//   supabase functions deploy whatsapp-send --no-verify-jwt --use-api
// Secrets:
//   supabase secrets set WA_PHONE_NUMBER_ID=...
//   supabase secrets set WA_ACCESS_TOKEN=...
//   supabase secrets set WA_BUSINESS_ID=...
//
// Body:
// {
//   "to": "+15125551234",
//   "type": "text" | "template" | "interactive",
//   "text": "Hola Roberto, hoy tenés...",
//   "template_name": "daily_push" (si type=template),
//   "template_lang": "es",
//   "template_components": [...],
//   "buttons": [{"id":"task_abc","title":"Hecha 1"}] (si type=interactive),
//   "related_task_ids": ["abc123"],
//   "recipient_id": "uuid"
// }
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

  // Enviar mensajes es una acción externa irreversible. El service role de
  // los crons o un administrador autenticado son los únicos emisores válidos.
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth.ok) return new Response(JSON.stringify({ ok: false, error: auth.error }), {
    status: auth.status || 401, headers: { ...CORS, 'content-type': 'application/json' }
  });

  const phoneNumberId = Deno.env.get('WA_PHONE_NUMBER_ID');
  const accessToken = Deno.env.get('WA_ACCESS_TOKEN');
  if (!phoneNumberId || !accessToken) {
    return new Response(JSON.stringify({ ok: false, error: 'WA_PHONE_NUMBER_ID o WA_ACCESS_TOKEN no configurados' }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  const body = await req.json();
  const { to, type = 'text', text, template_name, template_lang = 'es', template_components, buttons, related_task_ids = [], recipient_id } = body;

  if (!to) {
    return new Response(JSON.stringify({ ok: false, error: 'Falta "to"' }), {
      status: 400, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }
  if (!['text', 'template', 'interactive'].includes(type)) {
    return new Response(JSON.stringify({ ok: false, error: 'type debe ser text, template o interactive' }), {
      status: 400, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  // Construir payload según tipo
  let payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to.replace(/[^0-9+]/g, '')
  };

  if (type === 'text') {
    payload.type = 'text';
    payload.text = { preview_url: false, body: text || '' };
  } else if (type === 'template') {
    payload.type = 'template';
    payload.template = {
      name: template_name,
      language: { code: template_lang },
      components: template_components || []
    };
  } else if (type === 'interactive') {
    payload.type = 'interactive';
    payload.interactive = {
      type: 'button',
      body: { text: text || '' },
      action: {
        buttons: (buttons || []).slice(0, 3).map((b: { id: string; title: string }) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) }
        }))
      }
    };
  }

  // Llamar a WhatsApp Cloud API
  const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  let status = 0;
  let responseBody: unknown = null;
  let metaMessageId: string | null = null;
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    status = res.status;
    responseBody = await res.json();
    if (status >= 200 && status < 300) {
      metaMessageId = (responseBody as { messages?: Array<{ id: string }> })?.messages?.[0]?.id || null;
    }
  } catch (e) {
    responseBody = { error: String(e) };
  }

  // Log en pm_whatsapp_messages
  const supaUrl = Deno.env.get('SUPABASE_URL') || '';
  const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (supaUrl && supaKey) {
    const sb = createClient(supaUrl, supaKey);
    await sb.from('pm_whatsapp_messages').insert({
      direction: 'out',
      recipient_id: recipient_id || null,
      phone_number: to,
      message_type: type,
      template_name: template_name || null,
      body: text || JSON.stringify(payload),
      buttons: buttons || null,
      related_task_ids,
      meta_message_id: metaMessageId,
      status: status >= 200 && status < 300 ? 'sent' : 'failed',
      raw_payload: responseBody as Record<string, unknown>
    });
  }

  return new Response(JSON.stringify({
    ok: status >= 200 && status < 300,
    status,
    meta_message_id: metaMessageId,
    result: responseBody
  }), {
    status: status >= 200 && status < 300 ? 200 : 400,
    headers: { ...CORS, 'content-type': 'application/json' }
  });
});
