-- ════════════════════════════════════════════════════════════════
-- Insights automáticos (Fase 5). Patrones detectados sobre las métricas.
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  period_days INTEGER DEFAULT 30,
  insights JSONB NOT NULL,
  read BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_insights_computed ON insights(computed_at DESC);
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
