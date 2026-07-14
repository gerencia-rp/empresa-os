-- ════════════════════════════════════════════════════════════════
-- CC FF rediseño (14-jul) · PORTAFOLIO DEL CEO — la regla única, en la capa de vistas.
-- Portafolio = Propiedades con modelo_negocio ≠ Operador Y stage ≠ vendida. Valor = ARV completo.
-- Verificado contra data viva: 23 casas · $9,415,000 = $11,450,000 − $1,300,000 (operador) − $735,000 (vendidas)
--   · Capitol déficit −$37,963.76 · flujo op +$179,289/año · neto después de deuda −$363,406/año.
-- GUARDRAIL: draws vacíos con evidencia de obra → faltan_draws=true (JAMÁS déficit rojo falso: Wellington/Charles/Slaughter).
-- Déficit = [Total Draws − Déficit Total] (fórmula Airtable fldL4iMolqEibENFj) − Down Payment (pata de la compra).
-- security_invoker=on (regla dura). Rollback: drop view v_ff_portafolio_kpi; drop view v_ff_portafolio;
-- ════════════════════════════════════════════════════════════════
drop view if exists public.v_ff_portafolio_kpi;
drop view if exists public.v_ff_portafolio;
create view public.v_ff_portafolio as
select
  d.property_id,
  split_part(d.address, ',', 1) as casa,
  d.address_norm,
  d.stage,
  d.estrategia,                                   -- palabra COMPLETA (Fix and hold / Fix and flip / Wholesale)
  d.modelo_negocio,
  (coalesce(d.modelo_negocio, '') not ilike '%operador%' and d.stage <> 'vendida') as es_portafolio,
  case when coalesce(d.modelo_negocio, '') ilike '%operador%' then 'operador'
       when d.stage = 'vendida' then 'vendida' end as motivo_exclusion,
  d.arv,
  d.purchase_price as compra,
  dr.total_draws,
  -- guardrail: draws en 0 con evidencia de obra (fórmula ≠ 0, rehab estimada o etapa avanzada) = DATO FALTANTE
  (coalesce(dr.total_draws, 0) = 0 and (
      coalesce(dr.draws_menos_deficit, 0) <> 0
      or coalesce(d.remodel_est, 0) > 0
      or d.stage in ('en_rehab', 'rentada', 'rentada_y_refinanciada', 'vendida')
  )) as faltan_draws,
  -- all-in = compra + Total Draws desembolsados (NO compra+rehab); fallback rotulado si no hay draws
  case when coalesce(dr.total_draws, 0) > 0 then d.purchase_price + dr.total_draws
       when coalesce(dr.remodel_complete, 0) > 0 then d.purchase_price + dr.remodel_complete end as all_in,
  case when coalesce(dr.total_draws, 0) > 0 then 'compra + draws'
       when coalesce(dr.remodel_complete, 0) > 0 then 'compra + rehab real (sin draws)' end as all_in_fuente,
  case when coalesce(dr.total_draws, 0) > 0 and d.arv > 0 then d.arv - (d.purchase_price + dr.total_draws) end as margen,
  dr.draws_menos_deficit,
  h.down_payment,
  -- déficit del CEO: [Total Draws − Déficit Total] − Down Payment — NULL si faltan draws (jamás rojo falso)
  case when coalesce(dr.total_draws, 0) > 0 and dr.draws_menos_deficit is not null
       then dr.draws_menos_deficit - coalesce(h.down_payment, 0) end as deficit,
  -- deuda (stock): refinanciada → saldo Refi; si no → saldo HML
  case when coalesce(h.monto_prestamo_refi, 0) > 0 then h.monto_prestamo_refi else h.monto_hml end as deuda,
  case when coalesce(h.monto_prestamo_refi, 0) > 0 then 'refi' when h.monto_hml is not null then 'hml' end as deuda_tipo,
  -- flujo (mensual): operativo y después de deuda (pago = hml + ref30; ninguna casa tiene ambos)
  case when d.renta_mensual is not null or d.gastos_mensuales is not null
       then coalesce(d.renta_mensual, 0) - coalesce(d.gastos_mensuales, 0) end as flujo_mes,
  (coalesce(d.hml_payment, 0) + coalesce(d.ref30_payment, 0)) as pago_deuda_mes
from public.ff_deals d
left join public.ff_draws dr on dr.address_norm = d.address_norm and dr.active
left join public.ff_hml_loans h on h.address_norm = d.address_norm and h.active
where d.active;
alter view public.v_ff_portafolio set (security_invoker = on);

create view public.v_ff_portafolio_kpi as
select
  count(*) filter (where es_portafolio)                                        as casas_portafolio,
  sum(arv) filter (where es_portafolio)                                        as valor_portafolio,
  sum(deuda) filter (where es_portafolio)                                      as deuda_portafolio,
  sum(arv) filter (where es_portafolio) - coalesce(sum(deuda) filter (where es_portafolio), 0) as equity_portafolio,
  round(sum(flujo_mes * 12) filter (where es_portafolio))                      as flujo_operativo_anual,
  round(sum((coalesce(flujo_mes, 0) - pago_deuda_mes) * 12) filter (where es_portafolio)) as neto_despues_deuda_anual,
  round(sum(deficit) filter (where es_portafolio and not faltan_draws)::numeric, 2) as deficit_acumulado,
  count(*) filter (where faltan_draws)                                         as casas_sin_draws,
  count(*) filter (where stage <> 'adquirida')                                 as casas_hechas,
  count(*) filter (where not es_portafolio)                                    as entregadas_inversionista,
  count(*) filter (where es_portafolio and stage in ('rentada', 'rentada_y_refinanciada')) as port_en_renta,
  count(*) filter (where es_portafolio and stage = 'en_rehab')                 as port_en_rehab,
  count(*) filter (where es_portafolio and stage = 'adquirida')                as port_adquiridas
from public.v_ff_portafolio;
alter view public.v_ff_portafolio_kpi set (security_invoker = on);
