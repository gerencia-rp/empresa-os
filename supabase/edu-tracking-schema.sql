-- ════════════════════════════════════════════════════════════════
-- 🎓 TRACKING + INTERACCIONES — schema base para el flujo 1000%
-- Soporta:
--   • Log de interacciones del coach (WhatsApp, email, llamada)
--   • Tracking de actividad del estudiante (login, tarea_vista, tarea_completa)
--   • Dashboard de Marketing (origen, conversión, atascos)
-- ════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1) Log de INTERACCIONES del coach con cada estudiante
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS edu_student_interactions (
  id          BIGSERIAL PRIMARY KEY,
  student_id  UUID NOT NULL REFERENCES edu_students(id) ON DELETE CASCADE,
  coach_id    UUID,                        -- profiles.id del mentor
  mentorship_id UUID,                      -- denormalizado para queries rápidas
  -- Tipo de interacción
  channel     TEXT NOT NULL CHECK (channel IN ('whatsapp','email','call','session','meet','manual')),
  direction   TEXT DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  -- Contexto
  template_id TEXT,                        -- 'tarea','check','sesion','felic'…
  template_label TEXT,
  subject     TEXT,                        -- línea-resumen ej: "Recordatorio Tarea #3"
  body        TEXT,                        -- mensaje completo
  -- Outcome
  outcome     TEXT,                        -- 'sent','replied','no_response','answered','scheduled'
  notes       TEXT,
  -- Tiempos
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  reply_at    TIMESTAMPTZ,                 -- cuando el estudiante respondió (manual o auto)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edu_interactions_student ON edu_student_interactions(student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_edu_interactions_mentorship ON edu_student_interactions(mentorship_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_edu_interactions_channel ON edu_student_interactions(channel, occurred_at DESC);

-- ───────────────────────────────────────────────────────────────
-- 2) Tracking de ACTIVIDAD del estudiante en su portal
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS edu_student_activity (
  id          BIGSERIAL PRIMARY KEY,
  student_id  UUID NOT NULL REFERENCES edu_students(id) ON DELETE CASCADE,
  mentorship_id UUID,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'portal_login',       -- abrió el portal
    'plan_view',          -- vio su plan
    'task_view',          -- abrió una tarea
    'task_complete',      -- marcó tarea como hecha
    'lesson_view',        -- vio una lección de biblioteca
    'resource_download',  -- bajó un recurso
    'diagnostic_open',    -- abrió el diagnóstico
    'diagnostic_submit'   -- envió diagnóstico
  )),
  ref_id      TEXT,                        -- task_id, lesson_id, resource_id según event_type
  ref_label   TEXT,                        -- nombre legible
  duration_seconds INT,                    -- cuánto estuvo en esa acción (si aplica)
  metadata    JSONB DEFAULT '{}'::jsonb,   -- info adicional (user_agent, source, etc.)
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edu_activity_student ON edu_student_activity(student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_edu_activity_mentorship ON edu_student_activity(mentorship_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_edu_activity_event ON edu_student_activity(event_type, occurred_at DESC);

-- ───────────────────────────────────────────────────────────────
-- 3) Agregar columnas a edu_students para Marketing + último contacto
-- ───────────────────────────────────────────────────────────────
ALTER TABLE edu_students
  ADD COLUMN IF NOT EXISTS lead_source TEXT,             -- 'instagram', 'fb_ads', 'referral', 'webinar', 'organic', 'youtube', 'tiktok'
  ADD COLUMN IF NOT EXISTS lead_campaign TEXT,           -- nombre de la campaña específica
  ADD COLUMN IF NOT EXISTS lead_date DATE,               -- cuando llegó el lead
  ADD COLUMN IF NOT EXISTS conversion_date DATE,         -- cuando se hizo cliente pagador
  ADD COLUMN IF NOT EXISTS lead_value NUMERIC,           -- ticket pagado / valor del plan
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,  -- última vez que el coach lo contactó
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ, -- última vez que abrió el portal
  ADD COLUMN IF NOT EXISTS last_template_id TEXT;        -- último template usado en WA

-- ───────────────────────────────────────────────────────────────
-- 4) VISTAS para Marketing Dashboard
-- ───────────────────────────────────────────────────────────────

-- 4.1) Origen + conversión por canal
CREATE OR REPLACE VIEW edu_mkt_acquisition AS
SELECT
  mentorship_id,
  COALESCE(lead_source,'sin_origen') AS canal,
  COALESCE(lead_campaign,'') AS campania,
  COUNT(*) AS leads,
  COUNT(*) FILTER (WHERE conversion_date IS NOT NULL) AS clientes,
  ROUND(100.0 * COUNT(*) FILTER (WHERE conversion_date IS NOT NULL) / NULLIF(COUNT(*),0), 1) AS conv_pct,
  COALESCE(SUM(lead_value) FILTER (WHERE conversion_date IS NOT NULL), 0) AS revenue
FROM edu_students
GROUP BY mentorship_id, lead_source, lead_campaign;

-- 4.2) Engagement (días sin abrir portal)
CREATE OR REPLACE VIEW edu_mkt_engagement AS
SELECT
  s.id AS student_id,
  s.mentorship_id,
  s.full_name,
  s.current_stage,
  s.last_activity_at,
  s.last_contact_at,
  EXTRACT(DAY FROM NOW() - COALESCE(s.last_activity_at, s.created_at)) AS dias_sin_activity,
  EXTRACT(DAY FROM NOW() - COALESCE(s.last_contact_at, s.created_at)) AS dias_sin_contact,
  CASE
    WHEN s.last_activity_at IS NULL THEN 'nunca'
    WHEN s.last_activity_at > NOW() - INTERVAL '3 days' THEN 'activo'
    WHEN s.last_activity_at > NOW() - INTERVAL '14 days' THEN 'tibio'
    ELSE 'frio'
  END AS estado_engagement
FROM edu_students s;

-- 4.3) Puntos de atasco (etapa con más tiempo promedio + más estudiantes)
CREATE OR REPLACE VIEW edu_mkt_bottleneck AS
SELECT
  mentorship_id,
  current_stage,
  COUNT(*) AS n_estudiantes,
  AVG(EXTRACT(DAY FROM NOW() - COALESCE(stage_started_at, created_at))) AS dias_promedio_en_etapa,
  COUNT(*) FILTER (WHERE EXTRACT(DAY FROM NOW() - COALESCE(stage_started_at, created_at)) > 30) AS atascados_30d
FROM edu_students
WHERE current_stage IS NOT NULL
GROUP BY mentorship_id, current_stage;

-- 4.4) Resumen de actividad por estudiante (para "Seguimientos del día")
CREATE OR REPLACE VIEW edu_student_followup_score AS
SELECT
  s.id AS student_id,
  s.mentorship_id,
  s.full_name,
  s.current_stage,
  s.phone,
  -- Score 0-100. Más alto = más urgente seguir
  GREATEST(0, LEAST(100,
    -- Penaliza días sin actividad
    LEAST(40, EXTRACT(DAY FROM NOW() - COALESCE(s.last_activity_at, s.created_at)) * 2)::INT
    -- Penaliza días sin contacto del coach
    + LEAST(30, EXTRACT(DAY FROM NOW() - COALESCE(s.last_contact_at, s.created_at)) * 1.5)::INT
    -- Estado de pago al día = bonus (menos urgente)
    + CASE WHEN s.estado_pago = 'activo' THEN 0 ELSE 30 END
  ))::INT AS urgency_score,
  s.last_activity_at,
  s.last_contact_at,
  EXTRACT(DAY FROM NOW() - COALESCE(s.last_activity_at, s.created_at))::INT AS dias_sin_activity,
  EXTRACT(DAY FROM NOW() - COALESCE(s.last_contact_at, s.created_at))::INT AS dias_sin_contact
FROM edu_students s
WHERE COALESCE(s.estado_pago,'activo') = 'activo';

-- ───────────────────────────────────────────────────────────────
-- 5) RLS Policies
-- ───────────────────────────────────────────────────────────────
ALTER TABLE edu_student_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_student_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS edu_inter_all ON edu_student_interactions;
CREATE POLICY edu_inter_all ON edu_student_interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS edu_act_all ON edu_student_activity;
CREATE POLICY edu_act_all ON edu_student_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────
-- 6) TRIGGER: actualizar last_contact_at en edu_students cuando se loguea WA
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION edu_update_last_contact()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.direction = 'outbound' AND NEW.channel IN ('whatsapp','email','call') THEN
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

-- ───────────────────────────────────────────────────────────────
-- 7) TRIGGER: actualizar last_activity_at en edu_students cuando hay activity
-- ───────────────────────────────────────────────────────────────
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

-- ✅ LISTO. Corré esto en Supabase SQL Editor.
-- Después podés probar:
--   SELECT * FROM edu_student_followup_score ORDER BY urgency_score DESC LIMIT 5;
--   SELECT * FROM edu_mkt_acquisition;
--   SELECT * FROM edu_mkt_engagement WHERE estado_engagement = 'frio';
