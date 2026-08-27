-- Revisión diaria de la cola de decisiones. No aprueba ni ejecuta acciones.
create or replace function public.run_decision_sla_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent_id uuid; v_total int:=0; v_overdue int:=0; v_oldest numeric:=0;
  v_by_role jsonb:='[]'::jsonb; v_out jsonb;
  v_corte date := (now() at time zone 'America/Chicago')::date;
begin
  select id into v_agent_id from public.agent_registry
   where nombre='Director de Continuidad Operativa' and deleted_at is null limit 1;
  if v_agent_id is null then raise exception 'Director de Continuidad Operativa no encontrado'; end if;
  with grouped as (
    select p.agent_id,p.tipo_accion,
      coalesce(p.property_id::text,p.evidencia->>'property_id',p.evidencia->>'address',p.payload->>'dedup_key','sin-asunto') asunto,
      min(p.created_at) created_at,coalesce(dp.sla_hours,24) sla_hours,
      coalesce(dp.rol_primario,'Gerente del área') rol_primario
    from public.agent_proposals p left join public.agent_decision_policies dp using(tipo_accion)
    where p.estado='propuesta' and p.deleted_at is null and p.tipo_accion<>'informe'
    group by p.agent_id,p.tipo_accion,
      coalesce(p.property_id::text,p.evidencia->>'property_id',p.evidencia->>'address',p.payload->>'dedup_key','sin-asunto'),
      dp.sla_hours,dp.rol_primario
  ), aged as (
    select *,extract(epoch from(now()-created_at))/3600 age_hours from grouped
  )
  select count(*),count(*) filter(where age_hours>sla_hours),coalesce(max(age_hours),0),
    coalesce((select jsonb_agg(x order by (x->>'vencidas')::int desc) from (
      select jsonb_build_object('responsable',rol_primario,'pendientes',count(*),
        'vencidas',count(*) filter(where age_hours>sla_hours)) x
      from aged group by rol_primario
    ) roles),'[]'::jsonb)
  into v_total,v_overdue,v_oldest,v_by_role from aged;
  v_out:=jsonb_build_object('corte',v_corte,'asuntos_pendientes',v_total,
    'fuera_de_sla',v_overdue,'antiguedad_max_horas',round(v_oldest,1),
    'por_responsable',v_by_role,
    'severidad',case when v_overdue>0 then 'atencion' else 'saludable' end,
    'proxima_accion','La junta diaria atiende primero vencidas financieras/comunicación, luego sensibles, control y operación.',
    'limite','El auditor prioriza y escala; nunca aprueba pagos, mensajes, contratos ni cambios contables.');
  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='sla_decisiones' and corte=v_corte and archived_at is null;
  if not found then
    insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('sla_decisiones',v_corte,'SLA de decisiones · '||v_corte,'borrador','ejecutor',v_out,'Director de Continuidad Operativa');
  end if;
  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent_id,jsonb_build_object('tipo','ejecucion_negocio','modo','decision_sla'),v_out,'ok');
  return jsonb_build_object('ok',true,'result',v_out);
end $$;
revoke all on function public.run_decision_sla_review() from public;
grant execute on function public.run_decision_sla_review() to postgres,service_role;
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname='continuity-decision-sla';
exception when others then null; end $$;
select cron.schedule('continuity-decision-sla','40 12 * * *',
  $$select public.run_decision_sla_review()$$);
comment on function public.run_decision_sla_review() is
  'Agrupa, prioriza y escala decisiones fuera de SLA; no las aprueba ni ejecuta.';
