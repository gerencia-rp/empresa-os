-- FF Blueprint M1: préstamos HML (espejo "Datos por casa") + property_id + config de underwriting. Aditivo.
ALTER TABLE public.ff_deals ADD COLUMN IF NOT EXISTS property_id uuid;
CREATE INDEX IF NOT EXISTS idx_ffdeals_pid ON public.ff_deals(property_id) WHERE property_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ff_hml_loans (
  airtable_id text PRIMARY KEY,
  address text, address_norm text,
  monto_hml numeric, tasa_pct numeric, plazo_meses text,
  fecha_inicio date, fecha_vencimiento date,
  gastos_cierre numeric, down_payment numeric, cash_to_close numeric,
  draws_aprobados numeric, draws_cobrados numeric,
  fecha_inicio_rehab date, fecha_fin_rehab date,
  active boolean DEFAULT true, archived_at timestamptz, last_synced_at timestamptz DEFAULT now()
);
ALTER TABLE public.ff_hml_loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ff_hml_loans_read ON public.ff_hml_loans;
CREATE POLICY ff_hml_loans_read ON public.ff_hml_loans FOR SELECT TO anon, authenticated USING (true);

-- Config de underwriting (supuestos NO hardcodeados; M2 la extiende)
CREATE TABLE IF NOT EXISTS public.ff_uw_config (
  key text PRIMARY KEY, value numeric, label text, updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.ff_uw_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ff_uw_read ON public.ff_uw_config;
CREATE POLICY ff_uw_read ON public.ff_uw_config FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.ff_uw_config (key, value, label) VALUES
  ('all_in_max_pct', 0.75, 'Regla all-in máximo como % del ARV'),
  ('hml_warn_days', 45, 'Días antes del vencimiento HML para alertar'),
  ('budget_warn_pct', 10, 'Desvío % de presupuesto de remodelación para alertar')
ON CONFLICT (key) DO NOTHING;

-- property_id para FF: mint + link (mismo patrón del RPC de Remodelación)
CREATE OR REPLACE FUNCTION public.ff_backfill_property_ids() RETURNS jsonb AS $$
DECLARE minted int; linked int;
BEGIN
  INSERT INTO public.properties (address, city, state, user_id, property_type, status)
  SELECT DISTINCT ON (norm_casa(d.address)) d.address, d.city, 'TX',
    '203f8d94-fea1-4031-b468-2580887bbfca'::uuid, 'fix_flip', 'purchased'
  FROM public.ff_deals d
  WHERE d.active AND coalesce(norm_casa(d.address),'') <> '' AND d.property_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.properties p WHERE norm_casa(p.address) = norm_casa(d.address))
  ORDER BY norm_casa(d.address);
  GET DIAGNOSTICS minted = ROW_COUNT;
  UPDATE public.ff_deals d SET property_id = p.id
  FROM public.properties p
  WHERE d.active AND d.property_id IS NULL AND norm_casa(p.address) <> '' AND norm_casa(p.address) = norm_casa(d.address);
  GET DIAGNOSTICS linked = ROW_COUNT;
  RETURN jsonb_build_object('minted', minted, 'linked', linked);
END; $$ LANGUAGE plpgsql;
SELECT public.ff_backfill_property_ids();
