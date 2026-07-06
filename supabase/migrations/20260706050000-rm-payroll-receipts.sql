-- RM-M2 fase 2: registro de recibos de nómina quincenal firmados. Aditivo, soft-delete.
CREATE TABLE IF NOT EXISTS public.remodel_payroll_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_ini date, periodo_fin date,
  casa text, lider text,
  total numeric, horas numeric,
  detalle jsonb,                       -- [{worker, horas, rate, monto, sinRate}]
  firma_png text,                      -- dataURL de la firma del líder
  estado text DEFAULT 'realizado',     -- pendiente | realizado
  fecha_pago date DEFAULT current_date,
  airtable_writeback text DEFAULT 'pendiente',  -- pendiente (falta scope write) | hecho
  drive_url text,                      -- parqueado: sin credenciales de Drive
  created_by text, created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true, archived_at timestamptz
);
ALTER TABLE public.remodel_payroll_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rpr_read ON public.remodel_payroll_receipts;
CREATE POLICY rpr_read ON public.remodel_payroll_receipts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS rpr_ins ON public.remodel_payroll_receipts;
CREATE POLICY rpr_ins ON public.remodel_payroll_receipts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS rpr_upd ON public.remodel_payroll_receipts;
CREATE POLICY rpr_upd ON public.remodel_payroll_receipts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
