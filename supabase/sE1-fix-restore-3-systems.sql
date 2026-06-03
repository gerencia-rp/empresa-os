-- ============================================================================
-- HOTFIX SPRINT E1 · Restaurar los 3 sistemas viejos como 6, 7, 8
-- Quedan 8 sistemas en el área 'educacion', todos conectados al schema edu_*.
-- IDEMPOTENTE.
-- ============================================================================

-- Tabla auxiliar opcional para Material & Presentaciones (si no existe)
CREATE TABLE IF NOT EXISTS edu_materials (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  kind            TEXT DEFAULT 'pdf' CHECK (kind IN ('pdf','deck','video','image','doc','other')),
  stage_code      TEXT,
  description     TEXT,
  file_url        TEXT,
  thumbnail_url   TEXT,
  uploaded_by     UUID REFERENCES auth.users(id),
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  is_public       BOOLEAN DEFAULT TRUE
);

ALTER TABLE edu_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mat_read_all ON edu_materials;
CREATE POLICY mat_read_all ON edu_materials FOR SELECT USING (
  is_public = TRUE OR auth.role() = 'authenticated'
);
DROP POLICY IF EXISTS mat_write_admin ON edu_materials;
CREATE POLICY mat_write_admin ON edu_materials FOR ALL
  USING (is_mentor_or_admin()) WITH CHECK (is_mentor_or_admin());

-- Seed: la presentación del PDF que ya subiste
INSERT INTO edu_materials (title, kind, stage_code, description, file_url, is_public)
SELECT 'De la intención a tu primer deal estructurado', 'pdf', 'E0',
       'Mapa visual de los 90 días — la ruta completa explicada en 15 slides.',
       NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM edu_materials WHERE title = 'De la intención a tu primer deal estructurado');

-- ============================================================================
-- Restaurar los 3 systems (con NUEVOS types vinculados a las 3 vistas nuevas)
-- ============================================================================

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-gestor-estudiantes', 'educacion', 'education-students-mgr',
       'Gestor de Estudiantes',
       '🧑‍🎓', 'CRUD de alumnos, cohortes y enrollments (admin)',
       '{}'::jsonb, '{}'::jsonb, 60
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-students-mgr');

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-reportes-kpis', 'educacion', 'education-reports',
       'Reportes & KPIs',
       '📊', 'Leaderboard, embudo por etapa, tiempos medios',
       '{}'::jsonb, '{}'::jsonb, 70
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-reports');

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-material-pres', 'educacion', 'education-materials',
       'Material & Presentaciones',
       '🎤', 'Galería de PDFs, decks y videos del programa',
       '{}'::jsonb, '{}'::jsonb, 80
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-materials');

-- ============================================================================
-- Verificación: debe devolver 8 filas ordenadas por position
-- SELECT id, name, type, position FROM systems WHERE area_id = 'educacion' ORDER BY position;
-- ============================================================================
