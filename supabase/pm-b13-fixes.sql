-- ════════════════════════════════════════════════════════════════
-- 🐛 PM · B13 — fixes de QA en vivo (4: matching pagos·casa, 9: plataforma,
--    10: cronograma de limpiezas). Idempotente. Correr DESPUÉS de redeployar
--    pm-sync-airtable y lanzar un sync (para poblar casa_nickname).
-- ════════════════════════════════════════════════════════════════

-- ── FIX 4: pagos huérfanos ↔ casa por nickname ──
ALTER TABLE pm_payments ADD COLUMN IF NOT EXISTS casa_nickname TEXT;

-- Backfill property_id desde casa_nickname (substring contra address).
-- Requiere que el sync ya haya poblado casa_nickname.
UPDATE pm_payments p SET property_id = (
  SELECT prop.id FROM pm_properties prop
  WHERE p.casa_nickname IS NOT NULL
    AND LOWER(prop.address) LIKE '%' || LOWER(TRIM(p.casa_nickname)) || '%'
  ORDER BY length(prop.address) ASC
  LIMIT 1
)
WHERE p.property_id IS NULL AND p.casa_nickname IS NOT NULL;

-- Re-derivar unit_id cuando quedó null pero ya hay property_id (best-effort: única unidad).
UPDATE pm_payments p SET unit_id = (
  SELECT u.id FROM pm_units u WHERE u.property_id = p.property_id LIMIT 1
)
WHERE p.unit_id IS NULL AND p.property_id IS NOT NULL
  AND (SELECT COUNT(*) FROM pm_units u WHERE u.property_id = p.property_id) = 1;

-- ── FIX 9: plataforma del pago desde el booking + normalización ──
UPDATE pm_payments p SET platform = (
  SELECT b.booking_type FROM pm_bookings b
  WHERE b.unit_id = p.unit_id
    AND p.paid_at BETWEEN b.start_date AND COALESCE(b.end_date, DATE '2099-01-01')
  LIMIT 1
)
WHERE p.platform IS NULL AND p.unit_id IS NOT NULL;

-- Normalizar etiquetas a 'contrato_directo'
UPDATE pm_payments SET platform = 'contrato_directo'
WHERE LOWER(COALESCE(platform,'')) IN ('directo','contrato','contrato directo','contrato_directo');

-- ── FIX 10: generar limpiezas post check-out (ventana ±7 días) + correr ahora ──
CREATE OR REPLACE FUNCTION pm_generate_op_tasks() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  -- Limpiezas post check-out en [hoy-7, hoy+7]
  FOR r IN
    SELECT b.id, b.unit_id, b.property_id, (b.end_date + 1) AS sched,
           pr.name AS casa, u.code AS unidad
    FROM pm_bookings b
    JOIN pm_properties pr ON pr.id = b.property_id
    LEFT JOIN pm_units u ON u.id = b.unit_id
    WHERE b.end_date IS NOT NULL
      AND b.end_date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE + 7
      AND b.status <> 'cancelado'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pm_tasks t WHERE t.auto_generated AND t.task_type = 'cleaning'
        AND t.unit_id = r.unit_id AND t.scheduled_date = r.sched
    ) THEN
      INSERT INTO pm_tasks (title, task_type, property_id, unit_id, scheduled_date,
                            status, auto_generated, estimated_minutes)
      VALUES ('Limpieza post check-out: ' || COALESCE(r.casa,'') || ' ' || COALESCE(r.unidad,''),
              'cleaning', r.property_id, r.unit_id, r.sched, 'pendiente', true, 90);
    END IF;
  END LOOP;

  -- Recurrentes por casa activa (podada 14d / plagas 30d / inspección anual)
  FOR r IN SELECT id, name FROM pm_properties WHERE status = 'activa' LOOP
    IF NOT EXISTS (SELECT 1 FROM pm_tasks t WHERE t.property_id = r.id AND t.task_type='podada'
                     AND t.status NOT IN ('completado','cancelado') AND t.scheduled_date >= CURRENT_DATE) THEN
      INSERT INTO pm_tasks (title, task_type, property_id, scheduled_date, status, auto_generated, recurrence_days, estimated_minutes)
      VALUES ('🌱 Podada: ' || r.name, 'podada', r.id, CURRENT_DATE + 14, 'pendiente', true, 14, 60);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pm_tasks t WHERE t.property_id = r.id AND t.task_type='plagas'
                     AND t.status NOT IN ('completado','cancelado') AND t.scheduled_date >= CURRENT_DATE) THEN
      INSERT INTO pm_tasks (title, task_type, property_id, scheduled_date, status, auto_generated, recurrence_days, estimated_minutes)
      VALUES ('🐛 Control de plagas: ' || r.name, 'plagas', r.id, CURRENT_DATE + 30, 'pendiente', true, 30, 45);
    END IF;
  END LOOP;
END $$;

-- Correr una vez ahora para llenar el cronograma
SELECT public.pm_generate_op_tasks();

-- ── Validación ──
-- SELECT count(*) FROM pm_payments WHERE property_id IS NULL;           -- debería bajar
-- SELECT platform, count(*) FROM pm_payments GROUP BY platform;
-- SELECT count(*) FROM pm_tasks WHERE task_type='cleaning' AND auto_generated;
