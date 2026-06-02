-- ============================================================
-- EDUCACIÓN — Workspace para 3 mentorías
--   1. Flipping Rentals (Fix & Flip mentorship)
--   2. Rental Profits (Rental + Subrent mentorship)
--   3. Wholesale Program
--
-- Cada mentoría tiene: estudiantes, etapas, recursos, alertas, progreso.
-- ============================================================

-- ─── Área "education" en el sidebar ───
insert into public.areas (id, name, icon, description, position) values
  ('education', 'Educación', '🎓',
   'Mentorías Flipping Rentals · Rental Profits · Wholesale. Seguimiento estudiantes, etapas, alertas.',
   50)
on conflict (id) do update set name = excluded.name, icon = excluded.icon, description = excluded.description;

-- ─── 1. Tabla de mentorías ───
create table if not exists public.edu_mentorships (
  id text primary key,             -- 'flipping-rentals' | 'rental-profits' | 'wholesale'
  name text not null,
  icon text default '🎓',
  description text,
  -- Airtable config — el coach pega base + table + API key (encrypted en backend después)
  airtable_base_id text,
  airtable_students_table text,
  airtable_api_key_ref text,       -- referencia a secret en Supabase Vault (no hardcoded)
  -- GLScore weights por mentoría (% ponderado)
  glscore_weights jsonb default '{"stage_progress":40,"recent_activity":30,"task_completion":20,"calls_attended":10}'::jsonb,
  -- Etapas del programa (orden + nombre)
  -- ej. para Flipping Rentals: [Onboarding, Buybox, Market Research, Underwriting, First Deal, ...]
  stages jsonb default '[]'::jsonb,
  active bool default true,
  position int default 0,
  created_at timestamptz default now()
);

insert into public.edu_mentorships (id, name, icon, description, position, stages) values
  ('flipping-rentals', 'Flipping Rentals', '🏚️',
   'Mentoría Fix & Flip: enseña a comprar, remodelar y vender propiedades.',
   0,
   '[
     {"key":"onboarding","name":"Onboarding","target_weeks":1},
     {"key":"buybox","name":"Creación de Buybox","target_weeks":2},
     {"key":"market_research","name":"Investigación de Mercado","target_weeks":2},
     {"key":"underwriting","name":"Underwriting & Análisis","target_weeks":2},
     {"key":"funding","name":"Estructura de Funding","target_weeks":1},
     {"key":"first_offer","name":"Primera Oferta","target_weeks":2},
     {"key":"first_deal","name":"Primer Deal","target_weeks":4},
     {"key":"renovation","name":"Renovación",  "target_weeks":12},
     {"key":"exit","name":"Salida (Sell/Refi)","target_weeks":4},
     {"key":"graduate","name":"Graduado","target_weeks":0}
   ]'::jsonb),
  ('rental-profits', 'Rental Profits', '🏠',
   'Mentoría Rentas + Subrentas: cómo armar portfolio de renta tradicional + Airbnb/mid-term.',
   1,
   '[
     {"key":"onboarding","name":"Onboarding","target_weeks":1},
     {"key":"buybox","name":"Creación de Buybox","target_weeks":2},
     {"key":"market_research","name":"Investigación de Mercado","target_weeks":2},
     {"key":"rental_strategy","name":"Estrategia (LT/MT/STR)","target_weeks":1},
     {"key":"financing","name":"Financiamiento DSCR","target_weeks":2},
     {"key":"first_property","name":"Primera Propiedad","target_weeks":4},
     {"key":"setup","name":"Setup & Listing","target_weeks":3},
     {"key":"operations","name":"Operación Sostenida","target_weeks":8},
     {"key":"scale","name":"Escalamiento (2da+)","target_weeks":12},
     {"key":"graduate","name":"Graduado","target_weeks":0}
   ]'::jsonb),
  ('wholesale', 'Wholesale Program', '📋',
   'Programa de Wholesale: cómo cerrar contratos para vender a inversores sin comprar.',
   2,
   '[
     {"key":"onboarding","name":"Onboarding","target_weeks":1},
     {"key":"buyers_list","name":"Lista de Buyers","target_weeks":2},
     {"key":"marketing","name":"Marketing Outbound","target_weeks":2},
     {"key":"lead_pipeline","name":"Pipeline de Leads","target_weeks":3},
     {"key":"first_contract","name":"Primer Contrato","target_weeks":4},
     {"key":"first_assignment","name":"Primera Asignación","target_weeks":4},
     {"key":"systems","name":"Sistematización","target_weeks":6},
     {"key":"graduate","name":"Graduado","target_weeks":0}
   ]'::jsonb)
on conflict (id) do nothing;

-- ─── 2. Estudiantes (sync desde Airtable + tracking local) ───
create table if not exists public.edu_students (
  id uuid primary key default gen_random_uuid(),
  mentorship_id text references public.edu_mentorships(id) on delete cascade,
  airtable_record_id text,         -- ID del record en Airtable para idempotent sync
  -- Datos básicos
  full_name text not null,
  email text,
  phone text,
  city text,
  state text,
  country text,
  -- Programa
  enrolled_at date,
  expires_at date,                 -- fecha de vencimiento de la mentoría
  payment_status text default 'active' check (payment_status in ('active','past_due','expired','cancelled','paused')),
  next_payment_date date,
  -- Etapa actual
  current_stage text,              -- key de stages[].key
  stage_started_at date,
  -- Progreso
  glscore int default 50 check (glscore >= 0 and glscore <= 100),
  last_activity_at timestamptz,    -- última actividad detectada (call, task, etc.)
  -- Notas + diagnóstico
  notes text,
  goals text,
  -- Meta
  status text default 'active' check (status in ('active','at_risk','paused','graduated','dropped')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists edu_students_mentorship on public.edu_students(mentorship_id);
create index if not exists edu_students_status on public.edu_students(status);
create index if not exists edu_students_expires on public.edu_students(expires_at);
create unique index if not exists edu_students_airtable_uk on public.edu_students(mentorship_id, airtable_record_id) where airtable_record_id is not null;

-- ─── 3. Tareas asignadas por etapa (plan de trabajo) ───
create table if not exists public.edu_student_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.edu_students(id) on delete cascade,
  stage_key text,
  title text not null,
  description text,
  resources jsonb default '[]'::jsonb,  -- [{type:'video|doc|slide|link', url, title}]
  generated_by text default 'manual' check (generated_by in ('manual','ai','template')),
  status text default 'pending' check (status in ('pending','in_progress','done','skipped')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists edu_tasks_student on public.edu_student_tasks(student_id);
create index if not exists edu_tasks_status on public.edu_student_tasks(status);

-- ─── 4. Llamadas / sesiones del estudiante ───
create table if not exists public.edu_student_calls (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.edu_students(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_min int default 60,
  type text default 'mentoring' check (type in ('mentoring','onboarding','followup','exit','group')),
  attended bool,
  notes_md text,
  recording_url text,
  google_calendar_event_id text,    -- para integrar Calendar
  created_at timestamptz default now()
);

create index if not exists edu_calls_student on public.edu_student_calls(student_id);
create index if not exists edu_calls_date on public.edu_student_calls(scheduled_at desc);

-- ─── 5. Repositorio de recursos (slides, docs, videos) ───
create table if not exists public.edu_resources (
  id uuid primary key default gen_random_uuid(),
  mentorship_id text references public.edu_mentorships(id) on delete cascade,
  stage_key text,                  -- null = aplica a todas las etapas
  type text default 'slide' check (type in ('slide','doc','video','link','template','checklist')),
  title text not null,
  description text,
  url text,                        -- link a Drive/Notion/YouTube/etc.
  storage_path text,               -- o path en Supabase Storage si subiste el archivo
  tags text[] default '{}',
  view_count int default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists edu_resources_mentorship on public.edu_resources(mentorship_id);
create index if not exists edu_resources_stage on public.edu_resources(stage_key);

-- ─── 6. Alertas auto-generadas (vencimientos, progreso lento, etc.) ───
create table if not exists public.edu_alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.edu_students(id) on delete cascade,
  alert_type text not null,        -- 'expiring_soon' | 'payment_overdue' | 'slow_progress' | 'inactive' | 'stage_overdue'
  severity text default 'normal' check (severity in ('low','normal','high','critical')),
  message text not null,
  detail text,
  triggered_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

create index if not exists edu_alerts_student on public.edu_alerts(student_id);
create index if not exists edu_alerts_open on public.edu_alerts(resolved_at) where resolved_at is null;

-- ─── 7. Snapshot histórico del GLScore (para tendencia) ───
create table if not exists public.edu_glscore_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.edu_students(id) on delete cascade,
  measurement_date date default current_date,
  glscore int,
  stage_key text,
  stage_progress_pct int,
  notes text,
  created_at timestamptz default now()
);

create index if not exists edu_glscore_student on public.edu_glscore_history(student_id, measurement_date desc);

-- ─── 8. RLS — autenticados pueden ver/editar todo ───
alter table public.edu_mentorships enable row level security;
alter table public.edu_students enable row level security;
alter table public.edu_student_tasks enable row level security;
alter table public.edu_student_calls enable row level security;
alter table public.edu_resources enable row level security;
alter table public.edu_alerts enable row level security;
alter table public.edu_glscore_history enable row level security;

do $$ begin
  drop policy if exists edu_mentorships_all on public.edu_mentorships;
  drop policy if exists edu_students_all on public.edu_students;
  drop policy if exists edu_tasks_all on public.edu_student_tasks;
  drop policy if exists edu_calls_all on public.edu_student_calls;
  drop policy if exists edu_resources_all on public.edu_resources;
  drop policy if exists edu_alerts_all on public.edu_alerts;
  drop policy if exists edu_glscore_all on public.edu_glscore_history;
end $$;

create policy edu_mentorships_all on public.edu_mentorships for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy edu_students_all on public.edu_students for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy edu_tasks_all on public.edu_student_tasks for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy edu_calls_all on public.edu_student_calls for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy edu_resources_all on public.edu_resources for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy edu_alerts_all on public.edu_alerts for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy edu_glscore_all on public.edu_glscore_history for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- ─── 9. Registrar el sistema "edu-manager" en el área education ───
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('edu-manager', 'education', 'edu-manager', 'Mentorías Manager', '🎓',
   'Gestor unificado de las 3 mentorías: estudiantes, etapas, plan IA, recursos, alertas, calendario.',
   '{}'::jsonb, '{}'::jsonb, 0)
on conflict (id) do update set name = excluded.name, description = excluded.description;
