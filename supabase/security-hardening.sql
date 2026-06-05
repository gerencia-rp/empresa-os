-- SEGURIDAD: RLS hardening después de auditoría
-- Fix: audit_log permitía insert con check(true) → falsificación de logs
-- Fix: properties permitía UPDATE a cualquier authenticated → manipulación de obras ajenas

-- ════════════════════════════════════════════════════════════
-- 1) audit_log: restringir INSERT al user actual o admin (no falsificable)
-- ════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'audit_log') then
    execute 'alter table public.audit_log enable row level security';
    execute 'drop policy if exists audit_insert on public.audit_log';
    execute $sql$create policy audit_insert on public.audit_log
      for insert with check (
        auth.uid() = actor_id OR public.is_admin()
      )$sql$;
  end if;
end$$;

-- ════════════════════════════════════════════════════════════
-- 2) properties: solo admin o owner pueden modificar
-- (UPDATE/DELETE — el SELECT sigue abierto para que el equipo vea)
-- ════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'properties') then
    execute 'drop policy if exists properties_update on public.properties';
    execute $sql$create policy properties_update on public.properties
      for update using (public.is_admin())
      with check (public.is_admin())$sql$;
    execute 'drop policy if exists properties_delete on public.properties';
    execute $sql$create policy properties_delete on public.properties
      for delete using (public.is_admin())$sql$;
  end if;
end$$;

-- ════════════════════════════════════════════════════════════
-- 3) remodel_projects: idem — solo admin escribe (viewers leen)
-- ════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'remodel_projects') then
    -- Mantener SELECT abierto si ya está
    execute 'drop policy if exists rp_update on public.remodel_projects';
    execute $sql$create policy rp_update on public.remodel_projects
      for update using (public.is_admin())
      with check (public.is_admin())$sql$;
    execute 'drop policy if exists rp_delete on public.remodel_projects';
    execute $sql$create policy rp_delete on public.remodel_projects
      for delete using (public.is_admin())$sql$;
  end if;
end$$;

-- ════════════════════════════════════════════════════════════
-- 4) Trigger: prevenir race condition en "primer usuario = admin"
-- 2 signups simultáneos podían crear 2 admins.
-- ════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  is_first boolean;
begin
  -- Lock exclusivo evita race
  perform 1 from public.profiles for update;
  select count(*) = 0 into is_first from public.profiles;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, case when is_first then 'admin' else 'viewer' end)
  on conflict (id) do nothing;
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
