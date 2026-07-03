-- BLOQUE 1.1 — Recursos FIJOS por obra (equipo asignado a la casa, no por día).
-- Aditivo, soft-delete (archived_at). No borra nada. house_id = home.id del Planner
-- (uuid del proyecto o 'name:<nombre>' para casas sin proyecto).
CREATE TABLE IF NOT EXISTS public.remodel_project_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id text NOT NULL,
  resource_id uuid NOT NULL,
  role text,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rpr_active ON public.remodel_project_resources(house_id, resource_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rpr_house ON public.remodel_project_resources(house_id);
ALTER TABLE public.remodel_project_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rpr_all ON public.remodel_project_resources;
CREATE POLICY rpr_all ON public.remodel_project_resources FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
