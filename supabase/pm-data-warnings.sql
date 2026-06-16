-- ════════════════════════════════════════════════════════════════
-- 🔎 PM · Alertas de integridad de datos (detectadas en el sync)
-- property_id es UUID (no BIGINT). dedup_key permite upsert + auto-resolución.
-- Idempotente. Correr una vez en el SQL editor de Supabase.
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pm_data_warnings (
  id            BIGSERIAL PRIMARY KEY,
  warning_type  TEXT NOT NULL,
  entity_type   TEXT,                       -- booking / unit / payment / tenant / expense
  entity_id     TEXT,                       -- record_id de Airtable (o clave estable)
  property_id   UUID REFERENCES pm_properties(id) ON DELETE SET NULL,
  details       JSONB,
  dedup_key     TEXT UNIQUE,                -- warning_type + entity → upsert
  resolved      BOOLEAN DEFAULT false,
  detected_at   TIMESTAMPTZ DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pm_dw_unresolved ON pm_data_warnings(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_pm_dw_prop ON pm_data_warnings(property_id);

ALTER TABLE pm_data_warnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pm_dw_auth ON pm_data_warnings;
CREATE POLICY pm_dw_auth ON pm_data_warnings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Validación:  SELECT warning_type, count(*) FROM pm_data_warnings WHERE NOT resolved GROUP BY 1;
