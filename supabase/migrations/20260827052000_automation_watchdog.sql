-- Vigilancia de automatizaciones críticas por ausencia de señal.
-- Un cron que no falla pero tampoco corre no puede considerarse saludable.
create table if not exists public.automation_expectations (
  jobname text primary key,
  area text not null,
  owner_agent text not null,
  max_silence_hours numeric not null check(max_silence_hours>0),
  criticality text not null default 'P1' check(criticality in('P1','P2','P3')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.automation_expectations enable row level security;
drop policy if exists automation_expectations_admin_read on public.automation_expectations;
create policy automation_expectations_admin_read on public.automation_expectations
  for select to authenticated using(public.is_admin());

insert into public.automation_expectations(jobname,area,owner_agent,max_silence_hours,criticality)
values
 ('cerebro-alertas','holding','Cerebro Ejecutivo',1,'P1'),
 ('cerebro-reunion-matutina','holding','Cerebro Matutino',30,'P1'),
 ('continuity-daily','holding','Director de Continuidad Operativa',30,'P1'),
 ('continuity-decision-sla','holding','Director de Continuidad Operativa',30,'P1'),
 ('continuity-absence-readiness','holding','Director de Continuidad Operativa',30,'P1'),
 ('data-integrity-daily','contable','Auditor de Integridad Financiera y Datos',30,'P1'),
 ('financial-exception-triage-daily','contable','Auditor de Integridad Financiera y Datos',30,'P1'),
 ('pm-sync-airtable-every-15min','rentas','Ejecución Rentas',1,'P1'),
 ('sync-airtable-every-30min','fix-flip','Ejecución Fix & Flip',2,'P1'),
 ('sync-clickup-every-60min','operacion','Director de Continuidad Operativa',2,'P1'),
 ('sync-remodel-workers-hourly','remodelacion','Ejecución Remodelación',2,'P1'),
 ('rentas-ejecucion-am','rentas','Ejecución Rentas',30,'P1'),
 ('rentas-financiero-cobros','rentas','Financiero Rentas',30,'P1'),
 ('rentas-gerente-foto','rentas','Gerente de Rentas',30,'P1'),
 ('rentas-optimizacion-diaria','rentas','Optimización Rentas',30,'P2'),
 ('rentas-reportes-ocupacion','rentas','Reportes Rentas',192,'P2'),
 ('remod-ejecucion-pulso','remodelacion','Ejecución Remodelación',30,'P1'),
 ('remod-draws-daily','remodelacion','Control de Draws y HML (Remodelación)',30,'P1'),
 ('remod-gerente-foto','remodelacion','Gerente de Remodelación',30,'P1'),
 ('remod-reportes-miercoles','remodelacion','Reportes Remodelación',192,'P2'),
 ('remod-quality-weekly','remodelacion','Calidad de Obra (Remodelación)',192,'P2'),
 ('ff-ejecucion-pulso','fix-flip','Ejecución Fix & Flip',30,'P1'),
 ('ff-gerente-foto','fix-flip','Gerente de Fix & Flip',30,'P1'),
 ('ff-financiero-underwriting','fix-flip','Financiero Fix & Flip',192,'P1'),
 ('ff-underwriting-semanal','fix-flip','Underwriting (Fix & Flip)',192,'P1'),
 ('ff-reportes-semanal','fix-flip','Reportes Fix & Flip',192,'P2'),
 ('student-success-daily','education','Gerente de Éxito Estudiantil',30,'P1'),
 ('security-audit-weekly','seguridad','Director de Continuidad Operativa',192,'P1')
on conflict(jobname) do update set area=excluded.area,owner_agent=excluded.owner_agent,
 max_silence_hours=excluded.max_silence_hours,criticality=excluded.criticality,active=true,updated_at=now();

create or replace view public.v_automation_health
with(security_invoker=true) as
with last_run as (
  select distinct on(d.jobid) d.jobid,d.start_time,d.end_time,d.status,d.return_message
  from cron.job_run_details d order by d.jobid,d.start_time desc
)
select e.jobname,e.area,e.owner_agent,e.criticality,e.max_silence_hours,
  j.jobid,j.active job_active,j.schedule,
  l.start_time last_start,l.end_time last_end,l.status last_status,l.return_message,
  round(extract(epoch from(now()-coalesce(l.start_time,e.created_at)))/3600,1) silence_hours,
  case
    when j.jobid is null then 'missing'
    when not j.active then 'disabled'
    when l.status='failed' then 'failed'
    when l.start_time is null and now()-e.created_at>make_interval(secs=>(e.max_silence_hours*3600)::double precision) then 'never_started'
    when l.start_time is not null and now()-l.start_time>make_interval(secs=>(e.max_silence_hours*3600)::double precision) then 'stale'
    else 'healthy'
  end health
from public.automation_expectations e
left join cron.job j on j.jobname=e.jobname
left join last_run l on l.jobid=j.jobid
where e.active;
grant select on public.v_automation_health to authenticated;

create or replace function public.run_automation_watchdog()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype;
  v_corte date := (now() at time zone 'America/Chicago')::date;
  v_total int:=0; v_healthy int:=0; v_issues int:=0;
  v_details jsonb:='[]'::jsonb; v_out jsonb;
begin
  select * into v_agent from public.agent_registry
   where nombre='Director de Continuidad Operativa' and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'Director de Continuidad Operativa no encontrado'; end if;

  select count(*),count(*) filter(where health='healthy'),count(*) filter(where health<>'healthy')
    into v_total,v_healthy,v_issues from public.v_automation_health;
  select coalesce(jsonb_agg(jsonb_build_object('automatizacion',jobname,'area',area,
    'responsable',owner_agent,'criticidad',criticality,'estado',health,
    'horas_sin_senal',silence_hours,'ultima_corrida',last_start,'ultimo_resultado',last_status)
    order by case criticality when 'P1' then 1 when 'P2' then 2 else 3 end,silence_hours desc),'[]'::jsonb)
    into v_details from public.v_automation_health where health<>'healthy';

  v_out:=jsonb_build_object(
    'resumen',case when v_issues=0 then 'Todas las automatizaciones críticas tienen señal dentro de su frecuencia esperada.'
      else v_issues||' automatizaciones requieren atención porque están vencidas, desactivadas, ausentes o fallaron.' end,
    'estado',case when exists(select 1 from public.v_automation_health where health<>'healthy' and criticality='P1')
      then 'atencion_inmediata' when v_issues>0 then 'seguimiento' else 'saludable' end,
    'kpis',jsonb_build_object('vigiladas',v_total,'saludables',v_healthy,'requieren_atencion',v_issues),
    'hallazgos',v_details,
    'recomendaciones',jsonb_build_array('Revisar primero P1 sin señal.','Confirmar una corrida y su evidencia antes de marcar recuperada.'),
    'fuentes',jsonb_build_array('automation_expectations','cron.job','cron.job_run_details'),
    'limite','El vigilante detecta y escala. No reactiva tareas, reintenta acciones sensibles ni modifica datos operativos.');

  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='salud_automatizaciones' and corte=v_corte and archived_at is null;
  if not found then insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('salud_automatizaciones',v_corte,'Salud de automatizaciones · '||v_corte,
      'borrador','ejecutor',v_out,v_agent.nombre); end if;

  if v_issues>0 and not exists(select 1 from public.agent_proposals where agent_id=v_agent.id
    and estado='propuesta' and deleted_at is null and payload->>'dedup_key'='automation-health:'||v_corte::text) then
    insert into public.agent_proposals(agent_id,tipo_accion,estado,payload,evidencia)
    values(v_agent.id,'cuello_botella','propuesta',jsonb_build_object(
      'dedup_key','automation-health:'||v_corte::text,'accion','recuperar_automatizaciones','requiere_aprobacion',true),v_out);
  end if;

  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent.id,jsonb_build_object('tipo','ejecucion_negocio','modo','automation_watchdog'),v_out,'ok');
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'result',v_out);
end $$;
revoke all on function public.run_automation_watchdog() from public;
grant execute on function public.run_automation_watchdog() to postgres,service_role;
comment on function public.run_automation_watchdog() is
 'Detecta automatizaciones críticas sin señal, ausentes, desactivadas o fallidas. Solo observa y escala.';

do $$ begin perform cron.unschedule(jobname) from cron.job where jobname='automation-watchdog-hourly';
exception when others then null; end $$;
select cron.schedule('automation-watchdog-hourly','20 * * * *',
  $$select public.run_automation_watchdog()$$);
select public.run_automation_watchdog();
