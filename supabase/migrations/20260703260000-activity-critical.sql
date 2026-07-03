-- Bloque 3 — actividades críticas (ruta crítica del cronograma). Aditivo.
ALTER TABLE public.weekly_activities ADD COLUMN IF NOT EXISTS is_critical boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_wa_critical ON public.weekly_activities(is_critical) WHERE is_critical;
