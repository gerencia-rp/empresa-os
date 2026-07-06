-- QB multi-empresa: una conexión por company de QuickBooks, mapeada a empresa del holding.
-- SEGURIDAD: tokens SOLO service_role (ninguna policy de SELECT para anon/authenticated).
CREATE TABLE IF NOT EXISTS public.qb_connections (
  realm_id text PRIMARY KEY,            -- company id de QBO
  company_name text,                    -- nombre legal en QBO
  empresa text,                         -- fix_flip | remodelacion | rentas | educacion
  access_token text, refresh_token text,
  token_expires_at timestamptz, refresh_expires_at timestamptz,
  connected_at timestamptz DEFAULT now(), last_refreshed_at timestamptz,
  active boolean DEFAULT true, archived_at timestamptz
);
ALTER TABLE public.qb_connections ENABLE ROW LEVEL SECURITY;
-- (sin policies: solo service_role accede)

-- Estado visible para la UI (SIN tokens): vista segura
CREATE OR REPLACE VIEW public.v_qb_status AS
SELECT empresa, company_name, realm_id, connected_at, last_refreshed_at, active
FROM public.qb_connections WHERE active;
