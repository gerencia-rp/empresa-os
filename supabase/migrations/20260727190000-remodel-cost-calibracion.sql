-- C.3 — Histórico de calibración de $/ft² (para ver bajar el margen de error con cada obra).
-- Patrón: arv_calibracion (serie temporal de corridas). Aditivo.
-- Cada "Recalcular $/ft²" inserta una corrida (run_at) con media, desviación, CV y outliers.

CREATE TABLE IF NOT EXISTS public.remodel_cost_calibracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz DEFAULT now(),
  n int,                          -- viviendas incluidas (tras excluir outliers)
  n_total int,                    -- viviendas evaluadas (antes de excluir)
  psf_real_weighted numeric,      -- $/ft² real ponderado por ft² (media recomendada)
  psf_real_simple numeric,        -- $/ft² real media simple
  psf_est numeric,                -- $/ft² estimado (presupuesto) promedio
  std numeric,                    -- desviación estándar del $/ft² real
  cv_pct numeric,                 -- margen de error = std/media × 100
  desv_costo_pct numeric,         -- desviación real vs estimado promedio
  sesgo numeric,                  -- sesgo medio (real − est) en $/ft²
  n_outliers int DEFAULT 0,
  outliers jsonb DEFAULT '[]'::jsonb,   -- [{address, psf, z}]
  detalle jsonb DEFAULT '[]'::jsonb,    -- por casa [{address, sqft, costo, psf, incluida}]
  incluye_en_obra boolean DEFAULT false,
  ponderacion text DEFAULT 'sqft',      -- 'sqft' | 'simple'
  fuente_costo text DEFAULT 'total_real', -- 'total_real' (plata real) | 'gasto_espejo'
  source text DEFAULT 'recalc_manual',
  actor_id uuid DEFAULT auth.uid(),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.remodel_cost_calibracion ENABLE ROW LEVEL SECURITY;

-- Regla dura RLS (06-jul): jamás `to anon` ni authenticated using(true) — área remodelacion.
DROP POLICY IF EXISTS rcc_read ON public.remodel_cost_calibracion;
CREATE POLICY rcc_read ON public.remodel_cost_calibracion
  FOR SELECT TO authenticated USING (has_area('remodelacion'));

DROP POLICY IF EXISTS rcc_write ON public.remodel_cost_calibracion;
CREATE POLICY rcc_write ON public.remodel_cost_calibracion
  FOR INSERT TO authenticated WITH CHECK (has_area('remodelacion'));

CREATE INDEX IF NOT EXISTS idx_rcc_runat ON public.remodel_cost_calibracion(run_at DESC) WHERE active;

-- Respaldo versionado de remodel_forecast_params (existía sólo en la DB, sin migración).
-- IF NOT EXISTS: no toca la tabla si ya existe. Sólo asegura que el esquema quede versionado.
CREATE TABLE IF NOT EXISTS public.remodel_forecast_params (
  key text PRIMARY KEY,
  value numeric,
  label text,
  updated_at timestamptz DEFAULT now()
);
