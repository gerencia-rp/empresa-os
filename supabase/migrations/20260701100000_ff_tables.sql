-- ════════════════════════════════════════════════════════════════
-- 🏗️ Fix & Flip · tablas espejo (Airtable applMXFyPq1hXj7iN → ff_*)
-- Aditivas. SOLO LECTURA de datos (Airtable = fuente de verdad).
-- El front lee ff_* con la anon key (RLS SELECT para anon/authenticated), igual que pm_*.
-- ════════════════════════════════════════════════════════════════

-- Deals (Propiedades)
CREATE TABLE IF NOT EXISTS ff_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id TEXT UNIQUE,
  address TEXT, address_norm TEXT, city TEXT,
  stage TEXT,            -- Estado Actual (Adquirida/En Rehab/En Venta/Rentada/Refinanciada/Vendida)
  strategy TEXT,         -- flip | hold
  purchase_price NUMERIC, remodel_est NUMERIC, arv NUMERIC, appraisal NUMERIC,
  hml_payment NUMERIC, ref30_payment NUMERIC,
  sqft INT, cashout NUMERIC,
  close_date DATE, acquisition TEXT,
  active BOOLEAN DEFAULT TRUE, last_synced_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ff_deals_norm ON ff_deals(address_norm);

-- Desglose de costos por casa (all-in / déficit)
CREATE TABLE IF NOT EXISTS ff_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id TEXT UNIQUE,
  address TEXT, address_norm TEXT,
  total_draws NUMERIC, remodel_internal NUMERIC, remodel_complete NUMERIC,
  hml_months INT, interest_hml NUMERIC, services_hml NUMERIC,
  interest_until_rent NUMERIC, furniture NUMERIC, other_costs NUMERIC,
  net_total NUMERIC, cashout_refi TEXT,
  active BOOLEAN DEFAULT TRUE, last_synced_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ff_draws_norm ON ff_draws(address_norm);

-- Inversionistas
CREATE TABLE IF NOT EXISTS ff_investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id TEXT UNIQUE,
  name TEXT, label TEXT, email TEXT, phone TEXT, city TEXT, state TEXT,
  ranges TEXT, stage TEXT, has_partner TEXT, partner_name TEXT,
  active BOOLEAN DEFAULT TRUE, last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ff_deals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ff_draws     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ff_investors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ff_deals_read     ON ff_deals;
DROP POLICY IF EXISTS ff_draws_read     ON ff_draws;
DROP POLICY IF EXISTS ff_investors_read ON ff_investors;
CREATE POLICY ff_deals_read     ON ff_deals     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ff_draws_read     ON ff_draws     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ff_investors_read ON ff_investors FOR SELECT TO anon, authenticated USING (true);
