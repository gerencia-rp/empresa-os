-- ════════════════════════════════════════════════════════════════
-- Persistencia en DB de los datos de MO (Estimador Pro de Remodelación)
-- N personas · costo/hora · jornada · cuadrilla por etapa
-- Mueve la persistencia de localStorage → Supabase para multi-dispositivo / equipo.
-- Idempotente: ADD COLUMN IF NOT EXISTS (se puede correr varias veces).
-- ════════════════════════════════════════════════════════════════

-- ── PROYECTOS (Editor detallado) ──
-- mo_crew_by_phase: { "1":[{"nombre":"Juan","tarifa":25,"horas":40}], "2":[], ... }
--   (la key es el número de fase 1..6 — mismo índice que RM_PHASES en el front)
ALTER TABLE public.remodel_projects
  ADD COLUMN IF NOT EXISTS mo_crew_size     INT,
  ADD COLUMN IF NOT EXISTS mo_costo_hora    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS mo_jornada_h     NUMERIC(4,2) DEFAULT 8,
  ADD COLUMN IF NOT EXISTS mo_crew_by_phase JSONB DEFAULT '{}'::jsonb;

-- ── PRONÓSTICOS (snapshots del Pronosticador) ──
-- crew_size ya existe; agregamos costo/hora y jornada para reconstruir el MO global.
ALTER TABLE public.remodel_forecasts
  ADD COLUMN IF NOT EXISTS mo_costo_hora    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS mo_jornada_h     NUMERIC(4,2) DEFAULT 8;

-- ── RLS ──
-- Las columnas nuevas heredan las policies existentes de cada tabla
-- (select/all por authenticated). No hace falta policy por columna en Postgres/Supabase:
-- el RLS es a nivel de fila, no de columna, así que no hay nada restrictivo que tocar.

-- ── Verificación (correr aparte para confirmar) ──
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'remodel_projects' AND column_name LIKE 'mo_%';
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'remodel_forecasts' AND column_name LIKE 'mo_%';
