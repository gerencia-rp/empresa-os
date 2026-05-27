-- ============================================================
-- Empresa OS — Supabase schema
-- Ejecuta este archivo en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Tabla de perfiles (extiende auth.users con rol)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('admin','viewer')),
  created_at timestamptz not null default now()
);

-- 2. Áreas
create table if not exists public.areas (
  id text primary key,
  name text not null,
  icon text default '📁',
  description text default '',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Sistemas dentro de áreas
create table if not exists public.systems (
  id text primary key,
  area_id text not null references public.areas(id) on delete cascade,
  type text not null,
  name text not null,
  icon text default '',
  description text default '',
  config jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists systems_area_id_idx on public.systems(area_id);

-- 4. Trigger: auto-crear perfil cuando alguien se registra
-- El PRIMER usuario que se registre será admin. Los demás, viewer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_count int;
begin
  select count(*) into user_count from public.profiles;
  insert into public.profiles (id, email, role)
  values (new.id, new.email, case when user_count = 0 then 'admin' else 'viewer' end);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Trigger: actualizar updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_areas_updated_at on public.areas;
create trigger set_areas_updated_at before update on public.areas
  for each row execute function public.set_updated_at();

drop trigger if exists set_systems_updated_at on public.systems;
create trigger set_systems_updated_at before update on public.systems
  for each row execute function public.set_updated_at();

-- ============================================================
-- 6. Row Level Security (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.systems enable row level security;

-- Helper: ¿el usuario actual es admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- PROFILES: cada usuario ve su perfil; admins ven todos
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update
  using (public.is_admin());

-- AREAS: todos los autenticados leen; solo admins escriben
drop policy if exists areas_select on public.areas;
create policy areas_select on public.areas for select
  using (auth.role() = 'authenticated');

drop policy if exists areas_admin_write on public.areas;
create policy areas_admin_write on public.areas for all
  using (public.is_admin()) with check (public.is_admin());

-- SYSTEMS: todos los autenticados leen y EDITAN data (para checklists, calculadora, etc.)
-- Solo admins crean/eliminan sistemas o editan config
drop policy if exists systems_select on public.systems;
create policy systems_select on public.systems for select
  using (auth.role() = 'authenticated');

drop policy if exists systems_admin_insert on public.systems;
create policy systems_admin_insert on public.systems for insert
  with check (public.is_admin());

drop policy if exists systems_admin_delete on public.systems;
create policy systems_admin_delete on public.systems for delete
  using (public.is_admin());

-- Update: admins pueden editar todo. Viewers solo el campo data (gestionado en app).
drop policy if exists systems_update on public.systems;
create policy systems_update on public.systems for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- 7. Datos iniciales: 3 áreas
-- ============================================================
insert into public.areas (id, name, icon, description, position) values
  ('fix-flip', 'Fix & Flip', '🏚️', 'Operación de compra, remodelación y venta de propiedades', 0),
  ('remodelacion', 'Remodelación', '🔨', 'Empresa constructora — gestiona obras de todas las casas', 1),
  ('rentas', 'Rentas / Property Mgmt', '🏠', 'Administración de propiedades en renta', 2)
on conflict (id) do nothing;

-- Calculadora cash-out preinstalada en Fix & Flip
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('cashout-refi', 'fix-flip', 'cashout', 'Calculadora Cash-Out Refi', '💰',
   'Estima cash-out al refinanciar de Hard Money a préstamo convencional',
   '{}'::jsonb,
   '{"arv":380000,"ltv":75,"payoff":211543,"origination":1455,"appraisal":400,"prepaidInterest":1460,"taxEscrow":5285,"insuranceEscrow":2787,"titleFees":5470,"other":8700}'::jsonb,
   0)
on conflict (id) do nothing;
