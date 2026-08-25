import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...CORS, 'content-type': 'application/json' }
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string' || token.length > 256) {
      return json({ error: 'Token requerido' }, 400);
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: invite, error: inviteError } = await sb
      .from('edu_diagnostic_invites')
      .select('id, student_id, answers, perfil, completed_at, result_plan_id, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (inviteError || !invite) return json({ error: 'Invitación no encontrada' }, 404);

    if (invite.expires_at && !invite.completed_at && new Date(invite.expires_at) < new Date()) {
      return json({ error: 'Esta invitación expiró antes de completar el diagnóstico' }, 403);
    }

    if (!invite.result_plan_id) {
      return json({ invite, plan: null, tasks: [], student_name: null });
    }

    const [{ data: plan, error: planError }, { data: tasks, error: tasksError }, { data: student }] = await Promise.all([
      sb.from('edu_student_plans').select('*').eq('id', invite.result_plan_id).eq('student_id', invite.student_id).maybeSingle(),
      sb.from('edu_student_plan_tasks').select('*').eq('plan_id', invite.result_plan_id).eq('student_id', invite.student_id).order('bloque_orden').order('paso_index'),
      sb.from('edu_students').select('full_name').eq('id', invite.student_id).maybeSingle()
    ]);

    if (planError || !plan) return json({ error: 'El plan asociado no está disponible' }, 404);
    if (tasksError) return json({ error: 'No se pudieron cargar las tareas del plan' }, 500);

    return json({
      invite,
      plan,
      tasks: tasks || [],
      student_name: student?.full_name || null
    });
  } catch (error) {
    console.error('[edu-student-plan-read]', error);
    return json({ error: 'No se pudo cargar el plan' }, 500);
  }
});
