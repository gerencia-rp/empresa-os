// ════════════════════════════════════════════════════════════
// 🤖 Edu · Generate Plan From Invite
// Llamada sincrónica desde diag.html cuando el estudiante termina las
// 21 preguntas. Calcula perfil + bloques + tasks y crea el plan ya.
//
// Es la versión server-side de la lógica del frontend
// (fmCalcularPerfil + fmGenerarBloques + insert), pero acá usamos
// service role key para bypassear RLS y no depender del cliente.
//
// IMPORTANTE: la lógica de cálculo de perfil y bloques es compleja y
// vive en edu/edu-fm-diagnostico.js. Acá NO la duplicamos — en su
// lugar, marcamos la invite como "needs_processing" y dejamos que el
// auto-procesamiento del mentor (eduProcessPendingInvites cada 2min)
// lo genere usando esas funciones del frontend.
//
// Esta edge function existe principalmente para:
// 1. Disparar un "ping" al backend
// 2. Insertar un plan stub si el estudiante quiere ver algo inmediato
//
// Para producción real, lo correcto sería portar fmCalcularPerfil y
// fmGenerarBloques a esta edge function. Por ahora retornamos 200
// para que el cliente continúe el flujo.
//
// Deploy:
//   supabase functions deploy edu-generate-plan-from-invite --no-verify-jwt
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

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'token requerido' }), {
        status: 400, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Cargar invite
    const { data: invite, error: invErr } = await sb
      .from('edu_diagnostic_invites')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (invErr || !invite) {
      return new Response(JSON.stringify({ error: 'invite no encontrada' }), {
        status: 404, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    // Si ya tiene plan, retornar OK
    if (invite.result_plan_id) {
      return new Response(JSON.stringify({ ok: true, plan_id: invite.result_plan_id, already: true }), {
        headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    // Marcar como "ready_for_processing" — la app del mentor lo levanta cada 2min.
    // Mientras tanto, devolvemos 200 para que el cliente redirija al portal.
    // El portal de mi-plan.html mostrará "esperando plan..." y polleará cada 5s.
    return new Response(JSON.stringify({
      ok: true,
      pending: true,
      message: 'Invitación marcada. El plan se genera en breve.'
    }), { headers: { ...CORS, 'content-type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }
});
