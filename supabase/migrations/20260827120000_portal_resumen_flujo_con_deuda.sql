-- ================================================================
-- PORTAL DEL INVERSIONISTA - el FLUJO DEL PORTAFOLIO tambien resta el SERVICIO DE DEUDA
-- Pedido del CEO (27-ago-2026), a partir de 4916 Barkbridge: "que el -1,600 baje el neto".
--
-- La pestana "Flujo Mensual" YA restaba el servicio de deuda (commit 3b40918 + ca4aa03),
-- pero la tarjeta "Flujo del ultimo mes" de "Tus casas de un vistazo" (Mi Portafolio)
-- seguia calculandose aparte, con pm_payments - pm_expenses: sin ff_hml_payments y con la
-- "Hipoteca" espejada en pm_expenses. Dos definiciones del mismo numero en la misma pantalla.
--
-- QUE CAMBIA: SOLO el CTE `ultm`, que alimenta flujo_ult_mes / flujo_ult_mes_ym.
-- QUE NO CAMBIA: la firma (no requiere drop), invertido, deficit (ff_deals.deficit_total),
-- ingresos_renta/gastos_operativos/interes_hml/flujo_neto (v_pnl_casa) y las distribuciones.
-- ROLLBACK: reaplicar 20260820120000_inv_portal_resumen_deficit_from_airtable.sql.
-- ================================================================

CREATE OR REPLACE FUNCTION public.inv_portal_resumen()
 RETURNS TABLE(property_id uuid, casa text, etapa text, lider text, avance_planner numeric, invertido numeric, fecha_entrada date, meses_invertido integer, ingresos_renta numeric, gastos_operativos numeric, interes_hml numeric, flujo_neto numeric, flujo_ult_mes numeric, flujo_ult_mes_ym text, deficit numeric, deficit_desglose jsonb, fecha_estimada_pago date, fecha_pago_fuente text, proxima_dist_fecha date, proxima_dist_monto numeric, ultima_dist_fecha date, ultima_dist_monto numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with mias as (
    select h.property_id,
           sum(h.inversion_aportada) as invertido,
           min(h.fecha_entrada) as fecha_entrada
    from inv_holdings h
    where h.active
      and (h.investor_airtable_id in (select public.inv_my_ids())
           or (public.has_area('fix-flip') and not public.inv_is_investor()))
    group by 1
  ), pnl as (
    select p.property_id, p.ingresos_renta, p.gastos_operativos, p.interes_hml_real,
           p.utilidad_neta_post_interes
    from v_pnl_casa p
  ), defx as (
    -- DÉFICIT = fuente ÚNICA ff_deals.deficit_total (Airtable) — misma que ficha/admin/dashboard.
    select d.property_id, max(d.deficit_total) as deficit_total
    from ff_deals d
    where d.active and d.property_id is not null
    group by 1
  ), hmlx as (
    select distinct on (d.property_id) d.property_id, l.fecha_inicio, l.fecha_vencimiento, l.fecha_refi
    from ff_deals d join ff_hml_loans l on l.address_norm = d.address_norm and l.active
    where d.active and d.property_id is not null
    order by d.property_id, l.fecha_inicio desc nulls last
  ), cal as (
    select coalesce(holding_meses_prom, 6) as hold_m from v_supuestos_calibrados
  ), ultm as (
    -- FLUJO DEL ULTIMO MES = la MISMA cuenta que el Ledger y que la distribucion automatica:
    --     renta - gastos operativos - SERVICIO DE DEUDA (interes HML + cuota refi 30a)
    -- ANTES salia de (pm_payments - pm_expenses): NO restaba ff_hml_payments y SI restaba la
    -- "Hipoteca" espejada en pm_expenses. Dos definiciones del mismo concepto en la misma
    -- pantalla: la tarjeta del portafolio y la pestana Flujo Mensual daban numeros distintos
    -- (4916 Barkbridge jun-26: hipoteca pm_expenses 1,579.73 vs servicio de deuda real 1,600.00).
    -- Ahora se lee UNA sola fuente: public.inv_ledger(property_id), que ya excluye la hipoteca
    -- espejada para no duplicarla y marca el servicio de deuda con subcategoria='servicio_deuda'.
    -- El mes es el MES CONTABLE (`mes`, billing_ym en Rentas) y se corta a HOY, igual que el portal.
    select m.property_id, l.mes as billing_ym, l.neto
    from mias m
    cross join lateral (
      select g.mes,
             round(
               coalesce(sum(g.monto) filter (where g.categoria = 'renta'     and g.tipo = 'ingreso'), 0)
             - coalesce(sum(g.monto) filter (where g.categoria = 'operativo' and g.tipo = 'gasto'),   0)
             - coalesce(sum(g.monto) filter (where g.subcategoria = 'servicio_deuda'),                0)
             , 2) as neto
        from public.inv_ledger(m.property_id) g
       where g.mes ~ '^[0-9]{4}-[0-9]{2}$'
         and g.fecha <= current_date
         and (g.categoria in ('renta', 'operativo') or g.subcategoria = 'servicio_deuda')
       group by g.mes
       order by g.mes desc
       limit 1
    ) l
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
    greatest(0, coalesce(defx.deficit_total, 0)),
    jsonb_build_object(
      'deficit_total', defx.deficit_total,
      'ingresos_renta', pnl.ingresos_renta,
      'gastos_operativos', pnl.gastos_operativos,
      'interes_hml', pnl.interes_hml_real,
      'fuente', 'deficit acumulado = ff_deals.deficit_total (Airtable, caja atrapada); renta/gastos/interes = v_pnl_casa (contexto operativo del periodo)'
    ),
    case when h.fecha_refi is not null then h.fecha_refi
         when p360.etapa like '%refinanciad%' or p360.etapa = 'vendida' then null
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
  left join defx on defx.property_id = m.property_id
  left join hmlx h on h.property_id = m.property_id
  left join ultm on ultm.property_id = m.property_id
  left join dist dist on dist.property_id = m.property_id
$function$;
