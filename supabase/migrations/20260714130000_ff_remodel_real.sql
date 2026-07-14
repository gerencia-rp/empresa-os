-- Ficha "Compra $0" (14-jul) · el campo Airtable "Costo Remodelación Real" (fld9VNYFBzFI3tRdc) estaba
-- mapeado en el sync pero NUNCA guardado — es el rehab real por deal (Charles $110,000) cuando no hay draws.
-- Rollback: alter table ff_deals drop column remodel_real;
alter table public.ff_deals add column if not exists remodel_real numeric;
