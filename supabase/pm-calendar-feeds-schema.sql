-- ════════════════════════════════════════════════════════════════
-- 📅 PM CALENDAR FEEDS · sincronización iCal externa
-- Soporta: Airbnb, VRBO, Booking, Hospitable, Padsplit (custom), otro
-- ════════════════════════════════════════════════════════════════

-- ── 1. NUEVA TABLA: pm_calendar_feeds ──────────────────────────
CREATE TABLE IF NOT EXISTS pm_calendar_feeds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         UUID REFERENCES pm_units(id) ON DELETE CASCADE,
  property_id     UUID REFERENCES pm_properties(id) ON DELETE CASCADE,  -- denormalizado
  -- Plataforma
  platform        TEXT NOT NULL CHECK (platform IN ('airbnb','vrbo','booking','hospitable','padsplit','custom','otro')),
  feed_type       TEXT DEFAULT 'ical' CHECK (feed_type IN ('ical','csv','api','scrape')),
  -- Fuente
  source_url      TEXT,                          -- URL iCal o endpoint
  source_account  TEXT,                          -- email/login si aplica
  -- Defaults para los bookings generados
  default_rent    NUMERIC,                       -- $/noche estimado si iCal no lo trae
  default_period  TEXT DEFAULT 'noche',          -- 'noche','estadia','mensual'
  -- Estado
  active          BOOLEAN DEFAULT TRUE,
  auto_sync       BOOLEAN DEFAULT TRUE,
  sync_interval_h INT DEFAULT 6,                 -- cada cuántas horas hacer sync
  -- Tracking de últimas syncs
  last_synced_at  TIMESTAMPTZ,
  last_status     TEXT,                          -- 'success','error','partial'
  last_error      TEXT,
  last_added      INT DEFAULT 0,
  last_updated    INT DEFAULT 0,
  last_total      INT DEFAULT 0,
  -- Notes
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_feeds_unit ON pm_calendar_feeds(unit_id);
CREATE INDEX IF NOT EXISTS idx_pm_feeds_active ON pm_calendar_feeds(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pm_feeds_auto ON pm_calendar_feeds(auto_sync, last_synced_at) WHERE active = TRUE AND auto_sync = TRUE;

-- ── 2. EXTENDER pm_bookings para tracking iCal ─────────────────
ALTER TABLE pm_bookings
  ADD COLUMN IF NOT EXISTS feed_id     UUID REFERENCES pm_calendar_feeds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_uid TEXT;                  -- UID único del evento iCal (idempotente)

CREATE INDEX IF NOT EXISTS idx_pm_book_feed ON pm_bookings(feed_id);
CREATE INDEX IF NOT EXISTS idx_pm_book_extuid ON pm_bookings(external_uid) WHERE external_uid IS NOT NULL;

-- UNIQUE en external_uid + feed_id para upsert idempotente
DO $$ BEGIN
  ALTER TABLE pm_bookings ADD CONSTRAINT pm_bookings_extuid_unique UNIQUE (external_uid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. RLS ──────────────────────────────────────────────────────
ALTER TABLE pm_calendar_feeds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pm_feeds_all ON pm_calendar_feeds;
CREATE POLICY pm_feeds_all ON pm_calendar_feeds FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 4. VISTA: resumen de feeds ─────────────────────────────────
CREATE OR REPLACE VIEW pm_feeds_summary AS
SELECT
  f.id,
  f.platform,
  f.active,
  f.auto_sync,
  f.last_synced_at,
  f.last_status,
  f.last_total AS reservas_sincronizadas,
  u.code AS unit_code,
  u.name AS unit_name,
  p.name AS property_name,
  EXTRACT(HOUR FROM (NOW() - f.last_synced_at)) AS horas_desde_sync
FROM pm_calendar_feeds f
LEFT JOIN pm_units u ON u.id = f.unit_id
LEFT JOIN pm_properties p ON p.id = COALESCE(f.property_id, u.property_id);

-- ✅ LISTO.
-- Verificá: SELECT * FROM pm_calendar_feeds LIMIT 5;
