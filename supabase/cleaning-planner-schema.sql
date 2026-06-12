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

-- ────────────────────────────────────────────────────────────
-- CATÁLOGO MACRO — 4 servicios completos de limpieza
-- Cada uno incluye TODO el checklist en `notes` para que el equipo
-- sepa exactamente qué hacer sin tener que armar 10 tareas chicas.
-- ────────────────────────────────────────────────────────────
-- Si ya corriste la versión vieja del SQL con 27 tareas chicas, esto
-- las inactiva (no las borra para no romper FKs en clean_day_tasks
-- históricos). Las nuevas macro arrancan limpias.
update public.clean_tasks set active = false
  where name in (
    'Limpieza post-remodelación','Retirar polvo de construcción','Limpieza de ventanas post-obra',
    'Limpiar pisos pegados de pintura/yeso','Turnover completo Airbnb','Cambio de sábanas + lavado',
    'Reabastecer amenities (jabones, papel, café)','Inspección final pre-check-in',
    'Limpieza profunda baño Airbnb','Limpieza profunda cocina Airbnb','Limpieza habitación individual',
    'Limpieza áreas comunes','Limpieza baño compartido','Cambio entre inquilinos (move-out clean)',
    'Limpieza mensual general','Limpieza profunda cocina mensual','Limpieza profunda baños mensual',
    'Limpieza patios y exteriores','Lavado de ropa de cama y toallas','Aspirado profundo de alfombras',
    'Limpieza de electrodomésticos','Limpiar refrigerador a fondo','Limpiar horno y microondas'
  );

insert into public.clean_tasks (name, category, business, default_duration_min, default_materials, emoji, notes) values

  -- 1) POST-REMODELACIÓN
  ('🏗️ Limpieza Post-Remodelación (casa completa)',
   'post-obra', 'remodelacion', 360,
   '["aspiradora industrial con filtro HEPA","mopa industrial","baldes","escoba","escurridor","plumeros","trapos microfibra","limpiavidrios","desengrasante","quitapintura","espátula","productos especializados pisos","mascarillas","guantes","bolsas grandes industriales","escalera"]'::jsonb,
   '🏗️',
   'Entrega final post-obra. El objetivo es que la casa quede impecable para foto y entrega al cliente o inquilino.

CHECKLIST COMPLETO (5-7 horas, 2 personas recomendado):
1. Retirar TODO el polvo de construcción (techos → paredes → pisos). Aspiradora HEPA + plumeros.
2. Limpiar ventanas por dentro y por fuera (rascar pintura/silicona con espátula).
3. Limpiar marcos de puertas y ventanas.
4. Sacar pintura/yeso pegado en pisos con espátula y productos especializados.
5. Trapear profundo todos los pisos (puede requerir 2-3 pasadas).
6. Limpieza profunda de TODOS los baños (lavamanos, WC, ducha, espejos, grifería).
7. Limpieza profunda de cocina (gabinetes por dentro/fuera, electrodomésticos, encimeras).
8. Limpiar puertas y manijas.
9. Aspirar TODOS los rincones (cocheras, closets, debajo de muebles si hay).
10. Detallado final: enchufes, interruptores, lámparas, ventiladores.
11. Sacar TODA la basura y dejar la propiedad lista para entrega.

ENTREGA: foto de cada cuarto al supervisor para validar antes de cerrar.'),

  -- 2) LIMPIEZA PROFUNDA AIRBNB · CASA COMPLETA
  ('🏘️ Limpieza Profunda Airbnb · Casa completa',
   'airbnb', 'rentas', 210,
   '["sábanas limpias (todas las camas)","toallas limpias","amenities (jabones, shampoo, papel higiénico, café, té)","productos limpieza baño","desengrasante cocina","limpiavidrios","aspiradora","mopa","trapos microfibra","bolsas basura","detergente lavandería","esponjas","cepillos wc","guantes"]'::jsonb,
   '🏘️',
   'Turnover entre huéspedes — casa Airbnb completa. La casa debe quedar como nueva en máximo 3.5 horas.

CHECKLIST COMPLETO (~3-4 horas):
1. Cambio TOTAL de sábanas, fundas y toallas (todas las camas y baños).
2. Lavar ropa de cama y toallas usadas (dejar en marcha la lavadora).
3. Limpieza profunda de TODOS los baños:
   - WC, lavamanos, ducha/bañera, espejos, piso.
   - Desinfectar grifería, manijas, interruptores.
   - Reponer papel higiénico y amenities (shampoo, jabón).
4. Limpieza profunda de cocina:
   - Encimeras, lavaplatos, electrodomésticos (microondas, horno por fuera, refrigerador).
   - Limpiar gabinetes por fuera.
   - Sacar basura de cocina.
5. Aspirar y trapear TODA la casa (cuartos, sala, comedor, pasillos).
6. Quitar polvo de muebles, lámparas, ventiladores.
7. Reponer amenities (café, té, azúcar, papel cocina).
8. Sacar TODA la basura y poner bolsas nuevas.
9. Inspección final pre-check-in:
   - Foto de cada cuarto para evidencia.
   - Verificar que TV, AC, luces funcionan.
   - Dejar nota de bienvenida si aplica.

ENTREGA: 5-10 fotos al supervisor antes de cerrar.'),

  -- 3) LIMPIEZA PROFUNDA AIRBNB · HABITACIÓN
  ('🛌 Limpieza Profunda Airbnb · Habitación',
   'airbnb', 'rentas', 75,
   '["sábanas limpias","toallas limpias","amenities habitación","productos limpieza baño","aspiradora","mopa","trapos microfibra","limpiavidrios","detergente","bolsas basura","desinfectante"]'::jsonb,
   '🛌',
   'Turnover de UNA habitación Airbnb (coliving / PadSplit / habitación independiente).

CHECKLIST COMPLETO (~1-1.5 horas):
1. Cambio de sábanas, fundas y toallas de la habitación.
2. Lavar ropa de cama y toallas usadas.
3. Aspirar y trapear el piso de la habitación.
4. Quitar polvo de muebles, mesita de noche, escritorio.
5. Limpiar espejo y ventanas de la habitación.
6. Vaciar y limpiar caneca de basura.
7. Limpiar baño asignado (si es privado) o aportar a limpieza de baño compartido:
   - WC, lavamanos, ducha, espejo, piso.
   - Reponer papel higiénico y amenities.
8. Reposición de amenities en la habitación (agua, shampoo si aplica).
9. Inspección final:
   - Foto de la habitación y baño.
   - Verificar AC, luces, enchufes funcionan.
   - Cerrar puerta con código nuevo si aplica.

ENTREGA: 3-5 fotos al supervisor antes de cerrar.'),

  -- 4) LIMPIEZA MENSUAL MANTENIMIENTO (long-term rental)
  ('📅 Limpieza Mensual Mantenimiento (long-term)',
   'mensual', 'rentas', 180,
   '["aspiradora","mopa","trapos microfibra","desinfectante","limpiavidrios","desengrasante","limpiador baño","cepillos wc","escoba exterior","manguera","bolsas basura","guantes"]'::jsonb,
   '📅',
   'Mantenimiento mensual de casa rentada a inquilino long-term. Va con cita previa.
El objetivo es que la casa se mantenga en buen estado y detectar problemas temprano.

CHECKLIST COMPLETO (~3 horas):
1. Aspirar y trapear TODA la casa (cuartos, áreas comunes, pasillos).
2. Quitar polvo de muebles, repisas, lámparas, ventiladores de techo.
3. Limpiar ventanas (interior — exterior solo si el inquilino lo pide).
4. Limpieza de baños (todos):
   - WC, lavamanos, ducha, espejos, piso.
   - Desinfectar grifería y manijas.
5. Limpieza de cocina:
   - Encimeras y lavaplatos.
   - Limpiar por fuera electrodomésticos (microondas, horno, refri).
   - Limpiar gabinetes por fuera.
6. Limpiar puertas, manijas e interruptores.
7. Sacar basura general (todas las canecas).
8. Patio y exteriores (si aplica):
   - Barrer, regar plantas, recoger hojas.
9. INSPECCIÓN DE MANTENIMIENTO (reportar al supervisor):
   - Leaks de plomería, manchas en techos.
   - Filtros AC sucios, focos quemados.
   - Daños en pisos, paredes, puertas.
   - Cualquier deterioro que requiera repair.

ENTREGA: foto del estado general + reporte escrito de cualquier hallazgo
al supervisor el mismo día.'),

  -- Generales (siguen disponibles para casos sueltos)
  ('🗑️ Sacar basura', 'logistica', 'both', 30, '["bolsas industriales","guantes","truck o carrito"]'::jsonb, '🗑️',
   'Sacar basura de la casa al contenedor municipal o a la calle según día de recolección.'),
  ('🛒 Reposición de productos de limpieza', 'logistica', 'both', 30, '["lista compras","vehículo"]'::jsonb, '🛒',
   'Comprar/recoger productos faltantes para el stock del equipo.'),
  ('🍽️ Tiempo Almuerzo', 'descanso', 'both', 60, '[]'::jsonb, '🍽️',
   'Almuerzo del equipo durante jornada.'),
  ('🚗 Desplazamiento', 'logistica', 'both', 20, '[]'::jsonb, '🚗',
   'Traslado entre casas dentro de la zona.')
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
