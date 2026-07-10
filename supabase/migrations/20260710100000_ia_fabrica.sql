-- ════════════════════════════════════════════════════════════════
-- 🏭 FÁBRICA DE HERRAMIENTAS IA (v2 del departamento /ia)
-- Aditiva. Soft-delete `activo`. Sin DELETE policies.
--   ia_sessions : entrevistas del builder (transcript jsonb)
--   ia_artifacts: + carril/html/prompt_generador/solicitante/session_id
--                 (el HTML del carril libre lo publica la edge function
--                  ia-builder con service role — el usuario NO inserta directo)
--   ia_specs    : carril CON OK — prompts/specs pendientes de aprobación,
--                 NUNCA se auto-ejecutan; los construye un humano/Claude Code.
-- ia_requests (v1 buzón) queda en DB pero fuera de la UI.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.ia_sessions (
  id uuid primary key default gen_random_uuid(),
  creado_at timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  solicitante text,
  area text,
  transcript jsonb not null default '[]'::jsonb,
  estado text not null default 'activa' check (estado in ('activa','publicada','spec','abandonada')),
  activo boolean not null default true
);
create index if not exists ia_sessions_user_idx on public.ia_sessions (user_id) where activo;

alter table public.ia_artifacts add column if not exists carril text check (carril is null or carril in ('libre','ok'));
alter table public.ia_artifacts add column if not exists html text;
alter table public.ia_artifacts add column if not exists prompt_generador text;
alter table public.ia_artifacts add column if not exists solicitante text;
alter table public.ia_artifacts add column if not exists session_id uuid;

create table if not exists public.ia_specs (
  id uuid primary key default gen_random_uuid(),
  creado_at timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  session_id uuid,
  titulo text not null,
  area text,
  prompt_completo text not null,
  motivo text,
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado','construido','descartado')),
  solicitante text,
  nota text,
  activo boolean not null default true
);
create index if not exists ia_specs_estado_idx on public.ia_specs (estado) where activo;

alter table public.ia_sessions enable row level security;
alter table public.ia_specs enable row level security;

-- ia_sessions: cada uno la suya; gestores ('ia' o admin por bypass) ven todo
drop policy if exists ia_sessions_insert on public.ia_sessions;
create policy ia_sessions_insert on public.ia_sessions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists ia_sessions_select on public.ia_sessions;
create policy ia_sessions_select on public.ia_sessions
  for select to authenticated using (user_id = auth.uid() or public.has_area('ia'));
drop policy if exists ia_sessions_update on public.ia_sessions;
create policy ia_sessions_update on public.ia_sessions
  for update to authenticated using (user_id = auth.uid() or public.has_area('ia'))
  with check (user_id = auth.uid() or public.has_area('ia'));

-- ia_specs: el dueño ve las suyas; SOLO gestores editan estado/nota
drop policy if exists ia_specs_insert on public.ia_specs;
create policy ia_specs_insert on public.ia_specs
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists ia_specs_select on public.ia_specs;
create policy ia_specs_select on public.ia_specs
  for select to authenticated using (user_id = auth.uid() or public.has_area('ia'));
drop policy if exists ia_specs_update on public.ia_specs;
create policy ia_specs_update on public.ia_specs
  for update to authenticated using (public.has_area('ia')) with check (public.has_area('ia'));

-- ROLLBACK (manual):
--   drop table if exists public.ia_sessions;
--   drop table if exists public.ia_specs;
--   alter table public.ia_artifacts drop column if exists carril, drop column if exists html,
--     drop column if exists prompt_generador, drop column if exists solicitante, drop column if exists session_id;

-- ── ai_calls: telemetría de _shared/anthropic.ts (descubierto en QA: no existía
-- → checkRateLimit era no-op = riesgo de DoS económico). Escribe service_role.
create table if not exists public.ai_calls (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid,
  feature text,
  model text,
  status text,
  duration_ms integer,
  tokens_in integer,
  tokens_out integer,
  cache_read integer,
  cache_creation integer,
  retried integer default 0,
  error_message text
);
create index if not exists ai_calls_user_time_idx on public.ai_calls (user_id, created_at);
alter table public.ai_calls enable row level security;
drop policy if exists ai_calls_select on public.ai_calls;
create policy ai_calls_select on public.ai_calls
  for select to authenticated using (public.has_area('ia'));
