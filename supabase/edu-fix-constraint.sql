-- ============================================================
-- FIX: el índice parcial no servía como ON CONFLICT target.
-- Reemplazar por UNIQUE CONSTRAINT regular.
-- ============================================================

-- 1) Drop el índice viejo (parcial, no funciona con upsert)
drop index if exists public.edu_students_airtable_uk;

-- 2) Limpiar duplicados existentes si los hay (mantener el más reciente)
delete from public.edu_students a
using public.edu_students b
where a.id < b.id
  and a.mentorship_id = b.mentorship_id
  and a.airtable_record_id = b.airtable_record_id
  and a.airtable_record_id is not null;

-- 3) Crear UNIQUE CONSTRAINT real (no partial — solo permite NULL para records manuales)
alter table public.edu_students
  drop constraint if exists edu_students_mentorship_airtable_uk;
alter table public.edu_students
  add constraint edu_students_mentorship_airtable_uk
  unique (mentorship_id, airtable_record_id);

-- Ahora el upsert con onConflict: "mentorship_id,airtable_record_id" funciona.
