-- Avance técnico por ACTIVIDAD ($ del pronóstico) + presupuesto inicial = pronóstico. Aditivo.
DROP VIEW IF EXISTS public.v_remodel_avance_vivo;
CREATE OR REPLACE VIEW public.v_remodel_progress AS
WITH base AS (
  SELECT property_id, count(*) total,
    count(*) FILTER (WHERE status = 'done') done,
    count(*) FILTER (WHERE is_critical) criticas,
    count(*) FILTER (WHERE is_critical AND status = 'done') criticas_done
  FROM public.weekly_activities
  WHERE property_id IS NOT NULL AND coalesce(status,'') <> 'cancelled'
  GROUP BY property_id
),
-- método 1: ponderado por ACTIVIDAD (weekly.activity_code ↔ projects.activities.code, peso = total $)
wk_code AS (
  SELECT property_id, activity_code, count(*) n, count(*) FILTER (WHERE status='done') dn
  FROM public.weekly_activities
  WHERE property_id IS NOT NULL AND coalesce(status,'') <> 'cancelled' AND activity_code IS NOT NULL
  GROUP BY property_id, activity_code
),
acts AS (
  SELECT p.property_id, e->>'code' code, (e->>'total')::numeric amt
  FROM public.remodel_projects p, jsonb_array_elements(p.activities) e
  WHERE p.property_id IS NOT NULL AND (e->>'total') IS NOT NULL
),
act_join AS (
  SELECT a.property_id,
    sum(a.amt) amt_matched,
    sum(a.amt * w.dn::numeric / w.n) amt_done,
    sum(w.n) tareas_matched
  FROM acts a JOIN wk_code w ON w.property_id = a.property_id AND w.activity_code = a.code
  GROUP BY a.property_id
),
-- método 2: ponderado por ETAPA (pesos del Estimador, editables)
wa AS (
  SELECT property_id, norm_etapa(stage) et, count(*) tot, count(*) FILTER (WHERE status = 'done') dn
  FROM public.weekly_activities
  WHERE property_id IS NOT NULL AND coalesce(status,'') <> 'cancelled'
  GROUP BY property_id, norm_etapa(stage)
),
wts AS (
  SELECT property_id, norm_etapa(etapa) et, sum(peso_pct) w
  FROM public.remodel_stage_weights WHERE active AND peso_pct > 0
  GROUP BY property_id, norm_etapa(etapa)
),
pond AS (
  SELECT wa.property_id,
    sum(wa.tot) tareas_match, sum(wts.w) wsum,
    sum(wts.w * wa.dn::numeric / wa.tot) wdone
  FROM wa JOIN wts ON wts.property_id = wa.property_id AND wts.et = wa.et
  GROUP BY wa.property_id
)
SELECT b.property_id, b.total, b.done, b.criticas, b.criticas_done,
  CASE
    WHEN aj.amt_matched > 0 AND aj.tareas_matched::numeric / b.total >= 0.6
      THEN round(100 * aj.amt_done / aj.amt_matched)
    WHEN p.wsum > 0 AND p.tareas_match::numeric / b.total >= 0.6
      THEN round(100 * p.wdone / p.wsum)
    WHEN b.total > 0 THEN round(100.0 * b.done / b.total)
    ELSE NULL END avance_real,
  CASE
    WHEN aj.amt_matched > 0 AND aj.tareas_matched::numeric / b.total >= 0.6 THEN 'ponderado_actividad'
    WHEN p.wsum > 0 AND p.tareas_match::numeric / b.total >= 0.6 THEN 'ponderado_etapa'
    ELSE 'conteo' END metodo,
  b.total - coalesce(aj.tareas_matched, 0) tareas_sin_map
FROM base b
LEFT JOIN act_join aj ON aj.property_id = b.property_id
LEFT JOIN pond p ON p.property_id = b.property_id;
ALTER VIEW public.v_remodel_progress SET (security_invoker = true);
REVOKE SELECT ON public.v_remodel_progress FROM anon;
