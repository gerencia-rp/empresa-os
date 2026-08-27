-- Triage ejecutivo de excepciones financieras vigentes.
-- Convierte los hallazgos técnicos del Sabueso en un informe humano y priorizado.
-- Solo observa y reporta: nunca corrige fuentes, libros, pagos ni hallazgos.
create or replace function public.run_financial_exception_triage()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype;
  v_corte date := (now() at time zone 'America/Chicago')::date;
  v_total int := 0;
  v_critical int := 0;
  v_critical_impact numeric := 0;
  v_oldest_days int := 0;
  v_by_category jsonb := '[]'::jsonb;
  v_top jsonb := '[]'::jsonb;
  v_out jsonb;
begin
  select * into v_agent from public.agent_registry
   where nombre='Auditor de Integridad Financiera y Datos' and deleted_at is null limit 1;
  if v_agent.id is null then
    raise exception 'Auditor de Integridad Financiera y Datos no encontrado';
  end if;

  select count(*),
    count(*) filter(where severidad='critica'),
    coalesce(sum(abs(coalesce(impacto_usd,0))) filter(where severidad='critica'),0),
    coalesce(max((current_date-first_seen::date)),0)
    into v_total,v_critical,v_critical_impact,v_oldest_days
  from public.ct_findings
  where active and resolved_at is null and archived_at is null;

  with classified as (
    select case
      when check_id='C1' then 'Conciliación OS ↔ QuickBooks'
      when check_id='C4' then 'Cartera de rentas por cobrar'
      when check_id='C11' then 'Draws recibidos vs cobros de remodelación'
      when check_id in('C10','C15') then 'Préstamos HML, intereses y extensiones'
      when check_id='C12' then 'Nómina y horas de obra'
      else 'Otros controles financieros'
    end categoria,
    case
      when check_id='C1' then 'Controller + Auditor: conciliar saldos por cuenta y adjuntar soporte; no registrar ajustes sin aprobación.'
      when check_id='C4' then 'Financiero Rentas: validar ledger, contacto y plan de cobro por propiedad.'
      when check_id='C11' then 'Financiero Fix & Flip + Remodelación: conciliar cada draw, cobro y comprobante por propiedad.'
      when check_id in('C10','C15') then 'Financiero Fix & Flip: confirmar estado del préstamo, extensión y comprobantes con el HML.'
      when check_id='C12' then 'Financiero Remodelación: cargar horas, nómina y soportes reales de la obra.'
      else 'Auditor de Integridad: validar la fuente y asignar dueño antes de corregir.'
    end siguiente_accion,
    severidad,abs(coalesce(impacto_usd,0)) impacto,first_seen
    from public.ct_findings
    where active and resolved_at is null and archived_at is null
  ), grouped as (
    select categoria,siguiente_accion,count(*) abiertos,
      count(*) filter(where severidad='critica') criticos,
      round(sum(impacto),2) impacto_usd,
      min(first_seen) desde
    from classified group by categoria,siguiente_accion
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'categoria',categoria,'abiertos',abiertos,'criticos',criticos,
    'impacto_usd',impacto_usd,'desde',desde,'siguiente_accion',siguiente_accion)
    order by criticos desc,impacto_usd desc),'[]'::jsonb)
  into v_by_category from grouped;

  with ranked as (
    select check_id,empresa,clave,titulo,fuente,severidad,
      round(abs(coalesce(impacto_usd,0)),2) impacto_usd,
      first_seen,last_seen,
      case
        when check_id='C1' then 'Controller + Auditor de Integridad'
        when check_id='C4' then 'Financiero Rentas'
        when check_id='C11' then 'Financiero Fix & Flip + Financiero Remodelación'
        when check_id in('C10','C15') then 'Financiero Fix & Flip'
        when check_id='C12' then 'Financiero Remodelación'
        else 'Auditor de Integridad Financiera y Datos'
      end responsable,
      row_number() over(order by
        case severidad when 'critica' then 1 when 'alta' then 2 when 'media' then 3 else 4 end,
        abs(coalesce(impacto_usd,0)) desc,first_seen) priority
    from public.ct_findings
    where active and resolved_at is null and archived_at is null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'prioridad',priority,'check',check_id,'empresa',empresa,'titulo',titulo,
    'impacto_usd',impacto_usd,'severidad',severidad,'fuente',fuente,
    'responsable',responsable,'dias_abierto',(current_date-first_seen::date),
    'ultima_confirmacion',last_seen) order by priority),'[]'::jsonb)
  into v_top from ranked where priority<=15;

  v_out := jsonb_build_object(
    'resumen',case when v_critical>0
      then v_critical||' alertas críticas requieren conciliación y evidencia; ninguna fue cerrada automáticamente.'
      else 'No hay alertas financieras críticas abiertas.' end,
    'estado',case when v_critical>0 then 'atencion_inmediata' when v_total>0 then 'seguimiento' else 'saludable' end,
    'kpis',jsonb_build_object('hallazgos_abiertos',v_total,'criticos',v_critical,
      'impacto_critico_usd',round(v_critical_impact,2),'antiguedad_max_dias',v_oldest_days),
    'hallazgos_por_frente',v_by_category,
    'prioridades',v_top,
    'recomendaciones',jsonb_build_array(
      'Atender primero conciliación OS–QuickBooks y préstamos HML vencidos.',
      'Después conciliar draws por propiedad y cartera de rentas por antigüedad.',
      'Cerrar un hallazgo solo con soporte y corrección confirmada en la fuente de verdad.'),
    'fuentes',jsonb_build_array('ct_findings','QuickBooks','Airtable Fix & Flip','Airtable Remodelación','ledger de rentas'),
    'limite','Informe de observación. No modifica libros, pagos, cobros, préstamos, nómina ni hallazgos.');

  update public.pm_informes set payload=v_out,updated_at=now()
   where tipo='triage_excepciones_financieras' and corte=v_corte and archived_at is null;
  if not found then
    insert into public.pm_informes(tipo,corte,titulo,estado,origen,payload,generado_por)
    values('triage_excepciones_financieras',v_corte,
      'Prioridades financieras y de datos · '||v_corte,'borrador','ejecutor',v_out,v_agent.nombre);
  end if;

  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent.id,jsonb_build_object('tipo','ejecucion_negocio','modo','financial_exception_triage'),v_out,'ok');
  return jsonb_build_object('ok',true,'agent',v_agent.nombre,'result',v_out);
end $$;

revoke all on function public.run_financial_exception_triage() from public;
grant execute on function public.run_financial_exception_triage() to postgres,service_role;
comment on function public.run_financial_exception_triage() is
 'Prioriza diariamente excepciones financieras por impacto, antigüedad y responsable. Solo observa y reporta.';

do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname='financial-exception-triage-daily';
exception when others then null; end $$;
select cron.schedule('financial-exception-triage-daily','35 12 * * *',
  $$select public.run_financial_exception_triage()$$);

select public.run_financial_exception_triage();
