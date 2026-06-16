-- ════════════════════════════════════════════════════════════════
-- 🛠 PM · Operación: cronograma (auto-gen) + utilities (recibos)
-- pm_properties.id / pm_bookings.id son UUID → FKs UUID (no BIGINT).
-- Idempotente. Correr una vez en el SQL editor de Supabase.
-- ════════════════════════════════════════════════════════════════

-- ── 1) pm_tasks: columnas nuevas ──
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS auto_generated    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_days   INT,
  ADD COLUMN IF NOT EXISTS assignee          TEXT,      -- (ya existía; idempotente)
  ADD COLUMN IF NOT EXISTS estimated_minutes INT;

-- ── 2) pm_utilities (recibos públicos) ──
CREATE TABLE IF NOT EXISTS pm_utilities (
  id               BIGSERIAL PRIMARY KEY,
  property_id      UUID REFERENCES pm_properties(id) ON DELETE CASCADE,
  service_name     TEXT NOT NULL,                       -- Spectrum / Texas Gas / Austin Water / Electric
  account_number   TEXT,
  monthly_amount   NUMERIC,
  billing_day      INT,
  cutoff_day       INT,
  last_paid_date   DATE,
  last_paid_amount NUMERIC,
  proof_url        TEXT,
  status           TEXT DEFAULT 'active',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pm_utilities_prop ON pm_utilities(property_id);
ALTER TABLE pm_utilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pm_utilities_auth ON pm_utilities;
CREATE POLICY pm_utilities_auth ON pm_utilities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed: 4 servicios por propiedad activa (no duplica por service_name)
INSERT INTO pm_utilities (property_id, service_name, billing_day, cutoff_day, status)
SELECT p.id, s.name, 1, 20, 'active'
FROM pm_properties p
CROSS JOIN (VALUES ('Spectrum'), ('Texas Gas'), ('Austin Water'), ('Electric')) AS s(name)
WHERE p.status = 'activa'
  AND NOT EXISTS (SELECT 1 FROM pm_utilities u WHERE u.property_id = p.id AND u.service_name = s.name);

-- ── 3) Auto-generación de tareas (limpiezas post check-out + recurrentes) ──
CREATE OR REPLACE FUNCTION pm_generate_op_tasks() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  -- 3a) Limpieza post check-out: bookings que terminan en [hoy, hoy+2]
  FOR r IN
    SELECT b.id, b.unit_id, b.property_id, (b.end_date + 1) AS sched,
           pr.name AS casa, u.code AS unidad
    FROM pm_bookings b
    JOIN pm_properties pr ON pr.id = b.property_id
    LEFT JOIN pm_units u ON u.id = b.unit_id
    WHERE b.end_date IS NOT NULL
      AND b.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 2
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

  -- 3b) Servicios recurrentes por propiedad activa: 1 próxima pendiente por tipo
  FOR r IN SELECT id, name FROM pm_properties WHERE status = 'activa' LOOP
    -- Podada cada 14 días
    IF NOT EXISTS (SELECT 1 FROM pm_tasks t WHERE t.property_id = r.id AND t.task_type = 'podada'
                     AND t.status NOT IN ('completado','cancelado') AND t.scheduled_date >= CURRENT_DATE) THEN
      INSERT INTO pm_tasks (title, task_type, property_id, scheduled_date, status, auto_generated, recurrence_days, estimated_minutes)
      VALUES ('🌱 Podada: ' || r.name, 'podada', r.id, CURRENT_DATE + 14, 'pendiente', true, 14, 60);
    END IF;
    -- Control de plagas cada 30 días
    IF NOT EXISTS (SELECT 1 FROM pm_tasks t WHERE t.property_id = r.id AND t.task_type = 'plagas'
                     AND t.status NOT IN ('completado','cancelado') AND t.scheduled_date >= CURRENT_DATE) THEN
      INSERT INTO pm_tasks (title, task_type, property_id, scheduled_date, status, auto_generated, recurrence_days, estimated_minutes)
      VALUES ('🐛 Control de plagas: ' || r.name, 'plagas', r.id, CURRENT_DATE + 30, 'pendiente', true, 30, 45);
    END IF;
    -- Inspección anual
    IF NOT EXISTS (SELECT 1 FROM pm_tasks t WHERE t.property_id = r.id AND t.task_type = 'inspeccion'
                     AND t.status NOT IN ('completado','cancelado') AND t.scheduled_date >= CURRENT_DATE) THEN
      INSERT INTO pm_tasks (title, task_type, property_id, scheduled_date, status, auto_generated, recurrence_days, estimated_minutes)
      VALUES ('🚪 Inspección anual: ' || r.name, 'inspeccion', r.id, CURRENT_DATE + 365, 'pendiente', true, 365, 120);
    END IF;
  END LOOP;
END $$;

-- ── 4) Alertas de utilities (por vencer / vencido / cortado) ──
CREATE OR REPLACE FUNCTION pm_check_utility_alerts() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE r RECORD; v_cut DATE; v_days INT; v_dedup TEXT;
BEGIN
  FOR r IN SELECT * FROM pm_utilities WHERE status = 'active' AND cutoff_day IS NOT NULL LOOP
    v_cut := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, LEAST(r.cutoff_day, 28));
    -- ¿pagó este mes?
    IF r.last_paid_date IS NOT NULL AND date_trunc('month', r.last_paid_date) = date_trunc('month', CURRENT_DATE) THEN
      CONTINUE;
    END IF;
    v_days := v_cut - CURRENT_DATE;
    v_dedup := 'utility:' || r.id || ':' || to_char(CURRENT_DATE,'YYYY-MM');
    IF v_days < -14 THEN
      INSERT INTO pm_alerts (type, severity, category, property_id, message, dedup_key)
      VALUES ('utility_cut','critical','service', r.property_id, '❌ ' || r.service_name || ' CORTADO (' || ABS(v_days) || 'd vencido).', v_dedup)
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL AND resolved = false DO NOTHING;
    ELSIF v_days < 0 THEN
      INSERT INTO pm_alerts (type, severity, category, property_id, message, dedup_key)
      VALUES ('utility_overdue','critical','service', r.property_id, '🔴 ' || r.service_name || ' vencido hace ' || ABS(v_days) || 'd.', v_dedup)
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL AND resolved = false DO NOTHING;
    ELSIF v_days <= 5 THEN
      INSERT INTO pm_alerts (type, severity, category, property_id, message, dedup_key)
      VALUES ('utility_due_soon','warning','service', r.property_id, '⏰ ' || r.service_name || ' vence en ' || v_days || 'd (corte ' || v_cut || ').', v_dedup)
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL AND resolved = false DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ── 5) pg_cron: correr diario ──
create extension if not exists pg_cron;
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in ('pm-generate-op-tasks','pm-utility-alerts');
exception when others then null; end $$;
select cron.schedule('pm-generate-op-tasks', '0 6 * * *', $$select public.pm_generate_op_tasks()$$);
select cron.schedule('pm-utility-alerts',    '0 7 * * *', $$select public.pm_check_utility_alerts()$$);

-- Forzar manual:  select public.pm_generate_op_tasks(); select public.pm_check_utility_alerts();
