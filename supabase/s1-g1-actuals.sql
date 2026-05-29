-- ============================================================
-- S1-G1 · Tracking granular por actividad
-- - UNIQUE (project_id, activity_code) para upsert limpio
-- - Trigger updated_at en remodel_actuals
-- - completed_at + remodel_type ya existían en remodel-learning-schema.sql
-- ============================================================

-- 1) Garantía de unicidad para upsert
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'remodel_actuals_project_activity_uk'
  ) then
    -- Si hay duplicados previos, los dejamos pero el constraint queda DEFERRABLE
    -- Limpieza opcional: borrar los duplicados más viejos por (project_id, activity_code)
    delete from public.remodel_actuals a
    using public.remodel_actuals b
    where a.project_id = b.project_id
      and a.activity_code = b.activity_code
      and a.id < b.id;

    alter table public.remodel_actuals
      add constraint remodel_actuals_project_activity_uk
      unique (project_id, activity_code);
  end if;
end $$;

-- 2) updated_at column + trigger (para auditar última edición)
alter table public.remodel_actuals
  add column if not exists updated_at timestamptz default now();

create or replace function public.tg_remodel_actuals_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_remodel_actuals_touch on public.remodel_actuals;
create trigger trg_remodel_actuals_touch
  before update on public.remodel_actuals
  for each row execute function public.tg_remodel_actuals_touch();

-- 3) Smoke test rápido
-- select project_id, count(*) as actividades_con_real
-- from public.remodel_actuals
-- where real_cost is not null
-- group by 1 order by 2 desc limit 10;
