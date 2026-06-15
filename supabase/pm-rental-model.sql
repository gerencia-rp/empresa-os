-- ════════════════════════════════════════════════════════════════
-- 🏠 PM · Modelo de renta → conteo de unidades rentables
-- pm_properties.rental_model YA existía con un CHECK de vocabulario viejo
-- (casa_completa/por_habitaciones/por_estudios/por_apartamentos/mixto).
-- Migramos al vocabulario nuevo (…/por_unidades/mixta) sin romper datos.
-- Idempotente. Correr una vez en el SQL editor de Supabase.
-- ════════════════════════════════════════════════════════════════

-- 1) Soltar el CHECK viejo
ALTER TABLE pm_properties DROP CONSTRAINT IF EXISTS pm_properties_rental_model_check;

-- 2) Normalizar valores legacy al vocabulario nuevo
UPDATE pm_properties SET rental_model = CASE
  WHEN rental_model IN ('por_estudios','por_apartamentos') THEN 'por_unidades'
  WHEN rental_model = 'mixto'                              THEN 'mixta'
  WHEN rental_model IN ('casa_completa','por_habitaciones','por_unidades','mixta') THEN rental_model
  ELSE 'casa_completa'
END;

-- 3) Default + CHECK nuevo
ALTER TABLE pm_properties ALTER COLUMN rental_model SET DEFAULT 'casa_completa';
ALTER TABLE pm_properties ADD CONSTRAINT pm_properties_rental_model_check
  CHECK (rental_model IN ('casa_completa','por_habitaciones','por_unidades','mixta'));

-- 4) Set manual por casa (mientras el equipo agrega el campo en Airtable)
UPDATE pm_properties SET rental_model = CASE
  WHEN address ILIKE '%echo%'         THEN 'casa_completa'
  WHEN address ILIKE '%garden path%'  THEN 'por_unidades'
  WHEN address ILIKE '%picnic%'       THEN 'mixta'
  WHEN address ILIKE '%dove spring%'  THEN 'por_habitaciones'
  WHEN address ILIKE '%bartlett%'     THEN 'casa_completa'
  WHEN address ILIKE '%capps%'        THEN 'casa_completa'
  WHEN address ILIKE '%capitol%'      THEN 'mixta'
  WHEN address ILIKE '%nesting%'      THEN 'casa_completa'
  WHEN address ILIKE '%barkbridge%'   THEN 'por_habitaciones'
  WHEN address ILIKE '%michelle%'     THEN 'casa_completa'
  WHEN address ILIKE '%bramble%'      THEN 'mixta'
  WHEN address ILIKE '%meadow crest%' THEN 'casa_completa'
  WHEN address ILIKE '%idlewood%'     THEN 'casa_completa'
  WHEN address ILIKE '%shadow bend%'  THEN 'por_unidades'
  WHEN address ILIKE '%stonleigh%'    THEN 'por_habitaciones'
  WHEN address ILIKE '%bethune%'      THEN 'por_unidades'
  WHEN address ILIKE '%virginia%'     THEN 'casa_completa'
  WHEN address ILIKE '%childress%'    THEN 'por_habitaciones'
  ELSE 'casa_completa'
END;

-- 5) Vista de unidades rentables por modelo
CREATE OR REPLACE VIEW pm_rentable_units AS
SELECT
  p.id   AS property_id,
  p.address,
  p.rental_model,
  CASE
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

-- Validación:
--   SELECT SUM(rentable_units) FROM pm_rentable_units p
--     JOIN pm_properties pr ON pr.id=p.property_id WHERE pr.status='activa';  -- ~31
--   SELECT address, rental_model, rentable_units FROM pm_rentable_units ORDER BY address;
