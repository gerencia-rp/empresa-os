-- ════════════════════════════════════════════════════════════════
-- 🧹 B14 · Auto-generación de limpiezas post check-out → clean_day_tasks
-- NOTA: clean_day_tasks.property_id referencia public.properties (no pm_*),
-- así que dejamos property_id NULL y ponemos la casa en title/location.
-- Dedup por (title + date) para no duplicar. Idempotente.
-- ════════════════════════════════════════════════════════════════
ALTER TABLE clean_day_tasks ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
ALTER TABLE clean_day_tasks ADD COLUMN IF NOT EXISTS pm_unit_id UUID;   -- referencia lógica a pm_units (sin FK)

CREATE OR REPLACE FUNCTION pm_generate_cleanings() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO clean_day_tasks (date, start_time, duration_min, title, business,
                               status, priority, location, pm_unit_id, auto_generated)
  SELECT
    (b.end_date + 1)                              AS date,
    TIME '10:00'                                  AS start_time,
    90                                            AS duration_min,
    '🧹 Limpieza post check-out: ' || COALESCE(pr.name,'') || ' · ' || COALESCE(u.code, u.name, '') AS title,
    'rentas'                                      AS business,
    'planned'                                     AS status,
    'high'                                        AS priority,
    pr.address                                    AS location,
    u.id                                          AS pm_unit_id,
    true                                          AS auto_generated
  FROM pm_bookings b
  JOIN pm_units u      ON u.id = b.unit_id
  JOIN pm_properties pr ON pr.id = u.property_id
  WHERE b.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
    AND b.status <> 'cancelado'
    AND NOT EXISTS (
      SELECT 1 FROM clean_day_tasks t
      WHERE t.pm_unit_id = u.id
        AND t.date = b.end_date + 1
        AND t.auto_generated
    );
END $$;

-- Correr una vez ahora (llena próximos 14 días)
SELECT public.pm_generate_cleanings();

-- pg_cron diario 6:30 AM
create extension if not exists pg_cron;
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname = 'pm-generate-cleanings';
exception when others then null; end $$;
select cron.schedule('pm-generate-cleanings', '30 6 * * *', $$select public.pm_generate_cleanings()$$);

-- Validación:
--   SELECT date, title FROM clean_day_tasks WHERE auto_generated ORDER BY date;
