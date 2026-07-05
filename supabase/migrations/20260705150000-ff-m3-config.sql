-- FF M3 + ajuste calibración (orden CEO 5-jul): solo zonas operativas + excluir datos incompletos. Aditivo.
ALTER TABLE public.ff_uw_config ADD COLUMN IF NOT EXISTS text_value text;
INSERT INTO public.ff_uw_config (key, value, label, text_value) VALUES
  ('calib_zonas', NULL, 'Zonas operativas para calibración (separadas por coma)', 'Austin'),
  ('calib_psf_min', 15, 'Piso $/sqft: por debajo = dato incompleto, excluido de la banda', NULL),
  ('selling_cost_pct', 6, 'Fix&Flip: costos de venta (% del ARV: realtor+cierre)', NULL),
  ('split_investor_pct', 50, 'Split de ganancia con inversionista (%)', NULL),
  ('investor_buyout_pct', 15, 'BRRRR: buy-out al inversionista = capital + este %', NULL),
  ('wholesale_fee_pct', 3, 'Wholesale: assignment fee objetivo (% del ARV)', NULL)
ON CONFLICT (key) DO NOTHING;
