-- ════════════════════════════════════════════════════════════════
-- 💎 INVERSIONISTAS · ESCALA A TODAS LAS CASAS + LEDGER "movimiento del dinero".
-- ADITIVA e idempotente (on conflict do nothing — Dove y ediciones manuales NO se pisan).
-- Población 100% desde fuentes: ff_deals / ff_investors / ff_hml_loans / ff_hml_payments /
-- ff_draws (+ puente Rentas pm_properties.property_id). Cada param declara fuente;
-- lo no derivable queda 'supuesto' (en calibración), jamás inventado.
-- ════════════════════════════════════════════════════════════════

-- ── 1) inv_holdings: inversionista ↔ casa (N:N; capital y reparto desde ff_deals) ──
insert into public.inv_holdings (investor_airtable_id, property_id, inversion_aportada, reparto_pct, fecha_entrada, notas)
select trim(rec) as investor_airtable_id,
       d.property_id,
       round(d.capital_inversionista / greatest(1, array_length(string_to_array(d.investor_rec_ids, ','), 1)), 2),
       case when d.ownership_pct > 1 then d.ownership_pct / 100.0 else d.ownership_pct end,
       d.close_date,
       'auto:ff_deals (capital_inversionista' || case when d.investor_rec_ids like '%,%' then ' repartido entre co-inversionistas' else '' end || ')'
from public.ff_deals d,
     unnest(string_to_array(d.investor_rec_ids, ',')) as rec
where d.active and d.property_id is not null
  and coalesce(d.capital_inversionista, 0) > 0
  and coalesce(trim(rec), '') <> ''
on conflict (investor_airtable_id, property_id) do nothing;

-- ── 2) inv_model_params por casa (motor) — derivados de fuentes reales + macro modelo ──
with base as (
  select d.property_id pid, d.address, d.close_date, d.stage,
         d.purchase_price, d.arv, d.appraisal, d.remodel_est, d.renta_mensual,
         d.gastos_mensuales, d.ref30_payment, d.cashout, d.ownership_pct,
         l.monto_hml, l.tasa_pct, l.gastos_cierre,
         w.total_draws, w.net_total, w.hml_months,
         rd.primer_ref30
  from public.ff_deals d
  left join public.ff_hml_loans l on l.active and l.address_norm = d.address_norm
  left join public.ff_draws w on w.active and w.address_norm = d.address_norm
  left join lateral (
    select min(p.fecha_ref30) primer_ref30 from public.ff_hml_payments p
    where p.active and p.address_norm = d.address_norm and coalesce(p.ref30, 0) > 0
  ) rd on true
  where d.active and d.property_id is not null and coalesce(d.capital_inversionista, 0) > 0
),
kv as (
  select pid, key, value, fuente, descripcion from base, lateral (values
    ('direccion',        address,                                              'real:ff_deals', null),
    ('fecha_cierre',     close_date::text,                                     'real:ff_deals', null),
    ('estado_casa',      stage,                                                'real:ff_deals', null),
    ('compra',           purchase_price::text,                                 'real:ff_deals', 'precio de compra'),
    ('cierre_compra',    coalesce(gastos_cierre, 0)::text,                     case when gastos_cierre is not null then 'real:ff_hml_loans' else 'supuesto' end, 'gastos de cierre de la compra'),
    ('hm_inicial',       coalesce(case when monto_hml is not null and total_draws is not null then monto_hml - total_draws end, monto_hml, purchase_price)::text,
                         case when monto_hml is not null then 'real:ff_hml_loans' else 'supuesto' end, 'HM al cierre (monto_hml − draws)'),
    ('hm_tasa',          coalesce(case when tasa_pct > 1 then tasa_pct / 100.0 else tasa_pct end, 0.12)::text,
                         case when tasa_pct is not null then 'real:ff_hml_loans' else 'supuesto' end, 'tasa anual del Hard Money'),
    ('draw_m1',          round(coalesce(total_draws, remodel_est, 0) / 2.0, 2)::text,
                         case when total_draws is not null then 'real:ff_draws' else 'real:ff_deals(estimado)' end, 'mitad de la remodelación — timing supuesto (m1)'),
    ('draw_m2',          round(coalesce(total_draws, remodel_est, 0) / 2.0, 2)::text,
                         case when total_draws is not null then 'real:ff_draws' else 'real:ff_deals(estimado)' end, 'mitad de la remodelación — timing supuesto (m2)'),
    ('refi_mes',         coalesce(case when primer_ref30 is not null and close_date is not null
                                       then greatest(1, least(12, ((primer_ref30 - close_date) / 30.44)::int))::text end,
                                  nullif(hml_months, 0)::text, '6'),
                         case when primer_ref30 is not null then 'real:ff_hml_payments' when nullif(hml_months,0) is not null then 'real:ff_draws' else 'supuesto' end,
                         'mes del refi (desde 1ª cuota ref30)'),
    ('refi_monto',       round(0.75 * coalesce(appraisal, arv, 0), 2)::text,   'modelo', '75% LTV sobre avalúo/ARV'),
    ('refi_tasa',        '0.1139',                                             'supuesto', 'tasa refi 30a — EN CALIBRACIÓN (default del modelo maestro)'),
    ('refi_plazo_m',     '360',                                                'modelo', null),
    ('cierre_refi',      '0',                                                  'supuesto', 'costos de cierre del refi — en calibración'),
    ('arv',              coalesce(arv, 0)::text,                               'real:ff_deals', null),
    ('num_hab',          '1',                                                  'estructura', 'renta total en un solo ítem (arriendo_hab = renta de la casa)'),
    ('arriendo_hab',     coalesce(renta_mensual, 0)::text,                     case when renta_mensual is not null then 'real:ff_deals' else 'supuesto' end,
                         case when renta_mensual is null then 'sin renta en ff_deals — EN CALIBRACIÓN' else 'renta mensual total' end),
    ('rampa',            '0,0,0,0.4,0.6,0.8,1,1,1,1,1,1,1',                    'supuesto', 'rampa de ocupación — en calibración'),
    ('ocupacion_estable','1',                                                  'supuesto', null),
    ('mantenimiento_mes','0',                                                  'estructura', 'incluido en servicios_mes (gastos totales)'),
    ('servicios_mes',    greatest(0, round(coalesce(gastos_mensuales, 0) - coalesce(ref30_payment, 0), 2))::text,
                         case when gastos_mensuales is not null then 'real:ff_deals(derivado: gastos − cuota banco)' else 'supuesto' end,
                         'gastos operativos totales/mes (sin la cuota del banco) — itemización EN CALIBRACIÓN'),
    ('hoa_mes',          '0',                                                  'estructura', 'incluido en servicios_mes'),
    ('padsplit_pct',     '0',                                                  'estructura', 'incluido en servicios_mes'),
    ('comision_pct',     '0',                                                  'estructura', 'incluido en servicios_mes'),
    ('imp_propiedad_pct','0',                                                  'estructura', 'impuesto incluido en servicios_mes (gastos totales reales)'),
    ('imp_renta_pct',    '0',                                                  'supuesto', null),
    ('seguro_mes',       '0',                                                  'estructura', 'incluido en servicios_mes'),
    ('valorizacion',     '0.053',                                              'modelo', null),
    ('inflacion',        '0.03',                                               'modelo', null),
    ('retorno_esperado', '0.08',                                               'modelo', null),
    ('ciclo_meses',      '12',                                                 'modelo', null),
    ('anios',            '31',                                                 'modelo', null),
    ('reparto_inv',      (case when ownership_pct > 1 then ownership_pct / 100.0 else coalesce(ownership_pct, 0.5) end)::text,
                         'real:ff_deals', 'ownership_pct del deal'),
    ('cash_atrapado_real', case when net_total is not null then abs(net_total)::text end, 'real:ff_draws', 'cash atrapado real del ciclo (net_total)'),
    -- base OFICIAL post-refi con utilidad REAL (renta − gastos totales) cuando existe:
    ('postrefi_perfil',  case when renta_mensual is not null and gastos_mensuales is not null then 'plano' end,
                         'real:ff_deals(derivado)', 'proyección plana con la utilidad real del deal'),
    ('util_anual_postrefi', case when renta_mensual is not null and gastos_mensuales is not null
                                 then round((renta_mensual - gastos_mensuales) * 12, 2)::text end,
                         'real:ff_deals(derivado)', '(renta − gastos totales) × 12'),
    ('anio0_postrefi',   case when net_total is not null then abs(net_total)::text end, 'real:ff_draws', 'año 0 post-refi = cash atrapado real'),
    -- underwriting (escenario Estimado):
    ('est_arv',          coalesce(arv, 0)::text,                               'real:ff_deals', 'ARV del underwriting'),
    ('est_remodel_total',coalesce(remodel_est, total_draws, 0)::text,          'real:ff_deals', 'remodelación estimada del underwriting'),
    ('est_cierre_pct',   '0.02',                                               'modelo', 'originación estimada')
  ) as t(key, value, fuente, descripcion)
  where value is not null
)
insert into public.inv_model_params (property_id, key, value, fuente, descripcion)
select pid, key, value, fuente, descripcion from kv
on conflict (property_id, key) do nothing;

-- ── 3) LEDGER "movimiento del dinero" — RPC única (misma definición para portal y admin) ──
-- Guard: solo casas del inversionista (inv_my_props) o área fix-flip. SECURITY DEFINER
-- porque une fuentes (ff_*/pm_*) que el inversionista NO puede leer directo — acá salen
-- SOLO filas de SU casa, sin markup ni datos de otras casas.
create or replace function public.inv_ledger(pid uuid) returns table (
  fecha date, concepto text, tipo text, categoria text, monto numeric, fuente text, comprobante text
) language sql stable security definer set search_path = public as $$
  with ok as (
    select 1 where pid in (select inv_my_props()) or public.has_area('fix-flip')
  ),
  d as (select * from ff_deals where active and property_id = pid limit 1)
  -- INVERSIÓN: compra + cierre
  select d.close_date, 'Compra de la casa', 'gasto', 'inversion', d.purchase_price, 'FF:ff_deals', null::text
    from d, ok where d.close_date is not null and coalesce(d.purchase_price,0) > 0
  union all
  select coalesce(l.fecha_inicio, d.close_date), 'Gastos de cierre (compra)', 'gasto', 'inversion', l.gastos_cierre, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.gastos_cierre,0) > 0
  -- FINANCIACIÓN: desembolso HM
  union all
  select coalesce(l.fecha_inicio, d.close_date), 'Desembolso Hard Money', 'ingreso', 'financiero', l.monto_hml, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.monto_hml,0) > 0
  -- INVERSIÓN: remodelación (draws — agregado, la fuente no tiene fecha por draw)
  union all
  select coalesce(l.fecha_inicio_rehab, d.close_date), 'Remodelación (draws — total agregado)', 'gasto', 'inversion', w.total_draws, 'FF:ff_draws', null
    from d join ff_draws w on w.active and w.address_norm = d.address_norm
    left join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(w.total_draws,0) > 0
  -- FINANCIERO: pagos HML (con fecha real) + fees
  union all
  select p.fecha, 'Pago Hard Money (intereses)', 'gasto', 'financiero', p.pago_hml, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.pago_hml,0) > 0 and p.fecha is not null
  union all
  select p.fecha, 'Fee HML', 'gasto', 'financiero', p.fee, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.fee,0) > 0 and p.fecha is not null
  -- FINANCIERO: cuotas del banco (refi 30a)
  union all
  select p.fecha_ref30, 'Cuota banco (refi 30 años)', 'gasto', 'financiero', p.ref30, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.ref30,0) > 0 and p.fecha_ref30 is not null
  -- FINANCIERO: cash-out del refi
  union all
  select coalesce((select min(p.fecha_ref30) from ff_hml_payments p where p.active and p.address_norm = d.address_norm and coalesce(p.ref30,0) > 0), d.close_date),
         'Cash-out del refinanciamiento', 'ingreso', 'financiero', d.cashout, 'FF:ff_deals', null
    from d, ok where coalesce(d.cashout,0) > 0
  -- RENTAS: renta cobrada (espejo Rentas, cruzado por property_id canónico)
  union all
  select coalesce(pay.paid_at::date, (pay.billing_ym || '-01')::date),
         'Renta cobrada · ' || coalesce(pay.billing_ym, '') || coalesce(' · ' || nullif(pay.concept,''), ''),
         'ingreso', 'renta', pay.amount, 'Rentas:pm_payments', coalesce(pay.proof_url, pay.attachment_url)
    from ok, pm_properties pp
    join pm_payments pay on pay.property_id = pp.id and pay.active
    where pp.property_id = pid and pp.active and coalesce(pay.amount,0) > 0 and pay.status in ('pagado','paid','completado')
  -- RENTAS: gastos operativos por ítem
  union all
  select coalesce(e.expense_date, (e.billing_ym || '-01')::date),
         'Gasto ' || coalesce(nullif(e.category,''), 'operativo') || coalesce(' · ' || nullif(e.description,''), ''),
         'gasto', 'operativo', e.amount, 'Rentas:pm_expenses', e.invoice_url
    from ok, pm_properties pp
    join pm_expenses e on e.property_id = pp.id and e.active
    where pp.property_id = pid and pp.active and coalesce(e.amount,0) > 0
  -- DISTRIBUCIONES pagadas al inversionista
  union all
  select dt.fecha, 'Distribución al inversionista (' || dt.tipo || ')', 'gasto', 'distribucion', dt.monto, 'OS:inv_distributions', dt.k1_url
    from ok, inv_distributions dt
    where dt.active and dt.property_id = pid and dt.estado = 'pagada'
  -- MANUALES (hoja "Datos reales" del OS)
  union all
  select c.fecha, coalesce(nullif(c.concepto,''), nullif(c.item,''), c.linea),
         case when c.tipo = 'ingreso' or c.categoria = 'ingreso' then 'ingreso' else 'gasto' end,
         coalesce(nullif(c.categoria,''), 'manual'), abs(c.valor), 'OS:manual(' || coalesce(c.linea,'') || ')', c.id_factura
    from ok, inv_cashflow_real c
    where c.active and c.property_id = pid and c.fecha is not null
  order by 1
$$;
grant execute on function public.inv_ledger(uuid) to authenticated;

-- ROLLBACK: drop function inv_ledger; delete from inv_holdings where notas like 'auto:ff_deals%';
--   delete from inv_model_params where (property_id,key) not in (seeds de Dove) — o filtrar por created_at de esta corrida.
