-- ================================================================
-- ITEM AUTOMATICO: "Pago Property Management (5%)" por casa y por mes
--
-- Pedido del CEO (27-ago-2026): un movimiento automatico en "Modelo & movimientos" con el
-- 5% del TOTAL de renta cobrada del mes de esa casa, categoria OPERATIVO (resta del mes,
-- del neto y del saldo del Ledger), con fecha al ULTIMO DIA REAL del mes.
--
-- COMO SE IMPLEMENTA (y por que asi):
--   El item NO se materializa como filas en una tabla: se CALCULA dentro de inv_ledger sobre
--   pm_payments. Asi la regla 4 ("recalcula si cambia la renta del mes") sale gratis y siempre
--   es fiel a la fuente — no hay filas que se queden viejas. Lo unico que se persiste son las
--   EDICIONES MANUALES, en inv_pm_fee_overrides (mismo patron que inv_param_overrides:
--   el override manda, es reversible y queda auditado; la fuente nunca se pisa).
--
-- LAS 4 REGLAS DEL CEO, punto por punto:
--   1) Un item por casa y por mes CON renta cobrada. Sin renta -> no se genera (no hay fila
--      en el agregado por mes, asi que no se emite nada).
--   2) EDITABLE: si existe un override activo para esa casa+mes, se usa SU monto y SU fecha y
--      el concepto pasa a "(editado a mano)". Si el override tiene eliminado=true, no se emite
--      el item. El recalculo NUNCA pisa un override: los NO editados si se recalculan solos.
--   3) NO DOBLAR: si ya hay un property management cargado a mano para esa casa+mes -- en
--      pm_expenses O en inv_cashflow_real -- el automatico NO se genera. El manual manda.
--   4) El % vive en ff_uw_config (`inv_pm_fee_pct`, seed 5), no hardcodeado, y se recalcula
--      solo en cada lectura del ledger porque el item se CALCULA, no se materializa.
--
-- TRAZABILIDAD: fuente 'OS:pm_fee(auto 5% de la renta cobrada del mes)' o 'OS:pm_fee(manual)'.
-- subcategoria='pm_fee' -> es el asa que usa el admin para ofrecer editar/eliminar/volver-a-auto.
-- OJO: 'pm_fee' NO se excluye del bucket operativo (a diferencia de 'servicio_deuda'): este SI
-- es un gasto operativo comun y corriente, tiene que restar una vez como cualquier utility.
--
-- NO mueve plata: es un movimiento contable interno, no dispara ningun pago a terceros.
-- Aditivo: no borra ni modifica datos existentes. ROLLBACK al final del archivo.
-- ================================================================

-- ── 1) el % configurable (Pilar 1: ningun numero hardcodeado en la UI) ──
-- ⚠ CLAVE PROPIA a proposito: `pm_fee_pct` YA EXISTE en ff_uw_config con value=4 y es el PM fee
-- del UNDERWRITING. Reusarla habria (a) movido numeros del underwriting y (b) calculado 400% de
-- la renta (ff_uw_config guarda los porcentajes como ENTEROS: lender_fee_pct=2, wholesale=3).
-- Lo detecto la verificacion a mano antes de dar el item por bueno.
insert into public.ff_uw_config (key, value, label)
values ('inv_pm_fee_pct', 5, 'Ledger del inversionista: % de property management sobre la renta cobrada del mes (item automatico). Distinto de pm_fee_pct, que es el del underwriting.')
on conflict (key) do nothing;

-- ── 2) tabla de EDICIONES MANUALES del item automatico ──
create table if not exists public.inv_pm_fee_overrides (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  billing_ym  text not null check (billing_ym ~ '^[0-9]{4}-[0-9]{2}$'),
  monto       numeric,                       -- null solo si eliminado = true
  fecha       date,                          -- null = ultimo dia del mes (el default automatico)
  eliminado   boolean not null default false, -- true = el usuario borro el item de ese mes
  nota        text,
  valor_auto  numeric,                       -- cuanto daba el automatico cuando se edito (traza)
  editado_por text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  active      boolean not null default true,
  archived_at timestamptz
);

-- una sola edicion vigente por casa+mes (las archivadas quedan como historia)
create unique index if not exists inv_pm_fee_overrides_uniq
  on public.inv_pm_fee_overrides (property_id, billing_ym) where active;

alter table public.inv_pm_fee_overrides enable row level security;

drop policy if exists inv_pm_fee_ov_read on public.inv_pm_fee_overrides;
create policy inv_pm_fee_ov_read on public.inv_pm_fee_overrides for select
  using (property_id in (select public.inv_my_props())
         or (public.has_area('fix-flip') and not public.inv_is_investor()));

drop policy if exists inv_pm_fee_ov_write on public.inv_pm_fee_overrides;
create policy inv_pm_fee_ov_write on public.inv_pm_fee_overrides for all
  using (public.has_area('fix-flip') and not public.inv_is_investor())
  with check (public.has_area('fix-flip') and not public.inv_is_investor());

-- mismo audit inmutable que el resto de las tablas inv_*
drop trigger if exists inv_pm_fee_overrides_audit on public.inv_pm_fee_overrides;
create trigger inv_pm_fee_overrides_audit
  after insert or update on public.inv_pm_fee_overrides
  for each row execute function public.trg_inv_audit();

comment on table public.inv_pm_fee_overrides is
  'Ediciones MANUALES del item automatico "Pago Property Management" del Ledger (una por casa+mes). El item se calcula en inv_ledger como % de la renta cobrada del mes; si hay una fila activa aca, manda esta (monto/fecha) y el recalculo no la pisa. eliminado=true borra el item de ese mes. Volver al automatico = active=false (queda la historia + el audit).';

-- ── 3) inv_ledger: rama nueva del item automatico ──
-- (todo lo demas queda EXACTAMENTE igual que en 20260827150000)
create or replace function public.inv_ledger(pid uuid) returns table (
  fecha date, mes text, concepto text, tipo text, categoria text, subcategoria text,
  monto numeric, fuente text, comprobante text
) language sql stable security definer set search_path = public as $function$
  with ok as (
    select 1 where pid in (select inv_my_props())
      or (public.has_area('fix-flip') and not public.inv_is_investor())
  ),
  d as (select * from ff_deals where active and property_id = pid limit 1),
  -- % de property management del LEDGER (clave propia `inv_pm_fee_pct`, NO la del underwriting).
  -- Normalizacion defensiva: la tabla guarda porcentajes enteros (5 = 5%), pero si alguien carga
  -- 0.05 tambien funciona. Sin esto, un 5 mal interpretado multiplicaba la renta por 5.
  pmpct as (
    select case when v > 1 then v / 100.0 else v end as v from (
      select coalesce((select value from ff_uw_config where key = 'inv_pm_fee_pct'), 5) as v
    ) x
  ),
  -- renta cobrada por MES CONTABLE de esta casa (la misma fuente que las filas "Renta cobrada")
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
  -- 🔵 PROPERTY MANAGEMENT: % de la renta cobrada del mes, al ultimo dia real del mes
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
    -- REGLA 3 · el manual manda: ya hay un property management cargado para esa casa+mes
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

grant execute on function public.inv_ledger(uuid) to authenticated;

-- ROLLBACK
--   1) reaplicar 20260827150000 (deja inv_ledger sin la rama de property management)
--   2) drop table public.inv_pm_fee_overrides;   -- solo si se descarta la funcionalidad
--   3) delete from public.ff_uw_config where key = 'inv_pm_fee_pct';  -- NO tocar pm_fee_pct (underwriting)
