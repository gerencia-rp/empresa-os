-- RM AVANCE TÉCNICO PONDERADO + FINANCIERO EN VIVO. Aditivo.
-- Normalizador de etapa (vocabularios Planner vs Estimador: Interno=Interior, Externo=Exterior…)
CREATE OR REPLACE FUNCTION public.norm_etapa(t text) RETURNS text AS $$
  SELECT CASE
    WHEN x LIKE 'inter%' THEN 'interior'
    WHEN x LIKE 'exter%' THEN 'exterior'
    WHEN x LIKE 'demol%' THEN 'demolicion'
    WHEN x LIKE 'ciment%' OR x LIKE 'cimen%' THEN 'cimentacion'
    WHEN x LIKE 'estruct%' THEN 'estructura'
    WHEN x LIKE 'limpi%' THEN 'limpieza'
    WHEN x LIKE 'pintur%' THEN 'pintura'
    WHEN x = '' THEN NULL
    ELSE left(x, 8) END
  FROM (SELECT regexp_replace(lower(translate(coalesce(t,''), 'áéíóúñÁÉÍÓÚ', 'aeiounAEIOU')), '[^a-z]', '', 'g') x) s;
$$ LANGUAGE sql IMMUTABLE;

-- A: pesos de importancia por etapa (los escribe el Estimador al guardar; editable)
CREATE TABLE IF NOT EXISTS public.remodel_stage_weights (
  property_id uuid, etapa text, peso_pct numeric,
  fuente text DEFAULT 'estimador', address text,
  updated_at timestamptz DEFAULT now(),
  active boolean DEFAULT true, archived_at timestamptz,
  PRIMARY KEY (property_id, etapa)
);
ALTER TABLE public.remodel_stage_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rsw_read ON public.remodel_stage_weights;
CREATE POLICY rsw_read ON public.remodel_stage_weights FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS rsw_write ON public.remodel_stage_weights;
CREATE POLICY rsw_write ON public.remodel_stage_weights FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- B: avance TÉCNICO ponderado (fallback conteo si cobertura de match < 60% o sin pesos)
CREATE OR REPLACE VIEW public.v_remodel_progress AS
WITH wa AS (
  SELECT property_id, norm_etapa(stage) et, count(*) tot,
         count(*) FILTER (WHERE status = 'done') dn
  FROM public.weekly_activities
  WHERE property_id IS NOT NULL AND coalesce(status,'') <> 'cancelled'
  GROUP BY property_id, norm_etapa(stage)
), base AS (
  SELECT property_id, count(*) total,
    count(*) FILTER (WHERE status = 'done') done,
    count(*) FILTER (WHERE is_critical) criticas,
    count(*) FILTER (WHERE is_critical AND status = 'done') criticas_done
  FROM public.weekly_activities
  WHERE property_id IS NOT NULL AND coalesce(status,'') <> 'cancelled'
  GROUP BY property_id
), wts AS (
  SELECT property_id, norm_etapa(etapa) et, sum(peso_pct) w
  FROM public.remodel_stage_weights WHERE active AND peso_pct > 0
  GROUP BY property_id, norm_etapa(etapa)
), pond AS (
  SELECT wa.property_id,
    sum(wa.tot) FILTER (WHERE wts.w IS NOT NULL) tareas_match,
    sum(wts.w) wsum,
    sum(wts.w * wa.dn::numeric / wa.tot) wdone
  FROM wa JOIN wts ON wts.property_id = wa.property_id AND wts.et = wa.et
  GROUP BY wa.property_id
)
SELECT b.property_id, b.total, b.done, b.criticas, b.criticas_done,
  CASE
    WHEN p.wsum > 0 AND p.tareas_match::numeric / b.total >= 0.6
      THEN round(100 * p.wdone / p.wsum)
    WHEN b.total > 0 THEN round(100.0 * b.done / b.total)
    ELSE NULL END avance_real,
  CASE WHEN p.wsum > 0 AND p.tareas_match::numeric / b.total >= 0.6 THEN 'ponderado' ELSE 'conteo' END metodo
FROM base b LEFT JOIN pond p ON p.property_id = b.property_id;
ALTER VIEW public.v_remodel_progress SET (security_invoker = true);
REVOKE SELECT ON public.v_remodel_progress FROM anon;

-- Seed real: pesos de Starbright desde su pronóstico más reciente (fuente estimador)
INSERT INTO public.remodel_stage_weights (property_id, etapa, peso_pct, fuente, address)
SELECT r.property_id, e->>'etapa',
  round(100.0 * (e->>'subtotal')::numeric / nullif(f.tot,0), 2), 'estimador_backfill', r.address
FROM public.remodel_at_properties r
JOIN LATERAL (
  SELECT f0.resultado, (SELECT sum((x->>'subtotal')::numeric) FROM jsonb_array_elements(f0.resultado) x) tot
  FROM public.remodel_forecasts f0
  WHERE f0.archived_at IS NULL AND norm_casa(r.address) LIKE '%' || norm_casa(f0.propiedad) || '%' AND length(norm_casa(f0.propiedad)) >= 6
  ORDER BY f0.created_at DESC LIMIT 1
) f ON true
CROSS JOIN LATERAL jsonb_array_elements(f.resultado) e
WHERE r.active AND r.proceso = 'En construcción' AND r.address ILIKE '%starbright%'
ON CONFLICT (property_id, etapa) DO NOTHING;

-- refresh de los avances almacenados (trigger recompute manual one-time)
UPDATE public.remodel_at_properties r SET avance_real = p.avance_real
FROM public.v_remodel_progress p WHERE p.property_id = r.property_id AND r.active;
