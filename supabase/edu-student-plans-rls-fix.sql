-- ════════════════════════════════════════════════════════════
-- Fix RLS: edu_student_plans + edu_student_plan_tasks
-- Error: new row violates row-level security policy for table "edu_student_plans"
-- Causa: la tabla tiene RLS activo pero sin policy de INSERT para
--        usuarios autenticados. Cualquier insert desde el cliente falla.
-- Idempotente — se puede correr múltiples veces.
-- ════════════════════════════════════════════════════════════

-- Asegurar RLS activo (no rompe nada si ya estaba)
alter table public.edu_student_plans enable row level security;
alter table public.edu_student_plan_tasks enable row level security;

-- ─── edu_student_plans ───
do $$ begin
  drop policy if exists "edu_student_plans_select_all" on public.edu_student_plans;
  drop policy if exists "edu_student_plans_insert_authed" on public.edu_student_plans;
  drop policy if exists "edu_student_plans_update_authed" on public.edu_student_plans;
  drop policy if exists "edu_student_plans_delete_authed" on public.edu_student_plans;
end $$;

create policy "edu_student_plans_select_all" on public.edu_student_plans
  for select using (true);

create policy "edu_student_plans_insert_authed" on public.edu_student_plans
  for insert with check (auth.uid() is not null);

create policy "edu_student_plans_update_authed" on public.edu_student_plans
  for update using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "edu_student_plans_delete_authed" on public.edu_student_plans
  for delete using (auth.uid() is not null);

-- ─── edu_student_plan_tasks ───
do $$ begin
  drop policy if exists "edu_student_plan_tasks_select_all" on public.edu_student_plan_tasks;
  drop policy if exists "edu_student_plan_tasks_insert_authed" on public.edu_student_plan_tasks;
  drop policy if exists "edu_student_plan_tasks_update_authed" on public.edu_student_plan_tasks;
  drop policy if exists "edu_student_plan_tasks_delete_authed" on public.edu_student_plan_tasks;
end $$;

create policy "edu_student_plan_tasks_select_all" on public.edu_student_plan_tasks
  for select using (true);

create policy "edu_student_plan_tasks_insert_authed" on public.edu_student_plan_tasks
  for insert with check (auth.uid() is not null);

create policy "edu_student_plan_tasks_update_authed" on public.edu_student_plan_tasks
  for update using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "edu_student_plan_tasks_delete_authed" on public.edu_student_plan_tasks
  for delete using (auth.uid() is not null);

-- Refrescar el schema cache de PostgREST
notify pgrst, 'reload schema';
