-- Aditiva: columna para "Pago Total Dia" (Airtable fldKgQ5Eyv5esHpSQ, formula horas×rate) en el espejo de horas.
-- Fuente ÚNICA del pago diario del desglose quincenal de Nómina y Pagos (Command Center de Remodelación).
-- La pobla sync-remodel-workers; el front NO recalcula. Sin DROP/TRUNCATE; idempotente.
alter table if exists public.remodel_worker_hours
  add column if not exists pago_total_dia numeric;

comment on column public.remodel_worker_hours.pago_total_dia is
  'Pago Total Dia (Airtable fldKgQ5Eyv5esHpSQ, formula horas×tarifa). Fuente única del pago diario del desglose quincenal. Escrito por sync-remodel-workers. NO recalcular en el front.';
