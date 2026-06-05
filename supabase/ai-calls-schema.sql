-- Log estructurado de llamadas a Anthropic API.
-- Alimentado por supabase/functions/_shared/anthropic.ts
-- Útil para: cost tracking, debugging, rate-limit, dashboard de uso.

create table if not exists public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,                         -- 'presentation','fm-coach','whatsapp-generate', etc.
  model text,                                    -- 'claude-sonnet-4-5', etc.
  status text not null default 'success' check (status in ('success','error','timeout')),
  duration_ms int,
  tokens_in int,
  tokens_out int,
  cache_read int,
  cache_creation int,
  retried int default 0,
  error_message text,
  created_at timestamptz default now()
);

create index if not exists ai_calls_user_recent on public.ai_calls(user_id, created_at desc);
create index if not exists ai_calls_feature_status on public.ai_calls(feature, status, created_at desc);

alter table public.ai_calls enable row level security;

-- Admin ve todo. Cada user ve los suyos (analítica personal).
drop policy if exists ai_calls_select on public.ai_calls;
create policy ai_calls_select on public.ai_calls for select using (
  auth.role() = 'authenticated' AND (
    user_id = auth.uid() OR public.is_admin()
  )
);

-- Solo service_role inserta (vía el helper).
drop policy if exists ai_calls_insert on public.ai_calls;
create policy ai_calls_insert on public.ai_calls for insert with check (auth.role() = 'service_role');

-- Vista agregada: gasto por mes y feature
create or replace view public.ai_calls_monthly as
select
  date_trunc('month', created_at) as mes,
  feature,
  model,
  count(*) as calls,
  sum(tokens_in) as tokens_in_total,
  sum(tokens_out) as tokens_out_total,
  sum(cache_read) as cache_read_total,
  count(*) filter (where status = 'error') as errors,
  round(avg(duration_ms)) as avg_duration_ms
from public.ai_calls
group by 1, 2, 3
order by 1 desc, 4 desc;

grant select on public.ai_calls_monthly to authenticated;
