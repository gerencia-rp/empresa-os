-- ═══ UW · MODO VENTA (fix & flip) — defaults globales editables (cero hardcode) ═══
-- La suite de underwriting ya funciona sin estas filas (ffUwDefaults usa UWc(key, fallback)),
-- pero sembrarlas las hace visibles/editables como config global del negocio.
-- Idempotente: ON CONFLICT no pisa un valor ya ajustado por el CEO.
insert into ff_uw_config (key, value, updated_at) values
  ('venta_comision_pct',            6,    now()),   -- comisión de venta (% del precio)
  ('venta_closing',                 2500, now()),   -- closing de venta ($ fijo)
  ('venta_title_pct',               0,    now()),   -- título / escrow de venta (% del precio)
  ('venta_staging',                 1200, now()),   -- staging / preparación ($) — Arcadia real
  ('venta_split_inversionista_pct', 50,   now())    -- reparto default inversionista (operador = 100 − este)
on conflict (key) do nothing;
