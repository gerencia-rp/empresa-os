-- ═══════════════════════════════════════════════════════════════════════════
-- ↩ ROLLBACK de 20260904100000_ledger_renta_por_unidad.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Reinstala inv_ledger(pid) TAL CUAL estaba antes del 04-sep-2026: la "Renta cobrada"
-- vuelve a no decir la unidad (sin LEFT JOIN pm_units). Es un CREATE OR REPLACE con la
-- misma firma → no hay que dropear nada ni tocar consumidores. Ningún monto cambia
-- (el cambio era 100% texto del concepto).
--   psql/SQL editor: correr este archivo entero.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.inv_ledger(pid uuid)
returns table(fecha date, mes text, concepto text, tipo text, categoria text, subcategoria text, monto numeric, fuente text, comprobante text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with ok as (
    select 1 where pid in (select inv_my_props())
      or (public.has_area('fix-flip') and not public.inv_is_investor())
  ),
  d as (select * from ff_deals where active and property_id = pid limit 1),
  -- % de property management del LEDGER (clave propia `inv_pm_fee_pct`, NO la del underwriting).
  -- Normalizacion defensiva: ff_uw_config guarda porcentajes enteros (5 = 5%), pero si alguien
  -- carga 0.05 tambien funciona. Sin esto, un 5 mal interpretado multiplicaba la renta por 5.
  pmpct as (
    select case when v > 1 then v / 100.0 else v end as v from (
      select coalesce((select value from ff_uw_config where key = 'inv_pm_fee_pct'), 5) as v
    ) x
  ),
  rentames as (
    select coalesce(pay.billing_ym, to_char(pay.paid_at,'YYYY-MM')) as mes, sum(pay.amount) as renta
    from pm_properties pp
    join pm_payments pay on pay.property_id = pp.id and pay.active
    where pp.property_id = pid and pp.active and coalesce(pay.amount,0) > 0
      and pay.status in ('pagado','paid','completado')
    group by 1
  )
  select d.close_date, to_char(d.close_date,'YYYY-MM'), 'Compra de la casa', 'gasto', 'inversion', null::text, d.purchase_price, 'FF:ff_deals', null::text
    from d, ok where d.close_date is not null and coalesce(d.purchase_price,0) > 0
  union all
  select coalesce(l.fecha_inicio, d.close_date), to_char(coalesce(l.fecha_inicio, d.close_date),'YYYY-MM'), 'Gastos de cierre (compra)', 'gasto', 'inversion', null, l.gastos_cierre, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.gastos_cierre,0) > 0
  union all
  select coalesce(l.fecha_inicio, d.close_date), to_char(coalesce(l.fecha_inicio, d.close_date),'YYYY-MM'), 'Desembolso Hard Money', 'ingreso', 'financiero', null, l.monto_hml, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.monto_hml,0) > 0
  union all
  select coalesce(l.fecha_inicio_rehab, d.close_date), to_char(coalesce(l.fecha_inicio_rehab, d.close_date),'YYYY-MM'), 'Remodelación (draws — total agregado)', 'gasto', 'inversion', null, w.total_draws, 'FF:ff_draws', null
    from d join ff_draws w on w.active and w.address_norm = d.address_norm
    left join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(w.total_draws,0) > 0
  union all
  select coalesce(p.fecha, p.fecha_ref30), to_char(coalesce(p.fecha, p.fecha_ref30),'YYYY-MM'), 'Pago interés HML', 'gasto', 'operativo', 'servicio_deuda', p.pago_hml, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.pago_hml,0) > 0 and coalesce(p.fecha, p.fecha_ref30) is not null
  union all
  select coalesce(p.fecha, p.fecha_ref30), to_char(coalesce(p.fecha, p.fecha_ref30),'YYYY-MM'), 'Fee HML', 'gasto', 'financiero', 'fee_hml', p.fee, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.fee,0) > 0 and coalesce(p.fecha, p.fecha_ref30) is not null
  union all
  select coalesce(p.fecha_ref30, p.fecha), to_char(coalesce(p.fecha_ref30, p.fecha),'YYYY-MM'), 'Pago Refi 30 años', 'gasto', 'operativo', 'servicio_deuda', p.ref30, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.ref30,0) > 0 and coalesce(p.fecha_ref30, p.fecha) is not null
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
      and coalesce(e.description,'') !~* 'hipoteca' and coalesce(e.category,'') !~* 'hipoteca' and coalesce(e.subcategory,'') !~* 'hipoteca'
  union all
  select
    coalesce(o.fecha, (date_trunc('month', (r.mes || '-01')::date) + interval '1 month' - interval '1 day')::date),
    r.mes,
    case when o.id is not null then 'Pago Property Management (editado a mano)'
         else 'Pago Property Management (' || trim(to_char(pmpct.v * 100, 'FM990.##')) || '%)' end,
    'gasto', 'operativo', 'pm_fee',
    case when o.id is not null then o.monto else round(r.renta * pmpct.v, 2) end,
    case when o.id is not null then 'OS:pm_fee(manual)'
         else 'OS:pm_fee(auto ' || trim(to_char(pmpct.v * 100, 'FM990.##')) || '% de la renta cobrada del mes)' end,
    null
  from ok, rentames r
  cross join pmpct
  left join inv_pm_fee_overrides o
    on o.active and o.property_id = pid and o.billing_ym = r.mes
  where coalesce(o.eliminado, false) = false
    and coalesce(case when o.id is not null then o.monto else round(r.renta * pmpct.v, 2) end, 0) > 0
    and not exists (
      select 1 from pm_properties pp2
      join pm_expenses e2 on e2.property_id = pp2.id and e2.active
      where pp2.property_id = pid and pp2.active
        and coalesce(e2.billing_ym, to_char(e2.expense_date,'YYYY-MM')) = r.mes
        and (coalesce(e2.description,'') ~* 'property m|pm fee|administraci'
          or coalesce(e2.category,'')    ~* 'property m|administraci'
          or coalesce(e2.subcategory,'') ~* 'property m|administraci')
    )
    and not exists (
      select 1 from inv_cashflow_real c2
      where c2.active and c2.property_id = pid
        and to_char(c2.fecha,'YYYY-MM') = r.mes
        and (coalesce(c2.concepto,'') || ' ' || coalesce(c2.item,'')) ~* 'property m|pm fee|administraci'
    )
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

comment on function public.inv_ledger(uuid) is
  'Línea de tiempo del dinero por casa (una definición para el portal del inversionista y el Ledger del admin).';
