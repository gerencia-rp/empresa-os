// ============================================================
// S7-B · Edge Function: clickup-execute
// Ejecuta acciones aprobadas contra la API de ClickUp.
//
// Deploy:
//   supabase functions deploy clickup-execute --no-verify-jwt --use-api
// Secrets requeridos:
//   supabase secrets set CLICKUP_TOKEN=pk_xxx
//
// Body esperado:
// {
//   "action_type": "close_task" | "comment" | "reschedule" | "assign" | "create_subtask" | "add_tag",
//   "target_task_id": "abc123",
//   "payload": { ... },                  // según action_type
//   "automation_id": "uuid" | null,
//   "proposal_id": "uuid" | null,
//   "executed_by": "user uuid"
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

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';

async function clickupApi(endpoint: string, token: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${CLICKUP_BASE}${endpoint}`, {
    method,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { ok: res.ok, status: res.status, body: parsed };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // Esta función cambia estado externo: solo administradores autenticados.
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth.ok) return new Response(JSON.stringify({ ok: false, error: auth.error }), {
    status: auth.status || 401, headers: { ...CORS, 'content-type': 'application/json' }
  });

  const body = await req.json();
  const { action_type, target_task_id, payload, automation_id, proposal_id, executed_by } = body || {};
  const token = Deno.env.get('CLICKUP_TOKEN');
  const supaUrl = Deno.env.get('SUPABASE_URL') || '';
  const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const sb = createClient(supaUrl, supaKey);

  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: 'CLICKUP_TOKEN no configurado' }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  const { data: syncHealth } = await sb.from('clickup_sync_log')
    .select('synced_at,error')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const syncAgeMs = syncHealth?.synced_at ? Date.now() - new Date(syncHealth.synced_at).getTime() : Number.POSITIVE_INFINITY;
  if (!syncHealth || syncHealth.error || syncAgeMs > 2 * 60 * 60 * 1000) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'ClickUp está bloqueado por continuidad: recuperá la conexión y completá una sincronización real antes de ejecutar cambios.',
      evidence: { synced_at: syncHealth?.synced_at || null, error: syncHealth?.error || 'sin sincronización reciente' }
    }), { status: 503, headers: { ...CORS, 'content-type': 'application/json' } });
  }

  // Log de inicio
  const { data: logRow } = await sb.from('clickup_action_log').insert({
    automation_id, proposal_id, action_type, action_payload: payload,
    target_task_id, status: 'pending', executed_by
  }).select().single();
  const logId = logRow?.id;

  let result: { ok: boolean; status: number; body: unknown } = { ok: false, status: 0, body: null };

  try {
    if (action_type === 'close_task') {
      // ClickUp cierre = set status a closed
      result = await clickupApi(`/task/${target_task_id}`, token, 'PUT', { status: 'closed' });
      // Si hay comentario adicional
      if (result.ok && payload?.comment) {
        await clickupApi(`/task/${target_task_id}/comment`, token, 'POST', {
          comment_text: payload.comment, notify_all: false
        });
      }
    } else if (action_type === 'comment') {
      result = await clickupApi(`/task/${target_task_id}/comment`, token, 'POST', {
        comment_text: payload.comment || 'Sin texto',
        notify_all: payload.notify_all !== false
      });
    } else if (action_type === 'reschedule') {
      const dueAt = payload?.due_date ? new Date(payload.due_date).getTime() : NaN;
      if (!Number.isFinite(dueAt)) {
        result = { ok: false, status: 400, body: { err: 'reschedule requiere payload.due_date válido' } };
      } else {
        result = await clickupApi(`/task/${target_task_id}`, token, 'PUT', { due_date: dueAt });
        if (result.ok && payload?.comment) {
          await clickupApi(`/task/${target_task_id}/comment`, token, 'POST', {
            comment_text: payload.comment, notify_all: false
          });
        }
      }
    } else if (action_type === 'assign') {
      // payload.assignee_id es el ID de usuario ClickUp; payload.unassign_others=true para reasignación total
      const assignees = { add: [payload.assignee_id], rem: payload.unassign_others ? (payload.current_assignees || []) : [] };
      result = await clickupApi(`/task/${target_task_id}`, token, 'PUT', { assignees });
    } else if (action_type === 'create_subtask') {
      // Necesitamos list_id; lo tomamos del task padre si no se pasa
      let listId = payload.list_id;
      if (!listId) {
        const task = await clickupApi(`/task/${target_task_id}`, token);
        listId = (task.body as Record<string, unknown>)?.list && ((task.body as Record<string, Record<string, string>>).list).id;
      }
      result = await clickupApi(`/list/${listId}/task`, token, 'POST', {
        name: payload.name || 'Nueva subtask',
        parent: target_task_id,
        description: payload.description || '',
        assignees: payload.assignees || []
      });
    } else if (action_type === 'add_tag') {
      result = await clickupApi(`/task/${target_task_id}/tag/${encodeURIComponent(payload.tag_name)}`, token, 'POST');
    } else {
      result = { ok: false, status: 400, body: { err: 'action_type desconocido: ' + action_type } };
    }
  } catch (e) {
    result = { ok: false, status: 500, body: { err: String(e) } };
  }

  // Update log
  if (logId) {
    await sb.from('clickup_action_log').update({
      status: result.ok ? 'executed' : 'failed',
      response_body: typeof result.body === 'string' ? result.body : JSON.stringify(result.body),
      response_status: result.status,
      executed_at: new Date().toISOString()
    }).eq('id', logId);
  }

  // Si vino de un proposal, marcarlo como executed/failed
  if (proposal_id) {
    await sb.from('clickup_ai_proposals').update({
      status: result.ok ? 'executed' : 'failed',
      executed_at: new Date().toISOString(),
      execution_result: typeof result.body === 'string' ? result.body : JSON.stringify(result.body)
    }).eq('id', proposal_id);
  }

  return new Response(JSON.stringify({ ok: result.ok, status: result.status, result: result.body }), {
    status: result.ok ? 200 : 400,
    headers: { ...CORS, 'content-type': 'application/json' }
  });
});
