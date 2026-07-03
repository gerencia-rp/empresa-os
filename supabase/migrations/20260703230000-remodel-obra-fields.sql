-- Deploy A — campos de obra desde Airtable (retraso, monto por gastar, rentabilidad, monto real). Aditivo.
ALTER TABLE public.remodel_at_properties ADD COLUMN IF NOT EXISTS retraso_dias numeric;
ALTER TABLE public.remodel_at_properties ADD COLUMN IF NOT EXISTS monto_por_gastar numeric;
ALTER TABLE public.remodel_at_properties ADD COLUMN IF NOT EXISTS rentabilidad numeric;
ALTER TABLE public.remodel_at_properties ADD COLUMN IF NOT EXISTS monto_real numeric;
