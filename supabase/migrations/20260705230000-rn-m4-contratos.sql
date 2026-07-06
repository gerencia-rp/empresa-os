-- RN-M4: contratos + depósitos (espejo de Inquilinos). Aditivo.
ALTER TABLE public.pm_tenants ADD COLUMN IF NOT EXISTS rent_amount numeric;
ALTER TABLE public.pm_tenants ADD COLUMN IF NOT EXISTS contract_start date;
ALTER TABLE public.pm_tenants ADD COLUMN IF NOT EXISTS contract_end date;
ALTER TABLE public.pm_tenants ADD COLUMN IF NOT EXISTS deposit numeric;
ALTER TABLE public.pm_tenants ADD COLUMN IF NOT EXISTS rent_type text;
