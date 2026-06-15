-- ════════════════════════════════════════════════════════════════
-- 🎫 PM · Códigos de reserva (RP-YYYY-NNNNN) + histórico de movimientos
-- pm_bookings.id es UUID, así que el código se genera con una secuencia
-- (no se puede LPAD un UUID). Idempotente.
-- ════════════════════════════════════════════════════════════════

-- ── 1) reservation_code ──
ALTER TABLE pm_bookings ADD COLUMN IF NOT EXISTS reservation_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_bookings_rescode ON pm_bookings(reservation_code) WHERE reservation_code IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS pm_reservation_seq;

-- Backfill ordenado por created_at: RP-<año>-<correlativo 5 díg>
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, COALESCE(EXTRACT(YEAR FROM created_at)::int, 2026) AS yr
           FROM pm_bookings WHERE reservation_code IS NULL
           ORDER BY created_at NULLS LAST, id
  LOOP
    UPDATE pm_bookings
      SET reservation_code = 'RP-' || r.yr || '-' || LPAD(nextval('pm_reservation_seq')::text, 5, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- Trigger: asigna código a las reservas nuevas (insert) que lleguen sin él.
CREATE OR REPLACE FUNCTION pm_set_reservation_code() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reservation_code IS NULL THEN
    NEW.reservation_code := 'RP-' || EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::int
      || '-' || LPAD(nextval('pm_reservation_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pm_reservation_code ON pm_bookings;
CREATE TRIGGER trg_pm_reservation_code BEFORE INSERT ON pm_bookings
  FOR EACH ROW EXECUTE FUNCTION pm_set_reservation_code();

-- ── 2) pm_booking_history (movimientos de unidad) ──
CREATE TABLE IF NOT EXISTS pm_booking_history (
  id                 BIGSERIAL PRIMARY KEY,
  booking_id         UUID REFERENCES pm_bookings(id) ON DELETE CASCADE,
  moved_from_unit_id UUID,
  moved_to_unit_id   UUID,
  moved_by           TEXT,
  reason             TEXT,
  moved_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_bkhist_booking ON pm_booking_history(booking_id);

ALTER TABLE pm_booking_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pm_bkhist_auth ON pm_booking_history;
CREATE POLICY pm_bkhist_auth ON pm_booking_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Validación:
--   SELECT reservation_code FROM pm_bookings ORDER BY reservation_code LIMIT 5;  -- RP-2026-00001…
--   SELECT * FROM pm_booking_history ORDER BY moved_at DESC LIMIT 10;
