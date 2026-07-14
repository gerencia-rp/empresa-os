-- 📆 Historial de corrimientos de obra (Planner Semanal · "Reprogramar obra")
-- Guarda cada corrimiento masivo del calendario de una obra para poder DESHACER
-- con un clic (corrimiento inverso). Aditiva, RLS por área remodelacion.

create table if not exists remodel_reschedules (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,            -- uuid de remodel_projects o 'name:<casa>' (obras sin proyecto linkeado)
  project_name text,
  shift_wd int not null,               -- días hábiles aplicados (Lun–Sáb; + adelante / − atrás)
  prev_start date,                     -- start_date anterior del proyecto (para restaurar)
  new_start date,
  rebase boolean not null default true, -- true = re-plan (baseline movida) / false = atraso (baseline intacta)
  acts_count int,                      -- actividades desplazadas
  created_by text,
  created_at timestamptz not null default now(),
  undone_at timestamptz                -- seteado cuando se deshace
);

create index if not exists idx_remodel_reschedules_project on remodel_reschedules(project_id, created_at desc);

alter table remodel_reschedules enable row level security;

drop policy if exists remodel_reschedules_rw on remodel_reschedules;
create policy remodel_reschedules_rw on remodel_reschedules
  for all to authenticated
  using (has_area('remodelacion'))
  with check (has_area('remodelacion'));
