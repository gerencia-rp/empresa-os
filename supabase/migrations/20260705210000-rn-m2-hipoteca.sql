-- RN-M2: hipoteca fija por casa (espejo de Casas.Hipoteca mensual). Aditivo.
ALTER TABLE public.pm_properties ADD COLUMN IF NOT EXISTS mortgage_monthly numeric;
ALTER TABLE public.pm_properties ADD COLUMN IF NOT EXISTS loan_type text;
