-- ════════════════════════════════════════════════════════════════
-- 🔀 Migrar tareas legacy business='both'/'Ambas' de clean_day_tasks → ops_day_tasks
--
-- CONTEXTO: el Cronograma de Juan lee SOLO ops_day_tasks y el de Limpieza SOLO
-- clean_day_tasks (verificado en código). Pero quedaron tareas legacy con
-- business='both' en clean_day_tasks (ej. "Tiempo Almuerzo") que aparecen en el
-- planner de Limpieza y confunden. Son operativas de Juan → se mueven a ops.
--
-- Las columnas de ambas tablas son idénticas. PERO task_id/recurring_id de
-- clean_day_tasks referencian clean_tasks/clean_recurring → se ponen NULL al mover
-- (si no, violan las FKs de ops_day_tasks).
-- ════════════════════════════════════════════════════════════════

-- 1) DIAGNÓSTICO — revisá esto ANTES de correr la migración:
--    Si alguna fila NO es de Juan (es una limpieza real), no la migres
--    (ajustá el WHERE de abajo para excluirla).
SELECT id, title, business, assignee, project_id, date, created_at
FROM clean_day_tasks
WHERE business IN ('both', 'Ambas')
ORDER BY created_at;

-- 2) MIGRACIÓN (idempotente sobre el id; preserva el id para no romper referencias)
BEGIN;

INSERT INTO ops_day_tasks (
  id, date, start_time, duration_min, title,
  task_id, property_id, project_id, location, zona,
  business, materials, assignee, status, priority,
  due_by, recurring_id, notes, travel_min, created_by, created_at, updated_at
)
SELECT
  id, date, start_time, duration_min, title,
  NULL::uuid AS task_id,          -- FK a clean_tasks → no aplica en ops
  property_id, project_id, location, zona,
  'remodelacion' AS business,     -- ya no 'both'
  materials, assignee, status, priority,
  due_by,
  NULL::uuid AS recurring_id,     -- FK lógica a clean_recurring → no aplica en ops
  notes, travel_min, created_by, created_at, now() AS updated_at
FROM clean_day_tasks
WHERE business IN ('both', 'Ambas')
ON CONFLICT (id) DO NOTHING;

DELETE FROM clean_day_tasks WHERE business IN ('both', 'Ambas');

-- 3) Normalizar cualquier 'both' que ya estuviera en ops_day_tasks
UPDATE ops_day_tasks SET business = 'remodelacion' WHERE business IN ('both', 'Ambas');

COMMIT;

-- 4) Validación (esperado: 0 filas con 'both' en ambas tablas)
-- SELECT 'clean' tbl, count(*) FROM clean_day_tasks WHERE business IN ('both','Ambas')
-- UNION ALL SELECT 'ops', count(*) FROM ops_day_tasks WHERE business IN ('both','Ambas');
