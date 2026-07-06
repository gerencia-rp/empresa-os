-- RM-M1: Avance de obra EN VIVO — tareas vs plata + desviación de costo y tiempo. Solo vista (aditivo).
-- Definiciones REUSADAS: avance tareas = v_remodel_progress (C-backbone) · gasto real = v_remodel_presupuesto_casa (C2).
CREATE OR REPLACE VIEW public.v_remodel_avance_vivo AS
WITH plan AS (
  SELECT property_id, min(date) ini, max(date) fin
  FROM public.weekly_activities
  WHERE property_id IS NOT NULL AND status <> 'cancelled'
  GROUP BY property_id
)
SELECT
  r.airtable_id, r.property_id, r.address, r.proceso,
  -- dimensión 1: TAREAS (definición existente)
  pr.done, pr.total, round(coalesce(pr.avance_real, 0)) pct_tareas,
  -- dimensión 2: PLATA (definición C2)
  pc.presupuesto, round(coalesce(pc.total_real, 0)) gasto_real,
  pc.pct_gastado pct_plata,
  -- cronograma (del Planner)
  plan.ini fecha_ini, plan.fin fecha_fin_plan,
  CASE WHEN plan.fin > plan.ini
    THEN least(100, greatest(0, round(100.0 * (current_date - plan.ini) / (plan.fin - plan.ini))))
    ELSE NULL END pct_dias,
  greatest(0, current_date - plan.fin) dias_pasados_fin,
  -- costo proyectado a la fecha (lineal sobre cronograma) y desviación
  CASE WHEN pc.presupuesto > 0 AND plan.fin > plan.ini
    THEN round(pc.presupuesto * least(1, greatest(0, (current_date - plan.ini)::numeric / (plan.fin - plan.ini))))
    ELSE NULL END costo_proyectado,
  -- semáforo COSTO: gasto real vs proyectado a la fecha (umbral alerta_sobrecosto_pct, C2)
  CASE
    WHEN pc.presupuesto IS NULL OR pc.presupuesto = 0 THEN 'gris'
    WHEN plan.fin IS NULL OR plan.fin <= plan.ini THEN 'gris'
    WHEN coalesce(pc.total_real, 0) <= pc.presupuesto * least(1, greatest(0.02, (current_date - plan.ini)::numeric / (plan.fin - plan.ini))) * (1 + (SELECT value / 100 FROM public.remodel_forecast_params WHERE key = 'alerta_sobrecosto_pct')) THEN 'verde'
    WHEN coalesce(pc.total_real, 0) <= pc.presupuesto * least(1, greatest(0.02, (current_date - plan.ini)::numeric / (plan.fin - plan.ini))) * (1 + 2.5 * (SELECT value / 100 FROM public.remodel_forecast_params WHERE key = 'alerta_sobrecosto_pct')) THEN 'amarillo'
    ELSE 'rojo' END sem_costo,
  -- semáforo TIEMPO: % tareas hechas vs % días transcurridos del cronograma
  CASE
    WHEN plan.fin IS NULL OR plan.fin <= plan.ini OR pr.total IS NULL OR pr.total = 0 THEN 'gris'
    WHEN current_date > plan.fin AND coalesce(pr.avance_real, 0) < 100 THEN 'rojo'
    WHEN coalesce(pr.avance_real, 0) >= least(100, greatest(0, 100.0 * (current_date - plan.ini) / (plan.fin - plan.ini))) - 10 THEN 'verde'
    WHEN coalesce(pr.avance_real, 0) >= least(100, greatest(0, 100.0 * (current_date - plan.ini) / (plan.fin - plan.ini))) - 25 THEN 'amarillo'
    ELSE 'rojo' END sem_tiempo
FROM public.remodel_at_properties r
LEFT JOIN public.v_remodel_progress pr ON pr.property_id = r.property_id
LEFT JOIN public.v_remodel_presupuesto_casa pc ON pc.airtable_id = r.airtable_id
LEFT JOIN plan ON plan.property_id = r.property_id
WHERE r.active;
