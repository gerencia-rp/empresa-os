-- ============================================================
-- S2-G5 · Suppliers + Precios reales con histórico
-- ============================================================

create table if not exists public.remodel_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default 'general' check (type in ('general','materiales','labor','equipo','servicio','distribuidor')),
  contact_name text,
  phone text,
  email text,
  website text,
  city text,
  notes text,
  active bool default true,
  preferred bool default false,             -- supplier preferido por defecto
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id),
  unique (name)
);

create index if not exists remodel_suppliers_active on public.remodel_suppliers(active);
create index if not exists remodel_suppliers_preferred on public.remodel_suppliers(preferred) where preferred;

-- Histórico de precios por (supplier, activity_code)
create table if not exists public.remodel_supplier_prices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.remodel_suppliers(id) on delete cascade,
  activity_code text not null,              -- referencia a remodel_catalog_items.code (sin FK por compatibilidad histórica)
  unit_price numeric not null,
  unit text,                                -- por si quieren registrar precio en otra unidad
  quote_date date default current_date,
  valid_until date,
  notes text,
  source text,                              -- 'cotizacion' | 'factura' | 'estimado' | 'website'
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists remodel_prices_code_date on public.remodel_supplier_prices(activity_code, quote_date desc);
create index if not exists remodel_prices_supplier on public.remodel_supplier_prices(supplier_id);

-- View: último precio por supplier por código (para sugerencia en tiempo real)
create or replace view public.remodel_latest_supplier_prices as
select distinct on (sp.supplier_id, sp.activity_code)
  sp.supplier_id,
  s.name as supplier_name,
  s.preferred,
  sp.activity_code,
  sp.unit_price,
  sp.unit,
  sp.quote_date,
  sp.valid_until,
  sp.source
from public.remodel_supplier_prices sp
join public.remodel_suppliers s on s.id = sp.supplier_id
where s.active
order by sp.supplier_id, sp.activity_code, sp.quote_date desc;

-- View: mejor precio por código (mínimo) y precio del supplier preferido
create or replace view public.remodel_price_summary as
with latest as (
  select * from public.remodel_latest_supplier_prices
)
select
  activity_code,
  count(*) as num_suppliers,
  min(unit_price) as min_price,
  max(unit_price) as max_price,
  avg(unit_price)::numeric(10,2) as avg_price,
  (array_agg(unit_price order by quote_date desc))[1] as last_price_any,
  (array_agg(supplier_name order by case when preferred then 0 else 1 end, quote_date desc))[1] as preferred_supplier,
  (array_agg(unit_price order by case when preferred then 0 else 1 end, quote_date desc))[1] as preferred_price
from latest
group by activity_code;

-- RLS
alter table public.remodel_suppliers enable row level security;
alter table public.remodel_supplier_prices enable row level security;

drop policy if exists rs_select on public.remodel_suppliers;
create policy rs_select on public.remodel_suppliers for select using (auth.role()='authenticated');
drop policy if exists rs_write on public.remodel_suppliers;
create policy rs_write on public.remodel_suppliers for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

drop policy if exists rsp_select on public.remodel_supplier_prices;
create policy rsp_select on public.remodel_supplier_prices for select using (auth.role()='authenticated');
drop policy if exists rsp_write on public.remodel_supplier_prices;
create policy rsp_write on public.remodel_supplier_prices for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- Suppliers iniciales (Texas / Austin) — opcionales, fáciles de borrar
insert into public.remodel_suppliers (name, type, city, notes, preferred) values
  ('Home Depot Pro', 'materiales', 'Austin TX', 'Cuenta Pro 30 días, descuento volume', false),
  ('Lowes Pro', 'materiales', 'Austin TX', 'Cuenta Pro', false),
  ('Floor & Decor', 'materiales', 'Austin TX', 'Pisos, tile, backsplash — buenos precios bulk', false),
  ('IKEA', 'materiales', 'Austin TX', 'Cabinets cocina/bath, demora 2-4 semanas', false),
  ('Ferguson', 'materiales', 'Austin TX', 'Plumbing y HVAC mayorista', false)
on conflict (name) do nothing;

-- Smoke test
-- select * from public.remodel_suppliers;
-- select * from public.remodel_price_summary order by num_suppliers desc limit 20;
