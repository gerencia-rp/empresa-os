-- KPIs Postventa v1 — Vistas SQL para informe ejecutivo
-- Se consumen desde el frontend con sb.from('view_name').select(...)

-- ════════════════════════════════════════════════════════════
-- 0) PREP: columnas necesarias en edu_students (idempotente)
-- Debe ir ANTES de las vistas que las referencian.
-- ════════════════════════════════════════════════════════════
alter table public.edu_students
  add column if not exists first_deal_at timestamptz,
  add column if not exists first_deal_type text,
  add column if not exists first_deal_value numeric,
  add column if not exists active boolean default true,
  add column if not exists churned_at timestamptz,
  add column if not exists renewed_at timestamptz,
  add column if not exists nps_score int;

-- ════════════════════════════════════════════════════════════
-- 1) % asistencia mensual por mentoría
-- ════════════════════════════════════════════════════════════
create or replace view public.edu_kpi_asistencia_mensual as
select
  mentorship_id,
  date_trunc('month', scheduled_at) as mes,
  count(*) filter (where status_attendance = 'asistio') as asistidas,
  count(*) filter (where status_attendance = 'no_asistio') as no_asistidas,
  count(*) filter (where status_attendance in ('asistio','no_asistio')) as resueltas,
  round(100.0 * count(*) filter (where status_attendance = 'asistio')
    / nullif(count(*) filter (where status_attendance in ('asistio','no_asistio')), 0), 1) as pct_asistencia
from public.edu_student_calls
where mentorship_id is not null
group by 1, 2
order by 1, 2 desc;

-- ════════════════════════════════════════════════════════════
-- 2) Sesiones por estudiante / mes
-- ════════════════════════════════════════════════════════════
create or replace view public.edu_kpi_sesiones_estudiante_mes as
select
  c.mentorship_id,
  date_trunc('month', c.scheduled_at) as mes,
  c.student_id,
  s.full_name,
  count(*) filter (where c.status_attendance = 'asistio') as sesiones_asistidas,
  count(*) as sesiones_agendadas
from public.edu_student_calls c
left join public.edu_students s on s.id = c.student_id
where c.mentorship_id is not null
group by 1,2,3,4
order by 1, 2 desc, 5 desc;

-- ════════════════════════════════════════════════════════════
-- 3) Tiempo promedio en cada etapa (días)
-- Asume edu_student_stage_history (id, student_id, stage, entered_at, exited_at).
-- Si no existe, creamos versión basada en updated_at (aproximada).
-- ════════════════════════════════════════════════════════════
create table if not exists public.edu_student_stage_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.edu_students(id) on delete cascade,
  mentorship_id text,
  stage text not null,
  entered_at timestamptz not null default now(),
  exited_at timestamptz,
  duration_days int generated always as
    (case when exited_at is null then null else extract(day from (exited_at - entered_at))::int end) stored
);
create index if not exists esh_student on public.edu_student_stage_history(student_id);
create index if not exists esh_stage on public.edu_student_stage_history(mentorship_id, stage);
alter table public.edu_student_stage_history enable row level security;
drop policy if exists esh_select on public.edu_student_stage_history;
create policy esh_select on public.edu_student_stage_history for select using (auth.role() = 'authenticated');
drop policy if exists esh_write on public.edu_student_stage_history;
create policy esh_write on public.edu_student_stage_history for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Trigger: cuando current_stage cambia en edu_students, cerrar fila anterior y abrir nueva
create or replace function public.fn_track_student_stage()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') or (old.current_stage is distinct from new.current_stage) then
    update public.edu_student_stage_history
      set exited_at = now()
      where student_id = new.id and exited_at is null;
    if new.current_stage is not null then
      insert into public.edu_student_stage_history (student_id, mentorship_id, stage)
        values (new.id, new.mentorship_id, new.current_stage);
    end if;
  end if;
  return new;
end$$;

drop trigger if exists trg_track_student_stage on public.edu_students;
create trigger trg_track_student_stage
  after insert or update of current_stage on public.edu_students
  for each row execute function public.fn_track_student_stage();

create or replace view public.edu_kpi_tiempo_por_etapa as
select
  mentorship_id,
  stage,
  count(*) as ingresos_a_etapa,
  count(*) filter (where exited_at is not null) as salidas_de_etapa,
  round(avg(duration_days) filter (where duration_days is not null), 1) as promedio_dias,
  percentile_cont(0.5) within group (order by duration_days) filter (where duration_days is not null) as mediana_dias,
  max(duration_days) as max_dias
from public.edu_student_stage_history
where stage is not null
group by 1, 2
order by 1, 2;

-- ════════════════════════════════════════════════════════════
-- 4) % estudiantes con plan activo
-- ════════════════════════════════════════════════════════════
create or replace view public.edu_kpi_estudiantes_con_plan as
select
  s.mentorship_id,
  count(distinct s.id) as estudiantes_total,
  count(distinct s.id) filter (where exists (
    select 1 from public.edu_student_plans p where p.student_id = s.id and p.status = 'active'
  )) as con_plan_activo,
  round(100.0 *
    count(distinct s.id) filter (where exists (
      select 1 from public.edu_student_plans p where p.student_id = s.id and p.status = 'active'
    )) / nullif(count(distinct s.id), 0), 1) as pct_con_plan
from public.edu_students s
where s.mentorship_id is not null
group by 1
order by 1;

-- ════════════════════════════════════════════════════════════
-- 5) Estudiantes inactivos >30 días (sin sesión asistida)
-- ════════════════════════════════════════════════════════════
create or replace view public.edu_kpi_inactivos_30d as
select
  s.mentorship_id,
  s.id as student_id,
  s.full_name,
  s.current_stage,
  s.email,
  (select max(scheduled_at) from public.edu_student_calls c
    where c.student_id = s.id and c.status_attendance = 'asistio') as ultima_sesion_asistida,
  extract(day from now() - coalesce(
    (select max(scheduled_at) from public.edu_student_calls c
      where c.student_id = s.id and c.status_attendance = 'asistio'),
    s.created_at
  ))::int as dias_inactivo
from public.edu_students s
where (s.active is true or s.active is null)
  and (
    not exists (select 1 from public.edu_student_calls c
                where c.student_id = s.id
                  and c.status_attendance = 'asistio'
                  and c.scheduled_at > now() - interval '30 days')
  );

-- ════════════════════════════════════════════════════════════
-- 6) % tareas del plan completadas (avg por mentoría)
-- ════════════════════════════════════════════════════════════
create or replace view public.edu_kpi_avance_plan as
select
  p.mentorship_id,
  count(distinct p.student_id) as estudiantes_con_plan,
  sum(case when t.completed then 1 else 0 end) as tareas_completadas,
  count(t.id) as tareas_total,
  round(100.0 * sum(case when t.completed then 1 else 0 end) / nullif(count(t.id), 0), 1) as pct_avance
from public.edu_student_plans p
left join public.edu_student_plan_tasks t on t.plan_id = p.id
where p.status = 'active'
group by 1;

-- ════════════════════════════════════════════════════════════
-- 7) % estudiantes con primer deal cerrado
-- (las columnas ya se crearon en la sección 0 al inicio)
-- ════════════════════════════════════════════════════════════
create or replace view public.edu_kpi_primer_deal as
select
  mentorship_id,
  count(*) as estudiantes_total,
  count(*) filter (where first_deal_at is not null) as cerraron_primer_deal,
  round(100.0 * count(*) filter (where first_deal_at is not null) / nullif(count(*), 0), 1) as pct_cerro_deal,
  round(avg(extract(day from first_deal_at - created_at)) filter (where first_deal_at is not null), 1) as dias_promedio_a_deal
from public.edu_students
where mentorship_id is not null
group by 1
order by 1;

-- ════════════════════════════════════════════════════════════
-- 8) No-shows por coach
-- ════════════════════════════════════════════════════════════
create or replace view public.edu_kpi_noshows_coach as
select
  mentorship_id,
  attended_by as coach,
  date_trunc('month', scheduled_at) as mes,
  count(*) filter (where status_attendance = 'no_asistio') as no_shows,
  count(*) filter (where status_attendance = 'asistio') as asistencias,
  count(*) as total,
  round(100.0 * count(*) filter (where status_attendance = 'no_asistio')
    / nullif(count(*) filter (where status_attendance in ('asistio','no_asistio')), 0), 1) as pct_noshow
from public.edu_student_calls
where attended_by is not null
group by 1,2,3
order by 1, 3 desc, 6 desc;

-- ════════════════════════════════════════════════════════════
-- 9) Top motivos de no-asistencia
-- ════════════════════════════════════════════════════════════
create or replace view public.edu_kpi_motivos_no_asistencia as
select
  mentorship_id,
  date_trunc('month', scheduled_at) as mes,
  coalesce(nullif(trim(status_reason), ''), '(sin motivo)') as motivo,
  count(*) as conteo
from public.edu_student_calls
where status_attendance in ('no_asistio','reprogramo','cancelo')
group by 1, 2, 3
order by 1, 2 desc, 4 desc;

-- ════════════════════════════════════════════════════════════
-- 10) % renovaciones / churn
-- ════════════════════════════════════════════════════════════
create or replace view public.edu_kpi_renovaciones_churn as
select
  mentorship_id,
  date_trunc('month', coalesce(renewed_at, churned_at, created_at)) as mes,
  count(*) filter (where renewed_at is not null and date_trunc('month', renewed_at) = date_trunc('month', coalesce(renewed_at, churned_at, created_at))) as renovaciones,
  count(*) filter (where churned_at is not null and date_trunc('month', churned_at) = date_trunc('month', coalesce(renewed_at, churned_at, created_at))) as churns,
  count(*) filter (where active is true) as activos
from public.edu_students
where mentorship_id is not null
group by 1, 2
order by 1, 2 desc;

-- ════════════════════════════════════════════════════════════
-- 11) Resumen ejecutivo MENSUAL (todo en una fila por mes)
-- ════════════════════════════════════════════════════════════
create or replace view public.edu_kpi_resumen_mensual as
with meses as (
  select distinct date_trunc('month', scheduled_at) as mes, mentorship_id
  from public.edu_student_calls where mentorship_id is not null
),
asistencia as (
  select mentorship_id, mes, asistidas, no_asistidas, pct_asistencia
  from public.edu_kpi_asistencia_mensual
),
totales as (
  select mentorship_id, date_trunc('month', scheduled_at) as mes,
    count(*) as sesiones_total,
    count(*) filter (where status_attendance = 'reprogramo') as reprog,
    count(*) filter (where status_attendance = 'cancelo') as cancel,
    count(distinct student_id) as estudiantes_unicos
  from public.edu_student_calls
  where mentorship_id is not null
  group by 1,2
)
select
  m.mes,
  m.mentorship_id,
  coalesce(t.sesiones_total, 0) as sesiones_total,
  coalesce(a.asistidas, 0) as asistidas,
  coalesce(a.no_asistidas, 0) as no_asistidas,
  coalesce(t.reprog, 0) as reprogramadas,
  coalesce(t.cancel, 0) as canceladas,
  a.pct_asistencia,
  coalesce(t.estudiantes_unicos, 0) as estudiantes_con_sesion,
  case when t.estudiantes_unicos > 0
    then round((t.sesiones_total::numeric / t.estudiantes_unicos), 1)
    else 0 end as sesiones_promedio_por_estudiante
from meses m
left join asistencia a on a.mentorship_id = m.mentorship_id and a.mes = m.mes
left join totales t on t.mentorship_id = m.mentorship_id and t.mes = m.mes
order by m.mes desc, m.mentorship_id;

-- Grants
grant select on
  public.edu_kpi_asistencia_mensual,
  public.edu_kpi_sesiones_estudiante_mes,
  public.edu_kpi_tiempo_por_etapa,
  public.edu_kpi_estudiantes_con_plan,
  public.edu_kpi_inactivos_30d,
  public.edu_kpi_avance_plan,
  public.edu_kpi_primer_deal,
  public.edu_kpi_noshows_coach,
  public.edu_kpi_motivos_no_asistencia,
  public.edu_kpi_renovaciones_churn,
  public.edu_kpi_resumen_mensual
to authenticated;
