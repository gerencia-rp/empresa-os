-- Auditor independiente de integridad financiera y de datos.
-- Sustituye con evidencia las funciones legacy Líder Contable, Auditor de Datos
-- y Sabueso Contable. Solo observa, reporta y propone correcciones.
insert into public.agent_registry
  (nombre,proceso,empresa,area,capa,linea,equipo,nivel_riesgo,estado,dueno,dueno_humano,
   responsabilidad,skills,tareas,disparadores,modelo,enabled,orden)
select 'Auditor de Integridad Financiera y Datos','Integridad transversal de números y fuentes',
  'Rental Profitss','contable','Integrity','Meta','Equipo central','P1','asistido',
  'Director de Continuidad Operativa','gerencia@rentalprofitss.com',
  'Certifica que las cifras operativas y financieras reconcilien, tengan fuente vigente y no presenten divergencias silenciosas. Propone correcciones; nunca cambia libros, pagos ni datos fuente.',
  '["conciliación","calidad de datos","linaje","detección de anomalías","controles financieros","frescura de fuentes"]'::jsonb,
  '["reconciliar ocupación","verificar frescura QuickBooks","validar linaje","vigilar conciliaciones vencidas","revisar hallazgos críticos","emitir informe diario"]'::jsonb,
  '["diario 06:30","lunes 06:35"]'::jsonb,'claude-opus-4-8',true,4
where not exists(select 1 from public.agent_registry where nombre='Auditor de Integridad Financiera y Datos' and deleted_at is null);

insert into public.agent_knowledge_assignments(agent_id,domain_id,profundidad)
select a.id,d.id,'especialista' from public.agent_registry a join public.agent_knowledge_domains d
  on d.codigo in('finanzas-holding','sistemas-confiabilidad','holding')
where a.nombre='Auditor de Integridad Financiera y Datos' and a.deleted_at is null
on conflict(agent_id,domain_id) do update set profundidad='especialista',updated_at=now();

insert into public.operational_role_assignments
  (role_code,role_name,area,criticality,required_areas,notes)
values('data_integrity_auditor','Auditor de Integridad Financiera y Datos','contable','P1',array['contable','operacion'],
  'Control independiente de cifras, fuentes, linaje y conciliaciones.')
on conflict(role_code) do update set role_name=excluded.role_name,area=excluded.area,
  criticality=excluded.criticality,required_areas=excluded.required_areas,notes=excluded.notes,updated_at=now();

update public.agent_decision_policies set rol_respaldo='Auditor de Integridad Financiera y Datos',updated_at=now()
 where tipo_accion='conciliacion';
update public.agent_decision_policies set rol_primario='Auditor de Integridad Financiera y Datos',updated_at=now()
 where tipo_accion='correccion_dato';

create or replace function public.run_data_integrity_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype; v_corte date:=(now() at time zone 'America/Chicago')::date;
  v_units int:=0; v_states int:=0; v_qb_stale int:=0; v_lineage_missing int:=0;
  v_lineage_age numeric:=999; v_reconciliations int:=0; v_critical int:=0; v_out jsonb; v_issue boolean;
begin
  select * into v_agent from public.agent_registry
   where nombre='Auditor de Integridad Financiera y Datos' and deleted_at is null limit 1;
  if v_agent.id is null then raise exception 'Auditor de Integridad Financiera y Datos no encontrado'; end if;
  select coalesce(unidades_rentables,0),coalesce(ocupadas,0)+coalesce(disponibles,0)+coalesce(mantenimiento,0)+coalesce(reservadas,0)
    into v_units,v_states from public.v_ocupacion limit 1;
  select count(distinct empresa) into v_qb_stale from public.qb_report_cache
   where active and fetched_at<now()-interval '36 hours';
  select coalesce(sin_linaje,0),extract(epoch from(now()-run_at))/3600
    into v_lineage_missing,v_lineage_age from public.lineage_coverage_runs order by run_at desc limit 1;
  select count(*) into v_reconciliations from public.agent_proposals
   where tipo_accion='conciliacion' and estado='propuesta' and deleted_at is null
     and created_at<now()-interval '24 hours';
  select count(*) into v_critical from public.ct_findings
   where active and resolved_at is null and severidad='critica';
  v_issue:=v_units<>v_states or v_qb_stale>0 or v_lineage_missing>0 or v_lineage_age>168 or v_reconciliations>0 or v_critical>0;
  v_out:=jsonb_build_object('corte',v_corte,'severidad',case when v_issue then 'atencion' else 'saludable' end,
    'controles',jsonb_build_object(
      'ocupacion',jsonb_build_object('unidades',v_units,'estados',v_states,'ok',v_units=v_states),
      'quickbooks',jsonb_build_object('empresas_desactualizadas',v_qb_stale,'ok',v_qb_stale=0),
      'linaje',jsonb_build_object('sin_fuente',v_lineage_missing,'antiguedad_horas',round(v_lineage_age,1),'ok',v_lineage_missing=0 and v_lineage_age<=168),
      'conciliaciones',jsonb_build_object('vencidas_24h',v_reconciliations,'ok',v_reconciliations=0),
      'hallazgos_criticos',jsonb_build_object('abiertos',v_critical,'ok',v_critical=0)),
    'proxima_accion',case when v_issue then 'Asignar responsable y corregir primero la fuente; nunca maquillar el indicador.' else 'Mantener controles y buscar anomalías nuevas.' end,
    'fuentes',jsonb_build_array('v_ocupacion','qb_report_cache','lineage_coverage_runs','agent_proposals','ct_findings'),
    'limite','Solo observa y propone. No modifica libros, pagos, fuentes ni registros operativos.');
  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='integridad_datos_diaria' and corte=v_corte and archived_at is null;
  if not found then insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('integridad_datos_diaria',v_corte,'Integridad financiera y de datos · '||v_corte,
      'borrador','ejecutor',v_out,v_agent.nombre); end if;
  if v_issue and not exists(select 1 from public.agent_proposals where agent_id=v_agent.id and estado='propuesta'
    and deleted_at is null and payload->>'dedup_key'='data-integrity:'||v_corte::text) then
    insert into public.agent_proposals(agent_id,tipo_accion,estado,payload,evidencia)
    values(v_agent.id,'correccion_dato','propuesta',jsonb_build_object('dedup_key','data-integrity:'||v_corte::text,
      'accion','resolver_integridad_datos','requiere_aprobacion',true),v_out);
  end if;
  insert into public.agent_audit_log(agent_id,input,output,resultado)
    values(v_agent.id,jsonb_build_object('tipo','ejecucion_negocio','modo','data_integrity'),v_out,'ok');
  update public.agent_registry set estado='asistido',eval_score=100,eval_fecha=current_date,updated_at=now() where id=v_agent.id;
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'result',v_out);
end $$;
revoke all on function public.run_data_integrity_review() from public;
grant execute on function public.run_data_integrity_review() to postgres,service_role;
do $$ begin perform cron.unschedule(jobname) from cron.job where jobname='data-integrity-daily'; exception when others then null; end $$;
select cron.schedule('data-integrity-daily','30 12 * * *',$$select public.run_data_integrity_review()$$);
comment on function public.run_data_integrity_review() is
 'Audita diariamente reconciliación, frescura, linaje y excepciones contables. Solo reporta y propone.';
