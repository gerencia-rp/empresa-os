-- La salud ejecutiva debe comprobar resultados reales: paridad completa del
-- espejo de Airtable y entrega efectiva del canal WhatsApp.
do $$
begin
  if to_regprocedure('public.run_integration_health_review_clickup()') is null
     and to_regprocedure('public.run_integration_health_review()') is not null then
    alter function public.run_integration_health_review() rename to run_integration_health_review_clickup;
  end if;
end $$;

create or replace function public.run_integration_health_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_base jsonb; v_out jsonb; v_connections jsonb; v_recs jsonb;
  v_airtable_ok boolean:=false; v_wa_ok boolean:=false;
  v_airtable_bad int:=0; v_airtable_total int:=0; v_parity_at timestamptz;
  v_wa_at timestamptz; v_wa_error text; v_healthy int:=0;
  v_agent_id uuid; v_corte date:=(now() at time zone 'America/Chicago')::date;
begin
  v_base:=public.run_integration_health_review_clickup();
  v_out:=coalesce(v_base->'result','{}'::jsonb);

  select count(*)::int,count(*) filter(where not in_sync)::int,min(checked_at)
    into v_airtable_total,v_airtable_bad,v_parity_at
  from public.remodel_sync_parity where source like 'pm_%';
  v_airtable_ok:=v_airtable_total=6 and v_airtable_bad=0 and v_parity_at>=now()-interval '2 hours';

  select sent_at,delivered,error into v_wa_at,v_wa_ok,v_wa_error
  from public.notification_log where channel='whatsapp' order by sent_at desc limit 1;
  v_wa_ok:=coalesce(v_wa_ok,false) and v_wa_at>=now()-interval '26 hours';

  v_connections:=coalesce(v_out->'conexiones','[]'::jsonb);
  if jsonb_array_length(v_connections)>0 then
    v_connections:=jsonb_set(v_connections,'{0}',jsonb_build_object(
      'sistema','Airtable','ok',v_airtable_ok,
      'evidencia',case when v_airtable_ok then '6/6 entidades con paridad fuente-espejo'
        else format('%s/6 entidades con paridad; %s diferencias',greatest(v_airtable_total-v_airtable_bad,0),v_airtable_bad) end,
      'ultima_verificacion',v_parity_at,'responsable','Ejecución por área'));
  end if;
  v_connections:=v_connections||jsonb_build_array(jsonb_build_object(
    'sistema','WhatsApp','ok',v_wa_ok,
    'evidencia',case when v_wa_ok then 'Última notificación entregada'
      else 'Última entrega falló: '||coalesce(v_wa_error,'sin entrega reciente') end,
    'ultima_verificacion',v_wa_at,'responsable','Director de Continuidad Operativa'));
  select count(*) filter(where coalesce((x->>'ok')::boolean,false))::int into v_healthy
  from jsonb_array_elements(v_connections) x;

  v_recs:=coalesce(v_out->'recomendaciones','[]'::jsonb);
  if not v_airtable_ok then v_recs:=v_recs||jsonb_build_array('Reconciliar las 2 propiedades faltantes del espejo de Airtable antes de certificar continuidad.'); end if;
  if not v_wa_ok then v_recs:=v_recs||jsonb_build_array('Renovar el token de WhatsApp/Meta y verificar una entrega real.'); end if;
  v_out:=jsonb_set(v_out,'{conexiones}',v_connections);
  v_out:=jsonb_set(v_out,'{kpis}',jsonb_build_object('integraciones_saludables',v_healthy,'integraciones_vigiladas',jsonb_array_length(v_connections)));
  v_out:=jsonb_set(v_out,'{recomendaciones}',v_recs);
  v_out:=jsonb_set(v_out,'{fuentes}',coalesce(v_out->'fuentes','[]'::jsonb)||jsonb_build_array('remodel_sync_parity','notification_log'));
  v_out:=jsonb_set(v_out,'{estado}',to_jsonb(case when v_healthy=jsonb_array_length(v_connections) then 'saludable' else 'atencion' end));
  v_out:=jsonb_set(v_out,'{resumen}',to_jsonb(format('%s/%s integraciones operativas tienen evidencia vigente.',v_healthy,jsonb_array_length(v_connections))));

  update public.pm_informes set payload=v_out,updated_at=now()
  where tipo='salud_integraciones' and corte=v_corte and archived_at is null;
  select id into v_agent_id from public.agent_registry
  where nombre='Director de Continuidad Operativa' and deleted_at is null limit 1;
  if v_healthy<jsonb_array_length(v_connections) then
    perform * from public.record_agent_proposal(v_agent_id,'cuello_botella',jsonb_build_object(
      'dedup_key','integration-health:'||v_corte::text,
      'accion','restaurar_integraciones','requiere_aprobacion',true,'severidad','alto'
    ),v_out);
  else
    perform public.reconcile_agent_proposal_set(v_agent_id,'cuello_botella','integration-health:',array[]::text[]);
  end if;
  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent_id,jsonb_build_object('tipo','ejecucion_negocio','modo','integration_result_truth'),v_out,
    case when v_healthy=jsonb_array_length(v_connections) then 'ok' else 'blocked' end);
  return jsonb_build_object('ok',true,'agent',v_base->>'agent','result',v_out);
end $$;

revoke all on function public.run_integration_health_review() from public;
grant execute on function public.run_integration_health_review() to postgres,service_role;
comment on function public.run_integration_health_review() is 'Comprueba ClickUp, paridad Airtable, QuickBooks, RentCast y entrega WhatsApp con evidencia real.';
