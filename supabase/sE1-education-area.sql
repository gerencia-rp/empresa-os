-- ============================================================================
-- SPRINT E1 · ÁREA EDUCACIÓN — FlipMentoría
-- Schema completo: cohortes, alumnos, curriculum (E0-E5), progreso, evidencia,
--                  recursos (contactos + stack), Q&A, scorecard.
-- ============================================================================
-- Notas:
-- • Idempotente (CREATE IF NOT EXISTS / safe ALTER)
-- • RLS por rol: 'student' ve SUS datos; 'mentor' y 'admin' ven todos.
-- • Reutiliza tabla `users` existente y `auth.users` de Supabase.
-- ============================================================================

-- Extensión para arrays/búsquedas
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. COHORTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_cohorts (
  id              BIGSERIAL PRIMARY KEY,
  code            TEXT UNIQUE NOT NULL,       -- "2026-Q1", "2026-Q2"
  name            TEXT NOT NULL,
  starts_on       DATE NOT NULL,
  ends_on         DATE,
  capacity        INTEGER DEFAULT 20,
  status          TEXT DEFAULT 'active' CHECK (status IN ('planning','active','closed','archived')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. ESTUDIANTES (perfil extendido del user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_students (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  whatsapp          TEXT,
  city_residence    TEXT,
  state_residence   TEXT,
  city_invest       TEXT,
  state_invest      TEXT,
  big_why           TEXT,
  capital_available NUMERIC(12,2),
  goal_first_deal   DATE,
  joined_at         TIMESTAMPTZ DEFAULT NOW(),
  status            TEXT DEFAULT 'active' CHECK (status IN ('lead','active','paused','graduated','dropped'))
);

-- ============================================================================
-- 3. ENROLLMENTS (alumno × cohorte)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_enrollments (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT REFERENCES edu_students(id) ON DELETE CASCADE,
  cohort_id       BIGINT REFERENCES edu_cohorts(id) ON DELETE SET NULL,
  enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','dropped')),
  current_stage   TEXT DEFAULT 'E0',          -- E0..E5
  UNIQUE (student_id, cohort_id)
);

-- ============================================================================
-- 4. CURRICULUM: ETAPAS (E0-E5)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_curriculum_stages (
  id              BIGSERIAL PRIMARY KEY,
  code            TEXT UNIQUE NOT NULL,       -- "E0","E1","E2","E3","E4","E5"
  order_idx       INTEGER NOT NULL,
  title           TEXT NOT NULL,              -- "Fundación", "Evaluar"...
  emoji           TEXT,                       -- "🏛️", "🔍"...
  description     TEXT,
  expected_weeks  INTEGER,                    -- weeks tipicas
  color           TEXT DEFAULT 'slate'        -- tailwind color: slate, blue, amber, etc.
);

-- ============================================================================
-- 5. CURRICULUM: BLOQUES (E0.1, E0.2, E1.1...)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_curriculum_blocks (
  id              BIGSERIAL PRIMARY KEY,
  stage_id        BIGINT REFERENCES edu_curriculum_stages(id) ON DELETE CASCADE,
  code            TEXT UNIQUE NOT NULL,       -- "E0.1","E0.2","E1.1"...
  order_idx       INTEGER NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT
);

-- ============================================================================
-- 6. CURRICULUM: TAREAS (E0.1.1, E0.1.2... las 77)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_curriculum_tasks (
  id                BIGSERIAL PRIMARY KEY,
  block_id          BIGINT REFERENCES edu_curriculum_blocks(id) ON DELETE CASCADE,
  code              TEXT UNIQUE NOT NULL,     -- "E0.1.1"
  order_idx         INTEGER NOT NULL,
  title             TEXT NOT NULL,
  short_title       TEXT,                     -- versión 1-línea para checklists
  description       TEXT,                     -- "actividad"
  deliverable       TEXT,                     -- "entregable"
  steps             JSONB,                    -- [{n, text}]
  resources         JSONB,                    -- [{label,url,type}]
  common_errors     JSONB,                    -- [text]
  estimated_hours_min  NUMERIC(5,2),
  estimated_hours_max  NUMERIC(5,2),
  is_critical       BOOLEAN DEFAULT FALSE,    -- tareas críticas que bloquean siguientes
  evidence_required BOOLEAN DEFAULT TRUE,     -- si requiere subir evidencia
  evidence_hint     TEXT                      -- "Sube el Certificate of Formation aprobado"
);

-- ============================================================================
-- 7. DEPENDENCIAS DEL CURRICULUM (qué tarea bloquea cuál)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_curriculum_deps (
  id              BIGSERIAL PRIMARY KEY,
  task_id         BIGINT REFERENCES edu_curriculum_tasks(id) ON DELETE CASCADE,
  depends_on_id   BIGINT REFERENCES edu_curriculum_tasks(id) ON DELETE CASCADE,
  UNIQUE (task_id, depends_on_id)
);

-- ============================================================================
-- 8. PROGRESO DEL ESTUDIANTE POR TAREA
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_student_progress (
  id              BIGSERIAL PRIMARY KEY,
  enrollment_id   BIGINT REFERENCES edu_enrollments(id) ON DELETE CASCADE,
  task_id         BIGINT REFERENCES edu_curriculum_tasks(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','submitted','approved','blocked','skipped')),
  started_at      TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  reviewer_id     UUID REFERENCES auth.users(id),
  mentor_notes    TEXT,                       -- comentarios del mentor
  student_notes   TEXT,                       -- notas del alumno
  evidence_url    TEXT,                       -- link a doc/foto/etc
  evidence_data   JSONB,                      -- datos estructurados (ej Buy Box JSON)
  UNIQUE (enrollment_id, task_id)
);

-- ============================================================================
-- 9. RECURSOS GLOBALES (DOC A Contactos · DOC B Stack · DOC C Extras)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_resources (
  id              BIGSERIAL PRIMARY KEY,
  kind            TEXT NOT NULL CHECK (kind IN ('contact','tool','template','script','kpi','case','quality_gate','link','file')),
  stage_code      TEXT,                       -- "E0","E1"... NULL = transversal
  block_code      TEXT,                       -- "E0.1"... opcional
  task_code       TEXT,                       -- "E0.1.1"... opcional
  name            TEXT NOT NULL,
  description     TEXT,
  url             TEXT,
  geo_scope       TEXT CHECK (geo_scope IN ('national','state','local',NULL)),
  state           TEXT,                       -- "FL","TX","CA","NY","NJ"...
  city            TEXT,
  price_tier      TEXT CHECK (price_tier IN ('free','freemium','paid',NULL)),
  price_note      TEXT,                       -- "$99-$300/year"
  essential_when  TEXT,                       -- "Desde deal #1" / "Cuando escales"
  tags            TEXT[],
  is_recommended  BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edu_resources_kind ON edu_resources(kind);
CREATE INDEX IF NOT EXISTS idx_edu_resources_stage ON edu_resources(stage_code);
CREATE INDEX IF NOT EXISTS idx_edu_resources_state ON edu_resources(state);
CREATE INDEX IF NOT EXISTS idx_edu_resources_search ON edu_resources USING GIN (name gin_trgm_ops);

-- ============================================================================
-- 10. ENTREGABLES DEL ESTUDIANTE (carpetas: LLC, Buy Box, ARV, MAO, term sheets…)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_deliverables (
  id              BIGSERIAL PRIMARY KEY,
  enrollment_id   BIGINT REFERENCES edu_enrollments(id) ON DELETE CASCADE,
  task_code       TEXT,                       -- ref a la tarea que la generó
  kind            TEXT NOT NULL CHECK (kind IN ('llc_docs','operating_agreement','ein','bank_account','buy_box','arv_analysis','mao_calc','term_sheet','sow','contractor_bid','permit','draw_schedule','listing','sale_report','other')),
  name            TEXT NOT NULL,
  data            JSONB,                      -- contenido estructurado si aplica
  file_url        TEXT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewer_notes  TEXT
);

-- ============================================================================
-- 11. PREGUNTAS Y RESPUESTAS (estudiante → mentor)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_questions (
  id              BIGSERIAL PRIMARY KEY,
  enrollment_id   BIGINT REFERENCES edu_enrollments(id) ON DELETE CASCADE,
  task_code       TEXT,                       -- contexto opcional
  question        TEXT NOT NULL,
  answer          TEXT,
  answered_by     UUID REFERENCES auth.users(id),
  answered_at     TIMESTAMPTZ,
  is_published    BOOLEAN DEFAULT FALSE,      -- visible para toda la cohorte
  asked_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. OFFICE HOURS / SESIONES GRUPALES
-- ============================================================================
CREATE TABLE IF NOT EXISTS edu_office_hours (
  id              BIGSERIAL PRIMARY KEY,
  cohort_id       BIGINT REFERENCES edu_cohorts(id) ON DELETE CASCADE,
  topic           TEXT NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  duration_min    INTEGER DEFAULT 60,
  meet_url        TEXT,
  recording_url   TEXT,
  notes_url       TEXT,
  status          TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','done','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. SCORECARD VIEW (avance por estudiante)
-- ============================================================================
CREATE OR REPLACE VIEW edu_scorecard AS
WITH tot AS (
  SELECT COUNT(*)::int AS total FROM edu_curriculum_tasks
),
per_stage AS (
  SELECT
    e.id as enrollment_id,
    s.code as stage_code,
    s.title as stage_title,
    s.order_idx,
    COUNT(t.id) FILTER (WHERE TRUE)::int as total_tasks,
    COUNT(p.id) FILTER (WHERE p.status IN ('submitted','approved'))::int as done_tasks
  FROM edu_enrollments e
  CROSS JOIN edu_curriculum_stages s
  LEFT JOIN edu_curriculum_blocks b ON b.stage_id = s.id
  LEFT JOIN edu_curriculum_tasks t ON t.block_id = b.id
  LEFT JOIN edu_student_progress p ON p.enrollment_id = e.id AND p.task_id = t.id
  GROUP BY e.id, s.id
)
SELECT
  e.id as enrollment_id,
  st.id as student_id,
  st.full_name,
  c.code as cohort_code,
  e.current_stage,
  e.status,
  ROUND(100.0 * COUNT(p.id) FILTER (WHERE p.status IN ('submitted','approved'))::numeric
             / NULLIF(tot.total,0), 1) as pct_complete,
  COUNT(p.id) FILTER (WHERE p.status = 'in_progress')::int as in_progress_count,
  COUNT(p.id) FILTER (WHERE p.status = 'submitted')::int as awaiting_review_count,
  COUNT(p.id) FILTER (WHERE p.status = 'blocked')::int as blocked_count,
  MAX(p.submitted_at) as last_activity_at,
  EXTRACT(EPOCH FROM (NOW() - MAX(p.submitted_at)))/86400 as days_since_last_activity,
  json_agg(json_build_object(
    'stage', ps.stage_code,
    'title', ps.stage_title,
    'total', ps.total_tasks,
    'done', ps.done_tasks
  ) ORDER BY ps.order_idx) as stages
FROM edu_enrollments e
JOIN edu_students st ON st.id = e.student_id
LEFT JOIN edu_cohorts c ON c.id = e.cohort_id
LEFT JOIN edu_student_progress p ON p.enrollment_id = e.id
LEFT JOIN per_stage ps ON ps.enrollment_id = e.id
CROSS JOIN tot
GROUP BY e.id, st.id, c.id, tot.total;

-- ============================================================================
-- 14. ALERTAS (vista derivada: estudiantes atascados / pendientes de revisión)
-- ============================================================================
CREATE OR REPLACE VIEW edu_alerts AS
SELECT
  e.id as enrollment_id,
  st.id as student_id,
  st.full_name,
  'stuck' as kind,
  'No avanza desde hace ' || COALESCE(
    EXTRACT(EPOCH FROM (NOW() - MAX(p.submitted_at)))::int/86400,
    EXTRACT(EPOCH FROM (NOW() - e.enrolled_at))::int/86400
  ) || ' días' as message,
  GREATEST(COALESCE(MAX(p.submitted_at), e.enrolled_at), e.enrolled_at) as as_of
FROM edu_enrollments e
JOIN edu_students st ON st.id = e.student_id
LEFT JOIN edu_student_progress p ON p.enrollment_id = e.id
WHERE e.status = 'active'
GROUP BY e.id, st.id
HAVING COALESCE(
  EXTRACT(EPOCH FROM (NOW() - MAX(p.submitted_at)))/86400,
  EXTRACT(EPOCH FROM (NOW() - e.enrolled_at))/86400
) > 7

UNION ALL

SELECT
  e.id as enrollment_id,
  st.id as student_id,
  st.full_name,
  'awaiting_review' as kind,
  COUNT(p.id) || ' tareas pendientes de revisión' as message,
  MIN(p.submitted_at) as as_of
FROM edu_enrollments e
JOIN edu_students st ON st.id = e.student_id
JOIN edu_student_progress p ON p.enrollment_id = e.id
WHERE p.status = 'submitted'
GROUP BY e.id, st.id, p.submitted_at
HAVING COUNT(p.id) > 0;

-- ============================================================================
-- 15. RLS — Row Level Security
-- ============================================================================

-- Habilitar RLS
ALTER TABLE edu_students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_enrollments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_student_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_deliverables      ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_cohorts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_office_hours      ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_curriculum_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_curriculum_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_curriculum_tasks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_curriculum_deps   ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_resources         ENABLE ROW LEVEL SECURITY;

-- Helper function: ¿el usuario es mentor o admin?
CREATE OR REPLACE FUNCTION is_mentor_or_admin() RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('admin','mentor')
  );
$$;

-- Curriculum: LECTURA pública (todos los autenticados leen)
DROP POLICY IF EXISTS curriculum_read_all ON edu_curriculum_stages;
CREATE POLICY curriculum_read_all ON edu_curriculum_stages FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS curriculum_read_all ON edu_curriculum_blocks;
CREATE POLICY curriculum_read_all ON edu_curriculum_blocks FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS curriculum_read_all ON edu_curriculum_tasks;
CREATE POLICY curriculum_read_all ON edu_curriculum_tasks FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS curriculum_read_all ON edu_curriculum_deps;
CREATE POLICY curriculum_read_all ON edu_curriculum_deps FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS resources_read_all ON edu_resources;
CREATE POLICY resources_read_all ON edu_resources FOR SELECT USING (auth.role() = 'authenticated');

-- Curriculum: ESCRITURA solo mentor/admin
DROP POLICY IF EXISTS curriculum_write_admin ON edu_curriculum_stages;
CREATE POLICY curriculum_write_admin ON edu_curriculum_stages FOR ALL USING (is_mentor_or_admin()) WITH CHECK (is_mentor_or_admin());
DROP POLICY IF EXISTS curriculum_write_admin ON edu_curriculum_blocks;
CREATE POLICY curriculum_write_admin ON edu_curriculum_blocks FOR ALL USING (is_mentor_or_admin()) WITH CHECK (is_mentor_or_admin());
DROP POLICY IF EXISTS curriculum_write_admin ON edu_curriculum_tasks;
CREATE POLICY curriculum_write_admin ON edu_curriculum_tasks FOR ALL USING (is_mentor_or_admin()) WITH CHECK (is_mentor_or_admin());
DROP POLICY IF EXISTS resources_write_admin ON edu_resources;
CREATE POLICY resources_write_admin ON edu_resources FOR ALL USING (is_mentor_or_admin()) WITH CHECK (is_mentor_or_admin());

-- Cohortes: lectura todos, escritura admin
DROP POLICY IF EXISTS cohorts_read_all ON edu_cohorts;
CREATE POLICY cohorts_read_all ON edu_cohorts FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS cohorts_write_admin ON edu_cohorts;
CREATE POLICY cohorts_write_admin ON edu_cohorts FOR ALL USING (is_mentor_or_admin()) WITH CHECK (is_mentor_or_admin());
DROP POLICY IF EXISTS oh_read_all ON edu_office_hours;
CREATE POLICY oh_read_all ON edu_office_hours FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS oh_write_admin ON edu_office_hours;
CREATE POLICY oh_write_admin ON edu_office_hours FOR ALL USING (is_mentor_or_admin()) WITH CHECK (is_mentor_or_admin());

-- Estudiantes: cada uno ve y edita su propio perfil; mentor/admin ve todos
DROP POLICY IF EXISTS students_read_self ON edu_students;
CREATE POLICY students_read_self ON edu_students FOR SELECT USING (user_id = auth.uid() OR is_mentor_or_admin());
DROP POLICY IF EXISTS students_write_self ON edu_students;
CREATE POLICY students_write_self ON edu_students FOR UPDATE USING (user_id = auth.uid() OR is_mentor_or_admin()) WITH CHECK (user_id = auth.uid() OR is_mentor_or_admin());
DROP POLICY IF EXISTS students_insert_admin ON edu_students;
CREATE POLICY students_insert_admin ON edu_students FOR INSERT WITH CHECK (is_mentor_or_admin() OR user_id = auth.uid());

-- Enrollments: estudiante ve los suyos; admin ve todos
DROP POLICY IF EXISTS enr_read ON edu_enrollments;
CREATE POLICY enr_read ON edu_enrollments FOR SELECT USING (
  student_id IN (SELECT id FROM edu_students WHERE user_id = auth.uid())
  OR is_mentor_or_admin()
);
DROP POLICY IF EXISTS enr_write_admin ON edu_enrollments;
CREATE POLICY enr_write_admin ON edu_enrollments FOR ALL USING (is_mentor_or_admin()) WITH CHECK (is_mentor_or_admin());

-- Progreso: cada estudiante ve y edita el suyo; mentor edita para revisar
DROP POLICY IF EXISTS progress_read ON edu_student_progress;
CREATE POLICY progress_read ON edu_student_progress FOR SELECT USING (
  enrollment_id IN (SELECT e.id FROM edu_enrollments e
                    JOIN edu_students st ON st.id = e.student_id
                    WHERE st.user_id = auth.uid())
  OR is_mentor_or_admin()
);
DROP POLICY IF EXISTS progress_write ON edu_student_progress;
CREATE POLICY progress_write ON edu_student_progress FOR ALL USING (
  enrollment_id IN (SELECT e.id FROM edu_enrollments e
                    JOIN edu_students st ON st.id = e.student_id
                    WHERE st.user_id = auth.uid())
  OR is_mentor_or_admin()
) WITH CHECK (
  enrollment_id IN (SELECT e.id FROM edu_enrollments e
                    JOIN edu_students st ON st.id = e.student_id
                    WHERE st.user_id = auth.uid())
  OR is_mentor_or_admin()
);

-- Entregables: idem progreso
DROP POLICY IF EXISTS deliv_read ON edu_deliverables;
CREATE POLICY deliv_read ON edu_deliverables FOR SELECT USING (
  enrollment_id IN (SELECT e.id FROM edu_enrollments e
                    JOIN edu_students st ON st.id = e.student_id
                    WHERE st.user_id = auth.uid())
  OR is_mentor_or_admin()
);
DROP POLICY IF EXISTS deliv_write ON edu_deliverables;
CREATE POLICY deliv_write ON edu_deliverables FOR ALL USING (
  enrollment_id IN (SELECT e.id FROM edu_enrollments e
                    JOIN edu_students st ON st.id = e.student_id
                    WHERE st.user_id = auth.uid())
  OR is_mentor_or_admin()
) WITH CHECK (
  enrollment_id IN (SELECT e.id FROM edu_enrollments e
                    JOIN edu_students st ON st.id = e.student_id
                    WHERE st.user_id = auth.uid())
  OR is_mentor_or_admin()
);

-- Preguntas: estudiante ve las suyas + publicadas; mentor ve todas
DROP POLICY IF EXISTS q_read ON edu_questions;
CREATE POLICY q_read ON edu_questions FOR SELECT USING (
  is_published = TRUE
  OR enrollment_id IN (SELECT e.id FROM edu_enrollments e
                       JOIN edu_students st ON st.id = e.student_id
                       WHERE st.user_id = auth.uid())
  OR is_mentor_or_admin()
);
DROP POLICY IF EXISTS q_write ON edu_questions;
CREATE POLICY q_write ON edu_questions FOR ALL USING (
  enrollment_id IN (SELECT e.id FROM edu_enrollments e
                    JOIN edu_students st ON st.id = e.student_id
                    WHERE st.user_id = auth.uid())
  OR is_mentor_or_admin()
) WITH CHECK (
  enrollment_id IN (SELECT e.id FROM edu_enrollments e
                    JOIN edu_students st ON st.id = e.student_id
                    WHERE st.user_id = auth.uid())
  OR is_mentor_or_admin()
);

-- ============================================================================
-- 16. ÁREA en system_areas + dispatcher en systems
-- ============================================================================
INSERT INTO system_areas (name, slug, description, icon, order_idx, is_active)
VALUES ('Educación', 'educacion', 'Mentoría FlipMentoría · Programa de 77 tareas en 6 etapas', '🎓', 100, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  is_active   = TRUE;

-- Dos sistemas dentro del área: portal estudiante + panel mentor
INSERT INTO systems (area_slug, name, description, type, icon, order_idx, is_active)
VALUES
  ('educacion', 'Mi Ruta 90 días',     'Tu camino personal de los 6 etapas (E0-E5)', 'education-student', '🗺️', 10, TRUE),
  ('educacion', 'Biblioteca',          'Contactos, herramientas y recursos por etapa', 'education-library',  '📚', 20, TRUE),
  ('educacion', 'Preguntas al mentor', 'Hace preguntas y consulta respuestas anteriores', 'education-qa',     '❓', 30, TRUE),
  ('educacion', 'Panel Mentor',        'Ver y gestionar a todos los estudiantes (admin)', 'education-mentor', '👥', 40, TRUE),
  ('educacion', 'Curriculum',          'Editar etapas / bloques / tareas / dependencias', 'education-curriculum', '✏️', 50, TRUE)
ON CONFLICT (area_slug, name) DO UPDATE SET
  type        = EXCLUDED.type,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  is_active   = TRUE;

-- ============================================================================
-- LISTO. Aplica este SQL en Supabase SQL Editor.
-- Después corre sE1-seed-curriculum.sql para poblar las 77 tareas.
-- ============================================================================
