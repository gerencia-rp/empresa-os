-- ============================================================
-- Deep Property Analyzer — análisis profundo con IA + web search
-- ============================================================

create table if not exists public.property_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  property_id uuid references public.properties(id) on delete cascade,
  address text not null,
  status text not null default 'pending' check (status in ('pending','analyzing','done','error')),
  error_message text,

  -- Inputs raw
  inputs jsonb not null default '{}'::jsonb,
  -- {
  --   listing_url: 'zillow.com/...',
  --   comps_urls: ['url1','url2'],
  --   strategy: 'BRRRR / Fix and Flip / Long-term hold',
  --   notes: 'free text',
  --   purchase_price: 200000, remodel_estimate: 40000, arv_estimate: 320000,
  --   sqft: 1500, beds: 3, baths: 2, year: 1980, lot: 7000,
  --   photo_paths: [],
  -- }

  -- Resultado del análisis (JSON estructurado)
  result jsonb default '{}'::jsonb,
  -- {
  --   executive_summary: '...',
  --   location_analysis: { neighborhood, schools_rating, crime, walkability, commute, gentrification },
  --   market_analysis: { arv_validated, comps_used, ppsf_avg, rent_estimates_by_model, market_trends, demand_supply },
  --   remodel_analysis: { scope_recommended, estimated_cost_range, hidden_costs, contractor_recommendations, timeline_days },
  --   financial_analysis: { brrrr_check, cashflow_estimates_by_model, cap_rate, coc_return, breakeven_analysis },
  --   risks: [],
  --   strengths: [],
  --   recommendation: { decision: 'buy'|'pass'|'negotiate', confidence_score: 1-10, max_offer_price, reasoning },
  --   next_steps: []
  -- }

  score numeric, -- 1-10 final recommendation score
  decision text check (decision in ('buy','pass','negotiate','review')),
  processed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists pa_property_idx on public.property_analyses(property_id);
create index if not exists pa_status_idx on public.property_analyses(status);

alter table public.property_analyses enable row level security;

drop policy if exists pa_select on public.property_analyses;
create policy pa_select on public.property_analyses for select using (auth.role() = 'authenticated');

drop policy if exists pa_insert on public.property_analyses;
create policy pa_insert on public.property_analyses for insert with check (auth.role() = 'authenticated');

drop policy if exists pa_update on public.property_analyses;
create policy pa_update on public.property_analyses for update using (auth.role() = 'authenticated');

drop policy if exists pa_delete on public.property_analyses;
create policy pa_delete on public.property_analyses for delete using (auth.uid() = user_id or public.is_admin());

-- Storage bucket para fotos del análisis
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', false)
on conflict (id) do nothing;

drop policy if exists "pp_storage_select" on storage.objects;
create policy "pp_storage_select" on storage.objects for select
  using (bucket_id = 'property-photos' and auth.role() = 'authenticated');

drop policy if exists "pp_storage_insert" on storage.objects;
create policy "pp_storage_insert" on storage.objects for insert
  with check (bucket_id = 'property-photos' and auth.role() = 'authenticated');

drop policy if exists "pp_storage_delete" on storage.objects;
create policy "pp_storage_delete" on storage.objects for delete
  using (bucket_id = 'property-photos' and auth.role() = 'authenticated');

-- Sistema precargado en Fix & Flip (posición top porque es la herramienta más poderosa)
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('deep-analyzer', 'fix-flip', 'deep-analyzer', 'Análisis Profundo de Propiedad', '🔬',
   'Análisis 360°: ubicación + mercado + comps + remodel + cashflow + decisión final con IA + web search',
   '{}'::jsonb, '{}'::jsonb, 1)
on conflict (id) do nothing;
