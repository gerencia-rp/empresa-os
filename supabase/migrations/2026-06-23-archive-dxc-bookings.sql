-- ════════════════════════════════════════════════════════════════
-- 🧹 PM · Archivar bookings legacy creados desde "Datos x Casa" (booking-dxc-*)
-- Regla del dueño: Reservas/Inquilinos = SOLO "Base de datos Tenant".
-- "Datos x Casa" alimenta propiedades/units, NO reservas.
-- El sync nuevo ya no crea booking-dxc; esto limpia los ~41 que quedaron activos
-- (fantasmas: p.ej. 1302 Garden Apto 2 con Jackelin aunque está disponible en Airtable).
-- Idempotente. Correr en el SQL editor.
-- ════════════════════════════════════════════════════════════════

-- 1) DIAGNÓSTICO — booking-dxc activos (correr para ver qué se va a tocar)
-- SELECT b.external_id, b.start_date, b.end_date,
--        p.address, u.name AS unit, t.full_name AS inquilino,
--        EXISTS (SELECT 1 FROM pm_bookings tt
--                 WHERE tt.external_id LIKE 'booking-ten-%' AND tt.active
--                   AND tt.unit_id   IS NOT DISTINCT FROM b.unit_id
--                   AND tt.tenant_id IS NOT DISTINCT FROM b.tenant_id
--                   AND tt.start_date IS NOT DISTINCT FROM b.start_date) AS tiene_equivalente_tenant
--   FROM pm_bookings b
--   LEFT JOIN pm_properties p ON p.id = b.property_id
--   LEFT JOIN pm_units u      ON u.id = b.unit_id
--   LEFT JOIN pm_tenants t    ON t.id = b.tenant_id
--  WHERE b.external_id LIKE 'booking-dxc-%' AND b.active = true
--  ORDER BY p.address;

-- 2) WARNINGS — dxc activos SIN equivalente en Tenant (el inquilino no está en
--    "Base de datos Tenant"): el dueño decide si agregarlo o dejarlo archivado.
INSERT INTO pm_data_warnings (warning_type, entity_type, entity_id, property_id, details, dedup_key, resolved, detected_at)
SELECT 'booking_dxc_sin_tenant', 'booking', d.external_id, d.property_id,
       jsonb_build_object(
         'unit_id', d.unit_id, 'tenant_id', d.tenant_id,
         'start_date', d.start_date, 'end_date', d.end_date,
         'casa', (SELECT address FROM pm_properties WHERE id = d.property_id),
         'unidad', (SELECT name FROM pm_units WHERE id = d.unit_id),
         'inquilino', (SELECT full_name FROM pm_tenants WHERE id = d.tenant_id),
         'detalle', 'Reserva creada desde Datos x Casa sin equivalente en Base de datos Tenant. Agregá el inquilino en Tenant si es real; si no, queda archivada.'),
       'booking_dxc_sin_tenant:' || d.external_id, false, now()
  FROM pm_bookings d
 WHERE d.external_id LIKE 'booking-dxc-%' AND d.active = true
   AND NOT EXISTS (
     SELECT 1 FROM pm_bookings t
      WHERE t.external_id LIKE 'booking-ten-%' AND t.active = true
        AND t.unit_id    IS NOT DISTINCT FROM d.unit_id
        AND t.tenant_id  IS NOT DISTINCT FROM d.tenant_id
        AND t.start_date IS NOT DISTINCT FROM d.start_date)
ON CONFLICT (dedup_key) DO UPDATE SET resolved = false, detected_at = now(), details = EXCLUDED.details;

-- 3) ARCHIVAR todos los booking-dxc activos (no se borran → historia preservada).
--    Reservas = SOLO Tenant; los dxc dejan de mostrarse en la app.
UPDATE pm_bookings
   SET active = false,
       status = 'finalizado',
       archived_at = COALESCE(archived_at, now())
 WHERE external_id LIKE 'booking-dxc-%' AND active = true;

-- ── Validación ──
-- SELECT count(*) AS dxc_activos FROM pm_bookings WHERE external_id LIKE 'booking-dxc-%' AND active; -- esperado 0
-- SELECT count(*) AS reservas_activas FROM pm_bookings WHERE active;  -- solo booking-ten-* + manuales
-- SELECT count(*) FROM pm_data_warnings WHERE warning_type='booking_dxc_sin_tenant' AND NOT resolved;
