-- ============================================================
-- CLEANING PLANNER — Copia del Ops Planner v2 (Juan Austin) adaptado
-- para el equipo de limpieza: post-remodelación, turnovers Airbnb,
-- limpieza por habitación, mantenimiento mensual.
-- Mismo modelo: backlog (date=null), "armar día" por zona, agrupar por casa.
-- ============================================================

-- Catálogo de plantillas reutilizables (limpieza)
create table if not exists public.clean_tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  business text default 'both' check (business in ('rentas','remodelacion','both')),
  default_duration_min int default 60,
  default_materials jsonb default '[]'::jsonb,
  emoji text default '🧽',
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Tareas (backlog + agendadas). date=null → en backlog
create table if not exists public.clean_day_tasks (
  id uuid primary key default gen_random_uuid(),
  date date,
  start_time time,
  duration_min int not null default 60,
  title text not null,
  task_id uuid references public.clean_tasks(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  project_id uuid references public.remodel_projects(id) on delete set null,
  location text,
  zona text check (zona in ('Norte','Sur','Centro','Este','Oeste')),
  business text default 'both' check (business in ('rentas','remodelacion','both')),
  materials jsonb default '[]'::jsonb,
  assignee text default 'Equipo Limpieza',
  status text default 'planned' check (status in ('planned','in_progress','done','skipped')),
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  due_by date,
  recurring_id uuid,
  notes text,
  travel_min int default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migraciones idempotentes
alter table public.clean_day_tasks alter column date drop not null;
alter table public.clean_day_tasks alter column start_time drop not null;
alter table public.clean_day_tasks add column if not exists zona text check (zona in ('Norte','Sur','Centro','Este','Oeste'));
alter table public.clean_day_tasks add column if not exists project_id uuid references public.remodel_projects(id) on delete set null;
alter table public.clean_day_tasks add column if not exists due_by date;
alter table public.clean_day_tasks add column if not exists recurring_id uuid;
alter table public.clean_day_tasks alter column assignee set default 'Equipo Limpieza';

create index if not exists clean_day_tasks_date on public.clean_day_tasks(date);
create index if not exists clean_day_tasks_property on public.clean_day_tasks(property_id);
create index if not exists clean_day_tasks_project on public.clean_day_tasks(project_id);
create index if not exists clean_day_tasks_zona on public.clean_day_tasks(zona);
create index if not exists clean_day_tasks_backlog on public.clean_day_tasks(date) where date is null;

-- Recurrentes (limpieza mensual long-term, turnover Airbnb cada N días)
create table if not exists public.clean_recurring (
  id uuid primary key default gen_random_uuid(),
  base_task_id uuid references public.clean_tasks(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  project_id uuid references public.remodel_projects(id) on delete cascade,
  custom_title text,
  custom_duration_min int,
  custom_materials jsonb,
  zona text check (zona in ('Norte','Sur','Centro','Este','Oeste')),
  business text default 'rentas' check (business in ('rentas','remodelacion','both')),
  interval_days int not null default 30,
  priority text default 'normal',
  last_generated date,
  next_due date not null,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists clean_recurring_next on public.clean_recurring(next_due) where active = true;

-- Plantillas de día completo
create table if not exists public.clean_day_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  tasks jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.clean_tasks enable row level security;
alter table public.clean_day_tasks enable row level security;
alter table public.clean_recurring enable row level security;
alter table public.clean_day_templates enable row level security;

drop policy if exists ct_select on public.clean_tasks;
create policy ct_select on public.clean_tasks for select using (auth.role() = 'authenticated');
drop policy if exists ct_write on public.clean_tasks;
create policy ct_write on public.clean_tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists cdt_select on public.clean_day_tasks;
create policy cdt_select on public.clean_day_tasks for select using (auth.role() = 'authenticated');
drop policy if exists cdt_write on public.clean_day_tasks;
create policy cdt_write on public.clean_day_tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists cr_select on public.clean_recurring;
create policy cr_select on public.clean_recurring for select using (auth.role() = 'authenticated');
drop policy if exists cr_write on public.clean_recurring;
create policy cr_write on public.clean_recurring for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists cdtmpl_select on public.clean_day_templates;
create policy cdtmpl_select on public.clean_day_templates for select using (auth.role() = 'authenticated');
drop policy if exists cdtmpl_write on public.clean_day_templates;
create policy cdtmpl_write on public.clean_day_templates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Catálogo: tareas reales del equipo de limpieza
insert into public.clean_tasks (name, category, business, default_duration_min, default_materials, emoji) values
  -- Post-remodelación
  ('Limpieza post-remodelación', 'post-obra', 'remodelacion', 240, '["aspiradora industrial","trapeador","baldes","escoba","productos limpieza","bolsas grandes","guantes","mascarillas","quitamanchas"]'::jsonb, '🏗️'),
  ('Retirar polvo de construcción', 'post-obra', 'remodelacion', 120, '["aspiradora con filtro HEPA","plumeros","trapos microfibra","mascarillas"]'::jsonb, '💨'),
  ('Limpieza de ventanas post-obra', 'post-obra', 'remodelacion', 90, '["limpiavidrios","escurridor","trapos","escalera","quitapintura"]'::jsonb, '🪟'),
  ('Limpiar pisos pegados de pintura/yeso', 'post-obra', 'remodelacion', 60, '["espátula","quitapintura","mopa","productos especializados"]'::jsonb, '🧴'),
  -- Turnover Airbnb (entre huéspedes)
  ('Turnover completo Airbnb', 'airbnb', 'rentas', 150, '["sábanas limpias","toallas","amenities","productos limpieza","aspiradora","mopa","bolsas basura"]'::jsonb, '🏘️'),
  ('Cambio de sábanas + lavado', 'airbnb', 'rentas', 60, '["sábanas","fundas","toallas","detergente"]'::jsonb, '🛏️'),
  ('Reabastecer amenities (jabones, papel, café)', 'airbnb', 'rentas', 30, '["jabones","shampoo","papel higiénico","café","azúcar","té"]'::jsonb, '🧴'),
  ('Inspección final pre-check-in', 'airbnb', 'rentas', 30, '["checklist","cámara"]'::jsonb, '✅'),
  ('Limpieza profunda baño Airbnb', 'airbnb', 'rentas', 45, '["limpiador baño","desinfectante","cepillo wc","guantes","esponjas"]'::jsonb, '🚿'),
  ('Limpieza profunda cocina Airbnb', 'airbnb', 'rentas', 60, '["desengrasante","esponjas","trapos","limpiavidrios","productos acero"]'::jsonb, '🍳'),
  -- Limpieza por habitación (coliving / PadSplit)
  ('Limpieza habitación individual', 'habitacion', 'rentas', 45, '["aspiradora","mopa","trapos","desinfectante","limpiavidrios"]'::jsonb, '🛌'),
  ('Limpieza áreas comunes', 'habitacion', 'rentas', 90, '["aspiradora","mopa","desinfectante","bolsas basura","trapos"]'::jsonb, '🛋️'),
  ('Limpieza baño compartido', 'habitacion', 'rentas', 30, '["desinfectante","limpiador baño","cepillo wc","trapos","guantes"]'::jsonb, '🚽'),
  ('Cambio entre inquilinos (move-out clean)', 'habitacion', 'rentas', 180, '["productos limpieza profunda","aspiradora","trapeador","esponjas","desengrasante","quitamanchas"]'::jsonb, '🔁'),
  -- Limpieza mensual long-term
  ('Limpieza mensual general', 'mensual', 'rentas', 180, '["aspiradora","mopa","desinfectante","limpiavidrios","trapos","escobas"]'::jsonb, '📅'),
  ('Limpieza profunda cocina mensual', 'mensual', 'rentas', 90, '["desengrasante","limpiador hornos","esponjas","trapos","productos acero"]'::jsonb, '🧑‍🍳'),
  ('Limpieza profunda baños mensual', 'mensual', 'rentas', 90, '["limpiador baño","desincrustante","desinfectante","cepillos","trapos"]'::jsonb, '🛁'),
  ('Limpieza patios y exteriores', 'mensual', 'rentas', 60, '["escoba","manguera","balde","productos exterior"]'::jsonb, '🌿'),
  -- Tareas generales
  ('Lavado de ropa de cama y toallas', 'lavanderia', 'rentas', 90, '["detergente","suavizante","máquina disponible"]'::jsonb, '🧺'),
  ('Aspirado profundo de alfombras', 'limpieza', 'both', 60, '["aspiradora industrial","champu alfombras","cepillo"]'::jsonb, '🧹'),
  ('Limpieza de electrodomésticos', 'limpieza', 'rentas', 60, '["desengrasante","productos acero","trapos microfibra"]'::jsonb, '🔌'),
  ('Limpiar refrigerador a fondo', 'limpieza', 'rentas', 45, '["bicarbonato","trapos","limpiador food-safe","bolsas basura"]'::jsonb, '❄️'),
  ('Limpiar horno y microondas', 'limpieza', 'rentas', 45, '["limpiador hornos","trapos","esponjas","guantes"]'::jsonb, '🔥'),
  ('Sacar basura', 'logistica', 'both', 30, '["bolsas industriales","guantes","truck o carrito"]'::jsonb, '🗑️'),
  ('Reposición de productos de limpieza', 'logistica', 'both', 30, '["lista compras","vehículo"]'::jsonb, '🛒'),
  ('Tiempo Almuerzo', 'descanso', 'both', 60, '[]'::jsonb, '🍽️'),
  ('Desplazamiento', 'logistica', 'both', 20, '[]'::jsonb, '🚗')
on conflict do nothing;

-- Sistemas visibles
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('cleaning-planner-rentas', 'rentas', 'cleaning-planner', 'Cronograma Limpieza', '🧽',
   'Equipo de limpieza — turnovers Airbnb, limpieza mensual, post-remodelación, por habitación. Mismo modelo que Juan Austin.',
   '{}'::jsonb, '{}'::jsonb, 1),
  ('cleaning-planner-remodel', 'remodelacion', 'cleaning-planner', 'Cronograma Limpieza', '🧽',
   'Equipo de limpieza — entrega final post-remodelación.',
   '{}'::jsonb, '{}'::jsonb, 3)
on conflict (id) do nothing;
