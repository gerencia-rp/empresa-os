-- A newly catalogued weekly/monthly job has not failed before its first due
-- window. Keep it neutral as pending_first_run instead of showing a false red
-- or a false green. Result-sensitive integrations still require real evidence.

create or replace view public.v_automation_effective_health
with(security_invoker=true) as
with clickup as (
  select synced_at evidence_at,error evidence_error
  from public.clickup_sync_log order by synced_at desc limit 1
), rentas as (
  select finished_at evidence_at,
    case when status='success' and error_message is null then null
      else coalesce(error_message,'La sincronización terminó con estado '||coalesce(status,'desconocido')) end evidence_error,
    status from public.pm_sync_log where source='airtable' order by started_at desc limit 1
), remodelacion as (
  select synced_at evidence_at,error evidence_error
  from public.remodel_sync_log order by synced_at desc limit 1
), ff_parity as (
  select min(checked_at) evidence_at,count(*)::int total,
    count(*) filter(where in_sync)::int correctas
  from public.remodel_sync_parity where source in('ff_deals','ff_draws','ff_investors','ff_hml_loans')
)
select h.*,
  case h.jobname
    when 'sync-clickup-every-60min' then 'clickup_sync_log'
    when 'pm-sync-airtable-every-15min' then 'pm_sync_log'
    when 'sync-remodel-workers-hourly' then 'remodel_sync_log'
    when 'sync-airtable-every-30min' then 'remodel_sync_parity'
    else case when h.last_end is null and h.health='healthy'
      then 'automation_expectations · periodo inicial' else 'cron.job_run_details' end
  end evidence_source,
  case h.jobname
    when 'sync-clickup-every-60min' then c.evidence_at
    when 'pm-sync-airtable-every-15min' then r.evidence_at
    when 'sync-remodel-workers-hourly' then m.evidence_at
    when 'sync-airtable-every-30min' then p.evidence_at
    else coalesce(h.last_end,ae.created_at)
  end evidence_at,
  case h.jobname
    when 'sync-clickup-every-60min' then c.evidence_error
    when 'pm-sync-airtable-every-15min' then r.evidence_error
    when 'sync-remodel-workers-hourly' then m.evidence_error
    when 'sync-airtable-every-30min' then case
      when p.total<4 then format('Solo %s/4 entidades de Fix & Flip tienen evidencia de paridad',p.total)
      when p.correctas<p.total then format('%s/%s entidades están reconciliadas',p.correctas,p.total)
      else null end
    else case when h.last_end is null and h.health<>'healthy'
      then 'Sin corrida dentro del tiempo máximo permitido' else null end
  end evidence_error,
  case
    when h.health<>'healthy' then h.health
    when h.jobname='sync-clickup-every-60min' and
      (c.evidence_at is null or c.evidence_at<now()-interval '2 hours' or c.evidence_error is not null)
      then 'failed_result'
    when h.jobname='pm-sync-airtable-every-15min' and
      (r.evidence_at is null or r.evidence_at<now()-interval '1 hour' or r.evidence_error is not null)
      then 'failed_result'
    when h.jobname='sync-remodel-workers-hourly' and
      (m.evidence_at is null or m.evidence_at<now()-interval '2 hours' or m.evidence_error is not null)
      then 'failed_result'
    when h.jobname='sync-airtable-every-30min' and
      (p.evidence_at is null or p.evidence_at<now()-interval '2 hours' or p.total<4 or p.correctas<p.total)
      then 'failed_result'
    when h.last_end is null then 'pending_first_run'
    else 'healthy'
  end effective_health
from public.v_automation_health h
join public.automation_expectations ae using(jobname)
left join clickup c on true
left join rentas r on true
left join remodelacion m on true
left join ff_parity p on true;

grant select on public.v_automation_effective_health to authenticated;
comment on view public.v_automation_effective_health is
  'Salud efectiva: exige resultados reales, conserva la gracia inicial y distingue pendiente de primera corrida de saludable o fallido.';

create or replace function public.run_automation_watchdog()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype;
  v_corte date := (now() at time zone 'America/Chicago')::date;
  v_total int:=0; v_healthy int:=0; v_pending int:=0; v_issues int:=0; v_gaps int:=0;
  v_details jsonb:='[]'::jsonb; v_out jsonb; v_dedup text:='automation-health';
begin
  select * into v_agent from public.agent_registry
   where nombre='Director de Continuidad Operativa' and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'Director de Continuidad Operativa no encontrado'; end if;

  select count(*),count(*) filter(where effective_health='healthy'),
    count(*) filter(where effective_health='pending_first_run'),
    count(*) filter(where effective_health not in('healthy','pending_first_run'))
    into v_total,v_healthy,v_pending,v_issues from public.v_automation_effective_health;
  select count(*) into v_gaps from public.v_automation_expectation_gaps;
  v_total:=v_total+v_gaps; v_issues:=v_issues+v_gaps;
  select coalesce(jsonb_agg(jsonb_build_object('automatizacion',jobname,'area',area,
    'responsable',owner_agent,'criticidad',criticality,'estado',effective_health,
    'horas_sin_senal',silence_hours,'ultima_corrida',last_start,'ultimo_resultado',last_status,
    'fuente_evidencia',evidence_source,'evidencia_fecha',evidence_at,'causa',evidence_error)
    order by case criticality when 'P1' then 1 when 'P2' then 2 else 3 end,silence_hours desc),'[]'::jsonb)
    into v_details from public.v_automation_effective_health
   where effective_health not in('healthy','pending_first_run');
  if v_gaps>0 then
    select v_details||coalesce(jsonb_agg(jsonb_build_object(
      'automatizacion',jobname,'area','sin clasificar','responsable','sin asignar','criticidad','P1',
      'estado','unregistered','causa','Trabajo activo sin dueño ni frecuencia esperada',
      'fuente_evidencia','cron.job') order by jobname),'[]'::jsonb)
      into v_details from public.v_automation_expectation_gaps;
  end if;

  v_out:=jsonb_build_object(
    'resumen',case when v_issues=0 then 'Las automatizaciones vencidas terminaron con evidencia vigente.'
      else v_issues||' automatizaciones requieren atención: no basta con que el reloj las haya iniciado.' end,
    'estado',case when v_gaps>0 or exists(select 1 from public.v_automation_effective_health
      where effective_health not in('healthy','pending_first_run') and criticality='P1')
      then 'atencion_inmediata' when v_issues>0 then 'seguimiento' else 'saludable' end,
    'kpis',jsonb_build_object('vigiladas',v_total,'saludables',v_healthy,
      'primera_corrida_pendiente',v_pending,'requieren_atencion',v_issues),
    'hallazgos',v_details,
    'recomendaciones',jsonb_build_array('Revisar primero P1 sin resultado real.',
      'Exigir una evidencia nueva y sin error antes de marcar recuperada.'),
    'fuentes',jsonb_build_array('automation_expectations','v_automation_expectation_gaps',
      'cron.job_run_details','clickup_sync_log','pm_sync_log','remodel_sync_log','remodel_sync_parity'),
    'limite','El vigilante detecta y escala. No reactiva tareas, reintenta acciones sensibles ni modifica datos operativos.');
  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='salud_automatizaciones' and corte=v_corte and archived_at is null;
  if not found then insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('salud_automatizaciones',v_corte,'Salud de automatizaciones · '||v_corte,
      'borrador','ejecutor',v_out,v_agent.nombre); end if;

  if v_issues>0 then
    perform * from public.record_agent_proposal(v_agent.id,'cuello_botella',jsonb_build_object(
      'dedup_key',v_dedup,'accion','recuperar_automatizaciones','requiere_aprobacion',true),v_out);
    perform public.reconcile_agent_proposal_set(v_agent.id,'cuello_botella',v_dedup,array[v_dedup]);
  else
    perform public.reconcile_agent_proposal_set(v_agent.id,'cuello_botella',v_dedup,array[]::text[]);
  end if;
  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent.id,jsonb_build_object('tipo','ejecucion_negocio','modo','automation_watchdog'),v_out,'ok');
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'result',v_out);
end $$;
revoke all on function public.run_automation_watchdog() from public;
grant execute on function public.run_automation_watchdog() to postgres,service_role;

select public.run_automation_watchdog();
select public.run_decision_sla_review();
select public.run_absence_readiness_review();

comment on function public.run_automation_watchdog() is
  'Detects real failures, preserves first-run grace and refreshes one stable exception; never retries sensitive work.';
