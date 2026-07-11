-- ════════════════════════════════════════════════════════════════
-- 💵 UW Calc 1B "El inversionista pone" — líneas de gastos de cierre HUD-1 (ADITIVA).
-- Defaults calibrados con el HUD real de Bethune: préstamo 100% de $410,000 (compra 240k + rehab 170k),
-- gastos de cierre $54,582.40 (incl. assignment $40,000), créditos $4,370.79 → pone $50,211.61.
-- Los mismos defaults viven como fallback en ffUwDefaults(); acá quedan editables sin tocar código.
-- ════════════════════════════════════════════════════════════════
insert into public.ff_uw_config (key, value, label) values
  ('cc_origination_pct',   '1.5',     '1B · Origination fee (% del préstamo)'),
  ('cc_documentation',     '1495',    '1B · Documentation fee (prestamista)'),
  ('cc_draw_fee',          '500',     '1B · Draw fee (prestamista)'),
  ('cc_underwriting',      '995',     '1B · Underwriting fee (prestamista)'),
  ('cc_prepaid_interest',  '2042.40', '1B · Prepaid interest (prestamista)'),
  ('cc_title',             '2050',    '1B · Title insurance'),
  ('cc_escrow',            '550',     '1B · Escrow fee'),
  ('cc_recording',         '250',     '1B · Recording'),
  ('cc_ucc',               '150',     '1B · UCC filing'),
  ('cc_courier',           '100',     '1B · Courier'),
  ('cc_guaranty',          '300',     '1B · Guaranty fee')
on conflict (key) do nothing;

-- ─── ROLLBACK ───
-- delete from public.ff_uw_config where key like 'cc\_%' escape '\';
