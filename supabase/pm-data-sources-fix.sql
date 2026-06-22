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

-- 2) Columna address_normalized SOLO como helper de matcheo (pagos/gastos).
--    La clave canónica de propiedad es el address LITERAL (con coma).
ALTER TABLE pm_properties ADD COLUMN IF NOT EXISTS address_normalized TEXT;
UPDATE pm_properties SET address_normalized = pm_normalize_address(address);

-- 3) LIMPIEZA: las filas con dirección CORTA (sin coma) son legacy. Se reapuntan
--    sus hijos a la fila LARGA (literal, con coma) que normaliza igual, y se borran.
DO $$
DECLARE n_short INT; n_exact INT;
BEGIN
  -- 3a) cortas (sin coma) → gemelo largo (con coma) por address_normalized
  CREATE TEMP TABLE _pm_short ON COMMIT DROP AS
  SELECT s.id AS loser_id,
         (SELECT l.id FROM pm_properties l
           WHERE l.address LIKE '%,%'
             AND l.address_normalized = s.address_normalized
           ORDER BY l.id LIMIT 1) AS winner_id
    FROM pm_properties s
   WHERE s.address NOT LIKE '%,%';

  DELETE FROM _pm_short WHERE winner_id IS NULL;  -- corta sin gemelo largo → se deja (no perder data)

  UPDATE pm_units    u  SET property_id = m.winner_id FROM _pm_short m WHERE u.property_id  = m.loser_id;
  UPDATE pm_bookings bk SET property_id = m.winner_id FROM _pm_short m WHERE bk.property_id = m.loser_id;
  UPDATE pm_payments pa SET property_id = m.winner_id FROM _pm_short m WHERE pa.property_id = m.loser_id;
  UPDATE pm_expenses e  SET property_id = m.winner_id FROM _pm_short m WHERE e.property_id  = m.loser_id;
  DELETE FROM pm_properties p USING _pm_short m WHERE p.id = m.loser_id;
  GET DIAGNOSTICS n_short = ROW_COUNT;

  -- 3b) duplicados EXACTOS de address literal (por si hay) → ganador = más hijos
  CREATE TEMP TABLE _pm_dup ON COMMIT DROP AS
  WITH score AS (
    SELECT p.id, p.address,
           (SELECT count(*) FROM pm_units u WHERE u.property_id=p.id)
         + (SELECT count(*) FROM pm_bookings b WHERE b.property_id=p.id)
         + (SELECT count(*) FROM pm_payments pa WHERE pa.property_id=p.id)
         + (SELECT count(*) FROM pm_expenses e WHERE e.property_id=p.id) AS n
      FROM pm_properties p
  ),
  ranked AS (
    SELECT id, address,
           first_value(id) OVER (PARTITION BY address ORDER BY n DESC, id ASC) AS winner_id,
           row_number()    OVER (PARTITION BY address ORDER BY n DESC, id ASC) AS rn
      FROM score
  )
  SELECT id AS loser_id, winner_id FROM ranked WHERE rn > 1;

  UPDATE pm_units    u  SET property_id = m.winner_id FROM _pm_dup m WHERE u.property_id  = m.loser_id;
  UPDATE pm_bookings bk SET property_id = m.winner_id FROM _pm_dup m WHERE bk.property_id = m.loser_id;
  UPDATE pm_payments pa SET property_id = m.winner_id FROM _pm_dup m WHERE pa.property_id = m.loser_id;
  UPDATE pm_expenses e  SET property_id = m.winner_id FROM _pm_dup m WHERE e.property_id  = m.loser_id;
  DELETE FROM pm_properties p USING _pm_dup m WHERE p.id = m.loser_id;
  GET DIAGNOSTICS n_exact = ROW_COUNT;

  RAISE NOTICE 'pm_properties: % cortas reapuntadas+borradas · % duplicados exactos eliminados', n_short, n_exact;
END $$;

-- 4) UNIQUE en address LITERAL (después de limpiar, sin violaciones).
DO $$ BEGIN
  ALTER TABLE pm_properties ADD CONSTRAINT pm_properties_address_unique UNIQUE (address);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Validación ──
-- SELECT count(*) AS propiedades FROM pm_properties;                 -- esperado 18
-- SELECT address, count(*) FROM pm_properties
--   GROUP BY address HAVING count(*)>1;                              -- esperado 0 filas
-- SELECT address FROM pm_properties WHERE address NOT LIKE '%,%';    -- esperado 0 filas (sin cortas)
-- SELECT count(*) AS pagos FROM pm_payments;                         -- esperado ~302
