-- ============================================================
-- AI Analyses: cache central de análisis IA + web search
-- Usado por todos los sistemas (cashflow, cashout, loan, arv, etc.)
-- ============================================================

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  system_key text not null,
  context_hash text not null,
  context jsonb not null,
  result jsonb not null,
  raw_text text,
  sources jsonb default '[]'::jsonb,
  tokens_used int,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '14 days'
);

create index if not exists ai_analyses_lookup on public.ai_analyses(system_key, context_hash);
create index if not exists ai_analyses_expiry on public.ai_analyses(expires_at);

alter table public.ai_analyses enable row level security;

drop policy if exists ai_select on public.ai_analyses;
create policy ai_select on public.ai_analyses for select using (auth.role() = 'authenticated');

drop policy if exists ai_insert on public.ai_analyses;
create policy ai_insert on public.ai_analyses for insert with check (auth.role() = 'authenticated');
