-- C.2 — Costos por fase importados desde el Excel del Estimado ("PRESUPUESTO GENERAL").
-- Aditivo. Idempotente por (property_id, fase): re-importar reemplaza los costos de la obra.
-- Alimenta el BAC por fase del módulo EVM (C.1).

CREATE TABLE IF NOT EXISTS public.remodel_phase_costs (
  property_id uuid NOT NULL,
  fase text NOT NULL CHECK (fase IN ('1','2','3','4','5','6')),
  costo_materiales numeric DEFAULT 0,
  costo_mano_obra  numeric DEFAULT 0,
  costo_equipo     numeric DEFAULT 0,
  total            numeric DEFAULT 0,
  address text,
  source text DEFAULT 'excel_import',
  import_batch text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (property_id, fase)
);

ALTER TABLE public.remodel_phase_costs ENABLE ROW LEVEL SECURITY;

-- Regla dura RLS (06-jul): jamás `to anon` ni authenticated using(true) — área remodelacion.
DROP POLICY IF EXISTS rpc_read ON public.remodel_phase_costs;
CREATE POLICY rpc_read ON public.remodel_phase_costs
  FOR SELECT TO authenticated USING (has_area('remodelacion'));

DROP POLICY IF EXISTS rpc_write ON public.remodel_phase_costs;
CREATE POLICY rpc_write ON public.remodel_phase_costs
  FOR ALL TO authenticated
  USING (has_area('remodelacion'))
  WITH CHECK (has_area('remodelacion'));

CREATE INDEX IF NOT EXISTS idx_rpc_prop ON public.remodel_phase_costs(property_id);
