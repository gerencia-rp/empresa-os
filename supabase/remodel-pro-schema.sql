-- ============================================================
-- Remodel Pro — Estimador profesional de remodelación
-- Basado en plantilla Denfield + 5 casas calibradoras reales
-- Va en área "Empresa de Remodelación"
-- ============================================================

create table if not exists public.remodel_calibration_houses (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  address text,
  sqft int,
  total_materials numeric,
  total_labor numeric,
  total_hours numeric,
  hourly_rate numeric,
  calendar_days int,
  worked_days int,
  start_date date,
  end_date date,
  phases_labor jsonb default '{}'::jsonb,
  phases_materials jsonb default '{}'::jsonb,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.remodel_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  property_id uuid references public.properties(id) on delete set null,
  name text not null,
  address text,
  sqft int default 1500,
  type text default 'fix_flip',
  status text default 'planning' check (status in ('planning','active','completed','paused')),
  start_date date default current_date,
  end_date_estimated date,
  end_date_real date,

  -- Totales (calculados)
  budget_total numeric default 0,
  budget_material numeric default 0,
  budget_labor numeric default 0,
  budget_equipment numeric default 0,
  real_total numeric default 0,
  real_material numeric default 0,
  real_labor numeric default 0,
  real_equipment numeric default 0,

  -- Activities en JSON (catálogo aplicado al proyecto)
  -- [{code, phase, subcategory, description, unit, quantity, vu_total, vu_material, vu_labor, days, start_offset, status, real_cost}]
  activities jsonb default '[]'::jsonb,

  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists remodel_projects_status on public.remodel_projects(status);

alter table public.remodel_calibration_houses enable row level security;
alter table public.remodel_projects enable row level security;

drop policy if exists rch_select on public.remodel_calibration_houses;
create policy rch_select on public.remodel_calibration_houses for select using (auth.role() = 'authenticated');
drop policy if exists rch_admin on public.remodel_calibration_houses;
create policy rch_admin on public.remodel_calibration_houses for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists rp_select on public.remodel_projects;
create policy rp_select on public.remodel_projects for select using (auth.role() = 'authenticated');
drop policy if exists rp_write on public.remodel_projects;
create policy rp_write on public.remodel_projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- SEED: 5 casas calibradoras con su data real
-- ============================================================
insert into public.remodel_calibration_houses (name, address, sqft, total_materials, total_labor, total_hours, hourly_rate, calendar_days, worked_days, start_date, end_date, phases_labor, phases_materials) values
  ('Virginia', '902 Virginia Dr, Round Rock TX', 1935, 14471.77, 27387.59, 1643, 16.67, 72, 67, '2025-08-29', '2025-11-08',
   '{"demolicion":{"calendar_days":7,"worked_days":5,"hours":58.2,"labor_cost":1017.62},"estructura":{"calendar_days":54,"worked_days":23,"hours":309.6,"labor_cost":5207.57},"exterior":{"calendar_days":62,"worked_days":19,"hours":206.6,"labor_cost":3456.71},"interior":{"calendar_days":66,"worked_days":58,"hours":965.3,"labor_cost":15947.03},"limpieza":{"calendar_days":64,"worked_days":11,"hours":103.3,"labor_cost":1758.66}}'::jsonb,
   '{"demolicion":{"items":3,"cost":47.89,"pct":0.33},"estructura":{"items":41,"cost":1482.90,"pct":10.25},"exterior":{"items":29,"cost":1947,"pct":13.45},"interior":{"items":152,"cost":9987.31,"pct":69.01},"limpieza":{"items":11,"cost":562.79,"pct":3.89},"herramientas":{"items":19,"cost":328.76,"pct":2.27},"otros_cons":{"items":17,"cost":115.12,"pct":0.80}}'::jsonb),

  ('Picnic', '1607 Picnic Cove, Round Rock TX', 1243, 3995.35, 41080.21, 2332, 17.62, 56, null, '2025-09-28', '2026-01-11',
   '{"demolicion":{"hours":69.4,"labor_cost":1277.67},"estructura":{"hours":0,"labor_cost":0},"exterior":{"hours":846.3,"labor_cost":14733.58},"interior":{"hours":1187.5,"labor_cost":21014.20},"limpieza":{"hours":228.7,"labor_cost":4054.76}}'::jsonb,
   '{"demolicion":{"cost":30.98},"estructura":{"cost":211.92},"exterior":{"cost":524.44},"interior":{"cost":2972.23},"limpieza":{"cost":184.40},"herramientas":{"cost":71.38}}'::jsonb),

  ('Idlewood', '6107 Idlewood Cove, Austin TX', 1135, 32764.19, 35250.66, 1959, 17.99, 69, null, '2025-11-28', '2026-02-19',
   '{"demolicion":{"hours":53.8,"labor_cost":969.5},"estructura":{"hours":0,"labor_cost":0},"exterior":{"hours":395.7,"labor_cost":7230.67},"interior":{"hours":1509.9,"labor_cost":27050.48}}'::jsonb,
   '{"demolicion":{"cost":0},"estructura":{"cost":1949.53},"exterior":{"cost":10913.85},"interior":{"cost":18319.02},"limpieza":{"cost":143.14},"herramientas":{"cost":1099.99}}'::jsonb),

  ('Arcadia', '1109 Arcadia Ave, Austin TX', 1509, 26126.19, 43610.34, 2426, 17.97, 69, null, '2025-12-02', '2026-02-16',
   '{"demolicion":{"hours":213.8,"labor_cost":3751.33},"estructura":{"hours":299.4,"labor_cost":5266.59},"exterior":{"hours":587.2,"labor_cost":10664.30},"interior":{"hours":1257.7,"labor_cost":22673.09},"limpieza":{"hours":68.2,"labor_cost":1255.03}}'::jsonb,
   '{"demolicion":{"cost":1201.01},"estructura":{"cost":698.81},"exterior":{"cost":2108.97},"interior":{"cost":21503.37},"limpieza":{"cost":310.57},"herramientas":{"cost":280.90}}'::jsonb),

  ('Ramble', '514 Ramble Ln, Austin TX', 1519, 51709.94, 43942.51, 2557, 17.19, 80, null, '2025-11-28', '2026-03-02',
   '{"demolicion":{"hours":43.4,"labor_cost":748.65},"estructura":{"hours":312.6,"labor_cost":5445.69},"exterior":{"hours":304.4,"labor_cost":4540.95},"interior":{"hours":1865.7,"labor_cost":32668.50},"limpieza":{"hours":31,"labor_cost":538.71}}'::jsonb,
   '{"demolicion":{"cost":95.47},"estructura":{"cost":3019.68},"exterior":{"cost":14434.74},"interior":{"cost":27850.03},"limpieza":{"cost":3066.31},"herramientas":{"cost":2791.96}}'::jsonb)
on conflict (name) do update set
  total_materials = excluded.total_materials,
  total_labor = excluded.total_labor,
  total_hours = excluded.total_hours,
  hourly_rate = excluded.hourly_rate,
  phases_labor = excluded.phases_labor,
  phases_materials = excluded.phases_materials;

-- Sistema en área Remodelación
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('remodel-pro', 'remodelacion', 'remodel-pro', 'Estimador Pro de Remodelación', '🏗️',
   'Plantilla Denfield + calibración 5 casas reales. Presupuesto detallado por sub-actividad + cronograma Gantt + materiales.',
   '{}'::jsonb, '{}'::jsonb, 0)
on conflict (id) do nothing;
