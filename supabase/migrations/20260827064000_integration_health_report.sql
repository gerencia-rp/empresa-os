-- Salud verificable de las conexiones que sostienen la operación.
-- Tener un secret no cuenta como conexión: se exige señal o datos frescos.
insert into public.automation_expectations(jobname,area,owner_agent,max_silence_hours,criticality)
values('sync-airtable-every-30min','fix-flip','Ejecución Fix & Flip',2,'P1')
on conflict(jobname) do update set area=excluded.area,owner_agent=excluded.owner_agent,
  max_silence_hours=excluded.max_silence_hours,criticality=excluded.criticality,active=true,updated_at=now();

create or replace function public.run_integration_health_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype; v_corte date:=(now() at time zone 'America/Chicago')::date;
  v_airtable_total int:=0; v_airtable_ok int:=0; v_clickup_ok boolean:=false;
  v_qb_total int:=0; v_qb_fresh int:=0; v_rc_cache int:=0; v_rc_latest timestamptz;
  v_rc_calls int:=0; v_rc_success int:=0; v_rc_failed int:=0; v_rc_status int; v_rc_limit int;
  v_rc_period date; v_ok int:=0; v_out jsonb;
begin
  select * into v_agent from public.agent_registry
   where nombre='Director de Continuidad Operativa' and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'Director de Continuidad Operativa no encontrado'; end if;

  select count(*),count(*) filter(where health='healthy') into v_airtable_total,v_airtable_ok
   from public.v_automation_health where jobname in('pm-sync-airtable-every-15min','sync-airtable-every-30min','sync-remodel-workers-hourly');
  select coalesce(bool_and(health='healthy'),false) into v_clickup_ok
   from public.v_automation_health where jobname='sync-clickup-every-60min';
  select count(distinct empresa),count(distinct empresa) filter(where fetched_at>=now()-interval '36 hours')
   into v_qb_total,v_qb_fresh from public.qb_report_cache where active;
  select count(*),max(fetched_at) into v_rc_cache,v_rc_latest from public.rentcast_cache
   where active and archived_at is null and fetched_at>=now()-interval '30 days';
  select llamadas,success_calls,failed_calls,last_status,monthly_limit,period_start
   into v_rc_calls,v_rc_success,v_rc_failed,v_rc_status,v_rc_limit,v_rc_period
   from public.rentcast_usage where id=1;
  v_ok := (case when v_airtable_total=3 and v_airtable_ok=3 then 1 else 0 end)
    +(case when v_clickup_ok then 1 else 0 end)
    +(case when v_qb_total>0 and v_qb_fresh=v_qb_total then 1 else 0 end)
    +(case when v_rc_cache>0 and (v_rc_status is null or v_rc_status between 200 and 299) then 1 else 0 end);

  v_out:=jsonb_build_object(
    'resumen',v_ok||'/4 integraciones operativas tienen evidencia vigente.',
    'estado',case when v_ok=4 then 'saludable' else 'atencion' end,
    'kpis',jsonb_build_object('integraciones_saludables',v_ok,'integraciones_vigiladas',4),
    'conexiones',jsonb_build_array(
      jsonb_build_object('sistema','Airtable','ok',v_airtable_total=3 and v_airtable_ok=3,
        'evidencia',v_airtable_ok||'/'||v_airtable_total||' sincronizaciones con señal','responsable','Ejecución por área'),
      jsonb_build_object('sistema','ClickUp','ok',v_clickup_ok,
        'evidencia','Sincronización horaria','responsable','Director de Continuidad Operativa'),
      jsonb_build_object('sistema','QuickBooks','ok',v_qb_total>0 and v_qb_fresh=v_qb_total,
        'evidencia',v_qb_fresh||'/'||v_qb_total||' empresas frescas en 36 horas','responsable','Controller'),
      jsonb_build_object('sistema','RentCast','ok',v_rc_cache>0 and (v_rc_status is null or v_rc_status between 200 and 299),
        'evidencia',v_rc_cache||' respuestas vigentes · última '||coalesce(v_rc_latest::text,'sin datos'),
        'periodo',v_rc_period,'llamadas',v_rc_calls,'exitos_registrados',v_rc_success,'fallos_registrados',v_rc_failed,
        'ultimo_status',v_rc_status,'limite_mensual',v_rc_limit,'responsable','Underwriting (Fix & Flip)')),
    'recomendaciones',case when v_ok=4 then jsonb_build_array('Mantener vigilancia y revisar la cuota contractual de RentCast.')
      else jsonb_build_array('Recuperar primero conexiones P1 sin señal.','No calcular ni escribir datos con una fuente desactualizada.') end,
    'fuentes',jsonb_build_array('v_automation_health','qb_report_cache','rentcast_cache','rentcast_usage'),
    'limite','La revisión observa frescura y señal. No renueva tokens, modifica fuentes ni consume llamadas de prueba.');

  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='salud_integraciones' and corte=v_corte and archived_at is null;
  if not found then insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('salud_integraciones',v_corte,'Salud de integraciones · '||v_corte,
      'borrador','ejecutor',v_out,v_agent.nombre); end if;
  if v_ok<4 and not exists(select 1 from public.agent_proposals where agent_id=v_agent.id and estado='propuesta'
    and deleted_at is null and payload->>'dedup_key'='integration-health:'||v_corte::text) then
    insert into public.agent_proposals(agent_id,tipo_accion,estado,payload,evidencia)
    values(v_agent.id,'cuello_botella','propuesta',jsonb_build_object(
      'dedup_key','integration-health:'||v_corte::text,'accion','recuperar_integraciones','requiere_aprobacion',true),v_out);
  end if;
  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent.id,jsonb_build_object('tipo','ejecucion_negocio','modo','integration_health'),v_out,'ok');
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'result',v_out);
end $$;
revoke all on function public.run_integration_health_review() from public;
grant execute on function public.run_integration_health_review() to postgres,service_role;
comment on function public.run_integration_health_review() is
 'Revisa señal y frescura de Airtable, ClickUp, QuickBooks y RentCast sin consumir llamadas de prueba.';
do $$ begin perform cron.unschedule(jobname) from cron.job where jobname='integration-health-daily';
exception when others then null; end $$;
select cron.schedule('integration-health-daily','25 12 * * *',
  $$select public.run_integration_health_review()$$);
select public.run_integration_health_review();
