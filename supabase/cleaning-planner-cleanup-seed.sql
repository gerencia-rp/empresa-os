-- ============================================================
-- CLEANUP del seed de 3 semanas del Cronograma Limpieza.
-- Borra TODO lo que el seed creó con prefijo 'SEED:'.
-- Idempotente — corré varias veces sin problema.
-- ============================================================

-- 1) Borrar recurrentes del seed
delete from public.clean_recurring where custom_title like 'SEED:%';

-- 2) Borrar tareas del seed (backlog + agendadas)
delete from public.clean_day_tasks where title like 'SEED:%';

-- 3) Borrar proyectos de remodelación del seed
delete from public.remodel_projects where name like 'SEED:%';

-- 4) Borrar propiedades del seed
delete from public.properties where nickname like 'SEED:%';

-- ============================================================
-- Listo. Verificar resultado:
--   SELECT count(*) FROM properties WHERE nickname LIKE 'SEED:%';     -- debería ser 0
--   SELECT count(*) FROM clean_day_tasks WHERE title LIKE 'SEED:%';   -- debería ser 0
--   SELECT count(*) FROM clean_recurring WHERE custom_title LIKE 'SEED:%'; -- debería ser 0
--
-- El catálogo de tareas (clean_tasks), las plantillas de día y las
-- tablas del sistema NO se tocan — el cronograma queda listo para
-- usar con datos reales.
-- ============================================================
