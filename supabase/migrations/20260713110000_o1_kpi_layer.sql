-- ════════════════════════════════════════════════════════════════
-- O1 · CAPA ÚNICA DE KPIs (auditoría 2026-07-13, P1) — ADITIVA, rollback al pie.
-- El ÚNICO lugar donde vive cada fórmula. Todos los tiles leen de acá; PROHIBIDO recalcular en el front.
-- Todas las vistas con security_invoker=on (regla RLS del proyecto) y key-eadas por property_id.
-- Números verificados contra fuente (13-jul): equity aportado $963,597.63 (Airtable) / $728,361 (espejo QBO,
-- stale — se re-sincroniza en 1.5) · obras 26/7 en curso · utilidad finalizadas $170,682 · ingreso finalizadas
-- $1,466,360 (margen 11.6%) · ocupación Airtable 48 rentables = 45 Ocupada + 3 Mantenimiento + 0 disponibles.
-- ════════════════════════════════════════════════════════════════

-- ─── DATA FIX prerequisito (soft-delete, reversible): 45 filas stale de pm_units cuyos recIds
--     YA NO existen en Airtable 🚪 Unidades (verificado contra la tabla viva el 13-jul: son 54 records).
--     Sin esto la ocupación del espejo da 46/50 en vez de 45/0. Los recIds vivos se preservan.
update public.pm_units set active = false, archived_at = now()
where active and external_id like 'unit-rec%'
  and replace(external_id, 'unit-', '') not in (
  'rec0DNIy0aZp8MRQv','rec0IzMUguHwUfYEA','rec1SYUUgvLQReo5N','rec2Ix4V7pCo0ftyl','rec2XNYncq1Z11Sky',
  'rec4oqqSTvT2uJvTH','rec4uhcSzatvKVbEv','rec5PTa8KYkwB1QHx','rec6UecNt1kuHPB6h','rec6ezYsychIYKGkD',
  'rec73QTt8I2W6gcTm','rec7V4rJnbLeOnsWr','rec8OjH5LOeGgiI85','recAqVaGraAdi60VB','recBPtSD83HQ91iTE',
  'recBShmn4oI1M49US','recC27SKCU4JSYroe','recFjVhYyansJAUXN','recHSiylYeRgSogT5','recICoOr5Xy7dY4TW',
  'recNfMnf0pxTcGloC','recPkoaTjQeGsePnU','recPpqGVsDq2ml4um','recR6wcP88nqzPRr6','recRTX5i7GCjehCQE',
  'recUpFXvkdBQEyhYm','recWAyQrmp3H13a3i','recWQFFvg7SeZlAyh','recXSo57Yd1M8mWoy','recZc41nn1ngRDzQf',
  'recddtSHxf5OC0xtI','receKPYKcsMAKUG1x','recepK8fc1qWrOwda','receq1Qw1j97aZKYO','rechQJfIjrriVkD2I',
  'reci4qg0bdYflS7mU','reciV7SPaogJhRQh9','recjL1S2tcA0vKLkM','recpGGfOsLr3oGaCC','recpUVFyULbJB8lQy',
  'recpWrdLNFgmkSd2r','recpYHxVpRgBd4veV','recqxcHu6rC0nMViu','recsr86TU88MNAirl','rectW92xbAHk0ZgFG',
  'recumjwyYn9B8R5VL','recvDw5RQDHAOSKZ1','recwKEvbkjJUL6Snq','recxXvR8ubzS50SAz','recxaiV9H2Y8XvYOq',
  'reczBi7KqkTfZK3P0','reczfVD6AtyfWWOxo','reczqC40mo4ssxxKm','reczsTK5kN2fvDwvX');

-- ─── v_capital_deployed: EQUITY (capital aportado) separado de DEUDA (HML). ───
--     NUNCA sumar apalancamiento como "capital". Una fila, cada cifra con su fuente en el nombre.
create or replace view public.v_capital_deployed as
select
  (select round(coalesce(sum(capital_aportado),0)::numeric,2) from public.ff_investors where active)  as equity_comprometido_airtable,
  (select round(coalesce(sum(capital_pagado),0)::numeric,2)   from public.ff_investors where active)  as equity_pagado_airtable,
  (select max(value) from public.qb_report_cache where report='balance' and label='Investor Contributions') as equity_qbo,
  (select round(coalesce(sum(monto_hml),0)::numeric,2) from public.ff_hml_loans where active)         as deuda_hml_os_activa,
  (select max(value) from public.qb_report_cache where report='balance' and label='Loan Payable – HML')     as deuda_hml_qbo,
  (select max(value) from public.qb_report_cache where report='balance' and label like 'Loan Payable%Refin%') as deuda_refi_qbo,
  (select max(fetched_at) from public.qb_report_cache where report='balance')                          as qbo_as_of;
alter view public.v_capital_deployed set (security_invoker = on);

-- ─── v_property_360: una fila por casa (key = property_id) ───
--     equity = ARV − all_in · avance del PLANNER (avance_real), NO el legacy · líder con nombre resuelto.
create or replace view public.v_property_360 as
select
  d.property_id,
  d.address,
  split_part(d.address, ',', 1)                       as casa,
  d.stage                                             as etapa,
  d.purchase_price                                    as compra,
  dr.remodel_complete                                 as rehab_real,
  case when d.purchase_price is not null or dr.remodel_complete is not null
       then coalesce(d.purchase_price,0) + coalesce(dr.remodel_complete,0) end as all_in,
  d.arv,
  case when d.arv is not null and (d.purchase_price is not null or dr.remodel_complete is not null)
       then d.arv - (coalesce(d.purchase_price,0) + coalesce(dr.remodel_complete,0)) end as equity,
  r.avance_real                                       as avance_planner,
  (select string_agg(coalesce(n.name, t.rid), ', ')
     from unnest(string_to_array(replace(r.lider,' ',''), ',')) as t(rid)
     left join public.airtable_record_names n on n.record_id = t.rid)  as lider,
  (select round(coalesce(sum(hp.pago_hml),0)::numeric,2) from public.ff_hml_payments hp
     where hp.active and hp.address_norm = d.address_norm)             as interes_hml_acumulado
from public.ff_deals d
left join public.ff_draws dr on dr.active and dr.address_norm = d.address_norm
left join public.remodel_at_properties r on r.active and r.property_id = d.property_id
where d.active;
alter view public.v_property_360 set (security_invoker = on);

-- ─── v_obras (26 desde tblw28KVOUcCAKZBU vía espejo) + v_obras_kpi (roll-up único) ───
create or replace view public.v_obras as
select property_id, address, proceso,
  (coalesce(proceso,'') <> 'Finalizado')  as en_curso,
  ganancia as utilidad, valor_interno as ingreso, gasto_materiales, gasto_trabajadores,
  presupuesto_interno, monto_real, avance_real as avance_planner, lider, fecha_inicio, fecha_real_fin
from public.remodel_at_properties where active;
alter view public.v_obras set (security_invoker = on);

create or replace view public.v_obras_kpi as
select count(*) as obras_total,
  count(*) filter (where en_curso)                                  as obras_en_curso,
  count(*) filter (where not en_curso)                              as obras_finalizadas,
  round(sum(utilidad) filter (where not en_curso))                  as utilidad_realizada,
  round(sum(ingreso)  filter (where not en_curso))                  as ingreso_finalizadas,
  -- margen PONDERADO Σutilidad/Σingreso (B9: jamás promediar %; excluir denominador ≤ 0)
  round(100.0 * sum(utilidad) filter (where not en_curso and coalesce(ingreso,0) > 0)
        / nullif(sum(ingreso) filter (where not en_curso and coalesce(ingreso,0) > 0), 0), 1) as margen_pct
from public.v_obras;
alter view public.v_obras_kpi set (security_invoker = on);

-- ─── v_ocupacion: LA definición de ocupación (48 rentables = 45 ocupadas + 3 mantenimiento). ───
--     Rentable = unidad del Modelo Nuevo (unit-rec…) CON tipo definido (las 6 filas vacías de
--     Airtable NO son rentables). "Libres" jamás incluye Mantenimiento (B13).
create or replace view public.v_ocupacion as
with u as (
  select * from public.pm_units
  where active and external_id like 'unit-rec%' and unit_type is not null
)
select count(*) as unidades_rentables,
  count(*) filter (where status = 'ocupada')        as ocupadas,
  count(*) filter (where status = 'mantenimiento')  as mantenimiento,
  count(*) filter (where status = 'disponible')     as disponibles,
  count(*) filter (where status = 'reservada')      as reservadas,
  round(100.0 * count(*) filter (where status = 'ocupada') / nullif(count(*),0), 2) as ocupacion_pct
from u;
alter view public.v_ocupacion set (security_invoker = on);

-- ─── v_pnl_casa: P&L por casa con interés HML visible (real Σpagos + prorrateado días×tasa) ───
create or replace view public.v_pnl_casa as
select
  d.property_id, split_part(d.address, ',', 1) as casa, d.stage as etapa,
  (select round(coalesce(sum(pay.amount),0)::numeric,2) from public.pm_payments pay
     join public.pm_properties pp on pp.id = pay.property_id
     where pay.active and pay.type='ingreso' and pay.status='pagado' and pp.property_id = d.property_id) as ingresos_renta,
  (select round(coalesce(sum(e.amount),0)::numeric,2) from public.pm_expenses e
     join public.pm_properties pp on pp.id = e.property_id
     where e.active and pp.property_id = d.property_id)                                                  as gastos_operativos,
  (select round(coalesce(sum(hp.pago_hml),0)::numeric,2) from public.ff_hml_payments hp
     where hp.active and hp.address_norm = d.address_norm)                                               as interes_hml_real,
  (select round(coalesce(sum(
        -- tasa: Airtable percent llega como fracción (0.105); si viniera >1 es porcentaje
        l.monto_hml * (case when coalesce(l.tasa_pct,0) > 1 then l.tasa_pct/100.0 else coalesce(l.tasa_pct,0) end)
        -- días en hold: hasta hoy; si la casa ya refinanció/vendió, hasta el vencimiento del HML
        -- (no hay fecha de refi en el espejo — límite honesto, documentado)
        * greatest(0, (case when d.stage like '%refinanciad%' or d.stage = 'vendida'
                            then least(current_date, coalesce(l.fecha_vencimiento, current_date))
                            else current_date end - l.fecha_inicio)) / 365.0
      ),0)::numeric,2)
     from public.ff_hml_loans l where l.active and l.address_norm = d.address_norm and l.fecha_inicio is not null) as interes_hml_prorrateado,
  -- utilidad NETA post-interés (el ROI real por casa — N1)
  (select round(coalesce(sum(pay.amount),0)::numeric,2) from public.pm_payments pay
     join public.pm_properties pp on pp.id = pay.property_id
     where pay.active and pay.type='ingreso' and pay.status='pagado' and pp.property_id = d.property_id)
  - (select round(coalesce(sum(e.amount),0)::numeric,2) from public.pm_expenses e
     join public.pm_properties pp on pp.id = e.property_id
     where e.active and pp.property_id = d.property_id)
  - (select round(coalesce(sum(hp.pago_hml),0)::numeric,2) from public.ff_hml_payments hp
     where hp.active and hp.address_norm = d.address_norm)                                               as utilidad_neta_post_interes
from public.ff_deals d
where d.active and d.property_id is not null;
alter view public.v_pnl_casa set (security_invoker = on);

-- ─── ROLLBACK ───
-- drop view if exists public.v_pnl_casa; drop view if exists public.v_ocupacion;
-- drop view if exists public.v_obras_kpi; drop view if exists public.v_obras;
-- drop view if exists public.v_property_360; drop view if exists public.v_capital_deployed;
-- update public.pm_units set active=true, archived_at=null where archived_at::date = '2026-07-13' and external_id like 'unit-rec%';
