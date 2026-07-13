-- ════════════════════════════════════════════════════════════════
-- O1 fix · v_pnl_casa performante — la versión original usaba 6 subqueries correlacionadas por
-- fila (la neta recalculaba 3) y bajo RLS authenticated se iba a timeout con select *.
-- Misma semántica, agregaciones una sola vez por CTE.
-- ════════════════════════════════════════════════════════════════
create or replace view public.v_pnl_casa as
with rentas as (
  select pp.property_id, round(sum(pay.amount)::numeric, 2) as ingresos
  from public.pm_payments pay
  join public.pm_properties pp on pp.id = pay.property_id
  where pay.active and pay.type = 'ingreso' and pay.status = 'pagado' and pp.property_id is not null
  group by 1
), gastos as (
  select pp.property_id, round(sum(e.amount)::numeric, 2) as gastos
  from public.pm_expenses e
  join public.pm_properties pp on pp.id = e.property_id
  where e.active and pp.property_id is not null
  group by 1
), interes as (
  select hp.address_norm, round(sum(hp.pago_hml)::numeric, 2) as interes_real
  from public.ff_hml_payments hp where hp.active
  group by 1
), prorrateo as (
  select l.address_norm, round(sum(
      l.monto_hml * (case when coalesce(l.tasa_pct, 0) > 1 then l.tasa_pct / 100.0 else coalesce(l.tasa_pct, 0) end)
      * greatest(0, (least(current_date, coalesce(l.fecha_vencimiento, current_date)) - l.fecha_inicio)) / 365.0
    )::numeric, 2) as interes_teorico_capped,
    round(sum(
      l.monto_hml * (case when coalesce(l.tasa_pct, 0) > 1 then l.tasa_pct / 100.0 else coalesce(l.tasa_pct, 0) end)
      * greatest(0, (current_date - l.fecha_inicio)) / 365.0
    )::numeric, 2) as interes_teorico_hoy
  from public.ff_hml_loans l
  where l.active and l.fecha_inicio is not null
  group by 1
)
select
  d.property_id, split_part(d.address, ',', 1) as casa, d.stage as etapa,
  coalesce(r.ingresos, 0)                          as ingresos_renta,
  coalesce(g.gastos, 0)                            as gastos_operativos,
  coalesce(i.interes_real, 0)                      as interes_hml_real,
  -- prorrateado días×tasa: hasta hoy; si la casa refinanció/vendió, hasta el vencimiento (sin fecha de refi en el espejo)
  case when d.stage like '%refinanciad%' or d.stage = 'vendida'
       then coalesce(p.interes_teorico_capped, 0) else coalesce(p.interes_teorico_hoy, 0) end as interes_hml_prorrateado,
  coalesce(r.ingresos, 0) - coalesce(g.gastos, 0) - coalesce(i.interes_real, 0) as utilidad_neta_post_interes
from public.ff_deals d
left join rentas r on r.property_id = d.property_id
left join gastos g on g.property_id = d.property_id
left join interes i on i.address_norm = d.address_norm
left join prorrateo p on p.address_norm = d.address_norm
where d.active and d.property_id is not null;
alter view public.v_pnl_casa set (security_invoker = on);
