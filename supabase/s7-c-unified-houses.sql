-- ============================================================
-- S7-C · Unificar casas across los 3 sistemas
-- View que une remodel_projects (Estimador) + remodel_at_properties (Airtable)
--                 + by_casa de clickup_snapshots (ClickUp)
-- Match heurístico por address normalizada.
-- ============================================================

-- Función helper para normalizar direcciones (lower, sin puntuación, sin espacios extra)
create or replace function public.normalize_address(addr text)
returns text language sql immutable as $$
  select lower(trim(regexp_replace(coalesce(addr, ''), '[^a-zA-Z0-9 ]', '', 'g')));
$$;

-- Tabla de manual matching (override si la heurística falla)
create table if not exists public.house_link_overrides (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.remodel_projects(id) on delete cascade,
  airtable_id text,                              -- remodel_at_properties.airtable_id
  clickup_folder_id text,                        -- folder de ClickUp
  manual_address_match text,                     -- address compartido si fue match manual
  note text,
  created_at timestamptz default now()
);

create index if not exists hlo_project on public.house_link_overrides(project_id);

-- View unificada — fuente de verdad para "qué sabemos de esta casa"
create or replace view public.unified_houses as
with airtable_norm as (
  select airtable_id, address, normalize_address(address) as nadr,
    lider, proceso, avance_pct,
    (coalesce(gasto_materiales,0) + coalesce(gasto_trabajadores,0)) as gasto_total,
    presupuesto_interno, valor_cliente, ganancia, desviacion_label,
    fecha_inicio, fecha_estimada_fin, fecha_real_fin
  from public.remodel_at_properties
),
estimador_norm as (
  select id as project_id, name, address, normalize_address(address) as nadr,
    status, sqft, budget_total, real_total, start_date, end_date_estimated, completed_at,
    activities
  from public.remodel_projects
),
clickup_extract as (
  select s.snapshot_date, e.value->>'name' as folder_name,
    normalize_address(e.value->>'name') as nadr,
    (e.value->>'open')::int as cu_open,
    (e.value->>'closed')::int as cu_closed,
    (e.value->>'pct')::numeric as cu_pct,
    (e.value->>'last_activity_iso')::timestamptz as cu_last_activity,
    e.key as folder_id
  from public.clickup_snapshots s,
    jsonb_each(coalesce(s.by_casa, '{}'::jsonb)) e
  where s.snapshot_date = (select max(snapshot_date) from public.clickup_snapshots)
)
select
  coalesce(e.nadr, a.nadr, c.nadr) as nadr,
  coalesce(e.address, a.address, c.folder_name) as display_address,
  e.project_id,
  a.airtable_id,
  c.folder_id as clickup_folder_id,
  -- Estado consolidado
  coalesce(a.proceso, e.status) as status_consolidated,
  coalesce(a.avance_pct, c.cu_pct,
    case when e.activities is not null then jsonb_array_length(e.activities) * 0 else null end
  ) as avance_pct,
  e.sqft,
  a.lider as lider_airtable,
  -- Costos
  coalesce(a.gasto_total, e.real_total) as costo_real,
  coalesce(a.presupuesto_interno, e.budget_total) as presupuesto,
  a.valor_cliente,
  a.ganancia,
  -- Cronograma
  coalesce(a.fecha_inicio, e.start_date) as fecha_inicio,
  coalesce(a.fecha_estimada_fin, e.end_date_estimated) as fecha_estimada_fin,
  coalesce(a.fecha_real_fin, e.completed_at::date) as fecha_real_fin,
  -- ClickUp ops
  c.cu_open,
  c.cu_closed,
  c.cu_last_activity,
  a.desviacion_label,
  -- Match status: 'full' (3 fuentes), 'two' (2 fuentes), 'estimador_only', 'airtable_only', 'clickup_only'
  case
    when e.project_id is not null and a.airtable_id is not null and c.folder_id is not null then 'full'
    when (e.project_id is not null)::int + (a.airtable_id is not null)::int + (c.folder_id is not null)::int = 2 then 'two'
    when e.project_id is not null then 'estimador_only'
    when a.airtable_id is not null then 'airtable_only'
    when c.folder_id is not null then 'clickup_only'
    else 'unknown'
  end as match_quality
from estimador_norm e
full outer join airtable_norm a on a.nadr = e.nadr
full outer join clickup_extract c on c.nadr = coalesce(e.nadr, a.nadr);

-- pg_trgm para similarity (idempotente, ANTES del view que lo usa)
create extension if not exists pg_trgm;

-- View de match suggestions (casas que parecen ser la misma pero no matchearon)
create or replace view public.house_match_suggestions as
with all_nadrs as (
  select 'estimador'::text as src, id::text as entity_id, name as label, public.normalize_address(address) as nadr from public.remodel_projects where address is not null
  union all
  select 'airtable'::text as src, airtable_id as entity_id, address as label, public.normalize_address(address) as nadr from public.remodel_at_properties where address is not null
)
select a.src as src_a, a.entity_id as id_a, a.label as label_a,
       b.src as src_b, b.entity_id as id_b, b.label as label_b,
       similarity(a.nadr, b.nadr) as score
from all_nadrs a
cross join all_nadrs b
where a.src < b.src
  and a.nadr <> b.nadr
  and similarity(a.nadr, b.nadr) >= 0.5
order by score desc
limit 50;

-- RLS
alter table public.house_link_overrides enable row level security;

drop policy if exists hlo_all on public.house_link_overrides;
create policy hlo_all on public.house_link_overrides for all
  using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- Smoke tests
-- select match_quality, count(*) from public.unified_houses group by match_quality order by 2 desc;
-- select * from public.house_match_suggestions limit 20;
