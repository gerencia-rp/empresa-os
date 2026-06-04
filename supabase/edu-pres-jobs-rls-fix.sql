-- Fix: el polling del frontend no encontraba el job porque la policy
-- filtraba por auth.uid() = user_id y a veces user_id era null o
-- auth.uid() no matcheaba con el sub del JWT. El job_id es UUID v4
-- (no enumerable) y solo lo tiene quien lo creó, así que es seguro
-- permitir SELECT a cualquier authenticated.

drop policy if exists "Users see own jobs" on public.edu_pres_jobs;
create policy "Authenticated see all jobs"
  on public.edu_pres_jobs for select
  using (auth.role() = 'authenticated');

-- Service role full access (sin cambios)
drop policy if exists "Service role full access" on public.edu_pres_jobs;
create policy "Service role full access" on public.edu_pres_jobs
  for all using (auth.role() = 'service_role');

-- Permitir también que el authenticated cree jobs (para casos edge donde
-- el frontend hace insert directo, ej. retry sin pasar por edge function)
drop policy if exists "Authenticated can insert jobs" on public.edu_pres_jobs;
create policy "Authenticated can insert jobs"
  on public.edu_pres_jobs for insert
  with check (auth.role() = 'authenticated');
