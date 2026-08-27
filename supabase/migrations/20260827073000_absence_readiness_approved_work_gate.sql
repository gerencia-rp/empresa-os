-- La continuidad no puede certificarse si una aprobación queda sin ejecución
-- verificable. Conserva las diez pruebas existentes y agrega esta undécima.
alter function public.run_absence_readiness_review()
  rename to run_absence_readiness_review_base;

create or replace function public.run_absence_readiness_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_base jsonb;
  v_result jsonb;
  v_pending int:=0;
  v_passed int:=0;
  v_corte date := (now() at time zone 'America/Chicago')::date;
begin
  v_base:=public.run_absence_readiness_review_base();
  v_result:=coalesce(v_base->'result','{}'::jsonb);

  select count(*) into v_pending
  from public.agent_proposals
  where deleted_at is null and estado='aprobada' and executed_at is null
    and tipo_accion<>'nuevo_agente';

  v_passed:=coalesce((v_result->>'compuertas_aprobadas')::int,0)
    + case when v_pending=0 then 1 else 0 end;
  v_result:=jsonb_set(v_result,'{compuertas,trabajo_aprobado}',
    jsonb_build_object('ok',v_pending=0,'pendientes_ejecucion',v_pending),true);
  v_result:=jsonb_set(v_result,'{compuertas_totales}','11'::jsonb,true);
  v_result:=jsonb_set(v_result,'{compuertas_aprobadas}',to_jsonb(v_passed),true);
  v_result:=jsonb_set(v_result,'{estado}',to_jsonb(case when v_passed=11 then 'listo' else 'no_listo' end),true);
  if v_pending>0 then
    v_result:=jsonb_set(v_result,'{bloqueo_trabajo_aprobado}',
      to_jsonb('Cerrar con evidencia los '||v_pending||' trabajos aprobados pendientes de ejecución.'),true);
  end if;

  update public.pm_informes set payload=v_result,updated_at=now()
  where tipo='continuidad_ausencia_6_meses' and corte=v_corte and archived_at is null;
  return jsonb_build_object('ok',true,'result',v_result);
end $$;
revoke all on function public.run_absence_readiness_review() from public;
grant execute on function public.run_absence_readiness_review() to postgres,service_role;
comment on function public.run_absence_readiness_review() is
 'Certifica once compuertas de ausencia prolongada; aprobación sin ejecución confirmada impide certificar.';

select public.run_absence_readiness_review();
