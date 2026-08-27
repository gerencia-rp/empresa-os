-- Una aprobación humana no prueba ejecución. Este control hace visible el trabajo
-- aprobado que todavía no tiene executed_at, sin ejecutar pagos, mensajes ni datos.
create or replace function public.run_approved_work_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_corte date := (now() at time zone 'America/Chicago')::date;
  v_total int:=0; v_overdue int:=0; v_oldest int:=0; v_out jsonb;
begin
  select count(*),
         count(*) filter(where coalesce(approved_at,created_at)<now()-interval '24 hours'),
         coalesce(max(extract(day from now()-coalesce(approved_at,created_at)))::int,0)
    into v_total,v_overdue,v_oldest
  from public.agent_proposals
  where deleted_at is null and estado='aprobada' and tipo_accion<>'nuevo_agente'
    and executed_at is null;

  select jsonb_build_object(
    'corte',v_corte,
    'kpis',jsonb_build_object(
      'aprobadas_pendientes_ejecucion',v_total,
      'fuera_de_plazo_24h',v_overdue,
      'antiguedad_maxima_dias',v_oldest),
    'por_tipo',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.cantidad desc,x.tipo_accion)
      from (
        select tipo_accion,count(*)::int cantidad,
          case tipo_accion
            when 'recordatorio_cobro' then 'Gerente de Rentas + responsable humano de cobranza'
            when 'conciliacion' then 'Controller + Auditor de Integridad'
            when 'correccion_dato' then 'Dueño del sistema fuente + Auditor de Integridad'
            else 'Gerente del área + responsable humano' end responsable,
          case tipo_accion
            when 'recordatorio_cobro' then 'Validar destinatario y contenido; enviar solo desde canal autorizado.'
            when 'conciliacion' then 'Reconciliar contra soporte; no ajustar contabilidad sin evidencia.'
            when 'correccion_dato' then 'Confirmar fuente autoritativa y registrar antes/después.'
            else 'Confirmar evidencia y cerrar con bitácora.' end proxima_accion
        from public.agent_proposals
        where deleted_at is null and estado='aprobada' and tipo_accion<>'nuevo_agente'
          and executed_at is null
        group by tipo_accion
      ) x), '[]'::jsonb),
    'prioridad',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.dias_pendiente desc,x.aprobada asc)
      from (
        select p.id,p.tipo_accion,r.nombre agente,
          coalesce(p.approved_at,p.created_at)::date aprobada,
          extract(day from now()-coalesce(p.approved_at,p.created_at))::int dias_pendiente,
          case p.tipo_accion
            when 'recordatorio_cobro' then 'Gerente de Rentas + responsable humano de cobranza'
            when 'conciliacion' then 'Controller + Auditor de Integridad'
            when 'correccion_dato' then 'Dueño del sistema fuente + Auditor de Integridad'
            else 'Gerente del área + responsable humano' end responsable,
          left(coalesce(p.payload->>'accion',p.payload->>'tarea',p.evidencia->>'resumen',p.evidencia->>'titulo','Revisar evidencia original'),180) resumen
        from public.agent_proposals p left join public.agent_registry r on r.id=p.agent_id
        where p.deleted_at is null and p.estado='aprobada' and p.tipo_accion<>'nuevo_agente'
          and p.executed_at is null
        order by coalesce(p.approved_at,p.created_at) asc limit 25
      ) x), '[]'::jsonb),
    'historico_registro_agentes',(
      select count(*) from public.agent_proposals
      where deleted_at is null and estado='aprobada' and tipo_accion='nuevo_agente'),
    'regla','Aprobado no significa ejecutado. Este informe no envía mensajes, no mueve dinero y no modifica sistemas fuente.'
  ) into v_out;

  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='trabajo_aprobado_pendiente' and corte=v_corte and archived_at is null;
  if not found then
    insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('trabajo_aprobado_pendiente',v_corte,'Trabajo aprobado pendiente de ejecución · '||v_corte,
      'borrador','ejecutor',v_out,'Director de Continuidad Operativa');
  end if;
  return jsonb_build_object('ok',true,'result',v_out);
end $$;
revoke all on function public.run_approved_work_review() from public;
grant execute on function public.run_approved_work_review() to postgres,service_role;
comment on function public.run_approved_work_review() is
 'Separa aprobación de ejecución y asigna responsable al backlog aprobado sin realizar acciones externas.';

select cron.unschedule(jobid) from cron.job where jobname='approved-work-review-daily';
select cron.schedule('approved-work-review-daily','15 12 * * *',
  $$select public.run_approved_work_review();$$);

select public.run_approved_work_review();
