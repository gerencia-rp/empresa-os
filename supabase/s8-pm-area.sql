-- ============================================================
-- S8 · Sprint 8 — Área Project Management
-- Sistema nervioso central que conecta todas las áreas + WhatsApp Daily Loop.
-- ============================================================

-- ============================================================
-- 1) Crear el área "pm" en public.areas
-- ============================================================
insert into public.areas (id, name, icon, description, position) values
  ('pm', 'Project Management', '🎯',
   'Coordinación cross-empresa. WhatsApp daily loop, scorecard único, workload balancer, IA agente.',
   99)
on conflict (id) do update set name = excluded.name, icon = excluded.icon, description = excluded.description;

-- ============================================================
-- 2) Tabla: destinatarios de WhatsApp + sus mappings
-- ============================================================
create table if not exists public.pm_whatsapp_recipients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_number text not null,                -- formato E.164: +15125551234
  whatsapp_id text,                          -- WhatsApp Business ID (lo manda el webhook)
  clickup_username text,                     -- nombre tal como aparece en ClickUp (para matchear assignees)
  remodel_crew_id uuid references public.remodel_crew(id) on delete set null,
  role text,                                 -- 'pm' | 'crew_leader' | 'specialist' | 'office'
  areas text[] default '{}'::text[],         -- ['remodelacion','rentas','fix_flip','pm']
  active bool default true,
  preferred_language text default 'es',
  receives_daily_push bool default true,
  receives_daily_close bool default true,
  receives_group_report bool default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (phone_number)
);

create index if not exists pwr_active on public.pm_whatsapp_recipients(active);
create index if not exists pwr_clickup on public.pm_whatsapp_recipients(clickup_username);

-- ============================================================
-- 3) Tabla: configuración global del bot (chat grupal central, horarios)
-- ============================================================
create table if not exists public.pm_whatsapp_config (
  id int primary key default 1 check (id = 1),  -- singleton row
  group_chat_id text,                            -- chat grupal para reportes 8pm
  daily_push_hour int default 7,                 -- 7am push
  daily_close_hour int default 18,               -- 6pm close
  group_report_hour int default 20,              -- 8pm grupo
  weekly_review_day int default 1,               -- 1=Mon
  weekly_review_hour int default 7,
  timezone text default 'America/Chicago',
  active bool default false,                     -- empieza off hasta que configurés
  bot_personality text default 'directo y motivador, sin jerga corporate',
  updated_at timestamptz default now()
);
insert into public.pm_whatsapp_config (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- 4) Tabla: log de mensajes (envíos + recibidos)
-- ============================================================
create table if not exists public.pm_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('out','in')),
  recipient_id uuid references public.pm_whatsapp_recipients(id) on delete set null,
  phone_number text,
  message_type text default 'text',          -- text | template | interactive | reaction
  template_name text,
  body text,
  buttons jsonb,                             -- para mensajes interactivos
  related_task_ids text[],                   -- IDs de ClickUp tasks que tocó
  meta_message_id text,                      -- el ID de WhatsApp para hacer ack/reaction
  status text default 'sent',                -- sent | delivered | read | failed | replied
  raw_payload jsonb,
  sent_at timestamptz default now(),
  delivered_at timestamptz,
  read_at timestamptz
);

create index if not exists pwm_recent on public.pm_whatsapp_messages(sent_at desc);
create index if not exists pwm_recipient on public.pm_whatsapp_messages(recipient_id);
create index if not exists pwm_meta_id on public.pm_whatsapp_messages(meta_message_id);

-- ============================================================
-- 5) Tabla: asignaciones del día (foto del daily por persona)
-- ============================================================
create table if not exists public.pm_daily_assignments (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.pm_whatsapp_recipients(id) on delete cascade,
  assigned_date date not null,
  tasks jsonb not null default '[]'::jsonb,  -- [{id, name, area, priority, done}]
  tasks_total int default 0,
  tasks_done int default 0,
  tasks_carried_over int default 0,
  push_message_id uuid references public.pm_whatsapp_messages(id) on delete set null,
  close_message_id uuid references public.pm_whatsapp_messages(id) on delete set null,
  status text default 'pending' check (status in ('pending','in_progress','closed','no_response')),
  created_at timestamptz default now(),
  closed_at timestamptz,
  unique (recipient_id, assigned_date)
);

create index if not exists pda_date on public.pm_daily_assignments(assigned_date desc);
create index if not exists pda_status on public.pm_daily_assignments(status);

-- ============================================================
-- 6) Tabla: dependencias cross-área (qué bloquea qué)
-- ============================================================
create table if not exists public.pm_dependencies_cross (
  id uuid primary key default gen_random_uuid(),
  -- Entidad que bloquea (de origen)
  source_type text not null check (source_type in ('clickup_task','remodel_project','rentas_lease','fix_flip_deal','custom')),
  source_id text not null,
  source_label text,
  source_area text,
  -- Entidad bloqueada
  target_type text not null check (target_type in ('clickup_task','remodel_project','rentas_lease','fix_flip_deal','custom')),
  target_id text not null,
  target_label text,
  target_area text,
  -- Estado
  reason text,
  severity text default 'normal' check (severity in ('low','normal','high','critical')),
  resolved bool default false,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists pdc_open on public.pm_dependencies_cross(resolved) where not resolved;
create index if not exists pdc_source on public.pm_dependencies_cross(source_id);
create index if not exists pdc_target on public.pm_dependencies_cross(target_id);

-- ============================================================
-- 7) Tabla: reportes ejecutivos auto-generados
-- ============================================================
create table if not exists public.pm_executive_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('weekly','monthly','quarterly','annual')),
  period_start date not null,
  period_end date not null,
  summary_md text,
  kpis jsonb,
  alerts jsonb,
  recommendations jsonb,
  generated_by text default 'ai',
  cost_tokens_used int,
  created_at timestamptz default now(),
  unique (report_type, period_start)
);

create index if not exists per_type_recent on public.pm_executive_reports(report_type, period_start desc);

-- ============================================================
-- 8) Tabla: risk register
-- ============================================================
create table if not exists public.pm_risks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  area text,                                 -- 'remodelacion' | 'rentas' | etc
  category text,                             -- financiero | operativo | legal | reputacional
  probability int check (probability between 1 and 5),
  impact int check (impact between 1 and 5),
  score int generated always as (coalesce(probability,0) * coalesce(impact,0)) stored,
  mitigation text,
  owner text,
  status text default 'open' check (status in ('open','mitigating','closed')),
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists pmr_open on public.pm_risks(status) where status != 'closed';
create index if not exists pmr_score on public.pm_risks(score desc);

-- ============================================================
-- 9) Tabla: compliance tracker (permisos, licencias, seguros)
-- ============================================================
create table if not exists public.pm_compliance_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  area text,
  type text check (type in ('permit','license','insurance','certification','contract','tax','other')),
  issuer text,                              -- City of Austin, IRS, etc
  reference_number text,
  issued_date date,
  expiry_date date,
  reminder_days_before int default 30,
  status text default 'active' check (status in ('active','pending','expired','renewed')),
  documents jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists pci_expiry on public.pm_compliance_items(expiry_date) where status = 'active';

-- ============================================================
-- 10) View: scorecard cross-área (1 pantalla con todo)
-- ============================================================
create or replace view public.pm_scorecard as
select
  -- Remodelación
  (select count(*) from public.remodel_at_properties where proceso = 'En construcción') as obras_activas,
  (select count(*) from public.remodel_alerts where resolved_at is null and severity = 'critical') as alertas_obras_critical,
  (select coalesce(sum(coalesce(gasto_materiales,0) + coalesce(gasto_trabajadores,0)),0)
   from public.remodel_at_properties where proceso = 'En construcción') as capital_en_obra,
  -- ClickUp
  (select coalesce(total_open, 0) from public.clickup_snapshots order by snapshot_date desc limit 1) as clickup_open,
  (select coalesce(total_overdue, 0) from public.clickup_snapshots order by snapshot_date desc limit 1) as clickup_overdue,
  (select coalesce(bus_factor_pct, 0) from public.clickup_snapshots order by snapshot_date desc limit 1) as bus_factor_pct,
  -- Acciones requeridas pendientes
  (select count(*) from public.remodel_required_actions where status = 'pending') as acciones_pendientes,
  (select count(*) from public.remodel_required_actions where status = 'pending' and due_date < current_date) as acciones_vencidas,
  -- WhatsApp daily
  (select count(*) from public.pm_daily_assignments where assigned_date = current_date) as dailies_hoy,
  (select count(*) from public.pm_daily_assignments where assigned_date = current_date and status = 'closed') as dailies_hoy_cerrados,
  -- Risks
  (select count(*) from public.pm_risks where status = 'open' and score >= 12) as risks_high,
  -- Compliance expiring soon (30d)
  (select count(*) from public.pm_compliance_items
   where status = 'active' and expiry_date <= current_date + interval '30 days') as compliance_expiring_soon,
  -- Cross dependencies open
  (select count(*) from public.pm_dependencies_cross where not resolved) as cross_deps_open,
  -- Última actualización
  now() as last_calculated_at;

-- ============================================================
-- 11) RLS
-- ============================================================
alter table public.pm_whatsapp_recipients enable row level security;
alter table public.pm_whatsapp_config enable row level security;
alter table public.pm_whatsapp_messages enable row level security;
alter table public.pm_daily_assignments enable row level security;
alter table public.pm_dependencies_cross enable row level security;
alter table public.pm_executive_reports enable row level security;
alter table public.pm_risks enable row level security;
alter table public.pm_compliance_items enable row level security;

do $$ begin
  drop policy if exists pwr_all on public.pm_whatsapp_recipients;
  drop policy if exists pwc_all on public.pm_whatsapp_config;
  drop policy if exists pwm_all on public.pm_whatsapp_messages;
  drop policy if exists pda_all on public.pm_daily_assignments;
  drop policy if exists pdc_all on public.pm_dependencies_cross;
  drop policy if exists per_all on public.pm_executive_reports;
  drop policy if exists pmr_all on public.pm_risks;
  drop policy if exists pci_all on public.pm_compliance_items;
end $$;

create policy pwr_all on public.pm_whatsapp_recipients for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy pwc_all on public.pm_whatsapp_config for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy pwm_all on public.pm_whatsapp_messages for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy pda_all on public.pm_daily_assignments for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy pdc_all on public.pm_dependencies_cross for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy per_all on public.pm_executive_reports for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy pmr_all on public.pm_risks for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy pci_all on public.pm_compliance_items for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- ============================================================
-- 12) Registrar el sistema "pm-dashboard" en la nueva área
-- ============================================================
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('pm-dashboard', 'pm', 'pm-dashboard', 'Dashboard PM',  '🎯',
   'Scorecard, WhatsApp daily loop, workload, dependencias cross-área, IA agente, reportes ejecutivos, risks & compliance.',
   '{}'::jsonb, '{}'::jsonb, 0)
on conflict (id) do update set name = excluded.name, description = excluded.description;

-- ============================================================
-- 13) pg_cron jobs para el daily loop
-- Requieren pg_cron + pg_net activos (ya los tenés desde S7-A)
-- ============================================================
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in (
    'pm-daily-push-7am', 'pm-daily-close-6pm', 'pm-group-report-8pm', 'pm-weekly-review-mon-7am'
  );
exception when others then null;
end $$;

-- Push 7am hora Texas (UTC-6 normalmente, UTC-5 en DST). Usamos 13:00 UTC ≈ 7am Texas en DST
select cron.schedule('pm-daily-push-7am', '0 13 * * 1-6',
  $$select public.cron_invoke_function('pm-daily-push')$$);

-- Close 6pm Texas ≈ 00:00 UTC del día siguiente. Usamos 00:00 UTC = 6pm CST (cuando DST) o 7pm CST (sin DST)
select cron.schedule('pm-daily-close-6pm', '0 0 * * 2-7',
  $$select public.cron_invoke_function('pm-daily-close')$$);

-- Group report 8pm ≈ 02:00 UTC siguiente día
select cron.schedule('pm-group-report-8pm', '0 2 * * 2-7',
  $$select public.cron_invoke_function('pm-group-report')$$);

-- Weekly executive review — lunes 7am Texas
select cron.schedule('pm-weekly-review-mon-7am', '0 13 * * 1',
  $$select public.cron_invoke_function('pm-weekly-review')$$);

-- ============================================================
-- 14) Smoke tests
-- ============================================================
-- select * from public.pm_scorecard;
-- select * from public.pm_whatsapp_config;
-- select * from cron.job where jobname like 'pm-%' order by jobname;
