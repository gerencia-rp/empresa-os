-- ============================================================
-- Remodel Dashboard — KPIs, snapshots históricos, alertas, IA semanal
-- Espejo en Supabase de la base Airtable de Remodelación.
-- ============================================================

-- Espejo de propiedades (sync desde Airtable, idempotente por airtable_id)
create table if not exists public.remodel_at_properties (
  id uuid primary key default gen_random_uuid(),
  airtable_id text unique not null,
  address text,
  city text,
  lider text,
  proceso text,                  -- En construcción | Finalizado | etc
  avance_pct numeric,            -- 0-100
  gasto_materiales numeric,
  gasto_trabajadores numeric,
  presupuesto_interno numeric,
  valor_interno numeric,         -- materiales + trabajadores con markup
  valor_cliente numeric,
  ganancia numeric,
  desviacion_label text,         -- "⚪ En presupuesto" | "🟢 Ahorro" | "⚠️ Sobre"
  fecha_inicio date,
  fecha_estimada_fin date,
  fecha_real_fin date,
  dias_transcurridos text,       -- raw del campo Airtable
  fotos_url text,
  raw jsonb,                     -- payload completo de Airtable por si necesitamos algo
  last_synced_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists remodel_at_properties_proceso on public.remodel_at_properties(proceso);
create index if not exists remodel_at_properties_lider on public.remodel_at_properties(lider);

-- Snapshots diarios por casa (alimentan series temporales)
create table if not exists public.remodel_snapshots (
  id uuid primary key default gen_random_uuid(),
  airtable_id text not null,
  snapshot_date date not null,
  avance_pct numeric,
  gasto_materiales numeric,
  gasto_trabajadores numeric,
  gasto_total numeric,
  presupuesto numeric,
  dias_desde_inicio int,
  dias_hasta_fin_estimado int,
  spi numeric,                  -- Schedule Performance Index = avance% / tiempo_transcurrido%
  cpi numeric,                  -- Cost Performance Index = (presup * avance%) / gasto_total
  burn_rate numeric,            -- gasto_total / dias_desde_inicio
  proyeccion_costo_final numeric, -- burn_rate * dias_totales_estimados
  flags jsonb default '[]'::jsonb, -- ["atrasada","sobre_presupuesto","estancada"]
  created_at timestamptz default now(),
  unique(airtable_id, snapshot_date)
);

create index if not exists remodel_snapshots_at on public.remodel_snapshots(airtable_id, snapshot_date desc);

-- Alertas activas (se regeneran en cada sync)
create table if not exists public.remodel_alerts (
  id uuid primary key default gen_random_uuid(),
  airtable_id text not null,
  alert_type text not null,    -- atrasada|sobre_presupuesto|estancada|ratio_anormal|lider_negativo|mes_alto
  severity text not null,      -- critical|warning|info
  title text not null,
  detail text,
  metric_value numeric,
  threshold numeric,
  detected_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

create index if not exists remodel_alerts_active on public.remodel_alerts(resolved_at) where resolved_at is null;
create index if not exists remodel_alerts_at on public.remodel_alerts(airtable_id);

-- Insights IA semanales (uno por semana, todo el portfolio)
create table if not exists public.remodel_weekly_insights (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,  -- lunes de la semana
  summary_md text,                  -- markdown del análisis general
  obras_analizadas int,
  recomendaciones jsonb default '[]'::jsonb,
  ranking_lideres jsonb,
  alertas_resueltas int,
  alertas_nuevas int,
  cost_tokens_used int,
  created_at timestamptz default now()
);

-- Sync log (para debugging y mostrar "última sync hace X min")
create table if not exists public.remodel_sync_log (
  id uuid primary key default gen_random_uuid(),
  synced_at timestamptz default now(),
  records_synced int,
  snapshots_inserted int,
  alerts_generated int,
  duration_ms int,
  error text,
  triggered_by uuid references auth.users(id)
);

create index if not exists remodel_sync_log_recent on public.remodel_sync_log(synced_at desc);

-- RLS
alter table public.remodel_at_properties enable row level security;
alter table public.remodel_snapshots enable row level security;
alter table public.remodel_alerts enable row level security;
alter table public.remodel_weekly_insights enable row level security;
alter table public.remodel_sync_log enable row level security;

do $$ begin
  drop policy if exists rap_select on public.remodel_at_properties;
  drop policy if exists rs_select on public.remodel_snapshots;
  drop policy if exists ra_select on public.remodel_alerts;
  drop policy if exists rwi_select on public.remodel_weekly_insights;
  drop policy if exists rsl_select on public.remodel_sync_log;
end $$;

create policy rap_select on public.remodel_at_properties for select using (auth.role()='authenticated');
create policy rap_write on public.remodel_at_properties for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy rs_select on public.remodel_snapshots for select using (auth.role()='authenticated');
create policy rs_write on public.remodel_snapshots for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy ra_select on public.remodel_alerts for select using (auth.role()='authenticated');
create policy ra_write on public.remodel_alerts for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy rwi_select on public.remodel_weekly_insights for select using (auth.role()='authenticated');
create policy rwi_write on public.remodel_weekly_insights for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
create policy rsl_select on public.remodel_sync_log for select using (auth.role()='authenticated');
create policy rsl_write on public.remodel_sync_log for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- Sistema en área Remodelación
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('remodel-dashboard', 'remodelacion', 'remodel-dashboard', 'Dashboard de Obras', '📊',
   'KPIs, alertas y análisis profundo de las obras. Sync con Airtable + snapshots diarios.',
   '{}'::jsonb, '{}'::jsonb, 3)
on conflict (id) do nothing;
