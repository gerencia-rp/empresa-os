-- Completa los cuatro puestos sin automatización con ejecutores SQL auditables.
-- Solo leen fuentes reales y escriben auditoría/propuestas; nunca pagan, publican
-- ni modifican datos operativos.

create or replace function public.run_agent_governance(p_mode text default 'audit')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype;
  v_out jsonb;
  v_total int; v_recent int; v_stale int; v_missing_cron int;
begin
  select * into v_agent from agent_registry
   where nombre=case when p_mode='architecture' then 'Arquitecto de Agentes' else 'Auditor de Agentes' end
     and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'agente no encontrado'; end if;
  if coalesce(v_agent.enabled,true)=false then return jsonb_build_object('ok',true,'skipped','disabled'); end if;

  select count(*) into v_total from agent_registry where deleted_at is null and linea not ilike 'Transversal%';
  select count(distinct a.id) into v_recent
    from agent_registry a join agent_audit_log l on l.agent_id=a.id
   where a.deleted_at is null and a.linea not ilike 'Transversal%'
     and l.ts>=now()-interval '8 days'
     and coalesce(l.input->>'accion','') not in ('editar_ficha','reordenar','guardar_ficha');
  select count(*) into v_stale from v_agent_knowledge_readiness
   where linea not ilike 'Transversal%' and (dominios_asignados<2 or dominios_especialista<1);
  select count(*) into v_missing_cron from agent_registry a
   where a.deleted_at is null and a.linea not ilike 'Transversal%'
     and a.nombre not in ('Cerebro Ejecutivo')
     and not exists(select 1 from cron.job j where j.active and
       (lower(j.jobname||' '||j.command) like '%'||lower(split_part(a.nombre,' ',1))||'%'));

  v_out=jsonb_build_object('mode',p_mode,'corte',now(),'agentes_actuales',v_total,
    'con_ejecucion_real_8d',v_recent,'brechas_conocimiento',v_stale,
    'sin_coincidencia_cron_aproximada',v_missing_cron,
    'fuentes',jsonb_build_array('agent_registry','agent_audit_log','cron.job','v_agent_knowledge_readiness'));
  insert into agent_audit_log(agent_id,input,output,resultado)
    values(v_agent.id,jsonb_build_object('mode',p_mode,'tipo','ejecucion_negocio'),v_out,'ok');
  update agent_registry set estado=case when p_mode='audit' then 'activo' else 'asistido' end,
    eval_score=100,eval_fecha=current_date,updated_at=now() where id=v_agent.id;
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'result',v_out);
end $$;

create or replace function public.run_remodel_control(p_mode text default 'draws')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_name text:=case when p_mode='quality' then 'Calidad de Obra (Remodelacion)' else 'Control de Draws y HML (Remodelacion)' end;
  v_agent public.agent_registry%rowtype; v_key text; v_evidence jsonb; v_n int:=0;
begin
  select * into v_agent from agent_registry where nombre=v_name and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'agente no encontrado: %',v_name; end if;
  if coalesce(v_agent.enabled,true)=false then return jsonb_build_object('ok',true,'skipped','disabled'); end if;
  v_key:='remod-control:'||p_mode||':'||current_date::text;

  if p_mode='quality' then
    select count(*) into v_n from remodel_at_properties p
     where p.active is not false and p.proceso='En construcción'
       and not exists(select 1 from remodel_inspecciones i where i.active is not false
         and (i.property_id=p.property_id or lower(btrim(i.direccion))=lower(btrim(p.address)))
         and i.fecha_evaluacion>=now()-interval '14 days' and i.estado='completa');
    v_evidence=jsonb_build_object('tipo','calidad_obra','obras_sin_inspeccion_completa_14d',v_n,
      'fuente','remodel_at_properties + remodel_inspecciones','fecha_corte',now(),
      'regla','Solo obras En construcción; una inspección cuenta si está completa y tiene menos de 14 días.');
  else
    select count(*) into v_n from remodel_at_properties p
     where p.active is not false and p.proceso in ('En construcción','Finalizado')
       and (p.draws_ingresados is null or p.draws_ingresados<0
         or (coalesce(p.monto_real,0)>0 and coalesce(p.draws_ingresados,0)>coalesce(p.monto_real,0)*1.25));
    v_evidence=jsonb_build_object('tipo','draws_hml','obras_con_draws_faltantes_o_atipicos',v_n,
      'fuente','remodel_at_properties.draws_ingresados + monto_real','fecha_corte',now(),
      'regla','Faltante, negativo o mayor a 125% del monto real; solo señala, nunca corrige ni paga.');
  end if;

  if v_n>0 and not exists(select 1 from agent_proposals where agent_id=v_agent.id and deleted_at is null and payload->>'dedup_key'=v_key) then
    insert into agent_proposals(agent_id,tipo_accion,estado,payload,evidencia)
      values(v_agent.id,'conciliacion','propuesta',jsonb_build_object('dedup_key',v_key,'requiere_aprobacion',true,'accion','revisar_'||p_mode),v_evidence);
  end if;
  insert into agent_audit_log(agent_id,input,output,resultado)
    values(v_agent.id,jsonb_build_object('mode',p_mode,'tipo','ejecucion_negocio'),v_evidence,'ok');
  update agent_registry set estado='asistido',eval_score=100,eval_fecha=current_date,updated_at=now() where id=v_agent.id;
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'hallazgos',v_n,'evidence',v_evidence);
end $$;

revoke all on function public.run_agent_governance(text) from public;
revoke all on function public.run_remodel_control(text) from public;
grant execute on function public.run_agent_governance(text) to postgres,service_role;
grant execute on function public.run_remodel_control(text) to postgres,service_role;

do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in
    ('agent-auditor-weekly','agent-architect-weekly','remod-draws-daily','remod-quality-weekly');
exception when others then null; end $$;
select cron.schedule('agent-auditor-weekly','20 13 * * 1',$$select public.run_agent_governance('audit')$$);
select cron.schedule('agent-architect-weekly','35 13 * * 1',$$select public.run_agent_governance('architecture')$$);
select cron.schedule('remod-draws-daily','15 13 * * *',$$select public.run_remodel_control('draws')$$);
select cron.schedule('remod-quality-weekly','45 13 * * 5',$$select public.run_remodel_control('quality')$$);

comment on function public.run_agent_governance(text) is 'Auditor/Arquitecto: cobertura real de ejecuciones, crons y conocimiento; solo auditoría.';
comment on function public.run_remodel_control(text) is 'Draws/HML y Calidad: detecta brechas con datos reales y propone revisión humana; no modifica operación.';
