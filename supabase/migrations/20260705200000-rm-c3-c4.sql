-- RM-C4: Ledger de nómina de campo — a quién le debemos, cuánto, por casa. Solo vista (aditivo).
CREATE OR REPLACE VIEW public.v_remodel_nomina_ledger AS
SELECT
  wh.worker,
  coalesce(nullif(trim(split_part(wh.casa, ',', 1)), ''), '(sin casa)') casa,
  wh.casa_norm,
  round(sum(wh.horas)::numeric, 1) horas,
  round(sum(wh.horas * coalesce(cr.pago_x_hora, 0))::numeric) devengado,
  round(sum(coalesce(wh.pago, 0))::numeric) pagado,
  round((sum(wh.horas * coalesce(cr.pago_x_hora, 0)) - sum(coalesce(wh.pago, 0)))::numeric) deuda,
  max(wh.fecha) ultima_fecha,
  bool_and(cr.pago_x_hora IS NOT NULL) rate_conocido
FROM public.remodel_worker_hours wh
LEFT JOIN public.remodel_crew_rates cr ON lower(trim(cr.nombre)) = lower(trim(wh.worker))
WHERE wh.worker IS NOT NULL
GROUP BY wh.worker, coalesce(nullif(trim(split_part(wh.casa, ',', 1)), ''), '(sin casa)'), wh.casa_norm;
