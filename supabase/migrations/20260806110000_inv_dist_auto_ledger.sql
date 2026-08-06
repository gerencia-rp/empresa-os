-- ════════════════════════════════════════════════════════════════
-- 💸 DISTRIBUCIÓN AUTOMÁTICA · calculada DESDE EL LEDGER (una fuente, no una consulta paralela)
--
-- REGLA DE ORO: la distribución automática lee EXACTAMENTE los mismos movimientos que el
-- Ledger (la RPC inv_ledger). NO reimplementa la suma de rentas/gastos/deuda por su cuenta.
--
--   Neto distribuible del mes = Renta − Gastos operativos − Servicio de deuda
--   Monto por inversionista   = Neto × su reparto_pct (inv_holdings, "Casas & reparto")
--
-- ── 1) inv_ledger gana `mes` (el MES CONTABLE canónico) ──────────────────────────────
-- CLAUDE.md, regla dura de Rentas: el "mes" del dinero es el MES DE RENTA (billing_ym),
-- NUNCA la fecha de cobro. El ledger fecha las rentas con coalesce(paid_at, billing_ym-01),
-- así que agrupar por `fecha` rompería esa regla: en 2315 Dove Springs 3 de 27 pagos caen
-- en un mes distinto al que corresponden. Por eso el ledger ahora expone el mes contable:
--     pm_payments / pm_expenses → billing_ym   ·   resto de las fuentes → mes de la fecha
-- Así "el Ledger filtrado a ese mes" y "la distribución de ese mes" son el MISMO conjunto.
--
-- ⚠ requiere DROP otra vez (cambia el tipo de retorno). Verificado: 0 dependientes.
-- ROLLBACK: reaplicar 20260806100000 (sin `mes`) y drop function inv_dist_auto.
-- ════════════════════════════════════════════════════════════════

drop function if exists public.inv_ledger(uuid);

create or replace function public.inv_ledger(pid uuid) returns table (
  fecha date, mes text, concepto text, tipo text, categoria text, subcategoria text,
  monto numeric, fuente text, comprobante text
) language sql stable security definer set search_path = public as $function$
  with ok as (
    select 1 where pid in (select inv_my_props())
      or (public.has_area('fix-flip') and not public.inv_is_investor())
  ),
  d as (select * from ff_deals where active and property_id = pid limit 1)
  -- INVERSIÓN: compra + cierre
  select d.close_date, to_char(d.close_date,'YYYY-MM'), 'Compra de la casa', 'gasto', 'inversion', null::text, d.purchase_price, 'FF:ff_deals', null::text
    from d, ok where d.close_date is not null and coalesce(d.purchase_price,0) > 0
  union all
  select coalesce(l.fecha_inicio, d.close_date), to_char(coalesce(l.fecha_inicio, d.close_date),'YYYY-MM'), 'Gastos de cierre (compra)', 'gasto', 'inversion', null, l.gastos_cierre, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.gastos_cierre,0) > 0
  -- FINANCIACIÓN: desembolso HM
  union all
  select coalesce(l.fecha_inicio, d.close_date), to_char(coalesce(l.fecha_inicio, d.close_date),'YYYY-MM'), 'Desembolso Hard Money', 'ingreso', 'financiero', null, l.monto_hml, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.monto_hml,0) > 0
  -- INVERSIÓN: remodelación (draws — agregado, la fuente no tiene fecha por draw)
  union all
  select coalesce(l.fecha_inicio_rehab, d.close_date), to_char(coalesce(l.fecha_inicio_rehab, d.close_date),'YYYY-MM'), 'Remodelación (draws — total agregado)', 'gasto', 'inversion', null, w.total_draws, 'FF:ff_draws', null
    from d join ff_draws w on w.active and w.address_norm = d.address_norm
    left join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(w.total_draws,0) > 0
  -- 🔴 SERVICIO DE DEUDA: interés mensual del HML
  union all
  select p.fecha, to_char(p.fecha,'YYYY-MM'), 'Pago interés HML', 'gasto', 'financiero', 'servicio_deuda', p.pago_hml, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.pago_hml,0) > 0 and p.fecha is not null
  -- comisiones puntuales del HML: financiero, pero NO servicio de deuda recurrente
  union all
  select p.fecha, to_char(p.fecha,'YYYY-MM'), 'Fee HML', 'gasto', 'financiero', 'fee_hml', p.fee, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.fee,0) > 0 and p.fecha is not null
  -- 🔴 SERVICIO DE DEUDA: cuota mensual del banco tras el refi
  union all
  select p.fecha_ref30, to_char(p.fecha_ref30,'YYYY-MM'), 'Pago refi 30 años (banco)', 'gasto', 'financiero', 'servicio_deuda', p.ref30, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.ref30,0) > 0 and p.fecha_ref30 is not null
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
  -- RENTAS: gastos operativos por ítem — mes = billing_ym (misma regla)
  union all
  select coalesce(e.expense_date, (e.billing_ym || '-01')::date),
         coalesce(e.billing_ym, to_char(e.expense_date,'YYYY-MM')),
         'Gasto ' || coalesce(nullif(e.category,''), 'operativo') || coalesce(' · ' || nullif(e.description,''), ''),
         'gasto', 'operativo', null, e.amount, 'Rentas:pm_expenses', e.invoice_url
    from ok, pm_properties pp
    join pm_expenses e on e.property_id = pp.id and e.active
    where pp.property_id = pid and pp.active and coalesce(e.amount,0) > 0
      -- la hipoteca/cuota del banco YA entra desde ff_hml_payments (fecha real) — acá se excluye para no duplicar
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
  'Ledger "movimiento del dinero" por casa — una definición para admin y portal. `mes` = mes CONTABLE (billing_ym en Rentas, regla dura; mes de la fecha en el resto). subcategoria=''servicio_deuda'' marca el pago mensual de deuda (interés HML + cuota refi 30a) para sumarlo aparte sin consultar otra fuente; sigue siendo categoria=''financiero'' → P&L NO (no afecta el NOI).';

-- ── 2) inv_dist_auto: el cálculo de la distribución del mes, LEYENDO EL LEDGER ────────
-- SECURITY INVOKER a propósito: el guard vive dentro de inv_ledger (que sí es DEFINER) y
-- se evalúa con la identidad de quien llama. Además exige área fix-flip explícitamente.
create or replace function public.inv_dist_auto(p_property_id uuid, p_billing_ym text)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_renta numeric; v_oper numeric; v_deuda numeric; v_neto numeric;
  v_n_renta int; v_n_oper int; v_n_deuda int;
  v_invs jsonb; v_hay boolean; v_dups jsonb; v_casa text; v_pct_total numeric;
begin
  if not public.has_area('fix-flip') then raise exception 'no autorizado'; end if;

  -- ÚNICA lectura de datos financieros: el mismo ledger que ve el admin, filtrado al mes.
  select coalesce(sum(monto) filter (where categoria = 'renta'      and tipo = 'ingreso'), 0),
         coalesce(sum(monto) filter (where categoria = 'operativo'  and tipo = 'gasto'),   0),
         coalesce(sum(monto) filter (where subcategoria = 'servicio_deuda'),               0),
         count(*) filter (where categoria = 'renta'     and tipo = 'ingreso'),
         count(*) filter (where categoria = 'operativo' and tipo = 'gasto'),
         count(*) filter (where subcategoria = 'servicio_deuda')
    into v_renta, v_oper, v_deuda, v_n_renta, v_n_oper, v_n_deuda
    from public.inv_ledger(p_property_id)
   where mes = p_billing_ym;

  v_neto := round(v_renta - v_oper - v_deuda, 2);

  -- reparto por CADA inversionista de la casa ("Casas & reparto")
  select coalesce(jsonb_agg(jsonb_build_object(
           'investor_airtable_id', h.investor_airtable_id,
           'reparto_pct', pct,
           'monto', round(v_neto * pct, 2)
         ) order by pct desc), '[]'::jsonb)
    into v_invs
    from (select investor_airtable_id,
                 case when reparto_pct > 1 then reparto_pct / 100.0 else coalesce(reparto_pct, 0) end as pct
            from inv_holdings where property_id = p_property_id and active) h;
  -- "tiene reparto" NO es "tiene filas": 7 de 26 holdings están en 0% (ej. Dove Springs).
  -- Con 0% el reparto no está configurado y hay que decirlo, no crear distribuciones de $0.
  select coalesce(sum((x->>'reparto_pct')::numeric), 0) into v_pct_total from jsonb_array_elements(v_invs) x;
  v_hay := v_pct_total > 0;

  -- ya existe una automática para esta casa+mes (evitar duplicar)
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

comment on function public.inv_dist_auto(uuid, text) is
  'Distribución automática del mes por casa. Lee EXACTAMENTE los movimientos de inv_ledger (una fuente): neto = renta − gastos operativos − servicio de deuda; reparto = neto × reparto_pct de cada inversionista en inv_holdings. Solo CALCULA y devuelve el desglose — no escribe ni transfiere nada.';

-- ── 3) inv_dist_calc queda DEPRECADA (no se dropea: distribuciones viejas la referencian
--      en su calc_meta con la línea pm_fee). La UI ya no la llama.
comment on function public.inv_dist_calc(uuid, text, text) is
  'DEPRECADA (06-ago-2026) — reemplazada por inv_dist_auto(), que lee del Ledger en vez de recalcular en paralelo. Diferencias: inv_dist_calc restaba un PM fee del 4% modelado (no es un gasto real de pm_expenses) y NO restaba el interés del HML (solo ref30). Se conserva para poder releer el calc_meta de las distribuciones creadas antes de esa fecha.';
