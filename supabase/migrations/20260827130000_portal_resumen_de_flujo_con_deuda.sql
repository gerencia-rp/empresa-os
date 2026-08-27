-- ================================================================
-- "VER COMO INVERSIONISTA" (admin) - el flujo del ultimo mes tambien resta el SERVICIO DE DEUDA
--
-- inv_portal_resumen_de(p_inv) es la copia de inv_portal_resumen() que alimenta el modo
-- "Ver como inversionista" del admin (inv_portal_como -> resumen). Tenia el MISMO CTE `ultm`
-- viejo (pm_payments - pm_expenses): sin ff_hml_payments y con la "Hipoteca" espejada.
-- Se alinea con 20260827120000: una sola fuente, public.inv_ledger(property_id).
--
-- Descubierto corriendo el QA en carga real sobre empresa-os.vercel.app (27-ago-2026): el
-- inversionista real (v_portal_inversor -> inv_portal_resumen) ya veia el numero corregido y
-- el admin en "ver como" seguia viendo el viejo.
--
-- OJO (NO se toca aca, queda DECLARADO): esta copia ademas quedo con el DEFICIT viejo
-- (greatest(0, -v_pnl_casa.utilidad_neta_post_interes)), mientras la funcion principal usa
-- ff_deals.deficit_total desde 20260820120000. Es una divergencia PRE-EXISTENTE entre lo que
-- ve el inversionista y lo que ve el admin en "ver como"; se reporta para decision del CEO.
--
-- QUE CAMBIA: solo el CTE `ultm` (flujo_ult_mes / flujo_ult_mes_ym). La firma no cambia (sin drop).
-- ROLLBACK: reaplicar la definicion previa de inv_portal_resumen_de (ultm = pm_payments - pm_expenses).
-- ================================================================

CREATE OR REPLACE FUNCTION public.inv_portal_resumen_de(p_inv text)
 RETURNS TABLE(property_id uuid, casa text, etapa text, lider text, avance_planner numeric, invertido numeric, fecha_entrada date, meses_invertido integer, ingresos_renta numeric, gastos_operativos numeric, interes_hml numeric, flujo_neto numeric, flujo_ult_mes numeric, flujo_ult_mes_ym text, deficit numeric, deficit_desglose jsonb, fecha_estimada_pago date, fecha_pago_fuente text, proxima_dist_fecha date, proxima_dist_monto numeric, ultima_dist_fecha date, ultima_dist_monto numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with gate as (select 1 where public.inv_es_admin()),
  mias as (
    select h.property_id, sum(h.inversion_aportada) as invertido, min(h.fecha_entrada) as fecha_entrada
    from gate, inv_holdings h
    where h.active and h.investor_airtable_id = p_inv
    group by h.property_id
  ), pnl as (
    select p.property_id, p.ingresos_renta, p.gastos_operativos, p.interes_hml_real, p.utilidad_neta_post_interes from v_pnl_casa p
  ), hmlx as (
    select distinct on (d.property_id) d.property_id, l.fecha_inicio, l.fecha_vencimiento, l.fecha_refi
    from ff_deals d join ff_hml_loans l on l.address_norm = d.address_norm and l.active
    where d.active and d.property_id is not null
    order by d.property_id, l.fecha_inicio desc nulls last
  ), cal as (
    select coalesce(holding_meses_prom, 6) as hold_m from v_supuestos_calibrados
  ), ultm as (
    -- MISMA cuenta que el Ledger, la pestana Flujo Mensual y inv_dist_auto:
    -- renta - gastos operativos - servicio de deuda, por mes CONTABLE y cortado a HOY.
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
    from inv_distributions dd where dd.active
    group by 1
  )
  select m.property_id, p360.casa, p360.etapa, p360.lider, p360.avance_planner,
    round(m.invertido::numeric, 2), m.fecha_entrada,
    case when m.fecha_entrada is null then null
         else (extract(year from age(current_date, m.fecha_entrada)) * 12 + extract(month from age(current_date, m.fecha_entrada)))::int end,
    pnl.ingresos_renta, pnl.gastos_operativos, pnl.interes_hml_real, pnl.utilidad_neta_post_interes,
    ultm.neto, ultm.billing_ym,
    greatest(0, -coalesce(pnl.utilidad_neta_post_interes, 0)),
    jsonb_build_object('ingresos_renta', pnl.ingresos_renta, 'gastos_operativos', pnl.gastos_operativos, 'interes_hml', pnl.interes_hml_real, 'flujo_ult_mes_fuente', 'inv_ledger: renta - gastos operativos - servicio de deuda', 'fuente', 'v_pnl_casa (Rentas + HML espejo Airtable)'),
    case when h.fecha_refi is not null then h.fecha_refi
         when p360.etapa like '%refinanciad%' or p360.etapa = 'vendida' then null
         when h.fecha_inicio is not null then (h.fecha_inicio + (select (hold_m * interval '1 month') from cal))::date
         else null end,
    case when h.fecha_refi is not null then 'refi hecha (Airtable)'
         when p360.etapa like '%refinanciad%' or p360.etapa = 'vendida' then 'refi/venta ya realizada (fecha sin espejar en Airtable)'
         when h.fecha_inicio is not null then 'estimada: inicio HML + holding calibrado (historia real)'
         else 'sin prestamo HML espejado' end,
    dist.prox_fecha, dist.prox_monto, dist.ult_fecha, dist.ult_monto
  from mias m
  left join v_property_360 p360 on p360.property_id = m.property_id
  left join pnl on pnl.property_id = m.property_id
  left join hmlx h on h.property_id = m.property_id
  left join ultm on ultm.property_id = m.property_id
  left join dist on dist.property_id = m.property_id
$function$;
