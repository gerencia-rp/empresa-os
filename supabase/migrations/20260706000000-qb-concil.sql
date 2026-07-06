-- CT-2: cache de reportes QBO + conciliación operativo↔contable. Aditivo, soft-delete.
CREATE TABLE IF NOT EXISTS public.qb_report_cache (
  empresa text, report text,           -- pnl_ytd | pnl_all | balance
  label text, value numeric,
  fetched_at timestamptz DEFAULT now(),
  active boolean DEFAULT true, archived_at timestamptz,
  PRIMARY KEY (empresa, report, label)
);
ALTER TABLE public.qb_report_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qbrc_read ON public.qb_report_cache;
CREATE POLICY qbrc_read ON public.qb_report_cache FOR SELECT TO anon, authenticated USING (true);

-- Mapeo de conceptos de conciliación → patrón de cuenta QBO (editable sin código)
CREATE TABLE IF NOT EXISTS public.qb_account_map (
  concepto text PRIMARY KEY, patron text, label text
);
ALTER TABLE public.qb_account_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qbam_read ON public.qb_account_map;
CREATE POLICY qbam_read ON public.qb_account_map FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.qb_account_map (concepto, patron, label) VALUES
  ('aporte_inversionistas', 'investor|inversion|partner|aporte|member contrib|capital contrib', 'Aporte de inversionistas (equity/pasivo QBO)'),
  ('capitalizado_propiedades', 'propert|real estate|inventory|casas|fixed asset|wip|work in progress|construction', 'Casas capitalizadas (activo QBO)'),
  ('deuda_prestamos', 'loan|hml|note payable|prestamo|préstamo|mortgage|hard money', 'Deuda de préstamos (pasivo QBO)')
ON CONFLICT (concepto) DO NOTHING;
INSERT INTO public.ff_uw_config (key, value, label) VALUES
  ('concil_warn_pct', 10, 'Conciliación: descuadre % operativo vs QBO para alertar')
ON CONFLICT (key) DO NOTHING;
