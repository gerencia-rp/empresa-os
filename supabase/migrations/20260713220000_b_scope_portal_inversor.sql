-- ════════════════════════════════════════════════════════════════
-- Scope B obs #16 (CEO 13-jul) · PORTAL DEL INVERSOR — resumen por casa con RLS estricto.
-- Patrón inv_ledger: RPC SECURITY DEFINER que filtra por inv_my_props() (el inversionista ve SOLO
-- sus casas; fix-flip/admin ve todas) + vista v_portal_inversor con security_invoker=on ENCIMA de
-- la RPC (la regla dura de vistas se cumple: la vista no bypassea nada, el filtro vive en la fn).
-- inv_distributions YA existe (migr 20260709100000) — verificado contra fuente: 3 filas.
-- Rollback: drop view if exists public.v_portal_inversor; drop function if exists public.inv_portal_resumen();
-- ════════════════════════════════════════════════════════════════
drop view if exists public.v_portal_inversor;
drop function if exists public.inv_portal_resumen();
create function public.inv_portal_resumen()
returns table (
  property_id uuid,
  casa text,
  etapa text,
  lider text,
  avance_planner numeric,
  invertido numeric,
  fecha_entrada date,
  meses_invertido int,
  ingresos_renta numeric,
  gastos_operativos numeric,
  interes_hml numeric,
  flujo_neto numeric,
  flujo_ult_mes numeric,
  flujo_ult_mes_ym text,
  deficit numeric,
  deficit_desglose jsonb,
  fecha_estimada_pago date,
  fecha_pago_fuente text,
  proxima_dist_fecha date,
  proxima_dist_monto numeric,
  ultima_dist_fecha date,
  ultima_dist_monto numeric
)
language sql stable security definer
set search_path = public
as $$
  with mias as (
    -- el inversionista: SOLO sus casas y SU capital; fix-flip/admin: todas con el capital total
    select h.property_id,
           sum(h.inversion_aportada) as invertido,
           min(h.fecha_entrada) as fecha_entrada
    from inv_holdings h
    where h.active
      and (public.has_area('fix-flip') or h.investor_airtable_id in (select public.inv_my_ids()))
    group by 1
  ), pnl as (
    select p.property_id, p.ingresos_renta, p.gastos_operativos, p.interes_hml_real,
           p.utilidad_neta_post_interes
    from v_pnl_casa p
  ), hmlx as (
    select distinct on (d.property_id) d.property_id, l.fecha_inicio, l.fecha_vencimiento, l.fecha_refi
    from ff_deals d join ff_hml_loans l on l.address_norm = d.address_norm and l.active
    where d.active and d.property_id is not null
    order by d.property_id, l.fecha_inicio desc nulls last
  ), cal as (
    select coalesce(holding_meses_prom, 6) as hold_m from v_supuestos_calibrados
  ), ultm as (
    -- flujo del ÚLTIMO mes de renta con datos (billing_ym = mes de renta, regla dura de Rentas)
    select distinct on (t.property_id) t.property_id, t.billing_ym, t.neto from (
      select pp.property_id, x.billing_ym, sum(x.monto) as neto from (
        select pay.property_id as pid, pay.billing_ym, pay.amount as monto
        from pm_payments pay where pay.active and pay.type = 'ingreso' and pay.status = 'pagado'
        union all
        select e.property_id, e.billing_ym, -e.amount from pm_expenses e where e.active
      ) x join pm_properties pp on pp.id = x.pid
      where x.billing_ym is not null and pp.property_id is not null
      group by 1, 2
    ) t order by t.property_id, t.billing_ym desc
  ), dist as (
    select dd.property_id,
           min(dd.fecha) filter (where dd.fecha >= current_date and dd.estado <> 'pagada') as prox_fecha,
           (array_agg(dd.monto order by dd.fecha) filter (where dd.fecha >= current_date and dd.estado <> 'pagada'))[1] as prox_monto,
           max(dd.fecha) filter (where dd.estado = 'pagada') as ult_fecha,
           (array_agg(dd.monto order by dd.fecha desc) filter (where dd.estado = 'pagada'))[1] as ult_monto
    from inv_distributions dd
    where dd.active
    group by 1
  )
  select
    m.property_id,
    p360.casa,
    p360.etapa,
    p360.lider,
    p360.avance_planner,
    round(m.invertido::numeric, 2),
    m.fecha_entrada,
    case when m.fecha_entrada is null then null
         else (extract(year from age(current_date, m.fecha_entrada)) * 12
             + extract(month from age(current_date, m.fecha_entrada)))::int end,
    pnl.ingresos_renta,
    pnl.gastos_operativos,
    pnl.interes_hml_real,
    pnl.utilidad_neta_post_interes,
    ultm.neto,
    ultm.billing_ym,
    greatest(0, -coalesce(pnl.utilidad_neta_post_interes, 0)),
    jsonb_build_object(
      'ingresos_renta', pnl.ingresos_renta,
      'gastos_operativos', pnl.gastos_operativos,
      'interes_hml', pnl.interes_hml_real,
      'fuente', 'v_pnl_casa (Rentas + HML espejo Airtable)'
    ),
    case when h.fecha_refi is not null then h.fecha_refi
         when p360.etapa like '%refinanciad%' or p360.etapa = 'vendida' then null  -- ya pagó: sin fecha espejada
         when h.fecha_inicio is not null then (h.fecha_inicio + (select (hold_m * interval '1 month') from cal))::date
         else null end,
    case when h.fecha_refi is not null then 'refi hecha (Airtable)'
         when p360.etapa like '%refinanciad%' or p360.etapa = 'vendida' then 'refi/venta ya realizada (fecha sin espejar en Airtable)'
         when h.fecha_inicio is not null then 'estimada: inicio HML + holding calibrado (historia real)'
         else 'sin préstamo HML espejado' end,
    dist.prox_fecha, dist.prox_monto, dist.ult_fecha, dist.ult_monto
  from mias m
  left join v_property_360 p360 on p360.property_id = m.property_id
  left join pnl on pnl.property_id = m.property_id
  left join hmlx h on h.property_id = m.property_id
  left join ultm on ultm.property_id = m.property_id
  left join dist dist on dist.property_id = m.property_id
$$;
grant execute on function public.inv_portal_resumen() to authenticated;
revoke execute on function public.inv_portal_resumen() from anon;

create or replace view public.v_portal_inversor as select * from public.inv_portal_resumen();
alter view public.v_portal_inversor set (security_invoker = on);
