-- ============================================================
-- Perfil editable (nombre, teléfono, etc.) + audit log de cambios
-- ============================================================

-- Campos extra de perfil
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz default now();

-- Trigger para actualizar updated_at en profiles
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Audit log: registra inserts/updates/deletes en tablas críticas
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_email text,
  table_name text not null,
  record_id text,
  action text not null check (action in ('insert','update','delete')),
  changes jsonb,
  created_at timestamptz default now()
);
create index if not exists audit_log_recent on public.audit_log(created_at desc);
create index if not exists audit_log_actor on public.audit_log(actor_id);
create index if not exists audit_log_table on public.audit_log(table_name);

alter table public.audit_log enable row level security;
drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log for select using (public.is_admin());
drop policy if exists audit_system_insert on public.audit_log;
create policy audit_system_insert on public.audit_log for insert with check (true);

-- Función trigger genérica: registra qué cambió, quién lo hizo
create or replace function public.fn_audit_change()
returns trigger language plpgsql security definer as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_changes jsonb;
  v_record_id text;
  v_action text;
begin
  -- Email del actor (puede ser null si es una función security_definer sin sesión)
  select email into v_email from public.profiles where id = v_actor;

  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_record_id := (new.id)::text;
    v_changes := jsonb_build_object('summary', 'creado');
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_record_id := (new.id)::text;
    -- Solo los campos que cambiaron
    v_changes := (
      select jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
      from (
        select key,
               to_jsonb(old) -> key as old_val,
               to_jsonb(new) -> key as new_val
        from jsonb_object_keys(to_jsonb(new)) as t(key)
        where (to_jsonb(old) -> key) is distinct from (to_jsonb(new) -> key)
          and key not in ('updated_at')  -- ignorar timestamps automáticos
      ) diffs
    );
    -- Si no cambió nada relevante, no registrar
    if v_changes is null or v_changes = '{}'::jsonb then
      return new;
    end if;
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_record_id := (old.id)::text;
    v_changes := jsonb_build_object('summary', 'eliminado');
  end if;

  insert into public.audit_log (actor_id, actor_email, table_name, record_id, action, changes)
  values (v_actor, v_email, tg_table_name, v_record_id, v_action, v_changes);

  return coalesce(new, old);
end;
$$;

-- Activar triggers en tablas críticas
drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.fn_audit_change();

drop trigger if exists audit_areas on public.areas;
create trigger audit_areas after insert or update or delete on public.areas
  for each row execute function public.fn_audit_change();

drop trigger if exists audit_systems on public.systems;
create trigger audit_systems after insert or update or delete on public.systems
  for each row execute function public.fn_audit_change();

-- Función para que el admin vea profiles + last_sign_in_at (de auth.users)
create or replace function public.get_team_audit()
returns table (
  id uuid, email text, role text, allowed_areas text[],
  full_name text, phone text,
  last_sign_in_at timestamptz, created_at timestamptz
)
language sql security definer stable as $$
  select p.id, p.email, p.role, p.allowed_areas, p.full_name, p.phone,
         u.last_sign_in_at, p.created_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  where public.is_admin()
  order by u.last_sign_in_at desc nulls last;
$$;
