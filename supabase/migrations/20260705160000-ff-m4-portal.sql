-- FF M4: datos de capital + links inversionista↔casa para el portal. Aditivo.
ALTER TABLE public.ff_deals ADD COLUMN IF NOT EXISTS investor_rec_ids text;
ALTER TABLE public.ff_deals ADD COLUMN IF NOT EXISTS capital_inversionista numeric;
ALTER TABLE public.ff_deals ADD COLUMN IF NOT EXISTS rentabilidad_prometida numeric;
ALTER TABLE public.ff_deals ADD COLUMN IF NOT EXISTS utilidad_entregada numeric;
ALTER TABLE public.ff_deals ADD COLUMN IF NOT EXISTS deficit_total numeric;
ALTER TABLE public.ff_deals ADD COLUMN IF NOT EXISTS renta_mensual numeric;
ALTER TABLE public.ff_deals ADD COLUMN IF NOT EXISTS gastos_mensuales numeric;
ALTER TABLE public.ff_deals ADD COLUMN IF NOT EXISTS ownership_pct numeric;
ALTER TABLE public.ff_investors ADD COLUMN IF NOT EXISTS capital_aportado numeric;
ALTER TABLE public.ff_investors ADD COLUMN IF NOT EXISTS capital_pagado numeric;
ALTER TABLE public.ff_investors ADD COLUMN IF NOT EXISTS deal_rec_ids text;
