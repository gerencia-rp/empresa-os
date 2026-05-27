-- ============================================================
-- Appraisals: tabla + storage bucket + RLS
-- Ejecuta en Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create table if not exists public.appraisals (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending' check (status in ('pending','processing','done','error')),
  error_message text,
  pdf_path text not null,

  -- Datos extraídos por IA
  property_address text,
  city text,
  state text,
  zip text,
  county text,
  appraised_value numeric,
  effective_date date,

  gla_sqft numeric,
  lot_size_sqft numeric,
  year_built int,
  bedrooms int,
  bathrooms numeric,
  garage_spaces int,
  stories numeric,

  condition_rating text,
  quality_rating text,

  comparables jsonb default '[]'::jsonb,
  notes text,
  raw_extracted_data jsonb default '{}'::jsonb
);

-- Columna calculada $/sqft
alter table public.appraisals
  add column if not exists price_per_sqft numeric generated always as (
    case when gla_sqft > 0 then appraised_value / gla_sqft else null end
  ) stored;

create index if not exists appraisals_zip_idx on public.appraisals(zip);
create index if not exists appraisals_status_idx on public.appraisals(status);

alter table public.appraisals enable row level security;

drop policy if exists appraisals_select on public.appraisals;
create policy appraisals_select on public.appraisals for select
  using (auth.role() = 'authenticated');

drop policy if exists appraisals_insert on public.appraisals;
create policy appraisals_insert on public.appraisals for insert
  with check (auth.role() = 'authenticated');

drop policy if exists appraisals_update on public.appraisals;
create policy appraisals_update on public.appraisals for update
  using (auth.role() = 'authenticated');

drop policy if exists appraisals_delete on public.appraisals;
create policy appraisals_delete on public.appraisals for delete
  using (public.is_admin());

-- ============================================================
-- Storage bucket para PDFs
-- ============================================================
insert into storage.buckets (id, name, public)
values ('appraisals', 'appraisals', false)
on conflict (id) do nothing;

drop policy if exists "appraisals_storage_select" on storage.objects;
create policy "appraisals_storage_select" on storage.objects for select
  using (bucket_id = 'appraisals' and auth.role() = 'authenticated');

drop policy if exists "appraisals_storage_insert" on storage.objects;
create policy "appraisals_storage_insert" on storage.objects for insert
  with check (bucket_id = 'appraisals' and auth.role() = 'authenticated');

drop policy if exists "appraisals_storage_delete" on storage.objects;
create policy "appraisals_storage_delete" on storage.objects for delete
  using (bucket_id = 'appraisals' and auth.role() = 'authenticated');

-- ============================================================
-- Sistema "Appraisals" precargado en Fix & Flip
-- ============================================================
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('appraisals-system', 'fix-flip', 'appraisals', 'Appraisals', '📂',
   'Sube PDFs de appraisals — IA extrae datos automáticamente',
   '{}'::jsonb, '{}'::jsonb, 1)
on conflict (id) do nothing;
