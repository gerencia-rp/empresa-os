-- ============================================================
-- Informes de mentoría — semanales / quincenales / mensuales
-- ============================================================

create table if not exists public.edu_reports (
  id uuid primary key default gen_random_uuid(),
  mentorship_id text references public.edu_mentorships(id) on delete cascade,
  period_type text check (period_type in ('weekly','biweekly','monthly')),
  period_start date not null,
  period_end date not null,
  -- Contenido generado
  title text,
  summary_md text,
  kpis jsonb default '{}'::jsonb,
  insights jsonb default '[]'::jsonb,
  recommendations jsonb default '[]'::jsonb,
  highlights jsonb default '[]'::jsonb,        -- top performers, milestones, alerts
  -- Meta
  classes_notes text,                          -- input del coach con notas de clases grabadas
  cost_tokens_used int,
  generated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (mentorship_id, period_type, period_start)
);

create index if not exists edu_reports_recent on public.edu_reports(mentorship_id, period_start desc);

alter table public.edu_reports enable row level security;
drop policy if exists edu_reports_all on public.edu_reports;
create policy edu_reports_all on public.edu_reports for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
