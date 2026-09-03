-- Una corrida del cron demuestra que el disparador funcionó; no demuestra que
-- el trabajo terminó bien. Esta vista une ambas señales para evitar verdes falsos.
insert into public.automation_expectations(jobname,area,owner_agent,max_silence_hours,criticality)
values
 ('agent-architect-weekly','holding','Arquitecto de Agentes',192,'P2'),
 ('agent-auditor-weekly','holding','Auditor de Agentes',192,'P1'),
 ('approved-work-review-daily','holding','Director de Continuidad Operativa',30,'P1'),
 ('automation-watchdog-hourly','holding','Director de Continuidad Operativa',2,'P1'),
 ('canonical-rent-ar-daily','rentas','Financiero Rentas',30,'P1'),
 ('cerebro-matutino-a','holding','Cerebro Ejecutivo',30,'P1'),
 ('cerebro-matutino-b','holding','Cerebro Ejecutivo',30,'P1'),
 ('cerebro-memoria-compactar','holding','Cerebro Ejecutivo',30,'P2'),
 ('continuity-monthly','holding','Director de Continuidad Operativa',840,'P2'),
 ('continuity-role-coverage','holding','Director de Continuidad Operativa',192,'P1'),
 ('continuity-weekly','holding','Director de Continuidad Operativa',192,'P1'),
 ('ff-capital-mensual','fix-flip','Capital & Inversionistas (Fix & Flip)',840,'P1'),
 ('ff-financiero-captable','fix-flip','Financiero Fix & Flip',840,'P1'),
 ('ff-financiero-interes','fix-flip','Financiero Fix & Flip',840,'P1'),
 ('ff-optimizacion-semanal','fix-flip','Optimización Fix & Flip',192,'P2'),
 ('financial-source-scan-daily','contable','Auditor de Integridad Financiera y Datos',30,'P1'),
 ('integration-health-daily','holding','Director de Continuidad Operativa',30,'P1'),
 ('remod-financiero-anomalias','remodelacion','Financiero Remodelación',192,'P1'),
 ('remod-financiero-material','remodelacion','Financiero Remodelación',192,'P1'),
 ('remod-financiero-nomina','remodelacion','Financiero Remodelación',408,'P1'),
 ('remod-optimizacion-semanal','remodelacion','Optimización Remodelación',192,'P2'),
 ('rentas-ejecucion-mid','rentas','Ejecución Rentas',30,'P1'),
 ('rentas-ejecucion-pm','rentas','Ejecución Rentas',30,'P1'),
 ('rentas-financiero-cierre','rentas','Financiero Rentas',840,'P1'),
 ('rentas-financiero-servicios','rentas','Financiero Rentas',264,'P1'),
 ('rentas-informe-combinado','rentas','Reportes Rentas',840,'P2'),
 ('rentas-informe-semanal','rentas','Reportes Rentas',192,'P2'),
 ('rentas-optimizacion-mejora','rentas','Optimización Rentas',840,'P2'),
 ('rentas-optimizacion-precio','rentas','Optimización Rentas',192,'P2'),
 ('rentas-reportes-bitacora','rentas','Reportes Rentas',120,'P2'),
 ('student-success-weekly','education','Gerente de Éxito Estudiantil',192,'P2'),
 ('pm-alerts-contracts','rentas','Gerente de Rentas',30,'P1'),
 ('pm-alerts-occupancy','rentas','Gerente de Rentas',192,'P1'),
 ('pm-alerts-payments','rentas','Financiero Rentas',30,'P1'),
 ('pm-alerts-services','rentas','Financiero Rentas',192,'P1'),
 ('pm-alerts-tasks','rentas','Ejecución Rentas',30,'P1'),
 ('pm-coaching-prompts-mon-7am','rentas','Gerente de Rentas',192,'P2'),
 ('pm-compute-performance-mon-6am','rentas','Optimización Rentas',192,'P2'),
 ('pm-daily-close-6pm','rentas','Ejecución Rentas',30,'P1'),
 ('pm-daily-push-7am','rentas','Ejecución Rentas',30,'P1'),
 ('pm-generate-cleanings','rentas','Ejecución Rentas',30,'P1'),
 ('pm-generate-op-tasks','rentas','Ejecución Rentas',30,'P1'),
 ('pm-group-report-8pm','rentas','Reportes Rentas',30,'P2'),
 ('pm-utility-alerts','rentas','Ejecución Rentas',30,'P1'),
 ('pm-weekly-review-mon-7am','rentas','Gerente de Rentas',192,'P2'),
 ('rp_fred_weekly','fix-flip','Underwriting (Fix & Flip)',192,'P2'),
 ('rp_hpi_monthly','fix-flip','Underwriting (Fix & Flip)',840,'P2'),
 ('rp_income_monthly','fix-flip','Underwriting (Fix & Flip)',840,'P2'),
 ('rp_population_monthly','fix-flip','Underwriting (Fix & Flip)',840,'P2'),
 ('rp_refresh_monthly','fix-flip','Underwriting (Fix & Flip)',840,'P2'),
 ('rp_unemployment_monthly','fix-flip','Underwriting (Fix & Flip)',840,'P2'),
 ('rp_vouchers_yearly','fix-flip','Underwriting (Fix & Flip)',9000,'P2'),
 ('sync-ff-airtable-hourly','fix-flip','Ejecucion Fix & Flip',2,'P1')
on conflict(jobname) do update set area=excluded.area,owner_agent=excluded.owner_agent,
 max_silence_hours=excluded.max_silence_hours,criticality=excluded.criticality,active=true,updated_at=now();

create or replace view public.v_automation_expectation_gaps
with(security_invoker=true) as
select j.jobid,j.jobname,j.schedule,j.command
from cron.job j
left join public.automation_expectations e on e.jobname=j.jobname and e.active
where j.active and e.jobname is null;
grant select on public.v_automation_expectation_gaps to authenticated;
comment on view public.v_automation_expectation_gaps is
  'Trabajos activos que todavía no tienen dueño, criticidad ni frecuencia esperada en el vigilante.';

create or replace view public.v_automation_effective_health
with(security_invoker=true) as
with clickup as (
  select synced_at evidence_at,error evidence_error
  from public.clickup_sync_log order by synced_at desc limit 1
), rentas as (
  select finished_at evidence_at,
    case when status='success' and error_message is null then null
      else coalesce(error_message,'La sincronización terminó con estado '||coalesce(status,'desconocido')) end evidence_error,
    status
  from public.pm_sync_log where source='airtable' order by started_at desc limit 1
), remodelacion as (
  select synced_at evidence_at,error evidence_error
  from public.remodel_sync_log order by synced_at desc limit 1
), ff_parity as (
  select min(checked_at) evidence_at,
    count(*)::int total,
    count(*) filter(where in_sync)::int correctas
  from public.remodel_sync_parity where source in('ff_deals','ff_draws','ff_investors','ff_hml_loans')
)
select h.*,
  case h.jobname
    when 'sync-clickup-every-60min' then 'clickup_sync_log'
    when 'pm-sync-airtable-every-15min' then 'pm_sync_log'
    when 'sync-remodel-workers-hourly' then 'remodel_sync_log'
    when 'sync-airtable-every-30min' then 'remodel_sync_parity'
    else 'cron.job_run_details'
  end evidence_source,
  case h.jobname
    when 'sync-clickup-every-60min' then c.evidence_at
    when 'pm-sync-airtable-every-15min' then r.evidence_at
    when 'sync-remodel-workers-hourly' then m.evidence_at
    when 'sync-airtable-every-30min' then p.evidence_at
    else h.last_end
  end evidence_at,
  case h.jobname
    when 'sync-clickup-every-60min' then c.evidence_error
    when 'pm-sync-airtable-every-15min' then r.evidence_error
    when 'sync-remodel-workers-hourly' then m.evidence_error
    when 'sync-airtable-every-30min' then case
      when p.total<4 then format('Solo %s/4 entidades de Fix & Flip tienen evidencia de paridad',p.total)
      when p.correctas<p.total then format('%s/%s entidades están reconciliadas',p.correctas,p.total)
      else null end
    else case when h.last_end is null then 'Sin corrida registrada en cron.job_run_details' else null end
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
    when h.last_end is null then 'never_ran'
    else 'healthy'
  end effective_health
from public.v_automation_health h
left join clickup c on true
left join rentas r on true
left join remodelacion m on true
left join ff_parity p on true;

grant select on public.v_automation_effective_health to authenticated;
comment on view public.v_automation_effective_health is
  'Salud efectiva: combina disparo del cron con evidencia real del resultado para integraciones críticas.';

create or replace function public.run_automation_watchdog()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype;
  v_corte date := (now() at time zone 'America/Chicago')::date;
  v_total int:=0; v_healthy int:=0; v_issues int:=0; v_gaps int:=0;
  v_details jsonb:='[]'::jsonb; v_out jsonb;
begin
  select * into v_agent from public.agent_registry
   where nombre='Director de Continuidad Operativa' and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'Director de Continuidad Operativa no encontrado'; end if;

  select count(*),count(*) filter(where effective_health='healthy'),count(*) filter(where effective_health<>'healthy')
    into v_total,v_healthy,v_issues from public.v_automation_effective_health;
  select count(*) into v_gaps from public.v_automation_expectation_gaps;
  v_total:=v_total+v_gaps;
  v_issues:=v_issues+v_gaps;
  select coalesce(jsonb_agg(jsonb_build_object('automatizacion',jobname,'area',area,
    'responsable',owner_agent,'criticidad',criticality,'estado',effective_health,
    'horas_sin_senal',silence_hours,'ultima_corrida',last_start,'ultimo_resultado',last_status,
    'fuente_evidencia',evidence_source,'evidencia_fecha',evidence_at,'causa',evidence_error)
    order by case criticality when 'P1' then 1 when 'P2' then 2 else 3 end,silence_hours desc),'[]'::jsonb)
    into v_details from public.v_automation_effective_health where effective_health<>'healthy';
  if v_gaps>0 then
    select v_details||coalesce(jsonb_agg(jsonb_build_object(
      'automatizacion',jobname,'area','sin clasificar','responsable','sin asignar','criticidad','P1',
      'estado','unregistered','causa','Trabajo activo sin dueño ni frecuencia esperada',
      'fuente_evidencia','cron.job') order by jobname),'[]'::jsonb)
    into v_details from public.v_automation_expectation_gaps;
  end if;

  v_out:=jsonb_build_object(
    'resumen',case when v_issues=0 then 'Todas las automatizaciones críticas terminaron con evidencia vigente.'
      else v_issues||' automatizaciones requieren atención: no basta con que el reloj las haya iniciado.' end,
    'estado',case when v_gaps>0 or exists(select 1 from public.v_automation_effective_health where effective_health<>'healthy' and criticality='P1')
      then 'atencion_inmediata' when v_issues>0 then 'seguimiento' else 'saludable' end,
    'kpis',jsonb_build_object('vigiladas',v_total,'saludables',v_healthy,'requieren_atencion',v_issues),
    'hallazgos',v_details,
    'recomendaciones',jsonb_build_array('Revisar primero P1 sin resultado real.','Exigir una evidencia nueva y sin error antes de marcar recuperada.'),
    'fuentes',jsonb_build_array('automation_expectations','v_automation_expectation_gaps','cron.job_run_details','clickup_sync_log','pm_sync_log','remodel_sync_log','remodel_sync_parity'),
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
  'Detecta ausencia del cron y resultados reales fallidos o vencidos. Solo observa y escala.';
