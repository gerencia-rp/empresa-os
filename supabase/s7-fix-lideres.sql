-- ============================================================
-- S7-Fix · Resolver IDs de Airtable (linked records) → nombres
-- Cache local para que los dashboards muestren "Eduardo", "Roberto"
-- en vez de "rec0IDKJEA7gq2xSy".
-- ============================================================

create table if not exists public.airtable_record_names (
  record_id text primary key,           -- ej. 'rec0IDKJEA7gq2xSy'
  name text not null,                   -- ej. 'Eduardo'
  table_ref text,                       -- ej. 'cuadrillas' | 'contactos' | etc
  base_id text,                         -- ej. 'appwFRqnkyyRljOld'
  last_synced_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists arn_table on public.airtable_record_names(table_ref);

-- RLS
alter table public.airtable_record_names enable row level security;

drop policy if exists arn_all on public.airtable_record_names;
create policy arn_all on public.airtable_record_names for all
  using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- Helper para uso en queries: resolver un text o array de text a nombre legible
create or replace function public.resolve_airtable_name(p text)
returns text language sql stable as $$
  select coalesce(
    (select name from public.airtable_record_names where record_id = p),
    p
  );
$$;

-- Smoke
-- select * from public.airtable_record_names order by table_ref, name;
