-- ================================================================
-- LEDGER · HML vs REFI 30 bien distinguidos (monto, fecha y concepto REALES de Airtable)
--
-- Pedido del CEO (27-ago-2026), a partir de 4916 Barkbridge: junio-2026 mostraba
-- "Pago interes HML -$1,600" cuando el pago real de ese mes es REFI 30 = $1,579.73.
--
-- DIAGNOSTICO (verificado contra Airtable "Pagos interes (HML & REFI)" tblV4wNA8hNs5Mmk8):
--   * El SYNC NO tenia el bug: sync-ff-airtable ya mapea los 6 campos correctos
--     ("Fecha de Pago - HML" fld7y5uQLeJlCHgno / "Pago HML" fldDe1BDW4fP5s3WR /
--      "Pago Ref 30" fldWACGPEKKhLp206 / "Fecha de pago Ref 30" fldlDpPWUnYhIsETm /
--      "Fee Adicional" fldrSE3aeiMqkfpHE / "Check de pago" fldOOSgpzzdfw8ABA).
--   * El espejo estaba VIEJO: ultimo sync 26-ago 23:54, y Airtable se edito el 27-ago ~16:00.
--     El $1,600 era el valor que la columna "Pago HML" tenia ANTES de esa edicion: la
--     plataforma espejaba fielmente una fuente que todavia no estaba separada en HML/Refi.
--   * Causa raiz operativa: NO existe cron para sync-ff-airtable (Rentas corre cada 15 min,
--     Remodelacion cada 30, ClickUp cada hora; Fix & Flip no tenia ninguno). Se agrega aparte.
--
-- QUE CAMBIA ACA (la REGLA POR MES ya estaba bien implementada; se afina el detalle):
--   1) Concepto del pago del banco: 'Pago refi 30 anos (banco)' -> 'Pago Refi 30 anos'
--      (el texto exacto que pidio el CEO).
--   2) FIN DEL DESCARTE SILENCIOSO: antes, un pago con monto > 0 pero sin SU fecha propia se
--      caia del ledger sin avisar (`and p.fecha is not null` / `and p.fecha_ref30 is not null`).
--      Ahora la fecha cae a la otra columna del mismo registro (coalesce) y solo se descarta si
--      el registro NO tiene ninguna de las dos fechas. Hoy 0 filas dependen del fallback
--      (ref30 sin fecha_ref30 = 0), asi que este cambio NO mueve ningun numero actual: es un
--      seguro para que un pago real nunca desaparezca por un campo vacio.
--
-- QUE NO CAMBIA: la regla por mes (Pago HML > 0 -> interes HML con su fecha; Pago Ref 30 > 0 ->
-- refi 30 con su fecha), la subcategoria 'servicio_deuda' de ambos, `mes` = mes CONTABLE, y que
-- el servicio de deuda siga siendo categoria 'financiero' -> P&L NO (no entra al NOI, se resta
-- despues). El monto SIEMPRE sale de ff_hml_payments (espejo de Airtable): ningun valor modelado.
--
-- Mismo tipo de retorno que 20260806110000 -> alcanza con create or replace (sin drop).
-- ROLLBACK: reaplicar 20260806110000_inv_dist_auto_ledger.sql.
-- ================================================================

create or replace function public.inv_ledger(pid uuid) returns table (
  fecha date, mes text, concepto text, tipo text, categoria text, subcategoria text,
  monto numeric, fuente text, comprobante text
) language sql stable security definer set search_path = public as $function$
  with ok as (
    select 1 where pid in (select inv_my_props())
      or (public.has_area('fix-flip') and not public.inv_is_investor())
  ),
  d as (select * from ff_deals where active and property_id = pid limit 1)
  -- INVERSION: compra + cierre
  select d.close_date, to_char(d.close_date,'YYYY-MM'), 'Compra de la casa', 'gasto', 'inversion', null::text, d.purchase_price, 'FF:ff_deals', null::text
    from d, ok where d.close_date is not null and coalesce(d.purchase_price,0) > 0
  union all
  select coalesce(l.fecha_inicio, d.close_date), to_char(coalesce(l.fecha_inicio, d.close_date),'YYYY-MM'), 'Gastos de cierre (compra)', 'gasto', 'inversion', null, l.gastos_cierre, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.gastos_cierre,0) > 0
  -- FINANCIACION: desembolso HM
  union all
  select coalesce(l.fecha_inicio, d.close_date), to_char(coalesce(l.fecha_inicio, d.close_date),'YYYY-MM'), 'Desembolso Hard Money', 'ingreso', 'financiero', null, l.monto_hml, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.monto_hml,0) > 0
  -- INVERSION: remodelacion (draws — agregado, la fuente no tiene fecha por draw)
  union all
  select coalesce(l.fecha_inicio_rehab, d.close_date), to_char(coalesce(l.fecha_inicio_rehab, d.close_date),'YYYY-MM'), 'Remodelación (draws — total agregado)', 'gasto', 'inversion', null, w.total_draws, 'FF:ff_draws', null
    from d join ff_draws w on w.active and w.address_norm = d.address_norm
    left join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(w.total_draws,0) > 0
  -- 🔴 SERVICIO DE DEUDA · INTERES HML: SOLO si "Pago HML" > 0, con SU fecha ("Fecha de Pago - HML")
  union all
  select coalesce(p.fecha, p.fecha_ref30), to_char(coalesce(p.fecha, p.fecha_ref30),'YYYY-MM'), 'Pago interés HML', 'gasto', 'financiero', 'servicio_deuda', p.pago_hml, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.pago_hml,0) > 0 and coalesce(p.fecha, p.fecha_ref30) is not null
  -- comisiones puntuales del HML: financiero, pero NO servicio de deuda recurrente
  union all
  select coalesce(p.fecha, p.fecha_ref30), to_char(coalesce(p.fecha, p.fecha_ref30),'YYYY-MM'), 'Fee HML', 'gasto', 'financiero', 'fee_hml', p.fee, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.fee,0) > 0 and coalesce(p.fecha, p.fecha_ref30) is not null
  -- 🔴 SERVICIO DE DEUDA · REFI 30 AÑOS: SOLO si "Pago Ref 30" > 0, con SU fecha ("Fecha de pago Ref 30")
  union all
  select coalesce(p.fecha_ref30, p.fecha), to_char(coalesce(p.fecha_ref30, p.fecha),'YYYY-MM'), 'Pago Refi 30 años', 'gasto', 'financiero', 'servicio_deuda', p.ref30, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.ref30,0) > 0 and coalesce(p.fecha_ref30, p.fecha) is not null
  -- FINANCIERO: cash-out del refi
  union all
  select coalesce((select min(p.fecha_ref30) from ff_hml_payments p where p.active and p.address_norm = d.address_norm and coalesce(p.ref30,0) > 0), d.close_date),
         to_char(coalesce((select min(p.fecha_ref30) from ff_hml_payments p where p.active and p.address_norm = d.address_norm and coalesce(p.ref30,0) > 0), d.close_date),'YYYY-MM'),
         'Cash-out del refinanciamiento', 'ingreso', 'financiero', null, d.cashout, 'FF:ff_deals', null
    from d, ok where coalesce(d.cashout,0) > 0
  -- RENTAS: renta cobrada — mes = billing_ym (MES DE RENTA, regla dura)
  union all
  select coalesce(pay.paid_at::date, (pay.billing_ym || '-01')::date),
         coalesce(pay.billing_ym, to_char(pay.paid_at,'YYYY-MM')),
         'Renta cobrada · ' || coalesce(pay.billing_ym, '') || coalesce(' · ' || nullif(pay.concept,''), ''),
         'ingreso', 'renta', null, pay.amount, 'Rentas:pm_payments', coalesce(pay.proof_url, pay.attachment_url)
    from ok, pm_properties pp
    join pm_payments pay on pay.property_id = pp.id and pay.active
    where pp.property_id = pid and pp.active and coalesce(pay.amount,0) > 0 and pay.status in ('pagado','paid','completado')
  -- RENTAS: gastos operativos por item — mes = billing_ym (misma regla)
  union all
  select coalesce(e.expense_date, (e.billing_ym || '-01')::date),
         coalesce(e.billing_ym, to_char(e.expense_date,'YYYY-MM')),
         'Gasto ' || coalesce(nullif(e.category,''), 'operativo') || coalesce(' · ' || nullif(e.description,''), ''),
         'gasto', 'operativo', null, e.amount, 'Rentas:pm_expenses', e.invoice_url
    from ok, pm_properties pp
    join pm_expenses e on e.property_id = pp.id and e.active
    where pp.property_id = pid and pp.active and coalesce(e.amount,0) > 0
      -- la hipoteca/cuota del banco YA entra desde ff_hml_payments (fecha real) — aca se excluye para no duplicar
      and coalesce(e.description,'') !~* 'hipoteca' and coalesce(e.category,'') !~* 'hipoteca' and coalesce(e.subcategory,'') !~* 'hipoteca'
  -- DISTRIBUCIONES pagadas al inversionista
  union all
  select dt.fecha, to_char(dt.fecha,'YYYY-MM'), 'Distribución al inversionista (' || dt.tipo || ')', 'gasto', 'distribucion', null, dt.monto, 'OS:inv_distributions', dt.k1_url
    from ok, inv_distributions dt
    where dt.active and dt.property_id = pid and dt.estado = 'pagada'
  -- MANUALES (hoja "Datos reales" del OS)
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
  'Ledger "movimiento del dinero" por casa — una definicion para admin y portal. Servicio de deuda (subcategoria=''servicio_deuda''): por MES, "Pago HML" > 0 -> "Pago interés HML" con "Fecha de Pago - HML"; "Pago Ref 30" > 0 -> "Pago Refi 30 años" con "Fecha de pago Ref 30". Monto y fecha SIEMPRE de ff_hml_payments (espejo de Airtable "Pagos interes (HML & REFI)"), nunca un valor modelado. `mes` = mes CONTABLE (billing_ym en Rentas). Sigue siendo categoria ''financiero'' -> P&L NO: no afecta el NOI, se resta despues.';
