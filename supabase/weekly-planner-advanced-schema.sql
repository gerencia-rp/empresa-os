-- Weekly Planner avanzado: backlog + plantillas + recurrentes + checklist/materiales
-- Reusa optimizaciones probadas del ops-planner (Juan Austin) adaptadas a obra.

-- ════════════════════════════════════════════════════════════
-- 1) ALTER weekly_activities: campos para backlog, checklist, materiales
-- ════════════════════════════════════════════════════════════
alter table public.weekly_activities
  alter column date drop not null,                         -- date=null → backlog
  add column if not exists checklist jsonb default '[]'::jsonb,
  add column if not exists materials jsonb default '[]'::jsonb,
  add column if not exists notes text,
  add column if not exists priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  add column if not exists assignee text,
  add column if not exists template_task_id uuid,         -- si vino de una plantilla de tarea
  add column if not exists recurring_id uuid,             -- si vino de una recurrente
  add column if not exists day_template_id uuid;          -- si vino de una plantilla de día

create index if not exists weekly_activities_backlog on public.weekly_activities(date) where date is null;
create index if not exists weekly_activities_priority on public.weekly_activities(priority);

-- ════════════════════════════════════════════════════════════
-- 2) Plantillas de tareas reutilizables (catálogo de actividades obra)
-- ════════════════════════════════════════════════════════════
create table if not exists public.wp_task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,                                          -- demolicion, framing, drywall, pintura, plumbing, electrico, etc.
  default_duration_days int default 1,
  default_checklist jsonb default '[]'::jsonb,            -- ["Verificar permisos","Preparar materiales",...]
  default_materials jsonb default '[]'::jsonb,            -- [{nombre, cantidad, unidad}]
  emoji text default '🔨',
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists wp_tasks_category on public.wp_task_templates(category, active);

-- ════════════════════════════════════════════════════════════
-- 3) Plantillas de día (guardar un día tipo y aplicarlo a otra fecha)
-- ════════════════════════════════════════════════════════════
create table if not exists public.wp_day_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,                                     -- "Día tipo Drywall completo", "Día inspección"
  description text,
  tasks jsonb not null default '[]'::jsonb,               -- [{activity_name, stage, duration_days, checklist, materials, ...}]
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
-- 4) Actividades recurrentes (limpieza diaria, inspección semanal)
-- ════════════════════════════════════════════════════════════
create table if not exists public.wp_recurring (
  id uuid primary key default gen_random_uuid(),
  base_task_id uuid references public.wp_task_templates(id) on delete cascade,
  project_id uuid references public.remodel_projects(id) on delete cascade,
  property_name text,
  custom_name text,
  stage text,
  duration_days int default 1,
  interval_days int not null default 7,
  weekday int,                                            -- 0-6 si quiere día específico (0=domingo)
  last_generated date,
  next_due date not null,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists wp_recurring_next on public.wp_recurring(next_due) where active = true;

-- ════════════════════════════════════════════════════════════
-- 5) RLS
-- ════════════════════════════════════════════════════════════
alter table public.wp_task_templates enable row level security;
alter table public.wp_day_templates enable row level security;
alter table public.wp_recurring enable row level security;

drop policy if exists wtt_select on public.wp_task_templates;
create policy wtt_select on public.wp_task_templates for select using (auth.role() = 'authenticated');
drop policy if exists wtt_write on public.wp_task_templates;
create policy wtt_write on public.wp_task_templates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists wdt_select on public.wp_day_templates;
create policy wdt_select on public.wp_day_templates for select using (auth.role() = 'authenticated');
drop policy if exists wdt_write on public.wp_day_templates;
create policy wdt_write on public.wp_day_templates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists wr_select on public.wp_recurring;
create policy wr_select on public.wp_recurring for select using (auth.role() = 'authenticated');
drop policy if exists wr_write on public.wp_recurring;
create policy wr_write on public.wp_recurring for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ════════════════════════════════════════════════════════════
-- 6) Seed: plantillas de tareas comunes de obra
-- ════════════════════════════════════════════════════════════
insert into public.wp_task_templates (name, category, default_duration_days, default_checklist, default_materials, emoji) values
  ('Demolición de pisos', 'demolicion', 3,
    '["Cubrir muebles y áreas vecinas","Asegurar suministro eléctrico apagado","Retirar y embolsar escombros","Limpieza al cierre"]'::jsonb,
    '[{"nombre":"Martillo eléctrico","cantidad":1,"unidad":"unidad"},{"nombre":"Bolsas industriales","cantidad":20,"unidad":"unidad"}]'::jsonb,
    '🔨'),
  ('Demolición de drywall', 'demolicion', 2,
    '["Identificar y proteger cables eléctricos","Retirar drywall en secciones","Recoger residuos","Inspección de estructura"]'::jsonb,
    '[{"nombre":"Cuchilla utility","cantidad":2,"unidad":"unidad"},{"nombre":"Guantes","cantidad":4,"unidad":"par"}]'::jsonb,
    '🔨'),
  ('Enmarcado de muros (framing)', 'estructura', 5,
    '["Verificar plano estructural","Marcar layout en piso","Cortar y armar paneles","Inspección estructural"]'::jsonb,
    '[{"nombre":"Madera 2x4","cantidad":50,"unidad":"unidad"},{"nombre":"Clavos","cantidad":5,"unidad":"libra"}]'::jsonb,
    '🪵'),
  ('Plomería rough-in', 'plomeria', 4,
    '["Plano de plomería aprobado","Instalar tubería PEX","Pruebas de presión","Inspección municipal"]'::jsonb,
    '[{"nombre":"Tubería PEX 1/2","cantidad":100,"unidad":"ft"},{"nombre":"Conectores","cantidad":30,"unidad":"unidad"}]'::jsonb,
    '🚰'),
  ('Electricidad rough-in', 'electrico', 5,
    '["Plano eléctrico aprobado","Tirar cable Romex 12/2","Instalar cajas y boxes","Inspección eléctrica"]'::jsonb,
    '[{"nombre":"Cable Romex 12/2","cantidad":250,"unidad":"ft"},{"nombre":"Cajas eléctricas","cantidad":25,"unidad":"unidad"}]'::jsonb,
    '⚡'),
  ('Aislamiento (Insulation)', 'aislamiento', 2,
    '["Verificar muros listos","Instalar batt R-13","Cubrir penetraciones","Inspección"]'::jsonb,
    '[{"nombre":"Aislamiento R-13","cantidad":40,"unidad":"unidad"}]'::jsonb,
    '🧱'),
  ('Instalación drywall', 'drywall', 4,
    '["Cargar paneles","Instalar y atornillar","Embarrar juntas","Lijar y dejar listo"]'::jsonb,
    '[{"nombre":"Drywall 1/2 4x8","cantidad":50,"unidad":"hoja"},{"nombre":"Tornillos","cantidad":10,"unidad":"libra"},{"nombre":"Joint compound","cantidad":5,"unidad":"galón"}]'::jsonb,
    '🧱'),
  ('Pintura interior', 'pintura', 3,
    '["Cubrir pisos y muebles","Prime","2 manos de pintura","Cleanup"]'::jsonb,
    '[{"nombre":"Pintura blanco","cantidad":10,"unidad":"galón"},{"nombre":"Rodillos","cantidad":5,"unidad":"unidad"},{"nombre":"Brochas","cantidad":3,"unidad":"unidad"}]'::jsonb,
    '🎨'),
  ('Instalación de pisos LVP', 'pisos', 3,
    '["Verificar nivel del piso","Instalar underlayment","Instalar LVP","Trim y baseboards"]'::jsonb,
    '[{"nombre":"LVP","cantidad":1200,"unidad":"sqft"},{"nombre":"Underlayment","cantidad":1200,"unidad":"sqft"}]'::jsonb,
    '🪟'),
  ('Cocina: cabinets + countertops', 'cocina', 5,
    '["Medir y nivelar","Instalar uppers","Instalar lowers","Plantilla countertops","Instalar countertops"]'::jsonb,
    '[{"nombre":"Cabinets set","cantidad":1,"unidad":"juego"},{"nombre":"Countertop cuarzo","cantidad":30,"unidad":"sqft"}]'::jsonb,
    '🍳'),
  ('Baño completo', 'bano', 5,
    '["Plomería rough-in","Vanity y mirror","Tile shower/floor","Toilet y fixtures","Cleanup"]'::jsonb,
    '[{"nombre":"Tile","cantidad":80,"unidad":"sqft"},{"nombre":"Vanity","cantidad":1,"unidad":"unidad"},{"nombre":"Toilet","cantidad":1,"unidad":"unidad"}]'::jsonb,
    '🚿'),
  ('Limpieza diaria de obra', 'limpieza', 1,
    '["Recoger basura y escombros","Barrer áreas de trabajo","Organizar materiales","Reportar daños o issues"]'::jsonb,
    '[{"nombre":"Bolsas basura","cantidad":10,"unidad":"unidad"},{"nombre":"Escoba","cantidad":2,"unidad":"unidad"}]'::jsonb,
    '🧹'),
  ('Inspección municipal', 'inspeccion', 1,
    '["Confirmar cita con inspector","Tener planos y permisos a mano","Walkthrough con inspector","Anotar correcciones"]'::jsonb,
    '[]'::jsonb,
    '📋'),
  ('Walkthrough final / Punch list', 'cierre', 1,
    '["Walkthrough con cliente o agente","Anotar todos los items pendientes","Asignar responsables","Setear fechas de cierre"]'::jsonb,
    '[]'::jsonb,
    '✅'),
  ('Limpieza final pre-entrega', 'limpieza', 2,
    '["Deep clean pisos","Limpiar ventanas","Limpiar gabinetes y baños","Walkthrough final"]'::jsonb,
    '[]'::jsonb,
    '✨')
on conflict do nothing;
