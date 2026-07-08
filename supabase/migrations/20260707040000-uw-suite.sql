-- SUITE DE UNDERWRITING FF: memoria de análisis (soft-delete) + calibración de bandas $/sqft.
CREATE TABLE IF NOT EXISTS public.ff_underwriting_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,                 -- etiqueta del análisis
  property_id uuid,                     -- casa real (si aplica)
  ff_deal_id uuid,                      -- ff_deals.id origen (si se cargó)
  es_hipotetica boolean DEFAULT false,
  direccion text, ciudad text default 'Austin',
  inputs jsonb DEFAULT '{}'::jsonb,     -- todos los inputs de las 6 calculadoras
  outputs jsonb DEFAULT '{}'::jsonb,    -- resultados calculados (snapshot)
  veredicto text,                       -- GO | NO-GO | revisar
  created_by text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  active boolean DEFAULT true, archived_at timestamptz
);
ALTER TABLE public.ff_underwriting_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS uwa_rw ON public.ff_underwriting_analyses;
CREATE POLICY uwa_rw ON public.ff_underwriting_analyses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- calibración de bandas $/sqft por tipo de remodelación (derivadas del histórico; editables)
INSERT INTO public.ff_uw_config (key, value, label) VALUES
  ('psf_suave', 45, '$/sqft remod suave (p25 histórico)'),
  ('psf_media', 63, '$/sqft remod media (mediana histórico)'),
  ('psf_pesada', 77, '$/sqft remod pesada (p75 histórico)'),
  ('psf_pesada_max', 91, '$/sqft remod pesada tope (p90)'),
  ('psf_mercado_externo', 110, '$/sqft de contratista externo (mercado) para comparar'),
  ('harmony_int_mensual_pct', 1, 'Interés mensual Harmony (interest-only) %'),
  ('ctc_closing_default', 16052, 'Gastos de cierre HML por defecto (promedio histórico)'),
  ('draw_contingencia_pct', 10, 'Contingencia del draw %'),
  ('deficit_alert_psf', 60, 'Alerta déficit: remod del draw < este $/sqft calibrado')
ON CONFLICT (key) DO NOTHING;
