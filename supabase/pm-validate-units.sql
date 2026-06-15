-- ════════════════════════════════════════════════════════════════
-- ✅ Validación post-sync · unidades físicas únicas + bookings separados
-- Correr DESPUÉS de pm-fix-unit-dedup.sql + redeploy + sync.
-- ════════════════════════════════════════════════════════════════

-- 1) CERO duplicados de unidad (debe devolver 0 filas)
SELECT property_id, name, COUNT(*)
FROM pm_units
GROUP BY property_id, name
HAVING COUNT(*) > 1;

-- 2) 1607 Picnic Cove: unidades únicas + cantidad de bookings por unidad
--    (esperado: ~3 unidades únicas, 4+ bookings en total)
SELECT u.name, COUNT(b.id) AS bookings_count
FROM pm_units u
LEFT JOIN pm_bookings b ON b.unit_id = u.id
WHERE u.property_id IN (
  SELECT id FROM pm_properties WHERE address ILIKE '%picnic%'
)
GROUP BY u.id, u.name
ORDER BY u.name;

-- 3) Sanity de joins pm_payments → pm_units (no debe haber unit_id colgados)
--    Cero filas = todos los unit_id de pagos apuntan a una unidad existente.
SELECT COUNT(*) AS pagos_con_unit_id_invalido
FROM pm_payments p
WHERE p.unit_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pm_units u WHERE u.id = p.unit_id);

-- Conteos totales esperados:
--   SELECT count(*) AS units FROM pm_units;       -- ~30-35 (no 52)
--   SELECT count(*) AS bookings FROM pm_bookings; -- N reservas (varias por unidad)
