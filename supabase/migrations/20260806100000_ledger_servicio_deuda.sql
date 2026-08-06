-- ════════════════════════════════════════════════════════════════
-- 💰 LEDGER · SERVICIO DE DEUDA IDENTIFICABLE (HML / refi 30 años)
--
-- CONTEXTO: inv_ledger YA emitía los movimientos de ff_hml_payments (pago_hml, fee, ref30);
-- lo que faltaba era poder SEPARARLOS del resto de los 'financiero' (desembolso HML, cash-out,
-- draws, aportes). Sin esa marca, "servicio de deuda del mes" solo se podía obtener con una
-- consulta paralela — justo lo que la regla de oro prohíbe (un dato, una fuente).
--
-- QUÉ CAMBIA:
--   1) Columna nueva de salida `subcategoria`:
--        'servicio_deuda' → pago_hml (interés HML) + ref30 (cuota banco 30 años)
--        'fee_hml'        → comisiones puntuales del HML (NO son servicio de deuda recurrente)
--        null             → todo lo demás (idéntico a antes)
--   2) Conceptos renombrados a lenguaje del CEO: "Pago interés HML" / "Pago refi 30 años (banco)".
--
-- QUÉ NO CAMBIA: las categorías siguen siendo 'financiero' → P&L NO (invEngine.pnlSi).
-- El saldo operativo / NOI NO se toca: el servicio de deuda es visible y contabilizable
-- aparte, pero NO entra al NOI. (NOI = renta − operativos · flujo distribuible = NOI − deuda.)
--
-- ⚠ requiere DROP: `create or replace` no puede cambiar el tipo de retorno de la función.
--   Verificado antes de aplicar: ninguna vista/función depende de inv_ledger (pg_depend = 0 filas).
-- ROLLBACK: reaplicar el cuerpo de 20260717110000_portal_inversor_v3.sql (sin subcategoria).
-- ════════════════════════════════════════════════════════════════

drop function if exists public.inv_ledger(uuid);

create or replace function public.inv_ledger(pid uuid) returns table (
  fecha date, concepto text, tipo text, categoria text, subcategoria text,
  monto numeric, fuente text, comprobante text
) language sql stable security definer set search_path = public as $function$
  with ok as (
    select 1 where pid in (select inv_my_props())
      or (public.has_area('fix-flip') and not public.inv_is_investor())
  ),
  d as (select * from ff_deals where active and property_id = pid limit 1)
  -- INVERSIÓN: compra + cierre
  select d.close_date, 'Compra de la casa', 'gasto', 'inversion', null::text, d.purchase_price, 'FF:ff_deals', null::text
    from d, ok where d.close_date is not null and coalesce(d.purchase_price,0) > 0
  union all
  select coalesce(l.fecha_inicio, d.close_date), 'Gastos de cierre (compra)', 'gasto', 'inversion', null, l.gastos_cierre, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.gastos_cierre,0) > 0
  -- FINANCIACIÓN: desembolso HM
  union all
  select coalesce(l.fecha_inicio, d.close_date), 'Desembolso Hard Money', 'ingreso', 'financiero', null, l.monto_hml, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.monto_hml,0) > 0
  -- INVERSIÓN: remodelación (draws — agregado, la fuente no tiene fecha por draw)
  union all
  select coalesce(l.fecha_inicio_rehab, d.close_date), 'Remodelación (draws — total agregado)', 'gasto', 'inversion', null, w.total_draws, 'FF:ff_draws', null
    from d join ff_draws w on w.active and w.address_norm = d.address_norm
    left join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(w.total_draws,0) > 0
  -- 🔴 SERVICIO DE DEUDA: interés mensual del HML (fecha = ff_hml_payments.fecha)
  union all
  select p.fecha, 'Pago interés HML', 'gasto', 'financiero', 'servicio_deuda', p.pago_hml, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.pago_hml,0) > 0 and p.fecha is not null
  -- comisiones puntuales del HML: financiero, pero NO servicio de deuda recurrente
  union all
  select p.fecha, 'Fee HML', 'gasto', 'financiero', 'fee_hml', p.fee, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.fee,0) > 0 and p.fecha is not null
  -- 🔴 SERVICIO DE DEUDA: cuota mensual del banco tras el refi (fecha = fecha_ref30)
  union all
  select p.fecha_ref30, 'Pago refi 30 años (banco)', 'gasto', 'financiero', 'servicio_deuda', p.ref30, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.ref30,0) > 0 and p.fecha_ref30 is not null
  -- FINANCIERO: cash-out del refi
  union all
  select coalesce((select min(p.fecha_ref30) from ff_hml_payments p where p.active and p.address_norm = d.address_norm and coalesce(p.ref30,0) > 0), d.close_date),
         'Cash-out del refinanciamiento', 'ingreso', 'financiero', null, d.cashout, 'FF:ff_deals', null
    from d, ok where coalesce(d.cashout,0) > 0
  -- RENTAS: renta cobrada (espejo Rentas, cruzado por property_id canónico)
  union all
  select coalesce(pay.paid_at::date, (pay.billing_ym || '-01')::date),
         'Renta cobrada · ' || coalesce(pay.billing_ym, '') || coalesce(' · ' || nullif(pay.concept,''), ''),
         'ingreso', 'renta', null, pay.amount, 'Rentas:pm_payments', coalesce(pay.proof_url, pay.attachment_url)
    from ok, pm_properties pp
    join pm_payments pay on pay.property_id = pp.id and pay.active
    where pp.property_id = pid and pp.active and coalesce(pay.amount,0) > 0 and pay.status in ('pagado','paid','completado')
  -- RENTAS: gastos operativos por ítem
  union all
  select coalesce(e.expense_date, (e.billing_ym || '-01')::date),
         'Gasto ' || coalesce(nullif(e.category,''), 'operativo') || coalesce(' · ' || nullif(e.description,''), ''),
         'gasto', 'operativo', null, e.amount, 'Rentas:pm_expenses', e.invoice_url
    from ok, pm_properties pp
    join pm_expenses e on e.property_id = pp.id and e.active
    where pp.property_id = pid and pp.active and coalesce(e.amount,0) > 0
      -- la hipoteca/cuota del banco YA entra desde ff_hml_payments (fecha real) — acá se excluye para no duplicar
      and coalesce(e.description,'') !~* 'hipoteca' and coalesce(e.category,'') !~* 'hipoteca' and coalesce(e.subcategory,'') !~* 'hipoteca'
  -- DISTRIBUCIONES pagadas al inversionista
  union all
  select dt.fecha, 'Distribución al inversionista (' || dt.tipo || ')', 'gasto', 'distribucion', null, dt.monto, 'OS:inv_distributions', dt.k1_url
    from ok, inv_distributions dt
    where dt.active and dt.property_id = pid and dt.estado = 'pagada'
  -- MANUALES (hoja "Datos reales" del OS)
  union all
  select c.fecha, coalesce(nullif(c.concepto,''), nullif(c.item,''), c.linea),
         case when c.tipo = 'ingreso' or c.categoria = 'ingreso' then 'ingreso' else 'gasto' end,
         coalesce(nullif(c.categoria,''), 'manual'), null, abs(c.valor), 'OS:manual(' || coalesce(c.linea,'') || ')', c.id_factura
    from ok, inv_cashflow_real c
    where c.active and c.property_id = pid and c.fecha is not null
  order by 1
$function$;

grant execute on function public.inv_ledger(uuid) to authenticated;

comment on function public.inv_ledger(uuid) is
  'Ledger "movimiento del dinero" por casa — una definición para admin y portal. subcategoria=''servicio_deuda'' marca el pago mensual de deuda (interés HML + cuota refi 30a) para poder sumarlo aparte sin consultar otra fuente; sigue siendo categoria=''financiero'' → P&L NO (no afecta el NOI).';
