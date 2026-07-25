-- E4 mega-build: indicadores de retorno. fecha_venta al espejo (XIRR con la venta real
-- en su fecha) + RPC de INPUTS por casa con la regla RLS del portal (inversionista =
-- solo sus casas; staff sin identidad de inversionista = todas). El CÁLCULO vive en
-- os/inv-indicadores.js (una definición, corre en browser y node).
-- Rollback: drop function inv_indicadores_data(); (fecha_venta es aditiva, se deja)
alter table ff_hml_loans add column if not exists fecha_venta date;

create or replace function public.inv_indicadores_data()
returns table(property_id uuid, casa text, etapa text, modelo_negocio text, close_date date,
  compra numeric, total_draws numeric, all_in numeric,
  paper_value numeric, paper_fuente text, vendida boolean, fecha_venta date,
  deuda_vigente numeric, deuda_fuente text, hml_original numeric, refinanciada boolean,
  renta_anual numeric)
language sql stable security definer set search_path to 'public'
as $$
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
  )
  select d.property_id, split_part(d.address,',',1), d.stage, d.modelo_negocio, d.close_date,
    d.purchase_price, coalesce(dr.total_draws,0),
    d.purchase_price + coalesce(dr.total_draws,0),
    case when d.stage = 'vendida' then coalesce(l.precio_venta, d.arv) else coalesce(d.appraisal, d.arv) end,
    case when d.stage = 'vendida' then (case when l.precio_venta is not null then 'venta real' else 'ARV (proxy — precio de venta por completar)' end)
         when d.appraisal is not null then 'appraisal' else 'ARV' end,
    d.stage = 'vendida',
    l.fecha_venta,
    case when d.stage = 'vendida' then 0
         when l.monto_prestamo_refi is not null and l.monto_prestamo_refi > 0 then l.monto_prestamo_refi
         when l.monto_hml is not null then l.monto_hml
         else null end,
    case when d.stage = 'vendida' then 'vendida (deuda saldada)'
         when l.monto_prestamo_refi is not null and l.monto_prestamo_refi > 0 then 'principal refi'
         when l.monto_hml is not null then 'HML'
         else 'por completar' end,
    l.monto_hml,
    ((l.monto_prestamo_refi is not null and l.monto_prestamo_refi > 0) or l.fecha_refi is not null),
    coalesce(d.renta_mensual,0) * 12
  from visibles d
  left join loan l on l.address_norm = d.address_norm
  left join dr on dr.address_norm = d.address_norm
$$;
comment on function inv_indicadores_data() is 'Inputs por casa para los indicadores E4 (TIR paper, múltiplos, LTV, yield). RLS del portal: inversionista solo sus casas, staff todas. El cálculo = os/inv-indicadores.js (una definición).';
