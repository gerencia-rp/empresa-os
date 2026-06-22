-- ════════════════════════════════════════════════════════════════
-- 🏠 PM · Regla DEFINITIVA de conteo de unidades rentables
--
-- Modelo "Ambos": campos numéricos manuales (cuando el dueño los carga)
-- con fallback al rental_model + pm_units existente cuando no hay números.
--
-- Regla de negocio:
--   - casa por habitaciones        → 1 unidad (es 1 casa)
--   - casa completa (sola o anexa) → 1 unidad
--   - cada estudio                 → 1 unidad
--   - cada apartamento             → 1 unidad
--
-- Idempotente (IF NOT EXISTS / CREATE OR REPLACE). Correr en el SQL editor.
-- ════════════════════════════════════════════════════════════════

-- 1) Campos numéricos manuales en pm_properties (no existen en Airtable;
--    el dueño los carga a mano por propiedad — en la app o en Airtable luego).
ALTER TABLE pm_properties
  ADD COLUMN IF NOT EXISTS cantidad_estudios        INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cantidad_aptos           INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cantidad_casa_completa   INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rentada_por_habitaciones BOOLEAN NOT NULL DEFAULT false;

-- 2) Función de conteo a partir de los campos numéricos (regla del negocio).
--    NOTA: la función "sketch" del spec usaba OR (colapsaba casa_completa +
--    por_habitaciones en 1), pero el ejemplo 4 del negocio
--    ("casa por habitaciones + casa completa anexa + 2 estudios = 4") exige
--    SUMARLAS. Implementamos la versión aditiva que satisface los 4 ejemplos:
--      units = cantidad_casa_completa + (por_habitaciones?1:0) + estudios + aptos
CREATE OR REPLACE FUNCTION pm_calc_rentable_units(p_property pm_properties)
RETURNS INT AS $$
DECLARE
  v_units INT := 0;
BEGIN
  -- + cada casa completa (sola o anexa)
  v_units := v_units + COALESCE(p_property.cantidad_casa_completa, 0);
  -- + 1 si la casa principal se renta por habitaciones (sigue siendo 1 casa)
  IF COALESCE(p_property.rentada_por_habitaciones, false) = true THEN
    v_units := v_units + 1;
  END IF;
  -- + cada estudio
  v_units := v_units + COALESCE(p_property.cantidad_estudios, 0);
  -- + cada apartamento
  v_units := v_units + COALESCE(p_property.cantidad_aptos, 0);
  RETURN v_units;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3) ¿La propiedad tiene números manuales cargados? (algo fuera del default)
CREATE OR REPLACE FUNCTION pm_has_manual_units(p pm_properties)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(p.cantidad_estudios, 0) > 0
      OR COALESCE(p.cantidad_aptos, 0) > 0
      OR COALESCE(p.cantidad_casa_completa, 0) > 0
      OR COALESCE(p.rentada_por_habitaciones, false) = true;
$$ LANGUAGE sql IMMUTABLE;

-- 4) Vista: prefiere los números manuales; si no hay, cae al modelo + pm_units.
CREATE OR REPLACE VIEW pm_rentable_units AS
SELECT
  p.id   AS property_id,
  p.address,
  p.rental_model,
  CASE
    WHEN pm_has_manual_units(p) THEN pm_calc_rentable_units(p)
    -- ── Fallback (sin números manuales): lógica por rental_model existente ──
    WHEN p.rental_model IN ('casa_completa','por_habitaciones') THEN 1
    WHEN p.rental_model = 'por_unidades' THEN
      (SELECT COUNT(*) FROM pm_units u
        WHERE u.property_id = p.id
          AND (u.name ILIKE '%estudio%' OR u.name ILIKE '%apart%' OR u.name ILIKE '%unidad%'))
    WHEN p.rental_model = 'mixta' THEN
      1 + (SELECT COUNT(*) FROM pm_units u
            WHERE u.property_id = p.id
              AND (u.name ILIKE '%estudio%' OR u.name ILIKE '%apart%'))
    ELSE 1
  END AS rentable_units
FROM pm_properties p;

-- ════════════════════════════════════════════════════════════════
-- 5) Detección de propiedades DUPLICADAS por dirección normalizada.
--    (No hay columna direccion_normalizada: normalizamos al vuelo.)
--    Si devuelve filas, hacer el MERGE manual revisando cuál tiene más datos.
-- ════════════════════════════════════════════════════════════════
-- SELECT lower(btrim(address)) AS dir_norm, COUNT(*) AS n,
--        array_agg(id) AS ids, array_agg(status) AS estados
--   FROM pm_properties
--  GROUP BY lower(btrim(address))
-- HAVING COUNT(*) > 1
--  ORDER BY n DESC;
--
-- MERGE manual (plantilla, NO automático — destructivo):
--   1) Elegí el id "ganador" (el de más datos / status activa).
--   2) Re-apuntá hijos al ganador:
--        UPDATE pm_units    SET property_id = :ganador WHERE property_id = :perdedor;
--        UPDATE pm_bookings SET property_id = :ganador WHERE property_id = :perdedor;
--        UPDATE pm_payments SET property_id = :ganador WHERE property_id = :perdedor;
--        UPDATE pm_expenses SET property_id = :ganador WHERE property_id = :perdedor;
--   3) DELETE FROM pm_properties WHERE id = :perdedor;

-- ── Validación post-migración ──
-- SELECT SUM(rentable_units) FROM pm_rentable_units ru
--   JOIN pm_properties p ON p.id = ru.property_id WHERE p.status = 'activa';
-- SELECT address, rental_model, rentable_units FROM pm_rentable_units ORDER BY address;
