-- ============================================================
-- Diagnósticos (Visita Previa) reutilizables para el Pronosticador
-- ============================================================

create table if not exists public.remodel_forecast_diagnoses (
  id uuid primary key default gen_random_uuid(),
  propiedad text not null,
  direccion text,
  sqft int,
  afectacion jsonb not null,
  precio_compra numeric default 0,
  fecha_inicio date,
  duracion_dias int default 0,
  source text default 'manual' check (source in ('manual','taskade','pronostico','json')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (propiedad, sqft)
);

create index if not exists rfd_propiedad on public.remodel_forecast_diagnoses(propiedad);
create index if not exists rfd_recent on public.remodel_forecast_diagnoses(updated_at desc);

alter table public.remodel_forecast_diagnoses enable row level security;
drop policy if exists rfd_all on public.remodel_forecast_diagnoses;
create policy rfd_all on public.remodel_forecast_diagnoses for all
  using (auth.role()='authenticated') with check (auth.role()='authenticated');
