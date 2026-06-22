-- ════════════════════════════════════════════════════════════════
-- ✅ PM · Verificación post-migración de unidades rentables
-- Correr DESPUÉS de pm-units-rule.sql (+ redeploy edge fn + sync).
-- Solo SELECTs (no modifica nada). Pegar bloque por bloque en el SQL editor.
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1) Confirmar que las columnas nuevas existen en pm_properties
--    Esperado: 4 filas (cantidad_estudios, cantidad_aptos,
--    cantidad_casa_completa, rentada_por_habitaciones).
-- ────────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_name = 'pm_properties'
   AND column_name IN ('cantidad_estudios','cantidad_aptos',
                       'cantidad_casa_completa','rentada_por_habitaciones')
 ORDER BY column_name;


-- ────────────────────────────────────────────────────────────────
-- 2) Detectar propiedades DUPLICADAS por dirección normalizada
--    Esperado ideal: 0 filas. Si hay filas → merge manual (ver pm-units-rule.sql).
-- ────────────────────────────────────────────────────────────────
SELECT lower(btrim(address)) AS dir_norm,
       COUNT(*)              AS n,
       array_agg(id)         AS ids,
       array_agg(status)     AS estados
  FROM pm_properties
 GROUP BY lower(btrim(address))
HAVING COUNT(*) > 1
 ORDER BY n DESC;


-- ────────────────────────────────────────────────────────────────
-- 3) Por cada propiedad: modelo, campos numéricos y unidades rentables
--    (pm_calc_rentable_units usa la fórmula aditiva del negocio).
-- ────────────────────────────────────────────────────────────────
SELECT
  p.address,
  p.status,
  p.rental_model,
  p.cantidad_estudios,
  p.cantidad_aptos,
  p.cantidad_casa_completa,
  p.rentada_por_habitaciones,
  pm_has_manual_units(p)        AS usa_numeros_manuales,
  pm_calc_rentable_units(p)     AS unidades_rentables_manual,
  ru.rentable_units             AS unidades_rentables_vista  -- vista (manual o fallback)
FROM pm_properties p
JOIN pm_rentable_units ru ON ru.property_id = p.id
ORDER BY p.address;


-- ────────────────────────────────────────────────────────────────
-- 4) SPOT-CHECK de 5 propiedades (elige representantes por modelo/criterio).
--    Cada bloque devuelve la propiedad + sus pm_units + flag de ocupación.
--    "activa_hoy" = booking activo/confirmado con start<=hoy<=end (o sin end).
-- ────────────────────────────────────────────────────────────────

-- 4.a) UNA "por habitaciones"  → esperado: unidades_rentables = 1
SELECT p.address, p.rental_model, pm_calc_rentable_units(p) AS unidades_rentables,
       p.rentada_por_habitaciones, p.cantidad_estudios, p.cantidad_aptos
  FROM pm_properties p
 WHERE p.rental_model = 'por_habitaciones'
 ORDER BY p.address
 LIMIT 1;

-- 4.b) UNA con casa completa + estudios  → esperado: 1 (casa) + n estudios
SELECT p.address, p.rental_model, pm_calc_rentable_units(p) AS unidades_rentables,
       p.cantidad_casa_completa, p.cantidad_estudios, p.cantidad_aptos,
       p.rentada_por_habitaciones
  FROM pm_properties p
 WHERE COALESCE(p.cantidad_casa_completa,0) > 0
   AND COALESCE(p.cantidad_estudios,0) > 0
 ORDER BY p.address
 LIMIT 1;

-- 4.c) UNA "mixta" (habs + aptos)  → esperado: 1 + aptos
SELECT p.address, p.rental_model, pm_calc_rentable_units(p) AS unidades_rentables,
       p.rentada_por_habitaciones, p.cantidad_casa_completa,
       p.cantidad_estudios, p.cantidad_aptos
  FROM pm_properties p
 WHERE p.rental_model = 'mixta'
 ORDER BY p.address
 LIMIT 1;

-- 4.d) UNA con solo estudios  → esperado: n estudios (sin casa/por-hab)
SELECT p.address, p.rental_model, pm_calc_rentable_units(p) AS unidades_rentables,
       p.cantidad_estudios, p.cantidad_aptos, p.cantidad_casa_completa,
       p.rentada_por_habitaciones
  FROM pm_properties p
 WHERE COALESCE(p.cantidad_estudios,0) > 0
   AND COALESCE(p.cantidad_aptos,0) = 0
   AND COALESCE(p.cantidad_casa_completa,0) = 0
   AND COALESCE(p.rentada_por_habitaciones,false) = false
 ORDER BY p.address
 LIMIT 1;

-- 4.e) 1607 Picnic Cove (histórico problemático): propiedad + sus unidades + ocupación
SELECT
  p.address,
  p.rental_model,
  pm_calc_rentable_units(p)  AS unidades_rentables,
  u.name                     AS unidad,
  u.unit_type,
  EXISTS (
    SELECT 1 FROM pm_bookings b
     WHERE b.unit_id = u.id
       AND b.status IN ('activo','confirmado')
       AND b.start_date <= current_date
       AND (b.end_date IS NULL OR b.end_date >= current_date)
  ) AS activa_hoy
FROM pm_properties p
JOIN pm_units u ON u.property_id = p.id
WHERE p.address ILIKE '%picnic%'
ORDER BY u.name;


-- ────────────────────────────────────────────────────────────────
-- 5) AGREGADO del portafolio (solo propiedades activas) + invariante.
--    ocupadas_por_prop = LEAST(rentables, unidades_físicas_con_booking_activo)
--    libres = rentables - ocupadas  → debe cumplirse ocupadas+libres=rentables.
-- ────────────────────────────────────────────────────────────────
WITH activas AS (
  SELECT p.id, p.address, ru.rentable_units
    FROM pm_properties p
    JOIN pm_rentable_units ru ON ru.property_id = p.id
   WHERE p.status = 'activa'
),
ocup AS (
  SELECT a.id,
         a.rentable_units,
         LEAST(
           a.rentable_units,
           (SELECT COUNT(*) FROM pm_units u
             WHERE u.property_id = a.id
               AND EXISTS (
                 SELECT 1 FROM pm_bookings b
                  WHERE b.unit_id = u.id
                    AND b.status IN ('activo','confirmado')
                    AND b.start_date <= current_date
                    AND (b.end_date IS NULL OR b.end_date >= current_date)
               ))
         ) AS ocupadas
    FROM activas a
)
SELECT
  (SELECT COUNT(*) FROM activas)                 AS total_propiedades_activas,
  COALESCE(SUM(rentable_units),0)                AS total_unidades_rentables,
  COALESCE(SUM(ocupadas),0)                      AS total_ocupadas,
  COALESCE(SUM(rentable_units - ocupadas),0)     AS total_libres,
  -- invariante: debe ser TRUE
  (COALESCE(SUM(ocupadas),0) + COALESCE(SUM(rentable_units - ocupadas),0)
     = COALESCE(SUM(rentable_units),0))          AS invariante_ok
FROM ocup;
