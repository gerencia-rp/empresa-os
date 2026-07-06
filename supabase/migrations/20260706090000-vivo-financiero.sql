-- Parte C: seguimiento financiero en tiempo real por obra. Recrea v_remodel_avance_vivo (v3).
DROP VIEW IF EXISTS public.v_remodel_avance_vivo;
CREATE VIEW public.v_remodel_avance_vivo AS
WITH plan AS (
  SELECT property_id, min(date) ini, max(date) fin, greatest(1, max(date) - min(date)) dias_totales
  FROM public.weekly_activities
  WHERE property_id IS NOT NULL AND status <> 'cancelled'
  GROUP BY property_id
)
SELECT
  r.airtable_id, r.property_id, r.address, r.proceso,
  pr.done, pr.total,
  round(coalesce(pr.avance_real, 0)) pct_tecnico,          -- avance TÉCNICO (ponderado si hay pesos)
  pr.metodo,
  pc.presupuesto, round(coalesce(pc.total_real, 0)) gasto_real,
  pc.pct_gastado pct_financiero,                            -- avance FINANCIERO = gasto/presupuesto (C2)
  plan.ini fecha_ini, plan.fin fecha_fin_plan, plan.dias_totales,
  CASE WHEN plan.fin > plan.ini THEN least(100, greatest(0, round(100.0 * (current_date - plan.ini) / plan.dias_totales))) ELSE NULL END pct_temporal,
  greatest(0, current_date - plan.fin) dias_pasados_fin,
  CASE WHEN pc.presupuesto > 0 AND plan.fin > plan.ini
    THEN round(pc.presupuesto * least(1, greatest(0, (current_date - plan.ini)::numeric / plan.dias_totales))) ELSE NULL END costo_proyectado,
  -- FINANZAS PROYECTADAS: valor que cobra Structure One vs costo proyectado al 100%
  r.monto_real valor_remodelacion,
  CASE WHEN coalesce(pr.avance_real, 0) >= 5 AND coalesce(pc.total_real, 0) > 0
    THEN round(pc.total_real / (pr.avance_real / 100.0))
    ELSE pc.presupuesto END costo_proyectado_100,
  CASE WHEN r.monto_real > 0 THEN
    r.monto_real - (CASE WHEN coalesce(pr.avance_real, 0) >= 5 AND coalesce(pc.total_real, 0) > 0
      THEN round(pc.total_real / (pr.avance_real / 100.0)) ELSE coalesce(pc.presupuesto, 0) END)
    ELSE NULL END ganancia_proyectada,
  CASE WHEN coalesce(pc.total_real, 0) > 0 AND r.monto_real > 0 THEN
    round(100.0 * (r.monto_real - (CASE WHEN coalesce(pr.avance_real, 0) >= 5
      THEN round(pc.total_real / (pr.avance_real / 100.0)) ELSE coalesce(pc.presupuesto, pc.total_real) END)) / nullif(pc.total_real, 0))
    ELSE NULL END roi_proyectado_pct,
  -- D: cruces (umbral config)
  CASE WHEN pc.pct_gastado IS NOT NULL AND pc.pct_gastado > round(coalesce(pr.avance_real, 0)) + (SELECT value FROM public.remodel_forecast_params WHERE key = 'alerta_sobrecosto_pct')
    THEN true ELSE false END sobrecosto_vs_tecnico,
  CASE WHEN plan.fin > plan.ini AND pr.total > 0
    THEN greatest(0, least(100, round(100.0 * (current_date - plan.ini) / plan.dias_totales)) - round(coalesce(pr.avance_real, 0)))
    ELSE NULL END atraso_pts,
  CASE WHEN plan.fin > plan.ini AND pr.total > 0
    THEN round(greatest(0, least(100, round(100.0 * (current_date - plan.ini) / plan.dias_totales)) - round(coalesce(pr.avance_real, 0))) * plan.dias_totales / 100.0)
    ELSE NULL END atraso_dias,
  CASE WHEN plan.fin > plan.ini AND pr.total > 0
    AND (least(100, greatest(0, round(100.0 * (current_date - plan.ini) / plan.dias_totales))) - round(coalesce(pr.avance_real, 0)))
        > (SELECT value FROM public.remodel_forecast_params WHERE key = 'alerta_retraso_pts')
    THEN true ELSE false END atrasada_cronograma,
  -- compat: alias de columnas previas
  round(coalesce(pr.avance_real, 0)) pct_tareas,
  pc.pct_gastado pct_plata,
  CASE WHEN plan.fin > plan.ini THEN least(100, greatest(0, round(100.0 * (current_date - plan.ini) / plan.dias_totales))) ELSE NULL END pct_dias,
  CASE WHEN plan.fin > plan.ini THEN least(100, greatest(0, round(100.0 * (current_date - plan.ini) / plan.dias_totales))) ELSE NULL END pct_esperado,
  CASE
    WHEN pc.presupuesto IS NULL OR pc.presupuesto = 0 THEN 'gris'
    WHEN plan.fin IS NULL OR plan.fin <= plan.ini THEN 'gris'
    WHEN coalesce(pc.total_real, 0) <= pc.presupuesto * least(1, greatest(0.02, (current_date - plan.ini)::numeric / plan.dias_totales)) * (1 + (SELECT value / 100 FROM public.remodel_forecast_params WHERE key = 'alerta_sobrecosto_pct')) THEN 'verde'
    WHEN coalesce(pc.total_real, 0) <= pc.presupuesto * least(1, greatest(0.02, (current_date - plan.ini)::numeric / plan.dias_totales)) * (1 + 2.5 * (SELECT value / 100 FROM public.remodel_forecast_params WHERE key = 'alerta_sobrecosto_pct')) THEN 'amarillo'
    ELSE 'rojo' END sem_costo,
  CASE
    WHEN plan.fin IS NULL OR plan.fin <= plan.ini OR pr.total IS NULL OR pr.total = 0 THEN 'gris'
    WHEN current_date > plan.fin AND coalesce(pr.avance_real, 0) < 100 THEN 'rojo'
    WHEN coalesce(pr.avance_real, 0) >= least(100, greatest(0, 100.0 * (current_date - plan.ini) / plan.dias_totales)) - (SELECT value FROM public.remodel_forecast_params WHERE key = 'alerta_retraso_pts') THEN 'verde'
    WHEN coalesce(pr.avance_real, 0) >= least(100, greatest(0, 100.0 * (current_date - plan.ini) / plan.dias_totales)) - 2.5 * (SELECT value FROM public.remodel_forecast_params WHERE key = 'alerta_retraso_pts') THEN 'amarillo'
    ELSE 'rojo' END sem_tiempo,
  CASE WHEN r.monto_real > 0 AND coalesce(pr.avance_real, 0) >= 5 AND coalesce(pc.total_real, 0) > 0
    AND r.monto_real < round(pc.total_real / (pr.avance_real / 100.0)) THEN 'rojo'
    WHEN r.monto_real > 0 THEN 'verde' ELSE 'gris' END sem_ganancia
FROM public.remodel_at_properties r
LEFT JOIN public.v_remodel_progress pr ON pr.property_id = r.property_id
LEFT JOIN public.v_remodel_presupuesto_casa pc ON pc.airtable_id = r.airtable_id
LEFT JOIN plan ON plan.property_id = r.property_id
WHERE r.active;
ALTER VIEW public.v_remodel_avance_vivo SET (security_invoker = true);
REVOKE SELECT ON public.v_remodel_avance_vivo FROM anon;
