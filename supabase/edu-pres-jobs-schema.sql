-- ============================================================
-- BACKGROUND JOBS para generate-presentation (evita timeout 150s)
-- ============================================================

create table if not exists public.edu_pres_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  mentorship_id text,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'error')),
  params jsonb not null,
  result jsonb,           -- la presentación generada (estructura completa)
  saved_pres_id uuid,     -- referencia a edu_presentations si se guardó
  error_message text,
  tokens_used int,
  web_searches int,
  duration_ms int,
  started_at timestamptz default now(),
  finished_at timestamptz
);

create index if not exists edu_pres_jobs_user_idx on public.edu_pres_jobs(user_id, started_at desc);
create index if not exists edu_pres_jobs_status_idx on public.edu_pres_jobs(status, started_at desc);

-- RLS: cada user ve sus propios jobs
alter table public.edu_pres_jobs enable row level security;

drop policy if exists "Users see own jobs" on public.edu_pres_jobs;
create policy "Users see own jobs" on public.edu_pres_jobs
  for select using (auth.uid() = user_id);

drop policy if exists "Service role full access" on public.edu_pres_jobs;
create policy "Service role full access" on public.edu_pres_jobs
  for all using (auth.role() = 'service_role');

select 'Tabla edu_pres_jobs creada' as status;
