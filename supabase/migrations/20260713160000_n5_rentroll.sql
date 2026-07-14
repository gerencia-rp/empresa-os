-- ════════════════════════════════════════════════════════════════
-- N5 · RENT-ROLL VIVO (auditoría 2026-07-13) — ADITIVA.
-- Por casa: renta POTENCIAL (Σ target_rent de unidades rentables) vs REALIZADA (cobrado por
-- mes de renta, billing_ym del mes pasado cerrado) → GAP de vacancia/cobranza en $.
-- Expone el gap de Garden Path (~$5,000/mes). Key = property_id.
-- ════════════════════════════════════════════════════════════════
create or replace view public.v_rent_roll as
with unidades as (
  select p.property_id, p.id as pm_id, split_part(p.name, ',', 1) as casa, p.rental_model as modelo,
    count(*) as unidades,
    count(*) filter (where u.status = 'ocupada') as ocupadas,
    round(sum(coalesce(u.target_rent, 0))) as potencial,
    round(sum(coalesce(u.target_rent, 0)) filter (where u.status = 'ocupada')) as potencial_ocupado
  from public.pm_properties p
  join public.pm_units u on u.property_id = p.id and u.active and u.external_id like 'unit-rec%' and u.unit_type is not null
  where p.active and p.property_id is not null
  group by 1, 2, 3, 4
), mes as (
  select to_char(date_trunc('month', current_date) - interval '1 month', 'YYYY-MM') as ym
)
select u.property_id, u.casa, u.modelo, u.unidades, u.ocupadas, u.potencial, u.potencial_ocupado,
  (select ym from mes) as mes_renta,
  (select round(coalesce(sum(pay.amount), 0)) from public.pm_payments pay
     where pay.property_id = u.pm_id and pay.active and pay.type = 'ingreso' and pay.status = 'pagado'
       and pay.billing_ym = (select ym from mes))                            as realizada,
  u.potencial - (select round(coalesce(sum(pay.amount), 0)) from public.pm_payments pay
     where pay.property_id = u.pm_id and pay.active and pay.type = 'ingreso' and pay.status = 'pagado'
       and pay.billing_ym = (select ym from mes))                            as gap
from unidades u;
alter view public.v_rent_roll set (security_invoker = on);

-- ─── ROLLBACK ───
-- drop view if exists public.v_rent_roll;
