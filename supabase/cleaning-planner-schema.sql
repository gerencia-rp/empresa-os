-- ============================================================
-- Ops Planner v2 — Backlog + Zone batching para Juan Austin
-- Modelo: tareas se acumulan en backlog (date=null), y se "arma el día"
-- agrupando por zona, ordenando por antigüedad, agrupando por casa.
-- ============================================================

-- Catálogo de plantillas reutilizables
create table if not exists public.ops_tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  business text default 'both' check (business in ('rentas','remodelacion','both')),
  default_duration_min int default 30,
  default_materials jsonb default '[]'::jsonb,
  emoji text default '🧰',
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Tareas (backlog + agendadas). date=null → en backlog
create table if not exists public.ops_day_tasks (
  id uuid primary key default gen_random_uuid(),
  date date,                    -- NULL = backlog
  start_time time,              -- NULL = backlog
  duration_min int not null default 30,
  title text not null,
  task_id uuid references public.ops_tasks(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  project_id uuid references public.remodel_projects(id) on delete set null,
  location text,
  zona text check (zona in ('Norte','Sur','Centro','Este','Oeste')),
  business text default 'both' check (business in ('rentas','remodelacion','both')),
  materials jsonb default '[]'::jsonb,
  assignee text default 'Juan Austin',
  status text default 'planned' check (status in ('planned','in_progress','done','skipped')),
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  due_by date,                  -- deadline opcional
  recurring_id uuid,            -- si vino de una recurrente
  notes text,
  travel_min int default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migraciones idempotentes (si tabla ya existía)
alter table public.ops_day_tasks alter column date drop not null;
alter table public.ops_day_tasks alter column start_time drop not null;
alter table public.ops_day_tasks add column if not exists zona text check (zona in ('Norte','Sur','Centro','Este','Oeste'));
alter table public.ops_day_tasks add column if not exists project_id uuid references public.remodel_projects(id) on delete set null;
alter table public.ops_day_tasks add column if not exists due_by date;
alter table public.ops_day_tasks add column if not exists recurring_id uuid;
alter table public.ops_day_tasks alter column assignee set default 'Juan Austin';

create index if not exists ops_day_tasks_date on public.ops_day_tasks(date);
create index if not exists ops_day_tasks_property on public.ops_day_tasks(property_id);
create index if not exists ops_day_tasks_project on public.ops_day_tasks(project_id);
create index if not exists ops_day_tasks_zona on public.ops_day_tasks(zona);
create index if not exists ops_day_tasks_backlog on public.ops_day_tasks(date) where date is null;

-- Recurrentes: generan pendientes automáticamente cada N días
create table if not exists public.ops_recurring (
  id uuid primary key default gen_random_uuid(),
  base_task_id uuid references public.ops_tasks(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  project_id uuid references public.remodel_projects(id) on delete cascade,
  custom_title text,
  custom_duration_min int,
  custom_materials jsonb,
  zona text check (zona in ('Norte','Sur','Centro','Este','Oeste')),
  business text default 'rentas' check (business in ('rentas','remodelacion','both')),
  interval_days int not null default 90,
  priority text default 'normal',
  last_generated date,
  next_due date not null,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists ops_recurring_next on public.ops_recurring(next_due) where active = true;

alter table public.ops_tasks enable row level security;
alter table public.ops_day_tasks enable row level security;
alter table public.ops_recurring enable row level security;

drop policy if exists ot_select on public.ops_tasks;
create policy ot_select on public.ops_tasks for select using (auth.role() = 'authenticated');
drop policy if exists ot_write on public.ops_tasks;
create policy ot_write on public.ops_tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists odt_select on public.ops_day_tasks;
create policy odt_select on public.ops_day_tasks for select using (auth.role() = 'authenticated');
drop policy if exists odt_write on public.ops_day_tasks;
create policy odt_write on public.ops_day_tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists or_select on public.ops_recurring;
create policy or_select on public.ops_recurring for select using (auth.role() = 'authenticated');
drop policy if exists or_write on public.ops_recurring;
create policy or_write on public.ops_recurring for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Catálogo: tareas reales de Juan Austin
insert into public.ops_tasks (name, category, business, default_duration_min, default_materials, emoji) values
  ('Sacar Basura', 'mantenimiento', 'rentas', 150, '["bolsas industriales","guantes","truck"]'::jsonb, '🗑️'),
  ('Podar Cesped', 'mantenimiento', 'rentas', 120, '["podadora","gasolina","trimmer","bolsas"]'::jsonb, '🌱'),
  ('Limpieza', 'limpieza', 'rentas', 60, '["productos limpieza","trapos","escoba","mopa","aspiradora"]'::jsonb, '🧽'),
  ('Cambio de Filtros Aire acondicionado', 'mantenimiento', 'rentas', 60, '["filtros AC","escalera","destornillador"]'::jsonb, '❄️'),
  ('Armar muebles', 'mantenimiento', 'rentas', 120, '["allen keys","destornillador","taladro","instrucciones"]'::jsonb, '🪑'),
  ('Tiempo Almuerzo', 'descanso', 'both', 60, '[]'::jsonb, '🍽️'),
  ('Desplazamiento', 'logistica', 'both', 20, '[]'::jsonb, '🚗'),
  ('Inspección de propiedad', 'inspeccion', 'rentas', 45, '["cámara","libreta","tablet"]'::jsonb, '🔍'),
  ('Cambio de cerraduras', 'mantenimiento', 'rentas', 30, '["cerraduras nuevas","destornillador","taladro"]'::jsonb, '🔐'),
  ('Pintura touch-up', 'mantenimiento', 'rentas', 90, '["pintura","brochas","rodillo","cinta","lijas"]'::jsonb, '🎨'),
  ('Limpieza turnover Airbnb', 'limpieza', 'rentas', 120, '["productos limpieza","sábanas","toallas","amenities"]'::jsonb, '🧹'),
  ('Revisar leak / plomería', 'mantenimiento', 'rentas', 45, '["llaves stilson","sellador","trapos","baldes"]'::jsonb, '🚰'),
  ('Showing a prospecto', 'gestion', 'rentas', 30, '["llaves","tablet"]'::jsonb, '🤝'),
  ('Foto y video de propiedad', 'marketing', 'rentas', 45, '["cámara","trípode","drone"]'::jsonb, '📸'),
  ('Compra Home Depot', 'compras', 'both', 60, '["lista de compras","tarjeta empresa","truck"]'::jsonb, '🛒'),
  ('Recoger material en proveedor', 'compras', 'both', 45, '["truck","lista","tie-down straps"]'::jsonb, '📦'),
  ('Visita a obra', 'inspeccion', 'remodelacion', 30, '["tablet","cámara","cinta métrica"]'::jsonb, '🏗️'),
  ('Entrega de material a crew', 'logistica', 'remodelacion', 30, '["truck","carga"]'::jsonb, '🚚'),
  ('Reunión con crew líder', 'gestion', 'remodelacion', 30, '["plano","tablet","SOW"]'::jsonb, '👥'),
  ('Botar basura / Dumpster run', 'logistica', 'both', 45, '["truck","lonas","guantes"]'::jsonb, '♻️')
on conflict do nothing;

-- Sistema visible en ambas áreas
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('ops-planner-rentas', 'rentas', 'ops-planner', 'Cronograma Juan Austin', '🧰',
   'Backlog + planeación por zona. Optimiza la ruta: lunes todo Sur, martes todo Norte.',
   '{}'::jsonb, '{}'::jsonb, 0),
  ('ops-planner-remodel', 'remodelacion', 'ops-planner', 'Cronograma Juan Austin', '🧰',
   'Backlog + planeación por zona. Optimiza la ruta: lunes todo Sur, martes todo Norte.',
   '{}'::jsonb, '{}'::jsonb, 2)
on conflict (id) do nothing;
