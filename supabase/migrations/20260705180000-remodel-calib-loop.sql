-- RM-C1: Loop de aprendizaje — el real del Planner/obras recalibra el Estimador. Solo vistas (aditivo).

-- Lado COSTO con TENDENCIA: histórico completo vs últimas 5 cerradas ("se afina con cada obra")
CREATE OR REPLACE VIEW public.v_remodel_calib_costos AS
WITH base AS (
  SELECT c.*, r.fecha_real_fin,
    row_number() OVER (ORDER BY r.fecha_real_fin DESC NULLS LAST) rn
  FROM public.remodel_obra_calibration c
  JOIN public.remodel_at_properties r ON r.active AND r.address = c.address
)
SELECT 'historico' AS ventana, count(*) n,
  round(avg(real_psf), 1) psf_real, round(avg(est_psf), 1) psf_est,
  round(avg(desv_costo_pct), 1) desv_costo_pct, round(avg(desv_dias), 1) desv_dias,
  round(avg(mat_ratio_pct), 1) mat_ratio_pct
FROM base
UNION ALL
SELECT 'ultimas_5', count(*),
  round(avg(real_psf), 1), round(avg(est_psf), 1),
  round(avg(desv_costo_pct), 1), round(avg(desv_dias), 1), round(avg(mat_ratio_pct), 1)
FROM base WHERE rn <= 5;

-- Lado DÍAS por ETAPA (del Planner, baseline por triggers): factor_dias = 1 + avg_slip (1 tarea = 1 día).
-- Normaliza nombres de etapa (internos/interno./Interno → interno). aplicable = n >= umbral del pronosticador.
CREATE OR REPLACE VIEW public.v_remodel_calib_etapas AS
WITH norm AS (
  SELECT
    CASE regexp_replace(lower(trim(stage)), '[.\s]+$', '')
      WHEN 'internos' THEN 'interno'
      ELSE regexp_replace(lower(trim(stage)), '[.\s]+$', '')
    END AS etapa,
    date, baseline_date
  FROM public.weekly_activities
  WHERE stage IS NOT NULL AND stage <> '' AND baseline_date IS NOT NULL AND coalesce(status,'') <> 'cancelled'
)
SELECT etapa,
  count(*) n_tareas,
  round(avg((date - baseline_date))::numeric, 2) avg_slip_dias,
  round(1 + avg((date - baseline_date))::numeric, 3) factor_dias,
  round(100.0 * count(*) FILTER (WHERE date > baseline_date) / nullif(count(*), 0), 1) pct_atrasadas,
  (count(*) >= coalesce((SELECT value::int FROM public.remodel_forecast_params WHERE key = 'n_threshold'), 3)) aplicable
FROM norm
GROUP BY etapa
ORDER BY n_tareas DESC;
