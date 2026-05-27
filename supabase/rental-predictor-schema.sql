-- ============================================================
-- Predictor de Cashflow de Rentas
-- ============================================================

create table if not exists public.rental_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  property_address text,
  model text not null check (model in ('long_term','by_room','mid_term','short_term')),

  -- Inputs principales
  monthly_rent numeric default 0,
  bedrooms int default 3,
  bathrooms numeric default 2,
  arv numeric default 0,
  mortgage_monthly numeric default 2100,

  -- Para by_room
  rent_per_room numeric default 800,
  occupied_rooms int default 0,

  -- Para short_term
  nightly_rate numeric default 150,
  occupancy_pct numeric default 70,

  -- Gastos %
  property_tax_pct numeric default 1.8,
  insurance_monthly numeric default 150,
  hoa_monthly numeric default 0,
  vacancy_pct numeric default 7,
  maintenance_pct numeric default 8,
  capex_pct numeric default 5,
  property_mgmt_pct numeric default 0,
  platform_pct numeric default 0,
  utilities_monthly numeric default 0,
  cleaning_monthly numeric default 0,
  other_monthly numeric default 0,

  -- Inversión inicial (para CoC return)
  cash_invested numeric default 0,
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.rental_predictions enable row level security;

drop policy if exists rp_select on public.rental_predictions;
create policy rp_select on public.rental_predictions for select using (auth.role() = 'authenticated');

drop policy if exists rp_insert on public.rental_predictions;
create policy rp_insert on public.rental_predictions for insert with check (auth.role() = 'authenticated');

drop policy if exists rp_update on public.rental_predictions;
create policy rp_update on public.rental_predictions for update using (auth.role() = 'authenticated');

drop policy if exists rp_delete on public.rental_predictions;
create policy rp_delete on public.rental_predictions for delete using (auth.uid() = user_id or public.is_admin());

-- Sistema precargado en Rentas
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('rental-predictor', 'rentas', 'rental-predictor', 'Predictor de Cashflow',  '💵',
   'Analiza cuánto te deja una casa en renta por modelo de negocio (long-term, por habitación, mid-term, Airbnb)',
   '{}'::jsonb, '{}'::jsonb, 0)
on conflict (id) do nothing;
