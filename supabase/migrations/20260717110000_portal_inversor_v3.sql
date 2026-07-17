-- ════════════════════════════════════════════════════════════════
-- 💎 PORTAL INVERSOR v3 (ajustes Juan 17-jul-2026)
-- 1) BUG RLS: un inversionista que ADEMÁS tiene perfil OS con área fix-flip
--    (Juan, Prueba OS) veía TODO por la rama `or has_area('fix-flip')` de las
--    policies inv_* → 23 casas y $955,846 en el portal. Regla nueva: si el
--    usuario ES inversionista (tiene inv_access activo), la rama admin NO
--    aplica — ve SOLO sus casas. El preview-admin queda para staff sin
--    identidad de inversionista. Solo policies de LECTURA (writes intactos).
-- 2) inv_param_overrides: editar un parámetro AUTO (viene de Airtable/estimado)
--    no pisa la fuente — guarda un override reversible y auditado.
-- 3) inv_access: acceso MANUAL (nombre+email sin esperar el sync de Airtable)
--    + created_by + audit inmutable (trigger trg_inv_audit ya existente).
-- Aditiva, sin DROP de datos. Reversible: recrear policies con la rama vieja.
-- ════════════════════════════════════════════════════════════════

-- ─── helper: ¿el usuario logueado ES un inversionista del portal? ───
create or replace function public.inv_is_investor()
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from inv_access
    where user_id = auth.uid() and active and estado = 'activo'
  );
$$;

-- ─── 1) policies de LECTURA estrictas (inversionista jamás usa la rama admin) ───
drop policy if exists inv_holdings_read on inv_holdings;
create policy inv_holdings_read on inv_holdings for select to authenticated
  using (investor_airtable_id in (select inv_my_ids())
      or (has_area('fix-flip') and not inv_is_investor()));

drop policy if exists inv_params_read on inv_model_params;
create policy inv_params_read on inv_model_params for select to authenticated
  using (property_id in (select inv_my_props())
      or (has_area('fix-flip') and not inv_is_investor()));

drop policy if exists inv_cashflow_read on inv_cashflow_real;
create policy inv_cashflow_read on inv_cashflow_real for select to authenticated
  using (property_id in (select inv_my_props())
      or (has_area('fix-flip') and not inv_is_investor()));

drop policy if exists inv_documents_read on inv_documents;
create policy inv_documents_read on inv_documents for select to authenticated
  using ((property_id in (select inv_my_props())
          and (investor_airtable_id is null or investor_airtable_id in (select inv_my_ids())))
      or (has_area('fix-flip') and not inv_is_investor()));

drop policy if exists inv_dist_read on inv_distributions;
create policy inv_dist_read on inv_distributions for select to authenticated
  using (investor_airtable_id in (select inv_my_ids())
      or (has_area('fix-flip') and not inv_is_investor()));

drop policy if exists inv_projection_read on inv_projection;
create policy inv_projection_read on inv_projection for select to authenticated
  using (property_id in (select inv_my_props())
      or (has_area('fix-flip') and not inv_is_investor()));

drop policy if exists inv_msg_read on inv_messages;
create policy inv_msg_read on inv_messages for select to authenticated
  using ((has_area('fix-flip') and not inv_is_investor())
      or investor_airtable_id in (select inv_my_ids())
      or (investor_airtable_id is null and property_id in (select inv_my_props())));

drop policy if exists inv_expenses_read on inv_expenses;
create policy inv_expenses_read on inv_expenses for select to authenticated
  using (property_id in (select inv_my_props())
      or (has_area('fix-flip') and not inv_is_investor()));

drop policy if exists inv_access_read on inv_access;
create policy inv_access_read on inv_access for select to authenticated
  using (user_id = auth.uid()
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or (has_area('fix-flip') and not inv_is_investor()));

-- ─── RPC del resumen del portal: misma regla (server-side, no front) ───
create or replace function public.inv_portal_resumen()
 returns table(property_id uuid, casa text, etapa text, lider text, avance_planner numeric, invertido numeric, fecha_entrada date, meses_invertido integer, ingresos_renta numeric, gastos_operativos numeric, interes_hml numeric, flujo_neto numeric, flujo_ult_mes numeric, flujo_ult_mes_ym text, deficit numeric, deficit_desglose jsonb, fecha_estimada_pago date, fecha_pago_fuente text, proxima_dist_fecha date, proxima_dist_monto numeric, ultima_dist_fecha date, ultima_dist_monto numeric)
 language sql stable security definer
 set search_path to 'public'
as $function$
  with mias as (
    -- inversionista: SOLO sus casas y SU capital (aunque tenga área fix-flip en el OS);
    -- staff sin identidad de inversionista: todas (preview admin)
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
  ), hmlx as (
    select distinct on (d.property_id) d.property_id, l.fecha_inicio, l.fecha_vencimiento, l.fecha_refi
    from ff_deals d join ff_hml_loans l on l.address_norm = d.address_norm and l.active
    where d.active and d.property_id is not null
    order by d.property_id, l.fecha_inicio desc nulls last
  ), cal as (
    select coalesce(holding_meses_prom, 6) as hold_m from v_supuestos_calibrados
  ), ultm as (
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
  left join hmlx h on h.property_id = m.property_id
  left join ultm on ultm.property_id = m.property_id
  left join dist dist on dist.property_id = m.property_id
$function$;

-- ─── inv_ledger: misma regla en el guard ───
-- (solo cambia el CTE ok; el cuerpo queda idéntico al vigente)
create or replace function public.inv_ledger(pid uuid)
 returns table(fecha date, concepto text, tipo text, categoria text, monto numeric, fuente text, comprobante text)
 language sql stable security definer
 set search_path to 'public'
as $function$
  with ok as (
    select 1 where pid in (select inv_my_props())
      or (public.has_area('fix-flip') and not public.inv_is_investor())
  ),
  d as (select * from ff_deals where active and property_id = pid limit 1)
  select d.close_date, 'Compra de la casa', 'gasto', 'inversion', d.purchase_price, 'FF:ff_deals', null::text
    from d, ok where d.close_date is not null and coalesce(d.purchase_price,0) > 0
  union all
  select coalesce(l.fecha_inicio, d.close_date), 'Gastos de cierre (compra)', 'gasto', 'inversion', l.gastos_cierre, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.gastos_cierre,0) > 0
  union all
  select coalesce(l.fecha_inicio, d.close_date), 'Desembolso Hard Money', 'ingreso', 'financiero', l.monto_hml, 'FF:ff_hml_loans', null
    from d join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(l.monto_hml,0) > 0
  union all
  select coalesce(l.fecha_inicio_rehab, d.close_date), 'Remodelación (draws — total agregado)', 'gasto', 'inversion', w.total_draws, 'FF:ff_draws', null
    from d join ff_draws w on w.active and w.address_norm = d.address_norm
    left join ff_hml_loans l on l.active and l.address_norm = d.address_norm, ok
    where coalesce(w.total_draws,0) > 0
  union all
  select p.fecha, 'Pago Hard Money (intereses)', 'gasto', 'financiero', p.pago_hml, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.pago_hml,0) > 0 and p.fecha is not null
  union all
  select p.fecha, 'Fee HML', 'gasto', 'financiero', p.fee, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.fee,0) > 0 and p.fecha is not null
  union all
  select p.fecha_ref30, 'Cuota banco (refi 30 años)', 'gasto', 'financiero', p.ref30, 'FF:ff_hml_payments', null
    from d join ff_hml_payments p on p.active and p.address_norm = d.address_norm, ok
    where coalesce(p.ref30,0) > 0 and p.fecha_ref30 is not null
  union all
  select coalesce((select min(p.fecha_ref30) from ff_hml_payments p where p.active and p.address_norm = d.address_norm and coalesce(p.ref30,0) > 0), d.close_date),
         'Cash-out del refinanciamiento', 'ingreso', 'financiero', d.cashout, 'FF:ff_deals', null
    from d, ok where coalesce(d.cashout,0) > 0
  union all
  select coalesce(pay.paid_at::date, (pay.billing_ym || '-01')::date),
         'Renta cobrada · ' || coalesce(pay.billing_ym, '') || coalesce(' · ' || nullif(pay.concept,''), ''),
         'ingreso', 'renta', pay.amount, 'Rentas:pm_payments', coalesce(pay.proof_url, pay.attachment_url)
    from ok, pm_properties pp
    join pm_payments pay on pay.property_id = pp.id and pay.active
    where pp.property_id = pid and pp.active and coalesce(pay.amount,0) > 0 and pay.status in ('pagado','paid','completado')
  union all
  select coalesce(e.expense_date, (e.billing_ym || '-01')::date),
         'Gasto ' || coalesce(nullif(e.category,''), 'operativo') || coalesce(' · ' || nullif(e.description,''), ''),
         'gasto', 'operativo', e.amount, 'Rentas:pm_expenses', e.invoice_url
    from ok, pm_properties pp
    join pm_expenses e on e.property_id = pp.id and e.active
    where pp.property_id = pid and pp.active and coalesce(e.amount,0) > 0
      and coalesce(e.description,'') !~* 'hipoteca' and coalesce(e.category,'') !~* 'hipoteca' and coalesce(e.subcategory,'') !~* 'hipoteca'
  union all
  select dt.fecha, 'Distribución al inversionista (' || dt.tipo || ')', 'gasto', 'distribucion', dt.monto, 'OS:inv_distributions', dt.k1_url
    from ok, inv_distributions dt
    where dt.active and dt.property_id = pid and dt.estado = 'pagada'
  union all
  select c.fecha, coalesce(nullif(c.concepto,''), nullif(c.item,''), c.linea),
         case when c.tipo = 'ingreso' or c.categoria = 'ingreso' then 'ingreso' else 'gasto' end,
         coalesce(nullif(c.categoria,''), 'manual'), abs(c.valor), 'OS:manual(' || coalesce(c.linea,'') || ')', c.id_factura
    from ok, inv_cashflow_real c
    where c.active and c.property_id = pid and c.fecha is not null
  order by 1
$function$;

-- ─── 2) overrides del modelo: editar un AUTO no pisa la fuente ───
create table if not exists inv_param_overrides (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  key text not null,
  valor text not null,
  valor_origen text,          -- snapshot del valor base al momento del override
  fuente_origen text,         -- fuente del valor base (real:ff_deals, etc.)
  tipo text not null default 'override_de_auto' check (tipo in ('manual','override_de_auto')),
  editado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  active boolean not null default true,
  archived_at timestamptz,
  unique (property_id, key)
);
alter table inv_param_overrides enable row level security;
drop policy if exists inv_overrides_read on inv_param_overrides;
create policy inv_overrides_read on inv_param_overrides for select to authenticated
  using (property_id in (select inv_my_props())
      or (has_area('fix-flip') and not inv_is_investor()));
drop policy if exists inv_overrides_write on inv_param_overrides;
create policy inv_overrides_write on inv_param_overrides for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
drop trigger if exists inv_param_overrides_audit on inv_param_overrides;
create trigger inv_param_overrides_audit before insert or update on inv_param_overrides
  for each row execute function trg_inv_audit();

-- ─── 3) acceso manual + auditoría de quién creó cada acceso ───
alter table inv_access add column if not exists nombre text;
alter table inv_access add column if not exists origen text not null default 'airtable';
alter table inv_access add column if not exists created_by text;
alter table inv_access add column if not exists updated_at timestamptz not null default now();
do $$ begin
  alter table inv_access add constraint inv_access_origen_chk check (origen in ('airtable','manual'));
exception when duplicate_object then null; end $$;
drop trigger if exists inv_access_audit on inv_access;
create trigger inv_access_audit before insert or update on inv_access
  for each row execute function trg_inv_audit();

-- ─── ediciones de parámetros también auditadas (antes no había trigger) ───
-- inv_model_params no tenía id (PK lógica = property_id+key) — el trigger genérico usa new.id
alter table inv_model_params add column if not exists id uuid default gen_random_uuid();
update inv_model_params set id = gen_random_uuid() where id is null;
drop trigger if exists inv_model_params_audit on inv_model_params;
create trigger inv_model_params_audit before insert or update on inv_model_params
  for each row execute function trg_inv_audit();

comment on table inv_param_overrides is 'Overrides manuales de inv_model_params: el valor de la fuente (Airtable/estimado) NO se pisa; efectivo = override si existe. Reversible (soft-delete) y auditado en inv_audit.';
comment on function inv_is_investor() is 'true si el usuario logueado tiene inv_access activo — con eso las policies inv_* le niegan la rama admin has_area(fix-flip): el portal muestra SOLO sus casas aunque también sea usuario del OS (bug Juan 17-jul).';

-- ─── (parche aplicado en la misma sesión) writes con la MISMA regla ───
-- Las policies FOR ALL con using(has_area) también otorgaban SELECT (permissive OR) —
-- el inversionista-con-área seguía viendo todo por esa vía. Cerrado en TODAS las inv_*:
drop policy if exists inv_holdings_write on inv_holdings;
create policy inv_holdings_write on inv_holdings for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
drop policy if exists inv_params_write on inv_model_params;
create policy inv_params_write on inv_model_params for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
drop policy if exists inv_cashflow_write on inv_cashflow_real;
create policy inv_cashflow_write on inv_cashflow_real for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
drop policy if exists inv_documents_write on inv_documents;
create policy inv_documents_write on inv_documents for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
drop policy if exists inv_dist_write on inv_distributions;
create policy inv_dist_write on inv_distributions for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
drop policy if exists inv_projection_write on inv_projection;
create policy inv_projection_write on inv_projection for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
drop policy if exists inv_msg_admin_write on inv_messages;
create policy inv_msg_admin_write on inv_messages for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
drop policy if exists inv_access_write on inv_access;
create policy inv_access_write on inv_access for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
drop policy if exists inv_expenses_write on inv_expenses;
create policy inv_expenses_write on inv_expenses for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
drop policy if exists inv_deals_admin on inv_deals;
create policy inv_deals_admin on inv_deals for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
