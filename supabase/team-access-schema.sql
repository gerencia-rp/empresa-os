-- ============================================================
-- Control de acceso por usuario y área (admin asigna visibilidad)
-- ============================================================

-- Lista de áreas visibles para el usuario (viewer). Admin ve todas.
alter table public.profiles add column if not exists allowed_areas text[] default '{}';

-- Helper para chequear visibilidad de área desde políticas o consultas
create or replace function public.user_can_see_area(p_area_id text)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'admin' or p_area_id = any(coalesce(allowed_areas, '{}'::text[])))
  );
$$;

-- Política de escritura para que el admin pueda crear/editar profiles (asignar áreas/roles)
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Backfill: los admins existentes no necesitan allowed_areas (ven todo).
-- Los viewers existentes quedan con array vacío hasta que el admin les asigne.
update public.profiles set allowed_areas = '{}' where allowed_areas is null;
