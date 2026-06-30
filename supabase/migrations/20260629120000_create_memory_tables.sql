-- ════════════════════════════════════════════════════════════════
-- Sistema de Memoria · Viral / Flippeá con método (Fase 1)
-- Persiste generaciones de Studio, publicaciones, métricas y chat del Agente.
-- Acceso SOLO vía edge functions (service role). RLS ON sin policies públicas.
-- ════════════════════════════════════════════════════════════════

-- 1. Generaciones de contenido (Studio output)
CREATE TABLE IF NOT EXISTS content_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT DEFAULT 'nicolas',
  tipo TEXT NOT NULL,
  modo TEXT NOT NULL,
  input_idea TEXT,
  input_config JSONB,
  decisiones_auto JSONB,
  output_variantes JSONB NOT NULL,
  prompt_completo TEXT,
  tokens_usados INTEGER,
  validador_errores JSONB DEFAULT '[]'::jsonb,
  validador_warnings JSONB DEFAULT '[]'::jsonb,
  estado TEXT DEFAULT 'pendiente'
);
CREATE INDEX IF NOT EXISTS idx_gen_estado ON content_generations(estado);
CREATE INDEX IF NOT EXISTS idx_gen_tipo ON content_generations(tipo);
CREATE INDEX IF NOT EXISTS idx_gen_created ON content_generations(created_at DESC);

-- 2. Piezas publicadas
CREATE TABLE IF NOT EXISTS content_published (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES content_generations(id) ON DELETE CASCADE,
  plataforma TEXT NOT NULL,
  url_post TEXT,
  fecha_publicacion TIMESTAMPTZ DEFAULT NOW(),
  caption_final TEXT,
  notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_pub_plataforma ON content_published(plataforma);

-- 3. Métricas (1 fila por medición)
CREATE TABLE IF NOT EXISTS content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  published_id UUID REFERENCES content_published(id) ON DELETE CASCADE,
  fecha_medicion TIMESTAMPTZ DEFAULT NOW(),
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  shares BIGINT,
  saves BIGINT,
  watch_time_avg_seconds NUMERIC,
  watch_time_total_minutes NUMERIC,
  hook_hold_3s_percent NUMERIC,
  midpoint_hold_percent NUMERIC,
  completion_rate_percent NUMERIC,
  followers_ganados BIGINT,
  profile_visits BIGINT,
  link_clicks BIGINT,
  dms_recibidos BIGINT,
  pantallazo_url TEXT,
  raw_data JSONB
);
CREATE INDEX IF NOT EXISTS idx_metrics_published ON content_metrics(published_id);

-- 4. Conversaciones del Agente
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'nicolas',
  session_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_conversations(created_at DESC);

-- RLS: activado sin policies públicas → solo service role (edge functions) accede.
ALTER TABLE content_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_published   ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_metrics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations  ENABLE ROW LEVEL SECURITY;
