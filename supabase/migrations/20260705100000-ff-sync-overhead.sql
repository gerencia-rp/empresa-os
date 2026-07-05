-- FF P0 (auditoría 5-jul): soft-delete completo + overhead real + pagos HML. Aditivo.
ALTER TABLE public.ff_deals ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.ff_draws ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.ff_investors ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Overhead FF real (Gastos Equipo Fix and Flip + Gasto Plataformas Fix And Flip)
CREATE TABLE IF NOT EXISTS public.ff_overhead (
  airtable_id text PRIMARY KEY,
  source text,          -- equipo | plataformas
  concepto text, monto numeric, mes text,
  active boolean DEFAULT true, archived_at timestamptz, last_synced_at timestamptz DEFAULT now()
);
-- Pagos HML reales (intereses/fees por casa, fechados)
CREATE TABLE IF NOT EXISTS public.ff_hml_payments (
  airtable_id text PRIMARY KEY,
  address text, address_norm text,
  fecha date, pago_hml numeric, fee numeric, ref30 numeric, fecha_ref30 date, pagado boolean,
  active boolean DEFAULT true, archived_at timestamptz, last_synced_at timestamptz DEFAULT now()
);
ALTER TABLE public.ff_overhead ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_hml_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ff_overhead_read ON public.ff_overhead;
CREATE POLICY ff_overhead_read ON public.ff_overhead FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS ff_hml_read ON public.ff_hml_payments;
CREATE POLICY ff_hml_read ON public.ff_hml_payments FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_ff_hml_norm ON public.ff_hml_payments(address_norm) WHERE active;
