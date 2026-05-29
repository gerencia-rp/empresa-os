-- ============================================================
-- S7-B · ClickUp Automatizaciones REALES (matar placeholders)
-- ============================================================

-- Log de ejecuciones de acciones (auditoría)
create table if not exists public.clickup_action_log (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid references public.clickup_automations(id) on delete set null,
  proposal_id uuid references public.clickup_ai_proposals(id) on delete set null,
  action_type text not null,         -- close_task | comment | assign | create_subtask | add_tag | etc
  action_payload jsonb,              -- payload enviado a ClickUp API
  target_task_id text,
  target_list_id text,
  status text default 'pending' check (status in ('pending','executed','failed','cancelled')),
  response_body text,
  response_status int,
  executed_by uuid references auth.users(id),
  executed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists cal_status on public.clickup_action_log(status);
create index if not exists cal_recent on public.clickup_action_log(created_at desc);
create index if not exists cal_automation on public.clickup_action_log(automation_id);

-- Expandir clickup_automations con campos útiles
alter table public.clickup_automations
  add column if not exists trigger_filter jsonb default '{}'::jsonb,
  add column if not exists last_run_status text,
  add column if not exists last_run_error text;

-- RLS
alter table public.clickup_action_log enable row level security;

drop policy if exists cal_all on public.clickup_action_log;
create policy cal_all on public.clickup_action_log for all
  using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- Seeds: automatizaciones útiles pre-configuradas (templates listas para activar)
insert into public.clickup_automations (name, description, trigger_type, trigger_config, action_type, action_config, active) values
  ('Auto-close vencidas +30d', 'Cierra tareas que llevan >30 días vencidas y sin actividad', 'on_schedule',
    '{"cron":"0 9 * * MON","filter":{"overdue_days_gte":30,"no_activity_days_gte":14}}'::jsonb,
    'close_task',
    '{"comment":"Cerrada automáticamente: >30d vencida sin actividad. Reabrir si sigue relevante."}'::jsonb,
    false),
  ('Recordatorio recurrentes saltadas', 'Comenta cuando una recurrente lleva 2+ ciclos sin done', 'on_schedule',
    '{"cron":"0 8 * * MON","filter":{"is_recurring":true,"missed_count_gte":2}}'::jsonb,
    'send_notification',
    '{"target":"primary_assignee","message":"Tarea recurrente ${name} lleva ${missed_count} ciclos sin completar."}'::jsonb,
    false),
  ('Re-asignar sobrecargados', 'Cuando alguien supera 30 tareas abiertas, sugiere re-asignación', 'on_schedule',
    '{"cron":"0 9 * * *","filter":{"open_count_gte":30}}'::jsonb,
    'run_ai_template',
    '{"template":"redistribute_workload","input":["primary_assignee"]}'::jsonb,
    false),
  ('Bitácora semanal auto', 'Cada lunes 8am genera draft de Bitácora con tasks cerradas la semana', 'on_schedule',
    '{"cron":"0 8 * * MON"}'::jsonb,
    'run_ai_template',
    '{"template":"weekly_bitacora","create_task":true,"list_name":"Bitácoras"}'::jsonb,
    false)
on conflict do nothing;

-- Smoke tests
-- select id, name, trigger_type, active from public.clickup_automations;
-- select count(*), status from public.clickup_action_log group by status;
