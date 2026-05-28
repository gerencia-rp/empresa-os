-- ============================================================
-- ClickUp Dashboard — sync + KPIs + alertas + automatizaciones + agente IA
-- Conecta con space "Empresa Remodelación" (id 90113866434)
-- ============================================================

-- Espejo de tasks (sync incremental)
create table if not exists public.clickup_tasks_mirror (
  id text primary key,                  -- ClickUp task ID
  name text,
  status text,
  status_type text,                     -- open|closed|custom
  priority text,
  assignees jsonb default '[]'::jsonb,  -- [{id, username}]
  primary_assignee text,                -- denormalizado del primer assignee
  due_date timestamptz,
  date_created timestamptz,
  date_updated timestamptz,
  date_closed timestamptz,
  date_done timestamptz,
  list_id text,
  list_name text,
  folder_id text,
  folder_name text,                     -- la "casa" en remodelación
  space_id text,
  tags jsonb default '[]'::jsonb,
  custom_fields jsonb,
  url text,
  is_recurring boolean default false,
  time_estimate bigint,                 -- ms
  time_spent bigint,                    -- ms (de time tracking)
  fase text,                            -- preconstruccion|construccion|pre-entrega|entrega|post-entrega
  raw jsonb,
  last_synced_at timestamptz default now()
);

create index if not exists clickup_tasks_assignee on public.clickup_tasks_mirror(primary_assignee);
create index if not exists clickup_tasks_folder on public.clickup_tasks_mirror(folder_id);
create index if not exists clickup_tasks_status on public.clickup_tasks_mirror(status);
create index if not exists clickup_tasks_due on public.clickup_tasks_mirror(due_date);

-- Snapshot diario (agregados para tendencias)
create table if not exists public.clickup_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  total_tasks int,
  total_open int,
  total_closed int,
  total_closed_last_7d int,
  total_overdue int,
  total_no_assignee int,
  by_assignee jsonb,                    -- {"Michell Yanes": {open:45, closed_week:12, overdue:8, p50_age_days:7}}
  by_casa jsonb,                        -- {"1133 Denfield": {open:23, closed:45, pct:78, fase:"construccion"}}
  by_status jsonb,
  by_fase jsonb,                        -- {"preconstruccion": {open:50, ...}}
  recurrentes_status jsonb,             -- {"Bitácoras Semanales": {expected:4, done:3, missed:1}}
  bus_factor_pct numeric,               -- % de tasks que dependen 1 sola persona
  top_overloaded_person text,
  top_overloaded_count int,
  created_at timestamptz default now()
);

-- Alertas (se regeneran cada sync)
create table if not exists public.clickup_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,             -- sobrecarga|vencida|estancada|recurrente_saltada|sin_assignee|casa_inactiva|bus_factor
  severity text not null,               -- critical|warning|info
  title text not null,
  detail text,
  related_assignee text,
  related_task_id text,
  related_folder_id text,
  metric_value numeric,
  threshold numeric,
  detected_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

create index if not exists clickup_alerts_active on public.clickup_alerts(resolved_at) where resolved_at is null;

-- Insights IA semanales (lunes)
create table if not exists public.clickup_weekly_insights (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  summary_md text,
  bottlenecks jsonb,
  recommendations jsonb,
  automation_candidates jsonb,
  cost_tokens_used int,
  created_at timestamptz default now()
);

-- Sync log
create table if not exists public.clickup_sync_log (
  id uuid primary key default gen_random_uuid(),
  synced_at timestamptz default now(),
  tasks_synced int,
  alerts_generated int,
  duration_ms int,
  error text,
  triggered_by uuid references auth.users(id)
);

create index if not exists clickup_sync_log_recent on public.clickup_sync_log(synced_at desc);

-- Automatizaciones configurables
create table if not exists public.clickup_automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  trigger_type text not null,          -- task_status_change|recurring_due|task_created|on_schedule
  trigger_config jsonb,
  action_type text not null,           -- close_task|create_subtask|send_notification|run_ai_template|webhook
  action_config jsonb,
  active boolean default true,
  last_triggered timestamptz,
  run_count int default 0,
  created_at timestamptz default now()
);

-- Propuestas del agente IA (inbox de aprobación)
create table if not exists public.clickup_ai_proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_type text not null,         -- reassign|close|create|notify|automate
  title text not null,
  rationale text,
  current_state jsonb,
  proposed_state jsonb,
  action_payload jsonb,                 -- payload concreto para ejecutar en ClickUp API
  status text default 'pending' check (status in ('pending','approved','rejected','executed','failed')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  executed_at timestamptz,
  execution_result text,
  created_at timestamptz default now()
);

create index if not exists clickup_ai_proposals_pending on public.clickup_ai_proposals(status) where status = 'pending';

-- RLS
alter table public.clickup_tasks_mirror enable row level security;
alter table public.clickup_snapshots enable row level security;
alter table public.clickup_alerts enable row level security;
alter table public.clickup_weekly_insights enable row level security;
alter table public.clickup_sync_log enable row level security;
alter table public.clickup_automations enable row level security;
alter table public.clickup_ai_proposals enable row level security;

create policy ctm_all on public.clickup_tasks_mirror for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy cs_all on public.clickup_snapshots for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy ca_all on public.clickup_alerts for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy cwi_all on public.clickup_weekly_insights for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy csl_all on public.clickup_sync_log for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy cau_all on public.clickup_automations for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy cap_all on public.clickup_ai_proposals for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- Sistema en área Remodelación
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('clickup-dashboard','remodelacion','clickup-dashboard','ClickUp Análisis','📋',
   'Análisis de operación. Detecta cuellos de botella, sobrecarga de personas y oportunidades de automatización.',
   '{}'::jsonb, '{}'::jsonb, 4)
on conflict (id) do nothing;
