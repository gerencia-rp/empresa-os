-- ════════════════════════════════════════════════════════════════
-- 🪞 PM · pm_properties como MIRROR de Airtable "Datos x Casa".Dirección
-- Llave estable = airtable_address_id (sel_xxx del single-select).
-- Idempotente. Correr ANTES de redeployar la edge function.
-- ════════════════════════════════════════════════════════════════

-- 1) Llave estable + flag de actividad.
ALTER TABLE pm_properties ADD COLUMN IF NOT EXISTS airtable_address_id TEXT;
ALTER TABLE pm_properties ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- 2) UNIQUE(airtable_address_id).
--    NOTA: NO se hace DEFERRABLE a propósito: una constraint UNIQUE deferrable
--    NO puede usarse como árbitro de INSERT ... ON CONFLICT (que es como upsertea
--    el sync). NULLs múltiples se permiten hasta que el primer sync los popule.
DO $$ BEGIN
  ALTER TABLE pm_properties ADD CONSTRAINT pm_properties_airtable_address_id_uniq UNIQUE (airtable_address_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) La dirección ya NO es la llave: soltar UNIQUE(address) para que el dueño
--    pueda editar el texto libremente (sel_id sigue siendo estable).
ALTER TABLE pm_properties DROP CONSTRAINT IF EXISTS pm_properties_address_unique;

-- 4) No hay CHECK de formato sobre address en el schema (verificado); si existiera
--    alguno con este nombre, se elimina (el dueño podría tener casas fuera de TX).
ALTER TABLE pm_properties DROP CONSTRAINT IF EXISTS pm_properties_address_format_check;

-- ════════════════════════════════════════════════════════════════
-- POBLADO de airtable_address_id (las 18 actuales): lo hace el SYNC, no el SQL
-- (los sel_id viven en Airtable). En el primer sync, la edge function ejecuta:
--   UPDATE pm_properties SET airtable_address_id = <sel_id>
--    WHERE airtable_address_id IS NULL AND address = <option.name>;
-- y luego upsertea por airtable_address_id.
-- ════════════════════════════════════════════════════════════════

-- 5) DESPUÉS del primer sync, correr esto para forzar NOT NULL (solo si no quedan NULLs):
-- DO $$ BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pm_properties WHERE airtable_address_id IS NULL) THEN
--     ALTER TABLE pm_properties ALTER COLUMN airtable_address_id SET NOT NULL;
--   ELSE
--     RAISE NOTICE 'Hay propiedades sin airtable_address_id — corregir el address para que matchee una option.';
--   END IF;
-- END $$;

-- ── Validación post-sync ──
-- SELECT count(*) FROM pm_properties WHERE airtable_address_id IS NULL;     -- esperado 0
-- SELECT count(*) FROM pm_properties WHERE active;                          -- esperado 18
-- SELECT address, airtable_address_id, active FROM pm_properties ORDER BY active DESC, address;
