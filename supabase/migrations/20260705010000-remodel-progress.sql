-- P1: avance_real único calculado desde el Planner (weekly_activities) por property_id.
-- v1 = done/total. Recompute-on-write por trigger → remodel_at_properties.avance_real + remodel_projects.progress.

ALTER TABLE public.remodel_at_properties ADD COLUMN IF NOT EXISTS avance_real numeric;
ALTER TABLE public.remodel_projects ADD COLUMN IF NOT EXISTS progress_real numeric;

-- Vista: avance por casa desde el Planner. v1 = done/total (excluye canceladas).
-- HOOK v2: ponderar por horas/labor de la actividad y honrar is_critical (columna weighted lista para futuro).
CREATE OR REPLACE VIEW public.v_remodel_progress AS
SELECT property_id,
  count(*) AS total,
  count(*) FILTER (WHERE status = 'done') AS done,
  count(*) FILTER (WHERE is_critical) AS criticas,
  count(*) FILTER (WHERE is_critical AND status = 'done') AS criticas_done,
  CASE WHEN count(*) > 0
    THEN round(count(*) FILTER (WHERE status = 'done')::numeric / count(*) * 100)
    ELSE NULL END AS avance_real
FROM public.weekly_activities
WHERE property_id IS NOT NULL AND coalesce(status,'') <> 'cancelled'
GROUP BY property_id;

-- Recompute de una casa → escribe en el espejo de obras y en el proyecto del Estimador
CREATE OR REPLACE FUNCTION public.recompute_casa_progress(pid uuid) RETURNS void AS $$
DECLARE av numeric;
BEGIN
  IF pid IS NULL THEN RETURN; END IF;
  SELECT CASE WHEN count(*) > 0
    THEN round(count(*) FILTER (WHERE status = 'done')::numeric / count(*) * 100) ELSE NULL END
    INTO av FROM public.weekly_activities WHERE property_id = pid AND coalesce(status,'') <> 'cancelled';
  UPDATE public.remodel_at_properties SET avance_real = av WHERE property_id = pid;
  UPDATE public.remodel_projects SET progress_real = av WHERE property_id = pid AND archived_at IS NULL;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trg_wa_progress() RETURNS trigger AS $$
BEGIN
  PERFORM public.recompute_casa_progress(COALESCE(NEW.property_id, OLD.property_id));
  IF TG_OP = 'UPDATE' AND NEW.property_id IS DISTINCT FROM OLD.property_id THEN
    PERFORM public.recompute_casa_progress(OLD.property_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wa_progress ON public.weekly_activities;
CREATE TRIGGER trg_wa_progress AFTER INSERT OR UPDATE OR DELETE ON public.weekly_activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_wa_progress();

-- Backfill inicial de todas las casas con actividades
SELECT public.recompute_casa_progress(property_id)
FROM (SELECT DISTINCT property_id FROM public.weekly_activities WHERE property_id IS NOT NULL) x;
