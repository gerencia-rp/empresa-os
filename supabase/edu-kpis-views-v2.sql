-- KPIs Postventa v2 — Vistas para informe ejecutivo profundo (5 secciones)
-- Complementa edu-kpis-views.sql (correr ese primero).

-- ════════════════════════════════════════════════════════════
-- Sección 1: INVENTARIO DE CARTERA
-- ════════════════════════════════════════════════════════════

-- Por status (cuántos activos, dropped, pausados, etc.)
create or replace view public.edu_kpi_cartera_por_status as
select
  mentorship_id,
  count(*) filter (where status = 'active' or status is null) as activos,
  count(*) filter (where status = 'at_risk') as en_riesgo,
  count(*) filter (where status = 'paused') as pausados,
  count(*) filter (where status = 'graduated') as graduados,
  count(*) filter (where status = 'dropped' or churned_at is not null) as desertados,
  count(*) as total
from public.edu_students
where mentorship_id is not null
group by 1;

-- Por grupo (Flipping / Rentals / etc.)
create or replace view public.edu_kpi_cartera_por_grupo as
select
  mentorship_id,
  coalesce(nullif(trim(grupo), ''), '(sin grupo)') as grupo,
  count(*) as estudiantes,
  count(*) filter (where status = 'active' or status is null) as activos
from public.edu_students
where mentorship_id is not null
group by 1, 2
order by 1, 3 desc;

-- Por etapa actual
create or replace view public.edu_kpi_cartera_por_etapa as
select
  mentorship_id,
  coalesce(nullif(trim(current_stage), ''), '(sin etapa)') as stage,
  count(*) as estudiantes,
  round(avg(glscore)::numeric, 1) as glscore_promedio
from public.edu_students
where mentorship_id is not null
group by 1, 2
order by 1, 3 desc;

-- Por antigüedad (buckets)
create or replace view public.edu_kpi_cartera_por_antiguedad as
select
  mentorship_id,
  case
    when extract(day from now() - coalesce(enrolled_at, created_at)) < 30 then '01_menos_1_mes'
    when extract(day from now() - coalesce(enrolled_at, created_at)) < 90 then '02_1_a_3_meses'
    when extract(day from now() - coalesce(enrolled_at, created_at)) < 180 then '03_3_a_6_meses'
    when extract(day from now() - coalesce(enrolled_at, created_at)) < 365 then '04_6_a_12_meses'
    else '05_mas_12_meses'
  end as bucket,
  count(*) as estudiantes,
  count(*) filter (where status = 'active' or status is null) as activos,
  count(*) filter (where status = 'dropped' or churned_at is not null) as desertados
from public.edu_students
where mentorship_id is not null
group by 1, 2
order by 1, 2;

-- ════════════════════════════════════════════════════════════
-- Sección 2: SESIONES — Distribución por motivo
-- ════════════════════════════════════════════════════════════

create or replace view public.edu_kpi_sesiones_por_motivo as
select
  mentorship_id,
  date_trunc('month', scheduled_at) as mes,
  coalesce(motivo, '(sin motivo)') as motivo,
  count(*) as total,
  count(*) filter (where status_attendance = 'asistio') as asistidas,
  count(*) filter (where status_attendance = 'no_asistio') as no_asistidas
from public.edu_student_calls
where mentorship_id is not null
group by 1, 2, 3
order by 1, 2 desc, 4 desc;

-- Distribución: cuántos estudiantes tienen 0, 1, 2, 3+ sesiones en el mes
create or replace view public.edu_kpi_distribucion_sesiones as
with conteo as (
  select
    c.mentorship_id,
    date_trunc('month', c.scheduled_at) as mes,
    c.student_id,
    count(*) filter (where c.status_attendance = 'asistio') as sesiones
  from public.edu_student_calls c
  where c.mentorship_id is not null
  group by 1, 2, 3
)
select
  mentorship_id, mes,
  count(*) filter (where sesiones = 0) as con_0,
  count(*) filter (where sesiones = 1) as con_1,
  count(*) filter (where sesiones = 2) as con_2,
  count(*) filter (where sesiones >= 3) as con_3_o_mas,
  count(*) as estudiantes_con_actividad,
  round(avg(sesiones)::numeric, 1) as promedio
from conteo
group by 1, 2
order by 1, 2 desc;

-- ════════════════════════════════════════════════════════════
-- Sección 3: DESERCIÓN Y RETENCIÓN
-- ════════════════════════════════════════════════════════════

-- Churns del mes con motivo de la última sesión (heurística)
create or replace view public.edu_kpi_churns_con_motivo as
select
  s.mentorship_id,
  date_trunc('month', s.churned_at) as mes,
  s.id as student_id,
  s.full_name,
  s.current_stage,
  s.churned_at,
  extract(day from s.churned_at - coalesce(s.enrolled_at, s.created_at))::int as dias_en_programa,
  (select c.status_reason from public.edu_student_calls c
    where c.student_id = s.id and c.status_reason is not null
    order by c.scheduled_at desc limit 1) as ultimo_motivo_no_asistencia,
  (select c.summary from public.edu_student_calls c
    where c.student_id = s.id and c.summary is not null
    order by c.scheduled_at desc limit 1) as ultimo_resumen
from public.edu_students s
where s.churned_at is not null
order by s.churned_at desc;

-- Tasa de retención cohort (cuántos quedan a 30/60/90/180 días después de enrollar)
create or replace view public.edu_kpi_retencion_cohort as
with cohorts as (
  select
    mentorship_id,
    date_trunc('month', coalesce(enrolled_at, created_at)) as cohort_mes,
    id as student_id,
    coalesce(enrolled_at, created_at) as start_date,
    coalesce(churned_at, now()) as end_date
  from public.edu_students
  where mentorship_id is not null
)
select
  mentorship_id, cohort_mes,
  count(*) as inscritos,
  count(*) filter (where end_date >= start_date + interval '30 days') as a_30d,
  count(*) filter (where end_date >= start_date + interval '60 days') as a_60d,
  count(*) filter (where end_date >= start_date + interval '90 days') as a_90d,
  count(*) filter (where end_date >= start_date + interval '180 days') as a_180d,
  round(100.0 * count(*) filter (where end_date >= start_date + interval '90 days') / nullif(count(*), 0), 1) as ret_90d_pct
from cohorts
group by 1, 2
order by 1, 2 desc;

-- ════════════════════════════════════════════════════════════
-- Sección 4: RESULTADOS DE NEGOCIO
-- ════════════════════════════════════════════════════════════

-- Top deals cerrados (más recientes y valor)
create or replace view public.edu_kpi_top_deals as
select
  s.mentorship_id,
  s.id as student_id,
  s.full_name,
  s.first_deal_at,
  s.first_deal_type,
  s.first_deal_value,
  extract(day from s.first_deal_at - coalesce(s.enrolled_at, s.created_at))::int as dias_a_deal,
  s.current_stage
from public.edu_students s
where s.first_deal_at is not null
order by s.first_deal_at desc;

-- NPS promedio por mentoría
create or replace view public.edu_kpi_nps as
select
  mentorship_id,
  count(*) filter (where nps_score is not null) as respuestas,
  round(avg(nps_score)::numeric, 1) as nps_promedio,
  count(*) filter (where nps_score >= 9) as promotores,
  count(*) filter (where nps_score between 7 and 8) as pasivos,
  count(*) filter (where nps_score between 0 and 6) as detractores,
  case when count(*) filter (where nps_score is not null) > 0 then
    round(100.0 * (count(*) filter (where nps_score >= 9) - count(*) filter (where nps_score between 0 and 6))
      / count(*) filter (where nps_score is not null), 1)
  else null end as nps_net_score
from public.edu_students
where mentorship_id is not null
group by 1;

-- ════════════════════════════════════════════════════════════
-- Sección 5: CALIDAD PEDAGÓGICA
-- ════════════════════════════════════════════════════════════

-- Top tareas más/menos completadas (qué bloques tranquean)
create or replace view public.edu_kpi_tareas_por_bloque as
select
  p.mentorship_id,
  t.bloque_id,
  t.bloque_etapa,
  t.bloque_subetapa,
  count(*) as tareas_totales,
  sum(case when t.completed then 1 else 0 end) as completadas,
  round(100.0 * sum(case when t.completed then 1 else 0 end) / nullif(count(*), 0), 1) as pct_completado
from public.edu_student_plan_tasks t
join public.edu_student_plans p on p.id = t.plan_id
where p.status = 'active'
group by 1, 2, 3, 4
order by 1, 7 asc;  -- los menos completados primero (los que tranquean)

-- Diagnósticos de crédito generados (perfil dominante)
create or replace view public.edu_kpi_creditos_diagnosticados as
select
  mentorship_id,
  date_trunc('month', created_at) as mes,
  perfil->>'tier' as tier,
  count(*) as cantidad
from public.edu_credit_diagnostics
where status = 'active'
group by 1, 2, 3
order by 1, 2 desc;

-- Coaches activos (sesiones atendidas + planes generados)
create or replace view public.edu_kpi_coaches_actividad as
with calls_by_coach as (
  select
    mentorship_id,
    coalesce(attended_by, '(sin coach)') as coach,
    date_trunc('month', scheduled_at) as mes,
    count(*) as sesiones_agendadas,
    count(*) filter (where status_attendance = 'asistio') as sesiones_atendidas
  from public.edu_student_calls
  group by 1, 2, 3
)
select * from calls_by_coach
order by 1, 3 desc, 5 desc;

-- ════════════════════════════════════════════════════════════
-- GRANTS
-- ════════════════════════════════════════════════════════════
grant select on
  public.edu_kpi_cartera_por_status,
  public.edu_kpi_cartera_por_grupo,
  public.edu_kpi_cartera_por_etapa,
  public.edu_kpi_cartera_por_antiguedad,
  public.edu_kpi_sesiones_por_motivo,
  public.edu_kpi_distribucion_sesiones,
  public.edu_kpi_churns_con_motivo,
  public.edu_kpi_retencion_cohort,
  public.edu_kpi_top_deals,
  public.edu_kpi_nps,
  public.edu_kpi_tareas_por_bloque,
  public.edu_kpi_creditos_diagnosticados,
  public.edu_kpi_coaches_actividad
to authenticated;
