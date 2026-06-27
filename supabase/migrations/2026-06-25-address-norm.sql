-- Backfill de address_normalized + índice único para dedup estable de propiedades.
-- La edge function pm-sync-airtable popula address_normalized con la MISMA fórmula
-- (LOWER + strip de no-alfanuméricos), así no quedan NULL y habilita ON CONFLICT.

UPDATE pm_properties
SET address_normalized = LOWER(REGEXP_REPLACE(address, '[^a-z0-9]', '', 'gi'))
WHERE address_normalized IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pm_properties_addr_norm_unique
  ON pm_properties(address_normalized)
  WHERE address_normalized IS NOT NULL;

NOTIFY pgrst, 'reload schema';
