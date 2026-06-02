-- ============================================================
-- Agregar nickname/property_type a properties (usados por Ops Planner)
-- ============================================================

alter table public.properties
  add column if not exists nickname text,
  add column if not exists property_type text;

-- Índice opcional para búsqueda rápida por nickname
create index if not exists properties_nickname_idx on public.properties(nickname);
