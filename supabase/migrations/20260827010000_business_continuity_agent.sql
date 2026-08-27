-- Director de Continuidad Operativa: comprueba que el negocio pueda seguir
-- operando sin depender de una persona presente. Solo observa, documenta y
-- propone correcciones; no paga, firma, publica ni modifica datos operativos.

insert into public.agent_registry
  (nombre, proceso, empresa, area, capa, linea, equipo, nivel_riesgo, estado,
   dueno, dueno_humano, responsabilidad, skills, tareas, disparadores, modelo, enabled, orden)
select
  'Director de Continuidad Operativa',
  'Continuidad y resiliencia del holding',
  'Rental Profitss', 'holding', 'Comando', 'Comando', 'Comando', 'P1', 'asistido',
  'CEO', 'gerencia@rentalprofitss.com',
  'Verifica que cada proceso crítico tenga responsable, ejecutor, horario, evidencia reciente, respaldo y ruta de escalamiento. Convoca revisiones y propone correcciones sin ejecutar acciones sensibles.',
  '["continuidad operativa","gestión de excepciones","salud de automatizaciones","SLA","coordinación entre áreas","recuperación ante fallos"]'::jsonb,
  '["revisar ejecuciones y errores de agentes","detectar decisiones envejecidas","comprobar reportes ejecutivos por empresa","detectar automatizaciones sin cron activo","preparar revisión semanal y junta mensual","escalar huecos con evidencia"]'::jsonb,
  '["diario 06:50","lunes 07:10","día 1 07:10"]'::jsonb,
  'claude-opus-4-8', true, 3
where not exists (
  select 1 from public.agent_registry
  where nombre='Director de Continuidad Operativa' and deleted_at is null
);

insert into public.agent_registry
  (nombre, proceso, empresa, area, capa, linea, equipo, nivel_riesgo, estado,
   dueno, dueno_humano, responsabilidad, skills, tareas, disparadores, modelo, enabled, orden)
select
  'Gerente de Éxito Estudiantil',
  'Salud, progreso y continuidad de estudiantes',
  'Educación', 'education', 'Operación', 'Educación', 'Escuadra Educación', 'P2', 'asistido',
  'Director de Continuidad Operativa', 'gerencia@rentalprofitss.com',
  'Vigila que cada estudiante activo tenga plan accesible, avance, próxima acción y acompañamiento. Detecta riesgo o fallos del portal y propone seguimiento sin enviar mensajes ni cambiar el plan por su cuenta.',
  '["éxito estudiantil","progreso de planes","riesgo de abandono","calidad del portal","seguimiento educativo","SLA de acompañamiento"]'::jsonb,
  '["detectar estudiantes activos sin plan","detectar inactividad mayor a 14 días","revisar planes sin tareas","medir avance y tareas pendientes","preparar reporte diario de excepciones","escalar fallos de generación o acceso al plan"]'::jsonb,
  '["diario 07:05","lunes 07:20"]'::jsonb,
  'claude-sonnet-4-6', true, 1
where not exists (
  select 1 from public.agent_registry
  where nombre='Gerente de Éxito Estudiantil' and deleted_at is null
);

create table if not exists public.agent_decision_policies (
  tipo_accion text primary key,
  categoria text not null check (categoria in ('control','operativa','financiera','comunicacion','sensible')),
  rol_primario text not null,
  rol_respaldo text not null,
  rol_escalamiento text not null default 'CEO',
  sla_hours integer not null check (sla_hours between 1 and 720),
  auto_execute boolean not null default false,
  requiere_evidencia boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.agent_decision_policies enable row level security;
drop policy if exists agent_decision_policies_read on public.agent_decision_policies;
create policy agent_decision_policies_read on public.agent_decision_policies
  for select to authenticated using (true);

insert into public.agent_decision_policies
  (tipo_accion,categoria,rol_primario,rol_respaldo,rol_escalamiento,sla_hours,auto_execute,requiere_evidencia)
values
  ('conciliacion','control','Controller','Director de Continuidad Operativa','CEO',24,false,true),
  ('correccion_dato','control','Auditor de Agentes','Director de Continuidad Operativa','CEO',24,false,true),
  ('nudge','operativa','Gerente del área','Director de Continuidad Operativa','CEO',24,false,true),
  ('recordatorio_cobro','comunicacion','Gerente de Rentas','Controller','CEO',24,false,true),
  ('cuello_botella','control','Gerente del área','Director de Continuidad Operativa','CEO',12,false,true),
  ('plan_ocupacion','operativa','Gerente de Rentas','Director de Continuidad Operativa','CEO',48,false,true),
  ('precio_dinamico','financiera','Gerente de Rentas','Controller','CEO',24,false,true),
  ('nomina','financiera','Controller','Gerente de Remodelación','CEO',12,false,true),
  ('refechar_tarea','operativa','Gerente del área','Director de Continuidad Operativa','CEO',48,false,true),
  ('archivar_tarea','sensible','Gerente del área','Auditor de Agentes','CEO',72,false,true)
on conflict (tipo_accion) do update set
  categoria=excluded.categoria,rol_primario=excluded.rol_primario,rol_respaldo=excluded.rol_respaldo,
  rol_escalamiento=excluded.rol_escalamiento,sla_hours=excluded.sla_hours,
  auto_execute=excluded.auto_execute,requiere_evidencia=excluded.requiere_evidencia,updated_at=now();

insert into public.agent_knowledge_domains
  (codigo,nombre,area,descripcion,fuentes,metricas_clave,sistemas,freshness_hours)
values
  ('finanzas-holding','Finanzas y control del holding','contable',
   'Resultado por empresa, caja, conciliación, cierre, variaciones y calidad de los libros.',
   '["v_holding_pnl","qb_report_cache","v_cartera_kpi","ff_hml_payments","remodel_overhead"]',
   '["ingresos","gastos","EBITDA","caja","variación mensual","antigüedad de sincronización"]',
   '["QuickBooks","Empresa OS","Supabase"]',24),
  ('capital-inversionistas','Capital e inversionistas','inversionistas',
   'Capital aportado, documentos, distribuciones, hitos y transparencia del portal del inversionista.',
   '["ff_investors","inv_ledger","inv_distributions","inv_documents","ff_stage_history"]',
   '["capital aportado","capital desplegado","distribuciones","documentos pendientes","etapa por propiedad"]',
   '["Portal del inversionista","Empresa OS","Airtable Flipping"]',24),
  ('educacion','Educación y éxito estudiantil','education',
   'Progreso de estudiantes, planes, tareas, acompañamiento, contenido y alertas de abandono.',
   '["edu_students","edu_student_plans","edu_student_plan_tasks","edu_whatsapp_messages","edu_okr_targets"]',
   '["estudiantes activos","avance","tareas vencidas","planes generados","riesgo de abandono"]',
   '["FlipMentoría","Airtable Educación","WhatsApp"]',24),
  ('sistemas-confiabilidad','Sistemas, datos y confiabilidad','operacion',
   'Disponibilidad de integraciones, crons, sincronizaciones, seguridad, errores y recuperación.',
   '["cron.job","agent_audit_log","data_lineage_runs","qb_report_cache","agent_registry"]',
   '["jobs activos","errores 24h","frescura de fuentes","cobertura de linaje","agentes con evidencia"]',
   '["Supabase","Vercel","Airtable","QuickBooks","ClickUp"]',12)
on conflict (codigo) do update set
  nombre=excluded.nombre, area=excluded.area, descripcion=excluded.descripcion,
  fuentes=excluded.fuentes, metricas_clave=excluded.metricas_clave,
  sistemas=excluded.sistemas, freshness_hours=excluded.freshness_hours,
  activo=true, updated_at=now();

-- Todo el equipo recibe contexto de los nuevos dominios. El Director de
-- Continuidad los conoce como especialista; asignado no equivale a verificado.
insert into public.agent_knowledge_assignments (agent_id,domain_id,profundidad)
select a.id,d.id,
  case
    when a.nombre='Director de Continuidad Operativa' then 'especialista'
    when a.nombre='Gerente de Éxito Estudiantil' and d.codigo='educacion' then 'especialista'
    else 'contexto'
  end
from public.agent_registry a
join public.agent_knowledge_domains d
  on d.codigo in ('finanzas-holding','capital-inversionistas','educacion','sistemas-confiabilidad')
where a.deleted_at is null
on conflict (agent_id,domain_id) do update set
  profundidad=excluded.profundidad, updated_at=now();

create or replace function public.run_student_success_review(p_mode text default 'daily')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype;
  v_corte date := (now() at time zone 'America/Chicago')::date;
  v_active int:=0; v_risk int:=0; v_inactive int:=0; v_no_activity_signal int:=0;
  v_completed_without_plan int:=0; v_expired_invites int:=0;
  v_plans_without_tasks int:=0; v_pending_tasks int:=0; v_out jsonb; v_dedup text;
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
   where p.status='active' and not exists(
     select 1 from public.edu_student_plan_tasks t where t.plan_id=p.id
   );
  select count(*) into v_pending_tasks from public.edu_student_plan_tasks t
   join public.edu_student_plans p on p.id=t.plan_id
   where p.status='active' and coalesce(t.completed,false)=false;

  v_dedup:='student-success:'||p_mode||':'||v_corte::text;
  v_out:=jsonb_build_object(
    'modo',p_mode,'corte',v_corte,
    'estudiantes',jsonb_build_object('vigentes',v_active,'en_riesgo',v_risk,'inactivos_14d_con_senal',v_inactive,'sin_senal_de_actividad',v_no_activity_signal),
    'planes',jsonb_build_object('diagnosticos_completos_sin_plan',v_completed_without_plan,'planes_sin_tareas',v_plans_without_tasks,'tareas_pendientes',v_pending_tasks,'invitaciones_vencidas_sin_completar',v_expired_invites),
    'severidad',case when v_completed_without_plan>0 or v_plans_without_tasks>0 then 'critico'
      when v_risk>0 or v_inactive>0 or v_no_activity_signal>0 or v_expired_invites>0 then 'atencion' else 'saludable' end,
    'proxima_accion','Asignar responsable y fecha a cada excepción; confirmar que el estudiante puede reabrir y descargar su plan.',
    'fuentes',jsonb_build_array('edu_students','edu_student_plans','edu_student_plan_tasks'),
    'limite','Solo observa y propone; no envía mensajes, no modifica planes ni cambia estados.'
  );

  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='exito_estudiantil' and corte=v_corte and archived_at is null;
  if not found then
    insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('exito_estudiantil',v_corte,'Éxito estudiantil · '||v_corte,'borrador','ejecutor',v_out,'Gerente de Éxito Estudiantil');
  end if;
  update public.agent_proposals set evidencia=v_out
   where agent_id=v_agent.id and deleted_at is null and payload->>'dedup_key'=v_dedup;
  if not found and (v_completed_without_plan>0 or v_plans_without_tasks>0 or v_risk>0 or v_inactive>0 or v_no_activity_signal>0 or v_expired_invites>0) then
    insert into public.agent_proposals(agent_id,tipo_accion,estado,payload,evidencia)
    values(v_agent.id,'cuello_botella','propuesta',
      jsonb_build_object('dedup_key',v_dedup,'accion','resolver_excepciones_estudiantiles','requiere_aprobacion',true),v_out);
  elsif not (v_completed_without_plan>0 or v_plans_without_tasks>0 or v_risk>0 or v_inactive>0 or v_no_activity_signal>0 or v_expired_invites>0) then
    update public.agent_proposals set estado='ejecutada'
     where agent_id=v_agent.id and deleted_at is null and payload->>'dedup_key'=v_dedup and estado='propuesta';
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
  if p_mode not in ('daily','weekly','monthly') then
    raise exception 'modo inválido: %',p_mode;
  end if;

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
    select agent_id,tipo_accion,
      coalesce(property_id::text,evidencia->>'property_id',evidencia->>'address',payload->>'dedup_key','sin-asunto') asunto
    from public.agent_proposals
    where estado='propuesta' and deleted_at is null and created_at<now()-interval '7 days'
      and tipo_accion<>'informe'
    group by agent_id,tipo_accion,
      coalesce(property_id::text,evidencia->>'property_id',evidencia->>'address',payload->>'dedup_key','sin-asunto')
  ) decisiones_agrupadas;
  select count(*) into v_inactive_crons from cron.job
   where active=false and (jobname like 'agent-%' or jobname like 'rentas-%'
     or jobname like 'remod-%' or jobname like 'ff-%' or jobname like 'cerebro-%');
  select count(*) into v_missing_reports from (values
    ('foto_ejecutiva_ff'),('foto_ejecutiva_rentas'),('foto_ejecutiva_remodelacion')
  ) as expected(tipo)
  where not exists (
    select 1 from public.pm_informes i where i.tipo=expected.tipo
      and i.archived_at is null and i.corte>=v_corte-interval '2 days'
  );
  select count(distinct empresa) into v_qb_stale from public.qb_report_cache
   where active is true and fetched_at<now()-interval '36 hours';

  v_severity:=case
    when v_failed>0 or v_missing_reports>=2 then 'critico'
    when v_old_decisions>0 or v_inactive_crons>0 or v_qb_stale>0 or v_recent<v_total then 'atencion'
    else 'saludable' end;
  v_report_type:=case p_mode when 'weekly' then 'continuidad_operativa_semanal'
    when 'monthly' then 'continuidad_operativa_mensual' else 'continuidad_operativa_diaria' end;
  v_dedup:='continuidad:'||p_mode||':'||v_corte::text;

  v_out:=jsonb_build_object(
    'modo',p_mode,'corte',v_corte,'severidad',v_severity,
    'equipo',jsonb_build_object('puestos',v_total,'con_evidencia_en_sla',v_recent,'sin_evidencia_en_sla',greatest(v_total-v_recent,0)),
    'excepciones',jsonb_build_object('fallos_24h',v_failed,'decisiones_mayores_7d',v_old_decisions,
      'crons_inactivos',v_inactive_crons,'fotos_ejecutivas_faltantes',v_missing_reports,'empresas_qb_desactualizadas',v_qb_stale),
    'recomendacion',case
      when v_severity='critico' then 'Resolver fallos y fotos ejecutivas faltantes antes de iniciar nuevas iniciativas.'
      when v_severity='atencion' then 'Asignar dueño y fecha a cada excepción; revisar la cola en la próxima junta operativa.'
      else 'Operación con evidencia suficiente; sostener cadencia y buscar mejoras de margen/tiempo.' end,
    'fuentes',jsonb_build_array('agent_registry','agent_audit_log','agent_proposals','cron.job','pm_informes','qb_report_cache'),
    'limite','Solo observa y propone. No ejecuta pagos, contratos, mensajes externos ni cambios contables.'
  );

  if not exists(select 1 from public.pm_informes where tipo=v_report_type and corte=v_corte and archived_at is null) then
    insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values(v_report_type,v_corte,'Continuidad Operativa · '||initcap(p_mode)||' · '||v_corte,
      'borrador','ejecutor',v_out,'Director de Continuidad Operativa');
  end if;

  if v_severity<>'saludable' and not exists(
    select 1 from public.agent_proposals where agent_id=v_agent.id and deleted_at is null
      and payload->>'dedup_key'=v_dedup
  ) then
    insert into public.agent_proposals(agent_id,tipo_accion,estado,payload,evidencia)
    values(v_agent.id,'cuello_botella','propuesta',
      jsonb_build_object('dedup_key',v_dedup,'accion','resolver_excepciones_de_continuidad','requiere_aprobacion',true),v_out);
  end if;

  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent.id,jsonb_build_object('modo',p_mode,'tipo','ejecucion_negocio'),v_out,'ok');
  update public.agent_registry set estado='asistido',eval_score=100,eval_fecha=current_date,updated_at=now()
   where id=v_agent.id;
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'result',v_out);
end $$;

revoke all on function public.run_business_continuity_review(text) from public;
grant execute on function public.run_business_continuity_review(text) to postgres,service_role;

do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in
    ('continuity-daily','continuity-weekly','continuity-monthly','student-success-daily','student-success-weekly');
exception when others then null; end $$;
select cron.schedule('continuity-daily','50 12 * * *',
  $$select public.run_business_continuity_review('daily')$$);
select cron.schedule('continuity-weekly','10 13 * * 1',
  $$select public.run_business_continuity_review('weekly')$$);
select cron.schedule('continuity-monthly','10 13 1 * *',
  $$select public.run_business_continuity_review('monthly')$$);
select cron.schedule('student-success-daily','5 13 * * *',
  $$select public.run_student_success_review('daily')$$);
select cron.schedule('student-success-weekly','20 13 * * 1',
  $$select public.run_student_success_review('weekly')$$);

comment on function public.run_business_continuity_review(text) is
  'Revisión diaria/semanal/mensual de continuidad: evidencia, fallos, decisiones envejecidas, crons, fotos por empresa y frescura QBO. Solo reporta y propone.';
comment on function public.run_student_success_review(text) is
  'Revisión diaria/semanal de estudiantes activos, riesgo, inactividad, planes y tareas. Solo reporta y propone.';
