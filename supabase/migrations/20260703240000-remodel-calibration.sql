-- Deploy F — agregados de calibración listos para el Estimador Pro (real $/sqft, desvío costo/días, mat ratio).
-- Por obra finalizada confiable. NO se aplica todavía; queda disponible para leer desde el Estimador.
CREATE OR REPLACE VIEW public.remodel_obra_calibration AS
SELECT address, lider, sqft,
  presupuesto_interno AS est_total,
  monto_real AS real_total,
  round(monto_real / nullif(sqft, 0), 1) AS real_psf,
  round(presupuesto_interno / nullif(sqft, 0), 1) AS est_psf,
  round((monto_real - presupuesto_interno) / nullif(presupuesto_interno, 0) * 100, 1) AS desv_costo_pct,
  retraso_dias AS desv_dias,
  round(gasto_materiales / nullif(gasto_materiales + gasto_trabajadores, 0) * 100, 1) AS mat_ratio_pct,
  round(rentabilidad, 1) AS rentabilidad
FROM public.remodel_at_properties
WHERE proceso = 'Finalizado' AND coalesce(sqft, 0) > 0 AND coalesce(monto_real, 0) > 0 AND coalesce(presupuesto_interno, 0) > 0;
