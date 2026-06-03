-- ============================================================================
-- HOTFIX SPRINT E1 · Insertar los 5 sistemas nuevos en el área Educación
-- Razón: el sE1-education-area.sql usó nombres de tabla equivocados
--        (system_areas en lugar de areas, area_slug en lugar de area_id).
-- Este fix corrige eso sin tocar nada más.
-- ============================================================================

-- 1) Asegurar que el área Educación existe (con id='educacion')
INSERT INTO areas (id, name, icon, description, position)
VALUES ('educacion', 'Educación', '🎓', 'Mentoría FlipMentoría · 78 tareas en 6 etapas', 100)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description;

-- 2) Insertar los 5 sistemas nuevos (con IDs únicos para evitar choques)
-- Usa INSERT WHERE NOT EXISTS para ser 100% idempotente.

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-mi-ruta', 'educacion', 'education-student', 'Mi Ruta 90 días',
       '🗺️', 'Tu camino personal por las 6 etapas (E0-E5)',
       '{}'::jsonb, '{}'::jsonb, 10
WHERE NOT EXISTS (
  SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-student'
);

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-biblioteca', 'educacion', 'education-library', 'Biblioteca',
       '📚', 'Contactos, herramientas y recursos por etapa',
       '{}'::jsonb, '{}'::jsonb, 20
WHERE NOT EXISTS (
  SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-library'
);

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-preguntas', 'educacion', 'education-qa', 'Preguntas al mentor',
       '❓', 'Hace preguntas y consulta respuestas anteriores',
       '{}'::jsonb, '{}'::jsonb, 30
WHERE NOT EXISTS (
  SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-qa'
);

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-panel-mentor', 'educacion', 'education-mentor', 'Panel Mentor',
       '👥', 'Ver y gestionar a todos los estudiantes (admin)',
       '{}'::jsonb, '{}'::jsonb, 40
WHERE NOT EXISTS (
  SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-mentor'
);

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-curriculum', 'educacion', 'education-curriculum', 'Curriculum',
       '✏️', 'Editar etapas / bloques / tareas / dependencias',
       '{}'::jsonb, '{}'::jsonb, 50
WHERE NOT EXISTS (
  SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-curriculum'
);

-- 3) Verificación rápida — debe devolver 5 filas
-- SELECT id, name, type, position FROM systems WHERE area_id = 'educacion' ORDER BY position;
