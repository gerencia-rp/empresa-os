-- ════════════════════════════════════════════════════════════════
-- 🔧 FIX · vistas defensivas + columnas necesarias
-- AUTOCONTENIDO: podés correr esto solo, sin haber corrido nada antes.
-- Crea las columnas que faltan en edu_students y después las 4 vistas.
-- ════════════════════════════════════════════════════════════════

-- 0) Agregar columnas faltantes en edu_students (idempotente, no falla si ya existen)
ALTER TABLE edu_students
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS lead_campaign TEXT,
  ADD COLUMN IF NOT EXISTS lead_date DATE,
  ADD COLUMN IF NOT EXISTS conversion_date DATE,
  ADD COLUMN IF NOT EXISTS lead_value NUMERIC,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_template_id TEXT;

-- 1) Origen + conversión por canal
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

-- 2) Engagement (días sin abrir portal)
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

-- 3) Puntos de atasco
CREATE OR REPLACE VIEW edu_mkt_bottleneck AS
SELECT
  mentorship_id,
  current_stage,
  COUNT(*) AS n_estudiantes,
  AVG(EXTRACT(DAY FROM NOW() - created_at)) AS dias_promedio_en_etapa,
  COUNT(*) FILTER (WHERE EXTRACT(DAY FROM NOW() - created_at) > 30) AS atascados_30d
FROM edu_students
WHERE current_stage IS NOT NULL
GROUP BY mentorship_id, current_stage;

-- 4) Score de seguimiento
CREATE OR REPLACE VIEW edu_student_followup_score AS
SELECT
  s.id AS student_id,
  s.mentorship_id,
  s.full_name,
  s.current_stage,
  s.phone,
  GREATEST(0, LEAST(100,
    LEAST(40, EXTRACT(DAY FROM NOW() - COALESCE(s.last_activity_at, s.created_at)) * 2)::INT
    + LEAST(30, EXTRACT(DAY FROM NOW() - COALESCE(s.last_contact_at, s.created_at)) * 1.5)::INT
  ))::INT AS urgency_score,
  s.last_activity_at,
  s.last_contact_at,
  EXTRACT(DAY FROM NOW() - COALESCE(s.last_activity_at, s.created_at))::INT AS dias_sin_activity,
  EXTRACT(DAY FROM NOW() - COALESCE(s.last_contact_at, s.created_at))::INT AS dias_sin_contact
FROM edu_students s;

-- ✅ LISTO. Probá:
--   SELECT * FROM edu_student_followup_score ORDER BY urgency_score DESC LIMIT 5;
--   SELECT * FROM edu_mkt_engagement WHERE estado_engagement IN ('frio','nunca');
--   SELECT * FROM edu_mkt_acquisition;
