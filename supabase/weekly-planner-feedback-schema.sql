-- Weekly Planner: optimizaciones tipo Juan + import cronograma
-- Persiste tareas vencidas (no se borran), captura tiempo real, soporta múltiples días

alter table public.weekly_activities
  add column if not exists activity_code text,           -- ej '1.1.1' del catálogo
  add column if not exists duration_days int default 1,  -- cuántos días dura la actividad
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists actual_days int,
  add column if not exists import_batch text;            -- id del Excel importado

create index if not exists weekly_activities_status on public.weekly_activities(status);
create index if not exists weekly_activities_code on public.weekly_activities(activity_code);
