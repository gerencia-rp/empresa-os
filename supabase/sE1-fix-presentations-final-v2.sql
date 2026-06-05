-- ============================================================================
-- HOTFIX V2 · Adaptativo: detecta el ID REAL del área Educación
--
-- El v1 asumía area_id='educacion' pero tu DB tiene otro id (UUID o slug
-- distinto). Este v2 detecta el ID real y lo usa.
-- ============================================================================

-- PASO 1 — Diagnóstico: ver qué áreas existen
SELECT id, name, icon FROM areas ORDER BY position;

-- Si NO ves ninguna fila llamada 'Educación' o similar, salta al PASO 4.
-- Si SÍ la ves, anota su id exacto y úsalo en el PASO 2.

-- ============================================================================
-- PASO 2 — Fix usando el id REAL del área Educación
-- ============================================================================

BEGIN;

-- Capturar el id del área Educación en una variable temporal
DO $$
DECLARE
  edu_area_id text;
BEGIN
  -- Buscar el área cuyo nombre coincida con "Educación" (case-insensitive)
  SELECT id INTO edu_area_id
  FROM areas
  WHERE LOWER(name) LIKE '%educa%'
  LIMIT 1;

  -- Si no existe, crearla
  IF edu_area_id IS NULL THEN
    edu_area_id := 'educacion';
    INSERT INTO areas (id, name, icon, description, position)
    VALUES (edu_area_id, 'Educación', '🎓', 'Mentoría FlipMentoría · 78 tareas en 6 etapas', 100)
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Área Educación creada con id=%', edu_area_id;
  ELSE
    RAISE NOTICE 'Área Educación encontrada con id=%', edu_area_id;
  END IF;

  -- Borrar systems "fantasma" con types desconectados del dispatcher
  DELETE FROM systems
  WHERE area_id = edu_area_id
    AND type IN (
      'education-student','education-library','education-qa',
      'education-mentor','education-curriculum','education-students-mgr',
      'education-reports','education-materials'
    );

  -- Insertar los 4 systems correctos (con types que SÍ tienen dispatcher)
  -- Gestor de Mentorías
  IF NOT EXISTS (SELECT 1 FROM systems WHERE area_id=edu_area_id AND type='edu-manager') THEN
    INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
    VALUES (gen_random_uuid()::text, edu_area_id, 'edu-manager',
            'Gestor de Mentorías', '🧑‍🎓',
            'Estudiantes, plan IA, recursos, calendario, alertas',
            '{}'::jsonb, '{}'::jsonb, 10);
  END IF;

  -- Presentaciones IA (LA QUE EL USUARIO NECESITA)
  IF NOT EXISTS (SELECT 1 FROM systems WHERE area_id=edu_area_id AND type='edu-presentations') THEN
    INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
    VALUES (gen_random_uuid()::text, edu_area_id, 'edu-presentations',
            'Presentaciones IA', '🎬',
            'Generador de slides con Claude + web search · Descarga PPTX',
            '{}'::jsonb, '{}'::jsonb, 20);
  END IF;

  -- Informes Ejecutivos
  IF NOT EXISTS (SELECT 1 FROM systems WHERE area_id=edu_area_id AND type='edu-reports') THEN
    INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
    VALUES (gen_random_uuid()::text, edu_area_id, 'edu-reports',
            'Informes Ejecutivos', '📈',
            'Reportes IA sobre cohortes y rendimiento del programa',
            '{}'::jsonb, '{}'::jsonb, 30);
  END IF;

  -- Metodología FlipMentoría
  IF NOT EXISTS (SELECT 1 FROM systems WHERE area_id=edu_area_id AND type='edu-methodology') THEN
    INSERT INTO systems (id, area_id, type, name, icon, description, config, data, position)
    VALUES (gen_random_uuid()::text, edu_area_id, 'edu-methodology',
            'Metodología FlipMentoría', '📚',
            '78 tareas en 6 etapas (E0-E5) — biblioteca del programa',
            '{}'::jsonb, '{}'::jsonb, 40);
  END IF;

END $$;

COMMIT;

-- ============================================================================
-- PASO 3 — Verificación: debe devolver 4 filas
-- ============================================================================
SELECT s.id, s.name, s.type, s.position, a.id AS area_id, a.name AS area_name
FROM systems s
JOIN areas a ON a.id = s.area_id
WHERE LOWER(a.name) LIKE '%educa%'
ORDER BY s.position;

-- ============================================================================
-- PASO 4 — Verificación de schemas necesarios para que el generador funcione
-- ============================================================================
-- Estas queries NO deben dar error. Si una falla, aplica el schema correspondiente:
--
--   SELECT COUNT(*) AS jobs FROM edu_pres_jobs;
--      → si falla: supabase/edu-pres-jobs-schema.sql
--
--   SELECT COUNT(*) AS pres FROM edu_presentations;
--      → si falla: supabase/edu-presentations-schema.sql
--
--   SELECT COUNT(*) AS ment FROM edu_mentorships;
--      → si falla: aplica el schema de mentorías (parte del sistema viejo)
