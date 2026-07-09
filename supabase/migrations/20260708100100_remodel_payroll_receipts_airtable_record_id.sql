-- Aditiva: recId del registro creado en Airtable "Nomina Trabajadores en Campo" (tblsmtrvcJbwwLjch)
-- por la edge function remodel-nomina-writeback. Da idempotencia al write-back (no re-crea si ya existe).
-- Sin DROP/TRUNCATE; idempotente.
alter table if exists public.remodel_payroll_receipts
  add column if not exists airtable_record_id text;

comment on column public.remodel_payroll_receipts.airtable_record_id is
  'recId del registro en Airtable "Nomina Trabajadores en Campo" (tblsmtrvcJbwwLjch) creado por remodel-nomina-writeback. NULL = write-back pendiente/dry-run. Idempotencia del write-back.';
