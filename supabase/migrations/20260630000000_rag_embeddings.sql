-- ════════════════════════════════════════════════════════════════
-- RAG · pgvector embeddings de generaciones (Fase 4)
-- Voyage voyage-3-lite = 1024 dim. Si se usa OpenAI text-embedding-3-small (1536),
-- recrear la tabla/índice/función con VECTOR(1536).
-- Inerte hasta que exista VOYAGE_API_KEY (u OPENAI_API_KEY) + backfill.
-- ════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS generation_embeddings (
  generation_id UUID PRIMARY KEY REFERENCES content_generations(id) ON DELETE CASCADE,
  embedding VECTOR(1024),
  content_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE generation_embeddings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gen_emb_ivfflat
  ON generation_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Búsqueda por similitud + métricas (última medición). Llamable por RPC.
CREATE OR REPLACE FUNCTION match_generations(query_embedding VECTOR(1024), match_count INT DEFAULT 5)
RETURNS TABLE (
  id UUID, tipo TEXT, modo TEXT, output_variantes JSONB, input_idea TEXT, input_config JSONB,
  fecha_publicacion TIMESTAMPTZ, views BIGINT, likes BIGINT, saves BIGINT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    g.id, g.tipo, g.modo, g.output_variantes, g.input_idea, g.input_config,
    p.fecha_publicacion, m.views, m.likes, m.saves,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM generation_embeddings e
  JOIN content_generations g ON g.id = e.generation_id
  LEFT JOIN content_published p ON p.generation_id = g.id
  LEFT JOIN LATERAL (
    SELECT * FROM content_metrics WHERE published_id = p.id
    ORDER BY fecha_medicion DESC LIMIT 1
  ) m ON true
  ORDER BY similarity DESC, COALESCE(m.views, 0) DESC
  LIMIT match_count;
$$;
