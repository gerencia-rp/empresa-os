-- ============================================================================
-- OPS Juan Austin · Feedback PDF "Tiempos Operativos Actualizados"
-- 5 mejoras al calendario basadas en operación real (semana 1)
-- IDEMPOTENTE — se puede correr varias veces sin romper nada
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) CATÁLOGO DE DURACIONES REALES por (propiedad × tipo de actividad)
--    Reemplaza estimaciones genéricas con tiempos MEDIDOS en campo.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ops_property_durations (
  id              BIGSERIAL PRIMARY KEY,
  property_name   TEXT NOT NULL,
  property_short  TEXT,                       -- ej: "6107 Idlewood"
  zona            TEXT CHECK (zona IN ('Norte','Sur')),
  activity_type   TEXT NOT NULL,              -- 'podar','filtros_ac','boiler','basura_continua','basura_completa','muebles','instalacion'
  duration_min    INTEGER NOT NULL,
  is_heavy        BOOLEAN DEFAULT FALSE,      -- TRUE = aislar en bloque dedicado
  needs_review    BOOLEAN DEFAULT FALSE,      -- TRUE = "por analizar" en primera visita
  notes           TEXT,
  source          TEXT DEFAULT 'pdf_juan_2026_06',
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (property_short, activity_type)
);

-- Seed con datos REALES medidos del PDF (junio 2026)
-- ZONA SUR (6 propiedades · 21h 45min)
INSERT INTO ops_property_durations (property_name, property_short, zona, activity_type, duration_min, notes) VALUES
  ('6107 Idlewood Cove',  '6107 Idlewood',  'Sur', 'podar', 270, 'Tiempo medido en campo'),
  ('6203 Shadow',         '6203 Shadow',    'Sur', 'podar', 270, 'Tiempo medido en campo'),
  ('2315 Dove Springs',   '2315 Dove',      'Sur', 'podar', 240, 'Tiempo medido en campo'),
  ('512 Bramble',         '512 Bramble',    'Sur', 'podar', 225, 'Tiempo medido en campo'),
  ('6504 Stonleigh',      '6504 Stonleigh', 'Sur', 'podar', 195, 'Tiempo medido en campo'),
  ('4916 Barkbridge',     '4916 Barkbridge','Sur', 'podar', 105, 'Cierre/relleno de jornada')
ON CONFLICT (property_short, activity_type) DO UPDATE SET
  duration_min = EXCLUDED.duration_min, zona = EXCLUDED.zona, notes = EXCLUDED.notes, updated_at = NOW();

-- ZONA NORTE (5 propiedades · 20h 35min)
INSERT INTO ops_property_durations (property_name, property_short, zona, activity_type, duration_min, is_heavy, needs_review, notes) VALUES
  ('14808 Cervin',  '14808 Cervin',  'Norte', 'podar', 390, TRUE,  FALSE, 'PROPIEDAD PESADA · aislar en bloque dedicado'),
  ('9909 Childress','9909 Childress','Norte', 'podar', 270, FALSE, FALSE, 'Tiempo medido en campo'),
  ('407 Capitol',   '407 Capitol',   'Norte', 'podar', 215, FALSE, FALSE, 'Tiempo medido en campo'),
  ('1302 Garden',   '1302 Garden',   'Norte', 'podar', 195, FALSE, FALSE, 'Tiempo medido en campo'),
  ('7105 Bethune',  '7105 Bethune',  'Norte', 'podar', 165, FALSE, TRUE,  'POR ANALIZAR · validar tiempo real en primera visita')
ON CONFLICT (property_short, activity_type) DO UPDATE SET
  duration_min = EXCLUDED.duration_min, zona = EXCLUDED.zona, is_heavy = EXCLUDED.is_heavy,
  needs_review = EXCLUDED.needs_review, notes = EXCLUDED.notes, updated_at = NOW();

-- Micro-tareas (10 min c/u)
INSERT INTO ops_property_durations (property_name, property_short, zona, activity_type, duration_min, notes) VALUES
  ('Genérica',      'TODAS',  NULL, 'filtros_ac', 10, 'Por unidad · agrupar con otras visitas, NUNCA dedicada'),
  ('Genérica',      'TODAS',  NULL, 'boiler',     10, 'Por unidad · agrupar con otras visitas, NUNCA dedicada')
ON CONFLICT (property_short, activity_type) DO UPDATE SET
  duration_min = EXCLUDED.duration_min, notes = EXCLUDED.notes, updated_at = NOW();

-- ────────────────────────────────────────────────────────────────────────────
-- 2) RUTAS SUGERIDAS (templates de jornada) — del feedback PDF
--    Pre-armadas con orden óptimo y tiempos REALES
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ops_day_routes (
  id              BIGSERIAL PRIMARY KEY,
  code            TEXT UNIQUE NOT NULL,       -- 'SUR_DIA_1', 'NORTE_CERVIN', etc.
  name            TEXT NOT NULL,
  zona            TEXT,
  description     TEXT,
  total_work_min  INTEGER NOT NULL,
  stops           JSONB NOT NULL,             -- [{property_short, activity_type, duration_min, order}]
  is_recommended  BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- SUR · Día 1 — Las 2 pesadas al inicio (sugerencia del PDF)
INSERT INTO ops_day_routes (code, name, zona, description, total_work_min, stops) VALUES
  ('SUR_DIA_1', 'Sur · Día 1 (pesadas)',  'Sur',
   'Agrupar las dos propiedades de 4h 30 al inicio de la semana (recomendación PDF)',
   540, '[
     {"order":1,"property_short":"6107 Idlewood","activity_type":"podar","duration_min":270,"start_time":"08:00"},
     {"order":2,"property_short":"6203 Shadow","activity_type":"podar","duration_min":270,"start_time":"12:30"}
   ]'::jsonb)
ON CONFLICT (code) DO UPDATE SET stops = EXCLUDED.stops, total_work_min = EXCLUDED.total_work_min;

-- SUR · Día 2 — Medianas
INSERT INTO ops_day_routes (code, name, zona, description, total_work_min, stops) VALUES
  ('SUR_DIA_2', 'Sur · Día 2 (medianas)', 'Sur',
   'Dos propiedades de duración media + tiempo de transición Sur',
   465, '[
     {"order":1,"property_short":"2315 Dove","activity_type":"podar","duration_min":240,"start_time":"08:00"},
     {"order":2,"property_short":"512 Bramble","activity_type":"podar","duration_min":225,"start_time":"12:00"}
   ]'::jsonb)
ON CONFLICT (code) DO UPDATE SET stops = EXCLUDED.stops, total_work_min = EXCLUDED.total_work_min;

-- SUR · Día 3 — Cierre con Barkbridge (recomendación PDF: usar Barkbridge como cierre)
INSERT INTO ops_day_routes (code, name, zona, description, total_work_min, stops) VALUES
  ('SUR_DIA_3', 'Sur · Día 3 (cierre)', 'Sur',
   'Stonleigh + Barkbridge como cierre o relleno de jornada (recomendación PDF)',
   300, '[
     {"order":1,"property_short":"6504 Stonleigh","activity_type":"podar","duration_min":195,"start_time":"08:00"},
     {"order":2,"property_short":"4916 Barkbridge","activity_type":"podar","duration_min":105,"start_time":"11:15"}
   ]'::jsonb)
ON CONFLICT (code) DO UPDATE SET stops = EXCLUDED.stops, total_work_min = EXCLUDED.total_work_min;

-- NORTE · Día Cervin — La pesada SOLA (recomendación PDF: aislar)
INSERT INTO ops_day_routes (code, name, zona, description, total_work_min, stops) VALUES
  ('NORTE_CERVIN', 'Norte · Día Cervin (aislado)', 'Norte',
   '⚠️ Cervin es la propiedad más pesada de Norte. PDF recomienda aislarla en su propio bloque.',
   390, '[
     {"order":1,"property_short":"14808 Cervin","activity_type":"podar","duration_min":390,"start_time":"08:00"}
   ]'::jsonb)
ON CONFLICT (code) DO UPDATE SET stops = EXCLUDED.stops, total_work_min = EXCLUDED.total_work_min;

-- NORTE · Día Childress + Capitol
INSERT INTO ops_day_routes (code, name, zona, description, total_work_min, stops) VALUES
  ('NORTE_DIA_2', 'Norte · Día 2', 'Norte',
   'Childress + Capitol en ruta optimizada',
   485, '[
     {"order":1,"property_short":"9909 Childress","activity_type":"podar","duration_min":270,"start_time":"08:00"},
     {"order":2,"property_short":"407 Capitol","activity_type":"podar","duration_min":215,"start_time":"12:30"}
   ]'::jsonb)
ON CONFLICT (code) DO UPDATE SET stops = EXCLUDED.stops, total_work_min = EXCLUDED.total_work_min;

-- NORTE · Día Garden + Bethune
INSERT INTO ops_day_routes (code, name, zona, description, total_work_min, stops) VALUES
  ('NORTE_DIA_3', 'Norte · Día 3 (Bethune por analizar)', 'Norte',
   'Garden + Bethune (Bethune está marcada como "por analizar" en el PDF)',
   360, '[
     {"order":1,"property_short":"1302 Garden","activity_type":"podar","duration_min":195,"start_time":"08:00"},
     {"order":2,"property_short":"7105 Bethune","activity_type":"podar","duration_min":165,"start_time":"11:15"}
   ]'::jsonb)
ON CONFLICT (code) DO UPDATE SET stops = EXCLUDED.stops, total_work_min = EXCLUDED.total_work_min;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) AÑADIR campos faltantes a ops_day_tasks para tracking de tiempo REAL
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE ops_day_tasks
  ADD COLUMN IF NOT EXISTS estimated_duration_min  INTEGER,
  ADD COLUMN IF NOT EXISTS actual_duration_min     INTEGER,
  ADD COLUMN IF NOT EXISTS materials_status        TEXT CHECK (materials_status IN ('pending','ready','missing','na')),
  ADD COLUMN IF NOT EXISTS responsable             TEXT,
  ADD COLUMN IF NOT EXISTS priority_level          TEXT CHECK (priority_level IN ('alta','media','baja')) DEFAULT 'media';

-- ────────────────────────────────────────────────────────────────────────────
-- 4) VISTA: Cumplimiento estimado vs real por propiedad/actividad
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW ops_time_calibration AS
SELECT
  COALESCE(t.property_name, t.title) AS propiedad,
  t.title,
  COUNT(*) FILTER (WHERE t.actual_duration_min IS NOT NULL) AS muestras,
  AVG(t.estimated_duration_min) FILTER (WHERE t.actual_duration_min IS NOT NULL) AS prom_estimado,
  AVG(t.actual_duration_min)    FILTER (WHERE t.actual_duration_min IS NOT NULL) AS prom_real,
  AVG(t.actual_duration_min - t.estimated_duration_min) FILTER (WHERE t.actual_duration_min IS NOT NULL) AS desviacion_min,
  ROUND(
    100.0 * AVG(t.actual_duration_min) FILTER (WHERE t.actual_duration_min IS NOT NULL) /
    NULLIF(AVG(t.estimated_duration_min) FILTER (WHERE t.actual_duration_min IS NOT NULL), 0),
    1
  ) AS pct_real_vs_estimado
FROM ops_day_tasks t
WHERE t.status = 'done'
GROUP BY COALESCE(t.property_name, t.title), t.title
HAVING COUNT(*) FILTER (WHERE t.actual_duration_min IS NOT NULL) > 0;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) RLS (lectura/escritura solo para autenticados)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE ops_property_durations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_day_routes         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ops_dur_read ON ops_property_durations;
CREATE POLICY ops_dur_read ON ops_property_durations FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS ops_dur_write ON ops_property_durations;
CREATE POLICY ops_dur_write ON ops_property_durations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS ops_rt_read ON ops_day_routes;
CREATE POLICY ops_rt_read ON ops_day_routes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS ops_rt_write ON ops_day_routes;
CREATE POLICY ops_rt_write ON ops_day_routes FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- ✅ Listo. Datos REALES medidos en campo cargados:
--    · 11 propiedades con duración por podada (Sur + Norte)
--    · 14808 Cervin marcada como is_heavy
--    · 7105 Bethune marcada como needs_review
--    · 6 rutas predefinidas (3 Sur + 3 Norte)
--    · Tracking estimado vs real activado
--    · Vista de calibración para mejorar proyecciones futuras
-- ============================================================================
