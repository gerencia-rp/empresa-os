-- ════════════════════════════════════════════════════════════════
-- 🔧 PM · Fuentes de datos por módulo (FIX 1 props + FIX 2 pagos)
-- Idempotente. Correr en el SQL editor de Supabase ANTES de redeployar
-- la edge function (el sync upsertea por address_normalized).
-- Requiere que pm-units-rule.sql ya haya creado las columnas cantidad_*.
-- ════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════
-- FIX 2 — Pagos: deduplicar + UNIQUE(external_id)
-- Causa del 3× (891 vs 302): el ADD CONSTRAINT previo fallaba por dups
-- (unique_violation no estaba atrapado) → nunca se creó la constraint →
-- el upsert ON CONFLICT no podía deduplicar.
-- ════════════════════════════════════════════════════════════════
-- 1) Borrar duplicados, manteniendo el más reciente por external_id.
DELETE FROM pm_payments a
USING pm_payments b
WHERE a.external_id IS NOT NULL
  AND a.external_id = b.external_id
  AND ( a.created_at < b.created_at
        OR (a.created_at = b.created_at AND a.ctid < b.ctid) );

-- 2) Crear la constraint (idempotente).
DO $$ BEGIN
  ALTER TABLE pm_payments ADD CONSTRAINT pm_payments_external_uniq UNIQUE (external_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ════════════════════════════════════════════════════════════════
-- FIX 1 — Propiedades: 1 fila por dirección normalizada
-- ════════════════════════════════════════════════════════════════

-- 1) Normalizador de dirección (mirror del normalizeAddress de la edge function):
--    lowercase · sufijos a forma corta · quita ciudad/estado · quita ZIP · colapsa espacios.
CREATE OR REPLACE FUNCTION pm_normalize_address(addr text) RETURNS text AS $$
  WITH s1 AS (SELECT regexp_replace(lower(coalesce(addr,'')), '[,.]', ' ', 'g') AS s),
  s2 AS (SELECT
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    regexp_replace(regexp_replace(regexp_replace(s,
      '\mdrive\M','dr','g'), '\mcourt\M','ct','g'), '\mplace\M','pl','g'),
      '\mtrail\M','trl','g'), '\mlane\M','ln','g'), '\mcove\M','cv','g'),
      '\mstreet\M','st','g'), '\mavenue\M','ave','g') AS s FROM s1),
  s3 AS (SELECT
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(s,
      '\mround rock\M',' ','g'), '\maustin\M',' ','g'), '\mmarlin\M',' ','g'),
      '\mtexas\M',' ','g'), '\mtx\M',' ','g') AS s FROM s2),
  s4 AS (SELECT regexp_replace(s, '\m\d{5}\M', ' ', 'g') AS s FROM s3)
  SELECT btrim(regexp_replace(s, '\s+', ' ', 'g')) FROM s4;
$$ LANGUAGE sql IMMUTABLE;

-- 2) Columna address_normalized (nullable por ahora; se hace UNIQUE NOT NULL al final).
ALTER TABLE pm_properties ADD COLUMN IF NOT EXISTS address_normalized TEXT;
UPDATE pm_properties SET address_normalized = pm_normalize_address(address);

-- 3) MERGE de duplicados por address_normalized.
--    Ganador = el que tiene MÁS hijos (units+bookings+payments+expenses); desempata por id.
--    Los hijos de los perdedores se reapuntan al ganador; los perdedores se borran.
DO $$
DECLARE r RECORD;
BEGIN
  CREATE TEMP TABLE _pm_merge ON COMMIT DROP AS
  WITH score AS (
    SELECT p.id, p.address_normalized,
           (SELECT count(*) FROM pm_units    u  WHERE u.property_id  = p.id)
         + (SELECT count(*) FROM pm_bookings bk WHERE bk.property_id = p.id)
         + (SELECT count(*) FROM pm_payments pa WHERE pa.property_id = p.id)
         + (SELECT count(*) FROM pm_expenses e  WHERE e.property_id  = p.id) AS n
      FROM pm_properties p
     WHERE p.address_normalized IS NOT NULL AND p.address_normalized <> ''
  ),
  ranked AS (
    SELECT id, address_normalized,
           first_value(id) OVER (PARTITION BY address_normalized ORDER BY n DESC, id ASC) AS winner_id,
           row_number()    OVER (PARTITION BY address_normalized ORDER BY n DESC, id ASC) AS rn
      FROM score
  )
  SELECT id AS loser_id, winner_id FROM ranked WHERE rn > 1;

  -- Reapuntar hijos al ganador
  UPDATE pm_units    u  SET property_id = m.winner_id FROM _pm_merge m WHERE u.property_id  = m.loser_id;
  UPDATE pm_bookings bk SET property_id = m.winner_id FROM _pm_merge m WHERE bk.property_id = m.loser_id;
  UPDATE pm_payments pa SET property_id = m.winner_id FROM _pm_merge m WHERE pa.property_id = m.loser_id;
  UPDATE pm_expenses e  SET property_id = m.winner_id FROM _pm_merge m WHERE e.property_id  = m.loser_id;
  -- Borrar perdedores
  DELETE FROM pm_properties p USING _pm_merge m WHERE p.id = m.loser_id;

  GET DIAGNOSTICS r = ROW_COUNT;
  RAISE NOTICE 'pm_properties: % duplicados eliminados por merge', r;
END $$;

-- 4) UNIQUE + NOT NULL en address_normalized (después del merge, sin violaciones).
DO $$ BEGIN
  ALTER TABLE pm_properties ADD CONSTRAINT pm_properties_addr_norm_uniq UNIQUE (address_normalized);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- (Solo poner NOT NULL si no quedaron NULLs)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pm_properties WHERE address_normalized IS NULL) THEN
    ALTER TABLE pm_properties ALTER COLUMN address_normalized SET NOT NULL;
  ELSE
    RAISE NOTICE 'address_normalized tiene NULLs — no se aplicó NOT NULL';
  END IF;
END $$;

-- ── Validación ──
-- SELECT count(*) AS propiedades FROM pm_properties;                       -- esperado ~18
-- SELECT address_normalized, count(*) FROM pm_properties
--   GROUP BY address_normalized HAVING count(*)>1;                          -- esperado 0 filas
-- SELECT count(*) AS pagos FROM pm_payments;                               -- esperado ~302
