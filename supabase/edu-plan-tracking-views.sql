-- ════════════════════════════════════════════════════════════
-- 📋 Seguimiento de planes de estudio — vistas para informe CEO
-- Conecta los planes generados desde el Diagnóstico (FlipMentoría)
-- con el dashboard ejecutivo. Permite ver:
--   · % avance por estudiante
--   · Distribución de avance (estancados/avanzando/finalizando)
--   · Bloques que más tranquean
--   · Velocity semanal de tareas completadas
--   · Estudiantes en riesgo (plan sin updates > 14d)
-- ════════════════════════════════════════════════════════════

-- ─── 1. Plan por estudiante con avance detallado ───
create or replace view public.edu_plan_por_estudiante as
select
  p.id as plan_id,
  p.student_id,
  s.full_name,
  s.email,
  s.current_stage,
  s.grupo,
  s.mentorship_id,
  p.perfil->'perfil'->>'nombre' as perfil_nombre,
  p.perfil->'perfil'->>'num' as perfil_num,
  p.created_at as plan_created_at,
  p.updated_at as plan_updated_at,
  count(t.id) as tareas_total,
  count(t.id) filter (where t.completed) as tareas_completadas,
  count(t.id) filter (where not t.completed) as tareas_pendientes,
  round(100.0 * count(t.id) filter (where t.completed) / nullif(count(t.id), 0), 1) as pct_avance,
  max(t.completed_at) as ultima_completion,
  extract(day from now() - max(t.completed_at))::int as dias_sin_actividad,
  extract(day from now() - p.created_at)::int as dias_desde_creacion
from public.edu_student_plans p
join public.edu_students s on s.id = p.student_id
left join public.edu_student_plan_tasks t on t.plan_id = p.id
where p.status = 'active'
group by p.id, p.student_id, s.full_name, s.email, s.current_stage, s.grupo, s.mentorship_id,
         p.perfil, p.created_at, p.updated_at;

-- ─── 2. Distribución de avance (cuántos en cada bucket) ───
create or replace view public.edu_plan_distribucion_avance as
with buckets as (
  select
    mentorship_id,
    case
      when pct_avance is null then 'sin_data'
      when pct_avance = 0     then 'sin_empezar'
      when pct_avance < 25    then 'lejos'
      when pct_avance < 50    then 'avanzando'
      when pct_avance < 75    then 'mitad'
      when pct_avance < 100   then 'finalizando'
      else 'completado'
    end as bucket,
    count(*) as estudiantes
  from public.edu_plan_por_estudiante
  group by mentorship_id, bucket
)
select * from buckets order by mentorship_id, bucket;

-- ─── 3. Bloques con menor completion (cuellos del plan) ───
create or replace view public.edu_plan_bloques_lentos as
select
  p.mentorship_id,
  t.bloque_id,
  t.bloque_etapa,
  t.bloque_subetapa,
  count(*) as tareas_total,
  count(*) filter (where t.completed) as completadas,
  round(100.0 * count(*) filter (where t.completed) / nullif(count(*), 0), 1) as pct_completado,
  count(distinct t.student_id) as estudiantes_afectados
from public.edu_student_plan_tasks t
join public.edu_student_plans p on p.id = t.plan_id
where p.status = 'active'
group by p.mentorship_id, t.bloque_id, t.bloque_etapa, t.bloque_subetapa
having count(*) >= 3                         -- mínimo 3 tareas para ser representativo
order by pct_completado asc, estudiantes_afectados desc;

-- ─── 4. Velocity: tareas completadas por semana (últimas 12 semanas) ───
create or replace view public.edu_plan_velocity_semanal as
select
  p.mentorship_id,
  date_trunc('week', t.completed_at)::date as semana,
  count(*) as tareas_completadas,
  count(distinct t.student_id) as estudiantes_activos
from public.edu_student_plan_tasks t
join public.edu_student_plans p on p.id = t.plan_id
where t.completed = true
  and t.completed_at >= now() - interval '12 weeks'
group by p.mentorship_id, semana
order by p.mentorship_id, semana;

-- ─── 5. Estudiantes en riesgo: plan sin updates > 14d ───
create or replace view public.edu_plan_estudiantes_en_riesgo as
select
  pe.*,
  case
    when pe.dias_sin_actividad is null and pe.dias_desde_creacion > 7 then 'sin_arrancar'
    when pe.dias_sin_actividad > 30 then 'critico'
    when pe.dias_sin_actividad > 14 then 'estancado'
    when pe.dias_sin_actividad > 7  then 'lento'
    else 'activo'
  end as riesgo
from public.edu_plan_por_estudiante pe
where pe.pct_avance < 100;

-- ─── 6. Resumen ejecutivo de planes por mentoría ───
create or replace view public.edu_plan_resumen_ejecutivo as
with calc as (
  select
    mentorship_id,
    count(*) as planes_activos,
    round(avg(pct_avance)::numeric, 1) as avance_promedio,
    count(*) filter (where pct_avance = 100) as completados,
    count(*) filter (where pct_avance < 25) as lejos,
    count(*) filter (where dias_sin_actividad > 14 or dias_sin_actividad is null) as estancados,
    count(*) filter (where dias_sin_actividad <= 7) as activos_ultima_semana,
    avg(dias_desde_creacion)::int as antiguedad_promedio_dias,
    sum(tareas_completadas) as tareas_completadas_total,
    sum(tareas_pendientes) as tareas_pendientes_total
  from public.edu_plan_por_estudiante
  group by mentorship_id
),
estudiantes_count as (
  select mentorship_id, count(*) as total_estudiantes
  from public.edu_students
  where mentorship_id is not null
    and (status is null or status not in ('dropped','graduated'))
  group by mentorship_id
)
select
  c.*,
  e.total_estudiantes,
  round(100.0 * c.planes_activos / nullif(e.total_estudiantes, 0), 1) as pct_con_plan
from calc c
left join estudiantes_count e using (mentorship_id);

-- ─── 7. Top estudiantes por avance (líderes) ───
create or replace view public.edu_plan_top_estudiantes as
select * from public.edu_plan_por_estudiante
where pct_avance > 0
order by pct_avance desc, ultima_completion desc nulls last
limit 100;

-- ─── Grants ───
grant select on
  public.edu_plan_por_estudiante,
  public.edu_plan_distribucion_avance,
  public.edu_plan_bloques_lentos,
  public.edu_plan_velocity_semanal,
  public.edu_plan_estudiantes_en_riesgo,
  public.edu_plan_resumen_ejecutivo,
  public.edu_plan_top_estudiantes
to authenticated;
