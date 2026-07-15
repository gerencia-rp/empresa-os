-- 🗺️ Linaje v2 (pedido CEO 15-jul): "viene → número → alimenta" para CADA número.
-- Aditivo sobre data_lineage_map (14-jul):
--   metric_key  = slug único y estable del número (empresa|sistema|dato) — los componentes lo declaran
--   vista       = la vista v_* intermedia (si el número pasa por la capa de KPIs)
--   feeds       = métricas aguas abajo (metric_keys) — el grafo DOWNSTREAM curado;
--                 el módulo además calcula el inverso automático (misma tabla·columna / fórmula)
--   origen      = 'curado' | 'crawler' (los que descubre el gate de cobertura entran como crawler+pend)
-- Vista alias `data_lineage` (nombre canónico del prompt) con security_invoker.
-- lineage_coverage_runs: corridas del gate de cobertura (scripts/lineage-coverage.mjs) —
-- ci:gate exige última corrida fresca y 0 números visibles sin entrada.

create extension if not exists unaccent;

alter table data_lineage_map add column if not exists metric_key text;
alter table data_lineage_map add column if not exists vista text;
alter table data_lineage_map add column if not exists feeds text[] not null default '{}';
alter table data_lineage_map add column if not exists origen text not null default 'curado';

-- backfill metric_key = slug(empresa|sistema|dato), estable y legible
update data_lineage_map set metric_key =
  regexp_replace(lower(unaccent(empresa || '|' || sistema || '|' || dato)), '[^a-z0-9|]+', '_', 'g')
where metric_key is null;
create unique index if not exists data_lineage_map_metric_key on data_lineage_map (metric_key) where active;

-- backfill vista: cuando la "tabla" declarada es una vista v_*
update data_lineage_map set vista = (regexp_match(tabla, '(v_[a-z0-9_]+)'))[1]
where vista is null and tabla ~ 'v_[a-z0-9_]+';

create or replace view data_lineage with (security_invoker = on) as
  select metric_key, empresa, sistema, grupo, dato as etiqueta, base, tabla, columna, vista,
         formula, nota, feeds, estado, origen, editado_por, updated_at, orden
  from data_lineage_map where active;

create table if not exists lineage_coverage_runs (
  id bigint generated always as identity primary key,
  run_at timestamptz default now(),
  pantallas int not null,
  numeros_vistos int not null,
  con_linaje int not null,
  sin_linaje int not null,
  nuevos_registrados int not null default 0,
  detalle jsonb,
  ok boolean generated always as (sin_linaje = 0) stored
);
alter table lineage_coverage_runs enable row level security;
drop policy if exists lineage_cov_read on lineage_coverage_runs;
create policy lineage_cov_read on lineage_coverage_runs for select to authenticated
  using (has_area('fix-flip') or has_area('rentas') or has_area('remodelacion') or has_area('contable') or has_area('operacion'));
-- escribe solo el crawler (service role bypass)
