-- ════════════════════════════════════════════════════════════
-- 📊 Dashboard CEO — KPIs y OKRs nivel ejecutivo para Educación
-- Diseñado para que un CEO/Founder mire una vez por semana y entienda
-- en 30 segundos el estado del área completa.
-- ════════════════════════════════════════════════════════════

-- ─── Tabla de OKRs/targets que el CEO define ───
create table if not exists public.edu_okr_targets (
  id uuid primary key default gen_random_uuid(),
  mentorship_id text,
  metric_key text not null,                    -- 'pct_asistencia', 'pct_first_deal', 'churn_rate', ...
  metric_label text,                           -- "% asistencia", "% primer deal", etc.
  target_value numeric not null,
  target_period text default 'monthly' check (target_period in ('weekly','monthly','quarterly','yearly')),
  unit text default 'pct' check (unit in ('pct','count','days','usd','score')),
  direction text default 'higher_better' check (direction in ('higher_better','lower_better')),
  active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
create index if not exists edu_okr_active on public.edu_okr_targets(mentorship_id, active);

-- Seed: OKRs base recomendados para área de mentorías
insert into public.edu_okr_targets (mentorship_id, metric_key, metric_label, target_value, target_period, unit, direction) values
  (null, 'pct_asistencia',          '% Asistencia',                       80, 'monthly', 'pct', 'higher_better'),
  (null, 'pct_avance_plan',         '% Avance del plan promedio',         60, 'monthly', 'pct', 'higher_better'),
  (null, 'pct_con_plan',            '% Estudiantes con plan activo',      90, 'monthly', 'pct', 'higher_better'),
  (null, 'sesiones_por_estudiante', 'Sesiones por estudiante / mes',       2, 'monthly', 'count', 'higher_better'),
  (null, 'pct_cerro_deal',          '% Cerró primer deal',                40, 'quarterly', 'pct', 'higher_better'),
  (null, 'dias_a_deal',             'Días promedio a primer deal',       120, 'quarterly', 'days', 'lower_better'),
  (null, 'churn_rate',              'Churn rate mensual',                  5, 'monthly', 'pct', 'lower_better'),
  (null, 'nps_score',               'NPS Net Score',                      50, 'quarterly', 'score', 'higher_better'),
  (null, 'pct_inactivos',           '% Inactivos >30d',                   10, 'monthly', 'pct', 'lower_better'),
  (null, 'pct_no_show',             '% No-show',                          15, 'monthly', 'pct', 'lower_better')
on conflict do nothing;

-- ════════════════════════════════════════════════════════════
-- VISTAS CEO: agregaciones de alto nivel
-- ════════════════════════════════════════════════════════════

-- ─── 1. Snapshot ejecutivo (todo el área en 1 fila) ───
create or replace view public.edu_ceo_snapshot as
with
  cartera as (
    select
      mentorship_id,
      count(*) filter (where status = 'active' or status is null) as activos,
      count(*) filter (where status = 'at_risk') as en_riesgo,
      count(*) filter (where status = 'paused') as pausados,
      count(*) filter (where status = 'graduated') as graduados,
      count(*) filter (where status = 'dropped' or churned_at is not null) as desertados,
      count(*) filter (where first_deal_at is not null) as con_deal,
      count(*) as total,
      round(avg(extract(day from now() - coalesce(enrolled_at, created_at)))) as antiguedad_promedio_dias,
      count(*) filter (where coalesce(enrolled_at, created_at) > now() - interval '30 days') as nuevos_30d,
      count(*) filter (where churned_at > now() - interval '30 days') as desertados_30d,
      count(*) filter (where renewed_at > now() - interval '30 days') as renovaciones_30d
    from public.edu_students
    where mentorship_id is not null
    group by mentorship_id
  ),
  sesiones_mes as (
    select
      mentorship_id,
      count(*) as total,
      count(*) filter (where status_attendance = 'asistio') as asistidas,
      count(*) filter (where status_attendance = 'no_asistio') as no_asistidas,
      round(100.0 * count(*) filter (where status_attendance = 'asistio')
        / nullif(count(*) filter (where status_attendance in ('asistio','no_asistio')), 0), 1) as pct_asistencia,
      count(distinct student_id) as estudiantes_con_sesion
    from public.edu_student_calls
    where mentorship_id is not null
      and scheduled_at >= date_trunc('month', now())
    group by mentorship_id
  ),
  plan_avance as (
    select
      p.mentorship_id,
      count(distinct p.student_id) as con_plan,
      round(100.0 * sum(case when t.completed then 1 else 0 end) / nullif(count(t.id), 0), 1) as pct_avance
    from public.edu_student_plans p
    left join public.edu_student_plan_tasks t on t.plan_id = p.id
    where p.status = 'active'
    group by p.mentorship_id
  ),
  inactivos as (
    select
      s.mentorship_id,
      count(*) as inactivos_30d
    from public.edu_students s
    where (s.active is true or s.active is null)
      and (s.status is null or s.status not in ('dropped','graduated'))
      and not exists (
        select 1 from public.edu_student_calls c
        where c.student_id = s.id and c.status_attendance = 'asistio'
          and c.scheduled_at > now() - interval '30 days'
      )
    group by s.mentorship_id
  )
select
  c.mentorship_id,
  -- Cartera
  c.total, c.activos, c.en_riesgo, c.pausados, c.graduados, c.desertados, c.con_deal,
  c.nuevos_30d, c.desertados_30d, c.renovaciones_30d, c.antiguedad_promedio_dias,
  -- Sesiones mes en curso
  coalesce(s.total, 0) as sesiones_mes,
  coalesce(s.asistidas, 0) as asistencias_mes,
  s.pct_asistencia,
  coalesce(s.estudiantes_con_sesion, 0) as estudiantes_con_sesion_mes,
  -- Plan
  coalesce(p.con_plan, 0) as con_plan_activo,
  p.pct_avance as pct_avance_plan,
  -- Inactividad
  coalesce(i.inactivos_30d, 0) as inactivos_30d,
  -- Cálculos compuestos
  round(100.0 * c.activos / nullif(c.total, 0), 1) as pct_activos,
  round(100.0 * c.con_deal / nullif(c.total, 0), 1) as pct_cerro_deal,
  round(100.0 * c.desertados_30d / nullif(c.activos + c.desertados_30d, 0), 1) as churn_rate_30d,
  round(100.0 * coalesce(i.inactivos_30d, 0) / nullif(c.activos, 0), 1) as pct_inactivos
from cartera c
left join sesiones_mes s using (mentorship_id)
left join plan_avance p using (mentorship_id)
left join inactivos i using (mentorship_id);

-- ─── 2. Funnel de conversión: E0 → E5 ───
create or replace view public.edu_ceo_funnel as
with stages as (
  select
    s.mentorship_id,
    s.current_stage,
    count(*) as estudiantes
  from public.edu_students s
  where (s.active is true or s.active is null)
    and s.current_stage is not null
  group by s.mentorship_id, s.current_stage
),
totals as (
  select mentorship_id, sum(estudiantes) as total from stages group by mentorship_id
)
select
  s.mentorship_id,
  s.current_stage as etapa,
  s.estudiantes,
  round(100.0 * s.estudiantes / nullif(t.total, 0), 1) as pct_del_total
from stages s
join totals t using (mentorship_id)
order by s.mentorship_id, s.current_stage;

-- ─── 3. Cuellos de botella: etapas con tiempo > 1.5x mediana global ───
-- FIX: Postgres NO soporta percentile_cont() WITHIN GROUP combinado con OVER.
-- Solución: calcular mediana en CTE separado y hacer JOIN.
create or replace view public.edu_ceo_cuellos_botella as
with medianas as (
  select
    mentorship_id,
    percentile_cont(0.5) within group (order by promedio_dias) as mediana_global
  from public.edu_kpi_tiempo_por_etapa
  where promedio_dias is not null
  group by mentorship_id
)
select
  t.mentorship_id,
  t.stage,
  t.promedio_dias,
  round(m.mediana_global::numeric, 1) as mediana_global,
  round((t.promedio_dias / nullif(m.mediana_global, 0))::numeric, 2) as factor_vs_mediana,
  case
    when t.promedio_dias > m.mediana_global * 2 then 'critico'
    when t.promedio_dias > m.mediana_global * 1.5 then 'alto'
    when t.promedio_dias > m.mediana_global * 1.2 then 'medio'
    else 'ok'
  end as severidad
from public.edu_kpi_tiempo_por_etapa t
join medianas m using (mentorship_id)
where t.promedio_dias is not null
  and t.promedio_dias > m.mediana_global * 1.2
order by t.mentorship_id, t.promedio_dias desc;

-- ─── 4. Tasa de conversión etapa N → N+1 ───
create or replace view public.edu_ceo_conversion_etapas as
with etapas_orden as (
  select mentorship_id, stage,
    count(*) filter (where exited_at is not null) as salidas,
    count(*) as ingresos,
    round(100.0 * count(*) filter (where exited_at is not null) / nullif(count(*), 0), 1) as pct_avanza
  from public.edu_student_stage_history
  where stage is not null
  group by mentorship_id, stage
)
select * from etapas_orden order by mentorship_id, stage;

-- ─── 5. Motivos de deserción (texto libre clusterizado) ───
create or replace view public.edu_ceo_motivos_desercion as
select
  mentorship_id,
  coalesce(nullif(trim(ultimo_motivo_no_asistencia), ''), '(sin motivo registrado)') as motivo,
  count(*) as cantidad
from public.edu_kpi_churns_con_motivo
group by mentorship_id, motivo
order by mentorship_id, cantidad desc;

-- ─── 6. Costo / valor: si tienes pricing por estudiante ───
-- Asume edu_students.contract_value (precio del programa)
alter table public.edu_students add column if not exists contract_value numeric;
alter table public.edu_students add column if not exists deal_revenue numeric;  -- ingresos generados por deals cerrados

create or replace view public.edu_ceo_revenue as
select
  mentorship_id,
  sum(contract_value) as revenue_total_contratado,
  sum(contract_value) filter (where status = 'active' or status is null) as revenue_activos,
  sum(deal_revenue) as deal_revenue_estudiantes,
  count(*) filter (where contract_value > 0) as estudiantes_con_pricing,
  round(avg(contract_value) filter (where contract_value > 0), 0) as ltv_promedio,
  round(sum(deal_revenue) / nullif(sum(contract_value), 0), 2) as roi_estudiantes
from public.edu_students
where mentorship_id is not null
group by mentorship_id;

-- ─── 7. Health Score (combinado 0-100) ───
-- Mezcla asistencia, avance plan, NPS, % activos en una sola métrica.
create or replace view public.edu_ceo_health_score as
with s as (
  select * from public.edu_ceo_snapshot
),
n as (
  select mentorship_id, nps_net_score from public.edu_kpi_nps
)
select
  s.mentorship_id,
  -- Componentes normalizados (0-100)
  coalesce(s.pct_asistencia, 50) as componente_asistencia,
  coalesce(s.pct_avance_plan, 50) as componente_plan,
  coalesce((50 + greatest(-50, least(50, coalesce(n.nps_net_score, 0)/2))), 50) as componente_nps,
  coalesce(s.pct_activos, 50) as componente_activos,
  greatest(0, 100 - coalesce(s.churn_rate_30d, 0) * 5) as componente_churn,
  -- Score combinado (promedio ponderado)
  round(
    coalesce(s.pct_asistencia, 50) * 0.20 +
    coalesce(s.pct_avance_plan, 50) * 0.20 +
    coalesce((50 + greatest(-50, least(50, coalesce(n.nps_net_score, 0)/2))), 50) * 0.20 +
    coalesce(s.pct_activos, 50) * 0.20 +
    greatest(0, 100 - coalesce(s.churn_rate_30d, 0) * 5) * 0.20
  , 1) as health_score
from s
left join n using (mentorship_id);

-- ─── 8. Tendencias mensuales (últimos 6 meses) ───
create or replace view public.edu_ceo_tendencia_6m as
select
  mentorship_id,
  mes,
  sesiones_total,
  asistidas,
  no_asistidas,
  pct_asistencia,
  estudiantes_con_sesion,
  sesiones_promedio_por_estudiante
from public.edu_kpi_resumen_mensual
where mes >= date_trunc('month', now() - interval '6 months')
order by mentorship_id, mes;

-- ─── RLS y grants ───
alter table public.edu_okr_targets enable row level security;
drop policy if exists eot_select on public.edu_okr_targets;
create policy eot_select on public.edu_okr_targets for select using (auth.role() = 'authenticated');
drop policy if exists eot_write on public.edu_okr_targets;
create policy eot_write on public.edu_okr_targets for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select on
  public.edu_ceo_snapshot,
  public.edu_ceo_funnel,
  public.edu_ceo_cuellos_botella,
  public.edu_ceo_conversion_etapas,
  public.edu_ceo_motivos_desercion,
  public.edu_ceo_revenue,
  public.edu_ceo_health_score,
  public.edu_ceo_tendencia_6m
to authenticated;
