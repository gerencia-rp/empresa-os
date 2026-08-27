-- ================================================================
-- EL SERVICIO DE DEUDA RESTA COMO GASTO DEL MES (deja de ser "P&L NO")
--
-- Pedido del CEO (27-ago-2026): el pago mensual recurrente de deuda ("Pago interes HML" /
-- "Pago Refi 30 anos") debe contar como una SALIDA DE CAJA del mes, igual que un utility o
-- una reparacion: mover el saldo del Ledger hacia abajo y restar en el flujo/neto de la casa
-- y del portafolio. Hasta hoy salia como categoria 'financiero' -> P&L NO (no movia el saldo).
--
-- QUE CAMBIA: SOLO el pago mensual recurrente de deuda que viene de ff_hml_payments
-- (espejo de Airtable "Pagos interes (HML & REFI)") pasa de categoria 'financiero' a
-- 'operativo', conservando subcategoria='servicio_deuda'. Como invEngine.pnlSi() ya trata
-- 'operativo' como P&L SI, el saldo del Ledger empieza a bajar con estos pagos.
--   * El CONCEPTO no cambia: sigue siendo "Pago interes HML" o "Pago Refi 30 anos" segun el mes.
--   * La TRAZABILIDAD no cambia: fuente 'FF:ff_hml_payments'.
--   * subcategoria='servicio_deuda' se conserva: es lo que permite sumarlo aparte SIN doblarlo.
--
-- QUE **NO** CAMBIA (siguen 'financiero' -> P&L NO, son capital y no gasto del mes):
--   * Desembolso Hard Money (el DRAW del HML)
--   * Cash-out del refinanciamiento
--   * Fee HML (comision puntual, subcategoria='fee_hml' — no es el pago mensual recurrente)
--   * Distribuciones al inversionista (categoria 'distribucion')
--   * Compra / gastos de cierre / draws de remodelacion (categoria 'inversion')
--
-- ANTI DOBLE CONTEO (el riesgo real de este cambio): habia 4 lugares que sumaban "operativo"
-- y "servicio de deuda" POR SEPARADO y despues restaban los dos. Si el servicio de deuda pasa
-- a 'operativo' sin tocarlos, se restaria DOS VECES. Por eso, en TODOS los consumidores, el
-- bucket "gastos operativos" ahora excluye explicitamente subcategoria='servicio_deuda':
--   1) inv_dist_auto            (neto distribuible del mes)
--   2) inv_portal_resumen       (flujo del ultimo mes — tarjetas del portafolio)
--   3) inv_portal_resumen_de    (idem, modo "ver como inversionista" del admin)
--   4) os/inv-portal.js         (pestana Flujo Mensual + CoC real) — fuera de esta migracion
-- Resultado: los netos (renta - operativos - deuda) dan EXACTAMENTE lo mismo que antes.
-- Lo que cambia es que el SALDO del Ledger ahora si baja con el pago de deuda.
--
-- La "Hipoteca" espejada en pm_expenses SIGUE excluida del ledger (ya lo estaba): el servicio
-- de deuda tiene UNA sola fuente, ff_hml_payments. No hay riesgo de contarla dos veces.
--
-- Todas son create or replace (sin drop, sin cambio de firma, sin borrar datos).
-- ROLLBACK: reaplicar 20260827140000 (inv_ledger), 20260806110000 (inv_dist_auto),
--           20260827120000 (inv_portal_resumen) y 20260827130000 (inv_portal_resumen_de).
-- ================================================================

-- ── 1) inv_ledger: el pago mensual de deuda pasa a 'operativo' (sigue subcategoria='servicio_deuda')
create or replace function public.inv_ledger(pid uuid) returns table (
  fecha date, mes text, concepto text, tipo text, categoria text, subcategoria text,
  monto numeric, fuente text, comprobante text
) language sql stable security definer set search_path = public as $function$
  with ok as (
    select 1 where pid in (select inv_my_props())
      or (public.has_area('fix-flip') and not public.inv_is_investor())
  ),
  d as (select * from ff_deals where active and property_id = pid limit 1)
  select d.close_date, to_char(d.close_date,'YYYY-MM'), 'Compra de la casa', 'gasto', 'inversion', null::text, d.purchase_price, 'FF:ff_deals', null::text
    from d, ok where d.close_date is not null and coalesce(d.purchase_price,0) > 0
  union all
  select coalesce(l.fecha_inicio, d.close_date), to_char(coalesce(l.fecha_inicio, d.close_date),'YYYY-MM'), 'Gastos de cierre (compra)', 'gasto', 'inversion', null, l.gastos_cierre, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.gastos_cierre,0) > 0
  -- DRAW del HML: financiero, P&L NO (es capital que ENTRA, no gasto del mes)
  union all
  select coalesce(l.fecha_inicio, d.close_date), to_char(coalesce(l.fecha_inicio, d.close_date),'YYYY-MM'), 'Desembolso Hard Money', 'ingreso', 'financiero', null, l.monto_hml, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.monto_hml,0) > 0
  union all
  select coalesce(l.fecha_inicio_rehab, d.close_date), to_char(coalesce(l.fecha_inicio_rehab, d.close_date),'YYYY-MM'), 'Remodelación (draws — total agregado)', 'gasto', 'inversion', null, w.total_draws, 'FF:ff_draws', null
    from d join ff_draws w on w.active and w.address_norm = d.address_norm
    left join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(w.total_draws,0) > 0
  -- 🔴 SERVICIO DE DEUDA · INTERES HML → ahora OPERATIVO (resta del mes y baja el saldo)
  union all
  select coalesce(p.fecha, p.fecha_ref30), to_char(coalesce(p.fecha, p.fecha_ref30),'YYYY-MM'), 'Pago interés HML', 'gasto', 'operativo', 'servicio_deuda', p.pago_hml, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.pago_hml,0) > 0 and coalesce(p.fecha, p.fecha_ref30) is not null
  -- Fee HML: comision PUNTUAL, no es el pago mensual recurrente → sigue financiero / P&L NO
  union all
  select coalesce(p.fecha, p.fecha_ref30), to_char(coalesce(p.fecha, p.fecha_ref30),'YYYY-MM'), 'Fee HML', 'gasto', 'financiero', 'fee_hml', p.fee, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.fee,0) > 0 and coalesce(p.fecha, p.fecha_ref30) is not null
  -- 🔴 SERVICIO DE DEUDA · REFI 30 AÑOS → ahora OPERATIVO (resta del mes y baja el saldo)
  union all
  select coalesce(p.fecha_ref30, p.fecha), to_char(coalesce(p.fecha_ref30, p.fecha),'YYYY-MM'), 'Pago Refi 30 años', 'gasto', 'operativo', 'servicio_deuda', p.ref30, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.ref30,0) > 0 and coalesce(p.fecha_ref30, p.fecha) is not null
  -- CASH-OUT del refi: financiero, P&L NO (es capital que ENTRA)
  union all
  select coalesce((select min(p.fecha_ref30) from ff_hml_payments p where p.active and p.address_norm = d.address_norm and coalesce(p.ref30,0) > 0), d.close_date),
         to_char(coalesce((select min(p.fecha_ref30) from ff_hml_payments p where p.active and p.address_norm = d.address_norm and coalesce(p.ref30,0) > 0), d.close_date),'YYYY-MM'),
         'Cash-out del refinanciamiento', 'ingreso', 'financiero', null, d.cashout, 'FF:ff_deals', null
    from d, ok where coalesce(d.cashout,0) > 0
  union all
  select coalesce(pay.paid_at::date, (pay.billing_ym || '-01')::date),
         coalesce(pay.billing_ym, to_char(pay.paid_at,'YYYY-MM')),
         'Renta cobrada · ' || coalesce(pay.billing_ym, '') || coalesce(' · ' || nullif(pay.concept,''), ''),
         'ingreso', 'renta', null, pay.amount, 'Rentas:pm_payments', coalesce(pay.proof_url, pay.attachment_url)
    from ok, pm_properties pp
    join pm_payments pay on pay.property_id = pp.id and pay.active
    where pp.property_id = pid and pp.active and coalesce(pay.amount,0) > 0 and pay.status in ('pagado','paid','completado')
  union all
  select coalesce(e.expense_date, (e.billing_ym || '-01')::date),
         coalesce(e.billing_ym, to_char(e.expense_date,'YYYY-MM')),
         'Gasto ' || coalesce(nullif(e.category,''), 'operativo') || coalesce(' · ' || nullif(e.description,''), ''),
         'gasto', 'operativo', null, e.amount, 'Rentas:pm_expenses', e.invoice_url
    from ok, pm_properties pp
    join pm_expenses e on e.property_id = pp.id and e.active
    where pp.property_id = pid and pp.active and coalesce(e.amount,0) > 0
      -- la hipoteca/cuota del banco YA entra desde ff_hml_payments (UNA sola fuente) — se excluye para no duplicar
      and coalesce(e.description,'') !~* 'hipoteca' and coalesce(e.category,'') !~* 'hipoteca' and coalesce(e.subcategory,'') !~* 'hipoteca'
  -- DISTRIBUCIONES: financiero/distribucion, P&L NO (no es gasto de operar la casa)
  union all
  select dt.fecha, to_char(dt.fecha,'YYYY-MM'), 'Distribución al inversionista (' || dt.tipo || ')', 'gasto', 'distribucion', null, dt.monto, 'OS:inv_distributions', dt.k1_url
    from ok, inv_distributions dt
    where dt.active and dt.property_id = pid and dt.estado = 'pagada'
  union all
  select c.fecha, to_char(c.fecha,'YYYY-MM'), coalesce(nullif(c.concepto,''), nullif(c.item,''), c.linea),
         case when c.tipo = 'ingreso' or c.categoria = 'ingreso' then 'ingreso' else 'gasto' end,
         coalesce(nullif(c.categoria,''), 'manual'), null, abs(c.valor), 'OS:manual(' || coalesce(c.linea,'') || ')', c.id_factura
    from ok, inv_cashflow_real c
    where c.active and c.property_id = pid and c.fecha is not null
  order by 1
$function$;

grant execute on function public.inv_ledger(uuid) to authenticated;

comment on function public.inv_ledger(uuid) is
  'Ledger "movimiento del dinero" por casa - una definicion para admin y portal. SERVICIO DE DEUDA (pago mensual recurrente: "Pago interes HML" si "Pago HML" > 0, "Pago Refi 30 anos" si "Pago Ref 30" > 0, con su fecha propia, fuente ff_hml_payments): categoria ''operativo'' + subcategoria ''servicio_deuda'' -> RESTA del mes y BAJA el saldo, igual que un utility (decision CEO 27-ago-2026). Siguen ''financiero'' -> P&L NO: draw del HML, cash-out del refi, fee HML puntual y distribuciones (son capital, no gasto del mes). Todo consumidor que sume "gastos operativos" y "servicio de deuda" por separado DEBE excluir subcategoria=''servicio_deuda'' del bucket operativo para no restarlo dos veces.';

-- ── 2) inv_dist_auto: el bucket "operativos" excluye el servicio de deuda (anti doble conteo)
create or replace function public.inv_dist_auto(p_property_id uuid, p_billing_ym text)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_renta numeric; v_oper numeric; v_deuda numeric; v_neto numeric;
  v_n_renta int; v_n_oper int; v_n_deuda int;
  v_invs jsonb; v_hay boolean; v_dups jsonb; v_casa text; v_pct_total numeric;
begin
  if not public.has_area('fix-flip') then raise exception 'no autorizado'; end if;

  -- ANTI DOBLE CONTEO: desde el 27-ago-2026 el servicio de deuda es categoria 'operativo',
  -- asi que el bucket de operativos lo EXCLUYE explicitamente y se sigue restando una sola vez.
  select coalesce(sum(monto) filter (where categoria = 'renta' and tipo = 'ingreso'), 0),
         coalesce(sum(monto) filter (where categoria = 'operativo' and tipo = 'gasto'
                                       and coalesce(subcategoria,'') <> 'servicio_deuda'), 0),
         coalesce(sum(monto) filter (where subcategoria = 'servicio_deuda'), 0),
         count(*) filter (where categoria = 'renta' and tipo = 'ingreso'),
         count(*) filter (where categoria = 'operativo' and tipo = 'gasto'
                            and coalesce(subcategoria,'') <> 'servicio_deuda'),
         count(*) filter (where subcategoria = 'servicio_deuda')
    into v_renta, v_oper, v_deuda, v_n_renta, v_n_oper, v_n_deuda
    from public.inv_ledger(p_property_id)
   where mes = p_billing_ym;

  v_neto := round(v_renta - v_oper - v_deuda, 2);

  select coalesce(jsonb_agg(jsonb_build_object(
           'investor_airtable_id', h.investor_airtable_id,
           'reparto_pct', pct,
           'monto', round(v_neto * pct, 2)
         ) order by pct desc), '[]'::jsonb)
    into v_invs
    from (select investor_airtable_id,
                 case when reparto_pct > 1 then reparto_pct / 100.0 else coalesce(reparto_pct, 0) end as pct
            from inv_holdings where property_id = p_property_id and active) h;
  select coalesce(sum((x->>'reparto_pct')::numeric), 0) into v_pct_total from jsonb_array_elements(v_invs) x;
  v_hay := v_pct_total > 0;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', d.id, 'investor_airtable_id', d.investor_airtable_id,
           'monto', d.monto, 'fecha', d.fecha, 'estado', d.estado)), '[]'::jsonb)
    into v_dups
    from inv_distributions d
   where d.active and d.property_id = p_property_id and d.origen = 'automatica'
     and coalesce(d.calc_meta->>'billing_ym', to_char(d.fecha,'YYYY-MM')) = p_billing_ym;

  select address into v_casa from ff_deals where property_id = p_property_id and active limit 1;

  return jsonb_build_object(
    'property_id', p_property_id, 'casa', v_casa, 'billing_ym', p_billing_ym,
    'renta', v_renta, 'operativos', v_oper, 'deuda', v_deuda, 'neto', v_neto,
    'n_renta', v_n_renta, 'n_operativos', v_n_oper, 'n_deuda', v_n_deuda,
    'hay_reparto', v_hay, 'hay_inversionistas', jsonb_array_length(v_invs) > 0,
    'pct_total', v_pct_total, 'inversionistas', v_invs,
    'suma_repartida', (select coalesce(sum((x->>'monto')::numeric), 0) from jsonb_array_elements(v_invs) x),
    'duplicados', v_dups, 'calc_at', now()
  );
end; $$;

grant execute on function public.inv_dist_auto(uuid, text) to authenticated;

-- ── 3) inv_portal_resumen: idem, el bucket operativo excluye el servicio de deuda
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
    -- renta - gastos operativos - servicio de deuda, del ultimo mes CONTABLE con movimiento.
    -- El servicio de deuda ya es categoria 'operativo': se EXCLUYE del bucket operativo para
    -- restarlo una sola vez (anti doble conteo).
    select m.property_id, l.mes as billing_ym, l.neto
    from mias m
    cross join lateral (
      select g.mes,
             round(
               coalesce(sum(g.monto) filter (where g.categoria = 'renta' and g.tipo = 'ingreso'), 0)
             - coalesce(sum(g.monto) filter (where g.categoria = 'operativo' and g.tipo = 'gasto'
                                               and coalesce(g.subcategoria,'') <> 'servicio_deuda'), 0)
             - coalesce(sum(g.monto) filter (where g.subcategoria = 'servicio_deuda'), 0)
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
    m.property_id, p360.casa, p360.etapa, p360.lider, p360.avance_planner,
    round(m.invertido::numeric, 2), m.fecha_entrada,
    case when m.fecha_entrada is null then null
         else (extract(year from age(current_date, m.fecha_entrada)) * 12
             + extract(month from age(current_date, m.fecha_entrada)))::int end,
    pnl.ingresos_renta, pnl.gastos_operativos, pnl.interes_hml_real, pnl.utilidad_neta_post_interes,
    ultm.neto, ultm.billing_ym,
    greatest(0, coalesce(defx.deficit_total, 0)),
    jsonb_build_object(
      'deficit_total', defx.deficit_total,
      'ingresos_renta', pnl.ingresos_renta,
      'gastos_operativos', pnl.gastos_operativos,
      'interes_hml', pnl.interes_hml_real,
      'flujo_ult_mes_fuente', 'inv_ledger: renta - gastos operativos - servicio de deuda (una sola vez)',
      'fuente', 'deficit acumulado = ff_deals.deficit_total (Airtable, caja atrapada); renta/gastos/interes = v_pnl_casa (contexto operativo del periodo)'
    ),
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
  left join defx on defx.property_id = m.property_id
  left join hmlx h on h.property_id = m.property_id
  left join ultm on ultm.property_id = m.property_id
  left join dist dist on dist.property_id = m.property_id
$function$;

-- ── 4) inv_portal_resumen_de ("ver como inversionista"): idem
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
    select m.property_id, l.mes as billing_ym, l.neto
    from mias m
    cross join lateral (
      select g.mes,
             round(
               coalesce(sum(g.monto) filter (where g.categoria = 'renta' and g.tipo = 'ingreso'), 0)
             - coalesce(sum(g.monto) filter (where g.categoria = 'operativo' and g.tipo = 'gasto'
                                               and coalesce(g.subcategoria,'') <> 'servicio_deuda'), 0)
             - coalesce(sum(g.monto) filter (where g.subcategoria = 'servicio_deuda'), 0)
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
    jsonb_build_object('ingresos_renta', pnl.ingresos_renta, 'gastos_operativos', pnl.gastos_operativos, 'interes_hml', pnl.interes_hml_real, 'flujo_ult_mes_fuente', 'inv_ledger: renta - gastos operativos - servicio de deuda (una sola vez)', 'fuente', 'v_pnl_casa (Rentas + HML espejo Airtable)'),
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
