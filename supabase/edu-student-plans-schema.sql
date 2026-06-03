-- ============================================================
-- Planes de acción por estudiante
-- Vincula el sistema Metodología FlipMentoría con Mentorías Manager
-- ============================================================

-- 1) Plan personalizado por estudiante (un solo plan activo por estudiante)
create table if not exists public.edu_student_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.edu_students(id) on delete cascade,
  mentorship_id text not null references public.edu_mentorships(id) on delete cascade,
  -- Datos del diagnóstico (respuestas al wizard)
  diagnostico jsonb not null default '{}'::jsonb,
  -- Resultado del wizard: perfil, etapa, cronograma, fortalezas, gaps
  perfil jsonb not null default '{}'::jsonb,
  -- IDs de bloques del plan (orden de ejecución)
  bloques_ids text[] not null default '{}',
  -- Modo de detalle (panorama / foco / medio / completo)
  modo text default 'completo',
  -- Notas del mentor
  notas_mentor text,
  -- Status del plan: draft / active / completed / archived
  status text not null default 'active' check (status in ('draft','active','completed','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);

create unique index if not exists edu_student_plans_student_active_idx
  on public.edu_student_plans(student_id)
  where status = 'active';

create index if not exists edu_student_plans_mentorship_idx
  on public.edu_student_plans(mentorship_id, status);

-- 2) Tareas marcables del plan (un row por cada paso de cada bloque)
create table if not exists public.edu_student_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.edu_student_plans(id) on delete cascade,
  student_id uuid not null references public.edu_students(id) on delete cascade,
  bloque_id text not null,            -- 'llc_setup', 'buybox_operativo', etc
  bloque_etapa text,                  -- 'E0', 'E1', etc
  bloque_subetapa text,               -- 'LLC y fundación legal', etc
  bloque_orden int not null default 0,
  paso_index int not null default 0,
  paso_text text not null,
  completed boolean default false,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  notas text,
  evidencia_url text,
  created_at timestamptz default now()
);

create index if not exists edu_student_plan_tasks_plan_idx
  on public.edu_student_plan_tasks(plan_id, bloque_orden, paso_index);
create index if not exists edu_student_plan_tasks_student_idx
  on public.edu_student_plan_tasks(student_id, completed);
create index if not exists edu_student_plan_tasks_bloque_idx
  on public.edu_student_plan_tasks(plan_id, bloque_id, completed);

-- 3) Vista de progreso por estudiante (% completado)
create or replace view public.v_edu_student_plan_progress as
select
  p.id as plan_id,
  p.student_id,
  p.mentorship_id,
  p.status,
  count(t.id) as total_tasks,
  count(t.id) filter (where t.completed) as completed_tasks,
  case
    when count(t.id) = 0 then 0
    else round(100.0 * count(t.id) filter (where t.completed) / count(t.id), 1)
  end as progress_pct,
  -- Bloque actual: primer bloque que tenga al menos 1 tarea no completada
  (
    select t2.bloque_subetapa
    from public.edu_student_plan_tasks t2
    where t2.plan_id = p.id and not t2.completed
    order by t2.bloque_orden, t2.paso_index
    limit 1
  ) as bloque_actual,
  -- Última tarea completada
  max(t.completed_at) as ultima_tarea_completada_at
from public.edu_student_plans p
left join public.edu_student_plan_tasks t on t.plan_id = p.id
group by p.id, p.student_id, p.mentorship_id, p.status;

-- RLS
alter table public.edu_student_plans enable row level security;
alter table public.edu_student_plan_tasks enable row level security;

drop policy if exists "Plans - autenticados leen" on public.edu_student_plans;
create policy "Plans - autenticados leen" on public.edu_student_plans
  for select using (auth.role() = 'authenticated');

drop policy if exists "Plans - admin/mentor escriben" on public.edu_student_plans;
create policy "Plans - admin/mentor escriben" on public.edu_student_plans
  for all using (
    auth.role() = 'service_role'
    or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mentor'))
  );

drop policy if exists "Tasks - autenticados leen" on public.edu_student_plan_tasks;
create policy "Tasks - autenticados leen" on public.edu_student_plan_tasks
  for select using (auth.role() = 'authenticated');

drop policy if exists "Tasks - admin/mentor escriben" on public.edu_student_plan_tasks;
create policy "Tasks - admin/mentor escriben" on public.edu_student_plan_tasks
  for all using (
    auth.role() = 'service_role'
    or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mentor'))
  );

select 'Schema edu_student_plans + edu_student_plan_tasks creado' as status;
