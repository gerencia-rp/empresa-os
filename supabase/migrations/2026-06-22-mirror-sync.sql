-- ════════════════════════════════════════════════════════════════
-- 🪞 PM · MIRROR SYNC — columnas de espejo en todas las tablas pm_*
-- Llave estable = external_id (record-id de Airtable, con prefijo) salvo
-- pm_properties que usa airtable_address_id (option_id del select Dirección).
-- active=true mientras el registro exista en Airtable; soft-delete (active=false)
-- cuando desaparece (NO se borra → historia preservada). Idempotente.
-- Correr ANTES de redeployar la edge function.
-- ════════════════════════════════════════════════════════════════

-- ── Columnas de mirror por tabla ──────────────────────────────────
-- pm_properties: ya tiene active (pm-properties-mirror.sql); faltan timestamps.
ALTER TABLE pm_properties ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE pm_properties ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ;

-- pm_units: ya tiene is_active (schema); faltan timestamps.
ALTER TABLE pm_units ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE pm_units ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ;

-- pm_tenants / pm_bookings / pm_payments / pm_expenses: active + timestamps.
ALTER TABLE pm_tenants  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE pm_tenants  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE pm_tenants  ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ;

ALTER TABLE pm_bookings ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE pm_bookings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE pm_bookings ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ;

ALTER TABLE pm_payments ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE pm_payments ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE pm_payments ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ;

ALTER TABLE pm_expenses ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE pm_expenses ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE pm_expenses ADD COLUMN IF NOT EXISTS archived_at    TIMESTAMPTZ;

-- ── Índices únicos sobre la llave estable (necesarios para ON CONFLICT) ──
-- Parciales (WHERE NOT NULL) para no chocar con filas manuales sin llave.
CREATE UNIQUE INDEX IF NOT EXISTS pm_tenants_external_uniq  ON pm_tenants(external_id)  WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pm_bookings_external_uniq ON pm_bookings(external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pm_expenses_external_uniq ON pm_expenses(external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pm_units_external_uniq    ON pm_units(external_id)    WHERE external_id IS NOT NULL;
-- pm_payments ya tiene UNIQUE(external_id) (pm-data-sources-fix.sql); pm_properties usa airtable_address_id.

-- ── Índices de filtrado por actividad (listados del front) ──
CREATE INDEX IF NOT EXISTS pm_tenants_active_idx  ON pm_tenants(active);
CREATE INDEX IF NOT EXISTS pm_bookings_active_idx ON pm_bookings(active);
CREATE INDEX IF NOT EXISTS pm_payments_active_idx ON pm_payments(active);
CREATE INDEX IF NOT EXISTS pm_expenses_active_idx ON pm_expenses(active);

-- ── CHECK de formato sobre address: no existe en el schema (verificado).
--    La llave estable basta; no se agrega ninguno.

-- ── Validación post-sync ──
-- SELECT 'properties' t, count(*) total, count(*) FILTER (WHERE active) activos FROM pm_properties
-- UNION ALL SELECT 'tenants',  count(*), count(*) FILTER (WHERE active) FROM pm_tenants
-- UNION ALL SELECT 'bookings', count(*), count(*) FILTER (WHERE active) FROM pm_bookings
-- UNION ALL SELECT 'payments', count(*), count(*) FILTER (WHERE active) FROM pm_payments
-- UNION ALL SELECT 'expenses', count(*), count(*) FILTER (WHERE active) FROM pm_expenses;
