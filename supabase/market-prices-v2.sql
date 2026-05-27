-- ============================================================
-- Expandir market_prices_cache con tiempos + crew + notes
-- Ejecuta en SQL Editor
-- ============================================================

alter table public.market_prices_cache add column if not exists duration_days_min numeric;
alter table public.market_prices_cache add column if not exists duration_days_typical numeric;
alter table public.market_prices_cache add column if not exists duration_days_max numeric;
alter table public.market_prices_cache add column if not exists crew_size_typical int;
alter table public.market_prices_cache add column if not exists notes text;
alter table public.market_prices_cache add column if not exists data_freshness_note text; -- "May 2026 Austin TX market"
