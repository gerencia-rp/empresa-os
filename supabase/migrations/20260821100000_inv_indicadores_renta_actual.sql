-- Item 09 (decisión CEO #4): RENTA REAL para salud financiera = RENT-ROLL ACTUAL.
-- inv_indicadores_data expone renta_actual_anual (= Σ renta_pactada del MES RECIENTE MÁS
-- COMPLETO por casa, sobre pm_payments) + renta_actual_fuente. La renta modelada
-- (renta_anual = ff_deals.renta_mensual*12) queda SOLO para proyección (etiquetada).
-- Puente: pm_properties.property_id = ff_deals.property_id (backbone canónico); pm_payments
-- vive en el espacio pm_properties.id. Regla robusta: por casa, el billing_ym con MÁS
-- unidades facturadas (desempate: más reciente) en ventana de 4 meses, para no subestimar
-- por un mes en curso a medio facturar (verificado: Stonleigh ago n=1 750 -> jul n=5 3.593).
drop function if exists public.inv_indicadores_data();
CREATE FUNCTION public.inv_indicadores_data()
 RETURNS TABLE(property_id uuid, casa text, etapa text, modelo_negocio text, close_date date, compra numeric, remodelacion numeric, remod_fuente text, all_in numeric, paper_value numeric, paper_fuente text, vendida boolean, fecha_venta date, deuda_vigente numeric, deuda_fuente text, hml_original numeric, refinanciada boolean, renta_anual numeric, at_deal_id text, at_loan_id text, gastos_anuales numeric, renta_actual_anual numeric, renta_actual_fuente text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with visibles as (
    select d.* from ff_deals d
    where d.active and d.property_id is not null and coalesce(d.purchase_price,0) > 0
      and ((public.has_area('fix-flip') and not public.inv_is_investor())
           or d.property_id in (select public.inv_my_props()))
  ), loan as (
    select distinct on (l.address_norm) l.* from ff_hml_loans l where l.active
    order by l.address_norm, l.fecha_inicio desc nulls last
  ), dr as (
    select w.address_norm, sum(w.total_draws) total_draws from ff_draws w where w.active group by 1
  ), rm as (
    select d.property_id,
      coalesce(nullif(d.remodel_real,0), nullif(dr.total_draws,0), nullif(d.remodel_est,0), 0) remod,
      case when nullif(d.remodel_real,0) is not null then 'remodel real (cobrado)'
           when nullif(dr.total_draws,0) is not null then 'total draws (proxy)'
           when nullif(d.remodel_est,0) is not null then 'estimado (proxy)'
           else 'sin dato' end remod_fuente
    from visibles d left join dr on dr.address_norm = d.address_norm
  ), rr_m as (
    -- rent-roll pactado por casa (backbone) y mes, sobre pm_payments (fuente Rentas)
    select pp.property_id as bpid, pay.billing_ym as ym,
      sum(pay.renta_pactada) filter (where pay.renta_pactada > 0) as pactada,
      count(*) filter (where pay.renta_pactada > 0) as n
    from pm_payments pay
    join pm_properties pp on pp.id = pay.property_id
    where pay.active and pp.property_id is not null
      and pay.billing_ym >= to_char((now() - interval '3 months'), 'YYYY-MM')
    group by pp.property_id, pay.billing_ym
  ), rr as (
    -- por casa: el mes MÁS COMPLETO (más unidades facturadas), desempate por más reciente
    select distinct on (bpid) bpid, ym, pactada
    from rr_m where pactada > 0
    order by bpid, n desc, ym desc
  )
  select d.property_id, split_part(d.address,',',1), d.stage, d.modelo_negocio, d.close_date,
    d.purchase_price, rm.remod, rm.remod_fuente,
    d.purchase_price + rm.remod,
    case when d.stage = 'vendida' then coalesce(nullif(l.precio_venta,0), nullif(d.arv,0))
         else coalesce(nullif(d.appraisal,0), nullif(d.arv,0)) end,
    case when d.stage = 'vendida' then (case when nullif(l.precio_venta,0) is not null then 'venta real' else 'ARV (proxy — precio de venta por completar)' end)
         when nullif(d.appraisal,0) is not null then 'appraisal' else 'ARV' end,
    d.stage = 'vendida',
    l.fecha_venta,
    case when d.stage = 'vendida' then 0
         when nullif(l.monto_prestamo_refi,0) is not null then l.monto_prestamo_refi
         when nullif(l.monto_hml,0) is not null then l.monto_hml
         else null end,
    case when d.stage = 'vendida' then 'vendida (deuda saldada)'
         when nullif(l.monto_prestamo_refi,0) is not null then 'principal refi'
         when nullif(l.monto_hml,0) is not null then 'HML'
         else 'por completar' end,
    nullif(l.monto_hml,0),
    ((nullif(l.monto_prestamo_refi,0) is not null) or l.fecha_refi is not null),
    coalesce(d.renta_mensual,0) * 12,
    d.airtable_id,
    l.airtable_id,
    coalesce(d.gastos_mensuales,0) * 12,
    case when rr.pactada is not null then round(rr.pactada * 12, 2) else null end,
    case when rr.pactada is not null then 'rent-roll Rentas (' || rr.ym || ')' else null end
  from visibles d
  left join loan l on l.address_norm = d.address_norm
  left join rm on rm.property_id = d.property_id
  left join rr on rr.bpid = d.property_id
$function$;
grant execute on function public.inv_indicadores_data() to authenticated, anon;
