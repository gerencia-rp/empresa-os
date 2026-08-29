-- Asignación humana atómica y auditable para roles operativos críticos.
-- La interfaz no escribe la matriz directamente: confirma competencia,
-- disponibilidad y aceptación, mientras esta función valida identidad y accesos.

create table if not exists public.operational_role_assignment_history (
  id uuid primary key default gen_random_uuid(),
  role_code text not null references public.operational_role_assignments(role_code) on delete restrict,
  previous_primary_profile_id uuid references public.profiles(id) on delete set null,
  previous_backup_profile_id uuid references public.profiles(id) on delete set null,
  new_primary_profile_id uuid not null references public.profiles(id) on delete restrict,
  new_backup_profile_id uuid not null references public.profiles(id) on delete restrict,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  changed_at timestamptz not null default now(),
  reason text not null check (char_length(reason) between 8 and 500),
  check (new_primary_profile_id <> new_backup_profile_id)
);

create index if not exists operational_role_assignment_history_role_changed_idx
  on public.operational_role_assignment_history(role_code, changed_at desc);

alter table public.operational_role_assignment_history enable row level security;
drop policy if exists operational_role_assignment_history_admin_read
  on public.operational_role_assignment_history;
create policy operational_role_assignment_history_admin_read
  on public.operational_role_assignment_history
  for select to authenticated using (public.is_admin());

create or replace function public.assign_operational_role(
  p_role_code text,
  p_primary_profile_id uuid,
  p_backup_profile_id uuid,
  p_attested boolean,
  p_reason text default 'Confirmación administrativa desde Jarvis'
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_role public.operational_role_assignments%rowtype;
  v_primary_ok boolean := false;
  v_backup_ok boolean := false;
  v_reason text := nullif(btrim(p_reason),'');
  v_review jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode='42501', message='Solo un administrador activo puede confirmar esta cobertura.';
  end if;
  if p_attested is not true then
    raise exception using errcode='22023', message='Debes confirmar experiencia, disponibilidad y aceptación de ambas personas.';
  end if;
  if p_primary_profile_id is null or p_backup_profile_id is null then
    raise exception using errcode='22023', message='Selecciona titular y respaldo.';
  end if;
  if p_primary_profile_id = p_backup_profile_id then
    raise exception using errcode='22023', message='Titular y respaldo deben ser personas distintas.';
  end if;
  if v_reason is null or char_length(v_reason) < 8 or char_length(v_reason) > 500 then
    raise exception using errcode='22023', message='La nota de verificación debe tener entre 8 y 500 caracteres.';
  end if;

  select * into v_role
  from public.operational_role_assignments
  where role_code=p_role_code and active
  for update;
  if not found then
    raise exception using errcode='P0002', message='El rol operativo no existe o está inactivo.';
  end if;

  select exists(
    select 1 from public.profiles p
    where p.id=p_primary_profile_id and p.active is true and p.archived_at is null
      and (p.role='admin' or v_role.required_areas <@ coalesce(p.allowed_areas,'{}'::text[]))
  ) into v_primary_ok;
  select exists(
    select 1 from public.profiles p
    where p.id=p_backup_profile_id and p.active is true and p.archived_at is null
      and (p.role='admin' or v_role.required_areas <@ coalesce(p.allowed_areas,'{}'::text[]))
  ) into v_backup_ok;

  if not v_primary_ok or not v_backup_ok then
    raise exception using errcode='22023', message='Una de las personas no está activa o no conserva todos los accesos requeridos.';
  end if;

  update public.operational_role_assignments
  set primary_profile_id=p_primary_profile_id,
      backup_profile_id=p_backup_profile_id,
      verified_at=now(), verified_by=auth.uid(), updated_at=now()
  where role_code=p_role_code;

  insert into public.operational_role_assignment_history(
    role_code,previous_primary_profile_id,previous_backup_profile_id,
    new_primary_profile_id,new_backup_profile_id,changed_by,reason
  ) values(
    p_role_code,v_role.primary_profile_id,v_role.backup_profile_id,
    p_primary_profile_id,p_backup_profile_id,auth.uid(),v_reason
  );

  v_review := public.run_operational_role_review();
  return jsonb_build_object(
    'ok',true,'role_code',p_role_code,'verified_at',now(),
    'primary_profile_id',p_primary_profile_id,'backup_profile_id',p_backup_profile_id,
    'review',v_review
  );
end $$;

revoke all on function public.assign_operational_role(text,uuid,uuid,boolean,text) from public,anon;
grant execute on function public.assign_operational_role(text,uuid,uuid,boolean,text) to authenticated;

comment on table public.operational_role_assignment_history is
  'Historial inmutable de confirmaciones de titular y respaldo para roles operativos.';
comment on function public.assign_operational_role(text,uuid,uuid,boolean,text) is
  'Confirma cobertura con validación administrativa, accesos vigentes, atestación humana, historial y revisión atómica.';
