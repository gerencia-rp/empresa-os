-- Flag para distinguir inquilinos vigentes (en "Datos x Casa" actual) de los históricos
-- (solo en "Base de datos Tenant"). Lo setea pm-sync-airtable en cada run.
-- Default false: los tenant-at- que no estén en DxC actual quedan como histórico.
ALTER TABLE pm_tenants ADD COLUMN IF NOT EXISTS is_currently_renting BOOLEAN NOT NULL DEFAULT false;

-- Verificación:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name='pm_tenants' AND column_name='is_currently_renting';  -- 1 fila
