// ════════════════════════════════════════════════════════════
// 🚀 WhatsApp Cloud API · Envío automático masivo
//
// Recibe message_ids[] y manda cada uno a través de la API oficial
// de WhatsApp Business Cloud (Meta).
//
// Deploy:
//   supabase functions deploy edu-whatsapp-send-cloud --no-verify-jwt
//
// Secrets requeridos:
//   supabase secrets set META_WHATSAPP_PHONE_ID="<phone_number_id>"
//   supabase secrets set META_WHATSAPP_TOKEN="EAAxxxxx"
//   supabase secrets set META_WHATSAPP_TEMPLATE_NAME="seguimiento_semanal"
//     (opcional — solo si querés mandar templates aprobadas)
// ════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const PHONE_ID = Deno.env.get('META_WHATSAPP_PHONE_ID');
  const TOKEN = Deno.env.get('META_WHATSAPP_TOKEN');
  const TEMPLATE_NAME = Deno.env.get('META_WHATSAPP_TEMPLATE_NAME');

  if (!PHONE_ID || !TOKEN) {
    return new Response(JSON.stringify({
      needs_setup: true,
      reason: 'missing_credentials',
      message: 'Faltan META_WHATSAPP_PHONE_ID o META_WHATSAPP_TOKEN en Supabase secrets. Ver setup.'
    }), { status: 200, headers: { ...CORS, 'content-type': 'application/json' } });
  }

  try {
    const { message_ids } = await req.json();
    if (!Array.isArray(message_ids) || !message_ids.length) {
      return new Response(JSON.stringify({ error: 'message_ids requerido' }), {
        status: 400, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Cargar los mensajes
    const { data: messages, error } = await sb.from('edu_whatsapp_messages')
      .select('id, message_text, phone, status, student_id')
      .in('id', message_ids);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    // Si no tienen phone, cargar el del estudiante
    const studentIds = messages!.filter(m => !m.phone && m.student_id).map(m => m.student_id);
    let studentPhones: Record<string, string> = {};
    if (studentIds.length) {
      const { data: students } = await sb.from('edu_students')
        .select('id, phone')
        .in('id', studentIds);
      (students || []).forEach(s => { studentPhones[s.id] = s.phone || ''; });
    }

    const META_API = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;
    let sent = 0, failed = 0;
    const errors: string[] = [];

    for (const m of messages!) {
      if (m.status === 'sent') continue;
      let phone = m.phone || studentPhones[m.student_id] || '';
      phone = phone.replace(/\D/g, '');
      if (phone.length === 10) phone = '1' + phone; // USA default

      if (!phone || phone.length < 10) {
        failed++;
        errors.push(`Sin teléfono: msg ${m.id.slice(0,8)}`);
        continue;
      }

      // Construir payload
      const payload: any = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: m.message_text }
      };

      // Si hay template configurada, usarla en vez de texto libre
      // (necesario para mensajes "fríos" sin conversación previa < 24h)
      if (TEMPLATE_NAME) {
        payload.type = 'template';
        delete payload.text;
        payload.template = {
          name: TEMPLATE_NAME,
          language: { code: 'es' }
        };
        // Si la template tiene placeholder {{1}} para body, mandar el mensaje completo
        // Esto depende de cómo configures la template en Meta
        payload.template.components = [{
          type: 'body',
          parameters: [{ type: 'text', text: m.message_text }]
        }];
      }

      try {
        const r = await fetch(META_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          },
          body: JSON.stringify(payload)
        });
        const data = await r.json();

        if (r.ok && data.messages?.[0]?.id) {
          await sb.from('edu_whatsapp_messages').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            wa_message_id: data.messages[0].id
          }).eq('id', m.id);
          sent++;
        } else {
          failed++;
          errors.push(`${phone}: ${data.error?.message || JSON.stringify(data).slice(0,100)}`);
        }
      } catch (e: any) {
        failed++;
        errors.push(`${phone}: ${e.message}`);
      }

      // Rate limit ~10 mensajes/segundo según Meta
      await new Promise(r => setTimeout(r, 120));
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, errors: errors.slice(0, 20) }), {
      headers: { ...CORS, 'content-type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }
});
