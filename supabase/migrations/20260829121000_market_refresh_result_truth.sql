-- FRED refreshes can be recovered manually after a cron failure. Their real
-- output log is the authoritative result when it is newer than the failed cron.

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
), population as (
  select ran_at evidence_at,rows_written,note from rp.data_refresh_log
  where source='fred_population' order by ran_at desc limit 1
), unemployment as (
  select ran_at evidence_at,rows_written,note from rp.data_refresh_log
  where source='fred_unemployment' order by ran_at desc limit 1
)
select h.*,
  case h.jobname
    when 'sync-clickup-every-60min' then 'clickup_sync_log'
    when 'pm-sync-airtable-every-15min' then 'pm_sync_log'
    when 'sync-remodel-workers-hourly' then 'remodel_sync_log'
    when 'sync-airtable-every-30min' then 'remodel_sync_parity'
    when 'rp_population_monthly' then 'rp.data_refresh_log · fred_population'
    when 'rp_unemployment_monthly' then 'rp.data_refresh_log · fred_unemployment'
    else case when h.last_end is null and h.health='healthy'
      then 'automation_expectations · periodo inicial' else 'cron.job_run_details' end
  end evidence_source,
  case h.jobname
    when 'sync-clickup-every-60min' then c.evidence_at
    when 'pm-sync-airtable-every-15min' then r.evidence_at
    when 'sync-remodel-workers-hourly' then m.evidence_at
    when 'sync-airtable-every-30min' then p.evidence_at
    when 'rp_population_monthly' then pop.evidence_at
    when 'rp_unemployment_monthly' then unemp.evidence_at
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
    when 'rp_population_monthly' then case
      when h.last_status='failed' and h.last_end>pop.evidence_at then coalesce(h.return_message,'La última corrida falló')
      when pop.evidence_at is null then 'Sin resultado de población'
      when pop.rows_written<51 or coalesce(pop.note,'') ilike 'ERROR:%' then format('Resultado incompleto: %s/51 estados',coalesce(pop.rows_written,0))
      else null end
    when 'rp_unemployment_monthly' then case
      when h.last_status='failed' and h.last_end>unemp.evidence_at then coalesce(h.return_message,'La última corrida falló')
      when unemp.evidence_at is null then 'Sin resultado de desempleo'
      when unemp.rows_written<51 or coalesce(unemp.note,'') ilike 'ERROR:%' then format('Resultado incompleto: %s/51 estados',coalesce(unemp.rows_written,0))
      else null end
    else case when h.last_end is null and h.health<>'healthy'
      then 'Sin corrida dentro del tiempo máximo permitido' else null end
  end evidence_error,
  case
    when h.jobname='rp_population_monthly' then case
      when h.last_status='failed' and h.last_end>pop.evidence_at then 'failed'
      when pop.evidence_at>=now()-make_interval(secs=>(h.max_silence_hours*3600)::double precision)
        and pop.rows_written>=51 and coalesce(pop.note,'') not ilike 'ERROR:%' then 'healthy'
      else 'failed_result' end
    when h.jobname='rp_unemployment_monthly' then case
      when h.last_status='failed' and h.last_end>unemp.evidence_at then 'failed'
      when unemp.evidence_at>=now()-make_interval(secs=>(h.max_silence_hours*3600)::double precision)
        and unemp.rows_written>=51 and coalesce(unemp.note,'') not ilike 'ERROR:%' then 'healthy'
      else 'failed_result' end
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
left join clickup c on true left join rentas r on true left join remodelacion m on true
left join ff_parity p on true left join population pop on true left join unemployment unemp on true;

grant select on public.v_automation_effective_health to authenticated;
comment on view public.v_automation_effective_health is
  'Combines cron signals with real result logs, including recovered FRED output, and preserves first-run grace.';

do $$ begin
  if to_regprocedure('public.run_absence_readiness_review_pre_live_sources()') is null then
    alter function public.run_absence_readiness_review() rename to run_absence_readiness_review_pre_live_sources;
  end if;
end $$;

create or replace function public.run_absence_readiness_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_base jsonb; v_result jsonb; v_corte date:=(now() at time zone 'America/Chicago')::date;
  v_old_auto_ok boolean:=false; v_new_auto_ok boolean:=false;
  v_old_decisions_ok boolean:=false; v_new_decisions_ok boolean:=false;
  v_automation_issues int:=0; v_decisions_overdue int:=0; v_passed int:=0;
begin
  v_base:=public.run_absence_readiness_review_pre_live_sources();
  v_result:=coalesce(v_base->'result','{}'::jsonb);
  v_old_auto_ok:=coalesce((v_result#>>'{compuertas,automatizaciones_con_senal,ok}')::boolean,false);
  v_old_decisions_ok:=coalesce((v_result#>>'{compuertas,decisiones,ok}')::boolean,false);

  select count(*) into v_automation_issues from public.v_automation_effective_health
   where effective_health not in('healthy','pending_first_run');
  with grouped as (
    select p.agent_id,p.tipo_accion,
      coalesce(p.property_id::text,p.payload->>'task_id',p.evidencia->>'task_id',
        p.evidencia->>'property_id',p.evidencia->>'address',p.evidencia->>'casa',
        p.evidencia->>'inquilino',p.evidencia->>'servicio',p.payload->>'dedup_key',p.id::text) asunto,
      min(p.created_at) created_at,coalesce(dp.sla_hours,24) sla_hours
    from public.agent_proposals p left join public.agent_decision_policies dp using(tipo_accion)
    where p.estado='propuesta' and p.deleted_at is null and p.tipo_accion<>'informe'
    group by p.agent_id,p.tipo_accion,coalesce(p.property_id::text,p.payload->>'task_id',
      p.evidencia->>'task_id',p.evidencia->>'property_id',p.evidencia->>'address',
      p.evidencia->>'casa',p.evidencia->>'inquilino',p.evidencia->>'servicio',
      p.payload->>'dedup_key',p.id::text),dp.sla_hours)
  select count(*) into v_decisions_overdue from grouped
   where extract(epoch from(now()-created_at))/3600>sla_hours;

  v_new_auto_ok:=v_automation_issues=0; v_new_decisions_ok:=v_decisions_overdue=0;
  v_passed:=coalesce((v_result->>'compuertas_aprobadas')::int,0)
    -case when v_old_auto_ok then 1 else 0 end+case when v_new_auto_ok then 1 else 0 end
    -case when v_old_decisions_ok then 1 else 0 end+case when v_new_decisions_ok then 1 else 0 end;
  v_result:=jsonb_set(v_result,'{compuertas,automatizaciones_con_senal}',jsonb_build_object(
    'ok',v_new_auto_ok,'requieren_atencion',v_automation_issues,
    'fuente','v_automation_effective_health','primera_corrida_no_es_fallo',true),true);
  v_result:=jsonb_set(v_result,'{compuertas,decisiones}',jsonb_build_object(
    'ok',v_new_decisions_ok,'fuera_de_sla',v_decisions_overdue,'fuente','agent_proposals agrupadas'),true);
  v_result:=jsonb_set(v_result,'{compuertas_aprobadas}',to_jsonb(v_passed),true);
  v_result:=jsonb_set(v_result,'{estado}',to_jsonb(case when v_passed=12 then 'listo' else 'no_listo' end),true);
  update public.pm_informes set payload=v_result,updated_at=now()
   where tipo='continuidad_ausencia_6_meses' and corte=v_corte and archived_at is null;
  return jsonb_build_object('ok',true,'result',v_result);
end $$;

revoke all on function public.run_absence_readiness_review() from public;
grant execute on function public.run_absence_readiness_review() to postgres,service_role;
comment on function public.run_absence_readiness_review() is
  'Certifies twelve gates from live grouped decisions and effective automation results, while preserving all human and integration gates.';

select public.run_automation_watchdog();
select public.run_decision_sla_review();
select public.run_absence_readiness_review();
