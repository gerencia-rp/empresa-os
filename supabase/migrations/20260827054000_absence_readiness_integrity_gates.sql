-- La certificación de ausencia incorpora dos compuertas que antes podían quedar ocultas:
-- integridad financiera crítica y automatizaciones sin señal.
create or replace function public.run_absence_readiness_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_corte date := (now() at time zone 'America/Chicago')::date;
  v_agents_total int:=0; v_agents_recent int:=0; v_failed int:=0;
  v_roles_total int:=0; v_roles_ready int:=0; v_decisions_overdue int:=0;
  v_occ_ok boolean:=false; v_lineage_ok boolean:=false; v_qb_stale int:=0;
  v_photos int:=0; v_cron_failed int:=0; v_automation_issues int:=0;
  v_financial_critical int:=0; v_passed int:=0; v_out jsonb;
begin
  select count(*) into v_agents_total from public.agent_registry
   where deleted_at is null and linea not ilike 'Transversal%';
  select count(distinct a.id) into v_agents_recent
  from public.agent_registry a join public.agent_audit_log l on l.agent_id=a.id
  where a.deleted_at is null and a.linea not ilike 'Transversal%'
    and l.ts>=now()-make_interval(days=>case
      when lower(coalesce(a.disparadores::text,'')) ~ 'mensual|d[ií]a 1' then 40
      when lower(coalesce(a.disparadores::text,'')) ~ 'quincenal|cada 15' then 20
      when lower(coalesce(a.disparadores::text,'')) ~ 'semanal|lunes|martes|mi[eé]rcoles|jueves|viernes' then 10
      else 8 end)
    and coalesce(l.input->>'accion','') not in ('editar_ficha','reordenar','guardar_ficha');
  select count(*) into v_failed from public.agent_audit_log
   where ts>=now()-interval '24 hours' and lower(coalesce(resultado,'')) in ('error','failed','abort');
  select count(*),count(*) filter(where primary_ready and backup_ready)
    into v_roles_total,v_roles_ready from public.v_operational_role_coverage;
  select coalesce((payload->>'fuera_de_sla')::int,0) into v_decisions_overdue
    from public.pm_informes where tipo='sla_decisiones' and archived_at is null order by corte desc,created_at desc limit 1;
  v_decisions_overdue:=coalesce(v_decisions_overdue,0);
  select coalesce(unidades_rentables,0)=coalesce(ocupadas,0)+coalesce(disponibles,0)+coalesce(mantenimiento,0)+coalesce(reservadas,0)
    into v_occ_ok from public.v_ocupacion limit 1;
  select coalesce(ok,false) and coalesce(sin_linaje,1)=0 and run_at>=now()-interval '7 days'
    into v_lineage_ok from public.lineage_coverage_runs order by run_at desc limit 1;
  v_lineage_ok:=coalesce(v_lineage_ok,false);
  select count(distinct empresa) into v_qb_stale from public.qb_report_cache
    where active and fetched_at<now()-interval '36 hours';
  select count(distinct tipo) into v_photos from public.pm_informes
    where tipo in('foto_ejecutiva_ff','foto_ejecutiva_rentas','foto_ejecutiva_remodelacion')
      and archived_at is null and corte>=v_corte-2;
  select count(*) into v_cron_failed from cron.job_run_details d join cron.job j on j.jobid=d.jobid
    where d.start_time>=now()-interval '7 days' and d.status='failed' and j.active
      and (j.jobname like 'ff-%' or j.jobname like 'remod-%' or j.jobname like 'rentas-%'
        or j.jobname like 'continuity-%' or j.jobname like 'student-success-%' or j.jobname like 'cerebro-%');
  select count(*) into v_automation_issues from public.v_automation_health where health<>'healthy';
  select count(*) into v_financial_critical from public.ct_findings
    where active and resolved_at is null and archived_at is null and severidad='critica';

  v_passed := (case when v_agents_total>0 and v_agents_recent=v_agents_total and v_failed=0 then 1 else 0 end)
    +(case when v_roles_total>0 and v_roles_ready=v_roles_total then 1 else 0 end)
    +(case when v_decisions_overdue=0 then 1 else 0 end)
    +(case when v_occ_ok then 1 else 0 end)+(case when v_lineage_ok then 1 else 0 end)
    +(case when v_qb_stale=0 then 1 else 0 end)+(case when v_photos=3 then 1 else 0 end)
    +(case when v_cron_failed=0 then 1 else 0 end)
    +(case when v_automation_issues=0 then 1 else 0 end)
    +(case when v_financial_critical=0 then 1 else 0 end);

  v_out:=jsonb_build_object('corte',v_corte,'compuertas_aprobadas',v_passed,'compuertas_totales',10,
    'estado',case when v_passed=10 then 'listo' else 'no_listo' end,
    'compuertas',jsonb_build_object(
      'agentes',jsonb_build_object('ok',v_agents_total>0 and v_agents_recent=v_agents_total and v_failed=0,'evidencia',v_agents_recent||'/'||v_agents_total,'fallos_24h',v_failed),
      'cobertura_humana',jsonb_build_object('ok',v_roles_total>0 and v_roles_ready=v_roles_total,'evidencia',v_roles_ready||'/'||v_roles_total),
      'decisiones',jsonb_build_object('ok',v_decisions_overdue=0,'fuera_de_sla',v_decisions_overdue),
      'ocupacion',jsonb_build_object('ok',v_occ_ok),
      'linaje',jsonb_build_object('ok',v_lineage_ok),
      'quickbooks',jsonb_build_object('ok',v_qb_stale=0,'empresas_desactualizadas',v_qb_stale),
      'reportes_ejecutivos',jsonb_build_object('ok',v_photos=3,'presentes',v_photos||'/3'),
      'automatizaciones_sin_fallos',jsonb_build_object('ok',v_cron_failed=0,'fallos_7d',v_cron_failed),
      'automatizaciones_con_senal',jsonb_build_object('ok',v_automation_issues=0,'requieren_atencion',v_automation_issues),
      'integridad_financiera',jsonb_build_object('ok',v_financial_critical=0,'hallazgos_criticos',v_financial_critical)),
    'bloqueo_principal',case
      when v_financial_critical>0 then 'Conciliar y resolver con soporte los hallazgos financieros críticos.'
      when v_roles_ready<v_roles_total then 'Asignar titular y respaldo verificados a cada rol crítico.'
      when v_decisions_overdue>0 then 'Resolver la cola de decisiones fuera de SLA.'
      when v_automation_issues>0 then 'Recuperar automatizaciones críticas sin señal.'
      when v_passed<10 then 'Resolver las compuertas técnicas pendientes.' else 'Ninguno.' end,
    'limite','Listo significa controles verificables; no autoriza pagos, firmas, contratos ni comunicaciones sensibles.');
  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='continuidad_ausencia_6_meses' and corte=v_corte and archived_at is null;
  if not found then insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('continuidad_ausencia_6_meses',v_corte,'Preparación para ausencia de 6 meses · '||v_corte,
      'borrador','ejecutor',v_out,'Director de Continuidad Operativa'); end if;
  return jsonb_build_object('ok',true,'result',v_out);
end $$;
revoke all on function public.run_absence_readiness_review() from public;
grant execute on function public.run_absence_readiness_review() to postgres,service_role;
comment on function public.run_absence_readiness_review() is
 'Certifica diariamente 10 compuertas para ausencia prolongada, incluida integridad financiera y señal de automatizaciones.';
select public.run_absence_readiness_review();
