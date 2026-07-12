-- ════════════════════════════════════════════════════════════════
-- 💰 Calc 3 Cash-Out (refi DSCR) — espejo de los campos de refi de Airtable
-- "Datos por casa" (applMXFyPq1hXj7iN) que hoy no se sincronizaban:
--   Monto préstamo Refi · Monto Pagado al HML con la Refi (= PAYOFF real) ·
--   Fecha de refinanciación · % que prestó el banco (refi, lookup decimal).
-- Aditiva sobre ff_hml_loans. El sync (sync-ff-airtable) los mapea.
-- + seeds de calibración refi_* en ff_uw_config (Champions Funding DSCR,
--   reverseados de los HUD/pagos reales de Michelle y Echo).
-- ════════════════════════════════════════════════════════════════

alter table public.ff_hml_loans add column if not exists monto_prestamo_refi numeric;
alter table public.ff_hml_loans add column if not exists monto_pagado_hml_refi numeric;
alter table public.ff_hml_loans add column if not exists fecha_refi date;
alter table public.ff_hml_loans add column if not exists pct_banco_refi numeric; -- decimal (0.75 = 75%)

-- Calibración del refi (todo editable; cero hardcode en el front)
insert into public.ff_uw_config (key, value, label) values
  ('refi_dscr_objetivo', 1.0, 'DSCR mínimo del prestamista del refi (1.0–1.25)'),
  ('refi_fee_underwriting', 1495, 'Underwriting fee Champions (constante observada)'),
  ('refi_fee_processing', 695, 'Processing fee Champions (constante observada)'),
  ('refi_originacion_pct', 0, 'Originación del refi, % del préstamo (Michelle 1.5 · Echo 0)'),
  ('refi_titulo_base', 2100, 'Título/registro del refi, base semi-fija'),
  ('refi_titulo_pct', 0, 'Escala opcional del título con el préstamo (%)'),
  ('refi_dias_prepagado', 17, 'Días de interés prepagado hasta el 1er pago DSCR'),
  ('refi_seguro_anual', 1900, 'Prima anual de seguro (refi)'),
  ('refi_impound_seguro_meses', 3, 'Meses de seguro al escrow en el cierre del refi'),
  ('refi_impound_imp_meses', 3, 'Meses de impuestos al escrow en el cierre del refi'),
  ('refi_tax_pct', 2.1, 'Impuesto anual del condado sobre valor tasado (Travis 2.1%)')
on conflict (key) do nothing;

-- Tasa DSCR reverseada de los pagos reales de Champions (antes 7.5 supuesto)
update public.ff_uw_config set value = 7.125,
  label = coalesce(label, 'Tasa DSCR anual (Champions 30 años, reverseada de pagos reales)')
  where key = 'dscr_tasa_anual';

-- ROLLBACK (manual):
--   alter table public.ff_hml_loans drop column if exists monto_prestamo_refi,
--     drop column if exists monto_pagado_hml_refi, drop column if exists fecha_refi,
--     drop column if exists pct_banco_refi;
--   delete from public.ff_uw_config where key like 'refi_%' and key <> 'refi_ltv_pct' and key <> 'refi_rate_pct';
--   update public.ff_uw_config set value = 7.5 where key = 'dscr_tasa_anual';
