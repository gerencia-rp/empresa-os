-- BLOQUE 1.2 — Actividad MULTI-DÍA: las entradas por día de una misma actividad comparten group_id.
-- Aditivo, no borra nada. baseline_date lo setea el trigger existente (= date) en cada insert.
ALTER TABLE public.weekly_activities ADD COLUMN IF NOT EXISTS group_id uuid;
CREATE INDEX IF NOT EXISTS idx_wa_group ON public.weekly_activities(group_id);
