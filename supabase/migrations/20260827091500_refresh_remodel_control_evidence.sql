-- Mantiene vigentes únicamente los controles de obra que una corrida actual
-- confirma. Conserva el historial retirado y nunca corrige, paga ni ejecuta.
create or replace function public.run_remodel_control(p_mode text default 'draws')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_name text:=case when p_mode='quality' then 'Calidad de Obra (Remodelacion)' else 'Control de Draws y HML (Remodelacion)' end;
  v_agent public.agent_registry%rowtype; v_key text; v_prefix text; v_evidence jsonb;
  v_n int:=0; v_outcome text; v_retired int:=0; v_seen text[]:=array[]::text[];
begin
  if p_mode not in ('draws','quality') then raise exception 'modo no permitido: %',p_mode; end if;
  select * into v_agent from agent_registry where nombre=v_name and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'agente no encontrado: %',v_name; end if;
  if coalesce(v_agent.enabled,true)=false then return jsonb_build_object('ok',true,'skipped','disabled'); end if;
  v_prefix:='remod-control:'||p_mode||':';
  v_key:=v_prefix||current_date::text;

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

  if v_n>0 then
    select outcome into v_outcome from record_agent_proposal(
      v_agent.id,'conciliacion',
      jsonb_build_object('dedup_key',v_key,'requiere_aprobacion',true,'accion','revisar_'||p_mode),
      v_evidence);
    v_seen:=array[v_key];
  end if;
  select reconcile_agent_proposal_set(v_agent.id,'conciliacion',v_prefix,v_seen) into v_retired;
  insert into agent_audit_log(agent_id,input,output,resultado)
    values(v_agent.id,jsonb_build_object('mode',p_mode,'tipo','ejecucion_negocio'),
      v_evidence||jsonb_build_object('outcome',v_outcome,'retired',v_retired),'ok');
  update agent_registry set estado='asistido',eval_score=100,eval_fecha=current_date,updated_at=now() where id=v_agent.id;
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'hallazgos',v_n,'outcome',v_outcome,'retired',v_retired,'evidence',v_evidence);
end $$;

revoke all on function public.run_remodel_control(text) from public;
grant execute on function public.run_remodel_control(text) to postgres,service_role;
comment on function public.run_remodel_control(text) is 'Draws/HML y Calidad: refresca evidencia, retira hallazgos resueltos y nunca modifica la operación.';
