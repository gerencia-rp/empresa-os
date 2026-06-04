-- Diagnóstico de Crédito vinculado a estudiante
-- Wizard de ~16 preguntas → perfil (excelente/bueno/limitado/reconstruir/sin_historial)
-- + plan de acción concreto (90 días) almacenado como JSON.

create table if not exists public.edu_credit_diagnostics (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.edu_students(id) on delete cascade,
  mentorship_id text,
  answers jsonb not null default '{}'::jsonb,    -- {fico, antiguedad, tarjetas, utilization, derogatorios, ...}
  perfil jsonb,                                  -- { tier:'excelente|bueno|limitado|reconstruir|sin_historial', score:int, gaps:[], strengths:[] }
  plan jsonb,                                    -- { acciones: [{prioridad, area, accion, meta, plazo_dias}], objetivo_90d, calificacion_proyectada }
  fico_actual int,
  fico_meta int,                                 -- estimación FICO a 90-180 días si ejecuta plan
  status text default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists edu_credit_student_idx on public.edu_credit_diagnostics(student_id, status, created_at desc);

alter table public.edu_credit_diagnostics enable row level security;
drop policy if exists ecd_select on public.edu_credit_diagnostics;
create policy ecd_select on public.edu_credit_diagnostics for select using (auth.role() = 'authenticated');
drop policy if exists ecd_write on public.edu_credit_diagnostics;
create policy ecd_write on public.edu_credit_diagnostics for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Tasks del plan (igual que edu_student_plan_tasks pero para crédito)
create table if not exists public.edu_credit_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid references public.edu_credit_diagnostics(id) on delete cascade,
  student_id uuid references public.edu_students(id) on delete cascade,
  prioridad text check (prioridad in ('alta','media','baja')) default 'media',
  area text,                       -- 'utilization' | 'historial' | 'mix' | 'derogatorios' | 'ingresos' | 'docs'
  accion text not null,
  meta text,
  plazo_dias int,
  completed boolean default false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);
create index if not exists ecpt_student on public.edu_credit_plan_tasks(student_id, completed);
create index if not exists ecpt_diag on public.edu_credit_plan_tasks(diagnostic_id);

alter table public.edu_credit_plan_tasks enable row level security;
drop policy if exists ecpt_select on public.edu_credit_plan_tasks;
create policy ecpt_select on public.edu_credit_plan_tasks for select using (auth.role() = 'authenticated');
drop policy if exists ecpt_write on public.edu_credit_plan_tasks;
create policy ecpt_write on public.edu_credit_plan_tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
