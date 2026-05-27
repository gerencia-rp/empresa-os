-- ============================================================
-- Estimador de Remodelación: tabla casos históricos + sistema
-- Ejecuta en Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create table if not exists public.renovation_cases (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  address text not null,
  sqft int not null,
  year_built int,
  contractor text,
  materials numeric default 0,
  labor numeric default 0,
  hours numeric default 0,
  internal_cost numeric default 0,
  days int,
  budget numeric default 0,
  sold_for numeric default 0,
  deviation_pct numeric default 0,
  status text default 'Finalizado',
  is_seed boolean default false,
  is_atypical boolean default false,
  is_calibrator boolean default false,
  validated boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.renovation_cases enable row level security;

drop policy if exists rc_select on public.renovation_cases;
create policy rc_select on public.renovation_cases for select using (auth.role() = 'authenticated');

drop policy if exists rc_insert on public.renovation_cases;
create policy rc_insert on public.renovation_cases for insert with check (auth.role() = 'authenticated');

drop policy if exists rc_delete on public.renovation_cases;
create policy rc_delete on public.renovation_cases for delete using (public.is_admin() or auth.uid() = created_by);

-- Seed con los 10 casos validados
insert into public.renovation_cases (code, address, sqft, year_built, contractor, materials, labor, hours, internal_cost, days, budget, sold_for, deviation_pct, is_seed, is_atypical, is_calibrator) values
  ('MEADOW',   '5702 Meadow Crst, Austin',     1026, 1996, 'Óscar',   19063.37, 21743.50, 1305, 42847.21,  50,  50000, 42847.21,   0,    true, false, false),
  ('VIRGINIA', '902 Virginia Dr, Round Rock',  1935, 2002, 'Adrián',  15857.71, 23383.25, 1643, 41203.01,  73,  85000, 41203.01,   0,    true, false, true),
  ('STONE',    '6504 Stonleigh Pl, Austin',    1204, 1976, 'Roberto',  2560.97,     0,       0,  2689.02,   3,  10000,  2689.02,   0,    true, true,  false),
  ('PICNIC',   '1607 Picnic Cove, Round Rock', 1243, 1993, 'Eduardo', 33398.23, 41080.21, 2332, 78202.36,  56,  85000, 76566.94,   2.14, true, false, true),
  ('BITTER',   '2511 Bitter Creek, Austin',    1252, 1972, 'Luis',    19442.98, 13895.93,  834, 35005.86,  54,  60000, 35005.86,   0,    true, false, false),
  ('IDLE',     '6107 Idlewood Cove, Austin',   1135, 1975, 'Vato',    33609.03, 35429.16, 1959, 72490.10,  69,  80000, 65000,     11.52, true, false, true),
  ('RAMBLE',   '514 Ramble Ln, Austin',        1519, 1972, 'Roberto', 56241.67, 43942.51, 2557,105193.39,  80, 150000,100000,      5.19, true, false, true),
  ('ARCADIA',  '1109 Arcadia Ave, Austin',     1509, 1956, 'Óscar',   34548.00, 43610.34, 2426, 82066.26,  69, 145000, 89790,     -8.60, true, false, true),
  ('BRAMBLE',  '512 Bramble Dr, Austin',       1666, 1969, 'Eduardo', 22577.15, 37620.81, 2257, 63207.86,  47,  95000, 41000,     54.17, true, false, false),
  ('GARDEN',   '1302 Garden Path Dr, RR',      1878, 1992, 'Vato',    20114.45, 25833.78, 1550, 48245.64,  43,  55000, 40000,     20.61, true, false, false)
on conflict (code) do nothing;

-- Sistema precargado en Fix & Flip
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('estimator-system', 'fix-flip', 'estimator', 'Estimador de Remodelación', '🧮',
   'Cotiza remodelaciones, mapea a formato LRC para lender, compara con casas históricas',
   '{}'::jsonb, '{}'::jsonb, 4)
on conflict (id) do nothing;
