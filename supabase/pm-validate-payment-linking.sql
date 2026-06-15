-- ════════════════════════════════════════════════════════════════
-- ✅ Validación post-sync · vinculación de pagos ↔ propiedades
-- Correr DESPUÉS de redeployar pm-sync-airtable y lanzar el sync.
-- Esperado: CASI todas las propiedades con ≥1 pago en el mes consultado.
-- ════════════════════════════════════════════════════════════════
-- Nota: pm_payments.month se guarda como texto en español ("Junio"/"junio").
SELECT
  p.address,
  (SELECT COUNT(*) FROM pm_payments
     WHERE property_id = p.id AND year = 2026 AND lower(month) IN ('junio','jun')) AS pagos_jun_2026,
  (SELECT COALESCE(SUM(amount), 0) FROM pm_payments
     WHERE property_id = p.id AND year = 2026 AND lower(month) IN ('junio','jun')) AS ingresos_jun
FROM pm_properties p
ORDER BY ingresos_jun DESC;

-- Pagos que quedaron SIN vincular (revisar el campo Casa original en Airtable):
--   SELECT concept, amount, paid_at, notes FROM pm_payments
--   WHERE type='ingreso' AND property_id IS NULL ORDER BY paid_at DESC;
--
-- Resumen de la última corrida (incluye payments_linked / payments_unlinked /
-- payments_unlinked_casas en el JSON):
--   SELECT records_synced FROM pm_sync_log
--   WHERE source='airtable' ORDER BY started_at DESC LIMIT 1;
