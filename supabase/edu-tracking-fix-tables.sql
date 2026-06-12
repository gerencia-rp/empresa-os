-- ════════════════════════════════════════════════════════════════
-- 🔧 FIX · tablas + triggers + RLS para tracking
-- AUTOCONTENIDO. Idempotente (lo podés correr varias veces sin romper).
-- Crea:
--   • edu_student_interactions (log del coach: WA, llamadas, sesiones)
--   • edu_student_activity (log del estudiante: logins, tareas vistas, etc.)
--   • 2 triggers que actualizan automáticamente last_contact_at y last_activity_at
--   • RLS abierto a authenticated
-- ════════════════════════════════════════════════════════════════

-- 1) Tabla de INTERACCIONES del coach con cada estudiante
CREATE TABLE IF NOT EXISTS edu_student_interactions (
  id            BIGSERIAL PRIMARY KEY,
  student_id    UUID NOT NULL REFERENCES edu_students(id) ON DELETE CASCADE,
  coach_id      UUID,
  mentorship_id UUID,
  channel       TEXT NOT NULL CHECK (channel IN ('whatsapp','email','call','session','meet','manual')),
  direction     TEXT DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  template_id   TEXT,
  template_label TEXT,
  subject       TEXT,
  body          TEXT,
  outcome       TEXT,
  notes         TEXT,
  occurred_at   TIMESTAMPTZ DEFAULT NOW(),
  reply_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edu_interactions_student   ON edu_student_interactions(student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_edu_interactions_mentorship ON edu_student_interactions(mentorship_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_edu_interactions_channel   ON edu_student_interactions(channel, occurred_at DESC);

-- 2) Tabla de ACTIVIDAD del estudiante en su portal
CREATE TABLE IF NOT EXISTS edu_student_activity (
  id            BIGSERIAL PRIMARY KEY,
  student_id    UUID NOT NULL REFERENCES edu_students(id) ON DELETE CASCADE,
  mentorship_id UUID,
  event_type    TEXT NOT NULL CHECK (event_type IN (
    'portal_login','plan_view','task_view','task_complete',
    'lesson_view','resource_download','diagnostic_open','diagnostic_submit'
  )),
  ref_id        TEXT,
  ref_label     TEXT,
  duration_seconds INT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  occurred_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edu_activity_student    ON edu_student_activity(student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_edu_activity_mentorship ON edu_student_activity(mentorship_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_edu_activity_event      ON edu_student_activity(event_type, occurred_at DESC);

-- 3) RLS abierto a authenticated
ALTER TABLE edu_student_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_student_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS edu_inter_all ON edu_student_interactions;
CREATE POLICY edu_inter_all ON edu_student_interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS edu_act_all ON edu_student_activity;
CREATE POLICY edu_act_all ON edu_student_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4) Trigger: actualizar last_contact_at en edu_students cuando se loguea WA/email/call outbound
CREATE OR REPLACE FUNCTION edu_update_last_contact()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.direction = 'outbound' AND NEW.channel IN ('whatsapp','email','call','session','meet','manual') THEN
    UPDATE edu_students
      SET last_contact_at = NEW.occurred_at,
          last_template_id = NEW.template_id
      WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_edu_last_contact ON edu_student_interactions;
CREATE TRIGGER trg_edu_last_contact
  AFTER INSERT ON edu_student_interactions
  FOR EACH ROW EXECUTE FUNCTION edu_update_last_contact();

-- 5) Trigger: actualizar last_activity_at en edu_students cuando hay activity
CREATE OR REPLACE FUNCTION edu_update_last_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE edu_students
    SET last_activity_at = NEW.occurred_at
    WHERE id = NEW.student_id
      AND (last_activity_at IS NULL OR last_activity_at < NEW.occurred_at);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_edu_last_activity ON edu_student_activity;
CREATE TRIGGER trg_edu_last_activity
  AFTER INSERT ON edu_student_activity
  FOR EACH ROW EXECUTE FUNCTION edu_update_last_activity();

-- ✅ LISTO. Verificá:
--   SELECT count(*) FROM edu_student_interactions;
--   SELECT count(*) FROM edu_student_activity;
-- Deberían devolver 0 (tablas vacías recién creadas).
