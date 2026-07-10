-- ════════════════════════════════════════════════════════════════
-- 🤖 DEPARTAMENTO IA — pedidos de automatización + galería de artefactos
-- Aditiva. Soft-delete con `activo`. Sin DELETE policies (solo soft-delete).
-- RLS:
--   ia_requests : INSERT cualquier autenticado (solo sus pedidos, user_id=auth.uid())
--                 SELECT propio o has_area('ia') · UPDATE solo has_area('ia')
--   ia_artifacts: SELECT autenticado (activo=true; gestores ven todo)
--                 escrituras solo has_area('ia')
-- has_area = SECURITY DEFINER con bypass de admin activo (migr 20260706110000):
-- los admins gestionan sin asignarse el área; un gestor no-admin recibe 'ia'
-- desde el Panel de Admin.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.ia_requests (
  id uuid primary key default gen_random_uuid(),
  creado_at timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  solicitante text,
  area text,
  descripcion text not null,
  frecuencia text,
  resultado_deseado text,
  ejemplo text,
  tipo text check (tipo is null or tipo in ('prompt','dashboard','agente','automatizacion')),
  impacto text,
  estado text not null default 'nueva' check (estado in ('nueva','en_revision','en_construccion','publicada','descartada')),
  nota text,
  activo boolean not null default true   -- soft-delete
);
create index if not exists ia_requests_estado_idx on public.ia_requests (estado) where activo;
create index if not exists ia_requests_user_idx on public.ia_requests (user_id);

create table if not exists public.ia_artifacts (
  id uuid primary key default gen_random_uuid(),
  creado_at timestamptz not null default now(),
  titulo text not null,
  area text,
  tipo text check (tipo is null or tipo in ('prompt','dashboard','agente','automatizacion')),
  descripcion text,
  ruta text,
  activo boolean not null default true   -- soft-delete
);
create index if not exists ia_artifacts_area_idx on public.ia_artifacts (area) where activo;

alter table public.ia_requests enable row level security;
alter table public.ia_artifacts enable row level security;

drop policy if exists ia_requests_insert on public.ia_requests;
create policy ia_requests_insert on public.ia_requests
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists ia_requests_select on public.ia_requests;
create policy ia_requests_select on public.ia_requests
  for select to authenticated using (user_id = auth.uid() or public.has_area('ia'));

drop policy if exists ia_requests_update on public.ia_requests;
create policy ia_requests_update on public.ia_requests
  for update to authenticated using (public.has_area('ia')) with check (public.has_area('ia'));

drop policy if exists ia_artifacts_select on public.ia_artifacts;
create policy ia_artifacts_select on public.ia_artifacts
  for select to authenticated using (activo or public.has_area('ia'));

drop policy if exists ia_artifacts_write on public.ia_artifacts;
create policy ia_artifacts_write on public.ia_artifacts
  for all to authenticated using (public.has_area('ia')) with check (public.has_area('ia'));

-- ROLLBACK (manual):
--   drop table if exists public.ia_requests;
--   drop table if exists public.ia_artifacts;
