-- Bloque 2.1 — soft-delete de pronósticos/diagnósticos. Aditivo, reversible.
ALTER TABLE public.remodel_forecast_diagnoses ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.remodel_forecasts ADD COLUMN IF NOT EXISTS archived_at timestamptz;
