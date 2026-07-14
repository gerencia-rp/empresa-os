-- ══════════════════════════════════════════════════════════════════════════
-- v_inversionistas — ranking de CO-INVERSIONISTAS ACTIVOS (rediseño módulo Inversionistas, 14-jul)
--
-- Regla de participación viva ("Porcentaje de Owner Ship" = lo que NOSOTROS tenemos):
--   ownership = 100%  → le compramos su parte → el inversionista YA NO participa en esa casa → fuera.
--   0 < ownership < 100% → sociedad viva → entra.
--   ownership = 0 (Prestación de Servicios como Operador, sin capital) → NO es co-inversión → fuera.
-- Casas VENDIDAS con sociedad = "salida realizada": se listan en el detalle del inversionista con su
-- utilidad entregada, pero NO suman al capital desplegado (ese capital ya salió).
-- Un inversionista aparece solo si le queda ≥1 casa viva no vendida.
--
-- Capital = capital_aportado (fldrePoqg3C3caiZ5 puro, sync v14) con fallback a capital_inversionista.
-- Rentabilidad HONESTA (jamás inventar):
--   · rentada / rentada_y_refinanciada con renta Y gastos en Airtable →
--       flujo anual del inversionista = (1 − ownership) × (renta − gastos) × 12 → % sobre su capital.
--   · vendida → utilidad_entregada / capital.
--   · sin dato (renta o gastos faltantes, en obra, adquirida) → NULL = "pendiente de dato" en la UI.
-- ══════════════════════════════════════════════════════════════════════════
create or replace view v_inversionistas as
with socios as (
  select trim(rid.rec) as inv_rec,
    d.address, d.property_id, d.stage, d.estrategia,
    x.cap as capital,
    round((1 - x.own) * 100) as participacion_pct,
    (d.stage = 'vendida') as salida,
    d.renta_mensual, d.gastos_mensuales, d.utilidad_entregada,
    case when d.stage in ('rentada','rentada_y_refinanciada')
              and d.renta_mensual is not null and d.gastos_mensuales is not null
         then round((1 - x.own) * (d.renta_mensual - d.gastos_mensuales) * 12, 2)
    end as flujo_anual_inv,
    case when d.stage = 'vendida' and x.cap > 0 and d.utilidad_entregada is not null
           then round(d.utilidad_entregada / x.cap * 100, 1)
         when d.stage in ('rentada','rentada_y_refinanciada') and x.cap > 0
              and d.renta_mensual is not null and d.gastos_mensuales is not null
           then round(((1 - x.own) * (d.renta_mensual - d.gastos_mensuales) * 12) / x.cap * 100, 1)
    end as rentab_pct
  from ff_deals d
  cross join lateral (
    select case when d.ownership_pct > 1 then d.ownership_pct / 100 else d.ownership_pct end as own,
           coalesce(d.capital_aportado, d.capital_inversionista) as cap
  ) x
  cross join lateral unnest(string_to_array(d.investor_rec_ids, ',')) as rid(rec)
  where d.active and x.own > 0 and x.own < 1
)
select
  i.name  as inversionista,
  i.airtable_id as inv_rec,
  count(*) filter (where not s.salida) as casas_vivas,
  count(*) filter (where s.salida) as salidas,
  sum(s.capital) filter (where not s.salida) as capital_desplegado,
  -- rentabilidad agregada SOLO sobre casas vivas con dato (base = el capital de ESAS casas)
  sum(s.flujo_anual_inv) filter (where not s.salida) as flujo_anual_inv,
  case when sum(s.capital) filter (where not s.salida and s.rentab_pct is not null) > 0
       then round(sum(s.flujo_anual_inv) filter (where not s.salida)
                  / sum(s.capital) filter (where not s.salida and s.rentab_pct is not null) * 100, 1)
  end as rentab_pct,
  count(*) filter (where not s.salida and s.rentab_pct is null) as casas_sin_dato,
  jsonb_agg(jsonb_build_object(
    'address', s.address, 'property_id', s.property_id, 'stage', s.stage,
    'capital', s.capital, 'participacion_pct', s.participacion_pct, 'salida', s.salida,
    'flujo_anual_inv', s.flujo_anual_inv, 'rentab_pct', s.rentab_pct,
    'utilidad_entregada', s.utilidad_entregada
  ) order by s.salida, s.capital desc nulls last) as casas
from socios s
join ff_investors i on i.airtable_id = s.inv_rec and i.active
group by i.name, i.airtable_id
having count(*) filter (where not s.salida) > 0
order by capital_desplegado desc nulls last, casas_vivas desc;

alter view v_inversionistas set (security_invoker = on);
comment on view v_inversionistas is 'Ranking de co-inversionistas con participación viva (0<ownership<100, no vendida). Capital = capital_aportado puro. Vendidas = salida realizada (no suman). security_invoker: hereda RLS ff_* (has_area fix-flip).';
