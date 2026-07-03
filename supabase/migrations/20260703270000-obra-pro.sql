-- Bloque 4 — capa profesional de obra: hitos, inspecciones/hold points, punch list, calendario laboral.
-- Todo aditivo + soft-delete (archived_at). RLS authenticated. No borra nada.
CREATE TABLE IF NOT EXISTS public.remodel_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid, tipo text, nombre text,
  plan_date date, real_date date, status text DEFAULT 'pendiente',
  draw_amount numeric, notes text,
  archived_at timestamptz, created_at timestamptz DEFAULT now(), created_by uuid
);
CREATE TABLE IF NOT EXISTS public.remodel_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid, stage text, tipo text,
  status text DEFAULT 'pendiente', hold_point boolean DEFAULT true,
  plan_date date, real_date date, result text, notes text,
  archived_at timestamptz, created_at timestamptz DEFAULT now(), created_by uuid
);
CREATE TABLE IF NOT EXISTS public.remodel_punch_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid, stage text, item text, severity text DEFAULT 'normal',
  status text DEFAULT 'abierto', photo_path text, notes text,
  archived_at timestamptz, created_at timestamptz DEFAULT now(), created_by uuid
);
CREATE TABLE IF NOT EXISTS public.remodel_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date UNIQUE, tipo text DEFAULT 'feriado', motivo text,
  created_at timestamptz DEFAULT now()
);
DO $$ DECLARE t text;
BEGIN FOREACH t IN ARRAY ARRAY['remodel_milestones','remodel_inspections','remodel_punch_list','remodel_calendar'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('DROP POLICY IF EXISTS %I_all ON public.%I', t, t);
  EXECUTE format('CREATE POLICY %I_all ON public.%I FOR ALL USING (auth.role()=''authenticated'') WITH CHECK (auth.role()=''authenticated'')', t, t);
END LOOP; END $$;
CREATE INDEX IF NOT EXISTS idx_mile_proj ON public.remodel_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_insp_proj ON public.remodel_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_proj ON public.remodel_punch_list(project_id);
