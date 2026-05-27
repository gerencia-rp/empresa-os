-- ============================================================
-- Cache de precios de mercado por ciudad/trabajo
-- Ejecuta en Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.market_prices_cache (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  state text not null,
  job_key text not null,
  price_min numeric,
  price_typical numeric,
  price_max numeric,
  unit text not null default 'flat', -- 'flat' o 'per_sqft'
  source_summary text,
  fetched_at timestamptz not null default now(),
  fetched_by uuid references auth.users(id),
  unique(city, state, job_key)
);

create index if not exists mpc_city_idx on public.market_prices_cache(city, state);
create index if not exists mpc_freshness_idx on public.market_prices_cache(fetched_at desc);

alter table public.market_prices_cache enable row level security;

drop policy if exists mpc_select on public.market_prices_cache;
create policy mpc_select on public.market_prices_cache for select using (auth.role() = 'authenticated');

drop policy if exists mpc_write on public.market_prices_cache;
create policy mpc_write on public.market_prices_cache for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
