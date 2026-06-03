-- Agregar columnas para data del TBL Seguimiento (Airtable)
-- Cada estudiante tiene: capital actual, si se construye empresa, observaciones,
-- última fecha de seguimiento, grupo (Mentoria Flipping Rentals / Privada / Inversores)

alter table public.edu_students
  add column if not exists grupo text,                                  -- "Mentoria Flipping Rentals", "Mentoría Privada", "Inversores"
  add column if not exists ultima_fecha_seguimiento date,               -- "Última fecha de..."
  add column if not exists observaciones_seguimiento text,              -- "Observaciones..." principal
  add column if not exists capital_actual numeric(14,2),                -- "Capital actual" $80,000.00
  add column if not exists se_construye_empresa text,                   -- "Se construye..." Sí/No/En construcción
  add column if not exists observaciones_empresa text,                  -- "Observaciones..." secundaria (sobre empresa)
  add column if not exists evidencia_url text,                          -- "Evidencia" link/url
  add column if not exists airtable_record_id_seguimiento text;         -- record id en TBL Seguimiento

create index if not exists edu_students_grupo_idx on public.edu_students(grupo);
create index if not exists edu_students_ultima_seguimiento_idx on public.edu_students(ultima_fecha_seguimiento desc);

-- También actualizar config de la mentoría para apuntar a TBL Seguimiento
update public.edu_mentorships
set
  airtable_base_id = 'appFNKrtV0mMk960t',
  airtable_students_table = 'tbl07CsLovRpyMWmZ'   -- TBL Seguimiento (CRM principal)
where id = 'flipping-rentals';

select id, name, airtable_base_id, airtable_students_table
from public.edu_mentorships
where id = 'flipping-rentals';
