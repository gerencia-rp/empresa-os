-- FF M2: supuestos del underwriting en config (nada hardcodeado). Aditivo, ON CONFLICT DO NOTHING.
INSERT INTO public.ff_uw_config (key, value, label) VALUES
  ('arv_factor', 0.75, 'Factor MAO: % del ARV (regla all-in)'),
  ('closing_pct', 2, 'Costos de cierre (% del ARV)'),
  ('lender_fee_pct', 2, 'Lender fees (% del préstamo)'),
  ('contingency_pct', 10, 'Contingencia (% de la remodelación)'),
  ('hml_rate_annual', 12, 'Tasa anual HML (%) — Harmony solo intereses'),
  ('hml_ltc_pct', 90, 'HML: % del costo que presta (LTC)'),
  ('holding_months', 6, 'Meses de holding estimados'),
  ('refi_ltv_pct', 75, 'Refi: LTV (% del appraisal)'),
  ('refi_rate_pct', 7, 'Refi: tasa anual (%)'),
  ('vacancy_pct', 8, 'Renta: vacancia (%)'),
  ('opex_pct', 35, 'Renta: gastos operativos (% de renta)'),
  ('scen_arv_delta_pct', 10, 'Escenarios: delta de ARV (±%)'),
  ('scen_rehab_delta_pct', 15, 'Escenarios: delta de remodelación (±%)')
ON CONFLICT (key) DO NOTHING;
