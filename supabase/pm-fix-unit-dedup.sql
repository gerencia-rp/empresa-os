-- ════════════════════════════════════════════════════════════════
-- 🔧 FIX · Unificar unidades duplicadas (1 pm_unit por unidad física)
--
-- El sync anterior creaba 1 pm_unit por fila de "Datos x Casa" (1 fila por
-- unidad+inquilino+período) → unidades duplicadas. El nuevo sync agrupa por
-- (dirección + tipo) con external_id estable. Como el external_id cambia de
-- esquema, hay que limpiar units/bookings y repoblar.
--
-- ORDEN (respeta las FKs):
--   pm_bookings.unit_id   → pm_units(id)         (hay que borrar bookings primero)
--   pm_payments.unit_id   → pm_units(id)         (sin ON DELETE → liberar manual)
--   pm_payments.booking_id→ pm_bookings(id) ON DELETE SET NULL (auto)
--
-- Después de correr ESTE script, lanzá el sync UNA vez (botón "Sync Airtable"
-- o `select public.cron_invoke_function('pm-sync-airtable')`). El sync repuebla
-- pm_units, pm_bookings y RE-UPSERTEA pm_payments con el unit_id de la unidad
-- agrupada (los pagos sincronizados recuperan su unit_id automáticamente).
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- 1) Liberar la FK de pagos → units (se repuebla en el sync por external_id).
--    Los pagos sincronizados (external_id 'pay-...') recuperan unit_id solos.
--    Los pagos manuales pierden el unit_id (conservan property_id).
UPDATE pm_payments SET unit_id = NULL WHERE unit_id IS NOT NULL;

-- 2) Borrar bookings (auto-NULL de pm_payments.booking_id por ON DELETE SET NULL).
DELETE FROM pm_bookings WHERE TRUE;

-- 3) Borrar units (ahora sin referencias).
DELETE FROM pm_units WHERE TRUE;

COMMIT;

-- ── DESPUÉS DEL SYNC · validación (debe devolver 0 filas) ──
--   SELECT property_id, name, COUNT(*)
--   FROM pm_units GROUP BY property_id, name HAVING COUNT(*) > 1;
--
-- ── Conteos esperados ──
--   SELECT count(*) AS units FROM pm_units;        -- ~30-35 (no 52)
--   SELECT count(*) AS bookings FROM pm_bookings;  -- N reservas (varias por unidad)
