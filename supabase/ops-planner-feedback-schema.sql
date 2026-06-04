-- Ops Planner: feedback de duración real + auto-ajuste del template
-- Captura tiempo real (started_at, completed_at, actual_duration_min) en ops_day_tasks
-- y mantiene un promedio rodante en ops_tasks.default_duration_min.

alter table public.ops_day_tasks
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists actual_duration_min int,
  add column if not exists duration_feedback text; -- 'short','ok','long' opcional

-- Soporte para historial de durations por plantilla (para ajustar default)
alter table public.ops_tasks
  add column if not exists samples_count int default 0,
  add column if not exists samples_total_min int default 0,
  add column if not exists last_actual_min int;

-- Función helper: agregar muestra de duración real y actualizar default rodante
-- default_new = round((samples_total + actual) / (samples_count + 1))
create or replace function public.fn_ops_register_actual(p_task_id uuid, p_actual int)
returns void language plpgsql as $$
declare
  c int; s int; new_default int;
begin
  if p_task_id is null or p_actual is null or p_actual <= 0 then return; end if;
  update public.ops_tasks set
    samples_count = coalesce(samples_count,0) + 1,
    samples_total_min = coalesce(samples_total_min,0) + p_actual,
    last_actual_min = p_actual
  where id = p_task_id
  returning samples_count, samples_total_min into c, s;
  if c is not null and c > 0 then
    new_default := greatest(5, round(s::numeric / c));
    update public.ops_tasks set default_duration_min = new_default where id = p_task_id;
  end if;
end$$;

grant execute on function public.fn_ops_register_actual(uuid,int) to authenticated;
