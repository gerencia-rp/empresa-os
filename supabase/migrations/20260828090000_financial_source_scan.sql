-- Auditor financiero autónomo: refresca diariamente C10/C11/C12/C15 desde las
-- fuentes operativas. No ajusta libros, pagos, cobros, préstamos ni fuentes.
-- C11 usa fondos disponibles de obra, no el draw bruto.
create or replace function public.run_financial_source_scan()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_agent public.agent_registry%rowtype;
  v_now timestamptz := now();
  v_today date := (now() at time zone 'America/Chicago')::date;
  v_c10_tol numeric := 0;
  v_c11_min numeric := 1000;
  v_c11_critical numeric := 5000;
  v_c12_progress numeric := 50;
  v_c15_grace numeric := 15;
  v_open int := 0;
  v_resolved int := 0;
  v_critical int := 0;
  v_out jsonb;
begin
  select * into v_agent from public.agent_registry
   where nombre='Auditor de Integridad Financiera y Datos' and deleted_at is null limit 1;
  if v_agent.id is null then
    raise exception 'Auditor de Integridad Financiera y Datos no encontrado';
  end if;

  select coalesce((select value::numeric from public.ct_config where key='c10_tolerancia_meses'),0),
         coalesce((select value::numeric from public.ct_config where key='c11_gap_min_usd'),1000),
         coalesce((select value::numeric from public.ct_config where key='c11_gap_critico_usd'),5000),
         coalesce((select value::numeric from public.ct_config where key='c12_avance_min_pct'),50),
         coalesce((select value::numeric from public.ct_config where key='c15_gracia_dias'),15)
    into v_c10_tol,v_c11_min,v_c11_critical,v_c12_progress,v_c15_grace;

  create temporary table financial_scan_current(
    check_id text not null,
    empresa text not null,
    clave text not null,
    titulo text not null,
    detalle jsonb not null,
    fuente text not null,
    impacto_usd numeric not null,
    severidad text not null,
    primary key(check_id,clave)
  ) on commit drop;

  -- C10: meses de interés declarados por encima del plazo + extensiones.
  insert into financial_scan_current
  with ext as (
    select address_norm,sum(meses) meses
      from public.ff_extension_payments
     where active and archived_at is null group by address_norm
  ), calc as (
    select dr.address,dr.address_norm,coalesce(dr.hml_months,0)::numeric cubiertos,
      case when coalesce(dr.interest_hml,0)>0 and coalesce(dr.hml_months,0)>0
        then dr.interest_hml/dr.hml_months else coalesce(d.hml_payment,0) end mensual,
      coalesce(nullif(l.plazo_meses,'')::numeric,0)+coalesce(ext.meses,0) plazo,
      coalesce(dr.interest_until_rent,0) interes_hueco
    from public.ff_draws dr
    join public.ff_hml_loans l on l.address_norm=dr.address_norm and l.active and l.archived_at is null
    left join public.ff_deals d on d.address_norm=dr.address_norm and d.active and d.archived_at is null
    left join ext on ext.address_norm=dr.address_norm
    where dr.active and dr.archived_at is null and coalesce(nullif(l.plazo_meses,'')::numeric,0)>0
  ), measured as (
    select *,case when mensual>0 then round(interes_hueco/mensual) end hueco
      from calc
  )
  select 'C10','fix_flip','meses-'||left(regexp_replace(lower(address_norm),'[^a-z0-9]','','g'),48),
    split_part(address,',',1)||': '||(cubiertos+hueco)||' meses de interés ('||cubiertos||
      ' cubiertos + '||hueco||' de hueco) superan el plazo documentado de '||plazo||
      ' meses. Confirmar periodos o registrar extensión con soporte.',
    jsonb_build_object('meses_cubiertos',cubiertos,'meses_hueco',hueco,
      'plazo_total',plazo,'exceso_meses',(cubiertos+hueco-plazo),'mensual',round(mensual,2)),
    'Airtable FF',round(abs(cubiertos+hueco-plazo)*mensual), 'critica'
  from measured where hueco is not null and cubiertos+hueco>plazo+v_c10_tol;

  -- C11: el dinero de obra es draw menos salidas financiadas por el mismo draw.
  insert into financial_scan_current
  with ext as (
    select address_norm,sum(monto) monto
      from public.ff_extension_payments
     where active and archived_at is null group by address_norm
  ), calc as (
    select dr.address,dr.address_norm,coalesce(dr.total_draws,0) draws,
      round(coalesce(dr.interest_hml,0)+coalesce(dr.services_hml,0)+
        coalesce(dr.furniture,0)+coalesce(ext.monto,0),2) salidas,
      coalesce(dr.remodel_complete,0) cobrado,l.draws_cobrados
    from public.ff_draws dr
    left join public.ff_hml_loans l on l.address_norm=dr.address_norm and l.active and l.archived_at is null
    left join ext on ext.address_norm=dr.address_norm
    where dr.active and dr.archived_at is null
  ), measured as (
    select *,round(draws-salidas,2) disponible,round(cobrado-(draws-salidas),2) gap
      from calc where draws<>0 or cobrado<>0
  )
  select 'C11','fix_flip','gap-draw-'||left(regexp_replace(lower(address_norm),'[^a-z0-9]','','g'),48),
    split_part(address,',',1)||': fondos disponibles para obra $'||to_char(disponible,'FM999G999G990D00')||
      ' (draw $'||to_char(draws,'FM999G999G990D00')||' − otras salidas $'||
      to_char(salidas,'FM999G999G990D00')||') vs cobrado $'||
      to_char(cobrado,'FM999G999G990D00')||' → gap '||
      case when gap>0 then '+' else '' end||'$'||to_char(gap,'FM999G999G990D00'),
    jsonb_build_object('draws',draws,'salidas_draw',salidas,
      'fondos_disponibles_obra',disponible,'cobrado',cobrado,'gap',gap,
      'draws_cobrados_hml',draws_cobrados),
    'Airtable FF',round(abs(gap),2),case when abs(gap)>=v_c11_critical then 'critica' else 'media' end
  from measured where abs(gap)>=v_c11_min;

  -- C12: obra ejecutada sin costo laboral real.
  insert into financial_scan_current
  select 'C12','remodelacion','labor0-'||left(regexp_replace(lower(address),'[^a-z0-9]','','g'),48),
    split_part(address,',',1)||' ('||coalesce(proceso,'en obra')||
      '): costo de trabajadores $0 con obra ejecutada; cargar nómina y soporte reales.',
    jsonb_build_object('proceso',proceso,'avance',coalesce(avance_real,avance_pct),
      'gasto_materiales',coalesce(gasto_materiales,0)),
    'Airtable Remodel',round(abs(coalesce(gasto_materiales,0))), 'critica'
  from public.remodel_at_properties
  where active and archived_at is null and coalesce(gasto_trabajadores,0)=0
    and (proceso='Finalizado' or coalesce(avance_real,avance_pct,0)>=v_c12_progress);

  -- C15: HML vencido sin extensión y sin evidencia de refi/venta/salida.
  insert into financial_scan_current
  with ext as (
    select address_norm from public.ff_extension_payments
     where active and archived_at is null group by address_norm
  ), fee_after as (
    select distinct p.address_norm from public.ff_hml_payments p
    join public.ff_hml_loans l on l.address_norm=p.address_norm
    where p.active and p.archived_at is null and coalesce(p.fee,0)>0
      and p.fecha is not null and p.fecha>=l.fecha_vencimiento
  )
  select 'C15','fix_flip','venc-sin-ext-'||left(regexp_replace(lower(l.address_norm),'[^a-z0-9]','','g'),48),
    split_part(l.address,',',1)||': HML vencido hace '||(v_today-l.fecha_vencimiento)||
      ' días ('||l.fecha_vencimiento||') sin extensión o salida documentada.',
    jsonb_build_object('vencimiento',l.fecha_vencimiento,'dias_vencido',(v_today-l.fecha_vencimiento),
      'monto_hml',coalesce(l.monto_hml,0),'stage',d.stage),
    'OS',round(abs(coalesce(l.monto_hml,0))*0.01), 'critica'
  from public.ff_hml_loans l
  left join public.ff_deals d on d.address_norm=l.address_norm and d.active and d.archived_at is null
  left join ext on ext.address_norm=l.address_norm
  left join fee_after f on f.address_norm=l.address_norm
  where l.active and l.archived_at is null and l.fecha_vencimiento is not null
    and v_today-l.fecha_vencimiento>=v_c15_grace
    and ext.address_norm is null and f.address_norm is null
    and coalesce(d.stage,'') !~* '(refinanciad|vendida)'
    and l.fecha_refi is null and l.fecha_venta is null
    and coalesce(l.monto_prestamo_refi,0)=0 and coalesce(l.monto_pagado_hml_refi,0)=0
    and coalesce(l.precio_venta,0)=0;

  insert into public.ct_findings(check_id,empresa,clave,titulo,detalle,fuente,
    impacto_usd,severidad,estado,first_seen,last_seen,resolved_at,active)
  select check_id,empresa,clave,titulo,detalle,fuente,impacto_usd,severidad,
    'abierto',v_now,v_now,null,true from financial_scan_current
  on conflict(check_id,clave) do update set
    empresa=excluded.empresa,titulo=excluded.titulo,detalle=excluded.detalle,
    fuente=excluded.fuente,impacto_usd=excluded.impacto_usd,severidad=excluded.severidad,
    estado='abierto',last_seen=excluded.last_seen,resolved_at=null,active=true;
  get diagnostics v_open=row_count;

  update public.ct_findings f set estado='resuelto',resolved_at=v_now,
    nota='La fuente operativa vigente dejó de disparar la regla; cierre automático con evidencia de la corrida.'
  where f.check_id in('C10','C11','C12','C15') and f.active
    and f.resolved_at is null and not exists(
      select 1 from financial_scan_current c where c.check_id=f.check_id and c.clave=f.clave);
  get diagnostics v_resolved=row_count;

  select count(*) into v_critical from financial_scan_current where severidad='critica';
  v_out:=jsonb_build_object('ok',true,'fuente','espejos operativos canónicos',
    'hallazgos_refrescados',v_open,'hallazgos_resueltos',v_resolved,
    'criticos_vigentes_en_esta_corrida',v_critical,
    'reglas',jsonb_build_array('C10','C11','C12','C15'),
    'limite','Solo reconcilia y clasifica. No modifica libros, pagos, cobros, préstamos ni fuentes.');
  insert into public.agent_audit_log(agent_id,input,output,resultado)
  values(v_agent.id,jsonb_build_object('tipo','ejecucion_negocio','modo','financial_source_scan'),v_out,'ok');
  return v_out;
end $$;

revoke all on function public.run_financial_source_scan() from public;
grant execute on function public.run_financial_source_scan() to postgres,service_role;
comment on function public.run_financial_source_scan() is
 'Refresca C10/C11/C12/C15 desde fuentes canónicas y resuelve hallazgos que ya no disparan. No corrige fuentes.';

do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname='financial-source-scan-daily';
exception when others then null; end $$;
select cron.schedule('financial-source-scan-daily','20 12 * * *',
  $$select public.run_financial_source_scan()$$);

select public.run_financial_source_scan();
select public.run_data_integrity_review();
select public.run_financial_exception_triage();
