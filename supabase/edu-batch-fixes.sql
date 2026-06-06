-- ════════════════════════════════════════════════════════════
-- 📦 Educación · Batch de fixes opcionales
-- Agrega columnas opcionales sin romper si ya existen.
-- Idempotente (correr varias veces es seguro).
-- ════════════════════════════════════════════════════════════

-- ⭐ Calificación de sesión (1-5 estrellas) en edu_student_calls
alter table public.edu_student_calls
  add column if not exists rating int check (rating between 1 and 5),
  add column if not exists rating_comment text;

-- 🎓 Tracking de certificados emitidos (opcional)
create table if not exists public.edu_certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.edu_students(id) on delete cascade,
  mentorship_id uuid references public.edu_mentorships(id),
  certificate_type text default 'finalizacion',
  issued_at timestamptz default now(),
  pct_completion int,
  issued_by uuid references auth.users(id),
  notes text
);

alter table public.edu_certificates enable row level security;
do $$ begin
  create policy "edu_certificates_select_all" on public.edu_certificates for select using (true);
  create policy "edu_certificates_insert_authed" on public.edu_certificates for insert with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- Refrescar el schema cache de PostgREST
notify pgrst, 'reload schema';
