-- ============================================================
-- QW4 — Tags por proyecto
-- Agregar columna tags (text[]) a remodel_projects
-- ============================================================

alter table public.remodel_projects
  add column if not exists tags text[] default '{}'::text[];

-- Índice GIN para buscar por tag rápido
create index if not exists remodel_projects_tags_gin
  on public.remodel_projects using gin (tags);

-- Smoke test: lista distinct de tags activos
-- select unnest(tags) as tag, count(*) from public.remodel_projects group by 1 order by 2 desc;
