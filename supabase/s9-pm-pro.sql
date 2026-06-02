-- ============================================================
-- S9 · PM Pro — Multi-empresa + Performance + OKRs + 1-on-1s + Coaching IA
-- ============================================================

-- ============================================================
-- 1) Tabla pm_companies — multi-empresa
-- ============================================================
create table if not exists public.pm_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text default '🏢',
  color text default 'slate',         -- tailwind base
  clickup_space_id text,              -- ID del space en ClickUp
  clickup_team_id text,
  airtable_base_id text,
  is_holding bool default false,
  active bool default true,
  position int default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists pmc_active on public.pm_companies(active);

-- Seed con tu holding como template (vos llenás con los IDs reales después en la UI)
insert into public.pm_companies (name, slug, icon, color, is_holding, position) values
  ('Holding', 'holding', '🏛️', 'slate', true, 0),
  ('Remodelación', 'remodelacion', '🔨', 'amber', false, 1),
  ('Rentas / Property Mgmt', 'rentas', '🏘️', 'emerald', false, 2),
  ('Fix & Flip', 'fix-flip', '🏚️', 'rose', false, 3)
on conflict (slug) do nothing;

-- Update existente: el space ID actual de ClickUp era hardcoded en sync-clickup
update public.pm_companies set clickup_space_id = '90113866434'
where slug = 'remodelacion' and clickup_space_id is null;

-- ============================================================
-- 2) Agregar company_id a clickup_tasks_mirror y clickup_snapshots
-- ============================================================
alter table public.clickup_tasks_mirror
  add column if not exists company_id uuid references public.pm_companies(id);

alter table public.clickup_snapshots
  add column if not exists company_id uuid references public.pm_companies(id);

-- Cambiar unique constraint: ahora (snapshot_date, company_id) para multi-empresa
do $$ begin
  alter table public.clickup_snapshots drop constraint if exists clickup_snapshots_snapshot_date_key;
  alter table public.clickup_snapshots add constraint clickup_snapshots_date_company_uk unique (snapshot_date, company_id);
exception when others then null;
end $$;

create index if not exists clickup_tasks_company on public.clickup_tasks_mirror(company_id);
create index if not exists clickup_snapshots_company on public.clickup_snapshots(company_id, snapshot_date desc);

-- Back-fill: las tasks actuales son de Remodelación
update public.clickup_tasks_mirror
set company_id = (select id from public.pm_companies where slug = 'remodelacion')
where company_id is null;

update public.clickup_snapshots
set company_id = (select id from public.pm_companies where slug = 'remodelacion')
where company_id is null;

-- ============================================================
-- 3) Tabla pm_performance_weekly — métricas por persona × semana × empresa
-- ============================================================
create table if not exists public.pm_performance_weekly (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.pm_whatsapp_recipients(id) on delete cascade,
  company_id uuid references public.pm_companies(id) on delete cascade,
  week_start date not null,
  -- Métricas crudas
  tasks_assigned int default 0,
  tasks_completed int default 0,
  tasks_completed_ontime int default 0,
  tasks_overdue int default 0,
  tasks_reopened int default 0,                   -- proxy de calidad
  lead_time_avg_days numeric,                     -- created → closed
  capacity_adherence_pct numeric,                 -- % del daily WhatsApp que cierra
  alerts_generated int default 0,                 -- alertas críticas de sus obras/tasks
  -- Scores 0-100
  completion_score numeric,                       -- tasks_completed / tasks_assigned
  quality_score numeric,                          -- (1 - reopened/completed) × 100
  velocity_score numeric,                         -- vs benchmark equipo
  capacity_score numeric,                         -- capacity_adherence_pct
  composite_score numeric,                        -- promedio ponderado
  -- Tendencia
  composite_score_prev numeric,
  trend text check (trend in ('up','flat','down','new')),
  -- Meta
  computed_at timestamptz default now(),
  notes text,
  unique (recipient_id, company_id, week_start)
);

create index if not exists ppw_week on public.pm_performance_weekly(week_start desc);
create index if not exists ppw_recipient on public.pm_performance_weekly(recipient_id, week_start desc);
create index if not exists ppw_score on public.pm_performance_weekly(composite_score desc);

-- ============================================================
-- 4) Tabla pm_okrs — Objetivos y Key Results trimestrales
-- ============================================================
create table if not exists public.pm_okrs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.pm_companies(id) on delete cascade,
  recipient_id uuid references public.pm_whatsapp_recipients(id) on delete set null, -- null = OKR de equipo/empresa
  quarter text not null,                          -- '2026-Q2'
  objective text not null,
  -- KRs como array jsonb: [{id, title, target, current, unit, source:'manual'|'clickup'|'metric'}]
  key_results jsonb not null default '[]'::jsonb,
  weight numeric default 1.0,                     -- para weighted scoring
  -- Estado
  status text default 'active' check (status in ('draft','active','at_risk','completed','dropped')),
  progress_pct numeric default 0,                 -- % de KRs cumplidos
  -- Meta
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (company_id, quarter, objective)
);

create index if not exists pmo_active on public.pm_okrs(status) where status in ('active','at_risk');
create index if not exists pmo_quarter on public.pm_okrs(quarter);

-- Histórico de progreso de KRs (para tendencia)
create table if not exists public.pm_okr_progress (
  id uuid primary key default gen_random_uuid(),
  okr_id uuid references public.pm_okrs(id) on delete cascade,
  kr_id text not null,                            -- match con key_results[].id
  measurement_date date default current_date,
  value numeric,
  target numeric,
  source text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists pop_okr on public.pm_okr_progress(okr_id, measurement_date desc);

-- ============================================================
-- 5) Tabla pm_one_on_ones — coaching 1:1
-- ============================================================
create table if not exists public.pm_one_on_ones (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.pm_whatsapp_recipients(id) on delete cascade,
  scheduled_date timestamptz,
  duration_min int default 30,
  cadence text default 'weekly' check (cadence in ('weekly','biweekly','monthly','adhoc')),
  -- IA-generated antes
  ai_agenda_md text,
  ai_talking_points jsonb,                        -- [{topic, why_now, data_evidence}]
  ai_generated_at timestamptz,
  ai_cost_tokens int,
  -- Manual durante/después
  notes_md text,
  action_items jsonb default '[]'::jsonb,         -- [{title, due_date, owner, clickup_task_id}]
  rating_engagement int,                          -- 1-5
  rating_alignment int,
  rating_morale int,
  -- Estado
  status text default 'scheduled' check (status in ('scheduled','in_progress','completed','rescheduled','cancelled')),
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists p1o1_recipient_date on public.pm_one_on_ones(recipient_id, scheduled_date desc);
create index if not exists p1o1_status on public.pm_one_on_ones(status) where status != 'completed';

-- ============================================================
-- 6) Tabla pm_coaching_prompts — sugerencias semanales del agente IA
-- ============================================================
create table if not exists public.pm_coaching_prompts (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  recipient_id uuid references public.pm_whatsapp_recipients(id) on delete cascade,
  prompt_type text default 'feedback' check (prompt_type in ('feedback','recognition','intervention','learning','reassignment')),
  title text not null,
  message text not null,                          -- qué decirle (rioplatense, directo)
  evidence jsonb,                                 -- data que respalda la sugerencia
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  delivered bool default false,
  delivered_at timestamptz,
  acted_upon bool,
  outcome text,
  created_at timestamptz default now()
);

create index if not exists pcp_week on public.pm_coaching_prompts(week_start desc);
create index if not exists pcp_pending on public.pm_coaching_prompts(delivered) where not delivered;

-- ============================================================
-- 7) Vistas analíticas
-- ============================================================

-- Bottleneck heatmap: tasks abiertas agrupadas por status × empresa × días-en-status
create or replace view public.pm_bottleneck_heatmap as
with task_age as (
  select
    company_id,
    primary_assignee,
    status,
    extract(day from now() - date_updated)::int as days_in_status,
    case
      when extract(day from now() - date_updated) <= 1 then '0-1d'
      when extract(day from now() - date_updated) <= 3 then '2-3d'
      when extract(day from now() - date_updated) <= 7 then '4-7d'
      when extract(day from now() - date_updated) <= 14 then '8-14d'
      else '15d+'
    end as age_bucket
  from public.clickup_tasks_mirror
  where status_type != 'closed'
)
select
  company_id,
  status,
  age_bucket,
  count(*) as task_count,
  array_agg(distinct primary_assignee) filter (where primary_assignee is not null) as assignees
from task_age
group by company_id, status, age_bucket
order by status, age_bucket;

-- Executive cross-company: 1 fila por company con KPIs operativos
create or replace view public.pm_executive_cross_company as
select
  c.id as company_id,
  c.name as company_name,
  c.slug,
  c.icon,
  c.color,
  -- ClickUp KPIs
  (select count(*) from public.clickup_tasks_mirror t where t.company_id = c.id and t.status_type != 'closed') as tasks_open,
  (select count(*) from public.clickup_tasks_mirror t where t.company_id = c.id and t.status_type != 'closed' and t.due_date < now()) as tasks_overdue,
  (select count(*) from public.clickup_tasks_mirror t where t.company_id = c.id and t.status_type = 'closed' and t.date_closed > now() - interval '7 days') as tasks_closed_7d,
  (select count(distinct t.primary_assignee) from public.clickup_tasks_mirror t where t.company_id = c.id and t.status_type != 'closed' and t.primary_assignee is not null) as active_people,
  -- Performance promedio de la semana
  (select round(avg(composite_score)) from public.pm_performance_weekly p where p.company_id = c.id and p.week_start = date_trunc('week', current_date)::date) as avg_score_this_week,
  -- OKRs
  (select count(*) from public.pm_okrs o where o.company_id = c.id and o.status in ('active','at_risk') and o.quarter = to_char(current_date, 'YYYY') || '-Q' || ceil(extract(month from current_date)/3)::text) as okrs_active,
  (select round(avg(progress_pct)) from public.pm_okrs o where o.company_id = c.id and o.status in ('active','at_risk') and o.quarter = to_char(current_date, 'YYYY') || '-Q' || ceil(extract(month from current_date)/3)::text) as okrs_avg_progress,
  -- Risks
  (select count(*) from public.pm_risks r where r.area = c.slug and r.status != 'closed' and r.score >= 12) as risks_high
from public.pm_companies c
where c.active and not c.is_holding
order by c.position;

-- Performance leaderboard (top + bottom) de la semana actual
create or replace view public.pm_performance_leaderboard as
select
  p.recipient_id,
  r.full_name,
  c.name as company_name,
  p.week_start,
  p.composite_score,
  p.completion_score,
  p.quality_score,
  p.velocity_score,
  p.capacity_score,
  p.trend,
  case
    when p.composite_score >= 85 then '🏆 Top'
    when p.composite_score >= 70 then '✅ Bueno'
    when p.composite_score >= 50 then '🟡 Atención'
    else '🔴 Crítico'
  end as performance_tier
from public.pm_performance_weekly p
join public.pm_whatsapp_recipients r on r.id = p.recipient_id
left join public.pm_companies c on c.id = p.company_id
where p.week_start = (select max(week_start) from public.pm_performance_weekly)
order by p.composite_score desc nulls last;

-- ============================================================
-- 8) Helper: compute OKR progress % desde key_results jsonb
-- ============================================================
create or replace function public.recompute_okr_progress(p_okr_id uuid)
returns numeric language plpgsql as $$
declare
  v_krs jsonb;
  v_total numeric := 0;
  v_count int := 0;
  v_kr jsonb;
  v_pct numeric;
begin
  select key_results into v_krs from public.pm_okrs where id = p_okr_id;
  if v_krs is null then return 0; end if;
  for v_kr in select * from jsonb_array_elements(v_krs)
  loop
    if (v_kr->>'target')::numeric > 0 then
      v_pct := least(100, ((v_kr->>'current')::numeric / (v_kr->>'target')::numeric) * 100);
      v_total := v_total + v_pct;
      v_count := v_count + 1;
    end if;
  end loop;
  if v_count = 0 then return 0; end if;
  update public.pm_okrs set progress_pct = round(v_total / v_count, 1), updated_at = now() where id = p_okr_id;
  return round(v_total / v_count, 1);
end $$;

-- ============================================================
-- 9) RLS
-- ============================================================
alter table public.pm_companies enable row level security;
alter table public.pm_performance_weekly enable row level security;
alter table public.pm_okrs enable row level security;
alter table public.pm_okr_progress enable row level security;
alter table public.pm_one_on_ones enable row level security;
alter table public.pm_coaching_prompts enable row level security;

do $$ begin
  drop policy if exists pmc_all on public.pm_companies;
  drop policy if exists ppw_all on public.pm_performance_weekly;
  drop policy if exists pmo_all on public.pm_okrs;
  drop policy if exists pop_all on public.pm_okr_progress;
  drop policy if exists p1o1_all on public.pm_one_on_ones;
  drop policy if exists pcp_all on public.pm_coaching_prompts;
end $$;

create policy pmc_all on public.pm_companies for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy ppw_all on public.pm_performance_weekly for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy pmo_all on public.pm_okrs for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy pop_all on public.pm_okr_progress for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy p1o1_all on public.pm_one_on_ones for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy pcp_all on public.pm_coaching_prompts for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- ============================================================
-- 10) Cron jobs nuevos
-- ============================================================
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in (
    'pm-compute-performance-mon-6am', 'pm-coaching-prompts-mon-7am'
  );
exception when others then null;
end $$;

-- Performance compute: lunes 6am Texas (12:00 UTC) — antes del weekly review
select cron.schedule('pm-compute-performance-mon-6am', '0 12 * * 1',
  $$select public.cron_invoke_function('pm-compute-performance')$$);

-- Coaching prompts: lunes 7:30am Texas (13:30 UTC) — después del weekly review
select cron.schedule('pm-coaching-prompts-mon-7am', '30 13 * * 1',
  $$select public.cron_invoke_function('pm-coaching-prompts')$$);

-- ============================================================
-- 11) Smoke tests
-- ============================================================
-- select * from public.pm_companies order by position;
-- select * from public.pm_executive_cross_company;
-- select * from public.pm_bottleneck_heatmap;
-- select jobname, schedule from cron.job where jobname like 'pm-%' order by jobname;
