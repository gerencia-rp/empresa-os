-- ════════════════════════════════════════════════════════════════
-- O7 · MOTOR DE SUPUESTOS CALIBRADOS (auditoría 2026-07-13, P10) — ADITIVA.
-- Los defaults salen de la HISTORIA REAL (no de números soñados): $/sqft real de obras
-- finalizadas, holding real (inicio→fin de obra), ciclo. Mata ~$250–290K de "déficit
-- fantasma" del timeline inflado (12m soñados vs ~2m reales).
-- La vista recalcula sola; aplicarla a los defaults del Estimador/UW = 1 clic HUMANO
-- (escribe ff_uw_config — gobernado, visible, editable).
-- ════════════════════════════════════════════════════════════════
create or replace view public.v_supuestos_calibrados as
select
  (select round(avg(monto / nullif(sqft,0))) from (
     select coalesce(monto_real, gasto_materiales + gasto_trabajadores) as monto, sqft
     from public.remodel_at_properties where active and proceso = 'Finalizado' and sqft > 0
   ) s where monto > 0)                                                       as psf_real,
  (select count(*) from public.remodel_at_properties where active and proceso = 'Finalizado' and sqft > 0) as psf_n,
  (select round(avg(fecha_real_fin - fecha_inicio)) from public.remodel_at_properties
     where active and fecha_inicio is not null and fecha_real_fin is not null
       and (fecha_real_fin - fecha_inicio) between 1 and 365)                 as obra_dias_prom,
  (select round(avg(fecha_real_fin - fecha_inicio) / 30.44, 1) from public.remodel_at_properties
     where active and fecha_inicio is not null and fecha_real_fin is not null
       and (fecha_real_fin - fecha_inicio) between 1 and 365)                 as obra_meses_prom,
  -- holding financiero real: inicio del HML → primera renta (meses cubiertos + hueco, ff_draws)
  (select round(avg(hml_months + (case when interest_hml > 0 and hml_months > 0
        then interest_until_rent / (interest_hml / hml_months) else 0 end)), 1)
     from public.ff_draws where active and hml_months > 0)                    as holding_meses_prom,
  now()                                                                        as calculado_al;
alter view public.v_supuestos_calibrados set (security_invoker = on);

-- ─── ROLLBACK ───
-- drop view if exists public.v_supuestos_calibrados;
