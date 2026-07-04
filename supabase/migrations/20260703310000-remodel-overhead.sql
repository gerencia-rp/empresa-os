-- Auditoría CC Remodelación P1-4: overhead (Gastos Empresariales + Nómina Admin + Plataformas) para EBITDA. Aditivo, RLS.
CREATE TABLE IF NOT EXISTS public.remodel_overhead (
  airtable_id text PRIMARY KEY,
  source text,          -- gastos_empresariales | nomina_admin | plataformas
  concepto text,
  monto numeric,
  categoria text,
  mes text, anio text, fecha date,
  active boolean DEFAULT true, archived_at timestamptz,
  last_synced_at timestamptz DEFAULT now()
);
ALTER TABLE public.remodel_overhead ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roh_read ON public.remodel_overhead;
CREATE POLICY roh_read ON public.remodel_overhead FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS roh_write ON public.remodel_overhead;
CREATE POLICY roh_write ON public.remodel_overhead FOR ALL USING (auth.role() = 'service_role') WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_roh_source ON public.remodel_overhead(source) WHERE active;
