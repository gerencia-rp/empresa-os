-- ============================================================
-- Weekly Planner — recursos + calendario semanal de obras
-- ============================================================

-- Catálogo de recursos (herramientas, crews, profesionales)
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('tool','crew','specialist','vehicle','other')),
  category text,
  emoji text default '🔧',
  cost_per_day numeric default 0,
  contact_phone text,
  contact_name text,
  capacity int default 1,  -- 1 = solo 1 obra/día. Para herramientas grupo: >1
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists resources_type on public.resources(type);
create index if not exists resources_active on public.resources(active);

-- Actividades planificadas por casa/día con recursos asignados
create table if not exists public.weekly_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.remodel_projects(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  property_name text,  -- denormalizado (en caso de no tener project/property linkeado)
  date date not null,
  activity_name text not null,
  stage text,  -- demolicion, framing, drywall, pintura, etc
  resource_ids jsonb default '[]'::jsonb,
  start_hour int default 7,
  end_hour int default 17,
  status text default 'planned' check (status in ('planned','in_progress','done','cancelled')),
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists weekly_activities_date on public.weekly_activities(date);
create index if not exists weekly_activities_project on public.weekly_activities(project_id);

alter table public.resources enable row level security;
alter table public.weekly_activities enable row level security;

drop policy if exists res_select on public.resources;
create policy res_select on public.resources for select using (auth.role() = 'authenticated');
drop policy if exists res_admin on public.resources;
create policy res_admin on public.resources for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists wa_select on public.weekly_activities;
create policy wa_select on public.weekly_activities for select using (auth.role() = 'authenticated');
drop policy if exists wa_write on public.weekly_activities;
create policy wa_write on public.weekly_activities for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Seed: recursos típicos (basados en tu data Airtable)
insert into public.resources (name, type, category, emoji, cost_per_day, capacity, notes) values
  -- CREWS (los líderes de tu Airtable)
  ('Crew Roberto', 'crew', 'General', '👷', 600, 1, 'Líder + 2-3 ayudantes'),
  ('Crew Eduardo', 'crew', 'General', '👷', 700, 1, 'Líder + 3 ayudantes'),
  ('Crew Vato', 'crew', 'General', '👷', 550, 1, 'Líder + 2 ayudantes'),
  ('Crew Óscar', 'crew', 'General', '👷', 650, 1, 'Líder + 2-3 ayudantes'),
  ('Crew Adrián', 'crew', 'General', '👷', 600, 1, 'Líder + 2 ayudantes'),
  ('Crew Luis', 'crew', 'General', '👷', 500, 1, 'Líder + 1-2 ayudantes'),

  -- SPECIALISTS (subcontratistas certificados)
  ('Electricista certificado', 'specialist', 'Electrical', '⚡', 450, 1, 'Cobra por proyecto típicamente'),
  ('Plomero certificado', 'specialist', 'Plumbing', '🔧', 500, 1, 'Cobra por proyecto'),
  ('HVAC técnico', 'specialist', 'HVAC', '❄️', 600, 1, 'AC/Furnace install + repair'),
  ('Tile setter', 'specialist', 'Tile', '◼️', 400, 1, 'Baños + cocinas'),
  ('Roofer', 'specialist', 'Roof', '🏠', 800, 1, 'Por proyecto típico'),
  ('Drywall finisher', 'specialist', 'Drywall', '🪟', 350, 1, 'Mud, tape, sand, texture'),
  ('Pintor especializado', 'specialist', 'Paint', '🖌️', 300, 1, 'Spraying + acabados premium'),
  ('Concreto specialist', 'specialist', 'Concrete', '🧱', 500, 1, 'Foundation + flatwork'),
  ('Cabinetero / Carpintero', 'specialist', 'Carpentry', '🪚', 400, 1, 'Cabinets + trim + doors'),

  -- HERRAMIENTAS / EQUIPOS
  ('Mezcladora concreto', 'tool', 'Concrete', '⚙️', 80, 1, 'Renta diaria HD'),
  ('Mini excavadora (renta)', 'tool', 'Heavy', '🚜', 350, 1, 'Reservar 48h antes'),
  ('Sierra circular pro', 'tool', 'Power', '🪚', 0, 2, 'Propias x2'),
  ('Pistola de clavos + compresor', 'tool', 'Power', '🔨', 0, 2, 'Propias'),
  ('Escalera 24ft + andamios', 'tool', 'Access', '🪜', 50, 1, 'Renta para roof/exterior'),
  ('Generador 5000W', 'tool', 'Power', '⚡', 60, 1, 'Renta para casas sin power'),
  ('Lijadora orbital', 'tool', 'Finish', '🌀', 0, 2, 'Propias x2'),
  ('Camión / Truck', 'vehicle', 'Transport', '🚚', 0, 2, 'Truck Roberto + Truck Eduardo'),
  ('Dumpster (Bunch trash)', 'tool', 'Disposal', '🗑️', 450, 1, 'Renta semanal, ordenar 24h antes')
on conflict do nothing;

-- Sistema en área Remodelación
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('weekly-planner', 'remodelacion', 'weekly-planner', 'Planner Semanal',  '📅',
   'Organiza la semana: arrastra crews, specialists y herramientas a cada casa/día. Detecta conflictos.',
   '{}'::jsonb, '{}'::jsonb, 1)
on conflict (id) do nothing;
