-- The cron firing is not proof that ClickUp synchronized successfully.
-- Wrap the existing integration review and require a fresh, error-free sync log.

do $$
begin
  if to_regprocedure('public.run_integration_health_review_base()') is null then
    alter function public.run_integration_health_review() rename to run_integration_health_review_base;
  end if;
end $$;

create or replace function public.run_integration_health_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_base jsonb; v_out jsonb; v_latest timestamptz; v_error text;
  v_clickup_ok boolean:=false; v_healthy int:=0; v_total int:=4; v_agent_id uuid;
  v_corte date:=(now() at time zone 'America/Chicago')::date;
begin
  v_base:=public.run_integration_health_review_base();
  v_out:=coalesce(v_base->'result','{}'::jsonb);

  select synced_at,error into v_latest,v_error
  from public.clickup_sync_log order by synced_at desc limit 1;
  v_clickup_ok:=v_latest is not null and v_latest>=now()-interval '2 hours' and v_error is null;

  v_healthy:=coalesce((v_out#>>'{kpis,integraciones_saludables}')::int,0);
  if not v_clickup_ok and coalesce((v_out#>>'{conexiones,1,ok}')::boolean,false) then
    v_healthy:=greatest(v_healthy-1,0);
  end if;
  v_out:=jsonb_set(v_out,'{conexiones,1}',jsonb_build_object(
    'sistema','ClickUp','ok',v_clickup_ok,
    'evidencia',case when v_clickup_ok then 'Última sincronización completada sin errores'
      else 'Sincronización rechazada: '||coalesce(v_error,'sin resultado reciente') end,
    'ultima_sincronizacion',v_latest,
    'responsable','Director de Continuidad Operativa'
  ));
  v_out:=jsonb_set(v_out,'{kpis,integraciones_saludables}',to_jsonb(v_healthy));
  v_out:=jsonb_set(v_out,'{estado}',to_jsonb(case when v_healthy=v_total then 'saludable' else 'atencion' end));
  v_out:=jsonb_set(v_out,'{resumen}',to_jsonb(v_healthy||'/'||v_total||' integraciones operativas tienen evidencia vigente.'));
  v_out:=jsonb_set(v_out,'{fuentes}',coalesce(v_out->'fuentes','[]'::jsonb)||'"clickup_sync_log"'::jsonb);
  v_out:=jsonb_set(v_out,'{recomendaciones}',case when v_clickup_ok
    then jsonb_build_array('Mantener vigilancia y revisar la cuota contractual de RentCast.')
    else jsonb_build_array('Reconectar ClickUp: el token actual fue rechazado.','No aprobar acciones de ClickUp hasta completar una sincronización sin errores.') end);

  update public.pm_informes set payload=v_out,updated_at=now()
  where tipo='salud_integraciones' and corte=v_corte and archived_at is null;

  select id into v_agent_id from public.agent_registry
  where nombre='Director de Continuidad Operativa' and deleted_at is null limit 1;
  if not v_clickup_ok then
    perform * from public.record_agent_proposal(v_agent_id,'cuello_botella',jsonb_build_object(
      'dedup_key','integration-health:'||v_corte::text,
      'accion','reconectar_clickup','requiere_aprobacion',true,'severidad','alto'
    ),v_out);
  end if;

  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent_id,jsonb_build_object('tipo','ejecucion_negocio','modo','clickup_connection_truth'),v_out,
    case when v_clickup_ok then 'ok' else 'blocked' end);
  return jsonb_build_object('ok',true,'agent','Director de Continuidad Operativa','result',v_out);
end $$;

revoke all on function public.run_integration_health_review() from public;
grant execute on function public.run_integration_health_review() to postgres,service_role;
comment on function public.run_integration_health_review() is
  'Revisa integraciones y exige un resultado real y sin error en clickup_sync_log; el disparo del cron no cuenta como éxito.';

select public.run_integration_health_review();
