-- ============================================================================
-- HOTFIX SPRINT E1 · Consolidar las 2 áreas "Educación" en UNA sola
-- Síntoma: en el sidebar aparecen dos "🎓 Educación" (una con 3, otra con 5).
-- Solución: dejar la NUEVA (id='educacion') y borrar la vieja, conservando
--           solo los 5 sistemas nuevos. Los 3 sistemas viejos (edu-manager,
--           edu-presentations, edu-reports) apuntan a JS que ya no existe.
-- IDEMPOTENTE: se puede correr varias veces sin romper nada.
-- ============================================================================

BEGIN;

-- 1) Borrar los sistemas viejos del education.js antiguo (ya no funcionan)
DELETE FROM systems
WHERE type IN ('edu-manager', 'edu-presentations', 'edu-reports', 'mentorship-mgr');

-- 2) Mover cualquier system restante de OTRAS áreas Educación a la nueva
UPDATE systems
SET area_id = 'educacion'
WHERE area_id IN (
  SELECT id FROM areas
  WHERE LOWER(name) LIKE '%educaci%' AND id <> 'educacion'
);

-- 3) Borrar las áreas Educación duplicadas (todas excepto id='educacion')
DELETE FROM areas
WHERE LOWER(name) LIKE '%educaci%' AND id <> 'educacion';

-- 4) Garantizar que el área canónica existe con los datos correctos
INSERT INTO areas (id, name, icon, description, position)
VALUES ('educacion', 'Educación', '🎓', 'Mentoría FlipMentoría · 78 tareas en 6 etapas (E0-E5)', 100)
ON CONFLICT (id) DO UPDATE SET
  name        = 'Educación',
  icon        = '🎓',
  description = EXCLUDED.description;

-- 5) Re-garantizar los 5 sistemas (idempotente)
INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-mi-ruta', 'educacion', 'education-student', 'Mi Ruta 90 días',
       '🗺️', 'Tu camino personal por las 6 etapas (E0-E5)', '{}'::jsonb, '{}'::jsonb, 10
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-student');

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-biblioteca', 'educacion', 'education-library', 'Biblioteca',
       '📚', 'Contactos, herramientas y recursos por etapa', '{}'::jsonb, '{}'::jsonb, 20
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-library');

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-preguntas', 'educacion', 'education-qa', 'Preguntas al mentor',
       '❓', 'Hace preguntas y consulta respuestas anteriores', '{}'::jsonb, '{}'::jsonb, 30
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-qa');

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-panel-mentor', 'educacion', 'education-mentor', 'Panel Mentor',
       '👥', 'Ver y gestionar a todos los estudiantes (admin)', '{}'::jsonb, '{}'::jsonb, 40
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-mentor');

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-curriculum', 'educacion', 'education-curriculum', 'Curriculum',
       '✏️', 'Editar etapas / bloques / tareas / dependencias', '{}'::jsonb, '{}'::jsonb, 50
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id = 'educacion' AND type = 'education-curriculum');

COMMIT;

-- ============================================================================
-- Verificación — debe devolver UNA fila para el área y CINCO filas de systems:
-- SELECT id, name FROM areas WHERE LOWER(name) LIKE '%educa%';
-- SELECT id, name, type, position FROM systems WHERE area_id = 'educacion' ORDER BY position;
-- ============================================================================
