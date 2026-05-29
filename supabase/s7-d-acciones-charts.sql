-- ============================================================
-- S7-D · Polish operativo
-- Tabla persistente para acciones requeridas (antes solo eran cómputo client-side)
-- ============================================================

create table if not exists public.remodel_required_actions (
  id uuid primary key default gen_random_uuid(),
  airtable_id text,                              -- obra de Airtable
  project_id uuid references public.remodel_projects(id) on delete set null,
  -- Acción
  title text not null,
  detail text,
  category text check (category in ('retraso','sobrepresupuesto','labor_alto','discrepancia','margen','calidad','otro')),
  responsable text,                              -- nombre del responsable sugerido
  due_date date,
  -- Estado
  status text default 'pending' check (status in ('pending','in_progress','done','dismissed')),
  -- Source: auto = generada por kpis, manual = creada por user
  source text default 'auto' check (source in ('auto','manual','ai')),
  -- Auditoría
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  notes text,
  -- Idempotencia: misma combo (airtable_id, title) no se duplica
  unique (airtable_id, title) deferrable initially deferred
);

create index if not exists rra_status on public.remodel_required_actions(status);
create index if not exists rra_airtable on public.remodel_required_actions(airtable_id);
create index if not exists rra_project on public.remodel_required_actions(project_id);
create index if not exists rra_due on public.remodel_required_actions(due_date) where status = 'pending';

-- View KPIs de acciones (para dashboard)
create or replace view public.remodel_actions_summary as
select
  count(*) as total,
  count(*) filter (where status = 'pending') as pending,
  count(*) filter (where status = 'in_progress') as in_progress,
  count(*) filter (where status = 'done') as done,
  count(*) filter (where status = 'pending' and due_date < current_date) as overdue,
  jsonb_object_agg(
    category, count
  ) filter (where category is not null) as by_category
from (
  select category, status, due_date, count(*) as count
  from public.remodel_required_actions
  group by category, status, due_date
) sub;

-- RLS
alter table public.remodel_required_actions enable row level security;

drop policy if exists rra_select on public.remodel_required_actions;
create policy rra_select on public.remodel_required_actions for select using (auth.role()='authenticated');
drop policy if exists rra_write on public.remodel_required_actions;
create policy rra_write on public.remodel_required_actions for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- Smoke
-- select * from public.remodel_actions_summary;
