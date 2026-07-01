-- ════════════════════════════════════════════════════════════════
-- 🧠 Cerebro IA · Memoria RAG (Fase 3) + historial de chat
-- Aditiva. pgvector ya está activo (usado por generation_embeddings).
-- Embeddings: Voyage voyage-3-lite output_dimension=512 → VECTOR(512).
-- La app es SOLO LECTURA de datos de Airtable; ESTAS tablas SÍ escriben
-- (memoria del Cerebro + chat), igual que pm_tasks/pm_alerts.
-- ════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS vector;

-- Memoria del Cerebro: hechos/decisiones/aprendizajes/notas del negocio.
CREATE TABLE IF NOT EXISTS pm_brain_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'nota' CHECK (tipo IN ('hecho','decisión','aprendizaje','nota')),
  texto TEXT NOT NULL,
  fuente TEXT DEFAULT 'manual',
  fecha TIMESTAMPTZ DEFAULT NOW(),
  embedding VECTOR(512),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brain_mem_activo ON pm_brain_memory(activo);
CREATE INDEX IF NOT EXISTS idx_brain_mem_hnsw ON pm_brain_memory USING hnsw (embedding vector_cosine_ops);

-- Historial de chat con el Cerebro (persistente).
CREATE TABLE IF NOT EXISTS pm_brain_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('user','assistant')),
  texto TEXT NOT NULL,
  fecha TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brain_chat_fecha ON pm_brain_chat(fecha DESC);

-- Búsqueda por similitud coseno: top-K memorias activas con embedding.
-- SECURITY DEFINER para poder llamarse con anon (lectura controlada; no expone datos de Airtable).
CREATE OR REPLACE FUNCTION match_brain_memory(query_embedding VECTOR(512), match_count INT DEFAULT 6)
RETURNS TABLE (id UUID, tipo TEXT, texto TEXT, fuente TEXT, fecha TIMESTAMPTZ, similarity FLOAT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT m.id, m.tipo, m.texto, m.fuente, m.fecha, 1 - (m.embedding <=> query_embedding) AS similarity
  FROM pm_brain_memory m
  WHERE m.activo = TRUE AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- RLS: mismo patrón que pm_tasks (ALL para authenticated). El front escribe con el JWT del usuario.
ALTER TABLE pm_brain_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_brain_chat   ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pm_brain_mem_all  ON pm_brain_memory;
DROP POLICY IF EXISTS pm_brain_chat_all ON pm_brain_chat;
CREATE POLICY pm_brain_mem_all  ON pm_brain_memory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY pm_brain_chat_all ON pm_brain_chat   FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Lectura de memorias ACTIVAS para anon (el chat las recupera como fallback sin JWT;
-- el RPC de similitud ya es SECURITY DEFINER). Las inactivas solo las ve authenticated.
DROP POLICY IF EXISTS pm_brain_mem_read_active ON pm_brain_memory;
CREATE POLICY pm_brain_mem_read_active ON pm_brain_memory FOR SELECT TO anon USING (activo = true);
GRANT EXECUTE ON FUNCTION match_brain_memory(VECTOR, INT) TO authenticated, anon;
