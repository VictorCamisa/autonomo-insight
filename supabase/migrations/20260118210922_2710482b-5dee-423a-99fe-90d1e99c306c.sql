-- Habilitar extensão pgvector para busca semântica
CREATE EXTENSION IF NOT EXISTS vector;

-- Adicionar colunas de qualificação Q1/Q2 na tabela lead_qualification_data
ALTER TABLE public.lead_qualification_data 
ADD COLUMN IF NOT EXISTS qualification_level TEXT DEFAULT 'q0' CHECK (qualification_level IN ('q0', 'q1', 'q2')),
ADD COLUMN IF NOT EXISTS lead_source_confirmed TEXT,
ADD COLUMN IF NOT EXISTS q1_reached_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS q2_reached_at TIMESTAMPTZ;

-- Criar tabela de embeddings de veículos para RAG
CREATE TABLE IF NOT EXISTS public.vehicle_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  embedding vector(1536),
  search_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id)
);

-- Índice para busca vetorial rápida (ivfflat)
CREATE INDEX IF NOT EXISTS vehicle_embeddings_embedding_idx 
ON public.vehicle_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Índice para busca por vehicle_id
CREATE INDEX IF NOT EXISTS vehicle_embeddings_vehicle_id_idx 
ON public.vehicle_embeddings(vehicle_id);

-- Habilitar RLS
ALTER TABLE public.vehicle_embeddings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - leitura pública (para busca), escrita apenas por funções
CREATE POLICY "Embeddings são públicos para leitura"
ON public.vehicle_embeddings FOR SELECT
USING (true);

CREATE POLICY "Apenas service role pode inserir embeddings"
ON public.vehicle_embeddings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Apenas service role pode atualizar embeddings"
ON public.vehicle_embeddings FOR UPDATE
USING (true);

CREATE POLICY "Apenas service role pode deletar embeddings"
ON public.vehicle_embeddings FOR DELETE
USING (true);

-- Criar tabela de ações RAG para AI Agents
CREATE TABLE IF NOT EXISTS public.ai_agent_rag_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('vehicle_suggestion', 'similar_search', 'budget_match', 'year_tolerance')),
  trigger_keywords TEXT[] DEFAULT '{}',
  year_tolerance INTEGER DEFAULT 2,
  price_tolerance_percent NUMERIC DEFAULT 20,
  max_suggestions INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS ai_agent_rag_actions_agent_id_idx 
ON public.ai_agent_rag_actions(agent_id);

-- Habilitar RLS
ALTER TABLE public.ai_agent_rag_actions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem ver ações RAG"
ON public.ai_agent_rag_actions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem criar ações RAG"
ON public.ai_agent_rag_actions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar ações RAG"
ON public.ai_agent_rag_actions FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem deletar ações RAG"
ON public.ai_agent_rag_actions FOR DELETE
TO authenticated
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_vehicle_embeddings_updated_at
BEFORE UPDATE ON public.vehicle_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_agent_rag_actions_updated_at
BEFORE UPDATE ON public.ai_agent_rag_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para buscar veículos similares via pgvector
CREATE OR REPLACE FUNCTION public.search_similar_vehicles(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  year_tolerance INT DEFAULT 2,
  target_year INT DEFAULT NULL
)
RETURNS TABLE (
  vehicle_id UUID,
  similarity FLOAT,
  search_text TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ve.vehicle_id,
    1 - (ve.embedding <=> query_embedding) AS similarity,
    ve.search_text
  FROM vehicle_embeddings ve
  JOIN vehicles v ON v.id = ve.vehicle_id
  WHERE 
    v.status = 'disponivel'
    AND 1 - (ve.embedding <=> query_embedding) > match_threshold
    AND (target_year IS NULL OR ABS(v.year - target_year) <= year_tolerance)
  ORDER BY ve.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;