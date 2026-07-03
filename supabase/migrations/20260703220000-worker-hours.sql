-- BLOQUE 1.3 — Espejo de pago de trabajadores (Airtable Remodelación → Supabase). SOLO LECTURA en el front.
-- Fuente: "Horas trabajadas semana" (persona × casa × semana: horas + pago) + "Cuadrillas" (pago x hora).
CREATE TABLE IF NOT EXISTS public.remodel_worker_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id text UNIQUE,
  worker text,
  casa text,
  casa_norm text,
  fecha date,
  horas numeric,
  pago numeric,
  last_synced_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rwh_casa ON public.remodel_worker_hours(casa_norm);
CREATE INDEX IF NOT EXISTS idx_rwh_worker ON public.remodel_worker_hours(worker);
ALTER TABLE public.remodel_worker_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rwh_read ON public.remodel_worker_hours;
CREATE POLICY rwh_read ON public.remodel_worker_hours FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.remodel_crew_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id text UNIQUE,
  nombre text,
  experiencia text,
  pago_x_hora numeric,
  last_synced_at timestamptz DEFAULT now()
);
ALTER TABLE public.remodel_crew_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rcr_read ON public.remodel_crew_rates;
CREATE POLICY rcr_read ON public.remodel_crew_rates FOR SELECT USING (auth.role() = 'authenticated');
