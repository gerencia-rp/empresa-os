-- Recurring controls must refresh one live subject instead of creating a new
-- CEO decision every day. Old unapproved snapshots are soft-retired only after
-- a complete fresh run. No proposed business action is approved or executed.

create or replace function public.run_student_success_review(p_mode text default 'daily')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype;
  v_corte date := (now() at time zone 'America/Chicago')::date;
  v_active int:=0; v_risk int:=0; v_inactive int:=0; v_no_activity_signal int:=0;
  v_completed_without_plan int:=0; v_expired_invites int:=0;
  v_plans_without_tasks int:=0; v_pending_tasks int:=0; v_out jsonb; v_dedup text;
  v_issue boolean;
begin
  if p_mode not in ('daily','weekly') then raise exception 'modo inválido: %',p_mode; end if;
  select * into v_agent from public.agent_registry
   where nombre='Gerente de Éxito Estudiantil' and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'Gerente de Éxito Estudiantil no encontrado'; end if;
  if coalesce(v_agent.enabled,true)=false then
    return jsonb_build_object('ok',true,'skipped','disabled','mode',p_mode);
  end if;

  select count(*) into v_active from public.edu_students
   where status='active' and active is not false and (expires_at is null or expires_at>=current_date);
  select count(*) into v_risk from public.edu_students
   where status='at_risk' and active is not false and (expires_at is null or expires_at>=current_date);
  select count(*) into v_inactive from public.edu_students
   where status='active' and active is not false and (expires_at is null or expires_at>=current_date)
     and last_activity_at is not null and last_activity_at<now()-interval '14 days';
  select count(*) into v_no_activity_signal from public.edu_students
   where status='active' and active is not false and (expires_at is null or expires_at>=current_date)
     and last_activity_at is null;
  select count(*) into v_completed_without_plan from public.edu_diagnostic_invites
   where completed_at is not null and result_plan_id is null;
  select count(*) into v_expired_invites from public.edu_diagnostic_invites
   where completed_at is null and expires_at<now();
  select count(*) into v_plans_without_tasks from public.edu_student_plans p
   where p.status='active' and not exists(select 1 from public.edu_student_plan_tasks t where t.plan_id=p.id);
  select count(*) into v_pending_tasks from public.edu_student_plan_tasks t
   join public.edu_student_plans p on p.id=t.plan_id
   where p.status='active' and coalesce(t.completed,false)=false;

  v_issue:=v_completed_without_plan>0 or v_plans_without_tasks>0 or v_risk>0
    or v_inactive>0 or v_no_activity_signal>0 or v_expired_invites>0;
  v_dedup:='student-success:'||p_mode;
  v_out:=jsonb_build_object(
    'modo',p_mode,'corte',v_corte,
    'estudiantes',jsonb_build_object('vigentes',v_active,'en_riesgo',v_risk,
      'inactivos_14d_con_senal',v_inactive,'sin_senal_de_actividad',v_no_activity_signal),
    'planes',jsonb_build_object('diagnosticos_completos_sin_plan',v_completed_without_plan,
      'planes_sin_tareas',v_plans_without_tasks,'tareas_pendientes',v_pending_tasks,
      'invitaciones_vencidas_sin_completar',v_expired_invites),
    'severidad',case when v_completed_without_plan>0 or v_plans_without_tasks>0 then 'critico'
      when v_issue then 'atencion' else 'saludable' end,
    'proxima_accion','Asignar responsable y fecha a cada excepción; confirmar que el estudiante puede reabrir y descargar su plan.',
    'fuentes',jsonb_build_array('edu_students','edu_student_plans','edu_student_plan_tasks'),
    'limite','Solo observa y propone; no envía mensajes, no modifica planes ni cambia estados.');

  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='exito_estudiantil' and corte=v_corte and archived_at is null;
  if not found then insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('exito_estudiantil',v_corte,'Éxito estudiantil · '||v_corte,'borrador','ejecutor',v_out,v_agent.nombre);
  end if;

  if v_issue then
    perform * from public.record_agent_proposal(v_agent.id,'cuello_botella',jsonb_build_object(
      'dedup_key',v_dedup,'accion','resolver_excepciones_estudiantiles','requiere_aprobacion',true),v_out);
    perform public.reconcile_agent_proposal_set(v_agent.id,'cuello_botella',v_dedup,array[v_dedup]);
  else
    perform public.reconcile_agent_proposal_set(v_agent.id,'cuello_botella',v_dedup,array[]::text[]);
  end if;
  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent.id,jsonb_build_object('modo',p_mode,'tipo','ejecucion_negocio'),v_out,'ok');
  update public.agent_registry set estado='asistido',eval_score=100,eval_fecha=current_date,updated_at=now()
   where id=v_agent.id;
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'result',v_out);
end $$;
revoke all on function public.run_student_success_review(text) from public;
grant execute on function public.run_student_success_review(text) to postgres,service_role;

create or replace function public.run_business_continuity_review(p_mode text default 'daily')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype;
  v_corte date := (now() at time zone 'America/Chicago')::date;
  v_total int:=0; v_recent int:=0; v_failed int:=0; v_old_decisions int:=0;
  v_inactive_crons int:=0; v_missing_reports int:=0; v_qb_stale int:=0;
  v_report_type text; v_dedup text; v_out jsonb; v_severity text;
begin
  if p_mode not in ('daily','weekly','monthly') then raise exception 'modo inválido: %',p_mode; end if;
  select * into v_agent from public.agent_registry
   where nombre='Director de Continuidad Operativa' and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'Director de Continuidad Operativa no encontrado'; end if;
  if coalesce(v_agent.enabled,true)=false then
    return jsonb_build_object('ok',true,'skipped','disabled','mode',p_mode);
  end if;

  select count(*) into v_total from public.agent_registry
   where deleted_at is null and linea not ilike 'Transversal%';
  select count(distinct a.id) into v_recent
    from public.agent_registry a join public.agent_audit_log l on l.agent_id=a.id
   where a.deleted_at is null and a.linea not ilike 'Transversal%'
     and l.ts>=now()-make_interval(days => case
       when lower(coalesce(a.disparadores::text,'')) ~ 'mensual|d[ií]a 1' then 40
       when lower(coalesce(a.disparadores::text,'')) ~ 'quincenal|cada 15' then 20
       when lower(coalesce(a.disparadores::text,'')) ~ 'semanal|lunes|martes|mi[eé]rcoles|jueves|viernes' then 10
       else 8 end)
     and coalesce(l.input->>'accion','') not in ('editar_ficha','reordenar','guardar_ficha');
  select count(*) into v_failed from public.agent_audit_log
   where ts>=now()-interval '24 hours' and lower(coalesce(resultado,'')) in ('error','failed','abort');
  select count(*) into v_old_decisions from (
    select agent_id,tipo_accion,coalesce(property_id::text,evidencia->>'property_id',
      evidencia->>'address',payload->>'dedup_key','sin-asunto') asunto
    from public.agent_proposals where estado='propuesta' and deleted_at is null
      and created_at<now()-interval '7 days' and tipo_accion<>'informe'
    group by agent_id,tipo_accion,coalesce(property_id::text,evidencia->>'property_id',
      evidencia->>'address',payload->>'dedup_key','sin-asunto')) q;
  select count(*) into v_inactive_crons from cron.job where active=false and
    (jobname like 'agent-%' or jobname like 'rentas-%' or jobname like 'remod-%'
      or jobname like 'ff-%' or jobname like 'cerebro-%');
  select count(*) into v_missing_reports from (values
    ('foto_ejecutiva_ff'),('foto_ejecutiva_rentas'),('foto_ejecutiva_remodelacion')) expected(tipo)
   where not exists(select 1 from public.pm_informes i where i.tipo=expected.tipo
     and i.archived_at is null and i.corte>=v_corte-interval '2 days');
  select count(distinct empresa) into v_qb_stale from public.qb_report_cache
   where active is true and fetched_at<now()-interval '36 hours';

  v_severity:=case when v_failed>0 or v_missing_reports>=2 then 'critico'
    when v_old_decisions>0 or v_inactive_crons>0 or v_qb_stale>0 or v_recent<v_total then 'atencion'
    else 'saludable' end;
  v_report_type:=case p_mode when 'weekly' then 'continuidad_operativa_semanal'
    when 'monthly' then 'continuidad_operativa_mensual' else 'continuidad_operativa_diaria' end;
  v_dedup:='continuidad:'||p_mode;
  v_out:=jsonb_build_object('modo',p_mode,'corte',v_corte,'severidad',v_severity,
    'equipo',jsonb_build_object('puestos',v_total,'con_evidencia_en_sla',v_recent,
      'sin_evidencia_en_sla',greatest(v_total-v_recent,0)),
    'excepciones',jsonb_build_object('fallos_24h',v_failed,'decisiones_mayores_7d',v_old_decisions,
      'crons_inactivos',v_inactive_crons,'fotos_ejecutivas_faltantes',v_missing_reports,
      'empresas_qb_desactualizadas',v_qb_stale),
    'recomendacion',case when v_severity='critico' then
      'Resolver fallos y fotos ejecutivas faltantes antes de iniciar nuevas iniciativas.'
      when v_severity='atencion' then
      'Asignar dueño y fecha a cada excepción; revisar la cola en la próxima junta operativa.'
      else 'Operación con evidencia suficiente; sostener cadencia y buscar mejoras de margen/tiempo.' end,
    'fuentes',jsonb_build_array('agent_registry','agent_audit_log','agent_proposals','cron.job','pm_informes','qb_report_cache'),
    'limite','Solo observa y propone. No ejecuta pagos, contratos, mensajes externos ni cambios contables.');

  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo=v_report_type and corte=v_corte and archived_at is null;
  if not found then insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values(v_report_type,v_corte,'Continuidad Operativa · '||initcap(p_mode)||' · '||v_corte,
      'borrador','ejecutor',v_out,v_agent.nombre); end if;
  if v_severity<>'saludable' then
    perform * from public.record_agent_proposal(v_agent.id,'cuello_botella',jsonb_build_object(
      'dedup_key',v_dedup,'accion','resolver_excepciones_de_continuidad','requiere_aprobacion',true),v_out);
    perform public.reconcile_agent_proposal_set(v_agent.id,'cuello_botella',v_dedup,array[v_dedup]);
  else
    perform public.reconcile_agent_proposal_set(v_agent.id,'cuello_botella',v_dedup,array[]::text[]);
  end if;
  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent.id,jsonb_build_object('modo',p_mode,'tipo','ejecucion_negocio'),v_out,'ok');
  update public.agent_registry set estado='asistido',eval_score=100,eval_fecha=current_date,updated_at=now()
   where id=v_agent.id;
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'result',v_out);
end $$;
revoke all on function public.run_business_continuity_review(text) from public;
grant execute on function public.run_business_continuity_review(text) to postgres,service_role;

create or replace function public.run_data_integrity_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype; v_corte date:=(now() at time zone 'America/Chicago')::date;
  v_units int:=0; v_states int:=0; v_qb_stale int:=0; v_lineage_missing int:=0;
  v_lineage_age numeric:=999; v_reconciliations int:=0; v_critical int:=0;
  v_out jsonb; v_issue boolean; v_dedup text:='data-integrity';
begin
  select * into v_agent from public.agent_registry
   where nombre='Auditor de Integridad Financiera y Datos' and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'Auditor de Integridad Financiera y Datos no encontrado'; end if;
  select coalesce(unidades_rentables,0),coalesce(ocupadas,0)+coalesce(disponibles,0)
    +coalesce(mantenimiento,0)+coalesce(reservadas,0) into v_units,v_states from public.v_ocupacion limit 1;
  select count(distinct empresa) into v_qb_stale from public.qb_report_cache
   where active and fetched_at<now()-interval '36 hours';
  select coalesce(sin_linaje,0),extract(epoch from(now()-run_at))/3600
    into v_lineage_missing,v_lineage_age from public.lineage_coverage_runs order by run_at desc limit 1;
  select count(*) into v_reconciliations from public.agent_proposals
   where tipo_accion='conciliacion' and estado='propuesta' and deleted_at is null
     and created_at<now()-interval '24 hours';
  select count(*) into v_critical from public.ct_findings
   where active and resolved_at is null and severidad='critica';
  v_issue:=v_units<>v_states or v_qb_stale>0 or v_lineage_missing>0 or v_lineage_age>168
    or v_reconciliations>0 or v_critical>0;
  v_out:=jsonb_build_object('corte',v_corte,
    'severidad',case when v_issue then 'atencion' else 'saludable' end,
    'controles',jsonb_build_object(
      'ocupacion',jsonb_build_object('unidades',v_units,'estados',v_states,'ok',v_units=v_states),
      'quickbooks',jsonb_build_object('empresas_desactualizadas',v_qb_stale,'ok',v_qb_stale=0),
      'linaje',jsonb_build_object('sin_fuente',v_lineage_missing,'antiguedad_horas',round(v_lineage_age,1),
        'ok',v_lineage_missing=0 and v_lineage_age<=168),
      'conciliaciones',jsonb_build_object('vencidas_24h',v_reconciliations,'ok',v_reconciliations=0),
      'hallazgos_criticos',jsonb_build_object('abiertos',v_critical,'ok',v_critical=0)),
    'proxima_accion',case when v_issue then
      'Asignar responsable y corregir primero la fuente; nunca maquillar el indicador.'
      else 'Mantener controles y buscar anomalías nuevas.' end,
    'fuentes',jsonb_build_array('v_ocupacion','qb_report_cache','lineage_coverage_runs','agent_proposals','ct_findings'),
    'limite','Solo observa y propone. No modifica libros, pagos, fuentes ni registros operativos.');
  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='integridad_datos_diaria' and corte=v_corte and archived_at is null;
  if not found then insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('integridad_datos_diaria',v_corte,'Integridad financiera y de datos · '||v_corte,
      'borrador','ejecutor',v_out,v_agent.nombre); end if;
  if v_issue then
    perform * from public.record_agent_proposal(v_agent.id,'correccion_dato',jsonb_build_object(
      'dedup_key',v_dedup,'accion','resolver_integridad_datos','requiere_aprobacion',true),v_out);
    perform public.reconcile_agent_proposal_set(v_agent.id,'correccion_dato',v_dedup,array[v_dedup]);
  else
    perform public.reconcile_agent_proposal_set(v_agent.id,'correccion_dato',v_dedup,array[]::text[]);
  end if;
  insert into public.agent_audit_log(agent_id,input,output,resultado)
    values(v_agent.id,jsonb_build_object('tipo','ejecucion_negocio','modo','data_integrity'),v_out,'ok');
  update public.agent_registry set estado='asistido',eval_score=100,eval_fecha=current_date,updated_at=now()
   where id=v_agent.id;
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'result',v_out);
end $$;
revoke all on function public.run_data_integrity_review() from public;
grant execute on function public.run_data_integrity_review() to postgres,service_role;

-- Refresh each family now so production leaves the migration with one current
-- decision per recurring control and a new truthful SLA/absence report.
select public.run_student_success_review('daily');
select public.run_student_success_review('weekly');
select public.run_business_continuity_review('daily');
select public.run_business_continuity_review('weekly');
select public.run_business_continuity_review('monthly');
select public.run_data_integrity_review();
select public.run_decision_sla_review();
select public.run_absence_readiness_review();

comment on function public.run_student_success_review(text) is
  'Refreshes one stable student-success exception per cadence and retires old snapshots; never changes plans or sends messages.';
comment on function public.run_business_continuity_review(text) is
  'Refreshes one stable continuity exception per cadence and retires old snapshots; never approves or executes business work.';
comment on function public.run_data_integrity_review() is
  'Refreshes one stable data-integrity exception and retires old snapshots; never modifies financial or operating sources.';
