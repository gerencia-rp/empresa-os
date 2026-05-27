-- ============================================================
-- Sistema de aprendizaje: cada proyecto completado alimenta el modelo
-- ============================================================

-- Tabla de "actuals" — datos reales por actividad de proyectos completados
create table if not exists public.remodel_actuals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.remodel_projects(id) on delete cascade,
  activity_code text not null,
  stage_key text,  -- mapeo a una de las 16 stages
  -- Estimado original
  estimated_cost numeric,
  estimated_days numeric,
  estimated_hours numeric,
  -- Real registrado
  real_cost numeric,
  real_days numeric,
  real_hours numeric,
  real_materials_cost numeric,
  real_labor_cost numeric,
  -- Variance calculado
  variance_cost_pct numeric generated always as (
    case when estimated_cost > 0 then ((real_cost - estimated_cost) / estimated_cost * 100) else null end
  ) stored,
  variance_days_pct numeric generated always as (
    case when estimated_days > 0 then ((real_days - estimated_days) / estimated_days * 100) else null end
  ) stored,
  -- Meta
  sqft int,  -- denormalizado para fácil cálculo de $/ft²
  notes text,
  completed_at timestamptz default now(),
  recorded_by uuid references auth.users(id)
);

create index if not exists remodel_actuals_project on public.remodel_actuals(project_id);
create index if not exists remodel_actuals_stage on public.remodel_actuals(stage_key);

alter table public.remodel_actuals enable row level security;

drop policy if exists ra_select on public.remodel_actuals;
create policy ra_select on public.remodel_actuals for select using (auth.role() = 'authenticated');
drop policy if exists ra_write on public.remodel_actuals;
create policy ra_write on public.remodel_actuals for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Vista de benchmarks dinámicos (recalcula con todos los proyectos completados + 5 calibradoras)
create or replace view public.remodel_dynamic_benchmarks as
with all_actuals as (
  select stage_key, real_cost, real_days, sqft, project_id
  from public.remodel_actuals
  where real_cost > 0 and sqft > 0
),
by_stage as (
  select
    stage_key,
    count(distinct project_id) as samples,
    avg(real_cost / sqft) as avg_psf,
    stddev_samp(real_cost / sqft) as std_psf,
    min(real_cost / sqft) as min_psf,
    max(real_cost / sqft) as max_psf,
    avg(real_days) as avg_days
  from all_actuals
  group by stage_key
)
select * from by_stage;

-- Agregar tipo de remodelación a projects
alter table public.remodel_projects add column if not exists remodel_type text default 'heavy'
  check (remodel_type in ('lipstick','light','heavy','full','gut'));

-- Marcar proyecto como completado (trigger para fecha)
alter table public.remodel_projects add column if not exists completed_at timestamptz;
