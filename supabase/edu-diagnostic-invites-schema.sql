-- ════════════════════════════════════════════════════════════
-- 📨 edu_diagnostic_invites — invitaciones al diagnóstico FlipMentoría
-- El mentor genera un link único para que el estudiante complete el wizard.
-- Cuando termina, se crea su plan automáticamente.
-- Idempotente.
-- ════════════════════════════════════════════════════════════

-- NOTA: edu_mentorships.id puede ser text o uuid según la versión del schema.
-- Para máxima compatibilidad, mentorship_id es text (acepta cualquier formato).
-- student_id es uuid (asumimos edu_students.id sí es uuid).
-- Sin foreign keys explícitas para evitar mismatch de tipos.
create table if not exists public.edu_diagnostic_invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,                  -- aleatorio, va en el URL
  student_id uuid,                              -- ref informal a edu_students.id
  mentorship_id text,                           -- ref informal a edu_mentorships.id (puede ser text o uuid)
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days'),
  completed_at timestamptz,
  result_plan_id uuid,                          -- ref informal a edu_student_plans.id
  -- snapshot del diagnóstico que llenó el estudiante (jsonb)
  answers jsonb,
  -- snapshot del perfil resultante para reabrir resultados
  perfil jsonb
);

create index if not exists edu_diagnostic_invites_token_idx on public.edu_diagnostic_invites(token);
create index if not exists edu_diagnostic_invites_student_idx on public.edu_diagnostic_invites(student_id);

alter table public.edu_diagnostic_invites enable row level security;

-- Cualquiera con el token puede LEER (necesario para el flujo público)
do $$ begin
  drop policy if exists "edu_diag_inv_select_all" on public.edu_diagnostic_invites;
  drop policy if exists "edu_diag_inv_insert_authed" on public.edu_diagnostic_invites;
  drop policy if exists "edu_diag_inv_update_all" on public.edu_diagnostic_invites;
  drop policy if exists "edu_diag_inv_delete_authed" on public.edu_diagnostic_invites;
end $$;

create policy "edu_diag_inv_select_all" on public.edu_diagnostic_invites
  for select using (true);

-- Solo el mentor autenticado crea invitaciones
create policy "edu_diag_inv_insert_authed" on public.edu_diagnostic_invites
  for insert with check (auth.uid() is not null);

-- UPDATE público (el estudiante actualiza con su respuesta, sin login)
create policy "edu_diag_inv_update_all" on public.edu_diagnostic_invites
  for update using (true) with check (true);

create policy "edu_diag_inv_delete_authed" on public.edu_diagnostic_invites
  for delete using (auth.uid() is not null);

notify pgrst, 'reload schema';
