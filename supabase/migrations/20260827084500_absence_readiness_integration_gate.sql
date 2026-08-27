-- A six-month absence cannot be certified while a core integration is broken.

do $$
begin
  if to_regprocedure('public.run_absence_readiness_review_11_gates()') is null then
    alter function public.run_absence_readiness_review() rename to run_absence_readiness_review_11_gates;
  end if;
end $$;

create or replace function public.run_absence_readiness_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_base jsonb; v_result jsonb; v_health jsonb; v_integrations_ok boolean:=false;
  v_passed int:=0; v_corte date:=(now() at time zone 'America/Chicago')::date;
begin
  v_health:=public.run_integration_health_review();
  v_base:=public.run_absence_readiness_review_11_gates();
  v_result:=coalesce(v_base->'result','{}'::jsonb);
  v_integrations_ok:=coalesce((v_health#>>'{result,kpis,integraciones_saludables}')::int,0)
    =coalesce((v_health#>>'{result,kpis,integraciones_vigiladas}')::int,4);
  v_passed:=coalesce((v_result->>'compuertas_aprobadas')::int,0)+case when v_integrations_ok then 1 else 0 end;

  v_result:=jsonb_set(v_result,'{compuertas,integraciones}',jsonb_build_object(
    'ok',v_integrations_ok,
    'saludables',coalesce((v_health#>>'{result,kpis,integraciones_saludables}')::int,0),
    'vigiladas',coalesce((v_health#>>'{result,kpis,integraciones_vigiladas}')::int,4),
    'detalle',v_health#>'{result,conexiones}'
  ),true);
  v_result:=jsonb_set(v_result,'{compuertas_totales}','12'::jsonb,true);
  v_result:=jsonb_set(v_result,'{compuertas_aprobadas}',to_jsonb(v_passed),true);
  v_result:=jsonb_set(v_result,'{estado}',to_jsonb(case when v_passed=12 then 'listo' else 'no_listo' end),true);
  if not v_integrations_ok then
    v_result:=jsonb_set(v_result,'{bloqueo_integraciones}',to_jsonb(
      'Recuperar las integraciones sin sincronización real antes de delegar la operación.'::text),true);
  end if;

  update public.pm_informes set payload=v_result,updated_at=now()
  where tipo='continuidad_ausencia_6_meses' and corte=v_corte and archived_at is null;
  return jsonb_build_object('ok',true,'result',v_result);
end $$;

revoke all on function public.run_absence_readiness_review() from public;
grant execute on function public.run_absence_readiness_review() to postgres,service_role;
comment on function public.run_absence_readiness_review() is
  'Certifica doce compuertas de ausencia prolongada; una integración rota impide marcar la operación como lista.';

select public.run_absence_readiness_review();
