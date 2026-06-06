// ════════════════════════════════════════════════════════════
// 🚀 WhatsApp Cloud API · Envío automático (genérico)
//
// Sirve para múltiples sistemas dentro de Empresa OS:
//   - Educación (edu_whatsapp_messages)
//   - Project Manager (pm_whatsapp_messages)
//   - Cualquier otro con la misma forma de tabla
//
// Una sola app de Meta + un solo set de credenciales para todos.
//
// Deploy:
//   supabase functions deploy whatsapp-send-cloud --no-verify-jwt
//
// Secrets requeridos (una sola vez para todo Empresa OS):
//   supabase secrets set META_WHATSAPP_PHONE_ID="<phone_number_id>"
//   supabase secrets set META_WHATSAPP_TOKEN="EAAxxxxx"
//   supabase secrets set META_WHATSAPP_TEMPLATE_NAME="seguimiento_semanal"
//     (opcional — para envío fuera de ventana 24h)
//
// Request:
//   POST /functions/v1/whatsapp-send-cloud
//   {
//     source: 'edu' | 'pm' | string,   // de qué sistema vienen los msgs
//     message_ids: string[]
//   }
//
// El parámetro `source` mapea a la tabla:
//   edu → edu_whatsapp_messages, edu_students (student_id)
//   pm  → pm_whatsapp_messages, pm_team_members (member_id)
// ════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

const SOURCE_CONFIG: Record<string, { table: string; fkColumn: string; fkTable: string }> = {
  edu: {
    table: 'edu_whatsapp_messages',
    fkColumn: 'student_id',
    fkTable: 'edu_students'
  },
  pm: {
    table: 'pm_whatsapp_messages',
    fkColumn: 'recipient_id',
    fkTable: 'pm_whatsapp_recipients'
  }
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
      message: 'Faltan META_WHATSAPP_PHONE_ID o META_WHATSAPP_TOKEN en Supabase secrets.'
    }), { status: 200, headers: { ...CORS, 'content-type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const source = body.source || 'edu';
    const message_ids = body.message_ids;
    const phoneOverride = body.phone_override; // para envíos one-off sin tabla

    const cfg = SOURCE_CONFIG[source];
    if (!cfg) {
      return new Response(JSON.stringify({ error: `source inválido: ${source}` }), {
        status: 400, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    if (!Array.isArray(message_ids) || !message_ids.length) {
      return new Response(JSON.stringify({ error: 'message_ids requerido' }), {
        status: 400, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Cargar los mensajes
    const { data: messages, error } = await sb.from(cfg.table)
      .select(`id, message_text, phone, status, ${cfg.fkColumn}`)
      .in('id', message_ids);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    // Resolver teléfonos faltantes desde la tabla del FK
    const missingFkIds = messages!.filter((m: any) => !m.phone && m[cfg.fkColumn]).map((m: any) => m[cfg.fkColumn]);
    const fkPhones: Record<string, string> = {};
    if (missingFkIds.length) {
      const { data: rows } = await sb.from(cfg.fkTable).select('id, phone').in('id', missingFkIds);
      (rows || []).forEach((r: any) => { fkPhones[r.id] = r.phone || ''; });
    }

    const META_API = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;
    let sent = 0, failed = 0;
    const errors: string[] = [];

    for (const m of messages! as any[]) {
      if (m.status === 'sent') continue;

      let phone = phoneOverride || m.phone || fkPhones[m[cfg.fkColumn]] || '';
      phone = phone.replace(/\D/g, '');
      if (phone.length === 10) phone = '1' + phone; // USA default

      if (!phone || phone.length < 10) {
        failed++;
        errors.push(`Sin teléfono: msg ${String(m.id).slice(0,8)}`);
        continue;
      }

      // Construir payload
      const payload: any = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: m.message_text }
      };

      // Si hay template configurada, usarla (necesario fuera de ventana 24h)
      if (TEMPLATE_NAME) {
        payload.type = 'template';
        delete payload.text;
        payload.template = {
          name: TEMPLATE_NAME,
          language: { code: 'es' },
          components: [{
            type: 'body',
            parameters: [{ type: 'text', text: m.message_text }]
          }]
        };
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
          await sb.from(cfg.table).update({
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

    return new Response(JSON.stringify({
      ok: true, source, sent, failed, errors: errors.slice(0, 20)
    }), { headers: { ...CORS, 'content-type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }
});
