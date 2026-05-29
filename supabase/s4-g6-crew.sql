-- ============================================================
-- S4-G6 · Crew (workers) + asignaciones a actividades
-- ============================================================

create table if not exists public.remodel_crew (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text default 'general',  -- general, electrician, plumber, carpenter, painter, hvac, supervisor
  hourly_rate numeric default 17.50,
  skills text[] default '{}',   -- habilidades específicas (ej: ['drywall','paint','tile'])
  phone text,
  email text,
  capacity_hours_per_day numeric default 8,
  active bool default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id),
  unique (name)
);

create index if not exists remodel_crew_active on public.remodel_crew(active);

-- Trigger updated_at
create or replace function public.tg_remodel_crew_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_remodel_crew_touch on public.remodel_crew;
create trigger trg_remodel_crew_touch before update on public.remodel_crew
  for each row execute function public.tg_remodel_crew_touch();

-- Asignaciones de crew a actividades (1 worker puede estar varias actividades, 1 actividad puede tener varios workers)
create table if not exists public.remodel_crew_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  crew_id uuid not null references public.remodel_crew(id) on delete cascade,
  activity_code text not null,
  hours_planned numeric default 0,
  hours_actual numeric,
  date_planned date,
  date_actual date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists remodel_assign_project on public.remodel_crew_assignments(project_id);
create index if not exists remodel_assign_crew on public.remodel_crew_assignments(crew_id);
create index if not exists remodel_assign_activity on public.remodel_crew_assignments(project_id, activity_code);

-- Vista: agregado por proyecto + actividad (cuántas horas, cuántos workers, costo MO estimado)
create or replace view public.remodel_crew_workload as
select
  ca.project_id,
  ca.activity_code,
  count(distinct ca.crew_id) as num_workers,
  sum(ca.hours_planned) as total_hours_planned,
  sum(ca.hours_actual) as total_hours_actual,
  sum(ca.hours_planned * c.hourly_rate) as labor_cost_planned,
  sum(coalesce(ca.hours_actual, 0) * c.hourly_rate) as labor_cost_actual,
  string_agg(c.name, ', ' order by c.name) as worker_names
from public.remodel_crew_assignments ca
join public.remodel_crew c on c.id = ca.crew_id
group by ca.project_id, ca.activity_code;

-- Vista: workload por persona (cuántas horas tiene comprometidas across proyectos)
create or replace view public.remodel_crew_capacity as
select
  c.id as crew_id,
  c.name,
  c.hourly_rate,
  c.capacity_hours_per_day,
  count(distinct ca.project_id) as active_projects,
  count(distinct (ca.project_id, ca.activity_code)) as assigned_activities,
  coalesce(sum(ca.hours_planned), 0) as total_hours_planned,
  coalesce(sum(ca.hours_actual), 0) as total_hours_actual
from public.remodel_crew c
left join public.remodel_crew_assignments ca on ca.crew_id = c.id
where c.active
group by c.id, c.name, c.hourly_rate, c.capacity_hours_per_day;

-- RLS
alter table public.remodel_crew enable row level security;
alter table public.remodel_crew_assignments enable row level security;

drop policy if exists rc_select on public.remodel_crew;
create policy rc_select on public.remodel_crew for select using (auth.role()='authenticated');
drop policy if exists rc_write on public.remodel_crew;
create policy rc_write on public.remodel_crew for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

drop policy if exists rca_select on public.remodel_crew_assignments;
create policy rca_select on public.remodel_crew_assignments for select using (auth.role()='authenticated');
drop policy if exists rca_write on public.remodel_crew_assignments;
create policy rca_write on public.remodel_crew_assignments for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- Smoke test
-- select * from public.remodel_crew_capacity order by total_hours_planned desc;
