-- ════════════════════════════════════════════════════════════════
-- 🪞 PM · MIRROR estricto en tablas auxiliares
-- Extiende el mirror (active / last_synced_at / archived_at) a:
--   pm_payroll · pm_credentials · pm_wifi_credentials · pm_tasks
-- Regla del dueño: "si no está en Airtable, no está en la app — en cada sync".
-- Idempotente. Correr ANTES de redeployar y de habilitar el archivado.
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['pm_payroll','pm_credentials','pm_wifi_credentials','pm_tasks']
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ', t);
    -- índice único parcial sobre external_id (necesario para ON CONFLICT; no choca con manuales sin llave)
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I(external_id) WHERE external_id IS NOT NULL', t || '_external_uniq', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(active)', t || '_active_idx', t);
  END LOOP;
END $$;

-- ── Validación ──
-- SELECT table_name, column_name FROM information_schema.columns
--  WHERE table_name IN ('pm_payroll','pm_credentials','pm_wifi_credentials','pm_tasks')
--    AND column_name IN ('active','last_synced_at','archived_at') ORDER BY 1,2;
