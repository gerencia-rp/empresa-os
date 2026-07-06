-- ════════════════════════════════════════════════════════════════
-- ADMIN PANEL (OS /admin) — soft-delete + roles granulares + nivel por área
-- ADITIVA. Rollback documentado al pie. NO borra datos ni tablas.
-- ════════════════════════════════════════════════════════════════

-- 1) Soft-delete de usuarios (NUNCA hard-delete)
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists archived_at timestamptz;

-- 2) Nivel por área (mejora: ver vs editar). Shape: {"rentas":"edit","fix-flip":"view"}
--    Área presente en allowed_areas sin entrada acá = "view" (default).
alter table public.profiles add column if not exists area_levels jsonb not null default '{}'::jsonb;

-- 3) Roles granulares: admin / pm / editor / viewer
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['admin'::text, 'pm'::text, 'editor'::text, 'viewer'::text]));

-- 4) is_admin() ahora exige active=true (un admin desactivado pierde poderes)
create or replace function public.is_admin()
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

-- 5) Listado admin con último acceso (auth.users.last_sign_in_at).
--    SECURITY DEFINER + guard is_admin(): un no-admin recibe lista vacía.
create or replace function public.admin_users_overview()
returns table (
  id uuid, email text, role text, allowed_areas text[], area_levels jsonb,
  full_name text, phone text, active boolean, archived_at timestamptz,
  created_at timestamptz, last_sign_in_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select p.id, p.email, p.role, p.allowed_areas, p.area_levels,
         p.full_name, p.phone, p.active, p.archived_at,
         p.created_at, u.last_sign_in_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at;
$$;
revoke all on function public.admin_users_overview() from public, anon;
grant execute on function public.admin_users_overview() to authenticated;

-- ─────────────────────────────────────────────────────────────────
-- ROLLBACK (si algo se rompe):
--   drop function if exists public.admin_users_overview();
--   alter table public.profiles drop constraint if exists profiles_role_check;
--   alter table public.profiles add constraint profiles_role_check
--     check (role = any (array['admin'::text,'viewer'::text]));
--   create or replace function public.is_admin() returns boolean
--     language sql stable security definer as
--     'select exists (select 1 from public.profiles where id = auth.uid() and role = ''admin'')';
--   -- las columnas active/archived_at/area_levels pueden quedar (no molestan);
--   -- si hace falta: alter table public.profiles drop column active, drop column archived_at, drop column area_levels;
-- ─────────────────────────────────────────────────────────────────
