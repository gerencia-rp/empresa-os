-- ============================================================
-- Memoria central de propiedades (ficha por casa)
-- ============================================================

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  address text not null,
  city text default 'Austin',
  state text default 'TX',
  zip text,
  county text default 'Travis',

  -- Características
  bedrooms int default 3,
  bathrooms numeric default 2,
  sqft int,
  year_built int,
  lot_size_sqft int,

  -- Fix & Flip
  purchase_price numeric,
  arv numeric,
  payoff_hml numeric,
  cashout_estimated numeric,
  remodel_cost_estimated numeric,

  -- Refi
  mortgage_monthly numeric default 2100,
  ltv_pct numeric default 75,

  -- Status del deal
  status text default 'evaluating' check (status in ('evaluating','purchased','remodeling','renting','sold','declined')),
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists properties_status_idx on public.properties(status);

alter table public.properties enable row level security;

drop policy if exists prop_select on public.properties;
create policy prop_select on public.properties for select using (auth.role() = 'authenticated');

drop policy if exists prop_insert on public.properties;
create policy prop_insert on public.properties for insert with check (auth.role() = 'authenticated');

drop policy if exists prop_update on public.properties;
create policy prop_update on public.properties for update using (auth.role() = 'authenticated');

drop policy if exists prop_delete on public.properties;
create policy prop_delete on public.properties for delete using (public.is_admin() or auth.uid() = user_id);

-- Link rental_predictions con properties (opcional)
alter table public.rental_predictions add column if not exists property_id uuid references public.properties(id) on delete set null;

-- Mover sistema rental-predictor de 'rentas' a 'fix-flip'
update public.systems set area_id = 'fix-flip', position = 5,
  description = 'Cuánto te deja una casa en renta — para decidir si comprar (long-term, por hab, mid-term, Airbnb)'
where id = 'rental-predictor';
