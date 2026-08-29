-- Los informes son evidencia para leer, no decisiones que aprobar.
-- Centraliza snapshots diarios en pm_informes y limpia la cola sin borrar historial.
create or replace function public.record_agent_report(
  p_agent_id uuid,p_tipo text,p_corte date,p_titulo text,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_nombre text;
begin
  select nombre into v_nombre from public.agent_registry
   where id=p_agent_id and deleted_at is null and coalesce(enabled,true) limit 1;
  if v_nombre is null then raise exception 'Agente inactivo o inexistente'; end if;
  if nullif(trim(p_tipo),'') is null or p_corte is null then raise exception 'tipo y corte requeridos'; end if;

  select id into v_id from public.pm_informes
   where tipo=p_tipo and corte=p_corte and archived_at is null
   order by created_at desc limit 1;
  if v_id is null then
    insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values(p_tipo,p_corte,p_titulo,'borrador','ejecutor',coalesce(p_payload,'{}'::jsonb),v_nombre)
    returning id into v_id;
  else
    update public.pm_informes set titulo=p_titulo,payload=coalesce(p_payload,'{}'::jsonb),
      generado_por=v_nombre,updated_at=now() where id=v_id;
  end if;
  return v_id;
end $$;

revoke all on function public.record_agent_report(uuid,text,date,text,jsonb) from public;
grant execute on function public.record_agent_report(uuid,text,date,text,jsonb) to agentes_ia_exec,service_role,postgres;
comment on function public.record_agent_report(uuid,text,date,text,jsonb) is
 'Registra o refresca un informe diario fuera de la cola de decisiones.';

-- Preserva auditoría, pero retira todos los informes de la bandeja de aprobaciones.
update public.agent_proposals
set estado='rechazada',
    payload=coalesce(payload,'{}'::jsonb)||jsonb_build_object(
      'retired_reason','Los informes se consultan en Reportes y no requieren aprobación.',
      'retired_at',now())
where deleted_at is null and estado='propuesta' and tipo_accion='informe';

select public.run_decision_sla_review();
select public.run_absence_readiness_review();
