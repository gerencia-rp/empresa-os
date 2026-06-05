-- ============================================================================
-- HOTFIX FINAL · Reconectar generador de Presentaciones IA + 4 sistemas viejos
--
-- CAUSA del bug "no me genera nada al darle al botón":
--   - El dispatcher en app.js espera type 'edu-presentations' → openEduPresentationsSystem(sys)
--   - Pero los systems en DB tienen types 'education-*' creados en sprints anteriores
--   - Esos types NO están en el dispatcher → click silencioso → nada pasa
--
-- SOLUCIÓN: dejar SOLO los 4 systems con types que SÍ están conectados al
-- sistema viejo (el que tiene el generador IA funcionando).
-- ============================================================================

BEGIN;

-- 1) Borrar todos los systems "fantasma" del área Educación que no tienen
--    dispatcher conectado (types que empiezan con 'education-')
DELETE FROM systems
WHERE area_id = 'educacion'
  AND type IN (
    'education-student',
    'education-library',
    'education-qa',
    'education-mentor',
    'education-curriculum',
    'education-students-mgr',
    'education-reports',
    'education-materials'
  );

-- 2) Insertar (idempotente) los 4 systems CORRECTOS conectados al sistema viejo
INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-gestor-mentorias', 'educacion', 'edu-manager',
       'Gestor de Mentorías',
       '🧑‍🎓', 'Estudiantes, plan IA, recursos, calendario, alertas',
       '{}'::jsonb, '{}'::jsonb, 10
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id='educacion' AND type='edu-manager');

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-presentaciones-ia', 'educacion', 'edu-presentations',
       'Presentaciones IA',
       '🎬', 'Generador de slides con Claude + web search · Descarga PPTX',
       '{}'::jsonb, '{}'::jsonb, 20
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id='educacion' AND type='edu-presentations');

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-informes-ejecutivos', 'educacion', 'edu-reports',
       'Informes Ejecutivos',
       '📈', 'Reportes IA sobre cohortes y rendimiento del programa',
       '{}'::jsonb, '{}'::jsonb, 30
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id='educacion' AND type='edu-reports');

INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
SELECT 'edu-metodologia', 'educacion', 'edu-methodology',
       'Metodología FlipMentoría',
       '📚', '78 tareas en 6 etapas (E0-E5) — biblioteca del programa',
       '{}'::jsonb, '{}'::jsonb, 40
WHERE NOT EXISTS (SELECT 1 FROM systems WHERE area_id='educacion' AND type='edu-methodology');

COMMIT;

-- ============================================================================
-- 3) Verificación: debe devolver EXACTAMENTE 4 filas
-- ============================================================================
SELECT id, name, type, position FROM systems
WHERE area_id = 'educacion'
ORDER BY position;

-- ============================================================================
-- 4) ¿Tienes los schemas necesarios? Estas queries no deben dar error:
-- ============================================================================
-- SELECT COUNT(*) AS jobs FROM edu_pres_jobs;
-- SELECT COUNT(*) AS pres FROM edu_presentations;
-- SELECT COUNT(*) AS ment FROM edu_mentorships;
--
-- Si alguna falla, falta aplicar:
--   - supabase/edu-pres-jobs-schema.sql
--   - supabase/edu-presentations-schema.sql
--   - supabase/fm-methodology-schema.sql + fm-methodology-seed.sql
