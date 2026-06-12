// ════════════════════════════════════════════════════════════
// 🎯 Edu · Student Task Toggle
// Permite al estudiante marcar/desmarcar tareas de SU plan sin login,
// validando contra el token de su invitación.
//
// Deploy:
//   supabase functions deploy edu-student-task-toggle --no-verify-jwt
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
    const { token, task_id, completed } = await req.json();
    if (!token || !task_id || typeof completed !== 'boolean') {
      return new Response(JSON.stringify({ error: 'token, task_id y completed requeridos' }), {
        status: 400, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Validar token y obtener student_id
    const { data: invite, error: invErr } = await sb
      .from('edu_diagnostic_invites')
      .select('id, student_id, result_plan_id, completed_at, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (invErr || !invite) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 404, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Link expirado' }), {
        status: 403, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    // 2) Verificar que la tarea pertenece al plan del estudiante de la invite
    const { data: task, error: tErr } = await sb
      .from('edu_student_plan_tasks')
      .select('id, student_id, plan_id')
      .eq('id', task_id)
      .maybeSingle();

    if (tErr || !task) {
      return new Response(JSON.stringify({ error: 'Tarea no encontrada' }), {
        status: 404, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    // Seguridad: la tarea tiene que ser del estudiante de la invitación
    if (task.student_id !== invite.student_id) {
      return new Response(JSON.stringify({ error: 'Esta tarea no es tuya' }), {
        status: 403, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    // 3) Actualizar
    const update: any = {
      completed,
      completed_at: completed ? new Date().toISOString() : null
    };
    const { error: upErr } = await sb
      .from('edu_student_plan_tasks')
      .update(update)
      .eq('id', task_id);

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true, completed }), {
      headers: { ...CORS, 'content-type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }
});
