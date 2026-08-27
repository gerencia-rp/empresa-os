-- Cobertura humana verificable para decisiones y continuidad.
-- No asigna personas por inferencia: una responsabilidad solo cuenta como
-- cubierta cuando un administrador confirma titular y respaldo explícitos.

create table if not exists public.operational_role_assignments (
  role_code text primary key,
  role_name text not null,
  area text not null,
  criticality text not null default 'P2' check (criticality in ('P1','P2','P3')),
  primary_profile_id uuid references public.profiles(id) on delete set null,
  backup_profile_id uuid references public.profiles(id) on delete set null,
  required_areas text[] not null default '{}',
  active boolean not null default true,
  notes text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (primary_profile_id is null or backup_profile_id is null or primary_profile_id <> backup_profile_id)
);

alter table public.operational_role_assignments enable row level security;
drop policy if exists operational_role_assignments_read on public.operational_role_assignments;
create policy operational_role_assignments_read on public.operational_role_assignments
  for select to authenticated using (public.is_admin());
drop policy if exists operational_role_assignments_admin_write on public.operational_role_assignments;
create policy operational_role_assignments_admin_write on public.operational_role_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.operational_role_assignments
  (role_code,role_name,area,criticality,required_areas,notes)
values
  ('controller','Controller','contable','P1',array['contable'],'Valida conciliación, caja, nómina y controles financieros.'),
  ('continuity_director','Director de Continuidad Operativa','operacion','P1',array['operacion'],'Coordina excepciones, respaldos y recuperación.'),
  ('agent_auditor','Auditor de Agentes','operacion','P1',array['operacion'],'Control independiente de agentes, evidencia y calidad.'),
  ('rentals_manager','Gerente de Rentas','rentas','P1',array['rentas'],'Responsable de ocupación, cobranza y servicio.'),
  ('remodel_manager','Gerente de Remodelación','remodelacion','P1',array['remodelacion'],'Responsable de obra, presupuesto, calidad y nómina.'),
  ('fix_flip_manager','Gerente de Fix & Flip','fix-flip','P1',array['fix-flip'],'Responsable de pipeline, underwriting, venta y capital.'),
  ('student_success_manager','Gerente de Éxito Estudiantil','education','P2',array['education'],'Responsable de planes, progreso y excepciones estudiantiles.'),
  ('executive_backup','Respaldo Ejecutivo','holding','P1',array['operacion','contable'],'Autoridad de contingencia cuando dirección no está disponible.')
on conflict (role_code) do update set
  role_name=excluded.role_name,area=excluded.area,criticality=excluded.criticality,
  required_areas=excluded.required_areas,notes=excluded.notes,updated_at=now();

create or replace view public.v_operational_role_coverage
with (security_invoker=true) as
select r.role_code,r.role_name,r.area,r.criticality,r.required_areas,r.active,
  r.primary_profile_id,r.backup_profile_id,r.verified_at,
  (p.id is not null and coalesce(p.active,true) and p.archived_at is null
    and (p.role='admin' or r.required_areas <@ coalesce(p.allowed_areas,'{}'::text[]))) primary_ready,
  (b.id is not null and coalesce(b.active,true) and b.archived_at is null
    and (b.role='admin' or r.required_areas <@ coalesce(b.allowed_areas,'{}'::text[]))) backup_ready
from public.operational_role_assignments r
left join public.profiles p on p.id=r.primary_profile_id
left join public.profiles b on b.id=r.backup_profile_id
where r.active;

grant select on public.v_operational_role_coverage to authenticated;

create or replace function public.run_operational_role_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent_id uuid; v_total int:=0; v_primary int:=0; v_backup int:=0; v_uncovered int:=0;
  v_out jsonb; v_corte date := (now() at time zone 'America/Chicago')::date;
begin
  select id into v_agent_id from public.agent_registry
   where nombre='Director de Continuidad Operativa' and deleted_at is null limit 1;
  if v_agent_id is null then raise exception 'Director de Continuidad Operativa no encontrado'; end if;

  select count(*),count(*) filter(where primary_ready),count(*) filter(where backup_ready),
    count(*) filter(where not primary_ready or not backup_ready)
  into v_total,v_primary,v_backup,v_uncovered
  from public.v_operational_role_coverage;

  v_out:=jsonb_build_object(
    'corte',v_corte,'roles_criticos',v_total,'titulares_listos',v_primary,
    'respaldos_listos',v_backup,'roles_sin_cobertura_completa',v_uncovered,
    'severidad',case when v_uncovered>0 then 'atencion' else 'saludable' end,
    'regla','Ningún rol cuenta como cubierto sin titular, respaldo, acceso de área y verificación administrativa.',
    'proxima_accion',case when v_uncovered>0 then 'Asignar y verificar titular y respaldo para cada rol pendiente.' else 'Probar sustitución trimestral y mantener accesos vigentes.' end,
    'fuente','v_operational_role_coverage');

  insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
  values('cobertura_roles_operativos',v_corte,'Cobertura de roles operativos · '||v_corte,
    'borrador','ejecutor',v_out,'Director de Continuidad Operativa')
  on conflict do nothing;

  if v_uncovered>0 and not exists(
    select 1 from public.agent_proposals where agent_id=v_agent_id and estado='propuesta'
      and deleted_at is null and payload->>'dedup_key'='role-coverage:'||v_corte::text
  ) then
    insert into public.agent_proposals(agent_id,tipo_accion,estado,payload,evidencia)
    values(v_agent_id,'cuello_botella','propuesta',
      jsonb_build_object('dedup_key','role-coverage:'||v_corte::text,'accion','asignar_cobertura_humana','requiere_aprobacion',true),v_out);
  end if;

  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent_id,jsonb_build_object('tipo','ejecucion_negocio','modo','role_coverage'),v_out,'ok');
  return jsonb_build_object('ok',true,'result',v_out);
end $$;

revoke all on function public.run_operational_role_review() from public;
grant execute on function public.run_operational_role_review() to postgres,service_role;

do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname='continuity-role-coverage';
exception when others then null; end $$;
select cron.schedule('continuity-role-coverage','25 13 * * 1',
  $$select public.run_operational_role_review()$$);

comment on table public.operational_role_assignments is
  'Titular y respaldo humano verificados por rol operativo. No se completa por inferencia.';
comment on function public.run_operational_role_review() is
  'Audita semanalmente titular, respaldo y permisos por rol; solo reporta y propone.';
