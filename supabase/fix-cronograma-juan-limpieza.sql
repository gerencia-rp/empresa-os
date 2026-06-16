-- ════════════════════════════════════════════════════════════════
-- 🔧 Fix Cronograma Juan ↔ Limpieza
--
-- HECHO COMPROBADO (grep): ops-planner.js NO referencia ninguna tabla clean_*,
-- y cleaning-planner.js NO referencia ninguna tabla ops_*. app.js abre el planner
-- según systems.type: 'ops-planner' → Juan (ops_day_tasks),
-- 'cleaning-planner' → Limpieza (clean_day_tasks).
--
-- Si un tile que decís "Juan" hace PATCH a clean_day_tasks, ese tile tiene
-- type='cleaning-planner'. Es config (tabla systems), no código de los planners.
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- PASO 1 · CAUSA RAÍZ: revisar los tiles de cronograma
-- ─────────────────────────────────────────────────────────────────
SELECT id, name, type, icon FROM systems
WHERE type IN ('ops-planner', 'cleaning-planner')
ORDER BY name;
--   Acá vas a ver cuál tile "Juan" tiene type='cleaning-planner' (el que cruza).
--   Si un tile debería ser Juan pero está como cleaning-planner, corregí su type:
--   UPDATE systems SET type = 'ops-planner'      WHERE id = '<id-del-tile-juan>';
--   UPDATE systems SET type = 'cleaning-planner' WHERE id = '<id-del-tile-limpieza>';

-- ─────────────────────────────────────────────────────────────────
-- PASO 2 · (OPCIONAL) Reubicar tareas según su business tag
--   ⚠️ HEURÍSTICO: asume que el tag business indica el planner correcto.
--   Revisá los SELECT de diagnóstico antes de correr cada BEGIN/COMMIT.
--   Columnas iguales en ambas tablas; task_id/recurring_id se ponen NULL
--   porque referencian el catálogo del OTRO planner (FK rompería).
-- ─────────────────────────────────────────────────────────────────

-- 2a) Diagnóstico: tareas de clean que parecen de Juan
SELECT id, title, business, assignee, date FROM clean_day_tasks
WHERE business IN ('remodelacion', 'both', 'Ambas') ORDER BY business, date;

-- 2b) Mover clean → ops (Juan)
BEGIN;
INSERT INTO ops_day_tasks (
  id, date, start_time, duration_min, title, task_id, property_id, project_id,
  location, zona, business, materials, assignee, status, priority, due_by,
  recurring_id, notes, travel_min, created_by, created_at, updated_at)
SELECT
  id, date, start_time, duration_min, title, NULL::uuid, property_id, project_id,
  location, zona, 'remodelacion', materials, assignee, status, priority, due_by,
  NULL::uuid, notes, travel_min, created_by, created_at, now()
FROM clean_day_tasks WHERE business IN ('remodelacion', 'both', 'Ambas')
ON CONFLICT (id) DO NOTHING;
DELETE FROM clean_day_tasks WHERE business IN ('remodelacion', 'both', 'Ambas');
COMMIT;

-- 2c) Diagnóstico: tareas de ops que parecen de Limpieza
SELECT id, title, business, assignee, date FROM ops_day_tasks
WHERE business = 'rentas' ORDER BY date;

-- 2d) Mover ops → clean (Limpieza)
BEGIN;
INSERT INTO clean_day_tasks (
  id, date, start_time, duration_min, title, task_id, property_id, project_id,
  location, zona, business, materials, assignee, status, priority, due_by,
  recurring_id, notes, travel_min, created_by, created_at, updated_at)
SELECT
  id, date, start_time, duration_min, title, NULL::uuid, property_id, project_id,
  location, zona, 'rentas', materials, assignee, status, priority, due_by,
  NULL::uuid, notes, travel_min, created_by, created_at, now()
FROM ops_day_tasks WHERE business = 'rentas'
ON CONFLICT (id) DO NOTHING;
DELETE FROM ops_day_tasks WHERE business = 'rentas';
COMMIT;

-- ─────────────────────────────────────────────────────────────────
-- PASO 3 · Validación (esperado: 0 cruces)
-- ─────────────────────────────────────────────────────────────────
SELECT 'clean·remod/both' tbl, count(*) n FROM clean_day_tasks WHERE business IN ('remodelacion','both','Ambas')
UNION ALL SELECT 'ops·rentas', count(*) FROM ops_day_tasks WHERE business = 'rentas';
