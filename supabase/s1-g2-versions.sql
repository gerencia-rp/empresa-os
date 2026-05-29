-- ============================================================
-- S1-G2 · Versionado de presupuesto + Change Orders
-- ============================================================

-- Tabla de versiones aprobadas (snapshot del presupuesto en un momento)
create table if not exists public.remodel_budget_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  version int not null,
  label text,                                  -- ej: "Aprobado inicial", "Post change order 1"
  -- Snapshot completo
  activities jsonb not null default '[]'::jsonb,
  budget_total numeric,
  budget_material numeric,
  budget_labor numeric,
  budget_equipment numeric,
  pricing jsonb default '{}'::jsonb,           -- contingencia, overhead, markup, etc al momento
  sqft int,
  -- Aprobación
  approved_by text,                            -- nombre o email del cliente / lender / partner
  approved_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  unique (project_id, version)
);

create index if not exists remodel_versions_project on public.remodel_budget_versions(project_id, version desc);

-- Tabla de change orders (delta entre 2 versiones, con razón + aprobación cliente)
create table if not exists public.remodel_change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  from_version int not null,
  to_version int not null,
  number int,                                  -- CO #1, CO #2, etc (auto-incremental por project)
  title text,
  description text,
  reason text,                                 -- 'cliente_solicitado' | 'hallazgo_obra' | 'codigo_local' | 'otro'
  -- Delta calculado
  delta_cost numeric,                          -- diff de budget_total
  delta_days int,                              -- diff de duración estimada
  activities_added jsonb default '[]'::jsonb,  -- codes y montos nuevos
  activities_removed jsonb default '[]'::jsonb,
  activities_modified jsonb default '[]'::jsonb,
  -- Aprobación
  client_approved bool default false,
  client_approved_by text,
  client_approved_at timestamptz,
  status text default 'pending' check (status in ('pending','approved','rejected','executed')),
  -- Meta
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  unique (project_id, number)
);

create index if not exists remodel_co_project on public.remodel_change_orders(project_id, number desc);
create index if not exists remodel_co_status on public.remodel_change_orders(status);

-- RLS
alter table public.remodel_budget_versions enable row level security;
alter table public.remodel_change_orders enable row level security;

drop policy if exists rbv_select on public.remodel_budget_versions;
create policy rbv_select on public.remodel_budget_versions for select using (auth.role()='authenticated');
drop policy if exists rbv_write on public.remodel_budget_versions;
create policy rbv_write on public.remodel_budget_versions for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

drop policy if exists rco_select on public.remodel_change_orders;
create policy rco_select on public.remodel_change_orders for select using (auth.role()='authenticated');
drop policy if exists rco_write on public.remodel_change_orders;
create policy rco_write on public.remodel_change_orders for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- Vista: última versión aprobada por proyecto (para el SOW Lender)
create or replace view public.remodel_latest_approved_version as
select distinct on (project_id)
  project_id, version, label, budget_total, approved_by, approved_at, sqft, activities
from public.remodel_budget_versions
where approved_at is not null
order by project_id, version desc;

-- Helper: siguiente número de change order por proyecto
create or replace function public.next_change_order_number(p_project_id uuid)
returns int language sql stable as $$
  select coalesce(max(number), 0) + 1
  from public.remodel_change_orders
  where project_id = p_project_id;
$$;

-- Helper: siguiente número de versión por proyecto
create or replace function public.next_budget_version(p_project_id uuid)
returns int language sql stable as $$
  select coalesce(max(version), 0) + 1
  from public.remodel_budget_versions
  where project_id = p_project_id;
$$;

-- Smoke test
-- select * from public.remodel_budget_versions;
-- select * from public.remodel_change_orders;
-- select * from public.remodel_latest_approved_version;
