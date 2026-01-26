-- Tabela para armazenar embeddings de conversas (RAG)
CREATE TABLE public.conversation_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_agent_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.ai_agent_messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  role TEXT NOT NULL, -- 'user' ou 'assistant'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca vetorial (cosine similarity)
CREATE INDEX idx_conversation_embeddings_vector ON public.conversation_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Índice para buscar por lead
CREATE INDEX idx_conversation_embeddings_lead ON public.conversation_embeddings(lead_id);

-- Índice para buscar por conversa
CREATE INDEX idx_conversation_embeddings_conversation ON public.conversation_embeddings(conversation_id);

-- Enable RLS
ALTER TABLE public.conversation_embeddings ENABLE ROW LEVEL SECURITY;

-- Política para select - usuários autenticados podem ler
CREATE POLICY "Authenticated users can read conversation_embeddings"
  ON public.conversation_embeddings
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para insert - usuários autenticados podem inserir
CREATE POLICY "Authenticated users can insert conversation_embeddings"
  ON public.conversation_embeddings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para service role (edge functions) - acesso total
CREATE POLICY "Service role has full access to conversation_embeddings"
  ON public.conversation_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_conversation_embeddings_updated_at
  BEFORE UPDATE ON public.conversation_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para buscar conversas similares usando RAG
CREATE OR REPLACE FUNCTION public.search_similar_conversations(
  query_embedding vector,
  p_lead_id UUID DEFAULT NULL,
  match_threshold DOUBLE PRECISION DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE(
  embedding_id UUID,
  conversation_id UUID,
  lead_id UUID,
  content TEXT,
  role TEXT,
  similarity DOUBLE PRECISION,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id as embedding_id,
    ce.conversation_id,
    ce.lead_id,
    ce.content,
    ce.role,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    ce.created_at
  FROM conversation_embeddings ce
  WHERE 
    (p_lead_id IS NULL OR ce.lead_id = p_lead_id)
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;