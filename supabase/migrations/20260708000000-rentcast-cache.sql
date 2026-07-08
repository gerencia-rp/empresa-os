-- RentCast: cache por dirección (30 días) + contador de llamadas. Aditivo, soft-delete.
CREATE TABLE IF NOT EXISTS public.rentcast_cache (
  address_norm text NOT NULL,
  endpoint text NOT NULL,            -- avm_value | avm_rent
  address text,
  payload jsonb,                     -- respuesta cruda de RentCast
  value numeric,                     -- valor/renta principal extraído
  fetched_at timestamptz DEFAULT now(),
  active boolean DEFAULT true, archived_at timestamptz,
  PRIMARY KEY (address_norm, endpoint)
);
ALTER TABLE public.rentcast_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rcc_r ON public.rentcast_cache;
CREATE POLICY rcc_r ON public.rentcast_cache FOR SELECT TO authenticated USING (true);
-- solo el service role (edge function) escribe; no policy de write para authenticated

-- contador de llamadas (para el límite de 50 gratis)
CREATE TABLE IF NOT EXISTS public.rentcast_usage (
  id int PRIMARY KEY DEFAULT 1,
  llamadas int DEFAULT 0,
  ultima timestamptz,
  CONSTRAINT solo_una CHECK (id = 1)
);
INSERT INTO public.rentcast_usage (id, llamadas) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.rentcast_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rcu_r ON public.rentcast_usage;
CREATE POLICY rcu_r ON public.rentcast_usage FOR SELECT TO authenticated USING (true);
