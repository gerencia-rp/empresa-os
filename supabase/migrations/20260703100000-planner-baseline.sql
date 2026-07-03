-- Planner Semanal — PLAN INICIAL vs REAL (baseline) + log de movimientos + agregados de desviación.
-- NO borra data (las 350 weekly_activities se conservan). baseline_date se backfillea = fecha actual.
-- Robusto por TRIGGERS (captura todo cambio de día sin tocar las funciones del front).

-- 1) baseline_date = día planeado ORIGINAL (no cambia). Backfill = fecha actual para las existentes.
ALTER TABLE public.weekly_activities ADD COLUMN IF NOT EXISTS baseline_date date;
UPDATE public.weekly_activities SET baseline_date = date WHERE baseline_date IS NULL;

-- BEFORE INSERT: al crear una actividad, baseline_date := date (el Estimador envía → baseline inicial).
CREATE OR REPLACE FUNCTION public.wa_set_baseline() RETURNS trigger AS $$
BEGIN IF NEW.baseline_date IS NULL THEN NEW.baseline_date := NEW.date; END IF; RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_wa_baseline ON public.weekly_activities;
CREATE TRIGGER trg_wa_baseline BEFORE INSERT ON public.weekly_activities
  FOR EACH ROW EXECUTE FUNCTION public.wa_set_baseline();

-- 2) LOG de movimientos: cada vez que cambia el día de una tarea (de → a, cuándo, motivo opcional).
CREATE TABLE IF NOT EXISTS public.weekly_activity_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES public.weekly_activities(id) ON DELETE CASCADE,
  project_id uuid,
  property_name text,
  activity_name text,
  stage text,
  activity_code text,
  from_date date,
  to_date date,
  slip_days integer,           -- to_date - from_date (positivo = se atrasó)
  moved_at timestamptz DEFAULT now(),
  reason text,
  moved_by uuid
);
CREATE INDEX IF NOT EXISTS idx_wam_activity ON public.weekly_activity_moves(activity_id);
CREATE INDEX IF NOT EXISTS idx_wam_moved_at ON public.weekly_activity_moves(moved_at);
ALTER TABLE public.weekly_activity_moves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wam_all ON public.weekly_activity_moves;
CREATE POLICY wam_all ON public.weekly_activity_moves FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.wa_log_move() RETURNS trigger AS $$
BEGIN
  IF NEW.date IS DISTINCT FROM OLD.date THEN
    INSERT INTO public.weekly_activity_moves
      (activity_id, project_id, property_name, activity_name, stage, activity_code, from_date, to_date, slip_days, reason, moved_by)
    VALUES (NEW.id, NEW.project_id, NEW.property_name, NEW.activity_name, NEW.stage, NEW.activity_code,
            OLD.date, NEW.date, (NEW.date - OLD.date),
            (regexp_match(coalesce(NEW.notes, ''), '\[APLAZADA:?\s*([^\]]*)\]'))[1],
            auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_wa_move ON public.weekly_activities;
CREATE TRIGGER trg_wa_move AFTER UPDATE ON public.weekly_activities
  FOR EACH ROW EXECUTE FUNCTION public.wa_log_move();

-- 3) APRENDIZAJE (C): agregados de desviación por etapa — 'dato listo' para que el Estimador calibre
--    sus días/etapa más adelante (NO se aplica todavía, solo queda disponible).
CREATE OR REPLACE VIEW public.remodel_stage_deviation AS
SELECT
  stage,
  count(*) AS n_tasks,
  round(avg(date - baseline_date)::numeric, 2) AS avg_slip_days,
  sum(greatest(0, date - baseline_date)) AS total_slip_days,
  round(100.0 * count(*) FILTER (WHERE date > baseline_date) / nullif(count(*), 0), 1) AS pct_slipped
FROM public.weekly_activities
WHERE baseline_date IS NOT NULL AND stage IS NOT NULL AND stage <> ''
GROUP BY stage;
