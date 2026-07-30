-- Distribuciones automáticas: cálculo mensual por inversionista leyendo SOLO de Supabase.
-- (Airtable = linaje; el sync ya trae todo cada 15 min. Recalcula fresco en cada clic.)

-- 1) Trazabilidad: origen (manual|automatica) + snapshot del cálculo
alter table inv_distributions add column if not exists origen text not null default 'manual';
alter table inv_distributions add column if not exists calc_meta jsonb;
comment on column inv_distributions.origen is 'manual = cargada a mano · automatica = calculada desde datos financieros de Supabase';
comment on column inv_distributions.calc_meta is 'snapshot del cálculo automático: ingresos/gastos/pm_fee/ref30/reparto_pct/ganancia_neta usados + monto final (auto o editado) + fecha del cálculo';

-- 2) Elegibilidad: qué casas están refinanciadas (fecha_refi NO nulo O stage refinanciada).
--    ff_hml_loans/ff_deals se keyean por address_norm (no property_id) → se cruza acá.
create or replace function inv_refinanced_props()
returns table(property_id uuid, refinanciada boolean, fecha_refi date, stage text)
language sql stable security definer set search_path = public as $$
  select d.property_id,
         ((select max(l.fecha_refi) from ff_hml_loans l where l.address_norm = d.address_norm and l.active) is not null
           or coalesce(d.stage,'') ilike '%refinanciada%') as refinanciada,
         (select max(l.fecha_refi) from ff_hml_loans l where l.address_norm = d.address_norm and l.active) as fecha_refi,
         d.stage
  from ff_deals d
  where d.active and d.property_id is not null and has_area('fix-flip');
$$;
grant execute on function inv_refinanced_props() to authenticated;

-- 3) Cálculo de la distribución de un (inversionista, casa, mes) — todo desde Supabase.
--    ganancia_neta = ingresos − gastos_operativos − pm_fee(4%) − ref30
--    distribucion  = ganancia_neta × reparto_pct
create or replace function inv_dist_calc(p_property_id uuid, p_investor text, p_billing_ym text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_anorm text; v_stage text; v_fecha_refi date; v_refi boolean;
  v_ing numeric; v_gas numeric; v_ref30 numeric; v_pct numeric; v_pct_found boolean;
  v_fee numeric; v_neta numeric; v_dist numeric; v_casa_en_rentas boolean;
begin
  if not has_area('fix-flip') then raise exception 'no autorizado'; end if;
  -- casa → address_norm (para cruzar los datos del HML que se keyean por dirección)
  select d.address_norm, d.stage into v_anorm, v_stage
    from ff_deals d where d.property_id = p_property_id and d.active limit 1;
  select max(l.fecha_refi) into v_fecha_refi from ff_hml_loans l where l.address_norm = v_anorm and l.active;
  v_refi := (v_fecha_refi is not null) or (coalesce(v_stage,'') ilike '%refinanciada%');
  -- ¿la casa existe en el espejo de Rentas? (para distinguir "sin datos" de "casa no linkeada")
  select exists(select 1 from pm_properties pp where pp.property_id = p_property_id and pp.active) into v_casa_en_rentas;
  -- ingresos del mes (pm_payments, cruzado por pm_properties.id — el property_id canónico vive en pm_properties)
  select coalesce(sum(pay.amount),0) into v_ing
    from pm_properties pp join pm_payments pay on pay.property_id = pp.id and pay.active
    where pp.property_id = p_property_id and pp.active and pay.billing_ym = p_billing_ym and pay.type = 'ingreso';
  -- gastos operativos de la casa (category='house'), EXCLUYENDO la hipoteca:
  -- la cuota del banco ya se resta aparte vía ref30 (ff_hml_payments) → si no se excluye acá,
  -- se contaría dos veces (mismo criterio de de-dup que la vista inv_ledger).
  select coalesce(sum(e.amount),0) into v_gas
    from pm_properties pp join pm_expenses e on e.property_id = pp.id and e.active
    where pp.property_id = p_property_id and pp.active and e.billing_ym = p_billing_ym and e.category = 'house'
      and coalesce(e.description,'') !~* 'hipoteca' and coalesce(e.subcategory,'') !~* 'hipoteca';
  -- pago hipoteca Ref30 del mes (ff_hml_payments, por fecha_ref30/fecha)
  select coalesce(sum(hp.ref30),0) into v_ref30
    from ff_hml_payments hp
    where hp.address_norm = v_anorm and hp.active
      and to_char(coalesce(hp.fecha_ref30, hp.fecha),'YYYY-MM') = p_billing_ym;
  -- % del inversionista en ESTA casa (ya es por inversionista + casa → multi-inversionista resuelto)
  select reparto_pct into v_pct from inv_holdings
    where investor_airtable_id = p_investor and property_id = p_property_id and active limit 1;
  v_pct_found := v_pct is not null;
  v_pct := coalesce(v_pct, 0);
  v_fee := round(v_ing * 0.04, 2);
  v_neta := v_ing - v_gas - v_fee - v_ref30;
  v_dist := round(v_neta * v_pct, 2);
  return jsonb_build_object(
    'refinanciada', v_refi, 'fecha_refi', v_fecha_refi, 'stage', v_stage,
    'casa_en_rentas', v_casa_en_rentas, 'address_norm', v_anorm,
    'ingresos', v_ing, 'gastos', v_gas, 'pm_fee', v_fee, 'ref30', v_ref30,
    'ganancia_neta', v_neta, 'reparto_pct', v_pct, 'reparto_encontrado', v_pct_found,
    'distribucion', v_dist, 'billing_ym', p_billing_ym, 'calc_at', now()
  );
end; $$;
grant execute on function inv_dist_calc(uuid, text, text) to authenticated;
